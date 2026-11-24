// Linha do tempo (segundos), medida quadro a quadro na referência (q = quadro a 24 fps):
//   q20 (0,83) a mão entra pelo topo · q21–q25 paira segurando o palito · q26 (1,08) some; a bandeira fica
//   q28 (1,17) anel de vidro e primeiros montantes surgem de uma vez · q33 (1,38) treliça completa e a bandeira some
//   q40 (1,67) a mão volta e paira, descendo devagar · q47–q49 (1,96–2,04) o hambúrguer se materializa e as luzes acendem
//   q58 (2,42) letreiro · q60 (2,50) placa de aberto · q80–q92 gente junta no pátio · q92–q108 (3,83–4,5) guarda-sóis
//   q94 (3,9) o táxi parado vai embora · q98 (4,1) o carro branco chega e fica
import { clamp, remap, easeOutCubic, easeInCubic, smooth } from './util.js';

export const TL = {
  // mão 1: entra, paira, some (salto de time-lapse)
  h1In: 0.795, h1Set: 0.875, h1Out: 1.035, h1Gone: 1.068,
  flagOff: 1.375,
  // obra em saltos
  dig0: 1.05, base0: 1.145, frameFull: 1.375,
  // mão 2: volta com a bandeira, paira descendo, crava quando o hambúrguer chega
  h2In: 1.635, h2Set: 1.685, plant: 1.985, h2Out: 1.99, h2Gone: 2.03,
  // hambúrguer: materializa em ~3 quadros
  burger0: 1.915, burger1: 2.01, lights0: 1.96,
  // letreiro e neon
  letters0: 2.385, sign0: 2.41, neon0: 2.44, open0: 2.50,
  // vida
  pots0: 2.55, crowd0: 2.45, patioCrowd0: 3.25,
  patio0: 3.82, patio1: 4.12, patio2: 4.42, pare0: 4.46,
  taxiLeave: 3.86, whiteCarIn: 4.02,
};

export const FLAG_TOP = 20.6;    // topo do palito cravado (mundo)
export const GRAB_DROP = 3.95;   // os dedos pinçam logo abaixo da flâmula
export const POLE_LONG = 20.5, POLE_SHORT = 9.2;

// estado da bandeira: visível, altura do topo, inclinação e comprimento do palito
export function flagState(t) {
  const T = TL;
  if (t < T.h1In) return { on: false, y: FLAG_TOP + 30, tilt: 0, len: POLE_LONG };
  if (t < T.h1Set) {                       // desce com a mão, em diagonal
    const k = easeOutCubic(remap(t, T.h1In, T.h1Set));
    return { on: true, y: FLAG_TOP + 0.9 + 17 * (1 - k), tilt: 0.42 * (1 - k), len: POLE_LONG };
  }
  if (t < T.h1Out) {                       // paira e assenta
    const k = smooth(remap(t, T.h1Set, T.h1Out - 0.02));
    return { on: true, y: FLAG_TOP + 0.9 * (1 - k), tilt: 0.02 * Math.sin((t - T.h1Set) * 20) * (1 - k), len: POLE_LONG };
  }
  if (t < T.flagOff) {                     // em pé no terreno
    const a = t - T.h1Out; return { on: true, y: FLAG_TOP, tilt: 0.03 * Math.exp(-a * 10) * Math.sin(a * 40), len: POLE_LONG };
  }
  if (t < T.h2In) return { on: false, y: FLAG_TOP + 30, tilt: 0, len: POLE_SHORT };
  if (t < T.h2Set) {
    const k = easeOutCubic(remap(t, T.h2In, T.h2Set));
    return { on: true, y: FLAG_TOP + 3.3 + 14 * (1 - k), tilt: 0.3 * (1 - k), len: POLE_SHORT };
  }
  if (t < T.plant) {                       // paira descendo devagar e crava no fim
    const slow = smooth(remap(t, T.h2Set, T.burger0));
    const push = easeInCubic(remap(t, T.burger0, T.plant));
    return { on: true, y: FLAG_TOP + 3.3 - 2.3 * slow - 1.0 * push, tilt: 0.015 * Math.sin((t - T.h2Set) * 14), len: POLE_SHORT };
  }
  const a = t - T.plant;
  return { on: true, y: FLAG_TOP, tilt: 0.03 * Math.exp(-a * 9) * Math.sin(a * 38), len: POLE_SHORT };
}

// mão: visível, presa ao palito ou saindo (dy = subida, away = para a câmera)
export function handState(t) {
  const T = TL;
  for (const [tin, tout, tgone] of [[T.h1In, T.h1Out, T.h1Gone], [T.h2In, T.h2Out, T.h2Gone]]) {
    if (t >= tin && t < tgone) {
      if (t < tout) return { on: true, dy: 0, away: 0, open: 0 };
      const k = remap(t, tout, tgone);
      return { on: true, dy: 26 * easeInCubic(k) + 2 * k, away: 6 * k, open: Math.min(1, k * 3) };
    }
  }
  return { on: false };
}
