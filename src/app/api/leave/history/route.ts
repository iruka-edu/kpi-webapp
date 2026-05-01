/**
 * /api/leave/history/route.ts — GET 5 phiếu xin nghỉ gần nhất
 *
 * - GET /api/leave/history?user_id=<discord_id>&limit=5
 *   → Forward sang bot /internal/leave-history
 */

import { NextResponse } from 'next/server';

async function forwardToBot(endpoint: string, query?: Record<string, string>) {
  const botUrl = process.env.BOT_API_URL || 'http://localhost:3101';
  const internalSecret = process.env.BOT_INTERNAL_SECRET || '';
  if (!internalSecret) {
    return { ok: false, status: 500, error: 'BOT_INTERNAL_SECRET chưa cấu hình' };
  }
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  try {
    const res = await fetch(`${botUrl}${endpoint}${qs}`, {
      method: 'GET',
      headers: { 'x-internal-secret': internalSecret },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return { ok: res.ok && data.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 502, error: err instanceof Error ? err.message : 'Bot không phản hồi' };
  }
}

export async function GET(request: Request) {
  const sessionToken = request.headers.get('x-session-token');
  if (!sessionToken) {
    return NextResponse.json({ ok: false, error: 'Thiếu session token' }, { status: 401 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  const limit = url.searchParams.get('limit') || '5';
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Thiếu user_id' }, { status: 400 });
  }

  const result = await forwardToBot('/internal/leave-history', { user_id: userId, limit });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.data?.error || result.error || 'Bot từ chối' },
      { status: result.status || 502 }
    );
  }
  return NextResponse.json(result.data);
}
