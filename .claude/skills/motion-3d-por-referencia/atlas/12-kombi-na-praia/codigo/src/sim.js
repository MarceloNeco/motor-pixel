// Simulação da kombi, integrada uma vez na abertura e depois lida por interpolação.
// Corpo rígido no plano vertical (altura + arfagem) sobre duas molas de suspensão,
// mais rolagem, a pilha de panquecas (corrente de molas) e as frutas (balística).
// Sem three.js: roda também no Node para afinar os números.
import { clamp, lerp, smooth, groundH, pathZ, pathDz, pathDDz, roadBase, X_START } from './geo.js';

export const DURATION = 16;
export const V = 10;                   // m/s na estrada
export const T_BRAKE = 8.45, D_BRAKE = 3.4, BP = 1.35;   // freada: v = V·(1 − τ^BP)
export const X_BRAKE = X_START + V * T_BRAKE;
export const X_STOP = X_BRAKE + V * D_BRAKE * (1 - 1 / (BP + 1));
export const T_STOP = T_BRAKE + D_BRAKE;

export const WB = 1.425;               // meia distância entre eixos
export const WR = 0.37;                // raio da roda
export const NP = 7, TH = 0.2;         // panquecas e espessura
export const STACK_X = -0.855, STACK_Y = 2.60;   // base da pilha no referencial do chassi
export const NB = 5;                   // frutas
export const BERRY_R = [0.2, 0.19, 0.105, 0.1, 0.11];

export function xAt(t) {
  if (t <= T_BRAKE) return X_START + V * t;
  const u = Math.min(1, (t - T_BRAKE) / D_BRAKE);
  return X_BRAKE + V * D_BRAKE * (u - Math.pow(u, BP + 1) / (BP + 1));
}
export function vAt(t) { if (t <= T_BRAKE) return V; const u = (t - T_BRAKE) / D_BRAKE; return u >= 1 ? 0 : V * (1 - Math.pow(u, BP)); }
export function aAt(t) { if (t <= T_BRAKE) return 0; const u = (t - T_BRAKE) / D_BRAKE; return u >= 1 ? 0 : -V * BP * Math.pow(u, BP - 1) / D_BRAKE; }

// altura da pilha em função do "peso sentido" q (q>0 flutuando, q<0 esmagada)
export const stackScale = q => q > 0 ? 1 + 0.17 * Math.min(q, 1.15) : 1 + 0.085 * Math.max(q, -1.6);

export function runSim(P = {}) {
  const G = P.g ?? 9.8;
  const W2 = (P.w ?? 11) ** 2, ZW = (P.zeta ?? 0.5) * (P.w ?? 11);
  const C0 = G / W2, CB = 0.13, DMAX = 0.075;
  const RG2 = 1.35 * 1.35, HCG = 1.05 * 3.2;   // mergulho de freada exagerado de propósito
  const T0 = -4, T1 = DURATION + 0.6, H = 1 / 1200, SUB = 5, RATE = 1 / (H * SUB);
  const n = Math.ceil((T1 - T0) / H), ns = Math.ceil(n / SUB);
  const A = [WB, -WB];
  const F = () => new Float32Array(ns);
  const o = { T0, RATE, ns, x: F(), y: F(), pitch: F(), roll: F(), cF: F(), cR: F(), q: F(), air: F(), ay: F(),
    u: Array.from({ length: NP }, F), w: Array.from({ length: NP }, F), by: Array.from({ length: NB }, F), bs: Array.from({ length: NB }, F),
    land: [] };

  let x = xAt(T0);
  let y = (groundH(x + WB, pathZ(x + WB)) + groundH(x - WB, pathZ(x - WB))) / 2, th = 0, vy = 0, om = 0;
  let roll = 0, vroll = 0, q = 0, vq = 0;
  const cPrev = [0, 0], airT = [0, 0], c = [0, 0];
  const u = new Float64Array(NP), vu = new Float64Array(NP), w = new Float64Array(NP), vw = new Float64Array(NP);
  const K = 60 * 60, CR = 2 * 0.12 * 60, CA = 4.6, GA = P.gain ?? 0.55, LIM = 0.05;
  const by = new Float64Array(NB), bv = new Float64Array(NB), bs = new Float64Array(NB);
  const BH = [0.30, 0.24, 0.38, 0.2, 0.28];
  const BG = [0.52, 0.60, 0.46, 0.66, 0.56], BE = [0.28, 0.22, 0.34, 0.2, 0.3], BSPIN = [5.5, -4.2, 7.5, -6.5, 5];
  let topPrev = 0, landN = 0, init = true;

  for (let i = 0; i < n; i++) {
    const t = T0 + i * H; x = xAt(t);
    const v = vAt(t), ax = aAt(t);
    let fy = 0, tq = 0, grounded = 0;
    for (let k = 0; k < 2; k++) {
      const xk = x + A[k], gk = groundH(xk, pathZ(xk));
      const ck = gk - y - A[k] * Math.sin(th);
      const cd = init ? 0 : (ck - cPrev[k]) / H; cPrev[k] = ck; c[k] = ck;
      let f = 0;
      if (ck + C0 > 0) {
        f = 0.5 * W2 * (ck + C0) + ZW * cd; if (ck > CB) f += 3 * W2 * (ck - CB); if (f < 0) f = 0;
        grounded++;
        if (airT[k] > 0.1) { o.land.push({ t, k, x: xk, z: pathZ(xk), y: gk, s: Math.min(1, Math.abs(cd) / 4), air: airT[k] }); if (k === 0) { vroll += (landN++ % 2 ? -1 : 1) * 0.35; } }
        airT[k] = 0;
      } else airT[k] += H;
      fy += f; tq += f * A[k];
    }
    const ay = fy - G;
    let alpha = tq / RG2;
    if (grounded) alpha += ax * HCG / RG2 * (grounded / 2);
    else {                                                                // no ar, busca a inclinação do chão à frente (licença de cartum)
      const sl = Math.atan((groundH(x + 2.2, pathZ(x + 2.2)) - groundH(x - 0.6, pathZ(x - 0.6))) / 2.8);
      alpha += -(P.airK ?? 30) * (th - (P.airT ?? 0.55) * sl) - (P.airD ?? 8) * om;
    }
    vy += ay * H; y += vy * H; om += alpha * H; th += om * H;
    // rolagem
    const az = v * v * pathDDz(x), rollT = clamp(-az * 0.012, -0.09, 0.09);
    const aroll = -(13 * 13) * (roll - rollT) - 2 * 0.3 * 13 * vroll;
    vroll += aroll * H; roll += vroll * H;
    // pilha (corrente de molas no referencial do teto)
    const aF = clamp(ax - STACK_Y * alpha, -30, 30), aL = clamp(az + STACK_Y * aroll, -30, 30);
    for (let j = 0; j < NP; j++) {
      const lu = j ? u[j - 1] : 0, lvu = j ? vu[j - 1] : 0, lw = j ? w[j - 1] : 0, lvw = j ? vw[j - 1] : 0;
      let fu = -K * (u[j] - lu) - CR * (vu[j] - lvu), fw = -K * (w[j] - lw) - CR * (vw[j] - lvw);
      const ru = u[j] - lu, rw = w[j] - lw;
      if (Math.abs(ru) > LIM) fu -= 10 * K * (ru - Math.sign(ru) * LIM);
      if (Math.abs(rw) > LIM) fw -= 10 * K * (rw - Math.sign(rw) * LIM);
      if (j < NP - 1) { fu += K * (u[j + 1] - u[j]) + CR * (vu[j + 1] - vu[j]); fw += K * (w[j + 1] - w[j]) + CR * (vw[j + 1] - vw[j]); }
      fu += -CA * vu[j] - GA * aF - 0.7 * G * th;
      fw += -CA * vw[j] - GA * aL + 0.7 * G * roll;
      vu[j] += fu * H; vw[j] += fw * H;
    }
    for (let j = 0; j < NP; j++) {
      u[j] += vu[j] * H; w[j] += vw[j] * H;
      const lu = j ? u[j - 1] : 0, lw = j ? w[j - 1] : 0;                 // trava dura: a pilha nunca desmonta
      if (Math.abs(u[j] - lu) > 0.075) { u[j] = lu + Math.sign(u[j] - lu) * 0.075; vu[j] = j ? vu[j - 1] : 0; }
      if (Math.abs(w[j] - lw) > 0.075) { w[j] = lw + Math.sign(w[j] - lw) * 0.075; vw[j] = j ? vw[j - 1] : 0; }
    }
    // peso sentido -> abre folga em queda livre, esmaga no pouso
    const felt = (ay + STACK_X * alpha + G) / G, qT = clamp(1 - felt, -1.6, 1.0);
    const aq = -(21 * 21) * (q - qT) - 2 * 0.34 * 21 * vq; vq += aq * H; q += vq * H;
    // frutas: balística com gravidade menor, quicando no topo da pilha
    const top = y + STACK_X * Math.sin(th) + (STACK_Y + NP * TH * stackScale(q) + 0.035) * Math.cos(th);
    const vtop = init ? 0 : (top - topPrev) / H; topPrev = top;
    for (let b = 0; b < NB; b++) {
      const rest = top + BERRY_R[b] * 0.82;
      if (init) { by[b] = rest; bv[b] = 0; }
      const hb = by[b] - rest;
      bv[b] += (-G * BG[b] - 150 * Math.max(0, hb - BH[b]) - (hb > BH[b] ? 9 * (bv[b] - vtop) : 0)) * H; by[b] += bv[b] * H;   // elástico invisível: não fogem da pilha
      if (by[b] <= rest) { by[b] = rest; const vr = bv[b] - vtop; bv[b] = vr < 0 ? vtop + Math.min(2.2, -BE[b] * vr) : bv[b]; }
      else bs[b] += BSPIN[b] * H * smooth(0.0, 0.12, by[b] - rest);
    }
    init = false;
    if (i % SUB === 0) {
      const s = i / SUB;
      o.x[s] = x; o.y[s] = y; o.pitch[s] = th; o.roll[s] = roll; o.q[s] = q; o.ay[s] = ay;
      o.cF[s] = clamp(c[0], -DMAX, 0.2); o.cR[s] = clamp(c[1], -DMAX, 0.2);
      o.air[s] = (c[0] + C0 <= 0 ? 1 : 0) + (c[1] + C0 <= 0 ? 1 : 0);
      for (let j = 0; j < NP; j++) { o.u[j][s] = u[j]; o.w[j][s] = w[j]; }
      for (let b = 0; b < NB; b++) { o.by[b][s] = by[b]; o.bs[b][s] = bs[b]; }
    }
  }

  // leitura interpolada
  const rd = (arr, t) => { const f = clamp((t - T0) * RATE, 0, ns - 1.001), i = Math.floor(f), k = f - i; return arr[i] + (arr[i + 1] - arr[i]) * k; };
  o.rd = rd;
  o.at = t => {
    const r = { t, x: xAt(t), v: vAt(t), y: rd(o.y, t), pitch: rd(o.pitch, t), roll: rd(o.roll, t), cF: rd(o.cF, t), cR: rd(o.cR, t), q: rd(o.q, t), air: rd(o.air, t), u: [], w: [], by: [], bs: [] };
    r.z = pathZ(r.x); r.yaw = -Math.atan(pathDz(r.x));
    for (let j = 0; j < NP; j++) { r.u.push(rd(o.u[j], t)); r.w.push(rd(o.w[j], t)); }
    for (let b = 0; b < NB; b++) { r.by.push(rd(o.by[b], t)); r.bs.push(rd(o.bs[b], t)); }
    return r;
  };

  // referência suavizada para a câmera: segue a kombi com atraso de dois polos e
  // compensa o atraso pela velocidade suavizada -> na freada a câmera passa à frente e assenta.
  const TAU_C = 0.34, kf = 1 - Math.exp(-1 / (RATE * TAU_C));
  o.rx = F(); o.ry = F();
  let a1 = o.x[0], a2 = o.x[0], v1 = V, v2 = V, y1 = roadBase(o.x[0]), y2 = y1;
  for (let s = 0; s < ns; s++) {
    const t = T0 + s / RATE;
    a1 += (o.x[s] - a1) * kf; a2 += (a1 - a2) * kf;
    v1 += (vAt(t) - v1) * kf; v2 += (v1 - v2) * kf;
    const rx = a2 + 2 * TAU_C * v2;
    y1 += (roadBase(rx) - y1) * kf * 0.8; y2 += (y1 - y2) * kf * 0.8;
    o.rx[s] = rx; o.ry[s] = y2;
  }
  return o;
}
