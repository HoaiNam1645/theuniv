'use client';

import type { CanvasLayer } from '@/lib/studio/types';
import { mediaUrl } from '@/lib/studio/api';
import { STUDIO_COPY } from './studioTheme';

/**
 * "Lớp" panel — the layer stack, topmost first (which is how designers read a
 * stack, and the inverse of the zIndex order the renderer paints in).
 */

interface Props {
  layers: CanvasLayer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (id: string, delta: number) => void;
}

export function DesignLayerPanel({
  layers,
  selectedId,
  onSelect,
  onToggleLock,
  onRemove,
  onReorder,
}: Props) {
  if (!layers.length) {
    return (
      <p className="m-0 rounded-xl border border-dashed border-[var(--studio-border-strong)] p-3 text-center text-[12px] text-[var(--studio-muted)]">
        Chưa có lớp nào — kéo một mẫu từ kho design vào áo.
      </p>
    );
  }

  const topFirst = [...layers].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));

  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {topFirst.map((layer) => {
        const active = layer.id === selectedId;
        return (
          <li
            key={layer.id}
            className={`flex items-center gap-2 rounded-lg border p-1.5 ${
              active
                ? 'border-[var(--studio-accent-line)] bg-[var(--studio-accent-soft)]'
                : 'border-[var(--studio-border)] bg-[var(--studio-card)]'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(layer.id)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded border border-[var(--studio-border)] bg-[repeating-conic-gradient(#334155_0%_25%,#1e293b_0%_50%)] bg-[length:10px_10px]">
                {layer.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(layer.src)}
                    alt=""
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-medium text-[var(--studio-ink)]">
                  {/* Lớp chữ hiện chính nội dung của nó — bản gốc gọi mọi lớp
                      là "Ảnh tải lên", nên panel lớp của một thiết kế toàn chữ
                      là một danh sách các dòng giống hệt nhau, không chọn được. */}
                  {layer.assetCode ||
                    (layer.type === 'text'
                      ? layer.defaultText?.trim() || STUDIO_COPY.layerText
                      : STUDIO_COPY.layerImage)}
                </span>
                {layer.warp && (
                  <span className="block text-[11px] text-fuchsia-300">đã bóp méo</span>
                )}
              </span>
            </button>

            <span className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => onReorder(layer.id, 1)}
                className="px-1 text-[13px] leading-none text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
                title="Lên trên"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onReorder(layer.id, -1)}
                className="px-1 text-[13px] leading-none text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
                title="Xuống dưới"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onToggleLock(layer.id)}
                className="px-1 text-[12px] leading-none"
                title={layer.locked ? 'Mở khoá' : 'Khoá'}
              >
                {layer.locked ? '🔒' : '🔓'}
              </button>
              <button
                type="button"
                onClick={() => onRemove(layer.id)}
                className="px-1 text-[12px] leading-none text-[var(--studio-danger)] hover:text-[var(--studio-danger)]"
                title="Xoá lớp"
              >
                ✕
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
