"use client";
// ═══════════════════════════════════════════════════════════════════
// FaqAccordion — Câu Hỏi Thường Gặp
// Dạng Accordion mở/đóng bằng React state
// Nội dung: 13 câu hỏi thực tế từ nhân viên IruKa
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";

// ─── Dữ liệu FAQ ─────────────────────────────────────────────────────────────
const FAQS: { q: string; a: string }[] = [
  {
    q: "Bot không phản hồi thì phải làm sao?",
    a: "Hãy nhắn Admin hoặc IT để kiểm tra. Bạn cũng có thể thử gõ lại lệnh sau 1-2 phút. Bot có thể đang khởi động lại — thường xong trong vài phút. Nếu sau 5 phút vẫn không có phản hồi, nhắn trực tiếp vào nhóm kỹ thuật.",
  },
  {
    q: "Gửi sai thông tin trong form rồi — sửa thế nào?",
    a: 'Nhắn thẳng vào DM với Bot: <b>"Em vừa gửi sai thông tin, đây là thông tin đúng: [...]"</b> — Bot sẽ chuyển lại cho CEO biết. Với báo cáo ngày (/daily), có thể sửa trước 10:00 sáng cùng ngày.',
  },
  {
    q: "Xem trạng thái đơn xin phép của mình ở đâu?",
    a: "Gõ <b>/mystatus</b> trong DM với Bot. Bot sẽ hiện danh sách tất cả đơn đang chờ duyệt hoặc đã được xử lý (Duyệt / Từ chối) kèm lý do.",
  },
  {
    q: "Sếp có biết tôi đã đọc tin nhắn chưa?",
    a: "Bot theo dõi theo <b>phản hồi</b>, không phải đọc. Nếu sau <b>30 phút</b> bạn không trả lời, Bot nhắc lần 1. Sau <b>60 phút</b> nhắc lần 2. Sau <b>3 tiếng</b> không phản hồi → Bot báo leo thang CEO. Vì vậy hãy phản hồi sớm nhất có thể!",
  },
  {
    q: "📅 Tôi quên nộp /daily hôm nay — có nộp bù được không?",
    a: "Có thể nộp muộn, nhưng Bot sẽ báo riêng cho CEO biết bạn nộp sau <b>9:30</b> (vì tổng hợp đã gửi CEO rồi). Nộp muộn vẫn bị ghi nhận là <b>trễ</b>. Tốt nhất là nộp trước 9:00 mỗi sáng.",
  },
  {
    q: "✏️ Gửi sai nội dung trong /daily rồi — sửa thế nào?",
    a: 'Gõ lại <b>/daily</b> trước <b>10:00 sáng</b> — Bot sẽ hỏi bạn có muốn sửa không, bấm <b>"Sửa lại"</b> để mở lại form với nội dung cũ điền sẵn. Sau 10:00 sáng thì khóa hoàn toàn, không sửa được nữa.',
  },
  {
    q: "📊 Tôi là Dev — có phải nộp /weekly không?",
    a: "<b>Không</b> — Dev không cần nộp /weekly. Dev chỉ cần: <b>/daily</b> (mỗi sáng) + <b>/monthly</b> (đầu tháng). Bot còn theo dõi thêm <b>lịch sử git push</b> của Dev vào lúc 17:00 và 17:30 hàng ngày.",
  },
  {
    q: "⚡ Git push phải làm trước mấy giờ?",
    a: "Bot kiểm tra git push lúc <b>17:00</b> (nhắc lần 1) và <b>17:30</b> (nhắc lần 2) hàng ngày Thứ 2 - Thứ 7. Kết quả được gửi vào kênh standup để CEO theo dõi.",
  },
  {
    q: "🏖️ Tôi được bao nhiêu ngày phép mỗi tháng?",
    a: "<b>Fulltime:</b> 1 ngày phép có lương/tháng — cộng dồn, reset đầu năm mới.<br/><b>Parttime:</b> 1 buổi (sáng hoặc chiều) mỗi tuần = 0.5 ngày, tối đa nghỉ thêm 1 ngày.<br/>Nghỉ quá số ngày phép → không tính lương ngày nghỉ thêm.",
  },
  {
    q: "📬 Nộp /weekly rồi, sao không thấy Bot xác nhận?",
    a: "Bot quét hệ thống mỗi <b>10 phút</b> vào Thứ 7, Chủ Nhật, Thứ Hai để phát hiện ai mới nộp. Sau khi phát hiện, Bot sẽ DM xác nhận về Discord của bạn. Nếu sau 30 phút vẫn không thấy, hãy gõ <b>/mystatus</b> để kiểm tra.",
  },
  {
    q: "💬 Muốn hỏi sếp một việc riêng tư — dùng lệnh nào?",
    a: "Dùng lệnh <b>/question</b> trong DM với Bot. Bot sẽ forward câu hỏi lên CEO và nhắc CEO phản hồi nếu sau 30 phút chưa có reply. Câu trả lời của CEO sẽ được Bot DM riêng về bạn — không ai khác thấy.",
  },
  {
    q: "📎 Gửi file cho sếp qua Bot được không?",
    a: "Có — bạn có thể gửi <b>file đính kèm</b> trực tiếp vào DM với Bot. Bot sẽ tự lưu lại và chuyển thông báo cho CEO biết. CEO có thể gõ <b>file @username</b> để xem lại danh sách file đã nhận từ bạn.",
  },
  {
    q: "👁️ Bot có lưu dữ liệu của tôi không?",
    a: "Có — lịch sử relay, file đính kèm và task được lưu nội bộ trên máy chủ của công ty, không chia sẻ ra ngoài. Chỉ CEO và HR có quyền tra cứu lịch sử.",
  },
];

// ─── Component chính ─────────────────────────────────────────────────────────
export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {FAQS.map((faq, i) => (
        <div
          key={i}
          style={{
            background: "#fff",
            border: open === i ? "1.5px solid #bfdbfe" : "1.5px solid #e2e8f0",
            borderRadius: "12px",
            overflow: "hidden",
            transition: "all 0.15s",
          }}
        >
          {/* faq-q: 14px / 600 */}
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between text-left transition-colors"
            style={{
              padding: "14px 18px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#1e293b",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              userSelect: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span>{faq.q}</span>
            <span
              className="ml-4 shrink-0 transition-transform duration-200"
              style={{ fontSize: "12px", color: "#94a3b8", display: "inline-block", transform: open === i ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              ▼
            </span>
          </button>
          {/* faq-a: 13px / 1.6 */}
          {open === i && (
            <div
              style={{ padding: "0 18px 14px", fontSize: "15px", color: "#64748b", lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: faq.a }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
