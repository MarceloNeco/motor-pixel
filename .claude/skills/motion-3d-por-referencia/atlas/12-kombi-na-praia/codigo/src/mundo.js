// O mundo: terreno em três níveis de detalhe, mar, céu, montanhas em cone e nuvens.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, TAU, PI, lerp, clamp, smooth, groundH, groundCol, shoreZ, shoreDist, SH0, SHK } from './geo.js';

export const FOG = { color: new THREE.Color(0xd3e9f6), k: 0.00155, max: 0.86 };
export const SKY = { zen: new THREE.Color(0x4a97e0), mid: new THREE.Color(0x8ac3ee), hor: new THREE.Color(0xd3e9f6) };
// azimute 120° (lés-sudeste), 40° de altura: ilumina a frente e o lado da janela
export const SUN_DIR = new THREE.Vector3(Math.sin(120 * PI / 180) * Math.cos(40 * PI / 180), Math.sin(40 * PI / 180), -Math.cos(120 * PI / 180) * Math.cos(40 * PI / 180)).normalize();

// névoa exponencial simples para todos os materiais embutidos (a do three é exp²)
THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
  float fogFactor = (1.0 - exp(-fogDensity * vFogDepth)) * ${FOG.max.toFixed(3)};
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif`;

const GLSL_NOISE = `
float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), u.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ s += a*vnoise(p); p *= 2.03; a *= 0.5; } return s/0.875; }`;
const GLSL_SHORE = `
float shoreZ(float x){ float a = max(0.0, 30.0 - x), b = max(0.0, x - 30.0); return ${SH0.toFixed(1)} - ${SHK.toFixed(4)}*a*a + 0.003*b*b; }
float shoreD(vec2 p){ float a = max(0.0, 30.0 - p.x), b = max(0.0, p.x - 30.0); float s = ${(2 * SHK).toFixed(4)}*a + 0.006*b; return (p.y - shoreZ(p.x))/sqrt(1.0 + s*s); }`;

// ---------- terreno ----------
function grid(X0, X1, Z0, Z1, step, hfun) {
  const nx = Math.round((X1 - X0) / step), nz = Math.round((Z1 - Z0) / step), n = (nx + 1) * (nz + 1);
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = new Uint32Array(nx * nz * 6);
  let k = 0;
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = X0 + (X1 - X0) * i / nx, z = Z0 + (Z1 - Z0) * j / nz;
    pos[k * 3] = x; pos[k * 3 + 1] = hfun(x, z); pos[k * 3 + 2] = z; uv[k * 2] = i / nx; uv[k * 2 + 1] = j / nz; k++;
  }
  k = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = i + j * (nx + 1), b = a + 1, c = a + nx + 1, d = c + 1; idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals(); return g;
}
function vcolors(g) {
  const p = g.attributes.position, col = new Float32Array(p.count * 3), o = [0, 0, 0, 0], c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { groundCol(p.getX(i), p.getZ(i), o); c.setRGB(o[0], o[1], o[2], THREE.SRGBColorSpace); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
export function makeTerrain(scene, maxAniso) {
  const N = { X0: -128, X1: 72, Z0: -52, Z1: 36 }, M = { X0: -620, X1: 150, Z0: -640, Z1: 80 };
  const inside = (R, x, z, m) => x > R.X0 + m && x < R.X1 - m && z > R.Z0 + m && z < R.Z1 - m;
  // perto: malha fina + textura pintada em código
  const gN = grid(N.X0, N.X1, N.Z0, N.Z1, 0.4, groundH);
  const W = 4096, H = 2048, data = new Uint8Array(W * H * 4), rough = new Uint8Array((W / 2) * (H / 2) * 4), o = [0, 0, 0, 0];
  for (let py = 0; py < H; py++) {
    const z = N.Z0 + (py + 0.5) / H * (N.Z1 - N.Z0);
    for (let px = 0; px < W; px++) {
      groundCol(N.X0 + (px + 0.5) / W * (N.X1 - N.X0), z, o);
      const k = (py * W + px) * 4; data[k] = o[0] * 255; data[k + 1] = o[1] * 255; data[k + 2] = o[2] * 255; data[k + 3] = 255;
      if (!(px & 1) && !(py & 1)) { const q = ((py >> 1) * (W / 2) + (px >> 1)) * 4, r = lerp(0.96, 0.38, o[3]) * 255; rough[q] = r; rough[q + 1] = r; rough[q + 2] = r; rough[q + 3] = 255; }
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = maxAniso; tex.needsUpdate = true;
  const rtex = new THREE.DataTexture(rough, W / 2, H / 2, THREE.RGBAFormat); rtex.generateMipmaps = true; rtex.minFilter = THREE.LinearMipmapLinearFilter; rtex.magFilter = THREE.LinearFilter; rtex.needsUpdate = true;
  const near = new THREE.Mesh(gN, new THREE.MeshStandardMaterial({ map: tex, roughnessMap: rtex, roughness: 1, metalness: 0 }));
  near.receiveShadow = true; scene.add(near);
  // meio e longe: cor por vértice
  const gM = grid(M.X0, M.X1, M.Z0, M.Z1, 4, (x, z) => groundH(x, z) - (inside(N, x, z, 4.5) ? 2.5 : 0)); vcolors(gM);
  const gF = grid(-1700, 900, -2100, 260, 20, (x, z) => groundH(x, z) - (inside(M, x, z, 24) ? 9 : 0)); vcolors(gF);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const mid = new THREE.Mesh(gM, mat), far = new THREE.Mesh(gF, mat); scene.add(mid, far);
  return { near, mid, far };
}

// ---------- mar ----------
const SEA_VERT = `
uniform float uTime; varying vec3 vW; varying float vFog;
${GLSL_SHORE}
float waveH(vec2 p, float t){
  float d = -shoreD(p);
  float surge = 0.085*sin(0.95*t - 0.22*d + 1.7*sin(p.x*0.045)) + 0.04*sin(1.6*t + p.x*0.21 + d*0.3);
  float swell = 0.11*pow(max(0.0, sin(6.2832*(d/8.5 + t*0.16) + 1.6*sin(p.x*0.07) + 0.9*sin(p.x*0.19 + 1.3))), 3.0)*smoothstep(1.5, 5.0, d)*(1.0 - smoothstep(12.0, 24.0, d));
  float chop = 0.03*sin(p.x*0.6 + t*1.3)*sin(p.y*0.5 - t*1.1)*smoothstep(3.0, 12.0, d);
  return surge*mix(0.35, 1.0, 1.0 - smoothstep(10.0, 40.0, d)) + swell + chop;
}
void main(){
  vec4 w = modelMatrix*vec4(position, 1.0); w.y += waveH(w.xz, uTime); vW = w.xyz;
  vec4 mv = viewMatrix*w; vFog = -mv.z; gl_Position = projectionMatrix*mv;
}`;
const SEA_FRAG = `
uniform float uTime, uFogK, uFogMax, uHole; uniform vec4 uRect;
uniform vec3 cShallow, cMid, cDeep, cFoam, cSkyHor, cSkyZen, cFog, uSun, cSun;
varying vec3 vW; varying float vFog;
${GLSL_NOISE}
${GLSL_SHORE}
float ripple(vec2 p, float t){ return sin(p.x*1.7 + t*1.9 + 2.0*sin(p.y*0.9 - t*0.7)) * sin(p.y*2.1 - t*1.5 + 1.5*sin(p.x*1.1 + t*0.5)); }
void main(){
  if (uHole > 0.5 && vW.x > uRect.x && vW.x < uRect.y && vW.z > uRect.z && vW.z < uRect.w) discard;
  float sd = shoreD(vW.xz), d = -sd, t = uTime;
  float ground = sd >= 0.0 ? 1.15*(1.0 - exp(-sd/13.0)) : max(-7.0, sd*0.075);
  float depth = vW.y - ground; if (depth < -0.03) discard;
  // normal: ondulação larga pela derivada do mundo + ripple fino
  vec3 N = normalize(cross(dFdx(vW), dFdy(vW))); if (N.y < 0.0) N = -N;
  float e = 0.12, r0 = ripple(vW.xz, t);
  N = normalize(N + vec3(-(ripple(vW.xz + vec2(e,0.0), t) - r0), 0.0, -(ripple(vW.xz + vec2(0.0,e), t) - r0))*0.22*(1.0 - smoothstep(60.0, 300.0, vFog)));
  vec3 V = normalize(cameraPosition - vW);
  vec3 col = mix(cShallow, cMid, smoothstep(0.03, 0.85, depth)); col = mix(col, cDeep, smoothstep(0.7, 4.5, depth));
  float fr = 0.02 + 0.98*pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N); vec3 sky = mix(cSkyHor, cSkyZen, smoothstep(0.0, 0.7, max(R.y, 0.0)));
  col *= 0.86 + 0.26*max(dot(N, uSun), 0.0);
  col = mix(col, sky, fr*0.62);
  col += cSun*pow(max(dot(N, normalize(uSun + V)), 0.0), 260.0)*1.6;
  // espuma: renda na beirada, rastro atrás dela e cristas vindo para a praia
  float n = fbm(vW.xz*1.25 + vec2(t*0.16, -t*0.1)), n2 = fbm(vW.xz*2.6 + vec2(-t*0.22, t*0.13));
  float edge = 1.0 - smoothstep(0.0, 0.035 + 0.06*n, depth);
  float lace = smoothstep(0.50, 0.70, n2)*(1.0 - smoothstep(0.06, 0.6, depth))*0.85;
  float ph = 6.2832*(d/8.5 + t*0.16) + 1.6*sin(vW.x*0.07) + 0.9*sin(vW.x*0.19 + 1.3);
  float crest = pow(max(0.0, sin(ph + 0.35)), 7.0)*smoothstep(1.2, 4.5, d)*(1.0 - smoothstep(10.0, 22.0, d))*smoothstep(0.34, 0.66, n*0.7 + 0.3*n2 + 0.1 + 0.25*(1.0 - smoothstep(2.0, 12.0, d)));
  float foam = clamp(edge + lace + crest, 0.0, 1.0);
  col = mix(col, cFoam, foam);
  float alpha = max(mix(0.42, 0.97, smoothstep(0.0, 0.75, depth)), foam);
  col = mix(col, cFog, (1.0 - exp(-uFogK*vFog))*uFogMax);
  gl_FragColor = vec4(col, alpha);
}`;
export function makeSea(scene) {
  const U = hole => ({
    uTime: { value: 0 }, uFogK: { value: FOG.k }, uFogMax: { value: FOG.max }, uHole: { value: hole }, uRect: { value: new THREE.Vector4(-109.5, 89.5, -79.5, 5.5) },
    cShallow: { value: new THREE.Color(0x8ce8d6) }, cMid: { value: new THREE.Color(0x33c3cb) }, cDeep: { value: new THREE.Color(0x1d7fc2) }, cFoam: { value: new THREE.Color(0xffffff).multiplyScalar(1.25) },
    cSkyHor: { value: SKY.hor.clone() }, cSkyZen: { value: SKY.zen.clone() }, cFog: { value: FOG.color.clone() }, uSun: { value: SUN_DIR.clone() }, cSun: { value: new THREE.Color(0xfff1d6) },
  });
  const mk = hole => new THREE.ShaderMaterial({ vertexShader: SEA_VERT, fragmentShader: SEA_FRAG, uniforms: U(hole), transparent: true, depthWrite: true });
  const near = new THREE.Mesh(new THREE.PlaneGeometry(200, 86, 400, 172).rotateX(-PI / 2).translate(-10, 0, -37), mk(0));
  const far = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000, 90, 90).rotateX(-PI / 2).translate(-800, -0.02, -3200), mk(1));
  near.renderOrder = 5; far.renderOrder = 4; near.frustumCulled = far.frustumCulled = false; scene.add(far, near);
  return { setTime: t => { near.material.uniforms.uTime.value = t; far.material.uniforms.uTime.value = t; } };
}

// ---------- céu ----------
export function skyMaterial(ground) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false,
    uniforms: { cZen: { value: SKY.zen.clone() }, cMid: { value: SKY.mid.clone() }, cHor: { value: SKY.hor.clone() }, cGround: { value: new THREE.Color(ground ?? 0xd3e9f6) }, uSun: { value: SUN_DIR.clone() }, uG: { value: ground ? 1 : 0 } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 cZen, cMid, cHor, cGround, uSun; uniform float uG; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float y = d.y;
        vec3 c = mix(cHor, cMid, smoothstep(0.0, 0.22, y)); c = mix(c, cZen, smoothstep(0.16, 0.85, y));
        float s = max(dot(d, uSun), 0.0); c += vec3(1.0, 0.9, 0.72)*(pow(s, 6.0)*0.10 + pow(s, 600.0)*uG*40.0);
        if (uG > 0.5) c = mix(cGround, c, smoothstep(-0.08, 0.02, y));
        gl_FragColor = vec4(c, 1.0); }`,
  });
}
export function makeSky(scene) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(6000, 48, 24), skyMaterial()); m.renderOrder = -10; m.frustumCulled = false; scene.add(m); return m;
}

// ---------- montanhas em cone ----------
export function makeMountains(scene, list) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const cBase = new THREE.Color(0xa6d6bf), cBody = new THREE.Color(0x2c9076), cTop = new THREE.Color(0x1d7462), c = new THREE.Color();
  for (const [x, z, R, H, seed] of list) {
    const pts = [], NH = 44;
    for (let i = 0; i <= NH; i++) { const t = i / NH, tt = Math.min(t, 0.985); let r = R * ((1 - tt) + 0.16 * Math.pow(1 - tt, 5)); if (t > 0.9) r *= Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.1) ** 2)) * 0.6 + 0.4 * (1 - (t - 0.9) / 0.1); pts.push(new THREE.Vector2(Math.max(r, 0.001), t * H)); }
    const g = new THREE.LatheGeometry(pts, 56), p = g.attributes.position, r = rng(seed ?? 1), p1 = r() * TAU, p2 = r() * TAU, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getZ(i), p.getX(i)), t = p.getY(i) / H, k = 1 + (0.035 * Math.sin(3 * a + p1) + 0.02 * Math.sin(7 * a + p2)) * (1 - t);
      p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
      c.copy(cBase).lerp(cBody, smooth(0.0, 0.34, t)).lerp(cTop, smooth(0.45, 1.0, t)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.computeVertexNormals(); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, mat); m.position.set(x, Math.max(-1.5, groundH(x, z)) - 3, z); scene.add(m);
  }
}

// ---------- nuvens ----------
export function makeClouds(scene, list) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, emissive: 0x9fb4d8, emissiveIntensity: 0.34 });
  const out = [];
  for (const [x, y, z, s, seed] of list) {
    const r = rng(seed), gs = [], n = 9 + Math.floor(r() * 6);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n - 0.5, rad = s * (0.34 + 0.3 * r()) * (1 - Math.abs(u) * 0.9);
      const g = new THREE.SphereGeometry(rad, 20, 14); g.scale(1.15, 0.78, 1); g.translate(u * s * 2.6 + (r() - 0.5) * s * 0.3, rad * 0.5 + (r() - 0.5) * s * 0.12, (r() - 0.5) * s * 0.9); gs.push(g);
    }
    const m = new THREE.Mesh(mergeGeometries(gs), mat); m.position.set(x, y, z); m.rotation.y = r() * 0.6 - 0.3; scene.add(m); out.push({ m, x0: x });
  }
  return { setTime: t => { for (const c of out) c.m.position.x = c.x0 + t * 0.9; } };
}
