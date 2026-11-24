// Pós-processamento próprio: oclusão de ambiente, profundidade de campo de "miniatura"
// (coleta em disco com CoC por pixel), brilho suave, curva de cor, vinheta e grão.
import * as THREE from 'three';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const IGN = `float ign(vec2 p){ return fract(52.9829189*fract(dot(p, vec2(0.06711056, 0.00583715)))); }`;

const AO_FRAG = `
uniform sampler2D tDepth; uniform mat4 uProjInv; uniform vec2 uPx; uniform float uProjScale, uRadius, uIntensity; varying vec2 vUv;
${IGN}
vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 v = uProjInv*vec4(uv*2.0-1.0, d*2.0-1.0, 1.0); return v.xyz/v.w; }
void main(){
  float d0 = texture2D(tDepth, vUv).x; gl_FragColor = vec4(1.0);
  if (d0 >= 0.999995) return;
  vec3 P = vpos(vUv); if (-P.z > 170.0) return;
  vec3 Pr = vpos(vUv + vec2(uPx.x,0.0)), Pl = vpos(vUv - vec2(uPx.x,0.0)), Pu = vpos(vUv + vec2(0.0,uPx.y)), Pd = vpos(vUv - vec2(0.0,uPx.y));
  vec3 dx = abs(Pr.z-P.z) < abs(P.z-Pl.z) ? Pr-P : P-Pl; vec3 dy = abs(Pu.z-P.z) < abs(P.z-Pd.z) ? Pu-P : P-Pd;
  vec3 N = normalize(cross(dx, dy));
  float rpx = min(uRadius*uProjScale/(-P.z), 110.0); if (rpx < 1.5) return;
  float rot = ign(gl_FragCoord.xy)*6.2831853, sum = 0.0, R2 = uRadius*uRadius;
  const int NS = 18;
  for (int i = 0; i < NS; i++){
    float a = (float(i)+0.5)/float(NS), r = sqrt(a)*rpx, th = float(i)*2.39996323 + rot;
    vec3 v = vpos(vUv + vec2(cos(th), sin(th))*r*uPx) - P; float vv = dot(v,v), vn = dot(v,N) - 0.015 - 0.0012*(-P.z);
    float f = max(R2 - vv, 0.0); sum += f*f*f*max(vn/(vv + 0.01), 0.0);
  }
  float ao = max(0.0, 1.0 - sum*5.0*uIntensity/(R2*R2*R2*float(NS)));
  ao = mix(ao, 1.0, smoothstep(110.0, 170.0, -P.z));
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}`;
const AOBLUR_FRAG = `
uniform sampler2D tAO, tDepth; uniform vec2 uDir; uniform float uNear, uFar; varying vec2 vUv;
#include <packing>
float lz(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
void main(){
  float z0 = lz(vUv), sum = texture2D(tAO, vUv).r*0.2, w = 0.2;
  for (int i = 1; i <= 4; i++){ float g = exp(-float(i*i)/9.0)*0.2;
    for (int s = -1; s <= 1; s += 2){ vec2 uv = vUv + uDir*float(i*s)*1.3; float k = g*max(0.0, 1.0 - abs(lz(uv)-z0)/(0.04*z0 + 0.12)); sum += texture2D(tAO, uv).r*k; w += k; } }
  gl_FragColor = vec4(vec3(sum/w), 1.0);
}`;
const PRE_FRAG = `
uniform sampler2D tColor, tDepth, tAO; uniform float uNear, uFar, uFocus, uK, uMaxNear, uMaxFar, uAO; varying vec2 vUv;
#include <packing>
void main(){
  vec3 c = texture2D(tColor, vUv).rgb; c = max(c, vec3(0.0)); if (c.r != c.r || c.g != c.g || c.b != c.b) c = vec3(0.0);
  float z = -perspectiveDepthToViewZ(texture2D(tDepth, vUv).x, uNear, uFar);
  float ao = texture2D(tAO, vUv).r; c *= mix(vec3(1.0), mix(vec3(0.40,0.34,0.44), vec3(1.0), ao), uAO);
  float coc = uK*(1.0/uFocus - 1.0/z); coc = sign(coc)*max(0.0, abs(coc) - 0.7);
  gl_FragColor = vec4(c, clamp(coc, -uMaxNear, uMaxFar));
}`;
const DOF_FRAG = `
uniform sampler2D tPre; uniform vec2 uPx; uniform float uMaxR; varying vec2 vUv;
${IGN}
const int N = 420;
void main(){
  vec4 c0 = texture2D(tPre, vUv); float a0 = c0.a, s0 = abs(a0);
  vec3 col = c0.rgb; float tot = 1.0, rot = ign(gl_FragCoord.xy)*6.2831853;
  for (int i = 0; i < N; i++){
    float fi = float(i) + 0.5, r = sqrt(fi/float(N))*uMaxR, th = fi*2.39996323 + rot;
    vec4 c = texture2D(tPre, vUv + vec2(cos(th), sin(th))*r*uPx); float ss = abs(c.a);
    if (c.a > a0) ss = clamp(ss, 0.0, s0*2.0);            // o que está atrás não vaza sobre o que está em foco
    float m = smoothstep(r - 0.5, r + 0.5, ss);
    col += mix(col/tot, c.rgb, m); tot += 1.0;
  }
  gl_FragColor = vec4(col/tot, a0);
}`;
const FILL_FRAG = `
uniform sampler2D tDof; uniform vec2 uPx; varying vec2 vUv;
void main(){
  vec4 c0 = texture2D(tDof, vUv); float r = clamp(abs(c0.a)*0.16, 0.0, 1.6); vec3 s = c0.rgb*4.0;
  s += (texture2D(tDof, vUv + vec2(r,0.0)*uPx).rgb + texture2D(tDof, vUv - vec2(r,0.0)*uPx).rgb + texture2D(tDof, vUv + vec2(0.0,r)*uPx).rgb + texture2D(tDof, vUv - vec2(0.0,r)*uPx).rgb)*2.0;
  s += texture2D(tDof, vUv + vec2(r,r)*uPx).rgb + texture2D(tDof, vUv + vec2(-r,r)*uPx).rgb + texture2D(tDof, vUv + vec2(r,-r)*uPx).rgb + texture2D(tDof, vUv - vec2(r,r)*uPx).rgb;
  gl_FragColor = vec4(s/16.0, c0.a);
}`;
const DOWN_FRAG = `
uniform sampler2D tSrc; uniform vec2 uPx; uniform float uThr; varying vec2 vUv;
void main(){
  vec3 s = texture2D(tSrc, vUv + vec2(-1.0,-1.0)*uPx).rgb + texture2D(tSrc, vUv + vec2(1.0,-1.0)*uPx).rgb + texture2D(tSrc, vUv + vec2(-1.0,1.0)*uPx).rgb + texture2D(tSrc, vUv + vec2(1.0,1.0)*uPx).rgb; s *= 0.25;
  if (uThr > 0.0){ float l = max(s.r, max(s.g, s.b)); s *= smoothstep(uThr, uThr + 0.9, l); s = min(s, vec3(6.0)); }
  gl_FragColor = vec4(s, 1.0);
}`;
const BLUR_FRAG = `
uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){
  vec3 s = texture2D(tSrc, vUv).rgb*0.1964825501511404;
  s += (texture2D(tSrc, vUv + uDir*1.411764705882353).rgb + texture2D(tSrc, vUv - uDir*1.411764705882353).rgb)*0.2969069646728344;
  s += (texture2D(tSrc, vUv + uDir*3.2941176470588234).rgb + texture2D(tSrc, vUv - uDir*3.2941176470588234).rgb)*0.09447039785044732;
  s += (texture2D(tSrc, vUv + uDir*5.176470588235294).rgb + texture2D(tSrc, vUv - uDir*5.176470588235294).rgb)*0.010381362401148057;
  gl_FragColor = vec4(s, 1.0);
}`;
const FINAL_FRAG = `
uniform sampler2D tDof, tB1, tB2; uniform float uExposure, uBloom, uFrame, uGrain, uVig, uSat; varying vec2 vUv;
${IGN}
vec3 neutral(vec3 color){
  const float startCompression = 0.76, desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b)); float offset = x < 0.08 ? x - 6.25*x*x : 0.04; color -= offset;
  float peak = max(color.r, max(color.g, color.b)); if (peak < startCompression) return color;
  float d = 1.0 - startCompression; float newPeak = 1.0 - d*d/(peak + d - startCompression); color *= newPeak/peak;
  float g = 1.0 - 1.0/(desaturation*(peak - newPeak) + 1.0); return mix(color, vec3(newPeak), g);
}
void main(){
  vec3 c = texture2D(tDof, vUv).rgb;
  c += (texture2D(tB1, vUv).rgb*0.55 + texture2D(tB2, vUv).rgb*0.45)*uBloom;
  c *= uExposure;
  float v = length((vUv - 0.5)*vec2(1.0, 0.72)); c *= 1.0 - uVig*smoothstep(0.28, 0.82, v);
  c = neutral(c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, uSat);
  c = mix(c, c*c*(3.0 - 2.0*c), 0.16);                              // contraste suave
  c = clamp(c, 0.0, 1.0);
  c = mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
  float n = ign(gl_FragCoord.xy + vec2(uFrame*37.0, uFrame*17.0)) - 0.5; c += n*uGrain;
  gl_FragColor = vec4(c, 1.0);
}`;

export class Post {
  constructor(renderer, W, H) {
    this.r = renderer; this.W = W; this.H = H;
    const rt = (w, h, type = THREE.HalfFloatType) => new THREE.WebGLRenderTarget(w, h, { type, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.rtScene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(W, H, THREE.FloatType) });
    this.rtAO = rt(W, H, THREE.UnsignedByteType); this.rtAO2 = rt(W, H, THREE.UnsignedByteType);
    this.rtPre = rt(W, H); this.rtDof = rt(W, H); this.rtFill = rt(W, H);
    this.rtH = rt(W / 2, H / 2); this.rtQ = rt(W / 4, H / 4); this.rtQ2 = rt(W / 4, H / 4); this.rtE = rt(W / 8, H / 8); this.rtE2 = rt(W / 8, H / 8);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.mesh = new THREE.Mesh(g, null); this.mesh.frustumCulled = false; this.qs = new THREE.Scene(); this.qs.add(this.mesh); this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const M = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    const px = new THREE.Vector2(1 / W, 1 / H), D = this.rtScene.depthTexture;
    this.mAO = M(AO_FRAG, { tDepth: { value: D }, uProjInv: { value: new THREE.Matrix4() }, uPx: { value: px }, uProjScale: { value: 1 }, uRadius: { value: 0.8 }, uIntensity: { value: 1.0 } });
    this.mAOB = M(AOBLUR_FRAG, { tAO: { value: null }, tDepth: { value: D }, uDir: { value: new THREE.Vector2() }, uNear: { value: 1 }, uFar: { value: 1 } });
    this.mPre = M(PRE_FRAG, { tColor: { value: this.rtScene.texture }, tDepth: { value: D }, tAO: { value: this.rtAO.texture }, uNear: { value: 1 }, uFar: { value: 1 }, uFocus: { value: 20 }, uK: { value: 240 }, uMaxNear: { value: 44 }, uMaxFar: { value: 15 }, uAO: { value: 0.85 } });
    this.mDof = M(DOF_FRAG, { tPre: { value: this.rtPre.texture }, uPx: { value: px }, uMaxR: { value: 44 } });
    this.mFill = M(FILL_FRAG, { tDof: { value: this.rtDof.texture }, uPx: { value: px } });
    this.mDown = M(DOWN_FRAG, { tSrc: { value: null }, uPx: { value: new THREE.Vector2() }, uThr: { value: 0 } });
    this.mBlur = M(BLUR_FRAG, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.mFinal = M(FINAL_FRAG, { tDof: { value: this.rtFill.texture }, tB1: { value: this.rtQ.texture }, tB2: { value: this.rtE.texture }, uExposure: { value: 1 }, uBloom: { value: 0.16 }, uFrame: { value: 0 }, uGrain: { value: 0.018 }, uVig: { value: 0.2 }, uSat: { value: 1.03 } });
  }
  pass(mat, target) { this.mesh.material = mat; this.r.setRenderTarget(target); this.r.render(this.qs, this.qc); }
  render(scene, camera, o) {
    const r = this.r, W = this.W, H = this.H;
    r.setRenderTarget(this.rtScene); r.clear(); r.render(scene, camera);
    // oclusão de ambiente
    this.mAO.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
    this.mAO.uniforms.uProjScale.value = H / (2 * Math.tan(camera.fov * Math.PI / 360));
    this.pass(this.mAO, this.rtAO);
    const b = this.mAOB.uniforms; b.uNear.value = camera.near; b.uFar.value = camera.far;
    b.tAO.value = this.rtAO.texture; b.uDir.value.set(1 / W, 0); this.pass(this.mAOB, this.rtAO2);
    b.tAO.value = this.rtAO2.texture; b.uDir.value.set(0, 1 / H); this.pass(this.mAOB, this.rtAO);
    // cor × oclusão + círculo de confusão
    const p = this.mPre.uniforms; p.uNear.value = camera.near; p.uFar.value = camera.far; p.uFocus.value = o.focus; p.uK.value = o.K; p.uMaxNear.value = o.maxNear; p.uMaxFar.value = o.maxFar;
    this.pass(this.mPre, this.rtPre);
    this.mDof.uniforms.uMaxR.value = Math.max(o.maxNear, o.maxFar); this.pass(this.mDof, this.rtDof);
    this.pass(this.mFill, this.rtFill);
    // brilho
    const d = this.mDown.uniforms, bl = this.mBlur.uniforms;
    d.tSrc.value = this.rtFill.texture; d.uPx.value.set(0.5 / W, 0.5 / H); d.uThr.value = 0.95; this.pass(this.mDown, this.rtH);
    d.tSrc.value = this.rtH.texture; d.uPx.value.set(1 / W, 1 / H); d.uThr.value = 0; this.pass(this.mDown, this.rtQ);
    d.tSrc.value = this.rtQ.texture; d.uPx.value.set(2 / W, 2 / H); this.pass(this.mDown, this.rtE);
    bl.tSrc.value = this.rtQ.texture; bl.uDir.value.set(4 / W, 0); this.pass(this.mBlur, this.rtQ2);
    bl.tSrc.value = this.rtQ2.texture; bl.uDir.value.set(0, 4 / H); this.pass(this.mBlur, this.rtQ);
    bl.tSrc.value = this.rtE.texture; bl.uDir.value.set(8 / W, 0); this.pass(this.mBlur, this.rtE2);
    bl.tSrc.value = this.rtE2.texture; bl.uDir.value.set(0, 8 / H); this.pass(this.mBlur, this.rtE);
    const f = this.mFinal.uniforms; f.uExposure.value = o.exposure; f.uFrame.value = o.frame;
    this.pass(this.mFinal, null);
  }
}
