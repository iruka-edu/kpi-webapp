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

import React, { useState, useEffect } from 'react';
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
    color: 'text-green-400',
    bg: 'from-green-900/30 to-green-900/10 border-green-500/30',
    icon: '🎉',
    desc: 'Chúc mừng! Bạn đã hoàn thành thử việc xuất sắc.',
  },
  extend: {
    label: 'Gia hạn thử việc',
    color: 'text-yellow-400',
    bg: 'from-yellow-900/30 to-yellow-900/10 border-yellow-500/30',
    icon: '⏳',
    desc: 'Công ty quyết định gia hạn thử việc thêm. Hãy tiếp tục cố gắng!',
  },
  reject: {
    label: 'Chấm dứt thử việc',
    color: 'text-red-400',
    bg: 'from-red-900/30 to-red-900/10 border-red-500/30',
    icon: '📋',
    desc: 'Rất tiếc, công ty quyết định không tiếp tục sau thử việc.',
  },
};

export default function FinalPage() {
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
      <div className="min-h-screen bg-[#0a1120] flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-blue-400" />
      </div>
    );
  }

  // ── Lỗi ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a1120] flex flex-col items-center justify-center text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-red-400" />
        <h1 className="text-xl font-bold text-white">Không thể xem kết quả</h1>
        <p className="text-slate-400 max-w-md">{error}</p>
        <p className="text-slate-500 text-sm">Vui lòng liên hệ HR nếu cần hỗ trợ.</p>
      </div>
    );
  }

  // ── Đã xác nhận ──────────────────────────────────────────────────
  if (ackStatus === 'confirmed') {
    return (
      <div className="min-h-screen bg-[#0a1120] flex flex-col items-center justify-center text-center space-y-4 p-8">
        <CheckCircle size={64} className="text-green-400" />
        <h1 className="text-2xl font-bold text-white">Đã Xác Nhận Nhận Kết Quả!</h1>
        <p className="text-slate-400 max-w-md">
          Cảm ơn bạn đã xem kết quả đánh giá thử việc.<br />
          Nếu có thắc mắc, vui lòng liên hệ trực tiếp với Quản lý hoặc HR.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1120] text-slate-100">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/50 to-slate-900 border-b border-slate-800 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-2xl">📋</div>
          <div>
            <h1 className="text-xl font-bold text-white">Kết Quả Đánh Giá Thử Việc</h1>
            <p className="text-sm text-slate-400">IruKa Edu — Hệ thống đánh giá nhân sự</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Thông tin NV */}
        {evalData && (
          <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Nhân viên', evalData.info.name],
                ['Vị trí', evalData.info.position],
                ['Phòng ban', evalData.info.department],
                ['Ngày bắt đầu', evalData.info.start_date],
                ['Quản lý trực tiếp', evalData.info.manager_name],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
                  <div className="text-white font-medium mt-0.5">{value || '—'}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Điểm tổng kết */}
        {evalData && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Bạn tự chấm', avg: selfAvg, color: 'text-blue-400' },
              { label: 'Quản lý chấm', avg: mgrAvg, color: 'text-purple-400' },
              { label: 'Điểm chung', avg: combined, color: getVerdictColor(combined) },
            ].map(({ label, avg, color }) => (
              <div key={label} className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50 text-center space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
                <div className={`text-4xl font-bold ${color}`}>{avg > 0 ? avg.toFixed(1) : '—'}</div>
                {label === 'Điểm chung' && avg > 0 && (
                  <div className={`text-sm font-semibold ${color}`}>{getVerdictLabel(avg)}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chi tiết tiêu chí */}
        {evalData && (
          <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
            <h2 className="text-base font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Star size={16} className="text-yellow-400" /> Chi Tiết Từng Tiêu Chí
            </h2>
            <div className="space-y-2">
              {evalData.criteria.map((c, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center bg-slate-900/50 rounded-xl px-4 py-3 border border-slate-700/40">
                  <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">{i + 1}</div>
                  <div>
                    <div className="text-white font-medium text-sm">{c.name}</div>
                    {c.expectation && <div className="text-slate-500 text-xs mt-0.5">{c.expectation}</div>}
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-blue-400/70 uppercase mb-0.5">Tự chấm</div>
                    <div className="text-xl font-bold text-blue-400">{c.self_score || '—'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-purple-400/70 uppercase mb-0.5">QL chấm</div>
                    <div className="text-xl font-bold text-purple-400">{c.mgr_score || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Nhận xét QL */}
        {evalData?.mgr_comment && (
          <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
            <h2 className="text-base font-bold text-slate-300 mb-3 flex items-center gap-2">
              <MessageSquare size={16} className="text-slate-400" /> Nhận Xét Của Quản Lý
            </h2>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">{evalData.mgr_comment}</p>
          </section>
        )}

        {/* Ghi chú CEO */}
        {evalData?.ceo_comment && (
          <section className="bg-amber-500/5 rounded-2xl p-6 border border-amber-500/20">
            <h2 className="text-base font-bold text-amber-400/80 mb-3 flex items-center gap-2">👑 Ghi Chú Của CEO</h2>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">{evalData.ceo_comment}</p>
          </section>
        )}

        {/* Lời nhắn QL */}
        {evalData?.mgr_note && (
          <section className="bg-blue-500/5 rounded-2xl p-6 border border-blue-500/20">
            <h2 className="text-base font-bold text-blue-400/80 mb-3">💬 Lời Nhắn Từ Quản Lý</h2>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">{evalData.mgr_note}</p>
          </section>
        )}

        {/* Quyết định chính thức */}
        {decision && evalData && (
          <section className={`rounded-2xl p-6 border bg-gradient-to-br ${decision.bg}`}>
            <div className="text-3xl mb-3">{decision.icon}</div>
            <h2 className={`text-2xl font-bold mb-2 ${decision.color}`}>{decision.label}</h2>
            <p className="text-slate-300">{decision.desc}</p>
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
      </div>
    </div>
  );
}
