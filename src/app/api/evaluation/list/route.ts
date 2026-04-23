/**
 * API: GET /api/evaluation/list
 * --------------------------------
 * Vai trò: Lấy danh sách tất cả phiếu đánh giá (dùng cho Dashboard HR).
 *          Hỗ trợ lọc theo status và tìm kiếm theo tên NV.
 *
 * Auth: Dashboard password
 * Query params:
 *  status  — Lọc theo status (optional): PENDING_CEO, COMPLETED...
 *  search  — Tìm theo tên NV (optional)
 */

import { NextResponse } from 'next/server';

const GAS_EVAL_URL = process.env.GOOGLE_APPS_SCRIPT_EVALUATION_URL || '';

export async function GET(request: Request) {
  const authHeader = request.headers.get('x-dashboard-auth');
  const dashPass = process.env.DASHBOARD_PASSWORD || '';
  if (authHeader !== dashPass) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  if (!GAS_EVAL_URL) {
    return NextResponse.json({ error: 'Chưa cấu hình GOOGLE_APPS_SCRIPT_EVALUATION_URL' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  try {
    let url = `${GAS_EVAL_URL}?action=list_evaluations`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const response = await fetch(url);
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return NextResponse.json({ evaluations: data.evaluations || [] });
  } catch (error: any) {
    console.error('🚨 Lỗi GET danh sách phiếu:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
