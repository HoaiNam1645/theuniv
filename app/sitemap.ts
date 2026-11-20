import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

/**
 * sitemap.xml — trước đây KHÔNG tồn tại: `/sitemap.xml` rơi vào route bắt-tất-cả
 * và trả về trang "Đang cập nhật" kèm mã 200, nên Google không có danh sách URL
 * nào để đi theo ngoài việc tự dò link.
 *
 * Chỉ liệt kê trang có nội dung thật. Chuyên mục CHƯA CÓ BÀI bị loại: đưa trang
 * rỗng vào sitemap là tự mời Google lập chỉ mục trang mỏng, kéo tụt chất lượng
 * tổng thể của tên miền.
 *
 * `dynamic = "force-dynamic"` vì danh sách bài viết đổi theo admin; sitemap dựng
 * sẵn lúc build sẽ đứng im cho tới lần deploy sau.
 */
export const dynamic = "force-dynamic";

/** Mức ưu tiên tương đối giữa các loại trang — chỉ là gợi ý cho crawler. */
const PRIORITY = {
  home: 1,
  blogIndex: 0.8,
  article: 0.7,
  productType: 0.8,
  product: 0.6,
  page: 0.4,
} as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, blogCats, types, products, pages, categories] = await Promise.all([
    db.article.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
    }),
    db.articleCategory.findMany({
      where: { isActive: true },
      select: { id: true, slug: true },
    }),
    db.productType.findMany({ select: { slug: true } }),
    db.product.findMany({
      where: { status: "active" },
      select: { slug: true, updatedAt: true },
    }),
    db.page.findMany({ where: { status: "published" }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);

  // Chuyên mục blog chỉ vào sitemap khi thực sự có bài đã đăng.
  const catCounts = await Promise.all(
    blogCats.map((c) =>
      db.article.count({ where: { articleCategoryId: c.id, status: "published" } }),
    ),
  );
  const usedBlogCats = blogCats.filter((_, i) => catCounts[i] > 0);

  const now = new Date();
  const entry = (
    path: string,
    lastModified: Date | null | undefined,
    priority: number,
  ): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    lastModified: lastModified ?? now,
    priority,
  });

  return [
    { url: SITE_URL, lastModified: now, priority: PRIORITY.home },
    ...usedBlogCats.map((c) => entry(`/${c.slug}`, null, PRIORITY.blogIndex)),
    ...articles.map((a) => entry(`/${a.slug}`, a.updatedAt ?? a.publishedAt, PRIORITY.article)),
    ...types.map((t) => entry(`/${t.slug}`, null, PRIORITY.productType)),
    ...categories.map((c) => entry(`/${c.slug}`, c.updatedAt, PRIORITY.productType)),
    ...products.map((p) => entry(`/${p.slug}`, p.updatedAt, PRIORITY.product)),
    ...pages.map((p) => entry(`/${p.slug}`, p.updatedAt, PRIORITY.page)),
  ];
}
