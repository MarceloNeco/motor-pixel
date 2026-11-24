// Tricerátopo: quadrúpede maciço em tons de ocre e ferrugem, cabeça enorme e baixa, bico de papagaio,
// três chifres e o escudo ósseo em leque. Sacode a cabeça, raspa uma pata dianteira no chão e dá chicotadas curtas com o rabo.
// Eixos do dinossauro: +x para a frente (bico), +y para cima, ±z os lados. O chão é y = 0.
import * as THREE from 'three';
import { C, V3, PI, TAU, DEG, lerp, Loft, fkSpine, ik2, bonePath, makeSkin, buildHead, roundFoot, spike, blob, setBasis, eyeJiggle, cyc, env, smooth, seg, frac, LOOP, canvasTex, mulberry32, shadows } from '../lib.js';

export function build() {
  const BACK = '#6e4e36', FLANK = '#96744e', BELLY = '#cdb893';
  const skin = makeSkin({
    seed: 23, back: BACK, flank: FLANK, belly: BELLY, limbEnd: '#6a5038', bump: 3.2, bumpRep: [12, 3],
    blotch: { dark: '#4c3020', light: '#b9956c', n: 300 },
    paint(g, W, H, r) {
      // malhas cor de ferrugem no dorso (espelhadas: v = 0 e v = 1 são a linha das costas)
      g.save(); g.filter = 'blur(10px)';
      for (let i = 0; i < 30; i++) {
        const x = (0.06 + 0.78 * r()) * W, v = r() * 0.21, rx = 30 + r() * 64, ry = 14 + r() * 26;
        g.fillStyle = `rgba(92,44,24,${0.2 + r() * 0.22})`;
        for (const y of [v * H, (1 - v) * H]) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
      }
      g.restore();
      // bico córneo: o fim da textura (ponta do focinho) escurece
      const gr = g.createLinearGradient(0.968 * W, 0, W, 0);
      gr.addColorStop(0, 'rgba(74,58,42,0)'); gr.addColorStop(0.4, 'rgba(74,58,42,0.95)'); gr.addColorStop(1, 'rgba(46,36,28,1)');
      g.fillStyle = gr; g.fillRect(0.968 * W, 0, 0.032 * W, H);
    },
  });
  const mHorn = new THREE.MeshStandardMaterial({ color: '#e9dcc0', roughness: 0.42 });
  const mNail = skin.flat('#d9ccb0', 0.5);
  const fb = skin.limb.bumpMap.clone(); fb.repeat.set(3, 1); fb.needsUpdate = true;
  const mFoot = new THREE.MeshStandardMaterial({ color: '#7d5f42', bumpMap: fb, bumpScale: 3, roughness: 0.78 });
  const group = new THREE.Group();

  // espinha em repouso, da ponta da cauda à nuca: C(x, y, meia-largura, altura acima, altura abaixo)
  const REST = [
    C(-4.4, 1.12, 0.03, 0.03), C(-3.85, 1.34, 0.18, 0.19, 0.18), C(-3.25, 1.72, 0.36, 0.38, 0.36), C(-2.6, 2.12, 0.6, 0.62, 0.62),
    C(-1.95, 2.42, 0.88, 0.82, 0.96),
    C(-1.2, 2.5, 1.12, 0.92, 1.22),                                        // 5 = quadril
    C(-0.3, 2.45, 1.3, 0.92, 1.38), C(0.6, 2.38, 1.28, 0.9, 1.34),         // barrigão
    C(1.4, 2.32, 1.12, 0.86, 1.2),                                         // 8 = ombros
    C(2.1, 2.34, 0.9, 0.78, 0.94), C(2.65, 2.36, 0.76, 0.7, 0.74),          // pescoço curto e nuca
  ];
  const HIP = 5, SHO = 8;
  const body = new Loft(72, 28, skin.body, { u0: 0, u1: 0.86 }); group.add(body.mesh);

  // cabeça: origem na nuca, +x para o bico. Sem dentes: bico de papagaio com gancho em cima.
  const head = buildHead({
    seed: 9, u0: 0.86, mouth: '#7a2e2c', tongue: '#c97a78',
    skull: [
      C(-0.5, 0.0, 0.04, 0.04), C(-0.2, 0.02, 0.6, 0.68, 0.56), C(0.3, 0.02, 0.8, 0.88, 0.46), C(0.8, 0.0, 0.78, 0.84, 0.24, 0.9),
      C(1.3, -0.04, 0.63, 0.68, 0.16, 0.9), C(1.75, -0.1, 0.46, 0.52, 0.13, 0.9), C(2.1, -0.17, 0.32, 0.38, 0.1), C(2.36, -0.3, 0.18, 0.23, 0.08), C(2.5, -0.46, 0.03, 0.04, 0.03),
    ],
    hinge: [0.25, -0.2],
    jaw: [
      C(-0.3, -0.05, 0.04, 0.03, 0.04), C(0.0, -0.05, 0.64, 0.08, 0.56), C(0.5, -0.06, 0.66, 0.06, 0.58, 0.9), C(1.0, -0.07, 0.53, 0.05, 0.46, 0.9),
      C(1.4, -0.07, 0.37, 0.05, 0.32), C(1.7, -0.04, 0.22, 0.05, 0.2), C(1.88, 0.03, 0.1, 0.05, 0.1), C(1.97, 0.09, 0.02, 0.02, 0.02),
    ],
    eye: { x: 1.0, y: 0.16, r: 0.25, out: 0.02, fwd: 0.22, up: 0.1 },
  }, skin);
  head.group.scale.setScalar(1.32);
  group.add(head.group);
  // forro da boca: o da lib sai pela beirada do bico e vira um "batom" vermelho. Aqui ele é escondido e refeito
  // acompanhando a curva de baixo do crânio (e de cima da mandíbula), mais estreito, para sobrar a borda de pele.
  {
    const cMouth = new THREE.Color('#7a2e2c').getHex(), cTongue = new THREE.Color('#c97a78').getHex();
    head.group.traverse(o => {
      if (!o.isMesh || !o.material.color) return;
      const hx = o.material.color.getHex();
      if (hx === cMouth) o.visible = false; else if (hx === cTongue) o.scale.set(0.82, 1, 0.8);
    });
    const mMouth = new THREE.MeshStandardMaterial({ color: '#7a2e2c', roughness: 0.55 });
    const pick = (smp, x0) => smp.filter((q, i) => q.p.x >= x0 && (i % 2 === 0 || i === smp.length - 1));
    const pal = new Loft(22, 14, mMouth);
    pal.setCtrl(pick(head.sk, 0.1).map(q => ({ p: q.p.clone(), w: q.w * 0.8, ht: 0.02, hb: q.hb + 0.015, sq: 1 })));
    pal.mesh.castShadow = false; head.group.add(pal.mesh);
    const flo = new Loft(22, 14, mMouth);
    flo.setCtrl(pick(head.jw, 0.0).map(q => ({ p: q.p.clone(), w: q.w * 0.8, ht: q.ht + 0.012, hb: 0.02, sq: 1 })));
    flo.mesh.castShadow = false; head.jaw.add(flo.mesh);
  }

  // escudo ósseo (gola): concha fina em leque que sai de trás do crânio e abraça o pescoço
  const bump = skin.body.bumpMap.clone(); bump.repeat.set(3, 8); bump.needsUpdate = true;
  const mFrill = new THREE.MeshStandardMaterial({
    bumpMap: bump, bumpScale: 2.2, roughness: 0.72,
    // u corre da base à borda; v vai de um canto de baixo ao outro, passando pelo topo (0,5)
    map: canvasTex(512, 512, (g, w, h) => {
      const r = mulberry32(41);
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#8a6844'); gr.addColorStop(0.3, FLANK); gr.addColorStop(0.72, '#a67e54'); gr.addColorStop(1, '#84563a');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.save(); g.filter = 'blur(10px)';
      for (const v of [0.3, 0.7]) {       // duas manchas grandes cor de ferrugem, uma de cada lado
        g.fillStyle = 'rgba(128,46,26,0.62)'; g.beginPath(); g.ellipse(0.56 * w, v * h, 0.24 * w, 0.12 * h, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(58,26,16,0.5)'; g.beginPath(); g.ellipse(0.58 * w, v * h, 0.12 * w, 0.055 * h, 0, 0, TAU); g.fill();
      }
      g.fillStyle = 'rgba(70,40,24,0.35)'; g.fillRect(0, 0.485 * h, w, 0.03 * h);   // crista central
      g.restore();
      for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? `rgba(70,34,20,${0.06 + r() * 0.1})` : `rgba(200,165,120,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 30, 5 + r() * 12, r() * PI, 0, TAU); g.fill(); }
      for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.6 ? `rgba(0,0,0,${0.04 + r() * 0.1})` : `rgba(255,240,215,${0.03 + r() * 0.07})`; g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 2.2, 0, TAU); g.fill(); }
    }),
  });
  // geometria: concha fina em meia-taça. th = ângulo em volta do eixo da cabeça (0 = topo), k = da base (0) à borda (1)
  // o topo é comprido e deitado para trás; os cantos de baixo são curtos e abrem mais (a borda fica varrida para trás, não em pé)
  const TMAX = 118 * DEG, NT = 48, NK = 14, THICK = 0.12;
  const frillP = (th, k) => {
    const c = Math.cos(th), sn = Math.sin(th), a = Math.abs(th) / TMAX;
    const L = lerp(1.6, 0.5, Math.pow(a, 1.3)), fl = lerp(14, 38, a) * DEG;
    const out = L * (k * Math.sin(fl) + 0.08 * k * k);
    return V3(0.3 - L * k * Math.cos(fl), 0.72 * c + out * c, 0.74 * sn + out * sn);
  };
  const frillN = (th, k) => {
    const e = 1e-3, dT = frillP(th + e, k).sub(frillP(th - e, k)), dK = frillP(th, k + e).sub(frillP(th, k - e));
    return dT.cross(dK).normalize();
  };
  const fpos = [], fuv = [], fidx = [];
  const grid = sign => {            // uma face da concha; devolve o índice do primeiro vértice
    const base = fpos.length / 3;
    for (let i = 0; i <= NT; i++) for (let j = 0; j <= NK; j++) {
      const th = lerp(-TMAX, TMAX, i / NT), k = j / NK, pt = frillP(th, k).addScaledVector(frillN(th, k), sign * THICK / 2);
      fpos.push(pt.x, pt.y, pt.z); fuv.push(k, i / NT);
    }
    for (let i = 0; i < NT; i++) for (let j = 0; j < NK; j++) {
      const a0 = base + i * (NK + 1) + j, b0 = a0 + NK + 1, c0 = a0 + 1, d0 = b0 + 1;
      if (sign > 0) fidx.push(a0, b0, c0, b0, d0, c0); else fidx.push(a0, c0, b0, b0, c0, d0);
    }
    return base;
  };
  grid(1); grid(-1);
  const strip = (pts, flip) => {    // fecha a espessura numa borda; pts: [[th, k], ...]
    const base = fpos.length / 3;
    for (const [th, k] of pts) for (const sg of [1, -1]) { const pt = frillP(th, k).addScaledVector(frillN(th, k), sg * THICK / 2); fpos.push(pt.x, pt.y, pt.z); fuv.push(k, (th + TMAX) / (2 * TMAX)); }
    for (let i = 0; i < pts.length - 1; i++) { const a0 = base + i * 2, b0 = a0 + 1, c0 = a0 + 2, d0 = a0 + 3; if (flip) fidx.push(a0, b0, c0, c0, b0, d0); else fidx.push(a0, c0, b0, b0, c0, d0); }
  };
  strip(Array.from({ length: NT + 1 }, (_, i) => [lerp(-TMAX, TMAX, i / NT), 1]), false);
  strip(Array.from({ length: NK + 1 }, (_, j) => [TMAX, j / NK]), true);
  strip(Array.from({ length: NK + 1 }, (_, j) => [-TMAX, j / NK]), false);
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3)); fgeo.setAttribute('uv', new THREE.Float32BufferAttribute(fuv, 2));
  fgeo.setIndex(fidx); fgeo.computeVertexNormals();
  mFrill.side = THREE.DoubleSide;
  const frill = new THREE.Mesh(fgeo, mFrill); frill.castShadow = true; frill.receiveShadow = true; head.group.add(frill);
  // nódulos ósseos em toda a borda do escudo, a cada ~0,3 de contorno
  const DOWN = V3(0, -1, 0);
  {
    let acc = 0.15, prev = null;
    for (let i = 0; i <= 200; i++) {
      const th = lerp(-TMAX, TMAX, i / 200), pt = frillP(th, 1);
      if (prev) acc += pt.distanceTo(prev);
      if (acc >= 0.3) {
        const dir = pt.clone().sub(frillP(th, 0.9)).normalize(), n = spike(0.2, 0.1, mHorn, 6);
        n.position.copy(pt).addScaledVector(dir, -0.05); n.quaternion.setFromUnitVectors(DOWN, dir); head.group.add(n); acc = 0;
      }
      prev = pt;
    }
  }

  // chifres: dois longos e levemente curvos acima dos olhos, um curto no nariz e as pontas das bochechas
  for (const s of [-1, 1]) {
    const h = new Loft(18, 12, mHorn);
    h.setCtrl([
      C(0.5, 0.34, 0.19, 0.19, 0.19, 1, s * 0.3), C(0.92, 0.94, 0.185, 0.185, 0.185, 1, s * 0.48), C(1.34, 1.24, 0.13, 0.13, 0.13, 1, s * 0.57),
      C(1.76, 1.4, 0.065, 0.065, 0.065, 1, s * 0.62), C(1.96, 1.44, 0.005, 0.005, 0.005, 1, s * 0.63),
    ]);
    head.group.add(h.mesh);
    const col = blob(0.31, 0.12, 0.29, mFoot); col.position.set(0.74, 0.69, s * 0.45); col.rotation.z = -0.63; head.group.add(col);  // base de pele do chifre
    const ck = spike(0.3, 0.11, mHorn, 7); ck.position.set(0.3, -0.22, s * 0.74); ck.quaternion.setFromUnitVectors(DOWN, V3(-0.15, -0.55, s * 0.82).normalize()); head.group.add(ck);
  }
  const nose = spike(0.52, 0.16, mHorn, 10); nose.position.set(1.78, 0.3, 0); nose.quaternion.setFromUnitVectors(DOWN, V3(0.32, 0.95, 0).normalize()); head.group.add(nose);

  // pernas grossas com IK: traseiras dobram o joelho para a frente, dianteiras o cotovelo para trás
  const mkLeg = (front, s) => {
    const loft = new Loft(40, 18, skin.limb); group.add(loft.mesh);
    const foot = roundFoot(mFoot, mNail, { r: front ? 0.4 : 0.44, h: 0.42, nails: front ? 4 : 3 }); group.add(foot);
    return { front, s, loft, foot };
  };
  const legs = [mkLeg(false, -1), mkLeg(false, 1), mkLeg(true, -1), mkLeg(true, 1)];

  const q = new THREE.Quaternion(), eu = new THREE.Euler(), X = V3(1, 0, 0), XN = V3(-1, 0, 0), Zs = V3();
  function update(t) {
    const f = frac(t / LOOP);
    const Sh = env(t, 0.05, 0.42, 0.06, 0.1);        // sacudida de cabeça: 0,2 s a 1,7 s
    const Fl = env(t, 0.54, 0.9, 0.05, 0.1);         // chicotadas do rabo, junto com a raspada
    // raspada da pata dianteira direita: levanta e avança (a), desce e puxa para trás rente ao chão (b), volta e pousa (c)
    const a = smooth(seg(f, 0.5, 0.58)), b = smooth(seg(f, 0.58, 0.71)), c = smooth(seg(f, 0.71, 0.81));
    const Sc = a * (1 - smooth(seg(f, 0.76, 0.84)));
    const shake = 0.3 * Sh * cyc(t, 6) + 0.07 * (1 - Sh) * cyc(t, 1, 0.2);   // guinada da cabeça (+ = para +z)

    // raiz (quadril): troca de peso, respiração e o corpo se apoiando para longe da pata que raspa
    eu.set(0.018 * cyc(t, 1, 0.3) - 0.03 * Sc, 0.02 * cyc(t, 1, 0.1) + 0.03 * Sh * cyc(t, 6, 0.12), -0.025 * Sc, 'YZX');
    const rootQ = q.setFromEuler(eu).clone();
    const rootOff = V3(0.04 * cyc(t, 1, 0.05), 0.03 * cyc(t, 2, 0.6), -0.07 * Sc);
    const bend = i => {
      if (i < HIP) { const d = HIP - i; return { yaw: 0.07 * cyc(t, 2, -0.1 * d) + 0.15 * Fl * cyc(t, 8, -0.11 * d), pitch: 0.02 * cyc(t, 2, 0.3 - 0.1 * d) + 0.03 * Fl }; }
      const n = i - HIP;
      if (n <= 3) return { yaw: 0.04 * shake, pitch: 0 };
      return { yaw: 0.34 * shake, pitch: -0.04 * Sc + 0.03 * Sh };
    };
    const ctrl = fkSpine(REST, HIP, bend, rootQ, rootOff);
    const br = 1 + 0.028 * cyc(t, 2, 0.1);          // respiração no barrigão
    for (const i of [6, 7]) { ctrl[i].w *= br; ctrl[i].hb *= br; }
    Zs.set(0, 0, 1).applyQuaternion(rootQ);
    const sm = body.setCtrl(ctrl, Zs);

    // cabeça presa no fim do pescoço: baixa, sacode de um lado ao outro (o escudo vai junto) e abaixa mais na raspada
    const fr = body.at(1);
    setBasis(head.group, fr.p, fr.T, fr.N, fr.B);
    eu.set(0.13 * Sh * cyc(t, 6, 0.2) + 0.03 * cyc(t, 1, 0.4), -shake, -0.3 + 0.035 * cyc(t, 2, 0.1) + 0.09 * Sh - 0.06 * Sc, 'YZX');
    head.group.quaternion.multiply(q.setFromEuler(eu));
    head.setJaw(0.012 + 0.03 * Math.max(0, cyc(t, 2, 0.15)) + 0.07 * Sh * (0.5 + 0.5 * cyc(t, 6, 0.3)) + 0.05 * Sc);
    head.eyes.forEach((e, i) => e.userData.setPupil(...eyeJiggle(t, i + 3, Math.min(1, 0.12 + 0.85 * Sh + 0.4 * Sc))));

    // patas
    const hf = body.at(sm.uCtrl[HIP]), sf = body.at(sm.uCtrl[SHO]);
    for (const L of legs) {
      const fm = L.front ? sf : hf;
      const H = fm.p.clone().addScaledVector(fm.B, L.s * (L.front ? 0.76 : 0.8)).addScaledVector(fm.N, L.front ? -0.5 : -0.4);
      let fx = L.front ? 1.5 : -1.3, fy = 0, pitch = 0;
      const fz = L.s * (L.front ? 1.02 : 1.0);
      if (L.front && L.s > 0) {
        fx += 0.4 * a - 0.85 * b + 0.45 * c;
        fy = 0.5 * a * (1 - b) + 0.05 * b * (1 - c) + 0.3 * Math.sin(PI * c);
        pitch = -0.3 * a * (1 - c) - 0.25 * Math.sin(PI * c);   // dedos para baixo enquanto arrasta
      }
      const A = V3(fx - (L.front ? 0.02 : 0.1), fy + 0.4, fz);  // punho / tornozelo logo acima do pé
      const K = L.front ? ik2(H, A, 0.86, 0.82, XN) : ik2(H, A, 1.0, 0.96, X);
      L.loft.setCtrl(bonePath(L.front ? [
        { p: H, w: 0.46, ht: 0.52, hb: 0.56, bulge: 0.06 }, { p: K, w: 0.37, ht: 0.37, hb: 0.39, bulge: 0.04 }, { p: A, w: 0.34, ht: 0.34, hb: 0.34 },
      ] : [
        { p: H, w: 0.56, ht: 0.72, hb: 0.72, bulge: 0.06 }, { p: K, w: 0.42, ht: 0.44, hb: 0.42, bulge: 0.06 }, { p: A, w: 0.37, ht: 0.37, hb: 0.37 },
      ], 1));
      L.foot.position.set(fx, fy, fz); L.foot.rotation.set(0, -L.s * 0.16, pitch);
    }
  }
  shadows(group);
  update(0);
  return { group, update, name: 'triceratopo', view: { size: 4.0, center: [0.4, 2.1, 0] } };
}
