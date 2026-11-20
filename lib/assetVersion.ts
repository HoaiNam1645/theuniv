import { statSync } from "node:fs";
import path from "node:path";

/**
 * Gắn dấu phiên bản vào URL của file CSS/JS trong `public/`.
 *
 * Vì sao cần: Cloudflare đặt `cache-control: max-age=14400` cho file tĩnh, nên
 * sau khi deploy, trình duyệt vẫn dùng CSS CŨ tới 4 giờ trong khi HTML đã mới.
 * Kết quả là giao diện vỡ đúng ở những chỗ vừa thêm class mới — nhìn như code
 * hỏng, thực ra là hai nửa lệch phiên bản. Đây là lỗi đã xảy ra thật.
 *
 * Dùng thời điểm sửa file làm phiên bản: đổi file là URL đổi theo, cache cũ bị
 * bỏ qua ngay mà không cần xoá cache thủ công hay chờ hết hạn. File không đổi
 * thì URL giữ nguyên, nên vẫn tận dụng được cache.
 *
 * Đọc bằng `statSync` lúc render trên máy chủ; trong bản dựng production mỗi
 * đường dẫn chỉ bị đọc một lần rồi nằm trong bộ nhớ đệm bên dưới.
 */
const cache = new Map<string, string>();

export function versioned(urlPath: string): string {
  const cached = cache.get(urlPath);
  if (cached) return cached;

  let v = "0";
  try {
    // `urlPath` luôn bắt đầu bằng "/" và trỏ vào public/ — bỏ dấu "/" đầu để ghép.
    v = String(Math.floor(statSync(path.join(process.cwd(), "public", urlPath)).mtimeMs));
  } catch {
    // Thiếu file thì trả về nguyên URL: thà mất cache-busting còn hơn làm hỏng
    // cả trang chỉ vì một đường dẫn gõ sai.
    cache.set(urlPath, urlPath);
    return urlPath;
  }

  const out = `${urlPath}?v=${v}`;
  cache.set(urlPath, out);
  return out;
}
