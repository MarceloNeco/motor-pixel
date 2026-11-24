# Planta que vira casa: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 15 segundos, 1920×1080, 24 quadros por segundo, sem áudio. A planta baixa de uma casa térrea se desenha numa folha de papel, a câmera inclina, a planta sobe como aramado e a casa é construída em três etapas em cima da própria planta: fundação, paredes e telhado.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: as formas são caixas e perfis extrudados, o traço é linha gerada das arestas e as texturas (folha, mesa, telhas, letreiros) são desenhadas em canvas. O único arquivo externo é a fonte Inter, usada nos textos.

## De onde veio

É a nossa versão do estilo **Blueprint Build**, o #05 do [3D Style Atlas da Futurepedia](https://www.futurepedia.io/resources/3d-style-atlas/view). O clipe de lá mostra uma mesa de trabalho com uma pessoa sentada; o Felipe pediu a construção de uma casa e uma folha de outra cor.

Do Atlas veio o visual e a ordem (planta, aramado, sólido). Da campanha "Airbnb It" ([case](https://www.ege.work/airbnb-houseboat)), a mesma referência do motion 01, veio a montagem por peças com câmera parada e alternância de pausa e estalo. O estudo das duas está em `pericia-da-referencia.md`.

## O mecanismo do nosso filme

A planta é o roteiro da obra. Ela se desenha, levanta do papel, e cada uma das três notas numeradas acende quando a sua parte é construída.

## A cena, em números

As medidas estão em metros.

- **Casa:** 8,00 por 6,00, paredes de 0,20, pé-direito de 2,70. Radier de 0,22 de espessura, com 0,35 de sobra em volta. Cumeeira 1,50 acima das paredes. Beiral de 0,50 na frente e no fundo e de 0,24 nas laterais. Telhado de 0,12 de espessura.
- **Aberturas:** cinco janelas e a porta da frente nas paredes de fora; duas divisórias de 0,15, com dois vãos de porta.
- **Folha:** 33,6 por 23,3. Na vista de cima a câmera enxerga 24 por 13,5; a sobra fica atrás e à esquerda. Moldura a 11,6 e 6,35 do centro, carimbo no canto de baixo à direita.
- **Traço:** forte de 3,1 px, fino de 1,5 px, oculto de 1,25 px com tracejado de 17 cm por 14 cm.
- **Câmera:** perspectiva, campo de visão de 30 graus. Começa a 25,2 de altura, olhando reta para baixo. Termina a 32 graus de altura, girada 31 graus para a direita, a 23,5 de distância.
- **Sol:** vem da frente e da esquerda, cor `#fff3df`. A câmera fica à direita, então a face da frente recebe luz, a lateral fica em sombra e a sombra da casa cai na folha.
- **Cores:** folha `#f6f5f4`, traço `#0075de`, texto `#02093a`, destaque `#f5b82e`. Casa: parede `#a9cdf5`, telhado `#2a3a78`, porta `#f5b82e`, esquadrias e barrado brancos.

## A linha do tempo

| Tempo | O que acontece |
|---|---|
| 0,3 a 2,55 s | A planta se desenha: paredes, depois esquadrias e portas, depois a projeção tracejada do telhado, depois as cotas. As notas brotam em 1,0, 1,4 e 1,8 s, de baixo para cima. |
| 2,55 a 3,3 s | Parada. |
| 3,3 a 5,6 s | A câmera inclina. De 3,85 a 5,45 s a planta sobe como aramado e as notas voam para o lado da casa. |
| 5,45 a 6,3 s | As linhas-guia das notas e a cota de altura se desenham. |
| 6,9 s | Etapa 1: o radier sobe, o degrau e a calçada brotam. |
| 8,0 s | Etapa 2: paredes e barrado sobem, depois as esquadrias brotam uma a uma. |
| 10,6 s | Etapa 3: os oitões sobem, as tesouras brotam em fila, as duas águas desenrolam da cumeeira, depois a cumeeira e a chaminé. |
| 13,0 a 15 s | Casa pronta, parada. |

## Decisões que definiram o resultado

- **Três versões de cada peça.** O sólido; um "fantasma" que só escreve profundidade; e as arestas, desenhadas duas vezes. A passada com teste de profundidade normal dá o traço cheio; a passada com teste invertido dá o tracejado das ocultas.
- **A ordem de desenho.** Sólidos primeiro, depois a planta, depois os fantasmas, depois as arestas. Com os fantasmas antes, o telhado ainda não construído escondia as paredes de dentro e a planta do chão. Por isso o fantasma vai na fila das transparências, com ordem maior que a da planta.
- **A planta sai dos mesmos dados que a casa.** Paredes e aberturas estão em duas tabelas. O contorno da planta é a borda da união dos retângulos das paredes, menos os vãos das portas, encadeada em voltas para a "caneta" desenhar sem pular.
- **Notas empilhadas como a casa.** A nota 1 fica embaixo e a 3 em cima. Na ordem de leitura normal (1 em cima), as três teriam de se cruzar no voo para chegar à altura certa.
- **Câmera à direita.** Na primeira tentativa a câmera ficava à esquerda: o carimbo aparecia cortado atrás das notas. À direita, as notas flutuam sobre a parte vazia da folha.
- **Folha maior que o quadro.** Com a folha do tamanho da vista de cima, a mesa de madeira ocupava um terço da imagem inclinada. A folha cresceu para trás e para a esquerda e a madeira ficou só nos cantos.
- **Construção em três etapas.** O clipe do Atlas preenche o objeto de uma vez. Aqui cada nota tem a sua etapa, e a bolinha fica amarela enquanto ela acontece.
- **Tesouras antes das telhas.** O telhado ganhou quatro tesouras de madeira que aparecem antes da cobertura. Somem no final, mas é o trecho que mais parece obra.
- **A cor da folha.** Foram testadas quatro: papel, verde, grafite e terracota. Ficou o papel claro com traço azul, que segue a identidade AiVerso.
- **A cor da casa.** A primeira paleta (parede creme, telhado salmão) sumia no papel. Foram testadas mais quatro; o Felipe escolheu a azul-clara. Junto veio mais contraste na luz, telhas com tom variado e o barrado no pé da parede.

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula a cena inteira para o instante `t`. Qualquer quadro pode ser renderizado sozinho.
- **Traço que se desenha.** Cada linha é picada em pedaços de uns 10 cm, na ordem da caneta. O filme mostra os primeiros n pedaços.
- **Subida do aramado.** Um grupo com todas as peças tem a escala vertical indo de zero a um. As linhas só aparecem depois que o grupo tem alguns centímetros de altura.
- **Peças.** Cada uma tem a etapa, o atraso dentro dela e o jeito de entrar: subir do chão, brotar com um pequeno excesso, desenrolar ou esticar.
- **Notas.** Planos sempre de frente para a câmera. Vão da posição na folha a um ponto fixo do quadro, calculado a partir da câmera final, e o tamanho é corrigido pela distância.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva cada imagem e junta tudo com o ffmpeg. No Mac em que foi feito, os 360 quadros levaram cerca de 47 segundos.

## A ordem em que foi feito

1. Leitura do clipe do Atlas quadro a quadro e escolha da referência de método.
2. Cena construída e sete imagens paradas, uma de cada momento.
3. Correção da composição inclinada (lado da câmera, tamanho da folha, mesa, posição das cotas).
4. Comparação das quatro cores de folha.
5. Quadros avulsos das passagens, vídeo completo e medição do movimento.
6. Duas rodadas de paleta da casa, com comparação lado a lado, até a escolha final.

## Erros do caminho

- **Letreiros sumindo.** Os nomes dos cômodos desapareciam quando o aramado subia, porque eram desenhados depois dos fantasmas. Passaram a ter a mesma ordem da planta.
- **Cards na pasta errada.** O script de render gravava os cards de todos os temas na mesma pasta, um por cima do outro.
- **Cota de altura em cima do canto.** No canto da frente à direita ela brigava com a cota de profundidade. Foi para o canto da esquerda.
- **Beiral lateral parecendo uma aba solta.** Com 0,40 de beiral, a água do fundo aparecia como uma lingueta ao lado da cumeeira. Baixou para 0,24.
- **Bolinha acinzentada.** A volta do amarelo para o azul levava meio segundo e passava por um tom sujo. Agora leva cerca de um quinto de segundo.
- **Falso alarme na medição.** Uma conferência com filtro do ffmpeg acusou saltos no trecho parado do final. A diferença calculada quadro a quadro mostrou que o vídeo estava limpo.

## Resultado da medição de movimento

| Medida | Este motion |
|---|---|
| Amplitude (pico ÷ mediana) | 17,8× |
| Tempo em quase-parada | 71% |
| Picos | 3 |
| Cortes secos | 0 |

Os três picos estão dentro da inclinação da câmera, que move o quadro inteiro. As etapas de construção são mudanças locais e aparecem como estalos pequenos.

## Limites conhecidos

- A animação foi feita sem aprovação prévia dos cards, e a crítica adversarial dos cards não foi feita.
- O clipe do Atlas não passou pela ferramenta de medição, então não há comparação de movimento com ele.
- A inclinação da câmera concentra quase todo o movimento do filme.
- A casa não tem móveis nem piso por dentro; depois do telhado, o interior não aparece.
- As folhas das portas internas existem na planta, mas não no 3D.
- Não existe versão vertical.
- Os temas verde, grafite e terracota e as outras paletas de casa estão no código, mas só o papel com a casa azul-clara foi revisado em vídeo até o fim.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
```

- `cards` gera as sete imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/planta-casa.mp4`.
- `node render.mjs at 4.2 8.65` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- `TEMA=verde node render.mjs video` troca a cor da folha (`papel`, `verde`, `grafite`, `terracota`).
- `CASA=amarela node render.mjs video` troca a paleta da casa (`azul`, `amarela`, `colonial`, `branca`, `creme`).
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
