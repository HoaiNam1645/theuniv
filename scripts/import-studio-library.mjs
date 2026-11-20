// Nhập kho studio (bộ mockup + kho ảnh design) từ API demo loc-store về theuniv.
//
// Chạy:  node scripts/import-studio-library.mjs [--dry]
//
// Ảnh được TẢI VỀ máy chủ này chứ không trỏ thẳng sang host demo, vì hai lý do:
//   1. Link demo sẽ chết theo demo.
//   2. Canvas đọc ảnh khác origin làm toDataURL() bị "taint" -> hỏng hẳn chức năng
//      xuất file in, mà lỗi chỉ lộ ra lúc khách bấm nút cuối cùng.
//
// Chạy lại được nhiều lần: bản ghi upsert theo khoá duy nhất (code / slug), file đặt tên
// tất định theo URL nguồn nên lần sau thấy có rồi là bỏ qua, không tải lại và không đẻ
// file rác.

import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import {
  UPLOAD_MIME_EXT,
  slugifyFileName,
  uploadDir,
  uploadUrl,
} from "../lib/uploadPaths.mjs";

const API_BASE = process.env.STUDIO_IMPORT_API || "https://loc-store-demo-api.bohubo.com/api/v1";

const ENDPOINT = {
  SETTINGS: `${API_BASE}/settings/public`,
  ASSETS: `${API_BASE}/design-assets`,
};

/** Khoá setting chứa mảng bộ mockup ở API nguồn. */
const MOCKUP_SETS_KEY = "mockup_sets";

/** Tiền tố tên file để phân biệt ảnh nhập kho với ảnh admin tự tải lên. */
const IMPORT_FILE_PREFIX = "studio";

/**
 * Ảnh nhỏ hơn mức này chắc chắn không phải ảnh thật — thường là trang lỗi HTML hoặc
 * file đứt giữa chừng. Bỏ qua chứ không lưu: một file rác trong kho là một ô trống
 * trong lưới mà không ai biết vì sao.
 */
const MIN_IMAGE_BYTES = 1024;

/** Số ảnh tải song song. Đủ nhanh mà không làm host nguồn chặn vì dồn dập. */
const DOWNLOAD_CONCURRENCY = 6;

/** Số lần thử lại khi tải hỏng do mạng. */
const DOWNLOAD_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

/** API nguồn phân trang bằng limit/offset (KHÔNG phải page/pageSize). */
const SOURCE_PAGE_SIZE = 100;

/** In tiến độ sau mỗi bấy nhiêu ảnh. */
const PROGRESS_EVERY = 25;

const DRY = process.argv.includes("--dry");

const prisma = new PrismaClient();

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *
 * Tải ảnh
 * ------------------------------------------------------------------ */

/** Đuôi file suy từ URL nguồn, để biết tên file cục bộ TRƯỚC khi tải. */
function extFromUrl(sourceUrl) {
  const ext = path.extname(new URL(sourceUrl).pathname).toLowerCase();
  const normalized = ext === ".jpeg" ? ".jpg" : ext;
  return Object.values(UPLOAD_MIME_EXT).includes(normalized) ? normalized : null;
}

/**
 * Tên file cục bộ TẤT ĐỊNH theo URL nguồn — đây là thứ làm script chạy lại được:
 * cùng URL nguồn luôn ra cùng tên file, nên lần sau chỉ cần kiểm tra file có chưa.
 * Kèm hash để hai ảnh trùng tên ở hai bộ sưu tập không đè nhau.
 */
function localNameFor(sourceUrl, ext) {
  const base = slugifyFileName(path.basename(new URL(sourceUrl).pathname, path.extname(sourceUrl)));
  const hash = createHash("sha1").update(sourceUrl).digest("hex").slice(0, 10);
  return `${IMPORT_FILE_PREFIX}-${base}-${hash}${ext}`;
}

async function fileSize(filePath) {
  try {
    return (await fs.stat(filePath)).size;
  } catch {
    return 0;
  }
}

/**
 * Bảo đảm ảnh có mặt trong kho ảnh của theuniv; trả `{ url, width, height }`, hoặc
 * `null` nếu ảnh hỏng (đã đếm vào thống kê, không lưu bản ghi).
 */
async function ensureLocalImage(sourceUrl, stats) {
  const dir = uploadDir();
  const knownExt = extFromUrl(sourceUrl);

  // Đã có sẵn -> khỏi tải. Đây là nhánh chạy cho gần như mọi ảnh ở lần chạy thứ hai.
  if (knownExt) {
    const name = localNameFor(sourceUrl, knownExt);
    const target = path.join(dir, name);
    if ((await fileSize(target)) >= MIN_IMAGE_BYTES) {
      stats.skipped++;
      return withSize(uploadUrl(name), target);
    }
  }

  if (DRY) {
    stats.wouldDownload++;
    return { url: uploadUrl(localNameFor(sourceUrl, knownExt || ".webp")), width: null, height: null };
  }

  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(sourceUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const mime = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      const ext = UPLOAD_MIME_EXT[mime] || knownExt;
      if (!ext) throw new Error(`MIME lạ: ${mime || "(trống)"}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.byteLength < MIN_IMAGE_BYTES) throw new Error(`chỉ ${buffer.byteLength} byte`);

      const name = localNameFor(sourceUrl, ext);
      const target = path.join(dir, name);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(target, buffer);
      stats.downloaded++;
      return withSize(uploadUrl(name), target);
    } catch (e) {
      if (attempt === DOWNLOAD_ATTEMPTS) {
        stats.broken++;
        stats.brokenUrls.push(`${sourceUrl} — ${e.message}`);
        return null;
      }
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  return null;
}

/** Kích thước gốc, để studio đặt layer đúng tỉ lệ ngay lúc kéo vào canvas. */
async function withSize(url, filePath) {
  try {
    const meta = await sharp(filePath).metadata();
    return { url, width: meta.width ?? null, height: meta.height ?? null };
  } catch {
    // Đọc được file nhưng không phải ảnh sharp hiểu — vẫn dùng được URL, chỉ mất tỉ lệ.
    return { url, width: null, height: null };
  }
}

/** Chạy `worker` trên `items` với giới hạn số việc song song. */
async function mapPool(items, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return out;
}

/* ------------------------------------------------------------------ *
 * Bộ mockup
 * ------------------------------------------------------------------ */

async function fetchMockupSets() {
  const res = await fetch(ENDPOINT.SETTINGS);
  if (!res.ok) throw new Error(`settings/public trả HTTP ${res.status}`);
  const body = await res.json();
  const raw = (body.settings ?? body)[MOCKUP_SETS_KEY];
  if (!raw) return [];
  // Nguồn có thể trả mảng thật hoặc chuỗi JSON (đúng lý do theuniv KHÔNG lưu vào Setting.value).
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

/** Tên bộ -> slug duy nhất trong cả đợt nhập. */
function uniqueSlugs(names) {
  const seen = new Map();
  return names.map((name) => {
    const base = slugifyFileName(name) || "bo-mockup";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

async function importMockupSets(stats) {
  const sets = await fetchMockupSets();
  log(`\n▸ Bộ mockup: nguồn có ${sets.length} bộ / ${sets.reduce((n, s) => n + (s.colors?.length ?? 0), 0)} ảnh`);

  const slugs = uniqueSlugs(sets.map((s) => s.name ?? ""));
  let done = 0;

  for (let i = 0; i < sets.length; i++) {
    const src = sets[i];
    const slug = slugs[i];

    const colors = (
      await mapPool(src.colors ?? [], async (c) => {
        const front = await ensureLocalImage(c.front, stats);
        if (!front) return null;
        const back = c.back ? await ensureLocalImage(c.back, stats) : null;
        return {
          name: String(c.name ?? "").trim(),
          hex: String(c.hex ?? "").trim(),
          front: front.url,
          ...(back ? { back: back.url } : {}),
        };
      })
    ).filter((c) => c && c.name && c.front);

    if (!colors.length) {
      log(`  ⚠ ${src.name}: không tải được màu nào, bỏ qua bộ này`);
      continue;
    }

    const data = {
      name: String(src.name ?? slug),
      printArea: src.printArea
        ? {
            x: Number(src.printArea.x),
            y: Number(src.printArea.y),
            w: Number(src.printArea.w),
            h: src.printArea.h == null ? null : Number(src.printArea.h),
            anchor: src.printArea.anchor ?? null,
          }
        : null,
      colors,
      isActive: true,
      position: i,
    };

    if (!DRY) {
      await prisma.mockupSet.upsert({ where: { slug }, create: { slug, ...data }, update: data });
    }
    stats.sets++;
    done++;
    log(`  ${done}/${sets.length} ${data.name} — ${colors.length} màu`);
  }
}

/* ------------------------------------------------------------------ *
 * Kho ảnh design
 * ------------------------------------------------------------------ */

/** Nguồn trả `{ designAssets, total, limit, offset }` — KHÔNG phải `items`/`page`. */
async function fetchAssetPage(offset) {
  const url = `${ENDPOINT.ASSETS}?limit=${SOURCE_PAGE_SIZE}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`design-assets trả HTTP ${res.status}`);
  const body = await res.json();
  return { items: body.designAssets ?? [], total: Number(body.total ?? 0) };
}

const ASSET_STATUS = { DRAFT: "draft", PUBLISHED: "published" };

async function importDesignAssets(stats) {
  const first = await fetchAssetPage(0);
  const total = first.total;
  log(`\n▸ Kho ảnh: nguồn có ${total} asset`);

  let offset = 0;
  let batch = first.items;

  while (batch.length) {
    // Tải ảnh song song trong từng trang, ghi DB tuần tự sau đó.
    const prepared = await mapPool(batch, async (src) => {
      const image = await ensureLocalImage(src.url, stats);
      if (!image) return null;
      const thumb = src.thumbUrl && src.thumbUrl !== src.url
        ? await ensureLocalImage(src.thumbUrl, stats)
        : image;
      return { src, image, thumb: thumb ?? image };
    });

    for (const p of prepared) {
      if (!p) continue;
      const { src, image, thumb } = p;
      const code = String(src.code ?? "").trim();
      if (!code) continue;

      const data = {
        title: String(src.title ?? code),
        url: image.url,
        thumbUrl: thumb.url,
        collectionId: String(src.collectionId ?? "").trim() || "khac",
        collectionName: String(src.collectionName ?? "Khác").trim(),
        tags: Array.isArray(src.tags) ? src.tags.map(String) : [],
        status: src.status === ASSET_STATUS.DRAFT ? ASSET_STATUS.DRAFT : ASSET_STATUS.PUBLISHED,
        sortOrder: Number.isFinite(Number(src.sortOrder)) ? Number(src.sortOrder) : 0,
        widthPx: image.width,
        heightPx: image.height,
        // Giữ createdAt của nguồn để thứ tự "mới nhất trước" của lưới không đảo lộn.
        createdAt: src.createdAt ? new Date(src.createdAt) : new Date(),
      };

      if (!DRY) {
        await prisma.designAsset.upsert({ where: { code }, create: { code, ...data }, update: data });
      }
      stats.assets++;
      if (stats.assets % PROGRESS_EVERY === 0) log(`  ${stats.assets}/${total} asset`);
    }

    offset += SOURCE_PAGE_SIZE;
    if (offset >= total) break;
    batch = (await fetchAssetPage(offset)).items;
  }
  log(`  ${stats.assets}/${total} asset`);
}

/* ------------------------------------------------------------------ *
 * Chạy
 * ------------------------------------------------------------------ */

async function main() {
  const stats = {
    sets: 0,
    assets: 0,
    downloaded: 0,
    skipped: 0,
    wouldDownload: 0,
    broken: 0,
    brokenUrls: [],
  };

  log(`Nhập kho studio từ ${API_BASE}`);
  log(`Ảnh lưu vào: ${uploadDir()}`);
  if (DRY) log("--dry: KHÔNG tải ảnh, KHÔNG ghi database");

  const started = Date.now();
  await importMockupSets(stats);
  await importDesignAssets(stats);

  log("\n──────── Kết quả ────────");
  log(`Bộ mockup   : ${stats.sets}`);
  log(`Asset       : ${stats.assets}`);
  log(DRY ? `Ảnh sẽ tải  : ${stats.wouldDownload}` : `Ảnh đã tải  : ${stats.downloaded}`);
  log(`Ảnh có sẵn  : ${stats.skipped}`);
  log(`Ảnh hỏng    : ${stats.broken}`);
  for (const u of stats.brokenUrls.slice(0, 20)) log(`  ✗ ${u}`);
  log(`Thời gian   : ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main()
  .catch((e) => {
    console.error("\n✗ Nhập kho thất bại:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
