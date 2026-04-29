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
        setData(mapApiToData(json, evalId));
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

function mapApiToData(json: any, evalId: string): EvaluationData {
  const mgrId = json.info?.manager_discord_id || json.manager_discord_id || '';
  const ceoId = process.env.NEXT_PUBLIC_CEO_DISCORD_ID || '';
  const isCeoDirect = !!(mgrId && ceoId && mgrId === ceoId);
  return {
    eval_id: evalId,
    status: json.status || 'PENDING_CEO',
    info: {
      name: json.info?.name || json.name || '',
      discord_id: json.info?.discord_id || json.discord_id || '',
      dept: json.info?.dept || json.dept || '',
      role: json.info?.role || json.role || '',
      manager_name: json.info?.manager_name || json.manager_name || '',
      manager_discord_id: mgrId,
      hr_discord_id: json.info?.hr_discord_id || json.hr_discord_id || '',
      trial_start: json.info?.trial_start || json.trial_start || '',
      trial_end: json.info?.trial_end || json.trial_end || '',
      eval_date: json.info?.eval_date || json.eval_date || new Date().toISOString().slice(0, 10),
    },
    work_items: (json.work_items || json.work_summary || []).map((w: any) => ({
      task: w.task || w.area || '',
      details: w.details || w.detail || '',
      result: w.result || '',
    })),
    criteria: (json.criteria || []).map((c: any) => ({
      name: c.name || '',
      expectation: c.expectation || '',
      group: c.group || '💡 TIÊU CHÍ KHÁC',
      source: c.source,
      self_score: Number(c.self_score) || 0,
      mgr_score: Number(c.mgr_score) || 0,
      note: c.note || '',
    })),
    proposal: {
      salary_expectation: json.proposal?.salary_expectation || '',
      training_request: json.proposal?.training_request || '',
      feedback: json.proposal?.feedback || '',
    },
    conclusion: {
      mgr_comment: json.mgr_comment || '',
      mgr_expectation: json.mgr_expectation || '',
      mgr_salary_proposal: json.mgr_salary_proposal || '',
      mgr_decision: (json.mgr_decision || '') as any,
      ceo_comment: json.ceo_comment || '',
    },
    signatures: json.signatures || {},
    is_ceo_direct: isCeoDirect,
  };
}
