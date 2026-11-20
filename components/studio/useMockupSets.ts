'use client';

import { useCallback, useEffect, useState } from 'react';
import { STUDIO_API_ERROR, fetchMockupSets } from '@/lib/studio/api';
import { mockupSetsFromDTO, type MockupSet } from './mockupSets';

/**
 * Nạp thư viện bộ mockup cho studio.
 *
 * Tách khỏi `DesignStudio` để component vẫn thuần props: trang admin và trang
 * khách gọi hook này rồi truyền `library` xuống, nên có thể dựng studio với dữ
 * liệu tĩnh (test, preview) mà không đụng tới mạng.
 *
 * Trả về đủ ba trạng thái loading / error / dữ liệu. `sets` rỗng KHÔNG có
 * nghĩa là hỏng — studio vẫn chạy được với áo vẽ tạm — nên caller phải nhìn
 * `error` để phân biệt "chưa import bộ nào" với "không gọi được API".
 */
export interface MockupSetsState {
  sets: MockupSet[];
  loading: boolean;
  error: string;
  reload: () => void;
}

export function useMockupSets(): MockupSetsState {
  const [sets, setSets] = useState<MockupSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Đổi số này là cách bảo effect chạy lại mà không cần nhân bản logic fetch.
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMockupSets()
      .then((r) => {
        if (cancelled) return;
        setSets(mockupSetsFromDTO(r.sets ?? []));
        setError('');
      })
      .catch((e) => {
        if (cancelled) return;
        setSets([]);
        setError(e instanceof Error ? e.message : STUDIO_API_ERROR.mockupSets);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { sets, loading, error, reload };
}
