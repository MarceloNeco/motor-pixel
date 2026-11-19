/* Módulo personagens3d: personagem .glb com animações (troca suave) e expressões faciais por morph targets.
   criarPersonagem(null, url, scene) usa o leitor de .glb do próprio motor; dá para passar um loader próprio.
   O .glb precisa ter clips com estes nomes (ou ajuste o mapa NOMES abaixo) e,
   para expressões, morph targets no rosto (ex.: "feliz", "surpreso", "piscar"). */
import * as THREE from '../../libs/three.module.js';
import { GLTFLoader } from '../../libs/three-addons/loaders/GLTFLoader.js';

const NOMES = {
  parado: ['Idle', 'parado'],
  correr: ['Run', 'correr'],
  pular: ['Jump', 'pular'],
  comemorar: ['Victory', 'Wave', 'comemorar'],
  batida: ['HitReact', 'batida'],
};

export async function criarPersonagem(loader, url, scene) {
  const gltf = await (loader || new GLTFLoader()).loadAsync(url);
  const raiz = gltf.scene;
  raiz.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(raiz);

  const mixer = new THREE.AnimationMixer(raiz);
  const acoes = {};
  for (const [nosso, possiveis] of Object.entries(NOMES)) {
    const clip = gltf.animations.find((c) => possiveis.includes(c.name));
    if (clip) acoes[nosso] = mixer.clipAction(clip);
  }

  // Rostos: todas as malhas com morph targets
  const rostos = [];
  raiz.traverse((o) => { if (o.isMesh && o.morphTargetDictionary) rostos.push(o); });
  const alvo = {};        // nome da expressão -> valor desejado (0 a 1)
  let atual = null;
  let tempoPiscar = 3;

  function tocar(nome, fade = 0.25) {
    const nova = acoes[nome];
    if (!nova || nova === atual) return;
    nova.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (atual) atual.fadeOut(fade);
    atual = nova;
  }

  function tocarUmaVez(nome, depois = 'parado') {
    const a = acoes[nome];
    if (!a) return;
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    tocar(nome, 0.15);
    const fim = (e) => { if (e.action === a) { mixer.removeEventListener('finished', fim); tocar(depois); } };
    mixer.addEventListener('finished', fim);
  }

  function expressao(nome, valor = 1) {
    for (const k of Object.keys(alvo)) alvo[k] = 0;   // uma expressão por vez
    alvo[nome] = valor;
  }

  function atualizar(dt) {
    mixer.update(dt);
    // piscar sozinho a cada 3 a 5 s
    tempoPiscar -= dt;
    if (tempoPiscar <= 0) { alvo.piscar = 1; setTimeout(() => (alvo.piscar = 0), 120); tempoPiscar = 3 + Math.random() * 2; }
    // aproximar suavemente as formas do rosto do alvo
    for (const rosto of rostos) {
      for (const [nome, i] of Object.entries(rosto.morphTargetDictionary)) {
        const desejado = alvo[nome] || 0;
        rosto.morphTargetInfluences[i] += (desejado - rosto.morphTargetInfluences[i]) * Math.min(1, dt * 12);
      }
    }
  }

  /** Nomes das animações e expressões que o .glb trouxe (para conferir a arte). */
  const lista = () => ({ animacoes: Object.keys(acoes), expressoes: rostos.flatMap((r) => Object.keys(r.morphTargetDictionary)) });
  return { raiz, tocar, tocarUmaVez, expressao, atualizar, lista };
}
