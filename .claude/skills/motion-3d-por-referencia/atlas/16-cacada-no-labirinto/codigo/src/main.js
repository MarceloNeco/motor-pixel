// cacada-no-labirinto: uma perseguição em labirinto, 15 s, 1920x1080.
// O Clawd (mascote do Claude Code) recolhe pontos de luz numa placa de circuito e foge de dois monstrinhos e dois
// fantasmas; ao pegar o núcleo de energia, o jogo vira e ele passa a caçar os quatro.
// Da imagem de referência vem só a fotografia: ambiente azul-noite, piso polido, pontos de luz quente,
// plástico brilhante de brinquedo, câmera 3/4 próxima e fundo desfocado.
// Tudo procedural (sem modelos, sem imagens) e tudo função do tempo: renderAt(t) recalcula a cena inteira.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const VW = 1920, VH = 1080, FPS = 30, PI = Math.PI, TAU = PI * 2;
const DURATION = 15.0;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const easeOutBack = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const win = (t, a, b, f = 0.12) => smooth((t - a) / f) * (1 - smooth((t - b) / f));        // janela suave [a, b]
const hit = (t, t0, up, down) => t < t0 ? 0 : t < t0 + up ? (t - t0) / up : Math.exp(-(t - t0 - up) / down); // ataque + queda
const arc = (t, t0, dur, h) => { const u = (t - t0) / dur; return u <= 0 || u >= 1 ? 0 : 4 * h * u * (1 - u); };  // pulinho
const angDiff = (a, b) => { const d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

await document.fonts.load('800 40px Inter');
await document.fonts.load('700 20px "JetBrains Mono"');

// ---------------------------------------------------------------- o labirinto (desenho próprio: só blocos retangulares)
const MAP = [
  '#########################',
  '#.......................#',
  '#.###.###.#####.###.###.#',
  '#.###.###.#####.###.###.#',
  '#.......................#',
  '#.#.#####.##.##.#####.#.#',
  '#.#.......##.##.......#.#',
  '#.#.#####.##.##.#####.#.#',
  '#.......................#',
  '#.###.###.#####.###.###.#',
  '#.###.###.#####.###.###.#',
  '#.......................#',
  '#########################',
];
const GW = MAP[0].length, GH = MAP.length, OX = (GW - 1) / 2, OZ = (GH - 1) / 2;
const open = (x, z) => x >= 0 && z >= 0 && x < GW && z < GH && MAP[z][x] !== '#';
const WX = gx => gx - OX, WZ = gz => gz - OZ;      // célula da grade -> mundo (1 célula = 1 unidade)
const ORBS = [[23, 4], [1, 8], [12, 1]];           // núcleos de energia; o primeiro é o que o herói pega
const INSET = 0.15;                                // recuo das peças em relação à célula (corredor livre de 1,3)

// ---------------------------------------------------------------- paleta com papéis
const C = {
  night: '#01030a', haze: '#030718',
  board: '#060b22',                               // máscara de solda azul-noite
  chip: '#0a1233', plate: '#101d4d', pin: '#d9c58e', cap: '#7d8698',
  scared: '#b3bde0',
  paper: '#f6f5f4',
};

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
scene.fog = new THREE.Fog(C.haze, 13, 44);
const pmrem = new THREE.PMREMGenerator(renderer);

// ambiente de estúdio escuro: é o que o plástico brilhante reflete. Painel quente grande na frente à direita
// (o brilho no alto dos personagens), faixa fria atrás à esquerda (o recorte azul nas bordas).
function studioEnv() {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { lo: { value: new THREE.Color('#02040b') }, mid: { value: new THREE.Color('#070d22') }, hi: { value: new THREE.Color('#03060f') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 lo; uniform vec3 mid; uniform vec3 hi; varying vec3 vP; void main(){ vec3 c = vP.y < 0.0 ? mix(mid, lo, clamp(-vP.y * 3.0, 0.0, 1.0)) : mix(mid, hi, clamp(vP.y * 1.6, 0.0, 1.0)); gl_FragColor = vec4(c, 1.0); }',
  })));
  const panel = (w, h, color, k, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(30, 22, '#ffdcb0', 6.0, [28, 26, 22]);   // chave quente: frente, direita, alto
  panel(6, 30, '#6f9bff', 2.6, [-34, 10, -22]);  // recorte frio: atrás, à esquerda
  panel(34, 7, '#ffc98f', 1.1, [0, 3, 40]);      // frente baixa: o calor dos pontos de luz subindo
  panel(40, 40, '#9fb6ff', 0.16, [0, 46, 0]);    // teto frio e fraco
  return pmrem.fromScene(s, 0.02).texture;
}
scene.environment = studioEnv();
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(32, VW / VH, 0.1, 400);
camera.layers.enable(1); // camada 1 = brilhos chapados no piso: a câmera vê, o espelho do piso não (senão dobram)
const onlyCam = o => { o.traverse(c => c.layers.set(1)); return o; };

const rtA = new THREE.WebGLRenderTarget(VW, VH, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rtA);
composer.renderToScreen = false; // o resultado linear vai para o acumulador (desfoque de movimento), não para a tela
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 6, aperture: 0.002, maxblur: 0.0075 });
bokeh.uniforms.seed = { value: 0 };
// desfoque próprio: o do three.js deixa o que está nítido na frente "vazar" no fundo desfocado.
// Aqui cada amostra mais próxima que o pixel só entra se o desfoque DELA alcançar o pixel.
// O padrão de amostras gira por pixel e por subquadro: o ruído some na média do desfoque de movimento.
bokeh.materialBokeh.fragmentShader = /* glsl */`
  #include <common>
  varying vec2 vUv;
  uniform sampler2D tColor; uniform sampler2D tDepth;
  uniform float maxblur; uniform float aperture; uniform float nearClip; uniform float farClip; uniform float focus; uniform float aspect; uniform float seed;
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
  float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  void main() {
    float vz = viewZAt(vUv), c = coc(vz);
    vec4 acc = texture2D(tColor, vUv); float wsum = 1.0;
    float rot = hash12(gl_FragCoord.xy + seed * 61.7) * 6.2831853;
    const int N = 64;
    for (int i = 0; i < N; i++) {
      float fi = float(i) + 0.5, r = sqrt(fi / float(N)), a = fi * 2.399963 + rot;
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
const bloom = new UnrealBloomPass(new THREE.Vector2(VW, VH), 0.2, 0.5, 1.1);
composer.addPass(bloom);

// acumulador: soma os subquadros (em luz linear) antes do tom e do grão
const accRT = new THREE.WebGLRenderTarget(VW, VH, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, w: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb * w, w); }',
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  depthTest: false, depthWrite: false, transparent: true,
});
const accQuad = new FullScreenQuad(accMat);

// saída: ganho + vinheta (em luz linear) -> tom ACES + sRGB -> grão fino (segura o degradê escuro na compressão)
const finalComposer = new EffectComposer(renderer);
const grade = new ShaderPass({
  uniforms: { tAcc: { value: accRT.texture }, gain: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`uniform sampler2D tAcc; uniform float gain; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tAcc, vUv).rgb * gain; vec2 q = vUv - 0.5; q.x *= 1.18;
      float v = smoothstep(0.86, 0.22, length(q)); c *= mix(0.30, 1.0, v); gl_FragColor = vec4(c, 1.0); }`,
});
grade.uniforms.tAcc.value = accRT.texture; // o ShaderPass clona os uniformes e descarta textura de render target
finalComposer.addPass(grade);
finalComposer.addPass(new OutputPass());
const grain = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, seed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`uniform sampler2D tDiffuse; uniform float seed; varying vec2 vUv;
    float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float n = hash12(gl_FragCoord.xy + seed * 37.0) + hash12(gl_FragCoord.yx + seed * 11.0 + 7.0) - 1.0;
      gl_FragColor = vec4(c + n * 0.014, 1.0); }`,
});
finalComposer.addPass(grain);

// ---------------------------------------------------------------- luz
const KEY_I = 300;
scene.add(new THREE.HemisphereLight('#2c4296', '#3a2106', 0.4)); // céu frio, chão quente (o calor dos pontos de luz)
const key = new THREE.SpotLight('#ffd6a6', KEY_I, 0, 0.5, 0.95, 2);  // foco quente: frente, direita, alto. Segue a ação
key.castShadow = true; key.shadow.mapSize.set(4096, 4096);
key.shadow.camera.near = 3; key.shadow.camera.far = 60; key.shadow.bias = -0.0002; key.shadow.normalBias = 0.02;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight('#5b86ff', 0.42);           // recorte azul por trás, à esquerda
rim.position.set(-10, 3.2, -12); scene.add(rim);
const heroLight = new THREE.PointLight('#ffb35c', 2, 6.5, 2);      // o calor que anda com o herói
scene.add(heroLight);
const orbLight = new THREE.PointLight('#ffe0a6', 0, 9, 2);         // o núcleo de energia e o clarão quando ele é pego
scene.add(orbLight);

// ---------------------------------------------------------------- texturas em canvas
function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function tex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t; }
const glowTex = tex(canvas(256, 256, (g, w) => { // mancha de luz macia
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,0.55)'); r.addColorStop(0.45, 'rgba(255,255,255,0.16)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
}), false);

// ---------------------------------------------------------------- peças do labirinto: lê o mapa e acha os retângulos
const rects = [];
{
  const seen = MAP.map(r => [...r].map(() => false));
  for (let z = 1; z < GH - 1; z++) for (let x = 1; x < GW - 1; x++) {
    if (MAP[z][x] !== '#' || seen[z][x]) continue;
    let x1 = x; while (x1 + 1 < GW - 1 && MAP[z][x1 + 1] === '#' && !seen[z][x1 + 1]) x1++;
    let z1 = z;
    grow: while (z1 + 1 < GH - 1) { for (let i = x; i <= x1; i++) if (MAP[z1 + 1][i] !== '#') break grow; z1++; }
    for (let j = z; j <= z1; j++) for (let i = x; i <= x1; i++) seen[j][i] = true;
    rects.push({ x0: x, z0: z, x1, z1, w: x1 - x + 1, d: z1 - z + 1 });
  }
}

// ---------------------------------------------------------------- piso: mesa preta espelhada + placa translúcida + véu
const HALF_X = GW / 2, HALF_Z = GH / 2;                     // 12,5 e 6,5: limite das células
const FRAME_OUT = 0.18;                                     // quanto a moldura passa do limite das células
const BX = HALF_X + FRAME_OUT, BZ = HALF_Z + FRAME_OUT;     // meia-placa
const mirror = new Reflector(new THREE.PlaneGeometry(260, 260), { textureWidth: 1600, textureHeight: 900, color: 0x8c93ab, multisample: 4, clipBias: 0.003 });
mirror.rotation.x = -PI / 2; scene.add(mirror);
mirror.getReflectionCamera(camera).layers.set(0);
{
  const PXU = 280, W = Math.round(BX * 2 * PXU), H = Math.round(BZ * 2 * PXU); // textura da placa: 280 px por unidade
  const boardTex = tex(canvas(W, H, g => {
    g.fillStyle = C.board; g.fillRect(0, 0, W, H);
    g.setTransform(PXU, 0, 0, PXU, W / 2, H / 2); // desenha em unidades do mundo (x, z)
    const rnd = mulberry32(11);
    const DX = [1, 0.7071, 0, -0.7071, -1, -0.7071, 0, 0.7071], DZ = [0, 0.7071, 1, 0.7071, 0, -0.7071, -1, -0.7071];
    g.lineJoin = 'round'; g.lineCap = 'round';
    for (let i = 0; i < 210; i++) { // trilhas: retas com quebras de 45 graus, terminando numa via
      let x = Math.round((rnd() * 2 - 1) * (HALF_X - 0.4) * 8) / 8, z = Math.round((rnd() * 2 - 1) * (HALF_Z - 0.4) * 8) / 8;
      let dir = Math.floor(rnd() * 4) * 2;
      g.beginPath(); g.moveTo(x, z);
      const n = 2 + Math.floor(rnd() * 4);
      for (let k = 0; k < n; k++) {
        const len = (1 + Math.floor(rnd() * 9)) * 0.25 * (dir % 2 ? 0.6 : 1.6);
        x = clamp(x + DX[dir] * len, -HALF_X + 0.3, HALF_X - 0.3); z = clamp(z + DZ[dir] * len, -HALF_Z + 0.3, HALF_Z - 0.3);
        g.lineTo(x, z);
        dir = (dir + (rnd() < 0.5 ? 1 : 7)) % 8;
      }
      const a = 0.16 + rnd() * 0.14;
      g.strokeStyle = `rgba(56, 92, 210, ${a})`; g.lineWidth = 0.026 + rnd() * 0.016; g.stroke();
      g.beginPath(); g.arc(x, z, 0.06, 0, TAU); g.fillStyle = `rgba(74, 112, 228, ${a + 0.1})`; g.fill();
      g.beginPath(); g.arc(x, z, 0.024, 0, TAU); g.fillStyle = '#040818'; g.fill();
    }
    for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) { // ilha de solda debaixo de cada ponto de luz
      if (!open(x, z)) continue;
      g.beginPath(); g.arc(WX(x), WZ(z), 0.13, 0, TAU); g.strokeStyle = 'rgba(126, 150, 235, 0.20)'; g.lineWidth = 0.018; g.stroke();
    }
    g.setTransform(1, 0, 0, 1, 0, 0); // serigrafia: em pixels
    g.font = `700 ${Math.round(0.105 * PXU)}px "JetBrains Mono"`; g.textBaseline = 'alphabetic'; g.fillStyle = 'rgba(186, 202, 255, 0.24)';
    rects.forEach((r, i) => {
      const smd = Math.min(r.w, r.d) === 1 && Math.max(r.w, r.d) === 3;
      g.fillText((smd ? 'C' : 'U') + (i + 1), W / 2 + (WX(r.x0) - 0.5 + INSET + 0.02) * PXU, H / 2 + (WZ(r.z0) - 0.5 + INSET - 0.035) * PXU);
    });
  }));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(BX * 2, BZ * 2), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.42, metalness: 0, transparent: true, opacity: 0.86, depthWrite: false, envMapIntensity: 0.25 }));
  board.rotation.x = -PI / 2; board.position.y = 0.003; board.receiveShadow = true; board.renderOrder = 1; scene.add(board);
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.ShaderMaterial({ // apaga a mesa ao longe
    transparent: true, depthWrite: false, fog: false,
    uniforms: { col: { value: new THREE.Color(C.haze) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform vec3 col; varying vec3 vW; void main(){ vec2 q = max(abs(vW.xz) - vec2(13.0, 7.0), 0.0); float d = length(q); gl_FragColor = vec4(col * 0.5, smoothstep(0.0, 14.0, d) * 0.96); }',
  }));
  veil.rotation.x = -PI / 2; veil.position.y = 0.005; veil.renderOrder = 2; scene.add(veil);
}

// ---------------------------------------------------------------- paredes: chips, componentes e a moldura
const chipMat = new THREE.MeshPhysicalMaterial({ color: C.chip, roughness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.3 });
const plateMat = new THREE.MeshPhysicalMaterial({ color: C.plate, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 });
const pinMat = new THREE.MeshStandardMaterial({ color: C.pin, metalness: 1, roughness: 0.3 });
const capMat = new THREE.MeshStandardMaterial({ color: C.cap, metalness: 1, roughness: 0.42 });
const dotMat = new THREE.MeshStandardMaterial({ color: '#4d6fe0', roughness: 0.4 });
const CHIP_H = 0.22; // paredes baixas: não escondem quem está no corredor
const shadowed = o => { o.castShadow = true; o.receiveShadow = true; return o; };
{
  const pins = [];
  for (const r of rects) {
    const cx = WX((r.x0 + r.x1) / 2), cz = WZ((r.z0 + r.z1) / 2), W = r.w - 2 * INSET, D = r.d - 2 * INSET;
    const body = shadowed(new THREE.Mesh(new RoundedBoxGeometry(W, CHIP_H, D, 4, 0.055), chipMat));
    body.position.set(cx, CHIP_H / 2, cz); scene.add(body);
    const smd = Math.min(r.w, r.d) === 1 && Math.max(r.w, r.d) === 3;
    if (smd) { // componente de duas pontas: corpo escuro com terminais de metal
      for (const s of [-1, 1]) {
        const longZ = r.d > r.w, capL = 0.36;
        const cap = shadowed(new THREE.Mesh(new RoundedBoxGeometry(longZ ? W + 0.03 : capL, CHIP_H + 0.02, longZ ? capL : D + 0.03, 3, 0.04), capMat));
        cap.position.set(cx + (longZ ? 0 : s * (W / 2 - capL / 2 + 0.015)), (CHIP_H + 0.02) / 2, cz + (longZ ? s * (D / 2 - capL / 2 + 0.015) : 0));
        scene.add(cap);
      }
      continue;
    }
    const plate = shadowed(new THREE.Mesh(new RoundedBoxGeometry(W - 0.15, 0.03, D - 0.15, 2, 0.014), plateMat));
    plate.position.set(cx, CHIP_H + 0.012, cz); scene.add(plate);
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.008, 20), dotMat);
    dot.position.set(cx - W / 2 + 0.22, CHIP_H + 0.03, cz + D / 2 - 0.22); scene.add(dot);
    const alongX = r.w >= r.d, L = alongX ? W : D, n = Math.max(2, Math.floor((L - 0.34) / 0.25) + 1); // terminais nos lados compridos
    for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
      const u = (i - (n - 1) / 2) * 0.25;
      pins.push(alongX ? [cx + u, cz + s * (D / 2 + 0.035), 0] : [cx + s * (W / 2 + 0.035), cz + u, 1]);
    }
  }
  const pinMesh = new THREE.InstancedMesh(new RoundedBoxGeometry(0.105, 0.05, 0.17, 2, 0.016), pinMat, pins.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI / 2), one = new THREE.Vector3(1, 1, 1);
  pins.forEach((p, i) => pinMesh.setMatrixAt(i, m.compose(new THREE.Vector3(p[0], 0.03, p[1]), p[2] ? qy : q, one)));
  shadowed(pinMesh); scene.add(pinMesh);

  // moldura: um anel só, de cantos redondos, em volta de tudo
  const rr = (p, x0, y0, x1, y1, r) => { p.moveTo(x0 + r, y0); p.lineTo(x1 - r, y0); p.absarc(x1 - r, y0 + r, r, -PI / 2, 0, false); p.lineTo(x1, y1 - r); p.absarc(x1 - r, y1 - r, r, 0, PI / 2, false); p.lineTo(x0 + r, y1); p.absarc(x0 + r, y1 - r, r, PI / 2, PI, false); p.lineTo(x0, y0 + r); p.absarc(x0 + r, y0 + r, r, PI, 1.5 * PI, false); };
  const sh = new THREE.Shape(); rr(sh, -BX + 0.06, -BZ + 0.06, BX - 0.06, BZ - 0.06, 0.62);
  const hole = new THREE.Path(); const ix = HALF_X - 1 + INSET, iz = HALF_Z - 1 + INSET; rr(hole, -ix + 0.05, -iz + 0.05, ix - 0.05, iz - 0.05, 0.3); sh.holes.push(hole);
  const fg = new THREE.ExtrudeGeometry(sh, { depth: CHIP_H - 0.05, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 14 });
  fg.rotateX(-PI / 2);
  const frameMat = new THREE.MeshPhysicalMaterial({ color: C.chip, roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.5 });
  const frame = shadowed(new THREE.Mesh(fg, frameMat)); scene.add(frame);
  const sh2 = new THREE.Shape(); rr(sh2, -BX + 0.3, -BZ + 0.3, BX - 0.3, BZ - 0.3, 0.45);
  const hole2 = new THREE.Path(); rr(hole2, -ix - 0.2, -iz - 0.2, ix + 0.2, iz + 0.2, 0.2); sh2.holes.push(hole2);
  const fg2 = new THREE.ExtrudeGeometry(sh2, { depth: 0.03, bevelEnabled: false, curveSegments: 14 }); fg2.rotateX(-PI / 2);
  const frameTop = shadowed(new THREE.Mesh(fg2, new THREE.MeshPhysicalMaterial({ color: C.plate, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.4 }))); frameTop.position.y = CHIP_H - 0.005; scene.add(frameTop);
}

// ---------------------------------------------------------------- caminhos: pontos da grade com as esquinas arredondadas
function buildPath(pts, r = 0.36) {
  const segs = []; let prev = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], last = i === pts.length - 1;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), din = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const end = last ? b : [b[0] - din[0] * r, b[1] - din[1] * r];
    segs.push({ k: 'L', a: prev, d: din, len: Math.hypot(end[0] - prev[0], end[1] - prev[1]) });
    if (!last) {
      const n = pts[i + 1], L2 = Math.hypot(n[0] - b[0], n[1] - b[1]), dout = [(n[0] - b[0]) / L2, (n[1] - b[1]) / L2];
      const c = [end[0] + dout[0] * r, end[1] + dout[1] * r], start2 = [b[0] + dout[0] * r, b[1] + dout[1] * r];
      const a0 = Math.atan2(end[1] - c[1], end[0] - c[0]);
      let da = Math.atan2(start2[1] - c[1], start2[0] - c[0]) - a0;
      while (da > PI) da -= TAU; while (da < -PI) da += TAU;
      segs.push({ k: 'A', c, a0, da, r, len: Math.abs(da) * r });
      prev = start2;
    }
  }
  let len = 0; for (const s of segs) { s.s0 = len; len += s.len; }
  function at(s) { // -> [x, z, tangente x, tangente z] na grade
    s = clamp(s, 0, len);
    let g = segs[segs.length - 1];
    for (const q of segs) if (s <= q.s0 + q.len) { g = q; break; }
    if (g.k === 'L') return [g.a[0] + g.d[0] * (s - g.s0), g.a[1] + g.d[1] * (s - g.s0), g.d[0], g.d[1]];
    const ang = g.a0 + g.da * (g.len > 0 ? (s - g.s0) / g.len : 0), sg = Math.sign(g.da);
    return [g.c[0] + g.r * Math.cos(ang), g.c[1] + g.r * Math.sin(ang), -Math.sin(ang) * sg, Math.cos(ang) * sg];
  }
  function sOf(x, z) { let best = 0, bd = 1e9; for (let s = 0; s <= len + 1e-6; s += 0.005) { const p = at(s), d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < bd - 1e-9) { bd = d; best = s; } } return best; }
  return { len, at, sOf };
}
// tempo -> distância no caminho: interpolação monotônica (não volta, não passa do ponto), velocidade contínua
function pchip(keys, o = {}) {
  const n = keys.length, h = [], d = [];
  for (let i = 0; i < n - 1; i++) { h[i] = keys[i + 1][0] - keys[i][0]; d[i] = (keys[i + 1][1] - keys[i][1]) / h[i]; }
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) if (d[i - 1] * d[i] > 0) { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
  m[0] = o.v0 ?? d[0]; m[n - 1] = o.v1 ?? d[n - 2];
  return t => {
    if (t <= keys[0][0]) return o.extrap ? keys[0][1] + m[0] * (t - keys[0][0]) : keys[0][1];
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (t > keys[i + 1][0]) i++;
    const u = (t - keys[i][0]) / h[i], u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * keys[i][1] + (u3 - 2 * u2 + u) * h[i] * m[i] + (-2 * u3 + 3 * u2) * keys[i + 1][1] + (u3 - u2) * h[i] * m[i + 1];
  };
}
// ator: uma sequência de trechos (caminho + chaves de tempo). Entre dois trechos ele fica parado e gira (spin).
function makeActor(legs) {
  const L = legs.map(g => {
    const path = buildPath(g.pts), keys = g.keys.map(k => [k[0], path.sOf(k[1], k[2])]);
    return { path, f: pchip(keys, g), t0: keys[0][0], t1: keys[keys.length - 1][0], s0: keys[0][1], s1: keys[keys.length - 1][1], spin: g.spin };
  });
  const legAt = t => { let i = 0; while (i < L.length - 1 && t >= L[i + 1].t0) i++; return i; };
  const gpos = t => { const g = L[legAt(t)]; return g.path.at(g.f(Math.min(t, g.t1))); };
  function headingRaw(t) {
    const i = legAt(t), g = L[i], p = g.path.at(g.f(Math.min(t, g.t1)));
    let hd = Math.atan2(p[2], p[3]);
    const nx = L[i + 1];
    if (nx && nx.spin && t > g.t1) hd += (nx.spin[2] ?? 1) * PI * smooth((t - nx.spin[0]) / (nx.spin[1] - nx.spin[0]));
    return hd;
  }
  function heading(t) { const h0 = headingRaw(t); let acc = 0; for (let k = -2; k <= 2; k++) acc += angDiff(headingRaw(t + k * 0.024), h0); return h0 + acc / 5; }
  function dist(t) { const i = legAt(t); let dd = 0; for (let j = 0; j < i; j++) dd += L[j].s1 - L[j].s0; return dd + L[i].f(Math.min(t, L[i].t1)) - L[i].s0; }
  function state(t) {
    const e = 1 / 120, p = gpos(t), pa = gpos(t - e), pb = gpos(t + e);
    const va = Math.hypot(p[0] - pa[0], p[1] - pa[1]) / e, vb = Math.hypot(pb[0] - p[0], pb[1] - p[1]) / e;
    return { gx: p[0], gz: p[1], x: WX(p[0]), z: WZ(p[1]), h: heading(t), v: (va + vb) / 2, a: (vb - va) / e, w: angDiff(heading(t + e), heading(t - e)) / (2 * e), dist: dist(t) };
  }
  return { gpos, state };
}

// ---------------------------------------------------------------- coreografia (grade: x 0..24, z 0..12; z cresce para a câmera)
// Clawd: foge pela fileira de baixo, sobe, corta pelo meio, dispara pelo corredor comprido até o núcleo de energia; depois volta caçando
const hero = makeActor([
  { pts: [[23, 8.4], [23, 11], [15, 11], [15, 8], [12, 8], [12, 4], [23, 4]], extrap: true, v1: 0,
    keys: [[0, 21, 11], [1.76, 15, 11], [2.65, 15, 8], [3.5, 12, 8], [4.65, 12, 4], [7.5, 22, 4], [7.9, 23, 4]] },
  { pts: [[23, 4], [1, 4], [1, 8], [5, 8]], v0: 0, spin: [7.92, 8.34, -1],
    keys: [[8.95, 23, 4], [9.8, 20.55, 4], [10.65, 16.75, 4], [11.5, 12.9, 4], [12.35, 9.0, 4], [13.4, 5.1, 4], [14.5, 1, 4], [15.4, 1, 7]] },
]);
const POP = 0.4; // tempo entre o tranco e o estouro
// perseguidores, na ordem em que ficam enfileirados atrás dele: monstro, fantasma, monstro, fantasma
const FOES = [
  { kind: 'ciclope', color: '#35c56c', scaredAt: 7.92, catchT: 11.5, pts: 300, actor: makeActor([ // A: vem de frente e depois segue
    { pts: [[9, 9], [9, 11], [15, 11], [15, 8], [12, 8], [12, 4], [19.3, 4]], v1: 0,
      keys: [[0, 9, 10], [0.35, 9, 11], [2.7, 15, 11], [3.6, 15, 8], [4.5, 12, 8], [6.05, 12, 4], [7.8, 18.6, 4], [8.2, 19.3, 4]] },
    { pts: [[19.3, 4], [1, 4]], v0: 0, spin: [8.45, 8.72, -1], keys: [[8.72, 19.3, 4], [9.02, 18.9, 4], [11.5, 12.05, 4]] },
  ]) },
  { kind: 'trio', color: '#a54bff', scaredAt: 7.8, catchT: 9.8, pts: 100, actor: makeActor([ // B: chega pela direita
    { pts: [[23, 6], [23, 8], [12, 8], [12, 4], [21.7, 4]], v1: 0,
      keys: [[0, 23, 6], [0.9, 23, 8], [1.5, 21, 8], [3.3, 15, 8], [4.15, 12, 8], [5.3, 12, 4], [7.7, 21.0, 4], [8.05, 21.7, 4]] },
    { pts: [[21.7, 4], [1, 4]], v0: 0, spin: [8.7, 9.0, 1], keys: [[9.0, 21.7, 4], [9.3, 21.3, 4], [9.8, 19.7, 4]] },
  ]) },
  { kind: 'fantasma', color: '#eef1ff', glow: '#7fa8ff', scaredAt: 7.86, catchT: 10.65, pts: 200, actor: makeActor([ // C: fecha o corredor comprido pela esquerda
    { pts: [[1, 1], [1, 4], [20.5, 4]], v0: 0, v1: 0,
      keys: [[1.5, 1, 1], [2.4, 1, 4], [5.7, 12, 4], [7.75, 19.8, 4], [8.12, 20.5, 4]] },
    { pts: [[20.5, 4], [1, 4]], v0: 0, spin: [8.55, 8.85, -1], keys: [[8.85, 20.5, 4], [9.15, 20.1, 4], [10.65, 15.9, 4]] },
  ]) },
  { kind: 'fantasma', color: '#e6fff3', glow: '#4fe0aa', scaredAt: 8.0, catchT: 12.35, pts: 400, actor: makeActor([ // D: desce de cima e chega por último
    { pts: [[15, 1], [15, 4], [18.1, 4]], v0: 0, v1: 0,
      keys: [[5.9, 15, 1], [7.15, 15, 4], [8.0, 17.5, 4], [8.35, 18.1, 4]] },
    { pts: [[18.1, 4], [1, 4]], v0: 0, spin: [8.38, 8.62, 1], keys: [[8.62, 18.1, 4], [8.92, 17.7, 4], [12.35, 8.15, 4]] },
  ]) },
];

// ---------------------------------------------------------------- pontos de luz: um em cada célula e um entre células vizinhas
const pellets = [];
{
  const isOrb = (x, z) => ORBS.some(o => o[0] === x && o[1] === z);
  for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) {
    if (!open(x, z)) continue;
    if (!isOrb(x, z)) pellets.push({ gx: x, gz: z });
    if (open(x + 1, z)) pellets.push({ gx: x + 0.5, gz: z });
    if (open(x, z + 1)) pellets.push({ gx: x, gz: z + 0.5 });
  }
  ORBS.forEach(o => pellets.push({ gx: o[0], gz: o[1], orb: true }));
  // quando o herói alcança cada um (o caminho é conhecido de antemão; os de antes de t=0 já foram recolhidos)
  for (let k = -300; k <= DURATION * 240; k++) {
    const t = k / 240, p = hero.gpos(t);
    for (const q of pellets) if (q.te === undefined && (q.gx - p[0]) ** 2 + (q.gz - p[1]) ** 2 < 0.44 * 0.44) q.te = t;
  }
  pellets.forEach((q, i) => { q.x = WX(q.gx); q.z = WZ(q.gz); q.ph = (i * 0.618) % 1 * TAU; });
}
const T_ORB = pellets.find(q => q.orb && q.te !== undefined).te; // o instante em que o jogo vira
const EATS = pellets.filter(q => q.te !== undefined && !q.orb).map(q => q.te).sort((a, b) => a - b);
const PY = 0.17, EAT = 0.1; // altura dos pontos; duração da sucção
const small = pellets.filter(q => !q.orb), orbs = pellets.filter(q => q.orb);
const pelletMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.062, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 1.65, 0.6) }), small.length);
pelletMesh.frustumCulled = false; scene.add(pelletMesh);
const poolGeo = new THREE.PlaneGeometry(1, 1); poolGeo.rotateX(-PI / 2);
const poolMesh = onlyCam(new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }), small.length));
poolMesh.frustumCulled = false; poolMesh.renderOrder = 3; scene.add(poolMesh);
const POOL = new THREE.Color(0.42, 0.18, 0.05);
const orbObjs = orbs.map(q => {
  const g = new THREE.Group(); g.position.set(q.x, 0.34, q.z);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.19, 28, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(5.0, 3.6, 2.0) }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.014, 8, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.1, 0.8) }));
  const ring2 = ring.clone();
  g.add(core, ring, ring2); scene.add(g);
  const pool = onlyCam(new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0.8, 0.42, 0.15) })));
  pool.position.set(q.x, 0.012, q.z); pool.scale.setScalar(3.0); pool.renderOrder = 3; scene.add(pool);
  return { q, g, ring, ring2, pool };
});

// ---------------------------------------------------------------- o herói: Clawd, o mascote do Claude Code
// Desenho tirado do próprio mascote no terminal: bloco largo, dois olhos escuros na frente, um bracinho de cada
// lado a meia altura e quatro perninhas em dois pares. A grade é a do sprite: 12 "pixels" de largura, 4 de altura.
const CLAWD = 1.16;        // escala do boneco
const BODY_Y = 0.44;       // centro do corpo acima do chão (perna + meio corpo), antes da escala
const heroMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('rgb(215,119,87)'), roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.1, emissive: new THREE.Color('#ff5a1f'), emissiveIntensity: 0 });
const eyeMat = new THREE.MeshStandardMaterial({ color: '#070504', roughness: 0.55 });
const haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 1.7, 0.5) });
const heroG = new THREE.Group(), heroT = new THREE.Group(); heroG.add(heroT); scene.add(heroG);
const heroParts = {};
{
  const W = 0.78, H = 0.52, D = 0.42, px = W / 12, LEG = 0.2;
  const body = shadowed(new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.04), heroMat)); heroT.add(body);
  const eyeG = new RoundedBoxGeometry(px * 1.3, H / 4 * 1.18, 0.024, 2, 0.006);
  heroParts.eyes = [-1, 1].map(s => { const e = new THREE.Mesh(eyeG, eyeMat); e.position.set(s * 3.5 * px, H / 8, D / 2 + 0.004); heroT.add(e); return e; });
  heroParts.arms = [-1, 1].map(s => { // pivô no ombro, para o braço poder levantar
    const piv = new THREE.Group(); piv.position.set(s * (W / 2 - 0.01), -H / 8, 0);
    const arm = shadowed(new THREE.Mesh(new RoundedBoxGeometry(2 * px + 0.04, H / 4, 0.2, 2, 0.03), heroMat)); arm.position.x = s * (px + 0.01); piv.add(arm);
    heroT.add(piv); return piv;
  });
  heroParts.legY = -H / 2 - LEG / 2 + 0.02;
  heroParts.legs = [-4.5, -2.5, 2.5, 4.5].map(u => { const l = shadowed(new THREE.Mesh(new RoundedBoxGeometry(px * 1.05, LEG, 0.3, 2, 0.02), heroMat)); l.position.set(u * px, heroParts.legY, 0); heroT.add(l); return l; });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.012, 8, 72), haloMat); halo.rotation.x = PI / 2; heroT.add(halo); // anel de energia
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.009, 8, 72), haloMat); heroT.add(halo2);
  Object.assign(heroParts, { halo, halo2 });
}
const heroPool = onlyCam(new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
heroPool.renderOrder = 3; scene.add(heroPool);

// ---------------------------------------------------------------- os perseguidores: dois monstrinhos e dois fantasmas (desenho próprio)
const whiteMat = new THREE.MeshPhysicalMaterial({ color: '#f5f2ea', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
const pupilMat = new THREE.MeshPhysicalMaterial({ color: '#06070b', roughness: 0.08, clearcoat: 1 });
const mouthMat = new THREE.MeshPhysicalMaterial({ color: '#16060d', roughness: 0.22, clearcoat: 0.8 });
const ivoryMat = new THREE.MeshPhysicalMaterial({ color: '#fff0cc', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
const SCARED = new THREE.Color(C.scared);
const unitSphere = new THREE.SphereGeometry(1, 28, 18);
function lathe(pts, seg = 52) { // perfil (raio, altura) -> sólido de revolução, com a emenda nas costas
  const c = new THREE.SplineCurve(pts.map(q => new THREE.Vector2(q[0], q[1]))).getPoints(52);
  c.forEach(q => { if (q.x < 0) q.x = 0; }); c[0].x = 0; c[c.length - 1].x = 0;
  return new THREE.LatheGeometry(c, seg, PI, TAU);
}
function addEye(body, x, y, z, rw, rp) { // olho branco com pupila que segue o herói
  const c = new THREE.Vector3(x, y, z);
  const w = new THREE.Mesh(unitSphere, whiteMat); w.position.copy(c); w.castShadow = true; body.add(w);
  const q = new THREE.Mesh(unitSphere, pupilMat); body.add(q);
  return { c, w, p: q, rw, rp };
}
function aimEyes(eyes, lx, ly, lz, fear) {
  for (const e of eyes) {
    const ws = e.rw * (1 + 0.13 * fear), ps = e.rp * (1 - 0.45 * fear), pd = ws - ps * 0.77;
    e.w.scale.setScalar(ws); e.p.scale.setScalar(ps);
    e.p.position.set(e.c.x + lx * pd, e.c.y + ly * pd, e.c.z + lz * pd);
  }
}
const blob = (mat, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(unitSphere, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); return m; };
const cone = (mat, r, h, x, y, z) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), mat); m.position.set(x, y, z); m.castShadow = true; return m; };

// monstrinho 1: gota verde de um olho só, com chifres, presas e bracinhos para cima. Anda aos pulos.
function buildCiclope(c) {
  const b = c.body;
  b.add(shadowed(new THREE.Mesh(lathe([[0, 0.03], [0.26, 0.03], [0.39, 0.10], [0.43, 0.26], [0.41, 0.45], [0.33, 0.63], [0.21, 0.76], [0.09, 0.82], [0, 0.83]]), c.mat)));
  c.eyes.push(addEye(b, 0, 0.53, 0.31, 0.165, 0.078));
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.173, 28, 14, 0, TAU, 0, PI * 0.42), c.mat); lid.position.set(0, 0.53, 0.31); b.add(lid);
  for (const s of [-1, 1]) { const h = cone(ivoryMat, 0.05, 0.18, s * 0.17, 0.8, -0.02); h.rotation.z = -s * 0.5; b.add(h); }
  b.add(blob(mouthMat, 0.15, 0.05, 0.05, 0, 0.27, 0.4));
  for (const s of [-1, 1]) b.add(cone(ivoryMat, 0.026, 0.075, s * 0.075, 0.305, 0.428));
  const arms = [-1, 1].map(s => {
    const piv = new THREE.Group(); piv.position.set(s * 0.4, 0.44, 0.04);
    const a = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.14, 4, 12), c.mat)); a.rotation.z = -s * PI / 2; a.position.x = s * 0.09; piv.add(a);
    b.add(piv); return piv;
  });
  for (const s of [-1, 1]) b.add(shadowed(blob(c.matDark, 0.12, 0.06, 0.17, s * 0.19, 0.055, 0.14)));
  return a => {
    const ph = a.st.dist * 4.4;
    b.position.y += Math.abs(Math.sin(ph)) * 0.085 * a.mv;                 // pulo
    const sq = Math.cos(ph * 2) * 0.06 * a.mv; b.scale.y *= 1 + sq; b.scale.x *= 1 - sq * 0.5; b.scale.z *= 1 - sq * 0.5;
    lid.scale.setScalar(1 + 0.13 * a.fear); lid.rotation.x = lerp(0.5, -0.75, a.fear); // com medo, a pálpebra sobe
    arms.forEach((p, i) => { const s = i ? 1 : -1; p.rotation.z = s * (lerp(0.35, 1.25, a.fear) + Math.sin(a.t * 9 + i * 2.2 + c.idx) * lerp(0.3, 0.22, a.fear)); });
  };
}

// monstrinho 2: pastilha violeta de três olhos, com espinhos nas costas e boca dentada. Anda gingando.
function buildTrio(c) {
  const b = c.body;
  const torso = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.6, 0.7, 8, 0.27), c.mat)); torso.position.y = 0.37; b.add(torso);
  c.eyes.push(addEye(b, -0.21, 0.55, 0.3, 0.088, 0.044), addEye(b, 0, 0.6, 0.325, 0.108, 0.054), addEye(b, 0.21, 0.55, 0.3, 0.088, 0.044));
  [[0.14, 0.13, 0.663, 0.15], [-0.03, 0.18, 0.67, -0.05], [-0.19, 0.15, 0.647, -0.4], [-0.31, 0.11, 0.541, -0.85]].forEach(([z, h, y, rx]) => { const k = cone(ivoryMat, 0.05, h, 0, y + h / 2 - 0.02, z); k.rotation.x = rx; b.add(k); });
  const mouth = new THREE.Group(); mouth.position.set(0, 0.3, 0.352); b.add(mouth);
  mouth.add(blob(mouthMat, 0.2, 0.055, 0.04, 0, 0, 0));
  for (const x of [-0.13, -0.045, 0.045, 0.13]) { const k = cone(ivoryMat, 0.024, 0.06, x, 0.012, 0.026); k.rotation.x = PI; mouth.add(k); }
  const tail = cone(c.mat, 0.07, 0.22, 0, 0.3, -0.42); tail.rotation.x = -PI / 2 + 0.35; b.add(tail);
  for (const s of [-1, 1]) b.add(shadowed(blob(c.matDark, 0.12, 0.06, 0.17, s * 0.21, 0.05, 0.12)));
  return a => {
    const ph = a.st.dist * 7;
    b.position.y += Math.abs(Math.sin(ph)) * 0.03 * a.mv;
    b.rotation.z += Math.sin(ph) * 0.11 * a.mv;                            // ginga
    mouth.scale.y = 1 + 1.5 * a.fear;                                      // com medo, a boca abre
  };
}

// fantasma: lençol com rabo de fumaça, olhos e boca ocos, bracinhos para a frente. Flutua.
function buildFantasma(c) {
  const b = c.body;
  let g = lathe([[0, -0.04], [0.045, 0.0], [0.13, 0.09], [0.25, 0.22], [0.34, 0.40], [0.365, 0.56], [0.32, 0.71], [0.21, 0.81], [0.09, 0.855], [0, 0.86]], 56);
  g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-4);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < 0.44) { const k = (0.44 - y) / 0.48; pos.setZ(i, pos.getZ(i) - k * k * 0.5); pos.setY(i, y + k * k * 0.1); } } // o rabo dobra para trás
  g.computeVertexNormals();
  const sheet = new THREE.Group(); b.add(sheet);
  sheet.add(shadowed(new THREE.Mesh(g, c.mat)));
  const eyes = [-1, 1].map(s => { const e = blob(mouthMat, 0.062, 0.1, 0.028, s * 0.128, 0.6, 0.331); e.rotation.y = s * 0.37; sheet.add(e); return e; });
  const mouth = blob(mouthMat, 0.05, 0.055, 0.028, 0, 0.43, 0.352); sheet.add(mouth);
  const arms = [-1, 1].map(s => {
    const piv = new THREE.Group(); piv.position.set(s * 0.33, 0.45, 0.08);
    const a = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.1, 4, 12), c.mat)); a.rotation.x = PI / 2; a.position.z = 0.09; piv.add(a);
    sheet.add(piv); return piv;
  });
  return a => {
    const k = c.idx * 1.7;
    sheet.position.y = 0.14 + 0.05 * Math.sin(a.t * 3.1 + k);              // flutua
    sheet.rotation.set(clamp(a.st.v * 0.05, 0, 0.22), Math.sin(a.t * 7 + k) * 0.1 * a.mv, 0.07 * Math.sin(a.t * 2.4 + k));
    eyes.forEach(e => e.scale.set(0.062 * (1 + 0.3 * a.fear), 0.1 * (1 + 0.25 * a.fear), 0.028));
    mouth.scale.set(0.05 * (1 + 0.7 * a.fear), 0.055 * (1 + 1.3 * a.fear), 0.028);
    arms.forEach((p, i) => { p.rotation.x = lerp(-0.45, -1.6, a.fear) + Math.sin(a.t * (4 + 9 * a.fear) + i * 2 + k) * lerp(0.12, 0.3, a.fear); p.rotation.z = (i ? -1 : 1) * 0.25; });
    c.mat.emissiveIntensity = 0.3 + 0.18 * a.fear * Math.sin(a.t * 38 + k);
  };
}
function buildFoe(def, idx) {
  const g = new THREE.Group(), spin = new THREE.Group(), body = new THREE.Group();
  spin.position.y = 0.4; body.position.y = -0.4; g.add(spin); spin.add(body); scene.add(g);
  const ghost = def.kind === 'fantasma', base = new THREE.Color(def.color);
  const mat = ghost
    ? new THREE.MeshPhysicalMaterial({ color: def.color, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2, emissive: new THREE.Color(def.glow), emissiveIntensity: 0.3 })
    : new THREE.MeshPhysicalMaterial({ color: def.color, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const matDark = new THREE.MeshPhysicalMaterial({ color: base.clone().multiplyScalar(0.55), roughness: 0.35, clearcoat: 0.8 });
  const c = { ...def, idx, g, spin, body, mat, matDark, base, eyes: [], fx: new THREE.Color(def.glow ?? def.color) };
  c.anim = ({ ciclope: buildCiclope, trio: buildTrio, fantasma: buildFantasma })[def.kind](c);
  return c;
}
const foes = FOES.map(buildFoe);

// ---------------------------------------------------------------- efeitos: faíscas, ondas no piso
const foeLaunch = (b, tau) => { // depois do tranco: sobe em arco, para a frente do herói, girando
  const s = b.actor.state(b.catchT), u = Math.min(tau, POP);
  return { x: s.x - 3.4 * u + 1.6 * u * u, y: 5.0 * u - 8.0 * u * u, z: s.z, h: s.h };
};
const bursts = [ // estouros: [instante, posição, cor, quantidade, força]
  { t: T_ORB, p: [WX(23), 0.5, WZ(4)], col: new THREE.Color(6, 3.6, 1.2), n: 26, sp: 4.6 },
  ...foes.map(b => { const l = foeLaunch(b, POP); return { t: b.catchT + POP, p: [l.x, l.y + 0.35, l.z], col: b.fx.clone().multiplyScalar(5.5), n: 20, sp: 3.8 }; }),
];
const NSP = bursts.reduce((a, b) => a + b.n, 0);
const sparkMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), NSP);
sparkMesh.frustumCulled = false; scene.add(sparkMesh);
{
  const rnd = mulberry32(5); let i = 0;
  for (const b of bursts) { b.i0 = i; b.d = []; for (let k = 0; k < b.n; k++) { const th = rnd() * TAU, up = 0.15 + rnd() * 0.85, r = Math.sqrt(1 - up * up * 0.6), sp = b.sp * (0.45 + rnd() * 0.75); b.d.push([Math.cos(th) * r * sp, up * sp * 0.9, Math.sin(th) * r * sp, 0.55 + rnd() * 0.75]); sparkMesh.setColorAt(i++, b.col); } }
  sparkMesh.instanceColor.needsUpdate = true;
}
const ringMat = () => new THREE.ShaderMaterial({ // onda: um anel que abre e some
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  uniforms: { p: { value: 0 }, col: { value: new THREE.Color() } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform float p; uniform vec3 col; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float r = p * 0.92; float a = smoothstep(0.075, 0.0, abs(d - r)) * (1.0 - p) * (1.0 - p); a += smoothstep(r, 0.0, d) * 0.10 * (1.0 - p) * step(d, r); gl_FragColor = vec4(col * a, a); }',
});
const waves = [
  { t: T_ORB, x: WX(23), z: WZ(4), size: 11, dur: 0.75, col: new THREE.Color(2.6, 1.5, 0.5) },
  ...foes.map(b => { const s = b.actor.state(b.catchT); return { t: b.catchT, x: s.x, z: s.z, size: 4.4, dur: 0.5, col: b.fx.clone().multiplyScalar(2.2) }; }),
].map(w => { const m = onlyCam(new THREE.Mesh(poolGeo, ringMat())); m.material.uniforms.col.value.copy(w.col); m.position.set(w.x, 0.014, w.z); m.scale.setScalar(w.size); m.renderOrder = 4; m.visible = false; scene.add(m); return { ...w, m }; });

// ---------------------------------------------------------------- câmera: plano-sequência que segue o herói
// k = quanto a chave segue o herói (1) ou é uma posição fixa (0); p = posição, l = alvo, ap = abertura; h = a câmera para nesta chave
const CAM = [
  { t: 0.0, k: 1, p: [-4.6, 2.5, 2.3], l: [-0.4, 0.38, -0.1], ap: 0.0017, h: 1 },   // abertura: à frente dele, 3/4 de cima; ele vem para a câmera
  { t: 1.4, k: 1, p: [-4.4, 3.0, 3.0], l: [-1.2, 0.32, -0.2], ap: 0.0016 },
  { t: 2.5, k: 1, p: [0.5, 4.5, 5.3], l: [-0.1, 0.2, -1.3], ap: 0.0014 },          // ele sobe: a câmera passa para trás
  { t: 3.6, k: 1, p: [0.3, 5.0, 5.2], l: [0.0, 0.2, -1.4], ap: 0.0013 },
  { t: 5.7, k: 1, p: [3.0, 4.4, 5.1], l: [-1.6, 0.3, -0.1], ap: 0.0013 },          // corredor comprido: câmera à frente, a turma atrás dele
  { t: 7.4, k: 1, p: [2.4, 4.1, 4.8], l: [-1.6, 0.3, -0.1], ap: 0.0015 },
  { t: 8.5, k: 1, p: [-1.4, 4.9, 6.2], l: [-2.1, 0.3, -0.1], ap: 0.0015, h: 1 },   // o encontro, de perfil: ele à direita, os quatro à esquerda
  { t: 10.0, k: 1, p: [-7.0, 5.0, 6.6], l: [-3.2, 0.2, -0.2], ap: 0.001 },         // a caçada: câmera à frente de todos
  { t: 11.4, k: 1, p: [-5.2, 4.6, 5.8], l: [-2.2, 0.2, -0.2], ap: 0.0011 },
  { t: 12.2, k: 1, p: [-4.6, 5.0, 6.0], l: [-1.6, 0.2, -0.2], ap: 0.0011 },
  { t: 14.0, k: 0, p: [-0.3, 26.5, 13.8], l: [-0.1, 0, 0.75], ap: 0.0002, h: 1 },  // sobe e mostra a placa inteira, quase de cima
  { t: 15.0, k: 0, p: [-0.25, 25.5, 13.25], l: [-0.1, 0, 0.75], ap: 0.0002, h: 1 },
];
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
function follow(t, sig = 0.15, lag = 0.07) { // posição do herói suavizada no tempo: a câmera não repete cada esquina
  let x = 0, z = 0, w = 0;
  for (let i = -8; i <= 8; i++) { const tau = i * sig * 0.3, g = Math.exp(-(tau * tau) / (2 * sig * sig)), p = hero.gpos(t - lag + tau); x += WX(p[0]) * g; z += WZ(p[1]) * g; w += g; }
  return [x / w, z / w];
}
const IMPACTS = [[T_ORB, 0.075], ...FOES.map(b => [b.catchT, 0.05])];
const _look = new THREE.Vector3(), _v = new THREE.Vector3();
let DEBUG_TOP = false;
function updateCamera(t, hs) {
  if (DEBUG_TOP) { camera.position.set(0, 34, 0.01); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(); bokeh.uniforms.aperture.value = 0; return; }
  const F = follow(t), k = hermiteKeys(CAM, t, c => [c.k])[0];
  const p = hermiteKeys(CAM, t, c => c.p), l = hermiteKeys(CAM, t, c => c.l), ap = hermiteKeys(CAM, t, c => [c.ap])[0];
  let sx = 0, sy = 0; // tremida curta nos impactos
  for (const [ti, amp] of IMPACTS) { const e = hit(t, ti, 0.02, 0.11) * amp; sx += Math.sin((t - ti) * 71) * e; sy += Math.cos((t - ti) * 57) * e; }
  camera.position.set(F[0] * k + p[0] + sx, p[1] + sy, F[1] * k + p[2]);
  _look.set(F[0] * k + l[0] + sx * 0.6, l[1] + sy * 0.6, F[1] * k + l[2]);
  camera.lookAt(_look); camera.updateMatrixWorld();
  const focusPt = _v.set(lerp(_look.x, hs.x, k), 0.55, lerp(_look.z, hs.z, k)); // foco no herói; no plano geral, no meio da placa
  bokeh.uniforms.focus.value = camera.position.distanceTo(focusPt);
  bokeh.uniforms.aperture.value = Math.max(0, ap);
}

// ---------------------------------------------------------------- placar e pontos que saltam (HTML por cima)
const elPontos = document.getElementById('pontos'), elPops = document.getElementById('pops');
const POPS = [
  ...foes.map(b => ({ t: b.catchT + POP, txt: '+' + b.pts, col: '#' + b.fx.getHexString(), at: () => { const l = foeLaunch(b, POP); return [l.x, l.y + 0.5, l.z]; } }))]
  .map(p => { const el = document.createElement('div'); el.className = 'pop'; el.textContent = p.txt; el.style.textShadow = `0 0 22px ${p.col}, 0 0 6px ${p.col}, 0 3px 12px rgba(0,0,0,.7)`; elPops.appendChild(el); return { ...p, el, pos: p.at() }; });
const BASE_SCORE = 320;
function updateHud(t) {
  let n = 0; while (n < EATS.length && EATS[n] <= t) n++;
  const first = EATS.findIndex(e => e >= 0);
  let score = BASE_SCORE + Math.max(0, n - Math.max(0, first)) * 10 + (t >= T_ORB ? 50 : 0), bumpT = -9;
  for (const b of foes) if (t >= b.catchT + POP) { score += b.pts; bumpT = Math.max(bumpT, b.catchT + POP); }
  if (t >= T_ORB) bumpT = Math.max(bumpT, T_ORB);
  elPontos.textContent = String(score).padStart(5, '0');
  elPontos.style.transform = `scale(${1 + 0.16 * hit(t, bumpT, 0.04, 0.16)})`;
  for (const p of POPS) {
    const u = (t - p.t) / 0.95;
    if (u < 0 || u > 1 || DEBUG_TOP) { p.el.style.opacity = 0; continue; }
    _v.set(p.pos[0], p.pos[1] + u * 0.55, p.pos[2]).project(camera);
    const x = clamp((_v.x * 0.5 + 0.5) * VW, 150, VW - 150), y = clamp((-_v.y * 0.5 + 0.5) * VH, 190, VH - 90), s = easeOutBack(u / 0.2);
    p.el.style.opacity = 1 - smooth((u - 0.6) / 0.4);
    p.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(3)})`;
  }
}

// ---------------------------------------------------------------- o quadro no instante t
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const power = t => smooth((t - T_ORB) / 0.14) * (1 - smooth((t - 13.0) / 0.7)); // 0..1: o herói energizado
function frame(t, dom = true) {
  const hs = hero.state(t), pw = power(t);

  // --- Clawd: anda (as pernas alternam), inclina na corrida, deita na curva
  const ph = hs.dist * 10.5, mv = clamp(hs.v / 1.5);
  const hopU = arc(t, T_ORB + 0.04, 0.44, 1);
  let punch = 0; for (const b of FOES) punch += hit(t, b.catchT, 0.03, 0.09);
  heroG.position.set(hs.x, 0, hs.z); heroG.rotation.y = hs.h;
  heroT.position.y = (BODY_Y + Math.abs(Math.sin(ph)) * 0.014 * mv) * CLAWD + hopU * 0.36;
  heroT.rotation.set(clamp(hs.a * 0.008, -0.14, 0.14) + hs.v * 0.016, 0, clamp(-hs.w * 0.03, -0.26, 0.26) + Math.sin(ph) * 0.03 * mv);
  const sq = clamp(-hs.a * 0.005, -0.05, 0.1) - punch * 0.1;
  heroT.scale.set(CLAWD * (1 + sq * 0.35), CLAWD * (1 + sq * 0.5), CLAWD * (1 - sq));
  const blink = Math.max(win(t, 0.92, 1.0, 0.04), win(t, 6.3, 6.38, 0.04), win(t, 13.45, 13.53, 0.04));
  const alert = Math.max(win(t, 1.1, 1.95), win(t, 2.35, 2.85, 0.1), win(t, 4.35, 4.85, 0.1));
  const det = smooth((t - T_ORB - 0.05) / 0.15) * (1 - smooth((t - 13.1) / 0.5));
  heroParts.eyes.forEach((e, i) => {
    e.scale.set(1 + 0.1 * alert, (1 + 0.28 * alert) * (1 - 0.34 * det) * (1 - 0.9 * blink), 1);
    e.rotation.z = (i ? 1 : -1) * 0.3 * det;                           // energizado: olhar decidido
  });
  heroParts.legs.forEach((l, i) => { l.position.y = heroParts.legY + Math.max(0, Math.sin(ph + (i % 2 ? PI : 0))) * 0.05 * mv; });
  const armUp = 1.0 * hopU + 0.32 * pw + 0.5 * punch + 0.45 * alert;   // braços sobem no pulinho, no susto e quando energizado
  heroParts.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * armUp + Math.sin(ph) * 0.12 * mv; });
  let last = -9; for (const e of EATS) { if (e > t) break; last = e; }
  const flick = Math.exp(-(t - last) / 0.07);
  const pulse = 0.78 + 0.22 * Math.sin(t * 19);
  heroMat.emissiveIntensity = 0.5 * pw * pulse;
  heroParts.halo.visible = heroParts.halo2.visible = heroPool.visible = pw > 0.01;
  heroParts.halo.scale.setScalar(lerp(0.4, 1, pw)); heroParts.halo.rotation.set(PI / 2 + Math.sin(t * 3.1) * 0.28, 0, t * 4.2);
  heroParts.halo2.scale.setScalar(lerp(0.4, 1, pw)); heroParts.halo2.rotation.set(Math.sin(t * 2.3) * 0.5 + 0.5, t * 5.1, 0);
  haloMat.color.setRGB(3.0, 1.7, 0.5).multiplyScalar(pw * (0.7 + 0.3 * pulse));
  heroPool.position.set(hs.x, 0.012, hs.z); heroPool.scale.setScalar(lerp(1.5, 3.6, pw));
  heroPool.material.color.setRGB(0.6, 0.3, 0.08).multiplyScalar(pw * (1 + 0.25 * pulse));
  const lf = lerp(1.0, 0, pw); // energizado: a luz fica no centro dele (na frente estourava em quem ele persegue; no alto, virava reflexo solto nos chips)
  heroLight.position.set(hs.x + Math.sin(hs.h) * lf, lerp(0.75, 0.55, pw), hs.z + Math.cos(hs.h) * lf);
  heroLight.intensity = 1.0 + 0.6 * flick + 3.2 * pw * pulse;
  orbLight.position.set(WX(23), 0.9, WZ(4));
  orbLight.intensity = t < T_ORB ? 3.5 + Math.sin(t * 6) * 0.8 : 70 * hit(t, T_ORB, 0.03, 0.14);
  grade.uniforms.gain.value = 1 + 0.18 * hit(t, T_ORB, 0.03, 0.12);

  // --- pontos de luz: respiram; quando o herói chega, são sugados e somem
  const mouthY = 0.26;
  small.forEach((q, i) => {
    const u = q.te === undefined ? -1 : (t - q.te) / EAT;
    let s = 1 + 0.07 * Math.sin(t * 3.2 + q.ph), x = q.x, y = PY, z = q.z, gl = 1;
    if (u >= 1) { s = 0; gl = 0; } else if (u > 0) { const e = easeIn(u); s *= 1 - u * 0.85; gl = 1 - u; x = lerp(q.x, hs.x, e); y = lerp(PY, mouthY, e); z = lerp(q.z, hs.z, e); }
    pelletMesh.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q.identity(), _s.setScalar(s)));
    poolMesh.setMatrixAt(i, _m.compose(_p.set(q.x, 0.011, q.z), _q.identity(), _s.setScalar(gl > 0 ? 1.4 : 0)));
    poolMesh.setColorAt(i, _c.copy(POOL).multiplyScalar(gl * (0.92 + 0.08 * Math.sin(t * 3.2 + q.ph))));
  });
  pelletMesh.instanceMatrix.needsUpdate = true; poolMesh.instanceMatrix.needsUpdate = true; poolMesh.instanceColor.needsUpdate = true;
  for (const o of orbObjs) {
    const u = o.q.te === undefined ? -1 : (t - o.q.te) / 0.12, breathe = 1 + 0.1 * Math.sin(t * 4.4 + o.q.ph);
    const s = u >= 1 ? 0 : u > 0 ? 1 - u : 1;
    o.g.visible = o.pool.visible = s > 0;
    o.g.scale.setScalar(s * breathe); o.g.position.y = 0.34 + 0.03 * Math.sin(t * 2.1 + o.q.ph);
    o.ring.rotation.set(t * 1.7 + o.q.ph, t * 2.3, 0); o.ring2.rotation.set(t * 2.1, 0, t * 1.4 + o.q.ph);
    o.pool.scale.setScalar(3.0 * s * breathe);
  }

  // --- perseguidores
  for (const b of foes) {
    const caught = t >= b.catchT, st = b.actor.state(caught ? b.catchT : t), fear = smooth((t - b.scaredAt) / 0.2);
    let x = st.x, y = 0, z = st.z, sc = 1, tx = 0, ty = 0, tz = 0;
    if (caught) {
      const tau = t - b.catchT, l = foeLaunch(b, tau); x = l.x; y = l.y; z = l.z;
      tx = 0.55 * Math.sin(tau * 13); tz = 0.45 * Math.cos(tau * 11); ty = tau * 21; sc = tau < POP ? 1 + 0.12 * Math.sin(tau * 30) : Math.max(0, 1 - (tau - POP) / 0.06);
    }
    b.g.visible = sc > 0.001; if (!b.g.visible) continue;
    const shake = fear * (caught ? 0 : 1), mv = caught ? 0 : clamp(st.v / 1.2);
    b.g.position.set(x + Math.sin(t * 63 + b.idx * 2.1) * 0.011 * shake, y, z + Math.cos(t * 57 + b.idx) * 0.008 * shake);
    b.g.rotation.set(0, st.h, 0);
    b.g.scale.setScalar(sc);
    const brake = caught ? 0 : clamp(-st.a * 0.007, 0, 0.16);
    b.spin.rotation.set(tx, ty, tz); // pego: gira como pião em torno do próprio centro
    b.body.position.y = -0.4;
    b.body.rotation.set(caught ? 0 : clamp(-st.a * 0.012, -0.08, 0.28), 0, caught ? 0 : Math.sin(t * 49 + b.idx) * 0.035 * shake);
    b.body.scale.set(1 + brake * 0.3, 1 + brake * 0.4, 1 - brake);
    b.mat.color.copy(b.base).lerp(SCARED, fear * (0.3 + 0.1 * Math.sin(t * 31 + b.idx))); // empalidece, mas continua da própria cor
    // olhos: as pupilas seguem o Clawd; com medo, encolhem
    const dx = hs.x - x, dz = hs.z - z, dl = Math.hypot(dx, dz) || 1, sh = Math.sin(st.h), ch = Math.cos(st.h);
    let lx = (dx * ch - dz * sh) / dl, lz = (dx * sh + dz * ch) / dl, ly = 0.2;
    if (caught) { lx = Math.sin(tau2(t, b) * 40); ly = Math.cos(tau2(t, b) * 40); lz = 0.6; }
    lz = Math.max(lz, 0.45); const ln = Math.hypot(lx, ly, lz);
    aimEyes(b.eyes, lx / ln, ly / ln, lz / ln, fear);
    b.anim({ t, st, mv, fear, shake, caught });
  }

  // --- faíscas e ondas
  for (const b of bursts) {
    const tau = t - b.t;
    for (let k = 0; k < b.n; k++) {
      const d = b.d[k], life = d[3] * 0.62, u = tau / life;
      if (tau < 0 || u >= 1) { sparkMesh.setMatrixAt(b.i0 + k, _m.makeScale(0, 0, 0)); continue; }
      const drag = (1 - Math.exp(-2.2 * tau)) / 2.2;
      sparkMesh.setMatrixAt(b.i0 + k, _m.compose(_p.set(b.p[0] + d[0] * drag, Math.max(0.05, b.p[1] + d[1] * drag - 3.2 * tau * tau), b.p[2] + d[2] * drag), _q.identity(), _s.setScalar((1 - u * u) * (0.7 + d[3] * 0.5))));
    }
  }
  sparkMesh.instanceMatrix.needsUpdate = true;
  for (const w of waves) { const u = (t - w.t) / w.dur; w.m.visible = u > 0 && u < 1; if (w.m.visible) w.m.material.uniforms.p.value = easeOut(u); }

  // --- luz-chave: segue a ação; no fim sobe e abre para a placa inteira
  const F = follow(t, 0.3, 0.1), wide = smooth((t - 12.3) / 1.7), kx = lerp(F[0], -0.5, wide), kz = lerp(F[1], 0.4, wide), far = lerp(1, 2.5, wide);
  key.target.position.set(kx, 0, kz); key.target.updateMatrixWorld();
  const side = lerp(clamp(hermiteKeys(CAM, t, c => c.p)[0] * 1.6, -5.2, 5.2), 5.2, wide);
  key.position.set(kx + side * far, 10.2 * far, kz + 6.6 * far);
  key.angle = lerp(0.5, 0.56, wide);
  scene.fog.near = lerp(13, 36, wide); scene.fog.far = lerp(44, 120, wide);
  grade.uniforms.gain.value *= lerp(1, 1.25, wide); key.intensity = KEY_I * far * far * lerp(1, 0.82, wide);

  updateCamera(t, hs);
  if (dom) updateHud(t);
}
function tau2(t, b) { return t - b.catchT; }

// um quadro = sub amostras dentro do obturador de 180 graus, somadas em luz linear
let frameNo = 0;
function renderAt(t, sub = 1) {
  DEBUG_TOP = false; frameNo = Math.round(t * FPS);
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 0); renderer.clear();
  for (let i = 0; i < sub; i++) {
    frame(t + (sub > 1 ? ((i + 0.5) / sub - 0.5) * 0.5 / FPS : 0), false);
    bokeh.uniforms.seed.value = (frameNo * 13 + i * 7) % 289;
    composer.render();
    accMat.uniforms.tDiffuse.value = composer.readBuffer.texture; accMat.uniforms.w.value = 1 / sub;
    const ac = renderer.autoClear; renderer.autoClear = false;
    renderer.setRenderTarget(accRT); accQuad.render(renderer);
    renderer.autoClear = ac;
  }
  frame(t, true); // placar e pontos no instante central
  grain.uniforms.seed.value = frameNo % 97;
  renderer.setRenderTarget(null);
  finalComposer.render();
  return t;
}
function renderTop(t) { // vista de cima sem pós: confere a coreografia
  DEBUG_TOP = true; frame(t, true);
  const f = scene.fog; scene.fog = null;
  renderer.setRenderTarget(null); renderer.render(scene, camera);
  scene.fog = f; DEBUG_TOP = false; return t;
}

// na passada de profundidade do desfoque, o espelho não precisa refazer o reflexo
const bokehRender = bokeh.render.bind(bokeh);
bokeh.render = (...a) => { mirror.visible = false; bokehRender(...a); mirror.visible = true; };

const KEYS = [ // momentos-chave: as imagens paradas que contam o filme
  { id: '01-abertura', t: 0.5 },
  { id: '02-o-susto', t: 1.7 },
  { id: '03-a-fuga', t: 3.3 },
  { id: '04-corredor-comprido', t: 6.9 },
  { id: '05-o-nucleo', t: 7.75 },
  { id: '06-o-encontro', t: 8.5 },
  { id: '07-a-cacada', t: 9.4 },
  { id: '08-a-captura', t: 10.25 },
  { id: '09-a-placa-inteira', t: 14.6 },
];
window.KEYS = KEYS;
window.DURATION = DURATION;
window.renderAt = renderAt;
window.renderTop = renderTop;
window.info = { T_ORB, pellets: small.length, eaten: EATS.length, foes: foes.length };
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida') + ' | ' + JSON.stringify(window.info);
const qs = new URLSearchParams(location.search);
renderAt(Number(qs.get('t') ?? 8.6), Number(qs.get('sub') ?? 1));
window.ready = true;
