/**
 * DecisionBanner — banner hiển thị quyết định cuối cùng (pass/extend/fail)
 * --------------------------------------------------------------------------
 * Dùng ở: /evaluation/result/[id] (HR/QL gửi kết quả) và /evaluation/final (NV xem)
 * Mục đích: ai mở phiếu cũng nhận ra ngay outcome — đặc biệt với fail/extend
 * cần xử lý/giao tiếp cẩn thận với NV.
 *
 * Logic flow (status → RESULT_SENT) giống nhau cho cả 3 outcome — chỉ khác
 * banner để cảnh báo / chuẩn bị tâm lý cho HR và NV.
 */

import React from 'react';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

type Decision = 'pass' | 'extend' | 'fail' | string;
type Audience = 'hr' | 'mgr' | 'nv';

interface DecisionBannerProps {
  decision: Decision;
  audience: Audience;
}

const CONFIG: Record<string, {
  icon: React.ReactNode;
  title: string;
  bg: string;
  border: string;
  titleColor: string;
  bodyColor: string;
  hrNote: string;
  mgrNote: string;
  nvNote: string;
}> = {
  pass: {
    icon: <CheckCircle size={28} />,
    title: 'Quyết định: Tiếp Nhận Chính Thức',
    bg: 'bg-green-50',
    border: 'border-green-300',
    titleColor: 'text-green-800',
    bodyColor: 'text-green-700',
    hrNote: 'Nhân viên đã đạt yêu cầu thử việc. Vui lòng gửi kết quả + tin chúc mừng và hướng dẫn NV bước ký HĐ chính thức.',
    mgrNote: 'Nhân viên đã đạt yêu cầu thử việc. Gửi tin chúc mừng và bàn giao thông tin sang HR để chuẩn bị ký HĐ chính thức.',
    nvNote: 'Chúc mừng bạn đã hoàn thành thử việc và được công ty tiếp nhận chính thức! HR sẽ liên hệ để hướng dẫn ký hợp đồng.',
  },
  extend: {
    icon: <Clock size={28} />,
    title: 'Quyết định: Gia Hạn Thử Việc 1 Tháng',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    titleColor: 'text-amber-800',
    bodyColor: 'text-amber-700',
    hrNote: 'Cần trao đổi cẩn thận với nhân viên về lý do gia hạn, các điểm cần cải thiện, và mục tiêu rõ ràng cho 1 tháng tiếp theo.',
    mgrNote: 'Trao đổi cẩn thận với nhân viên về lý do gia hạn và mục tiêu rõ ràng cho 1 tháng tiếp theo. Phối hợp HR để theo dõi quá trình gia hạn.',
    nvNote: 'Công ty quyết định gia hạn thử việc thêm 1 tháng để có thêm thời gian đánh giá. Vui lòng đọc kỹ nhận xét và tiếp tục cố gắng.',
  },
  fail: {
    icon: <XCircle size={28} />,
    title: 'Quyết định: Chấm Dứt Thử Việc',
    bg: 'bg-red-50',
    border: 'border-red-300',
    titleColor: 'text-red-800',
    bodyColor: 'text-red-700',
    hrNote: '⚠️ Đây là quyết định nhạy cảm — cần trao đổi trực tiếp, lịch sự với nhân viên về lý do và hỗ trợ thủ tục kết thúc hợp đồng. KHÔNG nên chỉ gửi DM mà không có cuộc họp.',
    mgrNote: '⚠️ Quyết định nhạy cảm — họp trực tiếp với nhân viên để trao đổi lý do, KHÔNG chỉ gửi DM. Phối hợp HR để hoàn tất thủ tục kết thúc hợp đồng.',
    nvNote: 'Rất tiếc, công ty quyết định không tiếp tục hợp đồng sau thử việc. Vui lòng đọc nhận xét để hiểu rõ và liên hệ HR để hoàn tất thủ tục.',
  },
};

export default function DecisionBanner({ decision, audience }: DecisionBannerProps) {
  const cfg = CONFIG[decision];
  if (!cfg) return null; // không có quyết định → không hiện banner
  const note = audience === 'hr' ? cfg.hrNote
             : audience === 'mgr' ? cfg.mgrNote
             : cfg.nvNote;
  return (
    <div className={`${cfg.bg} ${cfg.border} border-2 rounded-2xl p-5 flex items-start gap-4 shadow-sm`}>
      <div className={`${cfg.titleColor} shrink-0 mt-0.5`}>{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`${cfg.titleColor} font-black text-lg mb-1`}>{cfg.title}</div>
        <p className={`${cfg.bodyColor} text-sm leading-relaxed`}>{note}</p>
      </div>
    </div>
  );
}
