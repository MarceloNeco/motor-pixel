// A natureza que toma o objeto: uma manta de musgo colada na superfície, tufos, hastes, flores e botões.
// Serve para qualquer malha: recebe a geometria hospedeira e as "sementes" (de onde cada mancha parte).
// Tudo é função do tempo: cada instância guarda o instante em que brota (aBirth) e o shader faz o resto.
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

export const uTime = { value: 0 };
const PI = Math.PI;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const NZ = new ImprovedNoise();
export const fbm = (x, y, z) => NZ.noise(x, y, z) * 0.58 + NZ.noise(x * 2.13 + 7.3, y * 2.13 + 1.7, z * 2.13 + 4.1) * 0.28 + NZ.noise(x * 4.31 + 13.1, y * 4.31 + 5.9, z * 4.31 + 9.2) * 0.14;

// ------------------------------------------------------------------ o campo de crescimento
// Para um ponto da superfície devolve: quando a frente chega (arr), o quanto está dentro de uma mancha
// (cob > 0 é dentro) e os mesmos dois valores só para as manchas de flor.
export function criarCampo({ sementes, exclusoes = [] }) {
  sementes.forEach((s, i) => { s.o = 3.7 + i * 11.3; s.f = s.f ?? 1.6; s.w = s.w ?? 0.5; });
  return (x, y, z) => {
    let arr = 1e9, cob = -9, fArr = 1e9, fCob = -9, mCob = -9;
    for (const s of sementes) {
      const dn = Math.hypot((x - s.c[0]) / s.r[0], (y - s.c[1]) / s.r[1], (z - s.c[2]) / s.r[2]) - fbm(x * s.f + s.o, y * s.f + s.o * 1.7, z * s.f - s.o) * s.w * 2;
      const c = 1 - dn, a = s.t0 + s.dur * Math.pow(Math.max(dn, 0), 1.35);
      if (a < arr) arr = a;
      if (c > cob) cob = c;
      if (s.tipo === 'flor') { if (a < fArr) fArr = a; if (c > fCob) fCob = c; } else if (c > mCob) mCob = c;
    }
    for (const e of exclusoes) {
      const d = (Math.hypot(x - e.c[0], y - e.c[1], z - e.c[2]) - e.r) * 5;
      if (d < cob) cob = d; if (d < fCob) fCob = d; if (d < mCob) mCob = d;
    }
    return { arr, cob, fArr, fCob, mCob };
  };
}

// ------------------------------------------------------------------ geometrias
function geo(pos, idx, extra = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  for (const k in extra) g.setAttribute(k, new THREE.Float32BufferAttribute(extra[k][0], extra[k][1]));
  return g;
}

// tufo: um punhado de lâminas que saem do mesmo pé e abrem para fora. Altura ~1, pé ~0,5.
function geoTufo(rng, n = 5) {
  const pos = [], idx = [], col = [], nrm = [];
  const raiz = new THREE.Color('#2c4020'), ponta = new THREE.Color('#f2ffa6').multiplyScalar(1.3);
  for (let b = 0; b < n; b++) {
    const ang = (b + rng() * 0.7) / n * 2 * PI, lean = b === 0 ? 0.08 : 0.25 + rng() * 0.6, h = 0.65 + rng() * 0.5, w = 0.16 + rng() * 0.1;
    const r0 = b === 0 ? 0 : 0.1 + rng() * 0.14, ca = Math.cos(ang), sa = Math.sin(ang);
    const base = pos.length / 3;
    const niveis = [0, 0.38, 0.72, 1];
    niveis.forEach((s, li) => {
      const rad = r0 + lean * h * Math.pow(s, 1.5), y = h * s * (1 - 0.18 * lean * s), hw = w * 0.5 * (1 - Math.pow(s, 1.6));
      const c = raiz.clone().lerp(ponta, Math.pow(s, 0.8));
      const nx = ca * (0.25 + lean * 0.5), ny = 1, nz = sa * (0.25 + lean * 0.5), nl = Math.hypot(nx, ny, nz);
      const pts = li === 3 ? [[rad * ca, y, rad * sa]] : [[rad * ca - sa * hw, y, rad * sa + ca * hw], [rad * ca + sa * hw, y, rad * sa - ca * hw]];
      for (const p of pts) { pos.push(...p); col.push(c.r, c.g, c.b); nrm.push(nx / nl, ny / nl, nz / nl); }
    });
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4, base + 3, base + 5, base + 4, base + 4, base + 5, base + 6);
  }
  return geo(pos, idx, { color: [col, 3], normal: [nrm, 3] });
}

// flor: pétalas em volta de um miolo. Guarda dois estados na mesma malha: aberta (position) e botão fechado (aClosed).
function geoFlor({ petalas = 5, larg = 0.36, elev = 0.28, curva = -0.5, miolo = 0.2, giro = 0 }) {
  const pos = [], fech = [], idx = [], col = [], centro = [];
  const S = [0.04, 0.34, 0.68, 0.9, 1.0], HW = [0.14, 0.86, 1.0, 0.62, 0];
  const estado = (s, v, e0, cv, comp, larguraK) => { // ponto da pétala no quadro dela (x para fora, y para cima, z lateral)
    const e = e0 + cv * s * 0.5;
    return [Math.cos(e) * s * comp, Math.sin(e) * s * comp, v * larguraK];
  };
  for (let p = 0; p < petalas; p++) {
    const a = giro + p / petalas * 2 * PI, ca = Math.cos(a), sa = Math.sin(a), base = pos.length / 3;
    S.forEach((s, li) => {
      const lados = li === S.length - 1 ? [0] : [-1, 1];
      for (const lado of lados) {
        const v = lado * HW[li] * larg;
        const ab = estado(s, v, elev, curva, 1, 1), fe = estado(s, v, 1.32, 0.35, 0.72, 0.5);
        // dobra a pétala em calha: as bordas sobem um pouco
        ab[1] += Math.abs(v) * 0.35;
        pos.push(ab[0] * ca - ab[2] * sa, ab[1], ab[0] * sa + ab[2] * ca);
        fech.push(fe[0] * ca - fe[2] * sa, fe[1], fe[0] * sa + fe[2] * ca);
        const k = 0.62 + 0.38 * sstep(0, 0.55, s);
        col.push(k, k * (0.82 + 0.18 * sstep(0, 0.6, s)), k);
        centro.push(0);
      }
    });
    for (let q = 0; q < 3; q++) { const o = base + q * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
    idx.push(base + 6, base + 8, base + 7);
  }
  // miolo: meia esfera baixa
  const seg = 8, an = 3, base = pos.length / 3;
  for (let j = 0; j <= an; j++) for (let i = 0; i < seg; i++) {
    const ph = j / an * PI / 2, th = i / seg * 2 * PI, r = Math.cos(ph) * miolo, y = Math.sin(ph) * miolo * 0.7 + 0.02;
    pos.push(r * Math.cos(th), y, r * Math.sin(th));
    fech.push(r * 0.5 * Math.cos(th), y * 0.5, r * 0.5 * Math.sin(th));
    col.push(1, 1, 1); centro.push(1);
  }
  for (let j = 0; j < an; j++) for (let i = 0; i < seg; i++) {
    const a = base + j * seg + i, b = base + j * seg + (i + 1) % seg, c = a + seg, d = b + seg;
    idx.push(a, c, b, b, c, d);
  }
  const g = geo(pos, idx, { color: [col, 3], aClosed: [fech, 3], aCenter: [centro, 1] });
  g.computeVertexNormals();
  // normal "de folhagem": mistura com o eixo da flor para a luz não picotar pétala por pétala
  const n = g.attributes.normal;
  let soma = 0; for (let i = 0; i < n.count; i++) soma += n.getY(i);
  const sinal = soma < 0 ? -1 : 1;
  if (sinal < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } }
  for (let i = 0; i < n.count; i++) {
    const v = new THREE.Vector3(n.getX(i) * sinal, n.getY(i) * sinal, n.getZ(i) * sinal).multiplyScalar(0.55).add(new THREE.Vector3(0, 0.45, 0)).normalize();
    n.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}

// ------------------------------------------------------------------ materiais (o crescimento mora no shader)
const LIB = /* glsl */`
uniform float uTime;
float backOut(float x){ float y = x - 1.0; return 1.0 + 2.70158 * y * y * y + 1.70158 * y * y; }
`;
function crescer(mat, tipo, opts = {}) {
  const decl = {
    flor: 'attribute float aBirth; attribute float aRand; attribute float aStem; attribute vec3 aClosed; attribute float aCenter; varying float vCenter; varying float vRand;',
    botao: 'attribute float aBirth; attribute float aRand; attribute float aStem;',
    haste: 'attribute float aBirth; attribute float aRand;',
    tufo: 'attribute float aBirth; attribute float aRand;',
    manta: 'attribute float aArr; attribute float aIn; attribute float aRuido; varying float vIn; varying float vK; uniform float uH;',
  }[tipo];
  const code = {
    flor: `float g = uTime - aBirth;
      float kStem = 1.0 - pow(1.0 - clamp(g / 0.6, 0.0, 1.0), 3.0);
      float kHead = backOut(clamp((g - 0.1) / 0.7, 0.0, 1.0));
      float kOpen = smoothstep(0.3, 1.5, g);
      transformed = mix(aClosed, transformed, kOpen) * kHead;
      transformed.y -= aStem * (1.0 - kStem);
      float bal = sin(uTime * 1.9 + aRand * 31.0) * 0.05 * kOpen;
      transformed.x += bal * (transformed.y + aStem * 0.5);
      vCenter = aCenter; vRand = aRand;`,
    botao: `float g = uTime - aBirth;
      float kStem = 1.0 - pow(1.0 - clamp(g / 0.6, 0.0, 1.0), 3.0);
      transformed *= backOut(clamp((g - 0.1) / 0.6, 0.0, 1.0));
      transformed.y -= aStem * (1.0 - kStem);`,
    haste: `float g = uTime - aBirth;
      float kStem = 1.0 - pow(1.0 - clamp(g / 0.6, 0.0, 1.0), 3.0);
      transformed.y *= kStem; transformed.xz *= step(0.0001, kStem);`,
    tufo: `float g = uTime - aBirth;
      float k = backOut(clamp(g / 0.85, 0.0, 1.0));
      transformed.y *= k; transformed.xz *= mix(0.3, 1.0, k) * step(0.0001, k);
      transformed.x += sin(uTime * 1.6 + aRand * 40.0) * 0.045 * transformed.y * k;`,
    manta: `float k = smoothstep(0.0, 0.8, uTime - aArr);
      vK = k; vIn = aIn;
      transformed += normal * (0.004 + uH * k * smoothstep(0.0, 0.2, aIn) * (0.7 + 0.6 * aRuido));`,
  }[tipo];
  const aplica = sh => {
    sh.uniforms.uTime = uTime;
    if (tipo === 'manta') sh.uniforms.uH = { value: opts.altura ?? 0.03 };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${LIB}\n${decl}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${code}`);
    if (tipo === 'manta') {
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vIn; varying float vK;')
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vIn < 0.0 || vK < 0.03) discard;');
    }
    if (tipo === 'flor' && !opts.profundidade) {
      sh.uniforms.uGlow = { value: opts.glow ?? 0.1 };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vCenter; varying float vRand; uniform float uGlow;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(1.0, 0.6, 0.05), vec3(0.14, 0.06, 0.03), step(0.82, vRand)), vCenter);`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uGlow;');
    }
    if (tipo === 'botao' && !opts.profundidade) {
      sh.uniforms.uGlow = { value: opts.glow ?? 0.1 };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uGlow;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uGlow;');
    }
  };
  mat.onBeforeCompile = aplica;
  mat.customProgramCacheKey = () => 'cresce-' + tipo + (opts.profundidade ? '-d' : '');
  return mat;
}
const profundidade = tipo => crescer(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), tipo, { profundidade: true });

// ------------------------------------------------------------------ espalhar
function instanciar(geoBase, mat, tipo, itens, { sombra = true, recebe = true } = {}) {
  const g = geoBase.clone();
  const n = itens.length;
  const birth = new Float32Array(n), rand = new Float32Array(n), stem = new Float32Array(n);
  const m = new THREE.InstancedMesh(g, mat, n);
  const M = new THREE.Matrix4();
  itens.forEach((it, i) => {
    M.compose(it.p, it.q, it.s); m.setMatrixAt(i, M); m.setColorAt(i, it.cor);
    birth[i] = it.nasce; rand[i] = it.rand; stem[i] = it.haste ?? 0;
  });
  g.setAttribute('aBirth', new THREE.InstancedBufferAttribute(birth, 1));
  g.setAttribute('aRand', new THREE.InstancedBufferAttribute(rand, 1));
  if (tipo === 'flor' || tipo === 'botao') g.setAttribute('aStem', new THREE.InstancedBufferAttribute(stem, 1));
  m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
  m.frustumCulled = false; m.castShadow = sombra; m.receiveShadow = recebe;
  if (sombra) m.customDepthMaterial = profundidade(tipo);
  return m;
}

export function vegetar({ hospedeiro, sementes, exclusoes, paleta, rng, dens = {}, tam = 1 }) {
  const D = { cand: 36000, tufo: 16000, folha: 6000, flor: 5600, botao: 0, ...dens };
  const campo = criarCampo({ sementes, exclusoes });
  const grupo = new THREE.Group();
  const Y = new THREE.Vector3(0, 1, 0);

  // ---- manta: a própria superfície, estufada onde a natureza já chegou
  const manta = hospedeiro.clone();
  {
    const P = manta.attributes.position, n = P.count;
    const aArr = new Float32Array(n), aIn = new Float32Array(n), aRuido = new Float32Array(n), col = new Float32Array(n * 3);
    const cM = new THREE.Color('#16260e'), cF = new THREE.Color('#22380f'), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), f = campo(x, y, z);
      aArr[i] = f.arr; aIn[i] = f.cob; aRuido[i] = 0.5 + fbm(x * 9, y * 9, z * 9);
      c.copy(cM).lerp(cF, sstep(-0.1, 0.1, f.fCob - f.mCob)).multiplyScalar(0.8 + 0.5 * aRuido[i]);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    manta.setAttribute('aArr', new THREE.BufferAttribute(aArr, 1));
    manta.setAttribute('aIn', new THREE.BufferAttribute(aIn, 1));
    manta.setAttribute('aRuido', new THREE.BufferAttribute(aRuido, 1));
    manta.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mm = new THREE.Mesh(manta, crescer(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), 'manta', { altura: 0.022 * tam }));
    mm.customDepthMaterial = crescer(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), 'manta', { altura: 0.022 * tam, profundidade: true });
    mm.castShadow = true; mm.receiveShadow = true;
    grupo.add(mm);
  }

  // ---- amostra a superfície
  const P = hospedeiro.attributes.position, I = hospedeiro.index.array;
  let area = 0; { const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < I.length; t += 3) { a.fromBufferAttribute(P, I[t]); b.fromBufferAttribute(P, I[t + 1]); c.fromBufferAttribute(P, I[t + 2]); area += b.sub(a).cross(c.sub(a)).length() * 0.5; } }
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(hospedeiro)).setRandomGenerator(rng).build();
  const N = Math.round(area * D.cand);
  const p = new THREE.Vector3(), nrm = new THREE.Vector3();
  const tufos = [], hastes = [], botoes = [], flores = [[], [], []];
  const verdesM = ['#3a6622', '#467526', '#52842a', '#2f5a1c', '#63942e'].map(h => new THREE.Color(h));
  const verdesF = ['#3d6b22', '#4f7d27', '#5f8f2c', '#2f5a1e'].map(h => new THREE.Color(h));
  const cores = paleta.map(h => new THREE.Color(h));
  const verdeHaste = new THREE.Color('#3c6a22');
  const eixoAleatorio = (n, maxAng) => {
    const t = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).cross(n).normalize();
    return n.clone().applyAxisAngle(t, rng() * maxAng).normalize();
  };
  const quat = (eixo) => new THREE.Quaternion().setFromUnitVectors(Y, eixo).multiply(new THREE.Quaternion().setFromAxisAngle(Y, rng() * 2 * PI));

  for (let i = 0; i < N; i++) {
    sampler.sample(p, nrm);
    const f = campo(p.x, p.y, p.z);
    if (f.cob <= 0.0 && f.fCob <= -0.3) continue;
    const zonaFlor = f.fCob > 0 && f.fCob > f.mCob - 0.08;
    const borda = 0.45 + 0.55 * sstep(0, 0.16, f.cob);
    // tufos (musgo) e folhas (debaixo das flores)
    const dT = zonaFlor ? D.folha : D.tufo;
    if (f.cob > 0 && rng() < dT / D.cand * borda) {
      // lâminas miúdas e muitas; na borda da mancha elas rareiam e encolhem (transição, não recorte)
      const s = (zonaFlor ? 0.05 : 0.036) * (0.7 + 0.7 * rng()) * (0.45 + 0.55 * sstep(0, 0.14, f.cob)) * tam;
      const cor = (zonaFlor ? verdesF : verdesM)[Math.floor(rng() * (zonaFlor ? verdesF : verdesM).length)].clone().multiplyScalar(0.75 + 0.5 * rng());
      tufos.push({ p: p.clone(), q: quat(eixoAleatorio(nrm, 0.4)), s: new THREE.Vector3(s, s * (zonaFlor ? 1.2 : 0.82) * (0.8 + 0.5 * rng()), s), cor, nasce: f.arr + rng() * 0.4, rand: rng() });
    }
    if (f.fCob <= -0.3) continue;
    // flores: densas no miolo da mancha, rareando na borda, com algumas desgarradas do lado de fora
    // clareiras: um ruído largo abre vazios dentro da mancha, para ela não virar uma coroa de espessura constante
    const fC = f.fCob - Math.max(0, fbm(p.x * 2.1 + 90, p.y * 2.1 + 40, p.z * 2.1 + 12) - 0.1) * 2.4;
    const pFlor = fC > 0 ? sstep(0, 0.22, fC) * 0.94 + 0.06 : 0.07 * sstep(-0.3, 0, fC);
    if (rng() < D.flor / D.cand * pFlor) {
      // montes: a altura das hastes segue um ruído médio, então a mancha vira relevo e não um tapete
      const monte = sstep(-0.28, 0.42, fbm(p.x * 3.4 + 50, p.y * 3.4 + 23, p.z * 3.4 + 71));
      // confete: muitas flores minúsculas, poucas médias
      const grande = rng(), heroi = rng() < 0.04 ? 0.012 : 0;
      const raio = (0.011 + 0.019 * grande * grande * grande + 0.004 * rng() + heroi) * tam;
      const haste = (0.02 + 0.035 * rng() + 0.12 * monte * Math.pow(rng(), 0.7) + raio * 0.5) * tam;
      const eixo = eixoAleatorio(nrm, 0.55);
      const tom = clamp(fbm(p.x * 1.7 + 31, p.y * 1.7 + 17, p.z * 1.7 + 5) * 1.5 + 0.5 + (rng() - 0.5) * 0.75, 0, 0.999);
      const profund = sstep(0.025 * tam, 0.14 * tam, haste);
      const cor = cores[Math.floor(tom * cores.length)].clone().multiplyScalar(0.36 + 0.64 * profund).multiplyScalar(0.9 + 0.2 * rng());
      const nasce = f.fArr + 0.2 + rng() * 0.7 + haste * 1.2;
      const rand = rng(), tipo = rand < 0.5 ? 0 : rand < 0.78 ? 1 : 2;
      flores[tipo].push({ p: p.clone().addScaledVector(eixo, haste), q: quat(eixo), s: new THREE.Vector3(raio, raio, raio), cor, nasce, rand: rng(), haste: haste / raio });
      hastes.push({ p: p.clone(), q: quat(eixo), s: new THREE.Vector3(0.0028 * tam, haste, 0.0028 * tam), cor: verdeHaste.clone().multiplyScalar(0.5 + 0.5 * rng()), nasce, rand: rng() });
      if (f.cob <= 0) { // desgarrada: nasce no plástico, então ganha a própria folhinha
        const st = 0.04 * (0.7 + 0.6 * rng()) * tam;
        tufos.push({ p: p.clone(), q: quat(eixoAleatorio(nrm, 0.5)), s: new THREE.Vector3(st, st, st), cor: verdesF[Math.floor(rng() * verdesF.length)].clone(), nasce: nasce - 0.15, rand: rng() });
      }
    }
    // botões: bolinhas de cor que preenchem e fazem a franja da mancha
    if (D.botao > 0 && rng() < D.botao / D.cand * sstep(-0.12, 0.1, f.fCob)) {
      const raio = (0.009 + 0.011 * rng()) * tam, haste = (0.03 + 0.12 * rng()) * tam;
      const eixo = eixoAleatorio(nrm, 0.7);
      const tom = clamp(fbm(p.x * 1.25 + 31, p.y * 1.25 + 17, p.z * 1.25 + 5) * 1.5 + 0.5 + (rng() - 0.5) * 0.6, 0, 0.999);
      const nasce = f.fArr + 0.1 + rng() * 0.8;
      botoes.push({ p: p.clone().addScaledVector(eixo, haste), q: quat(eixo), s: new THREE.Vector3(raio, raio * 1.25, raio), cor: cores[Math.floor(tom * cores.length)].clone().multiplyScalar(0.75 + 0.35 * rng()), nasce, rand: rng(), haste: haste / (raio * 1.25) });
      hastes.push({ p: p.clone(), q: quat(eixo), s: new THREE.Vector3(0.0035 * tam, haste, 0.0035 * tam), cor: verdeHaste.clone().multiplyScalar(0.5 + 0.5 * rng()), nasce, rand: rng() });
    }
  }

  const matTufo = crescer(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), 'tufo');
  const matFlor = crescer(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }), 'flor', { glow: 0.16 });
  const matBotao = crescer(new THREE.MeshStandardMaterial({ roughness: 0.5 }), 'botao', { glow: 0.14 });
  const matHaste = crescer(new THREE.MeshStandardMaterial({ roughness: 0.8 }), 'haste');

  // 4 variações de tufo para não repetir a mesma silhueta
  const tg = [0, 1, 2, 3].map(() => geoTufo(rng));
  const porTufo = [[], [], [], []]; tufos.forEach((t, i) => porTufo[i % 4].push(t));
  porTufo.forEach((lista, i) => { if (lista.length) grupo.add(instanciar(tg[i], matTufo, 'tufo', lista, { sombra: false })); });
  const fg = [
    geoFlor({ petalas: 5, larg: 0.4, elev: 0.3, curva: -0.5, miolo: 0.2 }),
    geoFlor({ petalas: 8, larg: 0.2, elev: 0.18, curva: -0.3, miolo: 0.26 }),
    geoFlor({ petalas: 6, larg: 0.36, elev: 0.75, curva: -0.7, miolo: 0.16, giro: 0.3 }),
  ];
  flores.forEach((lista, i) => { if (lista.length) grupo.add(instanciar(fg[i], matFlor, 'flor', lista)); });
  if (botoes.length) grupo.add(instanciar(new THREE.IcosahedronGeometry(1, 1), matBotao, 'botao', botoes));
  if (hastes.length) grupo.add(instanciar(new THREE.CylinderGeometry(0.6, 1, 1, 4, 1, true).translate(0, 0.5, 0), matHaste, 'haste', hastes, { sombra: false }));

  let fim = 0; for (const it of [...flores.flat(), ...tufos]) if (it.nasce > fim) fim = it.nasce;
  fim += 1.5;
  return { grupo, contagem: { area: +area.toFixed(2), tufos: tufos.length, flores: flores.flat().length, botoes: botoes.length, hastes: hastes.length }, fim };
}
