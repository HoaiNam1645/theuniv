# Audit SEO — theuni.vn (2026-08-11)

Đo trên **HTML thật đang phục vụ**, 40 trang lấy từ sitemap và từ link trong
`/tin-tuc`. Không phải đọc code rồi suy đoán.

---

## A. Đã sửa và đã lên production

| # | Vấn đề | Trạng thái |
|---|---|---|
| A1 | **Soft 404** — mọi URL không khớp trả **200** kèm trang "Đang cập nhật", kể cả `/sitemap.xml`, `/robots.txt` và mọi URL crawler tự nghĩ ra | `notFound()` → **404 thật** |
| A2 | **Không có sitemap.xml** (cái 200 trước đó là trang "Đang cập nhật" đội lốt) | `app/sitemap.ts` — **106 URL** |
| A3 | **robots.txt là bản mặc định của Cloudflare** — không trỏ sitemap, không chặn khu quản trị | `app/robots.ts` — chặn `/admin`, `/api`, trang xem trước nháp; khai `Sitemap:` |
| A4 | **Không trang nào có canonical / OpenGraph / Twitter** | Có đủ, kèm `metadataBase` để ra URL tuyệt đối |
| A5 | **Không có dữ liệu có cấu trúc** | Bài viết: `BlogPosting` + `BreadcrumbList`; trang chủ: `Organization` |
| A6 | Chuyên mục blog chưa có bài vẫn được lập chỉ mục | `noindex, follow` + loại khỏi sitemap |

A1 là mục nặng nhất: nó khiến Google có thể lập chỉ mục **vô hạn URL rác**.

---

## B. Còn lại — đo được, xếp theo mức thiệt hại

### B1. 6 mục menu trỏ tới URL không tồn tại  ⚠️ cao

Chính thanh điều hướng đang dẫn người dùng và Googlebot vào 404:

| Nhãn menu | URL |
|---|---|
| ĐỒNG PHỤC DOANH NGHIỆP | `/asdasd` ← mục test còn sót |
| BẢNG GIÁ COMBO F&B | `/bang-gia-combo` |
| BẢNG GIÁ DỊCH VỤ | `/bang-gia-dich-vu` |
| BẢNG SIZE SẢN PHẨM | `/bang-size-san-pham` |
| CÁC LOẠI VẢI ÁO ĐỒNG PHỤC | `/cac-loai-vai-ao-dong-phuc` |
| QUY ƯỚC KÍCH THƯỚC IN | `/quy-uoc-kich-thuoc-in` |

Trước khi vá soft-404 chúng trả 200 nên **trông vẫn bình thường** — đây là lý do
lỗi tồn tại lâu mà không ai thấy. Sửa ở **Giao diện → Header & menu**: tạo trang
tương ứng, trỏ lại URL đúng, hoặc gỡ mục.

Thêm: header còn link `/cart` (giỏ hàng) — tàn dư theme Sapo, site này không bán
trực tuyến.

### B2. 31/40 trang dùng CHUNG một mô tả  ⚠️ cao

Nguyên nhân gốc: cột `seoTitle` / `seoDescription` **có trong CSDL nhưng form
admin không có ô nhập** cho bài viết, sản phẩm và trang tĩnh. Không ai điền được
nên mọi trang rơi về mô tả chung của site.

Việc cần làm: thêm ô "Tiêu đề SEO" + "Mô tả SEO" vào 3 form đó. Code đọc đã sẵn
sàng — `lib/seo.ts` ưu tiên `seoDescription` → `excerpt` → rút từ thân bài.

### B3. 765 ảnh thiếu `width`/`height`  ⚠️ trung bình

Trình duyệt không biết chỗ trước khi ảnh tải xong → **nhảy layout (CLS)**, một
trong ba chỉ số Core Web Vitals mà Google dùng để xếp hạng.

### B4. 12 tiêu đề dài quá 60 ký tự (dài nhất **88**)

Google cắt phần thừa trong kết quả tìm kiếm. Khắc phục bằng ô "Tiêu đề SEO" ở B2
— giữ nguyên tiêu đề hiển thị trên trang, chỉ rút gọn tiêu đề cho máy tìm kiếm.

### B5. Lỗi cấu trúc heading

- `/thiet-ke-online` — **không có `h1`**, cũng chưa có canonical riêng.
- `/bang-mau-vai` — **2 thẻ `h1`**.
- Trang danh sách `/tin-tuc` nhảy thẳng từ `h1` xuống `h3`, không có `h2`.

### B6. 9 ảnh thiếu `alt` (trên tổng 1053)

Tỉ lệ tốt, nhưng vẫn nên vá nốt.

### B7. Nội dung bài viết — *ghi nhận, không xử lý theo yêu cầu*

| | |
|---|---|
| Bài đã đăng | 20 |
| Có thân bài > 200 ký tự | **0** |
| Có `excerpt` | **0** |

Số từ trung bình mỗi trang blog: **221**. Google xếp loại này là *thin content*.
Sitemap và JSON-LD chỉ giúp Google **tìm thấy** nhanh hơn — không thay được nội
dung. Đây là trần thật của thứ hạng blog, và không có thay đổi kỹ thuật nào vượt
qua được.

---

## C. Cách đo lại

```bash
# 404 thật, sitemap, robots
curl -s -o /dev/null -w '%{http_code}\n' https://theuni.vn/url-bia-dat
curl -s https://theuni.vn/sitemap.xml | grep -c '<url>'
curl -s https://theuni.vn/robots.txt

# metadata + dữ liệu có cấu trúc của một bài
curl -s https://theuni.vn/<slug> | grep -oE '<link rel="canonical"[^>]*>|og:[a-z]+|application/ld\+json'
```

Kiểm chéo bằng công cụ của Google: Search Console (Coverage + Sitemaps),
Rich Results Test, PageSpeed Insights.

---

## D. Lưu ý vận hành

Cloudflare **chèn khối robots quản lý của họ lên trước** khối của ứng dụng, nên
file có hai nhóm `User-agent: *`. Google gộp luật từ mọi nhóm khớp nên
`Disallow: /admin` vẫn hiệu lực; muốn sạch thì tắt "Managed robots.txt" trong
Cloudflare.
