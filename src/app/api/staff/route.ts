/**
 * /api/staff/route.ts — API webapp để HR xem/cập nhật profile NV
 *
 * - GET  /api/staff?target_id=<discordId> → Load 1 staff để populate form
 * - PUT  /api/staff (body: payload)        → Update staff (forward sang bot)
 *
 * Pattern: clone /api/holiday — forward sang bot endpoint /internal/staff-*
 */

import { NextResponse } from 'next/server';

// ── Types ─────────────────────────────────────────────────────
type WorkSchedulePayload = {
  type: 'fulltime' | 'parttime';
  workDays: Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
    'fullday' | 'morning' | 'afternoon' | 'off'>;
};

type StaffPayload = {
  target_id: string;                   // discordId NV cần update
  // [Phase B v5] Cơ bản — cho phép inline edit qua /staff-list
  name?: string | null;
  dept?: string | null;
  contractType?: 'fulltime' | 'parttime' | null;
  active?: boolean | null;
  // Cá nhân
  position?: string | null;
  dateOfBirth?: string | null;         // YYYY-MM-DD
  // Liên lạc
  phone?: string | null;
  email?: string | null;
  hometown?: string | null;
  // Tài chính
  bankNumber?: string | null;
  bankName?: string | null;
  // Hợp đồng
  probationStartDate?: string | null;  // YYYY-MM-DD
  probationEndDate?: string | null;    // YYYY-MM-DD
  contractSignDate?: string | null;    // YYYY-MM-DD
  // Auto-compute / khác
  numerology?: number | string | null;
  avatarUrl?: string | null;
  // [Phase B v5] Lịch làm việc parttime
  workSchedule?: WorkSchedulePayload | string | null;
  // [Phase B v5 — NHÓM A: Khẩn cấp]
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  emergencyRelation?: string | null;
  // [Phase B v5 — NHÓM B: Pháp lý CCCD]
  cccdNumber?: string | null;
  cccdIssueDate?: string | null;
  cccdIssuePlace?: string | null;
  edited_by: {
    discord_id: string;
    name: string;
    role: string;
  };
};

// ── Helper forward sang bot ──────────────────────────────────
async function forwardToBot(method: 'GET' | 'POST', endpoint: string, body?: unknown, query?: Record<string, string>) {
  const botUrl = process.env.BOT_API_URL || 'http://localhost:3101';
  const internalSecret = process.env.BOT_INTERNAL_SECRET || '';
  if (!internalSecret) {
    return { ok: false, status: 500, error: 'BOT_INTERNAL_SECRET chưa cấu hình' };
  }

  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
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
    const res = await fetch(`${botUrl}${endpoint}${qs}`, opts);
    const data = await res.json();
    return { ok: res.ok && data.ok, status: res.status, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bot không phản hồi';
    return { ok: false, status: 502, error: msg };
  }
}

// ── GET — Load 1 staff để populate form ──────────────────────
export async function GET(request: Request) {
  const sessionToken = request.headers.get('x-session-token');
  if (!sessionToken) {
    return NextResponse.json({ ok: false, error: 'Thiếu session token' }, { status: 401 });
  }

  const url = new URL(request.url);
  const targetId = url.searchParams.get('target_id');
  if (!targetId) {
    return NextResponse.json({ ok: false, error: 'Thiếu query param target_id' }, { status: 400 });
  }

  const result = await forwardToBot('GET', '/internal/staff-info', undefined, { target_id: targetId });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.data?.error || result.error || 'Bot không trả' },
      { status: result.status || 502 }
    );
  }
  return NextResponse.json(result.data);
}

// ── POST — Update staff ──────────────────────────────────────
// Dùng POST thay vì PUT cho đơn giản (giống pattern /api/holiday)
export async function POST(request: Request) {
  const sessionToken = request.headers.get('x-session-token');
  if (!sessionToken) {
    return NextResponse.json({ ok: false, error: 'Thiếu session token' }, { status: 401 });
  }

  let body: Partial<StaffPayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body không phải JSON hợp lệ' }, { status: 400 });
  }

  if (!body.target_id) {
    return NextResponse.json({ ok: false, error: 'Thiếu target_id' }, { status: 400 });
  }
  if (!body.edited_by?.discord_id) {
    return NextResponse.json({ ok: false, error: 'Thiếu edited_by (discord_id)' }, { status: 400 });
  }

  const result = await forwardToBot('POST', '/internal/staff-update', body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.data?.error || result.error || 'Bot từ chối' },
      { status: result.status || 502 }
    );
  }
  return NextResponse.json(result.data);
}
