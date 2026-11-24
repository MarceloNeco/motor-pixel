// Ferramentas comuns: matemática, materiais, geometrias de apoio e texturas em canvas.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

export const PI = Math.PI, TAU = Math.PI * 2;
export const deg = d => d * PI / 180;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const span = (x, a, b) => clamp((x - a) / (b - a));       // 0..1 dentro da janela [a, b]
export const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOut = (x, p = 3) => 1 - Math.pow(1 - clamp(x), p);
export const easeIn = (x, p = 3) => Math.pow(clamp(x), p);
export const easeInOut = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- materiais
export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0, ...o });
export const metal = (color, rough = 0.2, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 1, ...o });
export const glow = (color, k = 1.2, o = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.5, ...o });

// ---------------------------------------------------------------- malhas
export function mesh(geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = 1) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(p[0], p[1], p[2]); m.rotation.set(r[0], r[1], r[2]);
  if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function group(children = [], p = [0, 0, 0], r = [0, 0, 0], s = 1) {
  const g = new THREE.Group();
  for (const c of children) if (c) g.add(c);
  g.position.set(p[0], p[1], p[2]); g.rotation.set(r[0], r[1], r[2]);
  if (typeof s === 'number') g.scale.setScalar(s); else g.scale.set(s[0], s[1], s[2]);
  return g;
}

// ---------------------------------------------------------------- geometrias
export const rbox = (w, h, d, r, seg = 5) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));
export const sph = (r, w = 40, h = 28) => new THREE.SphereGeometry(r, w, h);
export const cyl = (r1, r2, h, seg = 48, open = false) => new THREE.CylinderGeometry(r1, r2, h, seg, 1, open);
export const torus = (R, r, arc = TAU, seg = 72, rs = 20) => new THREE.TorusGeometry(R, r, rs, seg, arc);
export const capsule = (r, len, seg = 20) => new THREE.CapsuleGeometry(r, len, 10, seg);
// sólido de revolução: pts = [[raio, altura], ...] de baixo para cima por fora. Eixo = Y.
export const lathe = (pts, seg = 72) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
// o mesmo, com o eixo em Z (face para a câmera)
export const latheZ = (pts, seg = 96) => { const g = lathe(pts, seg); g.rotateX(PI / 2); return g; };
// normais lisas onde a superfície dobra pouco, quina viva onde dobra muito (chanfro liso, canto vivo)
export const crease = (g, a = 40) => toCreasedNormals(g, a * PI / 180);
// forma 2D com espessura e borda arredondada, centrada em Z
export function extrude(shape, depth, bevel = 0.04, seg = 5, curve = 24) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: seg, curveSegments: curve });
  g.translate(0, 0, -depth / 2);
  return bevel > 0 ? crease(g) : g;
}
export function tube(pts, radius, { closed = false, seg = 220, radial = 14, tension = 0.5 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), closed, 'catmullrom', tension);
  const g = new THREE.TubeGeometry(curve, seg, radius, radial, closed);
  g.userData.curve = curve;
  return g;
}
// retângulo de cantos arredondados como forma 2D
export function roundRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, PI / 2, PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, PI, PI * 1.5, false);
  return s;
}
export function polyShape(pts) { const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; }
export function starShape(R, r, n = 5) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = PI / 2 + i * PI / n, q = i % 2 ? r : R; pts.push([Math.cos(a) * q, Math.sin(a) * q]); }
  return polyShape(pts);
}

// ---------------------------------------------------------------- texturas em canvas
export function canvasTex(w, h, draw, { srgb = true, repeat = null, aniso = 16 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
// texto com espaçamento entre letras
export function spaced(ctx, txt, x, y, gap) {
  const ws = [...txt].map(ch => ctx.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0) + gap * (txt.length - 1);
  let cx = x - total / 2;
  const prev = ctx.textAlign; ctx.textAlign = 'left';
  [...txt].forEach((ch, i) => { ctx.fillText(ch, cx, y); cx += ws[i] + gap; });
  ctx.textAlign = prev;
}
export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
