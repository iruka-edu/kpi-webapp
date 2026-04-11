"use client";

import React, { useEffect, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import HeaderInfo from '@/components/HeaderInfo';
import ReportGrid from '@/components/ReportGrid';
import { useKpiStore } from '@/store/kpiStore';

function AppContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || 'Chưa rõ';
  const dept = searchParams.get('dept') || 'Chưa rõ';
  const role = searchParams.get('role') || 'Cán bộ';
  
  const reportWeek = searchParams.get('report_week') || 'Tuần N/A';
  const planWeek = searchParams.get('plan_week') || 'Tuần N/A+1';
  
  // Format Date hôm nay
  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  const { initTasks, addTask, tasks } = useKpiStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 1. FETCH DATA TỪ API
  useEffect(() => {
    async function loadData() {
      try {
        if(name !== 'Chưa rõ' && reportWeek !== 'Tuần N/A') {
          const res = await fetch(`/api/kpi?name=${encodeURIComponent(name)}&report_week=${encodeURIComponent(reportWeek)}`);
          const data = await res.json();
          
          if(data.tasks && data.tasks.length > 0) {
            initTasks(data.tasks);
          } else {
            console.log("Không có data mầm tuần trước.");
          }
        }
      } catch (error) {
        console.error("Lỗi kéo data API", error);
      } finally {
        setLoading(false);
        // Sau khi load xong, nhét vào 1 dòng trống cho tuần mới
        setTimeout(() => {
          if(useKpiStore.getState().tasks.filter(t => !t.isNhiemVuCu).length === 0) {
             addTask();
          }
        }, 100);
      }
    }
    loadData();
  }, [name, reportWeek, initTasks, addTask]);

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
           tasksToUpdate: oldTasks,
           tasksToInsert: newTasks
        })
      });

      if (resp.ok) {
        alert("✅ NỘP BÁO CÁO THÀNH CÔNG! Dữ liệu đã phi thẳng vào Google Sheets.");
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
