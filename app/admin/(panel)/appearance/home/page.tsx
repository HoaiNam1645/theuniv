import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import Icon from "@/components/admin/Icon";
import UploadInput from "@/components/admin/UploadInput";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { flash } from "@/lib/flash";

// Sau mỗi thay đổi: làm mới trang chủ ngay lập tức (không chờ ISR 60s)
function refreshHome() {
  revalidatePath("/admin/appearance/home");
  revalidatePath("/");
}

const TABS = [
  { key: "sliders", label: "Slider" },
  { key: "banners", label: "Banner" },
  { key: "types", label: "Sản phẩm nổi bật" },
  { key: "brands", label: "Khách hàng" },
  { key: "testimonials", label: "Phản hồi" },
];

// Nhóm banner theo section trên trang chủ để user biết ảnh nằm ở đâu
const BANNER_SECTIONS: {
  title: string;
  note: string;
  slots: { slot: string; label: string; hint: string }[];
}[] = [
  {
    title: 'Khu "WE KEEP YOUR MEMORIES ON YOUR T-SHIRT"',
    note: "Ngay dưới slider đầu trang — 1 banner lớn, 2 ô vuông và 1 banner dọc",
    slots: [
      { slot: "home_grid_1", label: "Banner lớn", hint: "Nằm trên cùng bên trái · khổ ngang 900×411" },
      { slot: "home_grid_2", label: "Ô vuông trái", hint: "Dưới banner lớn, ô bên trái · 450×450" },
      { slot: "home_grid_3", label: "Ô vuông phải", hint: "Dưới banner lớn, ô bên phải · 450×450" },
      { slot: "home_side", label: "Banner dọc + nút bấm", hint: "Cột cao bên phải cả khu, có nút màu vàng" },
    ],
  },
  {
    title: 'Khu "SẢN XUẤT ĐỒNG PHỤC"',
    note: "3 hàng ảnh giới thiệu, mỗi hàng gồm 1 ảnh dọc + 1 ảnh ngang có nút XEM CHI TIẾT",
    slots: [
      { slot: "sxdp_side_1", label: "Hàng 1 — ảnh dọc", hint: "Bên trái hàng 1 (khu Áo lớp)" },
      { slot: "sxdp_wide_1", label: "Hàng 1 — ảnh ngang", hint: "Bên phải hàng 1, chữ + nút nằm bên trái ảnh" },
      { slot: "sxdp_wide_2", label: "Hàng 2 — ảnh ngang", hint: "Bên trái hàng 2, chữ + nút nằm bên phải ảnh" },
      { slot: "sxdp_side_2", label: "Hàng 2 — ảnh dọc", hint: "Bên phải hàng 2 (khu Áo doanh nghiệp)" },
      { slot: "sxdp_side_3", label: "Hàng 3 — ảnh dọc", hint: "Bên trái hàng 3 (khu Phụ kiện)" },
      { slot: "sxdp_wide_3", label: "Hàng 3 — ảnh ngang", hint: "Bên phải hàng 3, chữ + nút nằm bên trái ảnh" },
    ],
  },
];

const num = (v: FormDataEntryValue | null) => (v ? Number(v) || 0 : 0);
const str = (v: FormDataEntryValue | null) => String(v || "").trim() || null;

export default async function AppearancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "sliders" } = await searchParams;

  /* ============ SLIDERS ============ */
  async function saveSlider(fd: FormData) {
    "use server";
    await db.slider.update({
      where: { id: num(fd.get("id")) },
      data: {
        title: str(fd.get("title")),
        imageDesktop: String(fd.get("imageDesktop") || ""),
        imageMobile: str(fd.get("imageMobile")),
        link: str(fd.get("link")),
        position: num(fd.get("position")),
        isActive: fd.get("isActive") === "on",
      },
    });
    await flash("Đã lưu thay đổi");
    refreshHome();
  }
  async function addSlider(fd: FormData) {
    "use server";
    const img = String(fd.get("imageDesktop") || "").trim();
    if (!img) return;
    const max = await db.slider.aggregate({ _max: { position: true } });
    await db.slider.create({
      data: {
        title: str(fd.get("title")),
        imageDesktop: img,
        imageMobile: str(fd.get("imageMobile")),
        link: str(fd.get("link")),
        position: (max._max.position ?? 0) + 1,
      },
    });
    await flash("Đã thêm mới");
    refreshHome();
  }
  async function delSlider(fd: FormData) {
    "use server";
    await db.slider.delete({ where: { id: num(fd.get("id")) } });
    await flash("Đã xóa");
    refreshHome();
  }

  /* ============ BANNERS ============ */
  async function saveBanner(fd: FormData) {
    "use server";
    await db.banner.update({
      where: { id: num(fd.get("id")) },
      data: {
        image: String(fd.get("image") || ""),
        link: str(fd.get("link")),
        buttonText: str(fd.get("buttonText")),
      },
    });
    await flash("Đã lưu thay đổi");
    refreshHome();
  }

  /* ============ PRODUCT TYPES ============ */
  async function saveType(fd: FormData) {
    "use server";
    await db.productType.update({
      where: { id: num(fd.get("id")) },
      data: {
        name: String(fd.get("name") || ""),
        image: str(fd.get("image")),
        articleSlug: str(fd.get("articleSlug")),
        position: num(fd.get("position")),
        showOnHome: fd.get("showOnHome") === "on",
      },
    });
    await flash("Đã lưu thay đổi");
    refreshHome();
  }

  /* ============ BRANDS ============ */
  async function saveBrand(fd: FormData) {
    "use server";
    await db.brandLogo.update({
      where: { id: num(fd.get("id")) },
      data: {
        title: str(fd.get("title")),
        image: String(fd.get("image") || ""),
        link: str(fd.get("link")),
        position: num(fd.get("position")),
        isActive: fd.get("isActive") === "on",
      },
    });
    await flash("Đã lưu thay đổi");
    refreshHome();
  }
  async function addBrand(fd: FormData) {
    "use server";
    const img = String(fd.get("image") || "").trim();
    if (!img) return;
    const max = await db.brandLogo.aggregate({ _max: { position: true } });
    await db.brandLogo.create({
      data: {
        title: str(fd.get("title")),
        image: img,
        link: str(fd.get("link")),
        position: (max._max.position ?? 0) + 1,
      },
    });
    await flash("Đã thêm mới");
    refreshHome();
  }
  async function delBrand(fd: FormData) {
    "use server";
    await db.brandLogo.delete({ where: { id: num(fd.get("id")) } });
    await flash("Đã xóa");
    refreshHome();
  }

  /* ============ TESTIMONIALS ============ */
  async function saveTesti(fd: FormData) {
    "use server";
    await db.testimonial.update({
      where: { id: num(fd.get("id")) },
      data: {
        title: String(fd.get("title") || ""),
        quote: String(fd.get("quote") || ""),
        image: String(fd.get("image") || ""),
        link: str(fd.get("link")),
        position: num(fd.get("position")),
        isActive: fd.get("isActive") === "on",
      },
    });
    await flash("Đã lưu thay đổi");
    refreshHome();
  }
  async function addTesti(fd: FormData) {
    "use server";
    const title = String(fd.get("title") || "").trim();
    if (!title) return;
    const max = await db.testimonial.aggregate({ _max: { position: true } });
    await db.testimonial.create({
      data: {
        title,
        quote: String(fd.get("quote") || ""),
        image: String(fd.get("image") || ""),
        link: str(fd.get("link")),
        position: (max._max.position ?? 0) + 1,
      },
    });
    await flash("Đã thêm mới");
    refreshHome();
  }
  async function delTesti(fd: FormData) {
    "use server";
    await db.testimonial.delete({ where: { id: num(fd.get("id")) } });
    await flash("Đã xóa");
    refreshHome();
  }

  const [sliders, banners, types, brands, testimonials] = await Promise.all([
    db.slider.findMany({ orderBy: { position: "asc" } }),
    db.banner.findMany({ orderBy: { id: "asc" } }),
    db.productType.findMany({ orderBy: { position: "asc" } }),
    db.brandLogo.findMany({ orderBy: { position: "asc" } }),
    db.testimonial.findMany({ orderBy: { position: "asc" } }),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Giao diện trang chủ</h1>
          <p>Sửa xong bấm Lưu — trang chủ cập nhật ngay lập tức.</p>
        </div>
        <a className="btn-outline" href="/" target="_blank" rel="noreferrer">
          <Icon name="external" size={15} /> Xem trang chủ
        </a>
      </div>

      <div className="seg">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/appearance/home?tab=${t.key}`} className={tab === t.key ? "active" : ""}>
            {t.label}
          </Link>
        ))}
      </div>

      {/* ============ TAB: SLIDER ============ */}
      {tab === "sliders" && (
        <div className="panel panel-plain">
          <table className="admin-table table-editor">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Ảnh</th>
                <th>Ảnh desktop (URL)</th>
                <th>Ảnh mobile (URL)</th>
                <th>Link khi bấm</th>
                <th style={{ width: 64 }}>Thứ tự</th>
                <th style={{ width: 46 }}>Hiện</th>
                <th style={{ width: 92 }}></th>
              </tr>
            </thead>
            <tbody>
              {sliders.map((s) => (
                <tr key={s.id}>
                  <td>
                    <img className="thumb thumb-wide" src={s.imageDesktop} alt="" />
                  </td>
                  <td><UploadInput formId={`sl${s.id}`} name="imageDesktop" defaultValue={s.imageDesktop} /></td>
                  <td><UploadInput formId={`sl${s.id}`} name="imageMobile" defaultValue={s.imageMobile || ""} /></td>
                  <td><input form={`sl${s.id}`} name="link" defaultValue={s.link || ""} className="url-input" /></td>
                  <td><input form={`sl${s.id}`} name="position" type="number" defaultValue={s.position} className="num-input" /></td>
                  <td style={{ textAlign: "center" }}>
                    <input form={`sl${s.id}`} name="isActive" type="checkbox" defaultChecked={s.isActive} />
                  </td>
                  <td className="row-actions">
                    <form id={`sl${s.id}`} action={saveSlider} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" form={`sl${s.id}`} name="title" value={s.title || ""} />
                      <button className="icon-btn icon-btn-save" title="Lưu" type="submit"><Icon name="check" size={15} /></button>
                    </form>
                    <form action={delSlider} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmSubmit className="btn-danger-ghost" title="Xóa" message="Bạn chắc chắn muốn xóa mục này? Hành động không thể hoàn tác."><Icon name="trash" size={15} /></ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              <tr className="row-add">
                <td className="muted">Thêm mới</td>
                <td><UploadInput formId="sl-add" name="imageDesktop" placeholder="upload hoặc dán URL ảnh" /></td>
                <td><UploadInput formId="sl-add" name="imageMobile" placeholder="ảnh mobile (tùy chọn)" /></td>
                <td><input form="sl-add" name="link" placeholder="/bst-ao-lop" className="url-input" /></td>
                <td colSpan={2}></td>
                <td>
                  <form id="sl-add" action={addSlider}>
                    <button className="btn" type="submit"><Icon name="plus" size={14} /> Thêm</button>
                  </form>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ============ TAB: BANNER ============ */}
      {tab === "banners" && (
        <div className="panel panel-plain">
          <table className="admin-table table-editor">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Ảnh</th>
                <th style={{ width: 230 }}>Vị trí trên trang</th>
                <th>Ảnh (URL)</th>
                <th>Link khi bấm</th>
                <th style={{ width: 150 }}>Chữ trên nút</th>
                <th style={{ width: 52 }}></th>
              </tr>
            </thead>
            <tbody>
              {BANNER_SECTIONS.flatMap((sec) => [
                <tr key={sec.title} className="section-row">
                  <td colSpan={6}>
                    <b>{sec.title}</b>
                    <span className="muted"> — {sec.note}</span>
                  </td>
                </tr>,
                ...sec.slots.map((sl) => {
                  const b = banners.find((x) => x.slot === sl.slot);
                  if (!b) return null;
                  return (
                <tr key={b.id}>
                  <td><img className="thumb" src={b.image} alt="" /></td>
                  <td>
                    <b style={{ fontSize: 13 }}>{sl.label}</b>
                    <div className="muted">{sl.hint}</div>
                  </td>
                  <td><UploadInput formId={`bn${b.id}`} name="image" defaultValue={b.image} /></td>
                  <td><input form={`bn${b.id}`} name="link" defaultValue={b.link || ""} className="url-input" /></td>
                  <td>
                    {b.slot === "home_side" ? (
                      <input form={`bn${b.id}`} name="buttonText" defaultValue={b.buttonText || ""} />
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="row-actions">
                    <form id={`bn${b.id}`} action={saveBanner}>
                      <input type="hidden" name="id" value={b.id} />
                      <button className="icon-btn icon-btn-save" title="Lưu" type="submit"><Icon name="check" size={15} /></button>
                    </form>
                  </td>
                </tr>
                  );
                }),
              ])}
            </tbody>
          </table>
        </div>
      )}

      {/* ============ TAB: SẢN PHẨM NỔI BẬT (vòng tròn) ============ */}
      {tab === "types" && (
        <div className="panel panel-plain">
          <table className="admin-table table-editor">
            <thead>
              <tr>
                <th style={{ width: 74 }}>Ảnh</th>
                <th style={{ width: 190 }}>Tên</th>
                <th>Ảnh tròn (URL)</th>
                <th>Link &quot;Bài viết chi tiết&quot;</th>
                <th style={{ width: 64 }}>Thứ tự</th>
                <th style={{ width: 82 }}>Hiện ở nhà</th>
                <th style={{ width: 52 }}></th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id}>
                  <td>{t.image ? <img className="thumb thumb-round" src={t.image} alt="" /> : <span className="thumb thumb-empty">—</span>}</td>
                  <td><input form={`tp${t.id}`} name="name" defaultValue={t.name} /></td>
                  <td><UploadInput formId={`tp${t.id}`} name="image" defaultValue={t.image || ""} /></td>
                  <td><input form={`tp${t.id}`} name="articleSlug" defaultValue={t.articleSlug || ""} className="url-input" /></td>
                  <td><input form={`tp${t.id}`} name="position" type="number" defaultValue={t.position} className="num-input" /></td>
                  <td style={{ textAlign: "center" }}>
                    <input form={`tp${t.id}`} name="showOnHome" type="checkbox" defaultChecked={t.showOnHome} />
                  </td>
                  <td className="row-actions">
                    <form id={`tp${t.id}`} action={saveType}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="icon-btn icon-btn-save" title="Lưu" type="submit"><Icon name="check" size={15} /></button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============ TAB: KHÁCH HÀNG (logo) ============ */}
      {tab === "brands" && (
        <div className="panel panel-plain">
          <table className="admin-table table-editor">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Logo</th>
                <th style={{ width: 200 }}>Tên</th>
                <th>Ảnh (URL)</th>
                <th>Link khi bấm</th>
                <th style={{ width: 64 }}>Thứ tự</th>
                <th style={{ width: 46 }}>Hiện</th>
                <th style={{ width: 92 }}></th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id}>
                  <td><img className="thumb thumb-logo" src={b.image} alt="" /></td>
                  <td><input form={`br${b.id}`} name="title" defaultValue={b.title || ""} /></td>
                  <td><UploadInput formId={`br${b.id}`} name="image" defaultValue={b.image} /></td>
                  <td><input form={`br${b.id}`} name="link" defaultValue={b.link || ""} className="url-input" /></td>
                  <td><input form={`br${b.id}`} name="position" type="number" defaultValue={b.position} className="num-input" /></td>
                  <td style={{ textAlign: "center" }}>
                    <input form={`br${b.id}`} name="isActive" type="checkbox" defaultChecked={b.isActive} />
                  </td>
                  <td className="row-actions">
                    <form id={`br${b.id}`} action={saveBrand} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={b.id} />
                      <button className="icon-btn icon-btn-save" title="Lưu" type="submit"><Icon name="check" size={15} /></button>
                    </form>
                    <form action={delBrand} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={b.id} />
                      <ConfirmSubmit className="btn-danger-ghost" title="Xóa" message="Bạn chắc chắn muốn xóa mục này? Hành động không thể hoàn tác."><Icon name="trash" size={15} /></ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              <tr className="row-add">
                <td className="muted">Thêm mới</td>
                <td><input form="br-add" name="title" placeholder="Tên đơn vị" /></td>
                <td><UploadInput formId="br-add" name="image" placeholder="upload hoặc dán URL logo" /></td>
                <td><input form="br-add" name="link" placeholder="link (tùy chọn)" className="url-input" /></td>
                <td colSpan={2}></td>
                <td>
                  <form id="br-add" action={addBrand}>
                    <button className="btn" type="submit"><Icon name="plus" size={14} /> Thêm</button>
                  </form>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ============ TAB: PHẢN HỒI ============ */}
      {tab === "testimonials" && (
        <div className="panel panel-plain">
          <table className="admin-table table-editor">
            <thead>
              <tr>
                <th style={{ width: 74 }}>Ảnh</th>
                <th style={{ width: 210 }}>Tên khách / đơn vị</th>
                <th>Nội dung phản hồi</th>
                <th style={{ width: 180 }}>Ảnh & link</th>
                <th style={{ width: 64 }}>Thứ tự</th>
                <th style={{ width: 46 }}>Hiện</th>
                <th style={{ width: 92 }}></th>
              </tr>
            </thead>
            <tbody>
              {testimonials.map((t) => (
                <tr key={t.id}>
                  <td><img className="thumb" src={t.image} alt="" /></td>
                  <td><input form={`ts${t.id}`} name="title" defaultValue={t.title} /></td>
                  <td><textarea form={`ts${t.id}`} name="quote" rows={3} defaultValue={t.quote} className="quote-input" /></td>
                  <td>
                    <span style={{ display: "block", marginBottom: 6 }}><UploadInput formId={`ts${t.id}`} name="image" defaultValue={t.image} placeholder="URL ảnh" /></span>
                    <input form={`ts${t.id}`} name="link" defaultValue={t.link || ""} placeholder="link (tùy chọn)" className="url-input" />
                  </td>
                  <td><input form={`ts${t.id}`} name="position" type="number" defaultValue={t.position} className="num-input" /></td>
                  <td style={{ textAlign: "center" }}>
                    <input form={`ts${t.id}`} name="isActive" type="checkbox" defaultChecked={t.isActive} />
                  </td>
                  <td className="row-actions">
                    <form id={`ts${t.id}`} action={saveTesti} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="icon-btn icon-btn-save" title="Lưu" type="submit"><Icon name="check" size={15} /></button>
                    </form>
                    <form action={delTesti} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={t.id} />
                      <ConfirmSubmit className="btn-danger-ghost" title="Xóa" message="Bạn chắc chắn muốn xóa mục này? Hành động không thể hoàn tác."><Icon name="trash" size={15} /></ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              <tr className="row-add">
                <td className="muted">Thêm mới</td>
                <td><input form="ts-add" name="title" placeholder="Tên khách / đơn vị" /></td>
                <td><textarea form="ts-add" name="quote" rows={2} placeholder="Nội dung phản hồi..." className="quote-input" /></td>
                <td><UploadInput formId="ts-add" name="image" placeholder="upload hoặc dán URL ảnh" /></td>
                <td colSpan={2}></td>
                <td>
                  <form id="ts-add" action={addTesti}>
                    <button className="btn" type="submit"><Icon name="plus" size={14} /> Thêm</button>
                  </form>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
