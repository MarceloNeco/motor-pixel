// Câmera descrita por números que dá para medir na referência e interpolar:
//   az   azimute em graus (0 = olhando de +z para a origem; cresce para +x)
//   el   elevação em graus acima do horizonte
//   dist distância até o alvo
//   alvo [x, y, z] para onde ela olha
//   fov  campo de visão vertical em graus (perspectiva)  ·  alt = altura visível em unidades (ortográfica)
// É a mesma convenção que scripts/camera.py devolve ao resolver a câmera da referência.
import * as THREE from 'three';

const R = Math.PI / 180;

export function criarCamera(W, H, { orto = false, perto = 0.1, longe = 400 } = {}) {
  return orto ? new THREE.OrthographicCamera(-1, 1, 1, -1, perto, longe) : new THREE.PerspectiveCamera(30, W / H, perto, longe);
}

export function aplicarCamera(cam, W, H, p) {
  const az = p.az * R, el = p.el * R, [x, y, z] = p.alvo || [0, 0, 0];
  cam.position.set(x + p.dist * Math.sin(az) * Math.cos(el), y + p.dist * Math.sin(el), z + p.dist * Math.cos(az) * Math.cos(el));
  cam.up.set(0, 1, 0);
  cam.lookAt(x, y, z);
  if (p.rolo) cam.rotateZ(p.rolo * R);
  if (cam.isOrthographicCamera) {
    const a = (p.alt ?? 10) / 2, l = a * W / H;
    cam.left = -l; cam.right = l; cam.top = a; cam.bottom = -a;
  } else {
    cam.fov = p.fov ?? 30; cam.aspect = W / H;
  }
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
}

// interpola dois enquadramentos (para movimento DENTRO de um plano; entre planos, use corte seco)
export function entreCameras(a, b, k) {
  const m = (u, v) => u + (v - u) * k, A = a.alvo || [0, 0, 0], B = b.alvo || [0, 0, 0];
  let daz = ((b.az - a.az + 540) % 360) - 180;
  return { az: a.az + daz * k, el: m(a.el, b.el), dist: m(a.dist, b.dist), alvo: [m(A[0], B[0]), m(A[1], B[1]), m(A[2], B[2])], fov: m(a.fov ?? 30, b.fov ?? 30), alt: m(a.alt ?? 10, b.alt ?? 10), rolo: m(a.rolo ?? 0, b.rolo ?? 0) };
}

// Plano único (sem corte): a câmera passa por uma lista de chaves [{ t, cam, curva }] em ordem de tempo. Entre duas
// chaves interpola com a curva da chave de chegada (padrão: acelera e freia, parando em cada chave). Antes da
// primeira e depois da última, segura. Para a câmera não parar numa chave, use curva linear nas duas vizinhas.
const _suave = k => k * k * (3 - 2 * k);
export function cameraPorChaves(chaves, t) {
  if (t <= chaves[0].t) return chaves[0].cam;
  for (let i = 1; i < chaves.length; i++) {
    if (t <= chaves[i].t) {
      const k = (t - chaves[i - 1].t) / (chaves[i].t - chaves[i - 1].t);
      return entreCameras(chaves[i - 1].cam, chaves[i].cam, (chaves[i].curva || _suave)(k));
    }
  }
  return chaves[chaves.length - 1].cam;
}

// "az,el,dist,x,y,z,fov" (parâmetro ?cam= da página e --cam= do render): câmera de inspeção
export function cameraDeTexto(s) {
  const v = s.split(',').map(Number);
  return { az: v[0], el: v[1], dist: v[2], alvo: [v[3] || 0, v[4] || 0, v[5] || 0], fov: v[6] || 30, alt: v[6] || 10 };
}

// ponto do mundo (ou local de um objeto) → pixel na tela. Para rótulos e para conferir o enquadramento.
const _v = new THREE.Vector3();
export function naTela(cam, W, H, ponto, objeto = null) {
  _v.set(ponto[0], ponto[1], ponto[2]);
  if (objeto) objeto.localToWorld(_v);
  _v.project(cam);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, atras: _v.z > 1 };
}

// Enquadra uma caixa: devolve a distância (perspectiva) ou a altura visível (orto) para a caixa caber com margem.
// Evita o erro clássico de a peça sair do quadro quando a cena cresce.
export function enquadrar(cam, W, H, p, caixa, margem = 1.12) {
  const c = new THREE.Vector3(), tam = new THREE.Vector3(); caixa.getCenter(c); caixa.getSize(tam);
  const raio = tam.length() / 2 * margem;
  if (cam.isOrthographicCamera) return { ...p, alvo: [c.x, c.y, c.z], alt: 2 * raio * Math.max(1, H / W) };
  const fv = (p.fov ?? 30) * R / 2, fh = Math.atan(Math.tan(fv) * W / H);
  return { ...p, alvo: [c.x, c.y, c.z], dist: raio / Math.sin(Math.min(fv, fh)) };
}
