/**
 * /api/monthly/route.ts — API backend cho Báo Cáo Tháng
 * =========================================================
 * Tách riêng khỏi /api/kpi (báo cáo tuần) để:
 *   - Dùng GAS Monthly Sheet khác (GOOGLE_APPS_SCRIPT_MONTHLY_URL)
 *   - Không dùng token verify (monthly dùng name+discord_id)
 *   - Cấu trúc data khác (có monthly_data: achievements, priorities, rating)
 *
 * GET  /api/monthly?name=&month=&discord_id=
 *   → Trả về tasks cũ (plan tháng trước) cho nhân viên điền Thực hiện
 *
 * POST /api/monthly
 *   → Nhận báo cáo, forward lên Google Apps Script Monthly
 *   → GAS ghi vào Google Sheet tháng
 */

import { NextResponse } from 'next/server';

// GAS Monthly URL — biến env riêng, khác với GAS tuần
const GAS_MONTHLY_URL = process.env.GOOGLE_APPS_SCRIPT_MONTHLY_URL || '';

// ── GET: Lấy dữ liệu task tháng trước hoặc danh sách đã nộp ─────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action     = searchParams.get('action') || 'get';
  const name       = searchParams.get('name');
  const month      = searchParams.get('month');       // VD: "Tháng 4"
  const discordId  = searchParams.get('discord_id');

  // ── action=status: trả về danh sách ai đã nộp tháng này ──────
  // Dùng bởi scheduler.js để build báo cáo và nhắc nhở
  if (action === 'status') {
    if (!month) {
      return NextResponse.json({ error: 'Thiếu tham số month' }, { status: 400 });
    }
    if (!GAS_MONTHLY_URL) {
      return NextResponse.json({ submitted_names: [], month }, { status: 200 });
    }
    try {
      const gasUrl = new URL(GAS_MONTHLY_URL);
      gasUrl.searchParams.set('action', 'status');
      gasUrl.searchParams.set('month', month);
      const resp = await fetch(gasUrl.toString(), { next: { revalidate: 0 } });
      const data = await resp.json();
      return NextResponse.json({
        submitted_names: data.submitted_names || [],
        month,
      });
    } catch (err: any) {
      console.error('[/api/monthly GET status] Lỗi GAS:', err.message);
      return NextResponse.json({ submitted_names: [], month });
    }
  }

  // ── action=get (mặc định): Lấy task tháng trước cho nhân viên ──
  if (!name) {
    return NextResponse.json({ error: 'Thiếu tham số name trên URL' }, { status: 400 });
  }

  // Nếu chưa cấu hình GAS → trả empty (lần đầu dùng = no tasks)
  if (!GAS_MONTHLY_URL) {
    console.warn('[/api/monthly GET] Chưa cấu hình GOOGLE_APPS_SCRIPT_MONTHLY_URL — trả empty');
    return NextResponse.json({
      tasks: [],
      planTasks: [],
      name,
      month: month || '',
    });
  }

  try {
    // Gửi request đến GAS để lấy task kế hoạch tháng trước (sẽ thành Bảng 1)
    const gasUrl = new URL(GAS_MONTHLY_URL);
    gasUrl.searchParams.set('action', 'get');
    gasUrl.searchParams.set('name', name);
    if (month)     gasUrl.searchParams.set('month', month);
    if (discordId) gasUrl.searchParams.set('discord_id', discordId);

    console.log('[/api/monthly GET] Fetching GAS:', gasUrl.toString());

    const resp = await fetch(gasUrl.toString(), { next: { revalidate: 0 } });
    const data = await resp.json();

    if (data.error) throw new Error(data.error);

    return NextResponse.json({
      tasks:      data.tasks      || [],  // Nhiệm vụ cũ (Bảng 1)
      planTasks:  data.planTasks  || [],  // Tasks đã lên kế hoạch trước (nếu có)
      name:       data.name       || name,
      role:       data.role       || '',
      dept:       data.dept       || '',
      reportTo:   data.reportTo   || 'CEO',
      isLate:     data.isLate     || false,
      submittedAt: data.submittedAt || null,
    });
  } catch (error: any) {
    console.error('[/api/monthly GET] Lỗi GAS:', error.message);
    // Không crash — trả empty để user vẫn dùng được (first_time mode)
    return NextResponse.json({
      tasks: [],
      planTasks: [],
      name,
      month: month || '',
    });
  }
}

// ── POST: Submit báo cáo tháng lên GAS ──────────────────────
export async function POST(request: Request) {
  if (!GAS_MONTHLY_URL) {
    return NextResponse.json(
      { error: 'Chưa cấu hình GOOGLE_APPS_SCRIPT_MONTHLY_URL trong .env.local' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // Validate payload tối thiểu
    if (!body.name || !body.report_week) {
      return NextResponse.json({ error: 'Payload thiếu name hoặc report_week' }, { status: 400 });
    }

    console.log('[/api/monthly POST] Gửi báo cáo tháng:', body.name, body.report_week);

    // Forward lên GAS — dùng POST với Content-Type application/json
    const resp = await fetch(GAS_MONTHLY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, action: 'submit' }),
    });

    // GAS có thể redirect 302 → lấy text để check
    const text = await resp.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      // GAS đôi khi trả text không phải JSON khi thành công
      data = { success: true };
    }

    if (data.error) throw new Error(data.error);

    return NextResponse.json({ success: true, message: 'Báo cáo tháng đã được ghi nhận!' });
  } catch (error: any) {
    console.error('[/api/monthly POST] Lỗi:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
