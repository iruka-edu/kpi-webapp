"use client";

/**
 * WorkSummaryTable.tsx — Bảng tổng kết công việc
 * -------------------------------------------------
 * Vai trò: Hiển thị danh sách đầu việc Quản lý đã giao.
 *          NV điền cột "Kết quả thực tế" cho từng mảng việc.
 *          Tên đầu việc (area/detail) là readonly với NV.
 *
 * Props:
 *  rows        — Danh sách đầu việc [{ stt, area, detail, result }]
 *  onChange    — Callback khi NV điền kết quả (chỉ cập nhật cột result)
 *  readonly    — true = chỉ xem (không điền kết quả)
 */

import React from 'react';

export interface WorkRow {
  stt: number;
  area: string;   // Mảng công việc (Quản lý đã điền — readonly với NV)
  detail: string; // Chi tiết nhiệm vụ (Quản lý đã điền — readonly với NV)
  result: string; // Kết quả thực tế (NV điền)
}

interface WorkSummaryTableProps {
  rows: WorkRow[];
  onChange?: (rows: WorkRow[]) => void;
  readonly?: boolean;
}

export default function WorkSummaryTable({ rows, onChange, readonly = false }: WorkSummaryTableProps) {
  // Cập nhật cột "result" (kết quả thực tế) — chỉ NV được điền
  const updateResult = (index: number, value: string) => {
    if (!onChange) return;
    const updated = rows.map((r, i) => i === index ? { ...r, result: value } : r);
    onChange(updated);
  };

  if (rows.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 text-sm border-2 border-dashed border-slate-700 rounded-xl">
        Quản lý chưa điền đầu việc. Vui lòng chờ Quản lý hoàn thành bước 2.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800/80 border-b border-slate-700/50">
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide w-10">#</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide w-1/4">Mảng Công Việc</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide w-1/3">Chi Tiết Nhiệm Vụ</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-blue-400 uppercase tracking-wide">
              Kết Quả Thực Tế {!readonly && <span className="text-blue-400/60 normal-case font-normal">(NV điền)</span>}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
            >
              <td className="px-4 py-3 text-slate-500 text-center font-mono">{row.stt}</td>
              {/* Mảng việc — Quản lý đã điền, readonly */}
              <td className="px-4 py-3 text-slate-300 font-medium">{row.area}</td>
              {/* Chi tiết — Quản lý đã điền, readonly */}
              <td className="px-4 py-3 text-slate-400 leading-relaxed">{row.detail}</td>
              {/* Kết quả — NV điền */}
              <td className="px-4 py-3">
                {readonly ? (
                  <span className="text-slate-300">{row.result || <span className="text-slate-600 italic">Chưa điền</span>}</span>
                ) : (
                  <textarea
                    rows={2}
                    value={row.result}
                    onChange={e => updateResult(i, e.target.value)}
                    placeholder="Điền kết quả thực tế bạn đã đạt được..."
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none text-sm transition"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
