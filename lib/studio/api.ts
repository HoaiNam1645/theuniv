/**
 * Design studio — lớp gọi mạng duy nhất của client.
 *
 * Khác bản gốc ở loc-store: theuniv không có API server riêng và không có
 * bearer token. Auth admin là JWT trong cookie httpOnly `theuniv_session`, nên
 * fetch CÙNG ORIGIN tự mang cookie đi — không đọc, không gắn token thủ công.
 *
 * Mọi path lấy từ `STUDIO_API`; mọi shape lấy từ `./types`. Không gõ string
 * endpoint hay khai lại interface ở call site.
 *
 * Lỗi được bọc thành `StudioApiError` và ném ra — component ở trên hiển thị
 * loading / empty / error tường minh. Không catch-rồi-nuốt ở đây: nuốt lỗi
 * mạng làm giao diện trông như đang trống dữ liệu thay vì đang hỏng.
 */

import {
  MEDIA_KIND,
  STUDIO_API,
  STUDIO_FIRST_PAGE,
  STUDIO_QUERY_PARAM,
  UPLOAD_FIELD,
  type MediaKind,
} from './constants';
import type {
  CompositeBody,
  CompositeResponse,
  CreateDraftBody,
  CreateDraftResponse,
  DesignAssetListResponse,
  DesignCollectionListResponse,
  DraftResponse,
  MockupSetListResponse,
  StudioOrderBody,
  StudioOrderResponse,
  UploadResponse,
} from './types';

/** Câu chữ báo lỗi — gom một chỗ để mọi panel nói cùng giọng. */
export const STUDIO_API_ERROR = {
  network: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
  unauthorized: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.',
  mockupSets: 'Không tải được bộ mockup',
  collections: 'Không tải được kho design',
  assets: 'Không tải được danh sách mẫu',
  draftNotFound: 'Không tìm thấy mã này. Bản nháp có thể đã hết hạn.',
  draftSave: 'Không lưu được bản nháp',
  composite: 'Không ghép được ảnh theo màu',
  order: 'Không gửi được đơn. Thử lại hoặc nhắn Zalo trực tiếp.',
  upload: 'Tải ảnh lên thất bại',
} as const;

const HTTP_UNAUTHORIZED = 401;

export class StudioApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'StudioApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Đọc thông điệp lỗi có ý nghĩa từ body — route handler trả `{ error }`, cùng
 * quy ước với `/api/admin/upload` sẵn có.
 */
function messageOf(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const value = (body as { error?: unknown }).error;
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

async function request<T>(
  path: string,
  fallbackMessage: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      // Cookie httpOnly `theuniv_session` đi kèm vì cùng origin.
      credentials: 'same-origin',
      // Studio luôn cần dữ liệu hiện tại; cache một trang kho ảnh cũ là bẫy.
      cache: 'no-store',
    });
  } catch (e) {
    // Fetch chỉ reject khi mạng hỏng — phân biệt với lỗi HTTP bên dưới.
    throw new StudioApiError(STUDIO_API_ERROR.network, 0, e);
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // Route trả HTML (thường là trang lỗi) — giữ nguyên để debug.
      body = text;
    }
  }

  if (!res.ok) {
    const fallback =
      res.status === HTTP_UNAUTHORIZED
        ? STUDIO_API_ERROR.unauthorized
        : fallbackMessage;
    throw new StudioApiError(messageOf(body, fallback), res.status, body);
  }

  return body as T;
}

function postJson<T>(
  path: string,
  fallbackMessage: string,
  payload: unknown,
): Promise<T> {
  return request<T>(path, fallbackMessage, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // JSON.stringify bỏ key `undefined`; muốn xoá một field phải gửi `null`.
    body: JSON.stringify(payload),
  });
}

/**
 * Đường dẫn ảnh đã lưu → URL trình duyệt tải được.
 *
 * theuniv phục vụ ảnh cùng origin (`/uploads/...`) nên không cần ghép origin
 * như bản loc-store. Hàm vẫn tồn tại vì nó là chỗ duy nhất biết quy ước đó, và
 * vì `data:` / `blob:` (áo vẽ tạm inline) phải đi qua nguyên vẹn — ghép tiền tố
 * vào một data URI hợp lệ sẽ biến nó thành 404.
 */
export function mediaUrl(url: string): string {
  if (!url) return url;
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('/')
  ) {
    return url;
  }
  return `/${url}`;
}

/* ------------------------------------------------------------------ *
 * Bộ mockup
 * ------------------------------------------------------------------ */

export function fetchMockupSets(): Promise<MockupSetListResponse> {
  return request<MockupSetListResponse>(
    STUDIO_API.MOCKUP_SETS,
    STUDIO_API_ERROR.mockupSets,
  );
}

/* ------------------------------------------------------------------ *
 * Kho design
 * ------------------------------------------------------------------ */

export function fetchDesignCollections(): Promise<DesignCollectionListResponse> {
  return request<DesignCollectionListResponse>(
    STUDIO_API.DESIGN_COLLECTIONS,
    STUDIO_API_ERROR.collections,
  );
}

export function fetchDesignAssets(params: {
  collection?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<DesignAssetListResponse> {
  const qs = new URLSearchParams();
  qs.set(
    STUDIO_QUERY_PARAM.PAGE,
    String(params.page ?? STUDIO_FIRST_PAGE),
  );
  if (params.pageSize != null) {
    qs.set(STUDIO_QUERY_PARAM.PAGE_SIZE, String(params.pageSize));
  }
  if (params.collection) {
    qs.set(STUDIO_QUERY_PARAM.COLLECTION, params.collection);
  }
  if (params.search?.trim()) {
    qs.set(STUDIO_QUERY_PARAM.SEARCH, params.search.trim());
  }
  return request<DesignAssetListResponse>(
    `${STUDIO_API.DESIGN_ASSETS}?${qs.toString()}`,
    STUDIO_API_ERROR.assets,
  );
}

/* ------------------------------------------------------------------ *
 * Bản nháp
 * ------------------------------------------------------------------ */

export function fetchDraft(code: string): Promise<DraftResponse> {
  return request<DraftResponse>(
    `${STUDIO_API.DRAFTS}/${encodeURIComponent(code)}`,
    STUDIO_API_ERROR.draftNotFound,
  );
}

export function createDraft(
  body: CreateDraftBody,
): Promise<CreateDraftResponse> {
  return postJson<CreateDraftResponse>(
    STUDIO_API.DRAFTS,
    STUDIO_API_ERROR.draftSave,
    body,
  );
}

/* ------------------------------------------------------------------ *
 * Ghép ảnh per-màu (admin) + đặt hàng (public)
 * ------------------------------------------------------------------ */

export function compositeMockups(
  body: CompositeBody,
): Promise<CompositeResponse> {
  return postJson<CompositeResponse>(
    STUDIO_API.COMPOSITE,
    STUDIO_API_ERROR.composite,
    body,
  );
}

export function createStudioOrder(
  body: StudioOrderBody,
): Promise<StudioOrderResponse> {
  return postJson<StudioOrderResponse>(
    STUDIO_API.ORDER,
    STUDIO_API_ERROR.order,
    body,
  );
}

/* ------------------------------------------------------------------ *
 * Upload
 * ------------------------------------------------------------------ */

/**
 * Ảnh do khách tự tải lên đi đường công khai; ảnh do studio xuất ra đi đường
 * admin (hạn mức rộng hơn, có session).
 *
 * Chọn endpoint theo `kind` chứ không thêm cờ `isAdmin`: `kind` đã mô tả đúng
 * sự thật cần dựa vào, còn một cờ nữa là thứ nơi gọi có thể quên hoặc đặt sai.
 */
const uploadEndpointFor = (kind: MediaKind) =>
  kind === MEDIA_KIND.UPLOAD ? STUDIO_API.UPLOAD_PUBLIC : STUDIO_API.UPLOAD_ADMIN;

/**
 * Tải một ảnh lên và trả về path đã lưu.
 *
 * Endpoint trả `{ ok, url }` chứ không phải bản ghi media. Đường admin đòi
 * session — gọi từ trang khách sẽ nhận 401, khi đó `STUDIO_API_ERROR.unauthorized`
 * là đúng thứ cần hiện chứ không phải nuốt đi.
 */
export async function uploadStudioImage(
  file: File,
  kind: MediaKind = MEDIA_KIND.UPLOAD,
): Promise<string> {
  const fd = new FormData();
  fd.append(UPLOAD_FIELD.FILE, file);
  // Route hiện chưa đọc `kind`, nhưng gửi kèm giữ được ngữ nghĩa "ảnh người
  // mua tải lên" vs "ảnh studio xuất ra" cho lúc bảng Media có thêm cột.
  fd.append(UPLOAD_FIELD.KIND, kind);

  const res = await request<UploadResponse>(
    uploadEndpointFor(kind),
    STUDIO_API_ERROR.upload,
    { method: 'POST', body: fd },
  );
  if (!res.ok || !res.url) {
    throw new StudioApiError(
      res.error || STUDIO_API_ERROR.upload,
      0,
      res,
    );
  }
  return res.url;
}

/** Data URL (canvas xuất ra) → `File`, để đi chung một đường upload. */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, b64] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(meta)?.[1] ?? 'image/png';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}
