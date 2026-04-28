/**
 * staff-list/page.tsx — Web view toàn bộ NV: table sortable + filter dept + click row → /staff-edit
 *
 * URL: /staff-list?session=...
 * Pattern: clone holiday-propose (Suspense + FullScreenCard cho loading/error).
 */

'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────
type Staff = {
  username: string;
  name?: string;
  dept?: string;
  position?: string | null;
  active?: boolean;
  contractType?: string;
  discordId?: string;
  managerName?: string | null;
  joinedAt?: string;
  workingDuration?: string;
  dateOfBirth?: string | null;
  numerology?: number | null;
  phone?: string | null;
  email?: string | null;
  hometown?: string | null;
  bankNumber?: string | null;
  bankName?: string | null;
  probationStartDate?: string | null;
  probationEndDate?: string | null;
  contractSignDate?: string | null;
  avatarUrl?: string | null;
};

type ListResp = {
  ok: boolean;
  total?: number;
  active?: number;
  inactive?: number;
  list?: Staff[];
  by_dept?: Record<string, Staff[]>;
};

// ── Helpers ───────────────────────────────────────────────────
function fmtVN(iso?: string | null): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

/** Parse "X năm Y tháng Z ngày" → tổng số ngày (cho sort cột Đã làm) */
function parseDurationDays(s?: string): number {
  if (!s) return 0;
  let total = 0;
  const yearMatch = s.match(/(\d+)\s*năm/);
  const monthMatch = s.match(/(\d+)\s*tháng/);
  const dayMatch = s.match(/(\d+)\s*ngày/);
  if (yearMatch)  total += parseInt(yearMatch[1], 10) * 365;
  if (monthMatch) total += parseInt(monthMatch[1], 10) * 30;
  if (dayMatch)   total += parseInt(dayMatch[1], 10);
  return total;
}

/** Lấy giá trị 1 cột để sort/filter — KHÔNG động data gốc */
function getCellValue(s: Staff, key: ColumnKey): string | number {
  switch (key) {
    case 'name':         return s.name || s.username || '';
    case 'dept':         return s.dept || '';
    case 'position':     return s.position || '';
    case 'phone':        return s.phone || '';
    case 'email':        return s.email || '';
    case 'dateOfBirth':  return s.dateOfBirth || '';     // ISO YYYY-MM-DD sort được trực tiếp
    case 'numerology':   return s.numerology ?? -1;       // -1 để trống đẩy xuống cuối khi asc
    case 'joinedAt':     return s.joinedAt || '';         // ISO sort
    case 'workingDur':   return parseDurationDays(s.workingDuration); // số ngày
    case 'active':       return s.active === false ? 0 : 1;
    default:             return '';
  }
}

type ColumnKey = 'name' | 'dept' | 'position' | 'phone' | 'email' | 'dateOfBirth' | 'numerology' | 'joinedAt' | 'workingDur' | 'active';
type SortDir = 'asc' | 'desc' | null;

type ColumnDef = {
  key: ColumnKey;
  label: string;
  width?: number;
  filterPlaceholder?: string;
};

const COLUMNS: ColumnDef[] = [
  { key: 'name',        label: '👤 Họ tên',       filterPlaceholder: 'tên...' },
  { key: 'dept',        label: '🏢 Phòng ban',    filterPlaceholder: 'dept...' },
  { key: 'position',    label: '💼 Vị trí',        filterPlaceholder: 'vị trí...' },
  { key: 'phone',       label: '📞 SĐT',           filterPlaceholder: 'SĐT...' },
  { key: 'email',       label: '📧 Email',         filterPlaceholder: 'email...' },
  { key: 'dateOfBirth', label: '🎂 Ngày sinh',    filterPlaceholder: '01-01...' },
  { key: 'numerology',  label: '🔢 Thần số',       filterPlaceholder: '1-9, 11, 22...' },
  { key: 'joinedAt',    label: '📅 Bắt đầu làm',  filterPlaceholder: '2017-03...' },
  { key: 'workingDur',  label: '⏱️ Đã làm',         filterPlaceholder: 'năm/tháng...' },
  { key: 'active',      label: '🟢 Trạng thái',   filterPlaceholder: 'active/inactive' },
];

const DEPT_EMOJI: Record<string, string> = {
  Dev: '👨‍💻', Design: '🎨', Content: '✍️', QC: '🔍',
  HR: '👥', Edu: '📚', Mentor: '🎓', 'HĐQT': '👔', Tester: '🧪', CEO: '👑',
};

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
function StaffListContent() {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('session') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<ListResp>({ ok: false });

  // Filter state
  const [filterDept, setFilterDept] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/staff/list', {
          headers: { 'x-session-token': sessionToken },
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setError(json.error || 'Không tải được danh sách');
        } else {
          setData(json);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi mạng');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionToken]);

  // [NEW] Per-column sort + filter
  const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [colFilters, setColFilters] = useState<Partial<Record<ColumnKey, string>>>({});

  // Tính depts unique từ list
  const depts = useMemo(() => {
    const set = new Set<string>();
    (data.list || []).forEach(s => s.dept && set.add(s.dept));
    return Array.from(set).sort();
  }, [data]);

  // Filter + Sort (per-column)
  const filtered = useMemo(() => {
    let list = data.list || [];

    // Global filters (giữ nguyên — dropdown dept + checkbox inactive + global search)
    if (filterDept) list = list.filter(s => s.dept === filterDept);
    if (!showInactive) list = list.filter(s => s.active !== false);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.username || '').toLowerCase().includes(q) ||
        (s.dept || '').toLowerCase().includes(q) ||
        (s.position || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q)
      );
    }

    // Per-column filters (string contain — case insensitive — dùng giá trị HIỂN THỊ cho ngày)
    for (const [colKey, filterVal] of Object.entries(colFilters)) {
      if (!filterVal || !filterVal.trim()) continue;
      const q = filterVal.toLowerCase().trim();
      const key = colKey as ColumnKey;
      list = list.filter(s => {
        // Cột date hiển thị dạng dd-mm-yyyy → match cả 2 format
        if (key === 'dateOfBirth' || key === 'joinedAt') {
          const iso = (s[key as 'dateOfBirth' | 'joinedAt'] || '').toString().toLowerCase();
          const vn = fmtVN(s[key as 'dateOfBirth' | 'joinedAt']).toLowerCase();
          return iso.includes(q) || vn.includes(q);
        }
        // Cột active: keyword "active"/"inactive"
        if (key === 'active') {
          const status = s.active === false ? 'inactive' : 'active';
          return status.includes(q);
        }
        // Cột workingDur: filter theo string hiển thị
        if (key === 'workingDur') {
          return (s.workingDuration || '').toLowerCase().includes(q);
        }
        // Cột numerology: số → string
        if (key === 'numerology') {
          return (s.numerology != null ? String(s.numerology) : '').includes(q);
        }
        // String column khác
        return String(getCellValue(s, key) || '').toLowerCase().includes(q);
      });
    }

    // Sort (per-column)
    if (sortKey && sortDir) {
      const sorted = [...list].sort((a, b) => {
        const va = getCellValue(a, sortKey);
        const vb = getCellValue(b, sortKey);
        let cmp = 0;
        if (typeof va === 'number' && typeof vb === 'number') {
          cmp = va - vb;
        } else {
          // String compare — locale Việt để sort tên có dấu
          cmp = String(va).localeCompare(String(vb), 'vi', { sensitivity: 'base' });
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
      list = sorted;
    }

    return list;
  }, [data, filterDept, showInactive, search, colFilters, sortKey, sortDir]);

  // Click header → toggle sort: asc → desc → none
  function toggleSort(key: ColumnKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  }

  function setColFilter(key: ColumnKey, value: string) {
    setColFilters(prev => ({ ...prev, [key]: value }));
  }

  // Open edit page in new tab
  function openEdit(s: Staff) {
    if (!s.discordId) return;
    const params = new URLSearchParams({
      session: sessionToken,
      target_id: s.discordId,
      editor_role: 'HR',
    });
    window.open(`/staff-edit?${params.toString()}`, '_blank');
  }

  if (!sessionToken) {
    return (
      <FullScreenCard
        icon="🔒"
        title="Cần link từ Discord"
        desc={'Vui lòng dùng link bot gửi qua DM (lệnh /staff list).\nLink có hiệu lực 30 phút.'}
      />
    );
  }
  if (loading) return <FullScreenCard icon="⏳" title="Đang tải danh sách NV..." desc="" />;
  if (error)   return <FullScreenCard icon="❌" title="Lỗi tải dữ liệu" desc={error} />;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '24px 12px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f, #3b5a85)', color: '#fff',
          padding: '20px 24px', borderRadius: 12, marginBottom: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
              👥 Danh sách nhân viên IruKa
            </div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              Tổng: <b>{data.total}</b> · Active: <b>{data.active}</b> · Inactive: <b>{data.inactive}</b>
            </div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            💡 Click vào 1 hàng để mở form sửa chi tiết
          </div>
        </div>

        {/* Filter bar */}
        <div style={{
          background: '#fff', padding: 14, borderRadius: 10, marginBottom: 14,
          border: '1px solid #e5e7eb', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Tìm theo tên, dept, email, SĐT..."
            style={{
              flex: 1, minWidth: 220, padding: '8px 12px', border: '1.5px solid #d1d5db',
              borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none',
            }}
          />
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            style={{
              padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: 8,
              fontSize: 14, color: '#111827', background: '#fff', cursor: 'pointer',
            }}
          >
            <option value="">🏢 Tất cả phòng ban</option>
            {depts.map(d => (
              <option key={d} value={d}>{DEPT_EMOJI[d] || '📁'} {d}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            Hiện inactive
          </label>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            Hiển thị: <b>{filtered.length}</b>/{data.total}
          </span>
        </div>

        {/* Hint sort/filter */}
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
          💡 Click tiêu đề cột để <b>sắp xếp</b> (asc → desc → tắt). Gõ ô nhỏ dưới mỗi cột để <b>lọc</b> riêng cột đó. Nhiều bộ lọc có thể chạy cùng lúc.
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 10, overflow: 'auto', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              {/* Row 1: header sortable */}
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <th style={{ ...thStyle, cursor: 'default' }}>STT</th>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleSort(col.key)}
                    title="Click để sắp xếp"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      <span style={{ fontSize: 10, color: sortKey === col.key ? '#3b82f6' : '#cbd5e1' }}>
                        {sortKey === col.key
                          ? (sortDir === 'asc' ? '▲' : sortDir === 'desc' ? '▼' : '⇅')
                          : '⇅'}
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
              {/* Row 2: filter inputs */}
              <tr style={{ background: '#fafbfc' }}>
                <th style={{ ...thStyle, padding: '4px 6px' }}></th>
                {COLUMNS.map(col => (
                  <th key={`f_${col.key}`} style={{ ...thStyle, padding: '4px 6px', fontWeight: 400 }}>
                    <input
                      type="text"
                      value={colFilters[col.key] || ''}
                      onChange={(e) => setColFilter(col.key, e.target.value)}
                      placeholder={col.filterPlaceholder || '...'}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%', padding: '4px 8px', fontSize: 11,
                        border: '1px solid #e5e7eb', borderRadius: 4,
                        outline: 'none', color: '#374151', background: '#fff',
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={COLUMNS.length + 1} style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>
                  _Không có nhân viên nào khớp filter_
                </td></tr>
              ) : (
                filtered.map((s, i) => (
                  <tr
                    key={s.username}
                    onClick={() => openEdit(s)}
                    style={{
                      borderTop: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      opacity: s.active === false ? 0.55 : 1,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {s.avatarUrl ? (
                          <img src={s.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                            {(s.name || s.username || '?').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span>{s.name || s.username}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>{DEPT_EMOJI[s.dept || ''] || '📁'} {s.dept || '—'}</td>
                    <td style={tdStyle}>{s.position || '—'}</td>
                    <td style={tdStyle}>{s.phone || '—'}</td>
                    <td style={tdStyle}>{s.email || '—'}</td>
                    <td style={tdStyle}>{fmtVN(s.dateOfBirth) || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>
                      {s.numerology != null ? (
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: 12, fontSize: 12 }}>{s.numerology}</span>
                      ) : '—'}
                    </td>
                    <td style={tdStyle}>{fmtVN(s.joinedAt) || '—'}</td>
                    <td style={tdStyle}>{s.workingDuration || '—'}</td>
                    <td style={tdStyle}>
                      {s.active === false ? (
                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>🔴 Inactive</span>
                      ) : (
                        <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>✅ Active</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: 14, padding: 12, background: '#eff6ff',
          border: '1px solid #93c5fd', borderRadius: 8,
          fontSize: 12, color: '#1e40af',
        }}>
          💡 Click 1 hàng để mở form sửa chi tiết. Tài khoản ngân hàng + ngày thử việc + ngày ký HĐ chỉ hiện trong form chi tiết để tránh table dài.
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#374151',
  textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e5e7eb',
  whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '10px 14px', color: '#111827', whiteSpace: 'nowrap',
};

export default function Page() {
  return (
    <Suspense fallback={<FullScreenCard icon="⏳" title="Đang tải..." desc="" />}>
      <StaffListContent />
    </Suspense>
  );
}
