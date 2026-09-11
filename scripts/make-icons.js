/**
 * make-icons.js v2 — refined "Graphite & Champagne" emblem:
 * thin concentric champagne rings + a slim faceted marquise. Minimal, quiet.
 * Self-contained: uses only node:zlib for DEFLATE. No external deps.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'icons');
const ICON_SIZES = [16, 32, 48, 64, 128, 256, 512];

/* ---------------------------------- color ---------------------------------- */

function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

const PALETTE = {
  champagne: hex('#D9BE85'),
  champagneDeep: hex('#B99B5E'),
  ivory: hex('#F2EEE4'),
  ivoryShade: hex('#D9D2C0'),
};

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

/* -------------------------------- geometry --------------------------------- */

function dist(x, y) { return Math.hypot(x, y); }

/* ------------------------------ emblem renderer ----------------------------- */

/**
 * Paint one supersampled point (transparent background).
 * @returns {[r,g,b,a]} 0-255
 */
function paint(px, py, S) {
  const c = S / 2;
  const x = px - c;
  const y = py - c;
  const R = c;                      // emblem max radius = half canvas
  let col = [0, 0, 0];
  let alpha = 0;

  // ---- thin outer ring at 0.96R ----
  const ring1 = R * 0.96;
  const d1 = Math.abs(dist(x, y) - ring1);
  const a1 = Math.min(1, Math.max(0, (R * 0.016 - d1) / 1.2));
  if (a1 > 0) {
    col = PALETTE.champagne;
    alpha = Math.max(alpha, a1 * 0.95);
  }

  // ---- thin inner ring at 0.78R ----
  const ring2 = R * 0.78;
  const d2 = Math.abs(dist(x, y) - ring2);
  const a2 = Math.min(1, Math.max(0, (R * 0.013 - d2) / 1.2));
  if (a2 > 0) {
    col = mix(PALETTE.champagne, PALETTE.champagneDeep, 0.3);
    alpha = Math.max(alpha, a2 * 0.9);
  }

  // ---- slim marquise (vertical diamond) ----
  const w = R * 0.13, h = R * 0.30;
  const m = Math.abs(x) / w + Math.abs(y) / h;
  if (m < 1) {
    // facet shading: split left/right, brighter right
    const facet = x >= 0 ? 1.0 : 0.82;
    const edgeFade = Math.min(1, (1 - m) / 0.18);
    const base = mix(PALETTE.ivory, PALETTE.ivoryShade, 1 - facet);
    col = base;
    alpha = Math.max(alpha, edgeFade);
  } else if (m < 1.12) {
    // hairline champagne halo just outside the marquise
    const t = (1.12 - m) / 0.12;
    col = PALETTE.champagne;
    alpha = Math.max(alpha, t * 0.35);
  }

  return [
    Math.round(clamp01(col[0]) * 255),
    Math.round(clamp01(col[1]) * 255),
    Math.round(clamp01(col[2]) * 255),
    Math.round(clamp01(alpha) * 255),
  ];
}

/** Render emblem at output size with SS supersampling, return RGBA buffer. */
function renderEmblem(size, SS = 4) {
  const S = size * SS;
  const buf = Buffer.alloc(size * size * 4);
  const acc = new Float32Array(size * size * 4);
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const [r, g, b, a] = paint(px + 0.5, py + 0.5, S);
      const ox = Math.floor(px / SS), oy = Math.floor(py / SS);
      const oi = (oy * size + ox) * 4;
      acc[oi] += r; acc[oi + 1] += g; acc[oi + 2] += b; acc[oi + 3] += a;
    }
  }
  const n = SS * SS;
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = Math.round(acc[i * 4] / n);
    buf[i * 4 + 1] = Math.round(acc[i * 4 + 1] / n);
    buf[i * 4 + 2] = Math.round(acc[i * 4 + 2] / n);
    buf[i * 4 + 3] = Math.round(acc[i * 4 + 3] / n);
  }
  return buf;
}

/** Installer background — warm graphite gradient (matches the app), 256px. */
function renderInstallerBackground(size = 256) {
  const buf = Buffer.alloc(size * size * 4);
  const top = hex('#242229');
  const bot = hex('#151419');
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const col = mix(top, bot, t);
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      buf[i] = Math.round(col[0]); buf[i + 1] = Math.round(col[1]);
      buf[i + 2] = Math.round(col[2]); buf[i + 3] = 255;
    }
  }
  return buf;
}

/* ------------------------------- PNG encoder -------------------------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(rgba, w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* --------------------------------- ICO pack --------------------------------- */

function buildICO(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, png } of pngs) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.png)]);
}

/* ----------------------------------- main ----------------------------------- */

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pngs = [];
  for (const size of ICON_SIZES) {
    const SS = size <= 64 ? 8 : size <= 256 ? 5 : 3;
    process.stdout.write(`rendering ${size}x${size} (SS=${SS})... `);
    const rgba = renderEmblem(size, SS);
    const png = encodePNG(rgba, size, size);
    fs.writeFileSync(path.join(OUT_DIR, `icon-${size}x${size}.png`), png);
    pngs.push({ size, png });
    console.log(`${(png.length / 1024).toFixed(1)} KB`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'icon.png'), pngs.find((p) => p.size === 512).png);
  fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), buildICO(pngs.filter((p) => [16, 32, 48, 64, 128, 256].includes(p.size))));
  const bg = renderInstallerBackground(256);
  fs.writeFileSync(path.join(OUT_DIR, 'installerBackground-256.png'), encodePNG(bg, 256, 256));
  console.log('icons written to', OUT_DIR);
}

main();
