/**
 * Dashboard Sếp — /dashboard
 * ---------------------------
 * Vai trò: Giao diện quản lý báo cáo KPI cho Manager/CEO.
 * Tính năng:
 *   - Xem tất cả báo cáo theo tuần (filter theo tuần)
 *   - Duyệt / Trả về từng báo cáo (cập nhật cột Q trong Google Sheet)
 *   - Viết nhận xét (cột R)
 *   - Auth đơn giản: kiểm tra DASHBOARD_PASSWORD qua API nội bộ
 *
 * Luồng:
 *   [Sếp mở /dashboard] → [Nhập password] → [Load tất cả báo cáo từ GAS]
 *   → [Bấm Duyệt/Trả về + nhập comment] → [POST lên /api/dashboard]
 *   → [GAS cập nhật cột Q+R, trigger onEdit gửi Discord]
 */

"use client";

import React, { useState, useEffect } from "react";

// ───────────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────────
interface Report {
  name: string;        // Tên NV
  dept: string;        // Phòng ban
  role: string;        // Vai trò
  report_week: string; // Tuần báo cáo
  submitted_at: string;// Thời gian nộp
  is_late: boolean;    // Nộp muộn
  total_score: number; // Tổng điểm KPI
  status: string;      // "Chờ duyệt" | "Đã duyệt" | "Trả về"
  manager_comment: string; // Nhận xét Sếp
  row_index: number;   // Index dòng trong Sheet (để update đúng)
}

// ───────────────────────────────────────────────
// COMPONENT CHÍNH
// ───────────────────────────────────────────────
export default function DashboardPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const [reports, setReports] = useState<Report[]>([]);
  const [filterWeek, setFilterWeek] = useState("");
  const [weeks, setWeeks] = useState<string[]>([]);

  // Comment đang soạn cho từng báo cáo (key = name_reportWeek)
  const [comments, setComments] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  // ── Auth ────────────────────────────────────
  const handleLogin = async () => {
    const res = await fetch("/api/dashboard/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      setAuthError("");
    } else {
      setAuthError("❌ Sai mật khẩu. Thử lại!");
    }
  };

  // ── Load tất cả báo cáo ─────────────────────
  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => {
        const reps: Report[] = data.reports || [];
        setReports(reps);
        // Lấy danh sách tuần unique để filter
        const uniqueWeeks = [...new Set(reps.map((r) => r.report_week))].sort().reverse();
        setWeeks(uniqueWeeks);
        if (uniqueWeeks.length > 0) setFilterWeek(uniqueWeeks[0]);
        // Pre-fill comment từ dữ liệu cũ
        const initComments: Record<string, string> = {};
        reps.forEach((r) => {
          initComments[`${r.name}_${r.report_week}`] = r.manager_comment || "";
        });
        setComments(initComments);
      })
      .finally(() => setLoading(false));
  }, [authed]);

  // ── Cập nhật trạng thái duyệt ───────────────
  const handleStatusUpdate = async (report: Report, newStatus: "Đã duyệt" | "Trả về") => {
    const key = `${report.name}_${report.report_week}`;
    setUpdating((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: report.name,
          report_week: report.report_week,
          status: newStatus,
          manager_comment: comments[key] || "",
          row_index: report.row_index,
        }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) =>
            r.name === report.name && r.report_week === report.report_week
              ? { ...r, status: newStatus, manager_comment: comments[key] || "" }
              : r
          )
        );
        alert(`✅ Đã cập nhật: ${newStatus} cho ${report.name} — ${report.report_week}`);
      } else {
        alert("❌ Lỗi cập nhật. Thử lại!");
      }
    } finally {
      setUpdating((p) => ({ ...p, [key]: false }));
    }
  };

  // ── Lọc báo cáo theo tuần ───────────────────
  const filtered = reports.filter((r) => !filterWeek || r.report_week === filterWeek);

  // ── Màu badge trạng thái ────────────────────
  const statusColor = (status: string) => {
    if (status === "Đã duyệt") return "bg-green-100 text-green-800 border border-green-400";
    if (status === "Trả về") return "bg-red-100 text-red-800 border border-red-400";
    return "bg-yellow-100 text-yellow-800 border border-yellow-400";
  };

  // ── Màu điểm KPI ────────────────────────────
  const scoreColor = (score: number) => {
    if (score >= 8) return "text-green-700 font-bold";
    if (score >= 5) return "text-yellow-700 font-bold";
    return "text-red-700 font-bold";
  };

  // ══════════════════════════════════════════════
  // RENDER: Auth Screen
  // ══════════════════════════════════════════════
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] mb-2">Dashboard Sếp</h1>
          <p className="text-gray-500 text-sm mb-6">Nhập mật khẩu để xem báo cáo KPI</p>
          <input
            type="password"
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-black outline-none focus:border-[#1e3a5f] mb-3 text-center text-lg"
            placeholder="Mật khẩu..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoFocus
          />
          {authError && <p className="text-red-500 text-sm mb-3">{authError}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-[#1e3a5f] hover:bg-blue-800 text-white font-bold py-3 rounded-lg transition"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // RENDER: Dashboard
  // ══════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f0f4f8] text-black">
      {/* Header */}
      <div className="bg-[#1e3a5f] text-white px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📊 Dashboard KPI — IruKa Edu</h1>
          <p className="text-blue-200 text-sm mt-1">Quản lý & duyệt báo cáo tuần</p>
        </div>
        <div className="text-right text-sm text-blue-200">
          Tổng: <strong className="text-white">{filtered.length}</strong> báo cáo
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filter tuần */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          <span className="text-sm font-semibold text-gray-600 mr-2">Lọc theo tuần:</span>
          {weeks.map((w) => (
            <button
              key={w}
              onClick={() => setFilterWeek(w)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                filterWeek === w
                  ? "bg-[#1e3a5f] text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:border-blue-400"
              }`}
            >
              {w}
            </button>
          ))}
          <button
            onClick={() => setFilterWeek("")}
            className="px-4 py-1.5 rounded-full text-sm font-medium bg-white text-gray-500 border border-gray-300 hover:border-blue-400 transition"
          >
            Tất cả
          </button>
        </div>

        {loading && (
          <div className="text-center py-16 text-gray-400 animate-pulse text-lg">
            Đang tải dữ liệu từ Google Sheet...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            Không có báo cáo nào trong tuần này.
          </div>
        )}

        {/* Danh sách báo cáo */}
        <div className="grid grid-cols-1 gap-5">
          {filtered.map((r) => {
            const key = `${r.name}_${r.report_week}`;
            const isUpdating = updating[key];
            return (
              <div
                key={key}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                {/* Hàng trên: tên + badge */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-[#1e3a5f]">{r.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(r.status)}`}>
                        {r.status || "Chờ duyệt"}
                      </span>
                      {r.is_late && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300">
                          ⏰ Nộp muộn
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                      {r.dept} · {r.role} · {r.report_week}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">Nộp lúc: {r.submitted_at}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 mb-1">Điểm KPI tuần này</div>
                    <div className={`text-3xl ${scoreColor(r.total_score)}`}>
                      {r.total_score?.toFixed(2) || "—"}
                    </div>
                  </div>
                </div>

                {/* Ô nhận xét */}
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-600 mb-1 block">
                    💬 Nhận xét của Sếp
                  </label>
                  <textarea
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black outline-none focus:border-[#1e3a5f] resize-none"
                    placeholder="Viết nhận xét hoặc hướng dẫn cho nhân viên..."
                    value={comments[key] || ""}
                    onChange={(e) =>
                      setComments((p) => ({ ...p, [key]: e.target.value }))
                    }
                  />
                </div>

                {/* Nút hành động */}
                <div className="flex gap-3">
                  <button
                    disabled={isUpdating}
                    onClick={() => handleStatusUpdate(r, "Đã duyệt")}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg text-sm transition disabled:opacity-50"
                  >
                    {isUpdating ? "⏳ Đang lưu..." : "✅ Duyệt"}
                  </button>
                  <button
                    disabled={isUpdating}
                    onClick={() => handleStatusUpdate(r, "Trả về")}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg text-sm transition disabled:opacity-50"
                  >
                    {isUpdating ? "⏳ Đang lưu..." : "↩️ Trả về"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
