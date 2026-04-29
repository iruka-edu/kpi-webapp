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
    <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-amber-100 shadow-sm">
            👑
          </div>
          <h1 className="text-xl font-bold text-slate-800">CEO — Phê Duyệt Đánh Giá</h1>
          <p className="text-slate-500 text-sm">Xác thực để xem và phê duyệt phiếu đánh giá nhân sự</p>
        </div>
        {err && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-600 text-sm">{err}</div>}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Mật khẩu Dashboard</label>
          <input
            type="password"
            value={pass}
            onChange={e => { setPass(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && (pass ? onLogin(pass) : setErr('Nhập mật khẩu'))}
            placeholder="••••••••"
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
          />
        </div>
        <button
          onClick={() => pass ? onLogin(pass) : setErr('Nhập mật khẩu')}
          className="w-full py-3 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 border-b-[4px] border-amber-600 active:border-b-[0px] active:translate-y-[4px] text-white font-bold rounded-xl transition-all shadow-md"
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-red-500" />
        <h1 className="text-xl font-bold text-slate-900">Không thể tải phiếu</h1>
        <p className="text-slate-500">{error}</p>
        <button
          onClick={() => { setError(''); setPass(''); }}
          className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-sm font-medium transition-colors"
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
    <div className="w-full min-h-screen bg-[#f0f4f8] font-sans">
      {/* Sticky header nav */}
      <div className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-sm px-6 flex items-center h-16 gap-4">
        <div className="flex items-center gap-3 pr-8 border-r border-slate-200">
          <span className="text-xl">👑</span>
          <span className="font-bold text-lg text-slate-800 tracking-tight">IruKa<span className="text-blue-600">Life</span></span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-[#1e3a5f] text-[15px]">CEO Phê Duyệt Đánh Giá</span>
          <span className="text-xs text-slate-400">Bước 5/6 — CEO phê duyệt hoặc trả về cho Quản lý</span>
        </div>
        <div className="ml-auto flex items-center gap-2 overflow-x-auto">
          {['HR tạo phiếu', 'Quản lý điền việc', 'NV tự đánh giá', 'Quản lý chấm điểm', 'CEO duyệt', 'Kết quả'].map((step, i) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border ${
                i === 4 ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' :
                i < 4 ? 'bg-green-50 text-green-700 border-green-200' :
                'bg-white text-slate-400 border-slate-200'
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i === 4 ? 'bg-amber-500 text-white' :
                  i < 4 ? 'bg-green-600 text-white' :
                  'bg-slate-200 text-slate-500'
                }`}>{i + 1}</span>
                {step}
              </div>
              {i < 5 && <span className="text-slate-300 shrink-0">›</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-amber-500" />
          </div>
        )}

        {evalData && !loading && (
          <div className="space-y-6">
            {/* 1. Thông tin NV */}
            <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
              <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
                <span className="text-xl">📋</span>
                <span className="font-black text-[#1e3a5f] uppercase tracking-wide">1. Thông Tin Nhân Viên</span>
              </div>
              <div className="p-5">
                <EvalInfoForm info={evalData.info} />
              </div>
            </div>

            {/* Tổng điểm tổng quan */}
            <ScoreSummaryBar
              selfScores={selfScoresMap}
              mgrScores={mgrScoresMap}
              total={criteriaForTable.length}
            />

            {/* 2. Bảng tiêu chí + điểm 2 bên — CEO xem readonly */}
            <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
              <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
                <span className="text-xl">📊</span>
                <span className="font-black text-[#1e3a5f] uppercase tracking-wide">2. Chi Tiết Điểm Từng Tiêu Chí</span>
                <span className="font-medium text-[#6b7280] ml-2">(NV + Quản lý)</span>
              </div>
              
              {/* Hiển thị bảng điểm song song */}
              <div className="p-5 space-y-2 bg-[#f8fafc]">
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 text-xs font-bold text-[#6b7280] uppercase tracking-wide">
                  <span className="w-7">#</span>
                  <span>Tiêu chí</span>
                  <span className="w-24 text-center text-blue-600">NV tự chấm</span>
                  <span className="w-28 text-center text-purple-600">QL chấm</span>
                </div>
                {criteriaForTable.map((c, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center bg-white rounded-xl px-4 py-3 border border-[#d1d5db] shadow-sm">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[#1e3a5f] text-xs font-bold">{i + 1}</div>
                    <div>
                      <div className="text-[#1e3a5f] font-bold text-sm">{c.name}</div>
                      {c.expectation && <div className="text-slate-500 text-xs mt-0.5">{c.expectation}</div>}
                    </div>
                    <div className="w-24 text-center">
                      <span className="text-2xl font-black text-blue-600">{c.self_score || '—'}</span>
                      {c.self_score > 0 && <span className="text-slate-400 font-bold text-xs">/5</span>}
                    </div>
                    <div className="w-28 text-center">
                      <span className="text-2xl font-black text-purple-600">{c.mgr_score || '—'}</span>
                      {c.mgr_score > 0 && <span className="text-slate-400 font-bold text-xs">/5</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Tổng kết công việc */}
            <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
              <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
                <span className="text-xl">🗂️</span>
                <span className="font-black text-[#1e3a5f] uppercase tracking-wide">3. Kết Quả Công Việc NV Báo Cáo</span>
              </div>
              <div className="overflow-x-auto">
                <WorkSummaryTable rows={evalData.work_items} readonly={true} />
              </div>
            </div>

            {/* 4. Đề xuất NV */}
            <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
              <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
                <span className="text-xl">💬</span>
                <span className="font-black text-[#1e3a5f] uppercase tracking-wide">4. Đề Xuất Của Nhân Viên</span>
              </div>
              <div className="p-5">
                <EmployeeProposal data={evalData.proposal} readonly={true} />
              </div>
            </div>

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
