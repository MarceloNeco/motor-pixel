// lapis.js: o kit que faz uma cena 3D sair como desenho a grafite num caderno.
//
// Quatro peças, todas guiadas por um relógio só (uTime), sem estado acumulado:
//   solido(geo, o)     uma forma com hachura decidida pela luz e presa ao objeto, com contorno a lápis
//   tracos.linha(...)  riscos soltos (construção, raios, molas) com largura constante na tela
//   tracos.texto(...)  letra de arquiteto em traço único, escrita letra a letra (ver letras.js)
//   papel              o filtro final: dente, pautas, mancha de mão, marca de borracha
//
// Como a imagem é montada a cada quadro:
//   1. passada G     normal, profundidade e número de cada peça (para achar os contornos)
//   2. contornos     bordas do passo 1 viram dois riscos de lápis levemente desencontrados
//   3. tinta         hachura das peças, sombra no chão, riscos soltos e letras
//   4. papel         junta tudo em cima do papel
import * as THREE from 'three';
import { GLIFOS, MARCAS, COMPOSTOS } from './letras.js';

const v3 = h => { const n = parseInt(h.slice(1), 16); return new THREE.Vector3((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255); };
export function semente(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const RUIDO = /* glsl */`
float h1(float n){ return fract(sin(n * 91.345) * 47453.553); }
float h2(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(h1(i), h1(i + 1.), f); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * n2(p); p = p * 2.03 + 17.7; a *= .5; } return s; }
`;
// quanto falta para o lápis chegar neste ponto da peça. s = posição ao longo da peça (0 a 1); rev = (início, duração)
// negativo = ainda não desenhado · perto de zero = o lápis está passando · 1 = pronto
const MARGEM = /* glsl */`
float margem(float s, vec2 rev, float t, float rag){
  float p = (t - rev.x) / max(rev.y, 1e-4);
  if (p <= 0.) return -1.;
  if (p >= 1.) return 1.;
  return p * 1.06 - (s * .94 + rag * .06);
}`;

export function criarLapis({ renderer, W, H, SS = 2, papel = '#f2ede2', grafite = '#34353b', acento = '#c8432b' }) {
  const PASSO_M = 0.024;                 // distância entre dois riscos de hachura, em metros
  const U = { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) } };
  let nId = 0;
  const solidos = [], soTinta = [];

  // ---------------------------------------------------------------- a folha de hachura
  // Riscos de verdade (começo firme, fim que levanta) desenhados uma vez numa textura que se repete.
  // Vermelho, verde e azul guardam três jogos de riscos que se encaixam um entre o outro: somar um canal
  // deixa a hachura mais densa sem mexer nos riscos que já estavam lá.
  const hachura = (() => {
    const N = 2048, LINHAS = 96, P = N / LINHAS, r = semente(11);
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const c = cv.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(0, 0, N, N); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    const risco = (x, y, comp, canal) => {
      const inclina = (r() - .5) * .07, barriga = (r() - .5) * 7, forca = .45 + r() * .5, larg = 1.9 + r() * 2.3;
      const cor = a => { const v = Math.round(255 * forca * a); return `rgb(${canal === 0 ? v : 0},${canal === 1 ? v : 0},${canal === 2 ? v : 0})`; };
      for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
        const x0 = x + ox, y0 = y + oy, x1 = x0 + comp, y1 = y0 + comp * inclina;
        if (x1 < -20 || x0 > N + 20 || Math.max(y0, y1) < -20 || Math.min(y0, y1) > N + 20) continue;
        const g = c.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, cor(.55)); g.addColorStop(.1, cor(1)); g.addColorStop(.55, cor(.92)); g.addColorStop(1, cor(.22));
        c.strokeStyle = g; c.lineWidth = larg;
        c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + barriga, x1, y1); c.stroke();
      }
    };
    const fileiras = (canal, fase) => { for (let k = 0; k < LINHAS; k++) { let x = -r() * 220; while (x < N) { const comp = 110 + r() * 240; risco(x, (k + fase) * P + (r() - .5) * 9, comp, canal); x += comp + (r() - .3) * 60; } } };
    fileiras(0, 0); fileiras(1, .5); fileiras(2, .25); fileiras(2, .75);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    U.uHachura = { value: t }; U.uDens = { value: 1 / (PASSO_M * LINHAS) };
    return t;
  })();

  // ---------------------------------------------------------------- material de tinta (hachura)
  // Um material iluminado normal, para luz e sombra projetada de verdade. Em vez de mostrar a luz, ele a
  // converte em tom, e o tom em camadas de riscos: um jogo, o jogo do meio, depois uma segunda direção cruzada.
  function matTinta(p) {
    const m = new THREE.MeshLambertMaterial({ color: 0xffffff, side: p.duplo ? THREE.DoubleSide : THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 2 });
    const u = {
      uTime: U.uTime, uHachura: U.uHachura, uDens: U.uDens,
      uRev: { value: p.rev }, uEnche: { value: p.enche },
      uTom: { value: new THREE.Vector4(p.ang ?? 0.85, p.ganho ?? 1.25, p.base ?? 0, p.leque ?? 0.5) },
      uTinta: { value: v3(p.tinta || grafite) },
      uAguada: { value: v3(p.aguada || '#ffffff') }, uAguadaT: { value: new THREE.Vector4(p.aguadaEm ?? -99, p.aguadaDur ?? 0.7, p.aguada ? 1 : 0, p.faixas ?? 9) },
      uPasso: { value: PASSO_M }, uModo: { value: new THREE.Vector2(p.planar ? 1 : 0, p.rasgo ?? 0.12) },
    };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 aHc; attribute float aS; varying vec2 vHc; varying float vS; varying vec3 vON, vOP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHc = aHc; vS = aS; vON = normal; vOP = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uHachura; uniform float uTime, uDens, uPasso; uniform vec2 uRev, uEnche, uModo; uniform vec4 uTom, uAguadaT; uniform vec3 uTinta, uAguada;
          varying vec2 vHc; varying float vS; varying vec3 vON, vOP;
          ${RUIDO}
          ${MARGEM}
          vec2 gira(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c * p.x + s * p.y, -s * p.x + c * p.y); }
          // a mão já passou por este risco? cada fileira de riscos tem o seu próprio atraso, então a frente avança risco a risco
          float posto(vec2 h, float s, float p){ float fileira = floor(h.y / uPasso * 2.); return step(s * .8 + h1(fileira * 1.37) * .2, p); }`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          if (margem(vS, uRev, uTime, n2(vHc * 60.)) < 0.) discard;`)
        .replace('#include <opaque_fragment>', `
          vec3 oN = normalize(vON);
          // a folha de hachura: a da própria peça ou, nas formas curvas, três folhas planas (de lado, de cima, de frente).
          // Quem desenha à mão não embrulha o risco na curva: trata a forma como planos e risca reto em cada um.
          vec2 hc = vHc; float plano = 0.;
          if (uModo.x > .5) { vec3 an = abs(oN); if (an.z >= max(an.x, an.y)) hc = vOP.xy; else if (an.y >= an.x) { hc = vOP.xz; plano = 1.; } else { hc = vOP.zy; plano = 2.; } }
          float ang = uModo.x > .5 ? uTom.x + plano * uTom.w * 1.3 : uTom.x + uTom.w * (oN.x * .8 + oN.y * .5 - oN.z * .3);
          vec2 hA = gira(hc, ang), hB = gira(hc, ang - 1.15);
          hA.y += (n2(hc * 4. + 1.3) - .5) * .007; hB.y += (n2(hc * 4. + 7.7) - .5) * .007;       // o pulso faz arcos rasos, não régua
          float luz = dot(outgoingLight, vec3(.3333));
          float esc = clamp(1. - (luz * uTom.y + uTom.z), 0., 1.);
          esc += (n2(hc * 5. + 3.7) - .5) * .10 * smoothstep(.04, .2, esc);                      // mão irregular: as camadas entram em manchas
          // cada risco para num ponto um pouco diferente: a borda de uma sombra fica desfiada, não em degraus
          float rasgo = uModo.y * smoothstep(.02, .14, esc);
          float eA = esc + (h1(floor(hA.y / uPasso * 2.) * 1.7 + 3.) - .5) * rasgo, eB = esc + (h1(floor(hB.y / uPasso * 2.) * 2.3 + 9.) - .5) * rasgo;
          float pE = (uTime - uEnche.x) / max(uEnche.y, 1e-4);
          float pA = posto(hA, vS, clamp(pE * 1.7, 0., 1.)), pB = posto(hB, vS, clamp((pE - .42) / .58, 0., 1.));
          vec3 sA = texture2D(uHachura, hA * uDens + .37).rgb, sB = texture2D(uHachura, hB * uDens * 1.06 + .11).rgb;
          float tinta = 1. - (1. - sA.r * smoothstep(.10, .22, eA) * pA) * (1. - sA.g * smoothstep(.28, .40, eA) * pA)
            * (1. - sB.r * smoothstep(.44, .56, eB) * pB) * (1. - sB.g * smoothstep(.60, .70, eB) * pB)
            * (1. - sA.b * smoothstep(.74, .84, eA) * pA) * (1. - sB.b * smoothstep(.86, .95, eB) * pB);
          tinta *= .58 + .42 * smoothstep(.12, .8, esc);                                         // tom claro se desenha com mão leve
          vec3 cor = vec3(1.);
          if (uAguadaT.z > .5) {
            // aguada de marcador: faixas ao longo da peça, uma puxada de caneta por faixa, uma depois da outra
            float nf = uAguadaT.w, f = vHc.y / (uPasso * 5.2), fi = floor(f), dentro = fract(f);
            float ordem = fract(fi / nf + .5);                                                    // em que momento esta faixa é puxada
            float pf = clamp(((uTime - uAguadaT.x) / uAguadaT.y - ordem * .72) / .28, 0., 1.);
            float cobre = step(vS + (h1(fi * 3.1) - .5) * .05, pf * 1.06 - .03);
            float borda = smoothstep(0., .1, dentro) * smoothstep(1., .9, dentro);              // onde duas puxadas se sobrepõem fica mais carregado
            float carga = .80 + .12 * h1(fi * 7.7) + (1. - borda) * .16 + (n2(vHc * 40.) - .5) * .10;
            cor = mix(cor, uAguada, clamp(carga, 0., 1.) * cobre);
          }
          cor = mix(cor, uTinta, clamp(tinta, 0., 1.) * .93);
          gl_FragColor = vec4(cor, 1.);`);
    };
    m.customProgramCacheKey = () => 'tinta';
    return m;
  }

  // ---------------------------------------------------------------- material da passada G (contornos)
  function matG(p, id) {
    return new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, side: p.duplo ? THREE.DoubleSide : THREE.FrontSide,
      uniforms: { uTime: U.uTime, uRev: { value: p.rev }, uId: { value: id }, uPeso: { value: p.peso ?? 1 } },
      vertexShader: /* glsl */`
        in vec3 position; in vec3 normal; in float aS; in vec2 aHc;
        uniform mat4 modelViewMatrix, projectionMatrix; uniform mat3 normalMatrix;
        out vec3 vN; out float vProf, vS; out vec2 vHc;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalMatrix * normal; vProf = -mv.z; vS = aS; vHc = aHc; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`
        precision highp float;
        layout(location = 0) out vec4 oA; layout(location = 1) out vec4 oB;
        uniform float uTime, uId, uPeso; uniform vec2 uRev;
        in vec3 vN; in float vProf, vS; in vec2 vHc;
        ${RUIDO}
        ${MARGEM}
        void main(){
          float m = margem(vS, uRev, uTime, n2(vHc * 60.));
          if (m < 0.) discard;
          vec3 n = normalize(vN) * (gl_FrontFacing ? 1. : -1.);
          oA = vec4(n, vProf); oB = vec4(uId, clamp(m / .07, 0., 1.), uPeso, 1.);
        }`,
    });
  }
  function matSombra(p) {
    const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { uTime: U.uTime, uRev: { value: p.rev } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aS; varying float vS;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvS = aS;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform float uTime; uniform vec2 uRev; varying float vS;\n${MARGEM}`)
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (margem(vS, uRev, uTime, .5) < 0.) discard;');
    };
    m.customProgramCacheKey = () => 'sombra';
    return m;
  }

  // ---------------------------------------------------------------- peças
  // o: em / dur (quando o contorno é desenhado) · enche / encheDur (quando a mão hachura)
  //    ang, ganho, base, leque (tom) · aguada, aguadaEm, aguadaDur (marcador) · duplo · peso (força do contorno) · sombra
  function solido(geo, o = {}) {
    if (!geo.getAttribute('aS')) varrer(geo, o.varre || [1, 0.4, 0.3]);
    if (!geo.getAttribute('aHc')) hcPlano(geo);
    const em = o.em ?? -99, dur = o.dur ?? 0.3;
    const p = { ...o, rev: new THREE.Vector2(em, dur), enche: new THREE.Vector2(o.enche ?? em + dur * 0.8, o.encheDur ?? 0.55) };
    const mesh = new THREE.Mesh(geo, matTinta(p));
    mesh.userData.tinta = mesh.material; mesh.userData.g = matG(p, ++nId);
    mesh.customDepthMaterial = matSombra(p);
    mesh.castShadow = o.sombra !== false; mesh.receiveShadow = o.recebe !== false;
    solidos.push(mesh);
    return mesh;
  }
  // o chão: não tem contorno, só recebe a sombra e a converte em hachura
  function chao(tam = 14) {
    const geo = new THREE.PlaneGeometry(tam, tam).rotateX(-Math.PI / 2);
    varrer(geo, [1, 0, 0]); hcPlano(geo);
    const p = { rev: new THREE.Vector2(-99, 1), enche: new THREE.Vector2(-99, 1), ang: 1.0, ganho: 1.7, base: 0.24, leque: 0, rasgo: 0.42 };
    const mesh = new THREE.Mesh(geo, matTinta(p));
    mesh.material.depthWrite = false; mesh.renderOrder = -5; mesh.receiveShadow = true;
    soTinta.push(mesh);
    return mesh;
  }

  // ---------------------------------------------------------------- riscos soltos
  // Cada risco é uma fita de dois vértices por ponto, alargada na tela (largura constante em pixels), com tremor,
  // pressão que varia e um começo e um fim que se desenham. Tudo o que é linha fina passa por aqui.
  function Tracos({ plano = false, atravessa = false } = {}) {
    const fitas = [];
    const api = {
      mesh: null, plano, evita: [[0, 0, 0, 0], [0, 0, 0, 0]],
      // pts: pontos [x, y, z] (ou [x, y] na camada plana, em pixels) · o: em, dur, larg (px), forca (0 a 1), cor (0 grafite, 1 vermelho),
      // passa (quanto estica além das pontas, na unidade dos pontos), treme (px), seed
      linha(pts, o = {}) { fitas.push({ pts: pts.map(q => q.length === 2 ? [q[0], q[1], 0] : q), o }); return api; },
      // texto em traço único. Na camada plana: pos = [x, y] da linha de base, alt = altura da maiúscula em px.
      // Em 3D: passe eixoX e eixoY (vetores) para deitar o texto num plano.
      texto(str, pos, alt, o = {}) {
        const r = semente(o.seed ?? 3), esp = o.esp ?? 0.24, porLetra = o.porLetra ?? 0.075;
        let x = 0, i = 0, ant = ''; const ex = o.eixoX, ey = o.eixoY;
        for (const ch0 of str.toUpperCase()) {
          const comp = COMPOSTOS[ch0], ch = comp ? comp[0] : ch0, g = GLIFOS[ch];
          if (!g) { x += 0.4; ant = ''; continue; }
          x += aperta(ant, ch); ant = ch;
          const rot = (r() - .5) * .05, sobe = (r() - .5) * .035, esc = 1 + (r() - .5) * .05, t0 = (o.em ?? -99) + i * porLetra;
          const riscos = [...g.s, ...(comp ? MARCAS[comp[1]](g.w / 2) : [])];
          riscos.forEach((s, k) => {
            const P = s.map(([px, py]) => {
              const cx = px - g.w / 2, cy = py - .5, qx = (cx * Math.cos(rot) - cy * Math.sin(rot)) * esc + g.w / 2 + x, qy = (cx * Math.sin(rot) + cy * Math.cos(rot)) * esc + .5 + sobe;
              if (ex) return [pos[0] + (ex[0] * qx + ey[0] * qy) * alt, pos[1] + (ex[1] * qx + ey[1] * qy) * alt, pos[2] + (ex[2] * qx + ey[2] * qy) * alt];
              return [pos[0] + qx * alt, pos[1] - qy * alt, 0];
            });
            api.linha(P, { larg: o.larg ?? 2.3, forca: o.forca ?? 0.92, cor: o.cor ?? 0, treme: o.treme ?? 0.5, em: t0 + k * porLetra * 0.45, dur: porLetra * 0.9, passa: 0, seed: r() * 99, fino: 0.2 });
          });
          x += g.w + esp; if (g.s.length) i++;
        }
        return x - esp;                    // largura em alturas de maiúscula
      },
      largura(str, esp = 0.24) { let x = 0, ant = ''; for (const ch0 of str.toUpperCase()) { const c = COMPOSTOS[ch0], ch = c ? c[0] : ch0, g = GLIFOS[ch]; x += (g ? g.w + aperta(ant, ch) : 0.4) + esp; ant = g ? ch : ''; } return x - esp; },
      limpar() { fitas.length = 0; return api; },
      montar() {
        const pos = [], prev = [], next = [], lado = [], A = [], B = [], C = [], idx = [];
        let n = 0; const passoAm = plano ? 7 : 0.028, pxPorUn = plano ? 1 : 470;
        for (const { pts, o } of fitas) {
          // estica as pontas e reamostra em passos curtos, para o tremor ter onde agir
          const P = pts.map(q => new THREE.Vector3(...q));
          if (o.passa && P.length > 1) { const a = P[0].clone().sub(P[1]).normalize().multiplyScalar(o.passa), b = P[P.length - 1].clone().sub(P[P.length - 2]).normalize().multiplyScalar(o.passa); P[0].add(a); P[P.length - 1].add(b); }
          const R = [P[0].clone()]; let compr = 0; const acc = [0];
          for (let i = 1; i < P.length; i++) { const d = P[i].distanceTo(P[i - 1]), k = Math.max(1, Math.ceil(d / passoAm)); for (let j = 1; j <= k; j++) { R.push(P[i - 1].clone().lerp(P[i], j / k)); compr += d / k; acc.push(compr); } }
          if (R.length < 2) continue;
          const seed = o.seed ?? (n * 0.371 + 1), base = n;
          for (let i = 0; i < R.length; i++) {
            const a = R[Math.max(0, i - 1)], b = R[Math.min(R.length - 1, i + 1)], u = compr > 0 ? acc[i] / compr : 0;
            for (const s of [-1, 1]) {
              pos.push(R[i].x, R[i].y, R[i].z); prev.push(a.x, a.y, a.z); next.push(b.x, b.y, b.z); lado.push(s);
              A.push(u, compr * pxPorUn, seed, o.cor ?? 0); B.push(o.em ?? -99, o.dur ?? 0.3, o.larg ?? 1.8, o.forca ?? 0.8); C.push(o.treme ?? 1.2, o.fino ?? 0.5);
              n++;
            }
            if (i > 0) { const k = base + i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
          }
        }
        const geo = new THREE.BufferGeometry();
        const f = (a, k) => new THREE.Float32BufferAttribute(a, k);
        geo.setAttribute('position', f(pos, 3)); geo.setAttribute('aPrev', f(prev, 3)); geo.setAttribute('aNext', f(next, 3)); geo.setAttribute('aLado', f(lado, 1));
        geo.setAttribute('aA', f(A, 4)); geo.setAttribute('aB', f(B, 4)); geo.setAttribute('aC', f(C, 2)); geo.setIndex(idx);
        if (api.mesh) { api.mesh.geometry.dispose(); api.mesh.geometry = geo; return api.mesh; }
        const mat = new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, depthTest: !plano && !atravessa, side: THREE.DoubleSide,
          ...(plano ? { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor } : {}),
          uniforms: { uTime: U.uTime, uRes: U.uRes, uGrafite: { value: v3(grafite) }, uAcento: { value: v3(acento) }, uFraco: { value: 1 }, uPre: { value: plano ? 1 : 0 }, uEvitaA: { value: new THREE.Vector4(...api.evita[0]) }, uEvitaB: { value: new THREE.Vector4(...api.evita[1]) } },
          vertexShader: /* glsl */`
            attribute vec3 aPrev, aNext; attribute float aLado; attribute vec4 aA, aB; attribute vec2 aC;
            uniform vec2 uRes; uniform float uTime;
            varying float vU, vD, vMeia, vComp, vSeed, vCor, vEm, vDur, vForca;
            ${RUIDO}
            void main(){
              vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.), a = projectionMatrix * modelViewMatrix * vec4(aPrev, 1.), b = projectionMatrix * modelViewMatrix * vec4(aNext, 1.);
              vec2 meio = uRes * .5, d = b.xy / b.w * meio - a.xy / a.w * meio;
              d = length(d) > 1e-4 ? normalize(d) : vec2(1., 0.);
              vec2 nrm = vec2(-d.y, d.x);
              float u = aA.x, compr = aA.y;
              float larg = aB.z * (1. - aC.y * (1. - smoothstep(0., .07, u)) * .5) * (1. - aC.y * smoothstep(.82, 1., u));   // entra firme, levanta no fim
              float treme = ((n1(u * compr / 85. + aA.z * 17.) - .5) * 2. + (n1(u * compr / 23. + aA.z * 5.) - .5) * .5) * aC.x;
              vMeia = larg * .5; vD = aLado * (vMeia + 1.2);
              c.xy += nrm * (vD + treme) / meio * c.w;
              vU = u; vComp = compr; vSeed = aA.z; vCor = aA.w; vEm = aB.x; vDur = aB.y; vForca = aB.w;
              gl_Position = c;
            }`,
          fragmentShader: /* glsl */`
            uniform float uTime, uFraco, uPre; uniform vec3 uGrafite, uAcento; uniform vec4 uEvitaA, uEvitaB; uniform vec2 uRes;
            varying float vU, vD, vMeia, vComp, vSeed, vCor, vEm, vDur, vForca;
            ${RUIDO}
            float longe(vec4 r, vec2 p){ if (r.z <= r.x) return 1.; vec2 d = max(max(r.xy - p, p - r.zw), 0.); return smoothstep(0., 34., length(d)); }
            void main(){
              float p = clamp((uTime - vEm) / max(vDur, 1e-4), 0., 1.);
              if (vU > p || p <= 0.) discard;
              float lado = 1. - smoothstep(vMeia - .55, vMeia + .65, abs(vD));
              float press = .70 + .30 * n1(vU * vComp / 42. + vSeed * 31.);
              press *= 1. - .35 * smoothstep(.85, 1., vU);
              vec2 fp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
              float al = vForca * lado * press * uFraco * longe(uEvitaA, fp) * longe(uEvitaB, fp); vec3 c = mix(uGrafite, uAcento, vCor);
              gl_FragColor = uPre > .5 ? vec4(c * al, al) : vec4(c, al);
            }`,
        });
        api.mesh = new THREE.Mesh(geo, mat); api.mesh.frustumCulled = false; api.mesh.renderOrder = plano ? 30 : 20;
        if (!plano) soTinta.push(api.mesh);
        return api.mesh;
      },
    };
    return api;
  }

  // ---------------------------------------------------------------- alvos e passadas de tela cheia
  const rtG = new THREE.WebGLRenderTarget(W * SS, H * SS, { count: 2, type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
  const rtBorda = new THREE.WebGLRenderTarget(W * SS, H * SS, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const rtTinta = new THREE.WebGLRenderTarget(W, H, { samples: 4, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  const rtPlana = new THREE.WebGLRenderTarget(W, H, { samples: 4, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const camTela = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const cenaTela = new THREE.Scene(); cenaTela.add(quad);
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';

  // contornos: onde muda a peça, a profundidade dá um salto ou a superfície dobra, passa um risco. São dois riscos por
  // borda, cada um com o seu tremor, para dar o traço repassado de quem desenha à mão.
  const matBorda = new THREE.ShaderMaterial({
    uniforms: { tA: { value: rtG.textures[0] }, tB: { value: rtG.textures[1] }, uPx: { value: new THREE.Vector2(1 / (W * SS), 1 / (H * SS)) }, uRes: U.uRes, uSS: { value: SS }, uFerve: { value: new THREE.Vector2(0, 0) } },
    vertexShader: VS,
    fragmentShader: /* glsl */`
      uniform sampler2D tA, tB; uniform vec2 uPx, uRes, uFerve; uniform float uSS; varying vec2 vUv;
      ${RUIDO}
      float risco(vec2 uv, float raio){
        vec4 a0 = texture2D(tA, uv), b0 = texture2D(tB, uv);
        float d0 = b0.r > .5 ? a0.w : 60., mMin = b0.r > .5 ? b0.g : 1., peso = b0.b;
        float eId = 0., dobra = 0., lapX = 0., lapY = 0.;
        for (int i = 0; i < 4; i++) {
          vec2 o = i == 0 ? vec2(1., 0.) : i == 1 ? vec2(-1., 0.) : i == 2 ? vec2(0., 1.) : vec2(0., -1.);
          vec2 q = uv + o * raio * uPx;
          vec4 a = texture2D(tA, q), b = texture2D(tB, q);
          float d = b.r > .5 ? a.w : 60.;
          if (abs(b.r - b0.r) > .5) { eId = 1.; peso = max(peso, b.b); }
          else if (b.r > .5) dobra = max(dobra, 1. - dot(a0.xyz, a.xyz));
          if (b.r > .5) mMin = min(mMin, b.g);
          if (i < 2) lapX += d - d0; else lapY += d - d0;
        }
        float salto = smoothstep(.010, .022, max(abs(lapX), abs(lapY)) * step(d0, 59.));
        float e = max(eId, max(salto * .95, smoothstep(.22, .5, dobra) * .62));
        return e * mix(.55, 1., clamp(peso, 0., 1.)) * smoothstep(0., 1., mMin);
      }
      // o contorno de fora (peça contra papel): é o que o desenhista repassa com mais força
      float fora(vec2 uv, float raio){
        vec4 b0 = texture2D(tB, uv); float c = step(.5, b0.r), dif = 0., m = c > .5 ? b0.g : 1.;
        for (int i = 0; i < 4; i++) {
          vec2 o = i == 0 ? vec2(.7, .7) : i == 1 ? vec2(-.7, .7) : i == 2 ? vec2(.7, -.7) : vec2(-.7, -.7);
          vec4 b = texture2D(tB, uv + o * raio * uPx); float k = step(.5, b.r);
          dif = max(dif, abs(k - c)); if (k > .5) m = min(m, b.g);
        }
        return dif * smoothstep(0., 1., m);
      }
      void main(){
        vec2 px = vUv * uRes;
        vec2 t1 = (vec2(n2(px / 75. + 3.1), n2(px / 75. + 41.7)) - .5) * 2.0 + (vec2(n2(px / 19. + 9.), n2(px / 19. + 77.)) - .5) * .7;
        vec2 t2 = (vec2(n2(px / 120. + 13.3), n2(px / 120. + 91.2)) - .5) * 6.4 + (vec2(n2(px / 31. + 5.), n2(px / 31. + 57.)) - .5) * 1.2;
        // fervura: com a câmera parada, o contorno treme de leve a 8 trocas por segundo, como desenho refeito quadro a quadro
        vec2 fv = (vec2(n2(px / 34. + uFerve.x * 7.13), n2(px / 34. + 50. + uFerve.x * 3.71)) - .5) * 2. * uFerve.y; t1 += fv; t2 += fv * 1.6;
        float e1 = risco(vUv + t1 / uRes, 1.15 * uSS * .5 + .25) * .82, f1 = fora(vUv + t1 / uRes, 2.3 * uSS * .5);
        vec4 a0 = texture2D(tA, vUv), b0 = texture2D(tB, vUv); float halo = 0.;
        if (b0.r > .5) for (int i = 0; i < 8; i++) {
          float an = float(i) * .7854; vec2 q = vUv + vec2(cos(an), sin(an)) * 4.2 * uSS * uPx;
          vec4 a = texture2D(tA, q), b = texture2D(tB, q);
          if (b.r > .5 && abs(b.r - b0.r) > .5 && a.w < a0.w - .075) halo = max(halo, b.g);
        }
        gl_FragColor = vec4(max(e1, f1), max(risco(vUv + t2 / uRes, 1.0 * uSS * .5 + .2), fora(vUv + t2 / uRes, 1.4 * uSS * .5)), halo, 1.);
      }`,
  });

  // o papel: cor, dente, pautas, manchas e a marca de borracha; por cima, a tinta e os contornos
  const matPapel = new THREE.ShaderMaterial({
    uniforms: {
      tTinta: { value: rtTinta.texture }, tBorda: { value: rtBorda.texture }, tPlana: { value: rtPlana.texture }, uRes: U.uRes,
      uPapel: { value: v3(papel) }, uGrafite: { value: v3(grafite) },
      uMancha: { value: new THREE.Vector4(1190, 960, 260, 0.10) }, uBorracha: { value: new THREE.Vector4(1035, 268, 185, -0.33) },
      uDebug: { value: 0 },
    },
    vertexShader: VS,
    fragmentShader: /* glsl */`
      uniform sampler2D tTinta, tBorda, tPlana; uniform vec2 uRes; uniform vec3 uPapel, uGrafite; uniform vec4 uMancha, uBorracha; uniform float uDebug; varying vec2 vUv;
      ${RUIDO}
      void main(){
        vec2 px = vec2(vUv.x, 1. - vUv.y) * uRes;
        // dente do papel: grão fino que deixa a tinta leve falhar
        float dente = n2(px * .95) * .55 + n2(px * 2.3 + 40.) * .45;
        float nuvem = fbm(px / 420.);
        float larga = fbm(px / 900. + 31.);
        vec3 cor = uPapel * (1. + (nuvem - .5) * .06 + (larga - .5) * .07) * (1. - (dente - .5) * .04);
        // bordas da página um pouco mais escuras
        vec2 q = abs(vUv - .5) * 2.; cor *= 1. - .03 * smoothstep(.82, 1., max(q.x, q.y));
        // marca de borracha: uma faixa inclinada onde o grafite saiu quase todo e o papel ficou mais limpo
        vec2 b = px - uBorracha.xy; float cb = cos(uBorracha.w), sb = sin(uBorracha.w); b = vec2(cb * b.x + sb * b.y, -sb * b.x + cb * b.y);
        float borr = (1. - smoothstep(.72, 1.05, abs(b.x) / uBorracha.z + (n2(px / 22.) - .5) * .28)) * (1. - smoothstep(.6, 1.1, abs(b.y) / (uBorracha.z * .21) + (n2(px / 15. + 9.) - .5) * .5));
        cor = mix(cor, uPapel * 1.012, borr * .55);
        // mancha de mão: grafite arrastado, em riscos longos e moles
        vec2 mm = (px - uMancha.xy) / uMancha.z; float man = (1. - smoothstep(.25, 1.25, length(mm * vec2(.55, 1.5)) + (fbm(px / 90. + 5.) - .5) * .9));
        man *= .55 + .45 * n2(vec2(px.x / 140. + px.y / 60., px.y / 9.));
        cor = mix(cor, uGrafite, man * uMancha.w);

        vec3 papelAqui = cor;
        vec3 tinta = texture2D(tTinta, vUv).rgb; vec3 bd = texture2D(tBorda, vUv).rgb;
        tinta = mix(tinta, vec3(1.), bd.b * .82);                                             // halo: a peça da frente abre um vão na hachura da de trás
        float press = .55 + .45 * n2(px / 46. + 3.);
        float escuro = 1. - dot(tinta, vec3(.3333));
        // tinta leve falha no dente; tinta carregada cobre
        float pega = smoothstep(.30 - escuro * .5, .62 - escuro * .35, dente + escuro * .25);
        tinta = mix(vec3(1.), tinta, mix(.42, 1., pega) * (1. - borr * .72));
        cor *= tinta;
        float linha = max(bd.r * press, bd.g * .42 * (.5 + .5 * n2(px / 60. + 20.)));
        float pegaL = smoothstep(.22, .5, dente + linha * .45);
        cor = mix(cor, uGrafite, clamp(linha * mix(.36, 1., pegaL) * .95, 0., 1.) * (1. - borr * .6));
        // letras e linhas-guia: abrem um halo de papel no que cruzam e entram por cima
        vec4 pl = texture2D(tPlana, vUv); float aura = pl.a;
        for (int i = 0; i < 8; i++) { float an = float(i) * .7854; aura = max(aura, texture2D(tPlana, vUv + vec2(cos(an), sin(an)) * 4.5 / uRes).a); }
        cor = mix(cor, papelAqui, clamp(aura * 1.6, 0., 1.) * .86);
        if (pl.a > .001) cor = mix(cor, pl.rgb / pl.a, pl.a * mix(.6, 1., smoothstep(.2, .5, dente + pl.a * .4)));
        if (uDebug > .5) cor = texture2D(tTinta, vUv).rgb;
        gl_FragColor = vec4(cor, 1.);
      }`,
  });

  const preto = new THREE.Color(0, 0, 0), branco = new THREE.Color(1, 1, 1);
  function render(cena, camera, cenaPlana, camPlana, t) {
    U.uTime.value = t;
    cena.updateMatrixWorld(true);
    // 1. passada G
    for (const m of solidos) m.material = m.userData.g;
    for (const m of soTinta) m.visible = false;
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = false;
    renderer.setRenderTarget(rtG); renderer.setClearColor(preto, 0); renderer.clear(); renderer.render(cena, camera);
    // 2. contornos
    quad.material = matBorda; renderer.setRenderTarget(rtBorda); renderer.render(cenaTela, camTela);
    // 3. tinta
    for (const m of solidos) m.material = m.userData.tinta;
    for (const m of soTinta) m.visible = true;
    renderer.shadowMap.needsUpdate = true;
    renderer.setRenderTarget(rtTinta); renderer.setClearColor(branco, 1); renderer.clear(); renderer.render(cena, camera);
    renderer.setRenderTarget(rtPlana); renderer.setClearColor(preto, 0); renderer.clear(); if (cenaPlana) renderer.render(cenaPlana, camPlana);
    // 4. papel
    quad.material = matPapel; renderer.setRenderTarget(null); renderer.render(cenaTela, camTela);
  }

  const ferve = (semente, px) => matBorda.uniforms.uFerve.value.set(semente, px);
  return { solido, chao, Tracos, render, ferve, U, matPapel, PASSO_M, cores: { papel, grafite, acento } };
}

// ---------------------------------------------------------------- coordenadas de hachura e de varredura
// aHc: onde cada ponto cai numa folha plana estendida sobre a superfície, em metros. É o que prende a hachura à peça.
// aS:  posição ao longo da peça, de 0 a 1. É por onde o lápis passa quando a peça é desenhada.
const PARES = new Set(['TA', 'AT', 'AV', 'VA', 'AW', 'WA', 'AY', 'YA', 'LT', 'FA', 'PA']);
const aperta = (a, b) => PARES.has(a + b) ? -0.13 : 0;
const _n = new THREE.Vector3(), _p = new THREE.Vector3(), _t = new THREE.Vector3(), _b = new THREE.Vector3(), CIMA = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0);
export function hcPlano(geo) {            // faces planas (caixas, discos): a folha é o próprio plano da face
  const P = geo.getAttribute('position'), N = geo.getAttribute('normal'), a = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) {
    _p.fromBufferAttribute(P, i); _n.fromBufferAttribute(N, i);
    if (Math.abs(_n.y) > 0.92) _t.copy(X); else _t.crossVectors(CIMA, _n).normalize();
    _b.crossVectors(_n, _t);
    a[i * 2] = _p.dot(_t); a[i * 2 + 1] = _p.dot(_b);
  }
  geo.setAttribute('aHc', new THREE.BufferAttribute(a, 2)); return geo;
}
export function hcUV(geo, su, sv) {       // superfícies curvas: a folha é o UV desenrolado, na medida real (su, sv em metros)
  const uv = geo.getAttribute('uv'), a = new Float32Array(uv.count * 2);
  for (let i = 0; i < uv.count; i++) { a[i * 2] = uv.getX(i) * su; a[i * 2 + 1] = uv.getY(i) * sv; }
  geo.setAttribute('aHc', new THREE.BufferAttribute(a, 2)); return geo;
}
export function hcCilindro(geo, raio) {   // CylinderGeometry: lateral desenrolada, tampas planas
  const P = geo.getAttribute('position'), N = geo.getAttribute('normal'), uv = geo.getAttribute('uv'), a = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) {
    if (Math.abs(N.getY(i)) > 0.9) { a[i * 2] = P.getX(i); a[i * 2 + 1] = P.getZ(i); }
    else { a[i * 2] = uv.getX(i) * 2 * Math.PI * raio; a[i * 2 + 1] = P.getY(i); }
  }
  geo.setAttribute('aHc', new THREE.BufferAttribute(a, 2)); return geo;
}
export function varrer(geo, dir) {        // varre a peça numa direção (vetor) ou ao longo do UV ('u' ou 'v')
  const P = geo.getAttribute('position'), a = new Float32Array(P.count);
  if (dir === 'u' || dir === 'v') { const uv = geo.getAttribute('uv'); for (let i = 0; i < P.count; i++) a[i] = dir === 'u' ? uv.getX(i) : uv.getY(i); }
  else {
    const d = new THREE.Vector3(...dir).normalize(); let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < P.count; i++) { const s = _p.fromBufferAttribute(P, i).dot(d); a[i] = s; lo = Math.min(lo, s); hi = Math.max(hi, s); }
    for (let i = 0; i < P.count; i++) a[i] = (a[i] - lo) / Math.max(1e-6, hi - lo);
  }
  geo.setAttribute('aS', new THREE.BufferAttribute(a, 1)); return geo;
}
