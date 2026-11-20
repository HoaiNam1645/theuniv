import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/db";
import { isObjectId } from "@/lib/mongo";
import {
  COMPOSITE_JPEG_QUALITY,
  COMPOSITE_MAX_EDGE,
  MAX_STUDIO_IMAGE_BYTES,
} from "@/lib/studio/constants";
import { resolveZonePx } from "@/lib/studio/geometry";
import {
  STUDIO_ERROR,
  jsonError,
  readJsonBody,
  requireAdmin,
  toPrintArea,
} from "@/lib/studio/server";
import type {
  CompositeImageDTO,
  CompositeResponse,
  PrintArea,
} from "@/lib/studio/types";
import {
  IMAGE_MIME,
  UPLOAD_ERROR,
  parseDataUrl,
  saveImageBuffer,
  tooLargeMessage,
  uploadPathFromUrl,
} from "@/lib/uploads";

// Ghép MỘT file in lên áo trơn của TỪNG màu trong bộ (admin).
//
// Đây là thứ để trang admin đăng một sản phẩm nhiều màu mà chỉ phải tải lên một file:
// trình duyệt gửi 1 ảnh, server trả về N ảnh. Làm ở server vì bắt trình duyệt xuất rồi
// tải lên 15 ảnh nặng là vừa chậm vừa dễ đứt giữa chừng.

/** Tên file gốc của ảnh ghép; hậu tố duy nhất do lib/uploads.ts thêm. */
const COMPOSITE_FILE_BASE = "mockup";

/** Kèm tên màu vào lỗi ảnh áo: bộ 15 màu mà báo chung chung thì không biết sửa cái nào. */
const missingImage = (colorName: string) =>
  `${STUDIO_ERROR.MOCKUP_IMAGE_MISSING} (${colorName})`;

/** Đọc vùng in do client gửi kèm; thiếu/hỏng thì trả null để rơi về vùng in của bộ. */
function readPrintArea(value: unknown): PrintArea | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
  const x = num(v.x);
  const y = num(v.y);
  const w = num(v.w);
  if (x === null || y === null || w === null) return null;
  const anchor = v.anchor === "center" || v.anchor === "topleft" ? v.anchor : undefined;
  return { x, y, w, h: num(v.h) ?? undefined, anchor };
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readJsonBody(req);
  if (!body) return jsonError(STUDIO_ERROR.INVALID_JSON, 400);

  const mockupSetId = String(body.mockupSetId ?? "").trim();
  if (!mockupSetId) return jsonError(STUDIO_ERROR.MOCKUP_SET_REQUIRED, 400);
  if (!isObjectId(mockupSetId)) return jsonError(STUDIO_ERROR.MOCKUP_SET_NOT_FOUND, 404);
  const set = await db.mockupSet.findUnique({ where: { id: mockupSetId } });
  if (!set) return jsonError(STUDIO_ERROR.MOCKUP_SET_NOT_FOUND, 404);

  if (!body.printDataUrl) return jsonError(STUDIO_ERROR.PRINT_IMAGE_REQUIRED, 400);
  const print = parseDataUrl(body.printDataUrl);
  if (!print) return jsonError(UPLOAD_ERROR.BAD_DATA_URL, 422);
  if (print.buffer.byteLength > MAX_STUDIO_IMAGE_BYTES) {
    return jsonError(tooLargeMessage(MAX_STUDIO_IMAGE_BYTES), 422);
  }

  // Vùng in client gửi lên thắng (admin có thể vừa kéo lại khung), nếu không có thì
  // dùng vùng in đã lưu của bộ.
  const printArea = readPrintArea(body.printArea) ?? toPrintArea(set.printArea);
  if (!printArea) return jsonError(STUDIO_ERROR.PRINT_AREA_REQUIRED, 400);

  const wanted = Array.isArray(body.colorNames)
    ? new Set(body.colorNames.map((n) => String(n)))
    : null;
  const colors = wanted ? set.colors.filter((c) => wanted.has(c.name)) : set.colors;
  if (!colors.length) return jsonError(STUDIO_ERROR.NO_COLORS, 400);

  const artMeta = await sharp(print.buffer).metadata();
  if (!artMeta.width || !artMeta.height) return jsonError(UPLOAD_ERROR.BAD_DATA_URL, 422);

  const images: CompositeImageDTO[] = [];
  for (const color of colors) {
    // Chỉ ghép từ ảnh nằm trong kho ảnh của web. Ảnh áo trỏ ra host ngoài vừa là lỗ
    // SSRF vừa là link sẽ chết — script nhập kho đã tải hết về máy chủ này.
    const mockupPath = uploadPathFromUrl(color.front);
    if (!mockupPath) return jsonError(missingImage(color.name), 422);

    // File có thể đã mất (nhập kho đứt giữa chừng) — báo rõ màu nào hỏng thay vì để
    // sharp ném ra thành 500 trắng trơn, admin không biết phải sửa bộ nào.
    let meta;
    try {
      meta = await sharp(mockupPath).metadata();
    } catch {
      return jsonError(missingImage(color.name), 422);
    }
    const canvasW = meta.width;
    const canvasH = meta.height;
    if (!canvasW || !canvasH) return jsonError(missingImage(color.name), 422);

    // Cùng một hàm hình học mà canvas dùng để dựng preview -> ảnh khách duyệt và ảnh
    // xưởng in không thể lệch nhau.
    const zone = resolveZonePx(printArea, canvasW, canvasH, artMeta.width, artMeta.height);
    const drawW = zone.w;
    const drawH = artMeta.height * zone.scale;

    // CHỐT DUY NHẤT BẮT BUỘC: overlay to hơn ảnh nền thì sharp NÉM LỖI
    // ("Image to composite must have same dimensions or smaller"). Thu nhỏ đều cả hai
    // chiều để artwork không bị méo.
    const shrink = Math.min(1, canvasW / drawW, canvasH / drawH);
    const boxW = Math.max(1, Math.round(drawW * shrink));
    const boxH = Math.max(1, Math.round(drawH * shrink));

    const art = await sharp(print.buffer)
      // .png() giữ alpha: artwork nền trong ghép lên áo đen phải trong, không ra khung trắng.
      .resize({ width: boxW, height: boxH, fit: "inside" })
      .png()
      .toBuffer();
    // Đọc lại kích thước THẬT sau resize, đừng tự nhân tỉ lệ: sharp làm tròn, lệch 1px
    // là hình in lệch tâm ở mọi màu.
    const artSize = await sharp(art).metadata();
    const artW = artSize.width ?? boxW;
    const artH = artSize.height ?? boxH;

    // sharp nhận toạ độ pixel neo GÓC TRÊN-TRÁI. Sai số làm tròn chia đều hai bên để
    // artwork đứng đúng tâm vùng in.
    const left = Math.round(zone.left + (drawW - artW) / 2);
    const top = Math.round(zone.top + (drawH - artH) / 2);

    // Instance mới cho luồng xuất: một sharp instance đã chạy metadata() rồi dựng tiếp
    // pipeline là chỗ dễ dính trạng thái thừa, mà đọc lại file thì gần như không tốn gì.
    const out = await sharp(mockupPath)
      .composite([{ input: art, left, top }])
      .resize({
        width: COMPOSITE_MAX_EDGE,
        height: COMPOSITE_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: COMPOSITE_JPEG_QUALITY })
      .toBuffer({ resolveWithObject: true });

    const saved = await saveImageBuffer({
      buffer: out.data,
      mime: IMAGE_MIME.JPEG,
      baseName: `${COMPOSITE_FILE_BASE}-${set.slug}-${color.name}`,
      maxBytes: MAX_STUDIO_IMAGE_BYTES,
      width: out.info.width,
      height: out.info.height,
    });

    images.push({ colorName: color.name, hex: color.hex, url: saved.url });
  }

  return NextResponse.json({ images } satisfies CompositeResponse);
}
