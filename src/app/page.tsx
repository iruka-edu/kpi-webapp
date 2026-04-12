"use client";

import React, { useEffect, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import HeaderInfo from '@/components/HeaderInfo';
import ReportGrid from '@/components/ReportGrid';
import { useKpiStore } from '@/store/kpiStore';
import { useDraftSave, restoreDraft, clearDraft } from '@/hooks/useDraftSave';

function AppContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || 'Chưa rõ';
  const dept = searchParams.get('dept') || 'Chưa rõ';
  const role = searchParams.get('role') || 'Cán bộ';
  
  const reportWeek = searchParams.get('report_week') || 'Tuần N/A';
  const planWeek = searchParams.get('plan_week') || 'Tuần N/A+1';
  const isLate = searchParams.get('is_late') === 'true';
  
  // Format Date hôm nay
  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  const { initTasks, addTask, tasks } = useKpiStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [noData, setNoData] = useState(false);

  // Auto-save draft vào localStorage mỗi 2s khi NV điền form (chống mất mạng)
  useDraftSave(name, reportWeek);

  // 1. FETCH DATA TỪ API
  useEffect(() => {
    async function loadData() {
      try {
        if(name !== 'Chưa rõ' && reportWeek !== 'Tuần N/A') {
          // Truyền thêm plan_week để GAS biết load kế hoạch đã nộp tuần này (Fix [A])
          const res = await fetch(
            `/api/kpi?name=${encodeURIComponent(name)}&report_week=${encodeURIComponent(reportWeek)}&plan_week=${encodeURIComponent(planWeek)}`
          );
          const data = await res.json();
          
          if (data.error) {
            // GAS chưa cấu hình hoặc lỗi hệ thống
            console.error('⚠️ API lỗi:', data.error);
            setNoData(true);
          } else if(data.tasks && data.tasks.length > 0) {
            // Có nhiệm vụ cũ → init bình thường
            // Nếu có thêm planTasks (kế hoạch đã nộp tuần này) → pre-fill Phân vùng 2
            const planTasks = (data.planTasks || []).map((t: any) => ({ ...t, isNhiemVuCu: false }));
            initTasks([...data.tasks, ...planTasks]);
          } else {
            console.log('Không có data mầm tuần trước.');
            setNoData(true);
          }
        }
      } catch (error) {
        console.error('Lỗi kéo data API', error);
        setNoData(true);
      } finally {
        setLoading(false);
        // Sau khi load API: kiểm tra localStorage xem có draft cũ không
        setTimeout(() => {
          const draft = restoreDraft(name, reportWeek);
          const currentTaskCount = useKpiStore.getState().tasks.filter(t => !t.isNhiemVuCu).length;
          // Chỉ hỏi khôi phục nếu draft có phần kế hoạch mới (isNhiemVuCu=false) và mới hơn 30 giây
          const draftNewTasks = draft?.tasks.filter(t => !t.isNhiemVuCu && t.noiDung.trim() !== '') || [];
          if (draft && draftNewTasks.length > 0 && Date.now() - draft.savedAt < 48 * 3600 * 1000) {
            const minutesAgo = Math.round((Date.now() - draft.savedAt) / 60000);
            const confirm = window.confirm(
              `💾 Phát hiện bản nháp được lưu cách đây ${minutesAgo} phút (${draftNewTasks.length} đầu việc đã điền).\n\nBạn muốn khôi phục không?`
            );
            if (confirm) {
              // Ghép: giữ nhiệm vụ cũ từ server + phần kế hoạch mới từ draft
              const serverOldTasks = useKpiStore.getState().tasks.filter(t => t.isNhiemVuCu);
              initTasks([...serverOldTasks, ...draftNewTasks]);
            } else {
              clearDraft(name, reportWeek); // NV từ chối khôi phục → xóa draft
            }
          } else {
            // Không có draft, thêm 1 dòng trống mới cho phần kế hoạch
            if(currentTaskCount === 0) addTask();
          }
        }, 200);
      }
    }
    loadData();
  }, [name, reportWeek, planWeek, initTasks, addTask]);



  // 2. CHỨC NĂNG SUBMIT TỚI API
  const handleSubmit = async () => {
    // Lấy data từ Store
    const currentTasks = useKpiStore.getState().tasks;
    
    // Valiate: Các Task cũ thì thucHien không được trống
    const oldTasks = currentTasks.filter(t => t.isNhiemVuCu);
    if (oldTasks.some(t => t.thucHien === null || isNaN(t.thucHien))) {
       alert("🚨 Sếp ơi, Cột 'Thực hiện' ở tuần trước chưa điền xong. Vui lòng chốt hết số trước khi Nộp báo cáo!");
       return;
    }

    // Các task mới (Thêm vào) 
    const newTasks = currentTasks.filter(t => !t.isNhiemVuCu && t.noiDung.trim() !== '');

    const isConfirm = window.confirm("Lưu ý: Nếu bạn nộp báo cáo lần 2 trong tuần này, toàn bộ dữ liệu báo cáo cũ của tuần sẽ bị xóa để GHI ĐÈ bằng dữ liệu mới.\n\nBạn có chắc chắn muốn tiếp tục Nộp báo cáo?");
    if (!isConfirm) return;

    setSubmitting(true);
    
    try {
      const resp = await fetch('/api/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           name,
           dept,
           role,
           report_week: reportWeek,
           plan_week: planWeek,
           is_late: isLate,
           tasksToUpdate: oldTasks,
           tasksToInsert: newTasks,
           allTasks: [...oldTasks, ...newTasks] // Truyền tất cả để GAS viết đè
        })
      });

      if (resp.ok) {
        alert("✅ NỘP BÁO CÁO THÀNH CÔNG! Dữ liệu đã phi thẳng vào Google Sheets.");
        clearDraft(name, reportWeek); // Xóa draft sau khi nộp thành công
        // Gửi xong thì văng ra cảnh báo an toàn tránh ấn 2 lần / Xóa trắng
      } else {
        const err = await resp.json();
        alert("❌ Lỗi nộp báo cáo: " + (err.error || "Unknown"));
      }

    } catch (e) {
      alert("❌ Lỗi mất kết nối mạng. Không thể Nộp báo cáo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-lg font-bold text-gray-500 animate-pulse">Cỗ máy đang đọc dữ liệu cũ của bạn. Vui lòng chờ nghen... ⚙️</div>;

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Khối 1 */}
        <HeaderInfo name={name} role={role} dept={dept} date={dateStr} />

        {/* Banner: không có dữ liệu tuần trước */}
        {noData && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-300 rounded-lg text-blue-800 text-sm font-medium">
            ℹ️ <strong>Không có dữ liệu tuần trước.</strong> Bạn có thể bắt đầu điền kế hoạch cho tuần tới ngay bên dưới. Nếu đây là lần đầu tiên trong hệ thống thì rất bình thường — Phân vùng 1 sẽ hiện dữ liệu từ tuần sau!{' '}
            {!process.env.NEXT_PUBLIC_GAS_CONFIGURED && (
              <span className="text-red-600 font-bold">(Nếu bạn thấy điều này liên tục, nhớ báo IT kiểm tra cấu hình Google Sheet!)</span>
            )}
          </div>
        )}

        {/* Khối 2: Lưới báo cáo, Truyền thêm nút Nộp Của Khang vào Bottom Bar */}
        <ReportGrid onSubmit={handleSubmit} isSubmitting={submitting} />

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
