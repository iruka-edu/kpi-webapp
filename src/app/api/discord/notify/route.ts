/**
 * API: POST /api/discord/notify
 * ---------------------------------------------
 * Vai trò: Endpoint relay từ Google Apps Script (GAS) sang Discord Bot.
 *          GAS không thể gọi bot trực tiếp (network isolation),
 *          nên gọi qua endpoint công khai này → webapp xác thực
 *          rồi forward sang bot internal API.
 *
 * Luồng:
 *   GAS notifyDiscord() → POST {WEBAPP_URL}/api/discord/notify
 *      → verify secret (KPI_TOKEN_SECRET share với GAS)
 *      → POST {BOT_API_URL}/internal/evaluation-notify
 *      → bot.client.users.fetch(to).send({ embeds: [embed] })
 *
 * Body:
 *   - secret: KPI_TOKEN_SECRET (shared với GAS)
 *   - to:     discord_id người nhận chính (bắt buộc)
 *   - cc:     discord_id người nhận CC (optional, có thể null)
 *   - embed:  object Discord embed { title, description, color, fields, ... }
 *
 * ENV cần (đặt ở Vercel hoặc .env.local của webapp):
 *   - KPI_TOKEN_SECRET:        cùng giá trị với GAS Script Properties (dùng chung với /weekly)
 *   - BOT_API_URL:             URL bot api-server (đã dùng chung với holiday/staff)
 *   - BOT_INTERNAL_SECRET:     cùng giá trị với BOT_INTERNAL_SECRET ở bot/.env
 */

import { NextResponse } from 'next/server';

// Dùng chung secret KPI_TOKEN_SECRET với /weekly /monthly — đồng bộ Bot/Vercel/GAS
const EVAL_SECRET         = process.env.KPI_TOKEN_SECRET || 'iruka-kpi-token-secret-2026';
const BOT_API_URL         = process.env.BOT_API_URL || '';
const BOT_INTERNAL_SECRET = process.env.BOT_INTERNAL_SECRET || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret, to, cc, embed, cc_embed } = body || {};

    // Verify secret từ GAS — chống ai cũng gọi vào
    if (!secret || secret !== EVAL_SECRET) {
      console.warn('[discord/notify] Sai secret từ GAS — reject');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!to) {
      return NextResponse.json({ error: 'Thiếu trường "to" (discord_id người nhận)' }, { status: 400 });
    }
    if (!embed || typeof embed !== 'object') {
      return NextResponse.json({ error: 'Thiếu trường "embed"' }, { status: 400 });
    }

    if (!BOT_API_URL || !BOT_INTERNAL_SECRET) {
      console.error('[discord/notify] Chưa cấu hình BOT_API_URL hoặc BOT_INTERNAL_SECRET');
      return NextResponse.json({ error: 'Bot relay chưa cấu hình' }, { status: 500 });
    }

    // Forward sang bot internal API
    const botUrl = `${BOT_API_URL.replace(/\/$/, '')}/internal/evaluation-notify`;
    const botRes = await fetch(botUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': BOT_INTERNAL_SECRET,
      },
      body: JSON.stringify({
        to: String(to),
        cc: cc ? String(cc) : null,
        embed,
        cc_embed: cc_embed || null,
      }),
    });

    const botData = await botRes.json().catch(() => ({}));
    if (!botRes.ok || botData.error) {
      console.error('[discord/notify] Bot trả lỗi:', botRes.status, botData);
      return NextResponse.json(
        { error: botData.error || `Bot trả ${botRes.status}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[discord/notify] Lỗi relay:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
