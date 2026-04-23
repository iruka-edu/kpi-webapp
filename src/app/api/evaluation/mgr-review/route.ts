/**
 * API: GET + POST /api/evaluation/mgr-review
 * ---------------------------------------------
 * Vai trò: Quản lý xem toàn bộ phiếu NV đã nộp,
 *          chấm điểm từng tiêu chí, ghi nhận xét,
 *          rồi gửi lên CEO duyệt (CC HR).
 *
 * Luồng:
 *  GET  → Lấy phiếu đầy đủ (info HR + đầu việc QL + tự đánh giá NV)
 *  POST → QL submit điểm chấm + nhận xét + quyết định
 *         → GAS lưu + chuyển status SUBMITTED → PENDING_CEO
 *         → Bot gửi CEO duyệt + CC HR
 *
 * Auth: Dashboard password
 */

import { NextResponse } from 'next/server';

const GAS_EVAL_URL = process.env.GOOGLE_APPS_SCRIPT_EVALUATION_URL || '';

// ── GET: Lấy toàn bộ phiếu để QL xem + chấm ─────────────────────
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
    console.error('🚨 Lỗi GET phiếu QL review:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST: QL submit điểm + quyết định ────────────────────────────
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
    // Validate: phải có điểm QL cho tất cả tiêu chí
    if (!body.mgr_scores || body.mgr_scores.length === 0) {
      return NextResponse.json({ error: 'Vui lòng chấm điểm ít nhất 1 tiêu chí' }, { status: 400 });
    }
    // Phải có quyết định đề xuất
    if (!body.mgr_decision) {
      return NextResponse.json({ error: 'Vui lòng chọn đề xuất (Tiếp nhận / Chấm dứt / Gia hạn)' }, { status: 400 });
    }

    // Gửi GAS: lưu điểm QL + chuyển status → PENDING_CEO
    // GAS trigger Bot: gửi CEO + CC HR
    const response = await fetch(GAS_EVAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mgr_review',
        ...body,
        status: 'PENDING_CEO',
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('🚨 Lỗi QL chấm điểm:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
