// T-rex: escuro, cabeça enorme, bracinhos. Anda no lugar em postura de espreita e, uma vez por laço, levanta a cabeça e ruge.
// Eixos do dinossauro: +x para a frente (focinho), +y para cima, ±z os lados. O chão é y = 0.
import * as THREE from 'three';
import { C, V3, DEG, PI, Loft, fkSpine, ik2, bonePath, makeSkin, buildHead, clawFoot, spike, setBasis, eyeJiggle, cyc, env, shadows } from '../lib.js';

export function build() {
  const skin = makeSkin({
    seed: 11, back: '#2a2421', flank: '#4d4139', belly: '#a48a6c',
    stripe: { color: '#14100e', n: 15, u0: 0.06, u1: 0.84, reach: 0.27, width: 15, alpha: 0.38 },
  });
  const mClaw = skin.flat('#191715', 0.45);
  const group = new THREE.Group();

  // espinha em repouso, da ponta da cauda à nuca: C(x, y, meia-largura, altura acima, altura abaixo)
  const REST = [
    C(-5.5, 4.05, 0.03, 0.03), C(-4.5, 3.78, 0.14, 0.15, 0.14), C(-3.5, 3.62, 0.28, 0.32, 0.30), C(-2.5, 3.55, 0.46, 0.52, 0.52),
    C(-1.5, 3.52, 0.66, 0.76, 0.80), C(-0.6, 3.55, 0.86, 1.0, 1.10),
    C(0.2, 3.6, 1.0, 1.15, 1.35),                                          // 6 = quadril
    C(1.1, 3.58, 1.08, 1.2, 1.52), C(2.0, 3.62, 1.0, 1.15, 1.46), C(2.7, 3.8, 0.86, 1.0, 1.2),
    C(3.2, 4.1, 0.8, 0.92, 1.06), C(3.62, 4.42, 0.74, 0.82, 0.92), C(3.95, 4.72, 0.68, 0.72, 0.76),
  ];
  const HIP = 6;
  const body = new Loft(76, 26, skin.body, { u0: 0, u1: 0.86 }); group.add(body.mesh);

  // cabeça: origem na nuca, +x para o focinho
  const head = buildHead({
    seed: 5, u0: 0.86, mouth: '#6b1f24', tongue: '#c46a70',
    skull: [
      C(-0.6, 0.02, 0.04, 0.04), C(-0.3, 0.05, 0.44, 0.52, 0.42), C(0.1, 0.05, 0.60, 0.74, 0.34), C(0.55, 0.0, 0.64, 0.82, 0.16, 0.85),
      C(1.0, -0.02, 0.56, 0.68, 0.12, 0.8), C(1.5, -0.04, 0.47, 0.57, 0.10, 0.8), C(1.95, -0.05, 0.41, 0.51, 0.10, 0.8), C(2.27, -0.03, 0.32, 0.40, 0.10, 0.85), C(2.42, 0.03, 0.03, 0.04, 0.03),
    ],
    hinge: [0.05, -0.14],
    jaw: [
      C(-0.3, -0.05, 0.04, 0.03, 0.04), C(0.0, -0.05, 0.50, 0.08, 0.42), C(0.5, -0.06, 0.56, 0.06, 0.47, 0.85), C(1.0, -0.06, 0.49, 0.05, 0.39, 0.85),
      C(1.5, -0.05, 0.41, 0.05, 0.31, 0.85), C(1.9, -0.04, 0.34, 0.05, 0.25, 0.85), C(2.12, -0.02, 0.24, 0.05, 0.15), C(2.24, 0.0, 0.03, 0.02, 0.03),
    ],
    teethUp: { x0: 0.72, x1: 2.24, n: 11, len: 0.3, rad: 0.07, inset: 0.86 },
    teethLow: { x0: 0.62, x1: 2.06, n: 9, len: 0.2, rad: 0.055, inset: 0.8 },
    eye: { x: 0.6, y: 0.4, r: 0.27, out: 0.02, fwd: 0.3, up: 0.2 },
  }, skin);
  group.add(head.group);
  head.group.scale.setScalar(1.36);

  // pernas (coxa, canela, metatarso) e pés
  const TH = 1.55, SH = 1.65, MT = 1.05;
  const legs = [-1, 1].map(s => {
    const loft = new Loft(52, 18, skin.limb); group.add(loft.mesh);
    const foot = clawFoot(skin.limb, mClaw, { toe: 1.0, r: 0.23, spread: 0.46, claw: 0.42 }); group.add(foot);
    return { s, loft, foot };
  });
  // bracinhos
  const arms = [-1, 1].map(s => {
    const loft = new Loft(18, 10, skin.limb); group.add(loft.mesh);
    const claws = [0, 1].map(() => { const c = spike(0.2, 0.045, mClaw); group.add(c); return c; });
    return { s, loft, claws };
  });

  const q = new THREE.Quaternion(), eu = new THREE.Euler(), X = V3(1, 0, 0), Zs = V3();
  function update(t) {
    const R = env(t, 0.38, 0.84, 0.10, 0.14);      // rugido: sobe aos 1,5 s, desce aos 3,4 s
    const stalk = 1 - R;
    // raiz (quadril): balanço, guinada e a empinada do rugido
    eu.set(0.035 * cyc(t, 2, 0.25), 0.06 * cyc(t, 1, 0.2), 0.11 * R - 0.02, 'YZX');
    const rootQ = q.setFromEuler(eu).clone();
    const rootOff = V3(0.12 * cyc(t, 1, 0.05), 0.05 * cyc(t, 2, 0.6) + 0.05 * R, 0);
    const bend = i => {
      if (i < HIP) { const d = HIP - i; return { yaw: 0.10 * cyc(t, 1, -0.10 * d) + 0.04 * cyc(t, 2, -0.16 * d), pitch: 0.035 * cyc(t, 2, 0.3 - 0.1 * d) + 0.045 * R }; }
      const n = i - HIP;
      if (n <= 2) return { yaw: 0.02 * cyc(t, 1, 0.1), pitch: 0.02 * R };
      return { yaw: stalk * 0.06 * cyc(t, 1, 0.12 + 0.05 * n) + R * 0.025 * cyc(t, 3, 0.1 * n), pitch: -0.075 * stalk + 0.07 * R };
    };
    const ctrl = fkSpine(REST, HIP, bend, rootQ, rootOff);
    const br = 1 + 0.025 * cyc(t, 2, 0.1) + 0.03 * R;    // respiração no tronco
    for (const i of [7, 8]) { ctrl[i].w *= br; ctrl[i].hb *= br; }
    Zs.set(0, 0, 1).applyQuaternion(rootQ);
    const sm = body.setCtrl(ctrl, Zs);

    // cabeça presa no fim do pescoço
    const fr = body.at(1);
    setBasis(head.group, fr.p, fr.T, fr.N, fr.B);
    eu.set(0.05 * cyc(t, 1, 0.4) * stalk, 0.16 * cyc(t, 1, 0.3) * stalk + 0.05 * R * cyc(t, 3), -0.72 + 0.1 * R + 0.03 * cyc(t, 2), 'YZX');
    head.group.quaternion.multiply(q.setFromEuler(eu));
    head.setJaw(0.07 + 0.03 * cyc(t, 2, 0.2) * stalk + 0.66 * R + 0.035 * R * cyc(t, 12));
    head.eyes.forEach((e, i) => e.userData.setPupil(...eyeJiggle(t, i + 1, 0.15 + 0.85 * R)));

    // pernas: pés alternam um passo no lugar a cada 2 s
    const hf = body.at(sm.uCtrl[HIP]);
    for (const L of legs) {
      const st = Math.max(0, cyc(t, 2, L.s > 0 ? 0 : 0.5)), lift = Math.pow(st, 1.4);
      const H = hf.p.clone().addScaledVector(hf.B, L.s * 0.6).addScaledVector(hf.N, -0.3);
      const F = V3(0.42 + 0.28 * lift - 0.1 * cyc(t, 2, L.s > 0 ? 0.2 : 0.7), 0.23 + 0.55 * lift, L.s * 0.95);
      const ma = (66 - 20 * lift) * DEG;
      const A = F.clone().add(V3(-Math.cos(ma) * MT, Math.sin(ma) * MT, 0));
      const K = ik2(H, A, TH, SH, X);
      L.loft.setCtrl(bonePath([
        { p: H, w: 0.7, ht: 1.0, hb: 1.05, bulge: 0.06 }, { p: K, w: 0.44, ht: 0.44, hb: 0.46, bulge: 0.18 },
        { p: A, w: 0.24, ht: 0.24, hb: 0.26 }, { p: F, w: 0.27, ht: 0.24, hb: 0.22 },
      ], 1));
      L.foot.position.set(F.x, F.y - 0.02, F.z); L.foot.rotation.set(0, L.s * 0.08, -0.75 * lift);
    }
    // bracinhos presos no peito
    const af = body.at(sm.uCtrl[8] + 0.03);
    for (const a of arms) {
      const loc = (dx, dy, dz) => af.p.clone().addScaledVector(af.T, dx).addScaledVector(af.N, dy).addScaledVector(af.B, a.s * dz);
      const sw = 0.06 * cyc(t, 2, a.s > 0 ? 0.1 : 0.45) + 0.1 * R;
      const S = loc(0.3, -0.95, 0.8), E = loc(0.16, -1.42, 0.9), Wp = loc(0.5 + sw, -1.62 + sw * 0.5, 0.86);
      a.loft.setCtrl(bonePath([{ p: S, w: 0.17, ht: 0.18, hb: 0.18 }, { p: E, w: 0.12, ht: 0.12, hb: 0.12 }, { p: Wp, w: 0.085, ht: 0.085, hb: 0.085 }], 1), af.B);
      a.claws.forEach((c, i) => { c.position.copy(Wp).addScaledVector(af.B, a.s * (i ? 0.05 : -0.05)); c.rotation.set(0, 0, PI / 2 - 0.7); });
    }
  }
  shadows(group);
  update(0);
  return { group, update, name: 'trex', view: { size: 4.6, center: [0.3, 2.9, 0] } };
}
