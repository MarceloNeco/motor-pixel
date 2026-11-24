// lib.js: ferramentas comuns dos dinossauros.
// Tudo procedural: corpo em "loft" (anéis ao longo de uma espinha), pernas com IK,
// pele pintada em canvas e o olho de adesivo (googly). Nenhum modelo ou imagem de arquivo.
import * as THREE from 'three';

export const PI = Math.PI, TAU = Math.PI * 2, DEG = Math.PI / 180;
export const LOOP = 4; // todo movimento fecha em 4 s (use sempre cyc/env para o laço emendar)
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const frac = x => x - Math.floor(x);
export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// seno com n ciclos inteiros por laço (n inteiro = emenda perfeita)
export const cyc = (t, n = 1, phase = 0) => Math.sin(TAU * (n * t / LOOP + phase));
// envelope dentro do laço: 0 → 1 entre a e a+up, fica em 1, volta a 0 entre b-down e b (frações do laço, 0..1)
export function env(t, a, b, up = 0.08, down = up) { const f = frac(t / LOOP); return smooth(seg(f, a, a + up)) * (1 - smooth(seg(f, b - down, b))); }

const Z_AXIS = new THREE.Vector3(0, 0, 1);

// ponto de controle de uma espinha: posição + meia-largura (w), altura acima (ht) e abaixo (hb) do eixo, e "quadradice" (sq < 1 = mais caixote)
export const C = (x, y, w, ht, hb = ht, sq = 1, z = 0) => ({ p: new THREE.Vector3(x, y, z), w, ht, hb, sq });

const _cr = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);

// Amostra n anéis ao longo dos pontos de controle (Catmull-Rom), com quadro local em cada anel:
// T = tangente (para a frente), B = lateral, N = "para cima" do anel.
export function sampleChain(ctrl, n, side = Z_AXIS) {
  const m = ctrl.length, L = [0];
  for (let i = 1; i < m; i++) L.push(L[i - 1] + ctrl[i].p.distanceTo(ctrl[i - 1].p));
  const tot = L[m - 1], out = [];
  let k = 0;
  for (let i = 0; i < n; i++) {
    const s = tot * i / (n - 1);
    while (k < m - 2 && s > L[k + 1]) k++;
    const t = L[k + 1] > L[k] ? clamp((s - L[k]) / (L[k + 1] - L[k])) : 0;
    const a = ctrl[Math.max(k - 1, 0)], b = ctrl[k], c = ctrl[k + 1], d = ctrl[Math.min(k + 2, m - 1)];
    const p = new THREE.Vector3(_cr(a.p.x, b.p.x, c.p.x, d.p.x, t), _cr(a.p.y, b.p.y, c.p.y, d.p.y, t), _cr(a.p.z, b.p.z, c.p.z, d.p.z, t));
    const f = key => Math.max(0, _cr(a[key], b[key], c[key], d[key], t));
    out.push({ p, w: f('w'), ht: f('ht'), hb: f('hb'), sq: lerp(b.sq ?? 1, c.sq ?? 1, t), u: s / tot });
  }
  for (let i = 0; i < n; i++) {
    const s = out[i], a = out[Math.max(i - 1, 0)].p, b = out[Math.min(i + 1, n - 1)].p;
    s.T = b.clone().sub(a).normalize();
    s.B = side.clone().addScaledVector(s.T, -side.dot(s.T)).normalize();
    s.N = s.B.clone().cross(s.T);
  }
  out.uCtrl = L.map(l => l / tot); // u de cada ponto de controle
  return out;
}

// interpola as amostras em u (0..1): devolve posição e quadro, para prender coisas no corpo (pernas, espinhos, placas)
export function atU(samples, u) {
  const n = samples.length, f = clamp(u) * (n - 1), i = Math.min(Math.floor(f), n - 2), t = f - i, a = samples[i], b = samples[i + 1];
  const T = a.T.clone().lerp(b.T, t).normalize(), B = a.B.clone().lerp(b.B, t).normalize();
  return { p: a.p.clone().lerp(b.p, t), T, B, N: B.clone().cross(T), w: lerp(a.w, b.w, t), ht: lerp(a.ht, b.ht, t), hb: lerp(a.hb, b.hb, t) };
}
// o mesmo, procurando pela coordenada x (para cabeças, que são construídas ao longo de x)
export function atX(samples, x) {
  let i = 0; while (i < samples.length - 2 && samples[i + 1].p.x < x) i++;
  const a = samples[i], b = samples[i + 1], t = clamp((x - a.p.x) / Math.max(1e-6, b.p.x - a.p.x));
  return { p: a.p.clone().lerp(b.p, t), w: lerp(a.w, b.w, t), ht: lerp(a.ht, b.ht, t), hb: lerp(a.hb, b.hb, t), u: lerp(a.u, b.u, t) };
}
// ponto na superfície do corpo: ang = 0 no topo (dorso), +90° no lado +z, 180° na barriga, -90° no lado -z
export function onSurface(fr, angDeg, out = 1) {
  const a = angDeg * DEG, c = Math.cos(a), s = Math.sin(a);
  return fr.p.clone().addScaledVector(fr.B, fr.w * s * out).addScaledVector(fr.N, (c >= 0 ? fr.ht : fr.hb) * c * out);
}
// posiciona um objeto com x = T, y = N, z = B
const _m = new THREE.Matrix4();
export function setBasis(obj, p, T, N, B) { _m.makeBasis(T, N, B); obj.quaternion.setFromRotationMatrix(_m); obj.position.copy(p); return obj; }

// Malha de anéis que pode ser refeita a cada quadro (corpo, pescoço, cauda, pernas).
export class Loft {
  constructor(nR, nS, material, { u0 = 0, u1 = 1 } = {}) {
    this.nR = nR; this.nS = nS; this.u0 = u0; this.u1 = u1;
    const nv = nR * (nS + 1);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    this.geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(nv * 2), 2));
    const idx = [];
    for (let i = 0; i < nR - 1; i++) for (let j = 0; j < nS; j++) {
      const a = i * (nS + 1) + j, b = a + 1, c = a + nS + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.samples = null;
  }
  // ctrl: pontos de controle (C(...)); side: eixo lateral de referência
  setCtrl(ctrl, side) { return this.set(sampleChain(ctrl, this.nR, side)); }
  set(samples) {
    this.samples = samples;
    const { nR, nS } = this, pos = this.geo.attributes.position.array, uv = this.geo.attributes.uv.array;
    let o = 0, q = 0;
    for (let i = 0; i < nR; i++) {
      const s = samples[i], e = s.sq ?? 1, tip = (i === 0 || i === nR - 1) && s.w < 0.09;
      for (let j = 0; j <= nS; j++) {
        const ph = PI / 2 + TAU * j / nS, c = Math.cos(ph), sn = Math.sin(ph);
        const cx = Math.sign(c) * Math.pow(Math.abs(c), e), cy = Math.sign(sn) * Math.pow(Math.abs(sn), e);
        const lx = tip ? 0 : s.w * cx, ly = tip ? 0 : (cy >= 0 ? s.ht : s.hb) * cy;
        pos[o++] = s.p.x + s.B.x * lx + s.N.x * ly;
        pos[o++] = s.p.y + s.B.y * lx + s.N.y * ly;
        pos[o++] = s.p.z + s.B.z * lx + s.N.z * ly;
        uv[q++] = lerp(this.u0, this.u1, s.u); uv[q++] = j / nS;
      }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true;
    this.geo.computeVertexNormals();
    const nrm = this.geo.attributes.normal.array; // costura: iguala as normais da primeira e da última coluna
    for (let i = 0; i < nR; i++) {
      const a = i * (nS + 1) * 3, b = a + nS * 3;
      for (let k = 0; k < 3; k++) { const v = (nrm[a + k] + nrm[b + k]) / 2; nrm[a + k] = v; nrm[b + k] = v; }
    }
    this.geo.attributes.normal.needsUpdate = true;
    return samples;
  }
  at(u) { return atU(this.samples, u); }
}

// Espinha com cinemática direta. rest: pontos de controle em repouso; root: índice do quadril.
// bend(i) -> { yaw, pitch } (radianos) do trecho que chega no ponto i: pitch > 0 levanta a ponta, yaw > 0 leva para +z.
// As dobras se acumulam do quadril para as pontas (cauda para um lado, pescoço para o outro).
export function fkSpine(rest, root, bend, rootQ = null, rootOff = null) {
  const out = rest.map(c => ({ ...c, p: c.p.clone() }));
  if (rootOff) out[root].p.add(rootOff);
  const q = new THREE.Quaternion(), qi = new THREE.Quaternion(), e = new THREE.Euler(), d = new THREE.Vector3();
  for (const dir of [1, -1]) {
    if (rootQ) q.copy(rootQ); else q.identity();
    for (let i = root + dir; i >= 0 && i < rest.length; i += dir) {
      const b = bend(i) || {};
      e.set(0, -dir * (b.yaw || 0), dir * (b.pitch || 0), 'YZX');
      q.multiply(qi.setFromEuler(e));
      d.subVectors(rest[i].p, rest[i - dir].p).applyQuaternion(q);
      out[i].p.copy(out[i - dir].p).add(d);
    }
  }
  return out;
}

// IK de dois ossos: dá a posição do joelho (ou cotovelo) entre H e A, dobrando para o lado do vetor pole
export function ik2(H, A, a, b, pole) {
  const d = A.clone().sub(H), L0 = d.length(), L = clamp(L0, Math.abs(a - b) + 1e-3, a + b - 1e-3);
  d.multiplyScalar(1 / (L0 || 1));
  const cosH = clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1), sinH = Math.sqrt(1 - cosH * cosH);
  const perp = pole.clone().addScaledVector(d, -pole.dot(d)).normalize();
  return H.clone().addScaledVector(d, a * cosH).addScaledVector(perp, a * sinH);
}

// Caminho de ossos para o loft de uma perna: insere pontos retos entre as juntas (o joelho fica joelho, não macarrão)
// pts: [{ p, w, ht, hb, bulge }] — bulge engrossa o meio do osso (músculo)
export function bonePath(pts, sub = 2, caps = true) {
  const out = [];
  const dome = (a, dir, k) => [0.62, 0.3].map((f, i) => ({ p: a.p.clone().addScaledVector(dir, k * (i ? 0.34 : 0.62) * a.ht), w: a.w * (i ? 0.72 : 0.02), ht: a.ht * (i ? 0.72 : 0.02), hb: a.hb * (i ? 0.72 : 0.02), sq: 1 }));
  if (caps) { const a = pts[0], b = pts[1]; out.push(...dome(a, b.p.clone().sub(a.p).normalize(), -1)); }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    out.push({ sq: 1, ...a });
    for (let k = 1; k <= sub; k++) {
      const t = k / (sub + 1), g = 1 + (a.bulge || 0) * Math.sin(PI * t);
      out.push({ p: a.p.clone().lerp(b.p, t), w: lerp(a.w, b.w, t) * g, ht: lerp(a.ht, b.ht, t) * g, hb: lerp(a.hb, b.hb, t) * g, sq: 1 });
    }
  }
  const z = pts[pts.length - 1]; out.push({ sq: 1, ...z });
  if (caps) { const y = pts[pts.length - 2]; out.push(...dome(z, z.p.clone().sub(y.p).normalize(), 1).reverse()); }
  return out;
}

// ---------------------------------------------------------------- pele em canvas
export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
export function shade(hex, dl, ds = 0) { const c = new THREE.Color(hex); c.offsetHSL(0, ds, dl); return '#' + c.getHexString(); }
const rgba = (hex, a) => { const c = new THREE.Color(hex); return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`; };

let _bump = null;
function bumpTex() { // relevo de escamas, compartilhado
  if (_bump) return _bump;
  const r = mulberry32(99);
  _bump = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, rad = 5 + r() * 7;
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
        const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
        gr.addColorStop(0, 'rgba(215,215,215,0.9)'); gr.addColorStop(0.7, 'rgba(150,150,150,0.55)'); gr.addColorStop(1, 'rgba(60,60,60,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x + dx, y + dy, rad, 0, TAU); g.fill();
      }
    }
  }, false);
  return _bump;
}

// Pele de um dinossauro. A textura do corpo é espelhada: v = 0 e v = 1 são a linha das costas, v = 0.5 a barriga;
// u corre da ponta da cauda (0) ao focinho (1).
// o: { back, flank, belly, seed, stripe: { color, n, u0, u1, reach, width, alpha }, blotch: { dark, light, n }, rough, bump }
export function makeSkin(o) {
  const r = mulberry32(o.seed || 7);
  const W = 2048, H = 512;
  const body = canvasTex(W, H, g => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    const st = o.stops || [[0, 'back'], [0.12, 'back'], [0.26, 'flank'], [0.37, 'flank'], [0.455, 'belly'], [0.5, 'belly']];
    for (const [v, k] of st) { grad.addColorStop(v, o[k]); if (v < 0.5) grad.addColorStop(1 - v, o[k]); }
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    // manchas largas, claras e escuras
    const bl = o.blotch || {}, nB = bl.n ?? 240;
    for (let i = 0; i < nB; i++) {
      const x = r() * W, y = r() * H, rx = 18 + r() * 80, ry = 7 + r() * 26;
      g.fillStyle = rgba(r() < 0.55 ? (bl.dark || shade(o.back, -0.06)) : (bl.light || shade(o.flank, 0.1)), 0.05 + r() * 0.1);
      g.beginPath(); g.ellipse(x, y, rx, ry, (r() - 0.5) * 0.6, 0, TAU); g.fill();
    }
    // listras que descem do dorso
    if (o.stripe) {
      const s = o.stripe; g.save(); g.filter = `blur(${s.blur ?? 5}px)`;
      for (let k = 0; k < s.n; k++) {
        const u = lerp(s.u0 ?? 0.1, s.u1 ?? 0.9, (k + 0.5 + (r() - 0.5) * 0.5) / s.n), reach = (s.reach ?? 0.32) * (0.75 + r() * 0.5) * H;
        const wid = (s.width ?? 20) * (0.7 + r() * 0.6), ph = r() * TAU, lean = (r() - 0.5) * 40;
        for (const mir of [0, 1]) {
          g.fillStyle = rgba(s.color, s.alpha ?? 0.6); g.beginPath();
          const pts = [];
          for (let y = -10; y <= reach; y += 8) { const t = clamp(y / reach); pts.push([u * W + lean * t + 9 * Math.sin(y * 0.045 + ph), y, wid * Math.pow(1 - t, 0.6)]); }
          pts.forEach(([x, y, hw], i) => { const yy = mir ? H - y : y; i ? g.lineTo(x - hw, yy) : g.moveTo(x - hw, yy); });
          for (let i = pts.length - 1; i >= 0; i--) { const [x, y, hw] = pts[i]; g.lineTo(x + hw, mir ? H - y : y); }
          g.closePath(); g.fill();
        }
      }
      g.restore();
    }
    // pontilhado fino (escamas vistas de longe)
    for (let i = 0; i < 16000; i++) {
      g.fillStyle = r() < 0.6 ? `rgba(0,0,0,${0.04 + r() * 0.1})` : `rgba(255,240,215,${0.03 + r() * 0.07})`;
      g.beginPath(); g.arc(r() * W, r() * H, 0.8 + r() * 2.2, 0, TAU); g.fill();
    }
    // rugas: riscos finos e escuros atravessando o corpo (dobras de pele)
    const nW = o.wrinkles ?? 260;
    for (let i = 0; i < nW; i++) {
      const x = r() * W, y = r() * H, len = 14 + r() * 46;
      g.strokeStyle = `rgba(0,0,0,${0.05 + r() * 0.1})`; g.lineWidth = 0.8 + r() * 1.6;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 10, y + len / 2, x + (r() - 0.5) * 8, y + len); g.stroke();
    }
    if (o.paint) o.paint(g, W, H, r);
  });
  const limb = canvasTex(512, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, o.limbTop || o.flank); grad.addColorStop(0.55, o.flank); grad.addColorStop(1, o.limbEnd || shade(o.flank, -0.03));
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    if (o.stripe && o.stripe.limb !== false) {
      g.save(); g.filter = 'blur(4px)'; g.fillStyle = rgba(o.stripe.color, (o.stripe.alpha ?? 0.6) * 0.8);
      const n = o.stripe.limbN ?? 5; for (let k = 0; k < n; k++) { const x = (k + 0.5 + (r() - 0.5) * 0.4) / n * w; g.fillRect(x - 9, 0, 18 * (0.6 + r() * 0.7), h); }
      g.restore();
    }
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = r() < 0.6 ? `rgba(0,0,0,${0.04 + r() * 0.1})` : `rgba(255,240,215,${0.03 + r() * 0.07})`;
      g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 2.4, 0, TAU); g.fill();
    }
  });
  const mk = (map, rx, ry) => {
    const b = bumpTex().clone(); b.repeat.set(rx, ry); b.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map, bumpMap: b, bumpScale: o.bump ?? 5, roughness: o.rough ?? 0.72, metalness: 0 });
  };
  return {
    body: mk(body, o.bumpRep?.[0] ?? 16, o.bumpRep?.[1] ?? 4), limb: mk(limb, 6, 3), o,
    flat: (hex, rough = 0.7) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough }),
  };
}

// ---------------------------------------------------------------- olho de adesivo
// Disco branco com aro escuro, pupila preta solta e uma cúpula de plástico. Fica virado para +z.
// setPupil(dx, dy) recebe a posição da pupila dentro do olho (-1..1).
const M_EYE = {
  white: new THREE.MeshStandardMaterial({ color: '#fdfdf9', roughness: 0.35, emissive: '#ffffff', emissiveIntensity: 0.16 }),
  rim: new THREE.MeshStandardMaterial({ color: '#16161a', roughness: 0.4 }),
  pupil: new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.85 }),
  dome: new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false }),
  glint: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
};
export function googly(r = 0.25, pupilK = 0.52) {
  const g = new THREE.Group();
  const white = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.16, 40), M_EYE.white); white.rotation.x = PI / 2; g.add(white);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.085, 10, 48), M_EYE.rim); rim.position.z = r * 0.03; g.add(rim);
  const pupil = new THREE.Mesh(new THREE.CylinderGeometry(r * pupilK, r * pupilK, r * 0.07, 32), M_EYE.pupil); pupil.rotation.x = PI / 2; pupil.position.z = r * 0.12; g.add(pupil);
  const glint = new THREE.Mesh(new THREE.CircleGeometry(r * 0.11, 16), M_EYE.glint); glint.position.set(-r * 0.16, r * 0.17, r * 0.045); pupil.add(glint); glint.rotation.x = -PI / 2;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r * 0.98, 32, 12, 0, TAU, 0, PI / 2), M_EYE.dome); dome.rotation.x = PI / 2; dome.scale.set(1, 0.42, 1); dome.position.z = r * 0.06; dome.castShadow = false; g.add(dome);
  const k = r * (1 - pupilK) * 0.86;
  g.userData.setPupil = (dx, dy) => { const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } pupil.position.x = dx * k; pupil.position.y = dy * k; };
  g.userData.setPupil(0, -0.6);
  return g;
}
// balanço da pupila: pende para baixo (gravidade) e chacoalha conforme a "energia" do movimento (0 = parado, 1 = rugido)
export function eyeJiggle(t, seed, energy) {
  const a = 0.25 + 0.75 * energy, s = seed * 1.7;
  return [a * (0.62 * cyc(t, 3, s) + 0.38 * cyc(t, 7, s * 2.3)), -0.5 * (1 - 0.6 * energy) + a * (0.55 * cyc(t, 4, s + 0.3) + 0.4 * cyc(t, 9, s * 1.3))];
}

// ---------------------------------------------------------------- peças pequenas
// cone com a base na origem apontando para -y (dente de cima, garra)
export function spike(len, rad, mat, seg = 8) {
  const g = new THREE.ConeGeometry(rad, len, seg); g.rotateX(PI); g.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}
const _sph = new THREE.SphereGeometry(1, 20, 14);
export function blob(sx, sy, sz, mat) { const m = new THREE.Mesh(_sph, mat); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; return m; }

// pé de terópode: três dedos com garra para a frente e um esporão atrás. Origem na base dos dedos, +x para a frente.
export function clawFoot(skinMat, clawMat, { toe = 0.6, r = 0.13, spread = 0.5, claw = 0.26, hallux = true } = {}) {
  const g = new THREE.Group();
  [-spread, 0, spread].forEach((a, i) => {
    const t = new THREE.Group(); t.rotation.y = a; g.add(t);
    const L = toe * (i === 1 ? 1.12 : 0.92);
    const pad = blob(L * 0.55, r, r * 1.1, skinMat); pad.position.set(L * 0.48, 0, 0); t.add(pad);
    const c = spike(claw, r * 0.72, clawMat); c.rotation.z = PI / 2 - 0.35; c.position.set(L * 0.9, r * 0.25, 0); t.add(c);
  });
  if (hallux) { const c = spike(claw * 0.7, r * 0.55, clawMat); c.rotation.z = -PI / 2 + 0.5; c.position.set(-r * 0.6, r * 0.5, spread > 0 ? -r : 0); g.add(c); }
  return g;
}
// pé redondo de quadrúpede (tipo elefante) com unhas na frente. Origem no centro da sola.
export function roundFoot(skinMat, nailMat, { r = 0.3, h = 0.3, nails = 3 } = {}) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 1.08, h, 18), skinMat); base.position.y = h / 2; base.castShadow = true; g.add(base);
  for (let i = 0; i < nails; i++) {
    const a = (i - (nails - 1) / 2) * 0.62; const n = blob(r * 0.24, r * 0.3, r * 0.22, nailMat);
    n.position.set(Math.cos(a) * r * 1.02, h * 0.28, Math.sin(a) * r * 1.02); g.add(n);
  }
  return g;
}

// ---------------------------------------------------------------- cabeça com mandíbula
// spec: {
//   skull: [C(x, y, w, ht, hb, sq) ...]  crânio ao longo de +x, origem na nuca (onde o pescoço encaixa)
//   jaw:   [C(...)] mandíbula no espaço da dobradiça (origem = dobradiça, +x para a frente)
//   hinge: [x, y]   posição da dobradiça no espaço da cabeça
//   teethUp / teethLow: { x0, x1, n, len, rad, inset } (opcional)   frontUp: n de dentes na ponta do focinho
//   eye: { x, y, r, out, fwd, up, pupil }
//   mouth: cor do interior, tongue: cor da língua, u0: início da faixa de textura usada pela cabeça
// }
export function buildHead(spec, skin) {
  const g = new THREE.Group();
  const u0 = spec.u0 ?? 0.86;
  const skull = new Loft(spec.rings ?? 30, 22, skin.body, { u0, u1: 1 }); const sk = skull.setCtrl(spec.skull); g.add(skull.mesh);
  const jawG = new THREE.Group(); jawG.position.set(spec.hinge[0], spec.hinge[1], 0); g.add(jawG);
  const jaw = new Loft(26, 22, skin.body, { u0: u0 + 0.02, u1: 1 }); const jw = jaw.setCtrl(spec.jaw); jawG.add(jaw.mesh);
  const mMouth = new THREE.MeshStandardMaterial({ color: spec.mouth || '#6e2226', roughness: 0.55 });
  const mTongue = new THREE.MeshStandardMaterial({ color: spec.tongue || '#c0646a', roughness: 0.45 });
  const mTooth = new THREE.MeshStandardMaterial({ color: spec.tooth || '#efe5cc', roughness: 0.4 });
  // céu da boca: uma placa fina logo abaixo do crânio, da dobradiça para a frente
  const x0m = spec.hinge[0] + 0.05;
  const pal = new Loft(18, 14, mMouth);
  pal.setCtrl(spec.skull.filter(c => c.p.x >= x0m - 0.3).map(c => ({ p: V3(Math.max(c.p.x, x0m - 0.2), c.p.y - c.hb * 0.92, 0), w: c.w * 0.86, ht: 0.04, hb: Math.max(0.03, c.hb * 0.1), sq: 1 })));
  pal.mesh.castShadow = false; g.add(pal.mesh);
  // assoalho da boca e língua, presos na mandíbula
  const flo = new Loft(18, 14, mMouth);
  flo.setCtrl(spec.jaw.filter(c => c.p.x >= -0.05).map(c => ({ p: V3(c.p.x, c.p.y + c.ht * 0.9, 0), w: c.w * 0.84, ht: 0.04, hb: 0.03, sq: 1 })));
  flo.mesh.castShadow = false; jawG.add(flo.mesh);
  const jawLen = spec.jaw[spec.jaw.length - 1].p.x;
  if (spec.tongue !== false) {
    const tg = new Loft(14, 12, mTongue);
    const jm = atX(jw, jawLen * 0.5);
    tg.setCtrl([C(jawLen * 0.12, jm.p.y + jm.ht + 0.02, 0.03, 0.02), C(jawLen * 0.3, jm.p.y + jm.ht + 0.05, jm.w * 0.5, 0.07, 0.03), C(jawLen * 0.6, jm.p.y + jm.ht + 0.06, jm.w * 0.46, 0.07, 0.03), C(jawLen * 0.8, jm.p.y + jm.ht + 0.05, jm.w * 0.3, 0.05, 0.02), C(jawLen * 0.88, jm.p.y + jm.ht + 0.04, 0.02, 0.02)]);
    tg.mesh.castShadow = false; jawG.add(tg.mesh);
  }
  // dentes
  const rT = mulberry32(spec.seed || 3);
  const row = (def, samples, parent, up) => {
    if (!def) return;
    for (let k = 0; k < def.n; k++) for (const s of [-1, 1]) {
      const f = def.n > 1 ? k / (def.n - 1) : 0.5, x = lerp(def.x0, def.x1, f), a = atX(samples, x);
      const len = def.len * (0.62 + 0.5 * Math.sin(PI * (0.15 + 0.8 * f))) * (0.82 + rT() * 0.36);
      const t = spike(len, (def.rad ?? def.len * 0.24), mTooth, 7);
      const z = a.w * (def.inset ?? 0.84);
      if (up) { t.position.set(x, a.p.y - a.hb * 0.55, s * z); t.rotation.set(-s * 0.1, 0, (rT() - 0.5) * 0.2); }
      else { t.position.set(x, a.p.y + a.ht * 0.4, s * z); t.rotation.set(PI + s * 0.1, 0, (rT() - 0.5) * 0.2); }
      parent.add(t);
    }
  };
  row(spec.teethUp, sk, g, true); row(spec.teethLow, jw, jawG, false);
  // olhos de adesivo, um de cada lado
  const eyes = [];
  if (spec.eye) {
    const e = spec.eye, a = atX(sk, e.x), yy = clamp((e.y - a.p.y) / a.ht, -0.95, 0.95), zs = a.w * Math.sqrt(1 - yy * yy) + (e.out ?? 0);
    for (const s of [1, -1]) {
      const eye = googly(e.r, e.pupil ?? 0.52);
      eye.position.set(e.x, e.y, s * zs);
      eye.rotation.order = 'YXZ';
      eye.rotation.y = s > 0 ? (e.fwd ?? 0.25) : PI - (e.fwd ?? 0.25);
      eye.rotation.x = -(e.up ?? 0.1);
      g.add(eye); eyes.push(eye);
    }
  }
  return { group: g, jaw: jawG, eyes, skull, sk, jw, setJaw: a => { jawG.rotation.z = -a; } };
}

// liga sombra em tudo o que for malha dentro de um grupo
export function shadows(group) { group.traverse(o => { if (o.isMesh && o.material && !o.material.transparent) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } }); return group; }
