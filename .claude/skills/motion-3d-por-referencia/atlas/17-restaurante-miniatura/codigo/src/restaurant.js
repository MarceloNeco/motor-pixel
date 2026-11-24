// O herói: o restaurante redondo com o hambúrguer gigante em cima, a obra em time-lapse,
// a bandeira de palito, o letreiro 3D, os neons e o pátio com guarda-sóis.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import opentype from 'opentype';
import { rng, fbm3, noise3, clamp, remap, lerp, easeOutCubic, easeInCubic, easeOutBack, smooth, springOut, colorJitter } from './util.js';
import * as TX from './textures.js';
import { addFoam } from './foam.js';
import { makeWet } from './post.js';
import { CURB, LOT, U, clump, tint } from './city.js';
import { TL, flagState, FLAG_TOP, POLE_LONG } from './timeline.js';

export const BRAND = { line1: 'MEGA', line2: 'BURGER' };
// centro do restaurante e alturas (medidas na referência, ver pericia/)
export const RC = new THREE.Vector3(0.3, CURB, -0.5);
export const H = {
  plinth: 1.8, glassTop: 5.8, roofTop: 6.5, rRoof: 11.1, rGlass: 9.9,
  bunBot0: 6.5, bunBot1: 8.6, rBunBot: 10.0,
  patty1: 10.25, rPatty: 10.35,
  topBun0: 10.75, topBunH: 4.6, rTopBun: 9.65,
  flagTop: 21.4,
};
export const CAM_AZ = THREE.MathUtils.degToRad(44); // direção da câmera (frente do restaurante)

// --------- fontes reais (Arial Rounded Bold do macOS) -> formas do three ---------
async function loadFont(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  return opentype.parse(buf);
}
function textShapes(font, text, size) {
  const path = font.getPath(text, 0, 0, size);
  const sp = new THREE.ShapePath();
  for (const c of path.commands) {
    if (c.type === 'M') sp.moveTo(c.x, -c.y);
    else if (c.type === 'L') sp.lineTo(c.x, -c.y);
    else if (c.type === 'Q') sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y);
    else if (c.type === 'C') sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
  }
  return sp.toShapes(false);
}

// --------- perfis de torno ---------
function lathe(points, segs = 160) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}
function domeProfile(R, h, n = 40) {
  // pão de cima: base levemente embutida, quina arredondada e domo
  const p = [[0, -0.25], [R * 0.86, -0.25], [R * 0.95, -0.08], [R * 0.995, 0.25], [R, 0.55]];
  for (let i = 1; i <= n; i++) {
    const a = (i / n) * Math.PI / 2;
    const r = R * Math.pow(Math.cos(a), 0.8);
    const y = 0.55 + (h - 0.55) * Math.pow(Math.sin(a), 1.15);
    p.push([Math.max(r, 0.0001), y]);
  }
  p.push([0, h]);
  return p;
}
function bunColors(g, palette, axisH, seed) {
  // pigmento do pão por altura + manchas (tostado)
  const p = g.attributes.position; const col = new Float32Array(p.count * 3); const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = clamp(y / axisH);
    const n = fbm3(x * 0.25 + seed, y * 0.25, z * 0.25, 4) * 0.5 + 0.5;
    const n2 = fbm3(x * 1.1, y * 1.1 + seed, z * 1.1, 3) * 0.5 + 0.5;
    palette(t, n, n2, c, x, y, z);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
function displaceRadial(g, amp, freq, seed, yMin = -1e9, yMax = 1e9) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < yMin || y > yMax) continue;
    const r = Math.hypot(x, z); if (r < 1e-3) continue;
    const d = fbm3(x * freq + seed, y * freq, z * freq, 3) * amp;
    p.setXYZ(i, x + (x / r) * d, y + d * 0.3, z + (z / r) * d);
  }
  g.computeVertexNormals();
}

export async function buildRestaurant(ctx) {
  const { scene, mirror } = ctx;
  const root = new THREE.Group(); root.position.copy(RC); scene.add(root);
  const font = await loadFont('/sysfonts/Arial%20Rounded%20Bold.ttf');
  const R = rng(202);
  const S = {}; // peças animáveis

  // ================= PRÉDIO =================
  const bldg = new THREE.Group(); root.add(bldg); S.bldg = bldg;
  // base de tijolo escuro (aparece em gomos)
  const bt = TX.brick(91, [92, 52, 36]); bt.repeat.set(10, 1.2);
  const plinthMat = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.85, color: 0xc9b2a2 });
  S.plinth = [];
  const NSEG = 12;
  for (let i = 0; i < NSEG; i++) {
    const a0 = (i / NSEG) * Math.PI * 2, a1 = ((i + 1) / NSEG) * Math.PI * 2;
    const g = new THREE.CylinderGeometry(H.rGlass + 0.25, H.rGlass + 0.3, H.plinth, 12, 1, true, a0, a1 - a0);
    g.translate(0, H.plinth / 2, 0);
    const m = new THREE.Mesh(g, plinthMat); m.castShadow = m.receiveShadow = true; bldg.add(m); S.plinth.push(m);
  }
  // capa da base (peitoril)
  const sillMat = new THREE.MeshStandardMaterial({ color: 0x3b2418, roughness: 0.6 });
  S.sill = new THREE.Mesh(new THREE.TorusGeometry(H.rGlass + 0.25, 0.18, 8, 120), sillMat); S.sill.rotation.x = Math.PI / 2; S.sill.position.y = H.plinth; bldg.add(S.sill);
  // interior quente
  const intTex = TX.interiorWall(); intTex.wrapS = THREE.RepeatWrapping; intTex.repeat.set(2, 1);
  S.intWallMat = new THREE.MeshStandardMaterial({ map: intTex, emissiveMap: intTex, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.8, side: THREE.BackSide });
  const intWall = new THREE.Mesh(new THREE.CylinderGeometry(H.rGlass - 3.2, H.rGlass - 3.2, H.glassTop - H.plinth + 1.2, 64, 1, true), S.intWallMat);
  intWall.position.y = (H.glassTop + H.plinth) / 2 - 0.3; intWall.rotation.y = CAM_AZ + Math.PI; bldg.add(intWall);
  const flTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#c07a38'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? 'rgba(90,50,20,0.25)' : 'rgba(255,220,170,0.12)'; g.fillRect(0, i * 16, 256, 15); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const floorMat = new THREE.MeshStandardMaterial({ map: flTex, color: 0xffffff, roughness: 0.25, emissive: 0xffd0a0, emissiveMap: flTex, emissiveIntensity: 0 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(H.rGlass - 0.1, 64), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.y = H.plinth + 0.03; S.floorMat = floorMat;
  const rough = new THREE.Mesh(new THREE.CircleGeometry(H.rGlass + 0.2, 64), new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 0.95 })); rough.rotation.x = -Math.PI / 2; rough.position.y = H.plinth + 0.01; bldg.add(rough);
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x2a1810, emissive: 0xffb36a, emissiveIntensity: 0, roughness: 0.8, side: THREE.BackSide });
  const ceil = new THREE.Mesh(new THREE.CircleGeometry(H.rGlass, 64), ceilMat); ceil.rotation.x = Math.PI / 2; ceil.position.y = H.glassTop; bldg.add(ceil); S.ceilMat = ceilMat;
  // mesas, bancos, balcão e clientes (dentro)
  S.interior = new THREE.Group(); bldg.add(S.interior); S.interior.add(floor);
  {
    const tableMat = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.5, emissive: 0xffe2b0, emissiveIntensity: 0.35 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0x5a2416, roughness: 0.5 });
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.75, 0.4).multiplyScalar(8) });
    S.ceilLamps = lampMat;
    const rr = rng(5);
    for (let i = 0; i < 9; i++) {
      const a = CAM_AZ + (i - 4) * 0.36 + rr.range(-0.05, 0.05), rad = H.rGlass - 2.2 - (i % 2) * 2.4;
      const t = new THREE.Group(); t.position.set(Math.sin(a) * rad, H.plinth, Math.cos(a) * rad); t.rotation.y = a;
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 1.4), tableMat); top.position.y = 1.4; t.add(top);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4), redMat); leg.position.y = 0.7; t.add(leg);
      for (const s of [-1, 1]) { const b = new THREE.Mesh(new RoundedBoxGeometry(2.2, 1.6, 0.5, 2, 0.15), redMat); b.position.set(0, 0.8, s * 1.15); t.add(b); }
      S.interior.add(t);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), lampMat); lamp.position.set(t.position.x, H.glassTop - 0.9, t.position.z); S.interior.add(lamp);
    }
    // balcão ao fundo
    const counter = new THREE.Mesh(new THREE.CylinderGeometry(H.rGlass - 3.4, H.rGlass - 3.4, 1.6, 48, 1, true, CAM_AZ + Math.PI - 1.0, 2.0), new THREE.MeshStandardMaterial({ color: 0x8a2a18, roughness: 0.5, side: THREE.DoubleSide }));
    counter.position.y = H.plinth + 0.8; S.interior.add(counter);
  }
  // luz interior (vaza pelo vidro e lava a calçada)
  S.intLights = [];
  for (const a of [CAM_AZ - 0.9, CAM_AZ, CAM_AZ + 0.9]) {
    const L = new THREE.PointLight(0xffa860, 0, 22, 2); L.position.set(Math.sin(a) * (H.rGlass + 1.2), 2.6, Math.cos(a) * (H.rGlass + 1.2)); bldg.add(L); S.intLights.push(L);
  }
  S.intGlow = new THREE.PointLight(0xffb070, 0, 16, 2); S.intGlow.position.set(0, 3.5, 0); bldg.add(S.intGlow);
  // vidro
  S.glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0e0c0a, roughness: 0.03, metalness: 0.0, transparent: true, opacity: 0.0, envMapIntensity: 0.5, specularIntensity: 1, side: THREE.FrontSide, depthWrite: false });
  // casca interna: escura na obra, quente quando o salão acende (é o que se vê pelo vidro e pelo topo aberto)
  S.shellMat = new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.9, side: THREE.BackSide, emissive: new THREE.Color(1.0, 0.5, 0.16), emissiveIntensity: 0 });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(H.rGlass - 0.12, H.rGlass - 0.12, H.glassTop - 0.1, 96, 1, true), S.shellMat); shell.position.y = (H.glassTop - 0.1) / 2 + 0.05; bldg.add(shell);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(H.rGlass, H.rGlass, H.glassTop - H.plinth, 120, 1, true), S.glassMat);
  glass.position.y = (H.glassTop + H.plinth) / 2; glass.renderOrder = 2; bldg.add(glass); S.glass = glass;
  // aro de bronze que fecha o anel de vidro (visível durante a obra, sem laje)
  S.rail = new THREE.Mesh(new THREE.TorusGeometry(H.rGlass + 0.12, 0.36, 8, 140), new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.4, metalness: 0.55 }));
  S.rail.rotation.x = Math.PI / 2; S.rail.position.y = H.glassTop + 0.05; S.rail.castShadow = true; bldg.add(S.rail);
  // montantes de bronze
  const mullMat = new THREE.MeshStandardMaterial({ color: 0x2e2018, roughness: 0.35, metalness: 0.6 });
  S.mullions = [];
  const NM = 20;
  for (let i = 0; i < NM; i++) {
    const a = CAM_AZ + (i / NM) * Math.PI * 2 + Math.PI / NM;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, H.glassTop - H.plinth, 0.34), mullMat);
    m.geometry.translate(0, (H.glassTop - H.plinth) / 2, 0);
    m.position.set(Math.sin(a) * (H.rGlass + 0.06), H.plinth, Math.cos(a) * (H.rGlass + 0.06)); m.rotation.y = a; m.castShadow = true;
    bldg.add(m); S.mullions.push(m);
  }
  // porta de frente para a câmera (moldura dourada)
  S.door = new THREE.Group(); S.door.rotation.y = CAM_AZ; bldg.add(S.door);
  {
    const brass = new THREE.MeshStandardMaterial({ color: 0xc89a4a, roughness: 0.3, metalness: 0.85 });
    const dw = 2.6, dh = H.glassTop - 0.4;
    const fr = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), brass); m.position.set(x, y, H.rGlass + 0.2); S.door.add(m); };
    fr(0.22, dh, -dw / 2, dh / 2); fr(0.22, dh, dw / 2, dh / 2); fr(dw + 0.22, 0.25, 0, dh); fr(0.12, dh, 0, dh / 2);
    S.doorGlow = new THREE.MeshStandardMaterial({ color: 0x3a2a14, emissive: new THREE.Color(1, 0.72, 0.35), emissiveIntensity: 0, roughness: 0.2 });
    const dg = new THREE.Mesh(new THREE.PlaneGeometry(dw, dh), S.doorGlow); dg.position.set(0, dh / 2, H.rGlass + 0.1); S.door.add(dg);
    const step = new THREE.Mesh(new RoundedBoxGeometry(dw + 1.2, 0.3, 1.4, 2, 0.1), new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.7 })); step.position.set(0, 0.15, H.rGlass + 0.6); step.receiveShadow = true; S.door.add(step);
  }
  // laje (disco do telhado) + friso + neons
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.38, metalness: 0.25 });
  S.roof = new THREE.Mesh(new THREE.CylinderGeometry(H.rRoof, H.rRoof - 0.15, H.roofTop - H.glassTop, 128), roofMat);
  S.roof.geometry.translate(0, (H.roofTop - H.glassTop) / 2, 0); S.roof.position.y = H.glassTop; S.roof.castShadow = S.roof.receiveShadow = true; bldg.add(S.roof);
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.3, metalness: 0.8 });
  S.trim = new THREE.Mesh(new THREE.TorusGeometry(H.rRoof, 0.08, 6, 160), trimMat); S.trim.rotation.x = Math.PI / 2; S.trim.position.y = H.roofTop; bldg.add(S.trim);
  // neon: vermelho à esquerda da porta, azul à direita (como na referência)
  S.neons = [];
  const neon = (col, a0, len) => {
    const g = new THREE.TorusGeometry(H.rRoof + 0.06, 0.1, 8, 90, len); g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(0.02) }));
    m.rotation.y = a0; m.position.y = H.glassTop + 0.12; m.userData.on = col; bldg.add(m); S.neons.push(m); return m;
  };
  // ângulo no plano: a = rotação em torno de y; com rotateX(+90°) o arco começa em +x e gira para -z
  const camA = Math.atan2(Math.sin(CAM_AZ), Math.cos(CAM_AZ));
  neon(new THREE.Color(1.0, 0.1, 0.07).multiplyScalar(7), -Math.PI / 2 + camA + 0.05, 1.25);
  neon(new THREE.Color(0.28, 0.38, 1.0).multiplyScalar(7), -Math.PI / 2 + camA + 1.3, 1.22);
  neon(new THREE.Color(1.0, 0.45, 0.08).multiplyScalar(12), -Math.PI / 2 + camA - 2.6, 1.0);

  // ================= LETREIRO 3D =================
  {
    const size = 2.2;
    const shapes = textShapes(font, BRAND.line1 + ' ' + BRAND.line2, size);
    const g = new THREE.ExtrudeGeometry(shapes, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.07, bevelSegments: 3, curveSegments: 8 });
    g.computeBoundingBox(); const bb = g.boundingBox;
    g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, 0);
    // curva o texto em volta do cilindro, de frente para a câmera
    const Rt = H.rRoof - 0.9;
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const th = CAM_AZ + x / Rt, r = Rt + z;
      p.setXYZ(i, Math.sin(th) * r, y, Math.cos(th) * r);
    }
    g.computeVertexNormals();
    S.letterFace = new THREE.MeshStandardMaterial({ color: 0xffd23c, roughness: 0.3, metalness: 0.2, emissive: new THREE.Color(1.0, 0.74, 0.16), emissiveIntensity: 0 });
    S.letterSide = new THREE.MeshStandardMaterial({ color: 0x5a2208, roughness: 0.5, metalness: 0.1, emissive: new THREE.Color(0.6, 0.14, 0.02), emissiveIntensity: 0 });
    S.letters = new THREE.Mesh(g, [S.letterFace, S.letterSide]); S.letters.position.y = H.roofTop + 0.05; S.letters.castShadow = true;
    bldg.add(S.letters);
    // luz do letreiro lavando a frente do pão de baixo
    S.signLight = new THREE.PointLight(0xffb03a, 0, 9, 2);
    S.signLight.position.set(Math.sin(CAM_AZ) * (H.rRoof + 1.5), H.roofTop + 1.2, Math.cos(CAM_AZ) * (H.rRoof + 1.5)); bldg.add(S.signLight);
  }
  // "ABERTO" em neon na vitrine, à esquerda da porta
  {
    const [c, gg] = (() => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 220; return [cv, cv.getContext('2d')]; })();
    gg.fillStyle = 'rgba(0,0,0,0)'; gg.fillRect(0, 0, 512, 220);
    gg.lineJoin = 'round'; gg.strokeStyle = '#3b6bff'; gg.lineWidth = 12; gg.beginPath(); gg.roundRect(18, 18, 476, 184, 40); gg.stroke();
    gg.font = 'bold 118px "Arial Rounded MT Bold", Arial'; gg.textAlign = 'center'; gg.textBaseline = 'middle';
    gg.strokeStyle = '#ff2a2a'; gg.lineWidth = 10; gg.strokeText('ABERTO', 256, 116);
    gg.fillStyle = '#ffd0c8'; gg.fillText('ABERTO', 256, 116);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    S.openMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0, 0, 0) });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.46), S.openMat);
    const a = CAM_AZ - 0.42; m.position.set(Math.sin(a) * (H.rGlass - 0.25), 4.3, Math.cos(a) * (H.rGlass - 0.25)); m.rotation.y = a; m.renderOrder = 3;
    bldg.add(m);
  }

  // ================= ESTRUTURA DE MADEIRA (time-lapse, em saltos) =================
  // Fica em cima do aro de vidro, no mesmo diâmetro, como na referência. Cada peça tem um "estágio" de 0 a 4.
  S.frame = new THREE.Group(); S.frame.position.y = H.glassTop + 0.35; bldg.add(S.frame);
  {
    const wood = addFoam(new THREE.MeshStandardMaterial({ color: 0xe6c088, roughness: 0.7 }), { freq: 6, bump: 0.02, color: 0.18, key: 'wood' });
    const NS = 26, rF = H.rGlass + 0.05, hF = 4.5; const fr = rng(31);
    S.frameParts = [];
    const stick = (p0, p1, th, stage) => {
      const d = p1.clone().sub(p0); const L = d.length();
      const m = new THREE.Mesh(new THREE.BoxGeometry(th, L, th), wood); m.geometry.translate(0, L / 2, 0);
      m.position.copy(p0); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true;
      S.frame.add(m); S.frameParts.push({ m, stage }); return m;
    };
    const P = (a, y, r = rF) => new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
    const ang = i => CAM_AZ + (i / NS) * Math.PI * 2;
    for (let i = 0; i < NS; i++) {
      const a = ang(i), b = ang(i + 1);
      // montante: os da frente e da esquerda primeiro (como na referência), depois o resto
      const front = Math.cos(a - CAM_AZ + 0.6);
      const st = front > 0.5 ? 0 : front > -0.1 ? 1 : front > -0.6 ? 2 : 3;
      stick(P(a, 0), P(a, hF), 0.34, st);
      // travessas e diagonais irregulares
      const hm = hF * fr.range(0.38, 0.62);
      if (fr() < 0.8) stick(P(a, hm), P(b, hm + fr.range(-0.3, 0.3)), 0.26, Math.min(4, st + 1));
      if (fr() < 0.7) { const up = fr() < 0.5; stick(P(a, up ? 0.2 : hF - 0.2), P(b, up ? hF - 0.2 : 0.2), 0.24, Math.min(4, st + 2)); }
      // frechal duplo no topo
      stick(P(a, hF), P(b, hF), 0.36, Math.min(4, st + 1));
      stick(P(a, hF - 0.55), P(b, hF - 0.55), 0.26, 4);
    }
    // vigas do telhado cruzando por dentro
    for (let k = 0; k < 4; k++) { const a = CAM_AZ + 0.4 + k * Math.PI / 4; stick(P(a, hF), P(a + Math.PI, hF), 0.3, 4); }
  }

  // ================= O HAMBÚRGUER =================
  S.burger = new THREE.Group(); root.add(S.burger);
  const pores = { freq: 5.5, bump: 0.018, color: 0.12, freq2: 17, mix2: 0.5 };
  // pão de baixo
  {
    const g = lathe([[0, 0], [H.rBunBot - 0.6, 0], [H.rBunBot - 0.1, 0.25], [H.rBunBot + 0.05, 0.9], [H.rBunBot, 1.6], [H.rBunBot - 0.35, 2.05], [H.rBunBot - 0.9, 2.12], [0, 2.12]], 140);
    displaceRadial(g, 0.12, 0.18, 3);
    bunColors(g, (t, n, n2, c) => {
      const a = new THREE.Color(0xf0c58a), b = new THREE.Color(0xc67a32);
      c.copy(a).lerp(b, clamp(0.25 + (1 - Math.abs(t - 0.45) * 2) * 0.55 + (n - 0.5) * 0.4));
      c.multiplyScalar(0.92 + n2 * 0.16);
    }, 2.12, 5);
    const mat = addFoam(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color(0xffd9a0), sheenRoughness: 0.6 }), { ...pores, key: 'bunB' });
    S.bunBottom = new THREE.Mesh(g, mat); S.bunBottom.castShadow = S.bunBottom.receiveShadow = true;
    S.burger.add(S.bunBottom);
  }
  // carne
  {
    const g = lathe([[0, 0], [H.rPatty - 0.4, 0], [H.rPatty - 0.05, 0.25], [H.rPatty + 0.2, 0.8], [H.rPatty + 0.1, 1.35], [H.rPatty - 0.35, 1.65], [0, 1.65]], 180);
    displaceRadial(g, 0.34, 0.55, 11);
    bunColors(g, (t, n, n2, c) => {
      c.set(0x3e2214).lerp(new THREE.Color(0x6e3e22), n2 * 0.9).lerp(new THREE.Color(0x150a06), clamp((n - 0.55) * 2.4));
    }, 1.5, 9);
    const mat = addFoam(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, clearcoat: 0.35, clearcoatRoughness: 0.45 }), { freq: 2.8, bump: 0.11, color: 0.35, freq2: 8, mix2: 0.7, key: 'patty' });
    S.patty = new THREE.Mesh(g, mat); S.patty.castShadow = S.patty.receiveShadow = true; S.burger.add(S.patty);
  }
  // queijo: duas fatias quadradas que derretem pelas bordas
  {
    const cheeseMat = new THREE.MeshPhysicalMaterial({ color: 0xf7b51a, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.3, emissive: 0x6a2a00, emissiveIntensity: 0.25, side: THREE.DoubleSide, sheen: 0.4, sheenColor: new THREE.Color(0xffe080) });
    S.cheese = [];
    for (const rot of [CAM_AZ + Math.PI / 4 + 0.5, CAM_AZ + Math.PI / 4 - 0.38]) {
      const side = 16.0; const g = new THREE.PlaneGeometry(side, side, 80, 80); g.rotateX(-Math.PI / 2);
      const p = g.attributes.position; const o = R() * 10;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i); const r = Math.hypot(x, z);
        let y = 0;
        const over = r - (H.rPatty - 0.3);
        if (over > 0) y -= Math.min(1.05, Math.pow(over, 1.5) * 0.8 + over * 0.3);
        y += noise3(x * 0.4 + o, 0, z * 0.4) * 0.08;
        p.setY(i, y);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, cheeseMat); m.rotation.y = rot; m.castShadow = true; m.receiveShadow = true; S.burger.add(m); S.cheese.push(m);
    }
  }
  // alface ondulada
  {
    const segA = 360, segR = 10, r0 = 7.4, r1 = H.rPatty + 0.28;
    const g = new THREE.RingGeometry(r0, r1, segA, segR); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position; const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i); const r = Math.hypot(x, z), th = Math.atan2(z, x);
      const k = clamp((r - r0) / (r1 - r0));
      const ruff = (Math.sin(th * 23 + noise3(x * 0.3, 1, z * 0.3) * 3) * 0.22 + noise3(x * 0.9, 4, z * 0.9) * 0.14) * k;
      let y = ruff - Math.pow(Math.max(0, r - (H.rPatty - 0.5)), 1.5) * 0.7;
      // falhas: a alface não aparece por igual
      const gap = noise3(Math.cos(th) * 2.2, Math.sin(th) * 2.2, 9) ;
      const rr2 = r0 + (r - r0) * (0.62 + 0.38 * smooth(clamp((0.15 - gap) * 4)));
      p.setXYZ(i, Math.cos(th) * rr2, y, Math.sin(th) * rr2);
      const c = new THREE.Color(0x286a18).lerp(new THREE.Color(0x66a82e), k * 0.7 + noise3(x, 2, z) * 0.15);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const mat = addFoam(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide, emissive: 0x0c2a04, emissiveIntensity: 0.4 }), { freq: 3, bump: 0.05, color: 0.2, key: 'lettuce' });
    S.lettuce = new THREE.Mesh(g, mat); S.lettuce.castShadow = true; S.lettuce.receiveShadow = true; S.burger.add(S.lettuce);
  }
  // tomate: fatias aparecendo na frente
  {
    const tm = new THREE.MeshPhysicalMaterial({ color: 0xd8301f, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2, emissive: 0x400800, emissiveIntensity: 0.3 });
    S.tomato = new THREE.Group(); S.burger.add(S.tomato);
    for (const [da, rad] of [[0.32, 8.45], [1.15, 8.2]]) {
      const g = new THREE.CylinderGeometry(2.25, 2.25, 0.42, 32); const m = new THREE.Mesh(g, tm);
      const a = CAM_AZ + da; m.position.set(Math.sin(a) * rad, 0, Math.cos(a) * rad); m.rotation.x = 0.06; m.castShadow = true; S.tomato.add(m);
    }
  }
  // pão de cima com gergelim
  {
    const g = lathe(domeProfile(H.rTopBun, H.topBunH), 160);
    displaceRadial(g, 0.18, 0.12, 21, 0.2);
    bunColors(g, (t, n, n2, c, x, y, z) => {
      const pale = new THREE.Color(0xf0b868), gold = new THREE.Color(0xe08a26), brown = new THREE.Color(0xc06416), dark = new THREE.Color(0x8e400e);
      if (t < 0.12) c.copy(pale).lerp(gold, t / 0.12);
      else if (t < 0.45) c.copy(gold).lerp(brown, (t - 0.12) / 0.33);
      else c.copy(brown).lerp(dark, clamp((t - 0.45) / 0.55) * 0.7);
      c.lerp(dark, clamp((n - 0.55) * 1.5) * 0.5);
      c.lerp(pale, clamp((0.4 - n) * 1.2) * 0.25 * (t > 0.1 ? 1 : 0));
      c.multiplyScalar(0.94 + n2 * 0.12);
    }, H.topBunH, 13);
    const mat = addFoam(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.36, clearcoat: 0.9, clearcoatRoughness: 0.22, sheen: 0.25, sheenColor: new THREE.Color(0xffc880), sheenRoughness: 0.5 }), { ...pores, key: 'bunT' });
    S.bunTop = new THREE.Mesh(g, mat); S.bunTop.castShadow = S.bunTop.receiveShadow = true;
    // gergelim
    const seedGeo = new THREE.SphereGeometry(1, 10, 6); seedGeo.scale(0.42, 0.12, 0.19);
    const seedMat = new THREE.MeshPhysicalMaterial({ color: 0xe3c48c, roughness: 0.45, clearcoat: 0.5, sheen: 0.3 });
    const NSE = 88; const seeds = new THREE.InstancedMesh(seedGeo, seedMat, NSE);
    const prof = domeProfile(H.rTopBun, H.topBunH, 200).slice(5);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
    const placed = [];
    let n = 0, tries = 0;
    while (n < NSE && tries < 6000) {
      tries++;
      const k = Math.floor(Math.pow(R(), 0.8) * (prof.length - 2));
      const [r, y] = prof[k]; const [r2, y2] = prof[k + 1];
      if (y < 1.4) continue;
      const th = R() * Math.PI * 2;
      const pos = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
      if (placed.some(pp => pp.distanceTo(pos) < 1.45)) continue;
      // normal do perfil
      const tr = new THREE.Vector2(r2 - r, y2 - y).normalize();
      const nrm = new THREE.Vector3(Math.cos(th) * -tr.y, tr.x, Math.sin(th) * -tr.y).normalize().multiplyScalar(-1);
      if (nrm.y < 0) nrm.negate();
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
      q2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * Math.PI * 2);
      q.multiply(q2);
      const sc = 0.85 + R() * 0.35;
      m4.compose(pos.clone().addScaledVector(nrm, 0.06), q, new THREE.Vector3(sc, sc, sc));
      seeds.setMatrixAt(n++, m4); placed.push(pos);
    }
    seeds.count = n; seeds.castShadow = true;
    S.topBunGroup = new THREE.Group(); S.topBunGroup.add(S.bunTop, seeds); S.burger.add(S.topBunGroup);
  }

  // ================= BANDEIRA DE PALITO =================
  S.flag = new THREE.Group(); scene.add(S.flag);
  {
    const poleLen = POLE_LONG;
    S.poleLen = poleLen;
    const woodPole = addFoam(new THREE.MeshStandardMaterial({ color: 0xe2bd82, roughness: 0.6 }), { freq: 4, bump: 0.02, color: 0.15, key: 'pole' });
    const pg = new THREE.CylinderGeometry(0.2, 0.22, 1, 12); pg.translate(0, -0.5, 0);
    const pole = new THREE.Mesh(pg, woodPole); pole.scale.y = poleLen; pole.castShadow = true;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 12), woodPole); tip.rotation.x = Math.PI; tip.position.y = -poleLen - 0.35;
    S.flag.add(pole, tip); S.pole = pole; S.poleTip = tip;
    // flâmula com o nome
    const [cv, g2] = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 580; return [c, c.getContext('2d')]; })();
    g2.fillStyle = '#d8231c'; g2.beginPath(); g2.moveTo(0, 0); g2.lineTo(1024, 40); g2.lineTo(900, 290); g2.lineTo(1024, 540); g2.lineTo(0, 580); g2.closePath(); g2.fill();
    g2.fillStyle = 'rgba(0,0,0,0.12)'; g2.fillRect(0, 0, 40, 580);
    g2.font = 'bold 230px "Arial Rounded MT Bold", Arial'; g2.textBaseline = 'middle'; g2.textAlign = 'left';
    g2.lineJoin = 'round'; g2.strokeStyle = '#8a1208'; g2.lineWidth = 14;
    g2.strokeText(BRAND.line1, 70, 160); g2.strokeText(BRAND.line2, 70, 410);
    g2.fillStyle = '#ffd23a'; g2.fillText(BRAND.line1, 70, 160); g2.fillText(BRAND.line2, 70, 410);
    const ft = new THREE.CanvasTexture(cv); ft.colorSpace = THREE.SRGBColorSpace; ft.anisotropy = 8;
    const fw = 5.8, fh = 3.3;
    const fg = new THREE.PlaneGeometry(fw, fh, 40, 12); fg.translate(fw / 2 + 0.15, -fh / 2 - 0.45, 0);
    S.flagGeo = fg; S.flagBase = fg.attributes.position.array.slice();
    S.flagMat = new THREE.MeshStandardMaterial({ map: ft, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, roughness: 0.65 });
    // canvas tem fundo transparente fora da flâmula
    const cloth = new THREE.Mesh(fg, S.flagMat); cloth.castShadow = true; cloth.rotation.y = CAM_AZ + 0.32; S.flag.add(cloth); S.cloth = cloth;
  }

  // ================= CALÇAMENTO DO TERRENO (aparece em time-lapse) =================
  {
    const pv = ctx.city.swMat.clone();
    pv.userData.wet = ctx.city.swMat.userData.wet; pv.onBeforeCompile = ctx.city.swMat.onBeforeCompile;
    S.paveR = { value: 0 };
    const prev = pv.onBeforeCompile;
    pv.onBeforeCompile = (sh, r) => {
      prev(sh, r); sh.uniforms.uPaveR = S.paveR; sh.uniforms.uPaveC = { value: new THREE.Vector2(RC.x, RC.z) };
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uPaveR; uniform vec2 uPaveC;\nvoid main() {')
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          { vec2 dd = vWetWorld.xz - uPaveC; float edge = uPaveR + (fract(sin(dot(floor(vWetWorld.xz * 0.55), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 3.0;
            if (length(dd) > edge) discard; }`);
    };
    pv.customProgramCacheKey = () => 'pave';
    const e = 0.45;
    const g = new THREE.PlaneGeometry(LOT.x1 - LOT.x0 + 2 * e, LOT.z1 - LOT.z0 + 2 * e, 1, 1); g.rotateX(-Math.PI / 2);
    { const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) + (LOT.x0 + LOT.x1) / 2, -(p.getZ(i) + (LOT.z0 + LOT.z1) / 2)); }
    const m = new THREE.Mesh(g, pv); m.position.set((LOT.x0 + LOT.x1) / 2, CURB + 0.015, (LOT.z0 + LOT.z1) / 2); m.layers.set(1); m.receiveShadow = true;
    scene.add(m); S.pave = m;
  }

  // ================= PÁTIO: guarda-sóis, mesas, vasos =================
  S.patio = [];
  {
    const canvasMat = new THREE.MeshStandardMaterial({ color: 0x9c1c14, roughness: 0.75, side: THREE.DoubleSide });
    const poleM = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.4 });
    const tblM = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.5, metalness: 0.4 });
    for (const [x, z] of [[8.6, -11.2], [4.4, -15.4], [10.4, -16.8]]) {
      const u = new THREE.Group(); u.position.set(x, CURB, z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6.4, 8), poleM); pole.position.y = 3.2; u.add(pole);
      const cg = new THREE.ConeGeometry(2.7, 1.2, 12, 1, true); cg.translate(0, 6.4, 0);
      const can = new THREE.Mesh(cg, canvasMat); can.castShadow = true; u.add(can);
      const tb = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.12, 20), tblM); tb.position.y = 1.9; u.add(tb);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 1.9, 8), tblM); leg.position.y = 0.95; u.add(leg);
      for (let k = 0; k < 3; k++) {
        const a = k / 3 * Math.PI * 2 + 0.4; const ch = new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.0, 0.9, 2, 0.12), tblM);
        ch.position.set(Math.cos(a) * 2.0, 0.5, Math.sin(a) * 2.0); u.add(ch);
      }
      u.traverse(o => { if (o.isMesh) o.castShadow = true; });
      u.userData.canopy = can; scene.add(u); S.patio.push(u);
    }
    // vasos, lixeira e hidrante na frente
    const potM = new THREE.MeshStandardMaterial({ color: 0x6a3a22, roughness: 0.8 });
    const leafM = addFoam(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), { freq: 4, bump: 0.15, color: 0.5, key: 'pot' });
    S.pots = [];
    for (const [x, z, s] of [[8.4, 6.4, 1], [9.9, 4.6, 0.85], [-6.2, 8.8, 0.9], [11.2, -4.0, 0.9]]) {
      const p = new THREE.Group(); p.position.set(x, CURB, z); p.scale.setScalar(s);
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.75, 1.5, 16), potM); pot.position.y = 0.75; pot.castShadow = true; p.add(pot);
      const rr = rng(Math.round(x * 13 + z));
      const geos = []; for (let i = 0; i < 7; i++) { const gg = clump(rr.range(0.45, 0.7), rr, 2, 0.3); gg.translate(rr.range(-0.5, 0.5), 1.7 + rr.range(0, 0.6), rr.range(-0.5, 0.5)); tint(gg, colorJitter(0x3d6a22, rr, 0.2), rr); geos.push(gg); }
      const lf = new THREE.Mesh(mergeGeometries(geos), leafM); lf.castShadow = true; p.add(lf);
      scene.add(p); S.pots.push(p);
    }
    const bin = new THREE.Mesh(new RoundedBoxGeometry(1.4, 2.1, 1.4, 2, 0.15), new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.6 }));
    bin.position.set(11.3, CURB + 1.05, 2.4); bin.castShadow = true; scene.add(bin); S.bin = bin;
    // placa PARE na esquina (troca leve: na referência era STOP)
    const pare = new THREE.Group(); pare.position.set(29.6, CURB, 8.4);
    const pp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2, 8), new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.7, roughness: 0.4 })); pp.position.y = 2.6; pare.add(pp);
    const pt = TX.textTex(['PARE'], { w: 256, h: 256, color: '#ffffff', size: 86, font: 'Helvetica, Arial', bg: null });
    const oct = new THREE.Mesh(new THREE.CircleGeometry(1.0, 8), new THREE.MeshStandardMaterial({ color: 0xc0201a, roughness: 0.4, emissive: 0x300000 }));
    oct.rotation.z = Math.PI / 8; oct.position.set(0, 5.0, 0.06); pare.add(oct);
    const txt = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshStandardMaterial({ map: pt, transparent: true, roughness: 0.4 })); txt.position.set(0, 5.0, 0.08); pare.add(txt);
    const back = new THREE.Mesh(new THREE.CircleGeometry(1.0, 8), new THREE.MeshStandardMaterial({ color: 0x777777 })); back.rotation.set(0, Math.PI, Math.PI / 8); back.position.set(0, 5.0, 0.04); pare.add(back);
    pare.rotation.y = CAM_AZ - 0.25; pare.scale.setScalar(1.1); pare.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(pare); S.pare = pare;
  }

  ctx.restaurant = S;
  ctx.updaters.push(t => animateRestaurant(S, t, ctx));
  return S;
}

// ======================================================================
//                         ANIMAÇÃO (função pura do tempo)
// ======================================================================
// "salto" de time-lapse: aparece em ~1 quadro com um pequeno excesso
const pop = (t, t0, dur = 0.05) => { const k = remap(t, t0, t0 + dur); return k <= 0 ? 0 : k >= 1 ? 1 : easeOutBack(k, 1.8); };
const show = (o, k) => { o.visible = k > 0.001; if (o.visible) o.scale.setScalar(k); };

export function animateRestaurant(S, t, ctx) {
  const T = TL;
  // ---- terreno: a terra é remexida, o calçamento aparece junto com a base ----
  const dig = smooth(remap(t, T.dig0, T.base0));
  if (ctx.city.dirt) { ctx.city.dirt.scale.y = 1 - 0.55 * dig; ctx.city.dirt.visible = t < T.base0 + 0.03; }
  S.paveR.value = t < T.base0 ? -2 : lerp(6, 28, easeOutCubic(remap(t, T.base0, T.base0 + 0.05)));
  S.pave.visible = t >= T.base0;
  if (ctx.city.lotEdges) for (const e of ctx.city.lotEdges) e.visible = t < T.base0;

  // ---- anel de vidro: surge de uma vez (q28) ----
  const bk = pop(t, T.base0, 0.045);
  S.bldg.visible = bk > 0.001;
  S.bldg.scale.set(1, Math.max(1e-3, bk), 1);
  S.plinth.forEach(m => { m.visible = true; m.scale.y = 1; });
  S.mullions.forEach(m => { m.visible = true; m.scale.y = 1; });
  S.sill.visible = true; S.sill.scale.setScalar(1);
  S.glassMat.opacity = 0.34 - 0.14 * smooth(remap(t, T.lights0, T.lights0 + 0.06)); S.glass.visible = true; S.door.visible = true; S.rail.visible = true;
  // laje, friso e neons só chegam com o hambúrguer
  const rk = pop(t, T.burger0 - 0.01, 0.05);
  S.roof.visible = rk > 0.001; S.roof.scale.setScalar(Math.max(1e-3, rk));
  S.trim.visible = rk > 0.9; S.neons.forEach(n => n.visible = rk > 0.9);
  S.interior.visible = t > T.lights0 - 0.02;

  // ---- treliça de madeira: cresce em saltos e some quando o hambúrguer chega ----
  const frameOn = t >= T.base0 && t < T.burger0 + 0.04;
  S.frame.visible = frameOn;
  if (frameOn) {
    const step = (T.frameFull - T.base0) / 4;
    for (const p of S.frameParts) p.m.visible = t >= T.base0 + p.stage * step - 1e-4;
    // encolhe para dentro do pão no último instante
    const sk = 1 - 0.25 * remap(t, T.burger0, T.burger0 + 0.04);
    S.frame.scale.set(1, sk, 1);
  }

  // ---- hambúrguer: materializa em ~3 quadros (camadas caem de perto, em rajada) ----
  const drop = (obj, t0, baseY, h0 = 3.5, squash = 0.12, dur = 0.045) => {
    if (t < t0) { obj.visible = false; return; }
    obj.visible = true;
    const k = remap(t, t0, t0 + dur);
    obj.position.y = baseY + h0 * (1 - easeInCubic(k));
    const after = t - (t0 + dur);
    const sy = k < 1 ? 1 + 0.06 * k : 1 - squash * Math.exp(-after * 26) * Math.cos(after * 52);
    obj.scale.set(1 + (1 - sy) * 0.5, sy, 1 + (1 - sy) * 0.5);
  };
  const B = T.burger0;
  drop(S.bunBottom, B, H.bunBot0, 3.0, 0.1);
  drop(S.patty, B + 0.014, H.bunBot1, 3.2, 0.1);
  S.cheese.forEach((c, i) => drop(c, B + 0.028 + i * 0.006, H.patty1 + 0.06 + i * 0.03, 3.2, 0.0, 0.04));
  drop(S.lettuce, B + 0.036, H.patty1 + 0.1, 3.4, 0.08, 0.04);
  drop(S.tomato, B + 0.04, H.patty1 + 0.35, 3.4, 0.0, 0.04);
  drop(S.topBunGroup, B + 0.046, H.topBun0, 5.0, 0.13, 0.05);
  const melt = easeOutCubic(remap(t, T.burger1, T.burger1 + 1.2));
  S.cheese.forEach(c => { if (c.visible && t > T.burger1 + 0.05) c.scale.y = 1 + melt * 0.25; });

  // ---- bandeira ----
  animateFlag(S, t, ctx);

  // ---- luzes: o salão acende junto com o hambúrguer ----
  const lit = smooth(remap(t, T.lights0, T.lights0 + 0.06));
  S.intWallMat.emissiveIntensity = 1.5 * lit; S.ceilMat.emissiveIntensity = 1.2 * lit; S.floorMat.emissiveIntensity = 0.2 * lit;
  S.doorGlow.emissiveIntensity = 0.7 * lit; S.shellMat.emissiveIntensity = 0.75 * lit;
  if (ctx.hero) ctx.hero.intensity = 1.5 * smooth(remap(t, T.burger0 + 0.03, T.burger1));
  S.ceilLamps.color.setRGB(1, 0.75, 0.4).multiplyScalar(0.05 + 5 * lit);
  S.intLights.forEach(L => L.intensity = 42 * lit);
  const work = t > T.base0 && t < T.lights0 ? 0.35 : 0; // luz de obra lá dentro
  S.intGlow.intensity = 95 * lit + 40 * work;
  // neons: piscam e firmam (q59–q60)
  S.neons.forEach((n, i) => {
    const t0 = T.neon0 + i * 0.02;
    let on = t > t0 ? 1 : 0;
    if (t > t0 && t < t0 + 0.1) on *= (Math.sin((t - t0) * 170 + i) > -0.3 ? 1 : 0.1);
    n.material.color.copy(n.userData.on).multiplyScalar(0.02 + 0.98 * on);
  });
  // letreiro: surge e acende quase junto (q57–q58)
  S.letters.visible = t > T.letters0;
  if (S.letters.visible) { const k = pop(t, T.letters0, 0.05); S.letters.scale.set(1, Math.max(1e-3, k), 1); }
  const lk = smooth(remap(t, T.sign0, T.sign0 + 0.05));
  let flick = 1; if (t > T.sign0 && t < T.sign0 + 0.09) flick = Math.sin(t * 190) > 0 ? 1 : 0.4;
  S.letterFace.emissiveIntensity = 0.03 + 0.62 * lk * flick; S.letterSide.emissiveIntensity = 0.01 + 0.12 * lk * flick;
  S.signLight.intensity = 34 * lk * flick;
  S.openMat.color.setScalar(t > T.open0 ? (Math.sin(t * 90) > -0.6 || t > T.open0 + 0.12 ? 1.7 : 0.3) : 0);

  // ---- vasos, lixeira, placa; guarda-sóis bem depois (q92–q108) ----
  S.pots.forEach((p, i) => { const k = pop(t, T.pots0 + i * 0.06, 0.05); p.visible = k > 0.001; p.scale.setScalar(Math.max(1e-3, k) * (i === 1 ? 0.85 : i === 0 ? 1 : 0.9)); });
  S.bin.visible = t > T.pots0 + 0.1;
  const pt = [T.patio0, T.patio1, T.patio2];
  S.patio.forEach((u, i) => show(u, pop(t, pt[i], 0.06)));
  S.pare.visible = t > T.pare0;
}

function animateFlag(S, t, ctx) {
  const F = S.flag;
  const st = flagState(t);
  F.visible = st.on;
  if (!st.on) return;
  F.position.set(RC.x, st.y, RC.z);
  S.pole.scale.y = st.len; S.poleTip.position.y = -st.len - 0.35;
  // inclina para a direita da tela (eixo = direção da câmera)
  F.rotation.set(0, 0, 0);
  F.rotateOnWorldAxis(new THREE.Vector3(Math.sin(CAM_AZ), 0, Math.cos(CAM_AZ)), -st.tilt);
  // ondulação da flâmula
  const p = S.flagGeo.attributes.position, b = S.flagBase;
  for (let i = 0; i < p.count; i++) {
    const bx = b[i * 3], by = b[i * 3 + 1];
    const k = clamp(bx / 5.8);
    p.setZ(i, Math.sin(bx * 1.3 - t * 7.5) * 0.22 * k + Math.sin(bx * 2.7 + by * 1.1 - t * 11) * 0.06 * k);
  }
  p.needsUpdate = true; S.flagGeo.computeVertexNormals();
}
