/**
 * API: GET + POST /api/evaluation/ceo-review
 * ---------------------------------------------
 * Vai trò: CEO xem toàn bộ phiếu (đầy đủ nhất),
 *          phê duyệt hoặc từ chối.
 *
 * Luồng THƯỜNG (MGR ≠ CEO):
 *  GET  → Lấy phiếu đầy đủ (info + việc QL + NV đánh giá + QL chấm)
 *  POST → CEO submit phê duyệt
 *         Nếu ceo_action = 'approve':
 *           → GAS lưu + chuyển status PENDING_CEO → COMPLETED
 *           → Bot gửi HR kết quả (để HR gửi NV + CC CEO)
 *         Nếu ceo_action = 'reject':
 *           → GAS lưu + chuyển status → REJECTED
 *           → Bot báo HR + CC NV
 *
 * Luồng RÚT GỌN (MGR = CEO, is_ceo_direct = true):
 *  POST → CEO submit phê duyệt
 *         Nếu ceo_action = 'approve':
 *           → GAS lưu + chuyển status → PENDING_HR (không thiếu bước HR xác nhận)
 *           → Bot DM HR "Đã có kết quả — Gửi cho NV nhé" + CC NV thông báo
 *
 * Quyết định CEO: Chỉ 2 lựa chọn — "approve" (phê duyệt) hoặc "reject" (từ chối).
 *
 * Auth: HMAC-SHA256 token cá nhân hóa (discord_id + eval_id + 72h window)
 *       Token được Discord Bot tạo và đính kèm trong link gửi cho CEO.
 */

import { NextResponse } from 'next/server';
import { verifyEvalToken } from '../_utils/verifyEvalToken';

const GAS_EVAL_URL = process.env.GOOGLE_APPS_SCRIPT_EVALUATION_URL || '';

// ── GET: CEO lấy phiếu đầy đủ ────────────────────────────────────
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

  const { searchParams: sp } = new URL(request.url);
  const id = sp.get('id')!;

  try {
    const url      = `${GAS_EVAL_URL}?action=get_full_evaluation&eval_id=${encodeURIComponent(id)}`;
    const response = await fetch(url);
    const data     = await response.json();
    if (data.error) throw new Error(data.error);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('🚨 Lỗi GET phiếu CEO review:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST: CEO phê duyệt hoặc từ chối ─────────────────────────────
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

    // CEO chỉ có 2 lựa chọn: approve (phê duyệt) hoặc reject (từ chối)
    if (!['approve', 'reject'].includes(body.ceo_action)) {
      return NextResponse.json({ error: 'ceo_action phải là "approve" hoặc "reject"' }, { status: 400 });
    }

    // FIX BUG #3: KHÔNG dùng body.is_ceo_direct (frontend gửi — có thể giả mạo).
    // Server tự fetch row từ GAS rồi so sánh manager_discord_id với CEO_DISCORD_ID.
    const CEO_DISCORD_ID = process.env.NEXT_PUBLIC_CEO_DISCORD_ID || '';
    let isCeoDirect = false;
    try {
      const evalUrl = `${GAS_EVAL_URL}?action=get_evaluation&eval_id=${encodeURIComponent(eval_id)}`;
      const evalRes = await fetch(evalUrl);
      const evalData = await evalRes.json();
      if (evalData?.error) throw new Error(evalData.error);
      const mgrId = evalData?.info?.manager_discord_id || evalData?.manager_discord_id || '';
      isCeoDirect = !!(CEO_DISCORD_ID && mgrId && mgrId === CEO_DISCORD_ID);
    } catch (err: any) {
      console.error('[ceo-review] Không xác định được is_ceo_direct (fetch GAS):', err.message);
      return NextResponse.json(
        { error: 'Không xác minh được loại phiếu (mất kết nối Sheet). Thử lại sau.' },
        { status: 502 },
      );
    }

    // Xác định status mới dựa trên quyết định CEO và loại luồng:
    //  - Luồng THƯỜNG approve  → COMPLETED  (HR gửi NV)
    //  - Luồng RÚT GỌN approve  → PENDING_HR (HR xác nhận rồi gửi NV + CC CEO)
    //  - reject (cả 2 luồng)   → REJECTED
    let newStatus: string;
    if (body.ceo_action === 'reject') {
      newStatus = 'REJECTED';
    } else if (isCeoDirect) {
      // Luồng rút gọn: CEO duyệt → chờ HR gửi kết quả cho NV
      newStatus = 'PENDING_HR';
    } else {
      // Luồng thường: CEO duyệt → hoàn tất (HR đã nhận thông báo từ bước trước)
      newStatus = 'COMPLETED';
    }

    // Gửi GAS:
    //  approve → status COMPLETED → Bot gửi HR để gửi kết quả cho NV (CC NV)
    //  reject  → status REJECTED  → Bot báo HR + CC NV
    // Loại bỏ body.is_ceo_direct không tin cậy trước khi forward GAS (GAS tự tính lại)
    const { is_ceo_direct: _unused, ...safeBody } = body;
    void _unused;
    const response = await fetch(GAS_EVAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ceo_review',
        ...safeBody,
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
