// Trânsito em time-lapse. Carrinhos de metal fundido com silhueta de sedã (perfil extrudado),
// táxi, ônibus, faróis que viram bokeh e uma agenda medida na referência. Tudo função do tempo.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { U, STREET } from './city.js';
import { clamp, remap, rng, smooth, easeOutCubic, canvas } from './util.js';
import * as TX from './textures.js';
import { TL } from './timeline.js';

const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0e12, roughness: 0.05, metalness: 0.2, clearcoat: 1, envMapIntensity: 1.8 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.85 });
const hubMat = new THREE.MeshStandardMaterial({ color: 0xbfc4c8, roughness: 0.25, metalness: 0.9 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.3 });
const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.95, 0.84).multiplyScalar(34), fog: false });
const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.06, 0.03).multiplyScalar(12), fog: false });
const paints = {};
function paint(hex) {
  if (!paints[hex]) paints[hex] = new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.3, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.4 });
  return paints[hex];
}
function radialTex(inner, outer) {
  const [c, g] = canvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const poolMat = new THREE.MeshBasicMaterial({ map: radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), color: new THREE.Color(1.0, 0.84, 0.62).multiplyScalar(0.3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const aoMat = new THREE.MeshBasicMaterial({ map: radialTex('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false });

// perfil lateral (z = comprimento, y = altura) extrudado na largura, com quinas arredondadas
function profile(build, width, bevel) {
  const sh = new THREE.Shape(); build(sh);
  const g = new THREE.ExtrudeGeometry(sh, { depth: width - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: 4, curveSegments: 10 });
  g.translate(0, 0, -(width - 2 * bevel) / 2); g.rotateY(-Math.PI / 2); g.computeVertexNormals();
  return g;
}
function wheel(x, z, r = 0.34) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.26, 20), tireMat); t.rotation.z = Math.PI / 2; g.add(t);
  const h = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.56, r * 0.56, 0.28, 14), hubMat); h.rotation.z = Math.PI / 2; g.add(h);
  g.position.set(x, r, z); return g;
}

export function makeCar(color, { taxi = false, kind = 'sedan' } = {}) {
  const g = new THREE.Group(); const m = paint(color);
  const hatch = kind === 'hatch'; const L = hatch ? 4.2 : 4.7; const k = L / 4.7; const W = 1.84;
  // corpo de baixo: para-choque, capô que desce, linha de cintura, porta-malas
  const body = new THREE.Mesh(profile(s => {
    s.moveTo(2.28 * k, 0.34); s.lineTo(2.36 * k, 0.6); s.quadraticCurveTo(2.36 * k, 0.8, 2.08 * k, 0.86);
    s.lineTo(1.02 * k, 0.99); s.lineTo(hatch ? -1.9 * k : -1.5 * k, 1.01);
    s.quadraticCurveTo(-2.26 * k, 1.0, -2.34 * k, 0.8); s.lineTo(-2.36 * k, 0.5); s.lineTo(-2.26 * k, 0.34); s.closePath();
  }, W, 0.17), m); g.add(body);
  // estufa de vidro: para-brisa inclinado, teto, vidro traseiro
  const gh = new THREE.Mesh(profile(s => {
    s.moveTo(1.0 * k, 0.97); s.lineTo(0.34 * k, 1.47); s.quadraticCurveTo(0.22 * k, 1.53, -0.05 * k, 1.53);
    s.lineTo(hatch ? -1.45 * k : -0.95 * k, 1.5); s.quadraticCurveTo(hatch ? -1.75 * k : -1.2 * k, 1.47, hatch ? -2.05 * k : -1.72 * k, 0.99); s.closePath();
  }, W - 0.3, 0.2), glassMat); g.add(gh);
  // teto e colunas na cor do carro
  const roof = new THREE.Mesh(profile(s => {
    s.moveTo(0.3 * k, 1.49); s.quadraticCurveTo(0.2 * k, 1.56, -0.05 * k, 1.56); s.lineTo(hatch ? -1.42 * k : -0.95 * k, 1.53); s.lineTo(hatch ? -1.5 * k : -1.05 * k, 1.47); s.closePath();
  }, W - 0.5, 0.1), m); g.add(roof);
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 0.2);
    const col = (z0, y0, z1, y1, th) => { const d = new THREE.Vector3(0, y1 - y0, z1 - z0); const len = d.length(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, len, th), m); b.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2); b.rotation.x = Math.atan2(z1 - z0, y1 - y0); g.add(b); };
    col(1.0 * k, 0.98, 0.34 * k, 1.47, 0.1); col(-0.3 * k, 0.98, -0.3 * k, 1.5, 0.12);
    col(hatch ? -2.03 * k : -1.7 * k, 0.99, hatch ? -1.5 * k : -1.0 * k, 1.49, 0.14);
    // caixa de roda escura
    for (const wz of [1.45 * k, -1.45 * k]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20), trimMat); a.rotation.z = Math.PI / 2; a.position.set(sx * (W / 2 - 0.02), 0.36, wz); g.add(a); }
  }
  for (const [x, z] of [[-0.84, 1.45], [0.84, 1.45], [-0.84, -1.45], [0.84, -1.45]]) g.add(wheel(x, z * k));
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.15, 0.08, 2, 0.03), headMat); h.position.set(s * 0.6, 0.74, 2.33 * k); g.add(h);
    const tl = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.13, 0.08, 2, 0.03), tailMat); tl.position.set(s * 0.62, 0.84, -2.34 * k); g.add(tl);
  }
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.03), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 })); plate.position.set(0, 0.5, 2.37 * k); g.add(plate);
  if (taxi) {
    const sign = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.24, 0.34, 2, 0.06), new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: new THREE.Color(1, 0.92, 0.7), emissiveIntensity: 1.8 }));
    sign.position.set(0, 1.7, -0.35 * k); g.add(sign);
  }
  finish(g, L, W);
  return g;
}
export function makeBus(tone = 0xf0a019) {
  const g = new THREE.Group(); const L = 11.5, W = 2.55;
  const white = paint(0xeeeae2), stripe = paint(tone), dark = paint(0x2a2d33);
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, 2.75, L, 4, 0.3), white); body.position.y = 1.75; g.add(body);
  const win = new THREE.Mesh(new RoundedBoxGeometry(W + 0.03, 1.0, L - 1.6, 2, 0.1), glassMat); win.position.set(0, 2.35, -0.55); g.add(win);
  const ws = new THREE.Mesh(new RoundedBoxGeometry(W - 0.25, 1.35, 0.1, 2, 0.05), glassMat); ws.position.set(0, 2.2, L / 2 + 0.01); g.add(ws);
  const st = new THREE.Mesh(new RoundedBoxGeometry(W + 0.04, 0.5, L - 0.4, 2, 0.1), stripe); st.position.set(0, 1.15, 0); g.add(st);
  const sk = new THREE.Mesh(new RoundedBoxGeometry(W + 0.02, 0.35, L - 0.2, 2, 0.1), dark); sk.position.set(0, 0.55, 0); g.add(sk);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.32), new THREE.MeshBasicMaterial({ map: TX.ledSign('CENTRO', '#5dff7a'), color: new THREE.Color(3, 3, 3), fog: false })); led.position.set(0, 3.0, L / 2 + 0.07); g.add(led);
  const lit = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.8, L - 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.9, 0.7).multiplyScalar(1.2) })); lit.position.set(0, 2.35, -0.55); g.add(lit);
  for (const z of [3.6, -3.4]) for (const x of [-1.1, 1.1]) g.add(wheel(x, z, 0.48));
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.18, 0.06, 2, 0.03), headMat); h.position.set(s * 0.85, 0.85, L / 2 + 0.02); g.add(h);
    const tl = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.4, 0.06, 2, 0.03), tailMat); tl.position.set(s * 1.0, 1.0, -L / 2 - 0.02); g.add(tl);
  }
  finish(g, L, W);
  return g;
}
function finish(g, L, W) {
  g.traverse(o => { if (o.isMesh && o.material !== headMat && o.material !== tailMat) { o.castShadow = true; o.receiveShadow = true; } });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 9).rotateX(-Math.PI / 2), poolMat); pool.position.set(0, 0.03, L / 2 + 4.2); pool.layers.set(1); g.add(pool);
  const ao = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.35, L * 1.15).rotateX(-Math.PI / 2), aoMat); ao.position.y = 0.025; ao.layers.set(1); g.add(ao);
  g.scale.setScalar(U);
}

// ---- faixas ----
const aMid = (STREET.A[0] + STREET.A[1]) / 2, bMid = (STREET.B[0] + STREET.B[1]) / 2, dMid = (STREET.D[0] + STREET.D[1]) / 2, cMid = (STREET.C[0] + STREET.C[1]) / 2;
export const LANE = { AE: aMid + 4.0, AW: aMid - 4.0, BS: bMid - 2.1, BSp: bMid - 5.6, BN: bMid + 3.4, DS: dMid - 4.0, DN: dMid + 4.0, CE: cMid + 4.0, CW: cMid - 4.0 };

// caminho com curva: lista de pontos; devolve posição e rumo a uma distância s
function pathOf(pts) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal', 0.5);
  const len = curve.getLength();
  return { len, at(s) { const u = clamp(s / len); const p = curve.getPointAt(u), tg = curve.getTangentAt(u); return { x: p.x, z: p.z, h: Math.atan2(tg.x, tg.z) }; } };
}

export function buildTraffic(ctx) {
  const { scene } = ctx; const r = rng(404);
  const list = [];
  const add = (obj, motion) => { scene.add(obj); list.push({ obj, motion }); return obj; };
  const colors = [0xe8e6e1, 0x9aa0a6, 0x1d2c4a, 0x151515, 0xb3261e, 0xe8e6e1, 0x2a6f73, 0x6b1e1e];
  const TAXI = 0xf2b705;

  // 1) táxi parado na rua B; vai embora em q94 (a seta pintada aparece embaixo dele)
  add(makeCar(TAXI, { taxi: true }), t => { const z = -8.6 + (t > TL.taxiLeave ? 900 * Math.pow(t - TL.taxiLeave, 2) : 0); return { x: LANE.BSp + 0.2, z, h: 0, on: z < 70 }; });

  // 2) táxi da esquerda: parado em q0–q3, desce a rua D e dobra para a rua A (q3–q9)
  { const p = pathOf([[-22.6, 4.4], [-22.8, 12], [-20, 20.5], [-10, LANE.AE], [20, LANE.AE], [90, LANE.AE], [170, LANE.AE]]);
    add(makeCar(TAXI, { taxi: true }), t => { const s = t < 0.11 ? 0 : 1700 * Math.pow(t - 0.11, 2); const q = p.at(s); return { ...q, on: s < p.len - 5 }; }); }

  // 3) ônibus na rua D: chega (q11–q17), fica no ponto, sai (q35–q39)
  add(makeBus(), t => {
    const zStop = -2.5; let z;
    if (t < 0.42) z = -200;
    else if (t < 0.70) z = zStop - 110 * Math.pow(1 - remap(t, 0.42, 0.70), 2.2);
    else if (t < 1.44) z = zStop;
    else z = zStop + 1300 * Math.pow(t - 1.44, 2);
    return { x: LANE.DS - 1.2, z, h: 0, on: z > -190 && z < 110 };
  });

  // 4) carro branco que chega em q98 e fica parado na rua D
  add(makeCar(0xeceae4), t => { const zStop = 5.2; const z = t < TL.whiteCarIn ? -220 : zStop - 130 * Math.pow(1 - remap(t, TL.whiteCarIn, TL.whiteCarIn + 0.22), 2.4); return { x: LANE.DS + 1.2, z, h: 0, on: z > -200 }; });

  // 5) passagens em primeiro plano na rua A: [instante no meio do quadro, sentido, cor, tipo, velocidade]
  const passA = [
    [0.14, 'W', 0xb3261e, 'sedan', 230], [0.56, 'E', TAXI, 'taxi', 210], [1.31, 'E', TAXI, 'taxi', 200], [1.44, 'W', 0xb3261e, 'sedan', 230],
    [2.36, 'E', 'bus', 'bus', 150], [2.52, 'W', 0xe8e6e1, 'hatch', 220],
    [4.40, 'E', TAXI, 'taxi', 190], [4.78, 'W', 0xe8e6e1, 'sedan', 220], [5.12, 'W', 0x9aa0a6, 'sedan', 210], [5.72, 'E', 0xb3261e, 'hatch', 210], [6.68, 'E', 0x1d2c4a, 'sedan', 200], [7.56, 'E', 0xe8e6e1, 'sedan', 215],
  ];
  for (const [tc, dir, col, kind, sp] of passA) {
    const v = kind === 'bus' ? makeBus() : makeCar(col, { taxi: kind === 'taxi', kind });
    const z = dir === 'E' ? LANE.AE : LANE.AW, sgn = dir === 'E' ? 1 : -1;
    add(v, t => { const x = 4 + sgn * (t - tc) * sp; return { x, z, h: sgn * Math.PI / 2, on: Math.abs(x) < 150 }; });
  }

  // 6) fila de faróis ao fundo, na rua E (que sobe por trás do terreno, de frente para a câmera).
  //    A fila anda aos saltos; cada carro liberado dobra na rua C, passa por trás do restaurante,
  //    desce a rua B e cruza o canto inferior direito ~0,6 s depois. R = instante da liberação.
  const R = [-0.74, 1.86, 3.36, 3.96, 5.26, 6.36, 9, 9, 9, 9, 9, 9, 9, 9, 9];
  const kinds = ['sedan', 'hatch', 'taxi', 'bus', 'sedan', 'sedan', 'sedan', 'taxi', 'sedan', 'bus', 'sedan', 'taxi', 'sedan', 'sedan', 'hatch'];
  const cols = [0xb3261e, 0xe8e6e1, TAXI, 0x3a5aa8, 0x151515, 0xb3261e, 0xe8e6e1, TAXI, 0x9aa0a6, 0x3a5aa8, 0x1d2c4a, TAXI, 0xe8e6e1, 0x9aa0a6, 0xe8e6e1];
  const HEAD = -42, GAP = 12.5, QX = -8.6;
  const esc = pathOf([[QX, HEAD], [QX, -34], [-3, -25.5], [7, LANE.CE], [13.5, -23.5], [LANE.BS, -15], [LANE.BS, -5], [LANE.BS, 30], [LANE.BS, 100]]);
  const sStop = 61;   // distância no caminho até a faixa de pedestres da rua B
  R.forEach((Ri, i) => {
    const v = kinds[i] === 'bus' ? makeBus(cols[i]) : makeCar(cols[i], { taxi: kinds[i] === 'taxi', kind: kinds[i] });
    const stopper = i === 4;   // o carro escuro que para na faixa (q142–q152)
    const lane = i % 3 === 2 ? 3.4 : 0;   // parte da fila na faixa do lado
    add(v, t => {
      if (t < Ri) {
        let k = 0; for (let j = 0; j < i; j++) k += 1 - smooth(clamp((t - R[j] - 0.06 * (i - j)) / 0.16));
        return { x: QX - lane, z: HEAD - GAP * k * (lane ? 0.92 : 1), h: 0, on: true };
      }
      const dt = t - Ri; let s = dt < 0.25 ? 260 * dt * dt : 16.25 + 130 * (dt - 0.25);
      if (stopper) { const t1 = Ri + 0.62; s = t < t1 ? sStop * easeOutCubic(remap(t, Ri, t1)) : t < 6.32 ? sStop : sStop + 1000 * Math.pow(t - 6.32, 2); }
      const q = esc.at(s);
      return { x: q.x - (s < 8 ? lane * (1 - s / 8) : 0), z: q.z, h: q.h, on: s < esc.len - 6 };
    });
  });
  // quem sobe a rua E (lanternas vermelhas indo embora)
  for (const t0 of [-0.4, 0.2, 0.7, 1.5, 2.2, 3.7, 4.1, 4.7, 5.4, 6.0, 6.9, 7.4]) {
    const v = makeCar(r.pick(colors), { kind: r() < 0.3 ? 'hatch' : 'sedan' }); const sp = r.range(70, 95);
    add(v, t => { const z = -34 - (t - t0) * sp; return { x: -1.4, z, h: Math.PI, on: t > t0 && z > -240 }; });
  }
  // 7) trânsito cruzado esparso (rua C por trás do terreno, rua D à esquerda)
  for (const [t0, st, dir] of [[0.0, 'C', -1], [1.45, 'C', -1], [2.1, 'C', 1], [3.8, 'C', -1], [4.9, 'C', -1], [5.6, 'C', 1], [6.9, 'C', 1], [0.12, 'D', -1], [0.36, 'D', -1], [0.6, 'D', -1], [3.9, 'D', -1], [4.6, 'D', -1], [5.6, 'D', -1], [6.5, 'D', -1], [7.3, 'D', -1]]) {
    const v = makeCar(r.pick(colors)); const sp = r.range(120, 150);
    if (st === 'C') add(v, t => { const x = dir * (-170 + (t - t0 + 1.0) * sp); return { x, z: dir > 0 ? LANE.CE : LANE.CW, h: dir * Math.PI / 2, on: Math.abs(x) < 170 }; });
    else add(v, t => { const z = 120 - (t - t0 + 0.8) * sp; return { x: LANE.DN, z, h: Math.PI, on: z > -220 && z < 120 }; });
  }
  // 8) quem sobe a rua B pelo canto inferior direito do quadro e sai pela borda direita: é o borrão
  //    vermelho e branco da referência (cada carro fica ~7 quadros visível)
  { const tints = [0xb3261e, 0xe8e6e1, 0x6b1e1e, 0x9aa0a6, 0xb3261e, 0xe8e6e1, TAXI, 0x151515, 0xe8e6e1, 0xb3261e, 0x9aa0a6, 'bus', 0xe8e6e1, 0x1d2c4a, TAXI, 0xb3261e, 0xe8e6e1, 0x9aa0a6, 0x6b1e1e, 0xe8e6e1, TAXI, 0xb3261e];
    [-0.1, 0.02, 0.14, 0.27, 0.40, 0.55, 0.68, 1.25, 1.38, 1.52, 2.45, 4.56, 3.98, 4.78, 4.95, 5.4, 6.0, 6.35, 6.6, 6.82, 7.4, 7.6].forEach((tc, i) => {
      const bus = tints[i] === 'bus';
      const v2 = bus ? makeBus(0x3a5aa8) : makeCar(tints[i], { taxi: tints[i] === TAXI, kind: i % 3 ? 'sedan' : 'hatch' });
      const x = LANE.BN + (i % 2 ? 2.9 : 0), sp = bus ? 95 : 105 + (i % 4) * 8;
      add(v2, t => { const z = 14 - (t - tc) * sp; return { x, z, h: Math.PI, on: z < 60 && z > -70 }; });
    }); }
  ctx.traffic = list;
  ctx.updaters.push(t => {
    for (const v of list) {
      const st = v.motion(t);
      v.obj.visible = !!st.on;
      if (!st.on) continue;
      v.obj.position.set(st.x, 0, st.z); v.obj.rotation.y = st.h;
    }
  });
  return list;
}
