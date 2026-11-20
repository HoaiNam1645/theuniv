/**
 * Nội dung tin nhắn đặt hàng gửi qua Zalo, và hành động "mở Zalo rồi chép nội dung".
 *
 * Zalo KHÔNG prefill được message qua URL — link zalo.me chỉ mở một khung chat trống,
 * không có tham số `text` như WhatsApp. Nên luồng bắt buộc phải là: chép nội dung vào
 * clipboard cho khách dán. Bản gốc ở loc-store (`apps/web/src/lib/zalo.ts`) cũng làm
 * đúng vậy.
 *
 * Hàm dựng nội dung để THUẦN (không đụng DOM) để trang chỉ việc hiện lại đúng chuỗi đó
 * trong một ô văn bản chọn được — phương án dự phòng khi clipboard bị chặn.
 */

import { STUDIO_DRAFT_PARAM, STUDIO_PATH } from './constants';

/** Nhãn từng dòng trong tin nhắn. Gom một chỗ để không rải chuỗi khắp trang. */
export const STUDIO_ZALO_LABEL = {
  intro: 'Mình vừa thiết kế áo trên web, nhờ shop báo giá giúp:',
  garment: 'Mẫu áo',
  color: 'Màu áo',
  quantity: 'Số lượng',
  unit: 'Đơn vị',
  note: 'Ghi chú',
  designCode: 'Mã thiết kế',
  assetCodes: 'Mã in đã dùng',
  preview: 'Ảnh xem trước',
  reopen: 'Mở lại thiết kế',
} as const;

/** Link chat Zalo dựng từ số điện thoại khi shop chưa điền link đầy đủ. */
export const ZALO_CHAT_BASE = 'https://zalo.me/';

export interface StudioZaloContext {
  /** Tên bộ mockup khách đang thiết kế trên đó. */
  garmentName?: string;
  colorName?: string;
  quantity?: number;
  unit?: string;
  note?: string;
  /** Mã thiết kế — thứ duy nhất dẫn ngược về bản thiết kế đã lưu. */
  designCode: string;
  /** Mã in của mọi ảnh trong kho đã dùng — pick list của xưởng. */
  assetCodes?: string[];
  /** Ảnh mockup đã ghép phẳng, đường dẫn tương đối như DB lưu. */
  previewUrl?: string;
}

/**
 * Đường dẫn tương đối → URL tuyệt đối để dán được vào khung chat.
 *
 * Lấy origin của trình duyệt (hàm này chỉ chạy phía client): DB lưu `/uploads/...`,
 * mà một đường dẫn tương đối dán vào Zalo thì bên kia bấm ra 404.
 */
export function absoluteUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Link mở lại thiết kế theo mã — trang khách đọc mã từ query param này. */
export function studioDraftUrl(code: string): string {
  return absoluteUrl(
    `${STUDIO_PATH.PUBLIC}?${STUDIO_DRAFT_PARAM}=${encodeURIComponent(code)}`,
  );
}

const line = (label: string, value?: string | number | null) =>
  value === null || value === undefined || value === '' ? null : `${label}: ${value}`;

/**
 * Tin nhắn khách dán vào Zalo.
 *
 * MÃ THIẾT KẾ đặt TRƯỚC mọi link: tin nhắn dán tay hay bị cắt cụt phần đuôi, mà mã là
 * thứ duy nhất tra ngược ra được artwork — mất link ảnh thì vẫn cứu được đơn, mất mã
 * thì không.
 */
export function buildStudioZaloText(ctx: StudioZaloContext): string {
  return [
    STUDIO_ZALO_LABEL.intro,
    line(STUDIO_ZALO_LABEL.garment, ctx.garmentName),
    line(STUDIO_ZALO_LABEL.color, ctx.colorName),
    line(STUDIO_ZALO_LABEL.quantity, ctx.quantity),
    line(STUDIO_ZALO_LABEL.unit, ctx.unit),
    line(STUDIO_ZALO_LABEL.note, ctx.note),
    line(STUDIO_ZALO_LABEL.designCode, ctx.designCode),
    line(STUDIO_ZALO_LABEL.assetCodes, ctx.assetCodes?.join(', ')),
    line(
      STUDIO_ZALO_LABEL.preview,
      ctx.previewUrl ? absoluteUrl(ctx.previewUrl) : null,
    ),
    line(STUDIO_ZALO_LABEL.reopen, studioDraftUrl(ctx.designCode)),
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Mở Zalo rồi chép nội dung. Trả về `true` nếu clipboard nhận.
 *
 * Thứ tự là bắt buộc: `window.open` phải chạy ĐỒNG BỘ ngay trong cú click, vì sau một
 * `await` trình duyệt coi như không còn tương tác người dùng và chặn popup. Clipboard
 * hỏng (không có quyền / ngữ cảnh không bảo mật) không được phép chặn việc mở Zalo —
 * gọi lại được sau, còn cái tab thì mất luôn.
 */
export async function openZaloThenCopy(
  zaloUrl: string,
  text: string,
): Promise<boolean> {
  window.open(zaloUrl, '_blank', 'noopener,noreferrer');
  return copyText(text);
}

/** Chép một đoạn văn bản, `false` khi trình duyệt không cho. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Quyền bị từ chối hoặc trang không chạy trên https — nơi gọi hiện ô văn bản
    // dự phòng để khách tự bôi đen, chứ không im lặng coi như đã chép.
    return false;
  }
}
