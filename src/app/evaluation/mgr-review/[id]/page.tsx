/**
 * app/evaluation/mgr-review/[id]/page.tsx — Trang Quản lý chấm điểm
 * -------------------------------------------------------------------
 * Vai trò: Quản lý nhận link từ Bot Discord (sau khi NV nộp phiếu),
 *          xem toàn bộ phiếu NV đã điền, chấm điểm từng tiêu chí,
 *          nhận xét tổng thể, đề xuất quyết định → gửi CEO (CC HR).
 *
 * Bảo mật: Dashboard password
 * URL: /evaluation/mgr-review/[eval_id]
 */

"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import EvalInfoForm from '@/components/evaluation/EvalInfoForm';
import WorkSummaryTable from '@/components/evaluation/WorkSummaryTable';
import MgrScorePanel from '@/components/evaluation/MgrScorePanel';
import EmployeeProposal from '@/components/evaluation/EmployeeProposal';
import { Lock, ClipboardCheck, Loader2, AlertTriangle } from 'lucide-react';
import type { EvalInfo } from '@/components/evaluation/EvalInfoForm';
import type { WorkRow } from '@/components/evaluation/WorkSummaryTable';

// ── Login Gate ────────────────────────────────────────────────────
function LoginGate({ onLogin }: { onLogin: (pass: string) => void }) {
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a1120]">
      <div className="w-full max-w-sm bg-slate-800/60 rounded-2xl border border-slate-700/50 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto">
            <Lock size={24} className="text-purple-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Quản lý — Chấm Điểm</h1>
          <p className="text-slate-400 text-sm">Xác thực để xem và chấm điểm phiếu đánh giá</p>
        </div>
        {err && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">{err}</div>}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Mật khẩu Dashboard</label>
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
          Xem Phiếu
        </button>
      </div>
    </div>
  );
}

// ── Kiểu dữ liệu phiếu đầy đủ ────────────────────────────────────
interface FullEvalData {
  info: EvalInfo;
  work_items: WorkRow[];
  criteria: Array<{ name: string; expectation: string; source: string; self_score: number }>;
  proposal: { salary_expectation: string; training_request: string; feedback: string };
  status: string;
}

export default function MgrReviewPage() {
  const params = useParams();
  const evalId = params?.id as string;

  const [pass, setPass] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evalData, setEvalData] = useState<FullEvalData | null>(null);
  const [error, setError] = useState('');

  const loadData = async (dashPass: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/evaluation/mgr-review?id=${encodeURIComponent(evalId)}`, {
        headers: { 'x-dashboard-auth': dashPass },
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Không thể tải phiếu');
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

  // ── Chưa đăng nhập ───────────────────────────────────────────────
  if (!authed) {
    return error ? (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a1120] text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-red-400" />
        <h1 className="text-xl font-bold text-white">Không thể tải phiếu</h1>
        <p className="text-slate-400">{error}</p>
        <button onClick={() => { setError(''); setPass(''); }} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors">
          Thử lại
        </button>
      </div>
    ) : (
      <LoginGate onLogin={handleLogin} />
    );
  }

  // ── Kiểm tra trạng thái phiếu ────────────────────────────────────
  const validStatuses = ['SUBMITTED', 'UNDER_REVIEW'];
  if (evalData && !validStatuses.includes(evalData.status)) {
    const statusMsg: Record<string, string> = {
      PENDING_CEO: 'Phiếu đã được gửi lên CEO duyệt.',
      COMPLETED: 'Phiếu đã được CEO phê duyệt.',
      RESULT_SENT: 'Kết quả đã được gửi cho nhân viên.',
    };
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a1120] text-center space-y-4 p-8">
        <ClipboardCheck size={56} className="text-blue-400" />
        <h1 className="text-xl font-bold text-white">Phiếu đang ở giai đoạn khác</h1>
        <p className="text-slate-400">{statusMsg[evalData.status] || `Trạng thái hiện tại: ${evalData.status}`}</p>
      </div>
    );
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
              <h1 className="text-2xl font-bold text-white">Chấm Điểm Đánh Giá</h1>
              <p className="text-sm text-slate-400">Bước 4/6 — Quản lý chấm điểm và đề xuất quyết định</p>
            </div>
          </div>
          {/* Workflow breadcrumb */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            {['HR tạo phiếu', 'Quản lý điền việc', 'NV tự đánh giá', 'Quản lý chấm điểm', 'CEO duyệt', 'Kết quả'].map((step, i) => (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                  i === 3 ? 'bg-purple-600 text-white' : i < 3 ? 'bg-green-600/20 text-green-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 3 ? 'bg-white/20' : i < 3 ? 'bg-green-600/30' : 'bg-slate-700'
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
            <Loader2 size={32} className="animate-spin text-purple-400" />
          </div>
        )}

        {evalData && !loading && (
          <div className="space-y-8">
            {/* Thông tin NV */}
            <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-base font-bold text-slate-300 mb-4">📋 Thông Tin Nhân Viên</h2>
              <EvalInfoForm info={evalData.info} />
            </section>

            {/* Tổng kết công việc — Quản lý chỉ xem (readonly) */}
            <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-base font-bold text-slate-300 mb-4 flex items-center gap-2">
                📁 Kết Quả Công Việc NV Báo Cáo
                <span className="text-xs font-normal text-slate-500">(chỉ xem)</span>
              </h2>
              <WorkSummaryTable rows={evalData.work_items} readonly={true} />
            </section>

            {/* Đề xuất của NV */}
            <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-base font-bold text-slate-300 mb-4 flex items-center gap-2">
                💬 Đề Xuất Của Nhân Viên
                <span className="text-xs font-normal text-slate-500">(chỉ xem)</span>
              </h2>
              <EmployeeProposal data={evalData.proposal} readonly={true} />
            </section>

            {/* Panel chấm điểm */}
            <MgrScorePanel
              evalId={evalId}
              employeeName={evalData.info.name}
              criteria={evalData.criteria.map(c => ({
                name: c.name,
                expectation: c.expectation,
                source: c.source as any,
                self_score: c.self_score,
              }))}
              dashboardPass={pass}
            />
          </div>
        )}
      </main>
    </div>
  );
}
