/**
 * /api/holiday/route.ts — API webapp nhận POST từ form HR
 *
 * Sprint 2 (current): Validate payload + return mock success
 * Sprint 3 (next):    Forward sang bot api-server tại BOT_API_URL/internal/holiday-propose
 *
 * Pattern: tương tự /api/monthly và /api/kpi đang dùng.
 */

import { NextResponse } from 'next/server';

// ── Types khớp với form ──
type HalfDayType = 'full' | 'morning' | 'afternoon' | 'skip';

type DayDetail = {
  date: string;
  type: HalfDayType;
};

type HolidayProposalPayload = {
  name: string;
  type: 'national' | 'company' | 'event' | 'emergency';
  start_date: string;
  end_date: string;
  total_days: number;
  days_detail: DayDetail[];
  reason: string;
  decision_file_name: string | null;
  decision_file_size: number | null;
  // Optional — file binary (base64) để bot save + đính kèm DM CEO
  decision_file_mime?: string | null;
  decision_file_base64?: string | null;
  proposed_by: {
    discord_id: string;
    name: string;
    role: string;
  };
};

// ── Validation ──
function validatePayload(p: Partial<HolidayProposalPayload>): string | null {
  if (!p.name || typeof p.name !== 'string' || !p.name.trim()) {
    return 'Thiếu hoặc sai field "name"';
  }
  if (!p.type || !['national', 'company', 'event', 'emergency'].includes(p.type)) {
    return 'Field "type" không hợp lệ';
  }
  if (!p.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(p.start_date)) {
    return 'Field "start_date" sai format YYYY-MM-DD';
  }
  if (!p.end_date || !/^\d{4}-\d{2}-\d{2}$/.test(p.end_date)) {
    return 'Field "end_date" sai format YYYY-MM-DD';
  }
  if (p.start_date > p.end_date) {
    return 'start_date phải <= end_date';
  }
  if (!p.reason || typeof p.reason !== 'string' || !p.reason.trim()) {
    return 'Thiếu field "reason"';
  }
  if (!Array.isArray(p.days_detail) || p.days_detail.length === 0) {
    return 'Thiếu hoặc rỗng field "days_detail"';
  }
  // Phải có ít nhất 1 ngày không "skip"
  const nonSkip = p.days_detail.filter(d => d.type !== 'skip');
  if (nonSkip.length === 0) {
    return 'Cần ít nhất 1 ngày không "skip"';
  }
  if (typeof p.total_days !== 'number' || p.total_days <= 0) {
    return 'Field "total_days" phải > 0';
  }
  if (!p.proposed_by || typeof p.proposed_by !== 'object') {
    return 'Thiếu field "proposed_by"';
  }
  return null; // OK
}

// ── POST handler ──
export async function POST(request: Request) {
  // Check session token (Sprint 3 sẽ verify thật với bot)
  const sessionToken = request.headers.get('x-session-token');
  if (!sessionToken) {
    return NextResponse.json(
      { ok: false, error: 'Thiếu session token — vui lòng quay lại Discord lấy link mới' },
      { status: 401 }
    );
  }

  // Parse body
  let body: Partial<HolidayProposalPayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Body không phải JSON hợp lệ' },
      { status: 400 }
    );
  }

  // Validate
  const validationError = validatePayload(body);
  if (validationError) {
    return NextResponse.json(
      { ok: false, error: validationError },
      { status: 400 }
    );
  }

  // ── Sprint 3: Forward sang bot api-server ──
  const botUrl = process.env.BOT_API_URL || 'http://localhost:3101';
  const internalSecret = process.env.BOT_INTERNAL_SECRET || '';

  if (!internalSecret) {
    console.error('[/api/holiday] BOT_INTERNAL_SECRET chưa cấu hình');
    return NextResponse.json(
      { ok: false, error: 'Hệ thống chưa cấu hình kết nối bot. Báo IT.' },
      { status: 500 }
    );
  }

  console.log('[/api/holiday] Forward đề xuất sang bot:', {
    botUrl,
    name: body.name,
    range: `${body.start_date} → ${body.end_date}`,
    proposer: body.proposed_by?.name,
  });

  try {
    const botRes = await fetch(`${botUrl}/internal/holiday-propose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify(body),
      // Timeout sau 10s (Next.js fetch dùng AbortController)
      signal: AbortSignal.timeout(10_000),
    });

    const data = await botRes.json();
    if (!botRes.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || 'Bot từ chối đề xuất' },
        { status: botRes.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Không kết nối được bot';
    console.error('[/api/holiday] Lỗi forward:', msg);
    return NextResponse.json(
      { ok: false, error: `Bot không phản hồi: ${msg}. Thử lại sau hoặc báo IT.` },
      { status: 502 }
    );
  }
}
