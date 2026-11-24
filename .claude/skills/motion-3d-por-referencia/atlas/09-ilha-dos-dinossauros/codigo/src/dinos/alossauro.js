// Alossauro: terópode esguio verde-oliva, mais ereto que o T-rex, com fileira de espinhos no dorso e duas cristas acima dos olhos.
// Fica quase parado em pé: a cauda varre de um lado ao outro, a cabeça vira, a boca abre um pouco duas vezes por laço.
// Eixos do dinossauro: +x para a frente (focinho), +y para cima, ±z os lados. O chão é y = 0 e a origem fica embaixo do quadril.
import * as THREE from 'three';
import { C, V3, DEG, PI, Loft, fkSpine, ik2, bonePath, makeSkin, buildHead, clawFoot, spike, setBasis, eyeJiggle, cyc, lerp, shadows } from '../lib.js';

// cone com a base na origem apontando para +y (espinho dorsal, crista)
function thorn(len, rad, mat, seg = 7) {
  const g = new THREE.ConeGeometry(rad, len, seg); g.translate(0, len / 2, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}

export function build() {
  const skin = makeSkin({
    seed: 23, back: '#3f3f2c', flank: '#5a5942', belly: '#b5a17c',
    stops: [[0, 'back'], [0.1, 'back'], [0.22, 'flank'], [0.32, 'flank'], [0.42, 'belly'], [0.5, 'belly']],
    stripe: { color: '#28281a', n: 14, u0: 0.05, u1: 0.84, reach: 0.26, width: 13, alpha: 0.34 },
    blotch: { dark: '#33331f', light: '#77764f', n: 300 },
    limbEnd: '#6a6548',
  });
  const mClaw = skin.flat('#1c1b15', 0.45);
  const mThorn = skin.flat('#36361f', 0.6);
  const group = new THREE.Group();

  // espinha em repouso, da ponta da cauda à nuca. O tronco já nasce empinado (uns 20°) e o pescoço sobe em S.
  const REST = [
    C(-5.6, 3.22, 0.02, 0.02), C(-4.6, 3.27, 0.10, 0.11, 0.10), C(-3.6, 3.33, 0.19, 0.22, 0.20), C(-2.6, 3.41, 0.30, 0.35, 0.33),
    C(-1.6, 3.52, 0.43, 0.50, 0.50), C(-0.7, 3.65, 0.56, 0.66, 0.70),
    C(0.1, 3.8, 0.68, 0.80, 0.92),                                         // 6 = quadril
    C(0.9, 4.06, 0.74, 0.86, 1.04), C(1.65, 4.38, 0.70, 0.82, 1.0), C(2.25, 4.74, 0.58, 0.68, 0.82),
    C(2.66, 5.18, 0.46, 0.52, 0.58), C(2.92, 5.62, 0.40, 0.44, 0.46), C(3.15, 6.02, 0.37, 0.40, 0.40),
  ];
  const HIP = 6;
  const body = new Loft(76, 26, skin.body, { u0: 0, u1: 0.86 }); group.add(body.mesh);

  // cabeça: mais estreita e comprida que a do T-rex. Origem na nuca, +x para o focinho.
  const head = buildHead({
    seed: 9, u0: 0.86, mouth: '#6b2226', tongue: '#c66c72',
    skull: [
      C(-0.55, 0.02, 0.04, 0.04), C(-0.28, 0.04, 0.36, 0.44, 0.36), C(0.1, 0.04, 0.48, 0.62, 0.30), C(0.5, 0.0, 0.50, 0.66, 0.15, 0.85),
      C(0.95, -0.02, 0.44, 0.54, 0.11, 0.8), C(1.45, -0.04, 0.37, 0.45, 0.09, 0.8), C(1.95, -0.05, 0.31, 0.38, 0.09, 0.8), C(2.3, -0.03, 0.24, 0.30, 0.09, 0.85), C(2.45, 0.02, 0.03, 0.04, 0.03),
    ],
    hinge: [0.05, -0.12],
    jaw: [
      C(-0.28, -0.05, 0.04, 0.03, 0.04), C(0.0, -0.05, 0.40, 0.07, 0.32), C(0.5, -0.06, 0.44, 0.05, 0.34, 0.85), C(1.0, -0.06, 0.39, 0.05, 0.28, 0.85),
      C(1.5, -0.05, 0.33, 0.05, 0.23, 0.85), C(1.9, -0.04, 0.27, 0.05, 0.18, 0.85), C(2.14, -0.02, 0.19, 0.05, 0.12), C(2.26, 0.0, 0.03, 0.02, 0.03),
    ],
    teethUp: { x0: 0.7, x1: 2.28, n: 12, len: 0.22, rad: 0.05, inset: 0.86 },
    teethLow: { x0: 0.6, x1: 2.08, n: 10, len: 0.15, rad: 0.04, inset: 0.8 },
    eye: { x: 0.52, y: 0.34, r: 0.25, out: 0.02, fwd: 0.28, up: 0.18 },
  }, skin);
  group.add(head.group);
  head.group.scale.setScalar(1.1);
  // mandíbula mais clara que o resto da cabeça: mesma pele, com o bege da barriga subindo pelos lados
  const jawSkin = makeSkin({
    seed: 31, back: '#5a5942', flank: '#8d8260', belly: '#b9a680',
    stops: [[0, 'back'], [0.06, 'back'], [0.16, 'flank'], [0.26, 'belly'], [0.5, 'belly']],
    blotch: { dark: '#5a5942', light: '#c9b88f', n: 160 }, wrinkles: 120,
  });
  head.jaw.children.forEach(m => { if (m.isMesh && m.material === skin.body) m.material = jawSkin.body; });
  // duas cristas pequenas acima dos olhos
  for (const s of [-1, 1]) {
    const h = thorn(0.3, 0.13, mThorn, 8); h.scale.set(1.5, 1, 0.7); h.position.set(0.6, 0.54, s * 0.3); h.rotation.set(s * 0.3, 0, -0.25); head.group.add(h);
    const h2 = thorn(0.16, 0.08, mThorn, 8); h2.scale.set(1.4, 1, 0.7); h2.position.set(0.95, 0.47, s * 0.24); h2.rotation.set(s * 0.3, 0, -0.2); head.group.add(h2);
  }

  // espinhos curtos ao longo do pescoço e das costas, até o quadril
  const N_TH = 26;
  const thorns = Array.from({ length: N_TH }, (_, i) => {
    const k = i / (N_TH - 1), len = 0.22 + 0.16 * Math.sin(PI * Math.pow(k, 0.8)) + (i % 2 ? 0.04 : 0);
    const m = thorn(len, len * 0.4, mThorn); m.scale.z = 0.6; group.add(m);
    return { m, k };
  });

  // pernas longas (coxa, canela, metatarso) e pés de três dedos
  const TH = 1.36, SH = 1.52, MT = 1.02;
  const legs = [-1, 1].map(s => {
    const loft = new Loft(52, 18, skin.limb); group.add(loft.mesh);
    const foot = clawFoot(skin.limb, mClaw, { toe: 0.85, r: 0.18, spread: 0.42, claw: 0.34 }); group.add(foot);
    return { s, loft, foot };
  });
  // braços mais longos que os do T-rex, com três garras
  const arms = [-1, 1].map(s => {
    const loft = new Loft(24, 12, skin.limb); group.add(loft.mesh);
    const claws = [0, 1, 2].map(() => { const c = spike(0.26, 0.05, mClaw); group.add(c); return c; });
    return { s, loft, claws };
  });

  const q = new THREE.Quaternion(), eu = new THREE.Euler(), X = V3(1, 0, 0), Zs = V3();
  function update(t) {
    // boca: abre um pouco duas vezes por laço
    const bite = Math.pow(Math.max(0, cyc(t, 2, 0.08)), 2);
    // raiz (quadril): o corpo desloca de leve, sem sair do lugar
    eu.set(0.02 * cyc(t, 1, 0.6), 0.05 * cyc(t, 1, 0.45), 0.015 * cyc(t, 2, 0.2), 'YZX');
    const rootQ = q.setFromEuler(eu).clone();
    const rootOff = V3(0.1 * cyc(t, 1, 0.3), 0.04 * cyc(t, 2, 0.55), 0.06 * cyc(t, 1, 0.05));
    const bend = i => {
      if (i < HIP) { const d = HIP - i; return { yaw: 0.085 * cyc(t, 1, -0.07 * d) + 0.02 * cyc(t, 2, -0.12 * d), pitch: 0.012 * cyc(t, 2, 0.3 - 0.1 * d) }; }
      const n = i - HIP;
      if (n <= 3) return { yaw: 0.015 * cyc(t, 1, 0.2), pitch: 0.008 * cyc(t, 2, 0.4) };
      return { yaw: 0.07 * cyc(t, 1, 0.1 + 0.04 * n), pitch: 0.02 * cyc(t, 2, 0.15) - 0.015 * bite };
    };
    const ctrl = fkSpine(REST, HIP, bend, rootQ, rootOff);
    const br = 1 + 0.025 * cyc(t, 2, 0.1);          // respiração no tronco
    for (const i of [7, 8]) { ctrl[i].w *= br; ctrl[i].hb *= br; }
    Zs.set(0, 0, 1).applyQuaternion(rootQ);
    const sm = body.setCtrl(ctrl, Zs);

    // cabeça presa no fim do pescoço, olhando para a frente e virando de um lado para o outro
    const fr = body.at(1);
    setBasis(head.group, fr.p, fr.T, fr.N, fr.B);
    eu.set(0.05 * cyc(t, 1, 0.35), 0.24 * cyc(t, 1, 0.12) + 0.05 * cyc(t, 3, 0.4), -1.06 + 0.05 * cyc(t, 2, 0.3) + 0.06 * bite, 'YZX');
    head.group.quaternion.multiply(q.setFromEuler(eu));
    head.setJaw(0.025 + 0.22 * bite);
    head.eyes.forEach((e, i) => e.userData.setPupil(...eyeJiggle(t, i + 3, 0.1 + 0.18 * bite)));

    // espinhos na linha das costas
    const uA = sm.uCtrl[HIP] - 0.035, uB = 0.985;
    for (const th of thorns) {
      const f = body.at(lerp(uA, uB, th.k));
      setBasis(th.m, f.p.clone().addScaledVector(f.N, f.ht * 0.94), f.T, f.N, f.B);
      th.m.rotateZ(0.32);                            // deitados para trás
    }

    // pernas: pés plantados, cada um dá um ajuste curto uma vez por laço
    const hf = body.at(sm.uCtrl[HIP]);
    for (const L of legs) {
      const lift = Math.pow(Math.max(0, cyc(t, 1, L.s > 0 ? 0.02 : 0.52)), 8);
      const H = hf.p.clone().addScaledVector(hf.B, L.s * 0.4).addScaledVector(hf.N, -0.2).addScaledVector(hf.T, 0.05);
      const F = V3(0.5 + (L.s > 0 ? 0.3 : -0.3) + 0.14 * lift, 0.14 + 0.3 * lift, L.s * 0.76);
      const ma = (60 - 14 * lift) * DEG;
      const A = F.clone().add(V3(-Math.cos(ma) * MT, Math.sin(ma) * MT, 0));
      const K = ik2(H, A, TH, SH, X);
      L.loft.setCtrl(bonePath([
        { p: H, w: 0.52, ht: 0.9, hb: 0.9, bulge: 0.04 }, { p: K, w: 0.34, ht: 0.35, hb: 0.37, bulge: 0.18 },
        { p: A, w: 0.17, ht: 0.17, hb: 0.19 }, { p: F, w: 0.2, ht: 0.18, hb: 0.17 },
      ], 1));
      L.foot.position.set(F.x, F.y - 0.02, F.z); L.foot.rotation.set(0, L.s * 0.1, -0.6 * lift);
    }

    // braços presos no peito, dobrados para a frente, balançando
    const af = body.at(sm.uCtrl[9] - 0.015);
    for (const a of arms) {
      const loc = (dx, dy, dz) => af.p.clone().addScaledVector(af.T, dx).addScaledVector(af.N, dy).addScaledVector(af.B, a.s * dz);
      const sw = 0.09 * cyc(t, 2, a.s > 0 ? 0.1 : 0.4) + 0.05 * cyc(t, 1, 0.2);
      const S = loc(0.0, -0.58, 0.5), E = loc(-0.42, -1.08, 0.6), Wp = loc(0.02 + sw, -1.5 - sw * 0.4, 0.55);
      a.loft.setCtrl(bonePath([{ p: S, w: 0.17, ht: 0.19, hb: 0.19, bulge: 0.1 }, { p: E, w: 0.12, ht: 0.12, hb: 0.12 }, { p: Wp, w: 0.09, ht: 0.09, hb: 0.09 }], 1), af.B);
      a.claws.forEach((c, i) => { c.position.copy(Wp).addScaledVector(af.B, a.s * (i - 1) * 0.07); c.rotation.set(0, (i - 1) * -0.25, PI / 2 - 0.95 + sw); });
    }
  }
  shadows(group);
  update(0);
  return { group, update, name: 'alossauro', view: { size: 4.7, center: [0, 3.2, 0] } };
}
