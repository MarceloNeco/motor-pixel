// O relógio: caixa, aro (a peça que chega voando), cristal, coroa, alças, pulseira em laço e mostrador.
// Tudo procedural. Face para +Z, 12 horas para +Y, raio do aro = 1.
import * as THREE from 'three';
import { PI, TAU, deg, clamp, mulberry32, std, metal, mesh, group, rbox, cyl, latheZ, canvasTex, spaced, rr, crease } from './util.js';

const DR = 0.81;      // raio visível do mostrador
const DZ = 0.14;      // altura do mostrador (o cristal fica em 0,2)
const INK = '#1c1e21';
// soma só a cor e não mexe no alfa da camada: o aditivo padrão do three.js soma o alfa também, e o cristal
// sozinho no ar (enquanto o aro voa) virava um disco opaco
const ADD = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };

// ---------------------------------------------------------------- texturas pequenas
const stripes = n => canvasTex(64, 4, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#000'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, '#000');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}, { srgb: false, repeat: [n, 1] });

function grainTex(seed, rep) {
  return canvasTex(256, 256, (c, w, h) => {
    const rnd = mulberry32(seed); const img = c.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = 118 + rnd() * 40; img.data.set([v, v, v, 255], i * 4); }
    c.putImageData(img, 0, 0);
  }, { srgb: false, repeat: rep });
}

// trama de nylon: gomos em fileiras alternadas (x = comprimento da pulseira, y = volta do perfil)
function nylonTex() {
  return canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#7d7d7d'; c.fillRect(0, 0, w, h);
    for (let col = 0; col < 4; col++) for (let row = -1; row < 9; row++) {
      const x = col * 32 + 3, y = row * 16 + (col % 2 ? 8 : 0) + 2;
      const g = c.createLinearGradient(x, 0, x + 26, 0);
      g.addColorStop(0, '#a8a8a8'); g.addColorStop(0.45, '#ffffff'); g.addColorStop(1, '#b4b4b4');
      c.fillStyle = g; rr(c, x, y, 26, 12, 5); c.fill();
    }
  }, { srgb: false, repeat: [56, 5] });
}
// a face de fora da pulseira ocupa v de 0,03 a 0,47 (flipY: y = (1 - v) * h)
// couro: cor de base + duas linhas de costura
function leatherTex(color, stitch) {
  return canvasTex(128, 1024, (c, w, h) => {
    c.fillStyle = color; c.fillRect(0, 0, w, h);
    c.fillStyle = stitch;
    for (const v of [0.075, 0.425]) { const y = (1 - v) * h; rr(c, 22, y - 5, 84, 10, 5); c.fill(); }
  }, { repeat: [42, 1] });
}
// silicone esportivo: três fileiras de furos desencontrados, com o fundo escuro aparecendo
function siliconeTex(color, hole) {
  return canvasTex(128, 1024, (c, w, h) => {
    c.fillStyle = color; c.fillRect(0, 0, w, h);
    for (const [v, x] of [[0.13, 32], [0.25, 96], [0.37, 32]]) {
      const y = (1 - v) * h;
      c.fillStyle = 'rgba(0,0,0,0.16)'; c.beginPath(); c.ellipse(x, y - 3, 19, 15, 0, 0, TAU); c.fill();
      c.fillStyle = hole; c.beginPath(); c.ellipse(x, y, 15, 12, 0, 0, TAU); c.fill();
    }
  }, { repeat: [40, 1] });
}

// ---------------------------------------------------------------- pulseira: fita varrida num laço fechado (plano YZ)
function strapGeometry(loop, halfW, halfT, N = 300) {
  const curve = new THREE.CatmullRomCurve3(loop.map(([y, z]) => new THREE.Vector3(0, y, z)), true, 'centripetal');
  // perfil: estádio (cantos em semicírculo). x ao longo da largura, o para fora do laço.
  const prof = [], K = 7, fx = halfW - halfT;
  prof.push({ x: -fx, o: halfT, nx: 0, no: 1, v: 0.03 }, { x: fx, o: halfT, nx: 0, no: 1, v: 0.47 });
  for (let k = 1; k < K; k++) { const a = PI / 2 - k / K * PI; prof.push({ x: fx + halfT * Math.cos(a), o: halfT * Math.sin(a), nx: Math.cos(a), no: Math.sin(a), v: 0.47 + 0.06 * k / K }); }
  prof.push({ x: fx, o: -halfT, nx: 0, no: -1, v: 0.53 }, { x: -fx, o: -halfT, nx: 0, no: -1, v: 0.97 });
  for (let k = 1; k < K; k++) { const a = -PI / 2 - k / K * PI; prof.push({ x: -fx + halfT * Math.cos(a), o: halfT * Math.sin(a), nx: Math.cos(a), no: Math.sin(a), v: 0.97 + 0.06 * k / K }); }
  prof.push({ x: -fx, o: halfT, nx: 0, no: 1, v: 1.03 });
  const M = prof.length, pos = [], nor = [], uv = [], idx = [];
  const c0 = new THREE.Vector3(); loop.forEach(([y, z]) => c0.add(new THREE.Vector3(0, y, z))); c0.multiplyScalar(1 / loop.length);
  for (let i = 0; i <= N; i++) {
    const u = (i % N) / N, P = curve.getPointAt(u), T = curve.getTangentAt(u);
    const n = new THREE.Vector3(0, -T.z, T.y);
    if (n.dot(P.clone().sub(c0)) < 0) n.negate();
    for (const q of prof) {
      pos.push(q.x, P.y + n.y * q.o, P.z + n.z * q.o);
      nor.push(q.nx, n.y * q.no, n.z * q.no);
      uv.push(i / N, q.v);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M - 1; j++) {
    const a = i * M + j, b = a + 1, c = a + M, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  // confere o sentido das faces contra a normal analítica do primeiro triângulo
  const A = new THREE.Vector3().fromArray(pos, idx[0] * 3), B = new THREE.Vector3().fromArray(pos, idx[1] * 3), C = new THREE.Vector3().fromArray(pos, idx[2] * 3);
  const fn = B.sub(A).cross(C.sub(A)), an = new THREE.Vector3().fromArray(nor, idx[0] * 3);
  if (fn.dot(an) < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
// sai da caixa já curvando para trás: de frente, a pulseira afila em vez de virar uma tábua
const HALF = [[0, -0.06], [0.5, -0.06], [0.85, -0.08], [1.1, -0.2], [1.34, -0.5], [1.47, -1.1], [1.34, -1.8], [0.82, -2.26]];
const LOOP = [...HALF, [0, -2.4], ...HALF.slice(1).reverse().map(([y, z]) => [-y, z])];

// ---------------------------------------------------------------- mostradores (canvas; U = raio)
function dialBase(draw) {
  return canvasTex(1536, 1536, (c, S) => {
    const U = S / 2; c.translate(U, U);
    c.beginPath(); c.arc(0, 0, U, 0, TAU); c.clip();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    draw(c, U);
    // sombra do aro na borda do mostrador (a luz vem de cima e da esquerda): é o que afunda o mostrador na caixa
    const g = c.createRadialGradient(0.045 * U, 0.06 * U, 0.84 * U, 0, 0, 1.02 * U);
    g.addColorStop(0, 'rgba(10,14,20,0)'); g.addColorStop(1, 'rgba(10,14,20,0.42)');
    c.fillStyle = g; c.fillRect(-U, -U, 2 * U, 2 * U);
  });
}

// A · analógico claro, subdial na cor do acento
const dialTrilha = accent => dialBase((c, U) => {
  const g = c.createRadialGradient(-0.25 * U, -0.3 * U, 0.1 * U, 0, 0, U);
  g.addColorStop(0, '#fefdfa'); g.addColorStop(1, '#e9e6dc');
  c.fillStyle = g; c.fillRect(-U, -U, 2 * U, 2 * U);
  for (let i = 0; i < 60; i++) {
    c.save(); c.rotate(i / 60 * TAU);
    if (i % 5 === 0) { if (i !== 0 && i !== 30) { c.fillStyle = INK; rr(c, -0.012 * U, -0.95 * U, 0.024 * U, 0.15 * U, 0.01 * U); c.fill(); } }
    else { c.fillStyle = '#a3a5a8'; c.fillRect(-0.004 * U, -0.95 * U, 0.008 * U, 0.05 * U); }
    c.restore();
  }
  c.fillStyle = INK; c.font = `500 ${0.21 * U}px Inter`; c.fillText('12', 0, -0.74 * U);
  c.fillStyle = accent; c.font = `700 ${0.092 * U}px Inter`; spaced(c, 'SEXTA', 0, -0.44 * U, 0.024 * U);
  c.fillStyle = '#7f8286'; c.font = `600 ${0.07 * U}px Inter`; spaced(c, '20 NOV', 0, -0.33 * U, 0.018 * U);
  // subdial em raios
  const sy = 0.46 * U, sr = 0.27 * U;
  c.save(); c.shadowColor = 'rgba(40,50,45,0.4)'; c.shadowBlur = 0.035 * U; c.shadowOffsetX = 0.006 * U; c.shadowOffsetY = 0.012 * U;
  c.beginPath(); c.arc(0, sy, sr, 0, TAU); c.fillStyle = accent; c.fill(); c.restore();
  const cg = c.createConicGradient(-PI / 2, 0, sy);
  for (let k = 0; k <= 16; k++) cg.addColorStop(k / 16, k % 2 ? 'rgba(255,255,255,0.34)' : 'rgba(0,0,0,0.16)');
  c.beginPath(); c.arc(0, sy, sr, 0, TAU); c.fillStyle = cg; c.fill();
  c.lineWidth = 0.012 * U; c.strokeStyle = 'rgba(0,0,0,0.18)'; c.stroke();
  for (let i = 0; i < 12; i++) { c.save(); c.translate(0, sy); c.rotate(i / 12 * TAU); c.fillStyle = 'rgba(255,255,255,0.92)'; c.fillRect(-0.005 * U, -sr * 0.9, 0.01 * U, sr * (i % 3 ? 0.12 : 0.2)); c.restore(); }
  // janela da bússola às 3 horas
  const wx = 0.52 * U;
  c.beginPath(); c.arc(wx, 0, 0.115 * U, 0, TAU); c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 0.014 * U; c.strokeStyle = '#b9bcc0'; c.stroke();
  c.save(); c.translate(wx, 0); c.rotate(deg(32));
  c.fillStyle = accent; c.beginPath(); c.moveTo(0, -0.07 * U); c.lineTo(0.026 * U, 0); c.lineTo(-0.026 * U, 0); c.fill();
  c.fillStyle = '#c3c6ca'; c.beginPath(); c.moveTo(0, 0.07 * U); c.lineTo(0.026 * U, 0); c.lineTo(-0.026 * U, 0); c.fill();
  c.restore();
  // sombra dos ponteiros de hora e minuto (os ponteiros são peças 3D logo acima)
  c.save(); c.filter = `blur(${0.012 * U}px)`; c.lineCap = 'round'; c.strokeStyle = 'rgba(20,28,24,0.34)';
  for (const [a, len, w] of [[(10 + 9 / 60) / 12 * TAU, 0.52, 0.07], [9 / 60 * TAU, 0.84, 0.052]]) {
    c.lineWidth = w * U; c.beginPath(); c.moveTo(0.02 * U, 0.03 * U); c.lineTo((Math.sin(a) * len + 0.02) * U, (-Math.cos(a) * len + 0.03) * U); c.stroke();
  }
  c.restore();
});

// B · digital esportivo, preto com anel de progresso
const dialSom = accent => dialBase((c, U) => {
  c.fillStyle = '#0b0b0d'; c.fillRect(-U, -U, 2 * U, 2 * U);
  c.lineCap = 'round'; c.lineWidth = 0.07 * U;
  c.strokeStyle = '#25262a'; c.beginPath(); c.arc(0, 0, 0.87 * U, 0, TAU); c.stroke();
  c.strokeStyle = accent; c.beginPath(); c.arc(0, 0, 0.87 * U, -PI / 2, deg(152)); c.stroke();
  for (let i = 0; i < 60; i++) { c.save(); c.rotate(i / 60 * TAU); c.fillStyle = i % 5 ? '#34353a' : '#77797f'; c.fillRect(-0.004 * U, -0.77 * U, 0.008 * U, i % 5 ? 0.03 * U : 0.05 * U); c.restore(); }
  c.fillStyle = accent; c.font = `700 ${0.082 * U}px Inter`; spaced(c, 'SEXTA 20', 0, -0.39 * U, 0.028 * U);
  c.fillStyle = '#ffffff'; c.font = `800 ${0.43 * U}px Inter`; c.fillText('10:09', 0, 0.0);
  c.fillStyle = '#9a9ca2'; c.font = `500 ${0.074 * U}px Inter`; c.fillText('8.412 passos', 0.03 * U, 0.37 * U);
  const tw = c.measureText('8.412 passos').width;
  c.fillStyle = accent; c.beginPath(); c.arc(0.03 * U - tw / 2 - 0.05 * U, 0.37 * U, 0.02 * U, 0, TAU); c.fill();
});

// C · ilustrado: céu de noite, lua e nuvens
const dialNoite = accent => dialBase((c, U) => {
  const g = c.createLinearGradient(0, -U, 0, U);
  g.addColorStop(0, '#4a31c8'); g.addColorStop(0.55, '#7a5cf0'); g.addColorStop(1, '#b6a2ff');
  c.fillStyle = g; c.fillRect(-U, -U, 2 * U, 2 * U);
  const rnd = mulberry32(11);
  for (let i = 0; i < 40; i++) {
    const a = rnd() * TAU, d = Math.sqrt(rnd()) * 0.9 * U, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.9 - 0.1 * U, s = (0.012 + rnd() * 0.03) * U, al = 0.5 + rnd() * 0.5;
    // nenhuma estrela encostada na hora nem na data, nem atrás da lua e das nuvens
    if (y > 0.25 * U || (y > -0.8 * U && y < -0.06 * U && Math.abs(x) < 0.72 * U)) continue;
    c.fillStyle = `rgba(255,255,255,${al})`;
    c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill();
  }
  // lua
  c.save(); c.shadowColor = 'rgba(255,225,150,0.75)'; c.shadowBlur = 0.12 * U;
  const mg = c.createRadialGradient(0.2 * U, 0.3 * U, 0.02 * U, 0.3 * U, 0.42 * U, 0.36 * U);
  mg.addColorStop(0, '#fff0b8'); mg.addColorStop(1, '#ffc94f');
  c.fillStyle = mg; c.beginPath(); c.arc(0.3 * U, 0.42 * U, 0.33 * U, 0, TAU); c.fill(); c.restore();
  c.fillStyle = 'rgba(240,170,60,0.35)';
  for (const [x, y, r] of [[0.4, 0.34, 0.06], [0.22, 0.5, 0.045], [0.44, 0.56, 0.035], [0.16, 0.3, 0.028]]) { c.beginPath(); c.arc(x * U, y * U, r * U, 0, TAU); c.fill(); }
  // nuvens
  const cloud = (x, y, s, col) => { c.fillStyle = col; for (const [dx, dy, r] of [[-0.3, 0.06, 0.2], [-0.08, -0.06, 0.26], [0.2, 0, 0.22], [0.42, 0.08, 0.16], [0.05, 0.14, 0.3]]) { c.beginPath(); c.arc((x + dx * s) * U, (y + dy * s) * U, r * s * U, 0, TAU); c.fill(); } };
  cloud(0.5, 0.86, 1.0, 'rgba(214,202,255,0.95)');
  cloud(-0.42, 0.78, 1.15, '#ffffff');
  cloud(0.12, 0.98, 1.2, '#ffffff');
  c.fillStyle = '#ffffff'; c.font = `700 ${0.074 * U}px Inter`; spaced(c, 'SEXTA 20/11', 0, -0.66 * U, 0.022 * U);
  c.save(); c.shadowColor = 'rgba(40,20,120,0.35)'; c.shadowBlur = 0.03 * U; c.shadowOffsetY = 0.012 * U;
  c.font = `900 ${0.46 * U}px Inter`; c.fillText('22:30', 0, -0.3 * U); c.restore();
});

// escala do aro (variante B): tira de 360° na proporção real da faixa, desenhada girada 180° para o
// texto ficar de pé por fora. A emenda cai às 6 horas, então o "30" é desenhado nas duas pontas.
function scaleTex(base, ink, accent) {
  return canvasTex(8192, 128, (c, w, h) => {
    c.translate(w, h); c.rotate(PI);
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i <= 60; i++) {
      const x = i === 60 ? w : (i / 60 + 0.5) % 1 * w, n = i === 60 ? 30 : i;
      if (n === 0) { c.fillStyle = accent; c.beginPath(); c.moveTo(x - 36, 26); c.lineTo(x + 36, 26); c.lineTo(x, 104); c.fill(); continue; }
      if (n % 10 === 0) { c.fillStyle = ink; c.font = '700 84px Inter'; c.fillText(String(n), x, h / 2 + 4); continue; }
      if (i === 60) continue;
      c.fillStyle = i % 5 ? ink : accent;
      const tw = i % 5 ? 8 : 14, th = i % 5 ? 40 : 70; rr(c, x - tw / 2, (h - th) / 2, tw, th, 4); c.fill();
    }
  });
}
// brilho do cristal: duas faixas diagonais claras, que deslizam quando o relógio vira
function glareTex() {
  return canvasTex(1024, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const band = (x0, wid, a) => {
      const g = c.createLinearGradient(x0, 0, x0 + wid, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.save(); c.transform(1, 0, -0.45, 1, 0, 0); c.fillRect(x0, 0, wid, h); c.restore();
    };
    band(430, 260, 0.085); band(760, 80, 0.06);
  });
}

// ---------------------------------------------------------------- variantes (as três cores do filme)
export const VARIANTS = [
  { id: 'trilha', caseColor: '#e6e9ec', caseRough: 0.12, bezel: 'knurl', flange: '#141517', accent: '#12a366',
    strap: { kind: 'nylon', color: '#1fb876' }, dial: dialTrilha, emissive: 0.06, hands: true },
  { id: 'som', caseColor: '#53565c', caseRough: 0.22, bezel: 'scale', flange: '#0e0f11', accent: '#ffc61a',
    strap: { kind: 'silicone', color: '#ffc21a' }, dial: dialSom, emissive: 0.75, hands: false },
  { id: 'noite', caseColor: '#f1e7d6', caseRough: 0.14, bezel: 'plain', flange: '#2c1f8a', accent: '#7c5cf2',
    strap: { kind: 'leather', color: '#b9a5ff' }, dial: dialNoite, emissive: 0.6, hands: false },
];

export function buildWatch(v) {
  const steel = metal(v.caseColor, v.caseRough);
  const steelSoft = metal(v.caseColor, v.caseRough + 0.2);
  const root = new THREE.Group();

  // caixa: um pouco mais larga que o aro, para o corpo aparecer em volta dele
  root.add(mesh(latheZ([[0, -0.17], [0.65, -0.17], [0.84, -0.15], [0.97, -0.11], [1.04, -0.04], [1.045, 0.02], [1.035, 0.065], [1.0, 0.096], [0.86, 0.1], [0, 0.1]], 128), steel));
  root.add(mesh(new THREE.CircleGeometry(0.62, 64), std('#0c0d10', { roughness: 0.12 }), [0, 0, -0.172], [0, PI, 0]));   // sensor do fundo
  // alças: chifres curtos, afilados e curvados para trás
  const lugShape = new THREE.Shape();
  lugShape.moveTo(0.625, 0.5); lugShape.lineTo(0.625, 0.97); lugShape.quadraticCurveTo(0.625, 1.03, 0.675, 1.03);
  lugShape.quadraticCurveTo(0.735, 1.03, 0.75, 0.96); lugShape.quadraticCurveTo(0.8, 0.78, 0.83, 0.5); lugShape.closePath();
  let lugGeo = new THREE.ExtrudeGeometry(lugShape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 6, curveSegments: 16 });
  lugGeo.translate(0, 0, -0.06);
  { const p = lugGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - 0.35 * Math.max(0, p.getY(i) - 0.7)); }
  lugGeo = crease(lugGeo, 44);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) root.add(mesh(lugGeo, steel, [0, 0, -0.04], [0, 0, 0], [sx, sy, 1]));
  for (const sy of [-1, 1]) root.add(mesh(cyl(0.028, 0.028, 1.3, 16), steelSoft, [0, sy * 0.97, -0.14], [0, 0, PI / 2]));
  // coroa (3 horas) com anel de acento, e botão (4 e meia)
  root.add(group([
    mesh(cyl(0.085, 0.085, 0.07, 32), steelSoft, [0.035, 0, 0], [0, 0, PI / 2]),
    mesh(cyl(0.118, 0.118, 0.115, 48), metal(v.caseColor, v.caseRough + 0.12, { bumpMap: stripes(34), bumpScale: 2.2 }), [0.115, 0, 0], [0, 0, PI / 2]),
    mesh(cyl(0.122, 0.122, 0.022, 48), std(v.accent, { roughness: 0.35 }), [0.062, 0, 0], [0, 0, PI / 2]),
    mesh(cyl(0.1, 0.1, 0.01, 40), steel, [0.176, 0, 0], [0, 0, PI / 2]),
  ], [1.03, 0, -0.03]));
  const pa = deg(-40);
  root.add(mesh(rbox(0.085, 0.23, 0.1, 0.035), steel, [Math.cos(pa) * 1.065, Math.sin(pa) * 1.065, -0.03], [0, 0, pa]));

  // mostrador + anel interno inclinado
  const dialTex = v.dial(v.accent);
  root.add(mesh(new THREE.CircleGeometry(DR, 128), new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.55, emissive: '#ffffff', emissiveMap: dialTex, emissiveIntensity: v.emissive }), [0, 0, DZ]));
  root.add(mesh(latheZ([[0.868, 0.19], [DR - 0.002, DZ]], 128), std(v.flange, { roughness: 0.3 })));

  // ponteiros (só no analógico)
  let secHand = null, subHand = null;
  if (v.hands) {
    const hand = (w, len, tail, z, mat, ang) => { const g = rbox(w, len, 0.014, w / 2); g.translate(0, len / 2 - tail, 0); return mesh(g, mat, [0, 0, z], [0, 0, -ang]); };
    const dark = std('#1d1f22', { roughness: 0.3, metalness: 0.4 });
    root.add(hand(0.058, 0.5, 0.08, DZ + 0.016, dark, (10 + 9 / 60) / 12 * TAU));
    root.add(hand(0.042, 0.78, 0.1, DZ + 0.028, dark, 9 / 60 * TAU));
    secHand = hand(0.014, 0.92, 0.2, DZ + 0.04, std(v.accent, { roughness: 0.35 }), 0); root.add(secHand);
    root.add(mesh(cyl(0.05, 0.05, 0.045, 32), steel, [0, 0, DZ + 0.027], [PI / 2, 0, 0]));
    subHand = hand(0.02, 0.2, 0.03, DZ + 0.01, metal('#f4f5f6', 0.25), 0); subHand.position.set(0, -0.46 * DR, DZ + 0.01); root.add(subHand);
    root.add(mesh(cyl(0.022, 0.022, 0.03, 20), steel, [0, -0.46 * DR, DZ + 0.014], [PI / 2, 0, 0]));
  }

  // aro + cristal: a peça que chega voando e encaixa
  const bezel = new THREE.Group();
  bezel.add(mesh(latheZ([[0.862, 0.1], [0.988, 0.1], [1.002, 0.125], [0.995, 0.155]], 128), steel));
  bezel.add(mesh(latheZ([[0.885, 0.207], [0.868, 0.19], [0.868, 0.1]], 128), steel));
  let band;
  if (v.bezel === 'knurl') band = metal(v.caseColor, 0.2, { bumpMap: stripes(132), bumpScale: 2.4 });
  else if (v.bezel === 'scale') band = new THREE.MeshStandardMaterial({ map: scaleTex('#2b2d31', '#e9eaec', v.accent), roughness: 0.34, metalness: 0.75 });
  else band = metal(v.caseColor, 0.1);
  bezel.add(mesh(latheZ([[0.995, 0.155], [0.972, 0.186]], 128), v.bezel === 'knurl' ? band : steel));
  bezel.add(mesh(latheZ([[0.972, 0.186], [0.885, 0.207]], 160), band));
  // cristal: só os reflexos, somados por cima do mostrador
  const glass = mesh(latheZ([[0.886, 0.196], [0.8, 0.203], [0.5, 0.21], [0, 0.212]], 96),
    new THREE.MeshPhysicalMaterial({ color: '#000000', roughness: 0.03, metalness: 0, ior: 1.5, transparent: true, ...ADD, depthWrite: false, envMapIntensity: 0.3 }));
  glass.castShadow = false; glass.receiveShadow = false; glass.renderOrder = 2;
  bezel.add(glass);
  const gTex = glareTex(); gTex.repeat.set(0.5, 1);
  const glare = new THREE.Mesh(new THREE.CircleGeometry(0.866, 96), new THREE.MeshBasicMaterial({ map: gTex, transparent: true, ...ADD, depthWrite: false }));
  glare.position.z = 0.2135; glare.renderOrder = 3;
  bezel.add(glare);
  root.add(bezel);

  // pulseira
  const k = v.strap.kind;
  let strapMat;
  if (k === 'nylon') { const t = nylonTex(); strapMat = std(v.strap.color, { map: t, bumpMap: t, bumpScale: 5, roughness: 0.82 }); }
  else if (k === 'leather') strapMat = std('#ffffff', { map: leatherTex(v.strap.color, '#f3eeff'), bumpMap: grainTex(5, [60, 6]), bumpScale: 0.6, roughness: 0.6 });
  else strapMat = std('#ffffff', { map: siliconeTex(v.strap.color, '#2b2d31'), bumpMap: grainTex(9, [70, 7]), bumpScale: 0.35, roughness: 0.55 });
  root.add(mesh(strapGeometry(LOOP, 0.585, k === 'nylon' ? 0.046 : 0.04), strapMat));
  if (k !== 'nylon') root.add(mesh(rbox(1.24, 0.26, 0.1, 0.04), steel, [0, -0.45, -2.36], [deg(-9), 0, 0]));   // fivela, atrás

  return {
    root, bezel,
    setTime(t) {
      if (secHand) secHand.rotation.z = -((36 + t) / 60) * TAU;
      if (subHand) subHand.rotation.z = -(0.18 + t * 0.03) * TAU;
    },
    // k de 0 a 1: desliza o brilho do cristal
    setGlare(k) { gTex.offset.x = clamp(k) * 0.5; },
  };
}
