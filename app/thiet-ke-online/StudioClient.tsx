'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DesignStudio,
  type DesignStudioContext,
} from '@/components/studio/DesignStudio';
import { useMockupSets } from '@/components/studio/useMockupSets';
import { isObjectId } from '@/lib/mongo';
import { STUDIO_API_ERROR, createDraft, fetchDraft } from '@/lib/studio/api';
import { DESIGN_ARTWORK } from '@/lib/studio/constants';
import type { DesignDraftDTO } from '@/lib/studio/types';
import { StudioOrderDialog } from './StudioOrderDialog';

/**
 * Studio cho khách. Khác bản quản trị đúng ở hai chỗ:
 *  - nút chính không xuất bản sản phẩm mà LƯU BẢN NHÁP rồi chốt đơn qua Zalo;
 *  - không truyền `onDeleteSet`, nên khách không đứng cách kho mockup của shop một cú
 *    bấm.
 */

const COPY = {
  orderLabel: 'Đặt hàng qua Zalo',
  loadingDraft: 'Đang mở bản thiết kế…',
  loadingLibrary: 'Đang tải kho áo…',
  emptyDesign: 'Hãy thêm ít nhất một mẫu hoặc một dòng chữ trước khi đặt hàng.',
  pickRealGarment:
    'Áo đang chọn là áo vẽ tạm. Mở mục "Sản phẩm" và chọn một bộ áo thật rồi đặt lại.',
  exportFailed: 'Không xuất được ảnh thiết kế. Thử lại sau vài giây.',
} as const;

interface StudioClientProps {
  logoUrl?: string;
  storeName: string;
  /** Link chat Zalo của shop; rỗng nghĩa là chưa cấu hình. */
  zaloUrl: string;
  /** Mã thiết kế lấy từ query param — mở lại đúng bản khách đã làm. */
  initialCode?: string;
}

/** Bản nháp vừa lưu + tên áo, đủ cho hộp thoại dựng tin nhắn Zalo. */
interface SavedDesign {
  draft: DesignDraftDTO;
  garmentName?: string;
}

export default function StudioClient({
  logoUrl,
  storeName,
  zaloUrl,
  initialCode,
}: StudioClientProps) {
  const { sets, loading: setsLoading, error: setsError } = useMockupSets();

  const [reopened, setReopened] = useState<DesignDraftDTO | null>(null);
  const [reopenError, setReopenError] = useState('');
  /**
   * Có mã trên URL thì phải CHỜ bản nháp về rồi mới dựng studio.
   *
   * `initialLayers` / `initialColor` chỉ được đọc lúc mount (state khởi tạo trong
   * `useDesignStudio`), nên studio dựng trước rồi mới có dữ liệu là dữ liệu rơi vào
   * hư không — khách bấm link mở lại thiết kế và nhận về canvas trắng.
   */
  const [draftSettled, setDraftSettled] = useState(!initialCode);

  const [saved, setSaved] = useState<SavedDesign | null>(null);

  useEffect(() => {
    if (!initialCode) return;
    let cancelled = false;
    fetchDraft(initialCode)
      .then((r) => !cancelled && setReopened(r.draft))
      .catch(
        (e) =>
          !cancelled &&
          setReopenError(
            e instanceof Error ? e.message : STUDIO_API_ERROR.draftNotFound,
          ),
      )
      .finally(() => !cancelled && setDraftSettled(true));
    return () => {
      cancelled = true;
    };
  }, [initialCode]);

  /**
   * Bộ mockup của bản nháp được đưa lên đầu danh sách.
   *
   * Đây là cách chọn sẵn đúng bộ mà không cần thêm prop cho studio: studio đã có luật
   * "chưa ai chọn thì bám theo đầu danh sách", nên xếp lại thứ tự là đủ. Mở lại một
   * thiết kế trên bộ áo khác thì hình in nằm sai chỗ mà nhìn vẫn như thật.
   */
  const library = useMemo(() => {
    const wanted = reopened?.mockupSetId;
    if (!wanted) return sets;
    const i = sets.findIndex((s) => s.id === wanted);
    return i > 0 ? [sets[i], ...sets.slice(0, i), ...sets.slice(i + 1)] : sets;
  }, [sets, reopened]);

  const handleOrder = useCallback(
    async (ctx: DesignStudioContext) => {
      // Ném lỗi thay vì tự hiện: studio đã có một chỗ báo lỗi, thêm chỗ thứ hai là
      // hai thông báo nói khác nhau về cùng một sự việc.
      if (ctx.isEmpty) throw new Error(COPY.emptyDesign);
      // Áo vẽ tạm mang id "builtin-tee" — không phải ObjectId nên route lưu nháp trả
      // 404. Chặn ngay ở đây để khách đọc được lý do thật thay vì "không tìm thấy bộ
      // mockup" sau khi đã ngồi thiết kế xong.
      if (!isObjectId(ctx.mockupSetId)) throw new Error(COPY.pickRealGarment);

      const previewDataUrl = ctx.exportMockup();
      if (!previewDataUrl) throw new Error(COPY.exportFailed);
      const print = await ctx.renderPrint();
      if (!print) throw new Error(COPY.exportFailed);

      const created = await createDraft({
        layers: ctx.layers,
        mockupSetId: ctx.mockupSetId,
        colorName: ctx.color,
        surfaceId: ctx.surfaceId,
        printDataUrl: print.toDataURL(),
        previewDataUrl,
      });

      /**
       * Đọc lại bản nháp vừa lưu thay vì tự suy mã in ở client.
       *
       * Danh sách mã in do server gom từ chính layer (`assetCodesOf`); dựng lại ở đây
       * là hai bản chép của cùng một luật, và bên lệch lại là bên xưởng đọc để lấy
       * file. Đổi lại một request, và request đó chứng minh luôn rằng mã tra được —
       * đúng việc khách sắp làm.
       */
      const { draft } = await fetchDraft(created.code);
      setSaved({
        draft,
        garmentName: sets.find((s) => s.id === ctx.mockupSetId)?.name,
      });
    },
    [sets],
  );

  /**
   * Chỉ dựng studio khi kho mockup VÀ bản nháp (nếu có) đã ngã ngũ.
   *
   * Không phải để tránh nháy màn hình mà để chọn đúng mặc định: `color` được khởi tạo
   * từ `mockups[0]` ngay lúc mount, nên dựng sớm là khởi tạo theo áo vẽ tạm. Khi bộ áo
   * thật về, studio giữ nguyên màu cũ nếu bộ mới cũng có tên màu đó — ảnh chụp lần đầu
   * bắt đúng lỗi này: mở ra đã chọn sẵn "Pepper" (màu đầu của áo vẽ tạm) thay vì màu
   * đầu của bộ thật. Chờ dữ liệu rồi mới mount thì mặc định là bộ đầu + màu đầu.
   */
  if (setsLoading || !draftSettled) {
    return (
      <div
        data-studio
        className="fixed inset-0 grid place-items-center bg-[#0b1020] text-[14px] text-slate-300"
      >
        {initialCode ? COPY.loadingDraft : COPY.loadingLibrary}
      </div>
    );
  }

  // Thông báo nền: kho mockup hỏng, hoặc mã thiết kế trên URL không tra ra. Cả hai đều
  // không chặn việc thiết kế tiếp, nhưng nuốt đi thì studio trông như "shop chưa có bộ
  // nào" trong khi thật ra API đang lỗi.
  const notice = setsError || reopenError;

  return (
    <>
      {/* `STUDIO.root` là `h-full` — nó lấp đầy hộp host cho, nên host phải là một hộp
          có chiều cao thật chứ không phải khối tự co. */}
      <div className="fixed inset-0">
        <DesignStudio
          mockups={[]}
          artwork={DESIGN_ARTWORK}
          library={library}
          initialLayers={reopened?.layers}
          initialColor={reopened?.colorName}
          allowUpload
          logoUrl={logoUrl}
          storeName={storeName}
          orderLabel={COPY.orderLabel}
          onOrder={handleOrder}
          actions={() =>
            notice ? (
              <p className="m-0 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
                {notice}
              </p>
            ) : null
          }
        />
      </div>

      {saved && (
        <StudioOrderDialog
          draft={saved.draft}
          garmentName={saved.garmentName}
          zaloUrl={zaloUrl}
          onClose={() => setSaved(null)}
        />
      )}
    </>
  );
}
