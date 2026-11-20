'use client';

import { useState } from 'react';
import {
  DESIGN_CODE_LENGTH,
} from '@/lib/studio/constants';
import {
  type CanvasLayer,
  type DesignDraftDTO,
} from '@/lib/studio/types';
import { STUDIO_API_ERROR, fetchDraft } from '@/lib/studio/api';
import { STUDIO } from './studioTheme';

/**
 * "Bản nháp" tool — reopen a saved design from its code.
 *
 * The whole hand-off runs on that code: the buyer exports, gets a code, and
 * sends it over Zalo. Without a way back in, the code is write-only — the
 * workshop can look the design up but the buyer cannot resume editing it, and
 * "đổi chút xíu" means starting over.
 *
 * `GET /design-drafts/:code` already returns the layers; this is the missing UI.
 */

const COPY = {
  label: 'Mã thiết kế',
  placeholder: 'VD: NVVXR727',
  open: 'Mở bản nháp',
  loading: 'Đang mở…',
  replaceWarning:
    'Mở bản nháp sẽ thay toàn bộ thiết kế đang làm. Lưu lại trước nếu cần.',
  hint: 'Mã in trên tin nhắn Zalo sau khi bạn xuất thiết kế.',
  loaded: (n: number) => `Đã mở — ${n} lớp thiết kế.`,
} as const;

interface StudioDraftsPanelProps {
  onLoad: (draft: DesignDraftDTO) => void;
  /** Something is already on the canvas — opening a draft would discard it. */
  hasWork: boolean;
}

export function StudioDraftsPanel({
  onLoad,
  hasWork,
}: StudioDraftsPanelProps) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState<number | null>(null);

  async function open() {
    const value = code.trim().toUpperCase();
    if (!value) return;
    setBusy(true);
    setError('');
    setLoaded(null);
    try {
      const res = await fetchDraft(value);
      const layers = (res.draft.layers ?? []) as CanvasLayer[];
      onLoad(res.draft);
      setLoaded(layers.length);
    } catch (e) {
      // 404 và bản nháp hết hạn với người mua là một; nhưng lỗi mạng thì
      // không — hiện đúng thông điệp `api.ts` đã dựng thay vì gộp hết.
      setError(e instanceof Error ? e.message : STUDIO_API_ERROR.draftNotFound);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={STUDIO.card}>
        <label className={STUDIO.cardLabel}>{COPY.label}</label>
        <input
          className={`${STUDIO.select} uppercase tracking-[0.12em]`}
          placeholder={COPY.placeholder}
          maxLength={DESIGN_CODE_LENGTH}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void open();
          }}
        />
        <p className="m-0 mt-1.5 text-[11px] text-[var(--studio-muted)]">{COPY.hint}</p>

        <button
          type="button"
          className="mt-2 w-full rounded-lg bg-[var(--studio-accent)] px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-[var(--studio-accent-hover)] disabled:opacity-40"
          disabled={busy || !code.trim()}
          onClick={() => void open()}
        >
          {busy ? COPY.loading : COPY.open}
        </button>
      </div>

      {hasWork && (
        <p className="m-0 px-1 text-[12px] text-[var(--studio-warn)]">
          {COPY.replaceWarning}
        </p>
      )}
      {error && <p className="m-0 px-1 text-[12px] text-[var(--studio-danger)]">{error}</p>}
      {loaded != null && (
        <p className="m-0 px-1 text-[12px] text-[var(--studio-ok)]">
          {COPY.loaded(loaded)}
        </p>
      )}
    </div>
  );
}
