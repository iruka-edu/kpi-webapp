# 📋 PLAN A v1 — `/leave` chuyển sang Web Form (giữ tên lệnh)

> **Workflow**: `/2-plan-feature` → `/4-code-by-plan`
> **Status**: 🟡 ĐANG CHỜ DUYỆT
> **Người duyệt**: Mr. Đào
> **Ngày**: 2026-04-30
> **File plan trên repo (sau khi anh duyệt)**: `kpi-webapp/docs/plan-leave-web-form.md`
> **Liên quan**: Plan B *(đã xong)* — `/staff-list` inline edit + leaveBalance

---

## 🎯 1. CONTEXT — Vì sao cần làm

### Vấn đề hiện tại

1. **`/leave` modal Discord text tự do** — NV gõ "Nửa ngày sáng" / "Cả ngày" → bot không parse được chính xác → trừ phép sai
2. **Schema `leave-requests.json` cũ không chuẩn**:
   - `dateStr: "Chiều nay"` *(text tự do)*
   - `timeStr: "4h ,chiều"` *(format không nhất quán)*
   - `leaveType: "Nửa ngày sáng"` *(string không enum)*
3. **CHỈ DM CEO** — Quản lý trực tiếp KHÔNG được duyệt → CEO bị ngập đơn
4. **HR KHÔNG được CC** — không nắm tình hình NV nghỉ

### Outcome mong đợi

- ✅ NV gõ `/leave` → bot trả URL → mở web form đẹp giống `/holiday`
- ✅ Calendar chọn ngày → popup chọn buổi (Cả ngày/Sáng/Chiều) → tag CN/S/C
- ✅ Preview phép realtime *(reuse `computeLeaveBalance` Plan B)*
- ✅ **QL trực tiếp duyệt** *(CEO + HR được CC xem)*
- ✅ **Nếu QL = CEO** → CEO tự duyệt *(NV + HR được DM)*
- ✅ Bot tự ghi `daily-leaves.json` chính xác → git-tracker bỏ qua NV nghỉ đúng

### Lệnh KHÔNG đổi (LOCK)

- ✅ Tên lệnh `/leave` — **giữ nguyên**, chỉ đổi handler từ Modal → trả URL
- ✅ Logic `/daily`, `/weekly`, `/monthly` — **KHÔNG đụng**
- ✅ Logic `git-tracker.js` skip NV nghỉ — **giữ nguyên đọc `daily-leaves.json`**
- ✅ Logic `scheduler.js` cron — **KHÔNG đụng**
- ✅ `/approve`, `/reject` Discord button — **giữ song song** *(rollback path)*

---

## 🔄 2. LUỒNG END-TO-END (CHI TIẾT TỪNG BƯỚC)

### Trường hợp 1: NV có quản lý trực tiếp ≠ CEO

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. NV gõ /leave trong Discord                                   │
└──────────────────────────────────────────────────────────────────┘
        ↓
[discord-bot/commands/leave.js] Handler MỚI:
  - Đọc members.json → lấy managerDiscordId của NV
  - Sinh session token + token HMAC
  - Trả Embed + Button "📝 Mở form xin nghỉ"
        ↓
[NV click button → browser mở]
[https://kpi.lifestylevn.vn/leave-propose?session=...&discord_id=...&token=...]
        ↓
[kpi-webapp/src/app/leave-propose/page.tsx]
  - Header: chào NV + hiển thị "Phép còn dư: +X" (compute realtime)
  - Calendar 1 tháng — chỉ ngày tương lai click được
  - Click ngày → popup chọn Cả ngày / Sáng / Chiều → tag CN/S/C
  - Section: Bàn giao + Lý do
  - Preview phép REALTIME (call API /api/leave/preview)
        ↓ Submit
[kpi-webapp/src/app/api/leave/route.ts]
  - Validate body
  - Forward POST /internal/leave-propose sang bot
        ↓
[discord-bot/api-server.js] /internal/leave-propose:
  - Lưu pending-leaves.json (schema mới)
  - Async DM:
    🔔 Quản lý trực tiếp (managerDiscordId): Embed + Button "Mở phiếu duyệt"
    📋 CEO (CEO_USER_ID):                    Embed thông báo (KHÔNG button)
    📋 HR dept):                             Embed thông báo (KHÔNG button)
  - Nếu NV có managerDiscordId = CEO_USER_ID → bỏ qua DM CEO riêng
        ↓
[QL nhận DM, click button "Mở phiếu duyệt"]
[https://kpi.lifestylevn.vn/leave-approve/<id>?token=...]
        ↓
[kpi-webapp/src/app/leave-approve/[id]/page.tsx]
  - Hiển thị: Avatar NV + name + dept + manager
  - Chi tiết ngày nghỉ (table 2 cột: ngày | buổi)
  - Bàn giao + Lý do
  - Tình trạng phép NV (compute realtime — gọi /api/leave/decision-info)
  - 2 button: ❌ Từ chối / ✅ Duyệt (Từ chối yêu cầu textarea lý do)
        ↓ Click Duyệt
[kpi-webapp/src/app/api/leave/decision/route.ts]
  - POST forward → /internal/leave-decision
        ↓
[bot api-server.js] /internal/leave-decision:
  - Verify token + check người duyệt = managerDiscordId của NV
  - Update pending-leaves.json: status='approved', approvedBy, approvedByRole='manager'
  - Move record sang leave-requests.json (giữ schema cũ tương thích)
  - GHI daily-leaves.json: cộng userId vào ngày nghỉ (giữ pattern cũ — git-tracker dùng)
  - Async DM:
    🔔 NV: "Sếp [QL] đã duyệt phiếu của bạn ngày X-Y"
    📋 CEO: "QL [tên] vừa duyệt phiếu của [NV] ngày X-Y"
    📋 HR:  "QL [tên] vừa duyệt phiếu của [NV] ngày X-Y"
        ↓
[Done — bot vẫn dùng daily-leaves.json như cũ → /daily, git-tracker không bị break]
```

### Trường hợp 2: NV có quản lý trực tiếp = CEO (hoặc không có manager)

```
[NV /leave → form web → submit]
        ↓
[bot] /internal/leave-propose:
  - DM CEO (CEO_USER_ID): Embed + Button "Mở phiếu duyệt" *(thay vì DM QL)*
  - DM HR: Embed thông báo (KHÔNG button)
        ↓
[CEO click button → page duyệt]
        ↓ Click Duyệt
[bot] /internal/leave-decision:
  - approvedByRole='ceo'
  - Update files như TH1
  - Async DM:
    🔔 NV: "CEO đã duyệt phiếu ngày X-Y"
    📋 HR: "CEO đã duyệt phiếu của [NV] ngày X-Y"
    *(KHÔNG DM CEO vì chính CEO vừa duyệt)*
```

---

## 📊 3. BẢNG PHÂN QUYỀN & THÔNG BÁO (Matrix đầy đủ)

### Quyền duyệt

| Sự kiện                                         | Ai được DM Button DUYỆT?                             | Ai được DM thông báo (không button)? |
| ------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| NV submit phiếu*(NV thường)*                 | 🔘**Quản lý trực tiếp** *(managerDiscordId)* | 📋 CEO + 📋 HR                             |
| NV submit phiếu*(NV mà QL = CEO)*             | 🔘**CEO** *(CEO_USER_ID)*                        | 📋 HR*(KHÔNG DM CEO 2 lần)*            |
| NV submit phiếu*(không có managerDiscordId)* | 🔘**CEO** *(fallback)*                           | 📋 HR                                      |
| QL duyệt                                         | —                                                       | 🔔 NV + 📋 CEO + 📋 HR                     |
| QL từ chối                                      | —                                                       | 🔔 NV*(có lý do)* + 📋 CEO + 📋 HR     |
| CEO duyệt*(case QL=CEO)*                       | —                                                       | 🔔 NV + 📋 HR                              |
| CEO từ chối                                     | —                                                       | 🔔 NV*(có lý do)* + 📋 HR              |

### HR là ai? (xác định người nhận DM HR)

- **Cách 1**: Quét `members.json` lọc `dept === 'HR'` + `active === true` → DM tất cả
- **Cách 2**: Dùng env `HR_NOTIFY_USER_IDS` *(comma-separated)* để fix cứng
- **Em đề xuất Cách 1** (tự động, không cần env), HR mới vào dept HR sẽ tự nhận DM

### Tình huống đặc biệt

| Case                                                                    | Xử lý                                                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Phiếu đã được người khác duyệt rồi*(2 QL cùng vào page)* | Hiện "Phiếu đã được [tên] [duyệt/từ chối] lúc HH:mm"                            |
| Token expired*(>24h)*                                                 | "Phiếu hết hạn — yêu cầu NV xin lại"                                                 |
| ID không tồn tại                                                     | 404 "Không tìm thấy phiếu"                                                              |
| QL chưa active*(nghỉ việc)*                                        | Fallback DM CEO duyệt thay                                                                 |
| CEO mở phiếu của NV*(không phải QL trực tiếp)*                 | CEO vẫn được duyệt*(quyền cao hơn)* — log audit `approvedByRole='ceo_override'` |

---

## 🏗️ 4. SCHEMA MỚI

### `data/pending-leaves.json` *(MỚI — pattern giống pending-holidays)*

```jsonc
{
  "requests": [
    {
      "id": "lr_1775487446451",
      "createdAt": 1775487446451,
      "expiresAt": 1775573846451,           // +24h

      // Người xin
      "userId": "629676916395474954",
      "username": "tombet1",
      "name": "Phạm Minh Hiếu",
      "dept": "Design",
      "contractType": "fulltime",

      // Người duyệt mặc định
      "approverId": "1423881587791102033",  // managerDiscordId hoặc CEO_USER_ID nếu fallback
      "approverRole": "manager",            // 'manager' | 'ceo' | 'ceo_fallback'
      "approverName": "Vũ Ngọc Đào",

      // Chi tiết nghỉ (mảng từng buổi)
      "days_detail": [
        { "date": "2026-05-15", "type": "full" },
        { "date": "2026-05-16", "type": "morning" }
      ],
      "totalDays": 1.5,                     // auto compute

      // Khác
      "backup": "Anh Bình",
      "reason": "Em bị ốm",

      // Trạng thái
      "status": "pending",                  // chỉ pending trong file này
      "token": "..."                        // HMAC token cho page duyệt
    }
  ]
}
```

### Sau khi duyệt → MOVE sang `data/leave-requests.json` *(giữ schema cũ + bổ sung)*

```jsonc
{
  "requests": [
    {
      // Field cũ (giữ tương thích — getLeaveSummary cũ vẫn parse được)
      "id": "lr_1775487446451",
      "type": "leave",                      // giữ nguyên
      "userId": "629676916395474954",
      "name": "Phạm Minh Hiếu",
      "leaveType": "Cả ngày",               // GHI THÊM string cho schema cũ tương thích
      "leaveDate": "15/05 đến 16/05",       // GHI THÊM cho schema cũ
      "backup": "Anh Bình",
      "reason": "Em bị ốm",
      "status": "approved",
      "createdAt": 1775487446451,

      // Field MỚI (Plan A — schema chuẩn)
      "days_detail": [
        { "date": "2026-05-15", "type": "full" },
        { "date": "2026-05-16", "type": "morning" }
      ],
      "totalDays": 1.5,
      "approvedAt": 1775491000000,
      "approvedBy": "1423881587791102033",
      "approvedByRole": "manager",
      "approverName": "Vũ Ngọc Đào"
    }
  ]
}
```

→ **Backward compatible 100%**: `countApprovedLeaves` (Plan B) đã handle cả schema cũ + mới (em check sẵn `req.totalDays` trước, fallback `req.leaveType`).

### `data/daily-leaves.json` *(KHÔNG đổi schema)*

```jsonc
{
  "2026-05-15": ["629676916395474954"],
  "2026-05-16": ["629676916395474954"]
}
```

→ **GIỮ NGUYÊN** — git-tracker đọc file này, không phá.

### `data/members.json` *(KHÔNG đổi schema)*

→ Dùng nguyên `managerDiscordId` đã có sẵn. KHÔNG thêm field mới.

---

## 🔁 4B. TRƯỜNG HỢP PARTTIME — HOÁN ĐỔI LỊCH + NGHỈ HỖN HỢP *(BỔ SUNG)*

### Bối cảnh
NV parttime đã có **`workSchedule`** trong `members.json` *(set qua /staff-list popup grid 7×2)*.
Ví dụ NV Lan có lịch:
```
T2: fullday (Sáng + Chiều)
T3: fullday
T4: fullday
T5: morning (Sáng)        ← chiều T5 OFF cố định
T6: fullday
T7: morning (Sáng)        ← chiều T7 OFF
CN: off                   ← cả ngày OFF
```

### 3 trường hợp parttime cần xử lý

#### Case P1 — HOÁN ĐỔI thuần *(swap, phép = 0)*
- NV đăng ký **làm bù chiều T5** *(buổi vốn off)* + **xin nghỉ chiều T6** *(buổi vốn làm)*
- Tổng giờ làm trong tuần KHÔNG ĐỔI → **phép = 0**
- Bot ghi: `daily-leaves.json` cho chiều T6 → git-tracker bỏ qua

#### Case P2 — XIN NGHỈ thuần *(không bù, trừ phép âm)*
- NV xin nghỉ thêm **chiều T6** *(buổi vốn làm)*, KHÔNG đăng ký làm bù
- Trừ vào leaveBalance → **balance = -0.5** *(parttime không có quota)*

#### Case P3 — HỖN HỢP *(bù 1 phần)*
- NV được nghỉ chiều T4 *(off cố định theo lịch)*
- NV xin: **làm bù chiều T4** + **nghỉ cả ngày T5** *(buổi vốn làm)*
- Logic: bù 0.5 (chiều T4) − nghỉ 1.0 (T5) = **net trừ 0.5 ngày phép**

### Schema bổ sung — `days_detail` thêm trường `action`

```jsonc
{
  "days_detail": [
    // Type 'off' — xin nghỉ (mặc định)
    { "date": "2026-05-08", "type": "full", "action": "off" },          // T6 nghỉ cả ngày

    // Type 'work_swap' — xin làm bù (NV đăng ký làm vào buổi vốn off)
    { "date": "2026-05-07", "type": "afternoon", "action": "work_swap" } // chiều T5 làm bù
  ],
  "totalDays": 0.5,        // net = nghỉ 1.0 - bù 0.5
  "swapPairs": [           // (optional) ghi nhận cặp swap để hiển thị đẹp
    { "off": "2026-05-08:full", "work": "2026-05-07:afternoon", "balance": -0.5 }
  ]
}
```

### Logic compute `totalDays` cho parttime

```js
function computeTotalDaysParttime(days_detail, workSchedule) {
  let offDeduct = 0;   // tổng buổi xin nghỉ — chỉ tính buổi thực sự đang làm theo lịch
  let workCredit = 0;  // tổng buổi xin làm bù — chỉ tính buổi vốn off

  for (const item of days_detail) {
    const sched = workSchedule.workDays[getDayName(item.date)] || 'off';

    if (item.action === 'off') {
      // Xin nghỉ — chỉ trừ phép nếu buổi đó NV đang làm theo lịch
      if (sched === 'off') continue;  // đã off sẵn → KHÔNG tính (câu D LOCK)
      if (item.type === 'full') {
        if (sched === 'fullday')   offDeduct += 1.0;
        else if (sched === 'morning' || sched === 'afternoon') offDeduct += 0.5;
      } else if (item.type === 'morning') {
        if (sched === 'fullday' || sched === 'morning') offDeduct += 0.5;
      } else if (item.type === 'afternoon') {
        if (sched === 'fullday' || sched === 'afternoon') offDeduct += 0.5;
      }
    } else if (item.action === 'work_swap') {
      // Xin làm bù — chỉ tính credit nếu buổi đó vốn OFF
      if (item.type === 'full' && sched === 'off')          workCredit += 1.0;
      else if (item.type === 'morning' && (sched === 'off' || sched === 'afternoon')) workCredit += 0.5;
      else if (item.type === 'afternoon' && (sched === 'off' || sched === 'morning')) workCredit += 0.5;
    }
  }

  // Net: nghỉ - bù. Tối thiểu 0 (không cho âm — không tích lũy "công dư")
  return Math.max(0, offDeduct - workCredit);
}
```

### Validate UI

| Hành động NV | UI cho phép? | Tooltip |
|--------------|--------------|---------|
| Click ngày LÀM (theo lịch) → popup chọn nghỉ buổi | ✅ | "Buổi này em đang làm theo lịch — xin nghỉ sẽ trừ phép" |
| Click ngày OFF (theo lịch) → popup chọn làm bù | ✅ | "Buổi này em đang nghỉ theo lịch — đăng ký làm bù không trừ phép" |
| Click ngày OFF → chọn "nghỉ" | ❌ Disable | "Buổi này em đã được nghỉ theo lịch rồi" |
| Click ngày LÀM → chọn "làm bù" | ❌ Disable | "Buổi này em đang làm rồi, không cần đăng ký bù" |

### Bảng tính ví dụ

#### Case P1 — Hoán đổi thuần
| Ngày | Buổi | Action | Lịch sẵn | Tính |
|------|------|--------|----------|------|
| T5 07/05 | chiều | work_swap | off | +0.5 credit |
| T6 08/05 | chiều | off | fullday | -0.5 deduct |
| **Tổng** | | | | **net = 0** ✅ Không trừ phép |

#### Case P2 — Nghỉ thuần (không bù)
| Ngày | Buổi | Action | Lịch sẵn | Tính |
|------|------|--------|----------|------|
| T6 08/05 | chiều | off | fullday | -0.5 deduct |
| **Tổng** | | | | **net = 0.5** → balance -0.5 |

#### Case P3 — Hỗn hợp (bù 1 phần)
| Ngày | Buổi | Action | Lịch sẵn | Tính |
|------|------|--------|----------|------|
| T4 06/05 | chiều | work_swap | off | +0.5 credit |
| T5 07/05 | full *(cả ngày)* | off | morning | -0.5 deduct *(chỉ tính sáng vì chiều T5 off sẵn)* |
| **Tổng** | | | | **net = 0** ✅ Không trừ phép |

#### Case P3b — Hỗn hợp (xin nghỉ nhiều hơn bù)
| Ngày | Buổi | Action | Lịch sẵn | Tính |
|------|------|--------|----------|------|
| T4 06/05 | chiều | work_swap | off | +0.5 credit |
| T5 07/05 | full | off | fullday *(giả định T5 fullday)* | -1.0 deduct |
| **Tổng** | | | | **net = 0.5** → balance -0.5 |

### Bot ghi `daily-leaves.json` đúng

```js
// Chỉ ghi BUỔI thực sự nghỉ (action='off' và sched=làm theo lịch)
// KHÔNG ghi work_swap (vì đó là làm thêm, không phải nghỉ)
for (const item of days_detail) {
  if (item.action !== 'off') continue;
  const sched = workSchedule.workDays[getDayName(item.date)];
  if (sched === 'off') continue; // đã off sẵn — không cần ghi
  // Add userId vào daily-leaves.json[item.date]
}
```

→ git-tracker đọc `daily-leaves.json` vẫn skip đúng NV nghỉ, KHÔNG bỏ qua khi NV làm bù.

---

## 🎨 5. MOCKUP ASCII (em sẽ chuyển HTML khi anh OK)

### File 1: `mockup/leave-propose-v1.html` — NV xin nghỉ

```
┌─────────────────────────────────────────────────────────────────┐
│ 🏖️ Xin nghỉ phép — IruKa                                       │
│ Chào Phạm Hiếu (Design) • Phép còn dư: +2 ngày 🟢            │
│                                                                  │
│ 👨‍💼 Đơn này sẽ gửi cho: Mr. Đào (Quản lý trực tiếp)        │
│    Đồng thời CC: CEO + HR để theo dõi                          │
└─────────────────────────────────────────────────────────────────┘

📅 BƯỚC 1: CHỌN NGÀY NGHỈ
┌────────────────────────────────────────────────┐
│  ◄ Tháng 5/2026 ►                               │
│  T2  T3  T4  T5  T6  T7  CN                    │
│      1   2   3   4   5  [6]    ← CN: text đỏ    │
│   7   8   9  10  11  12  13                    │
│  14  [15:CN][16:S] 17  18  19  20  ← đã chọn   │
│  21  22  23  24  25  26  27                    │
│  28  29  30  31                                │
└────────────────────────────────────────────────┘
💡 Click 1 ngày → popup chọn Cả ngày/Sáng/Chiều
💡 Chỉ chọn được ngày TƯƠNG LAI

[POPUP khi click ngày 15/05]
┌──────────────────────────┐
│ Thứ 6, 15/05/2026         │
├──────────────────────────┤
│ ◉ ☀️ Cả ngày  (-1.0)    │
│ ○ 🌅 Sáng     (-0.5)    │
│ ○ 🌇 Chiều    (-0.5)    │
├──────────────────────────┤
│  [Bỏ chọn]  [Hủy] [OK]  │
└──────────────────────────┘
→ Đóng popup → ngày 15 hiện tag "CN" trong calendar

👥 BƯỚC 2: BÀN GIAO VIỆC (không bắt buộc)
[Dropdown autocomplete tên NV...]

📝 BƯỚC 3: LÝ DO (≥10 chữ)
┌──────────────────────────────────────────┐
│ Em bị ốm, không đi làm được hôm nay.    │
└──────────────────────────────────────────┘

─────────────────────────────────────────────
💡 PREVIEW PHÉP CỦA BẠN
┌──────────────────────────────────────────┐
│ 📊 Tích lũy:    5 ngày                   │
│ 📈 Đã dùng:     3 ngày                   │
│ ➕ Đang xin:    1.5 ngày (1 cả + 1 sáng) │
│ 🎯 Sẽ còn:     +0.5 ngày 🟢             │
└──────────────────────────────────────────┘

[Hoặc nếu sẽ NỢ]
┌──────────────────────────────────────────┐
│ 🎯 Sẽ còn:     -0.5 ngày 🟠 NỢ          │
│ ⚠️ Bạn đang nợ phép — QL có thể KHÔNG  │
│ duyệt hoặc trừ vào lương                 │
└──────────────────────────────────────────┘

           [ Hủy ]    [ 📨 Gửi xin phép ]
```

### File 2: `mockup/leave-approve-v1.html` — QL/CEO duyệt

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Duyệt đơn xin nghỉ                                      │
│ Người duyệt: Mr. Đào (Quản lý trực tiếp)                  │
│ Status: ⏳ Chờ duyệt — token còn 23h45                     │
└─────────────────────────────────────────────────────────────┘

👤 NHÂN VIÊN XIN NGHỈ
┌─────────────────────────────────────────┐
│ 📷 [Avatar Phạm Hiếu]                   │
│ Phạm Minh Hiếu                          │
│ Design • Fulltime                       │
│ 📞 0934632018 • 📧 hieu@iruka.vn       │
│ Quản lý: Vũ Ngọc Đào                    │
└─────────────────────────────────────────┘

📅 CHI TIẾT NGÀY NGHỈ (3 buổi tổng = 1.5 ngày)
┌────────────┬─────────────────────────┐
│ T6 15/05/26│ ☀️ Cả ngày (-1.0)      │
├────────────┼─────────────────────────┤
│ T7 16/05/26│ 🌅 Nửa sáng (-0.5)     │
└────────────┴─────────────────────────┘

👥 BÀN GIAO CHO
   Anh Bình (Designer)

📝 LÝ DO
   "Em bị ốm, không đi làm được hôm nay."

─────────────────────────────────────────────
📊 TÌNH TRẠNG PHÉP CỦA NV (auto-compute)
┌──────────────────────────────────────────┐
│ Bắt đầu làm:  19/01/2026                │
│ Đã làm:       3 tháng                   │
│ Tích lũy:     3 ngày                    │
│ Đã dùng:      2 ngày                    │
│ Đang xin:     1.5 ngày                  │
│ Sẽ còn:       -0.5 ngày  🟠 NỢ 0.5     │
│                                          │
│ ⚠️ Cảnh báo: Nếu duyệt, NV sẽ NỢ      │
│ 0.5 ngày — trừ vào lương hoặc cảnh cáo  │
└──────────────────────────────────────────┘

─────────────────────────────────────────────
💬 LÝ DO TỪ CHỐI (chỉ điền nếu Từ chối)
[textarea, ≥5 chữ nếu chọn Từ chối]

─────────────────────────────────────────────
 [ ❌ Từ chối ]    [ ✅ Duyệt ]
```

### File 3 *(optional)*: `mockup/leave-detail-readonly.html` — CEO/HR xem (không có button)

*(Tương tự file 2 nhưng KHÔNG có 2 button — chỉ Read-only + chỉ rõ "Bạn xem CC, không có quyền duyệt")*

### File 4 *(MỚI — Parttime)*: `mockup/leave-propose-parttime-v1.html` — NV parttime xin nghỉ + hoán đổi

```
┌─────────────────────────────────────────────────────────────────┐
│ 🏖️ Xin nghỉ phép — IruKa  [Parttime mode]                      │
│ Chào Lan (Design) • Phép parttime: theo lịch hoán đổi          │
│ 👨‍💼 Đơn này gửi cho: Vũ Ngọc Đào (QL trực tiếp)              │
└─────────────────────────────────────────────────────────────────┘

📅 LỊCH LÀM VIỆC HIỆN TẠI CỦA BẠN (đọc workSchedule)
┌────────┬────────┬────────┐
│        │ Sáng   │ Chiều  │
├────────┼────────┼────────┤
│ T2     │ 🟢 Làm │ 🟢 Làm │
│ T3     │ 🟢 Làm │ 🟢 Làm │
│ T4     │ 🟢 Làm │ ⬜ Off │  ← chiều T4 off cố định
│ T5     │ 🟢 Làm │ ⬜ Off │  ← chiều T5 off cố định
│ T6     │ 🟢 Làm │ 🟢 Làm │
│ T7     │ 🟢 Làm │ ⬜ Off │
│ CN     │ ⬜ Off │ ⬜ Off │
└────────┴────────┴────────┘

📅 BƯỚC 1: CHỌN NGÀY (calendar 1 tháng)
- Click ngày LÀM theo lịch → popup "Xin nghỉ buổi" (sáng/chiều/cả ngày)
- Click ngày OFF theo lịch → popup "Đăng ký LÀM BÙ" (sáng/chiều)
- Cell hiển thị tag:
   🔴 N-S/N-C/N-CN  → xin nghỉ buổi này (sẽ trừ phép)
   🟦 W-S/W-C       → xin làm bù (cộng credit hoán đổi)

[POPUP khi click ngày LÀM (vd T6 chiều)]
┌──────────────────────────────────┐
│ Thứ 6, 08/05/2026 — Chiều        │
│ (Theo lịch: bạn đang LÀM)        │
├──────────────────────────────────┤
│ ◉ 🔴 Xin NGHỈ chiều T6 (-0.5)   │
├──────────────────────────────────┤
│  [Bỏ chọn]  [Hủy] [OK]          │
└──────────────────────────────────┘

[POPUP khi click ngày OFF (vd T5 chiều)]
┌──────────────────────────────────┐
│ Thứ 5, 07/05/2026 — Chiều        │
│ (Theo lịch: bạn đang OFF)        │
├──────────────────────────────────┤
│ ◉ 🟦 Đăng ký LÀM BÙ chiều T5     │
│   (+0.5 credit hoán đổi)         │
├──────────────────────────────────┤
│  [Bỏ chọn]  [Hủy] [OK]          │
└──────────────────────────────────┘

📝 BƯỚC 2: LÝ DO + Bàn giao (như fulltime)

─────────────────────────────────────────────
💡 PREVIEW HOÁN ĐỔI / NGHỈ PHÉP
┌──────────────────────────────────────────┐
│ 🟦 Đăng ký LÀM BÙ:                       │
│    • T5 07/05 chiều  (+0.5 credit)       │
│ 🔴 Xin NGHỈ:                              │
│    • T6 08/05 chiều  (−0.5 deduct)       │
│                                           │
│ Tổng credit:    +0.5                     │
│ Tổng deduct:    −0.5                     │
│ ─────────────────────────                 │
│ Net trừ phép:   0 ngày  🟢 HOÁN ĐỔI THUẦN │
│                                           │
│ ✅ Đơn này KHÔNG ảnh hưởng phép           │
└──────────────────────────────────────────┘

[Hoặc Case P3b — bù 1 phần]
┌──────────────────────────────────────────┐
│ 🟦 Đăng ký LÀM BÙ: T4 chiều (+0.5)       │
│ 🔴 Xin NGHỈ: T5 cả ngày (−1.0)            │
│ Net trừ phép: 0.5 ngày → balance: -0.5 🟠 │
│                                           │
│ ⚠️ Hoán đổi không đủ — phải nghỉ thêm   │
│ 0.5 ngày → leaveBalance NỢ 0.5            │
└──────────────────────────────────────────┘

[ Hủy ]    [ 📨 Gửi xin nghỉ + hoán đổi ]
```

### File 5 *(MỚI — Parttime)*: `mockup/leave-approve-parttime-v1.html` — QL/CEO duyệt parttime

*Tương tự `leave-approve-v1.html` nhưng:*
- Hiển thị 2 cột Action (`work_swap` / `off`) trong table chi tiết
- Phần "Tình trạng phép" hiện công thức **net = deduct − credit**
- Banner xanh "🟢 HOÁN ĐỔI THUẦN" nếu net = 0
- Banner cam "🟠 BÙ 1 PHẦN" nếu 0 < net < deduct
- Banner đỏ "🔴 KHÔNG BÙ" nếu credit = 0

→ Sau khi QL duyệt:
- `daily-leaves.json` ghi NV nghỉ chiều T6 *(buổi thực sự nghỉ)* → git-tracker skip
- **KHÔNG** ghi T5 chiều — vì NV LÀM BÙ chiều đó (không phải nghỉ)
- Bot DM NV: "Sếp đã duyệt hoán đổi: làm bù T5 chiều, nghỉ T6 chiều"

---

## 🛡️ 6. LOGIC KHÁC KHÔNG ĐỘNG ĐẾN

| Lệnh / Service                                     | Tình trạng                                                                             | Cách Plan A đảm bảo không phá                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `commands/daily.js`                               | Đọc `daily.json` *(không liên quan leave)*                                       | ✅ Không động                                            |
| `commands/weekly.js`                              | Đọc `weekly-reports.json`                                                            | ✅ Không động                                            |
| `commands/monthly.js`                             | Đọc `monthly-reports.json`                                                           | ✅ Không động                                            |
| `services/scheduler.js`                           | Cron 09:30, 17:00, 18:00, 20:00, 23:55 — đọc `daily-leaves.json` để skip NV nghỉ | ✅ Plan A vẫn ghi `daily-leaves.json` đúng pattern cũ |
| `services/git-tracker.js` *(L96, 126-128)*      | Đọc `daily-leaves.json` skip NV nghỉ                                                | ✅ Plan A vẫn ghi `daily-leaves.json`                    |
| `commands/approve.js`                             | DEPRECATED*(em sẽ thêm note)* — vẫn còn để rollback                             | ✅ Giữ song song 7 ngày, sau đó xóa                    |
| `commands/reject.js`                              | Tương tự                                                                              | ✅ Giữ song song                                           |
| `handlers/approvalHandler.js`                     | Button DM CEO duyệt                                                                     | ✅ Giữ song song 7 ngày                                   |
| `services/leaveCalc.js` *(Plan B)*              | `computeLeaveBalance` đã handle schema cũ + mới                                    | ✅ Reuse 100%                                               |
| `commands/staff.js` `/staff info` *(Plan B5)* | Đã rewrite                                                                             | ✅ Tự dùng compute realtime                               |

### Migration `leave-requests.json`

Schema cũ 25 record:

```jsonc
{ id, type:'leave', userId, name, leaveType:"Cả ngày", leaveDate:"05/04 đến 06/04", ... }
```

Schema mới (Plan A):

```jsonc
{ ...field cũ, days_detail:[...], totalDays, approvedAt, approvedBy, approvedByRole, approverName }
```

**Em viết script `scripts/migrate-leave-schema.js`**:

- Đọc 25 record cũ
- Parse `leaveDate` text → `days_detail` array (best-effort)
- Tính `totalDays` từ `leaveType` *(`countApprovedLeaves` Plan B đã làm)*
- Backup file trước khi ghi
- Verify hash sau migrate

---

## 📦 7. FILE THAY ĐỔI — SCOPE LOCK

### kpi-webapp *(7 file)*

| File                                       | Tình trạng   | Mô tả                               |
| ------------------------------------------ | -------------- | ------------------------------------- |
| `mockup/leave-propose-v1.html`           | **MỚI** | Mockup HTML NV xin (Phase 0a)         |
| `mockup/leave-approve-v1.html`           | **MỚI** | Mockup HTML QL/CEO duyệt (Phase 0a)  |
| `src/app/leave-propose/page.tsx`         | **MỚI** | Trang NV xin phép thật              |
| `src/app/leave-approve/[id]/page.tsx`    | **MỚI** | Trang QL/CEO duyệt thật             |
| `src/app/api/leave/route.ts`             | **MỚI** | POST submit form                      |
| `src/app/api/leave/preview/route.ts`     | **MỚI** | GET preview phép realtime            |
| `src/app/api/leave/decision/route.ts`    | **MỚI** | POST QL/CEO duyệt/từ chối          |
| `src/components/leave/LeaveCalendar.tsx` | **MỚI** | Calendar 1 tháng + popup chọn buổi |
| `src/components/leave/LeavePreview.tsx`  | **MỚI** | Component preview phép               |

### discord-bot *(5 file)*

| File                                | Tình trạng        | Mô tả                                                                                     |
| ----------------------------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| `commands/leave.js`               | **REWRITE**   | Bỏ Modal, sinh URL session token                                                           |
| `api-server.js`                   | **SỬA TO**   | Endpoint `/internal/leave-propose` + `/internal/leave-decision` + DM matrix (QL/CEO/HR) |
| `services/leaveNotify.js`         | **MỚI**      | Helper DM Embed: notifyManager / notifyCEO / notifyHR / notifyApprovalResult                |
| `commands/approve.js`             | **SỬA NHẸ** | Note DEPRECATED*(giữ song song 7 ngày)*                                                 |
| `commands/reject.js`              | **SỬA NHẸ** | Note DEPRECATED                                                                             |
| `scripts/migrate-leave-schema.js` | **MỚI**      | Migrate 25 record cũ                                                                       |

### KHÔNG sửa

- ❌ `commands/daily.js`, `weekly.js`, `monthly.js`
- ❌ `services/scheduler.js`, `git-tracker.js`
- ❌ `services/leaveCalc.js` *(Plan B đã handle graceful)*
- ❌ `commands/staff.js` *(Plan B đã update /staff info)*
- ❌ `data/members.json` *(không thêm field)*

---

## 🛡️ 8. RISK & ROLLBACK

| Risk                                                                    | Khả năng  | Mitigation                                                                            |
| ----------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| Migration 25 record cũ hỏng                                           | Trung bình | Backup trước, test parse từng record                                               |
| Web form lỗi → NV không xin được                                  | Cao         | Giữ Modal `/leave` cũ song song 7 ngày *(commands/leave.js có flag fallback)* |
| QL không quen click web link                                           | Trung bình | Bot DM hướng dẫn ngắn + nút "Hỗ trợ"                                           |
| `daily-leaves.json` không update đúng → git-tracker spam NV nghỉ | Cao         | Test e2e: NV xin → QL duyệt → verify daily-leaves.json có record                  |
| 2 QL cùng vào page duyệt 1 phiếu                                    | Thấp       | Backend check status='pending' trước khi update                                     |
| QL nghỉ việc*(active=false)*                                        | Thấp       | Fallback DM CEO duyệt thay                                                           |

### Rollback plan

```
- Backup pending-leaves.json + leave-requests.json mỗi phase
- Git revert nếu lỗi
- Bot CHẠY SONG SONG 2 luồng:
  1. Modal cũ /leave (giữ 7 ngày, có flag LEAVE_MODE=modal trong env)
  2. Web form mới (LEAVE_MODE=web)
- Default LEAVE_MODE=web. Nếu lỗi nặng, set LEAVE_MODE=modal → revert
```

---

## 📅 9. PHASE PLAN

| Phase          | Nội dung                                                                                                                               | Time  | Deliverable                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------- |
| **A0a**  | Vẽ 2 file HTML mockup (`mockup/leave-*-v1.html`)                                                                                     | ~1.5h | Anh review UX trên browser             |
| **A0b**  | Anh review mockup → confirm UX                                                                                                         | —    | OK / điều chỉnh                      |
| **A1**   | Backend: schema pending-leaves.json + endpoint `/internal/leave-propose` + `/internal/leave-decision` + helper notifyManager/CEO/HR | ~3-4h | Bot đã có endpoint                   |
| **A2**   | Frontend: trang `/leave-propose` (calendar + popup + preview)                                                                         | ~3-4h | NV xin được                          |
| **A3**   | Frontend: trang `/leave-approve/[id]` (page duyệt)                                                                                   | ~2-3h | QL/CEO duyệt được                   |
| **A4**   | Discord bot:`commands/leave.js` rewrite (Modal → URL)                                                                                | ~1h   | `/leave` trong Discord trả URL       |
| **A5**   | Migration script                                                                                                                        | ~1h   | 25 record cũ chuyển schema mới       |
| **TEST** | Anh test e2e                                                                                                                            | —    | NV xin → QL duyệt → DM matrix đúng |

**Tổng**: ~11-14h

---

## ✅ 10. VERIFICATION (E2E test)

### Test luồng 1: NV → QL duyệt → CC CEO/HR

1. Anh tạo NV test với `managerDiscordId` ≠ CEO_USER_ID
2. NV gõ `/leave` → bot trả URL
3. Click → form mở
4. Chọn 1 ngày → popup → chọn "Cả ngày" → tag "CN"
5. Chọn ngày 2 → "Sáng" → tag "S"
6. Section preview: thấy "Đang xin: 1.5 ngày, Sẽ còn: X"
7. Điền lý do → Submit
8. Toast "✅ Đã gửi cho QL [tên]"
9. **QL nhận DM** với button "Mở phiếu duyệt"
10. **CEO nhận DM** thông báo (KHÔNG button)
11. **HR nhận DM** thông báo (KHÔNG button)
12. QL click button → mở page duyệt → bấm Duyệt
13. **NV nhận DM**: "Sếp đã duyệt phiếu của bạn"
14. **CEO nhận DM**: "QL [tên] vừa duyệt phiếu của [NV]"
15. **HR nhận DM**: "QL [tên] vừa duyệt phiếu của [NV]"
16. Verify `daily-leaves.json` có userId trong ngày 15/05 + 16/05
17. Verify `leave-requests.json` có record với schema mới
18. Verify `/staff-list` cột "Đã nghỉ" của NV tăng 1.5
19. Verify `/staff-list` cột "Còn dư" giảm 1.5
20. **Sáng hôm 15/05**: bot cron `git-tracker` BỎ QUA NV này (không nhắc git push)

### Test luồng 2: NV mà QL = CEO

1. NV vungocdao có managerDiscordId = CEO_USER_ID
2. NV gõ `/leave` → submit
3. **CEO nhận DM** với button (1 lần thôi)
4. **HR nhận DM** thông báo
5. **KHÔNG có DM CEO 2 lần**
6. CEO duyệt → DM NV + HR (KHÔNG DM CEO lần nữa)

### Test luồng 3: Token expired

1. NV xin → +25h sau, QL mở link
2. Page hiện "Phiếu hết hạn — yêu cầu NV xin lại"

### Test luồng 4: Phiếu đã được duyệt

1. NV xin → CEO duyệt
2. QL mở link → page hiện "Phiếu đã được Mr. Đào duyệt lúc 14:30"

---

## 🔗 11. REFERENCE PATTERN (đã audit)

### Reuse từ `/holiday`

- `discord-bot/api-server.js:105-226` — `notifyCeoNewHoliday()` → clone thành `notifyManagerNewLeave()`, `notifyCeoCcLeave()`, `notifyHrCcLeave()`
- `discord-bot/api-server.js:282-345` — `/internal/holiday-propose` POST handler → clone thành `/internal/leave-propose`
- `discord-bot/api-server.js:133` — `formatDate()` (YYYY-MM-DD → DD/MM)
- `kpi-webapp/src/components/holiday/HolidayDayPicker.tsx` — calendar pattern
- `kpi-webapp/src/components/holiday/HolidayHalfDayList.tsx` — half-day toggle pattern

### Reuse từ Plan B

- `discord-bot/services/leaveCalc.js`:
  - `computeLeaveBalance(member)` — preview phép realtime
  - `countApprovedLeaves(discordId)` — graceful schema cũ + mới ✅ ĐÃ HANDLE
  - `parseLeaveDates(req)` — parse days_detail / fromDate-toDate
- `kpi-webapp/src/lib/leaveCompute.ts` *(MỚI)* — em sẽ tạo helper client-side cho preview

### Hàm cần viết mới

- `discord-bot/services/leaveNotify.js`:
  - `notifyManagerNewLeave(client, pending)` — DM QL có button
  - `notifyCeoCcLeave(client, pending)` — DM CEO không button
  - `notifyHrCcLeave(client, pending)` — DM tất cả HR không button
  - `notifyApprovalResult(client, request)` — DM kết quả cho NV + CC
- `kpi-webapp/src/components/leave/LeaveCalendar.tsx` — calendar 1 tháng + popup
- `kpi-webapp/src/components/leave/LeavePreview.tsx` — preview phép

---

## ❓ 12. CÂU HỎI MỚI CẦN ANH DUYỆT

### Câu α — Token leave hết hạn? ok 24h.

- ☐ **24h** *(em đề xuất — đa số xin trong ngày)*
- ☐ **3 ngày** *(thoáng hơn cho NV xin sớm)*

### Câu β — HR nhận DM CC: tất cả HR (dept='HR') hay chỉ 1 người fix cứng env? tất cả đi, vì công ty chỉ có 1 hr

- ☐ **Tất cả HR `dept='HR' && active=true`** *(em đề xuất — auto)*
- ☐ Fix env `HR_NOTIFY_USER_IDS=...`

### Câu γ — Quyền của CEO override duyệt phiếu của NV không phải QL trực tiếp?ok theo em đề xuất

- ☐ **CHO** *(CEO quyền tối cao)* *(em đề xuất)*
- ☐ KHÔNG *(chỉ QL trực tiếp duyệt)*

### Câu δ — Nếu QL nghỉ việc *(active=false)*, fallback DM ai duyệt? ceo nhé,

- ☐ **CEO** *(em đề xuất)*
- ☐ Manager của manager *(nếu có)*

### Câu ε — Discord modal `/leave` cũ giữ song song? bỏ luôn. Bỏ luôn, làm cho chuẩn luôn.

- ☐ **GIỮ 7 ngày** *(rollback path — em rất khuyên)*
- ☐ **BỎ luôn** *(theo câu H Plan B trước, nhưng Plan A risk cao)*

### Câu ζ — Sau khi web form submit, NV có nhận DM xác nhận? Có.

- ☐ **CÓ** — bot DM "✅ Đơn xin nghỉ đã gửi, đang chờ [QL] duyệt"
- ☐ KHÔNG — chỉ web hiện toast

### Câu η — Page duyệt có hiển thị HISTORY các phiếu trước của NV? Có nhé.

- ☐ **CÓ** — table 5 phiếu gần nhất *(QL biết NV nghỉ nhiều hay ít)*
- ☐ KHÔNG — chỉ phiếu hiện tại

### Câu θ — File HTML mockup muốn em vẽ trước (Phase A0a)?

- ☐ **CÓ — vẽ 2 file** *(em đề xuất — anh xem UX trước khi code)*
- ☐ Không cần — vẽ thẳng React component

---

## 🚦 13. SAU KHI ANH DUYỆT

1. Anh trả lời 8 câu α-θ
2. Em **scope-lock** danh sách 14 file
3. **Phase A0a** *(~1.5h)*: Em vẽ 2 file HTML mockup → anh test trên browser
4. Anh OK mockup → em làm Phase A1-A5 tuần tự
5. Mỗi phase: backup data + audit log + verify hash
6. Em commit + push *(em không tự push, anh dùng `iruka` hoặc bảo em)*

---

## 📌 EM CAM KẾT

- ✅ KHÔNG sửa `commands/daily.js`, `weekly.js`, `monthly.js`
- ✅ KHÔNG sửa `services/scheduler.js`, `git-tracker.js`
- ✅ KHÔNG sửa `services/leaveCalc.js` (Plan B đã graceful)
- ✅ KHÔNG sửa `data/members.json` schema
- ✅ Schema `leave-requests.json` mới **backward compatible** với 25 record cũ
- ✅ Schema `daily-leaves.json` GIỮ NGUYÊN — git-tracker không break
- ✅ Mỗi phase backup data + verify hash
- ✅ Modal `/leave` cũ giữ song song 7 ngày
- ✅ KHÔNG tự git commit/push (theo memory AP-008)

---

*Anh trả lời 8 câu α-θ → em vẽ mockup HTML (Phase A0a). Sau đó anh review HTML → em code thật.*
