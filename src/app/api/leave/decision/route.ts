/**
 * /api/leave/decision/route.ts — POST QL/CEO duyệt hoặc từ chối
 *
 * - POST /api/leave/decision (body: { id, token, decision, decider, rejectedReason? })
 *   → Forward sang bot /internal/leave-decision
 */

import { NextResponse } from 'next/server';

type DecisionPayload = {
  id: string;
  token: string;
  decision: 'approved' | 'rejected';
  decider: { discord_id: string; name: string };
  rejectedReason?: string;
};

async function forwardToBot(endpoint: string, body: unknown) {
  const botUrl = process.env.BOT_API_URL || 'http://localhost:3101';
  const internalSecret = process.env.BOT_INTERNAL_SECRET || '';
  if (!internalSecret) {
    return { ok: false, status: 500, error: 'BOT_INTERNAL_SECRET chưa cấu hình' };
  }
  try {
    const res = await fetch(`${botUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return { ok: res.ok && data.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 502, error: err instanceof Error ? err.message : 'Bot không phản hồi' };
  }
}

export async function POST(request: Request) {
  let body: Partial<DecisionPayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body không phải JSON hợp lệ' }, { status: 400 });
  }

  if (!body.id || !body.token || !body.decision || !body.decider?.discord_id) {
    return NextResponse.json({ ok: false, error: 'Thiếu trường bắt buộc' }, { status: 400 });
  }
  if (!['approved', 'rejected'].includes(body.decision)) {
    return NextResponse.json({ ok: false, error: 'decision phải là approved/rejected' }, { status: 400 });
  }
  if (body.decision === 'rejected' && (!body.rejectedReason || body.rejectedReason.trim().length < 5)) {
    return NextResponse.json({ ok: false, error: 'Lý do từ chối tối thiểu 5 ký tự' }, { status: 400 });
  }

  const result = await forwardToBot('/internal/leave-decision', body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.data?.error || result.error || 'Bot từ chối' },
      { status: result.status || 502 }
    );
  }
  return NextResponse.json(result.data);
}
