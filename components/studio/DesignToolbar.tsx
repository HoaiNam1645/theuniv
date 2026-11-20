'use client';

import {
  DESIGN_LAYER_MAX_SKEW,
  DESIGN_WARP_MODE,
  type DesignWarpMode,
} from '@/lib/studio/constants';
import {
  type CanvasLayer,
} from '@/lib/studio/types';
import { STUDIO, STUDIO_COPY } from './studioTheme';

/**
 * Per-layer transform controls, rendered in the studio's right-hand inspector
 * above the image-adjust panel.
 *
 * Everything here acts on the selected layer only — multi-select is deliberately
 * unsupported because one transform per layer is what the layer model (and
 * therefore the print file) can represent.
 *
 * Undo/redo are NOT here: they live on the canvas stage where the reference
 * puts them, and duplicating them would give two controls for one history.
 */

interface Props {
  layer: CanvasLayer | null;
  warpMode: DesignWarpMode | null;
  onPatch: (partial: Partial<CanvasLayer>, opts?: { transient?: boolean }) => void;
  onCommit: () => void;
  onFlip: (axis: 'x' | 'y') => void;
  onRemove: () => void;
  onReorder: (delta: number) => void;
  onToggleLock: () => void;
  onSetWarpMode: (mode: DesignWarpMode | null) => void;
  onClearWarp: () => void;
}

const ROTATE_STEP_DEG = 15;

const btn =
  'inline-flex items-center justify-center rounded-lg border border-[var(--studio-border)] bg-[var(--studio-row)] px-2.5 py-1.5 text-[12px] leading-none text-[var(--studio-ink-2)] transition hover:bg-[var(--studio-row-hover)] disabled:cursor-not-allowed disabled:opacity-40';
const btnOn = 'border-[var(--studio-accent-line)] bg-[var(--studio-accent)]/25 text-[var(--studio-accent-ink)]';

/** Slider row: label carries the live value so the track needs no tooltip. */
function Slider({
  label,
  value,
  min,
  max,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  onCommit: () => void;
}) {
  return (
    <div className={STUDIO.card}>
      <label className={STUDIO.cardLabel}>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        // Drags fire continuously — the caller marks them transient so one drag
        // is one undo step, then commits on release.
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        className="w-full accent-indigo-400"
      />
    </div>
  );
}

export function DesignToolbar({
  layer,
  warpMode,
  onPatch,
  onCommit,
  onFlip,
  onRemove,
  onReorder,
  onToggleLock,
  onSetWarpMode,
  onClearWarp,
}: Props) {
  if (!layer) return null;

  const opacityPct = Math.round((layer.opacity ?? 1) * 100);

  return (
    <>
      <div className={STUDIO.card}>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={btn} onClick={() => onFlip('x')} title="Lật ngang">
            ⇋ Lật ngang
          </button>
          <button type="button" className={btn} onClick={() => onFlip('y')} title="Lật dọc">
            ⇵ Lật dọc
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => onPatch({ rotation: (layer.rotation ?? 0) - ROTATE_STEP_DEG })}
            title="Xoay trái"
          >
            ↺
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => onPatch({ rotation: (layer.rotation ?? 0) + ROTATE_STEP_DEG })}
            title="Xoay phải"
          >
            ↻
          </button>
          <button type="button" className={btn} onClick={() => onReorder(1)} title="Lên trên">
            ↑ Lớp
          </button>
          <button type="button" className={btn} onClick={() => onReorder(-1)} title="Xuống dưới">
            ↓ Lớp
          </button>
          <button
            type="button"
            className={`${btn} ${layer.locked ? btnOn : ''}`}
            onClick={onToggleLock}
            title={layer.locked ? STUDIO_COPY.unlock : STUDIO_COPY.lock}
          >
            {layer.locked ? `🔒 ${STUDIO_COPY.unlock}` : `🔓 ${STUDIO_COPY.lock}`}
          </button>
          <button
            type="button"
            className={`${btn} border-[var(--studio-danger-line)] text-[var(--studio-danger)] hover:bg-rose-500/15`}
            onClick={onRemove}
            title={STUDIO_COPY.remove}
          >
            🗑 {STUDIO_COPY.remove}
          </button>
        </div>
      </div>

      <Slider
        label={`Độ mờ ${opacityPct}%`}
        value={opacityPct}
        min={0}
        max={100}
        onChange={(v) => onPatch({ opacity: v / 100 }, { transient: true })}
        onCommit={onCommit}
      />
      <Slider
        label={`Xoay ${Math.round(layer.rotation ?? 0)}°`}
        value={Math.round(layer.rotation ?? 0)}
        min={-180}
        max={180}
        onChange={(v) => onPatch({ rotation: v }, { transient: true })}
        onCommit={onCommit}
      />
      <Slider
        label={`Nghiêng ngang ${Math.round(layer.skewX ?? 0)}°`}
        value={Math.round(layer.skewX ?? 0)}
        min={-DESIGN_LAYER_MAX_SKEW}
        max={DESIGN_LAYER_MAX_SKEW}
        onChange={(v) => onPatch({ skewX: v }, { transient: true })}
        onCommit={onCommit}
      />
      <Slider
        label={`Nghiêng dọc ${Math.round(layer.skewY ?? 0)}°`}
        value={Math.round(layer.skewY ?? 0)}
        min={-DESIGN_LAYER_MAX_SKEW}
        max={DESIGN_LAYER_MAX_SKEW}
        onChange={(v) => onPatch({ skewY: v }, { transient: true })}
        onCommit={onCommit}
      />

      <div className={STUDIO.card}>
        <label className={STUDIO.cardLabel}>Bóp méo</label>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={`${btn} ${warpMode === DESIGN_WARP_MODE.PERSPECTIVE ? btnOn : ''}`}
            onClick={() =>
              onSetWarpMode(
                warpMode === DESIGN_WARP_MODE.PERSPECTIVE
                  ? null
                  : DESIGN_WARP_MODE.PERSPECTIVE,
              )
            }
            title="Kéo 4 góc để bóp phối cảnh"
          >
            Phối cảnh
          </button>
          <button
            type="button"
            className={`${btn} ${warpMode === DESIGN_WARP_MODE.WARP ? btnOn : ''}`}
            onClick={() =>
              onSetWarpMode(warpMode === DESIGN_WARP_MODE.WARP ? null : DESIGN_WARP_MODE.WARP)
            }
            title="Uốn cong tự do theo lưới"
          >
            Uốn cong
          </button>
          {layer.warp && (
            <button type="button" className={btn} onClick={onClearWarp} title="Bỏ bóp méo">
              Bỏ méo
            </button>
          )}
        </div>
      </div>
    </>
  );
}
