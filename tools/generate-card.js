'use strict';
// Profile card: portrait on the left, neofetch-style readout on the right.
//
//   node tools/generate-card.js <out.svg> image|ascii|pixel
//
// All three portrait modes share the same panel and the same chrome-free layout.
// Alignment in the panel relies on everything being monospace: each line is
// padded to a fixed CHARACTER count, so columns line up whatever monospace font
// the viewer actually has.
const fs = require('fs');
const path = require('path');
const { build } = require('./ascii.js');

const dest = process.argv[2] || path.join(__dirname, 'card.svg');
const MODE = (process.argv[3] || 'image').toLowerCase();

const MONO = "ui-monospace,'SF Mono','Cascadia Mono',Menlo,Consolas,'DejaVu Sans Mono',monospace";
const W = 900;
const PAD = 12;
const ART_ASPECT = 1190 / 1154;         // the crop box measured out of art.png

// Per-mode geometry. `image` is the shipped mode: the hand-made portrait is
// close to square, so it drives a taller card and a narrower panel.
const LAYOUT = {
  image: { artW: 400, gap: 24, cols: 68, halfL: 32, font: 11, lh: 14.5, y0: 73, h: null },
  ascii: { artW: 300, gap: 40, cols: 76, halfL: 36, font: 11.5, lh: 15, y0: 32, h: 360 },
  pixel: { artW: 300, gap: 40, cols: 76, halfL: 36, font: 11.5, lh: 15, y0: 32, h: 360 },
};
const LO = LAYOUT[MODE] || LAYOUT.image;

const ART_W = LO.artW;
const ART_H = Math.round(ART_W * ART_ASPECT);
const H = LO.h || ART_H + PAD * 2;

// ---- panel ------------------------------------------------------------------
const PANEL_X = PAD + ART_W + LO.gap;
const PANEL_FONT = LO.font;
const PANEL_LH = LO.lh;
const COLS = LO.cols;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function leader(label, value, width = COLS) {
  const head = `. ${label}:`;
  return { head, dots: '.'.repeat(Math.max(1, width - head.length - value.length - 2)), value };
}
function rule(title, width = COLS) {
  return { title, bar: '─'.repeat(Math.max(3, width - title.length - 1)) };
}

const FIELDS = [
  ['OS', 'Kali GNU/Linux Rolling, Windows 11'],
  ['Uptime', '5 years, 3 months, 24 days'],
  ['Host', 'AwareXone (Founder & CEO)'],
  ['Shell', 'zsh 5.9 + Claude Code'],
  ['Terminal', 'Burp Suite Pro, nuclei, ffuf, sqlmap'],
  null,
  ['Skills.Offensive', 'Web, API, AI/LLM, Web3, Cloud'],
  ['Skills.Web', 'IDOR, SSRF, XSS, SQLi, RCE, XXE'],
  ['Skills.Programming', 'Python, Shell, TypeScript, JavaScript'],
  ['Platforms', 'HackerOne, Bugcrowd, Intigriti, Immunefi'],
];
const CONTACT = [
  ['Email.Personal', 'shuvonsec@gmail.com'],
  ['Website', 'shuvonsec.me'],
  ['X', '@shuvonsec'],
  ['LinkedIn', 'in/shuvonsec'],
  ['YouTube', '@shuvonsec'],
];
const STATS = [
  [['Repos', '38 {Forks: 39}'], ['Stars', '4,655']],
  [['Commits', '288'], ['Followers', '357']],
  [['Forks of my repos', '923'], ['Contributions', '1,236']],
];
const HALF_L = LO.halfL, HALF_R = COLS - HALF_L - 3;

const out = [];
let y = LO.y0;
const emit = (frags) => { out.push(`<text x="${PANEL_X}" y="${y.toFixed(2)}" class="p" xml:space="preserve">${frags}</text>`); y += PANEL_LH; };
const t = (cls, s) => `<tspan class="${cls}">${esc(s)}</tspan>`;
const row = (l) => emit(`${t('dt', '. ')}${t('lb', l.head.slice(2))}${t('do', ' ' + l.dots + ' ')}${t('vl', l.value)}`);
const head = (title) => { const r = rule(title); emit(`${t('hd', r.title)}${t('ru', ' ' + r.bar)}`); };

head('shuvon@shuvonsec');
for (const f of FIELDS) { if (!f) { y += PANEL_LH * 0.5; continue; } row(leader(f[0], f[1])); }
y += PANEL_LH * 0.5; head('- Contact');
for (const f of CONTACT) row(leader(f[0], f[1]));
y += PANEL_LH * 0.5; head('- GitHub Stats');
for (const [a, b] of STATS) {
  const la = leader(a[0], a[1], HALF_L), lb = leader(b[0], b[1], HALF_R);
  emit(
    `${t('dt', '. ')}${t('lb', la.head.slice(2))}${t('do', ' ' + la.dots + ' ')}${t('vl', la.value)}` +
    `${t('ru', ' | ')}` +
    `${t('lb', lb.head.slice(2))}${t('do', ' ' + lb.dots + ' ')}${t('vl', lb.value)}`
  );
}

// ---- portrait ---------------------------------------------------------------
let portrait, artFontRule = '';

if (MODE === 'image') {
  // The hand-made portrait, embedded and masked by its own luminance so the
  // black background drops out entirely instead of drawing a rectangle. `crush`
  // pulls near-black to zero, otherwise JPEG noise hazes the whole box.
  const jpg = fs.readFileSync(path.join(__dirname, 'art-crop.jpg')).toString('base64');
  const box = `x="${PAD}" y="${PAD}" width="${ART_W}" height="${ART_H}"`;
  const crush = ['R', 'G', 'B'].map((c) => `<feFunc${c} type="linear" slope="1.6" intercept="-0.15"/>`).join('');
  portrait = [
    '<defs>',
    '<filter id="crush" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">',
    `<feComponentTransfer>${crush}</feComponentTransfer></filter>`,
    '<linearGradient id="ink" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#a8ffc6"/><stop offset="0.55" stop-color="#2ee06a"/><stop offset="1" stop-color="#0f9b4c"/>',
    '</linearGradient>',
    `<mask id="art" maskUnits="userSpaceOnUse" ${box}>`,
    `<image ${box} preserveAspectRatio="none" filter="url(#crush)" href="data:image/jpeg;base64,${jpg}"/>`,
    '</mask>',
    '</defs>',
    `<rect ${box} fill="url(#ink)" mask="url(#art)"/>`,
  ].join('');
  console.error(`image art ${ART_W}x${ART_H} base64=${(jpg.length / 1024).toFixed(0)}KB`);
} else if (MODE === 'ascii') {
  const CROP_W = 176, CROP_H = 240, ART_COLS = 60, ART_ROWS = 40;
  const artH = ART_W * (CROP_H / CROP_W);
  const adv = ART_W / ART_COLS;
  const font = adv / 0.6;                 // monospace advance is 0.6em
  const lh = artH / ART_ROWS;
  const art = build({
    file: path.join(__dirname, 'pixels-face60.txt'),
    padL: 2, padR: 2,
    detailK: 0, baseK: 1.0, gamma: 1.3, floor: 0.10,
  });
  artFontRule = `  .a{font-family:${MONO};font-size:${font.toFixed(2)}px;fill:#2ee06a;white-space:pre}`;
  portrait = art.lines.map((l, i) =>
    `<text x="${PAD}" y="${(PAD + font * 0.82 + i * lh).toFixed(2)}" class="a" xml:space="preserve">${esc(l)}</text>`
  ).join('\n');
  console.error(`ascii art ${art.COLS}x${art.ROWS} @ ${font.toFixed(2)}px`);
} else {
  // duotone pixel portrait from the validated 40x50 sample
  const hx = (s) => [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smooth = (a, b, x) => { const tt = clamp01((x - a) / (b - a)); return tt * tt * (3 - 2 * tt); };
  const RAMP = [[0, '0a1c22'], [0.16, '0d3c3f'], [0.34, '0e6b4e'], [0.52, '14a457'], [0.68, '2ee06a'], [0.84, '85fba8'], [1, 'ecfff3']];
  const ramp = (v) => {
    v = clamp01(v);
    for (let i = 0; i < RAMP.length - 1; i++) {
      const [p0, c0] = RAMP[i], [p1, c1] = RAMP[i + 1];
      if (v >= p0 && v <= p1) {
        const f = (v - p0) / (p1 - p0), a = hx(c0), b = hx(c1);
        return '#' + [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f).toString(16).padStart(2, '0')).join('');
      }
    }
    return '#' + RAMP[RAMP.length - 1][1];
  };
  const grid = fs.readFileSync(path.join(__dirname, 'pixels2.txt'), 'ascii')
    .trim().split('\n').map((r) => r.split(',').map(hx));
  const ROWS = grid.length, PCOLS = grid[0].length;
  const PIX_W = 250;
  const px = PIX_W / PCOLS;
  const cells = [];
  for (let yy = 0; yy < ROWS; yy++) {
    for (let xx = 0; xx < PCOLS; xx++) {
      const [r, g, b] = grid[yy][xx];
      const L0 = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (g - Math.max(r, b) > 14) continue;
      if (L0 > 0.60 && r - g < 20) continue;
      if (xx >= 32 && yy <= 12) continue;
      const dxn = ((xx + 0.5) / PCOLS - 0.48) / 0.50;
      const dyn = ((yy + 0.5) / ROWS - 0.44) / 0.48;
      const a = (1 - smooth(0.58, 0.98, Math.abs(dxn)))
              * (1 - smooth(0.74, 1.0, Math.max(0, -dyn)))
              * (1 - smooth(0.30, 0.94, Math.max(0, dyn)));
      if (a < 0.08) continue;
      const L = clamp01((L0 - 0.07) / 0.80);
      const base = hx(ramp(L).slice(1));
      const col = '#' + [0, 1, 2].map((k) => Math.round(base[k] * 0.78 + [r, g, b][k] * 0.22).toString(16).padStart(2, '0')).join('');
      cells.push(`<rect x="${(PAD + xx * px).toFixed(1)}" y="${(PAD + yy * px).toFixed(1)}" width="${px.toFixed(2)}" height="${px.toFixed(2)}" fill="${col}" opacity="${a.toFixed(2)}"/>`);
    }
  }
  portrait = cells.join('');
  console.error(`pixel art ${PCOLS}x${ROWS} @ ${px.toFixed(2)}px cells=${cells.length}`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="shuvonsec — offensive security researcher, founder of AwareXone">
<title>shuvon@shuvonsec</title>
<style>
${artFontRule}
  .p{font-family:${MONO};font-size:${PANEL_FONT}px}
  .hd{fill:#7dfba0;font-weight:700}
  .ru{fill:#1f6f3f}
  .dt{fill:#1f6f3f}
  .lb{fill:#00ff41;font-weight:700}
  .do{fill:#17512f}
  .vl{fill:#cfeeda}
</style>
<rect width="${W}" height="${H}" fill="#0d1117"/>
${portrait}
${out.join('\n')}
</svg>
`;

fs.writeFileSync(dest, svg, 'utf8');
console.log(`wrote ${dest} mode=${MODE} ${(svg.length / 1024).toFixed(1)}KB panel=${out.length} lines bottom=${y.toFixed(0)} card=${W}x${H}`);
