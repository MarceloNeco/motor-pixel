// casa-de-praia: uma casa de frente para o mar, pintada a óleo.
// Tudo é código: geometria, cor, luz, o filtro de pintura e a tela. Sem modelos e sem imagens.
// A cena inteira é função do tempo: renderAt(t) recalcula o quadro, sem estado acumulado.
import * as THREE from 'three';
import { PI, D2R, lerp, clamp, smooth, easeOutBack, track, col, mulberry32 } from './util.js';
import { criarCeu, criarMar, criarTerreno, alt } from './mundo.js';
import { criarCasa, criarPalma, criarGuardaSol, criarEspreguicadeira, criarPassaro, criarJangada, criarArbusto } from './objetos.js';
import { criarPintura } from './pintura.js';

const VW = 1920, VH = 1080, FPS = 30, DURATION = 16;

// ---------------------------------------------------------------- paleta
const C = {
  // céu
  ceuAlto: '#1c3d99', ceuMeio: '#3f73c8', ceuBaixo: '#a99fd6', horizonte: '#f7c59c', brilho: '#ffe3a6', sol: '#fff6d8', nuvemLuz: '#ffc9a8', nuvemSombra: '#8f86cf',
  // mar
  marRaso: '#56c9bb', marMedio: '#1f97a8', marFundo: '#175a9c', marLonge: '#3f6fb8', espuma: '#f6f8ee', reflexo: '#fff0bf', reflexoQuente: '#ffb65a',
  // terra
  areiaMolhada: '#b9854f', areia: '#f0c574', areiaClara: '#f9dfa0', areiaToque: '#e98f62', grama: '#7da04a', gramaEscura: '#3f7a44', colina: '#56894f', cabo: '#7f7cc0',
  // casa
  parede: '#f7efdd', paredeToque: '#b9b0e0', telhado: '#d6452c', telhadoToque: '#f39a4e', madeira: '#b06e3c', madeiraToque: '#e7a763', branco: '#fffaf0',
  veneziana: '#1f8f93', venezianaToque: '#6fd0c0', dentro: '#f59a3a', dentroToque: '#ffd27a', boiaA: '#e2392c', boiaB: '#fff8ea', prancha: '#f6c02e', pranchaToque: '#e2572e', vaso: '#c8663a',
  // plantas
  tronco: '#8a5f3d', troncoToque: '#d9a56a', folha: '#1f7a45', folhaClara: '#5faa4a', folhaToque: '#f0a92e', coco: '#5a3a22',
  // praia
  lonaToque: '#b9b0e0', guardaA: '#e2392c', guardaB: '#fff8ea', guardaC: '#f6b62e', guardaD: '#1fa39a', vela: '#fff3dc', velaToque: '#f2b98a',
  // pássaros
  passaro: '#241d4a', passaroToque: '#5a4f9a', passaroPeito: '#f4eedd', bico: '#f0a030',
  // tela e legenda
  tela: '#e9e1cb', letra: '#2a2150',
};

// ---------------------------------------------------------------- legendas (a lista completa está em copy.txt)
const LEGENDAS = [
  { t0: 0.35, t1: 3.30, texto: 'O sol nasce no mar.' },
  { t0: 3.55, t1: 6.95, texto: 'A luz atravessa as ondas.' },
  { t0: 7.20, t1: 10.15, texto: 'A praia abre os guarda-sóis.' },
  { t0: 10.40, t1: 99, texto: 'E a casa acorda de frente pro mar.' },
];
function legendaEm(t) {
  for (const L of LEGENDAS) if (t >= L.t0 && t < L.t1 + 0.2) return { texto: L.texto, escrita: clamp((t - L.t0) / 0.8), alfa: 1 - smooth(L.t1, L.t1 + 0.2, t) };
  return null;
}

// ---------------------------------------------------------------- renderer e cena
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('out'), antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(VW, VH, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(col('#b3a6dc'), 70, 560);
const camera = new THREE.PerspectiveCamera(40, VW / VH, 0.5, 9000);
camera.rotation.order = 'YXZ';

// luz: o sol aparece no horizonte à esquerda, mas a luz que modela as formas vem da esquerda e da frente
const LUZ = new THREE.Vector3(-0.727, 0.53, 0.436).normalize();
const hemi = new THREE.HemisphereLight(col('#b9c4ff'), col('#f2c48f'), 1.5); scene.add(hemi);
const sol = new THREE.DirectionalLight(col('#ffe0ae'), 3.0);
const ALVO = new THREE.Vector3(2, 0, 4);
sol.position.copy(ALVO).addScaledVector(LUZ, 130); sol.target.position.copy(ALVO); scene.add(sol, sol.target);
sol.castShadow = true; sol.shadow.mapSize.set(4096, 4096);
Object.assign(sol.shadow.camera, { left: -44, right: 44, top: 44, bottom: -44, near: 20, far: 300 }); sol.shadow.camera.updateProjectionMatrix();
sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.05; sol.shadow.radius = 4;

// ---------------------------------------------------------------- o lugar
const ceu = criarCeu(C), mar = criarMar(C), terreno = criarTerreno(C);
scene.add(ceu.mesh, mar.mesh, terreno);
const noChao = (o, x, z, afunda = 0.12) => { o.position.set(x, alt(x, z) - afunda, z); scene.add(o); return o; };

// a casa olha para o mar (para -x) e um pouco para a câmera
const FRENTE = new THREE.Vector3(-0.82, 0, 0.57).normalize();
const casa = criarCasa(C);
noChao(casa.grupo, 7.5, 0, 0.1); casa.grupo.rotation.y = Math.atan2(FRENTE.x, FRENTE.z);
casa.grupo.updateMatrixWorld(true);
const POLEIROS = casa.poleiros.map(p => p.clone().applyMatrix4(casa.grupo.matrixWorld));

// coqueiros: { x, z, altura, inclinação, para onde inclina (graus), tamanho }
const palmas = [
  [-6.9, 0.2, 9.2, 3.0, 200, 1.0],                                            // o da beira d'água
  [12.8, -5.0, 10.5, 2.4, 170, 1.0], [15.0, 2.5, 8.4, 2.0, 150, 1.0], [1.8, -7.0, 8.8, 2.6, 215, 1.0],   // em volta da casa
  [5.0, -17.0, 8.0, 2.2, 190, 1.0], [9.5, -24.0, 9.0, 2.0, 160, 1.0], [14.0, -31.0, 8.2, 2.4, 205, 1.0], [22.0, -44.0, 9.5, 2.0, 180, 1.0],
  [19.0, -10.0, 9.0, 1.8, 140, 1.0], [24.0, 4.0, 8.0, 2.0, 165, 1.0], [10.0, 16.0, 8.6, 2.2, 210, 1.0],
].map(([x, z, h, inclina, giro, escala], i) => { const p = criarPalma(C, { h, inclina, giro: giro * D2R, semente: i + 1, escala }); noChao(p.grupo, x, z, 0.2); return p; });

// arbustos na duna e em volta da casa
[[13.6, -1.2, 1.7], [2.6, -4.2, 1.4], [15.5, 6.0, 1.3], [10.5, -9.5, 2.0], [18.5, -3.5, 2.2], [21, 9, 1.8], [16, -16, 2.1], [24, -22, 2.6], [12, -13.5, 1.5], [26, -6, 2.4], [14.5, 12, 1.6]]
  .forEach(([x, z, r], i) => noChao(criarArbusto(C, r, i + 1, i % 3 === 1), x, z, r * 0.25));

// guarda-sóis fechados, com uma espreguiçadeira cada
const guardaSois = [[-4.7, 8.9, C.guardaA], [0.6, 9.0, C.guardaC], [-1.9, 12.6, C.guardaD], [4.6, 11.4, C.guardaA]].map(([x, z, corA], i) => {
  const g = criarGuardaSol(C, corA, C.guardaB); noChao(g.grupo, x, z, 0.25); g.grupo.rotation.z = 0.07; g.grupo.rotation.y = i * 0.7;
  const e = criarEspreguicadeira(C, i % 2 ? C.guardaB : '#f3e2c0'); noChao(e, x + 0.35, z + 1.25, 0.02); e.rotation.y = PI + 0.12 * (i - 1.5);
  return g;
});

// jangada
const jangada = criarJangada(C); jangada.rotation.y = PI / 2; scene.add(jangada);

// o bando
const N_AVES = 7, ESC_AVE = 1.15;
const aves = []; for (let k = 0; k < N_AVES; k++) { const a = criarPassaro(C, k + 1); a.grupo.scale.setScalar(ESC_AVE); scene.add(a.grupo); aves.push(a); }
// a rota do líder: sai de perto do sol, cruza na frente dele rente ao mar, passa sobre os guarda-sóis e chega à casa.
// Fica sempre a mais de 10 m da câmera (de perto, a ave tapa o quadro).
// Depois do mar, dá uma volta por cima da casa (por trás e pela direita) antes de descer para o telhado.
const rota = { x: track([[0, -28.7], [3.0, -27], [4.4, -24.7], [5.4, -12.7], [6.3, -6.0], [7.4, 0], [8.3, 9], [9.2, 15], [10.0, 11], [10.7, 6.0], [11.0, 5.6]]),
               y: track([[0, 16.1], [3.0, 11], [4.4, 8], [5.4, 7], [6.3, 6.2], [7.4, 9], [8.3, 10.5], [9.2, 10.5], [10.0, 8.8], [10.7, 9.6], [11.0, 9.6]]),
               z: track([[0, -103.7], [3.0, -48], [4.4, -19.3], [5.4, -12], [6.3, -5.0], [7.4, -8], [8.3, -7], [9.2, 1], [10.0, 8], [10.7, 6.0], [11.0, 3.0]]) };
// Quatro aves pousam no telhado. As outras três seguem voando para o mar e ficam no céu do quadro final.
const T_SEPARA = 10.7, N_POUSAM = 4;
const rotaCeu = { x: track([[10.7, 6.0], [11.5, 2.0], [12.5, -0.5], [13.5, -2.0], [14.8, -4.2]]),
                  y: track([[10.7, 9.6], [11.5, 11.0], [12.5, 12.8], [13.5, 14.0], [14.8, 14.6]]),
                  z: track([[10.7, 6.0], [11.5, 0.0], [12.5, -7.5], [13.5, -12.0], [14.8, -15.2]]) };
const lider = (t, v = new THREE.Vector3(), ceu = false) => { const r = ceu && t > T_SEPARA ? rotaCeu : rota; return v.set(r.x(t), r.y(t), r.z(t)); };
const rAve = mulberry32(42), DESVIO = aves.map((_, k) => ({ lado: k === 0 ? 0 : (k % 2 ? 1 : -1), fila: Math.ceil(k / 2), sobe: (rAve() - 0.5) * 0.9, atraso: rAve() * 0.25 }));

// ---------------------------------------------------------------- filtro de pintura
const pintura = criarPintura(renderer, VW, VH, C, { escala: 0.75 });

// ---------------------------------------------------------------- linha do tempo
// relógio da cena: anda junto com o filme e freia até parar em 15,2 s (o último quadro fica imóvel)
const T_FREIO = 14.4;
const relogio = t => t <= T_FREIO ? t : T_FREIO + (Math.min(t, T_FREIO + 0.8) - T_FREIO) - Math.pow(Math.min(t, T_FREIO + 0.8) - T_FREIO, 2) / 1.6;

// câmera: posição, giro para a direita (graus), inclinação (graus), campo de visão
const CAM = [
  // t      x      y     z     giro  incl  fov
  [-1.0,   3.3,  3.9,  27.4,   4.6,  3.2,  40],   // (antes do filme: para o primeiro quadro já estar andando)
  [0.0,    2.4,  3.8,  25.8,   4.0,  3.1,  40],   // 1. plano geral: mar, sol, praia, casa. A câmera avança devagar.
  [2.7,    0.1,  3.5,  20.8,   1.5,  2.6,  40],
  [4.5,  -11.0,  1.9,  13.6,  -8.0, -1.0,  42],   // 2. rente à água, no caminho de luz, seguindo em frente
  [6.2,  -12.6,  1.6,   9.4,  -6.5, -0.3,  42],
  [8.2,   -9.6,  2.6,  17.0,  50.5, -2.0,  40],   // 3. os guarda-sóis, vistos do mar, com a casa ao fundo
  [9.9,   -8.9,  2.5,  14.6,  53.0, -1.5,  40],
  [11.4,  -8.6,  3.95,  7.0,  67.5,  3.6,  40],   // 4. a casa, de frente, enquanto abre
  [13.0,  -7.2,  3.8,   6.0,  67.3,  4.2,  40],
  [14.8,   1.0,  3.9,  24.5,   3.5,  3.0,  40],   // 5. recua até o quadro inteiro: a casa aberta de frente para o mar
  [16.0,   1.0,  3.9,  24.5,   3.5,  3.0,  40],
];
const cam = [1, 2, 3, 4, 5, 6].map(i => track(CAM.map(k => [k[0], k[i]])));
let camLivre = null;   // depuração: [x, y, z, giro, incl, fov]

const elevSol = track([[0, 0.5], [3.0, 5.0], [15, 6.8]]);   // começa meio escondido no horizonte
const AZ_SOL = -12 * D2R;
const reflexo = track([[0, 0.35], [2.5, 0.9], [4.5, 1.0]]), alcance = track([[0, 150], [2.6, 60], [4.6, 0]]);
const T_GUARDA = [8.30, 8.62, 8.94, 9.26];

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), CIMA = new THREE.Vector3(0, 1, 0);
let tAtual = 0;
function frame(t) {
  tAtual = t;
  const ts = relogio(t);
  // câmera
  const k = camLivre ?? cam.map(f => f(t));
  camera.position.set(k[0], k[1], k[2]); camera.rotation.set(k[4] * D2R, -k[3] * D2R, 0); camera.fov = k[5]; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  ceu.mesh.position.copy(camera.position);
  // sol, mar e céu
  const el = elevSol(ts) * D2R;
  ceu.uniforms.uSol.value.set(Math.sin(AZ_SOL) * Math.cos(el), Math.sin(el), -Math.cos(AZ_SOL) * Math.cos(el));
  ceu.uniforms.uT.value = ts;
  mar.uniforms.uT.value = ts; mar.uniforms.uCam.value.copy(camera.position);
  mar.uniforms.uSolH.value.set(Math.sin(AZ_SOL), -Math.cos(AZ_SOL));
  mar.uniforms.uReflexo.value = reflexo(ts); mar.uniforms.uAlcance.value = alcance(ts);
  // coqueiros
  for (const p of palmas) p.atualizar(ts, 1.6);
  // guarda-sóis: abrem um por um, passando um pouco do ponto
  guardaSois.forEach((g, i) => g.abrir(easeOutBack((ts - T_GUARDA[i]) / 0.6, 1.5)));
  // casa: venezianas, porta e as janelas do lado
  casa.abrir({ janelaE: easeOutBack((ts - 11.55) / 0.6, 1.2), janelaD: easeOutBack((ts - 11.80) / 0.6, 1.2), porta: easeOutBack((ts - 12.05) / 0.7, 1.0), lado: easeOutBack((ts - 11.95) / 0.6, 1.2) });
  // jangada
  jangada.position.set(-30 + 1.2 * ts, 0.04 + 0.06 * Math.sin(ts * 1.3), -28); jangada.rotation.z = 0.035 * Math.sin(ts * 1.1); jangada.rotation.x = 0.03 * Math.sin(ts * 0.9 + 1);
  // o bando: formação em V atrás do líder; no fim cada ave vai para o seu poleiro na cumeeira
  aves.forEach((a, i) => {
    const dv = DESVIO[i], tk = ts - dv.atraso * 0.3;
    const ceu = i >= N_POUSAM;
    const p = lider(tk, _a, ceu), frente = lider(tk + 0.06, _b, ceu).sub(p).normalize();
    const dir = _c.crossVectors(frente, CIMA).normalize();
    p.addScaledVector(dir, dv.lado * dv.fila * 1.55).addScaledVector(frente, -dv.fila * 1.3); p.y += dv.sobe + 0.25 * Math.sin(ts * 1.4 + i);
    const w = ceu ? 0 : smooth(11.0 + 0.12 * i, 12.05 + 0.12 * i, ts);
    if (w > 0) { p.lerp(POLEIROS[i], w); p.y += Math.sin(PI * w) * 1.3; frente.lerp(FRENTE, w).normalize(); }
    a.grupo.position.copy(p); a.grupo.lookAt(_d.copy(p).add(frente));
    a.atualizar(ts, 1 - 0.5 * smooth(0.5, 1, w), w * w * w);
  });
}
function render() { pintura.render(scene, camera, legendaEm(tAtual)); }

// ---------------------------------------------------------------- momentos-chave (cards)
const KEYS = [
  { id: '00-o-sol-nasce', t: 2.2 },
  { id: '01-a-luz-nas-ondas', t: 5.6 },
  { id: '02-os-guarda-sois', t: 9.7 },
  { id: '03-a-casa-acorda', t: 12.9 },
  { id: '04-quadro-final', t: 15.8 },
];

const fonte = new FontFace('Kalam', 'url(./fontes/Kalam-700-latin.woff2)', { weight: '700', style: 'normal' });
await fonte.load().then(f => document.fonts.add(f));

window.KEYS = KEYS; window.DURATION = DURATION; window.SHOTS = [];
window.renderKey = i => { frame(KEYS[i].t); render(); return KEYS[i].id; };
window.renderAt = t => { frame(t); render(); return t; };
// depuração: etapa intermediária ('base' = cena sem filtro, 'tinta' = depois do Kuwahara) e câmera livre
window.verEtapa = (t, qual) => { frame(t); render(); pintura.ver(qual); };
window.camLivre = v => { camLivre = v; };
window.pintura = pintura;
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida';
const q = new URLSearchParams(location.search);
window.renderAt(Number(q.get('t') ?? 2.2));
window.ready = true;
