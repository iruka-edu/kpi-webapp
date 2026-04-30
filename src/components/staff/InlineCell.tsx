/**
 * InlineCell.tsx — Cell editable Excel-like cho /staff-list
 *
 * Vai trò:
 *   - Hiển thị giá trị 1 field như cell read-only
 *   - Click vào → biến thành <input>/<select> tự focus
 *   - Press Enter HOẶC blur → validate → POST /api/staff (chỉ field changed)
 *   - Hiện ✅ "Đã lưu" 1.5s sau khi save thành công
 *   - Hiện ❌ tooltip lỗi nếu validate fail
 *
 * Hỗ trợ types:
 *   - 'text'      → <input type="text">
 *   - 'phone'     → text + validate VN regex ^0\d{9,10}$
 *   - 'email'     → text + validate @ + .
 *   - 'date'      → <input type="date">
 *   - 'number'    → <input type="number">
 *   - 'dropdown'  → <select> (truyền options)
 *   - 'toggle'    → checkbox
 *   - 'readonly'  → text grey, không edit
 *
 * Save flow:
 *   onClick → setEditing(true)
 *   onBlur/Enter → validate → onSave(field, value)
 *   onSave returns Promise<{ok, error?}>
 *   ok=true → toast "Đã lưu" 1.5s, exit edit mode
 *   ok=false → tooltip lỗi đỏ, KHÔNG exit edit mode
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';

type CellType = 'text' | 'phone' | 'email' | 'date' | 'number' | 'dropdown' | 'toggle' | 'readonly';

export type InlineCellProps = {
  value: string | number | boolean | null | undefined;
  type: CellType;
  field: string;                       // tên field để callback save
  options?: { value: string; label: string }[]; // cho dropdown
  placeholder?: string;
  onSave: (field: string, value: string | boolean) => Promise<{ ok: boolean; error?: string }>;
  display?: (v: unknown) => React.ReactNode; // optional formatter cho hiển thị (vd date dd-mm-yyyy)
  validate?: (v: string) => string | null;   // optional custom validate, return error msg or null
  cellStyle?: React.CSSProperties;           // override style outer cell
};

// ── Validate built-in ─────────────────────────────────────────
function defaultValidate(type: CellType, value: string): string | null {
  if (type === 'phone' && value) {
    if (!/^0\d{9,10}$/.test(value)) return 'SĐT VN: 10-11 số bắt đầu bằng 0';
  }
  if (type === 'email' && value) {
    if (!value.includes('@') || !value.includes('.')) return 'Email không hợp lệ';
  }
  if (type === 'date' && value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Định dạng YYYY-MM-DD';
  }
  return null;
}

// ── Display helper ───────────────────────────────────────────
function defaultDisplay(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? '✅' : '❌';
  return String(value);
}

// ── Component ─────────────────────────────────────────────────
export function InlineCell({
  value, type, field, options, placeholder,
  onSave, display, validate, cellStyle,
}: InlineCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  // Mở edit mode → focus input
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [editing]);

  // Read-only → click không làm gì
  if (type === 'readonly') {
    return (
      <div style={{ ...readOnlyStyle, ...cellStyle }}>
        {display ? display(value) : defaultDisplay(value)}
      </div>
    );
  }

  // Toggle → click flip ngay
  if (type === 'toggle') {
    return (
      <div
        onClick={async (e) => {
          e.stopPropagation();
          if (saving) return;
          setSaving(true);
          const newVal = !value;
          const result = await onSave(field, newVal);
          setSaving(false);
          if (result.ok) {
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1500);
          } else {
            setError(result.error || 'Lưu lỗi');
            setTimeout(() => setError(null), 3000);
          }
        }}
        style={{
          ...cellStyle,
          cursor: saving ? 'wait' : 'pointer',
          padding: '6px 10px',
          opacity: saving ? 0.5 : 1,
          position: 'relative',
        }}
        title="Click để đổi"
      >
        {value ? (
          <span style={badgeActive}>✅ Active</span>
        ) : (
          <span style={badgeInactive}>🔴 Inactive</span>
        )}
        {savedFlash && <span style={flashSaved}>✓</span>}
        {error && <span style={tooltipError}>{error}</span>}
      </div>
    );
  }

  // Edit mode
  if (editing) {
    const handleSave = async () => {
      // Validate
      const customErr = validate ? validate(draft) : null;
      const builtinErr = defaultValidate(type, draft);
      const err = customErr || builtinErr;
      if (err) {
        setError(err);
        return; // KHÔNG exit edit mode khi lỗi
      }
      setError(null);

      // KHÔNG đổi → exit luôn không gọi API
      if (draft === String(value ?? '')) {
        setEditing(false);
        return;
      }

      setSaving(true);
      const result = await onSave(field, draft);
      setSaving(false);

      if (result.ok) {
        setEditing(false);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
      } else {
        setError(result.error || 'Lưu lỗi');
      }
    };

    const handleKey = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        setEditing(false);
        setError(null);
      }
    };

    if (type === 'dropdown') {
      return (
        <div style={{ ...cellStyle, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKey}
            disabled={saving}
            style={inputStyle}
          >
            <option value="">— chọn —</option>
            {options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {error && <div style={tooltipError}>{error}</div>}
        </div>
      );
    }

    // text / phone / email / date / number
    const inputType = type === 'date' ? 'date' : type === 'number' ? 'number' : 'text';
    return (
      <div style={{ ...cellStyle, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={inputType}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setError(null); }}
          onBlur={handleSave}
          onKeyDown={handleKey}
          disabled={saving}
          placeholder={placeholder}
          style={inputStyle}
        />
        {error && <div style={tooltipError}>{error}</div>}
      </div>
    );
  }

  // Display mode (chưa click)
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setDraft(value === null || value === undefined ? '' : String(value));
        setEditing(true);
      }}
      style={{
        ...cellStyle,
        cursor: 'cell',
        padding: '6px 10px',
        position: 'relative',
        minHeight: 28,
        display: 'flex',
        alignItems: 'center',
      }}
      title="Click để sửa"
    >
      <span style={{
        flex: 1,
        color: (value === null || value === undefined || value === '') ? '#9ca3af' : '#111827',
      }}>
        {display ? display(value) : defaultDisplay(value)}
      </span>
      {savedFlash && <span style={flashSaved}>✓ Đã lưu</span>}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const readOnlyStyle: React.CSSProperties = {
  padding: '6px 10px',
  color: '#6b7280',
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  fontSize: 13,
  border: '2px solid #3b82f6',
  borderRadius: 4,
  outline: 'none',
  background: '#fff',
  color: '#111827',
  fontFamily: 'inherit',
};

const badgeActive: React.CSSProperties = {
  background: '#dcfce7', color: '#166534',
  padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
};

const badgeInactive: React.CSSProperties = {
  background: '#fee2e2', color: '#991b1b',
  padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
};

const flashSaved: React.CSSProperties = {
  position: 'absolute',
  right: 6,
  top: '50%',
  transform: 'translateY(-50%)',
  background: '#10b981',
  color: '#fff',
  fontSize: 10,
  padding: '2px 6px',
  borderRadius: 4,
  fontWeight: 600,
  pointerEvents: 'none',
};

const tooltipError: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 2,
  background: '#dc2626',
  color: '#fff',
  fontSize: 11,
  padding: '4px 8px',
  borderRadius: 4,
  whiteSpace: 'nowrap',
  zIndex: 20,
  pointerEvents: 'none',
  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
};
