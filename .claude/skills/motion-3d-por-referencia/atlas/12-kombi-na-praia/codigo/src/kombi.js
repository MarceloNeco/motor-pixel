// A kombi food truck: cabine azul, baú vermelho com janela de atendimento,
// pilha de panquecas com calda e frutas no teto. Tudo em primitivas, sem modelo de arquivo.
// Referencial do chassi: origem no chão, no meio do entre-eixos; +X frente, +Y cima, +Z lado direito (o da janela).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, TAU, PI, clamp } from './geo.js';
import { WB, WR, NP, TH, STACK_X, STACK_Y, NB, BERRY_R, stackScale } from './sim.js';

const C = {
  blue: 0x3d84e0, red: 0xde5546, cream: 0xf7edd8, white: 0xf4f5f2, chrome: 0xe4eaf1, tire: 0x2a2a30, dark: 0x1c1d24,
  maroon: 0x5c2233, awn: 0x7f9be0, amber: 0xffa62b, skin: 0xf3c7a0, pan: 0xf2dfb4, panTop: 0xdcaa62, syrup: 0xcf6d0c,
};
const phys = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.32, ...o });
const std = (c, r = 0.7, m = 0, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...o });

const BODY_DX = 0.125;   // corpo deslocado para as rodas caírem em x = ±WB

// Recorta janelas numa casca fechada (descarta os fragmentos) e faz o mesmo no mapa de sombra,
// para a luz do sol entrar de verdade pela janela.
function withHoles(mesh, holes) {
  const f = n => n.toFixed(3);
  const code = holes.map(h => {
    const cond = h.face === 'x+' ? `vLp.x > ${f(h.thr)}` : h.face === 'z+' ? `vLp.z > ${f(h.thr)}` : `abs(vLp.z) > ${f(h.thr)}`;
    const uv = h.face === 'x+' ? 'vLp.zy' : 'vLp.xy';
    return `{ vec2 q = abs(${uv} - vec2(${f(h.c[0])}, ${f(h.c[1])})) - vec2(${f(h.h[0] - h.r)}, ${f(h.h[1] - h.r)}); if (${cond} && length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - ${f(h.r)} < 0.0) discard; }`;
  }).join('\n');
  const patch = s => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLp;').replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + code);
  };
  mesh.material.onBeforeCompile = patch;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); mesh.customDepthMaterial.onBeforeCompile = patch;
  return mesh;
}

export function makeKombi() {
  const M = {
    blue: phys(C.blue), red: phys(C.red), cream: std(C.cream, 0.55), white: phys(C.white, { roughness: 0.35 }),
    chrome: std(C.chrome, 0.2, 1), tire: std(C.tire, 0.9), dark: std(C.dark, 0.8), maroon: std(C.maroon, 0.85),
    awn: phys(C.awn, { roughness: 0.5, clearcoat: 0.25 }), amber: std(C.amber, 0.3, 0, { emissive: 0xff8a10, emissiveIntensity: 0.35 }),
    lamp: std(0xfff7df, 0.15, 0, { emissive: 0xffe9b0, emissiveIntensity: 0.9 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xbcd4f6, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.34, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 }),
    skin: std(C.skin, 0.75), teal: std(0x2fb6a6, 0.7), pink: std(0xf08aa8, 0.7), coral: std(0xf0685a, 0.6), hair: std(0x5a3a26, 0.8),
    steel: std(0xcfd6de, 0.3, 0.9), red2: std(0xd8402f, 0.4, 0, { emissive: 0xa01808, emissiveIntensity: 0.4 }),
  };
  const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const add = (p, geo, mat, x = 0, y = 0, z = 0) => { const m = sh(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); p.add(m); return m; };
  const rb = (p, w, h, d, r, mat, x, y, z) => add(p, new RoundedBoxGeometry(w, h, d, 5, r), mat, x, y, z);
  const cylX = (p, r, len, mat, x, y, z, seg = 28) => { const m = add(p, new THREE.CylinderGeometry(r, r, len, seg), mat, x, y, z); m.rotation.z = PI / 2; return m; };
  const cylZ = (p, r, len, mat, x, y, z, seg = 28) => { const m = add(p, new THREE.CylinderGeometry(r, r, len, seg), mat, x, y, z); m.rotation.x = PI / 2; return m; };
  const rod = (p, a, b, r, mat) => {                       // cilindro entre dois pontos
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), m = add(p, new THREE.CylinderGeometry(r, r, d.length(), 10), mat);
    m.position.copy(va).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
  };

  const root = new THREE.Group();
  const chassis = new THREE.Group(); root.add(chassis);
  const body = new THREE.Group(); body.position.x = BODY_DX; chassis.add(body);

  // ---------- cabine ----------
  // um pão de forma arredondado (y .42..2.18, frente em x=2.15) com para-brisa envolvente e janelas laterais recortados
  const CABC = [1.22, 1.30];
  const cab = add(body, new RoundedBoxGeometry(1.86, 1.76, 1.78, 8, 0.30), phys(C.blue), CABC[0], CABC[1], 0);
  withHoles(cab, [
    { face: 'x+', thr: 0.60, c: [0, 0.40], h: [0.78, 0.275], r: 0.11 },
    { face: 'z', thr: 0.60, c: [0.045, 0.40], h: [0.755, 0.275], r: 0.11 },
  ]);
  rb(body, 1.84, 0.62, 1.762, 0.29, M.glass, 1.22, 1.70, 0).castShadow = false;     // vidro, um fio para dentro da lataria
  rb(body, 1.66, 0.05, 1.6, 0.02, M.dark, 1.22, 1.415, 0);                          // tampo interno na linha da janela
  rb(body, 1.66, 0.04, 1.6, 0.02, M.dark, 1.22, 2.0, 0).castShadow = false;
  rb(body, 0.05, 0.62, 1.6, 0.02, std(0x7a2c33, 0.8), 0.37, 1.70, 0);
  for (const s of [1, -1]) {
    rb(body, 0.05, 0.56, 0.035, 0.012, M.blue, 1.20, 1.70, s * 0.878);              // divisória da porta
    // espelho
    rod(body, [1.99, 1.47, s * 0.86], [2.02, 1.55, s * 1.03], 0.014, M.chrome);
    rb(body, 0.045, 0.17, 0.12, 0.02, M.chrome, 2.025, 1.59, s * 1.06);
    // maçaneta e friso da porta
    rb(body, 0.16, 0.035, 0.03, 0.012, M.chrome, 1.02, 1.24, s * 0.895);
    rb(body, 0.014, 0.86, 0.012, 0.004, M.dark, 0.86, 0.95, s * 0.889).castShadow = false;
    // farol
    const ring = add(body, new THREE.TorusGeometry(0.165, 0.03, 12, 36), M.chrome, 2.152, 0.95, s * 0.60); ring.rotation.y = PI / 2;
    const lens = add(body, new THREE.SphereGeometry(0.15, 24, 16), M.lamp, 2.13, 0.95, s * 0.60); lens.scale.x = 0.42;
    rb(body, 0.035, 0.075, 0.17, 0.015, M.amber, 2.148, 1.335, s * 0.70);          // pisca
    // limpador
    const wp = rb(body, 0.02, 0.30, 0.018, 0.006, M.dark, 2.152, 1.56, s * 0.30); wp.rotation.x = s * 0.9; wp.castShadow = false;
  }
  rb(body, 0.03, 0.085, 1.14, 0.014, M.cream, 2.155, 1.335, 0);                   // faixa creme sob o para-brisa
  // emblema neutro (sem marca): aro cromado, disco creme, miolo coral
  const br = add(body, new THREE.TorusGeometry(0.2, 0.024, 12, 44), M.chrome, 2.158, 1.02, 0); br.rotation.y = PI / 2;
  cylX(body, 0.185, 0.025, M.cream, 2.155, 1.02, 0, 40);
  cylX(body, 0.085, 0.035, M.coral, 2.158, 1.02, 0, 28);
  rb(body, 0.17, 0.165, 1.94, 0.07, M.white, 2.21, 0.50, 0);                      // para-choque
  rb(body, 0.02, 0.10, 0.34, 0.008, M.cream, 2.298, 0.50, 0);                     // placa lisa
  // interior da cabine
  rb(body, 0.22, 0.10, 1.5, 0.04, M.dark, 1.90, 1.47, 0);
  rb(body, 0.12, 0.5, 1.5, 0.05, M.dark, 0.62, 1.62, 0);
  const sw = add(body, new THREE.TorusGeometry(0.16, 0.02, 10, 28), M.dark, 1.66, 1.6, -0.40); sw.rotation.y = PI / 2; sw.rotation.z = 0.5;
  const person = (z, shirt, hat) => {
    const g = new THREE.Group(); g.position.set(1.06, 1.30, z); body.add(g);
    add(g, new THREE.CapsuleGeometry(0.17, 0.26, 6, 16), shirt, 0, 0.18, 0);
    add(g, new THREE.SphereGeometry(0.165, 24, 18), M.skin, 0.04, 0.55, 0);
    if (hat === 'cap') { const c = add(g, new THREE.SphereGeometry(0.172, 24, 12, 0, TAU, 0, PI / 2), M.coral, 0.04, 0.58, 0); const b = rb(g, 0.16, 0.025, 0.2, 0.01, M.coral, 0.2, 0.60, 0); b.rotation.z = -0.15; }
    else { add(g, new THREE.SphereGeometry(0.176, 24, 12, 0, TAU, 0, PI * 0.55), M.hair, 0.02, 0.57, 0); add(g, new THREE.SphereGeometry(0.085, 16, 12), M.hair, -0.1, 0.74, 0); }
    return g;
  };
  const driver = person(-0.40, M.teal, 'cap'), pass = person(0.40, M.pink, 'bun');

  // ---------- baú ----------
  const BX = -0.98, BY = 1.50, WIN = { cx: -1.18, cy: 1.735, hx: 0.88, hy: 0.465, r: 0.08 };
  withHoles(rb(body, 2.78, 2.04, 1.94, 0.13, phys(C.red), BX, BY, 0), [{ face: 'z+', thr: 0.9, c: [WIN.cx - BX, WIN.cy - BY], h: [WIN.hx, WIN.hy], r: WIN.r }]);   // casca (x −2.37..0.41, y .48..2.52)
  const liner = add(body, new THREE.BoxGeometry(2.6, 1.86, 1.8), std(0x6e2b3e, 0.9, 0, { side: THREE.BackSide, emissive: 0x4a1826, emissiveIntensity: 0.55 }), BX, BY, 0); liner.castShadow = false;
  // moldura, balcão e toldo
  rb(body, 1.92, 0.07, 0.08, 0.02, M.awn, WIN.cx, WIN.cy + WIN.hy + 0.02, 0.972);
  rb(body, 0.07, 1.0, 0.08, 0.02, M.awn, WIN.cx - WIN.hx - 0.02, WIN.cy, 0.972);
  rb(body, 0.07, 1.0, 0.08, 0.02, M.awn, WIN.cx + WIN.hx + 0.02, WIN.cy, 0.972);
  rb(body, 2.0, 0.055, 0.34, 0.022, M.awn, WIN.cx, WIN.cy - WIN.hy - 0.03, 1.10);
  const flap = new THREE.Group(); flap.position.set(WIN.cx, WIN.cy + WIN.hy + 0.06, 0.975); flap.rotation.x = -0.30; body.add(flap);
  rb(flap, 2.0, 0.045, 1.02, 0.02, M.awn, 0, 0, 0.51);
  for (const s of [1, -1]) {
    const x = WIN.cx + s * 0.94, ty = WIN.cy + WIN.hy + 0.06 + Math.sin(0.30) * 0.96, tz = 0.975 + Math.cos(0.30) * 0.96;
    rod(body, [x, WIN.cy - WIN.hy + 0.04, 0.99], [x, ty - 0.02, tz], 0.014, M.chrome);
  }
  // interior: prateleiras com potes, bancada, batedeira, pratos, frigideira
  rb(body, 1.9, 0.05, 0.7, 0.02, M.cream, WIN.cx, WIN.cy - WIN.hy - 0.03, 0.55);
  const jarC = [0xd9861c, 0xc9342c, 0xf4f1e8, 0x2fb6a6, 0xd9861c, 0xf2c94c, 0xf4f1e8, 0xc9342c, 0x7f9be0];
  for (let r = 0; r < 2; r++) {
    rb(body, 1.66, 0.03, 0.2, 0.01, M.cream, WIN.cx, 1.66 + r * 0.30, -0.76);
    for (let i = 0; i < 8; i++) { const h = 0.12 + ((i * 7 + r * 3) % 4) * 0.02; add(body, new THREE.CylinderGeometry(0.052, 0.052, h, 14), std(jarC[(i + r * 4) % jarC.length], 0.35, 0, { emissive: jarC[(i + r * 4) % jarC.length], emissiveIntensity: 0.25 }), WIN.cx - 0.72 + i * 0.205, 1.675 + r * 0.30 + h / 2, -0.76); }
  }
  rb(body, 0.34, 0.36, 0.26, 0.08, M.white, -0.72, 1.46, 0.42);                    // batedeira
  rb(body, 0.36, 0.11, 0.22, 0.05, M.white, -0.80, 1.63, 0.42);
  add(body, new THREE.CylinderGeometry(0.11, 0.085, 0.13, 20), M.steel, -0.93, 1.345, 0.42);
  for (let i = 0; i < 5; i++) add(body, new THREE.CylinderGeometry(0.1, 0.1, 0.014, 20), M.white, -1.72, 1.29 + i * 0.016, 0.52);
  add(body, new THREE.CylinderGeometry(0.13, 0.12, 0.03, 22), M.dark, -1.34, 1.295, 0.5);
  add(body, new THREE.CylinderGeometry(0.1, 0.1, 0.022, 20), std(C.panTop, 0.8), -1.34, 1.318, 0.5);
  rb(body, 0.2, 0.02, 0.03, 0.008, M.dark, -1.18, 1.30, 0.6).rotation.y = -0.7;
  // faixa creme ondulada na lateral (o nosso desenho; a referência usa um sorriso de marca)
  {
    const N = 96, x0 = -2.2, x1 = 0.24, pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = x0 + (x1 - x0) * u, yc = 1.035 + 0.055 * Math.sin(u * TAU * 3.5), tp = 0.0375 * Math.min(1, Math.min(u, 1 - u) * 14 + 0.25);
      pos.push(x, yc - tp, 0.9735, x, yc + tp, 0.9735);
      if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 3, a, a + 3, a + 1); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = add(body, g, std(C.cream, 0.5, 0, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.castShadow = false;
    const g2 = g.clone(); g2.scale(1, 1, -1); g2.index.array.reverse(); g2.computeVertexNormals();
    add(body, g2, m.material).castShadow = false;
  }
  for (const s of [1, -1]) rb(body, 0.03, 0.2, 0.13, 0.012, M.red2, -2.372, 0.98, s * 0.72);   // lanternas
  rb(body, 0.15, 0.15, 1.92, 0.06, M.white, -2.42, 0.50, 0);
  rb(body, 4.3, 0.2, 1.5, 0.05, M.dark, -0.1, 0.43, 0);                            // assoalho
  cylX(body, 0.035, 0.3, M.steel, -2.42, 0.34, -0.5, 12);
  // prato sob a pilha
  add(body, new THREE.CylinderGeometry(0.92, 0.84, 0.06, 48), M.white, STACK_X - BODY_DX, STACK_Y - 0.035, 0);
  const rim = add(body, new THREE.TorusGeometry(0.92, 0.022, 10, 56), M.white, STACK_X - BODY_DX, STACK_Y - 0.008, 0); rim.rotation.x = PI / 2;

  // ---------- rodas ----------
  const tireP = []; { const hw = 0.125, r0 = 0.2, r1 = WR; tireP.push(new THREE.Vector2(r0, -hw)); tireP.push(new THREE.Vector2(r1 - 0.05, -hw)); for (let i = 0; i <= 8; i++) { const a = -PI / 2 + PI * i / 8; tireP.push(new THREE.Vector2(r1 - 0.05 + Math.cos(a) * 0.05, Math.sin(a) * hw)); } tireP.push(new THREE.Vector2(r1 - 0.05, hw)); tireP.push(new THREE.Vector2(r0, hw)); }
  const tireG = new THREE.LatheGeometry(tireP, 40); tireG.rotateX(PI / 2);
  const wheels = [];
  for (const [fx, tz, mat] of [[1, 0.87, M.blue], [-1, 0.925, M.red]]) for (const s of [1, -1]) {
    const steer = new THREE.Group(); steer.position.set(fx * WB, WR, s * tz); root.add(steer);
    const w = new THREE.Group(); steer.add(w);
    add(w, tireG, M.tire);
    cylZ(w, 0.225, 0.262, M.cream, 0, 0, 0, 32);
    const ww = add(w, new THREE.TorusGeometry(0.262, 0.02, 8, 40), M.white, 0, 0, s * 0.118);
    const hub = add(w, new THREE.SphereGeometry(0.125, 24, 14), M.chrome, 0, 0, s * 0.12); hub.scale.z = 0.5;
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5; cylZ(w, 0.022, 0.02, M.dark, Math.cos(a) * 0.17, Math.sin(a) * 0.17, s * 0.128, 10); }
    wheels.push({ steer, w, front: fx > 0 });
    // caixa de roda e para-lama, presos ao corpo
    const side = fx > 0 ? 0.892 : 0.972, cx = fx * WB - BODY_DX;
    const arch = add(body, new THREE.CircleGeometry(0.47, 36, 0, PI), std(0x15161b, 0.95, 0, { side: THREE.DoubleSide }), cx, WR + 0.02, s * (side + 0.002)); arch.castShadow = false; if (s < 0) arch.rotation.y = PI;
    add(body, new THREE.TorusGeometry(0.47, 0.05, 10, 30, PI), mat, cx, WR + 0.02, s * (side - 0.012));
  }

  // ---------- pilha de panquecas ----------
  const stack = new THREE.Group(); stack.position.set(STACK_X, STACK_Y, 0); chassis.add(stack);
  const R = rng(77), panMat = std(0xffffff, 0.86, 0, { vertexColors: true });
  const syrupMat = new THREE.MeshPhysicalMaterial({ color: C.syrup, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, emissive: 0x7a2c00, emissiveIntensity: 0.38, envMapIntensity: 1.4 });
  const cTop = new THREE.Color(C.panTop), cSide = new THREE.Color(C.pan), cEdge = new THREE.Color(0xe7c48a), tmp = new THREE.Color();
  const pancakeGeo = (Rr, th, seed) => {
    const e = th * 0.5, pts = [new THREE.Vector2(0.0005, -th / 2), new THREE.Vector2(Rr - e, -th / 2)];
    for (let i = 1; i <= 9; i++) { const a = -PI / 2 + PI * i / 10; pts.push(new THREE.Vector2(Rr - e + Math.cos(a) * e * 0.9, Math.sin(a) * e)); }
    pts.push(new THREE.Vector2(Rr - e, th / 2)); pts.push(new THREE.Vector2(0.0005, th / 2 + 0.012));
    const g = new THREE.LatheGeometry(pts, 64), p = g.attributes.position, r = rng(seed), p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z), k = 1 + (0.03 * Math.sin(2 * a + p1) + 0.018 * Math.sin(5 * a + p2)) * (rr / Rr);
      p.setXYZ(i, x * k, p.getY(i) + 0.01 * Math.sin(3 * a + p3) * (rr / Rr), z * k);
    }
    g.computeVertexNormals();
    const n = g.attributes.normal, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const f = THREE.MathUtils.smoothstep(Math.abs(n.getY(i)), 0.5, 0.92), rr = Math.hypot(p.getX(i), p.getZ(i)) / Rr;
      tmp.copy(cSide).lerp(cEdge, f * 0.9).lerp(cTop, f * THREE.MathUtils.smoothstep(0.96 - rr, 0.0, 0.16));
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
  };
  const pans = [];
  for (let i = 0; i < NP; i++) {
    const Rr = 0.74 + (R() - 0.5) * 0.07, g = new THREE.Group(); stack.add(g);
    const m = add(g, pancakeGeo(Rr, TH, 100 + i), panMat); m.rotation.y = R() * TAU;
    pans.push({ g, Rr, dx: (R() - 0.5) * 0.05, dz: (R() - 0.5) * 0.05 });
  }
  // calda: poça no topo + fios escorrendo, cada trecho preso à panqueca em que encosta
  {
    const top = pans[NP - 1], pts = [[0.0005, 0.05], [0.3, 0.05], [0.47, 0.042], [0.56, 0.02], [0.585, -0.004]].map(a => new THREE.Vector2(a[0], a[1]));
    const g = new THREE.LatheGeometry(pts, 72), p = g.attributes.position, da = [0.70, 1.75, -0.42];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z) / 0.585;
      let k = 1 + 0.09 * Math.sin(3 * a + 1) + 0.06 * Math.sin(5 * a + 2.1);
      for (const d of da) { const dd = Math.atan2(Math.sin(a - d), Math.cos(a - d)); k += 0.27 * Math.exp(-((dd / 0.3) ** 2)); }
      const kk = 1 + (k - 1) * rr; p.setXYZ(i, x * kk, p.getY(i), z * kk);
    }
    g.computeVertexNormals(); add(top.g, g, syrupMat, 0, TH / 2 + 0.006, 0);
  }
  const drips = [], NR = 40, RS = 9;
  for (const [ang, len, w0] of [[0.62, 5, 0.105], [0.86, 3, 0.085], [1.75, 2, 0.075], [-0.42, 2, 0.07]]) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array((NR + 1) * RS * 3), idx = [];
    for (let j = 0; j < NR; j++) for (let k = 0; k < RS; k++) { const a = j * RS + k, b2 = j * RS + (k + 1) % RS; idx.push(a, a + RS, b2, b2, a + RS, b2 + RS); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
    const m = add(stack, geo, syrupMat); m.frustumCulled = false;
    drips.push({ ang, len, w0, geo, pos, curve: new THREE.CatmullRomCurve3([], false, 'centripetal') });
  }
  const dP = (pk, ang, r, y) => new THREE.Vector3(pk.g.position.x + Math.cos(ang) * r * pk.g.scale.x, pk.g.position.y + y * pk.g.scale.y, pk.g.position.z + Math.sin(ang) * r * pk.g.scale.z);
  const dC = new THREE.Vector3(), dT = new THREE.Vector3(), dS = new THREE.Vector3(), dN = new THREE.Vector3();
  function updateDrips() {
    for (const d of drips) {
      const cp = [], top = pans[NP - 1], ang = d.ang;
      cp.push(dP(top, ang, top.Rr - 0.34, TH / 2 + 0.03), dP(top, ang, top.Rr - 0.12, TH / 2 + 0.03), dP(top, ang, top.Rr + 0.005, TH / 2 - 0.035));
      for (let j = 0; j < d.len; j++) {
        const pk = pans[NP - 1 - j]; cp.push(dP(pk, ang, pk.Rr + 0.03, j ? 0 : -0.02));
        if (j < d.len - 1) { const nk = pans[NP - 2 - j], r = Math.min(pk.Rr, nk.Rr) + 0.0; cp.push(dP(pk, ang, r, -TH / 2).add(dP(nk, ang, r, TH / 2)).multiplyScalar(0.5)); }
        else cp.push(dP(pk, ang, pk.Rr + 0.03, -TH * 0.4));
      }
      d.curve.points = cp; dS.set(-Math.sin(ang), 0, Math.cos(ang));
      for (let j = 0; j <= NR; j++) {
        const t = j / NR; d.curve.getPoint(t, dC); d.curve.getTangent(Math.min(t, 0.999), dT); dN.crossVectors(dS, dT).normalize();
        const bulb = Math.exp(-(((t - 0.9) / 0.07) ** 2)), tip = t > 0.93 ? Math.sqrt(Math.max(0, 1 - ((t - 0.93) / 0.07) ** 2)) : 1;
        const w = d.w0 * (1 - 0.38 * t + 0.42 * bulb) * (0.04 + 0.96 * tip), th = w * (0.34 + 0.34 * bulb) * (t < 0.12 ? 0.5 + 4 * t : 1);
        for (let k = 0; k < RS; k++) { const a = k / RS * TAU, ca = Math.cos(a) * w, sa = Math.sin(a) * th, o = (j * RS + k) * 3; d.pos[o] = dC.x + dS.x * ca + dN.x * sa; d.pos[o + 1] = dC.y + dN.y * sa; d.pos[o + 2] = dC.z + dS.z * ca + dN.z * sa; }
      }
      d.geo.attributes.position.needsUpdate = true; d.geo.computeVertexNormals();
    }
  }
  // frutas
  const berries = [], bbMat = std(0x3b1f40, 0.32, 0, { envMapIntensity: 1.2 }), blMat = std(0x3d529f, 0.45), leafMat = std(0x4c9a3c, 0.7);
  const blackberry = rr => {
    const gs = [], n = 46, r = rng(5 + Math.round(rr * 100));
    for (let i = 0; i < n; i++) {
      const y = 1 - 2 * (i + 0.5) / n, rad = Math.sqrt(1 - y * y), a = i * 2.399963;
      const s = new THREE.SphereGeometry(rr * 0.27 * (0.9 + 0.25 * r()), 9, 7).toNonIndexed(); s.deleteAttribute('uv');
      s.translate(Math.cos(a) * rad * rr * 0.80, y * rr * 0.92, Math.sin(a) * rad * rr * 0.80); gs.push(s);
    }
    const core = new THREE.SphereGeometry(rr * 0.78, 12, 10).toNonIndexed(); core.deleteAttribute('uv'); gs.push(core);
    return mergeGeometries(gs);
  };
  const BPOS = [[-0.16, 0.13], [0.21, -0.11], [0.04, 0.33], [-0.31, -0.2], [0.34, 0.22]];
  for (let b = 0; b < NB; b++) {
    const g = new THREE.Group(), rr = BERRY_R[b]; root.add(g);
    if (rr > 0.15) { add(g, blackberry(rr), bbMat); const lf = add(g, new THREE.ConeGeometry(rr * 0.42, rr * 0.16, 6), leafMat, 0, rr * 0.95, 0); lf.rotation.x = PI; }
    else { add(g, new THREE.SphereGeometry(rr, 22, 16), blMat); const cr = add(g, new THREE.TorusGeometry(rr * 0.3, rr * 0.09, 6, 14), std(0x27356e, 0.6), 0, rr * 0.93, 0); cr.rotation.x = PI / 2; }
    berries.push({ g, bx: BPOS[b][0], bz: BPOS[b][1], ax: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize() });
  }

  // ---------- pose ----------
  const v = new THREE.Vector3(), e = new THREE.Euler();
  function pose(s, steerAng, spin) {
    root.position.set(s.x, 0, s.z); root.rotation.y = s.yaw;
    chassis.position.y = s.y; chassis.rotation.set(s.roll, 0, s.pitch);
    const sp = Math.sin(s.pitch);
    for (const w of wheels) {
      const k = w.front ? 1 : -1, c = w.front ? s.cF : s.cR;
      w.steer.position.y = s.y + k * WB * sp + WR + c;
      w.steer.rotation.y = w.front ? steerAng : 0;
      w.w.rotation.z = -spin;
    }
    const sc = stackScale(s.q), squash = Math.min(1, sc), bulge = 1 + (1 - squash) * 0.6;
    for (let i = 0; i < NP; i++) {
      const p = pans[i], du = s.u[i] - (i ? s.u[i - 1] : 0), dw = s.w[i] - (i ? s.w[i - 1] : 0);
      p.g.position.set(s.u[i] + p.dx, (i + 0.5) * TH * sc, s.w[i] + p.dz);
      p.g.rotation.set(dw * 1.6, 0, -du * 1.6);
      p.g.scale.set(bulge, squash, bulge);
    }
    updateDrips();
    e.set(s.roll, 0, s.pitch);
    for (let b = 0; b < NB; b++) {
      const B = berries[b];
      v.set(STACK_X + s.u[NP - 1] + B.bx, STACK_Y + NP * TH * sc, s.w[NP - 1] + B.bz).applyEuler(e);
      B.g.position.set(v.x, s.by[b] + B.bx * sp, v.z);
      B.g.quaternion.setFromAxisAngle(B.ax, s.bs[b]);
      B.g.rotateZ(s.pitch * clamp(1 - (s.by[b] - (s.y + v.y)) * 3, 0, 1));
    }
    driver.position.y = 1.30 + clamp(-s.q, -1, 1) * 0.018; pass.position.y = 1.30 + clamp(-s.q, -1, 1) * 0.024;
    driver.rotation.z = -s.pitch * 0.4; pass.rotation.z = -s.pitch * 0.5;
  }
  return { root, chassis, pose };
}
