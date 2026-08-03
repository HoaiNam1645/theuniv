import RawPage from "@/components/RawPage";
import HomeSwipers from "@/components/HomeSwipers";
import { db } from "@/lib/db";
import { buildHomeHtml } from "@/lib/homeHtml";

// ISR: admin sửa nội dung, tối đa 60s sau trang chủ tự cập nhật
export const revalidate = 60;

export default async function Home() {
  const [sliders, banners, types, brands, testimonials, featured] = await Promise.all([
    db.slider.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    db.banner.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    db.productType.findMany({ where: { showOnHome: true }, orderBy: { position: "asc" } }),
    db.brandLogo.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    db.testimonial.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    db.article.findMany({
      where: { status: "published", isFeatured: true },
      orderBy: { publishedAt: "desc" },
      take: 8,
    }),
  ]);

  // không có bài ghim thì lấy bài mới nhất
  const posts = featured.length
    ? featured
    : await db.article.findMany({
        where: { status: "published" },
        orderBy: { publishedAt: "desc" },
        take: 6,
      });

  const html = buildHomeHtml({ sliders, banners, types, brands, testimonials, posts });

  return (
    <>
      <RawPage html={html} />
      <HomeSwipers />
    </>
  );
}
