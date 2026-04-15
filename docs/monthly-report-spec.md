# Spec Triển Khai — Trang Báo Cáo KPI Tháng

> **Cam kết:** AI Agent đọc xong tài liệu này có thể code ra giao diện và logic y hệt `mockup/monthly-mockup.html`, không sai một pixel, không thiếu một trạng thái.
> **Route:** `/monthly?token=<token>`
> **Mockup gốc:** `mockup/monthly-mockup.html` (1579 dòng, đọc trực tiếp từ file)

---

## MỤC LỤC

1. [Cấu trúc File & Component](#1-cấu-trúc-file--component)
2. [Design Tokens — CSS Variables & Màu sắc](#2-design-tokens)
3. [Layout Tổng Thể & Kỹ thuật Scroll](#3-layout-tổng-thể--kỹ-thuật-scroll)
4. [Sticky Header](#4-sticky-header)
5. [Info Table + Guide Box](#5-info-table--guide-box)
6. [Bảng KPI — Cấu trúc Cột](#6-bảng-kpi--cấu-trúc-cột)
7. [Row Types — 3 loại dòng](#7-row-types--3-loại-dòng)
8. [Summary Row (Bảng 1)](#8-summary-row-bảng-1)
9. [Khối Thành tựu & Khó khăn](#9-khối-thành-tựu--khó-khăn)
10. [Khối Tự Đánh Giá (Star Rating)](#10-khối-tự-đánh-giá-star-rating)
11. [Bottom Bar (Fixed)](#11-bottom-bar-fixed)
12. [Logic Tính Toán Real-time](#12-logic-tính-toán-real-time)
13. [Validation khi Submit](#13-validation-khi-submit)
14. [Hệ thống Scenarios TH1 → TH14](#14-hệ-thống-scenarios-th1--th14)
15. [Data Flow — API & Store](#15-data-flow--api--store)
16. [Spacing & Padding Chuẩn](#16-spacing--padding-chuẩn)
17. [Responsive Breakpoints](#17-responsive-breakpoints)
18. [Edge Cases quan trọng](#18-edge-cases-quan-trọng)

---

## 1. Cấu trúc File & Component

```
src/
  app/
    monthly/
      page.tsx                ← Trang chính, điều phối state machine
  components/
    MonthlyHeaderInfo.tsx     ← Sticky header + Info table + Guide box
    MonthlyReportGrid.tsx     ← Bảng KPI (prop: isOld, dùng cho cả 2 bảng)
    MonthlyAchieveBlock.tsx   ← Khối thành tựu/khó khăn 2×2 grid
    MonthlyRatingBlock.tsx    ← Khối tự đánh giá 5 sao
    MonthlyBottomBar.tsx      ← Bar kết quả + nút nộp (fixed bottom)
    SkeletonLoader.tsx        ← Skeleton loading (TH1)
  store/
    kpiStore.ts               ← Zustand store: tasks, monthlyData, actions
```

**Component Tree:**
```
monthly/page.tsx
  ├─ <SkeletonLoader />         ← state: loading
  ├─ <TokenExpiredScreen />     ← state: token_expired
  ├─ <ApiErrorScreen />         ← state: api_error
  └─ <MonthlyForm />            ← state: form | first_time
       ├─ [DraftBanner]         ← xuất hiện khi có draft localStorage
       ├─ <MonthlyHeaderInfo /> ← sticky header + info table + guide box
       ├─ <div.blocks-scroll>
       │    ├─ <MonthlyReportGrid isOld={true} />   ← Bảng báo cáo
       │    ├─ <MonthlyReportGrid isOld={false} />  ← Bảng kế hoạch
       │    ├─ <MonthlyAchieveBlock />
       │    └─ <MonthlyRatingBlock />
       └─ <MonthlyBottomBar />  ← fixed bottom
```

---

## 2. Design Tokens

### CSS Variables (khai báo trong `:root`)

```css
:root {
  --navy:       #1e3a5f;   /* Màu chủ đạo */
  --green:      #15803d;   /* % hoàn thành, điểm đạt */
  --gray-border: #d1d5db;  /* Border mặc định toàn trang */
}
```

### Bảng màu chi tiết

| Thành phần | Background | Border | Màu chữ | Ghi chú |
|---|---|---|---|---|
| Header h1 | — | — | `#1e3a5f` | font-black, uppercase |
| Badge navy | `#1e3a5f` | — | `#fff` | shadow: `0 2px 6px rgba(30,58,95,0.3)` |
| Badge blue | `#dbeafe` | `2px solid #bfdbfe` | `#1e3a8a` | — |
| Badge orange | `#ffedd5` | `2px solid #fed7aa` | `#c2410c` | **animation: pulse 2s infinite** |
| Thead bảng báo cáo | `#1e3a5f` | rgba(255,255,255,0.15) | `#fff` | — |
| Cột "Thực hiện" (báo cáo) | `#ca8a04` | — | `#fff` | **font-style: italic** |
| Cột "Thực hiện" (kế hoạch) | `#4b5563` | — | `#fff` | không italic |
| Ô actual-input | `#fefce8` | `2px solid #eab308` | `#111` | focus: border `#ca8a04`, shadow vàng |
| cell-pct / cell-score | `rgba(240,253,244,0.6)` | `1px solid #bbf7d0` | `#15803d` | font-bold |
| cell-dash | `#f3f4f6` | `1px solid #e5e7eb` | `#9ca3af` | font-bold, text "—" |
| cell-pending | `#f3f4f6` | `1px solid #e5e7eb` | `#6b7280` | font-size 11px, italic, text "Tháng sau chốt" |
| Nút xóa (Trash2) | — | — | `#f87171` | hover: `#b91c1c` |
| Summary row | `rgba(30,58,95,0.05)` | — | `#1e3a5f` | — |
| Section banner (báo cáo) | `rgba(30,58,95,0.1)` | `var(--gray-border)` border-bottom:none | `#1e3a5f` | — |
| Section banner (kế hoạch) | `#e5e7eb` | `var(--gray-border)` border-bottom:none | `#111` | — |
| Bottom bar | `#fff` | `border-top: 2px solid #1e3a5f` | — | shadow: `0 -10px 20px -3px rgba(0,0,0,0.12)` |
| Nút Submit | gradient `#3b82f6 → #1e3a5f` | border-bottom: `5px solid #1e3a5f` | `#fff` | shadow glow xanh, glow pulse animation |

### Font

```css
font-family: 'Inter', sans-serif;
/* Weights: 400, 500, 600, 700, 800, 900 */
/* Load từ Google Fonts */
```

Font size chuẩn:
- Body / input / td: `13px`  
- Header h1: `26px` mobile / `30px` desktop
- Badge: `12px` mobile / `14px` desktop
- Summary % lớn: `15px font-black`
- Bottom bar %: `28px` mobile / `32px` desktop, font-black
- Score label nhỏ: `10px uppercase tracking-[0.07em]`

### Animations

```css
/* Pulse — dùng cho badge "Nộp muộn" và glow nút Submit */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.65; }
}

/* Skeleton loading */
@keyframes skpulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
```

---

## 3. Layout Tổng Thể & Kỹ thuật Scroll

```
┌─────────────────────────────────────┐
│  .page (max-width: 1600px, pad 16px)│
│  ┌───────────────────────────────┐  │
│  │ .sticky-header (sticky top:0) │  │ ← margin: 0 -16px để background kéo ra ngoài
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ InfoTable + GuideBox (flex)   │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ .blocks-scroll (overflow-x:auto) │ ← scroll ngang duy nhất
│  │ ┌─────────────────────────┐   │  │
│  │ │.blocks-inner(min-w:1280)│   │  │ ← 4 khối luôn cùng chiều ngang
│  │ │  Bảng báo cáo           │   │  │
│  │ │  Bảng kế hoạch          │   │  │
│  │ │  Thành tựu & Khó khăn   │   │  │
│  │ │  Tự đánh giá            │   │  │
│  │ └─────────────────────────┘   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
[Fixed Bottom Bar]
```

**CSS quan trọng:**
```css
.page        { max-width: 1600px; margin: 0 auto; padding: 0 16px 120px; }
/* padding-bottom: 120px để không bị Bottom Bar che */

.blocks-scroll { overflow-x: auto; width: 100%; }
.blocks-inner  { min-width: 1280px; display: flex; flex-direction: column; gap: 32px; }
/* min-width: 1280px → đảm bảo 4 khối cùng chiều rộng, cuộn ngang đồng bộ */
```

---

## 4. Sticky Header

```css
.sticky-header {
  position: sticky; top: 0; z-index: 50;
  margin: 0 -16px 32px;          /* âm margin để background tràn ra khỏi .page padding */
  padding: 16px;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #f3f4f6;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border-radius: 0 0 8px 8px;
}
```

Nội dung bên trong:
```html
<div style="display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center">
  <h1 style="font-size:30px;font-weight:900;text-transform:uppercase;color:#1e3a5f;letter-spacing:0.04em">
    Báo Cáo & Kế Hoạch Tháng
  </h1>
  <div class="badge-row">  <!-- flex wrap center gap-12px -->
    <span class="badge badge-navy">📋 BC: Tháng {X} (01/{X} – {ngày cuối}/{X})</span>
    <span class="badge badge-blue">🗓️ KH: Tháng {X+1} (01/{X+1} – {ngày cuối}/{X+1})</span>
    <!-- CHỈ hiện khi isLate = true: -->
    <span class="badge badge-orange">⏰ Nộp muộn</span>
  </div>
</div>
```

**Badge CSS:**
```css
.badge        { padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; }
.badge-navy   { background: #1e3a5f; color: #fff; box-shadow: 0 2px 6px rgba(30,58,95,0.3); }
.badge-blue   { background: #dbeafe; color: #1e3a8a; border: 2px solid #bfdbfe; }
.badge-orange { background: #ffedd5; color: #c2410c; border: 2px solid #fed7aa; animation: pulse 2s infinite; }
```

---

## 5. Info Table + Guide Box

Layout: `display:flex; gap:20px; align-items:stretch; margin-bottom:32px; flex-wrap:wrap`

### Info Table (bên trái, shrink-0)

```css
.info-table    { border-collapse: collapse; font-size: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border-radius: 8px; overflow: hidden; background: #fff; }
.info-table td { border: 1px solid #d1d5db; padding: 8px 16px; }
.info-table .label { background: #f3f4f6; font-weight: 700; color: #374151; width: 140px; }
.info-table .value { color: #1e3a5f; font-weight: 400; min-width: 200px; }
.info-table .value.bold { font-weight: 900; }  /* Họ tên */
```

Các dòng: Họ tên (bold) | Báo cáo cho | Phòng ban | Ngày đánh giá

### Guide Box (bên phải, flex-1, min-width: 320px)

```html
<div style="flex:1; min-width:320px; border:1px solid #d1d5db; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06); display:flex; flex-direction:column;">
  <!-- Header guide -->
  <div style="background:rgba(30,58,95,0.08); border-bottom:1px solid #d1d5db; padding:6px 12px; display:flex; align-items:center; gap:6px;">
    <span>📌</span>
    <span style="font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:#1e3a5f;font-size:13px">Hướng dẫn làm báo cáo tháng</span>
  </div>
  <!-- 3 cột nội dung -->
  <div style="flex:1; background:#fff; display:grid; grid-template-columns:1fr 1fr 1fr; align-items:stretch;">
    <!-- Cột 1 ------- border-right:1px solid #e5e7eb -->
    <div style="border-right:1px solid #e5e7eb; padding:12px; display:flex; flex-direction:column;">
      <div style="font-weight:700;color:#1e3a5f;font-size:14px;margin-bottom:5px">📋 Báo cáo tháng trước</div>
      <div style="font-size:13.5px;color:#374151;line-height:1.7">
        Điền đủ: nội dung, đơn vị, KH, <span class="highlight-actual">Thực hiện</span>, trọng số.<br>
        % & Điểm tự động tính.<br>Lần đầu: copy từ Excel cũ.<br>Lần sau: tự lấy KH tháng trước.
      </div>
    </div>
    <!-- Cột 2 ------- border-right:1px solid #e5e7eb -->
    <div style="border-right:1px solid #e5e7eb; padding:12px; display:flex; flex-direction:column;">
      <div style="font-weight:700;color:#1e3a5f;font-size:14px;margin-bottom:5px">🗓️ Kế hoạch tháng tới</div>
      <div style="font-size:13.5px;color:#374151;line-height:1.7">
        Liệt kê đầu việc dự kiến.<br>Số lượng KH phải cụ thể, đo lường được.<br>Cột Thực hiện bỏ trống.<br>Đánh trọng số cao vào các đầu việc quan trọng.
      </div>
    </div>
    <!-- Cột 3 -->
    <div style="padding:12px; display:flex; flex-direction:column;">
      <div style="font-weight:700;color:#1e3a5f;font-size:14px;margin-bottom:5px">⚖️ Trọng số</div>
      <div style="font-size:13.5px;color:#374151;line-height:1.7">
        <strong>1</strong> — Việc không quá quan trọng<br>
        <strong>2</strong> — Việc bình thường<br>
        <strong>3</strong> — Việc cốt lõi, cần chú tâm
      </div>
    </div>
  </div>
</div>
```

Cụm "Thực hiện" highlight trong text hướng dẫn:
```css
/* inline style trong text */
background:#fefce8; border:1px solid #eab308; border-radius:2px; padding:0 4px; font-weight:600;
```

---

## 6. Bảng KPI — Cấu trúc Cột

**CSS bảng:**
```css
.kpi-table { width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 13px; }
.kpi-table thead tr { background: #1e3a5f; color: #fff; }
.kpi-table th { border: 1px solid rgba(255,255,255,0.15); padding: 10px 8px; text-align: center; white-space: nowrap; font-weight: 700; font-size: 13px; }
.kpi-table td { border: 1px solid #d1d5db; padding: 4px; vertical-align: middle; }
```

### Bảng 1 — Báo cáo tháng trước

| Cột | CSS class | `text-align` | `min-width` | Header | Ghi chú |
|---|---|---|---|---|---|
| STT | — | center | auto | STT | font-weight:500 |
| Nội dung CV | `col-content` | left | **380px** | Nội dung công việc `*` | — |
| Ghi chú | `col-note` | left | **230px** | Ghi chú tiến độ | — |
| Đơn vị | `col-unit` | center | **70px** | Đơn vị `*` | — |
| Số lượng KH | `col-qty` | center | **110px** | Số lượng (KH) `*` | — |
| Thực hiện | `col-actual` | center | **115px** | Thực hiện `*` | **bg: `#ca8a04`, font-style:italic** |
| % Hoàn Thành | `col-pct` | center | **110px** | % Hoàn Thành | auto-computed |
| Trọng số | `col-weight` | center | **80px** | Trọng số `*` | select 1/2/3 |
| Đạt được | `col-score` | center | **80px** | Đạt được | auto-computed |
| Xóa | `col-del` | center | **44px** | Xóa | icon Trash2 |

Dấu `*` bắt buộc: `<span class="req" style="color:#fca5a5">*</span>` (chữ hồng nhạt trên nền navy)

### Bảng 2 — Kế hoạch tháng tới

Giống Bảng 1, khác:
- Cột "Ghi chú" đổi label: **"Ghi chú / Mục tiêu cụ thể"**
- Cột "Thực hiện" (`col-actual-gray`): `min-width: 115px; background: #4b5563;` — **KHÔNG** italic, **KHÔNG** có dấu `*`
- **Không có Summary Row**

---

## 7. Row Types — 3 loại dòng

### Loại 1: `server_old` (Data từ server, isNhiemVuCu: true)

```html
<tr class="row-old" data-kh="8" data-ts="3">
  <!-- STT -->
  <td class="cell-stt">1</td>
  <!-- Nội dung — READ ONLY div -->
  <td><div class="cell-ro">Tên đầu việc</div></td>
  <!-- Ghi chú — READ ONLY div -->
  <td><div class="cell-ro">Ghi chú tiến độ...</div></td>
  <!-- Đơn vị — READ ONLY div căn giữa -->
  <td><div class="cell-ro-center">Bài</div></td>
  <!-- Số lượng KH — READ ONLY div căn giữa -->
  <td><div class="cell-ro-center">8</div></td>
  <!-- Thực hiện — INPUT vàng (DUY NHẤT được sửa) -->
  <td><input type="number" class="actual-input" min="0" step="0.5" placeholder="?" value="7" oninput="recalcRow(this)" /></td>
  <!-- % Hoàn Thành — auto computed -->
  <td><div class="cell-pct" data-pct>87.5%</div></td>
  <!-- Trọng số — READ ONLY div -->
  <td><div class="cell-ro-center">3</div></td>
  <!-- Đạt được — auto computed -->
  <td><div class="cell-score" data-score>2.63</div></td>
  <!-- XÓA — KHÔNG có nút, hiện dấu — -->
  <td><span style="color:#d1d5db;display:flex;align-items:center;justify-content:center;padding:8px">—</span></td>
</tr>
```

`data-kh` và `data-ts` lưu giá trị để tính toán.

Row hover: `background: rgba(239,246,255,0.5)` (row-old class)

### Loại 2: `user_old` (NV tự thêm vào Bảng 1)

```html
<tr class="row-old" data-kh="" data-ts="">
  <td class="cell-stt">5</td>
  <td><textarea placeholder="Tên đầu việc tháng trước..."></textarea></td>
  <td><textarea placeholder="Ghi chú tiến độ..."></textarea></td>
  <td><input type="text" placeholder="VD: Bài" style="text-align:center" /></td>
  <td><input type="number" class="kh-input" min="0" step="1" placeholder="VD: 5"
       style="text-align:center;font-weight:700" oninput="updateKH(this)" /></td>
  <td><input type="number" class="actual-input" min="0" step="0.5" placeholder="?"
       oninput="recalcRow(this)" /></td>
  <td><div class="cell-dash" data-pct>—</div></td>
  <td>
    <select class="ts-select" onchange="updateTS(this)">
      <option value="" disabled selected>-- chọn --</option>
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
    </select>
  </td>
  <td><div class="cell-dash" data-score>—</div></td>
  <td>
    <!-- Nút xóa LUCIDE Trash2 SVG -->
    <button class="del-btn" onclick="removeRow(this)">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        <line x1="10" x2="10" y1="11" y2="17"/>
        <line x1="14" x2="14" y1="11" y2="17"/>
      </svg>
    </button>
  </td>
</tr>
```

### Loại 3: `user_new` (Kế hoạch tháng tới, Bảng 2)

```html
<tr class="row-new">
  <td class="cell-stt">1</td>
  <td><textarea placeholder="Tên đầu việc tháng tới..."></textarea></td>
  <td><textarea placeholder="Mô tả chi tiết..."></textarea></td>
  <td><input type="text" placeholder="VD: Bài" style="text-align:center" /></td>
  <td><input type="number" min="0" step="1" placeholder="VD: 5" style="text-align:center;font-weight:700" /></td>
  <!-- Ô Thực hiện = CELL PENDING, không phải input -->
  <td><div class="cell-pending">Tháng sau chốt</div></td>
  <!-- % và Điểm = CELL DASH, không tính -->
  <td><div class="cell-dash">—</div></td>
  <td>
    <select>
      <option value="" disabled selected>-- chọn --</option>
      <option value="1">1</option><option value="2">2</option><option value="3">3</option>
    </select>
  </td>
  <td><div class="cell-dash">—</div></td>
  <td><button class="del-btn" onclick="removeRow(this)"><!-- SVG Trash2 --></button></td>
</tr>
```

### CSS ô đặc biệt

```css
/* Ô Thực hiện (input vàng) */
input.actual-input {
  background: #fefce8 !important; border-color: #eab308 !important;
  font-weight: 700; text-align: center; font-size: 14px;
}
input.actual-input:focus {
  border-color: #ca8a04 !important;
  box-shadow: 0 0 0 3px rgba(234,179,8,0.25);
}

/* Ô kết quả xanh lá */
.cell-pct   { background: rgba(240,253,244,0.6); border: 1px solid #bbf7d0 !important; padding: 8px; text-align: center; font-weight: 700; color: #15803d; }
.cell-score { background: rgba(240,253,244,0.6); border: 1px solid #bbf7d0 !important; padding: 8px; text-align: center; font-weight: 700; color: #15803d; }

/* Ô chưa có dữ liệu */
.cell-dash    { background: #f3f4f6; border: 1px solid #e5e7eb !important; padding: 8px; text-align: center; color: #9ca3af; font-weight: 700; }
.cell-pending { background: #f3f4f6; border: 1px solid #e5e7eb !important; padding: 8px; text-align: center; color: #6b7280; font-size: 11px; font-style: italic; font-weight: 500; white-space: nowrap; }

/* Read-only text */
.cell-ro        { padding: 8px; color: #111; font-weight: 500; }
.cell-ro-center { padding: 8px; text-align: center; font-weight: 500; color: #111; }
.cell-stt       { text-align: center; font-weight: 500; color: #111; padding: 8px; }

/* Nút xóa */
.del-btn { background: none; border: none; cursor: pointer; color: #f87171; padding: 8px; line-height: 1; transition: color 0.15s; display: flex; align-items: center; justify-content: center; margin: auto; }
.del-btn:hover { color: #b91c1c; }
```

### Input style chung

```css
textarea, input[type=text], input[type=number], select {
  font-family: 'Inter', sans-serif; font-size: 13px;
  border: 2px solid #d1d5db; border-radius: 3px;
  padding: 8px; outline: none; color: #111; font-weight: 400;
  width: 100%; background: #fff; transition: border-color 0.15s;
}
textarea { resize: vertical; min-height: 60px; }
textarea:focus, input:focus, select:focus { border-color: #3b82f6; }
textarea::placeholder, input::placeholder {
  color: #9ca3af !important; opacity: 0.8; font-style: italic; font-weight: 400;
}
```

### Nút thêm dòng

```css
/* Bảng 1 — border xanh */
.add-row-td      { border: 1px dashed #93c5fd !important; background: rgba(239,246,255,0.2); padding: 10px; text-align: center; }
.add-row-btn     { color: #1e3a5f; font-weight: 600; font-size: 13px; cursor: pointer; background: none; border: none; font-family: 'Inter', sans-serif; display: inline-flex; align-items: center; gap: 6px; }
.add-row-btn:hover { color: #1d4ed8; }

/* Bảng 2 — border xám */
.add-row-td.gray    { border-color: #d1d5db !important; background: rgba(249,250,251,0.3); }
.add-row-btn.gray-btn { color: #2563eb; }
```

Label nút:
- Bảng 1: `＋ Thêm đầu việc tháng trước`
- Bảng 2: `＋ Thêm đầu việc mới`

---

## 8. Summary Row (Bảng 1)

Luôn là dòng CUỐI trong `<tbody>`, sau nút "Thêm đầu việc":

```html
<tr class="summary-row">
  <td colspan="6" class="summary-label">📊 Tổng kết Tháng {X}</td>
  <td class="summary-pct" colspan="2">Tổng trọng số: <strong>{totalWeight}</strong></td>
  <td class="summary-pct" colspan="2">
    Đạt: <strong>{totalScore} / {totalWeight}</strong> →
    <span style="color:#15803d;font-size:15px;font-weight:900">{pct}% KH</span>
  </td>
</tr>
```

```css
.summary-row td  { background: rgba(30,58,95,0.05); }
.summary-label   { font-weight: 700; color: #1e3a5f; font-size: 13px; padding: 8px 12px; }
.summary-pct     { color: #15803d; font-weight: 700; font-size: 14px; text-align: center; padding: 8px; }
```

---

## 9. Khối Thành tựu & Khó khăn

```html
<div class="achieve-section"> <!-- border:1px solid #d1d5db; border-radius:8px; overflow:hidden -->
  <div class="achieve-header"> <!-- bg:rgba(30,58,95,0.1); border-bottom:1px solid #d1d5db; padding:12px 16px; flex align-center gap:8px -->
    <span>🏆</span>
    <span class="label">Thành tựu nổi bật & Khó khăn trong tháng</span>
    <!-- .label: font-weight:700; font-size:13px; color:#1e3a5f; text-transform:uppercase; letter-spacing:0.05em -->
  </div>
  <div class="achieve-body"> <!-- padding:16px; display:grid; grid-template-columns:1fr 1fr; gap:16px; bg:#fff -->
    <!-- Ô 1: BẮT BUỘC -->
    <div class="achieve-field">
      <label>⭐ Thành tựu / Kết quả nổi bật <span style="color:#dc2626">*</span></label>
      <textarea placeholder="VD: Hoàn thành 5 game STEM mới, Landing Page đạt 10k view..."></textarea>
    </div>
    <!-- Ô 2: Không bắt buộc -->
    <div class="achieve-field">
      <label>⛔ Khó khăn / Vướng mắc gặp phải</label>
      <textarea placeholder="VD: Game SDK v2 còn lỗi logic va chạm, chờ Designer duyệt assets..."></textarea>
    </div>
    <!-- Ô 3: Không bắt buộc -->
    <div class="achieve-field">
      <label>💡 Đề xuất cải tiến / Cần hỗ trợ gì?</label>
      <textarea placeholder="VD: Đề xuất trang bị thêm account ChatGPT Team..."></textarea>
    </div>
    <!-- Ô 4: BẮT BUỘC -->
    <div class="achieve-field">
      <label>🎯 Mục tiêu ưu tiên tháng tới <span style="color:#dc2626">*</span></label>
      <textarea placeholder="Mục tiêu quan trọng nhất bạn muốn đạt được tháng tới..."></textarea>
    </div>
  </div>
</div>
```

```css
.achieve-field label {
  display: block; font-size: 12px; font-weight: 700; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;
}
.achieve-field textarea { min-height: 80px; }
```

---

## 10. Khối Tự Đánh Giá (Star Rating)

```html
<div class="rating-section"> <!-- border:1px solid #d1d5db; border-radius:8px; overflow:hidden -->
  <div class="rating-header"> <!-- bg:#e5e7eb; border-bottom:1px solid #d1d5db; padding:12px 16px; flex align-center gap:8px -->
    <span>🌟</span>
    <span class="label">Tự đánh giá mức độ hoàn thành tháng</span>
    <!-- .label: font-weight:700; font-size:13px; color:#111; text-transform:uppercase; letter-spacing:0.05em -->
  </div>
  <div class="rating-body"> <!-- padding:20px; bg:#fff; display:flex; align-items:center; gap:24px; flex-wrap:wrap -->
    <!-- Text hướng dẫn bên trái -->
    <div class="rating-text">
      <div class="rating-label">Bạn tự chấm điểm tháng này:</div>
      <div class="rating-desc">1 = Yếu · 2 = Kém · 3 = Trung Bình · 4 = Khá · 5 = Đạt</div>
    </div>
    <!-- 5 nút sao -->
    <div class="rating-stars" id="stars">
      <!-- Default: 4 sao active -->
      <button class="star-btn active" onclick="setStar(1)">⭐</button>
      <button class="star-btn active" onclick="setStar(2)">⭐</button>
      <button class="star-btn active" onclick="setStar(3)">⭐</button>
      <button class="star-btn active" onclick="setStar(4)">⭐</button>
      <button class="star-btn"        onclick="setStar(5)">⭐</button>
    </div>
    <!-- Label kết quả bên phải -->
    <div class="rating-text">
      <div class="rating-label" id="star-label">4 / 5 — Khá</div>
      <div class="rating-desc">CEO sẽ xem xét và phản hồi sau khi duyệt</div>
    </div>
  </div>
</div>
```

```css
.star-btn       { font-size: 30px; cursor: pointer; background: none; border: none; opacity: 0.25; transition: all 0.15s; }
.star-btn.active { opacity: 1; transform: scale(1.15); }
.star-btn:hover  { opacity: 0.8; transform: scale(1.1); }
.rating-label   { font-size: 14px; font-weight: 700; color: #1e3a5f; }
.rating-desc    { font-size: 12px; color: #6b7280; margin-top: 2px; }
```

Star labels mapping: `['', '1 / 5 — Yếu', '2 / 5 — Kém', '3 / 5 — Trung Bình', '4 / 5 — Khá', '5 / 5 — Đạt']`

Logic JS:
```js
function setStar(n) {
  currentStar = n;
  document.querySelectorAll('.star-btn').forEach((b, i) => b.classList.toggle('active', i < n));
  document.getElementById('star-label').textContent = starLabels[n];
}
```

---

## 11. Bottom Bar (Fixed)

```css
.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #fff; border-top: 2px solid #1e3a5f;
  box-shadow: 0 -10px 20px -3px rgba(0,0,0,0.12);
  padding: 16px 24px; display: flex; justify-content: flex-end; align-items: center; z-index: 50;
}
.bottom-bar-inner { display: flex; align-items: center; gap: 32px; }
```

### Score display

```html
<div class="score-display">  <!-- text-align:right -->
  <div class="score-label">Kết quả hoàn thành</div>
  <!-- 10px, gray-400, uppercase, tracking-wider, font-semibold -->
  <div class="score-value">  <!-- flex; align-items:baseline; gap:6px; justify-content:flex-end; white-space:nowrap -->
    <span class="score-week">Tháng {X} Đạt</span>
    <!-- 18px font-bold text-gray-600 uppercase -->
    <span class="score-pct">{pct}%</span>
    <!-- 32px font-black text-#15803d -->
    <span class="score-kh">KH</span>
    <!-- 14px font-black text-#15803d -->
  </div>
</div>
```

### Nút Submit

```html
<button class="submit-btn" id="submitBtn">
  <!-- Glow effect (absolute, z-index: -1) -->
  <span class="glow"></span>
  <span class="btn-label">📤 NỘP BÁO CÁO</span>
</button>
```

```css
.submit-btn {
  position: relative; font-weight: 900; padding: 12px 24px; border-radius: 12px;
  color: #fff; font-size: 14px; white-space: nowrap; border: none; cursor: pointer;
  background: linear-gradient(135deg, #3b82f6 0%, #1e3a5f 100%);
  box-shadow: 0 10px 25px rgba(59,130,246,0.6);
  border-bottom: 5px solid #1e3a5f;
  border-top: 1px solid rgba(255,255,255,0.3);
  transition: all 0.15s; z-index: 10;
}
.submit-btn:hover  { transform: scale(1.05); box-shadow: 0 15px 35px rgba(59,130,246,0.9); }
.submit-btn:active { transform: scale(0.97); }

/* Glow */
.submit-btn .glow {
  position: absolute; inset: -4px; border-radius: 14px;
  background: #60a5fa; filter: blur(12px); opacity: 0.5; z-index: -1;
  animation: pulse 2s infinite;
}
.submit-btn .btn-label { position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; }

/* Loading state */
.submit-btn-loading {
  background: #9ca3af !important; cursor: not-allowed !important;
  box-shadow: none !important; border-bottom-color: #6b7280 !important;
}
```

Desktop: `font-size: 18px; padding: 12px 56px;`

### Trạng thái nút

| State | Text | CSS | Disabled? |
|---|---|---|---|
| Bình thường | `📤 NỘP BÁO CÁO` | submit-btn + glow | Không |
| Đang nộp | `⏳ Đang nộp...` | + submit-btn-loading | **Có** |
| Đã nộp | `✅ Đã nộp lúc HH:MM SA/CH` | gradient xanh lá `#16a34a → #15803d`, shadow xanh lá | **Có** |

---

## 12. Logic Tính Toán Real-time

### Hàm `recalcRow(input)` — trigger khi thay đổi ô Thực hiện

```js
function recalcRow(input) {
  const tr = input.closest('tr');
  const thucHien = parseFloat(input.value);

  // Lấy keHoach: ưu tiên data-kh trên tr, fallback kh-input
  let keHoach = parseFloat(tr.dataset.kh);
  if (isNaN(keHoach)) {
    const khInput = tr.querySelector('.kh-input');
    keHoach = khInput ? parseFloat(khInput.value) : NaN;
  }

  // Lấy trongSo: ưu tiên data-ts trên tr, fallback ts-select
  let trongSo = parseFloat(tr.dataset.ts);
  if (isNaN(trongSo)) {
    const tsSelect = tr.querySelector('.ts-select');
    trongSo = tsSelect ? parseFloat(tsSelect.value) : NaN;
  }

  const pctCell   = tr.querySelector('[data-pct]');
  const scoreCell = tr.querySelector('[data-score]');

  if (isNaN(thucHien) || isNaN(keHoach) || keHoach <= 0) {
    // Hiện — (cell-dash)
    if (pctCell)   { pctCell.textContent = '—'; pctCell.className = 'cell-dash'; }
    if (scoreCell) { scoreCell.textContent = '—'; scoreCell.className = 'cell-dash'; }
  } else {
    const pct   = Math.min((thucHien / keHoach) * 100, 999); // CAP 999%
    const score = isNaN(trongSo) ? null : (pct / 100) * trongSo;

    if (pctCell) {
      // Bỏ trailing ".0": 100.0% → 100%, 87.5% giữ nguyên
      pctCell.textContent = pct.toFixed(1).replace('.0', '') + '%';
      pctCell.className = 'cell-pct';
    }
    if (scoreCell) {
      // Bỏ trailing zeros: 2.63 giữ nguyên, 3.00 → 3, 2.50 → 2.5
      scoreCell.textContent = score !== null ? score.toFixed(2).replace(/\.?0+$/, '') : '—';
      scoreCell.className = score !== null ? 'cell-score' : 'cell-dash';
    }
  }
  recalcSummary();
}
```

### Hàm `updateKH(input)` — trigger khi thay đổi ô KH (user_old)

```js
function updateKH(input) {
  const actualInput = input.closest('tr').querySelector('.actual-input');
  if (actualInput && actualInput.value !== '') recalcRow(actualInput);
}
```

### Hàm `updateTS(select)` — trigger khi thay đổi trọng số (user_old)

```js
function updateTS(select) {
  const actualInput = select.closest('tr').querySelector('.actual-input');
  if (actualInput && actualInput.value !== '') recalcRow(actualInput);
}
```

### Hàm `recalcSummary()` — cập nhật Summary Row + Bottom Bar

```js
function recalcSummary() {
  const rows = document.querySelectorAll('#tbody1 tr.row-old');
  let totalWeight = 0, totalScore = 0;

  rows.forEach(tr => {
    // Trọng số
    let ts = parseFloat(tr.dataset.ts);
    if (isNaN(ts)) {
      const sel = tr.querySelector('.ts-select');
      ts = sel ? parseFloat(sel.value) : NaN;
    }
    // Điểm đạt (đọc từ cell)
    const scoreCell = tr.querySelector('[data-score]');
    const scoreVal = scoreCell ? parseFloat(scoreCell.textContent) : NaN;

    if (!isNaN(ts)) totalWeight += ts;
    if (!isNaN(scoreVal)) totalScore += scoreVal;
  });

  const pct = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

  // Cập nhật summary row
  document.getElementById('sumWeight').innerHTML = `Tổng trọng số: <strong>${totalWeight}</strong>`;
  document.getElementById('sumScore').innerHTML  =
    `Đạt: <strong>${totalScore.toFixed(1)} / ${totalWeight}</strong> → <span style="color:#15803d;font-size:15px;font-weight:900">${pct.toFixed(1)}% KH</span>`;

  // Cập nhật bottom bar
  document.getElementById('bottomPct').textContent = pct.toFixed(1) + '%';
}
```

### Quy tắc hiển thị số

| Trường hợp | Input | Output |
|---|---|---|
| % nguyên | 100.0 | `100%` |
| % thập phân | 87.5 | `87.5%` |
| % nhiều chữ | 66.666... | `66.7%` |
| % vượt KH | 120 | `120%` (không cap < 999) |
| Điểm nguyên | 3.00 | `3` |
| Điểm thập phân | 2.63 | `2.63` |
| Điểm .5 | 2.50 | `2.5` |
| Chưa có dữ liệu | — | `—` (cell-dash) |

---

## 13. Validation khi Submit

Thứ tự validate (toàn bộ chạy ĐỒNG THỜI khi click Nộp):

**Bước 1 — Xóa lỗi cũ:**
```js
document.querySelectorAll('.row-field-err').forEach(el => el.classList.remove('row-field-err'));
document.querySelectorAll('.plan-block-err').forEach(el => el.classList.remove('plan-block-err'));
document.querySelectorAll('.plan-err-msg').forEach(el => el.remove());
```

**Bước 2 — Kiểm tra từng dòng Bảng 1 (row-old):**
- **Server row:** Chỉ check `actual-input` (Thực hiện) — nếu trống → thêm class `row-field-err`
- **User row:** Check tất cả trường `*`: `textarea[nội dung]`, `input[text][đơn vị]`, `.kh-input`, `.ts-select`, `.actual-input`

Error CSS cho ô vi phạm:
```css
.row-field-err {
  border-color: #dc2626 !important;
  background: #fef2f2 !important;
  box-shadow: 0 0 0 2px rgba(220,38,38,0.15) !important;
}
```

**Bước 3 — Kiểm tra Bảng 2 có ít nhất 1 dòng:**
- Nếu `querySelectorAll('#tbody2 tr.row-new').length === 0`:
  - Thêm `plan-block-err` vào `.content-block` chứa Bảng 2
  - Chèn `<div class="plan-err-msg">` ngay sau `.table-scroll` của Bảng 2

```css
.plan-block-err .section-banner { border-color: #dc2626 !important; background: #fef2f2; color: #991b1b; }
.plan-block-err .kpi-table      { border-color: #fca5a5 !important; }
.plan-block-err .add-row-td     { border-color: #fca5a5 !important; background: #fff5f5; }
.plan-err-msg {
  background: #fef2f2; border: 1px solid #fca5a5; border-top: none;
  border-radius: 0 0 8px 8px; padding: 10px 16px;
  font-size: 13px; color: #dc2626; font-weight: 700;
  display: flex; align-items: center; gap: 8px;
}
/* Nội dung: "⚠️ Kế hoạch tháng tới phải có ít nhất 1 đầu việc — Bấm "Thêm đầu việc mới" để thêm" */
```

**Bước 4 — Kiểm tra các trường trong Bảng 2 (nếu có dòng):** Tương tự user_old nhưng không check `actual-input`.

**Bước 5 — Kiểm tra Thành tựu & Mục tiêu:**
```js
// Nếu trống:
el.style.borderColor = '#dc2626';
el.style.background  = '#fef2f2';
// Thêm .err-hint bên dưới: "⚠️ Không được để trống"
```

```css
.field-err { border-color: #dc2626 !important; background: #fef2f2 !important; }
.err-hint  { font-size: 12px; color: #dc2626; font-weight: 700; margin-top: 5px; display: flex; align-items: center; gap: 4px; }
```

**Bước 6 — Scroll đến lỗi đầu tiên:**
```js
const firstErr = document.querySelector('.row-field-err, .plan-err-msg');
if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

**Auto-clear:** User gõ/chọn vào ô đang đỏ → tự xóa class `row-field-err`:
```js
document.addEventListener('input', e => {
  if (e.target.classList.contains('row-field-err') && e.target.value !== '')
    e.target.classList.remove('row-field-err');
});
document.addEventListener('change', e => {
  if (e.target.classList.contains('row-field-err') && e.target.value !== '')
    e.target.classList.remove('row-field-err');
});
```

---

## 14. Hệ thống Scenarios TH1 → TH14

Tất cả scenarios đều là **state machine** của `monthly/page.tsx`.

### TH1 — Loading / Skeleton

**Khi nào:** Đang fetch API ban đầu.  
**UI:** Toàn bộ trang thay bằng skeleton pulse. Chặn mọi interaction.

Skeleton bao gồm:
- Khu vực header: title skeleton (320px) + 2 badge skeleton (140px, border-radius:999px)
- Info row: bảng tên (4 dòng skeleton) + guide box skeleton (height:90px)
- Bảng: header skeleton (height:44px) + 4 dòng rows (opacity giảm dần: 0.85, 0.65, 0.45, 0.28)
- Text chờ: `⏳ Đang tải dữ liệu của {tên}...` (italic, gray)

```css
.sk { background: #e5e7eb; border-radius: 6px; animation: skpulse 1.5s ease-in-out infinite; }
```

---

### TH2 — Lần đầu (không có data tháng cũ)

**Khi nào:** API trả về `tasks: []`.  
**Khác TH3:** Có banner chào màu xanh + Bảng 1 hoàn toàn trống (chỉ có nút "Thêm").

Banner chào (First-time welcome):
```html
<div class="ft-banner">
  <!-- bg: linear-gradient(135deg,#eff6ff,#f0fdf4); border: 2px solid #93c5fd; border-radius:12px; padding:24px 28px; display:flex; align-items:flex-start; gap:16px -->
  <div class="ft-icon">👋</div>  <!-- font-size:40px -->
  <div>
    <div class="ft-title">Chào mừng bạn lần đầu dùng hệ thống!</div>
    <!-- 16px font-black color:#1e3a5f -->
    <div class="ft-desc">
      Bảng <strong>Báo cáo tháng trước</strong> đang trống — bạn cần tự điền kết quả từ file Excel cũ.
      <span class="ft-step">① Nhớ lại KH và thực hiện tháng trước</span>
      <span class="ft-step">② Bấm "Thêm đầu việc tháng trước"</span>
      <span class="ft-step">③ Điền đủ các cột rồi nộp</span>
    </div>
  </div>
</div>
```

```css
.ft-step {
  display: inline-flex; align-items: center; gap: 6px;
  background: #dbeafe; color: #1e40af; font-size: 12px; font-weight: 700;
  padding: 4px 10px; border-radius: 999px; margin: 4px 4px 0 0;
}
```

Bảng 1 trống có dòng placeholder:
```html
<tr>
  <td colspan="10" style="padding:32px;text-align:center;color:#9ca3af;font-style:italic;font-size:13px;background:#fafafa;border:1px dashed #d1d5db;">
    Chưa có đầu việc nào — Bấm nút bên dưới để thêm
  </td>
</tr>
```

---

### TH3 — Form bình thường (màn hình chính)

**Khi nào:** API trả về dữ liệu đầy đủ.  
Đây là màn hình chính được mô tả từ Section 4 đến Section 12.

---

### TH4 — Token hết hạn (link > 72h hoặc sai token)

**Khi nào:** API trả về 401/403 hoặc token hết hạn.  
**UI:** Chặn toàn trang. Full-screen card.

```html
<div class="fsc fsc-bg-neutral">
  <!-- min-height:420px; display:flex; align-items:center; justify-content:center; padding:32px -->
  <!-- fsc-bg-neutral: background:#f0f4f8 -->
  <div class="fsc-card">
    <!-- bg:#fff; border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,0.12); padding:48px 40px; max-width:480px; text-align:center -->
    <div class="fsc-icon">🔗</div>          <!-- font-size:72px -->
    <div class="fsc-title">Link đã hết hạn</div>
    <div class="fsc-desc">
      Link báo cáo chỉ có hiệu lực trong <strong>72 giờ</strong>.<br/>
      Vui lòng liên hệ quản lý để nhận link mới,<br>hoặc kiểm tra lại email.
    </div>
    <div>
      <button class="fsc-btn fsc-btn-gray">📧 Liên hệ quản lý</button>
      <button class="fsc-btn fsc-btn-navy">🔄 Thử lại</button>
    </div>
  </div>
</div>
```

```css
.fsc-btn       { padding: 12px 36px; border-radius: 10px; font-weight: 800; font-size: 15px; border: none; cursor: pointer; font-family: 'Inter',sans-serif; display: inline-flex; align-items: center; gap: 8px; }
.fsc-btn-navy  { background: #1e3a5f; color: #fff; }
.fsc-btn-gray  { background: #e5e7eb; color: #374151; margin-right: 10px; }
.fsc-btn-green { background: #15803d; color: #fff; }
```

---

### TH5 — Lỗi API / mạng khi load

**Khi nào:** Fetch thất bại (500, timeout, mất mạng).  
**UI:** Full-screen card đỏ nhạt, hiện error code.

```html
<div class="fsc fsc-bg-error">  <!-- background:#fff0f0 -->
  <div class="fsc-card">
    <div class="fsc-icon">⚠️</div>
    <div class="fsc-title">Không thể tải dữ liệu</div>
    <div class="fsc-desc">
      Hệ thống gặp sự cố khi tải dữ liệu.<br/>
      Có thể do mạng không ổn định hoặc server đang bảo trì.<br/><br/>
      <span style="font-size:12px;background:#fee2e2;padding:6px 12px;border-radius:6px;color:#991b1b;font-family:monospace">Error: Failed to fetch — 503</span>
    </div>
    <button class="fsc-btn fsc-btn-navy" style="width:100%;justify-content:center">🔄 Thử tải lại</button>
  </div>
</div>
```

---

### TH6 — Nộp thành công (Full-screen)

**Khi nào:** POST thành công. Thay thế hoàn toàn form.

```html
<div class="fsc fsc-bg-success">
  <!-- background: linear-gradient(135deg,#ecfdf5,#dbeafe) -->
  <div class="fsc-card" style="max-width:520px">
    <div class="fsc-icon">🎉</div>
    <div class="fsc-title">Đã nộp báo cáo thành công!</div>

    <!-- Score box -->
    <div class="fsc-score-box">
      <!-- bg:rgba(21,128,61,0.08); border:2px solid #bbf7d0; border-radius:14px; padding:20px 32px; display:inline-block -->
      <div class="fsc-score-label">Kết quả Tháng {X}</div>
      <!-- 11px, gray-500, uppercase, tracking, font-bold -->
      <div class="fsc-score-val">{pct}%</div>
      <!-- 48px font-black color:#15803d -->
      <div class="fsc-score-sub">KH đạt được</div>
      <!-- 13px color:#15803d font-bold -->
    </div>

    <div class="fsc-desc">
      Báo cáo của bạn đã được ghi nhận vào hệ thống.<br/>
      CEO sẽ xem xét và phản hồi trong vòng <strong>1–2 ngày làm việc</strong>.<br/><br/>
      <span style="font-size:12px;color:#6b7280">Nộp lúc: {dd/mm/yyyy} · {HH:MM SA/CH}</span><br>
      <span style="font-size:12px;color:#6b7280">Bot Discord đã thông báo đến CEO ✓</span>
    </div>

    <div style="display:flex;gap:10px;justify-content:center">
      <button class="fsc-btn fsc-btn-gray">📋 Xem lại báo cáo</button>
      <button class="fsc-btn fsc-btn-green">✅ Đóng</button>
    </div>
  </div>
</div>
```

---

### TH7 — Nộp muộn (badge cam xuất hiện)

**Khi nào:** `isLate: true` từ API.  
**Khác TH3:** Badge `⏰ Nộp muộn` với `animation: pulse 2s infinite` xuất hiện thêm trong sticky header. Form bên dưới **y hệt TH3**.

---

### TH8 — Đang nộp (button loading state)

**Khi nào:** Sau khi click Nộp, đang chờ POST response.  
**Khác TH3:** Chỉ Bottom Bar thay đổi. Nút chuyển sang loading.

```html
<!-- Nút đang nộp -->
<button class="submit-btn submit-btn-loading" disabled>
  <span class="btn-label">⏳ Đang nộp...</span>
</button>
```

Form phía trên **không bị lock** (chỉ nút bị disabled).

---

### TH9 — Validate lỗi (3 loại đồng thời)

**Khi nào:** Click Nộp khi thiếu dữ liệu.  
**Hiệu ứng:** Tất cả lỗi highlight đỏ đồng thời + scroll đến lỗi đầu tiên.

**Loại ①** — Trường `*` trong row của bảng:
- `actual-input` bỏ trống (cả server row và user row)
- Các field tự điền: textarea, input text (đơn vị), kh-input, ts-select
- CSS: `border-color: #dc2626; background: #fef2f2; box-shadow: 0 0 0 2px rgba(220,38,38,0.15)`

**Loại ②** — Bảng kế hoạch tháng tới trống:
- Section banner → bg `#fef2f2`, border `#dc2626`, text đỏ
- Bảng → border `#fca5a5`
- Nút thêm → border `#fca5a5`, bg `#fff5f5`
- Thông báo bên dưới bảng: `⚠️ Kế hoạch tháng tới phải có ít nhất 1 đầu việc — Bấm "Thêm đầu việc mới" để thêm`

**Loại ③** — Thành tựu hoặc Mục tiêu bỏ trống:
- Textarea → `border-color: #dc2626; background: #fef2f2`
- Hiện `.err-hint`: `⚠️ Không được để trống`

---

### TH10 — Draft cũ (banner vàng + form mờ)

**Khi nào:** Load trang, phát hiện có draft trong localStorage.  
**UI:** Banner vàng xuất hiện đầu trang. Form bên dưới mờ (`opacity:0.35; pointer-events:none; filter:blur(1px)`) cho đến khi user chọn.

```html
<div class="draft-banner">
  <!-- bg:#fffbeb; border:2px solid #f59e0b; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:16px; flex-wrap:wrap -->
  <span style="font-size:28px;flex-shrink:0">💾</span>
  <div class="draft-banner-text">
    <div class="dt">Bạn có bản nháp chưa nộp từ trước</div>
    <!-- font-weight:800; font-size:14px; color:#92400e -->
    <div class="dd">Lưu lúc: {dd/mm/yyyy} · {HH:MM} — Bạn muốn tiếp tục hay bắt đầu lại?</div>
    <!-- font-size:13px; color:#78350f; margin-top:2px -->
  </div>
  <div class="draft-actions">
    <button class="draft-btn-discard">🗑 Bắt đầu lại</button>
    <!-- bg:none; color:#6b7280; border:1px solid #d1d5db; padding:8px 16px; border-radius:8px; font-weight:600 -->
    <button class="draft-btn-restore">📂 Khôi phục nháp</button>
    <!-- bg:#f59e0b; color:#111; border:none; padding:8px 16px; border-radius:8px; font-weight:700 -->
  </div>
</div>
```

---

### TH11 — Modal xác nhận nộp lại

**Khi nào:** Click Nộp khi `submittedAt !== null` (đã nộp trước đó).  
**UI:** Modal overlay trên form (form mờ phía sau).

```html
<div class="modal-wrapper">
  <!-- position:relative; min-height:300px; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; padding:32px; backdrop-filter:blur(2px) -->
  <div class="modal-card">
    <!-- bg:#fff; border-radius:20px; box-shadow:0 25px 60px rgba(0,0,0,0.3); padding:36px; max-width:440px -->
    <div class="modal-title">📤 Bạn đã nộp báo cáo này rồi</div>
    <!-- 20px font-black color:#1e3a5f -->
    <div class="modal-body">
      Báo cáo <strong>Tháng {X}</strong> đã được nộp lúc <strong>{ngày giờ}</strong>.
      Nếu bạn nộp lại, dữ liệu cũ sẽ bị <strong>ghi đè hoàn toàn</strong>. CEO sẽ nhận thông báo mới.
    </div>
    <!-- 14px color:#4b5563 line-height:1.7 white-space:pre-line -->
    <div class="modal-actions">
      <button class="modal-btn modal-btn-cancel">Huỷ — Giữ lần nộp cũ</button>
      <button class="modal-btn modal-btn-danger">🔄 Nộp lại & Ghi đè</button>
    </div>
  </div>
</div>
```

```css
.modal-btn         { padding: 10px 22px; border-radius: 10px; font-weight: 700; font-size: 14px; border: none; cursor: pointer; font-family: 'Inter',sans-serif; }
.modal-btn-cancel  { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
.modal-btn-danger  { background: #dc2626; color: #fff; }
.modal-btn-amber   { background: #f59e0b; color: #111; }
```

---

### TH12 — Modal hỏi khôi phục draft (variant)

**Khi nào:** Thay vì banner (TH10), dùng modal overlay. Chọn 1 trong 2 cách.  
**UI:** Modal với 2 nút: "Bắt đầu lại" (cancel) + "Khôi phục nháp" (amber).

```html
<div class="modal-card">
  <div class="modal-title">💾 Tìm thấy bản nháp</div>
  <div class="modal-body">
    Bạn có bản nháp báo cáo <strong>Tháng {X}</strong> chưa nộp, lưu lúc <strong>{ngày giờ}</strong>.
    Bạn muốn tiếp tục từ bản nháp hay bắt đầu lại từ đầu?
  </div>
  <div class="modal-actions">
    <button class="modal-btn modal-btn-cancel">🗑 Bắt đầu lại</button>
    <button class="modal-btn modal-btn-amber">📂 Khôi phục nháp</button>
  </div>
</div>
```

---

### TH13 — Toast lỗi mạng khi nộp

**Khi nào:** POST thất bại (mất mạng, timeout).  
**UI:** Toast đỏ xuất hiện góc trên phải. Form giữ nguyên (không mất data). Nút Submit trở lại bình thường.

```html
<!-- Vị trí: fixed top-4 right-4 z-50 -->
<div class="toast toast-error">
  <!-- display:inline-flex; align-items:center; gap:12px; padding:14px 18px; border-radius:14px; font-weight:600; font-size:14px; box-shadow:0 10px 40px rgba(0,0,0,0.18); max-width:380px -->
  <!-- toast-error: background:#dc2626; color:#fff -->
  <span>❌</span>
  <span>Nộp thất bại — Kiểm tra kết nối mạng và thử lại</span>
  <span class="toast-close">×</span>
  <!-- toast-close: font-size:18px; opacity:0.75; cursor:pointer; margin-left:6px -->
</div>
```

Tự ẩn sau 4 giây.

---

### TH14 — Toast thành công nhỏ (variant của TH6)

**Khi nào:** Alternative khi không muốn chuyển màn hình full. Form chuyển read-only.  
**UI:** Toast xanh lá + Bottom bar chuyển sang trạng thái "Đã nộp".

```html
<!-- Toast -->
<div class="toast toast-success">
  <!-- toast-success: background:#15803d; color:#fff -->
  <span>✅</span>
  <span>Báo cáo đã được nộp thành công! ({pct}% KH)</span>
  <span class="toast-close">×</span>
</div>

<!-- Bottom bar: nút đã nộp -->
<button class="submit-btn" disabled
  style="background:linear-gradient(135deg,#16a34a,#15803d);box-shadow:0 10px 25px rgba(21,128,61,0.4);border-bottom-color:#14532d;cursor:default">
  <span class="btn-label">✅ Đã nộp lúc {HH:MM SA/CH}</span>
</button>
```

---

## 15. Data Flow — API & Store

### GET `/api/monthly?token=xxx`

Response:
```typescript
{
  name: string;          // "Nguyễn Văn A"
  role: string;          // "Dev"
  dept: string;          // "Content"
  reportTo: string;      // "CEO"
  reportMonth: number;   // 3 (tháng báo cáo)
  planMonth: number;     // 4 (tháng kế hoạch)
  year: number;          // 2026
  isLate: boolean;       // true → hiện badge cam
  submittedAt: string | null;  // null = chưa nộp
  tasks: Task[];         // Dữ liệu KH tháng trước từ server (isNhiemVuCu: true)
}
```

Logic sau fetch:
- `tasks.length === 0` → state `first_time`
- `tasks.length > 0` → state `form`

### POST `/api/monthly`

Payload:
```typescript
{
  token: string;
  oldTasks: Task[];         // Bảng báo cáo (isNhiemVuCu: true)
  newTasks: Task[];         // Bảng kế hoạch (isNhiemVuCu: false)
  achievements: string;
  difficulties: string;
  proposals: string;
  priorities: string;
  rating: number;           // 1-5
  submittedAt: string;      // ISO datetime
}
```

### Zustand Store

```typescript
const {
  tasks,           // Task[] (cả bảng 1 và 2)
  monthlyData,     // { achievements, difficulties, proposals, priorities, rating }
  initTasks,       addTask,          addOldTask,
  updateTaskField, updateMonthlyField,
  removeTask,      getTotalScore,    resetStore,
} = useKpiStore();

// Phân loại tasks:
const oldTasks = tasks.filter(t => t.isNhiemVuCu);   // → Bảng 1
const newTasks = tasks.filter(t => !t.isNhiemVuCu);  // → Bảng 2
```

### Draft localStorage

```typescript
const DRAFT_KEY = `monthly_draft_${token}`;
// Auto-save mỗi 30 giây
// Hỏi khôi phục khi load trang (TH10 hoặc TH12)
```

---

## 16. Spacing & Padding Chuẩn

| Element | Value |
|---|---|
| Page wrapper | `padding: 0 16px 120px` |
| Sticky header | `padding: 16px; margin: 0 -16px 32px` |
| Info row gap | `gap: 20px; margin-bottom: 32px` |
| Info table cell | `padding: 8px 16px` |
| blocks-inner gap | `gap: 32px` |
| Section banner | `padding: 12px 16px` |
| KPI table `<th>` | `padding: 10px 8px` |
| KPI table `<td>` | `padding: 4px` |
| cell-ro / cell-stt | `padding: 8px` |
| Add row TD | `padding: 10px` |
| Summary row label | `padding: 8px 12px` |
| Achieve body | `padding: 16px; gap: 16px` |
| Achieve field label | `margin-bottom: 6px` |
| Rating body | `padding: 20px; gap: 24px` |
| Bottom bar | `padding: 16px 24px` |

---

## 17. Responsive Breakpoints

**Breakpoint duy nhất: `640px`**

| Element | < 640px | ≥ 640px |
|---|---|---|
| Header h1 | `26px` | `30px` |
| Badge | `12px` | `14px` |
| Bottom bar gap | `16px` | `32px` |
| Score "Đạt" | `14px` | `18px` |
| Score % | `28px` | `32px` |
| Nút Submit font | `14px; padding: 12px 24px` | `18px; padding: 12px 56px` |
| Achieve body grid | `grid-cols-1` | `grid-cols-2` |
| Bảng KPI | scroll ngang (min-width: 1280px trong blocks-inner) | scroll ngang |

---

## 18. Edge Cases quan trọng

| Case | Xử lý |
|---|---|
| `keHoach = 0` | Không tính %, hiện `—` (cell-dash) |
| `thucHien > keHoach` | Hợp lệ, % > 100%, hiện bình thường |
| `% > 999%` | Cap hiển thị tại `999%` |
| `trongSo chưa chọn` | `datDuoc = 0`, hiện `—`, không tính vào summary |
| Xóa hết dòng Bảng 1 | Nộp bị chặn (validate loại ① sẽ fail) |
| Xóa hết dòng Bảng 2 | Nộp bị chặn (validate loại ②) |
| Rating = 0 | Không hợp lệ, default là 4 khi load |
| Nộp lại (`submittedAt != null`) | Hiện Modal TH11 xác nhận |
| Số âm | `input min="0"`, coi như null, hiện `—` |
| `100.0%` | Bỏ `.0` → hiện `100%` |
| `3.00` điểm | Bỏ trailing zeros → hiện `3` |
| Renumber STT khi xóa | Tự động cập nhật STT sau khi removeRow |
| Draft key | `monthly_draft_${token}` (khác với weekly) |
| Nộp lần đầu (Bảng 1 trống) | Hiện TH2 + ft-banner + bảng trống có placeholder |

---

*Tài liệu v3.0 — Trích xuất 100% từ `mockup/monthly-mockup.html` (1579 dòng). Cập nhật ngày 15/04/2026.*
