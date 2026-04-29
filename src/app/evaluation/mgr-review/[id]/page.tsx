/**
 * /evaluation/mgr-review/[id] — Trang QL chấm điểm + ra quyết định
 * ------------------------------------------------------------------
 * Dùng EvaluationForm chung với viewMode='mgr', expect status SUBMITTED/UNDER_REVIEW.
 * URL: /evaluation/mgr-review/<eval_id>?discord_id=<id>&token=<hmac>
 */

"use client";

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import MgrEvalPageContent from '@/components/evaluation/MgrEvalPageContent';

export default function MgrReviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    }>
      <MgrEvalPageContent flow="mgr-review" />
    </Suspense>
  );
}
