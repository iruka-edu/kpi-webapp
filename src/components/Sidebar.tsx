"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileSpreadsheet, FileBarChart, BookOpen, Settings, HelpCircle } from "lucide-react";

// Dữ liệu tĩnh của Sidebar
const navItems = [
  { name: "Dashboard", href: "/", icon: <LayoutDashboard size={20} /> },
  { name: "Báo Cáo Tuần", href: "/weekly", icon: <FileSpreadsheet size={20} /> },
  { name: "Báo Cáo Tháng", href: "/monthly", icon: <FileBarChart size={20} /> },
  { name: "Quy Định & Nội Quy", href: "/rules", icon: <BookOpen size={20} /> },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* 1. KHỐI TRỤ (Wrapper): 50px siêu gọn (Chỉ lớn hơn đường kính ngón tay một chút) */}
      <div className="w-[50px] shrink-0 hidden md:block"></div>

      {/* 2. SIDEBAR THU/PHÓNG: Gốc 50px, hover nở ra 260px */}
      <div className="fixed top-0 left-0 h-screen bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800 hidden md:flex font-sans w-[50px] hover:w-[260px] transition-all duration-300 z-[100] group overflow-hidden shadow-2xl">
        
        {/* Khối 1: Logo & Tên Cổng thông tin */}
        {/* Logo 36px + Left/Right padding bằng 7px -> Tổng 50px  */}
        <div className="h-[72px] flex items-center pl-[7px] border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20">
              I
            </div>
            {/* Chữ sẽ mờ đi khi thu gọn, chỉ xoè ra khi hover */}
            <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              <span className="text-white font-bold text-lg tracking-tight leading-tight">
                IruKa<span className="text-blue-400">Life</span>
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Khối 2: Menu Điều Hướng */}
        <nav className="flex-1 py-8 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-none">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pl-[15px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap h-4">
            <span className="hidden group-hover:inline">Menu Chính</span>
          </div>
          
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-[15px] py-3 mx-1 rounded-xl transition-all duration-200 group/item ${
                  isActive
                    ? "bg-blue-600/15 text-blue-400 font-semibold"
                    : "hover:bg-slate-800/80 hover:text-white text-sm"
                }`}
                title={item.name}
              >
                <div
                  className={`shrink-0 ${
                    isActive ? "text-blue-400" : "text-slate-400 group-hover/item:text-white group-hover/item:scale-110"
                  } transition-all duration-200`}
                >
                  {item.icon}
                </div>
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Khối 3: Support footer */}
        <div className="py-4 border-t border-slate-800/80 space-y-2 mb-2 shrink-0">
          <button className="flex items-center gap-4 px-[15px] mx-1 py-3 w-full rounded-xl hover:bg-slate-800/80 transition-colors text-slate-400 hover:text-white text-sm group/btn" title="IT Settings">
            <Settings size={20} className="shrink-0 group-hover/btn:rotate-90 transition-transform duration-300" />
            <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              IT Settings
            </span>
          </button>
          <button className="flex items-center gap-4 px-[15px] mx-1 py-3 w-full rounded-xl hover:bg-slate-800/80 transition-colors text-slate-400 hover:text-white text-sm group/btn" title="Support Desk">
            <HelpCircle size={20} className="shrink-0 group-hover/btn:scale-110 transition-transform duration-200" />
            <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Support Desk
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
