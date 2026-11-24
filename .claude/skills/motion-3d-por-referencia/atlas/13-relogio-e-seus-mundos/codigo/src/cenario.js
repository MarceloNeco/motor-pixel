// O cenário: uma parede pastel com faixas diagonais de luz e um aparador com objetos de casa, visto em 3/4.
// Fica sempre desfocado e é de propósito mais claro e menos saturado que o herói, para não competir com ele.
// As cores trocam por papel (parede, móvel, 4 tons de objeto).
import * as THREE from 'three';
import { PI, deg, std, mesh, group, rbox, sph, cyl, torus, lathe } from './util.js';

// paleta de cada mundo. Papéis: parede (alto, baixo, faixa de luz), móvel, tampo, friso e quatro tons de objeto.
export const PALETTES = [
  { id: 'menta',    top: '#ecf4ea', bot: '#d3e9d8', light: '#ffffff', furn: '#d8ecdc', slab: '#e7f3e9', edge: '#c2dec9', p1: '#bfe3cc', p2: '#fbfdfb', p3: '#eef3db', p4: '#97d3b2', sky: '#f4fbf2', ground: '#bfe3c8' },
  { id: 'manteiga', top: '#fcf5de', bot: '#f8eab4', light: '#fffef7', furn: '#f9ecbb', slab: '#fcf4d7', edge: '#eedb94', p1: '#fbe391', p2: '#fffefa', p3: '#fff5d2', p4: '#f3cf62', sky: '#fffbea', ground: '#f6e08c' },
  { id: 'lavanda',  top: '#eeeafb', bot: '#dbd3f6', light: '#fefdff', furn: '#dfd8f8', slab: '#ece7fb', edge: '#c8beef', p1: '#cbbff8', p2: '#fdfcff', p3: '#f0ecff', p4: '#ac9af2', sky: '#f6f3ff', ground: '#cfc4f5' },
];

export function buildRoom() {
  const scene = new THREE.Scene();
  const set = new THREE.Group();          // tudo gira junto: o lado esquerdo vem para perto, o direito foge
  set.position.set(0, 0, -10.6); set.rotation.y = deg(20);
  scene.add(set);
  const roles = {};
  const M = role => (roles[role] ??= std('#ffffff', { roughness: 0.75 }));

  // parede: degradê vertical + faixas de luz em diagonal (janela fora de quadro, no alto à esquerda)
  const wallU = { cTop: { value: new THREE.Color() }, cBot: { value: new THREE.Color() }, cLight: { value: new THREE.Color() } };
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(170, 70), new THREE.ShaderMaterial({
    uniforms: wallU,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform vec3 cTop; uniform vec3 cBot; uniform vec3 cLight; varying vec2 vP;
      void main(){
        vec3 c = mix(cBot, cTop, smoothstep(-10.0, 4.0, vP.y));
        float d = vP.x * 0.55 + vP.y;
        float b1 = smoothstep(-3.0, 2.0, d) * (1.0 - smoothstep(5.5, 10.5, d));
        float b2 = smoothstep(12.0, 13.0, d) * (1.0 - smoothstep(14.5, 16.5, d));
        float b3 = smoothstep(-9.5, -8.2, d) * (1.0 - smoothstep(-7.0, -5.0, d));
        c = mix(c, cLight, 0.72 * b1 + 0.5 * b2 + 0.34 * b3);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  wall.position.set(0, 6, -3.4);
  set.add(wall);

  // aparador
  const TOP = -4.9;
  set.add(mesh(rbox(80, 9, 4.4, 0.12), M('furn'), [0, TOP - 4.5, 0]));
  set.add(mesh(rbox(80.6, 0.3, 4.9, 0.1), M('slab'), [0, TOP + 0.1, 0]));
  for (let i = -7; i <= 7; i++) set.add(mesh(rbox(0.09, 7.6, 0.1, 0.02), M('edge'), [i * 5.2 + 1.3, TOP - 4.3, 2.22]));
  set.add(mesh(rbox(80, 0.09, 0.1, 0.02), M('edge'), [0, TOP - 2.6, 2.22]));
  for (let i = -7; i <= 7; i++) set.add(mesh(sph(0.16, 16, 12), M('p2'), [i * 5.2 + 3.9, TOP - 1.3, 2.3]));

  const Y = TOP + 0.25;
  const put = (o, x, z = 0, s = 0.8) => { o.position.set(x, Y, z); o.scale.setScalar(s); set.add(o); };

  // ---- grupo da esquerda (perto da câmera): quadro, livros com bola, garrafa
  put(group([group([
    mesh(rbox(3.4, 4.2, 0.22, 0.06), M('p2'), [0, 2.1, 0]),
    mesh(rbox(2.7, 3.5, 0.06, 0.02), M('p3'), [0, 2.1, 0.11]),
    mesh(cyl(0.9, 0.9, 0.05, 48), M('p1'), [-0.25, 2.5, 0.14], [PI / 2, 0, 0]),
    mesh(rbox(2.0, 1.0, 0.05, 0.02), M('p4'), [0.3, 0.95, 0.15], [0, 0, 0.1]),
  ], [0, 0, 0], [-0.1, 0.12, 0])]), -6.7, -1.0, 0.76);
  put(group([
    mesh(rbox(2.6, 0.42, 1.8, 0.06), M('p1'), [0, 0.21, 0], [0, 0.1, 0]),
    mesh(rbox(2.3, 0.36, 1.6, 0.06), M('p2'), [0.1, 0.6, 0], [0, -0.14, 0]),
    mesh(rbox(1.9, 0.34, 1.4, 0.06), M('p4'), [-0.05, 0.95, 0], [0, 0.22, 0]),
    mesh(sph(0.5), M('p3'), [0.2, 1.62, 0.1]),
  ]), -3.9, 0.5);
  put(group([
    mesh(lathe([[0, 0], [0.55, 0], [0.6, 0.08], [0.6, 1.5], [0.5, 1.9], [0.24, 2.15], [0.22, 2.7], [0, 2.7]]), M('p3')),
    mesh(cyl(0.27, 0.27, 0.3, 32), M('p4'), [0, 2.82, 0]),
  ]), -2.0, -0.4);
  put(group([mesh(sph(0.4), M('p4'), [0, 0.4, 0])]), -5.3, 1.3);

  // ---- grupo da direita (longe): arco, caixas, vaso com ramos, livros em pé
  put(group([mesh(torus(1.15, 0.36, PI, 64, 24), M('p1'))]), 3.6, -0.6);
  put(group([
    mesh(rbox(1.7, 1.25, 1.5, 0.08), M('p3'), [0, 0.62, 0], [0, 0.2, 0]),
    mesh(rbox(1.15, 0.9, 1.05, 0.08), M('p1'), [0.1, 1.7, 0], [0, -0.25, 0]),
  ]), 5.9, -0.2);
  const stems = [];
  for (const [a, h, c] of [[-0.3, 2.0, 'p1'], [0.05, 2.5, 'p2'], [0.34, 1.8, 'p1'], [-0.08, 1.5, 'p3']]) {
    stems.push(mesh(cyl(0.04, 0.04, h, 10), M('p4'), [Math.sin(a) * h / 2, 1.5 + Math.cos(a) * h / 2, 0], [0, 0, -a]));
    stems.push(mesh(sph(0.28), M(c), [Math.sin(a) * h, 1.5 + Math.cos(a) * h, 0]));
  }
  put(group([mesh(lathe([[0, 0], [0.5, 0], [0.74, 0.5], [0.68, 1.1], [0.36, 1.55], [0.4, 1.75], [0, 1.75]]), M('p4')), ...stems]), 8.4, -0.5);
  put(group([
    mesh(rbox(0.5, 2.9, 2.0, 0.05), M('p1'), [-0.9, 1.45, 0]),
    mesh(rbox(0.42, 2.5, 1.9, 0.05), M('p2'), [-0.4, 1.25, 0]),
    mesh(rbox(0.56, 3.2, 2.0, 0.05), M('p4'), [0.12, 1.6, 0]),
    mesh(rbox(0.44, 2.7, 1.9, 0.05), M('p3'), [0.95, 1.3, 0], [0, 0, -0.26]),
  ]), 11.4, -0.2);
  put(group([mesh(new THREE.ConeGeometry(0.9, 2.6, 48), M('p3'), [0, 1.3, 0]), mesh(cyl(0.6, 0.6, 1.3, 40), M('p1'), [1.7, 0.65, 0.4])]), 15.0, -0.3);
  put(group([mesh(cyl(0.5, 0.5, 0.8, 40), M('p2'), [0, 0.4, 0])]), 0.9, 0.9, 0.7);

  // luz do cenário
  const hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1.5);
  const sun = new THREE.DirectionalLight('#fff6ea', 1.5);
  sun.position.set(-9, 13, 8); sun.target.position.set(0, -4, -10);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 12, bottom: -12, near: 1, far: 70 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05; sun.shadow.radius = 5;
  scene.add(hemi, sun, sun.target);

  const ca = new THREE.Color(), cb = new THREE.Color();
  const mix = (a, b, k) => ca.set(a).lerp(cb.set(b), k);
  return {
    scene,
    // k = 0 → paleta a, k = 1 → paleta b
    setPalette(a, b, k) {
      wallU.cTop.value.copy(mix(a.top, b.top, k));
      wallU.cBot.value.copy(mix(a.bot, b.bot, k));
      wallU.cLight.value.copy(mix(a.light, b.light, k));
      for (const role in roles) roles[role].color.copy(mix(a[role], b[role], k));
      hemi.color.copy(mix(a.sky, b.sky, k)); hemi.groundColor.copy(mix(a.ground, b.ground, k));
    },
  };
}
