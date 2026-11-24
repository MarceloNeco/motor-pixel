// poste-de-placas: um poste de rua atulhado de placas e adesivos, no escuro,
// com uma câmera grande-angular que chicoteia em volta dele.
// Tudo procedural: geometria em código, texturas desenhadas em canvas, nenhum modelo ou imagem de arquivo.
// Toda a cena é função do tempo: renderAt(t) recalcula o quadro inteiro, sem estado acumulado.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// ---------------------------------------------------------------- textos (troque aqui)
const COPY = {
  heroA: 'a', heroB: 'esquina',          // placa luminosa laranja (a protagonista)
  marca: 'aiverso',                      // placa preta da marca
  pare: 'Pare',                          // octógono vermelho
  opa: 'pa!',                            // disco vermelho: um "O" desenhado + este resto ("opa!")
  obras: ['EM', 'OBRAS'],                // losango amarelo
  vai: 'vai',                            // luz verde do semáforo
  mao: ['MÃO', 'ÚNICA'],                 // plaquinha preta da seta
  rua: ['RUA DO', 'PROMPT'],             // placa branca de rua
  devagar: 'devagar',                    // losango laranja pequeno
  stickers: ['olá', 'novo', '24h', 'ok', 'bora', 'tmj', '100%', 'vixe', 'ufa', 'IA', 'top', 'eita'],
};

const VW = 1920, VH = 1080, FPS = 30, DURATION = 15;
const SS = 1.25;                          // a cena é renderizada maior, porque a lente amplia o centro
const IW = Math.round(VW * SS), IH = Math.round(VH * SS);
const SHUTTER = 0.8;                      // fração do quadro em que o obturador fica aberto
const PI = Math.PI, D2R = PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];

// curva por chaves [[t, v], ...], cúbica monotônica (não passa do alvo entre chaves)
function track(keys) {
  const n = keys.length, xs = keys.map(k => k[0]), ys = keys.map(k => k[1]);
  const d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
  }
  return t => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], u = (t - xs[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('out');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(VW, VH, false);
renderer.toneMapping = THREE.NoToneMapping;          // o tom e o sRGB são feitos no último passe
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;                // nada se move além da câmera: as sombras são calculadas uma vez
const MAXANI = renderer.capabilities.getMaxAnisotropy();
const FLOAT_BLEND = !!renderer.getContext().getExtension('EXT_float_blend');   // somar em 32 bits evita faixas no escuro

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, VW / VH, 0.05, 200);
const totem = new THREE.Group();
scene.add(totem);

// ---------------------------------------------------------------- fonte
const inter = new FontFace('Inter', 'url(./fontes/Inter-var.woff2)', { weight: '100 900', style: 'normal' });
document.fonts.add(await inter.load());
await document.fonts.load('900 40px Inter');

// ---------------------------------------------------------------- canvas -> textura
function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.textBaseline = 'alphabetic'; draw(g, w, h); return c;
}
function texOf(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAXANI; return t;
}
const canvasTex = (w, h, draw) => texOf(makeCanvas(w, h, draw));
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

// ---------------------------------------------------------------- adesivos
function dieCut(g, path, s, col = '#fbfaf5') {   // o recorte branco em volta do adesivo, com sombra
  g.save(); g.shadowColor = 'rgba(0,0,0,0.42)'; g.shadowBlur = s * 0.08; g.shadowOffsetY = s * 0.03;
  g.fillStyle = col; g.strokeStyle = col; g.lineWidth = s * 0.13; g.lineJoin = 'round';
  path(g); g.fill(); g.stroke(); g.restore();
}
const STK = ['#111111', '#1e6bff', '#ff3b1f', '#ffd400', '#19b46b', '#ff7ab8', '#7c4dff', '#ff8a00'];
const SK = {
  label(g, s, R) {
    const w = s * 1.55, h = s * 0.62, bg = pick(R, STK), path = g => rr(g, -w / 2, -h / 2, w, h, h * 0.3);
    dieCut(g, path, s); g.fillStyle = bg; path(g); g.fill();
    g.fillStyle = (bg === '#ffd400' || bg === '#ff7ab8') ? '#111' : '#fff'; g.font = `800 ${h * 0.68}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(pick(R, COPY.stickers), 0, h * 0.05, w * 0.84);
  },
  round(g, s, R) {
    const r = s * 0.52, bg = pick(R, STK), path = g => { g.beginPath(); g.arc(0, 0, r, 0, 7); };
    dieCut(g, path, s); g.fillStyle = bg; path(g); g.fill();
    g.strokeStyle = bg === '#111111' ? '#fff' : '#111'; g.lineWidth = s * 0.03; g.beginPath(); g.arc(0, 0, r * 0.8, 0, 7); g.stroke();
    g.fillStyle = (bg === '#ffd400' || bg === '#ff7ab8') ? '#111' : '#fff'; g.font = `900 ${s * 0.34}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(pick(R, COPY.stickers), 0, s * 0.02, r * 1.4);
  },
  smiley(g, s) {
    const r = s * 0.5, path = g => { g.beginPath(); g.arc(0, 0, r, 0, 7); };
    dieCut(g, path, s); g.fillStyle = '#ffd400'; path(g); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.ellipse(-r * 0.32, -r * 0.2, r * 0.1, r * 0.17, 0, 0, 7); g.ellipse(r * 0.32, -r * 0.2, r * 0.1, r * 0.17, 0, 0, 7); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = r * 0.11; g.lineCap = 'round'; g.beginPath(); g.arc(0, r * 0.05, r * 0.52, 0.25, PI - 0.25); g.stroke();
  },
  star(g, s, R) {
    const path = g => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? s * 0.24 : s * 0.56; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); };
    dieCut(g, path, s); g.fillStyle = pick(R, ['#ffd400', '#ff3b1f', '#1e6bff', '#111111']); path(g); g.fill();
  },
  rings(g, s, R) {
    const path = g => { g.beginPath(); g.arc(0, 0, s * 0.5, 0, 7); };
    dieCut(g, path, s); const cs = pick(R, [['#1e6bff', '#fff', '#ffd400'], ['#111', '#ffd400', '#111'], ['#19b46b', '#fff', '#111']]);
    [1, 0.66, 0.33].forEach((k, i) => { g.fillStyle = cs[i]; g.beginPath(); g.arc(0, 0, s * 0.5 * k, 0, 7); g.fill(); });
  },
  barcode(g, s, R) {
    const w = s * 1.2, h = s * 0.7, path = g => rr(g, -w / 2, -h / 2, w, h, s * 0.04);
    dieCut(g, path, s); g.fillStyle = '#fff'; path(g); g.fill(); g.fillStyle = '#111';
    for (let x = -w * 0.42; x < w * 0.42;) { const bw = s * (0.012 + R() * 0.035); g.fillRect(x, -h * 0.36, bw, h * 0.56); x += bw + s * (0.012 + R() * 0.03); }
    for (let i = 0; i < 9; i++) g.fillRect(-w * 0.4 + i * w * 0.09, h * 0.27, w * 0.05, h * 0.09);
  },
  checker(g, s) {
    const w = s * 0.9, path = g => rr(g, -w / 2, -w / 2, w, w, s * 0.05);
    dieCut(g, path, s); g.save(); path(g); g.clip(); g.fillStyle = '#fff'; g.fillRect(-w, -w, 2 * w, 2 * w); g.fillStyle = '#111';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) g.fillRect(-w / 2 + i * w / 4, -w / 2 + j * w / 4, w / 4, w / 4);
    g.restore();
  },
  hazard(g, s) {
    const w = s * 1.5, h = s * 0.5, path = g => rr(g, -w / 2, -h / 2, w, h, s * 0.05);
    dieCut(g, path, s); g.save(); path(g); g.clip(); g.fillStyle = '#ffd400'; g.fillRect(-w, -h, 2 * w, 2 * h); g.fillStyle = '#111';
    for (let x = -w; x < w; x += s * 0.3) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + s * 0.15, h); g.lineTo(x + s * 0.15 + h, -h); g.lineTo(x + h, -h); g.fill(); }
    g.restore();
  },
  bolt(g, s) {
    const path = g => { g.beginPath(); g.arc(0, 0, s * 0.5, 0, 7); };
    dieCut(g, path, s); g.fillStyle = '#111'; path(g); g.fill(); g.fillStyle = '#ffd400';
    g.beginPath(); [[0.08, -0.38], [-0.2, 0.05], [-0.02, 0.05], [-0.1, 0.38], [0.2, -0.08], [0.02, -0.08]].forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0] * s, p[1] * s)); g.fill();
  },
  heart(g, s) {
    const w = s * 0.9, path = g => rr(g, -w / 2, -w / 2, w, w, s * 0.16);
    dieCut(g, path, s); g.fillStyle = '#fff'; path(g); g.fill(); g.fillStyle = '#ff3b1f'; const k = s * 0.3;
    g.beginPath(); g.moveTo(0, k * 0.95); g.bezierCurveTo(-k * 1.7, -k * 0.2, -k * 0.8, -k * 1.3, 0, -k * 0.45); g.bezierCurveTo(k * 0.8, -k * 1.3, k * 1.7, -k * 0.2, 0, k * 0.95); g.fill();
  },
  eye(g, s, R) {
    const path = g => { g.beginPath(); g.ellipse(0, 0, s * 0.6, s * 0.36, 0, 0, 7); };
    dieCut(g, path, s, '#111'); g.fillStyle = '#fff'; path(g); g.fill();
    g.fillStyle = pick(R, ['#1e6bff', '#19b46b', '#ff8a00']); g.beginPath(); g.arc(0, 0, s * 0.25, 0, 7); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(0, 0, s * 0.12, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * 0.06, -s * 0.07, s * 0.04, 0, 7); g.fill();
  },
  arrow(g, s, R) {
    const w = s * 1.1, h = s * 0.66, path = g => rr(g, -w / 2, -h / 2, w, h, s * 0.06), bg = pick(R, ['#111111', '#1e6bff', '#19b46b']);
    dieCut(g, path, s); g.fillStyle = bg; path(g); g.fill(); g.fillStyle = '#fff';
    g.beginPath(); [[-0.38, -0.08], [0.1, -0.08], [0.1, -0.22], [0.4, 0], [0.1, 0.22], [0.1, 0.08], [-0.38, 0.08]].forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0] * s, p[1] * s)); g.fill();
  },
  burst(g, s, R) {
    const path = g => { g.beginPath(); for (let i = 0; i < 28; i++) { const a = i * PI / 14, r = i % 2 ? s * 0.4 : s * 0.56; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); };
    const bg = pick(R, ['#ff3b1f', '#ffd400', '#1e6bff', '#ff7ab8']);
    dieCut(g, path, s); g.fillStyle = bg; path(g); g.fill();
    g.fillStyle = (bg === '#ffd400' || bg === '#ff7ab8') ? '#111' : '#fff'; g.font = `900 ${s * 0.3}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.rotate(-0.2); g.fillText(pick(R, COPY.stickers), 0, 0, s * 0.72); g.restore();
  },
  photo(g, s, R) {
    const w = s * 0.86, h = s * 1.02, path = g => rr(g, -w / 2, -h / 2, w, h, s * 0.02);
    dieCut(g, path, s * 0.5); g.fillStyle = '#f7f4ec'; path(g); g.fill();
    const gr = g.createLinearGradient(0, -h / 2, w * 0.3, h * 0.3); const a = pick(R, [['#1b2a55', '#ff7a3a'], ['#222', '#888'], ['#5a1030', '#ffb347'], ['#0b3a3a', '#9be7c4']]);
    gr.addColorStop(0, a[0]); gr.addColorStop(1, a[1]); g.fillStyle = gr; g.fillRect(-w * 0.43, -h * 0.44, w * 0.86, h * 0.68);
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(-w * 0.1 + R() * w * 0.2, -h * 0.12, w * 0.16, 0, 7); g.fill();
    g.fillStyle = '#9a968c'; g.fillRect(-w * 0.3, h * 0.32, w * 0.6, h * 0.035);
  },
  holo(g, s, R) {   // disco holográfico, o "CD" colado na placa
    const r = s * 0.5; g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = s * 0.08; g.shadowOffsetY = s * 0.03;
    const cg = g.createConicGradient(R() * 6.28, 0, 0);
    ['#eef6ff', '#8fc6ff', '#f6c4ff', '#fff3a8', '#9dffd6', '#f4f4f4', '#ffb3c7', '#8fc6ff', '#eef6ff'].forEach((c, i, a) => cg.addColorStop(i / (a.length - 1), c));
    g.fillStyle = cg; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.restore();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(0, 0, r * 0.36, 0, 7); g.fill();
    g.fillStyle = '#3b3b3f'; g.beginPath(); g.arc(0, 0, r * 0.13, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = r * 0.015; g.beginPath(); g.arc(0, 0, r * 0.95, 0, 7); g.stroke();
  },
  num(g, s, R) {
    const w = s * 0.8, path = g => rr(g, -w / 2, -w / 2, w, w, s * 0.14), bg = pick(R, ['#111111', '#ff3b1f', '#1e6bff']);
    dieCut(g, path, s); g.fillStyle = bg; path(g); g.fill(); g.fillStyle = '#fff'; g.font = `900 ${s * 0.56}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(pick(R, ['7', '9', '3', '1', '8']), 0, s * 0.03);
  },
  stripes(g, s, R) {
    const w = s * 1.25, h = s * 0.6, path = g => rr(g, -w / 2, -h / 2, w, h, s * 0.1), cs = pick(R, [['#1e6bff', '#fff', '#ff3b1f'], ['#111', '#ffd400', '#111'], ['#19b46b', '#ffd400', '#1e6bff']]);
    dieCut(g, path, s); g.save(); path(g); g.clip(); cs.forEach((c, i) => { g.fillStyle = c; g.fillRect(-w / 2, -h / 2 + i * h / 3, w, h / 3 + 1); }); g.restore();
  },
  tape(g, s) { g.fillStyle = 'rgba(232,220,180,.82)'; g.fillRect(-s * 0.7, -s * 0.13, s * 1.4, s * 0.26); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-s * 0.7, -s * 0.13, s * 1.4, s * 0.05); },
};
const ALLK = ['label', 'label', 'round', 'smiley', 'star', 'rings', 'barcode', 'checker', 'hazard', 'bolt', 'heart', 'eye', 'arrow', 'burst', 'photo', 'photo', 'num', 'stripes', 'label'];

function scribble(g, x, y, s, R, col) {   // "tag" de canetão: rabisco ilegível de propósito
  g.save(); g.translate(x, y); g.rotate((R() - 0.5) * 0.7); g.strokeStyle = col; g.lineWidth = s * 0.07; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); let px = -s * 0.6, py = (R() - 0.5) * s * 0.5; g.moveTo(px, py);
  const n = 5 + Math.floor(R() * 5);
  for (let i = 0; i < n; i++) { const nx = -s * 0.6 + (i + 1) / n * s * 1.2 + (R() - 0.5) * s * 0.25, ny = (R() - 0.5) * s * 0.9; g.quadraticCurveTo(px + (R() - 0.5) * s * 0.4, py + (R() - 0.5) * s * 0.9, nx, ny); px = nx; py = ny; }
  g.stroke(); g.beginPath(); g.moveTo(-s * 0.55, s * 0.52); g.quadraticCurveTo(0, s * 0.66, s * 0.62, s * 0.44); g.stroke(); g.restore();
}
function bomb(g, w, h, { seed, n, smin, smax, kinds = ALLK, zone = null, rot = 0.55 }) {
  const R = mulberry32(seed);
  for (let i = 0, tries = 0; i < n && tries < n * 40; tries++) {
    const x = R() * w, y = R() * h; if (zone && !zone(x / w, y / h)) continue;
    const s = lerp(smin, smax, R() * R());
    g.save(); g.translate(x, y); g.rotate((R() - 0.5) * 2 * rot); SK[pick(R, kinds)](g, s, R); g.restore(); i++;
  }
}
function tags(g, w, h, seed, n, s, cols, zone = null) {
  const R = mulberry32(seed);
  for (let i = 0, tries = 0; i < n && tries < 200; tries++) { const x = R() * w, y = R() * h; if (zone && !zone(x / w, y / h)) continue; scribble(g, x, y, s * (0.7 + R() * 0.6), R, pick(R, cols)); i++; }
}

// ---------------------------------------------------------------- tipografia
// grotesca pesada e inclinada, com as letras quase se encostando
function heavy(g, text, x, y, size, { color = '#2a0a04', track = -0.055, skew = -0.2, align = 'left', weight = 900, fat = 0.02, sx = 1 } = {}) {
  g.save(); g.translate(x, y); g.transform(sx, 0, skew * sx, 1, 0, 0);
  g.font = `${weight} ${size}px Inter`; g.letterSpacing = `${track * size}px`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  const w = g.measureText(text).width - track * size, ox = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
  g.fillStyle = color; g.fillText(text, ox, 0);
  if (fat) { g.strokeStyle = color; g.lineJoin = 'round'; g.lineWidth = size * fat; g.strokeText(text, ox, 0); }
  g.restore(); return w * sx;
}
function lockup(g, cx, cy, size, rot = 0, color = '#2a0a04') {   // "a" em cima, "esquina" embaixo
  g.save(); g.translate(cx, cy); g.rotate(rot);
  g.font = `900 ${size}px Inter`; g.letterSpacing = `${-0.055 * size}px`;
  const wB = g.measureText(COPY.heroB).width + 0.055 * size;
  heavy(g, COPY.heroB, -wB / 2, size * 0.36, size, { color });
  heavy(g, COPY.heroA, -wB / 2 + size * 0.2, size * 0.36 - size * 0.63, size * 0.86, { color });
  g.restore();
}

// ---------------------------------------------------------------- pinturas das placas
function orangeBox(g, w, h) {   // o acrílico aceso
  const gr = g.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, Math.hypot(w, h) * 0.56);
  gr.addColorStop(0, '#ffb233'); gr.addColorStop(0.5, '#ff8208'); gr.addColorStop(1, '#f04a00');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#d83200'; g.lineWidth = Math.min(w, h) * 0.035; g.strokeRect(0, 0, w, h);
}
// placa luminosa: devolve a cor (com adesivos) e a emissão (adesivos recortados em preto, porque não deixam a luz passar)
function lightboxTex(w, h, art, bombOpts) {
  const stk = makeCanvas(w, h, g => bomb(g, w, h, bombOpts));
  const em = makeCanvas(w, h, g => { orangeBox(g, w, h); art(g, w, h); g.globalCompositeOperation = 'destination-out'; g.drawImage(stk, 0, 0); g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#000'; g.fillRect(0, 0, w, h); });
  const al = makeCanvas(w, h, g => { g.fillStyle = '#a23a06'; g.fillRect(0, 0, w, h); g.drawImage(stk, 0, 0); });
  return { map: texOf(al), emissiveMap: texOf(em) };
}

const P = {};   // pinturas
P.marca = (g, w, h) => {
  g.fillStyle = '#0b0b0c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f4f4f2'; g.lineWidth = h * 0.028; rr(g, h * 0.07, h * 0.07, w - h * 0.14, h - h * 0.14, h * 0.07); g.stroke();
  g.font = `700 ${h * 0.56}px Inter`; g.letterSpacing = `${-0.045 * h * 0.56}px`; g.fillStyle = '#fbfbf8'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillText(COPY.marca, w * 0.47, h * 0.69);
  bomb(g, w, h, { seed: 31, n: 3, smin: h * 0.2, smax: h * 0.3, zone: (u, v) => (u > 0.86 && v > 0.2 && v < 0.8) || (v < 0.2 && u > 0.3 && u < 0.7), kinds: ['smiley', 'star', 'label', 'bolt'] });
};
P.pare = (g, w, h) => {
  const gr = g.createRadialGradient(w * 0.45, h * 0.4, w * 0.1, w / 2, h / 2, w * 0.75); gr.addColorStop(0, '#e9291a'); gr.addColorStop(1, '#c0170b');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f6f4ee'; g.lineWidth = w * 0.034; g.lineJoin = 'round'; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = PI / 8 + i * PI / 4, r = w * 0.5 / Math.cos(PI / 8) * 0.9; g[i ? 'lineTo' : 'moveTo'](w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } g.closePath(); g.stroke();
  tags(g, w, h, 5, 3, w * 0.2, ['rgba(120,10,5,.8)', 'rgba(20,8,8,.75)'], (u, v) => v < 0.3 || v > 0.72);
  heavy(g, COPY.pare, w * 0.5, h * 0.62, w * 0.34, { color: '#f7f5ef', align: 'center', track: -0.06, skew: -0.16 });
  g.save(); g.translate(w * 0.66, h * 0.27); SK.holo(g, w * 0.3, mulberry32(4)); g.rotate(-1.2); g.translate(0, -w * 0.02); SK.tape(g, w * 0.2); g.restore();
  bomb(g, w, h, { seed: 77, n: 9, smin: w * 0.07, smax: w * 0.14, zone: (u, v) => Math.hypot(u - 0.5, v - 0.5) < 0.42 && (v < 0.36 || v > 0.7) && !(u > 0.48 && v < 0.44) });
};
P.opa = (g, w, h) => {
  const gr = g.createRadialGradient(w * 0.4, h * 0.35, w * 0.05, w / 2, h / 2, w * 0.6); gr.addColorStop(0, '#ef3a20'); gr.addColorStop(1, '#c81d0c');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  tags(g, w, h, 12, 4, w * 0.2, ['rgba(255,120,60,.55)', 'rgba(120,10,5,.7)'], (u, v) => v < 0.34);
  const s = w * 0.3, y = h * 0.6, x0 = w * 0.1;
  g.fillStyle = '#0c0c0c'; g.beginPath(); g.ellipse(x0 + s * 0.42, y - s * 0.36, s * 0.43, s * 0.42, 0, 0, 7); g.fill();
  g.fillStyle = '#f7f5ef'; g.beginPath(); g.ellipse(x0 + s * 0.42, y - s * 0.36, s * 0.19, s * 0.21, 0, 0, 7); g.fill();
  heavy(g, COPY.opa, x0 + s * 0.84, y, s * 1.02, { color: '#0c0c0c', track: -0.06, skew: -0.08, fat: 0.035 });
  tags(g, w, h, 3, 5, w * 0.11, ['#0c0c0c', '#f7f5ef'], (u, v) => v > 0.68 && v < 0.82 && u > 0.2 && u < 0.8);
  bomb(g, w, h, { seed: 9, n: 7, smin: w * 0.08, smax: w * 0.17, zone: (u, v) => Math.hypot(u - 0.5, v - 0.5) < 0.43 && (v < 0.27 || v > 0.78) });
};
P.obras = (g, w, h) => {
  g.fillStyle = '#f7dc0c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#111'; g.lineWidth = w * 0.02; g.lineJoin = 'round';
  g.beginPath(); const a = w * 0.44; g.moveTo(w / 2, h / 2 - a); g.lineTo(w / 2 + a, h / 2); g.lineTo(w / 2, h / 2 + a); g.lineTo(w / 2 - a, h / 2); g.closePath(); g.stroke();
  g.save(); g.translate(w / 2, h / 2); g.rotate(-0.09);
  heavy(g, COPY.obras[0], 0, -h * 0.085, w * 0.15, { color: '#111', align: 'center', weight: 800, skew: 0, track: 0.01, fat: 0, sx: 0.86 });
  heavy(g, COPY.obras[1], 0, h * 0.07, w * 0.185, { color: '#111', align: 'center', weight: 900, skew: 0, track: -0.01, fat: 0, sx: 0.8 });
  g.save(); g.beginPath(); g.rect(-w * 0.21, h * 0.1, w * 0.42, h * 0.045); g.clip(); g.fillStyle = '#111';
  for (let x = -w * 0.3; x < w * 0.3; x += w * 0.045) { g.beginPath(); g.moveTo(x, h * 0.145); g.lineTo(x + w * 0.022, h * 0.145); g.lineTo(x + w * 0.06, h * 0.1); g.lineTo(x + w * 0.038, h * 0.1); g.fill(); }
  g.restore(); g.restore();
  tags(g, w, h, 21, 2, w * 0.13, ['rgba(17,17,17,.85)'], (u, v) => Math.abs(u - 0.5) + Math.abs(v - 0.5) < 0.36 && (v > 0.68 || v < 0.3));
  bomb(g, w, h, { seed: 23, n: 6, smin: w * 0.07, smax: w * 0.13, zone: (u, v) => Math.abs(u - 0.5) + Math.abs(v - 0.5) < 0.4 && (v < 0.3 || v > 0.7) });
};
P.mao = (g, w, h) => {
  g.fillStyle = '#0b0b0c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f4f4f2'; g.lineWidth = w * 0.03; rr(g, w * 0.055, w * 0.055, w - w * 0.11, h - w * 0.11, w * 0.06); g.stroke();
  g.fillStyle = '#f7f5ef'; g.beginPath();
  [[0.5, 0.1], [0.82, 0.36], [0.62, 0.36], [0.62, 0.62], [0.38, 0.62], [0.38, 0.36], [0.18, 0.36]].forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0] * w, p[1] * h)); g.fill();
  heavy(g, COPY.mao[0], w / 2, h * 0.775, w * 0.18, { color: '#f7f5ef', align: 'center', weight: 800, skew: 0, track: 0.02, fat: 0 });
  heavy(g, COPY.mao[1], w / 2, h * 0.9, w * 0.18, { color: '#f7f5ef', align: 'center', weight: 800, skew: 0, track: 0.02, fat: 0 });
  bomb(g, w, h, { seed: 41, n: 2, smin: w * 0.16, smax: w * 0.2, zone: (u, v) => (u > 0.66 && v > 0.42 && v < 0.62) || (u < 0.3 && v < 0.3), kinds: ['smiley', 'round', 'star'] });
};
P.rua = (g, w, h) => {
  g.fillStyle = '#f2f1ec'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#111'; g.lineWidth = h * 0.03; rr(g, h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12, h * 0.06); g.stroke();
  heavy(g, COPY.rua[0], w * 0.055, h * 0.36, h * 0.2, { color: '#111', weight: 700, skew: 0, track: 0.06, fat: 0 });
  heavy(g, COPY.rua[1], w * 0.05, h * 0.85, h * 0.52, { color: '#111', weight: 900, skew: 0, track: -0.02, fat: 0, sx: 0.92 });
  tags(g, w, h, 15, 3, h * 0.4, ['rgba(17,17,17,.9)', 'rgba(30,107,255,.85)'], (u, v) => u > 0.56);
  bomb(g, w, h, { seed: 52, n: 6, smin: h * 0.22, smax: h * 0.36, zone: (u, v) => u > 0.58 || (v < 0.3 && u > 0.36) });
};
P.redLong = (g, w, h) => {
  g.fillStyle = '#cf180e'; g.fillRect(0, 0, w, h);
  tags(g, w, h, 61, 4, h * 0.5, ['rgba(17,17,17,.85)', 'rgba(255,255,255,.8)']);
  bomb(g, w, h, { seed: 62, n: 13, smin: h * 0.3, smax: h * 0.52 });
};
P.green = (g, w, h) => {
  g.fillStyle = '#0d8a4c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f4f4f2'; g.lineWidth = w * 0.04; rr(g, w * 0.07, w * 0.07, w * 0.86, h * 0.86, w * 0.09); g.stroke();
  g.fillStyle = '#f7f5ef'; g.beginPath(); [[0.2, 0.44], [0.55, 0.44], [0.55, 0.3], [0.82, 0.52], [0.55, 0.74], [0.55, 0.6], [0.2, 0.6]].forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0] * w, p[1] * h)); g.fill();
  g.fillStyle = '#ff3b1f'; g.beginPath(); g.arc(w * 0.27, h * 0.27, w * 0.08, 0, 7); g.fill();
  bomb(g, w, h, { seed: 71, n: 2, smin: w * 0.2, smax: w * 0.26, zone: (u, v) => v > 0.7, kinds: ['label', 'star'] });
};
P.devagar = (g, w, h) => {
  g.fillStyle = '#ff8a00'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#111'; g.lineWidth = w * 0.025; g.lineJoin = 'round'; g.beginPath(); const a = w * 0.42; g.moveTo(w / 2, h / 2 - a); g.lineTo(w / 2 + a, h / 2); g.lineTo(w / 2, h / 2 + a); g.lineTo(w / 2 - a, h / 2); g.closePath(); g.stroke();
  g.save(); g.translate(w / 2, h / 2); g.rotate(-0.14); heavy(g, COPY.devagar, 0, h * 0.045, w * 0.15, { color: '#111', align: 'center', track: -0.05 }); g.restore();
  tags(g, w, h, 81, 1, w * 0.2, ['rgba(17,17,17,.8)'], (u, v) => v > 0.6 && v < 0.72 && u > 0.35 && u < 0.65);
};
P.triYellow = (g, w, h) => {
  g.fillStyle = '#f7d40c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#111'; g.lineWidth = w * 0.045; g.lineJoin = 'round'; g.beginPath(); g.moveTo(w * 0.5, h * 0.12); g.lineTo(w * 0.9, h * 0.9); g.lineTo(w * 0.1, h * 0.9); g.closePath(); g.stroke();
  g.fillStyle = '#111'; rr(g, w * 0.465, h * 0.36, w * 0.07, h * 0.3, w * 0.03); g.fill(); g.beginPath(); g.arc(w * 0.5, h * 0.76, w * 0.045, 0, 7); g.fill();
  bomb(g, w, h, { seed: 91, n: 8, smin: w * 0.1, smax: w * 0.18, zone: (u, v) => v > 0.42 && Math.abs(u - 0.5) < (v - 0.12) * 0.48 && Math.abs(u - 0.5) > 0.07 });
};
P.shield = (g, w, h) => {
  g.fillStyle = '#ff4a12'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f6f4ee'; g.lineWidth = w * 0.03; g.lineJoin = 'round'; g.beginPath(); g.moveTo(w * 0.1, h * 0.1); g.lineTo(w * 0.9, h * 0.1); g.lineTo(w * 0.5, h * 0.9); g.closePath(); g.stroke();
  g.strokeStyle = '#1b1f4a'; g.lineWidth = w * 0.07; g.setLineDash([w * 0.1, w * 0.05]); g.beginPath(); g.moveTo(w * 0.24, h * 0.3); g.quadraticCurveTo(w * 0.55, h * 0.2, w * 0.56, h * 0.62); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#1b1f4a'; g.beginPath(); g.arc(w * 0.3, h * 0.44, w * 0.06, 0, 7); g.fill();
  bomb(g, w, h, { seed: 95, n: 5, smin: w * 0.1, smax: w * 0.17, zone: (u, v) => v < 0.6 && Math.abs(u - 0.5) < (0.9 - v) * 0.46 });
};
P.board = (g, w, h) => {
  g.fillStyle = '#ef3f1a'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f6f4ee'; g.lineWidth = w * 0.022; rr(g, w * 0.05, w * 0.05, w * 0.9, h * 0.9, w * 0.1); g.stroke();
  g.fillStyle = '#b9b3c9'; g.beginPath(); [[0.3, 0.82], [0.44, 0.3], [0.58, 0.3], [0.72, 0.82], [0.6, 0.82], [0.51, 0.46], [0.42, 0.82]].forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0] * w, p[1] * h)); g.fill();
  g.fillRect(w * 0.26, h * 0.86, w * 0.5, h * 0.035);
  tags(g, w, h, 101, 2, w * 0.2, ['rgba(17,17,17,.8)', 'rgba(255,255,255,.7)']);
  bomb(g, w, h, { seed: 102, n: 15, smin: w * 0.09, smax: w * 0.19, zone: (u, v) => u > 0.08 && u < 0.92 && v > 0.08 && v < 0.92 });
};
P.hexBlack = (g, w, h) => {
  g.fillStyle = '#0c0c0d'; g.fillRect(0, 0, w, h);
  tags(g, w, h, 111, 3, w * 0.22, ['rgba(255,255,255,.75)', 'rgba(30,107,255,.8)']);
  bomb(g, w, h, { seed: 112, n: 11, smin: w * 0.12, smax: w * 0.24, zone: (u, v) => Math.hypot(u - 0.5, v - 0.5) < 0.4 });
};
P.fin = seed => (g, w, h) => {
  g.fillStyle = '#34353a'; g.fillRect(0, 0, w, h);
  tags(g, w, h, seed, 2, w * 0.2, ['rgba(255,255,255,.6)']);
  bomb(g, w, h, { seed: seed + 1, n: 9, smin: w * 0.1, smax: w * 0.18, zone: (u, v) => v > 0.3 && Math.abs(u - 0.5) < (v - 0.08) * 0.5 });
};
P.back = seed => (g, w, h) => {   // costas de alumínio
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#8b8e93'); gr.addColorStop(0.5, '#73767b'); gr.addColorStop(1, '#85888d'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const R = mulberry32(seed); g.globalAlpha = 0.07;
  for (let i = 0; i < 900; i++) { g.fillStyle = R() > 0.5 ? '#fff' : '#000'; g.fillRect(R() * w, R() * h, 20 + R() * 140, 1); }
  g.globalAlpha = 1; g.fillStyle = '#5c5f64'; g.fillRect(0, h * 0.3, w, h * 0.05); g.fillRect(0, h * 0.65, w, h * 0.05);
  g.fillStyle = '#3d3f43'; for (const v of [0.325, 0.675]) for (const u of [0.25, 0.5, 0.75]) { g.beginPath(); g.arc(u * w, v * h, h * 0.016, 0, 7); g.fill(); }
  bomb(g, w, h, { seed: seed + 5, n: 3, smin: h * 0.12, smax: h * 0.2 });
};

// ---------------------------------------------------------------- materiais
const steel = new THREE.MeshStandardMaterial({ color: '#c2c5cb', metalness: 1, roughness: 0.34 });
const gun = new THREE.MeshStandardMaterial({ color: '#55585e', metalness: 1, roughness: 0.36 });
const blackM = new THREE.MeshStandardMaterial({ color: '#0d0d0e', metalness: 0.5, roughness: 0.42 });
const rimMat = new THREE.MeshStandardMaterial({ color: '#cfd1d5', metalness: 0.6, roughness: 0.55 });
const yellowM = new THREE.MeshStandardMaterial({ color: '#f5b400', metalness: 0, roughness: 0.4, side: THREE.DoubleSide });
const backTex = [3, 13, 23].map(s => canvasTex(512, 512, P.back(s)));
const backMats = backTex.map(t => new THREE.MeshStandardMaterial({ map: t, metalness: 0.5, roughness: 0.56 }));
const printMat = (tex, rough = 0.42) => new THREE.MeshStandardMaterial({ map: tex, metalness: 0, roughness: rough });

// ---------------------------------------------------------------- contornos (todos convexos)
function roundPoly(verts, r, seg = 7) {
  const out = [], n = verts.length;
  for (let i = 0; i < n; i++) {
    const p = verts[i], a = verts[(i + n - 1) % n], b = verts[(i + 1) % n];
    const da = [a[0] - p[0], a[1] - p[1]], db = [b[0] - p[0], b[1] - p[1]], la = Math.hypot(da[0], da[1]), lb = Math.hypot(db[0], db[1]);
    const q = Math.min(r, la * 0.45, lb * 0.45), p0 = [p[0] + da[0] / la * q, p[1] + da[1] / la * q], p1 = [p[0] + db[0] / lb * q, p[1] + db[1] / lb * q];
    for (let k = 0; k <= seg; k++) { const u = k / seg, v = 1 - u; out.push([v * v * p0[0] + 2 * u * v * p[0] + u * u * p1[0], v * v * p0[1] + 2 * u * v * p[1] + u * u * p1[1]]); }
  }
  return out;
}
const OUT = {
  rect: (w, h, r = 0.02) => roundPoly([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], r),
  oct: (d, r = 0.02) => { const Rr = d / 2 / Math.cos(PI / 8); return roundPoly(Array.from({ length: 8 }, (_, i) => [Rr * Math.cos(PI / 8 + i * PI / 4), Rr * Math.sin(PI / 8 + i * PI / 4)]), r); },
  circ: d => Array.from({ length: 144 }, (_, i) => [d / 2 * Math.cos(i / 144 * 2 * PI), d / 2 * Math.sin(i / 144 * 2 * PI)]),
  diam: (a, r = 0.05) => roundPoly([[a, 0], [0, a], [-a, 0], [0, -a]], r),
  tri: (w, h, r = 0.07) => roundPoly([[-w / 2, -h / 2], [w / 2, -h / 2], [0, h / 2]], r),
  triDown: (w, h, r = 0.07) => roundPoly([[-w / 2, h / 2], [0, -h / 2], [w / 2, h / 2]], r),
  hex: (d, r = 0.03) => roundPoly(Array.from({ length: 6 }, (_, i) => [d / 2 * Math.cos(i * PI / 3), d / 2 * Math.sin(i * PI / 3)]), r),
};
function profileOf(pts) {   // para cada x, a base e o topo do contorno
  const n = pts.length;
  return x => {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], x0 = a[0], x1 = b[0];
      if (x < Math.min(x0, x1) - 1e-9 || x > Math.max(x0, x1) + 1e-9) continue;
      if (Math.abs(x1 - x0) < 1e-9) { lo = Math.min(lo, a[1], b[1]); hi = Math.max(hi, a[1], b[1]); continue; }
      const y = a[1] + (b[1] - a[1]) * (x - x0) / (x1 - x0); lo = Math.min(lo, y); hi = Math.max(hi, y);
    }
    return [lo, hi];
  };
}
// curva a chapa em volta do eixo vertical (bend) e torce ao longo da largura (twist)
function bender(W, bendDeg, twistDeg = 0) {
  const a = bendDeg * D2R;
  return p => {
    if (Math.abs(a) > 1e-4) { const Rr = W / a, th = p.x / Rr, q = Rr + p.z; p.x = Math.sin(th) * q; p.z = Math.cos(th) * q - Rr; }
    if (twistDeg) { const tw = twistDeg * D2R * (p.x / W), c = Math.cos(tw), s = Math.sin(tw), y = p.y * c - p.z * s, z = p.y * s + p.z * c; p.y = y; p.z = z; }
  };
}
// chapa com espessura a partir de um contorno convexo: frente, costas e borda, em malha fina para poder curvar
function buildPlate(outline, depth, deform, cols = 84, rows = 8) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of outline) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const W = x1 - x0, H = y1 - y0, prof = profileOf(outline), eps = W * 2e-4, v3 = new THREE.Vector3();
  const pts = [];
  for (let i = 0; i <= cols; i++) { const x = lerp(x0 + eps, x1 - eps, i / cols), [lo, hi] = prof(x); for (let j = 0; j <= rows; j++) pts.push([x, lerp(lo, hi, j / rows)]); }
  const id = (i, j) => i * (rows + 1) + j;
  const P3 = z => { const out = []; for (const [x, y] of pts) { v3.set(x, y, z); deform(v3); out.push(v3.x, v3.y, v3.z); } return out; };
  const pf = P3(depth / 2), pb = P3(-depth / 2);
  const face = (pos, flip) => {
    const g = new THREE.BufferGeometry(), uv = [], idx = [];
    for (const [x, y] of pts) uv.push(flip ? 1 - (x - x0) / W : (x - x0) / W, (y - y0) / H);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1);
      if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const loop = [];
  for (let i = 0; i <= cols; i++) loop.push(id(i, rows));
  for (let j = rows - 1; j >= 0; j--) loop.push(id(cols, j));
  for (let i = cols - 1; i >= 0; i--) loop.push(id(i, 0));
  for (let j = 1; j < rows; j++) loop.push(id(0, j));
  const rp = [], get = (arr, k) => [arr[k * 3], arr[k * 3 + 1], arr[k * 3 + 2]];
  for (let k = 0; k < loop.length; k++) {
    const a = loop[k], b = loop[(k + 1) % loop.length], fa = get(pf, a), fb = get(pf, b), ba = get(pb, a), bb = get(pb, b);
    rp.push(...fa, ...fb, ...bb, ...fa, ...bb, ...ba);
  }
  const rim = new THREE.BufferGeometry(); rim.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rim.computeVertexNormals();
  return { front: face(pf, false), back: face(pb, true), rim, W, H };
}
function makeSign({ outline, depth = 0.014, front, back, rim = rimMat, bend = 0, twist = 0 }) {
  let x0 = Infinity, x1 = -Infinity; for (const [x] of outline) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  const g = buildPlate(outline, depth, bender(x1 - x0, bend, twist)), grp = new THREE.Group();
  for (const m of [new THREE.Mesh(g.front, front), new THREE.Mesh(g.back, back), new THREE.Mesh(g.rim, rim)]) { m.castShadow = true; m.receiveShadow = true; grp.add(m); }
  grp.userData.depth = depth; grp.userData.half = (x1 - x0) / 2; grp.userData.deform = bender(x1 - x0, bend, twist); return grp;
}
function rod(a, b, r, mat) {
  const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); m.castShadow = true; m.receiveShadow = true; return m;
}

const anchors = [];      // centros das placas: servem para medir o quanto a imagem anda em cada quadro
const POLE_R = 0.068;
// phi: para onde a placa fica em relação ao poste · rho: distância do eixo · face: para onde a frente aponta
function place(obj, { y, phi = 0, rho = 0, face = phi, tilt = 0, roll = 0, arm = true }) {
  obj.position.set(Math.sin(phi * D2R) * rho, y, Math.cos(phi * D2R) * rho);
  obj.rotation.set(tilt * D2R, face * D2R, roll * D2R, 'YXZ');
  totem.add(obj); anchors.push(obj.position.clone());
  if (arm === 'edge') {   // placa de duas faces: a haste entra pela ponta mais próxima do poste, para não cruzar nenhuma das faces
    const ends = [1, -1].map(sg => { const p = new THREE.Vector3(sg * obj.userData.half * 0.97, 0, 0); obj.userData.deform(p); return p.applyEuler(obj.rotation).add(obj.position); });
    const end = Math.hypot(ends[0].x, ends[0].z) < Math.hypot(ends[1].x, ends[1].z) ? ends[0] : ends[1];
    totem.add(rod(new THREE.Vector3(0, end.y, 0), end, 0.016, steel));
    const cl = new THREE.Mesh(new THREE.CylinderGeometry(POLE_R + 0.02, POLE_R + 0.02, 0.06, 28), gun); cl.position.set(0, end.y, 0); cl.castShadow = true; totem.add(cl);
  } else if (arm) {
    const n = new THREE.Vector3(0, 0, 1).applyEuler(obj.rotation), dep = obj.userData.depth || 0.02;
    const end = obj.position.clone().addScaledVector(n, -(dep / 2 + 0.012)), start = new THREE.Vector3(0, y + 0.02, 0);
    totem.add(rod(start, end, 0.011, steel));
    const cl = new THREE.Mesh(new THREE.CylinderGeometry(POLE_R + 0.02, POLE_R + 0.02, 0.05, 28), gun); cl.position.set(0, y + 0.02, 0); cl.castShadow = true; totem.add(cl);
  }
  return obj;
}

// ---------------------------------------------------------------- o poste
{
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(POLE_R, POLE_R, 3.62, 40), steel); tube.position.y = 1.81; tube.castShadow = true; tube.receiveShadow = true; totem.add(tube);
  const sleeves = [[0.03, 0.34, POLE_R + 0.014, gun], [0.62, 0.86, POLE_R + 0.008, steel], [1.52, 1.78, POLE_R + 0.011, gun], [2.36, 2.5, POLE_R + 0.008, steel], [3.14, 3.3, POLE_R + 0.012, gun]];
  for (const [a, b, r, m] of sleeves) { const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, b - a, 40), m); s.position.y = (a + b) / 2; s.castShadow = true; s.receiveShadow = true; totem.add(s); }
  for (const y of [0.34, 0.62, 0.86, 1.52, 1.78, 2.36, 2.5, 3.14, 3.3]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(POLE_R + 0.02, POLE_R + 0.02, 0.022, 40), steel); c.position.y = y; totem.add(c); }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(POLE_R + 0.008, POLE_R + 0.008, 0.12, 40), blackM); cap.position.y = 3.62; totem.add(cap);
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.03, 0.46, 3, 0.008), gun); base.position.y = 0.015; base.receiveShadow = true; totem.add(base);
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.05, 40), steel); fl.position.y = 0.055; totem.add(fl);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6), steel); b.position.set(sx * 0.18, 0.04, sz * 0.18); totem.add(b); }
  // adesivos enrolados no tubo
  const kinds = ['label', 'smiley', 'star', 'rings', 'barcode', 'bolt', 'heart', 'eye', 'arrow', 'burst', 'num', 'stripes', 'checker', 'round'];
  const R = mulberry32(2024), tex = kinds.map((k, i) => canvasTex(256, 256, g => { g.translate(128, 128); SK[k](g, k === 'label' || k === 'stripes' || k === 'barcode' ? 120 : 150, mulberry32(i * 7 + 3)); }));
  for (let i = 0; i < 36; i++) {
    const hgt = 0.075 + R() * 0.07, y = 0.5 + R() * 2.85, r = POLE_R + 0.0125 + (i % 3) * 0.0006, th = R() * 2 * PI, len = hgt / r;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hgt, 14, 1, true, th, len), new THREE.MeshStandardMaterial({ map: tex[i % tex.length], transparent: true, alphaTest: 0.5, roughness: 0.38 }));
    m.position.y = y; m.rotation.z = (R() - 0.5) * 0.12; totem.add(m);
  }
}

// ---------------------------------------------------------------- placas luminosas "a esquina"
const lightRim = new THREE.MeshStandardMaterial({ color: '#2a0500', emissive: '#ff2c00', emissiveIntensity: 0.9, roughness: 0.5 });
const lightboxes = [];
function lightbox(w, h, d, bend, tex, pos) {
  const mat = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissiveMap, emissive: '#ffffff', emissiveIntensity: 1.7, roughness: 0.78, metalness: 0 });
  const s = makeSign({ outline: OUT.rect(w, h, 0.012), depth: d, front: mat, back: mat, rim: lightRim, bend });
  place(s, { ...pos, arm: 'edge' }); lightboxes.push(s); return s;
}
lightbox(1.30, 0.38, 0.075, 28, lightboxTex(2048, 600, (g, w, h) => lockup(g, w * 0.57, h * 0.56, h * 0.6), { seed: 201, n: 11, smin: 70, smax: 130, zone: (u, v) => u < 0.2 || u > 0.93 || (v < 0.2 && u < 0.3) }), { y: 2.62, phi: -80, rho: 0.80, face: 8, roll: 4 });
lightbox(0.62, 0.50, 0.08, 24, lightboxTex(1024, 826, (g, w, h) => lockup(g, w * 0.5, h * 0.55, h * 0.31, -0.14), { seed: 202, n: 11, smin: 60, smax: 110, zone: (u, v) => v < 0.2 || v > 0.84 || u > 0.9 }), { y: 1.98, phi: 62, rho: 0.55, face: 25, roll: -6 });
lightbox(0.60, 0.34, 0.07, 18, lightboxTex(1024, 580, (g, w, h) => lockup(g, w * 0.52, h * 0.56, h * 0.44, 0.06), { seed: 203, n: 8, smin: 50, smax: 90, zone: (u, v) => u < 0.12 || u > 0.9 || v > 0.86 }), { y: 2.12, phi: 160, rho: 0.55, face: 165, roll: -8 });
lightbox(0.60, 0.38, 0.07, 20, lightboxTex(1024, 650, (g, w, h) => lockup(g, w * 0.5, h * 0.56, h * 0.42, -0.2), { seed: 204, n: 10, smin: 55, smax: 100, zone: (u, v) => v < 0.16 || v > 0.86 || u < 0.1 }), { y: 1.55, phi: 40, rho: 0.55, face: 50, roll: 7 });

// ---------------------------------------------------------------- placas de chapa
const sign = (outline, tex, pos, o = {}) => place(makeSign({ outline, front: printMat(tex, o.rough), back: backMats[(o.b || 0) % 3], depth: o.depth || 0.014, bend: o.bend || 0, twist: o.twist || 0 }), pos);
sign(OUT.rect(0.92, 0.25, 0.03), canvasTex(1840, 500, P.marca), { y: 2.74, phi: 100, rho: 0.63, face: 170, roll: 5 }, { bend: 8, b: 1, rough: 0.28 });
sign(OUT.oct(0.72), canvasTex(1024, 1024, P.pare), { y: 2.48, phi: 65, rho: 0.68, face: 35, roll: -24, tilt: -4 }, { b: 2, depth: 0.018 });
sign(OUT.circ(0.74), canvasTex(1024, 1024, P.opa), { y: 3.0, phi: -150, rho: 0.42, face: -165, roll: -8, tilt: 5 }, { b: 0, bend: 6 });
sign(OUT.diam(0.33, 0.06), canvasTex(1024, 1024, P.obras), { y: 2.3, phi: -125, rho: 0.74, face: -140, roll: -8 }, { b: 1, bend: 10 });
sign(OUT.rect(0.30, 0.40, 0.025), canvasTex(600, 800, P.mao), { y: 2.28, phi: 0, rho: 0.108, face: 0, roll: 3, arm: false }, { b: 2 });
sign(OUT.rect(0.95, 0.26, 0.03), canvasTex(1900, 520, P.rua), { y: 1.92, phi: -100, rho: 0.62, face: -15, roll: -7 }, { bend: 18, twist: 8, b: 0 });
sign(OUT.rect(0.95, 0.20, 0.02), canvasTex(1900, 400, P.redLong), { y: 1.12, phi: 85, rho: 0.62, face: 10, roll: 5 }, { bend: 12, twist: -6, b: 1 });
sign(OUT.rect(0.26, 0.26, 0.03), canvasTex(512, 512, P.green), { y: 1.02, phi: -5, rho: 0.108, face: -8, roll: -4, arm: false }, { b: 2 });
sign(OUT.diam(0.2, 0.035), canvasTex(512, 512, P.devagar), { y: 0.92, phi: -170, rho: 0.34, face: -175, roll: 3 }, { b: 0 });
sign(OUT.tri(0.60, 0.54), canvasTex(1024, 920, P.triYellow), { y: 1.85, phi: -160, rho: 0.5, face: -170, roll: 8 }, { b: 1, bend: 12 });
sign(OUT.triDown(0.55, 0.5), canvasTex(1024, 930, P.shield), { y: 1.4, phi: -135, rho: 0.62, face: -150, roll: -22 }, { b: 2, bend: 10 });
sign(OUT.rect(0.62, 0.62, 0.075), canvasTex(1024, 1024, P.board), { y: 1.42, phi: 140, rho: 0.62, face: 150, roll: 12 }, { b: 0, bend: 14 });
sign(OUT.hex(0.5), canvasTex(1024, 887, P.hexBlack), { y: 1.5, phi: 95, rho: 0.45, face: 95, roll: 10 }, { b: 1 });
sign(OUT.tri(0.5, 0.42), canvasTex(1024, 860, P.fin(121)), { y: 1.38, phi: -55, rho: 0.5, face: -40, roll: 15, tilt: 8 }, { b: 2, bend: 16 });
sign(OUT.tri(0.5, 0.42), canvasTex(1024, 860, P.fin(131)), { y: 1.22, phi: -120, rho: 0.5, face: -100, roll: -20, tilt: -6 }, { b: 0, bend: -12 });

// ---------------------------------------------------------------- semáforo
const lamp = { red: null, green: null, redL: null, greenL: null };
{
  const ledTex = mode => canvasTex(512, 512, (g, w) => {
    g.fillStyle = mode === 'off' ? '#2a2b2e' : mode === 'red' ? '#3a0400' : '#012c0e'; g.fillRect(0, 0, w, w);
    const sp = w / 19, r = sp * 0.39;
    for (let row = -1; row < 24; row++) for (let c = -1; c < 21; c++) {
      const x = c * sp + (row % 2 ? sp / 2 : 0), y = row * sp * 0.866, d = Math.hypot(x - 256, y - 256) / 244; if (d > 1) continue;
      const gr = g.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
      if (mode === 'off') { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#8f9298'); }
      else if (mode === 'red') { const hot = d < 0.42; gr.addColorStop(0, hot ? '#fff0b0' : '#ff8a5a'); gr.addColorStop(1, hot ? '#ff8a10' : '#ff1c08'); }
      else { gr.addColorStop(0, '#9dffc0'); gr.addColorStop(1, '#10d860'); }
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    if (mode === 'green') {
      g.save(); g.translate(256, 262); g.rotate(-0.26); g.shadowColor = '#b8ffd0'; g.shadowBlur = 26;
      heavy(g, COPY.vai, 0, 62, 200, { color: 'rgba(244,255,246,.96)', align: 'center', track: -0.04, skew: -0.16, fat: 0.02 }); g.restore();
    }
  });
  const tl = new THREE.Group(), offT = ledTex('off');
  const box = new RoundedBoxGeometry(0.33, 0.37, 0.2, 5, 0.035), body = new THREE.MeshStandardMaterial({ color: '#f5b400', metalness: 0, roughness: 0.36 });
  for (const [k, y] of [['red', 0.19], ['green', -0.19]]) {
    const b = new THREE.Mesh(box, body); b.position.y = y; b.castShadow = true; b.receiveShadow = true; tl.add(b);
    const off = new THREE.Mesh(new THREE.CircleGeometry(0.122, 56), new THREE.MeshStandardMaterial({ map: offT, roughness: 0.5, metalness: 0 })); off.position.set(0, y, 0.1012); tl.add(off);
    const on = new THREE.Mesh(new THREE.CircleGeometry(0.122, 56), new THREE.MeshBasicMaterial({ map: ledTex(k), transparent: true, toneMapped: false })); on.material.color.setScalar(1.7); on.position.set(0, y, 0.1022); tl.add(on); lamp[k] = on;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.011, 10, 56), body); ring.position.set(0, y, 0.102); tl.add(ring);
    // pala: meio tubo cortado em diagonal, mais comprido em cima
    const vg = new THREE.CylinderGeometry(0.138, 0.138, 0.2, 44, 1, true, PI - 2.2, 4.4), p = vg.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { const th = Math.atan2(p.getX(i), p.getZ(i)); p.setY(i, -0.1 + 0.075 + 0.14 * (0.5 - 0.5 * Math.cos(th))); }
    vg.rotateX(PI / 2); vg.computeVertexNormals();
    const visor = new THREE.Mesh(vg, yellowM); visor.position.set(0, y, 0.2); visor.castShadow = true; tl.add(visor);
    const L = new THREE.PointLight(k === 'red' ? '#ff2a10' : '#20ff70', 0, 1.6, 2); L.position.set(0, y, 0.22); tl.add(L); lamp[k + 'L'] = L;
  }
  for (const y of [0.4, -0.4]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 24), body); c.position.y = y; tl.add(c); }
  const stT = ['label', 'star', 'round', 'barcode', 'heart'].map((k, i) => canvasTex(256, 256, g => { g.translate(128, 128); SK[k](g, k === 'label' || k === 'barcode' ? 120 : 150, mulberry32(i * 11 + 50)); }));
  [[1, 0.24, 0.02, 0.11], [1, 0.07, -0.03, 0.09], [1, -0.2, 0.03, 0.12], [-1, 0.16, 0, 0.1], [-1, -0.22, -0.02, 0.11]].forEach(([sx, y, z, s], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshStandardMaterial({ map: stT[i], transparent: true, alphaTest: 0.5, roughness: 0.4 })); m.position.set(sx * 0.1662, y, z); m.rotation.set(0, sx * PI / 2, (i - 2) * 0.3); tl.add(m);
  });
  tl.userData.depth = 0.2;
  place(tl, { y: 3.02, phi: 20, rho: 0.33, face: 12, tilt: -3, roll: 3, arm: false });
  for (const dy of [0.42, -0.42]) totem.add(rod(new THREE.Vector3(0, 3.02 + dy, 0), tl.position.clone().add(new THREE.Vector3(0, dy, 0)), 0.02, gun));
}

// ---------------------------------------------------------------- cone no topo e capacete pendurado
{
  const pts = []; for (let i = 0; i <= 28; i++) { const u = i / 28; pts.push(new THREE.Vector2(lerp(0.17, 0.04, u), u * 0.62)); } pts.push(new THREE.Vector2(0.0, 0.625));
  const tex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#ff5208'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f2ea'; g.fillRect(0, h * 0.2, w, h * 0.14); g.fillRect(0, h * 0.44, w, h * 0.17);
    const R = mulberry32(8); g.globalAlpha = 0.14; g.fillStyle = '#2a1206'; for (let i = 0; i < 70; i++) g.fillRect(R() * w, R() * h, 2 + R() * 5, 30 + R() * 120); g.globalAlpha = 1;
  });
  const cone = new THREE.Group(), body = new THREE.Mesh(new THREE.LatheGeometry(pts, 56), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, side: THREE.DoubleSide })); body.castShadow = true; cone.add(body);
  const foot = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.03, 0.42, 3, 0.012), new THREE.MeshStandardMaterial({ color: '#e24400', roughness: 0.6 })); foot.castShadow = true; cone.add(foot);
  cone.position.set(0.03, 3.5, -0.02); cone.rotation.set(-10 * D2R, 0.5, 21 * D2R); totem.add(cone); anchors.push(new THREE.Vector3(0, 3.8, 0));

  const hat = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.3 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 40, 20, 0, 2 * PI, 0, PI / 2), white); dome.scale.set(1.08, 0.92, 1.25); dome.castShadow = true; hat.add(dome);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.012, 40), white); brim.scale.set(1, 1, 1.3); brim.position.z = 0.03; brim.castShadow = true; hat.add(brim);
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.139, 0.014, 8, 40, PI), white); ridge.rotation.y = PI / 2; ridge.scale.set(1, 0.95, 1); hat.add(ridge);
  const hs = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, g => { g.translate(128, 128); SK.smiley(g, 150); }), transparent: true, alphaTest: 0.5 })); hs.position.set(0, 0.07, 0.172); hs.rotation.x = -0.45; hat.add(hs);
  hat.userData.depth = 0.2;
  place(hat, { y: 1.66, phi: 175, rho: 0.3, face: 160, tilt: 38, roll: 14 });
}

// ---------------------------------------------------------------- chão espelhado e fundo
const floor = new Reflector(new THREE.PlaneGeometry(60, 60), {
  textureWidth: IW, textureHeight: IH, clipBias: 0.002, multisample: 0, color: 0xffffff,
  shader: {
    name: 'ChaoPolido',
    uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null } },
    vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
      void main() { vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; varying vec4 vUv; varying vec3 vW;
      void main() {
        vec3 acc = vec3(0.0); float d = length(vW.xz), blur = 0.002 + 0.004 * clamp(d / 3.0, 0.0, 1.0);
        for (int i = 0; i < 8; i++) { float a = float(i) * 0.7854; acc += texture2DProj(tDiffuse, vUv + vec4(cos(a), sin(a), 0.0, 0.0) * blur * vUv.w).rgb; }
        acc = (acc + texture2DProj(tDiffuse, vUv).rgb) / 9.0;
        vec3 v = normalize(cameraPosition - vW); float fres = mix(0.24, 0.75, pow(1.0 - abs(v.y), 2.5));
        gl_FragColor = vec4(min(acc, vec3(6.0)) * fres * exp(-d * d / 30.0), 1.0);
      }`,
  },
});
floor.rotation.x = -PI / 2; scene.add(floor);

const CENTER = new THREE.Vector3(0, 2.15, 0);
// névoa vermelha: um cartaz de luz que fica sempre atrás do poste, de frente para a câmera.
// Como é um objeto da cena, o chão o espelha e o poste o encobre.
const halo = new THREE.Mesh(new THREE.PlaneGeometry(13, 9), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vP;
    void main() {
      float a = exp(-(vP.x * vP.x / 2.2 + vP.y * vP.y / 3.4)), b = exp(-(vP.x * vP.x / 14.0 + vP.y * vP.y / 9.0));
      float edge = smoothstep(6.5, 4.0, abs(vP.x)) * smoothstep(4.5, 2.6, abs(vP.y)) * smoothstep(-2.0, -0.2, vP.y);   // some antes de tocar o chão
      gl_FragColor = vec4((vec3(0.085, 0.006, 0.003) * a + vec3(0.02, 0.0012, 0.0008) * b) * edge, 1.0);
    }`,
}));
halo.renderOrder = -1; scene.add(halo);

// ---------------------------------------------------------------- luz
{
  // ambiente: um estúdio escuro com painéis, só para o metal ter o que refletir
  const env = new THREE.Scene(), panel = (w, h, pos, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...col), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(0, 2, 0); env.add(m); };
  env.add(new THREE.Mesh(new THREE.SphereGeometry(40, 16, 8), new THREE.MeshBasicMaterial({ color: '#030303', side: THREE.BackSide })));
  panel(7, 7, [0, 9, 1], [2.6, 2.4, 2.2]); panel(3, 6, [7, 2.5, 5], [2.2, 2.0, 1.8]); panel(3, 6, [-8, 2.5, 1], [4.0, 1.3, 0.3]);
  panel(5, 5, [1, 2.5, -8], [3.0, 0.35, 0.2]); panel(1.2, 7, [7, 3, -5], [2.0, 1.9, 1.8]); panel(1.2, 7, [-6, 3, 6], [1.6, 1.6, 1.7]);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.03).texture; scene.environmentIntensity = 0.4; pm.dispose();
}
scene.add(new THREE.AmbientLight('#2a1410', 0.25));
for (const [az, col, I] of [[35, '#fff0de', 29], [125, '#ffd2b0', 19], [215, '#fff0de', 28], [305, '#ffc8a0', 19]]) {
  const s = new THREE.SpotLight(col, I, 16, 0.42, 0.9, 2); s.position.set(Math.sin(az * D2R) * 5.2, 5.4, Math.cos(az * D2R) * 5.2); s.target.position.set(0, 2.0, 0);
  s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0005; s.shadow.normalBias = 0.012; s.shadow.camera.near = 2; s.shadow.camera.far = 12; scene.add(s, s.target);
}
for (const [x, z] of [[2.6, -2.2], [-2.6, 2.0]]) { const l = new THREE.PointLight('#ff2410', 2.2, 9, 2); l.position.set(x, 0.5, z); scene.add(l); }
for (const lb of lightboxes) for (const sgn of [1, -1]) { const n = new THREE.Vector3(0, 0, sgn * 0.45).applyEuler(lb.rotation), l = new THREE.PointLight('#ff6410', 0.16, 2.4, 2); l.position.copy(lb.position).add(n); scene.add(l); }
const flash = new THREE.PointLight('#fff4e6', 4, 0, 2); scene.add(flash);   // luz presa à câmera, como um flash

// ---------------------------------------------------------------- câmera
// t, azimute, raio, altura, alvo x, y, z, giro, campo de visão
const CAM = [
  [-0.70,  86, 3.00, 2.25,  0.00, 2.32,  0.00,  -9, 64],
  [0.00,   44, 2.45, 2.34,  0.00, 2.36,  0.00,  -6, 64],
  [0.95,  -46, 1.42, 2.50, -0.50, 2.60,  0.10,   7, 68],   // a placa luminosa
  [1.60,  -41, 1.34, 2.54, -0.44, 2.63,  0.08,   5, 68],
  [2.75,    6, 1.62, 3.00,  0.10, 3.04,  0.20,  -2, 64],   // semáforo
  [3.20,   11, 1.57, 3.02,  0.12, 3.02,  0.20,  -3, 64],
  [3.90,   24, 1.50, 2.94,  0.30, 2.82,  0.24,  -6, 65],   // desliza até o PARE entrar
  [4.35,  105, 1.45, 2.74,  0.35, 2.66,  0.05,  10, 70],   // chicote 1, rente à ponta da placa da marca
  [4.85,  190, 1.70, 2.80,  0.18, 2.78, -0.20,   5, 66],   // marca e opa
  [6.10,  202, 2.15, 2.70,  0.05, 2.62, -0.10,  -3, 64],
  [7.30,  246, 1.60, 3.40,  0.00, 3.25,  0.00,   8, 66],   // topo, o cone
  [8.05,  320, 2.35, 3.00,  0.10, 2.80,  0.10,   2, 62],   // volta por fora
  [8.90,  394, 1.65, 2.82,  0.34, 2.66,  0.25,  -7, 66],
  [9.80,  416, 1.20, 2.68,  0.48, 2.52,  0.25, -10, 68],   // encosta no PARE
  [10.80, 580, 1.80, 1.42,  0.00, 1.60, -0.10,   8, 66],   // chicote 2 -> placas de adesivo, embaixo
  [11.40, 584, 1.80, 1.48,  0.00, 1.64, -0.10,   6, 66],
  [12.95, 594, 1.42, 2.80, -0.18, 2.90, -0.30,  -6, 66],   // sobe devagar até o opa
  [14.30, 727, 3.85, 2.06,  0.00, 2.02,  0.00,   0, 56],   // recua: o totem inteiro
  [15.00, 749, 4.05, 2.03,  0.00, 2.00,  0.00,   0, 55],
  [16.00, 781, 4.30, 2.00,  0.00, 1.98,  0.00,   0, 55],   // depois do fim: a câmera segue derivando, não freia
];
const TR = [1, 2, 3, 4, 5, 6, 7, 8].map(c => track(CAM.map(k => [k[0], k[c]])));
const wob = (t, f, p) => Math.sin(t * f + p) * 0.6 + Math.sin(t * f * 2.31 + p * 1.7) * 0.4;
const _tgt = new THREE.Vector3();
function camAt(t) {
  const [az, r, h, tx, ty, tz, roll, fov] = TR.map(f => f(t));
  camera.position.set(Math.sin(az * D2R) * r + wob(t, 1.3, 0) * 0.012 * r, h + wob(t, 1.7, 2) * 0.01 * r, Math.cos(az * D2R) * r + wob(t, 1.1, 4) * 0.012 * r);
  _tgt.set(tx + wob(t, 0.9, 1) * 0.006, ty + wob(t, 1.2, 3) * 0.006, tz);
  camera.up.set(0, 1, 0); camera.lookAt(_tgt); camera.rotateZ((roll + wob(t, 0.8, 5) * 0.5) * D2R);
  camera.fov = fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
}
const _d = new THREE.Vector3();
function aim() {   // o que acompanha a câmera: o flash e a névoa de fundo
  const d = camera.position.distanceTo(CENTER);
  flash.position.copy(camera.position).add(_d.set(0.22, 0.3, 0).applyQuaternion(camera.quaternion));
  flash.intensity = 1.0 * Math.pow(d, 1.9);
  _d.set(-camera.position.x, 0, -camera.position.z).normalize();
  halo.position.set(_d.x * 1.9, 2.0, _d.z * 1.9); halo.rotation.set(0, Math.atan2(-_d.x, -_d.z), 0);
}
function setScene(t) {
  camAt(t);
  aim();
  // semáforo: vermelho, abre aos 3,15 s, fecha de novo aos 7,4 s
  const g = smooth(3.12, 3.2, t) * (1 - smooth(7.36, 7.44, t)), r = 1 - g;
  lamp.red.material.opacity = r; lamp.red.visible = r > 0.01; lamp.green.material.opacity = g; lamp.green.visible = g > 0.01;
  lamp.redL.intensity = r * 0.07; lamp.greenL.intensity = g * 0.06;
}

// ---------------------------------------------------------------- pós: acúmulo de desfoque, brilho e lente
const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
const rtScene = new THREE.WebGLRenderTarget(IW, IH, { ...rtOpts, depthBuffer: true });
const rtAccum = new THREE.WebGLRenderTarget(IW, IH, { type: FLOAT_BLEND ? THREE.FloatType : THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
const quadVS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const accumMat = new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: null }, w: { value: 1 } }, vertexShader: quadVS, depthTest: false, depthWrite: false,
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  fragmentShader: `uniform sampler2D tSrc; uniform float w; varying vec2 vUv;
    void main() { vec3 c = texture2D(tSrc, vUv).rgb; if (!(c.r >= 0.0) || !(c.g >= 0.0) || !(c.b >= 0.0)) c = vec3(0.0); gl_FragColor = vec4(min(c, vec3(40.0)) * w, w); }`,
});
const accumQuad = new FullScreenQuad(accumMat);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(IW, IH, rtOpts));
composer.addPass(new TexturePass(rtAccum.texture));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(IW, IH), 0.18, 0.8, 0.85));
const lens = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uK: { value: 0.2 }, uCA: { value: 0.006 }, uExp: { value: 1.0 }, uVig: { value: 0.42 }, uFrame: { value: 0 }, uAspect: { value: VW / VH } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uK, uCA, uExp, uVig, uFrame, uAspect; varying vec2 vUv;
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    vec3 neutral(vec3 c) {   // Khronos PBR Neutral: comprime o brilho sem lavar a cor
      float x = min(c.r, min(c.g, c.b)), off = x < 0.08 ? x - 6.25 * x * x : 0.04; c -= off;
      float peak = max(c.r, max(c.g, c.b)); if (peak < 0.76) return c;
      float d = 0.24, np = 1.0 - d * d / (peak + d - 0.76); c *= np / peak;
      return mix(c, vec3(np), 1.0 - 1.0 / (0.15 * (peak - np) + 1.0));
    }
    void main() {
      vec2 c = vUv - 0.5; c.x *= uAspect; float r2 = dot(c, c), m = (uAspect * uAspect + 1.0) * 0.25, rn = r2 / m;
      c *= (1.0 + uK * r2) / (1.0 + uK * m); c.x /= uAspect;          // distorção de barril: amplia o centro, mantém os cantos
      vec3 col = vec3(texture2D(tDiffuse, 0.5 + c * (1.0 - uCA * rn)).r, texture2D(tDiffuse, 0.5 + c * (1.0 - 0.5 * uCA * rn)).g, texture2D(tDiffuse, 0.5 + c).b);
      if (!(col.r >= 0.0) || !(col.g >= 0.0) || !(col.b >= 0.0)) col = vec3(0.0);
      col *= uExp * mix(1.0, 1.0 - uVig, smoothstep(0.25, 1.0, rn));
      col = neutral(col);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = mix(vec3(l), col, 1.1);
      col = mix(12.92 * col, 1.055 * pow(max(col, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));
      float n = hash(gl_FragCoord.xy + uFrame * vec2(17.13, 31.71)) + hash(gl_FragCoord.yx * 1.37 + uFrame * vec2(7.7, 3.3)) - 1.0;
      col += n * 0.017 * (0.5 + 0.5 * (1.0 - l));
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
});
composer.addPass(lens);

// quantas amostras de desfoque o quadro precisa: mede o quanto as placas andam na tela durante a exposição
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function samplesFor(t) {
  const proj = tt => { camAt(tt); return anchors.map(p => { _a.copy(p).project(camera); return [_a.x * IW / 2, _a.y * IH / 2, _a.z]; }); };
  const A = proj(t - SHUTTER / FPS / 2), B = proj(t + SHUTTER / FPS / 2); let mx = 0;
  for (let i = 0; i < A.length; i++) { if (A[i][2] > 1 || B[i][2] > 1) continue; mx = Math.max(mx, Math.hypot(Math.min(IW, Math.abs(B[i][0] - A[i][0])), Math.min(IH, Math.abs(B[i][1] - A[i][1])))); }
  return Math.round(clamp(mx / 5, 8, 72));
}
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
function shoot(N, sceneFor, frame) {
  renderer.setRenderTarget(rtAccum); renderer.setClearColor(0x000000, 0); renderer.clear();
  for (let i = 0; i < N; i++) {
    sceneFor(i);
    camera.setViewOffset(IW, IH, halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5, IW, IH);
    renderer.setRenderTarget(rtScene); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
    accumMat.uniforms.tSrc.value = rtScene.texture; accumMat.uniforms.w.value = 1 / N;
    renderer.setRenderTarget(rtAccum); const ac = renderer.autoClear; renderer.autoClear = false; accumQuad.render(renderer); renderer.autoClear = ac;
  }
  camera.clearViewOffset(); renderer.setRenderTarget(null);
  lens.uniforms.uFrame.value = frame; composer.render();
}
function renderAt(t) {
  const N = samplesFor(t);
  shoot(N, i => setScene(t + ((i + 0.5) / N - 0.5) * SHUTTER / FPS), Math.round(t * FPS));
  return N;
}
// vista parada, para conferir a montagem de qualquer ângulo
function renderView({ az, r, h, ty, fov = 60 }) {
  shoot(8, () => {
    setScene(3.2); camera.position.set(Math.sin(az * D2R) * r, h, Math.cos(az * D2R) * r); camera.up.set(0, 1, 0); camera.lookAt(0, ty, 0); camera.fov = fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    aim();
  }, 0);
}

// ---------------------------------------------------------------- sombras (uma vez) e API
renderer.shadowMap.needsUpdate = true;
setScene(0); renderer.setRenderTarget(rtScene); renderer.render(scene, camera); renderer.setRenderTarget(null);

window.KEYS = [
  { id: '01-abertura', t: 0.03 }, { id: '02-a-esquina', t: 1.3 }, { id: '03-sinal-vermelho', t: 2.95 }, { id: '04-sinal-verde', t: 3.5 },
  { id: '05-chicote', t: 4.4 }, { id: '06-marca-e-opa', t: 5.4 }, { id: '07-cone', t: 7.3 }, { id: '08-pare', t: 9.7 },
  { id: '09-adesivos', t: 11.15 }, { id: '10-opa', t: 12.9 }, { id: '11-totem', t: 14.8 },
];
window.DURATION = DURATION;
window.renderAt = renderAt;
window.renderView = renderView;
const dbg = renderer.getContext().getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = (dbg ? renderer.getContext().getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu?') + ' · float blend: ' + FLOAT_BLEND;
window.ready = true;
