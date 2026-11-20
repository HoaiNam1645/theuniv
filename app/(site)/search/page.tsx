import type { Metadata } from "next";
import RawPage from "@/components/RawPage";
import { db } from "@/lib/db";
import { like } from "@/lib/mongo";
import {
  PRODUCT_CARD_INCLUDE,
  buildPaginationHtml,
  buildProductCard,
  buildSearchHtml,
  searchUrl,
} from "@/lib/collectionHtml";

// Bội số của 6: lưới 3 cột (máy tính) và 2 cột (điện thoại) trang nào cũng kín hàng.
const PER_PAGE = 30;

type Props = { searchParams: Promise<{ query?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { query } = await searchParams;
  return { title: `${query || "Tìm kiếm"} - Tìm kiếm - THE UNI` };
}

export default async function SearchPage({ searchParams }: Props) {
  const { query = "", page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const q = query.trim();

  const where = q
    ? { status: "active" as const, name: like(q) }
    : { status: "active" as const };

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

  const totalPages = Math.ceil(total / PER_PAGE);

  const html = buildSearchHtml({
    query: q,
    total,
    cards: products.map(buildProductCard).join("\n"),
    paginationHtml: buildPaginationHtml(page, totalPages, (p) => searchUrl(q, p)),
  });

  return <RawPage html={html} />;
}
