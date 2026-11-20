// Video TikTok nhúng ở trang chủ (khối "Giới thiệu xưởng + video").
//
// Admin dán link nào cũng được: link đầy đủ (…/video/<id>), link rút gọn của app
// (vt.tiktok.com/…, vm.tiktok.com/…) hoặc chỉ ID. Player chính thức của TikTok cần ID
// số, nên link rút gọn được mở một lần để đọc địa chỉ chuyển hướng.

const VIDEO_ID_RE = /\/video\/(\d{8,})/;
const BARE_ID_RE = /^(\d{8,})$/;
const SHORT_LINK_RE = /^https:\/\/(vt|vm)\.tiktok\.com\/[\w-]+\/?$/;

/** ID video từ link TikTok; không nhận ra được thì null (khối chỉ hiện link, không có player). */
export async function tiktokVideoId(link: string): Promise<string | null> {
  const url = link.trim();
  const direct = url.match(VIDEO_ID_RE) || url.match(BARE_ID_RE);
  if (direct) return direct[1];
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
    return res.headers.get("location")?.match(VIDEO_ID_RE)?.[1] ?? null;
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
