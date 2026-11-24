// base.js — o chão comum: renderizador, espaço da cena, materiais e as peças de montagem.
//
// O ESPAÇO: a ilustração original tem 1600 x 1600. Aqui cada ponto (x, y) dela vira
// (x - 800, 800 - y, z), com o z livre para dar profundidade. Antes de ir para a cena,
// todo vértice é "pré-distorcido": x e y encolhem ou crescem conforme o z, de modo que
// a câmera de frente (a D de distância) veja exatamente a ilustração original, sem
// nenhuma pista de volume. O 3D só aparece quando a câmera sai do eixo.
import * as THREE from 'three';
THREE.ColorManagement.enabled = false;   // as cores valem como estão na paleta (sRGB direto)
export { THREE };

export const qs = new URLSearchParams(location.search);
export const OUT = 1600;
export const SS = Number(qs.get('ss') || 2);          // superamostragem
export const RW = OUT * SS;
export const RES = Number(qs.get('res') || 4);        // pixels de textura por unidade da ilustração
export const D = 4500;                                // distância da câmera de frente
export const F0 = THREE.MathUtils.radToDeg(2 * Math.atan(800 / D));
export const NEAR = 40, FAR = 90000;
export const PI = Math.PI;
export const mix = (a, b, t) => a + (b - a) * t;
export const sat = x => Math.min(1, Math.max(0, x));
export const ramp = (t, a, b) => sat((t - a) / (b - a));
export const smooth = (t, a, b) => { const u = ramp(t, a, b); return u * u * (3 - 2 * u); };

export const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(OUT, OUT, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);
const MAXA = renderer.capabilities.getMaxAnisotropy();

export const world = new THREE.Scene();   // o mundo pintado (cor + normal/identidade)
export const over = new THREE.Scene();    // brilhos, estrelas e água, somados por cima
// uniformes compartilhados por todos os materiais
export const U = {
  time: { value: 0 }, life: { value: 0 },
  depth: { value: null }, res: { value: new THREE.Vector2(RW, RW) }, nf: { value: new THREE.Vector2(NEAR, FAR) }, ss: { value: SS },
};

// ---------------------------------------------------------------- espaço
export const A = (x, y, z = 0) => new THREE.Vector3(x - 800, 800 - y, z);                 // ponto da ilustração, antes da pré-distorção
export const warpS = z => (D - z) / D;
export const W = (x, y, z = 0) => { const s = warpS(z); return new THREE.Vector3((x - 800) * s, (800 - y) * s, z); };   // o mesmo ponto já no mundo
export function warpGeo(g) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const s = warpS(p.getZ(i)); p.setXY(i, p.getX(i) * s, p.getY(i) * s); }
  p.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox(); return g;
}
let _id = 0;
export const nextId = () => (_id = _id % 250 + 1);
export function pivot(x, y, z, scene = world) { const g = new THREE.Group(); g.position.copy(W(x, y, z)); scene.add(g); return g; }
// põe a malha na cena: assa a transformação, pré-distorce e, se houver pai, passa para o espaço dele
export function add(mesh, o = {}) {
  mesh.updateMatrix(); mesh.geometry.applyMatrix4(mesh.matrix);
  mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); mesh.scale.set(1, 1, 1); mesh.updateMatrix();
  warpGeo(mesh.geometry);
  if (o.parent) { const q = o.parent.position; mesh.geometry.translate(-q.x, -q.y, -q.z); mesh.geometry.computeBoundingSphere(); o.parent.add(mesh); }
  else (o.scene || world).add(mesh);
  if (o.order != null) mesh.renderOrder = o.order;
  return mesh;
}

// ---------------------------------------------------------------- material do mundo pintado
// Escreve duas saídas: a cor e, na segunda, a normal e a identidade da peça (para o contorno).
// SHADE 0 = cor pura · 1 = dois tons (luz de cima à direita, sombra arroxeada) · 2 = só escurece o lado de trás
const VS = /* glsl */`
uniform float uTime, uLife;
uniform vec4 uWave, uSway; uniform vec3 uFlick;
varying vec2 vUv; varying vec3 vN;
void main() {
  vUv = uv; vec3 p = position;
  #ifdef WAVE
    float wd = max(0., p.x - uWave.x), wk = smoothstep(0., uWave.z * .4, wd), wp = wd * 6.2832 / uWave.z - uTime * uWave.w;
    p.z += sin(wp) * uWave.y * wk * uLife; p.y += cos(wp * .8) * uWave.y * .2 * wk * uLife;
  #endif
  #ifdef SWAY
    float su = clamp((p.x - uSway.x) / (uSway.y - uSway.x), 0., 1.), sk = sin(su * 3.1416);
    p.z += sin(su * 9. - uTime * 1.7) * uSway.z * sk * uLife;
    p.y += sin(su * 7. - uTime * 1.3 + 1.) * uSway.z * .3 * sk * uLife;
  #endif
  #ifdef FLICK
    float fh = clamp((p.y - uFlick.x) / uFlick.y, 0., 1.);
    p.x += (sin(uTime * 11. + p.y * .35) + .6 * sin(uTime * 17.3 + p.y * .8)) * uFlick.z * fh * fh * uLife;
    p.y += (p.y - uFlick.x) * .08 * sin(uTime * 13.) * uLife;
  #endif
  #ifdef USE_INSTANCING
    mat4 m = modelMatrix * instanceMatrix;
  #else
    mat4 m = modelMatrix;
  #endif
  vN = normalize(mat3(m) * normal);
  gl_Position = projectionMatrix * viewMatrix * m * vec4(p, 1.);
}`;
const FS = /* glsl */`
layout(location = 0) out highp vec4 gColor;
layout(location = 1) out highp vec4 gAux;
uniform sampler2D map; uniform vec3 uColor; uniform float uId;
varying vec2 vUv; varying vec3 vN;
const vec3 LD = vec3(.4206, .5507, .7210);
void main() {
  vec4 c = vec4(uColor, 1.);
  #ifdef ART
    c = texture(map, vUv);
    #ifdef ATEST
      if (c.a < .42) discard;
    #endif
  #endif
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 col = c.rgb;
  #if SHADE == 1
    float ndl = dot(n, LD), lit = smoothstep(-.16, .14, ndl), hi = .9 + .1 * smoothstep(.3, .7, ndl);
    col = mix(c.rgb * vec3(.64, .53, .76), c.rgb * hi, lit);
  #elif SHADE == 2
    col = mix(c.rgb * vec3(.66, .55, .78), c.rgb, smoothstep(-.32, 0., n.z));
  #endif
  gColor = vec4(col, 1.);
  gAux = vec4(n * .5 + .5, uId / 255.);
}`;
export function mat(o = {}) {
  const defines = { SHADE: o.shade ?? 1 };
  if (o.map) defines.ART = 1; if (o.atest) defines.ATEST = 1;
  if (o.wave) defines.WAVE = 1; if (o.sway) defines.SWAY = 1; if (o.flick) defines.FLICK = 1;
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: FS, defines, side: o.side ?? THREE.DoubleSide,
    uniforms: {
      map: { value: o.map || null }, uColor: { value: new THREE.Color(o.color || '#ffffff') }, uId: { value: o.id || 0 },
      uTime: U.time, uLife: U.life,
      uWave: { value: new THREE.Vector4(...(o.wave || [0, 0, 1, 0])) }, uSway: { value: new THREE.Vector4(...(o.sway || [0, 1, 0, 0])) }, uFlick: { value: new THREE.Vector3(...(o.flick || [0, 1, 0])) },
    },
  });
}
export function tint(hex, k, add = 0) { const c = new THREE.Color(hex); return '#' + new THREE.Color(sat(c.r * k + add), sat(c.g * k + add), sat(c.b * k + add)).getHexString(); }

// ---------------------------------------------------------------- a arte original, peça por peça, virando textura
const inside = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[2] <= r[2] && b[3] <= r[3];
export function opBB(op) {
  if (!op.pts) return null; if (op._bb) return op._bb;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of op.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return op._bb = [x0, y0, x1, y1];
}
// escolhe as operações de um ou mais elementos: only/exclude filtram por retângulo, noSil tira o contorno de fora
export function selOps(ids, o = {}) {
  const els = [].concat(ids).map(id => { if (!ELS[id]) throw new Error('elemento não existe: ' + id); return ELS[id]; }).sort((a, b) => a.z - b.z), out = [];
  for (const E of els) {
    let pi = -1;
    for (const op of E.ops) {
      if (op.k === 'p') { pi++; if (o.noP || (o.skipP && o.skipP.includes(pi)) || (o.only && !o.keepP)) continue; out.push(op); continue; }
      if (op.only === 'ink') continue;
      if (o.kinds && !o.kinds.includes(op.k)) continue;
      if (o.noSil && op.k === 'l' && !op.col && op.w >= 1.85) continue;
      const bb = opBB(op);
      if (o.only && !o.only.some(r => inside(bb, r))) continue;
      if (o.exclude && o.exclude.some(r => inside(bb, r))) continue;
      out.push(op);
    }
  }
  return out;
}
export function bbOf(ops, pad = 5) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const op of ops) { const b = opBB(op); if (!b) continue; x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}
export function canvasTex(cv) {
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.anisotropy = MAXA;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; return t;
}
// desenha num canvas a região bbox da ilustração, com a função draw recebendo o contexto já no sistema da ilustração
export function drawTex(bbox, res, draw) {
  const [x0, y0, x1, y1] = bbox, m = Math.max(x1 - x0, y1 - y0); if (m * res > 8000) res = 8000 / m;
  const cv = document.createElement('canvas'); cv.width = Math.ceil((x1 - x0) * res); cv.height = Math.ceil((y1 - y0) * res);
  const c = cv.getContext('2d'); c.setTransform(res, 0, 0, res, -x0 * res, -y0 * res); draw(c);
  return canvasTex(cv);
}
// as operações originais, pintadas como na camada de cor do motor 2D
export function artTex(ops, bbox, res = RES, o = {}) {
  return drawTex(bbox, res, c => {
    let fi = 0;
    for (const op of ops) {
      if (op.k === 'f') { if (o.dilate && fi++ < (o.dilateN || 1)) { c.strokeStyle = op.color; c.lineWidth = o.dilate; c.lineJoin = 'round'; c.stroke(op.path); } celFill(c, op); }
      else if (op.k === 'p') { c.save(); op.fn(c); c.restore(); }
      else { c.fillStyle = op.col || PAL.out; c.globalAlpha = !op.col && op.w < 1.2 ? .8 : 1; const p = op.full || (op.full = strokePath(op, op.L)); if (p) c.fill(p); c.globalAlpha = 1; }
    }
  });
}

// ---------------------------------------------------------------- peças
// recorte plano: a arte num plano, em z fixo ou z(x, y)
export function card(tex, bbox, z, o = {}) {
  const [x0, y0, x1, y1] = bbox, g = new THREE.PlaneGeometry(x1 - x0, y1 - y0, o.sx || 1, o.sy || 1);
  g.translate((x0 + x1) / 2 - 800, 800 - (y0 + y1) / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, typeof z === 'function' ? z(p.getX(i) + 800, 800 - p.getY(i)) : z);
  return add(new THREE.Mesh(g, mat({ map: tex, atest: true, shade: o.shade ?? 1, id: 0, wave: o.wave, sway: o.sway, flick: o.flick })), o);
}
// recorte com os quatro cantos livres (para as laterais: a mesma arte virada de lado)
export function quad(tex, tl, tr, br, bl, o = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...tl.toArray(), ...tr.toArray(), ...bl.toArray(), ...br.toArray()], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2)); g.setIndex([0, 2, 1, 2, 3, 1]);
  return add(new THREE.Mesh(g, mat({ map: tex, atest: true, shade: o.shade ?? 1, id: 0 })), o);
}
const clean = pts => { const o = []; for (const p of pts) { const l = o[o.length - 1]; if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) > .05) o.push(p); } while (o.length > 2 && Math.hypot(o[0][0] - o[o.length - 1][0], o[0][1] - o[o.length - 1][1]) < .05) o.pop(); return o; };
export { clean };
// volume: o contorno 2D ganha espessura para trás (as faces de lado recebem luz e contorno)
export function prism(pts, zf, depth, color, o = {}) {
  const sh = new THREE.Shape(clean(pts).map(([x, y]) => new THREE.Vector2(x - 800, 800 - y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 1, steps: 1 }); g.translate(0, 0, zf - depth);
  return add(new THREE.Mesh(g, mat({ color, shade: 1, id: o.id ?? nextId() })), o);
}
const area = b => (b[2] - b[0]) * (b[3] - b[1]);
// a peça padrão: a arte original na frente e, se tiver depth, o volume atrás dela
export function piece(ids, o = {}) {
  const ops = selOps(ids, o); if (!ops.length) console.warn('peça vazia', ids, JSON.stringify(o.only || ''));
  const bbox = o.bbox || bbOf(ops, o.pad ?? 5), tex = artTex(ops, bbox, o.res || RES), z = o.z || 0, out = { tex, bbox, ops, vols: [] };
  out.card = card(tex, bbox, z, o);
  if (o.depth) {
    let fills = ops.filter(op => op.k === 'f').sort((a, b) => area(opBB(b)) - area(opBB(a)));
    if (o.vol !== 'all') fills = fills.slice(0, o.vol || 1);
    for (const op of fills) out.vols.push(prism(op.pts, z - .35, o.depth, o.side || tint(op.color, .97), o));
    if (o.back) out.backCard = card(tex, bbox, z - o.depth - .7, { ...o, wave: null, sway: null });
  }
  return out;
}
export function tube(pts, r, color, o = {}) {
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), o.seg || pts.length * 8, r, o.rs || 5, false);
  return add(new THREE.Mesh(g, mat({ color, shade: o.shade ?? 1, id: o.id ?? nextId() })), o);
}
export function cyl(a, b, r1, r2, color, o = {}) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, o.seg || 16, 1, false), mat({ color, shade: 1, id: o.id ?? nextId() }));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); m.position.copy(a).addScaledVector(d, .5);
  return add(m, o);
}
export function ell(x, y, z, rx, ry, rz, color, o = {}) {
  const g = new THREE.SphereGeometry(1, o.ws || 32, o.hs || 22); g.scale(rx, ry, rz); g.translate(x - 800, 800 - y, z);
  return add(new THREE.Mesh(g, mat({ color, shade: o.shade ?? 1, id: o.id ?? nextId() })), o);
}
// arte projetada de frente sobre um volume curvo
export function setUV(g, bb) {
  const p = g.attributes.position, uv = new Float32Array(p.count * 2), [x0, y0, x1, y1] = bb;
  for (let i = 0; i < p.count; i++) { uv[2 * i] = (p.getX(i) + 800 - x0) / (x1 - x0); uv[2 * i + 1] = 1 - (800 - p.getY(i) - y0) / (y1 - y0); }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
export function proj(g, tex, bb, o = {}) {
  setUV(g, bb);
  return add(new THREE.Mesh(g, mat({ map: tex, atest: !!o.atest, shade: o.shade ?? 2, id: o.id ?? nextId() })), o);
}
export function gridGeo(nu, nv, fn) {
  const pos = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const p = fn(i / nu, j / nv, i, j); pos.push(p.x, p.y, p.z); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}
// telhado em pirâmide: a arte do triângulo da frente repetida nas quatro águas
export function pyr(tex, bb, tri, zf, depth, o = {}) {
  const [[xl, yb], [xa, ya], [xr]] = tri, zb = zf - depth, AP = A(xa, ya, zf - depth / 2);
  const c = [A(xl, yb, zf), A(xr, yb, zf), A(xr, yb, zb), A(xl, yb, zb)];
  const uvOf = (x, y) => [(x - bb[0]) / (bb[2] - bb[0]), 1 - (y - bb[1]) / (bb[3] - bb[1])], ul = uvOf(xl, yb), ur = uvOf(xr, yb), ua = uvOf(xa, ya), pos = [], uv = [];
  for (let k = 0; k < 4; k++) { pos.push(...c[k].toArray(), ...c[(k + 1) % 4].toArray(), ...AP.toArray()); uv.push(...ul, ...ur, ...ua); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return add(new THREE.Mesh(g, mat({ map: tex, shade: 1, id: nextId() })), o);
}
// tronco de pirâmide de quatro lados (o corpo do moinho), a mesma arte nas quatro faces
export function frustum(tex, bb, q, zf, d0, d1, o = {}) {
  const [[xl, yb], [xr], [xtr, yt], [xtl]] = q, k = (d0 - d1) / 2;
  const f = [A(xl, yb, zf), A(xr, yb, zf), A(xtr, yt, zf - k), A(xtl, yt, zf - k)], b = [A(xl, yb, zf - d0), A(xr, yb, zf - d0), A(xtr, yt, zf - k - d1), A(xtl, yt, zf - k - d1)];
  const uvOf = (x, y) => [(x - bb[0]) / (bb[2] - bb[0]), 1 - (y - bb[1]) / (bb[3] - bb[1])], uq = [uvOf(xl, yb), uvOf(xr, yb), uvOf(xtr, yt), uvOf(xtl, yt)], pos = [], uv = [];
  for (const [p0, p1, p2, p3] of [[f[0], f[1], f[2], f[3]], [f[1], b[1], b[2], f[2]], [b[1], b[0], b[3], b[2]], [b[0], f[0], f[3], b[3]]]) {
    for (const [p, u] of [[p0, uq[0]], [p1, uq[1]], [p2, uq[2]], [p0, uq[0]], [p2, uq[2]], [p3, uq[3]]]) { pos.push(...p.toArray()); uv.push(...u); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return add(new THREE.Mesh(g, mat({ map: tex, shade: 1, id: nextId() })), o);
}
// onde o contorno fechado poly corta a reta de coordenada v (ax = 1: reta horizontal y = v, devolve a faixa de x)
export function span(poly, v, ax) {
  let lo = 1e9, hi = -1e9; const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n], a1 = a[ax], b1 = b[ax]; if ((a1 - v) * (b1 - v) > 0 || a1 === b1) continue;
    const w = a[1 - ax] + (b[1 - ax] - a[1 - ax]) * (v - a1) / (b1 - a1); lo = Math.min(lo, w); hi = Math.max(hi, w);
  }
  return [lo, hi];
}
