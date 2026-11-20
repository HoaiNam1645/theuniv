/**
 * Dữ liệu cho đợt refactor-web (docs/refactor-web-plan.md):
 *   1. 4 danh mục mới của menu "Đồng Phục" + gắn sản phẩm + ảnh đầu trang.
 *   2. Menu "Đồng Phục": 4 mục đầu mới, tắt (không xoá) "Phụ kiện" và "Bảng giá combo F&B";
 *      sửa link hỏng (/asdasd, /bst-THEUNI).
 *   3. 9 slider cũ của trang chủ chuyển sang đầu trang "Đồng phục áo lớp" (trường `page`).
 *   4. Ảnh các khối trang chủ mới (hero, phôi, dự án Vị Hương) — bảng banners, slot riêng.
 *   5. 3 sản phẩm Vị Hương cho "Đồng phục hàng quán ăn".
 *
 * Chạy lại nhiều lần không sinh trùng: mọi bản ghi tìm theo slug / url / slot / ảnh trước khi tạo.
 * Không xoá bản ghi nào.
 *
 *   node scripts/refactor-web-data.mjs                 # DB trong .env (theuniv_dev)
 *   DATABASE_URL="...theuniv?..." node scripts/refactor-web-data.mjs   # production
 *
 * Trước khi chạy trên production: node scripts/backup-db.mjs (cùng DATABASE_URL).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const log = (...a) => console.log("  ", ...a);
const dbName = (process.env.DATABASE_URL || "").match(/\.net\/([^?]+)/)?.[1] || "(.env)";

/* ---------- 1. Danh mục ---------- */
const CATEGORIES = [
  {
    slug: "dong-phuc-doanh-nghiep",
    name: "Đồng phục doanh nghiệp",
    description:
      "<p>Xưởng THE UNI thiết kế và sản xuất đồng phục công ty, áo polo, áo thun sự kiện và quà tặng in logo thương hiệu. Lên maket miễn phí, may theo số lượng và màu nhận diện của doanh nghiệp.</p>",
    bannerImage: "/uploads/6-mts5e2nf-9el6.jpg",
    productsFrom: "ao-cong-ty",
  },
  {
    slug: "dong-phuc-ao-lop",
    name: "Đồng phục áo lớp",
    description:
      "<p>Áo lớp thiết kế riêng cho từng tập thể: áo thun, polo, bóng chày, bóng bầu dục, sơ mi. Xưởng in và may theo số lượng của lớp, có bảng giá riêng cho học sinh, sinh viên.</p>",
    bannerImage: "/uploads/chatgpt-image-aug-6-2026-09-20-36-pm-mskj8vmn-0u2n.png",
    productsFrom: "ao-lop",
  },
  {
    slug: "dong-phuc-hang-quan-an",
    name: "Đồng phục hàng quán ăn",
    description:
      "<p>Đồng phục cho nhà hàng, quán ăn, quán cà phê: áo polo cổ tàu, áo thun, tạp dề dài, tạp dề ngắn và nón in logo quán. Vải kaki, cá sấu poly bền màu, logo in PET sắc nét.</p>",
    bannerImage: "/brand/vi-huong-bo-dong-phuc.jpg",
  },
  {
    slug: "dong-phuc-spa-nail",
    name: "Đồng phục spa nail",
    description:
      "<p>Đồng phục cho tiệm spa, nail, salon: áo và tạp dề in logo theo màu nhận diện của tiệm. Gửi logo qua Zalo để xưởng lên maket miễn phí.</p>",
    bannerImage: null,
  },
];

/** Danh mục có sẵn chỉ được thêm ảnh đầu trang nếu đang trống. */
const EXISTING_CATEGORY_BANNERS = { "ao-the-thao": "/uploads/7-mts5dypp-0ddm.jpg" };

async function categories() {
  console.log("1. Danh mục");
  for (const c of CATEGORIES) {
    const data = {
      name: c.name,
      description: c.description,
      bannerImage: c.bannerImage,
      seoDescription: c.description.replace(/<[^>]+>/g, ""),
      kind: "collection",
      isActive: true,
    };
    const existing = await db.category.findUnique({ where: { slug: c.slug } });
    const cat = existing
      ? existing
      : await db.category.create({ data: { slug: c.slug, position: 0, ...data } });
    log(existing ? "đã có" : "tạo mới", c.slug);

    if (c.productsFrom) {
      const src = await db.category.findUnique({
        where: { slug: c.productsFrom },
        include: { products: true },
      });
      let added = 0;
      for (const link of src?.products || []) {
        const has = await db.categoryProduct.findFirst({
          where: { categoryId: cat.id, productId: link.productId },
        });
        if (has) continue;
        await db.categoryProduct.create({
          data: { categoryId: cat.id, productId: link.productId, position: link.position },
        });
        added++;
      }
      log(`  + ${added} sản phẩm từ ${c.productsFrom}`);
    }
  }
  for (const [slug, img] of Object.entries(EXISTING_CATEGORY_BANNERS)) {
    const cat = await db.category.findUnique({ where: { slug } });
    if (cat && !cat.bannerImage) {
      await db.category.update({ where: { id: cat.id }, data: { bannerImage: img } });
      log("ảnh đầu trang", slug);
    }
  }
}

/* ---------- 2. Menu ---------- */
const NEW_SUBMENU = [
  { label: "ĐỒNG PHỤC DOANH NGHIỆP", url: "/dong-phuc-doanh-nghiep", replaces: "/asdasd" },
  { label: "ĐỒNG PHỤC ÁO LỚP", url: "/dong-phuc-ao-lop", replaces: "/bang-gia-ao-lop" },
  { label: "ĐỒNG PHỤC HÀNG QUÁN ĂN", url: "/dong-phuc-hang-quan-an" },
  { label: "ĐỒNG PHỤC SPA NAIL", url: "/dong-phuc-spa-nail" },
];
/** Tắt khỏi menu Đồng Phục (trang vẫn còn, bật lại ở admin được). */
const HIDE_URLS = ["/bang-gia-phu-kien-THEUNI", "/bang-gia-combo"];
const FIX_PARENT_URL = { "/bst-THEUNI": "/bst-ao-lop" };

async function menu() {
  console.log("2. Menu");
  const all = await db.menu.findMany({ where: { location: "header" }, orderBy: { position: "asc" } });
  const parent = all.find((m) => !m.parentId && m.label.trim().toLowerCase() === "đồng phục");
  if (!parent) throw new Error('Không tìm thấy mục menu cấp 1 "Đồng Phục"');
  const kids = all.filter((m) => m.parentId === parent.id);

  const used = new Set();
  for (const [i, item] of NEW_SUBMENU.entries()) {
    const found = kids.find((k) => k.url === item.url || (item.replaces && k.url === item.replaces));
    const data = { label: item.label, url: item.url, position: i + 1, isActive: true };
    if (found) {
      await db.menu.update({ where: { id: found.id }, data });
      used.add(found.id);
      log("cập nhật", item.label);
    } else {
      const created = await db.menu.create({ data: { ...data, parentId: parent.id, location: "header" } });
      used.add(created.id);
      log("thêm", item.label);
    }
  }
  // Các mục còn lại giữ thứ tự cũ, xếp sau 4 mục mới; mục bị tắt dồn xuống cuối.
  let pos = NEW_SUBMENU.length + 1;
  for (const k of kids.filter((k) => !used.has(k.id) && !HIDE_URLS.includes(k.url))) {
    await db.menu.update({ where: { id: k.id }, data: { position: pos++ } });
  }
  for (const k of kids.filter((k) => HIDE_URLS.includes(k.url))) {
    await db.menu.update({ where: { id: k.id }, data: { position: pos++, isActive: false } });
    log("tắt", k.label);
  }
  for (const m of all.filter((m) => !m.parentId && FIX_PARENT_URL[m.url])) {
    await db.menu.update({ where: { id: m.id }, data: { url: FIX_PARENT_URL[m.url] } });
    log("sửa link", m.label, m.url, "->", FIX_PARENT_URL[m.url]);
  }
}

/* ---------- 3. Slider cũ -> trang Đồng phục áo lớp ---------- */
const OLD_HOME_SLIDES = [
  "/uploads/chatgpt-image-aug-8-2026-10-33-17-pm-mskjabr1-yjgg.png",
  "/uploads/chatgpt-image-aug-8-2026-10-44-12-pm-mskjo1bv-5q0n.png",
  "/uploads/chatgpt-image-aug-8-2026-10-49-09-pm-mskjupx8-cx7u.png",
  "/uploads/1-mts5bito-1e7e.jpg",
  "/uploads/3-mts5bqlh-732x.jpg",
  "/uploads/2-mts5bwb5-dx80.jpg",
  "/uploads/5-mts5c3x4-w8t8.jpg",
  "/uploads/4-mts5cdi6-8yih.jpg",
  "/uploads/1-mts5cjty-49rb.jpg",
];
/** Slider "Đặt áo lớp là có quà" đang trỏ nhầm sang bài đồng phục công ty. */
const PROMO_SLIDE = { image: "/uploads/1-mts5cjty-49rb.jpg", link: "/bang-gia-ao-lop" };

async function sliders() {
  console.log("3. Slider");
  const r = await db.slider.updateMany({
    where: { imageDesktop: { in: OLD_HOME_SLIDES } },
    data: { page: "dong-phuc-ao-lop" },
  });
  log(`${r.count} slider -> đầu trang /dong-phuc-ao-lop`);
  const promo = await db.slider.updateMany({
    where: { imageDesktop: PROMO_SLIDE.image },
    data: { link: PROMO_SLIDE.link },
  });
  log(`sửa link slider khuyến mãi: ${promo.count}`);
}

/* ---------- 4. Ảnh các khối trang chủ mới ---------- */
// Slot khai ở lib/homeSections.ts (BANNER_SLOT). Code cũ đang chạy không đọc các slot này.
const HOME_BANNERS = [
  // buttonText: hero -> chữ thay thế (alt) của ảnh; khối dự án -> chú thích dưới ảnh.
  { slot: "home_hero_1", image: "/brand/hero-giai-phap-dong-phuc.jpg", link: "/dong-phuc-doanh-nghiep", buttonText: "THE UNI — giải pháp quà tặng và đồng phục doanh nghiệp" },
  { slot: "home_hero_2", image: "/brand/hero-xuong-san-xuat.jpg", link: "/lien-he", buttonText: "THE UNI — xưởng sản xuất đồng phục" },
  { slot: "home_phoi", image: "/brand/phoi-san-xuat-bang-mau.jpg", link: "/bang-mau-vai", buttonText: null },
  { slot: "home_showcase_1", image: "/brand/vi-huong-bo-dong-phuc.jpg", link: "/dong-phuc-hang-quan-an", buttonText: "Ảnh thật: bộ đồng phục nhà hàng Vị Hương" },
  { slot: "home_showcase_2", image: "/brand/vi-huong-polo-co-tau-maket.jpg", link: "/ao-polo-co-tau-vi-huong", buttonText: "Maket polo cổ tàu" },
  { slot: "home_showcase_3", image: "/brand/vi-huong-tap-de-dai-maket.jpg", link: "/tap-de-dai-vi-huong", buttonText: "Maket tạp dề dài" },
  { slot: "home_showcase_4", image: "/brand/vi-huong-tap-de-ngan-maket.jpg", link: "/tap-de-ngan-vi-huong", buttonText: "Maket tạp dề ngắn" },
  { slot: "home_showcase_5", image: "/brand/vi-huong-polo-non.jpg", link: "/dong-phuc-hang-quan-an", buttonText: "Ảnh thật: polo cổ tàu và nón in logo" },
];

async function homeBanners() {
  console.log("4. Ảnh trang chủ");
  for (const b of HOME_BANNERS) {
    const has = await db.banner.findFirst({ where: { slot: b.slot } });
    if (has) {
      // Bản ghi tạo ở lần chạy trước chưa có chú thích: chỉ điền khi còn trống, không đè chữ admin đã sửa.
      if (!has.buttonText && b.buttonText) {
        await db.banner.update({ where: { id: has.id }, data: { buttonText: b.buttonText } });
        log("thêm chú thích", b.slot);
      } else log("đã có", b.slot);
      continue;
    }
    await db.banner.create({ data: { ...b, position: 0, isActive: true } });
    log("tạo", b.slot);
  }
}

/* ---------- 5. Sản phẩm Vị Hương ---------- */
const PRODUCTS = [
  {
    slug: "ao-polo-co-tau-vi-huong",
    name: "Áo polo cổ tàu - Nhà hàng Vị Hương",
    material: "Cá sấu poly cao cấp",
    printMethod: "Be kem",
    form: "Polo cổ tàu (cổ trụ ngắn), 3 nút",
    description:
      "<p>Đồng phục polo cổ tàu xưởng THE UNI sản xuất cho nhà hàng Vị Hương.</p><ul><li>Vải cá sấu poly: mềm mịn, thoáng mát, giữ form tốt, ít nhăn, bền màu.</li><li>Logo in PET ở ngực trái, rộng 8 cm: hình in sắc nét, bám tốt, độ bền cao.</li><li>Màu áo be kem, cổ tàu 3 nút.</li></ul>",
    images: ["/brand/vi-huong-polo-co-tau-maket.jpg", "/brand/vi-huong-polo-non.jpg"],
  },
  {
    slug: "tap-de-dai-vi-huong",
    name: "Tạp dề dài - Nhà hàng Vị Hương",
    material: "Kaki cao cấp",
    printMethod: "Nâu",
    form: "Tạp dề dài, rộng ≈ 60 cm × cao ≈ 80 cm",
    description:
      "<p>Tạp dề dài dành cho nhà hàng, quán ăn, cà phê.</p><ul><li>Vải kaki dày dặn, bền, thoáng khí, dễ giặt, nhanh khô.</li><li>Dây đeo cổ điều chỉnh độ dài, dây buộc hông cố định.</li><li>Túi lớn tiện dụng có ngăn đựng bút.</li><li>Logo in PET sắc nét, bền màu. Kích thước có thể điều chỉnh theo nhu cầu.</li></ul>",
    images: ["/brand/vi-huong-tap-de-dai-maket.jpg", "/brand/vi-huong-bo-dong-phuc.jpg"],
  },
  {
    slug: "tap-de-ngan-vi-huong",
    name: "Tạp dề ngắn - Nhà hàng Vị Hương",
    material: "Kaki cao cấp",
    printMethod: "Nâu",
    form: "Tạp dề ngắn 60 × 40 cm, túi giữa 30 × 18 cm",
    description:
      "<p>Tạp dề ngắn (thắt eo) dành cho nhà hàng, quán ăn, cà phê.</p><ul><li>Vải kaki dày dặn, bền, ít nhăn, dễ vệ sinh.</li><li>Túi giữa rộng rãi, tiện dụng.</li><li>Logo in PET sắc nét, bền màu. Kích thước có thể điều chỉnh theo nhu cầu.</li></ul>",
    images: ["/brand/vi-huong-tap-de-ngan-maket.jpg"],
  },
];

async function products() {
  console.log("5. Sản phẩm Vị Hương");
  const cat = await db.category.findUnique({ where: { slug: "dong-phuc-hang-quan-an" } });
  for (const [i, p] of PRODUCTS.entries()) {
    const { images, ...fields } = p;
    let prod = await db.product.findUnique({ where: { slug: p.slug } });
    if (!prod) {
      prod = await db.product.create({
        data: {
          ...fields,
          status: "active",
          position: i,
          seoDescription: fields.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160),
          images: { create: images.map((url, position) => ({ url, position })) },
        },
      });
      log("tạo", p.slug);
    } else {
      log("đã có", p.slug);
    }
    const linked = await db.categoryProduct.findFirst({ where: { categoryId: cat.id, productId: prod.id } });
    if (!linked) await db.categoryProduct.create({ data: { categoryId: cat.id, productId: prod.id, position: i } });
  }
}

console.log(`refactor-web-data -> ${dbName}`);
await categories();
await menu();
await sliders();
await homeBanners();
await products();
await db.$disconnect();
console.log("Xong.");
