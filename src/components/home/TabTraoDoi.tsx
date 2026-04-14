// ═══════════════════════════════════════════════════════════════════
// TabTraoDoi — Tab "💬 Giao Tiếp Với Sếp"
// Lệnh: /question, /urgent, /help
// Font sizes & bold đồng bộ mockup
// ═══════════════════════════════════════════════════════════════════

const BAR: Record<string, string> = {
  blue:  "#3b82f6",
  red:   "#ef4444",
  green: "#10b981",
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
  color: "blue" | "red" | "green";
  badgeDept: string;
  title: string;
  desc: string;
  steps: string[];   // Nhúng <b> HTML trực tiếp vào chuỗi
  warning?: string;
  tip?: string;
}

// Dữ liệu step dùng HTML để bôi đậm đúng như mockup
const CARDS: CardData[] = [
  {
    cmd: "/question",
    color: "blue",
    badgeDept: "Tất cả NV",
    title: "Hỏi hoặc đề xuất lên sếp",
    desc: "Gửi câu hỏi hoặc đề xuất đến CEO. Bot sẽ chuyển tiếp và nhắc sếp phản hồi.",
    steps: [
      "Gõ <b>/question</b> → Nhập nội dung câu hỏi",
      "Bot forward ngay cho CEO",
      "CEO phản hồi → Bot DM câu trả lời về bạn",
    ],
    tip: "✅ Nếu sau 30 phút CEO chưa reply, Bot sẽ tự nhắc CEO giúp bạn",
  },
  {
    cmd: "/urgent",
    color: "red",
    badgeDept: "Tất cả NV",
    title: "Báo việc khẩn cấp",
    desc: "Dùng khi có sự cố nghiêm trọng cần CEO xử lý ngay lập tức.",
    steps: [
      "Gõ <b>/urgent</b> → Mô tả tình huống",
      "Bot ping CEO <b>ngay lập tức</b> với độ ưu tiên cao",  // ← bôi đậm như mockup
    ],
    warning: "⚠️ Chỉ dùng khi thực sự khẩn cấp — lỗi nghiêm trọng, sự cố kỹ thuật...",
  },
  {
    cmd: "/help",
    color: "green",
    badgeDept: "Tất cả NV",
    title: "Xem danh sách lệnh",
    desc: "Hiển thị tất cả lệnh bạn được phép dùng kèm mô tả ngắn trực tiếp trong Discord.",
    steps: [
      "Gõ <b>/help</b> trong DM Bot",
      "Bot liệt kê tất cả lệnh của bạn",
    ],
    tip: "✅ Dùng khi quên lệnh — Bot sẽ nhắc đúng lệnh bạn có quyền dùng",
  },
];

import React from "react";

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
          <div className="flex items-center" style={{ gap: "5px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px", background: "#dcfce7", color: "#166534", textTransform: "uppercase", letterSpacing: "0.3px" }}>
              {d.badgeDept}
            </span>
          </div>
        </div>
        {/* cmd-title: 16px/700 */}
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>{d.title}</p>
        {/* cmd-desc: 14px */}
        <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.5, marginBottom: "12px" }}>{d.desc}</p>
        {/* cmd-steps: 14px, step-num navy */}
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

export default function TabTraoDoi({ selectedDept }: { selectedDept: string }) {
  void selectedDept;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: "14px" }}>
      {CARDS.map((d) => <Card key={d.cmd} d={d} />)}
    </div>
  );
}
