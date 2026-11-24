// Microrrelevo procedural no shader: dá a textura de "espuma de maquete" às árvores,
// o grão do pão, a terra fofa. Perturba a normal com ruído 3D em coordenadas de mundo.
export const NOISE_GLSL = /* glsl */`
float fhash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(fhash(i), fhash(i + vec3(1,0,0)), f.x), mix(fhash(i + vec3(0,1,0)), fhash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(fhash(i + vec3(0,0,1)), fhash(i + vec3(1,0,1)), f.x), mix(fhash(i + vec3(0,1,1)), fhash(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 perturbN(vec3 sp, vec3 sn, vec2 dH, float fd){
  vec3 sx = dFdx(sp), sy = dFdy(sp); vec3 r1 = cross(sy, sn), r2 = cross(sn, sx);
  float det = dot(sx, r1) * fd; vec3 g = sign(det) * (dH.x * r1 + dH.y * r2);
  return normalize(abs(det) * sn - g);
}`;

// opts: freq (ciclos por unidade), bump (altura), color (variação de cor 0..1), freq2/mix2 (segunda oitava)
export function addFoam(mat, { freq = 3, bump = 0.05, color = 0.35, freq2 = 9, mix2 = 0.5, key = 'foam', space = 'world' } = {}) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uFoam = { value: [freq, bump, color, freq2] };
    sh.uniforms.uFoamMix = { value: mix2 };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFoamP;')
      .replace('#include <project_vertex>', `#include <project_vertex>\n vFoamP = ${space === 'world' ? '(modelMatrix * vec4(transformed, 1.0)).xyz' : 'transformed'};`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFoam[4]; uniform float uFoamMix; varying vec3 vFoamP;\n' + NOISE_GLSL + '\nfloat foamH(vec3 p){ return vnoise(p * uFoam[0]) + uFoamMix * vnoise(p * uFoam[3] + 7.31); }')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float fh = foamH(vFoamP);
        diffuseColor.rgb *= (1.0 - uFoam[2]) + uFoam[2] * 1.35 * fh / (1.0 + uFoamMix);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float hh = foamH(vFoamP) * uFoam[1]; normal = perturbN(-vViewPosition, normal, vec2(dFdx(hh), dFdy(hh)), faceDirection); }`);
  };
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => prevKey() + key;
  return mat;
}
