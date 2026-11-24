// Ferramentas comuns: matemática, sorteio com semente, ruído e a tinta (material com cor quebrada).
import * as THREE from 'three';

export const PI = Math.PI, D2R = PI / 180;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const easeOutCubic = x => 1 - Math.pow(1 - clamp(x), 3);
export const easeInOut = x => { const u = clamp(x); return u * u * (3 - 2 * u); };
// passa um pouco do alvo e volta (abrir guarda-sol, veneziana)
export const easeOutBack = (x, s = 1.7) => { const u = clamp(x) - 1; return 1 + (s + 1) * u * u * u + s * u * u; };
export const col = hex => new THREE.Color(hex);

export function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// curva por chaves [[t, v], ...], cúbica monotônica: não passa do alvo entre duas chaves
export function track(keys) {
  const n = keys.length, xs = keys.map(k => k[0]), ys = keys.map(k => k[1]);
  const d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
  }
  return t => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], u = (t - xs[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}

// ---------------------------------------------------------------- ruído em JS (para o relevo do terreno)
function h2(ix, iy) { let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
export function ruido2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(h2(ix, iy), h2(ix + 1, iy), ux), lerp(h2(ix, iy + 1), h2(ix + 1, iy + 1), ux), uy);
}
export function fbm2(x, y, oit = 4) { let s = 0, a = 0.5, n = 0; for (let i = 0; i < oit; i++) { s += a * ruido2(x, y); n += a; x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; a *= 0.5; } return s / n; }

// ---------------------------------------------------------------- ruído em GLSL
export const GLSL_RUIDO = /* glsl */`
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float hash13(vec3 p3){ p3=fract(p3*.1031); p3+=dot(p3,p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1.,0.)),u.x), mix(hash12(i+vec2(0.,1.)),hash12(i+vec2(1.,1.)),u.x), u.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return s/0.9375; }
float vnoise3(vec3 p){ vec3 i=floor(p), f=fract(p); vec3 u=f*f*(3.-2.*f);
  float a=hash13(i), b=hash13(i+vec3(1.,0.,0.)), c=hash13(i+vec3(0.,1.,0.)), d=hash13(i+vec3(1.,1.,0.));
  float e=hash13(i+vec3(0.,0.,1.)), f1=hash13(i+vec3(1.,0.,1.)), g=hash13(i+vec3(0.,1.,1.)), h=hash13(i+vec3(1.,1.,1.));
  return mix(mix(mix(a,b,u.x),mix(c,d,u.x),u.y), mix(mix(e,f1,u.x),mix(g,h,u.x),u.y), u.z); }
// células de Voronoi: devolvem o "endereço" da célula mais próxima; cada célula vira um toque de pincel
vec3 celula3(vec3 q){ vec3 i=floor(q), f=fract(q); float dm=9.0; vec3 id=i;
  for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec3 g=vec3(float(x),float(y),float(z));
    vec3 o=vec3(hash13(i+g), hash13(i+g+19.1), hash13(i+g+47.7)); vec3 r=g+o-f; float d=dot(r,r); if(d<dm){ dm=d; id=i+g; } }
  return id; }
vec2 celula2(vec2 q){ vec2 i=floor(q), f=fract(q); float dm=9.0; vec2 id=i;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g=vec2(float(x),float(y));
    vec2 o=vec2(hash12(i+g), hash12(i+g+19.1)); vec2 r=g+o-f; float d=dot(r,r); if(d<dm){ dm=d; id=i+g; } }
  return id; }
`;

// ---------------------------------------------------------------- tinta
// Material fosco com "cor quebrada": manchas de valor e toques de uma segunda cor, presos à superfície
// do objeto (não à tela). É o que o filtro de pintura transforma em pinceladas.
//   cor      cor de base
//   salpico  cor dos toques (a vizinha ou a oposta da base)
//   quanto   força dos toques (0 a 1)
//   valor    variação de claro e escuro (0 a 1)
//   escala   [x, y, z] das manchas: número menor num eixo = mancha comprida nesse eixo
//   inclina  quanto o toque deita de lado conforme sobe (0 = em pé ou deitado, 0.6 = em diagonal)
//   espaco   'objeto' (padrão) ou 'mundo'
//   luz      false para um material que não recebe luz (interior aceso, por exemplo)
export function tinta({ cor, salpico = null, quanto = 0.3, valor = 0.22, escala = [1.6, 1.6, 1.6], inclina = 0, espaco = 'objeto', luz = true, lado = THREE.FrontSide, vertexColors = false }) {
  const m = luz
    ? new THREE.MeshStandardMaterial({ color: cor, roughness: 1, metalness: 0, side: lado, vertexColors })
    : new THREE.MeshBasicMaterial({ color: cor, side: lado, vertexColors });
  const u = {
    uEsc: { value: new THREE.Vector3(...escala) },
    uSalp: { value: col(salpico ?? cor) },
    uQuanto: { value: salpico ? quanto : 0 },
    uValor: { value: valor },
    uDesl: { value: new THREE.Vector3() },
    uCis: { value: inclina },
  };
  m.userData.u = u;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vTP = ' + (espaco === 'mundo' ? '(modelMatrix * vec4(position, 1.0)).xyz' : 'position') + ';');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTP; uniform vec3 uEsc; uniform vec3 uSalp; uniform float uQuanto; uniform float uValor; uniform vec3 uDesl; uniform float uCis;\n' + GLSL_RUIDO)
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
        // cada célula é um toque de pincel: tom próprio, e algumas levam a cor de salpico ou uma sombra fria
        vec3 tp = vTP + uDesl;
        vec3 tq = vec3(tp.x + uCis * tp.y, tp.y, tp.z + uCis * tp.y) * uEsc;
        tq += (vec3(vnoise3(tq * 0.5), vnoise3(tq * 0.5 + 5.3), vnoise3(tq * 0.5 + 9.1)) - 0.5) * 0.9;
        vec3 ti = celula3(tq);
        float t1 = hash13(ti), t2 = hash13(ti + 17.3), t3 = hash13(ti + 41.7), t4 = hash13(ti + 63.1);
        float tn = vnoise3(tq * 0.30);
        diffuseColor.rgb *= 1.0 + ((t1 - 0.5) * 2.3 + (tn - 0.5) * 0.9) * uValor;
        diffuseColor.rgb = mix(diffuseColor.rgb, uSalp, step(1.0 - 0.36 * uQuanto, t2) * (0.45 + 0.5 * t4));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.50, 0.80), step(1.0 - 0.30 * uQuanto, t3) * (0.3 + 0.5 * t4));
      `);
  };
  m.customProgramCacheKey = () => 'tinta-' + espaco + (luz ? '-luz' : '-chapado');
  return m;
}

// junta geometrias (só posição e normal) numa só; cada entrada pode trazer uma matriz
export function juntar(lista) {
  let n = 0;
  const prontos = lista.map(e => {
    let g = e.isBufferGeometry ? e : e.g;
    g = g.index ? g.toNonIndexed() : g.clone();
    if (e.m) g.applyMatrix4(e.m);
    n += g.attributes.position.count;
    return { g, cor: e.cor };
  });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), cor = new Float32Array(n * 3);
  let o = 0, temCor = false;
  for (const { g, cor: c } of prontos) {
    pos.set(g.attributes.position.array, o * 3);
    if (!g.attributes.normal) g.computeVertexNormals();
    nor.set(g.attributes.normal.array, o * 3);
    const k = g.attributes.position.count;
    if (g.attributes.color) { cor.set(g.attributes.color.array, o * 3); temCor = true; }
    else { const cc = c ? col(c) : new THREE.Color(1, 1, 1); if (c) temCor = true; for (let i = 0; i < k; i++) { cor[(o + i) * 3] = cc.r; cor[(o + i) * 3 + 1] = cc.g; cor[(o + i) * 3 + 2] = cc.b; } }
    o += k; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (temCor) out.setAttribute('color', new THREE.BufferAttribute(cor, 3));
  return out;
}
export const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));
