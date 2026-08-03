import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import Icon from "@/components/admin/Icon";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { flash } from "@/lib/flash";

const num = (v: FormDataEntryValue | null) => (v ? Number(v) || 0 : 0);
const str = (v: FormDataEntryValue | null) => String(v || "").trim();

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; tab?: string }>;
}) {
  const { q, cat, tab } = await searchParams;
  const allCats = await db.category.findMany({
    orderBy: [{ kind: "asc" }, { position: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  if (tab === "cats") {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>Danh mục &amp; Bộ sưu tập</h1>
            <p>Các trang danh mục sản phẩm trên website. Gán sản phẩm vào danh mục ở form sửa sản phẩm.</p>
          </div>
        </div>
        <div className="seg">
          <Link href="/admin/products">Sản phẩm</Link>
          <Link href="/admin/products?tab=cats" className="active">Danh mục &amp; BST</Link>
        </div>
        <div className="panel panel-plain">
          <table className="admin-table table-editor">
            <thead>
              <tr>
                <th>Tên danh mục</th>
                <th>Đường dẫn</th>
                <th style={{ width: 110 }}>Loại</th>
                <th style={{ width: 90 }}>Số SP</th>
                <th style={{ width: 64 }}>Thứ tự</th>
                <th style={{ width: 46 }}>Hiện</th>
                <th style={{ width: 92 }}></th>
              </tr>
            </thead>
            <tbody>
              {allCats.map((c) => (
                <tr key={c.id}>
                  <td><input form={`ct${c.id}`} name="name" defaultValue={c.name} /></td>
                  <td><input form={`ct${c.id}`} name="slug" defaultValue={c.slug} className="url-input" /></td>
                  <td><span className="chip">{c.kind === "bst" ? "Bộ sưu tập" : "Danh mục"}</span></td>
                  <td className="muted">{c._count.products}</td>
                  <td><input form={`ct${c.id}`} name="position" type="number" defaultValue={c.position} className="num-input" /></td>
                  <td style={{ textAlign: "center" }}>
                    <input form={`ct${c.id}`} name="isActive" type="checkbox" defaultChecked={c.isActive} />
                  </td>
                  <td className="row-actions">
                    <form id={`ct${c.id}`} action={saveCategory} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="icon-btn icon-btn-save" title="Lưu" type="submit"><Icon name="check" size={15} /></button>
                    </form>
                    <form action={delCategory} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmSubmit className="btn-danger-ghost" title="Xóa" message={`Xóa "${c.name}"? ${c._count.products} sản phẩm bên trong KHÔNG bị xóa, chỉ mất trang danh mục này.`}>
                        <Icon name="trash" size={15} />
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              <tr className="row-add">
                <td><input form="ct-add" name="name" placeholder="Tên danh mục mới" /></td>
                <td><input form="ct-add" name="slug" placeholder="duong-dan" className="url-input" /></td>
                <td>
                  <select form="ct-add" name="kind" defaultValue="collection">
                    <option value="collection">Danh mục</option>
                    <option value="bst">Bộ sưu tập</option>
                  </select>
                </td>
                <td colSpan={3}></td>
                <td>
                  <form id="ct-add" action={addCategory}>
                    <button className="btn" type="submit"><Icon name="plus" size={14} /> Thêm</button>
                  </form>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  }

  const where = {
    ...(q ? { name: { contains: q } } : {}),
    ...(cat ? { categories: { some: { category: { slug: cat } } } } : {}),
  };
  const [products] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [{ position: "asc" }, { id: "asc" }],
      take: 300,
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        categories: { include: { category: true } },
      },
    }),
  ]);
  const categories = allCats;

  async function deleteProduct(formData: FormData) {
    "use server";
    await db.product.delete({ where: { id: Number(formData.get("id")) } });
    await flash("Đã xóa sản phẩm");
    revalidatePath("/admin/products");
  }

  async function saveCategory(fd: FormData) {
    "use server";
    await db.category.update({
      where: { id: num(fd.get("id")) },
      data: {
        name: str(fd.get("name")),
        slug: str(fd.get("slug")),
        position: num(fd.get("position")),
        isActive: fd.get("isActive") === "on",
      },
    });
    await flash("Đã lưu danh mục");
    revalidatePath("/admin/products");
  }
  async function addCategory(fd: FormData) {
    "use server";
    const name = str(fd.get("name"));
    const slug = str(fd.get("slug"));
    if (!name || !slug) return;
    const max = await db.category.aggregate({ _max: { position: true } });
    await db.category.create({
      data: { name, slug, kind: String(fd.get("kind")) === "bst" ? "bst" : "collection", position: (max._max.position ?? 0) + 1 },
    });
    await flash("Đã thêm danh mục");
    revalidatePath("/admin/products");
  }
  async function delCategory(fd: FormData) {
    "use server";
    await db.category.delete({ where: { id: num(fd.get("id")) } });
    await flash("Đã xóa danh mục (sản phẩm bên trong được giữ lại)");
    revalidatePath("/admin/products");
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sản phẩm</h1>
          <p>{products.length} sản phẩm đang có trên website.</p>
        </div>
        <Link className="btn" href="/admin/products/new">
          <Icon name="plus" size={15} /> Thêm sản phẩm
        </Link>
      </div>

      <div className="seg">
        <Link href="/admin/products" className="active">Sản phẩm</Link>
        <Link href="/admin/products?tab=cats">Danh mục &amp; BST</Link>
      </div>

      <form className="toolbar" method="get">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input name="q" defaultValue={q || ""} placeholder="Tìm theo tên sản phẩm..." />
        </div>
        <select name="cat" defaultValue={cat || ""}>
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <button className="btn-outline" type="submit">Lọc</button>
      </form>

      <div className="panel panel-plain">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Ảnh</th>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Trạng thái</th>
              <th style={{ width: 130 }}></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.images[0] ? (
                    <img className="thumb" src={p.images[0].url} alt="" width={56} height={56} />
                  ) : (
                    <span className="thumb thumb-empty">—</span>
                  )}
                </td>
                <td>
                  <b>{p.name}</b>
                  <div className="muted">/{p.slug}</div>
                </td>
                <td>
                  {p.categories.slice(0, 2).map((c) => (
                    <span className="chip" key={c.categoryId}>{c.category.name}</span>
                  ))}
                  {p.categories.length > 2 && (
                    <span className="chip">+{p.categories.length - 2}</span>
                  )}
                  {p.categories.length === 0 && <span className="muted">—</span>}
                </td>
                <td>
                  <span className={`badge badge-${p.status === "active" ? "won" : "lost"}`}>
                    {p.status === "active" ? "Hiển thị" : p.status === "hidden" ? "Ẩn" : "Nháp"}
                  </span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <a className="icon-btn" href={`/${p.slug}`} target="_blank" rel="noreferrer" title="Xem trên website">
                    <Icon name="external" size={15} />
                  </a>{" "}
                  <Link className="icon-btn" href={`/admin/products/${p.id}`} title="Sửa">
                    <Icon name="pencil" size={15} />
                  </Link>
                  <form action={deleteProduct} style={{ display: "inline-block" }}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmSubmit className="btn-danger-ghost" title="Xóa" message={`Xóa sản phẩm "${p.name}"? Hành động không thể hoàn tác.`}>
                      <Icon name="trash" size={15} />
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
