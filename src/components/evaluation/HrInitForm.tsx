"use client";

/**
 * HrInitForm.tsx — Form HR tạo phiếu đánh giá nhân sự
 * -------------------------------------------------------
 * Vai trò: HR điền thông tin NV và tiêu chí đánh giá mẫu (optional).
 *
 * Luồng:
 *  1. HR điền thông tin NV (tên, bộ phận, vị trí, ngày, quản lý)
 *  2. HR có thể điền sẵn tối đa 9 tiêu chí mẫu (optional — bỏ trống OK)
 *  3. Submit → POST /api/evaluation/init → redirect trang thành công
 *
 * Phân quyền: Chỉ HR/Dashboard mới truy cập được trang này
 */

import React, { useState } from 'react';
import { Plus, Trash2, Send, Loader2, CheckCircle } from 'lucide-react';

// Danh sách Quản lý trực tiếp — cố định 3 người theo cấu trúc công ty
const MANAGER_LIST = [
  { name: 'CEO (Mr. Đào)', discord_id: process.env.NEXT_PUBLIC_CEO_DISCORD_ID || '' },
  { name: 'Tùng', discord_id: process.env.NEXT_PUBLIC_TUNG_DISCORD_ID || '' },
  { name: 'Inh', discord_id: process.env.NEXT_PUBLIC_INH_DISCORD_ID || '' },
];

// Mẫu tiêu chí trống để thêm mới
const emptyCriteria = () => ({ name: '', expectation: '' });

interface Criteria {
  name: string;
  expectation: string;
}

interface FormData {
  name: string;
  discord_id: string;
  dept: string;
  role: string;
  manager_name: string;
  manager_discord_id: string;
  trial_start: string;
  trial_end: string;
  eval_date: string;
  hr_discord_id: string;
  criteria: Criteria[];
}

interface HrInitFormProps {
  /** Discord ID của HR đang login (truyền từ Dashboard) */
  hrDiscordId: string;
  /** Mật khẩu Dashboard để auth API */
  dashboardPassword: string;
}

export default function HrInitForm({ hrDiscordId, dashboardPassword }: HrInitFormProps) {
  const [form, setForm] = useState<FormData>({
    name: '',
    discord_id: '',
    dept: '',
    role: '',
    manager_name: MANAGER_LIST[0].name,
    manager_discord_id: MANAGER_LIST[0].discord_id,
    trial_start: '',
    trial_end: '',
    eval_date: new Date().toISOString().slice(0, 10),
    hr_discord_id: hrDiscordId,
    criteria: [],
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Cập nhật trường thông tin chung ──────────────────────────────
  const setField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ── Chọn quản lý trực tiếp ───────────────────────────────────────
  const selectManager = (managerName: string) => {
    const mgr = MANAGER_LIST.find(m => m.name === managerName);
    if (mgr) {
      setForm(prev => ({
        ...prev,
        manager_name: mgr.name,
        manager_discord_id: mgr.discord_id,
      }));
    }
  };

  // ── Thêm tiêu chí mẫu ────────────────────────────────────────────
  const addCriteria = () => {
    setForm(prev => ({ ...prev, criteria: [...prev.criteria, emptyCriteria()] }));
  };

  // ── Xóa tiêu chí mẫu (HR được phép xóa tự do) ───────────────────
  const removeCriteria = (index: number) => {
    setForm(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index),
    }));
  };

  // ── Sửa nội dung tiêu chí ────────────────────────────────────────
  const updateCriteria = (index: number, field: keyof Criteria, value: string) => {
    setForm(prev => ({
      ...prev,
      criteria: prev.criteria.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }));
  };

  // ── Submit form ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/evaluation/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-auth': dashboardPassword,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Lỗi tạo phiếu');

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
        <h2 className="text-2xl font-bold text-white">Đã tạo phiếu thành công!</h2>
        <p className="text-slate-400 max-w-md">
          Bot Discord đã gửi link form đến <strong className="text-white">{form.manager_name}</strong> để điền công việc.
          CEO đã được CC thông báo.
        </p>
        <button
          onClick={() => { setStatus('idle'); setForm(f => ({ ...f, name: '', discord_id: '', dept: '', role: '', trial_start: '', trial_end: '', criteria: [] })); }}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors"
        >
          Tạo phiếu mới
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── PHẦN 1: THÔNG TIN NHÂN VIÊN ── */}
      <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">1</span>
          Thông Tin Nhân Viên
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Họ tên */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Họ và tên NV <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
          {/* Discord ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Discord ID của NV <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.discord_id}
              onChange={e => setField('discord_id', e.target.value)}
              placeholder="123456789012345678"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
          {/* Bộ phận */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Bộ phận <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.dept}
              onChange={e => setField('dept', e.target.value)}
              placeholder="Kỹ thuật / Marketing / HCNS..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
          {/* Vị trí */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Vị trí / Chức danh <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.role}
              onChange={e => setField('role', e.target.value)}
              placeholder="Frontend Developer / Content..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
          {/* Ngày bắt đầu thử việc */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Ngày bắt đầu thử việc <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              required
              value={form.trial_start}
              onChange={e => setField('trial_start', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
          {/* Ngày kết thúc thử việc */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Ngày kết thúc thử việc
            </label>
            <input
              type="date"
              value={form.trial_end}
              onChange={e => setField('trial_end', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
          {/* Ngày đánh giá */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Ngày đánh giá <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              required
              value={form.eval_date}
              onChange={e => setField('eval_date', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
          {/* Quản lý trực tiếp */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Quản lý trực tiếp <span className="text-red-400">*</span>
            </label>
            <select
              value={form.manager_name}
              onChange={e => selectManager(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            >
              {MANAGER_LIST.map(m => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ── PHẦN 2: TIÊU CHÍ MẪU (OPTIONAL) ── */}
      <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-sm font-bold">2</span>
              Tiêu Chí Đánh Giá Mẫu
            </h2>
            <p className="text-xs text-slate-500 mt-1 ml-9">
              Không bắt buộc — Quản lý sẽ điền/sửa lại ở bước tiếp theo
            </p>
          </div>
          <button
            type="button"
            onClick={addCriteria}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-xl text-sm font-semibold transition-colors border border-purple-600/30"
          >
            <Plus size={16} /> Thêm tiêu chí
          </button>
        </div>

        {form.criteria.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm border-2 border-dashed border-slate-700 rounded-xl">
            Chưa có tiêu chí mẫu — Nhấn "Thêm tiêu chí" hoặc để Quản lý tự điền
          </div>
        ) : (
          <div className="space-y-3">
            {form.criteria.map((c, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-start bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Tên tiêu chí</label>
                  <input
                    type="text"
                    value={c.name}
                    onChange={e => updateCriteria(i, 'name', e.target.value)}
                    placeholder="VD: Kiến thức chuyên môn"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Mô tả kỳ vọng</label>
                  <textarea
                    rows={2}
                    value={c.expectation}
                    onChange={e => updateCriteria(i, 'expectation', e.target.value)}
                    placeholder="Mô tả kỳ vọng cụ thể..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:border-purple-500 outline-none resize-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCriteria(i)}
                  className="mt-5 p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Xóa tiêu chí"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── LỖI ── */}
      {status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-red-400 text-sm">
          ❌ {errorMsg}
        </div>
      )}

      {/* ── NÚT SUBMIT ── */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/20"
        >
          {status === 'submitting' ? (
            <><Loader2 size={18} className="animate-spin" /> Đang tạo phiếu...</>
          ) : (
            <><Send size={18} /> Tạo Phiếu & Gửi Quản Lý</>
          )}
        </button>
      </div>
    </form>
  );
}
