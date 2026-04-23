/**
 * app/evaluation/ceo-review/[id]/page.tsx — Trang CEO phê duyệt
 * ---------------------------------------------------------------
 * Vai trò: CEO nhận link từ Bot Discord (sau khi Quản lý chấm xong),
 *          xem toàn bộ phiếu + điểm NV/QL + nhận xét + đề xuất QL,
 *          sau đó Phê duyệt hoặc Trả về cho Quản lý xem lại.
 *
 * Bảo mật: Dashboard password
 * URL: /evaluation/ceo-review/[eval_id]
 */

"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import EvalInfoForm from '@/components/evaluation/EvalInfoForm';
import WorkSummaryTable from '@/components/evaluation/WorkSummaryTable';
import EvalCriteriaTable from '@/components/evaluation/EvalCriteriaTable';
import EmployeeProposal from '@/components/evaluation/EmployeeProposal';
import ScoreSummaryBar from '@/components/evaluation/ScoreSummaryBar';
import CeoApprovalPanel from '@/components/evaluation/CeoApprovalPanel';
import { Lock, ClipboardCheck, Loader2, AlertTriangle } from 'lucide-react';
import type { EvalInfo } from '@/components/evaluation/EvalInfoForm';
import type { WorkRow } from '@/components/evaluation/WorkSummaryTable';
import type { CriteriaItem } from '@/components/evaluation/EvalCriteriaTable';

// ── Login Gate ────────────────────────────────────────────────────
function LoginGate({ onLogin }: { onLogin: (pass: string) => void }) {
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a1120]">
      <div className="w-full max-w-sm bg-slate-800/60 rounded-2xl border border-slate-700/50 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            👑
          </div>
          <h1 className="text-xl font-bold text-white">CEO — Phê Duyệt Đánh Giá</h1>
          <p className="text-slate-400 text-sm">Xác thực để xem và phê duyệt phiếu đánh giá nhân sự</p>
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
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-amber-500 outline-none transition"
          />
        </div>
        <button
          onClick={() => pass ? onLogin(pass) : setErr('Nhập mật khẩu')}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl transition-colors shadow-lg shadow-amber-500/20"
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
  criteria: Array<CriteriaItem & { self_score: number; mgr_score: number }>;
  proposal: { salary_expectation: string; training_request: string; feedback: string };
  mgr_comment: string;
  mgr_decision: string;
  status: string;
}

export default function CeoReviewPage() {
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
      const res = await fetch(`/api/evaluation/ceo-review?id=${encodeURIComponent(evalId)}`, {
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
        <button
          onClick={() => { setError(''); setPass(''); }}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Thử lại
        </button>
      </div>
    ) : (
      <LoginGate onLogin={handleLogin} />
    );
  }

  // Tính điểm trung bình từ criteria
  const calcAvg = (scores: number[]) => {
    const valid = scores.filter(s => s > 0);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
  };

  const nvScores = evalData?.criteria.map(c => c.self_score) || [];
  const mgrScoresArr = evalData?.criteria.map(c => c.mgr_score) || [];
  const nvAvg = calcAvg(nvScores);
  const mgrAvg = calcAvg(mgrScoresArr);

  // Chuyển criteria sang format EvalCriteriaTable (với scores readonly)
  const criteriaForTable = evalData?.criteria || [];
  const selfScoresMap: Record<number, number> = {};
  const mgrScoresMap: Record<number, number> = {};
  criteriaForTable.forEach((c, i) => {
    selfScoresMap[i] = c.self_score;
    mgrScoresMap[i] = c.mgr_score;
  });

  return (
    <div className="flex min-h-screen bg-[#0a1120] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8 max-w-5xl mx-auto">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl">
              👑
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Phê Duyệt Đánh Giá Nhân Sự</h1>
              <p className="text-sm text-slate-400">Bước 5/6 — CEO phê duyệt hoặc trả về cho Quản lý</p>
            </div>
          </div>
          {/* Workflow breadcrumb */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            {['HR tạo phiếu', 'Quản lý điền việc', 'NV tự đánh giá', 'Quản lý chấm điểm', 'CEO duyệt', 'Kết quả'].map((step, i) => (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                  i === 4 ? 'bg-amber-500 text-white' : i < 4 ? 'bg-green-600/20 text-green-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 4 ? 'bg-white/20' : i < 4 ? 'bg-green-600/30' : 'bg-slate-700'
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
            <Loader2 size={32} className="animate-spin text-amber-400" />
          </div>
        )}

        {evalData && !loading && (
          <div className="space-y-8">
            {/* Thông tin NV */}
            <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-base font-bold text-slate-300 mb-4">📋 Thông Tin Nhân Viên</h2>
              <EvalInfoForm info={evalData.info} />
            </section>

            {/* Tổng điểm tổng quan */}
            <ScoreSummaryBar
              selfScores={selfScoresMap}
              mgrScores={mgrScoresMap}
              total={criteriaForTable.length}
            />

            {/* Bảng tiêu chí + điểm 2 bên — CEO xem readonly */}
            <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-base font-bold text-slate-300 mb-4 flex items-center gap-2">
                📊 Chi Tiết Điểm Từng Tiêu Chí
                <span className="text-xs font-normal text-slate-500">(NV + Quản lý)</span>
              </h2>
              {/* Hiển thị bảng điểm song song */}
              <div className="space-y-2">
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <span className="w-7">#</span>
                  <span>Tiêu chí</span>
                  <span className="w-24 text-center text-blue-400">NV tự chấm</span>
                  <span className="w-28 text-center text-purple-400">QL chấm</span>
                </div>
                {criteriaForTable.map((c, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center bg-slate-900/50 rounded-xl px-4 py-3 border border-slate-700/40">
                    <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center text-slate-400 text-xs font-bold">{i + 1}</div>
                    <div>
                      <div className="text-white font-medium text-sm">{c.name}</div>
                      {c.expectation && <div className="text-slate-500 text-xs mt-0.5">{c.expectation}</div>}
                    </div>
                    <div className="w-24 text-center">
                      <span className="text-2xl font-bold text-blue-400">{c.self_score || '—'}</span>
                      {c.self_score > 0 && <span className="text-slate-500 text-xs">/5</span>}
                    </div>
                    <div className="w-28 text-center">
                      <span className="text-2xl font-bold text-purple-400">{c.mgr_score || '—'}</span>
                      {c.mgr_score > 0 && <span className="text-slate-500 text-xs">/5</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Tổng kết công việc */}
            <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-base font-bold text-slate-300 mb-4">📁 Kết Quả Công Việc NV Báo Cáo</h2>
              <WorkSummaryTable rows={evalData.work_items} readonly={true} />
            </section>

            {/* Đề xuất NV */}
            <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-base font-bold text-slate-300 mb-4">💬 Đề Xuất Của Nhân Viên</h2>
              <EmployeeProposal data={evalData.proposal} readonly={true} />
            </section>

            {/* Panel CEO phê duyệt */}
            <CeoApprovalPanel
              evalId={evalId}
              employeeName={evalData.info.name}
              mgrName={evalData.info.manager_name}
              nvAvg={nvAvg}
              mgrAvg={mgrAvg}
              mgrComment={evalData.mgr_comment}
              mgrDecision={evalData.mgr_decision}
              dashboardPass={pass}
            />
          </div>
        )}
      </main>
    </div>
  );
}
