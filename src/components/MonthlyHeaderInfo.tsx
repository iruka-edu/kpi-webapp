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
      <div className="sticky top-0 z-50 px-4 py-3 mb-8 bg-white/95 backdrop-blur-md border border-gray-200 shadow-sm transition-all rounded-xl">
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

      {/* Bảng thông tin NV + Hướng dẫn */}
      <div className="flex flex-wrap items-stretch gap-5 mb-8">
        {/* Bảng thông tin */}
        <table className="border-collapse border border-gray-300 text-sm shadow-sm rounded-lg overflow-hidden bg-white flex-shrink-0">
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

        {/* Hướng dẫn làm báo cáo tháng */}
        <div className="flex-1 min-w-[320px] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex flex-col">
          <div className="bg-[#1e3a5f]/5 border-b border-gray-200 px-3 py-1.5 flex items-center gap-1.5 shrink-0">
            <span className="text-sm">📌</span>
            <span className="font-extrabold uppercase tracking-wide text-[#1e3a5f] text-[13px]">Hướng dẫn làm báo cáo tháng</span>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3">
            <div className="border-r border-gray-200 p-3 flex flex-col">
              <div className="font-bold text-[#1e3a5f] text-sm mb-1">📋 Báo cáo tháng trước</div>
              <div className="text-[13.5px] text-gray-700 leading-relaxed">
                Điền đủ: nội dung, đơn vị, KH, <span className="bg-yellow-50 border border-yellow-500 rounded-sm px-1 font-semibold">Thực hiện</span>, trọng số.<br />
                % &amp; Điểm tự động tính.<br />
                Lần đầu: copy từ Excel cũ.<br />
                Lần sau: tự lấy KH tháng trước.
              </div>
            </div>
            <div className="border-r border-gray-200 p-3 flex flex-col">
              <div className="font-bold text-[#1e3a5f] text-sm mb-1">🗓️ Kế hoạch tháng tới</div>
              <div className="text-[13.5px] text-gray-700 leading-relaxed">
                Liệt kê đầu việc dự kiến.<br />
                Số lượng KH phải cụ thể, đo lường được.<br />
                Cột Thực hiện bỏ trống.<br />
                Đánh trọng số cao vào các đầu việc quan trọng.
              </div>
            </div>
            <div className="p-3 flex flex-col">
              <div className="font-bold text-[#1e3a5f] text-sm mb-1">⚖️ Trọng số</div>
              <div className="text-[13.5px] text-gray-700 leading-relaxed">
                <strong>1</strong> — Việc không quá quan trọng<br />
                <strong>2</strong> — Việc bình thường<br />
                <strong>3</strong> — Việc cốt lõi, cần chú tâm
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
