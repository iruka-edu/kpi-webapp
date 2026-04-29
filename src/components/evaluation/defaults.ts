/**
 * defaults.ts — Dữ liệu mặc định cho form đánh giá
 * --------------------------------------------------
 * Tách ra để dễ sửa nhanh không phải đụng UI.
 */

import type { CriteriaItem, EvaluationData, WorkItem } from './types';

/** Danh sách quản lý — đọc từ env (NEXT_PUBLIC_*) */
export const MANAGER_LIST = [
  { name: 'CEO (Mr. Đào)', discord_id: process.env.NEXT_PUBLIC_CEO_DISCORD_ID || '' },
  { name: 'Tùng',          discord_id: process.env.NEXT_PUBLIC_TUNG_DISCORD_ID || '' },
  { name: 'Inh',           discord_id: process.env.NEXT_PUBLIC_INH_DISCORD_ID || '' },
];

/** Tiêu chí mẫu HR sẵn dùng — chia 3 nhóm */
export const DEFAULT_CRITERIA: CriteriaItem[] = [
  { name: 'Kiến thức chuyên môn / Nghiệp vụ', expectation: 'Nắm vững kiến thức nền tảng cho vị trí, có thể áp dụng vào công việc thực tế.', group: '🧠 3.1 KIẾN THỨC CHUYÊN MÔN', source: 'hr_template' },
  { name: 'Hiểu quy trình & văn hóa công ty', expectation: 'Nắm rõ cách làm việc, quy trình nội bộ, và hòa nhập văn hóa IruKa trong giai đoạn thử việc.', group: '🧠 3.1 KIẾN THỨC CHUYÊN MÔN', source: 'hr_template' },
  { name: 'Tốc độ học hỏi & thích nghi', expectation: 'Khả năng tiếp thu công việc mới, platform nội bộ, công cụ AI và phần mềm nghiệp vụ.', group: '🧠 3.1 KIẾN THỨC CHUYÊN MÔN', source: 'hr_template' },
  { name: 'Giao tiếp & Phối hợp nhóm', expectation: 'Trao đổi rõ ràng, lắng nghe tốt, phối hợp với đồng nghiệp và các bộ phận hiệu quả.', group: '💪 3.2 KỸ NĂNG', source: 'hr_template' },
  { name: 'Quản lý thời gian & Deadline', expectation: 'Hoàn thành công việc đúng hạn, biết ưu tiên và báo cáo kịp thời khi có vướng mắc.', group: '💪 3.2 KỸ NĂNG', source: 'hr_template' },
  { name: 'Sử dụng công cụ AI & Năng suất', expectation: 'Ứng dụng AI vào công việc hằng ngày để tối ưu năng suất, chất lượng đầu ra.', group: '💪 3.2 KỸ NĂNG', source: 'hr_template' },
  { name: 'Tính kỷ luật & Gương mẫu', expectation: 'Đúng giờ, tuân thủ các quy định, tác phong làm việc chuyên nghiệp.', group: '🌟 3.3 THÁI ĐỘ & TÁC PHONG', source: 'hr_template' },
  { name: 'Tinh thần trách nhiệm', expectation: 'Chịu trách nhiệm với kết quả công việc đến cùng, không đổ lỗi.', group: '🌟 3.3 THÁI ĐỘ & TÁC PHONG', source: 'hr_template' },
  { name: 'Chủ động & Nhiệt tình', expectation: 'Tự giác tìm việc, đề xuất cải tiến, không chờ nhắc nhở liên tục.', group: '🌟 3.3 THÁI ĐỘ & TÁC PHONG', source: 'hr_template' },
];

/** Đầu việc mẫu cho HR khi tạo phiếu */
export const DEFAULT_WORK_ITEMS: WorkItem[] = [
  { task: 'Nghiên cứu & nắm bắt sản phẩm', details: 'Tìm hiểu toàn bộ sản phẩm IruKa, quy trình nội bộ, công cụ AI sử dụng hàng ngày', result: '' },
  { task: 'Thực hiện task được giao',       details: 'Hoàn thành các đầu công việc được phân công trong giai đoạn thử việc',         result: '' },
];

/** Khởi tạo data rỗng cho phiếu mới */
export function createEmptyEvaluation(hrDiscordId: string = ''): EvaluationData {
  return {
    eval_id: undefined,
    status: '',
    info: {
      name: '',
      discord_id: '',
      dept: '',
      role: '',
      manager_name: MANAGER_LIST[0].name,
      manager_discord_id: MANAGER_LIST[0].discord_id,
      hr_discord_id: hrDiscordId,
      trial_start: '',
      trial_end: '',
      eval_date: new Date().toISOString().slice(0, 10),
    },
    work_items: [...DEFAULT_WORK_ITEMS],
    criteria: [...DEFAULT_CRITERIA],
    proposal: { salary_expectation: '', training_request: '', feedback: '' },
    conclusion: { mgr_comment: '', mgr_expectation: '', mgr_salary_proposal: '', mgr_decision: '', ceo_comment: '' },
    signatures: {},
  };
}

/** Nhóm tiêu chí theo `group` để render đúng layout (giữ thứ tự xuất hiện) */
export function groupCriteria(criteria: import('./types').CriteriaItem[]): Record<string, { item: import('./types').CriteriaItem; index: number }[]> {
  const grouped: Record<string, { item: import('./types').CriteriaItem; index: number }[]> = {};
  criteria.forEach((c, index) => {
    const key = c.group || '💡 TIÊU CHÍ KHÁC';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ item: c, index });
  });
  return grouped;
}

/** Label nút "Thêm" theo nhóm */
export function addLabelForGroup(group: string): string {
  if (group.includes('KIẾN THỨC')) return 'Thêm kiến thức';
  if (group.includes('KỸ NĂNG'))   return 'Thêm kỹ năng';
  if (group.includes('THÁI ĐỘ'))   return 'Thêm thái độ';
  return 'Thêm tiêu chí';
}
