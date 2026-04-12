/**
 * Placeholder cho trang Báo cáo tháng
 */
"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';

export default function MonthlyReportPage() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || 'Nhân viên';
  const month = searchParams.get('month') || 'Tháng này';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden text-center border-t-4 border-purple-600">
        <div className="bg-purple-50 p-12">
          <div className="text-6xl mb-4">🚧</div>
          <h1 className="text-3xl font-black text-purple-900 mb-2 uppercase">Báo cáo Tháng (Sắp ra mắt)</h1>
          <p className="text-purple-700/80 mb-6">Xin chào {name}. Form báo cáo cho {month} đang được xây dựng.</p>
          <p className="text-sm text-gray-500 bg-white inline-block px-4 py-2 rounded-full shadow-sm font-medium border border-purple-100">
            Tính năng này sẽ được hoàn thiện trong lộ trình tiếp theo của nền tảng KPI.
          </p>
        </div>
      </div>
    </div>
  );
}
