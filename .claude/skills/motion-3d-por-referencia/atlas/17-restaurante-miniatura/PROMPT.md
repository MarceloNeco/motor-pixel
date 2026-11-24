Quero um motion graphic 3D no estilo "time-lapse de maquete", feito inteiro em código com three.js, sem modelos 3D prontos, sem imagens e sem texturas de arquivo: toda geometria, toda textura e toda luz são geradas no próprio código. A única coisa que vem de fora é uma fonte arredondada em negrito do sistema, usada só no letreiro 3D (se não houver, use outra fonte grossa e arredondada). O resultado é uma esquina de cidade em miniatura, à noite, vista de cima por uma câmera travada, onde uma mão gigante crava uma bandeirinha num terreno vazio e, em time-lapse, o lugar vira o meu negócio, com um objeto gigante no telhado.

## Meu tema

- **O negócio:** [O QUE É. Exemplo: "uma hamburgueria", "uma sorveteria", "uma cafeteria", "uma pizzaria".]
- **Nome, em duas palavras, em maiúsculas:** [Exemplo: "MEGA BURGER", "SUPER SORVETE". Vai no letreiro 3D, na flâmula da bandeira e na lista de texto em tela.]
- **O objeto gigante do telhado:** [O QUE CABE EM CIMA DE UM PRÉDIO REDONDO E TODO MUNDO RECONHECE. Tem de ser feito de camadas que caem uma por uma. Exemplo: hambúrguer (pão, carne, queijo, alface, tomate, pão com gergelim), sorvete (casquinha, três bolas, calda, cereja), pilha de panquecas.]
- **A cor de acento do negócio:** [UMA SÓ. Exemplo: o vermelho da flâmula, do neon e dos guarda-sóis.]
- **Os textos do mundo, em português:** [UMA PALAVRA PINTADA NO ASFALTO (exemplo: "OLHE"), "PARE", o nome de duas ruas, o destino do ônibus (exemplo: "CENTRO"), e "ABERTO" no neon da vitrine.]
- **Formato:** 16:9, 1920×1080, 24 quadros por segundo, 8 segundos, com áudio.
- **Idioma dos textos em tela:** português do Brasil.

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida. Ela tem a cena inteira: o prédio, a obra, o objeto gigante, a bandeira, o letreiro e a animação (`src/restaurant.js`), a mão (`src/hand.js`), as ruas, calçadas, prédios e árvores (`src/city.js`), os carros e ônibus (`src/vehicles.js`), as pessoas (`src/people.js`), a imagem final (`src/post.js`), a linha do tempo com todos os instantes (`src/timeline.js`), o áudio (`ferramentas/audio.py`) e o renderizador (`render.mjs`). Reaproveite a técnica; troque o objeto gigante, o nome, os textos e, se precisar, os tempos pelo meu tema. Se a pasta não existir, construa do zero seguindo o que está abaixo.

## Antes de construir: a ordem sai do tema

O exemplo que acompanha este prompt é uma hamburgueria. **Não reaproveite o hambúrguer, o nome MEGA BURGER, as placas nem a flâmula para o meu tema.** Antes de construir, me responda em uma tabela e espere meu ok:

| Papel | Pergunta | No exemplo da hamburgueria |
|---|---|---|
| O prédio | Que forma de prédio sustenta o objeto no telhado? | um quiosque redondo de vidro, com laje |
| O objeto gigante | De que camadas ele é feito e em que ordem caem? | pão de baixo, carne, queijo, alface e tomate, pão de cima com gergelim |
| A obra | Como o prédio sobe antes de o objeto chegar? | um anel de vidro aberto e uma treliça de madeira por cima |
| A bandeira | O que a mão segura e o que está escrito? | um palito com flâmula vermelha e o nome em amarelo |
| O letreiro | Que texto 3D e que neon acompanham? | o nome extrudado e curvado em volta do cilindro; neon vermelho e azul |
| A vida | O que enche o lugar depois de abrir? | guarda-sóis vermelhos, vasos, gente, ônibus e táxis |

## O visual

- **Noite quente, luz de foto de maquete.** Um foco quente (`#ffd2a2`, intensidade 2,05, cone de 22°, borda macia) apontado para a esquina, de cima, do lado da câmera (posição (−38, 96, 54), alvo (3, 0, 1)); um preenchimento frio bem baixo (luz hemisférica azul `#55689a` e marrom `#2e2620`, intensidade 0,55); e um segundo foco estreito (8,5°, quente) só no objeto gigante, que acende quando ele chega. O resto do mundo fica no escuro e é iluminado só por luzes locais: postes (laranja `#ffb878`, luz pontual forte), vitrines e faróis.
- **Névoa escura** (`#0d0b0a`, de 120 a 330 de distância) que apaga o fundo. As lâmpadas e janelas distantes ignoram a névoa e viram bokeh grande.
- **Asfalto molhado:** cinza escuro com grão, com reflexo planar de verdade (a própria cena espelhada), esticado na vertical, e máscara de poças. O chão **não** reflete o céu falso do ambiente: só o espelho da cena.
- **Calçada** de pedras retangulares beges, assentadas desencontradas; meio-fio de concreto; terreno de terra fofa com relevo.
- **Árvores de maquete:** tronco com galhos e copa de tufos facetados, com milhares de floquinhos instanciados por cima; o topo mais amarelo-oliva, a base mais escura. Altura que não cubra o objeto gigante.
- **Escala de ferromodelismo:** gente, carros e postes bem pequenos em relação ao prédio (a vitrine tem uma pessoa de altura). Cada pessoa é cápsulas e esferas coloridas; cada carro é um perfil de sedã extrudado, com faróis.
- **Um acento só:** a cor do negócio. O resto é âmbar das luzes sobre azul-acinzentado do asfalto.
- **Imagem final:** tom ACES, depois gradação em espaço de exibição (contraste em torno de 0,42, ponto branco 0,93, piso de preto 0,008, exposição 0,86), vinheta e grão leves. Compare a luminância mediana com a da referência, se eu mandar uma.

## A câmera e o ritmo

- **Câmera travada o filme inteiro:** lente longa, azimute 44°, inclinação 24°, campo de visão 22°, distância 95 do alvo (0,3; 3; −0,5). Sem corte, sem zoom, sem tremor.
- **Profundidade de campo de maquete:** foco na esquina, primeiro plano e fundo borrados.
- **A linha do tempo** (instantes em segundos; guarde todos num arquivo só):
  - 0,0 a 0,8: o terreno vazio, com operários e carros riscando o quadro.
  - 0,8 a 1,07: a mão entra pelo topo em 2 quadros, paira pequena segurando o palito com a bandeira e some entre dois quadros.
  - 1,07 a 1,37: a bandeira fica em pé no terreno; em 1,145 o anel de vidro aparece de uma vez; a treliça cresce em cinco estágios até 1,375, quando a bandeira some.
  - 1,64 a 1,99: a mão volta com a bandeira e paira descendo devagar.
  - 1,915 a 2,01: o objeto gigante se materializa em rajada, camada por camada, em cerca de 0,1 s; a laje chega junto; o salão acende em 1,96; a mão crava a bandeira no topo e some.
  - 2,385 a 2,5: o letreiro surge e acende, depois o neon, depois a placa de aberto.
  - 2,55 a 3,7: vasos e gente se juntando; a única calmaria do filme.
  - 3,8 a 4,5: os guarda-sóis abrem um a um; o táxi parado vai embora; um carro chega e fica.
  - 4,5 a 8,0: time-lapse vivo ao redor do herói parado; um carro para na faixa por volta de 6,0.
- **Dinâmica:** o filme é contínuo, sempre há algo andando. A respiração vem de uma calmaria curta (2,75 a 3,5 s), não de pausas longas. Os socos são a chegada do objeto gigante e as passagens de ônibus.
- **Pessoas:** quase não andam. Ficam em grupos que mudam de lugar aos saltos, de um quadro para o outro, com algumas ausências aleatórias.

## A técnica que faz o estilo

1. **Cada quadro é a soma de 18 subquadros** com obturador de 360° e um deslocamento subpixel diferente em cada um. Dá desfoque de movimento real nos carros e nas pessoas, e antisserrilhado. Em rascunho, use 4.
2. **Reflexo planar.** Renderize a cena espelhada em y = 0 num alvo de meia resolução, borre pouco na horizontal e muito na vertical, limite o brilho das amostras (senão o reflexo vira ruído) e some o resultado ao material do chão pela máscara de poças.
3. **Profundidade de campo** por coleta em espiral áurea, com o tamanho do borrão calculado pela profundidade de cada ponto.
4. **Bloom** em cadeia de mips e **gradação em espaço de exibição**, depois do tom ACES.
5. **Microrrelevo procedural** no shader das árvores, do pão e da terra: ruído 3D que perturba a normal e a cor, para dar cara de espuma e de poro.
6. **A mão é um campo de distância (SDF):** palma, falanges e polegar em cones arredondados unidos com smooth-min, poligonizados por surface nets, normais pelo gradiente, oclusão nas dobras e rubor nas pontas em cor de vértice; unhas como esferas achatadas. A pose é uma pinça sobre o palito.
7. **O objeto gigante é feito de tornos (`LatheGeometry`)** com ondulação por ruído, cor por altura, queijo como placa que escorre pelas bordas, gergelim instanciado seguindo a normal do pão. Cada camada tem o instante em que cai e um pequeno estica-e-amassa.
8. **Letreiro 3D:** transforme a fonte em formas (opentype.js), extrude com chanfro e curve o texto em volta do cilindro do prédio, de frente para a câmera.
9. **Tudo é função do tempo.** Uma página expõe `renderAt(t)`, que desenha o quadro do instante `t` sem relógio nem estado acumulado; trânsito, gente, mão, obra e luzes leem a mesma linha do tempo.
10. **Pessoas e carros são funções do tempo** sobre posições e caminhos; os saltos das pessoas ficam alinhados à troca de quadro para parecerem nítidos.
11. **Áudio sintetizado em código**, lendo os mesmos instantes: ruído grave de cidade, passagens de carro com pan, marteladas, um baque macio por camada do objeto, zumbido de neon, guarda-sóis abrindo, talheres. Nível médio por volta de −21 dBFS.

## Armadilhas que já custaram retrabalho

- **Prédio do fundo em cima da câmera.** Cobre metade do quadro. Confira com uma câmera de inspeção antes de seguir.
- **Contraste em espaço linear.** Primeiro esmaga os pretos; depois, se você compensar, lava tudo. Faça a gradação depois de converter para sRGB.
- **Asfalto que reflete o céu falso do ambiente.** Vira um véu marrom por cima do chão. Desligue o reflexo de ambiente nos materiais do chão; fique só com o espelho da cena.
- **Mão grande no meio do quadro.** Destrói a escala da maquete. Ela é pequena, fica no topo e entra e sai em dois quadros.
- **Camadas caindo devagar** viram um bolo flutuando. Têm de ser uma rajada de cerca de 0,1 s.
- **Fila de faróis numa rua que sai do quadro.** Ponha numa rua que sobe de frente para a câmera, ao fundo, e deixe os carros liberados contornarem o prédio e descerem a rua lateral.
- **Pessoas andando o tempo todo** parecem multidão de passarela. Time-lapse tem grupos parados que pulam de lugar.
- **Pulos de pessoas fora da troca de quadro** viram fantasmas. Alinhe os saltos aos quadros.
- **Base do prédio que esconde o piso** do salão, ou piso claro de obra visto pelo vidro, lê como parede. Deixe o salão escuro até acender.
- **Árvores altas demais** cobrem o herói; mantenha a copa abaixo do topo do objeto gigante.
- **Luz geral fraca com foco fraco** deixa tudo escuro; o equilíbrio é um foco forte com borda macia e luzes locais fortes.
- **Lâmpadas distantes dentro da névoa** somem em vez de virar bokeh. Marque os materiais de luz para ignorar a névoa.
- **A fonte do sistema muda de sistema para sistema.** Troque o arquivo e o nome da fonte juntos.
- **O teste de "quase-parada" da skill de motion não vale para um time-lapse contínuo:** a própria referência marca 0%. Meça a energia de movimento por janela e por região do quadro.

## Como construir

1. **Motor.** Um projeto Node com `three`, `opentype.js` e `puppeteer-core`. Uma página HTML monta a cena e expõe `window.renderAt(t)`.
2. **Render.** Um script abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva as imagens e junta num MP4 com o ffmpeg; o áudio é mixado no fim.
3. **Se eu mandar um vídeo de referência,** meça antes de construir: extraia todos os quadros, calcule a câmera projetando pontos do chão, monte tiras de quadros lado a lado e meça a energia de movimento e a luminância. Cada diferença vira um número a casar.
4. **Conteúdo num lugar só.** Nome, textos, cores e instantes ficam no começo dos arquivos principais.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Responda a tabela "a ordem sai do tema" e espere meu ok.
2. Construa a cena e renderize uma imagem parada de cada momento: terreno vazio, mão com a bandeira, anel e treliça, mão voltando, o objeto chegando, o letreiro acendendo, o pátio aberto e o plano final.
3. Olhe cada imagem você mesmo e corrija antes de me mostrar.
4. Depois de aprovado, renderize o vídeo, revise em folhas de quadros e rode as medidas de movimento e de cor.
5. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar (por exemplo, se o áudio foi conferido só pelo espectrograma).

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não copie o hambúrguer, o nome MEGA BURGER, as placas nem a flâmula do exemplo; são do exemplo.
- Não mova a câmera, não dê zoom, não use corte.
- Não ponha texto 2D sobreposto: o texto só existe dentro do mundo (letreiro, flâmula, placas).
- Não use segunda cor de acento.
- Não ponha marca, logotipo ou placa de fabricante reais nos prédios, nos carros ou no objeto.
- Não deixe a mão grande nem no meio do quadro.
- Não prometa fotorrealismo: é CG estilizado de maquete, com cara de foto pela luz, pelo reflexo, pela profundidade de campo e pelo ruído de time-lapse.
