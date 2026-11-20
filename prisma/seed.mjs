// Seed dữ liệu gốc cho MongoDB. Chạy: npm run db:push && npm run seed
// Idempotent: mọi bản ghi upsert theo slug/key (Mongo không có autoincrement để dựa vào id số).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";
import { STUDIO_MENU_LABEL, STUDIO_PATH } from "../lib/studio/paths.mjs";

const prisma = new PrismaClient();
const read = (f) => JSON.parse(readFileSync(join(process.cwd(), "data", f), "utf8"));

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function main() {
  // ==== ADMIN USER ====
  // Mật khẩu lấy từ biến môi trường; nếu không có thì sinh ngẫu nhiên và in ra
  // (không hardcode mật khẩu vào code để an toàn khi đưa lên git).
  //
  // Đặt SEED_ADMIN_PASSWORD thì mật khẩu được ĐẶT LẠI, kể cả khi user đã tồn tại.
  // Trước đây nhánh update để rỗng, nên mật khẩu ngẫu nhiên in ra ở lần seed đầu là
  // thứ duy nhất đăng nhập được — mất dòng log đó là mất luôn quyền vào /admin, và
  // chạy lại seed cũng không cứu được. Không đặt biến thì giữ nguyên mật khẩu cũ,
  // để một lần seed lại dữ liệu mẫu không vô tình đá người đang dùng ra ngoài.
  const wantPassword = process.env.SEED_ADMIN_PASSWORD;
  const password = wantPassword || crypto.randomUUID().slice(0, 12);
  const hashed = bcrypt.hashSync(password, 10);

  await prisma.user.upsert({
    where: { email: "admin@theuni.vn" },
    update: wantPassword ? { password: hashed } : {},
    create: {
      name: "Admin",
      email: "admin@theuni.vn",
      password: hashed,
      role: "admin",
    },
  });

  if (wantPassword) {
    console.log("✓ user admin@theuni.vn — đã đặt lại mật khẩu theo SEED_ADMIN_PASSWORD");
  } else {
    console.log(
      `✓ user admin@theuni.vn — giữ mật khẩu hiện có.\n` +
        `  Quên mật khẩu? Chạy: SEED_ADMIN_PASSWORD='mat-khau-moi' npm run seed\n` +
        `  (mật khẩu dùng khi tạo mới lần đầu: ${password})`,
    );
  }

  // ==== CATEGORIES (danh mục + BST) ====
  const collections = read("collections.json");
  const catDefs = [
    ...Object.values(collections).map((c, i) => ({
      name: c.heading,
      slug: c.slug,
      kind: "collection",
      position: i,
    })),
    { name: "BST Potato", slug: "bst-potato", kind: "bst", position: 10 },
    { name: "BST Áo Lớp", slug: "bst-ao-lop", kind: "bst", position: 11 },
    { name: "BST Áo Doanh Nghiệp", slug: "bst-ao-doanh-nghiep", kind: "bst", position: 12 },
    { name: "BST Áo Thể Thao", slug: "bst-ao-the-thao", kind: "bst", position: 13 },
    { name: "Phụ kiện", slug: "phu-kien-1", kind: "collection", position: 6 },
  ];
  for (const c of catDefs) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  console.log(`✓ ${catDefs.length} categories`);

  // ==== PRODUCTS từ collections.json ====
  let nProd = 0;
  for (const c of Object.values(collections)) {
    const cat = await prisma.category.findUnique({ where: { slug: c.slug } });
    for (let i = 0; i < c.products.length; i++) {
      const p = c.products[i];
      const slug = p.href.replace(/^\//, "");
      const prod = await prisma.product.upsert({
        where: { slug },
        update: {},
        create: {
          name: p.name,
          slug,
          status: "active",
          position: i,
          images: {
            create: [p.img1, p.img2]
              .filter(Boolean)
              .map((url, j) => ({ url, position: j })),
          },
        },
      });
      await prisma.categoryProduct.upsert({
        where: { categoryId_productId: { categoryId: cat.id, productId: prod.id } },
        update: {},
        create: { categoryId: cat.id, productId: prod.id, position: i },
      });
      nProd++;
    }
  }
  console.log(`✓ ${nProd} products`);

  // ==== TAGS từ sidebar.json ====
  const sidebar = read("sidebar.json").html;
  const tagRe = /data-group="([^"]*)" data-field="([^"]*)" data-text="([^"]*)"[^>]*>\s*(?:<i class="fa"(?: style="background:(#[0-9A-Fa-f]{3,6})")?><\/i>)?/g;
  let m, nTag = 0;
  const groupMap = { tag2: "phan_loai", tag3: "kieu_thiet_ke" };
  const seen = new Set();
  while ((m = tagRe.exec(sidebar))) {
    const [, g, field, text, hex] = m;
    if (!text) continue;
    let group = hex ? "mau_sac" : groupMap[g];
    if (!group || field !== "tags") continue;
    const slug = slugify(text);
    const key = `${slug}:${group}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await prisma.tag.upsert({
      where: { slug_group: { slug, group } },
      update: { hexColor: hex || null },
      create: { name: text, slug, group, hexColor: hex || null, position: nTag },
    });
    nTag++;
  }
  console.log(`✓ ${nTag} tags`);

  // ==== HOME DATA ====
  const home = read("home.json");

  // Product types (vòng tròn "Sản phẩm nổi bật")
  for (let i = 0; i < home.danhmuc.length; i++) {
    const d = home.danhmuc[i];
    const slug = (d.href || "").replace(/^\//, "") || slugify(d.name);
    await prisma.productType.upsert({
      where: { slug },
      update: {},
      create: {
        name: d.name,
        slug,
        image: d.img,
        articleSlug: (d.detail || "").replace(/^\//, "") || null,
        showOnHome: true,
        position: i,
      },
    });
  }
  console.log(`✓ ${home.danhmuc.length} product types`);

  // Sliders
  if ((await prisma.slider.count()) === 0) {
    for (let i = 0; i < home.slides.length; i++) {
      const s = home.slides[i];
      await prisma.slider.create({
        data: { title: s.title, imageDesktop: s.img, imageMobile: s.imgMb, link: s.href, position: i },
      });
    }
    console.log(`✓ ${home.slides.length} sliders`);
  }

  // Banners (grid trang chủ)
  if ((await prisma.banner.count()) === 0) {
    for (let i = 0; i < (home.banner4?.items || []).length; i++) {
      const b = home.banner4.items[i];
      await prisma.banner.create({
        data: { slot: `home_grid_${i + 1}`, image: b.img, link: b.href, position: i },
      });
    }
    console.log(`✓ banners`);
  }

  // Brand logos
  if ((await prisma.brandLogo.count()) === 0) {
    for (let i = 0; i < home.brands.length; i++) {
      const b = home.brands[i];
      await prisma.brandLogo.create({
        data: { title: b.title, image: b.img, link: b.href, position: i },
      });
    }
    console.log(`✓ ${home.brands.length} brand logos`);
  }

  // Testimonials
  if ((await prisma.testimonial.count()) === 0) {
    for (let i = 0; i < home.feedbacks.length; i++) {
      const f = home.feedbacks[i];
      await prisma.testimonial.create({
        data: { title: f.title, image: f.img, quote: f.text, link: f.href, position: i },
      });
    }
    console.log(`✓ ${home.feedbacks.length} testimonials`);
  }

  // ==== ARTICLE CATEGORIES + ARTICLES ====
  const artCats = [
    { name: "Thông tin", slug: "thong-tin" },
    { name: "Áo Lớp", slug: "tin-tuc-ao-lop" },
    { name: "Áo Doanh Nghiệp", slug: "tin-tuc-ao-doanh-nghiep" },
    { name: "Cẩm Nang", slug: "cam-nang" },
    { name: "Tin Tức", slug: "tin-tuc" },
    { name: "Thể Thao", slug: "the-thao" },
    { name: "Đồng Phục", slug: "dong-phuc" },
  ];
  for (let i = 0; i < artCats.length; i++) {
    await prisma.articleCategory.upsert({
      where: { slug: artCats[i].slug },
      update: {},
      create: { ...artCats[i], position: i },
    });
  }
  const tinTuc = await prisma.articleCategory.findUnique({ where: { slug: "tin-tuc" } });
  const news = read("news.json");
  let nArt = 0;
  for (const a of news) {
    const slug = a.href.replace(/^\//, "");
    if (!slug || slug.startsWith("http")) continue;
    await prisma.article.upsert({
      where: { slug },
      update: {},
      create: {
        title: a.title,
        slug,
        thumbnail: a.img,
        articleCategoryId: tinTuc.id,
        status: "published",
        publishedAt: new Date(),
      },
    });
    nArt++;
  }
  console.log(`✓ ${artCats.length} article categories, ${nArt} articles`);

  // ==== MENUS từ nav.json ====
  if ((await prisma.menu.count()) === 0) {
    const nav = read("nav.json");
    for (let i = 0; i < nav.length; i++) {
      const item = nav[i];
      // parentId: null ghi tường minh — Mongo phân biệt "field = null" với "field không tồn tại",
      // bỏ trống thì bộ lọc menu cấp 1 (lib/mongo.ts NO_PARENT) không thấy bản ghi này.
      const parent = await prisma.menu.create({
        data: { label: item.label, url: item.href || "#", parentId: null, position: i },
      });
      for (let j = 0; j < (item.subs || []).length; j++) {
        const s = item.subs[j];
        await prisma.menu.create({
          data: { label: s.label, url: s.href || "#", parentId: parent.id, position: j },
        });
      }
    }
    console.log(`✓ menus`);
  }

  // ==== MỤC MENU DẪN VÀO STUDIO ====
  // Nằm ngoài khối nav.json ở trên (khối đó chỉ chạy khi bảng menus còn rỗng): studio
  // ra đời sau khi menu đã có dữ liệu, nên phải tự lo phần idempotent của mình.
  // `menus` không có cột unique nào để upsert theo — khoá tự nhiên ở đây là cặp
  // (location, url), nên tìm theo cặp đó rồi mới quyết định tạo hay cập nhật; chạy seed
  // lại nhiều lần vẫn đúng một mục, mà nhãn/thứ tự sửa trong code vẫn được đồng bộ sang.
  const studioMenu = await prisma.menu.findFirst({
    where: { location: "header", url: STUDIO_PATH.PUBLIC },
  });
  if (studioMenu) {
    await prisma.menu.update({
      where: { id: studioMenu.id },
      data: { label: STUDIO_MENU_LABEL },
    });
  } else {
    // Đặt cuối hàng menu cấp 1 để không xô lệch thứ tự quản trị đã sắp. Lọc cấp 1
    // bằng `!m.parentId` trong JS chứ không viết lại bộ lọc Mongo (lib/mongo.ts
    // NO_PARENT là .ts, seed chạy bằng node nên không import được) — đây đúng là
    // phép lọc mà lib/chromeHtml.ts dùng để dựng menu, nên hai bên không lệch nhau.
    const header = await prisma.menu.findMany({ where: { location: "header" } });
    const lastTop = header.filter((m) => !m.parentId).reduce((max, m) => Math.max(max, m.position), -1);
    await prisma.menu.create({
      data: {
        label: STUDIO_MENU_LABEL,
        url: STUDIO_PATH.PUBLIC,
        parentId: null,
        position: lastTop + 1,
      },
    });
  }
  console.log(`✓ menu studio (${STUDIO_PATH.PUBLIC})`);

  // ==== SETTINGS ====
  const settings = {
    company_name: "CÔNG TY TNHH ĐỒNG PHỤC THE UNI",
    address: "K249/83/4 Hà Huy Tập, Thanh Khê, Đà Nẵng",
    hotline: "039 9259 155",
    email: "theuniclothes@gmail.com",
    facebook_url: "https://facebook.com/",
    instagram_url: "https://www.instagram.com/",
    zalo_phone: "0399259155",
    map_embed_url:
      "https://www.google.com/maps?q=K249%2F83%2F4+H%C3%A0+Huy+T%E1%BA%ADp%2C+Thanh+Kh%C3%AA%2C+%C4%90%C3%A0+N%E1%BA%B5ng&output=embed",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log("✓ settings");
}

main()
  .then(() => console.log("SEED DONE"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
