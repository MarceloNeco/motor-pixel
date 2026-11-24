// Kombi na praia — a kombi food truck quica pela estrada de morros e chega à praia.
// Plano único, 16 s, 1920×1080. Tudo é função do tempo: renderAt(t) recalcula a cena inteira.
import * as THREE from 'three';
import { PI, TAU, D2R, clamp, lerp, smooth, rng, track, fbm2, groundH, pathZ, pathDz, pathDDz, shoreDist, shoreZ, SHK, X_START } from './geo.js';
import { runSim, DURATION, WB, WR, T_STOP, X_STOP, aAt } from './sim.js';
import { makeKombi } from './kombi.js';
import { FOG, SUN_DIR, makeTerrain, makeSea, makeSky, skyMaterial, makeMountains, makeClouds } from './mundo.js';
import { makeBushes, makeFarTrees, makeGrass, makePalm, makeUmbrella, makeLounger, makeSurfboard, makeBall, makeRock, makeStarfish, makeBoat, makeGulls } from './flora.js';
import { Post } from './pos.js';

const VW = 1920, VH = 1080, FPS = 30, V3 = THREE.Vector3;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('out'), antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(VW, VH, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(FOG.color, FOG.k);
const camera = new THREE.PerspectiveCamera(25, VW / VH, 0.5, 9000);

// ambiente para reflexos: o próprio céu, com chão esverdeado
{
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMaterial(0x93a771)));
  scene.environment = pm.fromScene(es, 0, 1, 1000).texture; scene.environmentIntensity = 0.7;
}
// luz
const sun = new THREE.DirectionalLight(0xfff0d6, 3.3); sun.castShadow = true;
const SH_EXT = 44, SH_MAP = 4096;
sun.shadow.mapSize.set(SH_MAP, SH_MAP); Object.assign(sun.shadow.camera, { left: -SH_EXT, right: SH_EXT, top: SH_EXT, bottom: -SH_EXT, near: 20, far: 340 });
sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.045; sun.shadow.radius = 2.4;
scene.add(sun, sun.target, new THREE.HemisphereLight(0xd0e5ff, 0xa9b87c, 1.5));
const lr = new V3().crossVectors(new V3(0, 1, 0), SUN_DIR).normalize(), lu = new V3().crossVectors(SUN_DIR, lr).normalize(), lc = new V3();
function aimSun(x, y, z) {                                   // segue a kombi em passos de um texel (a sombra não "ferve")
  const tx = 2 * SH_EXT / SH_MAP; lc.set(x, y, z);
  const a = Math.round(lc.dot(lr) / tx) * tx, b = Math.round(lc.dot(lu) / tx) * tx, d = lc.dot(SUN_DIR);
  lc.copy(lr).multiplyScalar(a).addScaledVector(lu, b).addScaledVector(SUN_DIR, d);
  sun.target.position.copy(lc); sun.position.copy(lc).addScaledVector(SUN_DIR, 170); sun.target.updateMatrixWorld();
}

// ---------- simulação e câmera ----------
const sim = runSim();
// câmera em coordenadas polares em volta da referência suavizada da kombi (azimute do mundo, horário a partir do norte)
const kAz = track([[0, 127], [3.3, 127], [4.3, 150], [5.15, 177], [6.3, 168], [8.2, 142], [10.4, 128], [12.3, 126], [16, 132]]);
const kDist = track([[0, 21], [3.3, 21], [4.3, 21], [5.15, 20], [6.3, 21], [8.2, 19.5], [10.4, 16.5], [12.3, 16], [16, 18]]);
const kH = track([[0, 2.7], [3.3, 2.7], [4.3, 3.0], [5.15, 3.4], [6.3, 3.4], [8.2, 2.8], [10.4, 2.3], [12.3, 2.2], [16, 4.6]]);
const kFov = track([[0, 25], [3.3, 25], [4.3, 27], [5.15, 32], [6.3, 31], [8.2, 28], [10.4, 27], [12.3, 27], [16, 29]]);
const kSx = track([[0, 0.2], [3.3, 0.2], [4.3, 0.08], [5.15, -0.16], [6.3, -0.12], [8.2, -0.05], [10.4, -0.1], [12.3, -0.12], [16, -0.14]]);
const kSy = track([[0, 0.06], [3.3, 0.06], [4.3, 0.04], [5.15, 0.10], [6.3, 0.06], [8.2, 0], [10.4, -0.04], [12.3, -0.06], [16, -0.22]]);
const kK = track([[0, 240], [4.3, 240], [5.15, 215], [8.2, 230], [12.3, 235], [16, 215]]);
const smax = (a, b, k) => 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + k * k));
function camState(t) {
  const rx = sim.rd(sim.rx, t), ry = sim.rd(sim.ry, t), rz = pathZ(rx), s = sim.at(t);
  const az = kAz(t) * D2R, d = kDist(t);
  const pos = new V3(rx + Math.sin(az) * d, ry + kH(t), rz - Math.cos(az) * d);
  pos.y = smax(pos.y, groundH(pos.x, pos.z) + 1.25, 0.5);
  const tgt = new V3(s.x, lerp(ry + 1.9, s.y + 1.9, 0.35), s.z);
  return { pos, tgt, fov: kFov(t), sx: kSx(t), sy: kSy(t), K: kK(t), focus: pos.distanceTo(new V3(s.x, s.y + 1.5, s.z)), rx, ry, rz, s };
}
const camSamples = [];
for (let t = -0.3; t <= DURATION + 0.05; t += 0.05) { const c = camState(t); camSamples.push({ x: c.pos.x, y: c.pos.y, z: c.pos.z, tx: c.s.x, ty: c.s.y + 1.9, tz: c.s.z }); }
// uma planta pode ficar aqui? Não no caminho da kombi, não na cara da câmera, não cobrindo a kombi.
function blocked(x, z, r, top, low) {
  const dzp = Math.abs(z - pathZ(x));
  if (x < 19 && dzp < 2.45 + r * 0.7) return true;
  for (const c of camSamples) {
    const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz);
    if (d < r + 2.3 && !(low && top < c.y - 0.75 && d > r + 0.9)) return true;
    const sx = c.tx - c.x, sz = c.tz - c.z, u = (dx * sx + dz * sz) / (sx * sx + sz * sz);
    if (u > 0.02 && u < 1.02) { const dd = Math.hypot(x - c.x - sx * u, z - c.z - sz * u); if (dd < r + 0.45 && top > lerp(c.y, c.ty - 1.9, u) - 0.15) return true; }
  }
  return false;
}

// ---------- mundo ----------
makeSky(scene);
makeTerrain(scene, renderer.capabilities.getMaxAnisotropy());
const sea = makeSea(scene);
makeMountains(scene, [
  [-160, -45, 13, 14, 1], [-170, -120, 16, 18, 2], [-235, -70, 18, 20, 3], [-205, -170, 22, 25, 4], [-260, -200, 28, 32, 5], [-330, -120, 30, 33, 6],
  [-300, -330, 42, 48, 7], [-420, -260, 46, 51, 8], [-330, -520, 66, 78, 9], [-560, -480, 72, 82, 10], [-480, -800, 96, 110, 11],
  [-150, -375, 26, 38, 12], [-118, -348, 12, 15, 13], [40, -420, 30, 42, 14], [150, -600, 42, 56, 15],
]);
const clouds = makeClouds(scene, [
  [-330, 62, -260, 20, 1], [-420, 78, -80, 24, 2], [-250, 55, -420, 18, 3], [-520, 86, -420, 28, 4], [-120, 64, -520, 22, 5], [-60, 72, -640, 26, 6], [80, 60, -560, 20, 7],
  [-640, 96, -200, 30, 8], [-380, 70, -620, 24, 9], [200, 76, -700, 26, 10], [-180, 58, -330, 16, 11], [-700, 102, -620, 32, 12], [-460, 66, -300, 18, 13], [20, 88, -820, 30, 14],
]);

const R = rng(2026), pick = a => a[Math.floor(R() * a.length)];
const bushes = [];
const addBush = (x, z, s, o = {}) => {
  if (shoreDist(x, z) < (o.minShore ?? 17)) return;
  if (blocked(x, z, s * 0.75, groundH(x, z) + s * (o.trunk ? 1.9 : 1.35), true)) return;
  bushes.push({ x, z, s, seed: (R() * 1e9) | 0, ...o });
};
for (let x = -134; x < -12; x += 2.6 + R() * 1.6) {            // faixa de fundo ao norte da estrada
  const k = smooth(-36, -52, x);
  addBush(x, pathZ(x) - (5.2 + 2.6 * R()), 0.9 + 0.8 * R(), { flowers: R() < 0.5 });
  if (R() < 0.3 + 0.7 * k) addBush(x + R() * 2, pathZ(x) - (9.5 + 4.5 * R()), 1.7 + 1.2 * R(), { flowers: R() < 0.3 });
  if (R() < 0.15 + 0.85 * k) addBush(x + R() * 2, pathZ(x) - (16 + 9 * R()), 2.6 + 1.5 * R(), { far: true, trunk: true });
  if (R() < 0.8 * k) addBush(x + R() * 3, pathZ(x) - (27 + 16 * R()), 3.3 + 2.0 * R(), { far: true, trunk: true });
}
for (let x = -132; x < -10; x += 1.1) if (R() < 0.42) addBush(x, pathZ(x) + (R() < 0.5 ? 1 : -1) * (2.9 + 3.2 * R() * R()), 0.3 + 0.45 * R(), { flowers: R() < 0.45 });
for (let i = 0; i < 430; i++) { const x = -126 + R() * 122, z = pathZ(x) + 5 + R() * 20; addBush(x, z, 0.45 + 0.9 * R() * R(), { flowers: R() < 0.35 }); }
for (let i = 0; i < 70; i++) { const x = -44 + R() * 40, z = pathZ(x) - (5 + R() * 18); addBush(x, z, 0.5 + 0.9 * R(), { dune: shoreDist(x, z) < 30, flowers: R() < 0.3, minShore: 19 }); }
for (let i = 0; i < 110; i++) { const x = -16 + R() * 44, z = 1.5 + R() * 18; addBush(x, z, 0.4 + 0.8 * R(), { dune: true, minShore: 19.5 }); }
const bushInfo = makeBushes(scene, bushes);

{ // árvores-bolha na outra margem da baía
  const far = [], cs = [0x2f7a3c, 0x3a8a44, 0x2a6e3a, 0x4a9a48];
  for (let i = 0; i < 640; i++) { const x = -60 - R() * 620, sl = 2 * SHK * (30 - x), dd = 24 + R() * R() * 150, z = shoreZ(x) + dd * Math.sqrt(1 + sl * sl); if (z > -95 && x > -190) continue; far.push({ x, z, s: 2.4 + 3.0 * R(), c: pick(cs) }); }
  makeFarTrees(scene, far);
}
{ // capim
  const grass = [], gG = [0x6aa83c, 0x80b845, 0x97c852, 0x74ad40], gD = [0xb9c56a, 0xa3b85a, 0xcfd07a, 0x94ad52];
  for (let i = 0; i < 11000; i++) {
    const x = -130 + R() * 165, z = pathZ(x) + (R() * 2 - 1) * 27, sd = shoreDist(x, z), dz = Math.abs(z - pathZ(x));
    if (sd < 17.5 || (x < 19 && dz < (x < -4 ? 2.5 : 2.1))) continue;
    const dune = sd < 28; if (dune && R() < 0.45) continue;
    if (dz > 4.5 && fbm2(x * 0.15, z * 0.15, 2) < -0.1) continue;
    let ok = true; for (const c of camSamples) if (Math.hypot(x - c.x, z - c.z) < 1.8) { ok = false; break; } if (!ok) continue;
    grass.push({ x, z, rot: R() * TAU, s: (dune ? 0.46 : 0.30) + 0.3 * R(), h: 0.8 + 0.7 * R() + (dune ? 0.4 : 0), c: pick(dune ? gD : gG) });
  }
  makeGrass(scene, grass);
}
const palms = [
  { x: -26, z: -12.5, h: 7.2, lean: [0.3, -0.7], seed: 12 }, { x: -21, z: -9.5, h: 5.6, lean: [0.6, -0.3], seed: 13 }, { x: -15.5, z: -13, h: 6.6, lean: [0.2, -0.7], seed: 14 },
  { x: -12, z: -9.8, h: 5.4, lean: [0.5, -0.4], seed: 22 },
  { x: -9, z: -12, h: 7.4, lean: [0.5, -0.8], seed: 15 }, { x: -7, z: -9, h: 5.8, lean: [0.7, -0.5], seed: 16 }, { x: -5.5, z: -13.2, h: 6.6, lean: [0.3, -0.9], seed: 17 },
  { x: 26.3, z: -1.0, h: 6.6, lean: [-0.75, -0.75], seed: 18 },
].map(p => makePalm(scene, p));
makeUmbrella(scene, 18.2, -9.3, 0.4);
makeLounger(scene, 17.1, -10.5, PI / 2 + 0.18, 0x2fb6a6); makeLounger(scene, 19.6, -10.3, PI / 2 - 0.12, 0xf8c84a);
makeBall(scene, 16.4, -8.9);
makeSurfboard(scene, -4.4, -11.4, 0.5, 0xf0685a, 0xfdf6e3, 0.14); makeSurfboard(scene, -3.4, -12.0, 0.2, 0x2fb6a6, 0xf8d24a, -0.1);
makeRock(scene, -9, -15.4, 1.3, 1); makeRock(scene, -11.3, -16.5, 0.9, 2); makeRock(scene, -7.4, -16.9, 0.6, 3); makeRock(scene, 9.5, -13.4, 0.45, 4);
makeRock(scene, -47, -6.4, 0.7, 5, 0xa9a08c); makeRock(scene, -70.5, 5.2, 0.5, 6, 0xa9a08c); makeRock(scene, -31, 4.6, 0.6, 7, 0xa9a08c);
makeStarfish(scene, 18.6, -3.7, 0.4); makeStarfish(scene, 21.3, -6.6, 1.3, 0xf59a4a, 0.17); makeStarfish(scene, 12.2, -1.6, 2.1, 0xf0685a, 0.15);
const boat = makeBoat(scene, -24, -54, 0.35);
const gulls = makeGulls(scene, [
  { cx: -14, cz: -42, r: 17, y: 11, a0: 0.3, w: 0.42, s: 1.5 }, { cx: -10, cz: -46, r: 12, y: 13.5, a0: 2.6, w: -0.5, s: 1.3 }, { cx: -30, cz: -60, r: 22, y: 16, a0: 4.4, w: 0.33, s: 1.6 },
  { cx: 6, cz: -38, r: 10, y: 9, a0: 1.5, w: 0.6, s: 1.2 }, { cx: -60, cz: -90, r: 30, y: 22, a0: 5.2, w: -0.28, s: 1.8 },
]);

// ---------- a kombi ----------
const kombi = makeKombi(); scene.add(kombi.root);

// poeira: bolinhas opacas que crescem e somem, como na referência
const puffs = [], PR = rng(99);
const addPuff = (t0, x, y, z, vx, vy, vz, size, life, sand) => puffs.push({ t0, x, y, z, vx, vy, vz, size, life, sand });
for (const e of sim.land) {
  if (e.t < -1 || e.air < 0.12) continue;
  const dz = pathDz(e.x), n = Math.hypot(1, dz), rxn = -dz / n, rzn = 1 / n, cnt = 4 + Math.round(e.s * 5);
  for (const side of [1, -1]) for (let i = 0; i < cnt; i++)
    addPuff(e.t + PR() * 0.07, e.x - 0.25 - PR() * 0.7 + rxn * side * 0.9, e.y + 0.1 + PR() * 0.15, e.z + rzn * side * (0.9 + PR() * 0.3), -0.6 + 2.6 * PR(), 0.7 + 1.5 * PR(), side * (0.3 + 1.1 * PR()), (0.22 + 0.32 * PR()) * (0.6 + 0.6 * e.s), 0.6 + 0.45 * PR(), e.x > -8);
}
for (let t = -1; t < T_STOP; t += 0.055) {
  const s = sim.at(t); if (s.v < 1.2) continue;
  const brake = -aAt(t);
  for (const ax of [-1, 1]) {
    if (ax > 0 && !(s.x > -8 && brake > 1.2)) continue;                       // roda da frente só joga areia na freada
    if ((ax < 0 ? s.cR : s.cF) < -0.07) continue;                             // roda no ar não levanta poeira
    const xw = s.x + ax * WB, zw = pathZ(xw), yw = groundH(xw, zw), sand = xw > -8, k = sand ? clamp(brake / 3.2, 0.25, 1.4) : 0.42;
    const dz = pathDz(xw), n = Math.hypot(1, dz), rxn = -dz / n, rzn = 1 / n;
    for (const side of [1, -1]) {
      if (PR() < 0.35) continue;
      addPuff(t, xw - 0.2 + rxn * side * 0.92, yw + 0.08, zw + rzn * side * 0.92, sand ? 0.5 + 2.2 * PR() * k : -0.3 + 1.2 * PR(), 0.5 + 1.0 * PR() * k, side * (0.2 + 0.8 * PR()), (0.14 + 0.16 * PR()) * (0.7 + 0.8 * k), 0.4 + 0.35 * PR(), sand);
    }
  }
}
const puffMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xcdbb98, emissiveIntensity: 0.22 }), puffs.length);
{ const c = new THREE.Color(); puffs.forEach((p, i) => puffMesh.setColorAt(i, c.set(p.sand ? 0xf4e2b8 : 0xf5ead0))); }
puffMesh.frustumCulled = false; puffMesh.castShadow = false; scene.add(puffMesh);
const pm4 = new THREE.Matrix4(), pq = new THREE.Quaternion(), pv = new V3(), ps = new V3();
function updatePuffs(t) {
  for (let i = 0; i < puffs.length; i++) {
    const p = puffs[i], a = (t - p.t0) / p.life; let sc = 0;
    if (a > 0 && a < 1) { const grow = 1 - Math.pow(1 - Math.min(1, a / 0.3), 3), shrink = a > 0.5 ? 1 - Math.pow((a - 0.5) / 0.5, 2) : 1; sc = p.size * grow * shrink; }
    const tau = Math.max(0, a) * p.life, drag = 1 - 0.5 * clamp(a);
    pv.set(p.x + p.vx * tau * drag, p.y + p.vy * tau * (1 - 0.55 * clamp(a)) + sc * 0.4, p.z + p.vz * tau * drag);
    pm4.compose(pv, pq, ps.set(sc, sc * 0.92, sc)); puffMesh.setMatrixAt(i, pm4);
  }
  puffMesh.instanceMatrix.needsUpdate = true;
}

// rastro dos pneus na areia, revelado conforme a kombi avança
const TRK = { x0: -11.5, step: 0.15 };
const trackMesh = (() => {
  const pos = [], idx = []; let v = 0; const x1 = X_STOP + WB;
  for (let x = TRK.x0; x <= x1; x += TRK.step) {
    const z = pathZ(x), dz = pathDz(x), n = Math.hypot(1, dz), rxn = -dz / n, rzn = 1 / n;
    for (const side of [1, -1]) for (const e of [-0.13, 0.13]) { const px = x + rxn * (side * 0.9 + e), pz = z + rzn * (side * 0.9 + e); pos.push(px, groundH(px, pz) + 0.035, pz); }
    if (x + TRK.step <= x1) { idx.push(v, v + 4, v + 1, v + 1, v + 4, v + 5, v + 2, v + 6, v + 3, v + 3, v + 6, v + 7); } v += 4;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xa07a48, roughness: 1, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true; m.renderOrder = 2; scene.add(m); return m;
})();

// ---------- quadro ----------
const post = new Post(renderer, VW, VH);
let cur = null;
function frame(t) {
  const c = camState(t), s = c.s; cur = c;
  kombi.pose(s, -Math.atan(2 * WB * pathDDz(s.x)), (s.x - X_START) / WR);
  updatePuffs(t);
  trackMesh.geometry.setDrawRange(0, Math.max(0, Math.floor((s.x + WB - TRK.x0) / TRK.step)) * 12);
  sea.setTime(t); clouds.setTime(t); boat.update(t); gulls.update(t); for (const p of palms) p.sway(t);
  aimSun(c.rx, c.ry, c.rz);
  camera.position.copy(c.pos); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); camera.lookAt(c.tgt);
  const hf = Math.atan(Math.tan(c.fov * D2R / 2) * VW / VH); window.lastCam = { x: c.pos.x, y: c.pos.y, z: c.pos.z, focus: c.focus };
  camera.rotateY(Math.atan(c.sx * Math.tan(hf))); camera.rotateX(-Math.atan(c.sy * Math.tan(c.fov * D2R / 2))); camera.updateMatrixWorld();
}
const Q = new URLSearchParams(location.search), EXPOSURE = Number(Q.get('exp') ?? 0.92);
function render(fi) { post.render(scene, camera, { focus: cur.focus, K: cur.K, maxNear: 44, maxFar: 13, exposure: EXPOSURE, frame: fi }); }

const KEYS = [
  { id: '00-estrada-no-ar', t: 0.12 }, { id: '01-pouso-e-poeira', t: 0.62 }, { id: '02-subida', t: 2.05 }, { id: '03-a-baia-aparece', t: 4.5 },
  { id: '04-salto-grande', t: 4.95 }, { id: '05-descida-para-o-mar', t: 6.6 }, { id: '06-freada-na-areia', t: 11.0 }, { id: '07-praia', t: 15.9 },
];
window.KEYS = KEYS; window.DURATION = DURATION; window.SHOTS = [];
window.renderAt = t => { frame(t); render(Math.round(t * FPS)); return t; };
window.renderKey = i => window.renderAt(KEYS[i].t);
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida') + ` · folhas ${bushInfo.leaves} · arbustos ${bushes.length} · poeira ${puffs.length}`;
window.renderAt(Number(Q.get('t') ?? 0.12));
window.ready = true;
