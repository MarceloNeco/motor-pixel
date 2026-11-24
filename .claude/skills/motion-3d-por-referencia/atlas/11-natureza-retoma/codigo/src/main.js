// natureza-retoma: um objeto do dia a dia flutua, gira devagar e é tomado por musgo e flores.
// Tudo procedural (sem modelo 3D, sem imagem) e tudo função do tempo: renderAt(t) recalcula o quadro inteiro.
//   ?obj=controle   qual objeto        ?alpha   sem fundo (para exportar com canal alfa)
//   ?t=3.2          um instante        ?key=4   um card       ?ss=2   superamostragem
import * as THREE from 'three';
import { vegetar, uTime } from './vegetacao.js';
import { criarControle } from './objetos/controle.js';

const VW = 1920, VH = 1080;
const q = new URLSearchParams(location.search);
const ALPHA = q.has('alpha'), SS = Number(q.get('ss') ?? 2), OBJ = q.get('obj') ?? 'controle';
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const OBJETOS = { controle: criarControle };
const O = OBJETOS[OBJ]();

// ---------------------------------------------------------------- palco 2D: fundo em degradê e grão
if (ALPHA) { document.body.classList.add('alpha'); document.documentElement.classList.add('alpha'); }
document.getElementById('fundo').style.background = O.fundo;
{ // grão fixo (semente fixa): evita faixas no degradê escuro depois da compressão
  const c = document.getElementById('grao'), x = c.getContext('2d'), im = x.createImageData(c.width, c.height), r = mulberry32(99);
  for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() - 0.5) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  x.putImageData(im, 0, 0);
}

// ---------------------------------------------------------------- render
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(SS);
renderer.setSize(VW, VH);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = Number(q.get('exp') ?? 1.0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('palco').appendChild(renderer.domElement); // por cima do fundo e do grão: o objeto fica limpo

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(24, VW / VH, 0.1, 100);
camera.position.set(0, 0, 9.6);
camera.lookAt(0, 0, 0);
if (q.has('vo')) { const [x, y, w, h] = q.get('vo').split(',').map(Number); camera.setViewOffset(VW, VH, x, y, w, h); } // recorte ampliado, para olhar de perto

// ---------------------------------------------------------------- luz: estúdio escuro com uma caixa de luz grande à esquerda
{
  const amb = new THREE.Scene();
  amb.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.03, 0.022, 0.018), side: THREE.BackSide })));
  const painel = (w, h, pos, cor) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...cor), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); amb.add(m);
  };
  painel(11, 8, [-9, 7, 8], [5.5, 5.2, 4.9]);      // caixa de luz principal, alta e à esquerda
  painel(1.6, 12, [-12, 0, 2], [3.0, 2.8, 2.6]);    // faixa vertical à esquerda: o risco de luz no plástico
  painel(10, 3.5, [-3, -8, 7], [1.0, 0.68, 0.5]);   // rebatida quente de baixo (a parte clara do fundo)
  painel(2.2, 9, [9, 2, -6], [3.2, 2.7, 2.3]);      // faixa de recorte atrás, à direita
  painel(6, 4, [2, 4, 12], [0.15, 0.14, 0.13]);     // preenchimento bem fraco de frente
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(amb, 0.03).texture;
  scene.environmentIntensity = Number(q.get('env') ?? 0.5);
  pm.dispose();
}
const chave = new THREE.DirectionalLight(0xfff0de, Number(q.get('key_i') ?? 3.8));
chave.position.set(-5.4, 4.8, 5.4);
chave.castShadow = true;
chave.shadow.mapSize.set(4096, 4096);
Object.assign(chave.shadow.camera, { left: -2.7, right: 2.7, top: 2.7, bottom: -2.7, near: 2, far: 18 });
chave.shadow.bias = -0.0005; chave.shadow.normalBias = 0.012; chave.shadow.radius = 4; chave.shadow.intensity = 0.82;
scene.add(chave, chave.target);
const recorte = new THREE.DirectionalLight(0xffd2b0, 1.6);
recorte.position.set(5, 2.5, -5.5);
scene.add(recorte);

// ---------------------------------------------------------------- objeto + natureza
const giro = new THREE.Group();
scene.add(giro);
giro.add(O.grupo);
// respiro no começo (o objeto aparece limpo) e o ritmo geral do crescimento
const ATRASO = 0.3, RITMO = 0.95;
O.sementes.forEach(s => { s.t0 = s.t0 + ATRASO; s.dur = s.dur * RITMO; });
const V = vegetar({ hospedeiro: O.hospedeiro, sementes: O.sementes, exclusoes: O.exclusoes, paleta: O.paleta, rng: mulberry32(O.semente ?? 7), dens: O.dens, tam: O.tam ?? 1 });
giro.add(V.grupo);
giro.scale.setScalar(O.escala ?? 1);

// ---------------------------------------------------------------- tempo
const DURATION = 8;
const KEYS = [
  { id: '01-objeto-limpo', t: 0.2 },
  { id: '02-primeiros-brotos', t: 1.5 },
  { id: '03-a-frente-avanca', t: 2.8 },
  { id: '04-flores-abrindo', t: 4.2 },
  { id: '05-tomado', t: 5.8 },
  { id: '06-final', t: 7.7 },
];
const qPose = new THREE.Quaternion(), qGiro = new THREE.Quaternion(), EIXO = new THREE.Vector3(0.1, 1, 0).normalize();
function frame(t) {
  uTime.value = t;
  // giro contínuo e lento em torno de um eixo quase vertical; o objeto boia um pouco
  const ang = (O.pose.y0 ?? -0.6) + 0.13 * t;
  qPose.setFromEuler(new THREE.Euler(O.pose.x + 0.05 * Math.sin(t * 0.8 + 1), 0, O.pose.z + 0.04 * Math.sin(t * 0.6)));
  qGiro.setFromAxisAngle(EIXO, ang);
  giro.quaternion.copy(qGiro).multiply(qPose);
  giro.position.set(0, 0.06 * Math.sin(t * 1.1) + (O.pose.dy ?? 0), 0);
}
const render = () => renderer.render(scene, camera);

window.KEYS = KEYS;
window.DURATION = DURATION;
window.renderKey = i => { frame(KEYS[i].t); render(); return KEYS[i].id; };
window.renderAt = t => { frame(t); render(); return t; };
window.info = { ...V.contagem, fim: +V.fim.toFixed(2), objeto: O.id };
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida';
if (q.has('t')) window.renderAt(Number(q.get('t'))); else window.renderKey(Number(q.get('key') ?? 5));
window.ready = true;
