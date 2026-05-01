/**
 * /leave-propose/page.tsx — NV xin nghỉ phép (web form)
 *
 * URL: /leave-propose?session=...&discord_id=...&token=...
 *
 * Pattern: clone /holiday-propose
 *  - Load NV info từ /api/leave/preview
 *  - Render LeaveCalendar (mode auto từ contractType)
 *  - Preview phép realtime
 *  - Submit → POST /api/leave
 *  - Hiển thị 5 phiếu gần nhất
 */

'use client';

import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { LeaveCalendar, type LeaveSelections, type WorkSchedule } from '@/components/leave/LeaveCalendar';

// ── Types ─────────────────────────────────────────────────────
type Member = {
  discordId: string;
  name: string;
  dept?: string;
  contractType?: 'fulltime' | 'parttime';
  contractSignDate?: string | null;
  probationStartDate?: string | null;
  joinedAt?: string | null;
  monthlyLeaveQuota?: number;
  workSchedule?: WorkSchedule | null;
  managerName?: string | null;
  managerDiscordId?: string | null;
};
type LeaveBalance = { monthlyQuota: number; totalAccrued?: number; totalUsed: number; balance: number };
type HistoryItem = {
  id: string;
  createdAt: number;
  totalDays: number | null;
  leaveDate: string;
  leaveType: string;
  status: 'pending' | 'approved' | 'rejected';
  approverName: string | null;
  approvedByRole: string | null;
};

// ── Helpers ───────────────────────────────────────────────────
function fmtVN(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
function fmtVNFromTimestamp(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function getDayName(dateISO: string): string | null {
  const m = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2]-1, +m[3]);
  return ['sun','mon','tue','wed','thu','fri','sat'][d.getDay()];
}
function monthsBetween(startISO: string, end: Date): number {
  const m = startISO.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return 0;
  const start = new Date(+m[1], +m[2]-1, +m[3]);
  if (end < start) return 0;
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

// ── Compute days_detail từ selections ─────────────────────────
type DayDetailItem = { date: string; type: 'full'|'morning'|'afternoon'; action: 'off'|'work_swap' };

function selectionsToDaysDetail(selections: LeaveSelections): DayDetailItem[] {
  // Group theo date
  const byDate: Record<string, { morning?: 'off'|'work_swap'; afternoon?: 'off'|'work_swap' }> = {};
  for (const [key, action] of Object.entries(selections)) {
    const [date, buoi] = key.split(':');
    if (!byDate[date]) byDate[date] = {};
    if (buoi === 'morning') byDate[date].morning = action;
    if (buoi === 'afternoon') byDate[date].afternoon = action;
  }
  const result: DayDetailItem[] = [];
  const sortedDates = Object.keys(byDate).sort();
  for (const date of sortedDates) {
    const v = byDate[date];
    // Cùng action ở cả 2 buổi → gộp 'full'
    if (v.morning === 'off' && v.afternoon === 'off') {
      result.push({ date, type: 'full', action: 'off' });
    } else if (v.morning === 'work_swap' && v.afternoon === 'work_swap') {
      result.push({ date, type: 'full', action: 'work_swap' });
    } else {
      if (v.morning) result.push({ date, type: 'morning', action: v.morning });
      if (v.afternoon) result.push({ date, type: 'afternoon', action: v.afternoon });
    }
  }
  return result;
}

// ── Compute net trừ phép cho parttime ─────────────────────────
function computeNetParttime(daysDetail: DayDetailItem[], workSchedule: WorkSchedule | null | undefined): {
  totalCredit: number; totalDeduct: number; net: number;
} {
  let totalCredit = 0, totalDeduct = 0;
  if (!workSchedule?.workDays) return { totalCredit: 0, totalDeduct: 0, net: 0 };

  for (const item of daysDetail) {
    const dayName = getDayName(item.date);
    if (!dayName) continue;
    const sched = (workSchedule.workDays as Record<string, string>)[dayName] || 'off';

    if (item.action === 'off') {
      if (sched === 'off') continue;
      if (item.type === 'full') {
        if (sched === 'fullday') totalDeduct += 1;
        else totalDeduct += 0.5;
      } else if (item.type === 'morning') {
        if (sched === 'fullday' || sched === 'morning') totalDeduct += 0.5;
      } else if (item.type === 'afternoon') {
        if (sched === 'fullday' || sched === 'afternoon') totalDeduct += 0.5;
      }
    } else if (item.action === 'work_swap') {
      if (item.type === 'full' && sched === 'off') totalCredit += 1;
      else if (item.type === 'morning' && (sched === 'off' || sched === 'afternoon')) totalCredit += 0.5;
      else if (item.type === 'afternoon' && (sched === 'off' || sched === 'morning')) totalCredit += 0.5;
    }
  }

  return { totalCredit, totalDeduct, net: Math.max(0, totalDeduct - totalCredit) };
}

// ── Compute net cho fulltime (đơn giản — total all 'off') ────
function computeTotalFulltime(daysDetail: DayDetailItem[]): number {
  let total = 0;
  for (const item of daysDetail) {
    if (item.action !== 'off') continue;
    total += item.type === 'full' ? 1 : 0.5;
  }
  return total;
}

// ── FullScreen card ──────────────────────────────────────────
function FullScreenCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 32, background: '#f0f4f8', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        padding: '48px 40px', maxWidth: 520, textAlign: 'center', width: '100%',
      }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#1e3a5f', marginBottom: 12 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────
function LeaveProposeContent() {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('session') || '';
  const discordId = searchParams.get('discord_id') || '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [selections, setSelections] = useState<LeaveSelections>({});
  const [backup, setBackup] = useState('');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ approverName: string } | null>(null);

  // ── Load member info + history ──
  useEffect(() => {
    if (!sessionToken || !discordId) { setLoading(false); return; }
    (async () => {
      try {
        const [previewRes, historyRes] = await Promise.all([
          fetch(`/api/leave/preview?discord_id=${encodeURIComponent(discordId)}`, {
            headers: { 'x-session-token': sessionToken },
          }),
          fetch(`/api/leave/history?user_id=${encodeURIComponent(discordId)}&limit=5`, {
            headers: { 'x-session-token': sessionToken },
          }),
        ]);

        const previewJson = await previewRes.json();
        if (!previewRes.ok || !previewJson.ok) {
          setLoadError(previewJson.error || 'Không tải được thông tin NV');
          setLoading(false); return;
        }
        setMember(previewJson.member);
        setLeaveBalance(previewJson.leaveBalance || null);

        const historyJson = await historyRes.json();
        if (historyJson.ok) setHistory(historyJson.history || []);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Lỗi mạng');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionToken, discordId]);

  // ── Compute days_detail + preview ──
  const daysDetail = useMemo(() => selectionsToDaysDetail(selections), [selections]);
  const isPartime = member?.contractType === 'parttime';
  const partimeNet = useMemo(
    () => isPartime ? computeNetParttime(daysDetail, member?.workSchedule) : null,
    [daysDetail, member, isPartime]
  );
  const fulltimeTotal = useMemo(
    () => !isPartime ? computeTotalFulltime(daysDetail) : 0,
    [daysDetail, isPartime]
  );

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    if (!member) return;
    setSubmitError('');
    if (daysDetail.length === 0) { setSubmitError('Vui lòng chọn ít nhất 1 ngày'); return; }
    if (reason.trim().length < 5) { setSubmitError('Lý do tối thiểu 5 ký tự'); return; }

    setSubmitting(true);
    try {
      const totalDays = isPartime ? (partimeNet?.net ?? 0) : fulltimeTotal;
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
        body: JSON.stringify({
          proposed_by: {
            discord_id: member.discordId,
            name: member.name,
            dept: member.dept,
            contractType: member.contractType,
          },
          days_detail: daysDetail,
          totalDays,
          backup: backup.trim() || null,
          reason: reason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Gửi thất bại');
      setSuccessInfo({ approverName: json.approverName || 'Quản lý trực tiếp' });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Lỗi không rõ');
    } finally {
      setSubmitting(false);
    }
  }, [member, daysDetail, reason, backup, isPartime, partimeNet, fulltimeTotal, sessionToken]);

  // ── Early returns ──
  if (!sessionToken || !discordId) {
    return <FullScreenCard icon="🔒" title="Cần link từ Discord" desc={'Vui lòng dùng link bot gửi qua DM (lệnh /leave).\nLink có hiệu lực 24h.'} />;
  }
  if (loading) return <FullScreenCard icon="⏳" title="Đang tải..." desc="" />;
  if (loadError) return <FullScreenCard icon="❌" title="Lỗi tải dữ liệu" desc={loadError} />;
  if (!member) return <FullScreenCard icon="❓" title="Không tìm thấy NV" desc="" />;
  if (successInfo) {
    return (
      <FullScreenCard
        icon="✅"
        title="Đã gửi đơn xin nghỉ"
        desc={`Đơn của bạn đã được gửi cho ${successInfo.approverName}.\nVui lòng đợi duyệt — bot sẽ DM kết quả vào Discord.\n\nBạn có thể đóng tab này.`}
      />
    );
  }

  // ── Tính "tích lũy" (chỉ hiện cho fulltime) — ưu tiên field từ bot, fallback compute ──
  const tichLuy = leaveBalance
    ? (leaveBalance.totalAccrued ?? leaveBalance.totalUsed + leaveBalance.balance)
    : 0;
  const balanceColor = leaveBalance
    ? (leaveBalance.balance > 0 ? '#16a34a' : leaveBalance.balance === 0 ? '#f59e0b' : '#dc2626')
    : '#6b7280';

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', padding: '16px 8px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{
          background: isPartime
            ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
            : 'linear-gradient(135deg, #1e3a5f, #3b5a85)',
          color: '#fff',
          padding: '22px 24px', borderRadius: 16, marginBottom: 14,
          boxShadow: isPartime ? '0 6px 20px rgba(139,92,246,0.25)' : '0 6px 20px rgba(30,58,95,0.18)',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
            🏖️ Xin nghỉ phép — IruKa
            {isPartime && <span style={{ display: 'inline-block', marginLeft: 8, padding: '3px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700 }}>PARTTIME</span>}
          </div>
          <div style={{ fontSize: 13, opacity: 0.95 }}>
            Chào <b>{member.name}</b> ({member.dept})
            {!isPartime && leaveBalance && (
              <> • Phép còn dư: <span style={{
                display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                background: 'rgba(255,255,255,0.2)', fontWeight: 700, marginLeft: 4,
              }}>
                {leaveBalance.balance > 0 ? `+${leaveBalance.balance}` : leaveBalance.balance} ngày
                {leaveBalance.balance > 0 ? ' 🟢' : leaveBalance.balance === 0 ? ' 🟠' : ' 🔴'}
              </span></>
            )}
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: 10, padding: '10px 14px', marginTop: 10, fontSize: 12, lineHeight: 1.6,
          }}>
            👨‍💼 Đơn này gửi cho: <b>{member.managerName || 'CEO (fallback)'}</b><br/>
            📋 Đồng thời CC: <b>CEO + HR</b> để theo dõi
          </div>
        </div>

        {/* ── Lịch hiện tại — chỉ parttime ── */}
        {isPartime && (
          <div style={section}>
            <div style={sectionTitle}>📅 Lịch làm việc hiện tại của bạn</div>
            <PartimeScheduleGrid workSchedule={member.workSchedule} />
            <div style={hint}>
              💡 Buổi <b>🟢 Làm</b>: click để xin nghỉ • Buổi <b>⬜ Off</b>: click để đăng ký làm bù
            </div>
          </div>
        )}

        {/* ── BƯỚC 1: Calendar ── */}
        <div style={section}>
          <div style={sectionTitle}>📅 Bước 1: Chọn ngày nghỉ</div>
          <LeaveCalendar
            mode={isPartime ? 'parttime' : 'fulltime'}
            workSchedule={member.workSchedule}
            selections={selections}
            onChange={setSelections}
          />
          {isPartime && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: '#6b7280', marginTop: 8 }}>
              <span>🔴 N: Xin nghỉ buổi (trừ phép)</span>
              <span>🟦 B: Đăng ký làm bù (cộng công bù)</span>
              <span>🟢 nền xanh: ngày bạn LÀM theo lịch</span>
              <span>⬜ nền xám viền đứt: ngày bạn NGHỈ theo lịch</span>
            </div>
          )}
        </div>

        {/* ── BƯỚC 2: Bàn giao ── */}
        <div style={section}>
          <div style={sectionTitle}>👥 Bước 2: Bàn giao việc <span style={{ fontWeight: 400, fontSize: 11, color: '#9ca3af' }}>(không bắt buộc)</span></div>
          <input
            type="text" value={backup} onChange={(e) => setBackup(e.target.value)}
            placeholder="VD: Anh Bình"
            style={inputStyle}
          />
        </div>

        {/* ── BƯỚC 3: Lý do ── */}
        <div style={section}>
          <div style={sectionTitle}>📝 Bước 3: Lý do<span style={{ color: '#dc2626', marginLeft: 3 }}>*</span></div>
          <textarea
            value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder={isPartime ? 'VD: Em xin đổi sáng thứ 5 sang chiều...' : 'VD: Em bị ốm cần nghỉ'}
            style={textareaStyle}
            rows={3}
          />
          <div style={{ ...hint, color: reason.length < 5 ? '#dc2626' : '#9ca3af' }}>
            {reason.length < 5 ? `Còn thiếu ${5 - reason.length} ký tự` : '✓ Đủ ký tự'}
          </div>
        </div>

        {/* ── PREVIEW ── */}
        {isPartime ? (
          <PartimePreview
            partimeNet={partimeNet}
            daysDetail={daysDetail}
            workSchedule={member.workSchedule}
          />
        ) : (
          <FulltimePreview
            leaveBalance={leaveBalance}
            tichLuy={tichLuy}
            requesting={fulltimeTotal}
            balanceColor={balanceColor}
          />
        )}

        {/* ── HISTORY ── */}
        <div style={section}>
          <div style={sectionTitle}>📜 Lịch sử xin nghỉ gần nhất của bạn</div>
          <HistoryTable history={history} />
        </div>

        {/* ── Submit ── */}
        {submitError && (
          <div style={{
            background: '#fee2e2', color: '#991b1b', padding: '10px 14px',
            borderRadius: 8, fontSize: 13, marginBottom: 12, border: '1.5px solid #ef4444',
          }}>
            ❌ {submitError}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginBottom: 24 }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '12px 28px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              cursor: submitting ? 'not-allowed' : 'pointer', border: 'none',
              background: submitting
                ? '#9ca3af'
                : (isPartime ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'linear-gradient(135deg, #1e3a5f, #3b5a85)'),
              color: '#fff', borderRadius: 8,
              boxShadow: submitting ? 'none' : '0 3px 10px rgba(30,58,95,0.3)',
            }}
          >
            {submitting ? '⏳ Đang gửi...' : '📨 Gửi xin nghỉ'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function PartimeScheduleGrid({ workSchedule }: { workSchedule: WorkSchedule | null | undefined }) {
  const days: { key: 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'; label: string }[] = [
    { key: 'mon', label: 'T2' }, { key: 'tue', label: 'T3' }, { key: 'wed', label: 'T4' },
    { key: 'thu', label: 'T5' }, { key: 'fri', label: 'T6' }, { key: 'sat', label: 'T7' },
    { key: 'sun', label: 'CN' },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '60px 1fr 1fr',
      border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', fontSize: 12,
    }}>
      <div style={schedHead}></div>
      <div style={schedHead}>Sáng</div>
      <div style={schedHead}>Chiều</div>
      {days.map(({ key, label }) => {
        const v = workSchedule?.workDays?.[key] || 'off';
        const morning = v === 'fullday' || v === 'morning';
        const afternoon = v === 'fullday' || v === 'afternoon';
        return (
          <React.Fragment key={key}>
            <div style={{ ...schedDay, ...(key === 'sun' ? { color: '#dc2626' } : {}) }}>{label}</div>
            <div style={morning ? schedWork : schedOff}>{morning ? '🟢 Làm' : '⬜ Off'}</div>
            <div style={afternoon ? schedWork : schedOff}>{afternoon ? '🟢 Làm' : '⬜ Off'}</div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function FulltimePreview({ leaveBalance, tichLuy, requesting, balanceColor }: {
  leaveBalance: LeaveBalance | null;
  tichLuy: number;
  requesting: number;
  balanceColor: string;
}) {
  const willRemain = (leaveBalance?.balance ?? 0) - requesting;
  const isNeg = willRemain < 0;
  return (
    <div style={section}>
      <div style={sectionTitle}>💡 Preview phép của bạn</div>
      <div style={{
        background: isNeg ? '#fee2e2' : (willRemain === 0 ? '#fef3c7' : '#dcfce7'),
        border: `1px solid ${isNeg ? '#fca5a5' : (willRemain === 0 ? '#fcd34d' : '#86efac')}`,
        borderRadius: 10, padding: '14px 16px',
      }}>
        <PreviewRow label="📊 Phép tích lũy:" value={`${tichLuy} ngày`} />
        <PreviewRow label="📈 Đã dùng:" value={`${leaveBalance?.totalUsed ?? 0} ngày`} />
        <PreviewRow label="➕ Đang xin:" value={`${requesting} ngày`} />
        <div style={{
          display: 'flex', alignItems: 'center', borderTop: '1px dashed rgba(0,0,0,0.1)',
          marginTop: 6, paddingTop: 8, fontSize: 14,
        }}>
          <span style={{ color: '#4b5563', flex: 1 }}>🎯 Sẽ còn lại:</span>
          <span style={{ fontWeight: 900, fontSize: 16, color: balanceColor }}>
            {willRemain > 0 ? `+${willRemain}` : willRemain} ngày
            {willRemain > 0 ? ' 🟢' : willRemain === 0 ? ' 🟠' : ' 🔴 NỢ'}
          </span>
        </div>
        {isNeg && (
          <div style={{
            marginTop: 10, padding: '8px 12px', background: 'rgba(220,38,38,0.1)',
            borderLeft: '3px solid #dc2626', fontSize: 12, color: '#dc2626', borderRadius: 4,
          }}>
            ⚠️ Bạn đang nợ phép — Quản lý có thể KHÔNG duyệt hoặc trừ vào lương.
          </div>
        )}
      </div>
    </div>
  );
}

function PartimePreview({ partimeNet, daysDetail, workSchedule }: {
  partimeNet: { totalCredit: number; totalDeduct: number; net: number } | null;
  daysDetail: DayDetailItem[];
  workSchedule: WorkSchedule | null | undefined;
}) {
  if (!partimeNet) return null;
  const { totalCredit, totalDeduct, net } = partimeNet;
  const empty = daysDetail.length === 0;
  const workItems = daysDetail.filter(d => d.action === 'work_swap');
  const offItems = daysDetail.filter(d => d.action === 'off');

  // Banner trạng thái
  let bannerColor: 'green'|'orange'|'red' = 'green';
  let bannerText = '';
  if (empty) bannerText = '';
  else if (net === 0 && totalCredit > 0) bannerText = `🟢 HOÁN ĐỔI THUẦN — Đơn này KHÔNG ảnh hưởng phép`;
  else if (net > 0 && totalCredit > 0) { bannerColor = 'orange'; bannerText = `🟠 BÙ 1 PHẦN — Hoán đổi không đủ, nghỉ thêm ${net} ngày → leaveBalance NỢ ${net}`; }
  else if (net > 0 && totalCredit === 0) { bannerColor = 'red'; bannerText = `🔴 KHÔNG BÙ — Trừ ${net} ngày phép, leaveBalance NỢ ${net}`; }
  else if (totalCredit > 0 && totalDeduct === 0) bannerText = `🟢 CHỈ ĐĂNG KÝ LÀM BÙ — Cộng ${totalCredit} ngày công bù, không xin nghỉ`;

  // Color cho card
  const cardBg = bannerColor === 'green' ? '#dcfce7' : bannerColor === 'orange' ? '#fef3c7' : '#fee2e2';
  const cardBorder = bannerColor === 'green' ? '#86efac' : bannerColor === 'orange' ? '#fcd34d' : '#fca5a5';

  return (
    <div style={section}>
      <div style={sectionTitle}>💡 Preview hoán đổi / nghỉ phép</div>
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: '14px 16px' }}>
        {empty ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontStyle: 'italic', padding: 8 }}>
            Chưa chọn ngày nào — click vào calendar để bắt đầu
          </div>
        ) : (
          <>
            {workItems.length > 0 && (
              <div style={{ fontSize: 12, lineHeight: 1.7, color: '#3b82f6', marginBottom: 6 }}>
                <b>🟦 Đăng ký LÀM BÙ:</b>
                <ul style={{ marginLeft: 16, color: '#4b5563', marginTop: 2 }}>
                  {workItems.map(w => (
                    <li key={`w_${w.date}_${w.type}`}>
                      {fmtVN(w.date)} {w.type === 'full' ? 'cả ngày' : w.type === 'morning' ? 'sáng' : 'chiều'}
                      <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 4 }}>(+{w.type === 'full' ? 1 : 0.5} công bù)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {offItems.length > 0 && (
              <div style={{ fontSize: 12, lineHeight: 1.7, color: '#dc2626', marginBottom: 6 }}>
                <b>🔴 Xin NGHỈ:</b>
                <ul style={{ marginLeft: 16, color: '#4b5563', marginTop: 2 }}>
                  {offItems.map(o => (
                    <li key={`o_${o.date}_${o.type}`}>
                      {fmtVN(o.date)} {o.type === 'full' ? 'cả ngày' : o.type === 'morning' ? 'sáng' : 'chiều'}
                      <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 4 }}>(−{o.type === 'full' ? 1 : 0.5} trừ phép)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ borderTop: '1px dashed rgba(0,0,0,0.15)', marginTop: 8, paddingTop: 8, fontSize: 13 }}>
              <PreviewRow label="Tổng công bù (làm thêm):" value={`+${totalCredit}`} valueColor="#3b82f6" />
              <PreviewRow label="Tổng trừ phép (xin nghỉ):" value={`−${totalDeduct}`} valueColor="#dc2626" />
              <div style={{
                display: 'flex', alignItems: 'center', borderTop: '2px solid rgba(0,0,0,0.1)',
                marginTop: 6, paddingTop: 8, fontSize: 15,
              }}>
                <span style={{ color: '#4b5563', flex: 1 }}>🎯 Số ngày phép thực trừ:</span>
                <span style={{
                  fontWeight: 900, fontSize: 16,
                  color: net === 0 ? '#16a34a' : bannerColor === 'orange' ? '#d97706' : '#dc2626',
                }}>{net} ngày</span>
              </div>
            </div>
            {bannerText && (
              <div style={{
                marginTop: 10, padding: '10px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: bannerColor === 'green' ? 'rgba(22,163,74,0.15)' : bannerColor === 'orange' ? 'rgba(245,158,11,0.15)' : 'rgba(220,38,38,0.15)',
                color: bannerColor === 'green' ? '#16a34a' : bannerColor === 'orange' ? '#92400e' : '#dc2626',
              }}>{bannerText}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PreviewRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: '#4b5563', flex: 1 }}>{label}</span>
      <span style={{ fontWeight: 700, color: valueColor || '#1e3a5f' }}>{value}</span>
    </div>
  );
}

function HistoryTable({ history }: { history: HistoryItem[] }) {
  if (history.length === 0) {
    return <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontStyle: 'italic', fontSize: 12 }}>_Chưa có phiếu nào_</div>;
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ background: '#f9fafb' }}>
          <th style={historyTh}>Ngày xin</th>
          <th style={historyTh}>Khoảng nghỉ</th>
          <th style={{ ...historyTh, textAlign: 'center' }}>Tổng</th>
          <th style={historyTh}>Trạng thái</th>
          <th style={historyTh}>Người duyệt</th>
        </tr>
      </thead>
      <tbody>
        {history.map(h => (
          <tr key={h.id}>
            <td style={historyTd}>{fmtVNFromTimestamp(h.createdAt)}</td>
            <td style={historyTd}>{h.leaveDate || '—'}</td>
            <td style={{ ...historyTd, textAlign: 'center', fontWeight: 700 }}>
              {h.totalDays != null ? h.totalDays : '—'}
            </td>
            <td style={historyTd}>
              <span style={{
                display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                background: h.status === 'approved' ? '#dcfce7' : h.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                color: h.status === 'approved' ? '#16a34a' : h.status === 'rejected' ? '#dc2626' : '#d97706',
              }}>{h.status === 'approved' ? 'DUYỆT' : h.status === 'rejected' ? 'TỪ CHỐI' : 'CHỜ DUYỆT'}</span>
            </td>
            <td style={historyTd}>{h.approverName || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Styles ────────────────────────────────────────────────────
const section: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: '18px 20px',
  marginBottom: 12, border: '1px solid #e5e7eb',
};
const sectionTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 800, color: '#1e3a5f',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f3f4f6',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb',
  borderRadius: 8, fontSize: 14, color: '#1e3a5f', fontFamily: 'inherit',
  outline: 'none', background: '#fff',
};
const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: 'vertical', minHeight: 80,
};
const hint: React.CSSProperties = {
  fontSize: 11, color: '#9ca3af', marginTop: 6, lineHeight: 1.5,
};
const schedHead: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #f3f4f6',
  borderRight: '1px solid #f3f4f6', background: '#f9fafb',
  fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', fontSize: 11,
};
const schedDay: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'center',
  borderBottom: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6',
  background: '#fafbfc', fontWeight: 600, color: '#1e3a5f',
};
const schedWork: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #f3f4f6',
  borderRight: '1px solid #f3f4f6', background: '#dcfce7', color: '#16a34a', fontWeight: 700,
};
const schedOff: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #f3f4f6',
  borderRight: '1px solid #f3f4f6', background: '#f3f4f6', color: '#9ca3af',
};
const historyTh: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'left',
  fontSize: 10, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em',
};
const historyTd: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#1e3a5f',
};

export default function Page() {
  return (
    <Suspense fallback={<FullScreenCard icon="⏳" title="Đang tải..." desc="" />}>
      <LeaveProposeContent />
    </Suspense>
  );
}
