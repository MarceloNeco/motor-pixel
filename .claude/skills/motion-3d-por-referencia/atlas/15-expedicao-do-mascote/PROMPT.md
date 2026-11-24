Quero um motion graphic no estilo "desenho que vira mundo", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens de arquivo. O filme tem três atos: um lápis desenha uma ilustração inteira numa folha de papel; uma onda de cor transforma o desenho em pintura; a câmera sai do eixo e a pintura se revela um mundo com profundidade, que eu visito em planos de trilho (slider) antes de voltar ao quadro de frente.

## Meu tema

- **A cena, em uma frase:** [O QUE A ILUSTRAÇÃO MOSTRA. Exemplo: "um farol numa pedra no meio do mar, com um barco de pesca chegando e uma vila de palafitas ao lado".]
- **O personagem que a câmera visita de perto:** [UM. Exemplo: "o faroleiro, na sacada do farol, de lanterna na mão".]
- **Os conjuntos, de 3 a 5:** [CADA LUGAR DA CENA. Exemplo: "o farol", "o barco", "a vila de palafitas", "o cais".]
- **O que amarra os conjuntos:** [CORDAS, PONTES, FIOS, ESCADAS. Exemplo: "um varal de lanternas do farol até a vila; uma passarela de tábuas até o cais".]
- **A hora do dia e a paleta:** [Exemplo: "pôr do sol, do azul profundo ao laranja; madeira avermelhada; luzes amarelas acesas".]
- **O que se mexe depois que a cor chega:** [DE 4 A 6 COISAS PEQUENAS. Exemplo: "a luz do farol girando, bandeiras, fumaça da chaminé, gaivotas, lanternas piscando".]
- **Formato:** quadrado, 1600×1600, 30 quadros por segundo, cerca de 45 segundos, sem áudio.

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida. Ela tem a ilustração de exemplo (`src/cena.js`: os elementos, a paleta e a pintura), o motor do traço (`src/tinta.js`: tremor da mão, ordem e tempo do lápis, câmera que segue o lápis), o kit do mundo 3D (`src/base.js`: o espaço pré-distorcido, o material de dois tons e as peças de montagem), o mundo de exemplo (`src/mundo.js`), a folha com o lápis (`src/papel.js`), as câmeras e a finalização (`src/main.js`) e o renderizador (`render.mjs`). Reaproveite o motor do traço, o kit e a finalização como estão; troque a ilustração, as profundidades e os planos pelo meu tema. Se não existir, construa do zero seguindo o que está abaixo.

## Antes de construir: o mundo sai da ilustração

O exemplo que acompanha este prompt mostra um dirigível, uma ilha flutuante com observatório e um acampamento. **Não reaproveite esses desenhos, o mascote nem a paleta para o meu tema.** Antes de construir, me responda em uma tabela e espere meu ok:

| Papel | Pergunta | No exemplo |
|---|---|---|
| Ordem do lápis | Por onde o desenho começa e por onde termina? | começa no herói, passa pelo dirigível, a torre, a ilha, a casinha, a ponte e termina nos pássaros |
| Profundidade | Qual conjunto fica mais perto da câmera e qual fica mais longe? | dirigível na frente (300), ilhota (60), torre e casinha (45 a 64), ilha (−30) |
| O que atravessa a profundidade | Que corda, ponte ou fio liga um conjunto de trás a um da frente? | a corda de bandeirinhas da proa até a torre; a ponte da ilha até a ilhota |
| Corpos redondos | Que peças precisam de volume curvo de verdade? | o balão, o casco, a cúpula, o capacete, as duas ilhas |
| Fundo em camadas | Que camadas existem atrás de tudo? | seis fileiras de árvores, nuvens em várias distâncias, dois morros, lua e estrelas |
| O que acende | Onde ficam as luzes? | janelas, vigias do casco, lâmpadas, fogueira, cristais, vaga-lumes |
| Os planos | Que lugares a câmera visita, e de que ângulo? | de lado, do alto, por baixo da ilha, o acampamento, o herói na proa, a volta |

## O visual

- **Papel:** `#faf9f5`, com grão quase invisível. Traço preto (`#181716`), de largura quase constante, pontas afinadas e um tremor leve de mão. Linhas de borda um pouco mais grossas que as de detalhe.
- **Lápis:** um bastão preto comprido de verdade, quase deitado sobre a folha (uns 17 graus), com ponta cinza e uma sombra suave que se afasta dele conforme sobe.
- **Pintura:** cor chapada com contorno escuro arroxeado (`#2a1830`) em tudo que foi desenhado. Cada preenchimento leva um degradê discreto: luz quente em cima à direita, sombra roxa embaixo à esquerda.
- **O que a pintura acrescenta e o traço não tem:** o céu em degradê, as nuvens em faixa, a lua, as estrelas, os morros, a floresta, as trepadeiras, os brilhos das luzes e os vaga-lumes.
- **Volume no mesmo desenho:** as faces de lado de cada peça usam a cor da peça em dois tons (iluminada ou em sombra arroxeada), com o mesmo contorno escuro. Nada de reflexo, brilho especular ou sombra projetada.
- **Floresta e nuvens sem contorno:** copas em gomos, cada gomo com uma meia-lua clara em cima e a parte escura embaixo, pintado sempre em relação a quem olha.

## A câmera e o ritmo

- **Ato 1, o desenho (uns 20 s):** a câmera segue o lápis de perto e recua devagar, de 4,6× até 1,7×. Fica inclinada de 17 a 27 graus sobre a folha, com um leve giro de lado, e o foco acompanha a ponta do lápis: o que está longe da ponta desfoca. No fim ela abre para o desenho inteiro e fica reta, de frente.
- **Ato 2, a onda (1,35 s):** com a câmera parada, a cor entra da esquerda para a direita. Borda inclinada (o alto chega antes) e ondulada, uma faixa lilás na frente, a cor a 55% logo atrás e depois cheia.
- **Ato 3, o mundo (uns 24 s):** seis planos de trilho. O primeiro nasce do quadro parado e desliza para o lado, acelerando. Os do meio são cortes secos para dentro de um movimento já em andamento, em linha reta e velocidade constante, com lente de 24 a 30 graus e fundo desfocado. O último volta ao quadro de frente desacelerando, e o filme termina parado nele por pouco mais de um segundo.
- Planos do exemplo: revelação de lado, do alto, por baixo da ilha, o acampamento, o herói, a volta. Cada um dura de 3,5 a 4,4 s.

## A técnica que faz o estilo

1. **A ilustração é código.** Cada elemento é uma lista de operações na ordem em que a mão faria: preencher uma forma, riscar uma linha, pintar um detalhe que só existe na versão colorida. A mesma geometria serve ao traço e à pintura.
2. **O traço é geometria, não imagem.** Cada linha vira uma fita com a largura calculada ponto a ponto (pressão, tremor, pontas afinadas). Cada fita sabe quando começa e quando termina, e o filme mostra só o comprimento já desenhado. Cada preenchimento vira um pedaço de "papel" que cobre o que está atrás quando a sua linha é riscada.
3. **Pré-distorção de perspectiva.** Cada ponto (x, y) da ilustração vira (x, y, z), com o z livre. Antes de ir para a cena, x e y são multiplicados por (D − z) ÷ D, sendo D a distância da câmera de frente. Resultado: de frente a câmera vê exatamente a ilustração, sem nenhuma pista de volume; o 3D só aparece quando ela sai do eixo. É isso que deixa a onda de cor cair no lugar certo.
4. **A peça padrão: arte na frente, volume atrás.** A arte original do elemento vira textura num plano; atrás dele, o contorno do preenchimento ganha espessura. Paredes, plataformas, personagens e caixotes saem assim.
5. **Corpos redondos com a arte projetada.** Balão, casco, cúpula e ilhas são sólidos de verdade que recebem a arte projetada de frente, sem a linha de contorno de fora (ela vem do passo 6) e com a cor de base esticada alguns pixels além da borda.
6. **Contorno por identidade.** O render grava, além da cor, a normal e um número para cada peça com volume. Um filtro desenha a linha escura onde uma peça encontra algo mais ao fundo e onde duas faces da mesma peça fazem quina. A espessura acompanha a aproximação da câmera.
7. **Fundo em camadas.** Cada fileira de árvores fica numa profundidade, calculada para cair de frente no lugar exato do desenho. Entre as fileiras entram árvores mais baixas, sempre abaixo da linha de visão da câmera de frente: de frente não aparecem, de cima fecham a mata.
8. **Céu por direção do olhar.** O degradê é função da direção, não da tela: de frente é o céu da pintura, e ele continua certo quando a câmera gira.
9. **Brilhos por cima.** Cada luz é um disco somado depois do contorno, que some inteiro quando o seu centro fica escondido atrás de alguma coisa.
10. **Finalização.** Render em 3× a resolução, redução, e desfoque de profundidade com a distância de foco escolhida por plano.

## Armadilhas que já custaram retrabalho

- **O lápis some debaixo do desenho.** Os pedaços de "papel" são transparentes e o renderizador desenha tudo que é transparente depois do que é opaco. O lápis precisa entrar na mesma fila, com ordem maior.
- **Floresta em tapete.** Árvores espalhadas em grade viram um tapete de bolinhas e não batem com a pintura. Use as mesmas árvores do desenho, fileira por fileira.
- **Fileiras com buraco quando vistas de cima.** Sem as árvores baixas entre as fileiras, a câmera alta mostra faixas de chão.
- **Lápis em pé.** Com 36 graus ele aponta para a câmera, encurta e joga uma sombra comprida. Deite para uns 17.
- **Contorno esticado em corpo redondo.** Se a arte projetada levar a linha de fora, ela vira uma faixa escura no alto do balão assim que a câmera sobe.
- **Peça fina vista de lado.** Grades, escadas, cordas e correntes são planos. Passam bem até uns 40 graus; além disso, repita o plano nas laterais (a mesma arte virada de lado).
- **Último plano em chicote.** Voltar de longe com freada forte faz o corte entrar num movimento rápido demais. Encurte o caminho e use uma curva mais suave.
- **Brilho cortado pela parede.** Brilho testado pixel a pixel é fatiado pela superfície onde está encostado. Teste só o centro.
- **Efeito demais na água e na fumaça.** Faixas de brilho fortes na cachoeira e bolinhas sombreadas na fumaça brigam com a pintura chapada. Use pouco.

## Como construir

1. **Motor.** Um projeto Node com `three` e `puppeteer-core`. Uma página HTML monta as duas cenas (a folha e o mundo) e expõe `window.renderAt(t)`, que desenha o quadro do instante `t` em segundos. Tudo é função pura de `t`, para que qualquer quadro possa ser renderizado fora de ordem.
2. **Render.** Um script abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva as imagens e junta tudo num MP4 com o ffmpeg.
3. **Primeiro a ilustração 2D.** Faça a ilustração inteira em canvas, com o traço e a pintura, e só passe para o 3D quando ela estiver aprovada.
4. **Depois o mundo de frente.** Monte o mundo e compare o quadro de frente com a pintura, lado a lado, até baterem.
5. **Por último os planos.** Uma lista com posição inicial, posição final, alvo, lente, foco e abertura de cada plano.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Responda a tabela "o mundo sai da ilustração" e espere meu ok.
2. Entregue a ilustração 2D: o desenho completo a traço e a pintura final.
3. Monte o mundo e me mostre o quadro de frente ao lado da pintura, mais uma imagem parada de cada plano.
4. Depois de aprovado, renderize o vídeo e revise-o em folhas de quadros: a fase do lápis inteira, a onda e cada corte.
5. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não copie os desenhos, o mascote nem a paleta do exemplo; são os meus.
- Não mude o traço entre o desenho e a pintura: a pintura usa as mesmas linhas, só troca a cor.
- Não mexa a câmera durante a onda de cor.
- Não use sombra projetada, reflexo nem iluminação realista no mundo pintado.
- Não ponha texto na tela, a não ser que eu peça.
- Não prometa quadro de frente idêntico pixel a pixel: ele fica muito próximo, mas as peças redondas e o contorno delas são refeitos em 3D.
