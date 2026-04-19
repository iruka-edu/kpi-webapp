/**
 * ReportGrid.tsx — Lưới báo cáo KPI (2 Bảng tách biệt)
 * --------------------------------------------------
 * Vai trò: Hiển thị 2 bảng hoàn toàn độc lập:
 *
 *   BẢNG 1 — BÁO CÁO TUẦN TRƯỚC (reportWeek):
 *     • Lần đầu (isFirstTime=true): Lưới trống, NV tự điền đủ cột
 *     • Lần sau (isFirstTime=false): Load KH cũ từ server —
 *         - Task từ KH cũ (isPhatSinh=false): khóa tên/đơn vị/KH/trọng số, chỉ điền Thực hiện, ẨN nút Xóa
 *         - Task phát sinh (isPhatSinh=true): điền thoải mái, CÓ nút Xóa
 *     • Luôn có nút "+ Thêm việc phát sinh" ở cuối Bảng 1 (kể cả isFirstTime=false)
 *
 *   BẢNG 2 — KẾ HOẠCH TUẦN NÀY (planWeek):
 *     • Luôn trống, NV điền tự do
 */

"use client";

import React, { useEffect } from 'react';
import { useKpiStore } from '@/store/kpiStore';
import { PlusCircle, Trash2 } from 'lucide-react';

type Props = {
  onSubmit: () => void;
  isSubmitting: boolean;
  reportWeek: string;       // VD: "Tuần 15" - tuần đang báo cáo (bảng 1)
  planWeek: string;         // VD: "Tuần 16" - tuần sắp tới (bảng 2)
  invalidTaskIds: string[]; // IDs của task thiếu trường bắt buộc (highlight đỏ)
  isFirstTime?: boolean;    // true = lần đầu dùng hệ thống, tự điền từ Excel
};

/**
 * Hàm tính khoảng ngày của 1 tuần ISO từ nhãn "Tuần 15"
 * → Trả về: "07/04 - 13/04"
 */
function getWeekDateRange(weekLabel: string): string {
  const match = weekLabel.match(/\d+/);
  if (!match) return '';
  const weekNum = parseInt(match[0]);
  const year = new Date().getFullYear();
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - dayOfWeek + 1);
  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (weekNum - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(monday)} - ${fmt(sunday)}`;
}

/**
 * Header cột dùng chung cho cả 2 bảng
 */
function TableHeader() {
  return (
    <thead className="bg-[#1e3a5f] text-white">
      <tr>
        <th className="border border-gray-300 p-2 text-center w-12 whitespace-nowrap">STT</th>
        <th className="border border-gray-300 p-2 text-left min-w-[400px] whitespace-nowrap">
          Nội dung công việc <span className="text-red-400">*</span>
        </th>
        <th className="border border-gray-300 p-2 text-left min-w-[250px] whitespace-nowrap">Ghi chú tiến độ</th>
        <th className="border border-gray-300 p-2 text-center min-w-[70px] whitespace-nowrap">
          Đơn vị <span className="text-red-400">*</span>
        </th>
        <th className="border border-gray-300 p-2 text-center min-w-[120px] whitespace-nowrap">
          Số lượng (KH) <span className="text-red-400">*</span>
        </th>
        <th className="border border-gray-300 p-2 text-center min-w-[120px] bg-yellow-600 whitespace-nowrap italic">
          Thực hiện <span className="text-red-300">*</span>
        </th>
        <th className="border border-gray-300 p-2 text-center min-w-[115px] whitespace-nowrap text-[13px]">% Hoàn Thành</th>
        <th className="border border-gray-300 p-2 text-center min-w-[85px] whitespace-nowrap text-[13px]">
          Trọng số <span className="text-red-400">*</span>
        </th>
        <th className="border border-gray-300 p-2 text-center min-w-[85px] whitespace-nowrap text-[13px]">Đạt được</th>
        <th className="border border-gray-300 p-2 text-center w-10 whitespace-nowrap">Xóa</th>
      </tr>
    </thead>
  );
}

/**
 * Banner tiêu đề nằm BÊN TRÊN mỗi bảng
 */
function SectionBanner({ icon, label, hint, colorClass }: {
  icon: string;
  label: string;
  hint: string;
  colorClass: string;
}) {
  return (
    <div className={`w-full flex flex-wrap items-center gap-2 px-4 py-3 rounded-t-lg border border-b-0 border-gray-300 ${colorClass}`}>
      <span className="text-lg">{icon}</span>
      <span className="font-bold uppercase tracking-wide text-sm">{label}</span>
      <div className="flex-1" />
      <span className="text-xs opacity-75 ml-auto italic">{hint}</span>
    </div>
  );
}

export default function ReportGrid({
  onSubmit, isSubmitting, reportWeek, planWeek, invalidTaskIds, isFirstTime = false
}: Props) {
  const { tasks, updateThucHien, addTask, addOldTask, addPhatSinhTask, updateTaskField, getTotalScore, removeTask } = useKpiStore();
  const totalScore = getTotalScore();
  const oldTasks = tasks.filter(t => t.isNhiemVuCu);
  const newTasks = tasks.filter(t => !t.isNhiemVuCu);

  // Tính % KH gia quyền (chỉ từ task cũ đã có thực hiện)
  const totalWeight = oldTasks.reduce((sum, t) => sum + (t.trongSo === '' ? 0 : t.trongSo), 0);
  const percentage = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

  const weekNumMatch = reportWeek.match(/\d+/);
  const weekNum = weekNumMatch ? weekNumMatch[0] : '';

  // Lần đầu: seed 1 dòng trống cho Bảng 1
  useEffect(() => {
    if (isFirstTime && oldTasks.length === 0) {
      addOldTask();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstTime]);

  const reportDateRange = getWeekDateRange(reportWeek);
  const planDateRange   = getWeekDateRange(planWeek);

  return (
    <div className="w-full overflow-x-auto pb-24 flex flex-col gap-8">

      {/* ══════════════════════════════════════════════════════
          BẢNG 1: BÁO CÁO TUẦN TRƯỚC
      ══════════════════════════════════════════════════════ */}
      <div className="w-full">
        <SectionBanner
          icon="📋"
          label={`Báo Cáo Tuần Trước — ${reportWeek} ${reportDateRange ? `(${reportDateRange})` : ''}`}
          hint={isFirstTime
            ? 'Lần đầu: Tự điền kết quả từ Excel của bạn'
            : 'Điền số vào cột Thực hiện · Có việc phát sinh? Bấm + bên dưới'
          }
          colorClass="bg-[#1e3a5f]/10 text-[#1e3a5f]"
        />

        <table className="w-full border-collapse border border-gray-300 text-sm">
          <TableHeader />
          <tbody>
            {oldTasks.map((t, idx) => {
              const isInvalid = invalidTaskIds.includes(t.id);
              // Task kế hoạch cũ (load từ server): isPhatSinh=false → khóa tên, không xóa
              // Task lần đầu (isFirstTime): cho điền tất cả, có xóa
              // Task phát sinh: isPhatSinh=true → cho điền tất cả, có xóa
              const isEditable = isFirstTime || (t.isPhatSinh === true);

              return (
                <tr key={t.id} className={`transition-colors ${t.isPhatSinh ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'bg-blue-50/20 hover:bg-blue-50/50'}`}>
                  <td className="border border-gray-300 p-2 text-center text-black font-medium">
                    {idx + 1}
                    {/* Nhãn nhỏ đánh dấu task phát sinh */}
                    {t.isPhatSinh && (
                      <div className="text-[9px] font-bold text-amber-600 uppercase mt-0.5">phát sinh</div>
                    )}
                  </td>

                  {/* NỘI DUNG */}
                  <td className="border border-gray-300 p-1">
                    {isEditable ? (
                      <textarea
                        className={`w-full border-2 p-2 outline-none rounded-sm text-black font-medium min-h-[60px] bg-white resize-y transition
                          ${isInvalid && !t.noiDung.trim()
                            ? 'border-red-500 bg-red-50 animate-pulse'
                            : 'border-gray-300 focus:border-blue-500'
                          }`}
                        value={t.noiDung}
                        onChange={e => updateTaskField(t.id, 'noiDung', e.target.value)}
                        placeholder={t.isPhatSinh ? 'Tên việc phát sinh...' : 'Tên đầu việc tuần trước...'}
                      />
                    ) : (
                      <div className="p-2 text-black font-medium">{t.noiDung}</div>
                    )}
                  </td>

                  {/* GHI CHÚ */}
                  <td className="border border-gray-300 p-1">
                    {/* Ghi chú luôn cho điền (kể cả task cũ — để ghi chú tình hình thực tế) */}
                    <textarea
                      className="w-full border border-gray-300 p-2 outline-none focus:border-blue-500 rounded-sm text-black font-medium min-h-[60px] bg-white resize-y"
                      value={t.ghiChu}
                      onChange={e => updateTaskField(t.id, 'ghiChu', e.target.value)}
                      placeholder="Ghi chú tiến độ thực tế..."
                    />
                  </td>

                  {/* ĐƠN VỊ */}
                  <td className="border border-gray-300 p-1">
                    {isEditable ? (
                      <input
                        type="text"
                        className={`w-full text-center border-2 p-2 outline-none rounded-sm text-black font-medium bg-white transition
                          ${isInvalid && !t.donVi.trim()
                            ? 'border-red-500 bg-red-50 animate-pulse'
                            : 'border-gray-300 focus:border-blue-500'
                          }`}
                        value={t.donVi}
                        onChange={e => updateTaskField(t.id, 'donVi', e.target.value)}
                        placeholder="game"
                      />
                    ) : (
                      <div className="p-2 text-center text-black font-medium">{t.donVi}</div>
                    )}
                  </td>

                  {/* SỐ LƯỢNG KH */}
                  <td className="border border-gray-300 p-1">
                    {isEditable ? (
                      <input
                        type="number" min="0" step="1"
                        className={`w-full text-center border-2 p-2 outline-none rounded-sm font-bold text-black bg-white transition
                          ${isInvalid && (t.keHoach === '' || !t.keHoach)
                            ? 'border-red-500 bg-red-50 animate-pulse'
                            : 'border-gray-300 focus:border-blue-500'
                          }`}
                        value={t.keHoach === '' ? '' : t.keHoach}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          updateTaskField(t.id, 'keHoach', isNaN(val) ? '' : Math.max(0, val));
                        }}
                        placeholder="VD: 5"
                      />
                    ) : (
                      <div className="p-2 text-center font-bold text-black">{t.keHoach}</div>
                    )}
                  </td>

                  {/* Ô THỰC HIỆN — luôn cho nhập */}
                  <td className="border border-gray-300 p-1">
                    <input
                      type="number" min="0" step="0.5"
                      className={`w-full text-center border-2 bg-yellow-50 focus:ring-2 outline-none py-1.5 font-bold text-black text-base rounded-sm transition
                        ${isInvalid
                          ? 'border-red-500 focus:ring-red-400 bg-red-50 animate-pulse'
                          : 'border-yellow-500 focus:ring-yellow-400'
                        }`}
                      value={t.thucHien !== null ? t.thucHien : ''}
                      onChange={e => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                        updateThucHien(t.id, val);
                      }}
                      placeholder={isInvalid ? '⚠️' : '?'}
                    />
                    {isInvalid && <p className="text-red-500 text-[10px] text-center mt-0.5 font-medium">Chưa điền!</p>}
                  </td>

                  {/* % HOÀN THÀNH — tự tính */}
                  <td className="border border-gray-300 p-1">
                    <div className="bg-green-50/50 border border-green-200 rounded-sm py-2 text-center font-bold text-green-700">
                      {t.phanTram > 0 ? t.phanTram + '%' : '-'}
                    </div>
                  </td>

                  {/* TRỌNG SỐ */}
                  <td className="border border-gray-300 p-1">
                    {isEditable ? (
                      <select
                        className={`w-full text-center border-2 p-2 outline-none rounded-sm font-bold text-black bg-white transition
                          ${isInvalid && t.trongSo === ''
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 focus:border-blue-500'
                          }`}
                        value={t.trongSo}
                        onChange={e => updateTaskField(t.id, 'trongSo', e.target.value === '' ? '' : parseInt(e.target.value))}
                      >
                        <option value="" disabled>-- chọn --</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    ) : (
                      <div className="p-2 text-center text-black font-bold">{t.trongSo}</div>
                    )}
                  </td>

                  {/* ĐẠT ĐƯỢC — tự tính */}
                  <td className="border border-gray-300 p-1">
                    <div className="bg-green-50/50 border border-green-200 rounded-sm py-2 text-center font-bold text-green-700">
                      {t.datDuoc > 0 ? t.datDuoc : '-'}
                    </div>
                  </td>

                  {/* XÓA — chỉ task phát sinh hoặc lần đầu mới được xóa */}
                  <td className="border border-gray-300 p-1 text-center">
                    {isEditable ? (
                      <button
                        onClick={() => removeTask(t.id)}
                        className="text-red-400 hover:text-red-700 p-2 transition-colors"
                        title="Xóa đầu việc này"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Nút thêm đầu việc Bảng 1:
                - isFirstTime: nút "Thêm đầu việc tuần trước" (nhập y chang từ Excel)
                - isFirstTime=false: nút "Thêm việc phát sinh" (việc ngoài kế hoạch)
            */}
            <tr>
              <td colSpan={10} className="border border-dashed border-blue-300 p-2 text-center bg-blue-50/20">
                {isFirstTime ? (
                  <button
                    onClick={addOldTask}
                    className="text-[#1e3a5f] hover:text-blue-800 font-semibold flex items-center justify-center gap-2 w-full py-1 text-xs"
                  >
                    <PlusCircle size={15} className="text-[#1e3a5f]" />
                    Thêm đầu việc tuần trước
                  </button>
                ) : (
                  <button
                    onClick={addPhatSinhTask}
                    className="text-amber-700 hover:text-amber-900 font-semibold flex items-center justify-center gap-2 w-full py-1 text-xs"
                  >
                    <PlusCircle size={15} className="text-amber-600" />
                    + Thêm việc phát sinh (ngoài kế hoạch)
                  </button>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ══════════════════════════════════════════════════════
          BẢNG 2: KẾ HOẠCH TUẦN NÀY
      ══════════════════════════════════════════════════════ */}
      <div className="w-full">
        <SectionBanner
          icon="🗓️"
          label={`Kế Hoạch Tuần Tới — ${planWeek} ${planDateRange ? `(${planDateRange})` : ''}`}
          hint="Đặt mục tiêu cho tuần tới — Điền đủ các cột"
          colorClass="bg-gray-200 text-black"
        />

        <table className="w-full border-collapse border border-gray-300 text-sm">
          <TableHeader />
          <tbody>
            {newTasks.map((t, idx) => {
              const isInvalidNew = invalidTaskIds.includes(t.id);
              return (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="border border-gray-300 p-2 text-center text-sm font-bold text-black">{idx + 1}</td>
                  <td className="border border-gray-300 p-1">
                    <textarea
                      className={`w-full border-2 p-2 outline-none rounded-sm text-black font-medium placeholder:font-normal min-h-[60px] resize-y transition
                      ${isInvalidNew && !t.noiDung.trim()
                          ? 'border-red-500 bg-red-50 animate-pulse'
                          : 'border-gray-300 focus:border-blue-500'
                        }`}
                      value={t.noiDung}
                      onChange={e => updateTaskField(t.id, 'noiDung', e.target.value)}
                      placeholder="Tên đầu việc tuần tới..."
                    />
                  </td>
                  <td className="border border-gray-300 p-1">
                    <textarea
                      className="w-full border border-gray-300 p-2 outline-none focus:border-blue-500 rounded-sm text-black font-medium placeholder:font-normal min-h-[60px] resize-y"
                      value={t.ghiChu}
                      onChange={e => updateTaskField(t.id, 'ghiChu', e.target.value)}
                      placeholder="Mô tả cụ thể..."
                    />
                  </td>
                  <td className="border border-gray-300 p-1">
                    <input
                      type="text"
                      className={`w-full border-2 text-center p-2 outline-none rounded-sm text-black font-medium transition
                      ${isInvalidNew && !t.donVi.trim()
                          ? 'border-red-500 bg-red-50 animate-pulse'
                          : 'border-gray-300 focus:border-blue-500'
                        }`}
                      value={t.donVi}
                      onChange={e => updateTaskField(t.id, 'donVi', e.target.value)}
                      placeholder="game"
                    />
                  </td>
                  <td className="border border-gray-300 p-1">
                    <input
                      type="number" min="0" step="1"
                      className={`w-full border-2 text-center p-2 outline-none font-bold text-black rounded-sm transition
                      ${isInvalidNew && (t.keHoach === '' || !t.keHoach)
                          ? 'border-red-500 bg-red-50 animate-pulse'
                          : 'border-gray-300 focus:border-blue-500'
                        }`}
                      value={t.keHoach === '' ? '' : t.keHoach}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        updateTaskField(t.id, 'keHoach', isNaN(val) ? '' : Math.max(0, val));
                      }}
                      placeholder="VD: 5"
                    />
                  </td>
                  {/* Thực hiện Bảng 2: Tuần sau mới chốt */}
                  <td className="border border-gray-300 p-1">
                    <div className="bg-gray-100 border border-gray-200 rounded-sm py-2 text-center text-gray-500 italic text-[11px] font-medium leading-tight whitespace-nowrap">
                      Tuần sau chốt
                    </div>
                  </td>
                  <td className="border border-gray-300 p-1">
                    <div className="bg-gray-100 border border-gray-200 rounded-sm py-2 text-center text-gray-400 font-bold">—</div>
                  </td>
                  <td className="border border-gray-300 p-1">
                    <select
                      className={`w-full border-2 text-center p-2 outline-none rounded-sm font-bold text-black bg-white transition
                      ${isInvalidNew && t.trongSo === ''
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 focus:border-blue-500'
                        }`}
                      value={t.trongSo}
                      onChange={e => updateTaskField(t.id, 'trongSo', e.target.value === '' ? '' : parseInt(e.target.value))}
                    >
                      <option value="" disabled>-- chọn --</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </td>
                  <td className="border border-gray-300 p-1">
                    <div className="bg-gray-100 border border-gray-200 rounded-sm py-2 text-center text-gray-400 font-bold">—</div>
                  </td>
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
              );
            })}

            {/* Nút thêm đầu việc Bảng 2 */}
            <tr>
              <td colSpan={10} className="border border-dashed border-gray-300 p-3 text-center bg-gray-50/30">
                <button
                  onClick={addTask}
                  className="text-blue-600 hover:text-blue-800 font-semibold flex items-center justify-center gap-2 w-full py-1"
                >
                  <PlusCircle size={18} /> Thêm đầu việc mới
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ══════ Thanh Bottom cố định ══════ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#1e3a5f] shadow-[0_-10px_20px_-3px_rgba(0,0,0,0.12)] p-4 flex justify-end items-center z-50">
        <div className="flex flex-row items-center gap-4 sm:gap-8 mr-4 sm:mr-8">
          <div className="text-right">
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">Kết quả hoàn thành</div>
            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
              <span className="text-sm sm:text-lg font-bold text-gray-600 uppercase">Tuần {weekNum} Đạt</span>
              <span className="text-2xl sm:text-3xl font-black text-green-700">{percentage.toFixed(1)}%</span>
              <span className="text-sm font-black text-green-700 ml-0.5">KH</span>
            </div>
          </div>

          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className={`relative font-black py-3 px-6 sm:px-14 rounded-xl transform transition-all text-white text-sm sm:text-lg whitespace-nowrap z-10
              ${isSubmitting
                ? 'bg-gray-400 cursor-not-allowed scale-95 shadow-none'
                : 'bg-gradient-to-br from-blue-500 to-[#1e3a5f] hover:from-blue-400 hover:to-blue-800 hover:scale-[1.05] active:scale-95 shadow-[0_10px_25px_rgba(59,130,246,0.6)] hover:shadow-[0_15px_35px_rgba(59,130,246,0.9)] border-b-[5px] border-blue-900 border-t border-blue-400/50'
              }`}
          >
            {!isSubmitting && (
              <span className="absolute -inset-1 rounded-xl bg-blue-400 blur-lg opacity-50 animate-pulse -z-10" />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isSubmitting ? '⏳ ĐANG NỘP...' : '📤 NỘP BÁO CÁO'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
