/**
 * staff-list/page.tsx — Web view toàn bộ NV: 21 cột + sticky + inline edit Excel-like
 *
 * URL: /staff-list?session=...
 *
 * Vai trò:
 *   - Hiển thị 21 cột thông tin NV (sticky 6 cột đầu, scroll ngang 15 cột phụ)
 *   - 2 cơ chế edit:
 *     1. Click TÊN → mở popup /staff-edit cũ (giữ logic 100%)
 *     2. Click ô khác → inline edit Excel-like (Enter/blur → auto-save)
 *   - 3 cột phép realtime (Phép/tháng | Đã nghỉ | Còn dư) — sẽ compute ở Phase B2
 *   - Tooltip cho 3 cột phép giải thích công thức
 *   - Click cột "Lịch làm" parttime → popup grid 7×2
 *
 * Pattern: clone holiday-propose (Suspense + FullScreenCard cho loading/error).
 * Logic cũ (sort, filter, search, dept dropdown, hide inactive) GIỮ NGUYÊN 100%.
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { InlineCell } from '@/components/staff/InlineCell';
import {
  WorkScheduleModal,
  summarizeWorkSchedule,
  type WorkSchedule,
} from '@/components/staff/WorkScheduleModal';

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
  numerology?: number | string | null;
  phone?: string | null;
  email?: string | null;
  hometown?: string | null;
  bankNumber?: string | null;
  bankName?: string | null;
  probationStartDate?: string | null;
  probationEndDate?: string | null;
  contractSignDate?: string | null;
  avatarUrl?: string | null;
  // Field MỚI Phase B (sẽ có sau khi backend cập nhật)
  workSchedule?: WorkSchedule | null;
  monthlyLeaveQuota?: number;
  // Field tính realtime (sẽ có sau Phase B2)
  leaveBalance?: {
    monthlyQuota: number;
    totalUsed: number;
    balance: number;
  } | null;
  // [Phase B v5 — NHÓM A: Khẩn cấp]
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  emergencyRelation?: string | null;
  // [Phase B v5 — NHÓM B: Pháp lý CCCD]
  cccdNumber?: string | null;
  cccdIssueDate?: string | null;
  cccdIssuePlace?: string | null;
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

// ── Column definitions ───────────────────────────────────────
type ColumnKey =
  | 'name' | 'dept' | 'position' | 'contractType' | 'active'
  | 'phone' | 'email' | 'dateOfBirth' | 'numerology' | 'hometown'
  | 'bankNumber' | 'bankName'
  | 'joinedAt' | 'probationStartDate' | 'probationEndDate' | 'contractSignDate' | 'workingDur'
  | 'workSchedule' | 'leaveQuota' | 'leaveUsed' | 'leaveBalance' | 'manager'
  | 'emergencyContact' | 'emergencyPhone' | 'emergencyRelation'
  | 'cccdNumber' | 'cccdIssueDate' | 'cccdIssuePlace';
type SortDir = 'asc' | 'desc' | null;

type ColumnDef = {
  key: ColumnKey;
  label: string;
  width: number;
  sticky?: boolean;       // sticky-left
  filterable?: boolean;
  filterPlaceholder?: string;
};

// Sticky 5 cột đầu (STT + 5 cột chính) — Excel-like freeze panes
const COLUMNS: ColumnDef[] = [
  // 🟢 STICKY (luôn thấy — CEO nhìn vào là thấy ngay, scroll ngang KHÔNG ẩn)
  { key: 'name',             label: '👤 Họ tên',        width: 180, sticky: true, filterable: true, filterPlaceholder: 'tên...' },
  { key: 'dept',             label: '🏢 Phòng ban',     width: 110, sticky: true, filterable: true, filterPlaceholder: 'dept...' },
  { key: 'position',         label: '💼 Vị trí',          width: 140, sticky: true, filterable: true, filterPlaceholder: 'vị trí...' },
  { key: 'contractType',     label: '📋 Loại HĐ',        width: 100, sticky: true, filterable: true, filterPlaceholder: 'fulltime...' },
  { key: 'workSchedule',     label: '🗓️ Lịch làm',        width: 180, sticky: true },
  // 🟡 SCROLL — nhóm vòng đời HĐ (4 cột date theo thứ tự thời gian)
  { key: 'joinedAt',           label: '📅 Ngày vào làm',   width: 130, filterable: true, filterPlaceholder: '...' },
  { key: 'probationStartDate', label: '📝 Ngày thử việc', width: 130, filterable: true, filterPlaceholder: '...' },
  { key: 'probationEndDate',   label: '📅 Hết thử việc',  width: 130, filterable: true, filterPlaceholder: '...' },
  { key: 'contractSignDate',   label: '✍️ Ngày ký HĐ',     width: 130, filterable: true, filterPlaceholder: '...' },
  { key: 'workingDur',         label: '⏱️ Đã làm',           width: 130, filterable: true, filterPlaceholder: 'năm/tháng...' },
  { key: 'leaveQuota',       label: '📊 Phép/tháng',    width: 110 },
  { key: 'leaveUsed',        label: '📈 Đã nghỉ',       width: 100 },
  { key: 'leaveBalance',     label: '🎯 Còn dư',         width: 100 },
  { key: 'manager',          label: '👨‍💼 QL trực tiếp', width: 160 },
  // 🔵 SCROLL — thông tin liên lạc & cá nhân
  { key: 'phone',            label: '📞 SĐT',               width: 130, filterable: true, filterPlaceholder: 'SĐT...' },
  { key: 'email',            label: '📧 Email',             width: 220, filterable: true, filterPlaceholder: 'email...' },
  { key: 'dateOfBirth',      label: '🎂 Ngày sinh',        width: 120, filterable: true, filterPlaceholder: '01-01...' },
  { key: 'numerology',       label: '🔢 Thần số',           width: 80,  filterable: true, filterPlaceholder: '...' },
  { key: 'hometown',         label: '🏠 Quê quán',          width: 140, filterable: true, filterPlaceholder: 'quê...' },
  { key: 'bankNumber',       label: '💳 Số TK',              width: 160, filterable: true, filterPlaceholder: 'STK...' },
  { key: 'bankName',         label: '🏦 Ngân hàng',         width: 130, filterable: true, filterPlaceholder: 'bank...' },
  // [Phase B v5] NHÓM A — Khẩn cấp
  { key: 'emergencyContact', label: '🚨 Tên người thân',    width: 180, filterable: true, filterPlaceholder: 'tên...' },
  { key: 'emergencyPhone',   label: '📱 SĐT người thân',    width: 140, filterable: true, filterPlaceholder: 'SĐT...' },
  { key: 'emergencyRelation',label: '💞 Mối quan hệ',        width: 130 },
  // [Phase B v5] NHÓM B — Pháp lý CCCD
  { key: 'cccdNumber',       label: '🆔 Số CCCD',            width: 150, filterable: true, filterPlaceholder: '12 số...' },
  { key: 'cccdIssueDate',    label: '📅 Ngày cấp CCCD',      width: 130 },
  { key: 'cccdIssuePlace',   label: '🏛️ Nơi cấp CCCD',        width: 220, filterable: true, filterPlaceholder: 'nơi cấp...' },
  // ⬛ CUỐI CÙNG bên tay phải — Active/Inactive
  { key: 'active', label: '✅ Trạng thái', width: 110, filterable: true, filterPlaceholder: 'active...' },
];

// Key của cột sticky cuối cùng → tô border phải đậm để phân ranh giới "đứng yên" vs "trượt"
const LAST_STICKY_KEY = (() => {
  const stickyCols = COLUMNS.filter(c => c.sticky);
  return stickyCols.length > 0 ? stickyCols[stickyCols.length - 1].key : null;
})();
// Style border phải đậm cho cột sticky cuối — dùng cho cả thead và tbody
const STICKY_DIVIDER_BORDER = '2px solid #94a3b8'; // medium grey, đậm hơn #f3f4f6 mặc định

const RELATION_OPTIONS = [
  { value: 'Bố',        label: 'Bố' },
  { value: 'Mẹ',        label: 'Mẹ' },
  { value: 'Vợ',        label: 'Vợ' },
  { value: 'Chồng',     label: 'Chồng' },
  { value: 'Anh trai',  label: 'Anh trai' },
  { value: 'Chị gái',   label: 'Chị gái' },
  { value: 'Em trai',   label: 'Em trai' },
  { value: 'Em gái',    label: 'Em gái' },
  { value: 'Bạn',       label: 'Bạn' },
  { value: 'Khác',      label: 'Khác' },
];

const DEPT_EMOJI: Record<string, string> = {
  Dev: '👨‍💻', Design: '🎨', Content: '✍️', QC: '🔍',
  HR: '👥', Edu: '📚', Mentor: '🎓', 'HĐQT': '👔', Tester: '🧪', CEO: '👑',
};

const DEPT_OPTIONS = [
  { value: 'Dev', label: '👨‍💻 Dev' },
  { value: 'Design', label: '🎨 Design' },
  { value: 'Content', label: '✍️ Content' },
  { value: 'QC', label: '🔍 QC' },
  { value: 'HR', label: '👥 HR' },
  { value: 'Edu', label: '📚 Edu' },
  { value: 'Mentor', label: '🎓 Mentor' },
  { value: 'HĐQT', label: '👔 HĐQT' },
  { value: 'Tester', label: '🧪 Tester' },
  { value: 'CEO', label: '👑 CEO' },
];

const CONTRACT_OPTIONS = [
  { value: 'fulltime', label: 'Fulltime' },
  { value: 'parttime', label: 'Parttime' },
];

const BANK_OPTIONS = [
  { value: 'Vietcombank', label: 'Vietcombank' },
  { value: 'Techcombank', label: 'Techcombank' },
  { value: 'MB',          label: 'MB Bank' },
  { value: 'BIDV',        label: 'BIDV' },
  { value: 'Agribank',    label: 'Agribank' },
  { value: 'ACB',         label: 'ACB' },
  { value: 'VPBank',      label: 'VPBank' },
  { value: 'TPBank',      label: 'TPBank' },
  { value: 'Sacombank',   label: 'Sacombank' },
  { value: 'VietinBank',  label: 'VietinBank' },
  { value: 'Khác',        label: 'Khác' },
];

// ── Sort helper ───────────────────────────────────────────────
function getCellValue(s: Staff, key: ColumnKey): string | number {
  switch (key) {
    case 'name':             return s.name || s.username || '';
    case 'dept':             return s.dept || '';
    case 'position':         return s.position || '';
    case 'contractType':     return s.contractType || '';
    case 'active':           return s.active === false ? 0 : 1;
    case 'phone':            return s.phone || '';
    case 'email':            return s.email || '';
    case 'dateOfBirth':      return s.dateOfBirth || '';
    case 'numerology':       return s.numerology != null ? String(s.numerology) : '';
    case 'hometown':         return s.hometown || '';
    case 'bankNumber':       return s.bankNumber || '';
    case 'bankName':         return s.bankName || '';
    case 'joinedAt':         return (s.joinedAt || '').slice(0, 10);
    case 'probationStartDate': return s.probationStartDate || '';
    case 'probationEndDate': return s.probationEndDate || '';
    case 'contractSignDate': return s.contractSignDate || '';
    case 'workingDur':       return parseDurationDays(s.workingDuration);
    case 'workSchedule':     return summarizeWorkSchedule(s.workSchedule);
    case 'leaveQuota':       return s.leaveBalance?.monthlyQuota ?? (s.contractType === 'fulltime' ? 1 : 0);
    case 'leaveUsed':        return s.leaveBalance?.totalUsed ?? 0;
    case 'leaveBalance':     return s.leaveBalance?.balance ?? 0;
    case 'manager':          return s.managerName || '';
    case 'emergencyContact': return s.emergencyContact || '';
    case 'emergencyPhone':   return s.emergencyPhone || '';
    case 'emergencyRelation':return s.emergencyRelation || '';
    case 'cccdNumber':       return s.cccdNumber || '';
    case 'cccdIssueDate':    return s.cccdIssueDate || '';
    case 'cccdIssuePlace':   return s.cccdIssuePlace || '';
    default:                 return '';
  }
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
function StaffListContent() {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('session') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<ListResp>({ ok: false });

  // Filter state
  const [viewMode, setViewMode] = useState<'all' | 'active' | 'inactive'>('active'); // mặc định: chỉ active
  const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [colFilters, setColFilters] = useState<Partial<Record<ColumnKey, string>>>({});

  // Modal lịch làm việc
  const [scheduleStaff, setScheduleStaff] = useState<Staff | null>(null);

  // Local update — patch list khi 1 cell save xong
  const updateLocalStaff = useCallback((discordId: string, updates: Partial<Staff>) => {
    setData(prev => ({
      ...prev,
      list: (prev.list || []).map(s =>
        s.discordId === discordId ? { ...s, ...updates } : s
      ),
    }));
  }, []);

  // Load list
  useEffect(() => {
    if (!sessionToken) { setLoading(false); return; }
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

  // ── Save 1 field — generic ───────────────────────────────
  const handleSaveFieldRaw = useCallback(async (
    staff: Staff,
    field: string,
    rawValue: unknown,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!staff.discordId) return { ok: false, error: 'Thiếu discordId' };
    try {
      const editorRole = 'HR';
      const editorName = 'HR Web';
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({
          target_id: staff.discordId,
          [field]: rawValue,
          edited_by: {
            discord_id: staff.discordId,
            name: editorName,
            role: editorRole,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || `HTTP ${res.status}` };
      }
      // Patch local: chỉ field này
      updateLocalStaff(staff.discordId, { [field]: rawValue } as Partial<Staff>);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Lỗi mạng' };
    }
  }, [sessionToken, updateLocalStaff]);

  // Wrapper cho InlineCell (chỉ string | boolean)
  const handleSaveField = useCallback((
    staff: Staff, field: string, value: string | boolean,
  ) => handleSaveFieldRaw(staff, field, value), [handleSaveFieldRaw]);

  // ── Save lịch làm việc (workSchedule) ────────────────────
  const handleSaveSchedule = useCallback(async (ws: WorkSchedule): Promise<{ ok: boolean; error?: string }> => {
    if (!scheduleStaff) return { ok: false, error: 'Thiếu staff' };
    // Gửi NGUYÊN object — backend đã accept object
    return await handleSaveFieldRaw(scheduleStaff, 'workSchedule', ws);
  }, [scheduleStaff, handleSaveFieldRaw]);

  // ── Filter + Sort ───────────────────────────────────────
  const filtered = useMemo(() => {
    let list = data.list || [];

    // Lọc theo viewMode (mặc định: chỉ active)
    if (viewMode === 'active')   list = list.filter(s => s.active !== false);
    if (viewMode === 'inactive') list = list.filter(s => s.active === false);
    // viewMode === 'all' → không filter

    for (const [colKey, filterVal] of Object.entries(colFilters)) {
      if (!filterVal || !filterVal.trim()) continue;
      const q = filterVal.toLowerCase().trim();
      const key = colKey as ColumnKey;
      list = list.filter(s => {
        if (key === 'dateOfBirth' || key === 'joinedAt' || key === 'probationStartDate' || key === 'probationEndDate' || key === 'contractSignDate') {
          const raw = key === 'joinedAt' ? (s.joinedAt || '').slice(0, 10) : (s[key] || '').toString();
          const iso = raw.toLowerCase();
          const vn = fmtVN(raw).toLowerCase();
          return iso.includes(q) || vn.includes(q);
        }
        if (key === 'active') {
          const status = s.active === false ? 'inactive' : 'active';
          return status.includes(q);
        }
        if (key === 'workingDur') {
          return (s.workingDuration || '').toLowerCase().includes(q);
        }
        return String(getCellValue(s, key) || '').toLowerCase().includes(q);
      });
    }

    if (sortKey && sortDir) {
      list = [...list].sort((a, b) => {
        const va = getCellValue(a, sortKey);
        const vb = getCellValue(b, sortKey);
        let cmp = 0;
        if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
        else cmp = String(va).localeCompare(String(vb), 'vi', { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  }, [data, viewMode, colFilters, sortKey, sortDir]);

  function toggleSort(key: ColumnKey) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir(null); }
  }

  function setColFilter(key: ColumnKey, value: string) {
    setColFilters(prev => ({ ...prev, [key]: value }));
  }

  // Open popup /staff-edit
  function openEdit(s: Staff) {
    if (!s.discordId) return;
    const params = new URLSearchParams({
      session: sessionToken,
      target_id: s.discordId,
      editor_role: 'HR',
    });
    window.open(`/staff-edit?${params.toString()}`, '_blank');
  }

  // ── Early returns ─────────────────────────────────────
  if (!sessionToken) {
    return <FullScreenCard icon="🔒" title="Cần link từ Discord" desc={'Vui lòng dùng link bot gửi qua DM (lệnh /staff list).\nLink có hiệu lực 30 phút.'} />;
  }
  if (loading) return <FullScreenCard icon="⏳" title="Đang tải danh sách NV..." desc="" />;
  if (error)   return <FullScreenCard icon="❌" title="Lỗi tải dữ liệu" desc={error} />;

  // ── Render row ────────────────────────────────────────
  function renderCell(col: ColumnDef, s: Staff, leftOffset: number) {
    const isLastSticky = col.key === LAST_STICKY_KEY;
    const baseStyle: React.CSSProperties = {
      width: col.width, minWidth: col.width, maxWidth: col.width,
      // Cột sticky cuối → border phải đậm để phân ranh giới đứng-yên/trượt-ngang
      borderRight: isLastSticky ? STICKY_DIVIDER_BORDER : '1px solid #f3f4f6',
      borderBottom: '1px solid #f3f4f6', // separator hàng (vì <tr> ko render border khi border-collapse:separate)
      verticalAlign: 'middle',
      ...(col.sticky ? {
        position: 'sticky' as const,
        left: leftOffset,
        background: s.active === false ? '#fafafa' : '#fff',
        zIndex: 2,
      } : {}),
    };

    // Cột TÊN: click → popup /staff-edit (chỉ chữ, KHÔNG avatar 2 chữ)
    if (col.key === 'name') {
      return (
        <td key={col.key} style={baseStyle}
          onClick={(e) => { e.stopPropagation(); openEdit(s); }}
        >
          <div style={{ padding: '6px 10px', cursor: 'pointer', fontWeight: 600 }}>
            <span style={{ color: '#1e40af', textDecoration: 'underline' }}>{s.name || s.username}</span>
          </div>
        </td>
      );
    }

    // Cột DEPT: dropdown
    if (col.key === 'dept') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell
            value={s.dept || ''}
            type="dropdown"
            field="dept"
            options={DEPT_OPTIONS}
            display={(v) => v ? `${DEPT_EMOJI[v as string] || '📁'} ${v}` : '—'}
            onSave={(f, v) => handleSaveField(s, f, v)}
          />
        </td>
      );
    }

    // Cột Position: text
    if (col.key === 'position') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell value={s.position} type="text" field="position" onSave={(f, v) => handleSaveField(s, f, v)} />
        </td>
      );
    }

    // Cột contractType: dropdown
    if (col.key === 'contractType') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell
            value={s.contractType || ''}
            type="dropdown"
            field="contractType"
            options={CONTRACT_OPTIONS}
            display={(v) => v ? (v === 'fulltime' ? 'Fulltime' : v === 'parttime' ? 'Parttime' : String(v)) : '—'}
            onSave={(f, v) => handleSaveField(s, f, v)}
          />
        </td>
      );
    }

    // Cột Active: toggle
    if (col.key === 'active') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell value={s.active !== false} type="toggle" field="active" onSave={(f, v) => handleSaveField(s, f, v)} />
        </td>
      );
    }

    // Phone
    if (col.key === 'phone') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell value={s.phone} type="phone" field="phone" placeholder="0912xxx" onSave={(f, v) => handleSaveField(s, f, v)} />
        </td>
      );
    }

    // Email
    if (col.key === 'email') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell value={s.email} type="email" field="email" placeholder="abc@gmail.com" onSave={(f, v) => handleSaveField(s, f, v)} />
        </td>
      );
    }

    // Dates
    if (col.key === 'dateOfBirth') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell
            value={s.dateOfBirth}
            type="date"
            field="dateOfBirth"
            display={(v) => v ? fmtVN(v as string) : '—'}
            onSave={(f, v) => handleSaveField(s, f, v)}
          />
        </td>
      );
    }
    // 📅 Ngày vào làm (joinedAt) — auto-stamp khi /staff add, HR có thể sửa
    // Hiển thị dạng YYYY-MM-DD (slice bỏ phần timestamp nếu có)
    if (col.key === 'joinedAt') {
      const dateOnly = s.joinedAt ? s.joinedAt.slice(0, 10) : '';
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell
            value={dateOnly}
            type="date"
            field="joinedAt"
            display={(v) => {
              if (v) return fmtVN(v as string);
              // Fallback cho NV cũ chưa có joinedAt: ưu tiên probationStartDate → contractSignDate
              const fb = s.probationStartDate || s.contractSignDate;
              if (fb) return (
                <span title="NV cũ chưa có ngày vào làm — đang lấy theo ngày thử việc/ký HĐ. Click để sửa.">
                  {fmtVN(fb)} <span style={{ color: '#9ca3af', fontSize: 10 }}>(suy ra)</span>
                </span>
              );
              return '—';
            }}
            onSave={(f, v) => handleSaveField(s, f, v)}
          />
        </td>
      );
    }
    // 📝 Ngày bắt đầu thử việc (probationStartDate)
    if (col.key === 'probationStartDate') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell
            value={s.probationStartDate}
            type="date"
            field="probationStartDate"
            display={(v) => v ? fmtVN(v as string) : '—'}
            onSave={(f, v) => handleSaveField(s, f, v)}
          />
        </td>
      );
    }
    // 📅 Hết thử việc (probationEndDate)
    if (col.key === 'probationEndDate') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell
            value={s.probationEndDate}
            type="date"
            field="probationEndDate"
            display={(v) => v ? fmtVN(v as string) : '—'}
            onSave={(f, v) => handleSaveField(s, f, v)}
          />
        </td>
      );
    }
    // ✍️ Ngày ký HĐ chính thức (contractSignDate) — KHÔNG fallback, HR phải điền tay
    if (col.key === 'contractSignDate') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell
            value={s.contractSignDate}
            type="date"
            field="contractSignDate"
            display={(v) => v ? fmtVN(v as string) : '—'}
            onSave={(f, v) => handleSaveField(s, f, v)}
          />
        </td>
      );
    }

    // Numerology (text vì có dấu phẩy)
    if (col.key === 'numerology') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell
            value={s.numerology}
            type="text"
            field="numerology"
            display={(v) => v ? <span style={badgeNumero}>{String(v)}</span> : '—'}
            onSave={(f, v) => handleSaveField(s, f, v)}
          />
        </td>
      );
    }

    // Hometown
    if (col.key === 'hometown') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell value={s.hometown} type="text" field="hometown" onSave={(f, v) => handleSaveField(s, f, v)} />
        </td>
      );
    }

    // Bank
    if (col.key === 'bankNumber') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell value={s.bankNumber} type="text" field="bankNumber" onSave={(f, v) => handleSaveField(s, f, v)} />
        </td>
      );
    }
    if (col.key === 'bankName') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell
            value={s.bankName || ''}
            type="dropdown"
            field="bankName"
            options={BANK_OPTIONS}
            onSave={(f, v) => handleSaveField(s, f, v)}
          />
        </td>
      );
    }

    // Working duration: read-only
    if (col.key === 'workingDur') {
      return <td key={col.key} style={baseStyle}><div style={readonlyText}>{s.workingDuration || '—'}</div></td>;
    }

    // workSchedule: click → popup
    if (col.key === 'workSchedule') {
      const isParttime = s.contractType === 'parttime';
      const summary = summarizeWorkSchedule(s.workSchedule);
      return (
        <td key={col.key} style={baseStyle}>
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!isParttime) return;
              setScheduleStaff(s);
            }}
            style={{
              padding: '6px 10px',
              cursor: isParttime ? 'pointer' : 'default',
              fontSize: 12,
              color: isParttime
                ? (summary === 'Chưa có lịch' ? '#d97706' : '#059669')
                : '#6b7280',
            }}
            title={isParttime ? 'Click để sửa lịch' : 'Fulltime — lịch mặc định T2-T7 sáng'}
          >
            {isParttime ? (
              summary === 'Chưa có lịch' ? '⚠️ Chưa có lịch' : `🟢 ${summary}`
            ) : '🟢 T2-T7 sáng'}
          </div>
        </td>
      );
    }

    // Phép — read-only with tooltip
    if (col.key === 'leaveQuota') {
      const q = s.leaveBalance?.monthlyQuota ?? (s.contractType === 'fulltime' ? 1 : 0);
      return (
        <td key={col.key} style={baseStyle}>
          <div
            style={{ ...readonlyText, textAlign: 'center' }}
            title="Quota tháng theo loại HĐ. Fulltime=1 ngày/tháng, Parttime=0"
          >
            {q}
          </div>
        </td>
      );
    }
    if (col.key === 'leaveUsed') {
      const used = s.leaveBalance?.totalUsed ?? 0;
      return (
        <td key={col.key} style={baseStyle}>
          <div
            style={{ ...readonlyText, textAlign: 'center' }}
            title="Tổng ngày phép đã được duyệt từ ngày bắt đầu làm"
          >
            {used}
          </div>
        </td>
      );
    }
    if (col.key === 'leaveBalance') {
      const lb = s.leaveBalance;
      const balance = lb?.balance ?? 0;
      const color = balance > 0 ? '#16a34a' : balance === 0 ? '#d97706' : '#dc2626';
      const bg = balance > 0 ? '#dcfce7' : balance === 0 ? '#fef3c7' : '#fee2e2';
      const tooltip = lb
        ? (balance < 0
          ? `Tích lũy ${lb.monthlyQuota * 0 + (lb.totalUsed + balance)} − Đã nghỉ ${lb.totalUsed} = ${balance}\nNỢ ${Math.abs(balance)} ngày — có thể trừ vào lương`
          : `Tích lũy ${lb.totalUsed + balance} − Đã nghỉ ${lb.totalUsed} = ${balance} ngày`)
        : 'Chưa có dữ liệu phép';
      return (
        <td key={col.key} style={baseStyle}>
          <div
            style={{
              padding: '4px 10px',
              textAlign: 'center',
              background: bg,
              color,
              fontWeight: 600,
              borderRadius: 12,
              margin: '4px 6px',
              fontSize: 12,
            }}
            title={tooltip}
          >
            {balance > 0 ? `+${balance}` : balance}
            {balance < 0 ? ' NỢ' : ''}
          </div>
        </td>
      );
    }

    // Manager — read-only
    if (col.key === 'manager') {
      return <td key={col.key} style={baseStyle}><div style={readonlyText}>{s.managerName || '—'}</div></td>;
    }

    // [Phase B v5] NHÓM A — Khẩn cấp
    if (col.key === 'emergencyContact') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell value={s.emergencyContact} type="text" field="emergencyContact"
            placeholder="Vũ Ngọc Mẹ"
            onSave={(f, v) => handleSaveField(s, f, v)} />
        </td>
      );
    }
    if (col.key === 'emergencyPhone') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell value={s.emergencyPhone} type="phone" field="emergencyPhone"
            placeholder="0987xxx"
            onSave={(f, v) => handleSaveField(s, f, v)} />
        </td>
      );
    }
    if (col.key === 'emergencyRelation') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell value={s.emergencyRelation || ''} type="dropdown" field="emergencyRelation"
            options={RELATION_OPTIONS}
            onSave={(f, v) => handleSaveField(s, f, v)} />
        </td>
      );
    }

    // [Phase B v5] NHÓM B — Pháp lý CCCD
    if (col.key === 'cccdNumber') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell value={s.cccdNumber} type="text" field="cccdNumber"
            placeholder="001234567890"
            validate={(v) => {
              if (!v) return null;
              if (!/^\d{9}$|^\d{12}$/.test(v)) return 'Số CCCD phải 9 hoặc 12 chữ số';
              return null;
            }}
            onSave={(f, v) => handleSaveField(s, f, v)} />
        </td>
      );
    }
    if (col.key === 'cccdIssueDate') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell value={s.cccdIssueDate} type="date" field="cccdIssueDate"
            display={(v) => v ? fmtVN(v as string) : '—'}
            onSave={(f, v) => handleSaveField(s, f, v)} />
        </td>
      );
    }
    if (col.key === 'cccdIssuePlace') {
      return (
        <td key={col.key} style={baseStyle}>
          <InlineCell value={s.cccdIssuePlace} type="text" field="cccdIssuePlace"
            placeholder="Cục CSQLHC về TTXH"
            onSave={(f, v) => handleSaveField(s, f, v)} />
        </td>
      );
    }

    return <td key={col.key} style={baseStyle}><div style={readonlyText}>—</div></td>;
  }

  // Tính left offset cho sticky cells
  const stickyOffsets: Record<string, number> = {};
  let acc = 40; // STT width
  for (const col of COLUMNS) {
    if (col.sticky) {
      stickyOffsets[col.key] = acc;
      acc += col.width;
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '16px 8px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f, #3b5a85)', color: '#fff',
          padding: '20px 24px', borderRadius: 12, marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
              👥 Danh sách nhân viên IruKa
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setViewMode('all')} style={pillStyle(viewMode === 'all')}>
                📊 Tổng: <b>{data.total ?? 0}</b>
              </button>
              <button onClick={() => setViewMode('active')} style={pillStyle(viewMode === 'active')}>
                ✅ Active: <b>{data.active ?? 0}</b>
              </button>
              <button onClick={() => setViewMode('inactive')} style={pillStyle(viewMode === 'inactive')}>
                🔴 Inactive: <b>{data.inactive ?? 0}</b>
              </button>
            </div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, textAlign: 'right' }}>
            💡 Click TÊN → popup chi tiết<br/>
            Click ô khác → sửa nhanh (Enter/blur lưu)
          </div>
        </div>

        {/* Hint — gộp tất cả hướng dẫn vào 1 dòng */}
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, lineHeight: 1.6 }}>
          💡 Click tiêu đề cột để <b>sắp xếp</b>. Gõ ô lọc dưới mỗi cột để <b>lọc riêng</b>. Hover các cột phép để xem công thức.
          {' '}<b>Click TÊN nhân viên</b> để mở form chi tiết (sửa CCCD, người thân...). <b>Click ô khác</b> để sửa nhanh — Enter hoặc click ra ngoài để lưu.
        </div>

        {/* Table:
            - overflow-x: auto → horizontal scroll trong khung; sticky cột ngang work.
            - overflow-y: clip → KHÔNG tạo vertical scroll container → thead có thể stick vào page
              khi cuộn dọc (top: 0 sẽ tham chiếu page viewport, không phải wrapper).
              Khác 'visible' (có CSS quirk compute-to-auto), 'clip' chặn nội dung mà không tạo scroll context.
            - Không set maxHeight → wrapper height = table height → page scroll lo phần dọc. */}
        <div style={{
          background: '#fff', borderRadius: 10,
          overflowX: 'auto', overflowY: 'clip',
          border: '1px solid #e5e7eb',
        }}>
          {/* border-collapse: separate là điều kiện CẦN cho position:sticky trên <td>.
              Nếu để 'collapse', Chrome/Safari cũ không tôn trọng sticky → cột không cố định được. */}
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ ...thStyle, width: 40, position: 'sticky', left: 0, zIndex: 11, background: '#f9fafb', textAlign: 'center' }}>STT</th>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    style={{
                      ...thStyle,
                      width: col.width, minWidth: col.width, maxWidth: col.width,
                      cursor: 'pointer', userSelect: 'none',
                      // Border phải đậm cho cột sticky cuối — đồng bộ với baseStyle data row
                      ...(col.key === LAST_STICKY_KEY ? { borderRight: STICKY_DIVIDER_BORDER } : {}),
                      ...(col.sticky ? {
                        position: 'sticky' as const,
                        left: stickyOffsets[col.key],
                        background: '#f9fafb',
                        zIndex: 11,
                      } : {}),
                    }}
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
              <tr style={{ background: '#fafbfc' }}>
                <th style={{ ...thStyle, padding: '4px 6px', position: 'sticky', left: 0, zIndex: 11, background: '#fafbfc' }}></th>
                {COLUMNS.map(col => (
                  <th
                    key={`f_${col.key}`}
                    style={{
                      ...thStyle, padding: '4px 6px', fontWeight: 400,
                      width: col.width,
                      // Border phải đậm cho cột sticky cuối — đồng bộ với header sort row + data row
                      ...(col.key === LAST_STICKY_KEY ? { borderRight: STICKY_DIVIDER_BORDER } : {}),
                      ...(col.sticky ? {
                        position: 'sticky' as const,
                        left: stickyOffsets[col.key],
                        background: '#fafbfc',
                        zIndex: 11,
                      } : {}),
                    }}
                  >
                    {col.filterable ? (
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
                    ) : <span style={{ fontSize: 10, color: '#9ca3af' }}>—</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>
                    _Không có nhân viên nào khớp filter_
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => (
                  <tr
                    key={s.username}
                    style={{
                      // border-collapse:separate ko render border trên <tr>; chuyển sang borderBottom của <td> bên dưới
                      opacity: s.active === false ? 0.6 : 1,
                      background: s.active === false ? '#fafafa' : '#fff',
                    }}
                  >
                    <td style={{
                      ...tdStyle, width: 40,
                      position: 'sticky' as const, left: 0, zIndex: 2,
                      background: s.active === false ? '#fafafa' : '#fff',
                      textAlign: 'center',
                      padding: '10px 6px',
                      fontWeight: 600,
                    }}>
                      {i + 1}
                    </td>
                    {COLUMNS.map(col => renderCell(col, s, stickyOffsets[col.key] ?? 0))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal lịch làm việc — mount/unmount theo scheduleStaff */}
      {scheduleStaff && (
        <WorkScheduleModal
          key={scheduleStaff.discordId || scheduleStaff.username}
          onClose={() => setScheduleStaff(null)}
          onSave={handleSaveSchedule}
          staffName={scheduleStaff.name || scheduleStaff.username || ''}
          initial={scheduleStaff.workSchedule}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
// Pill button cho filter Tổng/Active/Inactive trong header
function pillStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? '#fff' : 'rgba(255,255,255,0.15)',
    color: active ? '#1e3a5f' : '#fff',
    border: active ? '1.5px solid #fff' : '1.5px solid rgba(255,255,255,0.25)',
    padding: '6px 14px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
    boxShadow: active ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
  };
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#374151',
  textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e5e7eb',
  whiteSpace: 'nowrap', textAlign: 'left',
};
const tdStyle: React.CSSProperties = {
  padding: 0, color: '#111827', whiteSpace: 'nowrap',
  borderRight: '1px solid #f3f4f6',
  borderBottom: '1px solid #f3f4f6', // thay borderTop ở <tr> (separate ko render row-border)
};
const readonlyText: React.CSSProperties = {
  padding: '6px 10px', color: '#6b7280', fontSize: 13,
};
const badgeNumero: React.CSSProperties = {
  background: '#fef3c7', color: '#92400e',
  padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
};

export default function Page() {
  return (
    <Suspense fallback={<FullScreenCard icon="⏳" title="Đang tải..." desc="" />}>
      <StaffListContent />
    </Suspense>
  );
}
