/**
 * API /api/members — Trả danh sách nhân viên active từ Discord Bot
 * -----------------------------------------------------------------
 * Luồng:
 *   GET /api/members (header: x-dashboard-auth)
 *   → Đọc MEMBERS_JSON_PATH (file discord-bot/data/members.json)
 *   → Trả [{name, username, discordId, dept, joinedAt, managerName, managerDiscordId}]
 *
 * Bảo mật: Yêu cầu x-dashboard-auth khớp DASHBOARD_PASSWORD trong .env
 * Chỉ trả nhân viên đang active (active !== false)
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';

// Cấu trúc 1 record nhân viên trong members.json
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

import { createHmac } from 'crypto';

// Kiểm tra token eval hợp lệ (dùng cùng logic với discord-bot/commands/evaluation.js)
function isValidEvalToken(token: string | null, discordId: string | null): boolean {
  if (!token || !discordId) return false;
  const secret = process.env.EVALUATION_TOKEN_SECRET || process.env.KPI_TOKEN_SECRET || '';
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(discordId).digest('hex');
  return token === expected;
}

export async function GET(req: NextRequest) {
  // ── Xác thực: chấp nhận Dashboard Password HOẶC Eval Token ────
  const auth      = req.headers.get('x-dashboard-auth');
  const evalToken = req.nextUrl.searchParams.get('token') || req.headers.get('x-eval-token');
  const hrId      = req.nextUrl.searchParams.get('hr_discord_id');

  const validDashboard = auth && auth === process.env.DASHBOARD_PASSWORD;
  const validEvalToken = isValidEvalToken(evalToken, hrId);

  if (!validDashboard && !validEvalToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }


  // ── Kiểm tra biến môi trường đường dẫn file ───────────────────
  const membersPath = process.env.MEMBERS_JSON_PATH;
  if (!membersPath) {
    return NextResponse.json(
      { error: 'MEMBERS_JSON_PATH chưa được cấu hình trong .env.local' },
      { status: 500 }
    );
  }

  // ── Đọc và parse members.json ──────────────────────────────────
  let rawData: Record<string, MemberRecord>;
  try {
    const raw = fs.readFileSync(membersPath, 'utf8');
    rawData = JSON.parse(raw);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Không thể đọc file nhân viên: ${msg}` },
      { status: 500 }
    );
  }

  // ── Lọc + map sang format phản hồi ────────────────────────────
  const members = Object.values(rawData)
    .filter(
      (m): m is MemberRecord =>
        !!m.discordId && // có Discord ID
        m.active !== false && // đang active
        !m._meta // không phải metadata
    )
    .map((m) => {
      // Tra cứu thông tin quản lý nếu chỉ có managerUsername
      let managerName = m.managerName || '';
      let managerDiscordId = m.managerDiscordId || '';

      if (m.managerUsername && !managerDiscordId) {
        const mgr = Object.values(rawData).find(
          (x) => x.username === m.managerUsername
        );
        if (mgr) {
          managerName = mgr.name || m.managerUsername;
          managerDiscordId = mgr.discordId || '';
        }
      }

      return {
        name: m.name || '',
        username: m.username || '',
        discordId: m.discordId,
        dept: m.dept || '',
        contractType: m.contractType || 'fulltime',
        joinedAt: m.joinedAt || null, // null nếu chưa có dữ liệu
        managerName,
        managerDiscordId,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'vi')); // Sắp xếp theo tên tiếng Việt

  return NextResponse.json({ members });
}
