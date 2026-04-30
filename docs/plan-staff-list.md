# 📋 PLAN B v5 — Update giao diện `/staff-list`

> **Workflow**: `/2-plan-feature` → `/4-code-by-plan`
> **Status**: 🟢 **READY** — anh đã trả lời hết câu hỏi (lock)
> **Người duyệt**: Mr. Đào
> **Ngày**: 2026-04-30 | **Update v5**: trả lời O/P/Q/R
> **Liên quan**: Plan A *(sau)* — `/leave` web form (file riêng)

---

## 🎯 1. CONTEXT — Vì sao cần làm

### Vấn đề hiện tại của `/staff-list`
1. **Chỉ 10 cột** hiển thị → HR không thấy đầy đủ thông tin (thiếu SĐT phụ, quê, STK, ngày ký HĐ, lịch làm...)
2. **Click row → popup `/staff-edit`** chậm — HR muốn edit từng ô như Excel (click → gõ → save)
3. **Cột phép sai logic**: `monthlyLeaveUsed` chỉ tăng, không cộng dồn theo tháng → NV làm 6 tháng dùng 4 ngày bot báo `1-4 = -3` *(sai)*
4. **Lịch làm việc parttime** chưa quản lý — bot không biết NV làm/nghỉ buổi nào

### Outcome mong đợi
- ✅ Hiển thị **21 cột** đầy đủ thông tin NV
- ✅ **Inline edit Excel-like** — click ô → gõ → blur/Enter → tự lưu
- ✅ **3 cột phép realtime auto-compute** (Phép/tháng | Đã nghỉ | Còn dư)
- ✅ **Lịch làm việc parttime** popup grid 7×2 (Sáng/Chiều)
- ✅ **2 cơ chế edit song song**: Click TÊN → popup cũ, click ô khác → inline
- ✅ **Field bổ sung** Khẩn cấp + Pháp lý *(NHÓM A + B — anh tick OK)*

---

## ✅ 2. CÁC QUYẾT ĐỊNH ĐÃ DUYỆT (LOCK — không sửa nữa)

| Câu | Trả lời | Trạng thái |
|------|---------|-----------|
| A | Bỏ `monthlyLeaveUsed`, compute realtime từ `leave-requests.json` | 🔒 LOCK |
| B | Half-day = 0.5 ngày phép | 🔒 LOCK |
| C | Early/Late KHÔNG trừ phép | 🔒 LOCK |
| D | Parttime nghỉ TRONG lịch KHÔNG trừ | 🔒 LOCK |
| G | Quota fulltime = **1** hardcode | 🔒 LOCK |
| 1 | Bỏ rank `intern`, chỉ còn `fulltime` + `parttime` | 🔒 LOCK |
| 2 | Parttime KHÔNG có phép (đã có lịch sẵn) | 🔒 LOCK |
| **O** | **Field bổ sung: NHÓM A (Khẩn cấp) + NHÓM B (Pháp lý) = thêm** | 🔒 LOCK |
| **O** | **NHÓM C, D, E, F, G = chưa cần (skip)** | 🔒 LOCK |
| **P** | **Inline save: onBlur + Enter** | 🔒 LOCK |
| **Q** | **Mobile: Table với scroll ngang** | 🔒 LOCK |
| **R** | **Tooltip CÓ — hover cột "Còn dư" hiện công thức** | 🔒 LOCK |

→ **TẤT CẢ câu hỏi đã trả lời. Sẵn sàng code.**

---

## 🏗️ 3. SCHEMA `members.json` — THAY ĐỔI

### Field SỬA
```
contractType: 'fulltime' | 'parttime'   ← BỎ 'intern'

monthlyLeaveQuota:
  - fulltime → AUTO 1 (hardcode, không sửa)
  - parttime → AUTO 0 (lock)
```

### Field BỎ
```
monthlyLeaveUsed   ← XÓA, compute realtime
```

### Field MỚI

#### A. workSchedule — lịch làm việc
```
workSchedule: {
  type: 'fulltime' | 'parttime',
  workDays: {
    mon: 'fullday' | 'morning' | 'afternoon' | 'off',
    tue: ...,
    wed: ...,
    thu: ...,
    fri: ...,
    sat: ...,
    sun: ...,
  }
}
```

#### B. NHÓM A — Khẩn cấp *(anh đã duyệt OK)*
```
emergencyContact: string,        // Tên người thân (vd "Vũ Ngọc Mẹ")
emergencyPhone: string,          // SĐT người thân
emergencyRelation: string,       // Mối quan hệ (Mẹ/Vợ/Anh trai...)
```

#### C. NHÓM B — Pháp lý *(anh đã duyệt OK — cho HĐLĐ điện tử)*
```
cccdNumber: string,              // Số CCCD/CMND
cccdIssueDate: string,           // Ngày cấp CCCD (YYYY-MM-DD)
cccdIssuePlace: string,          // Nơi cấp CCCD
```

### Default theo `contractType`
- **fulltime**: `workDays = { mon-fri: 'fullday', sat: 'morning', sun: 'off' }` — AUTO không sửa
- **parttime**: `workDays = { mon-sun: 'off' }` — HR set qua popup

---

## 📊 4. CỘT HIỂN THỊ — 21 CỘT

### 🟢 Vùng STICKY *(không scroll, luôn thấy)*

| # | Field | Width | Click làm gì |
|---|-------|-------|--------------|
| 1 | STT | 40px | — |
| 2 | **👤 Họ tên** | 180px | Click → **popup `/staff-edit` cũ** *(giữ 100%)* |
| 3 | 🏢 Phòng ban | 100px | Click → inline dropdown |
| 4 | 💼 Vị trí | 140px | Click → inline text |
| 5 | 📋 Loại HĐ | 90px | Click → dropdown `fulltime`/`parttime` |
| 6 | ✅ Active | 70px | Click → toggle |

### 🟡 Vùng SCROLL ngang *(kéo thấy)*

| # | Field | Loại edit | Ghi chú |
|---|-------|-----------|---------|
| 7 | 📞 SĐT | Inline text | Validate VN regex |
| 8 | 📧 Email | Inline text | Validate `@` + `.` |
| 9 | 🎂 Ngày sinh | Inline date | YYYY-MM-DD |
| 10 | 🔢 Thần số | Inline text | Chuỗi vd "11,5" |
| 11 | 🏠 Quê quán | Inline text | |
| 12 | 💳 Số TK | Inline text | |
| 13 | 🏦 Ngân hàng | Inline dropdown | Vietcombank/MB/Techcombank/... |
| 14 | 📅 Ngày bắt đầu | Inline date | |
| 15 | 📅 Hết thử việc | Inline date | |
| 16 | ⏱️ Đã làm | Read-only | Auto-compute từ ngày bắt đầu |
| 17 | **🗓️ Lịch làm** ⭐ | Click → popup grid 7×2 | fulltime: read-only "T2-T7 sáng" |
| 18 | **📊 Phép/tháng** ⭐ | Read-only + tooltip | fulltime=1 / parttime=0 |
| 19 | **📈 Đã nghỉ** ⭐ | Read-only + tooltip | Compute realtime |
| 20 | **🎯 Còn dư** ⭐ | Read-only + tooltip | Tooltip: "Tích lũy X − Đã nghỉ Y = Z" *(câu R)* |
| 21 | 👨‍💼 Quản lý trực tiếp | Read-only | Hiển thị tên |

### Field NHÓM A + B *(KHÔNG hiện ở table — chỉ trong popup `/staff-edit`)*

> Lý do: 6 field thêm sẽ làm table quá rộng. HR edit qua popup cũ vẫn nhanh.

| Field | Loại | Hiện ở đâu |
|-------|------|------------|
| emergencyContact | Text | Popup `/staff-edit` |
| emergencyPhone | Text *(validate VN)* | Popup `/staff-edit` |
| emergencyRelation | Dropdown *(Mẹ/Vợ/...)* | Popup `/staff-edit` |
| cccdNumber | Text *(12 số)* | Popup `/staff-edit` |
| cccdIssueDate | Date | Popup `/staff-edit` |
| cccdIssuePlace | Text | Popup `/staff-edit` |

---

## 🧮 5. LOGIC TÍNH PHÉP — `computeLeaveBalance(member)`

*(Giữ nguyên 100% như v4 — graceful schema cũ + mới)*

### Hàm chính
```js
function computeLeaveBalance(member) {
  if (member.contractType === 'parttime') {
    const outside = countLeavesOutsideSchedule(member.discordId, member.workSchedule);
    return { monthlyQuota: 0, totalUsed: outside, balance: -outside };
  }

  const startDate = member.contractSignDate || member.probationStartDate;
  if (!startDate) return { monthlyQuota: 1, totalUsed: 0, balance: 0 };

  const monthsWorked = monthsBetween(startDate, new Date());
  const totalQuota = Math.floor(monthsWorked * 1);
  const totalUsed = countApprovedLeaves(member.discordId);
  return { monthlyQuota: 1, totalUsed, balance: totalQuota - totalUsed };
}
```

### `countApprovedLeaves()` *(GRACEFUL)*
```js
function countApprovedLeaves(discordId) {
  const data = JSON.parse(fs.readFileSync('data/leave-requests.json', 'utf-8'));
  let total = 0;
  for (const req of data.requests || []) {
    if (req.userId !== discordId || req.status !== 'approved') continue;

    // Schema MỚI (sau Plan A): có sẵn totalDays
    if (typeof req.totalDays === 'number') { total += req.totalDays; continue; }

    // Schema CŨ: parse leaveType string
    const lt = (req.leaveType || '').toLowerCase();
    if (req.type === 'leave' || req.type === 'full') {
      if (lt.includes('cả ngày'))  total += 1;
      else if (lt.includes('nửa ngày') || lt.includes('half')) total += 0.5;
      else total += 1;
    }
    // type 'early'/'late' → KHÔNG cộng (câu C)
  }
  return total;
}
```

### Tooltip cho 3 cột phép *(câu R = LOCK CÓ)*

```
Cột "Phép/tháng": hover → "Quota tháng theo loại HĐ. Fulltime=1, Parttime=0"
Cột "Đã nghỉ":   hover → "Tổng ngày phép đã được duyệt từ ngày bắt đầu làm"
Cột "Còn dư":    hover → "Tích lũy {X} - Đã nghỉ {Y} = {Z} ngày"
                 nếu < 0: "NỢ {|Z|} ngày — có thể trừ vào lương"
```

### Bảng minh họa
| NV | contractType | Bắt đầu | Đã làm | Quota | Đã nghỉ | Còn dư | Visual |
|----|-------------|---------|--------|-------|---------|--------|--------|
| Trần Khánh Linh | fulltime | 01/10/2021 | 54 tháng | 54 | 8 | **+46** | 🟢 |
| Đinh Ngọc Ánh | fulltime | 18/09/2025 | 7 tháng | 7 | 5 | **+2** | 🟢 |
| Phạm Hiếu | fulltime | 19/01/2026 | 3 tháng | 3 | 4 | **−1** | 🟠 NỢ |
| Parttime A *(ngoài lịch)* | parttime | — | — | 0 | 2 | **−2** | 🔴 |
| Parttime B *(trong lịch)* | parttime | — | — | 0 | 0 | **0** | 🟢 |

### Hiển thị màu cột "Còn dư"
- 🟢 Xanh nếu > 0
- 🟠 Cam nếu = 0
- 🔴 Đỏ + chữ "NỢ X ngày" nếu < 0

---

## 🗓️ 6. LỊCH LÀM VIỆC — UI

### Cell hiển thị (cột #17)

| contractType | Cell hiện | Click |
|--------------|-----------|-------|
| `fulltime` | 🟢 "T2-T7 sáng" | Disabled (read-only) |
| `parttime` (chưa set) | 🟡 "⚠️ Chưa có lịch" | Click → popup |
| `parttime` (đã set) | 🟢 Tóm tắt: "T2-T5 fullday, T6 sáng" | Click → popup edit |

### Popup grid 7×2 *(parttime only)*

```
┌─────────────────────────────────────────┐
│ 🗓️ Lịch làm việc — [Tên NV]          │
│ Tick các BUỔI nhân viên LÀM VIỆC      │
├─────────────────────────────────────────┤
│         | Sáng | Chiều |               │
│ T2 (Mon)| ☑    | ☑     |               │
│ T3 (Tue)| ☑    | ☑     |               │
│ T4 (Wed)| ☑    | ☑     |               │
│ T5 (Thu)| ☑    | ☐     | ← chiều nghỉ │
│ T6 (Fri)| ☑    | ☑     |               │
│ T7 (Sat)| ☑    | ☐     |               │
│ CN (Sun)| ☐    | ☐     |               │
├─────────────────────────────────────────┤
│         [ Hủy ]    [ 💾 Lưu ]          │
└─────────────────────────────────────────┘
```

**Logic save**:
- Cả 2 buổi tick → `'fullday'`
- Chỉ Sáng → `'morning'`
- Chỉ Chiều → `'afternoon'`
- Không tick → `'off'`

---

## ✏️ 7. INLINE EDIT — UX FLOW *(Câu P = LOCK onBlur+Enter)*

```
HR click cell (KHÔNG phải cell tên)
   ↓
Cell biến thành <input> tự focus, value cũ pre-fill
   ↓
HR gõ giá trị mới
   ↓
Press Enter HOẶC blur (click ra ngoài)   ← CÂU P LOCK
   ↓
Validate phía client
   ↓ (FAIL)              ↓ (PASS)
Đỏ + tooltip lỗi      POST /api/staff (chỉ field changed)
                        ↓
                      Backend update + DM HR confirm
                        ↓
                      Cell hiện ✅ "Đã lưu" 1.5s
                        ↓
                      Nếu là contractType → reload row
```

### Click vào TÊN — KHÔNG inline
```
HR click vào cell HỌ TÊN
   ↓
Vẫn navigate /staff-edit?... (giữ cơ chế cũ 100%)
```

### Cell types

| Loại | UI | Field áp dụng |
|------|-----|---------------|
| Text | `<input type="text">` | position, hometown, bankName, emergencyContact, cccdIssuePlace, ... |
| Phone | Validate `^0\d{9,10}$` | phone, emergencyPhone |
| Email | Validate `@` + `.` | email |
| Date | `<input type="date">` | dateOfBirth, contractSignDate, probationEndDate, cccdIssueDate |
| Number | `<input type="number">` | numerology |
| Dropdown | `<select>` | dept, contractType, bankName, emergencyRelation |
| Toggle | Checkbox | active |
| Read-only | Plain text grey | leaveBalance, đã nghỉ, workingDuration, manager |
| Special | Click → popup | workSchedule *(parttime)* |

### Validation rules

| Field | Rule |
|-------|------|
| phone, emergencyPhone | Regex VN `^0\d{9,10}$` |
| email | Có `@` + `.` |
| dateOfBirth | `YYYY-MM-DD`, < hôm nay |
| contractSignDate | `YYYY-MM-DD` |
| probationEndDate | `YYYY-MM-DD`, > contractSignDate |
| bankNumber | Số 6-20 chữ số |
| cccdNumber | Số 9 hoặc 12 chữ số |
| cccdIssueDate | `YYYY-MM-DD`, < hôm nay |
| numerology | Chuỗi vd "11,5" |
| Required | name không rỗng |

---

## 📦 8. FILE THAY ĐỔI — SCOPE LOCK

### kpi-webapp *(frontend + API gateway)*

| File | Tình trạng | Mô tả |
|------|-----------|-------|
| `src/app/staff-list/page.tsx` | **SỬA TO** | 21 cột + sticky + inline edit + popup workSchedule + tooltip |
| `src/app/staff-edit/page.tsx` | **SỬA NHẸ** | Thêm 6 field mới (NHÓM A + B) — KHÔNG sửa logic cũ |
| `src/app/api/staff/list/route.ts` | **SỬA NHẸ** | Trả thêm `leaveBalance` realtime |
| `src/app/api/staff/route.ts` | **SỬA NHẸ** | Chấp nhận field `workSchedule` + 6 field A/B mới |
| `src/components/staff/InlineCell.tsx` | **MỚI** | Component cell editable Excel-like |
| `src/components/staff/WorkScheduleModal.tsx` | **MỚI** | Popup grid 7×2 cho parttime |
| `src/lib/leaveCompute.ts` | **MỚI** | Helper compute leave (client preview) |

### discord-bot *(backend)*

| File | Tình trạng | Mô tả |
|------|-----------|-------|
| `services/leaveCalc.js` | **SỬA TO** | Thêm `computeLeaveBalance()`, `countApprovedLeaves()` *(graceful)*, `isWorkingDay()`, `monthsBetween()`, `parseLeaveDates()` — **GIỮ** `deductLeave()` cũ |
| `services/staffService.js` | **SỬA NHẸ** | Thêm `workSchedule` + 6 field A/B vào `EXTENDED_FIELDS` |
| `api-server.js` | **SỬA NHẸ** | Endpoint `/internal/staff-list-all` trả thêm `leaveBalance` |

### KHÔNG sửa *(scope lock chặt)*

- ❌ `commands/leave.js`, `commands/approve.js`, `commands/reject.js` — **để Plan A xử lý**
- ❌ `data/members.json` — chỉ ghi qua API
- ❌ `data/leave-requests.json` — chỉ đọc
- ❌ Slash commands khác *(/daily, /weekly, /monthly, /staff add/update...)*

---

## 🛡️ 9. RISK & ROLLBACK

| Risk | Khả năng | Mitigation |
|------|----------|------------|
| Inline edit save lỗi → mất data | Thấp | Auto-save có toast confirm + retry button |
| 2 user đồng thời edit | Trung bình | Hiển thị `lastUpdatedAt` + warning |
| Compute leaveBalance sai do schema cũ | Trung bình | Graceful parse + test với 25 record hiện có |
| Mobile responsive vỡ *(21 cột)* | Cao | `overflow-x-auto`, ẩn cột phụ trên mobile *(câu Q LOCK table scroll)* |
| Bỏ `monthlyLeaveUsed` ảnh hưởng `/leave` cũ | Thấp | **GIỮ** `deductLeave()` cũ trong code |
| 6 field mới NHÓM A+B làm popup `/staff-edit` to lên | Thấp | Section riêng "Khẩn cấp" + "Pháp lý", có thể collapse |

### Rollback plan
```
- Backup members.json LOCAL + GCP trước khi code Phase
- Git revert UI nếu có lỗi
- API backward-compatible (nhận old payload)
- Discord bot vẫn gọi deductLeave() cũ — không phá /approve hiện tại
```

---

## 📅 10. PHASE PLAN (UPDATE v5)

| Phase | Nội dung | Time ước | Deliverable |
|-------|----------|----------|-------------|
| **B1** | UI staff-list 21 cột + sticky + inline edit cơ bản + tooltip 3 cột phép | ~3-4h | Click ô → edit → save |
| **B2** | Backend `computeLeaveBalance()` graceful + 3 cột phép realtime | ~2-3h | Cột phép hoạt động |
| **B3** | Lịch làm việc popup grid + `isWorkingDay()` cho parttime | ~3-4h | Parttime quản lý lịch |
| **B4** | Field bổ sung **NHÓM A (Khẩn cấp) + NHÓM B (Pháp lý)** | ~2-3h | popup `/staff-edit` thêm 6 field |
| **TEST** | Anh test e2e | — | Confirm OK |

**Tổng (B1-B4)**: ~10-14h

### Sau khi anh duyệt:
1. Em làm **B1** trước → demo local → anh test inline edit OK
2. Em làm **B2** → demo cột phép → anh verify 1-2 NV
3. Em làm **B3** → demo popup lịch → anh test parttime
4. Em làm **B4** → demo popup `/staff-edit` có thêm 6 field
5. Anh xác nhận → em commit *(em không tự push)*

---

## 11. 📋 FIELD BỔ SUNG (Câu O — KẾT QUẢ)

### ✅ NHÓM A — Khẩn cấp *(LOCK — anh OK)*
- emergencyContact *(Tên người thân)*
- emergencyPhone *(SĐT người thân, validate VN)*
- emergencyRelation *(Mối quan hệ — dropdown: Mẹ/Vợ/Anh trai/Em/Bạn/Khác)*

### ✅ NHÓM B — Pháp lý *(LOCK — anh OK, cho HĐLĐ điện tử)*
- cccdNumber *(Số CCCD/CMND, 9 hoặc 12 số)*
- cccdIssueDate *(Ngày cấp, YYYY-MM-DD)*
- cccdIssuePlace *(Nơi cấp — text)*

### ❌ NHÓM C — Cá nhân *(SKIP — chưa cần)*
### ❌ NHÓM D — Tuyển dụng *(SKIP — chưa cần)*
### ❌ NHÓM E — Kỹ năng *(SKIP — không cần)*
### ❌ NHÓM F — Nội bộ *(SKIP — không cần)*
### ❌ NHÓM G — Lương *(SKIP — chưa cần, sẽ làm sau khi có permission system)*

→ Chỉ thêm **6 field** vào members.json + popup `/staff-edit`. KHÔNG tăng cột bảng.

---

## 12. ❓ CÂU HỎI — KẾT QUẢ

| Câu | Anh trả lời | LOCK |
|-----|-------------|------|
| **O** | NHÓM A + B = thêm | ✅ |
| **P** | onBlur + Enter | ✅ |
| **Q** | Table với scroll ngang | ✅ |
| **R** | CÓ tooltip | ✅ |

→ **TẤT CẢ 4 câu B-plan đã đóng. Sẵn sàng code Phase B1.**

---

## 🔗 13. REFERENCE PATTERN

### Reuse từ code hiện có
- `src/app/staff-list/page.tsx` — pattern table sortable + filter dept đã có sẵn
- `src/app/staff-edit/page.tsx` — pattern form edit đầy đủ *(thêm section A+B)*
- `src/lib/googleSheets.ts` — pattern API helper
- `discord-bot/services/leaveCalc.js:43` — `getMemberByDiscordId()` ✅ reuse
- `discord-bot/services/leaveCalc.js:60` — `getLeaveSummary()` *(em sẽ rewrite dùng compute realtime)*

### Hàm cần viết mới
- `discord-bot/services/leaveCalc.js`: `computeLeaveBalance()`, `countApprovedLeaves()`, `countLeavesOutsideSchedule()`, `monthsBetween()`, `getDayName()`, `isWorkingDay()`, `parseLeaveDates()`
- `kpi-webapp/src/lib/leaveCompute.ts`: client-side mirror cho preview
- `kpi-webapp/src/components/staff/InlineCell.tsx`: editable cell wrapper
- `kpi-webapp/src/components/staff/WorkScheduleModal.tsx`: popup grid 7×2

---

## ✅ 14. VERIFICATION

### Test inline edit (Phase B1)
1. Mở `/staff-list`
2. Click cell "SĐT" của 1 NV → cell biến thành input
3. Gõ số mới → Enter → cell hiện "✅ Đã lưu" 1.5s
4. Refresh page → giá trị mới persist
5. SSH GCP verify `members.json` đã update
6. Click cell "Họ tên" → vẫn navigate `/staff-edit?...` *(cơ chế cũ)*
7. Hover cột "Còn dư" → tooltip hiện công thức "Tích lũy X − Đã nghỉ Y = Z"

### Test compute leave balance (Phase B2)
1. Tạo NV test fulltime contractSignDate=01/01/2026, hôm nay 30/04/2026
2. Verify cột "Phép tích lũy" = 4
3. Submit `/leave` 5 ngày approved (qua Discord modal cũ)
4. Verify cột "Đã nghỉ" = 5
5. Verify cột "Còn dư" = −1 (NỢ, màu cam)
6. Verify graceful: data cũ string "Cả ngày" và "Nửa ngày sáng" parse đúng

### Test workSchedule (Phase B3)
1. Đổi 1 NV thành parttime
2. Click cell "Lịch làm" → popup grid 7×2 hiện
3. Tick: T2-T5 fullday, T6 sáng, T7 nghỉ, CN nghỉ → Save
4. Cell hiện "T2-T5 fullday, T6 sáng"
5. NV xin nghỉ T6 chiều → balance KHÔNG trừ *(đã off)*
6. NV xin nghỉ T2 fullday → balance −1

### Test field bổ sung A + B (Phase B4)
1. Mở popup `/staff-edit` của 1 NV
2. Thấy section MỚI "🚨 Liên hệ khẩn cấp": Tên người thân, SĐT, Mối quan hệ
3. Thấy section MỚI "⚖️ Thông tin pháp lý (CCCD)": Số, Ngày cấp, Nơi cấp
4. Điền + Save → verify members.json có 6 field mới
5. Validate: SĐT người thân sai format → đỏ + tooltip
6. Validate: CCCD số 7 chữ → đỏ "phải 9 hoặc 12 số"

### Test mobile (Q LOCK table scroll)
1. Mở `/staff-list` trên iPhone
2. Verify table scroll ngang được
3. Sticky 6 cột đầu vẫn hoạt động
4. Inline edit: tap cell → bàn phím hiện
5. Verify không bị vỡ layout

---

## 🚦 15. SAU KHI ANH DUYỆT

1. Em **scope-lock** danh sách 10 file *(7 web + 3 bot)*
2. Em làm **B1** *(UI inline edit)* → demo → anh test
3. Em làm **B2** *(compute phép)* → demo → anh verify
4. Em làm **B3** *(lịch parttime)* → demo → anh test
5. Em làm **B4** *(field A + B)* → demo popup → anh verify
6. Mỗi phase: backup data + audit log + verify hash
7. Anh confirm cuối → em commit *(em không tự push)*

---

## 📌 EM CAM KẾT

```
✅ KHÔNG sửa /staff-edit page CŨ — chỉ thêm 2 section mới (A + B)
✅ KHÔNG sửa /leave, /approve, /reject (để Plan A)
✅ KHÔNG xóa data hiện có — chỉ bổ sung field
✅ Backup members.json mỗi phase
✅ Compute leaveBalance graceful — chạy với schema leave-requests.json cũ
✅ KHÔNG tự git commit/push (theo memory AP-008)
✅ Mỗi phase có rollback path
```

---

## 🔄 16. DIFF VỚI v4 (chỉ liệt kê THAY ĐỔI, không xóa gì)

### Thêm mới
- ✅ Lock 4 câu trả lời O / P / Q / R vào section 2
- ✅ Schema thêm 6 field NHÓM A + B vào section 3
- ✅ Tooltip cho 3 cột phép (câu R) — section 5
- ✅ Validation rules thêm cho cccdNumber, cccdIssueDate, emergencyPhone — section 7
- ✅ File scope thêm `src/app/staff-edit/page.tsx` SỬA NHẸ — section 8
- ✅ Phase B4 mới — section 10
- ✅ Test e2e cho field A + B — section 14
- ✅ Section 16 (DIFF với v4) — meta

### Giữ nguyên (KHÔNG xóa)
- Tất cả các phần khác như v4 — chỉ cập nhật/bổ sung

---

*Plan v5 đã đóng tất cả câu hỏi. Em sẵn sàng code Phase B1 ngay khi anh duyệt.*
