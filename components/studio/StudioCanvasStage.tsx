'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CanvasLayer } from '@/lib/studio/types';
import { STUDIO, STUDIO_COPY } from './studioTheme';
import type { DesignCanvasHandle } from './DesignCanvas';

/**
 * The workspace around the canvas: undo/redo, zoom, and the toolbar that floats
 * over whichever layer is selected.
 *
 * Colour and surface pickers deliberately do NOT live here — they belong to the
 * left column (`StudioMockupBar`), so the canvas stays a place to judge the
 * design rather than a surface competing controls are painted over.
 *
 * Everything here is chrome — the canvas itself stays `DesignCanvas`, so the
 * placement maths, warp and export keep exactly one implementation.
 */

export interface StudioSurface {
  id: string;
  label: string;
  /** Mockup for the currently-selected colour. */
  url: string;
}

const ICON =
  'h-4 w-4 stroke-current fill-none [stroke-width:1.7] [stroke-linecap:round] [stroke-linejoin:round]';

const ZOOM_MIN = 60;
const ZOOM_MAX = 180;
const ZOOM_STEP = 10;

interface StudioCanvasStageProps {
  canvasRef: React.RefObject<DesignCanvasHandle | null>;
  selected: CanvasLayer | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onRemove: () => void;
  /** The `<DesignCanvas>` (plus any overlay it needs). */
  children: ReactNode;
}

export function StudioCanvasStage({
  canvasRef,
  selected,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDuplicate,
  onToggleLock,
  onRemove,
  children,
}: StudioCanvasStageProps) {
  const [zoom, setZoom] = useState(100);
  /**
   * Pan offset in stage pixels.
   *
   * A design tool has to let you push the artboard around and zoom into a
   * corner — a slider that only scales about the centre cannot reach the top
   * of a sleeve at 180%. Pan + scale are applied as one transform on a layer
   * whose origin is its top-left, which is what makes zoom-at-cursor exact.
   */
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  /** Non-null while a background drag is panning; holds the grab origin. */
  const panFrom = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  /**
   * Hand tool. With it on, a drag anywhere moves the artboard — including on
   * the garment itself, which the Fabric canvas would otherwise swallow. Same
   * idea as holding space in a design app: the artwork stays put and you move
   * the view to it.
   */
  const [handMode, setHandMode] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(
    null,
  );

  /**
   * Đưa khung vẽ vừa vặn và nằm giữa vùng làm việc — là khung nhìn ban đầu và
   * cũng là nút "vừa khung".
   *
   * Trước đây hàm này luôn đặt 100% rồi mới căn giữa, tức chỉ CĂN GIỮA chứ không
   * VỪA KHUNG. Trên desktop vùng làm việc luôn rộng hơn khung vẽ nên không ai
   * thấy sai; trên điện thoại khung vẽ 502px trong vùng 360px, khách phải kéo qua
   * kéo lại mới nhìn hết cái áo. Thu nhỏ khi cần, và KHÔNG phóng quá 100% để màn
   * hình rộng vẫn ra đúng khung hình cũ.
   */
  const fit = useCallback(() => {
    const stage = stageRef.current;
    const content = contentRef.current;
    if (!stage || !content) return;
    const s = stage.getBoundingClientRect();
    // Measure at scale 1: `offsetWidth` ignores the CSS transform, so the
    // maths does not drift as the user zooms.
    const w = content.offsetWidth;
    const h = content.offsetHeight;
    if (!w || !h || !s.width || !s.height) return;
    const scale = Math.min(1, s.width / w, s.height / h);
    setZoom(scale * 100);
    setPan({ x: (s.width - w * scale) / 2, y: (s.height - h * scale) / 2 });
  }, []);

  useEffect(() => {
    // Fit once the canvas has a size, and again whenever the stage resizes.
    const id = requestAnimationFrame(fit);
    const stage = stageRef.current;
    if (!stage) return () => cancelAnimationFrame(id);
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [fit]);

  /**
   * Wheel zoom anchored at the pointer.
   *
   * The point under the cursor must not move: solve for the pan that keeps
   * `(cursor - pan) / scale` constant across the scale change. Zooming about
   * the centre instead — the obvious implementation — makes the thing you are
   * pointing at slide away as you zoom in.
   */
  const onWheel = useCallback((e: React.WheelEvent) => {
    const stage = stageRef.current;
    if (!stage) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;

    setZoom((prev) => {
      // Trackpad pinch arrives as ctrlKey+wheel with small deltas; a mouse
      // wheel sends large ones. Normalising keeps both feeling the same.
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev * factor));
      setPan((p) => ({
        x: cx - ((cx - p.x) * next) / prev,
        y: cy - ((cy - p.y) * next) / prev,
      }));
      return next;
    });
  }, []);

  /**
   * Pan by dragging the empty stage, or with the middle button anywhere.
   *
   * Restricted to the background so a drag that starts on the artwork still
   * moves the layer — Fabric owns those pointers.
   */
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const onBackground = e.target === stageRef.current;
      if (!handMode && e.button !== 1 && !onBackground) return;
      e.preventDefault();
      panFrom.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pan, handMode],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const from = panFrom.current;
    if (!from) return;
    setPan({
      x: from.px + (e.clientX - from.x),
      y: from.py + (e.clientY - from.y),
    });
  }, []);

  const endPan = useCallback(() => {
    panFrom.current = null;
  }, []);

  /* Keep the floating toolbar glued to the selected layer. Read after paint —
     Fabric has just re-rendered from the layer change. */
  useEffect(() => {
    if (!selected) {
      setRect(null);
      return;
    }
    const id = requestAnimationFrame(() => {
      const r = canvasRef.current?.layerRect(selected.id);
      setRect(r ? { left: r.left, top: r.top, width: r.width } : null);
    });
    return () => cancelAnimationFrame(id);
  }, [selected, canvasRef]);

  return (
    <div
      ref={stageRef}
      className={`${STUDIO.stage} touch-none select-none ${
        handMode ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onDoubleClick={(e) => {
        // Double-click the background to get back to a known view.
        if (e.target === stageRef.current) fit();
      }}
    >
      {/* ── top-centre: undo / redo ─────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center gap-2">
        <button
          type="button"
          className={`${STUDIO.pill} pointer-events-auto`}
          onClick={onUndo}
          disabled={!canUndo}
        >
          ↺ {STUDIO_COPY.undo}
        </button>
        <button
          type="button"
          className={`${STUDIO.pill} pointer-events-auto`}
          onClick={onRedo}
          disabled={!canRedo}
        >
          ↻ {STUDIO_COPY.redo}
        </button>
      </div>

      {/* ── bottom-centre: zoom ──────────────────────────────────
          Not the right edge: the floating inspector occupies that column from
          top-20 to bottom-6, so a vertical zoom column there disappeared behind
          it the moment a layer was selected. Bottom-centre is clear of both the
          inspector (right) and the host actions (bottom-left). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center">
        <div
          className={`${STUDIO.pill} pointer-events-auto gap-2 px-2 py-1`}
        >
          <button
            type="button"
            className="grid h-6 w-6 place-items-center rounded-full hover:bg-[var(--studio-hover)]"
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
            aria-label={`${STUDIO_COPY.zoom} −`}
          >
            −
          </button>
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label={STUDIO_COPY.zoom}
            className="w-24 accent-indigo-400"
          />
          <button
            type="button"
            className="grid h-6 w-6 place-items-center rounded-full hover:bg-[var(--studio-hover)]"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
            aria-label={`${STUDIO_COPY.zoom} +`}
          >
            +
          </button>
          <span className="w-11 text-right text-[11px] text-[var(--studio-muted)]">
            {Math.round(zoom)}%
          </span>
          <span className="mx-0.5 h-4 w-px bg-[var(--studio-border-strong)]" aria-hidden />
          <button
            type="button"
            onClick={fit}
            title="Vừa khung"
            aria-label="Vừa khung"
            className="grid h-6 w-6 place-items-center rounded-full hover:bg-[var(--studio-hover)]"
          >
            <svg className="h-3.5 w-3.5 stroke-current fill-none [stroke-width:1.8] [stroke-linecap:round]" viewBox="0 0 24 24">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setHandMode((v) => !v)}
            aria-pressed={handMode}
            title="Kéo di chuyển áo"
            aria-label="Kéo di chuyển áo"
            className={`grid h-6 w-6 place-items-center rounded-full transition ${
              handMode ? 'bg-[var(--studio-accent-soft-2)] text-[var(--studio-accent-ink)]' : 'hover:bg-[var(--studio-hover)]'
            }`}
          >
            <svg className="h-3.5 w-3.5 stroke-current fill-none [stroke-width:1.7] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24">
              <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v4a5 5 0 0 1-5 5h-1.5a5 5 0 0 1-4.2-2.3L6 15.5a1.5 1.5 0 0 1 2.4-1.8L9 14.5V11" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── canvas ──────────────────────────────────────────────────
          Absolutely positioned and transformed as one layer: `translate` then
          `scale` from the top-left corner, which is the frame the zoom-at-
          cursor maths above is written in. */}
      <div
        ref={contentRef}
        className="absolute left-0 top-0 w-[min(720px,70vh)] rounded-2xl bg-white p-2 shadow-2xl"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
          transformOrigin: '0 0',
        }}
      >
        <div className="relative">
          {children}

          {/* floating toolbar over the selected layer */}
          {selected && rect && (
            <div
              className="absolute z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-black/10 bg-white p-1 shadow-lg"
              style={{
                left: rect.left + rect.width / 2,
                top: Math.max(4, rect.top - 40),
              }}
            >
              {[
                [STUDIO_COPY.duplicate, onDuplicate, (
                  <svg className={ICON} viewBox="0 0 24 24" key="d">
                    <rect x="9" y="9" width="12" height="12" rx="2" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                  </svg>
                )],
                [selected.locked ? STUDIO_COPY.unlock : STUDIO_COPY.lock, onToggleLock, (
                  <svg className={ICON} viewBox="0 0 24 24" key="l">
                    <rect x="4" y="11" width="16" height="10" rx="2" />
                    <path d={selected.locked ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.5-2'} />
                  </svg>
                )],
                [STUDIO_COPY.remove, onRemove, (
                  <svg className={ICON} viewBox="0 0 24 24" key="r">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                )],
              ].map(([label, fn, icon]) => (
                <button
                  key={label as string}
                  type="button"
                  title={label as string}
                  aria-label={label as string}
                  onClick={fn as () => void}
                  // Thanh này có nền TRẮNG cứng (nó nổi trên ảnh áo, không theo
                  // tông của studio), nên chữ phải là màu tối cố định — dùng biến
                  // `--studio-ink` ở đây là trắng-trên-trắng khi studio ở tông tối.
                  className="grid h-8 w-8 place-items-center rounded-md text-slate-700 transition hover:bg-slate-100"
                >
                  {icon as ReactNode}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
