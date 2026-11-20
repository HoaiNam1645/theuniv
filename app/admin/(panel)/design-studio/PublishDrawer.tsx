"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/admin/Icon";
import RichText from "@/components/admin/RichText";
import { PRODUCT_STATUS_LABEL, PRODUCT_STATUS_ORDER } from "@/lib/products";
import { slugify } from "@/lib/slug";
import { STUDIO_API_ERROR, compositeMockups } from "@/lib/studio/api";
import type { CompositeImageDTO } from "@/lib/studio/types";
import { publishStudioProduct } from "./actions";
import {
  PUBLISH_COPY,
  PUBLISH_FIELD,
  PUBLISH_INITIAL_STATE,
  type ProductFormOptions,
  type PublishDraft,
} from "./constants";

/**
 * Drawer xuất bản: thiết kế đang mở → một sản phẩm.
 *
 * Ghép ảnh chạy NGAY khi mở drawer chứ không đợi lúc submit, vì đây cũng là bản xem
 * trước: admin thấy thiết kế nằm trên từng màu áo trước khi quyết định lưu. Ghép 15
 * màu mất vài giây — giấu nó sau nút submit thì nút trông như treo.
 *
 * MỌI thông báo (lỗi ghép ảnh, lỗi validate từ server action) hiện TRONG drawer. Drawer
 * là một lớp phủ toàn màn hình: cái gì vẽ ở thân trang phía dưới thì không ai thấy, và
 * nút bấm sẽ trông như chết.
 */
/** Kiểu prop đặt tên riêng — xem ghi chú 71007 ở components/admin/ConfirmDialog.tsx. */
export interface PublishDrawerProps {
  draft: PublishDraft;
  options: ProductFormOptions;
  onClose: () => void;
}

export default function PublishDrawer({ draft, options, onClose }: PublishDrawerProps) {
  const [state, formAction, pending] = useActionState(
    publishStudioProduct,
    PUBLISH_INITIAL_STATE,
  );

  /* ---- ghép ảnh theo màu ---- */
  const [images, setImages] = useState<CompositeImageDTO[] | null>(null);
  const [compositeError, setCompositeError] = useState("");
  // Đổi số này là cách bảo effect chạy lại mà không nhân bản logic gọi API.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setImages(null);
    setCompositeError("");
    compositeMockups({
      mockupSetId: draft.mockupSetId,
      printDataUrl: draft.printDataUrl,
      printArea: draft.printArea,
      colorNames: draft.colorNames,
    })
      .then((r) => {
        if (!cancelled) setImages(r.images);
      })
      .catch((e) => {
        if (cancelled) return;
        setCompositeError(e instanceof Error ? e.message : STUDIO_API_ERROR.composite);
      });
    return () => {
      cancelled = true;
    };
  }, [draft, attempt]);

  /* ---- Esc để đóng, khoá cuộn nền ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  /* ---- tên + slug ---- */
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  // Slug bám theo tên cho tới khi admin tự sửa — sau đó không giật lại nữa.
  const [slugEdited, setSlugEdited] = useState(false);
  const shownSlug = slugEdited ? slug : slugify(name);

  const ready = !!images?.length;

  return createPortal(
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="drawer-head">
          <div>
            <h2 id="publish-title">{PUBLISH_COPY.TITLE}</h2>
            <p className="muted">{PUBLISH_COPY.SUBTITLE}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={17} />
          </button>
        </header>

        <form className="drawer-body edit-form" action={formAction}>
          {/* Ảnh ghép đi kèm form dưới dạng JSON: file in nặng hàng MB không lọt qua
              trần 1MB của server action, nên chỉ URL đã lưu mới đi đường này. */}
          <input
            type="hidden"
            name={PUBLISH_FIELD.IMAGES}
            value={JSON.stringify(images ?? [])}
          />

          <section className="drawer-section">
            <h3 className="panel-mini-title">Ảnh sản phẩm theo màu</h3>
            {!images && !compositeError && (
              <p className="drawer-note">
                <span className="upl-spin" aria-hidden /> {PUBLISH_COPY.COMPOSITING}
              </p>
            )}
            {compositeError && (
              <div className="drawer-error" role="alert">
                <span>{compositeError}</span>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  {PUBLISH_COPY.RETRY}
                </button>
              </div>
            )}
            {images && (
              <>
                <div className="img-preview">
                  {images.map((img) => (
                    <img key={img.colorName} src={img.url} alt={img.colorName} title={img.colorName} />
                  ))}
                </div>
                <p className="muted">
                  {/* Template literal, không trộn text với {expr} — xem ghi chú ở
                      design-library/page.tsx: cách trộn nuốt mất dấu cách. */}
                  {`${images.length} ảnh · ảnh đầu tiên (${images[0]?.colorName}) là ảnh đại diện. `}
                  {"Mỗi màu cũng được tạo thành một tag màu."}
                </p>
              </>
            )}
          </section>

          <label>
            Tên sản phẩm *
            <input
              name={PUBLISH_FIELD.NAME}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Áo thun in hình mèo mập"
            />
          </label>

          <label>
            Slug (đường dẫn, bỏ trống sẽ tự tạo từ tên)
            <input
              name={PUBLISH_FIELD.SLUG}
              className="url-input"
              value={shownSlug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value);
              }}
              placeholder="ao-thun-in-hinh-meo-map"
            />
          </label>

          <label>Mô tả sản phẩm</label>
          <RichText
            name={PUBLISH_FIELD.DESCRIPTION}
            minHeight={140}
            placeholder="Mô tả ngắn về chất liệu, kiểu dáng... (không bắt buộc)"
          />

          <div className="drawer-cols">
            <label>
              Trạng thái
              <select name={PUBLISH_FIELD.STATUS} defaultValue={PRODUCT_STATUS_ORDER[0]}>
                {PRODUCT_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{PRODUCT_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </label>
            <label>
              Loại sản phẩm
              <select name={PUBLISH_FIELD.PRODUCT_TYPE} defaultValue="">
                <option value="">— Chọn —</option>
                {options.productTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          </div>

          <section className="drawer-section">
            <h3 className="panel-mini-title">Danh mục / BST</h3>
            <div className="check-list">
              {options.categories.map((c) => (
                <label key={c.id} className="check">
                  <input type="checkbox" name={PUBLISH_FIELD.CATEGORY} value={c.id} />
                  {c.name} {c.kind === "bst" && <em>(BST)</em>}
                </label>
              ))}
              {options.categories.length === 0 && (
                <p className="muted">Chưa có danh mục nào.</p>
              )}
            </div>
          </section>

          <section className="drawer-section">
            <h3 className="panel-mini-title">Kích thước</h3>
            <div className="check-list">
              {/* value là TÊN, không phải id: tag `kich_thuoc` được lấy-hoặc-tạo lúc
                  lưu, y như tag màu. */}
              {options.sizeNames.map((name) => (
                <label key={name} className="check">
                  <input type="checkbox" name={PUBLISH_FIELD.SIZE} value={name} />
                  {name}
                </label>
              ))}
            </div>
          </section>

          <footer className="drawer-foot">
            {state.error && (
              <p className="drawer-error" role="alert">{state.error}</p>
            )}
            <div className="drawer-actions">
              <button className="btn" type="submit" disabled={!ready || pending}>
                {pending ? "Đang lưu..." : PUBLISH_COPY.SUBMIT}
              </button>
              <button type="button" className="btn-outline" onClick={onClose}>
                {PUBLISH_COPY.CANCEL}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>,
    document.body,
  );
}
