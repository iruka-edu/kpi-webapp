/**
 * /evaluation/final — NV xem kết quả cuối + xác nhận
 * -----------------------------------------------------
 * Vai trò: NV nhận link qua Discord Bot, vào trang này xem TOÀN BỘ phiếu
 *          (giao diện y hệt HR/QL/CEO — EvaluationForm read-only), sau đó
 *          bấm nút xác nhận đã nhận.
 *
 * URL: /evaluation/final?id=xxx&discord_id=yyy&token=zzz
 * Auth: HMAC-SHA256 token cá nhân hóa (NV's discord_id)
 */

"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import EvaluationForm from '@/components/evaluation/EvaluationForm';
import DecisionBanner from '@/components/evaluation/DecisionBanner';
import { mapApiToData } from '@/components/evaluation/mapApiToData';
import type { EvaluationData } from '@/components/evaluation/types';

function FinalContent() {
  const searchParams = useSearchParams();
  const evalId    = searchParams.get('id') || '';
  const discordId = searchParams.get('discord_id') || '';
  const token     = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<EvaluationData | null>(null);
  const [error, setError]     = useState('');
  const [ackStatus, setAckStatus] = useState<'idle' | 'confirming' | 'confirmed' | 'error'>('idle');
  const [ackError, setAckError]   = useState('');

  useEffect(() => {
    if (!evalId || !discordId || !token) {
      setError('Link không hợp lệ — thiếu tham số xác thực.');
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const params = new URLSearchParams({ id: evalId, discord_id: discordId, token });
        const res = await fetch(`/api/evaluation/acknowledge?${params}`);
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || 'Lỗi tải kết quả');
        setData(mapApiToData(json, evalId, { openerDiscordId: discordId }));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [evalId, discordId, token]);

  const handleAcknowledge = async () => {
    setAckStatus('confirming');
    setAckError('');
    try {
      const res = await fetch('/api/evaluation/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eval_id: evalId, discord_id: discordId, token }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Xác nhận thất bại');
      setAckStatus('confirmed');
    } catch (err: any) {
      setAckStatus('error');
      setAckError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-red-500" />
        <h1 className="text-xl font-bold text-slate-900">Không thể xem kết quả</h1>
        <p className="text-slate-500 max-w-md">{error || 'Phiếu không tồn tại'}</p>
      </div>
    );
  }

  if (ackStatus === 'confirmed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center space-y-4 p-8">
        <CheckCircle size={64} className="text-green-600" />
        <h1 className="text-2xl font-bold text-slate-900">Đã Xác Nhận Nhận Kết Quả!</h1>
        <p className="text-slate-500 max-w-md">
          Cảm ơn bạn đã xem kết quả đánh giá thử việc.<br />
          Nếu có thắc mắc, vui lòng liên hệ trực tiếp với Quản lý hoặc HR.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f0f4f8] font-sans">
      <div className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-sm px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center text-2xl shadow-md">🎯</div>
          <div className="flex-1">
            <h1 className="font-black text-[#1e3a5f] text-xl">Kết Quả Đánh Giá Thử Việc</h1>
            <p className="text-xs text-slate-500">Xem đầy đủ phiếu — Bấm "Đã nhận" sau khi xem xong</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Kết Quả Cuối
          </span>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-32">
        {/* Banner quyết định cuối — NV thấy ngay outcome khi mở phiếu */}
        <DecisionBanner decision={data.conclusion.mgr_decision} audience="nv" />

        {/* Phiếu đầy đủ — viewMode='nv', status RESULT_SENT/ACKNOWLEDGED → readonly */}
        <EvaluationForm
          viewMode="nv"
          initialData={data}
          currentUserId={discordId}
          currentUserName={data.info.name || 'Nhân viên'}
          token={token}
        />

        {/* Lời nhắn QL khi gửi (nếu có) — fetch từ json gốc; lấy từ data nếu cần.
            Hiện EvaluationForm chưa render mgr_note, nên hiện ở đây. */}

        {/* Toast lỗi xác nhận */}
        {ackStatus === 'error' && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-red-600 text-sm">
            <AlertTriangle size={16} /> {ackError}
          </div>
        )}

        {/* Nút xác nhận */}
        <div className="flex justify-center pb-12">
          <button
            type="button"
            onClick={handleAcknowledge}
            disabled={ackStatus === 'confirming'}
            className="flex items-center gap-2 px-10 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/20 text-lg"
          >
            {ackStatus === 'confirming' ? (
              <><Loader2 size={20} className="animate-spin" /> Đang xác nhận...</>
            ) : (
              <><CheckCircle size={20} /> Xác Nhận Đã Nhận Kết Quả</>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function FinalPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    }>
      <FinalContent />
    </Suspense>
  );
}
