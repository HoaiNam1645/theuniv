'use client';

import { mediaUrl } from '@/lib/studio/api';
import { colorNameToHex } from '@/lib/studio/colorMap';
import { STUDIO, STUDIO_COPY } from './studioTheme';
import type { StudioSurface } from './StudioCanvasStage';

/**
 * Mockup picker — garment colour and print surface — pinned to the bottom of
 * the left column.
 *
 * On the LEFT, not floating over the canvas: "which shirt am I designing on" is
 * a standing choice, not a transient action. As a popover over the artwork it
 * covered the very thing the buyer was judging the colour against, and it
 * disappeared the moment they clicked away.
 *
 * Always rendered, so the left column answers all three questions at once —
 * which tool, which artwork, which shirt.
 */
interface StudioMockupBarProps {
  colors: { color: string; swatch?: string }[];
  color: string;
  onColorChange: (c: string) => void;
  surfaces: StudioSurface[];
  surfaceId: string;
  onSurfaceChange: (id: string) => void;
}

export function StudioMockupBar({
  colors,
  color,
  onColorChange,
  surfaces,
  surfaceId,
  onSurfaceChange,
}: StudioMockupBarProps) {
  const showColors = colors.length > 1;
  const showSurfaces = surfaces.length > 1;
  if (!showColors && !showSurfaces) return null;

  return (
    <div className="shrink-0 border-t border-[var(--studio-border)] bg-[var(--studio-bar)] p-3">
      {showColors && (
        <div className="mb-3">
          <div className={STUDIO.cardLabel}>
            {STUDIO_COPY.color}
            <span className="ml-1.5 font-normal normal-case tracking-normal text-[var(--studio-muted)]">
              {color}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {colors.map((c) => (
              <button
                key={c.color}
                type="button"
                onClick={() => onColorChange(c.color)}
                title={c.color}
                aria-label={c.color}
                aria-pressed={c.color === color}
                className={`h-7 w-7 rounded-full border-2 transition ${
                  c.color === color
                    ? 'border-[var(--studio-accent)] ring-2 ring-[var(--studio-accent-line)]'
                    : 'border-[var(--studio-border-strong)] hover:border-[var(--studio-border-strong)]'
                }`}
                style={{ background: c.swatch || colorNameToHex(c.color) }}
              />
            ))}
          </div>
        </div>
      )}

      {showSurfaces && (
        <div>
          <div className={STUDIO.cardLabel}>Mặt in</div>
          <div className="flex gap-2">
            {surfaces.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSurfaceChange(s.id)}
                aria-pressed={s.id === surfaceId}
                className={`flex-1 overflow-hidden rounded-lg border-2 bg-[var(--studio-card)] p-1 text-[10px] transition ${
                  s.id === surfaceId
                    ? 'border-[var(--studio-accent)] text-[var(--studio-accent-ink)]'
                    : 'border-[var(--studio-border)] text-[var(--studio-muted)] hover:border-[var(--studio-border-strong)]'
                }`}
              >
                {s.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(s.url)}
                    alt=""
                    className="mb-0.5 block h-12 w-full rounded object-contain"
                  />
                ) : null}
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
