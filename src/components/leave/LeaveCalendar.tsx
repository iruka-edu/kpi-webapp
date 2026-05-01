/**
 * LeaveCalendar.tsx — Calendar 1 tháng + popup chọn buổi nghỉ
 *
 * 2 mode:
 *  - 'fulltime': click ngày tương lai → popup chọn Cả ngày/Sáng/Chiều
 *  - 'parttime': click ngày tương lai → popup chọn theo workSchedule
 *      • buổi LÀM theo lịch → "🔴 Xin nghỉ"
 *      • buổi OFF theo lịch → "🟦 Đăng ký làm bù"
 *
 * Schema selections (controlled):
 *   { "2026-05-15:morning": "off", "2026-05-15:afternoon": "off", "2026-05-07:afternoon": "work_swap" }
 *
 * Khi user chọn:
 *   - fulltime: chỉ có action='off', type='full'|'morning'|'afternoon'
 *   - parttime: action='off' hoặc 'work_swap' tùy lịch
 */

'use client';

import React, { useState, useMemo } from 'react';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type DayValue = 'fullday' | 'morning' | 'afternoon' | 'off';

export type WorkSchedule = {
  type: 'fulltime' | 'parttime';
  workDays: Record<DayKey, DayValue>;
};

export type LeaveAction = 'off' | 'work_swap';

/** Selections key = "YYYY-MM-DD:morning" hoặc "YYYY-MM-DD:afternoon" */
export type LeaveSelections = Record<string, LeaveAction>;

const DAY_NAMES: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function getDayName(dateISO: string): DayKey | null {
  const m = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return DAY_NAMES[d.getDay()];
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

function dateKey(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

// ── Component ─────────────────────────────────────────────────
export type LeaveCalendarProps = {
  mode: 'fulltime' | 'parttime';
  workSchedule?: WorkSchedule | null;     // bắt buộc khi mode=parttime
  selections: LeaveSelections;
  onChange: (newSelections: LeaveSelections) => void;
  /** Ngày bắt đầu hiển thị (default: tháng hiện tại) */
  initialMonth?: Date;
  /** Ngày hôm nay — disable click. Default: new Date() */
  today?: Date;
};

export function LeaveCalendar({
  mode, workSchedule, selections, onChange, initialMonth, today,
}: LeaveCalendarProps) {
  const TODAY = useMemo(() => today || new Date(), [today]);
  const [year, setYear] = useState(() => (initialMonth || TODAY).getFullYear());
  const [month, setMonth] = useState(() => (initialMonth || TODAY).getMonth());

  // Popup state
  const [popupDate, setPopupDate] = useState<string | null>(null);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setYear(y); setMonth(m);
  }

  // ── Determine cell state cho parttime ──
  function getCellSchedule(dk: string): { morning: 'work' | 'off'; afternoon: 'work' | 'off' } {
    if (mode === 'fulltime') {
      // Fulltime mặc định: T2-T6 fullday, T7 sáng, CN off
      const dayName = getDayName(dk);
      if (dayName === 'sun') return { morning: 'off', afternoon: 'off' };
      if (dayName === 'sat') return { morning: 'work', afternoon: 'off' };
      return { morning: 'work', afternoon: 'work' };
    }
    // Parttime: theo workSchedule
    const dayName = getDayName(dk);
    if (!dayName || !workSchedule?.workDays) return { morning: 'off', afternoon: 'off' };
    const sched = workSchedule.workDays[dayName] || 'off';
    if (sched === 'fullday') return { morning: 'work', afternoon: 'work' };
    if (sched === 'morning') return { morning: 'work', afternoon: 'off' };
    if (sched === 'afternoon') return { morning: 'off', afternoon: 'work' };
    return { morning: 'off', afternoon: 'off' };
  }

  // ── Generate calendar cells ──
  const cells = useMemo(() => {
    const list: Array<null | { date: string; day: number; dayOfWeek: number; isPast: boolean; isToday: boolean }> = [];
    const first = new Date(year, month, 1);
    let dayIndex = first.getDay();
    dayIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Mon-first
    for (let i = 0; i < dayIndex; i++) list.push(null);
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const dt = new Date(year, month, d);
      list.push({
        date: dateKey(year, month + 1, d),
        day: d,
        dayOfWeek: dt.getDay(),
        isPast: dt < TODAY && !sameDay(dt, TODAY),
        isToday: sameDay(dt, TODAY),
      });
    }
    return list;
  }, [year, month, TODAY]);

  // ── Render cell ──
  function renderCell(cell: typeof cells[0], idx: number) {
    if (cell === null) return <div key={`e_${idx}`} style={cellEmpty} />;
    const dk = cell.date;
    const sched = getCellSchedule(dk);
    const morningSel = selections[`${dk}:morning`];
    const afternoonSel = selections[`${dk}:afternoon`];

    let style: React.CSSProperties = { ...cellBase };
    if (cell.isPast) style = { ...style, ...cellPast };
    else if (cell.isToday) style = { ...style, ...cellToday };
    else {
      // Future
      if (mode === 'parttime') {
        // Phân biệt cell có buổi off
        const hasOff = sched.morning === 'off' || sched.afternoon === 'off';
        style = { ...style, ...(hasOff ? cellFutureMixed : cellFutureWork) };
      } else {
        style = { ...style, ...cellFutureWork };
      }
    }
    if (cell.dayOfWeek === 0) style = { ...style, color: '#dc2626' };

    // Selected state
    const hasOff = morningSel === 'off' || afternoonSel === 'off';
    const hasWork = morningSel === 'work_swap' || afternoonSel === 'work_swap';
    if (hasOff) style = { ...style, ...cellSelectedOff };
    else if (hasWork) style = { ...style, ...cellSelectedWork };

    // Tag
    let tag = '';
    if (morningSel === 'off' && afternoonSel === 'off') tag = 'N-CN';
    else if (morningSel === 'off') tag = 'N-S';
    else if (afternoonSel === 'off') tag = 'N-C';
    else if (morningSel === 'work_swap' && afternoonSel === 'work_swap') tag = 'B-CN';
    else if (morningSel === 'work_swap') tag = 'B-S';
    else if (afternoonSel === 'work_swap') tag = 'B-C';

    const canClick = !cell.isPast && !cell.isToday;
    return (
      <div
        key={dk}
        style={{ ...style, cursor: canClick ? 'pointer' : 'not-allowed' }}
        onClick={() => canClick && setPopupDate(dk)}
        title={cell.isToday ? 'Hôm nay — không xin được' : ''}
      >
        <span>{cell.day}</span>
        {tag && <span style={tagStyle}>{tag}</span>}
        {cell.isToday && <span style={todayBadge}>HÔM NAY</span>}
      </div>
    );
  }

  // ── Popup ──
  function closePopup() { setPopupDate(null); }
  function applyPopupSelection(buoi: 'morning' | 'afternoon', action: LeaveAction | null) {
    if (!popupDate) return;
    const newSel = { ...selections };
    const key = `${popupDate}:${buoi}`;
    if (action === null) delete newSel[key];
    else newSel[key] = action;
    onChange(newSel);
  }
  function clearPopupAll() {
    if (!popupDate) return;
    const newSel = { ...selections };
    delete newSel[`${popupDate}:morning`];
    delete newSel[`${popupDate}:afternoon`];
    onChange(newSel);
    closePopup();
  }

  // ── Render popup ──
  let popup = null;
  if (popupDate) {
    const [y, m, d] = popupDate.split('-');
    const dt = new Date(+y, +m - 1, +d);
    const dows = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const sched = getCellSchedule(popupDate);
    const morningSel = selections[`${popupDate}:morning`];
    const afternoonSel = selections[`${popupDate}:afternoon`];
    const hasAny = morningSel || afternoonSel;

    popup = (
      <div style={popupOverlay} onClick={closePopup}>
        <div style={popupBox} onClick={(e) => e.stopPropagation()}>
          <div style={popupTitle}>{dows[dt.getDay()]}, {d}/{m}/{y}</div>
          {mode === 'parttime' && (
            <div style={popupSubLabel}>
              {sched.morning === 'off' && sched.afternoon === 'off' && '⬜ Cả ngày OFF — đăng ký làm bù'}
              {sched.morning === 'work' && sched.afternoon === 'work' && '🟢 Cả ngày LÀM — xin nghỉ buổi'}
              {sched.morning === 'work' && sched.afternoon === 'off' && '🟢 Sáng làm · ⬜ Chiều off'}
              {sched.morning === 'off' && sched.afternoon === 'work' && '⬜ Sáng off · 🟢 Chiều làm'}
            </div>
          )}
          {/* Sáng */}
          <div style={popupRow}>
            <span style={popupLabel}>Sáng:</span>
            {sched.morning === 'work' ? (
              <RadioOption
                checked={morningSel === 'off'}
                onChange={(v) => applyPopupSelection('morning', v ? 'off' : null)}
                label="🔴 Xin nghỉ (−0.5)"
                color="red"
              />
            ) : (
              <RadioOption
                checked={morningSel === 'work_swap'}
                onChange={(v) => applyPopupSelection('morning', v ? 'work_swap' : null)}
                label="🟦 Làm bù (+0.5)"
                color="blue"
              />
            )}
          </div>
          {/* Chiều */}
          <div style={popupRow}>
            <span style={popupLabel}>Chiều:</span>
            {sched.afternoon === 'work' ? (
              <RadioOption
                checked={afternoonSel === 'off'}
                onChange={(v) => applyPopupSelection('afternoon', v ? 'off' : null)}
                label="🔴 Xin nghỉ (−0.5)"
                color="red"
              />
            ) : (
              <RadioOption
                checked={afternoonSel === 'work_swap'}
                onChange={(v) => applyPopupSelection('afternoon', v ? 'work_swap' : null)}
                label="🟦 Làm bù (+0.5)"
                color="blue"
              />
            )}
          </div>
          {/* Cả ngày shortcut (chỉ fulltime hoặc khi cả 2 buổi đều LÀM) */}
          {sched.morning === 'work' && sched.afternoon === 'work' && (
            <div style={{ ...popupRow, justifyContent: 'center', marginTop: 4 }}>
              <button
                onClick={() => {
                  applyPopupSelection('morning', 'off');
                  applyPopupSelection('afternoon', 'off');
                }}
                style={btnFullday}
              >
                ☀️ Chọn nhanh: Nghỉ cả ngày (−1.0)
              </button>
            </div>
          )}
          <div style={popupActions}>
            {hasAny && (
              <button onClick={clearPopupAll} style={btnClear}>Bỏ chọn</button>
            )}
            <button onClick={closePopup} style={btnDone}>Xong</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={calHeader}>
        <button onClick={() => changeMonth(-1)} style={navBtn}>◄ Trước</button>
        <span style={calMonth}>Tháng {month + 1}/{year}</span>
        <button onClick={() => changeMonth(1)} style={navBtn}>Sau ►</button>
      </div>
      <div style={calGrid}>
        <div style={dowCell}>T2</div>
        <div style={dowCell}>T3</div>
        <div style={dowCell}>T4</div>
        <div style={dowCell}>T5</div>
        <div style={dowCell}>T6</div>
        <div style={dowCell}>T7</div>
        <div style={{ ...dowCell, color: '#dc2626' }}>CN</div>
        {cells.map((c, i) => renderCell(c, i))}
      </div>
      {popup}
    </div>
  );
}

// ── Sub-component RadioOption ──────────────────────────────
function RadioOption({ checked, onChange, label, color }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  color: 'red' | 'blue';
}) {
  const accent = color === 'red' ? '#dc2626' : '#3b82f6';
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px',
      borderRadius: 6,
      border: `1.5px solid ${checked ? accent : '#e5e7eb'}`,
      background: checked ? (color === 'red' ? '#fee2e2' : '#eff6ff') : '#fff',
      color: checked ? accent : '#374151',
      cursor: 'pointer',
      flex: 1,
      fontSize: 13,
      fontWeight: 600,
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: accent }}
      />
      {label}
    </label>
  );
}

// ── Styles ─────────────────────────────────────────────────
const calHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: 10,
};
const navBtn: React.CSSProperties = {
  background: '#f9fafb', border: '1px solid #e5e7eb',
  borderRadius: 6, padding: '5px 12px',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  color: '#1e3a5f', fontFamily: 'inherit',
};
const calMonth: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: '#1e3a5f' };
const calGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 4,
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 8,
};
const dowCell: React.CSSProperties = {
  textAlign: 'center', padding: '6px 0',
  fontSize: 11, fontWeight: 700,
  color: '#4b5563', textTransform: 'uppercase',
};
const cellBase: React.CSSProperties = {
  aspectRatio: '1',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  background: '#fff',
  border: '1px solid #f3f4f6',
  borderRadius: 6,
  fontSize: 12, fontWeight: 600,
  color: '#1e3a5f',
  position: 'relative',
};
const cellEmpty: React.CSSProperties = { ...cellBase, background: 'transparent', border: 'none' };
const cellPast: React.CSSProperties = { background: '#fafafa', color: '#9ca3af', textDecoration: 'line-through' };
const cellToday: React.CSSProperties = { background: '#fff', border: '2px solid #f59e0b' };
const cellFutureWork: React.CSSProperties = { background: '#f0fdf4', borderColor: '#bbf7d0' };
const cellFutureMixed: React.CSSProperties = { background: '#f9fafb', borderStyle: 'dashed', color: '#6b7280' };
const cellSelectedOff: React.CSSProperties = {
  background: '#dc2626', color: '#fff', borderColor: '#dc2626',
  boxShadow: '0 2px 6px rgba(220,38,38,0.4)',
};
const cellSelectedWork: React.CSSProperties = {
  background: '#3b82f6', color: '#fff', borderColor: '#3b82f6',
  boxShadow: '0 2px 6px rgba(59,130,246,0.4)',
};
const tagStyle: React.CSSProperties = {
  position: 'absolute', bottom: 2,
  fontSize: 8, fontWeight: 800,
  background: 'rgba(255,255,255,0.95)',
  color: '#1e3a5f',
  padding: '1px 4px',
  borderRadius: 2,
};
const todayBadge: React.CSSProperties = {
  position: 'absolute', top: -6, right: -2,
  background: '#f59e0b', color: '#fff',
  fontSize: 8, padding: '1px 4px', borderRadius: 3,
  fontWeight: 700,
};
const popupOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 100, padding: 16,
};
const popupBox: React.CSSProperties = {
  background: '#fff', borderRadius: 14,
  padding: '20px 22px',
  maxWidth: 420, width: '100%',
  boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
};
const popupTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 800, color: '#1e3a5f',
  marginBottom: 6, textAlign: 'center',
};
const popupSubLabel: React.CSSProperties = {
  fontSize: 12, color: '#6b7280', textAlign: 'center',
  marginBottom: 14, padding: '6px 10px', background: '#f9fafb', borderRadius: 6,
};
const popupRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  marginBottom: 10,
};
const popupLabel: React.CSSProperties = {
  width: 60, fontSize: 13, fontWeight: 700, color: '#374151',
};
const popupActions: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10,
};
const btnClear: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 6,
  background: '#fee2e2', color: '#dc2626',
  border: '1.5px solid #dc2626',
  fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
};
const btnDone: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 6,
  background: 'linear-gradient(135deg, #1e3a5f, #3b5a85)',
  color: '#fff', border: 'none',
  fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
};
const btnFullday: React.CSSProperties = {
  width: '100%',
  padding: '8px', borderRadius: 6,
  background: '#fef3c7', color: '#92400e',
  border: '1.5px dashed #f59e0b',
  fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
};
