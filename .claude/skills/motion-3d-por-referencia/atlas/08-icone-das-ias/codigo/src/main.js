// icone-das-ias: um ícone de app de brinquedo que, a cada virada, vira o app de outra IA.
// As logos são as oficiais (arquivos SVG em ./logos), extrudadas sem redesenho. O resto é procedural.
// Da referência ("Hero Icon", #35 do 3D Style Atlas) vem o método (ver ../../METODO.md e ../../pericia-da-referencia.md).
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const VW = 1920, VH = 1080, FPS = 30, PI = Math.PI, TAU = PI * 2;
const V2 = THREE.Vector2, V3 = THREE.Vector3;

// ---------------------------------------------------------------- conteúdo (troque aqui para outro tema)
// Cada beat é uma face do ícone: a logo, a cor do ícone e a cor do estúdio. `at` é quando o ícone começa a
// virar para ela, `flip` é o eixo ('x' tomba como uma aba, 'y' gira como uma porta) e `turns` soma voltas inteiras.
// A última face é o fecho: ganha o letreiro em relevo na parede.
const BEATS = [
  { id: 'codex',    nome: 'Codex',       tile: '#f3f4f7', studio: '#c7b3ff' },
  { id: 'chatgpt',  nome: 'ChatGPT',     tile: '#131313', studio: '#93d6c0', at: 1.75, flip: 'x' },
  { id: 'gemini',   nome: 'Gemini',      tile: '#f3f4f7', studio: '#8cc0ff', at: 3.75, flip: 'y' },
  { id: 'groq',     nome: 'Groq',        tile: '#f55036', studio: '#ffa88f', at: 5.75, flip: 'x' },
  { id: 'deepseek', nome: 'DeepSeek',    tile: '#4d6bfe', studio: '#8496ff', at: 7.75, flip: 'y' },
  { id: 'claude',   nome: 'Claude Code', tile: '#d97757', studio: '#f0eee6', at: 9.75, flip: 'y', turns: 1 },
];
const LETREIRO = ['Claude', 'Code'];
const TINTA = '#191817';
const DURATION = 13.25;

// ---------------------------------------------------------------- contas
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = {
  lin: x => x,
  in: x => x * x,
  out: x => 1 - (1 - x) * (1 - x),
  inOut: x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
};
const seg = (t, a, b, e = ease.lin) => e(clamp((t - a) / (b - a)));
// resposta de uma mola amortecida: 0 -> 1, passa um pouco do alvo e volta
const spring = (s, hz, damp) => {
  if (s <= 0) return 0;
  const w = TAU * hz, wd = w * Math.sqrt(1 - damp * damp);
  return 1 - Math.exp(-damp * w * s) * (Math.cos(wd * s) + (damp * w / wd) * Math.sin(wd * s));
};
const pop = (s, hz = 3.2, damp = 0.55) => spring(s, hz, damp);
const quique = (u, amp, queda = 12, freq = 22) => (u <= 0 ? 0 : amp * Math.exp(-u * queda) * Math.abs(Math.sin(u * freq)));

// a virada é uma mola só; a volta a mais (turns) entra por cima dela
const flipAngle = (b, s) => PI * (spring(s, 1.45, 0.68) + 2 * (b.turns || 0) * seg(s, 0, 0.52, ease.inOut));
const landOf = b => { if (!b.at) return 0; let s = 0; const alvo = PI * (1 + 2 * (b.turns || 0)); while (flipAngle(b, s) < alvo && s < 2) s += 0.002; return b.at + s; };
const L = BEATS.map(landOf);          // instante em que cada face crava
const FIM = BEATS.length - 1;

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(VW, VH, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById('palco').prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(26, VW / VH, 2, 120);

// ---------------------------------------------------------------- peças grossas de quina arredondada
// Sombreamento: a tampa fica chapada e a quina arredondada emenda nela sem vinco.
// (O ExtrudeGeometry sozinho entrega a quina facetada, o que estraga o brilho do verniz.)
function alisar(geo, vincoGraus = 55) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const P = g.attributes.position.array, nF = P.length / 9;
  const FN = new Float32Array(nF * 3), tampa = new Int8Array(nF), leque = new Map();
  const chave = i => Math.round(P[i] * 5e3) + '_' + Math.round(P[i + 1] * 5e3) + '_' + Math.round(P[i + 2] * 5e3);
  const a = new V3(), b = new V3(), c = new V3();
  for (let f = 0; f < nF; f++) {
    a.fromArray(P, f * 9); b.fromArray(P, f * 9 + 3).sub(a); c.fromArray(P, f * 9 + 6).sub(a); b.cross(c); b.toArray(FN, f * 3); // comprimento = área
    const len = b.length(); if (len > 1e-14 && Math.abs(b.z) / len > 0.9995) tampa[f] = Math.sign(b.z);
    for (let v = 0; v < 3; v++) { const k = chave(f * 9 + v * 3); if (!leque.has(k)) leque.set(k, []); leque.get(k).push(f); }
  }
  const N = new Float32Array(P.length), cosV = Math.cos(vincoGraus * PI / 180);
  for (let f = 0; f < nF; f++) {
    a.fromArray(FN, f * 3); if (a.lengthSq() < 1e-28) a.set(0, 0, 1); a.normalize();
    for (let v = 0; v < 3; v++) {
      const o = f * 9 + v * 3;
      if (tampa[f]) { N[o] = 0; N[o + 1] = 0; N[o + 2] = tampa[f]; continue; }
      let naTampa = 0; c.set(0, 0, 0);
      for (const viz of leque.get(chave(o))) {
        b.fromArray(FN, viz * 3); const len = b.length(); if (len < 1e-14 || b.dot(a) / len < cosV) continue;
        if (tampa[viz]) naTampa = tampa[viz]; else c.add(b);
      }
      if (naTampa) c.set(0, 0, naTampa); else if (c.lengthSq() < 1e-28) c.copy(a);
      c.normalize().toArray(N, o);
    }
  }
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.clearGroups();
  return g;
}
// peca(): um contorno plano vira uma peça grossa, com as quinas arredondadas e as costas em z = 0.
// O contorno fica do tamanho exato do desenho (a quina é cortada para dentro).
function peca(shapes, altura, quina = 0.04, o = {}) {
  quina = Math.min(quina, altura / 2 - 0.002);
  const g = new THREE.ExtrudeGeometry(shapes, { depth: altura - 2 * quina, bevelEnabled: true, bevelThickness: quina, bevelSize: quina, bevelOffset: -quina, bevelSegments: o.voltas || 5, curveSegments: o.curva || 20, steps: o.passos || 1 });
  g.translate(0, 0, quina);
  return alisar(g);
}
const squircle = (r, n = 5) => new THREE.Shape(Array.from({ length: 180 }, (_, i) => { const a = i / 180 * TAU, c = Math.cos(a), s = Math.sin(a); return new V2(r * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), r * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)); }));

// ---------------------------------------------------------------- logos: do SVG oficial para contornos
const limpar = pts => { // tira pontos repetidos (o SVG fecha o caminho repetindo o primeiro)
  const out = [];
  for (const p of pts) if (!out.length || out[out.length - 1].distanceTo(p) > 2e-4) out.push(p);
  while (out.length > 1 && out[0].distanceTo(out[out.length - 1]) <= 2e-4) out.pop();
  return out;
};
const svgLoader = new SVGLoader(), LOGOS = {};
// Devolve os polígonos da logo já centrados na origem, com o eixo Y para cima e `tamanho` no lado maior.
async function logo(arquivo, tamanho, { so = null } = {}) {
  const txt = (await (await fetch('./logos/' + arquivo)).text()).replace(/currentColor|url\([^)]*\)/g, '#000');
  let paths = svgLoader.parse(txt).paths; if (so !== null) paths = [paths[so]];
  const brutos = [];
  for (const p of paths) for (const sh of SVGLoader.createShapes(p)) { const e = sh.extractPoints(14); brutos.push({ fora: e.shape, furos: e.holes }); }
  const box = new THREE.Box2(); brutos.forEach(b => b.fora.forEach(p => box.expandByPoint(p)));
  const cx = (box.min.x + box.max.x) / 2, cy = (box.min.y + box.max.y) / 2, w = box.max.x - box.min.x, h = box.max.y - box.min.y, s = tamanho / Math.max(w, h);
  const conv = p => new V2((p.x - cx) * s, -(p.y - cy) * s);
  const polys = brutos.map(b => ({ fora: limpar(b.fora.map(conv)), furos: b.furos.map(f => limpar(f.map(conv))) }));
  return (LOGOS[arquivo] = { polys, s, cx, cy, w: w * s, h: h * s, wSvg: w, hSvg: h, txt, so });
}
const forma = poly => { const sh = new THREE.Shape(poly.fora || poly); (poly.furos || []).forEach(f => sh.holes.push(new THREE.Path(f))); return sh; };
const centroide = pts => { let A = 0, x = 0, y = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length], k = p.x * q.y - q.x * p.y; A += k; x += (p.x + q.x) * k; y += (p.y + q.y) * k; } return new V2(x / (3 * A), y / (3 * A)); };
// corta um polígono por semiplanos [nx, ny, d]: fica o lado onde n·p >= d
function cortar(pts, planos) {
  for (const [nx, ny, d] of planos) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], da = nx * a.x + ny * a.y - d, db = nx * b.x + ny * b.y - d;
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { const k = da / (da - db); out.push(new V2(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k)); }
    }
    pts = out; if (!pts.length) break;
  }
  // num contorno côncavo o corte liga os trechos soltos por uma ida e volta em cima da linha de corte: tira essas farpas
  pts = limpar(pts);
  for (let mudou = true; mudou && pts.length > 3;) {
    mudou = false;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[(i + pts.length - 1) % pts.length], q = pts[i], r = pts[(i + 1) % pts.length], ax = q.x - p.x, ay = q.y - p.y, bx = r.x - q.x, by = r.y - q.y;
      if (Math.abs(ax * by - ay * bx) < 1e-9 && ax * bx + ay * by < 0) { pts.splice(i, 1); pts = limpar(pts); mudou = true; break; }
    }
  }
  return pts;
}
// a cor da logo mora numa textura projetada de frente: serve para os degradês oficiais
function texturaDaLogo(Lg, pintar) {
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.setTransform(S / Lg.wSvg, 0, 0, S / Lg.hSvg, -(Lg.cx - Lg.wSvg / 2) * S / Lg.wSvg, -(Lg.cy - Lg.hSvg / 2) * S / Lg.hSvg);  // desenha em coordenadas do SVG
  pintar(ctx, () => ctx.fillRect(Lg.cx - Lg.wSvg, Lg.cy - Lg.hSvg, Lg.wSvg * 2, Lg.hSvg * 2));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}
function uvDeFrente(geo, Lg) {
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = clamp(p.getX(i) / Lg.w + 0.5, 0.002, 0.998); uv[i * 2 + 1] = clamp(p.getY(i) / Lg.h + 0.5, 0.002, 0.998); }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

// ---------------------------------------------------------------- materiais
// Plástico com verniz. O brilho vem só das caixas de luz do ambiente: o reflexo direto da luz principal no
// verniz é desligado, porque uma luz pontual aparece nele como um ponto estourado.
const semPonto = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace(/clearcoatSpecularDirect \+= ccIrradiance[^;]*;/, '')); };
const plastico = (color, o = {}) => { const m = new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.06 }, o)); m.onBeforeCompile = semPonto; return m; };
const fosco = (color, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.72, sheen: 0.5, sheenRoughness: 0.45, sheenColor: new THREE.Color('#ffffff') }, o));
const metal = new THREE.MeshStandardMaterial({ color: '#eef0f3', metalness: 1, roughness: 0.2 });
const por = (pai, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; pai.add(m); return m; };
const grupo = (pai, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); pai.add(g); return g; };

// ---------------------------------------------------------------- o estúdio
const PAREDE = -2.4, ESP = 0.8, R = 1.7;   // distância da parede, espessura e meio-lado do ícone
// a cor do estúdio troca numa onda que abre em círculo a partir de trás do ícone
const onda = { uVelha: { value: new THREE.Color() }, uNova: { value: new THREE.Color() }, uCentro: { value: new V3(0, 0.15, PAREDE) }, uRaio: { value: 0 } };
const papel = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.94 });
papel.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, onda);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMundo;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uVelha, uNova, uCentro; uniform float uRaio; varying vec3 vMundo;')
    .replace('#include <color_fragment>', '#include <color_fragment>\nfloat frente = smoothstep(uRaio - 0.2, uRaio, distance(vMundo, uCentro));\ndiffuseColor.rgb = mix(uNova, uVelha, frente) + 0.16 * (1.0 - abs(2.0 * frente - 1.0));');
};
const parede = new THREE.Mesh(new THREE.PlaneGeometry(160, 100), papel); parede.position.z = PAREDE; parede.receiveShadow = true; scene.add(parede);

// luz: caixas de luz no ambiente para o brilho, uma bandeira preta atrás da câmera para a face não lavar, e uma chave grande
{
  const amb = new THREE.Scene();
  amb.add(new THREE.Mesh(new THREE.SphereGeometry(70, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vY; void main(){ vec3 topo = vec3(0.70, 0.72, 0.76), meio = vec3(0.32, 0.35, 0.39), chao = vec3(0.16, 0.17, 0.19); gl_FragColor = vec4(vY > 0.0 ? mix(meio, topo, vY) : mix(meio, chao, -vY), 1.0); }',
  })));
  const painel = (pos, tam, cor, forca, redondo) => {
    const m = new THREE.Mesh(redondo ? new THREE.CircleGeometry(tam[0] / 2, 48) : new THREE.PlaneGeometry(tam[0], tam[1]), new THREE.MeshBasicMaterial({ color: new THREE.Color(cor).multiplyScalar(forca), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); amb.add(m);
  };
  painel([0, 4, 42], [90, 70], '#000000', 1);            // bandeira preta atrás da câmera
  painel([2, 23, 7], [28, 16], '#ffffff', 3.2);          // caixa de cima
  painel([23, 9, 12], [10, 21], '#fff5e8', 2.6);         // tira quente à direita
  painel([-21, 5, 9], [5, 22], '#e9f1ff', 2.2);          // tira fria à esquerda
  painel([-19, 3, 24], [22, 22], '#ffffff', 1.4, true);  // caixa redonda atrás, à esquerda: a borda dela é o brilho que escorre na face
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(amb, 0.02).texture; scene.environmentIntensity = 0.55;
  pm.dispose();
}
const CHAVE = new V3(8, 10, 12), ALVO = new V3(1.3, -0.2, -1);
const chave = new THREE.SpotLight('#fff8ee', 1050, 0, 0.8, 1, 2);
chave.position.copy(CHAVE); chave.target.position.copy(ALVO); chave.castShadow = true;
chave.shadow.mapSize.set(2048, 2048); chave.shadow.camera.near = 6; chave.shadow.camera.far = 40; chave.shadow.focus = 0.42; chave.shadow.bias = -0.00025; chave.shadow.normalBias = 0.018;
scene.add(chave, chave.target);
const rebatida = new THREE.HemisphereLight('#ffffff', '#ffffff', 0.8); scene.add(rebatida);   // a cor de baixo acompanha o estúdio
// base ortogonal da chave, para espalhar a luz num disco (sombra macia de verdade, amostra por amostra)
const chZ = CHAVE.clone().sub(ALVO).normalize(), chX = new V3(0, 1, 0).cross(chZ).normalize(), chY = chZ.clone().cross(chX);
const RAIO_DA_CHAVE = 1.5;

// ---------------------------------------------------------------- o ícone
const icone = grupo(scene);
const metade = [plastico('#ffffff'), plastico('#ffffff')];   // frente e costas: durante a virada são duas cores
{
  const corpo = peca(squircle(R), ESP, 0.2, { voltas: 9, passos: 2 }); corpo.translate(0, 0, -ESP / 2);
  // separa o corpo em metade da frente e metade de trás, para cada uma ter a sua cor
  const p = corpo.attributes.position.array, n = corpo.attributes.normal.array, ordem = [[], []];
  for (let f = 0; f < p.length / 9; f++) ordem[p[f * 9 + 2] + p[f * 9 + 5] + p[f * 9 + 8] > 0 ? 0 : 1].push(f);
  const P = new Float32Array(p.length), N = new Float32Array(n.length); let w = 0;
  for (const f of ordem.flat()) { P.set(p.subarray(f * 9, f * 9 + 9), w); N.set(n.subarray(f * 9, f * 9 + 9), w); w += 9; }
  corpo.setAttribute('position', new THREE.BufferAttribute(P, 3)); corpo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); corpo.deleteAttribute('uv');
  corpo.addGroup(0, ordem[0].length * 3, 0); corpo.addGroup(ordem[0].length * 3, ordem[1].length * 3, 1);
  por(icone, corpo, metade);
  por(icone, peca(squircle(R + 0.016), 0.09, 0.03), metal, 0, 0, -0.045);   // a cinta polida na cintura
}

// ---------------------------------------------------------------- as logos e o gesto de cada uma
// Cada construtor recebe o grupo que fica em pé na face do ícone e devolve:
//   pose(s)  -> arruma as peças para s = segundos desde que a face cravou (negativo enquanto ainda vem girando)
//   coices   -> [[s, força], ...] os contatos que empurram o ícone para trás
// Toda logo já chega no ícone com as peças na pose aberta (afastadas e levantadas) e fecha depois de cravar:
// nada aparece do nada e nada muda de tamanho.
const FROUXO = 0.05;   // peças que entram em pedaços ficam esta altura acima da face até a prensa
const SIMBOLOS = {
  // a nuvem assenta; as teclas > e _ são prensadas em cima dela, uma depois da outra; o cursor pisca uma vez
  async codex(g) {
    const Lg = await logo('codex.svg', 2.15), nuvemPoly = Lg.polys[0], ALT = 0.27;
    const tex = texturaDaLogo(Lg, (ctx, tudo) => { const gr = ctx.createLinearGradient(12, 3, 12, 21); gr.addColorStop(0, '#B1A7FF'); gr.addColorStop(0.5, '#7A9DFF'); gr.addColorStop(1, '#3941FF'); ctx.fillStyle = gr; tudo(); });   // o degradê de logos/codex-color.svg
    const nuvem = por(g, uvDeFrente(peca(forma(nuvemPoly.fora), ALT, 0.05), Lg), plastico('#ffffff', { map: tex }));
    // na logo o > e o _ são vazados; aqui são teclas brancas com o mesmo contorno, pousadas na nuvem
    const teclas = [...nuvemPoly.furos].sort((a, b) => centroide(a).x - centroide(b).x).map(f => { const c = centroide(f); return por(nuvem, peca(forma(f.map(q => new V2(q.x - c.x, q.y - c.y))), 0.075, 0.024), fosco('#ffffff'), c.x, c.y, ALT); });
    const T = { cai: [0.2, 0.36], teclas: [0.58, 0.74], pisca: 1.14 };
    return {
      coices: [[T.cai[1], 0.8], [T.teclas[0] + 0.09, 0.25], [T.teclas[1] + 0.09, 0.25]],
      pose(s) {
        nuvem.position.z = 0.5 * (1 - seg(s, T.cai[0], T.cai[1], ease.in)) + quique(s - T.cai[1], 0.04, 13, 24);
        teclas.forEach((m, i) => { m.position.z = ALT + 0.32 * (1 - seg(s, T.teclas[i], T.teclas[i] + 0.09, ease.in)); });
        const u = s - T.pisca;   // o cursor _ é apertado e solta, como uma tecla
        teclas[1].scale.z = u > 0 ? 1 - 0.7 * Math.sin(PI * clamp(u / 0.24)) : 1;
      },
    };
  },
  // o nó chega solto e é travado em dois cliques de 60 graus (o nó tem simetria de 6: cada clique devolve o mesmo desenho)
  async chatgpt(g) {
    const Lg = await logo('chatgpt.svg', 2.2);
    const no = por(g, peca(Lg.polys.map(forma), 0.24, 0.035), fosco('#ffffff'));
    const T = { cliques: [0.12, 0.34] };
    return {
      coices: [[T.cliques[0] + 0.07, 0.45], [T.cliques[1] + 0.07, 0.7]],
      pose(s) {
        const c1 = spring(s - T.cliques[0], 4.4, 0.5), c2 = spring(s - T.cliques[1], 4.4, 0.5);
        no.rotation.z = (TAU / 6) * (2 - c1 - c2);
        no.position.z = 0.12 * (1 - 0.5 * Math.min(c1, 1) - 0.5 * Math.min(c2, 1));
      },
    };
  },
  // as quatro pontas chegam abertas, fecham uma por vez e são prensadas numa peça só
  async gemini(g) {
    const Lg = await logo('gemini.svg', 2.3, { so: 0 }), P = Lg.polys[0].fora;
    const tex = texturaDaLogo(Lg, (ctx, tudo) => {
      ctx.fillStyle = '#3186FF'; tudo();
      const camada = (x1, y1, x2, y2, cor, fim) => { const gr = ctx.createLinearGradient(x1, y1, x2, y2); gr.addColorStop(0, cor); gr.addColorStop(fim, cor + '00'); gr.addColorStop(1, cor + '00'); ctx.fillStyle = gr; tudo(); };
      camada(7, 15.5, 11, 12, '#08B962', 1); camada(8, 5.5, 11.5, 11, '#F94543', 1); camada(3.5, 13.5, 17.5, 12, '#FABC12', 0.46);
    });
    const mat = plastico('#ffffff', { map: tex });
    const inteira = por(g, uvDeFrente(peca(forma(P), 0.27, 0.05), Lg), mat);
    const pontas = [[0, 1], [1, 0], [0, -1], [-1, 0]].map(([dx, dy]) => ({ dir: [dx, dy], m: por(g, uvDeFrente(peca(forma(cortar(P, [[dx - dy, dy + dx, 0], [dx + dy, dy - dx, 0]])), 0.27, 0.03), Lg), mat) }));
    const T = { pontas: [0.08, 0.16, 0.24, 0.32], prensa: 0.56 };
    return {
      coices: [...T.pontas.map(t => [t + 0.11, 0.2]), [T.prensa, 0.7]],
      pose(s) {
        const junto = s >= T.prensa, frouxo = FROUXO * (1 - seg(s, T.prensa - 0.05, T.prensa, ease.in));
        inteira.visible = junto;
        pontas.forEach(({ dir, m }, i) => {
          const u = pop(s - T.pontas[i], 3.3, 0.6);
          m.position.set(dir[0] * 0.34 * (1 - u), dir[1] * 0.34 * (1 - u), 0.24 * (1 - Math.min(u, 1)) + frouxo);
          m.visible = !junto;
        });
      },
    };
  },
  // o "g" é um traço só: chega aberto em quatro segmentos, que fecham na ordem do traço e são prensados
  async groq(g) {
    const Lg = await logo('groq.svg', 2.2), P = Lg.polys[0].fora;
    const yMaior = a => [0, -1, (a - Lg.cy) * Lg.s], yMenor = a => [0, 1, -(a - Lg.cy) * Lg.s], xMenor = a => [-1, 0, -(a - Lg.cx) * Lg.s], xMaior = a => [1, 0, (a - Lg.cx) * Lg.s];   // cortes em coordenadas do SVG
    const mat = fosco('#ffffff');
    const inteira = por(g, peca(forma(P), 0.24, 0.04), mat);
    const trechos = [
      { planos: [yMaior(8.84), xMenor(15.3), yMenor(16.6)], de: [-0.2, -0.1] },    // o toco e a volta de baixo, à esquerda
      { planos: [yMenor(8.84)], de: [0, 0.26] },                                    // o arco de cima
      { planos: [xMaior(15.3), yMaior(8.84), yMenor(15.75)], de: [0.26, 0] },       // a haste
      { planos: [yMaior(15.75)], de: [0.08, -0.26] },                               // a cauda
    ].map(t => ({ de: t.de, m: por(g, peca(forma(cortar(P, t.planos)), 0.24, 0.025), mat) }));
    const T = { trechos: [0.08, 0.16, 0.24, 0.32], prensa: 0.56 };
    return {
      coices: [...T.trechos.map(t => [t + 0.11, 0.2]), [T.prensa, 0.7]],
      pose(s) {
        const junto = s >= T.prensa, frouxo = FROUXO * (1 - seg(s, T.prensa - 0.05, T.prensa, ease.in));
        inteira.visible = junto;
        trechos.forEach(({ de, m }, i) => {
          const u = pop(s - T.trechos[i], 3.3, 0.6);
          m.position.set(de[0] * (1 - u), de[1] * (1 - u), 0.24 * (1 - Math.min(u, 1)) + frouxo);
          m.visible = !junto;
        });
      },
    };
  },
  // a baleia chega levantada e inclinada, mergulha no lugar e balança até parar
  async deepseek(g) {
    const Lg = await logo('deepseek.svg', 2.3);
    const eixo = grupo(g); por(eixo, peca(Lg.polys.map(forma), 0.23, 0.016, { voltas: 3 }), fosco('#ffffff'));
    const T = { mergulho: [0.06, 0.36] };
    return {
      coices: [[T.mergulho[1], 0.8]],
      pose(s) {
        const u = seg(s, T.mergulho[0], T.mergulho[1]), v = s - T.mergulho[1];
        eixo.position.set(lerp(-0.28, 0, ease.inOut(u)), lerp(-0.18, 0, ease.inOut(u)), 0.4 * (1 - ease.in(u)) + 0.16 * Math.sin(PI * u) + quique(v, 0.035, 13, 24));
        eixo.rotation.z = lerp(0.45, 0, ease.inOut(u)) + (v > 0 ? 0.06 * Math.exp(-v * 9) * Math.sin(v * 22) : 0);
      },
    };
  },
  // os raios chegam abertos como uma flor, fecham um a um em volta do relógio e são prensados numa peça só
  async claude(g) {
    const Lg = await logo('claude-code.svg', 2.3);
    const c = centroide(Lg.polys[0].fora), P = Lg.polys[0].fora.map(q => new V2(q.x - c.x, q.y - c.y));   // trabalha com o miolo na origem
    const centro = grupo(g, c.x, c.y, 0), mat = fosco('#faf9f5');
    const inteira = por(centro, peca(forma(P), 0.24, 0.028), mat);
    // os vales entre os raios: mínimos do raio do contorno, visto do miolo
    const NA = 720, raio = new Float32Array(NA);
    for (let k = 0; k < NA; k++) {
      const th = k / NA * TAU, dx = Math.cos(th), dy = Math.sin(th); let longe = 0;
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length], ex = b.x - a.x, ey = b.y - a.y, den = ex * dy - ey * dx; if (Math.abs(den) < 1e-12) continue;
        const d = (ex * a.y - ey * a.x) / den, u = (dx * a.y - dy * a.x) / den;
        if (d > 0 && u >= 0 && u <= 1) longe = Math.max(longe, d);
      }
      raio[k] = longe;
    }
    const J = Math.round(NA * 6.5 / 360), brutos = [];
    for (let k = 0; k < NA; k++) { let minimo = true; for (let j = -J; j <= J && minimo; j++) if (raio[(k + j + NA) % NA] < raio[k] - 1e-9) minimo = false; if (minimo) brutos.push(k); }
    const vales = []; for (const k of brutos) { const u = vales[vales.length - 1]; if (u && k - u.b <= 3) u.b = k; else vales.push({ a: k, b: k }); }
    if (vales.length > 1 && vales[0].a + NA - vales[vales.length - 1].b <= 3) { vales[0].a = vales.pop().a - NA; }
    const ang = vales.map(v => ((v.a + v.b) / 2 + NA) % NA / NA * TAU).sort((a, b) => a - b);
    // um pedaço por raio: a fatia entre dois vales vizinhos, até o miolo
    const raios = ang.map((a0, i) => {
      const a1 = ang[(i + 1) % ang.length], pts = cortar(P, [[-Math.sin(a0), Math.cos(a0), 0], [Math.sin(a1), -Math.cos(a1), 0]]);
      const ponta = pts.reduce((m, q) => (q.length() > m.length() ? q : m), new V2()), eixo = grupo(centro);
      return { eixo, m: por(eixo, peca(forma(pts), 0.24, 0.014), mat), dir: ponta.clone().normalize(), a: Math.atan2(ponta.y, ponta.x) };
    });
    // em volta do relógio, a partir do raio mais perto das 12 horas
    const relogio = a => ((PI / 2 - a) % TAU + TAU) % TAU; raios.sort((p, q) => relogio(p.a) - relogio(q.a));
    console.log('[cena] claude: ' + raios.length + ' raios');
    const T = { raios: 0.08, passo: 0.03 }; T.prensa = T.raios + raios.length * T.passo + 0.16;
    return {
      T,
      coices: [...raios.map((_, i) => [T.raios + i * T.passo + 0.1, 0.1]), [T.prensa, 1]],
      pose(s) {
        const junto = s >= T.prensa, frouxo = FROUXO * (1 - seg(s, T.prensa - 0.05, T.prensa, ease.in));
        inteira.visible = junto;
        raios.forEach(({ eixo, m, dir }, i) => {
          const t0 = T.raios + i * T.passo, u = pop(s - t0, 3.4, 0.58);
          m.position.set(dir.x * 0.3 * (1 - u), dir.y * 0.3 * (1 - u), 0.26 * (1 - Math.min(u, 1)) + frouxo);
          eixo.rotation.z = -0.38 * (1 - u);
          m.visible = !junto;
        });
      },
    };
  },
};
const faces = [];
for (const b of BEATS) { const eixo = grupo(icone), g = grupo(eixo, 0, 0, ESP / 2), sim = await SIMBOLOS[b.id](g); faces.push({ eixo, ...sim }); }
const T_FECHO = faces[FIM].T.prensa;   // segundos depois de cravar em que a última logo é prensada

// ---------------------------------------------------------------- letreiro em relevo na parede
const FONTE = new FontLoader().parse(await (await fetch('./fontes/inter-800.typeface.json')).json());
function letreiro(texto, { corpo, altura, x, y, quina = 0.03 }) {
  const mat = new THREE.MeshStandardMaterial({ color: TINTA, roughness: 0.55 }), out = []; let x0 = x;
  for (const ch of texto) {
    const gl = FONTE.data.glyphs[ch], avanco = gl.ha / FONTE.data.resolution * corpo;
    if (ch !== ' ') {
      const geo = alisar(new TextGeometry(ch, { font: FONTE, size: corpo, depth: altura - 2 * quina, curveSegments: 10, bevelEnabled: true, bevelThickness: quina, bevelSize: quina, bevelOffset: -quina, bevelSegments: 4 }));
      geo.computeBoundingBox(); const cx = (geo.boundingBox.min.x + geo.boundingBox.max.x) / 2, cy = (geo.boundingBox.min.y + geo.boundingBox.max.y) / 2;
      geo.translate(-cx, -cy, quina);   // cresce a partir do próprio centro, com as costas na parede
      const m = por(scene, geo, mat, x0 + cx, y + cy, PAREDE + 0.002);
      out.push({ por(e) { m.visible = e > 0.001; const k = 0.8 + 0.2 * Math.min(1, e); m.scale.set(k, k, Math.max(e, 0.001)); } });
    }
    x0 += avanco - 0.012 * corpo;
  }
  return out;
}
const TX = 2.72, CORPO = 1.5;
const letras = [...letreiro(LETREIRO[0], { corpo: CORPO, altura: 0.27, x: TX, y: 0.2 }), ...letreiro(LETREIRO[1], { corpo: CORPO, altura: 0.27, x: TX, y: -1.42 })];
const T_LETRAS = L[FIM] + T_FECHO + 0.16, PASSO_LETRA = 0.06;

// ---------------------------------------------------------------- todo contato do filme: [instante, força]
const coices = [];
BEATS.forEach((b, i) => { if (i) coices.push([L[i], 1]); faces[i].coices.forEach(([s, k]) => coices.push([L[i] + s, k])); });
const coice = u => (u <= 0 ? 0 : Math.exp(-u * 8.5) * Math.sin(u * 21));

// ---------------------------------------------------------------- o quadro no instante t
const corIcone = BEATS.map(b => new THREE.Color(b.tile)), corEstudio = BEATS.map(b => new THREE.Color(b.studio));
const qBase = new THREE.Quaternion(), qVira = new THREE.Quaternion(), eul = new THREE.Euler(0, 0, 0, 'YXZ'), EIXO = { x: new V3(1, 0, 0), y: new V3(0, 1, 0) };
const ARMA = 0.4;   // a virada toma conta do ícone este tanto antes de começar (a antecipação)
const antecipa = (t, at) => Math.exp(-Math.pow((t - (at - 0.07)) / 0.11, 2));
const T_ABRE = [BEATS[FIM].at + 0.04, BEATS[FIM].at + 1.4];   // a câmera abre espaço para o letreiro
const _alvo = new V3();

function frame(t, tOnda = t) {   // tOnda: o instante da onda de cor (o render passa o meio do quadro, para a borda dela não borrar)
  // qual virada manda: a face c está vindo para a frente, a face c - 1 está saindo
  let c = 0; for (let i = 1; i < BEATS.length; i++) if (t >= BEATS[i].at - ARMA) c = i;
  const b = BEATS[c], s = c ? t - b.at : 0, arma = c ? antecipa(t, b.at) : 0;
  const angulo = c ? flipAngle(b, s) - 0.2 * arma : 0;

  // cores. Parado, o ícone é de uma cor só; a metade que está escondida troca um pouco antes de aparecer.
  const sai = Math.max(0, c - 1);
  metade[0].color.copy(corIcone[sai]).lerp(corIcone[c], c ? seg(t, L[c] + 0.02, L[c] + 0.2) : 0);
  metade[1].color.copy(corIcone[sai]).lerp(corIcone[c], c ? seg(s, 0, 0.06) : 0);
  onda.uVelha.value.copy(corEstudio[sai]); onda.uNova.value.copy(corEstudio[c]);
  onda.uRaio.value = c ? 30 * seg(tOnda - b.at, 0.1, 0.75) : 30;
  rebatida.groundColor.copy(corEstudio[sai]).lerp(corEstudio[c], c ? seg(s, 0.1, 0.5) : 1);

  // o ícone: um flutuar de milímetros, a virada, e o coice de cada contato
  let k = 0; for (const [tc, f] of coices) k += f * coice(t - tc);
  const w = seg(t, T_ABRE[0], T_ABRE[1], x => ease.inOut(Math.pow(x, 0.6)));   // 0 = as logos, 1 = o fecho
  eul.set(0.09 + 0.016 * Math.sin(t * 0.9) + 0.02 * k, lerp(-0.24, -0.1, w) + 0.02 * Math.sin(t * 0.7 + 1), 0.008 * Math.sin(t * 0.8 + 2));
  qBase.setFromEuler(eul); qVira.setFromAxisAngle(EIXO[b.flip || 'y'], angulo);
  icone.quaternion.copy(qBase).multiply(qVira);
  icone.position.set(0, 0.15 + 0.03 * Math.sin(t * 1.3), -0.3 * arma - 0.085 * k);

  faces.forEach((f, i) => {
    f.eixo.visible = i === c || i === c - 1;
    if (!f.eixo.visible) return;
    f.eixo.rotation.set(0, 0, 0);
    if (i === c && c) f.eixo.rotation[b.flip] = PI;   // a logo que vem espera nas costas, já do lado certo para esta virada
    f.pose(t - L[i]);
  });

  letras.forEach((p, i) => p.por(pop(t - T_LETRAS - i * PASSO_LETRA - (i >= LETREIRO[0].length ? 0.1 : 0), 2.7, 0.52)));

  // câmera: avanço lento enquanto as logos trocam; no fecho, recua e desliza para a direita
  camera.position.set(lerp(0.9 - 0.03 * t, 3.0, w), lerp(0.75, 0.5, w), lerp(13.0 - 0.085 * t, 14.0, w));
  camera.lookAt(_alvo.set(lerp(0, 2.66, w), lerp(0.12, -0.05, w), lerp(0, -0.8, w)));
}

// ---------------------------------------------------------------- render por acúmulo de amostras
// Cada quadro é a média de N amostras: cada uma num instante um pouco diferente (desfoque de movimento de verdade),
// com a chave num ponto diferente do disco (sombra macia de verdade) e a câmera deslocada uma fração de pixel (antisserrilhado).
const alvoCena = new THREE.WebGLRenderTarget(VW, VH, { type: THREE.HalfFloatType });   // sem MSAA: o deslocamento de fração de pixel entre as amostras já faz o antisserrilhado
const alvoSoma = new THREE.WebGLRenderTarget(VW, VH, { type: THREE.HalfFloatType, depthBuffer: false });
const telaCena = new THREE.Scene(), telaCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const matSoma = new THREE.ShaderMaterial({ uniforms: { tMapa: { value: alvoCena.texture }, uPeso: { value: 1 } }, vertexShader: VERT, fragmentShader: 'uniform sampler2D tMapa; uniform float uPeso; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tMapa, vUv).rgb * uPeso, 1.0); }', blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthTest: false, depthWrite: false });
const matSaida = new THREE.ShaderMaterial({ uniforms: { tMapa: { value: alvoSoma.texture } }, vertexShader: VERT, fragmentShader: 'uniform sampler2D tMapa; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tMapa, vUv).rgb, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}', depthTest: false, depthWrite: false });
const tela = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matSoma); tela.frustumCulled = false; telaCena.add(tela);
const halton = (i, base) => { let f = 1, r = 0; while (i > 0) { f /= base; r += f * (i % base); i = Math.floor(i / base); } return r; };
const OBTURADOR = 0.5;   // fração do quadro em que o obturador fica aberto
window.SAMPLES = 16;

function renderAt(t) {
  const n = Math.max(1, window.SAMPLES | 0);
  renderer.setRenderTarget(alvoSoma); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let i = 0; i < n; i++) {
    frame(t + ((i + 0.5) / n - 0.5) * OBTURADOR / FPS, t);
    const rr = RAIO_DA_CHAVE * Math.sqrt(halton(i + 1, 2)), aa = TAU * halton(i + 1, 3);
    chave.position.copy(CHAVE).addScaledVector(chX, rr * Math.cos(aa)).addScaledVector(chY, rr * Math.sin(aa));
    camera.setViewOffset(VW, VH, halton(i + 1, 5) - 0.5, halton(i + 1, 7) - 0.5, VW, VH);
    renderer.autoClear = true; renderer.setRenderTarget(alvoCena); renderer.render(scene, camera);
    tela.material = matSoma; matSoma.uniforms.uPeso.value = 1 / n;
    renderer.autoClear = false; renderer.setRenderTarget(alvoSoma); renderer.render(telaCena, telaCam);
  }
  tela.material = matSaida; renderer.autoClear = true; renderer.setRenderTarget(null); renderer.render(telaCena, telaCam);
  return t;
}

const KEYS = [ // momentos-chave
  { id: '01-codex', t: 1.5 },
  { id: '02-virada-e-onda', t: BEATS[1].at + 0.2 },
  { id: '03-chatgpt', t: L[1] + 1.1 },
  { id: '04-gemini-fechando', t: L[2] + 0.21 },
  { id: '05-gemini', t: L[2] + 1.1 },
  { id: '06-groq', t: L[3] + 1.1 },
  { id: '07-deepseek', t: L[4] + 1.1 },
  { id: '08-claude-raios', t: L[FIM] + 0.08 + 6 * 0.03 + 0.05 },
  { id: '09-fecho', t: DURATION - 0.5 },
];

// Confere a silhueta que a cena extruda contra o SVG oficial desenhado pelo navegador (1 = idêntica).
window.conferirLogos = async () => {
  const S = 640, out = [];
  const mascara = cv => { const d = cv.getContext('2d').getImageData(0, 0, S, S).data, m = new Uint8Array(S * S); for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0; return m; };
  for (const [arquivo, Lg] of Object.entries(LOGOS)) {
    let corpo = Lg.txt.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    if (Lg.so !== null) { const ps = corpo.match(/<path[\s\S]*?(?:\/>|<\/path>)/g); corpo = ps[Lg.so]; }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" preserveAspectRatio="none" viewBox="${Lg.cx - Lg.wSvg / 2} ${Lg.cy - Lg.hSvg / 2} ${Lg.wSvg} ${Lg.hSvg}" fill="#000" fill-rule="${/fill-rule="evenodd"/.test(Lg.txt) ? 'evenodd' : 'nonzero'}">${corpo}</svg>`;
    const img = new Image(); await new Promise((ok, erro) => { img.onload = ok; img.onerror = erro; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const a = document.createElement('canvas'); a.width = a.height = S; a.getContext('2d').drawImage(img, 0, 0, S, S);
    const b = document.createElement('canvas'); b.width = b.height = S; const ctx = b.getContext('2d');
    for (const poly of Lg.polys) { ctx.beginPath(); for (const anel of [poly.fora, ...poly.furos]) { anel.forEach((q, i) => { const x = (q.x / Lg.w + 0.5) * S, y = (0.5 - q.y / Lg.h) * S; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); } ctx.fill('evenodd'); }
    const ma = mascara(a), mb = mascara(b); let inter = 0, uni = 0; for (let i = 0; i < ma.length; i++) { inter += ma[i] & mb[i]; uni += ma[i] | mb[i]; }
    out.push({ arquivo, igualdade: +(inter / uni).toFixed(4) });
  }
  return out;
};

window.KEYS = KEYS;
window.DURATION = DURATION;
window.TEMPOS = { L, T_FECHO, T_LETRAS, T_ABRE };
window.renderKey = i => { renderAt(KEYS[i].t); return KEYS[i].id; };
window.renderAt = renderAt;
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'gpu desconhecida';
console.log('[cena] cravadas: ' + L.map(x => x.toFixed(2)).join(' · ') + ' | prensa do fecho +' + T_FECHO.toFixed(2) + ' | letras em ' + T_LETRAS.toFixed(2));
const q = new URLSearchParams(location.search);
if (!q.has('manual')) { if (q.has('t')) renderAt(Number(q.get('t'))); else window.renderKey(Number(q.get('key') ?? 0)); }
window.ready = true;
