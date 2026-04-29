/**
 * API: GET /api/evaluation/status
 * ---------------------------------
 * Vai trò: NV tra cứu trạng thái phiếu đánh giá của mình.
 *
 * Luồng:
 *  GET ?id=<eval_id>&discord_id=<id>&token=<hmac>
 *    → Xác thực token HMAC-SHA256 (72h, cùng secret với các route khác)
 *    → Gọi GAS lấy status + thông tin cơ bản
 *    → Trả về: status, tên NV, tên QL, ngày đánh giá
 *
 * Bảo mật: Token HMAC giống /api/evaluation (không cần dashboard password)
 * Dùng cho: Trang /evaluation/status — NV tự kiểm tra tiến trình
 */

import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const GAS_EVAL_URL = process.env.GOOGLE_APPS_SCRIPT_EVALUATION_URL || '';

/**
 * Xác thực token HMAC — cùng logic với acknowledge/route.ts.
 * Window 72h, kiểm tra window hiện tại và window trước.
 */
function verifyEvalToken(token: string, discordId: string, evalId: string): boolean {
  // Dùng chung secret KPI_TOKEN_SECRET với /weekly /monthly — đồng bộ Bot/Vercel/GAS
  const secret = process.env.KPI_TOKEN_SECRET || 'iruka-kpi-token-secret-2026';
  const now = Date.now();
  const curWindow = Math.floor(now / (72 * 3600 * 1000));
  for (const w of [curWindow, curWindow - 1]) {
    const payload = `${discordId}:${evalId}:${w}`;
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    if (token === expected) return true;
  }
  return false;
}

// ── Bảng nhãn trạng thái hiển thị cho NV ─────────────────────────
const STATUS_LABELS: Record<string, { label: string; description: string; color: string }> = {
  INIT:         { label: 'Mới tạo',               description: 'Phiếu vừa được HR tạo, đang chờ Quản lý điền thông tin.',          color: 'slate' },
  MGR_PENDING:  { label: 'Quản lý đang điền',      description: 'Quản lý đang điền đầu việc và tiêu chí đánh giá.',                 color: 'blue' },
  NV_PENDING:   { label: 'Chờ bạn tự đánh giá',   description: 'Bạn cần vào form để tự chấm điểm và điền kết quả thực tế.',        color: 'yellow' },
  SUBMITTED:    { label: 'Đã nộp — Chờ QL chấm',  description: 'Bạn đã nộp phiếu. Quản lý đang chấm điểm và nhận xét.',           color: 'purple' },
  UNDER_REVIEW: { label: 'Quản lý đang xem lại',  description: 'Phiếu đang được Quản lý chỉnh sửa theo yêu cầu CEO.',              color: 'orange' },
  PENDING_CEO:  { label: 'Chờ CEO phê duyệt',     description: 'Quản lý đã chấm xong. CEO đang xem xét và phê duyệt.',             color: 'amber' },
  COMPLETED:    { label: 'CEO đã duyệt',           description: 'CEO đã phê duyệt. Quản lý sẽ sớm gửi kết quả cho bạn.',           color: 'green' },
  RESULT_SENT:  { label: 'Kết quả đã gửi',        description: 'Kết quả đánh giá đã được gửi cho bạn qua Discord. Vui lòng xem.', color: 'green' },
  ACKNOWLEDGED: { label: 'Hoàn tất',              description: 'Bạn đã xác nhận nhận kết quả. Quy trình đánh giá hoàn thành.',     color: 'teal' },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const evalId    = searchParams.get('id');
  const discordId = searchParams.get('discord_id');
  const token     = searchParams.get('token');

  // Validate tham số bắt buộc
  if (!evalId) {
    return NextResponse.json({ error: 'Thiếu id phiếu đánh giá' }, { status: 400 });
  }

  // Xác thực token nếu truyền vào (discord_id + token phải đi cùng)
  if (discordId && token) {
    if (!verifyEvalToken(token, discordId, evalId)) {
      return NextResponse.json(
        { error: 'Link tra cứu không hợp lệ hoặc đã hết hạn (72h). Vui lòng liên hệ HR.' },
        { status: 403 }
      );
    }
  }

  if (!GAS_EVAL_URL) {
    return NextResponse.json({ error: 'Chưa cấu hình GOOGLE_APPS_SCRIPT_EVALUATION_URL' }, { status: 500 });
  }

  try {
    // GAS trả về: status, name, dept, role, manager_name, eval_date
    const url = `${GAS_EVAL_URL}?action=get_status&eval_id=${encodeURIComponent(evalId)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) throw new Error(data.error);

    // Bổ sung nhãn trạng thái thân thiện trước khi trả về
    const statusMeta = STATUS_LABELS[data.status] || {
      label: data.status,
      description: 'Đang xử lý...',
      color: 'slate',
    };

    return NextResponse.json({
      ...data,
      status_label:       statusMeta.label,
      status_description: statusMeta.description,
      status_color:       statusMeta.color,
    });
  } catch (error: any) {
    console.error('🚨 Lỗi GET trạng thái phiếu:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
