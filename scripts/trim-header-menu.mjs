/**
 * Gọn menu header (2026-11-20):
 *   1. Xoá các mục cấp 1 BST, Thiết kế, BLOG, Faq cùng menu con của chúng.
 *   2. Menu "Đồng Phục" chỉ giữ 4 mục đồng phục; xoá các mục từ "Bảng giá dịch vụ" trở xuống
 *      (kể cả mục đang tắt). Link của chính "Đồng Phục" trỏ về mục con đầu tiên, vì /dong-phuc
 *      là chuyên mục blog — trang danh sách blog đã bỏ khỏi code.
 *   3. Tắt (không xoá) các danh mục chỉ dùng cho menu BST / Thiết kế để trang của chúng trả 404.
 *      Sản phẩm, bài viết, nội dung trang chủ giữ nguyên.
 *
 * Chạy lại nhiều lần được.
 *
 *   node --env-file=.env scripts/trim-header-menu.mjs              # DB trong .env (theuniv_dev)
 *   DATABASE_URL="...theuniv?..." node scripts/trim-header-menu.mjs  # production
 *
 * Trước khi chạy trên production: node scripts/backup-db.mjs (cùng DATABASE_URL).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const log = (...a) => console.log("  ", ...a);
const dbName = (process.env.DATABASE_URL || "").match(/\.net\/([^?]+)/)?.[1] || "(.env)";

/** Mục cấp 1 bị bỏ, nhận theo link (nhãn có thể đã đổi trong admin). */
const DROP_TOP_URLS = ["/bst-ao-lop", "/thiet-ke", "/thong-tin", "/cau-hoi-thuong-gap"];
/** Menu con giữ lại của "Đồng Phục". */
const KEEP_UNIFORM_URLS = [
  "/dong-phuc-doanh-nghiep",
  "/dong-phuc-ao-lop",
  "/dong-phuc-hang-quan-an",
  "/dong-phuc-spa-nail",
];
const UNIFORM_URL = { from: "/dong-phuc", to: KEEP_UNIFORM_URLS[0] };
/** Danh mục của menu Thiết kế; mọi danh mục loại "bst" cũng tắt theo. */
const RETIRED_CATEGORY_SLUGS = ["thiet-ke", "ao-lop", "ao-nhom", "ao-cong-ty", "ao-the-thao", "phu-kien-1"];

async function menu() {
  console.log("1-2. Menu");
  const all = await db.menu.findMany({ where: { location: "header" } });
  const tops = all.filter((m) => !m.parentId);
  const kidsOf = (id) => all.filter((m) => m.parentId === id);

  for (const top of tops.filter((m) => DROP_TOP_URLS.includes(m.url))) {
    const kids = kidsOf(top.id);
    if (kids.length) await db.menu.deleteMany({ where: { id: { in: kids.map((k) => k.id) } } });
    await db.menu.delete({ where: { id: top.id } });
    log("xoá", top.label, `(+${kids.length} mục con)`);
  }

  const uniform = tops.find((m) => m.label.trim().toLowerCase() === "đồng phục");
  if (!uniform) throw new Error('Không tìm thấy mục menu cấp 1 "Đồng Phục"');
  const extra = kidsOf(uniform.id).filter((k) => !KEEP_UNIFORM_URLS.includes(k.url));
  if (extra.length) {
    await db.menu.deleteMany({ where: { id: { in: extra.map((k) => k.id) } } });
    for (const k of extra) log("xoá con", k.label);
  }
  if (uniform.url === UNIFORM_URL.from) {
    await db.menu.update({ where: { id: uniform.id }, data: { url: UNIFORM_URL.to } });
    log("sửa link", uniform.label, UNIFORM_URL.from, "->", UNIFORM_URL.to);
  }

  // Xếp lại vị trí cấp 1 cho liền mạch sau khi xoá.
  const left = await db.menu.findMany({ where: { location: "header", parentId: null }, orderBy: { position: "asc" } });
  for (const [i, m] of left.entries()) if (m.position !== i) await db.menu.update({ where: { id: m.id }, data: { position: i } });
}

async function categories() {
  console.log("3. Danh mục");
  const { count } = await db.category.updateMany({
    where: { isActive: true, OR: [{ slug: { in: RETIRED_CATEGORY_SLUGS } }, { kind: "bst" }] },
    data: { isActive: false },
  });
  log("tắt", count, "danh mục");
}

console.log(`trim-header-menu -> ${dbName}`);
await menu();
await categories();
await db.$disconnect();
console.log("Xong.");
