// Restaurante em miniatura — cena, luz, câmera travada e o render quadro a quadro.
// Tudo é função do tempo: renderAt(t) recalcula a cena inteira; nenhum estado acumulado.
import * as THREE from 'three';
import { createPost, createMirror } from './post.js';
import { buildCity } from './city.js';
import { rng } from './util.js';

const params = new URLSearchParams(location.search);
const W = Number(params.get('w') || 1920), H = Math.round(W * 9 / 16);
const Q = params.get('q') || 'final';
const SUB = Q === 'rascunho' ? 4 : Q === 'medio' ? 10 : 18;   // subquadros por quadro
const FPS = 24, SHUTTER = 1.0;                                 // obturador de 360°
window.DURATION = 8.0;

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.autoClear = false;
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);
{
  const gl = renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info');
  window.gpuInfo = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'gpu?';
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0a09);
// névoa escura: o fundo some no breu e só as luzes (que ignoram a névoa) ficam, virando bokeh
scene.fog = new THREE.Fog(0x0d0b0a, 120, 330);

// ---------- câmera travada ----------
const camera = new THREE.PerspectiveCamera(22, W / H, 10, 1200);
camera.layers.enable(1);
export const CAM = { az: 44, pitch: 24, dist: 95, target: new THREE.Vector3(0.3, 3.0, -0.5), fov: 22 };
if (params.get('cam')) { const v = params.get('cam').split(',').map(Number); Object.assign(CAM, { az: v[0], pitch: v[1], dist: v[2], fov: v[6] }); CAM.target.set(v[3], v[4], v[5]); }
function placeCamera() {
  const a = THREE.MathUtils.degToRad(CAM.az), p = THREE.MathUtils.degToRad(CAM.pitch);
  camera.fov = CAM.fov;
  camera.position.set(CAM.target.x + Math.sin(a) * Math.cos(p) * CAM.dist, CAM.target.y + Math.sin(p) * CAM.dist, CAM.target.z + Math.cos(a) * Math.cos(p) * CAM.dist);
  camera.lookAt(CAM.target); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
placeCamera();

// ---------- luz ----------
// Luz de foto de maquete: um foco quente sobre a esquina, com borda bem suave (o resto cai no escuro
// e fica por conta das luzes locais: postes, vitrines, faróis), mais um preenchimento frio bem baixo.
const hemi = new THREE.HemisphereLight(0x4a5c8c, 0x241e1a, 0.55); scene.add(hemi);
const key = new THREE.SpotLight(0xffd2a2, 2.05, 0, THREE.MathUtils.degToRad(22), 0.92, 0);
key.position.set(-38, 96, 54); key.target.position.set(3, 0, 1); scene.add(key, key.target);
key.castShadow = true; key.shadow.mapSize.set(4096, 4096);
key.shadow.camera.near = 30; key.shadow.camera.far = 240;
key.shadow.bias = -0.0002; key.shadow.normalBias = 0.05; key.shadow.radius = 3;
key.shadow.camera.layers.enableAll();
// luz do herói: um foco estreito e quente só no hambúrguer (acende quando ele chega)
const hero = new THREE.SpotLight(0xffc98a, 0, 0, THREE.MathUtils.degToRad(8.5), 0.85, 0);
hero.position.set(-20, 78, 62); hero.target.position.set(0.3, 11, -0.5); scene.add(hero, hero.target);
const rim = new THREE.DirectionalLight(0x7d9ad6, 0.22); rim.position.set(40, 30, -50); scene.add(rim);

// ---------- ambiente (reflexos): céu noturno quente com manchas de luz ----------
function buildEnv() {
  const es = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; void main(){ float y = normalize(vP).y;
      vec3 top = vec3(0.03,0.035,0.05), hor = vec3(0.32,0.2,0.1), bot = vec3(0.06,0.04,0.03);
      vec3 c = y > 0.0 ? mix(hor, top, pow(y, 0.6)) : mix(hor, bot, pow(-y, 0.5));
      gl_FragColor = vec4(c, 1.0); }`,
  }));
  es.add(sky);
  const r = rng(77);
  // janelas e postes distantes
  for (let i = 0; i < 60; i++) {
    const a = r() * Math.PI * 2, el = r.range(-0.05, 0.35);
    const m = new THREE.Mesh(new THREE.SphereGeometry(r.range(0.6, 1.6), 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.65 + r() * 0.2, 0.35).multiplyScalar(r.range(2, 7)) }));
    m.position.set(Math.cos(a) * 40 * Math.cos(el), Math.sin(el) * 40, Math.sin(a) * 40 * Math.cos(el)); es.add(m);
  }
  // caixa de luz difusa no alto: dá o brilho largo no topo do pão
  const box = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.6).multiplyScalar(1.6), side: THREE.DoubleSide }));
  box.position.set(-10, 38, 14); box.lookAt(0, 0, 0); es.add(box);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(es, 0.02).texture; pm.dispose();
  return tex;
}
scene.environment = buildEnv();
scene.environmentIntensity = 0.75;

// ---------- pós ----------
const post = createPost(renderer, W, H);
post.finalMat.uniforms.bloom.value = 0.09;
const mirror = createMirror(renderer, W >> 1, H >> 1);
Object.assign(post.dofMat.uniforms.focus, { value: params.get('cam') ? CAM.dist : 92 });
post.dofMat.uniforms.cocScale.value = 52 * W / 1920;
post.dofMat.uniforms.maxBlur.value = 26 * W / 1920;
post.dofMat.uniforms.nearBoost.value = 0.32;
post.dofMat.uniforms.radScale.value = Q === 'rascunho' ? 2.2 : 1.7;

// ---------- mundo ----------
const ctx = { scene, mirror, camera, renderer, W, H, updaters: [], hero };
const city = buildCity(ctx);
ctx.city = city;

// módulos que dependem de fontes / geometria pesada entram aqui
const modules = await Promise.allSettled([
  import('./restaurant.js').then(m => m.buildRestaurant(ctx)),
  import('./vehicles.js').then(m => m.buildTraffic(ctx)),
  import('./people.js').then(m => m.buildPeople(ctx)),
  import('./hand.js').then(m => m.buildHands(ctx)),
]);
for (const m of modules) if (m.status === 'rejected') console.error('[cena] módulo falhou:', m.reason?.stack || m.reason);

// ---------- tempo ----------
function setTime(t) {
  for (const u of ctx.updaters) u(t);
}
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
let frameNo = 0;
window.renderAt = (t) => {
  post.beginFrame();
  for (let i = 0; i < SUB; i++) {
    const ts = t + ((i + 0.5) / SUB - 0.5) * SHUTTER / FPS;
    setTime(Math.max(0, ts));
    // antisserrilhado: deslocamento subpixel diferente em cada subquadro
    const jx = halton(i + 1, 2) - 0.5, jy = halton(i + 1, 3) - 0.5;
    camera.setViewOffset(W, H, jx, jy, W, H);
    camera.updateMatrixWorld();
    mirror.render(scene, camera);
    post.addSubframe(scene, camera, 1 / SUB, i * 2.39996 + t * 13.7);
  }
  camera.clearViewOffset();
  // cintilação de exposição do time-lapse (±3%, um valor por quadro)
  { const f = Math.round(t * FPS); const x = Math.sin(f * 12.9898) * 43758.5453; post.finalMat.uniforms.exposure.value = 0.86 * (1 + 0.03 * ((x - Math.floor(x)) - 0.5)); }
  post.finish(Math.round(t * FPS) + 1);
  frameNo++;
};
window.grab = (q) => renderer.domElement.toDataURL('image/jpeg', q).split(',')[1];
window.KEYS = [
  { id: '01-terreno-vazio', t: 0.29 },
  { id: '02-mao-crava-bandeira', t: 0.92 },
  { id: '03-anel-e-trelica', t: 1.25 },
  { id: '04-mao-volta', t: 1.83 },
  { id: '05-hamburguer-chega', t: 2.04 },
  { id: '06-letreiro-acende', t: 2.46 },
  { id: '07-patio-abre', t: 4.50 },
  { id: '08-plano-final', t: 7.50 },
];
window.debug = { scene, camera, CAM, placeCamera, ctx, post, key };
window.ready = true;
