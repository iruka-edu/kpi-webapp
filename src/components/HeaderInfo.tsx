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
  reportTo: string;
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

export default function HeaderInfo({ name, role, dept, date, reportWeek, planWeek, reportTo, isLate }: Props) {
  const reportDates = getWeekDateRange(reportWeek);
  const planDates = getWeekDateRange(planWeek);

  return (
    <div className="mb-8 mt-2">
      {/* KHỐI TIÊU ĐỀ - DÍNH (STICKY) Ở TRÊN CÙNG */}
      <div className="sticky top-0 z-50 py-4 mb-8 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all rounded-b-lg">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-[#1e3a5f] tracking-wide">
            BÁO CÁO &amp; KẾ HOẠCH TUẦN
          </h1>
          
          {/* Khối Badge căn giữa */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="px-3 py-1.5 rounded-full bg-[#1e3a5f] text-white text-xs sm:text-sm font-bold shadow-md">
              📋 BC: {reportWeek} {reportDates}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-900 text-xs sm:text-sm font-bold border-2 border-blue-200 shadow-sm">
              🗓️ KH: {planWeek} {planDates}
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
              <td className="border border-gray-300 px-4 py-2 font-bold bg-gray-100 w-36 text-gray-700">Họ tên</td>
              <td className="border border-gray-300 px-4 py-2 text-[#1e3a5f] font-black min-w-[200px] text-base">{name}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-bold bg-gray-100 text-gray-700">Báo cáo cho</td>
              <td className="border border-gray-300 px-4 py-2 text-[#1e3a5f] font-bold">{reportTo}</td>
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

        {/* Hướng dẫn làm báo cáo */}
        <div className="flex-1 min-w-[320px] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex flex-col">
          <div className="bg-[#1e3a5f]/5 border-b border-gray-200 px-3 py-1.5 flex items-center gap-1.5 shrink-0">
            <span className="text-sm">📌</span>
            <span className="font-extrabold uppercase tracking-wide text-[#1e3a5f] text-[13px]">Hướng dẫn làm báo cáo tuần</span>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3">
            <div className="border-r border-gray-200 p-3 flex flex-col">
              <div className="font-bold text-[#1e3a5f] text-sm mb-1">📋 Báo cáo tuần trước</div>
              <div className="text-[13.5px] text-gray-700 leading-relaxed">
                Điền đủ: nội dung, đơn vị, KH, <span className="bg-yellow-50 border border-yellow-500 rounded-sm px-1 font-semibold">Thực hiện</span>, trọng số.<br />
                % &amp; Điểm tự động tính.<br />
                Lần đầu: copy từ Excel cũ.<br />
                Lần sau: tự lấy KH tuần trước.
              </div>
            </div>
            <div className="border-r border-gray-200 p-3 flex flex-col">
              <div className="font-bold text-[#1e3a5f] text-sm mb-1">🗓️ Kế hoạch tuần tới</div>
              <div className="text-[13.5px] text-gray-700 leading-relaxed">
                Liệt kê đầu việc dự kiến.<br />
                Số lượng KH phải cụ thể, đo lường được.<br />
                Cột Thực hiện bỏ trống.<br />
                Đánh trọng số cao vào việc quan trọng.
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
