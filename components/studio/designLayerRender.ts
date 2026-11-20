'use client';

import {
  DESIGN_BLEND_MODE,
  DESIGN_FRAME,
  type DesignBlendMode,
  type DesignFrame,
} from '@/lib/studio/constants';
import {
  IDENTITY_IMAGE_ADJUST,
  type CanvasLayer,
  type ImageAdjust,
} from '@/lib/studio/types';
import { mediaUrl } from '@/lib/studio/api';
import { artworkToDisplay, type ZoneRect } from '@/lib/studio/geometry';
import { buildFabricFilters } from './imageAdjust';
import { renderSavedWarp } from './warpEngine';

/**
 * Turning a `CanvasLayer` into a positioned Fabric image — the one place that
 * knows how a layer's transforms map onto Fabric props.
 *
 * Used by BOTH the interactive studio canvas and the read-only `MockupPreview`,
 * so what the buyer arranges is pixel-identical to what the order preview and
 * the print file show.
 */

/** A Fabric image is structurally typed here to avoid importing fabric eagerly. */
export interface FabricImageLike {
  width?: number;
  height?: number;
  set: (props: Record<string, unknown>) => unknown;
  setCoords: () => unknown;
  getElement: () => CanvasImageSource;
  setElement: (el: CanvasImageSource) => unknown;
}

/** Cache of decoded source images, keyed by absolute URL. */
const imageCache = new Map<string, Promise<HTMLImageElement>>();

/**
 * Load a design PNG with CORS enabled.
 *
 * `crossOrigin: 'anonymous'` is not optional: without it the canvas becomes
 * tainted and `toDataURL` throws, which would break the export the entire
 * hand-off depends on.
 */
export function loadDesignImage(src: string): Promise<HTMLImageElement> {
  const url = mediaUrl(src);
  const cached = imageCache.get(url);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Không tải được ảnh: ${url}`));
    img.src = url;
  });
  imageCache.set(url, promise);
  // A failed load must not poison the cache for a later retry.
  void promise.catch(() => imageCache.delete(url));
  return promise;
}

/** Cache warped renders so re-rendering a preview does not redo the mesh maths. */
const warpCache = new Map<string, CanvasImageSource>();

function warpCacheKey(layer: CanvasLayer): string {
  return `${layer.src ?? ''}::${JSON.stringify(layer.warp)}`;
}

/**
 * The image source for a layer: the plain PNG, or its warped canvas when the
 * layer carries a warp. Falls back to the unwarped image if the mesh cannot be
 * rebuilt — a broken warp must degrade, never blank the preview.
 */
export async function resolveLayerSource(
  layer: CanvasLayer,
): Promise<CanvasImageSource> {
  const base = await loadDesignImage(layer.src ?? '');
  if (!layer.warp) return base;

  const key = warpCacheKey(layer);
  const cached = warpCache.get(key);
  if (cached) return cached;

  const warped = await renderSavedWarp(base, layer.warp);
  if (!warped) return base;
  warpCache.set(key, warped);
  return warped;
}

/**
 * Position and style a Fabric image from a layer.
 *
 * Note on warp: the engine's output bounding box shifts as the mesh moves (a
 * 200x200 source can render 200x195), so scale is always derived from the
 * *element currently attached* rather than the layer's declared size — using
 * the declared size would make the artwork creep on every warp edit.
 */
export function applyLayerToImage(
  img: FabricImageLike,
  layer: CanvasLayer,
  zone: ZoneRect,
  artwork: { width: number; height: number },
  extra?: Record<string, unknown>,
): void {
  const centre = artworkToDisplay(layer.x ?? 0, layer.y ?? 0, zone);

  const targetW = (layer.width ?? artwork.width * 0.5) * zone.scale;
  const targetH = (layer.height ?? artwork.height * 0.5) * zone.scale;
  const naturalW = img.width || 1;
  const naturalH = img.height || 1;

  img.set({
    left: centre.x,
    top: centre.y,
    originX: 'center',
    originY: 'center',
    scaleX: targetW / naturalW,
    scaleY: targetH / naturalH,
    angle: layer.rotation ?? 0,
    opacity: layer.opacity ?? 1,
    flipX: Boolean(layer.flipX),
    flipY: Boolean(layer.flipY),
    skewX: layer.skewX ?? 0,
    skewY: layer.skewY ?? 0,
    ...extra,
  });
  img.setCoords();
}

/* ────────────────────────────── text layers ────────────────────────────── */

/** Uppercase is a display option, so it is applied at render, not on the data. */
export function textOf(layer: CanvasLayer): string {
  const raw = (layer.defaultText ?? '').trim();
  return layer.uppercase ? raw.toUpperCase() : raw;
}

/** Quote the family so a name with spaces ("Times New Roman") still resolves. */
export function fontStack(family?: string): string {
  return family ? `"${family}", Arial, sans-serif` : 'Arial, sans-serif';
}

/**
 * Position a Fabric text object from a layer.
 *
 * Unlike an image, text is NOT scaled to a target box: the glyph box is a
 * result of the font size, so deriving `scaleX/scaleY` from it (what
 * `applyLayerToImage` does) would make every edit to the string silently
 * resize the layer. Size comes from `fontSize`, and the buyer's corner-drag is
 * read back as a font-size change instead.
 */
export function applyTextLayer(
  obj: FabricImageLike & { set: (p: Record<string, unknown>) => unknown },
  layer: CanvasLayer,
  zone: ZoneRect,
  artwork: { width: number; height: number },
  extra?: Record<string, unknown>,
): void {
  void artwork;
  const centre = artworkToDisplay(layer.x ?? 0, layer.y ?? 0, zone);

  obj.set({
    text: textOf(layer),
    fontFamily: fontStack(layer.fontFamily),
    fontSize: (layer.fontSize ?? 64) * zone.scale,
    fontWeight: layer.fontWeight ?? 'normal',
    fill: layer.fill || '#111827',
    textAlign: layer.textAlign ?? 'center',
    left: centre.x,
    top: centre.y,
    originX: 'center',
    originY: 'center',
    // Reset any scale a previous drag left behind — the size lives in
    // `fontSize`, and a leftover scale would compound with it.
    scaleX: 1,
    scaleY: 1,
    angle: layer.rotation ?? 0,
    opacity: layer.opacity ?? 1,
    flipX: Boolean(layer.flipX),
    flipY: Boolean(layer.flipY),
    skewX: layer.skewX ?? 0,
    skewY: layer.skewY ?? 0,
    ...extra,
  });
  obj.setCoords();
}

/**
 * Read a dragged/scaled text object back into layer space.
 *
 * The scale Fabric applied during the drag is folded into `fontSize` so the
 * next render starts from scale 1 — otherwise the two compound and the text
 * grows on every gesture.
 */
export function readTextIntoLayer(
  obj: {
    left?: number;
    top?: number;
    scaleX?: number;
    scaleY?: number;
    angle?: number;
    fontSize?: number;
    skewX?: number;
    skewY?: number;
    flipX?: boolean;
    flipY?: boolean;
  },
  zone: ZoneRect,
): Partial<CanvasLayer> {
  const scaled = (obj.fontSize ?? 64) * (obj.scaleY ?? 1);
  return {
    x: ((obj.left ?? 0) - zone.left) / zone.scale,
    y: ((obj.top ?? 0) - zone.top) / zone.scale,
    fontSize: scaled / zone.scale,
    rotation: obj.angle ?? 0,
    skewX: obj.skewX ?? 0,
    skewY: obj.skewY ?? 0,
    flipX: Boolean(obj.flipX),
    flipY: Boolean(obj.flipY),
  };
}

/* ─────────────────────────── image adjustments ─────────────────────────── */

/**
 * Frame thickness in canvas pixels. `strokeUniform` keeps these constant as the
 * layer is scaled, so a "viền mảnh" stays mảnh on a design blown up to fill the
 * shirt.
 */
const FRAME_STROKE_PX: Record<DesignFrame, number> = {
  [DESIGN_FRAME.NONE]: 0,
  [DESIGN_FRAME.THIN]: 2,
  [DESIGN_FRAME.THICK]: 8,
  [DESIGN_FRAME.ROUNDED]: 5,
};

/** White reads as a photo border on both light and dark garments. */
const FRAME_COLOR = '#ffffff';

/** `normal` is Canvas' default operation, not a real composite mode. */
const BLEND_OPERATION: Record<DesignBlendMode, string> = {
  [DESIGN_BLEND_MODE.NORMAL]: 'source-over',
  [DESIGN_BLEND_MODE.MULTIPLY]: 'multiply',
  [DESIGN_BLEND_MODE.SCREEN]: 'screen',
  [DESIGN_BLEND_MODE.OVERLAY]: 'overlay',
};

/**
 * Filters are expensive — `applyFilters()` re-uploads the texture — so they are
 * only rebuilt when the adjustment actually changed. `src` and `warp` are part
 * of the key because both replace the underlying element, which discards the
 * filtered result.
 */
function adjustKey(layer: CanvasLayer): string {
  return JSON.stringify([layer.adjust ?? null, layer.src ?? '', layer.warp ?? null]);
}

/** Fabric image, plus the two members only the adjust path touches. */
type FilterableImage = FabricImageLike & {
  filters?: unknown[];
  applyFilters?: () => unknown;
};

/**
 * Apply a layer's non-destructive adjustments: photo filter, the three sliders,
 * blend mode and frame.
 *
 * Called from all THREE render paths — the interactive canvas, the read-only
 * `MockupPreview` and the print export — so a design looks the same in the
 * editor, in the order preview and on the printed file. Adding an adjustment in
 * only one of them is exactly the drift this function exists to prevent.
 */
export async function applyAdjustToImage(
  img: FilterableImage,
  layer: CanvasLayer,
): Promise<void> {
  const adjust: ImageAdjust = { ...IDENTITY_IMAGE_ADJUST, ...(layer.adjust ?? {}) };
  const strokeWidth = FRAME_STROKE_PX[adjust.frame] ?? 0;

  img.set({
    globalCompositeOperation: BLEND_OPERATION[adjust.blend] ?? 'source-over',
    stroke: strokeWidth ? FRAME_COLOR : undefined,
    strokeWidth,
    strokeUniform: true,
    // The only difference a rounded frame can express on a rectangular image is
    // the corner join — an actual corner radius would need a second clipPath,
    // and the print-area clip already owns that slot.
    strokeLineJoin: adjust.frame === DESIGN_FRAME.ROUNDED ? 'round' : 'miter',
  });

  const key = adjustKey(layer);
  const holder = img as FilterableImage & { __adjustKey?: string };
  if (holder.__adjustKey === key) return;
  holder.__adjustKey = key;

  if (!img.applyFilters) return;
  img.filters = await buildFabricFilters(adjust);
  img.applyFilters();
}

/**
 * Read a Fabric object's live transform back into artwork space after the user
 * drags/scales/rotates it. Inverse of `applyLayerToImage`.
 */
export function readImageIntoLayer(
  img: {
    left?: number;
    top?: number;
    scaleX?: number;
    scaleY?: number;
    angle?: number;
    width?: number;
    height?: number;
    skewX?: number;
    skewY?: number;
    flipX?: boolean;
    flipY?: boolean;
  },
  zone: ZoneRect,
): Partial<CanvasLayer> {
  return {
    x: ((img.left ?? 0) - zone.left) / zone.scale,
    y: ((img.top ?? 0) - zone.top) / zone.scale,
    width: ((img.width ?? 1) * (img.scaleX ?? 1)) / zone.scale,
    height: ((img.height ?? 1) * (img.scaleY ?? 1)) / zone.scale,
    rotation: img.angle ?? 0,
    skewX: img.skewX ?? 0,
    skewY: img.skewY ?? 0,
    flipX: Boolean(img.flipX),
    flipY: Boolean(img.flipY),
  };
}
