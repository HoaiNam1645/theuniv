import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  DESIGN_ASSET_STATUS,
  DESIGN_COLLECTION_COVER_COUNT,
} from "@/lib/studio/constants";
import type {
  DesignCollectionDTO,
  DesignCollectionListResponse,
} from "@/lib/studio/types";

// Tầng 1 của kho ảnh: thẻ bộ sưu tập kèm số lượng và mosaic ảnh bìa (công khai).
//
// Đếm bằng groupBy rồi lấy ảnh bìa bằng một truy vấn nhỏ có `take` cho mỗi bộ, thay vì
// kéo cả kho về rồi gom trong RAM: số bộ sưu tập gần như đứng yên còn số ảnh thì không,
// nên chi phí phải bám theo số bộ. Mỗi truy vấn bìa đi đúng index
// [status, collection_id, sort_order, created_at].
export async function GET() {
  const where = { status: DESIGN_ASSET_STATUS.PUBLISHED };

  // Gom theo collectionId chứ không kèm collectionName: cùng một bộ mà tên hiển thị
  // lệch nhau vài bản ghi sẽ tách thành hai thẻ trùng id.
  const groups = await db.designAsset.groupBy({
    by: ["collectionId"],
    where,
    _count: { _all: true },
  });

  const collections: DesignCollectionDTO[] = await Promise.all(
    groups.map(async (g) => {
      const covers = await db.designAsset.findMany({
        where: { ...where, collectionId: g.collectionId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: DESIGN_COLLECTION_COVER_COUNT,
        select: { thumbUrl: true, collectionName: true },
      });
      return {
        id: g.collectionId,
        // Tên lấy từ ảnh đầu tiên của bộ; bộ rỗng không lọt vào groupBy nên luôn có.
        name: covers[0]?.collectionName ?? g.collectionId,
        count: g._count._all,
        coverUrls: covers.map((c) => c.thumbUrl),
      };
    }),
  );

  collections.sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return NextResponse.json({ collections } satisfies DesignCollectionListResponse);
}
