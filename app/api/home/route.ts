import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// JSON công khai của dữ liệu trang chủ — dùng để kiểm tra / mobile app sau này.
// Trang chủ web KHÔNG gọi endpoint này (render server-side để tốt SEO),
// cả hai cùng đọc chung một database.
export const revalidate = 60;

export async function GET() {
  const [sliders, banners, types, brands, testimonials, posts] = await Promise.all([
    db.slider.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    db.banner.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    db.productType.findMany({ where: { showOnHome: true }, orderBy: { position: "asc" } }),
    db.brandLogo.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    db.testimonial.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    db.article.findMany({
      where: { status: "published", isFeatured: true },
      orderBy: { publishedAt: "desc" },
      take: 8,
      select: { title: true, slug: true, thumbnail: true, excerpt: true, publishedAt: true },
    }),
  ]);

  return NextResponse.json(
    { sliders, banners, productTypes: types, brandLogos: brands, testimonials, featuredArticles: posts },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
