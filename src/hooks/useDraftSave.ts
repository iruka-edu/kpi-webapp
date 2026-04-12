/**
 * useDraftSave.ts
 * ---------------
 * Vai trò: Tự động lưu bản nháp form KPI vào localStorage (debounce 2s).
 * Khi NV mở lại form (sau khi mạng đứt / tắt tab nhầm), hỏi xem có muốn khôi phục không.
 *
 * Cách hoạt động:
 *  1. Theo dõi tasks từ Zustand store
 *  2. Mỗi khi tasks thay đổi → debounce 2s → lưu vào localStorage với key = kpi_draft_{name}_{week}
 *  3. Khi trang load xong (sau API): kiểm tra localStorage → nếu có draft mới hơn → hỏi NV
 *  4. Sau khi NV nộp thành công → xóa draft
 */

import { useEffect, useRef } from 'react';
import { Task, useKpiStore } from '@/store/kpiStore';

interface DraftPayload {
  tasks: Task[];
  savedAt: number; // Unix timestamp
}

// Tạo key localStorage theo NV + tuần báo cáo
function getDraftKey(name: string, reportWeek: string): string {
  return `kpi_draft_${name}_${reportWeek}`;
}

/**
 * Lưu draft vào localStorage — gọi trong page.tsx
 * @param name - Tên nhân viên
 * @param reportWeek - Tuần báo cáo (vd "Tuần 15")
 */
export function useDraftSave(name: string, reportWeek: string) {
  const tasks = useKpiStore((s) => s.tasks);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save mỗi khi tasks thay đổi (debounce 2s)
  useEffect(() => {
    // Không save khi chưa có dữ liệu thật
    if (!name || name === 'Chưa rõ' || tasks.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const payload: DraftPayload = { tasks, savedAt: Date.now() };
        localStorage.setItem(getDraftKey(name, reportWeek), JSON.stringify(payload));
        console.log('💾 Draft đã lưu vào localStorage');
      } catch (e) {
        console.warn('⚠️ Không thể lưu draft:', e);
      }
    }, 2000); // Debounce 2 giây

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tasks, name, reportWeek]);
}

/**
 * Khôi phục draft từ localStorage (gọi sau khi load API xong).
 * Trả về draft nếu có và draft MỚI HƠN data từ server, ngược lại null.
 */
export function restoreDraft(name: string, reportWeek: string): DraftPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getDraftKey(name, reportWeek));
    if (!raw) return null;
    return JSON.parse(raw) as DraftPayload;
  } catch {
    return null;
  }
}

/**
 * Xóa draft sau khi NV nộp thành công
 */
export function clearDraft(name: string, reportWeek: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getDraftKey(name, reportWeek));
  console.log('🗑️ Draft đã xóa sau khi nộp thành công');
}
