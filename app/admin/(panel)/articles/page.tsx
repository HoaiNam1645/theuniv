import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import Icon from "@/components/admin/Icon";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { flash } from "@/lib/flash";
import { like, oid } from "@/lib/mongo";

const num = (v: FormDataEntryValue | null) => (v ? Number(v) || 0 : 0);
const str = (v: FormDataEntryValue | null) => String(v || "").trim();

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; tab?: string }>;
}) {
  const { q, cat, tab } = await searchParams;

  async function deleteArticle(fd: FormData) {
    "use server";
    await db.article.delete({ where: { id: oid(fd.get("id")) } });
    await flash("Đã xóa bài viết");
    revalidatePath("/admin/articles");
    revalidatePath("/");
  }

  async function saveCat(fd: FormData) {
    "use server";
    await db.articleCategory.update({
      where: { id: oid(fd.get("id")) },
      data: {
        name: str(fd.get("name")),
        slug: str(fd.get("slug")),
        position: num(fd.get("position")),
        isActive: fd.get("isActive") === "on",
      },
    });
    await flash("Đã lưu chuyên mục");
    revalidatePath("/admin/articles");
  }
  async function addCat(fd: FormData) {
    "use server";
    const name = str(fd.get("name"));
    const slug = str(fd.get("slug"));
    if (!name || !slug) return;
    const max = await db.articleCategory.aggregate({ _max: { position: true } });
    await db.articleCategory.create({ data: { name, slug, position: (max._max.position ?? 0) + 1 } });
    await flash("Đã thêm chuyên mục");
    revalidatePath("/admin/articles");
  }
  async function delCat(fd: FormData) {
    "use server";
    const id = oid(fd.get("id"));
    await db.article.updateMany({ where: { articleCategoryId: id }, data: { articleCategoryId: null } });
    await db.articleCategory.delete({ where: { id } });
    await flash("Đã xóa chuyên mục (bài viết được giữ lại)");
    revalidatePath("/admin/articles");
  }

  const cats = await db.articleCategory.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { articles: true } } },
  });

  if (tab === "cats") {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>Chuyên mục bài viết</h1>
            <p>Các tab hiển thị trên trang tin tức của website.</p>
          </div>
        </div>
        <div className="seg">
          <Link href="/admin/articles">Bài viết</Link>
          <Link href="/admin/articles?tab=cats" className="active">Chuyên mục</Link>
        </div>
        <div className="panel panel-plain">
          <table className="admin-table table-editor">
            <thead>
              <tr>
                <th>Tên chuyên mục</th>
                <th>Đường dẫn</th>
                <th style={{ width: 90 }}>Số bài</th>
                <th style={{ width: 64 }}>Thứ tự</th>
                <th style={{ width: 46 }}>Hiện</th>
                <th style={{ width: 92 }}></th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id}>
                  <td><input form={`ac${c.id}`} name="name" defaultValue={c.name} /></td>
                  <td><input form={`ac${c.id}`} name="slug" defaultValue={c.slug} className="url-input" /></td>
                  <td className="muted">{c._count.articles}</td>
                  <td><input form={`ac${c.id}`} name="position" type="number" defaultValue={c.position} className="num-input" /></td>
                  <td style={{ textAlign: "center" }}>
                    <input form={`ac${c.id}`} name="isActive" type="checkbox" defaultChecked={c.isActive} />
                  </td>
                  <td className="row-actions">
                    <form id={`ac${c.id}`} action={saveCat} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="icon-btn icon-btn-save" title="Lưu" type="submit"><Icon name="check" size={15} /></button>
                    </form>
                    <form action={delCat} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmSubmit className="btn-danger-ghost" title="Xóa" message={`Xóa chuyên mục "${c.name}"? ${c._count.articles} bài viết trong đó sẽ KHÔNG bị xóa, chỉ mất chuyên mục.`}>
                        <Icon name="trash" size={15} />
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              <tr className="row-add">
                <td><input form="ac-add" name="name" placeholder="Tên chuyên mục mới" /></td>
                <td><input form="ac-add" name="slug" placeholder="duong-dan" className="url-input" /></td>
                <td colSpan={3}></td>
                <td>
                  <form id="ac-add" action={addCat}>
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
    ...(q ? { title: like(q) } : {}),
    ...(cat ? { category: { slug: cat } } : {}),
  };
  const articles = await db.article.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 200,
    include: { category: true },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bài viết</h1>
          <p>{articles.length} bài — tin tức, cẩm nang, bảng giá của website.</p>
        </div>
        <Link className="btn" href="/admin/articles/new">
          <Icon name="plus" size={15} /> Viết bài mới
        </Link>
      </div>

      <div className="seg">
        <Link href="/admin/articles" className="active">Bài viết</Link>
        <Link href="/admin/articles?tab=cats">Chuyên mục</Link>
      </div>

      <form className="toolbar" method="get">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input name="q" defaultValue={q || ""} placeholder="Tìm theo tiêu đề..." />
        </div>
        <select name="cat" defaultValue={cat || ""}>
          <option value="">Tất cả chuyên mục</option>
          {cats.map((c) => (
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
              <th>Tiêu đề</th>
              <th>Chuyên mục</th>
              <th>Trạng thái</th>
              <th style={{ width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.thumbnail ? (
                    <img className="thumb" src={a.thumbnail} alt="" width={56} height={56} />
                  ) : (
                    <span className="thumb thumb-empty">—</span>
                  )}
                </td>
                <td>
                  <b>{a.title}</b>
                  <div className="muted">
                    /{a.slug}
                    {a.isFeatured && " · ⭐ nổi bật trang chủ"}
                    {!a.body && <span className="badge badge-contacted" style={{ marginLeft: 6 }}>chưa có nội dung</span>}
                  </div>
                </td>
                <td className="muted">{a.category?.name || "—"}</td>
                <td>
                  <span className={`badge badge-${a.status === "published" ? "won" : "lost"}`}>
                    {a.status === "published" ? "Đã đăng" : "Nháp"}
                  </span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <a className="icon-btn" href={`/${a.slug}`} target="_blank" rel="noreferrer" title="Xem trên website">
                    <Icon name="external" size={15} />
                  </a>{" "}
                  <Link className="icon-btn" href={`/admin/articles/${a.id}`} title="Sửa">
                    <Icon name="pencil" size={15} />
                  </Link>{" "}
                  <form action={deleteArticle} style={{ display: "inline-block" }}>
                    <input type="hidden" name="id" value={a.id} />
                    <ConfirmSubmit className="btn-danger-ghost" title="Xóa" message={`Xóa bài viết "${a.title}"? Hành động không thể hoàn tác.`}>
                      <Icon name="trash" size={15} />
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  <Icon name="news" size={28} />
                  Chưa có bài viết nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
