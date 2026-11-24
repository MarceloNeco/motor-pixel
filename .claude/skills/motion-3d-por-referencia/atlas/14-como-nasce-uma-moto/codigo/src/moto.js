// moto.js: a moto, montada só com formas simples (tubos, toros, caixas e duas peças "lofteadas": tanque e banco).
// Medidas em metros. x = para a frente, y = para cima, z = lado direito (o lado que a câmera vê).
// Cada peça recebe `em` (quando o lápis começa nela) a partir dos quatro tempos de etapa em E.
import * as THREE from 'three';
import { hcUV, hcCilindro, hcPlano, varrer } from './lapis.js';

const RAD = Math.PI / 180, TAU = Math.PI * 2, Y = new THREE.Vector3(0, 1, 0);
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

export function construirMoto(K, cena, tr, guia, E) {
  const poe = (m, o, pos, rotZ) => { if (pos) m.position.set(...pos); if (rotZ) m.rotation.z = rotZ; (o.pai || cena).add(m); return m; };

  // ---------------------------------------------------------------- formas
  function tubo(a, b, r, o = {}) {       // de a até b; o lápis vai de a para b
    const A = V(...a), B = V(...b), L = A.distanceTo(B);
    const g = new THREE.CylinderGeometry(o.r2 ?? r, r, L, o.seg ?? 20, 1, false);
    g.translate(0, L / 2, 0); hcCilindro(g, r); varrer(g, [0, 1, 0]);
    if (r <= 0.024 && !o.semEixo) guia.linha([a, b], { larg: 1.05, forca: 0.26, treme: 0.5, passa: 0.045, em: (o.em ?? -4) - 0.06, dur: (o.dur ?? 0.2) * 0.8, fino: 0.5 });
    const m = K.solido(g, { ang: Math.PI / 2, leque: 0.06, sombra: r >= 0.022, ...o }); m.position.copy(A); m.quaternion.setFromUnitVectors(Y, B.sub(A).normalize()); (o.pai || cena).add(m); return m;
  }
  function cilZ(r, L, pos, o = {}) {     // cilindro deitado no eixo da roda (z)
    const g = new THREE.CylinderGeometry(o.r2 ?? r, r, L, o.seg ?? 44, 1, false);
    hcCilindro(g, r); g.rotateX(Math.PI / 2); varrer(g, o.varre || [1, 0.5, 0]);
    return poe(K.solido(g, { ang: 0.85, leque: 0.3, ...o }), o, pos);
  }
  function toro(R, r, pos, o = {}) {     // anel no plano da roda
    const g = new THREE.TorusGeometry(R, r, o.segT ?? 16, o.segR ?? 96, o.arco ?? TAU);
    hcUV(g, TAU * R, TAU * r * (o.achata ?? 1)); varrer(g, 'u');
    if (o.achata) { g.scale(1, 1, o.achata); g.computeVertexNormals(); }
    if (o.gira) g.rotateZ(o.gira);
    return poe(K.solido(g, { planar: true, ang: 0.8, leque: 0.5, ...o }), o, pos);
  }
  function caixa(sx, sy, sz, pos, o = {}) {
    const g = new THREE.BoxGeometry(sx, sy, sz); hcPlano(g); varrer(g, o.varre || [1, 0.6, 0.2]);
    return poe(K.solido(g, { ang: 0.85, leque: 0.5, ...o }), o, pos, o.rotZ);
  }
  function anel(ri, ro, pos, o = {}) {
    const g = new THREE.RingGeometry(ri, ro, 56); hcPlano(g); varrer(g, o.varre || [1, 0.5, 0]);
    return poe(K.solido(g, { ang: 0.85, leque: 0.2, duplo: true, ...o }), o, pos);
  }
  function curva(pts, r, o = {}) {       // tubo que segue uma curva; o lápis percorre a curva
    const c = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, 'catmullrom', 0.5);
    const g = new THREE.TubeGeometry(c, o.seg ?? 72, r, 12, false);
    hcUV(g, c.getLength(), TAU * r); varrer(g, 'u');
    return poe(K.solido(g, { ang: 0.0, leque: 0.05, duplo: true, ...o }), o);
  }
  // peça "lofteada": seções [x, centroY, meiaAltura, meiaLargura] ligadas por uma pele. A parte de baixo é achatada.
  function loft(sec, o = {}) {
    const NU = o.nu ?? 34, M = o.m ?? 32, e = o.exp ?? 2.5, baixo = o.baixo ?? 0.6;
    const ca = new THREE.CatmullRomCurve3(sec.map(s => V(s[0], s[1], 0)), false, 'catmullrom', 0.5);
    const cb = new THREE.CatmullRomCurve3(sec.map(s => V(s[2], s[3], 0)), false, 'catmullrom', 0.5);
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, a = ca.getPoint(u), b = cb.getPoint(u);
      for (let j = 0; j <= M; j++) {
        const t = j / M * TAU, c = Math.cos(t), s = Math.sin(t);
        pos.push(a.x, a.y + Math.max(0.004, b.x) * (s >= 0 ? 1 : baixo) * Math.sign(s) * Math.abs(s) ** (2 / e), Math.max(0.004, b.y) * Math.sign(c) * Math.abs(c) ** (2 / e));
        uv.push(u, j / M);
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < M; j++) { const p = i * (M + 1) + j; idx.push(p, p + M + 1, p + 1, p + 1, p + M + 1, p + M + 2); }
    for (const [i, x] of [[0, 0], [NU, 1]]) {   // tampas
      const a = ca.getPoint(x), cen = pos.length / 3; pos.push(a.x, a.y, 0); uv.push(x, 0.5);
      for (let j = 0; j < M; j++) { const p = i * (M + 1) + j; idx.push(cen, p, p + 1); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    // folha de hachura: x ao longo da peça, e a distância real medida em volta de cada seção (zero no alto)
    const hc = new Float32Array(pos.length / 3 * 2), topo = Math.round(M / 4);
    for (let i = 0; i <= NU; i++) {
      const ac = [0]; for (let j = 1; j <= M; j++) { const p0 = (i * (M + 1) + j - 1) * 3, p1 = p0 + 3; ac.push(ac[j - 1] + Math.hypot(pos[p1 + 1] - pos[p0 + 1], pos[p1 + 2] - pos[p0 + 2])); }
      for (let j = 0; j <= M; j++) { const v = i * (M + 1) + j; hc[v * 2] = pos[v * 3]; hc[v * 2 + 1] = ac[j] - ac[topo]; }
    }
    g.setAttribute('aHc', new THREE.BufferAttribute(hc, 2)); varrer(g, o.varre || 'u');
    if (o.perfil) { const pf = []; for (let i = 0; i <= 24; i++) { const a = ca.getPoint(i / 24), b = cb.getPoint(i / 24); pf.push([a.x, a.y + Math.max(0.004, b.x), 0]); } guia.linha(pf, { larg: 1.15, forca: 0.3, treme: 0.6, passa: 0.05, em: (o.em ?? -4) - 0.12, dur: 0.22, fino: 0.5 }); }
    return poe(K.solido(g, { planar: true, ang: 0.75, leque: 0.45, duplo: true, ...o }), o);
  }
  // para-lama: uma meia-cana que abraça o pneu (c = eixo, R = raio do anel do pneu, r = raio da cana, de a0 a a1 graus)
  function paralama(c, R, r, a0, a1, o = {}) {
    const NU = 44, NV = 12, abre = 80 * RAD, pos = [], uv = [], idx = [];
    for (let i = 0; i <= NU; i++) {
      const th = (a0 + (a1 - a0) * i / NU) * RAD, bico = 1 - 0.35 * Math.pow(Math.abs(i / NU * 2 - 1), 6);   // as pontas fecham um pouco
      for (let j = 0; j <= NV; j++) { const ph = (-abre + 2 * abre * j / NV) * bico, rr = R + r * Math.cos(ph); pos.push(c[0] + rr * Math.cos(th), c[1] + rr * Math.sin(th), r * Math.sin(ph)); uv.push(i / NU, j / NV); }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const q = i * (NV + 1) + j; idx.push(q, q + NV + 1, q + 1, q + 1, q + NV + 1, q + NV + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    hcUV(g, (a1 - a0) * RAD * R, 2 * abre * r); varrer(g, 'u');
    return poe(K.solido(g, { planar: true, ang: 0.8, leque: 0.5, duplo: true, ...o }), o);
  }
  // as arestas de uma caixa como riscos soltos que passam do canto (o traço repassado de quem constrói a forma)
  function arestas(sx, sy, sz, pos, o = {}) {
    const M = new THREE.Matrix4().makeRotationZ(o.rotZ || 0).setPosition(...pos);
    if (o.pai) { o.pai.updateMatrix(); M.premultiply(o.pai.matrix); }
    const c = (x, y, z) => V(x * sx / 2, y * sy / 2, z * sz / 2).applyMatrix4(M).toArray(), L = [];
    for (const a of [-1, 1]) for (const b of [-1, 1]) { L.push([c(-1, a, b), c(1, a, b)], [c(a, -1, b), c(a, 1, b)], [c(a, b, -1), c(a, b, 1)]); }
    L.forEach((l, i) => tr.linha(l, { larg: 1.35, forca: 0.5, treme: 0.5, passa: o.passa ?? 0.022, em: (o.em ?? -4) + i * 0.012, dur: (o.dur ?? 0.2) * 0.7, fino: 0.5, seed: i * 3.3 + sx * 50 }));
  }

  // ---------------------------------------------------------------- tons (quanto de hachura cada material pede)
  // ganho e base convertem luz em tom; a direção do risco (ang) vem da forma: ao longo do tubo, ao redor do pneu, em diagonal na face plana
  const METAL = { ganho: 1.25, base: 0.05 };
  const FERRO = { ganho: 1.2, base: -0.07 };       // motor: um pouco mais escuro
  const BORRACHA = { ganho: 1.15, base: -0.17 };    // pneu
  const COURO = { ganho: 1.1, base: -0.2 };      // banco
  const CROMO = { ganho: 1.3, base: 0.12 };        // escapamento, farol

  // ---------------------------------------------------------------- medidas
  const RODA = 0.33;                                      // raio de fora do pneu
  const eT = [-0.70, RODA], eD = [0.70, RODA];           // eixos traseiro e dianteiro
  const caster = 27 * RAD, d = [Math.sin(caster), -Math.cos(caster)];   // o garfo desce para a frente
  const gT = [eD[0] - d[0] * 0.70, eD[1] - d[1] * 0.70]; // topo do garfo
  const gM = [eD[0] - d[0] * 0.37, eD[1] - d[1] * 0.37]; // onde a bengala entra no deslizador
  const LQ = 0.085;                                       // meia largura do quadro

  // ================================================================ linhas de construção (já estão no papel no quadro zero)
  {
    const G = { larg: 1.15, forca: 0.24, treme: 1.5, em: -4, dur: 0.3, fino: 0.6 };
    const X0 = -1.04, X1 = 1.04, Z0 = -0.38, Z1 = 0.38, H = 1.08;
    guia.linha([[-1.45, 0, 0], [1.5, 0, 0]], { ...G, forca: 0.34, passa: 0.1 });
    for (const z of [Z0, Z1]) { guia.linha([[X0, 0, z], [X1, 0, z]], { ...G, passa: 0.16 }); guia.linha([[X0, H, z], [X1, H, z]], { ...G, forca: 0.17, passa: 0.2 }); }
    for (const x of [X0, X1]) { guia.linha([[x, 0, Z0], [x, 0, Z1]], { ...G, passa: 0.14 }); guia.linha([[x, H, Z0], [x, H, Z1]], { ...G, forca: 0.17, passa: 0.14 }); for (const z of [Z0, Z1]) guia.linha([[x, 0, z], [x, H, z]], { ...G, forca: 0.19, passa: 0.13 }); }
    guia.linha([[-1.22, RODA, 0], [1.22, RODA, 0]], { ...G, passa: 0.05 });                                   // linha dos eixos
    for (const e of [eT, eD]) {
      guia.linha([[e[0], -0.02, 0], [e[0], 0.78, 0]], { ...G, passa: 0.04 });
      const c = []; for (let i = 0; i <= 66; i++) { const a = (-100 - i / 66 * 372) * RAD; c.push([e[0] + (RODA + 0.006) * Math.cos(a), e[1] + (RODA + 0.006) * Math.sin(a), 0]); }
      guia.linha(c, { ...G, forca: 0.3, treme: 1.1 });
    }
    guia.linha([[eD[0] - d[0] * 0.9, eD[1] - d[1] * 0.9, 0], [eD[0] + d[0] * 0.37, eD[1] + d[1] * 0.37, 0]], { ...G, forca: 0.3, passa: 0.03 });   // eixo da direção
    // malha do piso, bem fraca
    const P = { larg: 1.0, forca: 0.10, treme: 0.35, em: -4, dur: 0.3, fino: 0.8 };
    for (let z = -1.5; z <= 1.51; z += 0.5) if (Math.abs(z) > 0.01) guia.linha([[-1.9, 0, z], [2.3, 0, z]], P);
    for (let x = -1.5; x <= 2.01; x += 0.5) guia.linha([[x, 0, -1.7], [x, 0, 1.7]], P);
  }

  // ================================================================ 1 · RODAS
  const w = E.rodas;
  [[eT, 0.277, 0.053, 0], [eD, 0.287, 0.043, 0.25]].forEach(([e, R, r, dt], k) => {
    const c = [e[0], e[1], 0], t = w + dt;
    toro(R, r, c, { ...BORRACHA, em: t, dur: 0.45, enche: t + 0.4, encheDur: 0.5, peso: 1 });               // pneu
    toro(0.236, 0.011, c, { ...METAL, em: t + 0.2, dur: 0.3, achata: 2.8, peso: 0.8 });                      // aro
    cilZ(0.043, 0.12, c, { ...METAL, em: t + 0.3, dur: 0.12, seg: 24 });                                     // cubo
    cilZ(0.013, 0.27, c, { ...METAL, em: t + 0.35, dur: 0.1, seg: 12 });                                     // eixo
    if (k === 1) anel(0.078, 0.148, [e[0], e[1], 0.064], { ...METAL, base: 0.0, em: t + 0.45, dur: 0.2 });    // disco de freio
    else cilZ(0.082, 0.06, [e[0], e[1], 0.0], { ...FERRO, em: t + 0.45, dur: 0.2, seg: 32 });                // tambor
    // raios: riscos soltos, cruzados dois a dois
    const N = 24;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU, sinal = i % 2 ? 1 : -1, b = a + sinal * 0.36, z = (i % 4 < 2 ? 1 : -1) * 0.045;
      tr.linha([[e[0] + 0.043 * Math.cos(a), e[1] + 0.043 * Math.sin(a), z], [e[0] + 0.228 * Math.cos(b), e[1] + 0.228 * Math.sin(b), 0]],
        { larg: 1.2, forca: 0.6, treme: 0.35, em: t + 0.5 + i * 0.012, dur: 0.08, fino: 0.3 });
    }
  });

  // ================================================================ 2 · QUADRO
  const q = E.quadro;
  const TQ = 0.0175;
  const no = { HT: [0.340, 0.893, 0.025], HD: [0.398, 0.798, 0.025], S1: [-0.17, 0.735, LQ], S2: [-0.755, 0.765, LQ], D1: [0.262, 0.300, LQ], C1: [-0.20, 0.245, LQ], PV: [-0.27, 0.43, LQ], S3: [-0.266, 0.740, LQ], ST: [-0.62, 0.758, LQ] };
  const lado = (p, s) => [p[0], p[1], p[2] * s];
  const par = (a, b, r, t, dur, o = {}) => [1, -1].map((s, i) => tubo(lado(a, s), lado(b, s), r, { ...METAL, em: q + t + i * 0.035, dur, enche: q + t + dur + 0.08, encheDur: 0.3, ...o }));
  tubo([0.343, 0.907, 0], [0.409, 0.778, 0], 0.031, { ...METAL, em: q, dur: 0.14, tampa: true });           // coluna de direção
  par(no.HT, no.S1, TQ, 0.06, 0.22);              // tubo de cima
  par(no.HD, no.D1, TQ, 0.16, 0.22);              // tubo de baixo
  par(no.D1, no.C1, TQ, 0.32, 0.2);               // berço
  par(no.C1, no.PV, TQ, 0.46, 0.12);
  par(no.PV, no.S3, TQ, 0.52, 0.16);              // coluna do banco
  par(no.S1, no.S2, TQ, 0.60, 0.22);              // trilho do banco
  par(no.PV, no.ST, 0.013, 0.72, 0.18);           // escora
  [[no.S2, 0.80], [no.C1, 0.5], [no.D1, 0.4], [no.S1, 0.64]].forEach(([p, t]) => tubo(lado(p, -1), lado(p, 1), 0.014, { ...METAL, em: q + t, dur: 0.1 }));   // travessas
  // balança
  par([-0.27, 0.43, 0.105], [eT[0], eT[1], 0.105], 0.023, 0.86, 0.2);
  // mesas e garfo
  caixa(0.074, 0.022, 0.25, [gT[0] - 0.02 * Math.cos(caster), gT[1] - 0.02 * Math.sin(caster), 0], { ...METAL, rotZ: caster, em: q + 0.98, dur: 0.1, varre: [0, 0, 1] });
  caixa(0.078, 0.026, 0.25, [gT[0] + d[0] * 0.19 - 0.02 * Math.cos(caster), gT[1] + d[1] * 0.19 - 0.02 * Math.sin(caster), 0], { ...METAL, rotZ: caster, em: q + 1.02, dur: 0.1, varre: [0, 0, 1] });
  [1, -1].forEach((s, i) => {
    tubo([gT[0], gT[1], 0.1 * s], [gM[0], gM[1], 0.1 * s], 0.018, { ...CROMO, em: q + 1.04 + i * 0.04, dur: 0.16 });
    tubo([gM[0], gM[1], 0.1 * s], [eD[0] + d[0] * 0.03, eD[1] + d[1] * 0.03, 0.1 * s], 0.027, { ...METAL, em: q + 1.18 + i * 0.04, dur: 0.16, tampa: true });
  });
  caixa(0.06, 0.085, 0.035, [eD[0] - d[0] * 0.2 - 0.047, eD[1] - d[1] * 0.2 - 0.022, 0.087], { ...FERRO, rotZ: caster, em: q + 1.34, dur: 0.08 });   // pinça de freio
  // amortecedores: corpo em tubo, mola em risco solto (uma hélice)
  [1, -1].forEach((s, i) => {
    const a = V(-0.60, 0.358, 0.128 * s), b = V(-0.482, 0.752, 0.112 * s), t = q + 1.26 + i * 0.05;
    tubo(a.toArray(), b.toArray(), 0.014, { ...METAL, em: t, dur: 0.14 });
    const ax = b.clone().sub(a), L = ax.length(); ax.normalize();
    const u1 = V(0, 0, 1).cross(ax).normalize(), u2 = ax.clone().cross(u1), mola = [];
    for (let k = 0; k <= 150; k++) { const f = k / 150, ang = f * TAU * 9; mola.push(a.clone().addScaledVector(ax, L * (0.2 + 0.72 * f)).addScaledVector(u1, 0.031 * Math.cos(ang)).addScaledVector(u2, 0.031 * Math.sin(ang)).toArray()); }
    tr.linha(mola, { larg: 1.7, forca: 0.8, treme: 0.25, em: t + 0.12, dur: 0.3, fino: 0.2 });
  });

  // ================================================================ 3 · MOTOR
  const m = E.motor;
  arestas(0.44, 0.215, 0.25, [-0.02, 0.405, 0], { em: m - 0.05, dur: 0.3 });
  caixa(0.44, 0.215, 0.25, [-0.02, 0.405, 0], { ...FERRO, em: m, dur: 0.3, enche: m + 0.5, encheDur: 0.6, varre: [1, 0.3, 0] });      // cárter
  cilZ(0.112, 0.05, [0.04, 0.405, 0.148], { ...FERRO, base: 0.0, em: m + 0.2, dur: 0.18, enche: m + 0.7 });                         // tampa lateral
  cilZ(0.046, 0.028, [0.04, 0.405, 0.184], { ...METAL, em: m + 0.3, dur: 0.1, seg: 24 });
  cilZ(0.084, 0.04, [-0.135, 0.42, 0.143], { ...FERRO, base: 0.0, em: m + 0.27, dur: 0.16, enche: m + 0.75 });                      // tampa da embreagem
  const cil = new THREE.Group(); cil.position.set(0.05, 0.512, 0); cil.rotation.z = -8 * RAD; cena.add(cil);                        // o cilindro, inclinado para a frente
  caixa(0.158, 0.148, 0.185, [0, 0.074, 0], { ...FERRO, pai: cil, em: m + 0.38, dur: 0.14, varre: [0, 1, 0] });
  for (let i = 0; i < 5; i++) caixa(0.218, 0.0085, 0.246, [0, 0.02 + i * 0.0265, 0], { ...FERRO, base: 0.04, pai: cil, em: m + 0.5 + i * 0.065, dur: 0.07, enche: m + 0.62 + i * 0.065, encheDur: 0.2, varre: [1, 0, 0.4] });   // aletas, uma a uma
  arestas(0.205, 0.066, 0.225, [0, 0.181, 0], { pai: cil, em: m + 0.82, dur: 0.14, passa: 0.016 });
  caixa(0.205, 0.066, 0.225, [0, 0.181, 0], { ...FERRO, pai: cil, em: m + 0.86, dur: 0.14, varre: [0, 1, 0] });                     // cabeçote
  for (let i = 0; i < 2; i++) caixa(0.228, 0.007, 0.25, [0, 0.166 + i * 0.026, 0], { ...FERRO, base: 0.04, pai: cil, em: m + 0.94 + i * 0.05, dur: 0.07, varre: [1, 0, 0.4] });
  cilZ(0.034, 0.20, [0, 0.226, 0], { ...FERRO, pai: cil, em: m + 1.0, dur: 0.12, seg: 20 });                                         // tampa de válvulas
  tubo([-0.045, 0.640, 0], [-0.155, 0.655, 0], 0.040, { ...METAL, em: m + 1.02, dur: 0.12, tampa: true, seg: 20 });                 // carburador
  tubo([-0.155, 0.655, 0], [-0.245, 0.668, 0], 0.040, { ...FERRO, r2: 0.056, em: m + 1.1, dur: 0.12, tampa: true, seg: 20 });       // filtro de ar
  curva([[0.135, 0.662, 0.07], [0.235, 0.655, 0.105], [0.305, 0.54, 0.135], [0.285, 0.33, 0.152], [0.14, 0.222, 0.162], [-0.24, 0.222, 0.168]], 0.0215,
    { ...CROMO, em: m + 1.05, dur: 0.48, enche: m + 1.5, encheDur: 0.35 });                                                           // curva do escapamento
  tubo([-0.24, 0.222, 0.168], [-0.86, 0.326, 0.178], 0.03, { ...CROMO, r2: 0.045, em: m + 1.42, dur: 0.3, enche: m + 1.7, encheDur: 0.4, tampa: true, seg: 22 });   // ponteira
  [1, -1].forEach(s => tubo([-0.235, 0.335, 0.105 * s], [-0.235, 0.335, 0.215 * s], 0.0125, { ...BORRACHA, em: m + 1.5, dur: 0.1, tampa: true }));   // pedaleiras

  // ================================================================ 4 · TANQUE (e o que fecha a moto: guidão, farol, para-lamas, banco)
  const k = E.tanque;
  curva([[0.33, 1.072, -0.345], [0.345, 1.066, -0.21], [0.405, 1.008, -0.082], [0.405, 1.008, 0.082], [0.345, 1.066, 0.21], [0.33, 1.072, 0.345]], 0.0125, { sombra: false, ...CROMO, em: k, dur: 0.28 });   // guidão
  [1, -1].forEach((s, i) => {
    tubo([gT[0] - 0.01, gT[1] + 0.012, 0.06 * s], [0.405, 1.008, 0.06 * s], 0.014, { ...METAL, em: k + 0.02, dur: 0.08 });
    tubo([0.338, 1.068, 0.245 * s], [0.329, 1.072, 0.358 * s], 0.018, { sombra: false, ...BORRACHA, em: k + 0.26, dur: 0.1, tampa: true });         // manoplas
    tr.linha([[0.346, 1.066, 0.2 * s], [0.343, 1.105, 0.24 * s], [0.34, 1.13, 0.262 * s]], { larg: 1.9, forca: 0.82, treme: 0.3, em: k + 0.4 + i * 0.05, dur: 0.1, fino: 0.2 });                           // haste do retrovisor
    tubo([0.346, 1.14, 0.262 * s], [0.332, 1.144, 0.262 * s], 0.04, { sombra: false, semEixo: true, ...CROMO, em: k + 0.48 + i * 0.05, dur: 0.1, tampa: true, seg: 26 });                                                            // retrovisor
  });
  tubo([0.458, 0.985, 0], [0.432, 1.036, 0], 0.047, { ...METAL, em: k + 0.14, dur: 0.12, tampa: true, seg: 24 });                    // painel
  {                                                                                                                                   // farol: uma taça torneada
    const perfil = [[0.0, -0.092], [0.042, -0.084], [0.074, -0.04], [0.086, 0.0], [0.086, 0.016], [0.074, 0.02], [0.045, 0.03], [0.0, 0.034]].map(p => new THREE.Vector2(...p));
    const g = new THREE.LatheGeometry(perfil, 40); hcUV(g, TAU * 0.07, 0.27); g.rotateZ(-Math.PI / 2); varrer(g, [1, 0.6, 0]);
    const f = K.solido(g, { planar: true, ang: 0.8, leque: 0.5, ...CROMO, em: k + 0.1, dur: 0.24, enche: k + 0.5 }); f.position.set(0.552, 0.858, 0); cena.add(f);
    const aro = new THREE.TorusGeometry(0.089, 0.0085, 10, 48); hcUV(aro, TAU * 0.089, TAU * 0.0085); varrer(aro, 'u'); aro.rotateY(Math.PI / 2);
    const ar = K.solido(aro, { planar: true, ang: 0.8, leque: 0.5, ...CROMO, em: k + 0.3, dur: 0.16 }); ar.position.set(0.552 + 0.017, 0.858, 0); cena.add(ar);
  }
  paralama(eD, 0.287, 0.06, 32, 128, { ...METAL, em: k + 0.2, dur: 0.26 });    // para-lama dianteiro
  paralama(eT, 0.277, 0.072, 58, 168, { ...METAL, em: k + 0.26, dur: 0.28 });   // para-lama traseiro
  loft([[-0.795, 0.826, 0.016, 0.07], [-0.725, 0.812, 0.036, 0.118], [-0.46, 0.80, 0.036, 0.128], [-0.235, 0.80, 0.036, 0.112], [-0.19, 0.806, 0.02, 0.08]],
    { ...COURO, perfil: true, baixo: 0.8, exp: 3.2, em: k + 0.34, dur: 0.3, enche: k + 0.6, encheDur: 0.7, varre: [-1, 0, 0] });                    // banco
  caixa(0.04, 0.046, 0.09, [-0.81, 0.795, 0], { ...METAL, em: k + 0.62, dur: 0.08 });                                                  // lanterna
  const tanque = loft([[-0.215, 0.816, 0.03, 0.075], [-0.14, 0.836, 0.07, 0.12], [0.0, 0.868, 0.092, 0.15], [0.14, 0.895, 0.098, 0.158], [0.26, 0.905, 0.08, 0.13], [0.326, 0.90, 0.04, 0.075]],
    { ganho: 1.1, base: 0.16, perfil: true, baixo: 0.6, em: k + 0.42, dur: 0.36, enche: k + 1.2, encheDur: 0.6, varre: [-1, 0.2, 0],
      aguada: '#e39478', aguadaEm: k + 0.78, aguadaDur: 0.78, tinta: '#b03a25', peso: 1 });                                            // tanque: a peça com o acento vermelho
  tubo([0.13, 0.988, 0], [0.13, 1.004, 0], 0.031, { ...CROMO, em: k + 1.5, dur: 0.1, tampa: true, seg: 24 });                         // tampa do tanque

  // o último risco: o farol acende
  const f0 = [0.552 + 0.045, 0.858];
  [[-30, 0.55], [0, 1], [30, 0.55]].forEach(([a, c], i) => { const ca = Math.cos(a * RAD), sa = Math.sin(a * RAD); tr.linha([[f0[0] + 0.05 * ca, f0[1] + 0.085 * sa, 0], [f0[0] + (0.05 + 0.11 * c) * ca, f0[1] + (0.085 + 0.11 * c) * sa, 0]], { larg: 1.9, forca: 0.85, treme: 0.5, em: E.farol + i * 0.07, dur: 0.12, fino: 0.5 }); });

  // onde cada nota aponta
  return {
    ancoras: [V(eD[0] + 0.305 * Math.cos(-0.12), eD[1] + 0.305 * Math.sin(-0.12), 0.046), V(0.318, 0.505, 0.076), V(0.03, 0.585, 0.126), V(0.215, 0.955, 0.12)],
    eT, eD, tanque,
  };
}
