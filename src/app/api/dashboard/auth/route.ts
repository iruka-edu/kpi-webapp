/**
 * /api/dashboard/auth — POST
 * --------------------------
 * Vai trò: Xác thực mật khẩu Dashboard Sếp.
 * So sánh với biến môi trường DASHBOARD_PASSWORD.
 * Trả 200 nếu đúng, 401 nếu sai.
 */

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();
  const correctPassword = process.env.DASHBOARD_PASSWORD;

  if (!correctPassword) {
    return NextResponse.json(
      { error: 'DASHBOARD_PASSWORD chưa được cấu hình trong .env' },
      { status: 500 }
    );
  }

  if (password === correctPassword) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Sai mật khẩu' }, { status: 401 });
}
