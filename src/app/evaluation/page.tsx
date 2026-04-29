/**
 * /evaluation — Trang NV tự đánh giá
 * -----------------------------------
 * Dùng EvaluationForm chung với viewMode='nv'.
 * URL: /evaluation?id=<eval_id>&discord_id=<id>&token=<hmac>&is_ceo_direct=1
 */

"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import EvaluationForm from '@/components/evaluation/EvaluationForm';
import { mapApiToData } from '@/components/evaluation/mapApiToData';
import type { EvaluationData } from '@/components/evaluation/types';

type Screen = 'loading' | 'form' | 'token_expired' | 'api_error' | 'already_submitted';

function NvPageInner() {
  const params = useSearchParams();
  const evalId    = params.get('id') || '';
  const discordId = params.get('discord_id') || '';
  const token     = params.get('token') || '';
  const isCeoDirect = params.get('is_ceo_direct') === '1';

  const [screen, setScreen] = useState<Screen>('loading');
  const [data, setData]     = useState<EvaluationData | null>(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!evalId) { setScreen('api_error'); setErrMsg('Thiếu ID phiếu trên URL'); return; }
    const load = async () => {
      try {
        let url = `/api/evaluation?id=${encodeURIComponent(evalId)}`;
        if (discordId && token) url += `&discord_id=${encodeURIComponent(discordId)}&token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (res.status === 403) { setScreen('token_expired'); return; }
        if (!res.ok || json.error) throw new Error(json.error);
        // Đã nộp rồi
        if (['SUBMITTED', 'PENDING_CEO', 'COMPLETED', 'PENDING_HR', 'RESULT_SENT', 'ACKNOWLEDGED'].includes(json.status)) {
          setScreen('already_submitted'); return;
        }
        // Shared mapper default status='' — NV page giữ fallback 'NV_PENDING' để
        // permissions cho phép NV edit (canEdit('nv', 'NV_PENDING') → true).
        const mapped = mapApiToData(json, evalId, { forceCeoDirect: isCeoDirect, openerDiscordId: discordId });
        if (!mapped.status) mapped.status = 'NV_PENDING';
        setData(mapped);
        setScreen('form');
      } catch (err: any) {
        setErrMsg(err.message);
        setScreen('api_error');
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (screen === 'loading') return <FullscreenLoader />;
  if (screen === 'token_expired') return <ErrorScreen title="Link đã hết hạn" message="Link tự đánh giá đã hết hạn (72h). Vui lòng liên hệ HR để lấy link mới." />;
  if (screen === 'api_error')     return <ErrorScreen title="Không thể tải phiếu" message={errMsg} />;
  if (screen === 'already_submitted') return <ErrorScreen title="Phiếu đã nộp" message="Bạn đã nộp phiếu này. Quản lý/CEO đang xử lý." color="blue" />;

  if (!data) return <FullscreenLoader />;

  return (
    <div className="w-full min-h-screen bg-[#f0f4f8] font-sans">
      <div className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-sm px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center text-2xl shadow-md">📋</div>
          <div className="flex-1">
            <h1 className="font-black text-[#1e3a5f] text-xl">Đánh Giá Nhân Viên Sau Thử Việc</h1>
            <p className="text-xs text-slate-500">Tự đánh giá — Vai: Nhân Viên</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            NV Đánh Giá
          </span>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <EvaluationForm
          viewMode="nv"
          initialData={data}
          currentUserId={discordId}
          currentUserName={data.info.name}
          token={token}
        />
      </main>
    </div>
  );
}

export default function NvSelfEvalPage() {
  return (
    <Suspense fallback={<FullscreenLoader />}>
      <NvPageInner />
    </Suspense>
  );
}

// ── Helpers ──────────────────────────────────────────────────────
function FullscreenLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
      <Loader2 size={32} className="animate-spin text-blue-600" />
    </div>
  );
}

function ErrorScreen({ title, message, color = 'red' }: { title: string; message: string; color?: 'red' | 'blue' }) {
  const colorMap = color === 'blue' ? 'text-blue-500' : 'text-red-500';
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center space-y-4 p-8">
      <AlertTriangle size={56} className={colorMap} />
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="text-slate-500 max-w-md">{message}</p>
    </div>
  );
}

// mapApiToData đã chuyển sang shared module @/components/evaluation/mapApiToData
// để tránh duplicate logic (proposals plural fallback, decision fallback, etc.)
