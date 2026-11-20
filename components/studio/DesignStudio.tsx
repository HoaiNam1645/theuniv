'use client';

// Tailwind của studio đi kèm chính component này (preflight đã tắt — xem
// studio.css). Nhờ vậy Next chỉ nhét CSS vào route nào thực sự render studio,
// không cần layout nào phải nhớ link thêm, và app/layout.tsx gốc sạch nguyên.
import './studio.css';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  MAX_DESIGN_LAYERS,
  type DesignWarpMode,
} from '@/lib/studio/constants';
import {
  type CanvasLayer,
  type PrintArea,
} from '@/lib/studio/types';
import { colorNameToHex } from '@/lib/studio/colorMap';
import { DesignCanvas, type DesignCanvasHandle } from './DesignCanvas';
import { DesignLayerPanel } from './DesignLayerPanel';
import { DesignLibraryPanel, type DesignDragPayload } from './DesignLibraryPanel';
import { DesignToolbar } from './DesignToolbar';
import { DesignWarpOverlay } from './DesignWarpOverlay';
import { StudioCanvasStage, type StudioSurface } from './StudioCanvasStage';
import { StudioIconRail } from './StudioIconRail';
import { StudioMockupBar } from './StudioMockupBar';
import { StudioImagePanel } from './StudioImagePanel';
import { StudioDraftsPanel } from './StudioDraftsPanel';
import { StudioTextPanel } from './StudioTextPanel';
import { StudioTopBar } from './StudioTopBar';
import {
  STUDIO,
  STUDIO_COPY,
  STUDIO_TOOL,
  STUDIO_THEME,
  STUDIO_TOOL_LABEL,
  type StudioTheme,
  type StudioTool,
} from './studioTheme';
import { defaultGarmentSurfaces } from './defaultGarment';
import { placeholderMockupSet, type MockupSet } from './mockupSets';
import { preloadWarpEngine } from './warpEngine';
import { renderPrintCanvas } from './designExport';
import { useDesignStudio } from './useDesignStudio';

/**
 * The design studio — ONE component rendered as a full page in two places:
 * the storefront (`/thiet-ke/[slug]`, buyer builds and exports) and the admin
 * panel (`/admin/design-studio`, staff build a product then publish it).
 *
 * Layout is the four-column tool shell the reference site uses: top bar, tool
 * rail, the panel that rail opens, the canvas stage, and a right-hand inspector
 * for whatever layer is selected. Deliberately not a modal — the workflow needs
 * the full viewport, and a dialog cannot hold five regions without collapsing.
 *
 * Hosts inject their own chrome through `actions` / `aside`, so neither has to
 * fork the editor to add a button or a form.
 */

export interface DesignStudioMockup {
  color: string;
  url: string;
  /** Explicit swatch hex; falls back to the shared colour-name map. */
  swatch?: string;
}

/**
 * A garment surface the buyer can design on, straight from
 * `customization.surfaces` — front and back carry their own mockup per colour
 * and their own print area.
 */
export interface DesignStudioSurface {
  id: string;
  label: string;
  /** Colour name → mockup URL for this side. */
  mockupsByColor: Record<string, string>;
  printArea?: PrintArea;
}

export interface DesignStudioProps {
  mockups: DesignStudioMockup[];
  /**
   * Surfaces to offer. Omit for a single-sided product — the studio then builds
   * one "Mặt trước" surface out of `mockups`, which is what every product
   * authored before multi-surface has.
   */
  surfaces?: DesignStudioSurface[];
  artwork: { width: number; height: number };
  printArea?: PrintArea;
  initialLayers?: CanvasLayer[];
  initialColor?: string;
  allowUpload?: boolean;
  maxLayers?: number;
  /** Restrict the library sidebar to these collection ids. */
  collections?: string[];
  /** Running quote shown in the top bar; omit to hide the price box. */
  estimateVnd?: number;
  /** Label on the primary top-bar button ("Đặt hàng" / "Lưu sản phẩm"). */
  orderLabel?: string;
  /** Store branding for the top-left corner. */
  logoUrl?: string;
  storeName?: string;
  /**
   * Tông màu của studio. Mặc định `dark` cho trang khách (nằm trên theme tối của
   * THE UNI); trang quản trị truyền `light` để khớp nền trắng của `admin.css`.
   * Bảng màu tương ứng khai ở `studio.css`.
   */
  theme?: StudioTheme;
  /**
   * Blank-garment sets imported into settings. Offered alongside the product's
   * own mockups so a buyer can put the same artwork on a different garment.
   */
  library?: MockupSet[];
  /** Fired by the primary button — the host owns export + hand-off / save. */
  onOrder?: (ctx: DesignStudioContext) => void | Promise<void>;
  /** Extra host content pinned to the bottom of the right-hand inspector. */
  actions?: (ctx: DesignStudioContext) => ReactNode;
  /**
   * Remove an imported mockup set. Admin-only — the storefront omits it, so a
   * buyer is never one tap from deleting the shop's garment library.
   */
  onDeleteSet?: (set: MockupSet) => void;
  /**
   * Host content for the "Sản phẩm" panel — the admin puts its mockup uploader
   * here, so a product with no garment photo can still be started from inside
   * the studio instead of being bounced to a separate form.
   */
  productPanelExtra?: ReactNode;
  onChange?: (state: { layers: CanvasLayer[]; color: string }) => void;
}

/** What the host needs to build its own export/save action. */
export interface DesignStudioContext {
  layers: CanvasLayer[];
  color: string;
  /** Flattened mockup PNG as a data URL (null when the canvas is not ready). */
  exportMockup: () => string | null;
  /** Artwork-only canvas at print resolution (null when there are no layers). */
  renderPrint: () => Promise<HTMLCanvasElement | null>;
  isEmpty: boolean;
  /**
   * Every colour of the chosen garment, with the mockup each one uses.
   *
   * Publishing needs a photo per colour, not only the one on screen — the host
   * composites the design onto each of these. Empty when nothing is selected.
   */
  colors: { name: string; mockupUrl: string }[];
  /** Print zone in force, so a composite lands where the editor showed it. */
  printArea?: PrintArea;
  /**
   * Id of the chosen mockup set — `MockupSetDTO.id`, or the synthetic
   * `product` / `builtin-tee` when the buyer is on the product's own mockups or
   * the drawn stand-in.
   *
   * The set is picked INSIDE the studio, but every persistence call needs it:
   * `POST /studio/drafts` and `POST /studio/composite` both key off it. Without
   * it the host would have to guess by matching mockup URLs, and two sets that
   * share a photo would silently save the wrong garment.
   */
  mockupSetId: string;
  /** Surface on screen (`DesignSurface.id`) — a draft reopens on this side. */
  surfaceId: string;
}

/** Front/back identifiers — also the keys the surface thumbnails switch on. */
const SURFACE = { FRONT: 'front', BACK: 'back' } as const;

export function DesignStudio({
  mockups: mockupsProp,
  surfaces: surfaceDefsProp,
  artwork,
  printArea,
  initialLayers,
  initialColor,
  allowUpload = true,
  maxLayers = MAX_DESIGN_LAYERS,
  collections,
  estimateVnd,
  orderLabel,
  logoUrl,
  storeName,
  theme = STUDIO_THEME.DARK,
  library,
  onOrder,
  actions,
  productPanelExtra,
  onDeleteSet,
  onChange,
}: DesignStudioProps) {
  /**
   * Fall back to the built-in plain garment when the product carries no mockup.
   *
   * Without this the studio rendered an empty stage until someone uploaded a
   * photo — a design tool that cannot be used until you have already done work
   * elsewhere. The drawn garment is replaced the moment a real mockup exists.
   */
  const usingDefaultGarment = !mockupsProp.length;

  /**
   * Mockup sets to choose from. A product with its own photographed mockups is
   * one set; otherwise the drawn stand-in, which carries the full 15-colour
   * Comfort Color palette so the picker is not a single grey swatch.
   */
  const mockupSets = useMemo<MockupSet[]>(() => {
    const imported = library ?? [];
    if (!usingDefaultGarment) {
      // The product's own mockups lead — they are what it is actually sold as.
      return [
        {
          id: 'product',
          name: 'Mockup của sản phẩm',
          kind: (surfaceDefsProp?.length ?? 0) > 1 ? '2side' : '1side',
          colors: mockupsProp.map((m) => ({
            name: m.color,
            hex: m.swatch || colorNameToHex(m.color),
            urls: { front: m.url },
          })),
        },
        ...imported,
      ];
    }
    // No product mockup: real imported garments beat the drawn stand-in, which
    // stays last as the always-available fallback.
    return [...imported, placeholderMockupSet()];
  }, [usingDefaultGarment, mockupsProp, surfaceDefsProp, library]);

  /**
   * Chosen mockup set.
   *
   * Starts empty rather than at `mockupSets[0]`: the admin studio fetches the
   * imported library asynchronously, so a `useState` initialiser runs while the
   * only entry is the drawn stand-in and then never revisits the choice — the
   * studio stayed on the SVG tee even after 15 real garments had loaded. The
   * effect below adopts the first real set as soon as one exists, and also
   * rescues a selection whose set disappeared.
   */
  const [setId, setSetId] = useState('');
  const activeSet = mockupSets.find((s) => s.id === setId) ?? mockupSets[0];
  /** Once the operator picks a set, auto-selection stops second-guessing them. */
  const setChosen = useRef(false);

  useEffect(() => {
    if (setChosen.current) {
      // Only rescue a selection whose set disappeared.
      if (!mockupSets.some((s) => s.id === setId) && mockupSets[0]) {
        setSetId(mockupSets[0].id);
      }
      return;
    }
    /**
     * Until the operator chooses, follow the top of the list.
     *
     * Plain `mockupSets[0]`, not "first non-placeholder": the list is already
     * ordered with the product's own mockups first and the drawn stand-in last,
     * so the head of the list IS the best default. Re-running on every list
     * change is what lets a real garment replace the placeholder the admin
     * studio starts with while its library is still loading — an earlier
     * version bailed out whenever the current selection was merely *valid*, and
     * so stayed on the SVG tee forever.
     */
    const preferred = mockupSets[0];
    if (preferred && preferred.id !== setId) setSetId(preferred.id);
  }, [mockupSets, setId]);

  /** The product's own set keeps the product's mockups; any other set wins. */
  const usingProductSet = activeSet?.id === 'product';

  /**
   * Switching garment resets to that garment's first colour.
   *
   * Colour names do not carry across sets — one ships "Ivory", another "Trắng"
   * — so keeping the old name selects nothing and the canvas falls back to an
   * arbitrary mockup. Landing on the new set's first colour is both defined and
   * what the swatch row shows as active.
   */
  useEffect(() => {
    const first = activeSet?.colors[0]?.name;
    if (!first) return;
    setColor((cur) =>
      activeSet?.colors.some((c) => c.name === cur) ? cur : first,
    );
  }, [activeSet]);
  const mockups = useMemo(
    () =>
      usingProductSet
        ? mockupsProp
        : (activeSet?.colors ?? []).map((c) => ({
            color: c.name,
            url: c.urls.front ?? '',
            swatch: c.hex,
          })),
    [usingProductSet, activeSet, mockupsProp],
  );

  const surfaceDefs = useMemo(() => {
    if (usingProductSet && surfaceDefsProp?.length) return surfaceDefsProp;
    // An imported set is single-surface; only the drawn stand-in has a back.
    if (activeSet?.id === 'builtin-tee') return defaultGarmentSurfaces();
    return undefined;
  }, [usingProductSet, surfaceDefsProp, activeSet]);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  /**
   * Active tool. Never null: the left column is a standing part of the layout
   * (tools · artwork · mockup), not a drawer. Collapsing it left the buyer with
   * a bare canvas and no way back except the rail they had just dismissed.
   */
  const [tool, setTool] = useState<StudioTool>(STUDIO_TOOL.LIBRARY);
  /**
   * Chỉ có nghĩa dưới 640px, nơi panel công cụ là lớp phủ đè lên vùng vẽ
   * (xem `STUDIO.panel`). Trên màn rộng panel là một cột cố định nên cờ này
   * không tác động gì — không cần nhánh riêng cho từng khổ máy.
   */
  const [panelOpen, setPanelOpen] = useState(true);
  const [color, setColor] = useState(
    () => initialColor || mockups[0]?.color || '',
  );
  const [surfaceId, setSurfaceId] = useState<string>(SURFACE.FRONT);
  const [warpMode, setWarpMode] = useState<DesignWarpMode | null>(null);
  const [layerRect, setLayerRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const canvasRef = useRef<DesignCanvasHandle>(null);

  const studio = useDesignStudio({
    artwork,
    initialLayers,
    maxLayers,
    surfaceId,
    onError: setError,
  });
  const {
    layers,
    allLayers,
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
    beginDrag,
    endDrag,
    undo,
    redo,
    reset,
    replaceLayers,
    canUndo,
    canRedo,
  } = studio;

  // Downloading the warp engine on first drag would stall the interaction.
  useEffect(() => preloadWarpEngine(), []);

  const active = useMemo(
    () => mockups.find((m) => m.color === color) ?? mockups[0],
    [color, mockups],
  );

  /**
   * Surfaces offered, with the thumbnail for the CURRENT colour.
   *
   * A surface whose colour has no mockup is dropped rather than shown with the
   * front image: the thumbnail is how a buyer picks a side, and one that
   * switches to a picture of the other side is a control that lies. Layers
   * carry `surfaceId`, so each side keeps its own artwork.
   */
  const surfaces = useMemo<StudioSurface[]>(() => {
    if (surfaceDefs?.length) {
      const list = surfaceDefs
        .map((s) => ({
          id: s.id,
          label: s.label,
          url: s.mockupsByColor?.[color] ?? '',
        }))
        .filter((s) => s.url);
      if (list.length) return list;
    }
    return [{ id: SURFACE.FRONT, label: STUDIO_COPY.front, url: active?.url ?? '' }];
  }, [surfaceDefs, color, active]);

  // Switching to a colour with no back photo must not strand the canvas on a
  // surface that no longer exists.
  useEffect(() => {
    if (!surfaces.some((s) => s.id === surfaceId)) {
      setSurfaceId(surfaces[0]?.id ?? SURFACE.FRONT);
    }
  }, [surfaces, surfaceId]);

  // A layer on the side you just left is off screen; keeping it selected would
  // point the inspector at something invisible.
  useEffect(() => {
    setSelectedId(null);
  }, [surfaceId, setSelectedId]);

  const mockupUrl =
    surfaces.find((s) => s.id === surfaceId)?.url || active?.url || '';

  /**
   * Print zone, most specific first: the active surface, then the chosen
   * garment set (each was authored with its own), then the product's.
   */
  const activePrintArea =
    surfaceDefs?.find((s) => s.id === surfaceId)?.printArea ??
    activeSet?.printArea ??
    printArea;

  useEffect(() => {
    onChange?.({ layers, color });
  }, [layers, color, onChange]);

  /* ---- keep the warp overlay glued to the selected layer ---- */
  useEffect(() => {
    if (!warpMode || !selectedId) {
      setLayerRect(null);
      return;
    }
    // Read after paint: Fabric has just re-rendered from the layers change.
    const id = requestAnimationFrame(() => {
      setLayerRect(canvasRef.current?.layerRect(selectedId) ?? null);
    });
    return () => cancelAnimationFrame(id);
  }, [warpMode, selectedId, layers]);

  /* ---- leaving warp mode when the selection changes avoids a stale mesh ---- */
  useEffect(() => {
    setWarpMode(null);
  }, [selectedId]);

  const handleDrop = useCallback(
    (raw: string) => {
      try {
        const payload = JSON.parse(raw) as DesignDragPayload;
        if (!payload?.url) return;
        addLayer({
          url: payload.url,
          code: payload.code,
          naturalWidth: payload.naturalWidth,
          naturalHeight: payload.naturalHeight,
        });
      } catch {
        setError('Không đọc được mẫu vừa kéo');
      }
    },
    [addLayer],
  );

  const ctx: DesignStudioContext = {
    // Every surface: a two-sided design saved as only the visible side is a
    // silently truncated order.
    layers: allLayers,
    color,
    exportMockup: () => canvasRef.current?.exportMockup() ?? null,
    renderPrint: () => renderPrintCanvas(allLayers, artwork),
    isEmpty: allLayers.length === 0,
    colors: (activeSet?.colors ?? []).map((c) => ({
      name: c.name,
      mockupUrl: c.urls.front ?? '',
    })),
    printArea: activePrintArea,
    mockupSetId: activeSet?.id ?? '',
    surfaceId,
  };

  /**
   * Latest context, for callbacks that outlive the render they were created in.
   *
   * `handleOrder` is memoised, so reading `ctx` from its closure hands the host
   * whatever the state was when that closure was built — switching garment or
   * flipping to the back does not change `layers`/`color`, so those two would
   * arrive stale and the draft would be saved against the previous set.
   */
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  /** Download the flattened mockup straight from the canvas. */
  const handleDownload = useCallback(() => {
    const dataUrl = canvasRef.current?.exportMockup();
    if (!dataUrl) {
      setError('Chưa có gì để tải — hãy thêm một mẫu vào áo.');
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `thiet-ke-${color || 'mockup'}.png`;
    a.click();
  }, [color]);

  /**
   * Share via the Web Share API when the device has it, otherwise copy the
   * page URL. No silent no-op: a share button that does nothing on desktop is
   * worse than one that says what it did.
   */
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // User dismissed the sheet — fall through to the clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setError('Đã copy link trang thiết kế.');
    } catch {
      setError('Không chia sẻ được — hãy copy link trên thanh địa chỉ.');
    }
  }, []);

  const handleOrder = useCallback(async () => {
    if (!onOrder) return;
    setBusy(true);
    setError('');
    try {
      await onOrder(ctxRef.current);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không hoàn tất được thao tác');
    } finally {
      setBusy(false);
    }
  }, [onOrder]);

  /* ---------------------------- tool panels ---------------------------- */

  function renderPanelBody() {
    if (!tool) return null;

    switch (tool) {
      case STUDIO_TOOL.PRODUCT:
        return (
          <div className="flex flex-col gap-3">
            {productPanelExtra}

            {/* Mockup sets. One row per set; the active one shows its colours
                in the swatch grid below (and at the foot of this column). */}
            <div className={STUDIO.card}>
              <div className={STUDIO.cardLabel}>Bộ mockup</div>
              <div className="flex flex-col gap-1.5">
                {mockupSets.map((set) => {
                  const on = set.id === activeSet?.id;
                  return (
                    <div
                      key={set.id}
                      className={`group flex items-center gap-1 rounded-lg border transition ${
                        on
                          ? 'border-[var(--studio-accent-line)] bg-[var(--studio-accent-soft)]'
                          : 'border-[var(--studio-border)] bg-[var(--studio-row)] hover:bg-[var(--studio-row-hover)]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setChosen.current = true;
                          setSetId(set.id);
                        }}
                        aria-pressed={on}
                        className={`flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-[13px] ${
                          on ? 'text-[var(--studio-ink)]' : 'text-[var(--studio-ink-2)]'
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{set.name}</span>
                        <span className="shrink-0 text-[11px] text-[var(--studio-muted)]">
                          {set.colors.length} màu ·{' '}
                          {set.kind === '2side' ? '2 mặt' : '1 mặt'}
                        </span>
                      </button>
                      {/* The product's own mockups and the drawn stand-in are
                          not library entries — there is nothing to delete. */}
                      {onDeleteSet && !set.placeholder && set.id !== 'product' && (
                        <button
                          type="button"
                          onClick={() => onDeleteSet(set)}
                          title={`Xoá bộ "${set.name}"`}
                          aria-label={`Xoá bộ ${set.name}`}
                          className="mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--studio-muted)] transition hover:bg-[var(--studio-danger-soft)] hover:text-[var(--studio-danger)]"
                        >
                          <svg
                            className="h-3.5 w-3.5 stroke-current fill-none [stroke-width:1.7] [stroke-linecap:round] [stroke-linejoin:round]"
                            viewBox="0 0 24 24"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {activeSet?.placeholder && (
                // Say it plainly: a drawn stand-in presented as product
                // photography is the kind of thing nobody catches until print.
                <p className="m-0 mt-2 text-[11px] text-[var(--studio-warn)]">
                  Đây là áo vẽ tạm — thay bằng ảnh mockup thật ở phần trên.
                </p>
              )}
            </div>

            {/* Colour and surface are NOT repeated here: `StudioMockupBar`
                keeps them at the foot of this column at all times, so
                rendering them again put two identical pickers on screen
                whenever this tool was open. */}
          </div>
        );

      case STUDIO_TOOL.TEXT:
        return (
          <StudioTextPanel
            selected={selected}
            onAdd={addTextLayer}
            onPatch={(partial, opts) =>
              selected && patchLayer(selected.id, partial, opts)
            }
            onCommit={endDrag}
          />
        );

      case STUDIO_TOOL.DRAFTS:
        return (
          <StudioDraftsPanel
            hasWork={allLayers.length > 0}
            onLoad={(draft) => {
              replaceLayers((draft.layers ?? []) as CanvasLayer[]);
              // The draft remembers which colour it was designed on; opening
              // it onto whatever colour happens to be selected would show the
              // buyer a design they never approved.
              if (draft.colorName) setColor(draft.colorName);
            }}
          />
        );

      case STUDIO_TOOL.LAYERS:
        return (
          <DesignLayerPanel
            layers={layers}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggleLock={toggleLock}
            onRemove={removeLayer}
            onReorder={reorderLayer}
          />
        );

      // Both feed the same uploader; "Tải lên" just opens the picker on entry.
      case STUDIO_TOOL.UPLOAD:
      case STUDIO_TOOL.LIBRARY:
        return (
          <DesignLibraryPanel
            // Remounts when the tool changes, which is what re-arms the picker.
            key={tool}
            collections={collections}
            allowUpload={allowUpload}
            autoOpenUpload={tool === STUDIO_TOOL.UPLOAD}
            onPick={(source) => addLayer(source)}
            onError={setError}
          />
        );

      default:
        return null;
    }
  }

  // `data-studio` là móc của reset khoanh vùng trong studio.css: preflight toàn
  // cục bị tắt để không đè theme, nên studio tự reset trong phạm vi của mình.
  return (
    <div className={STUDIO.root} data-studio={theme}>
      <StudioTopBar
        logoUrl={logoUrl}
        storeName={storeName}
        estimateVnd={estimateVnd}
        busy={busy}
        canClear={layers.length > 0}
        onClear={reset}
        onDownload={handleDownload}
        onShare={() => void handleShare()}
        onOrder={() => void handleOrder()}
        orderLabel={orderLabel}
      />

      {/* `relative` là mốc định vị cho panel khi nó thành lớp phủ trên điện thoại. */}
      <div className="relative flex min-h-0 flex-1">
        <StudioIconRail
          active={tool}
          onPick={(t) => {
            setTool(t);
            setPanelOpen(true);
          }}
        />

        <div className={`${STUDIO.panel}${panelOpen ? '' : ' max-sm:hidden'}`}>
          <div className={STUDIO.panelHead}>
            <span className={STUDIO.panelTitle}>{STUDIO_TOOL_LABEL[tool]}</span>
            {/* Chỉ hiện ở khổ điện thoại: ở đó panel che mất cái áo, phải có
                đường thoát. Màn rộng panel là một cột nên nút này vô nghĩa. */}
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label={STUDIO_COPY.closePanel}
              title={STUDIO_COPY.closePanel}
              className={`ml-auto hidden ${STUDIO.topBarIcon} max-sm:grid`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className={STUDIO.panelBody}>{renderPanelBody()}</div>

          {/* Mockup choice lives here, at the foot of the left column, rather
              than floating over the canvas — see StudioMockupBar. */}
          <StudioMockupBar
            colors={mockups.map((m) => ({ color: m.color, swatch: m.swatch }))}
            color={color}
            onColorChange={setColor}
            surfaces={surfaces}
            surfaceId={surfaceId}
            onSurfaceChange={setSurfaceId}
          />
        </div>

        {/* Positioning context for the floating inspector — it overlays the
            stage rather than taking a column of its own. */}
        <div className="relative flex min-w-0 flex-1">
        <StudioCanvasStage
          canvasRef={canvasRef}
          selected={selected}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onDuplicate={() => selected && duplicateLayer(selected.id)}
          onToggleLock={() => selected && toggleLock(selected.id)}
          onRemove={() => selected && removeLayer(selected.id)}
        >
          <DesignCanvas
            handleRef={canvasRef}
            mockupUrl={mockupUrl}
            artwork={artwork}
            printArea={activePrintArea}
            layers={layers}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onLayerTransform={patchLayer}
            onTransformStart={beginDrag}
            onTransformEnd={endDrag}
            onDropSource={handleDrop}
          />
          {warpMode && selected && layerRect && (
            <DesignWarpOverlay
              layer={selected}
              mode={warpMode}
              rect={layerRect}
              source={canvasRef.current?.sourceElement(selected.id) ?? null}
              onPreview={(c) => canvasRef.current?.swapElement(selected.id, c)}
              onCommit={(warp) => patchLayer(selected.id, { warp })}
              onError={setError}
            />
          )}
        </StudioCanvasStage>

        {/* Only with a selection, as in the reference: an inspector full of
            controls that act on nothing is noise over the mockup. */}
        {selected && (
        <aside className={STUDIO.inspector}>
          <span className={STUDIO.inspectorGrip} aria-hidden />
          <StudioImagePanel
            layer={selected}
            onPatch={(partial, opts) =>
              selected && patchLayer(selected.id, partial, opts)
            }
            onCommit={endDrag}
          >
            <DesignToolbar
              layer={selected}
              warpMode={warpMode}
              onPatch={(partial, opts) =>
                selected && patchLayer(selected.id, partial, opts)
              }
              onCommit={endDrag}
              onFlip={(axis) => selected && flip(selected.id, axis)}
              onRemove={() => selected && removeLayer(selected.id)}
              onReorder={(delta) => selected && reorderLayer(selected.id, delta)}
              onToggleLock={() => selected && toggleLock(selected.id)}
              onSetWarpMode={(mode) => {
                beginDrag();
                setWarpMode(mode);
              }}
              onClearWarp={() =>
                selected && patchLayer(selected.id, { warp: undefined })
              }
            />
          </StudioImagePanel>
        </aside>
        )}

        {/* Host CTAs float bottom-left, ALWAYS visible: the inspector appears
            only with a selection, and an export result the buyer has to select
            a layer to read is a result they will miss. */}
        {actions && (
          <div className="absolute bottom-5 left-5 z-30 w-[300px] max-w-[calc(100%-2rem)]">
            {actions(ctx)}
          </div>
        )}
        </div>
      </div>

      {error && (
        <div
          role="status"
          className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-[var(--studio-border)] bg-[#1b2444] px-4 py-2 text-[13px] text-[var(--studio-ink)] shadow-xl"
        >
          {error}
          <button
            type="button"
            className="ml-3 text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
            onClick={() => setError('')}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
