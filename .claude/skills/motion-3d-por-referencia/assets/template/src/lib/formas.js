// Formas, materiais e texturas feitos em código. Nomes curtos porque a cena inteira é montada com eles.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from './tempo.js';

export const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };

// caixa arredondada centrada em (x, y, z). O raio é limitado para a geometria não virar do avesso em peças finas.
export function rb(w, h, d, mat, x = 0, y = 0, z = 0, r = 0.035) {
  const rr = Math.max(0.004, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002));
  const m = sh(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rr), mat)); m.position.set(x, y, z); return m;
}
// caixa por limites (x0..x1, y0..y1, z0..z1): boa para paredes, pisos e lajes, que a gente pensa por onde começam e acabam
export function bx(x0, x1, y0, y1, z0, z1, mat) {
  const m = sh(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return m;
}
export function cyl(rTopo, rBase, h, mat, x = 0, y = 0, z = 0, seg = 48) {
  const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(rTopo, rBase, h, seg), mat)); m.position.set(x, y, z); return m;
}
export function sph(r, mat, x = 0, y = 0, z = 0, seg = 48) {
  const m = sh(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.66)), mat)); m.position.set(x, y, z); return m;
}
export function cap(r, comp, mat, x = 0, y = 0, z = 0) {
  const m = sh(new THREE.Mesh(new THREE.CapsuleGeometry(r, comp, 8, 24), mat)); m.position.set(x, y, z); return m;
}
// torno: perfil = [[raio, altura], ...] de baixo para cima. Garrafas, copos, vasos, conchas, rodas.
export function torno(perfil, mat, seg = 96) {
  return sh(new THREE.Mesh(new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat));
}
// forma 2D extrudada com chanfro: pontos = [[x, y], ...] no sentido anti-horário
export function extrusao(pontos, prof, mat, chanfro = 0.02) {
  const s = new THREE.Shape(pontos.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: prof, bevelEnabled: chanfro > 0, bevelSize: chanfro, bevelThickness: chanfro, bevelSegments: 3, curveSegments: 24 });
  return sh(new THREE.Mesh(g, mat));
}
// tubo ao longo de pontos 3D: cabos, alças, arcos, trilhos
export function tubo(pontos, raio, mat, seg = 96) {
  const c = new THREE.CatmullRomCurve3(pontos.map(p => new THREE.Vector3(...p)));
  return sh(new THREE.Mesh(new THREE.TubeGeometry(c, seg, raio, 16, false), mat));
}
// grupo com pivô: gira em torno de `pivo` em vez do centro. Para juntas, portas, tampas e ponteiros.
export function comPivo(obj, pivo) {
  const g = new THREE.Group(); g.position.set(...pivo); obj.position.sub(g.position); g.add(obj); return g;
}

// caixa macia: bloco de cantos bem redondos e faces levemente estufadas, numa superfície contínua (corpo de brinquedo
// de vinil, almofada, botão, sabonete). É uma superelipse 3D: expoente 2,5 = quase um ovo · 4 = bloco macio ·
// 6 a 8 = caixa de quinas suaves. A RoundedBoxGeometry tem a face plana num quadrado só: não estufa, e com raio
// grande enterra o que está pousado na face (olhos, botões). Aqui a face é curva e o que pousa nela segue a curva.
export function caixaMacia(w, h, d, mat, { expoente = 4, seg = 28 } = {}) {
  let g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5);
  const P = g.attributes.position, a = w / 2, b = h / 2, c = d / 2, n = expoente;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const k = 1 / Math.pow(Math.pow(Math.abs(x / a), n) + Math.pow(Math.abs(y / b), n) + Math.pow(Math.abs(z / c), n), 1 / n);
    P.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return sh(new THREE.Mesh(g, mat));
}
// ponto da superfície de uma caixaMacia na direção dada (para pousar olhos, botões, adesivos sobre a curva)
export function naCaixaMacia(w, h, d, dir, expoente = 4) {
  const k = 1 / Math.pow(Math.pow(Math.abs(dir[0] / (w / 2)), expoente) + Math.pow(Math.abs(dir[1] / (h / 2)), expoente) + Math.pow(Math.abs(dir[2] / (d / 2)), expoente), 1 / expoente);
  return [dir[0] * k, dir[1] * k, dir[2] * k];
}

// ---- texturas desenhadas em canvas
export function canvasTex(w, h, desenhar, { srgb = true, repetir = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  desenhar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;   // só para cor; relevo e rugosidade ficam lineares (srgb: false)
  t.anisotropy = 8;
  return t;
}
export function tom(hex, dl, ds = 0) { const c = new THREE.Color(hex); c.offsetHSL(0, ds, dl); return '#' + c.getHexString(); }

// pontilhado cinza para bumpMap: tira a cara de plástico liso de qualquer superfície grande
export const granulado = (semente = 11, n = 900) => canvasTex(128, 128, g => {
  const r = mulberry32(semente); g.fillStyle = '#808080'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < n; i++) { const v = 90 + r() * 90 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * 128, r() * 128, 2 + r() * 3, 2 + r() * 3); }
}, { srgb: false });

// ---- materiais com cache (mesma cor e acabamento = mesmo material; menos trocas de estado na placa)
const _cache = new Map();
export function M(cor, o = {}) {
  const k = [cor, o.r ?? 0.78, o.m ?? 0, o.bump ? o.bump.uuid + '/' + (o.rep || 1) + '/' + (o.bs ?? 1.2) : '', o.e || '', o.ei ?? 1, o.verniz ?? 0, o.transp ?? 1].join('|');
  if (_cache.has(k)) return _cache.get(k);
  const fisico = o.verniz != null || o.transmissao != null;
  const m = new (fisico ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({ color: cor, roughness: o.r ?? 0.78, metalness: o.m ?? 0 });
  if (o.bump) { const b = o.bump.clone(); b.repeat.set(o.rep || 1, o.rep || 1); b.needsUpdate = true; m.bumpMap = b; m.bumpScale = o.bs ?? 1.2; }
  if (o.e) { m.emissive = new THREE.Color(o.e); m.emissiveIntensity = o.ei ?? 1; }
  if (o.verniz != null) { m.clearcoat = o.verniz; m.clearcoatRoughness = o.vr ?? 0.2; }
  if (o.transmissao != null) { m.transmission = o.transmissao; m.thickness = o.espessura ?? 0.5; m.ior = o.ior ?? 1.45; }
  if (o.transp != null && o.transp < 1) { m.transparent = true; m.opacity = o.transp; }
  _cache.set(k, m); return m;
}
// material de textura com repetição própria
export function texMat(tex, rx, ry, o = {}) {
  const t = tex.clone(); t.repeat.set(rx, ry); t.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: t, roughness: o.r ?? 0.7, metalness: o.m ?? 0 });
}

// ---- muitos iguais: uma chamada de desenho para milhares de peças. posicoes = [{ p:[x,y,z], r:[rx,ry,rz], s:1, cor }]
export function muitos(geo, mat, itens) {
  const im = new THREE.InstancedMesh(geo, mat, itens.length), o = new THREE.Object3D(), c = new THREE.Color();
  itens.forEach((it, i) => {
    o.position.set(...it.p); o.rotation.set(...(it.r || [0, 0, 0])); o.scale.setScalar(it.s ?? 1); o.updateMatrix();
    im.setMatrixAt(i, o.matrix); if (it.cor) im.setColorAt(i, c.set(it.cor));
  });
  im.castShadow = im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  return im;
}
