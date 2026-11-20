import type { Metadata } from "next";

/**
 * Nguồn sự thật cho phần SEO: URL gốc, hậu tố tiêu đề, và cách dựng metadata.
 *
 * Trước đây mỗi trang chỉ đặt `title`, nên MỌI trang dùng chung một `description`
 * khai ở `app/layout.tsx` — Google thấy 100+ trang mô tả giống hệt nhau, và không
 * trang nào có canonical hay OpenGraph. Gom về đây để mọi trang dựng metadata
 * theo cùng một cách, thay vì mỗi chỗ tự chế một nửa.
 */

/** Tên miền thật. Dùng cho canonical, OpenGraph và sitemap — bắt buộc là URL tuyệt đối. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://theuni.vn";

export const SITE_NAME = "THE UNI";

/** Hậu tố tiêu đề. Gõ tay ở 6 chỗ trong [slug]/page.tsx trước đây. */
export const TITLE_SUFFIX = ` - ${SITE_NAME}`;

export const SITE_DESCRIPTION =
  "Công ty TNHH Đồng Phục THE UNI là thương hiệu sản xuất đồng phục chất lượng, thiết kế trẻ trung, được nhiều học sinh, đội nhóm, doanh nghiệp yêu thích và tin dùng.";

/** Độ dài mô tả Google thường cắt. Dài hơn thì phần thừa không hiển thị. */
const DESCRIPTION_MAX = 160;

/**
 * URL tuyệt đối từ một đường dẫn nội bộ.
 *
 * Ảnh trong dự án này có hai dạng: `/uploads/...` do mình lưu, và link tuyệt đối
 * hotlink từ CDN của theme cũ. Ghép tiền tố vô điều kiện biến link CDN thành
 * `https://theuni.vn/https://bizweb...` — og:image hỏng mà không ai thấy, vì nó
 * chỉ lộ ra lúc dán link lên Facebook/Zalo.
 */
export const absoluteUrl = (path: string) =>
  /^https?:\/\//i.test(path)
    ? path
    : new URL(path.startsWith("/") ? path : `/${path}`, SITE_URL).toString();

/**
 * HTML -> đoạn mô tả sạch.
 *
 * Bài viết trong dự án này lưu HTML nguyên khối và `excerpt` thường trống, nên
 * mô tả phải rút từ thân bài. Bỏ thẻ, gom khoảng trắng, cắt theo RANH GIỚI TỪ —
 * cắt giữa từ tạo ra đoạn mô tả trông như lỗi.
 */
export function excerptFrom(html: string | null | undefined, max = DESCRIPTION_MAX): string {
  if (!html) return "";
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export interface PageSeo {
  title: string;
  description?: string | null;
  /** Đường dẫn nội bộ, ví dụ "/tin-tuc" — dùng cho canonical và og:url. */
  path: string;
  image?: string | null;
  /** Bài viết thì truyền thêm để có og:type=article + thời gian đăng. */
  publishedTime?: Date | string | null;
  modifiedTime?: Date | string | null;
  /** Trang mỏng (chuyên mục chưa có bài) — không cho lập chỉ mục. */
  noIndex?: boolean;
}

/**
 * Dựng metadata đầy đủ cho một trang: title, description, canonical, OpenGraph,
 * Twitter card. Thiếu canonical là hai URL cùng nội dung tự cạnh tranh nhau;
 * thiếu OpenGraph là link dán lên Facebook/Zalo ra một ô trắng không ảnh.
 */
export function buildMetadata(seo: PageSeo): Metadata {
  const description = (seo.description || "").trim() || SITE_DESCRIPTION;
  const url = absoluteUrl(seo.path);
  const image = seo.image ? absoluteUrl(seo.image) : undefined;
  const isArticle = Boolean(seo.publishedTime);

  return {
    title: `${seo.title}${TITLE_SUFFIX}`,
    description,
    alternates: { canonical: url },
    ...(seo.noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: isArticle ? "article" : "website",
      siteName: SITE_NAME,
      locale: "vi_VN",
      title: `${seo.title}${TITLE_SUFFIX}`,
      description,
      url,
      ...(image ? { images: [{ url: image }] } : {}),
      ...(isArticle
        ? {
            publishedTime: toIso(seo.publishedTime),
            modifiedTime: toIso(seo.modifiedTime ?? seo.publishedTime),
          }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${seo.title}${TITLE_SUFFIX}`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

const toIso = (v: Date | string | null | undefined) =>
  v ? (v instanceof Date ? v.toISOString() : new Date(v).toISOString()) : undefined;

/** Dữ liệu có cấu trúc cho một bài viết (Google hiểu để hiện rich result). */
export function articleJsonLd(a: {
  title: string;
  path: string;
  description?: string | null;
  image?: string | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  author?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.title,
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(a.path) },
    ...(a.description ? { description: a.description } : {}),
    ...(a.image ? { image: [absoluteUrl(a.image)] } : {}),
    ...(a.publishedAt ? { datePublished: toIso(a.publishedAt) } : {}),
    ...(a.updatedAt ? { dateModified: toIso(a.updatedAt) } : {}),
    author: { "@type": "Organization", name: a.author || SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

/** Đường dẫn phân cấp — Google dùng để hiện breadcrumb thay cho URL trần. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

/** Tổ chức + website, đặt ở trang chủ. */
export function organizationJsonLd(opts: { logo?: string | null; phone?: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    ...(opts.logo ? { logo: absoluteUrl(opts.logo) } : {}),
    ...(opts.phone ? { telephone: opts.phone } : {}),
  };
}
