# Kế hoạch refactor-web, phần 1: tổng thể

Nhánh: `refactor-web` (tách từ `main` @ `95cc5b5`).
Mục tiêu: đổi THE UNI từ giao diện "shop bán lẻ" (nền tối, vàng) sang **web xưởng sản xuất đồng phục**: nền sáng, xanh rừng, phẳng.
Tham khảo bố cục: sayhappy.vn. Tham khảo font: aothunthongdiep.com.

---

## 0. Hiện trạng ảnh hưởng tới cách làm

- **Menu, slider, banner và chữ trang chủ là dữ liệu trong DB** (admin sửa được), không nằm trong code. Đổi menu hay chuyển banner nghĩa là đổi dữ liệu.
- **DB production dùng chung.** Sửa dữ liệu trên `theuniv` thì web thật đổi ngay, dù code mới chưa deploy.
  → Mọi thay đổi dữ liệu gom vào **một script** (`scripts/refactor-web-data.mjs`, chạy lại nhiều lần không hỏng, không xoá gì).
  → **Đã chạy trên cả `theuniv_dev` và `theuniv` ngày 20/11/2026.** Web chưa có khách nên ông anh đồng ý sửa thẳng production. Sao lưu trước khi chạy: `backups/db/prod-theuniv-before-refactor-web-20261120-112120.json`.
- **Ảnh upload nằm trên ổ đĩa VPS, mình không có quyền vào.**
  → Ảnh mới được nén rồi commit vào `public/brand/`, deploy là có trên web. File gốc không đưa vào git.
- Giao diện hiện tại gồm 2 lớp:
  - CSS gốc của theme Sapo (`public/css/*.scss.css`, nền tối có texture, màu vàng `#f4bd24`).
  - Lớp bố cục mới phía trên (`site-layout.css`, `page-*.css`).
  → Đổi màu ở lớp bố cục bằng biến CSS, rồi ghi đè phần còn sót của theme gốc.

---

## 1. Bộ màu

Theo "Bảng màu thương hiệu THE UNI đề xuất". Khai một lần trong `:root` của `site-layout.css`, mọi trang dùng chung.

| Biến | Màu | Dùng cho |
|---|---|---|
| `--c-primary` | `#004732` Forest Green | Màu chủ đạo: top bar, nút chính, tiêu đề, nền footer |
| `--c-primary-dark` | `#00382A` | Màu nút chính khi rê chuột |
| `--c-bg` | `#FFFFFF` | Nền trang |
| `--c-sage` | `#D9E5DF` Sage Green | Nền section xen kẽ, nền ô, viền nhấn |
| `--c-gold` | `#C5A46D` Champagne Gold | Điểm nhấn: gạch chân tiêu đề, nhãn nhỏ, icon, số thứ tự |
| `--c-ink` | `#16231D` | Chữ nội dung (đen ngả xanh, không dùng đen tuyền) |
| `--c-muted` | `#55635C` | Chữ phụ |
| `--c-line` | `#D3DED8` | Viền 1px |

Tỉ lệ tương phản đã tính, đều đạt chuẩn đọc được:
- Xanh trên trắng: 10.8:1.
- Xanh trên sage: 8.3:1.
- Vàng trên xanh: 4.6:1.
- **Riêng vàng trên trắng chỉ 2.4:1**, nên không dùng vàng cho chữ thường trên nền trắng. Vàng chỉ dùng cho đường kẻ, icon, chữ to, hoặc chữ đặt trên nền xanh.

## 2. Phong cách phẳng (kiểu Flatsome)

- Không dùng: `box-shadow`, gradient, blur hay kính mờ, viền phát sáng.
- Bo góc 0–4px. Viền 1px `--c-line`. Khối màu đặc.
- Hover chỉ đổi màu nền, màu viền hoặc gạch chân. Không nảy, không phóng to, không bóng đổ.
- Chữ đậm, rõ. Nhãn nhỏ viết hoa, giãn chữ.
- Icon nét mảnh, cùng kiểu với icon trong banner mới.
- Ảnh vuông góc, không viền bóng.

## 3. Font

> **Đã chốt: dùng Helvetica Neue** (lấy từ aothunthongdiep.com, đã lọc còn Latin + tiếng Việt, ~14 KB mỗi cỡ chữ, ở `public/fonts/helvetica-neue-*.woff2`). Ông anh sẽ liên hệ chủ font để mua bản quyền.

- aothunthongdiep.com dùng **Helvetica Neue**. Đây là font thương mại (bản quyền Linotype/Monotype). Trang đó tự nhúng file font; mình chép file về dùng là vi phạm bản quyền.
- **Đề xuất: Inter Tight.**
  - Miễn phí (giấy phép OFL), có đủ dấu tiếng Việt.
  - Dáng gần Helvetica Neue nhất. Chính trang kia cũng nạp sẵn Inter Tight.
  - Tự host file woff2 như các font hiện có trong `public/fonts`.
  - Thứ tự font: `"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif`.
- Phương án khác:
  - **Be Vietnam Pro**: thiết kế riêng cho tiếng Việt, dấu đẹp hơn, nhưng dáng tròn hơn Helvetica.
  - **Mua license Helvetica Neue bản web.**

## 4. Thanh trên cùng (top bar)

- Nội dung: **"Đặt hàng liên hệ zalo: 0399.259.155 / Địa chỉ xưởng: K249/83/4 Hà Huy Tập - Thanh Khê - Đà Nẵng"**.
- Nền `--c-primary`, chữ trắng, cao khoảng 36px.
- Số Zalo bấm được, mở `zalo.me/0399259155`. Địa chỉ bấm được, mở Google Maps.
- Trên điện thoại xuống 2 dòng ngắn: dòng Zalo, rồi dòng địa chỉ.
- Câu chữ lưu trong settings, sửa ở Admin → Giao diện → Header. Giá trị mặc định là đúng câu trên.

## 5. Header và menu

- Header nền trắng, viền dưới 1px, dính đầu trang khi cuộn.
- Logo bên trái, menu ở giữa, bên phải là ô tìm kiếm và nút **"Báo giá Zalo"** màu xanh đặc.
- **Menu "Đồng Phục": 4 mục đầu thay bằng 4 mục mới** (đúng như ảnh đính kèm):
  1. Đồng phục doanh nghiệp → `/dong-phuc-doanh-nghiep`
  2. Đồng phục áo lớp → `/dong-phuc-ao-lop`
  3. Đồng phục hàng quán ăn → `/dong-phuc-hang-quan-an`
  4. Đồng phục spa nail → `/dong-phuc-spa-nail`
- 5 mục bên dưới giữ nguyên: Bảng giá dịch vụ, Bảng size sản phẩm, Bảng màu vải, Các loại vải áo đồng phục, Quy ước kích thước in.
- "Phụ kiện" và "Bảng giá combo F&B" bị **tắt khỏi menu này, không xoá**. Trang vẫn còn và bật lại được.
- 4 trang mới là danh mục, dùng khuôn trang danh mục có sẵn: banner trên đầu, mô tả, lưới sản phẩm.
  - Doanh nghiệp: gắn sản phẩm của "Áo công ty".
  - Áo lớp: gắn sản phẩm của "Áo lớp".
  - Hàng quán ăn: thêm 3 sản phẩm từ bộ Vị Hương (polo cổ tàu, tạp dề dài, tạp dề ngắn).
  - Spa nail: chưa có ảnh.
- Lỗi phát hiện trong menu hiện tại, sửa luôn:
  - "Đồng phục doanh nghiệp" đang trỏ tới `/asdasd`, trang 404.
  - Mục cha "BST" trỏ tới `/bst-THEUNI`, cũng 404.

## 6. Trang chủ mới: web xưởng

Thứ tự tham khảo sayhappy.vn: banner → dải chữ → giới thiệu xưởng → năng lực → dịch vụ → quy trình → khách hàng.

| # | Section | Nội dung | Nguồn |
|---|---|---|---|
| 1 | Top bar | Zalo + địa chỉ xưởng | Mới (mục 4) |
| 2 | Header | Logo, menu, báo giá Zalo | Mới (mục 5) |
| 3 | Hero | Banner "Giải pháp quà tặng và đồng phục doanh nghiệp", tràn ngang. Slide 2 là banner "Xưởng sản xuất đồng phục" | Ảnh mới |
| 4 | Dải chữ nền xanh | XƯỞNG SẢN XUẤT ĐỒNG PHỤC · DOANH NGHIỆP · ÁO LỚP · HÀNG QUÁN ĂN · SPA NAIL | Mới |
| 5 | Giới thiệu xưởng + video | Trái: chữ giới thiệu, 3 cam kết (thiết kế miễn phí, sản xuất theo yêu cầu, đúng tiến độ), nút Zalo/Gọi. Phải: video TikTok khung dọc | Mới (mục 9) |
| 6 | Năng lực sản xuất | 6 ô: Đồng phục doanh nghiệp, Áo thun sự kiện, Đồng phục CLB - team, Mũ nón đồng phục, Quà tặng thương hiệu, In - thêu theo yêu cầu | Dựng lại bằng HTML từ banner mới |
| 7 | 4 lĩnh vực đồng phục | 4 ô ảnh lớn dẫn sang 4 trang con của menu Đồng phục | Ảnh có sẵn + ảnh mới |
| 8 | Phôi và bảng màu | Banner "Các mẫu phôi sản xuất" + nút "Xem bảng màu vải" | Ảnh mới |
| 9 | Từ maket đến thành phẩm | Dự án Vị Hương: 3 maket + 2 ảnh hàng thật | Ảnh mới |
| 10 | Quy trình đặt hàng | Tư vấn → Thiết kế maket miễn phí → Duyệt mẫu → Sản xuất → Giao hàng | Mới, chỉ chữ |
| 11 | Khách hàng | 10 logo | Có sẵn |
| 12 | Phản hồi | 10 phản hồi | Có sẵn |
| 13 | Bài viết | Bài mới hoặc bài ghim | Có sẵn |
| 14 | Form nhận báo giá | Form tư vấn hiện tại | Có sẵn |
| 15 | Footer | Nền xanh, chữ trắng, thông tin công ty + bản đồ | Đổi màu |

- Khối năng lực (6) dựng bằng HTML thay vì dán nguyên ảnh banner, vì:
  - Chữ nằm trong ảnh ngang thì trên điện thoại nhỏ không đọc nổi.
  - Google không đọc được chữ trong ảnh.
- Mọi section mới gắn vào hệ "Bố cục trang chủ" đang có trong admin, nên ông anh vẫn tự đổi thứ tự, ẩn hiện và sửa chữ được.
- Khối "Sản phẩm nổi bật" (20 loại áo, ảnh đang lấy từ CDN Sapo cũ) **ẩn khỏi trang chủ**, không xoá. Bật lại ở admin được.

## 7. Chuyển banner cũ vào trang con (không xoá ảnh nào)

Hiện trang chủ có 9 slider và 3 banner. Đã xem từng ảnh, đề xuất chuyển như sau:

| Ảnh hiện tại | Chuyển vào |
|---|---|
| 8 slider BST áo lớp: THEUNI Unite your style, Zenergy, Infini-teen (Polo phối), Classzip, Cooline, Zippy Crew, Classmark, Funky Jersey | Đồng phục áo lớp (slider đầu trang) |
| Slider "Đặt áo lớp là có quà" (khuyến mãi) | Đồng phục áo lớp. Link đang trỏ nhầm sang bài đồng phục công ty, sửa lại |
| Banner "Các mẫu áo lớp Best Seller" | Đồng phục áo lớp |
| Banner vuông "Đồng phục doanh nghiệp" | Đồng phục doanh nghiệp |
| Banner vuông "Đồng phục thể thao" | Thiết kế → Áo thể thao (`/ao-the-thao`) |

- Cách làm:
  - Thêm cho slider và banner một trường tuỳ chọn **"Hiển thị ở trang"**. Để trống nghĩa là trang chủ.
  - Đây là trường thêm mới, nên code cũ đang chạy trên production không bị ảnh hưởng.
  - Trang danh mục thêm khối banner trên đầu.
  - Admin Slider/Banner thêm ô chọn trang.
- Lưu ý: nhiều banner cũ còn logo POTATO clothing hoặc logo THEUNI kiểu cũ, lệch với bộ nhận diện xanh mới. Nên thay dần.

## 8. Ảnh mới: gắn vào đâu

| File (Downloads/image-theuni) | Nội dung | Gắn vào |
|---|---|---|
| `1212121.jpg` (17716×6697, 12 MB) | THEUNI.vn: Giải pháp quà tặng và đồng phục doanh nghiệp | Hero trang chủ, slide 1 |
| `12121212121.jpg` (17717×6374, 9.4 MB) | THEUNI.vn: Xưởng sản xuất đồng phục, 6 dịch vụ | Hero slide 2 (desktop) + nội dung khối Năng lực |
| `…440bd47d….jpg` (4096×1550) | Các mẫu phôi sản xuất + bảng màu phôi | Khối Phôi và bảng màu; trang Bảng màu vải |
| `…bbf6b9a9….jpg` (1086×1448) | Ảnh thật: cả bộ đồng phục Vị Hương | Ảnh bìa ô "Hàng quán ăn"; khối Dự án |
| `…7e3bbf26….jpg` (1254×1254) | Ảnh thật cận cảnh polo cổ tàu + nón | Khối Dự án |
| `…76bf1e65….jpg` (1536×1024) | Maket polo cổ tàu | Khối Dự án; trang ĐP hàng quán ăn |
| `…9bca8acb….jpg` (1254×1254) | Maket tạp dề dài | Khối Dự án; trang ĐP hàng quán ăn |
| `…2adfc50b….jpg` (1536×1024) | Maket tạp dề ngắn | Khối Dự án; trang ĐP hàng quán ăn |

- Xử lý ảnh:
  - Nén về khổ web: rộng tối đa 2400px, mỗi file dưới khoảng 400 KB.
  - Đặt tên có nghĩa, ví dụ `hero-giai-phap-dong-phuc.jpg`.
  - Lưu ở `public/brand/`.
  - File gốc giữ nguyên trong Downloads.

## 9. Video TikTok

- Link rút gọn mở ra video `7642606504691928327` của kênh **@xuonginaodanang** ("Anh Xưởng In Áo"), dài 21 giây.
- Dùng **TikTok Embed Player chính thức** (iframe `tiktok.com/player/v1/<id>`). Đã thử: bấm play là phát ngay trên trang, có thanh tua, âm lượng và nút toàn màn hình.
- Khung dọc 9:16, chỉ tải khi cuộn tới để không làm chậm trang.
- Dưới video có link "Xem trên TikTok", mở tab mới.
- Link video lưu trong admin. Dán link rút gọn hay link đầy đủ đều được, code tự tách ID.

## 10. Phần 1 KHÔNG làm

- Bố cục các trang trong (danh mục, sản phẩm, bài viết, liên hệ, FAQ): phần 1 chỉ đổi màu và font theo bộ mới, và kiểm tra không còn chỗ chữ trắng trên nền trắng. Bố cục mới làm ở phần 2.
- Trang Thiết kế online (studio) và trang admin: giữ nguyên.
- Không xoá ảnh, sản phẩm, bài viết hay trang nào.

## 11. Các bước làm

1. Biến màu, font, luật phẳng. Bỏ nền texture tối. Kiểm tra tất cả loại trang.
2. Top bar, header, footer mới.
3. Script dữ liệu (chạy trên dev): menu Đồng phục, 4 danh mục mới, vị trí slider/banner, sửa link hỏng.
4. Banner đầu trang danh mục + ô chọn trang trong admin.
5. Nén ảnh mới, đưa vào `public/brand/`.
6. Trang chủ mới: thêm các section mới vào hệ bố cục admin.
7. Video TikTok.
8. Kiểm tra trên desktop và điện thoại, chụp màn hình gửi ông anh duyệt.
9. Bàn giao:
   - Push nhánh, nhắn bên kia deploy.
   - Đúng lúc deploy: sao lưu prod, rồi chạy script dữ liệu trên prod.

## 12. Cần ông anh chốt hoặc gửi thêm

Chưa trả lời thì mình làm theo mặc định ghi trong ngoặc.

1. **Font**: Inter Tight hay Be Vietnam Pro, hay mua Helvetica Neue? (mặc định Inter Tight)
2. **Logo mới** "THEUNI.vn", bản gốc SVG hoặc PNG nền trong. Logo hiện tại làm cho nền tối. (tạm dùng logo cũ)
3. **Ảnh cho Đồng phục spa nail**: chưa có ảnh nào. (tạm để trang có chữ + form báo giá)
4. **Banner hero bản dọc cho điện thoại**: banner ngang thu nhỏ trên điện thoại thì chữ rất khó đọc. (tạm cắt phần giữa)
5. Nút **"BY KIMDUYÊN"** trên header (link Facebook Kim Duyên): giữ, hay thay bằng nút "Báo giá Zalo"? (mặc định thay, chuyển link Kim Duyên xuống footer)
6. Video TikTok thuộc kênh **@xuonginaodanang**, có đúng kênh muốn đưa lên web không?
7. 5 mục bảng giá/bảng size/bảng màu… giữ trong menu Đồng phục, hay tách ra menu "Bảng giá" riêng? (mặc định giữ như ảnh)
8. Mật khẩu admin, hoặc cho phép mình đặt mật khẩu riêng trên DB dev để test các màn admin.

---

## Tiến độ (20/11/2026)

Đã làm trên nhánh `refactor-web`:

- Bộ màu, font Helvetica Neue, phong cách phẳng cho toàn site (`site-layout.css`, `theme-light.css`, `content_style.css`).
- Top bar, header nút "Báo giá Zalo", footer xanh. Chữ top bar sửa ở Admin → Giao diện → Header.
- Menu Đồng Phục 4 mục mới, 4 danh mục mới, 3 sản phẩm Vị Hương, slider cũ chuyển sang trang Đồng phục áo lớp (dữ liệu đã có trên production).
- Trang danh mục: ảnh đầu trang (Category.bannerImage) + slider gắn trang (`Slider.page`, chọn ở Admin → Giao diện trang chủ → Slider).
- Trang chủ kiểu xưởng: hero, dải chữ chạy, giới thiệu + video TikTok, năng lực, 4 lĩnh vực, phôi, maket → thành phẩm, quy trình. Khối cũ ẩn mặc định, bật lại được trong admin.

Chưa làm / còn chờ: logo mới, ảnh spa nail, banner bản dọc cho điện thoại, bố cục các trang trong (phần 2).
