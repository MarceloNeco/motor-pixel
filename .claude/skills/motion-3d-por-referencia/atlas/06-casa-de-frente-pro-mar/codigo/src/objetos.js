// As peças da cena: casa, coqueiro, guarda-sol, espreguiçadeira, pássaro, jangada e arbusto.
// Tudo é geometria feita no código. Formas grandes e simples: é o que o filtro de pintura pede.
import * as THREE from 'three';
import { PI, D2R, lerp, clamp, mulberry32, tinta, juntar, M, col, fbm2 } from './util.js';

const caixa = (lista, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0, T = null) => {
  const m = M(x, y, z, rx, ry, rz); if (T) m.premultiply(T);
  lista.push({ g: new THREE.BoxGeometry(w, h, d), m });
};
const malha = (lista, mat, sombra = true) => { const m = new THREE.Mesh(juntar(lista), mat); m.castShadow = sombra; m.receiveShadow = true; return m; };

// ================================================================ CASA
// Eixos locais: a frente olha para +z, a largura corre em x. O chão (areia) está em y = 0.
export function criarCasa(C) {
  const g = new THREE.Group();
  const mats = {
    parede: tinta({ cor: C.parede, salpico: C.paredeToque, quanto: 0.26, valor: 0.16, escala: [3.0, 1.5, 3.0], inclina: 0.6 }),
    telhado: tinta({ cor: C.telhado, salpico: C.telhadoToque, quanto: 0.46, valor: 0.26, escala: [1.5, 1.5, 3.2] }),
    madeira: tinta({ cor: C.madeira, salpico: C.madeiraToque, quanto: 0.38, valor: 0.26, escala: [1.0, 3.0, 3.4] }),
    branco: tinta({ cor: C.branco, salpico: C.paredeToque, quanto: 0.22, valor: 0.10, escala: [2.2, 2.2, 2.2] }),
    veneziana: tinta({ cor: C.veneziana, salpico: C.venezianaToque, quanto: 0.38, valor: 0.24, escala: [4.0, 2.2, 4.0] }),
    dentro: tinta({ cor: C.dentro, salpico: C.dentroToque, quanto: 0.55, valor: 0.18, escala: [1.5, 1.5, 1.5], luz: false }),
    boia: tinta({ cor: '#ffffff', vertexColors: true, valor: 0.12, escala: [3, 3, 3] }),
    prancha: tinta({ cor: C.prancha, salpico: C.pranchaToque, quanto: 0.5, valor: 0.18, escala: [2, 1.2, 2] }),
    vaso: tinta({ cor: C.vaso, salpico: C.madeiraToque, quanto: 0.3, valor: 0.2, escala: [3, 3, 3] }),
    folha: tinta({ cor: C.folha, salpico: C.folhaToque, quanto: 0.4, valor: 0.3, escala: [3, 3, 3] }),
  };
  const L = { parede: [], telhado: [], madeira: [], branco: [], dentro: [] };
  const DY = 1.8, PH = 3.1, TOPO = DY + PH;              // deque, altura da parede, topo da parede
  const BX = 4.2, ZF = 2.0, ZT = -3.6;                    // meia largura, parede da frente, parede de trás
  const CUM = 7.2, BEIRAL = 5.0, ZR0 = -4.2, ZR1 = 5.3;   // cumeeira, beiral em x, telhado em z

  // estacas e deque
  for (const x of [-4.7, 0, 4.7]) for (const z of [-3.4, 0.6, 4.6]) caixa(L.madeira, 0.32, 2.5, 0.32, x, 0.45, z);
  caixa(L.madeira, 10.4, 0.26, 9.0, 0, DY - 0.13, 0.5);
  for (let i = 0; i < 5; i++) caixa(L.madeira, 2.4, 0.2, 0.44, 0, DY - 0.33 * (i + 1) + 0.07, 5.0 + 0.22 + 0.42 * i);

  // paredes cegas
  caixa(L.parede, 2 * BX, PH, 0.2, 0, DY + PH / 2, ZT + 0.1);
  caixa(L.parede, 0.2, PH, ZF - ZT, -BX + 0.1, DY + PH / 2, (ZF + ZT) / 2);

  // paredes com vãos: a da frente e a do lado +x
  const folhas = [];   // { grupo, lado: -1|1, tipo: 'janela'|'porta', onde: 'frente'|'lado' }
  function parede(larg, vaos, T, onde) {
    const grupo = new THREE.Group(); grupo.applyMatrix4(T); g.add(grupo);
    let x = -larg / 2;
    for (const v of vaos) {
      if (v.x0 > x) caixa(L.parede, v.x0 - x, PH, 0.2, (x + v.x0) / 2, PH / 2, 0, 0, 0, 0, T);
      if (v.y0 > 0) caixa(L.parede, v.x1 - v.x0, v.y0, 0.2, (v.x0 + v.x1) / 2, v.y0 / 2, 0, 0, 0, 0, T);
      if (v.y1 < PH) caixa(L.parede, v.x1 - v.x0, PH - v.y1, 0.2, (v.x0 + v.x1) / 2, (v.y1 + PH) / 2, 0, 0, 0, 0, T);
      x = v.x1;
      // moldura branca
      const w = v.x1 - v.x0, h = v.y1 - v.y0, xm = (v.x0 + v.x1) / 2, ym = (v.y0 + v.y1) / 2;
      caixa(L.branco, w + 0.22, 0.11, 0.30, xm, v.y1 + 0.055, 0.02, 0, 0, 0, T);
      caixa(L.branco, 0.11, h, 0.30, v.x0 - 0.055, ym, 0.02, 0, 0, 0, T);
      caixa(L.branco, 0.11, h, 0.30, v.x1 + 0.055, ym, 0.02, 0, 0, 0, T);
      if (v.tipo === 'janela') {
        caixa(L.branco, w + 0.34, 0.10, 0.40, xm, v.y0 - 0.05, 0.06, 0, 0, 0, T);
        caixa(L.branco, 0.06, h, 0.06, xm, ym, -0.02, 0, 0, 0, T);
        caixa(L.branco, w, 0.06, 0.06, xm, ym, -0.02, 0, 0, 0, T);
      }
      // duas folhas, com dobradiça nas bordas de fora
      const lw = w / 2 - 0.005;
      for (const lado of [-1, 1]) {
        const p = [];
        caixa(p, lw, h, 0.07, -lado * lw / 2, h / 2, 0);
        const ripas = v.tipo === 'janela' ? 6 : 4;
        for (let i = 0; i < ripas; i++) caixa(p, lw - 0.14, v.tipo === 'janela' ? 0.07 : 0.16, 0.05, -lado * lw / 2, h * (i + 0.6) / (ripas + 0.2), 0.045, 0.25, 0, 0);
        const dob = new THREE.Group(); dob.position.set(lado < 0 ? v.x0 : v.x1, v.y0, 0.15);
        dob.add(malha(p, mats.veneziana)); grupo.add(dob);
        folhas.push({ grupo: dob, lado, tipo: v.tipo, onde });
      }
    }
    if (x < larg / 2) caixa(L.parede, larg / 2 - x, PH, 0.2, (x + larg / 2) / 2, PH / 2, 0, 0, 0, 0, T);
  }
  parede(2 * BX, [
    { x0: -3.35, x1: -2.05, y0: 0.95, y1: 2.35, tipo: 'janela' },
    { x0: -1.0, x1: 1.0, y0: 0, y1: 2.42, tipo: 'porta' },
    { x0: 2.05, x1: 3.35, y0: 0.95, y1: 2.35, tipo: 'janela' },
  ], M(0, DY, ZF - 0.1), 'frente');
  parede(ZF - ZT, [
    { x0: -1.95, x1: -0.75, y0: 0.95, y1: 2.35, tipo: 'janela' },
    { x0: 0.75, x1: 1.95, y0: 0.95, y1: 2.35, tipo: 'janela' },
  ], M(BX - 0.1, DY, (ZF + ZT) / 2, 0, PI / 2, 0), 'lado');

  // empenas (o triângulo sob o telhado), na frente e atrás
  const incl = (CUM - 4.85) / BEIRAL, yb = 4.85 + (BEIRAL - BX) * incl;
  const s = new THREE.Shape(); s.moveTo(-BX, TOPO); s.lineTo(BX, TOPO); s.lineTo(BX, yb); s.lineTo(0, CUM - 0.12); s.lineTo(-BX, yb); s.closePath();
  for (const z of [ZF - 0.2, ZT]) L.parede.push({ g: new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false }), m: M(0, 0, z) });

  // o interior aceso, visto pelos vãos quando abrem
  caixa(L.dentro, 2 * BX - 0.5, PH - 0.1, 0.1, 0, DY + PH / 2, ZF - 0.85);
  caixa(L.dentro, 0.1, PH - 0.1, ZF - ZT - 0.6, BX - 0.85, DY + PH / 2, (ZF + ZT) / 2);
  caixa(L.dentro, 2 * BX - 0.5, 0.06, ZF - ZT - 0.5, 0, DY + 0.04, (ZF + ZT) / 2);

  // telhado de duas águas: a cumeeira corre da frente para trás e cobre a varanda
  const Ls = Math.hypot(BEIRAL, CUM - 4.85), ang = Math.atan2(CUM - 4.85, BEIRAL), zc = (ZR0 + ZR1) / 2, zl = ZR1 - ZR0;
  for (const sx of [-1, 1]) {
    caixa(L.telhado, Ls, 0.22, zl, sx * BEIRAL / 2, (CUM + 4.85) / 2 + 0.11, zc, 0, 0, -sx * ang);
    for (const z of [ZR0 - 0.03, ZR1 + 0.03]) caixa(L.branco, Ls + 0.1, 0.36, 0.14, sx * BEIRAL / 2, (CUM + 4.85) / 2 + 0.05, z, 0, 0, -sx * ang);
  }
  caixa(L.telhado, 0.34, 0.18, zl + 0.1, 0, CUM + 0.17, zc);

  // varanda: pilares, viga e guarda-corpo
  for (const sx of [-1, 1]) caixa(L.branco, 0.26, 3.15, 0.26, sx * 4.75, DY + 1.575, 4.75);
  caixa(L.branco, 9.76, 0.22, 0.22, 0, 4.86, 4.75);
  for (const sx of [-1, 1]) {
    for (const y of [0.22, 0.95]) caixa(L.branco, 3.5, 0.1, 0.1, sx * 3.0, DY + y, 4.82);
    for (let i = 0; i < 8; i++) caixa(L.branco, 0.07, 0.73, 0.07, sx * (1.3 + i * 0.47), DY + 0.585, 4.82);
    for (const y of [0.22, 0.95]) caixa(L.branco, 0.1, 0.1, 2.75, sx * 4.9, DY + y, 3.42);
    for (let i = 0; i < 6; i++) caixa(L.branco, 0.07, 0.73, 0.07, sx * 4.9, DY + 0.585, 2.25 + i * 0.47);
  }

  for (const k of Object.keys(L)) g.add(malha(L[k], mats[k], k !== 'dentro'));

  // boia de salva-vidas na empena
  const tg = new THREE.TorusGeometry(0.50, 0.15, 10, 28).toNonIndexed(); const tp = tg.attributes.position, tc = new Float32Array(tp.count * 3);
  const cA = col(C.boiaA), cB = col(C.boiaB);
  for (let i = 0; i < tp.count; i += 3) {
    const a = Math.atan2(tp.getY(i) + tp.getY(i + 1) + tp.getY(i + 2), tp.getX(i) + tp.getX(i + 1) + tp.getX(i + 2));
    const c = Math.floor((a + PI) / (PI / 4)) % 2 ? cA : cB;
    for (let j = 0; j < 3; j++) { tc[(i + j) * 3] = c.r; tc[(i + j) * 3 + 1] = c.g; tc[(i + j) * 3 + 2] = c.b; }
  }
  tg.setAttribute('color', new THREE.BufferAttribute(tc, 3)); tg.computeVertexNormals();
  const boia = new THREE.Mesh(tg, mats.boia); boia.position.set(0, 5.85, ZF + 0.16); boia.castShadow = true; g.add(boia);

  // prancha encostada na parede do lado
  const pr = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mats.prancha); pr.scale.set(0.05, 1.22, 0.30);
  pr.position.set(BX + 0.2, DY + 1.2, 2.55); pr.rotation.z = 0.09; pr.castShadow = true; g.add(pr);

  // dois vasos na varanda
  for (const sx of [-1, 1]) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.22, 0.5, 10), mats.vaso); v.position.set(sx * 3.9, DY + 0.25, 4.2); v.castShadow = true; g.add(v);
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), mats.folha); f.position.set(sx * 3.9, DY + 0.85, 4.2); f.scale.set(1, 0.85, 1); f.castShadow = true; g.add(f);
  }

  // poleiros na beira da frente do telhado: de frente, as aves aparecem lado a lado.
  // Dois metros entre elas, para não virarem uma mancha só no plano geral.
  const poleiros = [];
  for (const x of [-3.2, -1.1, 1.1, 3.2]) poleiros.push(new THREE.Vector3(x, CUM - incl * Math.abs(x) + 0.40, ZR1 - 0.1));

  // abertura: cada valor vai de 0 (fechado) a 1 (aberto); pode passar de 1 no balanço
  function abrir({ janelaE = 0, janelaD = 0, porta = 0, lado = 0 }) {
    let nj = 0;
    for (const f of folhas) {
      if (f.tipo === 'porta') { f.grupo.rotation.y = f.lado * porta * 112 * D2R; continue; }
      const a = f.onde === 'lado' ? lado : (nj < 2 ? janelaE : janelaD);
      if (f.onde === 'frente') nj++;
      f.grupo.rotation.y = f.lado * a * 152 * D2R;
    }
  }
  abrir({});
  return { grupo: g, abrir, poleiros };
}

// ================================================================ COQUEIRO
function geoFolha(L, W) {
  const N = 16, pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, cx = L * u * (1 - 0.12 * u), cy = L * (0.36 * u - 0.78 * u * u);
    const w = W * Math.pow(Math.sin(PI * Math.pow(u, 0.7)), 0.75) * (i % 2 ? 1 : 0.6) + 0.02;   // borda em serra: lê como folíolos
    pos.push(cx, cy - w * 0.55, -w, cx, cy, 0, cx, cy - w * 0.55, w);
  }
  for (let i = 0; i < N; i++) { const a = i * 3; idx.push(a, a + 1, a + 3, a + 1, a + 4, a + 3, a + 1, a + 2, a + 4, a + 2, a + 5, a + 4); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
let _matsPalma = null;
export function criarPalma(C, { h = 8, inclina = 2.2, giro = 0, semente = 1, escala = 1 } = {}) {
  if (!_matsPalma) _matsPalma = {
    tronco: tinta({ cor: C.tronco, salpico: C.troncoToque, quanto: 0.45, valor: 0.3, escala: [2.2, 3.2, 2.2] }),
    folha: tinta({ cor: C.folha, salpico: C.folhaToque, quanto: 0.36, valor: 0.34, escala: [1.6, 3.0, 3.0], lado: THREE.DoubleSide }),
    folhaClara: tinta({ cor: C.folhaClara, salpico: C.folhaToque, quanto: 0.30, valor: 0.30, escala: [1.6, 3.0, 3.0], lado: THREE.DoubleSide }),
    coco: tinta({ cor: C.coco, salpico: C.troncoToque, quanto: 0.3, valor: 0.2, escala: [4, 4, 4] }),
  };
  const r = mulberry32(semente * 977 + 5), g = new THREE.Group();
  const S = 14, R = 8, pos = [], idx = [];
  const centro = u => new THREE.Vector3(inclina * Math.pow(u, 1.7), h * u, 0);
  for (let i = 0; i <= S; i++) {
    const u = i / S, c = centro(u), rad = lerp(0.36, 0.20, u) * (1 + 0.55 * Math.exp(-u * 10));
    for (let j = 0; j < R; j++) { const a = j / R * 2 * PI; pos.push(c.x + Math.cos(a) * rad, c.y, c.z + Math.sin(a) * rad); }
  }
  for (let i = 0; i < S; i++) for (let j = 0; j < R; j++) { const a = i * R + j, b = i * R + (j + 1) % R, c = a + R, d = b + R; idx.push(a, c, b, b, c, d); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setIndex(idx); tg.computeVertexNormals();
  const tronco = new THREE.Mesh(tg, _matsPalma.tronco); tronco.castShadow = true; tronco.receiveShadow = true; g.add(tronco);

  const copa = new THREE.Group(); copa.position.copy(centro(1)); g.add(copa);
  const folhas = [], NF = 12;
  for (let k = 0; k < NF; k++) {
    const piv = new THREE.Group(); piv.rotation.order = 'YZX';
    const alto = k % 3 === 0, incl = (alto ? 0.72 : k % 3 === 1 ? 0.30 : -0.08) + (r() - 0.5) * 0.22;
    piv.rotation.y = k / NF * 2 * PI + (r() - 0.5) * 0.35; piv.rotation.z = incl;
    const f = new THREE.Mesh(geoFolha(lerp(3.2, 4.3, r()) * (alto ? 0.8 : 1), 0.62), alto ? _matsPalma.folhaClara : _matsPalma.folha);
    f.castShadow = true; piv.add(f); copa.add(piv);
    folhas.push({ piv, incl, fase: r() * 6.28, amp: 0.05 + r() * 0.05 });
  }
  for (let k = 0; k < 4; k++) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), _matsPalma.coco); const a = k * 1.7 + r();
    c.position.set(Math.cos(a) * 0.3, -0.32 - r() * 0.12, Math.sin(a) * 0.3); c.castShadow = true; copa.add(c);
  }
  g.rotation.y = giro; g.scale.setScalar(escala);
  const f0 = r() * 6.28;
  function atualizar(t, vento = 1) {
    copa.rotation.z = 0.035 * vento * Math.sin(0.85 * t + f0);
    for (const f of folhas) { f.piv.rotation.z = f.incl + f.amp * vento * Math.sin(1.7 * t + f.fase); f.piv.rotation.x = 0.11 * vento * Math.sin(1.2 * t + f.fase * 1.7); }
  }
  atualizar(0);
  return { grupo: g, atualizar };
}

// ================================================================ GUARDA-SOL
export function criarGuardaSol(C, corA, corB) {
  const g = new THREE.Group();
  const branco = tinta({ cor: C.branco, valor: 0.1, escala: [3, 3, 3] });
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.75, 8), branco); haste.position.y = 1.375; haste.castShadow = true; g.add(haste);
  const pomo = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), branco); pomo.position.y = 2.78; g.add(pomo);
  const N = 10, APICE = 2.68, PANO = 1.62, SAIA = 0.22;
  const pos = new Float32Array(N * 9 * 3), cor = new Float32Array(N * 9 * 3);
  const cA = col(corA), cB = col(corB);
  for (let i = 0; i < N; i++) { const c = i % 2 ? cB : cA; for (let k = 0; k < 9; k++) { const o = (i * 9 + k) * 3; cor[o] = c.r; cor[o + 1] = c.g; cor[o + 2] = c.b; } }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cor, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N * 9 * 3), 3));
  const lona = new THREE.Mesh(geo, tinta({ cor: '#ffffff', vertexColors: true, salpico: C.lonaToque, quanto: 0.22, valor: 0.16, escala: [2.6, 2.6, 2.6], lado: THREE.DoubleSide }));
  lona.castShadow = true; lona.frustumCulled = false; g.add(lona);
  // e = 0 fechado (lona caída junto da haste), 1 aberto; o pano tem comprimento fixo
  function abrir(e) {
    const rr = lerp(0.13, 1.52, e), yr = APICE - Math.sqrt(Math.max(PANO * PANO - rr * rr, 0.01)), saia = SAIA * clamp(e * 1.4);
    let o = 0; const P = (x, y, z) => { pos[o++] = x; pos[o++] = y; pos[o++] = z; };
    for (let i = 0; i < N; i++) {
      const a0 = i / N * 2 * PI, a1 = (i + 1) / N * 2 * PI;
      const x0 = Math.cos(a0) * rr, z0 = Math.sin(a0) * rr, x1 = Math.cos(a1) * rr, z1 = Math.sin(a1) * rr;
      P(0, APICE, 0); P(x1, yr, z1); P(x0, yr, z0);
      P(x0, yr, z0); P(x1, yr, z1); P(x1 * 1.03, yr - saia, z1 * 1.03);
      P(x0, yr, z0); P(x1 * 1.03, yr - saia, z1 * 1.03); P(x0 * 1.03, yr - saia, z0 * 1.03);
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.attributes.normal.needsUpdate = true;
  }
  abrir(0);
  return { grupo: g, abrir };
}

export function criarEspreguicadeira(C, corPano) {
  const g = new THREE.Group(), mad = [], pano = [];
  caixa(mad, 1.95, 0.07, 0.66, 0, 0.34, 0);
  for (const sx of [-0.8, 0.8]) for (const sz of [-0.28, 0.28]) caixa(mad, 0.07, 0.34, 0.07, sx, 0.17, sz);
  caixa(pano, 1.85, 0.05, 0.58, 0, 0.40, 0);
  caixa(mad, 0.85, 0.07, 0.66, -1.22, 0.62, 0, 0, 0, -0.80);
  caixa(pano, 0.78, 0.05, 0.58, -1.20, 0.67, 0, 0, 0, -0.80);
  g.add(malha(mad, tinta({ cor: C.madeira, salpico: C.madeiraToque, quanto: 0.3, valor: 0.2, escala: [2, 2, 2] })));
  g.add(malha(pano, tinta({ cor: corPano, salpico: C.lonaToque, quanto: 0.2, valor: 0.14, escala: [3, 3, 3] })));
  return g;
}

// ================================================================ PÁSSARO
// Eixo local: voa para +z. As asas batem em volta do eixo do corpo e dobram no meio.
export function criarPassaro(C, semente = 1) {
  const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
  const escuro = tinta({ cor: C.passaro, salpico: C.passaroToque, quanto: 0.3, valor: 0.18, escala: [5, 5, 5], lado: THREE.DoubleSide });
  const claro = tinta({ cor: C.passaroPeito, valor: 0.1, escala: [5, 5, 5] });
  const bico = tinta({ cor: C.bico, valor: 0.1 });
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, pai = corpo) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; pai.add(m); return m; };
  const esf = new THREE.SphereGeometry(1, 12, 9);
  add(esf, escuro, 0, 0, 0, 0.17, 0.16, 0.50);
  add(esf, claro, 0, -0.045, 0.03, 0.15, 0.14, 0.44);
  add(esf, escuro, 0, 0.07, 0.44, 0.115, 0.115, 0.13);
  const bc = add(new THREE.ConeGeometry(0.045, 0.2, 6), bico, 0, 0.05, 0.63); bc.rotation.x = PI / 2;
  const cauda = new THREE.BufferGeometry(); cauda.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.02, -0.38, 0.16, 0.02, -0.82, -0.16, 0.02, -0.82], 3)); cauda.computeVertexNormals();
  add(cauda, escuro, 0, 0, 0);
  const plano = pts => { const b = new THREE.BufferGeometry(); const v = []; for (let i = 1; i < pts.length - 1; i++) v.push(...pts[0], ...pts[i], ...pts[i + 1]); b.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); b.computeVertexNormals(); return b; };
  const gDentro = plano([[0, 0, 0.19], [0.66, 0, 0.17], [0.66, 0, -0.13], [0, 0, -0.17]]);
  const gFora = plano([[0, 0, 0.17], [0.92, 0, -0.10], [0.80, 0, -0.20], [0, 0, -0.13]]);
  const asas = [];
  for (const sx of [-1, 1]) {
    const ombro = new THREE.Group(); ombro.position.set(sx * 0.12, 0.06, 0.08); ombro.scale.x = sx; corpo.add(ombro);
    const a1 = new THREE.Group(); a1.rotation.order = 'YZX'; ombro.add(a1);
    add(gDentro, escuro, 0, 0, 0, 1, 1, 1, a1);
    const a2 = new THREE.Group(); a2.rotation.order = 'YZX'; a2.position.set(0.66, 0, 0); a1.add(a2);
    add(gFora, escuro, 0, 0, 0, 1, 1, 1, a2);
    asas.push({ a1, a2 });
  }
  const r = mulberry32(semente * 131 + 7), fase = r() * 6.28, freq = 2.5 + r() * 0.5;
  // bater: 1 = voo batido, 0 = planando; pouso: 0 = voando, 1 = asas fechadas
  function atualizar(t, bater = 1, pouso = 0) {
    const s = Math.sin(2 * PI * freq * t + fase), s2 = Math.sin(2 * PI * freq * t + fase - 1.0);
    const v = 1 - pouso;
    const z1 = (0.12 + 0.62 * s * bater) * v, z2 = (-0.18 + 0.50 * s2 * bater) * v;
    for (const { a1, a2 } of asas) { a1.rotation.z = z1; a2.rotation.z = z2; a1.rotation.y = 1.30 * pouso; a2.rotation.y = 0.45 * pouso; }
    corpo.position.y = -0.05 * s * bater * v;
    corpo.rotation.x = -0.10 * pouso;      // pousado: quase reto, para a cauda não furar o telhado
  }
  atualizar(0);
  return { grupo: g, atualizar };
}

// ================================================================ JANGADA
export function criarJangada(C) {
  const g = new THREE.Group(), mad = [], vela = [];
  for (let i = -2; i <= 2; i++) mad.push({ g: new THREE.CylinderGeometry(0.17, 0.17, 4.8 - Math.abs(i) * 0.35, 8), m: M(i * 0.34, 0.12, 0, PI / 2, 0, 0) });
  mad.push({ g: new THREE.CylinderGeometry(0.06, 0.08, 5.6, 6), m: M(0, 2.9, 0.7, -0.10, 0, 0) });
  caixa(mad, 0.9, 0.34, 0.5, 0, 0.42, -1.3);
  const v = new THREE.BufferGeometry();
  v.setAttribute('position', new THREE.Float32BufferAttribute([0, 5.5, 0.42, 0, 0.7, 0.9, 0, 0.95, -2.45], 3)); v.computeVertexNormals();
  vela.push({ g: v });
  g.add(malha(mad, tinta({ cor: C.madeira, salpico: C.madeiraToque, quanto: 0.3, valor: 0.24, escala: [2, 2, 1] })));
  g.add(malha(vela, tinta({ cor: C.vela, salpico: C.velaToque, quanto: 0.34, valor: 0.14, escala: [1.2, 1.2, 1.2], lado: THREE.DoubleSide })));
  return g;
}

// ================================================================ ARBUSTO
export function criarArbusto(C, raio = 1.4, semente = 1, clara = false) {
  const geo = new THREE.IcosahedronGeometry(1, 3), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.82 + 0.42 * fbm2(x * 1.4 + semente * 3.1, z * 1.4 + y * 1.1 + semente, 3);
    p.setXYZ(i, x * k, y * k * 0.78, z * k);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, tinta({ cor: clara ? C.folhaClara : C.folha, salpico: C.folhaToque, quanto: 0.42, valor: 0.34, escala: [2.2, 2.2, 2.2] }));
  m.scale.setScalar(raio); m.castShadow = true; m.receiveShadow = true;
  return m;
}
