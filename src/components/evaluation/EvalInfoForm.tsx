"use client";

/**
 * EvalInfoForm.tsx — Khối thông tin chung (readonly với NV)
 * ----------------------------------------------------------
 * Vai trò: Hiển thị thông tin HR đã điền khi tạo phiếu.
 *          NV chỉ xem, không sửa được.
 */

import React from 'react';
import { User, Building2, Briefcase, Calendar, UserCheck } from 'lucide-react';

export interface EvalInfo {
  name: string;
  dept: string;
  role: string;
  manager_name: string;
  trial_start: string;
  trial_end?: string;
  eval_date: string;
}

interface EvalInfoFormProps {
  info: EvalInfo;
}

const InfoField = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-xl border border-slate-700/40">
    <div className="text-slate-400 mt-0.5 shrink-0">{icon}</div>
    <div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-white font-medium">{value || <span className="text-slate-500 italic">Chưa có</span>}</div>
    </div>
  </div>
);

export default function EvalInfoForm({ info }: EvalInfoFormProps) {
  // Format ngày từ ISO sang dễ đọc
  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <InfoField icon={<User size={18} />} label="Họ và tên" value={info.name} />
        <InfoField icon={<Building2 size={18} />} label="Bộ phận" value={info.dept} />
        <InfoField icon={<Briefcase size={18} />} label="Vị trí / Chức danh" value={info.role} />
        <InfoField icon={<UserCheck size={18} />} label="Quản lý trực tiếp" value={info.manager_name} />
        <InfoField
          icon={<Calendar size={18} />}
          label="Thời gian thử việc"
          value={`${fmt(info.trial_start)}${info.trial_end ? ` → ${fmt(info.trial_end)}` : ''}`}
        />
        <InfoField icon={<Calendar size={18} />} label="Ngày đánh giá" value={fmt(info.eval_date)} />
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <span className="text-blue-400 text-xs">ℹ️</span>
        <span className="text-blue-400/80 text-xs">Thông tin trên do HR điền — nếu có sai sót, liên hệ HR để chỉnh sửa</span>
      </div>
    </div>
  );
}
