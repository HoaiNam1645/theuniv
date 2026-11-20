import type { Metadata } from "next";
import { versioned } from "@/lib/assetVersion";

export const metadata: Metadata = {
  title: "THE UNI Admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <link rel="stylesheet" href={versioned("/css/admin-fonts.css")} precedence="default" />
      <link rel="stylesheet" href={versioned("/css/quill.snow.css")} precedence="default" />
      <link rel="stylesheet" href={versioned("/css/quill-table-better.css")} precedence="default" />
      <link rel="stylesheet" href={versioned("/css/admin.css")} precedence="default" />
      {children}
    </>
  );
}
