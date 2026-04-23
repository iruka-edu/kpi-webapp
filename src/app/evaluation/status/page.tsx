/**
 * app/evaluation/status/page.tsx — NV tra cứu trạng thái phiếu
 * ---------------------------------------------------------------
 * Vai trò: Nhân viên vào trang này (qua link từ Bot hoặc Dashboard)
 *          để tự kiểm tra tiến trình phiếu đánh giá thử việc của mình.
 *
 * Luồng:
 *  1. Bot gửi link: /evaluation/status?id=<eval_id>&discord_id=<id>&token=<hmac>
 *  2. Nếu thiếu token → hiện form nhập ID phiếu thủ công
 *  3. Gọi GET /api/evaluation/status → hiển thị trạng thái + mô tả
 *  4. Nếu status = RESULT_SENT → hiện nút "Xem Kết Quả"
 *
 * Bảo mật: Token HMAC 72h (tự động từ URL bot gửi)
 */

"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  Loader2, AlertTriangle, CheckCircle, Clock,
  Search, RefreshCw, ExternalLink,
} from 'lucide-react';

// ── Màu badge theo status_color ──────────────────────────────────
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  slate:  { bg: 'bg-slate-700/40',   text: 'text-slate-300', border: 'border-slate-600/50',  dot: 'bg-slate-400' },
  blue:   { bg: 'bg-blue-500/10',    text: 'text-blue-400',  border: 'border-blue-500/30',   dot: 'bg-blue-400' },
  yellow: { bg: 'bg-yellow-500/10',  text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-400 animate-pulse' },
  purple: { bg: 'bg-purple-500/10',  text: 'text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-400' },
  orange: { bg: 'bg-orange-500/10',  text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400 animate-pulse' },
  amber:  { bg: 'bg-amber-500/10',   text: 'text-amber-400',  border: 'border-amber-500/30',  dot: 'bg-amber-400 animate-pulse' },
  green:  { bg: 'bg-green-500/10',   text: 'text-green-400',  border: 'border-green-500/30',  dot: 'bg-green-400' },
  teal:   { bg: 'bg-teal-500/10',    text: 'text-teal-400',   border: 'border-teal-500/30',   dot: 'bg-teal-400' },
};

// ── Timeline — 8 bước hiển thị dọc ───────────────────────────────
const STATUS_STEPS = [
  { key: 'INIT',         label: 'HR tạo phiếu' },
  { key: 'MGR_PENDING',  label: 'Quản lý điền thông tin' },
  { key: 'NV_PENDING',   label: 'Bạn tự đánh giá' },
  { key: 'SUBMITTED',    label: 'Nộp phiếu — Chờ QL chấm' },
  { key: 'UNDER_REVIEW', label: 'Quản lý xem lại' },
  { key: 'PENDING_CEO',  label: 'Chờ CEO phê duyệt' },
  { key: 'COMPLETED',    label: 'CEO đã duyệt' },
  { key: 'RESULT_SENT',  label: 'Kết quả được gửi' },
  { key: 'ACKNOWLEDGED', label: 'Hoàn tất' },
];

// Tính index của status trong timeline (bỏ qua UNDER_REVIEW khi không active)
function getStepIndex(status: string): number {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

interface StatusData {
  status: string;
  status_label: string;
  status_description: string;
  status_color: string;
  name: string;
  dept: string;
  role: string;
  manager_name: string;
  eval_date: string;
}

function EvaluationStatusContent() {
  const searchParams = useSearchParams();

  // Lấy params từ URL (bot gửi) hoặc để trống
  const urlEvalId    = searchParams.get('id') || '';
  const urlDiscordId = searchParams.get('discord_id') || '';
  const urlToken     = searchParams.get('token') || '';

  const [evalId, setEvalId]       = useState(urlEvalId);
  const [discordId, setDiscordId] = useState(urlDiscordId);
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState<StatusData | null>(null);
  const [error, setError]         = useState('');

  // Tự động load nếu URL có đủ params
  useEffect(() => {
    if (urlEvalId && urlDiscordId && urlToken) {
      fetchStatus(urlEvalId, urlDiscordId, urlToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStatus = async (id: string, did: string, tok: string) => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const params = new URLSearchParams({ id });
      if (did && tok) {
        params.set('discord_id', did);
        params.set('token', tok);
      }
      const res = await fetch(`/api/evaluation/status?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Không tìm thấy phiếu');
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!evalId.trim()) { setError('Vui lòng nhập ID phiếu đánh giá'); return; }
    fetchStatus(evalId.trim(), discordId.trim(), urlToken);
  };

  const colors = data ? (COLOR_MAP[data.status_color] || COLOR_MAP.slate) : null;
  const stepIndex = data ? getStepIndex(data.status) : -1;

  return (
    <div className="flex min-h-screen bg-[#0a1120] text-slate-100 font-sans">
      <Sidebar />

      <main className="flex-1 p-8 max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-xl">📋</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tra Cứu Trạng Thái Đánh Giá</h1>
              <p className="text-sm text-slate-400">Kiểm tra tiến trình phiếu đánh giá thử việc của bạn</p>
            </div>
          </div>
        </div>

        {/* Form tra cứu thủ công (hiện khi URL thiếu params) */}
        {!urlToken && (
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Nhập thông tin tra cứu</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  ID Phiếu đánh giá <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={evalId}
                  onChange={(e) => setEvalId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="VD: EVAL-2026-001"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 outline-none transition text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Discord ID của bạn <span className="text-slate-600 font-normal normal-case">(tuỳ chọn)</span>
                </label>
                <input
                  type="text"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="VD: 123456789012345678"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 outline-none transition text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
              >
                <Search size={16} />
                Tra Cứu
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-400" />
          </div>
        )}

        {/* Lỗi */}
        {error && !loading && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 text-red-400">
            <AlertTriangle size={20} className="shrink-0" />
            <div>
              <div className="font-semibold">Không tìm thấy thông tin</div>
              <div className="text-sm mt-0.5 text-red-400/80">{error}</div>
            </div>
            <button
              onClick={() => fetchStatus(evalId, discordId, urlToken)}
              className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw size={13} /> Thử lại
            </button>
          </div>
        )}

        {/* Kết quả */}
        {data && colors && !loading && (
          <div className="space-y-6">

            {/* Badge trạng thái chính */}
            <div className={`rounded-2xl p-6 border ${colors.bg} ${colors.border} flex items-start gap-4`}>
              <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${colors.dot}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-xl font-bold ${colors.text}`}>{data.status_label}</div>
                <p className="text-slate-400 text-sm mt-1">{data.status_description}</p>
              </div>
              {/* Nút xem kết quả nếu đã gửi */}
              {(data.status === 'RESULT_SENT') && (
                <a
                  href={`/evaluation/acknowledge?id=${encodeURIComponent(evalId)}&discord_id=${encodeURIComponent(discordId)}&token=${encodeURIComponent(urlToken)}`}
                  className="shrink-0 flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  <ExternalLink size={15} />
                  Xem Kết Quả
                </a>
              )}
              {data.status === 'ACKNOWLEDGED' && (
                <div className="shrink-0 flex items-center gap-1.5 text-teal-400 text-sm font-semibold">
                  <CheckCircle size={16} /> Hoàn tất
                </div>
              )}
            </div>

            {/* Thông tin cơ bản */}
            <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">Thông tin phiếu</h2>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {[
                  { label: 'Họ và tên',          value: data.name },
                  { label: 'Bộ phận',             value: data.dept },
                  { label: 'Vị trí',              value: data.role },
                  { label: 'Quản lý trực tiếp',  value: data.manager_name },
                  { label: 'Ngày đánh giá',       value: data.eval_date },
                  { label: 'Mã phiếu',            value: evalId },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-slate-500 text-xs uppercase tracking-wide">{label}</dt>
                    <dd className="text-white font-medium mt-0.5">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Timeline */}
            <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-5">Tiến trình</h2>
              <ol className="relative space-y-0">
                {STATUS_STEPS.map((step, idx) => {
                  const isDone    = idx < stepIndex;
                  const isCurrent = idx === stepIndex;
                  const isPending = idx > stepIndex;
                  return (
                    <li key={step.key} className="flex items-start gap-4 pb-5 last:pb-0">
                      {/* Đường kết nối dọc */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                          ${isDone    ? 'bg-green-600 border-green-500 text-white' : ''}
                          ${isCurrent ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30' : ''}
                          ${isPending ? 'bg-slate-800 border-slate-600 text-slate-500' : ''}
                        `}>
                          {isDone ? <CheckCircle size={14} /> : isCurrent ? <Clock size={14} /> : <span>{idx + 1}</span>}
                        </div>
                        {idx < STATUS_STEPS.length - 1 && (
                          <div className={`w-0.5 h-5 mt-1 ${isDone ? 'bg-green-600/50' : 'bg-slate-700'}`} />
                        )}
                      </div>
                      {/* Nhãn */}
                      <div className={`pt-0.5 text-sm font-medium ${isDone ? 'text-slate-400' : isCurrent ? 'text-white' : 'text-slate-600'}`}>
                        {step.label}
                        {isCurrent && (
                          <span className="ml-2 text-xs text-blue-400 font-semibold">← Đang ở đây</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Nút refresh */}
            <div className="flex justify-end">
              <button
                onClick={() => fetchStatus(evalId, discordId, urlToken)}
                disabled={loading}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                <RefreshCw size={14} />
                Làm mới trạng thái
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function EvaluationStatusPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-[#0a1120] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    }>
      <EvaluationStatusContent />
    </Suspense>
  );
}
