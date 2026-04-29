/**
 * app/evaluation/mgr-review/[id]/page.tsx — Trang Quản lý chấm điểm
 * -------------------------------------------------------------------
 * Vai trò: Quản lý nhận link từ Bot Discord (sau khi NV nộp phiếu),
 *          xem toàn bộ phiếu NV đã điền, chấm điểm từng tiêu chí,
 *          nhận xét tổng thể, đề xuất quyết định → gửi CEO (CC HR).
 *
 * Bảo mật: HMAC-SHA256 token cá nhân hóa qua URL (giống /evaluation NV self-eval)
 * URL: /evaluation/mgr-review/<eval_id>?discord_id=<id>&token=<hmac>
 */

"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import EvalInfoForm from '@/components/evaluation/EvalInfoForm';
import WorkSummaryTable from '@/components/evaluation/WorkSummaryTable';
import MgrScorePanel from '@/components/evaluation/MgrScorePanel';
import EmployeeProposal from '@/components/evaluation/EmployeeProposal';
import { ClipboardCheck, Loader2, AlertTriangle } from 'lucide-react';
import type { EvalInfo } from '@/components/evaluation/EvalInfoForm';
import type { WorkRow } from '@/components/evaluation/WorkSummaryTable';

// ── Kiểu dữ liệu phiếu đầy đủ ────────────────────────────────────
interface FullEvalData {
  info: EvalInfo;
  work_items: WorkRow[];
  criteria: Array<{ name: string; expectation: string; source: string; self_score: number }>;
  proposal: { salary_expectation: string; training_request: string; feedback: string };
  status: string;
}

function MgrReviewContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const evalId = params?.id as string;
  const discordId = searchParams.get('discord_id') || '';
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [evalData, setEvalData] = useState<FullEvalData | null>(null);
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
          `/api/evaluation/mgr-review?id=${encodeURIComponent(evalId)}` +
          `&discord_id=${encodeURIComponent(discordId)}` +
          `&token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Không thể tải phiếu');
        setEvalData(data);
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
        <h1 className="text-xl font-bold text-slate-900">Không thể tải phiếu</h1>
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
          nên không cần bước Quản lý chấm điểm. CEO sẽ duyệt trực tiếp sau khi NV nộp phiếu.
        </p>
      </div>
    );
  }

  // ── Kiểm tra trạng thái phiếu ────────────────────────────────────
  const validStatuses = ['SUBMITTED', 'UNDER_REVIEW'];
  if (!validStatuses.includes(evalData.status)) {
    const statusMsg: Record<string, string> = {
      PENDING_CEO: 'Phiếu đã được gửi lên CEO duyệt.',
      COMPLETED: 'Phiếu đã được CEO phê duyệt.',
      RESULT_SENT: 'Kết quả đã được gửi cho nhân viên.',
    };
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] text-center space-y-4 p-8">
        <ClipboardCheck size={56} className="text-blue-500" />
        <h1 className="text-xl font-bold text-slate-900">Phiếu đang ở giai đoạn khác</h1>
        <p className="text-slate-500">{statusMsg[evalData.status] || `Trạng thái hiện tại: ${evalData.status}`}</p>
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
          <span className="font-bold text-[#1e3a5f] text-[15px]">Chấm Điểm Đánh Giá</span>
          <span className="text-xs text-slate-400">Bước 4/6 — Quản lý chấm điểm và đề xuất quyết định</span>
        </div>
        <div className="ml-auto flex items-center gap-2 overflow-x-auto">
          {['HR tạo phiếu', 'Quản lý điền việc', 'NV tự đánh giá', 'Quản lý chấm điểm', 'CEO duyệt', 'Kết quả'].map((step, i) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border ${
                i === 3 ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' :
                i < 3 ? 'bg-green-50 text-green-700 border-green-200' :
                'bg-white text-slate-400 border-slate-200'
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i === 3 ? 'bg-blue-600 text-white' :
                  i < 3 ? 'bg-green-600 text-white' :
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
        {/* 1. Thông tin nhân viên */}
        <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
          <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="font-black text-[#1e3a5f] uppercase tracking-wide">1. Thông Tin Nhân Viên</span>
          </div>
          <div className="p-5">
            <EvalInfoForm info={evalData.info} />
          </div>
        </div>

        {/* 2. Tổng kết công việc */}
        <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
          <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
            <span className="text-xl">🗂️</span>
            <span className="font-black text-[#1e3a5f] uppercase tracking-wide">2. Kết Quả Công Việc NV Báo Cáo</span>
            <span className="font-medium text-[#6b7280] ml-2">(chỉ xem)</span>
          </div>
          <div className="overflow-x-auto">
            <WorkSummaryTable rows={evalData.work_items} readonly={true} />
          </div>
        </div>

        {/* 3. Đề xuất của NV */}
        <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
          <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
            <span className="text-xl">💬</span>
            <span className="font-black text-[#1e3a5f] uppercase tracking-wide">3. Đề Xuất Của Nhân Viên</span>
            <span className="font-medium text-[#6b7280] ml-2">(chỉ xem)</span>
          </div>
          <div className="p-5">
            <EmployeeProposal data={evalData.proposal} readonly={true} />
          </div>
        </div>

        {/* 4. Panel chấm điểm */}
        <MgrScorePanel
          evalId={evalId}
          employeeName={evalData.info.name}
          criteria={evalData.criteria.map(c => ({
            name: c.name,
            expectation: c.expectation,
            source: c.source as 'mgr' | 'hr_template' | 'nv_added',
            self_score: c.self_score,
          }))}
          discordId={discordId}
          token={token}
        />
      </main>
    </div>
  );
}

export default function MgrReviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    }>
      <MgrReviewContent />
    </Suspense>
  );
}
