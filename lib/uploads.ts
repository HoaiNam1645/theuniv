// Lưu ảnh + tạo bản ghi Media — dùng chung cho /api/admin/upload (multipart) và cho
// studio (data URL từ canvas). Trước đây logic này nằm nguyên trong route upload; studio
// cần ĐÚNG hành vi đó nhưng nguồn vào là data URL chứ không phải file multipart, nên phần
// ghi file được kéo ra đây thay vì chép sang một đường upload thứ hai.
//
// Quy ước đường dẫn nằm ở ./uploadPaths.mjs (script nhập kho chạy bằng node dùng chung).

import { db } from "@/lib/db";
import {
  IMAGE_MIME,
  UPLOAD_MIME_EXT,
  uploadFileName,
  uploadPathFromUrl,
  writeUpload,
} from "./uploadPaths.mjs";

// Route handler chỉ cần biết một cửa: mọi thứ về lưu ảnh đi qua file này.
export { IMAGE_MIME, uploadPathFromUrl };

/** Câu chữ báo lỗi upload — gom một chỗ để hai route nói giống nhau. */
export const UPLOAD_ERROR = {
  MISSING_FILE: "Thiếu file",
  BAD_TYPE: "Chỉ nhận ảnh JPG, PNG, WEBP, GIF",
  BAD_DATA_URL: "Ảnh gửi lên không hợp lệ",
} as const;

/** Ảnh vượt hạn mức. Hạn mức do call site truyền vào nên thông điệp phải dựng động. */
export const tooLargeMessage = (maxBytes: number) =>
  `Ảnh tối đa ${Math.round(maxBytes / 1024 / 1024)}MB`;

const BYTES_PER_MB = 1024 * 1024;

/**
 * Lỗi dữ liệu vào của upload. Mang sẵn HTTP status để route handler trả đúng mã mà
 * không phải đoán lại — 422 giữ nguyên như route upload cũ vẫn trả.
 */
export class UploadError extends Error {
  readonly status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

/** MIME -> đuôi file, null nếu không nằm trong whitelist. */
export function extForMime(mime: string): string | null {
  return (UPLOAD_MIME_EXT as Record<string, string | undefined>)[mime] ?? null;
}

export interface SavedUpload {
  /** URL công khai, ví dụ /uploads/ao-thun-abc123-x9k2.png */
  url: string;
  size: number;
}

/**
 * Ghi một ảnh xuống thư mục upload và tạo bản ghi Media.
 *
 * `maxBytes` là tham số chứ không phải hằng số cố định trong file: ảnh admin tải lên và
 * file in độ phân giải cao của studio có hai hạn mức khác nhau, và mỗi call site đã có
 * hằng số có tên của mình.
 */
export async function saveImageBuffer(opts: {
  buffer: Buffer;
  mime: string;
  baseName: string;
  maxBytes: number;
  width?: number;
  height?: number;
}): Promise<SavedUpload> {
  const ext = extForMime(opts.mime);
  if (!ext) throw new UploadError(UPLOAD_ERROR.BAD_TYPE);

  const size = opts.buffer.byteLength;
  if (size > opts.maxBytes) throw new UploadError(tooLargeMessage(opts.maxBytes));

  const name = uploadFileName(opts.baseName, ext);
  const url = await writeUpload(name, opts.buffer);

  await db.media.create({
    data: { path: url, size, width: opts.width ?? null, height: opts.height ?? null },
  });

  return { url, size };
}

// [\s\S] thay cho cờ /s: target của dự án là ES2017, chưa có dotAll.
const DATA_URL_RE = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([\s\S]+)$/i;

/**
 * Data URL từ canvas -> buffer + MIME. Trả null khi chuỗi không đúng dạng.
 *
 * Chỉ nhận base64: canvas.toDataURL() luôn xuất base64, còn biến thể URL-encoded chỉ có
 * thể là thứ ai đó tự dựng — từ chối thẳng thay vì đoán ý.
 */
export function parseDataUrl(value: unknown): { buffer: Buffer; mime: string } | null {
  if (typeof value !== "string") return null;
  const m = DATA_URL_RE.exec(value.trim());
  if (!m) return null;
  const buffer = Buffer.from(m[2], "base64");
  if (!buffer.byteLength) return null;
  return { buffer, mime: m[1].toLowerCase() };
}

/**
 * Data URL -> file đã lưu. Kiểm tra hạn mức TRƯỚC khi decode base64 để một chuỗi khổng lồ
 * không kịp phình thành Buffer trong RAM rồi mới bị từ chối.
 */
export async function saveDataUrlImage(opts: {
  dataUrl: unknown;
  baseName: string;
  maxBytes: number;
}): Promise<SavedUpload> {
  // base64 nở ~4/3 so với dữ liệu gốc; ước lượng từ độ dài chuỗi là đủ để chặn sớm.
  if (
    typeof opts.dataUrl === "string" &&
    (opts.dataUrl.length * 3) / 4 > opts.maxBytes + BYTES_PER_MB
  ) {
    throw new UploadError(tooLargeMessage(opts.maxBytes));
  }

  const parsed = parseDataUrl(opts.dataUrl);
  if (!parsed) throw new UploadError(UPLOAD_ERROR.BAD_DATA_URL);

  return saveImageBuffer({
    buffer: parsed.buffer,
    mime: parsed.mime,
    baseName: opts.baseName,
    maxBytes: opts.maxBytes,
  });
}
