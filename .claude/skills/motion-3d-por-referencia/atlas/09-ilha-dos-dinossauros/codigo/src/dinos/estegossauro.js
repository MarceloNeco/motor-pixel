// Estegossauro: quadrúpede atarracado, verde-oliva, costas em arco com duas fileiras alternadas de placas e
// quatro espinhos na ponta da cauda. Anda no lugar devagar, a cauda sobe e varre, a cabeça baixa mastiga.
// Eixos do dinossauro: +x para a frente (focinho), +y para cima, ±z os lados. O chão é y = 0.
import * as THREE from 'three';
import { C, V3, DEG, PI, TAU, LOOP, Loft, fkSpine, ik2, bonePath, makeSkin, buildHead, roundFoot, spike, setBasis, onSurface, canvasTex, eyeJiggle, cyc, env, mulberry32, shadows } from '../lib.js';

export function build() {
  const skin = makeSkin({
    seed: 23, back: '#55543a', flank: '#827a50', belly: '#a89c74',
    blotch: { dark: '#35341f', light: '#a59c6c', n: 360 }, wrinkles: 620,
    stripe: { color: '#2f2e1c', n: 22, u0: 0.04, u1: 0.84, reach: 0.2, width: 22, alpha: 0.3, blur: 9, limb: false },
    limbTop: '#6a6643', limbEnd: '#8a8158',
    // bico córneo: a ponta do focinho (fim da faixa de textura da cabeça) fica escura e amarelada
    paint: (g, W, H) => { const gr = g.createLinearGradient(W * 0.955, 0, W, 0); gr.addColorStop(0, 'rgba(70,58,34,0)'); gr.addColorStop(0.5, 'rgba(70,58,34,0.7)'); gr.addColorStop(1, 'rgba(50,40,26,0.85)'); g.fillStyle = gr; g.fillRect(W * 0.955, 0, W * 0.045, H); },
  });
  const mNail = skin.flat('#2c281d', 0.5), mSpike = skin.flat('#d8cdb0', 0.5);
  // pele das pernas pintada aqui: mais escura que a padrão, com manchas e dobras em volta (u corre do alto da perna ao pé)
  const rL = mulberry32(57);
  const limbTex = canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#59573a'); gr.addColorStop(0.5, '#6b6744'); gr.addColorStop(1, '#79734e');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = rL() < 0.55 ? `rgba(40,40,22,${0.06 + rL() * 0.12})` : `rgba(170,160,110,${0.05 + rL() * 0.1})`;
      g.beginPath(); g.ellipse(rL() * w, rL() * h, 10 + rL() * 40, 6 + rL() * 18, rL() * PI, 0, TAU); g.fill();
    }
    for (let i = 0; i < 70; i++) {
      const x = rL() * w, y = rL() * h; g.strokeStyle = `rgba(25,25,12,${0.08 + rL() * 0.14})`; g.lineWidth = 1 + rL() * 2;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (rL() - 0.5) * 12, y + 30, x + (rL() - 0.5) * 10, y + 40 + rL() * 50); g.stroke();
    }
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = rL() < 0.6 ? `rgba(0,0,0,${0.04 + rL() * 0.1})` : `rgba(255,240,205,${0.03 + rL() * 0.07})`;
      g.beginPath(); g.arc(rL() * w, rL() * h, 0.8 + rL() * 2.4, 0, TAU); g.fill();
    }
  });
  const mLeg = skin.limb.clone(); mLeg.map = limbTex;
  const group = new THREE.Group();

  // espinha em repouso, da ponta da cauda à nuca: o ponto mais alto das costas fica sobre o quadril
  const REST = [
    C(-5.5, 3.0, 0.03, 0.03), C(-4.7, 2.9, 0.17, 0.18, 0.17), C(-3.9, 2.88, 0.34, 0.36, 0.34), C(-3.1, 2.95, 0.56, 0.58, 0.58),
    C(-2.2, 3.05, 0.86, 0.82, 0.9),
    C(-1.3, 3.1, 1.2, 1.0, 1.3),                                           // 5 = quadril
    C(-0.3, 3.0, 1.42, 1.04, 1.5), C(0.7, 2.85, 1.36, 0.95, 1.4), C(1.6, 2.6, 1.08, 0.8, 1.1),      // 8 = ombros
    C(2.3, 2.4, 0.7, 0.58, 0.66), C(2.85, 2.3, 0.5, 0.44, 0.46), C(3.25, 2.25, 0.42, 0.36, 0.38),
  ];
  const HIP = 5, SHO = 8;
  const body = new Loft(80, 28, skin.body, { u0: 0, u1: 0.86 }); group.add(body.mesh);

  // cabeça pequena e comprida, com bico (sem dentes aparentes)
  const head = buildHead({
    seed: 9, u0: 0.86, mouth: '#3f2320', tongue: '#a9625f',
    skull: [
      C(-0.4, 0.0, 0.03, 0.03), C(-0.15, 0.02, 0.32, 0.36, 0.3), C(0.2, 0.03, 0.4, 0.44, 0.22), C(0.5, 0.01, 0.38, 0.4, 0.13),
      C(0.85, -0.03, 0.3, 0.3, 0.1), C(1.12, -0.07, 0.22, 0.22, 0.08), C(1.32, -0.11, 0.15, 0.15, 0.07), C(1.44, -0.14, 0.02, 0.02, 0.02),
    ],
    hinge: [0.12, -0.13],
    jaw: [
      C(-0.16, -0.03, 0.03, 0.02, 0.03), C(0.05, -0.03, 0.31, 0.05, 0.22), C(0.4, -0.04, 0.3, 0.04, 0.2), C(0.75, -0.04, 0.23, 0.04, 0.15),
      C(1.02, -0.03, 0.16, 0.03, 0.1), C(1.18, -0.02, 0.02, 0.02, 0.02),
    ],
    eye: { x: 0.28, y: 0.15, r: 0.21, out: 0.02, fwd: 0.22, up: 0.22 },
  }, skin);
  head.group.scale.setScalar(1.3);
  group.add(head.group);

  // placas: forma de pipa/folha num quadrado unitário (base em y = 0, ponta em y = 1), extrudada fina
  const rP = mulberry32(41);
  const plateTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#cfc19f'; g.fillRect(0, 0, w, h);
    const gr = g.createRadialGradient(w * 0.5, h * 0.6, 4, w * 0.5, h * 0.58, w * 0.6);
    gr.addColorStop(0, '#4c2f2b'); gr.addColorStop(0.42, '#6a4136'); gr.addColorStop(0.75, '#a48562'); gr.addColorStop(1, 'rgba(207,193,159,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const gb = g.createLinearGradient(0, h, 0, h * 0.62); gb.addColorStop(0, 'rgba(66,62,38,0.95)'); gb.addColorStop(1, 'rgba(66,62,38,0)');
    g.fillStyle = gb; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 54; i++) {   // estrias saindo da base
      const a = (rP() - 0.5) * 1.5;
      g.strokeStyle = `rgba(38,20,16,${0.07 + rP() * 0.15})`; g.lineWidth = 1 + rP() * 2.2;
      g.beginPath(); g.moveTo(w * 0.5 + (rP() - 0.5) * w * 0.22, h); g.lineTo(w * 0.5 + Math.sin(a) * w * 0.62, h - Math.cos(a) * h * (0.5 + rP() * 0.45)); g.stroke();
    }
  });
  const mPlate = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.78 });
  const sh = new THREE.Shape();
  sh.moveTo(0.33, 0); sh.quadraticCurveTo(0.0, 0.2, 0.05, 0.46); sh.quadraticCurveTo(0.2, 0.8, 0.5, 1.0);
  sh.quadraticCurveTo(0.8, 0.8, 0.95, 0.46); sh.quadraticCurveTo(1.0, 0.2, 0.67, 0); sh.closePath();
  const plateGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 10 });
  plateGeo.translate(-0.5, 0, -0.03);
  // 17 placas do pescoço à cauda, alternando os lados; as maiores ficam sobre o quadril
  const plates = [];
  const NP = 17;
  for (let k = 0; k < NP; k++) {
    const u = 0.955 - 0.74 * k / (NP - 1), side = k % 2 ? 1 : -1;
    const big = Math.exp(-Math.pow((u - 0.5) / 0.2, 2));
    const hgt = (0.5 + 1.45 * big) * (0.94 + rP() * 0.12) * (u > 0.86 ? 0.8 : 1), wid = hgt * (0.92 - 0.2 * big);
    const mesh = new THREE.Mesh(plateGeo, mPlate); mesh.scale.set(wid, hgt, 0.9 + 0.5 * big);
    group.add(mesh); plates.push({ u, side, mesh, sink: 0.12 * hgt });
  }
  // quatro espinhos claros na ponta da cauda (dois pares)
  const spikes = [];
  for (const [u, len] of [[0.05, 1.15], [0.115, 1.0]]) for (const s of [-1, 1]) {
    const mesh = spike(len, 0.12, mSpike, 10); group.add(mesh); spikes.push({ u, s, mesh });
  }

  // pernas: traseiras mais compridas (joelho para a frente), dianteiras curtas (cotovelo para trás); pés redondos
  const mkLeg = (s, front, phase) => {
    const loft = new Loft(40, 18, mLeg); group.add(loft.mesh);
    const foot = roundFoot(mLeg, mNail, front ? { r: 0.435, h: 0.42, nails: 3 } : { r: 0.5, h: 0.46, nails: 3 }); group.add(foot);
    return front
      ? { s, front, phase, loft, foot, a: 0.98, b: 0.92, off: 0.56, drop: -0.55, x0: 1.66, z0: 1.0, ank: 0.4, stride: 0.26, liftH: 0.38,
        rH: { w: 0.48, ht: 0.8, hb: 0.8 }, rK: { w: 0.43, ht: 0.43, hb: 0.45 }, rA: { w: 0.39, ht: 0.39, hb: 0.39 } }
      : { s, front, phase, loft, foot, a: 1.3, b: 1.16, off: 0.66, drop: -0.5, x0: -1.22, z0: 1.16, ank: 0.44, stride: 0.3, liftH: 0.42,
        rH: { w: 0.64, ht: 1.1, hb: 1.1 }, rK: { w: 0.53, ht: 0.53, hb: 0.55 }, rA: { w: 0.45, ht: 0.45, hb: 0.45 } };
  };
  // sequência lateral: traseira esquerda, dianteira esquerda, traseira direita, dianteira direita
  const legs = [mkLeg(-1, false, 0), mkLeg(-1, true, -0.25), mkLeg(1, false, -0.5), mkLeg(1, true, -0.75)];

  const q = new THREE.Quaternion(), eu = new THREE.Euler(), X = V3(1, 0, 0), Xn = V3(-1, 0, 0), Zs = V3(), DOWN = V3(0, -1, 0);
  function update(t) {
    // raiz (quadril): gingado de quem anda devagar
    eu.set(0.03 * cyc(t, 2, 0.2), 0.03 * cyc(t, 2, 0.45), 0.012 * cyc(t, 2, 0.1), 'YZX');
    const rootQ = q.setFromEuler(eu).clone();
    const rootOff = V3(0.05 * cyc(t, 2, 0.3), 0.04 * cyc(t, 4, 0.1), 0.07 * cyc(t, 2, 0.15));
    const up = env(t, 0.1, 0.66, 0.2, 0.26);       // a cauda levanta e desce uma vez por laço
    const bend = i => {
      if (i < HIP) { const d = HIP - i; return { yaw: 0.11 * cyc(t, 1, -0.07 * d) + 0.03 * cyc(t, 2, -0.12 * d), pitch: 0.015 + 0.06 * up + 0.02 * cyc(t, 2, 0.2 - 0.1 * d) }; }
      const n = i - HIP;
      if (n <= 3) return { yaw: 0.014 * cyc(t, 2, 0.45 + 0.05 * n), pitch: 0 };
      return { yaw: 0.05 * cyc(t, 1, 0.3 + 0.06 * n), pitch: 0.03 * cyc(t, 2, 0.1 * n) - 0.01 };
    };
    const ctrl = fkSpine(REST, HIP, bend, rootQ, rootOff);
    const br = 1 + 0.02 * cyc(t, 2, 0.1);          // respiração na barriga
    for (const i of [6, 7]) { ctrl[i].w *= br; ctrl[i].hb *= br; }
    Zs.set(0, 0, 1).applyQuaternion(rootQ);
    const sm = body.setCtrl(ctrl, Zs);

    // cabeça baixa, mastigando
    const fr = body.at(1);
    setBasis(head.group, fr.p, fr.T, fr.N, fr.B);
    eu.set(0.04 * cyc(t, 2, 0.3), 0.08 * cyc(t, 1, 0.4), -0.14 + 0.05 * cyc(t, 2, 0.15), 'YZX');
    head.group.quaternion.multiply(q.setFromEuler(eu));
    head.setJaw(0.09 + 0.07 * cyc(t, 4, 0.1));
    head.eyes.forEach((e, i) => e.userData.setPupil(...eyeJiggle(t, i + 1, 0.2)));

    // placas e espinhos acompanham o dorso e a cauda
    for (const P of plates) {
      const f = body.at(P.u), a = P.side * 14 * DEG;
      const Np = f.N.clone().multiplyScalar(Math.cos(a)).addScaledVector(f.B, Math.sin(a)), Bp = f.T.clone().cross(Np);
      setBasis(P.mesh, onSurface(f, P.side * 10, 1).addScaledVector(Np, -P.sink), f.T, Np, Bp);
    }
    for (const S of spikes) {
      const f = body.at(S.u), d = f.B.clone().multiplyScalar(S.s * 0.8).addScaledVector(f.N, 0.55).addScaledVector(f.T, -0.3).normalize();
      S.mesh.position.copy(onSurface(f, S.s * 60, 0.6)); S.mesh.quaternion.setFromUnitVectors(DOWN, d);
    }

    // patas: cada uma dá um passo no lugar a cada 2 s, em sequência
    const hipF = body.at(sm.uCtrl[HIP]), shoF = body.at(sm.uCtrl[SHO]);
    for (const L of legs) {
      const th = TAU * (2 * t / LOOP + L.phase), lift = Math.pow(Math.max(0, Math.sin(th)), 1.6);
      const f = L.front ? shoF : hipF;
      const H = f.p.clone().addScaledVector(f.B, L.s * L.off).addScaledVector(f.N, L.drop);
      const F = V3(L.x0 - L.stride * Math.cos(th), L.liftH * lift, L.s * L.z0);
      const A = V3(F.x, F.y + L.ank, F.z);
      const K = ik2(H, A, L.a, L.b, L.front ? Xn : X);
      L.loft.setCtrl(bonePath([{ p: H, ...L.rH, bulge: 0.08 }, { p: K, ...L.rK, bulge: 0.06 }, { p: A, ...L.rA }], 1));
      L.foot.position.copy(F); L.foot.rotation.set(0, -L.s * 0.12, -0.3 * lift);
    }
  }
  shadows(group);
  update(0);
  return { group, update, name: 'estegossauro', view: { size: 3.9, center: [-0.2, 2.75, 0] } };
}
