/**
 * API /api/members — Trả danh sách nhân viên active
 * -----------------------------------------------------------------
 * Luồng (ưu tiên theo thứ tự):
 *   1. BOT_MEMBERS_API_URL có → gọi Discord Bot API trên GCP (real-time)
 *   2. Fallback → đọc MEMBERS_JSON_PATH (local file, dev only)
 *
 * Auth (vào route này):
 *   - x-dashboard-auth header khớp DASHBOARD_PASSWORD
 *   - HOẶC token + hr_discord_id trên URL (link từ Discord bot)
 *
 * Auth (gọi ra Bot API):
 *   - Header x-api-key: BOT_MEMBERS_API_KEY (shared secret với discord-bot)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import fs from 'fs';

// ── Cấu trúc nhân viên trả về ─────────────────────────────────
interface MemberRecord {
  username: string;
  discordId: string;
  name: string;
  dept?: string;
  contractType?: string;
  active?: boolean;
  joinedAt?: string;
  managerUsername?: string;
  managerName?: string;
  managerDiscordId?: string;
  _meta?: boolean;
}

// ── Xác thực token eval từ link Discord bot ───────────────────
function isValidEvalToken(token: string | null, discordId: string | null): boolean {
  if (!token || !discordId) return false;
  const secret = process.env.EVALUATION_TOKEN_SECRET || process.env.KPI_TOKEN_SECRET || '';
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(discordId).digest('hex');
  return token === expected;
}

// ── Đọc file members.json local (fallback cho dev) ────────────
function loadFromFile(): { members: object[] } | null {
  const membersPath = process.env.MEMBERS_JSON_PATH;
  if (!membersPath) return null;

  try {
    const rawData: Record<string, MemberRecord> = JSON.parse(fs.readFileSync(membersPath, 'utf8'));

    const members = Object.values(rawData)
      .filter((m): m is MemberRecord => !!m.discordId && m.active !== false && !m._meta)
      .map((m) => {
        let managerName      = m.managerName      || '';
        let managerDiscordId = m.managerDiscordId || '';

        if (m.managerUsername && !managerDiscordId) {
          const mgr = Object.values(rawData).find(x => x.username === m.managerUsername);
          if (mgr) {
            managerName      = mgr.name      || m.managerUsername;
            managerDiscordId = mgr.discordId || '';
          }
        }

        return {
          name: m.name || '', username: m.username || '',
          discordId: m.discordId, dept: m.dept || '',
          contractType: m.contractType || 'fulltime',
          joinedAt: m.joinedAt || null,
          managerName, managerDiscordId,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

    return { members };
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Xác thực inbound (ai được gọi route này)
  const auth      = req.headers.get('x-dashboard-auth');
  const evalToken = req.nextUrl.searchParams.get('token') || req.headers.get('x-eval-token');
  const hrId      = req.nextUrl.searchParams.get('hr_discord_id');

  const validDashboard = auth && auth === process.env.DASHBOARD_PASSWORD;
  const validEvalToken = isValidEvalToken(evalToken, hrId);

  if (!validDashboard && !validEvalToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Ưu tiên 1: Gọi Discord Bot API trên GCP (real-time) ──────
  const botApiUrl = process.env.BOT_MEMBERS_API_URL;   // VD: http://34.28.61.240:3101
  const botApiKey = process.env.BOT_MEMBERS_API_KEY;

  if (botApiUrl && botApiKey) {
    try {
      const res = await fetch(`${botApiUrl}/members`, {
        headers: { 'x-api-key': botApiKey },
        // Timeout 5s — nếu GCP chậm thì fallback xuống file
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        // Đánh dấu source để debug
        return NextResponse.json({ ...data, _source: 'bot-api' });
      }
      // Bot trả lỗi → fallback xuống file
      console.warn(`[/api/members] Bot API trả ${res.status} → fallback file`);
    } catch (e) {
      // Timeout hoặc network lỗi → fallback
      console.warn('[/api/members] Bot API timeout/error → fallback file:', (e as Error).message);
    }
  }

  // ── Ưu tiên 2: Fallback đọc file local ───────────────────────
  const fileData = loadFromFile();
  if (fileData) {
    return NextResponse.json({ ...fileData, _source: 'local-file' });
  }

  // ── Không có nguồn nào ────────────────────────────────────────
  return NextResponse.json(
    { error: 'Không thể lấy dữ liệu nhân viên. Cấu hình BOT_MEMBERS_API_URL hoặc MEMBERS_JSON_PATH.' },
    { status: 503 }
  );
}
