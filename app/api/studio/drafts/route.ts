import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isObjectId } from "@/lib/mongo";
import { MAX_DESIGN_LAYERS, MAX_STUDIO_IMAGE_BYTES } from "@/lib/studio/constants";
import {
  STUDIO_ERROR,
  assetCodesOf,
  createDraftWithCode,
  draftExpiryFrom,
  jsonError,
  readJsonBody,
  readLayers,
} from "@/lib/studio/server";
import type { CreateDraftResponse } from "@/lib/studio/types";
import { UploadError, saveDataUrlImage } from "@/lib/uploads";

// Lưu một phiên studio và cấp mã thiết kế (công khai — khách chưa đăng nhập bao giờ).

/** Tên file gốc của hai ảnh studio xuất ra; hậu tố duy nhất do lib/uploads.ts thêm. */
const DRAFT_FILE_BASE = {
  PRINT: "thiet-ke-file-in",
  PREVIEW: "thiet-ke-xem-truoc",
} as const;

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) return jsonError(STUDIO_ERROR.INVALID_JSON, 400);

  const layers = readLayers(body.layers);
  if (!layers) return jsonError(STUDIO_ERROR.LAYERS_REQUIRED, 400);
  if (layers.length > MAX_DESIGN_LAYERS) return jsonError(STUDIO_ERROR.TOO_MANY_LAYERS, 400);

  const mockupSetId = String(body.mockupSetId ?? "").trim();
  if (!mockupSetId) return jsonError(STUDIO_ERROR.MOCKUP_SET_REQUIRED, 400);
  if (!isObjectId(mockupSetId)) return jsonError(STUDIO_ERROR.MOCKUP_SET_NOT_FOUND, 404);
  // Kiểm tra bộ có thật trước khi ghi file: bản nháp trỏ vào bộ không tồn tại thì mở
  // lại là canvas trắng, mà lúc đó khách đã cầm mã đi nhắn Zalo rồi.
  const exists = await db.mockupSet.count({ where: { id: mockupSetId } });
  if (!exists) return jsonError(STUDIO_ERROR.MOCKUP_SET_NOT_FOUND, 404);

  if (!body.printDataUrl) return jsonError(STUDIO_ERROR.PRINT_IMAGE_REQUIRED, 400);
  if (!body.previewDataUrl) return jsonError(STUDIO_ERROR.PREVIEW_IMAGE_REQUIRED, 400);

  let printUrl: string;
  let previewUrl: string;
  try {
    // Ghi tuần tự: file in là cái nặng nhất, hỏng thì khỏi tốn công ghi preview.
    printUrl = (
      await saveDataUrlImage({
        dataUrl: body.printDataUrl,
        baseName: DRAFT_FILE_BASE.PRINT,
        maxBytes: MAX_STUDIO_IMAGE_BYTES,
      })
    ).url;
    previewUrl = (
      await saveDataUrlImage({
        dataUrl: body.previewDataUrl,
        baseName: DRAFT_FILE_BASE.PREVIEW,
        maxBytes: MAX_STUDIO_IMAGE_BYTES,
      })
    ).url;
  } catch (e) {
    if (e instanceof UploadError) return jsonError(e.message, e.status);
    throw e;
  }

  const createdAt = new Date();
  const draft = await createDraftWithCode({
    layers: layers as unknown as object[],
    mockupSetId,
    colorName: String(body.colorName ?? "").trim() || null,
    surfaceId: String(body.surfaceId ?? "").trim() || null,
    previewUrl,
    printUrl,
    assetCodes: assetCodesOf(layers),
    note: String(body.note ?? "").trim() || null,
    createdAt,
    expiresAt: draftExpiryFrom(createdAt),
  });

  return NextResponse.json(
    {
      code: draft.code,
      previewUrl,
      printUrl,
    } satisfies CreateDraftResponse,
    { status: 201 },
  );
}
