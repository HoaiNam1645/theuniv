// Quy ước lưu ảnh của theuniv — nơi DUY NHẤT biết ảnh nằm ở đâu và URL công khai ra sao.
//
// Viết bằng .mjs (không phải .ts) vì scripts/import-studio-library.mjs chạy thẳng bằng
// `node`, không qua bundler nên không import được .ts. Để quy ước ở .ts thì script buộc
// phải chép lại đường dẫn upload, và hai bản chép sẽ lệch nhau đúng vào lúc đổi
// UPLOAD_DIR trên máy chủ. TypeScript vẫn đọc được file này (tsconfig có allowJs).

import { IMAGE_MIME } from "./imageMime.mjs";
import fs from "fs/promises";
import path from "path";

// Whitelist nằm ở ./imageMime.mjs (không import gì của Node) để trình duyệt dùng
// chung được; ở đây chỉ re-export để nơi gọi vẫn chỉ cần một cửa.
export { IMAGE_MIME, UPLOAD_MIME_EXT, IMAGE_ACCEPT } from "./imageMime.mjs";

/**
 * Nhận dạng MIME từ chính nội dung file (magic bytes), trả null nếu không phải
 * ảnh trong whitelist.
 *
 * `file.type` do trình duyệt gửi lên nên đổi được tuỳ ý: đặt tên `.png` và khai
 * `image/png` cho một file bất kỳ là qua được whitelist. Đường upload có session
 * thì rủi ro đó chấp nhận được; đường công khai thì không.
 */
export function sniffImageMime(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return IMAGE_MIME.JPEG;
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return IMAGE_MIME.PNG;
  }
  if (buffer.subarray(0, 4).toString("latin1") === "GIF8") return IMAGE_MIME.GIF;
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return IMAGE_MIME.WEBP;
  }
  return null;
}

/** Tiền tố URL công khai. Trên prod nginx trỏ đúng tiền tố này vào UPLOAD_DIR. */
export const UPLOAD_URL_PREFIX = "/uploads";

/** dev -> ./public/uploads ; prod -> UPLOAD_DIR (/var/www/theuniv/uploads, nginx serve). */
export function uploadDir() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}

/** Tên file đã lưu -> URL trình duyệt tải được. */
export function uploadUrl(name) {
  return `${UPLOAD_URL_PREFIX}/${name}`;
}

/**
 * URL đã lưu -> đường dẫn trên đĩa, để server đọc lại ảnh (ghép mockup bằng sharp).
 * Trả null nếu URL không phải ảnh do mình lưu (link ngoài, data URL...).
 *
 * Chỉ lấy basename: URL đi từ DB ra, nhưng một chuỗi "/uploads/../../etc/passwd" lọt vào
 * đây là đọc được file ngoài thư mục upload — chặn ở đúng chỗ biết quy ước thay vì tin
 * mọi call site đều nhớ tự chặn.
 */
export function uploadPathFromUrl(url) {
  if (typeof url !== "string" || !url.startsWith(`${UPLOAD_URL_PREFIX}/`)) return null;
  const name = path.basename(url.slice(UPLOAD_URL_PREFIX.length + 1));
  if (!name || name === "." || name === "..") return null;
  return path.join(uploadDir(), name);
}

/** Tên file gốc -> phần slug an toàn cho tên file lưu trữ. */
export const slugifyFileName = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "anh";

/**
 * Tên file duy nhất cho một lần lưu.
 *
 * Có thêm hậu tố ngẫu nhiên bên cạnh timestamp: Date.now() chỉ phân giải tới mili-giây,
 * mà route ghép ảnh ghi 15 màu trong chớp mắt — trùng mili-giây là file màu này ĐÈ file
 * màu kia mà không báo lỗi gì.
 */
export function uploadFileName(baseName, ext) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${slugifyFileName(baseName)}-${stamp}-${rand}${ext}`;
}

/** Ghi buffer vào thư mục upload, trả URL công khai. Tự tạo thư mục nếu chưa có. */
export async function writeUpload(name, buffer) {
  const dir = uploadDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buffer);
  return uploadUrl(name);
}
