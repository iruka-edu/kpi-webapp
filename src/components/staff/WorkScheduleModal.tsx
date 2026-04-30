/**
 * WorkScheduleModal.tsx — Popup grid 7×2 cho parttime
 *
 * Vai trò:
 *   - Hiển thị 7 ngày × 2 buổi (Sáng/Chiều)
 *   - HR tick các BUỔI nhân viên LÀM VIỆC (chứ không phải nghỉ)
 *   - Save → tự suy ra: cả 2 tick='fullday', chỉ Sáng='morning', chỉ Chiều='afternoon', không tick='off'
 *
 * Schema workSchedule trong members.json:
 *   {
 *     type: 'parttime',
 *     workDays: { mon: 'fullday'|'morning'|'afternoon'|'off', ... }
 *   }
 *
 * Props:
 *   open      — bật/tắt modal
 *   onClose   — đóng modal
 *   onSave    — POST /api/staff với workSchedule mới
 *   staffName — hiển thị header
 *   initial   — lịch hiện tại
 */

'use client';

import React, { useState } from 'react';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type DayValue = 'fullday' | 'morning' | 'afternoon' | 'off';

export type WorkSchedule = {
  type: 'fulltime' | 'parttime';
  workDays: Record<DayKey, DayValue>;
};

const DAY_LABELS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'T2 (Mon)' },
  { key: 'tue', label: 'T3 (Tue)' },
  { key: 'wed', label: 'T4 (Wed)' },
  { key: 'thu', label: 'T5 (Thu)' },
  { key: 'fri', label: 'T6 (Fri)' },
  { key: 'sat', label: 'T7 (Sat)' },
  { key: 'sun', label: 'CN (Sun)' },
];

// ── Helpers ──────────────────────────────────────────────────
function ticksToDayValue(morning: boolean, afternoon: boolean): DayValue {
  if (morning && afternoon) return 'fullday';
  if (morning) return 'morning';
  if (afternoon) return 'afternoon';
  return 'off';
}

function dayValueToTicks(v: DayValue): { morning: boolean; afternoon: boolean } {
  if (v === 'fullday') return { morning: true, afternoon: true };
  if (v === 'morning') return { morning: true, afternoon: false };
  if (v === 'afternoon') return { morning: false, afternoon: true };
  return { morning: false, afternoon: false };
}

/** Format thành chuỗi ngắn vd "T2-T5 fullday, T6 sáng" */
export function summarizeWorkSchedule(ws?: WorkSchedule | null): string {
  if (!ws || !ws.workDays) return 'Chưa có lịch';
  const parts: string[] = [];
  for (const { key, label } of DAY_LABELS) {
    const v = ws.workDays[key];
    if (v === 'off') continue;
    const dayShort = label.split(' ')[0];  // "T2"
    if (v === 'fullday') parts.push(`${dayShort}`);
    else if (v === 'morning') parts.push(`${dayShort} sáng`);
    else if (v === 'afternoon') parts.push(`${dayShort} chiều`);
  }
  return parts.length ? parts.join(', ') : 'Chưa có lịch';
}

// ── Component ─────────────────────────────────────────────────
// Pattern: Parent unmount/mount component khi mở/đóng (không dùng prop `open`).
// Init state CHỈ qua useState init fn → tránh setState trong useEffect.
export function WorkScheduleModal({
  onClose, onSave, staffName, initial,
}: {
  onClose: () => void;
  onSave: (ws: WorkSchedule) => Promise<{ ok: boolean; error?: string }>;
  staffName: string;
  initial?: WorkSchedule | null;
}) {
  const [ticks, setTicks] = useState<Record<DayKey, { morning: boolean; afternoon: boolean }>>(
    () => initFromSchedule(initial)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTick(day: DayKey, half: 'morning' | 'afternoon') {
    setTicks(prev => ({
      ...prev,
      [day]: { ...prev[day], [half]: !prev[day][half] },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const workDays: Record<DayKey, DayValue> = {} as Record<DayKey, DayValue>;
    for (const { key } of DAY_LABELS) {
      workDays[key] = ticksToDayValue(ticks[key].morning, ticks[key].afternoon);
    }
    const newSchedule: WorkSchedule = { type: 'parttime', workDays };
    const result = await onSave(newSchedule);
    setSaving(false);
    if (result.ok) {
      onClose();
    } else {
      setError(result.error || 'Lưu lỗi');
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f' }}>
            🗓️ Lịch làm việc — {staffName}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            Tick các <b>buổi nhân viên LÀM VIỆC</b> (không tick = nghỉ)
          </div>
        </div>

        {/* Grid 7×2 */}
        <table style={gridTable}>
          <thead>
            <tr>
              <th style={gridTh}></th>
              <th style={gridTh}>🌅 Sáng</th>
              <th style={gridTh}>🌇 Chiều</th>
            </tr>
          </thead>
          <tbody>
            {DAY_LABELS.map(({ key, label }) => (
              <tr key={key}>
                <td style={gridTdLabel}>{label}</td>
                <td style={gridTdCell}>
                  <input
                    type="checkbox"
                    checked={ticks[key].morning}
                    onChange={() => toggleTick(key, 'morning')}
                    disabled={saving}
                    style={checkboxStyle}
                  />
                </td>
                <td style={gridTdCell}>
                  <input
                    type="checkbox"
                    checked={ticks[key].afternoon}
                    onChange={() => toggleTick(key, 'afternoon')}
                    disabled={saving}
                    style={checkboxStyle}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Preview tóm tắt */}
        <div style={previewStyle}>
          <b>Tóm tắt:</b>{' '}
          {summarizeWorkSchedule({
            type: 'parttime',
            workDays: DAY_LABELS.reduce((acc, { key }) => {
              acc[key] = ticksToDayValue(ticks[key].morning, ticks[key].afternoon);
              return acc;
            }, {} as Record<DayKey, DayValue>),
          })}
        </div>

        {/* Error */}
        {error && (
          <div style={errorBoxStyle}>❌ {error}</div>
        )}

        {/* Actions */}
        <div style={actionsStyle}>
          <button onClick={onClose} disabled={saving} style={btnCancel}>
            Hủy
          </button>
          <button onClick={handleSave} disabled={saving} style={btnSave}>
            {saving ? '⏳ Đang lưu...' : '💾 Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────
function initFromSchedule(s?: WorkSchedule | null): Record<DayKey, { morning: boolean; afternoon: boolean }> {
  const result = {} as Record<DayKey, { morning: boolean; afternoon: boolean }>;
  for (const { key } of DAY_LABELS) {
    const v = s?.workDays?.[key] ?? 'off';
    result[key] = dayValueToTicks(v);
  }
  return result;
}

// ── Styles ────────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
};

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 24,
  maxWidth: 460,
  width: '100%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  fontFamily: 'Inter, sans-serif',
};

const headerStyle: React.CSSProperties = {
  borderBottom: '1px solid #e5e7eb',
  paddingBottom: 12,
  marginBottom: 16,
};

const gridTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: 16,
};

const gridTh: React.CSSProperties = {
  padding: '10px 12px',
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  fontSize: 13,
  fontWeight: 700,
  color: '#374151',
  textAlign: 'center',
};

const gridTdLabel: React.CSSProperties = {
  padding: '12px',
  border: '1px solid #e5e7eb',
  fontSize: 13,
  fontWeight: 600,
  color: '#1e3a5f',
  background: '#fafbfc',
  width: '40%',
};

const gridTdCell: React.CSSProperties = {
  padding: '12px',
  border: '1px solid #e5e7eb',
  textAlign: 'center',
};

const checkboxStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  cursor: 'pointer',
  accentColor: '#3b82f6',
};

const previewStyle: React.CSSProperties = {
  background: '#eff6ff',
  border: '1px solid #93c5fd',
  borderRadius: 8,
  padding: 10,
  fontSize: 13,
  color: '#1e40af',
  marginBottom: 12,
};

const errorBoxStyle: React.CSSProperties = {
  background: '#fee2e2',
  color: '#991b1b',
  border: '1px solid #fca5a5',
  borderRadius: 6,
  padding: 8,
  fontSize: 13,
  marginBottom: 12,
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
};

const btnCancel: React.CSSProperties = {
  padding: '8px 16px',
  border: '1.5px solid #d1d5db',
  borderRadius: 6,
  background: '#fff',
  color: '#374151',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSave: React.CSSProperties = {
  padding: '8px 20px',
  border: 'none',
  borderRadius: 6,
  background: '#3b82f6',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
