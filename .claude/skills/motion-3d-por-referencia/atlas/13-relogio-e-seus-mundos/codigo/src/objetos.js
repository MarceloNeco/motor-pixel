// Os três mundos que saem de dentro do relógio: trilha (verde), música (amarelo) e sono (violeta).
// Cada objeto é montado com formas simples. Cada mundo devolve: itens (objeto + posição de repouso),
// a corda que costura o conjunto e as cores das bolas que passam perto da câmera.
import * as THREE from 'three';
import { PI, TAU, deg, mulberry32, std, metal, glow, mesh, group, rbox, sph, cyl, torus, capsule, lathe, latheZ, extrude, tube, roundRectShape, polyShape, starShape, canvasTex, spaced, rr, crease } from './util.js';

const STEEL = metal('#e2e5e9', 0.2);
const INK = '#1c1e21';
const Yv = new THREE.Vector3(0, 1, 0);
const along = (curve, t, obj) => { obj.position.copy(curve.getPointAt(t)); obj.quaternion.setFromUnitVectors(Yv, curve.getTangentAt(t)); return obj; };

// ---------------------------------------------------------------- cartão de vidro com interface
function card(draw) {
  const W = 1.9, H = 1.5;
  const tex = canvasTex(1024, 808, (c, w, h) => { c.textBaseline = 'alphabetic'; c.textAlign = 'left'; draw(c, w, h); });
  const body = mesh(extrude(roundRectShape(W, H, 0.27), 0.06, 0.035, 5, 20),
    new THREE.MeshPhysicalMaterial({ color: '#16171b', roughness: 0.1, metalness: 0, transparent: true, opacity: 0.97, envMapIntensity: 1.3 }));
  // a interface aparece dos dois lados: quando o cartão gira na recolhida, não vira uma placa vazia
  const ui = (z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); m.position.z = z; m.rotation.y = ry; m.renderOrder = 3; return m; };
  return group([body, ui(0.068, 0), ui(-0.068, PI)]);
}
const uiHead = (c, label, accent) => {
  c.fillStyle = accent; c.beginPath(); c.arc(100, 112, 17, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.74)'; c.font = '500 56px Inter'; c.fillText(label, 136, 131);
};
const uiBig = (c, big, small, y, size) => {
  c.fillStyle = '#ffffff'; c.font = `800 ${size}px Inter`; c.fillText(big, 72, y);
  const tw = c.measureText(big).width;
  c.fillStyle = 'rgba(255,255,255,0.72)'; c.font = `600 ${Math.round(size * 0.33)}px Inter`; c.fillText(small, 72 + tw + 26, y);
};

// corda listrada em espiral
const cordTex = (a, b, rep) => canvasTex(64, 64, (c, w, h) => {
  c.fillStyle = a; c.fillRect(0, 0, w, h); c.strokeStyle = b; c.lineWidth = 15;
  for (let i = -2; i < 4; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 64, 64); c.stroke(); }
}, { repeat: [rep, 2] });
const CORD = [[4.0, 1.7, -0.5], [2.4, 2.3, 0.1], [0.75, 1.25, 0.7], [-0.6, 0.8, -0.3], [-1.4, 1.95, -0.5], [-2.9, 2.3, 0.2], [-4.3, 1.2, 0.3],
  [-4.0, -0.5, -0.7], [-2.6, -1.45, -0.6], [-1.0, -1.25, 0.2], [0.6, -1.6, 0.9], [1.3, -0.5, 0.2], [1.0, 0.6, -0.7], [2.7, 0.15, -0.8], [3.7, -0.9, 0.2]];

// miudezas: parafusos, pastilhas, bolinhas e pinos, espalhados nos vãos
function smalls(items, seed, tint, tint2) {
  const rnd = mulberry32(seed), dark = std('#1d1f23', { roughness: 0.2 });
  const make = [
    () => group([mesh(cyl(0.075, 0.075, 0.04, 20), STEEL, [0, 0.09, 0]), mesh(cyl(0.036, 0.03, 0.16, 14), STEEL)]),
    () => mesh(rbox(0.2, 0.2, 0.05, 0.02), dark),
    () => mesh(sph(0.09 + rnd() * 0.07, 24, 16), std(rnd() < 0.5 ? tint : tint2)),
    () => mesh(capsule(0.028, 0.2, 10), STEEL),
    () => mesh(rbox(0.13, 0.13, 0.13, 0.03), STEEL),
  ];
  // zonas proibidas: em volta de cada herói (na proporção do tamanho) e o retângulo do cartão, para nada encostar no texto
  const taken = items.map(i => ({ p: i.p, r: 0.5 + 0.6 * i.s }));
  let n = 0, guard = 0;
  while (n < 24 && guard++ < 6000) {
    const a = rnd() * TAU, e = 0.3 + Math.sqrt(rnd()) * 0.85;
    const p = [Math.cos(a) * 5.2 * e, Math.sin(a) * 2.7 * e, (rnd() - 0.5) * 3.6];
    if (p[0] > -3.9 && p[0] < -0.7 && p[1] > -1.6 && p[1] < 0.9) continue;
    if (taken.some(h => Math.hypot(h.p[0] - p[0], h.p[1] - p[1]) < h.r)) continue;
    taken.push({ p, r: 0.45 });
    items.push({ o: make[n % make.length](), p, r: [rnd() * TAU, rnd() * TAU, rnd() * TAU], s: 1, small: true });
    n++;
  }
}

// ================================================================= MUNDO A · TRILHA
function worldTrilha() {
  const G = '#14a868', G2 = '#2ebd7e', GL = '#a8e6c6', GD = '#0d8052', SAND = '#f4e8cc', WOOD = '#b87a42', AMB = '#f7b63c', DK = '#262a2e';
  const items = [], add = (o, p, r = [0, 0, 0], s = 1, x = {}) => items.push({ o, p, r, s, ...x });

  // cartão
  add(card((c, w, h) => {
    uiHead(c, 'Trilha', '#35d38f');
    c.textAlign = 'right'; c.fillStyle = '#35d38f'; c.font = '600 52px Inter'; c.fillText('+318 m', w - 84, 131); c.textAlign = 'left';
    uiBig(c, '4,2', 'km', 440, 290);
    const pts = [[84, 700], [190, 646], [285, 672], [395, 566], [485, 604], [600, 506], [700, 552], [805, 474], [940, 524]];
    const g = c.createLinearGradient(0, 470, 0, 760); g.addColorStop(0, 'rgba(53,211,143,0.45)'); g.addColorStop(1, 'rgba(53,211,143,0)');
    c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.lineTo(940, 760); c.lineTo(84, 760); c.closePath(); c.fillStyle = g; c.fill();
    c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.lineWidth = 13; c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = '#35d38f'; c.stroke();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(805, 474, 19, 0, TAU); c.fill();
  }), [-2.25, -0.35, 1.0], [0.05, 0.32, -0.07], 1.1, { card: true });

  // mochila
  add(group([
    mesh(rbox(0.9, 1.1, 0.5, 0.2), std(G)),
    mesh(rbox(0.93, 0.38, 0.54, 0.17), std(GD), [0, 0.41, 0]),
    mesh(rbox(0.64, 0.46, 0.2, 0.1), std(GL), [0, -0.24, 0.28]),
    mesh(rbox(0.11, 0.36, 0.03, 0.012), std(SAND), [0, 0.2, 0.275]),
    mesh(rbox(0.17, 0.09, 0.05, 0.02), STEEL, [0, 0.07, 0.285]),
    mesh(torus(0.42, 0.05, PI, 40, 12), std(GD), [0.26, -0.02, -0.25], [0, -PI / 2, PI / 2]),
    mesh(torus(0.42, 0.05, PI, 40, 12), std(GD), [-0.26, -0.02, -0.25], [0, -PI / 2, PI / 2]),
    mesh(torus(0.12, 0.035, PI, 24, 10), std(SAND), [0, 0.6, -0.08]),
    mesh(cyl(0.11, 0.11, 0.42, 24), STEEL, [0.52, -0.2, 0]),
    mesh(cyl(0.07, 0.07, 0.1, 20), std(AMB), [0.52, 0.05, 0]),
  ]), [2.35, -0.85, 0.7], [0.1, -0.5, 0.12], 1.7);

  // garrafa térmica
  add(group([
    mesh(lathe([[0, -0.75], [0.26, -0.75], [0.3, -0.7], [0.3, 0.3], [0.27, 0.42], [0.17, 0.5], [0.17, 0.56], [0, 0.56]]), std(G2)),
    mesh(cyl(0.305, 0.305, 0.17, 48), std(GL), [0, -0.2, 0]),
    mesh(lathe([[0, 0.55], [0.2, 0.55], [0.2, 0.74], [0.17, 0.8], [0, 0.8]]), std(SAND)),
    mesh(torus(0.1, 0.026, TAU, 28, 10), STEEL, [0, 0.88, 0]),
  ]), [1.15, 1.55, -0.3], [0.15, 0.2, -0.55], 1.0);

  // pinheiros
  const pine = () => group([
    mesh(new THREE.ConeGeometry(0.5, 0.62, 48), std(G), [0, -0.02, 0]),
    mesh(new THREE.ConeGeometry(0.41, 0.56, 48), std(G2), [0, 0.32, 0]),
    mesh(new THREE.ConeGeometry(0.31, 0.5, 48), std('#45cf93'), [0, 0.64, 0]),
    mesh(cyl(0.085, 0.105, 0.36, 20), std(WOOD), [0, -0.5, 0]),
  ], [0, -0.1, 0]);
  add(group([pine()]), [-3.6, 1.25, -0.2], [0.1, 0, 0.28], 1.5);
  add(group([pine()]), [4.55, -1.6, -1.3], [-0.1, 0, -0.35], 0.78);

  // barraca
  add(group([
    mesh(extrude(polyShape([[-0.62, -0.4], [0.62, -0.4], [0, 0.52]]), 1.0, 0.06, 5), std(AMB)),
    mesh(extrude(polyShape([[-0.2, -0.4], [0.2, -0.4], [0, 0.2]]), 0.02, 0.012, 3), std('#b9731a'), [0, -0.03, 0.57]),
    mesh(cyl(0.02, 0.02, 0.32, 10), STEEL, [0, 0.72, 0.5]),
    mesh(extrude(polyShape([[0, 0], [0.24, -0.07], [0, -0.14]]), 0.012, 0.004, 2), std(G), [0.02, 0.86, 0.5]),
  ]), [-0.7, 1.8, -1.4], [0.18, 0.62, -0.1], 1.0);

  // bússola
  const face = canvasTex(512, 512, (c, S) => {
    const U = S / 2; c.translate(U, U); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#fbfaf4'; c.beginPath(); c.arc(0, 0, U, 0, TAU); c.fill();
    for (let i = 0; i < 48; i++) { c.save(); c.rotate(i / 48 * TAU); c.fillStyle = i % 4 ? '#a9acb0' : INK; c.fillRect(-0.007 * U, -0.94 * U, 0.014 * U, (i % 4 ? 0.07 : 0.12) * U); c.restore(); }
    c.font = `700 ${0.22 * U}px Inter`;
    [['N', 0, -0.62, G], ['L', 0.62, 0, INK], ['S', 0, 0.62, INK], ['O', -0.62, 0, INK]].forEach(([t, x, y, col]) => { c.fillStyle = col; c.fillText(t, x * U, y * U); });
  });
  add(group([
    mesh(cyl(0.6, 0.6, 0.2, 64), STEEL, [0, 0, 0], [PI / 2, 0, 0]),
    mesh(torus(0.6, 0.055), metal('#e2e5e9', 0.12), [0, 0, 0.1]),
    mesh(new THREE.CircleGeometry(0.555, 64), std('#ffffff', { map: face, roughness: 0.6 }), [0, 0, 0.104]),
    group([
      mesh(new THREE.ConeGeometry(0.075, 0.42, 4), std(AMB, { roughness: 0.35 }), [0, 0.21, 0], [0, 0, 0], [1, 1, 0.3]),
      mesh(new THREE.ConeGeometry(0.075, 0.42, 4), std('#d9dcdf', { roughness: 0.35 }), [0, -0.21, 0], [PI, 0, 0], [1, 1, 0.3]),
    ], [0, 0, 0.135], [0, 0, deg(-38)]),
    mesh(cyl(0.035, 0.035, 0.07, 20), STEEL, [0, 0, 0.14], [PI / 2, 0, 0]),
    mesh(torus(0.12, 0.03, TAU, 24, 10), STEEL, [0, 0.71, 0]),
  ]), [0.2, 0.0, 0.3], [-0.22, -0.3, 0.2], 0.78);

  // binóculo
  const barrel = x => group([
    mesh(latheZ([[0, -0.46], [0.19, -0.46], [0.2, -0.4], [0.2, 0.05], [0.27, 0.2], [0.27, 0.44], [0.25, 0.46], [0, 0.46]], 48), std(DK, { roughness: 0.4 })),
    mesh(torus(0.272, 0.028, TAU, 40, 10), std(G), [0, 0, 0.36]),
    mesh(torus(0.203, 0.022, TAU, 40, 10), std(G), [0, 0, -0.36]),
    mesh(new THREE.CircleGeometry(0.225, 40), std('#16323a', { roughness: 0.04 }), [0, 0, 0.463]),
  ], [x, 0, 0]);
  add(group([barrel(-0.3), barrel(0.3), mesh(rbox(0.34, 0.16, 0.3, 0.06), std(DK), [0, 0.05, 0]), mesh(cyl(0.09, 0.09, 0.2, 24), STEEL, [0, 0.17, 0.02], [PI / 2, 0, 0])]),
    [4.0, 1.0, -1.2], [0.3, -0.62, 0.3], 0.95);

  // lanterna de acampamento
  const bars = [0, 1, 2, 3].map(i => mesh(cyl(0.014, 0.014, 0.52, 8), STEEL, [Math.cos(i * PI / 2 + 0.4) * 0.275, -0.06, Math.sin(i * PI / 2 + 0.4) * 0.275]));
  add(group([
    mesh(cyl(0.3, 0.34, 0.18, 40), std(G), [0, -0.4, 0]),
    mesh(cyl(0.24, 0.24, 0.5, 40), glow('#ffe2a0', 1.5), [0, -0.06, 0]),
    ...bars,
    mesh(lathe([[0, 0.18], [0.33, 0.18], [0.3, 0.3], [0.12, 0.36], [0, 0.36]]), std(G)),
    mesh(torus(0.3, 0.022, PI, 40, 10), STEEL, [0, 0.3, 0]),
    mesh(sph(0.06, 20, 14), STEEL, [0, 0.38, 0]),
  ]), [-4.55, -0.6, -0.5], [0.1, 0.3, 0.22], 0.95);

  // placa de trilha
  const arrow = polyShape([[-0.55, -0.13], [0.38, -0.13], [0.6, 0], [0.38, 0.13], [-0.55, 0.13]]);
  add(group([
    mesh(cyl(0.055, 0.065, 1.55, 16), std(WOOD)),
    mesh(extrude(arrow, 0.06, 0.02, 3), std(SAND), [0.1, 0.5, 0.08], [0, 0, 0.06]),
    mesh(extrude(arrow, 0.06, 0.02, 3), std('#e7d3a4'), [-0.1, 0.14, 0.08], [0, PI, -0.05]),
    mesh(rbox(0.5, 0.035, 0.02, 0.008), std(G), [0.02, 0.5, 0.135], [0, 0, 0.06]),
    mesh(rbox(0.36, 0.035, 0.02, 0.008), std(WOOD), [-0.02, 0.14, 0.135], [0, 0, 0.05]),
  ]), [-3.2, -1.9, 0.5], [0.05, 0.25, -0.2], 0.9);

  // pino de mapa
  add(group([
    mesh(lathe([[0, -0.8], [0.12, -0.55], [0.26, -0.26], [0.345, -0.06], [0.36, 0.06], [0.33, 0.21], [0.25, 0.32], [0.13, 0.395], [0, 0.42]]), std(G, { roughness: 0.35 })),
    mesh(sph(0.15, 24, 16), std('#ffffff'), [0, 0.07, 0.26]),
  ]), [-1.55, 1.05, 0.7], [0.2, 0.3, 0.3], 0.62);

  // mosquetão
  add(group([
    mesh(tube([[-0.28, 0.52, 0], [0.08, 0.63, 0], [0.35, 0.42, 0], [0.4, 0, 0], [0.34, -0.45, 0], [0.05, -0.63, 0], [-0.27, -0.5, 0], [-0.31, 0, 0]], 0.055, { closed: true, seg: 96, radial: 14 }), metal('#31c98b', 0.3)),
    mesh(capsule(0.062, 0.52, 14), STEEL, [-0.305, 0.02, 0]),
  ]), [-0.55, -1.95, 1.4], [0.2, 0.3, 0.9], 0.8);

  // folhas
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, -0.6); leafShape.bezierCurveTo(0.52, -0.3, 0.46, 0.36, 0, 0.66); leafShape.bezierCurveTo(-0.46, 0.36, -0.52, -0.3, 0, -0.6);
  const leaf = col => {
    let g = extrude(leafShape, 0.04, 0.03, 4, 28); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + 0.55 * p.getX(i) ** 2 + 0.12 * p.getY(i) ** 2);
    g = crease(g, 50);
    return group([mesh(g, std(col, { roughness: 0.4 })), mesh(capsule(0.016, 1.3, 8), std(GD), [0, -0.08, 0.075]), mesh(capsule(0.022, 0.26, 8), std(GD), [0, -0.72, 0.06])]);
  };
  add(leaf('#3fcb8c'), [3.2, 2.1, 0.2], [0.3, -0.3, -0.7], 0.66);
  add(leaf(G), [0.9, -2.25, -0.3], [-0.3, 0.4, 0.9], 0.5);

  smalls(items, 31, GL, AMB);
  const cg = tube(CORD, 0.05, { seg: 460, radial: 14 });
  const cord = group([mesh(cg, std('#ffffff', { map: cordTex('#f4f1e6', G, 100), roughness: 0.7 }))]);
  return { items, cord, balls: [G, GL] };
}

// ================================================================= MUNDO B · MÚSICA
function worldSom() {
  const Y = '#ffc61a', YL = '#ffe37a', DK = '#26282c', D2 = '#3b3e44', W = '#ffffff', MAPLE = '#ecc98f';
  const items = [], add = (o, p, r = [0, 0, 0], s = 1, x = {}) => items.push({ o, p, r, s, ...x });

  add(card((c, w, h) => {
    uiHead(c, 'Tocando agora', Y);
    for (let i = 0; i < 24; i++) {
      const hgt = 44 + 236 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6 + 1));
      c.fillStyle = i < 10 ? Y : 'rgba(255,255,255,0.32)'; rr(c, 84 + i * 35.6, 392 - hgt / 2, 21, hgt, 10); c.fill();
    }
    c.fillStyle = '#ffffff'; c.font = '800 150px Inter'; c.fillText('02:14', 74, 718);
    c.fillStyle = Y; c.beginPath(); c.arc(w - 146, 664, 64, 0, TAU); c.fill();
    c.fillStyle = '#16171b'; c.beginPath(); c.moveTo(w - 166, 630); c.lineTo(w - 166, 698); c.lineTo(w - 110, 664); c.closePath(); c.fill();
  }), [-2.25, -0.35, 1.0], [0.05, 0.32, -0.07], 1.1, { card: true });

  // caixa de som
  const cone = (r, y, cap) => group([
    mesh(torus(r, r * 0.13, TAU, 48, 12), STEEL, [0, y, 0.33]),
    mesh(latheZ([[r, 0.33], [r * 0.4, 0.27], [0, 0.27]], 48), std(D2, { roughness: 0.6 }), [0, y, 0]),
    mesh(sph(r * 0.36, 28, 18), std(cap, { roughness: 0.35 }), [0, y, 0.265], [0, 0, 0], [1, 1, 0.5]),
  ]);
  add(group([
    mesh(rbox(0.86, 1.26, 0.6, 0.13), std(Y)),
    mesh(rbox(0.72, 1.12, 0.05, 0.09), std(DK, { roughness: 0.6 }), [0, 0, 0.29]),
    cone(0.27, -0.2, DK), cone(0.13, 0.33, Y),
  ]), [2.35, -0.85, 0.7], [0.08, -0.5, 0.12], 1.65);

  // microfone
  const grille = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#000'; c.beginPath(); c.arc(32, 32, 19, 0, TAU); c.fill(); }, { srgb: false, repeat: [44, 22] });
  add(group([
    mesh(sph(0.3, 48, 32), metal('#d5d9dd', 0.34, { bumpMap: grille, bumpScale: 2.4 }), [0, 0.56, 0]),
    mesh(torus(0.302, 0.032, TAU, 48, 12), std(Y), [0, 0.56, 0], [PI / 2, 0, 0]),
    mesh(cyl(0.17, 0.2, 0.13, 32), std(D2), [0, 0.24, 0]),
    mesh(lathe([[0, -0.78], [0.1, -0.78], [0.125, -0.72], [0.165, 0.18], [0, 0.18]]), std(DK, { roughness: 0.4 })),
    mesh(cyl(0.151, 0.146, 0.1, 32), std(Y), [0, -0.2, 0]),
  ], [0, -0.1, 0]), [1.15, 1.5, -0.3], [0.15, 0.2, -0.6], 1.05);

  // fone de ouvido
  const cup = sx => group([
    mesh(cyl(0.3, 0.3, 0.16, 48), std(Y), [0, 0, 0], [0, 0, PI / 2]),
    mesh(torus(0.235, 0.085, TAU, 40, 16), std(DK, { roughness: 0.7 }), [-sx * 0.1, 0, 0], [0, PI / 2, 0]),
    mesh(cyl(0.2, 0.2, 0.03, 40), std(DK), [sx * 0.09, 0, 0], [0, 0, PI / 2]),
    mesh(torus(0.2, 0.018, TAU, 40, 8), STEEL, [sx * 0.1, 0, 0], [0, PI / 2, 0]),
    mesh(rbox(0.06, 0.32, 0.1, 0.03), std(DK), [sx * 0.02, 0.3, 0]),
  ], [sx * 0.62, -0.14, 0]);
  add(group([
    mesh(torus(0.62, 0.045, PI, 64, 12), std(DK), [0, 0.1, 0]),
    mesh(torus(0.62, 0.075, PI * 0.42, 40, 14), std(Y), [0, 0.1, 0], [0, 0, PI * 0.29]),
    cup(-1), cup(1),
  ]), [-3.55, 1.2, -0.2], [0.1, 0.45, 0.26], 1.45);

  // disco de vinil
  const vinyl = canvasTex(1024, 1024, (c, S) => {
    const U = S / 2; c.translate(U, U);
    c.fillStyle = '#0d0d0f'; c.beginPath(); c.arc(0, 0, U, 0, TAU); c.fill();
    for (let r = 0.38; r < 0.97; r += 0.012) { c.strokeStyle = `rgba(255,255,255,${0.03 + 0.05 * Math.abs(Math.sin(r * 61))})`; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, r * U, 0, TAU); c.stroke(); }
    const cg = c.createConicGradient(0.5, 0, 0);
    [[0, 0.3], [0.07, 0], [0.43, 0], [0.5, 0.3], [0.57, 0], [0.93, 0], [1, 0.3]].forEach(([p, a]) => cg.addColorStop(p, `rgba(255,255,255,${a})`));
    c.fillStyle = cg; c.beginPath(); c.arc(0, 0, 0.97 * U, 0, TAU); c.arc(0, 0, 0.37 * U, 0, TAU, true); c.fill();
    c.fillStyle = Y; c.beginPath(); c.arc(0, 0, 0.33 * U, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.012 * U; c.beginPath(); c.arc(0, 0, 0.26 * U, 0, TAU); c.stroke();
    c.fillStyle = INK; rr(c, -0.17 * U, -0.17 * U, 0.34 * U, 0.03 * U, 0.015 * U); c.fill(); rr(c, -0.11 * U, 0.13 * U, 0.22 * U, 0.024 * U, 0.012 * U); c.fill();
    c.fillStyle = '#f4f1e8'; c.beginPath(); c.arc(0, 0, 0.035 * U, 0, TAU); c.fill();
  });
  const side = std('#0d0d0f', { roughness: 0.35 }), top = std('#ffffff', { map: vinyl, roughness: 0.32 });
  const disc = new THREE.Mesh(cyl(0.8, 0.8, 0.035, 96), [side, top, top]); disc.castShadow = disc.receiveShadow = true;
  add(group([disc]), [-0.6, 1.75, -1.4], [1.12, 0, 0.2], 1.15);

  // fita cassete
  const tape = canvasTex(1024, 512, (c, w, h) => {
    c.fillStyle = Y; rr(c, 0, 0, w, h, 34); c.fill();
    c.fillStyle = '#ffffff'; rr(c, 60, 44, w - 120, 150, 18); c.fill();
    c.fillStyle = INK; c.font = '800 66px Inter'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('LADO A', 96, 122);
    c.fillStyle = '#c9ccd0'; c.fillRect(420, 96, 480, 10); c.fillRect(420, 136, 330, 10);
    c.fillStyle = '#17181b'; rr(c, 230, 250, 564, 190, 95); c.fill();
    for (const x of [350, 674]) { c.fillStyle = '#f4f1e8'; c.beginPath(); c.arc(x, 345, 62, 0, TAU); c.fill(); c.fillStyle = '#17181b'; c.beginPath(); c.arc(x, 345, 24, 0, TAU); c.fill(); }
  });
  add(group([
    mesh(rbox(1.25, 0.8, 0.14, 0.06), std(DK, { roughness: 0.4 })),
    mesh(new THREE.PlaneGeometry(1.1, 0.55), std('#ffffff', { map: tape, roughness: 0.55, transparent: true }), [0, 0.06, 0.072]),
    mesh(rbox(0.72, 0.15, 0.16, 0.03), std(D2), [0, -0.31, 0]),
  ]), [0.2, 0.0, 0.3], [0.1, -0.3, 0.25], 0.8);

  // teclas
  const keys = [mesh(rbox(1.52, 0.12, 0.64, 0.05), std(Y), [0, -0.07, 0])];
  for (let i = 0; i < 7; i++) keys.push(mesh(rbox(0.19, 0.1, 0.56, 0.03), std(W, { roughness: 0.3 }), [(i - 3) * 0.207, 0.035, 0.01]));
  for (const i of [0, 1, 3, 4, 5]) keys.push(mesh(rbox(0.11, 0.1, 0.34, 0.03), std(DK, { roughness: 0.3 }), [(i - 2.5) * 0.207, 0.1, -0.1]));
  add(group(keys), [4.0, 1.05, -1.2], [1.0, -0.45, 0.28], 0.95);

  // notas
  const head = (x, y, col) => mesh(sph(0.2, 32, 22), std(col, { roughness: 0.35 }), [x, y, 0], [0, 0, 0.42], [1.22, 0.86, 0.8]);
  const stem = (x, y0, y1, col) => mesh(cyl(0.034, 0.034, y1 - y0, 14), std(col, { roughness: 0.35 }), [x, (y0 + y1) / 2, 0]);
  add(group([
    head(-0.38, -0.5, DK), head(0.34, -0.4, DK), stem(-0.17, -0.48, 0.52, DK), stem(0.55, -0.38, 0.62, DK),
    mesh(rbox(0.8, 0.15, 0.075, 0.03), std(DK, { roughness: 0.35 }), [0.19, 0.53, 0], [0, 0, Math.atan2(0.1, 0.72)]),
  ]), [-4.55, -0.55, -0.5], [0.1, 0.3, -0.12], 0.9);
  add(group([
    head(-0.1, -0.5, Y), stem(0.11, -0.48, 0.55, Y),
    mesh(tube([[0.11, 0.55, 0], [0.34, 0.36, 0], [0.42, 0.12, 0], [0.33, -0.06, 0]], 0.05, { seg: 40, radial: 12 }), std(Y, { roughness: 0.35 })),
  ]), [3.2, 2.1, 0.2], [0.1, -0.3, -0.25], 0.62);

  // baquetas
  const stick = lathe([[0, -0.8], [0.045, -0.8], [0.05, -0.75], [0.045, 0.45], [0.028, 0.68], [0.04, 0.74], [0.046, 0.8], [0.03, 0.85], [0, 0.86]], 24);
  add(group([mesh(stick, std(MAPLE), [0, 0, 0], [0, 0, 0.32]), mesh(stick, std(MAPLE), [0, 0, 0.11], [0, 0, -0.34])]), [-3.2, -1.85, 0.5], [0.2, 0.2, 0.3], 0.95);

  // botão de volume
  const knurl = canvasTex(64, 4, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#000'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, '#000'); c.fillStyle = g; c.fillRect(0, 0, w, h); }, { srgb: false, repeat: [48, 1] });
  add(group([
    mesh(cyl(0.36, 0.4, 0.3, 64), metal('#dfe3e7', 0.26, { bumpMap: knurl, bumpScale: 2.5 }), [0, 0, 0], [PI / 2, 0, 0]),
    mesh(new THREE.CircleGeometry(0.34, 48), metal('#cfd3d7', 0.4), [0, 0, 0.152]),
    mesh(rbox(0.05, 0.2, 0.03, 0.012), std(Y), [0, 0.2, 0.158]),
    mesh(cyl(0.48, 0.48, 0.05, 64), std(DK), [0, 0, -0.16], [PI / 2, 0, 0]),
  ]), [-1.55, 1.05, 0.7], [-0.3, 0.4, 0.5], 0.55);

  // onda de áudio
  add(group([0.3, 0.7, 1.1, 0.6, 0.95, 0.45, 0.25].map((hh, i) => mesh(capsule(0.07, hh, 14), std(i === 2 ? W : Y, { roughness: 0.4 }), [(i - 3) * 0.23, 0, 0]))),
    [-0.55, -1.95, 1.4], [0.1, 0.3, 0.1], 0.8);

  // palhetas
  const pick = new THREE.Shape(); pick.moveTo(0, -0.36); pick.quadraticCurveTo(0.36, 0.1, 0.27, 0.27); pick.quadraticCurveTo(0, 0.42, -0.27, 0.27); pick.quadraticCurveTo(-0.36, 0.1, 0, -0.36);
  add(group([mesh(extrude(pick, 0.03, 0.016, 3), std(W, { roughness: 0.3 }))]), [0.9, -2.25, -0.3], [0.4, 0.5, 0.3], 0.62);
  add(group([mesh(extrude(pick, 0.03, 0.016, 3), std(Y, { roughness: 0.3 }))]), [4.55, -1.6, -1.3], [-0.3, -0.5, -0.6], 0.66);

  smalls(items, 47, YL, D2);
  const cg = tube(CORD, 0.038, { seg: 460, radial: 12 });
  const plug = t => along(cg.userData.curve, t, group([
    mesh(cyl(0.07, 0.07, 0.3, 20), std(DK)), mesh(cyl(0.035, 0.035, 0.26, 16), STEEL, [0, t > 0.5 ? 0.27 : -0.27, 0]), mesh(cyl(0.072, 0.072, 0.03, 20), std(Y), [0, t > 0.5 ? 0.12 : -0.12, 0]),
  ]));
  const cord = group([mesh(cg, std('#ffffff', { map: cordTex(DK, Y, 90), roughness: 0.6 })), ...[plug(0.004), plug(0.996)].map(o => { o.scale.setScalar(1.6); return o; })]);
  return { items, cord, balls: [Y, YL] };
}

// ================================================================= MUNDO C · SONO
function crescentShape(R, r, cx, cy) {
  const d = Math.hypot(cx, cy), a = (R * R - r * r + d * d) / (2 * d), h = Math.sqrt(R * R - a * a), ux = cx / d, uy = cy / d;
  const p1 = [a * ux - h * uy, a * uy + h * ux], p2 = [a * ux + h * uy, a * uy - h * ux];
  const s = new THREE.Shape();
  s.absarc(0, 0, R, Math.atan2(p1[1], p1[0]), Math.atan2(p2[1], p2[0]), false);
  s.absarc(cx, cy, r, Math.atan2(p2[1] - cy, p2[0] - cx), Math.atan2(p1[1] - cy, p1[0] - cx), true);
  return s;
}
function pillowGeo(hx, hy, hz, n = 30) {
  const pos = [], idx = [], N1 = (n + 1) * (n + 1), f = i => Math.sin((i / n - 0.5) * PI);
  for (const sg of [1, -1]) for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const u = f(i), v = f(j), k = Math.sqrt(Math.max(0, (1 - u ** 4) * (1 - v ** 4)));
    pos.push(hx * u * (0.88 + 0.12 * v * v), hy * v * (0.88 + 0.12 * u * u), sg * hz * k);
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
    idx.push(a, b, c, b, d, c, N1 + a, N1 + c, N1 + b, N1 + b, N1 + c, N1 + d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function worldSono() {
  const V = '#7c5cf2', VL = '#c3b3ff', NIGHT = '#2d2869', W = '#ffffff', GOLD = '#ffd76b', CREAM = '#fff6dd';
  const items = [], add = (o, p, r = [0, 0, 0], s = 1, x = {}) => items.push({ o, p, r, s, ...x });
  const gold = () => std(GOLD, { roughness: 0.4, emissive: '#ffb93b', emissiveIntensity: 0.18 });

  add(card((c, w, h) => {
    uiHead(c, 'Sono', VL);
    c.fillStyle = GOLD; c.beginPath(); c.arc(w - 118, 112, 34, 0, TAU); c.fill();
    c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(w - 100, 100, 29, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    uiBig(c, '7h 42', 'min', 430, 250);
    const lv = [1, 2, 2, 1, 0, 1, 2, 2, 1, 1, 0, 1, 2, 1, 0, 0], col = ['#ffffff', VL, '#8f73f5'];
    lv.forEach((L, i) => { c.fillStyle = col[L]; rr(c, 84 + i * 54, 556 + L * 58, 44, 48, 14); c.fill(); });
  }), [-2.25, -0.35, 1.0], [0.05, 0.32, -0.07], 1.1, { card: true });

  // despertador
  const clockFace = canvasTex(512, 512, (c, S) => {
    const U = S / 2; c.translate(U, U); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#fffdf7'; c.beginPath(); c.arc(0, 0, U, 0, TAU); c.fill();
    for (let i = 0; i < 12; i++) { if (i % 3 === 0) continue; c.save(); c.rotate(i / 12 * TAU); c.fillStyle = '#9d9aa8'; rr(c, -0.02 * U, -0.86 * U, 0.04 * U, 0.12 * U, 0.02 * U); c.fill(); c.restore(); }
    c.fillStyle = NIGHT; c.font = `800 ${0.24 * U}px Inter`;
    [['12', 0, -0.7], ['3', 0.72, 0], ['6', 0, 0.72], ['9', -0.72, 0]].forEach(([t, x, y]) => c.fillText(t, x * U, y * U));
    c.lineCap = 'round'; c.strokeStyle = NIGHT;
    c.lineWidth = 0.075 * U; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(deg(210)) * 0.4 * U, -Math.cos(deg(210)) * 0.4 * U); c.stroke();
    c.lineWidth = 0.055 * U; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -0.6 * U); c.stroke();
    c.fillStyle = V; c.beginPath(); c.arc(0, 0, 0.07 * U, 0, TAU); c.fill();
  });
  const bell = sx => mesh(new THREE.SphereGeometry(0.21, 32, 16, 0, TAU, 0, PI / 2), metal('#e6e9ec', 0.18), [sx * 0.36, 0.5, 0], [0, 0, -sx * 0.6]);
  add(group([
    mesh(cyl(0.52, 0.52, 0.3, 64), std(V), [0, 0, 0], [PI / 2, 0, 0]),
    mesh(torus(0.52, 0.04, TAU, 64, 12), STEEL, [0, 0, 0.15]),
    mesh(new THREE.CircleGeometry(0.48, 64), std('#ffffff', { map: clockFace, roughness: 0.55, emissive: '#ffffff', emissiveMap: clockFace, emissiveIntensity: 0.15 }), [0, 0, 0.153]),
    bell(-1), bell(1),
    mesh(cyl(0.018, 0.018, 0.2, 10), STEEL, [0, 0.6, 0]), mesh(sph(0.06, 20, 14), STEEL, [0, 0.7, 0]),
    mesh(capsule(0.045, 0.22, 12), STEEL, [-0.32, -0.55, 0], [0, 0, -0.45]), mesh(capsule(0.045, 0.22, 12), STEEL, [0.32, -0.55, 0], [0, 0, 0.45]),
  ]), [2.35, -0.85, 0.7], [0.05, -0.45, 0.12], 1.7);

  // abajur
  add(group([
    mesh(lathe([[0, -0.72], [0.28, -0.72], [0.3, -0.68], [0.1, -0.62], [0.05, -0.5], [0.05, 0.02], [0, 0.02]]), metal('#ecd6ab', 0.25)),
    mesh(lathe([[0.5, -0.02], [0.27, 0.54], [0.2, 0.56], [0, 0.56]], 56), std(V, { roughness: 0.55, emissive: '#ffb65a', emissiveIntensity: 0.12 }), [0, 0, 0]),
    mesh(new THREE.CircleGeometry(0.47, 48), glow('#ffe7b0', 1.5), [0, -0.015, 0], [PI / 2, 0, 0]),
    mesh(torus(0.5, 0.022, TAU, 56, 10), std(W), [0, -0.02, 0], [PI / 2, 0, 0]),
  ], [0, 0.1, 0]), [1.15, 1.5, -0.3], [0.28, 0.1, -0.3], 1.1);

  // lua
  add(group([mesh(extrude(crescentShape(0.62, 0.52, 0.3, 0.1), 0.2, 0.09, 6, 40), gold())]), [-3.55, 1.25, -0.2], [0.05, 0.35, 0.35], 1.5);

  // nuvens
  const cloud = () => group([[-0.45, 0, 0, 0.3], [-0.1, 0.13, 0, 0.4], [0.3, 0.03, 0, 0.34], [0.6, -0.06, 0, 0.22], [0.05, -0.12, 0.06, 0.36]].map(([x, y, z, r]) => mesh(sph(r, 36, 24), std(W, { roughness: 0.75 }), [x, y, z])), [0, 0, 0], [0, 0, 0], [1, 1, 0.75]);
  add(group([cloud()]), [-0.6, 1.8, -1.4], [0.1, 0.3, 0.05], 1.15);
  add(group([cloud()]), [4.55, -1.6, -1.3], [0, -0.4, -0.1], 0.7);

  // ovelha
  const wool = [[0, 0, 0, 0.36], [-0.3, 0.05, 0, 0.28], [0.3, 0.04, 0, 0.28], [-0.12, 0.2, 0.08, 0.26], [0.15, 0.2, -0.05, 0.26], [0, -0.1, 0.2, 0.26], [0, -0.08, -0.2, 0.26], [-0.2, -0.12, 0, 0.26], [0.2, -0.12, 0.05, 0.26]];
  add(group([
    ...wool.map(([x, y, z, r]) => mesh(sph(r, 28, 20), std(W, { roughness: 0.8 }), [x, y, z])),
    mesh(sph(0.2, 28, 20), std(NIGHT, { roughness: 0.5 }), [0.52, 0.08, 0.02], [0, 0, 0], [0.92, 1.08, 0.9]),
    mesh(sph(0.11, 20, 14), std(W, { roughness: 0.8 }), [0.48, 0.28, 0.02]),
    mesh(capsule(0.045, 0.1, 10), std(NIGHT), [0.44, 0.2, 0.18], [0.9, 0, 0.5]), mesh(capsule(0.045, 0.1, 10), std(NIGHT), [0.44, 0.2, -0.14], [-0.9, 0, 0.5]),
    mesh(sph(0.028, 12, 8), std(W), [0.68, 0.12, 0.09]), mesh(sph(0.028, 12, 8), std(W), [0.68, 0.12, -0.05]),
    ...[[-0.2, 0.14], [0.2, 0.14], [-0.2, -0.12], [0.2, -0.12]].map(([x, z]) => mesh(capsule(0.05, 0.24, 10), std(NIGHT), [x, -0.42, z])),
  ]), [0.2, 0.02, 0.3], [0.1, -0.5, 0.08], 0.85);

  // travesseiro
  add(group([mesh(pillowGeo(0.75, 0.5, 0.2), std(VL, { roughness: 0.7 }))]), [4.0, 1.0, -1.2], [0.4, -0.5, 0.25], 1.0);

  // xícara de chá
  const steam = (x, ph) => mesh(tube([[x, 0.5, 0], [x + 0.08 * ph, 0.64, 0.03], [x - 0.05 * ph, 0.8, 0], [x + 0.06 * ph, 0.98, -0.02]], 0.024, { seg: 40, radial: 8 }), std(W, { transparent: true, opacity: 0.75, roughness: 0.9 }));
  add(group([
    mesh(lathe([[0, -0.4], [0.3, -0.4], [0.36, -0.34], [0.4, 0.3], [0.42, 0.4], [0.38, 0.4], [0.36, 0.3], [0.33, -0.3], [0, -0.3]]), std(W, { roughness: 0.3 })),
    mesh(new THREE.CircleGeometry(0.365, 40), std('#e2a83c', { roughness: 0.15 }), [0, 0.27, 0], [-PI / 2, 0, 0]),
    mesh(torus(0.2, 0.05, PI, 32, 12), std(W, { roughness: 0.3 }), [0.4, 0, 0], [0, 0, -PI / 2]),
    mesh(lathe([[0, -0.46], [0.42, -0.46], [0.58, -0.4], [0.56, -0.38], [0, -0.4]]), std(VL)),
    steam(-0.1, 1), steam(0.12, -1),
  ]), [-4.55, -0.55, -0.5], [0.25, 0.2, 0.2], 0.95);

  // livro
  add(group([
    mesh(rbox(0.9, 1.2, 0.035, 0.015), std(V), [0, 0, 0.1]), mesh(rbox(0.9, 1.2, 0.035, 0.015), std(V), [0, 0, -0.1]),
    mesh(rbox(0.045, 1.2, 0.235, 0.02), std(V), [-0.43, 0, 0]),
    mesh(rbox(0.83, 1.12, 0.17, 0.01), std(CREAM, { roughness: 0.8 }), [0.015, 0, 0]),
    mesh(extrude(crescentShape(0.2, 0.17, 0.1, 0.03), 0.01, 0.008, 2, 24), gold(), [0.02, 0.18, 0.125]),
    mesh(rbox(0.07, 0.3, 0.012, 0.005), gold(), [0.2, -0.68, 0.02]),
  ]), [-3.2, -1.85, 0.5], [0.3, 0.5, -0.3], 0.82);

  // zzz
  const zShape = polyShape([[-0.3, 0.36], [0.3, 0.36], [0.3, 0.22], [-0.08, -0.22], [0.3, -0.22], [0.3, -0.36], [-0.3, -0.36], [-0.3, -0.22], [0.08, 0.22], [-0.3, 0.22]]);
  const zed = (col, p, s) => mesh(extrude(zShape, 0.12, 0.035, 4), std(col, { roughness: 0.4 }), p, [0, 0, -0.08], s);
  add(group([zed(V, [-0.45, -0.4, 0], 1), zed('#a48cf8', [0.12, 0.12, 0], 0.72), zed(NIGHT, [0.52, 0.5, 0], 0.5)]), [3.1, 2.0, 0.2], [0.1, -0.35, 0.1], 0.78);

  // máscara de dormir
  const mk = new THREE.Shape(); mk.moveTo(-0.7, 0.05); mk.bezierCurveTo(-0.72, 0.38, -0.2, 0.42, 0, 0.3); mk.bezierCurveTo(0.2, 0.42, 0.72, 0.38, 0.7, 0.05);
  mk.bezierCurveTo(0.68, -0.3, 0.25, -0.38, 0.12, -0.12); mk.quadraticCurveTo(0, -0.02, -0.12, -0.12); mk.bezierCurveTo(-0.25, -0.38, -0.68, -0.3, -0.7, 0.05);
  const eye = x => group([
    mesh(torus(0.13, 0.02, PI, 24, 8), std(W), [0, 0.02, 0], [0, 0, PI]),
    ...[-0.5, 0, 0.5].map(a => mesh(capsule(0.014, 0.05, 6), std(W), [Math.sin(a) * 0.17, -Math.cos(a) * 0.17 + 0.02, 0], [0, 0, a])),
  ], [x, 0.08, 0.085]);
  add(group([
    mesh(extrude(mk, 0.07, 0.04, 5, 28), std(V, { roughness: 0.6 })), eye(-0.36), eye(0.36),
    mesh(torus(0.7, 0.025, PI, 48, 8), std(NIGHT), [0, 0.05, -0.03], [-PI / 2, 0, 0]),
  ]), [-0.55, -1.95, 1.4], [0.1, 0.2, -0.15], 0.9);

  // estrelas
  const star = col => group([mesh(extrude(starShape(0.5, 0.25), 0.12, 0.07, 5), col === GOLD ? gold() : std(col, { roughness: 0.4 }))]);
  add(star(GOLD), [-1.55, 1.05, 0.7], [0.2, 0.3, 0.2], 0.56);
  add(star(W), [0.9, -2.25, -0.3], [-0.2, 0.4, -0.3], 0.44);
  add(star(GOLD), [-1.95, 2.3, -0.3], [0.1, -0.3, 0.5], 0.4);

  smalls(items, 73, VL, GOLD);
  const cg = tube(CORD, 0.024, { seg: 460, radial: 10 });
  const bulbs = [];
  for (let i = 0; i < 26; i++) bulbs.push(along(cg.userData.curve, (i + 0.5) / 26, group([mesh(cyl(0.035, 0.035, 0.07, 12), std(NIGHT)), mesh(sph(0.075, 20, 14), glow(i % 3 ? '#ffe08a' : '#ffffff', 1.7), [0.11, 0, 0])])));
  const cord = group([mesh(cg, std(NIGHT, { roughness: 0.6 })), ...bulbs]);
  return { items, cord, balls: [V, VL] };
}

export const buildWorlds = () => [worldTrilha(), worldSom(), worldSono()];
