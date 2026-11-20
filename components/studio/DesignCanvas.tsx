'use client';

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type Ref,
} from 'react';
import {
  FALLBACK_DESIGN_FONT_SIZE,
  MOCKUP_EXPORT_MULTIPLIER,
} from '@/lib/studio/constants';
import {
  type CanvasLayer,
  type PrintArea,
} from '@/lib/studio/types';
import { mediaUrl } from '@/lib/studio/api';
import { resolveZonePx, type ZoneRect } from '@/lib/studio/geometry';
import {
  applyAdjustToImage,
  applyLayerToImage,
  applyTextLayer,
  fontStack,
  readImageIntoLayer,
  readTextIntoLayer,
  resolveLayerSource,
  textOf,
} from './designLayerRender';

/**
 * Interactive Fabric canvas: mockup as background, print zone as a dashed
 * guide, one selectable image per design layer.
 *
 * React owns the layer list; Fabric owns the drag/scale/rotate handles. They
 * are reconciled by diffing layers into an `id → fabric object` map, with an
 * `applying` guard so programmatic updates never echo back as user edits.
 */

export interface DesignCanvasHandle {
  /** Flattened mockup + artwork — the shareable preview image. */
  exportMockup(multiplier?: number): string | null;
  /** Swap in a freshly warped canvas without going through the layer list. */
  swapElement(layerId: string, element: CanvasImageSource): void;
  /** Live source element of a layer, for starting a warp session. */
  sourceElement(layerId: string): CanvasImageSource | null;
  /** Screen rect of a layer, so the warp overlay can place its handles. */
  layerRect(layerId: string): { left: number; top: number; width: number; height: number } | null;
  zone(): ZoneRect | null;
}

interface Props {
  mockupUrl: string;
  artwork: { width: number; height: number };
  printArea?: PrintArea;
  layers: CanvasLayer[];
  selectedId: string | null;
  /** Show the dashed print-zone guide (hidden when exporting). */
  showZoneGuide?: boolean;
  /** Clip artwork to the print zone — what actually gets printed. */
  clipToPrintArea?: boolean;
  /** Disable all interaction (read-only embed). */
  readOnly?: boolean;
  onSelect: (id: string | null) => void;
  onLayerTransform: (
    id: string,
    partial: Partial<CanvasLayer>,
    opts?: { transient?: boolean },
  ) => void;
  onTransformStart?: () => void;
  onTransformEnd?: () => void;
  /** A library asset was dropped; payload is the JSON from the drag source. */
  onDropSource?: (payload: string) => void;
  handleRef?: Ref<DesignCanvasHandle>;
}

/** MIME used to carry a library asset through an HTML5 drag. */
export const DESIGN_DRAG_MIME = 'application/x-loc-design';

const MIN_CANVAS_WIDTH = 240;

/** Selection frame + handle stroke. */
const SELECTION_BORDER = '#d946ef';
/** Text with no explicit colour — dark reads on the light mockups we ship. */
const DEFAULT_TEXT_FILL = '#111827';
/** Print-zone guide — a different hue so the two frames never read as one. */
const ZONE_GUIDE_COLOR = '#38bdf8';

/**
 * Structural view of the Fabric objects we touch. Declared locally instead of
 * importing Fabric's types so this module never pulls the (browser-only)
 * library into the server bundle.
 */
type FabricObj = {
  layerId?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  fontSize?: number;
  skewX?: number;
  skewY?: number;
  flipX?: boolean;
  flipY?: boolean;
  set: (p: Record<string, unknown>) => void;
  setCoords: () => void;
  setElement: (el: CanvasImageSource) => void;
  getElement: () => CanvasImageSource;
};

type FabricCanvas = {
  add: (o: unknown) => void;
  getObjects: () => unknown[];
  remove: (o: unknown) => void;
  on: (evt: string, cb: (e: never) => void) => void;
  dispose: () => void;
  requestRenderAll: () => void;
  renderAll: () => void;
  setActiveObject: (o: unknown) => void;
  discardActiveObject: () => void;
  bringObjectToFront: (o: unknown) => void;
  toDataURL: (o: Record<string, unknown>) => string;
  backgroundImage?: unknown;
};

export function DesignCanvas({
  mockupUrl,
  artwork,
  printArea,
  layers,
  selectedId,
  showZoneGuide = true,
  clipToPrintArea = true,
  readOnly = false,
  onSelect,
  onLayerTransform,
  onTransformStart,
  onTransformEnd,
  onDropSource,
  handleRef,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<FabricCanvas | null>(null);
  const objectsRef = useRef(new Map<string, FabricObj>());
  const zoneRef = useRef<ZoneRect | null>(null);
  const applyingRef = useRef(false);

  // Handlers are read from refs inside Fabric listeners so the canvas is not
  // rebuilt every time a parent re-renders with new callback identities.
  const cbRef = useRef({ onSelect, onLayerTransform, onTransformStart, onTransformEnd });
  cbRef.current = { onSelect, onLayerTransform, onTransformStart, onTransformEnd };
  const layersRef = useRef(layers);
  layersRef.current = layers;

  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  /* ---- track wrapper width ---- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.max(MIN_CANVAS_WIDTH, Math.round(el.getBoundingClientRect().width));
      setWidth((prev) => (prev === w ? prev : w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---- build canvas + background; re-runs only on geometry changes ---- */
  useEffect(() => {
    if (!width || !canvasElRef.current) return;
    let cancelled = false;

    async function build() {
      const fabric = await import('fabric');
      if (cancelled || !canvasElRef.current) return;

      // Fabric wraps the <canvas> in extra DOM that stacks up if the previous
      // instance is left attached — always dispose before rebuilding.
      canvasRef.current?.dispose();
      objectsRef.current.clear();
      setReady(false);

      let displayH = Math.round(width * (artwork.height / artwork.width));
      let bg: InstanceType<typeof fabric.FabricImage> | null = null;

      if (mockupUrl) {
        try {
          bg = await fabric.FabricImage.fromURL(mediaUrl(mockupUrl), {
            // Required, or the canvas is tainted and toDataURL throws —
            // which would break the export the whole hand-off relies on.
            crossOrigin: 'anonymous',
          });
          if (cancelled) return;
          displayH = Math.round(width * ((bg.height || 1) / (bg.width || 1)));
        } catch {
          // A missing mockup must not block designing; the zone guide still
          // shows where the artwork will land.
          bg = null;
        }
      }

      const canvas = new fabric.Canvas(canvasElRef.current, {
        width,
        height: displayH,
        // Keep z-order stable during drags; otherwise Fabric pops the active
        // object to the front and the layer panel starts lying.
        preserveObjectStacking: true,
        // Group-select would let one gesture transform several layers, which
        // the layer model (one transform per layer) cannot represent.
        selection: false,
      }) as unknown as FabricCanvas;
      canvasRef.current = canvas;

      if (bg) {
        bg.set({
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          scaleX: width / (bg.width || 1),
          scaleY: displayH / (bg.height || 1),
          selectable: false,
          evented: false,
        });
        canvas.backgroundImage = bg;
      }

      const zone = resolveZonePx(printArea, width, displayH, artwork.width, artwork.height);
      zoneRef.current = zone;

      if (showZoneGuide) {
        const guide = new fabric.Rect({
          left: zone.left,
          top: zone.top,
          width: zone.w,
          height: zone.h,
          fill: 'transparent',
          stroke: ZONE_GUIDE_COLOR,
          strokeWidth: 1.5,
          strokeDashArray: [6, 4],
          selectable: false,
          evented: false,
          // Guide must not scale with the canvas' object stack.
          excludeFromExport: true,
        });
        (guide as unknown as Record<string, unknown>).isZoneGuide = true;
        canvas.add(guide);
      }

      const readBack = (target: FabricObj | undefined, transient: boolean) => {
        const z = zoneRef.current;
        const layerId = target?.layerId as string | undefined;
        if (!target || !z || !layerId) return;
        // Text and images invert differently: a text drag has to land in
        // `fontSize`, an image drag in `width`/`height`. Reading a text object
        // as an image would leave a scale on it that compounds every gesture.
        const isText =
          layersRef.current.find((l) => l.id === layerId)?.type === 'text';
        const patch = isText
          ? readTextIntoLayer(target as never, z)
          : readImageIntoLayer(target, z);
        cbRef.current.onLayerTransform(layerId, patch, { transient });
      };

      const selectionOf = (e: { selected?: { layerId?: string }[] }) =>
        e.selected?.[0]?.layerId ?? null;

      canvas.on('selection:created', (e: never) => {
        if (!applyingRef.current) cbRef.current.onSelect(selectionOf(e));
      });
      canvas.on('selection:updated', (e: never) => {
        if (!applyingRef.current) cbRef.current.onSelect(selectionOf(e));
      });
      canvas.on('selection:cleared', () => {
        if (!applyingRef.current) cbRef.current.onSelect(null);
      });
      canvas.on('mouse:down', () => cbRef.current.onTransformStart?.());
      canvas.on('object:moving', (e: never) =>
        readBack((e as { target?: FabricObj }).target, true),
      );
      canvas.on('object:scaling', (e: never) =>
        readBack((e as { target?: FabricObj }).target, true),
      );
      canvas.on('object:rotating', (e: never) =>
        readBack((e as { target?: FabricObj }).target, true),
      );
      canvas.on('object:modified', (e: never) => {
        readBack((e as { target?: FabricObj }).target, true);
        cbRef.current.onTransformEnd?.();
      });

      setHeight(displayH);
      setReady(true);
    }

    void build().catch((e) =>
      setError(e instanceof Error ? e.message : 'Không dựng được canvas'),
    );
    return () => {
      cancelled = true;
    };
  }, [width, mockupUrl, artwork.width, artwork.height, printArea, showZoneGuide]);

  /* ---- dispose on unmount ---- */
  useEffect(
    () => () => {
      canvasRef.current?.dispose();
      canvasRef.current = null;
      objectsRef.current.clear();
    },
    [],
  );

  /* ---- reconcile React layers → Fabric objects ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const zone = zoneRef.current;
    if (!ready || !canvas || !zone) return;
    let cancelled = false;

    async function sync() {
      const fabric = await import('fabric');
      if (cancelled || !canvas || !zone) return;
      applyingRef.current = true;

      const seen = new Set<string>();
      for (const layer of layersRef.current) {
        seen.add(layer.id);
        let obj = objectsRef.current.get(layer.id);

        if (!obj) {
          /**
           * A studio layer is artwork OR text. Text is a first-class layer
           * here, not a rendering afterthought: `MockupPreview` and the print
           * export already understand `type: 'text'`, so building it as a real
           * Fabric object is what lets one design carry both.
           */
          let node: unknown;
          if (layer.type === 'text') {
            node = new fabric.FabricText(textOf(layer), {
              fontFamily: fontStack(layer.fontFamily),
              // Sized in artwork pixels like every other layer dimension, then
              // scaled into display space by `applyLayerToImage`.
              fontSize: (layer.fontSize ?? FALLBACK_DESIGN_FONT_SIZE) * zone.scale,
              fontWeight: layer.fontWeight ?? 'normal',
              fill: layer.fill || DEFAULT_TEXT_FILL,
              textAlign: layer.textAlign ?? 'center',
            });
          } else {
            let source: CanvasImageSource;
            try {
              source = await resolveLayerSource(layer);
            } catch {
              continue; // broken asset — skip rather than blank the canvas
            }
            if (cancelled) break;
            node = new fabric.FabricImage(source as HTMLImageElement);
          }
          const raw = node as FabricObj;
          raw.layerId = layer.id;
          // Selection chrome: round white handles on a dashed magenta frame,
          // matching the reference studio. Fabric's default square blue
          // handles on a solid border read as a generic canvas widget and are
          // easy to lose against a dark garment.
          raw.set({
            borderColor: SELECTION_BORDER,
            borderDashArray: [5, 4],
            borderScaleFactor: 1.5,
            cornerColor: '#ffffff',
            cornerStrokeColor: SELECTION_BORDER,
            cornerStyle: 'circle',
            cornerSize: 11,
            transparentCorners: false,
            padding: 6,
          });
          // Skew is driven by toolbar sliders; Fabric's shift-drag skew is
          // undiscoverable and impossible on touch.
          raw.set({ lockSkewingX: true, lockSkewingY: true });
          if (clipToPrintArea) {
            raw.set({
              clipPath: new fabric.Rect({
                left: zone.left + zone.w / 2,
                top: zone.top + zone.h / 2,
                width: zone.w,
                height: zone.h,
                originX: 'center',
                originY: 'center',
                absolutePositioned: true,
              }),
            });
          }
          obj = raw;
          objectsRef.current.set(layer.id, raw);
          canvas.add(node);
        }

        const interactive = !readOnly && !layer.locked;
        if (layer.type === 'text') {
          // Text re-renders from its own props; `applyLayerToImage` would
          // derive a scale from the glyph box and fight the font size.
          applyTextLayer(obj as never, layer, zone, artwork, {
            selectable: interactive,
            evented: interactive,
            hasControls: interactive,
          });
        } else {
          applyLayerToImage(obj as never, layer, zone, artwork, {
            selectable: interactive,
            evented: interactive,
            hasControls: interactive,
          });
          // Awaited inside the loop on purpose: `applyFilters()` is what makes
          // the adjustment visible, and a fire-and-forget would let the canvas
          // render once unfiltered and flash.
          await applyAdjustToImage(obj as never, layer);
        }
      }

      for (const [id, obj] of objectsRef.current) {
        if (seen.has(id)) continue;
        canvas.remove(obj);
        objectsRef.current.delete(id);
      }

      // Fabric paints in insertion order — restack to honour layer zIndex.
      for (const layer of [...layersRef.current].sort(
        (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
      )) {
        const obj = objectsRef.current.get(layer.id);
        if (obj) canvas.bringObjectToFront(obj);
      }

      canvas.requestRenderAll();
      applyingRef.current = false;
    }

    void sync();
    return () => {
      cancelled = true;
      applyingRef.current = false;
    };
  }, [layers, ready, artwork, clipToPrintArea, readOnly]);

  /* ---- reconcile selection React → Fabric ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!ready || !canvas) return;
    applyingRef.current = true;
    const obj = selectedId ? objectsRef.current.get(selectedId) : null;
    if (obj) canvas.setActiveObject(obj);
    else canvas.discardActiveObject();
    canvas.requestRenderAll();
    applyingRef.current = false;
  }, [selectedId, ready, layers]);

  useImperativeHandle(
    handleRef,
    (): DesignCanvasHandle => ({
      exportMockup(multiplier = MOCKUP_EXPORT_MULTIPLIER) {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        // Drop the selection first, or the export bakes in the handles.
        canvas.discardActiveObject();

        /**
         * Hide the print-zone guide for the duration of the capture.
         *
         * The guide is created with `excludeFromExport: true`, which is NOT
         * enough: that flag only affects `toObject`/`toJSON` serialisation, so
         * `toDataURL` — which re-renders the canvas — drew the dashed cyan
         * rectangle straight into the shared mockup. Visibility is what the
         * renderer actually honours; it is restored immediately after.
         */
        const guide = canvas
          .getObjects()
          .find((o) => (o as Record<string, unknown>).isZoneGuide) as
          | { visible?: boolean }
          | undefined;
        const wasVisible = guide?.visible;
        if (guide) guide.visible = false;

        canvas.renderAll();
        const data = canvas.toDataURL({ format: 'png', multiplier });

        if (guide) {
          guide.visible = wasVisible ?? true;
          canvas.requestRenderAll();
        }
        return data;
      },
      swapElement(layerId, element) {
        const obj = objectsRef.current.get(layerId);
        if (!obj || !canvasRef.current) return;
        obj.setElement(element);
        obj.setCoords();
        canvasRef.current.requestRenderAll();
      },
      sourceElement: (layerId) =>
        objectsRef.current.get(layerId)?.getElement() ?? null,
      layerRect(layerId) {
        const obj = objectsRef.current.get(layerId) as
          | (FabricObj & {
              getBoundingRect?: () => {
                left: number;
                top: number;
                width: number;
                height: number;
              };
            })
          | undefined;
        return obj?.getBoundingRect?.() ?? null;
      },
      zone: () => zoneRef.current,
    }),
    [],
  );

  const onDrop = useCallback(
    (e: ReactDragEvent<HTMLDivElement>) => {
      const payload = e.dataTransfer.getData(DESIGN_DRAG_MIME);
      if (!payload) return;
      e.preventDefault();
      onDropSource?.(payload);
    },
    [onDropSource],
  );

  return (
    <div className="w-full">
      <div
        ref={wrapRef}
        // Sized to the stage, not a fixed 2xl: at 672px the garment sat as a
        // small card in the middle of a wide dark workspace, nothing like the
        // reference where the mockup fills most of the stage height.
        className="relative mx-auto w-full max-w-[min(720px,calc(100vh-190px))]"
        style={height ? { minHeight: height } : undefined}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DESIGN_DRAG_MIME)) e.preventDefault();
        }}
        onDrop={onDrop}
      >
        <canvas ref={canvasElRef} className="block w-full rounded-xl" />
        {!ready && !error && (
          <div className="text-muted absolute inset-0 grid place-items-center text-[0.9rem]">
            Đang dựng canvas…
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-center text-[0.85rem] text-red-600">{error}</p>}
    </div>
  );
}
