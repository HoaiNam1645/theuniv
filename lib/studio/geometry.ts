import type { PrintArea } from './types';

/**
 * Print-zone geometry, shared by the read-only renderer (`MockupPreview`), the
 * interactive studio canvas and the print export.
 *
 * Hoisted out of `MockupPreview` when the studio was added: three surfaces
 * placing artwork with three copies of this maths is exactly how an editor
 * starts disagreeing with the preview the buyer approved.
 */

export interface ZoneRect {
  left: number;
  top: number;
  w: number;
  h: number;
  /** display px per artwork px — uniform, artwork is never stretched. */
  scale: number;
}

/** Default zone when a product has no print area configured yet. */
const FALLBACK_PRINT_AREA: PrintArea = {
  x: 0.5,
  y: 0.4,
  w: 0.42,
  anchor: 'center',
};

/** Config stores fractions, but legacy rows used percentages — accept both. */
function asFraction(value: number): number {
  return value > 1 ? value / 100 : value;
}

/**
 * Resolve a print area to a pixel rect on a `displayW × displayH` mockup.
 *
 * - anchor `center` (Rieng-style): x/y are the zone centre, width drives scale
 *   and height follows the artwork aspect unless given explicitly.
 * - anchor `topleft` (legacy): x/y are the top-left corner.
 */
export function resolveZonePx(
  pa: PrintArea | undefined,
  displayW: number,
  displayH: number,
  artW: number,
  artH: number,
): ZoneRect {
  const area = pa ?? FALLBACK_PRINT_AREA;
  const anchor = area.anchor ?? (area.h == null ? 'center' : 'topleft');
  const fw = Math.min(1, Math.max(0.05, asFraction(area.w)));

  const zoneW = fw * displayW;
  // One uniform scale: artwork keeps its aspect ratio in every mode.
  const scale = zoneW / artW;
  const zoneH = area.h != null ? asFraction(area.h) * displayH : artH * scale;

  if (anchor === 'center') {
    const cx = asFraction(area.x);
    const cy = asFraction(area.y);
    return {
      left: cx * displayW - zoneW / 2,
      top: cy * displayH - zoneH / 2,
      w: zoneW,
      h: zoneH,
      scale,
    };
  }

  return {
    left: asFraction(area.x) * displayW,
    top: asFraction(area.y) * displayH,
    w: zoneW,
    h: zoneH,
    scale,
  };
}

/**
 * Artwork-space point → display-space point.
 * Artwork coordinates are relative to the artwork box (`artW × artH`), whose
 * top-left sits at the zone origin.
 */
export function artworkToDisplay(
  x: number,
  y: number,
  zone: ZoneRect,
): { x: number; y: number } {
  return {
    x: zone.left + x * zone.scale,
    y: zone.top + y * zone.scale,
  };
}

/** Display-space point → artwork-space point (inverse of `artworkToDisplay`). */
export function displayToArtwork(
  x: number,
  y: number,
  zone: ZoneRect,
): { x: number; y: number } {
  return {
    x: (x - zone.left) / zone.scale,
    y: (y - zone.top) / zone.scale,
  };
}
