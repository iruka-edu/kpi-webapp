"use client";

/**
 * MgrScorePanel.tsx — Panel Quản lý chấm điểm & nhận xét
 * ----------------------------------------------------------
 * Vai trò: Quản lý xem kết quả tự đánh giá của NV (readonly),
 *          chấm điểm của mình cho từng tiêu chí,
 *          ghi nhận xét tổng thể, chọn đề xuất, rồi gửi CEO.
 *
 * Luồng:
 *  1. Hiển thị điểm NV tự chấm (bên trái, readonly)
 *  2. QL chấm điểm của mình (bên phải, 1-5)
 *  3. QL điền nhận xét tổng thể
 *  4. QL chọn đề xuất: Tiếp nhận / Gia hạn thử việc / Chấm dứt
 *  5. Submit → POST /api/evaluation/mgr-review → Bot gửi CEO + CC HR
 *
 * Props:
 *  evalId          — ID phiếu
 *  criteria        — Danh sách tiêu chí + điểm NV đã chấm
 *  dashboardPass   — Mật khẩu Dashboard để gọi API
 *  employeeName    — Tên NV để hiển thị
 */

import React, { useState } from 'react';
import { Send, Loader2, CheckCircle, MessageSquare, Star } from 'lucide-react';
import type { CriteriaItem } from './EvalCriteriaTable';

// Các lựa chọn quyết định của Quản lý
const DECISIONS = [
  { value: 'hire', label: '✅ Tiếp nhận chính thức', color: 'border-green-500 bg-green-500/10 text-green-400' },
  { value: 'extend', label: '⏳ Gia hạn thử việc', color: 'border-yellow-500 bg-yellow-500/10 text-yellow-400' },
  { value: 'reject', label: '❌ Chấm dứt thử việc', color: 'border-red-500 bg-red-500/10 text-red-400' },
];

interface CriteriaWithScore extends CriteriaItem {
  self_score: number; // Điểm NV đã chấm
}

interface MgrScorePanelProps {
  evalId: string;
  employeeName: string;
  criteria: CriteriaWithScore[];
  dashboardPass: string;
}

export default function MgrScorePanel({ evalId, employeeName, criteria, dashboardPass }: MgrScorePanelProps) {
  // Điểm QL chấm { criteriaIndex: score }
  const [mgrScores, setMgrScores] = useState<Record<number, number>>({});
  const [comment, setComment] = useState('');
  const [decision, setDecision] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Tính điểm trung bình
  const calcAvg = (scores: Record<number, number>) => {
    const vals = Object.values(scores).filter(v => v > 0);
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };

  const nvAvg = calcAvg(Object.fromEntries(criteria.map((c, i) => [i, c.self_score])));
  const mgrAvg = calcAvg(mgrScores);
  const combinedAvg = mgrAvg > 0 ? (nvAvg + mgrAvg) / 2 : nvAvg;

  const getVerdictColor = (avg: number) => {
    if (avg >= 4.5) return 'text-green-400';
    if (avg >= 3.5) return 'text-blue-400';
    if (avg >= 2.5) return 'text-yellow-400';
    return 'text-red-400';
  };
  const getVerdictLabel = (avg: number) => {
    if (avg >= 4.5) return 'Xuất sắc';
    if (avg >= 3.5) return 'Tốt';
    if (avg >= 2.5) return 'Đạt yêu cầu';
    return 'Cần cải thiện';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: phải chấm đủ tất cả tiêu chí
    const missingScores = criteria.filter((_, i) => !mgrScores[i]);
    if (missingScores.length > 0) {
      setStatus('error');
      setErrorMsg(`Vui lòng chấm điểm cho tất cả ${criteria.length} tiêu chí`);
      return;
    }
    if (!decision) {
      setStatus('error');
      setErrorMsg('Vui lòng chọn đề xuất quyết định');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/evaluation/mgr-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-auth': dashboardPass,
        },
        body: JSON.stringify({
          eval_id: evalId,
          mgr_scores: criteria.map((c, i) => ({
            name: c.name,
            self_score: c.self_score,
            mgr_score: mgrScores[i] || 0,
          })),
          mgr_comment: comment,
          mgr_decision: decision,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Lỗi gửi');

      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  // ── Màn hình thành công ───────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <CheckCircle size={64} className="text-green-400" />
        <h2 className="text-2xl font-bold text-white">Đã gửi cho CEO duyệt!</h2>
        <p className="text-slate-400 max-w-md">
          Phiếu đánh giá <strong className="text-white">{employeeName}</strong> đã được gửi lên CEO.
          HR đã được CC thông báo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── PHẦN 1: BẢNG CHẤM ĐIỂM ── */}
      <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-sm font-bold">1</span>
          Chấm Điểm Từng Tiêu Chí
        </h2>
        <p className="text-xs text-slate-500 mb-5 ml-9">
          Cột <span className="text-blue-400 font-medium">NV tự chấm</span> chỉ để tham khảo —
          Điền cột <span className="text-purple-400 font-medium">Điểm QL</span> theo đánh giá của bạn
        </p>

        {/* Header cột */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
          <span className="w-7">#</span>
          <span>Tiêu chí</span>
          <span className="w-28 text-center">NV tự chấm</span>
          <span className="w-36 text-center">Điểm QL (1-5)</span>
        </div>

        <div className="space-y-2">
          {criteria.map((c, i) => (
            <div
              key={i}
              className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center bg-slate-900/50 rounded-xl px-4 py-3 border border-slate-700/40 hover:border-slate-600/50 transition-colors"
            >
              {/* STT */}
              <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                {i + 1}
              </div>

              {/* Tiêu chí + kỳ vọng */}
              <div>
                <div className="text-white font-medium text-sm">{c.name}</div>
                {c.expectation && (
                  <div className="text-slate-500 text-xs mt-0.5 leading-relaxed">{c.expectation}</div>
                )}
              </div>

              {/* Điểm NV (readonly) */}
              <div className="w-28 flex flex-col items-center gap-0.5 shrink-0">
                <div className="text-2xl font-bold text-blue-400">
                  {c.self_score > 0 ? c.self_score : '—'}
                </div>
                {c.self_score > 0 && <div className="text-xs text-slate-500">/5</div>}
              </div>

              {/* Điểm QL — Click chọn */}
              <div className="w-36 flex gap-1 justify-center shrink-0">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMgrScores(prev => ({ ...prev, [i]: n }))}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-all duration-150 ${
                      mgrScores[i] === n
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-110'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TỔNG ĐIỂM TỰ ĐỘNG ── */}
      {Object.keys(mgrScores).length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'TB NV tự chấm', avg: nvAvg, color: 'text-blue-400' },
            { label: 'TB Quản lý chấm', avg: mgrAvg, color: 'text-purple-400' },
            { label: 'Bình quân chung', avg: combinedAvg, color: getVerdictColor(combinedAvg) },
          ].map(({ label, avg, color }) => (
            <div key={label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 text-center">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-3xl font-bold ${color}`}>
                {avg > 0 ? avg.toFixed(1) : '—'}
              </div>
              {label === 'Bình quân chung' && avg > 0 && (
                <div className={`text-sm font-semibold mt-1 ${color}`}>{getVerdictLabel(avg)}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── PHẦN 2: NHẬN XÉT TỔNG THỂ ── */}
      <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">2</span>
          Nhận Xét Tổng Thể
          <MessageSquare size={16} className="text-slate-500" />
        </h2>
        <textarea
          rows={5}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Nhận xét về thái độ, tinh thần làm việc, điểm mạnh, điểm cần cải thiện, lý do đề xuất..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition"
        />
      </section>

      {/* ── PHẦN 3: ĐỀ XUẤT QUYẾT ĐỊNH ── */}
      <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center text-sm font-bold">3</span>
          Đề Xuất Quyết Định
          <Star size={16} className="text-slate-500" />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {DECISIONS.map(d => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDecision(d.value)}
              className={`p-4 rounded-xl border-2 text-center font-semibold transition-all duration-200 ${
                decision === d.value
                  ? d.color + ' scale-[1.02] shadow-lg'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600 bg-slate-900/50'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── LỖI ── */}
      {status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-red-400 text-sm">
          ❌ {errorMsg}
        </div>
      )}

      {/* ── SUBMIT ── */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-purple-600/20"
        >
          {status === 'submitting' ? (
            <><Loader2 size={18} className="animate-spin" /> Đang gửi CEO...</>
          ) : (
            <><Send size={18} /> Gửi Lên CEO Duyệt</>
          )}
        </button>
      </div>
    </form>
  );
}
