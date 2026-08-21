'use strict';
// Converts the avatar into ASCII character art.
//
// Two decisions carry the result:
//  1. Mapping is INVERTED. Dark features (hair, brows, eyes, nostrils, mouth)
//     become the dense glyphs and lit skin stays sparse, so the art reads as a
//     drawing of a face rather than a bright blob.
//  2. Because of (1), dark BACKGROUND would go dense too, so the subject
//     silhouette is derived per row from the detected skin span rather than from
//     a guessed ellipse. The photo has dark trees behind the left shoulder that
//     no colour rule alone can separate.
const fs = require('fs');
const path = require('path');

const RAMP = ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hx = (s) => [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];

function build(opts = {}) {
  const {
    file = path.join(__dirname, 'pixels-face.txt'),
    rowsPerChar = 2,
    lo = 0.06,
    hi = 0.80,
    gamma = 1.0,
    padL = 3,          // columns of hair kept left of the skin span
    padR = 2,
    floor = 0.06,
    radius = 4,        // local-mean window, in sample cells
    detailK = 5.0,     // how hard edges/features are pushed
    baseK = 0.38,      // how much absolute darkness still counts (keeps hair solid)
    detailCap = 0.80,  // stops the silhouette edge saturating into a solid bar
  } = opts;

  const grid = fs.readFileSync(file, 'ascii').trim().split('\n').map((r) => r.split(',').map(hx));
  const SROWS = grid.length, COLS = grid[0].length;

  const lum = [], skin = [], dropped = [];
  for (let y = 0; y < SROWS; y++) {
    lum.push([]); skin.push([]); dropped.push([]);
    for (let x = 0; x < COLS; x++) {
      const [r, g, b] = grid[y][x];
      const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const greenDom = g - Math.max(r, b);
      const warm = r - g;
      const fx = (x + 0.5) / COLS, fy = (y + 0.5) / SROWS;

      // foliage by hue; the watermark occupies a right-hand band above the shoulders
      const out = greenDom > 14 || (fx >= 0.775 && fy < 0.75);
      lum[y].push(L);
      dropped[y].push(out);
      skin[y].push(!out && warm > 6 && L > 0.28);
    }
  }

  // per-row skin span, then a 5-row median so the silhouette does not jitter
  const rawL = [], rawR = [];
  for (let y = 0; y < SROWS; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < COLS; x++) if (skin[y][x]) { if (a < 0) a = x; b = x; }
    rawL.push(a); rawR.push(b);
  }
  const firstSkin = rawL.findIndex((v) => v >= 0);
  let lastSkin = -1;
  for (let y = SROWS - 1; y >= 0; y--) if (rawL[y] >= 0) { lastSkin = y; break; }

  let gMinL = COLS, gMaxR = 0;
  for (let y = 0; y < SROWS; y++) {
    if (rawL[y] >= 0) { gMinL = Math.min(gMinL, rawL[y]); gMaxR = Math.max(gMaxR, rawR[y]); }
  }

  const spanL = [], spanR = [];
  for (let y = 0; y < SROWS; y++) {
    const win = [];
    for (let k = -2; k <= 2; k++) {
      const yy = y + k;
      if (yy >= 0 && yy < SROWS && rawL[yy] >= 0) win.push([rawL[yy], rawR[yy]]);
    }
    if (!win.length) {
      // Above the forehead there is no skin to measure, but hair fans out wider
      // than the forehead. Expand from the first skin row, capped by the widest
      // measured span, instead of clipping the crown to forehead width.
      if (y < firstSkin) {
        const d = firstSkin - y, fan = Math.round(d * 0.8);
        spanL.push(Math.max(gMinL, rawL[firstSkin] - fan));
        spanR.push(Math.min(gMaxR, rawR[firstSkin] + fan));
      } else {
        spanL.push(rawL[lastSkin]); spanR.push(rawR[lastSkin]);
      }
      continue;
    }
    const ls = win.map((w) => w[0]).sort((p, q) => p - q);
    const rs = win.map((w) => w[1]).sort((p, q) => p - q);
    spanL.push(ls[ls.length >> 1]); spanR.push(rs[rs.length >> 1]);
  }

  // Local mean of luminance. His photo has flat outdoor lighting, so absolute
  // brightness barely separates features; being darker than the neighbourhood
  // does. This is what turns the face into a line drawing rather than a smudge.
  const inSil = (x, y) => !dropped[y][x] && x >= spanL[y] - padL && x <= spanR[y] + padR;
  const mean = [];
  for (let y = 0; y < SROWS; y++) {
    mean.push([]);
    for (let x = 0; x < COLS; x++) {
      let sum = 0, n = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= SROWS) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= COLS) continue;
          if (!inSil(xx, yy)) continue;
          sum += lum[yy][xx]; n++;
        }
      }
      mean[y].push(n ? sum / n : lum[y][x]);
    }
  }

  const ROWS = Math.floor(SROWS / rowsPerChar);
  const lines = [];
  for (let cy = 0; cy < ROWS; cy++) {
    let line = '';
    for (let x = 0; x < COLS; x++) {
      let sum = 0;
      for (let k = 0; k < rowsPerChar; k++) {
        const y = cy * rowsPerChar + k;
        const fy = (y + 0.5) / SROWS;
        if (dropped[y][x]) continue;
        if (x < spanL[y] - padL || x > spanR[y] + padR) continue;

        // gentle fades only at the crown of the hair and down into the shoulders
        const dyn = (fy - 0.40) / 0.60;
        const a = (1 - smooth(0.88, 1.06, Math.max(0, -dyn)))
                * (1 - smooth(0.52, 0.92, Math.max(0, dyn)));

        const detail = Math.min(detailCap, clamp01((mean[y][x] - lum[y][x]) * detailK));
        const dark = 1 - clamp01((lum[y][x] - lo) / (hi - lo));
        sum += clamp01(detail + baseK * dark * dark) * a;
      }
      const v = sum / rowsPerChar;
      if (v < floor) { line += ' '; continue; }
      line += RAMP[Math.round(clamp01(Math.pow(v, gamma)) * (RAMP.length - 1))];
    }
    lines.push(line.replace(/\s+$/, ''));
  }
  return { lines, COLS, ROWS };
}

module.exports = { build, RAMP };

if (require.main === module) {
  const gamma = parseFloat(process.argv[2] || '1.0');
  const { lines, COLS, ROWS } = build({ gamma });
  console.log(`# ${COLS}x${ROWS} chars  gamma=${gamma}`);
  console.log(lines.map((l) => '|' + l).join('\n'));
}
