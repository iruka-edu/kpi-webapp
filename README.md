# Hướng Dẫn Triển Khai KPI WebApp (Dành Cho Hệ Thống IruKa)

Chào sếp, hệ thống KPI tự động đã sẵn sàng. Dưới đây là cách đưa nó lên Internet để nhân viên bấm vào link là dùng được ngay.

## Bước 1: Khai Báo Biến Môi Trường (.env)

Vào file `.env.example`, copy mọi thứ và tạo file `.env.local` ở máy tính:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Lấy bê nguyên si từ bên Discord Bot sang.
- `GOOGLE_PRIVATE_KEY`: Bê nguyên đoạn khóa "-----BEGIN PRIVATE KEY-----...".
- `GOOGLE_KPI_SHEET_ID`: Lấy cái ID từ thanh địa chỉ Google Sheets (Dạng `1_xXxXx...`).

## Bước 2: Deploy Lật Cánh Sang Vercel

WebApp này được viết theo chuẩn Next.js 15 nên đẩy lên Vercel là mượt nhất thế giới:

1. Đăng nhập [Vercel](https://vercel.com).
2. Tạo Project mới, chọn Import đường dẫn repo Github chứa thư mục `kpi-webapp`.
3. Trong phần **Environment Variables**, hãy Paste 3 biến Môi trường ở Bước 1 vào (cực kỳ quan trọng, nếu không Vercel sẽ văng lỗi Google).
4. Nhấn **Deploy**. Thế là xong! Có ngay con link `https://...` cực đẹp.

## Bước 3: Chỉ Định Lại Cho Bot Discord

Vào thư mục Bot: Mở `.env` của thư mục `discord-bot`, gõ lệnh bổ sung:

```env
KPI_WEBAPP_URL=https://kpi-cua-ban.vercel.app
```

(Thay bằng cái link Vercel thực tế).

## Lưu ý Google Sheets Database

Anh hãy tạo Sheet (Trang tính) tên là `Data`. Có chuẩn các cột từ A -> L ở dòng 1:

- Cột A: ID
- Cột B: Timestamp
- Cột C: Tên Nhân Viên
- Cột D: Tuần lập
- Cột E: Nội dung CV
- Cột F: Ghi chú
- Cột G: Đơn vị
- Cột H: Kế hoạch
- Cột I: Trọng số
- Cột J: Yêu cầu
- Cột K: Thực hiện
- Cột L: Trạng thái
  *(Hoặc dùng tool Auto Setup)....*
-
