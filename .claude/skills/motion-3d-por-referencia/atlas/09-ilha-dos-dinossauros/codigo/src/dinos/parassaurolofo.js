// Parassaurolofo: hadrossauro grande, azul-ardósia com listras, bico de pato e a crista longa e curva para trás.
// Fica quase parado, em quatro patas: respira, balança pescoço e cauda devagar, troca o apoio e, uma vez por laço, levanta a cabeça e berra.
// Eixos do dinossauro: +x para a frente (bico), +y para cima, ±z os lados. O chão é y = 0.
import * as THREE from 'three';
import { C, V3, DEG, TAU, Loft, fkSpine, ik2, bonePath, makeSkin, buildHead, roundFoot, blob, canvasTex, mulberry32, setBasis, eyeJiggle, cyc, env, shadows } from '../lib.js';

// pé de trás de hadrossauro: três dedos curtos e rombudos com casco, sem garra pontuda. Origem na base dos dedos, +x para a frente.
function hoofFoot(padMat, nailMat, { toe = 0.7, r = 0.24, spread = 0.5 } = {}) {
  const g = new THREE.Group();
  [-spread, 0, spread].forEach((a, i) => {
    const t = new THREE.Group(); t.rotation.y = a; g.add(t);
    const L = toe * (i === 1 ? 1.1 : 0.9);
    const pad = blob(L * 0.56, r, r * 1.05, padMat); pad.position.set(L * 0.42, 0, 0); t.add(pad);
    const nail = blob(r * 0.5, r * 0.62, r * 0.82, nailMat); nail.position.set(L * 0.9, -r * 0.22, 0); t.add(nail);
  });
  return g;
}
// pele das pernas: mesma cor do flanco, com listras finas e irregulares (as faixas largas da lib deixavam a perna "em gomos")
function limbSkin(base, o) {
  const r = mulberry32(41), m = base.clone();
  m.map = canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, o.flank); gr.addColorStop(0.6, o.flank); gr.addColorStop(1, o.limbEnd);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.save(); g.filter = 'blur(3px)';
    for (let k = 0; k < 9; k++) {
      const x = (k + 0.5 + (r() - 0.5) * 0.6) / 9 * w, wd = 5 + r() * 7, ph = r() * TAU;
      g.fillStyle = `rgba(28,40,50,${0.28 + r() * 0.22})`; g.beginPath();
      for (let y = -8; y <= h + 8; y += 8) { const xx = x + 7 * Math.sin(y * 0.05 + ph); y < 0 ? g.moveTo(xx - wd, y) : g.lineTo(xx - wd, y); }
      for (let y = h + 8; y >= -8; y -= 8) g.lineTo(x + 7 * Math.sin(y * 0.05 + ph) + wd, y);
      g.closePath(); g.fill();
    }
    g.restore();
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = r() < 0.6 ? `rgba(0,0,0,${0.04 + r() * 0.1})` : `rgba(230,240,250,${0.03 + r() * 0.07})`;
      g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 2.4, 0, TAU); g.fill();
    }
  });
  return m;
}

export function build() {
  const skin = makeSkin({
    seed: 23, back: '#33414d', flank: '#4b5f6f', belly: '#93a3a8',
    stops: [[0, 'back'], [0.1, 'back'], [0.24, 'flank'], [0.36, 'flank'], [0.45, 'belly'], [0.5, 'belly']],
    stripe: { color: '#1e2a34', n: 19, u0: 0.07, u1: 0.9, reach: 0.42, width: 19, alpha: 0.5, blur: 8, limbN: 5 },
    blotch: { dark: '#27333d', light: '#6f8797', n: 200 },
    limbEnd: '#3f505d',
    // bico: a ponta do focinho escurece para um tom de chifre
    paint: (g, W, H) => {
      const gr = g.createLinearGradient(0.948 * W, 0, 0.99 * W, 0);
      gr.addColorStop(0, 'rgba(34,40,48,0)'); gr.addColorStop(1, 'rgba(34,40,48,0.88)');
      g.fillStyle = gr; g.fillRect(0.948 * W, 0, 0.052 * W, H);
    },
  });
  const mNail = skin.flat('#2b3138', 0.5);
  const mLimb = limbSkin(skin.limb, skin.o);
  const mToe = skin.limb.clone(); mToe.map = null; mToe.color.set('#43535f');
  const mCrest = mLimb.clone(); mCrest.color.set('#8793a0');       // a crista usa a pele listrada das pernas, escurecida
  const group = new THREE.Group();

  // espinha em repouso, da ponta da cauda à nuca: C(x, y, meia-largura, altura acima, altura abaixo)
  const REST = [
    C(-5.3, 4.3, 0.004, 0.005), C(-4.4, 4.13, 0.18, 0.34, 0.3), C(-3.5, 4.04, 0.34, 0.58, 0.52), C(-2.7, 4.01, 0.52, 0.78, 0.74),
    C(-1.95, 4.0, 0.72, 0.92, 0.98),
    C(-1.2, 3.97, 0.92, 1.08, 1.28),                                       // 5 = quadril (ponto mais alto do dorso)
    C(-0.2, 3.85, 1.18, 1.14, 1.6), C(0.8, 3.7, 1.16, 1.06, 1.6), C(1.7, 3.58, 0.98, 0.92, 1.42),   // 8 = ombros
    C(2.4, 3.5, 0.76, 0.74, 1.02), C(2.95, 3.5, 0.64, 0.62, 0.8), C(3.4, 3.62, 0.56, 0.52, 0.62), C(3.75, 3.85, 0.5, 0.46, 0.52),
  ];
  const HIP = 5, SHO = 8;
  const body = new Loft(84, 28, skin.body, { u0: 0, u1: 0.86 }); group.add(body.mesh);

  // cabeça: origem na nuca, +x para o bico. Crânio baixo e comprido que alarga e achata na ponta (bico de pato), sem dentes
  const head = buildHead({
    seed: 9, u0: 0.86, mouth: '#7a3238', tongue: '#cf7d84',
    skull: [
      C(-0.5, 0.0, 0.04, 0.04), C(-0.22, 0.02, 0.4, 0.46, 0.4), C(0.15, 0.02, 0.46, 0.55, 0.32), C(0.55, 0.0, 0.43, 0.5, 0.17),
      C(0.95, -0.03, 0.36, 0.41, 0.1), C(1.3, -0.06, 0.33, 0.33, 0.09, 0.85), C(1.6, -0.09, 0.38, 0.27, 0.08, 0.75), C(1.82, -0.11, 0.38, 0.22, 0.08, 0.75), C(1.94, -0.12, 0.3, 0.15, 0.07, 0.8), C(2.0, -0.12, 0.004, 0.004, 0.003),
    ],
    hinge: [0.1, -0.12],
    jaw: [
      C(-0.25, -0.04, 0.03, 0.03, 0.03), C(0.0, -0.04, 0.38, 0.06, 0.32), C(0.45, -0.045, 0.38, 0.05, 0.32), C(0.9, -0.05, 0.31, 0.05, 0.26),
      C(1.3, -0.06, 0.3, 0.04, 0.2, 0.8), C(1.56, -0.07, 0.33, 0.04, 0.15, 0.75), C(1.7, -0.075, 0.26, 0.04, 0.1, 0.8), C(1.76, -0.075, 0.004, 0.003, 0.003),
    ],
    eye: { x: 0.42, y: 0.2, r: 0.23, out: 0.02, fwd: 0.22, up: 0.12 },
  }, skin);
  group.add(head.group);
  head.group.scale.setScalar(1.36);
  // a placa do céu da boca e o assoalho da lib sobram para fora da boca fechada (linha vermelha): estreita as duas
  const pal = head.group.children.find(o => o.isMesh && o !== head.skull.mesh); if (pal) { pal.scale.set(0.93, 1, 0.78); pal.position.y += 0.035; }
  const flo = head.jaw.children[1]; if (flo && flo.isMesh) { flo.scale.set(0.92, 1, 0.66); flo.position.y -= 0.035; }
  // crista: tubo curvo que nasce no alto do focinho e segue para trás e para cima, afinando (pontos da ponta para a base)
  const crest = new Loft(34, 16, mCrest);
  crest.setCtrl([
    C(-2.02, 1.13, 0.004, 0.004), C(-1.8, 1.14, 0.13, 0.15), C(-1.35, 1.08, 0.18, 0.21), C(-0.85, 0.94, 0.21, 0.24),
    C(-0.35, 0.76, 0.24, 0.26), C(0.2, 0.56, 0.26, 0.26), C(0.7, 0.34, 0.24, 0.2), C(1.15, 0.1, 0.14, 0.1),
  ]);
  head.group.add(crest.mesh);

  // pernas de trás (coxa, canela, metatarso) com três dedos curtos; da frente (braço, antebraço) com pé pequeno arredondado
  const TH = 1.48, SH = 1.48, MT = 0.78, UA = 1.42, FA = 1.46;
  const hind = [-1, 1].map(s => {
    const loft = new Loft(52, 18, mLimb); group.add(loft.mesh);
    const foot = hoofFoot(mToe, mNail, { toe: 0.72, r: 0.25, spread: 0.5 }); group.add(foot);
    return { s, loft, foot };
  });
  const fore = [-1, 1].map(s => {
    const loft = new Loft(44, 16, mLimb); group.add(loft.mesh);
    const foot = roundFoot(mToe, mNail, { r: 0.28, h: 0.3, nails: 3 }); group.add(foot);
    return { s, loft, foot };
  });

  const q = new THREE.Quaternion(), eu = new THREE.Euler(), X = V3(1, 0, 0), Xn = V3(-1, 0, 0), Zs = V3();
  const HX = REST[HIP].p.x, SX = REST[SHO].p.x;
  function update(t) {
    const B = env(t, 0.5, 0.84, 0.1, 0.14);      // berro: sobe aos 2 s, desce aos 3,4 s
    const calm = 1 - B;
    // raiz (quadril): balanço lento de lado a lado e um nada de subida no berro
    eu.set(0.014 * cyc(t, 1, 0.25), 0.018 * cyc(t, 1, 0.1), 0.03 * B, 'YZX');
    const rootQ = q.setFromEuler(eu).clone();
    const rootOff = V3(0.04 * cyc(t, 1, 0.3), 0.03 * cyc(t, 2, 0.6), 0.07 * cyc(t, 1, 0));
    const bend = i => {
      if (i < HIP) { const d = HIP - i; return { yaw: 0.045 * cyc(t, 1, -0.09 * d) + 0.014 * cyc(t, 2, -0.14 * d), pitch: 0.012 * cyc(t, 2, 0.2 - 0.1 * d) + 0.012 * B }; }
      const n = i - HIP;
      if (n <= 3) return { yaw: 0.008 * cyc(t, 1, 0.1), pitch: 0.012 * B };
      return { yaw: calm * 0.05 * cyc(t, 1, 0.15 + 0.04 * n) + B * 0.012 * cyc(t, 3, 0.1 * n), pitch: 0.02 * cyc(t, 1, 0.55) * calm + 0.04 * B };
    };
    const ctrl = fkSpine(REST, HIP, bend, rootQ, rootOff);
    const br = 1 + 0.022 * cyc(t, 2, 0.1) + 0.03 * B;    // respiração no tronco
    for (const i of [6, 7]) { ctrl[i].w *= br; ctrl[i].hb *= br; }
    Zs.set(0, 0, 1).applyQuaternion(rootQ);
    const sm = body.setCtrl(ctrl, Zs);

    // cabeça presa no fim do pescoço: no berro ela sobe e o bico abre tremendo
    const fr = body.at(1);
    setBasis(head.group, fr.p, fr.T, fr.N, fr.B);
    eu.set(0.04 * cyc(t, 1, 0.4) * calm, 0.1 * cyc(t, 1, 0.3) * calm + 0.03 * B * cyc(t, 3), -0.8 + 0.15 * B + 0.025 * cyc(t, 2, 0.2) + 0.012 * B * cyc(t, 10), 'YZX');
    head.group.quaternion.multiply(q.setFromEuler(eu));
    head.setJaw(0.012 + 0.012 * cyc(t, 2, 0.2) * calm + 0.56 * B + 0.035 * B * cyc(t, 10));
    head.eyes.forEach((e, i) => e.userData.setPupil(...eyeJiggle(t, i + 1, 0.08 + 0.85 * B)));

    // pernas de trás: plantadas; cada uma alivia o apoio uma vez por laço
    const hf = body.at(sm.uCtrl[HIP]);
    for (const L of hind) {
      const lift = L.s > 0 ? env(t, 0.04, 0.24, 0.08) : env(t, 0.28, 0.48, 0.08);
      const H = hf.p.clone().addScaledVector(hf.B, L.s * 0.32).addScaledVector(hf.N, -0.1);
      const F = V3(HX + 0.3 + 0.1 * lift, 0.25 + 0.2 * lift, L.s * 0.9);
      const ma = (80 - 12 * lift) * DEG;
      const A = F.clone().add(V3(-Math.cos(ma) * MT, Math.sin(ma) * MT, 0));
      const K = ik2(H, A, TH, SH, X);
      L.loft.setCtrl(bonePath([
        { p: H, w: 0.52, ht: 0.84, hb: 0.86, bulge: 0.08 }, { p: K, w: 0.47, ht: 0.48, hb: 0.5, bulge: 0.06 },
        { p: A, w: 0.3, ht: 0.3, hb: 0.32 }, { p: F, w: 0.3, ht: 0.27, hb: 0.25 },
      ], 1));
      L.foot.position.set(F.x, F.y, F.z); L.foot.rotation.set(0, L.s * 0.1, -0.4 * lift);
    }
    // pernas da frente: mais finas e curtas, cotovelo para trás
    const sf = body.at(sm.uCtrl[SHO]);
    for (const L of fore) {
      const lift = L.s < 0 ? env(t, 0.06, 0.26, 0.08) : env(t, 0.3, 0.5, 0.08);
      const S = sf.p.clone().addScaledVector(sf.B, L.s * 0.22).addScaledVector(sf.N, -0.5);
      const F = V3(SX + 0.2 + 0.08 * lift, 0.18 * lift, L.s * 0.74);
      const Wr = V3(F.x - 0.06, F.y + 0.38, F.z);
      const E = ik2(S, Wr, UA, FA, Xn);
      L.loft.setCtrl(bonePath([
        { p: S, w: 0.3, ht: 0.48, hb: 0.5, bulge: 0.1 }, { p: E, w: 0.31, ht: 0.32, hb: 0.34, bulge: 0.04 },
        { p: Wr, w: 0.24, ht: 0.24, hb: 0.25 }, { p: V3(F.x, F.y + 0.14, F.z), w: 0.26, ht: 0.26, hb: 0.26 },
      ], 1));
      L.foot.position.copy(F); L.foot.rotation.set(0, -L.s * 0.12, 0);
    }
  }
  shadows(group);
  update(0);
  return { group, update, name: 'parassaurolofo', view: { size: 4.7, center: [0.0, 2.9, 0] } };
}
