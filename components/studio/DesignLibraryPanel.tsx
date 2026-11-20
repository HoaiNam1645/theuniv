'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  MEDIA_KIND,
  STUDIO_FIRST_PAGE,
  STUDIO_IMAGE_ACCEPT,
} from '@/lib/studio/constants';
import {
  type DesignAssetDTO,
  type DesignCollectionDTO,
} from '@/lib/studio/types';
import {
  STUDIO_API_ERROR,
  fetchDesignAssets,
  fetchDesignCollections,
  mediaUrl,
  uploadStudioImage,
} from '@/lib/studio/api';
import ImageDrop from '@/components/admin/ImageDrop';
import { Spinner } from './Spinner';
import { DESIGN_DRAG_MIME } from './DesignCanvas';
import type { DesignSource } from './useDesignStudio';

/**
 * Two-tier design library, matching how a large catalogue is actually browsed:
 * collection cards first, then the artwork grid inside one collection.
 *
 * The reference site inlines its whole 1600-item catalogue into the page; this
 * one pages the API instead, so opening the studio costs one small request.
 */

interface Props {
  /** Restrict to these collection ids (product-level `freeDesign.collections`). */
  collections?: string[];
  allowUpload: boolean;
  /**
   * Open the OS file picker as soon as the panel mounts.
   *
   * The tool rail has a distinct "Tải lên" item; rather than build a second
   * uploader beside this one, that item opens this panel and fires its picker,
   * so there is exactly one upload path.
   */
  autoOpenUpload?: boolean;
  onPick: (source: DesignSource) => void;
  onError?: (message: string) => void;
}

/** Payload carried through an HTML5 drag onto the canvas. */
export interface DesignDragPayload {
  url: string;
  code?: string;
  naturalWidth?: number;
  naturalHeight?: number;
}

export function DesignLibraryPanel({
  collections: allowedCollections,
  allowUpload,
  autoOpenUpload,
  onPick,
  onError,
}: Props) {
  const [collections, setCollections] = useState<DesignCollectionDTO[]>([]);
  const [openCollection, setOpenCollection] = useState<DesignCollectionDTO | null>(
    null,
  );
  const [assets, setAssets] = useState<DesignAssetDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(STUDIO_FIRST_PAGE);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* ---- tier 1: collections ---- */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDesignCollections()
      .then((r) => {
        if (cancelled) return;
        const list = allowedCollections?.length
          ? r.collections.filter((c) => allowedCollections.includes(c.id))
          : r.collections;
        setCollections(list);
        setError('');
      })
      .catch((e) => {
        if (cancelled) return;
        // Nói ra lỗi thay vì để lưới trống — "chưa có mẫu nào" và "không gọi
        // được API" trông giống hệt nhau nếu nuốt mất thông báo.
        setError(e instanceof Error ? e.message : STUDIO_API_ERROR.collections);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [allowedCollections]);

  /* ---- tier 2: assets of the open collection (or a global search) ---- */
  const loadAssets = useCallback(
    async (nextPage: number, replace: boolean) => {
      setLoading(true);
      try {
        const r = await fetchDesignAssets({
          page: nextPage,
          collection: openCollection?.id,
          search,
        });
        setAssets((prev) => (replace ? r.items : [...prev, ...r.items]));
        setTotal(r.total);
        setPage(r.page);
        setError('');
      } catch (e) {
        setError(e instanceof Error ? e.message : STUDIO_API_ERROR.assets);
      } finally {
        setLoading(false);
      }
    },
    [openCollection, search],
  );

  const browsing = Boolean(openCollection) || search.trim().length > 0;

  useEffect(() => {
    if (!browsing) {
      setAssets([]);
      setTotal(0);
      return;
    }
    void loadAssets(STUDIO_FIRST_PAGE, true);
  }, [browsing, loadAssets]);

  /** Nhận URL đã tải lên (ImageDrop lo phần gửi file) rồi đo kích thước thật. */
  async function handleUploaded(urls: string[]) {
    const url = urls[0];
    if (!url) return;
    try {
      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 0, h: 0 });
        img.src = mediaUrl(url);
      });
      onPick({
        url,
        naturalWidth: dims.w || undefined,
        naturalHeight: dims.h || undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : STUDIO_API_ERROR.upload;
      setError(msg);
      onError?.(msg);
    }
  }

  function startDrag(e: React.DragEvent, asset: DesignAssetDTO) {
    const payload: DesignDragPayload = {
      url: asset.url,
      code: asset.code,
      naturalWidth: asset.widthPx,
      naturalHeight: asset.heightPx,
    };
    e.dataTransfer.setData(DESIGN_DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-[15px]">Kho design</strong>
        {allowUpload && (
          // Cùng một component kéo-thả với trang quản trị, chỉ khác lớp CSS và
          // khác đường tải lên: ảnh của KHÁCH đi endpoint công khai, không phải
          // endpoint admin (đòi đăng nhập).
          <ImageDrop
            compact
            accept={STUDIO_IMAGE_ACCEPT}
            autoOpen={autoOpenUpload}
            className="studio-imgdrop"
            upload={(f) => uploadStudioImage(f, MEDIA_KIND.UPLOAD)}
            onUploaded={(urls) => void handleUploaded(urls)}
          />
        )}
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm theo tên hoặc mã in…"
        className="w-full rounded-lg border border-[var(--studio-border)] bg-[#141b33] px-2.5 py-1.5 text-[13px] text-[var(--studio-ink)] placeholder:text-[var(--studio-muted)] outline-none focus-visible:border-[var(--studio-accent)]"
      />

      {error && <p className="m-0 text-[12px] text-[var(--studio-danger)]">{error}</p>}

      {browsing && (
        <button
          type="button"
          onClick={() => {
            setOpenCollection(null);
            setSearch('');
          }}
          className="self-start rounded-lg border border-[var(--studio-border)] bg-[var(--studio-row)] px-2.5 py-1.5 text-[12px] text-[var(--studio-ink-2)] transition hover:bg-[var(--studio-row-hover)]"
        >
          ← Đổi danh mục
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Tier 1 — collection cards */}
        {!browsing && (
          <div className="grid grid-cols-2 gap-2">
            {collections.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setOpenCollection(c)}
                className="overflow-hidden rounded-xl border border-[var(--studio-border)] bg-[var(--studio-row)] text-left transition hover:border-[var(--studio-accent)]"
              >
                <span className="grid aspect-square grid-cols-2 gap-px bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#fff_0%_50%)] bg-[length:12px_12px]">
                  {c.coverUrls.map((u, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={u} alt="" className="h-full w-full object-contain" />
                  ))}
                </span>
                <span className="block px-2 py-1.5">
                  <span className="block truncate text-[12px] font-semibold text-[var(--studio-ink)]">{c.name}</span>
                  <span className="block text-[11px] text-[var(--studio-muted)]">
                    {c.count} hình
                  </span>
                </span>
              </button>
            ))}
            {!loading && !collections.length && (
              <p className="col-span-2 m-0 text-center text-[12px] text-[var(--studio-muted)]">
                Kho design chưa có mẫu nào.
              </p>
            )}
          </div>
        )}

        {/* Tier 2 — artwork grid */}
        {browsing && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {assets.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  draggable
                  onDragStart={(e) => startDrag(e, a)}
                  // Tap-to-add: HTML5 drag does not fire on touch devices.
                  onClick={() =>
                    onPick({
                      url: a.url,
                      code: a.code,
                      naturalWidth: a.widthPx,
                      naturalHeight: a.heightPx,
                    })
                  }
                  title={`${a.title} · ${a.code}`}
                  className="overflow-hidden rounded-xl border border-[var(--studio-border)] bg-[repeating-conic-gradient(#334155_0%_25%,#1e293b_0%_50%)] bg-[length:12px_12px] transition hover:border-[var(--studio-accent)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.thumbUrl}
                    alt={a.title}
                    loading="lazy"
                    className="aspect-square w-full object-contain"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
            {!loading && !assets.length && (
              <p className="m-0 py-6 text-center text-[12px] text-[var(--studio-muted)]">
                Không tìm thấy mẫu nào.
              </p>
            )}
            {assets.length < total && (
              <button
                type="button"
                onClick={() => void loadAssets(page + 1, false)}
                disabled={loading}
                className="mt-2 w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-row)] py-2 text-[12px] text-[var(--studio-ink-2)] transition hover:bg-[var(--studio-row-hover)] disabled:opacity-50"
              >
                {loading ? 'Đang tải…' : `Xem thêm (${total - assets.length})`}
              </button>
            )}
          </>
        )}

        {loading && !assets.length && !collections.length && (
          <div className="py-6">
            <Spinner label="Đang tải kho design…" />
          </div>
        )}
      </div>

      <p className="m-0 text-[11px] text-[var(--studio-muted)]">
        Kéo mẫu vào áo, hoặc bấm để thêm vào giữa vùng in.
      </p>
    </div>
  );
}
