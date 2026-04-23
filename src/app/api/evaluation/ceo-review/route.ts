/**
 * API: GET + POST /api/evaluation/ceo-review
 * ---------------------------------------------
 * Vai trò: CEO xem toàn bộ phiếu (đầy đủ nhất),
 *          phê duyệt hoặc trả về để Quản lý xem lại,
 *          rồi gửi kết quả cho Quản lý (CC HR).
 *
 * Luồng:
 *  GET  → Lấy phiếu đầy đủ (info + việc QL + NV đánh giá + QL chấm)
 *  POST → CEO submit phê duyệt
 *         Nếu action = 'approve':
 *           → GAS lưu + chuyển status PENDING_CEO → COMPLETED
 *           → Bot gửi Quản lý kết quả (CC HR)
 *         Nếu action = 'return':
 *           → GAS lưu + chuyển status → UNDER_REVIEW
 *           → Bot báo Quản lý cần xem lại (CC HR)
 *
 * Auth: Dashboard password
 */

import { NextResponse } from 'next/server';

const GAS_EVAL_URL = process.env.GOOGLE_APPS_SCRIPT_EVALUATION_URL || '';

// ── GET: CEO lấy phiếu đầy đủ ────────────────────────────────────
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
  const evalId = searchParams.get('id');
  if (!evalId) {
    return NextResponse.json({ error: 'Thiếu id phiếu đánh giá' }, { status: 400 });
  }

  try {
    const url = `${GAS_EVAL_URL}?action=get_full_evaluation&eval_id=${encodeURIComponent(evalId)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('🚨 Lỗi GET phiếu CEO review:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST: CEO phê duyệt hoặc trả về ─────────────────────────────
export async function POST(request: Request) {
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

    if (!body.eval_id) {
      return NextResponse.json({ error: 'Thiếu eval_id' }, { status: 400 });
    }
    // action phải là 'approve' hoặc 'return'
    if (!['approve', 'return'].includes(body.ceo_action)) {
      return NextResponse.json({ error: 'ceo_action phải là "approve" hoặc "return"' }, { status: 400 });
    }

    // Xác định status mới dựa trên quyết định CEO
    const newStatus = body.ceo_action === 'approve' ? 'COMPLETED' : 'UNDER_REVIEW';

    // Gửi GAS:
    //  approve → status COMPLETED → Bot gửi QL (CC HR)
    //  return  → status UNDER_REVIEW → Bot báo QL xem lại (CC HR)
    const response = await fetch(GAS_EVAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ceo_review',
        ...body,
        status: newStatus,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return NextResponse.json({ success: true, new_status: newStatus });
  } catch (error: any) {
    console.error('🚨 Lỗi CEO phê duyệt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
