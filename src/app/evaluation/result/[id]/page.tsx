/**
 * /evaluation/result/[id] — HR/QL gửi kết quả cho NV
 * ------------------------------------------------------
 * Vai trò: Sau khi CEO phê duyệt, người gửi (HR khi CEO-direct, hoặc QL
 *          khi luồng thường) mở trang này qua link Discord (HMAC token),
 *          xem lại toàn bộ phiếu (giống giao diện EvaluationForm các vai
 *          khác), bấm "Gửi kết quả" → bot DM NV.
 *
 * URL: /evaluation/result/<eval_id>?discord_id=<id>&token=<hmac>
 *
 * Auth: HMAC token cá nhân hóa — KHÔNG dùng Dashboard password nữa.
 *       Bot tạo token cho hr_discord_id (CEO-direct) hoặc manager_discord_id
 *       (luồng thường) khi gửi link.
 */

"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import EvaluationForm from '@/components/evaluation/EvaluationForm';
import ManagerResultSend from '@/components/evaluation/ManagerResultSend';
import DecisionBanner from '@/components/evaluation/DecisionBanner';
import { mapApiToData } from '@/components/evaluation/mapApiToData';
import type { EvaluationData } from '@/components/evaluation/types';

function ResultContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const evalId    = params?.id as string;
  const discordId = searchParams.get('discord_id') || '';
  const token     = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<EvaluationData | null>(null);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!evalId || !discordId || !token) {
      setError('Link không hợp lệ — thiếu tham số xác thực. Vui lòng dùng link Bot Discord gửi.');
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        // mgr-review GET đã accept HMAC token (HR/QL — bất kỳ ai có token
        // hợp lệ cho eval_id này), trả full data qua get_full_evaluation.
        const url = `/api/evaluation/mgr-review?id=${encodeURIComponent(evalId)}&discord_id=${encodeURIComponent(discordId)}&token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || 'Lỗi tải phiếu');
        setData(mapApiToData(json, evalId, { openerDiscordId: discordId }));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [evalId, discordId, token]);

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
        <h1 className="text-xl font-bold text-slate-900">Không thể tải phiếu</h1>
        <p className="text-slate-500 max-w-md">{error || 'Phiếu không tồn tại'}</p>
      </div>
    );
  }

  // Badge theo status thực tế
  const badge = (() => {
    switch (data.status) {
      case 'PENDING_HR':
      case 'COMPLETED':
        return { label: 'Sẵn Sàng Gửi', dot: 'bg-green-500', wrap: 'bg-green-100 text-green-800' };
      case 'RESULT_SENT':
        return { label: 'Đã Gửi', dot: 'bg-slate-500', wrap: 'bg-slate-100 text-slate-700' };
      case 'ACKNOWLEDGED':
        return { label: 'NV Đã Xác Nhận', dot: 'bg-blue-500', wrap: 'bg-blue-100 text-blue-800' };
      case 'REJECTED':
        return { label: 'CEO Đã Từ Chối', dot: 'bg-red-500', wrap: 'bg-red-100 text-red-800' };
      default:
        return { label: data.status || 'N/A', dot: 'bg-amber-500', wrap: 'bg-amber-100 text-amber-800' };
    }
  })();

  return (
    <div className="w-full min-h-screen bg-[#f0f4f8] font-sans">
      <div className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-sm px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center text-2xl shadow-md">📤</div>
          <div className="flex-1">
            <h1 className="font-black text-[#1e3a5f] text-xl">Đánh Giá Nhân Viên Sau Thử Việc</h1>
            <p className="text-xs text-slate-500">Phiếu kết quả — {data.status === 'REJECTED' ? 'CEO đã từ chối' : 'HR/QL gửi cho nhân viên'}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${badge.wrap}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
            {badge.label}
          </span>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 pb-32">
        {/* Banner quyết định cuối — text adjust theo người mở:
            - HR (luồng rút gọn, là sender) → hr note
            - QL (luồng đầy đủ, là sender) → mgr note
            Phân biệt qua so sánh discord_id URL với hr/manager_discord_id của phiếu. */}
        <DecisionBanner
          decision={data.conclusion.mgr_decision}
          audience={
            discordId === data.info.manager_discord_id ? 'mgr'
            : discordId === data.info.hr_discord_id ? 'hr'
            : 'hr' // fallback an toàn — HR-style hướng dẫn chung
          }
        />

        {/* Phiếu đầy đủ — giao diện y hệt các vai khác (read-only do status PENDING_HR/COMPLETED) */}
        <EvaluationForm
          viewMode="mgr"
          initialData={data}
          currentUserId={discordId}
          currentUserName="Người gửi kết quả"
          token={token}
        />

        {/* Khu vực gửi kết quả — không cần dashboard password, dùng HMAC */}
        <ManagerResultSend
          evalId={evalId}
          employeeName={data.info.name}
          currentStatus={data.status}
          discordId={discordId}
          token={token}
        />
      </main>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
