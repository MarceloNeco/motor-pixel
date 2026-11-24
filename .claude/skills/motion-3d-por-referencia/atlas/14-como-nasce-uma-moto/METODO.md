# Como nasce uma moto: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 8 segundos, 1920×1080, 30 quadros por segundo, sem áudio, num plano único sem corte. Uma moto se desenha a grafite num caderno, na ordem em que um designer a esboça: rodas, quadro, motor e tanque. Cada etapa ganha uma nota numerada em letra de arquiteto, com linha-guia que acompanha a peça enquanto a câmera faz um arco lento. O tanque é a única peça que leva cor, e o último risco é o farol acendendo.

Tudo é código three.js. Não há modelo 3D, imagem, textura de arquivo nem arquivo de fonte: a moto é feita de tubos, toros, caixas, uma peça torneada e três peças lofteadas; a hachura é desenhada num canvas; a letra é de traço único, risco por risco.

## De onde veio

É a nossa versão do estilo **#25 Pencil Sketch** do [3D Style Atlas da Futurepedia](https://www.futurepedia.io/resources/3d-style-atlas/view). O clipe de lá mostra uma casa subindo (fundação, estrutura, paredes, telhado); o Felipe pediu o mesmo estilo com uma moto e os textos em português. O estudo do clipe está em `pericia-da-referencia.md`.

O botão de copiar prompt daquela página entrega o código-fonte do exemplo deles. Ele não foi usado: o que está em `codigo/` foi escrito do zero. Do Atlas veio a descrição do método (o desenho que se faz sozinho, a luz que só aparece como hachura, as notas numeradas, o arco de câmera); a implementação é nossa.

## O mecanismo do nosso filme

O desenho se faz sozinho no caderno, na ordem em que a moto é montada. Cada etapa ganha uma nota numerada escrita à mão, e a última peça é a única que leva cor.

| Papel no método | Na referência (casa) | Neste motion (moto) |
|---|---|---|
| Ordem do desenho | fundação, estrutura, paredes, telhado | rodas, quadro, motor, tanque |
| Linhas de construção | caixa-fantasma da casa | chão, linha dos eixos, círculo de cada roda, eixo da direção, caixa do volume |
| A fila que entra uma a uma | os montantes | os tubos do quadro e as aletas do cilindro |
| A peça com o acento | o telhado | o tanque |
| A cota | 8500, deitado no chão | 1400 MM (o entre-eixos), com o número em pé |
| O último risco | a fumaça da chaminé | três riscos na frente do farol |

## A cena, em números

As medidas da moto estão em metros. x aponta para a frente, y para cima, z para o lado direito (o lado que a câmera vê).

- **Moto:** entre-eixos de 1,40; rodas com 0,33 de raio; garfo de 0,70 de comprimento, com 27 graus de cáster. Pneu dianteiro com 0,043 de raio de seção, traseiro com 0,053. 24 raios por roda, cruzados dois a dois, como riscos soltos.
- **Quadro:** berço duplo em tubos de 0,0175 de raio, com 0,17 de largura. Balança, mesas do garfo, bengalas e dois amortecedores com a mola desenhada em hélice de 9 voltas.
- **Motor:** cárter de 0,44 × 0,215 × 0,25; duas tampas redondas; cilindro inclinado 8 graus para a frente com 5 aletas de 8,5 mm; cabeçote, tampa de válvulas, carburador e filtro de ar. Escapamento em curva de 0,0215 de raio, com ponteira que abre de 0,03 para 0,045.
- **Tanque e banco:** peças lofteadas (seções de superelipse ligadas por uma pele). O tanque tem 0,54 de comprimento e 0,31 de largura.
- **Câmera:** perspectiva, 17 graus de campo de visão. Gira de 13 para 42 graus em volta da moto, sobe de 15 para 22 graus, a cerca de 6,4 de distância, olhando para o ponto (0 · 0,44 · 0). A lente é deslocada 335 px para a moto ficar à esquerda do centro. O arco acelera e desacelera suave e para aos 7,7 s.
- **Luz:** um sol na direção (0,1 · 0,85 · 0,5), do lado da câmera e alto, e um ambiente de 0,13. Sombra suave (mapa de 2048, desfoque de 14).
- **Hachura:** folha de 2048 px com 96 fileiras de riscos; a distância entre riscos no objeto é de 24 mm. Seis camadas entram nos limiares de tom 0,10 · 0,28 · 0,44 · 0,60 · 0,74 · 0,86, alternando a direção principal e a cruzada (1,15 radiano de diferença).
- **Contorno:** achado numa imagem auxiliar de 3840×2160 (normal, profundidade e número de cada peça). Dois riscos por borda: o primeiro treme até 1 px, o segundo até 3 px.
- **Letra:** 50 px de altura no título e nas notas, traço de 4 px; número da nota com 34 px. Círculo da nota com 41 px de raio. Coluna de notas em x = 1352.
- **Cores:** papel `#f2ede2`, grafite `#34353b`, vermelho `#cf3f25`, aguada do tanque `#e39478` com hachura `#b03a25`.

## A linha do tempo

| Tempo | O que acontece |
|---|---|
| antes de 0 | Linhas de construção, as duas rodas e a nota 1 já estão no papel. |
| 0,0 a 0,25 s | A linha-guia da nota 1 vai até o pneu e fecha numa bolinha. |
| 0,5 a 1,3 s | A cota: linhas de chamada, linha de cota, dois tracinhos vermelhos e "1400 MM" escrito em pé. |
| 1,3 a 3,0 s | O quadro: coluna de direção, tubo de cima, tubo de baixo, berço, coluna e trilho do banco, escora, balança, mesas, garfo, amortecedores. Um tubo depois do outro, cada um em 0,12 a 0,22 s. |
| 2,1 a 3,1 s | A nota 2 é escrita e a guia chega ao tubo de baixo. |
| 3,2 a 4,9 s | O motor: cárter, tampas, cilindro, as 5 aletas (uma a cada 0,065 s), cabeçote, carburador, curva do escapamento (0,48 s ao longo do caminho) e ponteira. |
| 3,95 a 4,9 s | A nota 3. |
| 5,1 a 5,9 s | Guidão, painel, farol, retrovisores, para-lamas, banco e o contorno do tanque, que fica um instante em branco. |
| 5,88 a 6,66 s | A aguada vermelha no tanque, em faixas, uma puxada por faixa. A hachura vem por cima. |
| 6,1 a 7,1 s | A nota 4. |
| 6,95 a 7,2 s | O último risco: três traços curtos na frente do farol. |
| 7,7 a 8,0 s | Câmera parada; o contorno ferve de leve. |

## Decisões que definiram o resultado

- **Hachura reta, em três planos.** A primeira versão hachurava as formas curvas pelo desenrolado da superfície, e o risco embrulhava a curva do pneu e do tanque: lia como render com filtro. Nas formas curvas a folha de hachura passou a ser escolhida pela direção da superfície (de lado, de cima ou de frente), como quem trata a forma em planos e risca reto em cada um.
- **O sol fica do lado da câmera.** Com o sol atrás, quase tudo o que a câmera via estava em sombra e virava hachura. Do lado da câmera e alto, o lado da moto fica quase papel, a frente fica em sombra cruzada e a sombra no chão cai para trás, longe da coluna de notas.
- **Pouca cor local.** Pneu e banco são só um pouco mais escuros que o metal. Com o escuro fixo que tinham no começo, pareciam pintados e apagavam a leitura da luz.
- **Sombra desfiada.** Cada fileira de riscos tem o seu próprio limiar, então na borda da sombra cada risco para num ponto diferente, em vez de formar degraus.
- **Só as peças grossas fazem sombra.** Tubos finos, guidão e retrovisores não projetam sombra: a sombra é uma massa simples, como um ilustrador faria.
- **Contorno em três forças e vão de papel.** O contorno de fora é mais grosso que o entre peças, que é mais forte que o de dobra. Onde uma peça passa na frente de outra, a hachura da de trás abre um vão. É o que separa o guidão do tanque na vista final.
- **Traço repassado.** Cada tubo tem um eixo fraco que passa das pontas; cárter e cabeçote têm as arestas como riscos soltos que passam do canto e aparecem antes do sólido; tanque e banco têm uma linha de perfil que chega antes da peça.
- **Letra com pauta de caligrafia.** Cada linha de texto fica entre duas linhas-guia fracas. Entraram no lugar de uma pauta de caderno uniforme, que parecia fundo digital.
- **Camada de letras separada.** Título, notas e guias são desenhados numa imagem à parte, que abre um halo de papel no que cruza. As guias terminam em bolinha.
- **A cota fica em pé.** A linha de cota está no chão, mas o número é escrito num plano vertical. Deitado, com a câmera a 15 graus, ficava com 25 px de altura e ilegível.
- **Notas na ordem das alturas.** A guia 2 aponta para o tubo de baixo do quadro e a 3 para as aletas, para as duas linhas não se cruzarem.
- **Linhas de construção desviam do texto.** Elas somem numa faixa de 34 px em volta do título e da coluna de notas.
- **Fervura só com a câmera parada.** No começo e no fim o contorno treme até 0,75 px, a 8 trocas por segundo. Em movimento a fervura é zero.

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula a cena inteira para o instante `t`. Conferido: o quadro de 6,22 s sai idêntico, byte a byte, renderizado sozinho ou depois de outros.
- **Varredura.** Cada peça tem uma coordenada de 0 a 1 ao longo de si (ao longo do tubo, em volta do anel ou numa direção). O contorno aparece até onde o lápis já chegou; a hachura vem depois, com o seu próprio tempo, e a direção cruzada entra por último. A mesma regra corta a peça no mapa de sombra, então a sombra cresce junto.
- **Riscos soltos.** Cada risco é uma fita alargada na tela, revelada pelo comprimento.
- **Letras.** Cada letra é um conjunto de riscos, com um pequeno giro e desnível sorteados; as letras entram uma a cada 0,065 s.
- **Linhas-guia.** São refeitas a cada quadro, da nota até a projeção do ponto da peça na tela.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva cada imagem e junta tudo com o ffmpeg. Cada quadro passa por quatro etapas: imagem auxiliar para o contorno, contornos, tinta (hachura, sombra e riscos) e papel. No Mac em que foi feito, os 240 quadros levaram cerca de 47 segundos, com outros renders rodando ao mesmo tempo.

## A ordem em que foi feito

1. Perícia da referência: estrutura, design e movimento medido.
2. Kit de lápis, letra e moto escritos; primeiras imagens paradas e ajuste de proporções e de câmera.
3. Oito cards e crítica independente: um crítico comparou às cegas com a referência em 8 mecanismos, outro conferiu briefing, português, sentido para quem entende de moto e as regras da perícia.
4. O crítico às cegas reprovou a primeira versão em 3 dos 8 mecanismos (traço, lógica de luz e composição). Correções aplicadas e cards refeitos. **Cards aprovados pelo Felipe.**
5. Render, folhas de quadros nas passagens, teste de movimento e a fervura do traço. **Vídeo aprovado.**

## Erros do caminho

- **Render com filtro.** A hachura embrulhada nas curvas custou uma rodada inteira de cards. Ver "Hachura reta, em três planos".
- **Proporção de brinquedo.** Na primeira modelagem os pneus tinham quase 0,07 de raio de seção e pareciam de scooter; a ponteira e o guidão também estavam exagerados.
- **Hachura em espinha de peixe** no tanque e no banco. A folha de hachura usava o parâmetro da seção, que não é comprimento. Passou a usar a distância real medida em volta de cada seção.
- **Sombra em degraus.** O three.js r187 não tem mais a sombra PCF suave, e a sombra dura de tubos e retrovisores virava recortes quadrados sob a hachura. A saída foi a sombra do tipo VSM, mais a borda desfiada.
- **Guias cruzadas.** Com a guia 2 apontando para o alto do tubo de baixo, ela cruzava a guia 3.
- **Farol que parecia uma folha.** A hachura pelo desenrolado da peça torneada formava uma flor na lente. Resolvido com os três planos e um aro na frente.
- **Manetes que viravam seta.** Dois riscos de manete em cima do tanque liam como uma seta. Foram retirados.
- **Falso salto no fim do vídeo.** O teste de movimento acusou um pico nos últimos quadros. Decodificando o vídeo quadro a quadro, eles eram idênticos: com quadros exatamente iguais no fim, o filtro de diferença do ffmpeg 8.1 devolve um valor que não existe. Com a fervura, os quadros finais deixaram de ser idênticos e a medição voltou ao normal.

## Resultado do teste de movimento

| Medida | Este motion | Referência | Meta | Resultado |
|---|---|---|---|---|
| Amplitude (pico ÷ mediana) | 1,6× | 1,9× | ≥ 1,3× | passa |
| Picos | 10 | 5 | ≥ 3 | passa |
| Cortes secos | 0 | 0 | 0 | passa |
| Tempo em quase-parada | 0% | 6% | ≥ 25% (padrão da ferramenta) | não passa |

A meta de quase-parada é o padrão da ferramenta; a própria referência mede 6%, porque é um filme de câmera sempre andando. O que fica de fato atrás da referência: o nosso perfil é uma curva só e mais calma (mediana 0,25 contra 0,55), e os "10 picos" são um platô contínuo de 2,0 a 6,5 s. A referência tem um pico isolado na aguada do telhado, que ocupa cerca de um quarto do quadro; o tanque ocupa uns 2%, então a entrada do vermelho se vê, mas não vira pico na medição.

## Limites conhecidos

- O vídeo não foi assistido em tempo real por quem o construiu; a revisão foi por folhas de quadros e por medição. O tremor do contorno é preso à tela e, pelas contas, desliza centésimos de pixel por quadro sobre a moto.
- A segunda passada dos críticos, depois das correções, não foi feita.
- Na vista final a manopla mais próxima cruza o tanque; fica separada dele pelo vão de papel.
- A moto é um modelo genérico e simplificado: não tem corrente, coroa, cabos nem manetes, e o lado esquerdo quase não tem detalhe.
- A letra só tem maiúsculas, números e alguns sinais.
- Não existe versão vertical nem áudio.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
```

- `cards` gera as oito imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/moto-a-lapis.mp4`.
- `node render.mjs at 3.0 6.2` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
- Título, etapas, cota e cores ficam no começo de `codigo/src/main.js`. A moto está em `codigo/src/moto.js`; para outro objeto, troque esse arquivo e os pontos de chegada das notas.
