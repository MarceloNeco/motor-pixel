// mundo.js — a pintura do final, agora como um mundo com profundidade.
// Cada elemento da ilustração original (cena.js) vira uma peça: a arte dele na frente e volume atrás.
// De frente o mundo é igual à pintura; fora do eixo aparecem as laterais, a floresta e o céu em camadas.
import { THREE, world, over, U, A, W, warpS, D, PI, mix, sat, smooth, add, mat, nextId, pivot, selOps, bbOf, artTex, drawTex, card, quad, prism, piece, tube, cyl, ell, proj, gridGeo, pyr, frustum, span } from './base.js';

// profundidade de cada conjunto (z cresce na direção da câmera)
const zI = -30;    // ilha grande (centro)
const zT = 45;     // frente da base da torre
const zC = 64;     // frente da casinha
const zW = 10;     // frente do moinho
const zS = 300;    // linha de centro do dirigível
const zL = 60;     // ilhota do acampamento (centro)
const anim = { clouds: [], birds: [], smoke: [] };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const MRT = 'layout(location = 0) out highp vec4 gColor;\nlayout(location = 1) out highp vec4 gAux;\n';

// ================================================================= céu, morros, nuvens, lua
function sky() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1;
  const c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 1024, 0);
  [[0, '#2340e0'], [.1, '#2a46f2'], [.2, '#4a4ff0'], [.3, '#7f62ea'], [.38, '#ad7de4'], [.46, '#d488d4'], [.54, '#f293c0'], [.62, '#ffa2a8'], [.72, '#ffab8c'], [.84, '#ffb270'], [1, '#ffbb66']].forEach(([o, col]) => g.addColorStop(o, col));
  c.fillStyle = g; c.fillRect(0, 0, 1024, 1);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = false; tex.minFilter = tex.magFilter = THREE.LinearFilter;
  // o degradê vale por direção do olhar: a câmera de frente enxerga o mesmo céu da pintura
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, side: THREE.BackSide, depthTest: false, depthWrite: false, uniforms: { tGrad: { value: tex } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: MRT + `uniform sampler2D tGrad; varying vec3 vD;
      void main(){
        vec3 d = normalize(vD); vec2 pp = d.xy / max(-d.z, .03) * ${D}.;
        float x2 = 800. + pp.x, y2 = 800. - pp.y, t = y2 / 1250.;
        vec3 col = texture(tGrad, vec2(clamp(t, .0006, .9994), .5)).rgb;
        col = mix(col, vec3(.07, .11, .55), clamp(-t * .16, 0., .6));
        float r = length(vec2(x2 - 1120., y2 - 1130.));
        col = mix(col, vec3(1., .839, .549), .55 * clamp(1. - (r - 20.) / 660., 0., 1.));
        gColor = vec4(col, 1.); gAux = vec4(.5, .5, 1., 0.);
      }`,
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(60000, 48, 32), m); s.renderOrder = -1000; s.frustumCulled = false; world.add(s); anim.sky = s;
}
function hills() {
  const hm = col => new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, side: THREE.DoubleSide, uniforms: { uColor: { value: new THREE.Color(col) } },
    vertexShader: 'varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: MRT + `uniform vec3 uColor; varying float vY;
      void main(){ float a = .35 * clamp(1. - (vY - 1060.) / 140., 0., 1.) * step(1060., vY); vec3 c = mix(uColor, vec3(1., .667, .784), a); c = mix(c, vec3(.075, .188, .369), smoothstep(1235., 1900., vY)); gColor = vec4(c, 1.); gAux = vec4(.5, .5, 1., 0.); }`,
  });
  for (const [y0, a, f, col, z] of [[1090, 18, .006, '#b97bd8', -13000], [1140, 22, .005, '#9563c8', -10500]]) {
    const pts = []; for (let x = -7000; x <= 8600; x += 40) pts.push(new THREE.Vector2(x - 800, 800 - (y0 + a * Math.sin(x * f + y0) + a * .5 * Math.sin(x * f * 2.7 + 1))));
    pts.push(new THREE.Vector2(7800, -1800), new THREE.Vector2(-7800, -1800));
    const g = new THREE.ShapeGeometry(new THREE.Shape(pts)); g.translate(0, 0, z);
    const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, 0, 800 - p.getY(i));
    add(new THREE.Mesh(g, hm(col)));
  }
}
function drawCloud(c, x, y, w, h) {
  const base = y < 500 ? '#ff9cc8' : '#ffb2b4', hi = y < 500 ? '#ffc6de' : '#ffd2c6';
  c.fillStyle = base; c.beginPath(); c.roundRect(x, y, w, h, h / 2); c.fill();
  for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(x + w * (.25 + k * .22), y + h * .2, w * .12, h * .7, 0, 0, TAU); c.fill(); }
  c.fillStyle = hi; c.beginPath(); c.roundRect(x + h * .4, y - h * .25, w * .55, h * .38, h * .2); c.fill();
}
function clouds() {
  const list = [[-40, 300, 560, 26], [130, 330, 280, 14], [960, 150, 380, 18], [690, 96, 240, 12], [1180, 560, 460, 28], [1330, 596, 250, 14], [-30, 640, 330, 22], [1250, 820, 400, 24], [40, 880, 260, 16], [620, 700, 210, 12]];
  const zs = [-4600, -5400, -3900, -6600, -3300, -5000, -6000, -2900, -7200, -4200], r = rng(909);
  // fora do quadro original: nuvens para os outros ângulos de câmera
  for (let i = 0; i < 26; i++) {
    const up = i >= 20, x = up ? -1800 + r() * 5200 : (i % 2 ? 1750 + r() * 2700 : -2900 + r() * 2500), y = up ? -1100 + r() * 1000 : 70 + r() * 800;
    list.push([x, y, 200 + r() * 380, 12 + r() * 16]); zs.push(-3000 - r() * 4500);
  }
  list.forEach(([x, y, w, h], i) => {
    const bb = [x - 4, y - h * .62 - 4, x + w + 4, y + h + 4];
    const m = card(drawTex(bb, 2.5, c => drawCloud(c, x, y, w, h)), bb, zs[i], { shade: 0 });
    anim.clouds.push({ m, v: 5 + (i * 37 % 11) });
  });
}
function moon() {
  const bb = [198, 140, 272, 216];
  const tex = drawTex(bb, 6, c => {
    c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(235, 178, 30, 0, TAU); c.fill();
    c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(248, 169, 27, 0, TAU); c.fill();
  });
  card(tex, bb, -20000, { shade: 0 });
}

// ================================================================= brilhos e estrelas (somados por cima)
const GL = [];
function glow(p, r, col, a, o = {}) { GL.push({ p, r, col: new THREE.Color(col), a, core: o.core || 0, drift: o.drift || 0, amp: o.amp || 0, sp: o.sp || 1, ph: o.ph ?? GL.length * 1.713 }); }
const LIN = 'float lin(float d){ return uNF.x * uNF.y / (uNF.y - d * (uNF.y - uNF.x)); }\n';
const PREMULT = { transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };
function buildGlows() {
  const g = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(2, 2);
  g.index = q.index; g.setAttribute('position', q.attributes.position); g.instanceCount = GL.length;
  const pos = [], par = [], col = [], an = [];
  for (const G of GL) { pos.push(G.p.x, G.p.y, G.p.z); par.push(G.r, G.a, G.core, G.drift); col.push(G.col.r, G.col.g, G.col.b); an.push(G.amp, G.sp, G.ph); }
  g.setAttribute('aPos', new THREE.InstancedBufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('aPar', new THREE.InstancedBufferAttribute(new Float32Array(par), 4));
  g.setAttribute('aCol', new THREE.InstancedBufferAttribute(new Float32Array(col), 3));
  g.setAttribute('aAnim', new THREE.InstancedBufferAttribute(new Float32Array(an), 3));
  const m = new THREE.ShaderMaterial({
    ...PREMULT, uniforms: { tDepth: U.depth, uNF: U.nf, uTime: U.time, uLife: U.life },
    vertexShader: `uniform sampler2D tDepth; uniform vec2 uNF; uniform float uTime, uLife;
      attribute vec3 aPos, aCol, aAnim; attribute vec4 aPar;
      varying vec2 vQ; varying vec4 vC; varying float vCore;
      ${LIN}
      void main(){
        float w = uTime * aAnim.y;
        vec3 wp = aPos + aPar.w * vec3(sin(w + aAnim.z), cos(w * .8 + aAnim.z * 1.7), sin(w * .6 + aAnim.z * .5)) * uLife;
        vec4 mv = viewMatrix * vec4(wp, 1.), cc = projectionMatrix * mv;
        vec2 uvc = cc.xy / cc.w * .5 + .5; float zc = -mv.z, vis = 0.;
        // some se o centro estiver escondido atrás de alguma coisa
        for (int i = 0; i < 4; i++) { vec2 o = vec2(float(i % 2) - .5, float(i / 2) - .5) * .0016; vis += step(zc - 3. - zc * .0008, lin(texture(tDepth, uvc + o).r)); }
        vis = cc.w > 0. ? vis * .25 : 0.;
        mv.xy += position.xy * aPar.x; gl_Position = projectionMatrix * mv;
        float pulse = 1. + aAnim.x * sin(w * 3. + aAnim.z * 2.) * uLife;
        vC = vec4(aCol, aPar.y * vis * pulse); vQ = position.xy; vCore = aPar.z;
      }`,
    fragmentShader: `varying vec2 vQ; varying vec4 vC; varying float vCore;
      void main(){
        float r = length(vQ); if (r > 1.) discard;
        float a = vC.a * (1. - r); if (vCore > 0.) a = max(a, min(1., vC.a * 1.4) * smoothstep(vCore * 1.25, vCore * .75, r));
        vec3 c = vC.rgb * a; gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)) * .88);
      }`,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; over.add(mesh);
}
function stars() {
  const pos = [], par = [];
  const put = (x, y, s, a, cross, ph) => { const p = W(x, y, -30000); pos.push(p.x, p.y, p.z); par.push(s, a, cross, ph); };
  let r = rng(42);   // as 170 da pintura, no mesmo lugar
  for (let i = 0; i < 170; i++) { const x = r() * 1600, y = Math.pow(r(), 1.5) * 720, a = (1 - y / 760) * (.45 + r() * .55), s = .7 + r() * 1.5; put(x, y, s, a, r() < .1 ? 1 : 0, (i * .618) % 1); }
  r = rng(4343);     // o resto do céu, para quando a câmera gira
  for (let i = 0; i < 5600; i++) {
    const x = -3400 + r() * 8400, y = -4400 + r() * 5100, k = r(), s = .7 + r() * 1.5, cr = r() < .1 ? 1 : 0;
    if (x > 0 && x < 1600 && y > 0) continue;
    put(x, y, s, sat(1 - y / 760) * (.45 + k * .55), cr, (i * .618) % 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aPar', new THREE.Float32BufferAttribute(par, 4));
  const m = new THREE.ShaderMaterial({
    ...PREMULT, uniforms: { tDepth: U.depth, uRes: U.res, uSS: U.ss, uTime: U.time, uLife: U.life },
    vertexShader: `attribute vec4 aPar; varying vec4 vPar; uniform float uSS;
      void main(){ vPar = aPar; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_PointSize = (aPar.z > .5 ? 14. : 2. * aPar.x + 2.) * uSS; }`,
    fragmentShader: `uniform sampler2D tDepth; uniform vec2 uRes; uniform float uTime, uLife; varying vec4 vPar;
      void main(){
        if (texture(tDepth, gl_FragCoord.xy / uRes).r < gl_FragCoord.z - 1e-7) discard;
        vec2 p = gl_PointCoord * 2. - 1.; float hs = vPar.z > .5 ? 7. : vPar.x + 1., d = length(p) * hs;
        float a = smoothstep(vPar.x + .5, vPar.x - .5, d);
        if (vPar.z > .5) { vec2 q = abs(p) * hs; a = max(a, .8 * max(smoothstep(.8, .3, q.y), smoothstep(.8, .3, q.x)) * step(max(q.x, q.y), 6.)); }
        a *= vPar.y * (1. + .32 * sin(uTime * (1.4 + vPar.w * 2.2) + vPar.w * 40.) * uLife);
        gl_FragColor = vec4(vec3(a), a);
      }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; over.add(pts);
}

// ================================================================= floresta
// As mesmas árvores da pintura (mesma semente, mesma copa em gomos), cada fileira numa profundidade:
// de frente caem no lugar exato do original; de lado viram camadas de floresta que deslizam umas sobre as outras.
function forest() {
  const rows = [
    { y: 1200, a: 50, b: 70, pal: 0, pink: .1 }, { y: 1300, a: 56, b: 80, pal: 1, pink: .22 }, { y: 1425, a: 64, b: 88, pal: 2, pink: .12 }, { y: 1560, a: 76, b: 104, pal: 3, pink: .05 },
    { y: 1705, a: 84, b: 112, pal: 3, pink: .08 }, { y: 1870, a: 90, b: 120, pal: 3, pink: .06 },   // duas fileiras a mais, abaixo do quadro original
  ];
  const CY = -655, GY = -872, lobes = [], cores = [], trunks = [];
  rows.forEach((row, ri) => {
    const s = -CY / (row.y - 800), z = D * (1 - s);
    const mk = (rr, xa, xb) => {
      const trees = [];
      for (let x = xa; x < xb;) { const R = row.a + rr() * (row.b - row.a); trees.push([x, row.y + (rr() - .5) * 26, R, rr() < row.pink]); x += R * (1.1 + rr() * .45); }
      for (let i = 0; i < trees.length; i++) rr();                                   // o original gasta um sorteio no tronco
      for (const [x, y, R, pk] of trees) {
        const LB = [], n = 10 + Math.floor(rr() * 4), pal = pk ? 4 : row.pal;
        for (let i = 0; i < n; i++) { const a = PI + (i + .5) / n * PI; LB.push([x + Math.cos(a) * R * .82, y + Math.sin(a) * R * .64, R * (.21 + rr() * .08)]); }
        for (let i = 0; i < 6; i++) { const a = PI + (i + .5) / 6 * PI; LB.push([x + Math.cos(a) * R * .48, y + Math.sin(a) * R * .34 + R * .05, R * (.23 + rr() * .06)]); }
        for (let i = 0; i < 4; i++) LB.push([x + (rr() - .5) * R * 1.1, y + R * .22 + rr() * R * .18, R * (.24 + rr() * .06)]);
        for (let i = 0; i < LB.length; i++) if (rr() < .6) rr();
        const c = W(x, y + R * .08, z); cores.push([c.x, c.y, c.z, R * .98 * s, R * .72 * s, R * .66 * s, pal, 1]);
        for (const [lx, ly, lr] of LB) {
          const dx = (lx - x) / R, dy = (ly - y - R * .08) / R, zf = .6 * R * s * Math.sqrt(Math.max(.04, 1 - (dx / 1.08) ** 2 - (dy / .86) ** 2)), p = W(lx, ly, z);
          for (const sg of [1, -1]) lobes.push([p.x, p.y, p.z + sg * zf, lr * s, lr * s, lr * s, pal, 0]);
        }
        const t = W(x, y + R * .2, z - 6); trunks.push([t.x, t.y, t.z, R * .07 * s, Math.max(190 * s, t.y - GY + 12)]);
      }
    };
    mk(rng(100 + ri), -70, 1700);                                                    // as árvores da pintura
    mk(rng(300 + ri), 800 - 5600 / s, -70 - row.b * 1.2); mk(rng(500 + ri), 1700 + row.b * 1.2, 800 + 5600 / s);   // a continuação para os lados
  });
  // Árvores mais baixas entre as fileiras e atrás da última. A altura de cada uma fica abaixo da linha de visão da câmera
  // de frente (que passa rente à copa da fileira da frente): de frente não aparecem, de cima fecham a mata.
  {
    const rd = rows.map(r => D * (-CY / (r.y - 800))), fr = rng(9191); let rowi = 0;
    for (let z = -4380; z < 1700; z += 205, rowi++) for (let gx = -5700; gx <= 5700; gx += 162) {
      const x = gx + (rowi % 2 ? 81 : 0) + (fr() - .5) * 90, zz = z + (fr() - .5) * 110, d = D - zz, R = 60 + fr() * 26, pk = fr() < .09;
      let k = -1; for (let i = 0; i < rd.length; i++) if (rd[i] < d - 95) { k = i; break; }       // a fileira logo à frente
      if (k < 0 || (k > 0 && rd[k - 1] - d < 95)) continue;                                        // perto demais de uma fileira: pula
      const top = Math.min(-612, -587 * d / rd[k] - 24), cy = top - R * .78, pal = pk ? 4 : rows[Math.max(0, k - 1)].pal, Rh = R * .82, Rv = R * .6, a0 = fr() * 6.28;
      cores.push([x, cy, zz, Rh * .92, Rv * .9, Rh * .92, pal, 1]);
      for (const [n, el] of [[8, .16], [5, .82], [1, PI / 2]]) for (let i = 0; i < n; i++) {
        const a = a0 + el * 2 + (i + (fr() - .5) * .5) / n * 6.2832, ce = Math.cos(el), r = R * (.26 + fr() * .06);
        lobes.push([x + Rh * ce * Math.cos(a), cy + Rv * Math.sin(el), zz + Rh * ce * Math.sin(a), r, r, r, pal, 0]);
      }
      trunks.push([x, cy, zz, R * .06, Math.max(20, cy - GY + 12)]);
    }
  }
  const PALS = [['#244d8f', '#3567b0', '#4d84c8'], ['#1c5a80', '#2f8f93', '#4fb3a4'], ['#174a74', '#2c8487', '#55b89c'], ['#10305c', '#1f6a84', '#2f8f9a'], ['#b8509a', '#f286bd', '#ffb3d6']];
  // cada gomo é pintado como no desenho, em relação a quem olha: claro, um toque de luz em cima e a meia-lua escura embaixo
  const tm = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uPD: { value: PALS.map(p => new THREE.Color(p[0])) }, uPL: { value: PALS.map(p => new THREE.Color(p[1])) }, uPT: { value: PALS.map(p => new THREE.Color(p[2])) } },
    vertexShader: `attribute vec2 aPal; varying vec2 vPal; varying vec3 vN, vNv;
      void main(){ vPal = aPal; mat4 m = modelMatrix * instanceMatrix; vN = normalize(mat3(m) * normal); vNv = mat3(viewMatrix) * vN; gl_Position = projectionMatrix * viewMatrix * m * vec4(position, 1.); }`,
    fragmentShader: MRT + `uniform vec3 uPD[5], uPL[5], uPT[5]; varying vec2 vPal; varying vec3 vN, vNv;
      void main(){
        int k = int(vPal.x + .5); vec3 col = uPD[k];
        if (vPal.y < .5) {
          vec2 q = normalize(vNv).xy; float w = fwidth(q.x) + fwidth(q.y);
          col = mix(uPL[k], uPT[k], smoothstep(.55 + w, .55 - w, distance(q, vec2(-.2, .5))));
          col = mix(col, uPD[k], smoothstep(.95 + w, .95 - w, distance(q, vec2(.14, -.36))));
        }
        gColor = vec4(col, 1.); gAux = vec4(normalize(vN) * .5 + .5, 0.);
      }`,
  });
  const o = new THREE.Object3D();
  const inst = (geo, list) => {
    const m = new THREE.InstancedMesh(geo, tm, list.length), pal = new Float32Array(list.length * 2);
    list.forEach(([x, y, z, sx, sy, sz, p, dk], i) => { o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.updateMatrix(); m.setMatrixAt(i, o.matrix); pal[2 * i] = p; pal[2 * i + 1] = dk; });
    geo.setAttribute('aPal', new THREE.InstancedBufferAttribute(pal, 2)); m.frustumCulled = false; world.add(m);
  };
  inst(new THREE.IcosahedronGeometry(1, 2), lobes); inst(new THREE.SphereGeometry(1, 24, 16), cores);
  const tg = new THREE.CylinderGeometry(1, 1.15, 1, 8); tg.translate(0, -.5, 0);
  const tr = new THREE.InstancedMesh(tg, mat({ color: '#8a3aa8', shade: 0 }), trunks.length);
  trunks.forEach(([x, y, z, r, len], i) => { o.position.set(x, y, z); o.scale.set(r, len, r); o.updateMatrix(); tr.setMatrixAt(i, o.matrix); });
  tr.frustumCulled = false; world.add(tr);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(14000, 7800), mat({ color: '#13305e', shade: 0 })); gr.rotation.x = -PI / 2; gr.position.set(0, GY, -600); world.add(gr);
  console.info('floresta:', trunks.length, 'árvores,', lobes.length, 'gomos');
}

// ================================================================= ilhas
function vineCard(pts, seed, every, z) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const bb = [x0 - 10, y0 - 10, x1 + 10, y1 + 10];
  return card(drawTex(bb, 5, c => vine(c, pts, seed, every)), bb, z, { sx: 6 });
}
// o gramado visto de cima: manchas claras e tufinhos, no mesmo verde da pintura
let _grass;
function grassTex() {
  if (_grass) return _grass;
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const c = cv.getContext('2d'), r = rng(515);
  c.fillStyle = PAL.grass; c.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 2; k++) for (let i = 0; i < 26; i++) {       // manchas (repetidas nas bordas para emendar)
    const x = r() * 512, y = r() * 512, rx = 26 + r() * 46, ry = 12 + r() * 20; c.fillStyle = k ? 'rgba(134,220,110,.34)' : 'rgba(30,120,70,.2)';
    for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) { c.beginPath(); c.ellipse(x + dx, y + dy, rx, ry, 0, 0, TAU); c.fill(); }
  }
  c.strokeStyle = '#2b7a40'; c.lineWidth = 2.4; c.lineCap = 'round';
  for (let i = 0; i < 46; i++) { const x = 12 + r() * 488, y = 14 + r() * 488; c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x - 3, y - 9); c.lineTo(x, y - 1); c.lineTo(x + 3, y - 11); c.lineTo(x + 6, y); c.stroke(); }
  _grass = new THREE.CanvasTexture(cv); _grass.colorSpace = THREE.NoColorSpace; _grass.wrapS = _grass.wrapT = THREE.RepeatWrapping; _grass.anisotropy = 16;
  return _grass;
}
// corpo da ilha: a silhueta da ilustração vira um sólido de seções ovais; de frente o contorno é o mesmo
function island(id, TOP, UND, zc, rootsId, crysId, vines, seed) {
  const poly = TOP.concat(UND.slice(1)), xs = TOP.map(p => p[0]), xL = Math.min(...xs), xR = Math.max(...xs);
  const yTop = (TOP[0][1] + TOP[TOP.length - 1][1]) / 2 - .5;
  let yA = -1e9, xA = 0; for (const [x, y] of UND) if (y > yA) { yA = y; xA = x; }
  const N = 46, rows = [{ y: yTop, a: xL, b: xR }];
  for (let j = 1; j <= N; j++) {
    const y = mix(yTop + 2.5, yA - .5, Math.pow((j - 1) / (N - 1), 1.1)); let [a, b] = span(poly, y, 1);
    if (a > b) { a = rows[rows.length - 1].a; b = rows[rows.length - 1].b; }
    rows.push({ y, a, b });
  }
  rows.push({ y: yA, a: xA, b: xA });
  const KZ = .6, kf = .8, kb = 1.1, cx0 = (xL + xR) / 2, rx0 = (xR - xL) / 2;
  const pt = (u, j) => {
    const R = rows[j], cx = (R.a + R.b) / 2, rx = (R.b - R.a) / 2, th = u * PI * 2, s = Math.sin(th), as = Math.abs(s);
    const rock = 1 + .09 * Math.sin(3 * th + R.y * .02 + seed) * as + .05 * Math.sin(7 * th - R.y * .045 + seed * 2) * as;
    return A(cx + rx * Math.cos(th), R.y, zc + KZ * rx * s * (s > 0 ? kf : kb) * rock);
  };
  const topRect = [[xL - 14, yTop - 22, xR + 14, yTop + 2.1]];
  const ops = selOps([id], { noSil: true, skipP: [1], exclude: topRect }), bb = bbOf(ops, 10), tex = artTex(ops, bb, 4, { dilate: 16 });
  proj(gridGeo(72, rows.length - 1, (u, v, i, j) => pt(u, j)), tex, bb);
  // o gramado de cima
  const cap = [A(cx0, yTop, zc).toArray()]; for (let i = 0; i < 72; i++) cap.push(pt(i / 72, 0).toArray());
  const cg = new THREE.BufferGeometry(), idx = []; for (let i = 0; i < 72; i++) idx.push(0, 1 + i, 1 + (i + 1) % 72);
  cg.setAttribute('position', new THREE.Float32BufferAttribute(cap.flat(), 3)); cg.setIndex(idx);
  cg.setAttribute('uv', new THREE.Float32BufferAttribute(cap.flatMap(q => [q[0] / 190, q[2] / 190]), 2));
  add(new THREE.Mesh(cg, mat({ map: grassTex(), shade: 1, id: nextId() })));
  // tufos e pedrinhas na beira da frente
  const zFront = x => Math.min(52, zc + KZ * rx0 * kf * .82 * Math.sqrt(Math.max(0, 1 - ((x - cx0) / rx0) ** 2)));
  piece(id, { only: topRect, z: zFront, sx: 24 });
  piece(rootsId, { z: zc - 3 });
  piece(crysId, { z: zc + 7, depth: 10, vol: 'all', res: 6 });
  for (const [pts, sd] of vines) vineCard(pts, sd, 9, zc + 5);
}

// ================================================================= o dirigível
let hullZ = () => 0;
function hull() {
  const poly = HULL_TOP.concat(HULL_BOT.slice(1)); let x0 = 1e9, x1 = -1e9; for (const [x] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  const B = 64, N = 72, M = 22, st = [];
  const bOf = x => { const u = sat((x - x0) / (x1 - x0)); return B * (u < .3 ? Math.pow(Math.sin(u / .3 * PI / 2), .85) : 1 - .2 * Math.pow((u - .3) / .7, 2.6)); };
  for (let i = 0; i <= N; i++) { const x = mix(x0 + .5, x1 - .5, i / N), [a, b] = span(poly, x, 0); st.push({ x, a, b, w: bOf(x) }); }
  const ops = [...selOps(['hull'], { noSil: true, exclude: [[858, 560, 882, 584]] }), ...selOps(['portholes'])], bb = bbOf(ops, 10), tex = artTex(ops, bb, 5, { dilate: 14 });
  proj(gridGeo(N, M, (u, v, i) => { const s = st[i], th = v * PI; return A(s.x, s.a + (s.b - s.a) * Math.pow(Math.sin(th), .75), zS + s.w * Math.cos(th)); }), tex, bb);
  hullZ = (x, y) => { const s = st[Math.round(sat((x - x0 - .5) / (x1 - x0 - 1)) * N)], f = sat((y - s.a) / (s.b - s.a)); return s.w * Math.sqrt(Math.max(0, 1 - Math.pow(f, 2 / .75))); };
  // o convés, em tábuas
  const pc = document.createElement('canvas'); pc.width = pc.height = 64; const c = pc.getContext('2d');
  c.fillStyle = '#d6633a'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#9a3a22'; c.fillRect(0, 0, 64, 3); c.fillRect(20, 0, 2, 32); c.fillRect(50, 32, 2, 32); c.fillRect(0, 32, 64, 3);
  const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.NoColorSpace; pt.wrapS = pt.wrapT = THREE.RepeatWrapping; pt.anisotropy = 8;
  const dg = gridGeo(N, 1, (u, v, i) => A(st[i].x, st[i].a + 1.2, zS + st[i].w * .98 * (v * 2 - 1)));
  const dp = dg.attributes.position, duv = new Float32Array(dp.count * 2); for (let i = 0; i < dp.count; i++) { duv[2 * i] = dp.getX(i) / 46; duv[2 * i + 1] = dp.getZ(i) / 30; }
  dg.setAttribute('uv', new THREE.BufferAttribute(duv, 2));
  add(new THREE.Mesh(dg, mat({ map: pt, shade: 1, id: nextId() })));
}
function ship() {
  hull();
  piece('hull', { only: [[858, 560, 882, 584]], z: zS });                         // a voluta da proa
  piece('hero', { z: zS + 22, depth: 44, res: 8 });
  { // capacete de explorador: cúpula e aba de verdade, com a arte projetada
    const ops = selOps(['heroHat'], { noSil: true }), bb = bbOf(ops, 8), tex = artTex(ops, bb, 8, { dilate: 10, dilateN: 2 });
    const dome = new THREE.SphereGeometry(1, 40, 14, 0, PI * 2, 0, PI / 2); dome.scale(43, 36, 38); dome.translate(970 - 800, 800 - 538, zS); proj(dome, tex, bb);
    const brim = new THREE.SphereGeometry(1, 40, 16); brim.scale(60, 7.5, 50); brim.translate(970 - 800, 800 - 540, zS); proj(brim, tex, bb);
    ell(970, 502, zS, 4.2, 4.2, 4.2, PAL.khakiD);
  }
  { // luneta do herói
    const a = A(914, 575, zS + 24), b = A(836, 527, zS + 44), cols = [PAL.brass, PAL.leather, PAL.brass], dir = b.clone().sub(a).normalize();
    for (let k = 0; k < 3; k++) { const r = mix(5, 7.5, k / 2); cyl(a.clone().lerp(b, k / 3), a.clone().lerp(b, (k + 1) / 3), r, r, cols[k]); }
    cyl(b.clone().addScaledVector(dir, -1.6), b.clone().addScaledVector(dir, .9), 8.5, 8.5, '#3a2a36');
    cyl(b.clone().addScaledVector(dir, .9), b.clone().addScaledVector(dir, 1.5), 6.6, 6.6, '#cfe8ff');
  }
  piece('heroPack', { z: zS + 15, depth: 30, vol: 3, res: 8 });
  const rl = piece('railing', { z: zS + 58, res: 6 }); card(rl.tex, rl.bbox, zS - 58);
  piece('wheel', { z: zS + 2, res: 7 });
  piece('cabin', { only: [[1168, 526, 1306, 616]], z: zS + 42, depth: 84, back: true, res: 6 });
  { const ops = selOps(['cabin'], { only: [[1150, 505, 1325, 548]] }), bb = bbOf(ops, 4), tex = artTex(ops, bb, 6); pyr(tex, bb, [[1158, 542], [1237, 512], [1316, 542]], zS + 54, 108); }
  piece('chimneyShip', { z: zS + 7, depth: 14, vol: 2, skipP: [0] });
  piece('shipFlag', { z: zS, res: 6, sx: 30, sy: 6, wave: [W(1407, 0, zS).x, 4.5, 44, 6] });
  piece('propeller', { only: [[1406, 632, 1449, 648]], z: zS + 4, depth: 8 });
  anim.prop = pivot(1453, 640, zS);
  piece('propeller', { only: [[1436, 570, 1474, 710]], keepP: true, z: zS + 1, res: 6, parent: anim.prop });
  piece('propeller', { only: [[1470, 555, 1535, 725]], z: zS - 1 });
  piece('rudder', { z: zS + 3, depth: 6 });
  anim.anchor = pivot(1150, 706, zS);
  piece('anchor', { z: zS, depth: 5, vol: 2, res: 5, parent: anim.anchor });
  // cordas do balão até as duas amuradas
  const xe = [930, 1018, 1106, 1194, 1282, 1370], xd = [1042, 1100, 1160, 1220, 1280, 1394];
  xe.forEach((x, i) => {
    for (const sg of (i === 3 || i === 4 ? [-1] : [1, -1])) {
      const a = A(x, EY + eh(x) - 4, zS + sg * 6), b = A(xd[i], 578, zS + sg * 58);
      tube([a, a.clone().lerp(b, .5).add(V3(0, -2.5, 0)), b], .6, PAL.out, { rs: 4, seg: 10, shade: 0, id: 0 });
    }
  });
  { // o balão: um elipsoide de verdade, com as faixas, costuras, remendo e emblema da arte
    const ops = [...selOps(['envOutline'], { noSil: true, exclude: [[818, 316, 846, 344]] }), ...selOps(['envSeams', 'patch', 'emblem'])], bb = bbOf(ops, 10), tex = artTex(ops, bb, 4, { dilate: 16 });
    const g = new THREE.SphereGeometry(1, 96, 64); g.scale(ERX, ERY, ERY); g.translate(EX - 800, 800 - EY, zS); proj(g, tex, bb);
    ell(832, 330, zS, 9, 9, 9, PAL.brass);
  }
  piece('fins', { z: zS + 5, depth: 10, vol: 2 });
  piece('sideFin', { z: zS + 112, depth: 224 });                                   // os dois estabilizadores de lado, numa peça só
  // a corda de bandeirinhas que amarra o dirigível na torre atravessa a profundidade
  piece('mooring', { z: x => mix(zT + 25, zS, sat((x - 644) / 222)), res: 5, sx: 44, sy: 6, sway: [W(644, 0, zT + 25).x, W(866, 0, zS).x, 3.2, 0] });
}

// ================================================================= a torre do observatório
function sides(p, xs, zf, zb) { const [, y0, , y1] = p.bbox; for (const x of xs) quad(p.tex, A(x, y0, zf), A(x, y0, zb), A(x, y1, zb), A(x, y1, zf)); }
function tower() {
  let p;
  piece(['towerBase', 'door'], { z: zT, depth: 150, res: 5 });
  piece('plat1', { only: [[409, 855, 661, 870]], z: zT + 25, depth: 200, back: true });
  p = piece('plat1', { only: [[412, 864, 460, 908], [602, 864, 658, 908]], z: zT - 8 }); card(p.tex, p.bbox, zT - 142);
  p = piece('plat1', { only: [[600, 828, 661, 861]], z: zT + 24, res: 6 }); card(p.tex, p.bbox, zT - 174);
  piece('room1', { skipP: [0], z: zT - 15, depth: 120, back: true, res: 5 });
  piece('plat2', { only: [[429, 710, 659, 724]], z: zT + 25, depth: 200, back: true });
  p = piece('plat2', { only: [[431, 718, 476, 758], [586, 718, 656, 764]], z: zT - 8 }); card(p.tex, p.bbox, zT - 142);
  p = piece('rail2', { z: zT + 24, res: 6 }); card(p.tex, p.bbox, zT - 174); sides(p, [445, 647], zT + 29, zT - 179);
  piece('mini1', { z: zT + 4, depth: 20, res: 8 });
  p = piece('scaffold', { skipP: [0], z: zT - 27, res: 5 }); card(p.tex, p.bbox, zT - 123); sides(p, [485.5, 574.5], zT - 18, zT - 132);
  piece('ladder', { z: zT - 22, res: 5 });
  piece('obsRoom', { only: [[467, 483, 593, 562.5]], z: zT - 15, depth: 120, back: true, res: 5 });
  piece('obsRoom', { only: [[449, 553, 611, 566]], z: zT, depth: 150, back: true });
  piece('dome', { only: [[452, 477, 608, 491]], z: zT, depth: 150, back: true });
  { // a cúpula de vidro
    const ops = selOps(['dome'], { noSil: true, exclude: [[452, 477, 608, 491]] }), bb = bbOf(ops, 8), tex = artTex(ops, bb, 5, { dilate: 12 });
    const g = new THREE.SphereGeometry(1, 56, 20, 0, PI * 2, 0, PI / 2); g.scale(70, 64, 70); g.translate(530 - 800, 800 - 484, zT - 75); proj(g, tex, bb);
  }
  { // o telescópio saindo pela fenda
    const a = A(528, 468, zT - 6), b = A(452, 390, zT + 42), cols = [PAL.clay, PAL.brass], dir = b.clone().sub(a).normalize();
    for (let k = 0; k < 2; k++) { const r = mix(8, 12, k); cyl(a.clone().lerp(b, k / 2), a.clone().lerp(b, (k + 1) / 2), r, r, cols[k]); }
    cyl(b.clone().addScaledVector(dir, -2), b.clone().addScaledVector(dir, 1.2), 13.5, 13.5, '#3a2a36');
    cyl(b.clone().addScaledVector(dir, 1.2), b.clone().addScaledVector(dir, 2), 10.8, 10.8, '#cfe8ff');
  }
  piece('towerFlag', { z: zT - 75, res: 6, sx: 30, sy: 6, wave: [W(586, 0, zT - 75).x, 4.5, 46, 5.5] });
  piece('bulbs', { z: zT + 12, res: 6 });
  piece('lantern', { z: zT - 30, depth: 10, res: 6 });
  p = piece('stairs', { z: zT + 40, res: 5 }); card(p.tex, p.bbox, zT + 2);
  { const a = [300, 1012], b = [414, 862]; for (let i = 1; i <= 10; i++) { const q = at(a, b, i / 11); prism(rectP(q[0], q[1] - 1.2, 13, 2.6), zT + 39, 36, PAL.wood); } }
  vineCard(cr([[489, 713], [500, 690], [492, 662], [506, 630], [498, 600]], 6), 11, 9, zT - 26);
  vineCard(cr([[592, 724], [586, 760], [594, 800], [588, 840]], 6), 12, 9, zT - 14);
  vineCard(cr([[652, 867], [648, 890], [655, 915], [650, 940]], 6), 13, 9, zT + 26);
  vineCard(cr([[434, 721], [440, 745], [434, 772], [441, 798]], 6), 14, 9, zT + 26);
}
function windmill() {
  const cap = [[236, 796, 288, 841]];
  let ops = selOps(['windmill'], { exclude: cap }), bb = bbOf(ops, 4), tex = artTex(ops, bb, 5);
  frustum(tex, bb, [[232, 1012], [292, 1012], [277, 832], [247, 832]], zW, 60, 30);
  ops = selOps(['windmill'], { only: cap }); bb = bbOf(ops, 4); tex = artTex(ops, bb, 6);
  pyr(tex, bb, [[240, 838], [262, 800], [284, 838]], zW - 8, 44);
  anim.sails = pivot(262, 814, zW + 6);
  piece('sails', { z: zW + 6, res: 6, parent: anim.sails });
}
function cottage() {
  piece('cottage', { skipP: [0], z: zC, depth: 130, back: true, res: 5 });
  { const ops = selOps(['roof']), bb = bbOf(ops, 4), tex = artTex(ops, bb, 5); pyr(tex, bb, [[674, 912], [767, 828], [860, 912]], zC + 18, 166); }
  piece('chimney', { z: zC - 54, depth: 22, vol: 2 });
  piece('smoke', { noP: true, z: zC - 52 });
  piece('props', { only: [[846, 978, 885, 1016]], z: 25, depth: 30, res: 6 });   // o caixote
  { // o barril
    const g = new THREE.LatheGeometry([[0, 0], [11, 0], [13.6, 8], [15, 16.5], [13.6, 25], [11, 33], [0, 33]].map(([r, h]) => new THREE.Vector2(r, h)), 28);
    g.translate(670 - 800, 800 - 1011, 62); add(new THREE.Mesh(g, mat({ color: PAL.wood, shade: 1, id: nextId() })));
    for (const h of [9, 24]) { const t = new THREE.TorusGeometry(14.1, 1, 6, 28); t.rotateX(PI / 2); t.translate(670 - 800, 800 - 1011 + h, 62); add(new THREE.Mesh(t, mat({ color: PAL.iron, shade: 1 }))); }
  }
  vineCard(cr([[695, 1012], [700, 980], [694, 950], [702, 920]], 6), 15, 9, zC + 1);
  piece('bunting2', { z: x => mix(zT + 25, zC - 65, sat((x - 652) / 154)), res: 5, sx: 30, sy: 5, sway: [W(652, 0, zT + 25).x, W(806, 0, zC - 65).x, 2.2, 0] });
}
function bridge() {
  const zb = x => mix(-20, zL, sat((x - 901) / 194));
  let p = piece('bridge', { z: x => zb(x) + 17, sx: 10 }); card(p.tex, p.bbox, x => zb(x) - 17, { sx: 10 });
  const g = gridGeo(24, 1, (u, v) => { const q = BR(u); return A(q[0], q[1] + .6, zb(q[0]) + (v * 2 - 1) * 16); });
  add(new THREE.Mesh(g, mat({ color: PAL.wood, shade: 1, id: nextId() })));
  piece('mini2', { z: zb(BR(.42)[0]) + 7, depth: 14, res: 8 });
  p = piece('bridgeRail', { skipP: [0], z: x => zb(x) + 17.6, sx: 10 }); card(p.tex, p.bbox, x => zb(x) - 17.6, { sx: 10 });
  const vp = sag(901, 970, 1095, 1038, 16, 24).slice(2, 9); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of vp) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const bb = [x0 - 10, y0 - 10, x1 + 10, y1 + 10]; card(drawTex(bb, 5, c => vine(c, vp, 16, 7)), bb, x => zb(x) + 18.2, { sx: 6 });
}
function camp() {
  island('islet', IT_TOP, IT_UND, zL, 'isletRoots', 'isletCrystals', [[cr([[1150, 1150], [1154, 1175], [1148, 1200]], 6), 41], [cr([[1360, 1162], [1364, 1190], [1358, 1214]], 6), 42]], 7);
  { // a barraca, com a lateral indo para o fundo como no desenho
    const ops = selOps(['tent']), bb = bbOf(ops, 5), tex = artTex(ops, bb, 6), zf = zL + 55, zb = zL - 45;
    const F1 = A(1170, 1078, zf), F2 = A(1228, 990, zf), F3 = A(1286, 1078, zf), B2 = A(1162, 982, zb), B1 = A(1120, 1074, zb), B3 = A(1236, 1074, zb);
    const tri = (...v) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v.flatMap(q => q.toArray()), 3)); return g; };
    proj(tri(F1, F3, F2, F2, B2, B1, F2, B1, F1), tex, bb, { shade: 0 });
    add(new THREE.Mesh(tri(F3, B3, B2, F3, B2, F2, B1, B2, B3), mat({ color: PAL.tentD, shade: 1, id: nextId() })));
    tube([A(1228, 992, zf), A(1262, 1036, zf + 4), A(1297, 1080, zf + 8)], .5, PAL.out, { shade: 0, id: 0, seg: 4, rs: 4 });
    tube([A(1162, 984, zb), A(1136, 1032, zb - 3), A(1109, 1080, zb - 6)], .5, PAL.out, { shade: 0, id: 0, seg: 4, rs: 4 });
  }
  piece('fire', { only: [[1292, 1060, 1345, 1081]], z: zL + 40 });
  const fz = zL + 40.6, fl = piece('fire', { only: [[1300, 995, 1338, 1070]], z: fz, res: 8, sy: 10, flick: [W(0, 1068, fz).y, 50, 1.5] });
  { const [x0, y0, x1, y1] = fl.bbox, xm = 1319, hw = (x1 - x0) / 2; quad(fl.tex, A(xm, y0, fz + hw), A(xm, y0, fz - hw), A(xm, y1, fz - hw), A(xm, y1, fz + hw), { shade: 0 }); }
  piece('mini3', { z: zL + 38, depth: 16, res: 8 });
  piece('campFlag', { z: zL + 10, res: 6, sx: 30, sy: 6, wave: [W(1415, 0, zL + 10).x, 4, 44, 5.5] });
}
function waterfall() {
  const ops = selOps(['waterfall']), bb = [146, 1002, 220, 1280], tex = artTex(ops, bb, 5);
  const g = new THREE.PlaneGeometry(bb[2] - bb[0], bb[3] - bb[1], 1, 12); g.translate((bb[0] + bb[2]) / 2 - 800, 800 - (bb[1] + bb[3]) / 2, zI + 12);
  const m = new THREE.ShaderMaterial({
    ...PREMULT, side: THREE.DoubleSide, uniforms: { map: { value: tex }, tDepth: U.depth, uRes: U.res, uNF: U.nf, uTime: U.time, uLife: U.life },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform sampler2D map, tDepth; uniform vec2 uRes, uNF; uniform float uTime, uLife; varying vec2 vUv;
      ${LIN}
      void main(){
        if (lin(texture(tDepth, gl_FragCoord.xy / uRes).r) < lin(gl_FragCoord.z) - 3.) discard;
        vec4 c = texture(map, vUv);
        float k = 1. + .08 * sin(vUv.y * 24. + uTime * 6. + vUv.x * 6.) * uLife * smoothstep(.02, .25, 1. - vUv.y);
        gl_FragColor = vec4(min(c.rgb * k, 1.) * c.a, c.a);
      }`,
  });
  add(new THREE.Mesh(g, m), { scene: over });
}
function birds() {
  for (const [x, y, s] of [[372, 250, 15], [410, 228, 11], [344, 292, 10], [452, 268, 13], [700, 206, 12], [732, 232, 9]]) {
    const g = pivot(x, y, -1600); piece('birds', { only: [[x - s - 3, y - s * .6 - 3, x + s + 3, y + 3]], z: -1600, res: 8, parent: g, shade: 0 });
    anim.birds.push({ g, x0: g.position.x, y0: g.position.y, ph: x * .37 });
  }
}
function smoke() {
  const mk = (L, n, z, cyc, f0, f1) => {
    const ms = [];
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group(), hi = new THREE.Mesh(new THREE.SphereGeometry(.5, 18, 12), mat({ color: '#ffffff', shade: 0 }));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 26, 16), mat({ color: '#f5e0ec', shade: 0 }))); hi.position.set(-.27, .32, .62); g.add(hi); world.add(g); ms.push(g);
    }
    anim.smoke.push({ L, ms, z, cyc, f0, f1 });
  };
  mk([[817, 828, 5], [818, 818, 8], [826, 803, 9.5], [836, 788, 10.5], [848, 774, 11], [860, 760, 10], [873, 745, 9], [886, 731, 7]], 6, zC - 65, 6.6, 5.2, 6.5);
  mk([[1286, 480, 4], [1289, 471, 7], [1298, 462, 5.5], [1309, 452, 5], [1322, 444, 3]], 3, zS - 3, 4.2, 2.2, 3.2);
}
function lights() {
  // cada brilho da pintura vai para o lugar da peça dele no espaço
  const zOf = { cabin: zS + 44, obsRoom: zT - 13, room1: zT - 13, bulbs: zT + 14, lantern: zT - 28, windmill: zW - 6, roof: zC - 6, cottage: zC + 2, tent: zL + 57, fire: zL + 43, crystals: zI + 9, isletCrystals: zL + 9 };
  for (const G of GLOWS) {
    if (G.id === 'portholes') { for (const sg of [1, -1]) { const z = zS + sg * (hullZ(G.x, G.y) + 2); glow(W(G.x, G.y, z), G.r * warpS(z), G.col, G.a, { amp: .03 }); } continue; }
    const z = zOf[G.id]; if (z == null) { console.warn('brilho sem lugar', G.id); continue; }
    glow(W(G.x, G.y, z), G.r * warpS(z), G.col, G.a, { amp: G.id === 'fire' ? .16 : G.id === 'tent' ? .07 : /rystal/.test(G.id) ? .13 : .03, sp: G.id === 'fire' ? 3.3 : 1 });
  }
  glow(W(235, 178, -19900), 110 * warpS(-19900), '#fff0c8', .4);
  // vaga-lumes: os 46 da pintura, cada um no raio de visão do ponto original, e mais alguns espalhados
  const r = rng(77), r2 = rng(78);
  for (let i = 0; i < 46; i++) { const x = r() * 1600, y = 1180 + r() * 400, s = 1.2 + r() * 1.6, d = 585 * D / (y - 800) * .965; glow(W(x, y, D - d), s * 6 * d / D, '#f0ff96', .7, { core: 1 / 6, drift: 9, amp: .4, sp: .7 + r2() }); }
  for (let i = 0; i < 190; i++) glow(V3(-3800 + r2() * 7600, -590 + r2() * 110, -2700 + r2() * 4500), (1.2 + r2() * 1.6) * 7.5, '#f0ff96', .7, { core: 1 / 6, drift: 11, amp: .4, sp: .7 + r2() });
}

// ================================================================= montagem e vida
export function build() {
  sky(); hills(); clouds(); moon(); forest();
  island('island', IS_TOP, IS_UND, zI, 'roots', 'crystals', [[300, 1118, 31], [470, 1240, 32], [720, 1185, 33], [840, 1096, 34]].map(([x, y, s]) => [cr([[x, y], [x + 4, y + 25], [x - 3, y + 50], [x + 3, y + 72]], 6), s]), 3);
  tower(); windmill(); cottage(); bridge(); camp(); ship(); waterfall(); birds(); smoke();
  lights(); buildGlows(); stars();
}
// o que se mexe depois que a cor chega: hélice, pás, bandeiras, fumaça, pássaros, fogo
export function tick(t, camera) {
  const tau = Math.max(0, t - 22.05), life = smooth(tau, 0, 1.3), te = tau * tau / (tau + .9);
  U.time.value = te; U.life.value = life;
  anim.sky.position.copy(camera.position);
  anim.sails.rotation.z = -te * .5;
  anim.prop.rotation.x = te * 8.5;
  anim.anchor.rotation.z = Math.sin(te * 1.15) * .045 * life;
  for (const c of anim.clouds) c.m.position.x = c.v * te;
  for (const b of anim.birds) { b.g.position.x = b.x0 + te * 11; b.g.position.y = b.y0 + Math.sin(te * .8 + b.ph) * 5 * life; b.g.scale.y = 1 - .55 * life * (.5 + .5 * Math.sin(te * 6.5 + b.ph)); }
  for (const S of anim.smoke) S.ms.forEach((m, i) => {
    const f = (i + 1 + te * .5) % S.cyc, k = Math.min(Math.floor(f), S.L.length - 2), u = f - k, a = S.L[k], b = S.L[k + 1];
    const env = smooth(f, 0, .9) * (1 - smooth(f, S.f0, S.f1));
    m.position.copy(W(mix(a[0], b[0], u), mix(a[1], b[1], u), S.z)); m.scale.setScalar(Math.max(.001, mix(a[2], b[2], u) * env * warpS(S.z)));
  });
}
