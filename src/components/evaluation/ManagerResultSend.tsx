"use client";

/**
 * ManagerResultSend.tsx — Nút "Gửi kết quả cho Nhân Viên"
 * ----------------------------------------------------------
 * Vai trò: Hiển thị sau khi CEO đã phê duyệt (status = COMPLETED).
 *          Quản lý điền lời nhắn tuỳ chọn, bấm Gửi → Bot gửi link
 *          kết quả cho NV + CC CEO. Status: COMPLETED → RESULT_SENT.
 *
 * Luồng:
 *  POST /api/evaluation/send-result
 *    → GAS lưu + chuyển status → RESULT_SENT
 *    → Bot gửi Discord DM cho NV + CC CEO
 *
 * Props:
 *  evalId        — ID phiếu đánh giá
 *  employeeName  — Tên NV (để hiển thị xác nhận)
 *  dashboardPass — Mật khẩu Dashboard (để auth API)
 *  currentStatus — Status hiện tại của phiếu
 */

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Info, Loader2, Send } from 'lucide-react';

interface ManagerResultSendProps {
  evalId: string;
  employeeName: string;
  currentStatus: string; // Chỉ cho phép gửi khi = 'COMPLETED' hoặc 'PENDING_HR'
  // Auth: HMAC token (link Discord) — ưu tiên. Hoặc dashboardPass (legacy).
  discordId?: string;
  token?: string;
  dashboardPass?: string;
}

export default function ManagerResultSend({
  evalId,
  employeeName,
  currentStatus,
  discordId,
  token,
  dashboardPass,
}: ManagerResultSendProps) {
  const [mgrNote, setMgrNote] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Chỉ hiển thị nút khi CEO đã duyệt xong
  // - COMPLETED: luồng thường (QL gửi)
  // - PENDING_HR: luồng rút gọn (CEO kiêm QL → HR gửi)
  const canSend = currentStatus === 'COMPLETED' || currentStatus === 'PENDING_HR';
  const alreadySent = currentStatus === 'RESULT_SENT' || currentStatus === 'ACKNOWLEDGED';

  // ── Đã gửi rồi ────────────────────────────────────────────────
  if (alreadySent) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 flex items-center gap-4">
        <CheckCircle size={28} className="text-green-400 shrink-0" />
        <div>
          <div className="font-bold text-green-400 text-base">Kết quả đã được gửi</div>
          <p className="text-slate-400 text-sm mt-0.5">
            Nhân viên <strong className="text-white">{employeeName}</strong> đã nhận được kết quả
            qua Discord. CEO cũng đã được CC thông báo.
          </p>
        </div>
      </div>
    );
  }

  // ── Chưa đủ điều kiện (CEO chưa duyệt) ──────────────────────
  if (!canSend) {
    return (
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 flex items-center gap-4">
        <Info size={24} className="text-slate-500 shrink-0" />
        <p className="text-slate-400 text-sm">
          Nút gửi kết quả sẽ xuất hiện sau khi <strong className="text-white">CEO phê duyệt</strong> phiếu đánh giá này.
        </p>
      </div>
    );
  }

  // ── Gửi thành công ────────────────────────────────────────────
  if (sendStatus === 'sent') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <CheckCircle size={64} className="text-green-400" />
        <h2 className="text-2xl font-bold text-white">Đã Gửi Kết Quả!</h2>
        <p className="text-slate-400 max-w-md">
          Kết quả đánh giá đã được gửi cho{' '}
          <strong className="text-white">{employeeName}</strong> qua Discord.
          CEO đã được CC thông báo.
        </p>
      </div>
    );
  }

  // ── Form gửi chính ─────────────────────────────────────────────
  const handleSend = async () => {
    setSendStatus('sending');
    setErrorMsg('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      // Ưu tiên HMAC token (link Discord). Fallback dashboard pass nếu có.
      if (dashboardPass) headers['x-dashboard-auth'] = dashboardPass;
      const body: Record<string, unknown> = { eval_id: evalId, mgr_note: mgrNote };
      if (discordId && token) {
        body.discord_id = discordId;
        body.token = token;
      }
      const res = await fetch('/api/evaluation/send-result', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Gửi kết quả thất bại');
      setSendStatus('sent');
    } catch (err: any) {
      setSendStatus('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50 space-y-5">
      {/* Tiêu đề */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-green-600/20 flex items-center justify-center">
          <Send size={18} className="text-green-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Gửi Kết Quả Cho Nhân Viên</h2>
          <p className="text-xs text-slate-500">
            Bước 6 — CEO đã phê duyệt. Nhấn gửi để hoàn tất quy trình.
          </p>
        </div>
      </div>

      {/* Lời nhắn tuỳ chọn */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
          Lời nhắn kèm kết quả{' '}
          <span className="text-slate-600 font-normal normal-case">(không bắt buộc)</span>
        </label>
        <textarea
          rows={3}
          value={mgrNote}
          onChange={(e) => setMgrNote(e.target.value)}
          placeholder="Lời chúc, động viên, hoặc hướng dẫn tiếp theo cho nhân viên..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-none transition text-sm"
        />
      </div>

      {/* Lỗi — toast giữa màn hình */}
      {sendStatus === 'error' && errorMsg && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => { setSendStatus('idle'); setErrorMsg(''); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center gap-4 text-center"
            style={{ animation: 'bounce-in 0.25s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <div>
              <div className="font-black text-[#1e3a5f] text-lg mb-1">Gửi thất bại!</div>
              <div className="text-[#374151] text-base font-medium leading-snug">{errorMsg}</div>
            </div>
            <button
              type="button"
              onClick={() => { setSendStatus('idle'); setErrorMsg(''); }}
              className="mt-1 px-6 py-2 bg-[#1e3a5f] text-white rounded-lg font-bold text-sm hover:bg-[#16304f] transition-colors"
            >
              Đóng, thử lại
            </button>
          </div>
        </div>
      )}

      {/* Nút gửi */}
      <div className="flex justify-end">
        <button
          onClick={handleSend}
          disabled={sendStatus === 'sending'}
          className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-600/20"
        >
          {sendStatus === 'sending' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Đang gửi...
            </>
          ) : (
            <>
              <Send size={18} />
              Gửi Kết Quả Cho {employeeName}
            </>
          )}
        </button>
      </div>
    </section>
  );
}
