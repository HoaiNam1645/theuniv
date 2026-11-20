'use client';

import { UNKNOWN_COLOR_HEX } from '@/lib/studio/colorMap';
import type { MockupSetDTO, PrintArea } from '@/lib/studio/types';
import { garmentMockupUrl, type GarmentSide } from './defaultGarment';

/**
 * Mockup sets — a named garment (Comfort Color tee, hoodie…) with one blank
 * image per colour.
 *
 * Modelled on the `mockup_template_sets` collection in etsy-system, so real
 * sets can be imported without reshaping anything here:
 *
 *   { kind: "1side"|"2side", name, templates: [{ color, url }], palette,
 *     placement | placementFront | placementBack, placeBaseUrl }
 *
 * Two deliberate differences, both conversions rather than redesigns:
 *  - **colour → hex** is carried here. That system stores only the colour NAME
 *    on a template and resolves the hex from its Comfort Color SSOT; the studio
 *    needs the hex to draw a swatch, so the palette below pairs them.
 *  - **placement** there is absolute pixels on a 2140×2000 canvas
 *    (`RectPlacement`); loc-store's `PrintArea` is a 0–1 fraction. See
 *    `rectPlacementToPrintArea` for the conversion, which is what an importer
 *    will call.
 */

/**
 * The 15 Comfort Color blanks, name + hex.
 *
 * Copied from etsy-system's `packages/shared/src/comfort-colors.ts` — the same
 * list its mockup generator uses, so a set imported from there lines up colour
 * for colour instead of falling back to a grey swatch.
 */
export const COMFORT_COLORS: { name: string; hex: string }[] = [
  { name: 'Pepper', hex: '#4E4B48' },
  { name: 'Black', hex: '#25282A' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Ivory', hex: '#E7CEB5' },
  { name: 'Blue Jean', hex: '#647692' },
  { name: 'Blossom', hex: '#F8BED6' },
  { name: 'Bay', hex: '#94A596' },
  { name: 'Moss', hex: '#22372B' },
  { name: 'Granite', hex: '#7C878E' },
  { name: 'Espresso', hex: '#553C36' },
  { name: 'Denim', hex: '#425563' },
  { name: 'Crimson', hex: '#A4123F' },
  { name: 'Navy', hex: '#0C2340' },
  { name: 'Butter', hex: '#F5E1A4' },
  { name: 'Chalky Mint', hex: '#5CB8B2' },
];

export interface MockupSetColor {
  /** Colour name — the key `mockupsByColor` and the variant options use. */
  name: string;
  hex: string;
  /** Blank garment for this colour, per side. */
  urls: Partial<Record<GarmentSide, string>>;
}

export interface MockupSet {
  id: string;
  name: string;
  /** `1side` has one print zone; `2side` has front and back. */
  kind: '1side' | '2side';
  colors: MockupSetColor[];
  /** Print zone for this garment — every set was authored with its own. */
  printArea?: PrintArea;
  /** True for the drawn stand-ins, so the UI can say so rather than imply real photography. */
  placeholder?: boolean;
}

/** etsy-system's absolute placement rect → loc-store's fractional `PrintArea`. */
export function rectPlacementToPrintArea(placement: {
  canvas: { w: number; h: number };
  design: { x: number; y: number; w: number; h: number };
}): { x: number; y: number; w: number; anchor: 'center' } {
  const { canvas, design } = placement;
  return {
    // Their rect is top-left anchored; ours is centre-anchored.
    x: (design.x + design.w / 2) / canvas.w,
    y: (design.y + design.h / 2) / canvas.h,
    w: design.w / canvas.w,
    anchor: 'center',
  };
}

/**
 * The set offered before any real one is imported.
 *
 * Drawn, not photographed, and flagged `placeholder` so the picker can label it
 * honestly — a stand-in that pretends to be a product photo is worse than one
 * that admits it.
 */
export function placeholderMockupSet(): MockupSet {
  return {
    id: 'builtin-tee',
    name: 'Áo thun trơn (tạm)',
    kind: '2side',
    placeholder: true,
    colors: COMFORT_COLORS.map((c) => ({
      name: c.name,
      hex: c.hex,
      urls: {
        front: garmentMockupUrl(c.hex, 'front'),
        back: garmentMockupUrl(c.hex, 'back'),
      },
    })),
  };
}

/**
 * DTO từ `GET /api/studio/mockup-sets` → shape mà picker của studio render.
 *
 * Shape trên dây khai báo một lần ở `lib/studio/types` (`MockupSetDTO`) và
 * route handler dùng chung — không khai lại ở đây.
 *
 * Bộ nào không có màu dùng được thì bỏ hẳn chứ không liệt kê: một entry mở ra
 * hàng swatch rỗng còn tệ hơn một entry vắng mặt.
 */
export function mockupSetsFromDTO(sets: MockupSetDTO[]): MockupSet[] {
  const out: MockupSet[] = [];

  for (const s of sets ?? []) {
    const colors: MockupSetColor[] = (s?.colors ?? [])
      .filter((c) => c?.name && c?.front)
      .map((c) => ({
        name: c.name,
        hex: c.hex || UNKNOWN_COLOR_HEX,
        urls: { front: c.front, ...(c.back ? { back: c.back } : {}) },
      }));
    if (!s?.id || !colors.length) continue;

    out.push({
      id: s.id,
      name: s.name || s.id,
      // Bộ import về là một mặt — ảnh nguồn hai mặt gộp cả hai áo vào một
      // bức, importer bỏ qua loại đó.
      kind: '1side',
      colors,
      ...(s.printArea ? { printArea: s.printArea } : {}),
    });
  }

  return out;
}
