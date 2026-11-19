# libs — bibliotecas copiadas (sem CDN)

- `three.module.js` + `three.core.js`: Three.js **r187** (npm `three@0.187.0`), minificados com esbuild, licença MIT em `LICENSE-three.txt`.
- `three-addons/`: só os addons que o motor usa (OrbitControls, GLTFLoader e dependências, pós-processamento do brilho),
  minificados, com o `import 'three'` trocado por caminho relativo (o app não precisa de importmap).
- Planejados (ainda não copiados): PixiJS (`cena2d`) e Rive (`rive`), quando esses módulos entrarem.
Para trocar a versão do Three.js: nova pasta de versão do motor (ex.: `1.1/`), nunca por cima da `1.0/`.
