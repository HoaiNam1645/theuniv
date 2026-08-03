// Seed nội dung 9 trang menu Đồng Phục từ file JSON (kết quả workflow viết nội dung).
// Cách chạy: node scripts/seed-dongphuc-content.mjs <đường-dẫn-file-json>
// - Kiểm tra whitelist thẻ HTML trước khi ghi (an toàn cho render + editor).
// - Cập nhật bài có sẵn theo slug; tạo mới nếu chưa có (bang-gia-combo).

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const ALLOWED = new Set([
  "h2", "h3", "p", "strong", "em", "u", "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "th", "td",
  "blockquote", "a", "br", "span",
]);

function checkMarkup(slug, html) {
  const problems = [];
  for (const m of html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)/g)) {
    const tag = m[1].toLowerCase();
    if (!ALLOWED.has(tag)) problems.push(tag);
  }
  // style chỉ được phép là background-color (ô màu vải)
  for (const m of html.matchAll(/style="([^"]*)"/g)) {
    const s = m[1].trim();
    if (!/^background-color:\s*[^;]+;?$/i.test(s)) problems.push(`style="${s}"`);
  }
  if (/class=/.test(html)) problems.push("class=");
  return [...new Set(problems)];
}

const file = process.argv[2];
if (!file) {
  console.error("Thiếu file JSON. Dùng: node scripts/seed-dongphuc-content.mjs <file>");
  process.exit(1);
}
const pages = JSON.parse(readFileSync(file, "utf8"));
const db = new PrismaClient();

const anchor = await db.article.findUnique({ where: { slug: "bang-gia-dong-phuc" } });
if (!anchor) throw new Error("Không tìm thấy bài bang-gia-dong-phuc để lấy chuyên mục");

let bad = 0;
for (const p of pages) {
  const problems = checkMarkup(p.slug, p.bodyHtml);
  if (problems.length) {
    console.error(`✗ ${p.slug}: markup không hợp lệ ->`, problems.join(", "));
    bad++;
    continue;
  }
  const data = {
    title: p.title,
    excerpt: p.excerpt,
    body: p.bodyHtml,
    status: "published",
  };
  const existing = await db.article.findUnique({ where: { slug: p.slug } });
  if (existing) {
    await db.article.update({ where: { slug: p.slug }, data });
    console.log(`✓ cập nhật ${p.slug} (${p.bodyHtml.length} ký tự)`);
  } else {
    await db.article.create({
      data: {
        ...data,
        slug: p.slug,
        articleCategoryId: anchor.articleCategoryId,
        publishedAt: new Date(),
      },
    });
    console.log(`✓ tạo mới ${p.slug} (${p.bodyHtml.length} ký tự)`);
  }
}
await db.$disconnect();
if (bad) {
  console.error(`${bad} trang bị từ chối vì markup — sửa rồi chạy lại.`);
  process.exit(2);
}
console.log("Xong.");
