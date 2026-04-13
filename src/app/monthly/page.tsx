/**
 * Placeholder cho trang Báo cáo tháng
 */
"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function MonthlyContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || 'Bạn chưa có Tên';
  const month = searchParams.get('month') || 'Tháng này';

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Khối nội dung Sắp ra mắt */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-12 text-center min-h-[40vh] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="text-7xl mb-6">🚧</div>
        <h1 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Báo Cáo Tháng (Đang thi công)</h1>
        <p className="text-slate-500 mb-8 max-w-lg mx-auto text-lg">
          Xin chào <strong className="text-indigo-600">{name}</strong>. Cổng báo cáo dữ liệu cho kỳ <strong className="text-indigo-600">{month}</strong> hiện đang được đội ngũ xây dựng.
        </p>
        <div className="text-sm text-indigo-700 bg-indigo-50 inline-block px-5 py-2.5 rounded-full font-medium border border-indigo-200/60">
          Tính năng này dự kiến sẽ có mặt trong phiên bản cập nhật IruKa v3.
        </div>
      </div>
    </div>
  );
}

export default function MonthlyReportPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Suspense fallback={<div className="p-12 text-center text-slate-400 font-bold tracking-widest uppercase mt-20">Đang tải nội dung...</div>}>
        <MonthlyContent />
      </Suspense>
    </div>
  );
}
