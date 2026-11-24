// papel.js — a folha, o traço e o lápis, agora como objetos de verdade.
// O traço é o mesmo do motor 2D (mesmos pontos, mesma ordem, mesmo tempo), só que em geometria:
// cada linha é uma fita que cresce conforme o relógio, e fica nítida em qualquer aproximação.
import { THREE, A, PI, mix, sat, clean } from './base.js';

export const paper = new THREE.Scene();
const P = { t: { value: 0 } };

const PAPER_FN = /* glsl */`
float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 paperColor(vec2 w){
  vec2 g = vec2(w.x + 800., 800. - w.y), i = floor(g), f = fract(g);
  float n = mix(mix(hsh(i), hsh(i + vec2(1., 0.)), f.x), mix(hsh(i + vec2(0., 1.)), hsh(i + vec2(1., 1.)), f.x), f.y);
  return vec3(.98039, .97647, .96078) * mix(1., (120. + n * 135.) / 255., .045);   // o grão do papel, como no original
}`;

function sheet() {
  const m = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: PAPER_FN + 'varying vec2 vP; void main(){ gl_FragColor = vec4(paperColor(vP), 1.); }',
  });
  paper.add(new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), m));
}

// ---------------------------------------------------------------- o traço
function ink() {
  const pos = [], mit = [], tim = [], flg = [], idx = []; let n = 0;
  const vtx = (x, y, mx, my, s, side, ta, t1, L, Wd, ph, tp, caps, kind) => { pos.push(x - 800, 800 - y, 0); mit.push(mx, -my, s, side); tim.push(ta, t1, L, Wd); flg.push(ph, tp, caps, kind); return n++; };
  for (const E of ZS) for (const op of E.ops) {
    if (op.k === 'f') {
      // o "papel" que cobre o que está atrás: entra junto com a linha de referência
      if (!op.occ || op.only === 'paint' || !op.ref) continue;
      const pts = clean(op.pts), tris = THREE.ShapeUtils.triangulateShape(pts.map(([x, y]) => new THREE.Vector2(x, y)), []), b = n;
      for (const [x, y] of pts) vtx(x, y, 0, 0, 0, 0, op.ref.ta, op.ref.t1, 0, 0, 0, 0, 0, 0);
      for (const t of tris) idx.push(b + t[0], b + t[1], b + t[2]);
    } else if (op.k === 'l') {
      if (op.only === 'paint') continue;
      for (const o of op.kids || [op]) {
        const Q = o.P, C = o.C, m = Q.length, Wd = o.w * o.pr, caps = (o.capA !== false ? 1 : 0) + (o.capB !== false ? 2 : 0), b = n;
        for (let i = 0; i < m; i++) {
          const a = Q[Math.max(0, i - 1)], p = Q[i], c = Q[Math.min(m - 1, i + 1)];
          let d0x = p[0] - a[0], d0y = p[1] - a[1], d1x = c[0] - p[0], d1y = c[1] - p[1], l0 = Math.hypot(d0x, d0y), l1 = Math.hypot(d1x, d1y);
          if (l0 < 1e-6) { d0x = d1x; d0y = d1y; l0 = l1; } if (l1 < 1e-6) { d1x = d0x; d1y = d0y; l1 = l0; }
          if (l0 < 1e-6) { d0x = d1x = 1; d0y = d1y = 0; l0 = l1 = 1; }
          const n0x = -d0y / l0, n0y = d0x / l0, n1x = -d1y / l1, n1y = d1x / l1;
          let mx = n0x + n1x, my = n0y + n1y; const ml = Math.hypot(mx, my);
          if (ml < 1e-3) { mx = n1x; my = n1y; } else { mx /= ml; my /= ml; }
          const k = 1 / Math.max(.35, mx * n1x + my * n1y);
          for (const sd of [1, -1]) vtx(p[0], p[1], mx * k, my * k, C[i], sd, o.ta, o.t1, o.L, Wd, o.ph, o.tp ? 1 : 0, caps, 1);
        }
        for (let i = 0; i < m - 1; i++) { const q = b + 2 * i; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aMit', new THREE.Float32BufferAttribute(mit, 4));
  g.setAttribute('aTim', new THREE.Float32BufferAttribute(tim, 4)); g.setAttribute('aFlg', new THREE.Float32BufferAttribute(flg, 4)); g.setIndex(idx);
  const m = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT: P.t },
    vertexShader: `uniform float uT; attribute vec4 aMit, aTim, aFlg;
      varying float vS, vLen, vKind, vA; varying vec2 vP;
      void main(){
        float ta = aTim.x, t1 = aTim.y; vec3 p = position; vKind = aFlg.w; vP = position.xy;
        if (aFlg.w < .5) { vA = clamp((uT - ta) / max(.001, (t1 - ta) * .7), 0., 1.) * step(ta, uT); vS = 0.; vLen = 1.; }
        else {
          float pr = clamp((uT - ta) / (t1 - ta), 0., 1.); pr = .5 - .5 * cos(3.14159265 * pr);
          float len = pr * aTim.z, s = aMit.z, ca = mod(aFlg.z, 2.), cb = max(step(1.5, aFlg.z), step(len, aTim.z - .01));
          float v = aTim.w * (1. + .1 * sin(s * .03 + aFlg.x));
          if (aFlg.y > .5) v *= min(1., min(mix(1., .32 + .68 * s / 8., ca), mix(1., .32 + .68 * (len - s) / 8., cb)));
          p.xy += aMit.xy * max(v, 0.) * .5 * aMit.w;
          vS = s; vLen = len; vA = step(ta, uT);
        }
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
      }`,
    fragmentShader: PAPER_FN + `varying float vS, vLen, vKind, vA; varying vec2 vP;
      void main(){
        if (vKind > .5) { if (vS > vLen || vA < .5) discard; gl_FragColor = vec4(.0941, .0902, .0863, 1.); }
        else { if (vA <= 0.) discard; gl_FragColor = vec4(paperColor(vP), vA); }
      }`,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 1; paper.add(mesh);
}

// ---------------------------------------------------------------- o lápis e a sombra dele na folha
const PEN_ANG = .95, PEN_EL = 17 * PI / 180, PEN_LEN = 440;
const PEN_DIR = new THREE.Vector3(Math.cos(PEN_ANG) * Math.cos(PEN_EL), -Math.sin(PEN_ANG) * Math.cos(PEN_EL), Math.sin(PEN_EL));
const SH_K = new THREE.Vector2(.36, -.46);     // para onde a sombra anda a cada unidade de altura
let pen, shadow;
function pencil() {
  const R = 8, prof = [[0, 0], [2.3, 7], [R * .78, 26], [R, 40], [R, PEN_LEN - 6], [R * .86, PEN_LEN - 2], [R * .5, PEN_LEN + .5], [0, PEN_LEN + 1]];
  const g = new THREE.LatheGeometry(prof.map(([r, x]) => new THREE.Vector2(r, x)), 40); g.rotateZ(-PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), c = x < 7.5 ? [.16, .16, .165] : x < 26.5 ? [.56, .56, .575] : [.085, .085, .095]; col.set(c, i * 3); }
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  pen = new THREE.Mesh(g, new THREE.ShaderMaterial({
    transparent: true,   // entra na fila ordenada: o lápis é desenhado depois do traço e da sombra, nunca por baixo deles
    vertexShader: `attribute vec3 aCol; varying vec3 vN, vV, vC;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; vC = aCol; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vN, vV, vC;
      void main(){
        vec3 n = normalize(vN), v = normalize(vV), l = normalize(vec3(-.5, .55, .68)), h = normalize(l + v);
        float dif = max(dot(n, l), 0.), sp = pow(max(dot(n, h), 0.), 46.), rim = pow(1. - max(dot(n, v), 0.), 3.);
        gl_FragColor = vec4(vC * (.5 + 1.25 * dif) + sp * .5 + rim * .05, 1.);
      }`,
  }));
  pen.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), PEN_DIR); pen.renderOrder = 3; paper.add(pen);
  shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 24, 1), new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uS0: { value: new THREE.Vector2() }, uS1: { value: new THREE.Vector2() }, uW: { value: new THREE.Vector2(3, 12) }, uA: { value: .26 } },
    vertexShader: `uniform vec2 uS0, uS1, uW; varying vec2 vQ;
      void main(){ vec2 d = uS1 - uS0, nr = normalize(vec2(-d.y, d.x)); vQ = uv;
        vec2 p = uS0 + d * (uv.x * 1.08 - .04) + nr * (uv.y * 2. - 1.) * mix(uW.x, uW.y, uv.x) * 2.6;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, .06, 1.); }`,
    fragmentShader: `uniform float uA; varying vec2 vQ;
      void main(){ float a = (vQ.y * 2. - 1.) * 2.6, soft = mix(.38, 1., vQ.x);
        float f = smoothstep(1. + soft, 1. - soft, abs(a)) * smoothstep(0., .035, vQ.x) * smoothstep(1., .93, vQ.x);
        gl_FragColor = vec4(.157, .11, .063, uA * f * mix(1., .6, vQ.x)); }`,
  }));
  shadow.frustumCulled = false; shadow.renderOrder = 2; paper.add(shadow);
}

export function buildPaper() { sheet(); ink(); pencil(); }
// posição do lápis no instante t (com a saída no fim) — também serve para o foco da câmera
export function penAt(t, cam2d) {
  const [z, cx, cy] = cam2d, out = seg(t, T_END, T_END + .45, p2in);
  let [x, y, lift] = penRaw(t);
  if (out > 0) { x = mix(x, cx + 1100 / z, out); y = mix(y, cy + 1150 / z, out); lift = Math.max(lift, out * 2.2); }
  return { x, y, lift, gone: out >= 1 };
}
export function updatePaper(t, cam2d) {
  P.t.value = t;
  const q = penAt(t, cam2d), z = cam2d[0], ps = 1 / Math.sqrt(2.2 * z);    // o lápis cresce um pouco quando a câmera abre, para não sumir
  pen.visible = shadow.visible = !q.gone;
  const h = q.lift * 20 * ps, tip = A(q.x, q.y, h);
  pen.position.copy(tip); pen.scale.setScalar(ps);
  const end = tip.clone().addScaledVector(PEN_DIR, PEN_LEN * ps), u = shadow.material.uniforms;
  u.uS0.value.set(tip.x + SH_K.x * tip.z, tip.y + SH_K.y * tip.z); u.uS1.value.set(end.x + SH_K.x * end.z, end.y + SH_K.y * end.z);
  u.uW.value.set((2.2 + 2.5 * q.lift) * ps, (15 + 6 * q.lift) * ps); u.uA.value = .27 - .07 * sat(q.lift);
  return tip;
}
