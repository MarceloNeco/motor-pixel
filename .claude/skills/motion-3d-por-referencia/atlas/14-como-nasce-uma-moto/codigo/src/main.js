// moto-a-lapis: uma moto se desenha a grafite num caderno, peça por peça, e cada etapa ganha uma nota numerada.
// Tudo é código: as formas são primitivas do three.js, a hachura e o papel são gerados aqui, a letra é de traço único.
import * as THREE from 'three';
import { criarLapis } from './lapis.js';
import { construirMoto } from './moto.js';

const W = 1920, H = 1080, RAD = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const suave = x => x * x * (3 - 2 * x);
const q = new URLSearchParams(location.search);

// ---------------------------------------------------------------- conteúdo (troque aqui para outro tema)
const TITULO = 'COMO NASCE UMA MOTO';
const SUBLINHA = 'COMO NASCE';         // até onde vai o sublinhado vermelho
const ETAPAS = [                       // uma etapa = uma parte do desenho mais a sua nota. `em` = quando o lápis começa nela
  { nome: 'RODAS', em: -1.6 },         // já está desenhada no primeiro quadro: o filme abre com a nota 1 recebendo a linha-guia
  { nome: 'QUADRO', em: 1.3 },
  { nome: 'MOTOR', em: 3.2 },
  { nome: 'TANQUE', em: 5.1 },
];
const COTA = '1400 MM';                // o entre-eixos, do jeito que um desenho técnico escreve
const DURATION = 8;
const CORES = { papel: '#f2ede2', grafite: '#34353b', acento: '#cf3f25' };

const E = { rodas: ETAPAS[0].em, quadro: ETAPAS[1].em, motor: ETAPAS[2].em, tanque: ETAPAS[3].em, farol: ETAPAS[3].em + 1.85 };
const NOTA_EM = [-0.72, E.quadro + 0.8, E.motor + 0.75, E.tanque + 1.0];   // quando cada nota é escrita
const T_COTA = 0.5, POR_LETRA = 0.065;
const NOTA = { x: 1352, y: [868, 686, 503, 320], raio: 41, alt: 50 };
const TIT = { x: 88, y: 128, alt: 50 };

// ---------------------------------------------------------------- cena
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap; renderer.toneMapping = THREE.NoToneMapping;

const K = criarLapis({ renderer, W, H, SS: 2, ...CORES });
const cena = new THREE.Scene();
// um sol só, alto, vindo do lado da câmera. A luz nunca aparece como luz: ela só decide quanta hachura cada face recebe.
// Com ele aqui, o lado da moto fica quase papel, a frente fica em sombra e a sombra no chão cai para trás, longe das notas.
const sol = new THREE.DirectionalLight(0xffffff, Math.PI);
sol.position.set(0.1, 0.85, 0.5).normalize().multiplyScalar(9).add(new THREE.Vector3(0, 0.5, 0)); sol.target.position.set(0, 0.5, 0);
sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.006; sol.shadow.radius = 14; sol.shadow.blurSamples = 24;
Object.assign(sol.shadow.camera, { left: -1.9, right: 1.9, top: 1.5, bottom: -1.5, near: 2, far: 18 });
cena.add(sol, sol.target, new THREE.AmbientLight(0xffffff, Math.PI * 0.13));
cena.add(K.chao(16));

const tr = K.Tracos(), guia = K.Tracos({ atravessa: true });
const moto = construirMoto(K, cena, tr, guia, E);

// a cota do entre-eixos: a linha fica no chão, do lado da câmera, e o número fica em pé, de frente para quem olha
{
  const z = 0.47, x0 = moto.eT[0], x1 = moto.eD[0], L = { larg: 1.6, forca: 0.72, treme: 0.8, fino: 0.4 };
  for (const [x, dt] of [[x0, 0], [x1, 0.08]]) tr.linha([[x, 0.002, 0.10], [x, 0.002, z + 0.06]], { ...L, forca: 0.5, em: T_COTA + dt, dur: 0.22 });
  tr.linha([[x0, 0.002, z], [x1, 0.002, z]], { ...L, em: T_COTA + 0.18, dur: 0.34, passa: 0.06 });
  for (const [x, dt] of [[x0, 0.24], [x1, 0.5]]) tr.linha([[x - 0.04, 0.002, z + 0.045], [x + 0.04, 0.002, z - 0.045]], { larg: 2.6, forca: 0.95, cor: 1, treme: 0.3, em: T_COTA + dt, dur: 0.07 });
  const alt = 0.088, larg = tr.largura(COTA) * alt;
  tr.texto(COTA, [(x0 + x1) / 2 - larg / 2, 0.03, z + 0.02], alt, { eixoX: [1, 0, 0], eixoY: [0, 1, 0], em: T_COTA + 0.4, porLetra: 0.05, larg: 2.6, forca: 0.9, seed: 8 });
}

// ---------------------------------------------------------------- a camada plana: título, notas e linhas-guia
const cenaPlana = new THREE.Scene(), camPlana = new THREE.OrthographicCamera(0, W, 0, H, -1, 1);
const letras = K.Tracos({ plano: true }), guias = K.Tracos({ plano: true });
const PAUTA = { larg: 1.0, forca: 0.17, treme: 0.5, em: -5, dur: 0.3, fino: 0.8 };   // o par de linhas fracas que guia a altura da letra
{
  const { x: x0, y: y0, alt } = TIT;
  const larg = letras.texto(TITULO, [x0, y0], alt, { em: -4, larg: 4.0, forca: 0.95, seed: 2, esp: 0.27 }) * alt;
  for (const y of [y0 + 1, y0 - alt - 1]) letras.linha([[x0 - 34, y], [x0 + larg + 70, y]], { ...PAUTA, seed: y });
  const ls = letras.largura(SUBLINHA, 0.27) * alt, s = [];
  for (let i = 0; i <= 44; i++) { const u = i / 44; s.push([x0 - 8 + u * (ls + 16), y0 + 27 + Math.sin(u * 13) * 2.6 - u * 2]); }
  letras.linha(s, { larg: 3.8, forca: 0.92, cor: 1, treme: 1.0, em: -4, dur: 0.3, fino: 0.7 });
  guia.evita = [[x0 - 20, y0 - alt - 22, x0 + larg + 24, y0 + 44], [NOTA.x - 64, NOTA.y[3] - 62, W + 40, NOTA.y[0] + 62]];   // as linhas de construção desviam do título e da coluna de notas
  ETAPAS.forEach((e, i) => {
    const cy = NOTA.y[i], t = NOTA_EM[i], c = [];
    for (const y of [cy + NOTA.alt / 2 + 1, cy - NOTA.alt / 2 - 1]) letras.linha([[NOTA.x + NOTA.raio + 12, y], [NOTA.x + NOTA.raio + 455, y]], { ...PAUTA, seed: y });
    for (let k = 0; k <= 44; k++) { const a = (-128 - k / 44 * 388) * RAD, r = NOTA.raio * (1 + 0.035 * Math.sin(k * 0.5 + i * 2)); c.push([NOTA.x + r * Math.cos(a), cy - r * Math.sin(a)]); }
    letras.linha(c, { larg: 3.0, forca: 0.92, cor: 1, treme: 0.6, em: t, dur: 0.24, fino: 0.4, seed: i * 7 + 1 });
    const n = String(i + 1), ln = letras.largura(n) * 34;
    letras.texto(n, [NOTA.x - ln / 2 - 1, cy + 17], 34, { em: t + 0.2, porLetra: 0.12, larg: 3.2, forca: 0.95, cor: 1, seed: i + 20 });
    letras.texto(e.nome, [NOTA.x + NOTA.raio + 30, cy + NOTA.alt / 2], NOTA.alt, { em: t + 0.34, porLetra: POR_LETRA, larg: 4.0, forca: 0.95, seed: i * 5 + 4, esp: 0.27 });
  });
}
cena.add(tr.montar(), guia.montar());
cenaPlana.add(letras.montar(), guias.linha([[0, 0], [1, 1]], { em: 99 }).montar());

// ---------------------------------------------------------------- câmera: um arco lento e contínuo, em lente longa
const cam = new THREE.PerspectiveCamera(17, W / H, 1, 60), ALVO = new THREE.Vector3(0, 0.44, 0);
const CAM = { az: [13, 42], el: [15, 22], dist: [6.35, 6.5], desloca: [335, -48], fim: 7.7 };
function posicionaCamera(t) {
  const u = suave(clamp(t / CAM.fim)), az = lerp(...CAM.az, u) * RAD, el = lerp(...CAM.el, u) * RAD, dist = lerp(...CAM.dist, u);
  cam.position.set(ALVO.x + dist * Math.sin(az) * Math.cos(el), ALVO.y + dist * Math.sin(el), ALVO.z + dist * Math.cos(az) * Math.cos(el));
  cam.lookAt(ALVO); cam.setViewOffset(W, H, CAM.desloca[0], CAM.desloca[1], W, H); cam.updateMatrixWorld(true);
}
const _v = new THREE.Vector3();
function naTela(p) { _v.copy(p).project(cam); return [(_v.x * 0.5 + 0.5) * W, (1 - (_v.y * 0.5 + 0.5)) * H]; }

function frame(t) {
  posicionaCamera(t);
  // enquanto a câmera está quase parada (começo e fim), o contorno ferve de leve; em movimento, não
  { const u = clamp(t / CAM.fim), mov = 6 * u * (1 - u); K.ferve(Math.floor(t * 8 + 1e-6), 0.75 * clamp(1 - mov / 0.45)); }
  // as linhas-guia saem da nota e acompanham a peça enquanto a vista gira; cada uma termina numa bolinha
  guias.limpar();
  ETAPAS.forEach((e, i) => {
    const a = [NOTA.x - NOTA.raio - 13, NOTA.y[i] + 2], b = naTela(moto.ancoras[i]), t0 = NOTA_EM[i] + 0.34 + e.nome.length * POR_LETRA + 0.02;
    guias.linha([a, b], { larg: 2.0, forca: 0.8, treme: 0.8, em: t0, dur: 0.25, fino: 0.25, seed: i + 3 });
    const p = []; for (let k = 0; k <= 10; k++) { const an = k / 10 * Math.PI * 2.2; p.push([b[0] + 2.4 * Math.cos(an), b[1] + 2.4 * Math.sin(an)]); }
    guias.linha(p, { larg: 4.6, forca: 0.96, treme: 0, em: t0 + 0.24, dur: 0.05, fino: 0, seed: i });
  });
  guias.montar();
}

// ---------------------------------------------------------------- momentos-chave (cards)
const KEYS = [
  { id: '01-rodas', t: 0.42 },
  { id: '02-cota', t: 1.27 },
  { id: '03-quadro-subindo', t: 2.02 },
  { id: '04-quadro-pronto', t: 3.15 },
  { id: '05-motor-aletas', t: 3.96 },
  { id: '06-motor-pronto', t: 5.07 },
  { id: '07-tanque-aguada', t: 6.22 },
  { id: '08-final', t: 7.8 },
];
window.KEYS = KEYS; window.DURATION = DURATION;
window.renderAt = t => { frame(t); K.render(cena, cam, cenaPlana, camPlana, t); return t; };
window.renderKey = i => { window.renderAt(KEYS[i].t); return KEYS[i].id; };
window.K = K; window.CAM = CAM;
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida';
if (q.get('debug')) K.matPapel.uniforms.uDebug.value = Number(q.get('debug'));
window.renderAt(Number(q.get('t') ?? 7.8));
window.ready = true;
