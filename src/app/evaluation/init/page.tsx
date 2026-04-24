/**
 * app/evaluation/init/page.tsx — Trang HR tạo phiếu đánh giá
 * -------------------------------------------------------------
 * Vai trò: Trang dành cho HR đăng nhập bằng Dashboard Password
 *          và tạo phiếu đánh giá nhân sự mới.
 *
 * Bảo mật: Hỏi mật khẩu Dashboard (giống trang /dashboard)
 * Sau khi tạo: Bot gửi link cho Quản lý + CC CEO
 */

"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import HrInitForm from '@/components/evaluation/HrInitForm';
import { Lock, ClipboardCheck } from 'lucide-react';

// ── Màn hình đăng nhập HR ─────────────────────────────────────────
function LoginGate({ onLogin }: { onLogin: (pass: string, hrId: string) => void }) {
  const [pass, setPass] = useState('');
  const [hrId, setHrId] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!pass || !hrId) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    onLogin(pass, hrId);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
            <Lock size={24} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">HR — Đánh Giá Nhân Sự</h1>
          <p className="text-slate-500 text-sm">Điền thông tin để tạo phiếu đánh giá thử việc</p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-600 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Discord ID của HR
            </label>
            <input
              type="text"
              value={hrId}
              onChange={e => { setHrId(e.target.value); setError(''); }}
              placeholder="Discord User ID..."
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Mật khẩu Dashboard
            </label>
            <input
              type="password"
              value={pass}
              onChange={e => { setPass(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
          <button
            onClick={handleLogin}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/20"
          >
            Vào Trang Tạo Phiếu
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Trang chính ───────────────────────────────────────────────────
function EvaluationInitPageInner() {
  const urlParams = useSearchParams();
  const urlToken = urlParams.get('token') || '';
  const urlHrId  = urlParams.get('hr_discord_id') || '';

  // Nếu mở từ link Discord (có token + hr_discord_id) → bỏ qua màn đăng nhập
  const autoAuth = urlToken && urlHrId ? { pass: urlToken, hrId: urlHrId } : null;

  const [auth, setAuth] = useState<{ pass: string; hrId: string } | null>(autoAuth);

  if (!auth) {
    return (
      <LoginGate
        onLogin={(pass, hrId) => setAuth({ pass, hrId })}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f0f4f8] text-slate-800 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8 max-w-[1200px] mx-auto w-full">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/2"></div>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#1e3a5f] rounded-[18px] flex items-center justify-center text-3xl shadow-lg shadow-[#1e3a5f]/20">
              📋
            </div>
            <div>
              <h1 className="text-[26px] font-black text-[#1e3a5f] tracking-tight mb-1">
                Đánh Giá Nhân Viên Sau Thử Việc
              </h1>
            </div>
          </div>

          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#dbeafe] text-[#1e40af] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span>
              Khởi Tạo Phiếu
            </span>
          </div>
        </div>

        {/* Luồng overview */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mt-4">
          <div className="flex items-center gap-1.5 font-bold text-[12px]">
            <span className="w-6 h-6 rounded-full flex items-center justify-center bg-[#1e3a5f] text-white">1</span>
            <span className="text-[#374151]">Thông tin chung</span>
          </div>
          <span className="text-[#d1d5db] text-base px-1">›</span>
          <div className="flex items-center gap-1.5 font-bold text-[12px]">
            <span className="w-6 h-6 rounded-full flex items-center justify-center bg-[#d1d5db] text-white">2</span>
            <span className="text-[#374151]">Tự đánh giá</span>
          </div>
          <span className="text-[#d1d5db] text-base px-1">›</span>
          <div className="flex items-center gap-1.5 font-bold text-[12px]">
            <span className="w-6 h-6 rounded-full flex items-center justify-center bg-[#d1d5db] text-white">3</span>
            <span className="text-[#374151]">Quản lý đánh giá</span>
          </div>
          <span className="text-[#d1d5db] text-base px-1">›</span>
          <div className="flex items-center gap-1.5 font-bold text-[12px]">
            <span className="w-6 h-6 rounded-full flex items-center justify-center bg-[#d1d5db] text-white">4</span>
            <span className="text-[#374151]">Kết luận & Ký duyệt</span>
          </div>
        </div>

        {/* Form */}
        <HrInitForm
          hrDiscordId={auth.hrId}
          dashboardPassword={auth.pass}
        />
      </main>
    </div>
  );
}
// Wrapper bắt buộc — useSearchParams() yêu cầu Suspense trong Next.js App Router
export default function EvaluationInitPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>}>
      <EvaluationInitPageInner />
    </Suspense>
  );
}
