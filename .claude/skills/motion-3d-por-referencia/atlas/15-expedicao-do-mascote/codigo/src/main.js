// main.js — o relógio, as câmeras e a finalização da imagem.
// renderAt(t) desenha qualquer instante do filme do zero:
//   0 a 20,5 s   o lápis desenha na folha (mesmo traço e mesmo tempo do original), com a câmera inclinada
//   20,9 a 22,25 a onda de cor atravessa o quadro, de frente, como no original
//   22,25 em diante  o desenho virou um mundo: planos de slider em volta dele
import { THREE, renderer, world, over, U, OUT, SS, RW, D, F0, NEAR, FAR, PI, mix, sat, smooth, ramp, qs } from './base.js';
import { build, tick } from './mundo.js';
import { paper, buildPaper, updatePaper, penAt } from './papel.js';

const DUR = 46.2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = THREE.MathUtils.degToRad;

build(); buildPaper();

// ---------------------------------------------------------------- alvos de render
const NF = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false };
const LF = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false };
const dtex = () => { const d = new THREE.DepthTexture(RW, RW); d.type = THREE.UnsignedIntType; d.minFilter = d.magFilter = THREE.NearestFilter; return d; };
const rtMain = new THREE.WebGLRenderTarget(RW, RW, { ...NF, count: 2, type: THREE.UnsignedByteType, depthTexture: dtex() });
const rtOver = new THREE.WebGLRenderTarget(RW, RW, { ...LF, type: THREE.HalfFloatType, depthBuffer: false });
const rtPaper = new THREE.WebGLRenderTarget(RW, RW, { ...LF, type: THREE.UnsignedByteType, depthTexture: dtex(), samples: SS >= 3 ? 0 : 4 });
const rtComp = new THREE.WebGLRenderTarget(RW, RW, { ...LF, type: THREE.HalfFloatType, depthBuffer: false });
const rtSmall = new THREE.WebGLRenderTarget(OUT, OUT, { ...LF, type: THREE.HalfFloatType, depthBuffer: false });
const rtW = new THREE.WebGLRenderTarget(OUT, OUT, { ...LF, type: THREE.UnsignedByteType, depthBuffer: false });
const rtP = new THREE.WebGLRenderTarget(OUT, OUT, { ...LF, type: THREE.UnsignedByteType, depthBuffer: false });

// ---------------------------------------------------------------- passes de tela cheia
const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fsGeo = new THREE.BufferGeometry(); fsGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
const fsMesh = new THREE.Mesh(fsGeo, null); fsMesh.frustumCulled = false; fsScene.add(fsMesh);
const FSV = 'varying vec2 vUv; void main(){ vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }';
const fsMat = (uniforms, frag) => new THREE.ShaderMaterial({ uniforms, vertexShader: FSV, fragmentShader: frag, depthTest: false, depthWrite: false });
function pass(m, target) { fsMesh.material = m; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }
const LIN = 'float lin(float d){ return uNF.x * uNF.y / (uNF.y - d * (uNF.y - uNF.x)); }\n';

// contorno de tinta + brilhos. O contorno nasce da identidade das peças: sai onde uma peça com volume
// encontra outra coisa mais ao fundo, ou onde duas faces da mesma peça fazem quina.
const compMat = fsMat({
  tColor: { value: rtMain.textures[0] }, tAux: { value: rtMain.textures[1] }, tDepth: { value: rtMain.depthTexture }, tOver: { value: rtOver.texture },
  uRes: U.res, uNF: U.nf, uSS: U.ss, uMagK: { value: 4500 }, uW: { value: 1.75 }, uOut: { value: new THREE.Color('#2a1830') },
}, `uniform sampler2D tColor, tAux, tDepth, tOver; uniform vec2 uRes, uNF; uniform float uSS, uMagK, uW; uniform vec3 uOut; varying vec2 vUv;
  ${LIN}
  void main(){
    vec4 a0 = texture2D(tAux, vUv); float id0 = floor(a0.a * 255. + .5), d0 = lin(texture2D(tDepth, vUv).r);
    vec3 col = texture2D(tColor, vUv).rgb; float edge = 0.;
    if (id0 > .5) {
      vec3 n0 = a0.rgb * 2. - 1.;
      float r = clamp(uW * uMagK / d0, .8, 13.) * uSS, eps = .8 + d0 * .0016;
      for (int i = 0; i < 16; i++) {
        float an = float(i) * .3926991; vec2 o = vec2(cos(an), sin(an)) / uRes;
        for (int k = 0; k < 2; k++) {
          vec2 q = vUv + o * (k == 0 ? r : r * .5);
          vec4 aq = texture2D(tAux, q); float idq = floor(aq.a * 255. + .5), dq = lin(texture2D(tDepth, q).r);
          if (idq != id0) { if (dq > d0 + eps) edge = 1.; else if (idq > .5 && idq < id0 && abs(dq - d0) <= eps) edge = 1.; }
          else if (k == 1 && dot(aq.rgb * 2. - 1., n0) < .55) edge = 1.;
        }
      }
    }
    col = mix(col, uOut, edge);
    vec4 ov = texture2D(tOver, vUv);
    col = col * (1. - ov.a) + ov.rgb;
    gl_FragColor = vec4(col, d0 / uNF.y);
  }`);
// a folha: só leva a cor e a profundidade para o mesmo formato do mundo
const packMat = fsMat({ tColor: { value: rtPaper.texture }, tDepth: { value: rtPaper.depthTexture }, uNF: { value: new THREE.Vector2(20, 60000) }, uFar: { value: FAR } },
  `uniform sampler2D tColor, tDepth; uniform vec2 uNF; uniform float uFar; varying vec2 vUv; ${LIN}
  void main(){ gl_FragColor = vec4(texture2D(tColor, vUv).rgb, lin(texture2D(tDepth, vUv).r) / uFar); }`);
const downMat = fsMat({ tMap: { value: rtComp.texture }, uOut: { value: OUT } },
  `uniform sampler2D tMap; uniform float uOut; varying vec2 vUv;
  void main(){ vec4 s = vec4(0.); for (int j = 0; j < ${SS}; j++) for (int i = 0; i < ${SS}; i++) s += texture2D(tMap, vUv + (vec2(float(i), float(j)) + .5 - ${SS}. * .5) / (uOut * ${SS}.)); gl_FragColor = s / ${SS * SS}.; }`);
// profundidade de campo: desfoca o que está fora da distância de foco
const dofMat = fsMat({ tMap: { value: rtSmall.texture }, uFar: { value: FAR }, uFocus: { value: 4500 }, uAp: { value: 0 }, uMax: { value: 15 }, uOut: { value: OUT }, uVig: { value: 0 } },
  `uniform sampler2D tMap; uniform float uFar, uFocus, uAp, uMax, uOut, uVig; varying vec2 vUv;
  vec3 vig(vec3 c){ return c * (1. - uVig * smoothstep(.42, 1.02, length(vUv - .5) * 1.4142)); }
  float coc(float d){ return min(uAp * abs(d - uFocus) / max(d, 1.), uMax); }
  void main(){
    vec4 c0 = texture2D(tMap, vUv);
    if (uAp <= 0.) { gl_FragColor = vec4(vig(c0.rgb), 1.); return; }
    float d0 = c0.a * uFar, r0 = coc(d0); vec3 acc = c0.rgb; float n = 1.;
    for (int i = 0; i < 110; i++) {
      float f = (float(i) + .5) / 110., rr = sqrt(f) * uMax, an = float(i) * 2.39996323;
      vec4 s = texture2D(tMap, vUv + vec2(cos(an), sin(an)) * rr / uOut); float ds = s.a * uFar, rs = coc(ds);
      if (ds > d0) rs = clamp(rs, 0., r0 * 2.);
      acc += mix(acc / n, s.rgb, smoothstep(rr - .5, rr + .5, rs)); n += 1.;
    }
    gl_FragColor = vec4(vig(acc / n), 1.);
  }`);
// a onda de cor do original: borda inclinada e ondulada, faixa lilás na frente, cor a 55% e depois cheia
const waveMat = fsMat({ tPaper: { value: rtP.texture }, tWorld: { value: rtW.texture }, uT: { value: 0 }, uMode: { value: 0 } },
  `uniform sampler2D tPaper, tWorld; uniform float uT, uMode; varying vec2 vUv;
  float p2io(float x){ return x < .5 ? 2. * x * x : 1. - 2. * (1. - x) * (1. - x); }
  void main(){
    if (uMode < .5) { gl_FragColor = vec4(texture2D(tPaper, vUv).rgb, 1.); return; }
    vec3 w = texture2D(tWorld, vUv).rgb;
    if (uMode > 1.5) { gl_FragColor = vec4(w, 1.); return; }
    float x = vUv.x * 1600., y = (1. - vUv.y) * 1600.;
    float X = mix(-380., 1980., p2io(clamp((uT - ${WIPE0}) / ${(WIPE1 - WIPE0).toFixed(4)}, 0., 1.)));
    float e = X + 200. * (800. - y) / 800. + 34. * sin(y * .0105 + 1.3 + uT * 2.2) + 16. * sin(y * .027 + .4 - uT * 3.1) + 7. * sin(y * .061 + 2.) - x;
    vec3 c = texture2D(tPaper, vUv).rgb;
    c = mix(c, mix(c, vec3(.7137, .6941, .9569), .5), smoothstep(-.7, .7, e));
    c = mix(c, mix(c, w, .55), smoothstep(-.7, .7, e - 24.));
    c = mix(c, w, smoothstep(-.7, .7, e - 60.));
    gl_FragColor = vec4(c, 1.);
  }`);

// ---------------------------------------------------------------- câmeras
const camP = new THREE.PerspectiveCamera(F0, 1, 20, 60000);
const camW = new THREE.PerspectiveCamera(F0, 1, NEAR, FAR);
const FRONT = { p: V(0, 0, D), l: V(0, 0, 0), fov: F0 };
const eoc = u => 1 - Math.pow(1 - u, 3), eio = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
// os planos do mundo. Cada um vai de a até b em linha reta, como câmera num trilho.
const SHOTS = [
  { id: 'revelacao', t0: 22.25, t1: 26.4, a: FRONT, b: { p: V(-1660, -150, 3860), l: V(-90, -30, 0), fov: F0 }, e: u => Math.pow(u, 1.85), ap: [0, 7], foc: V(-150, 0, 40) },
  { id: 'do-alto', t0: 26.4, t1: 29.9, a: { p: V(-1560, 1130, 2480), l: V(-250, -60, 0), fov: 26 }, b: { p: V(-560, 1190, 2680), l: V(-170, -60, 0), fov: 26 }, ap: [9, 9], foc: V(-250, 60, 40) },
  { id: 'sob-a-ilha', t0: 29.9, t1: 33.4, a: { p: V(-1090, -448, 950), l: V(-350, -292, -30), fov: 30 }, b: { p: V(-640, -474, 1060), l: V(-290, -284, -30), fov: 30 }, ap: [15, 15], foc: V(-360, -380, 40) },
  { id: 'acampamento', t0: 33.4, t1: 36.9, a: { p: V(1090, -124, 1140), l: V(474, -222, 80), fov: 24 }, b: { p: V(730, -142, 1215), l: V(448, -222, 80), fov: 24 }, ap: [14, 14], foc: V(500, -240, 100) },
  { id: 'heroi', t0: 36.9, t1: 40.6, a: { p: V(-420, 146, 1270), l: V(186, 262, 300), fov: 25 }, b: { p: V(-20, 170, 1225), l: V(208, 262, 300), fov: 25 }, ap: [16, 16], foc: V(160, 235, 320) },
  { id: 'volta', t0: 40.6, t1: 45.0, a: { p: V(2050, 690, 3900), l: V(0, -30, 0), fov: F0 }, b: FRONT, e: u => 1 - Math.pow(1 - u, 1.8), ap: [7, 0], foc: V(0, 0, 60) },
];
function worldCam(t) {
  let S = null; for (const s of SHOTS) if (t >= s.t0 && t < s.t1) S = s;
  if (!S) return { p: FRONT.p, l: FRONT.l, fov: F0, ap: 0, focus: D };
  const u = ramp(t, S.t0, S.t1), e = S.e ? S.e(u) : u;
  const p = S.a.p.clone().lerp(S.b.p, e), l = S.a.l.clone().lerp(S.b.l, e), fov = mix(S.a.fov, S.b.fov, e);
  return { p, l, fov, ap: mix(S.ap[0], S.ap[1], S.e ? e : u), focus: Math.max(60, S.foc.clone().sub(p).dot(l.clone().sub(p).normalize())) };
}
// a câmera da folha: mesma posição e aproximação do original, com inclinação de quem filma o papel de perto
function paperCam(t) {
  const c2 = camAt(t), [z, cx, cy] = c2, flat = seg(t, PULL0, PULL1, p3io);
  const tilt = rad(22 + 5 * Math.cos(t * .25)) * (1 - flat), yaw = rad(11 * Math.sin(t * .2 - .7) + 3 * Math.sin(t * .47)) * (1 - flat);
  const T = V(cx - 800, 800 - cy, 0), o = V(Math.tan(yaw), -Math.tan(tilt), 1).normalize();
  return { c2, p: T.clone().addScaledVector(o, D / z), l: T, ap: 78 * (1 - flat) };
}

// ---------------------------------------------------------------- o quadro
function finish(target, focus, ap, vg = 0) {
  pass(downMat, rtSmall);
  dofMat.uniforms.uFocus.value = focus; dofMat.uniforms.uAp.value = ap; dofMat.uniforms.uVig.value = vg;
  pass(dofMat, target);
}
function drawWorld(t, o = {}) {
  let c = o.front ? { p: FRONT.p, l: FRONT.l, fov: F0, ap: 0, focus: D } : worldCam(t);
  if (o.cam) { const p = V(...o.cam.p), l = V(...o.cam.l); c = { p, l, fov: o.cam.fov || F0, ap: o.cam.ap || 0, focus: p.distanceTo(o.cam.foc ? V(...o.cam.foc) : l) }; }   // câmera de teste
  camW.position.copy(c.p); camW.fov = c.fov; camW.up.set(0, 1, 0); camW.lookAt(c.l); camW.updateProjectionMatrix(); camW.updateMatrixWorld();
  tick(t, camW);
  U.depth.value = null;
  renderer.setRenderTarget(rtMain); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(world, camW);
  U.depth.value = rtMain.depthTexture;
  renderer.setRenderTarget(rtOver); renderer.clear(); renderer.render(over, camW);
  compMat.uniforms.uMagK.value = 800 / Math.tan(rad(c.fov) / 2);
  pass(compMat, rtComp);
  finish(rtW, c.focus, o.noDof ? 0 : c.ap, c.ap > 0 ? .1 * Math.min(1, c.ap / 7) : 0);
}
function drawPaper(t) {
  const c = paperCam(t);
  camP.position.copy(c.p); camP.up.set(0, 1, 0); camP.lookAt(c.l); camP.updateMatrixWorld();
  updatePaper(t, c.c2);
  // foco no lápis, suavizado para não pular quando ele troca de traço
  let f = 0; const dir = c.l.clone().sub(c.p).normalize();
  for (let k = -3; k <= 3; k++) { const q = penAt(t + k * .09, c.c2); f += V(q.x - 800, 800 - q.y, 0).sub(c.p).dot(dir); }
  renderer.setRenderTarget(rtPaper); renderer.setClearColor(0xfaf9f5, 1); renderer.clear(); renderer.render(paper, camP);
  pass(packMat, rtComp);
  finish(rtP, f / 7, c.ap, .12 * c.ap / 78);
}
function renderAt(t, o = {}) {
  t = Math.max(0, Math.min(DUR, t));
  const doP = !o.world && t < WIPE1, doW = o.world || t >= WIPE0;
  if (doP) drawPaper(t);
  if (doW) drawWorld(t, o);
  waveMat.uniforms.uT.value = t; waveMat.uniforms.uMode.value = !doW ? 0 : !doP ? 2 : 1;
  pass(waveMat, null);
}

// momentos-chave para os cards
const KEYS = [
  { id: '01-heroi-no-papel', t: 1.4 }, { id: '02-casco', t: 4.4 }, { id: '03-balao', t: 8.4 }, { id: '04-torre', t: 12.6 }, { id: '05-ilha', t: 15.2 },
  { id: '06-acampamento-no-papel', t: 18.9 }, { id: '07-desenho-inteiro', t: 20.7 }, { id: '08-onda-de-cor', t: 21.6 }, { id: '09-pintura-de-frente', t: 22.3 },
  { id: '10-revelacao', t: 25.6 }, { id: '11-do-alto', t: 28.2 }, { id: '12-sob-a-ilha', t: 31.7 }, { id: '13-acampamento', t: 35.2 }, { id: '14-heroi', t: 38.8 }, { id: '15-volta', t: 42.2 }, { id: '16-final', t: 45.8 },
];
window.DURATION = DUR; window.KEYS = KEYS; window.SHOTS = SHOTS.map(s => ({ id: s.id, t0: s.t0, t1: s.t1 }));
window.renderAt = renderAt; window.renderKey = i => renderAt(KEYS[i].t);
window.gpuInfo = (() => { const gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'gpu?'; })();
renderAt(Number(qs.get('t') || 0), { world: qs.get('world') === '1', front: qs.get('front') === '1' });
window.ready = true;
