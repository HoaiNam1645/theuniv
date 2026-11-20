import Link from "next/link";
import type { Banner } from "@prisma/client";
import Icon from "@/components/admin/Icon";
import UploadInput from "@/components/admin/UploadInput";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import {
  HOME_PREVIEW_PATH,
  LAYOUT_FIELD,
  MOVE,
  SECTION_MEDIA,
  sectionById,
  sectionText,
  type HomeLayout,
} from "@/lib/homeSections";
import HomePreview from "./HomePreview";
import SectionRow from "./SectionRow";
import {
  discardDraft,
  moveSection,
  publishLayout,
  resetLayout,
  saveBannerSlot,
  saveSectionTexts,
  toggleSection,
} from "./layoutActions";

/**
 * Trình sửa trang chủ: danh sách khối bên trái, xem trước bên phải.
 *
 * Danh sách hiện theo ĐÚNG thứ tự trang chủ, nên nhìn là biết khối nào nằm trên
 * khối nào. Các tab bên cạnh vẫn là nơi quản DANH SÁCH ảnh của từng khối (slider,
 * logo, phản hồi…) — cố ý không bê CRUD danh sách sang đây, vì hai bản CRUD cho
 * cùng một bảng là cách chắc chắn để chúng lệch nhau.
 */
export default function LayoutTab({
  layout,
  banners,
  dirty,
}: {
  /** Bản NHÁP — mọi thao tác ở đây ghi vào nháp, không đụng trang chủ. */
  layout: HomeLayout;
  banners: Banner[];
  /** Nháp đang khác bản đang phát hành. */
  dirty: boolean;
}) {
  const bySlot = new Map(banners.map((b) => [b.slot, b]));
  // Khoá tải lại của khung xem trước. PHẢI gồm cả dữ liệu banner: lưu ảnh không
  // đụng tới `layout`, nên nếu chỉ lấy layout thì admin lưu ảnh xong nhìn sang
  // preview thấy y như cũ và tưởng lưu hỏng.
  const version = JSON.stringify([
    layout,
    banners.map((b) => [b.slot, b.image, b.link, b.buttonText]),
  ]);

  return (
    <div className="editor">
      <div className="editor-pane">
        <div className="editor-head">
          <div className="editor-head-top">
            <b>Bố cục trang chủ</b>
            <span className={`publish-state${dirty ? " is-dirty" : ""}`}>
              {dirty ? "● Có thay đổi chưa xuất bản" : "Đã xuất bản, không có thay đổi"}
            </span>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Thứ tự, bật/tắt và chữ đi qua <b>bản nháp</b> — trang chủ chỉ đổi khi bấm Xuất bản.
            {/* Nói rõ phạm vi: ảnh và danh sách nằm ở bảng khác, không đi theo nháp. */}
            {" "}Ảnh và các danh sách (slider, logo, phản hồi…) có hiệu lực ngay.
          </p>

          <div className="publish-bar">
            <a className="btn-outline" href={HOME_PREVIEW_PATH} target="_blank" rel="noreferrer">
              Xem bản nháp
            </a>
            {dirty && (
              <form action={discardDraft}>
                <ConfirmSubmit
                  className="btn-outline"
                  message="Bỏ toàn bộ thay đổi trong bản nháp và quay về đúng thứ đang chạy?"
                  confirmLabel="Bỏ nháp"
                >
                  Bỏ nháp
                </ConfirmSubmit>
              </form>
            )}
            <form action={publishLayout}>
              <button className="btn-primary" disabled={!dirty}>
                Xuất bản
              </button>
            </form>
            <form action={resetLayout}>
              <ConfirmSubmit
                className="btn-outline"
                message="Trả thứ tự, trạng thái ẩn/hiện và toàn bộ chữ về nguyên bản? Việc này áp dụng ngay cho trang chủ."
              >
                Về gốc
              </ConfirmSubmit>
            </form>
          </div>
        </div>

        <div className="section-list">
          {layout.order.map((id, i) => {
            const s = sectionById(id);
            if (!s) return null;
            const isHidden = layout.hidden.includes(id);
            const first = s.texts[0];

            return (
              <SectionRow
                key={id}
                index={i + 1}
                label={s.label}
                note={s.note}
                summary={first ? sectionText(layout, id, first.key) : undefined}
                hidden={isHidden}
                defaultOpen={i === 0}
                controls={
                  <>
                    <form action={moveSection}>
                      <input type="hidden" name={LAYOUT_FIELD.ID} value={id} />
                      <input type="hidden" name={LAYOUT_FIELD.DIR} value={MOVE.UP} />
                      <button className="icon-btn" title="Lên trên" disabled={i === 0}>
                        <Icon name="chevron-up" size={16} />
                      </button>
                    </form>
                    <form action={moveSection}>
                      <input type="hidden" name={LAYOUT_FIELD.ID} value={id} />
                      <input type="hidden" name={LAYOUT_FIELD.DIR} value={MOVE.DOWN} />
                      <button
                        className="icon-btn"
                        title="Xuống dưới"
                        disabled={i === layout.order.length - 1}
                      >
                        <Icon name="chevron-down" size={16} />
                      </button>
                    </form>
                    <form action={toggleSection}>
                      <input type="hidden" name={LAYOUT_FIELD.ID} value={id} />
                      <button
                        className={`switch${isHidden ? "" : " is-on"}`}
                        title={isHidden ? "Đang tắt — bấm để hiện" : "Đang bật — bấm để ẩn"}
                      >
                        <span className="switch-label">{isHidden ? "Tắt" : "Bật"}</span>
                        <span className="switch-track"><span className="switch-knob" /></span>
                      </button>
                    </form>
                  </>
                }
              >
                {s.texts.length > 0 && (
                  <form action={saveSectionTexts} className="section-texts">
                    <input type="hidden" name={LAYOUT_FIELD.ID} value={id} />
                    {s.texts.map((t) => (
                      <label key={t.key} className="field">
                        <span>{t.label}</span>
                        <input
                          className="url-input"
                          name={LAYOUT_FIELD.textOf(t.key)}
                          defaultValue={sectionText(layout, id, t.key)}
                          placeholder={t.default}
                        />
                      </label>
                    ))}
                    <div className="field-actions">
                      <button className="btn-primary">Lưu nháp</button>
                      <small className="muted">Để trống ô là quay lại chữ gốc.</small>
                    </div>
                  </form>
                )}

                {s.media === SECTION_MEDIA.BANNER_SLOTS && s.slots && (
                  <div className="section-slots">
                    {s.slots.map((slot) => {
                      const b = bySlot.get(slot.slot);
                      return (
                        <form action={saveBannerSlot} key={slot.slot} className="slot">
                          <input type="hidden" name={LAYOUT_FIELD.SLOT} value={slot.slot} />
                          <b>{slot.label}</b>
                          <small className="muted">{slot.hint}</small>
                          <UploadInput name={LAYOUT_FIELD.IMAGE} defaultValue={b?.image || ""} />
                          <input
                            className="url-input"
                            name={LAYOUT_FIELD.LINK}
                            defaultValue={b?.link || ""}
                            placeholder="Liên kết khi bấm vào (tuỳ chọn)"
                          />
                          <input
                            className="url-input"
                            name={LAYOUT_FIELD.BUTTON_TEXT}
                            defaultValue={b?.buttonText || ""}
                            placeholder="Chữ trên nút (nếu ô này có nút)"
                          />
                          <button className="btn-primary">Lưu ảnh</button>
                        </form>
                      );
                    })}
                  </div>
                )}

                {s.media === SECTION_MEDIA.COLLECTION && s.manageHref && (
                  <div className="section-manage">
                    <Icon name="images" size={16} />
                    <span>Ảnh của khối này là một danh sách, quản ở trang riêng.</span>
                    <Link className="btn-outline" href={s.manageHref}>
                      {s.manageLabel}
                    </Link>
                  </div>
                )}

                {s.media === SECTION_MEDIA.NONE && (
                  <p className="muted" style={{ margin: 0 }}>
                    Khối này không có ảnh.
                  </p>
                )}
              </SectionRow>
            );
          })}
        </div>
      </div>

      <HomePreview version={version} />
    </div>
  );
}
