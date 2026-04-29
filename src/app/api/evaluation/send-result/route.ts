/**
 * API: POST /api/evaluation/send-result
 * ----------------------------------------
 * Vai trò: Quản lý gửi kết quả cuối cho Nhân Viên — Bước 6.
 *
 * Luồng:
 *  POST → GAS lưu + chuyển status COMPLETED → RESULT_SENT
 *       → Bot gửi link kết quả cho NV + CC CEO
 *
 * Auth: Dashboard password
 */

import { NextResponse } from 'next/server';

const GAS_EVAL_URL = process.env.GOOGLE_APPS_SCRIPT_EVALUATION_URL || '';

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

    // FIX BUG #6: Check status hiện tại — chỉ cho gửi khi COMPLETED hoặc PENDING_HR
    //            (chống bấm "Gửi kết quả" 2 lần → NV nhận 2 DM trùng).
    try {
      const statusUrl = `${GAS_EVAL_URL}?action=get_evaluation&eval_id=${encodeURIComponent(body.eval_id)}`;
      const statusRes = await fetch(statusUrl);
      const statusData = await statusRes.json();
      if (statusData?.error) throw new Error(statusData.error);
      const currentStatus = statusData?.status || statusData?.info?.status || '';
      const allowed = ['COMPLETED', 'PENDING_HR'];
      if (currentStatus && !allowed.includes(currentStatus)) {
        return NextResponse.json(
          {
            error:
              `Phiếu đang ở trạng thái "${currentStatus}", không thể gửi kết quả. ` +
              `Chỉ gửi được khi CEO đã duyệt xong (COMPLETED hoặc PENDING_HR).`,
          },
          { status: 409 },
        );
      }
    } catch (err: any) {
      console.error('[send-result] Không lấy được status hiện tại:', err.message);
      return NextResponse.json(
        { error: 'Không xác minh được trạng thái phiếu (mất kết nối Sheet). Thử lại sau.' },
        { status: 502 },
      );
    }

    // Gửi GAS: chuyển status COMPLETED → RESULT_SENT
    // GAS trigger Bot: gửi link kết quả cho NV + CC CEO (bước cuối)
    const response = await fetch(GAS_EVAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_result',
        eval_id: body.eval_id,
        mgr_note: body.mgr_note || '', // Lời nhắn tuỳ chọn kèm kết quả
        status: 'RESULT_SENT',
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('🚨 Lỗi gửi kết quả cho NV:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
