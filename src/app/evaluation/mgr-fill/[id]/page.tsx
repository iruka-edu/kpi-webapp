/**
 * /evaluation/mgr-fill/[id] — Trang QL điền công việc + tiêu chí
 * ----------------------------------------------------------------
 * Dùng EvaluationForm chung với viewMode='mgr', expect status MGR_PENDING.
 * URL: /evaluation/mgr-fill/<eval_id>?discord_id=<id>&token=<hmac>
 */

"use client";

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import MgrEvalPageContent from '@/components/evaluation/MgrEvalPageContent';

export default function MgrFillPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    }>
      <MgrEvalPageContent flow="mgr-fill" />
    </Suspense>
  );
}
