// O lugar: céu com sol, mar com ondas e reflexo, e o terreno (praia, duna, colinas e a ponta de terra ao fundo).
import * as THREE from 'three';
import { smooth, lerp, col, fbm2, tinta, GLSL_RUIDO } from './util.js';

// ---------------------------------------------------------------- a linha da costa
// O mar fica em x menor que costa(z). A praia é uma meia-lua com o ponto mais fundo perto de z = 11.
export function costa(z) { const u = 23 - z; return -7 - 0.12 * u + 0.0052 * u * u; }
export function dCosta(x, z) { const u = 23 - z, dx = 0.12 - 0.0104 * u; return (x - costa(z)) / Math.sqrt(1 + dx * dx); }
const GLSL_COSTA = /* glsl */`
float dCosta(vec2 p){ float u = 23.0 - p.y; float xs = -7.0 - 0.12*u + 0.0052*u*u; float dx = 0.12 - 0.0104*u; return (p.x - xs) / sqrt(1.0 + dx*dx); }
`;

export function alt(x, z) {
  const d = dCosta(x, z);
  let y;
  if (d < 0) y = Math.max(-3, d * 0.14);
  else {
    y = d < 3 ? d * 0.07 : 0.21 + (d - 3) * 0.035;
    y += smooth(13, 25, d) * 1.9;                                                       // a duna
    y += smooth(12, 30, d) * (fbm2(x * 0.11, z * 0.11, 3) - 0.45) * 1.3;
    y += smooth(34, 110, d) * (3 + 20 * fbm2(x * 0.013 + 3.1, z * 0.013 + 7.7, 4));     // colinas
  }
  const cabo = pesoCabo(x, z);                                                          // ponta de terra ao fundo
  if (cabo > 0) y = Math.max(y, -3 + cabo * (4.4 + 26 * fbm2(x * 0.012 + 11.3, z * 0.02 + 5.1, 4) * cabo));
  return y;
}
function pesoCabo(x, z) { const ex = (x - 120) / 175, ez = (z + 250) / 44; return 1 - smooth(0.5, 1.0, Math.sqrt(ex * ex + ez * ez)); }

// ---------------------------------------------------------------- céu
export function criarCeu(C) {
  const uniforms = {
    uSol: { value: new THREE.Vector3(0, 0.1, -1) },
    cZen: { value: col(C.ceuAlto) }, cMeio: { value: col(C.ceuMeio) }, cBaixo: { value: col(C.ceuBaixo) }, cHor: { value: col(C.horizonte) },
    cBrilho: { value: col(C.brilho) }, cSol: { value: col(C.sol) }, cNuvemLuz: { value: col(C.nuvemLuz) }, cNuvemSombra: { value: col(C.nuvemSombra) },
    uT: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: GLSL_RUIDO + /* glsl */`
      varying vec3 vD; uniform vec3 uSol; uniform float uT;
      uniform vec3 cZen, cMeio, cBaixo, cHor, cBrilho, cSol, cNuvemLuz, cNuvemSombra;
      void main(){
        vec3 d = normalize(vD);
        float e = clamp(d.y, 0.0, 1.0);
        float az = atan(d.x, -d.z);
        float sd = max(dot(d, uSol), 0.0);
        vec3 c = mix(cHor, cBaixo, smoothstep(0.0, 0.11, e));
        c = mix(c, cMeio, smoothstep(0.08, 0.26, e));
        c = mix(c, cZen, smoothstep(0.22, 0.62, e));
        // clarão em volta do sol: largo e baixo, depois apertado
        float baixo = 1.0 - smoothstep(0.0, 0.34, e);
        c = mix(c, cBrilho, pow(sd, 5.0) * 0.62 * baixo);
        c = mix(c, cBrilho, pow(sd, 60.0) * 0.75);
        // nuvens em faixas compridas
        vec2 q = vec2(az * 2.6 + uT * 0.05, e * 15.0);
        float n = fbm(q + vec2(3.1, 0.0)) * 0.7 + fbm(q * vec2(2.2, 2.6) + vec2(0.0, 5.0)) * 0.3;
        float faixa = smoothstep(0.035, 0.11, e) * (1.0 - smoothstep(0.36, 0.60, e));
        float nv = smoothstep(0.50, 0.70, n) * faixa;
        vec3 cn = mix(cNuvemSombra, cNuvemLuz, smoothstep(0.2, 0.95, sd) * (1.0 - smoothstep(0.1, 0.5, e)));
        c = mix(c, cn, nv * 0.88);
        // cor quebrada: toques deitados, que o filtro vira pincelada
        vec2 sq = vec2(az * 30.0, e * 82.0);
        sq += (vec2(vnoise(sq * 0.45), vnoise(sq * 0.45 + 7.0)) - 0.5) * vec2(2.0, 1.4);
        vec2 si = celula2(sq);
        float s1 = hash12(si), s2 = hash12(si + 13.7), s3 = hash12(si + 31.1);
        c *= 1.0 + (s1 - 0.5) * 0.50;
        c = mix(c, c * vec3(0.66, 1.06, 1.26), step(0.76, s2) * 0.50 * smoothstep(0.10, 0.4, e));
        c = mix(c, c * vec3(1.24, 0.84, 1.12), step(0.80, s3) * 0.45);
        // o sol
        float disco = smoothstep(0.99950, 0.99964, dot(d, uSol));
        c = mix(c, cSol, disco);
        c += cSol * smoothstep(0.9982, 0.9996, dot(d, uSol)) * 0.20 * (1.0 - disco);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -10;
  return { mesh, uniforms };
}

// ---------------------------------------------------------------- mar
export function criarMar(C) {
  const uniforms = {
    uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uSolH: { value: new THREE.Vector2(0, -1) },
    uReflexo: { value: 1 }, uAlcance: { value: 0 },
    cRaso: { value: col(C.marRaso) }, cMedio: { value: col(C.marMedio) }, cFundo: { value: col(C.marFundo) }, cLonge: { value: col(C.marLonge) },
    cEspuma: { value: col(C.espuma) }, cReflexo: { value: col(C.reflexo) }, cReflexo2: { value: col(C.reflexoQuente) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, fog: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: GLSL_RUIDO + GLSL_COSTA + /* glsl */`
      varying vec3 vW; uniform float uT, uReflexo, uAlcance; uniform vec3 uCam; uniform vec2 uSolH;
      uniform vec3 cRaso, cMedio, cFundo, cLonge, cEspuma, cReflexo, cReflexo2;
      void main(){
        vec2 p = vW.xz;
        float d = -dCosta(p);                       // distância da areia, mar adentro
        float longe = length(p - uCam.xz);
        vec3 c = mix(cRaso, cMedio, smoothstep(0.4, 13.0, d));
        c = mix(c, cFundo, smoothstep(9.0, 60.0, d));
        c = mix(c, cLonge, smoothstep(120.0, 900.0, longe));
        // cor quebrada: perto da praia os toques acompanham a onda; no largo, ficam deitados
        // Os toques do mar são medidos a partir de um ponto fixo na praia (ângulo e "altura" aparente),
        // para terem tamanho parecido na tela de perto e de longe; a grade escorre devagar para a areia.
        vec2 r0 = p - vec2(0.5, 23.0); float dist0 = max(length(r0), 2.0);
        vec2 sq = vec2(atan(r0.x, -r0.y) * 26.0, 3.6 / dist0 * 120.0 + uT * 0.30);
        sq += (vec2(vnoise(sq * 0.5), vnoise(sq * 0.5 + 7.0)) - 0.5) * vec2(1.6, 1.1);
        vec2 si = celula2(sq);
        float s1 = hash12(si), s2 = hash12(si + 13.7), s3 = hash12(si + 31.1);
        c *= 1.0 + (s1 - 0.5) * 0.62;
        c = mix(c, c * vec3(0.55, 1.20, 1.10) + vec3(0.0, 0.02, 0.02), step(0.80, s2) * 0.45);
        c = mix(c, c * vec3(0.95, 0.80, 1.32), step(0.84, s3) * 0.40);
        // ondas: cristas paralelas à costa andando para a areia
        float fase = d / 6.2 + uT * 0.50 + (vnoise(p * 0.10) - 0.5) * 1.5;
        float f = fract(fase), id = floor(fase);
        float crista = smoothstep(0.74, 0.93, f) * (1.0 - smoothstep(0.95, 1.0, f));
        float falha = smoothstep(0.30, 0.55, vnoise(vec2(p.y * 0.28 + id * 7.3, id * 3.1)));
        float zona = (1.0 - smoothstep(5.0, 30.0, d)) * smoothstep(0.2, 2.0, d);
        c *= 1.0 - 0.22 * smoothstep(0.45, 0.74, f) * zona;                       // o cavado antes da crista
        c = mix(c, cEspuma, crista * falha * zona);
        // a espuma que lambe a areia
        float lingua = 1.1 + 0.8 * sin(uT * 1.25 + p.y * 0.22) + (vnoise(vec2(p.y * 0.9, uT * 0.35)) - 0.5) * 1.2;
        c = mix(c, cEspuma, (1.0 - smoothstep(lingua * 0.45, lingua, d)) * 0.92);
        // marolas do largo
        float ml = smoothstep(0.70, 0.86, vnoise(vec2(p.x * 0.035 + uT * 0.05, p.y * 0.42 + uT * 0.10)));
        c = mix(c, c * 1.35 + vec3(0.02, 0.03, 0.05), ml * (1.0 - zona) * smoothstep(20.0, 60.0, d) * 0.5);
        // o caminho de luz do sol
        vec2 vh = normalize(p - uCam.xz);
        float lat = abs(vh.x * uSolH.y - vh.y * uSolH.x);
        float frente = step(0.0, dot(vh, uSolH));
        float larg = mix(0.16, 0.040, smoothstep(8.0, 320.0, longe));
        float faixa = (1.0 - smoothstep(larg * 0.30, larg, lat)) * frente * smoothstep(uAlcance, uAlcance + 34.0, longe);
        float esc = mix(1.0, 0.16, smoothstep(20.0, 420.0, longe));                 // toques maiores ao longe
        float fa = vnoise(vec2(dot(p, vec2(-uSolH.y, uSolH.x)) * 0.30 * esc, dot(p, uSolH) * 1.55 * esc + uT * 1.0));
        c = mix(c, cReflexo2, faixa * 0.30 * uReflexo);
        c = mix(c, cReflexo2, faixa * smoothstep(0.44, 0.58, fa) * 0.85 * uReflexo);
        c = mix(c, cReflexo, faixa * smoothstep(0.62, 0.76, fa) * uReflexo);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const geo = new THREE.PlaneGeometry(6000, 6000, 1, 1); geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat); mesh.position.set(-400, 0, -1200); mesh.frustumCulled = false; mesh.renderOrder = -5;
  return { mesh, uniforms };
}

// ---------------------------------------------------------------- terreno
export function criarTerreno(C) {
  const X0 = -60, X1 = 330, Z0 = -310, Z1 = 96, NX = 220, NZ = 232;
  const pos = new Float32Array((NX + 1) * (NZ + 1) * 3), cor = new Float32Array((NX + 1) * (NZ + 1) * 3);
  const cMolhada = col(C.areiaMolhada), cAreia = col(C.areia), cClara = col(C.areiaClara), cGrama = col(C.grama), cGramaEsc = col(C.gramaEscura), cColina = col(C.colina), cCabo = col(C.cabo);
  const c = new THREE.Color();
  let k = 0;
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
    const x = lerp(X0, X1, i / NX), z = lerp(Z0, Z1, j / NZ), y = alt(x, z), d = dCosta(x, z);
    pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
    const n = fbm2(x * 0.16, z * 0.16, 3);
    c.copy(cMolhada).lerp(cAreia, smooth(1.2, 3.4, d)).lerp(cClara, smooth(0.50, 0.72, n) * smooth(3, 7, d) * 0.8);
    const g = smooth(14.5, 23, d + (n - 0.5) * 9);
    c.lerp(cGrama, g).lerp(cGramaEsc, g * smooth(0.45, 0.7, fbm2(x * 0.07 + 9, z * 0.07, 3)));
    c.lerp(cColina, smooth(45, 120, d));
    const cabo = pesoCabo(x, z);
    if (cabo > 0 && d < 0) c.copy(cCabo).lerp(cColina, smooth(0.45, 0.75, fbm2(x * 0.02, z * 0.03, 3)) * 0.5);
    cor[k] = c.r; cor[k + 1] = c.g; cor[k + 2] = c.b;
    k += 3;
  }
  const idx = [];
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const a = j * (NX + 1) + i, b = a + 1, c2 = a + NX + 1, d2 = c2 + 1;
    idx.push(a, c2, b, b, c2, d2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(cor, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const mat = tinta({ cor: '#ffffff', vertexColors: true, salpico: C.areiaToque, quanto: 0.13, valor: 0.24, escala: [2.2, 2.0, 0.75], espaco: 'mundo' });
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true;
  return mesh;
}
