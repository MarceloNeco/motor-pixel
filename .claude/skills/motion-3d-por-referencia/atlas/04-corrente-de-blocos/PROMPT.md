Quero um motion graphic 3D no estilo "gráfico que vira objeto", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens: toda geometria e toda textura são geradas no próprio código.

## Meu tema

- **A série:** [DE 3 A 6 ITENS, CADA UM COM RÓTULO E VALOR, NA ORDEM. Exemplo: "faturamento da minha loja: 2022 = R$ 180 mil, 2023 = R$ 310 mil, 2024 = R$ 520 mil, 2025 = R$ 740 mil".]
- **De onde vêm os números:** [A FONTE. Se eu não tiver os números, pesquise, diga de onde tirou e confira em mais de uma fonte antes de construir.]
- **O item que importa:** [QUAL ITEM LEVA A COR DE ACENTO. Exemplo: "o último ano".]
- **A conclusão:** [UMA FRASE CURTA EM DUAS LINHAS, OU "proponha a partir dos números". Exemplo: "Em três anos, / quatro vezes mais."]
- **Formato:** 16:9, 1920×1080, 30 quadros por segundo, entre 10 e 14 segundos, sem áudio.
- **Idioma dos textos em tela:** português do Brasil, com vírgula decimal.

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem uma cena completa neste estilo (`src/main.js`) e o renderizador (`render.mjs`). Reaproveite a estrutura. Se não existir, construa do zero seguindo o que está abaixo.

## Antes de desenhar: o mundo sai do meu tema

Este é o passo que mais importa e o que mais dá errado. O exemplo que acompanha este prompt mostra o preço do Bitcoin como pilhas de moedas sobre blocos de pedra ligados por corrente, dentro de um cofre. **Não reaproveite esse mundo para o meu tema.** Cofre, corrente e moeda estão ali porque o tema era Bitcoin (dinheiro guardado, blockchain). O mundo é a metáfora do tema, não decoração.

Antes de construir qualquer coisa, me responda em uma tabela, e espere meu ok:

| Papel | Pergunta | No exemplo do Bitcoin |
|---|---|---|
| Mundo | Em que lugar físico o meu tema mora? | cofre de banco |
| Unidade | Que objeto dá para contar e empilhar, e quanto vale cada um? | moeda = US$ 2 mil |
| Base | Onde cada item da série se apoia, e o que mostra que os itens são uma sequência? | um bloco de pedra por ano, ligados por corrente |
| Rótulo | Onde o nome do item fica escrito, fisicamente? | ano em relevo na face do bloco |
| Relação | O que aparece entre dois vizinhos, e em que objeto? | variação do ano numa etiqueta pendurada na corrente |
| Elenco | O que fica ao fundo dizendo onde estamos? | parede de caixas de cofre |
| Acento | Qual é a única cor de destaque e em que item? | laranja no último ano |

Escolha o valor de cada unidade para que a pilha mais alta tenha entre 30 e 50 unidades e fique com 2 a 3 vezes a largura da base. Mais que isso, a pilha vira um palito e sai do quadro.

## O visual

Fotografia de produto num estúdio escuro: o gráfico é a joia.

- **Fundo:** penumbra quente, quase preta, com o elenco do mundo ao fundo em baixo contraste e fora de foco nos planos fechados.
- **Chão:** uma superfície escura e polida que reflete as pilhas. O texto nunca aparece no reflexo: texto espelhado de cabeça para baixo vira ruído.
- **Luz:** um único foco quente vindo de cima, da frente e de um lado, mais uma luz fraca lavando o fundo para ele existir em tela de celular. Nada de luz forte vindo de trás: ela bate no chão polido, volta para a câmera e clareia tudo.
- **Metal:** se a unidade for metálica, quem a ilumina é o ambiente que ela reflete, não as luzes. Monte um ambiente de estúdio escuro com um painel grande de luz do lado do foco e uma faixa fina atrás, do lado oposto. Com um ambiente uniforme, o metal fica chapado.
- **Texto:** uma cor clara só para todo texto (valores, rótulos, título). Valores em 3D, com pouca extrusão e a lateral mais escura que a frente.
- **Acento:** uma cor, num item só, mais a segunda linha do título final. Sem verde e vermelho de bolsa: queda aparece na altura da pilha e no sinal de menos.
- **Contagem:** a cada 5 unidades, uma com acabamento diferente (borda lisa e mais clara), para a pilha funcionar como régua.
- **Coerência:** toda unidade em cena vale. Nenhuma unidade solta de enfeite.
- **Profundidade de campo:** o valor da vez fica nítido e o fundo desfocado. O objeto nítido não pode vazar no fundo desfocado (sem halo em volta dos números).
- **Título:** em 2D por cima da cena, no canto superior esquerdo: um traço curto, um rótulo em caixa alta espaçada e uma frase em serifa em duas linhas. A abertura diz quanto vale cada unidade; o fecho é a conclusão, com a segunda linha no acento. Abaixo dele, uma nota pequena com a fonte dos dados.

## A câmera e o ritmo

Um plano-sequência, sem corte.

1. **Abertura parada (1 s).** O primeiro item já está pronto. Câmera baixa, rente ao chão, quase imóvel.
2. **O segundo item se constrói com a câmera parada.** As unidades caem do alto, uma por vez mas rápido, cada queda em 0,3 s acelerando como gravidade, inclinadas no ar e retas ao pousar. O valor conta junto.
3. **Pausa curta** (0,4 s) com o valor assentado.
4. **O soco.** Escolha um item (o maior) para ser o pico do filme: despejo mais rápido e a câmera andando e subindo ao mesmo tempo.
5. **Pausa** (0,6 s) segurando nesse valor.
6. **Os itens restantes** se constroem com a câmera parada num quadro que mostre dois deles lado a lado.
7. **Recuo** até uma vista 3/4 de frente e de um lado, rápido no começo e lento no fim.
8. **As relações entre vizinhos** aparecem uma a uma, com a câmera quase assentada.
9. **Conclusão escrita e quadro parado** por 2 segundos.

O ritmo alterna rajada e silêncio. O que não faz parte da ação fica parado. Sem zoom de lente, tremor, partículas ou brilho.

## Armadilhas que já custaram retrabalho

- **Copiar o mundo do exemplo.** Ver a seção "o mundo sai do meu tema".
- **O valor em cima da pilha é atravessado pelas unidades que caem.** Durante a contagem ele fica à frente da pilha, as unidades caem por trás, e ele sobe para o topo quando a última pousa.
- **A vírgula afunda.** A vírgula desce abaixo da linha de base: levante o número pelo menos 30% da altura dele acima do topo da pilha.
- **Bases encostadas viram um bloco só.** Deixe um vão de pelo menos 60% da largura da base entre os itens, senão a leitura de sequência some na vista aberta.
- **O rótulo sai do quadro nos planos fechados.** Enquadre cada plano com o valor em cima e o rótulo da base embaixo.
- **Tudo no mesmo volume.** Se cada item se constrói com a câmera andando, o filme fica uniforme e morno. É para isso que servem as pausas e a câmera parada do passo 6.
- **Fundo escuro some no celular e vira faixas depois da compressão.** Confira o quadro final em tamanho pequeno e, se aparecerem faixas, ponha um grão bem fino no fundo.

## Como construir

1. **Motor.** Um projeto Node com `three` e `puppeteer-core`. Uma página HTML monta a cena e expõe `window.renderAt(t)`, que desenha o quadro do instante `t` em segundos. Tudo na cena é função pura de `t`: nada de relógio, nada de estado acumulado entre quadros, para que qualquer quadro possa ser renderizado fora de ordem.
2. **Render.** Um script abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, fotografa a cena junto com o título em HTML por cima, e junta tudo num MP4 com o ffmpeg.
3. **Pilhas.** Uma malha instanciada por pilha. Cada unidade tem o instante do pouso: antes dele está caindo, depois está assentada.
4. **Câmera.** Posição, alvo e ponto de foco por chaves, com interpolação suave; nas chaves de pausa a velocidade é zero.
5. **Fontes.** Arquivos de fonte locais, carregados antes de desenhar qualquer textura. Números 3D a partir de uma fonte convertida para o formato do three.js.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Me mostre a tabela do mundo e espere meu ok.
2. Construa a cena e renderize uma imagem parada de cada momento: a abertura, cada item se construindo, o recuo, as relações e a conclusão.
3. Olhe cada imagem você mesmo e corrija o que estiver errado (texto cortado ou ilegível, valor fora de foco, coisas se atravessando, fundo claro ou escuro demais) antes de me mostrar.
4. Me entregue as imagens numa página só, com as imagens embutidas no próprio arquivo, e para cada uma: a janela de tempo, o que se move primeiro e como ela emenda na próxima. Inclua a tabela dos dados com a fonte e a lista de todo texto que aparece em tela. Espere minha aprovação.
5. Depois de aprovado, anime, renderize o vídeo e revise-o em folhas de quadros (4 por segundo) antes de entregar.
6. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não invente números. Se não tiver a fonte, pergunte ou pesquise e diga de onde veio.
- Não use logotipo de marca, de corretora ou de empresa em tela.
- Não copie o tema, os textos nem o mundo do exemplo do Bitcoin; fica só o método.
- Não dê conselho de investimento nem prometa resultado: o motion mostra o que os números dizem.
