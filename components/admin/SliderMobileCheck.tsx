"use client";

import { useEffect, useState } from "react";

/**
 * Cảnh báo khi ảnh hiển thị trên điện thoại của một slide không đúng dạng.
 *
 * Slider trang chủ được dựng cho ảnh **dọc** ở khổ điện thoại (6/9 slide đang
 * dùng ảnh tỷ lệ ~0.55). Slide nào bỏ trống ô "Ảnh mobile" sẽ rơi về ảnh
 * desktop — một tấm banner ngang tỷ lệ ~2.3, cao chỉ 185px trên màn 428px.
 * Trang không còn để lại vùng đen như trước (slider đã tự co theo từng slide),
 * nhưng slide đó vẫn *trông lạc lõng* giữa những slide cao gấp bốn lần.
 *
 * Không có cách nào biết tỷ lệ ảnh từ phía máy chủ vì URL có thể trỏ ra CDN
 * ngoài; cách chắc chắn là để trình duyệt tải ảnh rồi đọc kích thước thật. Đây
 * là thứ chỉ để cảnh báo, không chặn lưu — nên tải ngầm là đủ.
 */

/** Dưới ngưỡng này coi là ảnh dọc/vuông, hợp với khổ điện thoại. */
const PORTRAIT_MAX_RATIO = 1;

type KetLuan = "hop-le" | "anh-ngang" | "khong-tai-duoc";

const NHAN: Record<"thieu" | "anh-ngang" | "khong-tai-duoc", string> = {
  thieu: "Chưa có ảnh mobile — trên điện thoại sẽ dùng banner ngang của desktop, thấp hơn hẳn các slide khác.",
  "anh-ngang": "Ảnh mobile đang là ảnh NGANG. Slider trên điện thoại dựng cho ảnh dọc — nên dùng ảnh khoảng 9:16.",
  "khong-tai-duoc": "Không tải được ảnh mobile để kiểm tra.",
};

export default function SliderMobileCheck({ src }: { src?: string | null }) {
  /**
   * Giữ kèm `src` đã đo, không chỉ mỗi kết luận: khi người dùng dán URL khác,
   * kết quả của ảnh cũ phải bị coi là hết hạn thay vì hiện nhầm cho ảnh mới.
   *
   * Trạng thái "chưa có ảnh" KHÔNG nằm ở đây mà tính thẳng lúc render — đặt nó
   * vào state thì phải gọi setState đồng bộ ngay trong effect, thứ sinh ra một
   * lượt render thừa và bị react-hooks/set-state-in-effect chặn, đúng lý.
   */
  const [daDo, setDaDo] = useState<{ src: string; ketLuan: KetLuan } | null>(null);

  useEffect(() => {
    if (!src) return;
    let huy = false;
    const img = new Image();
    img.onload = () => {
      if (huy) return;
      const ngang = img.naturalWidth / img.naturalHeight > PORTRAIT_MAX_RATIO;
      setDaDo({ src, ketLuan: ngang ? "anh-ngang" : "hop-le" });
    };
    img.onerror = () => {
      if (!huy) setDaDo({ src, ketLuan: "khong-tai-duoc" });
    };
    img.src = src;
    return () => {
      huy = true;
    };
  }, [src]);

  const canhBao = !src
    ? "thieu"
    : daDo?.src === src && daDo.ketLuan !== "hop-le"
      ? daDo.ketLuan
      : null;

  if (!canhBao) return null;

  return (
    <p className="slider-warn" title={NHAN[canhBao]}>
      <span aria-hidden>!</span>
      {NHAN[canhBao]}
    </p>
  );
}
