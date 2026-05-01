/**
 * /api/leave/pending/[id]/route.ts — GET load chi tiết phiếu để render page duyệt
 *
 * - GET /api/leave/pending/<id>?token=<hmac>
 *   → Forward sang bot /internal/leave-pending/<id>
 */

import { NextResponse } from 'next/server';

async function forwardToBot(endpoint: string) {
  const botUrl = process.env.BOT_API_URL || 'http://localhost:3101';
  const internalSecret = process.env.BOT_INTERNAL_SECRET || '';
  if (!internalSecret) {
    return { ok: false, status: 500, error: 'BOT_INTERNAL_SECRET chưa cấu hình' };
  }
  try {
    const res = await fetch(`${botUrl}${endpoint}`, {
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Thiếu id' }, { status: 400 });
  }

  const result = await forwardToBot(`/internal/leave-pending/${encodeURIComponent(id)}`);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.data?.error || result.error || 'Bot từ chối' },
      { status: result.status || 502 }
    );
  }
  return NextResponse.json(result.data);
}
