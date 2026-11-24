// duelo-no-entardecer: um duelo aéreo ao pôr do sol sobre o mar.
// Tudo procedural: aviões, nuvens, mar, céu e pintura gerados em código, sem modelos nem imagens.
// Toda a cena é função do tempo: renderAt(t) recalcula o quadro inteiro, sem estado acumulado.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const VW = 1920, VH = 1080, FPS = 30, DURATION = 14;
const PI = Math.PI, D2R = PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const easeInOutSine = x => -(Math.cos(PI * clamp(x)) - 1) / 2;
const easeOutCubic = x => 1 - Math.pow(1 - clamp(x), 3);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// curva por chaves [[t, v], ...], cúbica monotônica (não passa do alvo entre chaves)
function track(keys) {
  const n = keys.length, xs = keys.map(k => k[0]), ys = keys.map(k => k[1]);
  const d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = 0; m[n - 1] = 0;
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
  }
  return t => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], u = (t - xs[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}

// ---------------------------------------------------------------- paleta (sRGB; o three converte para linear)
const C = {
  // céu
  zen: '#1d1650', high: '#4a3189', mid: '#b4639f', low: '#ff8f7a', hor: '#ffc07a', glow: '#ff9a52', anti: '#4a3488',
  // mar
  deep: '#1a1740', glint: '#ffe2b0', path: '#ff8f4a',
  // nuvens
  sh0: '#36296f', sh1: '#6248b8', midC: '#b878c2', lit: '#ffb18a', hi: '#ffe6c6', rim: '#ffcf9a',
  // aviões
  ivory: '#f4e9d4', cobalt: '#1d58c4', marigold: '#f5b82e', coral: '#ef6a5b', ink: '#2a2235',
  graphite: '#3b3350', plum: '#2b2340', leather: '#6b4630', skin: '#e2a982', steel: '#8d8a96',
  // rastros e tiros
  trail: '#efe6ff', tracer: '#ffd88a',
};
const col = hex => new THREE.Color(hex);

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(VW, VH, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, VW / VH, 1.0, 40000);

// ---------------------------------------------------------------- GLSL comum
const GLSL_NOISE = /* glsl */`
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float hash13(vec3 p3){ p3=fract(p3*.1031); p3+=dot(p3,p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1.,0.)),u.x), mix(hash12(i+vec2(0.,1.)),hash12(i+vec2(1.,1.)),u.x), u.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return s; }
float vnoise3(vec3 p){ vec3 i=floor(p), f=fract(p); vec3 u=f*f*(3.-2.*f);
  float a=hash13(i), b=hash13(i+vec3(1.,0.,0.)), c=hash13(i+vec3(0.,1.,0.)), d=hash13(i+vec3(1.,1.,0.));
  float e=hash13(i+vec3(0.,0.,1.)), f1=hash13(i+vec3(1.,0.,1.)), g=hash13(i+vec3(0.,1.,1.)), h=hash13(i+vec3(1.,1.,1.));
  return mix(mix(mix(a,b,u.x),mix(c,d,u.x),u.y), mix(mix(e,f1,u.x),mix(g,h,u.x),u.y), u.z); }
`;
const GLSL_SKY = /* glsl */`
uniform vec3 uSun;
uniform vec3 cZen, cHigh, cMid, cLow, cHor, cGlow, cAnti;
vec3 skyColor(vec3 d, float cirrus){
  float el = max(d.y, 0.0);
  float sd = dot(d, uSun);
  float toward = sd*0.5 + 0.5;
  vec3 c = mix(cHor, cLow, smoothstep(0.0, 0.07, el));
  c = mix(c, cMid, smoothstep(0.05, 0.24, el));
  c = mix(c, cHigh, smoothstep(0.22, 0.55, el));
  c = mix(c, cZen, smoothstep(0.5, 1.0, el));
  float anti = 1.0 - toward;
  c = mix(c, cAnti, anti*anti*0.75*(1.0 - smoothstep(0.0, 0.6, el)));
  float s = max(sd, 0.0);
  c += cGlow * (pow(s, 5.0)*0.38*(1.0 - smoothstep(0.0, 0.45, el)) + pow(s, 48.0)*0.75);
  c += vec3(1.0, 0.9, 0.75) * pow(s, 1400.0) * 2.5;
  c = mix(c, vec3(3.4, 2.9, 2.2), smoothstep(0.99962, 0.99976, sd));
  if (cirrus > 0.0 && d.y > 0.0) {
    vec2 q = d.xz / (d.y + 0.035);
    float n = fbm(q*vec2(0.5, 3.0) + vec2(3.1, 0.0)) + 0.35*fbm(q*vec2(1.5, 8.5) + vec2(0.0, 5.0));
    float band = smoothstep(0.012, 0.05, d.y) * (1.0 - smoothstep(0.16, 0.48, d.y));
    float st = smoothstep(0.64, 0.95, n) * band * cirrus;
    vec3 lit = mix(vec3(0.3, 0.18, 0.5), vec3(1.0, 0.55, 0.34), pow(toward, 2.4));
    c = mix(c, lit, st*0.85);
  }
  return c;
}
`;

const SUN = new THREE.Vector3(-0.6, 0.07, -0.8).normalize(); // recalculado depois do trajeto
const KEY = new THREE.Vector3();                            // luz-chave: mesma direção do sol, mais alta
const skyUniforms = {
  uSun: { value: SUN },
  cZen: { value: col(C.zen) }, cHigh: { value: col(C.high) }, cMid: { value: col(C.mid) }, cLow: { value: col(C.low) },
  cHor: { value: col(C.hor) }, cGlow: { value: col(C.glow) }, cAnti: { value: col(C.anti) },
};

// ---------------------------------------------------------------- céu
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 64, 32), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { ...skyUniforms },
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: GLSL_NOISE + GLSL_SKY + `varying vec3 vD; void main(){ gl_FragColor = vec4(skyColor(normalize(vD), 1.0), 1.0); }`,
}));
sky.renderOrder = -10; sky.frustumCulled = false;
scene.add(sky);

// ---------------------------------------------------------------- mar
const seaUniforms = { ...skyUniforms, uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uDetail: { value: 1 }, cDeep: { value: col(C.deep) }, cGlint: { value: col(C.glint) }, cPath: { value: col(C.path) } };
const seaGeo = new THREE.PlaneGeometry(60000, 60000, 1, 1); seaGeo.rotateX(-PI / 2);
const sea = new THREE.Mesh(seaGeo, new THREE.ShaderMaterial({
  uniforms: seaUniforms,
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: GLSL_NOISE + GLSL_SKY + /* glsl */`
uniform vec3 uCam; uniform float uTime, uDetail; uniform vec3 cDeep, cGlint, cPath;
varying vec3 vW;
float waveH(vec2 p){
  float h = fbm(p*vec2(0.02, 0.07) + vec2(uTime*0.03, 0.0));
  h += 0.45*vnoise(p*vec2(0.09, 0.3) + vec2(0.0, uTime*0.35));
  h += 0.18*vnoise(p*vec2(0.26, 0.8) - vec2(uTime*0.5, 0.0));
  return h;
}
void main(){
  vec3 toC = uCam - vW; float dist = length(toC); vec3 V = toC/dist;
  float e = max(0.6, dist*0.0025);
  float h0 = waveH(vW.xz), hx = waveH(vW.xz + vec2(e, 0.)), hz = waveH(vW.xz + vec2(0., e));
  float amp = 1.35*uDetail;
  vec3 N = normalize(vec3(-(hx-h0)/e*amp, 1.0, -(hz-h0)/e*amp));
  N = normalize(mix(N, vec3(0., 1., 0.), smoothstep(900., 8000., dist)*0.8));
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 skyR = skyColor(R, 0.0);
  float ndv = max(dot(N, V), 0.0);
  float fres = 0.06 + 0.94*pow(1.0 - ndv, 4.0);
  vec3 c = mix(cDeep, skyR, clamp(fres, 0.0, 1.0));
  // listras de ondulação (pinceladas)
  float stroke = vnoise(vW.xz*vec2(0.012, 0.09));
  c *= 1.0 + (stroke - 0.5)*0.1*uDetail;
  float sr = max(dot(R, uSun), 0.0);
  c += cPath * pow(sr, 12.0) * 0.32;
  c += cGlint * pow(sr, 260.0) * 2.2;
  vec2 g = vW.xz*0.45; vec2 cell = floor(g);
  float hs = hash12(cell);
  float tw = 0.5 + 0.5*sin(uTime*3.5 + hs*60.0);
  float sp = step(0.991, hs) * tw * smoothstep(320., 50., dist) * smoothstep(0.24, 0.0, length(fract(g) - 0.5));
  c += vec3(1.0, 0.93, 0.86) * sp * 1.3;
  vec3 hd = normalize(vec3(-V.x, 0.012, -V.z));
  c = mix(c, skyColor(hd, 0.0), smoothstep(1500., 18000., dist));
  gl_FragColor = vec4(c, 1.0);
}`,
}));
sea.frustumCulled = false;
scene.add(sea);

// ---------------------------------------------------------------- luzes (só os aviões usam)
const keyLight = new THREE.DirectionalLight(col('#ffd3a8'), 2.6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
Object.assign(keyLight.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 80 });
keyLight.shadow.bias = -0.0004; keyLight.shadow.normalBias = 0.03;
scene.add(keyLight, keyLight.target);
const hemi = new THREE.HemisphereLight(col('#8e78d6'), col('#ff9c72'), 1.25);
scene.add(hemi);

// ---------------------------------------------------------------- texturas em canvas
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function grain(g, w, h, seed, amt = 10) { // granulado leve de tinta, para a pintura não parecer plástico
  const r = mulberry32(seed), img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}
const gradientMap = (() => { const t = new THREE.DataTexture(new Uint8Array([105, 190, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (opts) => new THREE.MeshToonMaterial({ gradientMap, ...opts });

// ---------------------------------------------------------------- avião (modelo procedural)
// eixos locais: nariz para -z, para cima +y, asa direita +x. Envergadura ~11 m.
const WING_B = 5.6, WING_C = 2.3, WING_ZC = -1.35, WING_Y = -0.32, DIHEDRAL = 0.07;
function ellipticWing(b, c0, thick, bevel) {
  const s = new THREE.Shape(), N = 48;
  const le = x => -c0 * 0.42 * Math.sqrt(Math.max(0, 1 - (x / b) ** 2));
  const te = x => c0 * 0.58 * Math.sqrt(Math.max(0, 1 - (x / b) ** 2));
  for (let i = 0; i <= N; i++) { const x = -b + 2 * b * (0.5 - 0.5 * Math.cos(PI * i / N)); i === 0 ? s.moveTo(x, le(x)) : s.lineTo(x, le(x)); }
  for (let i = N - 1; i > 0; i--) { const x = -b + 2 * b * (0.5 - 0.5 * Math.cos(PI * i / N)); s.lineTo(x, te(x)); }
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8 });
  g.rotateX(PI / 2); g.translate(0, thick / 2, 0);
  // UV pela planta: u ao longo da envergadura, v ao longo da corda
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + b) / (2 * b), 1 - (p.getZ(i) + c0 * 0.42) / c0);
  g.computeVertexNormals();
  return { geo: g, le, te };
}
function drawRoundel(g, x, y, rx, ry, rings) {
  rings.forEach(([f, color]) => { g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx * f, ry * f, 0, 0, 2 * PI); g.fill(); });
}
function livery(L, seed) {
  // asa: canvas 2048x512 mapeado na planta (u = envergadura, v = corda; o bordo de ataque fica no topo do canvas)
  const wingTex = canvasTex(2048, 512, (g, w, h) => {
    const X = x => (x + WING_B) / (2 * WING_B) * w, Y = z => (z + WING_C * 0.42) / WING_C * h;
    g.fillStyle = L.body; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(255,255,255,0.10)'); grd.addColorStop(1, 'rgba(60,30,60,0.10)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    // pontas pintadas e filete
    g.fillStyle = L.tip; g.fillRect(0, 0, X(-4.85), h); g.fillRect(X(4.85), 0, w - X(4.85), h);
    g.fillStyle = L.line; g.fillRect(X(-4.85) - 2, 0, 12, h); g.fillRect(X(4.85) - 10, 0, 12, h);
    // linhas de painel e ailerons
    g.strokeStyle = 'rgba(70,40,40,0.20)'; g.lineWidth = 3;
    for (const sx of [-1, 1]) {
      g.beginPath();
      for (let x = 2.5; x <= 4.8; x += 0.1) { const k = Math.sqrt(1 - (x / WING_B) ** 2); const z = WING_C * 0.58 * k - 0.38; const px = X(sx * x), py = Y(z); x === 2.5 ? g.moveTo(px, py) : g.lineTo(px, py); }
      g.stroke();
      g.beginPath(); g.moveTo(X(sx * 2.5), Y(WING_C * 0.58 * Math.sqrt(1 - (2.5 / WING_B) ** 2) - 0.38)); g.lineTo(X(sx * 2.5), Y(WING_C * 0.58 * Math.sqrt(1 - (2.5 / WING_B) ** 2))); g.stroke();
      for (const xs of [1.2, 2.3, 3.4]) { g.beginPath(); g.moveTo(X(sx * xs), Y(-0.5)); g.lineTo(X(sx * xs), Y(0.8)); g.stroke(); }
    }
    g.beginPath(); g.moveTo(0, Y(0.15)); g.lineTo(w, Y(0.15)); g.stroke();
    // cocares
    for (const sx of [-1, 1]) drawRoundel(g, X(sx * 3.55), Y(0.12), 0.46 / (2 * WING_B) * w, 0.46 / WING_C * h, L.roundel);
    grain(g, w, h, seed);
  });
  // fuselagem: canvas mapeado no torno (u = volta, começando por baixo; v = 0 no nariz)
  const fuseTex = canvasTex(1024, 1024, (g, w, h) => {
    const V = v => (1 - v) * h;
    g.fillStyle = L.body; g.fillRect(0, 0, w, h);
    // barriga um pouco mais escura
    const gb = g.createLinearGradient(0, 0, w, 0);
    gb.addColorStop(0, 'rgba(70,50,90,0.16)'); gb.addColorStop(0.25, 'rgba(0,0,0,0)'); gb.addColorStop(0.75, 'rgba(0,0,0,0)'); gb.addColorStop(1, 'rgba(70,50,90,0.16)');
    g.fillStyle = gb; g.fillRect(0, 0, w, h);
    // capô do motor
    g.fillStyle = L.cowl; g.fillRect(0, V(0.2), w, h - V(0.2));
    g.fillStyle = L.line; g.fillRect(0, V(0.215), w, V(0.2) - V(0.215));
    // fuligem dos escapamentos
    for (const u of [0.3, 0.7]) {
      const gs = g.createLinearGradient(0, V(0.22), 0, V(0.42)); gs.addColorStop(0, 'rgba(40,30,40,0.35)'); gs.addColorStop(1, 'rgba(40,30,40,0)');
      g.fillStyle = gs; g.fillRect(u * w - 34, V(0.42), 68, V(0.22) - V(0.42));
    }
    // filete lateral
    g.fillStyle = L.pin; for (const u of [0.25, 0.75]) g.fillRect(u * w - 5, V(0.9), 10, V(0.23) - V(0.9));
    // cabine (abertura escura)
    g.fillStyle = '#1d1520'; g.beginPath(); g.ellipse(0.5 * w, V(0.447), 0.062 * w, (V(0.405) - V(0.49)) / 2, 0, 0, 2 * PI); g.fill();
    // linhas de painel
    g.strokeStyle = 'rgba(70,40,40,0.22)'; g.lineWidth = 3;
    for (const v of [0.235, 0.42, 0.62, 0.8]) { g.beginPath(); g.moveTo(0, V(v)); g.lineTo(w, V(v)); g.stroke(); }
    // cocares laterais
    for (const u of [0.25, 0.75]) drawRoundel(g, u * w, V(0.69), 0.075 * w, 0.034 * h, L.roundel);
    grain(g, w, h, seed + 1);
  });
  const finTex = canvasTex(512, 512, (g, w, h) => {
    const X = z => (z - 3.3) / 1.6 * w;
    g.fillStyle = L.body; g.fillRect(0, 0, w, h);
    L.flag.forEach(([z0, z1, color]) => { g.fillStyle = color; g.fillRect(X(z0), 0, X(z1) - X(z0), h); });
    g.strokeStyle = 'rgba(40,20,30,0.35)'; g.lineWidth = 4; g.beginPath(); g.moveTo(X(4.36), 0); g.lineTo(X(4.36), h); g.stroke();
    grain(g, w, h, seed + 2);
  });
  return { wingTex, fuseTex, finTex };
}

function fuselageRadius(s) {
  if (s < 0.045) return 0.32 + 0.27 * Math.sqrt(s / 0.045);
  if (s < 0.36) return 0.59 + 0.1 * Math.sin((s - 0.045) / 0.315 * PI / 2);
  return 0.69 * (1 - Math.pow((s - 0.36) / 0.64, 1.55) * 0.8);
}
function buildPlane(L, seed) {
  const tex = livery(L, seed);
  const g = new THREE.Group();
  const parts = [];
  const add = (mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); parts.push(mesh); return mesh; };
  // fuselagem (torno)
  const prof = [];
  const NP = 48;
  for (let j = 0; j < NP; j++) { const s = j / (NP - 1); prof.push(new THREE.Vector2(Math.max(0.001, fuselageRadius(s)), -4.7 + 9.4 * s)); }
  const fg = new THREE.LatheGeometry(prof, 56);
  fg.rotateX(PI / 2);
  { const p = fg.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), s = (z + 4.7) / 9.4; p.setX(i, p.getX(i) * 0.93); if (s > 0.36) p.setY(i, p.getY(i) + Math.pow((s - 0.36) / 0.64, 2) * 0.32); } fg.computeVertexNormals(); }
  add(new THREE.Mesh(fg, toon({ map: tex.fuseTex })));
  // asas
  const wing = ellipticWing(WING_B, WING_C, 0.16, 0.05);
  { const p = wing.geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + Math.abs(p.getX(i)) * DIHEDRAL); wing.geo.computeVertexNormals(); }
  const wm = add(new THREE.Mesh(wing.geo, toon({ map: tex.wingTex }))); wm.position.set(0, WING_Y, WING_ZC);
  // profundor
  const tail = ellipticWing(1.95, 1.05, 0.1, 0.03);
  const tm = add(new THREE.Mesh(tail.geo, toon({ color: col(L.body) }))); tm.position.set(0, 0.36, 4.0);
  // deriva
  const fs = new THREE.Shape();
  fs.moveTo(3.25, 0.25); fs.quadraticCurveTo(3.95, 0.45, 4.2, 1.45); fs.quadraticCurveTo(4.4, 1.85, 4.7, 1.62); fs.quadraticCurveTo(4.92, 1.2, 4.86, 0.2); fs.lineTo(3.25, 0.25);
  const fgeo = new THREE.ExtrudeGeometry(fs, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 16 });
  { const p = fgeo.attributes.position, uv = fgeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - 3.3) / 1.6, (p.getY(i) - 0.2) / 1.7); }
  fgeo.rotateY(-PI / 2); fgeo.translate(0.05, 0.12, 0); fgeo.computeVertexNormals();
  add(new THREE.Mesh(fgeo, toon({ map: tex.finTex })));
  // spinner e hélice
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.75, 32), toon({ color: col(L.spinner) }));
  sp.geometry.rotateX(-PI / 2); sp.position.set(0, 0, -5.02); add(sp);
  const spRing = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.035, 8, 32), toon({ color: col(C.marigold) })); spRing.position.set(0, 0, -4.7); add(spRing);
  const propMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uAng: { value: 0 }, uTip: { value: col(C.marigold) }, uBlade: { value: col(L.prop) } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uAng; uniform vec3 uTip, uBlade; varying vec2 vP;
      void main(){ float r = length(vP)/1.5; float a = atan(vP.y, vP.x) - uAng;
        float blades = pow(abs(cos(1.5*a)), 26.0);
        float disc = 0.07 + blades*0.28;
        float tip = smoothstep(0.86, 0.9, r);
        float ring = smoothstep(0.9, 0.93, r) * smoothstep(1.0, 0.96, r);
        vec3 c = mix(uBlade, uTip, tip);
        float al = (disc*(1.0 - smoothstep(0.93, 1.0, r)) + ring*0.38) * smoothstep(0.17, 0.22, r);
        gl_FragColor = vec4(c, al); }`,
  });
  const prop = new THREE.Mesh(new THREE.CircleGeometry(1.5, 64), propMat); prop.position.set(0, 0, -4.82); g.add(prop);
  // escapamentos
  const exM = toon({ color: col('#4a3c44') });
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.18, 8), exM); e.rotation.z = PI / 2; e.position.set(sx * 0.6, 0.18, -3.75 + i * 0.22); add(e); }
  // radiador sob a asa
  const rad = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.9, 6, 12), toon({ color: col(L.body) })); rad.rotation.x = PI / 2; rad.scale.set(1.3, 1, 0.7); rad.position.set(0.95, WING_Y - 0.2, -1.1); add(rad);
  // para-brisa
  const ws = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 18, 1, true, -1.0, 2.0), new THREE.MeshBasicMaterial({ color: col('#cfe0ff'), transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  ws.rotation.x = -PI / 2 + 0.35; ws.position.set(0, 0.7, -0.92); g.add(ws);
  const wsFrame = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.022, 6, 24, 2.0), toon({ color: col(L.cowl) })); wsFrame.rotation.set(-PI / 2 + 0.35, 0, PI / 2 - 1.0); wsFrame.position.set(0, 0.79, -0.95); add(wsFrame);
  // piloto: ombros, cabeça, capacete de couro, óculos
  const pilot = new THREE.Group(); pilot.position.set(0, 0.6, -0.55); g.add(pilot);
  const sh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.22, 6, 12), toon({ color: col(L.jacket) })); sh.rotation.z = PI / 2; sh.position.y = 0.06; pilot.add(sh); parts.push(sh);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), toon({ color: col(C.skin) })); head.position.y = 0.27; pilot.add(head); parts.push(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.142, 20, 12, 0, 2 * PI, 0, PI * 0.58), toon({ color: col(C.leather) })); cap.position.y = 0.285; cap.rotation.x = 0.25; pilot.add(cap); parts.push(cap);
  for (const sx of [-1, 1]) { const gg = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 6, 16), toon({ color: col(C.marigold) })); gg.position.set(sx * 0.055, 0.36, -0.1); gg.rotation.x = -0.6; pilot.add(gg); parts.push(gg); }
  pilot.children.forEach(m => { m.castShadow = true; });
  // cachecol que tremula
  const scarfGeo = new THREE.PlaneGeometry(1, 0.09, 16, 1);
  const scarf = new THREE.Mesh(scarfGeo, toon({ color: col(L.scarf), side: THREE.DoubleSide })); scarf.castShadow = true; g.add(scarf);
  const scarfBase = scarfGeo.attributes.position.array.slice();
  // mastro de antena e fio
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.5, 6), toon({ color: col(C.steel) })); mast.position.set(0, 0.88, 0.55); mast.rotation.x = 0.25; add(mast);
  const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.12, 0.62), new THREE.Vector3(0, 1.72, 4.55)]), new THREE.LineBasicMaterial({ color: col('#2a2235'), transparent: true, opacity: 0.6 }));
  g.add(wire);
  return {
    group: g, prop, propMat,
    update(t) {
      propMat.uniforms.uAng.value = t * 47.0;
      const p = scarfGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const bx = scarfBase[i * 3], by = scarfBase[i * 3 + 1];
        const s = bx + 0.5; // 0 no pescoço, 1 na ponta
        const x = Math.sin(t * 15 - s * 7.0) * 0.1 * s + 0.12;
        const y = Math.cos(t * 11 - s * 6.0) * 0.05 * s + by + 0.08 * s;
        p.setXYZ(i, x, 0.82 + y, -0.48 + s * 1.05);
      }
      p.needsUpdate = true; scarfGeo.computeVertexNormals();
    },
  };
}

// a nossa "força aérea": marfim + cobalto, bandeira cobalto · ouro · coral
const HERO_L = {
  body: C.ivory, tip: C.cobalt, line: C.marigold, cowl: C.cobalt, pin: C.coral, spinner: C.cobalt, prop: '#3a2f3a',
  jacket: '#7a5238', scarf: C.coral,
  roundel: [[1, C.cobalt], [0.68, C.marigold], [0.36, C.coral]],
  flag: [[4.36, 4.53, C.cobalt], [4.53, 4.7, C.marigold], [4.7, 4.95, C.coral]],
};
const FOE_L = {
  body: C.graphite, tip: C.coral, line: C.ivory, cowl: C.coral, pin: C.ivory, spinner: C.coral, prop: '#1d1724',
  jacket: '#2c2530', scarf: C.ivory,
  roundel: [[1, C.coral], [0.62, C.plum], [0.3, C.ivory]],
  flag: [[3.3, 3.8, C.plum], [4.36, 4.6, C.coral], [4.6, 4.95, C.ivory]],
};
const hero = buildPlane(HERO_L, 11); scene.add(hero.group);
const foe = buildPlane(FOE_L, 23); scene.add(foe.group);
foe.group.traverse(o => { if (o.isMesh) o.castShadow = false; });

// ---------------------------------------------------------------- coreografia do voo
// rolagem positiva = asa esquerda abaixa (curva à esquerda); guinada positiva = para a esquerda
const weave = t => 33 * Math.sin(2 * PI * (t - 0.1) / 2.4) * (1 - smooth(3.3, 4.3, t));
const bankKeys = track([[0, 0], [4.2, 0], [4.9, 16], [5.6, 27], [6.2, 14], [6.55, 6], [8.6, 6], [9.3, 38], [10.3, 76], [12, 94], [14, 112]]);
const BANK = t => (weave(t) + bankKeys(t)) * D2R;
const PITCH = (k => t => k(t) * D2R)(track([[0, 0], [3.9, 0], [5.3, 13], [6.1, 17], [6.9, 10], [8.6, 4], [9.6, -5], [11, -8], [14, -9]]));
const SPEED = track([[0, 40], [3.6, 44], [5.5, 66], [6, 68], [8.5, 72], [11, 80], [14, 84]]);
const BARREL = t => 2 * PI * easeInOutSine((t - 6.55) / 2.0);
// no rasante o avião inclina sem desviar muito a rota: a câmera não varre o quadro a cada vaivém
const YAW_K = t => lerp(lerp(0.12, 0.42, smooth(3.8, 4.6, t)), 0.17, smooth(9.2, 10.4, t));
const ALT0 = 105;

const T0 = -3, DT = 1 / 120, NT = Math.ceil((DURATION + 1.5 - T0) / DT);
const FL = { pos: [], yaw: [] };
{
  let p = new THREE.Vector3(), yaw = 0;
  const q = new THREE.Quaternion(), f = new THREE.Vector3();
  for (let i = 0; i <= NT; i++) {
    const t = T0 + i * DT;
    FL.pos.push(p.clone()); FL.yaw.push(yaw);
    yaw += YAW_K(t) * Math.sin(BANK(t)) * DT;
    q.setFromEuler(new THREE.Euler(PITCH(t), yaw, 0, 'YXZ'));
    f.set(0, 0, -1).applyQuaternion(q);
    p.addScaledVector(f, SPEED(t) * DT);
  }
  const i0 = Math.round(-T0 / DT), off = FL.pos[i0].clone().sub(new THREE.Vector3(0, ALT0, 0)), y0 = FL.yaw[i0];
  FL.pos.forEach(v => v.sub(off)); FL.yaw = FL.yaw.map(y => y - y0);
}
function flight(t) {
  const x = clamp((t - T0) / DT, 0, NT - 1e-6), i = Math.floor(x), u = x - i;
  return { pos: FL.pos[i].clone().lerp(FL.pos[i + 1], u), yaw: lerp(FL.yaw[i], FL.yaw[i + 1], u) };
}
const _e = new THREE.Euler();
function headingQuat(t, out = new THREE.Quaternion()) { return out.setFromEuler(_e.set(PITCH(t), flight(t).yaw, 0, 'YXZ')); }
const _zAxis = new THREE.Vector3(0, 0, 1);
const helixOff = (t, H) => { const phi = BARREL(t); return new THREE.Vector3(-2.0 * Math.sin(phi), 1.4 * (1 - Math.cos(phi)), 0).applyQuaternion(H); };
// transformação completa do herói (com a rolagem e o deslocamento em hélice do tonneau)
function heroAt(t) {
  const f = flight(t), H = headingQuat(t);
  const phi = BARREL(t);
  const off = helixOff(t, H);
  const Q = H.clone().multiply(new THREE.Quaternion().setFromAxisAngle(_zAxis, BANK(t) + phi));
  return { pos: f.pos.clone().add(off), quat: Q, H, base: f.pos };
}

// inimigo: posição relativa ao referencial do herói (x lateral, y acima, z atrás)
const FX = track([[-3, -7], [7.3, -7], [7.85, -18], [8.4, -9], [8.9, 9], [9.6, 18], [10.5, 22], [14, 34]]);
const FY = track([[-3, 5], [7.3, 7], [7.85, 20], [8.4, 11], [8.9, 4], [9.6, 1], [10.5, -3], [14, -26]]);
const FZ = track([[-3, 85], [6.9, 78], [7.6, 38], [7.95, 10], [8.4, -24], [8.9, -44], [9.6, -64], [10.5, -90], [14, -170]]);
const FROLL = track([[-3, 0], [7.4, 0], [7.9, 40], [8.5, -55], [9.2, -70], [10.5, 20], [14, 60]]);
function foeAt(t) {
  const f = flight(t), H = headingQuat(t);
  const pos = f.pos.clone().add(new THREE.Vector3(FX(t) + Math.sin(t * 1.7) * 1.5, FY(t), FZ(t)).applyQuaternion(H));
  const Q = H.clone().multiply(new THREE.Quaternion().setFromAxisAngle(_zAxis, (FROLL(t) + weave(t - 0.5) * 0.8) * D2R));
  return { pos, quat: Q, H };
}

// câmera: presa ao referencial do herói (guinada + arfagem, sem rolagem), com a rolagem dosada à parte
const CAM = {
  dist: track([[0, 22], [4.0, 22], [5.4, 16.5], [7.5, 17], [9.6, 17], [14, 16.5]]),
  el: track([[0, 57], [3.2, 55], [6.2, 20], [6.9, 16], [8.4, 20], [9.8, 6], [11, -6], [14, -9]]),
  az: track([[0, 6], [3.6, 4], [5.6, 16], [6.9, 6], [8.4, 8], [10, 14], [14, 18]]),
  sx: track([[0, 0.12], [4.2, 0.1], [5.5, 0.16], [9, 0.16], [10.5, 0.22], [14, 0.22]]),
  sy: track([[0, -0.58], [4.0, -0.56], [5.5, -0.3], [9.5, -0.36], [14, -0.36]]),
  kRoll: track([[0, 0.15], [4.2, 0.2], [5.5, 0.35], [8.7, 0.35], [10, 0.7], [11, 0.78], [14, 0.8]]),
};
const TANV = Math.tan(camera.fov / 2 * D2R), TANH = TANV * VW / VH;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _up = new THREE.Vector3();
function cameraAt(t, cam) {
  const f = flight(t), H = headingQuat(t);
  f.pos.addScaledVector(helixOff(t, H), 0.5);
  const d = CAM.dist(t), el = CAM.el(t) * D2R, az = CAM.az(t) * D2R;
  const off = new THREE.Vector3(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d).applyQuaternion(H);
  const eye = f.pos.clone().add(off);
  const roll = CAM.kRoll(t) * BANK(t) + 0.5 * Math.sin(BARREL(t));
  const qRoll = new THREE.Quaternion().setFromAxisAngle(_zAxis, roll);
  _up.set(0, 1, 0).applyQuaternion(H);
  _m.lookAt(eye, f.pos, _up); _q.setFromRotationMatrix(_m).multiply(qRoll);
  // reenquadra: o avião fica em (sx, sy) da tela, não no centro
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(_q), up = new THREE.Vector3(0, 1, 0).applyQuaternion(_q);
  const target = f.pos.clone().addScaledVector(right, -CAM.sx(t) * d * TANH).addScaledVector(up, -CAM.sy(t) * d * TANV);
  _up.set(0, 1, 0).applyQuaternion(H);
  _m.lookAt(eye, target, _up); _q.setFromRotationMatrix(_m).multiply(qRoll);
  cam.position.copy(eye); cam.quaternion.copy(_q); cam.updateMatrixWorld(true);
  return cam;
}

// o sol: baixo no horizonte, à esquerda do quadro na subida (o primeiro encontro com a luz)
const SUN_AZ_OFF = 25;
{
  const c = cameraAt(5.6, new THREE.PerspectiveCamera(42, VW / VH, 1, 40000));
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion);
  const az = Math.atan2(dir.x, dir.z) + SUN_AZ_OFF * D2R, el = 4.2 * D2R;
  SUN.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
  KEY.set(Math.sin(az) * Math.cos(28 * D2R), Math.sin(28 * D2R), Math.cos(az) * Math.cos(28 * D2R)).normalize();
}

// ---------------------------------------------------------------- nuvens (cúmulos de bolhas, base achatada)
const puffs = [];      // {x,y,z,r,cx,cy,cz,base,top,seed,near}
const pathSamples = [];
for (let t = -1; t <= DURATION + 0.5; t += 0.05) { pathSamples.push(heroAt(t).pos); pathSamples.push(cameraAt(t, new THREE.PerspectiveCamera()).position.clone()); }
const sunEyes = [];
function clearOfSun(x, y, z, r) {
  for (const e of sunEyes) { const ox = x - e.x, oy = y - e.y, oz = z - e.z; const tc = ox * SUN.x + oy * SUN.y + oz * SUN.z; if (tc < 0) continue; if (ox * ox + oy * oy + oz * oz - tc * tc < r * r) return false; }
  return true;
}
function clearOfPath(x, y, z, r, margin) {
  for (const p of pathSamples) { const dx = p.x - x, dy = p.y - y, dz = p.z - z; if (dx * dx + dy * dy + dz * dz < (r + margin) ** 2) return false; }
  return true;
}
function addCloud(cx, base, cz, R, H, rng, near, margin = 22) {
  const list = [], n = Math.round((near ? 40 : 22) + rng() * (near ? 20 : 12));
  const top = base + H, center = [cx, base + H * 0.42, cz];
  // corpo: bolhas grandes embaixo, menores e mais altas no topo (couve-flor)
  for (let i = 0; i < n; i++) {
    const h = Math.pow(rng(), 0.85);
    const ring = (1 - h * 0.5) * R;
    const ang = rng() * 2 * PI, rr = Math.sqrt(rng()) * ring * 0.72;
    const pr = (0.26 + rng() * 0.26) * R * (1 - h * 0.4);
    list.push({ x: cx + Math.cos(ang) * rr, y: base + h * Math.max(0, H - pr * 0.7) + pr * 0.35, z: cz + Math.sin(ang) * rr, r: pr });
  }
  for (let i = 0; i < 3; i++) list.push({ x: cx + (rng() - 0.5) * R * 0.5, y: base + R * 0.3, z: cz + (rng() - 0.5) * R * 0.5, r: R * 0.62 });
  if (margin > 0 && !list.every(p => clearOfPath(p.x, p.y, p.z, p.r * 1.15, margin))) return false;
  if (!list.every(p => clearOfSun(p.x, p.y, p.z, p.r * 1.25 + 30))) return false;
  const seed = rng() * 100;
  for (const p of list) puffs.push({ ...p, cx: center[0], cy: center[1], cz: center[2], base, top, seed, near });
  return true;
}
{
  const rng = mulberry32(7);
  for (let t = 4.6; t <= 7.0; t += 0.2) sunEyes.push(cameraAt(t, new THREE.PerspectiveCamera()).position.clone());
  const sample = (t) => { const h = heroAt(t), H = h.H; return { p: h.base, right: new THREE.Vector3(1, 0, 0).applyQuaternion(H), fwd: new THREE.Vector3(0, 0, -1).applyQuaternion(H) }; };
  const flat = v => { v.y = 0; return v.normalize(); };
  // 1) cúmulos baixos rente ao mar, passando pelas bordas do quadro no rasante
  for (let t = -0.5; t < 5.5; t += 0.45) {
    const s = sample(t), side = rng() < 0.5 ? -1 : 1, lat = 36 + rng() * 48, R = 12 + rng() * 15;
    const c = s.p.clone().addScaledVector(flat(s.right.clone()), side * lat).addScaledVector(flat(s.fwd.clone()), 30 + rng() * 40);
    addCloud(c.x, 8 + rng() * 14, c.z, R, R * (1.1 + rng() * 0.8), rng, true, 12);
  }
  // 2) o desfiladeiro: torres altas dos dois lados na subida e no tonneau
  for (let t = 4.2; t < 10.5; t += 0.2) {
    const s = sample(t), side = rng() < 0.5 ? -1 : 1, lat = 60 + rng() * 170, R = 26 + rng() * 52;
    const c = s.p.clone().addScaledVector(flat(s.right.clone()), side * lat).addScaledVector(flat(s.fwd.clone()), 80 + rng() * 220);
    addCloud(c.x, 15 + rng() * 40, c.z, R, R * (1.4 + rng() * 1.4), rng, true, t > 8.4 ? 65 : 32);
  }
  // 3) campo de nuvens abaixo e em volta da curva final
  for (let t = 8.5; t < 15.5; t += 0.2) {
    const s = sample(t), side = rng() < 0.5 ? -1 : 1, lat = 90 + rng() * 300, R = 28 + rng() * 55;
    const c = s.p.clone().addScaledVector(flat(s.right.clone()), side * lat).addScaledVector(flat(s.fwd.clone()), 120 + rng() * 420);
    addCloud(c.x, 5 + rng() * 25, c.z, R, R * (0.9 + rng() * 1.1), rng, true, 70);
  }
  // 4) a parede: torres distantes ao longo do horizonte, na direção do sol e em volta
  const sAz = Math.atan2(SUN.x, SUN.z);
  for (let i = 0; i < 70; i++) {
    const a = sAz + (rng() - 0.5) * 2 * PI * (i < 40 ? 0.35 : 1.0), dist = 1400 + rng() * 6500, R = 180 + rng() * 520;
    addCloud(Math.sin(a) * dist, 20 + rng() * 120, Math.cos(a) * dist, R, R * (0.9 + rng() * 1.6), rng, false, 0);
  }
}
function cloudMesh(list, detail) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const n = list.length;
  const aCenter = new Float32Array(n * 3), aInfo = new Float32Array(n * 4);
  list.forEach((p, i) => { aCenter.set([p.cx, p.cy, p.cz], i * 3); aInfo.set([p.r, p.base, p.seed, p.top], i * 4); });
  geo.setAttribute('aCenter', new THREE.InstancedBufferAttribute(aCenter, 3));
  geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(aInfo, 4));
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...skyUniforms, uKey: { value: KEY }, uCam: { value: new THREE.Vector3() },
      cSh0: { value: col(C.sh0) }, cSh1: { value: col(C.sh1) }, cMidC: { value: col(C.midC) }, cLit: { value: col(C.lit) }, cHi: { value: col(C.hi) }, cRim: { value: col(C.rim) } },
    vertexShader: GLSL_NOISE + /* glsl */`
      attribute vec3 aCenter; attribute vec4 aInfo;
      varying vec3 vW; varying vec3 vN; varying float vH; varying float vCrease;
      void main(){
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        float sc = length(instanceMatrix[0].xyz);
        vec3 pn = normalize(position);
        vec3 p = wp.xyz;
        float n1 = vnoise3(p*(2.4/sc) + aInfo.z);
        float n2 = vnoise3(p*(6.0/sc) + aInfo.z*1.7);
        p += pn*((n1 - 0.5)*0.16 + (n2 - 0.5)*0.05)*sc;
        float base = aInfo.y;
        if (p.y < base) p.y = base + (p.y - base)*0.08;
        vec3 cn = normalize(p - aCenter);
        vN = normalize(mix(pn, cn, 0.5));
        vCrease = 1.0 - max(dot(pn, cn), 0.0);
        vW = p;
        vH = clamp((p.y - base)/max(aInfo.w - base, 1.0), 0.0, 1.0);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: GLSL_NOISE + GLSL_SKY + /* glsl */`
      uniform vec3 uKey, uCam, cSh0, cSh1, cMidC, cLit, cHi, cRim;
      varying vec3 vW; varying vec3 vN; varying float vH; varying float vCrease;
      void main(){
        vec3 N = normalize(vN);
        vec3 V = normalize(uCam - vW);
        float w = (dot(N, uKey)*0.5 + 0.5)*0.8 + vH*0.24 - 0.05 - vCrease*0.22;
        vec3 c = mix(cSh0, cSh1, smoothstep(0.08, 0.3, w));
        c = mix(c, cMidC, smoothstep(0.42, 0.5, w));
        c = mix(c, cLit, smoothstep(0.52, 0.58, w));
        c = mix(c, cHi, smoothstep(0.8, 0.9, w));
        c *= 0.94 + 0.12*vnoise3(vW*0.045);
        float back = pow(max(dot(-V, uSun), 0.0), 6.0);
        float rim = pow(1.0 - max(dot(N, V), 0.0), 5.0);
        c += cRim * rim * (0.14 + back*1.7);
        float dist = length(uCam - vW);
        vec3 vd = normalize(vW - uCam); vd.y = max(vd.y*0.4, 0.015); vd = normalize(vd);
        c = mix(c, skyColor(vd, 0.0), (1.0 - exp(-dist/5200.0))*0.85);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const m = new THREE.Matrix4();
  list.forEach((p, i) => { m.makeScale(p.r, p.r, p.r).setPosition(p.x, p.y, p.z); mesh.setMatrixAt(i, m); });
  mesh.frustumCulled = false;
  return mesh;
}
const cloudsNear = cloudMesh(puffs.filter(p => p.near), 4);
const cloudsFar = cloudMesh(puffs.filter(p => !p.near), 2);
scene.add(cloudsNear, cloudsFar);

// ---------------------------------------------------------------- rastros de condensação das pontas das asas
const TRAIL_N = 110, TRAIL_DT = 1 / 55;
function makeTrail() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(TRAIL_N * 2 * 3), across = new Float32Array(TRAIL_N * 2), alpha = new Float32Array(TRAIL_N * 2), idx = [];
  for (let i = 0; i < TRAIL_N; i++) { across[i * 2] = 0; across[i * 2 + 1] = 1; if (i < TRAIL_N - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAcross', new THREE.BufferAttribute(across, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uColor: { value: col(C.trail) } },
    vertexShader: `attribute float aAcross, aAlpha; varying float vX, vA; void main(){ vX = aAcross; vA = aAlpha; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uColor; varying float vX, vA; void main(){ float e = smoothstep(0.0, 0.42, vX)*smoothstep(1.0, 0.58, vX); gl_FragColor = vec4(uColor*1.15, vA*e); }`,
  }));
  mesh.frustumCulled = false; mesh.renderOrder = 2;
  return mesh;
}
const trails = [makeTrail(), makeTrail()];
scene.add(...trails);
const TIP = [new THREE.Vector3(-5.5, WING_Y + 5.5 * DIHEDRAL, WING_ZC + 0.25), new THREE.Vector3(5.5, WING_Y + 5.5 * DIHEDRAL, WING_ZC + 0.25)];
function updateTrails(t, camPos) {
  const pts = [[], []];
  for (let i = 0; i < TRAIL_N; i++) {
    const h = heroAt(t - i * TRAIL_DT);
    for (let s = 0; s < 2; s++) pts[s].push(TIP[s].clone().applyQuaternion(h.quat).add(h.pos));
  }
  const strength = 0.55 + 0.45 * smooth(4.4, 5.4, t);
  for (let s = 0; s < 2; s++) {
    const geo = trails[s].geometry, P = geo.attributes.position, A = geo.attributes.aAlpha;
    for (let i = 0; i < TRAIL_N; i++) {
      const a = i / (TRAIL_N - 1), p = pts[s][i];
      const tan = (i < TRAIL_N - 1 ? pts[s][i + 1].clone().sub(p) : p.clone().sub(pts[s][i - 1])).normalize();
      const side = tan.clone().cross(camPos.clone().sub(p).normalize()).normalize();
      const w = 0.18 + a * 2.6;
      P.setXYZ(i * 2, p.x - side.x * w / 2, p.y - side.y * w / 2, p.z - side.z * w / 2);
      P.setXYZ(i * 2 + 1, p.x + side.x * w / 2, p.y + side.y * w / 2, p.z + side.z * w / 2);
      const al = 0.72 * strength * Math.pow(1 - a, 1.3) * smooth(0, 0.03, a) * smooth(3, 14, p.distanceTo(camPos));
      A.setX(i * 2, al); A.setX(i * 2 + 1, al);
    }
    P.needsUpdate = true; A.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- tiros traçantes e respingos no mar
const BURSTS = [
  { t0: 0.7, dur: 0.6, aim: [17, 1.5, -70], hitSea: false, v: 120 },
  { t0: 1.55, dur: 0.6, aim: [-11, 0, -175], hitSea: true, v: 120 },
  { t0: 6.95, dur: 0.5, aim: [-2, 5, -60], hitSea: false, v: 150 },
];
const ROUNDS = [];
for (const b of BURSTS) {
  const rng = mulberry32(Math.round(b.t0 * 1000));
  for (let k = 0; k * 0.07 < b.dur; k++) {
    const t0 = b.t0 + k * 0.07;
    for (const gun of [-2.2, 2.2]) {
      const f = foeAt(t0), hh = heroAt(t0);
      const muzzle = new THREE.Vector3(gun, -0.2, -2.0).applyQuaternion(f.quat).add(f.pos);
      const tgt = hh.base.clone().add(new THREE.Vector3(b.aim[0] + gun * 0.6 + (rng() - 0.5) * 2, b.aim[1] + (rng() - 0.5) * 1.5, b.aim[2]).applyQuaternion(hh.H));
      if (b.hitSea) tgt.y = -2 - rng() * 3;
      const dir = tgt.sub(muzzle).normalize();
      const heroVel = new THREE.Vector3(0, 0, -1).applyQuaternion(hh.H).multiplyScalar(SPEED(t0));
      const vel = heroVel.add(dir.multiplyScalar(b.v));
      let tHit = Infinity; if (vel.y < 0) tHit = t0 + (muzzle.y) / -vel.y;
      ROUNDS.push({ t0, muzzle, vel, tHit });
    }
  }
}
{
  const rng = mulberry32(905);
  for (let k = 0; k * 0.05 < 0.4; k++) {
    const t0 = 9.05 + k * 0.05;
    for (const gun of [-2.3, 2.3]) {
      const hh = heroAt(t0), f = foeAt(t0 + 0.25);
      const muzzle = new THREE.Vector3(gun, WING_Y, WING_ZC - 0.9).applyQuaternion(hh.quat).add(hh.pos);
      const tgt = f.pos.clone().add(new THREE.Vector3(3 + (rng() - 0.5) * 3, 2.5 + (rng() - 0.5) * 2, 0).applyQuaternion(f.H));
      const dir = tgt.sub(muzzle).normalize();
      const vel = new THREE.Vector3(0, 0, -1).applyQuaternion(hh.H).multiplyScalar(SPEED(t0)).add(dir.multiplyScalar(190));
      let tHit = Infinity; if (vel.y < 0) tHit = t0 + muzzle.y / -vel.y;
      ROUNDS.push({ t0, muzzle, vel, tHit });
    }
  }
}
const MAX_Q = 400;
function quadBatch(fragment, blending) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX_Q * 4 * 3), uv = new Float32Array(MAX_Q * 4 * 2), al = new Float32Array(MAX_Q * 4), idx = [];
  for (let i = 0; i < MAX_Q; i++) { const a = i * 4; idx.push(a, a + 1, a + 2, a, a + 2, a + 3); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: col(C.tracer) } },
    vertexShader: `attribute float aAlpha; varying vec2 vUv; varying float vA; void main(){ vUv = uv; vA = aAlpha; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uColor; varying vec2 vUv; varying float vA; void main(){ ${fragment} }`,
  }));
  mesh.frustumCulled = false; mesh.renderOrder = 3;
  let n = 0;
  return {
    mesh,
    reset() { n = 0; },
    push(a, b, c, d, alpha) {
      if (n >= MAX_Q) return;
      const P = geo.attributes.position, U = geo.attributes.uv, A = geo.attributes.aAlpha, k = n * 4;
      [a, b, c, d].forEach((v, j) => { P.setXYZ(k + j, v.x, v.y, v.z); A.setX(k + j, alpha); });
      U.setXY(k, 0, 0); U.setXY(k + 1, 1, 0); U.setXY(k + 2, 1, 1); U.setXY(k + 3, 0, 1);
      n++;
    },
    commit() { geo.setDrawRange(0, n * 6); ['position', 'uv', 'aAlpha'].forEach(k => geo.attributes[k].needsUpdate = true); },
  };
}
const tracers = quadBatch(`float across = clamp(1.0 - abs(vUv.y*2.0 - 1.0), 0.0, 1.0); float head = pow(clamp(vUv.x, 0.0, 1.0), 2.2);
  gl_FragColor = vec4(uColor*(1.0 + 1.8*head)*smoothstep(0.0, 1.0, across), vA*across*(0.2 + 0.8*head));`, THREE.AdditiveBlending);
const splashes = quadBatch(`vec2 d = vUv - 0.5; float r = length(d)*2.0;
  float ring = smoothstep(0.55, 0.8, r)*smoothstep(1.0, 0.85, r); float core = smoothstep(0.5, 0.0, r);
  gl_FragColor = vec4(vec3(1.0, 0.95, 0.9), vA*(core*0.8 + ring*0.6));`, THREE.NormalBlending);
scene.add(tracers.mesh, splashes.mesh);
function updateShots(t, cam) {
  tracers.reset(); splashes.reset();
  const camPos = cam.position, camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion), camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  for (const r of ROUNDS) {
    const age = t - r.t0;
    if (age < 0 || age > 1.6) continue;
    if (t < r.tHit) {
      const head = r.muzzle.clone().addScaledVector(r.vel, age);
      const dirv = r.vel.clone().normalize();
      const L = Math.min(18, 6 + age * 50);
      const tail = head.clone().addScaledVector(dirv, -L);
      const side = dirv.clone().cross(camPos.clone().sub(head).normalize()).normalize().multiplyScalar(0.15);
      const fade = smooth(0, 0.06, age) * (1 - smooth(1.2, 1.6, age));
      tracers.push(tail.clone().sub(side), head.clone().sub(side), head.clone().add(side), tail.clone().add(side), fade);
    } else {
      const sa = t - r.tHit; if (sa > 0.7) continue;
      const hit = r.muzzle.clone().addScaledVector(r.vel, r.tHit - r.t0); hit.y = 0.3;
      const s = 1.0 + easeOutCubic(sa / 0.7) * 4.5, al = 1 - smooth(0.15, 0.7, sa);
      const c = hit.clone().addScaledVector(camUp, s * 0.4);
      const R = camRight.clone().multiplyScalar(s), U = camUp.clone().multiplyScalar(s);
      splashes.push(c.clone().sub(R).sub(U), c.clone().add(R).sub(U), c.clone().add(R).add(U), c.clone().sub(R).add(U), al);
    }
  }
  tracers.commit(); splashes.commit();
}

// ---------------------------------------------------------------- pós-processamento
const rt = new THREE.WebGLRenderTarget(VW, VH, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1); composer.setSize(VW, VH);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(VW, VH), 0.38, 0.55, 1.0);
composer.addPass(bloom);
const NDUST = 14;
const finalPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(VW, VH) }, uFrame: { value: 0 },
    uSunUV: { value: new THREE.Vector2(0.5, 0.5) }, uFlare: { value: 0 }, uRays: { value: 0 },
    uDust: { value: Array.from({ length: NDUST }, () => new THREE.Vector4()) }, uScratch: { value: new THREE.Vector3() },
    uFade: { value: 1 }, uTint: { value: col('#20123a') },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uRes, uSunUV; uniform float uFrame, uFlare, uRays, uFade;
    uniform vec4 uDust[${NDUST}]; uniform vec3 uScratch, uTint;
    varying vec2 vUv;
    float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
    void main(){
      vec2 uv = vUv, dc = uv - 0.5; float r2 = dot(dc, dc);
      vec3 c;
      c.r = texture2D(tDiffuse, uv + dc*r2*0.012).r;
      c.g = texture2D(tDiffuse, uv).g;
      c.b = texture2D(tDiffuse, uv - dc*r2*0.012).b;
      vec2 asp = vec2(uRes.x/uRes.y, 1.0);
      // raios de luz saindo do sol
      if (uRays > 0.001) {
        vec2 stp = (uSunUV - uv)/32.0; vec2 p = uv; float acc = 0.0, w = 1.0;
        for (int i = 0; i < 32; i++) { p += stp; vec3 s = texture2D(tDiffuse, clamp(p, 0.001, 0.999)).rgb; acc += max(dot(s, vec3(0.3, 0.59, 0.11)) - 1.0, 0.0)*w; w *= 0.965; }
        c += vec3(1.0, 0.66, 0.42)*acc/32.0*uRays;
      }
      // brilho anamórfico e fantasmas da lente
      vec2 ds = (uv - uSunUV)*asp;
      c += vec3(1.0, 0.64, 0.5)*exp(-abs(ds.y)*160.0)*exp(-abs(ds.x)*1.4)*uFlare*1.1;
      c += vec3(1.0, 0.6, 0.42)*exp(-length(ds)*6.0)*uFlare*0.22;
      for (int k = 0; k < 3; k++) {
        float f = k == 0 ? -0.45 : (k == 1 ? 0.3 : 0.85);
        float rad = k == 0 ? 0.06 : (k == 1 ? 0.035 : 0.09);
        vec2 gp = 0.5 + (uSunUV - 0.5)*(-f);
        float gd = length((uv - gp)*asp);
        c += vec3(0.85, 0.6, 1.0)*smoothstep(rad, rad*0.7, gd)*0.05*uFlare + vec3(1.0, 0.7, 0.5)*smoothstep(rad, rad*0.92, gd)*smoothstep(rad*0.85, rad*0.95, gd)*0.06*uFlare;
      }
      // grade: sombras puxadas para o violeta, leve saturação
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, 1.07);
      c = mix(c, c + uTint*0.06, 1.0 - smoothstep(0.0, 0.35, l));
      // vinheta violeta
      float vig = smoothstep(0.95, 0.25, length(dc*vec2(1.0, 1.25)));
      c *= mix(vec3(0.6, 0.5, 0.8), vec3(1.0), vig);
      // poeira de película e risco
      for (int i = 0; i < ${NDUST}; i++) { vec4 d = uDust[i]; if (d.w <= 0.0) continue; float dd = length((uv - d.xy)*asp); c += vec3(1.0, 0.97, 0.92)*smoothstep(d.z, d.z*0.25, dd)*d.w; }
      c += vec3(1.0, 0.95, 0.9)*uScratch.y*smoothstep(uScratch.z, 0.0, abs(uv.x - uScratch.x));
      // granulado
      float g = hash(uv*uRes + fract(uFrame*0.6180339)*917.0) - 0.5;
      c += g*0.028*(0.12 + l);
      c *= uFade;
      if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
});
composer.addPass(finalPass);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- texto (PT-BR) composto por cima
const out = document.getElementById('out');
const ctx = out.getContext('2d');
const SERIF = '"Playfair Display"', SANS = '"Inter"';
const TITLE = [
  { txt: 'DEIXA', t: 0.25, w: 800, size: 116, track: 0.02, y: 408 },
  { txt: 'O CÉU', t: 0.95, w: 400, size: 62, track: 0.14, y: 470 },
  { txt: 'TE', t: 1.6, w: 400, size: 62, track: 0.14, y: 530 },
  { txt: 'LEVAR', t: 2.35, w: 800, size: 116, track: 0.02, y: 628, punch: true },
];
const TITLE_OUT = [3.85, 4.3];
const SUB = { txt: 'voa leve.', t: 4.35, y: 556, size: 54 };
const CAPTIONS = [
  { txt: 'EMBOSCADA · O FALCÃO ATACA', t0: 0.4, t1: 2.4 },
  { txt: 'GAIVOTA · RASANTE', t0: 2.75, t1: 4.6 },
  { txt: 'GAIVOTA · PARAFUSO', t0: 10.9, t1: 14.5 },
];
function spaced(g, txt, x, y, trackEm, size) {
  // desenha centrado com espaçamento entre letras (em em)
  const sp = trackEm * size;
  const widths = [...txt].map(ch => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + sp * (widths.length - 1);
  let cx = x - total / 2;
  [...txt].forEach((ch, i) => { g.fillText(ch, cx, y); cx += widths[i] + sp; });
}
function drawText(t) {
  const g = ctx;
  g.save();
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.shadowColor = 'rgba(18,8,40,0.45)'; g.shadowBlur = 22;
  // título em pilha, palavra a palavra
  const outK = smooth(TITLE_OUT[0], TITLE_OUT[1], t);
  for (const w of TITLE) {
    const k = smooth(w.t, w.t + 0.5, t);
    if (k <= 0 || outK >= 1) continue;
    const a = k * (1 - outK);
    const rise = (1 - easeOutCubic((t - w.t) / 0.6)) * 16 + outK * -14;
    const sc = w.punch ? 1 + (1 - easeOutCubic((t - w.t) / 0.45)) * 0.08 : 1;
    g.globalAlpha = a;
    g.filter = `blur(${((1 - k) * 8 + outK * 10).toFixed(2)}px)`;
    g.fillStyle = '#fff6ea';
    g.font = `${w.w} ${w.size}px ${SERIF}`;
    g.save(); g.translate(VW / 2, w.y + rise); g.scale(sc, sc);
    spaced(g, w.txt, 0, 0, w.track, w.size);
    g.restore();
  }
  // subtítulo
  {
    const k = smooth(SUB.t, SUB.t + 0.6, t);
    if (k > 0) {
      g.globalAlpha = k; g.filter = `blur(${((1 - k) * 7).toFixed(2)}px)`;
      g.fillStyle = '#fff6ea'; g.font = `italic 400 ${SUB.size}px ${SERIF}`;
      spaced(g, SUB.txt, VW / 2, SUB.y + (1 - easeOutCubic((t - SUB.t) / 0.7)) * 12, 0.01, SUB.size);
    }
  }
  // legendas de manobra
  g.shadowBlur = 10; g.shadowColor = 'rgba(18,8,40,0.75)';
  for (const c of CAPTIONS) {
    const a = smooth(c.t0, c.t0 + 0.35, t) * (1 - smooth(c.t1 - 0.3, c.t1, t));
    if (a <= 0) continue;
    g.globalAlpha = a * 0.92; g.filter = 'none';
    g.fillStyle = '#fff3e4'; g.font = `500 25px ${SANS}`;
    const tr = 0.42 - 0.08 * easeOutCubic((t - c.t0) / 0.8);
    spaced(g, c.txt, VW / 2, 986, tr, 25);
  }
  g.restore();
}

// ---------------------------------------------------------------- sol na tela: posição, oclusão, flare
const _v = new THREE.Vector3(), _ray = new THREE.Vector3();
function sunState(cam) {
  _v.copy(cam.position).addScaledVector(SUN, 20000).project(cam);
  const behind = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).dot(SUN) < 0;
  const uv = new THREE.Vector2((_v.x + 1) / 2, (_v.y + 1) / 2);
  if (behind) return { uv, flare: 0, rays: 0 };
  const edge = 1 - smooth(0.95, 1.35, Math.max(Math.abs(_v.x), Math.abs(_v.y)));
  // fração de raios livres até o sol (nuvens e o próprio avião)
  const occl = [...puffs.map(p => ({ x: p.x, y: p.y, z: p.z, r: p.r * 0.92 }))];
  const h = heroAt(currentT);
  for (let k = -4; k <= 4; k++) { const p = new THREE.Vector3(0, 0, k).applyQuaternion(h.quat).add(h.pos); occl.push({ x: p.x, y: p.y, z: p.z, r: 0.7 }); }
  for (let k = -5; k <= 5; k++) { const p = new THREE.Vector3(k, WING_Y, WING_ZC).applyQuaternion(h.quat).add(h.pos); occl.push({ x: p.x, y: p.y, z: p.z, r: 0.85 }); }
  const right = new THREE.Vector3().crossVectors(SUN, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, SUN);
  let free = 0; const S = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [a, b] of S) {
    _ray.copy(SUN).addScaledVector(right, a * 0.004).addScaledVector(up, b * 0.004).normalize();
    let hit = false;
    for (const s of occl) {
      const ox = s.x - cam.position.x, oy = s.y - cam.position.y, oz = s.z - cam.position.z;
      const tc = ox * _ray.x + oy * _ray.y + oz * _ray.z; if (tc < 0) continue;
      const d2 = ox * ox + oy * oy + oz * oz - tc * tc; if (d2 < s.r * s.r) { hit = true; break; }
    }
    if (!hit) free++;
  }
  const vis = free / S.length;
  return { uv, flare: vis * edge, rays: (0.35 + 0.65 * vis) * edge };
}

// ---------------------------------------------------------------- quadro
let currentT = 0;
function frame(t) {
  currentT = t;
  const frameIdx = Math.round(t * FPS);
  const h = heroAt(t);
  hero.group.position.copy(h.pos); hero.group.quaternion.copy(h.quat); hero.update(t);
  const f = foeAt(t);
  foe.group.position.copy(f.pos); foe.group.quaternion.copy(f.quat); foe.update(t + 0.37);
  cameraAt(t, camera);
  sky.position.copy(camera.position);
  sea.position.set(camera.position.x, 0, camera.position.z);
  seaUniforms.uCam.value.copy(camera.position); seaUniforms.uTime.value = t;
  seaUniforms.uDetail.value = lerp(0.45, 1.0, smooth(3.6, 5.6, t)); // mar liso no rasante (começo calmo), ondas na subida
  cloudsNear.material.uniforms.uCam.value.copy(camera.position);
  cloudsFar.material.uniforms.uCam.value.copy(camera.position);
  keyLight.position.copy(h.pos).addScaledVector(KEY, 40); keyLight.target.position.copy(h.pos); keyLight.target.updateMatrixWorld();
  updateTrails(t, camera.position);
  updateShots(t, camera);
  // sol, flare e película
  const s = sunState(camera);
  const U = finalPass.uniforms;
  U.uSunUV.value.copy(s.uv); U.uFlare.value = s.flare * 0.75; U.uRays.value = s.rays * 0.5;
  U.uFrame.value = frameIdx;
  const r = mulberry32(frameIdx * 7919 + 13);
  U.uDust.value.forEach(d => { const on = r() < 0.38; d.set(r(), r(), 0.0007 + r() * 0.0022, on ? 0.15 + r() * 0.45 : 0); });
  U.uScratch.value.set(0.08 + r() * 0.84, r() < 0.22 ? 0.05 + r() * 0.08 : 0, 0.0006 + r() * 0.0006);
  U.uFade.value = 1 - smooth(DURATION - 0.45, DURATION, t) * 0.85; // começa direto, como a referência
}
function render() {
  composer.render();
  ctx.clearRect(0, 0, VW, VH);
  ctx.drawImage(renderer.domElement, 0, 0, VW, VH);
  drawText(currentT);
}

// ---------------------------------------------------------------- momentos-chave (cards)
const KEYS = [
  { id: '00-emboscada', t: 1.6 },
  { id: '01-rasante', t: 3.8 },
  { id: '02-subida-ao-sol', t: 5.7 },
  { id: '03-tonneau', t: 7.7 },
  { id: '04-a-virada', t: 8.35 },
  { id: '05-parafuso', t: 12.4 },
];

// fontes antes de qualquer quadro
const fonts = [
  new FontFace('Playfair Display', 'url(./fontes/PlayfairDisplay-var.ttf)', { weight: '400 900', style: 'normal' }),
  new FontFace('Playfair Display', 'url(./fontes/PlayfairDisplay-400i.woff2)', { weight: '400', style: 'italic' }),
  new FontFace('Inter', 'url(./fontes/Inter-var.woff2)', { weight: '100 900', style: 'normal' }),
];
await Promise.all(fonts.map(f => f.load().then(ff => document.fonts.add(ff))));

window.KEYS = KEYS;
window.DURATION = DURATION;
window.SHOTS = [];
window.renderKey = i => { frame(KEYS[i].t); render(); return KEYS[i].id; };
window.renderAt = t => { frame(t); render(); return t; };
window.debugSun = t => { frame(t); const s = sunState(camera); return { uv: [s.uv.x, s.uv.y], flare: s.flare, rays: s.rays }; };
window.debugSplash = t => { frame(t); return ROUNDS.filter(r => t > r.tHit && t - r.tHit < 0.7).map(r => { const h = r.muzzle.clone().addScaledVector(r.vel, r.tHit - r.t0); h.y = 0.3; const v = h.clone().project(camera); return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(3)]; }); };
window.debugPuffs = () => ({ near: puffs.filter(p => p.near).length, far: puffs.filter(p => !p.near).length });
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida';
const q = new URLSearchParams(location.search);
if (q.has('t')) window.renderAt(Number(q.get('t'))); else window.renderKey(Number(q.get('key') ?? 2));
window.ready = true;
