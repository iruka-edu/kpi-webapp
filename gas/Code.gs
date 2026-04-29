// ============================================================
// Code.gs — IruKa Evaluation GAS Backend
// Spreadsheet: trial_evaluations | trial_work_summary
//              trial_criteria   | trial_proposals | staff_directory
//
// Actions POST: init_evaluation, mgr_fill, nv_submit,
//               mgr_review, ceo_review, send_result, acknowledge
// Actions GET:  get_evaluation, get_full_evaluation,
//               get_status, list_evaluations
//
// Cấu hình: File > Project properties > Script properties
//   WEBAPP_URL          — URL Next.js (vd: https://kpi.irukaedu.vn)
//   DISCORD_WEBHOOK_HR  — Webhook URL kênh HR
//   DISCORD_WEBHOOK_CEO — Webhook URL kênh CEO / DM
//   KPI_TOKEN_SECRET    — Cùng secret với Bot/Vercel KPI_TOKEN_SECRET
//                         (dùng chung với /weekly /monthly cho dễ đồng bộ)
// ============================================================

// ── Tên sheet ─────────────────────────────────────────────────
var SHEET_EVAL     = 'trial_evaluations';
var SHEET_WORK     = 'trial_work_summary';
var SHEET_CRITERIA = 'trial_criteria';
var SHEET_PROPOSAL = 'trial_proposals';
var SHEET_STAFF    = 'staff_directory';

// ── Header từng sheet ─────────────────────────────────────────
// LƯU Ý: thêm cột mới vào CUỐI để không vỡ cột cũ. updateRow() chỉ update theo tên,
// nên thêm field mới sẽ tự ghi vào cột mới mà không cần migrate row hiện có.
var HEADERS = {
  trial_evaluations: [
    'id','name','discord_id','dept','role',
    'manager_name','manager_discord_id','hr_discord_id',
    'trial_start','trial_end','eval_date',
    'status','decision','mgr_comment','ceo_comment','mgr_note',
    'init_at','mgr_pending_at','nv_pending_at','submitted_at',
    'mgr_reviewed_at','ceo_reviewed_at','result_sent_at','acknowledged_at',
    // Mở rộng: chữ ký 4 vai (HR / NV / QL / CEO) — auto-fill từ Discord member name
    'hr_signed_at','hr_signed_by','nv_signed_at','nv_signed_by',
    'mgr_signed_at','mgr_signed_by','ceo_signed_at','ceo_signed_by',
    // Mở rộng: nhận xét QL/CEO bổ sung (tách từ mgr_comment cũ)
    'mgr_expectation','mgr_salary_proposal'
  ],
  trial_work_summary: ['eval_id','stt','area','detail','result'],
  trial_criteria:     ['eval_id','stt','name','expectation','self_score','mgr_score','note','source'],
  trial_proposals:    ['eval_id','salary_expectation','training_request','feedback'],
  staff_directory:    ['name','discord_id','dept','role','manager_name','manager_discord_id']
};

// ── Helper: trích chữ ký từ payload và build object updates ───
// Form mới gửi `signatures: { hr|nv|mgr|ceo: { signed_at, signed_by, discord_id } }`
// Function này đọc 1 vai cụ thể và trả về fields tương ứng cho updateRow.
function extractSignatureFields(d, role) {
  var sig = (d && d.signatures && d.signatures[role]) || null;
  if (!sig) return {};
  var out = {};
  out[role + '_signed_at'] = sig.signed_at || now();
  out[role + '_signed_by'] = sig.signed_by || '';
  return out;
}

// ── Lấy/tạo sheet ─────────────────────────────────────────────
function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(HEADERS[name]);
    sh.setFrozenRows(1);
    return sh;
  }
  // Auto-migrate: thêm cột thiếu nếu HEADERS schema được mở rộng (vd: signatures, mgr_expectation)
  // Cột cũ giữ nguyên thứ tự, cột mới append vào cuối.
  if (HEADERS[name]) {
    var lastCol = sh.getLastColumn() || 0;
    var current = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    var missing = HEADERS[name].filter(function(h) { return current.indexOf(h) === -1; });
    if (missing.length > 0) {
      sh.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
    }
  }
  return sh;
}

// ── Sinh ID dạng EVAL-YYYYMMDD-XXXX ──────────────────────────
function generateId() {
  var d = new Date();
  var date = Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var rand = Math.random().toString(36).substr(2, 4).toUpperCase();
  return 'EVAL-' + date + '-' + rand;
}

// ── Lấy script property ───────────────────────────────────────
function prop(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

// ── Đọc tất cả row của sheet thành array of object ────────────
function sheetToObjects(sheetName) {
  var sh = getSheet(sheetName);
  var rows = sh.getDataRange().getValues();
  if (rows.length < 2) return [];
  var headers = rows[0];
  return rows.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

// ── Lấy object theo eval_id ───────────────────────────────────
function findByEvalId(sheetName, evalId) {
  return sheetToObjects(sheetName).filter(function(r) {
    return r.eval_id === evalId || r.id === evalId;
  });
}

// ── Cập nhật row trong sheet theo cột id hoặc eval_id ─────────
function updateRow(sheetName, idField, idValue, updates) {
  var sh = getSheet(sheetName);
  var rows = sh.getDataRange().getValues();
  var headers = rows[0];
  for (var i = 1; i < rows.length; i++) {
    var idx = headers.indexOf(idField);
    if (rows[i][idx] === idValue) {
      Object.keys(updates).forEach(function(key) {
        var col = headers.indexOf(key);
        if (col >= 0) sh.getRange(i + 1, col + 1).setValue(updates[key]);
      });
      return true;
    }
  }
  return false;
}

// ── Tạo HMAC token (cùng logic với Next.js) ───────────────────
function makeToken(discordId, evalId) {
  // Dùng chung secret KPI_TOKEN_SECRET với /weekly /monthly — đồng bộ Bot/Vercel/GAS
  var secret = prop('KPI_TOKEN_SECRET') || 'iruka-kpi-token-secret-2026';
  var window  = Math.floor(Date.now() / (72 * 3600 * 1000));
  var payload = discordId + ':' + evalId + ':' + window;
  var sig = Utilities.computeHmacSha256Signature(payload, secret);
  return sig.map(function(b) {
    return ('0' + (b & 0xff).toString(16)).slice(-2);
  }).join('');
}

// ── Build link với token ───────────────────────────────────────
function buildLink(path, evalId, discordId) {
  var base = prop('WEBAPP_URL') || 'https://kpi.irukaedu.vn';
  var token = makeToken(discordId, evalId);
  return base + path + '?id=' + evalId + '&discord_id=' + discordId + '&token=' + token;
}

// ── Gửi DM/thông báo qua Next.js Bot Relay ───────────────────
// WebApp expose POST /api/discord/notify → bot gửi DM
// ccEmbedData (optional): nội dung riêng cho CC — nếu null bot dùng lại embedData
function notifyDiscord(targetDiscordId, embedData, ccDiscordId, ccEmbedData) {
  var webappUrl = prop('WEBAPP_URL');
  if (!webappUrl) {
    Logger.log('notifyDiscord: WEBAPP_URL chưa cấu hình — skip DM');
    return;
  }
  if (!targetDiscordId) {
    Logger.log('notifyDiscord: targetDiscordId rỗng — skip DM');
    return;
  }
  try {
    // FIX BUG #10: muteHttpExceptions: true vẫn để (không throw GAS lỗi),
    //             nhưng đọc response code + body để log rõ khi lỗi → dễ debug.
    var resp = UrlFetchApp.fetch(webappUrl + '/api/discord/notify', {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({
        secret: prop('KPI_TOKEN_SECRET'),
        to: targetDiscordId,
        cc: ccDiscordId || null,
        embed: embedData,
        cc_embed: ccEmbedData || null
      })
    });
    var code = resp.getResponseCode();
    if (code < 200 || code >= 300) {
      Logger.log('notifyDiscord: HTTP ' + code + ' — to=' + targetDiscordId
        + ' body=' + resp.getContentText().slice(0, 500));
    }
  } catch(e) {
    Logger.log('notifyDiscord exception: to=' + targetDiscordId + ' err=' + e);
  }
}

// ── Build embed Discord ────────────────────────────────────────
function makeEmbed(title, desc, color, fields, link, linkLabel) {
  var embed = { title: title, description: desc, color: color, fields: fields || [] };
  if (link) embed.fields.push({ name: '🔗 Link form', value: '[' + (linkLabel||'Mở form') + '](' + link + ')', inline: false });
  return embed;
}

// ============================================================
//  doGet — xử lý GET requests
// ============================================================
function doGet(e) {
  var action  = e.parameter.action  || '';
  var evalId  = e.parameter.eval_id || '';

  try {
    if (action === 'get_evaluation')      return ok(getEvaluation(evalId));
    if (action === 'get_full_evaluation') return ok(getFullEvaluation(evalId));
    if (action === 'get_status')          return ok(getStatus(evalId));
    if (action === 'list_evaluations')    return ok(listEvaluations(e.parameter));
    return err('Unknown GET action: ' + action);
  } catch(ex) {
    return err(ex.toString());
  }
}

// ============================================================
//  doPost — xử lý POST requests
// ============================================================
function doPost(e) {
  var data = JSON.parse(e.postData.contents || '{}');
  var action = data.action || '';

  try {
    if (action === 'init_evaluation') return ok(initEvaluation(data));
    if (action === 'mgr_fill')        return ok(mgrFill(data));
    if (action === 'nv_submit')       return ok(nvSubmit(data));
    if (action === 'mgr_review')      return ok(mgrReview(data));
    if (action === 'ceo_review')      return ok(ceoReview(data));
    if (action === 'send_result')     return ok(sendResult(data));
    if (action === 'acknowledge')     return ok(acknowledge(data));
    return err('Unknown POST action: ' + action);
  } catch(ex) {
    return err(ex.toString());
  }
}

// ── JSON helpers ──────────────────────────────────────────────
function ok(data)  { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function err(msg)  { return ok({ error: msg }); }
function now()     { return new Date().toISOString(); }

// ============================================================
//  ACTION 1: init_evaluation — HR tạo phiếu mới
//  Status: (new) → MGR_PENDING  |  hoặc NV_PENDING khi is_ceo_direct
//  Notify: QL nhận link mgr-fill  |  hoặc NV nhận link trực tiếp
// ============================================================
function initEvaluation(d) {
  var evalId = generateId();
  var sh = getSheet(SHEET_EVAL);
  var ts = now();
  var ceoId = prop('CEO_DISCORD_ID');
  // Luồng rút gọn khi Quản lý trực tiếp chính là CEO
  var isCeoDirect = !!(d.manager_discord_id && ceoId && d.manager_discord_id === ceoId);

  // Ghi row chính (24 cột nguyên thủy — các cột mở rộng update sau bằng updateRow)
  sh.appendRow([
    evalId, d.name, d.discord_id, d.dept, d.role,
    d.manager_name, d.manager_discord_id, d.hr_discord_id,
    d.trial_start, d.trial_end || '', d.eval_date,
    isCeoDirect ? 'NV_PENDING' : 'MGR_PENDING', '', '', '', '',
    ts, isCeoDirect ? '' : ts, isCeoDirect ? ts : '', '', '', '', '', ''
  ]);

  // Ghi chữ ký HR (vai khởi tạo)
  var hrSig = extractSignatureFields(d, 'hr');
  if (Object.keys(hrSig).length > 0) {
    updateRow(SHEET_EVAL, 'id', evalId, hrSig);
  }

  // Ghi tiêu chí mẫu HR điền (nếu có)
  if (d.criteria && d.criteria.length > 0) {
    var csh = getSheet(SHEET_CRITERIA);
    d.criteria.forEach(function(c, i) {
      csh.appendRow([evalId, i+1, c.name, c.expectation||'', '', '', '', 'hr_template']);
    });
  }

  // Ghi công việc HR điền sẵn trong luồng rút gọn (nếu có)
  if (isCeoDirect && d.work_summary && d.work_summary.length > 0) {
    var wsh = getSheet(SHEET_WORK);
    d.work_summary.forEach(function(w, i) {
      wsh.appendRow([evalId, i+1, w.area||'', w.detail||'', '']);
    });
  }

  if (isCeoDirect) {
    // Luồng rút gọn: skip MGR-fill, gửi link tự đánh giá thẳng cho NV
    var nvLink = buildLink('/evaluation', evalId, d.discord_id) + '&is_ceo_direct=1';
    notifyDiscord(d.discord_id,
      makeEmbed('📝 Bạn Có Phiếu Tự Đánh Giá',
        'HR vừa tạo phiếu đánh giá thử việc cho bạn.\nVui lòng vào form điền công việc đã làm và tự đánh giá.',
        0xF59E0B, [], nvLink, 'Tự đánh giá ngay'),
      d.hr_discord_id,
      makeEmbed('✅ Đã Tạo Phiếu Thành Công',
        'Đã gửi phiếu tự đánh giá cho **' + d.name + '** (' + d.dept + ').\nBot sẽ thông báo khi nhân viên nộp xong.',
        0x22C55E));
    if (ceoId) notifyDiscord(ceoId,
      makeEmbed('📋 Phiếu Đánh Giá Thử Việc: ' + d.name,
        'HR vừa tạo phiếu thử việc cho **' + d.name + '** (' + d.dept + ').\nNhân viên đang tự đánh giá — bạn sẽ nhận link review khi nộp xong.',
        0x94A3B8), null);
  } else {
    // Luồng thường: thông báo QL điền công việc
    // FIX BUG #2: dùng buildLink để có HMAC token (trước đây link không có token → 403)
    var link = buildLink('/evaluation/mgr-fill', evalId, d.manager_discord_id);
    var embed = makeEmbed(
      '📋 Phiếu Đánh Giá Thử Việc Mới',
      '**' + d.name + '** (' + d.dept + ' — ' + d.role + ')\nNgày đánh giá: ' + d.eval_date,
      0x3B82F6,
      [{ name: 'HR tạo', value: '<@' + d.hr_discord_id + '>', inline: true }],
      link, 'Điền công việc & tiêu chí'
    );
    notifyDiscord(d.manager_discord_id, embed, d.hr_discord_id,
      makeEmbed('✅ Đã Tạo Phiếu Thành Công',
        'Đã gửi phiếu cho Quản lý **' + d.manager_name + '** xem xét và điền đầu việc cho **' + d.name + '**.',
        0x22C55E));
    if (ceoId) notifyDiscord(ceoId,
      makeEmbed('📋 Phiếu Đánh Giá Thử Việc: ' + d.name,
        'HR vừa tạo phiếu thử việc cho **' + d.name + '** (' + d.dept + ').\nQuản lý **' + d.manager_name + '** đang điền đầu việc và tiêu chí.',
        0x94A3B8), null);
  }

  return { success: true, eval_id: evalId };
}

// ============================================================
//  ACTION 2: mgr_fill — QL điền đầu việc + tiêu chí
//  Status: MGR_PENDING → NV_PENDING
//  Notify: NV nhận link eval + CC HR
// ============================================================
function mgrFill(d) {
  var evalId = d.eval_id;

  // Xóa work summary cũ (nếu có) rồi ghi mới
  var wsh = getSheet(SHEET_WORK);
  deleteRowsByEvalId(SHEET_WORK, evalId);
  (d.work_summary || []).forEach(function(w, i) {
    wsh.appendRow([evalId, i+1, w.area, w.detail, '']);
  });

  // FIX BUG #7: Preserve tiêu chí có source='hr_template' khi QL submit
  //            Trước đây xóa toàn bộ → mất audit trail nguồn gốc tiêu chí HR.
  //            Bây giờ: backup HR template trước, xóa hết, ghi lại HR rồi mới ghi QL.
  var hrTemplateBackup = findByEvalId(SHEET_CRITERIA, evalId)
    .filter(function(r) { return r.source === 'hr_template'; });

  deleteRowsByEvalId(SHEET_CRITERIA, evalId);
  var csh = getSheet(SHEET_CRITERIA);

  // Ghi lại HR template (giữ source gốc)
  hrTemplateBackup.forEach(function(row, i) {
    csh.appendRow([
      evalId, i + 1, row.name, row.expectation || '',
      row.self_score || '', row.mgr_score || '', row.note || '',
      'hr_template'
    ]);
  });

  // Append tiêu chí QL submit lần này — bỏ qua items trùng với HR template (cùng name)
  // để tránh ghi đè/trùng. QL muốn modify HR template thì đổi tên hoặc HR sửa lại từ đầu.
  var hrNames = {};
  hrTemplateBackup.forEach(function(r) { hrNames[r.name] = true; });
  var startStt = hrTemplateBackup.length;
  (d.criteria || []).forEach(function(c, i) {
    if (c.source === 'hr_template' || hrNames[c.name]) return; // đã preserve ở trên
    csh.appendRow([evalId, startStt + i + 1, c.name, c.expectation || '', '', '', '', c.source || 'mgr']);
  });

  // Cập nhật status
  // Update status + chữ ký QL (lần 1: mgr-fill)
  var mgrFillUpdates = { status: 'NV_PENDING', mgr_pending_at: now() };
  var mgrFillSig = extractSignatureFields(d, 'mgr');
  for (var k in mgrFillSig) { mgrFillUpdates[k] = mgrFillSig[k]; }
  updateRow(SHEET_EVAL, 'id', evalId, mgrFillUpdates);

  // Lấy thông tin NV
  var evalObj = getEvalObj(evalId);
  var nvLink  = buildLink('/evaluation', evalId, evalObj.discord_id);
  var embed   = makeEmbed(
    '📝 Bạn Có Phiếu Tự Đánh Giá',
    'Quản lý **' + evalObj.manager_name + '** vừa hoàn thành điền công việc.\nHãy vào form tự chấm điểm và điền kết quả thực tế.',
    0xF59E0B, [], nvLink, 'Tự đánh giá ngay'
  );
  notifyDiscord(evalObj.discord_id, embed, evalObj.hr_discord_id,
    makeEmbed('📋 Quản Lý Đã Điền Xong',
      'Quản lý **' + evalObj.manager_name + '** đã điền đầu việc và tiêu chí cho **' + evalObj.name + '**.\nNhân viên đang tự đánh giá.',
      0x3B82F6));

  return { success: true };
}

// ============================================================
//  ACTION 3: nv_submit — NV nộp tự đánh giá
//  Status: NV_PENDING → SUBMITTED
//  Notify: QL nhận thông báo  |  hoặc CEO nhận link ceo-review
// ============================================================
function nvSubmit(d) {
  var evalId = d.eval_id;
  var ceoId  = prop('CEO_DISCORD_ID');
  var evalObj = getEvalObj(evalId);
  var isCeoDirect = !!(evalObj && ceoId && evalObj.manager_discord_id === ceoId);

  // ── Work summary ──────────────────────────────────────────────
  var wsh = getSheet(SHEET_WORK);
  if (isCeoDirect) {
    // NV tự điền toàn bộ công việc từ đầu → xóa cũ + insert mới
    deleteRowsByEvalId(SHEET_WORK, evalId);
    (d.work_summary || []).forEach(function(w, i) {
      wsh.appendRow([evalId, i+1, w.area||'', w.detail||'', w.result||'']);
    });
  } else {
    // Luồng thường: chỉ cập nhật cột result
    var wRows = wsh.getDataRange().getValues();
    var wHeaders = wRows[0];
    (d.work_summary || []).forEach(function(w) {
      for (var i = 1; i < wRows.length; i++) {
        if (wRows[i][wHeaders.indexOf('eval_id')] === evalId &&
            wRows[i][wHeaders.indexOf('stt')]     === w.stt) {
          wsh.getRange(i+1, wHeaders.indexOf('result')+1).setValue(w.result);
        }
      }
    });
  }

  // ── Criteria ──────────────────────────────────────────────────
  var csh = getSheet(SHEET_CRITERIA);
  var existingCriteria = findByEvalId(SHEET_CRITERIA, evalId);
  if (isCeoDirect && existingCriteria.length === 0) {
    // HR chưa điền tiêu chí trước → NV tự điền toàn bộ
    (d.criteria_scores || []).forEach(function(cs, i) {
      csh.appendRow([evalId, i+1, cs.name||'', cs.expectation||'', cs.self_score||0, '', cs.note||'', 'nv_fill']);
    });
  } else {
    // Luồng thường: cập nhật điểm tự chấm
    var cRows = csh.getDataRange().getValues();
    var cHeaders = cRows[0];
    (d.criteria_scores || []).forEach(function(cs) {
      for (var i = 1; i < cRows.length; i++) {
        if (cRows[i][cHeaders.indexOf('eval_id')] === evalId &&
            cRows[i][cHeaders.indexOf('stt')]     === cs.stt) {
          csh.getRange(i+1, cHeaders.indexOf('self_score')+1).setValue(cs.self_score);
          if (cs.note) csh.getRange(i+1, cHeaders.indexOf('note')+1).setValue(cs.note);
        }
      }
    });
    // Tiêu chí NV thêm mới
    var existingStts = cRows.slice(1)
      .filter(function(r) { return r[cHeaders.indexOf('eval_id')] === evalId; })
      .map(function(r) { return r[cHeaders.indexOf('stt')]; });
    var maxStt = existingStts.length > 0 ? Math.max.apply(null, existingStts) : 0;
    (d.criteria_new || []).forEach(function(cn, i) {
      csh.appendRow([evalId, maxStt+i+1, cn.name, cn.expectation||'', cn.self_score||'', '', '', 'nv_added']);
    });
  }

  // ── Đề xuất NV ───────────────────────────────────────────────
  if (d.proposals) {
    deleteRowsByEvalId(SHEET_PROPOSAL, evalId);
    getSheet(SHEET_PROPOSAL).appendRow([evalId, d.proposals.salary_expectation||'', d.proposals.training_request||'', d.proposals.feedback||'']);
  }

  // Update status + chữ ký NV
  var nvUpdates = { status: 'SUBMITTED', nv_pending_at: now(), submitted_at: now() };
  var nvSig = extractSignatureFields(d, 'nv');
  for (var k2 in nvSig) { nvUpdates[k2] = nvSig[k2]; }
  updateRow(SHEET_EVAL, 'id', evalId, nvUpdates);

  // ── Thông báo ─────────────────────────────────────────────────
  if (isCeoDirect) {
    // Luồng rút gọn: gửi CEO link ceo-review (HMAC token)
    // FIX BUG #2: path đúng là /evaluation/ceo-review (folder webapp), không phải /evaluation/ceo
    var ceoLink = buildLink('/evaluation/ceo-review', evalId, ceoId);
    notifyDiscord(ceoId,
      makeEmbed('✅ NV Đã Nộp Phiếu Tự Đánh Giá',
        '**' + evalObj.name + '** đã hoàn thành tự đánh giá.\nVui lòng xem xét và phê duyệt.',
        0x8B5CF6, [], ceoLink, 'Xem & Phê duyệt'),
      evalObj.hr_discord_id,
      makeEmbed('📋 Nhân Viên Đã Nộp Phiếu',
        '**' + evalObj.name + '** đã hoàn thành tự đánh giá.\nCEO đang xem xét — bạn sẽ nhận thông báo sau khi CEO phê duyệt.',
        0x94A3B8));
  } else {
    // Luồng thường: gửi QL link mgr-review (chấm điểm + quyết định)
    // FIX BUG #2: trước đây code trỏ /evaluation/mgr-fill (sai context — QL đã điền xong)
    //            + thiếu HMAC token → đổi sang /evaluation/mgr-review + buildLink
    var mgrLink = buildLink('/evaluation/mgr-review', evalId, evalObj.manager_discord_id);
    notifyDiscord(evalObj.manager_discord_id,
      makeEmbed('✅ NV Đã Nộp Phiếu Tự Đánh Giá',
        '**' + evalObj.name + '** đã hoàn thành tự đánh giá. Vui lòng chấm điểm và đưa ra quyết định.',
        0x8B5CF6, [], mgrLink, 'Chấm điểm & Quyết định'),
      evalObj.hr_discord_id,
      makeEmbed('📋 Nhân Viên Đã Nộp Phiếu',
        '**' + evalObj.name + '** đã hoàn thành tự đánh giá.\nQuản lý **' + evalObj.manager_name + '** đang chấm điểm và đưa ra quyết định.',
        0x94A3B8));
  }

  return { success: true };
}

// ============================================================
//  ACTION 4: mgr_review — QL chấm điểm + quyết định
//  Status: SUBMITTED → PENDING_CEO
//  Notify: CEO + CC HR
// ============================================================
function mgrReview(d) {
  var evalId = d.eval_id;

  // Ghi điểm QL vào criteria
  var csh = getSheet(SHEET_CRITERIA);
  var cRows = csh.getDataRange().getValues();
  var cHeaders = cRows[0];
  (d.mgr_scores || []).forEach(function(ms) {
    for (var i = 1; i < cRows.length; i++) {
      if (cRows[i][cHeaders.indexOf('eval_id')] === evalId &&
          cRows[i][cHeaders.indexOf('stt')]     === ms.stt) {
        csh.getRange(i+1, cHeaders.indexOf('mgr_score')+1).setValue(ms.mgr_score);
        if (ms.note) csh.getRange(i+1, cHeaders.indexOf('note')+1).setValue(ms.note);
      }
    }
  });

  // Update status + nhận xét + chữ ký QL (lần 2: mgr-review — ghi đè signature lần 1)
  var mgrReviewUpdates = {
    status: 'PENDING_CEO',
    decision: d.mgr_decision || '',
    mgr_comment: d.mgr_comment || '',
    mgr_expectation: d.mgr_expectation || '',
    mgr_salary_proposal: d.mgr_salary_proposal || '',
    mgr_reviewed_at: now()
  };
  var mgrReviewSig = extractSignatureFields(d, 'mgr');
  for (var k3 in mgrReviewSig) { mgrReviewUpdates[k3] = mgrReviewSig[k3]; }
  updateRow(SHEET_EVAL, 'id', evalId, mgrReviewUpdates);

  var evalObj = getEvalObj(evalId);
  var ceoId   = prop('CEO_DISCORD_ID');
  // FIX BUG #2: trước đây link thiếu token + sai path (/evaluation/ceo) → CEO bị 403
  //            + path đúng là /evaluation/ceo-review (theo folder webapp)
  var ceoLink = ceoId ? buildLink('/evaluation/ceo-review', evalId, ceoId) : '';
  if (ceoId) {
    notifyDiscord(ceoId,
      makeEmbed('📊 Phiếu Chờ Phê Duyệt', '**' + evalObj.name + '** — Quản lý đề xuất: **' + (d.mgr_decision||'') + '**\nVui lòng xem xét và phê duyệt.', 0xF97316, [], ceoLink, 'Phê duyệt'),
      evalObj.hr_discord_id,
      makeEmbed('📊 Quản Lý Đã Chấm Điểm Xong',
        'Quản lý **' + evalObj.manager_name + '** đã chấm điểm phiếu **' + evalObj.name + '** (đề xuất: **' + (d.mgr_decision||'chưa rõ') + '**).\nCEO đang phê duyệt.',
        0x94A3B8));
  }

  return { success: true };
}

// ============================================================
//  ACTION 5: ceo_review — CEO phê duyệt hoặc trả về
//  Status:
//    - approve + thường  : PENDING_CEO → COMPLETED
//    - approve + rút gọn : PENDING_CEO → PENDING_HR
//    - reject (cả 2)     : PENDING_CEO → REJECTED
//  Notify:
//    - thường  : QL nhận thông báo (link mgr-review) + CC HR
//    - rút gọn : HR nhận thông báo (gửi kết quả) + NV nhận tin báo chờ HR
// ============================================================
function ceoReview(d) {
  var evalId = d.eval_id;

  // FIX BUG #8: GAS tự tính newStatus dựa trên is_ceo_direct của row, không phụ thuộc webapp gửi.
  // Trước đây dùng d.status || (approve ? COMPLETED : UNDER_REVIEW) → nếu webapp quên gửi status
  // sẽ default sai (UNDER_REVIEW không nằm trong enum chuẩn).
  var evalObj = getEvalObj(evalId);
  var ceoId   = prop('CEO_DISCORD_ID');
  var isCeoDirect = !!(evalObj && ceoId && evalObj.manager_discord_id === ceoId);

  var newStatus;
  if (d.ceo_action === 'reject') {
    newStatus = 'REJECTED';
  } else if (d.ceo_action === 'approve') {
    newStatus = isCeoDirect ? 'PENDING_HR' : 'COMPLETED';
  } else {
    // Action không hợp lệ — fallback giữ status cũ và log
    Logger.log('ceoReview: ceo_action không hợp lệ: ' + d.ceo_action);
    newStatus = (evalObj && evalObj.status) || 'PENDING_CEO';
  }

  // Update status + chữ ký CEO
  var ceoUpdates = {
    status: newStatus,
    ceo_comment: d.ceo_comment || '',
    ceo_reviewed_at: now()
  };
  var ceoSig = extractSignatureFields(d, 'ceo');
  for (var k4 in ceoSig) { ceoUpdates[k4] = ceoSig[k4]; }
  updateRow(SHEET_EVAL, 'id', evalId, ceoUpdates);

  if (isCeoDirect) {
    // Luồng rút gọn: CEO đã đánh giá → notify HR + CC NV
    var isApproved = (newStatus === 'PENDING_HR');
    notifyDiscord(evalObj.hr_discord_id,
      makeEmbed(
        isApproved ? '✅ CEO Đã Đánh Giá Xong' : '🔄 CEO Yêu Cầu Xem Lại',
        isApproved
          ? 'CEO đã đánh giá xong phiếu **' + evalObj.name + '**. Vui lòng gửi kết quả cho nhân viên.'
          : 'CEO yêu cầu xem lại phiếu **' + evalObj.name + '**: ' + (d.ceo_comment||''),
        isApproved ? 0x22C55E : 0xF59E0B, [], prop('WEBAPP_URL'), 'Xem dashboard'
      ), null);
    notifyDiscord(evalObj.discord_id,
      makeEmbed('⏳ Phiếu Đang Chờ HR Xử Lý',
        'CEO đã xem xét phiếu của bạn. HR sẽ gửi kết quả sớm.', 0x94A3B8), null);
  } else {
    // Luồng thường: notify QL
    // FIX BUG #2: link cũ trỏ /evaluation/mgr-fill (sai context — QL đã điền xong)
    //            + thiếu HMAC token → đổi sang /evaluation/mgr-review + buildLink
    var mgrLink = buildLink('/evaluation/mgr-review', evalId, evalObj.manager_discord_id);
    var title   = newStatus === 'COMPLETED' ? '✅ CEO Đã Phê Duyệt' : '🔄 CEO Yêu Cầu Xem Lại';
    var desc    = newStatus === 'COMPLETED'
      ? 'Phiếu của **' + evalObj.name + '** đã được CEO phê duyệt. Vui lòng gửi kết quả cho nhân viên.'
      : 'CEO yêu cầu xem lại phiếu **' + evalObj.name + '**: ' + (d.ceo_comment||'');
    var color   = newStatus === 'COMPLETED' ? 0x22C55E : 0xF59E0B;
    var hrTitle = newStatus === 'COMPLETED' ? '✅ CEO Đã Phê Duyệt' : '🔄 CEO Yêu Cầu Xem Lại';
    var hrDesc  = newStatus === 'COMPLETED'
      ? 'CEO đã phê duyệt phiếu **' + evalObj.name + '**. Quản lý **' + evalObj.manager_name + '** đang gửi kết quả cho nhân viên.'
      : 'CEO yêu cầu xem lại phiếu **' + evalObj.name + '**: ' + (d.ceo_comment||'') + '.\nQuản lý đang xử lý.';
    notifyDiscord(evalObj.manager_discord_id,
      makeEmbed(title, desc, color, [], mgrLink, 'Xem phiếu'),
      evalObj.hr_discord_id,
      makeEmbed(hrTitle, hrDesc, color));
  }

  return { success: true, new_status: newStatus };
}

// ============================================================
//  ACTION 6: send_result — QL gửi kết quả cho NV
//  Status: COMPLETED → RESULT_SENT
//  Notify: NV + CC CEO
// ============================================================
function sendResult(d) {
  var evalId = d.eval_id;

  updateRow(SHEET_EVAL, 'id', evalId, {
    status: 'RESULT_SENT',
    mgr_note: d.mgr_note || '',
    result_sent_at: now()
  });

  var evalObj = getEvalObj(evalId);
  var nvLink  = buildLink('/evaluation/result', evalId, evalObj.discord_id);
  var ceoId   = prop('CEO_DISCORD_ID');

  notifyDiscord(evalObj.discord_id,
    makeEmbed('🎉 Kết Quả Đánh Giá Thử Việc',
      'Kết quả đánh giá của bạn đã sẵn sàng.\n' + (d.mgr_note ? '> ' + d.mgr_note : ''),
      0x22C55E, [], nvLink, 'Xem kết quả'),
    ceoId || null,
    makeEmbed('✅ Kết Quả Đã Gửi Cho Nhân Viên',
      'Kết quả đánh giá thử việc của **' + evalObj.name + '** đã được gửi thành công. Phiếu hoàn tất.',
      0x94A3B8));

  return { success: true };
}

// ============================================================
//  ACTION 7: acknowledge — NV xác nhận đã xem kết quả
//  Status: RESULT_SENT → ACKNOWLEDGED
// ============================================================
function acknowledge(d) {
  updateRow(SHEET_EVAL, 'id', d.eval_id, {
    status: 'ACKNOWLEDGED',
    acknowledged_at: now()
  });
  return { success: true };
}

// ============================================================
//  GET: get_evaluation — NV lấy form (data cơ bản)
// ============================================================
function getEvaluation(evalId) {
  var evalObj = getEvalObj(evalId);
  if (!evalObj) return { error: 'Không tìm thấy phiếu: ' + evalId };
  evalObj.work_summary = findByEvalId(SHEET_WORK, evalId);
  evalObj.work_items   = evalObj.work_summary; // alias để form mới đọc
  evalObj.criteria     = findByEvalId(SHEET_CRITERIA, evalId);
  var props = findByEvalId(SHEET_PROPOSAL, evalId);
  evalObj.proposals = props.length > 0 ? props[0] : null;
  evalObj.proposal  = evalObj.proposals; // alias singular cho form mới

  // Rebuild signatures object từ các cột phẳng (hr_signed_at, hr_signed_by, ...)
  evalObj.signatures = {};
  ['hr', 'nv', 'mgr', 'ceo'].forEach(function(role) {
    var at = evalObj[role + '_signed_at'];
    var by = evalObj[role + '_signed_by'];
    if (at || by) {
      evalObj.signatures[role] = {
        signed_at: at || '',
        signed_by: by || '',
        discord_id: '' // Không lưu discord_id riêng — chỉ giữ tên
      };
    }
  });

  // Form mới expect info object — wrap các field vào info
  evalObj.info = {
    name: evalObj.name,
    discord_id: evalObj.discord_id,
    dept: evalObj.dept,
    role: evalObj.role,
    manager_name: evalObj.manager_name,
    manager_discord_id: evalObj.manager_discord_id,
    hr_discord_id: evalObj.hr_discord_id,
    trial_start: evalObj.trial_start,
    trial_end: evalObj.trial_end,
    eval_date: evalObj.eval_date
  };

  return evalObj;
}

// ============================================================
//  GET: get_full_evaluation — QL/CEO lấy form (đầy đủ điểm)
// ============================================================
function getFullEvaluation(evalId) {
  return getEvaluation(evalId); // cùng data, frontend tự filter theo role
}

// ============================================================
//  GET: get_status — NV tra cứu trạng thái
// ============================================================
function getStatus(evalId) {
  var evalObj = getEvalObj(evalId);
  if (!evalObj) return { error: 'Không tìm thấy phiếu: ' + evalId };
  return {
    status: evalObj.status,
    name:   evalObj.name,
    dept:   evalObj.dept,
    role:   evalObj.role,
    manager_name: evalObj.manager_name,
    eval_date:    evalObj.eval_date
  };
}

// ============================================================
//  GET: list_evaluations — Dashboard lấy danh sách
// ============================================================
function listEvaluations(params) {
  var all    = sheetToObjects(SHEET_EVAL);
  var status = params.status || '';
  var search = (params.search || '').toLowerCase();
  var result = all.filter(function(r) {
    if (status && r.status !== status) return false;
    if (search && r.name.toLowerCase().indexOf(search) < 0) return false;
    return true;
  }).sort(function(a, b) {
    return new Date(b.init_at) - new Date(a.init_at);
  });
  return { evaluations: result };
}

// ── Helper: lấy evaluation object theo id ─────────────────────
function getEvalObj(evalId) {
  var all = sheetToObjects(SHEET_EVAL);
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === evalId) return all[i];
  }
  return null;
}

// ── Helper: xóa tất cả row theo eval_id ──────────────────────
function deleteRowsByEvalId(sheetName, evalId) {
  var sh = getSheet(sheetName);
  var rows = sh.getDataRange().getValues();
  var headers = rows[0];
  var col = headers.indexOf('eval_id');
  if (col < 0) return;
  for (var i = rows.length; i >= 2; i--) {
    if (rows[i-1][col] === evalId) sh.deleteRow(i);
  }
}

// ── Utility: Chạy thủ công để khởi tạo / migrate tất cả sheet ─
// Chạy từ Apps Script Editor: chọn function này → Run → xem Logger để xác nhận.
// (Không dùng SpreadsheetApp.getUi() vì khi chạy từ editor sẽ lỗi "Cannot call getUi from this context")
function setupSheets() {
  var report = [];
  Object.keys(HEADERS).forEach(function(name) {
    var sh = getSheet(name); // tự đính kèm cột thiếu nếu sheet đã có sẵn
    var lastCol = sh.getLastColumn();
    report.push('  ✅ ' + name + ' — ' + lastCol + ' cột (header đã đồng bộ)');
  });
  Logger.log('========================================');
  Logger.log('✅ Đã khởi tạo / migrate ' + Object.keys(HEADERS).length + ' sheet:');
  report.forEach(function(line) { Logger.log(line); });
  Logger.log('========================================');
  Logger.log('Mở View > Logs (hoặc Ctrl+Enter) để xem chi tiết.');
  return { ok: true, sheets: Object.keys(HEADERS) };
}
