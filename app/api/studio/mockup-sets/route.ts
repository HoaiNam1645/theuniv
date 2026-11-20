import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toMockupSetDTO } from "@/lib/studio/server";
import type { MockupSetListResponse } from "@/lib/studio/types";

// Bộ áo trơn theo màu (công khai — trang thiết kế của khách cần trước cả khi đăng nhập).
export async function GET() {
  const sets = await db.mockupSet.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    sets: sets.map(toMockupSetDTO),
  } satisfies MockupSetListResponse);
}
