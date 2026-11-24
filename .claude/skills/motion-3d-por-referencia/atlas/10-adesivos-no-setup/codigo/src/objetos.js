// objetos.js — a caixa de papelão e os três equipamentos, todos procedurais (sem modelo 3D de arquivo).
// Escala: 1 unidade = 10 cm.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mulberry32 } from './adesivos.js';

const PI = Math.PI;
let ANISO = 8;
export const setAniso = n => { ANISO = n; };

function tex(c, { repeat = false, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = ANISO;
  return t;
}
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
const shadow = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const anchor = (parent, pos, rot) => { const a = new THREE.Group(); a.position.set(...pos); a.rotation.set(...rot); parent.add(a); return a; };

// ------------------------------------------------------------------ adesivo (um plano com a arte)
const stickerGeo = new THREE.PlaneGeometry(1, 1);
const stickerMats = new Map();
export function stickerMesh(name, canvas) {
  if (!stickerMats.has(name)) {
    stickerMats.set(name, new THREE.MeshPhysicalMaterial({
      map: tex(canvas), transparent: true, depthWrite: false, roughness: 0.36, metalness: 0,
      clearcoat: 0.35, clearcoatRoughness: 0.35, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    }));
  }
  const m = new THREE.Mesh(stickerGeo, stickerMats.get(name));
  m.receiveShadow = true;
  return m;
}

// ------------------------------------------------------------------ papelão
const KRAFT_TILE = 1.6, EDGE_TILE = 0.2;
function kraftCanvas(base, seed, stripes) {
  const r = mulberry32(seed), [c, x] = cv(1024, 1024), S = 1024;
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {           // manchas largas, bem discretas
    const px = r() * S, py = r() * S, rad = 120 + r() * 260;
    const a = 0.045 * r(), col = r() < 0.5 ? `rgba(255,244,222,${a})` : `rgba(90,55,20,${a})`;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {      // repete nas bordas para a textura emendar
      const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, rad); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(px + ox - rad, py + oy - rad, rad * 2, rad * 2);
    }
  }
  for (let i = 0; i < 3400; i++) {         // fibras
    const a = r() * 0.085; x.strokeStyle = r() < 0.5 ? `rgba(255,242,218,${a})` : `rgba(80,48,16,${a})`; x.lineWidth = 0.6 + r() * 1.3;
    const px = r() * S, py = r() * S, len = 8 + r() * 52, ang = (r() - 0.5) * 0.7 + (r() < 0.5 ? 0 : PI / 2);
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len); x.stroke();
  }
  for (let i = 0; i < 52000; i++) { const a = r() * 0.07; x.fillStyle = r() < 0.5 ? `rgba(255,246,228,${a})` : `rgba(70,40,12,${a})`; x.fillRect(r() * S, r() * S, 1.4, 1.4); }
  for (let px = 0; px < S; px += 32) {     // ondas do miolo aparecendo na capa
    x.fillStyle = `rgba(70,42,14,${stripes})`; x.fillRect(px, 0, 9, S);
    x.fillStyle = `rgba(255,246,226,${stripes * 0.85})`; x.fillRect(px + 16, 0, 9, S);
  }
  return c;
}
function kraftBump(seed) {
  const r = mulberry32(seed), [c, x] = cv(1024, 1024), S = 1024;
  x.fillStyle = '#808080'; x.fillRect(0, 0, S, S);
  for (let px = 0; px < S; px += 32) {
    const g = x.createLinearGradient(px, 0, px + 32, 0);
    g.addColorStop(0, '#787878'); g.addColorStop(0.5, '#8a8a8a'); g.addColorStop(1, '#787878');
    x.fillStyle = g; x.fillRect(px, 0, 32, S);
  }
  for (let i = 0; i < 60000; i++) { const v = 118 + Math.floor(r() * 22); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(r() * S, r() * S, 1.6, 1.6); }
  return c;
}
function edgeCanvas(vertical) {
  const [c, x] = cv(vertical ? 32 : 256, vertical ? 256 : 32);
  if (vertical) { x.translate(32, 0); x.rotate(PI / 2); }
  x.fillStyle = '#7d5a34'; x.fillRect(0, 0, 256, 32);
  x.fillStyle = '#d9bc92'; x.fillRect(0, 0, 256, 6); x.fillRect(0, 26, 256, 6);
  x.strokeStyle = '#c9a877'; x.lineWidth = 5; x.beginPath();
  for (let i = 0; i <= 256; i += 2) { const y = 16 + Math.sin(i / 64 * PI * 2) * 9; i ? x.lineTo(i, y) : x.moveTo(i, y); }
  x.stroke();
  return c;
}
function boxMaterials() {
  const bump = tex(kraftBump(5), { repeat: true, srgb: false });
  const mk = (base, seed, stripes) => new THREE.MeshStandardMaterial({ map: tex(kraftCanvas(base, seed, stripes), { repeat: true }), bumpMap: bump, bumpScale: 1.1, roughness: 0.93, metalness: 0 });
  return {
    kraft: mk('#d2b287', 3, 0.028), kraftIn: mk('#a88158', 4, 0.05),
    edgeU: new THREE.MeshStandardMaterial({ map: tex(edgeCanvas(false), { repeat: true }), roughness: 0.95 }),
    edgeV: new THREE.MeshStandardMaterial({ map: tex(edgeCanvas(true), { repeat: true }), roughness: 0.95 }),
  };
}
// uma chapa de papelão: `roles` diz o que cada face é, na ordem [+x, -x, +y, -y, +z, -z]
function panel(w, h, d, roles, M, rnd) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, mats = [];
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [du, dv] = dims[f], role = roles[f];
    let su, sv, ou = rnd(), ov = rnd(), m;
    if (role === 'edge') {
      if (du >= dv) { su = du / EDGE_TILE; sv = 1; ov = 0; m = M.edgeU; } else { su = 1; sv = dv / EDGE_TILE; ou = 0; m = M.edgeV; }
    } else { su = du / KRAFT_TILE; sv = dv / KRAFT_TILE; m = role === 'in' ? M.kraftIn : M.kraft; }
    for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * su + ou, uv.getY(k) * sv + ov); }
    mats.push(m);
  }
  return shadow(new THREE.Mesh(g, mats));
}
function tapeBump() {
  const r = mulberry32(21), [c, x] = cv(512, 512);
  x.fillStyle = '#808080'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {           // vincos diagonais do plástico
    const px = r() * 512, py = r() * 512, len = 60 + r() * 260, ang = (r() - 0.5) * 1.5, v = r() < 0.5 ? 40 : 215;
    x.strokeStyle = `rgba(${v},${v},${v},${0.16 + r() * 0.34})`; x.lineWidth = 2 + r() * 10;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len); x.stroke();
  }
  x.filter = 'blur(3px)'; x.drawImage(c, 0, 0); x.filter = 'none';
  return c;
}

export function buildBox() {
  const W = 4.4, H = 2.7, D = 3.6, th = 0.05, rnd = mulberry32(11), M = boxMaterials();
  const g = new THREE.Group();
  const put = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
  put(panel(W, H, th, ['out', 'out', 'out', 'out', 'out', 'in'], M, rnd), 0, 0, D / 2 - th / 2);
  put(panel(W, H, th, ['out', 'out', 'out', 'out', 'in', 'out'], M, rnd), 0, 0, -D / 2 + th / 2);
  put(panel(th, H, D - 2 * th, ['in', 'out', 'out', 'out', 'out', 'out'], M, rnd), -W / 2 + th / 2, 0, 0);
  put(panel(th, H, D - 2 * th, ['out', 'in', 'out', 'out', 'out', 'out'], M, rnd), W / 2 - th / 2, 0, 0);
  put(panel(W - 2 * th, th, D - 2 * th, ['out', 'out', 'in', 'out', 'out', 'out'], M, rnd), 0, -H / 2 + th / 2, 0);

  // abas: cada uma num grupo com o pivô na dobra
  const flap = (w, d, pos, off, roles) => { const hg = new THREE.Group(); hg.position.set(...pos); const m = panel(w, th, d, roles, M, rnd); m.position.set(...off); hg.add(m); g.add(hg); return hg; };
  const fd = D / 2 - 0.012, md = 1.55, ml = D - 2 * th - 0.03;
  const front = flap(W, fd, [0, H / 2 + th / 2, D / 2], [0, 0, -fd / 2], ['edge', 'edge', 'out', 'in', 'out', 'edge']);
  const back = flap(W, fd, [0, H / 2 + th / 2, -D / 2], [0, 0, fd / 2], ['edge', 'edge', 'out', 'in', 'edge', 'out']);
  const left = flap(md, ml, [-W / 2 + th, H / 2 - th / 2, 0], [md / 2, 0, 0], ['edge', 'out', 'out', 'in', 'edge', 'edge']);
  const right = flap(md, ml, [W / 2 - th, H / 2 - th / 2, 0], [-md / 2, 0, 0], ['out', 'edge', 'out', 'in', 'edge', 'edge']);
  // a = ângulo das abas maiores, b = das menores (0 = fechada; 2,2 rad = bem aberta)
  const setFlaps = (a, b = a) => { front.rotation.x = a; back.rotation.x = -a; left.rotation.z = b; right.rotation.z = -b; };

  // fita azul: uma tira no topo e duas caudas descendo as laterais
  const tapeMat = new THREE.MeshPhysicalMaterial({ color: '#6f86e4', roughness: 0.2, metalness: 0.0, specularIntensity: 1.0, bumpMap: tex(tapeBump(), { repeat: true, srgb: false }), bumpScale: 9 });
  const tw = 0.6, tt = 0.007, tail = 1.02, yTop = H / 2 + th;
  const strip = (w, h, d, su, sv) => { const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return shadow(new THREE.Mesh(geo, tapeMat)); };
  const tape = new THREE.Group(); g.add(tape);
  const topP = new THREE.Group(); topP.position.set(W / 2 + tt, yTop + tt / 2, 0); tape.add(topP);
  const top = strip(W + 2 * tt, tt, tw, 5, 0.7); top.position.x = -(W + 2 * tt) / 2; topP.add(top);
  const lP = new THREE.Group(); lP.position.set(-W / 2 - tt / 2, yTop, 0); tape.add(lP);
  const lT = strip(tt, tail, tw, 0.7, 1.2); lT.position.y = -tail / 2; lP.add(lT);
  const rP = new THREE.Group(); rP.position.set(W / 2 + tt / 2, yTop - tail, 0); tape.add(rP);
  const rT = strip(tt, tail, tw, 0.7, 1.2); rT.position.y = tail / 2; rP.add(rT);
  // k = 1 fita inteira; k = 0 fita arrancada (puxada pela direita)
  const setTape = k => {
    const p = 1 - k, a = 1 - Math.min(1, p / 0.2), b = 1 - Math.min(1, Math.max(0, (p - 0.2) / 0.55)), c = 1 - Math.min(1, Math.max(0, (p - 0.75) / 0.25));
    lP.visible = a > 0.002; lP.scale.y = Math.max(a, 0.002); topP.visible = b > 0.002; topP.scale.x = Math.max(b, 0.002); rP.visible = c > 0.002; rP.scale.y = Math.max(c, 0.002);
  };

  // âncoras dos adesivos: x = direita, y = cima, z = para fora da face
  const A = {
    front: anchor(g, [0, 0, D / 2], [0, 0, 0]), back: anchor(g, [0, 0, -D / 2], [0, PI, 0]),
    right: anchor(g, [W / 2, 0, 0], [0, PI / 2, 0]), left: anchor(g, [-W / 2, 0, 0], [0, -PI / 2, 0]),
    topFront: anchor(front, [0, th / 2, -D / 2], [-PI / 2, 0, 0]),   // origem no centro do tampo; v = -z
    topBack: anchor(back, [0, th / 2, D / 2], [-PI / 2, 0, 0]),
  };
  setFlaps(0); setTape(1);
  return { group: g, W, H, D, th, A, setFlaps, setTape };
}

// ------------------------------------------------------------------ headset
function noiseBump(seed, size = 256, grainSize = 2.2) {
  const r = mulberry32(seed), [c, x] = cv(size, size);
  x.fillStyle = '#808080'; x.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size / 3; i++) { const v = 96 + Math.floor(r() * 64); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(r() * size, r() * size, grainSize, grainSize); }
  return c;
}
export function buildHeadset() {
  const root = new THREE.Group(), g = new THREE.Group(); g.position.y = -0.5; root.add(g);
  const coral = new THREE.MeshPhysicalMaterial({ color: '#ff5a34', roughness: 0.44, clearcoat: 0.45, clearcoatRoughness: 0.28 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1b1b1f', roughness: 0.48 });
  const leather = new THREE.MeshStandardMaterial({ color: '#1d1d21', roughness: 0.6, bumpMap: tex(noiseBump(31), { repeat: true, srgb: false }), bumpScale: 0.6 });
  leather.bumpMap.repeat.set(6, 3);
  const cloth = new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.95 });
  const metal = new THREE.MeshStandardMaterial({ color: '#d4d7dc', metalness: 1, roughness: 0.24 });
  const padMat = new THREE.MeshStandardMaterial({ color: '#f1e9d8', roughness: 0.8, bumpMap: tex(noiseBump(33), { repeat: true, srgb: false }), bumpScale: 0.4 });
  padMat.bumpMap.repeat.set(8, 2);

  const R = 0.53, RF = 0.43, A0 = 0.13, A = 0.38, CX = 0.85, OV = 1.12;
  const pts = [new THREE.Vector2(0.44, -0.035), new THREE.Vector2(0.495, 0), new THREE.Vector2(0.522, 0.06)];
  for (let i = 0; i <= 16; i++) { const a = i / 16 * PI / 2; pts.push(new THREE.Vector2(RF + (R - RF) * Math.cos(a), A0 + (A - A0) * Math.sin(a))); }
  pts.push(new THREE.Vector2(0, A));
  const shellGeo = new THREE.LatheGeometry(pts, 96); shellGeo.rotateZ(-PI / 2);            // o eixo vira +x (face externa)
  const cushGeo = new THREE.TorusGeometry(0.385, 0.135, 22, 80); cushGeo.rotateY(PI / 2);
  const ringGeo = new THREE.TorusGeometry(RF + 0.004, 0.011, 8, 80); ringGeo.rotateY(PI / 2);
  const clothGeo = new THREE.CircleGeometry(0.33, 48); clothGeo.rotateY(-PI / 2);
  const yokeGeo = new THREE.TorusGeometry(0.568, 0.028, 10, 56, PI); yokeGeo.rotateY(PI / 2);
  const pinGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20); pinGeo.rotateX(PI / 2);

  const cups = [];
  for (const side of [1, -1]) {
    const cup = new THREE.Group(); cup.position.x = side * CX; if (side < 0) cup.rotation.y = PI; g.add(cup);
    const shell = shadow(new THREE.Mesh(shellGeo, coral)); shell.scale.set(1, OV, 1); cup.add(shell);
    const cush = shadow(new THREE.Mesh(cushGeo, leather)); cush.scale.set(0.86, OV, 1); cush.position.x = -0.085; cup.add(cush);
    const ring = new THREE.Mesh(ringGeo, dark); ring.scale.set(1, OV, 1); ring.position.x = A - 0.002; cup.add(ring);
    const cl = new THREE.Mesh(clothGeo, cloth); cl.scale.set(1, OV, 1); cl.position.x = -0.07; cup.add(cl);
    const yoke = shadow(new THREE.Mesh(yokeGeo, dark)); yoke.scale.set(2.4, OV, 1); yoke.position.x = 0.17; cup.add(yoke);
    for (const z of [0.6, -0.6]) { const p = shadow(new THREE.Mesh(pinGeo, metal)); p.position.set(0.17, 0, z); cup.add(p); }
    const slider = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.34, 0.17, 3, 0.02), metal)); slider.position.set(0.17, 0.79, 0); cup.add(slider);
    cups.push(cup);
  }
  // arco
  const cY = 0.5375, rho = 1.0825, a0 = Math.atan2(0.9 - cY, CX + 0.17);
  const bandGeo = new THREE.TorusGeometry(rho, 0.056, 16, 96, PI - 2 * a0); bandGeo.rotateZ(a0);
  const band = shadow(new THREE.Mesh(bandGeo, coral)); band.scale.z = 3.3; band.position.y = cY; g.add(band);
  const padGeo = new THREE.TorusGeometry(rho - 0.062, 0.05, 14, 72, PI * 0.56); padGeo.rotateZ(PI * 0.22);
  const pad = shadow(new THREE.Mesh(padGeo, padMat)); pad.scale.z = 2.9; pad.position.y = cY; g.add(pad);
  // microfone (concha esquerda)
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.0, -0.26, 0.36), new THREE.Vector3(-0.98, -0.5, 0.72), new THREE.Vector3(-0.8, -0.7, 1.08), new THREE.Vector3(-0.5, -0.74, 1.3)]);
  g.add(shadow(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.024, 10), dark)));
  const foam = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), cloth)); foam.scale.set(1.25, 0.95, 0.95); foam.position.set(-0.42, -0.74, 1.34); g.add(foam);
  const hub = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), dark)); hub.position.set(-1.0, -0.26, 0.36); g.add(hub);

  const A_ = anchor(cups[0], [A + 0.0008, 0, 0], [0, PI / 2, 0]);     // face externa da concha direita
  return { group: root, A: A_ };
}

// ------------------------------------------------------------------ notebook
function roundedRect(w, d, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -PI / 2, 0, false);
  s.lineTo(x + w, y + d - r); s.absarc(x + w - r, y + d - r, r, 0, PI / 2, false);
  s.lineTo(x + r, y + d); s.absarc(x + r, y + d - r, r, PI / 2, PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, PI, PI * 1.5, false);
  return s;
}
function slab(w, d, t, r, bevel = 0.012) {
  const geo = new THREE.ExtrudeGeometry(roundedRect(w - 2 * bevel, d - 2 * bevel, r - bevel), { depth: t - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 18 });
  geo.rotateX(-PI / 2); geo.translate(0, bevel, 0);   // y de 0 a t
  return geo;
}
function screenCanvas() {
  const r = mulberry32(51), [c, x] = cv(1600, 1000);
  x.fillStyle = '#0d1424'; x.fillRect(0, 0, 1600, 1000);
  x.fillStyle = '#141d33'; x.fillRect(0, 0, 1600, 58); x.fillRect(0, 58, 250, 942);
  for (const [i, col] of ['#ff5a34', '#f6c92b', '#3ecf8e'].entries()) { x.fillStyle = col; x.beginPath(); x.arc(34 + i * 30, 29, 9, 0, PI * 2); x.fill(); }
  x.fillStyle = '#22304f'; x.beginPath(); x.roundRect(560, 16, 480, 26, 13); x.fill();
  for (let i = 0; i < 12; i++) { x.fillStyle = i === 3 ? '#2f6fe0' : '#26334f'; x.beginPath(); x.roundRect(28 + (i % 3 ? 22 : 0), 96 + i * 44, 110 + r() * 80, 14, 7); x.fill(); }
  const cols = ['#6ea8ff', '#f1f6cc', '#ff7a59', '#f6c92b', '#8f7cf0', '#4b5d82'];
  for (let i = 0; i < 19; i++) {       // linhas de código "greeked": só barras, sem texto legível
    let px = 300 + (i % 5 === 0 ? 0 : (i % 3) * 38 + 38); const y = 104 + i * 44, n = 2 + Math.floor(r() * 4);
    x.fillStyle = '#2a3859'; x.fillRect(270, y - 4, 10, 22);
    for (let k = 0; k < n; k++) { const w = 46 + r() * 150; x.fillStyle = cols[Math.floor(r() * cols.length)]; x.beginPath(); x.roundRect(px, y, w, 14, 7); x.fill(); px += w + 16; }
  }
  // painel de prévia à direita
  x.fillStyle = '#1456ab'; x.beginPath(); x.roundRect(1010, 96, 546, 860, 22); x.fill();
  x.fillStyle = '#f1f6cc'; x.beginPath(); x.roundRect(1058, 150, 300, 40, 12); x.fill(); x.beginPath(); x.roundRect(1058, 208, 420, 40, 12); x.fill();
  x.fillStyle = '#6ea8ff'; x.beginPath(); x.roundRect(1058, 286, 450, 14, 7); x.fill(); x.beginPath(); x.roundRect(1058, 316, 380, 14, 7); x.fill();
  x.fillStyle = '#f6c92b'; x.beginPath(); x.roundRect(1058, 372, 190, 58, 29); x.fill();
  x.fillStyle = '#ff5a34'; x.beginPath(); x.arc(1420, 700, 96, 0, PI * 2); x.fill();
  x.fillStyle = '#d2b287'; x.beginPath(); x.roundRect(1070, 560, 250, 300, 16); x.fill();
  x.fillStyle = '#6c83e0'; x.fillRect(1070, 690, 250, 44);
  return c;
}
export function buildNotebook() {
  const W = 3.1, D = 2.15, tb = 0.085, tl = 0.06, g = new THREE.Group();
  const alu = new THREE.MeshPhysicalMaterial({ color: '#d9dce2', metalness: 0.92, roughness: 0.4, bumpMap: tex(noiseBump(41, 256, 1.3), { repeat: true, srgb: false }), bumpScale: 0.12 });
  alu.bumpMap.repeat.set(10, 10);
  const black = new THREE.MeshStandardMaterial({ color: '#111114', roughness: 0.35 });
  const keyMat = new THREE.MeshStandardMaterial({ color: '#202125', roughness: 0.62 });
  g.add(shadow(new THREE.Mesh(slab(W, D, tb, 0.14), alu)));
  const well = new THREE.Mesh(new THREE.PlaneGeometry(2.76, 1.02), new THREE.MeshStandardMaterial({ color: '#17181b', roughness: 0.9 })); well.rotation.x = -PI / 2; well.position.set(0, tb + 0.0006, -0.4); well.receiveShadow = true; g.add(well);
  const P = 0.19, kGeo = new RoundedBoxGeometry(0.168, 0.02, 0.168, 2, 0.008);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) {
    if (r === 4 && c >= 4 && c <= 8) { if (c !== 6) continue; const sp = shadow(new THREE.Mesh(new RoundedBoxGeometry(P * 4 + 0.168, 0.02, 0.168, 2, 0.008), keyMat)); sp.position.set(0, tb + 0.002, -0.4 + 2 * P); g.add(sp); continue; }
    const k = shadow(new THREE.Mesh(kGeo, keyMat)); k.position.set((c - 6.5) * P, tb + 0.002, -0.4 + (r - 2) * P); g.add(k);
  }
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.66), new THREE.MeshPhysicalMaterial({ color: '#c9ccd3', metalness: 0.9, roughness: 0.28 })); pad.rotation.x = -PI / 2; pad.position.set(0, tb + 0.0006, 0.66); pad.receiveShadow = true; g.add(pad);
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, W * 0.72, 16), black); hinge.rotation.z = PI / 2; hinge.position.set(0, tb + 0.01, -D / 2 + 0.035); g.add(hinge);

  const zc = D / 2 - 0.03, lid = new THREE.Group(); lid.position.set(0, tb + 0.012, -D / 2 + 0.03); g.add(lid);
  const lidMesh = shadow(new THREE.Mesh(slab(W, D, tl, 0.14), alu)); lidMesh.position.z = zc; lid.add(lidMesh);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.05, D - 0.05), black); inner.rotation.x = PI / 2; inner.position.set(0, -0.0006, zc); lid.add(inner);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, D - 0.26), new THREE.MeshBasicMaterial({ map: tex(screenCanvas()), toneMapped: false })); scr.rotation.x = PI / 2; scr.position.set(0, -0.0014, zc + 0.02); lid.add(scr);
  const A = anchor(lid, [0, tl + 0.0006, zc], [-PI / 2, 0, PI]);       // tampa por fora: y da âncora aponta para a borda livre
  const setOpen = a => { lid.rotation.x = -a; };
  setOpen(0);
  return { group: g, W, D, A, lid, setOpen };
}

// ------------------------------------------------------------------ teclado (ABNT2, com Ç)
const ROWS = [
  [['esc', 1, 'acc'], ...'1234567890-='.split('').map(k => [k, 1]), ['bksp', 2, 'mod']],
  [['tab', 1.5, 'mod'], ...'QWERTYUIOP'.split('').map(k => [k, 1]), ['´', 1], ['[', 1], ['enter', 1.5, 'ent']],
  [['caps', 1.75, 'mod'], ...'ASDFGHJKLÇ'.split('').map(k => [k, 1]), ['~', 1], [']', 1], ['', 1.25, 'ent']],
  [['shift', 2.25, 'mod'], ...'ZXCVBNM,.;'.split('').map(k => [k, 1]), ['shift', 2.75, 'mod']],
  [['ctrl', 1.25, 'mod'], ['os', 1.25, 'mod'], ['alt', 1.25, 'mod'], ['', 6.25], ['alt', 1.25, 'mod'], ['fn', 1.25, 'mod'], ['menu', 1.25, 'mod'], ['ctrl', 1.25, 'mod']],
];
const KEYCOL = { undefined: ['#f4efe4', '#2a2927'], mod: ['#8b96a5', '#ffffff'], acc: ['#ff5a34', '#ffffff'], ent: ['#f6c92b', '#2a2927'] };
function legendCanvas(label, wu, kind) {
  const [bg, fg] = KEYCOL[kind], [c, x] = cv(Math.round(128 * wu), 128);
  x.fillStyle = bg; x.fillRect(0, 0, c.width, 128); x.fillStyle = fg; x.strokeStyle = fg; x.lineCap = 'round'; x.lineJoin = 'round';
  if (label === 'bksp') { x.lineWidth = 8; x.beginPath(); x.moveTo(150, 64); x.lineTo(70, 64); x.moveTo(96, 42); x.lineTo(70, 64); x.lineTo(96, 86); x.stroke(); }
  else if (label === 'os') { x.beginPath(); x.moveTo(40, 40); x.lineTo(58, 22); x.lineTo(76, 40); x.lineTo(58, 58); x.closePath(); x.fill(); }
  else if (label === 'menu') { for (const y of [28, 40, 52]) x.fillRect(26, y, 34, 6); }
  else if (label.length > 1) { x.font = '700 30px Archivo'; x.textBaseline = 'alphabetic'; x.fillText(label, 20, 48); }
  else if (label) { x.font = '700 62px Archivo'; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText(label, c.width / 2, 86); }
  return c;
}
function capGeo(w, h, d, inset) {
  const geo = new RoundedBoxGeometry(w, h, d, 3, 0.017), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const f = (p.getY(i) + h / 2) / h; p.setX(i, p.getX(i) * (1 - f * 2 * inset / w)); p.setZ(i, p.getZ(i) * (1 - f * 2 * inset / d)); }
  geo.computeVertexNormals();
  return geo;
}
export function buildKeyboard() {
  const U = 0.19, W = 15 * U + 0.28, bez = 0.3, D = 5 * U + bez + 0.2, Hc = 0.22, capH = 0.09, gap = 0.024, inset = 0.022;
  const g = new THREE.Group();
  const caseMat = new THREE.MeshPhysicalMaterial({ color: '#efe6d3', roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.4 });
  g.add(shadow(new THREE.Mesh(new RoundedBoxGeometry(W, Hc, D, 5, 0.07), caseMat)));
  const zk = -D / 2 + 0.08 + bez, plate = shadow(new THREE.Mesh(new THREE.BoxGeometry(15 * U + 0.07, 0.03, 5 * U + 0.07), new THREE.MeshStandardMaterial({ color: '#2a2b30', roughness: 0.7 })));
  plate.position.set(0, Hc / 2 + 0.006, zk + 2.5 * U); g.add(plate);
  const geos = new Map(), mats = new Map(), keys = [];
  ROWS.forEach((row, r) => {
    let x = -7.5 * U;
    row.forEach(([label, wu, kind], ci) => {
      const w = wu * U - gap, d = U - gap;
      if (!geos.has(wu)) geos.set(wu, capGeo(w, capH, d, inset));
      if (!mats.has(kind)) mats.set(kind, new THREE.MeshStandardMaterial({ color: KEYCOL[kind][0], roughness: 0.58 }));
      const k = shadow(new THREE.Mesh(geos.get(wu), mats.get(kind)));
      const y0 = Hc / 2 + 0.021 + capH / 2;
      k.position.set(x + wu * U / 2, y0, zk + (r + 0.5) * U); g.add(k);
      if (label) {
        const top = new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * inset - 0.02, d - 2 * inset - 0.02), new THREE.MeshStandardMaterial({ map: tex(legendCanvas(label, wu, kind)), roughness: 0.58 }));
        top.rotation.x = -PI / 2; top.position.y = capH / 2 + 0.0006; top.receiveShadow = true; k.add(top);
      }
      keys.push({ mesh: k, y0, x: k.position.x, z: k.position.z, r, ci });
      x += wu * U;
    });
  });
  const knob = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.094, 0.1, 40), new THREE.MeshPhysicalMaterial({ color: '#ff5a34', roughness: 0.4, clearcoat: 0.4 }))); knob.position.set(W / 2 - 0.26, Hc / 2 + 0.05, -D / 2 + 0.06 + bez / 2); g.add(knob);
  const A = anchor(g, [0, Hc / 2 + 0.0008, -D / 2 + 0.06 + bez / 2], [-PI / 2, 0, 0]);
  const press = (key, k) => { key.mesh.position.y = key.y0 - 0.045 * k; };
  return { group: g, W, D, U, A, keys, press };
}
