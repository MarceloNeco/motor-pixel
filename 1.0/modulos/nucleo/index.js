/* Núcleo do Motor Pixel: o que todo módulo usa. Pequeno e sempre carregado.
   Não sabe nada de jogo, de treino ou de qualquer app. */

/** Aparelho fraco ou pedido do usuário: módulos usam menos efeitos. */
export function modoLeve() {
  const pouca = (navigator.deviceMemory || 4) <= 2 || (navigator.hardwareConcurrency || 4) <= 2;
  let pediu = false;
  try { pediu = localStorage.getItem('motor.modoLeve') === '1'; } catch { /* sem armazenamento */ }
  return pouca || pediu;
}

/** O usuário pediu "reduzir movimento" no sistema. */
export function reduzirMovimento() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Nitidez máxima permitida (limita o custo em telas muito densas). */
export function nitidez() {
  return Math.min(devicePixelRatio || 1, modoLeve() ? 1 : 2);
}

/** Laço de quadros único: vários módulos se inscrevem, um requestAnimationFrame só.
    Para sozinho quando a aba fica escondida. Devolve uma função para sair. */
const inscritos = new Set();
let rodando = false, anterior = 0;
function quadro(t) {
  const dt = Math.min((t - anterior) / 1000, 0.05); anterior = t;
  for (const f of inscritos) f(dt, t);
  if (inscritos.size && !document.hidden) requestAnimationFrame(quadro); else rodando = false;
}
export function aCadaQuadro(funcao) {
  inscritos.add(funcao);
  if (!rodando) { rodando = true; anterior = performance.now(); requestAnimationFrame(quadro); }
  return () => inscritos.delete(funcao);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && inscritos.size && !rodando) { rodando = true; anterior = performance.now(); requestAnimationFrame(quadro); }
});

/** Observa o tamanho de um elemento e avisa quando muda. */
export function aoMudarTamanho(elemento, funcao) {
  const ro = new ResizeObserver(() => funcao(elemento.clientWidth, elemento.clientHeight));
  ro.observe(elemento);
  funcao(elemento.clientWidth, elemento.clientHeight);
  return () => ro.disconnect();
}
