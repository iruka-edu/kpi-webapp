/**
 * /evaluation/ceo-review/[id] — Trang CEO duyệt phiếu
 * -----------------------------------------------------
 * Dùng EvaluationForm chung với viewMode='ceo', expect status PENDING_CEO.
 * URL: /evaluation/ceo-review/<eval_id>?discord_id=<id>&token=<hmac>
 */

"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import EvaluationForm from '@/components/evaluation/EvaluationForm';
import { mapApiToData as mapApiToDataShared } from '@/components/evaluation/mapApiToData';
import type { EvaluationData } from '@/components/evaluation/types';

function CeoPageContent() {
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
        const url = `/api/evaluation/ceo-review?id=${encodeURIComponent(evalId)}&discord_id=${encodeURIComponent(discordId)}&token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || 'Lỗi tải phiếu');
        // Shared mapper default status='' — CEO page giữ fallback 'PENDING_CEO'
        // để permissions cho phép CEO edit (canEdit('ceo', 'PENDING_CEO') → true).
        const mapped = mapApiToDataShared(json, evalId, { openerDiscordId: discordId });
        if (!mapped.status) mapped.status = 'PENDING_CEO';
        setData(mapped);
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

  return (
    <div className="w-full min-h-screen bg-[#f0f4f8] font-sans">
      <div className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-sm px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center text-2xl shadow-md">📋</div>
          <div className="flex-1">
            <h1 className="font-black text-[#1e3a5f] text-xl">Đánh Giá Nhân Viên Sau Thử Việc</h1>
            <p className="text-xs text-slate-500">CEO duyệt — Vai: Giám Đốc</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            CEO Phê Duyệt
          </span>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <EvaluationForm
          viewMode="ceo"
          initialData={data}
          currentUserId={discordId}
          currentUserName="CEO (Mr. Đào)"
          token={token}
        />
      </main>
    </div>
  );
}

export default function CeoReviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    }>
      <CeoPageContent />
    </Suspense>
  );
}

// mapApiToData đã chuyển sang shared module @/components/evaluation/mapApiToData
// (dùng chung cho NV, QL, CEO, HR result, NV final). Status fallback 'PENDING_CEO'
// đã apply ở callsite trên (line 39-42).
