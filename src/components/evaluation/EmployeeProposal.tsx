"use client";

/**
 * EmployeeProposal.tsx — Phần đề xuất của nhân viên
 * ---------------------------------------------------
 * Vai trò: NV điền 3 ô đề xuất: lương kỳ vọng, đào tạo, phản hồi.
 */

import React from 'react';
import { DollarSign, GraduationCap, MessageSquare } from 'lucide-react';

export interface ProposalData {
  salary_expectation: string;
  training_request: string;
  feedback: string;
}

interface EmployeeProposalProps {
  data: ProposalData;
  onChange?: (data: ProposalData) => void;
  readonly?: boolean;
}

export default function EmployeeProposal({ data, onChange, readonly = false }: EmployeeProposalProps) {
  const update = (field: keyof ProposalData, value: string) => {
    if (!onChange) return;
    onChange({ ...data, [field]: value });
  };

  const fields: { key: keyof ProposalData; label: string; placeholder: string; icon: React.ReactNode }[] = [
    {
      key: 'salary_expectation',
      label: 'Mức lương kỳ vọng',
      placeholder: 'VD: 15 triệu / tháng — hoặc mô tả kỳ vọng thu nhập của bạn...',
      icon: <DollarSign size={18} className="text-amber-500" />,
    },
    {
      key: 'training_request',
      label: 'Đề xuất đào tạo / phát triển',
      placeholder: 'Kỹ năng muốn được đào tạo thêm, khóa học, mentoring...',
      icon: <GraduationCap size={18} className="text-blue-600" />,
    },
    {
      key: 'feedback',
      label: 'Phản hồi về môi trường làm việc',
      placeholder: 'Điều bạn thấy tốt, điều muốn cải thiện, góp ý cho công ty...',
      icon: <MessageSquare size={18} className="text-green-600" />,
    },
  ];

  return (
    <div className="space-y-4">
      {fields.map(f => (
        <div key={f.key} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
            {f.icon}
            {f.label}
          </label>
          {readonly ? (
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
              {data[f.key] || <span className="italic text-slate-400">Không có đề xuất</span>}
            </p>
          ) : (
            <textarea
              rows={3}
              value={data[f.key]}
              onChange={e => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y text-sm transition shadow-sm"
            />
          )}
        </div>
      ))}
    </div>
  );
}
