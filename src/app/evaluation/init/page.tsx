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
    <div className="flex items-center justify-center min-h-screen bg-[#0a1120]">
      <div className="w-full max-w-sm bg-slate-800/60 rounded-2xl border border-slate-700/50 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto">
            <Lock size={24} className="text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-white">HR — Đánh Giá Nhân Sự</h1>
          <p className="text-slate-400 text-sm">Điền thông tin để tạo phiếu đánh giá thử việc</p>
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Discord ID của HR
            </label>
            <input
              type="text"
              value={hrId}
              onChange={e => { setHrId(e.target.value); setError(''); }}
              placeholder="Discord User ID..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Mật khẩu Dashboard
            </label>
            <input
              type="password"
              value={pass}
              onChange={e => { setPass(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
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
export default function EvaluationInitPage() {
  const [auth, setAuth] = useState<{ pass: string; hrId: string } | null>(null);

  if (!auth) {
    return (
      <LoginGate
        onLogin={(pass, hrId) => setAuth({ pass, hrId })}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a1120] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <ClipboardCheck size={22} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tạo Phiếu Đánh Giá Thử Việc</h1>
              <p className="text-sm text-slate-400">
                Điền thông tin nhân viên → Bot sẽ gửi form cho Quản lý trực tiếp
              </p>
            </div>
          </div>
          {/* Luồng overview */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
            {['HR tạo phiếu', 'Quản lý điền việc', 'NV tự đánh giá', 'Quản lý chấm điểm', 'CEO duyệt', 'Kết quả'].map((step, i) => (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                  i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 0 ? 'bg-white/20' : 'bg-slate-700'
                  }`}>{i + 1}</span>
                  {step}
                </div>
                {i < 5 && <span className="text-slate-600 shrink-0">›</span>}
              </React.Fragment>
            ))}
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
