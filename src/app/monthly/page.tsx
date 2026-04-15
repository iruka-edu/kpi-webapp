/**
 * monthly/page.tsx — Trang Báo Cáo & Kế Hoạch KPI Tháng
 * ========================================================
 * Luồng (State Machine):
 *   loading → [token_expired | api_error | first_time | form] → success
 *
 * TH1  — Skeleton loading (đang fetch API)
 * TH2  — Lần đầu dùng (tasks = [])           → form với first_time banner
 * TH3  — Form bình thường (có data server)
 * TH4  — Token hết hạn (401/403 hoặc không có token)
 * TH5  — Lỗi API / mạng khi load
 * TH6  — Nộp thành công (full-screen success)
 * TH7  — isLate = true                        → badge cam trong header
 * TH8  — Đang nộp                             → nút loading trong ReportGrid
 * TH10 — Draft cũ                             → banner vàng trên đầu
 * TH11 — Đã nộp trước đó                     → modal xác nhận ghi đè
 * TH13 — Lỗi mạng khi nộp                    → toast đỏ góc trên phải
 *
 * Scope 1 LOCK:
 *   ✅ Sửa: src/app/monthly/page.tsx
 *   🚫 Không sửa: ReportGrid.tsx / weekly/page.tsx / kpiStore.ts / useDraftSave.ts
 *      (MonthlyReportGrid sẽ tạo ở Scope 2, thay ReportGrid tạm dùng hiện tại)
 */

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useKpiStore } from "@/store/kpiStore";
import MonthlyHeaderInfo from "@/components/MonthlyHeaderInfo";
import MonthlyReportGrid from "@/components/MonthlyReportGrid";
import MonthlyExtras from "@/components/MonthlyExtras";
import { useDraftSave, restoreDraft, clearDraft } from "@/hooks/useDraftSave";

// ── State Machine Types ─────────────────────────────────
type PageState = "loading" | "token_expired" | "api_error" | "first_time" | "form" | "success";

// ── Helper: Tính tháng báo cáo từ ngày hiện tại ─────────
function calcMonths(): { reportMonth: number; planMonth: number } {
  const now = new Date();
  const day = now.getDate();
  const m = now.getMonth() + 1; // 1-12
  // Trước ngày 10: báo cáo tháng trước. Từ ngày 10 trở đi: báo cáo tháng này.
  const reportMonth = day < 10 ? (m === 1 ? 12 : m - 1) : m;
  const planMonth = reportMonth === 12 ? 1 : reportMonth + 1;
  return { reportMonth, planMonth };
}

// ── Full-Screen Card (TH4, TH5) ─────────────────────────
function FullScreenCard({
  icon, title, desc, btnText, onBtn,
}: {
  icon: string; title: string; desc: string; btnText: string; onBtn: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, background: "#f0f4f8", fontFamily: "Inter,sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.12)", padding: "48px 40px", maxWidth: 480, textAlign: "center", width: "100%" }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#1e3a5f", marginBottom: 12 }}>{title}</div>
        <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7, whiteSpace: "pre-line", marginBottom: 28 }}>{desc}</div>
        <button
          onClick={onBtn}
          style={{ padding: "12px 36px", borderRadius: 10, fontWeight: 800, fontSize: 15, background: "#1e3a5f", color: "#fff", border: "none", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
        >
          {btnText}
        </button>
      </div>
    </div>
  );
}

// ── Success Screen (TH6) ─────────────────────────────────
function SuccessScreen({ reportMonth, pct, time }: { reportMonth: string; pct: string; time: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, background: "linear-gradient(135deg,#ecfdf5,#dbeafe)", fontFamily: "Inter,sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.12)", padding: "48px 40px", maxWidth: 520, textAlign: "center", width: "100%" }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#1e3a5f", marginBottom: 24 }}>Đã nộp báo cáo thành công!</div>

        {/* Score box */}
        <div style={{ background: "rgba(21,128,61,0.08)", border: "2px solid #bbf7d0", borderRadius: 14, padding: "20px 32px", display: "inline-block", marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>Kết quả {reportMonth}</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#15803d" }}>{pct}%</div>
          <div style={{ fontSize: 13, color: "#15803d", fontWeight: 700 }}>KH đạt được</div>
        </div>

        <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7, marginBottom: 28 }}>
          Báo cáo của bạn đã được ghi nhận vào hệ thống.<br />
          CEO sẽ xem xét và phản hồi trong vòng <strong>1–2 ngày làm việc</strong>.<br /><br />
          <span style={{ fontSize: 12, color: "#6b7280" }}>Nộp lúc: {new Date().toLocaleDateString("vi-VN")} · {time}</span><br />
          <span style={{ fontSize: 12, color: "#6b7280" }}>Bot Discord đã thông báo đến CEO ✓</span>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "12px 36px", borderRadius: 10, fontWeight: 800, fontSize: 15, background: "#15803d", color: "#fff", border: "none", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
          >
            ✅ Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Content (wrapped in Suspense) ───────────────────
function MonthlyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const nameParam = searchParams.get("name") || "";
  const discordId = searchParams.get("discord_id") || "";

  const { tasks, monthlyData, initTasks, initMonthlyData, resetStore } = useKpiStore();

  // ── State Machine ──────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>("loading");
  const [apiError, setApiError] = useState("");

  // ── User Info (lấy từ API hoặc query param) ───────────
  const [name, setName] = useState(nameParam);
  const [role, setRole] = useState("");
  const [dept, setDept] = useState("");
  const [reportTo, setReportTo] = useState("CEO");
  const [isLate, setIsLate] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  // ── Tháng báo cáo ─────────────────────────────────────
  const { reportMonth: rMonth, planMonth: pMonth } = calcMonths();
  const [reportMonthNum] = useState(rMonth);
  const [planMonthNum] = useState(pMonth);
  const reportMonthLabel = `Tháng ${reportMonthNum}`;
  const planMonthLabel = `Tháng ${planMonthNum}`;

  // ── Submit State ──────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ pct: string; time: string } | null>(null);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // ── Validation State ──────────────────────────────────
  const [invalidTaskIds, setInvalidTaskIds] = useState<string[]>([]);

  // ── Draft State ───────────────────────────────────────
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTime, setDraftTime] = useState("");

  // ── Auto-save draft (debounce 2s khi tasks thay đổi) ─
  // useDraftSave nhận 2 params: (name, reportWeek)
  useDraftSave(name, reportMonthLabel);

  // ── Fetch Data từ API ─────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      setPageState("loading");

      // Guard: chỉ báo lỗi khi không có name VÀ không có discord_id
      // (Khác weekly: monthly không dùng token — bot gửi link không kèm token)
      if (!nameParam && !discordId) {
        setPageState("token_expired");
        return;
      }

      try {
        const n = nameParam || name;
        // Monthly dùng /api/monthly riêng (param: name + month + discord_id)
        const url = `/api/monthly?name=${encodeURIComponent(n)}&month=${encodeURIComponent(reportMonthLabel)}&discord_id=${discordId}`;
        const res = await fetch(url);

        // TH4: Token hết hạn
        if (res.status === 401 || res.status === 403) {
          setPageState("token_expired");
          return;
        }

        const data = await res.json();

        // TH5: Lỗi từ server
        if (data.error) {
          setApiError(data.error);
          setPageState("api_error");
          return;
        }

        // Cập nhật thông tin người dùng từ response
        if (data.name) setName(data.name);
        if (data.role) setRole(data.role);
        if (data.dept) setDept(data.dept);
        if (data.reportTo) setReportTo(data.reportTo);
        if (data.isLate !== undefined) setIsLate(data.isLate);
        if (data.submittedAt) setSubmittedAt(data.submittedAt);

        // Tải data server trước
        const serverTasks = [...(data.tasks || [])];
        const allTasks = [...serverTasks, ...(data.planTasks || [])];
        initTasks(allTasks);
        if (data.monthlyData) initMonthlyData(data.monthlyData);

        // Kiểm tra draft — chỉ hỏi nếu draft < 72h
        const finalName = data.name || nameParam;
        const draft = restoreDraft(finalName, reportMonthLabel);
        if (draft && Date.now() - draft.savedAt < 72 * 3600 * 1000) {
          const dt = new Date(draft.savedAt);
          setDraftTime(
            `${dt.toLocaleDateString("vi-VN")} · ${dt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
          );
          setHasDraft(true);
          // Không load draft ngay, để user chọn (giữ nguyên data server trên form)
        }

        // TH2 vs TH3
        setPageState(serverTasks.length === 0 ? "first_time" : "form");
      } catch {
        setApiError("Lỗi kết nối. Kiểm tra mạng và thử lại.");
        setPageState("api_error");
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Draft Actions ─────────────────────────────────────
  const handleRestoreDraft = () => {
    const draft = restoreDraft(name, reportMonthLabel);
    if (draft) {
      initTasks(draft.tasks || []);
      // useDraftSave DraftPayload không lưu monthlyData, bỏ qua
    }
    setHasDraft(false);
  };

  const handleDiscardDraft = () => {
    clearDraft(name, reportMonthLabel);
    setHasDraft(false);
  };

  // ── Validation (3 loại theo spec) ────────────────────
  const validate = (): boolean => {
    const errIds: string[] = [];
    let valid = true;

    // Loại 1: Kiểm tra từng dòng Bảng 1 (báo cáo)
    const oldTasks = tasks.filter((t) => t.isNhiemVuCu);
    oldTasks.forEach((t) => {
      // Dòng server (không có prefix old_/new_): chỉ cần check thucHien
      const isUserAdded = t.id.startsWith("old_");
      if (isUserAdded) {
        // Dòng user tự thêm: check tất cả trường bắt buộc
        if (!t.noiDung.trim() || !t.donVi.trim() || t.keHoach === "" || t.trongSo === "" || t.thucHien === null) {
          errIds.push(t.id);
          valid = false;
        }
      } else {
        // Dòng từ server: chỉ cần điền Thực hiện
        if (t.thucHien === null) {
          errIds.push(t.id);
          valid = false;
        }
      }
    });

    // Loại 2: Bảng 2 phải có ít nhất 1 dòng
    const newTasks = tasks.filter((t) => !t.isNhiemVuCu);
    if (newTasks.length === 0) {
      errIds.push("__plan_empty__"); // Dùng ID đặc biệt để MonthlyReportGrid nhận diện (Scope 2)
      valid = false;
    } else {
      // Kiểm tra từng dòng Bảng 2
      newTasks.forEach((t) => {
        if (!t.noiDung.trim() || !t.donVi.trim() || t.keHoach === "" || t.trongSo === "") {
          errIds.push(t.id);
          valid = false;
        }
      });
    }

    // Loại 3: Thành tựu & Mục tiêu bắt buộc
    if (!monthlyData.achievements.trim() || !monthlyData.priorities.trim()) {
      errIds.push("__extras__"); // Signal cho MonthlyExtras (sẽ xử lý ở Scope 3)
      valid = false;
    }

    setInvalidTaskIds(errIds);

    // Scroll đến lỗi đầu tiên
    if (!valid) {
      setTimeout(() => {
        const firstErr = document.querySelector("[data-invalid='true']");
        if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }

    return valid;
  };

  // ── Submit Logic ──────────────────────────────────────
  const doSubmit = async () => {
    setSubmitting(true);
    try {
      // Tính % để hiển thị success screen
      const oldTasks = tasks.filter((t) => t.isNhiemVuCu);
      const totalWeight = oldTasks.reduce((s, t) => s + (t.trongSo !== "" ? Number(t.trongSo) : 0), 0);
      const totalScore = oldTasks.reduce((s, t) => s + t.datDuoc, 0);
      const pct = totalWeight > 0 ? ((totalScore / totalWeight) * 100).toFixed(1) : "0.0";

      const payload = {
        name,
        report_week: reportMonthLabel,
        plan_week: planMonthLabel,
        tasks,
        monthly_data: monthlyData,
        timestamp: new Date().toISOString(),
        type: "monthly",
      };

      const res = await fetch("/api/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Xóa draft, chuyển sang success screen (TH6)
        clearDraft(name, reportMonthLabel);
        resetStore();
        const now = new Date();
        const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        setSuccessData({ pct, time: timeStr });
        setPageState("success");
      } else {
        const err = await res.json().catch(() => ({ error: "Lỗi không xác định" }));
        showError(err.error || "Nộp thất bại — Kiểm tra kết nối mạng và thử lại");
      }
    } catch {
      showError("Nộp thất bại — Kiểm tra kết nối mạng và thử lại");
    } finally {
      setSubmitting(false);
    }
  };

  const showError = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const handleSubmit = () => {
    if (!validate()) return;
    // TH11: Đã từng nộp → modal xác nhận
    if (submittedAt) {
      setShowResubmitModal(true);
      return;
    }
    doSubmit();
  };

  // ════════════════════════════════════════════════
  //  RENDER — State Machine
  // ════════════════════════════════════════════════

  // TH1 — Skeleton Loading
  if (pageState === "loading") {
    return (
      <>
        <style>{`@keyframes skpulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px", fontFamily: "Inter,sans-serif" }}>
          {/* Title skeleton */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 32 }}>
            <div style={{ width: 340, height: 38, background: "#e5e7eb", borderRadius: 8, animation: "skpulse 1.5s ease-in-out infinite" }} />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ width: 160, height: 32, background: "#e5e7eb", borderRadius: 999, animation: "skpulse 1.5s ease-in-out infinite" }} />
              <div style={{ width: 160, height: 32, background: "#e5e7eb", borderRadius: 999, animation: "skpulse 1.5s ease-in-out infinite" }} />
            </div>
          </div>
          {/* Info table skeleton */}
          <div style={{ height: 110, background: "#e5e7eb", borderRadius: 8, marginBottom: 24, animation: "skpulse 1.5s ease-in-out infinite" }} />
          {/* Table skeleton */}
          <div style={{ height: 44, background: "#1e3a5f", borderRadius: "8px 8px 0 0", opacity: 0.7, animation: "skpulse 1.5s ease-in-out infinite" }} />
          {[0.85, 0.65, 0.45, 0.28].map((op, i) => (
            <div key={i} style={{ height: 52, background: "#e5e7eb", borderBottom: "1px solid #f3f4f6", opacity: op, animation: "skpulse 1.5s ease-in-out infinite" }} />
          ))}
          <p style={{ textAlign: "center", marginTop: 20, color: "#9ca3af", fontStyle: "italic", fontSize: 13 }}>
            ⏳ Đang tải dữ liệu...
          </p>
        </div>
      </>
    );
  }

  // TH4 — Token hết hạn
  if (pageState === "token_expired") {
    return (
      <FullScreenCard
        icon="🔗"
        title="Link đã hết hạn"
        desc={"Link báo cáo chỉ có hiệu lực trong 72 giờ.\nVui lòng liên hệ quản lý để nhận link mới,\nhoặc kiểm tra lại email."}
        btnText="🔄 Thử lại"
        onBtn={() => window.location.reload()}
      />
    );
  }

  // TH5 — Lỗi API
  if (pageState === "api_error") {
    return (
      <FullScreenCard
        icon="⚠️"
        title="Không thể tải dữ liệu"
        desc={`Hệ thống gặp sự cố khi tải dữ liệu.\nCó thể do mạng không ổn định hoặc server đang bảo trì.\n\nError: ${apiError}`}
        btnText="🔄 Thử tải lại"
        onBtn={() => window.location.reload()}
      />
    );
  }

  // TH6 — Success screen
  if (pageState === "success" && successData) {
    return <SuccessScreen reportMonth={reportMonthLabel} pct={successData.pct} time={successData.time} />;
  }

  // TH2 / TH3 / TH7 / TH8 / TH10 / TH11 / TH13 — Form chính
  const isFirstTime = pageState === "first_time";
  const extrasHasError = invalidTaskIds.includes("__extras__");
  const planEmpty = invalidTaskIds.includes("__plan_empty__");

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.65} }
        @keyframes skpulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>

      <div
        style={{ maxWidth: 1600, margin: "0 auto", padding: "0 16px 120px", fontFamily: "Inter, sans-serif", color: "#111" }}
      >
        {/* ── TH10: Draft Banner ─────────────────────────────── */}
        {hasDraft && (
          <div
            style={{
              background: "#fffbeb", border: "2px solid #f59e0b", borderRadius: 10,
              padding: "14px 18px", display: "flex", alignItems: "center", gap: 16,
              flexWrap: "wrap", marginBottom: 20, marginTop: 12,
            }}
          >
            <span style={{ fontSize: 28, flexShrink: 0 }}>💾</span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#92400e" }}>Bạn có bản nháp chưa nộp từ trước</div>
              <div style={{ fontSize: 13, color: "#78350f", marginTop: 2 }}>
                Lưu lúc: {draftTime} — Bạn muốn tiếp tục hay bắt đầu lại?
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={handleDiscardDraft}
                style={{ background: "none", color: "#6b7280", border: "1px solid #d1d5db", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 13 }}
              >
                🗑 Bắt đầu lại
              </button>
              <button
                onClick={handleRestoreDraft}
                style={{ background: "#f59e0b", color: "#111", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 13 }}
              >
                📂 Khôi phục nháp
              </button>
            </div>
          </div>
        )}

        {/* ── Header: Sticky + Info Table + Guide Box ─────── */}
        <MonthlyHeaderInfo
          name={name}
          role={role}
          dept={dept}
          date={new Date().toLocaleDateString("vi-VN")}
          reportMonth={reportMonthLabel}
          planMonth={planMonthLabel}
          reportTo={reportTo}
          isLate={isLate}
        />

        {/* ── blocks-scroll: 4 khối scroll ngang đồng bộ — spec mục 3 ── */}
        <div style={{ overflowX: "auto", width: "100%" }}>
          <div style={{ minWidth: 1280, display: "flex", flexDirection: "column", gap: 32 }}>

            {/* ── Bảng KPI — MonthlyReportGrid ── */}
            <MonthlyReportGrid
              reportMonth={reportMonthLabel}
              planMonth={planMonthLabel}
              onSubmit={handleSubmit}
              isSubmitting={submitting}
              invalidTaskIds={invalidTaskIds}
              isFirstTime={isFirstTime}
              onClearError={(id) =>
                setInvalidTaskIds((prev) => prev.filter((eid) => eid !== id))
              }
            />

            {/* ── Thành tựu & Tự đánh giá ── */}
            <div>
              {/* Cảnh báo extras trống (Loại 3) */}
              {extrasHasError && (
                <div
                  data-invalid="true"
                  style={{
                    background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8,
                    padding: "10px 16px", fontSize: 13, color: "#dc2626", fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
                  }}
                >
                  ⚠️ Vui lòng điền &quot;Thành tựu nổi bật&quot; và &quot;Mục tiêu tháng tới&quot; trước khi nộp
                </div>
              )}
              <MonthlyExtras />
            </div>

          </div>
        </div>
      </div>

      {/* ── TH11: Resubmit Confirmation Modal ─────────────── */}
      {showResubmitModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{ background: "#fff", borderRadius: 20, boxShadow: "0 25px 60px rgba(0,0,0,0.3)", padding: "36px 40px", maxWidth: 440, width: "90%" }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1e3a5f", marginBottom: 12 }}>
              📤 Bạn đã nộp báo cáo này rồi
            </div>
            <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7, marginBottom: 24 }}>
              Báo cáo <strong>{reportMonthLabel}</strong> đã được nộp lúc <strong>{submittedAt}</strong>.<br />
              Nếu bạn nộp lại, dữ liệu cũ sẽ bị <strong>ghi đè hoàn toàn</strong>. CEO sẽ nhận thông báo mới.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowResubmitModal(false)}
                style={{ padding: "10px 22px", borderRadius: 10, fontWeight: 700, fontSize: 14, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
              >
                Huỷ — Giữ lần nộp cũ
              </button>
              <button
                onClick={() => { setShowResubmitModal(false); doSubmit(); }}
                style={{ padding: "10px 22px", borderRadius: 10, fontWeight: 700, fontSize: 14, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
              >
                🔄 Nộp lại & Ghi đè
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TH13: Error Toast ─────────────────────────────── */}
      {showToast && (
        <div
          style={{
            position: "fixed", top: 16, right: 16, zIndex: 200,
            background: "#dc2626", color: "#fff",
            padding: "14px 18px", borderRadius: 14, fontWeight: 600, fontSize: 14,
            boxShadow: "0 10px 40px rgba(0,0,0,0.18)",
            display: "flex", alignItems: "center", gap: 12, maxWidth: 380,
          }}
        >
          <span>❌</span>
          <span style={{ flex: 1 }}>{toastMsg}</span>
          <span
            style={{ fontSize: 18, opacity: 0.75, cursor: "pointer", marginLeft: 6 }}
            onClick={() => setShowToast(false)}
          >
            ×
          </span>
        </div>
      )}
    </>
  );
}

// ── Page Export (Suspense wrapper bắt buộc cho useSearchParams) ──
export default function MonthlyPage() {
  return (
    <Suspense fallback={null}>
      <MonthlyContent />
    </Suspense>
  );
}
