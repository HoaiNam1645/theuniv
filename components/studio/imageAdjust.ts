'use client';

/**
 * Image-adjust enums + their Vietnamese labels.
 *
 * Bản thân enum sống ở `lib/studio/constants` (và `ImageAdjust` ở
 * `lib/studio/types`) vì chúng được lưu trên layer rồi đọc lại bởi renderer,
 * file in và route handler; chỉ nhãn hiển thị là của FE, nên đổi câu chữ không
 * bao giờ chạm vào SSOT. Re-export ở đây để consumer chỉ cần một import.
 */

import {
  DESIGN_BLEND_MODE,
  DESIGN_FRAME,
  DESIGN_PHOTO_FILTER,
  type DesignBlendMode,
  type DesignFrame,
  type DesignPhotoFilter,
} from '@/lib/studio/constants';

export {
  DESIGN_BLEND_MODE,
  DESIGN_FRAME,
  DESIGN_PHOTO_FILTER,
} from '@/lib/studio/constants';
export type {
  DesignBlendMode,
  DesignFrame,
  DesignPhotoFilter,
} from '@/lib/studio/constants';
export { IDENTITY_IMAGE_ADJUST } from '@/lib/studio/types';
export type { ImageAdjust } from '@/lib/studio/types';

export const DESIGN_PHOTO_FILTER_LABEL: Record<DesignPhotoFilter, string> = {
  [DESIGN_PHOTO_FILTER.NONE]: 'Mặc định',
  [DESIGN_PHOTO_FILTER.GRAYSCALE]: 'Trắng đen',
  [DESIGN_PHOTO_FILTER.SEPIA]: 'Nâu cổ điển',
  [DESIGN_PHOTO_FILTER.INVERT]: 'Đảo màu',
  [DESIGN_PHOTO_FILTER.VINTAGE]: 'Vintage',
};

export const DESIGN_BLEND_MODE_LABEL: Record<DesignBlendMode, string> = {
  [DESIGN_BLEND_MODE.NORMAL]: 'Bình thường',
  [DESIGN_BLEND_MODE.MULTIPLY]: 'Nhân (Multiply)',
  [DESIGN_BLEND_MODE.SCREEN]: 'Sáng (Screen)',
  [DESIGN_BLEND_MODE.OVERLAY]: 'Phủ (Overlay)',
};

export const DESIGN_FRAME_LABEL: Record<DesignFrame, string> = {
  [DESIGN_FRAME.NONE]: 'Không',
  [DESIGN_FRAME.THIN]: 'Viền mảnh',
  [DESIGN_FRAME.THICK]: 'Viền dày',
  [DESIGN_FRAME.ROUNDED]: 'Bo góc',
};

/**
 * Map an adjust state onto Fabric filter instances.
 *
 * Kept here (not in the panel) so the interactive canvas, the read-only
 * `MockupPreview` and the print export all build the same filter stack — the
 * whole point of storing the adjustment instead of baking it into the PNG.
 */
export async function buildFabricFilters(adjust: {
  filter: DesignPhotoFilter;
  brightness: number;
  contrast: number;
  saturation: number;
}): Promise<unknown[]> {
  const fabric = await import('fabric');
  const f = fabric.filters;
  const out: unknown[] = [];

  switch (adjust.filter) {
    case DESIGN_PHOTO_FILTER.GRAYSCALE:
      out.push(new f.Grayscale());
      break;
    case DESIGN_PHOTO_FILTER.SEPIA:
      out.push(new f.Sepia());
      break;
    case DESIGN_PHOTO_FILTER.INVERT:
      out.push(new f.Invert());
      break;
    case DESIGN_PHOTO_FILTER.VINTAGE:
      // No single "vintage" filter exists — it is sepia plus a lifted, softer
      // tone, which is what the preset is understood to mean.
      out.push(new f.Sepia(), new f.Contrast({ contrast: -0.1 }));
      break;
    default:
      break;
  }

  if (adjust.brightness) out.push(new f.Brightness({ brightness: adjust.brightness }));
  if (adjust.contrast) out.push(new f.Contrast({ contrast: adjust.contrast }));
  if (adjust.saturation) out.push(new f.Saturation({ saturation: adjust.saturation }));

  return out;
}
