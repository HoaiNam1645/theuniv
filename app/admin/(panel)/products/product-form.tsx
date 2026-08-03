import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { Prisma, ProductStatus } from "@prisma/client";
import ImagesField from "@/components/admin/ImagesField";
import RichText from "@/components/admin/RichText";
import { flash } from "@/lib/flash";

type ProductWithRels = Prisma.ProductGetPayload<{
  include: { images: true; categories: true; tags: true };
}>;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default async function ProductForm({ product }: { product?: ProductWithRels }) {
  const [categories, types, tags] = await Promise.all([
    db.category.findMany({ orderBy: { position: "asc" } }),
    db.productType.findMany({ orderBy: { position: "asc" } }),
    db.tag.findMany({ orderBy: [{ group: "asc" }, { position: "asc" }] }),
  ]);

  const selectedCats = new Set(product?.categories.map((c) => c.categoryId) || []);
  const selectedTags = new Set(product?.tags.map((t) => t.tagId) || []);
  const tagGroups: { key: string; label: string }[] = [
    { key: "phan_loai", label: "Phân loại" },
    { key: "kieu_thiet_ke", label: "Kiểu thiết kế" },
    { key: "mau_sac", label: "Màu sắc" },
  ];

  async function save(formData: FormData) {
    "use server";
    const id = formData.get("id") ? Number(formData.get("id")) : null;
    const name = String(formData.get("name") || "").trim();
    if (!name) redirect(id ? `/admin/products/${id}` : "/admin/products/new");
    const slug = slugify(String(formData.get("slug") || "") || name);
    const images = String(formData.get("images") || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const catIds = formData.getAll("categories").map(Number);
    const tagIds = formData.getAll("tags").map(Number);

    const data = {
      name,
      slug,
      productTypeId: formData.get("productTypeId") ? Number(formData.get("productTypeId")) : null,
      material: String(formData.get("material") || "") || null,
      printMethod: String(formData.get("printMethod") || "") || null,
      form: String(formData.get("form") || "") || null,
      code: String(formData.get("code") || "") || null,
      description: String(formData.get("description") || "") || null,
      status: String(formData.get("status")) as ProductStatus,
    };

    let pid: number;
    if (id) {
      await db.product.update({ where: { id }, data });
      await db.productImage.deleteMany({ where: { productId: id } });
      await db.categoryProduct.deleteMany({ where: { productId: id } });
      await db.productTag.deleteMany({ where: { productId: id } });
      pid = id;
    } else {
      const created = await db.product.create({ data });
      pid = created.id;
    }
    if (images.length)
      await db.productImage.createMany({
        data: images.map((url, i) => ({ productId: pid, url, position: i })),
      });
    if (catIds.length)
      await db.categoryProduct.createMany({
        data: catIds.map((categoryId) => ({ categoryId, productId: pid })),
      });
    if (tagIds.length)
      await db.productTag.createMany({
        data: tagIds.map((tagId) => ({ productId: pid, tagId })),
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
                <option value="active">Hiển thị</option>
                <option value="hidden">Ẩn</option>
                <option value="draft">Nháp</option>
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

          {tagGroups.map((g) => (
            <div className="panel" key={g.key}>
              <h3>{g.label}</h3>
              <div className="check-list">
                {tags
                  .filter((t) => t.group === g.key)
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
        <a href="/admin/products">Hủy bỏ</a>
      </div>
    </form>
  );
}
