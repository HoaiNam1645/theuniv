import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import Icon from "@/components/admin/Icon";
import UploadInput from "@/components/admin/UploadInput";
import { flash } from "@/lib/flash";
import { FOOTER_SOCIAL_DEFAULT } from "@/lib/chromeHtml";

const str = (v: FormDataEntryValue | null) => String(v || "").trim();

const FIELDS = [
  "company_name", "company_mst", "address", "hotline", "email", "map_embed_url",
  "footer_col1_title", "footer_col1_facebook", "footer_col1_instagram", "footer_col1_mail",
  "footer_col1_fanpage_img", "footer_col1_fanpage_link",
];

export default async function FooterPage() {
  async function save(fd: FormData) {
    "use server";
    for (const key of FIELDS) {
      const value = str(fd.get(key));
      await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    }
    await flash("Đã lưu footer");
    revalidatePath("/admin/appearance/footer");
    revalidatePath("/", "layout");
  }

  const rows = await db.setting.findMany();
  const s: Record<string, string> = {};
  for (const r of rows) s[r.key] = r.value || "";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Footer</h1>
          <p>Thông tin công ty, bản đồ và cột mạng xã hội ở chân trang.</p>
        </div>
        <a className="btn-outline" href="/" target="_blank" rel="noreferrer">
          <Icon name="external" size={15} /> Xem website
        </a>
      </div>

      <form action={save}>
        <div className="panel" style={{ padding: 18 }}>
          <h3 className="panel-mini-title">Thông tin công ty</h3>
          <div className="settings-grid">
            <label style={{ gridColumn: "1 / -1" }}>
              Tên công ty
              <input name="company_name" defaultValue={s.company_name || ""} />
            </label>
            <label>
              Mã số thuế
              <input name="company_mst" defaultValue={s.company_mst || ""} />
            </label>
            <label>
              Hotline
              <input name="hotline" defaultValue={s.hotline || ""} />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Địa chỉ
              <input name="address" defaultValue={s.address || ""} />
            </label>
            <label>
              Email
              <input name="email" defaultValue={s.email || ""} />
            </label>
            <label>
              Link nhúng bản đồ (Google Maps embed)
              <input name="map_embed_url" defaultValue={s.map_embed_url || ""} className="url-input" />
            </label>
          </div>
        </div>

        {[1].map((n) => (
          <div className="panel" style={{ padding: 18 }} key={n}>
            <h3 className="panel-mini-title">Cột mạng xã hội</h3>
            <p className="muted">Ô để trống thì website dùng giá trị mặc định (chữ mờ trong ô).</p>
            <div className="settings-grid">
              <label>
                Tiêu đề cột
                <input name={`footer_col${n}_title`} defaultValue={s[`footer_col${n}_title`] || ""} placeholder={FOOTER_SOCIAL_DEFAULT.TITLE} />
              </label>
              <label>
                Facebook
                <input name={`footer_col${n}_facebook`} defaultValue={s[`footer_col${n}_facebook`] || ""} placeholder={FOOTER_SOCIAL_DEFAULT.FACEBOOK} className="url-input" />
              </label>
              <label>
                Instagram
                <input name={`footer_col${n}_instagram`} defaultValue={s[`footer_col${n}_instagram`] || ""} placeholder={FOOTER_SOCIAL_DEFAULT.INSTAGRAM} className="url-input" />
              </label>
              <label>
                Email nhận thư (nút mail)
                <input name={`footer_col${n}_mail`} defaultValue={s[`footer_col${n}_mail`] || ""} />
              </label>
              <label>
                Ảnh fanpage (hiện dưới icon)
                <UploadInput name={`footer_col${n}_fanpage_img`} defaultValue={s[`footer_col${n}_fanpage_img`] || ""} className="" />
              </label>
              <label>
                Link khi bấm ảnh fanpage
                <input name={`footer_col${n}_fanpage_link`} defaultValue={s[`footer_col${n}_fanpage_link`] || ""} className="url-input" />
              </label>
            </div>
          </div>
        ))}

        <div className="edit-actions">
          <button className="btn" type="submit">Lưu footer</button>
          <span className="muted">Lưu xong toàn bộ website cập nhật ngay.</span>
        </div>
      </form>
    </>
  );
}
