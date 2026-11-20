import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { flash } from "@/lib/flash";
import { isObjectId } from "@/lib/mongo";
import RichText from "@/components/admin/RichText";
import type { PublishStatus } from "@prisma/client";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isObjectId(id)) notFound(); // id rác từ URL -> 404 thay vì lỗi query
  const page = await db.page.findUnique({ where: { id } });
  if (!page) notFound();

  async function save(fd: FormData) {
    "use server";
    await db.page.update({
      where: { id },
      data: {
        title: String(fd.get("title") || "").trim(),
        body: String(fd.get("body") || ""),
        status: String(fd.get("status")) as PublishStatus,
      },
    });
    await flash("Đã lưu trang");
    revalidatePath("/admin/pages");
    redirect("/admin/pages");
  }

  return (
    <>
      <h1 className="admin-title">Sửa trang: {page.title}</h1>
      <form className="edit-form" action={save}>
        <div className="edit-grid">
          <div className="edit-main panel">
            <label>
              Tiêu đề trang
              <input name="title" required defaultValue={page.title} />
            </label>
            <label>Nội dung trang</label>
            <RichText name="body" defaultValue={page.body || ""} />
          </div>
          <div className="edit-side">
            <div className="panel">
              <h3>Hiển thị</h3>
              <label>
                Trạng thái
                <select name="status" defaultValue={page.status}>
                  <option value="published">Đang hiện</option>
                  <option value="draft">Ẩn</option>
                </select>
              </label>
              <p className="muted">Đường dẫn: /{page.slug}</p>
            </div>
          </div>
        </div>
        <div className="edit-actions">
          <button className="btn" type="submit">Lưu trang</button>
          <Link href="/admin/pages">Hủy bỏ</Link>
        </div>
      </form>
    </>
  );
}
