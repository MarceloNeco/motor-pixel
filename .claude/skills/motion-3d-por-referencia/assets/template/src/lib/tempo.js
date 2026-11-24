// Tempo: tudo aqui é função pura. Nenhuma função guarda estado, lê relógio ou sorteia sem semente,
// porque renderAt(t) precisa dar o mesmo quadro em qualquer ordem.

export const cl = (x, a = 0, b = 1) => Math.min(Math.max(x, a), b);
export const mix = (a, b, t) => a + (b - a) * t;
export const remap = (x, a, b, c, d) => c + (d - c) * cl((x - a) / (b - a));

// progresso 0→1 de um trecho que começa em t0 e dura d segundos
export const seg = (t, t0, d) => cl((t - t0) / d);
// smoothstep entre dois instantes
export const ss = (t, a, b) => { const x = cl((t - a) / (b - a)); return x * x * (3 - 2 * x); };

// ---- curvas (entrada 0..1, já limitada)
export const linear = t => cl(t);
export const inQuad = t => { t = cl(t); return t * t; };
export const outQuad = t => { t = cl(t); return 1 - (1 - t) * (1 - t); };
export const inCubic = t => { t = cl(t); return t * t * t; };
export const outCubic = t => 1 - Math.pow(1 - cl(t), 3);
export const outQuart = t => 1 - Math.pow(1 - cl(t), 4);
export const outExpo = t => { t = cl(t); return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); };
export const inOut = t => { t = cl(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
// passa do ponto e volta: c ≈ 1,1 discreto · 1,7 padrão · 2,5 cartum
export const outBack = (t, c = 1.70158) => { t = cl(t); const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
// antecipa (recua) antes de ir
export const inBack = (t, c = 1.70158) => { t = cl(t); return (c + 1) * t * t * t - c * t * t; };
// mola amortecida: chega em 1 oscilando. freq em Hz, amort ≈ 4 (solta) a 10 (seca)
export const mola = (t, freq = 3, amort = 6) => t <= 0 ? 0 : 1 - Math.exp(-amort * t) * Math.cos(2 * Math.PI * freq * t);
// tremor que morre: para o "clique" de encaixe e o baque de pouso. Some a uma escala ou posição.
export const baque = (t, t0, amp = 0.03, freq = 6, amort = 9) => t < t0 ? 0 : amp * Math.exp(-amort * (t - t0)) * Math.sin(2 * Math.PI * freq * (t - t0));
// queda com quique: 0 no ar → 1 no chão, com três rebotes que diminuem
export function quique(t) {
  t = cl(t); const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

// ---- tempo em degraus: animação "em 2" (12 poses por segundo) ou time-lapse. Alinhe ao quadro para não dar fantasma
// quando houver subquadros: o degrau troca exatamente na virada do quadro.
export const degrau = (t, porSegundo) => Math.floor(t * porSegundo + 1e-6) / porSegundo;

// ---- escalonar: atraso do item i de n, do primeiro ao último (ou de fora para dentro com `ordem`)
export const escalonar = (t, t0, i, passo, d, curva = outCubic) => curva((t - t0 - i * passo) / d);

// ---- sorteio com semente (sempre o mesmo resultado)
export function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// ruído suave de 1 dimensão, determinístico: para respiração, flutuação e tremor de mão
export function ruido1(x, semente = 0) {
  const h = n => { const s = Math.sin(n * 127.1 + semente * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return mix(h(i), h(i + 1), u) * 2 - 1;
}
// sequência de Halton: pontos bem espalhados para subquadros (jitter de câmera, luz de área, foco)
export const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

// ---- laço: fase 0..1 que fecha no fim da duração. Use sin(2π·fase·n) com n inteiro para o último quadro emendar no primeiro.
export const fase = (t, dur) => ((t % dur) + dur) % dur / dur;

// ---- planos (cortes de câmera): devolve o plano ativo no instante t. planos = [{ t0, ... }] em ordem.
export function planoEm(planos, t) { let p = planos[0]; for (const q of planos) if (t >= q.t0 - 1e-6) p = q; return p; }

// ---- reescala de tempo única: aplique no começo de estado(t) para adaptar a duração sem tocar em cada instante.
// mapa = [[tNovo, tOriginal], ...] crescente; interpola linear entre os pontos.
export function mapaDeTempo(mapa) {
  return t => { for (let i = 1; i < mapa.length; i++) if (t <= mapa[i][0]) return remap(t, mapa[i - 1][0], mapa[i][0], mapa[i - 1][1], mapa[i][1]); return mapa[mapa.length - 1][1]; };
}

// ---- código de terceiros que sorteia: alguns passes dos addons do three (GTAOPass, por exemplo) chamam Math.random ao
// serem criados. Isso muda o ruído a cada execução, e um render retomado deixa de emendar. Crie-os dentro de comSemente.
export function comSemente(semente, fn) {
  const original = Math.random; Math.random = mulberry32(semente);
  try { return fn(); } finally { Math.random = original; }
}
