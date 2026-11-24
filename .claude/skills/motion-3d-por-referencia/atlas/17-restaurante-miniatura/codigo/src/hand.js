// A mão gigante que crava a bandeira. Modelada como um campo de distância (SDF):
// palma, falanges e polegar em cones arredondados unidos com "smooth min", depois
// poligonizada (surface nets) com normais do gradiente do campo. Unhas à parte.
import * as THREE from 'three';
import { clamp } from './util.js';
import { addFoam } from './foam.js';
import { RC, CAM_AZ } from './restaurant.js';
import { TL, flagState, handState, GRAB_DROP } from './timeline.js';

// ---------- primitivas SDF (cm) ----------
function sdRoundCone(px, py, pz, a, b, r1, r2) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
function sdRoundBox(px, py, pz, c, b, r) {
  const qx = Math.abs(px - c[0]) - b[0] + r, qy = Math.abs(py - c[1]) - b[1] + r, qz = Math.abs(pz - c[2]) - b[2] + r;
  const mx = Math.max(qx, 0), my = Math.max(qy, 0), mz = Math.max(qz, 0);
  return Math.hypot(mx, my, mz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r;
}
function sdEllipsoid(px, py, pz, c, r) {
  const x = (px - c[0]) / r[0], y = (py - c[1]) / r[1], z = (pz - c[2]) / r[2];
  const k0 = Math.hypot(x, y, z);
  const x1 = x / r[0], y1 = y / r[1], z1 = z / r[2]; const k1 = Math.hypot(x1, y1, z1);
  return k0 * (k0 - 1) / Math.max(k1, 1e-6);
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

// ---------- pose de pinça ----------
function chain(base, lens, angles, radii, splay = 0) {
  const sx = Math.sin(splay), cx = Math.cos(splay);
  const pts = [base.slice()]; const dirs = []; let th = 0;
  for (let i = 0; i < lens.length; i++) {
    th += angles[i];
    const d = [sx * Math.cos(th), -cx * Math.cos(th), Math.sin(th)];
    const p = pts[i];
    pts.push([p[0] + d[0] * lens[i], p[1] + d[1] * lens[i], p[2] + d[2] * lens[i]]);
    dirs.push({ d, dorsal: [sx * Math.sin(th), -cx * Math.sin(th), -Math.cos(th)] });
  }
  return { pts, dirs, radii };
}
const D = (a) => a * Math.PI / 180;
function buildPose() {
  const F = {};
  F.index = chain([2.85, -9.4, 0.35], [4.5, 2.7, 2.1], [D(34), D(46), D(14)], [1.02, 0.93, 0.86, 0.78], -0.05);
  F.middle = chain([0.95, -9.85, 0.35], [4.9, 3.0, 2.2], [D(58), D(84), D(42)], [1.06, 0.96, 0.88, 0.8], 0.0);
  F.ring = chain([-0.95, -9.55, 0.3], [4.5, 2.8, 2.1], [D(64), D(88), D(44)], [0.98, 0.9, 0.82, 0.75], 0.05);
  F.pinky = chain([-2.75, -8.8, 0.25], [3.7, 2.2, 1.8], [D(68), D(88), D(42)], [0.86, 0.79, 0.72, 0.66], 0.12);
  // polegar: vai da base (eminência tenar) até encontrar a ponta do indicador
  const it = F.index.pts[3], idDorsal = F.index.dirs[2].dorsal;
  // polpa do indicador = ponta recuada para o lado palmar
  const pad = [it[0] - F.index.dirs[2].d[0] * 0.7 - idDorsal[0] * 0.75, it[1] - F.index.dirs[2].d[1] * 0.7 - idDorsal[1] * 0.75, it[2] - F.index.dirs[2].d[2] * 0.7 - idDorsal[2] * 0.75];
  const tipT = [pad[0] + 1.25, pad[1] + 0.35, pad[2] + 1.15];
  const cmc = [3.5, -3.2, 1.25];
  const lerp3 = (a, b, k, off) => [a[0] + (b[0] - a[0]) * k + off[0], a[1] + (b[1] - a[1]) * k + off[1], a[2] + (b[2] - a[2]) * k + off[2]];
  const mcp = lerp3(cmc, tipT, 0.44, [1.7, 0.2, -0.35]);
  const ip = lerp3(cmc, tipT, 0.74, [1.25, 0.1, -0.15]);
  const td = [tipT[0] - ip[0], tipT[1] - ip[1], tipT[2] - ip[2]]; const tl = Math.hypot(...td); td[0] /= tl; td[1] /= tl; td[2] /= tl;
  // costas do polegar: para fora (+x) e para trás (-z), perpendicular à falange
  let tdor = [0.55, 0.15, -0.82]; const dp = tdor[0] * td[0] + tdor[1] * td[1] + tdor[2] * td[2];
  tdor = [tdor[0] - td[0] * dp, tdor[1] - td[1] * dp, tdor[2] - td[2] * dp]; const dl = Math.hypot(...tdor); tdor = tdor.map(v => v / dl);
  F.thumb = { pts: [cmc, mcp, ip, tipT], dirs: [null, null, { d: td, dorsal: tdor }], radii: [1.45, 1.22, 1.1, 0.95] };
  // ponto de pinça (onde passa o palito)
  F.pinch = [(pad[0] + tipT[0] - td[0] * 0.6) / 2, (pad[1] + tipT[1] - td[1] * 0.6) / 2, (pad[2] + tipT[2] - td[2] * 0.6) / 2];
  return F;
}

function handSDF(F) {
  const fingers = [F.index, F.middle, F.ring, F.pinky, F.thumb];
  return (x, y, z) => {
    // palma achatada e afunilando para o pulso
    let d = sdRoundBox(x, y, z, [0.1, -5.6, 0.25], [4.0, 3.9, 1.25], 1.15);
    d = smin(d, sdRoundCone(x, y, z, [0, 0.6, -0.1], [0.2, -3.4, 0.2], 2.75, 3.0), 2.0);
    // eminência tenar (músculo do polegar)
    d = smin(d, sdEllipsoid(x, y, z, [2.4, -4.4, 1.45], [2.0, 2.6, 1.3]), 1.2);
    // antebraço (sobe e vem em direção à câmera)
    d = smin(d, sdRoundCone(x, y, z, [0, 0.4, -0.1], [0, 15.5, -7.2], 2.8, 3.45), 1.5);
    for (const f of fingers) {
      const p = f.pts, r = f.radii;
      for (let i = 0; i < 3; i++) d = smin(d, sdRoundCone(x, y, z, p[i], p[i + 1], r[i], r[i + 1]), f === F.thumb && i === 0 ? 1.6 : 0.55);
      if (f !== F.thumb) {
        // nó dos dedos (dorso)
        const dor = f.dirs[0].dorsal;
        d = smin(d, Math.hypot(x - (p[0][0] + dor[0] * 0.55), y - (p[0][1] + dor[1] * 0.55 + 0.4), z - (p[0][2] + dor[2] * 0.55)) - r[0] * 0.95, 0.7);
      }
    }
    return d;
  };
}

// ---------- surface nets ----------
function polygonize(sdf, bmin, bmax, cell) {
  const nx = Math.ceil((bmax[0] - bmin[0]) / cell) + 1, ny = Math.ceil((bmax[1] - bmin[1]) / cell) + 1, nz = Math.ceil((bmax[2] - bmin[2]) / cell) + 1;
  const F = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++)
    F[i + nx * (j + ny * k)] = sdf(bmin[0] + i * cell, bmin[1] + j * cell, bmin[2] + k * cell);
  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const vid = new Int32Array(cx * cy * cz).fill(-1);
  const pos = [];
  const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const [a, b, e] = corner[c]; v[c] = F[(i + a) + nx * ((j + b) + ny * (k + e))]; if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const tt = v[a] / (v[a] - v[b]);
      sx += corner[a][0] + (corner[b][0] - corner[a][0]) * tt; sy += corner[a][1] + (corner[b][1] - corner[a][1]) * tt; sz += corner[a][2] + (corner[b][2] - corner[a][2]) * tt; n++;
    }
    vid[i + cx * (j + cy * k)] = pos.length / 3;
    pos.push(bmin[0] + (i + sx / n) * cell, bmin[1] + (j + sy / n) * cell, bmin[2] + (k + sz / n) * cell);
  }
  const idx = [];
  const C = (i, j, k) => vid[i + cx * (j + cy * k)];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < cz; k++) for (let j = 1; j < cy; j++) for (let i = 0; i < cx; i++) {   // arestas em x
    const a = F[i + nx * (j + ny * k)], b = F[(i + 1) + nx * (j + ny * k)];
    if ((a < 0) === (b < 0)) continue;
    quad(C(i, j - 1, k - 1), C(i, j, k - 1), C(i, j, k), C(i, j - 1, k), a < 0);
  }
  for (let k = 1; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 1; i < cx; i++) {   // arestas em y
    const a = F[i + nx * (j + ny * k)], b = F[i + nx * ((j + 1) + ny * k)];
    if ((a < 0) === (b < 0)) continue;
    quad(C(i - 1, j, k - 1), C(i - 1, j, k), C(i, j, k), C(i, j, k - 1), a < 0);
  }
  for (let k = 0; k < cz; k++) for (let j = 1; j < cy; j++) for (let i = 1; i < cx; i++) {   // arestas em z
    const a = F[i + nx * (j + ny * k)], b = F[i + nx * (j + ny * (k + 1))];
    if ((a < 0) === (b < 0)) continue;
    quad(C(i - 1, j - 1, k), C(i, j - 1, k), C(i, j, k), C(i - 1, j, k), a < 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function nailGeo() { const g = new THREE.SphereGeometry(1, 20, 12); return g; }

export function buildHands(ctx) {
  const { scene } = ctx;
  const F = buildPose();
  const sdf = handSDF(F);
  const geo = polygonize(sdf, [-6.5, -17, -9.5], [9.5, 16.2, 10.5], 0.24);
  // normais pelo gradiente; cor da pele com oclusão nas dobras e rubor nas pontas
  const p = geo.attributes.position; const nrm = new Float32Array(p.count * 3), col = new Float32Array(p.count * 3);
  const skin = new THREE.Color('#d9a28a'), blush = new THREE.Color('#c97a68'), deep = new THREE.Color('#8e5444');
  const joints = []; for (const f of [F.index, F.middle, F.ring, F.pinky, F.thumb]) joints.push(...f.pts.slice(1));
  const tips = [F.index, F.middle, F.ring, F.pinky, F.thumb].map(f => f.pts[3]);
  const e = 0.05; const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    const l = Math.hypot(gx, gy, gz) || 1; gx /= l; gy /= l; gz /= l;
    nrm[i * 3] = gx; nrm[i * 3 + 1] = gy; nrm[i * 3 + 2] = gz;
    const ao = clamp(0.25 + 0.75 * sdf(x + gx * 1.1, y + gy * 1.1, z + gz * 1.1) / 1.1, 0.25, 1);
    let jr = 0; for (const j of joints) jr = Math.max(jr, 1 - Math.hypot(x - j[0], y - j[1], z - j[2]) / 1.6);
    let tr = 0; for (const t of tips) tr = Math.max(tr, 1 - Math.hypot(x - t[0], y - t[1], z - t[2]) / 2.0);
    c.copy(skin).lerp(blush, clamp(jr * 0.35 + tr * 0.45)).lerp(deep, (1 - ao) * 0.55).multiplyScalar(0.55 + 0.45 * ao);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const skinMat = addFoam(new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.52, sheen: 0.4, sheenColor: new THREE.Color('#f0a090'), sheenRoughness: 0.4,
    clearcoat: 0.1, clearcoatRoughness: 0.55, specularIntensity: 0.55, emissive: new THREE.Color(0.07, 0.022, 0.015),
  }), { freq: 2.6, bump: 0.012, color: 0.06, freq2: 9, mix2: 0.6, key: 'skin' });
  const hand = new THREE.Mesh(geo, skinMat); hand.castShadow = true;
  // antebraço continua para fora do quadro
  const armDir = new THREE.Vector3(0, 15.1, -7.1).normalize();
  const armGeo = new THREE.CylinderGeometry(3.45, 3.9, 60, 32, 1, true); armGeo.translate(0, 30, 0);
  const arm = new THREE.Mesh(armGeo, skinMat); arm.position.set(0, 15.5, -7.2); arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), armDir); arm.castShadow = true;
  // unhas
  const nailMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#e3a596'), roughness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.15, sheen: 0.2 });
  const nails = new THREE.Group();
  for (const f of [F.index, F.middle, F.ring, F.pinky, F.thumb]) {
    const a = f.pts[2], b = f.pts[3], dd = f.dirs[2];
    const r = f.radii[3];
    const m = new THREE.Mesh(nailGeo(), nailMat);
    const ctr = new THREE.Vector3(a[0] + (b[0] - a[0]) * 0.62 + dd.dorsal[0] * r * 0.8, a[1] + (b[1] - a[1]) * 0.62 + dd.dorsal[1] * r * 0.8, a[2] + (b[2] - a[2]) * 0.62 + dd.dorsal[2] * r * 0.8);
    m.position.copy(ctr);
    const Yv = new THREE.Vector3(...dd.dorsal), Zv = new THREE.Vector3(...dd.d), Xv = new THREE.Vector3().crossVectors(Yv, Zv).normalize();
    Zv.crossVectors(Xv, Yv).normalize();
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(Xv, Yv, Zv));
    m.scale.set(r * 0.78, r * 0.2, r * 0.95);
    nails.add(m);
  }
  // grupo local -> mundo: dorso para a câmera, dedos para baixo, polegar à esquerda da tela
  const local = new THREE.Group(); local.add(hand, arm, nails);
  const pinch = new THREE.Vector3(...F.pinch); pinch.z += 0.7;
  local.position.copy(pinch).multiplyScalar(-1);           // o ponto de pinça vira a origem
  const pivot = new THREE.Group(); pivot.add(local);
  const SCALE = 0.8;
  pivot.scale.setScalar(SCALE);
  const Xl = new THREE.Vector3(-Math.cos(CAM_AZ), 0, Math.sin(CAM_AZ)), Yl = new THREE.Vector3(0, 1, 0), Zl = new THREE.Vector3(-Math.sin(CAM_AZ), 0, -Math.cos(CAM_AZ));
  const baseQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(Xl, Yl, Zl));
  // inclina o dorso um pouco para cima (vemos as costas da mão de cima) e gira 3/4
  const tiltQ = new THREE.Quaternion().setFromAxisAngle(Xl, -0.32);
  const yawQ = new THREE.Quaternion().setFromAxisAngle(Yl, 0.42);
  pivot.quaternion.copy(yawQ).multiply(tiltQ).multiply(baseQ);
  scene.add(pivot);
  const toCam = new THREE.Vector3(Math.sin(CAM_AZ), 0, Math.cos(CAM_AZ));
  ctx.hand = { pivot, F };
  ctx.updaters.push(t => {
    const hs = handState(t);
    pivot.visible = !!hs.on;
    if (!hs.on) return;
    const fs = flagState(t);
    // se a mão já soltou, usa a altura em que o palito ficou
    const y = fs.y - GRAB_DROP + hs.dy;
    // acompanha a inclinação do palito na entrada (o ponto de pinça desloca para a direita da tela)
    const side = Math.sin(fs.tilt) * GRAB_DROP;
    pivot.position.set(RC.x, y, RC.z).addScaledVector(toCam, hs.away).addScaledVector(Xl, -side);
    // ao soltar, a mão abre levemente (gira para trás)
    const relQ = new THREE.Quaternion().setFromAxisAngle(Xl, -0.25 * (hs.open || 0));
    pivot.quaternion.copy(relQ).multiply(yawQ).multiply(tiltQ).multiply(baseQ);
  });
  return ctx.hand;
}
