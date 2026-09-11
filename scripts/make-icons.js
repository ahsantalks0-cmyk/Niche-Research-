/**
 * make-icons.js — renders the "Niche Research Department" emblem
 * (obsidian field · champagne-gold concentric rings · marquise diamond · six spokes)
 * to PNG at 4x supersampling, then downsamples for crisp anti-aliased icons.
 *
 * Self-contained: uses only node:zlib for DEFLATE. No external deps.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'icons');
const ICON_SIZES = [16, 32, 48, 64, 128, 256, 512];

/* ---------------------------------- color ---------------------------------- */

/** hex [r,g,b] */
function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

const PALETTE = {
  fieldOuter: hex('#070A12'),
  fieldInner: hex('#111726'),
  ringGold: hex('#E9CE8C'),
  goldDeep: hex('#C29B4C'),
  goldSoft: hex('#F4E7C3'),
  ivory: hex('#F8F5EC'),
  navyTop: hex('#1D2537'),
  navyBottom: hex('#0C101B'),
  blueTop: hex('#7FC4E8'),
  blueBottom: hex('#3F7FB2'),
};

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}
function shade(c, f) { return [clamp01(c[0] * f), clamp01(c[1] * f), clamp01(c[2] * f)]; }

/* -------------------------------- geometry --------------------------------- */

function dist(x, y, cx, cy) { return Math.hypot(x - cx, y - cy); }
/** signed distance to rounded-rect (positive outside) */
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

/* ------------------------------ emblem renderer ----------------------------- */

/**
 * Paint one supersampled point.
 * @returns {[r,g,b,a]} 0-255
 */
function paint(px, py, S) {
  const c = S / 2;
  const x = px - c;               // -c..c
  const y = py - c;
  const R = c / 2;                // emblem radius (half canvas)

  // ----- rounded-square obsidian field (inset 6%) -----
  const inset = R * 0.12;
  const fieldR = R * 0.20;
  const dField = sdRoundRect(x, y, 0, 0, R - inset, R - inset, fieldR);
  const fieldAA = Math.min(1, Math.max(0, (0.75 - dField) / 1.5));
  if (fieldAA <= 0) return [0, 0, 0, 0];

  // field gradient: top-left lighter
  const gT = clamp01((x + y) / (2 * R) * 0.5 + 0.25);
  let col = mix(shade(PALETTE.fieldOuter, 1.6 - gT * 0.6), PALETTE.fieldInner, 0.55 + gT * 0.35);
  let alpha = fieldAA;

  // ----- concentric champagne rings: 1.00 / 0.80 / 0.62 of R -----
  const rings = [1.0, 0.8, 0.62];
  const ringHalf = R * 0.018;
  rings.forEach((rf, i) => {
    const rr = R * rf * 0.92;
    const d = Math.abs(dist(x, y, 0, 0) - rr);
    const a = Math.min(1, Math.max(0, (ringHalf - d) / 1.2));
    if (a > 0) {
      const tone = i === 0 ? PALETTE.ringGold : i === 1 ? mix(PALETTE.ringGold, PALETTE.goldDeep, 0.35) : PALETTE.goldDeep;
      col = mix(col, tone, a * (i === 0 ? 0.95 : 0.9));
    }
  });

  // ----- six radial spokes -----
  const spokeHalf = R * 0.028;
  for (let k = 0; k < 6; k++) {
    const ang = (Math.PI / 3) * k + Math.PI / 6;
    // project point onto spoke axis; require radial band 0.24R..0.80R
    const proj = x * Math.cos(ang) + y * Math.sin(ang);
    const perp = Math.abs(-x * Math.sin(ang) + y * Math.cos(ang));
    const radialOK = proj > R * 0.24 && proj < R * 0.80;
    if (radialOK) {
      const a = Math.min(1, Math.max(0, (spokeHalf - perp) / 1.4)) * 0.9;
      if (a > 0) col = mix(col, mix(PALETTE.ringGold, PALETTE.goldDeep, 0.25), a);
    }
  }

  // ----- hub: small gold disc -----
  const dHub = dist(x, y, 0, 0);
  const hubA = Math.min(1, Math.max(0, (R * 0.10 - dHub) / 1.2));
  if (hubA > 0) col = mix(col, PALETTE.goldSoft, hubA);

  // ----- center marquise (elongated diamond), slightly taller than wide -----
  const w = R * 0.15, h = R * 0.26;
  const dMarq = Math.abs(Math.abs(x) / w) + Math.abs(Math.abs(y) / h); // manhattan param
  if (dMarq < 1) {
    const edge = Math.min(1, Math.max(0, (1 - dMarq) / 0.16));
    const facet = 0.82 + 0.18 * clamp01((x / w + 1) / 2); // left/right facet shading
    col = mix(col, shade(PALETTE.ivory, facet), Math.min(1, edge * 1.4) * 0.98);
  } else if (dMarq < 1.12) {
    const a = (1.12 - dMarq) / 0.12 * 0.5;
    col = mix(col, PALETTE.ringGold, a);
  }

  // ----- pedestal: two gold bars at the base -----
  const pedY1 = R * 0.66, pedY2 = R * 0.76;
  const pedHalf = R * 0.045;
  [pedY1, pedY2].forEach((pyv, i) => {
    const wHalf = i === 0 ? R * 0.16 : R * 0.10;
    const ddx = Math.abs(x) - wHalf;
    const ddy = Math.abs(y - pyv) - pedHalf;
    const dPed = Math.hypot(Math.max(ddx, 0), Math.max(ddy, 0)) + Math.min(Math.max(ddx, ddy), 0);
    const a = Math.min(1, Math.max(0, (0.8 - dPed) / 1.6));
    if (a > 0) col = mix(col, PALETTE.ringGold, a * 0.95);
  });

  return [
    Math.round(clamp01(col[0]) * 255),
    Math.round(clamp01(col[1]) * 255),
    Math.round(clamp01(col[2]) * 255),
    Math.round(alpha * 255),
  ];
}

/** Render emblem at output size with SS supersampling, return RGBA buffer. */
function renderEmblem(size, SS = 4) {
  const S = size * SS;
  const buf = Buffer.alloc(size * size * 4);
  // accumulators (box-filter downsample)
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

/** Render the electron-builder installer background (light sky-blue gradient, 256px). */
function renderInstallerBackground(size = 256) {
  const buf = Buffer.alloc(size * size * 4);
  const top = PALETTE.blueTop, bot = PALETTE.blueBottom;
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
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // scanlines with filter 0
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
  // pngs: [{size, png}]
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type icon
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, png } of pngs) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size; // 0 means 256
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0; e[3] = 0;            // colors, reserved
    e.writeUInt16LE(1, 4);         // planes
    e.writeUInt16LE(32, 6);        // bpp
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
    const SS = size <= 64 ? 6 : size <= 256 ? 4 : 3;
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
