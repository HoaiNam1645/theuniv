import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  // `metadataBase` là điều kiện để Next dựng canonical và ảnh OpenGraph thành URL
  // TUYỆT ĐỐI. Thiếu nó thì og:image ra đường dẫn tương đối và Facebook/Zalo
  // không lấy được ảnh khi dán link.
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  icons: { icon: "/theme/favicon.png" },
};

/**
 * Chữ hẹp cho tiêu đề lớn (khối giới thiệu xưởng ở trang chủ). Chữ thường của site vẫn là
 * Helvetica Neue (public/css/fonts.css); font này chỉ dùng qua biến `--font-display`.
 * Next tự tải và host file font lúc build, không gọi Google khi khách mở trang.
 */
const displayFont = Barlow_Condensed({
  weight: ["700", "800"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  display: "swap",
  preload: false,
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={displayFont.variable}>
      <body>{children}</body>
    </html>
  );
}
