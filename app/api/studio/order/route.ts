import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseLeadInput } from "@/lib/leads";
import { STUDIO_ERROR, jsonError, readJsonBody } from "@/lib/studio/server";
import type { StudioOrderResponse } from "@/lib/studio/types";

// Đặt hàng từ trang thiết kế (công khai) -> tạo Lead để đơn rơi vào /admin/leads sẵn có,
// thay vì dựng thêm một hộp thư thứ hai mà không ai nhớ mở.

/** Nhãn dựng nội dung lead. Nhân viên đọc thẳng những dòng này trong /admin/leads. */
const ORDER_LABEL = {
  PRODUCT: "Thiết kế studio",
  QUANTITY: "Số lượng",
  COLOR: "Màu áo",
  PREVIEW: "Ảnh xem trước",
  PRINT: "File in",
  NOTE: "Ghi chú",
} as const;

/** Số lượng là số nguyên dương; ngoài khoảng này coi như khách chưa điền. */
const MIN_ORDER_QUANTITY = 1;
const MAX_ORDER_QUANTITY = 100000;

const line = (label: string, value?: string | null) => (value ? `${label}: ${value}` : null);

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) return jsonError(STUDIO_ERROR.INVALID_JSON, 400);

  const draftCode = String(body.draftCode ?? "").trim().toUpperCase();
  if (!draftCode) return jsonError(STUDIO_ERROR.DRAFT_CODE_REQUIRED, 400);

  // Đơn phải gắn với một thiết kế có thật: mã sai thì xưởng không lấy được file, và
  // báo ngay lúc này còn kịp, chứ để lead vào rồi mới phát hiện là đã mất khách.
  const draft = await db.designDraft.findUnique({ where: { code: draftCode } });
  if (!draft) return jsonError(STUDIO_ERROR.DRAFT_NOT_FOUND, 404);

  const quantityRaw = Number(body.quantity);
  const quantity =
    Number.isInteger(quantityRaw) &&
    quantityRaw >= MIN_ORDER_QUANTITY &&
    quantityRaw <= MAX_ORDER_QUANTITY
      ? String(quantityRaw)
      : null;

  const message = [
    line(ORDER_LABEL.QUANTITY, quantity),
    line(ORDER_LABEL.COLOR, draft.colorName),
    line(ORDER_LABEL.NOTE, String(body.message ?? "").trim() || draft.note),
    line(ORDER_LABEL.PREVIEW, draft.previewUrl),
    line(ORDER_LABEL.PRINT, draft.printUrl),
  ]
    .filter(Boolean)
    .join("\n");

  const parsed = parseLeadInput(body, {
    product: `${ORDER_LABEL.PRODUCT} ${draft.code}`,
    message,
    // Trang khách không gửi sourceUrl; referer cho biết đơn đến từ trang thiết kế nào.
    sourceUrl: req.headers.get("referer") ?? undefined,
  });
  if ("error" in parsed) return jsonError(parsed.error, 422);

  const lead = await db.lead.create({ data: parsed.data });

  return NextResponse.json({ ok: true, leadId: lead.id } satisfies StudioOrderResponse, {
    status: 201,
  });
}
