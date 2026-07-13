// Generate PNG icons for SoundAura PWA — matching new branding
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
      const normDist = dist / (w * 0.5);

      if (normDist <= 1.0) {
        // Dark background gradient: black → deep blue
        const tBg = y / h;
        const bgR = Math.round(10 * (1 - tBg) + 10 * tBg);
        const bgG = Math.round(10 * (1 - tBg) + 22 * tBg);
        const bgB = Math.round(26 * (1 - tBg) + 40 * tBg);

        // Inner circle: purple → blue gradient
        const innerR = w * 0.35;
        if (dist <= innerR) {
          // Purple (155,93,229) → Blue (58,134,255)
          const tGrad = x / w;
          const r = Math.round(155 + tGrad * (58 - 155));
          const g = Math.round(93 + tGrad * (134 - 93));
          const b = Math.round(229 + tGrad * (255 - 229));
          grad[idx] = r;
          grad[idx + 1] = g;
          grad[idx + 2] = b;
          grad[idx + 3] = 255;
        } else {
          // Fade to dark background
          const fadeT = Math.min(1, (dist - innerR) / (w * 0.15));
          const tGrad = x / w;
          const innerR2 = Math.round(155 + tGrad * (58 - 155));
          const innerG2 = Math.round(93 + tGrad * (134 - 93));
          const innerB2 = Math.round(229 + tGrad * (255 - 229));
          grad[idx] = Math.round(innerR2 * (1 - fadeT) + bgR * fadeT);
          grad[idx + 1] = Math.round(innerG2 * (1 - fadeT) + bgG * fadeT);
          grad[idx + 2] = Math.round(innerB2 * (1 - fadeT) + bgB * fadeT);
          grad[idx + 3] = 255;
        }
      } else {
        grad[idx] = 0;
        grad[idx + 1] = 0;
        grad[idx + 2] = 0;
        grad[idx + 3] = 0;
      }
    }
  }

  for (let y = 0; y < h; y++) {
    const rowOff = y * (w * 4 + 1);
    raw[rowOff] = 0;
    for (let x = 0; x < w; x++) {
      const srcOff = (y * w + x) * 4;
      const dstOff = rowOff + 1 + x * 4;
      raw[dstOff] = grad[srcOff];
      raw[dstOff + 1] = grad[srcOff + 1];
      raw[dstOff + 2] = grad[srcOff + 2];
      raw[dstOff + 3] = grad[srcOff + 3];
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
  const ihdr = Buffer.concat([
    toBytes(w), toBytes(h),
    Buffer.from([8, 6, 0, 0, 0]),
  ]);
  const chunks = [
    mkChunk('IHDR', ihdr),
    mkChunk('IDAT', idatData),
    mkChunk('IEND', Buffer.alloc(0)),
  ];

  return Buffer.concat([signature, ...chunks]);
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

SIZES.forEach(s => {
  const png = createPNG(s);
  fs.writeFileSync(path.join(outDir, `icon-${s}.png`), png);
  console.log(`Created icon-${s}.png (${(png.length / 1024).toFixed(1)} KB)`);
});

// Maskable versions (slightly smaller icon for safe zone)
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

      // Maskable: icon in center 80% safe zone
      const innerR = w * 0.28;
      const outerR = w * 0.45;

      if (dist <= outerR) {
        const tBg = y / h;
        const bgR = Math.round(10 * (1 - tBg) + 10 * tBg);
        const bgG = Math.round(10 * (1 - tBg) + 22 * tBg);
        const bgB = Math.round(26 * (1 - tBg) + 40 * tBg);

        if (dist <= innerR) {
          const tGrad = x / w;
          grad[idx] = Math.round(155 + tGrad * (58 - 155));
          grad[idx + 1] = Math.round(93 + tGrad * (134 - 93));
          grad[idx + 2] = Math.round(229 + tGrad * (255 - 229));
          grad[idx + 3] = 255;
        } else {
          const fadeT = Math.min(1, (dist - innerR) / (w * 0.17));
          const tGrad = x / w;
          const iR = Math.round(155 + tGrad * (58 - 155));
          const iG = Math.round(93 + tGrad * (134 - 93));
          const iB = Math.round(229 + tGrad * (255 - 229));
          grad[idx] = Math.round(iR * (1 - fadeT) + bgR * fadeT);
          grad[idx + 1] = Math.round(iG * (1 - fadeT) + bgG * fadeT);
          grad[idx + 2] = Math.round(iB * (1 - fadeT) + bgB * fadeT);
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
      raw[dstOff] = grad[srcOff];
      raw[dstOff + 1] = grad[srcOff + 1];
      raw[dstOff + 2] = grad[srcOff + 2];
      raw[dstOff + 3] = grad[srcOff + 3];
    }
  }

  const compressed = zlib.deflateSync(raw);
  const png = buildPNG(w, h, compressed);
  fs.writeFileSync(path.join(outDir, `icon-maskable-${s}.png`), png);
  console.log(`Created icon-maskable-${s}.png (${(png.length / 1024).toFixed(1)} KB)`);
});

console.log('Done!');
