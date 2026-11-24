// Página de teste de UM dinossauro: quatro vistas num quadro só, para conferir forma e pose.
//   /src/dino.html?d=trex     window.renderDino(ta, tb)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const VW = 1920, VH = 1080;
const q = new URLSearchParams(location.search), name = q.get('d') || 'trex';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(VW, VH, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene(); scene.background = new THREE.Color('#d9d4cb');
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
const sun = new THREE.DirectionalLight('#fff1dc', 2.6); sun.position.set(7, 14, 9); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, new THREE.HemisphereLight('#dfe9ff', '#8a7a66', 0.9));
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#cfc9be', roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

const mod = await import(`./dinos/${name}.js`);
const dino = mod.build();
scene.add(dino.group);
const view = dino.view || { size: 3.8, center: [0, 2.3, 0] };

const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
function setCam(yawDeg, tiltDeg, size, cx = 0) {
  const y = yawDeg * Math.PI / 180, ti = tiltDeg * Math.PI / 180, c = new THREE.Vector3(view.center[0] + cx, view.center[1], view.center[2]);
  cam.position.set(c.x + 60 * Math.sin(y) * Math.cos(ti), c.y + 60 * Math.sin(ti), c.z + 60 * Math.cos(y) * Math.cos(ti));
  cam.lookAt(c); const a = (VW / 2) / (VH / 2);
  cam.left = -size * a; cam.right = size * a; cam.top = size; cam.bottom = -size; cam.updateProjectionMatrix();
}
// quatro vistas: 3/4 (como na referência) em dois instantes, perfil, e o ângulo de câmera da ilha
window.renderDino = (ta = 0.5, tb = 2.4) => {
  const W = VW / 2, H = VH / 2;
  const views = [
    [0, H, ta, () => setCam(38, 12, view.size)],
    [W, H, tb, () => setCam(38, 12, view.size)],
    [0, 0, ta, () => setCam(0, 4, view.size)],
    [W, 0, tb, () => setCam(-142, 34, view.size * 1.05)],
  ];
  renderer.setScissorTest(true);
  for (const [x, y, t, fn] of views) { dino.update(t); fn(); renderer.setViewport(x, y, W, H); renderer.setScissor(x, y, W, H); renderer.render(scene, cam); }
  renderer.setScissorTest(false);
  return name;
};
// uma vista só, em tela cheia: window.renderOne(t, yaw, tilt, zoom)
window.renderOne = (t = 0.5, yaw = 38, tilt = 12, zoom = 1, cx = 0) => { dino.update(t); setCam(yaw, tilt, view.size / zoom, cx); renderer.setViewport(0, 0, VW, VH); renderer.render(scene, cam); return name; };
window.renderDino(Number(q.get('ta') ?? 0.5), Number(q.get('tb') ?? 2.4));
window.ready = true;
