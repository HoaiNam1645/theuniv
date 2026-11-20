// Đọc + kiểm tra dữ liệu lead, dùng chung cho form tư vấn (/api/leads) và cho đơn đặt
// từ studio (/api/studio/order). Hai đường vào khác nhau nhưng đổ về CÙNG bảng Lead và
// cùng hiện ở /admin/leads, nên luật hợp lệ và giới hạn độ dài phải là một.

import type { Prisma } from "@prisma/client";

export const LEAD_ERROR = {
  REQUIRED: "Vui lòng nhập họ tên và số điện thoại",
  BAD_PHONE: "Số điện thoại không hợp lệ",
} as const;

/** Số Việt Nam viết tay đủ kiểu: có dấu cách, dấu chấm, ngoặc, tiền tố +84. */
const PHONE_RE = /^[0-9+ .()-]{8,20}$/;

/** Trần độ dài từng cột — cắt ở đây thay vì để Mongo nuốt cả bài văn. */
const LEAD_MAX_LENGTH = {
  name: 255,
  phone: 20,
  email: 255,
  unit: 255,
  product: 255,
  message: 2000,
  sourceUrl: 500,
} as const;

const text = (v: unknown, max: number): string | null => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

export type LeadInput = Prisma.LeadCreateInput;

/**
 * Body thô -> dữ liệu tạo Lead. Trả `{ error }` thay vì ném: call site quyết định mã
 * HTTP, và cả hai route đều trả 422 cho lỗi nhập liệu.
 *
 * `overrides` để studio ghi đè `product`/`message` bằng nội dung nó tự dựng (mã thiết
 * kế, số lượng, link ảnh) mà vẫn đi qua đúng bộ lọc độ dài này.
 */
export function parseLeadInput(
  body: Record<string, unknown>,
  overrides: Partial<Record<"product" | "message" | "sourceUrl", string>> = {},
): { data: LeadInput } | { error: string } {
  const name = text(body.name, LEAD_MAX_LENGTH.name);
  const phone = text(body.phone, LEAD_MAX_LENGTH.phone);
  if (!name || !phone) return { error: LEAD_ERROR.REQUIRED };
  if (!PHONE_RE.test(phone)) return { error: LEAD_ERROR.BAD_PHONE };

  return {
    data: {
      name,
      phone,
      email: text(body.email, LEAD_MAX_LENGTH.email),
      unit: text(body.unit, LEAD_MAX_LENGTH.unit),
      product: text(overrides.product ?? body.product, LEAD_MAX_LENGTH.product),
      message: text(overrides.message ?? body.message, LEAD_MAX_LENGTH.message),
      sourceUrl: text(overrides.sourceUrl ?? body.sourceUrl, LEAD_MAX_LENGTH.sourceUrl),
    },
  };
}
