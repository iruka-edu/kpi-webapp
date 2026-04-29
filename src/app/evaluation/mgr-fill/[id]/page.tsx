/**
 * app/evaluation/mgr-fill/[id]/page.tsx — Trang Quản lý điền đầu việc
 * -----------------------------------------------------------------------
 * Vai trò: Quản lý nhận link từ Bot, vào trang này điền:
 *   1. Danh sách công việc đã giao cho NV
 *   2. Tiêu chí đánh giá năng lực (sửa từ mẫu HR hoặc tự tạo)
 *
 * Bảo mật: HMAC-SHA256 token cá nhân hóa qua URL (giống /evaluation NV self-eval)
 * URL: /evaluation/mgr-fill/<eval_id>?discord_id=<id>&token=<hmac>
 */

"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MgrWorkSummary from '@/components/evaluation/MgrWorkSummary';
import EvalInfoForm from '@/components/evaluation/EvalInfoForm';
import { ClipboardCheck, Loader2, AlertTriangle } from 'lucide-react';
import type { EvalInfo } from '@/components/evaluation/EvalInfoForm';
import type { CriteriaItem } from '@/components/evaluation/EvalCriteriaTable';

interface EvalData {
  info: EvalInfo;
  hr_criteria: CriteriaItem[];
  status: string;
}

function MgrFillContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const evalId = params?.id as string;
  const discordId = searchParams.get('discord_id') || '';
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [evalData, setEvalData] = useState<EvalData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!evalId || !discordId || !token) {
      setError('Link không hợp lệ — thiếu tham số xác thực. Vui lòng dùng link Bot Discord gửi.');
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const url =
          `/api/evaluation/mgr-fill?id=${encodeURIComponent(evalId)}` +
          `&discord_id=${encodeURIComponent(discordId)}` +
          `&token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Lỗi tải phiếu');
        // Bảo đảm hr_criteria + status có giá trị mặc định
        setEvalData({
          info: data.info,
          hr_criteria: data.hr_criteria || data.criteria || [],
          status: data.status || '',
        });
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

  if (error || !evalData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-red-500" />
        <h1 className="text-xl font-bold text-slate-900">Không thể mở phiếu</h1>
        <p className="text-slate-500 max-w-md">{error || 'Phiếu không tồn tại'}</p>
      </div>
    );
  }

  // FIX BUG #4: Chặn khi luồng rút gọn (Quản lý trực tiếp = CEO) — bước này được bỏ qua
  const CEO_DISCORD_ID = process.env.NEXT_PUBLIC_CEO_DISCORD_ID || '';
  if (CEO_DISCORD_ID && evalData.info?.manager_discord_id === CEO_DISCORD_ID) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-amber-500" />
        <h1 className="text-xl font-bold text-slate-900">Bước này được bỏ qua</h1>
        <p className="text-slate-500 max-w-md">
          Phiếu này thuộc <b>luồng rút gọn</b> — Quản lý trực tiếp chính là CEO,
          nên không cần bước này. NV sẽ tự điền công việc + tự đánh giá, sau đó CEO duyệt trực tiếp.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f0f4f8] font-sans">
      {/* Sticky header nav */}
      <div className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-sm px-6 flex items-center h-16 gap-4">
        <div className="flex items-center gap-3 pr-8 border-r border-slate-200">
          <ClipboardCheck size={22} className="text-[#1e3a5f]" />
          <span className="font-bold text-lg text-slate-800 tracking-tight">IruKa<span className="text-blue-600">Life</span></span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-[#1e3a5f] text-[15px]">Điền Công Việc &amp; Tiêu Chí</span>
          <span className="text-xs text-slate-400">Bước 2/6 — Quản lý điền để gửi cho nhân viên tự đánh giá</span>
        </div>
        <div className="ml-auto flex items-center gap-2 overflow-x-auto">
          {['HR tạo phiếu', 'Quản lý điền việc', 'NV tự đánh giá', 'Quản lý chấm điểm', 'CEO duyệt', 'Kết quả'].map((step, i) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border ${i === 1 ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' :
                  i < 1 ? 'bg-green-50 text-green-700 border-green-200' :
                    'bg-white text-slate-400 border-slate-200'
                }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 1 ? 'bg-blue-600 text-white' :
                    i < 1 ? 'bg-green-600 text-white' :
                      'bg-slate-200 text-slate-500'
                  }`}>{i + 1}</span>
                {step}
              </div>
              {i < 5 && <span className="text-slate-300 shrink-0">›</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Phần 1: Thông tin nhân viên */}
        <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
          <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="font-black text-[#1e3a5f] uppercase tracking-wide">1. Thông Tin Nhân Viên</span>
            <span className="font-medium text-[#6b7280] ml-2">(HR đã điền — chỉ xem)</span>
          </div>
          <div className="p-5">
            <EvalInfoForm info={evalData.info} />
          </div>
        </div>

        {/* Phần 2: Form điền việc & tiêu chí */}
        <MgrWorkSummary
          evalId={evalId}
          employeeName={evalData.info.name}
          discordId={discordId}
          token={token}
          hrCriteria={evalData.hr_criteria}
        />
      </main>
    </div>
  );
}

export default function MgrFillPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#0a1120]">
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    }>
      <MgrFillContent />
    </Suspense>
  );
}
