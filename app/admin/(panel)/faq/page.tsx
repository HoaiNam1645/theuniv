import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import Icon from "@/components/admin/Icon";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { flash } from "@/lib/flash";

const num = (v: FormDataEntryValue | null) => (v ? Number(v) || 0 : 0);
const str = (v: FormDataEntryValue | null) => String(v || "").trim();

export default async function FaqAdminPage() {
  async function saveFaq(fd: FormData) {
    "use server";
    await db.faq.update({
      where: { id: num(fd.get("id")) },
      data: {
        question: str(fd.get("question")),
        answer: String(fd.get("answer") || ""),
        position: num(fd.get("position")),
        isActive: fd.get("isActive") === "on",
      },
    });
    await flash("Đã lưu câu hỏi");
    revalidatePath("/admin/faq");
  }
  async function addFaq(fd: FormData) {
    "use server";
    const question = str(fd.get("question"));
    const catId = num(fd.get("faqCategoryId"));
    if (!question || !catId) return;
    const max = await db.faq.aggregate({ _max: { position: true }, where: { faqCategoryId: catId } });
    await db.faq.create({
      data: {
        faqCategoryId: catId,
        question,
        answer: String(fd.get("answer") || "<p></p>"),
        position: (max._max.position ?? 0) + 1,
      },
    });
    await flash("Đã thêm câu hỏi");
    revalidatePath("/admin/faq");
  }
  async function delFaq(fd: FormData) {
    "use server";
    await db.faq.delete({ where: { id: num(fd.get("id")) } });
    await flash("Đã xóa câu hỏi");
    revalidatePath("/admin/faq");
  }
  async function addGroup(fd: FormData) {
    "use server";
    const name = str(fd.get("name"));
    if (!name) return;
    const max = await db.faqCategory.aggregate({ _max: { position: true } });
    await db.faqCategory.create({ data: { name, position: (max._max.position ?? 0) + 1 } });
    await flash("Đã thêm nhóm câu hỏi");
    revalidatePath("/admin/faq");
  }
  async function saveGroup(fd: FormData) {
    "use server";
    await db.faqCategory.update({
      where: { id: num(fd.get("id")) },
      data: { name: str(fd.get("name")), position: num(fd.get("position")) },
    });
    await flash("Đã lưu nhóm");
    revalidatePath("/admin/faq");
  }
  async function delGroup(fd: FormData) {
    "use server";
    await db.faqCategory.delete({ where: { id: num(fd.get("id")) } });
    await flash("Đã xóa nhóm và các câu hỏi trong đó");
    revalidatePath("/admin/faq");
  }

  const groups = await db.faqCategory.findMany({
    orderBy: { position: "asc" },
    include: { faqs: { orderBy: { position: "asc" } } },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Câu hỏi thường gặp</h1>
          <p>Nội dung trang FAQ trên website — sửa xong là cập nhật ngay.</p>
        </div>
        <a className="btn-outline" href="/cau-hoi-thuong-gap" target="_blank" rel="noreferrer">
          <Icon name="external" size={15} /> Xem trang FAQ
        </a>
      </div>

      {groups.map((g) => (
        <div className="panel panel-plain" key={g.id}>
          <div className="panel-head">
            <form action={saveGroup} style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
              <input type="hidden" name="id" value={g.id} />
              <input name="name" defaultValue={g.name} style={{ fontWeight: 600, maxWidth: 280 }} />
              <input name="position" type="number" defaultValue={g.position} className="num-input" title="Thứ tự nhóm" />
              <button className="icon-btn icon-btn-save" title="Lưu tên nhóm" type="submit"><Icon name="check" size={15} /></button>
            </form>
            <form action={delGroup}>
              <input type="hidden" name="id" value={g.id} />
              <ConfirmSubmit className="btn-danger-ghost" title="Xóa nhóm" message={`Xóa nhóm "${g.name}"? ${g.faqs.length} câu hỏi trong nhóm sẽ bị xóa theo!`}>
                <Icon name="trash" size={15} />
              </ConfirmSubmit>
            </form>
          </div>
          <table className="admin-table table-editor">
            <thead>
              <tr>
                <th style={{ width: "34%" }}>Câu hỏi</th>
                <th>Câu trả lời</th>
                <th style={{ width: 64 }}>Thứ tự</th>
                <th style={{ width: 46 }}>Hiện</th>
                <th style={{ width: 92 }}></th>
              </tr>
            </thead>
            <tbody>
              {g.faqs.map((f) => (
                <tr key={f.id}>
                  <td><textarea form={`fq${f.id}`} name="question" rows={2} defaultValue={f.question} className="quote-input" /></td>
                  <td><textarea form={`fq${f.id}`} name="answer" rows={3} defaultValue={f.answer} className="quote-input" /></td>
                  <td><input form={`fq${f.id}`} name="position" type="number" defaultValue={f.position} className="num-input" /></td>
                  <td style={{ textAlign: "center" }}>
                    <input form={`fq${f.id}`} name="isActive" type="checkbox" defaultChecked={f.isActive} />
                  </td>
                  <td className="row-actions">
                    <form id={`fq${f.id}`} action={saveFaq} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={f.id} />
                      <button className="icon-btn icon-btn-save" title="Lưu" type="submit"><Icon name="check" size={15} /></button>
                    </form>
                    <form action={delFaq} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={f.id} />
                      <ConfirmSubmit className="btn-danger-ghost" title="Xóa" message={`Xóa câu hỏi này?`}>
                        <Icon name="trash" size={15} />
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              <tr className="row-add">
                <td><textarea form={`fq-add-${g.id}`} name="question" rows={2} placeholder="Câu hỏi mới..." className="quote-input" /></td>
                <td><textarea form={`fq-add-${g.id}`} name="answer" rows={2} placeholder="Câu trả lời..." className="quote-input" /></td>
                <td colSpan={2}></td>
                <td>
                  <form id={`fq-add-${g.id}`} action={addFaq}>
                    <input type="hidden" name="faqCategoryId" value={g.id} />
                    <button className="btn" type="submit"><Icon name="plus" size={14} /> Thêm</button>
                  </form>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      <div className="panel" style={{ padding: 18 }}>
        <h3 className="panel-mini-title">Thêm nhóm câu hỏi mới</h3>
        <form action={addGroup} style={{ display: "flex", gap: 8 }}>
          <input name="name" placeholder="Tên nhóm (VD: VẬN CHUYỂN)" style={{ maxWidth: 320 }} />
          <button className="btn" type="submit"><Icon name="plus" size={14} /> Thêm nhóm</button>
        </form>
      </div>
    </>
  );
}
