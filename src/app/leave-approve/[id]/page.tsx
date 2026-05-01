/**
 * /leave-approve/[id]/page.tsx — QL/CEO duyệt phiếu xin nghỉ + HR readonly
 *
 * URL:
 *  - /leave-approve/<id>?token=<hmac>           → page duyệt (QL/CEO)
 *  - /leave-approve/<id>?token=<hmac>&readonly=1 → page xem CC (HR/CEO)
 *
 * Flow:
 *  1. Load /api/leave/pending/<id>
 *  2. Render thông tin NV + chi tiết ngày nghỉ + tình trạng phép
 *  3. Nếu pending + token verify đúng → 2 button Duyệt/Từ chối
 *  4. Nếu archived hoặc readonly → chỉ hiện trạng thái
 *  5. POST /api/leave/decision khi user bấm
 */

'use client';

import React, { useState, useEffect, Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────
type DayDetail = { date: string; type: 'full'|'morning'|'afternoon'; action: 'off'|'work_swap' };
type Request = {
  id: string;
  source: 'pending' | 'archived';
  userId: string;
  username?: string;
  name: string;
  dept?: string;
  contractType?: 'fulltime' | 'parttime';
  approverId?: string;
  approverName?: string;
  approverRole?: string;
  approvedBy?: string;
  approvedByRole?: string;
  rejectedBy?: string;
  approvedAt?: number;
  rejectedAt?: number;
  rejectedReason?: string;
  days_detail: DayDetail[];
  totalDays: number;
  backup?: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  expiresAt?: number;
};
type MemberInfo = {
  joinedAt: string | null;
  workingDuration: string;
  contractType: 'fulltime' | 'parttime' | null;
};
type LeaveBalance = {
  monthlyQuota: number;
  totalAccrued?: number;
  totalUsed: number;
  balance: number;
};
type HistoryItem = {
  id: string;
  createdAt: number;
  totalDays: number | null;
  leaveType: string;
  leaveDate: string;
  status: 'pending' | 'approved' | 'rejected';
  approverName: string | null;
  approvedByRole?: string | null;
  rejectedReason?: string | null;
  days_detail?: DayDetail[] | null;
};
type ApprovalResponse = {
  ok: boolean;
  request: Request;
  member: MemberInfo | null;
  leaveBalance: LeaveBalance | null;
  history: HistoryItem[];
};

// ── Helpers ───────────────────────────────────────────────────
function fmtVN(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
function fmtVNTimestamp(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function buoiLabel(type: string, action?: string): { text: string; deduct: number; isWork: boolean } {
  const isWork = action === 'work_swap';
  if (type === 'full') return { text: isWork ? '🟦 Cả ngày làm bù' : '☀️ Cả ngày', deduct: 1, isWork };
  if (type === 'morning') return { text: isWork ? '🟦 Sáng làm bù' : '🌅 Nửa ngày sáng', deduct: 0.5, isWork };
  if (type === 'afternoon') return { text: isWork ? '🟦 Chiều làm bù' : '🌇 Nửa ngày chiều', deduct: 0.5, isWork };
  return { text: type, deduct: 0, isWork };
}
function dayShort(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(+m[1], +m[2]-1, +m[3]);
  const dows = ['CN','T2','T3','T4','T5','T6','T7'];
  return `${dows[d.getDay()]} ${m[3]}/${m[2]}/${m[1]}`;
}

// ── FullScreenCard ────────────────────────────────────────────
function FullScreenCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: '#f0f4f8', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', padding: '48px 40px', maxWidth: 520, textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#1e3a5f', marginBottom: 12 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────
function LeaveApproveContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const isReadonly = searchParams.get('readonly') === '1';
  const sessionToken = searchParams.get('session') || ''; // optional
  const deciderIdParam = searchParams.get('decider_id') || '';
  const deciderNameParam = searchParams.get('decider_name') || '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [request, setRequest] = useState<Request | null>(null);
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [resultMsg, setResultMsg] = useState<{ verb: string; iconText: string } | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (sessionToken) headers['x-session-token'] = sessionToken;
        const res = await fetch(`/api/leave/pending/${encodeURIComponent(id)}`, { headers });
        const json: ApprovalResponse & { error?: string } = await res.json();
        if (!res.ok || !json.ok) {
          setLoadError(json.error || 'Không tải được phiếu');
        } else {
          setRequest(json.request);
          setMember(json.member ?? null);
          setLeaveBalance(json.leaveBalance ?? null);
          setHistory(Array.isArray(json.history) ? json.history : []);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Lỗi mạng');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, sessionToken]);

  async function handleDecision(decision: 'approved' | 'rejected') {
    if (!request) return;
    if (decision === 'rejected' && rejectReason.trim().length < 5) {
      setSubmitError('Lý do từ chối tối thiểu 5 ký tự');
      return;
    }
    setSubmitting(true); setSubmitError('');
    try {
      const res = await fetch('/api/leave/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          token,
          decision,
          decider: {
            discord_id: deciderIdParam || request.approverId || '',
            name: deciderNameParam || request.approverName || '',
          },
          rejectedReason: decision === 'rejected' ? rejectReason : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Server từ chối');
      setResultMsg({
        verb: decision === 'approved' ? 'duyệt' : 'từ chối',
        iconText: decision === 'approved' ? '✅' : '❌',
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Lỗi không rõ');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <FullScreenCard icon="⏳" title="Đang tải phiếu..." desc="" />;
  if (loadError) return <FullScreenCard icon="❌" title="Lỗi tải dữ liệu" desc={loadError} />;
  if (!request) return <FullScreenCard icon="❓" title="Không tìm thấy phiếu" desc="ID không hợp lệ" />;

  // Status logic
  const isArchived = request.source === 'archived' || request.status !== 'pending';
  const isExpired = !isArchived && request.expiresAt && Date.now() > request.expiresAt;

  if (resultMsg) {
    return <FullScreenCard
      icon={resultMsg.iconText}
      title={`Đã ${resultMsg.verb} phiếu`}
      desc={`Bot đang gửi DM thông báo cho NV và CC CEO + HR.\nBạn có thể đóng tab này.`}
    />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', padding: '16px 8px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Read-only banner */}
        {isReadonly && (
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff',
            padding: '12px 18px', borderRadius: 10, marginBottom: 14, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>👁️</span>
            <div>
              <b style={{ fontWeight: 800 }}>Bạn đang xem chế độ CC (theo dõi)</b><br/>
              <span style={{ opacity: 0.92, fontSize: 12 }}>
                Bạn KHÔNG có quyền duyệt phiếu này. Người duyệt: <b>{request.approverName || 'Quản lý'}</b>
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f, #3b5a85)', color: '#fff',
          padding: '22px 24px', borderRadius: 16, marginBottom: 14,
          boxShadow: '0 6px 20px rgba(30,58,95,0.18)',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
            {isReadonly ? '📋 Đơn xin nghỉ phép' : '🔍 Duyệt đơn xin nghỉ phép'}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6 }}>
            Người duyệt: <b>{request.approverName || '—'}</b>
            <i style={{ opacity: 0.85, marginLeft: 4, fontSize: 12 }}>
              ({request.approverRole === 'manager'
                ? `Quản lý trực tiếp của ${request.name}`
                : request.approverRole === 'ceo'
                ? `CEO duyệt cho ${request.name}`
                : `CEO duyệt thay (fallback) cho ${request.name}`})
            </i>
          </div>
          <div style={{ marginTop: 8 }}>
            <StatusPill status={request.status} expiresAt={request.expiresAt} approvedAt={request.approvedAt} rejectedAt={request.rejectedAt} />
          </div>
        </div>

        {/* NV info */}
        <Section title="👤 Nhân viên xin nghỉ">
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f', marginBottom: 4 }}>{request.name}</div>
          <div style={{ fontSize: 13, color: '#4b5563' }}>
            <span style={{ display: 'inline-block', padding: '2px 8px', background: '#eff6ff', color: '#3b82f6', borderRadius: 4, fontWeight: 600, fontSize: 11, marginRight: 6 }}>
              {request.dept || '—'}
            </span>
            · {request.contractType === 'parttime' ? 'Parttime' : 'Fulltime'}
            · 👨‍💼 Quản lý: <b>{request.approverName || '—'}</b>
          </div>
        </Section>

        {/* Days detail */}
        <Section title="📅 Chi tiết ngày nghỉ">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={daysTh}>Ngày</th>
                <th style={daysTh}>Buổi</th>
                <th style={{ ...daysTh, textAlign: 'right' }}>Ảnh hưởng</th>
              </tr>
            </thead>
            <tbody>
              {request.days_detail.map((d, i) => {
                const b = buoiLabel(d.type, d.action);
                return (
                  <tr key={i}>
                    <td style={daysTd}><b>{dayShort(d.date)}</b></td>
                    <td style={{ ...daysTd, color: b.isWork ? '#3b82f6' : (d.type === 'full' ? '#16a34a' : '#f59e0b'), fontWeight: 700 }}>{b.text}</td>
                    <td style={{ ...daysTd, textAlign: 'right', color: b.isWork ? '#3b82f6' : '#dc2626', fontWeight: 700 }}>
                      {b.isWork ? `+${b.deduct}` : `−${b.deduct}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{
            marginTop: 10, padding: '10px 14px', background: '#f9fafb',
            borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#1e3a5f',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>Số ngày phép thực trừ:</span>
            <span style={{ color: request.totalDays === 0 ? '#16a34a' : '#3b82f6', fontSize: 16, fontWeight: 900 }}>
              {request.totalDays} ngày
              {request.totalDays === 0 && request.contractType === 'parttime' && ' 🟢 (Hoán đổi thuần)'}
            </span>
          </div>
        </Section>

        {/* Backup */}
        <Section title="👥 Bàn giao việc">
          <InfoBox text={request.backup || '_(không có)_'} empty={!request.backup} />
        </Section>

        {/* Reason */}
        <Section title="📝 Lý do">
          <InfoBox text={request.reason || '—'} empty={!request.reason} />
        </Section>

        {/* Tình trạng phép — auto-compute từ bot (chỉ hiện cho fulltime) */}
        {request.contractType !== 'parttime' && leaveBalance && (
          <Section title="📊 Tình trạng phép của nhân viên (auto-compute)">
            <LeaveStatusCard
              joinedAt={member?.joinedAt || null}
              workingDuration={member?.workingDuration || ''}
              leaveBalance={leaveBalance}
              requestingDays={request.totalDays}
            />
          </Section>
        )}

        {/* History — 5 phiếu xin nghỉ gần nhất */}
        <Section title="📜 5 phiếu xin nghỉ gần nhất của NV">
          <HistoryTable history={history} />
        </Section>

        {/* Reject reason (nếu archived rejected) */}
        {request.status === 'rejected' && request.rejectedReason && (
          <Section title="💬 Lý do từ chối">
            <InfoBox text={request.rejectedReason} />
          </Section>
        )}

        {/* Reject mode textarea (chỉ hiện khi click Từ chối) */}
        {!isReadonly && !isArchived && rejectMode && (
          <Section title="💬 Lý do từ chối *">
            <textarea
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="VD: Em đang nợ phép — anh ko duyệt, em xin sắp xếp ngày khác."
              style={{
                width: '100%', padding: '10px 12px', border: '1.5px solid #f59e0b',
                borderRadius: 8, fontSize: 13, color: '#1e3a5f', fontFamily: 'inherit',
                outline: 'none', resize: 'vertical', minHeight: 70, background: '#fefce8',
              }}
            />
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
              {rejectReason.length < 5 ? `Còn thiếu ${5 - rejectReason.length} ký tự` : '✓ Đủ ký tự'}
            </div>
          </Section>
        )}

        {/* Submit error */}
        {submitError && (
          <div style={{
            background: '#fee2e2', color: '#991b1b', padding: '10px 14px',
            borderRadius: 8, fontSize: 13, marginBottom: 12, border: '1.5px solid #ef4444',
          }}>❌ {submitError}</div>
        )}

        {/* Action buttons */}
        {!isReadonly && !isArchived && !isExpired && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginBottom: 24 }}>
            <button
              onClick={() => {
                if (!rejectMode) { setRejectMode(true); return; }
                handleDecision('rejected');
              }}
              disabled={submitting}
              style={{
                padding: '12px 28px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                cursor: submitting ? 'not-allowed' : 'pointer',
                background: '#fff', color: '#dc2626', border: '1.5px solid #dc2626', borderRadius: 8,
              }}
            >
              {rejectMode ? '❌ Xác nhận từ chối' : '❌ Từ chối'}
            </button>
            <button
              onClick={() => handleDecision('approved')}
              disabled={submitting || rejectMode}
              style={{
                padding: '12px 28px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                cursor: (submitting || rejectMode) ? 'not-allowed' : 'pointer',
                background: rejectMode ? '#e5e7eb' : 'linear-gradient(135deg, #16a34a, #15803d)',
                color: rejectMode ? '#9ca3af' : '#fff', border: 'none', borderRadius: 8,
                boxShadow: (submitting || rejectMode) ? 'none' : '0 3px 10px rgba(22,163,74,0.3)',
              }}
            >
              {submitting ? '⏳ Đang xử lý...' : '✅ Duyệt'}
            </button>
          </div>
        )}

        {/* Info note */}
        {!isReadonly && !isArchived && !isExpired && (
          <div style={{
            padding: 12, background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8,
            fontSize: 12, color: '#3b82f6', marginBottom: 24,
          }}>
            💡 Sau khi anh duyệt: Bot sẽ tự DM kết quả cho <b>NV</b>, đồng thời <b>CC: CEO + HR</b> để cùng nắm.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', marginBottom: 12, border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f3f4f6' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoBox({ text, empty }: { text: string; empty?: boolean }) {
  return (
    <div style={{
      background: '#fafbfc', border: '1px solid #e5e7eb', borderRadius: 8,
      padding: '12px 14px', fontSize: 13, lineHeight: 1.6,
      color: empty ? '#9ca3af' : '#1e3a5f',
      fontStyle: empty ? 'normal' : 'italic',
    }}>{empty ? text : `"${text}"`}</div>
  );
}

function StatusPill({ status, expiresAt, approvedAt, rejectedAt }: { status: string; expiresAt?: number; approvedAt?: number; rejectedAt?: number }) {
  if (status === 'approved') {
    return (
      <span style={{ ...pillBase, background: 'rgba(22,163,74,0.85)' }}>
        ✅ Đã DUYỆT lúc {fmtVNTimestamp(approvedAt || 0)}
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span style={{ ...pillBase, background: 'rgba(220,38,38,0.85)' }}>
        ❌ Đã TỪ CHỐI lúc {fmtVNTimestamp(rejectedAt || 0)}
      </span>
    );
  }
  // Pending
  if (expiresAt) {
    const diff = expiresAt - Date.now();
    if (diff <= 0) {
      return <span style={{ ...pillBase, background: 'rgba(220,38,38,0.85)' }}>⏰ Hết hạn duyệt</span>;
    }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return <span style={{ ...pillBase, background: 'rgba(245,158,11,0.85)' }}>⏳ Chờ duyệt — còn {h}h {m}p</span>;
  }
  return <span style={{ ...pillBase, background: 'rgba(245,158,11,0.85)' }}>⏳ Chờ duyệt</span>;
}

const pillBase: React.CSSProperties = {
  display: 'inline-block', padding: '4px 12px', borderRadius: 20,
  fontWeight: 700, fontSize: 12, color: '#fff',
};
const daysTh: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'left',
  fontSize: 11, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em',
};
const daysTd: React.CSSProperties = {
  padding: '10px 10px', borderBottom: '1px solid #f3f4f6', color: '#1e3a5f',
};

// ── LeaveStatusCard: 6 dòng tình trạng phép + warning nếu NỢ ──
function LeaveStatusCard({ joinedAt, workingDuration, leaveBalance, requestingDays }: {
  joinedAt: string | null;
  workingDuration: string;
  leaveBalance: LeaveBalance;
  requestingDays: number;
}) {
  const accrued = leaveBalance.totalAccrued ?? (leaveBalance.totalUsed + leaveBalance.balance);
  const willRemain = +(accrued - leaveBalance.totalUsed - requestingDays).toFixed(2);
  // Cảnh báo phép NỢ — hiển thị card đỏ, NỢ box
  const isOwed = willRemain < 0;
  const isExact = willRemain === 0;
  const cardBg = isOwed ? '#fee2e2' : isExact ? '#fef3c7' : '#dcfce7';
  const cardBorder = isOwed ? '#fca5a5' : isExact ? '#fcd34d' : '#86efac';
  const highlightVal = isOwed ? '#dc2626' : isExact ? '#d97706' : '#16a34a';
  const willRemainText = isOwed
    ? `${willRemain} ngày 🟠 NỢ ${Math.abs(willRemain)}`
    : isExact
    ? `${willRemain} ngày 🟠 vừa đủ`
    : `+${willRemain} ngày 🟢`;

  return (
    <div style={{
      background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10,
      padding: '14px 16px',
    }}>
      <PhepRow label="📅 Bắt đầu làm:" value={joinedAt ? fmtVN(joinedAt) : '—'} />
      <PhepRow label="⏱️ Đã làm:" value={workingDuration || '—'} />
      <PhepRow label="📊 Tích lũy:" value={`${accrued} ngày`} />
      <PhepRow label="📈 Đã dùng:" value={`${leaveBalance.totalUsed} ngày`} />
      <PhepRow label="➕ Đang xin:" value={`${requestingDays} ngày`} />
      <PhepRow label="🎯 Sẽ còn:" value={willRemainText} highlight valColor={highlightVal} />
      {isOwed && (
        <div style={{
          marginTop: 10, padding: '8px 12px', background: 'rgba(220,38,38,0.1)',
          borderLeft: '3px solid #dc2626', fontSize: 12, color: '#dc2626',
          borderRadius: 4, fontWeight: 600,
        }}>
          ⚠️ <b>Cảnh báo</b>: Nếu duyệt, NV sẽ NỢ {Math.abs(willRemain)} ngày phép — có thể trừ vào lương hoặc cảnh cáo nội bộ.
        </div>
      )}
    </div>
  );
}

function PhepRow({ label, value, highlight, valColor }: {
  label: string;
  value: string;
  highlight?: boolean;
  valColor?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', fontSize: 13, padding: '4px 0',
      ...(highlight ? {
        borderTop: '1px dashed rgba(0,0,0,0.1)',
        marginTop: 6, paddingTop: 8,
      } : {}),
    }}>
      <span style={{ color: '#4b5563', flex: 1 }}>{label}</span>
      <span style={{
        fontWeight: highlight ? 900 : 700,
        color: valColor || '#1e3a5f',
        fontSize: highlight ? 16 : 13,
      }}>{value}</span>
    </div>
  );
}

// ── HistoryTable: 5 phiếu xin nghỉ gần nhất ──
function HistoryTable({ history }: { history: HistoryItem[] }) {
  if (!history || history.length === 0) {
    return (
      <div style={{
        padding: '14px 12px', textAlign: 'center', color: '#9ca3af',
        fontSize: 12, fontStyle: 'italic',
      }}>
        _Chưa có phiếu xin nghỉ nào trước đó_
      </div>
    );
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr>
          <th style={historyTh}>Ngày xin</th>
          <th style={historyTh}>Khoảng nghỉ</th>
          <th style={{ ...historyTh, textAlign: 'right' }}>Tổng</th>
          <th style={historyTh}>Trạng thái</th>
          <th style={historyTh}>Người duyệt</th>
        </tr>
      </thead>
      <tbody>
        {history.map((h, i) => (
          <tr key={h.id || i} style={{ borderBottom: i === history.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
            <td style={historyTd}>{fmtVNTimestamp(h.createdAt).split(' ')[1] || fmtVNTimestamp(h.createdAt)}</td>
            <td style={historyTd}>{h.leaveDate || '—'}</td>
            <td style={{ ...historyTd, textAlign: 'right', fontWeight: 700 }}>{h.totalDays != null ? h.totalDays : '—'}</td>
            <td style={historyTd}><HistoryStatusTag status={h.status} /></td>
            <td style={historyTd}>{h.approverName || '—'}</td>
          </tr>
        ))}
        {history.length < 5 && (
          <tr>
            <td colSpan={5} style={{ textAlign: 'center', padding: '8px 10px', color: '#9ca3af', fontSize: 11 }}>
              _không có phiếu cũ hơn_
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function HistoryStatusTag({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; text: string }> = {
    approved: { bg: '#dcfce7', color: '#16a34a', text: 'Duyệt' },
    rejected: { bg: '#fee2e2', color: '#dc2626', text: 'Từ chối' },
    pending:  { bg: '#fef3c7', color: '#f59e0b', text: 'Chờ' },
  };
  const cfg = map[status] || { bg: '#f3f4f6', color: '#6b7280', text: status };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
      fontWeight: 700, fontSize: 10, textTransform: 'uppercase',
      background: cfg.bg, color: cfg.color,
    }}>{cfg.text}</span>
  );
}

const historyTh: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'left',
  fontSize: 10, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em',
  background: '#f9fafb', fontWeight: 700,
};
const historyTd: React.CSSProperties = {
  padding: '8px 10px', color: '#1e3a5f',
};

// ── Page export ───────────────────────────────────────────────
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<FullScreenCard icon="⏳" title="Đang tải..." desc="" />}>
      <LeaveApproveContent id={id} />
    </Suspense>
  );
}
