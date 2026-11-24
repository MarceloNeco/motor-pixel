// Controle de videogame genérico (desenho próprio, sem marca): corpo esculpido por SDF,
// alavancas, direcional e botões pousados na face.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { smin, smax, sdEllipsoid, sdRoundCone, sdRoundBox, polygonize, surfaceZ, gradient } from '../sdf.js';

export function criarControle() {
  const sdf = (x, y, z) => {
    const ax = Math.abs(x);
    let d = sdEllipsoid(x, y, z, 0, 0.20, 0, 1.25, 0.66, 0.36);                                  // miolo
    d = smin(d, sdRoundBox(x, y, z, 0, -0.06, -0.02, 0.98, 0.46, 0.36, 0.3), 0.2);              // queixo: face plana até embaixo
    d = smin(d, sdEllipsoid(ax, y, z, 0.98, 0.26, 0.0, 0.74, 0.70, 0.38), 0.25);               // ombros
    d = smin(d, sdRoundCone(ax, y, z, 1.10, 0.0, -0.02, 1.36, -0.90, -0.30, 0.50, 0.38), 0.26); // punhos
    d = smax(d, z - (0.33 - 0.02 * (x * x * 0.4 + y * y)), 0.08);                               // face quase plana
    return d;
  };
  const corpoGeo = polygonize(sdf, [-2.0, -1.5, -0.85], [2.0, 1.1, 0.5], 0.025);

  const plastico = new THREE.MeshPhysicalMaterial({ color: 0xc9c9ce, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.14 });
  const borracha = new THREE.MeshPhysicalMaterial({ color: 0x3b3c41, roughness: 0.7, clearcoat: 0.1, clearcoatRoughness: 0.5 });
  const fosco = new THREE.MeshPhysicalMaterial({ color: 0x2c2d31, roughness: 0.52, clearcoat: 0.2, clearcoatRoughness: 0.4 });
  const brilho = new THREE.MeshPhysicalMaterial({ color: 0x17181b, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.18 });
  const cinza = new THREE.MeshPhysicalMaterial({ color: 0x55575c, roughness: 0.5, clearcoat: 0.2 });

  // linha de junção das duas metades da carcaça: um risco escuro em volta do corpo
  plastico.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.22, 1.0, smoothstep(0.0035, 0.0075, abs(vObj.z + 0.045)));\ndiffuseColor.rgb *= mix(vec3(1.0), vec3(0.4, 0.41, 0.44), smoothstep(-0.045, -0.052, vObj.z));'); // a metade de trás da carcaça é cinza
  };
  const grupo = new THREE.Group();
  const corpo = new THREE.Mesh(corpoGeo, plastico);
  grupo.add(corpo);

  const Z = new THREE.Vector3(0, 0, 1);
  // pousa uma peça (eixo local +Z para fora) na face, no ponto (x, y)
  function naFace(x, y, peca, afunda = 0) {
    const z = surfaceZ(sdf, x, y, 1.2, 0);
    const n = gradient(sdf, x, y, z);
    peca.position.set(x, y, z).addScaledVector(n, -afunda);
    peca.quaternion.setFromUnitVectors(Z, n);
    grupo.add(peca);
    return new THREE.Vector3(x, y, z);
  }
  // o perfil é escrito de cima para baixo; o torno do three quer de baixo para cima (senão a peça sai do avesso)
  const torno = pts => new THREE.LatheGeometry(pts.slice().reverse().map(p => new THREE.Vector2(p[0], p[1])), 48).rotateX(Math.PI / 2);

  function alavanca() {
    const g = new THREE.Group();
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.05, 14, 56), cinza); aro.position.z = 0.012; g.add(aro);
    const poco = new THREE.Mesh(new THREE.CircleGeometry(0.275, 48), brilho); poco.position.z = 0.004; g.add(poco);
    const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.13, 28).rotateX(Math.PI / 2), borracha); haste.position.z = 0.065; g.add(haste);
    const topo = new THREE.Mesh(torno([[0, 0.01], [0.1, 0.014], [0.17, 0.032], [0.205, 0.048], [0.228, 0.048], [0.246, 0.032], [0.25, 0.006], [0.236, -0.02], [0.13, -0.03], [0, -0.03]]), borracha);
    topo.position.z = 0.155; g.add(topo);
    const friso = new THREE.Mesh(new THREE.TorusGeometry(0.243, 0.012, 8, 56), cinza); friso.position.z = 0.172; g.add(friso); // aro serrilhado da borda
    return g;
  }
  function direcional() {
    const g = new THREE.Group();
    const prato = new THREE.Mesh(torno([[0, 0.014], [0.285, 0.014], [0.315, 0.002], [0.315, -0.03], [0, -0.03]]), cinza); g.add(prato);
    for (const [w, h] of [[0.52, 0.168], [0.168, 0.52]]) {
      const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.13, 5, 0.035), borracha); b.position.z = 0.05; g.add(b);
    }
    return g;
  }
  const botao = (r, mat = brilho) => new THREE.Mesh(torno([[0, r * 0.6], [r * 0.45, r * 0.56], [r * 0.78, r * 0.43], [r * 0.95, r * 0.24], [r, 0.05 * r], [r, -r * 0.3], [0, -r * 0.3]]), mat);

  const pAlavE = naFace(-0.98, 0.40, alavanca());
  const pDir = naFace(-0.42, -0.12, direcional());
  const pAlavD = naFace(0.42, -0.12, alavanca());
  for (const [dx, dy] of [[0, 0.21], [0.21, 0], [0, -0.21], [-0.21, 0]]) naFace(0.98 + dx, 0.40 + dy, botao(0.088, fosco));
  naFace(0, 0.58, botao(0.115, cinza));
  for (const sx of [-1, 1]) naFace(sx * 0.3, 0.40, botao(0.05, borracha));

  // gatilhos e botões de ombro (lado de cima / costas)
  for (const sx of [-1, 1]) {
    const ombro = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.2, 0.36, 5, 0.09), borracha);
    ombro.position.set(sx * 0.9, 0.87, -0.04); ombro.rotation.z = -sx * 0.2; grupo.add(ombro);
    const gatilho = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.42, 0.34, 5, 0.14), borracha);
    gatilho.position.set(sx * 1.0, 0.68, -0.33); gatilho.rotation.x = 0.5; grupo.add(gatilho);
  }
  grupo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  return {
    id: 'controle',
    nome: 'Controle',
    grupo,
    hospedeiro: corpoGeo,
    // onde a natureza começa e até onde vai. c: centro, r: raios, t0: quando começa, dur: quanto leva até a borda.
    sementes: [
      { tipo: 'flor', c: [1.02, 0.66, 0.2], r: [0.78, 0.56, 0.8], t0: 0.30, dur: 3.4 },
      { tipo: 'flor', c: [0.02, 0.84, 0.15], r: [0.62, 0.36, 0.7], t0: 0.75, dur: 3.2 },
      { tipo: 'flor', c: [-1.3, 0.62, 0.1], r: [0.56, 0.5, 0.7], t0: 1.10, dur: 2.9 },
      { tipo: 'flor', c: [1.62, 0.0, 0.05], r: [0.42, 0.55, 0.5], t0: 1.75, dur: 2.4 },
      { tipo: 'flor', c: [0.3, 0.3, -0.45], r: [1.1, 0.6, 0.4], t0: 0.85, dur: 3.0 },
      { tipo: 'flor', c: [0.62, -0.44, 0.25], r: [0.6, 0.2, 0.5], t0: 2.2, dur: 2.0 },
      { tipo: 'flor', c: [-0.62, -0.48, 0.25], r: [0.46, 0.17, 0.5], t0: 2.6, dur: 1.8 },
      { tipo: 'musgo', c: [0.0, -0.4, 0.2], r: [1.0, 0.36, 0.6], t0: 0.10, dur: 3.2 },
      { tipo: 'musgo', c: [1.32, -0.75, -0.1], r: [0.52, 0.62, 0.6], t0: 0.45, dur: 3.4 },
      { tipo: 'musgo', c: [-1.22, -0.22, 0.2], r: [0.45, 0.3, 0.5], t0: 0.95, dur: 2.6 },
      { tipo: 'musgo', c: [-0.6, -0.2, -0.5], r: [1.0, 0.7, 0.4], t0: 0.65, dur: 3.4 },
    ],
    // os comandos ficam à mostra: é o que faz o objeto continuar reconhecível
    exclusoes: [
      { c: pAlavE.toArray(), r: 0.35 }, { c: pAlavD.toArray(), r: 0.35 }, { c: pDir.toArray(), r: 0.36 },
    ],
    paleta: ['#ff3f93', '#e8327f', '#d94fd0', '#ff6a5c', '#ff7a3d', '#ff9a2e', '#ffb02e', '#ffc93a', '#ffb59a', '#fff1dc', '#ff5fa8'],
    fundo: 'radial-gradient(ellipse 100% 125% at 15% 88%, #f1e9e3 0%, #ddc9bd 15%, #b08a72 33%, #6f3d27 54%, #33190f 75%, #100807 100%)',
    pose: { x: -0.5, z: -0.12, y0: -0.6 },
    escala: 1,
  };
}
