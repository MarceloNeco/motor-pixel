/* Módulo realce3d: acender, pulsar e tocar partes de um modelo 3D pelo nome da malha.
   Mesmo vocabulário do módulo vetor (principal / apoio / tocar), para o app trocar
   entre vetorial e 3D sem mudar a lógica. Serve para músculos, peças, roupas. */
import * as THREE from '../../libs/three.module.js';
import { reduzirMovimento } from '../nucleo/index.js';

/**
 * @param {THREE.Object3D} modelo  modelo já carregado (.glb) com malhas nomeadas (ex.: "peitoral")
 * @param {object} cena            objeto devolvido por criarCena() do módulo cena3d
 */
export function criarRealce(modelo, cena, { corAtivo = '#FF3B3B', corApoio = '#FF8A8A' } = {}) {
  const partes = new Map();           // nome -> { malha, materialOriginal }
  modelo.traverse((o) => { if (o.isMesh) partes.set(o.name, { malha: o, original: o.material }); });

  const matAtivo = new THREE.MeshStandardMaterial({ color: corAtivo, emissive: corAtivo, emissiveIntensity: 0.4, roughness: 0.6 });
  const matApoio = new THREE.MeshStandardMaterial({ color: corApoio, emissive: corApoio, emissiveIntensity: 0.15, roughness: 0.7 });
  let pulsando = false, t = 0;

  const parar = cena.aCadaQuadro((dt) => {
    if (!pulsando) return;
    t += dt;
    matAtivo.emissiveIntensity = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / 1.2)));
  });

  function apagar() {
    for (const { malha, original } of partes.values()) malha.material = original;
    pulsando = false;
  }

  return {
    /** Lista os nomes das partes encontradas no modelo (útil para conferir a arte). */
    nomes: () => [...partes.keys()],
    /** Acende partes: principal (forte, pulsa) e apoio (claro). */
    realcar({ principal = [], apoio = [], pulsar = true } = {}) {
      apagar();
      for (const n of apoio) { const p = partes.get(n); if (p) p.malha.material = matApoio; }
      for (const n of principal) { const p = partes.get(n); if (p) p.malha.material = matAtivo; }
      pulsando = pulsar && !reduzirMovimento();
    },
    apagar,
    /** Tocar numa parte devolve o nome dela (ex.: "onde dói"). */
    aoTocarParte(nomesPermitidos, funcao) {
      const ray = new THREE.Raycaster(), ponto = new THREE.Vector2();
      const canvas = cena.renderer.domElement;
      let inicio = null;
      const baixo = (e) => { inicio = [e.clientX, e.clientY]; };
      const cima = (e) => {
        if (!inicio || Math.hypot(e.clientX - inicio[0], e.clientY - inicio[1]) > 6) return; // foi giro, não toque
        const r = canvas.getBoundingClientRect();
        ponto.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ponto, cena.camera);
        const acerto = ray.intersectObject(modelo, true).find((h) => nomesPermitidos.includes(h.object.name));
        if (acerto) funcao(acerto.object.name, acerto.point);
      };
      canvas.addEventListener('pointerdown', baixo);
      canvas.addEventListener('pointerup', cima);
      return () => { canvas.removeEventListener('pointerdown', baixo); canvas.removeEventListener('pointerup', cima); };
    },
    /** Leva a câmera até perto de uma parte. */
    focar(nome, distancia = 1.2) {
      const p = partes.get(nome); if (!p) return;
      const caixa = new THREE.Box3().setFromObject(p.malha), centro = caixa.getCenter(new THREE.Vector3());
      const dir = cena.camera.position.clone().sub(centro).normalize();
      cena.camera.position.copy(centro.clone().add(dir.multiplyScalar(distancia)));
      cena.controles?.target.copy(centro);
      cena.camera.lookAt(centro);
    },
    destruir() { parar(); apagar(); matAtivo.dispose(); matApoio.dispose(); },
  };
}
