import fs from "fs";
import path from "path";
import os from "os";

const CACHE_DIR = process.env.CACHE_DIR || path.join(os.tmpdir(), "vocab_cache");
const TTL_MS = 24 * 60 * 60 * 1000; // 1 day

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getFilePath(sid) {
  const clean = String(sid).replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(CACHE_DIR, `${clean}.json`);
}

export function saveSession(sid, data) {
  if (!sid) return;
  ensureDir();
  const file = getFilePath(sid);
  // ponytail: local disk JSON cache. Upgrade to Redis when multi-instance horizontal scale.
  fs.writeFileSync(file, JSON.stringify({ savedAt: Date.now(), data }), "utf8");
}

export function loadSession(sid) {
  if (!sid) return null;
  const file = getFilePath(sid);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Date.now() - raw.savedAt > TTL_MS) {
      fs.unlinkSync(file);
      return null;
    }
    return raw.data;
  } catch {
    return null;
  }
}

export function deleteSession(sid) {
  if (!sid) return;
  const file = getFilePath(sid);
  if (fs.existsSync(file)) {
    try { fs.unlinkSync(file); } catch {}
  }
}
