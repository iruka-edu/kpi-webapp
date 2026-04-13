# Cấu trúc thư mục dự án `kpi-webapp`

Dự án này được xây dựng bằng **Next.js 16 (App Router)** cùng với **React 19**, **TailwindCSS v4**, và **Zustand** để quản lý state. Nó trực tiếp tích hợp thư viện `googleapis` để thao tác trực tiếp với hệ thống Google Sheets. 

Dưới đây là một bản phân tích chi tiết toàn bộ kiến trúc về luồng và cách chia file của dự án để dễ dàng theo dõi.

## 📁 Sơ đồ tổng quan toàn bộ Mã Nguồn

```text
kpi-webapp/
├── 📁 docs/                   # Chứa các tài liệu, kế hoạch, nhận xét kiểm duyệt hệ thống (BẠN ĐANG Ở ĐÂY)
├── 📁 public/                 # Các tài nguyên tĩnh công khai (logo, icon, hình ảnh SVG...)
├── 📁 src/                    # Chứa TOÀN BỘ mã nguồn logic và hiển thị của ứng dụng
│   ├── 📁 app/                # Hệ thống điều hướng (Routing) cho các Trang và API dựa trên Next.js App Router
│   ├── 📁 components/         # Các thành phần giao diện (UI components) nhỏ lẻ, độc lập, tái sử dụng
│   ├── 📁 hooks/              # Custom React Hooks - xử lý logic ngầm vòng đời của Component
│   ├── 📁 lib/                # Cấu hình, logic kết nối các dịch vụ Core, Database, API bên thứ ba
│   └── 📁 store/              # Quản lý trạng thái toàn cục (Global State Management) của Frontend
├── Các file cấu hình hệ thống tĩnh (.env, package.json, cấu hình build...)
```

---

## 🔎 Chi tiết từng thư mục & Chức năng

### 1. Thư mục `src/app/` (Hệ thống Routing & API Backend Node.js)
Trong Next.js App Router, thư mục `app` là xương sống. Nó vừa định nghĩa các trang màn hình web (Frontend), vừa đóng vai trò làm API xử lý yêu cầu (Backend Server).

*   **Tâm điểm giao diện:**
    *   **`layout.tsx`**: Khung sườn bao bọc chung cho các ứng dụng (có thể chứa Menu Sidebar, Header chung...).
    *   **`page.tsx`**: Trang đích ngoài cùng (Landing Page hoặc LoginForm định hướng chuyển vào trong).
    *   **`globals.css`**: Nơi gộp các core setup của TailwindCSS v4.
    *   **`favicon.ico`**: Biểu tượng trên Tab trình duyệt.

*   **Các trang Màn hình (Frontend Pages):**
    *   **`dashboard/page.tsx`**: Trang chính "Bảng điều khiển". Màn hình nơi nhân sự điền, xem báo cáo KPI.
    *   **`result/page.tsx`**: Trang hiển thị "Kết quả". Có thể màn hình cảm ơn tải/xác nhận thành công KPI hoặc báo cáo thống kê KPI hoàn thành.

*   **Hệ thống API Server (`api/`)** (Backend Route): Next xử lý nó như một luồng node.js.
    *   **`api/kpi/route.ts`**: API điểm cuối xử lý các lệnh Submit/Đọc báo cáo chỉ số cá nhân.
    *   **`api/kpi/status/route.ts`**: API kiểm tra Trạng thái (hôm nay đã báo cáo chưa, đang chờ cập nhật...).
    *   **`api/dashboard/route.ts`**: API lấy dữ liệu thô phục vụ kết xuất lên giao diện Bảng điều khiển.
    *   **`api/dashboard/auth/route.ts`**: Khâu xử lý hoặc kiểm soát xác thực định danh và quyền.
    *   **`api/result/route.ts`**: API trả về điểm tổng kết, kết quả được xuất.

### 2. Thư mục `src/components/` (UI Components)
Giao diện được băm nhỏ thành những mảnh ghép để code dễ chỉnh và tránh một file bị quá khổ.
*   **`HeaderInfo.tsx`**: Khối bộ phận hiển thị thông tin Header (có thể bao gồm Lời chào, Tên cá nhân, Mã phòng ban).
*   **`ReportGrid.tsx`**: Bảng dữ liệu chính "Grid". Đặc thù là bảng thông tin lưới các KPI chi tiết. Có khả năng đảm nhận render khung để nhân viên gõ con số hoặc liệt kê con số chi tiết.

### 3. Thư mục `src/hooks/` (Logic Hook React)
*   **`useDraftSave.ts`**: Custom Hook rất quan trọng về UX. Cho phép chức năng **Tự động lưu nháp** dữ liệu khi nhập liệu dở dang hoặc bị đóng trình duyệt bất ngờ. Rất cần thiết đối với 1 bảng báo cáo nhiều trường.

### 4. Thư mục `src/lib/` (Thư viện tiện ích - Logic Server)
*   **`googleSheets.ts`**: Core Engine. Nơi đặt code config sử dụng chứng chỉ phân quyền API với Google và đảm đương phần lớn mọi thao tác read/write đẩy thẳng dữ kiện mảng từ `Route API` lên bảng tính Google Sheets.

### 5. Thư mục `src/store/` (Quản lý trạng thái thông minh Store Client)
*   **`kpiStore.ts`**: Nơi khởi tạo cấu hình `Zustand`. Giữ toàn cục (Global) các ô dữ liệu KPI đang được điền (Draft State, Current Metrics...). Component nào cần hiển thị tiến độ hoặc số liệu thì Subscribe Store này thay vì cõng thông tin loạn từ trên Layout xuống.

### 6. Thư mục `public/` (Tài sản tĩnh)
Kho lưu trữ ảnh, hiện tại gồm các file Vector SVG cơ bản chuẩn mặc định: `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`.

### 7. Thư mục cấu hình (Gốc) & Các tập tin tài liệu 
*   **Cấu hình NPM:**
    *   `package.json` và `package-lock.json`: Quét thấy được hệ phần mềm ngoài đang cài bao gồm **lucide-react** (thư viện icon), **clsx/tailwind-merge** (tiện ích hợp nhất string class cho tailwind) và nền tảng chính **googleapis**, **zustand**, **tailwindcss**.
*   **Cấu hình Hệ thống (Build, Linting):** 
    *   `next.config.ts`: Set các Rule Build Next.
    *   `tsconfig.json` & `next-env.d.ts`: Giúp Typings TypeScript chạy chuẩn.
    *   `eslint.config.mjs` & `postcss.config.mjs`: Quy tắc dọn code (Linting) và chuẩn bị xử lý CSS cho UI.
*   **Chìa khóa & Biến mật:** 
    *   `.env.local`, `.env.example`: Tuyến đầu lưu trữ mã khóa bí mật, có thể là Google Service Account Token.
*   **Tài liệu (bạn đang thao tác trong `docs`):**
    *   Các file `.resolved` là các biên bản báo cáo kế toán/audit cũ như `Ke hoach lap webapp`, `audit frontend`, `audit_kpi_system.md`. Phục dựng lại các bước quá khứ.
    *   Các file `AGENTS.md`, `CLAUDE.md`, `README.md` phục vụ việc giới thiệu, đưa chỉ dẫn vận hành cho kỹ thuật viên và AI.
