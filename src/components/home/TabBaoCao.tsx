"use client";
// ═══════════════════════════════════════════════════════════════════
// TabBaoCao — Tab "📊 Lệnh Báo Cáo"
// Font sizes đồng bộ với mockup:
//   cmd-name: 14px/700 monospace   cmd-title: 14px/700
//   cmd-desc: 12.5px               cmd-step: 12px
//   cmd-warning/tip: 11px/600      badge: 10px/700
// ═══════════════════════════════════════════════════════════════════

import Link from "next/link";

interface Step { text: string }
interface CmdCard {
  cmd: string;
  color: "amber" | "red" | "purple" | "green";
  badgeDept: string;       // badge-dept style
  badgeDeadline?: string;  // badge-deadline style
  title: string;
  desc: string;
  steps: Step[];
  warning?: string;
  tip?: string;
  linkHref?: string;
}

// Màu left bar của cmd-card
const BAR_COLOR: Record<string, string> = {
  amber:  "#f59e0b",
  red:    "#ef4444",
  purple: "#8b5cf6",
  green:  "#10b981",
};

// Màu badge dept
const BADGE_DEPT_BG: Record<string, { bg: string; color: string }> = {
  amber:  { bg: "#dbeafe", color: "#1e40af" },
  red:    { bg: "#dbeafe", color: "#1e40af" },
  purple: { bg: "#dbeafe", color: "#1e40af" },
  green:  { bg: "#dcfce7", color: "#166534" },
};

// Màu cmd-name (monospace block)
const CMD_NAME_STYLE: Record<string, { bg: string; color: string }> = {
  amber:  { bg: "#f1f5f9", color: "#1e3a5f" },
  red:    { bg: "#f1f5f9", color: "#1e3a5f" },
  purple: { bg: "#f1f5f9", color: "#1e3a5f" },
  green:  { bg: "#f1f5f9", color: "#1e3a5f" },
};

// Màu warning vs tip
const WARN_STYLE = { background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412" };
const TIP_STYLE  = { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" };

const CARDS: CmdCard[] = [
  {
    cmd: "/daily",
    color: "amber",
    badgeDept: "Dev · Design · Content · QC · Edu",
    badgeDeadline: "⏰ Trước 9:00",
    title: "Báo cáo hàng ngày",
    desc: "Gửi mỗi sáng đi làm, báo cáo kế hoạch hôm nay & kết quả hôm qua.",
    steps: [
      { text: "Mở Discord → Tìm Bot IruKa → Vào DM" },
      { text: "Gõ /daily → Bot mở form 3 mục" },
      { text: "Điền: Kế hoạch hôm nay · Kết quả hôm qua · Blocker" },
    ],
    warning: "⚠️ Không ghi chung chung như \"đang làm\" — phải có tên việc + số lượng!",
  },
  {
    cmd: "/weekly",
    color: "red",
    badgeDept: "HR · Content · Design · QC",
    badgeDeadline: "⏰ CN 24:00",
    title: "Form báo cáo KPI tuần",
    desc: "Điền vào cuối tuần để báo cáo kết quả tuần cũ và kế hoạch tuần tới.",
    steps: [
      { text: "Trong DM Bot → Gõ /weekly" },
      { text: "Bot gửi link form cá nhân bảo mật" },
      { text: "Điền đầy đủ 2 bảng: BC tuần cũ + KH tuần mới" },
    ],
    tip: "✅ Dev, Edu, Tester không dùng lệnh này — Dev báo cáo theo /monthly",
    linkHref: "/weekly",
  },
  {
    cmd: "/monthly",
    color: "purple",
    badgeDept: "HR · Dev · Design · Content · QC · Edu · Tester",
    badgeDeadline: "⏰ Mùng 4",
    title: "Báo cáo & kế hoạch tháng",
    desc: "Điền vào đầu tháng để tổng kết tháng cũ và lên kế hoạch tháng mới.",
    steps: [
      { text: "Ngày mùng 1 Bot sẽ tự DM nhắc bạn" },
      { text: "Gõ /monthly → Bot gửi link Google Sheets" },
      { text: "Điền: Đầu việc · Số lượng · Deadline · Độ ưu tiên" },
    ],
    warning: "⚠️ Nộp trước 24:00 ngày mùng 4 — 9:00 ngày mùng 5 Bot chốt danh sách báo cáo cho CEO",
    linkHref: "/monthly",
  },
  {
    cmd: "/summary",
    color: "green",
    badgeDept: "Tất cả NV (CEO xem đầy đủ)",
    title: "Xem tóm tắt hoạt động",
    desc: "Xem tóm tắt hoạt động cá nhân trong tuần — task được giao, báo cáo đã nộp...",
    steps: [
      { text: "Gõ /summary trong DM Bot" },
      { text: "Bot hiện bản tóm tắt hoạt động gần nhất" },
    ],
    tip: "✅ CEO có thể xem chi tiết từng nhân viên bằng cách gõ <b>đánh giá @username</b> trong DM Bot",
  },
];

// ─── Nội dung bên trong 1 card ───────────────────────────────────────────────
function CardInner({ card }: { card: CmdCard }) {
  const deptStyle = BADGE_DEPT_BG[card.color];
  const cmdStyle  = CMD_NAME_STYLE[card.color];

  return (
    <>
      {/* cmd-header */}
      <div className="flex items-center justify-between mb-3" style={{ flexWrap: "wrap", gap: "6px" }}>
        {/* cmd-name: JetBrains Mono 14px/700, bg #f1f5f9, border #e2e8f0 */}
        <code style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "16px",
          fontWeight: 700,
          background: cmdStyle.bg,
          color: cmdStyle.color,
          padding: "4px 10px",
          borderRadius: "7px",
          border: "1px solid #e2e8f0",
        }}>
          {card.cmd}
        </code>
        {/* cmd-badges: badge 10px/700 */}
        <div className="flex items-center" style={{ gap: "5px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.3px", background: deptStyle.bg, color: deptStyle.color }}>
            {card.badgeDept}
          </span>
          {card.badgeDeadline && (
            <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px", background: "#fee2e2", color: "#991b1b" }}>
              {card.badgeDeadline}
            </span>
          )}
        </div>
      </div>

      {/* cmd-title: 16px/700 */}
      <p style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>{card.title}</p>

      {/* cmd-desc: 14px */}
      <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.5, marginBottom: "12px" }}>{card.desc}</p>

      {/* cmd-steps: 14px */}
      <div className="flex flex-col mb-4" style={{ gap: "5px" }}>
        {card.steps.map((s, i) => (
          <div key={i} className="flex items-start" style={{ gap: "8px", fontSize: "14px", color: "#374151" }}>
            {/* cmd-step-num: 18x18, navy bg */}
            <span
              className="shrink-0 flex items-center justify-center rounded-full"
              style={{ width: "20px", height: "20px", background: "#1e3a5f", color: "#fff", fontSize: "11px", fontWeight: 800, marginTop: "1px" }}
            >
              {i + 1}
            </span>
            <span dangerouslySetInnerHTML={{ __html: s.text.replace(/(\/[\w]+)/g, "<b>$1</b>") }} />
          </div>
        ))}
      </div>

      {/* cmd-warning: 13px/600 */}
      {card.warning && (
        <div className="flex items-center mt-auto" style={{ gap: "6px", ...WARN_STYLE, borderRadius: "8px", padding: "7px 10px", fontSize: "13px", fontWeight: 600, minHeight: "48px" }}>
          {card.warning}
        </div>
      )}
      {/* cmd-tip: 13px/600 */}
      {card.tip && (
        <div className="flex items-center mt-auto" style={{ gap: "6px", ...TIP_STYLE, borderRadius: "8px", padding: "7px 10px", fontSize: "13px", fontWeight: 600, minHeight: "48px" }}
          dangerouslySetInnerHTML={{ __html: card.tip }}
        />
      )}
    </>
  );
}

// ─── Component chính ─────────────────────────────────────────────────────────
export default function TabBaoCao({ selectedDept }: { selectedDept: string }) {
  void selectedDept;

  // Shared card style — cmd-card: rounded-14, border 1.5px #e2e8f0, padding 18px 20px
  const cardBase: React.CSSProperties = {
    background: "#fff",
    borderRadius: "14px",
    border: "1.5px solid #e2e8f0",
    padding: "18px 20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    height: "100%",        // ← fill grid cell → bằng nhau trong cùng hàng
    transition: "all 0.2s",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "14px" }}>
      {CARDS.map((card) => {
        // Left color bar: 4px wide
        const barEl = (
          <div
            style={{
              position: "absolute",
              left: 0, top: 0, bottom: 0,
              width: "4px",
              borderRadius: "14px 0 0 14px",
              background: BAR_COLOR[card.color],
            }}
          />
        );

        if (card.linkHref) {
          return (
            <Link
              key={card.cmd}
              href={card.linkHref}
              style={{ ...cardBase, textDecoration: "none", color: "inherit" }}
              className="hover:-translate-y-0.5 hover:shadow-xl hover:border-blue-400"
            >
              {barEl}
              <div style={{ paddingLeft: "8px" }}>
                <CardInner card={card} />
              </div>
            </Link>
          );
        }

        return (
          <div
            key={card.cmd}
            style={cardBase}
            className="hover:-translate-y-0.5 hover:shadow-xl hover:border-blue-400"
          >
            {barEl}
            <div style={{ paddingLeft: "8px" }}>
              <CardInner card={card} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
