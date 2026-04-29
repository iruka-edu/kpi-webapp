"use client";

/**
 * EvaluationForm.tsx — Form đánh giá nhân sự DUY NHẤT cho 4 vai
 * ----------------------------------------------------------------
 * Một tờ giấy chuyền tay HR → NV → QL → CEO. Layout giống nhau ở 4 vai.
 * Mỗi vai chỉ khác nhau:
 *   - Phần nào enable cho mình điền (theo permissions.ts)
 *   - Ô ký nào active
 *
 * Props:
 *   viewMode      : 'hr' | 'nv' | 'mgr' | 'ceo'
 *   initialData   : Dữ liệu ban đầu (HR: rỗng; NV/QL/CEO: load từ API)
 *   currentUserId : Discord ID người đang dùng (để ký xác nhận)
 *   currentUserName: Tên hiển thị (lấy từ Discord)
 *   token         : HMAC token (để gửi kèm khi submit)
 *   onSuccess     : Callback sau khi submit thành công
 */

import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, PlusCircle, Send, Trash2, X } from 'lucide-react';
import { canEdit, canSign, ROLE_LABEL, STATUS_LABEL } from './permissions';
import { MANAGER_LIST, addLabelForGroup, groupCriteria } from './defaults';
import type { CriteriaItem, EvaluationData, MemberOption, ViewMode, WorkItem } from './types';

interface EvaluationFormProps {
  viewMode: ViewMode;
  initialData: EvaluationData;
  currentUserId: string;
  currentUserName: string;
  token: string;            // Token HMAC từ URL (NV/QL/CEO) hoặc HR init token
  onSuccess?: () => void;
}

const SCORE_OPTIONS = [
  { v: 1, label: 'Chưa đạt',     bg: 'bg-[#dc2626]' },
  { v: 2, label: 'Đạt một phần', bg: 'bg-[#f97316]' },
  { v: 3, label: 'Đạt',          bg: 'bg-[#eab308]' },
  { v: 4, label: 'Tốt',          bg: 'bg-[#22c55e]' },
  { v: 5, label: 'Xuất sắc',     bg: 'bg-[#16a34a]' },
];

// ── Endpoint mỗi vai gọi khi submit ────────────────────────────
// QL có 2 lần action: MGR_PENDING → mgr-fill; SUBMITTED → mgr-review
function getSubmitEndpoint(view: ViewMode, status: string): string {
  if (view === 'hr')  return '/api/evaluation/init';
  if (view === 'nv')  return '/api/evaluation';
  if (view === 'mgr') return status === 'MGR_PENDING' ? '/api/evaluation/mgr-fill' : '/api/evaluation/mgr-review';
  if (view === 'ceo') return '/api/evaluation/ceo-review';
  return '';
}

export default function EvaluationForm({
  viewMode,
  initialData,
  currentUserId,
  currentUserName,
  token,
  onSuccess,
}: EvaluationFormProps) {
  const [data, setData] = useState<EvaluationData>(initialData);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [memberList, setMemberList] = useState<MemberOption[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialData.info.name || '');
  const pickerRef = useRef<HTMLDivElement>(null);

  // ── Permission helpers (shorthand) ──────────────────────────
  // Safety net: nếu data.is_ceo_direct không được set (server cũ chưa redeploy),
  // ở viewMode='ceo' tự derive bằng cách so currentUserId (CEO mở link) với
  // manager_discord_id của phiếu. Trùng → CEO chính là QL → CEO-direct.
  const isCeoDirect = (data.is_ceo_direct ?? false) || (
    viewMode === 'ceo' &&
    !!currentUserId &&
    !!data.info?.manager_discord_id &&
    data.info.manager_discord_id === currentUserId
  );
  const cur = (key: Parameters<typeof canEdit>[0]) => canEdit(key, viewMode, data.status, isCeoDirect);
  const mySignAllowed = canSign(viewMode, data.status, isCeoDirect);

  // ── HR: Load member list khi mount (chỉ HR cần dropdown chọn NV) ──
  useEffect(() => {
    if (viewMode !== 'hr' || !cur('info')) return;
    const url = token && currentUserId
      ? `/api/members?token=${encodeURIComponent(token)}&hr_discord_id=${encodeURIComponent(currentUserId)}`
      : '/api/members';
    fetch(url)
      .then(r => r.json())
      .then(d => { if (d.members) setMemberList(d.members); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Đóng dropdown khi click outside ──────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Field updaters ─────────────────────────────────────────
  const setInfo  = (k: keyof EvaluationData['info'],  v: string) => setData(d => ({ ...d, info:  { ...d.info,  [k]: v } }));
  const setProp  = (k: keyof EvaluationData['proposal'],   v: string) => setData(d => ({ ...d, proposal:   { ...d.proposal,   [k]: v } }));
  const setConcl = (k: keyof EvaluationData['conclusion'], v: string) => setData(d => ({ ...d, conclusion: { ...d.conclusion, [k]: v } }));

  const updateWork = (i: number, k: keyof WorkItem, v: string) =>
    setData(d => ({ ...d, work_items: d.work_items.map((w, idx) => idx === i ? { ...w, [k]: v } : w) }));
  const addWork = () =>
    setData(d => ({ ...d, work_items: [...d.work_items, { task: '', details: '', result: '' }] }));
  const removeWork = (i: number) =>
    setData(d => ({ ...d, work_items: d.work_items.filter((_, idx) => idx !== i) }));

  const updateCrit = (i: number, k: keyof CriteriaItem, v: string | number) =>
    setData(d => ({ ...d, criteria: d.criteria.map((c, idx) => idx === i ? { ...c, [k]: v } : c) }));
  const addCrit = (group: string) =>
    setData(d => ({ ...d, criteria: [...d.criteria, { name: '', expectation: '', group, source: viewMode === 'hr' ? 'hr_template' : viewMode === 'mgr' ? 'mgr' : 'nv_added' }] }));
  const removeCrit = (i: number) =>
    setData(d => ({ ...d, criteria: d.criteria.filter((_, idx) => idx !== i) }));

  // ── HR chọn NV từ dropdown → auto-fill ─────────────────────
  const selectMember = (m: MemberOption) => {
    setShowDropdown(false);
    setSearchQuery(m.name);
    const mgrInList = MANAGER_LIST.find(x => x.discord_id === m.managerDiscordId);
    const mgrName = mgrInList ? mgrInList.name : (m.managerName || MANAGER_LIST[0].name);
    const mgrId   = mgrInList ? mgrInList.discord_id : (m.managerDiscordId || MANAGER_LIST[0].discord_id);
    setData(d => ({
      ...d,
      info: {
        ...d.info,
        name: m.name,
        discord_id: m.discordId,
        dept: m.dept,
        manager_name: mgrName,
        manager_discord_id: mgrId,
        trial_start: m.joinedAt ? m.joinedAt.slice(0, 10) : d.info.trial_start,
      },
    }));
  };

  const selectManager = (mgrName: string) => {
    const m = MANAGER_LIST.find(x => x.name === mgrName);
    if (!m) return;
    setData(d => ({ ...d, info: { ...d.info, manager_name: m.name, manager_discord_id: m.discord_id } }));
  };

  // ── Tính tổng điểm tự động ──────────────────────────────────
  const scoreStats = useMemo(() => {
    const count = data.criteria.length;
    const max = count * 5;
    const nvScores = data.criteria.map(c => c.self_score || 0).filter(s => s > 0);
    const mgrScores = data.criteria.map(c => c.mgr_score || 0).filter(s => s > 0);
    const nvSum  = nvScores.reduce((a, b) => a + b, 0);
    const mgrSum = mgrScores.reduce((a, b) => a + b, 0);
    const nvAvg  = nvScores.length  > 0 ? nvSum  / nvScores.length  : 0;
    const mgrAvg = mgrScores.length > 0 ? mgrSum / mgrScores.length : 0;
    const combined = mgrAvg > 0 && nvAvg > 0 ? (nvAvg + mgrAvg) / 2 : (mgrAvg || nvAvg);
    let verdict = 'Đang chờ đánh giá';
    let verdictColor = 'bg-[#dcfce7] text-[#15803d] border-[#86efac]';
    if (combined >= 4.5) { verdict = 'Xuất sắc'; verdictColor = 'bg-[#dcfce7] text-[#15803d] border-[#86efac]'; }
    else if (combined >= 3.5) { verdict = 'Tốt'; verdictColor = 'bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]'; }
    else if (combined >= 2.5) { verdict = 'Đạt yêu cầu'; verdictColor = 'bg-[#fef3c7] text-[#92400e] border-[#fcd34d]'; }
    else if (combined > 0)    { verdict = 'Cần cải thiện'; verdictColor = 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]'; }
    return { count, max, nvSum, mgrSum, combined, verdict, verdictColor };
  }, [data.criteria]);

  // ── Submit toàn bộ form (mỗi vai gọi endpoint khác) ──────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');
    try {
      // Đính kèm chữ ký mới của vai hiện tại + timestamp
      const now = new Date().toISOString();
      const newSignatures = {
        ...data.signatures,
        [viewMode]: {
          signed_at: now,
          signed_by: currentUserName || currentUserId,
          discord_id: currentUserId,
        },
      };

      // Build payload theo endpoint từng vai (giữ nguyên contract API cũ)
      const payload = buildPayload(viewMode, { ...data, signatures: newSignatures }, token, currentUserId);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // HR vẫn dùng x-dashboard-auth header (token làm dashboard pass — fallback HMAC trong API)
      if (viewMode === 'hr' && token) {
        headers['x-dashboard-auth'] = token;
      }

      const endpoint = getSubmitEndpoint(viewMode, data.status);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Lỗi gửi phiếu');

      setData(d => ({ ...d, signatures: newSignatures }));
      setStatus('success');
      onSuccess?.();
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  // ── Validate trước khi submit (hiển thị lỗi inline) ─────────
  const validateBeforeSubmit = (): string | null => {
    if (viewMode === 'hr') {
      if (!data.info.name)               return 'Vui lòng chọn nhân viên';
      if (!data.info.dept)               return 'Vui lòng nhập bộ phận';
      if (!data.info.trial_start)        return 'Vui lòng nhập ngày bắt đầu thử việc';
      if (!data.info.manager_discord_id) return 'Vui lòng chọn quản lý trực tiếp';
    }
    if (viewMode === 'nv') {
      const missingResult = data.work_items.some(w => !w.result?.trim());
      if (missingResult)                 return 'Vui lòng điền kết quả cho tất cả mảng việc';
      const missingScore = data.criteria.some(c => !c.self_score);
      if (missingScore)                  return 'Vui lòng chấm điểm cho tất cả tiêu chí';
      if (!data.proposal.salary_expectation.trim()) return 'Vui lòng nhập lương kỳ vọng';
      if (!data.proposal.training_request.trim())   return 'Vui lòng nhập đào tạo cần hỗ trợ';
    }
    if (viewMode === 'mgr') {
      if (data.status === 'MGR_PENDING') {
        // mgr-fill: chỉ cần điền việc + tiêu chí
        const missingWork = data.work_items.some(w => !w.task.trim());
        if (missingWork) return 'Vui lòng điền tất cả mảng việc';
        if (data.criteria.length === 0) return 'Vui lòng có ít nhất 1 tiêu chí';
      } else {
        // mgr-review: chấm điểm + quyết định
        const missingScore = data.criteria.some(c => !c.mgr_score);
        if (missingScore) return 'Vui lòng chấm điểm cho tất cả tiêu chí';
        if (!data.conclusion.mgr_comment.trim()) return 'Vui lòng nhập nhận xét chung';
        if (!data.conclusion.mgr_decision)        return 'Vui lòng chọn quyết định';
      }
    }
    if (viewMode === 'ceo') {
      if (isCeoDirect) {
        // CEO kiêm QL: phải chấm điểm + nhận xét + quyết định như QL
        const missingScore = data.criteria.some(c => !c.mgr_score);
        if (missingScore) return 'Vui lòng chấm điểm QL ĐG cho tất cả tiêu chí';
        if (!data.conclusion.mgr_comment.trim()) return 'Vui lòng nhập nhận xét chung (vai Quản lý)';
        if (!data.conclusion.mgr_decision)        return 'Vui lòng chọn quyết định (vai Quản lý)';
      } else {
        if (!data.conclusion.mgr_decision) return 'Quản lý chưa chọn quyết định';
      }
    }
    return null;
  };

  // ── RENDER ─────────────────────────────────────────────────

  // Success screen
  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
        <CheckCircle size={64} className="text-[#16a34a]" />
        <h2 className="text-2xl font-bold text-[#1e3a5f]">Đã gửi phiếu thành công!</h2>
        <p className="text-[#6b7280] max-w-md">{successMessage(viewMode)}</p>
      </div>
    );
  }

  return (
    <>
      {/* Toast lỗi — hiện giữa màn hình khi validate fail */}
      {errorMsg && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => { setErrorMsg(''); setStatus('idle'); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center gap-4 text-center animate-bounce-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <div>
              <div className="font-black text-[#1e3a5f] text-lg mb-1">Thiếu thông tin!</div>
              <div className="text-[#374151] text-base font-medium leading-snug">{errorMsg}</div>
            </div>
            <button
              type="button"
              onClick={() => { setErrorMsg(''); setStatus('idle'); }}
              className="mt-1 px-6 py-2 bg-[#1e3a5f] text-white rounded-lg font-bold text-sm hover:bg-[#16304f] transition-colors"
            >
              Đã hiểu, điền tiếp
            </button>
          </div>
        </div>
      )}
    <form
      onSubmit={(e) => {
        const err = validateBeforeSubmit();
        if (err) { e.preventDefault(); setErrorMsg(err); setStatus('error'); return; }
        handleSubmit(e);
      }}
      className="space-y-6 pb-24"
    >

      {/* ───── 1. THÔNG TIN CHUNG ───── */}
      <Section title="1. Thông Tin Chung" icon="📋">
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Họ tên NV */}
            <div className="flex flex-col gap-1.5" ref={pickerRef}>
              <Label required>Họ và tên NV</Label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={!cur('info')}
                  value={searchQuery || data.info.name}
                  onChange={e => { setSearchQuery(e.target.value); setInfo('name', e.target.value); setShowDropdown(true); }}
                  onFocus={() => { if (cur('info') && memberList.length > 0) setShowDropdown(true); }}
                  placeholder="Gõ tên hoặc chọn từ danh sách..."
                  className={inputCls(!cur('info'))}
                />
                {showDropdown && cur('info') && memberList.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#d1d5db] rounded-[8px] shadow-lg max-h-52 overflow-y-auto">
                    {memberList
                      .filter(m => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(m => (
                        <button
                          key={m.discordId}
                          type="button"
                          onClick={() => selectMember(m)}
                          className="w-full text-left px-3 py-2.5 hover:bg-[#eff6ff] transition-colors border-b border-[#f1f5f9] last:border-0 flex items-center gap-2.5"
                        >
                          <div className="w-7 h-7 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-[#1e3a5f] font-black text-sm shrink-0">
                            {m.name.split(' ').pop()?.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-800 truncate">{m.name}</div>
                            <div className="text-xs text-slate-500">{m.dept}</div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label required>Ngày bắt đầu thử việc</Label>
              <input type="date" required disabled={!cur('info')} value={data.info.trial_start} onChange={e => setInfo('trial_start', e.target.value)} className={inputCls(!cur('info'))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Ngày kết thúc thử việc</Label>
              <input type="date" disabled={!cur('info')} value={data.info.trial_end || ''} onChange={e => setInfo('trial_end', e.target.value)} className={inputCls(!cur('info'))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Bộ phận</Label>
              <input type="text" required disabled={!cur('info')} value={data.info.dept} onChange={e => setInfo('dept', e.target.value)} placeholder="Kỹ thuật / Marketing / HCNS..." className={inputCls(!cur('info'))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Quản lý trực tiếp</Label>
              <select disabled={!cur('info')} value={data.info.manager_name} onChange={e => selectManager(e.target.value)} className={inputCls(!cur('info'))}>
                {MANAGER_LIST.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-dashed border-[#d1d5db] text-[#6b7280] italic flex items-center gap-1.5">
            <span>📅 Ngày khởi tạo đánh giá:</span>
            <strong className="text-[#1e3a5f] not-italic">
              {data.info.eval_date ? formatDateVN(data.info.eval_date) : '--'}
            </strong>
          </div>
        </div>
      </Section>

      {/* Thang điểm */}
      <div className="flex flex-wrap justify-center items-center gap-2 px-5">
        <span className="font-bold text-[#6b7280] mr-1">Thang điểm:</span>
        {SCORE_OPTIONS.map(o => (
          <span key={o.v} className="inline-flex items-center gap-1.5 font-bold">
            <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center font-black text-white ${o.bg}`}>{o.v}</span>
            <span className="text-[#374151]">{o.label}</span>
          </span>
        ))}
      </div>

      {/* ───── 2. TỔNG KẾT CÔNG VIỆC ───── */}
      <Section title="2. Tổng Kết Công Việc Thời Gian Thử Việc" icon="🗂️" hint="(HR điền sẵn, Quản lý & Nhân viên bổ sung sau)">
        {isCeoDirect && viewMode === 'nv' && (
          <div className="px-5 pt-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-amber-800 text-sm">
              ⚠️ Quản lý trực tiếp của bạn là CEO — bạn cần tự điền công việc đã làm trong thời gian thử việc.
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th width="40px" align="center">STT</Th>
                <Th minWidth="200px">Mảng việc lớn</Th>
                <Th minWidth="260px">Chi tiết các đầu việc nhỏ</Th>
                <Th minWidth="160px" muted>Kết quả tự đánh giá</Th>
                <Th width="44px" align="center">Xóa</Th>
              </tr>
            </thead>
            <tbody>
              {data.work_items.map((w, i) => (
                <tr key={i} className="hover:bg-[#eff6ff] transition-colors">
                  <Td align="center" bold>{i + 1}</Td>
                  <Td>
                    <textarea rows={2} disabled={!cur('work_area')} value={w.task} onChange={e => updateWork(i, 'task', e.target.value)} placeholder="Nhập mảng việc lớn..." className={cellCls('font-bold', !cur('work_area'))} />
                  </Td>
                  <Td>
                    <textarea rows={2} disabled={!cur('work_area')} value={w.details} onChange={e => updateWork(i, 'details', e.target.value)} placeholder="Ghi chi tiết các đầu việc nhỏ..." className={cellCls('', !cur('work_area'))} />
                  </Td>
                  <Td muted>
                    {cur('work_result') ? (
                      <textarea rows={2} value={w.result || ''} onChange={e => updateWork(i, 'result', e.target.value)} placeholder="NV điền kết quả thực tế đã đạt được..." className={cellCls('', false)} />
                    ) : (
                      <div className="text-sm text-[#9ca3af] italic px-1">{w.result || 'Nhân viên tự đánh giá, cho thang điểm và giải thích...'}</div>
                    )}
                  </Td>
                  <Td align="center">
                    {cur('work_area') && (
                      <button type="button" onClick={() => removeWork(i)} className="text-red-400 hover:text-red-700 p-2 transition-colors" title="Xóa đầu việc">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
              {cur('work_area') && (
                <tr>
                  <td colSpan={5} className="border border-dashed border-blue-300 p-2 text-center bg-blue-50/20">
                    <button type="button" onClick={addWork} className="text-[#1e3a5f] hover:text-blue-800 font-semibold flex items-center justify-center gap-2 w-full py-1 text-sm">
                      <PlusCircle size={15} /> Thêm đầu việc
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ───── 3. ĐÁNH GIÁ NĂNG LỰC ───── */}
      <Section title="3. Đánh Giá Năng Lực (Tiêu Chí Mẫu)" icon="⚡" hint="(HR điền sẵn tiêu chí, Quản lý & Nhân viên đánh giá sau)">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th width="40px" align="center">STT</Th>
                <Th minWidth="250px">Tiêu chí đánh giá</Th>
                <Th minWidth="250px" align="center">Mô tả kỳ vọng</Th>
                <Th width="110px" align="center" muted>Tự ĐG</Th>
                <Th width="110px" align="center" muted>QL ĐG</Th>
                <Th width="44px" align="center">Xóa</Th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const grouped = groupCriteria(data.criteria);
                // STT chạy liên tiếp xuyên suốt các nhóm (1,2,3,4...) theo thứ tự render,
                // không dùng index gốc trong mảng (tránh hiện 1,2,3,10 khi xóa/thêm).
                const sttByIndex: Record<number, number> = {};
                let _stt = 0;
                Object.values(grouped).forEach(items => {
                  items.forEach(({ index }) => { _stt += 1; sttByIndex[index] = _stt; });
                });
                return Object.entries(grouped).map(([group, items]) => (
                <Fragment key={group}>
                  <tr>
                    <td colSpan={6} className="bg-[#1e3a5f]/5 text-[#1e3a5f] font-black text-base uppercase tracking-[0.06em] p-[8px_12px] border border-[#d1d5db]">
                      {group}
                    </td>
                  </tr>
                  {items.map(({ item: c, index }) => (
                    <tr key={index} className="hover:bg-[#eff6ff] transition-colors">
                      <Td align="center" bold>{sttByIndex[index]}</Td>
                      <Td>
                        <textarea rows={2} disabled={!cur('criteria_meta')} value={c.name} onChange={e => updateCrit(index, 'name', e.target.value)} placeholder="Nhập tên tiêu chí..." className={cellCls('font-bold', !cur('criteria_meta'))} />
                      </Td>
                      <Td>
                        <textarea rows={2} disabled={!cur('criteria_meta')} value={c.expectation} onChange={e => updateCrit(index, 'expectation', e.target.value)} placeholder="Mô tả kỳ vọng..." className={cellCls('', !cur('criteria_meta'))} />
                      </Td>
                      {/* Cột Tự ĐG (NV chấm) */}
                      <Td muted align="center">
                        <ScoreSelect
                          value={c.self_score || 0}
                          disabled={!cur('criteria_self')}
                          onChange={(v) => updateCrit(index, 'self_score', v)}
                        />
                      </Td>
                      {/* Cột QL ĐG */}
                      <Td muted align="center">
                        <ScoreSelect
                          value={c.mgr_score || 0}
                          disabled={!cur('criteria_mgr')}
                          onChange={(v) => updateCrit(index, 'mgr_score', v)}
                        />
                      </Td>
                      <Td align="center">
                        {cur('criteria_meta') && (viewMode !== 'nv' || c.source === 'nv_added') && (
                          <button type="button" onClick={() => removeCrit(index)} className="text-red-400 hover:text-red-700 p-2 transition-colors" title="Xóa tiêu chí">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </Td>
                    </tr>
                  ))}
                  {cur('criteria_meta') && (
                    <tr>
                      <td colSpan={6} className="border border-dashed border-blue-300 p-2 text-center bg-blue-50/20">
                        <button type="button" onClick={() => addCrit(group)} className="text-[#1e3a5f] hover:text-blue-800 font-semibold flex items-center justify-center gap-2 w-full py-1 text-sm">
                          <PlusCircle size={15} /> {addLabelForGroup(group)}
                        </button>
                      </td>
                    </tr>
                  )}
                </Fragment>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </Section>

      {/* TỔNG ĐIỂM (auto compute, mọi vai đều thấy) */}
      <div className="rounded-xl p-[24px_32px] flex flex-wrap items-center gap-6"
        style={{ background: 'linear-gradient(135deg,#fffbeb,#fef9c3)', border: '2px solid #fbbf24' }}>
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.06em] text-[#6b7280] mb-1">Điểm nhân viên</div>
          <div className="text-[40px] font-black leading-none text-[#b45309]">{scoreStats.nvSum > 0 ? scoreStats.nvSum : '—'}</div>
          <div className="text-xs text-[#6b7280] font-medium mt-1">/ {scoreStats.max} điểm tối đa ({scoreStats.count} tiêu chí × 5)</div>
        </div>
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.06em] text-[#6b7280] mb-1">Điểm quản lý</div>
          <div className="text-[40px] font-black leading-none text-[#b45309]">{scoreStats.mgrSum > 0 ? scoreStats.mgrSum : '—'}</div>
          <div className="text-xs text-[#6b7280] font-medium mt-1">/ {scoreStats.max} điểm tối đa ({scoreStats.count} tiêu chí × 5)</div>
        </div>
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.06em] text-[#6b7280] mb-1">Điểm bình quân</div>
          <div className="text-[40px] font-black leading-none text-[#b45309]">{scoreStats.combined > 0 ? scoreStats.combined.toFixed(1) : '—'}</div>
          <div className="text-xs text-[#6b7280] font-medium mt-1">/ 5.0</div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="text-sm font-bold uppercase tracking-[0.06em] text-[#6b7280] mb-2">Kết quả sơ bộ</div>
          <span className={`inline-flex items-center gap-2 font-black px-5 py-2 rounded-full border-2 ${scoreStats.verdictColor}`}>
            {scoreStats.verdict}
          </span>
          <div className="text-xs text-[#6b7280] mt-2 font-medium">{scoreStats.count} tiêu chí · Tối đa {scoreStats.max} điểm</div>
        </div>
      </div>

      {/* ───── 4. NHÂN VIÊN TỰ ĐỀ XUẤT ───── */}
      <Section title="4. Nhân Viên Tự Đề Xuất" icon="✍️" hint="Bắt buộc điền — CEO / Quản lý sẽ xem xét">
        <div className="p-5 grid gap-4">
          <FieldText
            label="💰 LƯƠNG THƯỞNG / CHẾ ĐỘ MONG MUỐN"
            required
            value={data.proposal.salary_expectation}
            disabled={!cur('proposal')}
            onChange={(v) => setProp('salary_expectation', v)}
            placeholder="Nêu rõ mức lương kỳ vọng và lý do cụ thể sau giai đoạn thử việc..."
            minHeight="60px"
          />
          <FieldText
            label="📚 ĐÀO TẠO CHUYÊN MÔN CẦN HỖ TRỢ"
            required
            value={data.proposal.training_request}
            disabled={!cur('proposal')}
            onChange={(v) => setProp('training_request', v)}
            placeholder="VD: Khóa học React nâng cao, đào tạo nghiệp vụ giáo dục, kỹ năng AI..."
            minHeight="60px"
          />
          <FieldText
            label="🏢 GÓP Ý VỀ MÔI TRƯỜNG / QUY TRÌNH / VĂN HÓA CÔNG TY"
            value={data.proposal.feedback}
            disabled={!cur('proposal')}
            onChange={(v) => setProp('feedback', v)}
            placeholder="VD: Cần rõ ràng hơn về quy trình onboarding, muốn có mentor hỗ trợ trong 3 tháng đầu..."
            minHeight="60px"
          />
        </div>
      </Section>

      {/* ───── 5. QUẢN LÝ ĐÁNH GIÁ & KẾT LUẬN ───── */}
      <Section title="5. Quản Lý Đánh Giá & Kết Luận" icon="👔" hint="Chỉ Quản lý / CEO điền phần này">
        <div className="p-5 grid gap-4">
          <FieldText
            label="📝 NHẬN XÉT CHUNG VỀ NHÂN VIÊN"
            required
            value={data.conclusion.mgr_comment}
            disabled={!cur('conclusion')}
            onChange={(v) => setConcl('mgr_comment', v)}
            placeholder="Nhận xét tổng quát về năng lực, thái độ, sự phù hợp với vị trí và văn hóa công ty..."
            minHeight="90px"
          />
          <FieldText
            label="🎯 KỲ VỌNG & MỤC TIÊU KHI CHÍNH THỨC"
            value={data.conclusion.mgr_expectation}
            disabled={!cur('conclusion')}
            onChange={(v) => setConcl('mgr_expectation', v)}
            placeholder="Mục tiêu cụ thể cần đạt trong 3 tháng đầu chính thức nếu được thông qua..."
            minHeight="60px"
          />
          <FieldText
            label="💰 ĐỀ XUẤT LƯƠNG THƯỞNG / CHẾ ĐỘ TỪ QUẢN LÝ"
            value={data.conclusion.mgr_salary_proposal}
            disabled={!cur('conclusion')}
            onChange={(v) => setConcl('mgr_salary_proposal', v)}
            placeholder="Mức lương chính thức đề xuất, phụ cấp, KPI gắn thưởng (nếu có)..."
            minHeight="60px"
          />
          {/* CEO bổ sung nhận xét (chỉ hiện ở vai CEO hoặc khi đã có) */}
          {(viewMode === 'ceo' || data.conclusion.ceo_comment) && (
            <FieldText
              label="👑 NHẬN XÉT BỔ SUNG TỪ CEO"
              value={data.conclusion.ceo_comment || ''}
              disabled={!cur('ceo_comment')}
              onChange={(v) => setConcl('ceo_comment', v)}
              placeholder="CEO ghi chú thêm trước khi phê duyệt (optional)..."
              minHeight="60px"
            />
          )}

          <hr className="border-[#d1d5db] my-1" />

          {/* Quyết định */}
          <div>
            <div className="text-base font-bold text-[#374151] uppercase tracking-[0.04em] mb-3">
              ⚖️ QUYẾT ĐỊNH <span className="text-red-600">*</span>
            </div>
            <div className="flex flex-wrap gap-[10px]">
              {[
                { v: 'pass',   icon: '✅', label: 'CHÍNH THỨC',     desc: 'Đạt yêu cầu, ký HĐ chính thức',       color: 'text-[#15803d]' },
                { v: 'extend', icon: '⏳', label: 'GIA HẠN THỬ VIỆC', desc: 'Gia hạn thêm 1 tháng để theo dõi',  color: 'text-[#111]' },
                { v: 'fail',   icon: '❌', label: 'CHẤM DỨT',        desc: 'Không phù hợp, kết thúc hợp đồng',    color: 'text-[#dc2626]' },
              ].map(d => (
                <label key={d.v} className={`flex items-center gap-2 border-2 rounded-[8px] p-[10px_16px] transition-all ${cur('conclusion') ? 'cursor-pointer hover:border-[#1e3a5f] hover:bg-[rgba(30,58,95,0.04)]' : 'opacity-70 cursor-not-allowed'} ${data.conclusion.mgr_decision === d.v ? 'border-[#1e3a5f] bg-[rgba(30,58,95,0.04)]' : 'border-[#d1d5db]'}`}>
                  <input
                    type="radio"
                    name="trial-decision"
                    value={d.v}
                    disabled={!cur('conclusion')}
                    checked={data.conclusion.mgr_decision === d.v}
                    onChange={() => setConcl('mgr_decision', d.v as any)}
                    className="w-4 h-4 accent-[#1e3a5f] flex-shrink-0"
                  />
                  <span>{d.icon}</span>
                  <div>
                    <div className={`font-bold ${d.color}`}>{d.label}</div>
                    <div className="text-sm font-medium text-[#6b7280]">{d.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ───── 6. KÝ XÁC NHẬN ───── */}
      <Section title="6. Ký Xác Nhận" icon="✍️">
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['hr', 'nv', 'mgr', 'ceo'] as ViewMode[]).map(role => {
            const sig = data.signatures[role];
            const isMyTurn = role === viewMode && mySignAllowed && !sig;
            return (
              <div key={role} className={`border-[1.5px] rounded-[8px] p-4 text-center ${isMyTurn ? 'border-[#3b82f6] bg-blue-50' : sig ? 'border-[#86efac] bg-green-50/50' : 'border-[#d1d5db] bg-[#f9fafb]'}`}>
                <div className="font-black uppercase tracking-[0.06em] text-[#1e3a5f] mb-2">{ROLE_LABEL[role]}</div>
                <div className="h-[60px] border-b-[1.5px] border-dashed border-[#d1d5db] mb-2 flex items-center justify-center">
                  {sig ? (
                    <div>
                      <div className="font-bold text-[#15803d] text-sm">✓ {sig.signed_by}</div>
                      <div className="text-xs text-[#6b7280]">{formatDateTime(sig.signed_at)}</div>
                    </div>
                  ) : isMyTurn ? (
                    <div className="text-sm text-blue-600 font-medium">Đến lượt bạn ký →</div>
                  ) : (
                    <div className="text-sm text-[#9ca3af] italic">Chờ ký</div>
                  )}
                </div>
                <div className="text-xs text-[#9ca3af] italic">
                  {sig ? 'Đã xác nhận' : isMyTurn ? `(Sẽ tự ghi: ${currentUserName || currentUserId})` : 'Chưa đến lượt'}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Bottom bar — bấm nút ký + gửi phiếu */}
      <div className="fixed bottom-0 left-0 md:left-[50px] right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] px-6 py-4 flex justify-between items-center z-50">
        <div className="hidden md:flex items-center gap-3 text-sm text-slate-500">
          <span>Trạng thái:</span>
          <strong className="text-[#1e3a5f] font-bold">{STATUS_LABEL[data.status]}</strong>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
          <span>Vai:</span>
          <strong className="text-[#1e3a5f] font-bold">{ROLE_LABEL[viewMode]}</strong>
        </div>
        <div className="flex w-full md:w-auto justify-end">
          <button
            type="submit"
            disabled={status === 'submitting' || !mySignAllowed}
            className="w-full md:w-auto px-8 py-2.5 bg-gradient-to-br from-[#3b82f6] to-[#1e3a5f] text-white rounded-[8px] font-bold text-[15px] shadow-[0_4px_14px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {status === 'submitting' ? (
              <><Loader2 size={18} className="animate-spin" /> Đang xử lý...</>
            ) : (
              <><Send size={18} /> {submitButtonLabel(viewMode)}</>
            )}
          </button>
        </div>
      </div>
    </form>
    <style>{`
      @keyframes bounce-in {
        0%   { transform: scale(0.8); opacity: 0; }
        60%  { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); }
      }
      .animate-bounce-in { animation: bounce-in 0.25s ease-out; }
    `}</style>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Sub-components & helpers
// ─────────────────────────────────────────────────────────

function Section({ title, icon, hint, children }: { title: string; icon: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#d1d5db] overflow-hidden">
      <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#d1d5db] flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="font-black text-[#1e3a5f] uppercase tracking-wide">{title}</span>
        {hint && <span className="font-medium text-[#6b7280] ml-2 text-sm">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="font-bold text-[#6b7280] uppercase tracking-[0.04em] text-xs">
      {children}{required && <span className="text-[#dc2626]"> *</span>}
    </label>
  );
}

function Th({ children, width, minWidth, align, muted }: { children: React.ReactNode; width?: string; minWidth?: string; align?: 'left' | 'center'; muted?: boolean }) {
  return (
    <th className={`border border-[#d1d5db] bg-[#1e3a5f] text-white font-bold p-[10px_12px] text-${align || 'left'} ${muted ? 'opacity-70' : ''}`}
      style={{ width, minWidth }}>{children}</th>
  );
}

function Td({ children, align, bold, muted }: { children: React.ReactNode; align?: 'left' | 'center'; bold?: boolean; muted?: boolean }) {
  return (
    <td className={`border border-[#d1d5db] p-[6px] ${align === 'center' ? 'text-center' : ''} ${bold ? 'font-bold text-[#6b7280]' : ''} ${muted ? 'bg-[#f9fafb]' : ''}`}>
      {children}
    </td>
  );
}

function FieldText({ label, value, onChange, disabled, placeholder, required, minHeight }: {
  label: string; value: string; onChange: (v: string) => void;
  disabled: boolean; placeholder?: string; required?: boolean; minHeight?: string;
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      <label className="text-base font-bold text-[#374151] uppercase tracking-[0.04em]">
        {label}{required && <span className="text-red-600"> *</span>}
      </label>
      <textarea
        disabled={disabled}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ minHeight }}
        className={`font-sans border-[1.5px] border-[#d1d5db] rounded-[6px] p-2 outline-none text-[#111] bg-white resize-y w-full placeholder:text-[#9ca3af] placeholder:italic placeholder:font-normal ${disabled ? 'opacity-70 cursor-not-allowed bg-[#f9fafb]' : 'focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15'}`}
      />
    </div>
  );
}

function ScoreSelect({ value, disabled, onChange }: { value: number; disabled: boolean; onChange: (v: number) => void }) {
  if (disabled) {
    return <div className={`font-bold text-base ${value > 0 ? 'text-[#1e3a5f]' : 'text-[#9ca3af]'}`}>{value > 0 ? value : '—'}</div>;
  }
  return (
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="border-[1.5px] border-[#d1d5db] rounded-[6px] px-2 py-1 text-[#111] font-bold bg-white focus:border-[#3b82f6] outline-none cursor-pointer w-full"
    >
      <option value={0}>—</option>
      {SCORE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v} · {o.label}</option>)}
    </select>
  );
}

const inputCls = (disabled: boolean) =>
  `font-sans border-[1.5px] border-[#d1d5db] rounded-[6px] px-[10px] py-[8px] outline-none text-[#111] font-medium bg-white w-full transition-all ${disabled ? 'opacity-70 cursor-not-allowed bg-[#f9fafb]' : 'focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15'}`;

const cellCls = (extra: string, disabled: boolean) =>
  `w-full font-sans rounded-[6px] p-[6px] outline-none text-[#111] resize-y min-h-[44px] transition-all border ${disabled ? 'border-transparent bg-transparent cursor-not-allowed text-[#6b7280]' : 'border-transparent hover:border-[#d1d5db] focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/15 bg-transparent focus:bg-white'} ${extra}`;

function formatDateVN(d: string): string {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const [y, m, day] = d.split('-');
  return `Ngày ${day} tháng ${m} năm ${y}`;
}

function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function submitButtonLabel(view: ViewMode): string {
  if (view === 'hr')  return 'XÁC NHẬN & GỬI TẠO PHIẾU';
  if (view === 'nv')  return 'XÁC NHẬN & NỘP PHIẾU';
  if (view === 'mgr') return 'XÁC NHẬN & GỬI CEO';
  if (view === 'ceo') return 'XÁC NHẬN & PHÊ DUYỆT';
  return 'GỬI PHIẾU';
}

function successMessage(view: ViewMode): string {
  if (view === 'hr')  return 'Đã tạo phiếu thành công! Bot Discord đã gửi link cho Quản lý điền công việc.';
  if (view === 'nv')  return 'Đã nộp phiếu tự đánh giá! Quản lý sẽ nhận thông báo và chấm điểm.';
  if (view === 'mgr') return 'Đã gửi phiếu lên CEO duyệt! Bạn sẽ nhận thông báo khi có kết quả.';
  if (view === 'ceo') return 'Đã phê duyệt phiếu! HR sẽ nhận thông báo để gửi kết quả cho nhân viên.';
  return 'Đã gửi thành công!';
}

/**
 * Build payload theo endpoint từng vai.
 * GIỮ NGUYÊN contract API cũ — chỉ thêm signatures + đổi tên vài field cho khớp GAS.
 */
function buildPayload(view: ViewMode, data: EvaluationData, token: string, currentUserId: string): Record<string, unknown> {
  const sig = data.signatures[view];

  if (view === 'hr') {
    // /api/evaluation/init expect: name, dept, manager_*, trial_*, hr_discord_id, criteria, work_items
    return {
      ...data.info,
      criteria: data.criteria.map(c => ({ name: c.name, expectation: c.expectation, group: c.group, source: c.source || 'hr_template' })),
      work_items: data.work_items.map(w => ({ task: w.task, details: w.details, result: w.result || '' })),
      signatures: data.signatures,
    };
  }

  if (view === 'nv') {
    // /api/evaluation expect: eval_id, discord_id, token, work_summary, criteria_scores, proposal
    return {
      eval_id: data.eval_id,
      discord_id: currentUserId,
      token,
      work_summary: data.work_items.map((w, i) => ({ stt: i + 1, area: w.task, detail: w.details, result: w.result || '' })),
      criteria_scores: data.criteria.map((c, i) => ({ stt: i + 1, name: c.name, expectation: c.expectation, group: c.group, source: c.source, self_score: c.self_score || 0 })),
      proposals: data.proposal,
      signatures: { ...data.signatures, nv: sig },
    };
  }

  if (view === 'mgr') {
    // QL có 2 lần submit khác nhau:
    if (data.status === 'MGR_PENDING') {
      // mgr-fill: gửi work_summary + criteria
      return {
        eval_id: data.eval_id,
        discord_id: currentUserId,
        token,
        work_summary: data.work_items.map((w, i) => ({ stt: i + 1, area: w.task, detail: w.details })),
        criteria: data.criteria.map(c => ({ name: c.name, expectation: c.expectation, group: c.group, source: c.source || 'mgr' })),
        signatures: { ...data.signatures, mgr: sig },
      };
    }
    // mgr-review: gửi mgr_scores + mgr_decision
    return {
      eval_id: data.eval_id,
      discord_id: currentUserId,
      token,
      mgr_scores: data.criteria.map((c, i) => ({ stt: i + 1, name: c.name, self_score: c.self_score || 0, mgr_score: c.mgr_score || 0, note: c.note || '' })),
      mgr_comment: data.conclusion.mgr_comment,
      mgr_expectation: data.conclusion.mgr_expectation,
      mgr_salary_proposal: data.conclusion.mgr_salary_proposal,
      mgr_decision: data.conclusion.mgr_decision,
      signatures: { ...data.signatures, mgr: sig },
    };
  }

  if (view === 'ceo') {
    // /api/evaluation/ceo-review expect: eval_id, discord_id, token, ceo_action, ceo_comment
    const action = data.conclusion.mgr_decision === 'fail' ? 'reject' : 'approve';
    // Safety net giống component: detect CEO-direct qua currentUserId === manager_discord_id
    const isCeoDirect = (data.is_ceo_direct ?? false) || (
      !!currentUserId &&
      !!data.info?.manager_discord_id &&
      data.info.manager_discord_id === currentUserId
    );
    const payload: Record<string, unknown> = {
      eval_id: data.eval_id,
      discord_id: currentUserId,
      token,
      ceo_action: action,
      ceo_comment: data.conclusion.ceo_comment || '',
      // Luồng rút gọn: CEO ký cả ô CEO và ô QL (vì kiêm 2 vai)
      signatures: isCeoDirect
        ? { ...data.signatures, ceo: sig, mgr: sig }
        : { ...data.signatures, ceo: sig },
    };
    if (isCeoDirect) {
      // CEO kiêm QL → gửi kèm dữ liệu QL chấm điểm + nhận xét
      payload.mgr_scores = data.criteria.map((c, i) => ({
        stt: i + 1,
        name: c.name,
        self_score: c.self_score || 0,
        mgr_score: c.mgr_score || 0,
        note: c.note || '',
      }));
      payload.mgr_comment         = data.conclusion.mgr_comment;
      payload.mgr_expectation     = data.conclusion.mgr_expectation;
      payload.mgr_salary_proposal = data.conclusion.mgr_salary_proposal;
      payload.mgr_decision        = data.conclusion.mgr_decision;
    }
    return payload;
  }

  return data as unknown as Record<string, unknown>;
}
