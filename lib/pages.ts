import home from "@/data/pages/home.json";
import lienHe from "@/data/pages/lien-he.json";
import bangGiaAoLop from "@/data/pages/bang-gia-ao-lop.json";
import bangMauVai from "@/data/pages/bang-mau-vai.json";
import collections from "@/data/collections.json";
import news from "@/data/news.json";

export type RawPageData = { slug: string; html: string };

export const rawPages: Record<string, RawPageData> = {
  home,
  "lien-he": lienHe,
  "bang-gia-ao-lop": bangGiaAoLop,
  "bang-mau-vai": bangMauVai,
};

export type Product = {
  href: string;
  name: string;
  img1: string;
  img2: string | null;
};

export function findProduct(
  slug: string
): { product: Product; collection: string } | null {
  for (const c of Object.values(collections)) {
    const product = c.products.find((p) => p.href === `/${slug}`);
    if (product) return { product, collection: c.heading };
  }
  return null;
}

export function findNewsTitle(slug: string): string | null {
  const a = news.find((n) => n.href === `/${slug}`);
  return a ? a.title : null;
}
