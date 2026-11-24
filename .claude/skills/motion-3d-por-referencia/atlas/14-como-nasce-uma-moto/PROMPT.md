Quero um motion graphic 3D no estilo "desenho a lápis", feito inteiro em código com three.js, sem modelos 3D prontos, sem imagens e sem arquivo de fonte: toda geometria, toda hachura, toda letra e o papel são gerados no próprio código. O resultado é uma cena 3D de verdade que se lê como desenho a grafite no caderno de um designer, e que se desenha sozinha na ordem em que a coisa é montada.

## Meu tema

- **O que é desenhado:** [O OBJETO. Exemplo: "uma bicicleta", "uma cafeteira italiana", "uma cadeira de madeira".]
- **Título, em maiúsculas, de 3 a 5 palavras:** [Exemplo: "COMO NASCE UMA BICICLETA".]
- **As quatro etapas, na ordem de montagem e de baixo para cima no objeto:** [QUATRO NOMES DE UMA PALAVRA, EM MAIÚSCULAS. Exemplo: "1 RODAS", "2 QUADRO", "3 TRANSMISSÃO", "4 SELIM".]
- **Uma cota:** [A MEDIDA MAIS FALADA DO OBJETO, COM UNIDADE. Exemplo: "1050 MM" entre os eixos.]
- **A peça que recebe a cor:** [UMA SÓ, de preferência a última etapa. Exemplo: "o selim".]
- **O último risco:** [UM DETALHE PEQUENO QUE DÁ VIDA NO FINAL, tirado do mundo do objeto. Exemplo: "dois tracinhos de movimento atrás da roda". Se eu não souber, proponha.]
- **Formato:** 16:9, 1920×1080, 30 quadros por segundo, 8 segundos, sem áudio.
- **Idioma dos textos em tela:** português do Brasil.

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida. Ela tem o kit de lápis (`src/lapis.js`: hachura, contorno, riscos soltos e papel), a letra de traço único com acentos (`src/letras.js`), um objeto de exemplo (`src/moto.js`) e a cena com a linha do tempo (`src/main.js`), além do renderizador (`render.mjs`). Reaproveite o kit e a letra como estão; troque o objeto, o título, as etapas, a cota e os tempos pelo meu tema. Se não existir, construa do zero seguindo o que está abaixo.

## Antes de desenhar: a ordem sai do objeto

O exemplo que acompanha este prompt mostra uma moto (rodas, quadro, motor, tanque). **Não reaproveite a moto, os nomes das etapas, a cota nem o farol para o meu tema.** Antes de construir, me responda em uma tabela e espere meu ok:

| Papel | Pergunta | No exemplo da moto |
|---|---|---|
| Ordem | Em que ordem quem projeta esse objeto o esboça? | primeiro as duas rodas, depois o quadro, o motor e o tanque |
| Linhas de construção | Que linhas um designer risca antes de desenhar a forma? | chão, linha dos eixos, círculo de cada roda, eixo da direção, caixa do volume |
| A fila | Que parte tem peças repetidas que podem entrar uma a uma? | os tubos do quadro e as aletas do cilindro |
| A peça com cor | Qual peça leva o vermelho, e por que ela? | o tanque: é a última e a mais reconhecível |
| A cota | Que medida, entre que pontos? | 1400 mm entre os eixos |
| O último risco | Que traço pequeno dá vida no fim? | três riscos curtos na frente do farol |

## O visual

- **Papel:** creme claro (`#f2ede2`), com dente (grão fino que faz a tinta leve falhar), manchas largas e suaves, uma mancha de mão e uma marca de borracha. Escurece no máximo 3%, e só na borda. Nada de pauta de caderno uniforme.
- **Grafite:** um cinza escuro (`#34353b`) para tudo: contorno, hachura, letra e linhas de construção (estas com 10 a 30% da força).
- **Um acento só:** vermelho de lápis (`#cf3f25`) no sublinhado do título, nos círculos e números das notas e nos dois tracinhos das pontas da cota. O mesmo vermelho, em aguada mais clara (`#e39478`), pinta **uma** peça. Em mais nada.
- **A luz nunca aparece como luz.** Ela só decide quantas camadas de hachura uma face recebe: face iluminada fica papel puro, meia-luz recebe riscos numa direção, sombra recebe riscos cruzados. A sombra projetada no chão também é hachura, com a borda desfiada.
- **Hachura presa ao objeto**, girando junto com ele, e sempre em risco **reto**: ao longo do tubo, em diagonal na face plana e, nas formas curvas, em três planos (de lado, de cima, de frente). Risco embrulhado na curvatura denuncia o 3D.
- **Contorno em três forças:** o de fora (objeto contra o papel) mais grosso e carregado; o entre peças mais leve; o de dobra mais leve ainda. Onde uma peça passa na frente de outra, fica um vão de papel de uns 4 px.
- **Traço repassado:** linhas de construção que passam das pontas, eixo fraco dentro de cada tubo, arestas das caixas desenhadas como riscos soltos que passam do canto.
- **Letra:** maiúscula de arquiteto, em traço único de uns 4 px, com 50 px de altura no título e nas notas. Cada linha de texto fica entre duas linhas-guia fracas. Título no alto à esquerda, com sublinhado vermelho ondulado sob as duas primeiras palavras.
- **Notas:** numa coluna fixa à direita, empilhadas de baixo para cima na ordem das etapas. Círculo vermelho com o número, o nome ao lado, e uma linha-guia que vai até a peça e termina numa bolinha.
- **Composição:** o objeto fica à esquerda do centro, para a coluna de notas ter papel livre. Linhas de construção desviam do título e da coluna de notas.

## A câmera e o ritmo

- Perspectiva em lente longa (campo de visão de uns 17 graus).
- Um único arco, lento e contínuo: cerca de 30 graus em volta do objeto, do quase perfil até três quartos, subindo de 15 para 22 graus de altura. Acelera e desacelera suave; para a uns 0,3 s do fim.
- O filme abre com a primeira etapa já desenhada e a nota 1 recebendo a linha-guia. Depois: a cota (0,5 s), etapa 2 (1,3 s), etapa 3 (3,2 s), etapa 4 (5,1 s), a aguada (5,9 s), o último risco (6,95 s).
- Dentro de cada etapa: primeiro o contorno (cada peça é varrida de uma ponta à outra em 0,1 a 0,4 s), depois a hachura numa direção, depois a direção cruzada. A nota da etapa é escrita letra a letra (0,065 s por letra) quando a etapa está quase pronta.
- Com a câmera quase parada (começo e fim), o contorno ferve de leve, a 8 trocas por segundo. Em movimento, não.
- Sem corte, sem zoom, sem peça que voa ou quica: tudo entra sendo desenhado.

## A técnica que faz o estilo

1. **Folha de hachura.** Um canvas de 2048 px com riscos de verdade (começo firme, fim que levanta, leve inclinação), em 96 fileiras, que se repete. Os canais vermelho, verde e azul guardam três jogos de riscos que se encaixam um entre o outro: somar um canal adensa a hachura sem mexer nos riscos que já estavam.
2. **Material de tinta.** Um material iluminado comum (para ter luz e sombra projetada reais), com o trecho final do shader trocado: o tom vira camadas de riscos por limiar (0,10 · 0,28 · 0,44 · 0,60 · 0,74 · 0,86), alternando a direção principal e a cruzada. Cada fileira de riscos tem um atraso e um limiar próprios, para a frente da hachura avançar risco a risco e a borda da sombra ficar desfiada.
3. **Contorno.** Uma passada extra grava normal, profundidade e número de cada peça, no dobro da resolução. Um filtro acha onde muda a peça, onde a profundidade salta e onde a superfície dobra, e desenha dois riscos por borda, cada um com o seu tremor.
4. **Riscos soltos.** Fitas com largura constante em pixels, com tremor, pressão variável e ponta que afina, reveladas pelo comprimento. Servem para linhas de construção, raios, molas, cota e para toda a letra.
5. **Letra de traço único.** Cada letra é uma lista de riscos numa caixa de altura 1, escrita na ordem da mão. Acentos e cedilha são riscos por cima da letra-base.
6. **Papel.** Uma passada de tela cheia no fim, que junta papel, tinta, contorno e a camada de letras; a tinta leve falha no dente do papel.
7. **Varredura.** Cada peça tem uma coordenada de 0 a 1 ao longo de si. O contorno e a hachura só aparecem onde o lápis já passou. A mesma regra vale na sombra, para ela crescer junto com a peça.

## Armadilhas que já custaram retrabalho

- **Parece render com filtro.** Hachura que segue o UV de uma forma curva (pneu, tanque) embrulha a curva e entrega o 3D. Use os três planos.
- **Luz sem lógica.** Se o sol ficar atrás do objeto, todas as faces que a câmera vê ficam em sombra e tudo vira hachura. Ponha o sol do lado da câmera, alto: o lado fica papel, a frente fica escura.
- **Cor local demais.** Escurecer muito o material (pneu, couro) apaga a leitura da luz. Deixe o material só um pouco mais escuro.
- **Sombra em degraus e encostando nas notas.** Use sombra suave e desfie a borda por risco. Escolha a direção do sol para a sombra cair para longe da coluna de notas.
- **Hachura em espinha de peixe** em peças lofteadas: a folha de hachura precisa usar o comprimento real medido em volta da seção, não o parâmetro.
- **Linhas-guia cruzadas.** Ordene os pontos de chegada pela altura na tela, na mesma ordem das notas. Termine cada guia com bolinha e abra um vão de papel onde ela cruza o desenho.
- **Texto deitado no chão fica ilegível** em câmera baixa. Deixe a linha de cota no chão e escreva o número em pé.
- **Letra fina parece fonte.** Abaixo de 4 px de traço em 1080p ela perde a cara de lápis.
- **Proporção de brinquedo.** Pneus e canos gordos demais infantilizam o objeto. Confira as medidas reais antes de modelar.
- **Medição enganada por quadros idênticos.** Se o filme termina em quadros exatamente iguais, o filtro de diferença do ffmpeg pode acusar um salto que não existe. Confira decodificando os quadros.

## Como construir

1. **Motor.** Um projeto Node com `three` e `puppeteer-core`. Uma página HTML monta a cena e expõe `window.renderAt(t)`, que desenha o quadro do instante `t` em segundos. Tudo é função pura de `t`, sem relógio e sem estado acumulado, para que qualquer quadro possa ser renderizado fora de ordem.
2. **Render.** Um script abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva as imagens e junta tudo num MP4 com o ffmpeg.
3. **Objeto.** Só formas simples (tubos, toros, caixas, peças torneadas e uma ou duas peças lofteadas), em medidas reais. Cada peça recebe o instante em que o lápis começa nela, a partir dos quatro tempos de etapa.
4. **Conteúdo num lugar só.** Título, etapas, cota e cores ficam no começo do arquivo principal.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Responda a tabela "a ordem sai do objeto" e espere meu ok.
2. Construa a cena e renderize uma imagem parada de cada momento: primeira etapa, cota, cada etapa no meio e pronta, a aguada pela metade e o final.
3. Olhe cada imagem você mesmo e, se puder, peça a um revisor independente para comparar com um desenho a lápis de verdade. Corrija antes de me mostrar.
4. Depois de aprovado, renderize o vídeo e revise-o em folhas de quadros nas passagens entre etapas.
5. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens, texturas de arquivo ou arquivo de fonte.
- Não copie o objeto, o título, os nomes das etapas, a cota nem o último risco do exemplo; são os meus.
- Não use segunda cor de acento, e não pinte mais de uma peça.
- Não ponha mais de cinco notas nem mais de uma cota.
- Não use desfoque de movimento, brilho, vinheta forte, grão de filme nem texto 3D.
- Não ponha marca, emblema ou logotipo de fabricante no objeto.
- Não prometa desenho de ilustrador: é um modelo 3D simples que se lê como rascunho de projeto.
