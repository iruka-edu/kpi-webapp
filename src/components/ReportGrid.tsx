"use client";

import React, { useEffect } from 'react';
import { useKpiStore } from '@/store/kpiStore';
import { PlusCircle, Trash2 } from 'lucide-react';

export default function ReportGrid({ onSubmit, isSubmitting }: { onSubmit: () => void, isSubmitting: boolean }) {
  const { tasks, updateThucHien, addTask, updateTaskField, getTotalScore, removeTask } = useKpiStore();

  const totalScore = getTotalScore();

  return (
    <div className="w-full overflow-x-auto pb-24">
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead className="bg-[#1e3a5f] text-white">
          <tr>
            <th className="border border-gray-300 p-2 text-center w-8">STT</th>
            <th className="border border-gray-300 p-2 text-left min-w-[200px]">Nội dung công việc</th>
            <th className="border border-gray-300 p-2 text-left min-w-[150px]">Ghi chú tiến độ</th>
            <th className="border border-gray-300 p-2 text-center w-20">Đơn vị</th>
            <th className="border border-gray-300 p-2 text-center w-20">Số lượng (KH)</th>
            <th className="border border-gray-300 p-2 text-center w-20 bg-yellow-600">Thực hiện</th>
            <th className="border border-gray-300 p-2 text-center w-24">% Hoàn Thành</th>
            <th className="border border-gray-300 p-2 text-center w-20">Trọng số</th>
            <th className="border border-gray-300 p-2 text-center w-24">Đạt được</th>
            <th className="border border-gray-300 p-2 text-center w-10">Xóa</th>
          </tr>
        </thead>
        <tbody>
          {/* Phân Vùng 1: Kế hoạch tuần trước vắt sang */}
          {tasks.filter(t => t.isNhiemVuCu).map((t, idx) => (
            <tr key={t.id} className="bg-blue-50/30 hover:bg-blue-50 transition-colors">
              <td className="border border-gray-300 p-2 text-center text-black font-medium">{idx + 1}</td>
              <td className="border border-gray-300 p-2 text-black font-medium">{t.noiDung}</td>
              <td className="border border-gray-300 p-2 text-black font-medium">{t.ghiChu}</td>
              <td className="border border-gray-300 p-2 text-center text-black font-medium">{t.donVi}</td>
              <td className="border border-gray-300 p-2 text-center font-bold text-black">{t.keHoach}</td>

              {/* Ô THỰC HIỆN ĐƯỢC PHÉP CHỈNH SỬA (LỖI THOÁT) */}
              <td className="border border-gray-300 p-1">
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="w-full text-center border-2 border-yellow-500 bg-yellow-50 focus:ring-2 focus:ring-yellow-600 outline-none py-1 font-bold text-black text-base"
                  value={t.thucHien !== null ? t.thucHien : ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateThucHien(t.id, isNaN(val) ? 0 : val);
                  }}
                  placeholder="?"
                />
              </td>

              <td className="border border-gray-300 p-2 text-center font-bold text-green-700">{t.phanTram > 0 ? t.phanTram + '%' : '-'}</td>
              <td className="border border-gray-300 p-2 text-center text-black font-bold">{t.trongSo}</td>
              <td className="border border-gray-300 p-2 text-center font-bold text-green-700">{t.datDuoc > 0 ? t.datDuoc : '-'}</td>
              <td className="border border-gray-300 p-2 text-center">-</td>
            </tr>
          ))}

          {/* Dòng cách ly phân vùng */}
          <tr>
            <td colSpan={10} className="bg-gray-200 text-center font-bold p-3 text-black uppercase text-xs border border-gray-300">
              ↓ Kế Hoạch Đề Xuất Cho Tuần Tới ↓
            </td>
          </tr>

          {/* Phân Vùng 2: Lập kế hoạch mới */}
          {tasks.filter(t => !t.isNhiemVuCu).map((t, idx) => (
            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
              <td className="border border-gray-300 p-2 text-center text-sm font-bold text-black">
                {idx + 1}
              </td>
              <td className="border border-gray-300 p-1">
                <textarea 
                  className="w-full border border-gray-300 p-2 outline-none focus:border-blue-500 rounded-sm text-black font-medium placeholder:font-normal min-h-[60px] resize-y" 
                  value={t.noiDung} 
                  onChange={e => updateTaskField(t.id, 'noiDung', e.target.value)} 
                  placeholder="Tên công việc (có thể xuống dòng)..." 
                />
              </td>
              <td className="border border-gray-300 p-1">
                <textarea 
                  className="w-full border border-gray-300 p-2 outline-none focus:border-blue-500 rounded-sm text-black font-medium placeholder:font-normal min-h-[60px] resize-y" 
                  value={t.ghiChu} 
                  onChange={e => updateTaskField(t.id, 'ghiChu', e.target.value)} 
                  placeholder="Ghi chú chi tiết..." 
                />
              </td>
              <td className="border border-gray-300 p-1">
                <input 
                  type="text" 
                  className="w-full border border-gray-300 text-center p-2 outline-none focus:border-blue-500 rounded-sm text-black font-medium" 
                  value={t.donVi} 
                  onChange={e => updateTaskField(t.id, 'donVi', e.target.value)} 
                  placeholder="game/api..."
                />
              </td>
              <td className="border border-gray-300 p-1">
                <input 
                  type="number" 
                  min="1"
                  step="1"
                  className="w-full border border-gray-300 text-center p-2 outline-none focus:border-blue-500 font-bold text-black rounded-sm" 
                  value={t.keHoach} 
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    updateTaskField(t.id, 'keHoach', isNaN(val) ? 1 : Math.max(1, val));
                  }} 
                />
              </td>

              {/* Đóng băng ô Thực hiện ở phần KH mới */}
              <td className="border border-gray-300 p-1 bg-gray-100 text-center text-gray-700 font-medium italic text-[11px]">
                (Chốt vào tuần sau)
              </td>

              <td className="border border-gray-300 p-2 text-center bg-gray-100 text-gray-700 font-bold">-</td>
              <td className="border border-gray-300 p-1">
                <select
                  className="w-full border border-gray-300 text-center p-2 outline-none focus:border-blue-500 rounded-sm text-black font-bold bg-white"
                  value={t.trongSo}
                  onChange={e => updateTaskField(t.id, 'trongSo', parseInt(e.target.value))}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </td>
              <td className="border border-gray-300 p-2 text-center bg-gray-100 text-gray-700 font-bold">-</td>
              <td className="border border-gray-300 p-1 text-center">
                 {/* Chỉ cho phép xóa nếu không phải nhiệm vụ cũ */}
                 <button 
                   onClick={() => removeTask(t.id)}
                   className="text-red-400 hover:text-red-700 p-2 transition-colors"
                   title="Xóa đầu việc này"
                 >
                   <Trash2 size={16} />
                 </button>
              </td>
            </tr>
          ))}

          {/* Nút thêm việc */}
          <tr>
            <td colSpan={10} className="border border-gray-300 p-3 text-center bg-blue-50/30">
              <button onClick={addTask} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center justify-center gap-2 w-full py-1">
                <PlusCircle size={18} /> Điền thêm Đầu Việc mới
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Thanh công cụ Submit Cố định ở đáy */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] p-4 flex justify-between items-center z-50">
        <div className="text-lg px-8 text-black font-bold">
          KPI Đạt Tuần Trước: <strong className="text-3xl text-green-700 ml-2">{totalScore.toFixed(2)}</strong> <span className="text-sm text-black font-bold ml-1">Điểm</span>
        </div>
        <div className="px-8 flex gap-4">
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className={`font-bold py-3 px-8 rounded shadow-lg transform transition ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1e3a5f] hover:bg-blue-800 text-white hover:scale-105 animate-pulse'}`}>
            {isSubmitting ? '⏳ ĐANG LƯU DATA...' : '📤 NỘP BÁO CÁO'}
          </button>
        </div>
      </div>

    </div>
  );
}
