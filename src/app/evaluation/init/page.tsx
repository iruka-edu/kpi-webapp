/**
 * /evaluation/init — Trang HR khởi tạo phiếu đánh giá
 * ------------------------------------------------------
 * Dùng EvaluationForm chung với viewMode='hr'.
 * URL: /evaluation/init?hr_discord_id=<id>&hr_name=<name>&token=<hmac>
 *      &emp_discord_id=<id>&emp_name=<name>&emp_dept=<dept>&emp_joined=<date>
 *      &mgr_name=<name>&mgr_discord_id=<id>
 */

"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import EvaluationForm from '@/components/evaluation/EvaluationForm';
import { createEmptyEvaluation, MANAGER_LIST } from '@/components/evaluation/defaults';
import type { EvaluationData } from '@/components/evaluation/types';

function InitPageInner() {
  const params = useSearchParams();
  const hrId   = params.get('hr_discord_id') || '';
  const hrName = params.get('hr_name') || '';
  const token  = params.get('token') || '';

  // Pre-fill từ URL (Bot Discord truyền sang)
  const preEmpName     = params.get('emp_name') || '';
  const preEmpId       = params.get('emp_discord_id') || '';
  const preEmpDept     = params.get('emp_dept') || '';
  const preEmpJoined   = params.get('emp_joined') || '';
  const preMgrName     = params.get('mgr_name') || '';
  const preMgrId       = params.get('mgr_discord_id') || '';

  const [data, setData] = useState<EvaluationData | null>(null);

  useEffect(() => {
    const initial = createEmptyEvaluation(hrId);
    if (preEmpName || preEmpId) {
      initial.info.name        = preEmpName || initial.info.name;
      initial.info.discord_id  = preEmpId   || initial.info.discord_id;
      initial.info.dept        = preEmpDept || initial.info.dept;
      initial.info.trial_start = preEmpJoined ? preEmpJoined.slice(0, 10) : initial.info.trial_start;
      // Manager — ưu tiên match từ MANAGER_LIST theo discordId
      const mgrInList = MANAGER_LIST.find(m => m.discord_id === preMgrId);
      if (mgrInList) {
        initial.info.manager_name        = mgrInList.name;
        initial.info.manager_discord_id  = mgrInList.discord_id;
      } else if (preMgrName) {
        initial.info.manager_name        = preMgrName;
        initial.info.manager_discord_id  = preMgrId;
      }
    }
    setData(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f0f4f8] font-sans">
      {/* Sticky header */}
      <div className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-sm px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center text-2xl shadow-md">📋</div>
          <div className="flex-1">
            <h1 className="font-black text-[#1e3a5f] text-xl">Đánh Giá Nhân Viên Sau Thử Việc</h1>
            <p className="text-xs text-slate-500">Khởi tạo phiếu — Vai: Nhân Sự (HR)</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#dbeafe] text-[#1e40af] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span>
            Khởi Tạo Phiếu
          </span>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto p-4 md:p-8">
        <EvaluationForm
          viewMode="hr"
          initialData={data}
          currentUserId={hrId}
          currentUserName={hrName}
          token={token}
        />
      </main>
    </div>
  );
}

export default function EvaluationInitPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    }>
      <InitPageInner />
    </Suspense>
  );
}
