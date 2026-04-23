/**
 * app/evaluation/mgr-fill/[id]/page.tsx — Trang Quản lý điền đầu việc
 * -----------------------------------------------------------------------
 * Vai trò: Quản lý nhận link từ Bot, vào trang này điền:
 *   1. Danh sách công việc đã giao cho NV
 *   2. Tiêu chí đánh giá năng lực (sửa từ mẫu HR hoặc tự tạo)
 *
 * Bảo mật: Yêu cầu Dashboard Password (Quản lý đã biết)
 * URL: /evaluation/mgr-fill/[eval_id]
 */

"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MgrWorkSummary from '@/components/evaluation/MgrWorkSummary';
import EvalInfoForm from '@/components/evaluation/EvalInfoForm';
import { Lock, ClipboardCheck, Loader2, AlertTriangle } from 'lucide-react';
import type { EvalInfo } from '@/components/evaluation/EvalInfoForm';
import type { CriteriaItem } from '@/components/evaluation/EvalCriteriaTable';

// ── Màn hình đăng nhập Quản lý ───────────────────────────────────
function MgrLoginGate({ onLogin }: { onLogin: (pass: string) => void }) {
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a1120]">
      <div className="w-full max-w-sm bg-slate-800/60 rounded-2xl border border-slate-700/50 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto">
            <Lock size={24} className="text-purple-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Điền Công Việc</h1>
          <p className="text-slate-400 text-sm">Xác thực trước khi điền form đánh giá</p>
        </div>
        {err && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">{err}</div>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
            Mật khẩu Dashboard
          </label>
          <input
            type="password"
            value={pass}
            onChange={e => { setPass(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && (pass ? onLogin(pass) : setErr('Nhập mật khẩu'))}
            placeholder="••••••••"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-purple-500 outline-none transition"
          />
        </div>
        <button
          onClick={() => pass ? onLogin(pass) : setErr('Nhập mật khẩu')}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
        >
          Vào Form
        </button>
      </div>
    </div>
  );
}

interface EvalData {
  info: EvalInfo;
  hr_criteria: CriteriaItem[];
  status: string;
}

export default function MgrFillPage() {
  const params = useParams();
  const evalId = params?.id as string;

  const [pass, setPass] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evalData, setEvalData] = useState<EvalData | null>(null);
  const [error, setError] = useState('');

  const loadData = async (dashPass: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/evaluation/mgr-fill?id=${encodeURIComponent(evalId)}`, {
        headers: { 'x-dashboard-auth': dashPass },
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Lỗi tải phiếu');
      setEvalData(data);
      setAuthed(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (dashPass: string) => {
    setPass(dashPass);
    loadData(dashPass);
  };

  if (!authed) {
    return <MgrLoginGate onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-[#0a1120] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
              <ClipboardCheck size={22} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Điền Công Việc & Tiêu Chí</h1>
              <p className="text-sm text-slate-400">Bước 2/6 — Quản lý điền để gửi cho nhân viên tự đánh giá</p>
            </div>
          </div>
          {/* Luồng */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            {['HR tạo phiếu', 'Quản lý điền việc', 'NV tự đánh giá', 'Quản lý chấm điểm', 'CEO duyệt', 'Kết quả'].map((step, i) => (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                  i === 1 ? 'bg-purple-600 text-white' : i < 1 ? 'bg-green-600/20 text-green-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 1 ? 'bg-white/20' : i < 1 ? 'bg-green-600/30' : 'bg-slate-700'
                  }`}>{i + 1}</span>
                  {step}
                </div>
                {i < 5 && <span className="text-slate-600 shrink-0">›</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-400" />
          </div>
        )}

        {/* Lỗi */}
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-red-400">
            <AlertTriangle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Nội dung */}
        {evalData && !loading && (
          <div className="space-y-8">
            {/* Thông tin NV */}
            <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-base font-bold text-slate-300 mb-4">📋 Thông Tin Nhân Viên</h2>
              <EvalInfoForm info={evalData.info} />
            </section>

            {/* Form điền việc */}
            <MgrWorkSummary
              evalId={evalId}
              employeeName={evalData.info.name}
              dashboardPassword={pass}
              hrCriteria={evalData.hr_criteria}
            />
          </div>
        )}
      </main>
    </div>
  );
}
