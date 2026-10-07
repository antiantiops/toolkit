import fs from "fs";
import path from "path";
import os from "os";

const UPLOAD_DIR = path.join(os.tmpdir(), "vocab_uploads");

export function getUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  return UPLOAD_DIR;
}

export function getUploadedFile(id) {
  if (!id || typeof id !== "string") return null;
  const clean = path.basename(id);
  const p = path.join(getUploadDir(), clean);
  if (!fs.existsSync(p)) return null;
  const ext = path.extname(clean).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return {
    buffer: fs.readFileSync(p),
    mime,
    path: p,
  };
}

export function deleteUploadedFile(id) {
  if (!id || typeof id !== "string") return;
  const clean = path.basename(id);
  const p = path.join(getUploadDir(), clean);
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
    } catch {}
  }
}
