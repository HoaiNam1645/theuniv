/**
 * Design studio — SSOT cho mọi shape đi qua ranh giới API.
 *
 * Route handler (`app/api/studio/*`), client (`components/studio/*`) và trang
 * admin/khách import CHUNG file này. Không khai báo lại interface nào ở đây
 * sang phía kia: một bên đổi field mà bên kia không biết là lỗi chỉ lộ ra lúc
 * chạy thật.
 *
 * Enum và kiểu suy ra từ enum nằm ở `./constants`.
 */

import type {
  DesignAssetStatus,
  DesignBlendMode,
  DesignFrame,
  DesignPhotoFilter,
  DesignWarpMode,
} from './constants';

/* ------------------------------------------------------------------ *
 * Hình học vùng in
 * ------------------------------------------------------------------ */

/**
 * Vùng in trên áo.
 * - anchor `topleft`: x,y = góc trên-trái theo phân số của ảnh áo; w,h = kích thước.
 * - anchor `center`: x,y = tâm; w = phân số bề ngang; h bỏ trống thì suy ra từ
 *   tỉ lệ artwork.
 */
export interface PrintArea {
  x: number;
  y: number;
  w: number;
  h?: number;
  anchor?: 'topleft' | 'center';
}

/** Một mặt áo thiết kế được (trước / sau), mỗi mặt có ảnh và vùng in riêng. */
export interface DesignSurface {
  id: string;
  label: string;
  /** Tên màu → URL ảnh áo trơn của mặt này. */
  mockupsByColor: Record<string, string>;
  printArea?: PrintArea;
}

/* ------------------------------------------------------------------ *
 * Layer
 * ------------------------------------------------------------------ */

/** Một điểm 2D trong không gian toạ độ của warp engine. */
export interface WarpCoord {
  x: number;
  y: number;
}

/**
 * State `warpvas` đã serialize cho một layer — đúng payload `getWarpState()`
 * trả về, mà `setWarpState(splitPoints, regionBounds)` khôi phục lại y hệt
 * từng pixel.
 *
 * `regionBounds` giữ mô tả biên bezier của engine; với chúng ta nó là hộp đen,
 * phải round-trip nguyên vẹn chứ không dựng lại.
 */
export interface LayerWarp {
  mode: DesignWarpMode;
  rows: number;
  columns: number;
  /**
   * Vị trí chia đã chuẩn hoá (0–1) — danh sách phẳng `WarpState.splitPoints`
   * của engine, mỗi entry ứng với gốc một ô lưới. KHÔNG phải lưới lồng nhau.
   */
  splitPoints: WarpCoord[];
  /**
   * Điểm điều khiển bezier từng ô, tính bằng pixel ẢNH GỐC, hình dạng
   * `[row][col] = { top, right, bottom, left }`, bốn toạ độ mỗi cạnh.
   * `left`/`right` chạy trên→dưới, nên bốn góc ngoài của lưới là
   * `[0][0].left[0]`, `[0][cols-1].right[0]`, `[rows-1][0].left[3]` và
   * `[rows-1][cols-1].right[3]`.
   */
  regionBounds?: unknown;
}

/**
 * Chỉnh diện mạo không phá huỷ cho layer ảnh. Cả bốn slider đều là phân số
 * trong -1..1 để shape không đổi nếu biên của UI đổi.
 */
export interface ImageAdjust {
  filter: DesignPhotoFilter;
  blend: DesignBlendMode;
  frame: DesignFrame;
  brightness: number;
  contrast: number;
  saturation: number;
}

export const IDENTITY_IMAGE_ADJUST: ImageAdjust = {
  filter: 'none',
  blend: 'normal',
  frame: 'none',
  brightness: 0,
  contrast: 0,
  saturation: 0,
};

export interface CanvasLayer {
  id: string;
  type: 'text' | 'image' | 'static';
  fieldKey?: string;
  defaultText?: string;
  /** Ảnh nguồn cho layer image/static. */
  src?: string;
  fontFamily?: string;
  fontUrl?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fill?: string;
  stroke?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  textAlign?: 'left' | 'center' | 'right';
  path?: 'straight' | 'arc' | 'custom';
  arc?: { radius: number; startAngle: number; endAngle: number };
  zIndex: number;
  editableByBuyer?: boolean;
  uppercase?: boolean;

  /** 0–1. Bỏ trống nghĩa là đục hoàn toàn. */
  opacity?: number;
  flipX?: boolean;
  flipY?: boolean;
  /** Shear tính bằng độ. */
  skewX?: number;
  skewY?: number;
  warp?: LayerWarp;
  /** Trạng thái filter / blend / khung / slider, không phá huỷ. */
  adjust?: ImageAdjust;
  /** Panel lớp: layer đã khoá vẫn render nhưng không chọn được. */
  locked?: boolean;
  /**
   * `DesignAsset.code` mà layer này lấy từ đó — mã in xưởng tra khi người mua
   * gửi thiết kế qua Zalo. Không có với ảnh người mua tự tải lên.
   */
  assetCode?: string;
  /**
   * Layer này nằm ở mặt áo nào (`DesignSurface.id` — trước/sau).
   *
   * LAYER sở hữu field này chứ không phải studio: mặt trước và mặt sau là hai
   * artwork riêng đi vào hai file in riêng, nên "thuộc mặt nào" phải sống sót
   * qua việc lưu bản nháp rồi mở lại. Bỏ trống nghĩa là mặt đầu tiên.
   */
  surfaceId?: string;
}

/* ------------------------------------------------------------------ *
 * DTO — đúng shape các endpoint ở STUDIO_API trả về / nhận vào
 * ------------------------------------------------------------------ */

/** Một màu của bộ mockup: tên, hex swatch và ảnh áo trơn mỗi mặt. */
export interface MockupSetColorDTO {
  name: string;
  hex: string;
  /** Ảnh mặt trước — bắt buộc, một màu không có ảnh thì không dùng được. */
  front: string;
  back?: string;
}

/** `GET /api/studio/mockup-sets` → `{ sets: MockupSetDTO[] }`. */
export interface MockupSetDTO {
  id: string;
  name: string;
  colors: MockupSetColorDTO[];
  printArea?: PrintArea;
}

export interface MockupSetListResponse {
  sets: MockupSetDTO[];
}

/**
 * Một artwork sẵn sàng in trong kho design. `code` là mã in người mua gửi qua
 * Zalo — xưởng tra file bằng nó, nên nó thuộc shape công khai chứ không phải
 * id nội bộ.
 */
export interface DesignAssetDTO {
  id: string;
  title: string;
  code: string;
  url: string;
  /** Ảnh nhỏ cho lưới sidebar; không có thì dùng `url`. */
  thumbUrl: string;
  collectionId: string;
  collectionName: string;
  tags: string[];
  /** Admin lọc nháp/đã đăng; storefront chỉ nhận `published`. */
  status: DesignAssetStatus;
  sortOrder: number;
  /** Kích thước gốc, dùng để đặt layer đúng tỉ lệ khi kéo vào canvas. */
  widthPx?: number;
  heightPx?: number;
  createdAt: string;
}

/** Tầng 1 của sidebar: thẻ bộ sưu tập kèm mosaic ảnh bìa và số lượng. */
export interface DesignCollectionDTO {
  id: string;
  name: string;
  count: number;
  /** Tối đa `DESIGN_COLLECTION_COVER_COUNT` thumbnail cho thẻ. */
  coverUrls: string[];
}

export interface DesignCollectionListResponse {
  collections: DesignCollectionDTO[];
}

/** `GET /api/studio/design-assets` — phân trang đánh số từ `STUDIO_FIRST_PAGE`. */
export interface DesignAssetListResponse {
  items: DesignAssetDTO[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Một phiên studio đã lưu. Vừa là "bản nháp" của người mua, vừa là bản ghi
 * đứng sau mã thiết kế gửi qua Zalo — không có nó thì mã tra ra số không và
 * xưởng không lấy được artwork.
 */
export interface DesignDraftDTO {
  code: string;
  layers: CanvasLayer[];
  mockupSetId?: string;
  /** Tên màu áo lúc thiết kế — mở lại phải đúng màu người mua đã duyệt. */
  colorName?: string;
  surfaceId?: string;
  /** Ảnh mockup đã ghép phẳng (thứ người mua đem đi chia sẻ). */
  previewUrl?: string;
  /** Ảnh chỉ có artwork, ở độ phân giải in (thứ xưởng đem đi in). */
  printUrl?: string;
  /** Mã in của mọi asset trong kho đã dùng — pick list của xưởng. */
  assetCodes: string[];
  note?: string;
  createdAt: string;
  expiresAt?: string;
}

/** `POST /api/studio/drafts`. */
export interface CreateDraftBody {
  layers: CanvasLayer[];
  mockupSetId: string;
  colorName: string;
  surfaceId: string;
  /** PNG nền trong ở độ phân giải in, dạng data URL. */
  printDataUrl: string;
  /** Ảnh mockup đã ghép phẳng, dạng data URL. */
  previewDataUrl: string;
  note?: string;
}

export interface CreateDraftResponse {
  code: string;
  previewUrl: string;
  printUrl: string;
}

/** `GET /api/studio/drafts/[code]`. */
export interface DraftResponse {
  draft: DesignDraftDTO;
}

/** `POST /api/studio/composite` (admin) — ghép ảnh in lên từng màu bằng `sharp`. */
export interface CompositeBody {
  mockupSetId: string;
  printDataUrl: string;
  printArea: PrintArea;
  /** Bỏ trống = ghép mọi màu của bộ. */
  colorNames?: string[];
}

export interface CompositeImageDTO {
  colorName: string;
  hex: string;
  url: string;
}

export interface CompositeResponse {
  images: CompositeImageDTO[];
}

/** `POST /api/studio/order` (public) — tạo `Lead` để đơn rơi vào /admin/leads. */
export interface StudioOrderBody {
  draftCode: string;
  name: string;
  phone: string;
  /** Trường/lớp/công ty đặt áo. */
  unit?: string;
  quantity?: number;
  message?: string;
}

export interface StudioOrderResponse {
  ok: true;
  leadId: string;
}

/** `POST /api/admin/upload` — endpoint sẵn có của theuniv. */
export interface UploadResponse {
  ok: boolean;
  url?: string;
  error?: string;
}
