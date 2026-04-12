/**
 * HeaderInfo.tsx — Khối thông tin nhân viên (Phần trên cùng)
 * -----------------------------------------------------------
 * Vai trò: Hiển thị thông tin NV. Căn giữa tiêu đề chính và các badge.
 * Tự động chèn ngày tháng của tuần.
 */

import React from 'react';

type Props = {
  name: string;
  role: string;
  dept: string;
  date: string;
  reportWeek: string;
  planWeek: string;
  isLate: boolean;
}

/**
 * Hàm tính khoảng ngày của 1 tuần ISO từ nhãn "Tuần 15"
 * → Trả về: "(07/04 - 13/04)"
 */
function getWeekDateRange(weekLabel: string): string {
  const match = weekLabel.match(/\d+/);
  if (!match) return '';
  const weekNum = parseInt(match[0]);
  const year = new Date().getFullYear();

  // ISO week: Tuần 1 chứa ngày 4/1, thứ Hai là ngày đầu tuần
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; 
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - dayOfWeek + 1);

  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (weekNum - 1) * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  return `(${fmt(monday)} - ${fmt(sunday)})`;
}

export default function HeaderInfo({ name, role, dept, date, reportWeek, planWeek, isLate }: Props) {
  const reportDates = getWeekDateRange(reportWeek);
  const planDates = getWeekDateRange(planWeek);

  return (
    <div className="mb-8 mt-2">
      {/* KHỐI TIÊU ĐỀ - Căn giữa toàn bộ */}
      <div className="flex flex-col items-center justify-center gap-4 mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-black uppercase text-[#1e3a5f] tracking-wide">
          BÁO CÁO &amp; KẾ HOẠCH TUẦN
        </h1>
        
        {/* Khối Badge căn giữa ngay dưới tiêu đề */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="px-4 py-2 rounded-full bg-[#1e3a5f] text-white text-sm font-bold shadow-md">
            📋 BC: {reportWeek} {reportDates}
          </span>
          <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-900 text-sm font-bold border-2 border-blue-200 shadow-sm">
            🗓️ KH: {planWeek} {planDates}
          </span>
          {isLate && (
            <span className="px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-bold border-2 border-orange-300 shadow-sm animate-pulse">
              ⏰ Nộp muộn
            </span>
          )}
        </div>
      </div>

      {/* Bảng thông tin NV - Giữ canh trái như cũ hoặc tuỳ ý */}
      <table className="border-collapse border border-gray-300 text-sm shadow-sm rounded-lg overflow-hidden bg-white">
        <tbody>
          <tr>
            <td className="border border-gray-300 px-4 py-2 font-bold bg-gray-100 w-36 text-gray-700">Họ tên</td>
            <td className="border border-gray-300 px-4 py-2 text-[#1e3a5f] font-black min-w-[200px] text-base">{name}</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2 font-bold bg-gray-100 text-gray-700">Chức vụ</td>
            <td className="border border-gray-300 px-4 py-2 text-[#1e3a5f] font-bold">{role}</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2 font-bold bg-gray-100 text-gray-700">Phòng ban</td>
            <td className="border border-gray-300 px-4 py-2 text-[#1e3a5f] font-bold">{dept}</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2 font-bold bg-gray-100 text-gray-700">Ngày đánh giá</td>
            <td className="border border-gray-300 px-4 py-2 text-[#1e3a5f] font-bold">{date}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
