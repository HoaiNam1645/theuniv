'use client';

import { useState } from 'react';
import {
  DESIGN_FONT_FAMILIES,
  MAX_DESIGN_TEXT_LENGTH,
} from '@/lib/studio/constants';
import {
  type CanvasLayer,
} from '@/lib/studio/types';
import { STUDIO } from './studioTheme';

/**
 * "Văn bản" tool — add a line of text to the garment, then restyle whichever
 * text layer is selected.
 *
 * One panel for both because they are the same controls: typing in the box with
 * a text layer selected edits it, and with nothing selected adds a new one.
 * Splitting them into "add" and "edit" panels would mean two places to change
 * a font list.
 */

const COPY = {
  title: 'Nội dung',
  placeholder: 'Nhập chữ cần in…',
  add: '+ Thêm chữ lên áo',
  font: 'Phông chữ',
  size: 'Cỡ chữ',
  color: 'Màu chữ',
  weight: 'Độ đậm',
  align: 'Căn dòng',
  upper: 'IN HOA',
  hint: 'Chọn một lớp chữ trên áo để sửa, hoặc nhập rồi bấm “Thêm chữ”.',
} as const;

const WEIGHTS = [
  { value: 'normal', label: 'Thường' },
  { value: 'bold', label: 'Đậm' },
] as const;

const ALIGNS = [
  { value: 'left', label: 'Trái' },
  { value: 'center', label: 'Giữa' },
  { value: 'right', label: 'Phải' },
] as const;

/** Artwork-pixel bounds for the size slider — a print file, not a screen. */
const MIN_FONT = 12;
const MAX_FONT = 400;

interface StudioTextPanelProps {
  /** The selected layer, or null. Only text layers are editable here. */
  selected: CanvasLayer | null;
  onAdd: (text: string) => void;
  onPatch: (partial: Partial<CanvasLayer>, opts?: { transient?: boolean }) => void;
  onCommit: () => void;
}

export function StudioTextPanel({
  selected,
  onAdd,
  onPatch,
  onCommit,
}: StudioTextPanelProps) {
  const [draft, setDraft] = useState('');
  const editing = selected?.type === 'text' ? selected : null;

  return (
    <div className="flex flex-col gap-3">
      <div className={STUDIO.card}>
        <label className={STUDIO.cardLabel}>{COPY.title}</label>
        <textarea
          rows={2}
          maxLength={MAX_DESIGN_TEXT_LENGTH}
          className={`${STUDIO.select} resize-none`}
          placeholder={COPY.placeholder}
          value={editing ? (editing.defaultText ?? '') : draft}
          onChange={(e) =>
            editing
              ? onPatch({ defaultText: e.target.value }, { transient: true })
              : setDraft(e.target.value)
          }
          onBlur={editing ? onCommit : undefined}
        />
        {!editing && (
          <button
            type="button"
            className="mt-2 w-full rounded-lg bg-[var(--studio-accent)] px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-[var(--studio-accent-hover)] disabled:opacity-40"
            disabled={!draft.trim()}
            onClick={() => {
              onAdd(draft);
              setDraft('');
            }}
          >
            {COPY.add}
          </button>
        )}
      </div>

      {!editing ? (
        <p className="m-0 px-1 text-[12px] text-[var(--studio-muted)]">{COPY.hint}</p>
      ) : (
        <>
          <div className={STUDIO.card}>
            <label className={STUDIO.cardLabel}>{COPY.font}</label>
            <select
              className={STUDIO.select}
              value={editing.fontFamily ?? DESIGN_FONT_FAMILIES[0]}
              onChange={(e) => onPatch({ fontFamily: e.target.value })}
            >
              {DESIGN_FONT_FAMILIES.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className={STUDIO.card}>
            <label className={STUDIO.cardLabel}>
              {COPY.size} {Math.round(editing.fontSize ?? 64)}
            </label>
            <input
              type="range"
              min={MIN_FONT}
              max={MAX_FONT}
              value={Math.round(editing.fontSize ?? 64)}
              onChange={(e) =>
                onPatch({ fontSize: Number(e.target.value) }, { transient: true })
              }
              onPointerUp={onCommit}
              className="w-full accent-indigo-400"
            />
          </div>

          <div className={STUDIO.card}>
            <label className={STUDIO.cardLabel}>{COPY.color}</label>
            <input
              type="color"
              value={editing.fill || '#111827'}
              onChange={(e) => onPatch({ fill: e.target.value })}
              className="h-9 w-full cursor-pointer rounded-lg border border-[var(--studio-border)] bg-transparent"
            />
          </div>

          <div className={STUDIO.card}>
            <label className={STUDIO.cardLabel}>{COPY.weight}</label>
            <select
              className={STUDIO.select}
              value={String(editing.fontWeight ?? 'normal')}
              onChange={(e) => onPatch({ fontWeight: e.target.value })}
            >
              {WEIGHTS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          <div className={STUDIO.card}>
            <label className={STUDIO.cardLabel}>{COPY.align}</label>
            <select
              className={STUDIO.select}
              value={editing.textAlign ?? 'center'}
              onChange={(e) =>
                onPatch({
                  textAlign: e.target.value as CanvasLayer['textAlign'],
                })
              }
            >
              {ALIGNS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <label className={`${STUDIO.card} flex cursor-pointer items-center gap-2 text-[13px] text-[var(--studio-ink-2)]`}>
            <input
              type="checkbox"
              checked={Boolean(editing.uppercase)}
              onChange={(e) => onPatch({ uppercase: e.target.checked })}
            />
            {COPY.upper}
          </label>
        </>
      )}
    </div>
  );
}
