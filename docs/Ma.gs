// ============================================================
// HỆ THỐNG KPI 18 CỘT - ALL-IN-ONE (SETUP + LOGIC + DASHBOARD)
// IruKa Edu — Phiên bản đã sửa bug luồng báo cáo tuần
//
// BUG ĐÃ SỬA:
//   - doGet DEFAULT: Điều kiện query tasks trước đây dùng kpiType='Báo cáo thực hiện'
//     → sai vì nó lấy nhầm dữ liệu báo cáo tuần cũ thay vì Kế hoạch tuần cũ.
//   - Đã sửa thành kpiType='Kế hoạch tuần' và thucHien=null (NV tự điền)
//   - isPhatSinh field: task phát sinh (ngoài kế hoạch) cũng ghi là isNhiemVuCu=true
//     nhưng kpiType='Phát sinh' để phân biệt khi cần thống kê sau này.
//
// ============================================================
//
// SCHEMA 18 CỘT (CỐ ĐỊNH — KHÔNG ĐƯỢC THAY ĐỔI THỨ TỰ):
//   A(0)  = Tên nhân viên        D(3)  = Tuần báo cáo       G(6)  = Nội dung công việc
//   B(1)  = Phòng ban            E(4)  = Tuần kế hoạch       H(7)  = Ghi chú tiến độ
//   C(2)  = Vai trò / BC cho     F(5)  = STT                 I(8)  = Đơn vị
//   J(9)  = Số lượng (KH)        K(10) = Thực hiện           L(11) = % Hoàn Thành
//   M(12) = Trọng số             N(13) = Đạt được (diemKPI)  O(14) = Phân loại
//   P(15) = Thời gian nộp        Q(16) = Trạng thái duyệt    R(17) = Sếp Nhận Xét
//
// ACTIONS doGet:
//   (không có action)  → Lấy kế hoạch tuần cũ để điền vào WebApp
//   action=status      → Scheduler Bot kiểm tra ai đã nộp
//   action=list        → Dashboard Sếp: lấy tất cả báo cáo
//   action=result      → NV xem kết quả sau khi Sếp duyệt
//
// ACTIONS doPost:
//   (không có action)  → NV submit báo cáo KPI
//   action=approve     → Sếp duyệt / trả về + nhận xét
// ============================================================

const SHEET_NAME = 'data';

// ============================================================
// HÀM SETUP: Chỉ chạy 1 lần duy nhất để tạo 18 cột chuẩn
// ============================================================
function setupKPIHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  sheet.getRange(1, 1, 100, 30).clearContent().clearFormat();

  var headers = [
    "Tên nhân viên",         // A
    "Phòng ban",              // B
    "Vai trò / Báo cáo cho", // C
    "Tuần báo cáo",          // D
    "Tuần kế hoạch",         // E
    "STT",                   // F
    "Nội dung công việc",    // G
    "Ghi chú tiến độ",       // H
    "Đơn vị",                // I
    "Số lượng (KH)",         // J
    "Thực hiện",             // K
    "% Hoàn Thành",          // L
    "Trọng số",              // M
    "Đạt được",              // N
    "Phân loại",             // O  ← 'Kế hoạch tuần' | 'Báo cáo thực hiện' | 'Phát sinh'
    "Thời gian nộp",         // P
    "Trạng thái duyệt",      // Q
    "Sếp Nhận Xét"           // R
  ];

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground("#1e3a5f")
             .setFontColor("#FFFFFF")
             .setFontWeight("bold")
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");

  sheet.getRange(1, 11).setBackground("#e67e22"); // Cam: Thực hiện
  sheet.getRange(1, 14).setBackground("#27ae60"); // Xanh lá: Đạt được
  sheet.getRange(1, 17, 1, 2).setBackground("#f1c40f").setFontColor("#000000");

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 18);

  SpreadsheetApp.getUi().alert("🚀 HOÀN TẤT: 18 Cột đã được thiết lập chuẩn 100%!");
}

// ============================================================
// doGet — Đọc dữ liệu
// ============================================================
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Không tìm thấy tab: " + SHEET_NAME })).setMimeType(ContentService.MimeType.JSON);
    }
    const data = sheet.getDataRange().getValues();

    // ── ACTION=STATUS ──
    if (e.parameter.action === 'status') {
      const reportWeek = e.parameter.report_week;
      let submittedNames = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[3] === reportWeek) {
          if (!submittedNames.includes(row[0])) submittedNames.push(row[0]);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ submitted_names: submittedNames })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── ACTION=LIST ──
    if (e.parameter.action === 'list') {
      const reportMap = {};
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const key = row[0] + '_' + row[3];
        if (!reportMap[key]) {
          reportMap[key] = {
            name:            row[0],
            dept:            row[1],
            role:            row[2],
            report_week:     row[3],
            submitted_at:    row[15] ? row[15].toString() : '',
            is_late:         row[16] === 'Nộp muộn',
            total_score:     0,
            status:          row[16] || 'Chờ duyệt',
            manager_comment: row[17] || '',
            row_index:       i + 1,
          };
        }
        reportMap[key].total_score += Number(row[13]) || 0;
      }
      return ContentService.createTextOutput(JSON.stringify({ reports: Object.values(reportMap) })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── ACTION=RESULT ──
    if (e.parameter.action === 'result') {
      const reqName = e.parameter.name;
      const reqWeek = e.parameter.report_week;
      let tasks = [];
      let header = null;
      let totalScore = 0;

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] !== reqName || row[3] !== reqWeek) continue;

        if (!header) {
          header = {
            name:            row[0],
            dept:            row[1],
            role:            row[2],
            report_week:     row[3],
            submitted_at:    row[15] ? row[15].toString() : '',
            status:          row[16] || 'Chờ duyệt',
            manager_comment: row[17] || '',
          };
        }
        const diemKPI = Number(row[13]) || 0;
        totalScore += diemKPI;
        tasks.push({
          noiDung:  row[6],
          ghiChu:   row[7],
          donVi:    row[8],
          keHoach:  row[9],
          thucHien: row[10],
          phanTram: row[11],
          trongSo:  row[12],
          diemKPI:  diemKPI,
          kpiType:  row[14],
        });
      }

      if (!header) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'Không tìm thấy báo cáo' })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ ...header, total_score: totalScore, tasks: tasks })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── DEFAULT: WebApp lấy kế hoạch tuần cũ + kế hoạch đã nộp tuần này ──
    const reqName       = e.parameter.name;
    const reqReportWeek = e.parameter.report_week; // VD: "Tuần 15"
    const reqPlanWeek   = e.parameter.plan_week;   // VD: "Tuần 16"

    let tasks     = [];
    let planTasks = [];

    for (let i = 1; i < data.length; i++) {
      const row     = data[i];
      const kpiType = row[14]; // O = Phân loại

      // ── TASKS (Bảng 1: load các đầu việc KH cũ về để NV chốt Thực hiện) ──
      //
      // ✅ LOGIC ĐÚNG:
      //   • Tìm dòng có E (plan_week, row[4]) = reqReportWeek (VD: Tuần 15)
      //   • VÀ kpiType = 'Kế hoạch tuần'
      //   → Đây chính là những việc NV đã hứa làm trong Tuần 15 (plan_week khi nộp Tuần 14)
      //
      // ❌ BUG CŨ: dùng kpiType='Báo cáo thực hiện' → lấy nhầm data báo cáo Tuần 14
      //
      if (row[0] === reqName && row[4] === reqReportWeek && kpiType === 'Kế hoạch tuần') {
        tasks.push({
          id:          String(row[5]),       // F = STT
          isNhiemVuCu: true,
          isPhatSinh:  false,                // Task từ kế hoạch cũ → không phải phát sinh
          noiDung:     row[6],               // G
          ghiChu:      row[7],               // H
          donVi:       row[8],               // I
          keHoach:     Number(row[9]) || 1,  // J
          thucHien:    null,                 // K = null → NV tự điền trong kỳ này
          trongSo:     Number(row[12]) || 1, // M
          yeuCau:      1,
        });
      }

      // ── PLAN TASKS (Bảng 2: pre-fill khi NV sửa lần 2 trong cùng tuần) ──
      //   • Tìm dòng có D (report_week, row[3]) = reqReportWeek
      //   • VÀ kpiType = 'Kế hoạch tuần'
      //   → Kế hoạch NV vừa nộp trong Tuần này (để pre-fill Bảng 2 khi mở lại)
      //
      // Lưu ý: điều kiện này dùng row[3] (≠ row[4] ở trên) → không bị trùng với tasks
      //
      if (reqPlanWeek && row[0] === reqName && row[3] === reqReportWeek && kpiType === 'Kế hoạch tuần') {
        planTasks.push({
          id:          String(row[5]),
          isNhiemVuCu: false,
          isPhatSinh:  false,
          noiDung:     row[6],
          ghiChu:      row[7],
          donVi:       row[8],
          keHoach:     Number(row[9]) || 1,
          trongSo:     Number(row[12]) || 1,
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ tasks: tasks, planTasks: planTasks })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// doPost — Ghi dữ liệu
// ============================================================
function doPost(e) {
  try {
    const body  = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Không tìm thấy tab: " + SHEET_NAME })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── ACTION=APPROVE ──
    if (body.action === 'approve') {
      const currentData = sheet.getDataRange().getValues();
      let updatedCount = 0;
      for (let i = 1; i < currentData.length; i++) {
        if (currentData[i][0] === body.name && currentData[i][3] === body.report_week) {
          sheet.getRange(i + 1, 17).setValue(body.status);
          sheet.getRange(i + 1, 18).setValue(body.manager_comment);
          updatedCount++;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, updated: updatedCount })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── DEFAULT: NV Submit báo cáo KPI ──

    // BƯỚC 1: Xóa hết dữ liệu cũ cùng tuần (từ dưới lên tránh lệch index)
    const dataBeforeDelete = sheet.getDataRange().getValues();
    for (let i = dataBeforeDelete.length - 1; i >= 1; i--) {
      if (dataBeforeDelete[i][0] === body.name && dataBeforeDelete[i][3] === body.report_week) {
        sheet.deleteRow(i + 1);
      }
    }

    // BƯỚC 2: Ghi mới toàn bộ (allTasks = báo cáo thực hiện + kế hoạch mới + việc phát sinh)
    const allTasks = body.allTasks || [];
    const status   = body.is_late ? 'Nộp muộn' : 'Chờ duyệt';
    const timestamp = new Date();
    let stt = 1;

    allTasks.forEach(task => {
      let kpiType  = '';
      let thucHien = '';
      let phanTram = '';
      let datDuoc  = 0;

      if (task.isNhiemVuCu) {
        // Báo cáo thực hiện tuần cũ (gồm cả việc phát sinh)
        // isPhatSinh=true → ghi 'Phát sinh' để phân biệt thống kê
        kpiType  = task.isPhatSinh ? 'Phát sinh' : 'Báo cáo thực hiện';
        thucHien = Number(task.thucHien) || 0;
        const keHoach = Number(task.keHoach) || 1;
        const trongSo = Number(task.trongSo) || 1;
        if (keHoach > 0) {
          phanTram = ((thucHien / keHoach) * 100).toFixed(2) + '%';
          datDuoc  = parseFloat(((thucHien / keHoach) * trongSo).toFixed(2));
        }
      } else {
        // Kế hoạch tuần mới
        kpiType  = 'Kế hoạch tuần';
        thucHien = '';
        phanTram = '';
        datDuoc  = 0;
      }

      sheet.appendRow([
        body.name,         // A
        body.dept,         // B
        body.role,         // C
        body.report_week,  // D
        body.plan_week,    // E
        stt++,             // F
        task.noiDung,      // G
        task.ghiChu || '', // H
        task.donVi  || '', // I
        task.keHoach || 1, // J
        thucHien,          // K
        phanTram,          // L
        task.trongSo || 1, // M
        datDuoc,           // N
        kpiType,           // O  ← 'Kế hoạch tuần' | 'Báo cáo thực hiện' | 'Phát sinh'
        timestamp,         // P
        status,            // Q
        '',                // R
      ]);
    });

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Đã ghi ' + allTasks.length + ' dòng.' })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// onEdit — Trigger: Sếp duyệt → gửi Discord DM
// ============================================================
function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  if (range.getColumn() !== 17) return;

  const row = range.getRow();
  if (row === 1) return;

  const status = e.value;
  if (status !== 'Đã duyệt' && status !== 'Trả về') return;

  const tenNV      = sheet.getRange(row, 1).getValue();
  const reportWeek = sheet.getRange(row, 4).getValue();
  const comment    = sheet.getRange(row, 18).getValue() || '*(Không có nhận xét)*';

  const webhookUrl   = PropertiesService.getScriptProperties().getProperty('DISCORD_BOT_WEBHOOK');
  const kpiWebAppUrl = PropertiesService.getScriptProperties().getProperty('KPI_WEBAPP_URL') || '';

  if (!webhookUrl) return;

  const color = status === 'Đã duyệt' ? 3066993 : 15158332;

  const allData = sheet.getDataRange().getValues();
  let totalScore = 0;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === tenNV && allData[i][3] === reportWeek) {
      totalScore += Number(allData[i][13]) || 0;
    }
  }

  const resultLink = kpiWebAppUrl
    ? kpiWebAppUrl + '/result?name=' + encodeURIComponent(tenNV) + '&report_week=' + encodeURIComponent(reportWeek)
    : null;

  const payload = {
    embeds: [{
      title:       status === 'Đã duyệt' ? '✅ KẾT QUẢ KPI ĐÃ ĐƯỢC DUYỆT' : '↩️ BÁO CÁO ĐƯỢC TRẢ VỀ ĐỂ SỬA',
      description: 'Báo cáo **' + reportWeek + '** của **' + tenNV + '** đã được Sếp chấm!',
      color: color,
      fields: [
        { name: '📊 Kết quả',    value: '**' + status + '**',                    inline: true },
        { name: '🎯 Tổng điểm', value: '**' + totalScore.toFixed(2) + ' điểm**', inline: true },
        { name: '💬 Nhận xét',  value: '> ' + comment },
        ...(resultLink ? [{ name: '🔗 Xem chi tiết', value: resultLink }] : [])
      ],
      footer: { text: 'IruKa KPI System' }
    }]
  };

  UrlFetchApp.fetch(webhookUrl, {
    method:      'post',
    contentType: 'application/json',
    payload:     JSON.stringify(payload)
  });
}
