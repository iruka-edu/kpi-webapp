/**
 * app/evaluation/page.tsx — Trang NV tự đánh giá
 * --------------------------------------------------
 * Vai trò: NV nhận link từ Bot Discord, vào đây để:
 *   1. Xem thông tin chung (HR đã điền — readonly)
 *   2. Xem đầu việc Quản lý đã giao + điền kết quả thực tế
 *   3. Chấm điểm tự đánh giá (1-5) cho từng tiêu chí
 *   4. Bổ sung tiêu chí mới (không xóa được tiêu chí cũ)
 *   5. Điền đề xuất (lương, đào tạo, phản hồi)
 *   6. Submit → Quản lý nhận báo, CC HR
 *
 * Bảo mật: URL có token HMAC-SHA256 (giống /weekly)
 * URL: /evaluation?id=<eval_id>&discord_id=<id>&token=<hmac>
 *
 * Các flow xử lý:
 *  E1 - Loading → Skeleton
 *  E2 - Token hết hạn (403) → màn hình lỗi
 *  E3 - Lỗi API → màn hình lỗi hệ thống
 *  E4 - Nộp thành công → màn hình thành công
 *  E5 - Đã nộp rồi (status SUBMITTED+) → màn hình thông báo
 */

"use client";

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import EvalInfoForm from '@/components/evaluation/EvalInfoForm';
import WorkSummaryTable from '@/components/evaluation/WorkSummaryTable';
import EvalCriteriaTable from '@/components/evaluation/EvalCriteriaTable';
import EmployeeProposal from '@/components/evaluation/EmployeeProposal';
import ScoreSummaryBar from '@/components/evaluation/ScoreSummaryBar';
import SignatureBlock from '@/components/evaluation/SignatureBlock';
import { ClipboardCheck, Loader2, AlertTriangle, Send, CheckCircle, Clock } from 'lucide-react';
import type { EvalInfo } from '@/components/evaluation/EvalInfoForm';
import type { WorkRow } from '@/components/evaluation/WorkSummaryTable';
import type { CriteriaItem } from '@/components/evaluation/EvalCriteriaTable';
import type { ProposalData } from '@/components/evaluation/EmployeeProposal';

type ScreenState = 'loading' | 'form' | 'token_expired' | 'api_error' | 'success' | 'already_submitted';

// ── Toast ─────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl font-medium ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-white/80 hover:text-white font-bold text-lg">×</button>
    </div>
  );
}

// ── Nội dung chính (cần Suspense do useSearchParams) ─────────────
function EvaluationContent() {
  const searchParams = useSearchParams();
  const evalId = searchParams.get('id') || '';
  const discordId = searchParams.get('discord_id') || '';
  const token = searchParams.get('token') || '';

  const [screen, setScreen] = useState<ScreenState>('loading');
  const [evalInfo, setEvalInfo] = useState<EvalInfo | null>(null);
  const [workRows, setWorkRows] = useState<WorkRow[]>([]);
  const [criteria, setCriteria] = useState<CriteriaItem[]>([]);
  const [selfScores, setSelfScores] = useState<Record<number, number>>({});
  const [proposal, setProposal] = useState<ProposalData>({ salary_expectation: '', training_request: '', feedback: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
  }, []);

  // ── Load dữ liệu phiếu ─────────────────────────────────────────
  useEffect(() => {
    if (!evalId) {
      setScreen('api_error');
      return;
    }
    const fetchData = async () => {
      try {
        let url = `/api/evaluation?id=${encodeURIComponent(evalId)}`;
        if (discordId && token) url += `&discord_id=${encodeURIComponent(discordId)}&token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (res.status === 403) { setScreen('token_expired'); return; }
        if (!res.ok || data.error) throw new Error(data.error);

        // Nếu đã nộp rồi → màn hình khác
        if (['SUBMITTED', 'UNDER_REVIEW', 'PENDING_CEO', 'COMPLETED', 'RESULT_SENT', 'ACKNOWLEDGED'].includes(data.status)) {
          setScreen('already_submitted');
          return;
        }

        setEvalInfo(data.info);
        setWorkRows(data.work_items || []);
        setCriteria(data.criteria || []);
        setScreen('form');
      } catch (err: any) {
        console.error(err);
        setScreen('api_error');
      }
    };
    fetchData();
  }, [evalId, discordId, token]);

  // ── Score handlers ─────────────────────────────────────────────
  const handleScoreChange = useCallback((index: number, score: number) => {
    setSelfScores(prev => ({ ...prev, [index]: score }));
  }, []);

  const handleAddCriteria = useCallback((item: CriteriaItem) => {
    setCriteria(prev => [...prev, item]);
    setSelfScores(prev => ({ ...prev, [criteria.length]: 0 }));
  }, [criteria.length]);

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validate: tất cả tiêu chí phải có điểm
    const missingScores = criteria.filter((_, i) => !selfScores[i]);
    if (missingScores.length > 0) {
      showToast(`Vui lòng chấm điểm cho tất cả ${criteria.length} tiêu chí`, 'error');
      return;
    }
    const missingWork = workRows.filter(r => !r.result.trim());
    if (missingWork.length > 0) {
      showToast(`Vui lòng điền kết quả cho tất cả ${workRows.length} mảng công việc`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eval_id: evalId,
          discord_id: discordId,
          token,
          work_summary: workRows,
          criteria_scores: criteria.map((c, i) => ({ ...c, self_score: selfScores[i] || 0 })),
          proposal,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      setScreen('success');
    } catch (err: any) {
      showToast(`Lỗi nộp form: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ══════════════ RENDER CÁC TRẠNG THÁI ══════════════

  if (screen === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a1120]">
        <Loader2 size={40} className="animate-spin text-blue-400" />
      </div>
    );
  }

  if (screen === 'token_expired') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a1120] text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-yellow-400" />
        <h1 className="text-2xl font-bold text-white">Link Đã Hết Hạn</h1>
        <p className="text-slate-400 max-w-md">
          Link đánh giá chỉ có hiệu lực trong 72 giờ. Vui lòng liên hệ HR hoặc Quản lý để nhận link mới.
        </p>
      </div>
    );
  }

  if (screen === 'api_error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a1120] text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-red-400" />
        <h1 className="text-2xl font-bold text-white">Lỗi Tải Phiếu Đánh Giá</h1>
        <p className="text-slate-400 max-w-md">Không thể tải phiếu. Vui lòng thử lại hoặc liên hệ HR.</p>
      </div>
    );
  }

  if (screen === 'already_submitted') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a1120] text-center space-y-4 p-8">
        <Clock size={56} className="text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Đã Nộp Thành Công</h1>
        <p className="text-slate-400 max-w-md">
          Bạn đã nộp phiếu tự đánh giá. Đang chờ Quản lý xem xét và chấm điểm.
        </p>
      </div>
    );
  }

  if (screen === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a1120] text-center space-y-4 p-8">
        <CheckCircle size={64} className="text-green-400" />
        <h1 className="text-2xl font-bold text-white">Đã Nộp Thành Công!</h1>
        <p className="text-slate-400 max-w-md">
          Phiếu tự đánh giá đã được gửi cho Quản lý. HR cũng đã được CC thông báo.
          Bạn sẽ nhận kết quả qua Discord sau khi Quản lý và CEO hoàn tất duyệt.
        </p>
      </div>
    );
  }

  // ══════════════ FORM CHÍNH ══════════════
  return (
    <div className="flex min-h-screen bg-[#0a1120] text-slate-100 font-sans">
      <Sidebar />
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <main className="flex-1 p-8 space-y-8 max-w-5xl mx-auto">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <ClipboardCheck size={22} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Phiếu Tự Đánh Giá Thử Việc</h1>
              <p className="text-sm text-slate-400">Bước 3/6 — Nhân viên tự đánh giá kết quả làm việc</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            {['HR tạo phiếu', 'Quản lý điền việc', 'NV tự đánh giá', 'Quản lý chấm điểm', 'CEO duyệt', 'Kết quả'].map((step, i) => (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                  i === 2 ? 'bg-blue-600 text-white' : i < 2 ? 'bg-green-600/20 text-green-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 2 ? 'bg-white/20' : i < 2 ? 'bg-green-600/30' : 'bg-slate-700'
                  }`}>{i + 1}</span>
                  {step}
                </div>
                {i < 5 && <span className="text-slate-600 shrink-0">›</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* PHẦN 1: Thông tin chung */}
        {evalInfo && (
          <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold">1</span>
              Thông Tin Chung
            </h2>
            <EvalInfoForm info={evalInfo} />
          </section>
        )}

        {/* PHẦN 2: Tổng kết công việc — NV điền kết quả */}
        <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold">2</span>
            Tổng Kết Công Việc
            <span className="text-xs font-normal text-slate-400 ml-1">— Điền kết quả thực tế bạn đã làm được</span>
          </h2>
          <WorkSummaryTable
            rows={workRows}
            onChange={setWorkRows}
            readonly={false}
          />
        </section>

        {/* PHẦN 3: Điểm tự đánh giá */}
        <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center text-xs font-bold">3</span>
            Tự Đánh Giá Năng Lực
            <span className="text-xs font-normal text-slate-400 ml-1">— Chấm điểm 1-5 cho từng tiêu chí</span>
          </h2>
          <EvalCriteriaTable
            criteria={criteria}
            scores={selfScores}
            onScoreChange={handleScoreChange}
            onAddCriteria={handleAddCriteria}
            readonly={false}
          />
        </section>

        {/* Điểm tổng tự động */}
        {criteria.length > 0 && (
          <ScoreSummaryBar
            selfScores={selfScores}
            total={criteria.length}
          />
        )}

        {/* PHẦN 4: Đề xuất của NV */}
        <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-yellow-600 flex items-center justify-center text-xs font-bold">4</span>
            Đề Xuất Của Nhân Viên
          </h2>
          <EmployeeProposal data={proposal} onChange={setProposal} readonly={false} />
        </section>

        {/* PHẦN 5: Ký xác nhận */}
        <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-green-600 flex items-center justify-center text-xs font-bold">5</span>
            Xác Nhận & Nộp
          </h2>
          <div className="flex gap-6 justify-center flex-wrap">
            <SignatureBlock
              role="Nhân Viên"
              name={evalInfo?.name || 'Nhân viên'}
              signed={false}
              canSign={true}
              onSign={handleSubmit}
            />
            <SignatureBlock
              role="Quản Lý Trực Tiếp"
              name={evalInfo?.manager_name || 'Quản lý'}
              signed={false}
              canSign={false}
            />
          </div>
        </section>

        {/* Nút Submit dự phòng */}
        <div className="flex justify-end pb-8">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/20"
          >
            {submitting ? (
              <><Loader2 size={18} className="animate-spin" /> Đang nộp...</>
            ) : (
              <><Send size={18} /> Nộp Phiếu Tự Đánh Giá</>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

// ── Wrapper Suspense (do useSearchParams yêu cầu) ─────────────────
export default function EvaluationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#0a1120]">
        <Loader2 size={40} className="animate-spin text-blue-400" />
      </div>
    }>
      <EvaluationContent />
    </Suspense>
  );
}
