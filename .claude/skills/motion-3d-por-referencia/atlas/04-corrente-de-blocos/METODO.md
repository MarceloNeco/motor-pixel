# A corrente de blocos: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 12 segundos, 1920×1080, 30 quadros por segundo, sem áudio, num plano-sequência sem corte. Mostra o fechamento anual do Bitcoin de 2022 a 2026: cada ano é um bloco de pedra com o ano em relevo, os blocos são ligados por uma corrente de aço, e em cima de cada um cai uma pilha de moedas de bitcoin (uma moeda vale US$ 2 mil) enquanto o número conta junto. No fim a câmera recua, etiquetas com a variação de cada ano caem penduradas na corrente e a conclusão aparece escrita.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: as formas são primitivas e as texturas são desenhadas num canvas dentro do próprio código. O ₿ das moedas é desenhado à mão (um B com duas hastes).

## De onde veio o método

A referência foi o estilo #19 "Data Skyline" do [3D Style Atlas](https://www.futurepedia.io/resources/3d-style-atlas/view) da Futurepedia: a população mundial contada em torres de blocos numa maquete de arquiteto. A perícia completa está em `pericia-da-referencia.md`.

## A lição que custou uma versão inteira

A primeira versão foi reprovada: "ficou exatamente igual ao outro, você só trocou por moedas".

O erro foi levar o **mundo** da referência (maquete clara, plinto impresso, árvores, pessoinhas) e trocar só a unidade. Na referência esse mundo existe por causa do tema: população mora em cidade, então o gráfico virou uma cidade em miniatura. O mundo é a metáfora do tema.

Da referência se leva o **método**; o mundo tem que sair do tema novo:

| Papel no método | Na referência | Neste motion |
|---|---|---|
| Mundo | cidade em maquete | cofre de banco |
| Base de cada item | um plinto único, impresso | um bloco de pedra por ano, ligados por corrente (blockchain) |
| Unidade contável | bloco de pedra = 1 bilhão | moeda = US$ 2 mil; a cada 5, uma de borda lisa marca US$ 10 mil |
| Rótulo do item | ano impresso no plinto | ano em relevo na face do bloco |
| Valor | número 3D em cima, contando | número 3D em cima, contando |
| Relação entre vizinhos | cota desenhada no chão | etiqueta pendurada na corrente, no vão entre dois blocos |
| Elenco de apoio | árvores e pessoas | parede de caixas de cofre |
| Luz e chão | sol baixo, névoa clara, piso fosco | foco quente de cima, penumbra, balcão preto polido |
| Acento único | vermelhão na última torre | laranja em 2026 |

## Os dados

Fechamento do candle diário da Coinbase (BTC-USD, horário UTC), conferido com Binance e Kraken (diferença abaixo de 0,3%). Arquivo: `dados-bitcoin.json`.

| Ano | Data | Fechamento (US$) | Moedas | Variação |
|---|---|---|---|---|
| 2022 | 31/12/2022 | 16.530 | 8 | — |
| 2023 | 31/12/2023 | 42.288 | 21 | +156% |
| 2024 | 31/12/2024 | 93.354 | 47 | +121% |
| 2025 | 31/12/2025 | 87.498 | 44 | −6% |
| 2026 | 16/11/2026 (ano em curso) | 64.998 | 32 | −26% |

A altura da pilha é arredondada para a moeda inteira mais próxima; o número em cima mostra o valor exato.

## A cena, em números

As medidas estão em unidades da cena.

- **Blocos:** 1,85 de largura e de profundidade, 0,8 de altura, cantos arredondados, um a cada 3,0 (vão de 1,15 entre eles).
- **Moeda:** raio 0,85, espessura 0,088, chanfro de 0,014. Lateral serrilhada (168 estrias), face com aro, filete, anel de pontos e o ₿ em relevo.
- **Corrente:** 5 elos por vão, cada elo com 0,13 de raio e 0,036 de espessura, alternando de frente e de lado, numa curva com 10 cm de barriga.
- **Etiqueta:** chapinha de 1,10 por 0,43, marfim com tinta escura, pendurada no elo do meio por uma argola.
- **Números:** Inter ExtraBold em 3D, 0,52 de altura, extrusão de 15% com a lateral mais escura.
- **Parede do cofre:** 56 colunas por 14 fileiras de portas de 1,0 por 0,62, a 8,5 de distância atrás dos blocos.
- **Câmera:** perspectiva, 34 graus de campo de visão. Nove chaves; em sete delas a câmera para.
- **Luz:** um foco quente (`#ffe6c4`) de cima, à frente e à esquerda; uma luz fraca que lava a parede; quase nenhuma luz de trás.

## Decisões que definiram o resultado

- **O metal é iluminado pelo ambiente, não pelas luzes.** Ouro quase não tem cor difusa: ele mostra o que reflete. Com um ambiente uniforme, as pilhas ficavam chapadas. O ambiente virou um estúdio escuro com um painel grande do lado do foco e uma faixa fina atrás à direita, que dá um lado claro, um lado de sombra e um recorte na borda.
- **Balcão em três camadas.** Um espelho de verdade (reflete as pilhas), por cima uma pedra translúcida (recebe o foco e as sombras) e por cima um véu que apaga o longe.
- **Texto fora do espelho.** Números, anos e etiquetas ficam numa camada que a câmera vê e o espelho não. Texto espelhado de cabeça para baixo vira ruído.
- **O número conta na frente da pilha.** Em cima dela, as moedas que caem o atravessariam. Ele fica 42 cm à frente durante o despejo, as moedas caem sempre por trás, e 40 ms depois da última moeda ele salta em arco e assenta no topo.
- **Desfoque que não vaza.** O desfoque pronto do three.js deixa o que está nítido na frente vazar no fundo desfocado, e o número ganhava um halo. O shader foi trocado por um em que uma amostra mais próxima só entra se o desfoque dela alcançar o pixel.
- **Vão largo entre os blocos.** Com os blocos encostados e a etiqueta cobrindo o vão, a fileira voltava a parecer um plinto único. O vão de 1,15 com corrente grossa é o que faz ler "blocos ligados".
- **Nenhuma moeda solta.** Moedas decorativas no balcão contradiziam "cada moeda, dois mil dólares": toda moeda em cena precisa valer.
- **Uma moeda clara a cada 5.** Pilhas de 30 a 47 moedas viram textura. A moeda de borda lisa a cada 5 funciona como régua de US$ 10 mil.
- **Etiquetas neutras.** O laranja ficou só em 2026 (pilha, número, ano) e na segunda linha do título. Com a etiqueta de −26% também em laranja, o acento dizia "quadruplicou" e "caiu 26%" ao mesmo tempo.

## A linha do tempo final

| Janela | O que acontece | Câmera |
|---|---|---|
| 0,0 – 1,0 s | 2022 já pronto, título de abertura | quase parada |
| 1,0 – 1,8 s | 2023 despeja (21 moedas) | parada |
| 1,8 – 2,25 s | o número assenta; pausa | parada |
| 2,3 – 3,3 s | 2024 despeja (47 moedas): o soco do filme | travelling e subida até 3,4 s |
| 3,4 – 4,0 s | pausa no topo, "93,4 mil" | parada |
| 4,0 – 5,15 s | passagem para o quadro de 2025 e 2026; 2025 despeja de 4,25 a 5,2 s | travelling |
| 5,45 – 6,35 s | 2026 despeja (32 moedas laranja) | parada |
| 6,35 – 6,8 s | pausa, 2025 e 2026 lado a lado | parada |
| 6,8 – 9,2 s | recuo até a vista 3/4, rápido no começo e lento no fim | recuo e subida |
| 8,35 – 9,6 s | as 4 etiquetas caem e balançam, uma a cada 0,2 s | assentando |
| 9,7 – 12,0 s | título final e nota da fonte; quadro parado | parada |

Cada moeda cai em 0,30 s acelerando como gravidade, de 2,2 a 2,6 acima do pouso, inclinada de 15 a 35 graus que zeram ao pousar, com uma tremida de 0,16 s.

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula a cena inteira para o instante `t`. Não há relógio nem estado acumulado, então qualquer quadro pode ser renderizado sozinho. Conferido: o quadro de 3,0 s sai idêntico, pixel a pixel, renderizado antes ou depois de outros instantes.
- **Pilhas.** Uma malha instanciada por pilha. Cada moeda tem o instante do pouso; antes dele está caindo, depois está assentada.
- **Câmera.** Posição, alvo e ponto de foco interpolados por chaves; nas chaves marcadas a câmera para de verdade (velocidade zero).
- **Título e nota.** HTML por cima da tela 3D, fotografados junto com ela.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva cada imagem e junta tudo com o ffmpeg. No Mac em que foi feito, os 360 quadros levaram cerca de 50 segundos.

## A ordem em que foi feito

1. Perícia da referência: estrutura, design e movimento medido.
2. Dados levantados e conferidos em três corretoras.
3. Primeira versão (maquete clara), com crítica independente em duas passadas. **Reprovada pelo Felipe**: copiava o mundo da referência.
4. Análise "método × mundo" e redesenho para o cofre com a corrente de blocos.
5. Crítica independente do redesenho; seis correções aplicadas.
6. Página de cards. **Aprovada.**
7. Render, teste de movimento, mudança de ritmo, novo render. **Vídeo aprovado.**

## Erros do caminho

- **Copiar o mundo em vez do método.** Custou uma versão inteira. Ver a seção acima.
- **Pilhas finas demais.** Com uma moeda valendo US$ 1 mil, a pilha de 2024 tinha 93 moedas e saía do quadro. A escala passou para US$ 2 mil.
- **A vírgula sumia.** A vírgula desce abaixo da linha de base e afundava na moeda do topo. O número subiu 30% da própria altura.
- **Balcão bege.** Uma luz de trás batia no balcão polido e voltava direto para a câmera, clareando tudo. Foi praticamente desligada.
- **Reflexo com texto.** O espelho pronto do three.js clona a câmera principal, inclusive as camadas; foi preciso tirar a camada dos textos da câmera do espelho.
- **Reprovado no teste de movimento.** A versão fiel aos cards tinha 5 segundos seguidos de moeda caindo e câmera andando no mesmo volume: amplitude de 2,1× contra a meta de 2,8×. O conserto foi eleger 2024 como soco, pôr pausa antes e depois, e deixar 2025 e 2026 despejarem com a câmera parada.

## Resultado do teste de movimento

| Medida | Este motion | Referência | Meta |
|---|---|---|---|
| Amplitude (pico ÷ mediana) | 6,4× | 4,0× | ≥ 2,8× |
| Tempo em quase-parada | 40% | 33% | ≥ 25% |
| Picos | 5 | 4 | ≥ 2 |

O teste mede ritmo, não a qualidade da imagem.

## Limites conhecidos

- Não há desfoque de movimento. Na chuva de 2024 pousa mais de uma moeda por quadro; em quadros consecutivos ela forma uma coluna contínua, mas a fluidez em tempo real não foi medida; o vídeo foi aprovado assim.
- A passagem de câmera para 2025 mede um pouco mais alta que o soco de 2024.
- A parede do cofre é muito escura (de 3 a 17 num máximo de 255) e pode virar faixas depois da compressão de uma plataforma de vídeo. Não foi testado. A saída é um grão fino no fundo.
- O valor de 2026 é a cotação de 16/11/2026, não um fechamento de ano. A nota em tela diz isso.
- Não existe versão vertical nem áudio.
- A segunda passada da crítica independente sobre o redesenho não foi feita.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
```

- `cards` gera as oito imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/corrente-de-blocos.mp4`.
- `node render.mjs at 3.0 6.0` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
- Para trocar os dados, edite a lista `DATA` e a constante `UNIT` no começo de `codigo/src/main.js`.
- `tools/fonte-typeface.py` converte uma fonte TTF para o formato dos números 3D (precisa do pacote Python `fonttools`).
