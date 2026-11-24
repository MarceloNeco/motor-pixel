// A luz do filme, usada pela cena (main.js) e pelo banco de peças (`node render.mjs peca NOME --luz=filme`).
// Uma função só para os dois: a peça é julgada sob a luz em que vai aparecer, e não chega opaca ou lavada na cena.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DS } from './ds.js';
import { luzDeArea, sol } from './lib/pos.js';

// alvo = ponto em volta do qual a luz é montada (na cena, o herói; no banco, o centro da peça)
export function montarLuz(scene, renderer, { alvo = DS.heroi, meia = 7 } = {}) {
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = DS.ambiente;
  const em = p => [alvo[0] + p[0], alvo[1] + p[1], alvo[2] + p[2]];
  const chave = sol(DS.chave.cor, DS.chave.forca, em(DS.chave.pos), { meia });
  const contra = new THREE.DirectionalLight(DS.contra.cor, DS.contra.forca); contra.position.set(...em(DS.contra.pos));
  scene.add(chave, chave.target, contra);
  // TROCAR: luzes locais, focos e ambiente próprio do filme entram aqui (e passam a valer no banco também)
  return { porSubquadro: luzDeArea(chave, em(DS.chave.pos), DS.chave.raio, alvo), chave, contra };
}
