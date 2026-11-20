'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  defaultFontSizeFor,
  DESIGN_FONT_FAMILIES,
  DESIGN_LAYER_MAX_OPACITY,
  DESIGN_LAYER_MAX_SKEW,
  MAX_DESIGN_LAYERS,
} from '@/lib/studio/constants';
import {
  type CanvasLayer,
} from '@/lib/studio/types';

/**
 * Studio state: the buyer-authored layer list plus selection and undo/redo.
 *
 * Coordinates follow the SAME contract the existing renderer already uses
 * (`MockupPreview`): `x`/`y` are the layer CENTRE in artwork space, `width`/
 * `height` are artwork pixels, `rotation` is degrees. Keeping that contract is
 * what lets one renderer serve the editor, the storefront preview and the
 * print export instead of three.
 */

export interface DesignStudioArtwork {
  width: number;
  height: number;
}

/** Anything that can become a layer: a library asset or a buyer upload. */
export interface DesignSource {
  url: string;
  /** Print code — present for library assets, absent for buyer uploads. */
  code?: string;
  naturalWidth?: number;
  naturalHeight?: number;
}

/** How much of the artwork box a newly dropped design occupies. */
const DEFAULT_DROP_WIDTH_RATIO = 0.55;
const UNDO_LIMIT = 50;
/** Offset a duplicated layer by this share of the artwork width. */
const DUPLICATE_OFFSET_RATIO = 0.04;

let layerSeq = 0;
function nextLayerId(): string {
  layerSeq += 1;
  return `design_${Date.now().toString(36)}_${layerSeq}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export interface UseDesignStudioOptions {
  artwork: DesignStudioArtwork;
  initialLayers?: CanvasLayer[];
  maxLayers?: number;
  /**
   * Surface a newly added layer belongs to (front / back).
   *
   * Stamped at creation rather than derived at render time because the layer
   * outlives the editor: it is saved into a draft and reopened later, and the
   * front and back artworks become separate print files.
   */
  surfaceId?: string;
  onError?: (message: string) => void;
}

export function useDesignStudio({
  artwork,
  initialLayers,
  maxLayers = MAX_DESIGN_LAYERS,
  surfaceId,
  onError,
}: UseDesignStudioOptions) {
  const [layers, setLayers] = useState<CanvasLayer[]>(() => initialLayers ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Undo/redo hold committed snapshots only. Dragging patches state on every
  // pointer move; pushing each of those would make one drag cost 60 undos.
  const undoStack = useRef<CanvasLayer[][]>([]);
  const redoStack = useRef<CanvasLayer[][]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

  const pushHistory = useCallback((snapshot: CanvasLayer[]) => {
    undoStack.current.push(snapshot);
    if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift();
    redoStack.current = [];
    setHistoryVersion((v) => v + 1);
  }, []);

  /**
   * Mutate the layer list.
   * `transient` skips the history entry — used while a pointer drag is in
   * flight; the caller commits once on pointer-up.
   */
  const update = useCallback(
    (
      fn: (prev: CanvasLayer[]) => CanvasLayer[],
      opts?: { transient?: boolean },
    ) => {
      setLayers((prev) => {
        if (!opts?.transient) pushHistory(prev);
        return fn(prev);
      });
    },
    [pushHistory],
  );

  /** Snapshot the state a drag started from, so pointer-up records one step. */
  const dragStart = useRef<CanvasLayer[] | null>(null);
  const beginDrag = useCallback(() => {
    dragStart.current = layers;
  }, [layers]);
  const endDrag = useCallback(() => {
    if (dragStart.current) {
      pushHistory(dragStart.current);
      dragStart.current = null;
    }
  }, [pushHistory]);

  const addLayer = useCallback(
    (source: DesignSource) => {
      let added: CanvasLayer | null = null;
      update((prev) => {
        if (prev.length >= maxLayers) {
          onError?.(`Tối đa ${maxLayers} lớp thiết kế`);
          return prev;
        }
        // Fit the drop to a fraction of the artwork width, preserving aspect —
        // a 4000px artwork must not land at native size on a 800px canvas.
        const ratio =
          source.naturalWidth && source.naturalHeight
            ? source.naturalHeight / source.naturalWidth
            : 1;
        const width = artwork.width * DEFAULT_DROP_WIDTH_RATIO;
        added = {
          id: nextLayerId(),
          type: 'image',
          src: source.url,
          x: artwork.width / 2,
          y: artwork.height / 2,
          width,
          height: width * ratio,
          rotation: 0,
          zIndex: prev.length + 1,
          editableByBuyer: true,
          ...(source.code ? { assetCode: source.code } : {}),
          ...(surfaceId ? { surfaceId } : {}),
        };
        return [...prev, added];
      });
      // setState is async; the id was minted synchronously above.
      if (added) setSelectedId((added as CanvasLayer).id);
      return added as CanvasLayer | null;
    },
    [artwork.height, artwork.width, maxLayers, onError, surfaceId, update],
  );

  /**
   * Add a text layer.
   *
   * Separate from `addLayer` because there is no image to measure: the size
   * comes from `fontSize`, and the layer carries no `src` at all — which is
   * exactly why the draft schema had to stop requiring one.
   */
  const addTextLayer = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value) return null;
      let added: CanvasLayer | null = null;
      update((prev) => {
        if (prev.length >= maxLayers) {
          onError?.(`Tối đa ${maxLayers} lớp thiết kế`);
          return prev;
        }
        added = {
          id: nextLayerId(),
          type: 'text',
          defaultText: value,
          fontSize: defaultFontSizeFor(artwork.width),
          fontFamily: DESIGN_FONT_FAMILIES[0],
          fill: '#111827',
          textAlign: 'center',
          x: artwork.width / 2,
          y: artwork.height / 2,
          rotation: 0,
          zIndex: prev.length + 1,
          editableByBuyer: true,
          ...(surfaceId ? { surfaceId } : {}),
        };
        return [...prev, added];
      });
      if (added) setSelectedId((added as CanvasLayer).id);
      return added as CanvasLayer | null;
    },
    [artwork.width, artwork.height, maxLayers, onError, surfaceId, update],
  );

  /**
   * Copy a layer, offset slightly so the duplicate is visibly a second object
   * rather than sitting exactly on top of the original.
   */
  const duplicateLayer = useCallback(
    (id: string) => {
      let addedId: string | null = null;
      update((prev) => {
        if (prev.length >= maxLayers) {
          onError?.(`Tối đa ${maxLayers} lớp thiết kế`);
          return prev;
        }
        const src = prev.find((l) => l.id === id);
        if (!src) return prev;
        addedId = nextLayerId();
        const offset = artwork.width * DUPLICATE_OFFSET_RATIO;
        return [
          ...prev,
          {
            ...src,
            id: addedId,
            x: (src.x ?? 0) + offset,
            y: (src.y ?? 0) + offset,
            locked: false,
            zIndex: prev.length + 1,
          },
        ];
      });
      if (addedId) setSelectedId(addedId);
    },
    [artwork.width, maxLayers, onError, update],
  );

  const patchLayer = useCallback(
    (id: string, partial: Partial<CanvasLayer>, opts?: { transient?: boolean }) => {
      update(
        (prev) => prev.map((l) => (l.id === id ? { ...l, ...partial } : l)),
        opts,
      );
    },
    [update],
  );

  const removeLayer = useCallback(
    (id: string) => {
      update((prev) =>
        prev
          .filter((l) => l.id !== id)
          .map((l, i) => ({ ...l, zIndex: i + 1 })),
      );
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [update],
  );

  /** Reorder in the layer panel. `delta` of -1 moves one step towards the back. */
  const reorderLayer = useCallback(
    (id: string, delta: number) => {
      update((prev) => {
        const sorted = [...prev].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
        const idx = sorted.findIndex((l) => l.id === id);
        const target = idx + delta;
        if (idx < 0 || target < 0 || target >= sorted.length) return prev;
        const [moved] = sorted.splice(idx, 1);
        sorted.splice(target, 0, moved);
        return sorted.map((l, i) => ({ ...l, zIndex: i + 1 }));
      });
    },
    [update],
  );

  const toggleLock = useCallback(
    (id: string) => {
      update((prev) =>
        prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
      );
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [update],
  );

  const flip = useCallback(
    (id: string, axis: 'x' | 'y') => {
      update((prev) =>
        prev.map((l) =>
          l.id === id
            ? axis === 'x'
              ? { ...l, flipX: !l.flipX }
              : { ...l, flipY: !l.flipY }
            : l,
        ),
      );
    },
    [update],
  );

  const setOpacity = useCallback(
    (id: string, value: number, opts?: { transient?: boolean }) => {
      patchLayer(id, { opacity: clamp(value, 0, DESIGN_LAYER_MAX_OPACITY) }, opts);
    },
    [patchLayer],
  );

  const setSkew = useCallback(
    (id: string, axis: 'x' | 'y', value: number, opts?: { transient?: boolean }) => {
      const v = clamp(value, -DESIGN_LAYER_MAX_SKEW, DESIGN_LAYER_MAX_SKEW);
      patchLayer(id, axis === 'x' ? { skewX: v } : { skewY: v }, opts);
    },
    [patchLayer],
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setLayers((cur) => {
      redoStack.current.push(cur);
      return prev;
    });
    setHistoryVersion((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    setLayers((cur) => {
      undoStack.current.push(cur);
      return next;
    });
    setHistoryVersion((v) => v + 1);
  }, []);

  const reset = useCallback(() => {
    update(() => []);
    setSelectedId(null);
  }, [update]);

  /** Replace the whole list — reopening a saved draft. */
  const replaceLayers = useCallback(
    (next: CanvasLayer[]) => {
      update(() => next);
      setSelectedId(null);
    },
    [update],
  );

  const ordered = useMemo(
    () => [...layers].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
    [layers],
  );

  /**
   * Layers on the surface currently being edited.
   *
   * A layer with no `surfaceId` predates multi-surface and belongs to the first
   * surface — the same rule the renderer uses, so an old draft opens looking
   * exactly as it was saved.
   */
  const visible = useMemo(
    () =>
      surfaceId
        ? ordered.filter((l) => (l.surfaceId ?? surfaceId) === surfaceId)
        : ordered,
    [ordered, surfaceId],
  );

  const selected = useMemo(
    () => ordered.find((l) => l.id === selectedId) ?? null,
    [ordered, selectedId],
  );

  return {
    /** Only the active surface — what the canvas renders. */
    layers: visible,
    /** Every surface. Export and save need the whole design, not one side. */
    allLayers: ordered,
    selected,
    selectedId,
    setSelectedId,
    addLayer,
    addTextLayer,
    duplicateLayer,
    patchLayer,
    removeLayer,
    reorderLayer,
    toggleLock,
    flip,
    setOpacity,
    setSkew,
    beginDrag,
    endDrag,
    undo,
    redo,
    reset,
    replaceLayers,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    // Consumers re-render on history changes even though the stacks are refs.
    historyVersion,
    isFull: layers.length >= maxLayers,
  };
}

export type DesignStudioState = ReturnType<typeof useDesignStudio>;
