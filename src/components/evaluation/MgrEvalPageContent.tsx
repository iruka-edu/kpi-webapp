"use client";

/**
 * MgrEvalPageContent.tsx — Layout & data loader chung cho 2 trang QL
 * --------------------------------------------------------------------
 * Dùng cho:
 *   - /evaluation/mgr-fill/[id] (flow='mgr-fill', expect MGR_PENDING)
 *   - /evaluation/mgr-review/[id] (flow='mgr-review', expect SUBMITTED/UNDER_REVIEW)
 */

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import EvaluationForm from './EvaluationForm';
import { mapApiToData } from './mapApiToData';
import type { EvaluationData } from './types';

interface Props {
  flow: 'mgr-fill' | 'mgr-review';
}

export default function MgrEvalPageContent({ flow }: Props) {
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
    const apiPath = flow === 'mgr-fill' ? '/api/evaluation/mgr-fill' : '/api/evaluation/mgr-review';
    const load = async () => {
      try {
        const url = `${apiPath}?id=${encodeURIComponent(evalId)}&discord_id=${encodeURIComponent(discordId)}&token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || 'Lỗi tải phiếu');
        // QL pages chỉ chạy ở luồng đầy đủ (CEO-direct guard chặn ở dưới),
        // nên forceCeoDirect=false. Truyền openerDiscordId làm fallback an toàn.
        setData(mapApiToData(json, evalId, { forceCeoDirect: false, openerDiscordId: discordId }));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [evalId, discordId, token, flow]);

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

  // Chặn nếu QL trực tiếp = CEO (luồng rút gọn không cần QL)
  const CEO_ID = process.env.NEXT_PUBLIC_CEO_DISCORD_ID || '';
  if (CEO_ID && data.info.manager_discord_id === CEO_ID) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-amber-500" />
        <h1 className="text-xl font-bold text-slate-900">Bước này được bỏ qua</h1>
        <p className="text-slate-500 max-w-md">
          Phiếu này thuộc <b>luồng rút gọn</b> — Quản lý trực tiếp chính là CEO,
          nên không cần bước Quản lý. CEO sẽ duyệt trực tiếp sau khi NV nộp phiếu.
        </p>
      </div>
    );
  }

  // Cảnh báo nếu phiếu không ở status mong đợi cho flow này
  const expectedStatuses = flow === 'mgr-fill'
    ? ['MGR_PENDING']
    : ['SUBMITTED', 'UNDER_REVIEW'];
  if (data.status && !expectedStatuses.includes(data.status)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-blue-500" />
        <h1 className="text-xl font-bold text-slate-900">Phiếu đang ở giai đoạn khác</h1>
        <p className="text-slate-500">Trạng thái hiện tại: {data.status}</p>
      </div>
    );
  }

  const headerTitle = flow === 'mgr-fill' ? 'Quản lý điền công việc' : 'Quản lý chấm điểm';
  const badgeLabel  = flow === 'mgr-fill' ? 'QL Điền Việc' : 'QL Chấm Điểm';

  return (
    <div className="w-full min-h-screen bg-[#f0f4f8] font-sans">
      <div className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-sm px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center text-2xl shadow-md">📋</div>
          <div className="flex-1">
            <h1 className="font-black text-[#1e3a5f] text-xl">Đánh Giá Nhân Viên Sau Thử Việc</h1>
            <p className="text-xs text-slate-500">{headerTitle} — Vai: Quản Lý Trực Tiếp</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            {badgeLabel}
          </span>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto p-4 md:p-8">
        <EvaluationForm
          viewMode="mgr"
          initialData={data}
          currentUserId={discordId}
          currentUserName={data.info.manager_name}
          token={token}
        />
      </main>
    </div>
  );
}

// mapApiToData đã chuyển sang shared module ./mapApiToData để dùng chung
// (proposals plural fallback, decision fallback, openerDiscordId derive).
