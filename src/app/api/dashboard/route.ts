/**
 * /api/dashboard — GET + POST
 * ----------------------------
 * GET:  Lấy tất cả báo cáo từ GAS (action=list) → trả cho Dashboard Sếp
 * POST: Cập nhật trạng thái + nhận xét của Sếp lên GAS (action=approve)
 *
 * GAS cần hỗ trợ:
 *   doGet?action=list          → trả JSON { reports: [...] }
 *   doPost { action:"approve", name, report_week, status, manager_comment, row_index }
 */

import { NextResponse } from 'next/server';

const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';

// ── GET: Lấy tất cả báo cáo ─────────────────────────────────
export async function GET() {
  if (!GAS_URL) {
    return NextResponse.json({ error: 'Chưa cấu hình GOOGLE_APPS_SCRIPT_URL' }, { status: 500 });
  }

  try {
    const res = await fetch(`${GAS_URL}?action=list`);
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    return NextResponse.json({ reports: data.reports || [] });
  } catch (err: any) {
    console.error('🚨 Lỗi GET dashboard:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST: Duyệt / Trả về + comment ──────────────────────────
export async function POST(request: Request) {
  if (!GAS_URL) {
    return NextResponse.json({ error: 'Chưa cấu hình GOOGLE_APPS_SCRIPT_URL' }, { status: 500 });
  }

  try {
    const body = await request.json();
    // body = { action:"approve", name, report_week, status, manager_comment, row_index }

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', ...body }),
      redirect: 'follow',
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('🚨 Lỗi POST dashboard:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
