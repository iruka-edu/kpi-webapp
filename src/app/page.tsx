"use client";
// ═══════════════════════════════════════════════════════════════════
// Trang Chủ — IruKa Staff Portal
// Font sizes đồng bộ 100% với mockup homepage-mockup.html
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import Image from "next/image";
import TabBaoCao from "@/components/home/TabBaoCao";
import TabXinPhep from "@/components/home/TabXinPhep";
import TabTraoDoi from "@/components/home/TabTraoDoi";
import TabHrCeo from "@/components/home/TabHrCeo";
import FaqAccordion from "@/components/home/FaqAccordion";

type TabKey = "bao-cao" | "xin-phep" | "trao-doi" | "hr-ceo";
type Dept = "" | "dev" | "design" | "content" | "hr" | "qc" | "edu" | "tester" | "hdqt";

// ─── Nội Quy cards ──────────────────────────────────────────────────────────
const RULES = [
  { icon: "⏰", color: "blue",   text: "Báo cáo ngày đúng giờ",               sub: "Nộp trước 9:00 sáng — trễ sau 9h30 Bot báo lên CEO" },
  { icon: "📊", color: "red",    text: "Báo cáo tuần trước 24h Chủ Nhật",      sub: "Áp dụng HR · Content · Design · QC — trễ phạt 50k" },
  { icon: "📋", color: "purple", text: "Kế hoạch tháng trước 24h mùng 4",      sub: "Bot chốt 9:00 sáng mùng 5, gửi CEO — trễ phạt 100k" },
  { icon: "🏖️", color: "green",  text: "Xin phép trước ít nhất 1 ngày",        sub: "Xin cùng ngày sẽ không được chấp nhận tự động" },
  { icon: "💻", color: "orange", text: "Git push trước khi về",                 sub: "Bot kiểm tra lúc 17:00 và 17:30 — chưa push sẽ bị tag nhắc" },
  { icon: "❌", color: "red",    text: "Không ghi chung chung \"đang làm\"",     sub: "Mỗi đầu việc cần: tên cụ thể + số lượng + trạng thái" },
  { icon: "📲", color: "yellow", text: "Phản hồi Bot trong 30 phút",             sub: "Sau 3 tiếng không phản hồi → Bot báo leo thang CEO" },
  { icon: "🚨", color: "orange", text: "/urgent chỉ dùng khi thực sự khẩn",      sub: "Sự cố kỹ thuật, lỗi nghiêm trọng — không lạm dụng" },
];

const RULE_COLOR: Record<string, string> = {
  blue:   "bg-blue-100 text-blue-600",
  red:    "bg-red-100 text-red-600",
  purple: "bg-purple-100 text-purple-600",
  green:  "bg-emerald-100 text-emerald-600",
  orange: "bg-orange-100 text-orange-600",
  yellow: "bg-amber-100 text-amber-600",
};

const TABS: { key: TabKey; label: string; isHr?: boolean }[] = [
  { key: "bao-cao",   label: "📊 Lệnh Báo Cáo" },
  { key: "xin-phep",  label: "📅 Xin Phép & Điều Chỉnh" },
  { key: "trao-doi",  label: "💬 Giao Tiếp Với Sếp" },
  { key: "hr-ceo",    label: "👑 Lệnh HR / CEO", isHr: true },
];

const DEPTS: { value: Dept; label: string }[] = [
  { value: "",        label: "-- Chọn bộ phận --" },
  { value: "dev",     label: "💻 Dev" },
  { value: "design",  label: "🎨 Design" },
  { value: "content", label: "✍️ Content" },
  { value: "hr",      label: "👥 HR" },
  { value: "qc",      label: "🔍 QC" },
  { value: "edu",     label: "📚 Edu" },
  { value: "tester",  label: "🧪 Tester" },
  { value: "hdqt",    label: "🏛️ HĐQT / Mentor" },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("bao-cao");
  const [selectedDept, setSelectedDept] = useState<Dept>("");

  return (
    <div className="min-h-screen pb-20">

      {/* ══════════════════════════════════════
          KV1: HERO — dải full-width, không bo góc
          hero-title: 26px/900, dept-label: 13px/600
          dept-select: 14px/700
      ══════════════════════════════════════ */}
      <div
        className="relative overflow-hidden mb-6"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #2563eb 60%, #0ea5e9 100%)",
          padding: "28px 32px",
          margin: "-28px -32px 28px -32px",
        }}
      >
        <div className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.15] hidden md:block">
          <Image src="/logo-iruka.svg" alt="" width={100} height={100} priority />
        </div>

        {/* hero-title: 30px / 900 */}
        <h1 className="text-white font-black mb-5" style={{ fontSize: "30px", fontWeight: 900, letterSpacing: "-0.5px" }}>
          Cổng Thông Tin Nội Bộ IruKa
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* dept-label: 15px / 600 */}
          <span style={{ fontSize: "15px", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
            👤 Tôi thuộc bộ phận:
          </span>
          {/* dept-select: 14px / 700 */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value as Dept)}
            className="outline-none"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.3)",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: "10px",
              cursor: "pointer",
              minWidth: "180px",
            }}
          >
            {DEPTS.map((d) => (
              <option key={d.value} value={d.value} style={{ background: "#0f172a", color: "#fff" }}>
                {d.label}
              </option>
            ))}
          </select>
          {/* dept-badge: 12px / 700 */}
          {selectedDept && (
            <div
              className="flex items-center gap-1.5"
              style={{
                background: "rgba(16,185,129,0.25)",
                border: "1px solid rgba(16,185,129,0.4)",
                color: "#6ee7b7",
                fontSize: "13px",
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: "20px",
              }}
            >
              <span className="rounded-full animate-pulse" style={{ width: "6px", height: "6px", background: "#10b981", display: "inline-block" }} />
              Đã lưu
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          KV2: LỊCH BÁO CÁO & DEADLINE
          section-title: 16px/800
          tc-name: 15px/800  tc-cmd: 12px/700
          tc-deadline-val: 20px/900
          tc-row: 12px  tc-warning: 11.5px/600
      ══════════════════════════════════════ */}
      <div className="mb-7">
        {/* section-title: 19px / 800 */}
        <h2 className="flex items-center gap-2 mb-4" style={{ fontSize: "19px", fontWeight: 800, color: "#0f172a" }}>
          <span style={{ fontSize: "18px" }}>📅</span> Lịch Báo Cáo &amp; Deadline
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Card Ngày */}
          <div
            className="rounded-2xl border bg-white flex flex-col overflow-hidden relative transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            style={{ borderColor: "#e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "20px", height: "100%" }}
          >
            <div className="absolute top-0 left-0 right-0" style={{ height: "4px", background: "linear-gradient(90deg, #f59e0b, #fbbf24)", borderRadius: "16px 16px 0 0" }} />
            {/* tc-header */}
            <div className="flex items-center justify-between mb-2.5 mt-1">
              <div className="flex items-center justify-center rounded-xl" style={{ width: "38px", height: "38px", background: "#fef3c7", fontSize: "18px" }}>📬</div>
              {/* tc-badge: 12px/800 */}
              <span style={{ fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.5px", background: "#fef3c7", color: "#92400e" }}>Hàng Ngày</span>
            </div>
            {/* tc-name: 17px/800 */}
            <p style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", marginBottom: "2px" }}>Báo Cáo Ngày</p>
            {/* tc-cmd: 14px/700 monospace */}
            <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "14px", fontWeight: 700, color: "#64748b", marginBottom: "10px", display: "block" }}>/daily</code>
            {/* tc-deadline-label: 12px/700 */}
            <p style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>Deadline nộp</p>
            {/* tc-deadline-val: 24px/900 */}
            <p style={{ fontSize: "24px", fontWeight: 900, color: "#d97706", margin: "2px 0 8px" }}>Trước 09:00</p>
            {/* tc-rows: 12px */}
            <div className="flex flex-col mb-4" style={{ gap: "5px", marginTop: "8px" }}>
              {[
                <>Bot tổng hợp standup gửi kênh lúc <b>9:00</b></>,
                <>Bot gửi DM CEO lúc <b>9:30</b> (T2–T7)</>,
                <>Phiên chiều <b>14:00</b> — tag ai chưa nộp</>,
                <>Sửa được đến <b>10:00</b> — sau đó khóa</>,
              ].map((row, i) => (
                <div key={i} className="flex items-start" style={{ gap: "7px", fontSize: "14px", color: "#475569" }}>
                  <span className="shrink-0 rounded-full" style={{ width: "5px", height: "5px", background: "#f59e0b", marginTop: "5px" }} />
                  <span>{row}</span>
                </div>
              ))}
            </div>
            {/* tc-warning: 13px/600 */}
            <div className="flex items-center mt-auto" style={{ gap: "6px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: "#9a3412", fontWeight: 600, minHeight: "52px" }}>
              ⚠️ Nộp trễ sau <b>9h30</b>: Bot báo cáo lên CEO.
            </div>
          </div>

          {/* Card Tuần — toàn bộ là link */}
          <a
            href="/weekly"
            className="rounded-2xl border bg-white flex flex-col overflow-hidden relative transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            style={{ borderColor: "#e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "20px", textDecoration: "none", color: "inherit", height: "100%" }}
          >
            <div className="absolute top-0 left-0 right-0" style={{ height: "4px", background: "linear-gradient(90deg, #ef4444, #f87171)", borderRadius: "16px 16px 0 0" }} />
            <div className="flex items-center justify-between mb-2.5 mt-1">
              <div className="flex items-center justify-center rounded-xl" style={{ width: "38px", height: "38px", background: "#fee2e2", fontSize: "18px" }}>📊</div>
              <span style={{ fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.5px", background: "#fee2e2", color: "#991b1b" }}>Hàng Tuần</span>
            </div>
            <p style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", marginBottom: "2px" }}>Báo Cáo KPI Tuần</p>
            <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "14px", fontWeight: 700, color: "#64748b", marginBottom: "10px", display: "block" }}>/weekly</code>
            <p style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>Deadline nộp</p>
            <p style={{ fontSize: "24px", fontWeight: 900, color: "#dc2626", margin: "2px 0 8px" }}>24:00 Chủ Nhật</p>
            <div className="flex flex-col mb-4" style={{ gap: "5px", marginTop: "8px" }}>
              {[
                <>Bot DM nhắc lúc <b>20:00 Chủ Nhật</b> (còn 4 tiếng)</>,
                <>Bot tổng hợp <b>9:05 Thứ Hai</b> → gửi CEO</>,
                <>Bot DM xác nhận ngay khi bạn submit</>,
              ].map((row, i) => (
                <div key={i} className="flex items-start" style={{ gap: "7px", fontSize: "14px", color: "#475569" }}>
                  <span className="shrink-0 rounded-full" style={{ width: "5px", height: "5px", background: "#ef4444", marginTop: "5px" }} />
                  <span>{row}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center mt-auto" style={{ gap: "6px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: "#9a3412", fontWeight: 600, minHeight: "52px" }}>
              ⚠️ Nộp trễ: Phạt <b>50k</b>. Áp dụng: <b>HR · Content · Design · QC</b>
            </div>
          </a>

          {/* Card Tháng — toàn bộ là link */}
          <a
            href="/monthly"
            className="rounded-2xl border bg-white flex flex-col overflow-hidden relative transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            style={{ borderColor: "#e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "20px", textDecoration: "none", color: "inherit", height: "100%" }}
          >
            <div className="absolute top-0 left-0 right-0" style={{ height: "4px", background: "linear-gradient(90deg, #8b5cf6, #a78bfa)", borderRadius: "16px 16px 0 0" }} />
            <div className="flex items-center justify-between mb-2.5 mt-1">
              <div className="flex items-center justify-center rounded-xl" style={{ width: "38px", height: "38px", background: "#ede9fe", fontSize: "18px" }}>📋</div>
              <span style={{ fontSize: "12px", fontWeight: 800, padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.5px", background: "#ede9fe", color: "#5b21b6" }}>Hàng Tháng</span>
            </div>
            <p style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", marginBottom: "2px" }}>Báo Cáo &amp; KH Tháng</p>
            <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "14px", fontWeight: 700, color: "#64748b", marginBottom: "10px", display: "block" }}>/monthly</code>
            <p style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>Deadline nộp</p>
            <p style={{ fontSize: "24px", fontWeight: 900, color: "#7c3aed", margin: "2px 0 8px" }}>24:00 ngày Mùng 4</p>
            <div className="flex flex-col mb-4" style={{ gap: "5px", marginTop: "8px" }}>
              {[
                <>Bot DM nhắc ngày <b>mùng 1</b> hàng tháng</>,
                <>Bot chốt danh sách lúc <b>9:00 mùng 5</b></>,
                <>Danh sách trễ gửi thẳng về <b>CEO</b></>,
              ].map((row, i) => (
                <div key={i} className="flex items-start" style={{ gap: "7px", fontSize: "14px", color: "#475569" }}>
                  <span className="shrink-0 rounded-full" style={{ width: "5px", height: "5px", background: "#8b5cf6", marginTop: "5px" }} />
                  <span>{row}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center mt-auto" style={{ gap: "6px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: "#9a3412", fontWeight: 600, minHeight: "52px" }}>
              ⚠️ Nộp trễ: Phạt <b>100k</b>. Không áp dụng: <b>CEO, HĐQT/Mentor</b>
            </div>
          </a>

        </div>
      </div>

      {/* ══════════════════════════════════════
          KV3: LỆNH DISCORD — HỆ THỐNG TABS
          tab-btn: 13px/600
      ══════════════════════════════════════ */}
      <div className="mb-7">
        <h2 className="flex items-center gap-2 mb-4" style={{ fontSize: "19px", fontWeight: 800, color: "#0f172a" }}>
          <span style={{ fontSize: "20px" }}>🤖</span> Lệnh Discord Bot Của Bạn
        </h2>

        {/* tabs-wrap: pill bar, tab-btn: 13px/600 */}
        <div
          className="flex gap-1.5 mb-4 p-1 rounded-xl w-fit flex-wrap"
          style={{ background: "#f1f5f9" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="cursor-pointer border-none transition-all duration-150"
              style={{
                fontSize: "15px",
                fontWeight: 600,
                padding: "8px 18px",
                borderRadius: "8px",
                color: activeTab === tab.key
                  ? (tab.isHr ? "#fff" : "#1e3a5f")
                  : "#64748b",
                background: activeTab === tab.key
                  ? (tab.isHr ? "#1e3a5f" : "#fff")
                  : "transparent",
                boxShadow: activeTab === tab.key
                  ? (tab.isHr ? "0 1px 4px rgba(30,58,95,0.3)" : "0 1px 4px rgba(0,0,0,0.1)")
                  : "none",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div>
          {activeTab === "bao-cao"  && <TabBaoCao  selectedDept={selectedDept} />}
          {activeTab === "xin-phep" && <TabXinPhep selectedDept={selectedDept} />}
          {activeTab === "trao-doi" && <TabTraoDoi selectedDept={selectedDept} />}
          {activeTab === "hr-ceo"   && <TabHrCeo   selectedDept={selectedDept} />}
        </div>
      </div>

      {/* ══════════════════════════════════════
          KV4: NỘI QUY CẦN NHỚ
          rule-text: 13px/600  rule-sub: 11.5px
      ══════════════════════════════════════ */}
      <div className="mb-7">
        <h2 className="flex items-center gap-2 mb-4" style={{ fontSize: "19px", fontWeight: 800, color: "#0f172a" }}>
          <span style={{ fontSize: "20px" }}>📜</span> Nội Quy Cần Nhớ
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {RULES.map((r, i) => (
            <div
              key={i}
              className="bg-white flex items-start transition-all hover:-translate-y-0.5"
              style={{
                border: "1.5px solid #e2e8f0",
                borderRadius: "12px",
                padding: "14px 16px",
                gap: "12px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div className={`shrink-0 flex items-center justify-center rounded-xl ${RULE_COLOR[r.color]}`}
                style={{ width: "38px", height: "38px", borderRadius: "9px", fontSize: "19px" }}>
                {r.icon}
              </div>
              <div>
                {/* rule-text: 15px/600 */}
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", lineHeight: 1.4 }}>{r.text}</p>
                {/* rule-sub: 13px */}
                <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px", fontWeight: 400 }}>{r.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          KV5: FAQ
          faq-q: 14px/600  faq-a: 13px
      ══════════════════════════════════════ */}
      <div>
        <h2 className="flex items-center gap-2 mb-4" style={{ fontSize: "19px", fontWeight: 800, color: "#0f172a" }}>
          <span style={{ fontSize: "20px" }}>❓</span> Câu Hỏi Thường Gặp
        </h2>
        <FaqAccordion />
      </div>

    </div>
  );
}
