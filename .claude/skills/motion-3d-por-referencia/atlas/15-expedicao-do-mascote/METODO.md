# A expedição do mascote: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 46,2 segundos, 1600×1600, 30 quadros por segundo, sem áudio. Um lápis desenha numa folha a expedição do mascote do Claude Code (dirigível, ilha flutuante com observatório, moinho, casinha, ponte e acampamento). A câmera abre, uma onda de cor transforma o desenho em pintura, e então a câmera sai do eixo: a pintura é um mundo com profundidade, visitado em seis planos de trilho até voltar ao quadro de frente.

Tudo é código three.js. Não há modelo 3D, imagem nem textura de arquivo: a ilustração é desenhada em canvas pelo próprio código, e essa mesma arte vira a textura das peças do mundo.

## De onde veio

É a versão 3D do nosso motion 2D validado `06-mascote-aventura` (em `Claude Video 2.0/motions-validados/`), que por sua vez estudou um [post de @mickeyxfriedman no X](https://x.com/mickeyxfriedman/status/2115932308138287552). O Felipe pediu a mesma peça com profundidade 3D em three.js, "exatamente tudo igual", e depois pediu ângulos novos de câmera com deslizamento de trilho.

Do motion 2D veio tudo o que se vê: os desenhos, a paleta, a ordem e o tempo do lápis, a onda de cor. O arquivo `cena.js` é o mesmo, com uma linha a mais (cada brilho guarda o nome do elemento que o criou). O estudo está em `pericia-da-referencia.md`.

## O mecanismo do nosso filme

O desenho e o mundo são a mesma coisa vista de dois jeitos. De frente, o mundo 3D coincide com a pintura; por isso a onda de cor pode trocar o papel pelo mundo sem ninguém perceber a troca. O volume só aparece no instante em que a câmera se move.

## A cena, em números

A ilustração original tem 1600×1600. Cada ponto (x, y) dela vira (x − 800, 800 − y, z); o z é a profundidade e cresce na direção da câmera.

- **Câmera de frente:** a 4500 de distância, campo de visão de 20,2 graus. É a que enxerga exatamente a ilustração.
- **Pré-distorção:** antes de ir para a cena, x e y de cada vértice são multiplicados por (4500 − z) ÷ 4500. O que está no fundo cresce e o que está na frente encolhe, na medida certa para a câmera de frente não notar.
- **Profundidade dos conjuntos:** dirigível em 300 (linha de centro); ilhota do acampamento em 60; frente da casinha em 64; frente da torre em 45; frente do moinho em 10; centro da ilha grande em −30.
- **Fundo:** pássaros em −1600; nuvens de −2900 a −7200; morros em −10500 e −13000; lua em −20000; estrelas em −30000.
- **Floresta:** seis fileiras, em z = −2869, −1395, −216, 622, 1243 e 1745, com a copa a 655 abaixo do centro do quadro e o chão a 872. As quatro primeiras são as fileiras da pintura; as duas últimas ficam abaixo do quadro original. No total, 2.459 árvores e 52.978 gomos.
- **Peças:** 51 peças padrão (arte na frente, volume atrás), mais os corpos redondos: balão (elipsoide de 320 × 142 × 142), casco (73 seções), duas ilhas (48 anéis cada), cúpula, capacete e lunetas.
- **Textura:** 4 pixels por unidade da ilustração; 5 a 6 nas peças do dirigível e da torre; 8 no herói e nos mascotes pequenos.
- **Contorno:** `#2a1830`, com 1,75 px na escala de frente, engrossando conforme a câmera chega perto (até 13 px).
- **Luz do mundo:** só uma direção, de cima à direita e de frente (0,42 · 0,55 · 0,72). Face iluminada fica na cor; face em sombra é multiplicada por (0,64 · 0,53 · 0,76).
- **Lápis:** 440 de comprimento e 8 de raio, deitado a 17 graus da folha. O tamanho é dividido pela raiz de 2,2 × a aproximação, para não ficar gigante de perto nem sumir de longe.
- **Câmera da folha:** inclinada de 17 a 27 graus, com giro de lado de até 14 graus; abertura de desfoque 78; vinheta de 12%. Tudo isso zera enquanto a câmera abre.
- **Finalização:** render em 3× (4800×4800), redução, desfoque de profundidade com 110 amostras e raio máximo de 15 px.

## A linha do tempo

| Tempo | O que acontece | Câmera |
|---|---|---|
| 0 a 19,6 s | O lápis desenha, na ordem e no tempo do motion 2D: herói, casco, cabine, balão, corda, torre, ilha, casinha, ponte e acampamento. | Segue o lápis, inclinada, recuando de 4,6× para 1,7× |
| 19,6 a 20,5 s | Últimos traços (âncora e pássaros); o lápis sai. | Abre para o desenho inteiro e fica reta |
| 20,9 a 22,25 s | A onda de cor, da esquerda para a direita. | Parada, de frente |
| 22,25 a 26,4 s | Revelação: a pintura começa a deslizar e mostra o volume. | De (0 · 0 · 4500) até (−1660 · −150 · 3860), acelerando |
| 26,4 a 29,9 s | Do alto: a ilha vista de cima, com o gramado, os telhados e a mata fechada. | De (−1560 · 1130 · 2480) até (−560 · 1190 · 2680), lente de 26 graus |
| 29,9 a 33,4 s | Sob a ilha: cristais, raízes, trepadeiras e a cachoeira. | De (−1090 · −448 · 950) até (−640 · −474 · 1060), lente de 30 graus |
| 33,4 a 36,9 s | O acampamento: barraca, fogueira e o mascote do marshmallow. | De (1090 · −124 · 1140) até (730 · −142 · 1215), lente de 24 graus |
| 36,9 a 40,6 s | O herói na proa do dirigível, de luneta. | De (−420 · 146 · 1270) até (−20 · 170 · 1225), lente de 25 graus |
| 40,6 a 45,0 s | A volta: do alto à direita até o quadro de frente. | De (2050 · 690 · 3900) até (0 · 0 · 4500), desacelerando |
| 45,0 a 46,2 s | O quadro original, parado, com o mundo vivo. | Parada |

Os cinco cortes entre os planos do mundo são secos. Os quatro planos do meio andam em linha reta e velocidade constante, como câmera num trilho.

A vida do mundo começa aos 22,05 s e arranca devagar: hélice (8,5 radianos por segundo), pás do moinho (0,5), âncora balançando, bandeiras, cordas de bandeirinhas, fumaça das duas chaminés, fogueira, pássaros, nuvens, vaga-lumes e estrelas piscando.

## Decisões que definiram o resultado

- **Pré-distorcer em vez de usar câmera ortográfica.** Com câmera de perspectiva comum, uma caixa a 600 px do centro mostraria a lateral e sairia até 10 px do lugar do desenho. A pré-distorção por vértice deixa o quadro de frente equivalente a uma vista ortográfica, e ainda assim a câmera é de perspectiva de verdade para os planos de trilho.
- **A arte original como textura.** Em vez de remodelar tábua por tábua, cada elemento é pintado num canvas pelo mesmo código do motion 2D e aplicado na frente da peça. O volume vem do contorno do preenchimento, que ganha espessura para trás.
- **Contorno em dois sistemas.** As linhas de dentro e as bordas das peças planas vêm da própria arte (com o tremor de mão). O contorno das laterais e dos corpos redondos vem de um filtro sobre a identidade de cada peça. Os dois usam a mesma cor e a mesma espessura.
- **O traço em geometria.** Com a câmera a 4,6×, uma textura do desenho precisaria de mais de 8000 px para ficar nítida. Cada linha virou uma fita com a largura calculada no shader, e o desenho inteiro é uma malha só, desenhada na ordem das camadas.
- **A mesma floresta da pintura.** As árvores saem da mesma semente do motion 2D, e cada fileira foi para a profundidade em que a copa fica a 655 abaixo do centro. Cada gomo existe na frente e atrás da copa, e é pintado em relação a quem olha, para ter sempre a meia-lua clara do desenho.
- **Árvores escondidas.** As árvores de preenchimento ficam abaixo da reta que sai da câmera de frente e passa rente à copa da fileira à frente delas.
- **Dirigível bem à frente.** Com ele em 300 e a torre em 45, a corda de bandeirinhas atravessa 255 de profundidade e é a primeira coisa que denuncia o 3D na revelação.
- **Cortes secos no mundo.** O motion 2D é um plano só. Aqui a fase do lápis e a revelação continuam em plano único; os planos de trilho entram por corte, que é como se monta material de slider.
- **Vida depois da cor.** No motion 2D o final é uma imagem parada. Como a câmera agora passeia, o mundo ganhou movimento próprio, sempre pequeno.

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula as duas cenas para o instante `t`. Qualquer quadro pode ser renderizado sozinho.
- **O lápis** lê a posição do motor 2D (`penRaw`) e a câmera 2D (`camAt`); a câmera 3D fica à distância 4500 ÷ aproximação, deslocada pela inclinação.
- **O foco** da fase do lápis é a média de sete posições do lápis em volta do instante, para não pular quando ele troca de traço.
- **A onda** é uma passada de tela cheia que mistura a imagem da folha com a do mundo, com a mesma fórmula de borda do motion 2D.
- **Os planos** são uma lista: posição inicial e final, alvo, lente, ponto de foco e abertura.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva cada imagem e junta tudo com o ffmpeg. Num Mac com Apple M5, os 1.386 quadros em 3× levaram cerca de 4 minutos.

## A ordem em que foi feito

1. Leitura do motion 2D quadro a quadro e do código dele.
2. O traço em geometria e o desenho completo conferido contra o original.
3. O mundo de frente, comparado lado a lado com a pintura.
4. Quatro planos de trilho; depois o plano do alto, pedido como ângulo novo.
5. Prévia em baixa resolução para conferir movimento, onda e cortes.
6. Dezesseis imagens paradas em alta, render final e conferência em folhas de quadros.

## Erros do caminho

- **Lápis escondido.** Ao passar por cima de uma área preenchida (o balão, a parede da casinha), o lápis sumia em parte: os pedaços de "papel" são transparentes e eram desenhados depois dele. Só apareceu na conferência em resolução cheia, depois de um render completo. O lápis passou para a fila dos transparentes, com ordem maior.
- **Floresta em tapete.** A primeira floresta era uma grade de 4 mil árvores iluminadas por uma luz. De frente virou um tapete de bolinhas, sem as fileiras nem os troncos da pintura.
- **Buracos vistos de cima.** Com a floresta em fileiras, o primeiro teste de câmera alta mostrou faixas de chão entre elas e a borda do chão contra os morros. Entraram as árvores baixas e a base dos morros passou a escurecer para o azul da mata.
- **Lápis em pé.** A 36 graus ele apontava para a câmera inclinada, ficava curto e com uma sombra mais comprida que ele.
- **Boca da luneta.** O aro escuro aparecia como uma tampa preta. Virou um aro curto com uma lente clara.
- **Fumaça de pérolas.** Esferas com sombra arroxeada pareciam um colar. Viraram discos claros com um toque de luz, como na pintura.
- **Cachoeira listrada.** O brilho que desce pela água estava forte demais e desenhava faixas.
- **Estabilizador comprido.** A barra dos estabilizadores de lado saía 150 para cada lado do balão e parecia uma prancha. Ficou com 112.
- **Volta em chicote.** O último plano partia de mais longe com freada forte; o corte entrava num movimento rápido demais.

## Resultado da medição de movimento

Medido com `pericia-movimento.py` no arquivo de qualidade máxima. O motion 2D foi medido no arquivo `mascote-aventura-compartilhar.mp4`.

| Medida | Este motion | Motion 2D |
|---|---|---|
| Amplitude (pico ÷ mediana) | 4,0× | 2,9× |
| Tempo em quase-parada | 10% | 3% |
| Picos | 9 | 10 |
| Cortes secos | 5 | 0 |

- Os nove picos estão na fase do lápis (8,5 a 9 s, 15,5 a 17 s e 19 a 20 s, quando a câmera abre), como no motion 2D.
- Os cinco cortes são os dos planos de trilho: 26,4 · 29,9 · 33,4 · 36,9 · 40,6 s.
- Na fase do lápis, a diferença média entre quadros vizinhos é 7,2 aqui e 7,1 no motion 2D.
- A ferramenta pede 25% de quase-parada; nenhum dos dois chega lá. No motion 2D o final parado conta como movimento por ruído de compressão (está explicado na perícia dele); aqui o mundo se mexe de propósito.

## Limites conhecidos

- A animação foi feita sem aprovação prévia das imagens paradas, e não houve crítica adversarial. A revisão foi por folhas de quadros e pelas medidas acima.
- O quadro de frente fica muito próximo da pintura, não idêntico: capacete, lunetas, fumaça e barril foram refeitos como sólidos, e o contorno dos corpos redondos vem do filtro.
- Grades, escadas, andaime, leme, âncora, pássaros e raízes são planos. Passam bem nos ângulos usados (até uns 40 graus); de perfil ficariam finos.
- As faces de lado das paredes são cor lisa, sem tábuas nem pedras. As costas das peças repetem a arte da frente.
- A pré-distorção afunila cada peça alguns por cento na direção da câmera de frente. Não se nota nos planos usados.
- A câmera inclinada muda um pouco o enquadramento da fase do lápis em relação ao motion 2D.
- O vídeo desta pasta é a versão leve (36 MB). A de qualidade máxima (85 MB) sai de `node render.mjs video`.
- Não existe versão vertical nem horizontal.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
SS=3 node render.mjs video
```

- `cards` gera as dezesseis imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/mascote-aventura-3d.mp4`. Sem `SS=3` o render sai em 2×, mais rápido.
- `node render.mjs at 16.4 28.2` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- `node render.mjs cam teste 30 -900 1100 2300 -200 -60 0 26 8` testa uma câmera: nome, instante, posição (x y z), alvo (x y z), lente e abertura.
- `node render.mjs video 20 27` renderiza só um trecho.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.

Onde mexer: os desenhos e a paleta estão em `src/cena.js`; as profundidades e as peças em `src/mundo.js`; os planos de câmera na lista `SHOTS` de `src/main.js`.
