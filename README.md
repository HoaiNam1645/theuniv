# THE UNI — Website Clone

Website clone giao diện [THEUNI.clothing](https://THEUNI.clothing) (Sapo theme) bằng **Next.js 16 App Router**, giống bản gốc từng pixel: nền đen texture `#1E1E1E`, màu chủ đạo vàng `#f4bd24`, font Montserrat/Roboto (self-host), footer vàng, nút liên hệ nổi (Messenger/Zalo/Hotline).

## Chạy dự án

```bash
npm install
npm run dev        # http://localhost:3000
# hoặc production:
npm run build && npm run start
```

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
