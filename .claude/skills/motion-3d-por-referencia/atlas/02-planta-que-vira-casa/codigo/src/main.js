// planta-casa: a planta baixa de uma casa térrea se desenha na folha, vira aramado 3D
// e é construída por etapas (fundação, paredes, telhado) em cima da própria planta.
// Tudo procedural: geometria, linhas e texturas saem deste arquivo. A única coisa de
// arquivo é a fonte Inter, usada nos textos desenhados em canvas.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const VW = 1920, VH = 1080;
const PI = Math.PI, RAD = PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eio = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eo = x => 1 - Math.pow(1 - x, 3);
const smooth = (x, a, b) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const back = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- temas (a cor da folha)
// line = traço cheio · hidden = aresta oculta (tracejada) · text = letreiro · badge = bolinha numerada
const TEMAS = {
  papel:     { sheet: '#f6f5f4', line: '#0075de', hidden: '#86bbf0', text: '#02093a', badge: '#0075de', badgeNum: '#ffffff', accent: '#f5b82e', accentNum: '#02093a', grid: [0.075, 0.17], poche: 0.16, shadow: '#0b2c5e', shadowA: 0.24, table: '#7c5a40', dark: false },
  verde:     { sheet: '#0f4a41', line: '#f4f2ea', hidden: '#86b3a6', text: '#f4f2ea', badge: '#f4f2ea', badgeNum: '#0f4a41', accent: '#f5b82e', accentNum: '#0f4a41', grid: [0.07, 0.16], poche: 0.2, shadow: '#021512', shadowA: 0.42, table: '#b08a63', dark: true },
  grafite:   { sheet: '#2b2d33', line: '#f6f5f4', hidden: '#8f939c', text: '#f6f5f4', badge: '#f6f5f4', badgeNum: '#2b2d33', accent: '#f5b82e', accentNum: '#2b2d33', grid: [0.06, 0.14], poche: 0.2, shadow: '#000000', shadowA: 0.42, table: '#b89572', dark: true },
  terracota: { sheet: '#b4533a', line: '#fdf4e6', hidden: '#e2a48f', text: '#fdf4e6', badge: '#fdf4e6', badgeNum: '#b4533a', accent: '#ffd166', accentNum: '#5a2416', grid: [0.08, 0.18], poche: 0.22, shadow: '#3a1208', shadowA: 0.4, table: '#3b2c24', dark: true },
};
const q = new URLSearchParams(location.search);
const TEMA = TEMAS[q.get('tema')] ?? TEMAS.papel;
const rgba = (hex, a) => { const c = new THREE.Color(hex); return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`; };
function shade(hex, dl) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, dl); return '#' + c.getHexString(); }

// cores das peças sólidas (iguais em qualquer tema)
const BASE = { concreto: '#d3d0ca', pedra: '#e3dfd7', divisoria: '#f4efe6', madeira: '#d9b381', vidro: '#c9e2f8' };
const CASAS = {
  // casa caiada: parede branca, telha de barro, esquadrias e barrado azuis
  colonial: { parede: '#fffdf8', telha: '#bf4d32', cumeeira: '#a8412a', beiral: '#fffdf8', chamine: '#fffdf8', chapeu: '#bf4d32', esquadria: '#0075de', porta: '#0075de', macaneta: '#f5b82e', barrado: '#0075de' },
  branca:   { parede: '#fffdf8', telha: '#1f66c9', cumeeira: '#184fa0', beiral: '#fffdf8', chamine: '#fffdf8', chapeu: '#02093a', esquadria: '#02093a', porta: '#f5b82e', macaneta: '#02093a', barrado: '#e9e4da' },
  amarela:  { parede: '#f9d268', telha: '#2a3a78', cumeeira: '#1f2c60', beiral: '#ffffff', chamine: '#ffffff', chapeu: '#2a3a78', esquadria: '#ffffff', porta: '#ef6a5b', macaneta: '#02093a', barrado: '#ffffff' },
  azul:     { parede: '#a9cdf5', telha: '#2a3a78', cumeeira: '#1f2c60', beiral: '#ffffff', chamine: '#ffffff', chapeu: '#2a3a78', esquadria: '#ffffff', porta: '#f5b82e', macaneta: '#02093a', barrado: '#ffffff' },
  creme:    { parede: '#f8f5ef', telha: '#e0654b', cumeeira: '#c7523c', beiral: '#f4efe6', chamine: '#ebe6dd', chapeu: '#b6b2ab', esquadria: '#0075de', porta: '#f5b82e', macaneta: '#02093a' },
};
const C = { ...BASE, ...(CASAS[q.get('casa')] ?? CASAS.azul) };

// ---------------------------------------------------------------- fonte
const inter = new FontFace('Inter', 'url(./fontes/Inter-var.woff2)', { weight: '100 900' });
await inter.load(); document.fonts.add(inter);
const CAP = 0.727;                       // altura da maiúscula da Inter, em em

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(VW, VH, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const MAXA = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
scene.background = new THREE.Color(TEMA.table);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

const camera = new THREE.PerspectiveCamera(30, VW / VH, 1, 160);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAXA;
  return t;
}

// ---------------------------------------------------------------- medidas (metros)
// folha: maior que o quadro. Na vista de cima a câmera enxerga 24 × 13,5 em volta da origem;
// a sobra fica atrás e à esquerda, que é o que aparece quando a câmera inclina.
const SHEET = { x0: -19, x1: 14.6, z0: -15, z1: 8.3 }; SHEET.w = SHEET.x1 - SHEET.x0; SHEET.h = SHEET.z1 - SHEET.z0; SHEET.cx = (SHEET.x0 + SHEET.x1) / 2; SHEET.cz = (SHEET.z0 + SHEET.z1) / 2;
const BORDA = { x: 11.6, z: 6.35 };                     // moldura do desenho
const CARIMBO = { x0: 5.4, x1: 11.6, z0: 4.15, z1: 6.35 };
// casa (coordenadas locais): x de 0 a 8, z de 0 a 6, frente em z = 6
const HX = -9, HZ = -3;
const W = 8, D = 6, WT = 0.2, H = 2.7, YS = 0.22;       // YS = topo do radier
const RH = 1.5, ALFA = Math.atan(RH / (D / 2));         // cumeeira 1,5 acima das paredes
const OVX = 0.24, OVE = 0.5, TH = 0.12;                  // beirais e espessura do telhado
const Y_POCHE = 0.004, Y_LINHA = 0.010, Y_TEXTO = 0.012;

// aberturas das paredes de fora: a, b ao longo da parede (em coordenadas da casa)
const ABERTURAS = [
  { parede: 'F', a: 0.9, b: 2.1, y0: 0.95, y1: 2.15 },
  { parede: 'F', a: 3.0, b: 3.9, y0: 0, y1: 2.1, porta: true },
  { parede: 'F', a: 5.7, b: 6.9, y0: 0.95, y1: 2.15 },
  { parede: 'L', a: 2.2, b: 3.8, y0: 0.95, y1: 2.15 },
  { parede: 'B', a: 1.4, b: 2.6, y0: 0.95, y1: 2.15 },
  { parede: 'B', a: 5.9, b: 6.7, y0: 1.35, y1: 2.15 },
  { parede: 'R', a: 3.8, b: 5.0, y0: 0.95, y1: 2.15 },
];
// paredes: eixo, início e fim ao longo do eixo, posição da face de menor coordenada, espessura
const PAREDES = {
  F: { eixo: 'x', a: 0, b: W, c: D - WT, t: WT },
  B: { eixo: 'x', a: 0, b: W, c: 0, t: WT },
  L: { eixo: 'z', a: WT, b: D - WT, c: 0, t: WT },
  R: { eixo: 'z', a: WT, b: D - WT, c: W - WT, t: WT },
  PA: { eixo: 'z', a: WT, b: D - WT, c: 4.8, t: 0.15, portas: [[1.1, 1.9], [4.3, 5.1]] },
  PB: { eixo: 'x', a: 4.95, b: W - WT, c: 2.9, t: 0.15 },
};

// ---------------------------------------------------------------- linhas grossas
const LW = { forte: 3.1, fina: 1.5 };
function lineMat(o) {
  const m = new LineMaterial({ color: o.color, linewidth: o.w, transparent: true, opacity: 1, depthWrite: false, depthTest: o.depthTest ?? true, toneMapped: false });
  if (o.dash) { m.dashed = true; m.dashSize = o.dash[0]; m.gapSize = o.dash[1]; }
  if (o.depthFunc) m.depthFunc = o.depthFunc;
  m.resolution.set(VW, VH);
  return m;
}
function fat(pos, mat, order) {
  const g = new LineSegmentsGeometry(); g.setPositions(pos);
  const l = new LineSegments2(g, mat); l.computeLineDistances();
  l.renderOrder = order; l.frustumCulled = false; l.userData.n = pos.length / 6;
  return l;
}
// um traço: segmentos picados em pedaços curtos, na ordem em que a "caneta" passa.
// Mostrar os n primeiros pedaços (instanceCount) faz a linha se desenhar.
class Traco {
  constructor(passo = 0.1) { this.p = []; this.passo = passo; }
  seg(a, b) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.ceil(d / this.passo));
    for (let i = 0; i < n; i++) { const u = i / n, v = (i + 1) / n; for (const k of [u, v]) this.p.push(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)); }
    return this;
  }
  poli(pts, fecha = false) { for (let i = 0; i < pts.length - 1; i++) this.seg(pts[i], pts[i + 1]); if (fecha) this.seg(pts[pts.length - 1], pts[0]); return this; }
  arco(cx, cz, r, a0, a1, y) { const n = Math.ceil(Math.abs(a1 - a0) * r / this.passo); let p0 = [cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r]; for (let i = 1; i <= n; i++) { const a = lerp(a0, a1, i / n), p1 = [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]; this.p.push(...p0, ...p1); p0 = p1; } return this; }
  malha(mat, order) { return fat(this.p, mat, order); }
}
function desenha(l, p) { const n = Math.round(clamp(p) * l.userData.n); l.visible = n > 0; l.geometry.instanceCount = n; }

// ---------------------------------------------------------------- texto em canvas
function rotulo(txt, cap, o = {}) {
  const px = 110, linhas = [].concat(txt), fonte = `${o.peso ?? 500} ${px}px Inter`, ls = (o.ls ?? 0.07) * px;
  const m = document.createElement('canvas').getContext('2d'); m.font = fonte; m.letterSpacing = ls + 'px';
  const w = Math.ceil(Math.max(...linhas.map(s => m.measureText(s).width))) + 16, lh = px * 1.3, h = Math.ceil(lh * linhas.length + 20);
  const tex = canvasTex(w, h, g => { g.font = fonte; g.letterSpacing = ls + 'px'; g.fillStyle = o.cor ?? TEMA.text; g.textBaseline = 'alphabetic'; linhas.forEach((s, i) => g.fillText(s, 8, 10 + px * 0.93 + i * lh)); });
  const k = cap / (CAP * px);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * k, h * k), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  mesh.renderOrder = 5; mesh.userData.s0 = 1;
  return mesh;
}
function deitado(mesh, x, z, giro = 0) { mesh.rotation.set(-PI / 2, 0, giro); mesh.position.set(x, Y_TEXTO, z); mesh.renderOrder = 1; return mesh; }   // antes dos fantasmas, para não sumir sob o aramado

// ---------------------------------------------------------------- mesa e folha
const K = 4096 / SHEET.w, SHW = 4096, SHH = Math.round(SHEET.h * K);
const sheetTex = canvasTex(SHW, SHH, (g, w, h) => {
  const X = x => (x - SHEET.x0) * K, Z = z => (z - SHEET.z0) * K, r = mulberry32(11);
  g.fillStyle = TEMA.sheet; g.fillRect(0, 0, w, h);
  // grão do papel
  for (let i = 0; i < 130000; i++) { g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${r() * 0.05})` : `rgba(0,0,0,${r() * 0.035})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  // malha de construção: 1 m (fina) e 4 m (marcada)
  for (let x = Math.ceil(SHEET.x0); x <= SHEET.x1; x++) { const f = (((x - HX) % 4) + 4) % 4 === 0; g.fillStyle = rgba(TEMA.line, TEMA.grid[f ? 1 : 0]); g.fillRect(X(x) - (f ? 1.5 : 0.75), 0, f ? 3 : 1.5, h); }
  for (let z = Math.ceil(SHEET.z0); z <= SHEET.z1; z++) { const f = (((z - HZ) % 4) + 4) % 4 === 0; g.fillStyle = rgba(TEMA.line, TEMA.grid[f ? 1 : 0]); g.fillRect(0, Z(z) - (f ? 1.5 : 0.75), w, f ? 3 : 1.5); }
  // vincos de dobra, gastos
  const vinco = (vert, pos) => {
    const a = TEMA.dark ? 0.1 : 0.55, b = TEMA.dark ? 0.16 : 0.06;
    for (const [d, cor] of [[-2.5, `rgba(255,255,255,${a})`], [1.5, `rgba(0,0,0,${b})`]]) { g.fillStyle = cor; vert ? g.fillRect(X(pos) + d, 0, 3, h) : g.fillRect(0, Z(pos) + d, w, 3); }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${r() * (TEMA.dark ? 0.12 : 0.5)})`; const s = r() * (vert ? h : w), e = (r() - 0.5) * 14; vert ? g.fillRect(X(pos) + e, s, 2, 2 + r() * 14) : g.fillRect(s, Z(pos) + e, 2 + r() * 14, 2); }
  };
  vinco(true, -10.6); vinco(true, -2.2); vinco(true, 6.2); vinco(false, -7.2); vinco(false, 0.5);
  // moldura e carimbo
  g.strokeStyle = TEMA.line; g.lineWidth = 3.4; g.strokeRect(X(-BORDA.x), Z(-BORDA.z), 2 * BORDA.x * K, 2 * BORDA.z * K);
  const c = CARIMBO, zr = c.z1 - 0.52, xm = 8.6;
  g.fillStyle = TEMA.sheet; g.fillRect(X(c.x0), Z(c.z0), (c.x1 - c.x0) * K, (c.z1 - c.z0) * K);
  g.strokeRect(X(c.x0), Z(c.z0), (c.x1 - c.x0) * K, (c.z1 - c.z0) * K);
  g.lineWidth = 1.8; g.beginPath(); g.moveTo(X(c.x0), Z(zr)); g.lineTo(X(c.x1), Z(zr)); g.moveTo(X(xm), Z(zr)); g.lineTo(X(xm), Z(c.z1)); g.stroke();
  const escreve = (s, x, z, cap, peso = 500) => { const px = cap / CAP * K; g.font = `${peso} ${px}px Inter`; g.letterSpacing = px * 0.07 + 'px'; g.fillStyle = TEMA.text; g.fillText(s, X(x), Z(z)); };
  escreve('CASA TÉRREA', c.x0 + 0.32, c.z0 + 0.78, 0.43); escreve('DE 48 M²', c.x0 + 0.32, c.z0 + 1.44, 0.43);
  escreve('DES.  A-101', c.x0 + 0.32, c.z1 - 0.17, 0.16); escreve('ESC.  1:50', xm + 0.26, c.z1 - 0.17, 0.16);
});
const chao = new THREE.Group(); scene.add(chao);
{
  const tampo = canvasTex(1024, 1024, (g, w, h) => {
    const r = mulberry32(3); g.fillStyle = TEMA.table; g.fillRect(0, 0, w, h);
    for (let p = 0; p < 4; p++) { g.fillStyle = shade(TEMA.table, (r() - 0.5) * 0.025); g.fillRect(0, p * 256, w, 256); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(30,15,5,${0.02 + r() * 0.05})`; g.lineWidth = 1 + r() * 3; const yy = p * 256 + r() * 256; g.beginPath(); g.moveTo(0, yy); for (let x = 0; x <= w; x += 64) g.lineTo(x, yy + Math.sin(x * 0.01 + i) * 4 * r()); g.stroke(); } g.fillStyle = 'rgba(20,10,4,0.22)'; g.fillRect(0, p * 256, w, 3); }
  });
  tampo.wrapS = tampo.wrapT = THREE.RepeatWrapping; tampo.repeat.set(3, 3);
  const mesa = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), new THREE.MeshBasicMaterial({ map: tampo, toneMapped: false })); mesa.rotation.x = -PI / 2; mesa.position.y = -0.03; chao.add(mesa);
  // sombra de contato da folha na mesa
  const st = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 26; g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(40, 40, w - 80, h - 80); });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(SHEET.w * 512 / 432 + 0.5, SHEET.h * 512 / 432 + 0.5), new THREE.MeshBasicMaterial({ map: st, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false })); s.rotation.x = -PI / 2; s.position.set(SHEET.cx + 0.12, -0.02, SHEET.cz + 0.16); s.renderOrder = -3; chao.add(s);
  const folha = new THREE.Mesh(new THREE.PlaneGeometry(SHEET.w, SHEET.h), new THREE.MeshBasicMaterial({ map: sheetTex, toneMapped: false })); folha.rotation.x = -PI / 2; folha.position.set(SHEET.cx, 0, SHEET.cz); chao.add(folha);
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(SHEET.w, SHEET.h), new THREE.ShadowMaterial({ color: TEMA.shadow, opacity: TEMA.shadowA, depthWrite: false })); sombra.rotation.x = -PI / 2; sombra.position.set(SHEET.cx, 0.002, SHEET.cz); sombra.receiveShadow = true; sombra.renderOrder = -1; chao.add(sombra);
}

// ---------------------------------------------------------------- luz
const sol = new THREE.DirectionalLight('#fff3df', 3.3);
sol.position.set(HX + 4 - 15, 22, HZ + 3 + 15); sol.target.position.set(HX + 4, 1, HZ + 3);
sol.castShadow = true; sol.shadow.mapSize.set(4096, 4096);
Object.assign(sol.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 70 });
sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.03; sol.shadow.radius = 5;
scene.add(sol, sol.target);
scene.add(new THREE.HemisphereLight('#f1f6ff', '#e6dccd', 0.95));
const contra = new THREE.DirectionalLight('#e6eeff', 0.45); contra.position.set(20, 8, 6); scene.add(contra);

// ---------------------------------------------------------------- a casa
const casa = new THREE.Group(); casa.position.set(HX, 0, HZ); scene.add(casa);
const ergue = new THREE.Group(); casa.add(ergue);          // tudo o que "sobe" da planta
const GHOST = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
function M(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.86, metalness: 0, map: o.map ?? null, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 }); }

// Cada peça tem três versões da mesma geometria:
//  - sólido: o material de verdade, que aparece quando a etapa constrói a peça;
//  - fantasma: só escreve profundidade, para separar aresta visível de aresta oculta;
//  - arestas: traço cheio (passa no teste de profundidade normal) e tracejado (teste invertido).
const pecas = [];
function peca(etapa, geo, mat, o = {}) {
  const g = new THREE.Group(); g.position.set(...(o.pos ?? [0, 0, 0])); if (o.quat) g.quaternion.copy(o.quat);
  const solido = new THREE.Mesh(geo, mat); solido.castShadow = solido.receiveShadow = true; solido.visible = false; g.add(solido);
  let fantasma = null, cheia = null, oculta = null;
  if (o.linhas !== false) {
    fantasma = new THREE.Mesh(geo, GHOST); fantasma.renderOrder = 2; g.add(fantasma);
    let arr = Array.from(new THREE.EdgesGeometry(geo, 20).attributes.position.array);
    if (o.tira) { const f = []; for (let i = 0; i < arr.length; i += 6) if (!o.tira(arr.slice(i, i + 3), arr.slice(i + 3, i + 6))) f.push(...arr.slice(i, i + 6)); arr = f; }
    cheia = fat(arr, lineMat({ color: TEMA.line, w: o.w ?? LW.forte }), 4);
    oculta = fat(arr, lineMat({ color: TEMA.hidden, w: 1.25, dash: [0.17, 0.14], depthFunc: THREE.GreaterDepth }), 3);
    g.add(oculta, cheia);
  }
  ergue.add(g);
  geo.computeBoundingBox();
  const P = { etapa, g, solido, fantasma, cheia, oculta, c: geo.boundingBox.getCenter(new THREE.Vector3()), tipo: o.tipo ?? 'brota', t0: 0, dur: o.dur ?? 0.36 };
  pecas.push(P); return P;
}
const caixa = (x0, x1, y0, y1, z0, z1) => new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

// parede com as aberturas recortadas: desenhada em elevação e extrudada na espessura
function parede(id, alt = H) {
  const p = PAREDES[id], L = p.b - p.a, sh = new THREE.Shape();
  const vaos = ABERTURAS.filter(o => o.parede === id).map(o => ({ ...o, a: o.a - p.a, b: o.b - p.a }));
  (p.portas ?? []).forEach(([a, b]) => vaos.push({ a: a - p.a, b: b - p.a, y0: 0, y1: 2.1, porta: true }));
  sh.moveTo(0, 0);
  vaos.filter(o => o.porta).sort((u, v) => u.a - v.a).forEach(o => { sh.lineTo(o.a, 0); sh.lineTo(o.a, o.y1); sh.lineTo(o.b, o.y1); sh.lineTo(o.b, 0); });
  sh.lineTo(L, 0); sh.lineTo(L, alt); sh.lineTo(0, alt); sh.closePath();
  vaos.filter(o => !o.porta).forEach(o => { const h = new THREE.Path(); h.moveTo(o.a, o.y0); h.lineTo(o.b, o.y0); h.lineTo(o.b, o.y1); h.lineTo(o.a, o.y1); h.closePath(); sh.holes.push(h); });
  return noEixo(new THREE.ExtrudeGeometry(sh, { depth: p.t, bevelEnabled: false }), p.eixo, p.a, p.c, p.t);
}
// leva uma geometria feita no plano XY (x = comprimento, z = espessura) para o eixo da parede
function noEixo(geo, eixo, a, c, t) { return eixo === 'x' ? geo.translate(a, 0, c) : geo.rotateY(-PI / 2).translate(c + t, 0, a); }
const perto = (v, alvo) => Math.abs(v - alvo) < 1e-3;
// nas paredes laterais, a face de topo que encosta na parede da frente/fundo não é aresta de verdade
const semEmenda = (a, b) => [WT, D - WT].some(z => perto(a[2], z) && perto(b[2], z)) && !((perto(a[0], WT) && perto(b[0], WT)) || (perto(a[0], W - WT) && perto(b[0], W - WT)));

// etapa 1 · fundação
peca(1, caixa(-0.35, W + 0.35, 0, YS, -0.35, D + 0.35), M(C.concreto), { tipo: 'sobe', dur: 0.5 });
peca(1, caixa(2.75, 4.15, 0, 0.11, D + 0.35, D + 0.9), M(C.concreto), { w: LW.fina });
peca(1, caixa(2.95, 3.95, 0, 0.04, D + 0.9, D + 1.45), M(C.pedra), { w: LW.fina });
// etapa 2 · paredes
for (const id of ['B', 'L', 'R', 'F']) peca(2, parede(id), M(C.parede), { pos: [0, YS, 0], tipo: 'sobe', dur: 1.05, tira: 'LR'.includes(id) ? semEmenda : null });
for (const id of ['PA', 'PB']) peca(2.2, parede(id), M(C.divisoria), { pos: [0, YS, 0], tipo: 'sobe', dur: 0.8, w: LW.fina });
// esquadrias: moldura com um montante no meio, e o vidro
for (const o of ABERTURAS) {
  const p = PAREDES[o.parede], a = o.a - p.a, b = o.b - p.a, e = 0.07, sh = new THREE.Shape();
  if (o.porta) {
    sh.moveTo(a - e, 0); sh.lineTo(a, 0); sh.lineTo(a, o.y1); sh.lineTo(b, o.y1); sh.lineTo(b, 0); sh.lineTo(b + e, 0); sh.lineTo(b + e, o.y1 + e); sh.lineTo(a - e, o.y1 + e); sh.closePath();
    peca(2.5, noEixo(new THREE.ExtrudeGeometry(sh, { depth: p.t + 0.06, bevelEnabled: false }).translate(0, 0, -0.03), p.eixo, p.a, p.c, p.t), M(C.esquadria), { pos: [0, YS, 0], w: LW.fina });
    peca(2.5, noEixo(caixa(a, b, 0, o.y1, 0.07, 0.13), p.eixo, p.a, p.c, p.t), M(C.porta, { r: 0.6 }), { pos: [0, YS, 0], w: LW.fina });
    peca(2.5, new THREE.SphereGeometry(0.055, 16, 12).translate(o.b - 0.14, 1.02, D + 0.03), M(C.macaneta, { r: 0.35 }), { pos: [0, YS, 0], linhas: false });
    continue;
  }
  const m = (a + b) / 2;
  sh.moveTo(a - e, o.y0 - e); sh.lineTo(b + e, o.y0 - e); sh.lineTo(b + e, o.y1 + e); sh.lineTo(a - e, o.y1 + e); sh.closePath();
  for (const [u, v] of [[a + 0.02, m - 0.03], [m + 0.03, b - 0.02]]) { const h = new THREE.Path(); h.moveTo(u, o.y0 + 0.02); h.lineTo(v, o.y0 + 0.02); h.lineTo(v, o.y1 - 0.02); h.lineTo(u, o.y1 - 0.02); h.closePath(); sh.holes.push(h); }
  peca(2.5, noEixo(new THREE.ExtrudeGeometry(sh, { depth: p.t + 0.06, bevelEnabled: false }).translate(0, 0, -0.03), p.eixo, p.a, p.c, p.t), M(C.esquadria), { pos: [0, YS, 0], w: LW.fina });
  peca(2.5, noEixo(caixa(a, b, o.y0, o.y1, 0.08, 0.12), p.eixo, p.a, p.c, p.t), M(C.vidro, { r: 0.25 }), { pos: [0, YS, 0], linhas: false });
}
// barrado: a faixa colorida no pé da parede, cortada no vão da porta
if (C.barrado) { const e = 0.018, hb = 0.48, pt = ABERTURAS.find(o => o.porta), m = M(C.barrado);
  for (const [x0, x1, z0, z1] of [[-e, W + e, -e, 0], [-e, 0, 0, D], [W, W + e, 0, D], [-e, pt.a - 0.07, D, D + e], [pt.b + 0.07, W + e, D, D + e]])
    peca(2.1, caixa(x0, x1, 0, hb, z0, z1), m, { pos: [0, YS, 0], tipo: 'sobe', dur: 1.05, linhas: false }); }
// etapa 3 · telhado
const YT = YS + H;
function triangulo(vazado) {
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(D, 0); sh.lineTo(D / 2, RH); sh.closePath();
  if (vazado) { const lado = Math.hypot(D / 2, RH), r = (0.5 * D * RH) / ((D + 2 * lado) / 2), k = (r - vazado) / r, c = [D / 2, r], v = p => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]; const h = new THREE.Path(), A = v([0, 0]), B = v([D, 0]), T = v([D / 2, RH]); h.moveTo(...A); h.lineTo(...B); h.lineTo(...T); h.closePath(); sh.holes.push(h); }
  return sh;
}
for (const x of [0, W - WT]) peca(3, new THREE.ExtrudeGeometry(triangulo(0), { depth: WT, bevelEnabled: false }).rotateY(-PI / 2).translate(x + WT, 0, 0), M(C.parede), { pos: [0, YT, 0], tipo: 'sobe', dur: 0.42 });
for (const x of [1.55, 3.15, 4.75, 6.35]) peca(3.3, new THREE.ExtrudeGeometry(triangulo(0.17), { depth: 0.1, bevelEnabled: false }).rotateY(-PI / 2).translate(x + 0.1, 0, 0), M(C.madeira), { pos: [0, YT, 0], w: LW.fina });
const telhaTex = canvasTex(512, 512, (g, w, h) => {
  const r = mulberry32(8), n = 8, t = w / n;
  for (let i = 0; i < n; i++) for (let j = -1; j < n; j++) {
    const x = j * t + (i % 2) * t / 2, y = i * t;
    g.fillStyle = shade(C.telha, (r() - 0.5) * 0.075); g.fillRect(x, y, t, t);
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x, y + t * 0.16, t, t * 0.1);
    g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(x, y, 3, t);
  }
  for (let i = 0; i < n; i++) { g.fillStyle = 'rgba(0,0,0,0.30)'; g.fillRect(0, i * t, w, t * 0.12); }
});
telhaTex.wrapS = telhaTex.wrapT = THREE.RepeatWrapping; telhaTex.repeat.set(2, 1.25);
const SL = (D / 2 + OVE) / Math.cos(ALFA), qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ALFA), qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI);
const agua = () => new THREE.BoxGeometry(W + 2 * OVX, TH, SL).translate(0, TH / 2, SL / 2);
// só a face de cima leva telha; as bordas e o forro são a tábua do beiral
const matTelhado = () => { const b = M(C.beiral); return [b, b, M('#ffffff', { map: telhaTex, r: 0.7 }), b, b, b]; };
peca(3.7, agua(), matTelhado(), { pos: [W / 2, YT + RH, D / 2], quat: qx, tipo: 'rola', dur: 0.55 });
peca(3.75, agua(), matTelhado(), { pos: [W / 2, YT + RH, D / 2], quat: qy.clone().multiply(qx), tipo: 'rola', dur: 0.55 });
peca(3.9, caixa(-OVX, W + OVX, RH + 0.03, RH + 0.2, D / 2 - 0.16, D / 2 + 0.16), M(C.cumeeira), { pos: [0, YT, 0], tipo: 'estica', dur: 0.4, w: LW.fina });
peca(3.95, caixa(5.95, 6.6, 0.45, RH + 0.75, 1.3, 1.95), M(C.chamine), { pos: [0, YT, 0], tipo: 'sobe', dur: 0.4, w: LW.fina });
peca(3.97, caixa(5.87, 6.68, RH + 0.75, RH + 0.87, 1.22, 2.03), M(C.chapeu), { pos: [0, YT, 0], w: LW.fina });

// ---------------------------------------------------------------- a planta, desenhada na folha
// contorno = borda da união dos retângulos das paredes, menos os vãos das portas
function contorno(rects, vaos) {
  const uniq = a => [...new Set(a.map(v => +v.toFixed(4)))].sort((u, v) => u - v);
  const xs = uniq([...rects, ...vaos].flatMap(r => [r[0], r[1]])), zs = uniq([...rects, ...vaos].flatMap(r => [r[2], r[3]]));
  const dentro = (r, x, z) => x > r[0] && x < r[1] && z > r[2] && z < r[3];
  const cheio = (i, j) => { if (i < 0 || j < 0 || i >= xs.length - 1 || j >= zs.length - 1) return false; const x = (xs[i] + xs[i + 1]) / 2, z = (zs[j] + zs[j + 1]) / 2; return rects.some(r => dentro(r, x, z)) && !vaos.some(r => dentro(r, x, z)); };
  const arestas = [], celulas = [];
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    if (!cheio(i, j)) continue;
    celulas.push([xs[i], xs[i + 1], zs[j], zs[j + 1]]);
    if (!cheio(i - 1, j)) arestas.push([[xs[i], zs[j]], [xs[i], zs[j + 1]]]);
    if (!cheio(i + 1, j)) arestas.push([[xs[i + 1], zs[j]], [xs[i + 1], zs[j + 1]]]);
    if (!cheio(i, j - 1)) arestas.push([[xs[i], zs[j]], [xs[i + 1], zs[j]]]);
    if (!cheio(i, j + 1)) arestas.push([[xs[i], zs[j + 1]], [xs[i + 1], zs[j + 1]]]);
  }
  const chave = p => p[0].toFixed(3) + ',' + p[1].toFixed(3), mapa = new Map();
  arestas.forEach((e, i) => e.forEach(p => { const k = chave(p); if (!mapa.has(k)) mapa.set(k, []); mapa.get(k).push(i); }));
  const usada = arestas.map(() => false), voltas = [];
  for (let s = 0; s < arestas.length; s++) {
    if (usada[s]) continue; usada[s] = true;
    const pts = [arestas[s][0], arestas[s][1]];
    for (;;) { const cur = pts[pts.length - 1], i = mapa.get(chave(cur)).find(i => !usada[i]); if (i === undefined) break; usada[i] = true; pts.push(chave(arestas[i][0]) === chave(cur) ? arestas[i][1] : arestas[i][0]); }
    const limpa = pts.filter((p, i) => { if (i === 0 || i === pts.length - 1) return true; const a = pts[i - 1], b = pts[i + 1]; return Math.abs((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) > 1e-6; });
    voltas.push(limpa);
  }
  const per = v => v.reduce((s, p, i) => i ? s + Math.hypot(p[0] - v[i - 1][0], p[1] - v[i - 1][1]) : 0, 0);
  return { voltas: voltas.sort((a, b) => per(b) - per(a)), celulas };
}
const retPlanta = p => p.eixo === 'x' ? [p.a, p.b, p.c, p.c + p.t] : [p.c, p.c + p.t, p.a, p.b];
const vaosPlanta = [];
for (const o of ABERTURAS.filter(o => o.porta)) { const p = PAREDES[o.parede]; vaosPlanta.push(p.eixo === 'x' ? [o.a, o.b, p.c - 0.01, p.c + p.t + 0.01] : [p.c - 0.01, p.c + p.t + 0.01, o.a, o.b]); }
for (const [id, p] of Object.entries(PAREDES)) for (const [a, b] of p.portas ?? []) vaosPlanta.push([p.c - 0.01, p.c + p.t + 0.01, a, b]);
const CT = contorno(Object.values(PAREDES).map(retPlanta), vaosPlanta);

const planta = new THREE.Group(); casa.add(planta);
const y3 = (x, z) => [x, Y_LINHA, z];
const matForte = lineMat({ color: TEMA.line, w: LW.forte }), matFina = lineMat({ color: TEMA.line, w: LW.fina }), matTrac = lineMat({ color: TEMA.line, w: LW.fina, dash: [0.22, 0.15] });
// 1 · paredes (traço forte)
const tParedes = new Traco(); CT.voltas.forEach(v => tParedes.poli(v.map(p => y3(p[0], p[1]))));
// 2 · esquadrias, folhas de porta, degrau e radier (traço fino)
const tFino = new Traco(0.07);
for (const o of ABERTURAS.filter(o => !o.porta)) { const p = PAREDES[o.parede]; for (const k of [0.36, 0.64]) { const c = p.c + p.t * k; p.eixo === 'x' ? tFino.seg(y3(o.a, c), y3(o.b, c)) : tFino.seg(y3(c, o.a), y3(c, o.b)); } for (const e of [o.a, o.b]) p.eixo === 'x' ? tFino.seg(y3(e, p.c), y3(e, p.c + p.t)) : tFino.seg(y3(p.c, e), y3(p.c + p.t, e)); }
const folhaPorta = (hx, hz, a0, a1, r) => { tFino.seg(y3(hx, hz), y3(hx + Math.cos(a0) * r, hz + Math.sin(a0) * r)); tFino.arco(hx, hz, r, a0, a1, Y_LINHA); };
folhaPorta(3.0, D - WT, -PI / 2, 0, 0.9);
folhaPorta(4.95, 1.1, 0, PI / 2, 0.8);
folhaPorta(4.95, 5.1, 0, -PI / 2, 0.8);
tFino.poli([y3(2.75, D + 0.35), y3(2.75, D + 0.9), y3(4.15, D + 0.9), y3(4.15, D + 0.35)]);
tFino.poli([y3(2.95, D + 0.9), y3(2.95, D + 1.45), y3(3.95, D + 1.45), y3(3.95, D + 0.9)]);
tFino.poli([y3(-0.35, -0.35), y3(W + 0.35, -0.35), y3(W + 0.35, D + 0.35), y3(-0.35, D + 0.35)], true);
// 3 · projeção do telhado (tracejada) e cumeeira
const tTelhado = new Traco(0.11);
tTelhado.poli([y3(-OVX, -OVE), y3(W + OVX, -OVE), y3(W + OVX, D + OVE), y3(-OVX, D + OVE)], true).seg(y3(-OVX, D / 2), y3(W + OVX, D / 2));
// 4 · cotas
function cota(tr, a, b, n, off) {
  const ad = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k, p[2] + v[2] * k], A = ad(a, n, off), B = ad(b, n, off);
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d), u = d.map(v => v / L), k = [u[0] + n[0], u[1] + n[1], u[2] + n[2]].map(v => v / Math.SQRT2 * 0.21);
  tr.seg(ad(a, n, 0.3), ad(a, n, off + 0.28)).seg(ad(b, n, 0.3), ad(b, n, off + 0.28)).seg(A, B);
  tr.seg(ad(A, k, -1), ad(A, k, 1)).seg(ad(B, k, -1), ad(B, k, 1));
  return [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
}
const tCotas = new Traco(0.08);
const mL = cota(tCotas, y3(0, D + 0.35), y3(W, D + 0.35), [0, 0, 1], 1.35), mD = cota(tCotas, y3(W + 0.35, D), y3(W + 0.35, 0), [1, 0, 0], 1.25);
const linhasPlanta = [
  { l: tParedes.malha(matForte, 1), t0: 0.3, t1: 1.55 },
  { l: tFino.malha(matFina, 1), t0: 1.2, t1: 2.0 },
  { l: tTelhado.malha(matTrac, 1), t0: 1.6, t1: 2.3 },
  { l: tCotas.malha(matFina, 1), t0: 1.95, t1: 2.55 },
];
linhasPlanta.forEach(o => planta.add(o.l));
// paredes preenchidas (o "poché" da planta)
const pocheMat = new THREE.MeshBasicMaterial({ color: TEMA.line, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
{ const pos = []; for (const [x0, x1, z0, z1] of CT.celulas) pos.push(x0, Y_POCHE, z0, x0, Y_POCHE, z1, x1, Y_POCHE, z1, x0, Y_POCHE, z0, x1, Y_POCHE, z1, x1, Y_POCHE, z0); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const m = new THREE.Mesh(g, pocheMat); m.renderOrder = 0; planta.add(m); }
// letreiros deitados na folha: aparecem com um estalo
const letreiros = [];
const poe = (mesh, t0) => { planta.add(mesh); letreiros.push({ mesh, t0 }); return mesh; };
poe(deitado(rotulo('8,00', 0.36), mL[0], mL[2] + 0.42), 2.38);
poe(deitado(rotulo('6,00', 0.36), mD[0] - 0.42, mD[2], PI / 2), 2.46);
poe(deitado(rotulo('SALA', 0.2), 2.5, 3.3), 1.9);
poe(deitado(rotulo('QUARTO', 0.2), 6.4, 4.45), 2.0);
poe(deitado(rotulo('BANHO', 0.2), 6.4, 1.55), 2.1);

// cota de altura, em pé, no canto da frente
const tAltura = new Traco(0.08), mH = cota(tAltura, [0, YS, D], [0, YT, D], [-1, 0, 0], 0.95);
const cotaAltura = tAltura.malha(matFina, 5); casa.add(cotaAltura);
const txtAltura = rotulo('2,70', 0.32); txtAltura.rotation.z = PI / 2; txtAltura.position.set(mH[0] - 0.42, mH[1], D); casa.add(txtAltura);

// ---------------------------------------------------------------- câmera
const X1 = new THREE.Vector3(1, 0, 0), Y1 = new THREE.Vector3(0, 1, 0), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
const CAM_A = { el: 90, az: 0, alvo: [0, 0, 0], dist: 6.75 / Math.tan(15 * RAD) };
const CAM_B = { el: 32, az: 31, alvo: [-2.6, 1.2, 0.2], dist: 23.5 };
function setCam(u) {
  const el = lerp(CAM_A.el, CAM_B.el, u) * RAD, az = lerp(CAM_A.az, CAM_B.az, u) * RAD, dist = lerp(CAM_A.dist, CAM_B.dist, u);
  camera.quaternion.copy(qb.setFromAxisAngle(Y1, az)).multiply(qa.setFromAxisAngle(X1, -el));
  camera.position.set(0, 0, dist).applyQuaternion(camera.quaternion);
  camera.position.x += lerp(CAM_A.alvo[0], CAM_B.alvo[0], u); camera.position.y += lerp(CAM_A.alvo[1], CAM_B.alvo[1], u); camera.position.z += lerp(CAM_A.alvo[2], CAM_B.alvo[2], u);
  camera.updateMatrixWorld(true);
}

// ---------------------------------------------------------------- notas numeradas
// Empilhadas como a casa: 1 embaixo, 3 em cima. Nascem deitadas na folha e, quando a
// câmera inclina, voam até o lado da parte de que falam, sempre de frente para a câmera.
const slopeY = z => YT + RH - (z - D / 2) * Math.tan(ALFA) + TH / Math.cos(ALFA);
const NOTAS = [
  { n: 1, txt: ['FUNDAÇÃO', 'EM RADIER'], a: [3.0, 1.0], ndc: [0.34, -0.22], alvo: [W + 0.35, YS * 0.6, 2.4], t0: 1.0 },
  { n: 2, txt: ['PAREDES', 'DE ALVENARIA'], a: [3.0, -1.45], ndc: [0.38, 0.22], alvo: [W, YS + 1.7, 1.7], t0: 1.4 },
  { n: 3, txt: ['TELHADO', 'DE DUAS ÁGUAS'], a: [3.0, -3.9], ndc: [0.32, 0.64], alvo: [W - 0.7, slopeY(4.3), 4.3], t0: 1.8 },
];
const NPX = 0.98 / 236;                                  // metros por pixel: bolinha de 0,98 m
function notaTex(n, txt, destaque) {
  const f = '500 150px Inter', m = document.createElement('canvas').getContext('2d'); m.font = f; m.letterSpacing = '10px';
  const w = Math.ceil(320 + Math.max(...txt.map(s => m.measureText(s).width)) + 16);
  return canvasTex(w, 340, g => {
    g.fillStyle = destaque ? TEMA.accent : TEMA.badge; g.beginPath(); g.arc(150, 170, 118, 0, 2 * PI); g.fill();
    g.fillStyle = destaque ? TEMA.accentNum : TEMA.badgeNum; g.font = '600 150px Inter'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(String(n), 150, 170 + 150 * CAP / 2);
    g.textAlign = 'left'; g.font = f; g.letterSpacing = '10px'; g.fillStyle = TEMA.text; txt.forEach((s, i) => g.fillText(s, 320, 150 + i * 150));
  });
}
const matGuia = lineMat({ color: TEMA.line, w: LW.fina, depthTest: false });
const notas = NOTAS.map(N => {
  const g = new THREE.Group(), t0 = notaTex(N.n, N.txt, false), t1 = notaTex(N.n, N.txt, true), w = t0.image.width * NPX, h = 340 * NPX;
  const geo = new THREE.PlaneGeometry(w, h).translate(w / 2 - 150 * NPX, 0, 0);
  const base = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t0, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })); base.renderOrder = 9;
  const acesa = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t1, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false })); acesa.renderOrder = 10;
  g.add(base, acesa); scene.add(g);
  const guia = fat([0, 0, 0, 1, 0, 0], matGuia, 7); scene.add(guia);
  const ponto = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), new THREE.MeshBasicMaterial({ color: TEMA.line, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })); ponto.renderOrder = 8; scene.add(ponto);
  return { ...N, g, acesa, guia, ponto, A: new THREE.Vector3(N.a[0], 0.03, N.a[1]), B: new THREE.Vector3(), T: new THREE.Vector3(N.alvo[0] + HX, N.alvo[1], N.alvo[2] + HZ) };
});
// posição final de cada nota: um ponto fixo do quadro, na profundidade do canto da casa
setCam(1);
{ const ref = new THREE.Vector3(HX + W, 1.4, HZ + D).distanceTo(camera.position); for (const N of notas) { const d = new THREE.Vector3(N.ndc[0], N.ndc[1], 0.5).unproject(camera).sub(camera.position).normalize(); N.B.copy(camera.position).addScaledVector(d, ref); } }

// ---------------------------------------------------------------- linha do tempo (segundos)
const T = {
  inclina: [3.3, 5.6],        // único movimento de câmera: de cima para três quartos
  sobe: [3.85, 5.45],         // a planta vira aramado
  voo: [3.7, 5.3],            // as notas saem da folha
  guias: 5.45, altura: [5.75, 6.3],
  e1: 6.9, e2: 8.0, e3: 10.6, // início de cada etapa de construção
};
// cada peça começa num atraso dentro da etapa (a parte decimal do número da etapa organiza a fila)
const FILA = { 1: 0, 2: 0, 2.1: 0.1, 2.2: 0.3, 2.5: 1.2, 3: 0, 3.3: 0.4, 3.7: 1.05, 3.75: 1.17, 3.9: 1.62, 3.95: 1.8, 3.97: 2.08 };
const PASSO = { 1: 0.3, 2: 0.07, 2.2: 0.12, 2.5: 0.045, 3: 0.1, 3.3: 0.13 };
{ const cont = {}; for (const P of pecas) { const i = cont[P.etapa] = (cont[P.etapa] ?? -1) + 1; P.t0 = T['e' + Math.floor(P.etapa)] + FILA[P.etapa] + i * (PASSO[P.etapa] ?? 0); } }
const fimEtapa = e => Math.max(...pecas.filter(P => Math.floor(P.etapa) === e).map(P => P.t0 + P.dur));
const FIM = [0, fimEtapa(1), fimEtapa(2), fimEtapa(3)];
const DURATION = 15;

function frame(t) {
  setCam(eio(seg(t, ...T.inclina)));

  // planta
  for (const o of linhasPlanta) desenha(o.l, eio(seg(t, o.t0, o.t1)));
  pocheMat.opacity = TEMA.poche * smooth(t, 1.3, 1.9);
  for (const o of letreiros) { const p = seg(t, o.t0, o.t0 + 0.28); o.mesh.visible = p > 0; o.mesh.scale.setScalar(p >= 1 ? 1 : Math.max(0.001, back(p))); }

  // aramado: sobe da planta
  const m = eio(seg(t, ...T.sobe)), fio = smooth(m, 0.002, 0.04);
  ergue.visible = fio > 0; ergue.scale.y = Math.max(0.0005, m);
  for (const P of pecas) {
    const p = seg(t, P.t0, P.t0 + P.dur), s = P.solido;
    s.visible = p > 0;
    if (p > 0) {
      s.scale.set(1, 1, 1); s.position.set(0, 0, 0);
      if (P.tipo === 'sobe') s.scale.y = Math.max(0.002, P.dur > 0.6 ? eio(p) : eo(p));
      else if (P.tipo === 'rola') s.scale.z = Math.max(0.002, eo(p));
      else if (P.tipo === 'estica') { const k = Math.max(0.002, eo(p)); s.scale.x = k; s.position.x = P.c.x * (1 - k); }
      else { const k = p >= 1 ? 1 : Math.max(0.002, back(p)); s.scale.setScalar(k); s.position.copy(P.c).multiplyScalar(1 - k); }
    }
    if (P.cheia) { P.cheia.material.opacity = fio; P.oculta.material.opacity = fio * (1 - smooth(p, 0.25, 1)); P.oculta.visible = P.oculta.material.opacity > 0.004; }
  }

  // cota de altura
  desenha(cotaAltura, eio(seg(t, ...T.altura)));
  { const p = seg(t, T.altura[1] - 0.12, T.altura[1] + 0.16); txtAltura.visible = p > 0; txtAltura.scale.setScalar(p >= 1 ? 1 : Math.max(0.001, back(p))); }

  // notas
  notas.forEach((N, i) => {
    const pop = seg(t, N.t0, N.t0 + 0.32), u = eio(seg(t, T.voo[0] + i * 0.14, T.voo[1] + i * 0.14));
    N.g.visible = pop > 0;
    N.g.position.lerpVectors(N.A, N.B, u); N.g.position.y += Math.sin(u * PI) * 0.9;
    N.g.quaternion.copy(camera.quaternion);
    const k = lerp(1, 0.86, u) * N.g.position.distanceTo(camera.position) / CAM_A.dist;
    N.g.scale.setScalar(k * (pop >= 1 ? 1 : Math.max(0.001, back(pop))));
    const ini = T['e' + N.n], liga = smooth(t, ini - 0.1, ini + 0.12) * (1 - smooth(t, FIM[N.n] + 0.1, FIM[N.n] + 0.32));
    N.acesa.material.opacity = liga;
    const g = eo(seg(t, T.guias + i * 0.16, T.guias + i * 0.16 + 0.42)), dir = qv.subVectors(N.T, N.g.position), len = dir.length();
    N.guia.visible = g > 0; N.guia.position.copy(N.g.position); N.guia.quaternion.setFromUnitVectors(X1, dir.normalize()); N.guia.scale.set(Math.max(0.001, len * g), 1, 1);
    const pp = seg(t, T.guias + i * 0.16 + 0.36, T.guias + i * 0.16 + 0.6); N.ponto.visible = pp > 0; N.ponto.position.copy(N.T); N.ponto.quaternion.copy(camera.quaternion); N.ponto.scale.setScalar((pp >= 1 ? 1 : Math.max(0.001, back(pp))) * N.T.distanceTo(camera.position) / 22);
  });
}
const qv = new THREE.Vector3();
function render() { scene.updateMatrixWorld(true); renderer.render(scene, camera); }

// ---------------------------------------------------------------- momentos-chave (cards)
const KEYS = [
  { id: '00-planta', t: 3.0 },
  { id: '01-inclina', t: 4.55 },
  { id: '02-aramado', t: 6.6 },
  { id: '03-fundacao', t: 7.75 },
  { id: '04-paredes', t: 10.35 },
  { id: '05-telhado', t: 11.75 },
  { id: '06-final', t: 14.0 },
];
window.KEYS = KEYS;
window.DURATION = DURATION;
window.FIM = FIM;
window.renderKey = i => { frame(KEYS[i].t); render(); return KEYS[i].id; };
window.renderAt = t => { frame(t); render(); return t; };
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida';
window.renderAt(Number(q.get('t') ?? 14));
window.ready = true;
