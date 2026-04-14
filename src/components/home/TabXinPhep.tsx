import React from "react";
// ═══════════════════════════════════════════════════════════════════
// TabXinPhep — Tab "📅 Xin Phép & Điều Chỉnh"
// Lệnh: /leave, /late, /early, /mystatus
// Font sizes & bold đồng bộ mockup
// ═══════════════════════════════════════════════════════════════════

const BAR: Record<string, string> = {
  green: "#10b981",
  blue:  "#3b82f6",
  navy:  "#1e3a5f",
  teal:  "#14b8a6",
};

const CMD_STYLE: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "16px",
  fontWeight: 700,
  background: "#f1f5f9",
  color: "#1e3a5f",
  padding: "4px 10px",
  borderRadius: "7px",
  border: "1px solid #e2e8f0",
};

const WARN_STYLE: React.CSSProperties = {
  background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412",
  borderRadius: "8px", padding: "7px 10px", fontSize: "13px", fontWeight: 600,
  minHeight: "48px", display: "flex", alignItems: "center", gap: "6px", marginTop: "auto",
};
const TIP_STYLE: React.CSSProperties = {
  background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534",
  borderRadius: "8px", padding: "7px 10px", fontSize: "13px", fontWeight: 600,
  minHeight: "48px", display: "flex", alignItems: "center", gap: "6px", marginTop: "auto",
};

interface CardData {
  cmd: string;
  color: "green" | "blue" | "navy" | "teal";
  title: string;
  desc: string;
  steps: string[];   // HTML string — dùng <b> trực tiếp
  warning?: string;
  tip?: string;
}

const CARDS: CardData[] = [
  {
    cmd: "/leave",
    color: "green",
    title: "Xin nghỉ phép",
    desc: "Tạo đơn xin nghỉ phép có lương, không lương hoặc nghỉ bù. CEO duyệt ngay trên Discord.",
    steps: [
      "Gõ <b>/leave</b> → Điền ngày nghỉ + loại nghỉ + lý do",
      "Bot gửi đơn lên CEO để duyệt",
      "Bot DM kết quả duyệt/từ chối về cho bạn",
    ],
    warning: "⚠️ Phải xin trước ít nhất 1 ngày làm việc — xin cùng ngày không được chấp nhận!",
  },
  {
    cmd: "/late",
    color: "blue",
    title: "Xin đi muộn",
    desc: "Báo đi muộn trước khi đến. Điền giờ đến + lý do cụ thể.",
    steps: [
      "Gõ <b>/late</b> → Điền giờ đến và lý do",
      "Bot chuyển thông tin lên CEO",
      "Bot xác nhận đã ghi nhận cho bạn",
    ],
    tip: "✅ Phải báo trước khi đến muộn, không báo sau",
  },
  {
    cmd: "/early",
    color: "navy",
    title: "Xin về sớm",
    desc: "Báo về sớm và lý do. Điền giờ dự kiến về.",
    steps: [
      "Gõ <b>/early</b> → Điền giờ về và lý do",
      "Bot chuyển thông tin lên CEO",
      "Bot xác nhận đã ghi nhận cho bạn",
    ],
    tip: "✅ Báo trước khi về, không báo sau khi đã về rồi",
  },
  {
    cmd: "/mystatus",
    color: "teal",
    title: "Xem trạng thái đơn của tôi",
    desc: "Kiểm tra tất cả đơn xin phép đang chờ duyệt hoặc đã được xử lý.",
    steps: [
      "Gõ <b>/mystatus</b> trong DM Bot",
      "Bot hiện danh sách đơn + trạng thái (Chờ / Duyệt / Từ chối)",
    ],
    tip: "✅ Dùng khi muốn kiểm tra đơn đã được CEO duyệt chưa",
  },
];

function Card({ d }: { d: CardData }) {
  return (
    <div
      className="hover:-translate-y-0.5 hover:shadow-xl hover:border-blue-400"
      style={{
        background: "#fff",
        borderRadius: "14px",
        border: "1.5px solid #e2e8f0",
        padding: "18px 20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",      // ← fill grid cell → bằng nhau trong cùng hàng
        transition: "all 0.2s",
      }}
    >
      {/* Left color bar */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", borderRadius: "14px 0 0 14px", background: BAR[d.color] }} />
      <div style={{ paddingLeft: "8px" }}>
        {/* cmd-header */}
        <div className="flex items-center justify-between mb-3" style={{ flexWrap: "wrap", gap: "6px" }}>
          <code style={CMD_STYLE}>{d.cmd}</code>
          <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px", background: "#dcfce7", color: "#166534", textTransform: "uppercase", letterSpacing: "0.3px" }}>
            Tất cả NV
          </span>
        </div>
        {/* cmd-title: 16px/700 */}
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>{d.title}</p>
        {/* cmd-desc: 14px */}
        <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.5, marginBottom: "12px" }}>{d.desc}</p>
        {/* cmd-steps: 14px */}
        <div className="flex flex-col mb-4" style={{ gap: "5px" }}>
          {d.steps.map((s, i) => (
            <div key={i} className="flex items-start" style={{ gap: "8px", fontSize: "14px", color: "#374151" }}>
              <span className="shrink-0 flex items-center justify-center rounded-full"
                style={{ width: "20px", height: "20px", background: "#1e3a5f", color: "#fff", fontSize: "11px", fontWeight: 800, marginTop: "1px" }}>
                {i + 1}
              </span>
              <span dangerouslySetInnerHTML={{ __html: s }} />
            </div>
          ))}
        </div>
        {d.warning && <div style={WARN_STYLE}>{d.warning}</div>}
        {d.tip    && <div style={TIP_STYLE}>{d.tip}</div>}
      </div>
    </div>
  );
}

export default function TabXinPhep({ selectedDept }: { selectedDept: string }) {
  void selectedDept;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "14px" }}>
      {CARDS.map((d) => <Card key={d.cmd} d={d} />)}
    </div>
  );
}
