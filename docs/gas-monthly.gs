/**
 * ================================================================
 *  GAS — Báo cáo Tháng KPI  (gas-monthly.gs)
 *  Google Apps Script — Paste vào: Extensions → Apps Script
 * ================================================================
 *
 *  HƯỚNG DẪN CÀI ĐẶT:
 *  1. Mở Google Sheet: https://docs.google.com/spreadsheets/d/1QQP9x8hPKB0MKDkCulc5ZK51ktjhkQ1CrqF0W03Dp7k/
 *  2. Vào menu: Extensions → Apps Script
 *  3. Xoá toàn bộ code mặc định, paste nội dung file này vào
 *  4. Lưu (Ctrl+S), đặt tên dự án tùy ý (VD: "KPI Monthly")
 *  5. Deploy:
 *     - Bấm "Deploy" → "New deployment"
 *     - Chọn loại: "Web app"
 *     - Execute as: "Me" (tài khoản Google của anh)
 *     - Who has access: "Anyone"  ← QUAN TRỌNG
 *     - Bấm "Deploy" → copy URL dán vào .env.local:
 *       GOOGLE_APPS_SCRIPT_MONTHLY_URL=https://script.google.com/macros/s/xxxxx/exec
 *
 *  CẤU TRÚC SHEET (tạo đúng tên sheet):
 *  - Sheet "Báo cáo tháng"  → nơi nhận data submit
 *  - Sheet "Kế hoạch"       → kế hoạch tháng tới (để tháng sau load lại)
 *  - Sheet "Nhân viên"      → danh sách nhân viên & role/dept
 *
 * ================================================================
 */

// ── Tên các sheet ──────────────────────────────────────────────
var SHEET_REPORT = 'Báo cáo tháng';   // Hứng báo cáo đã submit
var SHEET_PLAN   = 'Kế hoạch';        // Lưu kế hoạch tháng tới
var SHEET_MEMBER = 'Nhân viên';       // Danh sách nhân viên

// ================================================================
//  setupSheets — Chạy THỦ CÔNG 1 lần để tạo sheet + header
//
//  Cách chạy:
//  1. Mở Apps Script Editor
//  2. Chọn hàm "setupSheets" trong dropdown (góc trên)
//  3. Bấm ▶ Run
//  → Tự động tạo 3 sheet với header + định dạng màu navy
// ================================================================
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Sheet 1: Báo cáo tháng ─────────────────────────────────
  var sheetReport = getOrCreateSheet(ss, SHEET_REPORT);
  if (sheetReport.getLastRow() === 0) {
    sheetReport.appendRow([
      'Thời gian', 'Tên nhân viên', 'Discord ID', 'Tháng BC',
      'STT', 'Mô tả công việc', 'Đơn vị', 'Kế hoạch', 'Thực hiện',
      'Trọng số', '% Đạt', 'Điểm đạt', 'Deadline', 'Ghi chú',
      'Thành tựu', 'Khó khăn', 'Mục tiêu tháng tới',
      'Tự đánh giá (sao)', 'Nhãn đánh giá',
    ]);
    sheetReport.getRange(1, 1, 1, 19)
      .setBackground('#1e3a5f').setFontColor('#ffffff').setFontWeight('bold');
    sheetReport.setFrozenRows(1);
    // Tự động co giãn cột
    sheetReport.autoResizeColumns(1, 19);
    Logger.log('✅ Đã tạo sheet: ' + SHEET_REPORT);
  } else {
    Logger.log('⏭ Sheet đã có data: ' + SHEET_REPORT + ' — bỏ qua');
  }

  // ── Sheet 2: Kế hoạch ──────────────────────────────────────
  var sheetPlan = getOrCreateSheet(ss, SHEET_PLAN);
  if (sheetPlan.getLastRow() === 0) {
    sheetPlan.appendRow([
      'Thời gian', 'Tên nhân viên', 'Discord ID', 'Tháng KH',
      'STT', 'Mô tả công việc', 'Đơn vị', 'Kế hoạch',
      'Trọng số', 'Deadline dự kiến', 'Ghi chú',
    ]);
    sheetPlan.getRange(1, 1, 1, 11)
      .setBackground('#1e3a5f').setFontColor('#ffffff').setFontWeight('bold');
    sheetPlan.setFrozenRows(1);
    sheetPlan.autoResizeColumns(1, 11);
    Logger.log('✅ Đã tạo sheet: ' + SHEET_PLAN);
  } else {
    Logger.log('⏭ Sheet đã có data: ' + SHEET_PLAN + ' — bỏ qua');
  }

  // ── Sheet 3: Nhân viên ─────────────────────────────────────
  var sheetMember = getOrCreateSheet(ss, SHEET_MEMBER);
  if (sheetMember.getLastRow() === 0) {
    sheetMember.appendRow([
      'Tên đầy đủ', 'Role / Chức danh', 'Phòng ban', 'Báo cáo lên', 'Discord ID',
    ]);
    sheetMember.getRange(1, 1, 1, 5)
      .setBackground('#1e3a5f').setFontColor('#ffffff').setFontWeight('bold');
    sheetMember.setFrozenRows(1);
    sheetMember.autoResizeColumns(1, 5);
    // Thêm ví dụ 1 dòng mẫu
    sheetMember.appendRow(['Vũ Ngọc Đào', 'CEO', 'Management', 'CEO', '']);
    Logger.log('✅ Đã tạo sheet: ' + SHEET_MEMBER + ' (có 1 dòng mẫu)');
  } else {
    Logger.log('⏭ Sheet đã có data: ' + SHEET_MEMBER + ' — bỏ qua');
  }

  // Báo hoàn thành
  SpreadsheetApp.getUi().alert(
    '✅ Setup xong!\n\n' +
    '• Sheet "Báo cáo tháng" — sẵn sàng nhận data\n' +
    '• Sheet "Kế hoạch" — sẵn sàng nhận kế hoạch\n' +
    '• Sheet "Nhân viên" — anh điền thêm thông tin nhân viên vào đây\n\n' +
    'Nhớ điền Discord ID đúng vào sheet Nhân viên để bot nhận diện được nhé!'
  );
}


function doGet(e) {
  var p = e ? (e.parameter || {}) : {};

  try {
    var action = p.action || 'get';

    if (action === 'get') {
      return handleGet(p);
    }

    // action=status — Trả về danh sách đã nộp theo tháng
    // Dùng bởi scheduler.js (buildMonthlyReport + remindMonthlyReport)
    if (action === 'status') {
      return handleStatus(p);
    }

    return jsonResponse({ error: 'action không hợp lệ' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ================================================================
//  handleStatus — Trả về danh sách đã submit theo tháng
//
//  Query params: ?action=status&month=Tháng+4
//  Response: { submitted_names: ["Nguyễn Văn A", ...], month: "Tháng 4" }
// ================================================================
function handleStatus(p) {
  var monthParam = (p.month || '').trim(); // VD: "Tháng 4"

  if (!monthParam) {
    return jsonResponse({ error: 'Thiếu tham số month' });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetReport = ss.getSheetByName(SHEET_REPORT);

  if (!sheetReport || sheetReport.getLastRow() < 2) {
    return jsonResponse({ submitted_names: [], month: monthParam });
  }

  var data = sheetReport.getDataRange().getValues();
  var submittedNames = [];
  var seen = {};

  // Header ở dòng 1 — bắt đầu từ dòng 2
  // Cột B (index 1) = Tên, Cột D (index 3) = Tháng BC
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var name = (row[1] || '').toString().trim();
    var month = (row[3] || '').toString().trim();

    if (name && month === monthParam && !seen[name]) {
      submittedNames.push(name);
      seen[name] = true;
    }
  }

  return jsonResponse({ submitted_names: submittedNames, month: monthParam });
}

// ================================================================
//  doPost — Nhận báo cáo submit từ WebApp
//  Body JSON: { action: 'submit', name, report_week, tasks, monthly_data, ... }
// ================================================================
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || 'submit';

    if (action === 'submit') {
      return handleSubmit(body);
    }

    return jsonResponse({ error: 'action không hợp lệ' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ================================================================
//  handleGet — Trả về danh sách task kế hoạch tháng trước
//
//  Luồng:
//  1. Tìm nhân viên trong sheet "Kế hoạch" theo name + month trước
//  2. Trả về mảng tasks để WebApp hiển thị ở Bảng 1 (báo cáo)
// ================================================================
function handleGet(p) {
  var name       = (p.name       || '').trim();
  var monthParam = (p.month      || '').trim(); // VD: "Tháng 4"
  var discordId  = (p.discord_id || '').trim();

  if (!name) {
    return jsonResponse({ error: 'Thiếu tham số name' });
  }

  var ss        = SpreadsheetApp.getActiveSpreadsheet();

  // ── Lấy thông tin nhân viên (role/dept) từ sheet Nhân viên ──
  var memberInfo = getMemberInfo(ss, name, discordId);

  // ── Lấy kế hoạch tháng trước để hiển thị Bảng 1 ─────────────
  // Tháng trước so với tháng trong param
  var prevMonthLabel = getPrevMonthLabel(monthParam); // VD: "Tháng 3"
  var tasks          = getPlanTasks(ss, name, prevMonthLabel);

  // ── Kiểm tra đã submit tháng này chưa ────────────────────────
  var submittedAt = getSubmittedAt(ss, name, monthParam);

  return jsonResponse({
    tasks:       tasks,      // Kế hoạch tháng trước → Bảng 1 (báo cáo)
    planTasks:   [],         // Chưa có kế hoạch mới → Bảng 2 trống
    name:        name,
    role:        memberInfo.role       || '',
    dept:        memberInfo.dept       || '',
    reportTo:    memberInfo.reportTo   || 'CEO',
    isLate:      isLateSubmission(),
    submittedAt: submittedAt,
  });
}

// ================================================================
//  handleSubmit — Ghi báo cáo vào Google Sheet
//
//  Luồng:
//  1. Ghi header nếu chưa có
//  2. Ghi từng dòng task báo cáo (Bảng 1) vào sheet "Báo cáo tháng"
//  3. Ghi kế hoạch tháng tới (Bảng 2) vào sheet "Kế hoạch"
// ================================================================
function handleSubmit(body) {
  var name        = (body.name        || '').trim();
  var reportMonth = (body.report_week || '').trim(); // VD: "Tháng 4"
  var planMonth   = (body.plan_week   || '').trim(); // VD: "Tháng 5"
  var tasks       = body.tasks        || [];
  var monthlyData = body.monthly_data || {};
  var timestamp   = body.timestamp    || new Date().toISOString();
  var discordId   = body.discord_id   || '';
  var isLate      = body.is_late === true || body.is_late === 'true'; // Trạng thái nộp muộn

  if (!name || !reportMonth) {
    return jsonResponse({ error: 'Thiếu name hoặc report_week' });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var now = new Date(timestamp);
  var timeStr = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');

  // ── Ghi vào sheet "Báo cáo tháng" ────────────────────────────
  var sheetReport = getOrCreateSheet(ss, SHEET_REPORT);
  ensureReportHeaders(sheetReport);

  // Tách tasks: isNhiemVuCu = true → Bảng 1 (báo cáo)
  var oldTasks = tasks.filter(function(t) { return t.isNhiemVuCu; });
  var newTasks = tasks.filter(function(t) { return !t.isNhiemVuCu; });

  // Xoá các dòng cũ của người này + tháng này (ghi đè nếu đã nộp trước)
  deleteRowsByNameMonth(sheetReport, name, reportMonth, 2);

  // Ghi từng dòng task báo cáo
  oldTasks.forEach(function(t, idx) {
    // Tính % đạt = Thực hiện / Kế hoạch * 100 (cap 999)
    var kh  = parseFloat(t.keHoach)  || 0;
    var th  = parseFloat(t.thucHien) || 0;
    var pct = kh > 0 ? Math.min(Math.round((th / kh) * 100), 999) : 0;

    sheetReport.appendRow([
      timeStr,              // A: Thời gian submit
      name,                 // B: Tên nhân viên
      discordId,            // C: Discord ID
      reportMonth,          // D: Tháng báo cáo
      idx + 1,              // E: STT
      t.noiDung   || '',    // F: Mô tả công việc
      t.donVi     || '',    // G: Đơn vị tính
      t.keHoach   || 0,     // H: Kế hoạch (số lượng)
      t.thucHien  || 0,     // I: Thực hiện (số lượng)
      t.trongSo   || 1,     // J: Trọng số (1/2/3)
      pct + '%',            // K: % đạt
      t.datDuoc   || 0,     // L: Điểm đạt được
      t.deadline  || '',    // M: Deadline
      t.ghiChu    || '',    // N: Ghi chú
      // Extras — chỉ ghi ở dòng đầu tiên, còn lại để trống
      idx === 0 ? (monthlyData.achievements || '') : '',  // O: Thành tựu
      idx === 0 ? (monthlyData.difficulties || '') : '',  // P: Khó khăn
      idx === 0 ? (monthlyData.priorities   || '') : '',  // Q: Mục tiêu tháng tới
      idx === 0 ? (monthlyData.rating       || 3)  : '',  // R: Tự đánh giá (sao)
      idx === 0 ? getRatingLabel(monthlyData.rating) : '', // S: Nhãn đánh giá
      idx === 0 ? (isLate ? 'Nộp muộn' : 'Đúng hạn') : '', // T: Trạng thái nộp
    ]);
  });

  // ── Ghi vào sheet "Kế hoạch" (lưu kế hoạch tháng tới) ────────
  var sheetPlan = getOrCreateSheet(ss, SHEET_PLAN);
  ensurePlanHeaders(sheetPlan);

  // Xoá kế hoạch cũ của người này + planMonth (nếu đã lưu trước)
  if (planMonth) {
    deleteRowsByNameMonth(sheetPlan, name, planMonth, 2);

    newTasks.forEach(function(t, idx) {
      sheetPlan.appendRow([
        timeStr,              // A: Thời gian lưu
        name,                 // B: Tên nhân viên
        discordId,            // C: Discord ID
        planMonth,            // D: Tháng kế hoạch
        idx + 1,              // E: STT
        t.noiDung   || '',    // F: Mô tả công việc
        t.donVi     || '',    // G: Đơn vị tính
        t.keHoach   || 0,     // H: Kế hoạch (số lượng)
        t.trongSo   || 1,     // I: Trọng số (1/2/3)
        t.deadline  || '',    // J: Deadline dự kiến
        t.ghiChu    || '',    // K: Ghi chú
      ]);
    });
  }

  return jsonResponse({ success: true, message: 'Đã lưu báo cáo tháng ' + reportMonth + ' của ' + name });
}

// ================================================================
//  HELPER FUNCTIONS
// ================================================================

/** Trả về info nhân viên từ sheet "Nhân viên" theo name hoặc discordId */
function getMemberInfo(ss, name, discordId) {
  try {
    var sheet = ss.getSheetByName(SHEET_MEMBER);
    if (!sheet) return {};
    var data = sheet.getDataRange().getValues();
    // Header: A=Tên, B=Role, C=Phòng ban, D=Báo cáo lên, E=Discord ID
    for (var i = 1; i < data.length; i++) {
      var rowName = (data[i][0] || '').toString().trim().toLowerCase();
      var rowDiscord = (data[i][4] || '').toString().trim();
      if (rowName === name.toLowerCase() || (discordId && rowDiscord === discordId)) {
        return {
          name:     data[i][0] || name,
          role:     data[i][1] || '',
          dept:     data[i][2] || '',
          reportTo: data[i][3] || 'CEO',
        };
      }
    }
  } catch (e) { /* Sheet chưa tồn tại — bỏ qua */ }
  return {};
}

/** Lấy danh sách task kế hoạch từ sheet "Kế hoạch" theo name + month */
function getPlanTasks(ss, name, monthLabel) {
  try {
    var sheet = ss.getSheetByName(SHEET_PLAN);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var tasks = [];
    // Header: A=Time, B=Tên, C=Discord, D=Tháng, E=STT, F=Mô tả, G=Đơn vị, H=KH, I=Trọng số, J=Deadline, K=Ghi chú
    for (var i = 1; i < data.length; i++) {
      var rowName  = (data[i][1] || '').toString().trim().toLowerCase();
      var rowMonth = (data[i][3] || '').toString().trim();
      if (rowName !== name.toLowerCase()) continue;
      if (monthLabel && rowMonth !== monthLabel) continue;

      tasks.push({
        id:          'server_' + i,
        noiDung:     data[i][5] || '',
        donVi:       data[i][6] || '',
        keHoach:     data[i][7] || '',
        trongSo:     data[i][8] || 1,
        deadline:    data[i][9] || '',
        ghiChu:      data[i][10] || '',
        isNhiemVuCu: true,    // Đây là kế hoạch cũ → sẽ trở thành Bảng 1 BC
        thucHien:    null,    // Chưa điền, user sẽ điền
        datDuoc:     0,
      });
    }
    return tasks;
  } catch (e) {
    return [];
  }
}

/** Kiểm tra nhân viên đã submit tháng này chưa → trả về timestamp hoặc null */
function getSubmittedAt(ss, name, monthLabel) {
  try {
    var sheet = ss.getSheetByName(SHEET_REPORT);
    if (!sheet) return null;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var rowName  = (data[i][1] || '').toString().trim().toLowerCase();
      var rowMonth = (data[i][3] || '').toString().trim();
      if (rowName === name.toLowerCase() && rowMonth === monthLabel) {
        return data[i][0] ? data[i][0].toString() : null;
      }
    }
  } catch (e) { /* ignore */ }
  return null;
}

/** Xóa tất cả dòng của name + month trong sheet (từ dòng startRow) */
function deleteRowsByNameMonth(sheet, name, monthLabel, startRow) {
  var data = sheet.getDataRange().getValues();
  // Duyệt từ cuối lên để xóa không lệch index
  for (var i = data.length - 1; i >= startRow - 1; i--) {
    var rowName  = (data[i][1] || '').toString().trim().toLowerCase();
    var rowMonth = (data[i][3] || '').toString().trim();
    if (rowName === name.toLowerCase() && rowMonth === monthLabel) {
      sheet.deleteRow(i + 1);
    }
  }
}

/** Tạo sheet nếu chưa có */
function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/** Đảm bảo header cho sheet Báo cáo tháng */
function ensureReportHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Thời gian',         // A
      'Tên nhân viên',     // B
      'Discord ID',        // C
      'Tháng BC',          // D
      'STT',               // E
      'Mô tả công việc',   // F
      'Đơn vị',            // G
      'Kế hoạch',          // H
      'Thực hiện',         // I
      'Trọng số',          // J
      '% Đạt',             // K
      'Điểm đạt',          // L
      'Deadline',          // M
      'Ghi chú',           // N
      'Thành tựu',         // O
      'Khó khăn',          // P
      'Mục tiêu tháng tới',// Q
      'Tự đánh giá (sao)', // R
      'Nhãn đánh giá',     // S
      'Trạng thái nộp',    // T ← Mới: ghi nhận Đúng hạn / Nộp muộn
    ]);
    // Format header
    sheet.getRange(1, 1, 1, 20)
      .setBackground('#1e3a5f')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

/** Đảm bảo header cho sheet Kế hoạch */
function ensurePlanHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Thời gian',         // A
      'Tên nhân viên',     // B
      'Discord ID',        // C
      'Tháng KH',          // D
      'STT',               // E
      'Mô tả công việc',   // F
      'Đơn vị',            // G
      'Kế hoạch',          // H
      'Trọng số',          // I
      'Deadline dự kiến',  // J
      'Ghi chú',           // K
    ]);
    sheet.getRange(1, 1, 1, 11)
      .setBackground('#1e3a5f')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

/** Tính tháng trước từ label "Tháng X" */
function getPrevMonthLabel(monthLabel) {
  // monthLabel VD: "Tháng 4"
  var match = (monthLabel || '').match(/(\d+)/);
  if (!match) return '';
  var m = parseInt(match[1]);
  var prev = m === 1 ? 12 : m - 1;
  return 'Tháng ' + prev;
}

/** Kiểm tra nộp muộn — sau 24:00 ngày mùng 4 hàng tháng (giờ VN UTC+7) = muộn */
function isLateSubmission() {
  var vnNow = new Date(new Date().getTime() + 7 * 3600 * 1000);
  return vnNow.getUTCDate() > 4;
}

/** Nhãn tự đánh giá theo số sao */
function getRatingLabel(stars) {
  var labels = {
    1: 'Chưa đạt yêu cầu',
    2: 'Cần cải thiện',
    3: 'Đạt yêu cầu',
    4: 'Tốt',
    5: 'Xuất sắc',
  };
  return labels[stars] || 'Đạt yêu cầu';
}

/** Trả về ContentService JSON response */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
