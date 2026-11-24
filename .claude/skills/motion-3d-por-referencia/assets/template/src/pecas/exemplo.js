// Exemplo de peça para o banco: `node render.mjs peca exemplo`. Apague quando tiver as suas.
import * as THREE from 'three';
import { caixaMacia, cyl, sph, M } from '../lib/formas.js';

export default function criar() {
  const g = new THREE.Group();
  const corpo = caixaMacia(2, 1.3, 1.1, M('#d97757', { r: 0.25, verniz: 1 }), { expoente: 4 });
  corpo.position.y = 0.9; g.add(corpo);
  for (const x of [-0.6, 0.6]) g.add(cyl(0.16, 0.14, 0.5, M('#d97757', { r: 0.25, verniz: 1 }), x, 0.25, 0));
  for (const x of [-0.42, 0.42]) g.add(sph(0.11, M('#111', { r: 0.1, verniz: 1 }), x, 1.05, 0.5));
  return { grupo: g, pose(t) { corpo.rotation.z = Math.sin(t * 6.2832) * 0.08; } };
}
