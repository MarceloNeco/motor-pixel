// Esqueleto de um motion 3D em three.js. A cena de exemplo (três peças que brotam e um plano fechado) existe só
// para provar que o pipeline roda: troque tudo que está marcado com TROCAR e apague o que não usar.
//
// A regra que sustenta o resto: renderAt(t) recalcula a cena INTEIRA para o instante t. Nada de relógio, nada de
// "+=" entre quadros, nada de sorteio sem semente. Assim qualquer quadro sai sozinho, fora de ordem, sempre igual,
// e dá para refazer um trecho, conferir um card ou comparar com a referência instante a instante.
import * as THREE from 'three';
import { cl, mix, ss, seg, outBack, outCubic, inOut, baque, planoEm } from './lib/tempo.js';
import { criarCamera, aplicarCamera, entreCameras, cameraDeTexto, naTela, enquadrar } from './lib/camera.js';
import { rb, cyl, sph, M, granulado, canvasTex } from './lib/formas.js';
import { criarPipeline } from './lib/pos.js';
import { carregarFontes, criarTexto, zonaSegura } from './lib/texto.js';
import { carregarPeca, pecasQueFaltam } from './lib/pecas.js';
import { DS } from './ds.js';
import { montarLuz } from './luz.js';

// ---------------------------------------------------------------- 1 · formato e qualidade (o render.mjs manda pela URL)
const qs = new URLSearchParams(location.search);
const W = Number(qs.get('w') || 1920), H = Number(qs.get('h') || 1080), FPS = Number(qs.get('fps') || 30);
const RASCUNHO = qs.get('q') === 'rascunho', ALFA = qs.has('alfa');
const S = Math.min(W / 1920, H / 1080) * (W < H ? 1.6 : 1);   // escala de tudo que é medido em px (texto, traço)

// ---------------------------------------------------------------- 2 · sistema de design: mora em src/ds.js (cores, luz, imagem)
//                                                                  e a luz em src/luz.js; a cena e o banco de peças usam os mesmos

// ---------------------------------------------------------------- 3 · linha do tempo (TROCAR)
// Todos os instantes ficam aqui, num lugar só. Adaptar a duração é mexer nesta tabela (ou num mapa de tempo), nunca
// caçar números espalhados pelo código.
const DUR = 6;
const T = { brota: 0.4, passo: 0.22, titulo: 1.5, corte: 3.2, pulso: 4.2 };
// Planos: câmera travada em cada um e corte seco entre eles. `ate` (opcional) = movimento lento dentro do plano.
// Filme de plano único (órbita, aproximação, travelling)? Troque PLANOS por chaves e use cameraPorChaves(CHAVES, t)
// de lib/camera.js no lugar de planoEm, e tire o enquadrar() automático.
const PLANOS = [
  { t0: 0, cam: { az: 32, el: 22, dist: 13, alvo: [0, 0.7, 0], fov: 26 } },
  { t0: T.corte, cam: { az: -24, el: 12, dist: 6.2, alvo: [0.2, 0.9, 0], fov: 26 }, ate: { az: -30, el: 12, dist: 5.8, alvo: [0.2, 0.9, 0], fov: 26 } },
];
// Momentos-chave: um card por momento, no instante em que o momento está mais legível (não no meio de uma entrada).
const KEYS = [
  { id: '01-montado', t: 2.6, titulo: 'Montado' },
  { id: '02-fechado', t: 3.8, titulo: 'Plano fechado' },
  { id: '03-pulso', t: 4.32, titulo: 'Pulso' },
];

// ---------------------------------------------------------------- 4 · cena
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;   // o PCFSoft saiu no r187; a maciez vem da luz de área

const scene = new THREE.Scene();
const LUZ = montarLuz(scene, renderer);
if (!ALFA) scene.background = canvasTex(1024, 576, (g, w, h) => {
  const d = g.createRadialGradient(w / 2, h * 0.52, 0, w / 2, h * 0.52, w * 0.7);
  d.addColorStop(0, DS.fundo[0]); d.addColorStop(1, DS.fundo[1]); g.fillStyle = d; g.fillRect(0, 0, w, h);
}, { repetir: false });

// chão que só recebe sombra: o objeto "flutua" sobre o fundo e a sombra dá o peso
const chao = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ color: DS.sombra.cor, opacity: DS.sombra.opacidade }));
chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; scene.add(chao);

// TROCAR: as peças do filme. Objeto que precisa ficar bom mora em src/pecas/NOME.js e entra por carregarPeca(nome,
// [largura, altura, profundidade]): se o arquivo ainda não existe, entra um substituto desse tamanho, e a cena, a
// câmera e a animação avançam enquanto a peça é feita (por você, depois, ou por outra frente, em paralelo).
const HEROI = await carregarPeca('exemplo', [2.1, 1.6, 1.2]);
HEROI.grupo.position.set(-2.1, 0, 0);
const relevo = granulado();
const pecas = [
  HEROI.grupo,
  cyl(0.85, 0.85, 1.9, M(DS.pecas[1], { r: 0.35, m: 0.35 }), 0.2, 0.95, 0.2),
  sph(0.82, M(DS.pecas[2], { r: 0.8, bump: relevo, rep: 2, bs: 0.8 }), 2.3, 0.82, -0.1),
];
const palco = new THREE.Group(); palco.add(...pecas); scene.add(palco);
const BASES = pecas.map(p => p.position.y);

const camera = criarCamera(W, H);
// o plano aberto se ajusta ao formato: a mesma cena cabe em 16:9, 9:16 e 1:1 sem cortar ninguém
PLANOS[0].cam = enquadrar(camera, W, H, PLANOS[0].cam, new THREE.Box3().setFromObject(palco), 1.05);
const camInspecao = qs.get('cam') ? cameraDeTexto(qs.get('cam')) : null;

// ---------------------------------------------------------------- 5 · estado(t): a cena inteira em função do tempo
function estado(t) {
  pecas.forEach((p, i) => {
    const e = outBack(seg(t, T.brota + i * T.passo, 0.55), 1.4);                 // brota passando do ponto
    const pulso = 1 + baque(t, T.pulso + i * 0.06, 0.06, 5, 8);                  // soco: tremor que morre
    p.scale.setScalar(Math.max(e, 0.0001) * pulso);
    p.position.y = BASES[i] * e;
    p.rotation.y = (1 - outCubic(seg(t, T.brota + i * T.passo, 0.9))) * -0.9 + 0.04 * Math.sin(t * 1.3 + i * 1.7);   // respira: nunca 100% parado
    p.visible = e > 0;
  });
  HEROI.pose(t / DUR % 1);                                                     // a peça anima a si mesma (0..1 ou um objeto de estado)
  // câmera: travada no plano, corte seco entre planos
  const pl = planoEm(PLANOS, t), fim = PLANOS[PLANOS.indexOf(pl) + 1]?.t0 ?? DUR;
  const c = pl.ate ? entreCameras(pl.cam, pl.ate, inOut(seg(t, pl.t0, fim - pl.t0))) : pl.cam;
  aplicarCamera(camera, W, H, camInspecao || c);
  scene.updateMatrixWorld(true);
}

// ---------------------------------------------------------------- 6 · texto e rótulos (2D, por cima do quadro pronto)
const texto = criarTexto(DS.fonte, S, DS.tinta), ZONA = zonaSegura(W, H);
function sobre(ctx, t) {
  if (ALFA) return;
  const a = ss(t, T.titulo, T.titulo + 0.5) * (1 - ss(t, T.corte - 0.25, T.corte));
  if (a > 0) {
    const sobe = (1 - outCubic(seg(t, T.titulo, 0.6))) * 22 * S, x = ZONA.x0, y = ZONA.y0 + 60 * S + sobe;
    texto(ctx, 'TROQUE O TÍTULO', x, y, { tam: 64, alfa: a, max: ZONA.largura });
    texto(ctx, 'uma linha de apoio', x, y + 62 * S, { tam: 26, peso: 500, cor: DS.acento, alfa: a, max: ZONA.largura });
  }
  // rótulo preso a um ponto da cena: projete o ponto e desenhe em px
  if (t > T.corte) {
    const p = naTela(camera, W, H, [0, 1.1, 0], pecas[1]), k = outBack(seg(t, T.corte + 0.25, 0.4), 1.8);
    ctx.fillStyle = DS.acento; ctx.beginPath(); ctx.arc(p.x, p.y, 16 * S * k, 0, 6.2832); ctx.fill();
    texto(ctx, '1', p.x, p.y + 1.5 * S, { tam: 19 * k, cor: '#fff', alinha: 'center' });
  }
}

// ---------------------------------------------------------------- 7 · render e contrato com o render.mjs
const pipe = criarPipeline(renderer, W, H, {
  fps: FPS, alfa: ALFA,
  sub: RASCUNHO ? 4 : 16,
  obturador: 0.5,
  // foco: { alvo: [0.2, 0.9, 0.2], abertura: 0.12 },   // profundidade de campo: ligue se a referência tiver (e suba sub para 32+)
  ...DS.imagem,
});
function renderAt(t) { pipe.render(t, { estado, scene, camera, porSubquadro: LUZ.porSubquadro, sobre }); return t; }

window.renderAt = renderAt;
window.grab = pipe.grab;
window.DURATION = DUR;
window.FPS = FPS;
window.KEYS = KEYS;
window.SHOTS = PLANOS.map(p => p.t0);
window.FALTAM = pecasQueFaltam();          // peças ainda em substituto: o render final recusa sair com alguma faltando
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'placa desconhecida';

// fontes antes do primeiro quadro: sem isso o primeiro card sai com a fonte reserva
const F = '/node_modules/@fontsource/inter/files/inter-latin-';
await carregarFontes([{ familia: 'Inter', peso: 500, url: F + '500-normal.woff2' }, { familia: 'Inter', peso: 800, url: F + '800-normal.woff2' }]);
await renderer.compileAsync(scene, camera).catch(() => {});
// no navegador: ?t=2.5 mostra um instante · ?key=1 mostra um card · sem nada, toca em laço para olhar o movimento
if (qs.has('t')) renderAt(Number(qs.get('t')));
else if (qs.has('key')) renderAt(KEYS[Number(qs.get('key'))].t);
else if (qs.has('toca')) { const t0 = performance.now(); (function laco() { renderAt(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(laco); })(); }
else renderAt(0);
window.ready = true;
