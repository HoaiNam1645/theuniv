import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { STUDIO_ERROR, jsonError, toDesignDraftDTO } from "@/lib/studio/server";
import type { DraftResponse } from "@/lib/studio/types";

// Mở lại một thiết kế theo mã (công khai — khách gõ mã từ tin nhắn Zalo).
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code: raw } = await ctx.params;
  // Mã sinh ra toàn chữ hoa; khách gõ tay từ tin nhắn thường ra chữ thường.
  const code = decodeURIComponent(raw ?? "").trim().toUpperCase();
  if (!code) return jsonError(STUDIO_ERROR.DRAFT_CODE_REQUIRED, 400);

  const draft = await db.designDraft.findUnique({ where: { code } });
  if (!draft) return jsonError(STUDIO_ERROR.DRAFT_NOT_FOUND, 404);

  // Hạn dùng ép ở tầng đọc, không dựa vào TTL index: Prisma không khai được TTL index
  // của Mongo, nên nếu chỉ trông vào index thì trên một máy chủ chưa ai tạo index, bản
  // nháp quá hạn vẫn tra ra được — hai môi trường cư xử khác nhau.
  if (draft.expiresAt && draft.expiresAt.getTime() < Date.now()) {
    return jsonError(STUDIO_ERROR.DRAFT_NOT_FOUND, 404);
  }

  return NextResponse.json({ draft: toDesignDraftDTO(draft) } satisfies DraftResponse);
}
