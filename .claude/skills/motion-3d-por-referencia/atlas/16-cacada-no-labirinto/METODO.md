# Caçada no labirinto: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 15 segundos, 1920×1080, 30 quadros por segundo, sem áudio, num plano só. É uma partida de jogo de labirinto filmada como brinquedo de mesa: o Clawd, mascote do Claude Code, recolhe pontos de luz numa placa de circuito e foge de dois monstrinhos e dois fantasmas. Aos 7,7 s ele pega um núcleo de energia, encara os quatro e sai caçando. No fim a câmera sobe e mostra a placa inteira.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: as formas são primitivas, sólidos de revolução e extrusões, e a textura da placa é desenhada num canvas dentro do próprio código.

## De onde veio

O pedido foi uma imagem do Pinterest (https://br.pinterest.com/pin/946881890426649762/) com os personagens de um jogo de labirinto clássico em 3D, e a instrução de ser "extremamente fiel" a ela, simulando o jogo. A perícia está em `pericia-da-referencia.md`.

**O elenco e o labirinto da imagem não foram copiados**, porque são de um jogo existente. Da imagem veio a fotografia (ambiente azul-noite, piso polido, pontos de luz quente, plástico brilhante, câmera 3/4 próxima com fundo desfocado, paredes baixas) e a composição do momento do encontro. Do gênero veio a história (fugir, pegar o item que vira o jogo, caçar).

A primeira versão aprovada tinha um robozinho marigold e três joaninhas. Depois o Felipe pediu o Clawd no lugar do herói e monstrinhos e fantasmas no lugar das joaninhas. Essa é a versão deste acervo.

## A cena, em números

As medidas estão em unidades da cena; uma célula do labirinto vale 1.

- **Labirinto:** grade de 25 por 13 células, desenhada à mão só com blocos retangulares. As paredes recuam 0,15 da célula, então o corredor tem 1,3 de largura.
- **Paredes:** chips de 0,22 de altura, com cantos arredondados, verniz, placa de topo e terminais de metal nos lados compridos. Os blocos de 1×3 viram componentes de duas pontas, com terminais de metal fosco.
- **Placa:** textura em canvas de 280 px por unidade, com 210 trilhas de cobre em ângulos de 45 graus, uma ilha de solda debaixo de cada ponto e serigrafia (U1, C2…).
- **Pontos de luz:** 308, raio de 0,062, a 0,17 do chão, cada um com uma mancha de luz no piso. O herói recolhe 89 deles no filme.
- **Núcleos de energia:** 3, raio de 0,19 com dois anéis girando. Só um é pego.
- **Clawd:** corpo de 0,78 por 0,52 por 0,42, em escala 1,16. Grade do sprite: 12 "pixels" de largura e 4 de altura. Olhos pretos foscos de 1,3 pixel de largura, a 3,5 pixels do centro. Um braço de 2 pixels de cada lado a meia altura, quatro pernas em dois pares. Cor `rgb(215,119,87)`, tirada da própria instalação do Claude Code.
- **Câmera:** perspectiva, 32 graus de campo de visão. Doze chaves; quatro delas param a câmera.
- **Luz:** um foco quente (`#ffd6a6`) de cima, que segue a ação e vem do lado em que a câmera está; um recorte azul por trás à esquerda; uma luz pontual fraca no centro do herói; o núcleo com luz própria até ser pego.
- **Acabamento:** desfoque de profundidade próprio, bloom de 0,2 só acima de 1,0, 8 subquadros de desfoque de movimento por quadro, vinheta, tom ACES e grão de 1,4%.

## Decisões que definiram o resultado

- **Elenco próprio.** Os personagens da imagem são de um jogo existente; reproduzir o visual deles seria recriar o jogo. O herói virou primeiro um robozinho e depois o Clawd, a pedido do Felipe.
- **O labirinto é uma placa de circuito.** Chips como paredes, trilhas de cobre no chão. Mantém a leitura de labirinto e coloca o filme no mundo do canal.
- **Paredes baixas.** Na referência os personagens ficam muito acima das paredes. Com paredes na altura do corpo, a câmera 3/4 só via cabeças.
- **A câmera muda de lado conforme a história.** À frente dele na abertura, atrás quando ele sobe, à frente no corredor comprido, de perfil no encontro, à frente de todos na caçada. O herói quase nunca fica de costas.
- **O encontro é a imagem da referência.** Aos 8,5 s a câmera para de perfil: o Clawd energizado à direita e os quatro perseguidores em fila à esquerda, como na composição da imagem.
- **Cada perseguidor anda diferente.** O ciclope pula, o violeta ginga, os fantasmas flutuam. Em fila, isso faz os quatro lerem separados mesmo pequenos.
- **Medo sem perder a cor.** Com medo, cada um empalidece só uns 30% e treme. Se virassem todos da mesma cor, a fila viraria uma mancha só.
- **O perseguidor pego gira como pião.** A cambalhota mostrava a barriga escura. No pião, a cor continua à vista até o estouro.
- **A luz-chave acompanha a câmera.** Com o foco fixo de um lado, o rosto do Clawd ficava preto sempre que a câmera passava para o outro lado.
- **O final não para.** O Clawd continua recolhendo pontos no plano geral e o placar continua contando. O caminho percorrido fica escuro, sem pontos: é o desenho da partida.

## Como os personagens são feitos

- **Clawd:** um bloco de cantos levemente arredondados, dois olhos chapados, dois braços com pivô no ombro (sobem no susto, no pulinho e quando ele está energizado) e quatro pernas que sobem e descem alternadas, com a fase tirada da distância percorrida. Energizado, ganha brilho próprio e dois anéis de luz girando em volta.
- **Ciclope verde:** sólido de revolução em forma de gota, um olho grande com pálpebra (que sobe com o medo), chifres, presas, bracinhos para cima e pés achatados. Anda aos pulos, com compressão e esticamento.
- **Violeta de três olhos:** pastilha de cantos redondos, três olhos, espinhos nas costas, boca dentada (que abre com o medo) e um rabinho. Anda gingando.
- **Fantasmas (branco e menta):** sólido de revolução com o rabo dobrado para trás como fumaça, olhos e boca ocos, bracinhos para a frente e brilho interno fraco na cor de cada um. Flutuam.
- **Olhos dos monstrinhos:** brancos, com pupila que segue o Clawd o tempo todo e encolhe com o medo.

## A linha do tempo final

| Janela | O que acontece | Câmera |
|---|---|---|
| 0,0 – 1,8 s | O Clawd vem recolhendo pontos; o ciclope aparece de frente e ele se assusta | à frente dele, parada no começo |
| 1,8 – 4,7 s | Desvia, sobe e corta pelo meio; o violeta chega pela direita | passa para trás dele |
| 4,7 – 7,7 s | Corredor comprido, os quatro em fila; o fantasma menta desce por último | à frente de todos |
| 7,68 s | Pega o núcleo: clarão, onda no chão, faíscas, tremida e pulinho | — |
| 7,9 – 8,9 s | Meia-volta; os quatro freiam, empalidecem e tremem | para de perfil em 8,5 s |
| 8,9 – 12,4 s | A caçada: +100 (9,8 s), +200 (10,65 s), +300 (11,5 s), +400 (12,35 s) | à frente de todos |
| 12,3 – 14,0 s | A câmera sobe até quase de cima | subida |
| 14,0 – 15,0 s | A placa inteira; o Clawd continua recolhendo pontos | parada |

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t, sub)` recalcula a cena inteira para o instante `t`. Não há relógio nem estado acumulado, então qualquer quadro pode ser renderizado sozinho.
- **Caminhos.** Cada personagem tem trechos: pontos da grade com as esquinas arredondadas e chaves de tempo para a posição no caminho, interpoladas por cúbica monotônica. Entre trechos ele para e gira. Velocidade, aceleração e giro saem da curva e alimentam a inclinação, o andar, as freadas e o deitar na curva.
- **Pontos comidos.** O caminho do herói é percorrido uma vez no início e cada ponto guarda o instante em que ele passa. O placar conta a partir disso.
- **Câmera.** Posição, alvo e abertura por chaves (Hermite, com velocidade zero nas chaves de parada), somados à posição do herói suavizada no tempo. No plano final o peso do herói vai a zero.
- **Desfoque de movimento.** Cada quadro soma 8 subquadros dentro de meio quadro, em luz linear, antes do tom e do grão.
- **Placar e pontos das capturas.** HTML por cima do canvas, fotografado junto.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva cada imagem e junta tudo com o ffmpeg (H.264, bt709, faixa de vídeo). No Mac em que foi feito (Apple M5), o vídeo final, com 8 subquadros por quadro, levou poucos minutos.

## A ordem em que foi feito

1. Leitura da imagem de referência no navegador; decisão de levar a fotografia e não o elenco.
2. Labirinto, coreografia e câmera conferidos numa vista de cima, sem pós-processamento.
3. Quadros de teste com a câmera real, uma folha de contato com 12 momentos e correções.
4. Prévia com 1 amostra por quadro, revisão em folhas de 5 quadros por segundo, ajustes no plano final e no fim do caminho do herói.
5. Vídeo final com desfoque de movimento: **primeira versão, com robô e joaninhas.**
6. Troca do elenco a pedido do Felipe: o Clawd e quatro perseguidores (dois monstrinhos, dois fantasmas), com a quarta captura encaixada na coreografia.
7. Quadros de teste, correções de proporção e de luz, vídeo final. **Aprovado.**

## Erros do caminho

- **Tela preta no primeiro render.** O `ShaderPass` do three.js clona os uniformes e descarta a textura do acumulador passada no construtor. Foi preciso atribuí-la de novo depois.
- **Tudo estourado.** O primeiro quadro real saiu lavado: ambiente forte, bloom de 0,42 e pontos grandes. Ambiente, bloom e pontos foram reduzidos até o escuro voltar a mandar.
- **Paredes altas.** Com 0,38 de altura, os personagens sumiam atrás dos chips no corredor. Baixaram para 0,22.
- **A primeira busca pelo mascote falhou.** A busca na web não estava disponível; o desenho e a cor do Clawd foram lidos na própria instalação do Claude Code (o sprite do terminal e a cor `clawd_body`).
- **Clawd fundo demais.** A primeira versão em 3D era quase um cubo, com as pernas escondidas debaixo do corpo. Ficou mais rasa (0,42) e com pernas mais altas.
- **A luz em cima do rosto.** A luz que anda com o herói, na frente dele, fazia uma mancha estourada nos olhos; energizado, estourava quem ele perseguia; no alto, virava reflexo solto num chip do primeiro plano. Foi para o centro dele, baixa e fraca.
- **Rosto no escuro.** Com o foco fixo à direita, o rosto do Clawd ficava escuro quando a câmera estava à esquerda. A luz-chave passou a seguir o lado da câmera.
- **Pontos das capturas fora do quadro.** O +100 saía pelo canto e cobria o placar. A posição na tela foi limitada.
- **Final morto.** Na primeira prévia o herói parava no fim e o plano geral virava foto. Ele passou a seguir andando até o último quadro.

## Medida de movimento

Medido no vídeo final com `pericia-movimento.py`:

| Medida | Este motion | Meta usual do acervo |
|---|---|---|
| Amplitude (pico ÷ mediana) | 1,5× | ≥ 2,8× |
| Tempo em quase-parada | 10% | ≥ 25% |
| Cortes duros | 1 (aos 7,70 s: é o clarão do núcleo, não um corte) | — |

Este motion **fica abaixo das metas** que os outros do acervo usam. É uma perseguição contínua com a câmera sempre seguindo o herói, então o movimento anda num volume alto e parecido do começo ao fim; os únicos respiros são o encontro (8,5 s) e o plano final (14 a 15 s). Foi aprovado assim. Não há comparação com a referência: ela é uma imagem parada.

## Limites conhecidos

- O ritmo é contínuo (ver a medida acima). Para mais contraste, os caminhos são pausas curtas antes do núcleo e um congelamento rápido em cada captura.
- O Clawd em 3D é uma leitura do sprite de terminal, com os olhos um pouco maiores para lerem de longe. Não foi comparado com uma arte oficial em alta resolução.
- O Clawd é o mascote do Claude Code, marca da Anthropic. Antes de usar em material pago ou anúncio, confira se o uso é permitido.
- Os pontos de luz e o fundo são muito escuros e podem virar faixas depois da compressão de uma plataforma de vídeo; o grão fino existe para segurar isso, mas não foi testado depois do upload.
- Não existe versão vertical nem áudio.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
```

- `cards` gera as nove imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/cacada-no-labirinto.mp4`. Com `--sub=1` sai uma prévia rápida, sem desfoque de movimento.
- `node render.mjs at 8.5 10.25` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- `node render.mjs topo 0 4 8` gera a vista de cima, sem pós-processamento, para conferir a coreografia.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
- Para trocar o elenco, edite as seções "o herói" e "os perseguidores" e a lista `FOES` em `codigo/src/main.js`; para o labirinto, a lista `MAP`.
