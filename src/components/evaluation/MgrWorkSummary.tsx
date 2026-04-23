"use client";

/**
 * MgrWorkSummary.tsx — Quản lý điền đầu việc + tiêu chí đánh giá
 * ----------------------------------------------------------------
 * Vai trò: Quản lý điền danh sách công việc đã giao cho NV và
 *          các tiêu chí đánh giá năng lực (dựa trên mẫu HR hoặc tự tạo).
 *
 * Luồng:
 *  1. Load phiếu từ GAS (có thể có tiêu chí mẫu HR đã điền)
 *  2. Quản lý thêm/sửa/xóa đầu việc giao (mảng công việc + chi tiết)
 *  3. Quản lý chỉnh sửa tiêu chí (thêm/sửa/xóa tự do — không bị hạn chế)
 *  4. Submit → POST /api/evaluation/mgr-fill → Bot gửi NV + CC HR
 *
 * Note: Quản lý được toàn quyền chỉnh sửa tiêu chí dù HR đã tạo mẫu
 */

import React, { useState } from 'react';
import { Plus, Trash2, Send, Loader2, CheckCircle } from 'lucide-react';
import type { CriteriaItem } from './EvalCriteriaTable';

export interface WorkItem {
  stt: number;
  area: string;    // Mảng công việc
  detail: string;  // Chi tiết nhiệm vụ / kỳ vọng
}

interface MgrWorkSummaryProps {
  evalId: string;
  employeeName: string;
  dashboardPassword: string;
  /** Tiêu chí mẫu HR đã điền (có thể rỗng) */
  hrCriteria?: CriteriaItem[];
}

const emptyWork = (stt: number): WorkItem => ({ stt, area: '', detail: '' });
const emptyCrit = (): CriteriaItem => ({ name: '', expectation: '', source: 'mgr' });

export default function MgrWorkSummary({
  evalId, employeeName, dashboardPassword, hrCriteria = []
}: MgrWorkSummaryProps) {
  const [works, setWorks] = useState<WorkItem[]>([emptyWork(1)]);
  const [criteria, setCriteria] = useState<CriteriaItem[]>(
    hrCriteria.length > 0 ? hrCriteria.map(c => ({ ...c })) : [emptyCrit()]
  );
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Đầu việc ─────────────────────────────────────────────────────
  const addWork = () => setWorks(prev => [...prev, emptyWork(prev.length + 1)]);
  const removeWork = (i: number) => setWorks(prev => prev.filter((_, idx) => idx !== i).map((w, idx) => ({ ...w, stt: idx + 1 })));
  const updateWork = (i: number, field: keyof WorkItem, value: string) =>
    setWorks(prev => prev.map((w, idx) => idx === i ? { ...w, [field]: value } : w));

  // ── Tiêu chí ─────────────────────────────────────────────────────
  const addCrit = () => setCriteria(prev => [...prev, emptyCrit()]);
  const removeCrit = (i: number) => setCriteria(prev => prev.filter((_, idx) => idx !== i));
  const updateCrit = (i: number, field: keyof CriteriaItem, value: string) =>
    setCriteria(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate tối thiểu: 1 đầu việc có area, 1 tiêu chí có tên
    const validWorks = works.filter(w => w.area.trim());
    const validCrit = criteria.filter(c => c.name.trim());
    if (validWorks.length === 0) {
      setStatus('error');
      setErrorMsg('Vui lòng điền ít nhất 1 mảng công việc đã giao');
      return;
    }
    if (validCrit.length === 0) {
      setStatus('error');
      setErrorMsg('Vui lòng điền ít nhất 1 tiêu chí đánh giá');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/evaluation/mgr-fill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-auth': dashboardPassword,
        },
        body: JSON.stringify({
          eval_id: evalId,
          work_items: validWorks,
          criteria: validCrit,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Lỗi khi gửi');

      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  // ── Màn hình thành công ───────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <CheckCircle size={64} className="text-green-400" />
        <h2 className="text-2xl font-bold text-white">Đã gửi cho nhân viên!</h2>
        <p className="text-slate-400 max-w-md">
          Bot Discord đã gửi link form đến <strong className="text-white">{employeeName}</strong> để tự đánh giá.
          HR đã được CC thông báo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── PHẦN 1: ĐẦU VIỆC ĐÃ GIAO ── */}
      <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">1</span>
              Công Việc Đã Giao
            </h2>
            <p className="text-xs text-slate-500 mt-1 ml-9">
              Điền đầy đủ các mảng việc + chi tiết nhiệm vụ đã giao cho <strong className="text-slate-300">{employeeName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={addWork}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-xl text-sm font-semibold transition-colors border border-blue-600/30"
          >
            <Plus size={16} /> Thêm đầu việc
          </button>
        </div>

        <div className="space-y-3">
          {works.map((w, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_2fr_auto] gap-3 items-start bg-slate-900/50 p-4 rounded-xl border border-slate-700/40">
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 font-bold text-sm shrink-0 mt-1">
                {w.stt}
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Mảng công việc</label>
                <input
                  type="text"
                  value={w.area}
                  onChange={e => updateWork(i, 'area', e.target.value)}
                  placeholder="VD: Thiết kế UI / Phát triển tính năng..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Chi tiết nhiệm vụ & Kỳ vọng</label>
                <textarea
                  rows={2}
                  value={w.detail}
                  onChange={e => updateWork(i, 'detail', e.target.value)}
                  placeholder="Mô tả chi tiết công việc, tiêu chuẩn hoàn thành, kỳ vọng..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
              {works.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWork(i)}
                  className="mt-7 p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── PHẦN 2: TIÊU CHÍ ĐÁNH GIÁ ── */}
      <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-sm font-bold">2</span>
              Tiêu Chí Đánh Giá Năng Lực
            </h2>
            {hrCriteria.length > 0 && (
              <p className="text-xs text-purple-400/70 mt-1 ml-9">
                ✨ HR đã tạo {hrCriteria.length} tiêu chí mẫu — bạn có thể sửa/xóa/thêm tự do
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={addCrit}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-xl text-sm font-semibold transition-colors border border-purple-600/30"
          >
            <Plus size={16} /> Thêm tiêu chí
          </button>
        </div>

        <div className="space-y-3">
          {criteria.map((c, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_2fr_auto] gap-3 items-start bg-slate-900/50 p-4 rounded-xl border border-slate-700/40">
              <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0 mt-1.5">
                {i + 1}
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Tên tiêu chí</label>
                <input
                  type="text"
                  value={c.name}
                  onChange={e => updateCrit(i, 'name', e.target.value)}
                  placeholder="VD: Kiến thức chuyên môn"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:border-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Mô tả kỳ vọng</label>
                <textarea
                  rows={2}
                  value={c.expectation}
                  onChange={e => updateCrit(i, 'expectation', e.target.value)}
                  placeholder="Kỳ vọng cụ thể cho tiêu chí này..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:border-purple-500 outline-none resize-none"
                />
              </div>
              {criteria.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCrit(i)}
                  className="mt-7 p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── LỖI ── */}
      {status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-red-400 text-sm">
          ❌ {errorMsg}
        </div>
      )}

      {/* ── SUBMIT ── */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/20"
        >
          {status === 'submitting' ? (
            <><Loader2 size={18} className="animate-spin" /> Đang gửi...</>
          ) : (
            <><Send size={18} /> Gửi Form Cho Nhân Viên</>
          )}
        </button>
      </div>
    </form>
  );
}
