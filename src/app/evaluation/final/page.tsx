/**
 * app/evaluation/final/page.tsx — Nhân viên xem kết quả cuối + xác nhận
 * -----------------------------------------------------------------------
 * Vai trò: NV nhận link qua Discord Bot, vào trang này để xem kết quả
 *          đầy đủ (điểm NV + QL, nhận xét, quyết định), sau đó
 *          bấm nút xác nhận đã nhận kết quả.
 *
 * Bảo mật: Token HMAC-SHA256 qua URL params (giống /weekly)
 * URL: /evaluation/final?id=xxx&discord_id=yyy&token=zzz
 */

"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, AlertTriangle, Star, MessageSquare } from 'lucide-react';

interface EvalResult {
  info: {
    name: string;
    position: string;
    department: string;
    start_date: string;
    manager_name: string;
  };
  criteria: Array<{ name: string; expectation: string; self_score: number; mgr_score: number }>;
  mgr_comment: string;
  mgr_decision: string;
  ceo_comment: string;
  mgr_note: string; // Lời nhắn của QL khi gửi kết quả
}

const DECISION_MAP: Record<string, { label: string; color: string; bg: string; icon: string; desc: string }> = {
  hire: {
    label: 'Tiếp nhận chính thức',
    color: 'text-green-700',
    bg: 'from-green-50 to-white border-green-200',
    icon: '🎉',
    desc: 'Chúc mừng! Bạn đã hoàn thành thử việc xuất sắc.',
  },
  extend: {
    label: 'Gia hạn thử việc',
    color: 'text-amber-700',
    bg: 'from-amber-50 to-white border-amber-200',
    icon: '⏳',
    desc: 'Công ty quyết định gia hạn thử việc thêm. Hãy tiếp tục cố gắng!',
  },
  reject: {
    label: 'Chấm dứt thử việc',
    color: 'text-red-700',
    bg: 'from-red-50 to-white border-red-200',
    icon: '📋',
    desc: 'Rất tiếc, công ty quyết định không tiếp tục sau thử việc.',
  },
};

function FinalContent() {
  const searchParams = useSearchParams();
  const evalId = searchParams.get('id') || '';
  const discordId = searchParams.get('discord_id') || '';
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evalData, setEvalData] = useState<EvalResult | null>(null);
  const [ackStatus, setAckStatus] = useState<'idle' | 'confirming' | 'confirmed' | 'error'>('idle');
  const [ackError, setAckError] = useState('');

  useEffect(() => {
    if (!evalId) { setError('Link không hợp lệ — thiếu ID phiếu'); setLoading(false); return; }
    fetchResult();
  }, []);

  const fetchResult = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ id: evalId });
      if (discordId) params.set('discord_id', discordId);
      if (token) params.set('token', token);
      const res = await fetch(`/api/evaluation/acknowledge?${params}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      setEvalData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    setAckStatus('confirming');
    setAckError('');
    try {
      const res = await fetch('/api/evaluation/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eval_id: evalId, discord_id: discordId, token }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      setAckStatus('confirmed');
    } catch (err: any) {
      setAckStatus('error');
      setAckError(err.message);
    }
  };

  // ── Tính điểm ─────────────────────────────────────────────────────
  const calcAvg = (scores: number[]) => {
    const v = scores.filter(s => s > 0);
    return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  };
  const selfAvg = calcAvg(evalData?.criteria.map(c => c.self_score) || []);
  const mgrAvg = calcAvg(evalData?.criteria.map(c => c.mgr_score) || []);
  const combined = selfAvg > 0 && mgrAvg > 0 ? (selfAvg + mgrAvg) / 2 : 0;

  const getVerdictColor = (avg: number) => {
    if (avg >= 4.5) return 'text-green-400';
    if (avg >= 3.5) return 'text-blue-400';
    if (avg >= 2.5) return 'text-yellow-400';
    return 'text-red-400';
  };
  const getVerdictLabel = (avg: number) => {
    if (avg >= 4.5) return 'Xuất sắc';
    if (avg >= 3.5) return 'Tốt';
    if (avg >= 2.5) return 'Đạt yêu cầu';
    return 'Cần cải thiện';
  };

  const decision = DECISION_MAP[evalData?.mgr_decision || ''];

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Lỗi ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex flex-col items-center justify-center text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-red-500" />
        <h1 className="text-xl font-bold text-slate-900">Không thể xem kết quả</h1>
        <p className="text-slate-500 max-w-md">{error}</p>
        <p className="text-slate-400 text-sm">Vui lòng liên hệ HR nếu cần hỗ trợ.</p>
      </div>
    );
  }

  // ── Đã xác nhận ──────────────────────────────────────────────────
  if (ackStatus === 'confirmed') {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex flex-col items-center justify-center text-center space-y-4 p-8">
        <CheckCircle size={64} className="text-green-600" />
        <h1 className="text-2xl font-bold text-slate-900">Đã Xác Nhận Nhận Kết Quả!</h1>
        <p className="text-slate-500 max-w-md">
          Cảm ơn bạn đã xem kết quả đánh giá thử việc.<br />
          Nếu có thắc mắc, vui lòng liên hệ trực tiếp với Quản lý hoặc HR.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* ── TAB NAV ─── */}
      <div className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-sm px-6 flex items-stretch h-16">
        <div className="flex items-center gap-3 pr-8 border-r border-slate-200">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-md shadow-blue-500/20">
            <img src="/logo-iruka.svg" alt="IruKa Logo" className="object-contain" />
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">IruKa<span className="text-blue-600">Life</span></span>
        </div>
        <div className="flex px-4 items-center font-medium text-[15px] border-b-[3px] border-transparent text-slate-400 cursor-not-allowed">
          📝 Tự Đánh Giá
        </div>
        <div className="flex px-4 items-center font-medium text-[15px] border-b-[3px] border-transparent text-slate-400 cursor-not-allowed">
          📊 Quản Lý Đánh Giá
        </div>
        <div className="flex px-4 items-center font-semibold text-[15px] border-b-[3px] border-blue-600 text-blue-700 bg-blue-50/50 cursor-default">
          🎯 Kết Quả Đánh Giá
        </div>
      </div>

      <main className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-8 pb-32">
        {/* Header Content */}
        <div className="flex items-start justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kết Quả Đánh Giá Thử Việc</h1>
            <p className="text-sm text-slate-500 mt-1">Chi tiết điểm đánh giá và quyết định cuối cùng từ Ban Giám Đốc.</p>
          </div>
        </div>

        {/* Thông tin NV */}
        {evalData && (
          <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-[15px] font-bold text-slate-800 mb-4 flex items-center gap-2 tracking-tight">
              <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">i</span>
              Thông Tin Chung
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Nhân viên', evalData.info.name],
                ['Vị trí', evalData.info.position],
                ['Phòng ban', evalData.info.department],
                ['Ngày bắt đầu', evalData.info.start_date],
                ['Quản lý trực tiếp', evalData.info.manager_name],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
                    <div className="text-slate-800 font-semibold">{value || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Điểm tổng kết */}
        {evalData && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Bạn tự chấm', avg: selfAvg, color: 'text-blue-600' },
              { label: 'Quản lý chấm', avg: mgrAvg, color: 'text-purple-600' },
              { label: 'Điểm chung', avg: combined, color: getVerdictColor(combined).replace('400', '600') },
            ].map(({ label, avg, color }) => (
              <div key={label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
                <div className={`text-4xl font-bold ${color}`}>{avg > 0 ? avg.toFixed(1) : '—'}</div>
                {label === 'Điểm chung' && avg > 0 && (
                  <div className={`text-sm font-bold ${color} mt-1`}>{getVerdictLabel(avg)}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chi tiết tiêu chí */}
        {evalData && (
          <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-[15px] font-bold text-slate-800 mb-4 flex items-center gap-2 tracking-tight">
              <span className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Star size={14} className="text-blue-600" />
              </span>
              Chi Tiết Từng Tiêu Chí
            </h2>
            <div className="space-y-3">
              {evalData.criteria.map((c, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center bg-slate-50 rounded-xl px-4 py-4 border border-slate-200">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 shadow-sm">{i + 1}</div>
                  <div>
                    <div className="text-slate-800 font-semibold text-sm">{c.name}</div>
                    {c.expectation && <div className="text-slate-600 text-sm mt-1 leading-relaxed">{c.expectation}</div>}
                  </div>
                  <div className="text-center px-2">
                    <div className="text-[10px] font-bold text-blue-500 uppercase mb-1">Tự chấm</div>
                    <div className="text-2xl font-bold text-blue-600">{c.self_score || '—'}</div>
                  </div>
                  <div className="text-center px-2">
                    <div className="text-[10px] font-bold text-purple-500 uppercase mb-1">QL chấm</div>
                    <div className="text-2xl font-bold text-purple-600">{c.mgr_score || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Nhận xét QL */}
        {evalData?.mgr_comment && (
          <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-[15px] font-bold text-slate-800 mb-3 flex items-center gap-2 tracking-tight">
              <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center">
                <MessageSquare size={14} className="text-slate-600" />
              </span>
              Nhận Xét Của Quản Lý
            </h2>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm p-4 bg-slate-50 rounded-xl border border-slate-200">{evalData.mgr_comment}</p>
          </section>
        )}

        {/* Ghi chú CEO */}
        {evalData?.ceo_comment && (
          <section className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
            <h2 className="text-[15px] font-bold text-amber-600 mb-3 flex items-center gap-2">👑 Ghi Chú Của CEO</h2>
            <p className="text-amber-900 leading-relaxed whitespace-pre-wrap text-sm">{evalData.ceo_comment}</p>
          </section>
        )}

        {/* Lời nhắn QL */}
        {evalData?.mgr_note && (
          <section className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
            <h2 className="text-[15px] font-bold text-blue-700 mb-3">💬 Lời Nhắn Từ Quản Lý</h2>
            <p className="text-blue-900 leading-relaxed whitespace-pre-wrap text-sm">{evalData.mgr_note}</p>
          </section>
        )}

        {/* Quyết định chính thức */}
        {decision && evalData && (
          <section className={`rounded-2xl p-6 border bg-gradient-to-br ${decision.bg}`}>
            <div className="text-3xl mb-3">{decision.icon}</div>
            <h2 className={`text-2xl font-bold mb-2 ${decision.color}`}>{decision.label}</h2>
            <p className="text-slate-600">{decision.desc}</p>
          </section>
        )}

        {/* Nút xác nhận */}
        {ackStatus === 'error' && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-red-400 text-sm">
            <AlertTriangle size={16} /> {ackError}
          </div>
        )}
        <div className="flex justify-center pb-12">
          <button
            onClick={handleAcknowledge}
            disabled={ackStatus === 'confirming'}
            className="flex items-center gap-2 px-10 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/20 text-lg"
          >
            {ackStatus === 'confirming' ? (
              <><Loader2 size={20} className="animate-spin" /> Đang xác nhận...</>
            ) : (
              <><CheckCircle size={20} /> Xác Nhận Đã Nhận Kết Quả</>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function FinalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-blue-600" />
      </div>
    }>
      <FinalContent />
    </Suspense>
  );
}
