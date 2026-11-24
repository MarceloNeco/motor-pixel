# O relógio e seus mundos: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 12 segundos, 1920×1080, 30 quadros por segundo, sem áudio, sem corte e em laço. Um relógio se monta girando no ar, o aro com o cristal chega voando e encaixa, ele encara a câmera e, num giro, explode no mundo de coisas de quem usa aquela cor. As coisas se recolhem e viram o próximo relógio. São três cores, 4 segundos cada: verde (trilha), amarelo com caixa grafite (música) e violeta (sono). O cenário pastel troca de cor junto.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: as formas são primitivas, sólidos de revolução e formas 2D com espessura, e as texturas (mostradores, trama da pulseira, cartões) são desenhadas num canvas dentro do próprio código.

## De onde veio o método

A referência foi um filme de produto de smartwatch, vertical, em laranja, azul e rosa, com os mundos de treino, viagem e pet: https://br.pinterest.com/pin/127578601938453265/. A perícia completa está em `pericia-da-referencia.md`.

O pedido foi recriar em three.js, na horizontal, com um relógio de outras cores, mantendo o design e o estilo.

| Papel | Na referência | Neste motion |
|---|---|---|
| Formato | vertical 720×1280 | horizontal 1920×1080, recomposto (conjunto mais largo que alto, aparador em 3/4) |
| Cores | laranja, azul, rosa | verde, amarelo com grafite, violeta |
| Mundos | treino, viagem, pet | trilha, música, sono |
| Mostradores | analógico, cronógrafo, gato ilustrado | analógico com bússola, digital com anel de progresso, céu de noite com lua |
| Cartão de vidro | "Heart rate 88 BPM" | "Trilha 4,2 km", "Tocando agora 02:14", "Sono 7h 42 min" |
| Corda | corda de pular, cabo, guia | corda de escalada, cabo com plugue, cordão de luzes |
| Aro | torcido, cerâmica azul, liso | serrilhado, escala com números, liso |

## A cena, em números

As medidas estão em unidades da cena. O raio do aro do relógio é 1.

- **Relógio:** caixa de raio 1,045 (aparece em volta do aro), mostrador de raio 0,81 a 0,14 de altura, cristal a 0,21. Quatro alças curtas e afiladas, de 0,5 a 1,03 de altura, curvadas para trás. Coroa às 3 horas com um anel na cor de acento. Pulseira de 1,17 de largura, varrida num laço fechado de 2,9 de altura por 2,4 de fundo.
- **Mundos:** 14 ou 15 objetos por mundo mais 24 miudezas, num conjunto de cerca de 9,5 de largura por 5 de altura. O herói de cada mundo (mochila, caixa de som, despertador) tem escala 1,7; o segundo (pinheiro, fone, lua), 1,5; o resto, de 0,4 a 1,1.
- **Profundidade:** objetos com repouso atrás de −0,9 vão para a camada de trás (desfoque leve); à frente de 1,25, para a camada da frente.
- **Câmera:** perspectiva, 28 graus de campo de visão. Distância de 14,2 na entrada, 9,0 no relógio de frente, 15,0 na explosão.
- **Pose final do relógio:** 13 graus de guinada, 5 de inclinação, 1,5 de rolagem.
- **Cenário:** aparador e parede a 10,6 atrás do herói, girados 20 graus (o lado esquerdo vem para perto). Tampo a −4,65 de altura.
- **Luz:** principal de cima e da esquerda (intensidade 2,7, com sombra), preenchimento do céu em 0,5, recorte por trás em 1,1, ambiente em 0,8.

## Decisões que definiram o resultado

- **Desfoque de movimento de verdade.** Cada quadro é a soma de vários subquadros espalhados em meio quadro de tempo: 12 nos trechos parados, 44 nos rápidos e 96 enquanto o aro voa. É o que esconde as trocas e substitui o corte.
- **Cinco camadas em vez de um desfoque por profundidade.** Fundo bem desfocado, objetos de trás pouco desfocados, meio nítido, objetos da frente pouco desfocados e bolas rente à lente muito desfocadas. Cada camada é renderizada e desfocada sozinha, então nada nítido vaza no desfocado.
- **Oclusão de ambiente só no meio.** A sombra macia nas frestas foi o que tirou a cara de ícone chapado. É calculada em meia resolução e multiplica a camada do meio.
- **Ambiente escuro para o aço.** O estúdio que o metal reflete vai de cinza médio a escuro, com painéis de luz e panos pretos. Com o ambiente todo claro, o aço lia como plástico cinza.
- **Hierarquia no conjunto.** Um herói grande, um segundo, o resto pequeno, com sobreposição e profundidade. A primeira versão tinha tudo do mesmo tamanho e no mesmo plano.
- **Fundo que não compete.** Tons bem mais claros e menos saturados que o herói, vista em 3/4, objetos agrupados nos cantos de baixo e faixas diagonais de luz na parede.
- **O relógio para quase de frente.** Os 13 graus de guinada mostram a lateral da caixa e a coroa; de frente e chapado ele parecia um adesivo.
- **O aro viaja de frente para a câmera.** Alinhado com o relógio desde o começo, ele aparecia de lado, como um risco. Agora ele lê como aro e só no fim alinha com a caixa.
- **O conjunto nasce onde o relógio estava e se recolhe onde o próximo entra.** É o que deixa a emenda entre os ciclos contínua.
- **Flutuação quase parada.** Medindo a referência, a parada no meio da flutuação é o que faz a explosão socar. Não foi acrescentado movimento ali.
- **Textos em português e coerentes.** 20 de novembro de 2026 é uma sexta-feira; a bússola usa N, L, S, O.

## A linha do tempo de um ciclo

| Janela | O que acontece | Câmera |
|---|---|---|
| 0,0 – 0,62 s | o relógio entra girando de −155° a −34° e cresce de 30% a 86% | parada, longe |
| 0,1 – 0,62 s | o aro chega da esquerda e encaixa; pulso de 5% no encaixe | parada |
| 0,68 – 1,62 s | vira para a pose final e chega a 100%; o fundo troca de cor (0,72 a 1,6 s) | aproxima de 14,2 para 9,0 |
| 1,6 – 1,88 s | pausa, com 4° de deriva | quase parada |
| 1,88 – 2,12 s | gira mais 250° acelerando e encolhe a 10% | começa a recuar |
| 2,04 – 2,6 s | os objetos explodem como mola (12% além do ponto), cada um com até 0,07 s de atraso | recua até 15,0, rápido no começo |
| 2,6 – 3,56 s | flutuam: 3% de deriva, 5° por segundo no conjunto | assentando |
| 3,56 – 4,0 s | respiro de 5%, giro de 175° e recolhida | volta para 14,2 |

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula a cena inteira para o instante `t`. O tempo dá a volta em 12 s, então o desfoque do primeiro quadro enxerga o fim do filme e o laço fecha.
- **Objetos.** Cada um guarda posição de repouso, rotação de repouso, um eixo de giro, um atraso e fases. A posição é o repouso multiplicado por uma curva de mola; a escala entra com um pequeno excesso; o giro se desfaz na explosão e volta na recolhida.
- **Aro.** É uma peça solta na cena: a posição e a rotação são interpoladas entre um ponto de partida fora do quadro e o encaixe na caixa, calculado a cada instante.
- **Cenário.** As cores são papéis (parede, móvel, quatro tons de objeto) interpolados entre a paleta anterior e a atual.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva cada imagem e junta tudo com o ffmpeg. No Mac em que foi feito (Apple M5), os 360 quadros levaram cerca de 75 segundos.

## A ordem em que foi feito

1. Perícia da referência: estrutura quadro a quadro, design e movimento medido.
2. Cena inteira escrita de uma vez (relógio, três mundos, cenário, linha do tempo) e primeiro render.
3. Três rodadas de ajuste olhando os próprios quadros: tamanho no quadro, alças, textos, cenário, corda, escala do aro.
4. Teste de movimento contra a referência; reforço da entrada e da recolhida.
5. Crítica independente contra a referência. **Veredito: ainda não estava no nível.** Sete pontos e uma lista de defeitos.
6. Correção: luz com direção e oclusão, ambiente escuro para o metal, hierarquia e profundidade no conjunto, cenário refeito, alças, pose, corda e os defeitos da lista.
7. Render final. **Vídeo aprovado pelo Felipe.**

## Erros do caminho

- **Luz chapada.** Muito preenchimento e nenhuma oclusão: os objetos liam como um pacote de ícones 3D. Foi o ponto mais grave da crítica.
- **Alças em três tentativas.** Primeiro barras retas soltas da caixa, depois abas largas e facetadas, por fim chifres curtos e afilados com normais suavizadas.
- **Cristal virando disco preto.** O material aditivo padrão soma o alfa também; com o ambiente escuro, o cristal sozinho no ar ficou opaco e preto. A mistura passou a somar só a cor.
- **Brilho do cristal lavando o mostrador.** A primeira versão do reflexo apagava "SEXTA" e "20 NOV". Ficou em menos da metade.
- **Hachura no borrão.** Com 16 e depois 28 subquadros, o aro e a corda apareciam como cópias em linha.
- **"30" cortado no aro.** A emenda da textura da escala cai às 6 horas e cortava o número ao meio; ele passou a ser desenhado nas duas pontas.
- **Verso do cartão vazio.** Na recolhida o cartão virava uma placa cinza no centro do quadro.
- **"SEX 20".** Lia como inglês. Virou "SEXTA 20".
- **Salto na emenda.** Os objetos se recolhiam no centro e o próximo relógio nascia à esquerda.
- **Nome do arquivo de saída.** O renderizador copiado de outro projeto gravou o vídeo com o nome antigo.

## Resultado do teste de movimento

| Medida | Este motion | Referência | Meta do script |
|---|---|---|---|
| Amplitude (pico ÷ mediana) | 4,8× | 2,8× | ≥ 2,0× (passa) |
| Picos | 7 | 6 | ≥ 4 (passa) |
| Tempo em quase-parada | 12% | 8% | ≥ 25% (falha) |

A própria referência não atinge a meta de 25% de quase-parada. O teste mede ritmo, não a qualidade da imagem.

## Limites conhecidos

- A segunda passada da crítica independente, depois das correções, não foi feita.
- O portão de aprovação das imagens paradas foi pulado: o vídeo foi entregue direto e aprovado.
- A conferência foi por folhas de quadros e pelo teste de movimento; o vídeo não foi assistido em tempo real antes da entrega.
- Os objetos são formas simples. De perto, alguns (binóculo, ovelha, mochila) têm menos detalhe que os da referência.
- A oclusão de ambiente e o desfoque leve valem para cada camada; objetos de camadas diferentes não fazem sombra uns nos outros.
- Não existe versão vertical nem áudio.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
```

- `cards` gera as dez imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/relogio-mundos.mp4`.
- `node render.mjs at 1.8 3.0` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
- As três versões do relógio ficam na lista `VARIANTS` em `codigo/src/relogio.js`; os mundos, nas funções `worldTrilha`, `worldSom` e `worldSono` em `codigo/src/objetos.js`; as paletas do fundo, em `PALETTES` em `codigo/src/cenario.js`.
