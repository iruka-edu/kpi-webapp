/**
 * staff-edit/page.tsx — Form HR điền/cập nhật profile NV đầy đủ
 *
 * URL: /staff-edit?session=...&target_id=<discordId>&editor_role=HR&name=...
 * Pattern clone từ holiday-propose: form section, validate, submit JSON, success card.
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────
type StaffData = {
  username?: string;
  name?: string;
  dept?: string;
  position?: string | null;
  dateOfBirth?: string | null;       // YYYY-MM-DD
  phone?: string | null;
  email?: string | null;
  hometown?: string | null;
  bankNumber?: string | null;
  bankName?: string | null;
  joinedAt?: string | null;
  probationStartDate?: string | null;
  probationEndDate?: string | null;
  contractSignDate?: string | null;
  numerology?: number | null;
  workingDuration?: string;
  avatarUrl?: string | null;
  managerName?: string | null;
  contractType?: string | null;
};

// ── Helpers ───────────────────────────────────────────────────

/** YYYY-MM-DD → "dd-mm-yyyy" (display) */
function fmtVN(iso?: string | null): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

// ── FullScreen card cho success/error ─────────────────────────
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
function StaffEditContent() {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('session') || '';
  const targetId     = searchParams.get('target_id') || '';
  const editorRole   = searchParams.get('editor_role') || 'HR';
  const editorIdParam   = searchParams.get('editor_id') || '';
  const editorNameParam = searchParams.get('editor_name') || 'HR';

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [data, setData] = useState<StaffData>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Load staff data ──
  useEffect(() => {
    if (!sessionToken || !targetId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/staff?target_id=${encodeURIComponent(targetId)}`, {
          headers: { 'x-session-token': sessionToken },
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setLoadError(json.error || 'Không tải được thông tin NV');
        } else {
          setData(json.staff || {});
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Lỗi mạng');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionToken, targetId]);

  // ── Update field helper ──
  function setField<K extends keyof StaffData>(key: K, value: StaffData[K]) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  // ── Submit ──
  async function handleSubmit() {
    setSubmitError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      const payload = {
        target_id: targetId,
        position: data.position || null,
        dateOfBirth: data.dateOfBirth || null,
        phone: data.phone || null,
        email: data.email || null,
        hometown: data.hometown || null,
        bankNumber: data.bankNumber || null,
        bankName: data.bankName || null,
        probationStartDate: data.probationStartDate || null,
        probationEndDate: data.probationEndDate || null,
        contractSignDate: data.contractSignDate || null,
        edited_by: {
          discord_id: editorIdParam || targetId,
          name: editorNameParam,
          role: editorRole,
        },
      };
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Không lưu được');
      }
      setSuccessMsg(`Đã lưu thông tin của ${data.name}. ${json.fields_updated?.length || 0} field cập nhật.`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Lỗi không rõ');
    } finally {
      setSubmitting(false);
    }
  }

  // ── UI states ──
  if (!sessionToken || !targetId) {
    return (
      <FullScreenCard
        icon="🔒"
        title="Cần link từ Discord"
        desc={'Vui lòng dùng link bot gửi qua DM (lệnh /staff hoặc khi NV mới join).\nLink có hiệu lực 30 phút.'}
      />
    );
  }

  if (loading) {
    return <FullScreenCard icon="⏳" title="Đang tải thông tin NV..." desc="" />;
  }

  if (loadError) {
    return <FullScreenCard icon="❌" title="Lỗi tải dữ liệu" desc={loadError} />;
  }

  if (successMsg) {
    return (
      <FullScreenCard
        icon="✅"
        title="Đã lưu thành công!"
        desc={successMsg + '\n\nBạn có thể đóng tab này và quay lại Discord.'}
      />
    );
  }

  // ── Form ──
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '24px 12px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f, #3b5a85)', color: '#fff',
          padding: '20px 24px', borderRadius: 12, marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          {data.avatarUrl && (
            <img src={data.avatarUrl} alt="" style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)' }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
              👤 {data.name || '(Chưa có tên)'}
            </div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              {data.dept || '?'} · {data.position || data.contractType || '?'}
              {data.workingDuration && ` · Đã làm ${data.workingDuration}`}
            </div>
          </div>
        </div>

        {/* Section 1: CƠ BẢN */}
        <Section title="📋 Cơ bản">
          <Row label="Họ và tên (đã có từ Discord)">
            <input type="text" value={data.name || ''} readOnly style={inputStyle(false, true)} />
          </Row>
          <Row label="Phòng ban (đã chọn từ /staff add)">
            <input type="text" value={data.dept || ''} readOnly style={inputStyle(false, true)} />
          </Row>
          <Row label="Vị trí / Chức vụ cụ thể">
            <input type="text" value={data.position || ''} onChange={(e) => setField('position', e.target.value)}
              placeholder="VD: Frontend Dev / UI Designer / Tester" style={inputStyle(false)} />
          </Row>
          <Row label="Ngày sinh" required>
            <input type="date" value={data.dateOfBirth || ''} onChange={(e) => setField('dateOfBirth', e.target.value)}
              style={inputStyle(false)} />
            {data.dateOfBirth && (
              <div style={hintStyle}>📅 {fmtVN(data.dateOfBirth)}{data.numerology != null && ` · 🔢 Thần số học: ${data.numerology}`}</div>
            )}
          </Row>
        </Section>

        {/* Section 2: LIÊN LẠC */}
        <Section title="📞 Liên lạc">
          <Row label="Số điện thoại">
            <input type="tel" value={data.phone || ''} onChange={(e) => setField('phone', e.target.value)}
              placeholder="VD: 0973951864" style={inputStyle(false)} />
          </Row>
          <Row label="Email">
            <input type="email" value={data.email || ''} onChange={(e) => setField('email', e.target.value)}
              placeholder="VD: nv@gmail.com" style={inputStyle(false)} />
          </Row>
          <Row label="Quê quán">
            <input type="text" value={data.hometown || ''} onChange={(e) => setField('hometown', e.target.value)}
              placeholder="VD: Nam Định" style={inputStyle(false)} />
          </Row>
        </Section>

        {/* Section 3: TÀI CHÍNH */}
        <Section title="🏦 Tài chính">
          <Row label="Số tài khoản">
            <input type="text" value={data.bankNumber || ''} onChange={(e) => setField('bankNumber', e.target.value)}
              placeholder="VD: 19031515771011" style={inputStyle(false)} />
          </Row>
          <Row label="Tên ngân hàng">
            <input type="text" value={data.bankName || ''} onChange={(e) => setField('bankName', e.target.value)}
              placeholder="VD: Techcombank" style={inputStyle(false)} />
          </Row>
        </Section>

        {/* Section 4: HỢP ĐỒNG */}
        <Section title="📑 Hợp đồng">
          <Row label="Ngày bắt đầu làm việc (Discord auto)" >
            <input type="date" value={data.joinedAt?.slice(0, 10) || ''} readOnly style={inputStyle(false, true)} />
            {data.joinedAt && <div style={hintStyle}>📅 {fmtVN(data.joinedAt)} · ⏱️ {data.workingDuration || ''}</div>}
          </Row>
          <Row label="Ngày bắt đầu thử việc">
            <input type="date" value={data.probationStartDate || ''} onChange={(e) => setField('probationStartDate', e.target.value)}
              style={inputStyle(false)} />
            {data.probationStartDate && <div style={hintStyle}>📅 {fmtVN(data.probationStartDate)}</div>}
          </Row>
          <Row label="Ngày hết thử việc">
            <input type="date" value={data.probationEndDate || ''} onChange={(e) => setField('probationEndDate', e.target.value)}
              style={inputStyle(false)} />
            {data.probationEndDate && <div style={hintStyle}>📅 {fmtVN(data.probationEndDate)}</div>}
          </Row>
          <Row label="Ngày ký HĐ chính thức">
            <input type="date" value={data.contractSignDate || ''} onChange={(e) => setField('contractSignDate', e.target.value)}
              style={inputStyle(false)} />
            {data.contractSignDate && <div style={hintStyle}>📅 {fmtVN(data.contractSignDate)}</div>}
          </Row>
        </Section>

        {/* Submit error */}
        {submitError && (
          <div style={{
            background: '#fee2e2', color: '#991b1b', padding: '10px 14px',
            borderRadius: 8, fontSize: 13, marginBottom: 14, border: '1.5px solid #ef4444',
          }}>
            ❌ {submitError}
          </div>
        )}

        {/* Submit button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14,
              cursor: submitting ? 'not-allowed' : 'pointer', border: 'none', fontFamily: 'inherit',
              background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #1e3a5f, #3b5a85)',
              color: '#fff', boxShadow: submitting ? 'none' : '0 2px 8px rgba(30,58,95,0.3)',
            }}
          >
            {submitting ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
          </button>
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: 24, padding: 14, background: '#eff6ff',
          border: '1px solid #93c5fd', borderRadius: 8,
          fontSize: 12, color: '#1e40af', lineHeight: 1.6,
        }}>
          💡 <b>Lưu ý:</b> Họ tên + Phòng ban điều chỉnh qua lệnh <code>/staff update</code> trong Discord.
          Form này chỉ cập nhật thông tin chi tiết (liên lạc, ngân hàng, hợp đồng).
          Thần số học sẽ tự động tính khi anh điền ngày sinh.
        </div>
      </div>
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────────────
function inputStyle(error: boolean, readOnly = false): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    border: `1.5px solid ${error ? '#ef4444' : '#d1d5db'}`,
    borderRadius: 8,
    fontSize: 14,
    color: '#111827',
    fontFamily: 'inherit',
    background: readOnly ? '#f3f4f6' : '#fff',
    outline: 'none',
    cursor: readOnly ? 'not-allowed' : 'text',
  };
}

const hintStyle: React.CSSProperties = {
  fontSize: 12, color: '#6b7280', marginTop: 4, fontStyle: 'italic',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '16px 18px',
      marginBottom: 14, border: '1px solid #e5e7eb',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e3a5f', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f3f4f6' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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
    </div>
  );
}

// ── Page export with Suspense (Next.js 16) ────────────────────
export default function Page() {
  return (
    <Suspense fallback={<FullScreenCard icon="⏳" title="Đang tải..." desc="" />}>
      <StaffEditContent />
    </Suspense>
  );
}
