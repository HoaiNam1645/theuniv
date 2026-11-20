'use client';

import {
  STUDIO,
  STUDIO_TOOL,
  STUDIO_TOOL_LABEL,
  STUDIO_TOOL_PENDING,
  type StudioTool,
} from './studioTheme';

/**
 * Vertical tool rail — the studio's primary navigation.
 *
 * Icon + label per item rather than icon-only: the eight tools are not
 * universally-understood glyphs, and a tooltip that only appears on hover is
 * useless on the touch devices a buyer designs from.
 */

const ICON = 'h-[18px] w-[18px] stroke-current fill-none [stroke-width:1.6] [stroke-linecap:round] [stroke-linejoin:round]';

const ICONS: Record<StudioTool, React.ReactNode> = {
  [STUDIO_TOOL.PRODUCT]: (
    <svg className={ICON} viewBox="0 0 24 24">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  [STUDIO_TOOL.LIBRARY]: (
    <svg className={ICON} viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  [STUDIO_TOOL.UPLOAD]: (
    <svg className={ICON} viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  [STUDIO_TOOL.TEXT]: (
    <svg className={ICON} viewBox="0 0 24 24">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  [STUDIO_TOOL.AI]: (
    <svg className={ICON} viewBox="0 0 24 24">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5 13.4 11l2.6 1-2.6 1-1.4 2.5L10.6 13 8 12l2.6-1z" />
    </svg>
  ),
  [STUDIO_TOOL.DECOR]: (
    <svg className={ICON} viewBox="0 0 24 24">
      <circle cx="7" cy="7" r="3.5" />
      <rect x="13.5" y="3.5" width="7" height="7" />
      <path d="M7 13.5 10.5 20.5h-7z" />
      <circle cx="17" cy="17" r="3.5" />
    </svg>
  ),
  [STUDIO_TOOL.LAYERS]: (
    <svg className={ICON} viewBox="0 0 24 24">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  [STUDIO_TOOL.DRAFTS]: (
    <svg className={ICON} viewBox="0 0 24 24">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
};

/** Reference order, including the tools that are not built yet. */
const ORDER: StudioTool[] = [
  STUDIO_TOOL.PRODUCT,
  STUDIO_TOOL.LIBRARY,
  STUDIO_TOOL.UPLOAD,
  STUDIO_TOOL.TEXT,
  STUDIO_TOOL.AI,
  STUDIO_TOOL.DECOR,
  STUDIO_TOOL.LAYERS,
  STUDIO_TOOL.DRAFTS,
];

/**
 * What is actually rendered. Unbuilt tools are dropped here rather than deleted
 * from `ORDER`, so re-enabling one means removing it from
 * `STUDIO_TOOL_PENDING` and it reappears in the right position.
 */
const VISIBLE = ORDER.filter((t) => !STUDIO_TOOL_PENDING.includes(t));

interface StudioIconRailProps {
  active: StudioTool | null;
  /** Passing the already-active tool closes the panel (toggle). */
  onPick: (tool: StudioTool) => void;
}

export function StudioIconRail({
  active,
  onPick,
}: StudioIconRailProps) {
  return (
    <nav className={STUDIO.rail} aria-label="Công cụ thiết kế">
      {VISIBLE.map((tool) => {
        const on = active === tool;
        return (
          <button
            key={tool}
            type="button"
            onClick={() => onPick(tool)}
            aria-pressed={on}
            className={`${STUDIO.railItem} ${on ? STUDIO.railItemActive : ''}`}
          >
            {ICONS[tool]}
            <span>{STUDIO_TOOL_LABEL[tool]}</span>
          </button>
        );
      })}
    </nav>
  );
}
