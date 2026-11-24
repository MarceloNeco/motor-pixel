# Perícia da referência: Pencil Sketch (#25 do 3D Style Atlas)

*Feita em 16/11/2026. Fonte: [3D Style Atlas da Futurepedia](https://www.futurepedia.io/resources/3d-style-atlas/view), estilo #25. O clipe não fica guardado aqui, só o link e o que foi medido.*

## Ficha

8,0 s · 1280×720 · 30 quadros por segundo · tem faixa de áudio (som de lápis) · nenhum corte.

## Camada 1: estrutura

**O mecanismo, em uma frase:** o desenho se faz sozinho num caderno, na ordem em que a coisa é construída, e cada parte ganha uma nota numerada.

O tema do clipe é "como uma casa sobe": fundação, estrutura, paredes, telhado.

| Janela | O que acontece | O que o olho segue |
|---|---|---|
| 0,0 a 1,3 s | A laje já está desenhada. A nota 1 é escrita letra a letra. A linha de cota se desenha e o número aparece (por volta de 0,6 a 1,0 s). | a nota sendo escrita |
| 1,35 a 3,2 s | Os montantes sobem um a um, em fila (um a cada 0,03 s). A nota 2 entra por volta de 2,3 s. | a fila de montantes |
| 3,25 a 5,0 s | As paredes são hachuradas por uma "mão" que varre a face; depois entram janelas e porta. Nota 3 por volta de 4,2 s. | a frente da hachura |
| 5,1 a 6,9 s | Caibros em losango, depois o telhado recebe uma aguada vermelha em faixas e hachura por cima. Nota 4 por volta de 6,2 s. Chaminé. | a aguada vermelha |
| 6,9 a 8,0 s | Último risco: a fumaça da chaminé. Quadro quase parado. | a fumaça |

**Como fecha:** sem lockup. O desenho fica pronto, um último risco pequeno dá vida (fumaça) e a câmera desacelera até parar.

**Notas:** ficam numa coluna fixa à direita, empilhadas de baixo para cima na mesma ordem das partes (1 embaixo, 4 em cima). O círculo com o número aparece antes; a palavra é escrita depois. A linha-guia sai da nota e acompanha a parte enquanto a vista gira.

## Camada 2: design

| Bloco | O que a referência faz |
|---|---|
| Paleta | Papel creme (`#f2ede0`), grafite (`#33343a`), um vermelho de lápis (`#cf472b`) e o mesmo vermelho em aguada mais clara. Um acento só. |
| Onde o vermelho entra | Sublinhado do título, círculos e números das notas, tracinhos das pontas da cota, e a aguada de **uma** parte (o telhado). Em mais nada. |
| Herói | Um objeto só, à esquerda do centro, para a coluna de notas ter papel livre. |
| Traço | Contornos que passam do canto, linhas levemente tremidas, duas forças de lápis (escuro para contorno e letra, claro para hachura e construção). |
| Sombra | A luz nunca aparece como luz. Ela só decide quantas camadas de hachura uma face recebe: face iluminada fica papel puro, sombra recebe hachura cruzada. Sombra projetada no chão também é hachura. |
| Hachura | Presa ao objeto (gira junto com ele), uma direção por face, segunda direção cruzada nas partes escuras. |
| Linhas de construção | Caixa-fantasma do volume final desde o primeiro quadro, com cruzes nos vértices; malha de piso em perspectiva bem fraca. |
| Letra | Maiúsculas de traço único, de arquiteto, escritas letra a letra. Título no alto à esquerda com sublinhado vermelho ondulado. |
| Papel | Dente (grão que quebra as linhas claras), pautas horizontais fracas, uma mancha de mão, uma marca de borracha, bordas um pouco mais escuras. |
| Render | Sem desfoque de movimento, brilho, grão de filme ou vinheta. Tudo nítido. |

**Movimento permitido:** traço que se desenha; peça que cresce do ponto de apoio; hachura que varre; letra que se escreve; leve fervura do traço em quadro parado.

**Movimento proibido:** corte, zoom brusco, peça que voa ou quica, fade de opacidade em bloco, texto 3D, partículas.

**Câmera:** um arco único, lento e contínuo, em lente longa: cerca de 35 graus, de quase frontal a três quartos, subindo e recuando um pouco enquanto o desenho cresce.

## Camada 3: movimento

Medido com `pericia-movimento.py` (arquivo `movimento.json`).

| Medida | Referência |
|---|---|
| Cortes secos | 0 |
| Mediana de energia | 0,54 |
| Pico | 1,03 (em 6,0 s, a aguada do telhado) |
| Amplitude (pico ÷ mediana) | 1,9× |
| Tempo em quase-parada | 6% |
| Picos | 5 (2,5 · 4,0 · 4,5 · 6,0 · 6,5 s) |

Leitura: é um filme de volume constante. A câmera nunca para e sempre há algo sendo desenhado; os picos são as etapas (montantes, paredes, telhado). O soco é a aguada vermelha.

### Metas para o nosso filme

- Amplitude de 1,3× ou mais.
- 3 picos ou mais, um por etapa, com o maior na aguada vermelha.
- Nenhum corte.
- Quase-parada: a ferramenta pede 25%, mas a referência mede 6%. A meta honesta aqui é ficar perto da referência (câmera sempre andando) e não inventar pausas.

## O que levamos e o que não levamos

**Levamos (método):** o desenho que se faz sozinho na ordem de montagem; hachura decidida pela luz e presa ao objeto; notas numeradas numa coluna fixa com linha-guia; um acento vermelho numa parte só; o arco lento de câmera; o papel.

**Não levamos (conteúdo):** a casa, o título, os nomes das etapas, a cota de 8500, a fumaça da chaminé, e o código da Futurepedia. O nosso é escrito do zero.
