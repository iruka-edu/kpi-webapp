"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileSpreadsheet, FileBarChart, BookOpen, Settings, HelpCircle, ClipboardCheck } from "lucide-react";

// Dữ liệu tĩnh của Sidebar
const navItems = [
  { name: "Dashboard", href: "/", icon: <LayoutDashboard size={20} className="shrink-0" /> },
  { name: "Báo Cáo Tuần", href: "/weekly", icon: <FileSpreadsheet size={20} className="shrink-0" /> },
  { name: "Báo Cáo Tháng", href: "/monthly", icon: <FileBarChart size={20} className="shrink-0" /> },
  { name: "Đánh Giá Nhân Sự", href: "/evaluation/dashboard", icon: <ClipboardCheck size={20} className="shrink-0" /> },
  { name: "Quy Định & Nội Quy", href: "/rules", icon: <BookOpen size={20} className="shrink-0" /> },
];


export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* 1. KHỐI TRỤ (Wrapper): Dữ chỗ cứng 50px */}
      <div className="w-[50px] shrink-0 hidden md:block"></div>

      {/* 2. SIDEBAR THU/PHÓNG: Gốc 50px, hover nở ra 260px */}
      <div className="fixed top-0 left-0 h-screen bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800 hidden md:flex font-sans w-[50px] hover:w-[260px] transition-all duration-300 z-[100] group overflow-hidden shadow-2xl">
        
        {/* Khối 1: Logo & Tên Cổng thông tin */}
        <div className="h-[72px] flex items-center px-[4px] border-b border-slate-800/80 shrink-0 w-[260px]">
          <div className="w-[42px] shrink-0 flex items-center justify-center">
             <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-blue-500/20">
               <Image src="/logo-iruka.svg" alt="IruKa" width={40} height={40} style={{ objectFit: "contain" }} priority />
             </div>
          </div>
          {/* Chữ sẽ mờ đi khi thu gọn, chỉ xoè ra khi hover */}
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap ml-3">
            <span className="text-white font-bold text-lg tracking-tight leading-tight">
              IruKa<span className="text-blue-400">Life</span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Workspace
            </span>
          </div>
        </div>

        {/* Khối 2: Menu Điều Hướng */}
        {/* px-[4px] tạo lề mỏng cân đối 2 bên, độ rộng ruột còn đúng 42px */}
        <nav className="flex-1 py-8 px-[4px] space-y-2 overflow-y-auto overflow-x-hidden scrollbar-none w-[260px]">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pl-[12px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap h-4">
            <span className="hidden group-hover:inline">Menu Chính</span>
          </div>
          
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-xl transition-all duration-200 group/item ${
                  isActive
                    ? "bg-blue-600/15 text-blue-400 font-semibold"
                    : "hover:bg-slate-800/80 hover:text-white"
                }`}
                title={item.name}
              >
                {/* Hộp bọc Icon luôn rộng 42px và Flex-Center để nằm chính giữa tuyệt đối */}
                <div className={`w-[42px] h-[44px] shrink-0 flex justify-center items-center transition-all duration-200 ${isActive ? "text-blue-400" : "text-slate-400 group-hover/item:text-white group-hover/item:scale-110"}`}>
                  {item.icon}
                </div>
                {/* Văn bản */}
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-2 text-sm">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Khối 3: Support footer */}
        <div className="px-[4px] py-4 border-t border-slate-800/80 space-y-2 mb-2 shrink-0 w-[260px]">
          <button className="flex items-center rounded-xl hover:bg-slate-800/80 transition-colors group/btn" title="IT Settings">
            <div className="w-[42px] h-[44px] shrink-0 flex justify-center items-center text-slate-400 group-hover/btn:text-white">
              <Settings size={20} className="shrink-0 group-hover/btn:rotate-90 transition-transform duration-300" />
            </div>
            <span className="whitespace-nowrap text-slate-400 group-hover/btn:text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-2">
              IT Settings
            </span>
          </button>
          <button className="flex items-center rounded-xl hover:bg-slate-800/80 transition-colors group/btn" title="Support Desk">
            <div className="w-[42px] h-[44px] shrink-0 flex justify-center items-center text-slate-400 group-hover/btn:text-white">
              <HelpCircle size={20} className="shrink-0 group-hover/btn:scale-110 transition-transform duration-200" />
            </div>
            <span className="whitespace-nowrap text-slate-400 group-hover/btn:text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-2">
              Support Desk
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
