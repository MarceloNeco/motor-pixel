// Peças: cada objeto do filme mora em src/pecas/NOME.js e é revisado sozinho no banco (`node render.mjs peca NOME`).
// A cena carrega a peça por aqui. Se o arquivo ainda não existe, entra um SUBSTITUTO do tamanho declarado: dá para
// montar câmera, luz e a animação inteira enquanto as peças de verdade são feitas em paralelo, e trocar depois sem
// mexer na cena.
import * as THREE from 'three';

const FALTAM = [];
export const pecasQueFaltam = () => [...FALTAM];

// tamanho = [largura, altura, profundidade] do substituto (a caixa em que a peça real tem de caber)
// Devolve { grupo, pose(estado), pronta }. Convenção das peças: base em y = 0, centro em x = z = 0, frente para +z.
export async function carregarPeca(nome, tamanho = [1, 1, 1], opcoes = {}) {
  const url = new URL(`../pecas/${nome}.js`, import.meta.url);
  const existe = await fetch(url, { method: 'HEAD' }).then(r => r.ok).catch(() => false);
  if (existe) {
    const mod = await import(url.href);                       // erro de sintaxe na peça aparece aqui, e deve aparecer
    const feito = (mod.default || mod.criar)(opcoes);
    return feito.isObject3D ? { grupo: feito, pose() {}, pronta: true } : { pose() {}, ...feito, pronta: true };
  }
  FALTAM.push(nome);
  console.log(`[cena] substituto no lugar de "${nome}" (${tamanho.join(' × ')}): a peça src/pecas/${nome}.js ainda não existe`);
  const [w, h, d] = tamanho, g = new THREE.Group();
  const caixa = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: '#8d8f96', roughness: 0.9 }));
  caixa.position.y = h / 2; caixa.castShadow = caixa.receiveShadow = true;
  const frente = new THREE.Mesh(new THREE.ConeGeometry(Math.min(w, h) * 0.12, Math.min(w, h) * 0.3, 12), new THREE.MeshStandardMaterial({ color: '#ff5a36' }));
  frente.rotation.x = Math.PI / 2; frente.position.set(0, h / 2, d / 2 + Math.min(w, h) * 0.15);      // a seta mostra a frente (+z)
  g.add(caixa, frente);
  return { grupo: g, pose() {}, pronta: false };
}
