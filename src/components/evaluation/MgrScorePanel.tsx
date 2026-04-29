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
  /** Discord ID của Quản lý — dùng để verify HMAC token */
  discordId: string;
  /** HMAC token 72h từ link DM Bot Discord */
  token: string;
}

export default function MgrScorePanel({ evalId, employeeName, criteria, discordId, token }: MgrScorePanelProps) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eval_id: evalId,
          discord_id: discordId,
          token,
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
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <CheckCircle size={64} className="text-[#16a34a]" />
        <h2 className="text-2xl font-bold text-[#1e3a5f]">Đã gửi cho CEO duyệt!</h2>
        <p className="text-[#6b7280] max-w-md">
          Phiếu đánh giá <strong className="text-[#1e3a5f]">{employeeName}</strong> đã được gửi lên CEO.
          HR đã được CC thông báo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">

      {/* ── PHẦN 1: BẢNG CHẤM ĐIỂM ── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
        <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="font-black text-[#1e3a5f] uppercase tracking-wide">1. Chấm Điểm Từng Tiêu Chí</span>
          <span className="font-medium text-[#6b7280] ml-2">(Cột NV tự chấm chỉ để tham khảo)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] w-[40px] text-center">#</th>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] text-left min-w-[240px]">Tiêu chí</th>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] w-[110px] text-center opacity-70">NV tự chấm</th>
                <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] w-[180px] text-center">Điểm QL (1–5)</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c, i) => (
                <tr key={i} className="hover:bg-[#eff6ff] transition-colors">
                  <td className="border border-[#d1d5db] p-[8px] text-center font-bold text-[#6b7280] w-[40px]">{i + 1}</td>
                  <td className="border border-[#d1d5db] p-[10px]">
                    <div className="font-bold text-[#111] text-sm">{c.name}</div>
                    {c.expectation && (
                      <div className="text-[#6b7280] text-xs mt-0.5 leading-relaxed">{c.expectation}</div>
                    )}
                  </td>
                  <td className="border border-[#d1d5db] p-[8px] text-center bg-[#f9fafb]">
                    <span className="text-2xl font-bold text-[#3b82f6]">
                      {c.self_score > 0 ? c.self_score : '—'}
                    </span>
                    {c.self_score > 0 && <div className="text-xs text-[#9ca3af]">/5</div>}
                  </td>
                  <td className="border border-[#d1d5db] p-[8px]">
                    <div className="flex gap-1 justify-center">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setMgrScores(prev => ({ ...prev, [i]: n }))}
                          className={`w-8 h-8 rounded-lg text-sm font-bold border-2 transition-all duration-150 ${
                            mgrScores[i] === n
                              ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] scale-110 shadow'
                              : 'bg-white text-[#6b7280] border-[#d1d5db] hover:border-[#3b82f6] hover:text-[#3b82f6]'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TỔNG ĐIỂM TỰ ĐỘNG ── */}
      {Object.keys(mgrScores).length > 0 && (
        <div className="rounded-xl p-[24px_32px] flex flex-wrap items-center gap-6"
          style={{ background: 'linear-gradient(135deg,#fffbeb,#fef9c3)', border: '2px solid #fbbf24' }}>
          {[
            { label: 'TB NV tự chấm', avg: nvAvg, color: '#3b82f6' },
            { label: 'TB Quản lý chấm', avg: mgrAvg, color: '#7c3aed' },
            { label: 'Bình quân chung', avg: combinedAvg, color: '#b45309' },
          ].map(({ label, avg, color }) => (
            <div key={label} className="text-center">
              <div className="text-sm font-bold uppercase tracking-[0.06em] text-[#6b7280] mb-1">{label}</div>
              <div className="text-[40px] font-black leading-none" style={{ color }}>
                {avg > 0 ? avg.toFixed(1) : '—'}
              </div>
              {label === 'Bình quân chung' && avg > 0 && (
                <div className="text-sm font-semibold mt-1" style={{ color }}>{getVerdictLabel(avg)}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── PHẦN 2: NHẬN XÉT TỔNG THỂ ── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
        <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
          <span className="text-xl">💬</span>
          <span className="font-black text-[#1e3a5f] uppercase tracking-wide">2. Nhận Xét Tổng Thể</span>
        </div>
        <div className="p-5">
          <textarea
            rows={5}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Nhận xét về thái độ, tinh thần làm việc, điểm mạnh, điểm cần cải thiện, lý do đề xuất..."
            className="w-full font-sans border-[1.5px] border-[#d1d5db] rounded-[6px] px-[10px] py-[8px] outline-none text-[#111] bg-white focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 transition-all resize-y min-h-[100px]"
          />
        </div>
      </div>

      {/* ── PHẦN 3: ĐỀ XUẤT QUYẾT ĐỊNH ── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
        <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
          <span className="text-xl">⚖️</span>
          <span className="font-black text-[#1e3a5f] uppercase tracking-wide">3. Đề Xuất Quyết Định</span>
          <span className="text-[#dc2626] font-bold">*</span>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-[10px]">
            {DECISIONS.map(d => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDecision(d.value)}
                className={`flex items-center gap-2 border-2 rounded-[8px] p-[10px_20px] font-semibold transition-all duration-200 ${
                  decision === d.value
                    ? 'border-[#1e3a5f] bg-[rgba(30,58,95,0.08)] text-[#1e3a5f] scale-[1.02] shadow'
                    : 'border-[#d1d5db] text-[#374151] hover:border-[#1e3a5f] hover:bg-[rgba(30,58,95,0.04)]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── LỖI ── */}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-base font-medium">
          {errorMsg}
        </div>
      )}

      {/* ── SUBMIT ── */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-br from-[#3b82f6] to-[#1e3a5f] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-[10px] transition-all shadow-lg border-b-[4px] border-[#1e3a5f] hover:scale-[1.02] active:scale-[0.98]"
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
