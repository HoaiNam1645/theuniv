// Whitelist định dạng ảnh — nguồn sự thật DUY NHẤT, cho cả server lẫn trình duyệt.
//
// Tách khỏi `uploadPaths.mjs` vì file đó import `fs/promises` và `path`: kéo nó
// vào một component `"use client"` là build vỡ ngay với "Module not found: Can't
// resolve 'fs/promises'". Ở đây không có gì ngoài dữ liệu thuần, nên client
// (ImageDrop) và server (route upload, script nhập kho) dùng chung được.
//
// Viết .mjs để `scripts/*.mjs` chạy bằng node thuần cũng import được, giống lý do
// của `uploadPaths.mjs`. TypeScript đọc được nhờ `allowJs` trong tsconfig.

/** Các MIME ảnh web dùng. Khai riêng để không ai gõ chuỗi "image/jpeg" ở call site. */
export const IMAGE_MIME = {
  JPEG: "image/jpeg",
  PNG: "image/png",
  WEBP: "image/webp",
  GIF: "image/gif",
};

/** MIME được phép -> đuôi file. Whitelist: đuôi suy từ MIME chứ không tin tên file gửi lên. */
export const UPLOAD_MIME_EXT = {
  [IMAGE_MIME.JPEG]: ".jpg",
  [IMAGE_MIME.PNG]: ".png",
  [IMAGE_MIME.WEBP]: ".webp",
  [IMAGE_MIME.GIF]: ".gif",
};

/** Chuỗi cho thuộc tính `accept` của <input type="file">. */
export const IMAGE_ACCEPT = Object.keys(UPLOAD_MIME_EXT).join(",");
