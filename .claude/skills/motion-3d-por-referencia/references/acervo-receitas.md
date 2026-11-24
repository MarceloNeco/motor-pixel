# Acervo: receitas dos 18 motions aprovados

Extraído dos `METODO.md` e `PROMPT.md` de `motions-aprovados/` (novembro de 2026). É o detalhe por trás de
`looks.md`: abra **só a receita do look que você vai fazer** (seção 1) e a seção técnica que estiver em dúvida. Os
números entre colchetes são a pasta do motion (`[17]` = `17-restaurante-miniatura`). Os valores são os que
funcionaram naquele filme: ponto de partida, não lei.

## Índice

1. Receitas por look (um bloco por estilo: maquete em corte, planta técnica, película, gráfico em estúdio escuro, laço
   infinito, pintura a óleo, totem noturno, ícone com SVG, ilha com personagens, carimbo de adesivos, natureza com
   alfa, viagem com física, produto que explode, lápis, desenho que vira mundo, labirinto, time-lapse de maquete,
   vista explodida)
2. Luz, sombra, cor e tom
3. Câmera
4. Pós-processamento
5. Geometria, materiais e texturas
6. Animação e linha do tempo
7. Render e desempenho

---

## 1. Receitas por look

### Maquete em corte (casa de boneca) [01]
- Só duas paredes (fundo e esquerda); frente e direita abertas; sem telhado. Contorno escuro fino no topo das paredes e na borda das lajes = o que faz ler "corte". Base grossa (9,8×8,9×0,72) com laterais à mostra, sobre fundo infinito de uma cor, sem horizonte.
- Primitivas de cantos arredondados (caixas arredondadas, cilindros, cápsulas, esferas), cores chapadas foscas, poucos objetos por cômodo; texturas em canvas.
- Escala de miniatura = **aumentar texturas** (tábuas de 33 cm, trama de tecido grande). Textura fina faz parecer prédio visto de longe (princípio declarado pelo diretor da ref, Airbnb It/BUCK).
- Câmera ortográfica (giro 38°, inclinação 27°) travada; sol direcional `#fff1dc` a ~55° da direção da câmera (prompt: 50–60°) + ambiente fraco; AO nos encontros + desfoque leve no alto e no pé do quadro (tilt-shift).
- Boneco articulado (~1,65 m, quadril a 0,88): hierarquia de grupos com juntas (quadril, coluna, cabeça, ombros, cotovelos, joelhos); dois pontos como olhos.

### Planta técnica / blueprint que vira objeto [02]
- Folha `#f6f5f4` com grão, vincos, malha (fina a cada 1 m, marcada a cada 4), moldura e carimbo. Folha maior que o quadro (33,6×23,3 para vista de cima de 24×13,5) para a mesa só aparecer nos cantos depois da inclinação.
- Traço: `LineSegments2` + `LineMaterial` (espessura em px): forte 3,1 px, fino 1,5 px, oculto 1,25 px tracejado 17 cm / 14 cm; `EdgesGeometry` por peça, filtrando arestas de emenda entre paredes.
- **Visível/oculta:** três versões por peça: sólido; "fantasma" que só escreve profundidade (sem cor); arestas desenhadas 2× (teste de profundidade normal = cheio; invertido = tracejado). Ordem: sólidos → o que está deitado na folha → fantasmas → arestas; o fantasma vai na fila das transparências com `renderOrder` maior que o da planta.
- Planta, aramado e sólido saem da mesma tabela de paredes/aberturas; contorno da planta = borda da união dos retângulos menos os vãos, encadeado em voltas para a "caneta" não pular.
- Traço que se desenha: linhas picadas em pedaços de ~10 cm na ordem da caneta, mostrando os n primeiros (`instanceCount`). Aramado sobe com escala vertical 0→1; linhas só depois de alguns cm de altura.
- Notas: planos sempre de frente para a câmera, sem teste de profundidade; posição final = ponto fixo do quadro calculado a partir da câmera final; tamanho corrigido pela distância; empilhadas como o objeto (nota 1 embaixo). Máx. 3 notas e 3 cotas. Textos em canvas.
- Câmera perspectiva FOV 30°: de 25,2 de altura olhando reto para baixo até 32° de altura, giro 31°, distância 23,5. Sol frente-esquerda `#fff3df` (~60° da câmera), forte, ambiente baixo.

### Película ao pôr do sol (perseguição aérea em plano único) [03]
- Céu em shader (violeta no alto, rosa/laranja no horizonte), sol a 4,2° com brilho largo; cirros projetados num teto plano para convergirem no horizonte.
- Mar: plano de 60 km que acompanha a câmera; ondas de ruído, reflexo Fresnel, caminho do sol, brilhos piscando e névoa, tudo em shader.
- Nuvens de esferas: 5.508 bolhas (3.531 cúmulos próximos em 3 camadas montados em volta da rota + 1.977 torres distantes); base achatada, topo couve-flor; dois tons com passagem curta (corpo violeta, face pêssego, topo creme), sombra extra nas reentrâncias, borda dourada no contraluz; distantes fundem na cor do céu.
- Aviões: material em faixas (toon, 3 tons) com sombra própria; pintura em canvas mapeada na planta da asa, no torno da fuselagem e na deriva; hélice = disco translúcido.
- Acabamento: bloom leve (limiar acima de 1,0), raios do sol, anamórfico horizontal, bolhas de lente, aberração cromática nas bordas, vinheta violeta, grão em shader pelo número do quadro (mais fraco nas sombras), poeira/risco por RNG com semente do número do quadro.

### Gráfico que vira objeto em estúdio escuro [04]
- "Fotografia de produto num estúdio escuro: o gráfico é a joia." Pilhas de moedas (uma malha instanciada por pilha); números 3D Inter ExtraBold (0,52 de altura, extrusão 15%, lateral mais escura).
- Metal iluminado pelo **ambiente**: env de estúdio escuro com painel grande do lado do foco + faixa fina atrás do lado oposto (ambiente uniforme = pilhas chapadas).
- Chão em 3 camadas: espelho real (reflete pilhas) + pedra translúcida (recebe foco e sombras) + véu que apaga o longe. Texto numa layer que a câmera vê e o espelho não.
- Foco quente `#ffe6c4` de cima/frente/esquerda; luz fraca lavando o fundo (para existir em tela de celular); quase nada de trás.
- Régua: unidade diferente (borda lisa, mais clara) a cada 5; pilha mais alta com 30–50 unidades e 2–3× a largura da base; vão entre bases ≥60% da largura da base. Uma cor de acento num item só; sem verde/vermelho de bolsa.

### Laço infinito: o mundo cabe no objeto [05]
- Miniatura fotografada de perto: DOF curto, horizonte inclinado 5–15° quase o tempo todo, motion blur nas passagens rápidas.
- Objeto (bola de feltro): cor em 4 tons, brilho nas bordas, grão, fibras reais na silhueta (22 camadas concêntricas com recorte por ruído, 3,4% do raio); costura = faixa afundada (0,064 rad de meia largura). Franja de grama no corte (30 mil folhas por borda) vira o horizonte de dentro.
- Linhas da quadra desenhadas no shader do piso por distância (nítidas de 50 m e de 30 cm, sem geometria sobreposta).
- Máquina do laço em §6. Pós em §4: alvo 16 bits + MSAA 4×, DOF 64 amostras, bloom 0,4 / limiar 1,05, 12 subquadros, ACES + vinheta + grão + sRGB no último passe.

### Pintura a óleo [06]
- Cena 3D em float com AA → filtro de 5 passes com a pintura em 75% da resolução (1440×810): (1) revelar, saturação 1,22 e um pouco de contraste; (2) tensor de estrutura por Sobel nas 3 cores, borrado em 2 passadas; (3) **Kuwahara anisotrópico** de 8 setores, elipse alongada na direção da forma (até 2× o raio), peso polinomial, média ponderada pelo inverso da variância de cada setor, raio 6 px + 2ª passada de raio 3; (4) relevo: altura = 78% claro/escuro + 15% ruído esticado na direção do traço + 7% grumo, direção de um tensor borrado mais largo, "mão do pintor" (traço descendo para a direita) onde a forma não manda; ganho 2,6; (5) tela: contorno leve onde a cor muda de uma vez, trama de linho 3,3 px por fio (mais forte nos escuros), margem crua 25 px (~1,3%) e recorte de legenda 42,5%×12,8% com borda de ruído.
- **O toque nasce no material, não no filtro:** células de Voronoi no espaço do objeto (parede 3 células/m na largura e 1,5 na altura, eixo inclinado; céu ~1,9°×0,7° por célula), cada uma com tom próprio, algumas com cor de salpico ou sombra fria. O filtro sozinho sobre cor lisa devolve aquarela borrada. Toques crescem quando a câmera chega perto.
- Toques do mar medidos em ângulo e altura aparente a partir de um ponto fixo na areia (em metros, sumiam perto do horizonte).
- Escuros anil ou verde profundo, nunca preto; saturação alta; cor quebrada; formas grandes reconhecíveis pela silhueta; sem linha fina de contorno.
- Legenda: canvas 2D (Kalam Bold) usado como máscara no último passe (a trama aparece na letra), cortina esq.→dir. em 0,8 s, ≤34 caracteres.

### Totem em câmera chicote (noturno, luz de flash) [07]
- Construtor único de placas: contorno convexo → frente, costas e borda numa malha fina que pode ser curvada/torcida (tira o ar de "plano com textura"). Placas luminosas curvas 18–28°, duas faces acesas.
- Luz de flash presa à câmera com força corrigida pela distância ao poste + 4 refletores fixos com sombra (calculadas uma vez: só a câmera se move) + 2 vermelhas baixas + laranja fraca de cada placa luminosa.
- Névoa = cartaz de luz sempre atrás do poste, de frente para a câmera (o poste encobre, o chão espelha, sem linha de horizonte), com a parte de baixo apagada.
- Adesivo sobre placa luminosa: recortado em preto no mapa de emissão, desenhado só no mapa de cor. Adesivos sorteados (5–15 por placa) com semente fixa.
- Lente: FOV vertical 55–70°, distorção de barril 0,2 (amplia o centro 23%) → cena renderizada 25% maior (2400×1350) e reduzida no último passe; aberração cromática nas bordas, vinheta, bloom leve, grão. Tone mapping Khronos PBR Neutral.

### Ícone herói com logos SVG [08]
- Ícone em superelipse expoente 5 (lado 3,4, espessura 0,8, quina 0,2), plástico com verniz, cinta de metal polido 0,09; flutua 2,4 à frente de uma parede de papel fosco de uma cor; sem chão.
- SVG → `SVGLoader` → contorno, centrar, inverter Y → `ExtrudeGeometry` com a quina cortada **para dentro** (contorno no tamanho exato do desenho) → normais corrigidas para a tampa ficar chapada sem vinco. Símbolo em 63–68% do lado do ícone, altura 0,23–0,27; quina 0,05 nas formas cheias e 0,016–0,035 nas finas ("engrosse a altura da peça, nunca o contorno").
- Conferência de silhueta contra o SVG (99,69% a 100%; abaixo de 99% = algo se perdeu).
- Luz: chave quente de cima/direita espalhada num disco de raio 1,5; 4 caixas de luz no ambiente só para o brilho do verniz; bandeira preta atrás da câmera (face não lava); rebatida cuja cor de baixo acompanha o estúdio. Sem grão, vinheta, flare, partícula.
- Ícone em duas metades (2 materiais) para a metade escondida já estar na cor e no símbolo novos. Onda de cor do estúdio em círculo a partir de trás do ícone, borda firme com fio claro.

### Ilha em setores com personagens [09]
- Ilha = grade de alturas; contorno orgânico (r médio 20,2, esticado 1,22× na largura); rios = sulcos 0,3 abaixo do mar nas divisas (largura 1,0→1,6); **um único plano de água** em y=0 faz mar, rios e lagoa; cor por vértice do setor, areia nas margens. Lê como pizza de terreno.
- Cenário facetado e chapado; detalhe só nos personagens. Câmera ortográfica: geral 40° com quadro de 31,4 de altura; setores 22°, giro 16–22° para o lado da cara, quadro 8,6 (9,4 no T-rex); AO + tilt-shift leve.
- Corpo: espinha de ~12 pontos (meia-largura, altura acima/abaixo), Catmull-Rom, malha de anéis (T-rex 76×26) refeita a cada quadro; dobras acumuladas do quadril para as pontas; cabeça rígida (mandíbula em dobradiça, dentes em cones); pernas com pé fixo e IK de 2 ossos (metatarso próprio nos terópodes). Pele 2048×512 em canvas com degradê dorso→barriga **espelhado** (sem costura), listras, manchas, rugas + relevo de escamas compartilhado.
- Olho de adesivo: disco branco levemente emissivo, aro, pupila preta **fosca**, cúpula transparente; pupila pende e chacoalha por soma de senos com amplitude = energia do gesto.

### Carimbo de adesivos em estúdio de cor única [10]
- Fundo = degradê em espaço de tela (não cenário 3D) + pontilhado de meio nível por pixel contra faixas. Texto e fundo não recebem luz nem sombra.
- Quadro em 5 passadas: fundo, sombra de chão, texto de trás, objetos, texto da frente.
- Adesivo = plano com textura de canvas a 0,35 mm da face, `polygonOffset`, ordem de desenho = ordem dos carimbos; só em face plana. Adesivo: cor chapada, contorno preto grosso, borda branca de recorte, grão de impressão, sombra fina embutida na arte.
- Luz principal `#fff1dc` int 1,9, shadow map 4096; recorte `#cfe0ff` 0,55; ambiente de estúdio **neutro** com 4 painéis (1,0). Texto Archivo 900 itálico largura 112% (título 250 px, frases 124–156 px, palavra gigante 620 px; entrelinha 0,84–0,86).

### Objeto tomado pela natureza, com alfa [11]
- Corpo por SDF (soma suave de elipsoides, caixa arredondada, cápsulas), marching cubes com célula 0,025 (36 mil vértices), normais pelo gradiente. Formas duras: primitivas e extrusão. Peças pequenas pousadas na superfície, alinhadas à normal.
- "Material de produto, não de massinha": plástico com verniz e risco de luz, duas cores (costas 60% mais escuras), linha de junção, comandos em material diferente.
- Natureza em 3 camadas instanciadas com hora de nascer: manta (cópia estufada da superfície, ~0,6% da largura do objeto), tufos de 5 lâminas (106 mil; ~1% da largura), flores em 3–4 formas (30 mil; ~0,7% da largura) + 30 mil hastes. 8–12 sementes (centro, 3 raios, início, duração), zonas de exclusão nas partes de identidade, 35–45% do objeto limpo; 3 ruídos (montes, clareiras, flores baixas mais escuras); musgo embaixo, flores em cima.
- **Sem pós-processamento** (AO, bloom e DOF sujariam a borda do alfa); profundidade vem da sombra, da raiz escura das lâminas e da flor baixa mais escura. Fundo = degradê radial em CSS atrás do canvas transparente + grão só no fundo.

### Viagem em miniatura com física [12]
- Brinquedo de plástico/massinha, DOF curto de maquete: só o veículo nítido. AO por profundidade (18 amostras, raio 0,8 m).
- Terreno: malha de 0,4 m em 200×88 em volta da rota com textura 4096×2048 pintada em código; malhas de 4 m e 20 m para longe com cor por vértice. Arbustos: milhares de folhas pequenas (13–25 cm) presas a bolhas escuras, mais claras no topo; 539 mil folhas instanciadas.
- Mar em shader: cor pela profundidade da água, reflexo do céu, renda de espuma na beira, cristas, maré curta movendo a linha d'água.
- Janelas descartadas no shader **também no material de sombra** (o sol entra pela janela e ilumina o interior).
- Cor: curva de tons neutra, contraste suave, vinheta 20%, grão 1,8%.

### Produto que explode no seu mundo [13]
- Produto em metal polido de verdade (env cinza médio a escuro com painéis e panos pretos); mundo em plástico fosco de brinquedo; hierarquia herói 1,7 / segundo 1,5 / resto 0,4–1,1, sobreposição, miudezas nos vãos.
- **Cinco camadas** renderizadas e desfocadas separadamente (fundo muito, trás pouco, meio nítido com AO em meia resolução, frente pouco, bolas rente à lente muito) em vez de DOF por profundidade.
- Fundo: parede pastel com faixas diagonais de luz e aparador em 3/4 (girado 20°, a 10,6 atrás), objetos agrupados nos cantos de baixo, mais claro e menos saturado que o herói.
- Cartão de vidro escuro com rótulo, número grande e gráfico; interface dos dois lados. Todo texto mora num objeto.

### Desenho a lápis [14]
- Hachura: folha de canvas 2048 px, 96 fileiras, 24 mm entre riscos no objeto; três jogos de riscos encaixados nos canais R/G/B (somar canal adensa sem mexer nos riscos já presentes); 6 camadas nos limiares de tom 0,10 · 0,28 · 0,44 · 0,60 · 0,74 · 0,86, alternando principal e cruzada (1,15 rad de diferença); cada fileira com limiar e atraso próprios (borda da sombra desfiada; frente da hachura avança risco a risco). Material iluminado comum com o trecho final do shader trocado.
- **Hachura reta em três planos:** a folha é escolhida pela direção da superfície (de lado, de cima, de frente). Hachura pelo UV embrulha a curva e lê como render com filtro. Em lofteadas, usar comprimento real medido em volta da seção.
- Contorno: passada auxiliar 3840×2160 com normal, profundidade e id de peça; filtro acha troca de peça, salto de profundidade e dobra; dois riscos por borda (tremor ≤1 px e ≤3 px); três forças (fora > entre peças > dobra); vão de papel ~4 px.
- Riscos soltos: fitas de largura constante em px, tremor, pressão variável, ponta que afina, reveladas pelo comprimento; traço repassado (eixos passam das pontas, arestas passam do canto). Letra de traço único sem arquivo de fonte (traço 4 px, 50 px de altura; abaixo de 4 px parece fonte), cada linha entre 2 linhas-guia fracas.
- Papel `#f2ede2` com dente, manchas, escurece ≤3% só na borda; grafite `#34353b` para tudo; um acento vermelho `#cf3f25`; aguada numa peça só (`#e39478`, hachura `#b03a25`). Pouca cor local.
- Sol do lado da câmera e alto (direção 0,1/0,85/0,5), ambiente 0,13; sombra VSM 2048 com desfoque 14; só peças grossas projetam sombra. Sem motion blur, brilho, vinheta forte, grão de filme ou texto 3D.

### Desenho que vira mundo (2D → 3D) [15]
- **Pré-distorção:** ilustração 1600×1600 com (x,y)→(x−800, 800−y, z); câmera de frente a D=4500 com FOV 20,2° vê exatamente a ilustração; x e y de cada vértice × (D−z)/D. De frente equivale a ortográfica, mas a câmera é perspectiva de verdade nos planos de trilho.
- Peça padrão: arte original desenhada em canvas como textura na frente + contorno do preenchimento extrudado para trás. Corpos redondos (balão, casco, ilhas) com a arte projetada de frente, sem a linha de fora, cor base esticada alguns px além da borda. Textura de 4 px por unidade (5–6 no dirigível/torre, 8 no herói).
- Traço em **geometria** (fita com largura calculada no shader, pressão, tremor, pontas afinadas; o desenho inteiro é uma malha só): com a câmera a 4,6× uma textura precisaria de >8000 px.
- Contorno em dois sistemas (linhas da arte + filtro por id/normal), cor `#2a1830`, 1,75 px de frente até 13 px de perto.
- Mundo pintado em dois tons por uma direção de luz (0,42/0,55/0,72), face em sombra × (0,64/0,53/0,76); sem reflexo, especular nem sombra projetada. Céu por direção do olhar (não da tela). Brilhos = discos somados depois do contorno, que somem inteiros quando o **centro** fica escondido. Floresta em fileiras com gomos pintados em relação a quem olha.

### Labirinto em miniatura (brinquedo noturno) [16]
- Azul-noite quase preto, névoa da mesma cor, vinheta forte. Piso = mesa preta espelhada + textura translúcida do tabuleiro (canvas 280 px/unidade, 210 trilhas a 45°) + véu que apaga longe. Paredes baixas (0,22 para corredor de 1,3), verniz; pontos de luz pequenos (~6% da célula) com mancha de luz no piso.
- Labirinto a partir de mapa em texto (`#`/`.`), paredes = retângulos máximos.
- Pós: DOF próprio com foco no herói, bloom 0,2 só acima de 1,0, 8 subquadros, vinheta, ACES, grão 1,4%.

### Time-lapse de maquete noturna [17]
- Reflexo planar do asfalto molhado em meia resolução (borrado pouco na horizontal e muito na vertical, brilho das amostras limitado, máscara de poças por ruído); chão sem reflexo do ambiente falso. DOF em espiral áurea com borrão pela profundidade (tilt-shift físico). Bloom em cadeia de mips; ACES; gradação em espaço de exibição. Microrrelevo procedural no shader (ruído 3D na normal e na cor: espuma das árvores de maquete, poros do pão, terra).
- Luz de foto de maquete: um foco quente forte de borda macia sobre a esquina; resto no escuro iluminado só por luzes locais fortes; névoa escura; lâmpadas distantes ignoram a névoa e viram bokeh.
- Mão = SDF (cones arredondados + smooth-min), surface nets, normais pelo gradiente, AO nas dobras e rubor nas pontas em cor de vértice, unhas separadas. Objeto herói em `LatheGeometry` com ondulação por ruído, cor por altura, gergelim instanciado pela normal. Letreiro: opentype.js → extrusão com chanfro → curvado em volta do cilindro.

### Vista explodida com rótulos numerados [18]
- Fundo liso = gradiente radial em espaço de tela (`#fcecdf`→`#f6dac9`→`#ecc0ad`); chão = `ShadowMaterial` (`#7a2f24`, opacidade 0,3) 1,2 abaixo.
- Peça = grupo com repouso 0 e afastamento ao longo do eixo × abertura(t). `LatheGeometry` com perfil suavizado por spline e percorrido para as normais apontarem para fora; peças ocas com parede dupla. Faixas por varredura de seção arredondada (largura variando). Canvas: tela furada = mapa de alfa em colmeia; placa com trilhas sorteadas.
- Materiais: corpo clearcoat 0,55 / rugosidade 0,38; metal metalness 1 / rugosidade 0,22 (superfícies grandes e planas: metalness 0,35); couro com sheen; plástico fosco.
- Rótulos 2D por cima do quadro pronto (nítidos): ponto na peça, linha reta, disco no acento com número, nome peso 800 espaçado, linha de descrição a 72% de opacidade. ≤7 rótulos.

---

## 2. Luz, sombra, cor e tone mapping

**Direção do sol/chave**
- Sol a 50–60° da direção da câmera; vindo de trás da câmera as sombras somem atrás dos objetos e a imagem fica chapada (1ª versão do [01] tinha o sol quase na direção da câmera) [01, 02].
- Desenho a lápis: sol do lado da câmera e alto; com sol atrás quase tudo vira hachura [14]. Sombra escolhida para cair longe da coluna de notas [14].
- Luz-chave que **acompanha o lado da câmera**: com foco fixo de um lado, o rosto do herói ficava preto quando a câmera passava para o outro [16]. Luz gira com o azimute da câmera no laço (a 70° de altura, as sombras quase não se mexem) [05].
- "Truque assumido": sol visível no horizonte ao fundo, mas a luz que modela vem da frente/esquerda a 32° (na direção real a casa ficaria toda em sombra; a referência faz igual) [06]. Em [03] a luz dos aviões/nuvens vem do lado do sol mas a 28° de altura, com o disco do sol a 4,2°.
- Sol escolhido pelo plano final (azimute 120°, 40° de altura) para iluminar frente e lado da janela durante toda a viagem [12]. Direção do sol do [03] definida a partir do enquadramento da subida (25° à esquerda da câmera aos 5,6 s) e conferida em todos os outros instantes.
- Luz de flash presa à câmera, força corrigida pela distância (perto claro, longe preto) [07].

**Intensidades e cores registradas**
- [01] sol `#fff1dc`; [02] `#fff3df`; [09] `#fff0d8`; [10] principal `#fff1dc` 1,9 + recorte `#cfe0ff` 0,55 + ambiente neutro 1,0; [11] direcional `#fff0de` 3,8 + recorte + env escuro com 4 painéis e faixa vertical; [13] principal 2,7 + céu 0,5 + recorte 1,1 + ambiente 0,8; [14] ambiente 0,13; [17] foco `#ffd2a2` 2,05 cone 22° + hemisférica `#55689a`/`#2e2620` 0,55 + foco 8,5° no herói + postes `#ffb878`; [18] `RoomEnvironment` 0,95 + chave `#fff0df` 3 + contraluz `#d6ecff` 1,6 + preenchimento quente 0,5; [04] foco `#ffe6c4`; [16] foco `#ffd6a6` + recorte azul.
- Ambiente lilás em cima e areia embaixo (sombras lilás) [06].
- Pouco preenchimento: "luz chapada, muito preenchimento e nenhuma oclusão" foi o ponto mais grave da crítica do [13]. Luz forte de cima/lado + pouco preenchimento + recorte + AO [11, 13].
- "Luz geral fraca com foco fraco deixa tudo escuro; o equilíbrio é um foco forte com borda macia e luzes locais fortes" [17].

**Ambiente (env map) e metal**
- Metal mostra o que reflete: env de estúdio escuro com painel grande do lado da chave + faixa fina atrás do lado oposto; uniforme = chapado [04]; claro = aço vira plástico cinza [13]. Superfície metálica grande e plana saía marrom (refletia a parte escura) → metalness 0,35 e cor mais clara [18].
- Ambiente **neutro**, nunca da cor do fundo (fundo azul + ambiente azul = sombras cinza e brancos azulados) [10].
- Bandeira preta atrás da câmera para a face do verniz não lavar [08]. Caixas de luz no env só para o brilho do verniz [08].
- Luz de trás em chão polido volta para a câmera e clareia tudo (balcão bege) [04].
- Chão molhado não pode refletir o céu falso do ambiente (véu marrom): desligar o reflexo de ambiente no chão, ficar só com o espelho da cena [17].

**Sombras**
- Shadow map 4096 [10, 11, 12]; 2048 com VSM e desfoque 14 [14]. Mapa de 4096² cobrindo 88 m em volta do veículo, movido em **passos de 1 texel** (senão as bordas fervem) [12].
- `PCFSoftShadowMap` foi removido no three.js r0.187: [10] usou `PCFShadowMap`; [14] usou VSM porque a sombra dura de tubos virava recortes quadrados.
- Área da sombra (câmera de sombra) reajustada a cada plano para ficar nítida nos closes [09]. Mapa de sombra cobre um nível do laço por vez e troca antes do objeto abrir [05].
- Sombra macia por luz de área sorteada: chave num ponto diferente de um disco a cada subquadro (raio 1,5 em [08], 1,9 em [18]); com 16 e 32 amostras a borda mostra degraus, 48 fica lisa [08].
- Sombras calculadas uma vez quando só a câmera se move [07].
- O material de profundidade/sombra precisa receber o mesmo deslocamento de vértice (crescimento) [11] e o mesmo recorte (janelas com discard) [12] e a mesma varredura de desenho [14].
- Só peças grossas projetam sombra (massa simples, como ilustrador) [14]. Peças muito próximas de uma superfície não projetam sombra visível: desenhar a sombra na textura (ponteiro) [13]. Em camadas separadas, objetos de camadas diferentes não fazem sombra uns nos outros [13].
- Mundo pintado: nenhuma sombra projetada, só dois tons por face [15].

**Tone mapping e gestão de cor**
- ACES: [05, 16, 17]. Khronos PBR Neutral: [07] (mantém o laranja laranja; os mais comuns puxavam para o amarelo) e [18] (ACES lavava pêssego e petróleo). Curva neutra [12].
- Gradação **em espaço de exibição** depois do ACES (contraste ~0,42, ponto branco 0,93, piso de preto 0,008, exposição 0,86); contraste em espaço linear primeiro esmagou os pretos e depois lavou [17]. Casada por percentis de luminância com a referência [17].
- Acumulação de subquadros em ponto flutuante / luz linear antes do tom, vinheta e grão [05, 13, 16, 18]; soma em 32 bits [07]; alvo de 16 bits [05].
- sRGB e tom no último passe [05, 07].
- MP4 em **BT.709 faixa limitada**: quadros em JPEG saíam em faixa cheia (yuvj420p) e as cores mudavam no YouTube/editor [05, 07, 10, 16]. Depois da conversão o vídeo bateu com os cards com diferença de 2–5 níveis por canal [10].

**Cor e paleta (regras ditas)**
- Um acento só, num item só [04, 14, 17, 18]. Etiqueta com o acento passou a contradizer a mensagem (laranja em "−26%") [04].
- Objeto da cor da folha some: testar a paleta no quadro final [02]. Estúdios das faces bem separados (onda que devolve cor já vista perde o efeito) [08].
- Fundo escuro (3–17/255) pode virar faixas depois da compressão: grão fino no fundo [04, 13, 16]; dither de meio nível no degradê [10]; grão por baixo do objeto, nunca por cima [11].
- Texto/legenda com sombra escura suave para ler sobre objeto claro [03].

---

## 3. Câmera

**Ortográfica vs perspectiva**
- Ortográfica em maquete/isométrica: giro 38°, inclinação 27° [01]; ilha 40° (geral) e 22° (setores) [09].
- Perspectiva com lente longa para produto/miniatura: 17° [14], 20,2° [15 frente], 22° [17], 24° [11, 18], 25–32° [12], 26° [08], 28° [13], 30° [02], 32° [16], 34° [04], 38–45° [05], 40–42° [06], 42° [03], 55–70° grande-angular [07], 17–28° no [10] (abertos 26–28° a 11,5; macros 17–24° a 2,9–6,7).
- Pré-distorção por vértice para ter o quadro de frente "ortográfico" e a perspectiva real nos outros planos [15].
- Planos de corte proporcionais à distância (near = 1% da distância ao ponto fixo, far = 4000×) para atravessar 103× de escala [05].

**Como a câmera foi derivada da referência**
- Calibrada projetando cantos do terreno e a base do restaurante da referência (`resolver-camera.py`) [17].
- Direção do sol calculada pelo enquadramento de um ato e conferida nos outros [03].
- Recomposição de vertical para horizontal: [05, 07, 13] (conjunto mais largo que alto, aparador em 3/4) [13].
- Câmera de inspeção por variável de ambiente: `CAM="x,y,z,giro,incl,fov"` [06], `CAM="az,incl,dist,x,y,z,fov"` [17], `view azimute raio altura alvo` [07], `cam nome t x y z alvo lente abertura` [15], `topo` (vista de cima sem pós) [16].

**Movimentos e cortes**
- Câmera travada: movimento de câmera mexe o quadro inteiro e apaga a diferença entre pausa e estalo [01]; travada o filme inteiro [11, 17]; um único movimento (inclinação) e depois parada [02].
- Cortes secos, nunca crossfade [01, 09, 10, 15]; corte no meio de um passo do personagem [01]; cortes calculados pela posição do personagem (quando cruza a divisória) [01].
- Plano único sem corte: [03, 04, 05, 06, 07, 08, 11, 12, 13, 14, 16, 17, 18].
- Chaves com velocidade zero onde a câmera para de verdade [04 (7 de 9 chaves), 16 (Hermite, 4 de 12)].
- Chave antes do começo / depois do fim para o primeiro quadro já estar em movimento [06 (−1 s), 07 (2 de 20 chaves fora)].
- Curvas por chaves cúbica monotônica (não passa do alvo entre chaves) [03, 06, 12].
- Câmera no referencial do herói (direção + subida, sem rolagem) em distância/altura/ângulo lateral + 2ª passada que reenquadra o herói num ponto fixo da tela; rolagem da câmera = fração da rolagem do avião (15% → 80%) [03].
- Polares em volta de uma referência suavizada do veículo, que segue com atraso e compensa pela velocidade suavizada: na freada a câmera passa à frente e assenta sozinha, sem chave; altura mínima sobre o terreno por máximo suave; altura segue a estrada suavizada, não o quique; alvo segue 1/3 do salto; foco = distância ao veículo [12].
- Posição/alvo por chaves **somados** à posição suavizada do herói (não repete cada esquina); peso do herói vai a 0 no plano final [16].
- Câmera em volta do eixo do poste: azimute, raio, altura, mira, rolagem (≤10°), FOV + tremor de mão pequeno [07].
- Câmera do laço em coordenadas independentes de escala (§6) [05]. Planos de trilho: linha reta, velocidade constante, lentes 24–30°, cortes secos entrando em movimento já andando [15].
- Lente deslocada 335 px para o objeto ficar à esquerda do centro e deixar papel livre para as notas [14].
- Macro posicionado no espaço da âncora da face (ponto de mira, direção, distância) [10].
- Arco lento: 13°→42° de azimute, 15°→22° de altura, ease in-out, para a 0,3 s do fim [14]; órbita 37°→23° com recuo 8,3→12,2 [18].
- O herói quase nunca de costas: câmera muda de lado conforme a história [16]. Móveis onde o personagem age ficam soltos perto da borda aberta (a câmera faz o papel do espelho) [01].

**Armadilhas de câmera**
- Laje do andar de cima tapa o térreo com câmera alta (a 27°, tudo acima de 1,3 m no meio do térreo) [01]. Divisória interna inteira tapa o cômodo vizinho → meia profundidade [01].
- Objetos no caminho da câmera: rival a 18 m [03], poste a 4 m da lente [05], pássaros a 5 m (mínimo 10 m) [06], coqueiro a 60 cm do ponto final [06], prédio do fundo em cima da câmera [17], câmera dentro de uma placa no chicote [07], morro empurrando a câmera 7 m para cima [12]. Conserto recorrente: amostrar o caminho da câmera antes de plantar/posicionar (a cada 0,05 s em [12]) e conferir distâncias quadro a quadro.
- Lista por plano do que sai de quadro (cenário/bicho do setor da frente, vulcão, fumaça); vizinho cortado na borda some [09].
- Câmera recuando junto com a explosão deixa peças fora do quadro: o recuo começa antes [18]. Lado de perto cresce com a perspectiva: deslocar o alvo para ele e recuar mais [18].
- Câmera inclinada demais no lápis/objeto: lápis a 36° apontava para a câmera; deitado a 17° [15].
- Volta final "em chicote" (partir de longe com freada forte) faz o corte entrar em movimento rápido demais [15].

---

## 4. Pós-processamento

**Ordem de passes registrada**
- [05]: cena em alvo 16 bits com AA 4× → DOF por profundidade (64 amostras, raio máx 4,2% da altura; limpa NaN antes do bloom) → bloom (0,4, limiar 1,05) → acumulação de 12 subquadros → ACES, vinheta, grão, sRGB.
- [07]: soma das amostras de motion blur em float → bloom → último passe com distorção de lente, tone map, sRGB, grão.
- [16]: 8 subquadros somados em luz linear → depois tom (ACES), vinheta e grão; DOF próprio; bloom 0,2 só acima de 1,0.
- [17]: 18 subquadros → reflexo planar → DOF em espiral áurea → bloom em cadeia de mips → ACES → gradação em espaço de exibição → vinheta e grão.
- [18]: 24 subquadros → acumulação float → Khronos PBR Neutral → S leve → vinheta 16% → grão; rótulos 2D por cima, sem desfoque.
- [14]: 4 etapas por quadro: imagem auxiliar para contorno, contornos, tinta (hachura, sombra, riscos), papel.
- [06]: 5 passes do filtro de pintura (§1).

**Motion blur por subquadros (acumulação)**
- 8 (180°) [16]; 12 (180°) [05]; 12/44/96 conforme velocidade, meio quadro [13]; 16 (180°) só em janelas rápidas, **sempre para a frente** para nunca atravessar um corte [10]; 18 (360°) [17]; 24 (180°) [18]; 48 [08]; 8–72 adaptativo, 1 por 5 px de deslocamento, obturador 80% [07].
- Poucos subquadros = cópias em linha: 8 em [10], 16 e 28 em [13], 12 "viram hachura" (prompt [13]).
- A mesma acumulação dá AA (jitter subpixel, Halton em [17, 18]), sombra macia (luz em disco) [08, 18] e alisa fibras/telas/DOF (padrão do DOF girado por subquadro) [05].
- O que **não** borra: texto e adesivos usam o instante-base do quadro (entram secos) [10]; onda de cor calculada no meio do quadro (com blur a borda virava clarão de 108 px) [08]; rótulos 2D desenhados por cima [18].
- Tempo módulo da duração no laço: o blur do primeiro quadro enxerga o fim do filme [13].
- Sem motion blur por escolha: [14] (estilo lápis); [04] (limite: mais de uma moeda por quadro, fluidez não medida).

**DOF**
- O DOF pronto do three.js deixa o nítido da frente vazar sobre o fundo desfocado (halo no número) → shader em que uma amostra mais próxima só entra se o desfoque dela alcançar o pixel [04].
- CoC por pixel (negativo na frente do foco), 240 px·m, teto 44 px na frente e 13 px atrás, 420 amostras em disco, o de trás não vaza sobre o foco [12].
- Espiral áurea com borrão pela profundidade [17]. 110 amostras raio máx 15 px [15]. 64 amostras [05].
- DOF sem escala: raio depende só da razão profundidade/foco (laço atravessa 103× de escala) [05].
- Alternativa: 5 camadas desfocadas separadamente, "mais robusto que um desfoque por profundidade, que vaza" [13].
- DOF demais deixa a órbita mansa (fundo muito desfocado quase não mexe pixels) [05].

**Bloom**
- Limiar acima de 1,0 sempre: [03] (>1,0), [05] (1,05), [16] (só acima de 1,0, força 0,2; 0,42 lavava), [07] (a partir de 0,85, força 0,18 com emissão 1,7). Bloom espalha NaN pela tela inteira (§8).
- Sem bloom/AO/DOF quando há alfa (sujam a borda) [11].

**AO**
- AO nos encontros (maquete) [01, 09]; AO por profundidade 18 amostras raio 0,8 m [12]; AO em meia resolução só na camada do meio [13]; AO nas dobras em cor de vértice (mão SDF) [17].

**Grão, vinheta, lente**
- Grão: 1,4% [16], 1,8% [12]; por número do quadro, mais fraco nas sombras [03]; grão é o que mais pesa no arquivo comprimido [03]. Sem grão: [08, 14].
- Vinheta: 12% (zera ao abrir) [15], 16% [18], 20% [12], violeta [03], forte [16].
- Distorção de barril 0,2 com render 25% maior [07]; aberração cromática nas bordas [03, 07]; anamórfico e bolhas de lente [03].

**Superamostragem**
- 2× (3840×2160 reduzida) [10, 11]; 3× (4800×4800) [15]; `--q="ss=3"` se as flores cintilarem [11]; contorno em imagem auxiliar 2× [14]; 25% maior por causa da lente [07]; pintura calculada a 75% [06]; reflexo em meia resolução [17].

---

## 5. Geometria, materiais e texturas procedurais

**Princípio comum:** nada de modelo, imagem ou textura de arquivo; únicos externos permitidos foram fontes (Inter [02, 04, 07, 08], Playfair+Inter [03], Kalam [06], Archivo e outras 4 [10], Arial Rounded do macOS [17], Avenir Next do macOS [18]) e SVG de logos [08]. [14] não usa nem fonte (letra de traço único).

**Helpers e técnicas de forma**
- Primitivas arredondadas (caixas arredondadas, cápsulas, cilindros) [01, 04, 13].
- `LatheGeometry`: perfil deve ir **de baixo para cima** (escrito ao contrário fica invisível de frente e parece buraco) [11]; perfil suavizado por spline e percorrido para normais apontarem para fora [18]; ondulação por ruído e cor por altura [17].
- `ExtrudeGeometry` de SVG com quina para dentro e normais corrigidas [08]; perfis extrudados [02]; fonte → formas (opentype.js) → extrusão com chanfro → curvada em volta de um cilindro [17]; números 3D por fonte convertida para typeface.json com `tools/fonte-typeface.py` (fonttools), gerando só os glifos do texto [04, 08].
- SDF + marching cubes (célula 0,025) com normais pelo gradiente [11]; SDF + surface nets com smooth-min [17].
- Loft: seções de superelipse ligadas por uma pele [14]. Varredura de seção arredondada por caminho com largura variável [18]. Tubos contínuos recalculados por quadro (calda) [12].
- Espinha + Catmull-Rom + anéis refeitos por quadro; pontas fecham num ponto (raio pequeno no último anel deixa furinho) e topo de perna em cúpula (tampa chata = remendo retangular) [09].
- Superelipse expoente 5 para ícone [08]. Construtor único de placa a partir de contorno convexo, malha fina curvável [07].
- Fitas viradas para a câmera: rastros (110 posições passadas, 1,98 s) [03]; riscos de lápis [14]; traço do desenho [15].
- Corte de contorno em pedaços por linhas retas: retirar "farpas" de área zero na linha de corte (senão sai meia-lua cheia) [08]. Vales automáticos = mínimos da distância contorno–centro [08].
- Ovalização na geometria, não no grupo (rotação dentro de escala não uniforme deforma) [18]. Concha oca com parede dupla [18].
- Geometria do guarda-sol recalculada por quadro com lona de comprimento fixo (raio 0,13→1,52, altura por Pitágoras) [06].

**Instancing**
- Pilhas de moedas: uma malha instanciada por pilha, cada instância com instante de pouso [04]. Natureza: 106 mil tufos + 30 mil flores + 30 mil hastes com instante de nascer em atributo; crescimento no vertex shader a partir de um tempo global; flor interpola entre dois estados guardados na mesma malha (botão/aberta); nenhuma matriz recalculada por quadro [11]. 539 mil folhas [12]. 52.978 gomos de floresta [15]. Gergelim pela normal [17]. Floquinhos em copas [17]. Traço da planta com `instanceCount` [02].

**Texturas em canvas**
- Pele 2048×512 espelhada [09]; mostradores, trama da pulseira, cartões [13]; adesivos (15 artes, folha de conferência sobre a cor do objeto mais claro) [10]; papelão com manchas desenhadas **9 vezes deslocadas** para emendar nas bordas [10]; placa de circuito 280 px/unidade [16]; terreno 4096×2048 [12]; pintura dos aviões [03]; hachura 2048 px [14]; arte inteira da ilustração [15]; tela furada como alphaMap em colmeia [18].
- Escala de textura: aumentar para ler miniatura [01]; textura 4–8 px por unidade da ilustração [15]; células de Voronoi no espaço do objeto [06].
- Texto em anel: a emenda da textura corta o número (desenhar nas duas pontas); conferir num quadro ampliado [13].
- Microrrelevo procedural por ruído 3D na normal [17]; relevo de escamas 3× mais forte e maior [09].

**Materiais**
- Verniz (clearcoat) para "produto, não massinha" [08, 11, 18]; fita sem verniz com rugosidade 0,2 para o vinco aparecer [10]; pupila fosca (lisa reflete o sol e acinzenta) [09]; botões foscos [11].
- `AdditiveBlending` padrão soma o alfa também: vidro só de reflexo virou disco preto opaco em composição por camadas → mistura personalizada que soma só a cor [13]. Reflexo do cristal <10% de opacidade no início [13].
- Luz por nível como uniform no material (as luzes do three.js são globais); clarão como termo do material [05]. Emissivo da bola separado da luz da quadra [05]. Materiais de luz com `fog` ignorado para virarem bokeh [17].
- Material de tinta = material iluminado comum com o final do shader trocado [14]. Material de dois tons fixo (sem iluminação realista) [15]. Toon de 3 tons [03].
- `ShaderPass` clona os uniforms e descarta a textura passada no construtor (reatribuir) [16].
- Ordem de transparência: fantasma com `renderOrder` maior que a planta [02]; letreiros com a mesma ordem da planta [02]; lápis na fila dos transparentes com ordem maior que o "papel" [15]; `polygonOffset` nos adesivos [10].
- Layers: texto fora da câmera do Reflector (que clona a câmera principal inclusive as layers) [04].

**Texto e fontes**
- Fontes carregadas (FontFace) antes do primeiro quadro / primeiro canvas [03, 04, 07]. Fonte do sistema muda de máquina para máquina: trocar arquivo e nome juntos [17, 18]. Recorte latino da Inter cobre só português [07].
- Texto 2D por cima do WebGL: canvas 2D [03, 18]; HTML fotografado junto [04, 16]; passadas de texto atrás/na frente [10]. Texto 3D só no mundo [17]; "sem texto por cima da cena, todo texto mora num objeto" [13].
- Espaçamento −7,5% embolou "ui" → −5,5% + contorno 2% [07]. Vírgula afunda abaixo da linha de base: subir o número 30% da altura [04]. Cota com número em pé (deitado a 15° = 25 px ilegível) [14].
- Português correto: "SEX 20" lia como inglês → "SEXTA 20"; dia da semana conferido (20/11/2026 é sexta); bússola N, L, S, O [13]; vírgula decimal [04, 13].

---

## 6. Animação e linha do tempo

**Função pura do tempo (todos)**
- `renderAt(t)` recalcula a cena inteira; sem relógio, sem estado acumulado, sem `Math.random` (sorteios com semente fixa) [01–18; "sem Math.random" explícito em 10; semente fixa em 07, 11].
- Determinismo verificado: quadro de 3,0 s idêntico pixel a pixel renderizado antes ou depois de outros [04]; quadros de 5,6 e 12,9 s idênticos byte a byte em duas ordens [06]; quadro de 6,22 s idêntico byte a byte [14].
- Simulação/trajeto integrados **uma vez na abertura** e lidos por interpolação: trajeto do avião a cada 1/120 s de −3 a 15,5 s [03]; física a 1.200 passos/s de −4 a 16,6 s, guardada a 240 amostras/s [12]; caminho do herói percorrido uma vez anotando o instante de cada ponto comido [16]. Rastros leem o trajeto em instantes passados [03]; traçantes = retas no tempo com o instante do impacto (o respingo nasce ali) [03].
- Poeira de película e grão com semente = número do quadro [03].
- Uma só linha do tempo comanda tudo, inclusive o áudio [17, 18]. Conteúdo/tempos num lugar só (`COPY`, `BEATS`, `T`, `SHOTS`, `CAM`, `timeline.js`) [07, 08, 10, 17, 18].

**Estruturas de timeline**
- Trechos em sequência: segurar pose / ir para pose / andar por trajeto; cada um começa onde o anterior terminou [01].
- Tabela de tempos + cada peça com etapa, atraso e jeito de entrar (subir do chão, brotar com excesso, desenrolar, esticar) [02].
- Lista de planos com início, fim e função que posiciona objetos e câmera; `stick(...)`, `block`, `wipe` [10]. Lista de planos de trilho (posição inicial/final, alvo, lente, foco, abertura) [15].
- `u` de 0 a 4 dentro do ciclo dirige tudo; cada objeto com repouso, eixo de giro, atraso ≤0,07 s e fases [13].
- Cada logo é um construtor que devolve a pose para "segundos desde que a face cravou" e a lista de contatos (coice) [08].
- Varredura 0–1 ao longo de cada peça (contorno, depois hachura, depois cruzada; mesma regra no mapa de sombra) [14].
- Cada acontecimento = curva 0→1 com instante de início [06].

**Easing e curvas**
- Cúbica monotônica (não passa do alvo entre chaves) para coreografia e câmera [03, 06, 12, 16]. Hermite com velocidade zero nas paradas [16].
- Crescer com pequeno excesso e voltar (montagem) [01, 02]; mola de 1,45 Hz que crava em 0,35 s e passa ~10° [08]; explosão como mola com 12% além do ponto [13]; ease de recuo (back) 1,15 na abertura, suave nas duas pontas no fechamento [18]; botão de flor passa do tamanho e volta [11]; recuo rápido no começo e lento no fim [04, 13, 08].
- Carimbo: escala 142%→95,5% em 90 ms, 100% aos 200 ms; objeto leva tranco de 3% por 180 ms; caixa gira 4–6° por carimbo [10]. Texto: linha sobe 22% do corpo e assenta em 100 ms, sai seca [10]. Título [03]: palavra a cada 0,6–0,7 s subindo 16 px de um blur de 8 px em 0,5 s; última com soco 1,08→1,0 em 0,45 s.
- Queda de moeda: 0,30 s acelerando como gravidade, de 2,2–2,6 acima, inclinada 15–35° zerando ao pousar, tremida de 0,16 s [04].
- Troca de cor de destaque em < 1/3 s (0,5 s passava por tom sujo) [02].

**Poses, personagens e ciclos**
- Poses = conjuntos de ângulos de juntas interpolados com aceleração e freada [01]. Caminhada pela distância percorrida num trajeto de pontos, corpo vira para o trecho e suaviza perto de cada ponto; na escada a altura segue os degraus, um degrau por apoio [01]. Pernas pela distância percorrida [16].
- Velocidade, aceleração e giro tirados da curva do caminho alimentam inclinação, andar, freadas e "deitar na curva" [16]. Andares diferentes por perseguidor (pula com squash/stretch, ginga, flutua) [16].
- Espinha dobrada em cadeia a partir do quadril (giros defasados) [09]; IK de 2 ossos com pé fixo [09].
- Física com exageros declarados: no ar busca a inclinação do chão, mergulho de freada 3,2× o real, frutas com metade da gravidade; corpo sobre 2 molas (1,75 Hz, amortecimento 0,5), rodas só empurram para cima; pilha = corrente de molas + mola de "peso sentido" (folga até 20% em queda, esmaga até 14% no pouso), trava de 7,5 cm; frutas balísticas com elástico (a partir de 20–38 cm) e limite de velocidade [12]. Amplitude dos morros com janela estreita: 0,48 ok, 0,52 quebra o ritmo [12].
- Pássaros: líder por chaves, outros em V, asas de 2 partes com atraso, pouso em arco até o poleiro [06].
- Respingo estilizado: coluna + 170 gotas balísticas + anéis que somem num raio máximo + ondas que decaem [01].
- Crescimento: frente "arranca e depois rasteja"; haste 0,6 s, botão 0,7 s com excesso, pétalas 1,2 s; tufo 0,85 s; nada brota no último 1,5 s; somar início + duração + abrir da última flor e conferir que termina antes do último 0,5 s [11].
- Time-lapse: pessoas em grupos que pulam de lugar **alinhados à troca de quadro**; cintilação das luzes de fundo; exposição ±1,5% por quadro [17].

**Cortes calculados, laço e emendas**
- Instantes de corte calculados a partir da posição do personagem (continuam certos se o trajeto mudar) [01].
- Laço de 4 s só com senos de número inteiro de ciclos por laço + envelopes dentro do laço; nunca tempo absoluto solto; personagens com fase adiantada (1,4 e 3,5 s) para o gesto cair no meio do plano; duração total múltipla de todos os ciclos (24 = múltiplo de 4 e 8) [09].
- **Laço infinito por escala** [05]: três níveis do mesmo mundo (fora, principal, dentro) com geometria única e materiais por nível; tempo por nível (dentro t−8, fora t+8); ponto fixo da transformação entre níveis (1,297 de altura); câmera em distância (log), azimute, elevação, desvio do alvo em frações da distância, rolagem, FOV; chaves copiadas uma volta para trás e uma para a frente (distância × escala, azimute + 170°) antes de interpolar → contínua em posição e velocidade. Conferência numérica: câmera do t=0 levada para dentro cai na do fim com erro de 1 bilionésimo da distância; 1º e último quadro com SSIM 0,98. Não fechar laço com fade para preto.
- Laço de produto [13]: o conjunto nasce onde o produto estava e se recolhe onde o próximo entra; câmera termina o ciclo onde o seguinte começa.
- Relógio da cena que freia até parar (anda até 14,4 s, para em 15,2 s) para o final imóvel com câmera também parada [06].
- Ícone com duas metades trocando de papel a cada virada (simetria esconde a troca) [08].
- Vida do mundo arrancando devagar após a onda (22,05 s) [15]. Fervura do contorno só com a câmera parada (0,75 px a 8 trocas/s) [14].

**Sincronização com áudio/narração**
- Nenhum motion sincroniza com narração. Dois têm áudio sintetizado em Python lendo os mesmos instantes da timeline: [17] (numpy+scipy; ambiente, carros em estéreo, marteladas, 5 baques, neon, guarda-sóis, talheres; −21 dBFS) e [18] (numpy; cama de acorde, sopro, estalos, 7 notas ascendentes, encaixes, clique, grave; −22 dBFS). Mixagem: `ffmpeg -c:v copy -c:a aac -b:a 256k -shortest`. Ambos conferidos por espectrograma/nível, não por escuta. A ref do [08] tinha SFX em cada contato (não reproduzido).

---

## 7. Render e desempenho

**Tempos registrados (Mac Apple M5)**
- [01] 660 quadros ≈ 50 s · [02] 360 ≈ 47 s · [03] 420 ≈ 66 s · [04] 360 ≈ 50 s · [05] 240×12 subquadros ≈ 30 s (~0,1 s por quadro sozinho) · [06] 480 = 60–110 s (dividindo a placa) · [07] 450 = 90–120 s · [09] 576 ≈ 9 min (1 q/s, com outros renders) · [10] ≈ 2,5 min · [11] 240 = ~5 min MP4 / ~8 min alfa (máquina ocupada) · [12] 480 ≈ 80 s · [13] 360 ≈ 75 s · [14] 240 ≈ 47 s (com outros renders) · [15] 1.386 em 3× ≈ 4 min · [16] "poucos minutos" com 8 subquadros · [17] ≈ 90 s com 18 subquadros · [18] 300×24 ≈ 35 s.

**Armadilhas de Chrome / máquina**
- Render "travado" nunca foi o código: outros renders de outras sessões na mesma máquina [05 (não voltou em 4 min), 10 (10 min numa etapa de 2), 11, 09]. Modos `video resume` e `frames a b` para continuar ou refazer trecho [09]; `video 20 27` trecho [15].
- Chrome instalado com aceleração de vídeo [01].

**Modos de rascunho**
- `SUB=4` [05]; `AMOSTRAS=16` [08]; `SS=1 DRAFT=1` (sem superamostragem e sem rastro, para medir movimento) [10]; `--sub=1` prévia sem blur [16]; `QUALIDADE=rascunho` (4 subquadros [17], 6 [18]); `LARGURA=1280` [18]; `SS=3` final / 2× padrão [15]; `ETAPA=base` (sem filtro) e `ETAPA=tinta2` (antes do relevo) para achar em que passe nasce o defeito [06]; `--q="vo=x,y,w,h"` recorte ampliado [11].

**Formato de captura e ffmpeg**
- JPEG para MP4; PNG com transparência para ProRes 4444 [11]. Modo alfa precisa limpar a página inteira (fundo da página preenchido = alfa opaco) [11]. ProRes alfa = 227 MB [11]. ProRes conferido só pelo formato e um quadro, não aberto num editor [11].
- H.264 BT.709 faixa limitada (§2) [05, 07, 10, 16].
- Recompressão para o acervo: CRF 19 → 23 MB, SSIM 0,985 vs 49 MB [03]; CRF 18 = 134 MB → CRF 23 = 61 MB (trama da tela em todos os pixels pesa) [06]; CRF 19 → 24 MB, SSIM 0,978 vs 50 MB [12]; versão leve 36 MB vs máxima 85 MB [15]. Grão/trama são o que mais pesa [03, 06].
- Paralelismo: 5 agentes em paralelo, um por personagem, cada um no seu arquivo e sem mexer na biblioteca, depois de um molde com página de 4 vistas (6–11 min e 3–5 rodadas de render cada) [09].
- Renderizador copiado de outro projeto gravou o vídeo com o nome antigo [13]; cards de todos os temas gravados na mesma pasta [02].

---
