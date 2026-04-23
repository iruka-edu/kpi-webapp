/**
 * app/evaluation/result/[id]/page.tsx — Quản lý gửi kết quả cho NV
 * -------------------------------------------------------------------
 * Vai trò: Sau khi CEO phê duyệt (status = COMPLETED), Quản lý vào
 *          trang này để xem lại kết quả cuối cùng và bấm nút gửi cho NV.
 *          Bot sẽ gửi link kết quả cho NV + CC CEO (bước 6 cuối cùng).
 *
 * Bảo mật: Dashboard password
 * URL: /evaluation/result/[eval_id]
 */

"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import EvalInfoForm from '@/components/evaluation/EvalInfoForm';
import ScoreSummaryBar from '@/components/evaluation/ScoreSummaryBar';
import { Lock, Send, Loader2, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import type { EvalInfo } from '@/components/evaluation/EvalInfoForm';

// ── Login Gate ────────────────────────────────────────────────────
function LoginGate({ onLogin }: { onLogin: (pass: string) => void }) {
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a1120]">
      <div className="w-full max-w-sm bg-slate-800/60 rounded-2xl border border-slate-700/50 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-green-600/20 rounded-2xl flex items-center justify-center mx-auto text-2xl">🎯</div>
          <h1 className="text-xl font-bold text-white">Gửi Kết Quả Cho Nhân Viên</h1>
          <p className="text-slate-400 text-sm">Xác thực để xem và gửi kết quả đánh giá</p>
        </div>
        {err && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">{err}</div>}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Mật khẩu Dashboard</label>
          <input
            type="password" value={pass}
            onChange={e => { setPass(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && (pass ? onLogin(pass) : setErr('Nhập mật khẩu'))}
            placeholder="••••••••"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-green-500 outline-none transition"
          />
        </div>
        <button
          onClick={() => pass ? onLogin(pass) : setErr('Nhập mật khẩu')}
          className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-600/20"
        >
          Xem Kết Quả
        </button>
      </div>
    </div>
  );
}

interface EvalData {
  info: EvalInfo;
  criteria: Array<{ name: string; self_score: number; mgr_score: number }>;
  mgr_comment: string;
  mgr_decision: string;
  ceo_comment: string;
  status: string;
}

const DECISION_MAP: Record<string, { label: string; color: string; icon: string }> = {
  hire:   { label: 'Tiếp nhận chính thức', color: 'text-green-400 bg-green-500/10 border-green-500/30', icon: '✅' },
  extend: { label: 'Gia hạn thử việc',      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', icon: '⏳' },
  reject: { label: 'Chấm dứt thử việc',     color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: '❌' },
};

export default function ResultPage() {
  const params = useParams();
  const evalId = params?.id as string;

  const [pass, setPass] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evalData, setEvalData] = useState<EvalData | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [mgrNote, setMgrNote] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sendError, setSendError] = useState('');

  const loadData = async (dashPass: string) => {
    setLoading(true);
    setFetchError('');
    try {
      // Dùng mgr-review GET vì nó lấy full data
      const res = await fetch(`/api/evaluation/mgr-review?id=${encodeURIComponent(evalId)}`, {
        headers: { 'x-dashboard-auth': dashPass },
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      setEvalData(data);
      setAuthed(true);
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (dashPass: string) => {
    setPass(dashPass);
    loadData(dashPass);
  };

  const handleSend = async () => {
    setSendStatus('sending');
    setSendError('');
    try {
      const res = await fetch('/api/evaluation/send-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dashboard-auth': pass },
        body: JSON.stringify({ eval_id: evalId, mgr_note: mgrNote }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      setSendStatus('sent');
    } catch (err: any) {
      setSendStatus('error');
      setSendError(err.message);
    }
  };

  if (!authed) {
    return fetchError ? (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a1120] text-center space-y-4 p-8">
        <AlertTriangle size={56} className="text-red-400" />
        <h1 className="text-xl font-bold text-white">Không thể tải phiếu</h1>
        <p className="text-slate-400">{fetchError}</p>
        <button onClick={() => { setFetchError(''); setPass(''); }} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition-colors">Thử lại</button>
      </div>
    ) : <LoginGate onLogin={handleLogin} />;
  }

  if (sendStatus === 'sent') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a1120] text-center space-y-4 p-8">
        <CheckCircle size={64} className="text-green-400" />
        <h1 className="text-2xl font-bold text-white">Đã Gửi Kết Quả!</h1>
        <p className="text-slate-400 max-w-md">
          Kết quả đánh giá đã được gửi cho <strong className="text-white">{evalData?.info.name}</strong> qua Discord.
          CEO cũng đã được CC thông báo.
        </p>
      </div>
    );
  }

  // Tính điểm
  const calcAvg = (scores: number[]) => {
    const v = scores.filter(s => s > 0);
    return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  };
  const selfMap: Record<number, number> = {};
  const mgrMap: Record<number, number> = {};
  evalData?.criteria.forEach((c, i) => { selfMap[i] = c.self_score; mgrMap[i] = c.mgr_score; });

  const decision = DECISION_MAP[evalData?.mgr_decision || ''] || null;

  return (
    <div className="flex min-h-screen bg-[#0a1120] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8 max-w-4xl mx-auto">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-600/20 flex items-center justify-center text-xl">🎯</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Gửi Kết Quả Cho Nhân Viên</h1>
              <p className="text-sm text-slate-400">Bước 6/6 — Hoàn tất quy trình đánh giá</p>
            </div>
          </div>
          {/* Breadcrumb — step 6 active */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            {['HR tạo phiếu', 'Quản lý điền việc', 'NV tự đánh giá', 'Quản lý chấm điểm', 'CEO duyệt', 'Kết quả'].map((step, i) => (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                  i === 5 ? 'bg-green-600 text-white' : 'bg-green-600/20 text-green-400'
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 5 ? 'bg-white/20' : 'bg-green-600/30'
                  }`}>{i + 1}</span>
                  {step}
                </div>
                {i < 5 && <span className="text-green-700 shrink-0">›</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {loading && <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-green-400" /></div>}

        {evalData && (
          <div className="space-y-8">
            {/* Thông tin NV */}
            <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-base font-bold text-slate-300 mb-4">📋 Thông Tin Nhân Viên</h2>
              <EvalInfoForm info={evalData.info} />
            </section>

            {/* Điểm tổng */}
            <ScoreSummaryBar selfScores={selfMap} mgrScores={mgrMap} total={evalData.criteria.length} />

            {/* Quyết định CEO đã duyệt */}
            {decision && (
              <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
                <h2 className="text-base font-bold text-slate-300 mb-4">🏁 Quyết Định Đã Được CEO Phê Duyệt</h2>
                <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl border font-bold text-lg ${decision.color}`}>
                  <span>{decision.icon}</span>
                  <span>{decision.label}</span>
                </div>

                {/* Nhận xét QL */}
                {evalData.mgr_comment && (
                  <div className="mt-4 bg-slate-900/50 rounded-xl p-4 border border-slate-700/40">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      <MessageSquare size={13} /> Nhận xét của Quản lý
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{evalData.mgr_comment}</p>
                  </div>
                )}

                {/* Ghi chú CEO */}
                {evalData.ceo_comment && (
                  <div className="mt-3 bg-amber-500/5 rounded-xl p-4 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-500/70 uppercase tracking-wide mb-2">
                      👑 Ghi chú của CEO
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{evalData.ceo_comment}</p>
                  </div>
                )}
              </section>
            )}

            {/* Lời nhắn kèm kết quả */}
            <section className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-base font-bold text-slate-300 mb-3 flex items-center gap-2">
                Lời Nhắn Gửi Nhân Viên
                <span className="text-slate-500 font-normal text-xs">(không bắt buộc)</span>
              </h2>
              <textarea
                rows={4}
                value={mgrNote}
                onChange={e => setMgrNote(e.target.value)}
                placeholder="Lời nhắn, động viên, hoặc hướng dẫn tiếp theo cho nhân viên..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-none transition"
              />
            </section>

            {/* Lỗi */}
            {sendStatus === 'error' && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-red-400 text-sm">
                <AlertTriangle size={16} className="shrink-0" /> {sendError}
              </div>
            )}

            {/* Nút gửi */}
            <div className="flex justify-end pb-8">
              <button
                onClick={handleSend}
                disabled={sendStatus === 'sending'}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-600/20"
              >
                {sendStatus === 'sending' ? (
                  <><Loader2 size={18} className="animate-spin" /> Đang gửi...</>
                ) : (
                  <><Send size={18} /> Gửi Kết Quả Cho Nhân Viên</>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
