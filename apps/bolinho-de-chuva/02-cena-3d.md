# 02 — Cena 3D com a receita do H-rraaa

O H-rraaa já faz 3D bonito no Bolinho. A receita, medida no código dele em 15/11/2026:

| Ingrediente | Configuração | Efeito |
| --- | --- | --- |
| Motor | Three.js (WebGL) carregado de `kids/libs/` | Profundidade correta: nada atravessa nada |
| Cor | `renderer.toneMapping = THREE.ACESFilmicToneMapping` | Cores ricas sem estourar |
| Sombra | `renderer.shadowMap.type = THREE.PCFSoftShadowMap` | Sombra macia, objetos "pousam" |
| Luz | `HemisphereLight` (céu/chão) + `DirectionalLight` (sol) com sombra | Volume sem parte chapada |
| Nitidez | `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` | Nítido sem pesar demais |
| Câmera | Calma, com zoom | O olho aprecia o acabamento |

## Acrescentar para jogos com movimento (Vruuum!, Labirinto)

- **Modelos .glb prontos** (Kenney Car Kit, Toy Car Kit, Racing Kit; Quaternius) em vez de peças montadas em código.
- **Neblina colorida** (`scene.fog`) no horizonte: esconde onde o mundo acaba e dá profundidade.
- **Cenário repetido com `InstancedMesh`**: centenas de árvores, cones ou paredes de cerca viva com um desenho só.
- **Placar em HTML** por cima do canvas, nunca desenhado na cena.
- **Modo leve**: sem sombra, `pixelRatio` 1, menos objetos e neblina mais perto.

## O que evitar

- 3D "caseiro" em canvas 2D, pintando faces de trás para frente (o motivo dos defeitos do Vruuum! atual).
- Mais de 1 luz com sombra.
- Texturas enormes: 1024 px na maioria dos casos.

Exemplo: `../../exemplos/cena3d.html`; módulo `cena3d`.
