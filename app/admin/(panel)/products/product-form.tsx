import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { Prisma, ProductStatus } from "@prisma/client";
import ImagesField from "@/components/admin/ImagesField";
import RichText from "@/components/admin/RichText";
import { flash } from "@/lib/flash";
import { oid } from "@/lib/mongo";
import {
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_ORDER,
  TAG_GROUP_LABEL,
  TAG_GROUP_ORDER,
  saveProduct,
} from "@/lib/products";

type ProductWithRels = Prisma.ProductGetPayload<{
  include: { images: true; categories: true; tags: true };
}>;

export default async function ProductForm({ product }: { product?: ProductWithRels }) {
  const [categories, types, tags] = await Promise.all([
    db.category.findMany({ orderBy: { position: "asc" } }),
    db.productType.findMany({ orderBy: { position: "asc" } }),
    db.tag.findMany({ orderBy: [{ group: "asc" }, { position: "asc" }] }),
  ]);

  const selectedCats = new Set(product?.categories.map((c) => c.categoryId) || []);
  const selectedTags = new Set(product?.tags.map((t) => t.tagId) || []);

  async function save(formData: FormData) {
    "use server";
    const id = oid(formData.get("id")) || null;
    const name = String(formData.get("name") || "").trim();
    if (!name) redirect(id ? `/admin/products/${id}` : "/admin/products/new");

    // Ghi qua saveProduct() — cùng đường mà studio thiết kế dùng để xuất bản.
    await saveProduct({
      id,
      name,
      slug: String(formData.get("slug") || ""),
      productTypeId: oid(formData.get("productTypeId")) || null,
      material: String(formData.get("material") || "") || null,
      printMethod: String(formData.get("printMethod") || "") || null,
      form: String(formData.get("form") || "") || null,
      code: String(formData.get("code") || "") || null,
      description: String(formData.get("description") || "") || null,
      status: String(formData.get("status")) as ProductStatus,
      imageUrls: String(formData.get("images") || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      categoryIds: formData.getAll("categories").map(String),
      tagIds: formData.getAll("tags").map(String),
    });

    await flash(id ? "Đã lưu sản phẩm" : "Đã thêm sản phẩm mới");
    revalidatePath("/admin/products");
    redirect("/admin/products");
  }

  return (
    <form className="edit-form" action={save}>
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="edit-grid">
        <div className="edit-main panel">
          <label>
            Tên sản phẩm *
            <input name="name" required defaultValue={product?.name || ""} />
          </label>
          <label>
            Slug (đường dẫn, bỏ trống sẽ tự tạo từ tên)
            <input name="slug" defaultValue={product?.slug || ""} placeholder="ao-lop-abc" />
          </label>
          <div className="row-3">
            <label>
              Chất liệu
              <input name="material" defaultValue={product?.material || ""} placeholder="Vải mango" />
            </label>
            <label>
              In / Màu vải
              <input name="printMethod" defaultValue={product?.printMethod || ""} placeholder="Ép nhiệt" />
            </label>
            <label>
              Form áo / Mã
              <input name="form" defaultValue={product?.form || ""} placeholder="Sơ mi cổ vest" />
            </label>
          </div>
          <label>Mô tả sản phẩm</label>
          <RichText name="description" defaultValue={product?.description || ""} minHeight={180}
            placeholder="Mô tả ngắn về chất liệu, kiểu dáng... (không bắt buộc)" />
          <label>
            Ảnh sản phẩm — mỗi dòng 1 URL (ảnh đầu là ảnh đại diện)
            <ImagesField name="images" defaultValue={product?.images.map((i) => i.url).join("\n") || ""} />
          </label>
        </div>

        <div className="edit-side">
          <div className="panel">
            <h3>Hiển thị</h3>
            <label>
              Trạng thái
              <select name="status" defaultValue={product?.status || "active"}>
                {PRODUCT_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{PRODUCT_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </label>
            <label>
              Loại sản phẩm
              <select name="productTypeId" defaultValue={product?.productTypeId || ""}>
                <option value="">— Chọn —</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label>
              Mã sản phẩm
              <input name="code" defaultValue={product?.code || ""} placeholder="25303" />
            </label>
          </div>

          <div className="panel">
            <h3>Danh mục / BST</h3>
            <div className="check-list">
              {categories.map((c) => (
                <label key={c.id} className="check">
                  <input
                    type="checkbox"
                    name="categories"
                    value={c.id}
                    defaultChecked={selectedCats.has(c.id)}
                  />
                  {c.name} {c.kind === "bst" && <em>(BST)</em>}
                </label>
              ))}
            </div>
          </div>

          {TAG_GROUP_ORDER.map((g) => (
            <div className="panel" key={g}>
              <h3>{TAG_GROUP_LABEL[g]}</h3>
              <div className="check-list">
                {tags
                  .filter((t) => t.group === g)
                  .map((t) => (
                    <label key={t.id} className="check">
                      <input
                        type="checkbox"
                        name="tags"
                        value={t.id}
                        defaultChecked={selectedTags.has(t.id)}
                      />
                      {t.hexColor && (
                        <i className="color-dot" style={{ background: t.hexColor }} />
                      )}
                      {t.name}
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="edit-actions">
        <button className="btn" type="submit">Lưu sản phẩm</button>
        <Link href="/admin/products">Hủy bỏ</Link>
      </div>
    </form>
  );
}
