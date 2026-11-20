/**
 * Design studio — phần chạy ở server: sinh mã, chuyển bản ghi Prisma sang DTO, đọc
 * tham số truy vấn, dựng câu trả lời lỗi.
 *
 * CHỈ import từ route handler (`app/api/studio/*`). File này kéo theo Prisma nên đưa
 * vào component client là nhét cả DB client vào bundle trình duyệt.
 *
 * Không khai lại shape nào: DTO lấy ở `./types`, hằng số lấy ở `./constants`.
 */

import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import type { $Enums, DesignAsset, DesignDraft, MockupSet, Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  DESIGN_ASSET_PAGE_SIZE,
  DESIGN_CODE_ALPHABET,
  DESIGN_CODE_LENGTH,
  DESIGN_DRAFT_TTL_DAYS,
  MAX_DESIGN_LAYERS,
  STUDIO_FIRST_PAGE,
  STUDIO_QUERY_PARAM,
  type DesignAssetStatus,
} from "./constants";
import type {
  CanvasLayer,
  DesignAssetDTO,
  DesignDraftDTO,
  MockupSetColorDTO,
  MockupSetDTO,
  PrintArea,
} from "./types";

/* ------------------------------------------------------------------ *
 * Chốt enum hai phía
 * ------------------------------------------------------------------ */

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * `DESIGN_ASSET_STATUS` (constants.ts) và enum `DesignAssetStatus` của Prisma phải
 * trùng khít. Không gộp được làm một: client không import `@prisma/client` (kéo cả
 * Prisma vào bundle trình duyệt), còn Prisma không đọc được hằng số TypeScript. Nên
 * hai bên khai riêng và chốt bằng khẳng định biên dịch — lệch một giá trị là `tsc`
 * đỏ ngay tại đây, thay vì lộ ra lúc chạy thật.
 */
const _designAssetStatusMatchesPrisma: Exact<DesignAssetStatus, $Enums.DesignAssetStatus> = true;
void _designAssetStatusMatchesPrisma;

/* ------------------------------------------------------------------ *
 * Câu trả lời lỗi
 * ------------------------------------------------------------------ */

/** Thông điệp lỗi phía server. Client hiện đúng chuỗi này (xem `messageOf` ở api.ts). */
export const STUDIO_ERROR = {
  UNAUTHORIZED: "Chưa đăng nhập",
  INVALID_JSON: "Dữ liệu gửi lên không phải JSON hợp lệ",
  MOCKUP_SET_NOT_FOUND: "Không tìm thấy bộ mockup",
  MOCKUP_SET_REQUIRED: "Thiếu mã bộ mockup",
  PRINT_AREA_REQUIRED: "Bộ mockup chưa cấu hình vùng in",
  PRINT_IMAGE_REQUIRED: "Thiếu ảnh file in",
  PREVIEW_IMAGE_REQUIRED: "Thiếu ảnh xem trước",
  LAYERS_REQUIRED: "Thiếu danh sách layer",
  TOO_MANY_LAYERS: `Một thiết kế tối đa ${MAX_DESIGN_LAYERS} lớp`,
  DRAFT_NOT_FOUND: "Không tìm thấy mã thiết kế này",
  DRAFT_CODE_REQUIRED: "Thiếu mã thiết kế",
  CODE_EXHAUSTED: "Không sinh được mã thiết kế, thử lại",
  NO_COLORS: "Bộ mockup chưa có màu nào để ghép",
  MOCKUP_IMAGE_MISSING: "Ảnh áo trơn của bộ này không nằm trong kho ảnh của web",
} as const;

/** Mọi route studio trả lỗi cùng một shape `{ ok:false, error }` như các route sẵn có. */
export const jsonError = (message: string, status: number) =>
  NextResponse.json({ ok: false, error: message }, { status });

/**
 * Chặn route admin. Trả `null` khi hợp lệ, trả sẵn response 401 khi không —
 * call site chỉ cần `if (denied) return denied;`.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSession();
  return session ? null : jsonError(STUDIO_ERROR.UNAUTHORIZED, 401);
}

/** Đọc body JSON dạng object. `null` nghĩa là body hỏng — call site trả 400 tường minh. */
export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Mã thiết kế
 * ------------------------------------------------------------------ */

/**
 * Sinh mã thiết kế công khai từ `DESIGN_CODE_ALPHABET`.
 *
 * `randomInt` của node cho phân phối đều — `Math.random() % n` lệch về đầu bảng chữ
 * khi độ dài bảng không chia hết cho 2^k, và mã bị đoán được là mã tra được đơn của
 * người khác.
 */
export function generateDesignCode(): string {
  let code = "";
  for (let i = 0; i < DESIGN_CODE_LENGTH; i++) {
    code += DESIGN_CODE_ALPHABET[randomInt(DESIGN_CODE_ALPHABET.length)];
  }
  return code;
}

/** Số lần thử lại khi mã sinh ra trùng bản ghi đã có. */
const CODE_ATTEMPTS = 5;

const isUniqueViolation = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

/**
 * Tạo bản nháp với mã duy nhất.
 *
 * Không "kiểm tra rồi mới ghi": giữa hai bước đó một request khác có thể chiếm mất mã.
 * Để `@unique` của DB phán quyết rồi thử mã khác mới thực sự chống được đua.
 */
export async function createDraftWithCode(
  data: Omit<Prisma.DesignDraftCreateInput, "code">,
): Promise<DesignDraft> {
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
    try {
      return await db.designDraft.create({ data: { ...data, code: generateDesignCode() } });
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  throw new Error(STUDIO_ERROR.CODE_EXHAUSTED);
}

/** Hạn tra mã, tính từ lúc lưu. */
export const draftExpiryFrom = (createdAt: Date) =>
  new Date(createdAt.getTime() + DESIGN_DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000);

/* ------------------------------------------------------------------ *
 * Bản ghi Prisma -> DTO
 * ------------------------------------------------------------------ */

/** Composite `PrintAreaSpec` của Mongo -> `PrintArea` dùng chung. */
export function toPrintArea(spec: MockupSet["printArea"]): PrintArea | undefined {
  if (!spec) return undefined;
  // anchor lưu dạng String để composite type khỏi cần enum riêng; hẹp lại ở đây, giá
  // trị lạ thì bỏ trống để resolveZonePx() dùng mặc định của nó.
  const anchor =
    spec.anchor === "center" || spec.anchor === "topleft" ? spec.anchor : undefined;
  return { x: spec.x, y: spec.y, w: spec.w, h: spec.h ?? undefined, anchor };
}

const toColorDTO = (c: MockupSet["colors"][number]): MockupSetColorDTO => ({
  name: c.name,
  hex: c.hex,
  front: c.front,
  ...(c.back ? { back: c.back } : {}),
});

export function toMockupSetDTO(set: MockupSet): MockupSetDTO {
  return {
    id: set.id,
    name: set.name,
    colors: set.colors.map(toColorDTO),
    printArea: toPrintArea(set.printArea),
  };
}

export function toDesignAssetDTO(a: DesignAsset): DesignAssetDTO {
  return {
    id: a.id,
    title: a.title,
    code: a.code,
    url: a.url,
    thumbUrl: a.thumbUrl,
    collectionId: a.collectionId,
    collectionName: a.collectionName,
    tags: a.tags,
    status: a.status,
    sortOrder: a.sortOrder,
    widthPx: a.widthPx ?? undefined,
    heightPx: a.heightPx ?? undefined,
    createdAt: a.createdAt.toISOString(),
  };
}

/**
 * `layers` lưu dạng Json nên ra khỏi DB là `JsonValue` — ranh giới duy nhất mà kiểu
 * không tự bảo đảm được. Chỉ nhận mảng; hỏng thì trả mảng rỗng để trang mở ra trống
 * chứ không nổ khi render.
 */
function toLayers(value: Prisma.JsonValue): CanvasLayer[] {
  return Array.isArray(value) ? (value as unknown as CanvasLayer[]) : [];
}

export function toDesignDraftDTO(d: DesignDraft): DesignDraftDTO {
  return {
    code: d.code,
    layers: toLayers(d.layers),
    mockupSetId: d.mockupSetId ?? undefined,
    colorName: d.colorName ?? undefined,
    surfaceId: d.surfaceId ?? undefined,
    previewUrl: d.previewUrl ?? undefined,
    printUrl: d.printUrl ?? undefined,
    assetCodes: d.assetCodes,
    note: d.note ?? undefined,
    createdAt: d.createdAt.toISOString(),
    expiresAt: d.expiresAt?.toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * Đọc dữ liệu vào
 * ------------------------------------------------------------------ */

/**
 * Layer nào lấy từ kho thì mang `assetCode` — gom lại thành pick list cho xưởng.
 *
 * Suy từ chính layer chứ không nhận từ client: hai nguồn cùng mô tả một sự thật thì
 * sớm muộn cũng lệch, mà bên sai lại là bên xưởng đọc để lấy file.
 */
export function assetCodesOf(layers: CanvasLayer[]): string[] {
  const codes = layers.map((l) => l.assetCode).filter((c): c is string => !!c);
  return [...new Set(codes)];
}

/** Mảng layer hợp lệ từ body, hoặc `null` nếu không phải mảng. */
export function readLayers(value: unknown): CanvasLayer[] | null {
  return Array.isArray(value) ? (value as CanvasLayer[]) : null;
}

const toInt = (raw: string | null, fallback: number) => {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
};

export interface Paging {
  page: number;
  pageSize: number;
  skip: number;
}

/**
 * Phân trang cho lưới kho ảnh. `pageSize` bị kẹp trong `DESIGN_ASSET_PAGE_SIZE`: tham
 * số này đến từ URL, để mở là ai cũng kéo cả kho về trong một request.
 */
export function readPaging(params: URLSearchParams): Paging {
  const page = Math.max(STUDIO_FIRST_PAGE, toInt(params.get(STUDIO_QUERY_PARAM.PAGE), STUDIO_FIRST_PAGE));
  const requested = toInt(params.get(STUDIO_QUERY_PARAM.PAGE_SIZE), DESIGN_ASSET_PAGE_SIZE);
  const pageSize = Math.min(DESIGN_ASSET_PAGE_SIZE, Math.max(1, requested));
  return { page, pageSize, skip: (page - STUDIO_FIRST_PAGE) * pageSize };
}
