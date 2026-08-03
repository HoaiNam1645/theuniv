import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import UploadInput from "@/components/admin/UploadInput";
import RichText from "@/components/admin/RichText";
import { flash } from "@/lib/flash";
import type { Article, PublishStatus } from "@prisma/client";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default async function ArticleForm({ article }: { article?: Article }) {
  const cats = await db.articleCategory.findMany({ orderBy: { position: "asc" } });

  async function save(formData: FormData) {
    "use server";
    const id = formData.get("id") ? Number(formData.get("id")) : null;
    const title = String(formData.get("title") || "").trim();
    if (!title) redirect(id ? `/admin/articles/${id}` : "/admin/articles/new");
    const slug = slugify(String(formData.get("slug") || "") || title);
    const status = String(formData.get("status")) as PublishStatus;

    const data = {
      title,
      slug,
      articleCategoryId: formData.get("categoryId") ? Number(formData.get("categoryId")) : null,
      thumbnail: String(formData.get("thumbnail") || "") || null,
      excerpt: String(formData.get("excerpt") || "") || null,
      body: String(formData.get("body") || "") || null,
      isFeatured: formData.get("isFeatured") === "on",
      status,
      publishedAt: status === "published" ? new Date() : null,
    };

    if (id) await db.article.update({ where: { id }, data });
    else await db.article.create({ data });

    await flash(id ? "Đã lưu bài viết" : "Đã đăng bài viết mới");
    revalidatePath("/admin/articles");
    revalidatePath("/"); // bài nổi bật hiện ở trang chủ
    redirect("/admin/articles");
  }

  return (
    <form className="edit-form" action={save}>
      {article && <input type="hidden" name="id" value={article.id} />}
      <div className="edit-grid">
        <div className="edit-main panel">
          <label>
            Tiêu đề bài viết *
            <input name="title" required defaultValue={article?.title || ""} />
          </label>
          <label>
            Đường dẫn (bỏ trống sẽ tự tạo từ tiêu đề)
            <input name="slug" defaultValue={article?.slug || ""} placeholder="bai-viet-moi" />
          </label>
          <label>
            Mô tả ngắn (hiện ở danh sách bài viết)
            <textarea name="excerpt" rows={3} defaultValue={article?.excerpt || ""} />
          </label>
          <label>
            Nội dung bài viết
          </label>
          <RichText name="body" defaultValue={article?.body || ""} />
        </div>

        <div className="edit-side">
          <div className="panel">
            <h3>Xuất bản</h3>
            <label>
              Trạng thái
              <select name="status" defaultValue={article?.status || "published"}>
                <option value="published">Đã đăng</option>
                <option value="draft">Nháp (chưa hiện)</option>
              </select>
            </label>
            <label>
              Chuyên mục
              <select name="categoryId" defaultValue={article?.articleCategoryId || ""}>
                <option value="">— Chọn —</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="check" style={{ padding: "8px 0" }}>
              <input type="checkbox" name="isFeatured" defaultChecked={article?.isFeatured} />
              Ghim vào &quot;Bài viết nổi bật&quot; trang chủ
            </label>
          </div>
          <div className="panel">
            <h3>Ảnh đại diện</h3>
            <label>
              Ảnh thumbnail
              <UploadInput name="thumbnail" defaultValue={article?.thumbnail || ""} className="" />
            </label>
            {article?.thumbnail && (
              <div className="img-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={article.thumbnail} alt="" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="edit-actions">
        <button className="btn" type="submit">Lưu bài viết</button>
        <a href="/admin/articles">Hủy bỏ</a>
      </div>
    </form>
  );
}
