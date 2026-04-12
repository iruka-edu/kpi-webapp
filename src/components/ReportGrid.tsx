/**
 * ReportGrid.tsx — Lưới báo cáo KPI (2 Bảng tách biệt)
 * --------------------------------------------------
 * Vai trò: Hiển thị 2 bảng hoàn toàn độc lập:
 *
 *   BẢNG 1 — BÁO CÁO TUẦN TRƯỚC (reportWeek):
 *     • Lần đầu (isFirstTime=true): Lưới trống, NV tự điền từ Excel (đủ cột)
 *     • Lần sau (isFirstTime=false): Load data server, chỉ cho điền cột "Thực hiện"
 *
 *   BẢNG 2 — KẾ HOẠCH TUẦN NÀY (planWeek):
 *     • Luôn trống, NV điền tự do
 *
 *   Mỗi bảng có: Banner tiêu đề + Header cột riêng + Dữ liệu riêng
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
  invalidTaskIds: string[]; // IDs của task thiếu Thực hiện (highlight đỏ)
  isFirstTime?: boolean;    // true = lần đầu dùng hệ thống, tự điền từ Excel
};

/**
 * Hàm tính khoảng ngày của 1 tuần ISO từ nhãn "Tuần 15"
 * → Trả về: "07/04 - 13/04" (Thứ Hai đến Chủ Nhật)
 */
function getWeekDateRange(weekLabel: string): string {
  const match = weekLabel.match(/\d+/);
  if (!match) return '';
  const weekNum = parseInt(match[0]);
  const year = new Date().getFullYear();

  // ISO week: Tuần 1 chứa ngày 4/1, thứ Hai là ngày đầu tuần
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Chuyển Chủ Nhật từ 0 → 7
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - dayOfWeek + 1);

  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (weekNum - 1) * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  return `${fmt(monday)} - ${fmt(sunday)}`;
}

/**
 * Header cột dùng chung cho cả 2 bảng
 * Mỗi bảng đều có dòng header: STT | Nội dung | Ghi chú | Đơn vị | Số lượng (KH) | Thực hiện | % HT | Trọng số | Đạt được | Xóa
 */
function TableHeader() {
  return (
    <thead className="bg-[#1e3a5f] text-white">
      <tr>
        <th className="border border-gray-300 p-2 text-center w-12 whitespace-nowrap">STT</th>
        <th className="border border-gray-300 p-2 text-left min-w-[400px] whitespace-nowrap">Nội dung công việc</th>
        <th className="border border-gray-300 p-2 text-left min-w-[250px] whitespace-nowrap">Ghi chú tiến độ</th>
        <th className="border border-gray-300 p-2 text-center min-w-[100px] whitespace-nowrap">Đơn vị</th>
        <th className="border border-gray-300 p-2 text-center min-w-[120px] whitespace-nowrap">Số lượng (KH)</th>
        <th className="border border-gray-300 p-2 text-center min-w-[120px] bg-yellow-600 whitespace-nowrap italic">Thực hiện</th>
        <th className="border border-gray-300 p-2 text-center min-w-[140px] whitespace-nowrap">% Hoàn Thành</th>
        <th className="border border-gray-300 p-2 text-center min-w-[100px] whitespace-nowrap">Trọng số</th>
        <th className="border border-gray-300 p-2 text-center min-w-[100px] whitespace-nowrap">Đạt được</th>
        <th className="border border-gray-300 p-2 text-center w-10 whitespace-nowrap">Xóa</th>
      </tr>
    </thead>
  );
}

/**
 * Banner tiêu đề nằm BÊN TRÊN mỗi bảng (không phải dòng trong tbody nữa)
 * Hiển thị: Icon | Label | Tuần X | Khoảng ngày
 */
function SectionBanner({ icon, label, hint, colorClass }: {
  icon: string;
  label: string;
  hint: string;
  colorClass: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 px-4 py-3 rounded-t-lg border border-b-0 border-gray-300 ${colorClass}`}>
      <span className="text-lg">{icon}</span>
      <span className="font-bold uppercase tracking-wide text-sm">{label}</span>
      <div className="flex-1" /> {/* Đẩy hint về bên phải hoặc tạo khoảng trống */}
      <span className="text-xs opacity-75 ml-auto italic">{hint}</span>
    </div>
  );
}

export default function ReportGrid({
  onSubmit, isSubmitting, reportWeek, planWeek, invalidTaskIds, isFirstTime = false
}: Props) {
  const { tasks, updateThucHien, addTask, addOldTask, updateTaskField, getTotalScore, removeTask } = useKpiStore();
  const totalScore = getTotalScore();
  const oldTasks = tasks.filter(t => t.isNhiemVuCu);
  const newTasks = tasks.filter(t => !t.isNhiemVuCu);

  // ── Tính toán số liệu tổng hợp (% KH gia quyền) ──────────
  const totalWeight = oldTasks.reduce((sum, t) => sum + t.trongSo, 0);
  const percentage  = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
  
  // Tách số tuần từ "Tuần 15" -> "15"
  const weekNumMatch = reportWeek.match(/\d+/);
  const weekNum = weekNumMatch ? weekNumMatch[0] : '';

  // Lần đầu: tự seed 1 dòng trống cho bảng 1
  // → NV thấy ngay chỗ điền, không bị trống hoàn toàn
  useEffect(() => {
    if (isFirstTime && oldTasks.length === 0) {
      addOldTask();
    }
  // Chỉ chạy đúng 1 lần khi render đầu tiên
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstTime]);

  const reportDateRange = getWeekDateRange(reportWeek);
  const planDateRange   = getWeekDateRange(planWeek);

  return (
    <div className="w-full overflow-x-auto pb-24 flex flex-col gap-8">

      {/* ══════════════════════════════════════════════════════
          BẢNG 1: BÁO CÁO TUẦN TRƯỚC
          Banner tiêu đề nằm ngay bên trên bảng
      ══════════════════════════════════════════════════════ */}
      <div className="inline-block min-w-full align-top">
        {/* Banner tiêu đề bảng 1 */}
        <SectionBanner
          icon="📋"
          label="Báo Cáo Tuần Trước"
          hint={isFirstTime ? "Lần đầu: Tự điền kết quả từ Excel của bạn" : "Điền số vào cột Thực hiện để chốt kết quả"}
          colorClass="bg-[#1e3a5f]/10 text-[#1e3a5f]"
        />

        {/* Bảng 1 */}
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <TableHeader />
          <tbody>
            {oldTasks.map((t, idx) => {
              const isInvalid = invalidTaskIds.includes(t.id);
              return (
                <tr key={t.id} className="bg-blue-50/20 hover:bg-blue-50/50 transition-colors">
                  <td className="border border-gray-300 p-2 text-center text-black font-medium">{idx + 1}</td>

                  {/* NỘI DUNG — editable nếu lần đầu, read-only nếu lần sau */}
                  <td className="border border-gray-300 p-1">
                    {isFirstTime ? (
                      <textarea
                        className="w-full border border-gray-300 p-2 outline-none focus:border-blue-500 rounded-sm text-black font-medium min-h-[60px] bg-white resize-y"
                        value={t.noiDung}
                        onChange={e => updateTaskField(t.id, 'noiDung', e.target.value)}
                        placeholder="Tên đầu việc tuần trước..."
                      />
                    ) : (
                      <div className="p-2 text-black font-medium">{t.noiDung}</div>
                    )}
                  </td>

                  {/* GHI CHÚ */}
                  <td className="border border-gray-300 p-1">
                    {isFirstTime ? (
                      <textarea
                        className="w-full border border-gray-300 p-2 outline-none focus:border-blue-500 rounded-sm text-black font-medium min-h-[60px] bg-white resize-y"
                        value={t.ghiChu}
                        onChange={e => updateTaskField(t.id, 'ghiChu', e.target.value)}
                        placeholder="Ghi chú..."
                      />
                    ) : (
                      <div className="p-2 text-black font-medium">{t.ghiChu}</div>
                    )}
                  </td>

                  {/* ĐƠN VỊ */}
                  <td className="border border-gray-300 p-1">
                    {isFirstTime ? (
                      <input
                        type="text"
                        className="w-full text-center border border-gray-300 p-2 outline-none focus:border-blue-500 rounded-sm text-black font-medium bg-white"
                        value={t.donVi}
                        onChange={e => updateTaskField(t.id, 'donVi', e.target.value)}
                        placeholder="game..."
                      />
                    ) : (
                      <div className="p-2 text-center text-black font-medium">{t.donVi}</div>
                    )}
                  </td>

                  {/* SỐ LƯỢNG KH */}
                  <td className="border border-gray-300 p-1">
                    {isFirstTime ? (
                      <input
                        type="number" min="1" step="1"
                        className="w-full text-center border border-gray-300 p-2 outline-none focus:border-blue-500 rounded-sm font-bold text-black bg-white"
                        value={t.keHoach}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          updateTaskField(t.id, 'keHoach', isNaN(val) ? 1 : Math.max(1, val));
                        }}
                      />
                    ) : (
                      <div className="p-2 text-center font-bold text-black">{t.keHoach}</div>
                    )}
                  </td>

                  {/* Ô THỰC HIỆN — luôn cho nhập, highlight đỏ nếu thiếu khi validate */}
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
                        const val = parseFloat(e.target.value);
                        updateThucHien(t.id, isNaN(val) ? 0 : val);
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
                    {isFirstTime ? (
                      <select
                        className="w-full text-center border border-gray-300 p-2 outline-none focus:border-blue-500 rounded-sm font-bold text-black bg-white"
                        value={t.trongSo}
                        onChange={e => updateTaskField(t.id, 'trongSo', parseInt(e.target.value))}
                      >
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

                  {/* XÓA — chỉ lần đầu mới cho xóa */}
                  <td className="border border-gray-300 p-1 text-center">
                    {isFirstTime ? (
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

            {/* Nút thêm dòng cho bảng 1 — chỉ hiện lần đầu */}
            {isFirstTime && (
              <tr>
                <td colSpan={10} className="border border-dashed border-blue-300 p-2 text-center bg-blue-50/20">
                  <button
                    onClick={addOldTask}
                    className="text-[#1e3a5f] hover:text-blue-800 font-semibold flex items-center justify-center gap-2 w-full py-1 text-xs"
                  >
                    <PlusCircle size={15} className="text-[#1e3a5f]" />
                    Thêm đầu việc tuần trước
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ══════════════════════════════════════════════════════
          BẢNG 2: KẾ HOẠCH TUẦN NÀY
          Banner tiêu đề nằm ngay bên trên bảng
      ══════════════════════════════════════════════════════ */}
      <div className="inline-block min-w-full align-top">
        {/* Banner tiêu đề bảng 2 */}
        <SectionBanner
          icon="🗓️"
          label="Kế Hoạch Tuần Này"
          hint="Đặt mục tiêu cho tuần tới — Điền đủ các cột"
          colorClass="bg-gray-200 text-black"
        />

        {/* Bảng 2 */}
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <TableHeader />
          <tbody>
            {newTasks.map((t, idx) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="border border-gray-300 p-2 text-center text-sm font-bold text-black">{idx + 1}</td>
                <td className="border border-gray-300 p-1">
                  <textarea
                    className="w-full border border-gray-300 p-2 outline-none focus:border-blue-500 rounded-sm text-black font-medium placeholder:font-normal min-h-[60px] resize-y"
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
                    className="w-full border border-gray-300 text-center p-2 outline-none focus:border-blue-500 rounded-sm text-black font-medium"
                    value={t.donVi}
                    onChange={e => updateTaskField(t.id, 'donVi', e.target.value)}
                    placeholder="game/api..."
                  />
                </td>
                <td className="border border-gray-300 p-1">
                  <input
                    type="number" min="1" step="1"
                    className="w-full border border-gray-300 text-center p-2 outline-none focus:border-blue-500 font-bold text-black rounded-sm"
                    value={t.keHoach}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      updateTaskField(t.id, 'keHoach', isNaN(val) ? 1 : Math.max(1, val));
                    }}
                  />
                </td>
                <td className="border border-gray-300 p-1">
                  <div className="bg-gray-100 border border-gray-200 rounded-sm py-2 text-center text-gray-400 font-bold">
                    —
                  </div>
                </td>
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
                <td className="border border-gray-300 p-1">
                  <div className="bg-gray-100 border border-gray-200 rounded-sm py-2 text-center text-gray-400 font-bold">
                    —
                  </div>
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
            ))}

            {/* Nút thêm đầu việc bảng 2 */}
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
            className={`font-black py-3 px-6 sm:px-12 rounded-xl shadow-lg transform transition-all text-white text-sm sm:text-base whitespace-nowrap
              ${isSubmitting
                ? 'bg-gray-400 cursor-not-allowed scale-95'
                : 'bg-[#1e3a5f] hover:bg-blue-800 hover:scale-[1.03] active:scale-95 border-b-4 border-blue-900'
              }`}
          >
            {isSubmitting ? '⏳ ĐANG NỘP...' : '📤 NỘP BÁO CÁO'}
          </button>
        </div>
      </div>
    </div>
  );
}
