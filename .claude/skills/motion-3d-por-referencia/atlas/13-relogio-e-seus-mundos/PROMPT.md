Quero um motion graphic 3D no estilo "produto que explode no seu mundo", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens: toda geometria e toda textura são geradas no próprio código.

## Meu tema

- **O produto:** [O QUE É, EM UMA LINHA. Exemplo: "um fone de ouvido sem fio com estojo".]
- **A peça que chega por último:** [A PARTE DO PRODUTO QUE ENTRA VOANDO E ENCAIXA. Exemplo: "a tampa do estojo". Se eu não souber, proponha.]
- **As versões:** [TRÊS VERSÕES, CADA UMA COM UMA COR E UM PÚBLICO OU USO. Exemplo: "preto para o escritório, coral para a academia, azul para viagem".]
- **O mundo de cada versão:** [O TEMA DOS OBJETOS DE CADA UMA, OU "proponha". Exemplo: "escritório: caneca, notebook, post-it, clipe, planta".]
- **A leitura de cada versão:** [UM NÚMERO OU FRASE CURTA QUE O PRODUTO MOSTRARIA, PARA O CARTÃO DE VIDRO. Exemplo: "Bateria 28 h", "Treino 42 min", "Ruído −35 dB".]
- **Formato:** 16:9, 1920×1080, 30 quadros por segundo, 12 segundos (3 ciclos de 4 s), sem áudio, em laço.
- **Idioma dos textos em tela:** português do Brasil, com vírgula decimal.

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem a cena completa neste estilo (`src/main.js` com a linha do tempo e o render, `src/relogio.js` com o produto, `src/objetos.js` com os mundos, `src/cenario.js` com o fundo) e o renderizador (`render.mjs`). Reaproveite a estrutura. Se não existir, construa do zero seguindo o que está abaixo.

## Antes de desenhar: o mundo sai da versão

O exemplo que acompanha este prompt mostra um relógio em verde (trilha), amarelo (música) e violeta (sono). **Não reaproveite esses mundos nem esses objetos para o meu tema.** Cada mundo existe porque responde à pergunta "que coisas cercam quem escolhe esta versão?".

Antes de construir qualquer coisa, me responda em uma tabela, e espere meu ok:

| Papel | Pergunta | No exemplo do relógio |
|---|---|---|
| Herói | Qual é o produto e qual é a pose em que ele fica mais bonito? | relógio quase de frente, 13° virado |
| Peça que chega | Que parte entra voando e encaixa? | o aro com o cristal |
| Versões | Quais são as três cores e o que muda de personalidade em cada uma? | mostrador analógico, digital e ilustrado |
| Mundo | Que dez a quinze objetos cercam quem usa cada versão? | trilha, música, sono |
| Herói do mundo | Qual objeto é o maior do conjunto (2 a 3 vezes os outros)? | mochila, caixa de som, despertador |
| Cartão | Que leitura do produto aparece no cartão de vidro? | "Trilha 4,2 km" |
| Corda | Que fio do próprio mundo costura os objetos? | corda de escalada, cabo com plugue, cordão de luzes |
| Fundo | Qual é o tom pastel de cada versão? | menta, manteiga, lavanda |

## O visual

Foto de estúdio macia: só o herói está em foco.

- **Produto:** metal polido de verdade (ver "metal" abaixo), com detalhe suficiente para aguentar o plano fechado: peças separadas, uma textura no material principal (trama, costura, furos) e um detalhe na cor de acento.
- **Mundo de objetos:** plástico fosco de brinquedo, montado com formas simples. Uma cor dominante por versão, um segundo tom quente, branco, metal e vidro escuro. Mais miudezas (parafusos, pastilhas escuras, bolinhas, pinos) espalhadas nos vãos.
- **Hierarquia:** um objeto herói com 2 a 3 vezes o tamanho dos outros, um segundo médio, o resto pequeno. Objetos se sobrepõem. Alguns ficam lá atrás levemente desfocados e um fica na frente desfocado. Tudo do mesmo tamanho, com o mesmo espaço entre eles e tudo nítido vira cartela de adesivos.
- **Cartão de vidro:** retângulo escuro de cantos bem redondos, com um rótulo pequeno, um número grande e um gráfico simples. Nada pode encostar no texto dele.
- **Fundo:** uma parede pastel no tom da versão, com faixas diagonais de luz, e um aparador com objetos de casa, visto em 3/4, com os objetos agrupados nos cantos de baixo. Mais claro e bem menos saturado que o herói, e bem desfocado.
- **Luz:** uma luz principal forte de cima e da esquerda, pouco preenchimento, um recorte por trás, sombras suaves e oclusão de ambiente (a sombra macia nas frestas). Sem isso, tudo fica chapado e lê como ícone.
- **Metal:** quem ilumina o metal é o ambiente que ele reflete. Monte um ambiente de estúdio de cinza médio a escuro, com painéis grandes de luz e panos pretos. Num ambiente todo claro, aço vira plástico cinza.
- **Bolas rente à lente:** duas esferas na cor da versão passam bem desfocadas em primeiro plano durante a explosão.
- **Sem texto por cima da cena.** Todo texto mora num objeto (mostrador, cartão, etiqueta).

## A câmera e o ritmo

Três ciclos iguais de 4 s, sem corte. Dentro de cada ciclo:

| Janela | O que acontece |
|---|---|
| 0,0 – 0,6 s | o produto entra pequeno, de lado, girando rápido e freando (de −155° a −34°), crescendo de 30% a 86% |
| 0,1 – 0,62 s | a última peça chega voando da esquerda, de frente para a câmera, e encaixa; o produto dá um pulso de 5% no encaixe |
| 0,7 – 1,6 s | o produto vira quase de frente e a câmera aproxima; o fundo passa da cor anterior para a cor atual |
| 1,6 – 1,9 s | pausa: produto grande, quase parado |
| 1,9 – 2,1 s | giro rápido acelerando, o produto encolhe até 10% e some no borrão |
| 2,04 – 2,6 s | os objetos explodem do centro como mola (passam 12% do ponto e assentam), cada um desfazendo um giro; a câmera recua de uma vez |
| 2,6 – 3,5 s | flutuam quase parados: derivam 3% para fora e o conjunto gira 5° por segundo |
| 3,56 – 4,0 s | respiro de 5% e tudo gira e se recolhe, acelerando, para o ponto de onde sai o próximo produto |

O filme alterna rajada e silêncio: dois picos por ciclo (explosão e recolhida com entrada) e uma parada funda no meio da flutuação. Não "anime" a flutuação: ela precisa ser quase imóvel para a explosão socar.

## Armadilhas que já custaram retrabalho

- **Borrão de movimento falso.** Faça desfoque de movimento de verdade: cada quadro é a média de vários subquadros espalhados em meio quadro de tempo. Nos trechos rápidos, 12 subquadros viram hachura (cópias separadas em linha); use 44, e 96 enquanto a peça voa.
- **Material aditivo vira disco preto.** O aditivo padrão do three.js soma o canal alfa também. Se você compõe camadas com alfa, um vidro "só de reflexo" sozinho no ar fica opaco. Use mistura personalizada que soma só a cor.
- **Brilho no vidro lavando o mostrador.** O reflexo do cristal é para sugerir vidro, não para cobrir o texto. Comece com menos de 10% de opacidade.
- **O verso do cartão.** Na recolhida o conjunto gira e o cartão mostra as costas: ponha a interface dos dois lados, senão vira uma placa cinza no meio do quadro.
- **Salto na emenda.** Os objetos têm que se recolher no ponto exato em que o próximo produto entra, e a câmera tem que terminar o ciclo onde começa o seguinte.
- **Miudezas em cima do texto.** Reserve uma zona proibida em volta do cartão e de cada objeto, proporcional ao tamanho.
- **Texto em anel.** Texto numa faixa circular sai espelhado ou cortado na emenda da textura. Confira num quadro ampliado.
- **Datas e siglas.** Confira o dia da semana da data que aparece, e evite sigla que leia como outra palavra ("SEX" virou "SEXTA").
- **Fundo competindo.** Fundo na mesma saturação do herói, com objetos enfileirados de frente e atrás do conjunto, disputa atenção.
- **Sombra do ponteiro.** Peças muito próximas de uma superfície não projetam sombra visível no mapa de sombras: desenhe a sombra na textura.

## Como construir

1. **Motor.** Um projeto Node com `three` e `puppeteer-core`. Uma página HTML monta a cena e expõe `window.renderAt(t)`, que desenha o quadro do instante `t` em segundos. Tudo na cena é função pura de `t`: nada de relógio, nada de estado acumulado, para que qualquer quadro possa ser renderizado fora de ordem. O tempo dá a volta (módulo 12 s), então o desfoque do primeiro quadro já enxerga o fim do filme.
2. **Camadas.** Renderize em camadas separadas e junte no fim: fundo (bem desfocado), objetos de trás (pouco desfocados), meio nítido com oclusão de ambiente, objetos da frente (pouco desfocados) e bolas rente à lente (muito desfocadas). É mais robusto que um desfoque por profundidade, que vaza.
3. **Acumulação.** Para cada quadro, some os subquadros num alvo de ponto flutuante e só então aplique a curva de saída, com um grão bem fino para o degradê pastel não virar faixas na compressão.
4. **Linha do tempo.** Um `u` de 0 a 4 dentro do ciclo dirige tudo. Cada objeto guarda a posição de repouso, um eixo de giro, um atraso de até 0,07 s e fases próprias.
5. **Render.** Um script abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, fotografa e junta num MP4 com o ffmpeg.
6. **Fontes.** Arquivo de fonte local, carregado antes de desenhar qualquer textura.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Me mostre a tabela do mundo e espere meu ok.
2. Construa o produto e uma versão do mundo, e renderize uma imagem parada do produto de frente e outra do mundo flutuando.
3. Olhe cada imagem você mesmo, ampliada, e corrija o que estiver errado (texto ilegível, espelhado ou cortado, objeto que não se reconhece, coisa encostando no cartão, metal sem contraste) antes de me mostrar.
4. Faça as outras duas versões e me entregue dez imagens: entrada, encaixe, frente de cada cor, explosão, mundo de cada cor e recolhida. Para cada uma, a janela de tempo e como ela emenda na próxima. Inclua a lista de todo texto que aparece em tela. Espere minha aprovação.
5. Depois de aprovado, renderize o vídeo e revise-o em folhas de quadros, olhando em especial os dois lados de cada emenda.
6. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não use logotipo nem o desenho exato de um produto de marca: o produto é genérico e as versões são minhas.
- Não copie os mundos, os objetos nem os textos do exemplo do relógio; fica só o método.
- Não escreva texto por cima da cena.
- Não invente números de desempenho do meu produto: use os que eu passar.
