// Fone explodido: cena, linha do tempo, pós-processamento e rótulos.
// Tudo é função do tempo: renderAt(t) recalcula o quadro inteiro para o instante t.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { montarFone, PAL, AFASTA, SOBE_ARCO } from './fone.js';

const qs = new URLSearchParams(location.search);
const W = Number(qs.get('w') || 1920), H = Math.round(W * 9 / 16), S = W / 1920;
const SUB = qs.get('q') === 'rascunho' ? 6 : 24;
const FPS = 30, OBTURADOR = 0.5;
const DUR = 10;
const TINTA = '#123b42';
const FONTE = '"Avenir Next", "Helvetica Neue", Arial, sans-serif';

// ---------- linha do tempo ----------
const T = { titulo: 0.25, abre: 1.5, rotulos: 3.25, passo: 0.3, fecha: 6.7, frase: 8.35, som: 8.5 };
const cl = (x, a = 0, b = 1) => Math.min(Math.max(x, a), b);
const ss = (x, a, b) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const outBack = (t, c = 1.2) => { t = cl(t); const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
const outCubic = t => 1 - Math.pow(1 - cl(t), 3);
const inOut = t => { t = cl(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const ORDEM = ['almofada', 'tela', 'driver', 'miolo', 'concha'];
function abertura(k, t) {
  const abre = outBack((t - T.abre - (4 - k) * 0.11) / 1.2, 1.15);
  const fecha = inOut((t - T.fecha - k * 0.07) / 1.05);
  return abre * (1 - fecha);
}
const aberto = t => ss(t, T.abre - 0.15, T.abre + 0.95) * (1 - ss(t, T.fecha + 0.1, T.fecha + 1.5));

// ---------- cena ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;
renderer.domElement.style.display = 'none';
document.body.appendChild(renderer.domElement);
const tela2d = document.createElement('canvas'); tela2d.width = W; tela2d.height = H;
document.body.appendChild(tela2d);
const ctx = tela2d.getContext('2d');

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
scene.environmentIntensity = 0.95;

function fundo() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 576;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(512, 300, 0, 512, 300, 720);
  g.addColorStop(0, '#fcecdf'); g.addColorStop(0.5, '#f6dac9'); g.addColorStop(1, '#ecc0ad');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 576);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
scene.background = fundo();

const CHAO = -1.2;
const chao = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ color: '#7a2f24', opacity: 0.3 }));
chao.rotation.x = -Math.PI / 2; chao.position.y = CHAO; chao.receiveShadow = true; scene.add(chao);

const LUZ = new THREE.Vector3(-3.2, 9, 4.2);
const chave = new THREE.DirectionalLight('#fff0df', 3.0);
chave.castShadow = true; chave.shadow.mapSize.set(4096, 4096);
Object.assign(chave.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 24 });
chave.shadow.bias = -0.0004; chave.shadow.normalBias = 0.012; chave.shadow.radius = 2;
scene.add(chave, chave.target);
const contra = new THREE.DirectionalLight('#d6ecff', 1.6); contra.position.set(5, 3.5, -6); scene.add(contra);
const baixo = new THREE.DirectionalLight('#ffd9c4', 0.5); baixo.position.set(1, -4, 3); scene.add(baixo);

const F = montarFone();
const palco = new THREE.Group(); palco.add(F.fone); scene.add(palco);

// ondas de som do final
const ondas = [];
for (const lado of [-1, 1]) for (let i = 0; i < 3; i++) {
  const g = new THREE.TorusGeometry(0.4, 0.008, 8, 128); g.rotateY(Math.PI / 2); g.scale(1, 1.16, 1);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: PAL.coral, transparent: true, opacity: 0, depthWrite: false }));
  F.fone.add(m); ondas.push({ m, lado, i });
}

const camera = new THREE.PerspectiveCamera(24, W / H, 0.5, 80);
const alvo = new THREE.Vector3();

function estado(t) {
  for (const c of [F.esq, F.dir]) ORDEM.forEach((k, i) => { c.pecas[k].position.y = AFASTA[k] * abertura(i, t); });
  F.arco.position.y = SOBE_ARCO * abertura(4, t);
  // flutua, respira e dá o "clique" quando fecha
  const clique = t > T.fecha + 1.32 ? Math.exp(-(t - T.fecha - 1.32) * 9) * Math.sin((t - T.fecha - 1.32) * 38) * 0.02 : 0;
  const grave = t > T.som ? Math.exp(-(t - T.som) * 6) * Math.sin((t - T.som) * 30) * 0.018 : 0;
  F.fone.position.y = 0.045 * Math.sin(t * 1.25) ;
  F.fone.rotation.set(-0.05 + 0.012 * Math.sin(t * 0.9 + 1), 0, 0.014 * Math.sin(t * 1.1));
  F.fone.scale.setScalar(1 + clique + grave);
  for (const o of ondas) {
    const p = cl((t - T.som - o.i * 0.13) / 0.75);
    o.m.position.x = o.lado * (1.0 + outCubic(p) * 0.42);
    o.m.scale.setScalar(0.6 + outCubic(p) * 0.4);
    o.m.material.opacity = p > 0 && p < 1 ? Math.sin(p * Math.PI) ** 1.5 * 0.6 : 0;
    o.m.visible = o.m.material.opacity > 0;
  }
  // câmera: órbita lenta, recua quando abre, aproxima no fim
  const ab = aberto(t);
  const az = THREE.MathUtils.degToRad(mix(37, 23, t / DUR)), el = THREE.MathUtils.degToRad(mix(13, 10, ab));
  const d = 8.3 + 3.9 * ab - 0.55 * ss(t, 8.0, DUR) - 0.25 * ss(t, 0, 1.5);
  const fim = ss(t, T.fecha + 0.2, T.fecha + 1.6);
  alvo.set(-0.8 * (1 - ss(t, 1.3, 2.3)) + 0.2 * ab + 0.5 * fim, 0.56 + 0.3 * ab - 0.16 * fim, 0);
  camera.position.set(alvo.x + d * Math.sin(az) * Math.cos(el), alvo.y + d * Math.sin(el), alvo.z + d * Math.cos(az) * Math.cos(el));
  camera.lookAt(alvo);
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
}

// ---------- pós-processamento: subquadros acumulados + tom + vinheta ----------
const rtCena = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtSoma = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, depthBuffer: false });
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
const camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const mSoma = new THREE.ShaderMaterial({
  uniforms: { tx: { value: rtCena.texture }, peso: { value: 1 } }, vertexShader: VS,
  fragmentShader: 'uniform sampler2D tx; uniform float peso; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tx, vUv).rgb * peso, 1.0); }',
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthTest: false, depthWrite: false,
});
const mFinal = new THREE.ShaderMaterial({
  uniforms: { tx: { value: rtSoma.texture }, semente: { value: 0 }, expo: { value: 1.0 } }, vertexShader: VS, depthTest: false, depthWrite: false,
  fragmentShader: `
    uniform sampler2D tx; uniform float semente; uniform float expo; varying vec2 vUv;
    vec3 neutro(vec3 c){
      float x = min(c.r, min(c.g, c.b)); float o = x < 0.08 ? x - 6.25 * x * x : 0.04; c -= o;
      float p = max(c.r, max(c.g, c.b)); if (p < 0.76) return c;
      float d = 0.24; float np = 1.0 - d * d / (p + d - 0.76); c *= np / p;
      float g = 1.0 - 1.0 / (0.15 * (p - np) + 1.0); return mix(c, vec3(np), g);
    }
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + semente) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tx, vUv).rgb * expo;
      c = neutro(c);
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.18);
      vec2 q = vUv - 0.5; q.x *= 1.25;
      c *= 1.0 - 0.16 * smoothstep(0.4, 0.95, length(q));
      c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
      c += (h(gl_FragCoord.xy) - 0.5) * 0.012;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
const cenaQuad = new THREE.Scene(); cenaQuad.add(quad);
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

// ---------- rótulos (2D por cima do quadro) ----------
const v3 = new THREE.Vector3();
function naTela(obj, local) {
  v3.set(...local); obj.localToWorld(v3); v3.project(camera);
  return { x: (v3.x * 0.5 + 0.5) * W, y: (-v3.y * 0.5 + 0.5) * H };
}
// ancora: ponto local na peça · abre/fecha: deslocamento do disco (px a 1920) nas duas vistas
const ROTULOS = [
  { n: 1, nome: 'ALMOFADA', sub: 'espuma com memória', peca: () => F.esq.pecas.almofada, p: [-0.36, -0.3, 0.14], pf: [0.3, -0.3, 0.2], abre: [45, 190], fecha: [400, 470], lado: 1, ladoF: -1 },
  { n: 2, nome: 'TELA', sub: 'proteção acústica', peca: () => F.esq.pecas.tela, p: [0.26, -0.1, 0.06], pf: [0, -0.13, 0], abre: [-20, -215], fecha: [400, 600], lado: -1 },
  { n: 3, nome: 'DRIVER', sub: 'alto-falante de 40 mm', peca: () => F.esq.pecas.driver, p: [-0.16, -0.06, 0.1], pf: [-0.27, -0.05, 0.31], abre: [-35, 215], fecha: [400, 730], lado: -1 },
  { n: 4, nome: 'BATERIA', sub: '30 horas de carga', peca: () => F.esq.pecas.miolo, p: [0.2, 0.07, 0.12], pf: [-0.4, 0.06, 0.2], abre: [-55, -190], fecha: [400, 860], lado: -1 },
  { n: 5, nome: 'PLACA', sub: 'bluetooth e cancelamento', peca: () => F.dir.pecas.miolo, p: [0.2, 0.11, 0.16], pf: [0.3, 0.13, 0.26], abre: [20, 185], fecha: [1290, 790], lado: 1 },
  { n: 6, nome: 'CONCHA', sub: 'alumínio anodizado', peca: () => F.dir.pecas.concha, p: [-0.28, 0.16, 0.22], pf: [-0.1, 0.17, 0.33], abre: [70, -235], fecha: [1345, 590], lado: 1 },
  { n: 7, nome: 'ARCO', sub: 'aço e couro', peca: () => F.arco, p: [0.42, 1.52, 0.1], pf: [0.42, 1.52, 0.1], abre: [215, -70], fecha: [1190, 160], lado: 1 },
];
ROTULOS.forEach((r, i) => { r.t0 = T.rotulos + i * T.passo; });

function texto(str, x, y, { peso = 800, tam = 30, esp = 2, cor = TINTA, alinha = 'left', alfa = 1 } = {}) {
  ctx.font = `${peso} ${tam * S}px ${FONTE}`; ctx.letterSpacing = `${esp * S}px`;
  ctx.textAlign = alinha; ctx.textBaseline = 'middle'; ctx.fillStyle = cor; ctx.globalAlpha = alfa;
  ctx.fillText(str, alinha === 'right' ? x + esp * S : x, y); ctx.globalAlpha = 1;
}

function desenharRotulos(t) {
  const fech = ss(t, T.fecha, T.fecha + 1.5);
  for (const r of ROTULOS) {
    const p = cl((t - r.t0) / 0.6); if (p <= 0) continue;
    const a = naTela(r.peca(), r.p.map((v, i) => mix(v, r.pf[i], fech)));
    const D = { x: mix(a.x + r.abre[0] * S, r.fecha[0] * S, fech), y: mix(a.y + r.abre[1] * S, r.fecha[1] * S, fech) }, R = 19 * S;
    const dx = D.x - a.x, dy = D.y - a.y;
    const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const pl = outCubic(p / 0.55), fimL = Math.max(len - R, 0) * pl;
    ctx.strokeStyle = TINTA; ctx.lineWidth = 2.2 * S; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + ux * fimL, a.y + uy * fimL); ctx.stroke();
    const pa = outBack(p / 0.3, 2);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(a.x, a.y, 6.5 * S * pa, 0, 6.2832); ctx.fill();
    ctx.fillStyle = TINTA; ctx.beginPath(); ctx.arc(a.x, a.y, 3.6 * S * pa, 0, 6.2832); ctx.fill();
    const pd = outBack((p - 0.35) / 0.45, 1.8);
    if (pd > 0) {
      ctx.fillStyle = PAL.coral; ctx.beginPath(); ctx.arc(D.x, D.y, R * pd, 0, 6.2832); ctx.fill();
      texto(String(r.n), D.x, D.y + 1.5 * S, { peso: 800, tam: 21 * pd, esp: 0, cor: '#fff', alinha: 'center' });
    }
    const pt = outCubic((p - 0.5) / 0.5);
    if (pt > 0) {
      const lado = r.ladoF && fech > 0.5 ? r.ladoF : r.lado, troca = r.ladoF ? Math.abs(fech - 0.5) * 2 : 1;
      const tx = D.x + lado * (R + 13 * S) + lado * (1 - pt) * -14 * S;
      const al = lado > 0 ? 'left' : 'right';
      texto(r.nome, tx, D.y - 7 * S, { peso: 800, tam: 29, esp: 3.2, alinha: al, alfa: pt * ss(troca, 0, 0.5) });
      texto(r.sub, tx, D.y + 20 * S, { peso: 500, tam: 17.5, esp: 0.4, alinha: al, alfa: pt * 0.72 * ss(troca, 0, 0.5) });
    }
  }
}

function desenharTitulo(t) {
  const a = ss(t, T.titulo, T.titulo + 0.6) * (1 - ss(t, T.abre - 0.05, T.abre + 0.45));
  if (a > 0) {
    const sobe = (1 - outCubic((t - T.titulo) / 0.7)) * 22 * S, x = 112 * S, y = 150 * S + sobe;
    ctx.globalAlpha = a; ctx.fillStyle = PAL.coral; ctx.fillRect(x, y - 2 * S, 38 * S, 4 * S); ctx.globalAlpha = 1;
    texto('O QUE TEM DENTRO', x + 54 * S, y, { peso: 700, tam: 21, esp: 6, alfa: a * 0.85 });
    texto('DE UM FONE DE OUVIDO', x - 3 * S, y + 56 * S, { peso: 800, tam: 60, esp: 0.5, alfa: a });
  }
  const b1 = outCubic((t - T.frase) / 0.6), b2 = outCubic((t - T.frase - 0.22) / 0.6);
  const x = W - 112 * S, y = H - 196 * S;
  if (b1 > 0) texto('SETE PEÇAS', x, y + (1 - b1) * 20 * S, { peso: 800, tam: 62, esp: 0.5, alinha: 'right', alfa: b1 });
  if (b2 > 0) texto('UM SOM', x, y + 70 * S + (1 - b2) * 20 * S, { peso: 800, tam: 62, esp: 0.5, cor: PAL.coral, alinha: 'right', alfa: b2 });
}

// ---------- render ----------
function renderAt(t) {
  renderer.setRenderTarget(rtSoma); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let i = 0; i < SUB; i++) {
    const ts = t + ((i + 0.5) / SUB - 0.5) * OBTURADOR / FPS;
    estado(ts);
    camera.setViewOffset(W, H, halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5, W, H);
    // luz de área: a chave sorteia um ponto num disco a cada subquadro (sombra macia)
    const ang = halton(i + 1, 5) * 6.2832, rr = Math.sqrt(halton(i + 1, 7)) * 1.9;
    chave.position.set(LUZ.x + Math.cos(ang) * rr, LUZ.y, LUZ.z + Math.sin(ang) * rr);
    chave.target.position.set(0, 0.4, 0); chave.target.updateMatrixWorld();
    renderer.setRenderTarget(rtCena); renderer.clear(); renderer.render(scene, camera);
    quad.material = mSoma; mSoma.uniforms.peso.value = 1 / SUB;
    renderer.setRenderTarget(rtSoma); renderer.render(cenaQuad, camQuad);
  }
  camera.clearViewOffset();
  quad.material = mFinal; mFinal.uniforms.semente.value = (Math.round(t * FPS) % 97) * 1.37;
  renderer.setRenderTarget(null); renderer.clear(); renderer.render(cenaQuad, camQuad);
  ctx.globalAlpha = 1; ctx.drawImage(renderer.domElement, 0, 0);
  estado(t);
  desenharRotulos(t); desenharTitulo(t);
}

window.renderAt = renderAt;
window.grab = q => tela2d.toDataURL('image/jpeg', q).split(',')[1];
window.DURATION = DUR;
window.KEYS = [
  { id: '01-montado', t: 1.1 }, { id: '02-abrindo', t: 2.05 }, { id: '03-explodido', t: 3.2 },
  { id: '04-rotulos', t: 6.2 }, { id: '05-fechando', t: 7.35 }, { id: '06-final', t: 9.6 },
];
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu?';
await document.fonts.load(`800 30px ${FONTE}`).catch(() => {});
renderAt(0);
window.ready = true;
