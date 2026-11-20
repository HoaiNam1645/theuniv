'use client';

/**
 * Thin wrapper over `warpvas` — the ONLY place that talks to the warp engine.
 *
 * Exists because a spike against the real library surfaced several sharp edges
 * that every call site would otherwise have to remember:
 *
 *  1. `render()` returns a **WebGL-backed** canvas — `getContext('2d')` on it is
 *     `null`. Fine to `drawImage`, never to read pixels from directly.
 *  2. Perspective mode only works on a **1x1 grid** (the four outer corners) and
 *     THROWS `Invalid perspective shape` on self-crossing shapes. Callers get a
 *     null return instead of an exception so the UI can revert.
 *  3. `isUnwarped()` is unreliable — it reports `false` even before any drag.
 *     Presence of a `LayerWarp` on the layer is our source of truth.
 *  4. The output bounding box changes as the mesh moves (e.g. 200x200 → 200x195),
 *     so the caller must re-anchor after every render.
 *  5. The library is ESM-only and touches `document`, so it is imported lazily
 *     inside the browser — same pattern as `MockupPreview`'s `import('fabric')`.
 */

import {
  DESIGN_WARP_GRID,
  DESIGN_WARP_MODE,
  type DesignWarpMode,
} from '@/lib/studio/constants';
import {
  type LayerWarp,
  type WarpCoord,
} from '@/lib/studio/types';

/** One region's four bezier edges, in source-image pixels. */
type RegionBound = {
  top: WarpCoord[];
  right: WarpCoord[];
  bottom: WarpCoord[];
  left: WarpCoord[];
};

type WarpState = {
  splitPoints: WarpCoord[];
  regionBounds?: RegionBound[][];
};

type WarpvasInstance = {
  setSplitStrategy: (strategy: unknown) => unknown;
  updateVertexCoord: (
    row: number,
    col: number,
    vertex: 'tl' | 'tr' | 'bl' | 'br',
    coord: WarpCoord,
    redistribute?: boolean,
  ) => unknown;
  getWarpState: () => WarpState;
  setWarpState: (splitPoints: WarpCoord[], regionBounds?: unknown) => unknown;
  render: () => HTMLCanvasElement;
  dispose: () => void;
};

type WarpvasCtor = new (
  source: HTMLCanvasElement | HTMLImageElement,
  rows?: number,
  columns?: number,
) => WarpvasInstance;

export type WarpVertex = 'tl' | 'tr' | 'bl' | 'br';
export const WARP_VERTICES: WarpVertex[] = ['tl', 'tr', 'bl', 'br'];

let enginePromise: Promise<{
  Warpvas: WarpvasCtor;
  perspective: unknown;
}> | null = null;

/** Load the engine once per page; both chunks are ESM and browser-only. */
function loadEngine() {
  enginePromise ??= Promise.all([
    import('warpvas'),
    import('warpvas-perspective'),
  ]).then(([core, persp]) => ({
    Warpvas: (core as unknown as { Warpvas: WarpvasCtor }).Warpvas,
    perspective: (persp as unknown as { default: unknown }).default,
  }));
  return enginePromise;
}

/** Pre-warm the engine so the first warp drag is not the download. */
export function preloadWarpEngine(): void {
  void loadEngine().catch(() => {
    /* the toolbar reports failure when a warp is actually attempted */
  });
}

export interface WarpSession {
  /** Move one control point. Returns the freshly rendered canvas, or null if
   *  the resulting shape is invalid (perspective self-crossing). */
  moveVertex(
    row: number,
    col: number,
    vertex: WarpVertex,
    coord: WarpCoord,
  ): HTMLCanvasElement | null;
  /**
   * The mesh's four outer corners in SOURCE-IMAGE pixels, for placing the drag
   * handles. Read from `regionBounds` (whose `left`/`right` edges run
   * top→bottom) — `splitPoints` is a flat list of normalised region origins and
   * does NOT carry corner positions.
   */
  corners(): Record<WarpVertex, WarpCoord> | null;
  /** Serializable state to persist on the layer. */
  toLayerWarp(): LayerWarp;
  render(): HTMLCanvasElement;
  dispose(): void;
}

/**
 * Start an interactive warp session for one layer image.
 * `existing` restores a previously saved warp so reopening a draft resumes
 * exactly where the buyer left off.
 */
export async function createWarpSession(
  source: HTMLCanvasElement | HTMLImageElement,
  mode: DesignWarpMode,
  existing?: LayerWarp,
): Promise<WarpSession> {
  const { Warpvas, perspective } = await loadEngine();
  const grid = DESIGN_WARP_GRID[mode];
  const rows = existing?.rows ?? grid.rows;
  const columns = existing?.columns ?? grid.columns;

  const instance = new Warpvas(source, rows, columns);
  if (mode === DESIGN_WARP_MODE.PERSPECTIVE) {
    instance.setSplitStrategy(perspective);
  }
  if (existing?.splitPoints?.length) {
    instance.setWarpState(existing.splitPoints, existing.regionBounds);
  }

  // Snapshot before each mutation so an invalid shape can be rolled back
  // rather than leaving the session in a state that throws on every render.
  const snapshot = () => {
    const s = instance.getWarpState();
    return {
      splitPoints: JSON.parse(JSON.stringify(s.splitPoints)) as WarpCoord[],
      regionBounds: s.regionBounds,
    };
  };

  return {
    moveVertex(row, col, vertex, coord) {
      const before = snapshot();
      try {
        instance.updateVertexCoord(row, col, vertex, coord);
        return instance.render();
      } catch {
        // Perspective rejects shapes where one corner crosses the opposite
        // edge. Restore and let the UI keep the last good render.
        instance.setWarpState(before.splitPoints, before.regionBounds);
        return null;
      }
    },
    corners() {
      const bounds = instance.getWarpState().regionBounds;
      if (!bounds?.length) return null;
      const lastRow = bounds.length - 1;
      const lastCol = (bounds[0]?.length ?? 1) - 1;
      const tlEdge = bounds[0]?.[0]?.left;
      const trEdge = bounds[0]?.[lastCol]?.right;
      const blEdge = bounds[lastRow]?.[0]?.left;
      const brEdge = bounds[lastRow]?.[lastCol]?.right;
      if (!tlEdge?.length || !trEdge?.length || !blEdge?.length || !brEdge?.length) {
        return null;
      }
      return {
        tl: tlEdge[0],
        tr: trEdge[0],
        bl: blEdge[blEdge.length - 1],
        br: brEdge[brEdge.length - 1],
      };
    },
    toLayerWarp() {
      const state = instance.getWarpState();
      return {
        mode,
        rows,
        columns,
        splitPoints: state.splitPoints,
        regionBounds: state.regionBounds,
      };
    },
    render() {
      return instance.render();
    },
    dispose() {
      try {
        instance.dispose();
      } catch {
        /* already disposed */
      }
    },
  };
}

/**
 * One-shot re-render of a saved warp — the read-only path used by
 * `MockupPreview` and the print export. Returns null (caller falls back to the
 * unwarped image) rather than throwing, because a broken warp must never blank
 * an order preview.
 */
export async function renderSavedWarp(
  source: HTMLCanvasElement | HTMLImageElement,
  warp: LayerWarp,
): Promise<HTMLCanvasElement | null> {
  try {
    const { Warpvas, perspective } = await loadEngine();
    const instance = new Warpvas(source, warp.rows, warp.columns);
    if (warp.mode === DESIGN_WARP_MODE.PERSPECTIVE) {
      instance.setSplitStrategy(perspective);
    }
    instance.setWarpState(warp.splitPoints, warp.regionBounds);
    return instance.render();
  } catch {
    return null;
  }
}
