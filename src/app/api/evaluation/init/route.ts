/**
 * API: POST /api/evaluation/init
 * ----------------------------------
 * Vai trò: HR tạo phiếu đánh giá nhân sự mới.
 *
 * Luồng:
 *  1. HR gửi thông tin NV (tên, bộ phận, ngày thử việc, quản lý trực tiếp...)
 *  2. Server lưu vào Google Sheet (qua GAS) với status = INIT
 *  3. Bot Discord gửi link form cho Quản lý + CC CEO
 *
 * Body nhận vào:
 *  { name, discord_id, dept, role, manager_name, manager_discord_id,
 *    trial_start, trial_end, eval_date, hr_discord_id,
 *    criteria: [{ name, expectation }]  ← tiêu chí mẫu (optional) }
 */

import { NextResponse } from 'next/server';

// GAS URL riêng cho module Đánh Giá Nhân Sự
const GAS_EVAL_URL = process.env.GOOGLE_APPS_SCRIPT_EVALUATION_URL || '';

export async function POST(request: Request) {
  // Bảo mật: chỉ Dashboard mới được gọi endpoint này (HR đã login)
  const authHeader = request.headers.get('x-dashboard-auth');
  const dashPass = process.env.DASHBOARD_PASSWORD || '';
  if (authHeader !== dashPass) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  if (!GAS_EVAL_URL) {
    return NextResponse.json({ error: 'Chưa cấu hình GOOGLE_APPS_SCRIPT_EVALUATION_URL' }, { status: 500 });
  }

  try {
    const body = await request.json();

    // Validate các trường bắt buộc
    const required = ['name', 'dept', 'manager_name', 'manager_discord_id', 'trial_start', 'eval_date', 'hr_discord_id'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Thiếu trường bắt buộc: ${field}` }, { status: 400 });
      }
    }

    // Gửi lên GAS để tạo bản ghi mới + trigger Discord bot
    const response = await fetch(GAS_EVAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'init_evaluation', // GAS phân biệt hành động qua field này
        ...body,
        status: 'INIT',
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    // GAS trả về eval_id để frontend redirect đúng
    return NextResponse.json({ success: true, eval_id: data.eval_id });
  } catch (error: any) {
    console.error('🚨 Lỗi tạo phiếu đánh giá:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
