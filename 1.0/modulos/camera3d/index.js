/* Módulo camera3d: três câmeras para andar num mundo 3D com paredes (atrás, primeira pessoa, drone de cima).
   - camera: THREE.PerspectiveCamera
   - alvo: o personagem (THREE.Object3D) com rotation.y = direção em que olha
   - paredes: lista de malhas para testar colisão da câmera (ou o InstancedMesh das paredes)
   - tamanhoMundo: largura do mundo em metros (para a vista de cima) */
import * as THREE from '../../libs/three.module.js';

export function criarCameras(camera, alvo, paredes, tamanhoMundo) {
  let modo = 'atras';          // 'atras' | 'dentro' | 'cima'
  let tempoCima = 0;
  let usosCima = 3;
  const raio = new THREE.Raycaster();
  const desejada = new THREE.Vector3();
  const olhar = new THREE.Vector3();
  const frente = new THREE.Vector3();

  function trocar() {
    modo = modo === 'atras' ? 'dentro' : 'atras';
    return modo;
  }

  function olharDeCima() {
    if (modo === 'cima' || usosCima <= 0) return false;
    usosCima -= 1;
    modo = 'cima';
    tempoCima = 1.5 + 3 + 1.5;     // sobe 1,5 s, fica 3 s, desce 1,5 s
    return true;
  }

  function atualizar(dt) {
    frente.set(Math.sin(alvo.rotation.y), 0, Math.cos(alvo.rotation.y));

    if (modo === 'dentro') {
      desejada.copy(alvo.position).add(new THREE.Vector3(0, 1.1, 0));
      olhar.copy(desejada).addScaledVector(frente, 5);
      camera.fov = 75;
    } else if (modo === 'atras' || modo === 'cima') {
      desejada.copy(alvo.position).addScaledVector(frente, -3.5).add(new THREE.Vector3(0, 2, 0));
      olhar.copy(alvo.position).add(new THREE.Vector3(0, 1, 0));
      // colisão: se uma parede estiver entre o personagem e a câmera, aproxima
      const origem = olhar.clone();
      const dir = desejada.clone().sub(origem);
      const dist = dir.length();
      raio.set(origem, dir.normalize());
      raio.far = dist;
      const bate = raio.intersectObjects(paredes, false)[0];
      if (bate) desejada.copy(origem).addScaledVector(dir, Math.max(0.6, bate.distance - 0.3));
      camera.fov = 60;
    }

    if (modo === 'cima') {
      tempoCima -= dt;
      const total = 6;
      const t = total - tempoCima;
      const subir = Math.min(1, t / 1.5);
      const descer = Math.min(1, Math.max(0, tempoCima) / 1.5);
      const k = Math.min(subir, descer);              // 0 -> 1 -> 0
      const suave = k * k * (3 - 2 * k);
      const topo = new THREE.Vector3(alvo.position.x, tamanhoMundo * 1.2, alvo.position.z + 0.01);
      desejada.lerp(topo, suave);
      olhar.lerp(new THREE.Vector3(alvo.position.x, 0, alvo.position.z), suave);
      if (tempoCima <= 0) modo = 'atras';
    }

    // suavização (sem trancos, evita enjoo)
    camera.position.lerp(desejada, Math.min(1, dt * (modo === 'dentro' ? 20 : 6)));
    camera.updateProjectionMatrix();
    camera.lookAt(olhar);
  }

  return { trocar, olharDeCima, atualizar, get modo() { return modo; }, get usosCima() { return usosCima; } };
}
