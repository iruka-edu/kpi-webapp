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
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <CheckCircle size={64} className="text-green-400" />
        <h2 className="text-2xl font-bold text-white">Đã Phê Duyệt!</h2>
        <p className="text-slate-400 max-w-md">
          Kết quả đánh giá <strong className="text-white">{employeeName}</strong> đã gửi về cho Quản lý.
          HR đã được CC thông báo.
        </p>
      </div>
    );
  }

  if (status === 'returned') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <RotateCcw size={64} className="text-yellow-400" />
        <h2 className="text-2xl font-bold text-white">Đã Trả Về Quản Lý</h2>
        <p className="text-slate-400 max-w-md">
          Phiếu đã được trả về <strong className="text-white">{mgrName}</strong> để xem lại.
          HR đã được CC thông báo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── TÓM TẮT ĐIỂM ── */}
      <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-sm font-bold">📊</span>
          Tổng Quan Điểm Đánh Giá
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'TB NV tự chấm', avg: nvAvg, color: 'text-blue-400', sub: 'Nhân viên' },
            { label: 'TB Quản lý chấm', avg: mgrAvg, color: 'text-purple-400', sub: mgrName },
            { label: 'Bình quân chung', avg: combinedAvg, color: getVerdictColor(combinedAvg), sub: getVerdictLabel(combinedAvg) },
          ].map(({ label, avg, color, sub }) => (
            <div key={label} className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/50 text-center space-y-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
              <div className={`text-4xl font-bold ${color}`}>
                {avg > 0 ? avg.toFixed(1) : '—'}
              </div>
              <div className={`text-sm font-medium ${color}`}>{sub}</div>
              {avg > 0 && (
                <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-700 ${color.replace('text-', 'bg-')}`}
                    style={{ width: `${(avg / 5) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── ĐỀ XUẤT CỦA QUẢN LÝ ── */}
      <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
        <h2 className="text-base font-bold text-slate-300 mb-4">📋 Đề xuất của Quản lý ({mgrName})</h2>
        <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm mb-4 ${DECISION_COLOR[mgrDecision] || 'text-slate-400 bg-slate-700 border-slate-600'}`}>
          {DECISION_LABEL[mgrDecision] || mgrDecision}
        </div>
        {mgrComment && (
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              <MessageSquare size={13} />
              Nhận xét của Quản lý
            </div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{mgrComment}</p>
          </div>
        )}
      </section>

      {/* ── GHI CHÚ CEO (OPTIONAL) ── */}
      <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
        <h2 className="text-base font-bold text-slate-300 mb-3 flex items-center gap-2">
          Ghi Chú CEO
          <span className="text-slate-500 font-normal text-xs">(không bắt buộc)</span>
        </h2>
        <textarea
          rows={4}
          value={ceoComment}
          onChange={e => setCeoComment(e.target.value)}
          placeholder="Thêm ghi chú, chỉ đạo hoặc phản hồi (sẽ được gửi cho Quản lý)..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none transition"
        />
      </section>

      {/* ── LỖI ── */}
      {status === 'error' && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-red-400 text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* ── 2 NÚT HÀNH ĐỘNG ── */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={() => submit('return')}
          disabled={status === 'submitting'}
          className="flex items-center gap-2 px-6 py-3 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-600/40 text-yellow-400 font-bold rounded-xl transition-colors disabled:opacity-50"
        >
          <RotateCcw size={18} />
          Trả Về Quản Lý
        </button>
        <button
          onClick={() => submit('approve')}
          disabled={status === 'submitting'}
          className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-600/20 disabled:opacity-50"
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
