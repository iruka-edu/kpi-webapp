/**
 * app/evaluation/dashboard/page.tsx — Dashboard HR quản lý phiếu
 * ---------------------------------------------------------------
 * Vai trò: HR xem toàn bộ danh sách phiếu đánh giá đang xử lý,
 *          lọc theo trạng thái, tìm kiếm theo tên, và truy cập
 *          nhanh các trang xử lý tương ứng.
 *
 * Bảo mật: Dashboard password
 */

"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  ClipboardCheck, Search, Filter, Loader2,
  AlertTriangle, Clock, CheckCircle, Lock, RefreshCw,
  ExternalLink
} from 'lucide-react';

// ── Status config ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; badge: string; icon: React.ReactNode }> = {
  DRAFT:        { label: 'HR tạo xong',          color: 'text-slate-400',  badge: 'bg-slate-700/60',          icon: <ClipboardCheck size={12} /> },
  MGR_FILLING:  { label: 'QL đang điền việc',     color: 'text-yellow-400', badge: 'bg-yellow-500/10 border border-yellow-500/30', icon: <Clock size={12} /> },
  SUBMITTED:    { label: 'NV đã nộp, QL chưa chấm', color: 'text-blue-400', badge: 'bg-blue-500/10 border border-blue-500/30', icon: <Clock size={12} /> },
  UNDER_REVIEW: { label: 'CEO trả về QL',         color: 'text-orange-400', badge: 'bg-orange-500/10 border border-orange-500/30', icon: <RefreshCw size={12} /> },
  PENDING_CEO:  { label: 'Đợi CEO duyệt',         color: 'text-purple-400', badge: 'bg-purple-500/10 border border-purple-500/30', icon: <Clock size={12} /> },
  COMPLETED:    { label: 'CEO đã duyệt',           color: 'text-green-400',  badge: 'bg-green-500/10 border border-green-500/30', icon: <CheckCircle size={12} /> },
  RESULT_SENT:  { label: 'Đã gửi NV',             color: 'text-green-400',  badge: 'bg-green-500/20 border border-green-500/40', icon: <CheckCircle size={12} /> },
  ACKNOWLEDGED: { label: 'NV đã xác nhận',        color: 'text-green-300',  badge: 'bg-green-500/30 border border-green-500/50', icon: <CheckCircle size={12} /> },
};

const ALL_STATUSES = ['', ...Object.keys(STATUS_CONFIG)];

interface EvalItem {
  eval_id: string;
  name: string;
  position: string;
  department: string;
  start_date: string;
  manager_name: string;
  status: string;
  created_at: string;
}

// ── Link helper — trỏ đến đúng trang theo status ─────────────────
function getActionLink(item: EvalItem): { label: string; href: string } | null {
  switch (item.status) {
    case 'DRAFT':
    case 'MGR_FILLING':
      return { label: 'Xem QL điền việc', href: `/evaluation/mgr-fill/${item.eval_id}` };
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return { label: 'Xem QL chấm điểm', href: `/evaluation/mgr-review/${item.eval_id}` };
    case 'PENDING_CEO':
      return { label: 'Xem CEO duyệt', href: `/evaluation/ceo-review/${item.eval_id}` };
    case 'COMPLETED':
      return { label: 'Gửi kết quả NV', href: `/evaluation/result/${item.eval_id}` };
    case 'RESULT_SENT':
    case 'ACKNOWLEDGED':
      return { label: 'Xem kết quả', href: `/evaluation/result/${item.eval_id}` };
    default:
      return null;
  }
}

// ── Login Gate ────────────────────────────────────────────────────
function LoginGate({ onLogin }: { onLogin: (p: string) => void }) {
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a1120]">
      <div className="w-full max-w-sm bg-slate-800/60 rounded-2xl border border-slate-700/50 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto">
            <Lock size={24} className="text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Dashboard Đánh Giá Nhân Sự</h1>
          <p className="text-slate-400 text-sm">Dành cho Phòng Nhân Sự</p>
        </div>
        {err && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">{err}</div>}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Mật khẩu Dashboard</label>
          <input
            type="password" value={pass}
            onChange={e => { setPass(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && (pass ? onLogin(pass) : setErr('Nhập mật khẩu'))}
            placeholder="••••••••"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition"
          />
        </div>
        <button
          onClick={() => pass ? onLogin(pass) : setErr('Nhập mật khẩu')}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
        >
          Vào Dashboard
        </button>
      </div>
    </div>
  );
}

export default function EvalDashboard() {
  const [pass, setPass] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EvalItem[]>([]);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchList = async (dashPass: string, status = '', q = '') => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (q) params.set('search', q);
      const res = await fetch(`/api/evaluation/list?${params}`, {
        headers: { 'x-dashboard-auth': dashPass },
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      setItems(data.evaluations || []);
      setAuthed(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (p: string) => { setPass(p); fetchList(p); };

  useEffect(() => {
    if (authed) fetchList(pass, statusFilter, search);
  }, [statusFilter]);

  if (!authed) return <LoginGate onLogin={handleLogin} />;

  // ── Stats counts ──────────────────────────────────────────────────
  const countByStatus = (s: string) => items.filter(i => i.status === s).length;
  const stats = [
    { label: 'Đợi CEO duyệt', count: countByStatus('PENDING_CEO'), color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Cần gửi kết quả', count: countByStatus('COMPLETED'), color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Tổng phiếu', count: items.length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ];

  return (
    <div className="flex min-h-screen bg-[#0a1120] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
              <ClipboardCheck size={22} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard Đánh Giá Nhân Sự</h1>
              <p className="text-sm text-slate-400">Theo dõi và quản lý tất cả phiếu đánh giá thử việc</p>
            </div>
          </div>
          <div className="flex gap-3">
            <a
              href="/evaluation/init"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              + Tạo Phiếu Mới
            </a>
            <button
              onClick={() => fetchList(pass, statusFilter, search)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm"
            >
              <RefreshCw size={15} /> Làm mới
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-5 border border-slate-700/50`}>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</div>
              <div className={`text-4xl font-bold mt-1 ${s.color}`}>{s.count}</div>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchList(pass, statusFilter, search)}
              placeholder="Tìm theo tên nhân viên... (Enter để tìm)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition text-sm"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white focus:border-indigo-500 outline-none appearance-none cursor-pointer text-sm min-w-[220px]"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lỗi */}
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-red-400 text-sm">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* Loading */}
        {loading && <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>}

        {/* Danh sách phiếu */}
        {!loading && (
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <ClipboardCheck size={48} className="mx-auto mb-3 opacity-30" />
                <p>Chưa có phiếu đánh giá nào</p>
              </div>
            ) : items.map(item => {
              const cfg = STATUS_CONFIG[item.status];
              const action = getActionLink(item);
              return (
                <div key={item.eval_id} className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50 hover:border-slate-600/60 transition-all flex items-center gap-5">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-indigo-600/20 flex items-center justify-center text-lg font-bold text-indigo-400 shrink-0">
                    {item.name?.[0] || '?'}
                  </div>

                  {/* Thông tin */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white">{item.name}</span>
                      <span className="text-slate-500 text-sm">·</span>
                      <span className="text-slate-400 text-sm">{item.position}</span>
                      <span className="text-slate-500 text-sm">·</span>
                      <span className="text-slate-500 text-sm">{item.department}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      QL: {item.manager_name} · Tạo: {item.created_at}
                    </div>
                  </div>

                  {/* Status badge */}
                  {cfg && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.badge} ${cfg.color} shrink-0`}>
                      {cfg.icon}{cfg.label}
                    </div>
                  )}

                  {/* Action link */}
                  {action && (
                    <a
                      href={action.href}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-600/30 text-indigo-400 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0"
                    >
                      {action.label} <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
