import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductForm from "../product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id: Number(id) },
    include: { images: { orderBy: { position: "asc" } }, categories: true, tags: true },
  });
  if (!product) notFound();

  return (
    <>
      <h1 className="admin-title">Sửa: {product.name}</h1>
      <ProductForm product={product} />
    </>
  );
}
