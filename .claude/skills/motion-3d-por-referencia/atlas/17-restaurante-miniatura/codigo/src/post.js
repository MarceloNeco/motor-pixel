// Pipeline de imagem: reflexo planar (asfalto molhado), profundidade de campo de miniatura,
// acumulação de subquadros (desfoque de movimento + antisserrilhado), bloom e revelação final.
import * as THREE from 'three';

const VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function createPost(renderer, W, H) {
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fsMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  fsMesh.frustumCulled = false;
  const fsScene = new THREE.Scene(); fsScene.add(fsMesh);
  const pass = (mat, target, clear = true) => {
    fsMesh.material = mat; renderer.setRenderTarget(target);
    if (clear) renderer.clear(true, false, false);
    renderer.render(fsScene, fsCam);
  };
  const hdr = (w, h, extra = {}) => new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    depthBuffer: false, generateMipmaps: false, ...extra,
  });

  // ---------- cena principal (com textura de profundidade) ----------
  const depthTex = new THREE.DepthTexture(W, H); depthTex.type = THREE.FloatType;
  const rtMain = hdr(W, H, { depthBuffer: true, depthTexture: depthTex });
  const rtDof = hdr(W, H);
  const rtAccum = hdr(W, H);

  // ---------- profundidade de campo (coleta em espiral áurea, à la Gustafsson) ----------
  const dofMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    uniforms: {
      tColor: { value: rtMain.texture }, tDepth: { value: depthTex }, texel: { value: new THREE.Vector2(1 / W, 1 / H) },
      near: { value: 1 }, far: { value: 1000 }, focus: { value: 80 }, cocScale: { value: 20 }, maxBlur: { value: 20 },
      nearBoost: { value: 1.0 }, rot: { value: 0 }, radScale: { value: 1.6 },
    },
    fragmentShader: /* glsl */`
      precision highp float;
      uniform sampler2D tColor, tDepth; uniform vec2 texel;
      uniform float near, far, focus, cocScale, maxBlur, rot, radScale, nearBoost;
      varying vec2 vUv;
      float lin(vec2 uv){ float d = texture2D(tDepth, uv).x; float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
      float coc(float z){ float k = z < focus ? nearBoost : 1.0; return min(k * cocScale * abs(z - focus) / z, maxBlur); }
      void main(){
        vec3 col = texture2D(tColor, vUv).rgb; float zc = lin(vUv); float sc = coc(zc);
        float tot = 1.0; float r = radScale; float a = rot;
        for (int i = 0; i < 600; i++) {
          if (r >= maxBlur) break;
          vec2 tc = vUv + vec2(cos(a), sin(a)) * texel * r;
          vec3 s = texture2D(tColor, tc).rgb; float zs = lin(tc); float ss = coc(zs);
          if (zs > zc) ss = clamp(ss, 0.0, sc * 2.0);
          float m = smoothstep(r - 0.5, r + 0.5, ss);
          col += mix(col / tot, s, m); tot += 1.0;
          r += radScale / r; a += 2.39996323;
        }
        gl_FragColor = vec4(col / tot, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });

  // ---------- acumulação ----------
  const accMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    uniforms: { tSrc: { value: null }, w: { value: 1 } },
    fragmentShader: `uniform sampler2D tSrc; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb * w, w); }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
    depthTest: false, depthWrite: false,
  });

  // ---------- bloom (cadeia de mips: 13 amostras para baixo, tenda para cima) ----------
  const LV = 7; const mips = [];
  for (let i = 0; i < LV; i++) mips.push(hdr(Math.max(2, W >> (i + 1)), Math.max(2, H >> (i + 1))));
  const downMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    uniforms: { tSrc: { value: null }, texel: { value: new THREE.Vector2() }, prefilter: { value: 0 }, threshold: { value: 1.0 }, knee: { value: 0.6 } },
    fragmentShader: /* glsl */`
      uniform sampler2D tSrc; uniform vec2 texel; uniform float prefilter, threshold, knee; varying vec2 vUv;
      vec3 S(vec2 o){ return texture2D(tSrc, vUv + o * texel).rgb; }
      void main(){
        vec3 a = S(vec2(-2,2)), b = S(vec2(0,2)), c = S(vec2(2,2));
        vec3 d = S(vec2(-2,0)), e = S(vec2(0,0)), f = S(vec2(2,0));
        vec3 g = S(vec2(-2,-2)), h = S(vec2(0,-2)), i = S(vec2(2,-2));
        vec3 j = S(vec2(-1,1)), k = S(vec2(1,1)), l = S(vec2(-1,-1)), m = S(vec2(1,-1));
        vec3 col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
        if (prefilter > 0.5) {
          col = min(col, vec3(60.0));
          float br = max(col.r, max(col.g, col.b));
          float rq = clamp(br - threshold + knee, 0.0, 2.0 * knee); rq = rq * rq / (4.0 * knee + 1e-4);
          col *= max(rq, br - threshold) / max(br, 1e-4);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const upMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    uniforms: { tSrc: { value: null }, texel: { value: new THREE.Vector2() }, scale: { value: 1 } },
    fragmentShader: /* glsl */`
      uniform sampler2D tSrc; uniform vec2 texel; uniform float scale; varying vec2 vUv;
      vec3 S(vec2 o){ return texture2D(tSrc, vUv + o * texel).rgb; }
      void main(){
        vec3 c = S(vec2(0)) * 4.0 + (S(vec2(-1,0)) + S(vec2(1,0)) + S(vec2(0,-1)) + S(vec2(0,1))) * 2.0
               + S(vec2(-1,-1)) + S(vec2(1,-1)) + S(vec2(-1,1)) + S(vec2(1,1));
        gl_FragColor = vec4(c / 16.0 * scale, 1.0);
      }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
    depthTest: false, depthWrite: false,
  });

  // ---------- revelação final ----------
  const finalMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    uniforms: {
      tHDR: { value: rtAccum.texture }, tBloom: { value: mips[0].texture }, exposure: { value: 1.0 }, bloom: { value: 0.06 },
      vignette: { value: 0.3 }, grain: { value: 0.03 }, seed: { value: 0 }, sat: { value: 1.0 }, contrast: { value: 1.0 }, white: { value: 0.93 },
      lift: { value: new THREE.Vector3(0.008, 0.007, 0.008) }, gain: { value: new THREE.Vector3(1.0, 0.985, 0.93) },
      res: { value: new THREE.Vector2(W, H) },
    },
    fragmentShader: /* glsl */`
      precision highp float;
      uniform sampler2D tHDR, tBloom; uniform float exposure, bloom, vignette, grain, seed, sat, contrast, white; uniform vec3 lift, gain; uniform vec2 res;
      varying vec2 vUv;
      const mat3 AIN = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
      const mat3 AOUT = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
      vec3 rrt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
      vec3 aces(vec3 c){ c = AIN * c; c = rrt(c); c = AOUT * c; return clamp(c, 0.0, 1.0); }
      float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
      void main(){
        vec3 c = texture2D(tHDR, vUv).rgb + bloom * texture2D(tBloom, vUv).rgb;
        vec2 d = vUv - 0.5; d.x *= res.x / res.y;
        c *= 1.0 - vignette * smoothstep(0.15, 1.15, dot(d, d) * 1.6);
        c = aces(c * exposure / 0.6);
        c = toSRGB(clamp(c, 0.0, 1.0));
        // gradação em espaço de exibição: saturação, contraste em torno do cinza médio, ponto branco e piso de preto
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, sat);
        c = (c - 0.42) * contrast + 0.42;
        c = clamp(c, 0.0, 1.0) * gain * white;
        c = c + lift * (1.0 - c);
        c = clamp(c, 0.0, 1.0);
        float n = h12(gl_FragCoord.xy + seed * 113.0) + h12(gl_FragCoord.xy * 1.37 + seed * 71.0) - 1.0;
        c += n * grain * (0.6 + 0.4 * (1.0 - l));
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });

  const api = {
    rtMain, depthTex, dofMat, finalMat,
    beginFrame() { renderer.setRenderTarget(rtAccum); renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false); },
    // renderiza um subquadro da cena e soma no acumulador
    addSubframe(scene, camera, weight, rot) {
      renderer.setRenderTarget(rtMain); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, true);
      renderer.render(scene, camera);
      dofMat.uniforms.near.value = camera.near; dofMat.uniforms.far.value = camera.far; dofMat.uniforms.rot.value = rot;
      pass(dofMat, rtDof);
      accMat.uniforms.tSrc.value = rtDof.texture; accMat.uniforms.w.value = weight;
      pass(accMat, rtAccum, false);
    },
    finish(seed) {
      // bloom
      let src = rtAccum.texture, sw = W, sh = H;
      for (let i = 0; i < LV; i++) {
        downMat.uniforms.tSrc.value = src; downMat.uniforms.texel.value.set(1 / sw, 1 / sh); downMat.uniforms.prefilter.value = i === 0 ? 1 : 0;
        pass(downMat, mips[i]);
        src = mips[i].texture; sw = mips[i].width; sh = mips[i].height;
      }
      for (let i = LV - 1; i > 0; i--) {
        upMat.uniforms.tSrc.value = mips[i].texture; upMat.uniforms.texel.value.set(1 / mips[i].width, 1 / mips[i].height);
        upMat.uniforms.scale.value = 1.0;
        pass(upMat, mips[i - 1], false);
      }
      finalMat.uniforms.seed.value = seed;
      pass(finalMat, null);
    },
  };
  api.bloomDown = downMat;
  return api;
}

// ---------- espelho planar no chão (y = 0) para o asfalto molhado ----------
export function createMirror(renderer, W, H) {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, generateMipmaps: false });
  const rtA = rt.clone(); rtA.depthBuffer = false;
  const rtB = rt.clone(); rtB.depthBuffer = false;
  const cam = new THREE.PerspectiveCamera();
  cam.layers.set(0);
  const textureMatrix = new THREE.Matrix4();
  const normal = new THREE.Vector3(0, 1, 0), origin = new THREE.Vector3(0, 0, 0);
  const rot = new THREE.Matrix4(), camPos = new THREE.Vector3(), view = new THREE.Vector3(), look = new THREE.Vector3(), target = new THREE.Vector3();
  const plane = new THREE.Plane(), clip = new THREE.Vector4(), q = new THREE.Vector4();
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fsMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); fsMesh.frustumCulled = false;
  const fsScene = new THREE.Scene(); fsScene.add(fsMesh);
  const blurMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    uniforms: { tSrc: { value: null }, dir: { value: new THREE.Vector2() } },
    fragmentShader: /* glsl */`
      uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
      void main(){
        vec3 c = vec3(0.0); float t = 0.0;
        for (int i = -12; i <= 12; i++) { float x = float(i); float w = exp(-x * x / 50.0); c += min(texture2D(tSrc, vUv + dir * x).rgb, vec3(7.0)) * w; t += w; }
        gl_FragColor = vec4(c / t, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const blur = (src, dst, dx, dy) => { blurMat.uniforms.tSrc.value = src.texture; blurMat.uniforms.dir.value.set(dx / W, dy / H); fsMesh.material = blurMat; renderer.setRenderTarget(dst); renderer.render(fsScene, fsCam); };

  return {
    texture: rtA.texture, textureMatrix,
    render(scene, camera) {
      camPos.setFromMatrixPosition(camera.matrixWorld);
      view.subVectors(origin, camPos);
      view.reflect(normal).negate(); view.add(origin);
      rot.extractRotation(camera.matrixWorld);
      look.set(0, 0, -1).applyMatrix4(rot).add(camPos);
      target.subVectors(origin, look); target.reflect(normal).negate(); target.add(origin);
      cam.position.copy(view);
      cam.up.set(0, 1, 0).applyMatrix4(rot).reflect(normal);
      cam.lookAt(target);
      cam.near = camera.near; cam.far = camera.far;
      cam.updateMatrixWorld();
      cam.projectionMatrix.copy(camera.projectionMatrix);
      textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
      textureMatrix.multiply(cam.projectionMatrix); textureMatrix.multiply(cam.matrixWorldInverse);
      plane.setFromNormalAndCoplanarPoint(normal, origin); plane.applyMatrix4(cam.matrixWorldInverse);
      clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
      const p = cam.projectionMatrix.elements;
      q.x = (Math.sign(clip.x) + p[8]) / p[0]; q.y = (Math.sign(clip.y) + p[9]) / p[5]; q.z = -1; q.w = (1 + p[10]) / p[14];
      clip.multiplyScalar(2 / clip.dot(q));
      p[2] = clip.x; p[6] = clip.y; p[10] = clip.z + 1 - 0.003; p[14] = clip.w;
      cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, true);
      renderer.render(scene, cam);
      // borra: pouco na horizontal, muito na vertical (os reflexos esticam em direção à câmera)
      blur(rt, rtB, 1.3, 0);
      blur(rtB, rtA, 0, 2.4);
    },
  };
}

// Injeta "piso molhado" num MeshStandardMaterial: escurece, alisa e soma o reflexo planar
// onde a máscara de poças manda.
export function makeWet(mat, mirror, { strength = 1.0, puddleTex, puddleScale = 0.05, baseWet = 0.35, distort = 0.012, darken = 0.55, puddleLo = 0.45, wetRough = 0.08 } = {}) {
  mat.userData.wet = { uRefl: { value: mirror.texture }, uReflMatrix: { value: mirror.textureMatrix }, uPuddle: { value: puddleTex }, uWetStrength: { value: strength }, uPuddleScale: { value: puddleScale }, uBaseWet: { value: baseWet }, uDistort: { value: distort }, uDarken: { value: darken }, uPudLo: { value: puddleLo }, uWetRough: { value: wetRough } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, mat.userData.wet);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uReflMatrix; varying vec4 vReflCoord; varying vec3 vWetWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n vec4 wwp = modelMatrix * vec4(transformed, 1.0); vReflCoord = uReflMatrix * wwp; vWetWorld = wwp.xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uRefl, uPuddle; uniform float uWetStrength, uPuddleScale, uBaseWet, uDistort, uDarken, uPudLo, uWetRough; varying vec4 vReflCoord; varying vec3 vWetWorld; float gWet;')
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float pud = texture2D(uPuddle, vWetWorld.xz * uPuddleScale).r;
        float pud2 = texture2D(uPuddle, vWetWorld.xz * uPuddleScale * 3.7 + 0.31).r;
        gWet = clamp(uBaseWet + smoothstep(uPudLo, uPudLo + 0.17, pud * 0.75 + pud2 * 0.35), 0.0, 1.0);
        roughnessFactor = mix(roughnessFactor, uWetRough, gWet * 0.85);
        diffuseColor.rgb *= mix(1.0, uDarken, gWet);`)
      .replace('#include <opaque_fragment>', `
        vec2 ruv = vReflCoord.xy / vReflCoord.w;
        float dn = texture2D(uPuddle, vWetWorld.xz * 0.9).r - 0.5;
        ruv.x += dn * uDistort; ruv.y += dn * uDistort * 0.5;
        vec3 refl = texture2D(uRefl, ruv).rgb;
        vec3 vdir = normalize(cameraPosition - vWetWorld);
        float fres = 0.04 + 0.96 * pow(1.0 - clamp(vdir.y, 0.0, 1.0), 5.0);
        outgoingLight += refl * gWet * uWetStrength * (fres + 0.12);
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'wet' + strength + '_' + darken + '_' + puddleLo + '_' + wetRough;
  return mat;
}
