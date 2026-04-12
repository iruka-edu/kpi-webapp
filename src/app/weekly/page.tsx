/**
 * page.tsx — Form Báo Cáo KPI Nhân Viên
 * ----------------------------------------
 * Vai trò: Trang chính để NV điền và nộp báo cáo KPI hàng tuần.
 *
 * Các luồng được xử lý:
 *  F1 - Lần đầu dùng (chưa có dữ liệu tuần trước) → màn hình chào
 *  F2 - Có dữ liệu tuần cũ → load vào Phân vùng 1
 *  F3 - Nộp lại lần 2 → confirm modal, ghi đè
 *  F4 - Có draft localStorage → hỏi khôi phục
 *  F5 - Token hết hạn (403) → màn hình lỗi riêng
 *  F6 - Đang load → Skeleton
 *  F7 - Lỗi API (GAS/mạng) → màn hình lỗi hệ thống
 *  F8 - Validate trống → inline highlight
 *  F9 - Nộp thành công → màn hình success
 *  F10 - Mạng đứt khi nộp → Toast đỏ giữ nguyên form
 */

"use client";

import React, { useEffect, Suspense, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import HeaderInfo from '@/components/HeaderInfo';
import ReportGrid from '@/components/ReportGrid';
import { useKpiStore } from '@/store/kpiStore';
import { useDraftSave, restoreDraft, clearDraft } from '@/hooks/useDraftSave';

// ── Kiểu trạng thái màn hình ────────────────────────────────────
type ScreenState =
  | 'loading'       // Đang tải dữ liệu từ API
  | 'form'          // Form bình thường (có hoặc không có data tuần cũ)
  | 'first_time'    // Lần đầu chưa có data
  | 'token_expired' // Link hết hạn > 72h
  | 'api_error'     // GAS/mạng lỗi
  | 'success';      // Nộp xong thành công

// ── Toast nội bộ đơn giản (tránh cài thêm thư viện) ─────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const colors = {
    success: 'bg-green-600 text-white',
    error:   'bg-red-600 text-white',
    info:    'bg-blue-600 text-white',
  };
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl font-medium animate-slide-in ${colors[type]}`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-white/80 hover:text-white font-bold text-lg leading-none">×</button>
    </div>
  );
}

// ── Modal confirm đẹp thay window.confirm() ──────────────────────
function ConfirmModal({ title, message, onOk, onCancel, okLabel = 'Xác nhận', cancelLabel = 'Huỷ' }: {
  title: string; message: string;
  onOk: () => void; onCancel: () => void;
  okLabel?: string; cancelLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">{title}</h3>
        <p className="text-gray-600 text-sm whitespace-pre-line mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium transition">{cancelLabel}</button>
          <button onClick={onOk} className="px-5 py-2 rounded-lg bg-[#1e3a5f] text-white font-bold hover:bg-blue-800 transition">{okLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton loader cho trạng thái loading ───────────────────────
function SkeletonLoader({ name }: { name: string }) {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-32 w-80 bg-gray-100 rounded-lg animate-pulse mb-6" />
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" style={{opacity: 1 - i * 0.15}} />)}
        </div>
        <p className="text-center text-sm text-gray-400 mt-4 animate-pulse">
          {name !== 'Chưa rõ' ? `Đang tải dữ liệu của ${name}...` : 'Đang tải...'}
        </p>
      </div>
    </div>
  );
}

// ── Màn hình lỗi Token hết hạn (F5) ─────────────────────────────
function TokenExpiredScreen() {
  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center mx-4">
        <div className="text-6xl mb-4">🔗</div>
        <h2 className="text-2xl font-bold text-[#1e3a5f] mb-3">Link đã hết hạn</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Vì lý do bảo mật, link báo cáo chỉ có hiệu lực trong <strong>72 giờ</strong>.<br />
          Link của bạn đã hết thời gian sử dụng.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm font-medium">
          💬 Vui lòng nhắn Bot Discord: <strong>/weekly</strong><br />
          để nhận link báo cáo mới nhé!
        </div>
      </div>
    </div>
  );
}

// ── Màn hình lỗi API/hệ thống (F7) ──────────────────────────────
function ApiErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center mx-4">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-red-600 mb-3">Hệ thống gặp sự cố</h2>
        <p className="text-gray-500 text-sm mb-4">Không thể tải dữ liệu báo cáo. Vui lòng thử lại hoặc báo IT.</p>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-600 text-xs font-mono">
          {message}
        </div>
        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-[#1e3a5f] text-white rounded-lg font-bold hover:bg-blue-800 transition">
          🔄 Thử lại
        </button>
      </div>
    </div>
  );
}


// ── Màn hình SUCCESS sau khi nộp (F9) ────────────────────────────
function SuccessScreen({ name, reportWeek, totalPercent }: { name: string; reportWeek: string; totalPercent: number }) {
  // Tách số tuần
  const weekNum = reportWeek.match(/\d+/)?.[0] || '';

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full text-center mx-4">
        <div className="text-7xl mb-4 animate-bounce">✅</div>
        <h2 className="text-3xl font-bold text-green-700 mb-2">Nộp báo cáo thành công!</h2>
        <p className="text-gray-500 text-sm mb-6">Dữ liệu đã được ghi vào hệ thống nhân sự IruKa.</p>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <p className="text-gray-600 text-sm mb-1">Người nộp: <strong className="text-[#1e3a5f]">{name}</strong></p>
          <p className="text-gray-600 text-sm mb-4">Mục tiêu: <strong className="text-[#1e3a5f]">{reportWeek}</strong></p>
          
          <div className="flex flex-col items-center justify-center py-2">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Kết quả thực đạt</div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-gray-500 uppercase">Tuần {weekNum} Đạt</span>
              <span className="text-5xl font-black text-green-700">{totalPercent.toFixed(1)}%</span>
              <span className="text-lg font-black text-green-700 ml-1">KH</span>
            </div>
          </div>
        </div>

        <p className="text-blue-600 text-sm font-medium bg-blue-50 rounded-lg px-4 py-3">
          📬 Sếp sẽ kiểm tra và duyệt trong 24 giờ.<br />
          Bot Discord sẽ thông báo kết quả cho bạn khi xong!
        </p>
      </div>
    </div>
  );
}

// ── Helper tính ISO Week chuẩn ────────────────────────────────
function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ── Helper tự tính tuần nếu không có param ───────────────────────
function getAutoWeeks() {
  const d = new Date();
  const vnDay = d.getDay(); // 0=CN, 1=T2... (Local time)
  const currentWeek = getISOWeek(d);
  
  // Logic Pivot: Thứ 7 (6) và CN (0) báo cáo tuần hiện tại. Thứ 2 trở đi báo cáo tuần cũ.
  const isWeekend = (vnDay === 6 || vnDay === 0);
  const reportWeekNum = isWeekend ? currentWeek : currentWeek - 1;
  const planWeekNum = reportWeekNum + 1;

  return {
    report: `Tuần ${reportWeekNum}`,
    plan: `Tuần ${planWeekNum}`
  };
}

// ════════════════════════════════════════════════════════════════
// COMPONENT CHÍNH
// ════════════════════════════════════════════════════════════════
function AppContent() {
  const searchParams = useSearchParams();
  const name       = searchParams.get('name') || 'Bạn chưa có Tên';
  const dept       = searchParams.get('dept') || 'Chưa rõ';
  const role       = searchParams.get('role') || 'Cán bộ';
  
  const autoWeeks  = getAutoWeeks();
  const reportWeek = searchParams.get('report_week') || autoWeeks.report;
  const planWeek   = searchParams.get('plan_week') || autoWeeks.plan;
  const reportTo   = searchParams.get('report_to') || 'CEO';
  const isLate     = searchParams.get('is_late') === 'true';

  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  const { initTasks, addTask, tasks, getTotalScore } = useKpiStore();
  const [screen, setScreen]       = useState<ScreenState>('loading');
  const [errorMsg, setErrorMsg]   = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [toast, setToast]             = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null);
  const [modal, setModal]             = useState<{ show: boolean; onOk: () => void } | null>(null);
  const [finalScore, setFinalScore]   = useState(0);
  // Ô nào đang lỗi validate
  const [invalidTaskIds, setInvalidTaskIds] = useState<string[]>([]);

  // Auto-save draft
  useDraftSave(name, reportWeek);

  // ── 1. FETCH DATA ──────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      // Nếu không dính líu đến user cụ thể (chưa truyền param vào)
      if (name === 'Bạn chưa có Tên') {
        setScreen('form');
        setIsFirstTime(true);
        return;
      }

      try {
        const res = await fetch(
          `/api/kpi?name=${encodeURIComponent(name)}&report_week=${encodeURIComponent(reportWeek)}&plan_week=${encodeURIComponent(planWeek)}`
        );

        // F5: Token hết hạn
        if (res.status === 403) {
          setScreen('token_expired');
          return;
        }

        const data = await res.json();

        // F7: Lỗi GAS hoặc server
        if (!res.ok || data.error) {
          setScreen('api_error');
          setErrorMsg(data.error || `HTTP ${res.status}`);
          return;
        }

        if (data.tasks && data.tasks.length > 0) {
          // F2: Có dữ liệu tuần cũ
          const planTasks = (data.planTasks || []).map((t: any) => ({ ...t, isNhiemVuCu: false }));
          initTasks([...data.tasks, ...planTasks]);
          setIsFirstTime(false);
          setScreen('form');
        } else {
          // F1: Lần đầu / chưa có data
          setIsFirstTime(true);
          setScreen('form');
        }
      } catch (err: any) {
        // F7: Lỗi mạng
        setScreen('api_error');
        setErrorMsg(err.message || 'Lỗi kết nối mạng');
        return;
      }

      // Kiểm tra draft sau khi load xong
      setTimeout(() => {
        const draft = restoreDraft(name, reportWeek);
        const draftNewTasks = draft?.tasks.filter((t: any) => !t.isNhiemVuCu && t.noiDung.trim() !== '') || [];
        if (draft && draftNewTasks.length > 0 && Date.now() - draft.savedAt < 48 * 3600 * 1000) {
          const minutesAgo = Math.round((Date.now() - draft.savedAt) / 60000);
          setModal({
            onOk: () => {
              const serverOldTasks = useKpiStore.getState().tasks.filter((t: any) => t.isNhiemVuCu);
              initTasks([...serverOldTasks, ...draftNewTasks]);
              setModal(null);
            },
            show: true,
          });
          // Lưu thông tin draft vào state để hiển thị trong modal
          (window as any).__draftMeta = { minutesAgo, count: draftNewTasks.length };
        } else {
          if (useKpiStore.getState().tasks.filter((t: any) => !t.isNhiemVuCu).length === 0) {
            addTask();
          }
        }
      }, 200);
    }

    loadData();
  }, [name, reportWeek, planWeek, initTasks, addTask]);

  // ── 2. SUBMIT ──────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const currentTasks = useKpiStore.getState().tasks;
    const oldTasks = currentTasks.filter(t => t.isNhiemVuCu);
    const newTasks = currentTasks.filter(t => !t.isNhiemVuCu && t.noiDung.trim() !== '');

    // === VALIDATE TOÀN DIỆN: Quét tất cả trường bắt buộc ===
    const invalidIds: string[] = [];

    // Bảng 1 (oldTasks): Bảng báo cáo tuần trước
    // Nếu có dòng nào thì bắt buộc phải điền đủ: nội dung, đơn vị, kế hoạch, trọng số, thực hiện
    oldTasks.forEach(t => {
      const isMissing = 
        !t.noiDung.trim() || 
        !t.donVi.trim() || 
        t.keHoach === '' || 
        t.trongSo === '' || 
        t.thucHien === null || isNaN(t.thucHien as number);
      
      if (isMissing) {
        invalidIds.push(t.id);
      }
    });

    // Bảng 2 (newTasks): Bảng kế hoạch tuần tới
    // 1. Bắt buộc phải có ít nhất 1 đầu việc
    if (newTasks.length === 0) {
      setToast({ msg: '⚠️ Vui lòng thêm ít nhất một đầu việc kế hoạch cho tuần tới!', type: 'error' });
      return;
    }

    // 2. Từng dòng phải điền đủ: nội dung, đơn vị, kế hoạch, trọng số
    newTasks.forEach(t => {
      const isMissing = 
        !t.noiDung.trim() || 
        !t.donVi.trim() || 
        t.keHoach === '' || 
        t.trongSo === '';
        
      if (isMissing) {
        invalidIds.push(t.id);
      }
    });

    if (invalidIds.length > 0) {
      setInvalidTaskIds(invalidIds);
      const missingThucHien = oldTasks.filter(t => t.thucHien === null || isNaN(t.thucHien as number)).length;
      let msg = `⚠️ Còn ${invalidIds.length} dòng chưa điền đầy đủ!`;
      if (missingThucHien > 0) msg += ` Bao gồm ${missingThucHien} ô "Thực hiện" chưa chốt.`;
      msg += ' Các ô đỏ bên trên là những chỗ còn thiếu — vui lòng điền đủ trước khi nộp.';
      setToast({ msg, type: 'error' });
      return;
    }
    setInvalidTaskIds([]);

    // Confirm modal (thay window.confirm)
    setModal({
      show: true,
      onOk: async () => {
        setModal(null);
        setSubmitting(true);
        try {
          const resp = await fetch('/api/kpi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name, dept, role,
              report_week: reportWeek,
              plan_week: planWeek,
              is_late: isLate,
              tasksToUpdate: oldTasks,
              tasksToInsert: newTasks,
              allTasks: [...oldTasks, ...newTasks],
            }),
          });

          if (resp.ok) {
            // F9: Thành công - Tính % gia quyền để hiện màn hình Success
            const totalScore = getTotalScore();
            const totalWeight = oldTasks.reduce((sum, t) => sum + (t.trongSo === '' ? 0 : t.trongSo), 0);
            const finalPercent = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
            
            setFinalScore(finalPercent);
            clearDraft(name, reportWeek);
            setScreen('success');
          } else {
            const err = await resp.json();
            setToast({ msg: '❌ Lỗi nộp báo cáo: ' + (err.error || 'Unknown'), type: 'error' });
          }
        } catch {
          // F10: Mạng đứt → giữ form
          setToast({ msg: '❌ Mất kết nối mạng. Dữ liệu đã được lưu tạm. Thử lại khi có mạng!', type: 'error' });
        } finally {
          setSubmitting(false);
        }
      },
    });
  }, [name, dept, role, reportWeek, planWeek, isLate, getTotalScore]);

  // ── RENDER theo trạng thái màn hình ───────────────────────────

  // F6: Loading
  if (screen === 'loading') return <SkeletonLoader name={name} />;
  // F5: Token hết hạn
  if (screen === 'token_expired') return <TokenExpiredScreen />;
  // F7: Lỗi API
  if (screen === 'api_error') return <ApiErrorScreen message={errorMsg} />;
  // F9: Thành công
  if (screen === 'success') return <SuccessScreen name={name} reportWeek={reportWeek} totalPercent={finalScore} />;

  const draftMeta = (window as any).__draftMeta;

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modal Draft */}
      {modal && draftMeta && (
        <ConfirmModal
          title="💾 Phát hiện bản nháp"
          message={`Bạn có bản nháp được lưu cách đây ${draftMeta.minutesAgo} phút (${draftMeta.count} đầu việc đã điền).\n\nBạn có muốn khôi phục không?`}
          okLabel="Khôi phục"
          cancelLabel="Bỏ qua"
          onOk={modal.onOk}
          onCancel={() => {
            clearDraft(name, reportWeek);
            setModal(null);
            if (useKpiStore.getState().tasks.filter(t => !t.isNhiemVuCu).length === 0) addTask();
          }}
        />
      )}

      {/* Modal Submit */}
      {modal && !draftMeta && (
        <ConfirmModal
          title="📤 Xác nhận nộp báo cáo"
          message={`Nếu bạn đã nộp tuần này rồi, dữ liệu cũ sẽ bị GHI ĐÈ bằng dữ liệu mới.\n\nBạn chắc chắn muốn nộp báo cáo?`}
          okLabel="Nộp báo cáo"
          cancelLabel="Xem lại"
          onOk={modal.onOk}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Khối 1: Header thông tin NV */}
        <HeaderInfo
          name={name} role={role} dept={dept} date={dateStr}
          reportWeek={reportWeek} planWeek={planWeek} reportTo={reportTo} isLate={isLate}
        />

        {/* Khối 2: Lưới báo cáo */}
        <ReportGrid
          onSubmit={handleSubmit}
          isSubmitting={submitting}
          reportWeek={reportWeek}
          planWeek={planWeek}
          invalidTaskIds={invalidTaskIds}
          isFirstTime={isFirstTime}
        />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Đang khởi tạo ứng dụng...</div>}>
      <AppContent />
    </Suspense>
  );
}
