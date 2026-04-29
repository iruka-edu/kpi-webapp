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
    <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl font-medium ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
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
  // is_ceo_direct=1 khi Quản lý trực tiếp là CEO (luồng rút gọn)
  const isCeoDirect = searchParams.get('is_ceo_direct') === '1';

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
        const workItems: WorkRow[] = data.work_items || [];
        // Khi luồng rút gọn (MGR=CEO) mà HR chưa điền sẵn → tạo 1 dòng trống để NV bắt đầu
        setWorkRows(isCeoDirect && workItems.length === 0
          ? [{ stt: 1, area: '', detail: '', result: '' } as WorkRow]
          : workItems
        );
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
    if (isCeoDirect && workRows.length === 0) {
      showToast('Vui lòng thêm ít nhất 1 công việc đã làm', 'error');
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
      <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
        <Loader2 size={40} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (screen === 'token_expired') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-amber-500" />
        <h1 className="text-2xl font-bold text-slate-900">Link Đã Hết Hạn</h1>
        <p className="text-slate-500 max-w-md">
          Link đánh giá chỉ có hiệu lực trong 72 giờ. Vui lòng liên hệ HR hoặc Quản lý để nhận link mới.
        </p>
      </div>
    );
  }

  if (screen === 'api_error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-red-500" />
        <h1 className="text-2xl font-bold text-slate-900">Lỗi Tải Phiếu Đánh Giá</h1>
        <p className="text-slate-500 max-w-md">Không thể tải phiếu. Vui lòng thử lại hoặc liên hệ HR.</p>
      </div>
    );
  }

  if (screen === 'already_submitted') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center space-y-4 p-8">
        <Clock size={56} className="text-blue-500" />
        <h1 className="text-2xl font-bold text-slate-900">Đã Nộp Thành Công</h1>
        <p className="text-slate-500 max-w-md">
          Bạn đã nộp phiếu tự đánh giá. Đang chờ Quản lý xem xét và chấm điểm.
        </p>
      </div>
    );
  }

  if (screen === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center space-y-4 p-8">
        <CheckCircle size={64} className="text-green-600" />
        <h1 className="text-2xl font-bold text-slate-900">Đã Nộp Thành Công!</h1>
        <p className="text-slate-500 max-w-md">
          {isCeoDirect
            ? 'Phiếu tự đánh giá đã được gửi cho CEO xem xét. Bạn sẽ nhận kết quả qua Discord sau khi CEO phê duyệt.'
            : 'Phiếu tự đánh giá đã được gửi cho Quản lý. HR cũng đã được CC thông báo. Bạn sẽ nhận kết quả sau khi Quản lý và CEO hoàn tất duyệt.'}
        </p>
      </div>
    );
  }

  // ══════════════ FORM CHÍNH ══════════════
  return (
    <div className="w-full">
      {/* ── TAB NAV ─── */}
      <div className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-sm px-6 flex items-stretch h-16">
        <div className="flex items-center gap-3 pr-8 border-r border-slate-200">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-md shadow-blue-500/20">
            <img src="/logo-iruka.svg" alt="IruKa Logo" className="object-contain" />
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">IruKa<span className="text-blue-600">Life</span></span>
        </div>
        <div className="flex px-4 items-center font-semibold text-[15px] border-b-[3px] border-blue-600 text-blue-700 bg-blue-50/50 cursor-default">
          📝 Tự Đánh Giá
        </div>
        <div className="flex px-4 items-center font-medium text-[15px] border-b-[3px] border-transparent text-slate-400 cursor-not-allowed">
          📊 Quản Lý Đánh Giá
        </div>
        <div className="flex px-4 items-center font-medium text-[15px] border-b-[3px] border-transparent text-slate-400 cursor-not-allowed">
          🎯 CEO Phê Duyệt
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <main className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-6 pb-32">

        {/* Header Content */}
        <div className="flex items-start justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Phiếu Tự Đánh Giá Thử Việc</h1>
            <p className="text-sm text-slate-500 mt-1">Vui lòng điền đầy đủ thông tin thực tế công việc đã làm và tự đánh giá năng lực của mình.</p>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {/* Luồng rút gọn (MGR=CEO) bỏ bước QL điền */}
            {(isCeoDirect
              ? ['HR tạo', 'NV đánh giá', 'CEO duyệt']
              : ['HR tạo', 'QL điền', 'NV đánh giá', 'QL chấm', 'CEO duyệt']
            ).map((step, i, arr) => (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap border ${(isCeoDirect ? i === 1 : i === 2) ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' :
                    (isCeoDirect ? i < 1 : i < 2) ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-white text-slate-400 border-slate-200'
                  }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${(isCeoDirect ? i === 1 : i === 2) ? 'bg-blue-600 text-white' :
                      (isCeoDirect ? i < 1 : i < 2) ? 'bg-green-600 text-white' :
                        'bg-slate-200 text-slate-500'
                    }`}>{i + 1}</span>
                  {step}
                </div>
                {i < arr.length - 1 && <span className="text-slate-300">›</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* PHẦN 1: Thông tin chung */}
        {evalInfo && (
          <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
            <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
              <span className="text-xl">📋</span>
              <span className="font-black text-[#1e3a5f] uppercase tracking-wide">1. Thông Tin Chung</span>
              <span className="font-medium text-[#6b7280] ml-2">(HR đã điền — chỉ xem)</span>
            </div>
            <div className="p-5">
              <EvalInfoForm info={evalInfo} />
            </div>
          </div>
        )}

        {/* PHẦN 2: Tổng kết công việc — NV điền kết quả */}
        <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
          <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
            <span className="text-xl">🗂️</span>
            <span className="font-black text-[#1e3a5f] uppercase tracking-wide">2. Tổng Kết Công Việc Thời Gian Thử Việc</span>
            <span className="font-medium text-[#6b7280] ml-2">
              {isCeoDirect ? '(Nhân viên tự điền công việc + kết quả thực tế)' : '(Quản lý đã điền — Nhân viên điền kết quả thực tế vào cột cuối)'}
            </span>
          </div>
          <div className="overflow-x-auto">
            {isCeoDirect && (
              <div className="px-5 pt-3 pb-0">
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-2 mb-3">
                  <span>ℹ️</span>
                  {workRows.some(r => (r as any).detail?.trim())
                    ? 'HR đã điền sẵn danh sách công việc — bạn điền kết quả thực tế vào cột cuối.'
                    : 'Quản lý trực tiếp của bạn là CEO — bạn cần tự điền công việc đã làm trong thời gian thử việc.'}
                </p>
              </div>
            )}
            <WorkSummaryTable
              rows={workRows}
              onChange={setWorkRows}
              readonly={false}
            />
          </div>
        </div>

        {/* PHẦN 3: Điểm tự đánh giá */}
        <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
          <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-black text-[#1e3a5f] uppercase tracking-wide">3. Đánh Giá Năng Lực (Tiêu Chí Mẫu)</span>
            <span className="font-medium text-[#6b7280] ml-2">(HR & Quản lý điền sẵn tiêu chí — Nhân viên chấm điểm 1–5)</span>
          </div>
          <div className="overflow-x-auto">
            <EvalCriteriaTable
              criteria={criteria}
              scores={selfScores}
              onScoreChange={handleScoreChange}
              onAddCriteria={handleAddCriteria}
              readonly={false}
            />
          </div>
        </div>

        {/* Điểm tổng tự động */}
        {criteria.length > 0 && (
          <ScoreSummaryBar
            selfScores={selfScores}
            total={criteria.length}
          />
        )}

        {/* PHẦN 4: Đề xuất của NV */}
        <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
          <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
            <span className="text-xl">💡</span>
            <span className="font-black text-[#1e3a5f] uppercase tracking-wide">4. Nhân Viên Tự Đề Xuất</span>
            <span className="font-medium text-[#6b7280] ml-2">(Điền theo ý kiến cá nhân)</span>
          </div>
          <div className="p-5">
            <EmployeeProposal data={proposal} onChange={setProposal} readonly={false} />
          </div>
        </div>

        {/* PHẦN 5: Ký xác nhận */}
        <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
          <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
            <span className="text-xl">✅</span>
            <span className="font-black text-[#1e3a5f] uppercase tracking-wide">5. Ký Xác Nhận</span>
          </div>
          <div className="p-5">
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
          </div>
        </div>

        {/* Nút Submit dự phòng */}
        <div className="flex justify-end pb-8">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-br from-[#3b82f6] to-[#1e3a5f] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-[10px] transition-all shadow-lg border-b-[4px] border-[#1e3a5f] hover:scale-[1.02] active:scale-[0.98]"
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
      <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
        <Loader2 size={40} className="animate-spin text-blue-600" />
      </div>
    }>
      <EvaluationContent />
    </Suspense>
  );
}
