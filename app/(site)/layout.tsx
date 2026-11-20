import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingButtons from "@/components/FloatingButtons";
import ThemeJS from "@/components/ThemeJS";
import { versioned } from "@/lib/assetVersion";

// CSS gốc của theme — link trực tiếp, không qua bundler để giữ nguyên 100%.
// React tự hoist các thẻ <link> này lên <head>.
//
// `versioned()` gắn dấu thời điểm sửa file vào URL: Cloudflare cache file tĩnh 4
// giờ, nếu không đổi URL thì sau deploy trình duyệt vẫn dùng CSS cũ trong khi HTML
// đã mới — giao diện vỡ đúng ở chỗ vừa thêm class.
const THEME_CSS = [
  "/css/fonts.css",
  "/css/bootstrap-4-3-min.css",
  "/css/main.scss.css",
  "/css/index.scss.css",
  "/css/quickviews_popup_cart.scss.css",
  "/css/ajaxcart.scss.css",
  "/css/collection_style.scss.css",
  "/css/search_style.scss.css",
  "/css/sidebar_style.scss.css",
  "/css/breadcrumb_style.scss.css",
  "/css/contact_style.scss.css",
  "/css/blog_article_style.scss.css",
  "/css/style_page.scss.css",
  "/css/product_style.scss.css",
  "/css/content_style.css",
  "/css/custom.css",
  // Bố cục chung (header, footer, card...) rồi bố cục riêng từng nhóm trang — nạp sau
  // CSS theme để thắng cascade mà không cần !important.
  "/css/site-layout.css",
  "/css/page-home.css",
  "/css/page-listing.css",
  "/css/page-product.css",
  "/css/page-content.css",
];

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {THEME_CSS.map((href) => (
        <link key={href} rel="stylesheet" href={versioned(href)} precedence="default" />
      ))}
      <Header />
      {children}
      <Footer />
      <FloatingButtons />
      <ThemeJS />
    </>
  );
}
