# Ilha dos dinossauros: como este motion foi feito

*Aprovado em 16/11/2026, na primeira passada. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 24 segundos em laço, 1920×1080, 24 quadros por segundo, sem áudio e sem texto. Uma ilha vista de cima é repartida em seis setores ao redor de um vulcão, e em cada setor um dinossauro de olho de adesivo repete um gesto sem sair do lugar. A câmera mostra a ilha inteira, visita os seis setores em cortes secos e volta para a ilha.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: os bichos são malhas geradas a partir de uma espinha de pontos, a pele é pintada num canvas e o cenário é feito de primitivas.

## De onde veio

O pedido foi um motion em three.js seguindo os dinossauros do pack "Googly Dinosaurs" (Supergiant, [Motion Array](https://motionarray.com/stock-motion-graphics/pack-of-6-googly-dinosaurs-on-alpha-loop-2486136/)), montado como a imagem de uma ilha com um bicho por setor. A perícia completa está em `pericia-da-referencia.md`.

O que a perícia mostrou, lendo a prévia de 15 segundos quadro a quadro:

- **Mecanismo:** bichos de aparência séria e realista, cada um repetindo o seu laço parado no lugar, com um olho de adesivo que desmonta a seriedade.
- **Elenco:** o pack se chama "6", mas tem 5 espécies. O sexto clipe é o T-rex de novo, em close.
- **Câmera:** parada, baixa, de três quartos, um bicho por quadro.
- **Movimento:** um gesto forte por ciclo (o rugido do T-rex volta a cada 4 s) e o resto quase parado. As pupilas mudam de lugar a cada quadro.

Do pack vieram o elenco, a paleta de cada bicho, o laço parado no lugar e o olho. A ilha, os setores, a câmera de maquete e o tricerátopo são nossos.

## O mecanismo do nosso filme

Uma ilha-maquete vista de cima, repartida em seis setores, e em cada setor um dinossauro de cara séria e olho de adesivo repete o seu laço sem sair do lugar.

## A cena, em números

As medidas estão em unidades da cena.

- **Ilha:** contorno orgânico de raio médio 20,2, esticado 1,22 vez na largura. Dá cerca de 49 de largura por 40 de profundidade.
- **Setores:** seis fatias de 60 graus. Selva na frente, samambaial e brejo nos lados da frente, cânion e campina nos lados de trás, pedreira no fundo.
- **Rios:** um em cada divisa, nascendo a 4,5 do centro e alargando de 1,0 para 1,6 até a foz. São sulcos 0,3 abaixo do nível do mar; um único plano de água faz mar, rios e lagoa.
- **Vulcão:** peça facetada de 4,7 de altura e cerca de 6,5 de raio na base, com lava na cratera e três filetes na encosta virada para a câmera.
- **Bichos:** modelados com 10 a 12,5 de comprimento e postos na ilha com escala 0,8, a 12,5 do centro, cada um no meio do seu setor. Os da esquerda olham para a direita e os da direita olham para a esquerda, todos virados de 20 a 30 graus para a câmera.
- **Câmera do plano geral:** ortográfica, 40 graus de inclinação, quadro de 31,4 de altura.
- **Câmera dos setores:** ortográfica, 22 graus de inclinação, giro de 16 a 22 graus para o lado da cara do bicho, quadro de 8,6 de altura (9,4 no T-rex).
- **Sol:** direcional, cor `#fff0d8`, vindo da direita, do alto e um pouco da frente. A área de sombra é reajustada a cada plano, para a sombra ficar nítida nos closes.

## Decisões que definiram o resultado

- **Rios como divisa.** Cor de chão sozinha não separava os setores no plano geral. Com o rio turquesa e a margem de areia, a ilha lê como seis territórios mesmo em miniatura.
- **Bicho do tamanho de brinquedo.** Na escala real um T-rex sumiria na ilha. Os bichos têm quase a altura das palmeiras e ocupam boa parte do setor.
- **Cenário simples, bicho detalhado.** Pedras, árvores e vulcão são facetados e de cor chapada. Escamas, listras e manchas ficam só nos bichos, e é para eles que o olho vai.
- **Sexto bicho próprio.** Para ter seis setores com seis bichos diferentes, o sexto é um tricerátopo no mesmo estilo, em tons de ocre para não repetir a paleta dos outros.
- **Todos olhando para dentro.** Com os bichos virados para o centro, o plano geral fecha a composição no vulcão e o plano de setor pega cada um de três quartos pela frente.
- **Frente da câmera limpa nos closes.** A câmera baixa do plano de setor olha por cima dos setores da frente. Cada plano tem uma lista do que sai de quadro: o cenário e o bicho do setor que ficaria no caminho, o vulcão no plano do fundo e a fumaça em todos.
- **Vizinho cortado some.** Se um bicho vizinho aparece pela metade na borda do plano, só ele é escondido; o cenário dele fica.
- **Cada gesto dentro do seu plano.** Todos os laços têm 4 s, mas o tricerátopo e o parassaurolofo rodam adiantados (1,4 s e 3,5 s) para a raspada de pata e o berro caírem no meio dos seus planos.

## Como os bichos são feitos

- **Corpo.** Uma espinha de uma dúzia de pontos de controle, da ponta da cauda à nuca. Cada ponto tem meia-largura, altura acima e altura abaixo do eixo. Uma curva de Catmull-Rom passa pelos pontos e a malha é uma sequência de anéis ao longo dela (no T-rex, 76 anéis de 26 lados), refeita a cada quadro.
- **Movimento da espinha.** As dobras se acumulam do quadril para as pontas: a cauda de um lado, o tronco e o pescoço do outro. Varrer a cauda é dar a cada trecho um pequeno giro defasado do anterior.
- **Cabeça.** Peça rígida presa no último anel do pescoço: crânio, mandíbula em dobradiça, dentes em cones, céu da boca, língua e os dois olhos.
- **Pernas.** O pé fica fixo no chão e o quadril acompanha o corpo. O joelho sai de uma cinemática inversa de dois ossos, então dobra sozinho quando o corpo balança. Nos terópodes, o metatarso tem ângulo próprio e o passo levanta o pé pelo calcanhar.
- **Pele.** Uma textura de 2048×512 por bicho, pintada em canvas: degradê do dorso à barriga espelhado (as costas ficam nas duas bordas e a barriga no meio, sem costura), listras que descem do dorso, manchas, pontilhado e rugas. Por cima, um relevo de escamas compartilhado.
- **Olho de adesivo.** Disco branco levemente emissivo, aro escuro, pupila preta fosca e uma cúpula transparente. A pupila pende para baixo e chacoalha com uma soma de senos cuja amplitude segue a "energia" do gesto.
- **Peças próprias de cada um.** Espinhos e cristas no alossauro, cúpula e nódulos no paquicefalossauro, 17 placas e 4 espinhos no estegossauro, crista em tubo no parassaurolofo, escudo e chifres no tricerátopo. Tudo o que fica sobre o corpo é reposicionado a cada quadro.

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula a cena inteira para o instante `t`. Qualquer quadro pode ser renderizado sozinho.
- **Laço de 4 s.** Só duas ferramentas: um seno com número inteiro de ciclos por laço e um envelope que sobe e desce dentro do laço. Com isso, t = 0 e t = 4 são idênticos.
- **Um gesto forte por laço.** Rugido do T-rex de 1,5 a 3,4 s; cabeçada do paquicefalossauro aos 2,3 s; berro do parassaurolofo de 2,0 a 3,4 s; raspada de pata do tricerátopo de 2,0 a 3,3 s. O estegossauro e o alossauro só andam no lugar e varrem a cauda.
- **Cenário.** O mar desliza uma repetição de textura por laço, a espuma da praia respira e uma linha de onda em trechos soltos chega e some. A fumaça do vulcão leva 8 s para subir.
- **Roteiro.** Ilha (0 a 4 s), T-rex (4 a 8 s), depois 2,5 s para cada um na ordem estegossauro, alossauro, paquicefalossauro, tricerátopo e parassaurolofo, e ilha de novo (20,5 a 24 s). 24 s é múltiplo de 4 e de 8, por isso o fim emenda no começo.

## Como o trabalho foi dividido

1. Perícia da referência pelo navegador, quadro a quadro.
2. Biblioteca de formas (`lib.js`) e o T-rex como molde, com uma página de teste que mostra quatro vistas do bicho num quadro só. Três rodadas até a silhueta acertar.
3. Cinco agentes em paralelo, um por bicho, cada um no seu arquivo e sem poder mexer na biblioteca. Cada um levou de 6 a 11 minutos e de 3 a 5 rodadas de render.
4. Em paralelo, a ilha e a cena principal.
5. Cards (a ilha e um quadro de cada setor), ajustes de câmera e de frente limpa.
6. Vídeo, revisão em folha de quadros e uma correção na linha de onda dos planos gerais.

## Erros do caminho

- **T-rex com cara de lagartixa.** A primeira versão saiu magra, de pescoço fino e cabeça pequena. Engrossou tudo e a cabeça foi aumentada em 36%.
- **Coxa em forma de remendo.** O topo da perna terminava numa tampa chata e aparecia como um retângulo no flanco. As pontas das pernas passaram a fechar em cúpula.
- **Pele de argila.** O relevo de escamas estava fraco e fino demais. Ficou três vezes mais forte e com escamas maiores; entraram as rugas.
- **Pupila cinza.** O disco liso da pupila refletia o sol em certos ângulos. Virou material fosco.
- **Furinho na ponta do focinho.** Anel final com raio pequeno deixava um ponto claro. As pontas finas agora fecham num ponto.
- **Vulcão borrado.** Feito no próprio terreno, saiu como uma mancha escura e alta que tapava o setor do fundo. Virou uma peça facetada, mais baixa.
- **Fumaça em cima do bicho de trás.** A fumaça subia reto e cobria o paquicefalossauro. Ficou menor e deriva para a direita e para a frente.
- **Closes tapados.** Com a câmera baixa, palmeiras, o vulcão e o bicho do setor da frente entravam no quadro. Entrou a lista do que sai de quadro em cada plano.
- **Taboas na frente do parassaurolofo.** Planta de altura média também tapa perna. A clareira passou a valer para elas.
- **Anel de mira em volta da ilha.** A segunda linha de espuma era um anel branco contínuo e parecia marcação de interface. Virou trechos soltos e fracos. Só os planos gerais foram renderizados de novo; nos planos de setor a linha antiga ainda aparece ao fundo.
- **Render lento.** Com outros renders rodando na máquina, os 576 quadros levaram cerca de 9 minutos (1 quadro por segundo). O renderizador ganhou os modos `video resume` e `frames`, para continuar ou refazer só um trecho.

## Medida de movimento

Medido no vídeo final com `pericia-movimento.py`:

| Medida | Este motion |
|---|---|
| Cortes secos | 7 |
| Amplitude (pico ÷ mediana) | 13,6× |
| Tempo em quase-parada | 65% |
| Picos | 6 |

Os picos são os cortes entre planos; dentro de cada plano o movimento é contido. Não existe comparação com a referência: o player da página não deixa ler os pixels e o arquivo não foi baixado, então o movimento dela foi lido em quadros, sem número.

## Limites conhecidos

- Os bichos são formas geradas em código. Silhueta, cor, gesto e olho batem com a referência; o detalhe de escultura e de textura de um modelo pronto, não.
- O topo das coxas e dos ombros ainda aparece como um volume sobre o flanco, em todos os bichos.
- O alossauro, de longe, tem silhueta parecida com a do T-rex; o que separa os dois é a cor, os espinhos e a postura.
- A cúpula do paquicefalossauro lê um pouco como um ovo pousado na cabeça.
- O cenário não se mexe (as palmeiras não balançam).
- Nos planos de setor, parte do cenário vizinho some. É invisível no corte, mas não é a mesma ilha do plano geral.
- A linha de onda é mais marcada nos planos de setor do que nos gerais.
- O vídeo foi renderizado antes da aprovação dos cards, e a crítica adversarial prevista no método não foi feita.
- Não existe versão vertical.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
```

- `cards` gera as sete imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/ilha-dos-dinossauros.mp4`. Com `video resume`, continua um render interrompido.
- `node render.mjs frames 0 96` renderiza só os quadros desse intervalo em `codigo/out/frames/`.
- `node render.mjs at 6.4 14.3` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- `node render.mjs dino trex` gera as quatro vistas de um bicho em `codigo/out/teste/`. Os nomes são os dos arquivos em `src/dinos/`.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
