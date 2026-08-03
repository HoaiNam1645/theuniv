import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Ảnh upload: dev -> ./public/uploads ; prod -> UPLOAD_DIR (/var/www/theuniv/uploads, nginx serve)
const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const MAX_SIZE = 8 * 1024 * 1024;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "anh";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  }

  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Thiếu file" }, { status: 422 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      { ok: false, error: "Chỉ nhận ảnh JPG, PNG, WEBP, GIF" },
      { status: 422 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ ok: false, error: "Ảnh tối đa 8MB" }, { status: 422 });
  }

  const base = slugify(file.name.replace(/\.[^.]+$/, ""));
  const name = `${base}-${Date.now().toString(36)}${ext}`;
  const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  const url = `/uploads/${name}`;
  await db.media.create({ data: { path: url, size: file.size } });

  return NextResponse.json({ ok: true, url });
}
