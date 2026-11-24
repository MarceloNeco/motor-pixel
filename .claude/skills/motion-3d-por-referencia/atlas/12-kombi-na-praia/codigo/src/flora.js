// Vegetação e adereços: arbustos de folhas instanciadas, tufos de capim, coqueiros,
// guarda-sol, espreguiçadeiras, pranchas, bola, pedras, estrelas-do-mar, veleiro e gaivotas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, TAU, PI, lerp, clamp, smooth, groundH, noise2 } from './geo.js';

const std = (c, r = 0.7, m = 0, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...o });
const V3 = THREE.Vector3;

// ---------- arbustos ----------
function leafGeo() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.32, 0.42, 0.07, 0, 0.5, -0.03, 0.32, 0.42, 0.07, 0, 1, 0.04], 3));
  g.setIndex([0, 2, 1, 0, 3, 2, 1, 2, 4, 2, 3, 4]); g.computeVertexNormals(); return g;
}
const PAL = [0x2f6d2a, 0x3d8530, 0x4f9a36, 0x69ae3f, 0x8cc84c, 0x3f8a4a].map(h => new THREE.Color(h));
const PAL_DUNE = [0x5c8a3a, 0x7ea044, 0x9bb552, 0xb5c765, 0x6f9a48, 0x88a94e].map(h => new THREE.Color(h));
export function makeBushes(scene, list) {
  const cores = [], leaves = [], flowers = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  const n = new V3(), t = new V3(), b = new V3(), d = new V3(), p = new V3(), sc = new V3();
  for (const B of list) {
    const r = rng(B.seed), s = B.s, y0 = groundH(B.x, B.z), pal = B.dune ? PAL_DUNE : PAL;
    const lsz = clamp(0.115 + 0.04 * s, 0.13, 0.25) * (B.far ? 1.55 : 1), dens = B.far ? 15 : 24;
    const nb = Math.round(3 + s * 1.3 + r() * 2), cTop = y0 + s * 1.25;
    if (B.trunk) cores.push({ p: [B.x, y0 + s * 0.3, B.z], s: [s * 0.09, s * 0.5, s * 0.09], col: 0x6b4a32 });
    for (let k = 0; k < nb; k++) {
      const a = r() * TAU, rad = s * 0.52 * Math.sqrt(r()), br = s * (0.34 + 0.2 * r());
      const cy = y0 + (B.trunk ? s * 0.55 : 0) + br * 0.55 + s * 0.42 * r() * (1 - rad / (s * 0.6));
      const cx = B.x + Math.cos(a) * rad, cz = B.z + Math.sin(a) * rad;
      cores.push({ p: [cx, cy, cz], s: [br * 0.86, br * 0.86, br * 0.86], col: B.dune ? 0x4f7a34 : 0x2b5c27 });
      const nl = Math.round(dens * (br / lsz) ** 2);
      for (let i = 0; i < nl; i++) {
        d.set(r() * 2 - 1, r() * 1.35 - 0.35, r() * 2 - 1); if (d.lengthSq() < 0.01) continue; d.normalize();
        p.set(cx, cy, cz).addScaledVector(d, br * (0.9 + 0.2 * r()));
        if (p.y < groundH(p.x, p.z) + 0.03) continue;
        n.set(d.x + (r() - 0.5) * 0.9, d.y + (r() - 0.5) * 0.9 + 0.3, d.z + (r() - 0.5) * 0.9).normalize();
        t.set(r() - 0.5, r() - 0.75, r() - 0.5); b.crossVectors(t, n).normalize(); t.crossVectors(n, b).normalize();
        m4.makeBasis(b, t, n); const sz = lsz * (0.7 + 0.6 * r()); sc.set(sz, sz, sz);
        const h = clamp((p.y - y0) / (cTop - y0)), sun = clamp(0.5 + 0.5 * d.y), tone = clamp(h * 0.75 + sun * 0.45 + (r() - 0.5) * 0.5);
        c.copy(pal[Math.min(4, Math.floor(tone * 5))]).lerp(pal[5], r() < 0.12 ? 0.6 : 0).multiplyScalar(0.42 + 0.78 * tone * tone);
        leaves.push({ m: m4.clone().scale(sc).setPosition(p), c: c.clone() });
        if (B.flowers && r() < 0.022) flowers.push({ p: p.clone().addScaledVector(d, 0.05), s: 0.05 + 0.035 * r(), c: r() < 0.6 ? 0xfbf3b0 : 0xffffff });
      }
    }
  }
  const core = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), std(0xffffff, 0.95), cores.length);
  cores.forEach((o, i) => { m4.compose(p.set(...o.p), q.identity(), sc.set(...o.s)); core.setMatrixAt(i, m4); core.setColorAt(i, c.set(o.col)); });
  const lf = new THREE.InstancedMesh(leafGeo(), std(0xffffff, 0.62, 0, { side: THREE.DoubleSide }), leaves.length);
  leaves.forEach((o, i) => { lf.setMatrixAt(i, o.m); lf.setColorAt(i, o.c); });
  const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), std(0xffffff, 0.6), Math.max(1, flowers.length));
  flowers.forEach((o, i) => { m4.compose(o.p, q.identity(), sc.set(o.s, o.s, o.s)); fl.setMatrixAt(i, m4); fl.setColorAt(i, c.set(o.c)); });
  for (const m of [core, lf, fl]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
  return { leaves: leaves.length, cores: cores.length };
}

// árvores distantes do outro lado da baía: só bolhas
export function makeFarTrees(scene, list) {
  const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), std(0xffffff, 1), list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  list.forEach((o, i) => { m4.compose(new V3(o.x, groundH(o.x, o.z) + o.s * 0.55, o.z), q, new V3(o.s * 1.1, o.s * 0.85, o.s * 1.1)); m.setMatrixAt(i, m4); m.setColorAt(i, c.set(o.c)); });
  m.frustumCulled = false; scene.add(m);
}

// ---------- capim ----------
function tuftGeo(seed) {
  const r = rng(seed), pos = [], col = [], idx = []; let v = 0;
  for (let k = 0; k < 7; k++) {
    const a = r() * TAU, lean = 0.3 + 0.7 * r(), h = 0.5 + 0.5 * r(), w = 0.13, off = 0.08 * r(), ca = Math.cos(a), sa = Math.sin(a);
    for (let s = 0; s <= 3; s++) {
      const t = s / 3, rr = off + lean * t * t * h * 0.7, y = h * t * (1 - 0.12 * t), hw = w * (1 - t * 0.9) * 0.5, k2 = 0.72 + 0.34 * t;
      pos.push(ca * rr - sa * hw, y, sa * rr + ca * hw, ca * rr + sa * hw, y, sa * rr - ca * hw); col.push(k2, k2, k2, k2, k2, k2);
      if (s < 3) { idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); } v += 2;
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function makeGrass(scene, list) {
  const m = new THREE.InstancedMesh(tuftGeo(3), std(0xffffff, 0.75, 0, { side: THREE.DoubleSide, vertexColors: true }), list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  list.forEach((o, i) => { m4.compose(new V3(o.x, groundH(o.x, o.z) - 0.02, o.z), q.setFromEuler(e.set(0, o.rot, 0)), new V3(o.s, o.s * o.h, o.s)); m.setMatrixAt(i, m4); m.setColorAt(i, c.set(o.c)); });
  m.receiveShadow = true; m.castShadow = true; m.frustumCulled = false; scene.add(m);
}

// ---------- coqueiro ----------
function frondGeo(len, elev, droop, r) {
  const pos = [], col = [], NS = 26, cA = new THREE.Color(0x2f7d33), cB = new THREE.Color(0x79bd45), cS = new THREE.Color(0x8aa64a), c = new THREE.Color();
  const tint = 0.85 + 0.3 * r();
  const P = [], T = []; let x = 0, y = 0;
  for (let i = 0; i <= NS; i++) { const s = i / NS, ph = elev - droop * Math.pow(s, 1.35); P.push([x, y]); T.push([Math.cos(ph), Math.sin(ph)]); x += Math.cos(ph) * len / NS; y += Math.sin(ph) * len / NS; }
  const push = (a, b2, d, c1, c2, c3) => { pos.push(...a, ...b2, ...d); for (const k of [c1, c2, c3]) col.push(k.r * tint, k.g * tint, k.b * tint); };
  for (let i = 0; i < NS; i++) {                                   // nervura
    const a = P[i], b2 = P[i + 1], w = 0.035 * (1 - i / NS) + 0.008;
    push([a[0], a[1], -w], [b2[0], b2[1], -w], [b2[0], b2[1], w], cS, cS, cS); push([a[0], a[1], -w], [b2[0], b2[1], w], [a[0], a[1], w], cS, cS, cS);
  }
  for (let i = 2; i <= NS; i++) for (const side of [1, -1]) {     // folíolos
    const s = i / NS, L = len * 0.30 * Math.pow(Math.sin(PI * clamp(s * 0.93 + 0.05)), 0.55) * (0.85 + 0.3 * r()), w = 0.085;
    const tx = T[i][0], ty = T[i][1], a = P[i];
    const dx = tx * 0.5, dy = ty * 0.5 - 0.42 - 0.25 * s, dz = side * 0.80, dl = Math.hypot(dx, dy, dz);
    const tip = [a[0] + dx / dl * L, a[1] + dy / dl * L, dz / dl * L];
    c.copy(cA).lerp(cB, 0.35 + 0.5 * r());
    push([a[0] - tx * w, a[1] - ty * w, 0], [a[0] + tx * w, a[1] + ty * w, 0], tip, cA, cA, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
export function makePalm(scene, { x, z, h = 6.5, lean = [0.4, -0.3], seed = 1, cast = true }) {
  const r = rng(seed), g = new THREE.Group(); g.position.set(x, groundH(x, z) - 0.2, z);
  const top = new V3(lean[0] * h * 0.42, h, lean[1] * h * 0.42);
  const curve = new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(top.x * 0.08, h * 0.3, top.z * 0.08), new V3(top.x * 0.45, h * 0.68, top.z * 0.45), top]);
  const N = 56, RS = 10, pos = [], col = [], idx = [], n1 = new V3(), n2 = new V3(), tan = new V3(), p = new V3(), ref = new V3(0.94, 0, 0.34);
  const c1 = new THREE.Color(0xb39366), c2 = new THREE.Color(0x8c7150), c = new THREE.Color();
  for (let i = 0; i <= N; i++) {
    const t = i / N; curve.getPoint(t, p); curve.getTangent(t, tan); n1.crossVectors(tan, ref).normalize(); n2.crossVectors(tan, n1).normalize();
    const band = 0.5 + 0.5 * Math.sin(t * N * PI * 0.5), rad = (lerp(0.25, 0.135, t) + 0.13 * Math.exp(-t * 16)) * (1 + 0.07 * band);
    c.copy(c2).lerp(c1, band * 0.9);
    for (let j = 0; j < RS; j++) { const a = j / RS * TAU; pos.push(p.x + (n1.x * Math.cos(a) + n2.x * Math.sin(a)) * rad, p.y + (n1.y * Math.cos(a) + n2.y * Math.sin(a)) * rad, p.z + (n1.z * Math.cos(a) + n2.z * Math.sin(a)) * rad); col.push(c.r, c.g, c.b); }
    if (i < N) for (let j = 0; j < RS; j++) { const a = i * RS + j, b2 = i * RS + (j + 1) % RS; idx.push(a, b2, a + RS, b2, b2 + RS, a + RS); }
  }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); tg.setIndex(idx); tg.computeVertexNormals();
  const trunk = new THREE.Mesh(tg, std(0xffffff, 0.9, 0, { vertexColors: true, side: THREE.DoubleSide })); trunk.castShadow = cast; trunk.receiveShadow = true; g.add(trunk);
  const crown = new THREE.Group(); crown.position.copy(top); g.add(crown);
  const fm = std(0xffffff, 0.6, 0, { vertexColors: true, side: THREE.DoubleSide }), fronds = [], nf = 13;
  for (let i = 0; i < nf; i++) {
    const up = i % 2 === 0, len = (up ? 2.7 : 3.2) * (0.9 + 0.25 * r()) * h / 6.5;
    const f = new THREE.Group(); f.rotation.y = i / nf * TAU + (r() - 0.5) * 0.35; crown.add(f);
    const inner = new THREE.Group(); f.add(inner);
    const m = new THREE.Mesh(frondGeo(len, up ? 0.75 + 0.4 * r() : 0.05 + 0.3 * r(), up ? 1.5 + 0.4 * r() : 1.25 + 0.5 * r(), r), fm); m.castShadow = cast; m.receiveShadow = true; inner.add(m);
    fronds.push({ inner, ph: r() * TAU, amp: 0.7 + 0.6 * r() });
  }
  const cm = std(0x7a5a34, 0.7);
  for (let i = 0; i < 4; i++) { const a = i * 1.7 + r(), s = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), cm); s.position.set(Math.cos(a) * 0.2, -0.2 - 0.06 * i, Math.sin(a) * 0.2); s.castShadow = cast; crown.add(s); }
  scene.add(g);
  return { g, sway: t => { for (const f of fronds) { f.inner.rotation.z = (0.045 * Math.sin(t * 1.7 + f.ph) + 0.02 * Math.sin(t * 3.3 + f.ph * 2)) * f.amp; f.inner.rotation.x = 0.07 * Math.sin(t * 2.2 + f.ph * 1.3) * f.amp; } crown.rotation.z = 0.012 * Math.sin(t * 1.1 + seed); } };
}

// ---------- adereços de praia ----------
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const place = (g, x, z, rot = 0, dy = 0) => { g.position.set(x, groundH(x, z) + dy, z); g.rotation.y = rot; return g; };

export function makeUmbrella(scene, x, z, rot, cA = 0xf0685a, cB = 0xfdf6e3) {
  const g = place(new THREE.Group(), x, z, rot), tilt = new THREE.Group(); tilt.rotation.z = 0.14; g.add(tilt);
  const pole = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.5, 10), std(0xf3ead6, 0.5))); pole.position.y = 1.2; tilt.add(pole);
  const n = 16, pos = [], col = [], A = new THREE.Color(cA), B = new THREE.Color(cB), apex = [0, 2.62, 0];
  const ring = (rad, y, sc) => Array.from({ length: n + 1 }, (_, i) => { const a = i / n * TAU; return [Math.cos(a) * rad, y - (sc ? 0.05 * (i % 2 ? 1 : -1) * 0 : 0), Math.sin(a) * rad]; });
  const r1 = ring(0.7, 2.50), r2 = ring(1.22, 2.26), r3 = ring(1.42, 2.06);
  for (let i = 0; i < n; i++) {
    const c = (i >> 1) % 2 ? A : B, q = (a, b2, d) => { pos.push(...a, ...b2, ...d); for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b); };
    q(apex, r1[i + 1], r1[i]); q(r1[i], r1[i + 1], r2[i + 1]); q(r1[i], r2[i + 1], r2[i]); q(r2[i], r2[i + 1], r3[i + 1]); q(r2[i], r3[i + 1], r3[i]);
  }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); cg.computeVertexNormals();
  tilt.add(sh(new THREE.Mesh(cg, std(0xffffff, 0.75, 0, { vertexColors: true, side: THREE.DoubleSide }))));
  const fin = sh(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), std(cA, 0.5))); fin.position.set(0, 2.66, 0); tilt.add(fin);
  scene.add(g); return g;
}
export function makeLounger(scene, x, z, rot, color = 0x2fb6a6) {
  const g = place(new THREE.Group(), x, z, rot), wood = std(0xc79a63, 0.7), cloth = std(color, 0.8), cream = std(0xfdf6e3, 0.8);
  const box = (w, h, d, m, px, py, pz, rz = 0) => { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)); b.position.set(px, py, pz); b.rotation.z = rz; g.add(b); return b; };
  for (const s of [1, -1]) { box(1.9, 0.05, 0.05, wood, 0.05, 0.3, s * 0.33); box(0.05, 0.3, 0.05, wood, 0.85, 0.15, s * 0.33); box(0.05, 0.3, 0.05, wood, -0.55, 0.15, s * 0.33); box(0.9, 0.05, 0.05, wood, -0.98, 0.63, s * 0.33, -0.9); }
  box(1.25, 0.03, 0.6, cloth, 0.3, 0.335, 0); box(0.9, 0.03, 0.6, cloth, -0.96, 0.66, 0, -0.9);
  box(0.16, 0.034, 0.6, cream, 0.1, 0.337, 0); box(0.16, 0.034, 0.6, cream, 0.6, 0.337, 0); box(0.16, 0.034, 0.6, cream, -0.96, 0.662, 0, -0.9);
  scene.add(g); return g;
}
export function makeSurfboard(scene, x, z, rot, cA = 0xf0685a, cB = 0xfdf6e3, tilt = 0.12) {
  const s = new THREE.Shape(); s.moveTo(0, -1.0); s.bezierCurveTo(0.3, -0.95, 0.3, 0.3, 0.02, 1.05); s.lineTo(-0.02, 1.05); s.bezierCurveTo(-0.3, 0.3, -0.3, -0.95, 0, -1.0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3, curveSegments: 20 }); geo.translate(0, 0, -0.0175);
  const g = place(new THREE.Group(), x, z, rot, -0.3), b = sh(new THREE.Mesh(geo, std(cA, 0.35))); b.position.y = 1.0; g.add(b);
  const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.86, 0.092), std(cB, 0.4)); st.position.y = 1.0; g.add(st);
  g.rotation.z = tilt; g.rotation.x = -0.1; scene.add(g); return g;
}
export function makeBall(scene, x, z) {
  const geo = new THREE.SphereGeometry(0.24, 24, 16).toNonIndexed(), p = geo.attributes.position, col = new Float32Array(p.count * 3), cs = [0xffffff, 0xf0685a, 0xf8d24a, 0xffffff, 0x2fb6a6, 0x3d84e0].map(h => new THREE.Color(h));
  for (let i = 0; i < p.count; i += 3) { const a = Math.atan2(p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2), p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) + PI, c = cs[Math.floor(a / TAU * 6) % 6]; for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; } }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = sh(new THREE.Mesh(geo, std(0xffffff, 0.35, 0, { vertexColors: true }))); m.position.set(x, groundH(x, z) + 0.23, z); m.rotation.set(0.5, 0.3, 0.9); scene.add(m); return m;
}
export function makeRock(scene, x, z, s, seed, color = 0xb5a898) {
  const geo = new THREE.IcosahedronGeometry(1, 4), p = geo.attributes.position, r = rng(seed), ox = r() * 50, oy = r() * 50;
  for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), k = 1 + 0.22 * noise2(X * 1.3 + ox, Z * 1.3 + oy) + 0.12 * noise2(Y * 2.1 + ox, X * 2.1 - oy); p.setXYZ(i, X * k, Math.max(Y * k * 0.72, -0.35), Z * k); }
  geo.computeVertexNormals();
  const m = sh(new THREE.Mesh(geo, std(color, 0.92))); m.position.set(x, groundH(x, z) + s * 0.18, z); m.scale.set(s * (0.9 + 0.5 * r()), s * (0.7 + 0.3 * r()), s * (0.8 + 0.4 * r())); m.rotation.y = r() * TAU; scene.add(m); return m;
}
export function makeStarfish(scene, x, z, rot, color = 0xf0685a, s = 0.22) {
  const sp = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, rr = i % 2 ? 0.42 : 1; i ? sp.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sp.moveTo(rr, 0); }
  const geo = new THREE.ExtrudeGeometry(sp, { depth: 0.12, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.1, bevelSegments: 3 }); geo.rotateX(-PI / 2);
  const m = sh(new THREE.Mesh(geo, std(color, 0.75))); m.scale.setScalar(s); m.position.set(x, groundH(x, z) + 0.01, z); m.rotation.y = rot; scene.add(m); return m;
}
export function makeBoat(scene, x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
  const s = new THREE.Shape(); s.moveTo(-2.1, 0); s.bezierCurveTo(-1.6, 0.75, 1.2, 0.72, 2.5, 0); s.bezierCurveTo(1.2, -0.72, -1.6, -0.75, -2.1, 0);
  const hull = new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.1, bevelSegments: 3, curveSegments: 16 }); hull.rotateX(PI / 2); hull.translate(0, 0.5, 0);
  g.add(new THREE.Mesh(hull, std(0xfdfaf2, 0.5)));
  const band = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, curveSegments: 16 }); band.rotateX(PI / 2); band.scale(1.045, 1, 1.09); band.translate(0, 0.56, 0);
  g.add(new THREE.Mesh(band, std(0xf0685a, 0.5)));
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 6.2, 8), std(0xc79a63, 0.6)); mast.position.set(0.3, 3.5, 0); g.add(mast);
  const tri = (pts, color) => { const t = new THREE.BufferGeometry(); t.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); t.computeVertexNormals(); g.add(new THREE.Mesh(t, std(color, 0.8, 0, { side: THREE.DoubleSide }))); };
  tri([0.18, 0.95, 0.03, 0.18, 6.4, 0.03, -2.0, 1.0, 0.25], 0xffffff); tri([0.42, 0.9, 0, 0.42, 5.6, 0, 2.35, 0.8, -0.15], 0xfdf0d4);
  scene.add(g);
  return { g, update: t => { g.position.y = 0.03 * Math.sin(t * 1.3) - 0.02; g.rotation.z = 0.035 * Math.sin(t * 0.9 + 1); g.position.x = x + t * 0.35; } };
}
export function makeGulls(scene, list) {
  const white = std(0xfcfcfa, 0.7, 0, { side: THREE.DoubleSide }), gulls = [];
  for (const o of list) {
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), white); body.scale.set(0.34, 0.09, 0.1); g.add(body);
    const wing = side => { const t = new THREE.BufferGeometry(); t.setAttribute('position', new THREE.Float32BufferAttribute([0.14, 0, 0, -0.12, 0, 0, 0.0, 0.02, side * 0.36, 0.0, 0.02, side * 0.36, -0.12, 0, 0, -0.16, 0, side * 0.82, 0.0, 0.02, side * 0.36, -0.16, 0, side * 0.82, 0.02, 0.0, side * 0.6], 3)); t.computeVertexNormals(); const m = new THREE.Mesh(t, white), h = new THREE.Group(); h.add(m); g.add(h); return h; };
    const wl = wing(1), wr = wing(-1); g.scale.setScalar(o.s ?? 1); scene.add(g); gulls.push({ g, wl, wr, o });
  }
  return { update: t => { for (const b of gulls) { const o = b.o, a = o.a0 + t * o.w; b.g.position.set(o.cx + Math.cos(a) * o.r, o.y + 0.5 * Math.sin(t * 0.7 + o.a0), o.cz + Math.sin(a) * o.r * 0.6); b.g.rotation.y = -a - PI / 2 * Math.sign(o.w); const f = 0.55 * Math.sin(t * 6.5 + o.a0 * 3) * (0.5 + 0.5 * Math.sin(t * 0.8 + o.a0)); b.wl.rotation.x = -f - 0.1; b.wr.rotation.x = f + 0.1; } } };
}
