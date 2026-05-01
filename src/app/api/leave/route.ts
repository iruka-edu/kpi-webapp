/**
 * /api/leave/route.ts — POST submit đơn xin nghỉ (Plan A)
 *
 * - POST /api/leave (body: payload) → Forward sang bot /internal/leave-propose
 *
 * Pattern: clone /api/holiday — forward sang bot endpoint /internal/leave-*
 */

import { NextResponse } from 'next/server';

// ── Types ─────────────────────────────────────────────────────
type LeaveDayItem = {
  date: string;                    // YYYY-MM-DD
  type: 'full' | 'morning' | 'afternoon';
  action?: 'off' | 'work_swap';    // mặc định 'off'
};

type LeavePayload = {
  proposed_by: {
    discord_id: string;
    username?: string;
    name: string;
    dept?: string;
    contractType?: 'fulltime' | 'parttime';
  };
  days_detail: LeaveDayItem[];
  totalDays?: number;
  backup?: string | null;
  reason: string;
};

// ── Helper forward sang bot ──────────────────────────────────
async function forwardToBot(method: 'GET' | 'POST', endpoint: string, body?: unknown) {
  const botUrl = process.env.BOT_API_URL || 'http://localhost:3101';
  const internalSecret = process.env.BOT_INTERNAL_SECRET || '';
  if (!internalSecret) {
    return { ok: false, status: 500, error: 'BOT_INTERNAL_SECRET chưa cấu hình' };
  }

  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret,
    },
    signal: AbortSignal.timeout(10_000),
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${botUrl}${endpoint}`, opts);
    const data = await res.json();
    return { ok: res.ok && data.ok, status: res.status, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bot không phản hồi';
    return { ok: false, status: 502, error: msg };
  }
}

// ── POST /api/leave — Submit phiếu xin nghỉ ──────────────────
export async function POST(request: Request) {
  const sessionToken = request.headers.get('x-session-token');
  if (!sessionToken) {
    return NextResponse.json({ ok: false, error: 'Thiếu session token' }, { status: 401 });
  }

  let body: Partial<LeavePayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body không phải JSON hợp lệ' }, { status: 400 });
  }

  // Validate cơ bản
  if (!body.proposed_by?.discord_id || !body.proposed_by?.name) {
    return NextResponse.json({ ok: false, error: 'Thiếu proposed_by (discord_id, name)' }, { status: 400 });
  }
  if (!Array.isArray(body.days_detail) || body.days_detail.length === 0) {
    return NextResponse.json({ ok: false, error: 'days_detail phải là mảng có item' }, { status: 400 });
  }
  if (!body.reason || body.reason.trim().length < 5) {
    return NextResponse.json({ ok: false, error: 'Lý do tối thiểu 5 ký tự' }, { status: 400 });
  }

  const result = await forwardToBot('POST', '/internal/leave-propose', body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.data?.error || result.error || 'Bot từ chối' },
      { status: result.status || 502 }
    );
  }
  return NextResponse.json(result.data);
}
