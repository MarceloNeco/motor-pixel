/* Módulo cena3d: cria uma cena Three.js já bonita (receita medida num jogo 3D real em 15/11/2026):
   cor de cinema (ACES), sombra macia, luz céu + sol, nitidez limitada, modo leve.
   O app decide o resto (cenário, objetos, câmera). Exemplo completo em exemplos/cena3d.html. */
import * as THREE from '../../libs/three.module.js';
import { OrbitControls } from '../../libs/three-addons/controls/OrbitControls.js';
import { modoLeve, nitidez, aCadaQuadro, aoMudarTamanho } from '../nucleo/index.js';

export { THREE };

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} opcoes
 *   fundo: cor do fundo ('#BFE6FF'); null = transparente
 *   neblina: [perto, longe] ou null
 *   sombra: true/false (desligada no modo leve)
 *   girar: true = o usuário gira e dá zoom com o dedo (OrbitControls)
 */
export function criarCena(canvas, { fundo = '#BFE6FF', neblina = null, sombra = true, girar = false, camera: posCamera = [0, 1.6, 4], alvo = [0, 1, 0] } = {}) {
  const leve = modoLeve();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !leve, alpha: fundo === null });
  renderer.setPixelRatio(nitidez());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = sombra && !leve;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  if (fundo !== null) scene.background = new THREE.Color(fundo);
  if (neblina) scene.fog = new THREE.Fog(fundo || '#000000', neblina[0], leve ? neblina[1] * 0.6 : neblina[1]);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
  camera.position.set(...posCamera);
  camera.lookAt(...alvo);

  scene.add(new THREE.HemisphereLight('#FFFDF8', '#8A7BB0', 1.1));
  const sol = new THREE.DirectionalLight('#FFF1D6', 2.2);
  sol.position.set(-6, 10, 6);
  sol.castShadow = renderer.shadowMap.enabled;
  sol.shadow.mapSize.set(1024, 1024);
  scene.add(sol);

  let controles = null;
  if (girar) {
    controles = new OrbitControls(camera, canvas);
    controles.target.set(...alvo);
    controles.enableDamping = true;
    controles.enablePan = false;
    controles.minDistance = 0.6;
    controles.maxDistance = 8;
  }

  const desligarTamanho = aoMudarTamanho(canvas, (w, h) => {
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  });

  const aCada = new Set();
  const desligarLaco = aCadaQuadro((dt) => {
    for (const f of aCada) f(dt);
    controles?.update();
    renderer.render(scene, camera);
  });

  return {
    THREE, renderer, scene, camera, sol, controles, leve,
    /** Função chamada a cada quadro com o tempo desde o último (segundos). */
    aCadaQuadro(f) { aCada.add(f); return () => aCada.delete(f); },
    /** Desliga tudo e libera a memória da placa de vídeo. */
    destruir() { desligarLaco(); desligarTamanho(); controles?.dispose(); renderer.dispose(); },
  };
}
