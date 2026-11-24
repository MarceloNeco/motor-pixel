# Casa de frente pro mar: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 16 segundos, 1920×1080, 30 quadros por segundo, sem áudio, num único plano, sem cortes. Uma casa de praia sobre estacas, de frente para o mar, acorda com a manhã: o sol nasce no horizonte, a luz atravessa as ondas com um bando de pássaros e uma jangada, quatro guarda-sóis se abrem na areia e a casa abre venezianas e porta. No fim a câmera recua até o quadro inteiro. Tudo aparece como pintura a óleo sobre tela, com uma legenda manuscrita por parada.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: a casa, os coqueiros, o mar, o céu, o filtro de pintura e a trama da tela são gerados no código. A única peça de fora é a fonte da legenda, Kalam Bold, de licença aberta (OFL).

## De onde veio o método

A referência foi o estilo #13 "Painted" do 3D Style Atlas da Futurepedia ([link](https://www.futurepedia.io/resources/3d-style-atlas/view)): um clipe de 12 segundos em que o vento cruza um trigal, gira um moinho e vira pão. Dele veio só o método. O trigal, o moinho, a padaria e as quatro frases ficaram de fora. A perícia completa está em `pericia-da-referencia.md`.

O que a perícia mostrou:

- **Mecanismo:** um quadro a óleo que se mexe. A câmera passeia por dentro da pintura, de parada em parada, seguindo uma coisa que viaja, e cada parada ganha uma legenda manuscrita no canto cru da tela.
- **Montagem:** plano único, sem nenhum corte.
- **Ritmo:** a câmera nunca para. Nas paradas ela deriva; entre elas, dá dois empurrões (aos 4 e aos 7,5 s). A amplitude é de 2,09×, e só o último segundo fica imóvel.
- **Tela:** margem crua de 1,3% com borda irregular e um recorte de tela no canto de baixo à esquerda para a legenda.

O clipe foi estudado no navegador, quadro a quadro, sem ser baixado. O prompt que acompanha o cartão do Atlas não foi lido (a leitura automática foi bloqueada); o estudo é só do clipe e da descrição pública.

## O mecanismo do nosso filme

Um quadro a óleo que acorda: a luz da manhã sai do sol, atravessa o mar com os pássaros, chega à areia e chega à casa. A câmera vai atrás, de parada em parada, e no fim recua para mostrar tudo aceso de uma vez.

## A cena, em números

As medidas estão em metros.

- **Costa:** uma praia em meia-lua. O mar fica à esquerda; a linha d'água é uma parábola, e a areia sobe 3,5 cm por metro até uma duna de 1,9 m.
- **Casa:** corpo de 8,4 × 5,6, com paredes de 3,1 de altura, sobre um deque de 10,4 × 9,0 a 1,8 do chão, apoiado em nove estacas. Telhado de duas águas com a cumeeira a 7,2 e a empena virada para o mar, cobrindo a varanda. A casa olha para o mar e gira 35° na direção da câmera de abertura.
- **Coqueiros:** 11, de 8 a 10,5 de altura, cada um com 12 folhas de borda serrilhada.
- **Guarda-sóis:** 4, com 10 gomos e 1,52 de raio aberto, cada um com uma espreguiçadeira.
- **Pássaros:** 7, com 3,9 de envergadura (maiores que uma gaivota de verdade, para lerem de longe).
- **Câmera:** perspectiva, 40° de campo vertical (42° rente à água), entre 1,6 e 3,95 de altura.
- **Sol:** 12° à esquerda do eixo da abertura. Sobe de 0,5° para 5° nos três primeiros segundos e chega a 6,8° no fim. O disco tem 1,7° de raio.
- **Luz:** a luz que modela as formas vem da esquerda e da frente, a 32° de altura, quente. A luz de ambiente é lilás em cima e areia embaixo.
- **Filtro:** a pintura é calculada em 1440×810 (75% do quadro). Kuwahara de 8 setores com raio de 6 pixels e uma segunda passada com raio de 3. Margem crua de 25 pixels; recorte da legenda de 42,5% × 12,8% do quadro.
- **Toques:** células de Voronoi no espaço do objeto. Na parede, 3 células por metro na largura e 1,5 na altura, com o eixo inclinado. No céu, cada célula tem cerca de 1,9° × 0,7°.

## A linha do tempo

| Tempo | Câmera | O que acontece | Legenda |
|---|---|---|---|
| 0 a 2,7 s | Plano geral; avança 5 m | O sol sai do horizonte; o bando aparece perto dele | "O sol nasce no mar." (0,35 s) |
| 2,7 a 4,5 s | Viaja até a água | O caminho de luz corre do horizonte para a praia | "A luz atravessa as ondas." (3,55 s) |
| 4,5 a 6,2 s | Rente ao mar; segue em frente | O bando cruza na frente do sol; a jangada passa | |
| 6,2 a 8,2 s | Gira 57° de volta para a areia | | "A praia abre os guarda-sóis." (7,2 s) |
| 8,2 a 9,9 s | Vê a praia do mar; deriva | Os guarda-sóis abrem um a um (8,30, 8,62, 8,94 e 9,26 s) | |
| 9,9 a 11,4 s | Avança quase 8 m pela beira até a casa | O bando dá a volta por cima do telhado | "E a casa acorda de frente pro mar." (10,4 s) |
| 11,4 a 13,0 s | De frente para a casa; chega perto | Venezianas (11,55 e 11,80 s), janelas do lado (11,95 s), porta (12,05 s); quatro pássaros pousam | |
| 13,0 a 14,8 s | Recua 20 m até o quadro inteiro | Três pássaros seguem para o céu | |
| 14,8 a 16 s | Parada | O relógio da cena freia e para em 15,2 s | |

## Decisões que definiram o resultado

- **O toque nasce no material, não no filtro.** O filtro sozinho, sobre cor lisa, devolvia uma aquarela borrada. Cada material divide a superfície em células com tom próprio, presas ao objeto, e o Kuwahara arredonda essas células em pinceladas. Por isso os toques crescem quando a câmera chega perto, como na referência.
- **A luz é um truque assumido.** O sol aparece no horizonte ao fundo, mas a luz que ilumina a fachada vem da frente e da esquerda. Com a luz na direção real do sol, a casa ficaria toda em sombra. A referência faz o mesmo.
- **Composição de quadro, não de drone.** Para o sol caber junto com a casa, a câmera fica quase na altura dos olhos, com o horizonte a 40% da altura. De cima, o sol sai do quadro.
- **O que viaja é a luz, com os pássaros.** O caminho de luz no mar avança do horizonte para a praia entre 0 e 4,6 s, e o bando faz o mesmo trajeto. Isso dá um motivo para a câmera ir de uma parada à outra.
- **A casa acesa por dentro.** Atrás das paredes existe um interior laranja sem luz própria da cena. Com tudo fechado ele não aparece; quando venezianas e porta abrem, a casa "acende".
- **Recuo final.** A referência termina no detalhe. Aqui o último enquadramento de perto mostrava a casa sem o mar, e a frase fala do mar. O recuo de 13,0 a 14,8 s resolve e deixa no último quadro tudo o que foi pedido: casa, mar, sol, guarda-sóis, coqueiros e pássaros.
- **Três pássaros ficam no céu.** No plano geral, pássaro pousado no telhado vira mancha escura. Quatro pousam (lêem bem de perto) e três continuam voando, para o quadro final ter pássaro reconhecível.
- **Toques do mar medidos da praia.** As células do mar são medidas em ângulo e altura aparente a partir de um ponto fixo na areia. Em metros, elas sumiam perto do horizonte.

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula a cena inteira. Os quadros de 5,6 s e 12,9 s foram renderizados em duas ordens diferentes e saíram idênticos byte a byte.
- **Câmera por chaves.** Onze chaves de posição, giro, inclinação e campo de visão, ligadas por uma curva cúbica que não passa do alvo. Existe uma chave em −1 s, antes do filme, para o primeiro quadro já estar em movimento.
- **Relógio da cena.** Mar, folhas, pássaros e jangada usam um relógio que anda junto com o filme até 14,4 s e freia até parar em 15,2 s. É o que deixa o fim imóvel.
- **Guarda-sol.** A lona tem comprimento fixo: o raio da borda vai de 0,13 a 1,52 e a altura da borda sai por Pitágoras. A geometria é recalculada a cada quadro.
- **Pássaros.** Um líder segue uma rota por chaves; os outros ficam em V atrás dele. As asas têm duas partes e batem com atraso entre elas. No pouso, cada ave troca a posição na formação pelo seu poleiro, num arco, e fecha as asas.
- **Legenda.** Desenhada num canvas 2D e usada como máscara no último passe, com uma cortina que anda da esquerda para a direita em 0,8 s.

## Como o filtro funciona

1. **Revelar:** a cena, renderizada em ponto flutuante com antisserrilhado, vira imagem de exibição com saturação de 1,22 e um pouco de contraste.
2. **Tensor de estrutura:** Sobel nas três cores, borrado em duas passadas.
3. **Kuwahara anisotrópico:** elipse alongada na direção da forma (até duas vezes o raio), oito setores com peso polinomial, e a saída é a média ponderada pelo inverso da variância de cada setor.
4. **Relevo:** a altura é 78% do claro e escuro da pintura, 15% de um ruído esticado na direção do traço e 7% de grumo. A direção vem de um tensor borrado mais largo; onde a forma não manda, vale "a mão do pintor", um traço que desce para a direita.
5. **Tela:** contorno leve, trama de linho de 3,3 pixels por fio (mais forte nos escuros), margem e recorte com borda de ruído, e a legenda.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva cada imagem e junta tudo com o ffmpeg. No Mac em que foi feito (Apple M5, dividindo a placa com outros renders), os 480 quadros levaram entre 60 e 110 segundos. O original sai em CRF 18 com 134 MB; o vídeo deste acervo foi recomprimido em CRF 23 e tem 61 MB. A trama da tela, presente em todos os pixels, é o que mais pesa no arquivo.

## A ordem em que foi feito

1. Perícia da referência: estrutura, design e movimento medido.
2. Cena 3D construída e vista sem o filtro.
3. Filtro ligado e calibrado, olhando cada passe em separado.
4. Uma imagem parada de cada parada, com correção de enquadramento, pássaros, guarda-sóis e coqueiro.
5. Vídeo, folhas de quadros a 4 por segundo e medição de movimento. Foram seis renders completos até a versão aprovada.

Neste motion as imagens paradas não passaram por aprovação antes da animação: o trabalho foi direto até o vídeo, e a aprovação veio no filme pronto.

## Erros do caminho

- **Manchas pretas.** O Kuwahara dividia a soma por `max(peso, 0,000001)`. Em área detalhada (caminho de luz, hastes, bordas de folha) todos os pesos são menores que isso, e a cor ia a zero. A divisão passou a usar a soma real.
- **Folha de metal.** Com ganho de relevo 7 e ruído de cerdas forte, a pintura parecia alumínio amassado com vermes. O ganho caiu para 2,6, o brilho para um quarto, e a direção das cerdas passou a vir de um tensor mais largo.
- **Azulejos na parede.** As primeiras células eram caixas em grade e saíam como retângulos lilás. Viraram células de Voronoi, com o eixo inclinado nas paredes.
- **Pássaros na lente.** Nas duas primeiras rotas o bando passava a 5 m da câmera e cobria o alto do quadro com asas pretas. A rota foi refeita para ficar a mais de 10 m em todas as paradas, e as aves diminuíram.
- **Coqueiro no caminho.** Um par de coqueiros na beira d'água ficava a 60 cm do ponto final da câmera. Sobrou um, mais adiante na praia.
- **Guarda-sol tapando a casa.** No enquadramento da casa, dois guarda-sóis cobriam a escada e a varanda. Eles foram para uma faixa da areia fora desse enquadramento, e as câmeras das paradas 3 e 4 passaram para o lado do mar.
- **Sol atrás da folha.** Na abertura, a copa de um coqueiro cobria o sol. O sol foi 5° para a direita e o coqueiro saiu dali.
- **Cauda furando o telhado.** Pousadas com o corpo inclinado, as aves atravessavam a telha e a cauda aparecia por baixo. O corpo ficou quase reto e o poleiro subiu 10 cm.
- **Aves em fila virando corrente.** Sete poleiros a 1,2 m um do outro, vistos de longe, davam uma faixa escura contínua. Ficaram quatro, a 2 m.
- **Filme de slide.** A primeira versão tinha a câmera quase parada nas paradas e amplitude de 9,8×, contra 2,09× da referência. A câmera passou a derivar o tempo todo, as viagens ficaram mais longas e o mar ganhou mais movimento.
- **Medidor que via movimento em quadro parado.** O `pericia-movimento.py` da skill lê só o começo de valores em notação científica (0,00009 vira 9). A medição daqui usa `medir-movimento.py`, que lê o número inteiro.

## Resultado do teste de movimento

| Medida | Este motion | Referência | Meta |
|---|---|---|---|
| Cortes secos | 0 | 0 | 0 |
| Amplitude (pico ÷ mediana) | 2,98× | 2,09× | pelo menos 1,5× |
| Baldes de pico | 9 | 7 | pelo menos 4 |
| Tempo em quase-parada | 9% (só o fim) | 8% (só o fim) | parecido com a referência |
| Final | 0,8 s imóvel | 1 s imóvel | pelo menos 0,8 s |

A referência foi medida no navegador, e o nosso filme com o `medir-movimento.py`; a conta é a mesma, mas os valores absolutos dos dois métodos não são idênticos. O que se compara é a forma do arco. O teste mede ritmo, não qualidade de imagem.

## Limites conhecidos

- É uma cena 3D estilizada com filtro. Não é pintura quadro a quadro, e em tamanho real as marcas de cerda têm uma regularidade de pente que a tinta de verdade não tem.
- As paradas são mais calmas que as da referência (de 2,2 a 5,4 contra 5 a 7). Lá um trigal inteiro balança; aqui se mexem o mar, as folhas e a câmera.
- No plano geral, os quatro pássaros pousados são manchas escuras na beira do telhado.
- A direção da luz não bate com a posição do sol.
- O filme tem 16 s, contra 12 s da referência, e um recuo final que ela não tem.
- A revisão foi feita em quadros parados, em folhas de quadros a 4 por segundo e pela medição. O vídeo não foi assistido em tempo real antes da entrega, então um tremor fino de pincelada entre quadros vizinhos, se existir, não foi avaliado.
- O arquivo é pesado para 16 s (61 MB na versão do acervo).
- Não existe versão vertical.
- A crítica adversarial dos cards, prevista no método, não foi feita.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
python3 medir-movimento.py out/casa-de-praia.mp4
```

- `cards` gera as cinco imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/casa-de-praia.mp4`.
- `node render.mjs at 5.6 12.9` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- `ETAPA=base node render.mjs at 5.6` mostra a cena sem o filtro; `ETAPA=tinta2` mostra a pintura antes do relevo e da tela.
- `CAM="x,y,z,giro,incl,fov"` fixa a câmera para estudar um enquadramento.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
- As legendas ficam em `LEGENDAS`, a paleta em `C` e as chaves da câmera em `CAM`, tudo em `src/main.js`. A lista de textos está em `copy.txt`.
