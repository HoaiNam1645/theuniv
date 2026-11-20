import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isObjectId } from "@/lib/mongo";
import ProductForm from "../product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isObjectId(id)) notFound(); // id rác từ URL -> 404 thay vì lỗi query
  const product = await db.product.findUnique({
    where: { id },
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
