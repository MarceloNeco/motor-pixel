/* Módulo vetor: desenhos SVG em camadas com partes nomeadas (id).
   Serve para músculos, peças de aparelho, roupas, mapas, ícones — qualquer desenho
   em que o app precise acender, esconder, pulsar ou mover partes. */
import { reduzirMovimento } from '../nucleo/index.js';

const ESTILO = `
  .mg-ativo { fill: var(--mg-ativo, #FF3B3B) !important; }
  .mg-apoio { fill: var(--mg-apoio, #FF8A8A) !important; }
  .mg-pulsa { animation: mg-pulsa 1.2s ease-in-out infinite; }
  @keyframes mg-pulsa { 50% { opacity: .55; } }
  @media (prefers-reduced-motion: reduce) { .mg-pulsa { animation: none; } }
  .mg-tocavel { cursor: pointer; }
`;
let estiloPosto = false;
function porEstilo() {
  if (estiloPosto) return;
  const s = document.createElement('style'); s.textContent = ESTILO; document.head.append(s); estiloPosto = true;
}

/** Carrega um SVG de arquivo e coloca dentro de um elemento. Devolve o <svg>. */
export async function carregarSVG(url, destino) {
  const texto = await (await fetch(url)).text();
  const doc = new DOMParser().parseFromString(texto, 'image/svg+xml');
  const svg = document.importNode(doc.documentElement, true);
  destino.replaceChildren(svg);
  return svg;
}

/** Acende partes pelo id. principal = cor forte (e pulsa); apoio = cor clara. */
export function realcar(svg, { principal = [], apoio = [], pulsar = true } = {}) {
  porEstilo();
  apagar(svg);
  for (const id of apoio) svg.querySelector(`#${CSS.escape(id)}`)?.classList.add('mg-apoio');
  for (const id of principal) {
    const el = svg.querySelector(`#${CSS.escape(id)}`);
    if (el) { el.classList.add('mg-ativo'); if (pulsar && !reduzirMovimento()) el.classList.add('mg-pulsa'); }
  }
}

/** Tira todos os realces. */
export function apagar(svg) {
  svg.querySelectorAll('.mg-ativo,.mg-apoio,.mg-pulsa').forEach((el) => el.classList.remove('mg-ativo', 'mg-apoio', 'mg-pulsa'));
}

/** Torna partes tocáveis: avisa o id da parte tocada (ex.: "onde dói"). */
export function aoTocarParte(svg, ids, funcao) {
  porEstilo();
  const alvo = new Set(ids);
  for (const id of ids) svg.querySelector(`#${CSS.escape(id)}`)?.classList.add('mg-tocavel');
  const ouvir = (e) => {
    const el = e.target.closest('[id]');
    if (el && alvo.has(el.id)) funcao(el.id, e);
  };
  svg.addEventListener('click', ouvir);
  return () => svg.removeEventListener('click', ouvir);
}

/** Gira ou move uma peça em volta de um ponto (ex.: encosto do banco). Anima suavemente. */
export function moverPeca(svg, id, { girar = 0, x = 0, y = 0, eixo = [0, 0], duracao = 600 } = {}) {
  const el = svg.querySelector(`#${CSS.escape(id)}`);
  if (!el) return;
  el.style.transformBox = 'view-box';
  el.style.transformOrigin = `${eixo[0]}px ${eixo[1]}px`;
  el.style.transition = reduzirMovimento() ? 'none' : `transform ${duracao}ms ease-in-out`;
  el.style.transform = `translate(${x}px, ${y}px) rotate(${girar}deg)`;
}

/** Troca de pose: mostra só o grupo da pose pedida, com transição cruzada. */
export function mostrarPose(svg, poses, nome, duracao = 250) {
  for (const p of poses) {
    const el = svg.querySelector(`#${CSS.escape(p)}`);
    if (!el) continue;
    el.style.transition = reduzirMovimento() ? 'none' : `opacity ${duracao}ms`;
    el.style.opacity = p === nome ? '1' : '0';
  }
}

/** Modo neon: contorno brilhante (filtro SVG). cor ex.: '#2F7BFF'. */
export function neon(svg, cor = '#2F7BFF', ligado = true) {
  const id = 'mg-neon';
  let f = svg.querySelector(`#${id}`);
  if (!ligado) { svg.style.filter = ''; return; }
  if (!f) {
    const ns = 'http://www.w3.org/2000/svg';
    const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS(ns, 'defs'), svg.firstChild);
    f = document.createElementNS(ns, 'filter'); f.id = id;
    f.innerHTML = `<feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="${cor}"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>`;
    defs.append(f);
  }
  svg.style.filter = `url(#${id})`;
}
