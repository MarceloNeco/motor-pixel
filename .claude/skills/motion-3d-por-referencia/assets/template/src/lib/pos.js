// Pipeline de imagem: subquadros acumulados → tom → gradação → vinheta e grão → tela 2D para texto.
//
// Por que subquadros: cada quadro do filme é a média de N renders em instantes vizinhos, com a câmera deslocada
// menos de um pixel. De uma vez só isso dá desfoque de movimento de verdade, antisserrilhado de cinema, sombra de
// borda macia (a luz muda de lugar a cada subquadro) e profundidade de campo (a lente muda de lugar). É o que tira
// a cara de "jogo" de uma cena em tempo real, sem nenhuma passada de pós cara.
//
// Cor: a cena é desenhada em luz linear num alvo de ponto flutuante. O tom (tone mapping) e a conversão para sRGB
// acontecem uma vez só, no fim. A gradação vem DEPOIS da conversão, em espaço de exibição, porque é nesse espaço
// que se medem os percentis da referência (contraste aplicado em linear esmaga os pretos ou lava a imagem).
import * as THREE from 'three';
import { halton } from './tempo.js';

// Sequência R2: pontos bem espalhados num quadrado mesmo com poucas amostras. (Halton em bases altas, como 11 e 13,
// anda em diagonal nas primeiras dezenas de amostras: o disco da luz virava espiral e a sombra saía em rastros.)
// Use também para qualquer sorteio por subquadro seu (desfoque por camada, tremor de câmera), com outros deslocamentos.
export const r2 = (i, du = 0.5, dv = 0.5) => [(du + (i + 1) * 0.7548776662466927) % 1, (dv + (i + 1) * 0.5698402909980532) % 1];

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const FS_FINAL = `
uniform sampler2D tx; uniform float semente, expo, contraste, pivo, sat, piso, teto, vinheta, grao, aspecto; uniform vec3 tinta;
uniform int tom; uniform bool alfa; varying vec2 vUv;
vec3 neutro(vec3 c){            // Khronos PBR Neutral: preserva matiz e saturação das cores de marca
  float x = min(c.r, min(c.g, c.b)); float o = x < 0.08 ? x - 6.25 * x * x : 0.04; c -= o;
  float p = max(c.r, max(c.g, c.b)); if (p < 0.76) return c;
  float d = 0.24; float np = 1.0 - d * d / (p + d - 0.76); c *= np / p;
  float g = 1.0 - 1.0 / (0.15 * (p - np) + 1.0); return mix(c, vec3(np), g);
}
vec3 aces(vec3 c){              // ACES filmico: ombro de cinema, dessatura os claros (bom para noite, neon, fotorreal)
  const mat3 A = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 B = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  c = A * (c / 0.6); vec3 a = c * (c + 0.0245786) - 0.000090537; vec3 b = c * (0.983729 * c + 0.4329510) + 0.238081;
  return clamp(B * (a / b), 0.0, 1.0);
}
vec3 srgb(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float h(vec2 p){ vec3 q = fract(vec3(p.xyx + semente) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }   // sem seno: dá o mesmo grão em qualquer placa
void main(){
  vec4 s = texture2D(tx, vUv);
  float a = alfa ? clamp(s.a, 0.0, 1.0) : 1.0;
  vec3 c = (alfa && s.a > 1e-5 ? s.rgb / s.a : s.rgb) * expo;
  if (tom == 1) c = neutro(c); else if (tom == 2) c = aces(c); else if (tom == 3) c = c / (1.0 + c);
  c = srgb(c);
  // gradação em espaço de exibição
  c *= tinta;
  c = (c - pivo) * contraste + pivo;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat);
  c = piso + clamp(c, 0.0, 1.0) * (teto - piso);
  if (!alfa) {                  // com alfa, nada de efeito em tela cheia: suja a borda do recorte
    float r = length((vUv - 0.5) * 2.0) / 1.41421356;     // 0 no centro, 1 no canto, em qualquer formato
    c *= 1.0 - vinheta * smoothstep(0.45, 1.0, r);        // vinheta = quanto o canto extremo escurece (0,12 = 12%)
    c += (h(gl_FragCoord.xy) - 0.5) * grao;
  }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0) * a, a);
}`;

const TONS = { linear: 0, neutro: 1, aces: 2, reinhard: 3 };

export function criarPipeline(renderer, W, H, opcoes = {}) {
  const o = {
    sub: 16,          // subquadros por quadro (rascunho: 4). Pode ser função: t => (t > 2 && t < 2.5 ? 96 : 24), para pagar caro só no trecho rápido
    obturador: 0.5,   // fração do quadro em que o obturador fica aberto: 0,5 = 180° (cinema) · 1 = 360° (time-lapse) · 0 = sem desfoque
    fps: 30,
    tom: 'neutro',    // 'neutro' | 'aces' | 'reinhard' | 'linear'
    exposicao: 1,
    contraste: 1, pivo: 0.42, saturacao: 1, piso: 0, teto: 1, tinta: [1, 1, 1],
    vinheta: 0, grao: 0,   // vinheta: fração que o canto escurece. Meta = 1 − (cantos ÷ centro) do MEDIDO.md, se o fundo for liso
    alfa: false,
    msaa: 4,
    foco: null,       // { alvo: [x,y,z] ou dist, abertura }: profundidade de campo por lente fina (só perspectiva; peça 32+ subquadros)
    ...opcoes,
  };
  const gl = renderer.getContext();
  gl.getExtension('EXT_float_blend');   // somar em alvo de 32 bits precisa desta extensão
  renderer.autoClear = false;
  renderer.toneMapping = THREE.NoToneMapping;   // o tom é feito aqui, uma vez, no fim

  const rtCena = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: o.msaa });
  const rtSoma = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, depthBuffer: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const cenaQuad = new THREE.Scene(); cenaQuad.add(quad);
  const camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mSoma = new THREE.ShaderMaterial({
    uniforms: { tx: { value: rtCena.texture }, peso: { value: 1 } }, vertexShader: VS,
    fragmentShader: 'uniform sampler2D tx; uniform float peso; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tx, vUv) * peso; }',
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, depthTest: false, depthWrite: false,
  });
  const mFinal = new THREE.ShaderMaterial({
    uniforms: {
      tx: { value: rtSoma.texture }, semente: { value: 0 }, expo: { value: 1 }, contraste: { value: 1 }, pivo: { value: 0.42 }, sat: { value: 1 },
      piso: { value: 0 }, teto: { value: 1 }, tinta: { value: new THREE.Vector3(1, 1, 1) }, vinheta: { value: 0 }, grao: { value: 0 },
      aspecto: { value: W / H }, tom: { value: 1 }, alfa: { value: false },
    },
    vertexShader: VS, fragmentShader: FS_FINAL, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
  });

  // tela 2D final: recebe o quadro pronto e, por cima, texto e rótulos nítidos (sem desfoque nem grão)
  renderer.domElement.style.display = 'none';
  document.body.appendChild(renderer.domElement);
  const tela = document.createElement('canvas'); tela.width = W; tela.height = H;
  document.body.appendChild(tela);
  const ctx = tela.getContext('2d');

  const _dir = new THREE.Vector3(), _cima = new THREE.Vector3(), _pos = new THREE.Vector3(), _orig = new THREE.Vector3(), _eixo = new THREE.Vector3(), _alvo = new THREE.Vector3();

  function render(t, { estado, scene, camera, porSubquadro = null, sobre = null }) {
    const u = mFinal.uniforms;
    renderer.setRenderTarget(rtSoma); renderer.setClearColor(0x000000, 0); renderer.clear();
    const n = Math.max(1, (typeof o.sub === 'function' ? o.sub(t) : o.sub) | 0);
    for (let i = 0; i < n; i++) {
      const ts = n > 1 ? t + ((i + 0.5) / n - 0.5) * o.obturador / o.fps : t;
      estado(ts);
      // deslocamento subpixel (antisserrilhado) e, se houver foco, lente fina (profundidade de campo)
      let ox = n > 1 ? halton(i + 1, 2) - 0.5 : 0, oy = n > 1 ? halton(i + 1, 3) - 0.5 : 0;
      if (o.foco && camera.isPerspectiveCamera && n > 1) {
        const [fu, fv] = r2(i * 7 + 3, 0.11, 0.83), ang = fu * 6.2831853, r = Math.sqrt(fv) * o.foco.abertura;
        const dx = Math.cos(ang) * r, dy = Math.sin(ang) * r;
        _dir.setFromMatrixColumn(camera.matrixWorld, 0); _cima.setFromMatrixColumn(camera.matrixWorld, 1);
        _orig.copy(camera.position); _pos.copy(_orig).addScaledVector(_dir, dx).addScaledVector(_cima, dy);
        camera.position.copy(_pos); camera.updateMatrixWorld(true);
        const fpx = (H / 2) / Math.tan(camera.fov * Math.PI / 360);
        // distância até o plano nítido: fixa (dist) ou a de um ponto do mundo (alvo), medida ao longo do eixo da câmera
        let df = o.foco.dist;
        if (o.foco.alvo) { _eixo.setFromMatrixColumn(camera.matrixWorld, 2).negate(); df = Math.max(0.01, _alvo.set(...o.foco.alvo).sub(_orig).dot(_eixo)); }
        ox -= dx * fpx / df; oy += dy * fpx / df;   // mantém o plano de foco parado
      }
      camera.setViewOffset(W, H, ox, oy, W, H);
      if (porSubquadro) porSubquadro(i, n, ts);
      renderer.setRenderTarget(rtCena); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
      quad.material = mSoma; mSoma.uniforms.peso.value = 1 / n;
      renderer.setRenderTarget(rtSoma); renderer.render(cenaQuad, camQuad);
    }
    camera.clearViewOffset();
    u.semente.value = (Math.round(t * o.fps) % 97) * 1.37;
    u.expo.value = o.exposicao; u.contraste.value = o.contraste; u.pivo.value = o.pivo; u.sat.value = o.saturacao;
    u.piso.value = o.piso; u.teto.value = o.teto; u.tinta.value.set(...o.tinta); u.vinheta.value = o.vinheta; u.grao.value = o.grao;
    u.tom.value = TONS[o.tom] ?? 1; u.alfa.value = !!o.alfa;
    quad.material = mFinal;
    renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(cenaQuad, camQuad);
    ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H); ctx.drawImage(renderer.domElement, 0, 0);
    estado(t);                       // deixa a cena no instante exato para projetar rótulos
    if (sobre) sobre(ctx, t);        // texto 2D por cima, nítido
  }

  const grab = (q = 0.95, tipo = 'jpeg') => tela.toDataURL(tipo === 'png' ? 'image/png' : 'image/jpeg', q).split(',')[1];
  return { render, grab, tela, ctx, opcoes: o };
}

// Luz de área de graça: a cada subquadro a luz direcional sorteia um ponto num disco. A soma dá penumbra macia,
// mais larga quanto mais longe do objeto que faz a sombra (como numa foto de estúdio). raio = tamanho da fonte.
export function luzDeArea(luz, centro, raio, alvo = [0, 0, 0]) {
  return i => {
    const [u, v] = r2(i, 0.37, 0.61), ang = u * 6.2831853, r = Math.sqrt(v) * raio;
    luz.position.set(centro[0] + Math.cos(ang) * r, centro[1], centro[2] + Math.sin(ang) * r);
    luz.target.position.set(...alvo); luz.target.updateMatrixWorld();
  };
}

// Sol com sombra bem configurada. `meia` = meia largura da área coberta pela sombra: quanto menor, mais nítida.
// O viés (bias) do three é uma fração da faixa perto..longe da câmera de sombra: -0.0004 numa faixa de 60 unidades
// descola a sombra 0,024 unidade do pé do objeto (uma fresta de luz no contato, visível em plano fechado). Mantenha
// perto/longe justos em volta da cena e o viés no mínimo que não dá ruído; se aparecer ruído listrado, suba o
// normalBias aos poucos (0.002 → 0.006), não o bias.
export function sol(cor, intensidade, posicao, { meia = 8, mapa = 4096, perto = 0.5, longe = 60, bias = -0.00003, normalBias = 0.002, raio = 2 } = {}) {
  const l = new THREE.DirectionalLight(cor, intensidade);
  l.position.set(...posicao); l.castShadow = true; l.shadow.mapSize.set(mapa, mapa);
  Object.assign(l.shadow.camera, { left: -meia, right: meia, top: meia, bottom: -meia, near: perto, far: longe });
  l.shadow.bias = bias; l.shadow.normalBias = normalBias; l.shadow.radius = raio;
  return l;
}
