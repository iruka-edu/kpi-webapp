/**
 * API: GET + POST /api/evaluation
 * ----------------------------------
 * Vai trò: NV lấy form đánh giá và nộp kết quả tự đánh giá.
 *
 * Luồng:
 *  GET  → Lấy thông tin phiếu (HR đã điền + đầu việc QL đã điền + tiêu chí)
 *         Bảo mật bằng token HMAC-SHA256 (giống /weekly)
 *  POST → NV nộp tự đánh giá → GAS lưu + Bot báo Quản lý (CC HR)
 *
 * URL params GET: ?id=<eval_id>&discord_id=<id>&token=<hmac>
 */

import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const GAS_EVAL_URL = process.env.GOOGLE_APPS_SCRIPT_EVALUATION_URL || '';

/**
 * Xác thực token HMAC-SHA256 cho link cá nhân của NV.
 * Cùng logic với Bot Discord tạo link — window 72h.
 */
function verifyEvalToken(token: string, discordId: string, evalId: string): boolean {
  const secret = process.env.EVALUATION_TOKEN_SECRET || 'iruka-eval-token-secret-2026';
  const now = Date.now();
  const curWindow = Math.floor(now / (72 * 3600 * 1000));
  // Kiểm tra window hiện tại và 1 window trước để tránh hết hạn đúng ranh giới
  for (const w of [curWindow, curWindow - 1]) {
    const payload = `${discordId}:${evalId}:${w}`;
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    if (token === expected) return true;
  }
  return false;
}

// ── GET: NV lấy form ──────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const evalId = searchParams.get('id');
  const discordId = searchParams.get('discord_id');
  const token = searchParams.get('token');

  if (!evalId) {
    return NextResponse.json({ error: 'Thiếu id phiếu đánh giá' }, { status: 400 });
  }

  // Bảo mật: verify token nếu được truyền vào
  if (discordId && token) {
    if (!verifyEvalToken(token, discordId, evalId)) {
      return NextResponse.json(
        { error: 'Link đánh giá không hợp lệ hoặc đã hết hạn (72h). Vui lòng liên hệ HR để lấy link mới.' },
        { status: 403 }
      );
    }
  }

  if (!GAS_EVAL_URL) {
    return NextResponse.json({ error: 'Chưa cấu hình GOOGLE_APPS_SCRIPT_EVALUATION_URL' }, { status: 500 });
  }

  try {
    const url = `${GAS_EVAL_URL}?action=get_evaluation&eval_id=${encodeURIComponent(evalId)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('🚨 Lỗi GET phiếu NV:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST: NV nộp tự đánh giá ─────────────────────────────────────
export async function POST(request: Request) {
  if (!GAS_EVAL_URL) {
    return NextResponse.json({ error: 'Chưa cấu hình GOOGLE_APPS_SCRIPT_EVALUATION_URL' }, { status: 500 });
  }

  try {
    const body = await request.json();

    // Validate token
    const { eval_id, discord_id, token } = body;
    if (!eval_id || !discord_id || !token) {
      return NextResponse.json({ error: 'Thiếu thông tin xác thực' }, { status: 400 });
    }
    if (!verifyEvalToken(token, discord_id, eval_id)) {
      return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 403 });
    }

    // Validate dữ liệu tự đánh giá
    if (!body.work_summary || body.work_summary.length === 0) {
      return NextResponse.json({ error: 'Vui lòng điền ít nhất 1 mảng công việc' }, { status: 400 });
    }
    if (!body.criteria_scores || body.criteria_scores.length === 0) {
      return NextResponse.json({ error: 'Vui lòng điền điểm tự đánh giá' }, { status: 400 });
    }

    // Gửi GAS: lưu + chuyển status NV_PENDING → SUBMITTED
    // GAS trigger Bot: báo Quản lý + CC HR
    const response = await fetch(GAS_EVAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'nv_submit',
        ...body,
        status: 'SUBMITTED',
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('🚨 Lỗi NV nộp đánh giá:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
