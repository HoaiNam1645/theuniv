import type { Metadata } from "next";
import RawPage from "@/components/RawPage";
import { db } from "@/lib/db";
import { buildPaginationHtml, buildSearchCard, buildSearchHtml } from "@/lib/collectionHtml";

const PER_PAGE = 28;

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
    ? { status: "active" as const, name: { contains: q } }
    : { status: "active" as const };

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

  const totalPages = Math.ceil(total / PER_PAGE);
  const makeUrl = (p: number) =>
    `/search?query=${encodeURIComponent(q)}&type=product${p > 1 ? `&page=${p}` : ""}`;

  const html = buildSearchHtml({
    query: q,
    total,
    cards: products.map(buildSearchCard).join("\n"),
    paginationHtml: buildPaginationHtml(page, totalPages, makeUrl),
  });

  return <RawPage html={html} />;
}
