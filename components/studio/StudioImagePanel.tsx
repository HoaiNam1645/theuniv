'use client';

import { useState, type ReactNode } from 'react';
import type { CanvasLayer } from '@/lib/studio/types';
import { STUDIO, STUDIO_COPY } from './studioTheme';
import {
  DESIGN_BLEND_MODE,
  DESIGN_BLEND_MODE_LABEL,
  DESIGN_FRAME,
  DESIGN_FRAME_LABEL,
  DESIGN_PHOTO_FILTER,
  DESIGN_PHOTO_FILTER_LABEL,
  IDENTITY_IMAGE_ADJUST,
  type DesignBlendMode,
  type DesignFrame,
  type DesignPhotoFilter,
  type ImageAdjust,
} from './imageAdjust';

/**
 * Right-hand inspector for the selected layer.
 *
 * Laid out like the reference studio: a short list of action rows at the top,
 * each opening ONE section underneath, instead of every control stacked at
 * once in a 268px column. "Chỉnh ảnh" starts open because it is what an
 * operator reaches for straight after placing artwork.
 *
 * Everything here is non-destructive: filters, blend, frame and the three
 * sliders are stored on the layer and re-applied at render time (Fabric's own
 * `filters` pipeline), so the buyer's original PNG is never rewritten and the
 * print export can rebuild the exact same look at full resolution.
 */

const SLIDERS: { key: keyof ImageAdjust; label: string }[] = [
  { key: 'brightness', label: STUDIO_COPY.brightness },
  { key: 'contrast', label: STUDIO_COPY.contrast },
  { key: 'saturation', label: STUDIO_COPY.saturation },
];

/** Which disclosure is open. One at a time — the panel is a narrow column. */
type Section = 'adjust' | 'transform' | null;

const ICON =
  'h-4 w-4 stroke-current fill-none [stroke-width:1.7] [stroke-linecap:round] [stroke-linejoin:round]';

/** One action row: tinted glyph, label, chevron that rotates when open. */
function Row({
  label,
  tint,
  glyph,
  open,
  onClick,
}: {
  label: string;
  tint: string;
  glyph: ReactNode;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`${STUDIO.inspectorRow} ${open ? STUDIO.inspectorRowActive : ''}`}
    >
      <span className={STUDIO.inspectorRowIcon} style={{ background: tint }}>
        {glyph}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={`text-[13px] leading-none opacity-60 transition ${open ? 'rotate-90' : ''}`}
        aria-hidden
      >
        ›
      </span>
    </button>
  );
}

interface StudioImagePanelProps {
  layer: CanvasLayer | null;
  onPatch: (partial: Partial<CanvasLayer>, opts?: { transient?: boolean }) => void;
  onCommit: () => void;
  /** Transform controls, revealed by the "Biến đổi" row. */
  children?: ReactNode;
}

export function StudioImagePanel({
  layer,
  onPatch,
  onCommit,
  children,
}: StudioImagePanelProps) {
  const [section, setSection] = useState<Section>('adjust');

  if (!layer) {
    return <p className="m-0 text-[13px] text-[var(--studio-muted)]">{STUDIO_COPY.pickLayerHint}</p>;
  }

  const toggle = (s: Exclude<Section, null>) =>
    setSection((cur) => (cur === s ? null : s));

  // A text layer has no pixels to filter — a blend mode and a brightness
  // slider over glyphs would be four controls that change nothing.
  const isImage = layer.type !== 'text';

  const adjust: ImageAdjust = { ...IDENTITY_IMAGE_ADJUST, ...(layer.adjust ?? {}) };

  const setAdjust = (
    partial: Partial<ImageAdjust>,
    opts?: { transient?: boolean },
  ) => onPatch({ adjust: { ...adjust, ...partial } }, opts);

  return (
    <>
      {isImage && (
        <Row
          label={STUDIO_COPY.editImage}
          tint="linear-gradient(135deg,#6366f1,#8b5cf6)"
          open={section === 'adjust'}
          onClick={() => toggle('adjust')}
          glyph={
            <svg className={ICON} viewBox="0 0 24 24">
              <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
              <path d="M12 8.5 13.4 11l2.6 1-2.6 1-1.4 2.5L10.6 13 8 12l2.6-1z" />
            </svg>
          }
        />
      )}

      <Row
        label="Biến đổi"
        tint="linear-gradient(135deg,#0ea5e9,#22d3ee)"
        open={section === 'transform'}
        onClick={() => toggle('transform')}
        glyph={
          <svg className={ICON} viewBox="0 0 24 24">
            <path d="M3 7h13l-3-3M21 17H8l3 3" />
          </svg>
        }
      />

      {section === 'transform' && children}

      {isImage && section === 'adjust' && (
      <>
      <div className={STUDIO.sectionTitle}>{STUDIO_COPY.filters}</div>

      <div className={STUDIO.card}>
        <label className={STUDIO.cardLabel}>{STUDIO_COPY.filter}</label>
        <select
          className={STUDIO.select}
          value={adjust.filter}
          onChange={(e) =>
            setAdjust({ filter: e.target.value as DesignPhotoFilter })
          }
        >
          {Object.values(DESIGN_PHOTO_FILTER).map((f) => (
            <option key={f} value={f}>
              {DESIGN_PHOTO_FILTER_LABEL[f]}
            </option>
          ))}
        </select>
      </div>

      <div className={STUDIO.card}>
        <label className={STUDIO.cardLabel}>{STUDIO_COPY.blend}</label>
        <select
          className={STUDIO.select}
          value={adjust.blend}
          onChange={(e) => setAdjust({ blend: e.target.value as DesignBlendMode })}
        >
          {Object.values(DESIGN_BLEND_MODE).map((b) => (
            <option key={b} value={b}>
              {DESIGN_BLEND_MODE_LABEL[b]}
            </option>
          ))}
        </select>
      </div>

      <div className={STUDIO.card}>
        <label className={STUDIO.cardLabel}>{STUDIO_COPY.frame}</label>
        <select
          className={STUDIO.select}
          value={adjust.frame}
          onChange={(e) => setAdjust({ frame: e.target.value as DesignFrame })}
        >
          {Object.values(DESIGN_FRAME).map((f) => (
            <option key={f} value={f}>
              {DESIGN_FRAME_LABEL[f]}
            </option>
          ))}
        </select>
      </div>

      {SLIDERS.map(({ key, label }) => (
        <div key={key} className={STUDIO.card}>
          <label className={STUDIO.cardLabel}>
            {label} {Math.round((adjust[key] as number) * 100)}%
          </label>
          <input
            type="range"
            min={-100}
            max={100}
            value={Math.round((adjust[key] as number) * 100)}
            // Dragging fires continuously — mark transient so one drag is one
            // undo step, then commit on release.
            onChange={(e) =>
              setAdjust({ [key]: Number(e.target.value) / 100 } as Partial<ImageAdjust>, {
                transient: true,
              })
            }
            onPointerUp={onCommit}
            className="w-full accent-indigo-400"
          />
        </div>
      ))}

      <button
        type="button"
        className={`${STUDIO.card} cursor-pointer text-center text-[13px] font-semibold text-[var(--studio-ink-2)] transition hover:bg-[var(--studio-row-hover)]`}
        onClick={() => onPatch({ adjust: { ...IDENTITY_IMAGE_ADJUST } })}
      >
        ↻ {STUDIO_COPY.reset}
      </button>
      </>
      )}
    </>
  );
}
