# Adesivos no setup: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 30 segundos, 1920×1080, 30 quadros por segundo, sem áudio, com 12 cortes secos. Uma caixa de papelão chega num estúdio azul, é coberta de adesivos em português, treme e estoura aberta. De dentro dela saem um headset, um notebook e um teclado, e cada um ganha os próprios adesivos e uma frase.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: os objetos são caixas, perfis torneados e chapas extrudadas; os 15 adesivos e todas as texturas (papelão, fita, couro, tela do notebook, letras das teclas) são desenhados em canvas. Os únicos arquivos de fora são cinco fontes de licença livre.

## De onde veio

O Felipe mandou o template [Stamp On Intro](https://motionarray.com/motion-graphics-templates/stamp-on-intro-3484441/), de Replay Lab, e pediu um motion "nos mesmos moldes", com todos os adesivos em português, o mesmo sistema visual, objetos diferentes saindo da caixa e 30 segundos de duração. Depois pediu que fosse tudo em 3D com three.js.

Da referência vieram o estúdio azul, o texto creme em itálico pesado, o adesivo que aparece seco, a gramática de título, macro e frase, o corte seco e a palavra gigante na troca de cena. O estudo completo está em `pericia-da-referencia.md`.

## O mecanismo do nosso filme

Uma caixa chega, é coberta de adesivos e estoura aberta; cada equipamento que sai dela ganha os próprios adesivos e uma frase.

Na referência a caixa é só o primeiro objeto, e ela fecha. Aqui ela é o fio do filme, e abre.

## A cena, em números

Uma unidade vale 10 cm.

- **Caixa:** 4,4 × 2,7 × 3,6, papelão de 0,05. Quatro abas com pivô na dobra: as maiores têm 1,79 de fundo e as menores, 1,55. Fita de 0,6 de largura no topo, com duas caudas de 1,02 descendo as laterais.
- **Headset:** conchas ovais com raio de 0,53 e face plana de raio 0,43, a 0,85 do centro. Arco de raio 1,08, almofadas, garfo, haste de metal e microfone na concha esquerda.
- **Notebook:** 3,1 × 2,15, base de 0,085 e tampa de 0,06, cantos de raio 0,14. A tampa gira num pivô na borda de trás.
- **Teclado:** 3,13 × 1,45 × 0,22, com 62 teclas em passo de 0,19, no padrão ABNT2 (tem Ç). Moldura de 0,3 em cima, onde vão os adesivos, e um botão giratório.
- **Adesivos:** 15 artes, 25 carimbos (12 na caixa, 4 no headset, 6 no notebook, 3 no teclado). Cada um é um plano a 0,35 mm da face.
- **Câmera:** perspectiva. Nos planos abertos, campo de visão de 26 a 28 graus, a 11,5 do objeto. Nos macros, de 17 a 24 graus, a uma distância de 2,9 a 6,7.
- **Luz:** principal `#fff1dc` com intensidade 1,9, alta, à esquerda e à frente, com mapa de sombra de 4096. Recorte `#cfe0ff` com 0,55. Ambiente de estúdio neutro com quatro painéis, intensidade 1,0.
- **Cores:** fundo de `#0c439a` a `#1554a9` com faixa `#2d8cc9` embaixo (na cena da caixa, a versão clara, de `#1a54a8` a `#2f8bc9`); texto `#f1f6cc`; papelão `#d2b287`; fita `#6f86e4`; headset `#ff5a34`; notebook `#d9dce2`; teclado `#efe6d3`.
- **Texto:** Archivo 900 itálico, largura 112%. Título grande de 250 px, frases de 124 a 156 px, palavra gigante de 620 px.

## A linha do tempo

| Tempo | O que acontece |
|---|---|
| 0,0 a 2,3 s | A caixa cai em 0,40 s, quica duas vezes e assenta. Título por linha aos 0,66 e 0,94 s. Duas etiquetas de envio carimbam aos 1,42 e 1,78 s. |
| 2,3 a 4,3 s | Caixa flutuando, girando 19 graus por segundo. Seis carimbos de 2,50 a 3,80 s. |
| 4,3 a 6,2 s | Macro da quina. Quatro carimbos aos 4,58, 4,98, 5,36 e 5,72 s. |
| 6,2 a 8,2 s | A caixa treme a partir dos 6,55 s. Fita arrancada de 7,00 a 7,22 s, abas estouram de 7,22 a 7,50 s, o headset sobe de 7,30 a 7,98 s. A palavra OUÇA cruza por trás de 7,20 a 8,34 s. |
| 8,2 a 10,0 s | O headset chega de baixo e segue girando. Título na frente dele aos 8,32, 8,58 e 8,84 s. |
| 10,0 a 12,4 s | Macro da concha. Quatro carimbos aos 10,30, 10,75, 11,20 e 11,65 s. |
| 12,4 a 15,0 s | Headset à esquerda, frase à direita aos 12,62 e 12,88 s. A frase sai aos 14,30 e 14,38 s, o headset sai girando de 14,38 a 14,95 s. CRIE cruza de 14,30 a 15,14 s. |
| 15,0 a 16,8 s | O notebook sobe abrindo a tampa. Título na frente da tela aos 15,14, 15,40 e 15,66 s. |
| 16,8 a 19,4 s | Macro da tampa fechada. Seis carimbos de 17,00 a 18,75 s. |
| 19,4 a 22,0 s | A tampa abre de 19,52 a 20,25 s mostrando os adesivos; o notebook gira até mostrar a tela. Frase aos 19,92, 20,14 e 20,36 s, sai de 21,34 a 21,46 s. TECLE cruza de 21,22 a 22,14 s. |
| 22,0 a 24,0 s | O teclado cai girando. Título atrás dele aos 22,15 e 22,42 s. Onda de teclas a partir dos 22,9 s. |
| 24,0 a 26,0 s | Macro das teclas, que digitam sozinhas. Três carimbos na moldura aos 24,25, 24,65 e 25,05 s. |
| 26,0 a 30,0 s | Os quatro objetos estalam no lugar um a um. Chamada final aos 26,40, 26,66 e 26,92 s. Dos 27 aos 30 s, quase parado. |

## Decisões que definiram o resultado

- **Seguir o sistema visual da referência à risca.** A skill de método pede uma cor de assinatura diferente da referência. Aqui o Felipe pediu o contrário, o resultado mais parecido possível, e o pedido dele prevaleceu: o azul e o creme foram amostrados dos quadros. A diferença ficou no conteúdo e na estrutura.
- **A caixa abre em vez de fechar.** É o que transforma oito cenas soltas em uma história de desempacotar.
- **Uma face plana por objeto.** A concha do headset tem um disco plano, a tampa do notebook e a moldura do teclado também. Adesivo em plano com textura só funciona em face plana.
- **Texto ora atrás, ora na frente.** O título fica atrás da caixa e do teclado, e na frente do headset e do notebook. A regra é o título inteiro sempre legível.
- **Uma frase lateral por objeto.** A referência usa duas, com 2 s cada. Em 30 s não cabe: a segunda frase do headset ficava menos de 1 s em tela e foi cortada antes da aprovação.
- **Palavra gigante por trás do objeto.** Na referência ela passa na frente. Por trás, a ação continua visível e o objeto ganha profundidade.
- **O objeto reage ao carimbo.** Cada adesivo dá um tranco de 3% de escala, e a caixa gira de 4 a 6 graus a cada carimbo. Na referência o objeto não reage.
- **Três palavras gigantes, não quatro.** A troca para o quadro final é corte seco. Veja em "Erros do caminho".

## Como a animação funciona

- A página expõe `window.renderAt(t)`. Cada quadro é função pura do instante `t`.
- `SHOTS` é a lista dos 13 planos: início, fim e uma função que posiciona objetos e câmera. A troca de plano é o corte.
- `stick(dono, âncora, arte, u, v, largura, giro, instante)` registra um carimbo. O adesivo fica invisível antes do instante e depois faz a escala de 142% a 95,5% em 90 ms, assentando em 100% aos 200 ms.
- `block` registra um bloco de linhas com a hora de entrada e de saída de cada linha. `wipe` registra uma palavra gigante, cheia até o corte e só contorno depois.
- O quadro é desenhado em cinco passadas: fundo, sombra de chão, texto de trás, objetos, texto da frente.
- Nos macros, a câmera é posicionada no espaço da âncora da face (`aim`), não em coordenadas do mundo.
- Texto e adesivos usam o instante-base do quadro, para entrar secos. Objetos, câmera e palavra gigante usam o instante do sub-quadro, para borrar.

## Como o render funciona

`render.mjs` sobe um servidor local, abre a página no Chrome sem janela e chama a página quadro a quadro.

- A cena é desenhada em 3840×2160 e reduzida para 1920×1080.
- Em seis janelas de movimento rápido, cada quadro é a média de 16 sub-quadros dentro de meio quadro (obturador de 180 graus), sempre para a frente, para nunca atravessar um corte.
- Os quadros saem em JPEG e o ffmpeg monta o MP4, convertendo a cor para BT.709 de faixa limitada.
- O render completo levou cerca de 2 minutos e meio num Mac com chip M5.

## A ordem em que foi feito

1. Perícia da referência: grade de quadros, cores amostradas, medição de movimento e leitura quadro a quadro da entrada do texto, do carimbo e da palavra gigante.
2. Folha com os 15 adesivos.
3. Objetos, luz e os 13 momentos-chave como imagens paradas. Quatro rodadas de ajuste de enquadramento e legibilidade.
4. Página de cards com tempos, mapa de cortes, tokens, proibições e riscos. Aprovação do Felipe.
5. Rascunho do filme inteiro, sem superamostragem e sem rastro, e medição de movimento. Foram seis rascunhos e três renders completos até o filme passar.
6. Render final, conferência das passagens rápidas em folhas de quadros e medição no arquivo final.
7. Correção da cor do MP4 e novo render.

## Erros do caminho

- **Ambiente azul.** O primeiro ambiente de luz era azul como o fundo: o lado em sombra da caixa saía cinza e as etiquetas brancas, azuladas. Virou neutro, com azul só vindo de baixo.
- **Grade na textura do papelão.** As manchas largas não repetiam nas bordas da textura e marcavam uma grade na face. Cada mancha passou a ser desenhada nove vezes, deslocada.
- **Fita sem vinco.** O verniz por cima escondia o relevo. Sem verniz e com rugosidade de 0,2, os vincos apareceram.
- **Notebook fechado atrás do título.** Parecia um cartão em branco. Passou a entrar aberto, com o título na frente da tela.
- **Frase visível pelos vãos da palavra gigante.** A frase precisou sair antes de a palavra chegar nela.
- **Primeiro teste de movimento: 3 picos de 7.** Os planos abertos estavam parados (energia de 0,2 a 0,8, contra 3 a 7 da referência). Os objetos passaram a girar de 19 a 38 graus por segundo, e as trocas de cena passaram a durar cerca de 1 s.
- **Quarta palavra gigante.** Testada na troca para o quadro final, com o teclado saindo de quadro em macro. Esse balde virou o único pico do filme e derrubou os outros. Foi retirada.
- **Rastro em degraus.** Com 8 sub-quadros, a palavra gigante mostrava 8 contornos. Com 16 ficou contínuo.
- **Cor do MP4.** Os quadros em JPEG iam para o vídeo sem conversão de padrão de cor. Depois da correção, o vídeo bate com os cards com diferença de 2 a 5 níveis por canal.
- **Sombra suave.** O tipo de sombra usado nos motions anteriores foi removido na versão 0.187 do three.js; aqui é `PCFShadowMap`.
- **Render preso.** Com vários renders de outras sessões rodando ao mesmo tempo, o Chrome sem janela chegou a levar 10 minutos numa etapa que leva 2.

## Resultado da medição de movimento

| Medida | Este motion | Referência | Meta |
|---|---|---|---|
| Amplitude (pico ÷ mediana) | 9,2× | 4,5× | 3,2× ou mais |
| Tempo em quase-parada | 41% | 26% | 25% ou mais |
| Picos | 7 | 11 | 7 ou mais |
| Cortes secos | 12 no roteiro, 10 detectados | 23 em 61,5 s | |

Os sete picos são o estouro da caixa, as três trocas de objeto e a entrada do quadro final. Os cortes dos 15,0 e dos 22,0 s não são detectados porque a palavra gigante está em cima deles.

## Limites conhecidos

- Os objetos são 3D limpo, feito em código. A referência é fotorrealista, com riscos e desgaste.
- O critério de picos passa no limite: são exatamente 7, e o menor está 8% acima do corte.
- O filme é mais contrastado que a referência: socos mais fortes e planos mais calmos entre eles.
- Não tem áudio. A referência tem trilha.
- A crítica com três avaliadores independentes, prevista no método, não foi rodada. O script de portões do método é feito para outro motor; determinismo e cobertura de glifos foram conferidos à mão.
- O headset sai pela boca da caixa enquanto as abas ainda abrem, sem cálculo de colisão. Na revisão por quadros ele não encosta em nenhuma aba.
- Adesivo só em face plana. Em superfície curva seria preciso projetar a arte.
- A tela do notebook não tem texto legível, de propósito.
- Não existe versão vertical.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
```

- `cards` gera as 13 imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/adesivos-no-setup.mp4`.
- `node render.mjs folha` gera `codigo/out/folha-adesivos.png`, com os 15 adesivos.
- `node render.mjs at 7.4 14.7` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- `SS=1 DRAFT=1 node render.mjs video` gera `codigo/out/rascunho.mp4`, sem superamostragem e sem rastro, para medir o movimento.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.

Onde mexer: os adesivos estão em `src/adesivos.js`; os objetos, em `src/objetos.js`; frases, carimbos, planos e câmera, em `src/main.js`.
