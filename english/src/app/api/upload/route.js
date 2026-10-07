import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { deleteUploadedFile } from "./storage";

const UPLOAD_DIR = path.join(os.tmpdir(), "vocab_uploads");
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

function ensureDirAndCleanup() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    return;
  }
  try {
    const now = Date.now();
    const files = fs.readdirSync(UPLOAD_DIR);
    for (const f of files) {
      const p = path.join(UPLOAD_DIR, f);
      const stat = fs.statSync(p);
      if (now - stat.mtimeMs > MAX_AGE_MS) {
        fs.unlinkSync(p);
      }
    }
  } catch {}
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") || formData.get("image");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Không tìm thấy file ảnh" }, { status: 400 });
    }

    ensureDirAndCleanup();
    const rawExt = path.extname(file.name || "") || ".jpg";
    const ext = rawExt.toLowerCase().startsWith(".") ? rawExt.toLowerCase() : `.${rawExt.toLowerCase()}`;
    const id = `${crypto.randomUUID()}${ext}`;
    const dest = path.join(UPLOAD_DIR, id);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(dest, buffer);

    return NextResponse.json({
      ok: true,
      id,
      size: buffer.length,
      name: file.name,
      type: file.type || "image/jpeg",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) {
      deleteUploadedFile(id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
