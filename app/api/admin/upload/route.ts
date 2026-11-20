import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, UPLOAD_FIELD } from "@/lib/studio/constants";
import { UPLOAD_ERROR, UploadError, saveImageBuffer } from "@/lib/uploads";

// Ảnh upload: dev -> ./public/uploads ; prod -> UPLOAD_DIR (/var/www/theuniv/uploads, nginx serve).
// Việc ghi file + tạo bản ghi Media nằm ở lib/uploads.ts vì studio cũng cần đúng logic đó
// nhưng nhận data URL thay vì multipart.

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  }

  const fd = await req.formData();
  const file = fd.get(UPLOAD_FIELD.FILE);
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: UPLOAD_ERROR.MISSING_FILE }, { status: 422 });
  }

  try {
    const { url } = await saveImageBuffer({
      buffer: Buffer.from(await file.arrayBuffer()),
      mime: file.type,
      baseName: file.name.replace(/\.[^.]+$/, ""),
      maxBytes: MAX_UPLOAD_BYTES,
    });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    if (e instanceof UploadError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    throw e;
  }
}
