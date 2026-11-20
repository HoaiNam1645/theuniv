'use client';

import { colorNameToHex } from '@/lib/studio/colorMap';

/**
 * Built-in plain garment mockups, drawn as SVG.
 *
 * The studio must be usable the second it opens. It used to render nothing
 * until the product carried a mockup photo, so a new product showed a page
 * titled "Design studio" with no canvas at all — the tool was invisible until
 * an operator had already uploaded a garment somewhere else.
 *
 * Drawn rather than shipped as image files for three reasons:
 *  - **any colour**: the fill follows the swatch, so a colour list is not
 *    capped by how many photos someone remembered to upload;
 *  - **two sides for free**: front and back differ only by the collar path;
 *  - **nothing to host and nothing to license** — no bytes in the repo, no
 *    third party's product photography.
 *
 * A real photographed mockup always wins: these are the fallback, replaced the
 * moment `customization.surfaces[].mockupsByColor` has an entry for the colour.
 */

/** Canvas the paths are drawn in. Square, so the garment centres predictably. */
const VIEW = 1000;

/**
 * Flat-lay tee outline. One path for the body + sleeves, one for the collar.
 * Coordinates are hand-tuned to sit the print zone (which the studio overlays
 * separately) roughly across the chest.
 */
const BODY_PATH = [
  'M 350 150',
  'L 300 130',
  'C 250 150 190 190 150 240',
  'L 250 360',
  'L 300 320',
  'L 300 860',
  'L 700 860',
  'L 700 320',
  'L 750 360',
  'L 850 240',
  'C 810 190 750 150 700 130',
  'L 650 150',
  'Z',
].join(' ');

/** Front has an open scoop; the back neckline is shallower and straighter. */
const COLLAR_FRONT =
  'M 350 150 C 400 220 600 220 650 150 C 600 120 400 120 350 150 Z';
const COLLAR_BACK =
  'M 350 150 C 400 185 600 185 650 150 C 600 128 400 128 350 150 Z';

export type GarmentSide = 'front' | 'back';

/** Seam/shadow tint that keeps a white tee from reading as a blank rectangle. */
function seamColor(fill: string): string {
  return isLight(fill) ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.22)';
}

/** Rough perceived lightness — good enough to pick a contrasting seam colour. */
function isLight(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return true;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

/**
 * One garment as a `data:` URI.
 *
 * A data URI (not a hosted file) means the canvas can load it with no network
 * round-trip and no CORS question — `toDataURL` on the export path stays
 * untainted, which is what the whole Zalo hand-off depends on.
 */
export function garmentMockupUrl(color: string, side: GarmentSide = 'front'): string {
  // Accept a hex directly as well as a name: the Comfort Color palette carries
  // exact hexes, and re-deriving them from the English names through the
  // Vietnamese colour map would turn "Bay" and "Moss" into the unknown grey.
  const fill = /^#[0-9a-f]{3,8}$/i.test(color.trim())
    ? color.trim()
    : colorNameToHex(color) || '#ffffff';
  const seam = seamColor(fill);
  const collar = side === 'front' ? COLLAR_FRONT : COLLAR_BACK;

  // Light garments need a dark outline and a non-white backdrop, or a white
  // tee renders as a blank rectangle — see the note in seedGarmentMockups.
  const outline = isLight(fill) ? '#8a8a8a' : 'rgba(255,255,255,0.28)';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}" width="${VIEW}" height="${VIEW}">
<rect width="${VIEW}" height="${VIEW}" fill="#efefee"/>
<path d="${BODY_PATH}" fill="${fill}" stroke="${outline}" stroke-width="4"/>
<path d="${collar}" fill="none" stroke="${seam}" stroke-width="7"/>
<path d="M 300 320 L 300 860" stroke="${seam}" stroke-width="2" fill="none"/>
<path d="M 700 320 L 700 860" stroke="${seam}" stroke-width="2" fill="none"/>
</svg>`;

  // encodeURIComponent, not base64: keeps the URI readable in devtools and
  // avoids a btoa() call that throws on the non-ASCII colour names above.
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Colours offered when a product defines none.
 *
 * Deliberately short — these are stand-ins so the studio is usable, not a
 * catalogue. A real product's colour list replaces them wholesale.
 */
export const DEFAULT_GARMENT_COLORS = [
  'Trắng',
  'Đen',
  'Xám',
  'Navy',
  'Đỏ',
  'Be',
] as const;

export interface DefaultMockup {
  color: string;
  url: string;
  swatch: string;
}

/** Front-side mockups for the built-in colour list. */
export function defaultGarmentMockups(): DefaultMockup[] {
  return DEFAULT_GARMENT_COLORS.map((color) => ({
    color,
    url: garmentMockupUrl(color, 'front'),
    swatch: colorNameToHex(color),
  }));
}

/**
 * Print zone over the chest of the drawn garment, in the studio's normalised
 * `PrintArea` space (fractions of the mockup, anchored at its centre).
 */
const DEFAULT_PRINT_AREA = {
  x: 0.5,
  y: 0.46,
  w: 0.34,
  anchor: 'center' as const,
};

export interface DefaultSurface {
  id: string;
  label: string;
  mockupsByColor: Record<string, string>;
  printArea: typeof DEFAULT_PRINT_AREA;
}

/** Front + back, both available for every built-in colour. */
export function defaultGarmentSurfaces(): DefaultSurface[] {
  const byColor = (side: GarmentSide) =>
    Object.fromEntries(
      DEFAULT_GARMENT_COLORS.map((c) => [c, garmentMockupUrl(c, side)]),
    );
  return [
    {
      id: 'front',
      label: 'Mặt trước',
      mockupsByColor: byColor('front'),
      printArea: DEFAULT_PRINT_AREA,
    },
    {
      id: 'back',
      label: 'Mặt sau',
      mockupsByColor: byColor('back'),
      printArea: DEFAULT_PRINT_AREA,
    },
  ];
}
