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
  /** Discord ID của Quản lý — dùng để verify HMAC token */
  discordId: string;
  /** HMAC token 72h từ link DM Bot Discord */
  token: string;
  /** Tiêu chí mẫu HR đã điền (có thể rỗng) */
  hrCriteria?: CriteriaItem[];
}

const emptyWork = (stt: number): WorkItem => ({ stt, area: '', detail: '' });
const emptyCrit = (): CriteriaItem => ({ name: '', expectation: '', source: 'mgr' });

export default function MgrWorkSummary({
  evalId, employeeName, discordId, token, hrCriteria = []
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eval_id: evalId,
          discord_id: discordId,
          token,
          // Field đúng theo GAS expect — trước đây tên 'work_items' bị mất khi GAS save
          work_summary: validWorks,
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
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <CheckCircle size={64} className="text-[#16a34a]" />
        <h2 className="text-2xl font-bold text-[#1e3a5f]">Đã gửi cho nhân viên!</h2>
        <p className="text-[#6b7280] max-w-md">
          Bot Discord đã gửi link form đến <strong className="text-[#1e3a5f]">{employeeName}</strong> để tự đánh giá.
          HR đã được CC thông báo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">

      {/* ── PHẦN 1: ĐẦU VIỆC ĐÃ GIAO ── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
        <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
          <span className="text-xl">🗂️</span>
          <span className="font-black text-[#1e3a5f] uppercase tracking-wide">1. Công Việc Đã Giao</span>
          <span className="font-medium text-[#6b7280] ml-2">(Quản lý điền — Nhân viên sẽ tự đánh giá kết quả sau)</span>
        </div>
        <div className="p-5">
          <p className="text-sm text-[#6b7280] mb-4">
            Điền đầy đủ các mảng việc + chi tiết nhiệm vụ đã giao cho <strong className="text-[#1e3a5f]">{employeeName}</strong>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] w-[40px] text-center">STT</th>
                  <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] text-left min-w-[200px]">Mảng công việc</th>
                  <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] text-left min-w-[260px]">Chi tiết nhiệm vụ & Kỳ vọng</th>
                  <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] w-[44px] text-center">Xóa</th>
                </tr>
              </thead>
              <tbody>
                {works.map((w, i) => (
                  <tr key={i} className="hover:bg-[#eff6ff] transition-colors">
                    <td className="border border-[#d1d5db] p-[6px] text-center font-bold text-[#6b7280] w-[40px]">{w.stt}</td>
                    <td className="border border-[#d1d5db] p-[6px]">
                      <textarea
                        rows={2}
                        value={w.area}
                        onChange={e => updateWork(i, 'area', e.target.value)}
                        placeholder="VD: Thiết kế UI / Phát triển tính năng..."
                        className="w-full font-sans border border-transparent hover:border-[#d1d5db] focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 rounded-[6px] p-[6px] outline-none text-[#111] font-bold bg-transparent focus:bg-white resize-y min-h-[44px] transition-all"
                      />
                    </td>
                    <td className="border border-[#d1d5db] p-[6px]">
                      <textarea
                        rows={2}
                        value={w.detail}
                        onChange={e => updateWork(i, 'detail', e.target.value)}
                        placeholder="Mô tả chi tiết công việc, tiêu chuẩn hoàn thành, kỳ vọng..."
                        className="w-full font-sans text-base border border-transparent hover:border-[#d1d5db] focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 rounded-[6px] p-[6px] outline-none text-[#111] bg-transparent focus:bg-white resize-y min-h-[44px] transition-all leading-relaxed"
                      />
                    </td>
                    <td className="border border-[#d1d5db] p-[6px] text-center">
                      {works.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeWork(i)}
                          className="text-red-400 hover:text-red-700 p-2 transition-colors"
                          title="Xóa đầu việc"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className="border border-dashed border-blue-300 p-2 text-center bg-blue-50/20">
                    <button
                      type="button"
                      onClick={addWork}
                      className="text-[#1e3a5f] hover:text-blue-800 font-semibold flex items-center justify-center gap-2 w-full py-1 text-sm"
                    >
                      <Plus size={15} className="text-[#1e3a5f]" />
                      Thêm đầu việc
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── PHẦN 2: TIÊU CHÍ ĐÁNH GIÁ ── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
        <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="font-black text-[#1e3a5f] uppercase tracking-wide">2. Tiêu Chí Đánh Giá Năng Lực</span>
          {hrCriteria.length > 0 && (
            <span className="font-medium text-[#6b7280] ml-2">
              ✨ HR tạo {hrCriteria.length} tiêu chí mẫu — Quản lý có thể sửa/xóa/thêm tự do
            </span>
          )}
        </div>
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] w-[40px] text-center">STT</th>
                  <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] text-left min-w-[200px]">Tên tiêu chí</th>
                  <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] text-left min-w-[260px]">Mô tả kỳ vọng</th>
                  <th className="border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] w-[44px] text-center">Xóa</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((c, i) => (
                  <tr key={i} className="hover:bg-[#eff6ff] transition-colors">
                    <td className="border border-[#d1d5db] p-[6px] text-center font-bold text-[#6b7280] w-[40px]">{i + 1}</td>
                    <td className="border border-[#d1d5db] p-[6px]">
                      <textarea
                        rows={2}
                        value={c.name}
                        onChange={e => updateCrit(i, 'name', e.target.value)}
                        placeholder="VD: Kiến thức chuyên môn"
                        className="w-full font-sans border border-transparent hover:border-[#d1d5db] focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 rounded-[6px] p-[6px] outline-none text-[#111] font-bold bg-transparent focus:bg-white resize-y min-h-[44px] transition-all"
                      />
                    </td>
                    <td className="border border-[#d1d5db] p-[6px]">
                      <textarea
                        rows={2}
                        value={c.expectation}
                        onChange={e => updateCrit(i, 'expectation', e.target.value)}
                        placeholder="Kỳ vọng cụ thể cho tiêu chí này..."
                        className="w-full font-sans text-base border border-transparent hover:border-[#d1d5db] focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 rounded-[6px] p-[6px] outline-none text-[#111] bg-transparent focus:bg-white resize-y min-h-[44px] transition-all leading-relaxed"
                      />
                    </td>
                    <td className="border border-[#d1d5db] p-[6px] text-center">
                      {criteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCrit(i)}
                          className="text-red-400 hover:text-red-700 p-2 transition-colors"
                          title="Xóa tiêu chí"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className="border border-dashed border-blue-300 p-2 text-center bg-blue-50/20">
                    <button
                      type="button"
                      onClick={addCrit}
                      className="text-[#1e3a5f] hover:text-blue-800 font-semibold flex items-center justify-center gap-2 w-full py-1 text-sm"
                    >
                      <Plus size={15} className="text-[#1e3a5f]" />
                      Thêm tiêu chí
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── LỖI ── */}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-base font-medium">
          {errorMsg}
        </div>
      )}

      {/* ── SUBMIT ── */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-br from-[#3b82f6] to-[#1e3a5f] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-[10px] transition-all shadow-lg border-b-[4px] border-[#1e3a5f] hover:scale-[1.02] active:scale-[0.98]"
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
