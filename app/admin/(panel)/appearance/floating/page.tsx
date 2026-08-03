import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import Icon from "@/components/admin/Icon";
import { flash } from "@/lib/flash";

const str = (v: FormDataEntryValue | null) => String(v || "").trim();
const FIELDS = ["float_messenger", "float_zalo", "float_phone"];

export default async function FloatingAdminPage() {
  async function save(fd: FormData) {
    "use server";
    for (const key of FIELDS) {
      const value = str(fd.get(key));
      await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    }
    await flash("Đã lưu nút liên hệ nổi");
    revalidatePath("/admin/appearance/floating");
    revalidatePath("/", "layout");
  }

  const rows = await db.setting.findMany();
  const s: Record<string, string> = {};
  for (const r of rows) s[r.key] = r.value || "";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Nút liên hệ nổi</h1>
          <p>3 nút tròn góc phải dưới của website — bỏ trống ô nào thì nút đó ẩn.</p>
        </div>
        <a className="btn-outline" href="/" target="_blank" rel="noreferrer">
          <Icon name="external" size={15} /> Xem website
        </a>
      </div>

      <form action={save}>
        <div className="panel" style={{ padding: 18, maxWidth: 640 }}>
          <div className="settings-grid" style={{ gridTemplateColumns: "1fr" }}>
            <label>
              Link Messenger (dạng https://m.me/ten-fanpage)
              <input name="float_messenger" defaultValue={s.float_messenger || ""} className="url-input" />
            </label>
            <label>
              Link Zalo (dạng https://zalo.me/số-điện-thoại)
              <input name="float_zalo" defaultValue={s.float_zalo || ""} className="url-input" />
            </label>
            <label>
              Số điện thoại hiển thị trên nút gọi
              <input name="float_phone" defaultValue={s.float_phone || ""} placeholder="039 9259 155" />
            </label>
          </div>
        </div>
        <div className="edit-actions">
          <button className="btn" type="submit">Lưu</button>
          <span className="muted">Lưu xong toàn bộ website cập nhật ngay.</span>
        </div>
      </form>
    </>
  );
}
