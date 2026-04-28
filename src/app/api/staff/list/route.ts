/**
 * /api/staff/list/route.ts — Webapp lấy toàn bộ NV để render trang /staff-list
 * Forward sang bot internal endpoint /internal/staff-list-all.
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const sessionToken = request.headers.get('x-session-token');
  if (!sessionToken) {
    return NextResponse.json({ ok: false, error: 'Thiếu session token' }, { status: 401 });
  }

  const botUrl = process.env.BOT_API_URL || 'http://localhost:3101';
  const internalSecret = process.env.BOT_INTERNAL_SECRET || '';
  if (!internalSecret) {
    return NextResponse.json({ ok: false, error: 'BOT_INTERNAL_SECRET chưa cấu hình' }, { status: 500 });
  }

  try {
    const res = await fetch(`${botUrl}/internal/staff-list-all`, {
      headers: { 'x-internal-secret': internalSecret },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || 'Bot không trả' },
        { status: res.status || 502 }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bot không phản hồi';
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
