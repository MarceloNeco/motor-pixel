// O filtro de pintura a óleo. Recebe a cena 3D iluminada e devolve um quadro sobre tela:
//   1. revelar    cena linear -> imagem de exibição (curva de tom, saturação)
//   2. tensor     para onde corre a forma em cada ponto (tensor de estrutura, por Sobel)
//   3. borrar     suaviza o tensor (duas passadas, horizontal e vertical)
//   4. kuwahara   filtro de Kuwahara anisotrópico: a mancha vira pincelada alongada na direção da forma
//   5. tela       relevo de tinta sob luz rasante, contorno, trama de linho, borda crua e legenda
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { GLSL_RUIDO, col } from './util.js';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function criarPintura(renderer, VW, VH, C, opt = {}) {
  const ESC = opt.escala ?? 0.75, RAIO = opt.raio ?? 6;
  const PW = Math.round(VW * ESC), PH = Math.round(VH * ESC);
  const rtCena = new THREE.WebGLRenderTarget(VW, VH, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
  const alvo = type => new THREE.WebGLRenderTarget(PW, PH, { type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const rtBase = alvo(THREE.UnsignedByteType), rtT1 = alvo(THREE.HalfFloatType), rtT2 = alvo(THREE.HalfFloatType), rtTinta = alvo(THREE.UnsignedByteType), rtTinta2 = alvo(THREE.UnsignedByteType), rtT3 = alvo(THREE.HalfFloatType);
  const res = new THREE.Vector2(PW, PH);
  const passe = (uniforms, frag) => new FullScreenQuad(new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false }));

  const pRevelar = passe({ tCena: { value: rtCena.texture }, uExp: { value: opt.exposicao ?? 1.0 }, uSat: { value: opt.saturacao ?? 1.22 } }, /* glsl */`
    varying vec2 vUv; uniform sampler2D tCena; uniform float uExp, uSat;
    vec3 joelho(vec3 x){ vec3 a = min(x, vec3(0.72)); vec3 b = max(x - 0.72, 0.0); return a + (1.0 - exp(-b / 0.28)) * 0.28; }
    void main(){
      vec3 c = max(texture2D(tCena, vUv).rgb, 0.0) * uExp;
      c = joelho(c);
      c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, uSat);
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.35);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`);

  const pTensor = passe({ tBase: { value: rtBase.texture }, uRes: { value: res } }, /* glsl */`
    varying vec2 vUv; uniform sampler2D tBase; uniform vec2 uRes;
    void main(){
      vec2 d = 1.0 / uRes;
      vec3 a = texture2D(tBase, vUv + vec2(-d.x, -d.y)).rgb, b = texture2D(tBase, vUv + vec2(0.0, -d.y)).rgb, c = texture2D(tBase, vUv + vec2(d.x, -d.y)).rgb;
      vec3 e = texture2D(tBase, vUv + vec2(-d.x, 0.0)).rgb, f = texture2D(tBase, vUv + vec2(d.x, 0.0)).rgb;
      vec3 g = texture2D(tBase, vUv + vec2(-d.x, d.y)).rgb, h = texture2D(tBase, vUv + vec2(0.0, d.y)).rgb, i = texture2D(tBase, vUv + vec2(d.x, d.y)).rgb;
      vec3 sx = (-a - 2.0 * e - g + c + 2.0 * f + i) / 4.0;
      vec3 sy = (-a - 2.0 * b - c + g + 2.0 * h + i) / 4.0;
      gl_FragColor = vec4(dot(sx, sx), dot(sy, sy), dot(sx, sy), 1.0);
    }`);

  const fragBorrar = /* glsl */`
    varying vec2 vUv; uniform sampler2D tIn; uniform vec2 uDir;
    void main(){
      vec4 s = vec4(0.0); float w = 0.0;
      for (int i = -12; i <= 12; i++) { float x = float(i); float g = exp(-x * x / 50.0); s += texture2D(tIn, vUv + uDir * x) * g; w += g; }
      gl_FragColor = s / w;
    }`;
  const pBorrarH = passe({ tIn: { value: rtT1.texture }, uDir: { value: new THREE.Vector2(1 / PW, 0) } }, fragBorrar);
  const pBorrarV = passe({ tIn: { value: rtT2.texture }, uDir: { value: new THREE.Vector2(0, 1 / PH) } }, fragBorrar);
  const pLargoH = passe({ tIn: { value: rtT1.texture }, uDir: { value: new THREE.Vector2(2.6 / PW, 0) } }, fragBorrar);
  const pLargoV = passe({ tIn: { value: rtT2.texture }, uDir: { value: new THREE.Vector2(0, 2.6 / PH) } }, fragBorrar);

  const fragKuwahara = /* glsl */`
    varying vec2 vUv; uniform sampler2D tBase, tTensor; uniform vec2 uRes; uniform float uRaio, uAlfa, uQ, uDureza;
    void main(){
      vec4 g = texture2D(tTensor, vUv);
      float disc = sqrt(max((g.x - g.y) * (g.x - g.y) + 4.0 * g.z * g.z, 0.0));
      float l1 = 0.5 * (g.x + g.y + disc), l2 = 0.5 * (g.x + g.y - disc);
      vec2 v = vec2(l1 - g.x, -g.z);
      vec2 tg = length(v) > 1e-7 ? normalize(v) : vec2(1.0, 0.0);
      float phi = atan(tg.y, tg.x);
      float A = (l1 + l2 > 1e-9) ? (l1 - l2) / (l1 + l2) : 0.0;
      float a = uRaio * clamp((uAlfa + A) / uAlfa, 0.1, 2.0), b = uRaio * clamp(uAlfa / (uAlfa + A), 0.1, 2.0);
      float cp = cos(phi), sp = sin(phi);
      mat2 SR = mat2(0.5 / a, 0.0, 0.0, 0.5 / b) * mat2(cp, -sp, sp, cp);
      int mx = int(sqrt(a * a * cp * cp + b * b * sp * sp)), my = int(sqrt(a * a * sp * sp + b * b * cp * cp));
      float zeta = 2.0 / uRaio, zc = 0.58, sz = sin(zc), eta = (zeta + cos(zc)) / (sz * sz);
      vec4 m[8]; vec3 s[8];
      for (int k = 0; k < 8; k++) { m[k] = vec4(0.0); s[k] = vec3(0.0); }
      for (int y = -my; y <= my; y++) for (int x = -mx; x <= mx; x++) {
        vec2 p = SR * vec2(float(x), float(y));
        if (dot(p, p) <= 0.25) {
          vec3 c = texture2D(tBase, vUv + vec2(float(x), float(y)) / uRes).rgb;
          float w[8]; float soma = 0.0, z, vxx, vyy;
          vxx = zeta - eta * p.x * p.x; vyy = zeta - eta * p.y * p.y;
          z = max(0.0, p.y + vxx); w[0] = z * z; soma += w[0];
          z = max(0.0, -p.x + vyy); w[2] = z * z; soma += w[2];
          z = max(0.0, -p.y + vxx); w[4] = z * z; soma += w[4];
          z = max(0.0, p.x + vyy); w[6] = z * z; soma += w[6];
          vec2 q = 0.70710678 * vec2(p.x - p.y, p.x + p.y);
          vxx = zeta - eta * q.x * q.x; vyy = zeta - eta * q.y * q.y;
          z = max(0.0, q.y + vxx); w[1] = z * z; soma += w[1];
          z = max(0.0, -q.x + vyy); w[3] = z * z; soma += w[3];
          z = max(0.0, -q.y + vxx); w[5] = z * z; soma += w[5];
          z = max(0.0, q.x + vyy); w[7] = z * z; soma += w[7];
          float gs = exp(-3.125 * dot(p, p)) / max(soma, 1e-6);
          for (int k = 0; k < 8; k++) { float wk = w[k] * gs; m[k] += vec4(c * wk, wk); s[k] += c * c * wk; }
        }
      }
      vec4 o = vec4(0.0);
      for (int k = 0; k < 8; k++) {
        float n = max(m[k].w, 1e-6);
        vec3 med = m[k].rgb / n, var = abs(s[k] / n - med * med);
        float sig = var.r + var.g + var.b;
        float w = 1.0 / (1.0 + pow(uDureza * 1000.0 * sig, 0.5 * uQ));
        o += vec4(med * w, w);
      }
      gl_FragColor = vec4(o.rgb / max(o.w, 1e-30), 1.0);   // os pesos podem ser minúsculos em área muito detalhada: não dá para cortar em 1e-6
    }`;
  const uK = { tBase: { value: rtBase.texture }, tTensor: { value: rtT1.texture }, uRes: { value: res }, uRaio: { value: RAIO }, uAlfa: { value: 1.0 }, uQ: { value: 8.0 }, uDureza: { value: 8.0 } };
  const pKuwahara = passe(uK, fragKuwahara);
  const pKuwahara2 = passe({ ...uK, tBase: { value: rtTinta.texture }, uRaio: { value: RAIO * 0.5 } }, fragKuwahara);

  // legenda: desenhada num canvas 2D, que o passe final usa como máscara de tinta
  const cv = document.createElement('canvas'); cv.width = VW; cv.height = VH; const cx = cv.getContext('2d');
  const tCap = new THREE.CanvasTexture(cv); tCap.minFilter = THREE.LinearFilter; tCap.generateMipmaps = false;
  let legendaAtual = null, larguraLegenda = 0;
  const X0 = 56, BASE = VH - 61;
  function escreverLegenda(txt) {
    if (txt === legendaAtual) return;
    legendaAtual = txt; cx.clearRect(0, 0, VW, VH);
    if (txt) {
      cx.save(); cx.font = '700 51px "Kalam"'; cx.fillStyle = '#fff'; cx.textBaseline = 'alphabetic';
      cx.translate(X0, BASE); cx.transform(1, 0, -0.16, 1, 0, 0); cx.fillText(txt, 0, 0);
      larguraLegenda = cx.measureText(txt).width + 26; cx.restore();
    }
    tCap.needsUpdate = true;
  }

  const uTela = {
    tTinta: { value: rtTinta2.texture }, tTensor: { value: rtT3.texture }, tCap: { value: tCap }, uRes: { value: new THREE.Vector2(VW, VH) },
    uRelevo: { value: opt.relevo ?? 2.6 }, uContorno: { value: opt.contorno ?? 0.25 },
    cTela: { value: col(C.tela).convertLinearToSRGB() }, cLetra: { value: col(C.letra).convertLinearToSRGB() },
    uCapX: { value: 0 }, uCapA: { value: 0 }, uEntalhe: { value: new THREE.Vector2(0.425, 0.128) },
  };
  const pTela = passe(uTela, GLSL_RUIDO + /* glsl */`
    varying vec2 vUv; uniform sampler2D tTinta, tTensor, tCap; uniform vec2 uRes, uEntalhe; uniform float uRelevo, uContorno, uCapX, uCapA; uniform vec3 cTela, cLetra;
    vec2 direcao(vec2 uv){
      vec4 g = texture2D(tTensor, uv);
      float disc = sqrt(max((g.x - g.y) * (g.x - g.y) + 4.0 * g.z * g.z, 0.0));
      float l1 = 0.5 * (g.x + g.y + disc), l2 = 0.5 * (g.x + g.y - disc);
      vec2 v = vec2(l1 - g.x, -g.z);
      vec2 d = length(v) > 1e-7 ? normalize(v) : vec2(1.0, 0.0);
      float A = (l1 + l2 > 1e-7) ? (l1 - l2) / (l1 + l2) : 0.0;
      vec2 mao = normalize(vec2(0.88, -0.47));          // a mão do pintor: o traço desce para a direita
      if (dot(d, mao) < 0.0) d = -d;
      return normalize(mix(mao, d, smoothstep(0.12, 0.5, A)));
    }
    // 1 onde há tinta; 0 na margem crua e no recorte da legenda. A borda é irregular.
    float mascara(vec2 px){
      float mg = 25.0;
      float dE = min(min(px.x - mg, uRes.x - mg - px.x), min(px.y - mg, uRes.y - mg - px.y));
      float rasgo = (fbm(px * 0.020) - 0.5) * 22.0 + (vnoise(px * 0.15) - 0.5) * 7.0;
      float a = smoothstep(-1.4, 1.4, dE + rasgo);
      float dN = max(px.x - uRes.x * uEntalhe.x, px.y - uRes.y * uEntalhe.y);
      float b = smoothstep(-1.4, 1.4, dN + rasgo * 0.75);
      return a * b;
    }
    float trama(vec2 px){
      vec2 q = px / 3.3; vec2 id = floor(q), f = fract(q);
      float par = mod(id.x + id.y, 2.0);
      float w = mix(sin(f.y * 3.14159), sin(f.x * 3.14159), par) * (0.75 + 0.5 * hash12(id));
      w += (vnoise(vec2(px.x * 0.035, px.y * 0.8)) - 0.5) * 0.30 + (vnoise(vec2(px.x * 0.8, px.y * 0.035)) - 0.5) * 0.22;
      return clamp(w, 0.0, 1.0);
    }
    float altura(vec2 uv){
      vec2 px = uv * uRes;
      vec3 c = texture2D(tTinta, uv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      vec2 d = direcao(uv), n = vec2(-d.y, d.x);
      float cerda = vnoise(vec2(dot(px, n) * 0.20, dot(px, d) * 0.018)) * 0.65 + vnoise(vec2(dot(px, n) * 0.46 + 9.0, dot(px, d) * 0.03)) * 0.35;
      float grumo = vnoise(px * 0.055);
      return (l * 0.78 + cerda * 0.15 + grumo * 0.07) * mascara(px);
    }
    void main(){
      vec2 px = vUv * uRes, e = 1.0 / uRes;
      vec3 tinta = texture2D(tTinta, vUv).rgb;
      float m = mascara(px);
      // relevo: luz rasante de cima e da esquerda
      float k = 1.6;
      vec2 gr = vec2(altura(vUv + vec2(e.x * k, 0.0)) - altura(vUv - vec2(e.x * k, 0.0)), altura(vUv + vec2(0.0, e.y * k)) - altura(vUv - vec2(0.0, e.y * k)));
      float rel = dot(gr, vec2(0.62, -0.62)) * uRelevo;
      vec3 c = tinta * (1.0 + clamp(rel, -0.34, 0.42));
      c += vec3(1.0, 0.96, 0.88) * pow(max(rel, 0.0), 2.0) * 0.10;
      // contorno: escurece onde a cor muda de uma vez
      float k2 = 2.2;
      vec3 dx = texture2D(tTinta, vUv + vec2(e.x * k2, 0.0)).rgb - texture2D(tTinta, vUv - vec2(e.x * k2, 0.0)).rgb;
      vec3 dy = texture2D(tTinta, vUv + vec2(0.0, e.y * k2)).rgb - texture2D(tTinta, vUv - vec2(0.0, e.y * k2)).rgb;
      float borda = smoothstep(0.16, 0.70, length(dx) + length(dy));
      c *= 1.0 - borda * uContorno * 0.55;
      // trama do linho: aparece mais nos escuros, onde a tinta é fina
      float w = trama(px), l = dot(tinta, vec3(0.299, 0.587, 0.114));
      c *= 1.0 + (w - 0.5) * (0.07 + 0.20 * (1.0 - smoothstep(0.0, 0.5, l)));
      c += (w - 0.5) * 0.05 * (1.0 - smoothstep(0.0, 0.35, l));
      // tela crua
      vec3 crua = cTela * (0.90 + 0.15 * w) * (0.97 + 0.06 * fbm(px * 0.012));
      crua *= 1.0 - 0.10 * smoothstep(0.0, 0.5, m) * (1.0 - m);          // sombra fina ao pé da tinta
      c = mix(crua, c, m);
      // legenda manuscrita, escrita da esquerda para a direita
      float a = texture2D(tCap, vUv).a * uCapA * (1.0 - smoothstep(uCapX - 34.0, uCapX, px.x));
      c = mix(c, cLetra * (0.86 + 0.28 * w), a * (0.84 + 0.16 * w));
      gl_FragColor = vec4(c, 1.0);
    }`);

  function render(cena, camera, legenda) {
    renderer.setRenderTarget(rtCena); renderer.clear(); renderer.render(cena, camera);
    renderer.setRenderTarget(rtBase); pRevelar.render(renderer);
    renderer.setRenderTarget(rtT1); pTensor.render(renderer);
    renderer.setRenderTarget(rtT2); pBorrarH.render(renderer);
    renderer.setRenderTarget(rtT1); pBorrarV.render(renderer);
    renderer.setRenderTarget(rtTinta); pKuwahara.render(renderer);
    renderer.setRenderTarget(rtT2); pLargoH.render(renderer);
    renderer.setRenderTarget(rtT3); pLargoV.render(renderer);
    renderer.setRenderTarget(rtTinta2); pKuwahara2.render(renderer);
    escreverLegenda(legenda?.texto ?? '');
    uTela.uCapA.value = legenda?.alfa ?? 0;
    uTela.uCapX.value = X0 - 10 + (larguraLegenda + 44) * (legenda?.escrita ?? 1);
    renderer.setRenderTarget(null); pTela.render(renderer);
  }
  // ver etapas intermediárias: 'cena' (sem filtro), 'base', 'tinta'
  const pVer = passe({ tIn: { value: null } }, `varying vec2 vUv; uniform sampler2D tIn; void main(){ gl_FragColor = vec4(texture2D(tIn, vUv).rgb, 1.0); }`);
  function ver(qual) { pVer.material.uniforms.tIn.value = { base: rtBase, tinta: rtTinta, tinta2: rtTinta2 }[qual].texture; renderer.setRenderTarget(null); pVer.render(renderer); }
  return { render, ver, uTela, uK, pRevelar };
}
