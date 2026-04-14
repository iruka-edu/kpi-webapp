/**
 * MonthlyHeaderInfo.tsx — Khối thông tin nhân viên cho Báo cáo Tháng
 */

import React from 'react';

type Props = {
  name: string;
  role: string;
  dept: string;
  date: string;
  reportMonth: string;
  planMonth: string;
  reportTo: string;
  isLate: boolean;
}

/**
 * Hàm lấy khoảng ngày của tháng (01/MM - 30/MM)
 */
function getMonthDateRange(monthLabel: string): string {
  const match = monthLabel.match(/\d+/);
  if (!match) return '';
  const monthNum = parseInt(match[0]);
  const year = new Date().getFullYear();
  
  const firstDay = new Date(year, monthNum - 1, 1);
  const lastDay = new Date(year, monthNum, 0);

  const fmt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  return `(${fmt(firstDay)} - ${fmt(lastDay)})`;
}

export default function MonthlyHeaderInfo({ name, role, dept, date, reportMonth, planMonth, reportTo, isLate }: Props) {
  const reportDates = getMonthDateRange(reportMonth);
  const planDates = getMonthDateRange(planMonth);

  return (
    <div className="mb-8 mt-2">
      {/* KHỐI TIÊU ĐỀ - DÍNH (STICKY) Ở TRÊN CÙNG */}
      <div className="sticky top-0 z-50 py-4 mb-8 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all rounded-b-lg">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-[#1e3a5f] tracking-wide">
            BÁO CÁO &amp; KẾ HOẠCH THÁNG
          </h1>
          
          {/* Khối Badge căn giữa */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="px-3 py-1.5 rounded-full bg-[#1e3a5f] text-white text-xs sm:text-sm font-bold shadow-md">
              📋 BC: {reportMonth} {reportDates}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-900 text-xs sm:text-sm font-bold border-2 border-blue-200 shadow-sm">
              🗓️ KH: {planMonth} {planDates}
            </span>
            {isLate && (
              <span className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs sm:text-sm font-bold border-2 border-orange-300 shadow-sm animate-pulse">
                ⏰ Nộp muộn
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bảng thông tin NV */}
      <div className="block">
        <table className="border-collapse border border-gray-300 text-sm shadow-sm rounded-lg overflow-hidden bg-white max-w-full overflow-x-auto">
          <tbody>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-bold bg-gray-50 w-36 text-gray-500 uppercase tracking-wider text-[11px]">Họ tên</td>
              <td className="border border-gray-300 px-4 py-2 text-[#1e3a5f] font-black min-w-[200px] text-base">{name}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-bold bg-gray-50 text-gray-500 uppercase tracking-wider text-[11px]">Báo cáo cho</td>
              <td className="border border-gray-300 px-4 py-2 text-[#1e3a5f] font-bold">{reportTo}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-bold bg-gray-50 text-gray-500 uppercase tracking-wider text-[11px]">Phòng ban</td>
              <td className="border border-gray-300 px-4 py-2 text-[#1e3a5f] font-bold">{dept}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-bold bg-gray-50 text-gray-500 uppercase tracking-wider text-[11px]">Ngày đánh giá</td>
              <td className="border border-gray-300 px-4 py-2 text-[#1e3a5f] font-bold">{date}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
