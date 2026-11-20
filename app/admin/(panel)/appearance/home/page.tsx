import Link from "next/link";
import { db } from "@/lib/db";
import Icon from "@/components/admin/Icon";
import UploadInput from "@/components/admin/UploadInput";
import SliderMobileCheck from "@/components/admin/SliderMobileCheck";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { flash } from "@/lib/flash";
import { oid } from "@/lib/mongo";
import LayoutTab from "./LayoutTab";

import {
  HOME_SECTIONS,
  HOME_TAB,
  HOME_TAB_LABEL,
  SECTION_MEDIA,
  homeTabHref,
  type HomeTab,
} from "@/lib/homeSections";
import { hasUnpublishedChanges, readHomeDraft, refreshHome } from "@/lib/homeLayout";



// Tab và danh sách ô banner đều dựng TỪ SSOT `homeSections.ts`, không gõ lại.
// Bản chép cũ ở đây đã trôi khỏi SSOT ngay ngày đầu (3 dòng mô tả khác nhau) —
// đúng kiểu lệch âm thầm mà việc gom về một nguồn sinh ra để chặn.
const TABS = (Object.values(HOME_TAB) as HomeTab[]).map((key) => ({
  key,
  label: HOME_TAB_LABEL[key],
}));

const BANNER_SECTIONS = HOME_SECTIONS.filter(
  (s) => s.media === SECTION_MEDIA.BANNER_SLOTS && s.slots?.length,
).map((s) => ({ title: s.label, note: s.note, slots: s.slots ?? [] }));

const num = (v: FormDataEntryValue | null) => (v ? Number(v) || 0 : 0);
const str = (v: FormDataEntryValue | null) => String(v || "").trim() || null;

export default async function AppearancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = HOME_TAB.LAYOUT } = await searchParams;

  /* ============ SLIDERS ============ */
  async function saveSlider(fd: FormData) {
    "use server";
    await db.slider.update({
      where: { id: oid(fd.get("id")) },
      data: {
        title: str(fd.get("title")),
        imageDesktop: String(fd.get("imageDesktop") || ""),
        imageMobile: str(fd.get("imageMobile")),
        link: str(fd.get("link")),
        page: str(fd.get("page")) || null,
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
        page: str(fd.get("page")) || null,
        position: (max._max.position ?? 0) + 1,
      },
    });
    await flash("Đã thêm mới");
    refreshHome();
  }
  async function delSlider(fd: FormData) {
    "use server";
    await db.slider.delete({ where: { id: oid(fd.get("id")) } });
    await flash("Đã xóa");
    refreshHome();
  }

  /* ============ BANNERS ============ */
  async function saveBanner(fd: FormData) {
    "use server";
    await db.banner.update({
      where: { id: oid(fd.get("id")) },
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
      where: { id: oid(fd.get("id")) },
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
      where: { id: oid(fd.get("id")) },
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
    await db.brandLogo.delete({ where: { id: oid(fd.get("id")) } });
    await flash("Đã xóa");
    refreshHome();
  }

  /* ============ TESTIMONIALS ============ */
  async function saveTesti(fd: FormData) {
    "use server";
    await db.testimonial.update({
      where: { id: oid(fd.get("id")) },
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
    await db.testimonial.delete({ where: { id: oid(fd.get("id")) } });
    await flash("Đã xóa");
    refreshHome();
  }

  const [sliders, banners, types, brands, testimonials, categories] = await Promise.all([
    db.slider.findMany({ orderBy: [{ page: "asc" }, { position: "asc" }] }),
    db.banner.findMany({ orderBy: { id: "asc" } }),
    db.productType.findMany({ orderBy: { position: "asc" } }),
    db.brandLogo.findMany({ orderBy: { position: "asc" } }),
    db.testimonial.findMany({ orderBy: { position: "asc" } }),
    db.category.findMany({ select: { slug: true, name: true }, orderBy: { position: "asc" } }),
  ]);
  // Slider không gắn trang (trống) thuộc trang chủ; gắn slug danh mục thì hiện ở đầu trang đó.
  const pageOptions = [
    <option key="" value="">Trang chủ</option>,
    ...categories.map((c) => (
      <option key={c.slug} value={c.slug}>{c.name}</option>
    )),
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Giao diện trang chủ</h1>
          <p>Bố cục và chữ đi qua bản nháp; ảnh và danh sách có hiệu lực ngay.</p>
        </div>
        <a className="btn-outline" href="/" target="_blank" rel="noreferrer">
          <Icon name="external" size={15} /> Xem trang chủ
        </a>
      </div>

      <div className="seg">
        {TABS.map((t) => (
          <Link key={t.key} href={homeTabHref(t.key)} className={tab === t.key ? "active" : ""}>
            {t.label}
          </Link>
        ))}
      </div>

      {/* ============ TAB: SLIDER ============ */}
      {tab === HOME_TAB.LAYOUT && (
        <LayoutTab
          layout={await readHomeDraft()}
          banners={banners}
          dirty={await hasUnpublishedChanges()}
        />
      )}

      {tab === HOME_TAB.SLIDERS && (
        <div className="panel panel-plain">
          <table className="admin-table table-editor">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Ảnh</th>
                <th>Ảnh desktop (URL)</th>
                <th>Ảnh mobile (URL)</th>
                <th>Link khi bấm</th>
                <th style={{ width: 170 }}>Hiện ở trang</th>
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
                  <td>
                    <UploadInput formId={`sl${s.id}`} name="imageMobile" defaultValue={s.imageMobile || ""} />
                    <SliderMobileCheck src={s.imageMobile} />
                  </td>
                  <td><input form={`sl${s.id}`} name="link" defaultValue={s.link || ""} className="url-input" /></td>
                  <td>
                    <select form={`sl${s.id}`} name="page" defaultValue={s.page || ""}>
                      {pageOptions}
                    </select>
                  </td>
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
                <td><input form="sl-add" name="link" placeholder="/dong-phuc-ao-lop" className="url-input" /></td>
                <td>
                  <select form="sl-add" name="page" defaultValue="">
                    {pageOptions}
                  </select>
                </td>
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
      {tab === HOME_TAB.BANNERS && (
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
      {tab === HOME_TAB.TYPES && (
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
      {tab === HOME_TAB.BRANDS && (
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
      {tab === HOME_TAB.TESTIMONIALS && (
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
