// Video TikTok nhúng ở trang chủ (khối "Giới thiệu xưởng + video").
//
// Admin dán link nào cũng được: link đầy đủ (…/video/<id>), link rút gọn của app
// (vt.tiktok.com/…, vm.tiktok.com/…) hoặc chỉ ID. Player chính thức của TikTok cần ID
// số, nên link rút gọn được mở một lần để đọc địa chỉ chuyển hướng.

const VIDEO_ID_RE = /\/video\/(\d{8,})/;
const BARE_ID_RE = /^(\d{8,})$/;
const SHORT_LINK_RE = /^https:\/\/(vt|vm)\.tiktok\.com\/[\w-]+\/?$/;
const HANDLE_RE = /\/@([\w.]+)/;

export type TiktokVideo = {
  id: string;
  /** Tên kênh (không có @) đọc từ link; link chỉ có ID thì null. */
  handle: string | null;
};

const fromFullLink = (url: string): TiktokVideo | null => {
  const id = url.match(VIDEO_ID_RE)?.[1];
  return id ? { id, handle: url.match(HANDLE_RE)?.[1] ?? null } : null;
};

/** Video từ link TikTok; không nhận ra được thì null (khối chỉ hiện link, không có player). */
export async function tiktokVideo(link: string): Promise<TiktokVideo | null> {
  const url = link.trim();
  const full = fromFullLink(url);
  if (full) return full;
  const bare = url.match(BARE_ID_RE);
  if (bare) return { id: bare[1], handle: null };
  if (!SHORT_LINK_RE.test(url)) return null;
  try {
    // Link rút gọn trả 301 tới link đầy đủ. Kết quả cache 1 ngày (fetch cache của Next):
    // trang chủ ISR 60s không phải hỏi TikTok mỗi lần dựng lại.
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": "Mozilla/5.0" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(4000),
    });
    return fromFullLink(res.headers.get("location") || "");
  } catch {
    return null;
  }
}

/**
 * Player nhúng chính thức: bấm là phát ngay trên trang, có tua, âm lượng, toàn màn hình.
 * Tắt phần nhạc nền, mô tả, video gợi ý — chỉ giữ video.
 */
export function tiktokPlayerUrl(id: string) {
  const params = new URLSearchParams({
    music_info: "0",
    description: "0",
    rel: "0",
    native_context_menu: "0",
    closed_caption: "0",
  });
  return `https://www.tiktok.com/player/v1/${id}?${params}`;
}
