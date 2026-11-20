/**
 * Design-studio chrome: class tokens + UI copy.
 *
 * Studio là công cụ chứ không phải một trang, nên nó có tông riêng — nhưng tông
 * đó phải theo nơi nó được nhúng: nền tối ở trang khách, nền trắng khi nằm trong
 * trang quản trị. Vì vậy **không có mã màu nào ở đây**; tất cả trỏ vào biến
 * `--studio-*` khai trong `studio.css`, và host chọn tông bằng prop `theme` của
 * `DesignStudio` (`data-studio="light"`).
 *
 * Copy nằm luôn ở đây vì không có chữ nào đi qua ranh giới API — thuần trình bày.
 */

/**
 * Tông màu. Giá trị đi thẳng vào `data-studio`, khớp selector trong `studio.css`
 * (`[data-studio]` = tối, `[data-studio='light']` = sáng).
 */
export const STUDIO_THEME = { DARK: 'dark', LIGHT: 'light' } as const;

export type StudioTheme = (typeof STUDIO_THEME)[keyof typeof STUDIO_THEME];

/** Bề mặt, đường viền và màu nhấn — đều là biến, xem `studio.css`. */
export const STUDIO = {
  /**
   * Shell. Fills whatever box the host gives it rather than pinning 100dvh:
   * the storefront renders it full-screen, the admin inside a page that already
   * spends height on its own header and sidebar.
   */
  root: 'relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--studio-bg)] text-[var(--studio-ink)]',

  topBar:
    'flex h-14 shrink-0 items-center gap-2 border-b border-[var(--studio-border)] bg-[var(--studio-surface)] px-3 max-sm:gap-1 max-sm:px-1.5',
  topBarIcon:
    'grid h-9 w-9 place-items-center rounded-lg text-[var(--studio-muted)] transition hover:bg-[var(--studio-hover)] hover:text-[var(--studio-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-accent)]',

  /** Vertical tool rail on the left. 86px → 64px trên điện thoại, xem `panel`. */
  rail: 'flex w-[86px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-[var(--studio-border)] bg-[var(--studio-surface)] py-2 max-sm:w-16',
  /**
   * Single-line labels, as in the reference. Two sizing bugs were fixed here in
   * turn: at 68px the labels wrapped ("Sản / phẩm"), and `whitespace-nowrap`
   * alone then let them overflow the rail into the panel beside it. The width
   * and the 9px type are matched to the longest label ("Sản phẩm"), with
   * `overflow-hidden` as the backstop for any label added later.
   */
  railItem:
    'flex w-full cursor-pointer flex-col items-center gap-1 overflow-hidden whitespace-nowrap rounded-lg border-0 bg-transparent px-1 py-2 text-[9px] leading-tight tracking-tight text-[var(--studio-muted)] transition hover:bg-[var(--studio-hover)] hover:text-[var(--studio-ink)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--studio-accent)]',
  railItemActive: 'bg-[var(--studio-accent-soft)] text-[var(--studio-accent-ink)]',

  /**
   * Slide-out panel that the rail opens.
   *
   * Trên điện thoại nó KHÔNG còn là một cột: rail 86px + panel 320px đã là 406px,
   * rộng hơn cả màn 360px, nên vùng vẽ bị đẩy hết ra ngoài — người dùng chọn hình
   * mà không thấy cái áo. Dưới 640px panel chuyển thành lớp phủ nằm đè lên vùng
   * vẽ (đúng cách các studio khác làm trên di động), đóng lại là thấy áo ngay.
   */
  panel:
    'flex w-[320px] shrink-0 flex-col border-r border-[var(--studio-border)] bg-[var(--studio-surface)] min-h-0 max-sm:absolute max-sm:inset-y-0 max-sm:left-16 max-sm:right-0 max-sm:z-40 max-sm:w-auto max-sm:shadow-[var(--studio-shadow-lg)]',
  panelHead: 'flex items-center gap-2 border-b border-[var(--studio-border)] px-3 py-2.5',
  panelTitle: 'text-[13px] font-semibold text-[var(--studio-ink)]',
  panelBody: 'min-h-0 flex-1 overflow-y-auto p-3',

  /**
   * Canvas backdrop. The dotted grid reads as "workspace" and, unlike a flat
   * fill, makes a transparent PNG's edges obvious while it is being placed.
   */
  stage:
    'relative min-w-0 flex-1 overflow-auto bg-[var(--studio-bg)] [background-image:radial-gradient(var(--studio-dot)_1px,transparent_1px)] [background-size:22px_22px]',

  /** Floating pill controls over the stage. */
  pill:
    'inline-flex items-center gap-1.5 rounded-full border border-[var(--studio-border-strong)] bg-[var(--studio-pill)] px-3 py-1.5 text-[13px] text-[var(--studio-ink-2)] shadow-[var(--studio-shadow)] backdrop-blur transition hover:bg-[var(--studio-pill-hover)] disabled:cursor-not-allowed disabled:opacity-40',
  pillActive: 'border-[var(--studio-accent-line)] bg-[var(--studio-accent-soft-2)] text-[var(--studio-accent-ink)]',

  /**
   * Right-hand inspector — a FLOATING card over the stage, not a docked
   * column. Detaching it is what makes the canvas read as a workspace the
   * panel sits on top of rather than a third column squeezed between two
   * sidebars; it also lets the mockup stay centred in the full stage width.
   */
  inspector:
    'pointer-events-auto absolute right-4 top-20 bottom-6 z-30 flex w-[268px] flex-col gap-2 overflow-y-auto rounded-2xl border border-[var(--studio-border-strong)] bg-[var(--studio-panel)] p-3 shadow-[var(--studio-shadow-lg)] backdrop-blur max-sm:inset-x-2 max-sm:top-auto max-sm:bottom-2 max-sm:h-[46%] max-sm:w-auto',
  /** Grab bar at the top of the floating inspector. */
  inspectorGrip: 'mx-auto mb-1 h-1 w-9 shrink-0 rounded-full bg-[var(--studio-grip)]',

  /**
   * Action rows at the top of the inspector — the pill list the reference puts
   * above the filter block. Each row is a disclosure: tapping opens its section
   * below, so the panel stays one column instead of a scrolling wall.
   */
  inspectorRow:
    'flex w-full items-center gap-2.5 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-row)] px-3 py-2.5 text-left text-[13px] text-[var(--studio-ink-2)] transition hover:bg-[var(--studio-row-hover)]',
  inspectorRowActive:
    'border-[var(--studio-accent-line)] bg-[var(--studio-accent-soft)] text-[var(--studio-accent-ink-strong)]',
  /**
   * Ô vuông nhỏ chứa glyph của hàng. Nền là màu đậm đặt inline (`tint`), nên chữ
   * trắng đúng ở cả hai tông — đây là chỗ duy nhất còn giữ màu cứng, có lý do.
   */
  inspectorRowIcon:
    'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white',
  card: 'rounded-xl border border-[var(--studio-border)] bg-[var(--studio-card)] p-3',
  cardLabel:
    'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--studio-muted)]',
  select:
    'w-full rounded-lg border border-[var(--studio-border-strong)] bg-[var(--studio-raised)] px-2.5 py-2 text-[13px] text-[var(--studio-ink)] outline-none focus-visible:border-[var(--studio-accent)]',
  sectionTitle:
    'mt-2 border-b border-[var(--studio-border)] pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--studio-muted)]',
} as const;

/** The eight tools on the left rail, in the reference order. */
export const STUDIO_TOOL = {
  PRODUCT: 'product',
  LIBRARY: 'library',
  UPLOAD: 'upload',
  TEXT: 'text',
  AI: 'ai',
  DECOR: 'decor',
  LAYERS: 'layers',
  DRAFTS: 'drafts',
} as const;

export type StudioTool = (typeof STUDIO_TOOL)[keyof typeof STUDIO_TOOL];

export const STUDIO_TOOL_LABEL: Record<StudioTool, string> = {
  [STUDIO_TOOL.PRODUCT]: 'Sản phẩm',
  [STUDIO_TOOL.LIBRARY]: 'Thư viện',
  [STUDIO_TOOL.UPLOAD]: 'Tải lên',
  [STUDIO_TOOL.TEXT]: 'Văn bản',
  [STUDIO_TOOL.AI]: 'AI',
  [STUDIO_TOOL.DECOR]: 'Trang trí',
  [STUDIO_TOOL.LAYERS]: 'Lớp',
  [STUDIO_TOOL.DRAFTS]: 'Bản nháp',
};

/**
 * Tools whose panel is not built yet — **hidden**, not disabled.
 *
 * They stay declared (the enum, the labels and the icons are already written)
 * so switching one on later is a one-line removal from this list. But a control
 * a buyer can click and get nothing from is worse than no control at all: it
 * reads as a broken feature and invites "khi nào có?" instead of selling a
 * shirt. `StudioIconRail` filters these out of the rail entirely.
 */
export const STUDIO_TOOL_PENDING: readonly StudioTool[] = [
  // AI has no engine behind it (`AI_PROVIDER=none`, providers are Mock stubs)
  // and Trang trí has no clipart library yet — both would open on nothing.
  STUDIO_TOOL.AI,
  STUDIO_TOOL.DECOR,
];

export const STUDIO_COPY = {
  undo: 'Hoàn tác',
  redo: 'Làm lại',
  color: 'Màu',
  view3d: '3D',
  front: 'Mặt trước',
  back: 'Mặt sau',
  zoom: 'Thu phóng',
  estimate: 'Tổng giá tạm tính',
  order: 'Đặt hàng',
  share: 'Chia sẻ',
  download: 'Tải ảnh',
  clearAll: 'Xoá hết',
  home: 'Trang chủ',
  duplicate: 'Nhân bản',
  lock: 'Khoá',
  unlock: 'Mở khoá',
  remove: 'Xoá',
  /** Right inspector. */
  editImage: 'Chỉnh ảnh',
  filters: 'Bộ lọc, màu & khung ảnh',
  filter: 'Bộ lọc ảnh',
  blend: 'Chế độ hoà trộn',
  frame: 'Khung / viền ảnh',
  brightness: 'Độ sáng',
  contrast: 'Tương phản',
  saturation: 'Độ bão hoà',
  reset: 'Reset',
  none: 'Không',
  normal: 'Bình thường',
  default: 'Mặc định',
  /** Chỉ dùng ở khổ điện thoại, nơi panel công cụ đè lên vùng vẽ. */
  closePanel: 'Đóng bảng công cụ',
  pickLayerHint: 'Chọn một lớp trên áo để chỉnh.',
  comingSoon: 'Đang phát triển — sẽ có ở bản sau.',
  /** Nhãn mặc định trong panel lớp khi layer không có mã in để hiện. */
  layerImage: 'Ảnh tải lên',
  layerText: 'Chữ',
} as const;
