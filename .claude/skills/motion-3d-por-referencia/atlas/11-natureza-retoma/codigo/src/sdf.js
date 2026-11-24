// Escultura por código: o objeto é descrito como uma função de distância (SDF) e vira malha
// por marching cubes. Serve para formas orgânicas (controle, fone, mouse) sem modelo 3D de arquivo.
import * as THREE from 'three';
import { edgeTable, triTable } from 'three/addons/objects/MarchingCubes.js';

export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const smax = (a, b, k) => -smin(-a, -b, k);

// elipsoide (distância aproximada, boa o bastante perto da superfície)
export function sdEllipsoid(x, y, z, cx, cy, cz, rx, ry, rz) {
  const px = x - cx, py = y - cy, pz = z - cz;
  const k0 = Math.hypot(px / rx, py / ry, pz / rz);
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return k1 < 1e-9 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1;
}

// cápsula que afina: de A (raio r1) até B (raio r2)
export function sdRoundCone(x, y, z, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = x - ax, pay = y - ay, paz = z - az;
  const yy = pax * bax + pay * bay + paz * baz;
  const zz = yy - l2;
  const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = yy * yy * l2, z2 = zz * zz * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
}

export function sdRoundBox(x, y, z, cx, cy, cz, hx, hy, hz, r) {
  const qx = Math.abs(x - cx) - hx + r, qy = Math.abs(y - cy) - hy + r, qz = Math.abs(z - cz) - hz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}

// Malha indexada (vértices compartilhados) com normais tiradas do gradiente da SDF.
// sdf(x,y,z) < 0 é dentro. min/max: caixa que contém o objeto. cell: tamanho da célula.
export function polygonize(sdf, min, max, cell) {
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1, ny = Math.ceil((max[1] - min[1]) / cell) + 1, nz = Math.ceil((max[2] - min[2]) / cell) + 1;
  const f = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++)
    f[i + nx * (j + ny * k)] = sdf(min[0] + i * cell, min[1] + j * cell, min[2] + k * cell);

  const pos = [], idx = [];
  const cache = new Map(); // aresta -> índice do vértice
  const CO = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  const ED = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const vid = (i, j, k) => i + nx * (j + ny * k);
  const NT = nx * ny * nz;
  const ev = new Int32Array(12);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let ci = 0;
    for (let c = 0; c < 8; c++) if (f[vid(i + CO[c][0], j + CO[c][1], k + CO[c][2])] < 0) ci |= 1 << c;
    const bits = edgeTable[ci];
    if (!bits) continue;
    for (let e = 0; e < 12; e++) {
      if (!(bits & (1 << e))) continue;
      const a = CO[ED[e][0]], b = CO[ED[e][1]];
      const ia = vid(i + a[0], j + a[1], k + a[2]), ib = vid(i + b[0], j + b[1], k + b[2]);
      const key = ia < ib ? ia * NT + ib : ib * NT + ia;
      let v = cache.get(key);
      if (v === undefined) {
        const fa = f[ia], fb = f[ib], t = fa / (fa - fb);
        v = pos.length / 3;
        pos.push(min[0] + (i + a[0] + (b[0] - a[0]) * t) * cell, min[1] + (j + a[1] + (b[1] - a[1]) * t) * cell, min[2] + (k + a[2] + (b[2] - a[2]) * t) * cell);
        cache.set(key, v);
      }
      ev[e] = v;
    }
    for (let o = ci * 16; triTable[o] !== -1; o += 3) idx.push(ev[triTable[o]], ev[triTable[o + 1]], ev[triTable[o + 2]]);
  }

  // normais pelo gradiente
  const nrm = new Float32Array(pos.length), h = cell * 0.5;
  for (let v = 0; v < pos.length; v += 3) {
    const x = pos[v], y = pos[v + 1], z = pos[v + 2];
    let gx = sdf(x + h, y, z) - sdf(x - h, y, z), gy = sdf(x, y + h, z) - sdf(x, y - h, z), gz = sdf(x, y, z + h) - sdf(x, y, z - h);
    const l = Math.hypot(gx, gy, gz) || 1;
    nrm[v] = gx / l; nrm[v + 1] = gy / l; nrm[v + 2] = gz / l;
  }
  // garante que a face aponta para fora (mesmo lado da normal)
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    if (fx * nrm[a] + fy * nrm[a + 1] + fz * nrm[a + 2] < 0) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}

// acha a superfície descendo no eixo Z a partir de z0 (para pousar botões e alavancas na face)
export function surfaceZ(sdf, x, y, z0 = 2, z1 = 0) {
  let a = z0, b = z1;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (sdf(x, y, m) > 0) a = m; else b = m; }
  return (a + b) / 2;
}
export function gradient(sdf, x, y, z, h = 0.01) {
  const v = new THREE.Vector3(sdf(x + h, y, z) - sdf(x - h, y, z), sdf(x, y + h, z) - sdf(x, y - h, z), sdf(x, y, z + h) - sdf(x, y, z - h));
  return v.normalize();
}
