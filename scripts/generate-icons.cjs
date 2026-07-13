// Generate PNG icons for SoundAura — Cyan theme
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

function createPNG(size) {
  const w = size, h = size;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  const cx = w / 2, cy = h / 2;
  const grad = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const innerR = w * 0.38;

      if (dist <= innerR) {
        // Cyan: 0, 212, 232
        grad[idx] = 0; grad[idx + 1] = 212; grad[idx + 2] = 232; grad[idx + 3] = 255;
      } else if (dist <= w * 0.5) {
        const fadeT = Math.min(1, (dist - innerR) / (w * 0.12));
        grad[idx] = Math.round(0 * (1 - fadeT));
        grad[idx + 1] = Math.round(212 * (1 - fadeT) + 7 * fadeT);
        grad[idx + 2] = Math.round(232 * (1 - fadeT) + 20 * fadeT);
        grad[idx + 3] = 255;
      } else {
        grad[idx] = 0; grad[idx + 1] = 0; grad[idx + 2] = 0; grad[idx + 3] = 0;
      }
    }
  }

  for (let y = 0; y < h; y++) {
    const rowOff = y * (w * 4 + 1);
    raw[rowOff] = 0;
    for (let x = 0; x < w; x++) {
      const srcOff = (y * w + x) * 4;
      const dstOff = rowOff + 1 + x * 4;
      raw[dstOff] = grad[srcOff]; raw[dstOff + 1] = grad[srcOff + 1];
      raw[dstOff + 2] = grad[srcOff + 2]; raw[dstOff + 3] = grad[srcOff + 3];
    }
  }

  const compressed = zlib.deflateSync(raw);
  return buildPNG(w, h, compressed);
}

function buildPNG(w, h, idatData) {
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const toBytes = (v, n = 4) => {
    const b = Buffer.alloc(n);
    for (let i = n - 1; i >= 0; i--) { b[i] = v & 0xff; v >>>= 8; }
    return b;
  };
  const mkChunk = (type, data) => {
    const len = toBytes(data.length);
    const hdr = Buffer.from(type);
    const body = Buffer.concat([hdr, data]);
    const crc = toBytes(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.concat([toBytes(w), toBytes(h), Buffer.from([8, 6, 0, 0, 0])]);
  const chunks = [mkChunk('IHDR', ihdr), mkChunk('IDAT', idatData), mkChunk('IEND', Buffer.alloc(0))];
  return Buffer.concat([signature, ...chunks]);
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

SIZES.forEach(s => {
  const png = createPNG(s);
  fs.writeFileSync(path.join(outDir, `icon-${s}.png`), png);
  console.log(`icon-${s}.png (${(png.length / 1024).toFixed(1)} KB)`);
});

[192, 512].forEach(s => {
  const w = s, h = s;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  const cx = w / 2, cy = h / 2;
  const grad = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const innerR = w * 0.30, outerR = w * 0.45;
      if (dist <= outerR) {
        if (dist <= innerR) {
          grad[idx] = 0; grad[idx + 1] = 212; grad[idx + 2] = 232; grad[idx + 3] = 255;
        } else {
          const fadeT = Math.min(1, (dist - innerR) / (w * 0.15));
          grad[idx] = 0;
          grad[idx + 1] = Math.round(212 * (1 - fadeT));
          grad[idx + 2] = Math.round(232 * (1 - fadeT));
          grad[idx + 3] = 255;
        }
      } else {
        grad[idx] = 0; grad[idx + 1] = 0; grad[idx + 2] = 0; grad[idx + 3] = 0;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    const rowOff = y * (w * 4 + 1);
    raw[rowOff] = 0;
    for (let x = 0; x < w; x++) {
      const srcOff = (y * w + x) * 4;
      const dstOff = rowOff + 1 + x * 4;
      raw[dstOff] = grad[srcOff]; raw[dstOff + 1] = grad[srcOff + 1];
      raw[dstOff + 2] = grad[srcOff + 2]; raw[dstOff + 3] = grad[srcOff + 3];
    }
  }
  const compressed = zlib.deflateSync(raw);
  const png = buildPNG(w, h, compressed);
  fs.writeFileSync(path.join(outDir, `icon-maskable-${s}.png`), png);
  console.log(`icon-maskable-${s}.png (${(png.length / 1024).toFixed(1)} KB)`);
});

console.log('Done!');
