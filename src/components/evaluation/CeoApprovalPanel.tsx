"use client";

/**
 * CeoApprovalPanel.tsx — Panel CEO phê duyệt phiếu đánh giá
 * -----------------------------------------------------------
 * Vai trò: CEO xem toàn bộ phiếu (summary), xem điểm NV + QL,
 *          đọc nhận xét và đề xuất của Quản lý,
 *          rồi phê duyệt hoặc trả về để QL xem lại.
 *
 * Luồng:
 *  Approve → COMPLETED → Bot gửi QL (CC HR)
 *  Return  → UNDER_REVIEW → Bot báo QL xem lại (CC HR)
 *
 * Props:
 *  evalId        — ID phiếu
 *  employeeName  — Tên NV
 *  mgrName       — Tên QL
 *  nvAvg         — Điểm TB NV
 *  mgrAvg        — Điểm TB QL
 *  mgrComment    — Nhận xét của QL
 *  mgrDecision   — Đề xuất của QL (hire/extend/reject)
 *  dashboardPass — Mật khẩu Dashboard
 */

import React, { useState } from 'react';
import { ThumbsUp, RotateCcw, Loader2, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react';

interface CeoApprovalPanelProps {
  evalId: string;
  employeeName: string;
  mgrName: string;
  nvAvg: number;
  mgrAvg: number;
  mgrComment: string;
  mgrDecision: string;
  dashboardPass: string;
}

const DECISION_LABEL: Record<string, string> = {
  hire: '✅ Tiếp nhận chính thức',
  extend: '⏳ Gia hạn thử việc',
  reject: '❌ Chấm dứt thử việc',
};

const DECISION_COLOR: Record<string, string> = {
  hire: 'text-green-400 bg-green-500/10 border-green-500/30',
  extend: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  reject: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export default function CeoApprovalPanel({
  evalId, employeeName, mgrName,
  nvAvg, mgrAvg, mgrComment, mgrDecision, dashboardPass
}: CeoApprovalPanelProps) {
  const [ceoComment, setCeoComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'approved' | 'returned' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const combinedAvg = (nvAvg + mgrAvg) / 2;

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

  const submit = async (action: 'approve' | 'return') => {
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/evaluation/ceo-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-auth': dashboardPass,
        },
        body: JSON.stringify({
          eval_id: evalId,
          ceo_action: action,
          ceo_comment: ceoComment,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Lỗi phê duyệt');

      setStatus(action === 'approve' ? 'approved' : 'returned');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  // ── Màn hình sau khi duyệt ────────────────────────────────────────
  if (status === 'approved') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <CheckCircle size={64} className="text-[#16a34a]" />
        <h2 className="text-2xl font-bold text-[#1e3a5f]">Đã Phê Duyệt!</h2>
        <p className="text-[#6b7280] max-w-md">
          Kết quả đánh giá <strong className="text-[#1e3a5f]">{employeeName}</strong> đã gửi về cho Quản lý.
          HR đã được CC thông báo.
        </p>
      </div>
    );
  }

  if (status === 'returned') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <RotateCcw size={64} className="text-[#f97316]" />
        <h2 className="text-2xl font-bold text-[#1e3a5f]">Đã Trả Về Quản Lý</h2>
        <p className="text-[#6b7280] max-w-md">
          Phiếu đã được trả về <strong className="text-[#1e3a5f]">{mgrName}</strong> để xem lại.
          HR đã được CC thông báo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">

      {/* ── TÓM TẮT ĐIỂM ── */}
      <div className="rounded-xl p-[24px_32px] flex flex-wrap items-center gap-6"
        style={{ background: 'linear-gradient(135deg,#fffbeb,#fef9c3)', border: '2px solid #fbbf24' }}>
        <div className="flex-1">
          <div className="text-sm font-bold uppercase tracking-[0.06em] text-[#6b7280] mb-2">📊 Tổng Quan Điểm Đánh Giá</div>
          <div className="flex flex-wrap gap-8">
            {[
              { label: 'TB NV tự chấm', avg: nvAvg, color: '#3b82f6', sub: 'Nhân viên' },
              { label: 'TB Quản lý chấm', avg: mgrAvg, color: '#7c3aed', sub: mgrName },
              { label: 'Bình quân chung', avg: combinedAvg, color: '#b45309', sub: getVerdictLabel(combinedAvg) },
            ].map(({ label, avg, color, sub }) => (
              <div key={label} className="text-center">
                <div className="text-xs font-bold uppercase tracking-wide text-[#6b7280] mb-0.5">{label}</div>
                <div className="text-[40px] font-black leading-none" style={{ color }}>
                  {avg > 0 ? avg.toFixed(1) : '—'}
                </div>
                <div className="text-sm font-medium mt-0.5" style={{ color }}>{sub}</div>
                {avg > 0 && (
                  <div className="w-full bg-[#e5e7eb] rounded-full h-1.5 mt-2">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${(avg / 5) * 100}%`, backgroundColor: color }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ĐỀ XUẤT CỦA QUẢN LÝ ── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
        <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
          <span className="text-xl">📋</span>
          <span className="font-black text-[#1e3a5f] uppercase tracking-wide">Đề xuất của Quản lý ({mgrName})</span>
        </div>
        <div className="p-5 space-y-3">
          <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm ${
            mgrDecision === 'hire'   ? 'border-[#16a34a] bg-[#f0fdf4] text-[#15803d]' :
            mgrDecision === 'extend' ? 'border-[#f97316] bg-[#fff7ed] text-[#c2410c]' :
            mgrDecision === 'reject' ? 'border-[#dc2626] bg-[#fef2f2] text-[#dc2626]' :
                                       'border-[#d1d5db] bg-[#f9fafb] text-[#6b7280]'
          }`}>
            {DECISION_LABEL[mgrDecision] || mgrDecision}
          </div>
          {mgrComment && (
            <div className="bg-[#f8fafc] rounded-xl p-4 border border-[#d1d5db]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">
                <MessageSquare size={13} />
                Nhận xét của Quản lý
              </div>
              <p className="text-[#374151] text-sm leading-relaxed whitespace-pre-wrap">{mgrComment}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── GHI CHÚ CEO ── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
        <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
          <span className="text-xl">✍️</span>
          <span className="font-black text-[#1e3a5f] uppercase tracking-wide">Ghi Chú CEO</span>
          <span className="text-[#6b7280] font-normal text-sm">(không bắt buộc)</span>
        </div>
        <div className="p-5">
          <textarea
            rows={4}
            value={ceoComment}
            onChange={e => setCeoComment(e.target.value)}
            placeholder="Thêm ghi chú, chỉ đạo hoặc phản hồi (sẽ được gửi cho Quản lý)..."
            className="w-full font-sans border-[1.5px] border-[#d1d5db] rounded-[6px] px-[10px] py-[8px] outline-none text-[#111] bg-white focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 transition-all resize-y min-h-[80px]"
          />
        </div>
      </div>

      {/* ── LỖI ── */}
      {status === 'error' && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-base font-medium">
          <AlertTriangle size={16} className="shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* ── 2 NÚT HÀNH ĐỘNG ── */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={() => submit('return')}
          disabled={status === 'submitting'}
          className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-[#fff7ed] border-2 border-[#f97316] text-[#ea580c] font-bold rounded-[10px] transition-colors disabled:opacity-50"
        >
          <RotateCcw size={18} />
          Trả Về Quản Lý
        </button>
        <button
          onClick={() => submit('approve')}
          disabled={status === 'submitting'}
          className="flex items-center gap-2 px-8 py-3 bg-[#16a34a] hover:bg-green-700 text-white font-bold rounded-[10px] transition-colors shadow-lg border-b-[4px] border-[#15803d] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {status === 'submitting' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ThumbsUp size={18} />
          )}
          Phê Duyệt
        </button>
      </div>
    </div>
  );
}
