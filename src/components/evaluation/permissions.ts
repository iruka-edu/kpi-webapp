/**
 * permissions.ts — Matrix phân quyền edit/sign cho 4 vai
 * --------------------------------------------------------
 * Một form mẫu duy nhất, mỗi vai chỉ được edit phần của mình.
 * Logic theo workflow đã chốt — KHÔNG đổi.
 */

import type { ViewMode, EvalStatus } from './types';

/** Các "khu vực" trong form — granular hơn section để dễ map quyền */
export type FieldKey =
  | 'info'              // Section 1: thông tin chung (HR khởi tạo)
  | 'work_area'         // Section 2: cột Mảng việc + Chi tiết (HR/QL điền)
  | 'work_result'       // Section 2: cột Kết quả tự đánh giá (NV điền)
  | 'criteria_meta'     // Section 3: tên + kỳ vọng tiêu chí (HR đặt sẵn, QL bổ sung)
  | 'criteria_self'     // Section 3: cột Tự ĐG (NV chấm 1-5)
  | 'criteria_mgr'      // Section 3: cột QL ĐG (QL chấm 1-5)
  | 'proposal'          // Section 4: NV tự đề xuất
  | 'conclusion'        // Section 5: QL nhận xét + quyết định
  | 'ceo_comment';      // Section 5: phần CEO duyệt bổ sung (optional)

/**
 * Có được phép edit field này không?
 * Logic state machine:
 *  - HR (status='' hoặc INIT)        → info, work_area, criteria_meta
 *  - NV (NV_PENDING)                 → work_result, criteria_self, proposal
 *      + Luồng rút gọn → cũng được edit work_area + criteria_meta (vì không có QL)
 *  - QL (SUBMITTED/UNDER_REVIEW)     → criteria_mgr, conclusion, criteria_meta (bổ sung)
 *  - CEO (PENDING_CEO)               → ceo_comment, conclusion (CEO override được)
 */
export function canEdit(
  field: FieldKey,
  view: ViewMode,
  status: EvalStatus,
  isCeoDirect: boolean = false,
): boolean {
  // ── HR mode ──
  if (view === 'hr') {
    // HR chỉ edit khi đang khởi tạo (chưa có ID) hoặc INIT
    if (status === '' || status === 'INIT') {
      return ['info', 'work_area', 'criteria_meta'].includes(field);
    }
    return false;
  }

  // ── NV mode ──
  if (view === 'nv') {
    if (status !== 'NV_PENDING') return false;
    const baseAllowed: FieldKey[] = ['work_result', 'criteria_self', 'proposal'];
    if (isCeoDirect) {
      // Luồng rút gọn: NV cũng được điền mảng việc + tiêu chí (không có QL trung gian)
      baseAllowed.push('work_area', 'criteria_meta');
    }
    return baseAllowed.includes(field);
  }

  // ── QL mode ──
  // Có 2 lần QL action:
  //  - mgr-fill (status MGR_PENDING): điền mảng việc + tiêu chí cho NV
  //  - mgr-review (status SUBMITTED/UNDER_REVIEW): chấm điểm + ra quyết định
  if (view === 'mgr') {
    if (status === 'MGR_PENDING') {
      return ['work_area', 'criteria_meta'].includes(field);
    }
    if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') {
      return ['criteria_mgr', 'conclusion', 'criteria_meta'].includes(field);
    }
    return false;
  }

  // ── CEO mode ──
  // Luồng rút gọn (isCeoDirect): CEO kiêm QL → cũng cho edit ô QL ĐG +
  // accept status SUBMITTED (NV vừa nộp, chưa qua bước MGR review).
  if (view === 'ceo') {
    const okStatus = isCeoDirect
      ? (status === 'PENDING_CEO' || status === 'SUBMITTED')
      : status === 'PENDING_CEO';
    if (!okStatus) return false;
    const allowed: FieldKey[] = ['ceo_comment', 'conclusion'];
    if (isCeoDirect) allowed.push('criteria_mgr');
    return allowed.includes(field);
  }

  return false;
}

/** Có được phép ký ô tương ứng vai mình không? */
export function canSign(view: ViewMode, status: EvalStatus, isCeoDirect: boolean = false): boolean {
  if (view === 'hr')  return status === '' || status === 'INIT';
  if (view === 'nv')  return status === 'NV_PENDING';
  if (view === 'mgr') return status === 'MGR_PENDING' || status === 'SUBMITTED' || status === 'UNDER_REVIEW';
  if (view === 'ceo') return status === 'PENDING_CEO' || (isCeoDirect && status === 'SUBMITTED');
  return false;
}

/** Label hiển thị status cho user (Vietnamese) */
export const STATUS_LABEL: Record<EvalStatus, string> = {
  '':              'Chưa khởi tạo',
  INIT:            'Đã tạo, chờ Quản lý',
  MGR_PENDING:    'Chờ Quản lý điền',
  NV_PENDING:      'Chờ Nhân viên tự đánh giá',
  SUBMITTED:       'Nhân viên đã nộp, chờ Quản lý chấm',
  UNDER_REVIEW:    'CEO yêu cầu xem lại',
  PENDING_CEO:     'Chờ CEO duyệt',
  COMPLETED:       'CEO đã duyệt',
  PENDING_HR:      'Chờ HR gửi kết quả',
  RESULT_SENT:     'Đã gửi kết quả cho NV',
  ACKNOWLEDGED:    'NV đã xác nhận',
  REJECTED:        'CEO từ chối',
};

/** Tên đẹp của vai cho ô ký */
export const ROLE_LABEL: Record<ViewMode, string> = {
  hr:  '🧑‍💼 Nhân Sự',
  nv:  '👤 Nhân Viên',
  mgr: '👔 Quản Lý Trực Tiếp',
  ceo: '👑 Giám Đốc',
};
