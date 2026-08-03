# Khảo sát potato.clothing & Thiết kế Database

> Khảo sát ngày 14/07/2026 — làm căn cứ xây backend + admin cho theuni.vn.
> Mục tiêu: quản lý được 100% nội dung của từng loại màn.

## 1. Bản đồ toàn site (12 loại màn)

| # | Loại màn | URL mẫu | Thành phần cần quản lý |
|---|----------|---------|------------------------|
| 1 | **Trang chủ** | `/` | Slider (9 ảnh desktop + 9 mobile, link), Banner grid (4 ô + 1 dọc + nút), Section "Sản xuất đồng phục" (2 banner dọc + 2 banner ngang), "Sản phẩm nổi bật" (23 vòng tròn loại sản phẩm + link bài viết), Logo khách hàng (10), Phản hồi khách hàng (10: ảnh + tên + quote + link), Bài viết nổi bật, Form tư vấn |
| 2 | **Danh mục sản phẩm** | `/ao-lop`, `/ao-nhom`, `/ao-cong-ty`, `/ao-the-thao`, `/thiet-ke`, `/phu-kien-1` | Tiêu đề, lưới sản phẩm 18/trang + phân trang, sidebar lọc theo tag |
| 3 | **BST (landing)** | `/bst-potato`, `/bst-ao-lop`, `/bst-ao-doanh-nghiep`, `/bst-ao-the-thao` | Cấu trúc giống danh mục — thực chất là danh mục kiểu "bộ sưu tập" |
| 4 | **Chi tiết sản phẩm** | `/ao-lop-so-mi-11e1-le-thanh-tong` | Gallery nhiều ảnh, tên, bảng thông số (Chất liệu / Màu vải / Loại sản phẩm), mô tả RTE, nút Nhận tư vấn, widget đánh giá |
| 5 | **Chuyên mục bài viết** | `/tin-tuc`, `/thong-tin`, `/cam-nang`, `/the-thao`, `/dong-phuc`, `/tin-tuc-ao-lop`, `/tin-tuc-ao-doanh-nghiep` | Tabs chuyên mục, lưới bài 20/trang + phân trang |
| 6 | **Chi tiết bài viết** | `/tong-hop-cac-mau-ao-lop-so-mi...` | Breadcrumb, tiêu đề, tác giả + ngày đăng, mục lục (TOC tự sinh từ H2), body RTE, slider "Nội dung liên quan" |
| 7 | **Bài viết đặc biệt (widget)** | `/bang-gia-ao-lop`, `/asdasd` (bảng giá đồng phục), `/bang-size-san-pham`, `/bang-mau-vai`, `/quy-uoc-kich-thuoc-in` | Là bài viết nhưng body chứa widget HTML/JS riêng (tab bảng giá + lightbox, bảng size, bảng màu). Quản lý như bài viết với body HTML tự do |
| 8 | **FAQ** | `/cau-hoi-thuong-gap` | 5 nhóm (Đặt hàng / Giao hàng / Bảo hành / Thanh toán / Thiết kế), mỗi nhóm nhiều câu Q-A accordion |
| 9 | **Liên hệ** | `/lien-he` | Thông tin công ty (địa chỉ, email, hotline, MST, STK), form (tên/email/điện thoại/nội dung), bản đồ nhúng |
| 10 | **Chính sách** | `/chinh-sach-doi-tra`, `/chinh-sach-bao-mat`, `/dieu-khoan-su-dung` | Trang RTE đơn giản: tiêu đề + nội dung |
| 11 | **Tìm kiếm** | `/search?query=...` | Lưới sản phẩm kết quả + phân trang (server search theo tên) |
| 12 | **Khối toàn site** | mọi trang | Header menu (menu + submenu 2 cấp), Footer (thông tin + bản đồ + social + 2 khối fanpage), nút nổi (Messenger/Zalo/Hotline), Form "Nhận tư vấn miễn phí" cuối mọi trang |

## 2. Taxonomy bộ lọc sản phẩm (sidebar)

Khảo sát thực tế filter của potato dùng **tag 3 nhóm + loại sản phẩm**:

| Nhóm lọc | Kiểu | Số giá trị | Ví dụ |
|---|---|---|---|
| PHÂN LOẠI | tag (nhóm `tag2`) | 21 | Áo lớp, Áo công ty, Áo nhóm, Phụ kiện, Loang, Đen... |
| LOẠI SẢN PHẨM | product_type | 14 | Áo thun, Áo polo, Sơ mi, Bóng chày... |
| KIỂU THIẾT KẾ | tag (nhóm `tag3`) | 10 | CLB/Doanh nghiệp, Đơn giản, Môn học, Slogan, Động vật, Hoạt hình/Chibi... |
| MÀU SẮC | tag + mã hex | 16 | Đen #000000, Xám #808080, Trắng #FFFFFF, Hồng #FF99CC, Đỏ #EE0000... |

→ Thiết kế bảng `tags` có trường `group` + `hex_color`, sản phẩm gắn tag qua pivot.

## 3. Schema MySQL đề xuất

```sql
-- ==== SẢN PHẨM ====
CREATE TABLE categories (            -- danh mục & BST (màn #2, #3)
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  kind ENUM('collection','bst') DEFAULT 'collection',
  description TEXT NULL,
  banner_image VARCHAR(500) NULL,
  position INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  seo_title VARCHAR(255) NULL, seo_description VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE product_types (         -- "Sản phẩm nổi bật" trang chủ + filter Loại SP
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  image VARCHAR(500) NULL,           -- ảnh vòng tròn trang chủ
  article_slug VARCHAR(255) NULL,    -- link "Bài viết chi tiết"
  show_on_home TINYINT(1) DEFAULT 0,
  position INT DEFAULT 0
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  product_type_id INT NULL,
  material VARCHAR(255) NULL,        -- Chất liệu (vd: Vải mango)
  print_method VARCHAR(255) NULL,    -- Màu vải / in (vd: Ép nhiệt)
  form VARCHAR(255) NULL,            -- Form áo (vd: Sơ mi cổ vest)
  code VARCHAR(50) NULL,             -- mã SP (vd: 25303)
  description MEDIUMTEXT NULL,       -- RTE html
  status ENUM('draft','active','hidden') DEFAULT 'active',
  position INT DEFAULT 0,
  view_count INT DEFAULT 0,
  seo_title VARCHAR(255) NULL, seo_description VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_type_id) REFERENCES product_types(id)
);

CREATE TABLE product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  position INT DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE category_product (      -- 1 SP nằm nhiều danh mục/BST
  category_id INT NOT NULL, product_id INT NOT NULL,
  position INT DEFAULT 0,
  PRIMARY KEY (category_id, product_id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE tags (                  -- 3 nhóm lọc
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  `group` ENUM('phan_loai','kieu_thiet_ke','mau_sac') NOT NULL,
  hex_color CHAR(7) NULL,            -- chỉ nhóm màu sắc
  position INT DEFAULT 0,
  UNIQUE KEY uq_tag (slug, `group`)
);

CREATE TABLE product_tag (
  product_id INT NOT NULL, tag_id INT NOT NULL,
  PRIMARY KEY (product_id, tag_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- ==== BÀI VIẾT ====
CREATE TABLE article_categories (    -- Thông tin, Áo Lớp, Áo DN, Cẩm nang, Tin tức, Thể thao...
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  position INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1
);

CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  article_category_id INT NULL,
  thumbnail VARCHAR(500) NULL,
  excerpt VARCHAR(1000) NULL,
  body MEDIUMTEXT NULL,              -- RTE html; bài đặc biệt chứa widget (bảng giá, size, màu vải)
  author VARCHAR(100) NULL,
  is_featured TINYINT(1) DEFAULT 0,  -- hiện ở "Bài viết nổi bật" trang chủ
  status ENUM('draft','published') DEFAULT 'draft',
  published_at DATETIME NULL,
  view_count INT DEFAULT 0,
  seo_title VARCHAR(255) NULL, seo_description VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (article_category_id) REFERENCES article_categories(id)
);
-- "Nội dung liên quan": lấy cùng article_category, không cần bảng riêng

-- ==== FAQ ====
CREATE TABLE faq_categories (        -- Đặt hàng, Giao hàng, Bảo hành, Thanh toán, Thiết kế
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position INT DEFAULT 0
);
CREATE TABLE faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faq_category_id INT NOT NULL,
  question VARCHAR(500) NOT NULL,
  answer MEDIUMTEXT NOT NULL,        -- RTE html
  position INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (faq_category_id) REFERENCES faq_categories(id) ON DELETE CASCADE
);

-- ==== TRANG & GIAO DIỆN ====
CREATE TABLE pages (                 -- chính sách, điều khoản, trang RTE tự do
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  body MEDIUMTEXT NULL,
  status ENUM('draft','published') DEFAULT 'published',
  seo_title VARCHAR(255) NULL, seo_description VARCHAR(500) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE menus (                 -- menu + submenu (2 cấp, mở rộng được n cấp)
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  parent_id INT NULL,
  location ENUM('header','footer') DEFAULT 'header',
  position INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE CASCADE
);

CREATE TABLE sliders (               -- slider trang chủ
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NULL,
  image_desktop VARCHAR(500) NOT NULL,  -- 1903x580
  image_mobile VARCHAR(500) NULL,       -- ~570x700
  link VARCHAR(500) NULL,
  position INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1
);

CREATE TABLE banners (               -- banner grid + section sản xuất đồng phục
  id INT AUTO_INCREMENT PRIMARY KEY,
  slot VARCHAR(50) NOT NULL,         -- home_grid_1..4, home_side, sxdp_side_1.., sxdp_wide_1..
  image VARCHAR(500) NOT NULL,
  link VARCHAR(500) NULL,
  button_text VARCHAR(100) NULL,
  position INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1
);

CREATE TABLE brand_logos (           -- "Khách hàng"
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NULL,
  image VARCHAR(500) NOT NULL,
  link VARCHAR(500) NULL,
  position INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1
);

CREATE TABLE testimonials (          -- "Phản hồi của khách hàng"
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,       -- vd: CLB Marketing Challengers – RMIT
  image VARCHAR(500) NOT NULL,
  quote TEXT NOT NULL,
  link VARCHAR(500) NULL,
  position INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1
);

CREATE TABLE settings (              -- key-value: công ty, hotline, email, social, map, script
  `key` VARCHAR(100) PRIMARY KEY,    -- company_name, address, hotline, email, mst, bank_account,
  value TEXT NULL                    -- facebook_url, instagram_url, zalo_phone, messenger_url,
);                                   -- map_embed_url, head_scripts...

-- ==== LEADS (đơn tư vấn) ====
CREATE TABLE leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NULL,
  unit VARCHAR(255) NULL,            -- lớp / trường / công ty
  product VARCHAR(255) NULL,         -- sản phẩm quan tâm
  message TEXT NULL,
  source_url VARCHAR(500) NULL,      -- trang gửi form
  status ENUM('new','contacted','quoted','won','lost') DEFAULT 'new',
  note TEXT NULL,                    -- ghi chú nội bộ của admin
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status), INDEX idx_created (created_at)
);

-- ==== HỆ THỐNG ====
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','editor') DEFAULT 'editor',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE media (                 -- thư viện ảnh dùng chung (upload 1 lần, gắn nhiều nơi)
  id INT AUTO_INCREMENT PRIMARY KEY,
  path VARCHAR(500) NOT NULL,
  alt VARCHAR(255) NULL,
  size INT NULL, width INT NULL, height INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 4. Sidebar admin ↔ bảng dữ liệu

```
📥 Đơn tư vấn        → leads (lọc theo status, ghi chú, đổi trạng thái)
📦 Sản phẩm
   ├─ Tất cả sản phẩm → products (+images, tags, categories)
   ├─ Danh mục / BST  → categories
   ├─ Loại sản phẩm   → product_types (kèm ảnh vòng tròn trang chủ)
   └─ Thẻ lọc & màu   → tags
📰 Bài viết
   ├─ Danh sách bài   → articles (featured = hiện trang chủ)
   └─ Chuyên mục      → article_categories
❓ FAQ                → faq_categories + faqs
📄 Trang
   ├─ Trang chủ       → sliders + banners + (chọn testimonials/brand_logos)
   ├─ Trang tĩnh      → pages (chính sách, điều khoản...)
   └─ Bài đặc biệt    → articles (bảng giá / size / màu vải)
🧩 Giao diện
   ├─ Menu điều hướng → menus (kéo thả 2 cấp)
   ├─ Khách hàng      → brand_logos
   ├─ Phản hồi KH     → testimonials
   └─ Thông tin chung → settings (footer, social, map, hotline)
👤 Người dùng         → users
```

## 5. Ghi chú triển khai

- **View đổ dữ liệu**: các trang Next.js fetch API server-side + `revalidate` 60–300s (ISR) → admin sửa là web tự cập nhật, không cần build lại, tốc độ vẫn như tĩnh.
- **Form tư vấn** post về `POST /api/leads` — ưu tiên làm đầu tiên (thay alert demo hiện tại), có thể bắn notify qua Telegram/Zalo/email.
- **Ảnh**: upload về `/var/www/theuniv/uploads` (hoặc S3-compatible), bảng `media` quản lý tập trung.
- **Thứ tự làm**: Leads → Products/Categories/Tags → Articles/FAQ → Trang chủ (sliders/banners/testimonials/brands) → Menus/Settings → Pages.
- Backend đặt tại `/var/www/theuniv/backend`, nginx thêm `location /api` + `location /uploads` trỏ vào — không đụng cấu hình site khác.
```
