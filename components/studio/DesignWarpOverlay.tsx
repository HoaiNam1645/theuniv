'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  DESIGN_WARP_MODE,
  type DesignWarpMode,
} from '@/lib/studio/constants';
import {
  type CanvasLayer,
  type WarpCoord,
} from '@/lib/studio/types';
import {
  createWarpSession,
  WARP_VERTICES,
  type WarpSession,
  type WarpVertex,
} from './warpEngine';

/**
 * Draggable control points laid over the selected layer.
 *
 * The warp maths lives in `warpvas` (see `warpEngine`); this component only
 * turns pointer drags into vertex moves and paints the handles. Handle
 * positions are in the LAYER's own image space, mapped onto the layer's screen
 * rect — so they follow the layer as it is moved/scaled on the canvas.
 */

interface LayerRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  layer: CanvasLayer;
  mode: DesignWarpMode;
  /** Screen rect of the layer on the canvas, in canvas-wrapper coordinates. */
  rect: LayerRect;
  /** Untransformed source element of the layer (the un-warped image). */
  source: CanvasImageSource | null;
  /** Push a freshly warped canvas straight onto the Fabric object. */
  onPreview: (canvas: HTMLCanvasElement) => void;
  /** Commit the serialized warp onto the layer (one undo step). */
  onCommit: (warp: CanvasLayer['warp']) => void;
  onError?: (message: string) => void;
}

/** Which grid cell each corner handle belongs to, per vertex. */
function cellFor(
  vertex: WarpVertex,
  rows: number,
  columns: number,
): { row: number; col: number } {
  return {
    row: vertex === 'tl' || vertex === 'tr' ? 0 : rows - 1,
    col: vertex === 'tl' || vertex === 'bl' ? 0 : columns - 1,
  };
}

export function DesignWarpOverlay({
  layer,
  mode,
  rect,
  source,
  onPreview,
  onCommit,
  onError,
}: Props) {
  const sessionRef = useRef<WarpSession | null>(null);
  const [corners, setCorners] = useState<Record<WarpVertex, WarpCoord> | null>(
    null,
  );
  /** Grid the session was opened with — `updateVertexCoord` addresses a cell. */
  const gridRef = useRef({ rows: 1, columns: 1 });
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  const dragRef = useRef<{ vertex: WarpVertex } | null>(null);
  const dirtyRef = useRef(false);

  /* ---- open a warp session for this layer ---- */
  useEffect(() => {
    let cancelled = false;
    sessionRef.current?.dispose();
    sessionRef.current = null;
    setCorners(null);

    if (!source) return;

    // The engine measures in the source image's own pixels, so handle
    // positions must be normalised against those, not the on-screen size.
    const w =
      (source as HTMLImageElement).naturalWidth ||
      (source as HTMLCanvasElement).width ||
      1;
    const h =
      (source as HTMLImageElement).naturalHeight ||
      (source as HTMLCanvasElement).height ||
      1;
    setNatural({ width: w, height: h });

    // Fabric hands back a `CanvasImageSource`, but the warp engine only accepts
    // an image or canvas element. Anything else (video, ImageBitmap) can never
    // be a design layer, so bail rather than widening the engine's contract.
    if (
      !(source instanceof HTMLImageElement) &&
      !(source instanceof HTMLCanvasElement)
    ) {
      onError?.('Lớp này không bóp méo được');
      return;
    }

    void createWarpSession(source, mode, layer.warp)
      .then((session) => {
        if (cancelled) {
          session.dispose();
          return;
        }
        sessionRef.current = session;
        const warp = session.toLayerWarp();
        gridRef.current = { rows: warp.rows, columns: warp.columns };
        setCorners(session.corners());
      })
      .catch(() => onError?.('Không tải được công cụ warp'));

    return () => {
      cancelled = true;
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
    // Re-open only when the layer identity or mode changes — not on every
    // transform, or dragging the layer would reset the mesh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.id, mode, source]);

  const moveVertex = useCallback(
    (vertex: WarpVertex, clientX: number, clientY: number, host: DOMRect) => {
      const session = sessionRef.current;
      if (!session) return;

      // Screen → layer-image space (the engine measures in source pixels).
      const fx = (clientX - host.left - rect.left) / Math.max(1, rect.width);
      const fy = (clientY - host.top - rect.top) / Math.max(1, rect.height);
      const coord: WarpCoord = {
        x: fx * natural.width,
        y: fy * natural.height,
      };

      const { rows, columns } = gridRef.current;
      const { row, col } = cellFor(vertex, rows, columns);
      const rendered = session.moveVertex(row, col, vertex, coord);
      if (!rendered) {
        // Perspective rejects self-crossing shapes; the session already rolled
        // back, so drop this frame and keep the last good render.
        return;
      }
      dirtyRef.current = true;
      onPreview(rendered);
      setCorners(session.corners());
    },
    [natural.height, natural.width, onPreview, rect],
  );

  const hostRef = useRef<HTMLDivElement>(null);

  const onPointerDown = (vertex: WarpVertex) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { vertex };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    const host = hostRef.current?.getBoundingClientRect();
    if (!drag || !host) return;
    moveVertex(drag.vertex, e.clientX, e.clientY, host);
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    // One undo step per drag, not per pointer move.
    if (dirtyRef.current && sessionRef.current) {
      dirtyRef.current = false;
      onCommit(sessionRef.current.toLayerWarp());
    }
  };

  if (!corners) return null;

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 z-20"
      style={{ touchAction: 'none' }}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Frame around the layer being warped */}
      <div
        className="pointer-events-none absolute border border-dashed border-fuchsia-500"
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        }}
      />
      {WARP_VERTICES.map((vertex) => {
        const p = corners[vertex];
        if (!p) return null;
        const left = rect.left + (p.x / natural.width) * rect.width;
        const top = rect.top + (p.y / natural.height) * rect.height;
        return (
          <button
            key={vertex}
            type="button"
            aria-label={`Kéo góc ${vertex}`}
            onPointerDown={onPointerDown(vertex)}
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-fuchsia-500 shadow active:cursor-grabbing"
            style={{ left, top }}
          />
        );
      })}
      <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-2 py-0.5 text-[11px] text-white">
        {mode === DESIGN_WARP_MODE.PERSPECTIVE
          ? 'Kéo 4 góc để bóp phối cảnh'
          : 'Kéo các điểm để uốn cong'}
      </p>
    </div>
  );
}
