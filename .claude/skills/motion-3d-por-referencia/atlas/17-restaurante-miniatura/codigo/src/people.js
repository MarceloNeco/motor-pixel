// Bonequinhos de maquete (escala de ferreomodelismo): pedestres em time-lapse, operários na obra,
// fila na porta, gente no pátio e jantando lá dentro. Pernas e braços balançam ao andar.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { U, CURB, LOT, STREET } from './city.js';
import { rng, clamp, remap, lerp, easeOutCubic, smooth } from './util.js';
import { TL } from './timeline.js';

const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.0 });
const SKIN = ['#e9b896', '#c98e6a', '#8d5a3c', '#f1c8a8', '#b47a55', '#6e432c'];
const HAIR = ['#1a120c', '#3a2414', '#6a4422', '#c9a36a', '#2a2a2a', '#8a8a8a'];
const SHIRT = ['#d8d2c6', '#8a2a22', '#2a3e5e', '#3a5a3a', '#c9a24a', '#4a3a52', '#a8622e', '#2a2a2a', '#6a8aa0', '#8a4a5a', '#e8e4dc', '#4a5a6a', '#2a2a2a', '#5a4a3a'];
const PANTS = ['#1f2a44', '#2a2a2a', '#5a4632', '#3b4a5c', '#7a7266', '#1a1a1a'];

function colored(geo, hex) {
  const c = new THREE.Color(hex); const n = geo.attributes.position.count; const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (geo.index) geo = geo.toNonIndexed();
  return geo;
}
const cap = (r, len, seg = 8) => new THREE.CapsuleGeometry(r, len, 4, seg);

// cria uma figura; retorna { group, legL, legR, armL, armR }
export function figure(r, { worker = false, seated = false, shirt, bag = false } = {}) {
  const skin = r.pick(SKIN), hair = r.pick(HAIR), sh = shirt || r.pick(SHIRT), pa = r.pick(PANTS);
  const h = r.range(0.92, 1.06); // variação de altura
  const parts = [];
  const torso = cap(0.17, 0.36, 10); torso.scale(1.12, 1, 0.74); torso.translate(0, 1.2, 0); parts.push(colored(torso, worker ? '#ff7a12' : sh));
  const neck = new THREE.CylinderGeometry(0.06, 0.07, 0.12, 8); neck.translate(0, 1.5, 0); parts.push(colored(neck, skin));
  const head = new THREE.SphereGeometry(0.115, 14, 10); head.scale(0.92, 1.08, 1); head.translate(0, 1.63, 0.0); parts.push(colored(head, skin));
  if (worker) { const hat = new THREE.SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); hat.translate(0, 1.66, 0); parts.push(colored(hat, '#ffd21a')); const brim = new THREE.CylinderGeometry(0.15, 0.15, 0.02, 14); brim.translate(0, 1.66, 0.02); parts.push(colored(brim, '#ffd21a')); }
  else if (r() < 0.85) { const hr = new THREE.SphereGeometry(0.122, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55); hr.translate(0, 1.645, -0.012); parts.push(colored(hr, hair)); }
  if (bag) { const b = new THREE.BoxGeometry(0.22, 0.28, 0.1); b.translate(0.24, 0.95, 0); parts.push(colored(b, r.pick(['#5a3a22', '#1a1a1a', '#b3261e']))); }
  const pelvis = cap(0.15, 0.08, 8); pelvis.scale(1.05, 1, 0.75); pelvis.translate(0, 0.92, 0); parts.push(colored(pelvis, seated ? pa : pa));
  const body = new THREE.Mesh(mergeGeometries(parts), mat); body.castShadow = true;
  const g = new THREE.Group(); g.add(body);
  const limb = (len, rad, col, hipY, x) => {
    const piv = new THREE.Group(); piv.position.set(x, hipY, 0);
    const lg = cap(rad, len - rad * 2, 6); lg.translate(0, -len / 2, 0);
    const parts2 = [colored(lg, col)];
    return { piv, parts2 };
  };
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const L = limb(0.86, 0.075, pa, 0.9, s * 0.085);
    const shoe = new THREE.BoxGeometry(0.11, 0.07, 0.24); shoe.translate(0, -0.86, 0.05); L.parts2.push(colored(shoe, '#1a1410'));
    const m = new THREE.Mesh(mergeGeometries(L.parts2), mat); m.castShadow = true; L.piv.add(m); g.add(L.piv); legs.push(L.piv);
    const A = limb(0.62, 0.052, worker ? '#ff7a12' : sh, 1.42, s * 0.235);
    const hand = new THREE.SphereGeometry(0.055, 8, 6); hand.translate(0, -0.64, 0); A.parts2.push(colored(hand, skin));
    const am = new THREE.Mesh(mergeGeometries(A.parts2), mat); am.castShadow = true; A.piv.add(am); A.piv.rotation.z = s * 0.06; g.add(A.piv); arms.push(A.piv);
  }
  if (seated) { for (const l of legs) l.rotation.x = -1.45; }
  g.scale.setScalar(U * h);
  return { group: g, legs, arms };
}
function stride(f, phase, amp = 0.55) {
  const s = Math.sin(phase);
  f.legs[0].rotation.x = s * amp; f.legs[1].rotation.x = -s * amp;
  f.arms[0].rotation.x = -s * amp * 0.8; f.arms[1].rotation.x = s * amp * 0.8;
}
function stand(f) { for (const l of f.legs) l.rotation.x = 0; for (const a of f.arms) a.rotation.x = 0; }

// ------------------------------------------------------------------
// ruído determinístico por (id, passo): é o "tremor" de time-lapse
const hsh = (a, b = 0, c = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };

export function buildPeople(ctx) {
  const { scene } = ctx; const r = rng(707);
  const all = []; let ID = 0;
  const Y = CURB;
  const add = (opts, fn) => { const f = figure(r, opts); scene.add(f.group); const id = ++ID; all.push({ f, fn: t => fn(t, f, id) }); return f; };
  const RC = [0.3, -0.5], RB = 11.3;
  const outside = (x, z) => { const dx = x - RC[0], dz = z - RC[1], d = Math.hypot(dx, dz); return d < RB ? [RC[0] + dx / d * RB, RC[1] + dz / d * RB] : [x, z]; };

  // ---- gente parada que muda de lugar aos saltos (cx, cz, raio, janela, intervalo do salto) ----
  const standing = (cx, cz, rad, t0, t1, { hop = [0.13, 0.42], absent = 0.12, opts = {}, y = Y, keepOut = false } = {}) => {
    const hpF = Math.max(2, Math.round(r.range(hop[0], hop[1]) * 24)), phF = r.int(0, hpF - 1), tin = t0 + r.range(0, 0.25);
    add(opts, (t, f, id) => {
      if (t < tin || t > t1) return false;
      const k = Math.floor((Math.round(t * 24) + phF) / hpF);
      if (hsh(id, k, 3) < absent) return false;
      const a = hsh(id, k, 1) * Math.PI * 2, d = Math.sqrt(hsh(id, k, 2)) * rad;
      let x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (keepOut) [x, z] = outside(x, z);
      f.group.position.set(x, y, z); f.group.rotation.y = hsh(id, k, 4) * Math.PI * 2; stand(f);
      f.arms[0].rotation.x = -hsh(id, k, 5) * 0.9 * (hsh(id, k, 6) < 0.3 ? 1 : 0.15);
      f.arms[1].rotation.x = -hsh(id, k, 7) * 0.5 * (hsh(id, k, 8) < 0.2 ? 1 : 0.1);
      return true;
    });
  };
  // ---- poucos caminhantes, em passo de time-lapse ----
  const walker = (x0, z0, x1, z1, t0, speed = 9) => {
    const len = Math.hypot(x1 - x0, z1 - z0), h = Math.atan2(x1 - x0, z1 - z0);
    add({ bag: r() < 0.3 }, (t, f) => {
      const s = (t - t0) * speed; if (s < 0 || s > len) return false;
      f.group.position.set(x0 + (x1 - x0) * s / len, Y, z0 + (z1 - z0) * s / len); f.group.rotation.y = h; stride(f, s / (U * 0.42)); return true;
    });
  };

  // grupos fixos da referência (posições desprojetadas dos quadros)
  for (let i = 0; i < 5; i++) standing(7.2, 29.9, 1.5, -1, 9);                  // canto de baixo, à esquerda
  for (let i = 0; i < 5; i++) standing(1.4, -18.7, 2.5, -1, 9);                 // calçada do fundo
  for (let i = 0; i < 2; i++) standing(-9.2, 10.9, 1.2, -1, 9, { absent: 0.05 }); // junto ao poste da esquerda
  for (let i = 0; i < 2; i++) standing(31.0, 13.5, 1.8, -1, 9);                 // esquina de baixo, à direita
  standing(30.8, 3.0, 1.0, -1, 9);
  standing(-30.5, 14, 1.5, -1, 9); standing(-9.8, -8, 1.2, -1, 9, { absent: 0.4 });

  // ---- operários ----
  const W = { worker: true };
  standing(0.6, 2.8, 1.6, -1, 0.74, { hop: [0.12, 0.25], absent: 0.05, opts: W, y: Y + 0.2 });   // o que cava no começo
  standing(-3.2, -5.5, 2.0, -1, 0.74, { hop: [0.2, 0.4], absent: 0.35, opts: W, y: Y + 0.2 });
  for (let i = 0; i < 6; i++) standing(2.2, 3.6, 2.6, 0.70, TL.base0, { hop: [0.085, 0.17], absent: 0.06, opts: W, y: Y + 0.2 }); // todos juntos no meio (q18–q27)
  for (let i = 0; i < 3; i++) {                                                  // dentro do anel, vistos pelo vidro
    const a = THREE.MathUtils.degToRad(44) + (i - 1) * 0.5;
    standing(RC[0] + Math.sin(a) * 6.2, RC[1] + Math.cos(a) * 6.2, 1.5, TL.base0, TL.burger0, { hop: [0.1, 0.22], absent: 0.1, opts: W, y: CURB + 1.85 });
  }
  for (let i = 0; i < 2; i++) standing(10.5, -11, 2.0, TL.base0, TL.burger0, { hop: [0.12, 0.3], opts: W, keepOut: true });

  // ---- depois de abrir ----
  standing(3.4, 10.6, 0.7, TL.lights0 + 0.1, 9, { hop: [0.2, 0.6], absent: 0.05, keepOut: true });  // dois diante da vitrine
  standing(5.9, 9.3, 0.7, TL.lights0 + 0.15, 9, { hop: [0.2, 0.6], absent: 0.05, keepOut: true });
  for (let i = 0; i < 3; i++) standing(-6.2, 11.3, 1.6, TL.crowd0, 9, { keepOut: true });
  for (let i = 0; i < 2; i++) standing(8.6, 9.2, 1.4, TL.crowd0 + 0.3, 9, { keepOut: true });
  // o público junta no pátio aos poucos (q80–q92) antes dos guarda-sóis
  for (let i = 0; i < 9; i++) {
    const t0 = TL.patioCrowd0 + i * 0.07;
    add({}, (t, f, id) => {
      if (t < t0) return false;
      const hpF = 7 + Math.floor(hsh(id, 0, 9) * 9); const k = Math.floor(Math.round(t * 24) / hpF);
      if (hsh(id, k, 3) < 0.1) return false;
      const a = hsh(id, k, 1) * Math.PI * 2, d = Math.sqrt(hsh(id, k, 2)) * 3.6;
      const [x, z] = outside(8.6 + Math.cos(a) * d, -12.6 + Math.sin(a) * d * 1.3);
      f.group.position.set(Math.min(x, 12.0), Y, z); f.group.rotation.y = hsh(id, k, 4) * 6.28; stand(f); return true;
    });
  }
  // sentados sob os guarda-sóis, conforme cada um abre
  [[8.6, -11.2, TL.patio0], [4.4, -15.4, TL.patio1], [10.4, -16.8, TL.patio2]].forEach(([x, z, t0]) => {
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * Math.PI * 2 + 0.4; const tIn = t0 + 0.08 + r.range(0, 0.3);
      add({ seated: true }, (t, f) => {
        if (t < tIn) return false;
        f.group.position.set(x + Math.cos(a) * 2.0, Y - 0.25 * U, z + Math.sin(a) * 2.0);
        f.group.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
        f.arms[0].rotation.x = -0.8 + Math.sin(t * 3 + k) * 0.15; return true;
      });
    }
  });
  // clientes lá dentro
  const CAMA = THREE.MathUtils.degToRad(44);
  for (let i = 0; i < 14; i++) {
    const a = CAMA + (i - 7) * 0.19 + r.range(-0.05, 0.05), rad = r.range(4.2, 8.4);
    const tIn = TL.lights0 + r.range(0, 0.3); const seated = r() < 0.6; const face = (i % 2 ? Math.PI / 2 : -Math.PI / 2);
    add({ seated }, (t, f) => {
      if (t < tIn) return false;
      f.group.position.set(RC[0] + Math.sin(a) * rad, CURB + 1.82 - (seated ? 0.25 * U : 0), RC[1] + Math.cos(a) * rad);
      f.group.rotation.y = a + face; return true;
    });
  }

  // ---- caminhantes (poucos) ----
  walker(-19, 11.4, -12.6, 11.2, 0.15, 7); walker(-12.5, 11.6, 11.5, 11.8, 2.7, 9); walker(11.8, 11.5, 11.8, -18, 5.0, 9);
  walker(12, 30.8, -8, 31.2, 3.0, 8); walker(-10, 31.4, 10, 30.6, 5.6, 8); walker(30.8, 12, 30.6, -30, 1.0, 9); walker(30.6, -28, 30.9, 11, 4.4, 9);
  walker(-11.2, 9, -11.0, -19, 6.0, 9);

  ctx.people = all;
  ctx.updaters.push(t => { for (const p of all) p.f.group.visible = !!p.fn(t); });
  return all;
}
