/**
 * types.ts — Type chung cho toàn bộ luồng /evaluation
 * ----------------------------------------------------
 * Một form mẫu duy nhất dùng cho 4 vai (HR / NV / QL / CEO),
 * chỉ khác nhau quyền edit + ô ký active. Tất cả vai cùng nhìn cùng schema.
 */

export type ViewMode = 'hr' | 'nv' | 'mgr' | 'ceo';

export type EvalStatus =
  | ''                  // Phiếu mới — HR đang khởi tạo (chưa có ID)
  | 'INIT'              // Đã tạo, chờ QL điền (luồng thường)
  | 'MGR_PENDING'       // Chờ Quản lý điền công việc (luồng thường)
  | 'NV_PENDING'        // Chờ NV tự đánh giá
  | 'SUBMITTED'         // NV đã nộp, chờ QL chấm
  | 'UNDER_REVIEW'      // CEO trả về để xem lại
  | 'PENDING_CEO'       // QL chấm xong, chờ CEO duyệt
  | 'COMPLETED'         // CEO duyệt xong (luồng thường — HR sẽ gửi NV)
  | 'PENDING_HR'        // CEO duyệt xong (luồng rút gọn — chờ HR xác nhận gửi NV)
  | 'RESULT_SENT'       // Đã gửi NV
  | 'ACKNOWLEDGED'      // NV đã đọc + xác nhận
  | 'REJECTED';         // CEO từ chối

export interface EvalInfo {
  name: string;
  discord_id?: string;
  dept: string;
  role?: string;
  manager_name: string;
  manager_discord_id?: string;
  hr_discord_id?: string;
  trial_start: string;       // YYYY-MM-DD
  trial_end?: string;        // YYYY-MM-DD
  eval_date: string;         // YYYY-MM-DD
}

export interface WorkItem {
  task: string;              // Mảng việc lớn
  details: string;           // Chi tiết các đầu việc nhỏ
  result?: string;           // Kết quả NV tự đánh giá
}

export interface CriteriaItem {
  name: string;
  expectation: string;
  group: string;             // VD: "🧠 3.1 KIẾN THỨC CHUYÊN MÔN"
  source?: 'hr_template' | 'mgr' | 'nv_added';
  self_score?: number;       // NV chấm 1-5
  mgr_score?: number;        // QL chấm 1-5
  note?: string;             // QL ghi chú (optional)
}

export interface EmployeeProposal {
  salary_expectation: string;
  training_request: string;
  feedback: string;
}

export type DecisionValue = 'pass' | 'extend' | 'fail' | '';

export interface ManagerConclusion {
  mgr_comment: string;
  mgr_expectation: string;
  mgr_salary_proposal: string;
  mgr_decision: DecisionValue;
  ceo_comment?: string;      // CEO bổ sung (optional)
}

export interface SignatureRecord {
  signed_at: string;         // ISO timestamp
  signed_by: string;         // Tên người ký (lấy từ Discord member)
  discord_id: string;
}

export interface Signatures {
  hr?: SignatureRecord;
  nv?: SignatureRecord;
  mgr?: SignatureRecord;
  ceo?: SignatureRecord;
}

/** Toàn bộ data 1 phiếu — frontend dùng làm form state */
export interface EvaluationData {
  eval_id?: string;
  status: EvalStatus;
  info: EvalInfo;
  work_items: WorkItem[];
  criteria: CriteriaItem[];
  proposal: EmployeeProposal;
  conclusion: ManagerConclusion;
  signatures: Signatures;
  is_ceo_direct?: boolean;   // QL trực tiếp = CEO → luồng rút gọn
}

/** Member option cho dropdown chọn NV */
export interface MemberOption {
  name: string;
  username: string;
  discordId: string;
  dept: string;
  contractType: string;
  joinedAt: string | null;
  managerName: string;
  managerDiscordId: string;
}
