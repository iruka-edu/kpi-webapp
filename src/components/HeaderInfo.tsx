/**
 * HeaderInfo.tsx — Khối thông tin nhân viên (Phần trên cùng)
 * -----------------------------------------------------------
 * Vai trò: Hiển thị thông tin NV từ URL params, không cho chỉnh sửa.
 * Cải tiến so với cũ:
 *   - Thêm badge tuần báo cáo + tuần kế hoạch
 *   - Badge "Nộp muộn" màu cam nếu is_late=true
 *   - Thiết kế ngăn nắp hơn
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

export default function HeaderInfo({ name, role, dept, date, reportWeek, planWeek, isLate }: Props) {
  return (
    <div className="mb-6 mt-4">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold uppercase text-black">BÁO CÁO &amp; KẾ HOẠCH TUẦN</h1>
        {/* Badge tuần báo cáo */}
        <span className="px-3 py-1 rounded-full bg-[#1e3a5f] text-white text-xs font-bold">
          📋 BC: {reportWeek}
        </span>
        {/* Badge tuần kế hoạch */}
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-300">
          🗓️ KH: {planWeek}
        </span>
        {/* Badge nộp muộn */}
        {isLate && (
          <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-300 animate-pulse">
            ⏰ Nộp muộn
          </span>
        )}
      </div>

      {/* Bảng thông tin NV */}
      <table className="border-collapse border border-gray-600 text-sm">
        <tbody>
          <tr>
            <td className="border border-gray-600 px-3 py-2 font-bold bg-gray-200 w-36 text-black">Họ tên</td>
            <td className="border border-gray-600 px-3 py-2 text-blue-800 font-bold min-w-[200px]">{name}</td>
          </tr>
          <tr>
            <td className="border border-gray-600 px-3 py-2 font-bold bg-gray-200 text-black">Báo cáo cho</td>
            <td className="border border-gray-600 px-3 py-2 text-blue-800 font-bold">{role}</td>
          </tr>
          <tr>
            <td className="border border-gray-600 px-3 py-2 font-bold bg-gray-200 text-black">Phòng</td>
            <td className="border border-gray-600 px-3 py-2 text-blue-800 font-bold">{dept}</td>
          </tr>
          <tr>
            <td className="border border-gray-600 px-3 py-2 font-bold bg-gray-200 text-black">Ngày đánh giá</td>
            <td className="border border-gray-600 px-3 py-2 text-blue-800 font-bold">{date}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
