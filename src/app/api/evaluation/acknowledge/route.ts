/**
 * API: GET + POST /api/evaluation/acknowledge
 * ----------------------------------------------
 * Vai trò: NV xem kết quả cuối + xác nhận đã nhận.
 *
 * Luồng:
 *  GET  → Lấy kết quả đầy đủ (tất cả điểm + nhận xét + quyết định cuối)
 *         Bảo mật bằng token HMAC-SHA256 (giống /weekly)
 *  POST → NV xác nhận đã đọc kết quả
 *         → GAS chuyển status RESULT_SENT → ACKNOWLEDGED
 */

import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const GAS_EVAL_URL = process.env.GOOGLE_APPS_SCRIPT_EVALUATION_URL || '';

/**
 * Xác thực token HMAC — cùng logic với các route khác.
 */
function verifyEvalToken(token: string, discordId: string, evalId: string): boolean {
  const secret = process.env.EVALUATION_TOKEN_SECRET || 'iruka-eval-token-secret-2026';
  const now = Date.now();
  const curWindow = Math.floor(now / (72 * 3600 * 1000));
  for (const w of [curWindow, curWindow - 1]) {
    const payload = `${discordId}:${evalId}:${w}`;
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    if (token === expected) return true;
  }
  return false;
}

// ── GET: NV xem kết quả cuối ─────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const evalId = searchParams.get('id');
  const discordId = searchParams.get('discord_id');
  const token = searchParams.get('token');

  if (!evalId) {
    return NextResponse.json({ error: 'Thiếu id phiếu đánh giá' }, { status: 400 });
  }

  // Bảo mật: verify token nếu truyền vào
  if (discordId && token) {
    if (!verifyEvalToken(token, discordId, evalId)) {
      return NextResponse.json(
        { error: 'Link kết quả không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ HR.' },
        { status: 403 }
      );
    }
  }

  if (!GAS_EVAL_URL) {
    return NextResponse.json({ error: 'Chưa cấu hình GOOGLE_APPS_SCRIPT_EVALUATION_URL' }, { status: 500 });
  }

  try {
    const url = `${GAS_EVAL_URL}?action=get_full_evaluation&eval_id=${encodeURIComponent(evalId)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('🚨 Lỗi GET kết quả NV:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST: NV xác nhận đã đọc ─────────────────────────────────────
export async function POST(request: Request) {
  if (!GAS_EVAL_URL) {
    return NextResponse.json({ error: 'Chưa cấu hình GOOGLE_APPS_SCRIPT_EVALUATION_URL' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { eval_id, discord_id, token } = body;

    if (!eval_id || !discord_id || !token) {
      return NextResponse.json({ error: 'Thiếu thông tin xác thực' }, { status: 400 });
    }
    if (!verifyEvalToken(token, discord_id, eval_id)) {
      return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 403 });
    }

    // GAS: chuyển status → ACKNOWLEDGED
    const response = await fetch(GAS_EVAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'acknowledge',
        eval_id,
        status: 'ACKNOWLEDGED',
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('🚨 Lỗi NV xác nhận kết quả:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
