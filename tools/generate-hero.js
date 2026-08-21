'use strict';
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const PX = 5.3;
const PORT_X = 36, PORT_Y = 48;
const W = 900, H = 340;
const PANEL_X = 286;
const VALUE_X = PANEL_X + 98;
const RIGHT = 872;

const hx = (s) => [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// matrix duotone: lifted floor so the dark shirt still reads as a silhouette
const RAMP = [
  [0.00, '0a1c22'], [0.16, '0d3c3f'], [0.34, '0e6b4e'],
  [0.52, '14a457'], [0.68, '2ee06a'], [0.84, '85fba8'], [1.00, 'ecfff3'],
];
function ramp(t) {
  t = clamp01(t);
  for (let i = 0; i < RAMP.length - 1; i++) {
    const [p0, c0] = RAMP[i], [p1, c1] = RAMP[i + 1];
    if (t >= p0 && t <= p1) {
      const f = (t - p0) / (p1 - p0), a = hx(c0), b = hx(c1);
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }
  }
  return hx(RAMP[RAMP.length - 1][1]);
}

const grid = fs.readFileSync(path.join(HERE, 'pixels2.txt'), 'ascii')
  .trim().split('\n').map((r) => r.split(',').map(hx));
const ROWS = grid.length, COLS = grid[0].length;

const WARM_BLEND = 0.22;   // keep a hint of real skin tone through the green
let kept = 0, dropped = 0;
const svgRows = [];

for (let y = 0; y < ROWS; y++) {
  const cells = [];
  for (let x = 0; x < COLS; x++) {
    const [r, g, b] = grid[y][x];
    const L0 = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const greenDom = g - Math.max(r, b);
    const warm = r - g;

    // --- masks: foliage by hue, watermark by bright-and-neutral, plus the
    //     top-right corner where the logo lives and the subject does not
    if (greenDom > 14) { dropped++; continue; }
    if (L0 > 0.60 && warm < 20) { dropped++; continue; }
    if (x >= 32 && y <= 16) { dropped++; continue; }

    // separable falloff, so the fade always completes before the clip edge
    const dxn = ((x + 0.5) / COLS - 0.48) / 0.50;
    const dyn = ((y + 0.5) / ROWS - 0.44) / 0.48;
    const fadeX = 1 - smooth(0.68, 1.00, Math.abs(dxn));
    const fadeTop = 1 - smooth(0.74, 1.00, Math.max(0, -dyn));
    const fadeBot = 1 - smooth(0.30, 0.94, Math.max(0, dyn));
    let a = fadeX * fadeTop * fadeBot;
    if (a < 0.08) { dropped++; continue; }

    const L = clamp01((L0 - 0.07) / 0.80);
    const [gr, gg, gb] = ramp(L);
    const col = toHex(
      gr * (1 - WARM_BLEND) + r * WARM_BLEND,
      gg * (1 - WARM_BLEND) + g * WARM_BLEND,
      gb * (1 - WARM_BLEND) + b * WARM_BLEND
    );
    kept++;
    cells.push(`<rect x="${(PORT_X + x * PX).toFixed(1)}" y="${(PORT_Y + y * PX).toFixed(1)}" width="${PX}" height="${PX}" fill="${col}" opacity="${a.toFixed(2)}"/>`);
  }
  if (!cells.length) continue;
  svgRows.push(
    `<g opacity="0">${cells.join('')}` +
    `<animate attributeName="opacity" from="0" to="1" dur="0.30s" begin="${(0.18 + y * 0.019).toFixed(2)}s" fill="freeze"/></g>`
  );
}

// ---------- binary 01 rain (ambient, deliberately faint) ----------
const rainDefs = [];
for (let i = 0; i < 5; i++) {
  const chars = [];
  for (let j = 0; j < 28; j++) {
    const bit = ((i * 7 + j * 13 + ((j * j) % 5)) % 3) ? '1' : '0';
    chars.push(`<tspan x="0" dy="${j === 0 ? 0 : 15}">${bit}</tspan>`);
  }
  rainDefs.push(`<text id="rc${i}" y="0" class="rain">${chars.join('')}</text>`);
}
const rain = [];
for (let c = 0; c < 12; c++) {
  const x = 258 + c * 54;
  const dur = 11 + ((c * 5) % 9);
  rain.push(
    `<g transform="translate(${x},0)" opacity="${(0.028 + (c % 3) * 0.009).toFixed(3)}">` +
    `<use href="#rc${c % 5}" y="-420">` +
    `<animateTransform attributeName="transform" type="translate" from="0 0" to="0 760" dur="${dur}s" begin="${-((c * 3.7) % 11).toFixed(1)}s" repeatCount="indefinite"/>` +
    `</use></g>`
  );
}

// ---------- neofetch panel ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FIELDS = [
  ['OS',        'Kali GNU/Linux Rolling x86_64'],
  ['Host',      'AwareXone · Founder & CEO'],
  ['Uptime',    '5 years, 3 months  (since Apr 2021)'],
  ['Shell',     'zsh 5.9 + Claude Code'],
  ['Platforms', 'HackerOne · Bugcrowd · Intigriti · Immunefi'],
  ['Surface',   'Web · API · AI/LLM · Web3 · Cloud'],
  ['Toolchain', 'Burp Suite Pro · nuclei · ffuf · sqlmap'],
  ['Languages', 'Python · Shell · TypeScript · JavaScript'],
  ['Repos',     '37 public · 4,654 stars · 772 forks'],
  ['Creds',     'NASA Hall of Fame · 357 followers'],
  ['Locale',    'Cyberjaya, MY  (en_MY.UTF-8)'],
];

const panel = [];
panel.push(
  `<g opacity="0"><text x="${PANEL_X}" y="72" class="hdr">` +
  `<tspan class="user">shuvonsec</tspan><tspan class="dim">@</tspan><tspan class="host">github</tspan></text>` +
  `<animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="0.12s" fill="freeze"/></g>`
);
panel.push(
  `<g opacity="0"><rect x="${PANEL_X}" y="82" width="${RIGHT - PANEL_X}" height="1" fill="#00ff41" opacity="0.24"/>` +
  `<animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="0.3s" fill="freeze"/></g>`
);
FIELDS.forEach(([k, v], i) => {
  const yy = 104 + i * 15.8;
  panel.push(
    `<g opacity="0">` +
    `<text x="${PANEL_X}" y="${yy.toFixed(1)}" class="key">${esc(k)}</text>` +
    `<text x="${VALUE_X}" y="${yy.toFixed(1)}" class="val">${esc(v)}</text>` +
    `<animate attributeName="opacity" from="0" to="1" dur="0.24s" begin="${(0.42 + i * 0.07).toFixed(2)}s" fill="freeze"/></g>`
  );
});

const PAL = ['#ff4d4d', '#ffb020', '#00ff41', '#22d3ee', '#3b82f6', '#a78bfa', '#f472b6', '#e6edf3'];
const sw = PAL.map((c, i) =>
  `<rect x="${PANEL_X + i * 21}" y="274" width="18" height="8" fill="${c}"/>` +
  `<rect x="${PANEL_X + i * 21}" y="284" width="18" height="8" fill="${c}" opacity="0.42"/>`
).join('');
panel.push(`<g opacity="0">${sw}<animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="1.30s" fill="freeze"/></g>`);
panel.push(
  `<g opacity="0">` +
  `<text x="${PANEL_X}" y="312" class="prompt">❯ ./hunt --scope=* --chain --report</text>` +
  `<rect x="${PANEL_X + 254}" y="303" width="8" height="12" fill="#00ff41">` +
  `<animate attributeName="opacity" values="1;1;0;0" dur="1.1s" repeatCount="indefinite"/></rect>` +
  `<animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="1.55s" fill="freeze"/></g>`
);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="shuvonsec — offensive security researcher, bug bounty hunter, founder of AwareXone">
<title>shuvonsec@github — offensive security researcher</title>
<defs>
  <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#00ff41" stop-opacity="0.5"/>
    <stop offset="0.55" stop-color="#22d3ee" stop-opacity="0.28"/>
    <stop offset="1" stop-color="#a78bfa" stop-opacity="0.38"/>
  </linearGradient>
  <radialGradient id="halo" cx="0.16" cy="0.42" r="0.55">
    <stop offset="0" stop-color="#00ff41" stop-opacity="0.10"/>
    <stop offset="1" stop-color="#00ff41" stop-opacity="0"/>
  </radialGradient>
  <clipPath id="card"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="11"/></clipPath>
  <clipPath id="pclip"><rect x="${PORT_X - 3}" y="${PORT_Y - 3}" width="${COLS * PX + 6}" height="${ROWS * PX + 6}"/></clipPath>
  ${rainDefs.join('\n  ')}
  <style>
    .rain{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:12px;fill:#00ff41}
    .hdr{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:19px;font-weight:700}
    .user{fill:#00ff41}.host{fill:#22d3ee}.dim{fill:#6e7681}
    .key{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:12.5px;font-weight:700;fill:#00ff41}
    .val{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:12.5px;fill:#c9d1d9}
    .bar{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:11.5px;fill:#8b949e}
    .prompt{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:12.5px;fill:#7dfba0}
  </style>
</defs>

<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="11" fill="#0a0e14"/>
<g clip-path="url(#card)">
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#halo)"/>
  ${rain.join('\n  ')}

  <rect x="1" y="1" width="${W - 2}" height="29" fill="#0d1117"/>
  <line x1="1" y1="30" x2="${W - 1}" y2="30" stroke="#00ff41" stroke-opacity="0.16"/>
  <circle cx="21" cy="15.5" r="5" fill="#ff5f57"/>
  <circle cx="39" cy="15.5" r="5" fill="#febc2e"/>
  <circle cx="57" cy="15.5" r="5" fill="#28c840"/>
  <text x="76" y="19.5" class="bar">shuvon@shuvonsec:~/hunt$ neofetch</text>
  <text x="${W - 20}" y="19.5" class="bar" text-anchor="end">● live</text>

  <g clip-path="url(#pclip)">
    ${svgRows.join('\n    ')}
    <rect x="${PORT_X - 3}" y="${PORT_Y - 3}" width="${COLS * PX + 6}" height="2.5" fill="#85fba8" opacity="0.14">
      <animate attributeName="y" from="${PORT_Y - 3}" to="${PORT_Y + ROWS * PX}" dur="4.2s" begin="1.6s" repeatCount="indefinite"/>
    </rect>
  </g>

  ${panel.join('\n  ')}
</g>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="11" fill="none" stroke="url(#edge)" stroke-width="1.4"/>
</svg>
`;

const out = process.argv[2] || path.join(HERE, 'hero.svg');
fs.writeFileSync(out, svg, 'utf8');
console.log(`wrote ${out} ${(svg.length / 1024).toFixed(1)}KB | grid ${COLS}x${ROWS} kept=${kept} dropped=${dropped} rows=${svgRows.length}`);
