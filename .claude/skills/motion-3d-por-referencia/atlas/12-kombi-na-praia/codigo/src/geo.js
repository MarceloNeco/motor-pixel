// Geografia do mundo: tudo aqui é função pura de (x, z), sem three.js,
// para servir à malha do terreno, à simulação da kombi e ao posicionamento da flora.
// Eixos: +X leste (sentido da viagem), +Z sul, +Y cima. O mar fica ao norte (−Z).

export const PI = Math.PI, TAU = PI * 2, D2R = PI / 180;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
// smoothstep que aceita a > b (rampa decrescente)
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function h2(ix, iy) { let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
export function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy), b = h2(ix + 1, iy), c = h2(ix, iy + 1), d = h2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}
export function fbm2(x, y, oct = 3) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise2(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }

// Curva por chaves, cúbica monotônica (não passa do alvo entre chaves)
export function track(keys) {
  const n = keys.length, xs = keys.map(k => k[0]), ys = keys.map(k => k[1]), d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return t => {
    if (t <= xs[0]) return ys[0]; if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], s = (t - xs[i]) / h, s2 = s * s, s3 = s2 * s;
    return ys[i] * (2 * s3 - 3 * s2 + 1) + m[i] * h * (s3 - 2 * s2 + s) + ys[i + 1] * (-2 * s3 + 3 * s2) + m[i + 1] * h * (s3 - s2);
  };
}

// ---------- Costa ----------
// A linha d'água média. A leste de x=30 corre quase reta; a oeste abre em parábola
// para o noroeste, formando a baía e deixando terra (o cabo com as montanhas) atrás da estrada.
export const SH0 = -15, SHK = 0.004;
export function shoreZ(x) { const a = Math.max(0, 30 - x), b = Math.max(0, x - 30); return SH0 - SHK * a * a + 0.003 * b * b; }
// distância assinada até a água (>0 em terra)
export function shoreDist(x, z) {
  const a = Math.max(0, 30 - x), b = Math.max(0, x - 30), s = 2 * SHK * a + 0.006 * b;
  return (z - shoreZ(x)) / Math.sqrt(1 + s * s);
}

// ---------- Estrada / rota da kombi ----------
export const X_START = -90;      // posição em t = 0
export const X_JUMP = -43;       // a última crista, a do salto grande
export const HILL_L = 12;        // distância entre cristas (1,2 s a 10 m/s, como na referência)
export function pathZ(x) { return 2.3 * Math.sin((x + 90) / 11 + 0.3) * smooth(-12, -40, x) - 5.6 * smooth(-8, 16, x); }
export function pathDz(x) { return (pathZ(x + 0.02) - pathZ(x - 0.02)) / 0.04; }
export function pathDDz(x) { return (pathZ(x + 0.2) - 2 * pathZ(x) + pathZ(x - 0.2)) / 0.04; }
export const CFG = { A: 0.48, AJ: 0.30 };   // amplitude dos morros e reforço da última crista
export function wave(x) {
  const A = CFG.A + CFG.AJ * smooth(-56, -46, x);
  const fade = 1 - smooth(X_JUMP, X_JUMP + 6, x);
  return A * fade * Math.cos(TAU * (x - X_JUMP) / HILL_L);
}

// ---------- Relevo ----------
function upMask(x, z) { return smooth(22, 34, shoreDist(x, z)); }
export function beachH(x, z, d) {
  if (d >= 0) return 1.15 * (1 - Math.exp(-d / 13)) + 0.11 * (Math.sin(x * 0.33 + z * 0.21) + Math.sin(z * 0.47 - x * 0.16 + 1.7)) * smooth(5, 13, d);
  return Math.max(-7, d * 0.075);
}
function upH(x, z, lumps) {
  let h = 6.6;
  h += 4.4 * smooth(-5, -30, z) * smooth(-42, -60, x);        // espigão ao norte da estrada (esconde o mar no 1º ato)
  h += 1.2 * smooth(5, 24, z);                                 // o lado sul sobe um pouco
  h += 0.008 * Math.max(0, -x - 70);
  const far = Math.max(0, Math.hypot(Math.max(0, -x - 40), Math.max(0, -z - 20)) - 40);
  h += 3 * smooth(0, 220, far);
  if (lumps > 0) {
    const amp = z > 2 ? 0.45 : 1.0;                            // sul mais calmo: é por onde a câmera passa
    h += lumps * amp * (0.85 * Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.13 + 0.4) + 0.5 * Math.sin(x * 0.23 + z * 0.17 + 0.8));
  }
  return h;
}
function sideH(x, z, lumps) {
  // atrás da praia, ao sul da rota, a baixada se estende (restinga): a câmera chega rente ao chão, sem morro no caminho
  const E = 26 * smooth(-34, -6, x) * smooth(2, 10, z - pathZ(x));
  const d = shoreDist(x, z), u = smooth(22 + E, 34 + E, d);
  const hb = beachH(x, z, d);
  return u <= 0 ? hb : lerp(hb, upH(x, z, lumps), u);
}
function roadW(x, z) {
  const dz = z - pathZ(x);
  // ao sul, na descida, o corte da estrada abre num vale largo: é por onde a câmera acompanha o salto
  const wide = dz > 0 ? lerp(9.5, 36, smooth(-64, -46, x)) : 9.5;
  return (1 - smooth(3.2, wide, Math.abs(dz))) * (1 - smooth(-12, -3, x));
}
export function roadBase(x) { return sideH(x, pathZ(x), 0); }
export function groundH(x, z) {
  const w = roadW(x, z);
  const hs = sideH(x, z, 1 - w);
  if (w <= 0) return hs;
  const dz = Math.abs(z - pathZ(x));
  const hr = roadBase(x) + wave(x) + 0.05 * Math.exp(-(((dz - 2.5) / 0.55) ** 2));
  return lerp(hs, hr, w);
}
export function groundN(x, z, out) {            // normal aproximada
  const e = 0.25, hx = groundH(x + e, z) - groundH(x - e, z), hz = groundH(x, z + e) - groundH(x, z - e);
  const nx = -hx / (2 * e), nz = -hz / (2 * e), l = Math.hypot(nx, 1, nz);
  out[0] = nx / l; out[1] = 1 / l; out[2] = nz / l; return out;
}

// ---------- Cor do chão (sRGB 0..1) ----------
const S = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
const G1 = S(0x55902f), G2 = S(0x7aab3f), G3 = S(0xa2c458), GY = S(0xb9c56a);
const SAND = S(0xf4dfb2), SAND2 = S(0xe9cb97), WET = S(0xc6a377), ROAD = S(0xe3c084), ROAD2 = S(0xd3aa6b);
export function groundCol(x, z, o) {
  const d = shoreDist(x, z);
  const n1 = fbm2(x * 0.045 + 3.1, z * 0.045 - 1.7, 3);
  const n2 = fbm2(x * 0.31, z * 0.31, 2);
  const n3 = noise2(x * 2.3, z * 2.3);
  // grama
  const t = clamp(0.5 + 0.9 * n1 + 0.25 * n2), hi = smooth(0.2, 0.65, n1 + 0.3 * n2) * 0.55;
  let r = lerp(lerp(G1[0], G2[0], t), G3[0], hi), g = lerp(lerp(G1[1], G2[1], t), G3[1], hi), b = lerp(lerp(G1[2], G2[2], t), G3[2], hi);
  r += n3 * 0.03; g += n3 * 0.04; b += n3 * 0.02;
  // areia
  const sv = 0.5 + 0.5 * n2, rp = Math.sin((x * 0.55 + z * 0.83) * 7.5 + 9 * n2 + 5 * n1) * 0.007 + n3 * 0.012;
  let sr = lerp(SAND2[0], SAND[0], sv) + rp, sg = lerp(SAND2[1], SAND[1], sv) + rp, sb = lerp(SAND2[2], SAND[2], sv) + rp;
  const wet = (1 - smooth(0.4, 2.8, d + 0.7 * n2)) * 0.92;
  sr = lerp(sr, WET[0], wet); sg = lerp(sg, WET[1], wet); sb = lerp(sb, WET[2], wet);
  // fronteira areia/grama, ondulada
  const gm = smooth(19.5, 27, d + 7 * n1 + 1.2 * n2);
  const yel = (1 - Math.abs(2 * gm - 1)) * 0.6;                  // grama amarelada de duna na transição
  r = lerp(r, GY[0], yel); g = lerp(g, GY[1], yel); b = lerp(b, GY[2], yel);
  r = lerp(sr, r, gm); g = lerp(sg, g, gm); b = lerp(sb, b, gm);
  // estrada de terra
  const adz = Math.abs(z - pathZ(x)), dz = adz + 0.22 * n2 + 0.05 * n3;
  const fadeX = 1 - smooth(-12, -4, x);
  const rw = (1 - smooth(1.75, 2.3, dz)) * fadeX;
  const verge = smooth(1.5, 2.1, dz) * (1 - smooth(2.1, 3.2, dz)) * fadeX * 0.10;
  r -= verge; g -= verge; b -= verge * 0.6;
  if (rw > 0) {
    const rv = 0.5 + 0.5 * n2, rut = Math.exp(-(((adz - 0.88) / 0.21) ** 2)) * 0.055;
    const rr = lerp(ROAD2[0], ROAD[0], rv) - rut + n3 * 0.012, rg = lerp(ROAD2[1], ROAD[1], rv) - rut + n3 * 0.012, rb = lerp(ROAD2[2], ROAD[2], rv) - rut + n3 * 0.01;
    r = lerp(r, rr, rw); g = lerp(g, rg, rw); b = lerp(b, rb, rw);
  }
  o[0] = clamp(r); o[1] = clamp(g); o[2] = clamp(b); o[3] = wet;
  return o;
}
