/**
 * /api/leave/preview/route.ts — GET preview phép realtime cho NV
 *
 * - GET /api/leave/preview?discord_id=<id>
 *   → Forward sang bot /internal/staff-info để lấy member + leaveBalance
 *
 * Frontend dùng để hiển thị "Phép tích lũy / Đã dùng / Còn dư" trên form.
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
  const discordId = url.searchParams.get('discord_id');
  if (!discordId) {
    return NextResponse.json({ ok: false, error: 'Thiếu discord_id' }, { status: 400 });
  }

  // Reuse endpoint /internal/staff-info (đã có) — Phase B2 đã trả leaveBalance
  // NHƯNG /staff-info hiện chỉ trả member chưa kèm leaveBalance — em cần dùng staff-list-all + filter
  // Cách đơn giản: forward đến staff-info, sau đó compute leaveBalance bằng helper client-side
  const result = await forwardToBot('/internal/staff-info', { target_id: discordId });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.data?.error || result.error || 'Bot từ chối' },
      { status: result.status || 502 }
    );
  }

  const member = result.data?.staff;
  if (!member) {
    return NextResponse.json({ ok: false, error: 'Không tìm thấy NV' }, { status: 404 });
  }

  // Compute leaveBalance ở web (mirror logic bot — em sẽ tạo helper sau)
  // Tạm: trả member + flag để client tự tính (hoặc bot trả sẵn nếu ta extend endpoint)
  return NextResponse.json({
    ok: true,
    member: {
      discordId: member.discordId,
      name: member.name,
      dept: member.dept,
      contractType: member.contractType,
      contractSignDate: member.contractSignDate,
      probationStartDate: member.probationStartDate,
      joinedAt: member.joinedAt,
      monthlyLeaveQuota: member.monthlyLeaveQuota,
      workSchedule: member.workSchedule,
      managerName: member.managerName,
      managerDiscordId: member.managerDiscordId,
    },
    leaveBalance: member.leaveBalance || null,
  });
}
