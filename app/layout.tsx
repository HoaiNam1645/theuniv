import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "THE UNI",
  description:
    "Công ty TNHH Đồng Phục THE UNI là thương hiệu sản xuất đồng phục chất lượng, thiết kế trẻ trung, được nhiều học sinh, đội nhóm, doanh nghiệp yêu thích và tin dùng.",
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
