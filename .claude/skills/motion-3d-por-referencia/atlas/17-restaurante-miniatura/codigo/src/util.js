// Utilitários: aleatório com semente, ruído, curvas de aceleração e helpers de canvas.
import * as THREE from 'three';

export function rng(seed = 1) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
  return f;
}

// ---- ruído simplex 3D (Stefan Gustavson, domínio público) ----
const grad3 = new Float32Array([1,1,0, -1,1,0, 1,-1,0, -1,-1,0, 1,0,1, -1,0,1, 1,0,-1, -1,0,-1, 0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1]);
const perm = new Uint8Array(512);
{
  const r = rng(1337); const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
export function noise3(x, y, z) {
  const F3 = 1 / 3, G3 = 1 / 6;
  const s = (x + y + z) * F3;
  const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
  const t = (i + j + k) * G3;
  const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
  let i1, j1, k1, i2, j2, k2;
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
  } else {
    if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
  }
  const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
  const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
  const ii = i & 255, jj = j & 255, kk = k & 255;
  let n = 0;
  const c = (gi, xx, yy, zz) => {
    let tt = 0.6 - xx * xx - yy * yy - zz * zz;
    if (tt < 0) return 0;
    tt *= tt; const g = (gi % 12) * 3;
    return tt * tt * (grad3[g] * xx + grad3[g + 1] * yy + grad3[g + 2] * zz);
  };
  n += c(perm[ii + perm[jj + perm[kk]]], x0, y0, z0);
  n += c(perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x1, y1, z1);
  n += c(perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x2, y2, z2);
  n += c(perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x3, y3, z3);
  return 32 * n;
}
export function fbm3(x, y, z, oct = 4, lac = 2, gain = 0.5) {
  let a = 1, f = 1, s = 0, n = 0;
  for (let o = 0; o < oct; o++) { s += a * noise3(x * f, y * f, z * f); n += a; a *= gain; f *= lac; }
  return s / n;
}

// ---- tempo ----
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const remap = (x, a, b) => clamp((x - a) / (b - a));
export const smooth = t => t * t * (3 - 2 * t);
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
export const easeInCubic = t => t * t * t;
export const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
export const easeInQuad = t => t * t;
export const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
// mola amortecida: 0 -> 1 com um pequeno excesso
export const springOut = (t, k = 7, d = 5.5) => (t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(k * t));

// ---- canvas ----
export function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
export function texFrom(c, { srgb = true, repeat = null, aniso = 8, mip = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = aniso;
  if (!mip) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  return t;
}
// mancha de ruído em escala de cinza num canvas (tileável por wrap da função)
export function noiseCanvas(size, scale, oct, seed = 0, fn = v => v) {
  const [c, g] = canvas(size, size);
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // tileável: amostra num toro 4D aproximado por duas fases
    const u = x / size, v = y / size;
    const a = u * Math.PI * 2, b = v * Math.PI * 2;
    const n = fbm3(Math.cos(a) * scale + seed, Math.sin(a) * scale + Math.cos(b) * scale, Math.sin(b) * scale - seed, oct);
    const val = clamp(fn(n * 0.5 + 0.5)) * 255;
    const i = (y * size + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = val; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function colorJitter(hex, r, amt = 0.08) {
  const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h + (r() - 0.5) * amt * 0.3, clamp(hsl.s + (r() - 0.5) * amt), clamp(hsl.l + (r() - 0.5) * amt));
  return c;
}
