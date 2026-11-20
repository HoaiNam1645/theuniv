# THE UNI — Website Clone

Website clone giao diện [THEUNI.clothing](https://THEUNI.clothing) (Sapo theme) bằng **Next.js 16 App Router**, giống bản gốc từng pixel: nền đen texture `#1E1E1E`, màu chủ đạo vàng `#f4bd24`, font Montserrat/Roboto (self-host), footer vàng, nút liên hệ nổi (Messenger/Zalo/Hotline).

## Chạy dự án

Cần **Node.js >= 20.9** (Next.js 16 không chạy trên Node 18). Khuyên dùng Node 24, ví dụ `nvm use 24`.

> Máy dev nên trỏ `DATABASE_URL` vào database `theuniv_dev`, KHÔNG phải `theuniv` (production).
> Không chạy `npm run seed` trên database đã có dữ liệu thật: seed ghi đè dữ liệu mẫu lên nội dung hiện có.

```bash
npm install
cp .env.example .env          # rồi điền DATABASE_URL (MongoDB Atlas) + AUTH_SECRET
npm run db:push               # đồng bộ schema + index lên Atlas
npm run seed                  # dữ liệu mẫu (SEED_ADMIN_PASSWORD=... để đặt mật khẩu admin)
npm run dev                   # http://localhost:4392
# hoặc production:
npm run build && npm run start
```

## Database — MongoDB Atlas qua Prisma

Dùng **`prisma db push`**, KHÔNG dùng `prisma migrate`: connector MongoDB không có migration
(Mongo không có schema nội bộ), `db push` chỉ đồng bộ index/unique. Không có thư mục
`prisma/migrations` và cũng không nên tạo.

| Lệnh | Việc |
|---|---|
| `npm run db:push` | Đẩy `prisma/schema.prisma` lên Atlas (tạo/xoá index & unique) |
| `npm run db:generate` | Sinh lại Prisma Client sau khi sửa schema |
| `npm run seed` | Nạp dữ liệu mẫu — idempotent, upsert theo `slug`/`key` |

Quên mật khẩu admin thì đặt lại bằng chính seed (đây là cách duy nhất, vì không có màn hình
đổi mật khẩu). Không truyền biến thì mật khẩu cũ được giữ nguyên:

```bash
SEED_ADMIN_PASSWORD='mat-khau-moi' npm run seed
# đăng nhập: admin@theuni.vn
```

Khác biệt so với MySQL cần nhớ khi viết query (đã gói sẵn trong `lib/mongo.ts`):

- **Id là chuỗi ObjectId 24 hex**, không phải số. Đọc id từ form bằng `oid()`, kiểm tra id lấy
  từ URL bằng `isObjectId()` trước khi query (không thì lỗi P2023 thành 500 thay vì 404).
- **`contains` phân biệt hoa/thường** (MySQL dùng collation `_ci` nên không). Dùng `like()` —
  hàm này vừa bật `mode: "insensitive"` vừa escape ký tự regex, thiếu escape thì khách gõ `(`
  vào ô tìm kiếm là vỡ query.
- **Mongo phân biệt `field = null` với `field không tồn tại`.** Lọc menu cấp 1 phải dùng
  `NO_PARENT` để bắt cả hai dạng.
- **Không cascade được trên self-relation** (`Menu.parent`): xoá menu cha phải xoá mục con
  trước, nếu không Prisma báo P2014.
- **Không có khoá chính ghép**: `CategoryProduct` / `ProductTag` dùng `id` thay thế +
  `@@unique` để giữ nguyên ràng buộc.

## Các trang

| Route | Nội dung |
|---|---|
| `/` | Trang chủ: slider, banner grid, sản xuất đồng phục, sản phẩm nổi bật, khách hàng, phản hồi, bài viết, form tư vấn |
| `/ao-lop`, `/ao-nhom`, `/ao-cong-ty`, `/ao-the-thao`, `/thiet-ke` | Danh mục sản phẩm (sidebar lọc + lưới sản phẩm) |
| `/bang-gia-ao-lop` | Bảng giá (widget tab + lightbox nguyên bản) |
| `/bang-mau-vai` | Bảng màu vải |
| `/tin-tuc`, `/cam-nang` | Tin tức / Cẩm nang |
| `/lien-he` | Liên hệ (form + bản đồ) |
| `/<slug-sản-phẩm>` | Trang chi tiết sản phẩm (template tự sinh từ dữ liệu danh mục) |
| Slug khác | Trang "Nội dung đang cập nhật" |

## Cấu trúc

- `public/css/` — CSS **nguyên bản** của theme (đã trỏ asset về local). Link thẳng trong `<head>`, không qua bundler để giữ 100% cascade gốc. `custom.css` là phần bổ sung nhỏ (toggle menu mobile, nowrap logo).
- `public/theme/` — toàn bộ assets theme (logo, slider, banner, icon, `swiper.js`...).
- `public/fonts/` + `public/css/fonts.css` — Montserrat & Roboto self-host (woff2).
- `data/pages/*.json` — HTML nội dung chính từng trang (đã làm sạch: link nội bộ, ảnh https, bỏ script jQuery).
- `data/collections.json`, `data/news.json`, `data/nav.json`... — dữ liệu có cấu trúc (sản phẩm, bài viết, menu) dùng cho trang chi tiết sản phẩm và metadata.
- `components/RawPage.tsx` — render HTML gốc + kích hoạt lại script inline (widget bảng giá).
- `components/HomeSwipers.tsx` — khởi tạo 5 slider trang chủ với đúng cấu hình Swiper 6.6.2 của bản gốc.
- `components/ThemeJS.tsx` — tương tác thay cho jQuery: menu mobile, backtop, chặn submit form demo.

## Ghi chú

- Ảnh sản phẩm/bài viết đang **hotlink** từ CDN `bizweb.dktcdn.net`; assets theme đã tải về local. Khi làm site thật, thay ảnh trong `data/` và `public/theme/`.
- Form tư vấn/giỏ hàng là demo (chưa có backend) — sửa trong `components/ThemeJS.tsx`.
- Nội dung lấy snapshot ngày 10/07/2026.
