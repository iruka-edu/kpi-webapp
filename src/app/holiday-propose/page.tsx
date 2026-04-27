/**
 * holiday-propose/page.tsx — Form HR đề xuất ngày nghỉ
 *
 * URL: /holiday-propose?session=...&name=...&discord_id=...&role=HR
 * Pattern y hệt /weekly và /monthly: bot trả link → HR mở → điền → submit.
 *
 * Sprint 2 (current): UI đầy đủ + validation + mock API.
 * Sprint 3: API forward sang bot api-server thật.
 */

'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import HolidayDayPicker from '@/components/holiday/HolidayDayPicker';
import HolidayHalfDayList, { HalfDayType } from '@/components/holiday/HolidayHalfDayList';
import HolidayFileUpload from '@/components/holiday/HolidayFileUpload';

// ── Types ─────────────────────────────────────────────────────
type HolidayType = 'national' | 'company' | 'event' | 'emergency';

const TYPE_OPTIONS: { value: HolidayType; label: string }[] = [
  { value: 'national',  label: '🏛️ National — Lễ chính thức nhà nước' },
  { value: 'company',   label: '🏢 Company — Lễ riêng công ty (kỷ niệm thành lập, team building...)' },
  { value: 'event',     label: '🎉 Event — Sự kiện đặc biệt (off-site, hội nghị)' },
  { value: 'emergency', label: '⚠️ Emergency — Nghỉ đột xuất (thiên tai, dịch bệnh)' },
];

// ── Helpers ───────────────────────────────────────────────────
function expandRange(start: string, end: string): string[] {
  if (!start || !end) return [];
  const dates: string[] = [];
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);
  while (cur <= last) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ── Sub-components ────────────────────────────────────────────
function FullScreenCard({
  icon, title, desc,
}: { icon: string; title: string; desc: string }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 32, background: '#f0f4f8', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        padding: '48px 40px', maxWidth: 480, textAlign: 'center', width: '100%',
      }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#1e3a5f', marginBottom: 12 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Main Content ──────────────────────────────────────────────
function HolidayProposeContent() {
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get('session') || '';
  const nameParam = searchParams.get('name') || '';
  const discordIdParam = searchParams.get('discord_id') || '';
  const roleParam = searchParams.get('role') || '';
  const deptParam = searchParams.get('dept') || '';

  // Ưu tiên hiển thị dept (phòng ban) — chỉ fallback về role nếu không có dept
  const displayLabel = deptParam || roleParam;

  // ── Form state ──
  const [name, setName] = useState('');
  const [type, setType] = useState<HolidayType>('national');
  const [typeOpen, setTypeOpen] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [dayDetails, setDayDetails] = useState<Record<string, HalfDayType>>({});
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // ── UI state ──
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ pendingId: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  // ── Computed ──
  const dates = useMemo(
    () => (startDate && endDate ? expandRange(startDate, endDate) : []),
    [startDate, endDate]
  );

  const totalDays = useMemo(() => {
    return dates.reduce((acc, d) => {
      const t = dayDetails[d] || 'full';
      if (t === 'full') return acc + 1;
      if (t === 'morning' || t === 'afternoon') return acc + 0.5;
      return acc;
    }, 0);
  }, [dates, dayDetails]);

  // ── Handlers ──
  function handleDateRangeChange(start: string, end: string) {
    setStartDate(start || null);
    setEndDate(end || null);
    // Reset dayDetails khi đổi range
    if (start && end) {
      const newDates = expandRange(start, end);
      const newDetails: Record<string, HalfDayType> = {};
      newDates.forEach(d => { newDetails[d] = dayDetails[d] || 'full'; });
      setDayDetails(newDetails);
    } else {
      setDayDetails({});
    }
  }

  function handleDayTypeChange(date: string, type: HalfDayType) {
    setDayDetails(prev => ({ ...prev, [date]: type }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Vui lòng nhập tên ngày nghỉ';
    if (!startDate || !endDate) errs.range = 'Vui lòng chọn khoảng ngày nghỉ';
    if (totalDays === 0) errs.days = 'Cần ít nhất 1 ngày không "Bỏ"';
    if (!reason.trim()) errs.reason = 'Vui lòng nhập lý do';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    setSubmitError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const days_detail = dates.map(d => ({ date: d, type: dayDetails[d] || 'full' }));
      const payload = {
        name: name.trim(),
        type,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        days_detail,
        reason: reason.trim(),
        decision_file_name: file?.name || null,
        decision_file_size: file?.size || null,
        proposed_by: {
          discord_id: discordIdParam,
          name: nameParam,
          role: roleParam,
          dept: deptParam,
        },
      };

      const res = await fetch('/api/holiday', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionParam,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Không gửi được đề xuất');
      }
      setSuccessData({ pendingId: data.pending_id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi không rõ';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── UI: Token expired (chưa có session) ──
  if (!sessionParam && !nameParam) {
    return (
      <FullScreenCard
        icon="🔒"
        title="Cần link từ Discord"
        desc={'Vui lòng gõ /holiday-propose trên Discord để nhận link form mới.\nLink form có hiệu lực 30 phút.'}
      />
    );
  }

  // ── UI: Success ──
  if (successData) {
    return (
      <FullScreenCard
        icon="🎉"
        title="Đã gửi đề xuất tới CEO!"
        desc={`Đề xuất "${name}" đang chờ CEO duyệt.\nMã đề xuất: ${successData.pendingId}\n\nBạn sẽ nhận được DM thông báo khi CEO phản hồi.`}
      />
    );
  }

  const TYPE_LABEL = TYPE_OPTIONS.find(o => o.value === type)?.label || '';

  // ── UI: Form ──
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '24px 12px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f, #3b5a85)', color: '#fff',
          padding: '18px 22px', borderRadius: 12, marginBottom: 18,
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🏖️ Đề xuất ngày nghỉ mới</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            Chào <b>{nameParam || 'bạn'}</b>{displayLabel && ` (${displayLabel})`} — điền form rồi gửi để CEO duyệt
          </div>
        </div>

        {/* Section 1: Tên + Loại nghỉ */}
        <Section>
          <Row label="Tên ngày nghỉ" required error={errors.name}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Lễ Giải phóng Miền Nam & Quốc tế Lao động"
              style={inputStyle(!!errors.name)}
            />
          </Row>

          <Row label="Loại nghỉ" required>
            <div
              onClick={() => setTypeOpen(!typeOpen)}
              style={{
                ...inputStyle(false),
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', borderColor: typeOpen ? '#3b82f6' : '#d1d5db',
              }}
            >
              <span>{TYPE_LABEL}</span>
              <span style={{ color: '#3b82f6' }}>{typeOpen ? '▴' : '▾'}</span>
            </div>
            {typeOpen && (
              <div style={{
                background: '#fff', border: '1.5px solid #3b82f6', borderRadius: 8,
                marginTop: 4, padding: 4, boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
              }}>
                {TYPE_OPTIONS.map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => { setType(opt.value); setTypeOpen(false); }}
                    style={{
                      padding: '9px 11px', borderRadius: 6, cursor: 'pointer',
                      fontSize: 13,
                      background: opt.value === type ? '#dbeafe' : 'transparent',
                      color: opt.value === type ? '#1e40af' : '#374151',
                      fontWeight: opt.value === type ? 600 : 400,
                    }}
                  >{opt.label}</div>
                ))}
              </div>
            )}
          </Row>
        </Section>

        {/* Section 2: Date range */}
        <Section>
          <Row label="Chọn khoảng nghỉ" required error={errors.range}>
            <HolidayDayPicker
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateRangeChange}
            />
          </Row>
        </Section>

        {/* Section 3: Half-day per day */}
        {dates.length > 0 && (
          <Section>
            <Row label="⏰ Loại buổi cho từng ngày" required error={errors.days}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                Click chọn cho mỗi ngày: cả ngày / nửa sáng / nửa chiều / hoặc bỏ qua
              </div>
              <HolidayHalfDayList
                dates={dates}
                values={dayDetails}
                onChange={handleDayTypeChange}
              />
            </Row>
          </Section>
        )}

        {/* Section 4: Lý do + File */}
        <Section>
          <Row label="Lý do / Ghi chú thêm" required error={errors.reason}>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Theo công văn 123/UBND ngày 15/04/2026..."
              rows={3}
              style={{ ...inputStyle(!!errors.reason), minHeight: 80, resize: 'vertical' }}
            />
          </Row>

          <Row label="File quyết định (PDF/JPG/PNG)">
            <HolidayFileUpload file={file} onChange={setFile} />
          </Row>
        </Section>

        {/* Submit error */}
        {submitError && (
          <div style={{
            background: '#fee2e2', color: '#991b1b', padding: '10px 14px',
            borderRadius: 8, fontSize: 13, marginBottom: 14,
            border: '1.5px solid #ef4444',
          }}>
            ❌ {submitError}
          </div>
        )}

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14,
              cursor: submitting ? 'not-allowed' : 'pointer',
              border: 'none', fontFamily: 'inherit',
              background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #1e3a5f, #3b5a85)',
              color: '#fff',
              boxShadow: submitting ? 'none' : '0 2px 8px rgba(30,58,95,0.3)',
            }}
          >
            {submitting ? '⏳ Đang gửi...' : '📨 Gửi đề xuất tới CEO'}
          </button>
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: 24, padding: 14, background: '#eff6ff',
          border: '1px solid #93c5fd', borderRadius: 8,
          fontSize: 12, color: '#1e40af', lineHeight: 1.6,
        }}>
          📌 Sau khi gửi, CEO sẽ nhận DM kèm 2 button Duyệt/Từ chối.
          Khi CEO duyệt, bot tự động DM toàn công ty kèm thông báo nghỉ và file QĐ này.
        </div>
      </div>
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────────────
function inputStyle(error: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    border: `1.5px solid ${error ? '#ef4444' : '#d1d5db'}`,
    borderRadius: 8,
    fontSize: 14,
    color: '#111827',
    fontFamily: 'inherit',
    background: '#fff',
    outline: 'none',
  };
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '16px 18px',
      marginBottom: 14, border: '1px solid #e5e7eb',
    }}>{children}</div>
  );
}

function Row({
  label, required, error, children,
}: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 700, color: '#374151',
        textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
      }}>
        {label}
        {required && <span style={{ color: '#ef4444', fontWeight: 700, marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>⚠️ {error}</div>
      )}
    </div>
  );
}

// ── Page export with Suspense (Next.js 16 yêu cầu) ───────────
export default function Page() {
  return (
    <Suspense fallback={<FullScreenCard icon="⏳" title="Đang tải..." desc="" />}>
      <HolidayProposeContent />
    </Suspense>
  );
}
