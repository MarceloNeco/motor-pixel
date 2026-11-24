// O fone de ouvido, peça por peça. Tudo é geometria procedural: tornos, toros,
// varreduras e texturas desenhadas em canvas. 1 unidade ≈ 10 cm.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PAL = {
  petroleo: '#0f4a50',
  petroleoEscuro: '#0a3237',
  rose: '#f4b89c',
  creme: '#f3e7d8',
  coral: '#f26a4b',
  grafite: '#2a2f33',
  perola: '#f6f1ea',
  cobre: '#c9713f',
  placa: '#0d6b58',
  ouro: '#e8c06a',
};

const OV = 1.16;           // as conchas são ovais: mais altas do que largas
export const CX = 0.78;    // distância do centro de cada concha ao meio do fone
// quanto cada peça se afasta, ao longo do eixo da concha, na vista explodida
export const AFASTA = { almofada: -0.12, tela: 0.46, driver: 1.0, miolo: 1.54, concha: 2.1 };
export const SOBE_ARCO = 1.0;

const mat = {
  concha: new THREE.MeshPhysicalMaterial({ color: PAL.petroleo, roughness: 0.38, metalness: 0.1, clearcoat: 0.55, clearcoatRoughness: 0.32, side: THREE.DoubleSide }),
  plastico: new THREE.MeshPhysicalMaterial({ color: PAL.petroleoEscuro, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide }),
  rose: new THREE.MeshPhysicalMaterial({ color: PAL.rose, roughness: 0.22, metalness: 1.0, envMapIntensity: 1.7 }),
  roseFosco: new THREE.MeshPhysicalMaterial({ color: PAL.rose, roughness: 0.4, metalness: 0.35, envMapIntensity: 1.3, side: THREE.DoubleSide }),
  couro: new THREE.MeshPhysicalMaterial({ color: PAL.creme, roughness: 0.62, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color('#fff4e6') }),
  costura: new THREE.MeshStandardMaterial({ color: '#d9c4ad', roughness: 0.8 }),
  tecido: new THREE.MeshStandardMaterial({ color: '#12383d', roughness: 0.95 }),
  grafite: new THREE.MeshPhysicalMaterial({ color: PAL.grafite, roughness: 0.4, metalness: 0.85, side: THREE.DoubleSide }),
  perola: new THREE.MeshPhysicalMaterial({ color: PAL.perola, roughness: 0.3, metalness: 0.0, clearcoat: 0.8, clearcoatRoughness: 0.2, side: THREE.DoubleSide }),
  aco: new THREE.MeshPhysicalMaterial({ color: '#d8dadc', roughness: 0.18, metalness: 1.0 }),
  cobre: new THREE.MeshPhysicalMaterial({ color: PAL.cobre, roughness: 0.3, metalness: 1.0 }),
  coral: new THREE.MeshPhysicalMaterial({ color: PAL.coral, roughness: 0.42, metalness: 0.15, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
  chip: new THREE.MeshPhysicalMaterial({ color: '#16191c', roughness: 0.45, metalness: 0.2 }),
  ouro: new THREE.MeshPhysicalMaterial({ color: PAL.ouro, roughness: 0.25, metalness: 1.0 }),
};

function M(geo, material, parent) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// Torno a partir de pontos de controle (raio, altura) suavizados por spline.
function torno(trechos, seg = 128) {
  const pts = [];
  for (const tr of trechos) {
    const v = tr.map(p => new THREE.Vector2(p[0], p[1]));
    const amostras = v.length > 2 ? new THREE.SplineCurve(v).getPoints(v.length * 8) : v;
    for (const p of amostras) pts.push(new THREE.Vector2(Math.max(p.x, 0), p.y));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  g.scale(OV, 1, OV === 1 ? 1 : 1);
  return g;
}

function texturaFuros() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 1024, 1024);
  x.fillStyle = '#000';
  const passo = 44;
  for (let j = -1; j < 26; j++) for (let i = -1; i < 26; i++) {
    const px = i * passo + (j % 2 ? passo / 2 : 0), py = j * passo * 0.866;
    x.beginPath(); x.arc(px, py, 12.5, 0, 6.2832); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}

function texturaPlaca() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = PAL.placa; x.fillRect(0, 0, 1024, 1024);
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  x.lineCap = 'round'; x.lineJoin = 'round';
  for (let k = 0; k < 90; k++) {
    x.strokeStyle = k % 3 ? '#18866f' : '#1f9c82'; x.lineWidth = 5 + rnd() * 4;
    let px = 80 + rnd() * 860, py = 80 + rnd() * 860;
    x.beginPath(); x.moveTo(px, py);
    for (let n = 0; n < 4; n++) {
      const d = 40 + rnd() * 150, dir = Math.floor(rnd() * 8) * Math.PI / 4;
      px += Math.cos(dir) * d; py += Math.sin(dir) * d; x.lineTo(px, py);
    }
    x.stroke();
    x.fillStyle = PAL.ouro; x.beginPath(); x.arc(px, py, 9, 0, 6.2832); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

function texturaRotulo() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = PAL.creme; x.fillRect(0, 0, 1024, 512);
  x.fillStyle = '#123b42';
  x.font = '800 96px "Avenir Next", "Helvetica Neue", sans-serif'; x.textBaseline = 'middle';
  x.fillText('Li-ion 3,7 V', 70, 190);
  x.font = '600 62px "Avenir Next", "Helvetica Neue", sans-serif';
  x.fillText('1200 mAh  ·  4,44 Wh', 70, 330);
  x.fillStyle = PAL.coral; x.fillRect(0, 440, 1024, 72);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ---------- peças de uma concha (eixo local +y aponta para fora da cabeça) ----------

function almofada() {
  const g = new THREE.Group();
  const toro = new THREE.TorusGeometry(0.285, 0.125, 48, 128); toro.rotateX(Math.PI / 2); toro.scale(OV, 0.74, 1);
  M(toro, mat.couro, g).position.y = -0.205;
  const costura = new THREE.TorusGeometry(0.405, 0.006, 8, 128); costura.rotateX(Math.PI / 2); costura.scale(OV * 1.004, 1, 1);
  M(costura, mat.costura, g).position.y = -0.2;
  // base de encaixe e o tecido do fundo
  M(torno([[[0.17, -0.128], [0.385, -0.128]], [[0.385, -0.112], [0.17, -0.112]]]), mat.plastico, g);
  const tecido = new THREE.CircleGeometry(0.2, 64); tecido.rotateX(Math.PI / 2); tecido.scale(OV, 1, 1);
  M(tecido, mat.tecido, g).position.y = -0.13;
  return g;
}

function tela() {
  const g = new THREE.Group();
  M(torno([[[0.215, -0.104], [0.372, -0.104]], [[0.378, -0.098], [0.378, -0.09]], [[0.372, -0.084], [0.215, -0.084]]]), mat.plastico, g);
  const furos = texturaFuros();
  const mFuros = new THREE.MeshPhysicalMaterial({ color: PAL.rose, roughness: 0.3, metalness: 1.0, alphaMap: furos, alphaTest: 0.5, side: THREE.DoubleSide });
  const disco = new THREE.CircleGeometry(0.222, 96); disco.rotateX(Math.PI / 2); disco.scale(OV, 1, 1);
  M(disco, mFuros, g).position.y = -0.094;
  const aro = new THREE.TorusGeometry(0.222, 0.009, 12, 128); aro.rotateX(Math.PI / 2); aro.scale(OV, 1, 1);
  M(aro, mat.rose, g).position.y = -0.094;
  // três garras de encaixe
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094 + 0.5;
    const garra = M(new RoundedBoxGeometry(0.06, 0.03, 0.035, 3, 0.008), mat.plastico, g);
    garra.position.set(Math.cos(a) * 0.335 * OV, -0.078, Math.sin(a) * 0.335); garra.rotation.y = -a;
  }
  return g;
}

function driver() {
  const g = new THREE.Group();
  // cesto
  M(torno([[[0.19, -0.064], [0.25, -0.064]], [[0.256, -0.058], [0.256, -0.03]], [[0.25, -0.024], [0.19, -0.024]]]), mat.grafite, g);
  // diafragma: suspensão em meia-cana, cone e domo
  M(torno([[[0.062, -0.046], [0.1, -0.038], [0.15, -0.046], [0.172, -0.062], [0.186, -0.07], [0.2, -0.062]]]), mat.perola, g);
  M(torno([[[0, -0.078], [0.03, -0.074], [0.052, -0.06], [0.064, -0.044]]]), mat.rose, g);
  // costas: aranha, ímã e tampa
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const raio = M(new RoundedBoxGeometry(0.105, 0.012, 0.03, 2, 0.005), mat.grafite, g);
    raio.position.set(Math.cos(a) * 0.175 * OV, -0.024, Math.sin(a) * 0.175); raio.rotation.y = -a; raio.scale.x = OV + (1 - OV) * Math.abs(Math.sin(a));
  }
  M(new THREE.CylinderGeometry(0.128, 0.128, 0.014, 64), mat.grafite, g).position.y = -0.018;
  M(new THREE.CylinderGeometry(0.086, 0.086, 0.026, 64), mat.cobre, g).position.y = -0.002;
  M(new THREE.CylinderGeometry(0.112, 0.112, 0.052, 64), mat.aco, g).position.y = 0.036;
  M(new THREE.CylinderGeometry(0.05, 0.05, 0.004, 48), mat.rose, g).position.y = 0.064;
  return g;
}

function bateria() {
  const g = new THREE.Group();
  const corpo = M(new RoundedBoxGeometry(0.52, 0.062, 0.36, 5, 0.028), mat.coral, g); corpo.position.y = 0.1;
  const rot = new THREE.MeshPhysicalMaterial({ map: texturaRotulo(), roughness: 0.5 });
  for (const lado of [1, -1]) {
    const p = M(new THREE.PlaneGeometry(0.34, 0.17), rot, g);
    p.rotation.x = -lado * Math.PI / 2; p.position.set(-0.03, 0.1 + lado * 0.0316, 0); p.castShadow = false;
    if (lado < 0) p.rotation.z = Math.PI;
  }
  M(new RoundedBoxGeometry(0.03, 0.05, 0.26, 3, 0.01), mat.aco, g).position.set(0.266, 0.1, 0);
  // fios e conector
  for (const [dz, cor] of [[0.04, '#e9e2d6'], [-0.04, '#16191c']]) {
    const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(0.28, 0.1, dz), new THREE.Vector3(0.34, 0.108, dz * 1.6), new THREE.Vector3(0.36, 0.09, dz * 0.4), new THREE.Vector3(0.39, 0.085, dz * 0.5)]);
    M(new THREE.TubeGeometry(curva, 24, 0.008, 8), new THREE.MeshStandardMaterial({ color: cor, roughness: 0.5 }), g);
  }
  M(new RoundedBoxGeometry(0.035, 0.03, 0.07, 2, 0.006), mat.perola, g).position.set(0.402, 0.085, 0);
  return g;
}

function placa() {
  const g = new THREE.Group();
  const base = new THREE.CylinderGeometry(0.33, 0.33, 0.012, 96); base.scale(OV, 1, 1);
  const tx = texturaPlaca();
  const mTopo = new THREE.MeshPhysicalMaterial({ map: tx, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const mLado = new THREE.MeshStandardMaterial({ color: '#0a4d40', roughness: 0.6 });
  M(base, [mLado, mTopo, mTopo], g).position.y = 0.1;
  const y = 0.106;
  const pecas = [
    [new RoundedBoxGeometry(0.15, 0.022, 0.15, 2, 0.006), mat.chip, [-0.06, 0.02]],
    [new RoundedBoxGeometry(0.1, 0.018, 0.07, 2, 0.005), mat.chip, [0.17, -0.13]],
    [new RoundedBoxGeometry(0.17, 0.03, 0.11, 3, 0.008), mat.aco, [0.12, 0.13]],
    [new RoundedBoxGeometry(0.06, 0.016, 0.06, 2, 0.004), mat.chip, [-0.2, -0.14]],
    [new RoundedBoxGeometry(0.11, 0.026, 0.045, 2, 0.006), mat.perola, [-0.21, 0.15]],
  ];
  for (const [geo, m, [px, pz]] of pecas) { const o = M(geo, m, g); o.position.set(px, y + geo.parameters.height / 2, pz); }
  for (const [px, pz] of [[0.26, 0.0], [0.24, 0.05], [-0.02, -0.2], [0.03, -0.21], [-0.27, 0.02]]) {
    M(new THREE.CylinderGeometry(0.017, 0.017, 0.03, 20), mat.ouro, g).position.set(px, y + 0.015, pz);
  }
  // antena em fita dourada na borda
  const ant = new THREE.TorusGeometry(0.295, 0.005, 6, 64, 1.9); ant.rotateX(Math.PI / 2); ant.scale(OV, 1, 1);
  const a = M(ant, mat.ouro, g); a.position.y = y; a.rotation.y = 2.2;
  return g;
}

function concha() {
  const g = new THREE.Group();
  const fora = [[0.405, -0.1], [0.425, -0.02], [0.425, 0.05], [0.405, 0.115], [0.34, 0.165], [0.2, 0.186], [0, 0.19]];
  const dentro = [[0, 0.168], [0.2, 0.164], [0.33, 0.145], [0.39, 0.1], [0.405, 0.05], [0.405, -0.02], [0.388, -0.1]];
  M(torno([dentro, fora]), mat.concha, g);
  // friso e tampa de metal no lado de fora
  const friso = new THREE.TorusGeometry(0.262, 0.0075, 12, 128); friso.rotateX(Math.PI / 2); friso.scale(OV, 1, 1);
  M(friso, mat.rose, g).position.y = 0.1795;
  M(torno([[[0.0, 0.1915], [0.12, 0.191], [0.2, 0.187], [0.248, 0.181]]]), mat.roseFosco, g);
  return g;
}

function montarConcha(lado) {
  const grupo = new THREE.Group();
  grupo.position.x = lado * CX;
  grupo.rotation.z = -lado * Math.PI / 2;
  const pecas = {
    almofada: almofada(), tela: tela(), driver: driver(),
    miolo: lado < 0 ? bateria() : placa(), concha: concha(),
  };
  for (const k in pecas) grupo.add(pecas[k]);
  return { grupo, pecas };
}

// ---------- arco ----------

// Varre uma seção de cantos arredondados ao longo de um caminho no plano XY.
function varrer(caminho, secao, n = 120, K = 28) {
  const pos = [], idx = [];
  const centro = new THREE.Vector2(0, 0.8);
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = caminho(u), a = caminho(Math.max(u - 1e-3, 0)), b = caminho(Math.min(u + 1e-3, 1));
    const t = b.clone().sub(a).normalize();
    let nx = t.y, ny = -t.x;
    if (nx * (p.x - centro.x) + ny * (p.y - centro.y) < 0) { nx = -nx; ny = -ny; }
    const { w, e, d } = secao(u);
    for (let k = 0; k < K; k++) {
      const ang = k / K * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang);
      const zz = w / 2 * Math.sign(c) * Math.pow(Math.abs(c), 0.5);
      const vv = e / 2 * Math.sign(s) * Math.pow(Math.abs(s), 0.5) + d;
      pos.push(p.x + nx * vv, p.y + ny * vv, zz);
    }
  }
  for (let i = 0; i < n; i++) for (let k = 0; k < K; k++) {
    const a = i * K + k, b = i * K + (k + 1) % K, c = a + K, d = b + K;
    idx.push(a, c, b, b, c, d);
  }
  // tampas
  for (const [i, inv] of [[0, false], [n, true]]) {
    const p = caminho(i / n), { d } = secao(i / n);
    const base = pos.length / 3; pos.push(p.x, p.y, 0);
    // desloca a tampa para o centro da seção
    const a0 = i * K;
    let cx = 0, cy = 0; for (let k = 0; k < K; k++) { cx += pos[(a0 + k) * 3]; cy += pos[(a0 + k) * 3 + 1]; }
    pos[base * 3] = cx / K; pos[base * 3 + 1] = cy / K;
    for (let k = 0; k < K; k++) { const a = a0 + k, b = a0 + (k + 1) % K; inv ? idx.push(base, a, b) : idx.push(base, b, a); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

const A = 0.82, B = 0.8, Y0 = 0.8, YB = 0.6;
function elipse(grau) { const f = grau * Math.PI / 180; return new THREE.Vector2(A * Math.cos(f), Y0 + B * Math.sin(f)); }
function caminhoInteiro(u) {
  // sobe reto, contorna a elipse e desce reto
  const reto = Y0 - YB, arco = Math.PI * (A + B) / 2, total = reto * 2 + arco, s = u * total;
  if (s < reto) return new THREE.Vector2(-A, YB + s);
  if (s > reto + arco) return new THREE.Vector2(A, Y0 - (s - reto - arco));
  return elipse(180 - (s - reto) / arco * 180);
}
const suave = (x, a, b) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

function arco() {
  const g = new THREE.Group();
  const lados = THREE.DoubleSide;
  const mBanda = mat.concha.clone(); mBanda.side = lados;
  const mPad = mat.couro.clone(); mPad.side = lados;
  const mFita = mat.rose.clone(); mFita.side = lados;
  // fita de aço rosé de ponta a ponta
  M(varrer(caminhoInteiro, () => ({ w: 0.13, e: 0.018, d: 0 }), 160, 20), mFita, g);
  // banda externa, afinando nas pontas
  M(varrer(u => elipse(166 - u * 152), u => {
    const p = suave(u, 0, 0.1) * suave(1 - u, 0, 0.1);
    return { w: 0.2 + 0.14 * p, e: 0.03 + 0.03 * p, d: 0.022 };
  }, 160), mBanda, g);
  // acolchoado por dentro
  M(varrer(u => elipse(146 - u * 112), u => {
    const p = suave(u, 0, 0.16) * suave(1 - u, 0, 0.16);
    return { w: 0.16 + 0.13 * p, e: 0.02 + 0.07 * p, d: -0.035 - 0.012 * p };
  }, 140), mPad, g);
  for (const lado of [-1, 1]) {
    // forquilha que abraça a concha
    const pts = [];
    for (let i = 0; i <= 40; i++) { const th = i / 40 * Math.PI; pts.push(new THREE.Vector3(lado * (CX + 0.04), 0.585 * Math.sin(th), 0.478 * Math.cos(th))); }
    M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.027, 16), mat.rose, g);
    for (const z of [-0.478, 0.478]) {
      M(new THREE.SphereGeometry(0.034, 24, 16), mat.rose, g).position.set(lado * (CX + 0.04), 0, z);
      const pino = M(new THREE.CylinderGeometry(0.016, 0.016, 0.07, 16), mat.aco, g);
      pino.rotation.x = Math.PI / 2; pino.position.set(lado * (CX + 0.035), 0, z * 0.94);
    }
    // articulação
    M(new RoundedBoxGeometry(0.075, 0.13, 0.17, 4, 0.024), mat.concha, g).position.set(lado * A, 0.625, 0);
    M(new THREE.CylinderGeometry(0.017, 0.017, 0.18, 20), mat.rose, g).rotateX(Math.PI / 2).position.set(lado * A, 0.6, 0);
  }
  return g;
}

export function montarFone() {
  const fone = new THREE.Group();
  const esq = montarConcha(-1), dir = montarConcha(1), arc = arco();
  fone.add(esq.grupo, dir.grupo, arc);
  return { fone, esq, dir, arco: arc };
}
