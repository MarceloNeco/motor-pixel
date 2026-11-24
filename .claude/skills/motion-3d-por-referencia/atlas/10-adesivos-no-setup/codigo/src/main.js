// adesivos-no-setup: uma caixa chega, é coberta de adesivos, estoura aberta, e cada equipamento
// que sai dela (headset, notebook, teclado) ganha os próprios adesivos e uma frase.
// Método (estrutura, ritmo, física do movimento e sistema visual) medido na referência "Stamp On Intro";
// objetos, adesivos, textos e a ideia de tudo sair da caixa são nossos. Tudo procedural, em three.js.
import * as THREE from 'three';
import { buildStickers, FONTES, sheet } from './adesivos.js';
import { buildBox, buildHeadset, buildNotebook, buildKeyboard, stickerMesh, setAniso } from './objetos.js';

const VW = 1920, VH = 1080, PI = Math.PI, RAD = PI / 180;
const q = new URLSearchParams(location.search);
const SS = Number(q.get('ss') ?? 2);                       // superamostragem (2 = desenha em 4K e reduz)
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo = x => 1 - Math.pow(1 - clamp(x), 3);
const ei = x => clamp(x) ** 3;
const eio = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const back = (x, s = 1.7) => { x = clamp(x); const y = x - 1; return 1 + (s + 1) * y * y * y + s * y * y; };
const decay = (dt, f, d) => dt < 0 ? 0 : Math.exp(-d * dt) * Math.sin(f * dt);
const raw = hex => { const n = parseInt(hex.slice(1), 16); return new THREE.Vector3((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255); };

// ---------------------------------------------------------------- tokens (amostrados da referência)
const CREAM = '#f1f6cc';
const BG = {
  studio: { top: '#1a54a8', mid: '#2877be', bot: '#2f8bc9', yMid: 0.42, glow: 1.0, gh: 0.62, ge: 1.0, spot: [0.56, 0.34, 0.5], spotC: '#3a93cd', spotK: 0.45 },
  deep: { top: '#0c439a', mid: '#1554a9', bot: '#2d8cc9', yMid: 0.5, glow: 1.0, gh: 0.17, ge: 1.5, spot: [0.5, 0.5, 0.7], spotC: '#1c5fb4', spotK: 0.35 },
};

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(SS);
renderer.setSize(VW, VH, false);
renderer.autoClear = false;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById('palco').prepend(renderer.domElement);
setAniso(renderer.capabilities.getMaxAnisotropy());

// ---------------------------------------------------------------- fundo (gradiente de estúdio, em espaço de tela)
const bgScene = new THREE.Scene(), bgCam = new THREE.Camera();
const bgMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: { cTop: { value: new THREE.Vector3() }, cMid: { value: new THREE.Vector3() }, cBot: { value: new THREE.Vector3() }, cSpot: { value: new THREE.Vector3() },
    yMid: { value: 0.5 }, glow: { value: 1 }, gh: { value: 0.2 }, ge: { value: 1.5 }, spot: { value: new THREE.Vector3() }, spotK: { value: 0.4 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform vec3 cTop, cMid, cBot, cSpot, spot; uniform float yMid, glow, gh, ge, spotK; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      float y = vUv.y;
      vec3 c = mix(cMid, cTop, smoothstep(yMid, 1.0, y));
      vec2 d = (vUv - spot.xy) * vec2(16.0 / 9.0, 1.0);
      c = mix(c, cSpot, (1.0 - smoothstep(0.0, spot.z, length(d))) * spotK);
      c = mix(c, cBot, glow * pow(1.0 - smoothstep(0.0, gh, y), ge));
      c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;      // pontilhado: evita faixas no degradê
      gl_FragColor = vec4(c, 1.0);
    }`,
});
const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat); bgQuad.frustumCulled = false; bgScene.add(bgQuad);
function setBg(p) {
  const u = bgMat.uniforms;
  u.cTop.value.copy(raw(p.top)); u.cMid.value.copy(raw(p.mid)); u.cBot.value.copy(raw(p.bot)); u.cSpot.value.copy(raw(p.spotC));
  u.yMid.value = p.yMid; u.glow.value = p.glow; u.gh.value = p.gh; u.ge.value = p.ge; u.spot.value.set(...p.spot); u.spotK.value = p.spotK;
}

// ---------------------------------------------------------------- sombra de chão (mancha macia, só na cena da caixa)
const floorScene = new THREE.Scene();
const blobMat = new THREE.ShaderMaterial({
  transparent: true, depthTest: false, depthWrite: false,
  uniforms: { color: { value: raw('#0a2f86') }, opacity: { value: 0.5 }, soft: { value: 0.5 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 color; uniform float opacity, soft; varying vec2 vUv;
    void main(){ vec2 p = abs(vUv - 0.5) * 2.0; vec2 k = max(p - (1.0 - soft), 0.0) / soft; float a = 1.0 - smoothstep(0.0, 1.0, length(k)); gl_FragColor = vec4(color, a * a * opacity); }`,
});
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blobMat); blob.rotation.order = 'YXZ'; floorScene.add(blob);
function setBlob(x, y, z, sx, sz, yaw, opacity, soft) {
  blob.visible = true; blob.position.set(x, y, z); blob.rotation.set(-PI / 2, yaw * RAD, 0); blob.scale.set(sx, sz, 1);
  blobMat.uniforms.opacity.value = opacity; blobMat.uniforms.soft.value = soft;
}

// ---------------------------------------------------------------- cena principal: luz de estúdio
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, VW / VH, 0.5, 90);
const pmrem = new THREE.PMREMGenerator(renderer);
function studioEnv() {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { lo: { value: new THREE.Color('#3a6fbe') }, mid: { value: new THREE.Color('#c3c9d4') }, hi: { value: new THREE.Color('#f1f3f7') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 lo; uniform vec3 mid; uniform vec3 hi; varying vec3 vP; void main(){ vec3 c = vP.y < 0.0 ? mix(mid, lo, clamp(-vP.y * 1.5 - 0.15, 0.0, 1.0)) : mix(mid, hi, clamp(vP.y * 1.4, 0.0, 1.0)); gl_FragColor = vec4(c, 1.0); }',
  })));
  const panel = (w, h, color, k, pos) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m); };
  panel(34, 26, '#fff6ea', 4.2, [-30, 24, 26]);   // principal: alto, à esquerda, à frente
  panel(14, 30, '#eaf1ff', 1.6, [36, 8, 10]);     // tira à direita (recorte)
  panel(44, 44, '#ffffff', 1.3, [0, 46, 0]);      // teto
  panel(20, 10, '#dfe9ff', 0.9, [6, 2, 40]);      // rebatedor frontal baixo
  return pmrem.fromScene(s, 0.03).texture;
}
scene.environment = studioEnv();
scene.environmentIntensity = 1.0;
const key = new THREE.DirectionalLight('#fff1dc', 1.9);
key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.012; key.shadow.radius = 5;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight('#cfe0ff', 0.55); rim.position.set(9, 4, -6); scene.add(rim);
function setKey(tx, ty, tz, r) {
  key.target.position.set(tx, ty, tz); key.position.set(tx - 6.5, ty + 11, tz + 8.5);
  const c = key.shadow.camera; c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.near = 1; c.far = 40; c.updateProjectionMatrix();
}

// ---------------------------------------------------------------- texto (planos em pixels, atrás ou à frente dos objetos)
const textBack = new THREE.Scene(), textFront = new THREE.Scene();
const ortho = new THREE.OrthographicCamera(0, VW, VH, 0, -10, 10);
const TXT = [];
const FONT = px => `italic 900 semi-expanded ${px}px Archivo`;
function lineCanvas(str, px, outline) {
  const K = 2, f = FONT(px * K), c = document.createElement('canvas'), x = c.getContext('2d');
  x.font = f; x.letterSpacing = `${-0.018 * px * K}px`;
  const ink = x.measureText(str).width, padX = px * K * 0.3;
  c.width = Math.ceil(ink + padX * 2); c.height = Math.ceil(px * K * 1.5);
  x.font = f; x.letterSpacing = `${-0.018 * px * K}px`; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
  if (outline) { x.strokeStyle = '#ffffff'; x.lineWidth = Math.max(3, px * K * 0.006); x.strokeText(str, padX, px * K * 1.1); }
  else { x.fillStyle = CREAM; x.fillText(str, padX, px * K * 1.1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  m.scale.set(c.width / K, c.height / K, 1);
  return { mesh: m, w: c.width / K, h: c.height / K, ink: ink / K, padX: padX / K, base: px * 1.1 };
}
// bloco de linhas: y = linha de base da primeira; cada linha entra na sua hora e some na sua hora
function block({ lines, px, x, y, align = 'left', lead = 0.86, layer = 'back', tin, tout }) {
  lines.forEach((str, i) => {
    const L = lineCanvas(str, px, false);
    const left = align === 'center' ? x - L.ink / 2 : align === 'right' ? x - L.ink : x;
    L.cx = left - L.padX + L.w / 2; L.cy = y + i * lead * px - L.base + L.h / 2; L.px = px;
    L.tin = tin[i]; L.tout = Array.isArray(tout) ? tout[i] : tout;
    (layer === 'back' ? textBack : textFront).add(L.mesh); TXT.push(L);
  });
}
// palavra gigante que atravessa a tela na troca de cena: cheia até tOutline, depois só contorno
const WIPES = [];
function wipe({ text, px, y, t0, t1, x0, x1, tOutline, layer = 'front' }) {
  const a = lineCanvas(text, px, false), b = lineCanvas(text, px, true);
  for (const L of [a, b]) (layer === 'back' ? textBack : textFront).add(L.mesh);
  WIPES.push({ a, b, y, t0, t1, x0, x1, tOutline });
}
function updateText(t, tw = t) {
  for (const L of TXT) {
    const dt = t - L.tin; L.mesh.visible = dt >= 0 && t < L.tout;
    if (!L.mesh.visible) continue;
    const k = 1 - eo(dt / 0.1);                       // sobe 22% do corpo e assenta em 100 ms
    L.mesh.position.set(L.cx, VH - (L.cy + k * 0.22 * L.px), 0);
  }
  for (const W of WIPES) {
    const on = tw >= W.t0 && tw < W.t1, x = lerp(W.x0, W.x1, seg(tw, W.t0, W.t1));
    for (const [L, vis] of [[W.a, on && tw < W.tOutline], [W.b, on && tw >= W.tOutline]]) {
      L.mesh.visible = vis; if (vis) L.mesh.position.set(x - L.padX + L.w / 2, VH - (W.y - L.base + L.h / 2), 0);
    }
  }
}

// ---------------------------------------------------------------- partida: fontes, adesivos, objetos
for (const f of [...FONTES, FONT(100)]) await document.fonts.load(f, 'FRÁGIL São Çé valeu.');
const ST = buildStickers();
const box = buildBox(), hs = buildHeadset(), nb = buildNotebook(), kb = buildKeyboard();
const mkRoot = o => { const r = new THREE.Group(); r.rotation.order = 'YXZ'; r.add(o.group); scene.add(r); return r; };
const boxR = mkRoot(box), hsR = mkRoot(hs), nbR = mkRoot(nb), kbR = mkRoot(kb);
const ROOTS = [boxR, hsR, nbR, kbR];
function place(r, x, y, z, { yaw = 0, pitch = 0, roll = 0, s = 1 } = {}) { r.visible = true; r.position.set(x, y, z); r.rotation.set(pitch * RAD, yaw * RAD, roll * RAD); r.scale.setScalar(s); }

// adesivos: (âncora, arte, u, v, largura, giro em graus, instante do carimbo)
const STAMPS = [];
function stick(owner, anchor, name, u, v, w, rot, ts) {
  const c = ST[name], m = stickerMesh(name, c);
  m.position.set(u, v, 0.0035 + STAMPS.length * 0.0005); m.rotation.z = rot * RAD; m.renderOrder = 10 + STAMPS.length;
  m.userData = { w, h: w * c.height / c.width, ts, owner }; anchor.add(m); STAMPS.push(m);
}
const popK = dt => dt < 0.09 ? lerp(1.42, 0.955, eo(dt / 0.09)) : dt < 0.2 ? lerp(0.955, 1, eio((dt - 0.09) / 0.11)) : 1;
function updateStamps(t) {
  for (const m of STAMPS) { const { w, h, ts } = m.userData, dt = t - ts; m.visible = dt >= 0; if (m.visible) { const k = popK(dt); m.scale.set(w * k, h * k, 1); } }
}
// o "tranco" que o objeto leva a cada carimbo (0 em repouso)
const kick = (t, owner) => STAMPS.reduce((a, m) => { const dt = t - m.userData.ts; return a + (m.userData.owner === owner && dt >= 0 && dt < 0.18 ? Math.sin(PI * dt / 0.18) * (1 - dt / 0.18) : 0); }, 0);

const ratchet = (t, owner, t0, deg) => STAMPS.reduce((a, m) => a + (m.userData.owner === owner && m.userData.ts >= t0 ? deg * eo((t - m.userData.ts) / 0.32) : 0), 0);

// caixa
stick('box', box.A.front, 'fragil', -0.98, 0.5, 2.05, -3, 1.42);
stick('box', box.A.right, 'ladoCima', -0.95, -0.22, 1.2, 4, 1.78);
stick('box', box.A.right, 'carinha', 1.02, 0.22, 1.05, 10, 2.5);
stick('box', box.A.topFront, 'bora', -1.15, -1.0, 1.45, 6, 2.76);
stick('box', box.A.topBack, 'valeu', 0.95, 1.0, 1.5, -8, 3.02);
stick('box', box.A.front, 'nota10', 0.74, 0.9, 1.05, -8, 3.28);
stick('box', box.A.topBack, 'massa', -1.05, 1.02, 1.45, 5, 3.54);
stick('box', box.A.front, 'saoPaulo', -1.2, -0.66, 1.6, 4, 3.8);
stick('box', box.A.front, 'planeta', 1.3, -0.28, 1.35, 8, 4.58);
stick('box', box.A.topFront, 'zeroBug', 1.32, -1.02, 0.9, 12, 4.98);
stick('box', box.A.front, 'raio', 0.32, -0.86, 0.72, -10, 5.36);
stick('box', box.A.right, 'feitoBrasil', 0.4, -0.74, 1.0, -7, 5.72);
// headset (concha direita)
stick('hs', hs.A, 'ctrlS', 0.0, 0.2, 0.46, -6, 10.3);
stick('hs', hs.A, 'carinha', -0.18, -0.08, 0.33, -8, 10.75);
stick('hs', hs.A, 'planeta', 0.17, -0.09, 0.37, 10, 11.2);
stick('hs', hs.A, 'raio', 0.0, -0.31, 0.22, 0, 11.65);
// notebook (tampa)
stick('nb', nb.A, 'feitoBrasil', -0.9, 0.38, 0.95, -8, 17.0);
stick('nb', nb.A, 'cafe', 0.8, 0.42, 1.0, 6, 17.35);
stick('nb', nb.A, 'valeu', -0.15, -0.5, 1.25, 4, 17.7);
stick('nb', nb.A, 'zeroBug', 1.08, -0.5, 0.68, 0, 18.05);
stick('nb', nb.A, 'nota10', -1.02, -0.62, 0.78, -12, 18.4);
stick('nb', nb.A, 'cursor', 0.05, 0.36, 0.4, 0, 18.75);
// teclado (moldura de cima)
stick('kb', kb.A, 'massa', -0.95, 0, 0.6, 3, 24.25);
stick('kb', kb.A, 'raio', -0.25, 0, 0.24, 0, 24.65);
stick('kb', kb.A, 'nota10', 0.42, 0, 0.5, -4, 25.05);

// ---------------------------------------------------------------- textos (copy.txt é o contrato)
block({ lines: ['SEU SETUP', 'CHEGOU.'], px: 156, x: 140, y: 204, tin: [0.66, 0.94], tout: 2.3 });
wipe({ text: 'OUÇA', px: 620, y: 760, t0: 7.2, t1: 8.34, x0: 1980, x1: -1700, tOutline: 8.2, layer: 'back' });
block({ lines: ['OUÇA', 'CADA', 'DETALHE'], px: 250, x: 960, y: 372, align: 'center', lead: 0.84, layer: 'front', tin: [8.32, 8.58, 8.84], tout: 10.0 });
block({ lines: ['SOM', 'NO TALO'], px: 150, x: 1000, y: 528, tin: [12.62, 12.88], tout: [14.38, 14.3] });
wipe({ text: 'CRIE', px: 620, y: 760, t0: 14.3, t1: 15.14, x0: 1980, x1: -1500, tOutline: 15.0, layer: 'back' });
block({ lines: ['CRIE', 'DO SEU', 'JEITO'], px: 250, x: 960, y: 372, align: 'center', lead: 0.84, layer: 'front', tin: [15.14, 15.4, 15.66], tout: 16.8 });
block({ lines: ['DE', 'QUALQUER', 'LUGAR'], px: 124, x: 170, y: 456, tin: [19.92, 20.14, 20.36], tout: [21.46, 21.4, 21.34] });
wipe({ text: 'TECLE', px: 620, y: 760, t0: 21.22, t1: 22.14, x0: 1980, x1: -2000, tOutline: 22.0, layer: 'back' });
block({ lines: ['TECLE', 'SEM FREIO'], px: 250, x: 960, y: 318, align: 'center', lead: 0.84, tin: [22.15, 22.42], tout: 24.0 });
block({ lines: ['DEIXE TUDO', 'COM A', 'SUA CARA'], px: 124, x: 130, y: 456, tin: [26.4, 26.66, 26.92], tout: 99 });

// ---------------------------------------------------------------- câmera
const _t = new THREE.Vector3(), _d = new THREE.Vector3();
function cam(fov, px, py, pz, lx, ly, lz) { camera.up.set(0, 1, 0); camera.fov = fov; camera.position.set(px, py, pz); camera.lookAt(lx, ly, lz); camera.updateProjectionMatrix(); }
// câmera presa a uma âncora (macro): mira no ponto `off` da face, vista da direção `dir`, tudo no espaço da âncora
function aim(a, off, dir, dist, fov, up) {
  a.updateWorldMatrix(true, false);
  _t.set(off[0], off[1], off[2] ?? 0).applyMatrix4(a.matrixWorld); _d.set(...dir).transformDirection(a.matrixWorld);
  camera.position.copy(_t).addScaledVector(_d, dist);
  if (up) camera.up.set(...up).transformDirection(a.matrixWorld); else camera.up.set(0, 1, 0);
  camera.fov = fov; camera.lookAt(_t); camera.updateProjectionMatrix();
  return _t;
}

// ---------------------------------------------------------------- os planos (cada um é um corte seco)
const FLOOR = -1.35;
const SHOTS = [
  { id: '1a-caixa-chega', t0: 0, t1: 2.3, run(u, t) {
    setBg(BG.studio);
    const fall = u < 0.4 ? 9.5 * (1 - (u / 0.4) ** 2) : 0;
    const b1 = u >= 0.4 && u < 0.72 ? 0.42 * Math.sin(PI * (u - 0.4) / 0.32) : 0, b2 = u >= 0.72 && u < 0.9 ? 0.08 * Math.sin(PI * (u - 0.72) / 0.18) : 0;
    const y = fall + b1 + b2, k = kick(t, 'box'), yaw = -18 + 5 * u + ratchet(t, 'box', 0, 6);
    place(boxR, 0.5, y + 0.1 * k, 0, { yaw, roll: (u < 0.4 ? 9 * (1 - u / 0.4) : 0) + decay(u - 0.4, 24, 8) * 3.5, pitch: decay(u - 0.4, 19, 8) * -2.5, s: 1 + 0.03 * k });
    const kz = 1 - 0.02 * u, az = 0.035 * u;                    // a câmera avança e contorna devagar
    cam(28, (7.9 * Math.cos(az) + 10.6 * Math.sin(az)) * kz, 6.6 * kz, (10.6 * Math.cos(az) - 7.9 * Math.sin(az)) * kz, -1.25, 0.22, 0);
    setKey(0.5, 0, 0, 6);
    setBlob(0.5, FLOOR, 0, 6.6 + y * 0.5, 5.8 + y * 0.5, yaw, 0.62 * (1 - clamp(y / 11)), 0.5 + 0.3 * clamp(y / 3));
  } },
  { id: '1b-adesivos', t0: 2.3, t1: 4.3, run(u, t) {
    setBg(BG.studio);
    const k = kick(t, 'box'), yaw = -52 + 19 * u + ratchet(t, 'box', 2.3, 4);
    place(boxR, 0, 0.9 + 0.09 * Math.sin(u * 2.6) + 0.08 * k, 0, { yaw, roll: 3.5 * Math.cos(u * 1.9), pitch: -2 + 2.5 * Math.sin(u * 1.4 + 1), s: 1 + 0.03 * k });
    cam(26, 7.6, 7.3, 9.6, 0.75, 0.55, 0.4);
    setKey(0, 0.9, 0, 5);
    setBlob(0.1, FLOOR - 2.2, -0.4, 8.6, 7.8, yaw, 0.42, 0.72);
  } },
  { id: '1c-macro-caixa', t0: 4.3, t1: 6.2, run(u, t) {
    setBg(BG.studio);
    const k = kick(t, 'box');
    place(boxR, 0, 0, 0, { yaw: -30 + 3.2 * u, roll: 0, s: 1 + 0.012 * k });
    aim(box.A.front, [1.46 - 0.1 * u, 0.42, 0], [0.5, 0.52, 0.72], 6.7 - 0.22 * u, 17);
    setKey(0, 0, 0, 4);
    blob.visible = false;
  } },
  { id: '1d-caixa-estoura', t0: 6.2, t1: 8.2, run(u, t) {
    setBg(BG.studio);
    const open = seg(u, 1.02, 1.3), rec = Math.sin(PI * seg(u, 1.0, 1.36));
    const rum = seg(u, 0.35, 0.95) ** 2 * (1 - seg(u, 1.02, 1.12));       // a caixa treme antes de estourar
    const by = 0.7 + 0.07 * Math.sin(u * 2.6) - 0.62 * rec + 0.07 * rum * Math.sin(u * 83);
    place(boxR, 0.1 * rum * Math.sin(u * 71), by, 0, { yaw: -30 + 17 * u, roll: 2 + decay(u - 1.02, 30, 9) * 4 + 4 * rum * Math.sin(u * 64), pitch: 2.6 * rum * Math.sin(u * 57), s: 1 + 0.04 * rec });
    box.setTape(1 - seg(u, 0.8, 1.02));
    box.setFlaps(2.2 * back(open, 2.4), 2.0 * back(seg(u, 1.05, 1.34), 2.0));
    const up = eo(seg(u, 1.1, 1.78));
    if (u >= 1.1) place(hsR, 0, by + lerp(-0.1, 5.5, up), 0, { yaw: 30 + 520 * (1 - eo(seg(u, 1.1, 1.95))), roll: -10, pitch: 6, s: lerp(0.7, 1.15, up) });
    const lift = eio(seg(u, 1.12, 1.8));
    const jolt = decay(u - 1.02, 34, 7);                         // tranco de câmera no estouro
    cam(28, 7.7 + 0.22 * jolt, lerp(5.6, 6.6, lift) + 0.3 * jolt, 10.6, 0, lerp(0.7, 3.4, lift) + 0.16 * jolt, 0);
    setKey(0, lerp(0.7, 3.5, lift), 0, 6.5);
    setBlob(0.1, FLOOR - 2.2, -0.4, 8.6, 7.8, -30 + 17 * u, 0.42, 0.72);
  } },
  { id: '2a-headset-titulo', t0: 8.2, t1: 10.0, run(u) {
    setBg(BG.deep);
    place(hsR, 0.1, lerp(-6.2, -0.25, back(seg(u, 0, 0.5), 1.6)) + 0.08 * Math.sin(u * 2.4), 0, { yaw: 20 + 460 * (1 - eo(seg(u, 0, 0.85))) + 38 * u, roll: -11 + 3 * Math.sin(u * 1.7) + 24 * (1 - eo(seg(u, 0, 0.6))), pitch: 7, s: 1.72 });
    cam(26, 0, 0.1, 11.5, 0, 0.05, 0);
    setKey(0, 0, 0, 4.2); blob.visible = false;
  } },
  { id: '2b-macro-concha', t0: 10.0, t1: 12.4, run(u, t) {
    setBg(BG.deep);
    const k = kick(t, 'hs');
    place(hsR, 0, 0, 0, { yaw: -68 + 3.6 * u, roll: -6, pitch: 4, s: 1.3 * (1 + 0.02 * k) });
    aim(hs.A, [0.02 * u, -0.03, 0], [0.26 - 0.04 * u, 0.1, 0.96], 4.3 - 0.12 * u, 18);
    setKey(0, 0, 0, 3); blob.visible = false;
  } },
  { id: '2c-headset-frase', t0: 12.4, t1: 15.0, run(u) {
    setBg(BG.deep);
    const out = ei(seg(u, 1.98, 2.55));
    place(hsR, -2.9 + 8.6 * out, -0.15 + 0.09 * Math.sin(u * 2.3) + 1.2 * out, 0, { yaw: -20 - 38 * u - 360 * out, roll: -9 + 3 * Math.sin(u * 1.6) + 30 * out, pitch: 6, s: 1.62 * lerp(0.86, 1, back(seg(u, 0, 0.3), 2)) });
    cam(26, 0, 0.1, 11.5, 0, 0.05, 0);
    setKey(-2.9 + 8.6 * out, 0, 0, 4); blob.visible = false;
  } },
  { id: '3a-notebook-titulo', t0: 15.0, t1: 16.8, run(u) {
    setBg(BG.deep);
    const e = eo(seg(u, 0, 0.75));
    nb.setOpen(1.84 * back(seg(u, 0.1, 0.7), 1.3));
    place(nbR, -0.2, lerp(-8.5, -2.05, back(seg(u, 0, 0.55), 1.4)) + 0.07 * Math.sin(u * 2.3), 0, { yaw: lerp(330, -10, e) - 12 * u, pitch: lerp(40, 9, e), roll: lerp(-30, 2, e) + 2 * Math.sin(u * 1.8), s: 1.72 });
    cam(26, 0, 0.1, 11.5, 0, 0.05, 0);
    setKey(0, 0, 0, 5); blob.visible = false;
  } },
  { id: '3b-macro-tampa', t0: 16.8, t1: 19.4, run(u, t) {
    setBg(BG.deep);
    const k = kick(t, 'nb');
    place(nbR, 0, 0, 0, { yaw: 180 - 8 + 2.6 * u, pitch: -4, s: 1 + 0.015 * k });
    aim(nb.A, [0.12 - 0.07 * u, 0.02, 0], [0.22 - 0.05 * u, -0.62, 0.76], 5.3 - 0.16 * u, 22, [0, 1, 0]);
    setKey(0, 0, 0, 2.6); blob.visible = false;
  } },
  { id: '3c-notebook-abre', t0: 19.4, t1: 22.0, run(u) {
    setBg(BG.deep);
    const out = ei(seg(u, 1.98, 2.5));
    nb.setOpen(1.88 * back(seg(u, 0.12, 0.85), 1.1));
    place(nbR, lerp(1.8, 3.05, eio(seg(u, 0.35, 1.6))) + 9 * out, -0.95 + 0.07 * Math.sin(u * 2.3) + 1.8 * out, 0, { yaw: lerp(204, 30, eio(seg(u, 0.45, 1.95))) - 5 * u - 260 * out, pitch: 10 + 4 * Math.sin(u * 1.5), roll: 24 * out, s: 1.3 });
    cam(26, 0, 0.5, 11.5, 0, 0.1, 0);
    setKey(3.05, 0, 0, 4.4); blob.visible = false;
  } },
  { id: '4a-teclado-titulo', t0: 22.0, t1: 24.0, run(u) {
    setBg(BG.deep);
    const e = eo(seg(u, 0, 0.75));
    place(kbR, 0.1, lerp(8.5, -1.2, back(seg(u, 0, 0.55), 1.5)) + 0.08 * Math.sin(u * 2.4), 0, { yaw: lerp(-380, -13, e) + 9 * Math.sin(u * 1.5), pitch: lerp(-10, 62, e) + 3.5 * Math.sin(u * 2.1), roll: lerp(40, 6, e), s: 1.6 });
    for (const key_ of kb.keys) { const w = ((u - 0.9) * 5.4 - (key_.x + 1.6) - key_.r * 0.12) % 3.6; kb.press(key_, u > 0.9 && w > 0 && w < 0.7 ? Math.sin(PI * w / 0.7) : 0); }
    cam(26, 0, 0.1, 11.5, 0, 0.05, 0);
    setKey(0, 0, 0, 4); blob.visible = false;
  } },
  { id: '4b-macro-teclado', t0: 24.0, t1: 26.0, run(u, t) {
    setBg(BG.deep);
    const k = kick(t, 'kb');
    place(kbR, 0, 0, 0, { yaw: -6 + 2 * u, pitch: 8, s: 1 + 0.015 * k });
    kb.keys.forEach((key_, i) => { const ph = ((i * 0.6180339) % 1) * 1.8, w = u - 0.1 - ph; kb.press(key_, key_.r > 0 && key_.r < 4 && i % 3 === 0 && w > 0 && w < 0.15 ? Math.sin(PI * w / 0.15) : 0); });
    aim(kb.A, [-0.56 + 0.22 * u, -0.12, 0], [0.18, -0.74, 0.65], 2.9 - 0.05 * u, 24);
    setKey(0, 0, 0, 2.4); blob.visible = false;
  } },
  { id: '5-final', t0: 26.0, t1: 30.0, run(u) {
    setBg(BG.deep);
    const f = (n, w = 1.7) => 0.12 * Math.sin(u * w + n);
    box.setTape(0); box.setFlaps(2.15, 1.95);
    const pop = d => lerp(0.5, 1, back(seg(u, d, d + 0.36), 2.2)), rise = d => -1.6 * (1 - eo(seg(u, d, d + 0.36)));
    place(boxR, 2.35, -2.0 + f(0, 1.5) + rise(0), -1.2, { yaw: -32 + 60 * (1 - eo(seg(u, 0, 0.6))) + 9 * Math.sin(u * 0.9), roll: 2 + 2.5 * Math.sin(u * 1.3), s: 0.6 * pop(0) });
    nb.setOpen(1.86 * back(seg(u, 0.1, 0.6), 1.2));
    place(nbR, 2.15, 0.55 + f(1.3) + rise(0.08), 0.3, { yaw: 200 + 11 * Math.sin(u * 1.1) - 110 * (1 - eo(seg(u, 0.08, 0.7))), pitch: 4 + 3 * Math.sin(u * 1.4), roll: -5 + 2 * Math.sin(u * 1.7), s: 0.78 * pop(0.08) });
    place(hsR, 4.4, 1.2 + f(2.6, 1.9) + rise(0.16), 0.3, { yaw: -78 + 24 * Math.sin(u * 1.0 + 0.6) - 260 * (1 - eo(seg(u, 0.16, 0.8))), roll: -10 + 4 * Math.sin(u * 1.6), pitch: 5, s: 0.84 * pop(0.16) });
    place(kbR, 4.1, -1.6 + f(3.9, 1.6) + rise(0.24), 1.2, { yaw: -16 + 9 * Math.sin(u * 1.1), pitch: 58 + 5 * Math.sin(u * 1.7), roll: -22 + 3 * Math.sin(u * 1.3) - 70 * (1 - eo(seg(u, 0.24, 0.85))), s: 0.72 * pop(0.24) });
    cam(28, 0.25 * u, 0.6, 14 - 0.2 * u, 0, 0, 0);
    setKey(3.6, 0, 0.5, 7); blob.visible = false;
  } },
];
const DURATION = 30;

// t = instante do sub-quadro (objetos, câmera, palavra gigante); tb = instante-base do quadro (texto e carimbos, que entram secos)
function frame(t, tb = t) {
  for (const r of ROOTS) r.visible = false;
  blob.visible = false;
  box.setFlaps(0); box.setTape(1); nb.setOpen(0); for (const k of kb.keys) kb.press(k, 0);
  updateStamps(tb);
  const s = SHOTS.find(s => t >= s.t0 && t < s.t1) ?? SHOTS[SHOTS.length - 1];
  s.run(t - s.t0, t);
  updateText(tb, t);
}
function render() {
  renderer.clear();
  renderer.render(bgScene, bgCam);
  renderer.render(floorScene, camera);
  renderer.render(textBack, ortho);
  renderer.clearDepth();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(textFront, ortho);
}

// momentos-chave = os cards de aprovação
const KEYS = [
  { id: '01-caixa-chega', t: 2.05 },
  { id: '02-adesivos-na-caixa', t: 4.1 },
  { id: '03-macro-da-caixa', t: 6.0 },
  { id: '04-a-caixa-estoura', t: 7.52 },
  { id: '05-headset-titulo', t: 9.6 },
  { id: '06-macro-da-concha', t: 12.2 },
  { id: '07-headset-frase', t: 13.6 },
  { id: '08-notebook-titulo', t: 16.5 },
  { id: '09-macro-da-tampa', t: 19.2 },
  { id: '10-notebook-abre', t: 21.1 },
  { id: '11-teclado-titulo', t: 23.4 },
  { id: '12-macro-do-teclado', t: 25.6 },
  { id: '13-final', t: 29.0 },
];

window.KEYS = KEYS;
window.DURATION = DURATION;
window.SHOTS = SHOTS.map(s => ({ id: s.id, t0: s.t0, t1: s.t1 }));
window.renderKey = i => { window.renderAt(KEYS[i].t); return KEYS[i].id; };
window.renderAt = t => { acc.style.display = 'none'; frame(t); render(); return t; };
// janelas com movimento rápido (queda, estouro, palavras gigantes, entradas): só nelas o quadro soma sub-quadros
const FAST = [[0, 0.62], [6.6, 9.05], [14.2, 15.8], [19.4, 20.4], [21.2, 22.8], [26.0, 26.75]];
const acc = document.createElement('canvas'); acc.width = VW * SS; acc.height = VH * SS; acc.style.display = 'none';
document.getElementById('palco').append(acc);
const accCtx = acc.getContext('2d');
window.renderFrame = (i, fps, blur = true) => {
  const t = i / fps, n = blur && FAST.some(([a, b]) => t >= a && t < b) ? 16 : 1;
  if (n === 1) return window.renderAt(t);
  for (let k = 0; k < n; k++) {           // obturador de 180°: meio quadro, sempre para a frente (nunca atravessa um corte)
    frame(t + (k + 0.5) / n * 0.5 / fps, t); render();
    accCtx.globalAlpha = 1 / (k + 1); accCtx.drawImage(renderer.domElement, 0, 0);
  }
  acc.style.display = 'block';
  return t;
};
window.stickerSheet = () => sheet(ST).toDataURL('image/png');
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida';
if (q.has('t')) window.renderAt(Number(q.get('t'))); else window.renderKey(Number(q.get('key') ?? 0));
window.ready = true;
