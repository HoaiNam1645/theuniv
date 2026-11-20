import RawPage from "@/components/RawPage";
import HomeSwipers from "@/components/HomeSwipers";
import { db } from "@/lib/db";
import { buildHomeHtml } from "@/lib/homeHtml";
import { readHomeLayout } from "@/lib/homeLayout";
import { SITE_DESCRIPTION, SITE_NAME, buildMetadata, organizationJsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: `${SITE_NAME} — Đồng phục lớp, nhóm, doanh nghiệp`,
  description: SITE_DESCRIPTION,
  path: "/",
});

// ISR: admin sửa nội dung, tối đa 60s sau trang chủ tự cập nhật
export const revalidate = 60;

export default async function Home() {
  const [layout, sliders, banners, types, brands, testimonials, featured] = await Promise.all([
    readHomeLayout(),
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

    const html = buildHomeHtml(
    { sliders, banners, types, brands, testimonials, posts },
    layout,
  );

  const settings = await db.setting.findMany({
    where: { key: { in: ["site_logo", "hotline"] } },
  });
  const byKey = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            organizationJsonLd({ logo: byKey.site_logo, phone: byKey.hotline }),
          ),
        }}
      />
      <RawPage html={html} />
      <HomeSwipers />
    </>
  );
}
