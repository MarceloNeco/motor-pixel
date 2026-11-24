// Paquicefalossauro: bípede empinado, azul-ardósia com barriga creme, pernas puxando para o marrom e a cúpula óssea na cabeça.
// Vira o corpo de um lado para o outro com a cauda varrendo largo, dá passinhos e, uma vez por laço, abaixa a cúpula e dá uma cabeçada.
// Eixos do dinossauro: +x para a frente (focinho), +y para cima, ±z os lados. O chão é y = 0 e a origem fica embaixo do quadril.
import * as THREE from 'three';
import { C, V3, DEG, PI, TAU, LOOP, Loft, fkSpine, ik2, bonePath, makeSkin, buildHead, clawFoot, spike, blob, setBasis, eyeJiggle, canvasTex, mulberry32, cyc, env, frac, smooth, clamp, lerp, shadows } from '../lib.js';

export function build() {
  const blotch = { dark: '#3a4052', light: '#8791aa', n: 340 };
  const skin = makeSkin({
    seed: 23, back: '#454b5e', flank: '#5b6278', belly: '#c9b9a6', limbTop: '#5b6278', limbEnd: '#8a6a55',
    stripe: { color: '#32384a', n: 16, u0: 0.04, u1: 0.8, reach: 0.3, width: 14, alpha: 0.34, limb: false }, blotch,
  });
  // pernas: começam no azul do flanco e esquentam para o marrom até o pé
  const legSkin = makeSkin({ seed: 24, back: '#454b5e', flank: '#7f6a62', belly: '#c9b9a6', limbTop: '#5b6278', limbEnd: '#93694c', blotch });
  const footSkin = makeSkin({ seed: 25, back: '#7d5840', flank: '#8f6850', belly: '#c9b9a6', limbTop: '#93694c', limbEnd: '#7d5840', blotch: { n: 0 }, wrinkles: 0 });
  const rL = mulberry32(57);
  legSkin.limb.map = canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    for (const [u, c] of [[0, '#5b6278'], [0.3, '#5d6377'], [0.48, '#786a6c'], [0.66, '#93694c'], [1, '#8a6046']]) gr.addColorStop(u, c);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      g.fillStyle = rL() < 0.55 ? `rgba(40,36,48,${0.05 + rL() * 0.09})` : `rgba(235,215,190,${0.05 + rL() * 0.08})`;
      g.beginPath(); g.ellipse(rL() * w, rL() * h, 8 + rL() * 26, 5 + rL() * 14, rL() * PI, 0, TAU); g.fill();
    }
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = rL() < 0.6 ? `rgba(0,0,0,${0.04 + rL() * 0.1})` : `rgba(255,240,215,${0.03 + rL() * 0.07})`;
      g.beginPath(); g.arc(rL() * w, rL() * h, 0.8 + rL() * 2.4, 0, TAU); g.fill();
    }
  });
  const mClaw = skin.flat('#2a2422', 0.45);
  const group = new THREE.Group();

  // espinha em repouso, da ponta da cauda (que desce até perto do chão) à nuca: C(x, y, meia-largura, altura acima, altura abaixo)
  const REST = [
    C(-6.0, 0.5, 0.004, 0.004), C(-5.0, 0.64, 0.13, 0.13, 0.13), C(-4.0, 1.0, 0.23, 0.24, 0.23), C(-3.0, 1.6, 0.36, 0.38, 0.37),
    C(-2.0, 2.27, 0.52, 0.56, 0.56), C(-1.0, 2.9, 0.68, 0.76, 0.80),
    C(0.0, 3.35, 0.80, 0.92, 1.06),                                        // 6 = quadril
    C(0.8, 3.78, 0.90, 0.98, 1.20), C(1.52, 4.33, 0.84, 0.92, 1.12), C(2.08, 4.95, 0.66, 0.74, 0.86),
    C(2.4, 5.5, 0.50, 0.54, 0.60), C(2.6, 5.98, 0.43, 0.45, 0.48),
  ];
  const HIP = 6;
  const body = new Loft(76, 26, skin.body, { u0: 0, u1: 0.88 }); group.add(body.mesh);

  // cabeça curta com focinho em bico; origem na nuca, +x para o focinho
  const head = buildHead({
    seed: 9, u0: 0.88, mouth: '#6b2a2e', tongue: '#c9777c',
    skull: [
      C(-0.45, 0.02, 0.04, 0.04), C(-0.2, 0.05, 0.38, 0.42, 0.36), C(0.15, 0.05, 0.50, 0.56, 0.30), C(0.5, 0.02, 0.50, 0.52, 0.16),
      C(0.8, -0.02, 0.42, 0.42, 0.10), C(1.05, -0.05, 0.33, 0.32, 0.09), C(1.25, -0.08, 0.23, 0.22, 0.08), C(1.38, -0.1, 0.004, 0.004, 0.004),
    ],
    hinge: [0.05, -0.12],
    jaw: [
      C(-0.2, -0.04, 0.03, 0.02, 0.03), C(0.0, -0.04, 0.38, 0.06, 0.32), C(0.4, -0.05, 0.42, 0.05, 0.33), C(0.75, -0.05, 0.35, 0.05, 0.25),
      C(1.0, -0.04, 0.27, 0.04, 0.17), C(1.16, -0.02, 0.17, 0.04, 0.11), C(1.27, 0.0, 0.004, 0.004, 0.004),
    ],
    eye: { x: 0.56, y: 0.15, r: 0.21, out: 0.02, fwd: 0.28, up: 0.2 },
  }, skin);
  group.add(head.group);
  head.group.scale.setScalar(1.2);
  const mPupil = new THREE.MeshStandardMaterial({ color: '#070709', roughness: 0.85 });
  head.eyes.forEach(e => { e.children[2].material = mPupil; });

  // cúpula óssea: esfera achatada, lisa e rosada-acinzentada, com manchas pintadas (para não ficar com cara de argila)
  const rD = mulberry32(41);
  const domeTex = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#bfb1b3'); gr.addColorStop(0.3, '#b1a3a8'); gr.addColorStop(0.5, '#968b97'); gr.addColorStop(0.62, '#6c6e83'); gr.addColorStop(1, '#5b6278');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = rD() < 0.5 ? `rgba(120,96,104,${0.05 + rD() * 0.1})` : `rgba(240,226,220,${0.05 + rD() * 0.1})`;
      g.beginPath(); g.ellipse(rD() * w, rD() * h, 6 + rD() * 22, 4 + rD() * 12, rD() * PI, 0, TAU); g.fill();
    }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(70,52,60,${0.05 + rD() * 0.12})`; g.beginPath(); g.arc(rD() * w, rD() * h, 0.6 + rD() * 1.6, 0, TAU); g.fill(); }
  });
  const mDome = new THREE.MeshStandardMaterial({ map: domeTex, roughness: 0.5 });
  const mKnob = new THREE.MeshStandardMaterial({ color: '#9d8a86', roughness: 0.6 });
  const DC = V3(0.14, 0.4, 0), DR = [0.62, 0.5, 0.49];
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), mDome); dome.scale.set(...DR); dome.position.copy(DC); dome.rotation.z = -0.12; head.group.add(dome);
  // colar de nódulos e espinhos na parte de trás da cúpula (duas fileiras) e alguns no focinho
  const down = V3(0, -1, 0);
  const knob = (p, dir, len, rad) => { const k = spike(len, rad, mKnob, 7); k.position.copy(p); k.quaternion.setFromUnitVectors(down, dir.clone().normalize()); head.group.add(k); };
  for (let row = 0; row < 2; row++) {
    const n = row ? 7 : 9;
    for (let i = 0; i < n; i++) {
      const a = lerp(105, 255, i / (n - 1)) * DEG, el = row ? 0.16 : -0.14;
      const dir = V3(Math.cos(a), el, Math.sin(a)), big = 1 - Math.abs(i / (n - 1) - 0.5) * 0.9;
      const p = V3(DC.x + DR[0] * 0.93 * dir.x, DC.y - 0.2 + DR[1] * el * 1.4, DR[2] * 0.96 * dir.z);
      knob(p, V3(dir.x, 0.35 + row * 0.4, dir.z), (row ? 0.13 : 0.2) * (0.6 + 0.6 * big), (row ? 0.05 : 0.07) * (0.7 + 0.4 * big));
    }
  }
  for (const [x, y, z, r] of [[0.9, 0.32, 0.12, 0.05], [0.9, 0.32, -0.12, 0.05], [1.06, 0.24, 0.0, 0.055], [1.17, 0.14, 0.09, 0.04], [1.17, 0.14, -0.09, 0.04], [0.8, 0.3, 0.3, 0.045], [0.8, 0.3, -0.3, 0.045]]) {
    const b = blob(r, r * 0.9, r, mKnob); b.position.set(x, y, z); head.group.add(b);
  }

  // pernas robustas (coxa, canela, metatarso) e pés de três dedos
  const TH = 1.3, SH = 1.32, MT = 0.9;
  const legs = [-1, 1].map(s => {
    const loft = new Loft(52, 18, legSkin.limb); group.add(loft.mesh);
    const foot = clawFoot(footSkin.limb, mClaw, { toe: 0.9, r: 0.2, spread: 0.5, claw: 0.32 }); group.add(foot);
    return { s, loft, foot };
  });
  // bracinhos
  const arms = [-1, 1].map(s => {
    const loft = new Loft(18, 10, skin.limb); group.add(loft.mesh);
    const claws = [0, 1, 2].map(() => { const c = spike(0.14, 0.032, mClaw); group.add(c); return c; });
    return { s, loft, claws };
  });

  const YAW = 13 * DEG, PH0 = -0.1;          // guinada do corpo: ±13°, cruzando o centro na hora da cabeçada
  // passo de um pé: duas vezes por laço ele sai do chão e gira para acompanhar a guinada do corpo (ang vai de -1 a +1 e volta)
  const stepOf = (t, p) => {
    const f = frac(t / LOOP - p), half = f < 0.5 ? 0 : 1, k = clamp(((f - half * 0.5) / 0.5) / 0.3);
    return { ang: (half ? -1 : 1) * lerp(-1, 1, smooth(k)), lift: Math.sin(PI * k) };
  };
  const rotY = (v, a) => { const c = Math.cos(a), s = Math.sin(a), x = v.x * c + v.z * s; v.z = -v.x * s + v.z * c; v.x = x; return v; };

  const q = new THREE.Quaternion(), eu = new THREE.Euler(), Zs = V3();
  function update(t) {
    const W = env(t, 0.40, 0.585, 0.12, 0.03);     // prepara: recua e encolhe o pescoço
    const S = env(t, 0.565, 0.84, 0.045, 0.16);    // cabeçada: tranco rápido para a frente (aos 2,3 s), volta devagar
    const E = env(t, 0.572, 0.9, 0.02, 0.26);      // chacoalhão das pupilas depois do tranco
    const calm = 1 - S;
    const yaw = YAW * cyc(t, 1, PH0) * (1 - 0.35 * S);
    // raiz (quadril): guinada, um pouco de rolagem e a inclinação da cabeçada
    eu.set(0.03 * cyc(t, 2, 0.15), yaw, 0.035 * W - 0.3 * S + 0.012 * cyc(t, 2, 0.4), 'YZX');
    const rootQ = q.setFromEuler(eu).clone();
    const rootOff = rotY(V3(-0.22 * W + 0.8 * S, 0.04 * cyc(t, 2, 0.55) - 0.1 * W - 0.06 * S, 0), yaw);
    const bend = i => {
      if (i < HIP) { const d = HIP - i; return { yaw: 0.085 * cyc(t, 1, PH0 - 0.05 * d) + 0.03 * cyc(t, 2, -0.12 * d), pitch: 0.012 * cyc(t, 2, 0.2 - 0.1 * d) + 0.012 * W + 0.02 * S }; }
      const n = i - HIP;
      if (n <= 2) return { yaw: 0.02 * cyc(t, 1, PH0 + 0.1), pitch: 0.01 * cyc(t, 2, 0.1) - 0.03 * S };
      return { yaw: 0.05 * cyc(t, 1, PH0 + 0.2 + 0.04 * n) * calm, pitch: 0.015 * cyc(t, 2, 0.3) - 0.08 * W - 0.2 * S };
    };
    const ctrl = fkSpine(REST, HIP, bend, rootQ, rootOff);
    const br = 1 + 0.025 * cyc(t, 2, 0.1);          // respiração no tronco
    for (const i of [7, 8]) { ctrl[i].w *= br; ctrl[i].hb *= br; }
    Zs.set(0, 0, 1).applyQuaternion(rootQ);
    const sm = body.setCtrl(ctrl, Zs);

    // cabeça presa no fim do pescoço, olhando um pouco para baixo; na cabeçada o focinho desce e a cúpula vai na frente
    const fr = body.at(1);
    setBasis(head.group, fr.p, fr.T, fr.N, fr.B);
    eu.set(0.06 * cyc(t, 1, 0.35) * calm, 0.22 * cyc(t, 1, PH0 + 0.3) * calm + 0.06 * cyc(t, 3, 0.1) * calm, -1.3 + 0.05 * cyc(t, 2, 0.1) - 0.1 * S + 0.05 * E * cyc(t, 6), 'YZX');
    head.group.quaternion.multiply(q.setFromEuler(eu));
    head.setJaw(0.05 + 0.03 * cyc(t, 2, 0.3) + 0.3 * env(t, 0.66, 0.9, 0.05, 0.12));
    head.eyes.forEach((e, i) => e.userData.setPupil(...eyeJiggle(t, i + 1, 0.12 + 0.88 * E)));

    // pernas: passinhos alternados; o pé plantado não escorrega, só gira quando sai do chão
    const hf = body.at(sm.uCtrl[HIP]);
    for (const L of legs) {
      const st = stepOf(t, L.s > 0 ? -0.2 - PH0 : 0.05 - PH0), th = st.ang * 0.57 * YAW;
      const fwd = rotY(V3(1, 0, 0), th);
      const H = hf.p.clone().addScaledVector(hf.B, L.s * 0.44).addScaledVector(hf.N, -0.22);
      const F = rotY(V3(0.32, 0, L.s * 0.78), th).addScaledVector(fwd, 0.1 * st.lift); F.y = 0.15 + 0.4 * st.lift;
      const ma = (68 - 18 * st.lift) * DEG;
      const A = F.clone().addScaledVector(fwd, -Math.cos(ma) * MT); A.y += Math.sin(ma) * MT;
      const K = ik2(H, A, TH, SH, fwd);
      L.loft.setCtrl(bonePath([
        { p: H, w: 0.58, ht: 0.82, hb: 0.86, bulge: 0.06 }, { p: K, w: 0.38, ht: 0.38, hb: 0.4, bulge: 0.18 },
        { p: A, w: 0.2, ht: 0.2, hb: 0.22 }, { p: F, w: 0.23, ht: 0.2, hb: 0.19 },
      ], 1));
      L.foot.position.set(F.x, F.y - 0.02, F.z); L.foot.rotation.order = 'YZX'; L.foot.rotation.set(0, th + L.s * 0.1, -0.7 * st.lift);
    }
    // bracinhos presos no peito, pendurados para a frente
    const af = body.at(sm.uCtrl[9] - 0.01);
    for (const a of arms) {
      const wl = (dx, dy, dz) => V3(dx, dy, a.s * dz).applyQuaternion(rootQ);
      const sw = 0.07 * cyc(t, 2, a.s > 0 ? 0.1 : 0.45) + 0.18 * S - 0.08 * W;
      const Sh = af.p.clone().addScaledVector(af.B, a.s * 0.52).addScaledVector(af.N, -0.52).addScaledVector(af.T, -0.1);
      const El = Sh.clone().add(wl(0.12, -0.6, 0.1)), Wp = El.clone().add(wl(0.5, -0.2 + sw, -0.04));
      a.loft.setCtrl(bonePath([{ p: Sh, w: 0.15, ht: 0.16, hb: 0.16 }, { p: El, w: 0.11, ht: 0.11, hb: 0.11 }, { p: Wp, w: 0.08, ht: 0.08, hb: 0.08 }], 1), Zs);
      a.claws.forEach((c, i) => { c.position.copy(Wp).add(wl(0.03, 0, (i - 1) * 0.055)); c.quaternion.copy(rootQ); c.rotateZ(PI / 2 - 0.75); });
    }
  }
  shadows(group);
  update(0);
  return { group, update, name: 'paquicefalossauro', view: { size: 4.4, center: [-0.7, 3.1, 0] } };
}
