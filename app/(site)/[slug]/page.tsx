import type { Metadata } from "next";
import RawPage from "@/components/RawPage";
import { rawPages, findNewsTitle } from "@/lib/pages";
import { db } from "@/lib/db";
import { sectionTuVan } from "@/lib/homeHtml";
import {
  buildCollectionHtml,
  buildPaginationHtml,
  buildProductCard,
  buildSidebarHtml,
  type SelectedFilters,
} from "@/lib/collectionHtml";
import {
  buildArticleHtml,
  buildBlogListHtml,
  buildContactHtml,
  buildFaqHtml,
  buildStaticPageHtml,
  buildToc,
} from "@/lib/articleHtml";
import { buildProductDetailHtml, richTuVanHtml } from "@/lib/productHtml";
import { beautifyContent } from "@/lib/contentHtml";
import HomeSwipers from "@/components/HomeSwipers";
import type { Prisma } from "@prisma/client";

const PER_PAGE = 18;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

const parseList = (v: string | undefined) => (v ? v.split(",").filter(Boolean) : []);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await db.category.findUnique({ where: { slug } });
  if (cat) return { title: `${cat.name} - THE UNI` };
  const product = await db.product.findUnique({ where: { slug } });
  if (product) return { title: `${product.name} - THE UNI` };
  const blogCat = await db.articleCategory.findUnique({ where: { slug } });
  if (blogCat) return { title: `${blogCat.name} - THE UNI` };
  const article = await db.article.findUnique({ where: { slug } });
  if (article) return { title: `${article.title} - THE UNI` };
  const page = await db.page.findUnique({ where: { slug } });
  if (page) return { title: `${page.title} - THE UNI` };
  if (slug === "lien-he") return { title: "Liên hệ - THE UNI" };
  if (slug === "cau-hoi-thuong-gap") return { title: "Câu hỏi thường gặp - THE UNI" };
  const raw: Record<string, string> = {
    "tin-tuc": "Tin tức",
    "cam-nang": "Cẩm nang",
    "lien-he": "Liên hệ",
    "bang-gia-ao-lop": "Bảng giá áo lớp",
    "bang-mau-vai": "Bảng màu vải",
  };
  return { title: `${raw[slug] ?? findNewsTitle(slug) ?? "Đang cập nhật"} - THE UNI` };
}

/* ============ TRANG LOẠI SẢN PHẨM (ao-thun, ao-polo...) ============ */
async function TypeCollectionPage({
  ptype,
  sp,
}: {
  ptype: { id: number; name: string };
  sp: Record<string, string | undefined>;
}) {
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = { status: "active", productTypeId: ptype.id };
  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: [{ position: "asc" }, { id: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { images: { orderBy: { position: "asc" }, take: 2 } },
    }),
  ]);
  const html = buildCollectionHtml({
    heading: ptype.name,
    sidebarHtml: "",
    cards: products.map(buildProductCard).join("\n"),
    paginationHtml: buildPaginationHtml(page, Math.ceil(total / PER_PAGE), (p) =>
      `?page=${p}`
    ),
    tuVanHtml: sectionTuVan(),
    fullWidth: true,
    emptyMessage: "Loại sản phẩm này đang được cập nhật mẫu — liên hệ để xem thêm thiết kế nhé!",
  });
  return <RawPage html={html} />;
}

/* ============ TRANG DANH MỤC / BST ============ */
async function CollectionPage({
  cat,
  sp,
}: {
  cat: { id: number; name: string; kind: string; slug: string };
  sp: Record<string, string | undefined>;
}) {
  const selected: SelectedFilters = {
    pl: parseList(sp.pl),
    type: parseList(sp.type),
    ktk: parseList(sp.ktk),
    ms: parseList(sp.ms),
  };
  const page = Math.max(1, Number(sp.page) || 1);

  // điều kiện lọc: trong 1 nhóm là HOẶC, giữa các nhóm là VÀ
  const and: Prisma.ProductWhereInput[] = [];
  if (selected.pl.length)
    and.push({ tags: { some: { tag: { group: "phan_loai", slug: { in: selected.pl } } } } });
  if (selected.ktk.length)
    and.push({ tags: { some: { tag: { group: "kieu_thiet_ke", slug: { in: selected.ktk } } } } });
  if (selected.ms.length)
    and.push({ tags: { some: { tag: { group: "mau_sac", slug: { in: selected.ms } } } } });
  if (selected.type.length) and.push({ productType: { slug: { in: selected.type } } });

  const where: Prisma.ProductWhereInput = {
    status: "active",
    categories: { some: { categoryId: cat.id } },
    AND: and,
  };

  // chỉ hiện lựa chọn lọc THỰC SỰ có sản phẩm trong danh mục này (không có bộ lọc "chết")
  const inCategory = { status: "active" as const, categories: { some: { categoryId: cat.id } } };
  const [total, products, allTags, allTypes, usedTagRows, usedTypeRows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: [{ position: "asc" }, { id: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { images: { orderBy: { position: "asc" }, take: 2 } },
    }),
    db.tag.findMany({ orderBy: { position: "asc" } }),
    db.productType.findMany({ orderBy: { position: "asc" } }),
    db.productTag.findMany({ where: { product: inCategory }, select: { tagId: true }, distinct: ["tagId"] }),
    db.product.findMany({ where: { ...inCategory, productTypeId: { not: null } }, select: { productTypeId: true }, distinct: ["productTypeId"] }),
  ]);
  const usedTagIds = new Set(usedTagRows.map((r) => r.tagId));
  const usedTypeIds = new Set(usedTypeRows.map((r) => r.productTypeId));
  const phanLoai = allTags.filter((t) => t.group === "phan_loai" && usedTagIds.has(t.id));
  const kieuThietKe = allTags.filter((t) => t.group === "kieu_thiet_ke" && usedTagIds.has(t.id));
  const mauSac = allTags.filter((t) => t.group === "mau_sac" && usedTagIds.has(t.id));
  const types = allTypes.filter((t) => usedTypeIds.has(t.id));

  const totalPages = Math.ceil(total / PER_PAGE);
  const makeUrl = (p: number) => {
    const q = new URLSearchParams();
    if (selected.pl.length) q.set("pl", selected.pl.join(","));
    if (selected.type.length) q.set("type", selected.type.join(","));
    if (selected.ktk.length) q.set("ktk", selected.ktk.join(","));
    if (selected.ms.length) q.set("ms", selected.ms.join(","));
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return `/${cat.slug}${qs ? `?${qs}` : ""}`;
  };

  const html = buildCollectionHtml({
    heading: cat.name,
    sidebarHtml: buildSidebarHtml({
      phanLoai: phanLoai.map((t) => ({ slug: t.slug, name: t.name })),
      types: types.map((t) => ({ slug: t.slug, name: t.name })),
      kieuThietKe: kieuThietKe.map((t) => ({ slug: t.slug, name: t.name })),
      mauSac: mauSac.map((t) => ({ slug: t.slug, name: t.name, hexColor: t.hexColor })),
      selected,
    }),
    cards: products.map(buildProductCard).join("\n"),
    paginationHtml: buildPaginationHtml(page, totalPages, makeUrl),
    tuVanHtml: sectionTuVan(),
    emptyMessage:
      cat.kind === "bst"
        ? "Bộ sưu tập đang được cập nhật sản phẩm — quay lại sau nhé!"
        : "Không có sản phẩm phù hợp với bộ lọc — thử bỏ bớt điều kiện lọc nhé!",
  });

  return <RawPage html={html} />;
}

/* ============ TRANG CHI TIẾT SẢN PHẨM ============ */
async function ProductDetail({
  product,
}: {
  product: Prisma.ProductGetPayload<{
    include: { images: true; productType: true; categories: { include: { category: true } } };
  }>;
}) {
  const specs: [string, string][] = [];
  if (product.material) specs.push(["Chất liệu", product.material]);
  if (product.printMethod) specs.push(["Màu vải", product.printMethod]);
  if (product.form) specs.push(["Form áo", product.form]);
  if (product.productType) specs.push(["Loại sản phẩm", product.productType.name]);
  if (product.code) specs.push(["Mã sản phẩm", product.code]);
  if (!specs.length) specs.push(["Thương hiệu", "THE UNI"], ["Tình trạng", "Nhận đặt theo yêu cầu"]);

  const firstCat = product.categories[0]?.category;
  const related = firstCat
    ? await db.product.findMany({
        where: {
          status: "active",
          categories: { some: { categoryId: firstCat.id } },
          NOT: { id: product.id },
        },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        take: 8,
        include: { images: { orderBy: { position: "asc" }, take: 2 } },
      })
    : [];

  const html = buildProductDetailHtml(
    {
      name: product.name,
      slug: product.slug,
      images: product.images,
      specs,
      descriptionHtml: beautifyContent(
        product.description ||
        `<p style="text-align: justify;">Đồng phục tại THE UNI là sự kết hợp hoàn hảo giữa kiểu dáng trẻ trung và thiết kế tinh tế. Sản phẩm sử dụng chất liệu cao cấp, thoáng mát, tạo nên sự đồng nhất, chuyên nghiệp và tự tin cho mỗi thành viên.</p>`
      ),
    },
    related,
    firstCat ? `/${firstCat.slug}` : "/thiet-ke"
  );

  return (
    <>
      <RawPage html={html} />
      <HomeSwipers />
    </>
  );
}

/* ============ ĐIỀU PHỐI THEO SLUG ============ */
export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  // 1. Danh mục / BST (DB — quản lý trong admin)
  const cat = await db.category.findUnique({ where: { slug } });
  if (cat && cat.isActive) return <CollectionPage cat={cat} sp={sp} />;

  // 2. Sản phẩm (DB — quản lý trong admin)
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      productType: true,
      categories: { include: { category: true } },
    },
  });
  if (product && product.status === "active") return <ProductDetail product={product} />;

  // 2b. Trang loại sản phẩm (23 vòng tròn trang chủ: /ao-thun, /ao-polo...)
  const ptype = await db.productType.findUnique({ where: { slug } });
  if (ptype) return <TypeCollectionPage ptype={ptype} sp={sp} />;

  // 3. Chuyên mục bài viết (DB — quản lý trong admin)
  const blogCat = await db.articleCategory.findUnique({ where: { slug } });
  if (blogCat && blogCat.isActive) {
    const page = Math.max(1, Number(sp.page) || 1);
    const PER = 20;
    const whereArt = { status: "published" as const, articleCategoryId: blogCat.id };
    const [tabs, totalArt, arts] = await Promise.all([
      db.articleCategory.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
      db.article.count({ where: whereArt }),
      db.article.findMany({
        where: whereArt,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * PER,
        take: PER,
      }),
    ]);
    const html = buildBlogListHtml({
      heading: blogCat.name.toUpperCase(),
      activeSlug: slug,
      tabs,
      cards: arts,
      paginationHtml: buildPaginationHtml(page, Math.ceil(totalArt / PER), (p) =>
        `/${slug}${p > 1 ? `?page=${p}` : ""}`
      ),
      tuVanHtml: sectionTuVan(),
    });
    return <RawPage html={html} />;
  }

  // 4. Bài viết chi tiết (DB — quản lý trong admin)
  const article = await db.article.findUnique({ where: { slug } });
  if (article && article.status === "published") {
    const related = await db.article.findMany({
      where: {
        status: "published",
        articleCategoryId: article.articleCategoryId,
        NOT: { id: article.id },
      },
      orderBy: { publishedAt: "desc" },
      take: 8,
    });
    const rawBody =
      article.body ||
      `<p><em>Nội dung chi tiết đang được cập nhật — bạn cần tư vấn ngay? Bấm <a href="#contact-form-scroll" style="color:#f4bd24">nhận tư vấn miễn phí</a> bên dưới nhé!</em></p>`;
    const { body, tocHtml } = buildToc(beautifyContent(rawBody));
    const html = buildArticleHtml({
      title: article.title,
      excerptHtml: article.excerpt ? `<p>${article.excerpt}</p>` : "",
      bodyHtml: body,
      tocHtml,
      related,
    });
    return (
      <>
        <RawPage html={html} />
        <HomeSwipers />
      </>
    );
  }

  // 5. FAQ (DB — quản lý trong admin)
  if (slug === "cau-hoi-thuong-gap") {
    const groups = await db.faqCategory.findMany({
      orderBy: { position: "asc" },
      include: { faqs: { where: { isActive: true }, orderBy: { position: "asc" } } },
    });
    const pretty = groups.map((g) => ({
      ...g,
      faqs: g.faqs.map((f) => ({ ...f, answer: beautifyContent(f.answer) })),
    }));
    return <RawPage html={buildFaqHtml(pretty, sectionTuVan())} />;
  }

  // 6. Liên hệ (settings — cùng nguồn với footer)
  if (slug === "lien-he") {
    const rows = await db.setting.findMany();
    const st: Record<string, string> = {};
    for (const r of rows) st[r.key] = r.value || "";
    return <RawPage html={buildContactHtml(st)} />;
  }

  // 7. Trang tĩnh: chính sách, điều khoản (DB — quản lý trong admin)
  const staticPage = await db.page.findUnique({ where: { slug } });
  if (staticPage && staticPage.status === "published") {
    return <RawPage html={buildStaticPageHtml(staticPage.title, beautifyContent(staticPage.body || ""))} />;
  }

  // 8. Trang snapshot còn sót (nếu có)
  const raw = rawPages[slug];
  if (raw) return <RawPage html={raw.html} />;

  // 4. Chưa có nội dung
  const title = findNewsTitle(slug) ?? "NỘI DUNG ĐANG CẬP NHẬT";
  return (
    <div className="bodywrap" style={{ minHeight: "50vh" }}>
      <div className="container">
        <div className="title_white_new">
          <h1 className="title-confiden-product-home" style={{ marginTop: 44 }}>{title}</h1>
          <p className="line-bottom-title"></p>
          <p className="subtitle-confiden-product text-center" style={{ color: "#fff" }}>
            Nội dung của trang này đang được cập nhật. Vui lòng quay lại{" "}
            <a href="/" style={{ color: "#f4bd24" }}>trang chủ</a> hoặc{" "}
            <a href="/lien-he" style={{ color: "#f4bd24" }}>liên hệ</a> với chúng tôi.
          </p>
        </div>
      </div>
    </div>
  );
}
