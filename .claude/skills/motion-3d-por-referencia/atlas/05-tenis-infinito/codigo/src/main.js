// tenis-infinito: o mundo cabe na bola. Um plano único de 8 s que fecha em laço:
// a câmera sai de dentro de uma bola de tênis aberta, sobrevoa a quadra, orbita a bola do jogo
// sobre a rede, a bola se abre e dentro dela mora outra quadra igual.
// Tudo procedural: sem modelos, sem imagens. Três níveis do mesmo mundo (-1, 0, +1), um dentro do outro.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const VW = 1920, VH = 1080, PI = Math.PI, DEG = PI / 180;
const T = 8, FPS = 30;                                   // duração do laço
const Q = new URLSearchParams(location.search);
const SUB = Math.max(1, Number(Q.get('sub') ?? 10));     // subquadros por quadro (desfoque de movimento + serrilhado)
const SHUTTER = 0.5;
const DBG = Q.get('dbg');                                     // obturador de 180°

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// valor por chaves [tempo, valor], com passagem suave e preso nas pontas
function keyed(keys) {
  return x => {
    if (x <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (x <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; return lerp(va, vb, smooth((x - a) / (b - a))); }
    return keys[keys.length - 1][1];
  };
}

// ---------------------------------------------------------------- medidas (metros do mundo)
const RW = 23;                 // raio do disco da quadra (até o muro)
const HW = 1.6;                // altura do muro: o piso fica 1,6 m abaixo do corte da bola
const RI = 0.93;               // raio interno da bola (bola de raio 1)
const RBW = RW / RI;           // raio da bola que envolve um mundo, em metros desse mundo (24,73)
const RB = 0.24;               // raio da bola do jogo
const S = RB / RBW;            // escala de um nível para o seguinte (~1/103)
const REST = new THREE.Vector3(0, 1.30, 0);              // bola parada sobre o meio da rede
const AZ0 = -38 * DEG;         // por onde a câmera entra (e para onde a tampa abre)
const PSI = 170 * DEG;         // quanto a câmera gira em volta da bola numa volta do laço
const OPEN_A = 5.5 * DEG, OPEN_LIFT = 0.2;            // abertura da tampa: giro na dobradiça e subida
const dirAz = (az, el = 0) => new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
const qAz = d => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -d); // gira d no sentido do azimute

// ponto fixo da passagem de nível: tudo é medido em volta dele, em escala logarítmica
const FY = (REST.y - S * HW) / (1 - S);
const F = new THREE.Vector3(0, FY, 0);

// ---------------------------------------------------------------- estado de um mundo em função do tempo dele (tau)
// tau = t no mundo principal; o mundo de dentro está uma volta atrás (t - 8); o de fora, uma volta à frente (t + 8)
const L_OF = keyed([[0, 1.28], [1.5, 1.04], [4.4, 1.0], [5.6, 0.42], [6.5, 0.1], [8, 0.06], [10, 0.025], [12, 0]]); // luz da quadra
const B_OF = keyed([[11.5, 1.0], [14.6, 0.2], [16, 0]]);                                                           // luz do feltro
const GLOW_OF = keyed([[5.0, 0], [6.5, 1], [8.6, 1], [10.5, 0]]);                                                  // brilho próprio da bola
const OPEN_OF = tau => smooth((tau - 6.3) / 1.7);
const SPIN_AXIS = new THREE.Vector3(0.28, 1, -0.16).normalize();
const spinOf = tau => { const u = Math.max(0, 6.0 - tau), ue = 0.7; return 1.45 * (u - ue * (1 - Math.exp(-u / ue))); };
const bobOf = (tau, out) => {
  const e = 1 - smooth((tau - 4.6) / 1.4);
  return out.set(0.012 * Math.sin(tau * 1.7 + 1) * e, 0.034 * Math.sin(tau * 2.42) * e, 0.01 * Math.sin(tau * 1.3 + 2) * e).add(REST);
};

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(VW, VH, false);
renderer.autoClear = false;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NoToneMapping;               // o tom é feito no último passe
document.getElementById('palco').prepend(renderer.domElement);
const gl = renderer.getContext();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, VW / VH, 0.1, 1000);
scene.add(camera);

const hemi = new THREE.HemisphereLight('#a9ccff', '#2459b0', 1.15);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffffff', 3.7);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.radius = 2.5;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

// uniformes globais (iguais para todos os níveis)
const U = {
  key: { value: new THREE.Vector3(0, 1, 0) },            // luz do feltro, em espaço de mundo; acompanha o azimute da câmera
  cam: { value: new THREE.Vector3() },
};

// ---------------------------------------------------------------- ruído (GLSL)
const NOISE = /* glsl */`
  float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
  vec3 hash33(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
  float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float vnoise2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1,0)), f.x), mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), f.x), f.y); }
`;

// ================================================================ GEOMETRIAS (uma vez; os três níveis compartilham)
const tmpO = new THREE.Object3D();
function boxAt(w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  tmpO.position.set(x, y, z); tmpO.rotation.set(rx, ry, rz); tmpO.scale.set(1, 1, 1); tmpO.updateMatrix();
  return g.applyMatrix4(tmpO.matrix);
}
function cylBetween(a, b, r, seg = 10, r2 = r) {
  const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
  const g = new THREE.CylinderGeometry(r2, r, len, seg, 1, false);
  tmpO.position.copy(a).addScaledVector(dir, 0.5); tmpO.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); tmpO.scale.set(1, 1, 1); tmpO.updateMatrix();
  return g.applyMatrix4(tmpO.matrix);
}
function capBetween(a, b, r) {
  const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
  const g = new THREE.CapsuleGeometry(r, len, 5, 12);
  tmpO.position.copy(a).addScaledVector(dir, 0.5); tmpO.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); tmpO.scale.set(1, 1, 1); tmpO.updateMatrix();
  return g.applyMatrix4(tmpO.matrix);
}
function sphereAt(r, p, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.SphereGeometry(r, 20, 14);
  tmpO.position.copy(p); tmpO.quaternion.identity(); tmpO.scale.set(sx, sy, sz); tmpO.updateMatrix();
  return g.applyMatrix4(tmpO.matrix);
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const merge = list => mergeGeometries(list.map(g => { const n = g.index ? g.toNonIndexed() : g; return n; }), false);

const G = {};
// --- piso e muro
G.floor = new THREE.CircleGeometry(RW, 160).rotateX(-PI / 2);
G.wall = new THREE.CylinderGeometry(RW, RW, HW, 160, 1, true).translate(0, HW / 2, 0);

// --- rede
const NET_HW = 6.40, tapeY = z => 0.914 + 0.156 * Math.pow(Math.abs(z) / NET_HW, 1.8);
{
  const white = [], dark = [];
  const TH = 0.075, TT = 0.03;                             // faixa de cima: altura e espessura
  const NS = 64, dz = 2 * NET_HW / NS;
  for (let i = 0; i < NS; i++) {
    const z0 = -NET_HW + i * dz, z1 = z0 + dz, y0 = tapeY(z0), y1 = tapeY(z1);
    white.push(boxAt(TT, TH, Math.hypot(dz, y1 - y0) + 0.004, 0, (y0 + y1) / 2 - TH / 2, (z0 + z1) / 2, -Math.atan2(y1 - y0, dz)));
    white.push(boxAt(0.016, 0.03, dz + 0.002, 0, 0.03, (z0 + z1) / 2));       // barra de baixo
  }
  const CELL = 0.085, bottom = 0.045;
  for (let z = -NET_HW + CELL; z < NET_HW - 0.01; z += CELL) {               // fios verticais
    const top = tapeY(z) - TH;
    white.push(boxAt(0.007, top - bottom, 0.014, 0, (top + bottom) / 2, z));
  }
  const ROWS = 10, HS = 40, hz = 2 * NET_HW / HS;
  for (let k = 1; k < ROWS; k++) for (let i = 0; i < HS; i++) {              // fios horizontais acompanham a barriga
    const z0 = -NET_HW + i * hz, z1 = z0 + hz, f = k / ROWS;
    const y0 = lerp(bottom, tapeY(z0) - TH, f), y1 = lerp(bottom, tapeY(z1) - TH, f);
    white.push(boxAt(0.007, 0.014, Math.hypot(hz, y1 - y0) + 0.002, 0, (y0 + y1) / 2, (z0 + z1) / 2, -Math.atan2(y1 - y0, hz)));
  }
  white.push(boxAt(0.012, tapeY(0) - 0.02, 0.055, 0, tapeY(0) / 2, 0));       // fita do meio
  for (const sz of [-1, 1]) {
    dark.push(cylBetween(V(0, 0, sz * (NET_HW + 0.03)), V(0, 1.10, sz * (NET_HW + 0.03)), 0.048, 16));
    white.push(sphereAt(0.055, V(0, 1.11, sz * (NET_HW + 0.03)), 1, 0.6, 1));
    white.push(boxAt(0.02, 1.0, 0.03, 0, 0.56, sz * (NET_HW - 0.012)));
  }
  G.netWhite = merge(white); G.netDark = merge(dark);
}

// --- alambrado (moldura branca + tela fina)
const FX = 18, FZ = 10.2, FH = 3.2;
{
  const frame = [], panels = [];
  const side = (a, b) => {
    const len = a.distanceTo(b), n = Math.round(len / 3);
    for (let i = 0; i <= n; i++) { const p = a.clone().lerp(b, i / n); frame.push(cylBetween(V(p.x, 0, p.z), V(p.x, FH + 0.06, p.z), 0.05, 10)); }
    for (const y of [0.1, FH / 2, FH]) frame.push(cylBetween(V(a.x, y, a.z), V(b.x, y, b.z), 0.032, 8));
    const g = new THREE.PlaneGeometry(len, FH);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 0.11, uv.getY(i) * FH / 0.11);
    tmpO.position.set((a.x + b.x) / 2, FH / 2, (a.z + b.z) / 2); tmpO.rotation.set(0, Math.atan2(-(b.z - a.z), b.x - a.x), 0); tmpO.scale.set(1, 1, 1); tmpO.updateMatrix();
    panels.push(g.applyMatrix4(tmpO.matrix));
  };
  side(V(-FX, 0, -FZ), V(FX, 0, -FZ)); side(V(FX, 0, -FZ), V(FX, 0, FZ)); side(V(FX, 0, FZ), V(-FX, 0, FZ)); side(V(-FX, 0, FZ), V(-FX, 0, -FZ));
  G.fenceFrame = merge(frame); G.fencePanels = merge(panels);
}

// --- postes de luz
const LAMPS = [[9.5, 11.9], [-9.5, 11.9], [9.5, -11.9], [-9.5, -11.9]];
{
  const posts = [], heads = [];
  for (const [x, z] of LAMPS) {
    const sz = Math.sign(z), PH = 8.2;
    posts.push(cylBetween(V(x, 0, z), V(x, 0.35, z), 0.2, 14, 0.16));
    posts.push(cylBetween(V(x, 0.3, z), V(x, PH, z), 0.1, 12, 0.075));
    const arc = new THREE.TorusGeometry(0.85, 0.072, 10, 22, PI / 2).rotateZ(PI / 2).rotateY(sz * PI / 2).translate(x, PH, z - sz * 0.85);
    posts.push(arc);
    posts.push(cylBetween(V(x, PH + 0.85, z - sz * 0.85), V(x, PH + 0.85, z - sz * 1.25), 0.072, 10));
    posts.push(sphereAt(0.3, V(x, PH + 0.86, z - sz * 1.45), 1, 0.5, 1.25));
    heads.push(sphereAt(0.2, V(x, PH + 0.77, z - sz * 1.45), 1, 0.4, 1.2));
  }
  G.lampPosts = merge(posts); G.lampHeads = merge(heads);
}

// --- cadeira do juiz e bancos (toque nosso: a referência não tem)
{
  const w = [];
  const cx = 0, cz = -7.55;
  for (const [dx, dz2] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]]) w.push(cylBetween(V(cx + dx * 1.25, 0, cz + dz2 * 1.25), V(cx + dx, 1.85, cz + dz2), 0.03, 8));
  for (const y of [0.55, 1.15]) { w.push(boxAt(0.86 - y * 0.1, 0.04, 0.05, cx, y, cz + 0.36 - y * 0.02)); w.push(boxAt(0.86 - y * 0.1, 0.04, 0.05, cx, y, cz - 0.36 + y * 0.02)); }
  w.push(boxAt(0.78, 0.07, 0.7, cx, 1.88, cz)); w.push(boxAt(0.78, 0.7, 0.06, cx, 2.25, cz - 0.33));
  for (const bx of [-3.4, 3.4]) {
    w.push(boxAt(1.8, 0.07, 0.42, bx, 0.46, -8.3));
    for (const s of [-0.75, 0.75]) w.push(boxAt(0.06, 0.46, 0.38, bx + s, 0.23, -8.3));
  }
  G.props = merge(w);
}

// --- jogadores (bonecos de maquete: sem rosto, formas simples)
function figurine(J) {
  const skin = [], shirt = [], shorts = [], shoe = [], racket = [];
  skin.push(sphereAt(0.118, J.head), capBetween(J.sR, J.eR, 0.043), capBetween(J.eR, J.hR, 0.036), capBetween(J.sL, J.eL, 0.043), capBetween(J.eL, J.hL, 0.036),
    capBetween(J.kR, J.fR, 0.05), capBetween(J.kL, J.fL, 0.05), capBetween(J.chest, J.head, 0.05));
  shirt.push(capBetween(J.pelvis, J.chest, 0.15), sphereAt(0.075, J.sR), sphereAt(0.075, J.sL));
  shorts.push(capBetween(J.hipR, J.kR, 0.075), capBetween(J.hipL, J.kL, 0.075), sphereAt(0.16, J.pelvis, 1, 0.8, 1));
  shoe.push(capBetween(J.fR, J.fR.clone().add(J.toe), 0.055), capBetween(J.fL, J.fL.clone().add(J.toe), 0.055));
  const h = J.rk.clone().sub(J.hR).normalize(), throat = J.hR.clone().addScaledVector(h, 0.26), center = throat.clone().addScaledVector(h, 0.17);
  racket.push(cylBetween(J.hR, throat, 0.017, 8));
  const n = J.rn.clone().addScaledVector(h, -J.rn.dot(h)).normalize(), xax = new THREE.Vector3().crossVectors(h, n);
  const m = new THREE.Matrix4().makeBasis(xax, h, n).setPosition(center);
  racket.push(new THREE.TorusGeometry(1, 0.085, 6, 28).scale(0.125, 0.165, 0.125).applyMatrix4(m));
  return { skin: merge(skin), shirt: merge(shirt), shorts: merge(shorts), shoe: merge(shoe), racket: merge(racket),
    strings: new THREE.CircleGeometry(1, 24).scale(0.118, 0.158, 1).applyMatrix4(m) };
}
// 1: fim de um forehand (do lado +x, virado para a rede). 2: pronto para devolver (lado -x)
G.p1 = figurine({ pelvis: V(0, 0.95, 0), chest: V(-0.09, 1.38, 0.02), head: V(-0.15, 1.63, 0.03),
  sR: V(-0.1, 1.43, 0.2), eR: V(-0.36, 1.42, 0.3), hR: V(-0.52, 1.62, 0.12), rk: V(-0.62, 2.1, -0.12), rn: V(1, 0.1, 0.2),
  sL: V(-0.08, 1.43, -0.2), eL: V(-0.26, 1.2, -0.34), hL: V(-0.46, 1.16, -0.26),
  hipR: V(0, 0.9, 0.11), kR: V(0.16, 0.5, 0.2), fR: V(0.34, 0.07, 0.24), hipL: V(0, 0.9, -0.11), kL: V(-0.2, 0.5, -0.16), fL: V(-0.3, 0.07, -0.2), toe: V(-0.13, 0, 0) });
G.p2 = figurine({ pelvis: V(0, 0.86, 0), chest: V(0.12, 1.26, 0), head: V(0.2, 1.5, 0),
  sR: V(0.13, 1.31, -0.2), eR: V(0.34, 1.08, -0.26), hR: V(0.52, 1.1, -0.1), rk: V(0.86, 1.36, 0.16), rn: V(0.4, -0.2, -1),
  sL: V(0.13, 1.31, 0.2), eL: V(0.34, 1.06, 0.26), hL: V(0.54, 1.12, 0.12),
  hipR: V(0, 0.82, -0.13), kR: V(0.16, 0.46, -0.3), fR: V(0.04, 0.07, -0.36), hipL: V(0, 0.82, 0.13), kL: V(0.16, 0.46, 0.3), fL: V(0.04, 0.07, 0.36), toe: V(0.13, 0, 0) });
const PLAYERS = [{ g: 'p1', x: 10.6, z: 2.3, ry: 0.25, shirt: '#ff7a59' }, { g: 'p2', x: -11.6, z: -1.6, ry: -0.15, shirt: '#f4f1ea' }];

// --- bola (raio 1; o grupo é escalado)
G.hemiTop = new THREE.SphereGeometry(1, 112, 40, 0, 2 * PI, 0, PI / 2);
G.hemiBot = new THREE.SphereGeometry(1, 112, 40, 0, 2 * PI, PI / 2, PI / 2);
G.dome = new THREE.SphereGeometry(RI, 96, 32, 0, 2 * PI, 0, PI / 2);
G.rimUp = new THREE.RingGeometry(RI - 0.006, 1.0, 180, 1).rotateX(-PI / 2);
G.rimDown = new THREE.RingGeometry(RI - 0.006, 1.0, 180, 1).rotateX(PI / 2);
G.cap = new THREE.CircleGeometry(RI, 96).rotateX(-PI / 2);            // fundo escuro de uma bola aberta sem mundo dentro
{ // folha de grama: tira que afina até a ponta
  const g = new THREE.BufferGeometry(), w = 0.085;
  g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.62, 0.55, 0, w * 0.62, 0.55, 0, 0, 1, 0], 3));
  g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  G.blade = g;
}
const N_BLADES = 30000;
const bladeMatrices = (() => {
  const rnd = mulberry32(77), arr = new Float32Array(N_BLADES * 16), m = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < N_BLADES; i++) {
    const a = rnd() * 2 * PI, r = lerp(RI - 0.004, 1.012, Math.sqrt(rnd()));
    const hgt = lerp(0.011, 0.026, Math.pow(rnd(), 1.6)) * (r > 0.99 ? 0.75 : 1);
    q.setFromEuler(e.set(0, rnd() * 2 * PI, 0)); q2.setFromEuler(e.set((rnd() - 0.5) * 0.9, 0, (rnd() - 0.5) * 0.9)); q2.multiply(q);
    m.compose(V(r * Math.cos(a), 0, r * Math.sin(a)), q2, V(hgt * 0.9, hgt, hgt * 0.9)); m.toArray(arr, i * 16);
  }
  return new THREE.InstancedBufferAttribute(arr, 16);
})();

// --- costura da bola: distância angular até a curva, guardada num mapa (equirretangular; o polo é o eixo do corte)
const seamTex = (() => {
  const W = 1024, H = 512, NC = 720, a = 0.75, b = 0.25, c = 2 * Math.sqrt(a * b);
  const cx = new Float32Array(NC), cy = new Float32Array(NC), cz = new Float32Array(NC);
  for (let i = 0; i < NC; i++) { const t = i / NC * 2 * PI; cx[i] = a * Math.cos(t) + b * Math.cos(3 * t); cy[i] = a * Math.sin(t) - b * Math.sin(3 * t); cz[i] = c * Math.sin(2 * t); }
  const data = new Float32Array(W * H), STEP = 12;
  for (let y = 0; y < H; y++) {
    const th = (y + 0.5) / H * PI, st = Math.sin(th), ctz = Math.cos(th);
    for (let x = 0; x < W; x++) {
      const ph = ((x + 0.5) / W - 0.5) * 2 * PI, dx = st * Math.cos(ph), dy = st * Math.sin(ph);
      let best = -2, bi = 0;
      for (let i = 0; i < NC; i += STEP) { const d = dx * cx[i] + dy * cy[i] + ctz * cz[i]; if (d > best) { best = d; bi = i; } }
      // a curva pode passar perto duas vezes: refina em volta dos dois melhores
      let best2 = -2, bi2 = 0;
      for (let i = 0; i < NC; i += STEP) { const dd = Math.min(Math.abs(i - bi), NC - Math.abs(i - bi)); if (dd < STEP * 3) continue; const d = dx * cx[i] + dy * cy[i] + ctz * cz[i]; if (d > best2) { best2 = d; bi2 = i; } }
      for (const base of [bi, bi2]) for (let k = -STEP; k <= STEP; k++) { const i = (base + k + NC) % NC; const d = dx * cx[i] + dy * cy[i] + ctz * cz[i]; if (d > best) best = d; }
      data[y * W + x] = Math.acos(Math.min(1, best));
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.FloatType);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  return tex;
})();
// tela do alambrado: tudo branco, só o alfa desenha os fios (assim o mipmap não escurece)
const meshTex = (() => {
  const N = 64, d = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 4, on = x < 5 || y < 5; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = on ? 255 : 0; }
  const tex = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 8; tex.needsUpdate = true;
  return tex;
})();

// ================================================================ MATERIAIS POR NÍVEL
// Cada nível tem a própria "chave de luz" (uL) e o próprio clarão da bola: as luzes do three são globais,
// então o que muda de um mundo para o outro entra por aqui.
function levelUniforms() {
  return { uL: { value: 1 }, uGlowPos: { value: new THREE.Vector3() }, uGlowCol: { value: new THREE.Color(0, 0, 0) }, uGlowR: { value: 1 } };
}
function hook(mat, lu, tag = 'std', extra = null) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, lu);
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform float uL; uniform vec3 uGlowPos; uniform vec3 uGlowCol; uniform float uGlowR;\nvoid main() {')
      .replace('#include <opaque_fragment>', /* glsl */`
        {
          vec3 gv = uGlowPos + vViewPosition;
          float gd = length(gv) / uGlowR;
          float gn = max(dot(normal, normalize(gv)), 0.0) * 0.8 + 0.2;
          outgoingLight = outgoingLight * uL + diffuseColor.rgb * uGlowCol * gn / (1.0 + gd * gd);
        }
        #include <opaque_fragment>`);
    if (extra) extra(sh);
  };
  mat.customProgramCacheKey = () => 'nivel-' + tag;
  return mat;
}
const COL = {
  court: '#1269c8', surround: '#1a7ed6', line: '#f3f6f8',
  wall: '#8f959c', white: '#e4e8ec', dark: '#16181b',
  skin: '#e2ad86', shorts: '#1b2a4a', shoe: '#f2f2f2',
  feltHi: '#bcff12', feltMid: '#76dc00', feltLo: '#2c8800', feltDeep: '#114a03', seam: '#e3e6e0',
  grassRoot: '#2f8f00', grassTip: '#b4f518',
};
function courtShader(sh) {
  sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vObj;\nvoid main() {').replace('#include <begin_vertex>', '#include <begin_vertex>\n vObj = position;');
  sh.uniforms.cCourt = { value: new THREE.Color(COL.court) }; sh.uniforms.cSurr = { value: new THREE.Color(COL.surround) }; sh.uniforms.cLine = { value: new THREE.Color(COL.line) };
  sh.fragmentShader = sh.fragmentShader
    .replace('void main() {', /* glsl */`
      varying vec3 vObj; uniform vec3 cCourt; uniform vec3 cSurr; uniform vec3 cLine;
      ${NOISE}
      float sdBox(vec2 p, vec2 c, vec2 h){ vec2 d = abs(p - c) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
      float courtLines(vec2 p){
        const float HL = 11.885, DW = 5.485, SW = 4.115, SL = 6.40, w = 0.05, wb = 0.065;
        vec2 q = abs(p); float d = 1e3;
        d = min(d, sdBox(q, vec2(HL - wb, DW * 0.5), vec2(wb, DW * 0.5)));      // linha de fundo
        d = min(d, sdBox(q, vec2(HL * 0.5, DW - w), vec2(HL * 0.5, w)));        // lateral de duplas
        d = min(d, sdBox(q, vec2(HL * 0.5, SW - w), vec2(HL * 0.5, w)));        // lateral de simples
        d = min(d, sdBox(q, vec2(SL, SW * 0.5), vec2(w, SW * 0.5)));            // linha de saque
        d = min(d, sdBox(q, vec2(SL * 0.5, 0.0), vec2(SL * 0.5, w)));           // linha central
        d = min(d, sdBox(q, vec2(HL - 0.16, 0.0), vec2(0.16, w)));              // marca central
        return d;
      }
      void main() {`)
    .replace('#include <color_fragment>', /* glsl */`
      #include <color_fragment>
      {
        vec2 p = vObj.xz;
        float aa = max(fwidth(p.x), fwidth(p.y)) * 0.75 + 1e-5;
        float line = 1.0 - smoothstep(-aa, aa, courtLines(p));
        float inner = 1.0 - smoothstep(-aa, aa, sdBox(p, vec2(0.0), vec2(11.885, 5.485)));
        vec3 base = mix(cSurr, cCourt, inner);
        float grain = vnoise2(p * 7.0) * 0.6 + vnoise2(p * 31.0) * 0.4;
        base *= 0.9 + 0.2 * grain;
        base *= 0.96 + 0.08 * vnoise2(p * 0.35 + 4.0);
        diffuseColor.rgb = mix(base, cLine, line);
        totalEmissiveRadiance += cLine * line * 0.1;
      }`);
}
function makeLevel() {
  const lu = levelUniforms();
  const lam = (color, tag) => hook(new THREE.MeshLambertMaterial({ color }), lu, tag ?? 'lam');
  const M = {
    lu,
    floor: hook(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82, metalness: 0 }), lu, 'piso', courtShader),
    wall: hook(new THREE.MeshLambertMaterial({ color: COL.wall, side: THREE.BackSide }), lu, 'lam'),
    white: lam(COL.white), prop: lam('#aab6c4'), dark: lam(COL.dark), skin: lam(COL.skin), shorts: lam(COL.shorts), shoe: lam(COL.shoe),
    shirts: PLAYERS.map(p => lam(p.shirt)),
    mesh: hook(new THREE.MeshLambertMaterial({ color: '#c9d2da', map: meshTex, alphaToCoverage: true, side: THREE.DoubleSide }), lu, 'tela'),
    lamp: hook(new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6e6', emissiveIntensity: 3.2 }), lu, 'lamp'),
  };
  return M;
}

// ---------------------------------------------------------------- materiais da bola
const FELT_VERT = /* glsl */`
  uniform float uShells; uniform float uLen;
  varying vec3 vDir; varying vec3 vN; varying vec3 vW; varying float vH;
  void main(){
    #ifdef SHELL
      float h = (float(gl_InstanceID) + 1.0) / uShells;
    #else
      float h = 0.0;
    #endif
    vH = h; vDir = normalize(position);
    vec4 w = modelMatrix * vec4(position * (1.0 + h * uLen), 1.0);
    vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const FELT_FRAG = /* glsl */`
  uniform sampler2D uSeam; uniform float uSeamRot; uniform float uSeamW; uniform float uFreq;
  uniform vec3 uKey; uniform vec3 uCam; uniform float uB; uniform float uGlow;
  uniform vec3 cHi; uniform vec3 cMid; uniform vec3 cLo; uniform vec3 cDeep; uniform vec3 cSeam;
  varying vec3 vDir; varying vec3 vN; varying vec3 vW; varying float vH;
  ${NOISE}
  float seamDist(vec3 d){
    float cs = cos(uSeamRot), sn = sin(uSeamRot);
    vec3 s = vec3(cs * d.x + sn * d.z, -sn * d.x + cs * d.z, d.y);
    vec2 uv = vec2(atan(s.y, s.x) / 6.28318530718 + 0.5, acos(clamp(s.z, -1.0, 1.0)) / 3.14159265359);
    return textureLod(uSeam, uv, 0.0).r;
  }
  void main(){
    vec3 dir = normalize(vDir);
    float ds = seamDist(dir);
    #ifdef SHELL
      vec3 bend = vec3(vnoise(dir * 9.0), vnoise(dir * 9.0 + 7.3), vnoise(dir * 9.0 + 13.7)) - 0.5;
      vec3 q = normalize(dir + bend * vH * 0.045);
      vec3 warp = vec3(vnoise(dir * 13.0 + 3.1), vnoise(dir * 13.0 + 17.7), vnoise(dir * 13.0 + 41.3)) - 0.5;
      vec3 g = q * uFreq + warp * 3.2, c = floor(g), f = fract(g) - 0.5;
      vec3 rnd = hash33(c);
      float len = mix(0.3, 1.0, rnd.x) * smoothstep(uSeamW * 0.95, uSeamW * 1.75, ds);
      float r = length(f - (rnd.yzx - 0.5) * 0.5);
      float rad = mix(0.47, 0.13, clamp(vH / max(len, 1e-3), 0.0, 1.0));
      if (vH > len || r > rad) discard;
    #endif
    vec3 N = normalize(vN), Vd = normalize(uCam - vW);
    float wrap = clamp((dot(N, uKey) + 0.38) / 1.38, 0.0, 1.0);
    vec3 lit = mix(cDeep, cLo, smoothstep(0.0, 0.34, wrap));
    lit = mix(lit, cMid, smoothstep(0.22, 0.7, wrap));
    lit = mix(lit, cHi, smoothstep(0.62, 1.0, wrap));
    float fres = pow(1.0 - max(dot(N, Vd), 0.0), 2.6);
    lit += cHi * fres * 0.3;
    lit *= 0.84 + 0.3 * vnoise(dir * 150.0);
    lit *= 0.9 + 0.2 * vnoise(dir * 5.0 + 2.0);
    lit *= mix(0.66, 1.16, vH);
    lit *= mix(0.72, 1.0, smoothstep(uSeamW, uSeamW * 1.9, ds));
    lit += cMid * uGlow * (0.14 + 0.75 * fres);
    vec3 col = lit * 0.98;
    #ifndef SHELL
      float aa = fwidth(ds) + 1e-4;
      float seam = 1.0 - smoothstep(uSeamW - aa, uSeamW + aa, ds);
      vec3 gW = dFdx(vW) * dFdx(ds) + dFdy(vW) * dFdy(ds);
      gW /= max(length(gW), 1e-9);
      float tt = clamp(ds / uSeamW, 0.0, 1.0);
      vec3 n2 = normalize(N - gW * tt * 0.9);
      float w2 = clamp((dot(n2, uKey) + 0.35) / 1.35, 0.0, 1.0);
      vec3 sc = cSeam * (0.14 + 0.92 * w2 * w2) * (1.0 - 0.6 * smoothstep(0.45, 1.0, tt));
      col = mix(col, sc, seam);
    #endif
    gl_FragColor = vec4(col * uB, 1.0);
  }`;
function makeBallMaterials() {
  const bu = {
    uSeam: { value: seamTex }, uSeamRot: { value: -60 * DEG }, uSeamW: { value: 0.064 }, uFreq: { value: 150 }, uShells: { value: 22 }, uLen: { value: 0.034 },
    uKey: U.key, uCam: U.cam, uB: { value: 1 }, uGlow: { value: 0 }, uLin: { value: 1 },
    cHi: { value: new THREE.Color(COL.feltHi) }, cMid: { value: new THREE.Color(COL.feltMid) }, cLo: { value: new THREE.Color(COL.feltLo) }, cDeep: { value: new THREE.Color(COL.feltDeep) }, cSeam: { value: new THREE.Color(COL.seam) },
    cRoot: { value: new THREE.Color(COL.grassRoot) }, cTip: { value: new THREE.Color(COL.grassTip) },
  };
  const felt = new THREE.ShaderMaterial({ uniforms: bu, vertexShader: FELT_VERT, fragmentShader: FELT_FRAG });
  const shell = new THREE.ShaderMaterial({ uniforms: bu, vertexShader: FELT_VERT, fragmentShader: FELT_FRAG, defines: { SHELL: 1 } });
  const blade = new THREE.ShaderMaterial({ uniforms: bu, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      varying float vT; varying float vR; varying vec3 vW2;
      void main(){ vT = position.y;
        #ifdef USE_INSTANCING
          vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vR = fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453);
        #else
          vec4 w = modelMatrix * vec4(position, 1.0); vT = 0.12; vR = 0.5;
        #endif
        vW2 = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 cRoot; uniform vec3 cTip; uniform float uB; uniform float uGlow; varying float vT; varying float vR;
      void main(){ vec3 c = mix(cRoot * 0.55, cTip, pow(clamp(vT, 0.0, 1.0), 0.75)) * (0.72 + 0.56 * vR) * (1.0 + 0.25 * uGlow); gl_FragColor = vec4(c * uB * 1.05, 1.0); }` });
  const dome = new THREE.ShaderMaterial({ uniforms: bu, side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uLin; varying vec3 vP;
      ${NOISE}
      void main(){ float h = clamp(vP.y / ${RI.toFixed(3)}, 0.0, 1.0);
        vec3 glow = vec3(0.010, 0.062, 0.235) * uLin * exp(-h * 4.2);
        float a = atan(vP.z, vP.x);
        float st = pow(vnoise(vec3(a * 5.0, h * 2.0, 3.0)), 4.0) * 0.02 * uLin * (1.0 - h);
        gl_FragColor = vec4(glow + vec3(0.5, 0.75, 1.0) * st, 1.0); }` });
  const cap = new THREE.MeshBasicMaterial({ color: '#000000' });
  return { bu, felt, shell, blade, dome, cap };
}

// ================================================================ MUNDO E BOLA
class Ball {
  constructor() {
    const M = this.M = makeBallMaterials(), N = M.bu.uShells.value;
    this.group = new THREE.Group();
    this.bottom = new THREE.Group(); this.lid = new THREE.Group(); this.slot = new THREE.Group();
    this.group.add(this.bottom, this.lid, this.slot);
    this.slot.position.set(0, -HW / RBW, 0); this.slot.scale.setScalar(1 / RBW);
    const shells = geo => { const m = new THREE.InstancedMesh(geo, M.shell, N); m.frustumCulled = false; for (let i = 0; i < N; i++) m.setMatrixAt(i, new THREE.Matrix4()); return m; };
    const blades = () => { const m = new THREE.InstancedMesh(G.blade, M.blade, N_BLADES); m.instanceMatrix = bladeMatrices; m.frustumCulled = false; return m; };
    this.baseTop = new THREE.Mesh(G.hemiTop, M.felt); this.baseBot = new THREE.Mesh(G.hemiBot, M.felt);
    this.rims = [new THREE.Mesh(G.rimUp, M.blade), blades(), new THREE.Mesh(G.rimDown, M.blade), blades()];
    this.rims[3].scale.y = -1;
    this.bottom.add(this.baseBot, shells(G.hemiBot), this.rims[0], this.rims[1]);
    this.cap = new THREE.Mesh(G.cap, M.cap); this.cap.position.y = -0.002; this.bottom.add(this.cap);
    this.lid.add(this.baseTop, shells(G.hemiTop), this.rims[2], this.rims[3], new THREE.Mesh(G.dome, M.dome));
    this.front = dirAz(AZ0);
    this.axis = new THREE.Vector3(-this.front.z, 0, this.front.x);     // dobradiça: a frente sobe
    this.hinge = this.front.clone().multiplyScalar(-1);
    this.inner = null;
  }
  setOpen(o) {
    const q = this.lid.quaternion.setFromAxisAngle(this.axis, OPEN_A * o);
    this.lid.position.copy(this.hinge).sub(this.hinge.clone().applyQuaternion(q)).add(V(0, OPEN_LIFT * o, 0));
    this.open = o;
    for (const r of this.rims) r.visible = o > 0.0005;
  }
}
const _v = new THREE.Vector3(), _q = new THREE.Quaternion();
class World {
  constructor(k, hasInner) {
    this.k = k;
    const M = this.M = makeLevel();
    const g = this.group = new THREE.Group();
    const add = (geo, mat, cast = false, recv = false) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; g.add(m); return m; };
    this.casters = [];
    const cast = m => { this.casters.push(m); return m; };
    add(G.floor, M.floor, false, true);
    add(G.wall, M.wall, false, true);
    cast(add(G.netWhite, M.white)); cast(add(G.netDark, M.dark));
    cast(add(G.fenceFrame, M.white)); add(G.fencePanels, M.mesh);
    cast(add(G.lampPosts, M.white)); add(G.lampHeads, M.lamp);
    cast(add(G.props, M.prop));
    PLAYERS.forEach((p, i) => {
      const pg = new THREE.Group(), F2 = G[p.g];
      for (const [geo, mat] of [[F2.skin, M.skin], [F2.shirt, M.shirts[i]], [F2.shorts, M.shorts], [F2.shoe, M.shoe], [F2.racket, M.dark]]) { const m = new THREE.Mesh(geo, mat); pg.add(m); cast(m); }
      pg.add(new THREE.Mesh(F2.strings, M.mesh));
      pg.position.set(p.x, 0, p.z); pg.rotation.y = p.ry; g.add(pg);
    });
    this.ball = new Ball();
    this.ball.group.scale.setScalar(RB);
    this.ball.cap.visible = !hasInner;
    cast(this.ball.baseTop); cast(this.ball.baseBot);
    g.add(this.ball.group);
    this.scale = Math.pow(S, k);                           // tamanho deste mundo em relação ao principal
  }
  update(tau) {
    const b = this.ball;
    bobOf(tau, b.group.position);
    b.group.quaternion.copy(qAz(PSI)).multiply(_q.setFromAxisAngle(SPIN_AXIS, spinOf(tau)));
    b.setOpen(OPEN_OF(tau));
    b.M.bu.uB.value = B_OF(tau); b.M.bu.uGlow.value = GLOW_OF(tau); b.M.bu.uLin.value = L_OF(tau - T);
    b.slot.visible = b.open > 0.0005;
    this.M.lu.uL.value = L_OF(tau);
    this.glow = GLOW_OF(tau);
  }
  afterMatrices() { // clarão da bola sobre a rede e o piso deste nível (em espaço de câmera)
    const lu = this.M.lu;
    lu.uGlowPos.value.setFromMatrixPosition(this.ball.group.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    lu.uGlowR.value = RB * this.scale * 2.4;
    lu.uGlowCol.value.setRGB(0.55, 0.95, 0.12).multiplyScalar(0.55 * this.glow);
  }
}
const W0 = new World(0, true), W1 = new World(1, false), WM = new World(-1, true);
W0.ball.slot.add(W1.group);
scene.add(W0.group, WM.group);
// o mundo de fora é posto de modo que a bola dele (aberta, no estado final) envolva o mundo principal
W0.update(T); scene.updateMatrixWorld(true);
const C_T = W1.group.matrixWorld.clone();                  // passagem de nível: principal -> de dentro, no fim do laço
WM.group.matrixAutoUpdate = false; WM.group.matrix.copy(C_T).invert();

// ================================================================ CÂMERA EM LAÇO
// Coordenadas que não dependem de escala: distância ao ponto fixo (em log), azimute, elevação,
// desvio do alvo em frações da distância, rolagem, campo, desfoque. Uma volta = distância x S e azimute + PSI.
//          t      d     az    el     wx     wy   roll  fov    K     foco
const CAM = [
  [0.00, 50.0, -38.0, 15.5,  0.00, -0.030,  -9.0, 38, 0.010, 0.980],
  [0.50, 29.0, -34.0, 14.5,  0.02, -0.030, -12.0, 38, 0.018, 0.960],
  [1.00, 15.5, -27.0, 18.0,  0.03, -0.010,  -9.0, 39, 0.026, 0.970],
  [1.60,  8.0, -19.0, 18.0,  0.01,  0.010,  -3.0, 39, 0.032, 0.980],
  [2.40,  4.6,  -9.0, 13.5, -0.04,  0.030,   5.0, 40, 0.038, 1.000],
  [3.20,  3.3,   1.0,  9.0, -0.07,  0.020,   8.0, 41, 0.040, 1.000],
  [3.90,  2.7,   9.0,  6.5, -0.05,  0.020,   9.0, 43, 0.036, 1.000],
  [4.50,  2.15, 50.0,  5.0,  0.00,  0.020,   1.0, 45, 0.032, 1.000],   // a órbita: o soco do meio do filme
  [5.10,  1.85, 92.0,  6.5,  0.05,  0.010, -11.0, 45, 0.032, 1.000],
  [5.70,  1.72, 120.0, 10.0, 0.06,  0.000, -15.0, 42, 0.034, 1.000],
  [6.20,  1.58, 128.0, 12.5, 0.05, -0.020, -13.0, 39, 0.032, 1.000],
  [6.90,  1.12, 131.0, 14.0, 0.03, -0.030, -11.0, 38, 0.022, 0.995],
  [7.50,  0.78, 131.8, 15.0, 0.01, -0.030,  -9.8, 38, 0.014, 0.985],
];
function monotone(ts, vs) { // cúbica monotônica: não passa do alvo entre chaves
  const n = ts.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d[i] = (vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return t => {
    let i = 0; while (i < n - 2 && t > ts[i + 1]) i++;
    const h = ts[i + 1] - ts[i], u = (t - ts[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}
const camCurves = (() => {
  // repete as chaves uma volta para trás e uma para a frente: a emenda do laço sai contínua
  const ext = [];
  for (const turn of [-1, 0, 1]) for (const k of CAM) ext.push([k[0] + turn * T, Math.log(k[1]) + turn * Math.log(S), k[2] * DEG + turn * PSI, k[3] * DEG, k[4], k[5], k[6] * DEG, k[7], k[8], k[9]]);
  const ts = ext.map(k => k[0]);
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].map(j => monotone(ts, ext.map(k => k[j])));
})();
function camAt(t) {
  const [ld, az, el, wx, wy, roll, fov, K, foc] = camCurves.map(f => f(t));
  return { d: Math.exp(ld), az, el, wx, wy, roll, fov, K, foc };
}
const _right = new THREE.Vector3(), _tgt = new THREE.Vector3();
let camState = null;
function placeCamera(t) {
  const c = camState = camAt(t);
  camera.position.copy(F).addScaledVector(dirAz(c.az, c.el), c.d);
  _right.set(Math.sin(c.az), 0, -Math.cos(c.az));
  _tgt.copy(F).addScaledVector(_right, c.wx * c.d).addScaledVector(camera.up.set(0, 1, 0), c.wy * c.d);
  camera.lookAt(_tgt);
  camera.rotateZ(c.roll);
  camera.fov = c.fov; camera.near = 0.01 * c.d; camera.far = 4000 * c.d;
  camera.updateMatrixWorld(true);
  U.cam.value.copy(camera.position);
  // luz do feltro: sempre do alto, à direita e um pouco de frente em relação à câmera
  const toCam = dirAz(c.az);
  U.key.value.set(0, 0, 0).addScaledVector(_right, 0.5).addScaledVector(toCam, 0.3).add(V(0, 0.82, 0)).normalize();
}

// ================================================================ PÓS: desfoque de lente, brilho, acumulação, tom
const sceneRT = new THREE.WebGLRenderTarget(VW, VH, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(VW, VH) });
const dofRT = new THREE.WebGLRenderTarget(VW, VH, { type: THREE.HalfFloatType });
const accRT = new THREE.WebGLRenderTarget(VW, VH, { type: THREE.HalfFloatType });
const FS_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const MAXC = 0.042;                                         // maior raio de desfoque, em frações da altura do quadro
const dofMat = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: sceneRT.texture }, tDepth: { value: sceneRT.depthTexture }, uNear: { value: 0.1 }, uFar: { value: 100 }, uFocus: { value: 1 }, uK: { value: 0.03 }, uMaxC: { value: MAXC }, uAspect: { value: VW / VH }, uRot: { value: 0 } },
  vertexShader: FS_VERT, depthTest: false, depthWrite: false,
  fragmentShader: /* glsl */`
    #include <packing>
    varying vec2 vUv;
    uniform sampler2D tColor; uniform sampler2D tDepth;
    uniform float uNear; uniform float uFar; uniform float uFocus; uniform float uK; uniform float uMaxC; uniform float uAspect; uniform float uRot;
    float zAt(vec2 p){ return -perspectiveDepthToViewZ(texture2D(tDepth, p).x, uNear, uFar); }
    // círculo de confusão que não depende da escala do mundo: só da razão entre a distância e o foco
    float cocAt(float z){ return min(abs(uK * (z - uFocus) / z), uMaxC); }
    vec3 limpa(vec3 c){ if (c.r != c.r || c.g != c.g || c.b != c.b) return vec3(0.0); return clamp(c, vec3(0.0), vec3(24.0)); }
    void main(){
      float z = zAt(vUv), c = cocAt(z);
      vec3 acc = limpa(texture2D(tColor, vUv).rgb); float wsum = 1.0;
      const int N = 64;
      for (int i = 0; i < N; i++) {
        float fi = float(i) + 0.5, r = sqrt(fi / float(N)) * uMaxC, a = fi * 2.39996323 + uRot;
        vec2 p = vUv + vec2(cos(a) / uAspect, sin(a)) * r;
        float zi = zAt(p), ci = cocAt(zi);
        if (zi > z) ci = min(ci, c);               // o fundo não vaza por cima do que está nítido na frente
        float m = smoothstep(r - 0.0014, r + 0.0014, ci);
        acc += limpa(texture2D(tColor, p).rgb) * m; wsum += m;
      }
      gl_FragColor = vec4(acc / wsum, 1.0);
    }`,
});
const dofQuad = new FullScreenQuad(dofMat);
const bloom = new UnrealBloomPass(new THREE.Vector2(VW, VH), 0.4, 0.62, 1.05);
const accMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: dofRT.texture }, uW: { value: 1 } }, vertexShader: FS_VERT, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  fragmentShader: 'varying vec2 vUv; uniform sampler2D tDiffuse; uniform float uW; void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; c = max(c, vec3(0.0)); if (c.r != c.r || c.g != c.g || c.b != c.b) c = vec3(0.0); gl_FragColor = vec4(c * uW, 1.0); }',
});
const accQuad = new FullScreenQuad(accMat);
const outMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: accRT.texture }, uExposure: { value: 1.0 }, uSeed: { value: 0 } }, vertexShader: FS_VERT, depthTest: false, depthWrite: false,
  fragmentShader: /* glsl */`
    varying vec2 vUv; uniform sampler2D tDiffuse; uniform float uExposure; uniform float uSeed;
    vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 aces(vec3 color){
      const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      color *= uExposure / 0.6; color = inM * color; color = RRTAndODTFit(color); color = outM * color; return clamp(color, 0.0, 1.0);
    }
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 q = vUv - 0.5; float vig = 1.0 - dot(q, q) * 0.55;
      c = aces(c * vig);
      c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
      c += (h12(gl_FragCoord.xy + uSeed * 17.0) - 0.5) * 0.012;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
const outQuad = new FullScreenQuad(outMat);

// ================================================================ QUADRO
const HALTON = Array.from({ length: 64 }, (_, i) => { const h = b => { let f = 1, r = 0, n = i + 1; while (n > 0) { f /= b; r += f * (n % b); n = Math.floor(n / b); } return r; }; return [h(2) - 0.5, h(3) - 0.5]; });
const SUN_EL = 70 * DEG, SUN_AZ = 25 * DEG;                 // luz quase a pino: girar com a câmera quase não mexe nas sombras
const _c = new THREE.Vector3();
function frame(t) {
  t = ((t % T) + T) % T;
  placeCamera(t);
  W0.update(t); W1.update(t - T); WM.update(t + T);
  // as luzes giram junto com o azimute da câmera: o nível de dentro está girado PSI, e assim a emenda fecha
  const sdir = dirAz(SUN_AZ + (camState.az - AZ0), SUN_EL);
  // a sombra cobre um nível por vez: o principal, e o de dentro quando a bola abre (o principal já está no escuro)
  const child = t > 6.18;
  sun.shadow.intensity = child ? smooth((t - 6.2) / 0.12) : 1 - smooth((t - 5.3) / 0.8);
  scene.updateMatrixWorld(true);
  const sc = child ? S : 1;
  if (child) _c.setFromMatrixPosition(W1.group.matrixWorld); else _c.set(0, 0, 0);
  sun.position.copy(_c).addScaledVector(sdir, 60 * sc); sun.target.position.copy(_c);
  const sh = sun.shadow.camera; sh.left = sh.bottom = -27 * sc; sh.right = sh.top = 27 * sc; sh.near = 5 * sc; sh.far = 130 * sc; sh.updateProjectionMatrix();
  sun.shadow.normalBias = 0.03 * sc;
  for (const m of W0.casters) m.castShadow = !child;
  for (const m of W1.casters) m.castShadow = child;
  for (const m of WM.casters) m.castShadow = false;
  W0.ball.baseTop.castShadow = W0.ball.baseBot.castShadow = !child;
  scene.updateMatrixWorld(true);
  W0.afterMatrices(); W1.afterMatrices(); WM.afterMatrices();
}
function renderSub(i, n) {
  const [jx, jy] = n > 1 ? HALTON[i % 64] : [0, 0];
  camera.setViewOffset(VW, VH, jx, jy, VW, VH);
  renderer.setRenderTarget(sceneRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  renderer.render(scene, camera);
  dofMat.uniforms.uNear.value = camera.near; dofMat.uniforms.uFar.value = camera.far;
  dofMat.uniforms.uFocus.value = camState.foc * camState.d; dofMat.uniforms.uK.value = camState.K; dofMat.uniforms.uRot.value = i * 2.0;
  renderer.setRenderTarget(dofRT); dofQuad.render(renderer);
  if (!Q.has('nobloom')) bloom.render(renderer, null, dofRT, 0, false);
  accMat.uniforms.uW.value = 1 / n;
  renderer.setRenderTarget(accRT); accQuad.render(renderer);
}
function render(t, n = SUB) {
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let i = 0; i < n; i++) {
    frame(t + ((i + 0.5) / n - 0.5) * SHUTTER / FPS);
    renderSub(i, n);
  }
  outMat.uniforms.uSeed.value = Math.round(t * FPS) % 997;
  outMat.uniforms.tDiffuse.value = DBG === 'scene' ? sceneRT.texture : DBG === 'dof' ? dofRT.texture : accRT.texture;
  renderer.setRenderTarget(null); outQuad.render(renderer);
}

// ---------------------------------------------------------------- momentos-chave (cards)
const KEYS = [
  { id: '01-saida-da-bola', t: 0.0 },
  { id: '02-por-baixo-da-tampa', t: 0.4 },
  { id: '03-a-quadra', t: 1.0 },
  { id: '04-descida-ate-a-rede', t: 2.4 },
  { id: '05-bola-sobre-a-rede', t: 3.6 },
  { id: '06-orbita', t: 4.7 },
  { id: '07-luzes-apagam', t: 5.7 },
  { id: '08-a-bola-acende', t: 6.5 },
  { id: '09-a-bola-abre', t: 7.3 },
  { id: '10-outra-quadra', t: 7.9 },
];
const DURATION = T;

// conferência da emenda: a câmera do fim, vista do mundo de dentro, tem que ser a câmera do começo
{
  placeCamera(0); const p0 = camera.position.clone().applyMatrix4(C_T);
  placeCamera(T - 1e-9); const err = p0.distanceTo(camera.position) / camState.d;
  console.log('[cena] emenda do laço: erro relativo de posição ' + err.toExponential(2));
}

window.KEYS = KEYS;
window.DURATION = DURATION;
window.renderKey = i => { render(KEYS[i].t); return KEYS[i].id; };
window.renderAt = (t, n) => { render(t, n); return t; };
const dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida';
if (Q.has('t')) render(Number(Q.get('t'))); else render(KEYS[Number(Q.get('key') ?? 2)].t);
window.ready = true;
