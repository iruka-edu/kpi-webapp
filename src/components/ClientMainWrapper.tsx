"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function ClientMainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Các trang dành cho nhân viên đánh giá (public, external) -> ẩn Sidebar, bỏ padding
  const isEvalExternal = pathname === "/evaluation" || pathname === "/evaluation/final";

  if (isEvalExternal) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] text-[#111] font-sans w-full flex-1">
        {children}
      </div>
    );
  }

  // Các trang nội bộ (dashboard, weekly, v.v...) -> giữ nguyên cấu trúc cũ
  return (
    <>
      <Sidebar />
      <main className="flex-1 text-slate-800 min-h-screen" style={{ padding: "28px 32px 60px" }}>
        {children}
      </main>
    </>
  );
}
