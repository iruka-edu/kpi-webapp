/**
 * API: POST /api/evaluation/init
 * ----------------------------------
 * Vai trò: HR tạo phiếu đánh giá nhân sự mới.
 *
 * Luồng THƯỜNG (MGR ≠ CEO):
 *  1. HR gửi thông tin NV (tên, bộ phận, ngày thử việc, quản lý trực tiếp...)
 *  2. Server lưu vào Google Sheet (qua GAS) với status = INIT
 *  3. Bot Discord gửi link form cho Quản lý + CC CEO
 *
 * Luồng RÚT GỌN (MGR = CEO): is_ceo_direct = true
 *  1. HR gửi thông tin NV + tùy chọn điền sẵn công việc/tiêu chí
 *  2. Server lưu vào Google Sheet với status = NV_PENDING (bỏ qua MGR-fill)
 *  3. Bot Discord gửi link tự đánh giá THẲNG cho NV + CC CEO
 *
 * Body nhận vào:
 *  { name, discord_id, dept, role, manager_name, manager_discord_id,
 *    trial_start, trial_end, eval_date, hr_discord_id,
 *    criteria: [{ name, expectation }]        ← tiêu chí mẫu (optional)
 *    work_items: [{ task, target }]           ← đầu việc HR điền sẵn (optional, luồng rút gọn)
 *  }
 *
 * Nhận biết MGR = CEO: manager_discord_id === NEXT_PUBLIC_CEO_DISCORD_ID
 */

import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const GAS_EVAL_URL  = process.env.GOOGLE_APPS_SCRIPT_EVALUATION_URL || '';
const CEO_DISCORD_ID = process.env.NEXT_PUBLIC_CEO_DISCORD_ID || '';
const EVAL_SECRET    = process.env.EVALUATION_TOKEN_SECRET || 'iruka-eval-token-secret-2026';

/**
 * Verify HMAC token HR init tạo bởi Discord Bot.
 * Bot payload: "{hrDiscordId}:init:{72h_window}"  (xem discord-bot/commands/evaluation.js)
 * Kiểm tra cả window hiện tại + 1 window trước để tránh hết hạn đúng ranh giới.
 */
function verifyHrInitToken(token: string, hrDiscordId: string): boolean {
  if (!token || !hrDiscordId) return false;
  const curWindow = Math.floor(Date.now() / (72 * 3600 * 1000));
  for (const w of [curWindow, curWindow - 1]) {
    const payload  = `${hrDiscordId}:init:${w}`;
    const expected = createHmac('sha256', EVAL_SECRET).update(payload).digest('hex');
    if (token === expected) return true;
  }
  return false;
}

export async function POST(request: Request) {
  // Bảo mật: hỗ trợ 2 cách auth (giống /api/members):
  //  1) Dashboard password (HR vào trực tiếp dashboard)
  //  2) HMAC token cá nhân hóa (HR bấm link từ Discord Bot)
  const authHeader = request.headers.get('x-dashboard-auth') || '';
  const dashPass   = process.env.DASHBOARD_PASSWORD || '';
  const validDashboard = dashPass && authHeader === dashPass;

  // Đọc body 1 lần (vì cần hr_discord_id để verify token)
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }

  const hrDiscordId = String(body.hr_discord_id || '');
  const validHrToken = verifyHrInitToken(authHeader, hrDiscordId);

  if (!validDashboard && !validHrToken) {
    return NextResponse.json(
      { error: 'Không có quyền truy cập (token sai hoặc đã hết hạn 72h)' },
      { status: 401 },
    );
  }

  if (!GAS_EVAL_URL) {
    return NextResponse.json({ error: 'Chưa cấu hình GOOGLE_APPS_SCRIPT_EVALUATION_URL' }, { status: 500 });
  }

  try {
    // body đã đọc ở phần auth phía trên — không gọi request.json() lần nữa

    // Validate các trường bắt buộc
    const required = ['name', 'dept', 'manager_name', 'manager_discord_id', 'trial_start', 'eval_date', 'hr_discord_id'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Thiếu trường bắt buộc: ${field}` }, { status: 400 });
      }
    }

    // Nhận biết luồng rút gọn: Quản lý trực tiếp chính là CEO
    // Khi is_ceo_direct = true → GAS skip bước MGR-fill, gửi link NV ngay
    const isCeoDirect = CEO_DISCORD_ID
      ? body.manager_discord_id === CEO_DISCORD_ID
      : false;

    // Status ban đầu:
    //  - Luồng thường:    INIT       → Bot gửi link MGR-fill cho Quản lý
    //  - Luồng rút gọn:  NV_PENDING → Bot gửi link tự đánh giá thẳng cho NV
    const initialStatus = isCeoDirect ? 'NV_PENDING' : 'INIT';

    // Gửi lên GAS để tạo bản ghi mới + trigger Discord bot
    const response = await fetch(GAS_EVAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'init_evaluation', // GAS phân biệt hành động qua field này
        ...body,
        is_ceo_direct: isCeoDirect,
        status: initialStatus,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    // GAS trả về eval_id để frontend redirect đúng
    return NextResponse.json({
      success: true,
      eval_id: data.eval_id,
      is_ceo_direct: isCeoDirect, // Trả về để HrInitForm biết và hiển thị thông báo phù hợp
    });
  } catch (error: any) {
    console.error('🚨 Lỗi tạo phiếu đánh giá:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
