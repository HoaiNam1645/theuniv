import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo";
import { HOME_PREVIEW_PATH } from "@/lib/homeSections";

/**
 * robots.txt của ứng dụng.
 *
 * Trước đây `/robots.txt` rơi vào route bắt-tất-cả nên Cloudflare trả về bản mặc
 * định của họ — không hề trỏ tới sitemap, và không chặn khu quản trị.
 *
 * Chặn những khu KHÔNG được lập chỉ mục: trang quản trị, trang xem trước bản nháp
 * (nội dung chưa duyệt), và toàn bộ API.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", HOME_PREVIEW_PATH],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
