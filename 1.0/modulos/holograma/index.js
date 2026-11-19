/* Módulo holograma: material de holograma (Fresnel) para um corpo ou objeto 3D,
   músculo aceso e aparelho com peças que se mexem.
   Requer Three.js e os addons de pós-processamento copiados em ../libs/. */
import * as THREE from '../../libs/three.module.js';
import { EffectComposer } from '../../libs/three-addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../../libs/three-addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../libs/three-addons/postprocessing/UnrealBloomPass.js';

/** Material de holograma: borda brilhante (Fresnel), corpo translúcido, mistura aditiva. */
export function materialHolograma(cor = '#2F7BFF', intensidade = 1.0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCor: { value: new THREE.Color(cor) },
      uIntensidade: { value: intensidade },
      uTempo: { value: 0 },
    },
    vertexShader: /* glsl */`
      #include <common>
      #include <skinning_pars_vertex>
      varying vec3 vNormal;
      varying vec3 vVista;
      varying float vAltura;
      void main() {
        #include <skinbase_vertex>
        #include <beginnormal_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
        vNormal = normalize(normalMatrix * objectNormal);
        vVista = normalize(-mv.xyz);
        vAltura = (modelMatrix * vec4(transformed, 1.0)).y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCor;
      uniform float uIntensidade;
      uniform float uTempo;
      varying vec3 vNormal;
      varying vec3 vVista;
      varying float vAltura;
      void main() {
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vVista)), 0.0), 2.5);
        float linhas = 0.85 + 0.15 * sin(vAltura * 120.0 - uTempo * 2.0);   // linhas finas e sutis
        float brilho = (0.18 + fresnel * 1.6) * linhas * uIntensidade;
        gl_FragColor = vec4(uCor * brilho, clamp(0.25 + fresnel, 0.0, 1.0));
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/** Aplica o holograma no corpo e acende os músculos cujo nome de malha estiver na lista. */
export function vestirHolograma(corpo, musculosAcesos = [], cor = '#2F7BFF') {
  const base = materialHolograma(cor, 1.0);
  const aceso = materialHolograma('#FFFFFF', 1.8);
  corpo.traverse((o) => {
    if (!o.isMesh) return;
    o.material = musculosAcesos.includes(o.name) ? aceso : base;
  });
  return [base, aceso];
}

/** Cena escura com bloom (brilho) — o visual das referências azul/verde. */
export function criarCenaHolograma(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(2.5, 1.4, 3.2);

  const chao = new THREE.Mesh(
    new THREE.CircleGeometry(6, 64),
    new THREE.MeshStandardMaterial({ color: '#05070C', metalness: 0.9, roughness: 0.25 })
  );
  chao.rotation.x = -Math.PI / 2;
  scene.add(chao);
  scene.add(new THREE.HemisphereLight('#8FB8FF', '#000000', 0.4));

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const leve = (navigator.deviceMemory || 4) <= 2;
  if (!leve) composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.5, 0.1));

  function ajustar() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', ajustar); ajustar();
  return { renderer, scene, camera, composer };
}

/** Aparelho: peças nomeadas no .glb, movidas pelo código. */
export function controlarAparelho(aparelho) {
  const p = (nome) => aparelho.getObjectByName(nome);
  const placas = [];
  aparelho.traverse((o) => { if (/^placa_\d+/.test(o.name)) placas.push(o); });
  placas.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const baseY = placas.map((pl) => pl.position.y);
  let carga = 5;            // número de placas presas pelo pino

  return {
    /** Ângulo do encosto em graus (0 = reto). */
    encosto(graus) { const e = p('encosto'); if (e) e.rotation.x = THREE.MathUtils.degToRad(-graus); },
    /** Coloca o pino na placa n (anima o pino descendo até ela). */
    pino(n) { carga = n; const pin = p('pino'); if (pin && placas[n - 1]) pin.position.y = placas[n - 1].position.y; },
    /** Curso do movimento de 0 (repouso) a 1 (topo): sobe as placas presas e o puxador. */
    movimento(k, alturaMax = 0.5) {
      placas.forEach((pl, i) => { pl.position.y = baseY[i] + (i < carga ? k * alturaMax : 0); });
      const puxador = p('puxador'); if (puxador) puxador.position.y = puxador.userData.y0 - k * alturaMax;
    },
  };
}
