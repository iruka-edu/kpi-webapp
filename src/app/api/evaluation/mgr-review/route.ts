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
 * Auth: HMAC-SHA256 token cá nhân hóa (discord_id + eval_id + 72h window)
 *       Token được Discord Bot tạo và đính kèm trong link gửi cho Quản lý.
 *       Thay thế DASHBOARD_PASSWORD cũ — cá nhân hóa, hết hạn sau 72h.
 */

import { NextResponse } from 'next/server';
import { verifyEvalToken } from '../_utils/verifyEvalToken';

const GAS_EVAL_URL = process.env.GOOGLE_APPS_SCRIPT_EVALUATION_URL || '';

// ── GET: Lấy toàn bộ phiếu để QL xem + chấm ─────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const evalId    = searchParams.get('id');
  const discordId = searchParams.get('discord_id');
  const token     = searchParams.get('token');

  // Xác thực HMAC token cá nhân hóa
  if (!evalId || !discordId || !token) {
    return NextResponse.json({ error: 'Thiếu thông tin xác thực (id, discord_id, token)' }, { status: 400 });
  }
  if (!verifyEvalToken(token, discordId, evalId)) {
    return NextResponse.json(
      { error: 'Link không hợp lệ hoặc đã hết hạn (72h). Vui lòng liên hệ HR để lấy link mới.' },
      { status: 403 }
    );
  }

  if (!GAS_EVAL_URL) {
    return NextResponse.json({ error: 'Chưa cấu hình GOOGLE_APPS_SCRIPT_EVALUATION_URL' }, { status: 500 });
  }

  try {
    const url      = `${GAS_EVAL_URL}?action=get_full_evaluation&eval_id=${encodeURIComponent(evalId)}`;
    const response = await fetch(url);
    const data     = await response.json();
    if (data.error) throw new Error(data.error);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('🚨 Lỗi GET phiếu QL review:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST: QL submit điểm + quyết định ────────────────────────────
export async function POST(request: Request) {
  if (!GAS_EVAL_URL) {
    return NextResponse.json({ error: 'Chưa cấu hình GOOGLE_APPS_SCRIPT_EVALUATION_URL' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { eval_id, discord_id, token } = body;

    // Xác thực HMAC token cá nhân hóa
    if (!eval_id || !discord_id || !token) {
      return NextResponse.json({ error: 'Thiếu thông tin xác thực (eval_id, discord_id, token)' }, { status: 400 });
    }
    if (!verifyEvalToken(token, discord_id, eval_id)) {
      return NextResponse.json({ error: 'Token không hợp lệ hoặc đã hết hạn' }, { status: 403 });
    }

    // Validate: phải có điểm QL cho tất cả tiêu chí
    if (!body.mgr_scores || body.mgr_scores.length === 0) {
      return NextResponse.json({ error: 'Vui lòng chấm điểm ít nhất 1 tiêu chí' }, { status: 400 });
    }
    // FIX BUG #5: Validate từng mgr_score phải là số nguyên 1-5
    for (const m of body.mgr_scores) {
      const s = Number(m?.mgr_score);
      if (!Number.isInteger(s) || s < 1 || s > 5) {
        return NextResponse.json(
          { error: 'Điểm chấm của Quản lý phải là số nguyên từ 1 đến 5' },
          { status: 400 },
        );
      }
    }
    // Phải có quyết định đề xuất
    if (!body.mgr_decision) {
      return NextResponse.json({ error: 'Vui lòng chọn đề xuất (Tiếp nhận / Chấm dứt / Gia hạn)' }, { status: 400 });
    }
    // Whitelist quyết định để chống giả mạo
    const allowedDecisions = ['hire', 'extend', 'reject', 'Tiếp nhận', 'Gia hạn', 'Chấm dứt'];
    if (!allowedDecisions.includes(String(body.mgr_decision))) {
      return NextResponse.json(
        { error: 'mgr_decision không hợp lệ' },
        { status: 400 },
      );
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
