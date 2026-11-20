import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseLeadInput } from "@/lib/leads";

// Form tư vấn ngoài web gửi về đây (public). Luật hợp lệ nằm ở lib/leads.ts vì
// /api/studio/order cũng tạo Lead và phải theo đúng luật đó.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const parsed = parseLeadInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 422 });
  }

  const lead = await db.lead.create({ data: parsed.data });
  return NextResponse.json({ ok: true, id: lead.id });
}
