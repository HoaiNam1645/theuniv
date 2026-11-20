'use client';

import {
  COMPOSITE_MAX_EDGE,
  MAX_PRINT_DIMENSION,
  MEDIA_KIND,
} from '@/lib/studio/constants';
import {
  type CanvasLayer,
  type PrintArea,
} from '@/lib/studio/types';
import { dataUrlToFile, mediaUrl, uploadStudioImage } from '@/lib/studio/api';
import { resolveZonePx, type ZoneRect } from '@/lib/studio/geometry';
import {
  applyAdjustToImage,
  applyLayerToImage,
  applyTextLayer,
  fontStack,
  resolveLayerSource,
  textOf,
} from './designLayerRender';

/**
 * Export paths for a finished design.
 *
 * Two images come out of a session and they are NOT interchangeable:
 *  - the **mockup** — artwork composited onto the shirt, what the buyer shares
 *    in chat so both sides agree on what was ordered;
 *  - the **print file** — artwork only, transparent background, at artwork
 *    resolution, which is what the workshop actually prints. Printing the
 *    mockup would put the photo of a T-shirt on a T-shirt.
 */

/**
 * Render the artwork alone, at artwork resolution, on transparency.
 *
 * Deliberately does NOT reuse the on-screen canvas: that one is sized to the
 * viewport (~600px) and carries the mockup background and the zone guide. It
 * builds a fresh offscreen canvas whose coordinate space IS artwork space, so
 * the same `applyLayerToImage` maths that positioned the layers on screen
 * reproduces them at print scale.
 */
export async function renderPrintCanvas(
  layers: CanvasLayer[],
  artwork: { width: number; height: number },
): Promise<HTMLCanvasElement | null> {
  if (!layers.length) return null;
  const fabric = await import('fabric');

  const scale = Math.min(
    1,
    MAX_PRINT_DIMENSION / Math.max(artwork.width, artwork.height),
  );
  const width = Math.round(artwork.width * scale);
  const height = Math.round(artwork.height * scale);

  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;

  const canvas = new fabric.StaticCanvas(el, {
    width,
    height,
    // Transparent: the print file must carry no background of its own.
    backgroundColor: undefined,
  });

  // Artwork space maps 1:1 onto this canvas (modulo the safety downscale), so
  // the "zone" is simply the whole canvas.
  const zone: ZoneRect = { left: 0, top: 0, w: width, h: height, scale };

  for (const layer of [...layers].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
  )) {
    // Text prints as text. Skipping it here — which is what happened while
    // only images were handled — produces a print file missing exactly the
    // part the buyer typed, and nothing on screen says so.
    if (layer.type === 'text') {
      const t = new fabric.FabricText(textOf(layer), {
        fontFamily: fontStack(layer.fontFamily),
        selectable: false,
        evented: false,
      });
      applyTextLayer(t as never, layer, zone, artwork, {
        selectable: false,
        evented: false,
      });
      canvas.add(t);
      continue;
    }

    let source: CanvasImageSource;
    try {
      source = await resolveLayerSource(layer);
    } catch {
      // One unreachable asset must not abort the whole print file; the skipped
      // layer is visible by its absence and the buyer still has the mockup.
      continue;
    }
    const img = new fabric.FabricImage(source as HTMLImageElement);
    applyLayerToImage(img as never, layer, zone, artwork, {
      selectable: false,
      evented: false,
    });
    await applyAdjustToImage(img as never, layer);
    canvas.add(img);
  }

  canvas.renderAll();
  return el;
}

export interface DesignExportResult {
  previewUrl?: string;
  printUrl?: string;
}

/**
 * Upload both images and return their URLs.
 *
 * Đường upload chung của studio (`lib/studio/api`), gắn `kind: design` để phân
 * biệt với ảnh người mua tải lên. Lỗi được ném lên cho host xử lý — nuốt ở đây
 * sẽ trả về một `DesignExportResult` rỗng trông y hệt "chưa có gì để xuất".
 */
export async function uploadDesignImages(opts: {
  mockupDataUrl: string | null;
  printCanvas: HTMLCanvasElement | null;
  slug?: string;
}): Promise<DesignExportResult> {
  const stamp = Date.now().toString(36);
  const base = opts.slug ? `${opts.slug}-${stamp}` : `design-${stamp}`;
  const out: DesignExportResult = {};

  if (opts.mockupDataUrl) {
    out.previewUrl = await uploadStudioImage(
      dataUrlToFile(opts.mockupDataUrl, `${base}-mockup.png`),
      MEDIA_KIND.DESIGN,
    );
  }

  if (opts.printCanvas) {
    out.printUrl = await uploadStudioImage(
      dataUrlToFile(opts.printCanvas.toDataURL('image/png'), `${base}-print.png`),
      MEDIA_KIND.DESIGN,
    );
  }

  return out;
}

/**
 * Composite the design onto ONE garment mockup, offscreen.
 *
 * Publishing a designed product needs a photo per colour, not just the colour
 * the operator happened to be looking at. The on-screen canvas can only give
 * the active one, so this rebuilds the same scene against any mockup: the
 * garment as background, the layers placed by the SAME `applyLayerToImage`
 * maths the editor uses, so what ships is what was approved.
 *
 * Returns null when the mockup cannot be loaded — one unreachable colour must
 * not abort the whole publish.
 */
export async function renderMockupComposite(opts: {
  mockupUrl: string;
  layers: CanvasLayer[];
  artwork: { width: number; height: number };
  printArea?: PrintArea;
}): Promise<HTMLCanvasElement | null> {
  const fabric = await import('fabric');

  let bg: InstanceType<typeof fabric.FabricImage>;
  try {
    bg = await fabric.FabricImage.fromURL(mediaUrl(opts.mockupUrl), {
      // Without this the canvas is tainted and `toDataURL` throws — the same
      // rule the interactive canvas follows.
      crossOrigin: 'anonymous',
    });
  } catch {
    return null;
  }

  const natW = bg.width || 1;
  const natH = bg.height || 1;
  const scale = Math.min(1, COMPOSITE_MAX_EDGE / Math.max(natW, natH));
  const width = Math.round(natW * scale);
  const height = Math.round(natH * scale);

  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  const canvas = new fabric.StaticCanvas(el, { width, height });

  bg.set({
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    scaleX: width / natW,
    scaleY: height / natH,
  });
  canvas.backgroundImage = bg;

  const zone = resolveZonePx(
    opts.printArea,
    width,
    height,
    opts.artwork.width,
    opts.artwork.height,
  );

  for (const layer of [...opts.layers].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
  )) {
    if (layer.type === 'text') {
      const t = new fabric.FabricText(textOf(layer), {
        fontFamily: fontStack(layer.fontFamily),
        selectable: false,
        evented: false,
      });
      applyTextLayer(t as never, layer, zone, opts.artwork);
      canvas.add(t);
      continue;
    }
    let source: CanvasImageSource;
    try {
      source = await resolveLayerSource(layer);
    } catch {
      continue;
    }
    const img = new fabric.FabricImage(source as HTMLImageElement);
    applyLayerToImage(img as never, layer, zone, opts.artwork, {
      selectable: false,
      evented: false,
    });
    await applyAdjustToImage(img as never, layer);
    canvas.add(img);
  }

  canvas.renderAll();
  return el;
}

/** Upload a composited canvas and return its stored URL. */
export function uploadComposite(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<string> {
  return uploadStudioImage(
    dataUrlToFile(canvas.toDataURL('image/png'), filename),
    MEDIA_KIND.GALLERY,
  );
}
