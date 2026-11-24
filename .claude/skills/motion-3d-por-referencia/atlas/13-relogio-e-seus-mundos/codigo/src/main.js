// relogio-mundos: um relógio se monta girando, encara a câmera e explode no mundo de coisas daquela cor;
// as coisas se recolhem e viram o próximo relógio. Três cores, 4 s cada, em laço (12 s, 1920×1080).
// Tudo é função do tempo: renderAt(t) recalcula a cena inteira, então qualquer quadro sai sozinho.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { PI, TAU, deg, clamp, lerp, span, smooth, easeOut, easeIn, easeInOut, mulberry32, std, sph } from './util.js';
import { VARIANTS, buildWatch } from './relogio.js';
import { buildWorlds } from './objetos.js';
import { buildRoom, PALETTES } from './cenario.js';

const VW = 1920, VH = 1080, FPS = 30, CYCLE = 4, DURATION = 12;
// subquadros por quadro (parado, rápido, entrada do aro) e fração do quadro em que o obturador fica aberto
const SUB = 12, SUB_FAST = 44, SUB_IN = 96, SHUTTER = 0.5;
for (const w of [500, 600, 700, 800, 900]) await document.fonts.load(`${w} 40px Inter`);

// ---------------------------------------------------------------- renderer e alvos
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(VW, VH, false);
renderer.autoClear = false;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;     // a sombra é refeita uma vez por subquadro, não a cada passe
document.getElementById('palco').prepend(renderer.domElement);

const RT = (w, h, o = {}) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, ...o });
const HW = VW / 2, HH = VH / 2;
const rtBg = RT(HW, HH, { samples: 4, depthBuffer: true }), rtBgA = RT(HW, HH), rtBgB = RT(HW, HH);
const rtMid = RT(VW, VH, { samples: 4, depthBuffer: true });
const rtSoft = RT(HW, HH, { samples: 4, depthBuffer: true }), rtSoftA = RT(HW, HH), rtBack = RT(HW, HH), rtFront = RT(HW, HH);
const rtNear = RT(HW, HH, { samples: 4, depthBuffer: true }), rtNearA = RT(VW / 4, VH / 4), rtNearB = RT(VW / 4, VH / 4);
const rtAcc = RT(VW, VH, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const flat = { depthTest: false, depthWrite: false };
const blurMat = new THREE.ShaderMaterial({
  ...flat, uniforms: { tMap: { value: null }, dir: { value: new THREE.Vector2() }, sigma: { value: 6 } }, vertexShader: VS,
  fragmentShader: /* glsl */`
    uniform sampler2D tMap; uniform vec2 dir; uniform float sigma; varying vec2 vUv;
    void main(){
      vec4 s = vec4(0.0); float ws = 0.0;
      for (int i = -16; i <= 16; i++) { float x = float(i); float w = exp(-0.5 * x * x / (sigma * sigma)); s += texture2D(tMap, vUv + dir * x) * w; ws += w; }
      gl_FragColor = s / ws;
    }`,
});
// junta as camadas de trás para a frente e SOMA no acumulador:
// fundo (desfocado) · objetos de trás (pouco desfocados) · meio nítido com oclusão · objetos da frente · bolas rente à lente
const compMat = new THREE.ShaderMaterial({
  ...flat, transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
  uniforms: { tBg: { value: rtBgB.texture }, tBack: { value: rtBack.texture }, tMid: { value: rtMid.texture }, tAO: { value: null },
    tFront: { value: rtFront.texture }, tNear: { value: rtNearB.texture }, weight: { value: 1 }, ao: { value: 1 } },
  vertexShader: VS,
  fragmentShader: /* glsl */`
    uniform sampler2D tBg; uniform sampler2D tBack; uniform sampler2D tMid; uniform sampler2D tAO; uniform sampler2D tFront; uniform sampler2D tNear;
    uniform float weight; uniform float ao; varying vec2 vUv;
    vec3 over(vec3 c, vec4 l){ return c * (1.0 - clamp(l.a, 0.0, 1.0)) + l.rgb; }
    void main(){
      vec3 c = texture2D(tBg, vUv).rgb;
      c = over(c, texture2D(tBack, vUv));
      vec4 m = texture2D(tMid, vUv); m.rgb *= mix(1.0, texture2D(tAO, vUv).r, ao);
      c = over(c, m);
      c = over(c, texture2D(tFront, vUv));
      c = over(c, texture2D(tNear, vUv));
      gl_FragColor = vec4(c * weight, 1.0);
    }`,
});
// saída: ombro suave só nos brilhos (pastel fica como foi escolhido), sRGB e um grão fino contra faixas
const outMat = new THREE.ShaderMaterial({
  ...flat, uniforms: { tAcc: { value: rtAcc.texture }, exposure: { value: 1.0 }, seed: { value: 0 } }, vertexShader: VS,
  fragmentShader: /* glsl */`
    uniform sampler2D tAcc; uniform float exposure; uniform float seed; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 c = max(texture2D(tAcc, vUv).rgb * exposure, 0.0);
      const float K = 0.8;
      c = mix(c, K + (1.0 - K) * tanh((c - K) / (1.0 - K)), step(K, c));
      c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
      c += (hash(gl_FragCoord.xy + seed) - 0.5) * (1.5 / 255.0);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
});
const blurQuad = new FullScreenQuad(blurMat), compQuad = new FullScreenQuad(compMat), outQuad = new FullScreenQuad(outMat);
function blur(src, tmp, dst, stepPx, sigma) {
  blurMat.uniforms.sigma.value = sigma;
  blurMat.uniforms.tMap.value = src; blurMat.uniforms.dir.value.set(stepPx / tmp.width, 0); renderer.setRenderTarget(tmp); blurQuad.render(renderer);
  blurMat.uniforms.tMap.value = tmp.texture; blurMat.uniforms.dir.value.set(0, stepPx / dst.height); renderer.setRenderTarget(dst); blurQuad.render(renderer);
}

// ---------------------------------------------------------------- cenas, luz e ambiente
const room = buildRoom();
const mid = new THREE.Scene(), back = new THREE.Scene(), front = new THREE.Scene(), near = new THREE.Scene();
const lit = [mid, back, front, near];
const camera = new THREE.PerspectiveCamera(28, VW / VH, 0.5, 200);

// estúdio: é o que o aço reflete. Fundo de cinza médio a escuro (no tom do mundo), um painel grande de luz
// à frente no alto à esquerda, uma faixa atrás à direita e panos pretos: sem escuro para refletir, aço vira plástico.
const pmrem = new THREE.PMREMGenerator(renderer);
function studioEnv(p) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { hi: { value: new THREE.Color(p.sky).multiplyScalar(0.9) }, md: { value: new THREE.Color(p.bot).multiplyScalar(0.42) }, lo: { value: new THREE.Color(p.bot).multiplyScalar(0.14) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 hi; uniform vec3 md; uniform vec3 lo; varying vec3 vP; void main(){ vec3 c = vP.y > 0.0 ? mix(md, hi, smoothstep(0.05, 0.75, vP.y)) : mix(md, lo, smoothstep(0.0, 0.6, -vP.y)); gl_FragColor = vec4(c, 1.0); }',
  })));
  const panel = (w, h, color, k, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(40, 30, '#ffffff', 4.2, [-28, 22, 38]);     // chave: à frente, no alto, à esquerda
  panel(8, 44, '#ffffff', 5.0, [42, 8, -14]);       // recorte atrás à direita
  panel(50, 50, '#ffffff', 1.6, [0, 54, 0]);        // teto
  panel(26, 7, '#ffffff', 2.2, [14, -5, 48]);       // régua baixa à frente: dá leitura à serrilha
  panel(30, 50, '#0c0e11', 1, [-48, -4, -2]);
  panel(46, 20, '#0d0f12', 1, [24, -34, 30]);
  panel(16, 40, '#0c0e11', 1, [34, 6, 40]);
  panel(36, 14, '#0e1013', 1, [-10, 32, -46]);
  return pmrem.fromScene(s, 0.03).texture;
}
const envs = PALETTES.map(studioEnv);
for (const s of lit) s.environmentIntensity = 0.8;

// luz com direção: chave forte de cima e da esquerda, pouco preenchimento, recorte por trás
function addLights(scene, shadows) {
  const hemi = new THREE.HemisphereLight('#ffffff', '#dddddd', 0.5);
  const key = new THREE.DirectionalLight('#fff3e2', 2.7); key.position.set(-6, 8, 9);
  const rim = new THREE.DirectionalLight('#ffffff', 1.1); rim.position.set(6, 4, -6);
  if (shadows) {
    key.castShadow = true; key.shadow.mapSize.set(4096, 4096);
    Object.assign(key.shadow.camera, { left: -8, right: 8, top: 5.5, bottom: -5.5, near: 2, far: 34 });
    key.shadow.bias = -0.0006; key.shadow.normalBias = 0.03; key.shadow.radius = 6;
  }
  scene.add(hemi, key, rim);
  return hemi;
}
const hemis = lit.map((s, i) => addLights(s, i === 0));

// oclusão de ambiente no meio: a sombra macia nas frestas, que tira a cara de ícone chapado
const R0 = Math.random; Math.random = mulberry32(7);    // o ruído do passe usa Math.random: fixo, para o render repetir
const gtao = new GTAOPass(mid, camera, HW, HH, undefined,
  { radius: 0.5, distanceExponent: 1.3, thickness: 1.2, scale: 1.35, samples: 16, distanceFallOff: 1, screenSpaceRadius: false },
  { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, radiusExponent: 1.2, rings: 2, samples: 16 });
Math.random = R0;
gtao.output = GTAOPass.OUTPUT.Off;
compMat.uniforms.tAO.value = gtao.gtaoMap;

// ---------------------------------------------------------------- elenco
const watches = VARIANTS.map(v => { const w = buildWatch(v); w.root.rotation.order = 'YXZ'; mid.add(w.root); mid.add(w.bezel); return w; });

const rnd = mulberry32(2026);
const bandOf = it => it.p[2] < -0.9 ? 0 : it.p[2] > 1.25 ? 2 : 1;       // 0 = trás, 1 = meio, 2 = frente
const worlds = buildWorlds().map(w => {
  const clusters = [back, mid, front].map(s => { const g = new THREE.Group(); s.add(g); return g; });
  for (const it of w.items) {
    clusters[bandOf(it)].add(it.o);
    if (!it.small) it.s *= 1.08;
    it.q = new THREE.Quaternion().setFromEuler(new THREE.Euler(it.r[0], it.r[1], it.r[2]));
    it.axis = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    it.ph = [rnd() * TAU, rnd() * TAU, rnd() * TAU];
    it.delay = rnd() * 0.07;
    const sg = () => (rnd() < 0.5 ? -1 : 1);
    it.spin = sg() * (it.card ? 1.2 : it.small ? 5.5 : 2.6 + rnd() * 1.6);      // giro que se desfaz na explosão
    it.w = (rnd() - 0.5) * (it.card ? 0 : it.small ? 0.9 : 0.22);                 // giro lento enquanto flutua
    it.spin2 = sg() * (it.card ? 1.4 : 2.8 + rnd() * 2.2);                        // giro ao recolher
  }
  clusters[1].add(w.cord);
  const balls = w.balls.map((c, i) => { const b = new THREE.Mesh(sph(i ? 0.4 : 0.6, 48, 32), std(c, { roughness: 0.42 })); near.add(b); return b; });
  return { ...w, clusters, balls };
});

// ---------------------------------------------------------------- linha do tempo (u = tempo dentro do ciclo de 4 s)
const spring = t => t <= 0 ? 0 : 1 - Math.exp(-7.5 * t) * (Math.cos(11 * t) + 0.68 * Math.sin(11 * t));
const backOut = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), sp = new THREE.Vector3(), sq = new THREE.Quaternion(), ss = new THREE.Vector3(), st0 = new THREE.Vector3();
const ca = new THREE.Color(), cb = new THREE.Color();
const T_OUT = 1.88, T_GONE = 2.12, T_BURST = 2.04, T_BACK = 3.56;
let hasWorld = false;

function setState(time) {
  const t = ((time % DURATION) + DURATION) % DURATION;
  const k = Math.floor(t / CYCLE) % 3, u = t - k * CYCLE, prev = (k + 2) % 3;

  // o cenário troca de cor enquanto o relógio assenta
  const pk = smooth(span(u, 0.72, 1.6));
  room.setPalette(PALETTES[prev], PALETTES[k], pk);
  for (const h of hemis) {
    h.color.copy(ca.set(PALETTES[prev].sky).lerp(cb.set(PALETTES[k].sky), pk));
    h.groundColor.copy(ca.set(PALETTES[prev].ground).lerp(cb.set(PALETTES[k].ground), pk));
  }
  for (const s of lit) s.environment = envs[k];

  // câmera: aproxima no relógio, recua de uma vez na explosão e volta ao recolher
  const push = easeInOut(span(u, 0.62, 1.8));
  const ret = easeInOut(span(u, T_BACK, 4.0));
  const B = u < T_BACK ? easeOut(span(u, 1.9, T_BACK), 5) : 1 - ret;
  const dist = u < 1.9 ? lerp(14.2, 9.0, push) : u < T_BACK ? lerp(9.0, 15.0, B) : lerp(15.0, 14.2, ret);
  camera.position.set(0.22 * Math.sin(TAU * t / DURATION), lerp(0.12, 0.7, B), dist);
  camera.lookAt(0, lerp(0.1, -0.3, B), 0);
  camera.updateMatrixWorld();

  // ---- relógio
  watches.forEach((w, i) => { const on = i === k && u < T_GONE; w.root.visible = on; w.bezel.visible = on && u >= 0.1; });
  if (u < T_GONE) {
    const W = watches[k];
    const sIn = easeOut(span(u, 0, 0.62), 3), st = easeInOut(span(u, 0.68, 1.62)), out = easeIn(span(u, T_OUT, T_GONE), 2.3);
    // para de frente mas não chapado: 13° de guinada mostram a lateral da caixa e a coroa
    const yaw = lerp(lerp(-155, -34, sIn), -13, st) + 4 * span(u, 1.6, 1.9) + 250 * out;
    const pitch = lerp(-16, -5, st), roll = lerp(-9, 1.5, st) - 5 * (1 - sIn);
    let sc = lerp(lerp(0.3, 0.86, easeOut(span(u, 0, 0.42), 2.4)), 1, st);
    const click = span(u, 0.62, 0.86); sc *= 1 + 0.05 * Math.sin(click * PI) * (1 - click);
    sc *= lerp(1, 0.1, out);
    W.root.position.set(lerp(lerp(-1.5, -0.45, sIn), 0, st), lerp(lerp(-0.25, 0.2, sIn), 0.12, st), 0);
    W.root.rotation.set(deg(pitch), deg(yaw), deg(roll));
    W.root.scale.setScalar(sc);
    W.setTime(t);
    W.setGlare((yaw + 46) / 46);
    W.root.updateMatrixWorld(true);
    // o aro chega voando da esquerda e encaixa
    W.root.matrixWorld.decompose(sp, sq, ss);
    const e = easeOut(span(u, 0.1, 0.62), 2.4), f = 1 - e;
    st0.set(sp.x - 6.4, sp.y + 0.9, 2.2);
    W.bezel.position.lerpVectors(st0, sp, e); W.bezel.position.y += 0.6 * Math.sin(PI * e) * f;
    // viaja de frente para a câmera (lê como aro, não como risco) e só no fim alinha com a caixa
    W.bezel.quaternion.setFromEuler(_e.set(0.3, 0.5, 0.6)).slerp(sq, easeInOut(span(u, 0.16, 0.62)));
    W.bezel.scale.copy(ss);
  }

  // ---- mundo de objetos
  const tb = u - T_BURST, x = span(u, T_BACK, 4.0);
  hasWorld = tb > 0;
  worlds.forEach((w, i) => { w.clusters.forEach(c => { c.visible = i === k && tb > 0; }); w.balls.forEach(b => { b.visible = i === k && tb > 0.02; }); });
  if (tb > 0) {
    const WD = worlds[k];
    const col = (1 - easeIn(x, 2.6)) + 0.05 * Math.sin(PI * span(x, 0, 0.4)) * (1 - x);   // recolhe (com um respiro antes)
    const colS = lerp(1, 0.2, easeIn(x, 3));
    const drift = 1 + 0.03 * clamp(u - 2.5, 0, 1);
    // o conjunto nasce onde o relógio estava e, ao recolher, vai para onde o próximo relógio entra (sem salto na emenda)
    const born = easeOut(span(u, T_BURST, 2.5), 3), home = easeIn(x, 2.2);
    const cx = lerp(lerp(0, 0.2, born), -1.5, home), cy = lerp(lerp(0.12, 0.0, born), -0.25, home);
    const cyaw = deg(-95 * (1 - easeOut(span(u, T_BURST, 2.8), 3)) + 5 * tb + 175 * easeIn(x, 2.4));
    for (const c of WD.clusters) { c.position.set(cx, cy, 0); c.rotation.y = cyaw; }
    for (const it of WD.items) {
      const tau = tb - it.delay;
      if (tau <= 0) { it.o.visible = false; continue; }
      it.o.visible = true;
      const s = spring(tau) * drift * col, fl = clamp(tau * 2) * col;
      it.o.position.set(
        it.p[0] * s + fl * 0.06 * Math.sin(u * 1.3 + it.ph[0]),
        it.p[1] * s + fl * 0.08 * Math.sin(u * 1.1 + it.ph[1]),
        it.p[2] * s + fl * 0.05 * Math.sin(u * 0.9 + it.ph[2]));
      it.o.scale.setScalar(Math.max(0.001, it.s * backOut(span(tau, 0, 0.3)) * colS));
      const ang = it.spin * (1 - easeOut(span(tau, 0, 0.75), 3)) + it.w * tau + it.spin2 * easeIn(x, 2.5) + 0.07 * Math.sin(u * 0.8 + it.ph[1]);
      it.o.quaternion.copy(it.q).multiply(_q.setFromAxisAngle(it.axis, ang));
    }
    WD.cord.scale.setScalar(Math.max(0.001, spring(tb) * drift * col));
    // bolas que passam rente à lente
    const tn = tb - 0.02, e1 = 1 - Math.exp(-3.2 * tn), gone = 1 - easeIn(span(x, 0, 0.5), 2);
    WD.balls[0].position.set(0.5 + 3.2 * e1 + 0.5 * tn, -0.2 + 2.0 * e1 - 1.9 * tn * tn, 2 + 5.2 * e1);
    WD.balls[1].position.set(-0.4 - 3.7 * e1 - 0.6 * tn, 0.3 + 2.2 * e1 - 0.5 * tn * tn, 1 + 4.0 * e1);
    WD.balls.forEach(b => b.scale.setScalar(Math.max(0.001, easeOut(span(tn, 0, 0.2)) * gone)));
  }
}

// ---------------------------------------------------------------- um quadro = fundo + K subquadros somados (desfoque de movimento de verdade)
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
// nos trechos rápidos o quadro leva mais subquadros, para o borrão não virar hachura
const subFor = t => { const u = (((t % CYCLE) + CYCLE) % CYCLE); return u < 0.55 ? SUB_IN : (u < 0.8 || (u > 1.84 && u < 2.8) || u > 3.5) ? SUB_FAST : SUB; };
function layer(scene, target) { renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, camera); }
function drawFrame(t, K = subFor(t)) {
  setState(t); camera.clearViewOffset();
  renderer.setClearColor(0x000000, 1);
  renderer.shadowMap.needsUpdate = true;
  layer(room.scene, rtBg);
  blur(rtBg.texture, rtBgA, rtBgB, 1.3, 6);
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(rtAcc); renderer.clear();
  compMat.uniforms.weight.value = 1 / K;
  for (let i = 0; i < K; i++) {
    setState(t + ((i + 0.5) / K - 0.5) * SHUTTER / FPS);
    camera.setViewOffset(VW, VH, halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5, VW, VH);
    renderer.shadowMap.needsUpdate = true;
    layer(mid, rtMid);
    gtao.render(renderer, null, null);
    if (hasWorld) {
      layer(back, rtSoft); blur(rtSoft.texture, rtSoftA, rtBack, 1.0, 2.4);
      layer(front, rtSoft); blur(rtSoft.texture, rtSoftA, rtFront, 1.0, 3.4);
      layer(near, rtNear); blur(rtNear.texture, rtNearA, rtNearB, 1.4, 5);
    } else {
      for (const r of [rtBack, rtFront, rtNearB]) { renderer.setRenderTarget(r); renderer.clear(); }
    }
    renderer.setRenderTarget(rtAcc); compQuad.render(renderer);
  }
  camera.clearViewOffset();
  outMat.uniforms.seed.value = Math.round(t * FPS) * 7.13;
  renderer.setRenderTarget(null); outQuad.render(renderer);
}

// ---------------------------------------------------------------- momentos-chave (cards) e API do render
const KEYS = [
  { id: '01-entrada', t: 0.26 }, { id: '02-encaixe', t: 0.56 }, { id: '03-verde-frente', t: 1.8 }, { id: '04-explosao', t: 2.2 },
  { id: '05-mundo-trilha', t: 3.0 }, { id: '06-amarelo-frente', t: 5.8 }, { id: '07-mundo-musica', t: 7.0 },
  { id: '08-violeta-frente', t: 9.8 }, { id: '09-mundo-sono', t: 11.0 }, { id: '10-recolhe', t: 11.78 },
];
window.KEYS = KEYS;
window.DURATION = DURATION;
window.renderKey = i => { drawFrame(KEYS[i].t, 64); return KEYS[i].id; };
window.renderAt = (t, K) => { drawFrame(t, K ?? subFor(t)); return t; };
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida';
const q = new URLSearchParams(location.search);
if (q.has('t')) window.renderAt(Number(q.get('t'))); else window.renderKey(Number(q.get('key') ?? 2));
window.ready = true;
