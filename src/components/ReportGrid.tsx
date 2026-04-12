/**
 * ReportGrid.tsx — Lưới báo cáo KPI (Khối 2 + 3)
 * --------------------------------------------------
 * Vai trò: Hiển thị 2 phân vùng:
 *   Phân vùng 1: Đầu việc tuần trước → NV chỉ được điền cột "Thực hiện"
 *   Phân vùng 2: Lập kế hoạch tuần tới → NV điền tự do
 *
 * Cải tiến so với cũ:
 *   - Tiêu đề phân vùng có tuần cụ thể (reportWeek / planWeek)
 *   - Highlight đỏ ô Thực hiện bị thiếu khi validate
 *   - Thanh đáy (Bottom bar) rõ ràng hơn
 */

"use client";

import React from 'react';
import { useKpiStore } from '@/store/kpiStore';
import { PlusCircle, Trash2 } from 'lucide-react';

type Props = {
  onSubmit: () => void;
  isSubmitting: boolean;
  reportWeek: string;   // Tuần đang báo cáo (phân vùng 1)
  planWeek: string;     // Tuần sắp tới (phân vùng 2)
  invalidTaskIds: string[]; // IDs của task thiếu Thực hiện (highlight đỏ)
};

export default function ReportGrid({ onSubmit, isSubmitting, reportWeek, planWeek, invalidTaskIds }: Props) {
  const { tasks, updateThucHien, addTask, updateTaskField, getTotalScore, removeTask } = useKpiStore();

  const totalScore   = getTotalScore();
  const oldTasks     = tasks.filter(t => t.isNhiemVuCu);
  const newTasks     = tasks.filter(t => !t.isNhiemVuCu);

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

          {/* ────────────── PHÂN VÙNG 1: Tuần trước ────────────── */}
          {oldTasks.length > 0 && (
            <tr>
              <td colSpan={10} className="bg-[#1e3a5f]/10 text-center font-bold p-2 text-[#1e3a5f] text-xs border border-gray-300 uppercase tracking-wide">
                📋 Chốt kết quả — {reportWeek} (Điền vào cột Thực hiện)
              </td>
            </tr>
          )}
          {oldTasks.map((t, idx) => {
            const isInvalid = invalidTaskIds.includes(t.id);
            return (
              <tr key={t.id} className="bg-blue-50/30 hover:bg-blue-50 transition-colors">
                <td className="border border-gray-300 p-2 text-center text-black font-medium">{idx + 1}</td>
                <td className="border border-gray-300 p-2 text-black font-medium">{t.noiDung}</td>
                <td className="border border-gray-300 p-2 text-black font-medium">{t.ghiChu}</td>
                <td className="border border-gray-300 p-2 text-center text-black font-medium">{t.donVi}</td>
                <td className="border border-gray-300 p-2 text-center font-bold text-black">{t.keHoach}</td>

                {/* Ô THỰC HIỆN — chỉ ô này được nhập, highlight đỏ nếu thiếu */}
                <td className="border border-gray-300 p-1">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className={`w-full text-center border-2 bg-yellow-50 focus:ring-2 outline-none py-1 font-bold text-black text-base rounded-sm transition
                      ${isInvalid
                        ? 'border-red-500 focus:ring-red-400 bg-red-50 animate-pulse'
                        : 'border-yellow-500 focus:ring-yellow-600'
                      }`}
                    value={t.thucHien !== null ? t.thucHien : ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      updateThucHien(t.id, isNaN(val) ? 0 : val);
                    }}
                    placeholder={isInvalid ? '⚠️' : '?'}
                  />
                  {isInvalid && <p className="text-red-500 text-[10px] text-center mt-0.5">Chưa điền!</p>}
                </td>

                <td className="border border-gray-300 p-2 text-center font-bold text-green-700">
                  {t.phanTram > 0 ? t.phanTram + '%' : '-'}
                </td>
                <td className="border border-gray-300 p-2 text-center text-black font-bold">{t.trongSo}</td>
                <td className="border border-gray-300 p-2 text-center font-bold text-green-700">
                  {t.datDuoc > 0 ? t.datDuoc : '-'}
                </td>
                <td className="border border-gray-300 p-2 text-center text-gray-400">—</td>
              </tr>
            );
          })}

          {/* ────────────── PHÂN VÙNG 2: Tuần tới ────────────── */}
          <tr>
            <td colSpan={10} className="bg-gray-200 text-center font-bold p-3 text-black uppercase text-xs border border-gray-300">
              🗓️ Kế Hoạch Đề Xuất — {planWeek} (Điền tất cả các cột)
            </td>
          </tr>

          {newTasks.map((t, idx) => (
            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
              <td className="border border-gray-300 p-2 text-center text-sm font-bold text-black">{idx + 1}</td>
              <td className="border border-gray-300 p-1">
                <textarea
                  className="w-full border border-gray-300 p-2 outline-none focus:border-blue-500 rounded-sm text-black font-medium placeholder:font-normal min-h-[60px] resize-y"
                  value={t.noiDung}
                  onChange={e => updateTaskField(t.id, 'noiDung', e.target.value)}
                  placeholder="Tên công việc..."
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
              <td className="border border-gray-300 p-1 bg-gray-100 text-center text-gray-500 font-medium italic text-[11px]">
                (Tuần sau chốt)
              </td>
              <td className="border border-gray-300 p-2 text-center bg-gray-100 text-gray-400 font-bold">—</td>
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
              <td className="border border-gray-300 p-2 text-center bg-gray-100 text-gray-400 font-bold">—</td>
              <td className="border border-gray-300 p-1 text-center">
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

          {/* Nút thêm đầu việc */}
          <tr>
            <td colSpan={10} className="border border-gray-300 p-3 text-center bg-blue-50/30">
              <button onClick={addTask} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center justify-center gap-2 w-full py-1">
                <PlusCircle size={18} /> Thêm đầu việc mới
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Thanh Bottom cố định */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#1e3a5f] shadow-[0_-10px_20px_-3px_rgba(0,0,0,0.12)] p-4 flex justify-between items-center z-50">
        <div className="px-8">
          <div className="text-xs text-gray-500 font-medium">KPI TUẦN TRƯỚC</div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-green-700">{totalScore.toFixed(2)}</span>
            <span className="text-sm text-gray-600 font-bold mb-1">điểm</span>
          </div>
        </div>
        <div className="px-8">
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className={`font-bold py-3 px-10 rounded-xl shadow-lg transform transition-all text-white
              ${isSubmitting
                ? 'bg-gray-400 cursor-not-allowed scale-95'
                : 'bg-[#1e3a5f] hover:bg-blue-800 hover:scale-105 active:scale-95'
              }`}
          >
            {isSubmitting ? '⏳ ĐANG NỘP...' : '📤 NỘP BÁO CÁO'}
          </button>
        </div>
      </div>
    </div>
  );
}
