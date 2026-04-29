/**
 * _utils/verifyEvalToken.ts
 * -----------------------------------------
 * Hàm dùng chung: xác thực HMAC-SHA256 token cho tất cả link đánh giá.
 *
 * Áp dụng cho:
 *  - NV tự đánh giá (/api/evaluation)
 *  - Quản lý điền công việc (/api/evaluation/mgr-fill)
 *  - Quản lý chấm điểm (/api/evaluation/mgr-review)
 *  - CEO phê duyệt (/api/evaluation/ceo-review)
 *
 * Cơ chế:
 *  Token = HMAC-SHA256(secret, "{discordId}:{evalId}:{72h_window}")
 *  Hết hạn sau 72h tính từ thời điểm tạo (check 2 window liền để tránh lỗi biên)
 */

import { createHmac } from 'crypto';

// Dùng chung secret KPI_TOKEN_SECRET với /weekly /monthly — đồng bộ Bot/Vercel/GAS
const EVAL_SECRET = process.env.KPI_TOKEN_SECRET || 'iruka-kpi-token-secret-2026';
const WINDOW_MS   = 72 * 3600 * 1000; // 72 giờ tính bằng milli-giây

/**
 * Xác thực token HMAC-SHA256 cá nhân hóa.
 *
 * @param token     - Token nhận từ request (query string hoặc body)
 * @param discordId - Discord ID của người thực hiện (NV / MGR / CEO)
 * @param evalId    - ID phiếu đánh giá
 * @returns true nếu hợp lệ và chưa hết hạn, false nếu sai hoặc hết hạn
 */
export function verifyEvalToken(token: string, discordId: string, evalId: string): boolean {
  if (!token || !discordId || !evalId) return false;

  const now        = Date.now();
  const curWindow  = Math.floor(now / WINDOW_MS);

  // Kiểm tra cả window hiện tại và window trước để tránh hết hạn đúng ranh giới 72h
  for (const w of [curWindow, curWindow - 1]) {
    const payload  = `${discordId}:${evalId}:${w}`;
    const expected = createHmac('sha256', EVAL_SECRET).update(payload).digest('hex');
    if (token === expected) return true;
  }

  return false;
}
