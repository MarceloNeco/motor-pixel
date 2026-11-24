// bitcoin-moedas v2: o fechamento anual do Bitcoin (2022 a 2026) como uma corrente de blocos num cofre.
// Cada ano é um bloco de pedra, ligado ao seguinte por uma corrente; cada moeda em cima vale US$ 2 mil.
// Da referência ("Data Skyline", 3D Style Atlas) vem só o método (ver pericia/metodo-x-mundo.md).
// Tudo procedural: sem modelos, sem imagens.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const VW = 1920, VH = 1080, PI = Math.PI;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeOutBack = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// as texturas em canvas usam estas fontes: carrega antes de desenhar qualquer coisa
await document.fonts.load('800 100px Inter');
await document.fonts.load('400 40px "DM Serif Display"');
await document.fonts.load('400 20px "JetBrains Mono"');
const FONT = new FontLoader().parse(await (await fetch('./fontes/inter-800.typeface.json')).json());

// ---------------------------------------------------------------- dados (pericia/dados-bitcoin.json)
const DATA = [
  { ano: 2022, v: 16530.35 },
  { ano: 2023, v: 42288.06 },
  { ano: 2024, v: 93354.22 },
  { ano: 2025, v: 87497.94 },
  { ano: 2026, v: 64998.03, acento: true }, // ano em curso: cotação de 16/11/2026
];
const fmt = v => (v / 1000).toFixed(1).replace('.', ',');
const pct = (a, b) => { const p = Math.round((b / a - 1) * 100); return (p > 0 ? '+' : '−') + Math.abs(p) + '%'; };

// ---------------------------------------------------------------- paleta com papéis
const C = {
  night: '#0b0908', haze: '#1b1410',            // fundo: só penumbra
  counter: '#0d0b0a', stone: '#3d352e',         // balcão e blocos: pedra escura
  ivory: '#f2ecdf',                             // todo texto: números, anos, etiquetas, título
  accent: '#f58a1f',                            // só 2026: pilha, ano, etiqueta, 2ª linha do título
  gold: '#ffd27c', goldAccent: '#ff9c2a',       // metal das moedas
  steel: '#b0b5bc', door: '#4f535a', tag: '#ece5d6', tagInk: '#1b1612',
};

// ---------------------------------------------------------------- medidas
const S = 3.0;                                   // distância entre blocos (vão de 1,15: cada bloco lê sozinho)
const XS = DATA.map((d, i) => (i - 2) * S);      // -6 .. 6
const BW = 1.85, BD = 1.85, BH = 0.8;            // bloco
const R = 0.85, HC = 0.088, CH = 0.014;          // moeda: raio, espessura, chanfro
const UNIT = 2000;                               // 1 moeda = US$ 2 mil
const NC = DATA.map(d => Math.round(d.v / UNIT));
const ANN = DATA.slice(1).map((d, i) => ({ i, txt: pct(DATA[i].v, d.v), acento: !!d.acento }));

// ---------------------------------------------------------------- renderer + pós
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(VW, VH, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById('palco').prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.night);
scene.fog = new THREE.Fog(C.haze, 15, 44);
const pmrem = new THREE.PMREMGenerator(renderer);

// ambiente de estúdio escuro: é o que o metal reflete. Uma luz-chave larga do lado do foco,
// uma faixa fina atrás à direita (recorta a borda das pilhas) e um teto fraco.
function studioEnv() {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { lo: { value: new THREE.Color('#140e09') }, mid: { value: new THREE.Color('#1d1611') }, hi: { value: new THREE.Color('#0d0a08') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 lo; uniform vec3 mid; uniform vec3 hi; varying vec3 vP; void main(){ vec3 c = vP.y < 0.0 ? mix(mid, lo, clamp(-vP.y * 3.0, 0.0, 1.0)) : mix(mid, hi, clamp(vP.y * 1.6, 0.0, 1.0)); gl_FragColor = vec4(c, 1.0); }',
  })));
  const panel = (w, h, color, k, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(34, 26, '#ffe6c2', 5.5, [-34, 12, 24]);  // chave
  panel(5, 34, '#ffd7a3', 7.0, [36, 12, -20]);   // recorte atrás à direita
  panel(26, 10, '#fff1dc', 1.3, [14, 5, 40]);    // frente baixa: dá leitura à serrilha
  panel(40, 40, '#fff1dc', 0.7, [0, 46, 0]);     // teto
  return pmrem.fromScene(s, 0.02).texture;
}
scene.environment = studioEnv();
scene.environmentIntensity = 0.75;

const camera = new THREE.PerspectiveCamera(34, VW / VH, 0.1, 400);
camera.layers.enable(1); // camada 1 = textos: a câmera vê, o espelho do balcão não (texto espelhado vira ruído)
const noReflect = o => { o.traverse(c => c.layers.set(1)); return o; };
const rt = new THREE.WebGLRenderTarget(VW, VH, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 8, aperture: 0.0012, maxblur: 0.0045 });
// desfoque próprio: o do three.js deixa o que está nítido na frente "vazar" no fundo desfocado
// (vira um halo em volta dos números). Aqui cada amostra mais próxima que o pixel só entra
// se o desfoque DELA alcançar o pixel; objeto em foco não vaza.
bokeh.materialBokeh.fragmentShader = /* glsl */`
  #include <common>
  varying vec2 vUv;
  uniform sampler2D tColor; uniform sampler2D tDepth;
  uniform float maxblur; uniform float aperture; uniform float nearClip; uniform float farClip; uniform float focus; uniform float aspect;
  #include <packing>
  float viewZAt(vec2 p) {
    #if DEPTH_PACKING == 1
    float d = unpackRGBAToDepth(texture2D(tDepth, p));
    #else
    float d = texture2D(tDepth, p).x;
    #endif
    return perspectiveDepthToViewZ(d, nearClip, farClip);
  }
  float coc(float vz) { return min(abs((focus + vz) * aperture), maxblur); }
  void main() {
    float vz = viewZAt(vUv), c = coc(vz);
    vec4 acc = texture2D(tColor, vUv); float wsum = 1.0;
    const int N = 56;
    for (int i = 0; i < N; i++) {
      float fi = float(i) + 0.5, r = sqrt(fi / float(N)), a = fi * 2.399963;
      vec2 off = vec2(cos(a), sin(a) * aspect) * r * c;
      vec2 p = vUv + off;
      float tz = viewZAt(p);
      float w = tz > vz + 0.12 ? step(r * c, coc(tz)) : 1.0; // amostra na frente: só se o desfoque dela chega aqui
      acc += texture2D(tColor, p) * w; wsum += w;
    }
    gl_FragColor = acc / wsum; gl_FragColor.a = 1.0;
  }`;
bokeh.materialBokeh.needsUpdate = true;
composer.addPass(bokeh);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- luz: um foco quente de cima, resto penumbra
scene.add(new THREE.HemisphereLight('#4a3f35', '#0c0a09', 0.55));
const key = new THREE.SpotLight('#ffe6c4', 900, 0, 0.6, 0.9, 2);
key.position.set(-7, 14, 10.5); key.target.position.set(0.6, 1.4, 0);
key.castShadow = true; key.shadow.mapSize.set(4096, 4096);
key.shadow.camera.near = 5; key.shadow.camera.far = 45; key.shadow.bias = -0.0002; key.shadow.normalBias = 0.02;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight('#ffcc8a', 0.08);
const wash = new THREE.SpotLight('#ffe2bd', 230, 0, 1.05, 1.0, 2); // lava a parede do cofre de cima, para ela existir em tela pequena
wash.position.set(0, 14, 3); wash.target.position.set(1, 3.4, -8.5); scene.add(wash, wash.target);
rim.position.set(10, 7, -8); scene.add(rim);

// ---------------------------------------------------------------- texturas em canvas
function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function tex(c, srgb = true, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  return t;
}

// ---------------------------------------------------------------- balcão de pedra preta polida
// três camadas: espelho (reflete as pilhas) + pedra translúcida (recebe o foco e as sombras) + véu que apaga o longe
{
  const mirror = new Reflector(new THREE.PlaneGeometry(160, 160), { textureWidth: VW, textureHeight: VH, color: 0x45413d, multisample: 4, clipBias: 0.003 });
  mirror.rotation.x = -PI / 2; scene.add(mirror);
  mirror.getReflectionCamera(camera).layers.set(0); // a câmera do espelho é um clone da principal: tira dela a camada dos textos
  const stone = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: C.counter, roughness: 0.5, metalness: 0, transparent: true, opacity: 0.7, depthWrite: false, envMapIntensity: 0.06 }));
  stone.rotation.x = -PI / 2; stone.position.y = 0.002; stone.receiveShadow = true; stone.renderOrder = 1; scene.add(stone);
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { col: { value: new THREE.Color(C.haze) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform vec3 col; varying vec3 vW; void main(){ float d = length(vW.xz - vec2(0.0, 1.0)); gl_FragColor = vec4(col * 0.55, smoothstep(11.0, 30.0, d)); }',
  }));
  veil.rotation.x = -PI / 2; veil.position.y = 0.004; veil.renderOrder = 2; scene.add(veil);
}

// ---------------------------------------------------------------- parede de caixas de cofre (o elenco que diz onde estamos)
{
  const WZ = -8.5, DW = 1.0, DHH = 0.62, PX = 1.07, PY = 0.69, COLS = 56, ROWS = 14;
  const doorMat = new THREE.MeshStandardMaterial({ color: C.door, metalness: 0.9, roughness: 0.42, envMapIntensity: 1.1 });
  const brass = new THREE.MeshStandardMaterial({ color: '#6f747b', metalness: 1, roughness: 0.4 });
  const plate = new THREE.MeshStandardMaterial({ color: '#6a6f77', metalness: 0.9, roughness: 0.4 });
  const doors = new THREE.InstancedMesh(new RoundedBoxGeometry(DW, DHH, 0.07, 2, 0.022), doorMat, COLS * ROWS);
  const lockG = new THREE.CylinderGeometry(0.034, 0.034, 0.03, 16); lockG.rotateX(PI / 2);
  const locks = new THREE.InstancedMesh(lockG, brass, COLS * ROWS * 2);
  const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.075, 0.012), plate, COLS * ROWS);
  const m = new THREE.Matrix4();
  let n = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const x = (c - (COLS - 1) / 2) * PX, y = 0.36 + r * PY;
    doors.setMatrixAt(n, m.makeTranslation(x, y, WZ));
    locks.setMatrixAt(n * 2, m.makeTranslation(x + 0.33, y, WZ + 0.045));
    locks.setMatrixAt(n * 2 + 1, m.makeTranslation(x + 0.22, y, WZ + 0.045));
    plates.setMatrixAt(n, m.makeTranslation(x - 0.27, y + 0.16, WZ + 0.04));
    n++;
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(COLS * PX + 2, ROWS * PY + 2), new THREE.MeshStandardMaterial({ color: '#0d0c0b', roughness: 0.9 }));
  back.position.set(0, ROWS * PY / 2, WZ - 0.05);
  for (const o of [doors, locks, plates, back]) { o.receiveShadow = true; scene.add(o); }
}

// ---------------------------------------------------------------- moedas
function drawBitcoin(g, cx, cy, size, fill) { // o ₿ desenhado à mão (B + duas hastes), inclinado como no logotipo
  g.save(); g.translate(cx, cy); g.rotate(14 * PI / 180);
  g.font = `800 ${size}px Inter`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const m = g.measureText('B');
  const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, h = m.actualBoundingBoxAscent;
  g.fillStyle = fill; g.fillText('B', 0, h / 2);
  const bw = w * 0.115, ext = h * 0.17;
  for (const fx of [0.24, 0.5]) {
    const bx = -w / 2 + w * fx;
    g.fillRect(bx, -h / 2 - ext, bw, ext + h * 0.08);
    g.fillRect(bx, h / 2 - h * 0.08, bw, ext + h * 0.08);
  }
  g.restore();
}
function coinFace(field, raised, blur = 0) { // a mesma arte vira cor, relevo e rugosidade
  return canvas(1024, 1024, (g, W) => {
    const c = W / 2, r = W / 2;
    g.fillStyle = field; g.fillRect(0, 0, W, W);
    if (blur) g.filter = `blur(${blur}px)`;
    g.fillStyle = raised;
    g.beginPath(); g.arc(c, c, r, 0, 2 * PI); g.arc(c, c, r * 0.9, 0, 2 * PI, true); g.fill();
    g.beginPath(); g.arc(c, c, r * 0.845, 0, 2 * PI); g.arc(c, c, r * 0.828, 0, 2 * PI, true); g.fill();
    for (let i = 0; i < 64; i++) { const a = i / 64 * 2 * PI; g.beginPath(); g.arc(c + Math.cos(a) * r * 0.775, c + Math.sin(a) * r * 0.775, r * 0.011, 0, 2 * PI); g.fill(); }
    drawBitcoin(g, c, c, W * 0.6, raised);
    g.filter = 'none';
  });
}
function coinEdge(kind) { // serrilha + escurecimento nas extremidades (sulco entre moedas empilhadas)
  return canvas(2048, 64, (g, W, H) => {
    const n = 168;
    for (let i = 0; i < n; i++) {
      const x0 = i / n * W, w = W / n;
      const grd = g.createLinearGradient(x0, 0, x0 + w, 0);
      if (kind === 'bump') { grd.addColorStop(0, '#202020'); grd.addColorStop(0.5, '#f0f0f0'); grd.addColorStop(1, '#202020'); }
      else { grd.addColorStop(0, '#c4c4c4'); grd.addColorStop(0.5, '#ffffff'); grd.addColorStop(1, '#c4c4c4'); }
      g.fillStyle = grd; g.fillRect(x0, 0, w + 1, H);
    }
    if (kind === 'color') {
      const v = g.createLinearGradient(0, 0, 0, H);
      v.addColorStop(0, 'rgba(0,0,0,0.4)'); v.addColorStop(0.22, 'rgba(0,0,0,0)'); v.addColorStop(0.78, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.4)');
      g.fillStyle = v; g.fillRect(0, 0, W, H);
    }
  });
}
const faceColor = tex(coinFace('#c8c8c8', '#ffffff'));
const faceBump = tex(coinFace('#5a5a5a', '#ffffff', 3), false);
const faceRough = tex(coinFace('#8a8a8a', '#363636'), false);
const edgeColor = tex(coinEdge('color'), true, true);
const edgeBump = tex(coinEdge('bump'), false, true);
function coinMaterials(base, mark = false) { // mark = moeda de borda lisa e clara: a cada 5 moedas, marca US$ 10 mil
  if (mark) base = '#' + new THREE.Color(base).lerp(new THREE.Color('#fff6dc'), 0.3).getHexString();
  const face = new THREE.MeshStandardMaterial({ color: base, metalness: 1, roughness: 1, map: faceColor, bumpMap: faceBump, bumpScale: 1.6, roughnessMap: faceRough, envMapIntensity: 1.5 });
  const edge = mark ? new THREE.MeshStandardMaterial({ color: base, metalness: 1, roughness: 0.2, envMapIntensity: 1.7 })
    : new THREE.MeshStandardMaterial({ color: base, metalness: 1, roughness: 0.34, map: edgeColor, bumpMap: edgeBump, bumpScale: 0.4, envMapIntensity: 1.5 });
  const chamfer = new THREE.MeshStandardMaterial({ color: new THREE.Color(base).multiplyScalar(0.6), metalness: 1, roughness: 0.46, envMapIntensity: 1.3 });
  return [edge, chamfer, chamfer, face, face];
}
function coinGeometry() { // lateral + 2 chanfros + 2 faces (um grupo de material por peça)
  const seg = 72, hs = HC - 2 * CH;
  const side = new THREE.CylinderGeometry(R, R, hs, seg, 1, true);
  const chT = new THREE.CylinderGeometry(R - CH, R, CH, seg, 1, true); chT.translate(0, hs / 2 + CH / 2, 0);
  const chB = new THREE.CylinderGeometry(R, R - CH, CH, seg, 1, true); chB.translate(0, -hs / 2 - CH / 2, 0);
  const capT = new THREE.CircleGeometry(R - CH, seg); capT.rotateX(-PI / 2); capT.translate(0, HC / 2, 0);
  const capB = new THREE.CircleGeometry(R - CH, seg); capB.rotateX(PI / 2); capB.translate(0, -HC / 2, 0);
  return mergeGeometries([side, chT, chB, capT, capB], true);
}
const coinGeo = coinGeometry();
const matGold = coinMaterials(C.gold), matAccent = coinMaterials(C.goldAccent);
const matGoldMark = coinMaterials(C.gold, true), matAccentMark = coinMaterials(C.goldAccent, true);
const isMark = k => k % 5 === 4;

// ---------------------------------------------------------------- os blocos (um por ano) com o ano gravado
const stoneMat = new THREE.MeshStandardMaterial({
  color: C.stone, roughness: 0.4, metalness: 0.05, envMapIntensity: 0.4,
  roughnessMap: tex(canvas(512, 512, (g, W) => { // granito: grão fino na rugosidade
    const r = mulberry32(3); g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, W, W);
    for (let i = 0; i < 9000; i++) { const v = 90 + Math.floor(r() * 130); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * W, r() * W, 1 + r() * 2, 1 + r() * 2); }
  }), false, true),
});
const blockGeo = new RoundedBoxGeometry(BW, BH, BD, 4, 0.045);
const yearMat = new THREE.MeshStandardMaterial({ color: '#e4dccb', roughness: 0.6, envMapIntensity: 0.5 });
const yearMatAccent = new THREE.MeshStandardMaterial({ color: C.accent, roughness: 0.55, envMapIntensity: 0.5 });
function buildBlocks() { // chamado depois de textGeo existir
  DATA.forEach((d, i) => {
    const b = new THREE.Mesh(blockGeo, stoneMat); b.position.set(XS[i], BH / 2, 0); b.castShadow = b.receiveShadow = true; scene.add(b);
    const g = textGeo(String(d.ano), 0.43, 0.09), bb = g.boundingBox; // ano em relevo na face do bloco
    const y = new THREE.Mesh(g, d.acento ? yearMatAccent : yearMat);
    y.position.set(XS[i] - (bb.max.x + bb.min.x) / 2, BH / 2 - (bb.max.y + bb.min.y) / 2, BD / 2 - 0.004);
    y.castShadow = true; scene.add(noReflect(y));
  });
}

// ---------------------------------------------------------------- a corrente entre os blocos + as etiquetas de variação
const steelMat = new THREE.MeshStandardMaterial({ color: C.steel, metalness: 1, roughness: 0.3, envMapIntensity: 1.4 });
const CZ = BD / 2 + 0.07; // a corrente corre na frente dos blocos, como uma guirlanda
const chainCurve = i => new THREE.QuadraticBezierCurve3(
  new THREE.Vector3(XS[i] + BW / 2 - 0.14, 0.7, CZ),
  new THREE.Vector3((XS[i] + XS[i + 1]) / 2, 0.7 - 0.2, CZ),
  new THREE.Vector3(XS[i + 1] - BW / 2 + 0.14, 0.7, CZ));
{
  const LN = 5, linkGeo = new THREE.TorusGeometry(0.128, 0.036, 12, 32); linkGeo.scale(1.42, 1, 1);
  const links = new THREE.InstancedMesh(linkGeo, steelMat, (DATA.length - 1) * LN);
  links.castShadow = true; scene.add(links);
  const studGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.14, 20); studGeo.rotateX(PI / 2);
  const m = new THREE.Matrix4(), zAxis = new THREE.Vector3(0, 0, 1);
  let n = 0;
  for (let i = 0; i < DATA.length - 1; i++) {
    const cv = chainCurve(i);
    for (let k = 0; k < LN; k++) {
      const uu = (k + 0.5) / LN, p = cv.getPointAt(uu), t = cv.getTangentAt(uu).normalize();
      const nrm = new THREE.Vector3().crossVectors(zAxis, t).normalize(); // perpendicular à tangente, no plano da corrente
      if (k % 2 === 0) m.makeBasis(t, nrm, zAxis); else m.makeBasis(t, zAxis, nrm.clone().negate());
      m.setPosition(p); links.setMatrixAt(n++, m);
    }
    for (const u of [0, 1]) { const s = new THREE.Mesh(studGeo, steelMat); s.position.copy(cv.getPoint(u)); s.position.z -= 0.03; s.castShadow = true; scene.add(s); }
  }
}
// etiqueta: chapinha pendurada no meio da corrente, com a variação do ano gravada
const TAGW = 1.1, TAGH = 0.43;
const tagMat = new THREE.MeshStandardMaterial({ color: C.tag, metalness: 0, roughness: 0.62, envMapIntensity: 0.4 });
const tags = ANN.map(a => {
  const mid = chainCurve(a.i).getPoint(0.5);
  const grp = new THREE.Group(); grp.position.set(mid.x, mid.y - 0.05, mid.z + 0.02);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), steelMat); ring.position.y = -0.045;
  const plate = new THREE.Mesh(new RoundedBoxGeometry(TAGW, TAGH, 0.03, 2, 0.014), tagMat); plate.position.y = -0.085 - TAGH / 2;
  const t = tex(canvas(1024, Math.round(1024 * TAGH / TAGW), (g, W, H) => {
    g.strokeStyle = 'rgba(27,22,18,0.3)'; g.lineWidth = 6; g.strokeRect(24, 24, W - 48, H - 48);
    g.font = '800 276px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = C.tagInk; g.fillText(a.txt, W / 2, H * 0.54);
  }));
  const dec = new THREE.Mesh(new THREE.PlaneGeometry(TAGW, TAGH), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.7, depthWrite: false }));
  dec.position.set(0, plate.position.y, 0.0165); noReflect(dec);
  plate.castShadow = true;
  grp.add(ring, plate, dec); scene.add(noReflect(grp)); // a etiqueta inteira fica fora do espelho
  return grp;
});
const TAG_T0 = 8.35, TAG_DT = 0.2;
function updateTags(t) {
  tags.forEach((g, j) => {
    const p = t - (TAG_T0 + j * TAG_DT);
    if (p <= 0) { g.visible = false; return; }
    g.visible = true;
    g.scale.setScalar(easeOutBack(p / 0.26));
    g.rotation.x = 0.85 * Math.exp(-p * 4.4) * Math.cos(p * 11.5); // cai e balança como pêndulo, amortecendo
  });
}

// ---------------------------------------------------------------- pilhas (as moedas caem e assentam)
// 2022 já começa pronta. Ritmo: 2023 despeja com a câmera parada, pausa; 2024 é o soco (despejo rápido + travelling);
// pausa no topo; 2025 e 2026 despejam num mesmo quadro parado; pausa; recuo.
const POUR = [null, { t0: 1.0, d: 0.8 }, { t0: 2.3, d: 1.0 }, { t0: 4.25, d: 0.95 }, { t0: 5.45, d: 0.9 }];
const FALL = 0.3, DROP = 2.2;
const CAM_FINAL = new THREE.Vector3(-7.9, 4.6, 15.2);
const stacks = DATA.map((d, i) => {
  const n = NC[i], r = mulberry32(100 + i);
  const mesh = new THREE.InstancedMesh(coinGeo, d.acento ? matAccent : matGold, n);
  const mark = new THREE.InstancedMesh(coinGeo, d.acento ? matAccentMark : matGoldMark, n);
  for (const o of [mesh, mark]) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; scene.add(o); }
  const coins = [];
  for (let k = 0; k < n; k++) {
    const j = r() < 0.08 ? 0.055 : 0.026;
    const uk = n > 1 ? k / (n - 1) : 1;
    const tl = POUR[i] ? POUR[i].t0 + POUR[i].d * (0.82 * uk + 0.18 * uk * uk) : -10;
    coins.push({
      tl, y: BH + HC / 2 + k * HC,
      dx: (r() - 0.5) * 2 * j, dz: (r() - 0.5) * 2 * j,
      ax: (r() - 0.5) * 0.5, az: -r() * 0.35,            // deriva no ar (sempre por trás, longe do número)
      yaw: r() * 2 * PI, spin: (r() - 0.5) * 3, tilt: 0.25 + r() * 0.35,
      axis: new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize(), drop: DROP + r() * 0.4,
    });
  }
  const dir = CAM_FINAL.clone().sub(new THREE.Vector3(XS[i], 0, 0)); // a moeda do topo mostra o ₿ de pé para a câmera final
  coins[n - 1].yaw = Math.atan2(dir.x, dir.z); coins[n - 1].dx = coins[n - 1].dz = 0;
  return { i, n, mesh, mark, coins };
});
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qt = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function updateStack(st, t) {
  let landed = 0;
  st.coins.forEach((c, k) => {
    let y = c.y, x = XS[st.i] + c.dx, z = c.dz, tilt = 0, yaw = c.yaw, sc = 1;
    if (t < c.tl - FALL) { sc = 0; }
    else if (t < c.tl) {
      const s = (t - (c.tl - FALL)) / FALL;
      y = c.y + c.drop * (1 - s * s);
      x += c.ax * (1 - s); z += c.az * (1 - s);
      tilt = c.tilt * (1 - s); yaw += c.spin * (1 - s);
      sc = clamp(s / 0.12);
    } else {
      landed++;
      const a = t - c.tl;
      if (a < 0.16) tilt = 0.07 * Math.sin(a / 0.16 * 3 * PI) * (1 - a / 0.16);
    }
    _q.setFromAxisAngle(_up, yaw); _qt.setFromAxisAngle(c.axis, tilt); _q.premultiply(_qt);
    _p.set(x, y, z); _s.setScalar(sc);
    _m.compose(_p, _q, _s);
    st.mesh.setMatrixAt(k, isMark(k) ? ZERO : _m); st.mark.setMatrixAt(k, isMark(k) ? _m : ZERO);
  });
  st.mesh.instanceMatrix.needsUpdate = st.mark.instanceMatrix.needsUpdate = true;
  return landed;
}

// ---------------------------------------------------------------- números 3D (contam junto com a pilha)
const sideOf = c => new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(0.42), roughness: 0.8, envMapIntensity: 0.3 });
const labelMat = [new THREE.MeshStandardMaterial({ color: '#e4dccb', roughness: 0.7, envMapIntensity: 0.5 }), sideOf('#e4dccb')];
const labelMatAccent = [new THREE.MeshStandardMaterial({ color: C.accent, roughness: 0.65, envMapIntensity: 0.5 }), sideOf(C.accent)];
const geoCache = new Map();
function textGeo(str, size, depthK = 0.15) {
  const k = str + '@' + size + '@' + depthK;
  if (!geoCache.has(k)) {
    const g = new TextGeometry(str, { font: FONT, size, depth: size * depthK, curveSegments: 10, bevelEnabled: true, bevelThickness: size * 0.025, bevelSize: size * 0.016, bevelSegments: 2 });
    g.computeBoundingBox(); geoCache.set(k, g);
  }
  return geoCache.get(k);
}
buildBlocks();
const NUM = 0.52, MIL = 0.32;
const labels = DATA.map(d => {
  const grp = new THREE.Group(), mat = d.acento ? labelMatAccent : labelMat;
  const num = new THREE.Mesh(undefined, mat), mil = new THREE.Mesh(undefined, mat);
  num.castShadow = mil.castShadow = true;
  grp.add(num, mil); scene.add(noReflect(grp));
  return { grp, num, mil, str: '' };
});
function setLabel(L, i, str, yTop, hop) {
  if (str !== L.str) {
    L.str = str;
    const gn = textGeo(str, NUM), gm = textGeo('mil', MIL);
    L.num.geometry = gn; L.mil.geometry = gm;
    const wn = gn.boundingBox.max.x - gn.boundingBox.min.x, wm = gm.boundingBox.max.x - gm.boundingBox.min.x, gap = 0.1, total = wn + gap + wm;
    L.num.position.set(-total / 2 - gn.boundingBox.min.x, 0, -NUM * 0.075);
    L.mil.position.set(-total / 2 + wn + gap - gm.boundingBox.min.x, 0, -MIL * 0.075);
  }
  // hop: 0 = na frente da pilha (as moedas caem atrás dele), 1 = assentado na metade da frente do topo
  const h = smooth(hop);
  L.grp.position.set(XS[i], yTop + 0.04 + NUM * 0.3 + Math.sin(h * PI) * 0.14, lerp(R + 0.42, R * 0.62, h));
  L.grp.rotation.y = -0.22;
}

// ---------------------------------------------------------------- câmera: plano-sequência por chaves (t, posição, alvo, abertura)
const CAM = [ // f = ponto de foco (o número da pilha da vez); h = a câmera para nesta chave
  { t: 0.0, p: [-8.2, 1.75, 6.4], l: [-4.6, 1.5, 0], f: [-6, 1.8, 0.6], ap: 0.0015, h: 1 },
  { t: 1.0, p: [-8.1, 1.77, 6.45], l: [-4.45, 1.55, 0], f: [-5.2, 1.9, 0.7], ap: 0.0015 },
  { t: 2.25, p: [-7.75, 1.85, 6.6], l: [-3.9, 1.78, 0], f: [-3, 2.8, 0.8], ap: 0.0015, h: 1 },
  { t: 3.4, p: [-3.1, 2.9, 10.2], l: [0.2, 3.2, 0], f: [0, 5.1, 0.7], ap: 0.0012, h: 1 },
  { t: 4.0, p: [-3.02, 2.9, 10.2], l: [0.27, 3.2, 0], f: [0, 5.1, 0.7], ap: 0.0012, h: 1 },
  { t: 5.15, p: [4.0, 2.2, 9.6], l: [5.5, 2.75, 0], f: [3, 4.8, 0.7], ap: 0.0013, h: 1 },
  { t: 6.8, p: [4.1, 2.2, 9.6], l: [5.56, 2.75, 0], f: [6, 3.8, 0.7], ap: 0.0013, h: 1 },
  { t: 7.75, p: [-4.4, 3.9, 13.6], l: [1.9, 2.43, 0], f: [1, 2.6, 0.6], ap: 0.0003 },
  { t: 9.2, p: CAM_FINAL.toArray(), l: [0.4, 2.3, 0], f: [0, 2.5, 0.5], ap: 0, h: 1 },
  { t: 12.0, p: [-7.79, 4.56, 15.1], l: [0.44, 2.3, 0], f: [0, 2.5, 0.5], ap: 0, h: 1 },
];
const DURATION = 12.0;
function hermiteKeys(keys, t, get) {
  if (t <= keys[0].t) return get(keys[0]).slice();
  if (t >= keys[keys.length - 1].t) return get(keys[keys.length - 1]).slice();
  let i = 0; while (t > keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[i + 1], dt = k1.t - k0.t, s = (t - k0.t) / dt;
  const tan = j => {
    if (j === 0 || j === keys.length - 1 || keys[j].h) return get(keys[j]).map(() => 0);
    const a = get(keys[j - 1]), b = get(keys[j + 1]), span = keys[j + 1].t - keys[j - 1].t;
    return a.map((v, c) => (b[c] - v) / span);
  };
  const m0 = tan(i), m1 = tan(i + 1), v0 = get(k0), v1 = get(k1);
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
  return v0.map((v, c) => h00 * v + h10 * dt * m0[c] + h01 * v1[c] + h11 * dt * m1[c]);
}
const _look = new THREE.Vector3(), _focus = new THREE.Vector3();
function updateCamera(t) {
  const p = hermiteKeys(CAM, t, k => k.p), l = hermiteKeys(CAM, t, k => k.l), f = hermiteKeys(CAM, t, k => k.f), ap = hermiteKeys(CAM, t, k => [k.ap])[0];
  camera.position.set(...p); _look.set(...l); camera.lookAt(_look); camera.updateMatrixWorld();
  bokeh.uniforms.focus.value = camera.position.distanceTo(_focus.set(...f));
  bokeh.uniforms.aperture.value = Math.max(0, ap);
}

// ---------------------------------------------------------------- título 2D chapado por cima
const hudA = document.getElementById('abertura'), hudB = document.getElementById('conclusao'), hudN = document.getElementById('nota');
function updateHud(t) {
  const a = 1 - smooth((t - 2.2) / 0.3);
  hudA.style.opacity = a; hudA.style.transform = `translateY(${(1 - a) * -10}px)`;
  const b = easeOut((t - 9.7) / 0.4);
  hudB.style.opacity = b; hudB.style.transform = `translateY(${(1 - b) * 14}px)`;
  hudN.style.opacity = 0.78 * easeOut((t - 9.95) / 0.4);
}

// ---------------------------------------------------------------- o quadro no instante t
function frame(t) {
  stacks.forEach((st, i) => {
    const landed = updateStack(st, t), L = labels[i];
    if (landed === 0) { L.grp.visible = false; return; }
    L.grp.visible = true;
    const v = landed >= st.n ? DATA[i].v : DATA[i].v * landed / st.n;
    setLabel(L, i, fmt(v), BH + landed * HC, (t - st.coins[st.n - 1].tl - 0.04) / 0.32);
  });
  updateTags(t);
  updateCamera(t);
  updateHud(t);
}
function render() { composer.render(); }

const KEYS = [ // momentos-chave
  { id: '01-abertura', t: 0.55 },
  { id: '02-2023-despeja', t: 1.5 },
  { id: '03-2024-o-topo', t: 3.0 },
  { id: '04-2025', t: 4.85 },
  { id: '05-2026-hoje', t: 6.0 },
  { id: '06-recuo', t: 7.9 },
  { id: '07-etiquetas', t: 8.95 },
  { id: '08-conclusao', t: 11.4 },
];

window.KEYS = KEYS;
window.DURATION = DURATION;
window.renderKey = i => { frame(KEYS[i].t); render(); return KEYS[i].id; };
window.renderAt = t => { frame(t); render(); return t; };
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida';
const q = new URLSearchParams(location.search);
if (q.has('t')) window.renderAt(Number(q.get('t'))); else window.renderKey(Number(q.get('key') ?? 7));
window.ready = true;
