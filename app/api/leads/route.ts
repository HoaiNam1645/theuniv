import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Form tư vấn ngoài web gửi về đây (public)
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  if (!name || !phone) {
    return NextResponse.json(
      { ok: false, error: "Vui lòng nhập họ tên và số điện thoại" },
      { status: 422 }
    );
  }
  if (!/^[0-9+ .()-]{8,20}$/.test(phone)) {
    return NextResponse.json(
      { ok: false, error: "Số điện thoại không hợp lệ" },
      { status: 422 }
    );
  }

  const lead = await db.lead.create({
    data: {
      name: name.slice(0, 255),
      phone: phone.slice(0, 20),
      email: body.email ? String(body.email).slice(0, 255) : null,
      unit: body.unit ? String(body.unit).slice(0, 255) : null,
      product: body.product ? String(body.product).slice(0, 255) : null,
      message: body.message ? String(body.message).slice(0, 2000) : null,
      sourceUrl: body.sourceUrl ? String(body.sourceUrl).slice(0, 500) : null,
    },
  });

  return NextResponse.json({ ok: true, id: lead.id });
}
