"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { DesignStudio, type DesignStudioContext } from "@/components/studio/DesignStudio";
import { STUDIO_THEME } from "@/components/studio/studioTheme";
import type { MockupSet } from "@/components/studio/mockupSets";
import { useMockupSets } from "@/components/studio/useMockupSets";
import { isObjectId } from "@/lib/mongo";
import { DESIGN_ARTWORK } from "@/lib/studio/constants";
import { deleteMockupSet } from "../design-library/actions";
import { confirmDeleteSetMessage } from "../design-library/constants";
import PublishDrawer from "./PublishDrawer";
import {
  PRINT_MIME,
  PUBLISH_ERROR,
  PUBLISH_LABEL,
  STUDIO_LOGO_URL,
  STUDIO_STORE_NAME,
  type ProductFormOptions,
  type PublishDraft,
} from "./constants";

/**
 * Studio phía quản trị: ghép thiết kế rồi xuất bản thành sản phẩm.
 *
 * Nằm trong app/admin/(panel) nên sidebar + topbar của admin còn nguyên; studio chỉ
 * chiếm phần thân trang (xem .studio-host trong public/css/admin.css).
 *
 * KHÔNG tự chọn bộ/màu mặc định ở đây: DesignStudio đã làm việc đó trong effect và có
 * cơ chế THAY THẾ lựa chọn tạm khi thư viện thật về. Lấp thêm một lớp `useState(() =>
 * sets[0])` ở ngoài là dựng lại đúng cái bẫy đã trả giá — với dữ liệu async, initialiser
 * chạy lúc danh sách còn rỗng rồi không bao giờ ngó lại.
 */
export interface StudioAdminProps {
  options: ProductFormOptions;
}

export default function StudioAdmin({ options }: StudioAdminProps) {
  const router = useRouter();
  const { sets, error: libraryError, reload } = useMockupSets();

  const [draft, setDraft] = useState<PublishDraft | null>(null);
  const [setToDelete, setSetToDelete] = useState<MockupSet | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, startDelete] = useTransition();

  /**
   * Nút chính của studio.
   *
   * Ném lỗi thay vì nuốt: DesignStudio bắt lại và hiện ngay trên khung làm việc, nên
   * bấm mà không mở được drawer thì admin biết vì sao chứ không thấy một nút chết.
   */
  const handleOrder = useCallback(async (ctx: DesignStudioContext) => {
    if (ctx.isEmpty) throw new Error(PUBLISH_ERROR.EMPTY);
    // Áo vẽ tạm (builtin-tee) và mockup của sản phẩm không phải bản ghi trong kho —
    // API ghép ảnh tra theo ObjectId nên phải chặn ở đây, trước khi mở drawer.
    if (!isObjectId(ctx.mockupSetId)) throw new Error(PUBLISH_ERROR.SET_NOT_IMPORTED);
    if (!ctx.printArea) throw new Error(PUBLISH_ERROR.NO_PRINT_AREA);

    const canvas = await ctx.renderPrint();
    if (!canvas) throw new Error(PUBLISH_ERROR.EMPTY);

    setDraft({
      mockupSetId: ctx.mockupSetId,
      printDataUrl: canvas.toDataURL(PRINT_MIME),
      printArea: ctx.printArea,
      colorNames: ctx.colors.map((c) => c.name),
    });
  }, []);

  const confirmDelete = useCallback(() => {
    if (!setToDelete) return;
    const target = setToDelete;
    setSetToDelete(null);
    setDeleteError("");
    // Server action gọi từ event handler phải nằm trong transition (docs Next 16).
    startDelete(async () => {
      const res = await deleteMockupSet(target.id);
      if (!res.ok) {
        setDeleteError(res.error || "");
        return;
      }
      // Nạp lại thư viện studio, và refresh để toast + trang kho thấy thay đổi.
      reload();
      router.refresh();
    });
  }, [setToDelete, reload, router]);

  const notice = deleteError || libraryError;

  return (
    <>
      <DesignStudio
        // Studio quản trị không gắn với một sản phẩm nào: mọi áo đều đến từ thư viện
        // bộ mockup, nên không có "mockup của sản phẩm".
        mockups={[]}
        // Tông sáng để khớp nền trắng của trang quản trị; trang khách giữ tông tối.
        theme={STUDIO_THEME.LIGHT}
        artwork={DESIGN_ARTWORK}
        library={sets}
        allowUpload
        logoUrl={STUDIO_LOGO_URL}
        storeName={STUDIO_STORE_NAME}
        orderLabel={PUBLISH_LABEL}
        onOrder={handleOrder}
        onDeleteSet={setSetToDelete}
        actions={() =>
          // Lỗi tải/xoá bộ mockup hiện ngay trên khung làm việc: nuốt đi thì studio
          // trông như "shop chưa import bộ nào" trong khi API đang hỏng.
          notice ? (
            <p className="m-0 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
              {notice}
            </p>
          ) : deleting ? (
            <p className="m-0 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[12px] text-slate-200">
              Đang xoá bộ mockup…
            </p>
          ) : null
        }
      />

      <ConfirmDialog
        open={!!setToDelete}
        heading="Xoá bộ mockup"
        message={
          setToDelete ? confirmDeleteSetMessage(setToDelete.name, setToDelete.colors.length) : ""
        }
        onConfirm={confirmDelete}
        onCancel={() => setSetToDelete(null)}
      />

      {draft && (
        <PublishDrawer draft={draft} options={options} onClose={() => setDraft(null)} />
      )}
    </>
  );
}
