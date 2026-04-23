/**
 * API: GET + POST /api/evaluation/mgr-fill
 * ------------------------------------------
 * Vai trò: Quản lý điền công việc đã giao + tiêu chí đánh giá cho NV.
 *
 * Luồng:
 *  GET  → Lấy phiếu (thông tin chung HR đã điền + tiêu chí mẫu nếu có)
 *  POST → Quản lý submit đầu việc + tiêu chí → GAS lưu + Bot gửi NV (CC HR)
 *
 * Auth: Dashboard password qua header x-dashboard-auth
 */

import { NextResponse } from 'next/server';

const GAS_EVAL_URL = process.env.GOOGLE_APPS_SCRIPT_EVALUATION_URL || '';

// ── GET: Lấy thông tin phiếu để Quản lý xem và điền ──────────────
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
    const url = `${GAS_EVAL_URL}?action=get_evaluation&eval_id=${encodeURIComponent(evalId)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('🚨 Lỗi GET phiếu đánh giá:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST: Quản lý submit đầu việc + tiêu chí ─────────────────────
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
    // Phải có ít nhất 1 tiêu chí
    if (!body.criteria || body.criteria.length === 0) {
      return NextResponse.json({ error: 'Phải điền ít nhất 1 tiêu chí đánh giá' }, { status: 400 });
    }

    // Gửi GAS: lưu đầu việc + tiêu chí + chuyển status MGR_PENDING → NV_PENDING
    // GAS sẽ tự trigger Bot: gửi link NV + CC HR
    const response = await fetch(GAS_EVAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mgr_fill',   // GAS phân biệt hành động
        ...body,
        status: 'NV_PENDING',
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('🚨 Lỗi Quản lý điền đầu việc:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
