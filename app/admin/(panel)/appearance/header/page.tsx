import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import Icon from "@/components/admin/Icon";
import UploadInput from "@/components/admin/UploadInput";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { flash } from "@/lib/flash";
import { NO_PARENT, oid } from "@/lib/mongo";

// Header hiển thị trên mọi trang -> làm mới toàn bộ layout website
function refreshSite() {
  revalidatePath("/admin/appearance/header");
  revalidatePath("/", "layout");
}

const num = (v: FormDataEntryValue | null) => (v ? Number(v) || 0 : 0);
const str = (v: FormDataEntryValue | null) => String(v || "").trim();

async function setSettings(pairs: Record<string, string>) {
  for (const [key, value] of Object.entries(pairs)) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}

export default async function HeaderMenuPage() {
  /* ===== BRAND / LOGO ===== */
  async function saveBrand(fd: FormData) {
    "use server";
    await setSettings({
      site_brand: str(fd.get("site_brand")),
      site_logo: str(fd.get("site_logo")),
      pcbrand_label: str(fd.get("pcbrand_label")),
      pcbrand_url: str(fd.get("pcbrand_url")),
    });
    await flash("Đã lưu thương hiệu");
    refreshSite();
  }

  /* ===== MENU ===== */
  async function saveMenu(fd: FormData) {
    "use server";
    await db.menu.update({
      where: { id: oid(fd.get("id")) },
      data: {
        label: str(fd.get("label")),
        url: str(fd.get("url")),
        position: num(fd.get("position")),
        isActive: fd.get("isActive") === "on",
      },
    });
    await flash("Đã lưu mục menu");
    refreshSite();
  }
  async function addMenu(fd: FormData) {
    "use server";
    const label = str(fd.get("label"));
    const url = str(fd.get("url"));
    if (!label || !url) return;
    const parentId = oid(fd.get("parentId")) || null;
    const max = await db.menu.aggregate({
      _max: { position: true },
      where: { location: "header", ...(parentId ? { parentId } : NO_PARENT) },
    });
    await db.menu.create({
      data: { label, url, parentId, location: "header", position: (max._max.position ?? 0) + 1 },
    });
    await flash("Đã thêm mục menu");
    refreshSite();
  }
  async function delMenu(fd: FormData) {
    "use server";
    const id = oid(fd.get("id"));
    // Mongo không cascade được trên self-relation (xem schema.prisma) -> xoá mục con thủ công,
    // nếu bỏ sót thì menu con thành mồ côi và biến mất khỏi header mà vẫn nằm trong DB.
    await db.menu.deleteMany({ where: { parentId: id } });
    await db.menu.delete({ where: { id } });
    await flash("Đã xóa mục menu");
    refreshSite();
  }

  const [menus, settingRows] = await Promise.all([
    db.menu.findMany({ where: { location: "header" }, orderBy: { position: "asc" } }),
    db.setting.findMany(),
  ]);
  const s: Record<string, string> = {};
  for (const r of settingRows) s[r.key] = r.value || "";
  const tops = menus.filter((m) => !m.parentId);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Header &amp; menu</h1>
          <p>Logo, tên thương hiệu và menu điều hướng — áp dụng cho toàn bộ website.</p>
        </div>
        <a className="btn-outline" href="/" target="_blank" rel="noreferrer">
          <Icon name="external" size={15} /> Xem website
        </a>
      </div>

      <div className="panel" style={{ padding: 18 }}>
        <h3 className="panel-mini-title">Thương hiệu</h3>
        <form action={saveBrand} className="settings-grid">
          <label>
            Tên hiển thị cạnh logo
            <input name="site_brand" defaultValue={s.site_brand || ""} />
          </label>
          <label>
            Logo (đường dẫn ảnh)
            <UploadInput name="site_logo" defaultValue={s.site_logo || ""} className="" />
          </label>
          <label>
            Nút góc phải — chữ
            <input name="pcbrand_label" defaultValue={s.pcbrand_label || ""} />
          </label>
          <label>
            Nút góc phải — link
            <input name="pcbrand_url" defaultValue={s.pcbrand_url || ""} className="url-input" />
          </label>
          <div className="settings-actions">
            <button className="btn" type="submit">Lưu thương hiệu</button>
          </div>
        </form>
      </div>

      <div className="panel panel-plain">
        <div className="panel-head">
          <h2>Menu điều hướng ({tops.length} mục cấp 1)</h2>
        </div>
        <table className="admin-table table-editor">
          <thead>
            <tr>
              <th>Tên hiển thị</th>
              <th>Đường dẫn</th>
              <th style={{ width: 64 }}>Thứ tự</th>
              <th style={{ width: 46 }}>Hiện</th>
              <th style={{ width: 92 }}></th>
            </tr>
          </thead>
          <tbody>
            {tops.map((t) => {
              const kids = menus.filter((m) => m.parentId === t.id);
              return [
                <tr key={t.id} className="menu-parent-row">
                  <td>
                    <span className="menu-lv1">
                      <Icon name="chevronDown" size={13} className="muted" />
                      <input form={`mn${t.id}`} name="label" defaultValue={t.label} />
                    </span>
                  </td>
                  <td><input form={`mn${t.id}`} name="url" defaultValue={t.url} className="url-input" /></td>
                  <td><input form={`mn${t.id}`} name="position" type="number" defaultValue={t.position} className="num-input" /></td>
                  <td style={{ textAlign: "center" }}>
                    <input form={`mn${t.id}`} name="isActive" type="checkbox" defaultChecked={t.isActive} />
                  </td>
                  <td className="row-actions">
                    <form id={`mn${t.id}`} action={saveMenu} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="icon-btn icon-btn-save" title="Lưu" type="submit"><Icon name="check" size={15} /></button>
                    </form>
                    <form action={delMenu} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={t.id} />
                      <ConfirmSubmit className="btn-danger-ghost" title={kids.length ? "Xóa (kèm mục con)" : "Xóa"} message={kids.length ? `Xóa mục "${t.label}"? ${kids.length} mục con sẽ bị xóa theo!` : `Xóa mục "${t.label}"?`}><Icon name="trash" size={15} /></ConfirmSubmit>
                    </form>
                  </td>
                </tr>,
                ...kids.map((c) => (
                  <tr key={c.id} className="menu-child-row">
                    <td>
                      <span className="menu-lv2">
                        <input form={`mn${c.id}`} name="label" defaultValue={c.label} />
                      </span>
                    </td>
                    <td><input form={`mn${c.id}`} name="url" defaultValue={c.url} className="url-input" /></td>
                    <td><input form={`mn${c.id}`} name="position" type="number" defaultValue={c.position} className="num-input" /></td>
                    <td style={{ textAlign: "center" }}>
                      <input form={`mn${c.id}`} name="isActive" type="checkbox" defaultChecked={c.isActive} />
                    </td>
                    <td className="row-actions">
                      <form id={`mn${c.id}`} action={saveMenu} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="icon-btn icon-btn-save" title="Lưu" type="submit"><Icon name="check" size={15} /></button>
                      </form>
                      <form action={delMenu} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmSubmit className="btn-danger-ghost" title="Xóa" message={`Xóa mục "${c.label}"?`}><Icon name="trash" size={15} /></ConfirmSubmit>
                      </form>
                    </td>
                  </tr>
                )),
              ];
            })}
            <tr className="row-add">
              <td><input form="mn-add" name="label" placeholder="Tên mục mới" /></td>
              <td><input form="mn-add" name="url" placeholder="/duong-dan" className="url-input" /></td>
              <td colSpan={2}>
                <select form="mn-add" name="parentId" defaultValue="">
                  <option value="">— Cấp 1 —</option>
                  {tops.map((t) => (
                    <option key={t.id} value={t.id}>Con của: {t.label}</option>
                  ))}
                </select>
              </td>
              <td>
                <form id="mn-add" action={addMenu}>
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
