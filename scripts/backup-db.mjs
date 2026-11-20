/**
 * Sao lưu toàn bộ dữ liệu ra một file JSON.
 *
 * Vì sao cần: máy dev và máy chủ dùng CHUNG một cụm Atlas, nên mọi lần chạy thử ở
 * máy dev đều ghi vào đúng dữ liệu thật. Một lệnh xoá nhầm là mất nội dung khách
 * đã nhập, và MongoDB không có "undo".
 *
 * Chạy trước mỗi lần đụng vào dữ liệu, và trước mỗi lần deploy:
 *
 *   node scripts/backup-db.mjs                 # ghi ra backups/<ngày-giờ>.json
 *   node scripts/backup-db.mjs --out duong-dan.json
 *   node scripts/backup-db.mjs --restore backups/....json   # nạp lại
 *
 * `--restore` chỉ ghi đè đúng những bảng có trong file, theo id — bảng nào không
 * có trong bản sao lưu thì để nguyên, tránh biến việc khôi phục một phần thành
 * xoá sạch phần còn lại.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

/** Bảng được sao lưu. Thêm model mới thì thêm vào đây, nếu không nó lặng lẽ bị bỏ sót. */
const MODELS = [
  "setting",
  "slider",
  "banner",
  "brandLogo",
  "testimonial",
  "productType",
  "product",
  "productImage",
  "category",
  "categoryProduct",
  "tag",
  "productTag",
  "articleCategory",
  "article",
  "faqCategory",
  "faq",
  "page",
  "menu",
  "lead",
  "media",
  "mockupSet",
  "designAsset",
  "designDraft",
  "user",
];

const DEFAULT_DIR = "backups";

function flag(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Tên file theo thời điểm chạy, sắp xếp được theo thứ tự thời gian. */
function stampedName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(
    d.getMinutes(),
  )}${p(d.getSeconds())}.json`;
}

async function backup(db, out) {
  const data = {};
  let total = 0;
  for (const m of MODELS) {
    if (!db[m]) {
      console.log(`  ⚠ bỏ qua "${m}" — không có trong Prisma Client`);
      continue;
    }
    const rows = await db[m].findMany();
    data[m] = rows;
    total += rows.length;
    console.log(`  ${String(rows.length).padStart(5)}  ${m}`);
  }

  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify({ savedAt: new Date().toISOString(), data }, null, 1));
  console.log(`\n✅ ${total} bản ghi -> ${out}`);
}

async function restore(db, file) {
  const parsed = JSON.parse(await readFile(file, "utf8"));
  const data = parsed?.data ?? {};
  console.log(`Nạp lại từ ${file} (lưu lúc ${parsed?.savedAt ?? "?"})`);

  let failed = 0;
  for (const m of MODELS) {
    const rows = data[m];
    if (!Array.isArray(rows) || !db[m]) continue;
    let ok = 0;
    let firstError = "";
    for (const row of rows) {
      // upsert theo khoá chính: bản ghi mới thêm sau lần sao lưu vẫn được giữ,
      // việc khôi phục chỉ đưa những gì có trong file về đúng trạng thái đã lưu.
      // Khoá chính của Setting là `key`, của các bảng còn lại là `id`.
      const pk = m === "setting" ? "key" : "id";
      const where = { [pk]: row[pk] };
      // Prisma KHÔNG cho đặt lại khoá chính trong `update` — để nguyên `row` là
      // hỏng với "Unknown argument `id`" (hoặc `key`). Bỏ đúng trường khoá ra.
      const { [pk]: _pk, ...update } = row;
      try {
        await db[m].upsert({ where, update, create: row });
        ok++;
      } catch (e) {
        failed++;
        if (!firstError) firstError = String(e.message || e).split("\n").filter(Boolean).pop() ?? "";
      }
    }
    const mark = ok === rows.length ? " " : "✗";
    console.log(`  ${mark} ${String(ok).padStart(5)}/${String(rows.length).padEnd(5)} ${m}${firstError ? "  — " + firstError.trim().slice(0, 80) : ""}`);
  }

  // Báo THẤT BẠI khi có bản ghi hỏng. Một đường khôi phục luôn in dấu tích là thứ
  // chỉ phát hiện ra được vào đúng lúc cần nó nhất.
  if (failed) {
    console.log(`\n✗ ${failed} bản ghi KHÔNG nạp được — dữ liệu chưa khôi phục đầy đủ`);
    process.exitCode = 1;
    return;
  }
  console.log("\n✅ Đã nạp lại đầy đủ");
}

async function main() {
  const db = new PrismaClient();
  try {
    const file = flag("--restore");
    if (file) await restore(db, file);
    else await backup(db, flag("--out") ?? path.join(DEFAULT_DIR, stampedName()));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
