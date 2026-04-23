"use client";

/**
 * SignatureBlock.tsx — Khối ký xác nhận
 * ----------------------------------------
 * Vai trò: Hiển thị ô "Ký xác nhận" cho NV và Quản lý.
 *          NV xác nhận bằng tên đầy đủ + click nút "Xác nhận".
 */

import React from 'react';
import { PenLine, CheckCircle } from 'lucide-react';

interface SignatureBlockProps {
  /** Người ký (NV hoặc Quản lý) */
  role: 'Nhân Viên' | 'Quản Lý Trực Tiếp';
  /** Tên hiển thị */
  name: string;
  /** Ngày ký */
  date?: string;
  /** Đã ký hay chưa */
  signed?: boolean;
  /** Callback khi click ký */
  onSign?: () => void;
  /** Cho phép ký không */
  canSign?: boolean;
}

export default function SignatureBlock({
  role, name, date, signed = false, onSign, canSign = false
}: SignatureBlockProps) {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-3 min-w-[200px]">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{role}</div>
      <div className="w-16 h-16 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
        {signed ? (
          <CheckCircle size={32} className="text-green-600" />
        ) : (
          <PenLine size={32} className="text-slate-400" />
        )}
      </div>
      <div className="text-slate-800 font-bold">{name}</div>
      {signed && date ? (
        <div className="text-xs font-medium text-slate-500">
          Đã ký ngày {new Date(date).toLocaleDateString('vi-VN')}
        </div>
      ) : canSign ? (
        <button
          type="button"
          onClick={onSign}
          className="mt-1 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          Xác nhận & Ký
        </button>
      ) : (
        <div className="text-xs text-slate-500 italic">Chờ xác nhận</div>
      )}
    </div>
  );
}
