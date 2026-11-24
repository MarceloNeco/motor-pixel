// ilha.js: a ilha-maquete. Seis setores em fatia ao redor de um vulcão, separados por rios que descem até o mar.
// Cada setor tem um bioma (cor de chão e vegetação próprias) e uma clareira para o seu dinossauro.
// Ângulos em graus no "espaço da ilha": 0 = direita, 90 = fundo (longe da câmera), 270 = frente.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PI, TAU, DEG, lerp, clamp, smooth, seg, frac, mulberry32, cyc, canvasTex, LOOP } from './lib.js';

export const SX = 1.22;   // a ilha é mais larga que funda, para caber no 16:9
export const R0 = 20.2;
const outline = a => R0 * (1 + 0.055 * Math.sin(2 * a + 0.6) + 0.04 * Math.sin(3 * a + 1.9) + 0.022 * Math.sin(5 * a + 0.4));

// setores: centro em 30, 90, ... 330; os rios correm nas divisas (0, 60, ... 300)
export const SECTORS = [
  { id: 'triceratopo', nome: 'campina', a: 30, c1: '#cdb85c', c2: '#b3a64c' },
  { id: 'paquicefalossauro', nome: 'pedreira', a: 90, c1: '#97a08f', c2: '#7d8c70' },
  { id: 'alossauro', nome: 'cânion', a: 150, c1: '#d6834a', c2: '#bf653b' },
  { id: 'estegossauro', nome: 'samambaial', a: 210, c1: '#86b852', c2: '#6ea347' },
  { id: 'trex', nome: 'selva', a: 270, c1: '#4f8442', c2: '#3d6c39' },
  { id: 'parassaurolofo', nome: 'brejo', a: 330, c1: '#62a67c', c2: '#4c8f6c' },
];
// onde fica cada dinossauro: raio no espaço da ilha, giro (graus, 0 = olhando para a direita) e escala
export const SPOTS = [
  { id: 'trex', a: 270, r: 12.7, rot: 200, scale: 0.8 },
  { id: 'estegossauro', a: 210, r: 12.7, rot: -18, scale: 0.8 },
  { id: 'alossauro', a: 150, r: 12.5, rot: -22, scale: 0.8 },
  { id: 'paquicefalossauro', a: 90, r: 13.0, rot: -28, scale: 0.8 },
  { id: 'triceratopo', a: 30, r: 12.5, rot: 204, scale: 0.8 },
  { id: 'parassaurolofo', a: 330, r: 12.3, rot: 198, scale: 0.8 },
].map(s => ({ ...s, x: SX * s.r * Math.cos(s.a * DEG), z: -s.r * Math.sin(s.a * DEG) }));
const POND = { x: SX * 16.3 * Math.cos(318 * DEG), z: -16.3 * Math.sin(318 * DEG), rx: 3.0, rz: 1.9 };

// ---------------------------------------------------------------- ruído
function hash(i, j) { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y) { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return lerp(lerp(hash(i, j), hash(i + 1, j), u), lerp(hash(i, j + 1), hash(i + 1, j + 1), u), v); }
const fbm = (x, y) => 0.6 * vnoise(x, y) + 0.3 * vnoise(x * 2.1 + 5, y * 2.1 + 9) + 0.1 * vnoise(x * 4.3 + 1, y * 4.3 + 3);
const wrap = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };

// ---------------------------------------------------------------- terreno
const riverHalf = r => 0.4 + 0.42 * clamp(r / R0);
const riverAng = (k, r) => k * 60 * DEG + 0.05 * Math.sin(r * 0.5 + k * 1.7);
// tudo o que se sabe de um ponto do chão
export function ground(x, z) {
  const xi = x / SX, r = Math.hypot(xi, z), a = (Math.atan2(-z, xi) + TAU) % TAU, R = outline(a), rho = r / R;
  const n = fbm(x * 0.15 + 3, z * 0.15 + 7);
  let flat = 0; for (const s of SPOTS) flat = Math.max(flat, smooth(seg(Math.hypot(x - s.x, z - s.z), 5.5, 3.2)));
  let h = rho >= 1 ? -0.14 - (rho - 1) * 7 : -0.14 + 1.05 * smooth(seg(rho, 1, 0.84)) + 0.34 * (n - 0.5) * smooth(seg(rho, 0.93, 0.7)) * (1 - flat);
  // a pedreira (fundo) é um degrau mais alta
  const sec = Math.floor(a / (60 * DEG)) % 6;
  // vulcão no centro
  const m = smooth(seg(r, 6.0, 1.5)); h += 1.5 * m;
  // rios nas divisas dos setores
  let riv = 0, bank = 0;
  for (let k = 0; k < 6; k++) {
    const d = r * Math.abs(wrap(a - riverAng(k, r))), w = riverHalf(r), born = smooth(seg(r, 4.4, 6.6));
    riv = Math.max(riv, smooth(seg(d, w + 0.75, w)) * born); bank = Math.max(bank, smooth(seg(d, w + 1.35, w + 0.5)) * born);
  }
  if (riv > 0) h = lerp(h, Math.min(h, -0.32), riv);
  // lagoa do brejo
  const pd = Math.hypot((x - POND.x) / POND.rx, (z - POND.z) / POND.rz), pond = smooth(seg(pd, 1.2, 0.8));
  if (pond > 0) h = lerp(h, Math.min(h, -0.3), pond);
  bank = Math.max(bank, smooth(seg(pd, 1.75, 1.15)));
  return { h: Math.max(h, -3), rho, r, a, n, riv, bank, pond, m, sec, flat };
}
export const groundH = (x, z) => ground(x, z).h;

function terrain() {
  const W = 2 * R0 * SX + 9, D = 2 * R0 + 9, nx = 340, nz = 290;
  const geo = new THREE.PlaneGeometry(W, D, nx, nz); geo.rotateX(-PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const C = h => new THREE.Color(h), sand = C('#ecdcaa'), wet = C('#cdb984'), mud = C('#8f7b55'), rock = C('#6b5d52'), rockTop = C('#3a3330'), sea = C('#c9c08e'), tmp = new THREE.Color(), t2 = new THREE.Color();
  const sc = SECTORS.map(s => [C(s.c1), C(s.c2)]);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), g = ground(x, z);
    pos.setY(i, g.h);
    const idx = SECTORS.findIndex(s => Math.floor(s.a / 60) === g.sec), [c1, c2] = sc[idx];
    const n2 = fbm(x * 0.5 + 11, z * 0.5 + 4);
    tmp.copy(c1).lerp(c2, smooth(seg(n2, 0.3, 0.7)));
    if (SECTORS[idx].id === 'parassaurolofo') tmp.lerp(mud, 0.55 * smooth(seg(g.bank, 0.1, 0.9)));       // brejo: barro perto da água
    else tmp.lerp(sand, 0.8 * g.bank);                                                                    // margem de areia
    tmp.lerp(sand, smooth(seg(g.rho, 0.83, 0.9)));                                                         // praia
    tmp.lerp(rock, smooth(seg(g.m, 0.05, 0.3)));          // vulcão
    if (g.h < 0.05) tmp.lerp(wet, smooth(seg(g.h, 0.05, -0.1)));
    if (g.rho > 1) tmp.lerp(sea, 0.6);
    tmp.offsetHSL(0, 0, (fbm(x * 1.3, z * 1.3) - 0.5) * 0.06);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const grain = canvasTex(256, 256, (g, w, h) => { const r = mulberry32(5); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const v = 90 + r() * 90 | 0; g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5); } }, false);
  grain.repeat.set(40, 34);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, bumpMap: grain, bumpScale: 1.4 }));
  mesh.receiveShadow = true; mesh.castShadow = true;
  return mesh;
}

// ---------------------------------------------------------------- mar
const SEA = { w: 190, d: 140 };
function sea() {
  const cw = 2048, ch = Math.round(2048 * SEA.d / SEA.w), kx = cw / SEA.w, kz = ch / SEA.d;
  const tex = canvasTex(cw, ch, g => {
    g.fillStyle = '#1f6fa9'; g.fillRect(0, 0, cw, ch);
    const r = mulberry32(21);
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '14,74,130' : '52,140,190'},${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * cw, r() * ch, 80 + r() * 260, 30 + r() * 90, r() * 0.5, 0, TAU); g.fill(); }
    const shape = s => { g.beginPath(); for (let i = 0; i <= 180; i++) { const a = i / 180 * TAU, R = outline(a) * s, x = (SX * R * Math.cos(a) + SEA.w / 2) * kx, y = (-R * Math.sin(a) + SEA.d / 2) * kz; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.fill(); };
    for (const [s, c, b] of [[1.42, '#2787b9', 54], [1.2, '#3aa9c9', 34], [1.07, '#63cdd7', 14], [0.99, '#7fdcdc', 6]]) { g.filter = `blur(${b}px)`; g.fillStyle = c; shape(s); }
    g.filter = 'none';
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const waves = canvasTex(512, 512, (g, w, h) => {
    const r = mulberry32(8); g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) {
      const x = r() * w, y = r() * h, len = 18 + r() * 46; g.strokeStyle = `rgba(${r() < 0.5 ? '255,255,255' : '30,30,30'},${0.2 + r() * 0.3})`; g.lineWidth = 2 + r() * 4; g.lineCap = 'round';
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.beginPath(); g.moveTo(x + dx, y + dy); g.quadraticCurveTo(x + dx + len / 2, y + dy - 5 - r() * 4, x + dx + len, y + dy); g.stroke(); }
    }
  }, false);
  waves.repeat.set(26, 19);
  const mat = new THREE.MeshStandardMaterial({ map: tex, bumpMap: waves, bumpScale: 2.2, roughness: 0.32, metalness: 0.05 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SEA.w, SEA.d), mat); mesh.rotation.x = -PI / 2; mesh.receiveShadow = true;
  return { mesh, waves };
}
// espuma na beira da praia: uma faixa que acompanha o contorno (interrompida na foz dos rios)
function foam(rIn, rMid, rOut, alpha, dash = 0) {
  const pos = [], colr = [], idx = []; let n = 0;
  const N = 420; let open = false;
  for (let i = 0; i <= N; i++) {
    const a = i / N * TAU, R = outline(a);
    let inRiver = false; for (let k = 0; k < 6; k++) if (R * Math.abs(wrap(a - riverAng(k, R))) < riverHalf(R) + 1.3) inRiver = true;
    if (inRiver) { open = false; continue; }
    const al1 = dash ? alpha * clamp(1.9 * (vnoise(a * dash, 7.3) - 0.42)) : alpha;
    for (const [rr, al] of [[rIn, 0], [rMid, al1], [rOut, 0]]) { pos.push(SX * R * rr * Math.cos(a), 0.03, -R * rr * Math.sin(a)); colr.push(1, 1, 1, al); }
    if (open) { const b = n - 3; idx.push(b, n, b + 1, b + 1, n, n + 1, b + 1, n + 1, b + 2, b + 2, n + 1, n + 2); }
    n += 3; open = true;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 4)); geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  mesh.renderOrder = 2; return mesh;
}

// ---------------------------------------------------------------- peças de cenário (geometrias fundidas com cor por vértice)
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function P(geo, hex, p = [0, 0, 0], rot = [0, 0, 0], s = [1, 1, 1]) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(_m4.compose(new THREE.Vector3(...p), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2], rot[3] || 'XYZ')), new THREE.Vector3(...(typeof s === 'number' ? [s, s, s] : s))));
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}
const M = parts => mergeGeometries(parts.map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); return g; }));
const cyl = (r1, r2, h, n = 8) => new THREE.CylinderGeometry(r1, r2, h, n), cone = (r, h, n = 7) => new THREE.ConeGeometry(r, h, n), ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d), dod = r => new THREE.DodecahedronGeometry(r, 0);

function geoPalm() {
  const parts = [], trunk = '#8d6c49'; let x = 0, y = 0;
  for (let i = 0; i < 6; i++) { const lean = 0.07 * i; parts.push(P(cyl(0.15 - i * 0.012, 0.18 - i * 0.012, 0.62, 7), i % 2 ? '#80603f' : trunk, [x, y + 0.3, 0], [0, 0, -lean])); x += 0.6 * Math.sin(lean); y += 0.6 * Math.cos(lean); }
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + 0.2, d = 0.55 + (k % 3) * 0.12; parts.push(P(cone(0.34, 2.0, 5), k % 2 ? '#3f9140' : '#4ea44a', [x + Math.cos(a) * 0.8, y + 0.02 - d * 0.25, Math.sin(a) * 0.8], [0, -a, -(PI / 2 + d), 'YZX'], [0.22, 1, 1])); }
  parts.push(P(ico(0.2, 0), '#6b4a2a', [x, y - 0.05, 0]));
  return M(parts);
}
function geoPine() { return M([P(cyl(0.11, 0.15, 0.7, 6), '#6d5038', [0, 0.35, 0]), P(cone(0.85, 1.3, 8), '#2f6e4c', [0, 1.1, 0]), P(cone(0.66, 1.15, 8), '#37795a', [0, 1.75, 0]), P(cone(0.45, 1.0, 8), '#418565', [0, 2.35, 0])]); }
function geoFern() { const parts = []; for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; parts.push(P(cone(0.16, 1.05, 4), k % 2 ? '#4f9a3c' : '#63b048', [Math.cos(a) * 0.36, 0.24, Math.sin(a) * 0.36], [0, -a, -(PI / 2 - 0.5), 'YZX'], [0.25, 1, 1])); } return M(parts); }
function geoBush() { return M([P(ico(0.5), '#3f8040', [0, 0.38, 0]), P(ico(0.38), '#4c9248', [0.4, 0.3, 0.12]), P(ico(0.33), '#356f3a', [-0.34, 0.26, -0.15])]); }
function geoRock() { return M([P(dod(0.6), '#8b8a86', [0, 0.3, 0], [0.3, 0.5, 0.1], [1.1, 0.75, 0.9]), P(dod(0.36), '#77767a', [0.55, 0.16, 0.2], [0.8, 0.2, 0.4])]); }
function geoBoulder() { return M([P(dod(1.0), '#8f8e89', [0, 0.62, 0], [0.2, 0.7, 0.15], [1.15, 0.9, 1]), P(dod(0.62), '#7c7b7e', [0.95, 0.34, 0.35], [0.9, 0.1, 0.5]), P(dod(0.5), '#9a9992', [-0.85, 0.28, 0.3], [0.1, 1.2, 0.6])]); }
function geoMesa() { return M([P(cyl(1.15, 1.4, 0.8, 8), '#c0613a', [0, 0.4, 0]), P(cyl(0.95, 1.12, 0.7, 8), '#d98a54', [0.06, 1.1, 0.03], [0, 0.4, 0]), P(cyl(0.8, 0.93, 0.55, 8), '#b65734', [0.02, 1.7, -0.04], [0, 0.9, 0]), P(cyl(0.72, 0.8, 0.16, 8), '#e2a268', [0.02, 2.05, -0.04], [0, 0.2, 0])]); }
function geoCactus() { return M([P(cyl(0.2, 0.22, 1.7, 8), '#4d8b4c', [0, 0.85, 0]), P(new THREE.SphereGeometry(0.2, 8, 6), '#4d8b4c', [0, 1.7, 0]), P(cyl(0.12, 0.12, 0.5, 6), '#57975a', [0.36, 0.95, 0], [0, 0, PI / 2]), P(cyl(0.12, 0.12, 0.6, 6), '#57975a', [0.56, 1.25, 0]), P(cyl(0.11, 0.11, 0.4, 6), '#57975a', [-0.3, 0.7, 0], [0, 0, PI / 2]), P(cyl(0.11, 0.11, 0.45, 6), '#57975a', [-0.47, 0.95, 0])]); }
function geoReed() { const parts = []; for (let k = 0; k < 5; k++) { const x = (k - 2) * 0.13, z = ((k * 7) % 5 - 2) * 0.1, h = 1.0 + (k % 3) * 0.3; parts.push(P(cyl(0.025, 0.03, h, 5), '#7fa24c', [x, h / 2, z], [0, 0, (k - 2) * 0.05])); parts.push(P(cyl(0.055, 0.055, 0.26, 6), '#6b4426', [x + (k - 2) * 0.05 * h * 0.6, h + 0.08, z])); } return M(parts); }
function geoTuft(c1, c2) { const parts = []; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; parts.push(P(cone(0.07, 0.6, 4), k % 2 ? c1 : c2, [Math.cos(a) * 0.12, 0.28, Math.sin(a) * 0.12], [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35])); } return M(parts); }
function geoFlower() { return M([P(cyl(0.02, 0.02, 0.4, 4), '#5a8a3a', [0, 0.2, 0]), P(new THREE.SphereGeometry(0.11, 8, 6), '#ffffff', [0, 0.44, 0], [0, 0, 0], [1, 0.6, 1]), P(new THREE.SphereGeometry(0.05, 6, 5), '#f2c230', [0, 0.49, 0])]); }
function geoRibs() { const parts = [P(cyl(0.07, 0.07, 2.6, 6), '#ece4d0', [0, 0.08, 0], [0, 0, PI / 2])]; for (let k = 0; k < 6; k++) parts.push(P(new THREE.TorusGeometry(0.62 - Math.abs(k - 2.5) * 0.07, 0.055, 6, 12, PI), '#f1ead8', [(k - 2.5) * 0.42, 0.05, 0], [0, PI / 2, 0])); return M(parts); }
function geoLily() { const g = new THREE.CircleGeometry(0.36, 12, 0.3, TAU - 0.6); return M([P(g, '#4f9d58', [0, 0, 0], [-PI / 2, 0, 0])]); }
function geoSeaRock() { return M([P(dod(1.0), '#6f6b66', [0, 0.1, 0], [0.4, 0.2, 0.3], [1.2, 0.7, 1]), P(dod(0.55), '#817c75', [0.9, 0.0, 0.3], [0.2, 0.9, 0.1])]); }

function instanced(geo, mat, items) {
  const im = new THREE.InstancedMesh(geo, mat, items.length), d = new THREE.Object3D();
  items.forEach((it, i) => { d.position.set(it.x, (it.y ?? groundH(it.x, it.z)) + (it.dy || 0), it.z); d.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0); d.scale.setScalar(it.s || 1); if (it.sy) d.scale.y *= it.sy; d.updateMatrix(); im.setMatrixAt(i, d.matrix); if (it.color) im.setColorAt(i, new THREE.Color(it.color)); });
  im.castShadow = true; im.receiveShadow = true; return im;
}

export function buildIsland() {
  const group = new THREE.Group();
  group.add(terrain());
  const water = sea(); group.add(water.mesh);
  const f1 = foam(0.95, 0.968, 0.99, 0.9), f2 = foam(1.0, 1.03, 1.06, 0.5, 9); group.add(f1, f2);

  const mVeg = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const mRock = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true });
  const rnd = mulberry32(2026);
  // sorteia pontos dentro de um setor; tall = peça alta (não pode ficar na frente do dinossauro nem tapar a clareira)
  const pick = (secA, n, { tall = false, mid = false, r0 = 7.2, r1 = 0.84, keep = 0.6, spread = 27, test = null } = {}) => {
    const out = []; let guard = 0;
    while (out.length < n && guard++ < n * 60) {
      const a = (secA + (rnd() * 2 - 1) * spread) * DEG, R = outline(a), r = lerp(r0, R * r1, Math.sqrt(rnd()));
      const x = SX * r * Math.cos(a), z = -r * Math.sin(a), g = ground(x, z);
      if (g.riv > 0.01 || g.pond > 0.01 || g.bank > 0.75 || g.m > 0.02) continue;
      const s = SPOTS.find(q => Math.abs(q.a - secA) < 1), dx = x - s.x, dz = z - s.z;
      if (tall ? (Math.abs(dx) < 6.3 && dz > -3.4 && dz < 9) : mid ? (Math.abs(dx) < 5.6 && dz > -1.6 && dz < 7) : Math.hypot(dx, dz) < 2.4) continue;
      if (test && !test(x, z, g)) continue;
      if (out.some(o => Math.hypot(o.x - x, o.z - z) < keep)) continue;
      out.push({ x, z, ry: rnd() * TAU, s: 0.8 + rnd() * 0.45 });
    }
    return out;
  };
  const tags = {}; let TAG = 'mar';
  const tag = (o, t = TAG) => { (tags[t] ||= []).push(o); return o; };
  const add = (geo, mat, items) => { if (items.length) group.add(tag(instanced(geo, mat, items))); return items; };

  // selva do T-rex: palmeiras, arbustos, samambaias e uma ossada
  TAG = 'trex';
  add(geoPalm(), mVeg, pick(270, 13, { tall: true, keep: 1.7 }).map(o => ({ ...o, s: o.s * 1.15 })));
  add(geoBush(), mVeg, pick(270, 20, { keep: 1.0 }));
  add(geoFern(), mVeg, pick(270, 26, { keep: 0.8 }));
  const tr = SPOTS.find(s => s.id === 'trex');
  add(geoRibs(), mVeg, [{ x: tr.x + 5.6, z: tr.z + 2.4, ry: 0.5, s: 1.1 }]);
  // samambaial do estegossauro
  TAG = 'estegossauro';
  add(geoFern(), mVeg, pick(210, 60, { keep: 0.75 }).map(o => ({ ...o, s: o.s * 1.25 })));
  add(geoPalm(), mVeg, pick(210, 5, { tall: true, keep: 2.2 }).map(o => ({ ...o, s: o.s * 0.85 })));
  add(geoBush(), mVeg, pick(210, 9, { keep: 1.2 }));
  // cânion do alossauro
  TAG = 'alossauro';
  add(geoMesa(), mRock, pick(150, 7, { tall: true, keep: 2.6 }).map(o => ({ ...o, s: o.s * 1.15, sy: 0.8 + rnd() * 0.7 })));
  add(geoCactus(), mVeg, pick(150, 9, { keep: 1.4 }).map(o => ({ ...o, s: o.s * 0.9 })));
  add(geoRock(), mRock, pick(150, 16, { keep: 1.0 }).map(o => ({ ...o, color: '#d79a6e', s: o.s * 0.8 })));
  add(geoTuft('#b8a04a', '#9d8c44'), mVeg, pick(150, 18, { keep: 0.8 }));
  // pedreira do paquicefalossauro
  TAG = 'paquicefalossauro';
  add(geoBoulder(), mRock, pick(90, 9, { tall: true, keep: 2.2 }));
  add(geoRock(), mRock, pick(90, 22, { keep: 0.9 }));
  add(geoPine(), mVeg, pick(90, 12, { tall: true, keep: 1.5 }));
  add(geoTuft('#6f9a55', '#5c8a4c'), mVeg, pick(90, 14, { keep: 0.8 }));
  // campina do tricerátopo
  TAG = 'triceratopo';
  add(geoTuft('#c9b24a', '#a89a3e'), mVeg, pick(30, 70, { keep: 0.6 }).map(o => ({ ...o, s: o.s * 1.2 })));
  const fl = ['#ffffff', '#f6a6c1', '#ffd84a', '#b9a3f2', '#ff8f5a'];
  add(geoFlower(), mVeg, pick(30, 90, { keep: 0.45 }).map((o, i) => ({ ...o, color: fl[i % fl.length], s: o.s * 1.3 })));
  add(geoBush(), mVeg, pick(30, 6, { keep: 1.5 }));
  add(geoPine(), mVeg, pick(30, 4, { tall: true, keep: 2.4 }).map(o => ({ ...o, s: o.s * 0.9 })));
  // brejo do parassaurolofo
  TAG = 'parassaurolofo';
  add(geoReed(), mVeg, pick(330, 34, { mid: true, keep: 0.6, test: (x, z, g) => g.bank > 0.08 }).map(o => ({ ...o, s: o.s * 1.2 })));
  add(geoReed(), mVeg, pick(330, 22, { mid: true, keep: 0.7 }));
  add(geoFern(), mVeg, pick(330, 18, { keep: 0.8 }));
  add(geoPalm(), mVeg, pick(330, 5, { tall: true, keep: 2.2 }).map(o => ({ ...o, s: o.s * 0.9 })));
  add(geoBush(), mVeg, pick(330, 8, { keep: 1.2 }));
  const lily = []; for (let i = 0; i < 9; i++) { const a = rnd() * TAU, k = Math.sqrt(rnd()) * 0.72; lily.push({ x: POND.x + Math.cos(a) * k * POND.rx, z: POND.z + Math.sin(a) * k * POND.rz, y: 0.035, ry: rnd() * TAU, s: 0.7 + rnd() * 0.6 }); }
  const lil = add(geoLily(), mVeg, lily);
  // pedras no mar
  TAG = 'mar';
  const sr = []; for (let i = 0; i < 9; i++) { const a = rnd() * TAU, R = outline(a) * (1.1 + rnd() * 0.22); sr.push({ x: SX * R * Math.cos(a), z: -R * Math.sin(a), y: -0.05, ry: rnd() * TAU, s: 0.5 + rnd() * 0.6 }); }
  add(geoSeaRock(), mRock, sr);

  // vulcão facetado (mesma linguagem das pedras), lava na cratera e fumaça subindo
  const base = groundH(0, 0) - 0.5, VH = 4.7;
  const prof = [[6.4, -0.3], [4.7, 0.45], [3.5, 1.3], [2.6, 2.3], [1.95, 3.3], [1.5, 4.2], [1.25, VH], [0.95, 4.25], [0.0, 4.1]];
  const vg = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 13).toNonIndexed(), vp = vg.attributes.position, vc = new Float32Array(vp.count * 3);
  for (let i = 0; i < vp.count; i++) {   // amassa os vértices (mesmo ponto, mesmo desvio) para a pedra não ficar torneada
    const x = vp.getX(i), y = vp.getY(i), z = vp.getZ(i), k = 1 + 0.16 * (hash(Math.round(x * 50), Math.round(z * 50) + Math.round(y * 50) * 7) - 0.5) * (y > 0.2 && y < VH - 0.1 ? 1 : 0.2);
    vp.setXYZ(i, x * k, y, z * k);
  }
  const cA = new THREE.Color('#77624f'), cB = new THREE.Color('#4a3f38'), cC = new THREE.Color('#2f2927'), cL = new THREE.Color('#e2531c'), tc = new THREE.Color();
  for (let i = 0; i < vp.count; i += 3) {
    const y = (vp.getY(i) + vp.getY(i + 1) + vp.getY(i + 2)) / 3, r = (Math.hypot(vp.getX(i), vp.getZ(i)) + Math.hypot(vp.getX(i + 1), vp.getZ(i + 1)) + Math.hypot(vp.getX(i + 2), vp.getZ(i + 2))) / 3;
    tc.copy(cA).lerp(cB, smooth(seg(y, 0.3, 2.2))).lerp(cC, smooth(seg(y, 2.6, 4.4)));
    if (r < 1.2 && y > 4.0) tc.copy(cL);
    tc.offsetHSL(0, 0, (hash(i, 3) - 0.5) * 0.05);
    for (let k = 0; k < 3; k++) { vc[(i + k) * 3] = tc.r; vc[(i + k) * 3 + 1] = tc.g; vc[(i + k) * 3 + 2] = tc.b; }
  }
  vg.setAttribute('color', new THREE.BufferAttribute(vc, 3)); vg.computeVertexNormals();
  const volc = new THREE.Mesh(vg, mRock); volc.position.y = base; volc.scale.x = 1.12; volc.castShadow = true; volc.receiveShadow = true; group.add(tag(volc, 'vulcao'));
  const top = base + VH;
  const lava = new THREE.Mesh(new THREE.CircleGeometry(1.2, 13), new THREE.MeshStandardMaterial({ color: '#ff6a1f', emissive: '#ff4a10', emissiveIntensity: 2.4, roughness: 0.6 }));
  lava.rotation.x = -PI / 2; lava.position.y = base + 4.22; lava.scale.x = 1.12; group.add(tag(lava, 'vulcao'));
  const mLava = new THREE.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff4a10', emissiveIntensity: 1.9, roughness: 0.6, side: THREE.DoubleSide });
  for (const [ang, len, wid] of [[250, 0.62, 0.3], [318, 0.48, 0.24], [205, 0.36, 0.2]]) {   // viradas para a câmera
    const a = ang * DEG, pts = [], ix = [];
    for (let i = 0; i <= 14; i++) {
      const f = i / 14 * len, j = Math.min(5 - f * 5, 5), i0 = Math.max(0, Math.min(4, Math.floor(5 - f * 5))), tt = (5 - f * 5) - i0;
      const r = lerp(prof[i0][0], prof[i0 + 1][0], tt) * 1.13 + 0.1, y = lerp(prof[i0][1], prof[i0 + 1][1], tt) + 0.05, w = wid * (0.7 + f) * (1 + 0.25 * Math.sin(i * 1.3)), wob = 0.1 * Math.sin(i * 0.9 + ang);
      for (const sd of [-1, 1]) { const aa = a + wob / r + sd * w / r; pts.push(1.12 * r * Math.cos(aa), y, -r * Math.sin(aa)); }
      if (i) { const b = (i - 1) * 2; ix.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setIndex(ix); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mLava); m.position.y = base; m.castShadow = false; group.add(tag(m, 'vulcao'));
  }
  const mSmoke = new THREE.MeshStandardMaterial({ color: '#f4f0e9', roughness: 1, transparent: true, opacity: 0.8, depthWrite: false });
  const puffs = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 2), mSmoke.clone()); m.castShadow = false; m.renderOrder = 3; group.add(tag(m, 'fumaca')); return { m, k: i / 6, sx: Math.sin(i * 2.4) * 0.35, sz: Math.cos(i * 1.7) * 0.3 }; });

  function update(t) {
    water.waves.offset.set(frac(t / LOOP), 0.5 * cyc(t, 1) * 0.04);
    const k1 = 1 + 0.006 * cyc(t, 1); f1.scale.set(k1, 1, k1); f1.material.opacity = 0.75 + 0.25 * cyc(t, 1, 0.25);
    const ph = frac(t / LOOP + 0.35), k2 = lerp(1.03, 0.985, ph); f2.scale.set(k2, 1, k2); f2.material.opacity = Math.sin(PI * ph) * 0.75;
    lava.material.emissiveIntensity = 2.2 + 0.7 * cyc(t, 3);
    for (const p of puffs) {
      const f = frac(t / (LOOP * 2) + p.k);   // a fumaça leva 8 s para subir (dois laços) e deriva para a direita e para a frente
      p.m.position.set(f * 3.4 + p.sx * f, top + 0.2 + f * 3.4, f * 2.2 + p.sz * f);
      p.m.scale.setScalar(0.75 + f * 1.5); p.m.material.opacity = 0.8 * smooth(seg(f, 0, 0.12)) * (1 - smooth(seg(f, 0.45, 1)));
    }
  }
  // esconde as peças das etiquetas pedidas (o que ficaria na frente da câmera num plano fechado)
  const hide = (list = []) => { for (const t in tags) for (const o of tags[t]) o.visible = !list.includes(t); };
  update(0);
  return { group, update, top, hide };
}
