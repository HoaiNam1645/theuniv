import home from "@/data/pages/home.json";
import aoLop from "@/data/pages/ao-lop.json";
import aoNhom from "@/data/pages/ao-nhom.json";
import aoCongTy from "@/data/pages/ao-cong-ty.json";
import aoTheThao from "@/data/pages/ao-the-thao.json";
import thietKe from "@/data/pages/thiet-ke.json";
import tinTuc from "@/data/pages/tin-tuc.json";
import camNang from "@/data/pages/cam-nang.json";
import lienHe from "@/data/pages/lien-he.json";
import bangGiaAoLop from "@/data/pages/bang-gia-ao-lop.json";
import bangMauVai from "@/data/pages/bang-mau-vai.json";
import collections from "@/data/collections.json";
import news from "@/data/news.json";

export type RawPageData = { slug: string; html: string };

export const rawPages: Record<string, RawPageData> = {
  home,
  "ao-lop": aoLop,
  "ao-nhom": aoNhom,
  "ao-cong-ty": aoCongTy,
  "ao-the-thao": aoTheThao,
  "thiet-ke": thietKe,
  "tin-tuc": tinTuc,
  "cam-nang": camNang,
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
