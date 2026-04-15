/**
 * MonthlyReportGrid.tsx — Lưới KPI 2 Bảng chuyên dụng cho Báo cáo Tháng
 * =======================================================================
 * Vai trò: Thay thế ReportGrid.tsx trong monthly/page.tsx
 *          (ReportGrid.tsx giữ nguyên, dùng riêng cho Weekly)
 *
 * Cấu trúc:
 *   ┌──────────────────────────────────────────┐
 *   │  [Bảng 1] BÁO CÁO tháng trước            │
 *   │    → Server rows: chỉ điền cột Thực hiện  │
 *   │    → User rows: điền tất cả               │
 *   │    → Summary row tổng kết cuối bảng       │
 *   │    → Nút "＋ Thêm đầu việc tháng trước"   │
 *   │                                           │
 *   │  [Bảng 2] KẾ HOẠCH tháng tới             │
 *   │    → Tất cả rows tự điền                  │
 *   │    → Ô Thực hiện = "Tháng sau chốt"       │
 *   │    → % và Điểm = "—"                      │
 *   │    → Nút "＋ Thêm đầu việc mới"           │
 *   │                                           │
 *   │  [Bottom Bar Fixed]                       │
 *   │    → "Tháng X Đạt {pct}% KH"             │
 *   │    → Nút NỘP BÁO CÁO                      │
 *   └──────────────────────────────────────────┘
 *
 * Phân biệt Row Types:
 *   server_old : isNhiemVuCu=true  && !id.startsWith('old_')  → Lock, không xóa
 *   user_old   : isNhiemVuCu=true  && id.startsWith('old_')   → Edit all, có xóa
 *   user_new   : isNhiemVuCu=false                            → Edit all, "Tháng sau chốt"
 *
 * Scope 2 LOCK:
 *   ✅ Tạo mới: src/components/MonthlyReportGrid.tsx
 *   🚫 Không sửa: ReportGrid.tsx / weekly/page.tsx / kpiStore.ts
 */

"use client";

import React from "react";
import { Trash2, PlusCircle } from "lucide-react";
import { useKpiStore } from "@/store/kpiStore";

// ── Props ────────────────────────────────────────────────
type Props = {
  reportMonth: string;      // "Tháng 3"
  planMonth: string;        // "Tháng 4"
  onSubmit: () => void;
  isSubmitting: boolean;
  invalidTaskIds: string[]; // IDs lỗi + "__plan_empty__" + "__extras__"
  isFirstTime: boolean;
  onClearError?: (id: string) => void; // Tự xóa lỗi khi user gõ vào ô đang đỏ
};

// ── Format Helpers ────────────────────────────────────────
// "100.0" → "100%",  "87.5" → "87.5%",  null → "—"
function fmtPct(phanTram: number, thucHien: number | null): string {
  if (thucHien === null) return "—";
  const s = phanTram.toFixed(1);
  return (s.endsWith(".0") ? s.slice(0, -2) : s) + "%";
}

// "3.00" → "3",  "2.63" → "2.63",  "2.50" → "2.5",  null → "—"
function fmtScore(datDuoc: number, thucHien: number | null, trongSo: number | ""): string {
  if (thucHien === null || trongSo === "") return "—";
  return datDuoc.toFixed(2).replace(/\.?0+$/, "") || "0";
}

// ────────────────────────────────────────────────────────
//  CSS CONSTANTS
// ────────────────────────────────────────────────────────
const NAVY = "#1e3a5f";
const GREEN = "#15803d";
const BORDER = "#d1d5db";

const thBase: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.15)",
  padding: "10px 8px",
  textAlign: "center",
  whiteSpace: "nowrap",
  fontWeight: 700,
  fontSize: 13,
};
const tdBase: React.CSSProperties = {
  border: `1px solid ${BORDER}`,
  padding: 4,
  verticalAlign: "middle",
};
const inputBase: React.CSSProperties = {
  fontFamily: "Inter,sans-serif",
  fontSize: 13,
  border: `2px solid ${BORDER}`,
  borderRadius: 3,
  padding: 8,
  outline: "none",
  color: "#111",
  width: "100%",
  background: "#fff",
  transition: "border-color 0.15s",
};
const textareaStyle: React.CSSProperties = {
  ...inputBase,
  resize: "vertical",
  minHeight: 60,
  display: "block",
};
const cellRo: React.CSSProperties  = { padding: 8, color: "#111", fontWeight: 500 };
const cellRoC: React.CSSProperties = { padding: 8, textAlign: "center", fontWeight: 500, color: "#111" };
const cellPct: React.CSSProperties = {
  background: "rgba(240,253,244,0.6)",
  border: "1px solid #bbf7d0",
  padding: 8,
  textAlign: "center",
  fontWeight: 700,
  color: GREEN,
};
const cellDash: React.CSSProperties = {
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  padding: 8,
  textAlign: "center",
  color: "#9ca3af",
  fontWeight: 700,
};
const cellPending: React.CSSProperties = {
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  padding: 8,
  textAlign: "center",
  color: "#6b7280",
  fontSize: 11,
  fontStyle: "italic",
  fontWeight: 500,
  whiteSpace: "nowrap",
};
const deleteBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#f87171",
  padding: 8,
  lineHeight: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "auto",
  transition: "color 0.15s",
};
// Lỗi highlight đỏ
function errStyle(isErr: boolean): React.CSSProperties {
  return isErr
    ? { borderColor: "#dc2626", background: "#fef2f2", boxShadow: "0 0 0 2px rgba(220,38,38,0.15)" }
    : {};
}

// ── Dấu * bắt buộc (trên nền navy) ─────────────────────
function Req() {
  return <span style={{ color: "#fca5a5" }}> *</span>;
}

// ────────────────────────────────────────────────────────
//  THEAD BẢNG 1 — Báo cáo tháng trước
// ────────────────────────────────────────────────────────
function TableHeader1() {
  return (
    <thead>
      <tr style={{ background: NAVY, color: "#fff" }}>
        <th style={{ ...thBase, width: 40 }}>STT</th>
        <th style={{ ...thBase, minWidth: 380, textAlign: "left" }}>
          Nội dung công việc <Req />
        </th>
        <th style={{ ...thBase, minWidth: 230, textAlign: "left" }}>Ghi chú tiến độ</th>
        <th style={{ ...thBase, minWidth: 70 }}>Đơn vị <Req /></th>
        <th style={{ ...thBase, minWidth: 110 }}>Số lượng (KH) <Req /></th>
        {/* Cột Thực hiện bảng 1: nền vàng, chữ nghiêng */}
        <th style={{ ...thBase, minWidth: 115, background: "#ca8a04", fontStyle: "italic" }}>
          Thực hiện <Req />
        </th>
        <th style={{ ...thBase, minWidth: 110 }}>% Hoàn Thành</th>
        <th style={{ ...thBase, minWidth: 80 }}>Trọng số <Req /></th>
        <th style={{ ...thBase, minWidth: 80 }}>Đạt được</th>
        <th style={{ ...thBase, width: 44 }}>Xóa</th>
      </tr>
    </thead>
  );
}

// ────────────────────────────────────────────────────────
//  THEAD BẢNG 2 — Kế hoạch tháng tới
// ────────────────────────────────────────────────────────
function TableHeader2() {
  return (
    <thead>
      <tr style={{ background: NAVY, color: "#fff" }}>
        <th style={{ ...thBase, width: 40 }}>STT</th>
        <th style={{ ...thBase, minWidth: 380, textAlign: "left" }}>
          Nội dung công việc <Req />
        </th>
        {/* Label khác: "Ghi chú / Mục tiêu cụ thể" */}
        <th style={{ ...thBase, minWidth: 230, textAlign: "left" }}>Ghi chú / Mục tiêu cụ thể</th>
        <th style={{ ...thBase, minWidth: 70 }}>Đơn vị <Req /></th>
        <th style={{ ...thBase, minWidth: 110 }}>Số lượng (KH) <Req /></th>
        {/* Cột Thực hiện bảng 2: nền vàng đồng bộ bảng 1 */}
        <th style={{ ...thBase, minWidth: 115, background: "#ca8a04" }}>Thực hiện</th>
        <th style={{ ...thBase, minWidth: 110 }}>% Hoàn Thành</th>
        <th style={{ ...thBase, minWidth: 80 }}>Trọng số <Req /></th>
        <th style={{ ...thBase, minWidth: 80 }}>Đạt được</th>
        <th style={{ ...thBase, width: 44 }}>Xóa</th>
      </tr>
    </thead>
  );
}

// ────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ────────────────────────────────────────────────────────
export default function MonthlyReportGrid({
  reportMonth,
  planMonth,
  onSubmit,
  isSubmitting,
  invalidTaskIds,
  isFirstTime,
  onClearError,
}: Props) {
  const {
    tasks,
    updateThucHien,
    updateTaskField,
    addTask,
    addOldTask,
    removeTask,
  } = useKpiStore();

  // Phân loại tasks
  const oldTasks = tasks.filter((t) => t.isNhiemVuCu);
  const newTasks = tasks.filter((t) => !t.isNhiemVuCu);

  // Tính tổng để hiển thị summary row & bottom bar
  const totalWeight = oldTasks.reduce(
    (s, t) => s + (t.trongSo !== "" ? Number(t.trongSo) : 0),
    0
  );
  const totalScore = oldTasks.reduce((s, t) => {
    if (t.thucHien === null || t.trongSo === "") return s;
    return s + t.datDuoc;
  }, 0);
  const pct = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

  // Tách số tháng để hiển thị "Tháng 3 Đạt"
  const monthNumMatch = reportMonth.match(/\d+/);
  const monthNum = monthNumMatch ? monthNumMatch[0] : "";

  // Plan empty error
  const planEmpty = invalidTaskIds.includes("__plan_empty__");

  // ── Render: Select Trọng số ──────────────────────────
  const renderTsSelect = (taskId: string, value: number | "", isErr: boolean) => (
    <select
      value={value}
      onChange={(e) => {
        updateTaskField(taskId, "trongSo", e.target.value === "" ? "" : parseInt(e.target.value));
        if (e.target.value !== "") onClearError?.(taskId); // auto-clear lỗi
      }}
      style={{ ...inputBase, textAlign: "center", fontWeight: 700, ...errStyle(isErr && value === "") }}
    >
      <option value="" disabled>-- chọn --</option>
      <option value={1}>1</option>
      <option value={2}>2</option>
      <option value={3}>3</option>
    </select>
  );

  return (
    <div style={{ width: "100%", paddingBottom: 100 }}>

      {/* ── TH2: First-time Welcome Banner ────────────────── */}
      {isFirstTime && (
        <div
          style={{
            background: "linear-gradient(135deg,#eff6ff,#f0fdf4)",
            border: "2px solid #93c5fd",
            borderRadius: 12,
            padding: "24px 28px",
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 40, lineHeight: 1, flexShrink: 0 }}>👋</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: NAVY, marginBottom: 8 }}>
              Chào mừng bạn lần đầu dùng hệ thống!
            </div>
            <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7 }}>
              Bảng <strong>Báo cáo tháng trước</strong> đang trống — bạn cần tự điền kết quả từ file Excel cũ.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", marginTop: 8 }}>
              {["① Nhớ lại KH và thực hiện tháng trước", "② Bấm \"Thêm đầu việc tháng trước\"", "③ Điền đủ các cột rồi nộp"].map((s) => (
                <span key={s} style={{ display: "inline-flex", alignItems: "center", background: "#dbeafe", color: "#1e40af", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          BẢNG 1: BÁO CÁO THÁNG TRƯỚC
      ══════════════════════════════════════════════════ */}
      <div style={{ width: "100%", marginBottom: 32 }}>
        {/* Section Banner Bảng 1 */}
        <div
          style={{
            background: `rgba(30,58,95,0.1)`,
            borderTop: `1px solid ${BORDER}`,
            borderLeft: `1px solid ${BORDER}`,
            borderRight: `1px solid ${BORDER}`,
            borderRadius: "8px 8px 0 0",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>📋</span>
          <span style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: NAVY, fontSize: 13 }}>
            Báo Cáo {reportMonth}
          </span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>
            {isFirstTime ? "Lần đầu: Tự điền từ Excel cũ" : "Điền cột Thực hiện để chốt kết quả"}
          </span>
        </div>

        {/* Bọc overflow-x để scroll ngang */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: `1px solid ${BORDER}`,
              fontSize: 13,
            }}
          >
            <TableHeader1 />
            <tbody>

              {/* Dòng placeholder khi bảng 1 trống */}
              {oldTasks.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      padding: 32, textAlign: "center", color: "#9ca3af",
                      fontStyle: "italic", fontSize: 13, background: "#fafafa",
                      border: `1px dashed ${BORDER}`,
                    }}
                  >
                    Chưa có đầu việc nào — Bấm nút bên dưới để thêm
                  </td>
                </tr>
              )}

              {/* Các dòng bảng 1 */}
              {oldTasks.map((t, idx) => {
                const isErr      = invalidTaskIds.includes(t.id);
                const isUserOld  = t.id.startsWith("old_"); // user_old: edit all
                // server_old: chỉ edit Thực hiện
                const pctStr   = fmtPct(t.phanTram, t.thucHien);
                const scoreStr = fmtScore(t.datDuoc, t.thucHien, t.trongSo);

                return (
                  <tr
                    key={t.id}
                    style={{ background: "rgba(239,246,255,0.3)", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,246,255,0.6)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,246,255,0.3)")}
                    data-invalid={isErr ? "true" : "false"}
                  >
                    {/* STT */}
                    <td style={{ ...tdBase, textAlign: "center", fontWeight: 500, padding: 8 }}>{idx + 1}</td>

                    {/* Nội dung công việc */}
                    <td style={tdBase}>
                      {isUserOld ? (
                        <textarea
                          style={{ ...textareaStyle, ...errStyle(isErr && !t.noiDung.trim()) }}
                          value={t.noiDung}
                          onChange={(e) => {
                            updateTaskField(t.id, "noiDung", e.target.value);
                            if (e.target.value.trim()) onClearError?.(t.id);
                          }}
                          placeholder="Tên đầu việc tháng trước..."
                        />
                      ) : (
                        <div style={cellRo}>{t.noiDung}</div>
                      )}
                    </td>

                    {/* Ghi chú tiến độ */}
                    <td style={tdBase}>
                      {isUserOld ? (
                        <textarea
                          style={textareaStyle}
                          value={t.ghiChu}
                          onChange={(e) => updateTaskField(t.id, "ghiChu", e.target.value)}
                          placeholder="Ghi chú tiến độ..."
                        />
                      ) : (
                        <div style={cellRo}>{t.ghiChu}</div>
                      )}
                    </td>

                    {/* Đơn vị */}
                    <td style={tdBase}>
                      {isUserOld ? (
                        <input
                          type="text"
                          style={{ ...inputBase, textAlign: "center", ...errStyle(isErr && !t.donVi.trim()) }}
                          value={t.donVi}
                          onChange={(e) => {
                            updateTaskField(t.id, "donVi", e.target.value);
                            if (e.target.value.trim()) onClearError?.(t.id);
                          }}
                          placeholder="VD: Bài"
                        />
                      ) : (
                        <div style={cellRoC}>{t.donVi}</div>
                      )}
                    </td>

                    {/* Số lượng KH */}
                    <td style={tdBase}>
                      {isUserOld ? (
                        <input
                          type="number"
                          min={0}
                          step={1}
                          style={{ ...inputBase, textAlign: "center", fontWeight: 700, ...errStyle(isErr && (t.keHoach === "" || !t.keHoach)) }}
                          value={t.keHoach === "" ? "" : t.keHoach}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            const val = isNaN(v) ? "" : Math.max(0, v);
                            updateTaskField(t.id, "keHoach", val);
                            if (val !== "") onClearError?.(t.id);
                          }}
                          placeholder="VD: 5"
                        />
                      ) : (
                        <div style={cellRoC}>{t.keHoach}</div>
                      )}
                    </td>

                    {/* Thực hiện — LUÔN là input vàng (cả server_old lẫn user_old) */}
                    <td style={tdBase}>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        style={{
                          ...inputBase,
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: 14,
                          background: "#fefce8",
                          borderColor: isErr && t.thucHien === null ? "#dc2626" : "#eab308",
                          boxShadow: isErr && t.thucHien === null ? "0 0 0 2px rgba(220,38,38,0.15)" : undefined,
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#ca8a04"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(234,179,8,0.25)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = t.thucHien === null && isErr ? "#dc2626" : "#eab308"; e.currentTarget.style.boxShadow = "none"; }}
                        value={t.thucHien !== null ? t.thucHien : ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : parseFloat(e.target.value);
                          updateThucHien(t.id, v);
                          if (v !== null) onClearError?.(t.id);
                        }}
                        placeholder="?"
                      />
                    </td>

                    {/* % Hoàn Thành */}
                    <td style={tdBase}>
                      <div style={pctStr === "—" ? cellDash : cellPct}>{pctStr}</div>
                    </td>

                    {/* Trọng số */}
                    <td style={tdBase}>
                      {isUserOld ? (
                        renderTsSelect(t.id, t.trongSo, isErr)
                      ) : (
                        <div style={cellRoC}>{t.trongSo}</div>
                      )}
                    </td>

                    {/* Đạt được */}
                    <td style={tdBase}>
                      <div style={scoreStr === "—" ? cellDash : cellPct}>{scoreStr}</div>
                    </td>

                    {/* Xóa — chỉ user_old */}
                    <td style={{ ...tdBase, textAlign: "center" }}>
                      {isUserOld ? (
                        <button
                          style={deleteBtn}
                          onClick={() => removeTask(t.id)}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#b91c1c")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#f87171")}
                          title="Xóa đầu việc"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <span style={{ color: "#d1d5db", display: "flex", justifyContent: "center", padding: 8 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Nút thêm dòng Bảng 1 — LUÔN HIỆN (user có thể bổ sung bất kỳ lúc) */}
              <tr>
                <td
                  colSpan={10}
                  style={{
                    border: "1px dashed #93c5fd",
                    background: "rgba(239,246,255,0.2)",
                    padding: 10,
                    textAlign: "center",
                  }}
                >
                  <button
                    onClick={addOldTask}
                    style={{
                      color: NAVY, fontWeight: 600, fontSize: 13,
                      cursor: "pointer", background: "none", border: "none",
                      fontFamily: "Inter,sans-serif",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#1d4ed8")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = NAVY)}
                  >
                    <PlusCircle size={15} />
                    Thêm đầu việc tháng trước
                  </button>
                </td>
              </tr>

              {/* Summary Row — tổng kết bảng 1 */}
              <tr>
                <td
                  colSpan={6}
                  style={{
                    background: "rgba(30,58,95,0.05)",
                    border: `1px solid ${BORDER}`,
                    padding: "8px 12px",
                    fontWeight: 700,
                    color: NAVY,
                    fontSize: 13,
                  }}
                >
                  📊 Tổng kết {reportMonth}
                </td>
                <td
                  colSpan={2}
                  style={{
                    background: "rgba(30,58,95,0.05)",
                    border: `1px solid ${BORDER}`,
                    padding: 8,
                    textAlign: "center",
                    color: GREEN,
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Tổng trọng số: <strong>{totalWeight}</strong>
                </td>
                <td
                  colSpan={2}
                  style={{
                    background: "rgba(30,58,95,0.05)",
                    border: `1px solid ${BORDER}`,
                    padding: 8,
                    textAlign: "center",
                    color: GREEN,
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Đạt: <strong>{totalScore.toFixed(1).replace(/\.0$/, "")} / {totalWeight}</strong>
                  {" → "}
                  <span style={{ color: GREEN, fontSize: 15, fontWeight: 900 }}>
                    {pct.toFixed(1).replace(/\.0$/, "")}% KH
                  </span>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          BẢNG 2: KẾ HOẠCH THÁNG TỚI
      ══════════════════════════════════════════════════ */}
      <div style={{ width: "100%", marginBottom: 32 }}>
        {/* Section Banner Bảng 2 */}
        <div
          style={{
            background: "#e5e7eb",
            borderTop: `1px solid ${BORDER}`,
            borderLeft: `1px solid ${BORDER}`,
            borderRight: `1px solid ${BORDER}`,
            borderRadius: "8px 8px 0 0",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            // Đổi màu đỏ khi plan trống
            ...(planEmpty ? { background: "#fef2f2", borderColor: "#dc2626", color: "#991b1b" } : {}),
          }}
        >
          <span style={{ fontSize: 18 }}>🗓️</span>
          <span
            style={{
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontSize: 13,
              color: planEmpty ? "#991b1b" : "#111",
            }}
          >
            Kế Hoạch {planMonth}
          </span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: planEmpty ? "#dc2626" : "#6b7280", fontStyle: "italic" }}>
            {planEmpty ? "⚠️ Chưa có đầu việc nào" : "Lên kế hoạch đầu việc tháng tới"}
          </span>
        </div>

        {/* Bọc overflow-x */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: planEmpty ? "1px solid #fca5a5" : `1px solid ${BORDER}`,
              fontSize: 13,
            }}
          >
            <TableHeader2 />
            <tbody>

              {/* Dòng placeholder chỉ hiện khi hoàn toàn trống (không có task nào) — đã có addTask tự động */}

              {/* Các dòng bảng 2 */}
              {newTasks.map((t, idx) => {
                const isErr = invalidTaskIds.includes(t.id);
                return (
                  <tr
                    key={t.id}
                    style={{ background: "#fff", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                    data-invalid={isErr ? "true" : "false"}
                  >
                    {/* STT */}
                    <td style={{ ...tdBase, textAlign: "center", fontWeight: 500, padding: 8 }}>{idx + 1}</td>

                    {/* Nội dung */}
                    <td style={tdBase}>
                      <textarea
                        style={{ ...textareaStyle, ...errStyle(isErr && !t.noiDung.trim()) }}
                        value={t.noiDung}
                        onChange={(e) => {
                          updateTaskField(t.id, "noiDung", e.target.value);
                          if (e.target.value.trim()) onClearError?.(t.id);
                        }}
                        placeholder="Tên đầu việc tháng tới..."
                      />
                    </td>

                    {/* Ghi chú / Mục tiêu */}
                    <td style={tdBase}>
                      <textarea
                        style={textareaStyle}
                        value={t.ghiChu}
                        onChange={(e) => updateTaskField(t.id, "ghiChu", e.target.value)}
                        placeholder="Mô tả chi tiết..."
                      />
                    </td>

                    {/* Đơn vị */}
                    <td style={tdBase}>
                      <input
                        type="text"
                        style={{ ...inputBase, textAlign: "center", ...errStyle(isErr && !t.donVi.trim()) }}
                        value={t.donVi}
                        onChange={(e) => {
                          updateTaskField(t.id, "donVi", e.target.value);
                          if (e.target.value.trim()) onClearError?.(t.id);
                        }}
                        placeholder="VD: Bài"
                      />
                    </td>

                    {/* Số lượng KH */}
                    <td style={tdBase}>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        style={{ ...inputBase, textAlign: "center", fontWeight: 700, ...errStyle(isErr && (t.keHoach === "" || !t.keHoach)) }}
                        value={t.keHoach === "" ? "" : t.keHoach}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          const val = isNaN(v) ? "" : Math.max(0, v);
                          updateTaskField(t.id, "keHoach", val);
                          if (val !== "") onClearError?.(t.id);
                        }}
                        placeholder="VD: 5"
                      />
                    </td>

                    {/* Thực hiện — CELL PENDING (không nhập được) */}
                    <td style={tdBase}>
                      <div style={cellPending}>Tháng sau chốt</div>
                    </td>

                    {/* % — DASH */}
                    <td style={tdBase}>
                      <div style={cellDash}>—</div>
                    </td>

                    {/* Trọng số */}
                    <td style={tdBase}>
                      {renderTsSelect(t.id, t.trongSo, isErr)}
                    </td>

                    {/* Đạt được — DASH */}
                    <td style={tdBase}>
                      <div style={cellDash}>—</div>
                    </td>

                    {/* Xóa */}
                    <td style={{ ...tdBase, textAlign: "center" }}>
                      <button
                        style={deleteBtn}
                        onClick={() => removeTask(t.id)}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#b91c1c")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#f87171")}
                        title="Xóa đầu việc"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Nút thêm dòng Bảng 2 */}
              <tr>
                <td
                  colSpan={10}
                  style={{
                    border: planEmpty ? "1px dashed #fca5a5" : "1px dashed #d1d5db",
                    background: planEmpty ? "#fff5f5" : "rgba(249,250,251,0.3)",
                    padding: 10,
                    textAlign: "center",
                  }}
                >
                  <button
                    onClick={addTask}
                    style={{
                      color: "#2563eb", fontWeight: 600, fontSize: 13,
                      cursor: "pointer", background: "none", border: "none",
                      fontFamily: "Inter,sans-serif",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#1d4ed8")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#2563eb")}
                  >
                    <PlusCircle size={15} />
                    Thêm đầu việc mới
                  </button>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Thông báo lỗi bảng 2 trống */}
        {planEmpty && (
          <div
            data-invalid="true"
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderTop: "none",
              borderRadius: "0 0 8px 8px",
              padding: "10px 16px",
              fontSize: 13,
              color: "#dc2626",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ⚠️ Kế hoạch tháng tới phải có ít nhất 1 đầu việc — Bấm &quot;Thêm đầu việc mới&quot; để thêm
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          BOTTOM BAR FIXED — Kết quả + Nút nộp
      ══════════════════════════════════════════════════ */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderTop: `2px solid ${NAVY}`,
          boxShadow: "0 -10px 20px -3px rgba(0,0,0,0.12)",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {/* Score display */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 10,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                fontWeight: 600,
              }}
            >
              Kết quả hoàn thành
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                justifyContent: "flex-end",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>
                Tháng {monthNum} Đạt
              </span>
              <span style={{ fontSize: 32, fontWeight: 900, color: GREEN }}>
                {pct.toFixed(1).replace(/\.0$/, "")}%
              </span>
              <span style={{ fontSize: 14, fontWeight: 900, color: GREEN }}>KH</span>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ position: "relative" }}>
            {/* Glow effect */}
            {!isSubmitting && (
              <span
                style={{
                  position: "absolute",
                  inset: -4,
                  borderRadius: 14,
                  background: "#60a5fa",
                  filter: "blur(12px)",
                  opacity: 0.5,
                  zIndex: -1,
                  animation: "pulse 2s infinite",
                }}
              />
            )}
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              style={{
                position: "relative",
                fontWeight: 900,
                padding: "12px 56px",
                borderRadius: 12,
                color: "#fff",
                fontSize: 18,
                whiteSpace: "nowrap",
                border: "none",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                zIndex: 10,
                fontFamily: "Inter,sans-serif",
                transition: "all 0.15s",
                ...(isSubmitting
                  ? {
                      background: "#9ca3af",
                      boxShadow: "none",
                      borderBottom: "5px solid #6b7280",
                    }
                  : {
                      background: "linear-gradient(135deg,#3b82f6 0%,#1e3a5f 100%)",
                      boxShadow: "0 10px 25px rgba(59,130,246,0.6)",
                      borderBottom: `5px solid ${NAVY}`,
                      borderTop: "1px solid rgba(255,255,255,0.3)",
                    }),
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 15px 35px rgba(59,130,246,0.9)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = isSubmitting ? "none" : "0 10px 25px rgba(59,130,246,0.6)";
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {isSubmitting ? "⏳ Đang nộp..." : "📤 NỘP BÁO CÁO"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

