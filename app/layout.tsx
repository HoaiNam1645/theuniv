import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
