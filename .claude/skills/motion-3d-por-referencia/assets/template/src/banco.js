// Banco de peças: uma peça sozinha, em quatro vistas, com luz de estúdio e o mesmo pipeline do filme.
// É onde um objeto fica bom ANTES de entrar na cena: de perto, sem nada na frente, de todos os lados.
//
//   node render.mjs peca NOME [--t=0.5] [--fundo=escuro|claro] [--q=rascunho]     → out/pecas/NOME.jpg
//
// Uma peça é um arquivo src/pecas/NOME.js que exporta por padrão uma função:
//   export default function criar(opcoes) { ...; return grupo; }                  // um THREE.Object3D
//   export default function criar(opcoes) { ...; return { grupo, pose(t) {} }; }  // com movimento próprio (0..1 ou segundos)
// Convenções: a base da peça em y = 0, o centro em x = z = 0, a frente virada para +z, na escala do filme.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { criarCamera, aplicarCamera } from './lib/camera.js';
import { criarPipeline, luzDeArea, sol } from './lib/pos.js';

const qs = new URLSearchParams(location.search);
const W = Number(qs.get('w') || 1920), H = Number(qs.get('h') || 1080);
const nome = qs.get('peca'), claro = qs.get('fundo') === 'claro', T0 = Number(qs.get('t') || 0);
const w2 = Math.floor(W / 2), h2 = Math.floor(H / 2);

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(w2, h2, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
scene.environmentIntensity = claro ? 0.75 : 0.55;
scene.background = new THREE.Color(claro ? '#ece4dc' : '#17131f');

const mod = await import(`./pecas/${nome}.js`);
const feito = (mod.default || mod.criar)(Object.fromEntries(qs));
const grupo = feito.isObject3D ? feito : feito.grupo;
scene.add(grupo);
if (feito.pose) feito.pose(T0);
scene.updateMatrixWorld(true);
const caixa = new THREE.Box3().setFromObject(grupo), tam = new THREE.Vector3(), centro = new THREE.Vector3();
caixa.getSize(tam); caixa.getCenter(centro);
const raio = Math.max(tam.length() / 2, 1e-3);

const chao = new THREE.Mesh(new THREE.PlaneGeometry(raio * 40, raio * 40), new THREE.ShadowMaterial({ color: claro ? '#5a3a30' : '#000', opacity: claro ? 0.35 : 0.55 }));
chao.rotation.x = -Math.PI / 2; chao.position.y = caixa.min.y - raio * 0.002; chao.receiveShadow = true; scene.add(chao);
let moverChave;
if (qs.get('luz') === 'filme') {
  // a luz do filme, montada em volta da peça: é sob ela que a peça vai aparecer
  const { montarLuz } = await import('./luz.js');
  moverChave = montarLuz(scene, renderer, { alvo: [centro.x, centro.y, centro.z], meia: raio * 2.4 }).porSubquadro;
} else {
const posChave = [centro.x - raio * 2.2, centro.y + raio * 3.2, centro.z + raio * 2.6];
const chave = sol('#fff2e2', 3.2, posChave, { meia: raio * 2.2, perto: raio * 0.5, longe: raio * 12 });
const contra = new THREE.DirectionalLight('#cfe2ff', 1.3); contra.position.set(centro.x + raio * 2, centro.y + raio * 1.5, centro.z - raio * 3);
scene.add(chave, chave.target, contra);
moverChave = luzDeArea(chave, posChave, raio * 0.5, [centro.x, centro.y, centro.z]);
}
let refImg = null;
if (qs.get('ref')) { refImg = new Image(); refImg.src = qs.get('ref'); await refImg.decode().catch(() => { refImg = null; console.error('[cena] não abri o recorte da referência: ' + qs.get('ref')); }); }

const camera = criarCamera(w2, h2);
const VISTAS = [
  { rot: 'três quartos', az: 32, el: 14 }, { rot: 'frente', az: 0, el: 4 },
  { rot: 'costas três quartos', az: 148, el: 14 }, { rot: 'de cima', az: 20, el: 62 },
];
const pipe = criarPipeline(renderer, w2, h2, { sub: qs.get('q') === 'rascunho' ? 6 : 32, obturador: 0, tom: 'neutro', grao: 0.006 });
pipe.tela.style.display = 'none';
const tela = document.createElement('canvas'); tela.width = w2 * 2; tela.height = h2 * 2; document.body.appendChild(tela);
const ctx = tela.getContext('2d');
const fov = 24, dist = raio / Math.sin(Math.min(fov * Math.PI / 360, Math.atan(Math.tan(fov * Math.PI / 360) * w2 / h2))) * 1.12;

window.renderAt = t => {
  if (feito.pose) feito.pose(t);
  VISTAS.forEach((v, i) => {
    pipe.render(t, { estado: () => { aplicarCamera(camera, w2, h2, { az: v.az, el: v.el, dist, alvo: [centro.x, centro.y, centro.z], fov }); scene.updateMatrixWorld(true); }, scene, camera, porSubquadro: moverChave });
    const x = (i % 2) * w2, y = Math.floor(i / 2) * h2;
    ctx.drawImage(pipe.tela, x, y);
    ctx.font = `600 ${Math.round(h2 * 0.035)}px -apple-system, Helvetica, Arial, sans-serif`; ctx.fillStyle = claro ? '#222' : '#eee';
    ctx.fillText(v.rot, x + h2 * 0.03, y + h2 * 0.06);
  });
  if (refImg) {       // o recorte da referência, no canto de baixo à direita: compare sem sair da folha
    const k = Math.min(w2 * 0.42 / refImg.width, h2 * 0.5 / refImg.height), rw = refImg.width * k, rh = refImg.height * k, rx = w2 * 2 - rw - h2 * 0.03, ry = h2 * 2 - rh - h2 * 0.03;
    ctx.fillStyle = '#fff'; ctx.fillRect(rx - 4, ry - 4, rw + 8, rh + 8); ctx.drawImage(refImg, rx, ry, rw, rh);
    ctx.fillStyle = claro ? '#222' : '#eee'; ctx.fillText('referência', rx, ry - h2 * 0.02);
  }
  ctx.fillText(`${nome} · ${tam.x.toFixed(2)} × ${tam.y.toFixed(2)} × ${tam.z.toFixed(2)} (larg × alt × prof)`, h2 * 0.03, h2 * 2 - h2 * 0.03);
  return t;
};
window.grab = (q = 0.95, tipo = 'jpeg') => tela.toDataURL(tipo === 'png' ? 'image/png' : 'image/jpeg', q).split(',')[1];
window.DURATION = 1; window.KEYS = [];
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'placa desconhecida';
window.renderAt(T0);
window.ready = true;
