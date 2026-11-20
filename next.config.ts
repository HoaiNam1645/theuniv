import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build gọn để deploy VPS: .next/standalone tự chứa server + node_modules cần thiết
  output: "standalone",

  // Dự án này nằm LỒNG trong thư mục của một repo khác (loc-store), nên Next suy ra
  // gốc workspace là thư mục cha. Hậu quả câm lặng: standalone bị lồng thêm một tầng
  // `theuniv/`, `node_modules` văng ra ngoài tầng đó, và gói `next` bị cắt mất
  // `package.json` — app chạy được ở máy dev nhưng lên server chết ngay với
  // "Cannot find module 'next'". Ghim gốc về đúng thư mục này.
  outputFileTracingRoot: __dirname,

  // Không quảng cáo "X-Powered-By: Next.js". Không phải là bảo mật thật, nhưng
  // nó nói thẳng cho người dò biết nên thử bộ khai thác nào trước.
  poweredByHeader: false,
};

export default nextConfig;
