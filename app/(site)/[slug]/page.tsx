import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  SITE_NAME,
  TITLE_SUFFIX,
  articleJsonLd,
  breadcrumbJsonLd,
  buildMetadata,
  excerptFrom,
} from "@/lib/seo";
import RawPage from "@/components/RawPage";
import { rawPages, findNewsTitle } from "@/lib/pages";
import { db } from "@/lib/db";
import { pageSliderHtml, sectionTuVan } from "@/lib/homeHtml";
import { CHROME_SETTING, zaloChatUrl } from "@/lib/chromeHtml";
import { CONTACT_FORM_ID } from "@/lib/siteDom";
import {
  PRODUCT_CARD_INCLUDE,
  buildCollectionHtml,
  buildPaginationHtml,
  buildProductCard,
  buildSidebarHtml,
  type SelectedFilters,
} from "@/lib/collectionHtml";
import {
  CONTENT_PAGE,
  NOT_FOUND_PAGE,
  buildArticleHtml,
  buildContactHtml,
  buildStaticPageHtml,
  buildToc,
} from "@/lib/articleHtml";
import { buildProductDetailHtml } from "@/lib/productHtml";
import { HOME_CRUMB } from "@/lib/layoutHtml";
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
  const path = `/${slug}`;

  const cat = await db.category.findUnique({ where: { slug } });
  if (cat?.isActive) {
    return buildMetadata({
      title: cat.seoTitle || cat.name,
      description: cat.seoDescription || excerptFrom(cat.description),
      path,
      image: cat.bannerImage,
    });
  }

  const product = await db.product.findUnique({
    where: { slug },
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
  });
  if (product) {
    return buildMetadata({
      title: product.seoTitle || product.name,
      description: product.seoDescription || excerptFrom(product.description),
      path,
      image: product.images[0]?.url,
    });
  }

  const article = await db.article.findUnique({ where: { slug } });
  if (article) {
    return buildMetadata({
      title: article.seoTitle || article.title,
      // Ưu tiên chữ người viết đặt; không có thì rút từ thân bài. `excerpt` và
      // `seoDescription` hiện đang trống ở toàn bộ 20 bài, nên nhánh cuối mới là
      // nhánh chạy thật.
      description: article.seoDescription || article.excerpt || excerptFrom(article.body),
      path,
      image: article.thumbnail,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    });
  }

  const page = await db.page.findUnique({ where: { slug } });
  if (page) {
    return buildMetadata({
      title: page.seoTitle || page.title,
      description: page.seoDescription || excerptFrom(page.body),
      path,
    });
  }

  if (slug === CONTENT_PAGE.CONTACT.slug) {
    return buildMetadata({
      title: CONTENT_PAGE.CONTACT.title,
      description: `Liên hệ ${SITE_NAME} để được tư vấn và báo giá đồng phục.`,
      path,
    });
  }

  const raw: Record<string, string> = {
    "lien-he": "Liên hệ",
    "bang-gia-ao-lop": "Bảng giá áo lớp",
    "bang-mau-vai": "Bảng màu vải",
  };
  const known = raw[slug] ?? findNewsTitle(slug);
  if (known) return buildMetadata({ title: known, path });

  // Không khớp gì -> trang sẽ trả 404, metadata chỉ để không lọt chỉ mục.
  return { title: `${NOT_FOUND_PAGE.TITLE}${TITLE_SUFFIX}`, robots: { index: false, follow: true } };
}

/* ============ TRANG LOẠI SẢN PHẨM (ao-thun, ao-polo...) ============ */
async function TypeCollectionPage({
  ptype,
  sp,
}: {
  ptype: { id: string; name: string };
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
      include: PRODUCT_CARD_INCLUDE,
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
    emptyMessage: "Loại sản phẩm này đang được cập nhật mẫu — liên hệ để xem thêm thiết kế nhé!",
  });
  return <RawPage html={html} />;
}

/* ============ TRANG DANH MỤC / BST ============ */
async function CollectionPage({
  cat,
  sp,
}: {
  cat: {
    id: string;
    name: string;
    kind: string;
    slug: string;
    description: string | null;
    bannerImage: string | null;
  };
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
  const [total, products, allTags, allTypes, usedTagRows, usedTypeRows, slides, zaloRows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: [{ position: "asc" }, { id: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: PRODUCT_CARD_INCLUDE,
    }),
    db.tag.findMany({ orderBy: { position: "asc" } }),
    db.productType.findMany({ orderBy: { position: "asc" } }),
    db.productTag.findMany({ where: { product: inCategory }, select: { tagId: true }, distinct: ["tagId"] }),
    db.product.findMany({ where: { ...inCategory, productTypeId: { not: null } }, select: { productTypeId: true }, distinct: ["productTypeId"] }),
    // Slider gắn trang này (admin: Giao diện trang chủ → Slider → "Hiện ở trang").
    db.slider.findMany({ where: { page: cat.slug, isActive: true }, orderBy: { position: "asc" } }),
    db.setting.findMany({ where: { key: { in: [CHROME_SETTING.ZALO, CHROME_SETTING.ZALO_PHONE] } } }),
  ]);
  const zalo = zaloChatUrl(Object.fromEntries(zaloRows.map((r) => [r.key, r.value || ""])));
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
    descriptionHtml: cat.description,
    heroImage: cat.bannerImage,
    heroActionsHtml: categoryActions(zalo),
    sliderHtml: pageSliderHtml(slides),
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

  return (
    <>
      <RawPage html={html} />
      {slides.length > 0 && <HomeSwipers />}
    </>
  );
}

/** Nút ở đầu trang danh mục: báo giá qua Zalo (chốt đơn chính) + cuộn tới form tư vấn. */
function categoryActions(zalo: string) {
  const quote = zalo
    ? `<a class="uni-btn uni-btn--primary uni-btn--chat" href="${zalo.replace(/"/g, "&quot;")}" target="_blank" rel="noopener">Báo giá qua Zalo</a>`
    : "";
  return `${quote}<a class="uni-btn uni-btn--outline" href="#${CONTACT_FORM_ID}">Nhận tư vấn</a>`;
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

  // Sản phẩm liên quan lấy theo danh mục đầu tiên kể cả danh mục đã tắt (nhóm sản phẩm vẫn đúng);
  // còn link "Thiết kế tương tự" chỉ trỏ tới danh mục đang bật, không thì về trang chủ.
  const firstCat = product.categories[0]?.category;
  const liveCat = product.categories.find((c) => c.category.isActive)?.category;
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
    liveCat ? `/${liveCat.slug}` : HOME_CRUMB.path
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

  // 3. Bài viết chi tiết (trang danh sách chuyên mục đã bỏ; bài vẫn mở được vì trang chủ link tới) (DB — quản lý trong admin)
  const article = await db.article.findUnique({
    where: { slug },
  });
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
    // Dữ liệu có cấu trúc: Google dùng để hiện ngày đăng, tác giả và ảnh trong
    // kết quả tìm kiếm, và để hiện breadcrumb thay cho URL trần.
    const jsonLd = [
      articleJsonLd({
        title: article.title,
        path: `/${slug}`,
        description: article.seoDescription || article.excerpt || excerptFrom(article.body),
        image: article.thumbnail,
        publishedAt: article.publishedAt,
        updatedAt: article.updatedAt,
        author: article.author,
      }),
      // Không có tầng chuyên mục: trang danh sách chuyên mục không còn.
      breadcrumbJsonLd([HOME_CRUMB, { name: article.title, path: `/${slug}` }]),
    ];

    return (
      <>
        <script
          type="application/ld+json"
          // Nội dung do mình dựng từ dữ liệu đã escape, không phải HTML người dùng nhập.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <RawPage html={html} />
        <HomeSwipers />
      </>
    );
  }

  // 4. Liên hệ (settings — cùng nguồn với footer)
  if (slug === CONTENT_PAGE.CONTACT.slug) {
    const rows = await db.setting.findMany();
    const st: Record<string, string> = {};
    for (const r of rows) st[r.key] = r.value || "";
    return <RawPage html={buildContactHtml(st)} />;
  }

  // 5. Trang tĩnh: chính sách, điều khoản (DB — quản lý trong admin)
  const staticPage = await db.page.findUnique({ where: { slug } });
  if (staticPage && staticPage.status === "published") {
    return <RawPage html={buildStaticPageHtml(staticPage.title, beautifyContent(staticPage.body || ""))} />;
  }

  // 6. Trang snapshot còn sót (nếu có)
  const raw = rawPages[slug];
  // Snapshot có khối "Nội dung liên quan" là slider — cần HomeSwipers như trang bài viết.
  if (raw)
    return (
      <>
        <RawPage html={raw.html} />
        <HomeSwipers />
      </>
    );

  // Không khớp gì cả -> 404 THẬT.
  //
  // Trước đây chỗ này render một trang "Đang cập nhật" kèm mã 200, nghĩa là MỌI
  // đường dẫn bịa ra đều là một trang hợp lệ với Google: /sitemap.xml, /robots.txt,
  // mọi link gõ sai, mọi URL crawler tự nghĩ ra. Đó là soft 404 — Google lập chỉ
  // mục rác vô hạn và loãng hẳn thứ hạng của trang thật.
  //
  // `notFound()` trả đúng 404 và render app/not-found.tsx.
  notFound();
}
