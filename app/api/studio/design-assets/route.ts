import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { like } from "@/lib/mongo";
import { DESIGN_ASSET_STATUS, STUDIO_QUERY_PARAM } from "@/lib/studio/constants";
import { readPaging, toDesignAssetDTO } from "@/lib/studio/server";
import type { DesignAssetListResponse } from "@/lib/studio/types";

// Tầng 2 của kho ảnh: lưới ảnh có lọc bộ sưu tập, tìm kiếm và phân trang (công khai).
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const { page, pageSize, skip } = readPaging(params);
  const collection = params.get(STUDIO_QUERY_PARAM.COLLECTION)?.trim();
  const q = params.get(STUDIO_QUERY_PARAM.SEARCH)?.trim();

  // Trang khách chỉ thấy ảnh đã đăng — ảnh nháp là ảnh chưa duyệt để in.
  const where: Prisma.DesignAssetWhereInput = { status: DESIGN_ASSET_STATUS.PUBLISHED };
  if (collection) where.collectionId = collection;
  if (q) {
    // like() escape regex + bật insensitive: thiếu escape thì khách gõ "(" là 500,
    // thiếu mode thì ô tìm kiếm im lặng trả 0 kết quả.
    where.OR = [{ title: like(q) }, { code: like(q) }];
  }

  const [items, total] = await Promise.all([
    db.designAsset.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
    db.designAsset.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map(toDesignAssetDTO),
    total,
    page,
    pageSize,
  } satisfies DesignAssetListResponse);
}
