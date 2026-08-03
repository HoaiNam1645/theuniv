import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build gọn để deploy VPS: .next/standalone tự chứa server + node_modules cần thiết
  output: "standalone",
};

export default nextConfig;
