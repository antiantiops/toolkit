import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { MAX_IMAGE_BYTES } from "../src/lib/ielts-speaking.mjs";

const src = fs.readFileSync(path.resolve("src/app/IeltsSpeaking.js"), "utf8");

// Extract pure helper block between COMPRESSION_STEPS and `export default function IeltsSpeaking`
const start = src.indexOf("const COMPRESSION_STEPS");
const end = src.indexOf("export default function IeltsSpeaking");
assert.ok(start !== -1 && end !== -1 && end > start, "Expected compression helper block in IeltsSpeaking.js");
const helperCode = src.slice(start, end);

// Verify key UX/API guards directly in component source
assert.match(src, /const \[preparingFile, setPreparingFile\] = useState\(false\);/);
assert.match(src, /if \(!file \|\| preparingFile \|\| analyzing\) return;/);
assert.match(src, /disabled=\{!file \|\| preparingFile \|\| analyzing \|\| guidingKey !== null\}/);
assert.match(src, /aria-busy=\{preparingFile \|\| analyzing\}/);
assert.match(src, /role="status"\s+aria-live="polite"/);
assert.match(src, /tự động nén nếu (?:>|&gt;) 4 MiB/);
assert.match(src, /createImageBitmap\(file,\s*\{\s*imageOrientation:\s*"from-image"\s*\}\)/);
assert.match(src, /filePrepAbortRef\.current\?\.abort\(\)/);

function runCompressionSuite({
  createImageBitmapImpl,
  ImageImpl,
  canvasWidth = 4000,
  canvasHeight = 3000,
  blobSizeFn,
  createElementOk = true,
}) {
  const events = [];
  const bitmapsClosed = [];
  const revokedUrls = [];

  class FakeFile {
    constructor(parts, name, opts = {}) {
      this.parts = parts;
      this.name = name;
      this.type = opts.type || "";
      this.lastModified = opts.lastModified || 0;
      this.size = parts.reduce((sum, p) => sum + (p?.size ?? p?.length ?? 0), 0);
    }
  }

  class FakeBlob {
    constructor(size, type = "image/jpeg") {
      this.size = size;
      this.type = type;
    }
  }

  const ctxStub = {
    _fillStyle: "",
    set fillStyle(v) {
      this._fillStyle = v;
      events.push(`fillStyle:${v}`);
    },
    get fillStyle() {
      return this._fillStyle;
    },
    fillRect(x, y, w, h) {
      events.push(`fillRect:${x},${y},${w},${h}`);
    },
    drawImage(_src, _x, _y, w, h) {
      events.push(`drawImage:${w}x${h}`);
    },
  };

  const canvasStub = {
    width: canvasWidth,
    height: canvasHeight,
    getContext(kind) {
      return kind === "2d" ? ctxStub : null;
    },
    toBlob(cb, mime, quality) {
      events.push(`toBlob:${mime}:${this.width}x${this.height}:${quality}`);
      const size = blobSizeFn({ width: this.width, height: this.height, quality, mime });
      setTimeout(() => cb(size == null ? null : new FakeBlob(size, mime)), 0);
    },
  };

  const sandbox = {
    MAX_IMAGE_BYTES,
    File: FakeFile,
    DOMException,
    URL: {
      createObjectURL: () => "blob:mock-url",
      revokeObjectURL: (u) => revokedUrls.push(u),
    },
    document: {
      createElement: (tag) => (tag === "canvas" && createElementOk ? canvasStub : null),
    },
    createImageBitmap: createImageBitmapImpl
      ? async (file, opts) => {
          const b = await createImageBitmapImpl(file, opts);
          const origClose = b.close;
          b.close = () => {
            bitmapsClosed.push(true);
            origClose?.();
          };
          return b;
        }
      : undefined,
    Image: ImageImpl,
    setTimeout,
  };

  vm.createContext(sandbox);
  vm.runInContext(
    `${helperCode}\nthis.__exports = { COMPRESSION_STEPS, compressedJpegName, decodeImageSource, compressOversizedImage };`,
    sandbox
  );

  return { ...sandbox.__exports, FakeFile, events, bitmapsClosed, revokedUrls, canvasStub };
}

// 1. Filename conversion
{
  const { compressedJpegName } = runCompressionSuite({});
  assert.equal(compressedJpegName("IMG_1234.PNG"), "IMG_1234.jpg");
  assert.equal(compressedJpegName("noext"), "noext.jpg");
  assert.equal(compressedJpegName(""), "speaking-prompt.jpg");
}

// 2. EXIF-respecting createImageBitmap + white background + progressive step down to <= 4 MiB
{
  let seenOpts = null;
  const env = runCompressionSuite({
    createImageBitmapImpl: async (_file, opts) => {
      seenOpts = opts;
      return { width: 4000, height: 3000 };
    },
    blobSizeFn: ({ width, quality }) => {
      if (width > 2048) return 5 * 1024 * 1024;
      if (quality > 0.7) return 4.5 * 1024 * 1024;
      return 2_100_000;
    },
  });

  const input = new env.FakeFile([{ length: 6 * 1024 * 1024 }], "camera-photo.png", {
    type: "image/png",
    lastModified: 1700000000000,
  });
  const out = await env.compressOversizedImage(input);
  assert.equal(seenOpts?.imageOrientation, "from-image");
  assert.equal(out.name, "camera-photo.jpg");
  assert.equal(out.type, "image/jpeg");
  assert.equal(out.lastModified, 1700000000000);
  assert.ok(out.size > 0 && out.size <= MAX_IMAGE_BYTES);
  assert.ok(env.events.includes("fillStyle:#ffffff"));
  assert.ok(env.events.some((e) => e.startsWith("fillRect:0,0,2048,1536")));
  assert.equal(env.bitmapsClosed.length, 1);
  assert.equal(env.canvasStub.width, 0);
  assert.equal(env.canvasStub.height, 0);
}

// 3. Fallback to Image() when createImageBitmap lacks options/fails, cleaning up objectURL
{
  class FakeImage {
    set src(_v) {
      setTimeout(() => {
        this.naturalWidth = 1600;
        this.naturalHeight = 1200;
        this.onload?.();
      }, 0);
    }
  }
  const env = runCompressionSuite({
    createImageBitmapImpl: async () => {
      throw new TypeError("Unsupported");
    },
    ImageImpl: FakeImage,
    blobSizeFn: () => 1_500_000,
  });
  const input = new env.FakeFile([{ length: 5 * 1024 * 1024 }], "fallback.webp", { type: "image/webp" });
  const out = await env.compressOversizedImage(input);
  assert.equal(out.name, "fallback.jpg");
  assert.equal(out.size, 1_500_000);
  assert.deepEqual(env.revokedUrls, ["blob:mock-url"]);
}

// 4. Exhausted compression throws clear Vietnamese actionable error
{
  const env = runCompressionSuite({
    createImageBitmapImpl: async () => ({ width: 5000, height: 4000 }),
    blobSizeFn: () => MAX_IMAGE_BYTES + 1024,
  });
  const input = new env.FakeFile([{ length: 12 * 1024 * 1024 }], "huge.jpg", { type: "image/jpeg" });
  await assert.rejects(
    () => env.compressOversizedImage(input),
    /Không thể nén ảnh xuống ≤ 4 MiB/
  );
  assert.equal(env.bitmapsClosed.length, 1);
}

// 5. AbortError stops in-flight compression cleanly
{
  const ac = new AbortController();
  const env = runCompressionSuite({
    createImageBitmapImpl: async () => ({ width: 3000, height: 2000 }),
    blobSizeFn: () => {
      ac.abort();
      return 5 * 1024 * 1024;
    },
  });
  const input = new env.FakeFile([{ length: 7 * 1024 * 1024 }], "abort.jpg", { type: "image/jpeg" });
  await assert.rejects(
    () => env.compressOversizedImage(input, ac.signal),
    (err) => err?.name === "AbortError"
  );
  assert.equal(env.bitmapsClosed.length, 1);
}

console.log("PASS: ielts-speaking-image-compression (5 cases)");
