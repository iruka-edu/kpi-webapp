/**
 * Monthly Page — Báo cáo & Kế hoạch KPI Tháng
 * -----------------------------------------
 * Workflow: /4-frontend-mockup-fidelity
 * Bám sát mockup HTML pixel-perfect
 */

"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useKpiStore } from '@/store/kpiStore';
import Sidebar from '@/components/Sidebar';
import MonthlyHeaderInfo from '@/components/MonthlyHeaderInfo';
import ReportGrid from '@/components/ReportGrid';
import MonthlyExtras from '@/components/MonthlyExtras';
import { useDraftSave, restoreDraft, clearDraft } from '@/hooks/useDraftSave';

function MonthlyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { tasks, monthlyData, initTasks, initMonthlyData, resetStore } = useKpiStore();
  
  const name = searchParams.get('name') || '';
  const discordId = searchParams.get('discord_id') || '';
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invalidTasks, setInvalidTasks] = useState<string[]>([]);

  // ── Tính toán Tháng Báo Cáo ──────────────────────
  // Nếu trước ngày 10: báo cáo tháng trước. Sau ngày 10: báo cáo tháng hiện tại.
  const now = new Date();
  const day = now.getDate();
  const currentMonthNum = now.getMonth() + 1; // 1-12

  let reportMonthNum = day <= 10 ? (currentMonthNum === 1 ? 12 : currentMonthNum - 1) : currentMonthNum;
  let planMonthNum = reportMonthNum === 12 ? 1 : reportMonthNum + 1;

  const reportMonthLabel = `Tháng ${reportMonthNum}`;
  const planMonthLabel = `Tháng ${planMonthNum}`;

  // ── Sync Draft ─────────────────────────────────
  // Dùng key riêng cho Monthly để không đè lên Weekly
  useDraftSave(name, reportMonthLabel, 'monthly');

  // ── Khởi tạo dữ liệu ────────────────────────────
  useEffect(() => {
    if (!name) return;

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch từ server (giống weekly logic)
        const url = `/api/kpi?name=${encodeURIComponent(name)}&report_week=${encodeURIComponent(reportMonthLabel)}&plan_week=${encodeURIComponent(planMonthLabel)}&discord_id=${discordId}&token=${token}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
          alert(`Lỗi: ${data.error}`);
          return;
        }

        // 2. Kiểm tra Draft (Bản nháp)
        const draft = restoreDraft(name, reportMonthLabel, 'monthly');
        
        if (draft && Date.now() - draft.savedAt < 72 * 3600 * 1000) {
          // Nếu có draft và chưa quá 72h -> ưu tiên dùng draft
          initTasks(draft.tasks || []);
          if (draft.monthlyData) initMonthlyData(draft.monthlyData);
        } else {
          // Nếu không có draft -> dùng data từ server
          const allTasks = [...(data.tasks || []), ...(data.planTasks || [])];
          initTasks(allTasks);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [name, reportMonthLabel, planMonthLabel, discordId, token, initTasks, initMonthlyData]);

  // ── Xử lý Submit ──────────────────────────────
  const handleSubmit = async () => {
    // 1. Validate
    const missingActual = tasks
      .filter(t => t.isNhiemVuCu && t.thucHien === null)
      .map(t => t.id);
    
    if (missingActual.length > 0) {
      setInvalidTasks(missingActual);
      alert("Vui lòng điền đầy đủ cột 'Thực hiện' cho các đầu việc tháng trước!");
      return;
    }

    // 2. Prepare Payload
    const payload = {
      name,
      report_week: reportMonthLabel,
      plan_week: planMonthLabel,
      tasks,
      monthly_data: monthlyData, // Gửi thêm cục data tháng
      timestamp: new Date().toISOString(),
      type: 'monthly' // Định danh cho GAS biết
    };

    setSubmitting(true);
    try {
      const res = await fetch('/api/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        // 3. Xoá draft sau khi nộp thành công
        clearDraft(name, reportMonthLabel, 'monthly');
        resetStore();
        alert("✅ Nộp báo cáo tháng thành công!");
        router.push('/');
      } else {
        const err = await res.json();
        alert(`Lỗi khi nộp: ${err.error}`);
      }
    } catch (err) {
      alert("Lỗi kết nối server!");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Đang tải dữ liệu tháng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white font-inter text-[#111]">
      <Sidebar />
      <main className="flex-1 px-4 sm:px-8 max-w-[1600px] mx-auto pb-32">
        <MonthlyHeaderInfo 
          name={name}
          role="Nhân viên" // Sẽ lấy từ API sau nếu cần
          dept="Phòng ban"
          date={new Date().toLocaleDateString('vi-VN')}
          reportMonth={reportMonthLabel}
          planMonth={planMonthLabel}
          reportTo="CEO"
          isLate={false}
        />

        <ReportGrid 
          reportLabel={reportMonthLabel}
          planLabel={planMonthLabel}
          onSubmit={handleSubmit}
          isSubmitting={submitting}
          invalidTaskIds={invalidTasks}
          isFirstTime={tasks.length === 0}
          mode="monthly"
        />

        <div className="mt-8">
           <MonthlyExtras />
        </div>
      </main>
    </div>
  );
}

export default function MonthlyPage() {
  return (
    <Suspense fallback={null}>
      <MonthlyContent />
    </Suspense>
  );
}
