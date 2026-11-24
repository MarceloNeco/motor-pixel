# Looks: que técnica produz cada estilo, e onde ela já foi feita

Depois da perícia, ache aqui o look mais próximo. Se ele já existe no acervo, **parta do código que funcionou** em vez
de começar do zero: copie a infraestrutura (pipeline, câmera, render) e reescreva o que é do exemplo (objetos, textos,
tempos). A receita detalhada de cada motion do acervo está em `acervo-receitas.md` (seção 1), e o mapa de arquivos em
`acervo-codigo.md`.

O acervo vem dentro desta skill, em `atlas/NN-nome/` (cada pasta tem `METODO.md`, `PROMPT.md`, a perícia, uma prévia
do vídeo e `codigo/`). `python3 scripts/atlas.py NN` mostra o caminho e os arquivos de um item.

## Os 18 do acervo

| # | Motion | Look | A técnica que faz o look | Família de ritmo |
|---|---|---|---|---|
| 01 | Rotina na casa | Maquete em corte | câmera ortográfica travada, só duas paredes, texturas grandes, oclusão + tilt-shift, boneco articulado por poses, cortes secos calculados | pausa e estalo |
| 02 | Planta que vira casa | Planta técnica | `Line2`/`LineMaterial` em px, arestas visíveis e ocultas com "fantasma" de profundidade, traço que se desenha por `instanceCount` | pausa e estalo |
| 03 | Duelo no entardecer | Película, plano único | céu e mar em shader, nuvens de esferas, material toon de 3 tons, bloom + anamórfico + grão por quadro | travelling |
| 04 | A corrente de blocos | Gráfico que vira objeto | pilhas instanciadas, estúdio escuro com ambiente de painéis, chão em três camadas (espelho, pedra, véu) | pausa e estalo |
| 05 | Tênis infinito | Laço infinito por escala | três níveis do mesmo mundo, câmera em distância logarítmica, foco sem escala | travelling |
| 06 | Casa de frente pro mar | Pintura a óleo | Kuwahara anisotrópico em 5 passes + células de Voronoi no material + trama de tela | travelling |
| 07 | Poste de placas | Totem noturno em chicote | luz de flash presa à câmera, grande-angular com distorção de barril, subquadros adaptativos | travelling com dois socos |
| 08 | O ícone das IAs | Ícone herói | superelipse com verniz, logos em SVG extrudadas e conferidas contra o original, luz de área, onda de cor fora do desfoque | pausa e estalo |
| 09 | Ilha dos dinossauros | Ilha em setores | terreno por grade de alturas, personagens com espinha + IK + pele em canvas, laço de 4 s | pausa e estalo |
| 10 | Adesivos no setup | Carimbo de adesivos | fundo e texto chapados em passadas separadas, adesivos como decalques com `polygonOffset`, gramática de carimbo | pausa e estalo |
| 11 | Natureza retoma | Objeto tomado, com alfa | corpo por SDF, três camadas instanciadas que nascem no vertex shader, sem pós, ProRes 4444 | contínuo |
| 12 | Kombi na praia | Viagem em miniatura | física de molas integrada na abertura, câmera seguindo versão suavizada do veículo, foco curto | travelling |
| 13 | O relógio e seus mundos | Produto que explode no seu mundo | metal polido em ambiente escuro, cinco camadas desfocadas em separado, laço | pausa e estalo |
| 14 | Como nasce uma moto | Desenho a lápis | hachura em três planos presa ao objeto, contorno por normal/profundidade/id, papel, sombra VSM | contínuo |
| 15 | A expedição do mascote | Desenho que vira mundo | pré-distorção para a vista de frente ser a ilustração, traço em geometria, mundo em dois tons | pausa e estalo |
| 16 | Caçada no labirinto | Labirinto em miniatura | mapa em texto, mesa espelhada, foco no herói, câmera somada à posição suavizada dele | travelling |
| 17 | Restaurante em miniatura | Time-lapse de maquete noturna | 18 subquadros a 360°, reflexo planar molhado, foco em espiral, câmera resolvida da referência, gradação casada por percentis, áudio sintetizado | contínuo |
| 18 | Fone explodido | Vista explodida com rótulos | peças com afastamento ao longo do eixo, luz de área por subquadro, rótulos 2D presos a pontos projetados | pausa e estalo |

## Os 37 looks do catálogo 3D Style Atlas

Técnica-chave e o exemplo oficial do three.js em que ela aparece (`node_modules/three/examples/` ou
threejs.org/examples). "No acervo" indica onde já foi feita.

| Look | Técnica-chave | Exemplo oficial | No acervo |
|---|---|---|---|
| Low-Poly | `flatShading`, geometria não indexada, cor por triângulo, paleta curta | webgl_geometry_colors | 09 (cenário) |
| X-Ray | fresnel `pow(1-dot(N,V),p)`, mistura aditiva, `depthWrite:false`, dupla face | webgl_materials_blending | |
| Painted | Kuwahara anisotrópico, relevo por luminância, trama de tela | (sem passe oficial) | 06 |
| Voxel | `InstancedMesh` + `RoundedBoxGeometry` | webgl_instancing_performance | |
| Ink and Toon | `MeshToonMaterial` + `gradientMap`, contorno por Sobel | webgl_materials_toon | 03, 15 |
| Pencil Sketch | Sobel em normal + profundidade, hachura por limiar de luz, grão de papel | webgl_postprocessing_sobel | 14 |
| Dithered | baixa resolução + Bayer + duas cores | webgl_postprocessing_pixel | |
| Paper Pop-Up | `Shape` + `ExtrudeGeometry` fino, pivôs nas dobras | webgl_geometry_extrude_shapes | |
| Soft Clay | normal por ruído, rugoso, tempo em degraus `floor(t*12)/12` | webgpu_procedural_texture | |
| Inflated | deslocamento ao longo da normal, `clearcoat`, rugas por ruído | webgl_materials_physical_clearcoat | |
| Glass and Light | `MeshPhysicalMaterial` com `transmission`, `ior`, `thickness`, `dispersion` | webgl_materials_physical_transmission | |
| Toy Blocks | `RoundedBoxGeometry`, madeira procedural, letras em `CanvasTexture` | webgl_materials_texture_canvas | |
| Marble Run | corpos rígidos, trilhos em `TubeGeometry`, vidro | physics_rapier_basic | 12 (física própria) |
| Factory Line | rolagem de UV ou elos instanciados em curva | webgl_modifier_curve_instanced | |
| Domino Chain | queda scriptada por índice | physics_rapier_basic | |
| Neon Sign | `TubeGeometry` emissivo acima do limiar do bloom + chão com reflexo borrado | webgl_postprocessing_unreal_bloom_selective | 17 |
| LED Wall | shader de grade `fract(uv*grid)` com máscara circular | webgl_postprocessing_rgb_halftone | |
| Pin Wall | `InstancedMesh` de cilindros em grade, altura por mapa | webgl_instancing_dynamic | |
| Particle Swarm | `MeshSurfaceSampler`, `mix(posA, posB)` com atraso | webgl_instancing_scatter | 11 (amostragem) |
| Shadow Box | `Shape` com furos em camadas, fundo emissivo, penumbra | webgl_shadowmap_vsm | |
| Split-Flap Board | duas metades + aba girando, atlas de glifos por instância | webgl_buffergeometry_instancing | |
| Embossed | texto em canvas → `bumpMap`/`displacementMap`, foco raso | webgl_materials_bumpmap | |
| Floating Screens | interface em `CanvasTexture` sobre caixa arredondada, vidro, foco | webgl_materials_texture_canvas | 13 |
| Device Hero | corpo arredondado, moldura com verniz, tela emissiva, chão com reflexo | webgl_materials_physical_clearcoat | |
| Studio Product | ambiente de painéis via `PMREMGenerator.fromScene`, `RectAreaLight`, chão espelho | webgl_lights_rectarealight | 04, 13, 18 |
| Hero Icon | `RoundedBoxGeometry` + símbolo extrudado com chanfro, fundo infinito, sombra macia | webgl_loader_svg | 08 |
| Blueprint Build | `EdgesGeometry`, `LineDashedMaterial`, `Line2`, `setDrawRange` | webgl_lines_fat | 02 |
| Exploded View | repouso × explodida por peça, rótulos e linhas-guia | css2d_label | 18 |
| White Model | branco fosco, oclusão, sombras suaves, um acento | webgl_postprocessing_gtao | |
| Data Skyline | `InstancedMesh` de caixas, rótulos em canvas | webgl_instancing_dynamic | 04 |
| Node Network | grafo de forças, nós instanciados, hastes orientadas | webgl_buffergeometry_drawrange | |
| Layer Stack | planos de vidro, diagrama em `CanvasTexture`, bordas emissivas + bloom | webgl_materials_physical_transmission | |
| Tiny Diorama | base com solo cortado, câmera ortográfica isométrica + tilt-shift | webgl_interactive_cubes_ortho | 01, 09 |
| Spotlight Stage | recortes em profundidade, `SpotLight` com sombra, cone visível | webgl_lights_spotlight | |
| Circuit City | chips instanciados, trilhas a 45°, faixa emissiva que corre + bloom | webgl_instancing_performance | 16 |
| Museum Gallery | `SpotLight` por quadro, piso com reflexo borrado | webgl_mirror | |
| Monument Type | `TextGeometry` com chanfro, concreto procedural, água e céu | webgl_geometry_text | |

Looks sem nada pronto (você vai construir do zero e isso é o risco a declarar nos cards): Shadow Box, Embossed,
Split-Flap, Inflated, líquido com menisco, desgaste de quina, stop-motion em degraus.

## Quando o look não está em nenhuma das tabelas

Decomponha em quatro perguntas e responda cada uma com uma técnica: **(1)** como é a superfície (material iluminado
comum, toon, shader próprio)? **(2)** existe um filtro em tela (contorno, pintura, retícula)? **(3)** qual é a lente
(ortográfica, longa, grande-angular, foco raso)? **(4)** qual é a luz? Um look é quase sempre a soma de uma resposta
por pergunta, e o defeito clássico é tentar resolver tudo com o filtro: filtro sobre material liso devolve "render com
filtro".
