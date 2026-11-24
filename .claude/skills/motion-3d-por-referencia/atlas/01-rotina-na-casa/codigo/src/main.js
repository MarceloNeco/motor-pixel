// rotina-casa: maquete de uma casa de 2 andares e a rotina de uma pessoa.
// Tudo procedural (geometria e texturas geradas em código), sem modelos nem imagens.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js';

const VW = 1920, VH = 1080;
const PI = Math.PI;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

// ---------------------------------------------------------------- paleta
const C = {
  paper: '#efebe4', night: '#aab3c6',
  wall: '#efe6d8', trim: '#5d4737', base: '#e9dfcf',
  woodLight: '#dcbd92', woodDeck: '#c8a274', woodDark: '#8c6443', woodMid: '#b98d5e',
  blue: '#0075de', blueSoft: '#9cc4f0', marigold: '#f5b82e', coral: '#ef6a5b',
  green: '#5f9f6c', greenDark: '#3f7d52', sage: '#a9bda6',
  white: '#fbfaf6', cream: '#efe6d6', tile: '#e2ecec', poolTile: '#bfe9ee', water: '#2fb4d4',
  skin: '#e0a57a', hair: '#3b2a20', metal: '#c2c5c9', dark: '#2c2c30',
};

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(VW, VH, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.paper);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.OrthographicCamera(-8, 8, 4.5, -4.5, 0.1, 140);

// ---------------------------------------------------------------- texturas em canvas
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function shade(hex, dl, ds = 0) { const c = new THREE.Color(hex); c.offsetHSL(0, ds, dl); return '#' + c.getHexString(); }
// tábuas largas, veio grosso: textura "aumentada", que é o que faz a peça parecer miniatura
function woodTex(base, seed = 1, planks = 4) {
  const r = mulberry32(seed);
  return canvasTex(1024, 512, (g, w, h) => {
    const ph = h / planks;
    for (let p = 0; p < planks; p++) {
      const y0 = p * ph;
      g.fillStyle = shade(base, (r() - 0.5) * 0.07); g.fillRect(0, y0, w, ph);
      for (let i = 0; i < 26; i++) {
        g.strokeStyle = `rgba(70,40,15,${0.05 + r() * 0.1})`; g.lineWidth = 1 + r() * 2.5;
        const yy = y0 + r() * ph; g.beginPath(); g.moveTo(0, yy);
        for (let x = 0; x <= w; x += 64) g.lineTo(x, yy + Math.sin(x * 0.012 + i) * 3 * r());
        g.stroke();
      }
      g.fillStyle = 'rgba(50,28,10,0.55)'; g.fillRect(0, y0, w, 4);
      const jx = r() * w; g.fillRect(jx, y0, 4, ph);
    }
  });
}
function tileTex(base, grout) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = grout; g.fillRect(0, 0, w, h);
    const r = mulberry32(5);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = shade(base, (r() - 0.5) * 0.03); g.fillRect(i * 128 + 5, j * 128 + 5, 118, 118); }
  });
}
// trama grossa para tecido (vai no bumpMap)
const weave = canvasTex(64, 64, (g) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#b8b8b8' : '#4a4a4a'; g.fillRect(i * 8 + 1, j * 8 + 1, 6, 6); }
}, false);
const speckle = canvasTex(128, 128, (g) => {
  const r = mulberry32(11); g.fillStyle = '#808080'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) { const v = 90 + r() * 90 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * 128, r() * 128, 2 + r() * 3, 2 + r() * 3); }
}, false);

// ---------------------------------------------------------------- materiais
const cache = {};
function M(color, o = {}) {
  const k = color + '|' + (o.r ?? 0.78) + '|' + (o.m ?? 0) + '|' + (o.bump ? o.bump.uuid + (o.rep || 1) : '') + '|' + (o.e || '');
  if (cache[k]) return cache[k];
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.78, metalness: o.m ?? 0 });
  if (o.bump) { const b = o.bump.clone(); b.repeat.set(o.rep || 1, o.rep || 1); b.needsUpdate = true; m.bumpMap = b; m.bumpScale = o.bs ?? 1.2; }
  if (o.e) { m.emissive = new THREE.Color(o.e); m.emissiveIntensity = o.ei ?? 1; }
  return cache[k] = m;
}
function texMat(tex, rx, ry, o = {}) {
  const t = tex.clone(); t.repeat.set(rx, ry); t.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: t, roughness: o.r ?? 0.7, metalness: 0 });
}
const fabric = (color, rep = 6) => M(color, { r: 0.95, bump: weave, rep, bs: 1.6 });

// ---------------------------------------------------------------- helpers de geometria
function sh(m) { m.castShadow = true; m.receiveShadow = true; return m; }
function rb(w, h, d, mat, x = 0, y = 0, z = 0, r = 0.035) {
  const rr = Math.max(0.004, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002));
  const m = sh(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rr), mat)); m.position.set(x, y, z); return m;
}
function bx(x0, x1, y0, y1, z0, z1, mat) {
  const m = sh(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return m;
}
function cyl(rt, rbm, h, mat, x = 0, y = 0, z = 0, seg = 28) { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(rt, rbm, h, seg), mat)); m.position.set(x, y, z); return m; }
function sph(r, mat, x = 0, y = 0, z = 0) { const m = sh(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), mat)); m.position.set(x, y, z); return m; }
function cap(r, len, mat, x = 0, y = 0, z = 0) { const m = sh(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 18), mat)); m.position.set(x, y, z); return m; }

// peças que "brotam" na montagem, na ordem em que são registradas
const pops = [];
function reg(o) { o.userData.s0 = o.scale.clone(); pops.push(o); return o; }
function piece(x, y, z, build, rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; build(g); scene.add(g); return reg(g);
}
function add(m) { scene.add(m); return reg(m); }

// ---------------------------------------------------------------- medidas da casa
const W = 8.4, D = 3.6, H = 2.7, T = 0.18, WT = 0.14, Y1 = H + T, TOP = Y1 + H;
const KX0 = 4.2, KZ1 = 6.6;                    // extensão da cozinha (térrea, sem teto)
const POOL = { x0: 0.25, x1: 3.05, z0: 4.65, z1: 7.6, depth: 0.6 };
const BASE = { x0: -0.6, x1: 9.2, z0: -0.5, z1: 8.4, t: 0.72 };
const STAIR = { x0: 7.2, x1: 8.4, z0: 0.75, n: 14, run: 0.2, rise: Y1 / 15 };
const WATER_Y = -0.1;

// ---------------------------------------------------------------- base com o recorte da piscina
{
  const s = new THREE.Shape();
  s.moveTo(BASE.x0, BASE.z0); s.lineTo(BASE.x1, BASE.z0); s.lineTo(BASE.x1, BASE.z1); s.lineTo(BASE.x0, BASE.z1); s.closePath();
  const hole = new THREE.Path();
  hole.moveTo(POOL.x0, POOL.z0); hole.lineTo(POOL.x0, POOL.z1); hole.lineTo(POOL.x1, POOL.z1); hole.lineTo(POOL.x1, POOL.z0); hole.closePath();
  s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: BASE.t, bevelEnabled: false });
  geo.rotateX(PI / 2);
  const deck = woodTex(C.woodDeck, 3); deck.repeat.set(1 / 2.6, 1 / 1.32); deck.needsUpdate = true;
  const top = new THREE.MeshStandardMaterial({ map: deck, roughness: 0.72 });
  add(sh(new THREE.Mesh(geo, [top, M(C.base, { r: 0.9, bump: speckle, rep: 3, bs: 0.5 })])));
  // piscina: fundo, forro de azulejo, borda de pedra
  const pt = tileTex(C.poolTile, '#eefbfc');
  const liner = (rx, ry) => texMat(pt, rx, ry, { r: 0.35 });
  const { x0, x1, z0, z1, depth } = POOL;
  piece(0, 0, 0, g => {
    g.add(bx(x0, x1, -depth - 0.04, -depth, z0, z1, liner(7, 7)));
    g.add(bx(x0, x0 + 0.03, -depth, -0.02, z0, z1, liner(7, 1.5)));
    g.add(bx(x1 - 0.03, x1, -depth, -0.02, z0, z1, liner(7, 1.5)));
    g.add(bx(x0, x1, -depth, -0.02, z0, z0 + 0.03, liner(7, 1.5)));
    g.add(bx(x0, x1, -depth, -0.02, z1 - 0.03, z1, liner(7, 1.5)));
    const stone = M(C.white, { r: 0.6, bump: speckle, rep: 2, bs: 0.4 });
    const b = 0.24;
    g.add(rb(x1 - x0 + 2 * b, 0.07, b, stone, (x0 + x1) / 2, 0.02, z0 - b / 2 + 0.02, 0.03));
    g.add(rb(x1 - x0 + 2 * b, 0.07, b, stone, (x0 + x1) / 2, 0.02, z1 + b / 2 - 0.02, 0.03));
    g.add(rb(b, 0.07, z1 - z0, stone, x0 - b / 2 + 0.02, 0.02, (z0 + z1) / 2, 0.03));
    g.add(rb(b, 0.07, z1 - z0, stone, x1 + b / 2 - 0.02, 0.02, (z0 + z1) / 2, 0.03));
  });
}
// água
const waterGeo = new THREE.PlaneGeometry(POOL.x1 - POOL.x0 - 0.06, POOL.z1 - POOL.z0 - 0.06, 56, 56);
waterGeo.rotateX(-PI / 2);
const waterBase = waterGeo.attributes.position.array.slice();
const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: C.water, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.8, envMapIntensity: 1.4 }));
water.position.set((POOL.x0 + POOL.x1) / 2, WATER_Y, (POOL.z0 + POOL.z1) / 2);
water.receiveShadow = true;
add(water);

// ---------------------------------------------------------------- pisos, paredes, laje, escada
const trim = M(C.trim, { r: 0.8 });
const wallM = M(C.wall, { r: 0.95, bump: speckle, rep: 5, bs: 0.35 });
add(bx(0, W, 0, 0.06, 0, D, texMat(woodTex(C.woodLight, 7), W / 2.6, D / 1.32)));                       // sala (térreo, sob a laje)
add(bx(KX0, W, 0, 0.06, D, KZ1, texMat(tileTex('#e9e2d4', '#cfc6b4'), (W - KX0) / 1.0, (KZ1 - D) / 1.0, { r: 0.5 }))); // cozinha
add(bx(-WT, W, 0, TOP, -WT, 0, wallM));                                                                // parede do fundo
add(bx(-WT, 0, 0, TOP, 0, D, wallM));                                                                  // parede esquerda
add(bx(-WT - 0.02, W + 0.02, TOP, TOP + 0.06, -WT - 0.02, 0.02, trim));                                // contorno escuro do corte
add(bx(-WT - 0.02, 0.02, TOP, TOP + 0.06, 0, D + 0.02, trim));
add(bx(-WT - 0.02, 0.02, 0, TOP, D, D + 0.05, trim));
add(bx(W, W + 0.05, 0, TOP, -WT - 0.02, 0.02, trim));
// laje do andar de cima + patamar da escada
add(bx(0, STAIR.x0, H, Y1, 0, D, M(C.cream, { r: 0.9 })));
add(bx(STAIR.x0, W, H, Y1, 0, STAIR.z0, M(C.cream, { r: 0.9 })));
add(bx(0, STAIR.x0 + 0.02, H - 0.02, Y1 + 0.02, D, D + 0.05, trim));
add(bx(0, 4.6, Y1, Y1 + 0.03, 0, D, texMat(woodTex(C.woodMid, 9), 4.6 / 2.6, D / 1.32)));              // quarto
add(bx(4.6, STAIR.x0, Y1, Y1 + 0.03, 0, D, texMat(tileTex(C.tile, '#c5d3d3'), 2.6 / 0.65, D / 0.65, { r: 0.4 }))); // banheiro
add(bx(STAIR.x0, W, Y1, Y1 + 0.03, 0, STAIR.z0, texMat(woodTex(C.woodMid, 9), 1.2 / 2.6, 0.75 / 1.32)));
// divisória quarto | banheiro (meia profundidade, para não tapar a visão)
add(bx(4.53, 4.67, Y1, TOP, 0, 2.0, wallM));
add(bx(4.51, 4.69, TOP, TOP + 0.06, 0, 2.02, trim));
add(bx(4.51, 4.69, Y1, TOP, 2.0, 2.05, trim));
// escada: desce do fundo para a frente, de frente para a câmera
piece(0, 0, 0, g => {
  const stepM = texMat(woodTex(C.woodLight, 4), 0.5, 0.25);
  for (let i = 0; i < STAIR.n; i++) {
    const top = Y1 - (i + 1) * STAIR.rise, z0 = STAIR.z0 + i * STAIR.run;
    g.add(bx(STAIR.x0 + 0.04, STAIR.x1 - 0.04, Math.max(0, top - 0.5), top, z0, z0 + STAIR.run + 0.005, stepM));
    g.add(bx(STAIR.x0 + 0.02, STAIR.x1 - 0.02, top - 0.03, top + 0.012, z0 + STAIR.run - 0.03, z0 + STAIR.run + 0.02, M(C.woodDark)));
  }
});
// guarda-corpo fino na borda do banheiro (não tapa a escada)
piece(0, 0, 0, g => {
  const m = M(C.dark, { r: 0.5, m: 0.3 });
  for (let z = STAIR.z0; z <= D + 0.01; z += 0.57) g.add(bx(STAIR.x0 - 0.03, STAIR.x0 + 0.01, Y1, Y1 + 0.9, z - 0.02, z + 0.02, m));
  g.add(bx(STAIR.x0 - 0.04, STAIR.x0 + 0.02, Y1 + 0.88, Y1 + 0.94, STAIR.z0 - 0.02, D + 0.02, M(C.woodDark)));
});

// janelas (aplicadas na parede do fundo)
const glassM = new THREE.MeshStandardMaterial({ color: '#dff0ff', emissive: new THREE.Color('#cfe8ff'), emissiveIntensity: 0.9, roughness: 0.2 });
function windowAt(x, y, w, h) {
  piece(x, y, 0.012, g => {
    g.add(bx(-w / 2, w / 2, 0, h, 0, 0.012, glassM));
    const f = M(C.white, { r: 0.6 });
    g.add(rb(w + 0.12, 0.07, 0.06, f, 0, 0, 0.02)); g.add(rb(w + 0.12, 0.07, 0.06, f, 0, h, 0.02));
    g.add(rb(0.07, h + 0.1, 0.06, f, -w / 2, h / 2, 0.02)); g.add(rb(0.07, h + 0.1, 0.06, f, w / 2, h / 2, 0.02));
    g.add(rb(0.04, h, 0.05, f, 0, h / 2, 0.02)); g.add(rb(w, 0.04, 0.05, f, 0, h / 2, 0.02));
  });
}
windowAt(3.55, Y1 + 0.95, 1.2, 1.15);
windowAt(5.2, 1.0, 1.4, 1.1);

// ---------------------------------------------------------------- mobília
function plant(g, s = 1, x = 0, z = 0) {
  g.add(cyl(0.2 * s, 0.15 * s, 0.34 * s, M(C.coral, { r: 0.85 }), x, 0.17 * s, z));
  const lm = M(C.green, { r: 0.7 }), lm2 = M(C.greenDark, { r: 0.7 });
  const r = mulberry32(21 + Math.round(x * 10));
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * PI * 2 + r(), tilt = 0.35 + r() * 0.5, len = (0.42 + r() * 0.25) * s;
    const stem = new THREE.Group(); stem.position.set(x, 0.3 * s, z); stem.rotation.set(0, a, 0);
    const leaf = sph(0.2 * s, k % 2 ? lm : lm2, 0, 0, 0); leaf.scale.set(0.5, 0.07, 1.0);
    const arm = new THREE.Group(); arm.rotation.x = -PI / 2 + tilt; arm.add(cyl(0.012 * s, 0.014 * s, len, lm2, 0, len / 2, 0, 8));
    leaf.position.set(0, len, 0.1 * s); leaf.rotation.x = PI / 2 - 0.3; arm.add(leaf); stem.add(arm); g.add(stem);
  }
}
function art(g, x, y, w, h, color) { g.add(rb(w + 0.08, h + 0.08, 0.04, M(C.woodDark), x, y, 0.03, 0.01)); g.add(bx(x - w / 2, x + w / 2, y - h / 2, y + h / 2, 0.045, 0.055, M(color, { r: 0.9 }))); }

// --- quarto
const bedTop = 0.52;
piece(1.8, Y1 + 0.03, 1.25, g => {
  g.add(rb(1.74, 0.26, 2.2, M(C.woodDark), 0, 0.17, 0, 0.04));
  for (const sx of [-0.78, 0.78]) for (const sz of [-1.0, 1.0]) g.add(cyl(0.04, 0.03, 0.08, M(C.woodDark), sx, 0.04, sz, 10));
  g.add(rb(1.64, 0.24, 2.1, fabric(C.white, 5), 0, 0.4, 0, 0.08));
  g.add(rb(1.84, 1.0, 0.12, M(C.woodDark), 0, 0.62, -1.12, 0.05));
  g.add(rb(0.74, 0.16, 0.44, fabric(C.white, 3), 0, 0.6, -0.76, 0.08));
});
const blanket = new THREE.Group();
{
  blanket.add(rb(1.7, 0.3, 1.5, fabric(C.blue, 7), 0, 0, 0, 0.12));
  blanket.add(rb(1.72, 0.31, 0.26, fabric(C.white, 4), 0, 0.004, -0.63, 0.12));
  scene.add(blanket); reg(blanket);
}
const BLANKET_ON = { p: [1.8, Y1 + 0.03 + 0.69, 1.62], s: [1, 1.42, 1.02] };
const BLANKET_OFF = { p: [1.8, Y1 + 0.03 + 0.7, 1.98], s: [1, 1.5, 0.5] };
const lampM = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: new THREE.Color('#ffd98a'), emissiveIntensity: 0, roughness: 0.6 });
piece(3.05, Y1 + 0.03, 0.4, g => {
  g.add(rb(0.52, 0.5, 0.46, M(C.woodLight), 0, 0.25, 0, 0.04));
  g.add(rb(0.44, 0.16, 0.02, M(C.woodDark), 0, 0.34, 0.235, 0.008)); g.add(sph(0.022, M(C.metal, { m: 0.8, r: 0.3 }), 0, 0.34, 0.25));
  g.add(cyl(0.07, 0.09, 0.03, M(C.dark), -0.08, 0.515, 0)); g.add(cyl(0.012, 0.012, 0.22, M(C.dark), -0.08, 0.62, 0, 8));
  g.add(cyl(0.09, 0.14, 0.18, lampM, -0.08, 0.8, 0));
  g.add(rb(0.14, 0.1, 0.07, M(C.coral), 0.14, 0.55, 0.05, 0.03));       // despertador
});
piece(0.48, Y1 + 0.03, 0.5, g => plant(g, 1.15));
piece(3.2, Y1 + 0.03, 2.5, g => { g.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.035, 40), fabric(C.marigold, 9)))); g.children[0].position.y = 0.018; });
piece(2.85, Y1 + 0.03, 1.9, g => { g.add(rb(0.11, 0.06, 0.24, M(C.coral), -0.08, 0.03, 0, 0.03)); g.add(rb(0.11, 0.06, 0.24, M(C.coral), 0.08, 0.03, 0.03, 0.03)); }, 0.3); // chinelos
piece(0, 0, 0, g => { art(g, 1.25, Y1 + 1.95, 0.7, 0.5, C.blueSoft); art(g, 2.25, Y1 + 2.02, 0.45, 0.6, C.marigold); });

// --- banheiro
piece(5.75, Y1 + 0.03, 0.5, g => {                                      // banheira
  g.add(rb(1.8, 0.58, 0.82, M(C.white, { r: 0.25 }), 0, 0.3, 0, 0.16));
  g.add(rb(1.56, 0.06, 0.58, M('#dcecf0', { r: 0.15 }), 0, 0.575, 0, 0.02));
  g.add(cyl(0.02, 0.02, 0.2, M(C.metal, { m: 0.9, r: 0.2 }), 0.78, 0.68, -0.2, 10));
});
piece(5.9, Y1 + 0.03, 3.02, g => {                                      // pia, de frente para a câmera
  g.add(rb(1.25, 0.76, 0.5, M(C.woodLight), 0, 0.38, 0, 0.04));
  g.add(rb(1.31, 0.07, 0.56, M(C.white, { r: 0.3 }), 0, 0.79, 0, 0.025));
  g.add(cyl(0.2, 0.16, 0.05, M('#dfe7ea', { r: 0.2 }), 0.12, 0.815, 0, 28));
  g.add(cyl(0.018, 0.018, 0.16, M(C.metal, { m: 0.9, r: 0.2 }), 0.12, 0.9, 0.19, 10));
  g.add(cyl(0.045, 0.04, 0.11, M(C.blueSoft, { r: 0.4 }), -0.38, 0.88, 0.05, 16));
  g.add(rb(0.16, 0.05, 0.1, M(C.coral), -0.4, 0.85, -0.14, 0.02));
});
piece(4.69, Y1 + 0.03, 1.0, g => {                                      // toalheiro na divisória
  g.add(cyl(0.014, 0.014, 0.7, M(C.metal, { m: 0.9, r: 0.25 }), 0.05, 1.25, 0, 10)); g.children[0].rotation.x = PI / 2;
  g.add(rb(0.05, 0.62, 0.42, fabric(C.coral, 4), 0.06, 0.96, 0.02, 0.02));
});
piece(5.9, Y1 + 0.03, 2.0, g => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.035, 36), fabric(C.blueSoft, 6))); m.position.y = 0.018; g.add(m); });
piece(0, 0, 0, g => {                                                   // espelho redondo
  const m = cyl(0.36, 0.36, 0.03, M(C.woodDark), 6.0, Y1 + 1.75, 0.03, 36); m.rotation.x = PI / 2; g.add(m);
  const m2 = cyl(0.31, 0.31, 0.01, M('#e8f1f5', { r: 0.05, m: 0.9 }), 6.0, Y1 + 1.75, 0.05, 36); m2.rotation.x = PI / 2; g.add(m2);
});
piece(7.85, Y1 + 0.03, 0.32, g => plant(g, 0.8));

// --- sala (sob a laje)
piece(1.45, 0.06, 0.75, g => {
  g.add(rb(2.0, 0.34, 0.9, fabric(C.blueSoft, 7), 0, 0.3, 0, 0.1));
  g.add(rb(2.0, 0.62, 0.26, fabric(C.blueSoft, 7), 0, 0.62, -0.34, 0.1));
  g.add(rb(0.24, 0.5, 0.9, fabric(C.blueSoft, 4), -1.0, 0.44, 0, 0.1)); g.add(rb(0.24, 0.5, 0.9, fabric(C.blueSoft, 4), 1.0, 0.44, 0, 0.1));
  g.add(rb(0.42, 0.42, 0.14, fabric(C.marigold, 3), -0.5, 0.64, -0.14, 0.06)); g.add(rb(0.42, 0.42, 0.14, fabric(C.coral, 3), 0.45, 0.64, -0.14, 0.06));
});
piece(1.5, 0.06, 2.1, g => {
  const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.03, 44), fabric(C.cream, 10))); m.position.y = 0.016; g.add(m);
  g.add(cyl(0.42, 0.42, 0.06, M(C.woodDark), 0, 0.36, 0, 36)); g.add(cyl(0.05, 0.16, 0.32, M(C.woodDark), 0, 0.17, 0, 16));
  g.add(cyl(0.07, 0.06, 0.1, M(C.marigold), 0.12, 0.44, 0.05, 16));
});
piece(3.35, 0.06, 0.55, g => plant(g, 1.3));
piece(0, 0, 0, g => art(g, 1.45, 1.75, 0.9, 0.55, C.coral));

// --- cozinha (extensão térrea)
const ISLAND = { x: 6.3, z: 5.45, w: 2.3, d: 0.72, h: 0.9 };
piece(ISLAND.x, 0.06, ISLAND.z, g => {
  g.add(rb(ISLAND.w, ISLAND.h - 0.06, ISLAND.d, M(C.sage, { r: 0.6 }), 0, (ISLAND.h - 0.06) / 2, 0, 0.04));
  g.add(rb(ISLAND.w + 0.1, 0.07, ISLAND.d + 0.1, M(C.woodLight, { r: 0.5 }), 0, ISLAND.h - 0.03, 0, 0.03));
  for (const sx of [-0.57, 0, 0.57]) g.add(rb(0.5, 0.56, 0.02, M(shade(C.sage, -0.04)), sx, 0.42, ISLAND.d / 2, 0.01));
  g.add(cyl(0.16, 0.13, 0.1, M(C.white, { r: 0.4 }), 0.75, ISLAND.h + 0.05, 0, 24));   // fruteira
  for (const [a, b, c] of [[0.7, 0.06, C.marigold], [0.8, -0.04, C.coral], [0.74, -0.02, C.marigold]]) g.add(sph(0.055, M(c, { r: 0.5 }), a, ISLAND.h + 0.12, b));
});
const MACHINE = new THREE.Vector3(ISLAND.x - 0.55, 0.06 + ISLAND.h + 0.005, ISLAND.z + 0.02);
piece(MACHINE.x, MACHINE.y, MACHINE.z, g => {                           // cafeteira
  const d = M(C.dark, { r: 0.35, m: 0.2 });
  g.add(rb(0.3, 0.05, 0.36, d, 0, 0.025, 0.02, 0.02));
  g.add(rb(0.3, 0.36, 0.16, d, 0, 0.2, -0.1, 0.03));
  g.add(rb(0.3, 0.12, 0.34, d, 0, 0.36, 0, 0.04));
  g.add(cyl(0.025, 0.02, 0.06, M(C.metal, { m: 0.9, r: 0.2 }), 0, 0.27, 0.08, 10));
});
piece(6.15, 0.06, 3.96, g => {                                          // bancada do fundo + fogão
  g.add(rb(0.62, 0.84, 2.3, M(C.white, { r: 0.6 }), 0, 0.42, 0, 0.04));
  g.add(rb(0.68, 0.07, 2.36, M(C.woodLight, { r: 0.5 }), 0, 0.87, 0, 0.03));
  for (const sz of [-0.3, 0.1]) for (const sx of [-0.13, 0.13]) g.add(cyl(0.085, 0.085, 0.015, M(C.dark, { r: 0.3 }), sx, 0.915, sz + 0.5, 20));
  g.add(cyl(0.11, 0.1, 0.12, M(C.coral, { r: 0.4 }), 0.0, 0.97, -0.75, 20)); // chaleira
  g.add(sph(0.03, M(C.dark), 0, 1.05, -0.75));
}, PI / 2);
piece(KX0 + 0.42, 0.06, 3.98, g => {                                    // geladeira
  g.add(rb(0.72, 1.85, 0.7, M(C.sage, { r: 0.45 }), 0, 0.925, 0, 0.06));
  g.add(rb(0.02, 0.5, 0.03, M(C.metal, { m: 0.9, r: 0.25 }), 0.37, 1.35, 0.22, 0.01));
  g.add(rb(0.725, 0.012, 0.705, M(shade(C.sage, -0.1)), 0, 1.02, 0, 0.004));
});
for (const sx of [-0.5, 0.45]) piece(ISLAND.x + sx, 0.06, ISLAND.z + 0.72, g => {       // banquetas
  g.add(cyl(0.17, 0.17, 0.05, M(C.woodDark), 0, 0.62, 0, 24));
  for (let k = 0; k < 4; k++) { const a = k * PI / 2 + PI / 4; const leg = cyl(0.016, 0.016, 0.62, M(C.dark, { m: 0.3, r: 0.5 }), Math.cos(a) * 0.13, 0.31, Math.sin(a) * 0.13, 8); leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); g.add(leg); }
});
piece(8.0, 0.06, 6.2, g => plant(g, 1.2));

// --- deck e piscina
piece(1.4, 0, 4.1, g => {                                               // espreguiçadeira
  g.add(rb(1.5, 0.08, 0.6, M(C.woodDark), 0, 0.26, 0, 0.03));
  for (const sx of [-0.65, 0.65]) for (const sz of [-0.24, 0.24]) g.add(cyl(0.025, 0.025, 0.24, M(C.woodDark), sx, 0.12, sz, 8));
  g.add(rb(1.05, 0.08, 0.56, fabric(C.white, 5), 0.2, 0.34, 0, 0.035));
  const back = rb(0.6, 0.08, 0.56, fabric(C.white, 5), 0, 0, 0, 0.035); const bg = new THREE.Group(); bg.position.set(-0.32, 0.34, 0); bg.rotation.z = -0.75; back.position.x = -0.3; bg.add(back); g.add(bg);
  g.add(rb(0.5, 0.05, 0.5, fabric(C.coral, 4), 0.35, 0.4, 0, 0.02));
});
piece(POOL.x1 + 0.02, 0, 5.05, g => {                                   // escadinha da piscina
  const m = M(C.metal, { m: 0.95, r: 0.2 });
  for (const sz of [-0.18, 0.18]) {
    g.add(cyl(0.02, 0.02, 0.95, m, -0.02, 0.05, sz, 10));
    const top = cyl(0.02, 0.02, 0.3, m, 0.12, 0.52, sz, 10); top.rotation.z = PI / 2; g.add(top);
    g.add(cyl(0.02, 0.02, 0.52, m, 0.27, 0.26, sz, 10));
  }
  for (const y of [-0.12, -0.34]) g.add(rb(0.07, 0.025, 0.36, m, -0.02, y, 0, 0.01));
});
const floatRing = new THREE.Group();
{
  const t = sh(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 16, 36), M(C.coral, { r: 0.35 }))); t.rotation.x = PI / 2; floatRing.add(t);
  for (let k = 0; k < 4; k++) { const s = sh(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.103, 16, 8, 0.42), M(C.white, { r: 0.35 }))); s.rotation.x = PI / 2; s.rotation.z = k * PI / 2; floatRing.add(s); }
  floatRing.position.set(0.95, WATER_Y + 0.06, 5.35); scene.add(floatRing); reg(floatRing);
}
piece(0.1, 0, 7.95, g => plant(g, 1.25));
piece(3.75, 0, 8.0, g => plant(g, 0.9));

// ---------------------------------------------------------------- personagem (boneco articulado)
const person = (() => {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = M(C.skin, { r: 0.6 });
  const shirtM = fabric(C.blue, 5), shortsM = fabric(C.marigold, 5), hairM = M(C.hair, { r: 0.95 });
  body.add(rb(0.37, 0.24, 0.25, shortsM, 0, 0.0, 0, 0.11));
  const spine = new THREE.Group(); spine.position.y = 0.08; body.add(spine);
  const torso = cap(0.168, 0.25, shirtM, 0, 0.28, 0); torso.scale.set(1.06, 1, 0.76); spine.add(torso);
  spine.add(cyl(0.052, 0.058, 0.09, skin, 0, 0.6, 0, 14));
  const head = new THREE.Group(); head.position.y = 0.63; spine.add(head);
  head.add(sph(0.152, skin, 0, 0.13, 0));
  const hair = sh(new THREE.Mesh(new THREE.SphereGeometry(0.162, 24, 16, 0, PI * 2, 0, PI * 0.55), hairM)); hair.position.set(0, 0.135, -0.016); hair.rotation.x = -0.32; head.add(hair);
  for (const sx of [-0.056, 0.056]) head.add(sph(0.017, M(C.dark, { r: 0.3 }), sx, 0.135, 0.142));
  const J = { body, spine, head };
  const sleeves = [];
  for (const [n, s] of [['l', 1], ['r', -1]]) {
    const shd = new THREE.Group(); shd.position.set(s * 0.218, 0.47, 0); spine.add(shd);
    const up = cap(0.058, 0.19, shirtM, 0, -0.135, 0); shd.add(up); sleeves.push(up);
    const el = new THREE.Group(); el.position.y = -0.28; shd.add(el);
    el.add(cap(0.047, 0.17, skin, 0, -0.115, 0));
    const hand = new THREE.Group(); hand.position.y = -0.26; el.add(hand); hand.add(sph(0.058, skin));
    J[n + 'Sh'] = shd; J[n + 'El'] = el; J[n + 'Hand'] = hand;
    const hip = new THREE.Group(); hip.position.set(s * 0.097, -0.04, 0); body.add(hip);
    hip.add(cap(0.086, 0.1, shortsM, 0, -0.1, 0)); hip.add(cap(0.076, 0.27, skin, 0, -0.2, 0));
    const knee = new THREE.Group(); knee.position.y = -0.42; hip.add(knee);
    knee.add(cap(0.06, 0.25, skin, 0, -0.18, 0)); knee.add(rb(0.105, 0.07, 0.22, skin, 0, -0.395, 0.045, 0.035));
    J[n + 'Hip'] = hip; J[n + 'Knee'] = knee;
  }
  // adereços na mão direita
  const cup = new THREE.Group(); cup.add(cyl(0.05, 0.04, 0.09, M(C.white, { r: 0.3 }), 0, 0, 0, 18)); cup.add(cyl(0.042, 0.042, 0.005, M('#4a2c17', { r: 0.3 }), 0, 0.043, 0, 18));
  cup.position.set(0, -0.03, 0.07); cup.rotation.x = PI / 2 * 0.9; J.rHand.add(cup);
  const brush = cyl(0.01, 0.01, 0.2, M(C.coral), 0, 0, 0.1, 8); brush.rotation.x = PI / 2; J.rHand.add(brush);
  scene.add(root); reg(root);
  return { root, J, torso, sleeves, shirtM, skin, cup, brush };
})();
const STAND = { hipY: 0.88, tilt: 0, spine: 0, head: 0, headY: 0, lShX: 0, lShZ: 0.08, lEl: -0.12, rShX: 0, rShZ: -0.08, rEl: -0.12, lHip: 0, lKnee: 0, rHip: 0, rKnee: 0 };
function applyPose(p0) {
  const p = { ...STAND, ...p0 }, J = person.J;
  J.body.position.y = p.hipY; J.body.rotation.x = p.tilt;
  J.spine.rotation.x = p.spine; J.head.rotation.set(p.head, p.headY, 0);
  J.lSh.rotation.set(p.lShX, 0, p.lShZ); J.lEl.rotation.x = p.lEl;
  J.rSh.rotation.set(p.rShX, 0, p.rShZ); J.rEl.rotation.x = p.rEl;
  J.lHip.rotation.x = p.lHip; J.lKnee.rotation.x = p.lKnee; J.rHip.rotation.x = p.rHip; J.rKnee.rotation.x = p.rKnee;
}
function setShirt(on) { person.torso.material = on ? person.shirtM : person.skin; person.sleeves.forEach(s => s.material = on ? person.shirtM : person.skin); }

// camiseta solta (voa quando ele tira)
const shirtProp = (() => {
  const geo = new THREE.IcosahedronGeometry(0.2, 3), r = mulberry32(31), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pos, i); const k = 0.82 + 0.3 * Math.sin(v.x * 17 + r()) * Math.cos(v.y * 13) + 0.1 * r(); v.multiplyScalar(k); pos.setXYZ(i, v.x * 1.25, v.y * 0.75, v.z); }
  geo.computeVertexNormals();
  const m = sh(new THREE.Mesh(geo, fabric(C.blue, 4))); m.visible = false; scene.add(m); return m;
})();
// xícara na cafeteira + vapor
const cupOnMachine = new THREE.Group();
cupOnMachine.add(cyl(0.05, 0.04, 0.09, M(C.white, { r: 0.3 }), 0, 0.045, 0, 18));
cupOnMachine.position.set(MACHINE.x, MACHINE.y + 0.05, MACHINE.z + 0.09); scene.add(cupOnMachine);
const steam = [0, 1, 2].map(i => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 })); scene.add(m); return m; });

// respingo
const SPL_N = 170, splR = mulberry32(77);
const splSeeds = Array.from({ length: SPL_N }, () => ({ a: splR() * PI * 2, u: 0.4 + splR() * 2.0, v: 2.6 + splR() * 3.6, s: 0.6 + splR() * 1.7 }));
const splash = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: '#d9f6fb', roughness: 0.08, envMapIntensity: 1.5 }), SPL_N);
splash.castShadow = true; scene.add(splash);
const column = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.9, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#e6fafd', roughness: 0.15, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
scene.add(column);
const rings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: '#f2fdff', transparent: true, opacity: 0.7 })); m.rotation.x = PI / 2; scene.add(m); return m; });
const dummy = new THREE.Object3D();
function setSplash(ts, cx, cz) {
  const on = ts >= 0;
  splash.visible = column.visible = on; rings.forEach(r => r.visible = on);
  for (let i = 0; i < SPL_N; i++) {
    const s = splSeeds[i], y = WATER_Y + s.v * ts - 4.9 * ts * ts;
    dummy.position.set(cx + Math.cos(s.a) * s.u * ts, y, cz + Math.sin(s.a) * s.u * ts);
    dummy.scale.setScalar(on && y > WATER_Y - 0.02 ? s.s : 0.0001); dummy.updateMatrix(); splash.setMatrixAt(i, dummy.matrix);
  }
  splash.instanceMatrix.needsUpdate = true;
  if (on) {
    const k = Math.sin(clamp(ts / 0.55) * PI);
    column.scale.set(0.7 + ts * 0.9, Math.max(0.001, k), 0.7 + ts * 0.9); column.position.set(cx, WATER_Y + 0.75 * k, cz);
    rings.forEach((r, i) => { const rad = 0.35 + (ts + i * 0.12) * 1.5; r.scale.set(rad, rad, 1); r.position.set(cx, WATER_Y + 0.02, cz); r.material.opacity = clamp(0.8 - ts * 0.8); r.visible = r.material.opacity > 0.02 && rad < 1.35; });
  }
  // ondas na água
  const p = waterGeo.attributes.position, wx = water.position.x, wz = water.position.z;
  for (let i = 0; i < p.count; i++) {
    const x = waterBase[i * 3], z = waterBase[i * 3 + 2];
    let y = 0.012 * Math.sin(x * 5.1 + 1.3) * Math.cos(z * 4.3 + 0.4);
    if (on) { const d = Math.hypot(x + wx - cx, z + wz - cz); y += 0.09 * Math.exp(-ts * 1.2) * Math.sin(d * 7 - ts * 13) * Math.exp(-d * 0.9) * clamp(ts * 6); }
    p.setY(i, y);
  }
  p.needsUpdate = true; waterGeo.computeVertexNormals();
}

// ---------------------------------------------------------------- luz
const sun = new THREE.DirectionalLight('#fff1dc', 3.0);
sun.position.set(11.5, 16, 6.2); sun.target.position.set(4, 1, 4); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 60 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035; sun.shadow.radius = 5; sun.shadow.blurSamples = 16;
const hemi = new THREE.HemisphereLight('#f4f7ff', '#cdbfa8', 0.5); scene.add(hemi);
const fill = new THREE.DirectionalLight('#eaf2ff', 0.7); fill.position.set(6, 3, 12); scene.add(fill);   // enche o térreo, sob a laje
const lampLight = new THREE.PointLight('#ffcf80', 0, 4.5, 2); lampLight.position.set(2.97, Y1 + 0.95, 0.42); scene.add(lampLight);
const roomLight = new THREE.PointLight('#ffe2b8', 6, 6, 2); roomLight.position.set(2.2, 2.2, 2.2); scene.add(roomLight);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.ShadowMaterial({ opacity: 0.3 }));
ground.rotation.x = -PI / 2; ground.position.y = -BASE.t; ground.receiveShadow = true; scene.add(ground);
const cDay = new THREE.Color(C.paper), cNight = new THREE.Color(C.night);
function setDay(d) {
  sun.intensity = lerp(0.4, 3.5, d); sun.color.set('#9fb6ff').lerp(new THREE.Color('#fff1dc'), d);
  hemi.intensity = lerp(0.22, 0.5, d); fill.intensity = lerp(0.15, 0.55, d);
  scene.environmentIntensity = lerp(0.1, 0.32, d);
  scene.background.copy(cNight).lerp(cDay, d);
  renderer.toneMappingExposure = lerp(0.85, 0.98, d);
  glassM.emissiveIntensity = lerp(0.12, 0.9, d); glassM.emissive.set('#7f95d8').lerp(new THREE.Color('#cfe8ff'), d);
  lampM.emissiveIntensity = lerp(1.6, 0, d); lampLight.intensity = lerp(5, 0, d);
  roomLight.intensity = lerp(1.5, 6, d);
}

// ---------------------------------------------------------------- pós-processamento
const rt = new THREE.WebGLRenderTarget(VW, VH, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1); composer.setSize(VW, VH);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, VW, VH);
gtao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.2, thickness: 1.4, scale: 1.5, samples: 16 });
gtao.blendIntensity = 1.0;
composer.addPass(gtao);
const hTilt = new ShaderPass(HorizontalTiltShiftShader), vTilt = new ShaderPass(VerticalTiltShiftShader);
composer.addPass(hTilt); composer.addPass(vTilt);
composer.addPass(new OutputPass());
function setTilt(amount, r = 0.5) { hTilt.uniforms.h.value = amount / VW; vTilt.uniforms.v.value = amount / VH; hTilt.uniforms.r.value = r; vTilt.uniforms.r.value = r; }

// ---------------------------------------------------------------- câmera e montagem
const AZ = 38 * PI / 180, EL = 27 * PI / 180;
function setCam(c) {
  const az = c.az ?? AZ, el = c.el ?? EL, dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const t = new THREE.Vector3(...c.t);
  camera.position.copy(t).addScaledVector(dir, 60); camera.lookAt(t);
  const hh = c.size / 2, hw = hh * VW / VH;
  camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh; camera.updateProjectionMatrix();
  setTilt(c.tilt ?? 1.1, c.focus ?? 0.5);
}
function assemble(p) {
  const n = pops.length, span = 7;
  pops.forEach((o, i) => { const q = clamp((p * (n + span) - i) / span); o.visible = q > 0; const k = q >= 1 ? 1 : Math.max(0.001, easeOutBack(q)); o.scale.copy(o.userData.s0).multiplyScalar(k); });
}

// ---------------------------------------------------------------- momentos-chave (cards)
const BED = { x: 1.8, y: Y1 + 0.03, z: 1.35 };
const stairPos = i => ({ x: 7.8, y: Y1 - (i + 1) * STAIR.rise, z: STAIR.z0 + (i + 0.55) * STAIR.run });
const DECK = { x: 3.62, y: 0, z: 6.55 }, DIVE = { x: 1.75, z: 6.15 };
const KEYS = [
  { id: '00-montagem', cam: { t: [4.3, 1.5, 4.0], size: 11.4, tilt: 1.8 }, day: 1, asm: 0.62,
    person: { ...BED, rot: 0, pose: { hipY: 0.64, tilt: -PI / 2, lShZ: 0.1, rShZ: -0.1 } }, blanket: 1 },
  { id: '01-dorme', cam: { t: [2.45, Y1 + 0.95, 1.75], size: 5.0 }, day: 0,
    person: { ...BED, rot: 0, pose: { hipY: 0.64, tilt: -PI / 2, lShZ: 0.1, rShZ: -0.1, headY: 0.25 } }, blanket: 1 },
  { id: '02-acorda', cam: { t: [2.45, Y1 + 0.95, 1.75], size: 5.0 }, day: 1,
    person: { ...BED, rot: 0, pose: { hipY: 0.64, spine: -0.12, head: -0.28, lHip: -PI / 2, rHip: -PI / 2, lShZ: 2.55, rShZ: -2.7, lEl: -0.55, rEl: -0.35 } }, blanket: 0 },
  { id: '03-banheiro', cam: { t: [5.75, Y1 + 0.95, 1.9], size: 4.7 }, day: 1,
    person: { x: 5.86, y: Y1 + 0.03, z: 2.42, rot: 0.15, pose: { rShX: -0.95, rShZ: -0.25, rEl: -2.05, lShZ: 0.35, lEl: -0.75, head: 0.06 } }, brush: 1 },
  { id: '04-escada', cam: { t: [7.3, 1.75, 2.9], size: 6.9 }, day: 1,
    person: { ...stairPos(6), rot: 0.1, pose: { hipY: 0.82, spine: 0.08, lHip: -0.95, lKnee: 0.8, rHip: 0.15, rKnee: 0.5, lShX: 0.45, rShX: -0.5, lEl: -0.35, rEl: -0.5 } } },
  { id: '05-cafe', cam: { t: [6.2, 0.95, 5.0], size: 4.9 }, day: 1,
    person: { x: 6.25, y: 0.06, z: 4.7, rot: 0.3, pose: { rShX: -1.05, rShZ: -0.2, rEl: -1.85, lShX: -0.55, lShZ: 0.2, lEl: -0.75, head: -0.08 } }, cup: 1 },
  { id: '06-espreguica', cam: { t: [3.2, 0.95, 6.1], size: 5.4 }, day: 1,
    person: { ...DECK, rot: 0.66, pose: { hipY: 0.9, spine: -0.2, head: -0.3, lShZ: 2.85, rShZ: -2.6, lEl: -0.25, rEl: -0.7, lHip: 0.05, rHip: -0.08 } } },
  { id: '07-tira-a-camisa', cam: { t: [3.2, 0.95, 6.1], size: 5.4 }, day: 1,
    person: { ...DECK, rot: 0.2, pose: { spine: 0.1, head: 0.15, lShZ: 2.4, rShZ: -2.9, lEl: -0.9, rEl: -0.3, lHip: -0.1, rHip: 0.12, rKnee: 0.2 } }, shirt: { p: [DECK.x - 0.12, 2.12, DECK.z + 0.12], r: [0.4, 0.3, 0.5], k: 1.35 } },
  { id: '08-piscina', cam: { t: [3.3, 1.0, 5.4], size: 8.2, tilt: 1.4 }, day: 1,
    person: { x: DIVE.x, y: -0.66, z: DIVE.z, rot: 0.66, pose: { tilt: 0.12, lShZ: 2.5, rShZ: -2.5, lEl: -0.3, rEl: -0.3, head: -0.2 } }, shirt: { p: [DECK.x + 0.55, 0.09, DECK.z + 0.5], r: [0, 0.4, 0], flat: 1 }, splash: 0.3 },
  { id: '09-plano-final', cam: { t: [4.3, 1.5, 4.0], size: 11.4, tilt: 1.8 }, day: 1,
    person: { x: DIVE.x + 0.1, y: -0.98, z: DIVE.z + 0.2, rot: 0.66, pose: { lShZ: 1.5, rShZ: -1.5, lEl: -0.2, rEl: -0.2, head: -0.1 } }, shirt: { p: [DECK.x + 0.55, 0.09, DECK.z + 0.5], r: [0, 0.4, 0], flat: 1 }, splash: 1.5 },
];

// adereços da cafeteira
const ledM = new THREE.MeshStandardMaterial({ color: C.coral, emissive: new THREE.Color(C.coral), emissiveIntensity: 0.6, roughness: 0.4 });
const led = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), ledM); led.position.set(MACHINE.x + 0.1, MACHINE.y + 0.36, MACHINE.z + 0.175); scene.add(led);
const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 8), M('#4a2c17', { r: 0.3 })); stream.position.set(MACHINE.x, MACHINE.y + 0.175, MACHINE.z + 0.09); scene.add(stream);
const CUP_MACHINE = [MACHINE.x, MACHINE.y + 0.05, MACHINE.z + 0.09], CUP_REST = [5.98, 0.06 + ISLAND.h + 0.005, 5.28];
reg(cupOnMachine);

function setScene(o) {
  // o: { asm, day, cam, person:{x,y,z,rot,pose}, blanket:{p,s}, brush, cup:'machine'|'hand'|'rest', steam:t|null, stream, led, shirt:null|{p,r,k,flat}, splash, t }
  blanket.position.set(...o.blanket.p); blanket.userData.s0.set(...o.blanket.s);
  cupOnMachine.position.set(...(o.cup === 'rest' ? CUP_REST : CUP_MACHINE));
  assemble(o.asm ?? 1);
  setDay(o.day);
  setCam(o.cam);
  const pr = o.person;
  person.root.position.set(pr.x, pr.y, pr.z); person.root.rotation.y = pr.rot; applyPose(pr.pose);
  person.brush.visible = !!o.brush; person.cup.visible = o.cup === 'hand'; cupOnMachine.visible = o.cup !== 'hand' && (o.asm ?? 1) > 0.97;
  stream.visible = !!o.stream; led.visible = (o.asm ?? 1) > 0.9; ledM.emissiveIntensity = o.led ?? 0.6;
  scene.updateMatrixWorld(true);
  const base = new THREE.Vector3();
  if (o.cup === 'hand') person.cup.getWorldPosition(base); else base.set(cupOnMachine.position.x, cupOnMachine.position.y + 0.06, cupOnMachine.position.z);
  steam.forEach((s, i) => {
    s.visible = o.steam != null;
    if (s.visible) { const k = ((o.steam * 0.55 + i / 3) % 1 + 1) % 1; s.position.set(base.x + Math.sin(i * 2.1 + k * 3) * 0.025, base.y + 0.06 + k * 0.3, base.z); s.scale.setScalar(0.8 + k * 1.3); s.material.opacity = 0.5 * (1 - k); }
  });
  setShirt(!o.shirt);
  shirtProp.visible = !!o.shirt;
  if (o.shirt) { const sk = o.shirt.k || 1, fl = o.shirt.flat ?? 1; shirtProp.position.set(...o.shirt.p); shirtProp.rotation.set(...o.shirt.r); shirtProp.scale.set(sk, fl * sk, sk); }
  setSplash(o.splash ?? -1, DIVE.x, DIVE.z);
  floatRing.position.y = WATER_Y + 0.06 + (o.splash > 0 ? 0.035 * Math.sin(o.splash * 7) * Math.exp(-o.splash * 0.9) : 0);
}
function applyKey(k) {
  setScene({
    asm: k.asm, day: k.day, cam: k.cam, person: { ...k.person, pose: { ...STAND, ...k.person.pose } },
    blanket: k.blanket ? BLANKET_ON : BLANKET_OFF, brush: k.brush, cup: k.cup ? 'hand' : 'machine', steam: k.cup ? 0.2 : null,
    shirt: k.shirt ? { p: k.shirt.p, r: k.shirt.r, k: k.shirt.k, flat: k.shirt.flat ? 0.45 : 1 } : null, splash: k.splash,
  });
}
function render() { scene.updateMatrixWorld(true); composer.render(); }

// ---------------------------------------------------------------- linha do tempo
const io = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const outC = x => 1 - Math.pow(1 - x, 3);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerpA = (a, b, u) => { const d = ((b - a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI; return a + d * u; };
const UPF = Y1 + 0.03, GF = 0.06;
const st = (x, y, z, rot, pose = {}) => ({ x, y, z, rot, pose: { ...STAND, ...pose } });
function mixS(a, b, u) {
  const pose = {}; for (const k in STAND) pose[k] = lerp(a.pose[k], b.pose[k], u);
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u), rot: lerp(a.rot, b.rot, u), pose };
}
const POSES = {
  sleep: { hipY: 0.64, tilt: -PI / 2, lShZ: 0.1, rShZ: -0.1, headY: 0.25 },
  yawn: { hipY: 0.64, spine: -0.12, head: -0.28, lHip: -PI / 2, rHip: -PI / 2, lShZ: 2.55, rShZ: -2.7, lEl: -0.55, rEl: -0.35 },
  sitEdge: { hipY: 0.64, spine: 0.15, lHip: -PI / 2, rHip: -PI / 2, lKnee: PI / 2, rKnee: PI / 2 },
  brush: { rShX: -0.95, rShZ: -0.25, rEl: -2.05, lShZ: 0.35, lEl: -0.75, head: 0.06 },
  reach: { spine: 0.3, rShX: -1.35, rEl: -0.2, head: 0.1 },
  coffee: { rShX: -1.05, rShZ: -0.2, rEl: -1.85, lShX: -0.55, lShZ: 0.2, lEl: -0.75, head: -0.08 },
  stretch: { hipY: 0.9, spine: -0.2, head: -0.3, lShZ: 2.85, rShZ: -2.6, lEl: -0.25, rEl: -0.7, lHip: 0.05, rHip: -0.08 },
  hem: { spine: 0.2, head: 0.22, lShX: -0.35, lShZ: -0.3, lEl: -1.5, rShX: -0.35, rShZ: 0.3, rEl: -1.5 },
  shirtUp: { spine: 0.1, head: 0.15, lShZ: 2.4, rShZ: -2.9, lEl: -0.9, rEl: -0.3, lHip: -0.1, rHip: 0.12, rKnee: 0.2 },
  crouch: { hipY: 0.6, spine: 0.55, lHip: -1.15, rHip: -1.15, lKnee: 1.6, rKnee: 1.6, lShX: 0.8, rShX: 0.8 },
  tuck: { hipY: 0.88, spine: 0.55, head: 0.2, lHip: -2.0, rHip: -2.0, lKnee: 2.3, rKnee: 2.3, lShX: -1.25, rShX: -1.25, lEl: -1.2, rEl: -1.2 },
  float: { lShZ: 1.5, rShZ: -1.5, lEl: -0.2, rEl: -0.2, head: -0.1 },
};
function stairY(z) {
  const f = (z - STAIR.z0) / STAIR.run; if (f <= 0) return UPF;
  const top = i => i < 0 ? UPF : Y1 - (i + 1) * STAIR.rise + 0.012;
  if (f >= STAIR.n) return lerp(top(STAIR.n - 1), GF, io(clamp((f - STAIR.n) / 0.6)));
  const i = Math.floor(f); return lerp(top(i - 1), top(i), io(clamp((f - i) / 0.55)));
}
function walkPose(ph, a, stairs) {
  const s = Math.sin(ph), c = Math.cos(ph), hip = stairs ? 0.5 : 0.62, kn = stairs ? 1.15 : 0.9;
  return {
    lHip: -hip * a * s - (stairs ? 0.25 * a : 0), rHip: hip * a * s - (stairs ? 0.25 * a : 0),
    lKnee: kn * a * Math.max(0, c) + (stairs ? 0.3 * a : 0), rKnee: kn * a * Math.max(0, -c) + (stairs ? 0.3 * a : 0),
    lShX: 0.5 * a * s, rShX: -0.5 * a * s, lEl: -0.12 - 0.35 * a, rEl: -0.12 - 0.35 * a,
    hipY: 0.88 - (stairs ? 0.05 : 0.015) * a + 0.022 * a * Math.cos(2 * ph), spine: 0.07 * a,
  };
}
function makePath(pts) {
  const segs = []; let L = 0, Tau = 0, Ph = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], o = b[3] || {}, d = Math.hypot(b[0] - a[0], b[2] - a[2]), w = o.w || 1, stride = o.stride || 1.1;
    segs.push({ a, b, d, w, stride, stairs: !!o.stairs, L0: L, T0: Tau, P0: Ph, h: Math.atan2(b[0] - a[0], b[2] - a[2]) });
    L += d; Tau += d * w; Ph += d / stride * 2 * PI;
  }
  return { segs, L, Tau };
}
function walkState(path, u0, startRot, endRot) {
  const u = clamp(u0), ue = lerp(u, u * u * (3 - 2 * u), 0.6), tau = ue * path.Tau, n = path.segs.length;
  let i = n - 1; for (let k = 0; k < n; k++) { const q = path.segs[k]; if (tau <= q.T0 + q.d * q.w) { i = k; break; } }
  const s = path.segs[i], f = clamp((tau - s.T0) / (s.d * s.w)), d = s.L0 + f * s.d;
  const x = lerp(s.a[0], s.b[0], f), z = lerp(s.a[2], s.b[2], f), y = s.stairs ? stairY(z) : lerp(s.a[1], s.b[1], f);
  const near = 0.3, dIn = f * s.d, dOut = (1 - f) * s.d; let h = s.h;
  if (dIn < near && i > 0) h = lerpA(path.segs[i - 1].h, s.h, 0.5 + 0.5 * dIn / near);
  else if (dOut < near && i < n - 1) h = lerpA(s.h, path.segs[i + 1].h, 0.5 * (1 - dOut / near));
  if (startRot != null) h = lerpA(startRot, h, clamp(d / 0.4));
  if (endRot != null) h = lerpA(h, endRot, clamp(1 - (path.L - d) / 0.4));
  const amp = Math.max(0, Math.min(1, d / 0.3, (path.L - d) / 0.3)), ph = s.P0 + f * s.d / s.stride * 2 * PI;
  return { x, y, z, rot: h, pose: { ...STAND, ...walkPose(ph, amp, s.stairs) } };
}
// construtor de clipes: cada um começa onde o anterior terminou
const clips = []; let cur = st(BED.x, UPF, BED.z, 0, POSES.sleep), TT = 0;
const hold = t1 => { const s = cur; clips.push({ t0: TT, t1, fn: () => s }); TT = t1; };
const to = (t1, s, ease = io) => { const a = cur; clips.push({ t0: TT, t1, fn: u => mixS(a, s, ease(u)) }); cur = s; TT = t1; };
const walk = (t1, pts, endRot) => {
  const path = makePath([[cur.x, cur.y, cur.z], ...pts]), r0 = cur.rot;
  clips.push({ t0: TT, t1, fn: u => walkState(path, u, r0, endRot) }); cur = walkState(path, 1, r0, endRot); cur.pose = { ...STAND }; TT = t1;
};
const T_SUN = 4.6;
hold(5.0);                                                         // dorme
to(5.45, st(BED.x, UPF, BED.z, 0, POSES.yawn), outC);              // senta e boceja
hold(6.3);
to(6.72, st(2.42, UPF, 1.35, PI / 2, POSES.sitEdge));              // gira para a beira da cama
to(7.02, st(2.95, UPF, 1.4, PI / 2));                              // levanta
walk(9.15, [[3.7, UPF, 2.45], [5.2, UPF, 2.6], [5.86, UPF, 2.42]], 0.15);          // até a pia
const T_BRUSH0 = 9.45, T_BRUSH1 = 10.35;
to(T_BRUSH0, st(5.86, UPF, 2.42, 0.15, POSES.brush));
hold(T_BRUSH1);
to(10.6, st(5.86, UPF, 2.42, 0.15));
walk(16.55, [[6.75, UPF, 0.85], [7.75, UPF, 0.42], [7.8, UPF, STAIR.z0], [7.8, GF, 3.62, { stairs: true, stride: 0.4, w: 1.55 }], [7.8, GF, 3.98], [7.72, GF, 4.68], [5.9, GF, 4.68]], 0.2); // patamar, escada, cozinha
const KIT = [5.9, GF, 4.68, 0.2];
to(16.92, st(...KIT, POSES.reach));                               // aperta o botão
to(17.17, st(...KIT));
hold(17.9);                                                        // espera o café
const T_GRAB = 18.2, T_PUT = 19.62;
to(T_GRAB, st(...KIT, POSES.reach));
to(18.6, st(...KIT, POSES.coffee));
hold(19.3);                                                        // gole
to(T_PUT, st(...KIT, { ...POSES.reach, spine: 0.2, rShX: -1.0, rShZ: 0.25 }));
to(19.85, st(...KIT));
walk(21.85, [[4.7, GF, 4.78], [3.9, 0, 5.6], [DECK.x, 0, DECK.z]], 0.66);          // sai para o deck
to(22.5, st(DECK.x, 0, DECK.z, 0.66, POSES.stretch));              // espreguiça
hold(23.2);
to(23.45, st(DECK.x, 0, DECK.z, 0.66));
to(23.72, st(DECK.x, 0, DECK.z, 0.3, POSES.hem));
const T_OFF = 23.93;
to(24.0, st(DECK.x, 0, DECK.z, 0.2, POSES.shirtUp), outC);         // puxa a camiseta
hold(24.12);
to(24.4, st(DECK.x, 0, DECK.z, -1.35));
const T_CROUCH = 24.4;
to(24.66, st(3.56, 0, 6.5, -1.4, POSES.crouch));
const T_JUMP = 24.66, T_IMP = 25.24;
{
  const a = cur, tuck = { ...STAND, ...POSES.tuck };
  clips.push({ t0: T_JUMP, t1: T_IMP, fn: u => {
    const pose = {}; const k = outC(seg(u, 0, 0.4)); for (const q in STAND) pose[q] = lerp(a.pose[q], tuck[q], k);
    pose.tilt = 0.5 * u;
    return { x: lerp(a.x, DIVE.x, u), y: 4 * 1.0 * u * (1 - u) + lerp(0, -0.5, u), z: lerp(a.z, DIVE.z, u), rot: -1.4, pose };
  } });
  cur = st(DIVE.x, -0.5, DIVE.z, -1.4, { ...POSES.tuck, tilt: 0.5 }); TT = T_IMP;
}
to(25.5, st(DIVE.x, -1.35, DIVE.z, -0.6, POSES.tuck), outC);       // afunda
to(26.4, st(DIVE.x + 0.1, -0.98, DIVE.z + 0.2, 0.66, POSES.float)); // volta e boia
const DURATION = 27.5;
hold(DURATION + 1);
function personAt(t) { for (const c of clips) if (t < c.t1) return c.fn(clamp((t - c.t0) / (c.t1 - c.t0))); return cur; }
const findT = (t0, t1, pred) => { for (let t = t0; t < t1; t += 1 / 48) if (pred(personAt(t))) return Math.round(t * 24) / 24; return t1; };

// planos: câmera parada, toda troca é corte seco
const CAMS = {
  wide: { t: [4.3, 1.5, 4.0], size: 11.4, tilt: 1.8 },
  bed: { t: [2.45, Y1 + 0.95, 1.75], size: 5.0 },
  bath: { t: [5.75, Y1 + 0.95, 1.9], size: 4.7 },
  stair: { t: [7.3, 1.75, 2.9], size: 6.9 },
  kitchen: { t: [6.2, 0.95, 5.0], size: 4.9 },
  deck: { t: [3.2, 0.95, 6.1], size: 5.4 },
  pool: { t: [3.3, 1.0, 5.4], size: 8.2, tilt: 1.4 },
};
const SHOTS = [
  { t0: 0, cam: CAMS.wide },
  { t0: 2.625, cam: CAMS.bed },
  { t0: findT(7.0, 9.2, s => s.x > 4.62), cam: CAMS.bath },
  { t0: findT(10.6, 16.5, s => s.x > 7.35), cam: CAMS.stair },
  { t0: findT(11, 16.5, s => s.z > 3.75 && s.y < 0.3), cam: CAMS.kitchen },
  { t0: findT(19.9, 21.9, s => s.x < 4.45), cam: CAMS.deck },
  { t0: T_CROUCH, cam: CAMS.pool },
  { t0: T_IMP + 0.75, cam: CAMS.wide },
];
const NIGHT = 0.1;
function frame(t) {
  const s = personAt(t); s.pose = { ...s.pose };
  if (t > T_BRUSH0 && t < T_BRUSH1) { const w = Math.sin((t - T_BRUSH0) * 2 * PI * 4.5); s.pose.rEl += 0.17 * w; s.pose.rShX += 0.06 * w; }
  const bk = io(seg(t, 5.0, 5.5)), breath = t < 5 ? 1 + 0.03 * Math.sin(t * 2.4) : 1;
  const blanketS = { p: BLANKET_ON.p.map((v, i) => lerp(v, BLANKET_OFF.p[i], bk)), s: BLANKET_ON.s.map((v, i) => lerp(v, BLANKET_OFF.s[i], bk) * (i === 1 ? breath : 1)) };
  let shirt = null;
  if (t >= T_OFF) {
    const u = seg(t, T_OFF, T_OFF + 0.8), p0 = [DECK.x - 0.12, 2.12, DECK.z + 0.12], p1 = [DECK.x + 0.6, 0.09, DECK.z + 0.55];
    shirt = { p: [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u * u) + 0.45 * 4 * u * (1 - u), lerp(p0[2], p1[2], u)], r: [0.4 + u * 5, 0.3 + u * 3.2, 0.5 * (1 - u)], k: lerp(1.3, 1, u), flat: lerp(1, 0.45, seg(u, 0.85, 1)) };
  }
  let shot = SHOTS[0]; for (const q of SHOTS) if (t >= q.t0 - 1e-6) shot = q;
  setScene({
    asm: seg(t, 0.1, 2.4), day: lerp(NIGHT, 1, outC(seg(t, T_SUN, T_SUN + 0.3))), cam: shot.cam, person: s, blanket: blanketS,
    brush: t > T_BRUSH0 - 0.2 && t < T_BRUSH1 + 0.15,
    cup: t < T_GRAB ? 'machine' : t < T_PUT ? 'hand' : 'rest',
    steam: t > 17.6 && t < 21.5 ? t : null, stream: t > 17.2 && t < 17.88,
    led: t > 16.92 && t < 17.9 ? (Math.floor(t * 8) % 2 ? 2.6 : 0.2) : 0.6,
    shirt, splash: t >= T_IMP ? t - T_IMP : -1,
  });
}

window.KEYS = KEYS;
window.DURATION = DURATION;
window.SHOTS = SHOTS.map(s => s.t0);
window.renderKey = i => { applyKey(KEYS[i]); render(); return KEYS[i].id; };
window.renderAt = t => { frame(t); render(); return t; };
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida';
const q = new URLSearchParams(location.search);
if (q.has('t')) window.renderAt(Number(q.get('t'))); else window.renderKey(Number(q.get('key') ?? 8));
window.ready = true;
