"use client";

/**
 * EvalCriteriaTable.tsx — Bảng 9 tiêu chí đánh giá năng lực
 * ------------------------------------------------------------
 * Vai trò: Hiển thị danh sách tiêu chí Quản lý đã điền.
 *          NV tự chấm điểm (1-5) và có thể bổ sung tiêu chí mới.
 *          NV KHÔNG được xóa tiêu chí đã có (chỉ được thêm).
 *
 * Props:
 *  criteria        — Danh sách tiêu chí (từ GAS, Quản lý đã điền)
 *  scores          — Điểm NV tự chấm { [index]: number }
 *  onScoreChange   — Callback khi NV chấm điểm
 *  onAddCriteria   — Callback khi NV thêm tiêu chí mới
 *  readonly        — true = chế độ xem (không chấm điểm)
 */

import React from 'react';
import { Plus } from 'lucide-react';

export interface CriteriaItem {
  name: string;
  expectation: string;
  source: 'hr_template' | 'mgr' | 'nv_added'; // nguồn gốc tiêu chí
}

interface EvalCriteriaTableProps {
  criteria: CriteriaItem[];
  scores: Record<number, number>;
  onScoreChange: (index: number, score: number) => void;
  onAddCriteria: (item: CriteriaItem) => void;
  readonly?: boolean;
}

// Màu nhãn nguồn gốc tiêu chí
const sourceLabel: Record<CriteriaItem['source'], { label: string; color: string }> = {
  hr_template: { label: 'Mẫu HR', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  mgr: { label: 'Quản lý', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  nv_added: { label: 'NV thêm', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

export default function EvalCriteriaTable({
  criteria, scores, onScoreChange, onAddCriteria, readonly = false
}: EvalCriteriaTableProps) {
  const [newName, setNewName] = React.useState('');
  const [newExpect, setNewExpect] = React.useState('');
  const [showAdd, setShowAdd] = React.useState(false);

  const handleAddNew = () => {
    if (!newName.trim()) return;
    onAddCriteria({ name: newName.trim(), expectation: newExpect.trim(), source: 'nv_added' });
    setNewName('');
    setNewExpect('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      {/* Tiêu đề cột */}
      <div className="grid grid-cols-[auto_1fr_2fr_auto] gap-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
        <span className="w-8 text-center">#</span>
        <span>Tiêu chí</span>
        <span>Kỳ vọng</span>
        <span className="w-28 text-center">Điểm NV (1-5)</span>
      </div>

      {/* Danh sách tiêu chí */}
      {criteria.map((c, i) => (
        <div
          key={i}
          className="grid grid-cols-[auto_1fr_2fr_auto] gap-3 items-start bg-slate-900/50 rounded-xl p-4 border border-slate-700/40 hover:border-slate-600/60 transition-colors"
        >
          {/* STT */}
          <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 font-bold text-sm shrink-0">
            {i + 1}
          </div>

          {/* Tên tiêu chí + nhãn nguồn gốc */}
          <div className="space-y-1">
            <div className="text-white font-medium text-sm">{c.name || <span className="text-slate-500 italic">Chưa đặt tên</span>}</div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sourceLabel[c.source].color}`}>
              {sourceLabel[c.source].label}
            </span>
          </div>

          {/* Kỳ vọng */}
          <div className="text-slate-400 text-sm leading-relaxed">
            {c.expectation || <span className="italic text-slate-600">Chưa mô tả kỳ vọng</span>}
          </div>

          {/* Điểm NV tự chấm — Radio 1-5 */}
          <div className="w-28">
            {readonly ? (
              <div className="text-center">
                <span className="text-2xl font-bold text-blue-400">{scores[i] || '—'}</span>
                {scores[i] && <span className="text-slate-500 text-xs">/5</span>}
              </div>
            ) : (
              <div className="flex gap-1 justify-center">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onScoreChange(i, n)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold transition-all duration-150 ${
                      scores[i] === n
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-110'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Thêm tiêu chí mới — chỉ hiện khi không readonly */}
      {!readonly && (
        <div>
          {!showAdd ? (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-green-600/50 hover:bg-green-600/5 rounded-xl text-slate-500 hover:text-green-400 flex items-center justify-center gap-2 text-sm font-medium transition-all"
            >
              <Plus size={16} /> Thêm tiêu chí đánh giá của bạn
            </button>
          ) : (
            <div className="bg-green-900/10 border border-green-600/30 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-bold text-green-400">Thêm tiêu chí mới</h4>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Tên tiêu chí..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 outline-none"
              />
              <textarea
                rows={2}
                value={newExpect}
                onChange={e => setNewExpect(e.target.value)}
                placeholder="Mô tả kỳ vọng (không bắt buộc)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 outline-none resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setNewName(''); setNewExpect(''); }}
                  className="px-4 py-1.5 text-slate-400 hover:text-white text-sm transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleAddNew}
                  disabled={!newName.trim()}
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Thêm
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {criteria.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm border-2 border-dashed border-slate-700 rounded-xl">
          Chưa có tiêu chí — Quản lý chưa điền tiêu chí đánh giá
        </div>
      )}
    </div>
  );
}
