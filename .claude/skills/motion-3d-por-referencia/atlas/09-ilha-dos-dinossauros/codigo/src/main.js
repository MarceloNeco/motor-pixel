// ilha-dos-dinossauros: uma ilha-maquete com seis setores e um dinossauro de olho de adesivo em cada um.
// Tudo procedural (geometria e texturas geradas em código), sem modelos nem imagens.
// Cada quadro é função do tempo: renderAt(t) refaz a cena inteira para o instante t, e o filme emenda em laço.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js';
import { DEG, LOOP } from './lib.js';
import { buildIsland, SPOTS, groundH } from './ilha.js';

const VW = 1920, VH = 1080;

// ---------------------------------------------------------------- renderer e luz
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(VW, VH, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene(); scene.background = new THREE.Color('#1f6fa9');
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.38;
const camera = new THREE.OrthographicCamera(-8, 8, 4.5, -4.5, 0.1, 400);

// sol de lado (direita e alto): sombra visível, volume nas formas
const SUN_DIR = new THREE.Vector3(0.62, 0.9, 0.42).normalize();
const sun = new THREE.DirectionalLight('#fff0d8', 3.1); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 4; sun.shadow.blurSamples = 16;
scene.add(sun, sun.target, new THREE.HemisphereLight('#e8f2ff', '#9c8f73', 0.85));
function aimSun(target, half) {
  sun.target.position.copy(target); sun.position.copy(target).addScaledVector(SUN_DIR, 90);
  Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 200 }); sun.shadow.camera.updateProjectionMatrix();
}

// ---------------------------------------------------------------- ilha e dinossauros
const island = buildIsland(); scene.add(island.group);
// defasagem de cada bicho dentro do laço de 4 s, para a ação de cada um cair dentro do seu plano
const PHASE = { trex: 0, estegossauro: 0, alossauro: 0, paquicefalossauro: 0, triceratopo: 1.4, parassaurolofo: 3.5 };
const dinos = [];
for (const s of SPOTS) {
  try {
    const mod = await import(`./dinos/${s.id}.js`), d = mod.build();
    d.group.scale.setScalar(s.scale); d.group.position.set(s.x, groundH(s.x, s.z) + 0.02, s.z); d.group.rotation.y = s.rot * DEG;
    scene.add(d.group); dinos.push({ ...d, spot: s });
  } catch (e) { console.warn('dinossauro ausente:', s.id, e.message); }
}

// ---------------------------------------------------------------- pós-processamento (oclusão + desfoque de maquete)
const rt = new THREE.WebGLRenderTarget(VW, VH, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1); composer.setSize(VW, VH);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, VW, VH);
gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.2, thickness: 1.4, scale: 1.3, samples: 16 });
gtao.blendIntensity = 0.9;
composer.addPass(gtao);
const hTilt = new ShaderPass(HorizontalTiltShiftShader), vTilt = new ShaderPass(VerticalTiltShiftShader);
composer.addPass(hTilt); composer.addPass(vTilt);
composer.addPass(new OutputPass());
function setTilt(amount, r = 0.5) { hTilt.uniforms.h.value = amount / VW; vTilt.uniforms.v.value = amount / VH; hTilt.uniforms.r.value = r; vTilt.uniforms.r.value = r; }

// ---------------------------------------------------------------- câmera: parada em cada plano, toda troca é corte seco
function setCam(c) {
  const az = (c.az ?? 0) * DEG, el = (c.el ?? 40) * DEG, dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const t = new THREE.Vector3(...c.t);
  camera.position.copy(t).addScaledVector(dir, 120); camera.lookAt(t);
  const hh = c.size / 2, hw = hh * VW / VH;
  camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh; camera.updateProjectionMatrix();
  setTilt(c.tilt ?? 1.2, c.focus ?? 0.5);
  aimSun(t, c.shadow ?? Math.max(14, c.size * 1.25));
}
const spot = id => SPOTS.find(s => s.id === id);
// plano fechado de um setor: mira no bicho, mais baixo e de três quartos (como os clipes da referência)
const close = (id, o = {}) => { const s = spot(id); return { t: [s.x + (o.dx || 0), groundH(s.x, s.z) + (o.dy ?? 2.1), s.z + (o.dz || 0)], size: o.size ?? 8.6, el: o.el ?? 22, az: o.az ?? 0, tilt: o.tilt ?? 0.9, shadow: 16, hide: ['fumaca', ...(o.hide || [])], hideDinos: o.hideDinos || [] }; };
// hide: setores (cenário e bicho) que ficariam entre a câmera e o personagem do plano e por isso saem de quadro;
// hideDinos: vizinhos que apareceriam cortados na borda do quadro (some só o bicho, o cenário fica)
const CAMS = {
  wide: { t: [0, 0.6, 1.0], size: 31.4, el: 40, tilt: 1.5, shadow: 34 },
  trex: close('trex', { az: -16, dy: 2.5, size: 9.4, hideDinos: ['parassaurolofo', 'estegossauro'] }),
  estegossauro: close('estegossauro', { az: 22, hide: ['trex'], hideDinos: ['alossauro'] }),
  alossauro: close('alossauro', { az: 18, dy: 2.5, hide: ['estegossauro', 'trex'] }),
  paquicefalossauro: close('paquicefalossauro', { az: 16, dy: 2.5, hide: ['vulcao', 'trex', 'estegossauro', 'parassaurolofo'], hideDinos: ['triceratopo'] }),
  triceratopo: close('triceratopo', { az: -18, hide: ['parassaurolofo', 'trex'] }),
  parassaurolofo: close('parassaurolofo', { az: -22, dy: 2.3, hide: ['trex'], hideDinos: ['triceratopo'] }),
};
// roteiro: a ilha inteira, uma visita a cada setor, e a ilha de novo (24 s = 6 laços, emenda no fim)
const SHOTS = [
  { t0: 0, cam: 'wide' },
  { t0: 4, cam: 'trex' },
  { t0: 8, cam: 'estegossauro' },
  { t0: 10.5, cam: 'alossauro' },
  { t0: 13, cam: 'paquicefalossauro' },
  { t0: 15.5, cam: 'triceratopo' },
  { t0: 18, cam: 'parassaurolofo' },
  { t0: 20.5, cam: 'wide' },
];
const DURATION = 24;

function setScene(t, camName) {
  for (const d of dinos) d.update(t + (PHASE[d.name] || 0));
  island.update(t);
  show(CAMS[camName]);
  setCam(CAMS[camName]);
}
function show(c) { const h = c.hide || [], hd = c.hideDinos || []; island.hide(h); for (const d of dinos) d.group.visible = !h.includes(d.name) && !hd.includes(d.name); }
function frame(t) { let shot = SHOTS[0]; for (const q of SHOTS) if (t >= q.t0 - 1e-6) shot = q; setScene(t, shot.cam); }
function render() { scene.updateMatrixWorld(true); composer.render(); }

// momentos-chave para os cards: a ilha e um quadro de cada setor
const KEYS = [
  { id: '00-ilha', t: 2.4, cam: 'wide' },
  { id: '01-trex', t: 6.4, cam: 'trex' },
  { id: '02-estegossauro', t: 9.2, cam: 'estegossauro' },
  { id: '03-alossauro', t: 11.7, cam: 'alossauro' },
  { id: '04-paquicefalossauro', t: 14.33, cam: 'paquicefalossauro' },
  { id: '05-triceratopo', t: 17.1, cam: 'triceratopo' },
  { id: '06-parassaurolofo', t: 19.2, cam: 'parassaurolofo' },
];

window.KEYS = KEYS;
window.DURATION = DURATION;
window.SHOTS = SHOTS.map(s => s.t0);
window.renderKey = i => { setScene(KEYS[i].t, KEYS[i].cam); render(); return KEYS[i].id; };
window.renderAt = t => { frame(t); render(); return t; };
// plano livre para conferência: window.renderCam(t, { t: [x, y, z], size, el, az })
window.renderCam = (t, cam) => { for (const d of dinos) d.update(t + (PHASE[d.name] || 0)); island.update(t); const c = typeof cam === 'string' ? CAMS[cam] : cam; show(c); setCam(c); render(); return t; };
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida';
const q = new URLSearchParams(location.search);
if (q.has('t')) window.renderAt(Number(q.get('t'))); else window.renderKey(Number(q.get('key') ?? 0));
window.ready = true;
