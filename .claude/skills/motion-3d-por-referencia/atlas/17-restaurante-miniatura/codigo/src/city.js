// A esquina: ruas molhadas, calçadas, o terreno, prédios, árvores de maquete, postes e semáforos.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, fbm3, noise3, clamp, colorJitter } from './util.js';
import * as TX from './textures.js';
import { makeWet } from './post.js';
import { addFoam } from './foam.js';

// ---- planta da esquina (metros) ----
// Escala: 1 unidade ≈ 0,55 m. Gente, carros e mobiliário usam U (metros reais -> unidades).
export const U = 1.9;
export const LOT = { x0: -7.5, x1: 8, z0: -16, z1: 8 };  // terra do terreno
export const CURB = 0.3;                                  // altura da calçada
export const SWW = 4.5;                                   // largura da calçada
// quarteirões (borda externa da calçada)
const XS = [[-95, -28], [-12, 12.5], [28.5, 95]];
const ZS = [[-105, -36.5], [-20.5, 12.5], [28.5, 95]];
export const STREET = { A: [12.5, 28.5], B: [12.5, 28.5], C: [-36.5, -20.5], D: [-28, -12], E: [-13, 3] };
// ao norte da rua C os quarteirões são outros: a rua E sobe de frente para a câmera (é onde ficam os faróis do fundo)
const BLOCKS = [];
for (const zr of ZS) for (const xr of (zr[0] === -105 ? [[-95, -13], [3, 95]] : XS)) BLOCKS.push([xr, zr]);

function roundedRect(x0, z0, x1, z1, r) {
  const s = new THREE.Shape();
  // shape no plano XY; depois giramos para XZ (y do shape = -z do mundo)
  const X0 = x0, X1 = x1, Y0 = -z1, Y1 = -z0;
  s.moveTo(X0 + r, Y0); s.lineTo(X1 - r, Y0); s.quadraticCurveTo(X1, Y0, X1, Y0 + r);
  s.lineTo(X1, Y1 - r); s.quadraticCurveTo(X1, Y1, X1 - r, Y1); s.lineTo(X0 + r, Y1);
  s.quadraticCurveTo(X0, Y1, X0, Y1 - r); s.lineTo(X0, Y0 + r); s.quadraticCurveTo(X0, Y0, X0 + r, Y0);
  return s;
}
function slab(shape, h, mat) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.05, bevelSegments: 2, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); g.translate(0, 0, 0);
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = false;
  return m;
}
const onLayer1 = m => { m.layers.set(1); return m; };

export function buildCity(ctx) {
  const { scene, mirror } = ctx;
  const out = { lamps: [], signals: [], trees: [], props: [], lotEdges: [] };
  const r = rng(101);
  const puddle = TX.puddleMask();
  ctx.puddle = puddle;

  // ---------- asfalto ----------
  const asTex = TX.asphalt(); asTex.repeat.set(1 / 14, 1 / 14);
  const asMat = addFoam(makeWet(new THREE.MeshStandardMaterial({ map: asTex, roughness: 0.62, metalness: 0, color: 0x6e7076 }), mirror, { strength: 2.2, puddleTex: puddle, puddleScale: 0.012, baseWet: 0.55, darken: 0.6, puddleLo: 0.4, wetRough: 0.3 }), { freq: 4, bump: 0.014, color: 0.22, freq2: 11, mix2: 0.6, key: 'asf' });
  // UV em metros para o asfalto: plano grande
  asMat.envMapIntensity = 0;   // o chão só reflete a cena de verdade (espelho planar), nunca o céu falso do ambiente
  const roadG = new THREE.PlaneGeometry(400, 400, 1, 1); roadG.rotateX(-Math.PI / 2);
  { const uv = roadG.attributes.uv, p = roadG.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i), -p.getZ(i)); }
  const road = onLayer1(new THREE.Mesh(roadG, asMat)); road.receiveShadow = true; scene.add(road);

  // ---------- calçadas ----------
  const innerMat = addFoam(new THREE.MeshStandardMaterial({ color: 0x24221f, roughness: 0.95 }), { freq: 0.8, bump: 0.05, color: 0.4, key: 'inner' });
  const swTex = TX.sidewalk(); swTex.repeat.set(1 / 9.6, 1 / 9.6);
  const swMat = addFoam(makeWet(new THREE.MeshStandardMaterial({ map: swTex, roughness: 0.62, color: 0xc9b9a2 }), mirror, { strength: 0.7, puddleTex: puddle, puddleScale: 0.02, baseWet: 0.18, distort: 0.02, darken: 0.88, puddleLo: 0.5 }), { freq: 3, bump: 0.02, color: 0.12, key: 'sw' });
  swMat.envMapIntensity = 0.05; innerMat.envMapIntensity = 0;
  for (const [xr, zr] of BLOCKS) {
    const sh = roundedRect(xr[0], zr[0], xr[1], zr[1], 3.6);
    if (xr[0] === -12 && zr[0] === -20.5) {
      const hole = new THREE.Path(); const e = 0.42;
      hole.moveTo(LOT.x0 - e, -(LOT.z1 + e)); hole.lineTo(LOT.x1 + e, -(LOT.z1 + e)); hole.lineTo(LOT.x1 + e, -(LOT.z0 - e)); hole.lineTo(LOT.x0 - e, -(LOT.z0 - e)); hole.closePath();
      sh.holes.push(hole);
    }
    const s = slab(sh, CURB, swMat);
    onLayer1(s); scene.add(s);
    // miolo do quarteirão (fora o do terreno): chão escuro de pátio/estacionamento
    if (!(xr[0] === -12 && zr[0] === -20.5)) {
      const ig = new THREE.PlaneGeometry(xr[1] - xr[0] - 2 * SWW, zr[1] - zr[0] - 2 * SWW); ig.rotateX(-Math.PI / 2);
      const im = new THREE.Mesh(ig, innerMat); im.position.set((xr[0] + xr[1]) / 2, CURB + 0.04, (zr[0] + zr[1]) / 2); im.receiveShadow = true; scene.add(im);
    }
  }
  out.swMat = swMat; out.swTex = swTex;

  // ---------- terreno: borda de concreto + terra ----------
  const dirtTex = TX.dirt(); dirtTex.repeat.set(1 / 9, 1 / 9);
  const dirtMat = addFoam(new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 0.97, color: 0xd2c8c2 }), { freq: 2.2, bump: 0.08, color: 0.3, freq2: 7, mix2: 0.6, key: 'dirt' });
  const dw = LOT.x1 - LOT.x0, dd = LOT.z1 - LOT.z0;
  const dg = new THREE.PlaneGeometry(dw, dd, 140, 200); dg.rotateX(-Math.PI / 2);
  { const p = dg.attributes.position, uv = dg.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const edge = Math.min(dw / 2 - Math.abs(x), dd / 2 - Math.abs(z));
      const lump = fbm3(x * 0.35, 0, z * 0.35, 4) * 0.22 + fbm3(x * 1.6, 3, z * 1.6, 3) * 0.06;
      p.setY(i, CURB - 0.1 + lump * clamp(edge / 1.2) * 1.6 + 0.04);
      uv.setXY(i, x, -z);
    }
    dg.computeVertexNormals(); }
  const dirtMesh = new THREE.Mesh(dg, dirtMat); dirtMesh.position.set((LOT.x0 + LOT.x1) / 2, 0, (LOT.z0 + LOT.z1) / 2);
  dirtMesh.receiveShadow = true; scene.add(dirtMesh);
  out.dirt = dirtMesh;
  // meio-fio do canteiro
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x8f877d, roughness: 0.8 });
  const edgeW = 0.42, edgeH = 0.22;
  const cx = (LOT.x0 + LOT.x1) / 2, cz = (LOT.z0 + LOT.z1) / 2;
  for (const [w, d, x, z] of [[dw + edgeW * 2, edgeW, cx, LOT.z1 + edgeW / 2], [dw + edgeW * 2, edgeW, cx, LOT.z0 - edgeW / 2], [edgeW, dd, LOT.x0 - edgeW / 2, cz], [edgeW, dd, LOT.x1 + edgeW / 2, cz]]) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, edgeH, d, 2, 0.04), curbMat);
    m.position.set(x, CURB + edgeH / 2 - 0.02, z); m.castShadow = m.receiveShadow = true; scene.add(m); out.lotEdges.push(m);
  }

  // ---------- sinalização no asfalto ----------
  const paint = makeWet(new THREE.MeshStandardMaterial({ color: 0x8a867e, roughness: 0.55 }), mirror, { strength: 0.9, puddleTex: puddle, puddleScale: 0.035, baseWet: 0.25 });
  const yellow = makeWet(new THREE.MeshStandardMaterial({ color: 0xe0a419, roughness: 0.55 }), mirror, { strength: 0.9, puddleTex: puddle, puddleScale: 0.035, baseWet: 0.25 });
  paint.envMapIntensity = 0; yellow.envMapIntensity = 0;
  const decal = (w, d, x, z, mat, rotY = 0) => {
    const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
    const m = onLayer1(new THREE.Mesh(g, mat)); m.position.set(x, 0.012, z); m.rotation.y = rotY; m.receiveShadow = true; scene.add(m); return m;
  };
  const aMid = (STREET.A[0] + STREET.A[1]) / 2, bMid = (STREET.B[0] + STREET.B[1]) / 2, dMid = (STREET.D[0] + STREET.D[1]) / 2, cMid = (STREET.C[0] + STREET.C[1]) / 2;
  // faixa dupla amarela: rua A (ao longo de x) e ruas B/D (ao longo de z)
  for (const [x0, x1] of [[-200, STREET.D[0] - 1], [STREET.D[1] + 2.5, 5.0], [STREET.B[1] + 4.5, 200]]) {
    decal(x1 - x0, 0.16, (x0 + x1) / 2, aMid - 0.17, yellow); decal(x1 - x0, 0.16, (x0 + x1) / 2, aMid + 0.17, yellow);
    decal(x1 - x0, 0.16, (x0 + x1) / 2, cMid - 0.17, yellow); decal(x1 - x0, 0.16, (x0 + x1) / 2, cMid + 0.17, yellow);
  }
  for (const xm of [bMid, dMid, -5]) for (const [z0, z1] of (xm === -5 ? [[-200, STREET.C[0] - 4.5]] : [[STREET.C[1] + 4.5, xm > 0 ? -4.2 : STREET.A[0] - 6.5], [STREET.A[1] + 4.5, 200]])) {
    decal(0.16, z1 - z0, xm - 0.17, (z0 + z1) / 2, yellow); decal(0.16, z1 - z0, xm + 0.17, (z0 + z1) / 2, yellow);
  }
  // faixas como na referência: meia faixa na rua D (esquina esquerda), duas meias fileiras desencontradas na rua B
  // com a caixa "OLHE" pintada junto ao meio-fio, e uma linha branca de bordo na rua A
  const bars = (x0, x1, z, len) => { for (let x = x0 + 0.7; x < x1; x += 1.75) decal(0.95, len, x, z, paint); };
  bars(-19.2, -12.4, 11.2, 4.4);                 // rua D, junto à esquina esquerda do terreno
  bars(13.0, 19.6, -1.3, 4.2);                   // rua B, metade de cá
  bars(21.4, 27.8, 4.6, 4.2);                    // rua B, metade de lá
  decal(17.5, 0.22, 2.2, STREET.A[0] + 2.0, paint);   // linha de bordo na rua A
  decal(0.22, 9, STREET.B[1] - 2.0, -12, paint);
  // caixa do OLHE
  { const cx = 16.6, cz = 5.5, w = 5.6, d = 5.4, t = 0.26;
    decal(w, t, cx, cz - d / 2, paint); decal(w, t, cx, cz + d / 2, paint); decal(t, d, cx - w / 2, cz, paint); decal(t, d, cx + w / 2, cz, paint);
    const olheTex = TX.textTex(['OLHE'], { w: 512, h: 200, color: '#d9d4ca', size: 150, font: '"DIN Condensed", "Arial Narrow", Arial' });
    const olheMat = makeWet(new THREE.MeshStandardMaterial({ map: olheTex, transparent: true, roughness: 0.55, color: 0xb9b4aa }), mirror, { strength: 0.9, puddleTex: puddle, puddleScale: 0.035, baseWet: 0.25 });
    olheMat.alphaTest = 0.4;
    const g = new THREE.PlaneGeometry(4.6, 1.8); g.rotateX(-Math.PI / 2);
    const m = onLayer1(new THREE.Mesh(g, olheMat)); m.position.set(cx, 0.014, cz); m.rotation.y = 0.0; scene.add(m); }
  // seta que aparece quando o táxi parado vai embora
  { const arrowShape = new THREE.Shape(); arrowShape.moveTo(-0.2, 0); arrowShape.lineTo(0.2, 0); arrowShape.lineTo(0.2, 2.2); arrowShape.lineTo(0.6, 2.2); arrowShape.lineTo(0, 3.2); arrowShape.lineTo(-0.6, 2.2); arrowShape.lineTo(-0.2, 2.2); arrowShape.closePath();
    const g = new THREE.ShapeGeometry(arrowShape); g.scale(1.7, 1.7, 1.7); g.rotateX(-Math.PI / 2);
    const m = onLayer1(new THREE.Mesh(g, paint)); m.position.set(15.6, 0.013, -7.2); m.rotation.y = Math.PI; scene.add(m); }

  // ---------- canteiros e arbustos ao longo do terreno ----------
  out.bushMat = addFoam(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), { freq: 3.2, bump: 0.2, color: 0.55, freq2: 9, mix2: 0.8, key: 'bush' });
  const bush = (x, z, w, d, h, seed) => {
    const rr = rng(seed); const geos = [];
    const n = Math.round(w * d * 1.6) + 4;
    for (let i = 0; i < n; i++) {
      const rad = rr.range(0.35, 0.7) * h;
      const g = clump(rad, rr, 1);
      g.translate(x + rr.range(-w / 2, w / 2), CURB + rad * 0.7, z + rr.range(-d / 2, d / 2));
      tint(g, colorJitter(rr() < 0.5 ? 0x3d5a22 : 0x2f4a1c, rr, 0.18), rr, 0.6, 1.25);
      geos.push(g);
    }
    const m = new THREE.Mesh(mergeGeometries(geos), out.bushMat); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
  };
  // fileira atrás do terreno (lado -x, como na referência)
  out.hedge = bush(LOT.x0 - 1.4, -5, 1.4, 22, 2.4, 7);

  // ---------- árvores ----------
  const treeSpots = [
    { x: -10.2, z: 3.5, h: 20, cr: 7.6, tone: 0x5b6b2a, seed: 3, lit: 1.0, fine: true },
    { x: -10.0, z: -16.0, h: 13.5, cr: 8.0, tone: 0x2f4a24, seed: 4, lit: 0.5, fine: true },
    { x: 31.5, z: -9.5, h: 15, cr: 7.2, tone: 0x26401e, seed: 5, lit: 0.45, fine: true },
    { x: 31.0, z: -46, h: 18, cr: 7.0, tone: 0x2e4a22, seed: 8, lit: 0.5 },
    { x: -31.0, z: -40.5, h: 16, cr: 7.0, tone: 0x34502a, seed: 9, lit: 0.5 },
    { x: 9, z: -40, h: 15, cr: 6.5, tone: 0x2a4420, seed: 10, lit: 0.4 },
    { x: -48, z: 31.5, h: 18, cr: 7.0, tone: 0x2a4420, seed: 12, lit: 0.4 },
    { x: 60, z: 31.5, h: 18, cr: 7.0, tone: 0x2a4420, seed: 13, lit: 0.4 },
  ];
  for (const t of treeSpots) { const tr = tree(t); tr.position.set(t.x, CURB, t.z); scene.add(tr); out.trees.push(tr); }

  // ---------- postes de luz ----------
  const metal = new THREE.MeshStandardMaterial({ color: 0x2b302c, roughness: 0.45, metalness: 0.6 });
  const lampSpots = [
    { x: -10.6, z: 11.4, ang: Math.PI * 0.9, main: true },
    { x: 11.4, z: -15.5, ang: 0, main: true },
    { x: 30.0, z: 9.5, ang: Math.PI, main: true },
    { x: 30.0, z: 30.0, ang: Math.PI * 1.25, main: true },
    { x: -29.6, z: -22, ang: 0, main: false },
    { x: -29.6, z: 10.5, ang: 0, main: true },
    { x: 4.6, z: -38.2, ang: Math.PI, main: false },
    { x: -10.6, z: 30.0, ang: Math.PI * 0.25, main: false },
    { x: 46, z: -22, ang: Math.PI, main: false },
    { x: 11.4, z: -75, ang: Math.PI, main: false },
    { x: 30.0, z: -62, ang: Math.PI, main: false },
    { x: 30.0, z: -95, ang: Math.PI, main: false },
  ];
  for (const s of lampSpots) {
    const L = lamp(metal, s); L.position.set(s.x, CURB, s.z); scene.add(L); out.lamps.push(L);
  }
  // placas de rua (verdes) no poste da esquina esquerda
  {
    const t1 = TX.textTex(['R. AURORA'], { w: 512, h: 96, bg: '#1d6b3a', color: '#f2f2ea', size: 62, font: '"DIN Condensed", "Arial Narrow", Arial' });
    const t2 = TX.textTex(['AV. DO SOL'], { w: 512, h: 96, bg: '#1d6b3a', color: '#f2f2ea', size: 62, font: '"DIN Condensed", "Arial Narrow", Arial' });
    const mk = (tex, y, ry) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.8, 0.08), [metal, metal, metal, metal, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0x0b2a14, emissiveIntensity: 0.4 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })]);
      m.position.set(-10.6, CURB + y, 11.4); m.rotation.y = ry; m.translateX(2.0); m.castShadow = true; scene.add(m);
    };
    mk(t1, 9.6, Math.PI / 4); mk(t2, 8.7, -Math.PI / 4 + Math.PI);
  }

  // ---------- semáforos ----------
  const signalSpots = [
    { x: 30.0, z: 2.0, arm: 12, ang: Math.PI, phase: 0 },     // braço sobre a rua B
    { x: 29.4, z: 29.4, arm: 0, ang: Math.PI * 1.25, phase: 0 },
    { x: -11.2, z: 29.4, arm: 0, ang: -Math.PI * 0.25, phase: 1 },
    { x: -11.4, z: -1.0, arm: 0, ang: Math.PI * 0.6, phase: 0 },
  ];
  for (const s of signalSpots) { const S = signal(metal, s); S.position.set(s.x, CURB, s.z); S.userData.phase = s.phase; scene.add(S); out.signals.push(S); }
  // ciclo dos semáforos (em time-lapse eles trocam rápido)
  ctx.updaters.push(t => { for (const S of out.signals) { const c = ((t + S.userData.phase * 1.3) % 2.6) / 2.6; const on = c < 0.45 ? 2 : c < 0.55 ? 1 : 0; for (const h of S.userData.heads) h.userData.lights.forEach((m, i) => m.material.color.copy(i === on ? m.userData.on : m.userData.off)); } });

  // ---------- prédios ----------
  out.buildings = buildBlocks(ctx, r);

  // ---------- luzes distantes (viram bokeh): postes e vitrines ao longo das ruas do fundo ----------
  {
    const rr = rng(909);
    const geo = new THREE.SphereGeometry(0.55, 10, 8);
    const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.68, 0.34).multiplyScalar(26), fog: false });
    const warm2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.8, 0.5).multiplyScalar(14), fog: false });
    const cool = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.82, 1.0).multiplyScalar(12), fog: false });
    out.bokeh = [];
    const put = (x, y, z, m, s = 1) => { const b = new THREE.Mesh(geo, m); b.position.set(x, y, z); b.scale.setScalar(s); b.userData.s = s; scene.add(b); out.bokeh.push(b); };
    // postes ao longo das ruas B e D, bem ao fundo
    for (let z = -52; z > -260; z -= 17) { put(STREET.E[0] - 1.2, 14, z, warm, 1.3); put(STREET.E[1] + 1.2, 14, z - 8, warm, 1.3); put(STREET.B[1] + 1.2, 14, z - 4, warm, 1.2); }
    for (let x = -160; x < 200; x += 19) { if (Math.abs(x) < 40) continue; put(x, 14, STREET.C[0] - 1.2, warm, 1.2); }
    // vitrines e janelas soltas no fundo (topo do quadro)
    for (let i = 0; i < 320; i++) {
      const x = rr.range(-150, 110), z = rr.range(-250, -44), y = rr.range(2, 24);
      if (x > -13 && x < 3) continue;   // a rua E fica livre para os faróis
      put(x, y, z, rr() < 0.75 ? warm2 : cool, rr.range(0.6, 1.4));
    }
  }

  // ---------- time-lapse: tudo "ferve" um pouco de um quadro para o outro ----------
  const hh = (a, b) => { const x = Math.sin(a * 91.7 + b * 37.3) * 43758.5453; return x - Math.floor(x); };
  ctx.updaters.push(t => {
    const f = Math.round(t * 24);
    out.bokeh.forEach((b, i) => { const k = hh(i, f); b.scale.setScalar(b.userData.s * (0.78 + 0.44 * k)); b.visible = k > 0.03; });
    out.trees.forEach((tr, i) => { tr.rotation.y = (hh(i + 50, f) - 0.5) * 0.022; tr.scale.set(1 + (hh(i + 70, f) - 0.5) * 0.006, 1 + (hh(i + 90, f) - 0.5) * 0.005, 1 + (hh(i + 110, f) - 0.5) * 0.006); });
  });

  // ---------- miudezas de rua ----------
  out.props.push(...streetProps(ctx));
  return out;
}

// ---------------- árvores de maquete (tufos de espuma) ----------------
export function clump(rad, rr, detail = 2, rough = 0.32) {
  const g = new THREE.IcosahedronGeometry(rad, detail);
  const p = g.attributes.position; const o = rr() * 100;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = fbm3(x / rad * 1.3 + o, y / rad * 1.3, z / rad * 1.3, 3);
    const k = 1 + n * rough + (rr() - 0.5) * 0.06;
    p.setXYZ(i, x * k, y * k * 0.86, z * k);
  }
  g.computeVertexNormals();
  return g;
}
export function tint(g, base, rr, lo = 0.75, hi = 1.2, topLift = 0.25) {
  const p = g.attributes.position; const col = new Float32Array(p.count * 3);
  g.computeBoundingBox(); const y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y;
  for (let i = 0; i < p.count; i++) {
    const k = lo + (hi - lo) * rr();
    const t = (p.getY(i) - y0) / Math.max(1e-3, y1 - y0);
    const lift = 1 + topLift * (t - 0.5);
    col[i * 3] = base.r * k * lift; col[i * 3 + 1] = base.g * k * lift; col[i * 3 + 2] = base.b * k * lift;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const barkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.9 });
const leafMat = addFoam(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), { freq: 2.2, bump: 0.16, color: 0.5, freq2: 5.2, mix2: 0.7, key: 'leaf' });
const tuftGeo = new THREE.IcosahedronGeometry(1, 0);
const tuftMat = new THREE.MeshStandardMaterial({ roughness: 0.88, flatShading: true });
export function tree({ h = 12, cr = 6, tone = 0x3d5a22, seed = 1, lit = 0.6, fine = false }) {
  const rr = rng(seed); const grp = new THREE.Group(); const centers = [];
  // tronco em segmentos levemente tortos + galhos
  const trunkGeos = [];
  const seg = (a, b, r0, r1) => {
    const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
    const g = new THREE.CylinderGeometry(r1, r0, len, 10, 1);
    g.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    g.applyQuaternion(q); g.translate(a.x, a.y, a.z); trunkGeos.push(g);
  };
  let p0 = new THREE.Vector3(0, 0, 0); const crownY = h * 0.62;
  let p1 = new THREE.Vector3(rr.range(-0.4, 0.4), crownY * 0.5, rr.range(-0.4, 0.4));
  let p2 = new THREE.Vector3(rr.range(-0.6, 0.6), crownY, rr.range(-0.6, 0.6));
  seg(p0, p1, 0.85, 0.62); seg(p1, p2, 0.62, 0.42);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rr() * 0.6;
    const base = p1.clone().lerp(p2, 0.3 + rr() * 0.7);
    const tip = base.clone().add(new THREE.Vector3(Math.cos(a) * cr * 0.55, rr.range(1.5, 3.5), Math.sin(a) * cr * 0.55));
    seg(base, tip, 0.3, 0.1);
  }
  seg(p2, p2.clone().add(new THREE.Vector3(0, h * 0.3, 0)), 0.3, 0.1);
  const trunk = new THREE.Mesh(mergeGeometries(trunkGeos), barkMat); trunk.castShadow = trunk.receiveShadow = true; grp.add(trunk);
  // copa: tufos
  const geos = []; const n = Math.round(cr * cr * 1.5);
  const cy = crownY + h * 0.2;
  const baseC = new THREE.Color(tone);
  for (let i = 0; i < n; i++) {
    // distribuição em elipsoide achatado, mais densa na casca
    const u = rr(), v = rr(); const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1);
    const rad = Math.pow(rr(), 0.35);
    const x = Math.sin(ph) * Math.cos(th) * cr * rad, y = Math.cos(ph) * h * 0.26 * rad, z = Math.sin(ph) * Math.sin(th) * cr * rad;
    const s = rr.range(1.1, 2.0) * (cr / 7.5);
    const g = clump(s, rr, 3, 0.28); g.translate(x, cy + y, z);
    const top = (y / (h * 0.26) + 1) / 2; // 0 embaixo, 1 em cima
    const c = colorJitter(baseC, rr, 0.12);
    // topo pega a luz quente (mais oliva/amarelo), base mais escura
    const warm = new THREE.Color(0xb8b048);
    c.lerp(warm, clamp(top * 0.55 * lit + (rr() - 0.5) * 0.1));
    c.multiplyScalar(0.5 + 0.62 * top);
    tint(g, c, rr, 0.62, 1.3, 0.35);
    geos.push(g); centers.push({ x, y: cy + y, z, s, col: c.clone() });
  }
  const crown = new THREE.Mesh(mergeGeometries(geos), leafMat); crown.castShadow = true; crown.receiveShadow = true; grp.add(crown);
  // folhagem fina: milhares de floquinhos facetados na casca dos tufos (é o que dá a cara de espuma de maquete)
  if (fine) {
    const per = 90, N2 = centers.length * per; const im = new THREE.InstancedMesh(tuftGeo, tuftMat, N2);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    let k = 0;
    for (const c of centers) for (let j = 0; j < per; j++) {
      const u = rr(), w2 = rr(); const th = u * Math.PI * 2, ph = Math.acos(2 * w2 - 1);
      const d = c.s * rr.range(0.86, 1.12);
      v.set(c.x + Math.sin(ph) * Math.cos(th) * d, c.y + Math.cos(ph) * d * 0.86, c.z + Math.sin(ph) * Math.sin(th) * d);
      e.set(rr() * 6.28, rr() * 6.28, rr() * 6.28); q.setFromEuler(e);
      const s2 = c.s * rr.range(0.085, 0.17); sc.set(s2, s2 * rr.range(0.6, 1), s2);
      m4.compose(v, q, sc); im.setMatrixAt(k, m4);
      const up = clamp((Math.cos(ph) + 1) / 2);
      col.copy(c.col).multiplyScalar(rr.range(0.6, 1.45) * (0.6 + 0.65 * up)); im.setColorAt(k, col); k++;
    }
    im.castShadow = true; im.receiveShadow = true; grp.add(im);
  }
  return grp;
}

// ---------------- postes ----------------
const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.72, 0.38).multiplyScalar(12), fog: false });
function lamp(metal, { ang = 0, main = true }) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 1.7, 16), metal); base.position.y = 0.85; g.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 6, 16), metal); ring.rotation.x = Math.PI / 2; ring.position.y = 1.75; g.add(ring);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.27, 12.6, 14), metal); pole.position.y = 7.9; g.add(pole);
  const armLen = 3.6, top = 14.0;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, armLen, 8), metal); arm.rotation.z = Math.PI / 2; arm.position.set(armLen / 2, top, 0);
  const head = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.55, 0.9, 3, 0.18), metal); head.position.set(armLen, top - 0.08, 0);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.62), bulbMat); bulb.position.set(armLen, top - 0.4, 0);
  const pivot = new THREE.Group(); pivot.add(arm, head, bulb); pivot.rotation.y = ang; g.add(pivot);
  for (const m of [base, pole, arm, head]) { m.castShadow = true; m.receiveShadow = true; }
  // luz pontual (só nos postes que importam para a imagem)
  if (main) {
    const L = new THREE.PointLight(0xffb878, 760, 46, 2);
    const off = new THREE.Vector3(armLen, top - 1.0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
    L.position.copy(off); g.add(L); g.userData.light = L;
  }
  return g;
}

const sigHousing = new THREE.MeshStandardMaterial({ color: 0x3a3112, roughness: 0.55 });
function signal(metal, { arm = 0, ang = 0 }) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 10.8, 12), metal); pole.position.y = 5.4; pole.castShadow = true; g.add(pole);
  const heads = [];
  const mkHead = () => {
    const hg = new THREE.Group();
    const box = new THREE.Mesh(new RoundedBoxGeometry(0.7, 1.95, 0.6, 2, 0.1), sigHousing); box.castShadow = true; hg.add(box);
    const lights = [];
    [0xff2a1a, 0xffb21a, 0x2aff7a].forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.06), fog: false }));
      m.position.set(0, 0.6 - i * 0.6, 0.31); m.userData.on = new THREE.Color(c).multiplyScalar(14); m.userData.off = new THREE.Color(c).multiplyScalar(0.05);
      hg.add(m); lights.push(m);
    });
    hg.userData.lights = lights; hg.rotation.y = THREE.MathUtils.degToRad(44) - ang; heads.push(hg); return hg;
  };
  const piv = new THREE.Group(); piv.rotation.y = ang; g.add(piv);
  if (arm > 0) {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, arm, 8), metal); a.rotation.z = Math.PI / 2; a.position.set(arm / 2, 10.2, 0); a.castShadow = true; piv.add(a);
    const h1 = mkHead(); h1.position.set(arm * 0.55, 8.8, 0.3); piv.add(h1);
    const h2 = mkHead(); h2.position.set(arm * 0.95, 8.8, 0.3); piv.add(h2);
  }
  const h0 = mkHead(); h0.position.set(0, 7.6, 0.6); piv.add(h0);
  g.userData.heads = heads;
  return g;
}

// ---------------- quarteirões com prédios ----------------
function building(ctx, { x, z, w, d, h, seed, wall = '#3b2c25', lit = 0.4, store = true, awning = null, rotY = 0 }) {
  const grp = new THREE.Group();
  const [map, em] = TX.facade(seed, { cols: Math.max(3, Math.round(w / 3.2)), rows: Math.max(3, Math.round(h / 3.3)), lit, wall });
  const mat = new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.85 });
  const roofM = new THREE.MeshStandardMaterial({ color: 0x1c1816, roughness: 0.9 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mat, mat, roofM, roofM, mat, mat]); box.position.y = h / 2; box.castShadow = box.receiveShadow = true; grp.add(box);
  const cor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.5, d + 0.5), new THREE.MeshStandardMaterial({ color: 0x2a221e, roughness: 0.8 })); cor.position.y = h; grp.add(cor);
  if (store) {
    // vitrines pontuais (não uma faixa contínua): algumas acesas, a maioria escura
    const rs = rng(seed * 7 + 1);
    const lit1 = new THREE.MeshStandardMaterial({ color: 0x221a14, emissive: new THREE.Color(1.0, 0.62, 0.3), emissiveIntensity: 2.2, roughness: 0.3 });
    const dark1 = new THREE.MeshStandardMaterial({ color: 0x15110e, roughness: 0.25, metalness: 0.3 });
    for (const [ax, len, fx, fz] of [['z', w, 0, d / 2 + 0.05], ['x', d, w / 2 + 0.05, 0]]) {
      const n = Math.max(2, Math.round(len / 7));
      for (let i = 0; i < n; i++) {
        const o = -len / 2 + (i + 0.5) * len / n; const m2 = rs() < 0.4 ? lit1 : dark1;
        const sgeo = ax === 'z' ? new THREE.BoxGeometry(len / n - 2.2, 4.2, 0.08) : new THREE.BoxGeometry(0.08, 4.2, len / n - 2.2);
        const sm = new THREE.Mesh(sgeo, m2); sm.position.set(ax === 'z' ? o : fx, 2.6, ax === 'z' ? fz : o); grp.add(sm);
      }
    }
    if (awning) {
      const am = new THREE.MeshStandardMaterial({ color: awning, roughness: 0.7 });
      const a1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.2, 2.6), am); a1.position.set(-w * 0.15, 5.6, d / 2 + 1.2); a1.rotation.x = 0.4; a1.castShadow = true; grp.add(a1);
      const a2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, d * 0.45), am); a2.position.set(w / 2 + 1.2, 5.6, d * 0.12); a2.rotation.z = -0.4; a2.castShadow = true; grp.add(a2);
    }
  }
  grp.position.set(x, CURB, z); grp.rotation.y = rotY;
  ctx.scene.add(grp); return grp;
}

function buildBlocks(ctx, r) {
  const B = [];
  B.push(nearBrick(ctx));
  // do outro lado da rua D: prédio com toldo vermelho e vizinhos
  B.push(building(ctx, { x: -45, z: 6, w: 24, d: 22, h: 30, seed: 5, wall: '#4a2a20', lit: 0.25, awning: 0xb3202a }));
  B.push(building(ctx, { x: -46, z: -16, w: 24, d: 18, h: 36, seed: 6, wall: '#3d342c', lit: 0.45, awning: 0x8a5a2a }));
  // do outro lado da rua B
  B.push(building(ctx, { x: 58, z: -4, w: 36, d: 24, h: 26, seed: 8, wall: '#2f2a26', lit: 0.5, awning: 0x2a5a6a }));
  // fundo (além da rua C): fileira de fachadas para o bokeh
  for (let i = 0; i < 6; i++) {
    const x = [-84, -56, -29, 19, 47, 75][i];
    B.push(building(ctx, { x, z: -72 + r.range(-3, 3), w: 24, d: 40, h: 20 + r() * 30, seed: 20 + i, wall: r.pick(['#3a2c24', '#2e2824', '#4a3226']), lit: 0.35 + r() * 0.3, awning: r.pick([0xb3202a, 0x2a5a6a, 0x8a5a2a, null]) }));
  }
  for (let i = 0; i < 5; i++) B.push(building(ctx, { x: 120, z: -90 + i * 40, w: 30, d: 34, h: 22 + r() * 26, seed: 40 + i, lit: 0.45 }));
  for (let i = 0; i < 5; i++) B.push(building(ctx, { x: -120, z: -90 + i * 40, w: 30, d: 34, h: 22 + r() * 26, seed: 50 + i, lit: 0.45 }));
  for (let i = 0; i < 4; i++) B.push(building(ctx, { x: [-72, -34, 24, 62][i], z: -130, w: 34, d: 30, h: 30 + r() * 30, seed: 60 + i, lit: 0.45 }));
  return B;
}

// prédio de tijolo do primeiro plano (canto inferior esquerdo da imagem)
function nearBrick(ctx) {
  const grp = new THREE.Group();
  const bt = TX.brick(41, [118, 54, 38]); bt.repeat.set(4, 6);
  const w = 46, d = 50, h = 64;
  const brickMat = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.88, color: 0xd8c4b8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), brickMat); body.position.y = h / 2; body.castShadow = false; body.receiveShadow = true; grp.add(body);
  // vitrine acesa no térreo (lados voltados para a rua A e para o cruzamento)
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x2a1c12, emissive: new THREE.Color(1.0, 0.74, 0.4), emissiveIntensity: 5.5, roughness: 0.25 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xa89c8a, roughness: 0.7 });
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5a2c1e, roughness: 0.85 });
  const winMat = new THREE.MeshStandardMaterial({ color: 0x1b1410, emissive: new THREE.Color(1.0, 0.7, 0.36), emissiveIntensity: 1.8, roughness: 0.3 });
  const darkWin = new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 0.2, metalness: 0.3 });
  const faces = [{ axis: 'x', sign: 1 }, { axis: 'z', sign: -1 }];
  for (const f of faces) {
    const len = f.axis === 'x' ? d : w;
    const place = (m, along, y, out = 0.06) => {
      if (f.axis === 'x') { m.position.set(f.sign * (w / 2 + out), y, along); m.rotation.y = f.sign * Math.PI / 2; }
      else { m.position.set(along, y, f.sign * (d / 2 + out)); m.rotation.y = f.sign > 0 ? 0 : Math.PI; }
      grp.add(m); return m;
    };
    // vitrine
    for (let i = 0; i < 3; i++) {
      const s = place(new THREE.Mesh(new THREE.PlaneGeometry(len / 3 - 1.6, 5.8), glassMat), -len / 2 + len / 6 + i * len / 3, 3.4);
      const fr = place(new THREE.Mesh(new THREE.BoxGeometry(len / 3 - 1.0, 0.4, 0.5), frameMat), -len / 2 + len / 6 + i * len / 3, 6.4, 0.25);
    }
    // toldo verde-azulado
    const aw = place(new THREE.Mesh(new THREE.BoxGeometry(len - 0.6, 0.25, 3.4), new THREE.MeshStandardMaterial({ color: 0x0f5b5c, roughness: 0.6 })), 0, 7.6, 1.7);
    aw.rotateX(0.38); aw.castShadow = true;
    const val = place(new THREE.Mesh(new THREE.BoxGeometry(len - 0.6, 1.0, 0.12), new THREE.MeshStandardMaterial({ color: 0x0d4a4b, roughness: 0.6 })), 0, 6.6, 3.3);
    // janelas dos andares
    const r = rng(f.axis === 'x' ? 3 : 4);
    for (let fl = 0; fl < 9; fl++) for (let i = 0; i < 5; i++) {
      const lit = r() < 0.22;
      const wm = place(new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.2), lit ? winMat : darkWin), -len / 2 + len / 10 + i * len / 5, 12.0 + fl * 5.6);
      place(new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.5, 0.5), frameMat), -len / 2 + len / 10 + i * len / 5, 14.3 + fl * 5.6, 0.25);
      for (const sx of [-1, 1]) place(new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.4, 0.35), frameMat), -len / 2 + len / 10 + i * len / 5 + sx * 1.75, 12.0 + fl * 5.6, 0.18);
      const sill = place(new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.35, 0.6), frameMat), -len / 2 + len / 10 + i * len / 5, 9.7 + fl * 5.6, 0.3);
    }
    // cornija entre térreo e andares
    place(new THREE.Mesh(new THREE.BoxGeometry(len + 0.6, 1.3, 1.0), frameMat), 0, 9.0, 0.5);
    for (let i = 0; i <= 3; i++) place(new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.6, 0.5), pillarMat), -len / 2 + i * len / 3, 3.3, 0.25);
  }
  grp.position.set(7 - w / 2, CURB, 33 + d / 2); grp.rotation.y = 0;
  ctx.scene.add(grp);
  // luz que sai da vitrine para a calçada
  const L = new THREE.PointLight(0xffa860, 260, 30, 2); L.position.set(grp.position.x + w / 2 + 3.5, 4.5, grp.position.z - d / 2 - 3.0); ctx.scene.add(L);
  const L2 = new THREE.PointLight(0xffb070, 900, 70, 2); L2.position.set(grp.position.x + w / 2 + 14, 16, grp.position.z - d / 2 + 14); ctx.scene.add(L2);
  return grp;
}

// ---------------- miudezas ----------------
function streetProps(ctx) {
  const { scene } = ctx; const list = [];
  const red = new THREE.MeshStandardMaterial({ color: 0xb4231c, roughness: 0.45 });
  const hydrant = () => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.9, 12), red); b.position.y = 0.45; g.add(b);
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), red); t.position.y = 0.9; g.add(t);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), red); s.rotation.z = Math.PI / 2; s.position.y = 0.62; g.add(s);
    g.traverse(m => { m.castShadow = true; }); return g;
  };
  const h1 = hydrant(); h1.scale.setScalar(1.9); h1.position.set(1.4, CURB, 11.7); scene.add(h1); list.push(h1);
  const h2 = hydrant(); h2.scale.setScalar(1.9); h2.position.set(29.6, CURB, -4); scene.add(h2);
  // lixeira
  const bin = new THREE.Mesh(new RoundedBoxGeometry(0.8, 1.1, 0.8, 2, 0.1), new THREE.MeshStandardMaterial({ color: 0x1f2a26, roughness: 0.6 }));
  bin.scale.setScalar(1.9); bin.position.set(11.2, CURB + 1.05, -6); bin.castShadow = true; scene.add(bin);
  return list;
}
