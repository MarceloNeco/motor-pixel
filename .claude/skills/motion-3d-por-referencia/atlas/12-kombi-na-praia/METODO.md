# Kombi na praia: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 16 segundos, 1920×1080, 30 quadros por segundo, sem áudio e sem texto, num único plano, sem cortes. Uma kombi food truck de brinquedo, com uma pilha de panquecas no teto, quica pela estrada dos morros, dá um salto grande quando o mar aparece, desce entre coqueiros, freia na areia e para de frente para a baía.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: a kombi, o relevo, as plantas, o mar e o céu são gerados no código, e a cor do chão é pintada numa textura calculada na abertura.

## De onde veio o método

A referência foi um loop vertical de 4,8 s publicado no Pinterest ([link](https://br.pinterest.com/pin/127578601936636607/)), crédito a @eslammo7amed: uma kombi food truck quicando numa estrada de terra, com morros, montanhas em cone e foco curto de miniatura. A perícia completa está em `pericia-da-referencia.md`.

O que a perícia mostrou:

- **Mecanismo:** a câmera vai na frente da kombi, que quica de morro em morro, e a carga responde a cada pouso com atraso.
- **Montagem:** um loop de 1,2 s repetido quatro vezes, sem corte.
- **Ciclo:** no ar logo depois da crista, pouso de nariz para baixo por volta de 0,4 s, poeira, fundo do vale, subida de nariz para cima.
- **Imagem:** brinquedo de plástico, mundo de massinha, só a kombi nítida.

O vídeo da referência foi estudado no navegador, quadro a quadro, pelo embed público do pin, sem ser baixado. O pedido foi manter o estilo e o carro, mudar para o formato horizontal e fazer a kombi chegar a uma praia no final.

## O mecanismo do nosso filme

A câmera não larga a kombi: ela quica de morro em morro com as panquecas balançando, o mar aparece no último salto e ela só para quando os pneus estão na areia.

## A cena, em números

As medidas estão em metros. O leste é o sentido da viagem e o mar fica ao norte.

- **Kombi:** 4,8 de comprimento, 2,85 entre eixos, rodas de 0,37 de raio. A cabine é um bloco de 1,86 × 1,76 × 1,78 com cantos de 0,30; o baú tem 2,78 × 2,04 × 1,94. A pilha tem 7 panquecas de 0,2 de espessura e cerca de 0,74 de raio, e o topo fica a 4 m do chão.
- **Rota:** 104 m, de x = −90 a x = 14. Velocidade de 10 m/s até os 8,45 s, depois 3,4 s de freada. Ela para aos 11,85 s.
- **Morros:** uma crista a cada 12 m (um quique a cada 1,2 s), com 0,48 de amplitude. A última crista tem 0,78 e vem antes de uma descida de 5,7 m em 34 m.
- **Câmera:** perspectiva com 25° de campo vertical na estrada, 32° no salto e 29° no fim. Fica a 21 m da kombi na estrada e entre 16 e 18 m na praia. A altura sobre a estrada vai de 2,7 m a 2,2 m e termina em 4,6 m.
- **Sol:** a 40° de altura, vindo do lés-sudeste. Ilumina a frente e o lado da janela.
- **Costa:** a linha d'água é uma parábola que abre para o noroeste e forma a baía. A praia tem cerca de 22 m de largura.
- **Plantas:** 587 arbustos com 539 mil folhas instanciadas, 8 coqueiros e alguns milhares de tufos de capim.
- **Terreno:** malha de 0,4 m numa área de 200 × 88 em volta da rota, com textura de 4096 × 2048 pintada em código; malhas de 4 m e de 20 m para longe.
- **Poeira:** 474 bolinhas no filme inteiro.

## Decisões que definiram o resultado

- **Uma lataria sem marca.** A referência é a peça de uma rede de panquecas: tem o letreiro no nariz e um sorriso azul na lateral. Aqui entraram um emblema neutro (aro cromado com miolo coral) e uma faixa creme ondulada. O carro, as cores e a carga ficaram.
- **Uma viagem com chegada.** A referência é um loop. O nosso filme usa o loop como primeiro ato (três quiques no mesmo ritmo) e depois conta a chegada: o mar aparece, vem o salto grande, a descida, a freada e a praia.
- **O mar fica escondido no primeiro ato.** A estrada corre atrás de um espigão com árvores. A câmera olha para o noroeste, onde só há terra e montanhas. O mar só entra quando o espigão acaba e a câmera gira.
- **O salto acontece de perfil, contra o mar.** A câmera rodeia a kombi 50° em 1,9 s e chega ao perfil no instante em que ela decola da última crista.
- **A câmera passa à frente na freada.** A referência da câmera segue a kombi com atraso e compensa pela velocidade suavizada. Enquanto ela freia, a câmera ganha a dianteira e assenta sozinha, sem chave de animação para isso.
- **O plano final abre subindo.** A kombi para, a câmera sobe 2,4 m em 4 s e o quadro passa a mostrar a baía, as ondas e os cones. A folha de um coqueiro entra no canto de cima como moldura.
- **O sol foi escolhido pelo plano final.** A 120° de azimute ele ilumina a frente e o lado da janela tanto na estrada quanto na praia, porque a kombi viaja sempre para o leste.
- **Física de verdade, com três exageros.** A suspensão e os saltos saem de uma simulação. Os exageros são: no ar ela busca a inclinação do chão, o mergulho de freada é 3,2 vezes o real e as frutas caem com metade da gravidade.

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula a cena inteira. A simulação é integrada uma vez, na abertura, a 1.200 passos por segundo (de −4 s a 16,6 s), guardada a 240 amostras por segundo e lida por interpolação. Qualquer quadro pode ser renderizado sozinho.
- **Corpo.** Altura e inclinação sobre duas molas (frequência de 1,75 Hz, amortecimento de 0,5). As rodas só empurram para cima; quando o chão foge mais rápido que a gravidade, a kombi voa.
- **Pilha.** Sete massas em corrente de molas, movidas pela aceleração do teto e pela inclinação. Uma segunda mola mede o peso sentido: em queda livre as panquecas abrem até 20% de folga; no pouso esmagam até 14%.
- **Frutas.** Cinco pontos em balística, quicando no topo da pilha, presos por um elástico a partir de 20 a 38 cm de altura.
- **Calda.** A poça é uma peça fixa na panqueca de cima. Os quatro fios são tubos recalculados a cada quadro: os pontos de controle são tirados da posição de cada panqueca.
- **Poeira e rastros.** Os pousos são eventos da simulação. Cada um gera de 4 a 9 bolinhas por lado. Na areia, a freada gera bolinhas para a frente e a fita do rastro é revelada conforme a kombi avança.
- **Câmera.** Coordenadas polares em volta da referência suavizada, com curvas por chaves (cúbica monotônica) para azimute, distância, altura, campo de visão e posição da kombi no quadro. A altura mínima sobre o terreno é garantida por um máximo suave.
- **Plantio.** O caminho da câmera é amostrado a cada 0,05 s antes de plantar. Nenhuma planta fica no caminho da kombi, perto da câmera ou cruzando a linha entre a câmera e as rodas.

## Como a imagem é feita

- **Profundidade de campo.** Passe próprio. O círculo de confusão de cada pixel vem da profundidade (240 px·m, com teto de 44 px na frente do foco e 13 px atrás) e a coleta usa 420 amostras em disco. O que está atrás não vaza sobre o que está em foco.
- **Oclusão de ambiente.** Calculada a partir da profundidade, com 18 amostras e raio de 0,8 m.
- **Janelas.** A cabine e o baú são cascas fechadas com as janelas descartadas no shader. O mesmo recorte vale no material de sombra, então o sol entra pela janela e ilumina o interior.
- **Sombra.** Um mapa de 4096 × 4096 que cobre 88 m em volta da kombi e anda em passos de um texel.
- **Mar.** Shader próprio: cor pela profundidade da água, reflexo do céu, renda de espuma na beirada, cristas vindo para a praia e uma maré curta que move a linha d'água.
- **Cor.** Curva de tons neutra, contraste suave, vinheta de 20% e granulado de 1,8%.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva cada imagem e junta tudo com o ffmpeg. No Mac em que foi feito (Apple M5), os 480 quadros levaram cerca de 80 segundos. O vídeo deste acervo foi recomprimido em CRF 19 (24 MB, SSIM de 0,978 contra o render original de 50 MB).

## A ordem em que foi feito

1. Perícia da referência no navegador: 20 instantes lidos, loop de 1,2 s identificado.
2. Geografia e simulação escritas sem three.js e afinadas em Node, só com números.
3. Cena construída; três quadros de teste; correções.
4. Folha de quadros a 4 por segundo do filme inteiro; correções de câmera e de relevo.
5. Vídeo, 8 cards e página de cards, entregues juntos.
6. Aprovação.

Neste motion o vídeo foi renderizado junto com os cards, antes da aprovação deles. O método pede os cards primeiro; aqui o movimento sai do mesmo código da cena e o render leva pouco mais de um minuto.

## Erros do caminho

- **Kombi voando 4 m.** Na primeira simulação os morros tinham 0,72 de amplitude e a mola catapultava: 1,5 s no ar, 40° de inclinação, um morro inteiro pulado. Uma varredura de parâmetros mostrou a faixa boa: 0,48 funciona e 0,52 já quebra o ritmo.
- **Frutas a 50 m de altura.** Com gravidade menor e um pouso forte, elas nunca voltavam. Ganharam um elástico e um limite de velocidade no quique.
- **Pilha deslocando 2 m.** A aceleração do teto no pouso era enorme. Ela passou a ser limitada, e uma trava impede mais de 7,5 cm entre panquecas.
- **Cabine de caminhão.** A primeira cabine tinha vidro em caixa, colunas e teto em laje. Foi refeita como um bloco arredondado com janelas recortadas.
- **Calda em contas.** Cápsulas presas a cada panqueca pareciam um colar. Viraram tubos contínuos.
- **Folhas de confete e capim de agulha.** As folhas ficaram menores, mais numerosas e escuras por dentro; o capim ficou mais baixo, largo e claro.
- **Bolhas gigantes ao fundo.** As árvores-bolha da outra margem estavam nascendo a 40 m da estrada. Passaram a existir só longe.
- **Rastro pela metade.** A fita do rastro usava a última amostra da simulação, que estava vazia, e terminava 14 m antes da kombi.
- **Câmera empurrada para cima.** Um morro ao sul da praia obrigava a câmera a ficar cerca de 7 m acima da estrada na chegada. O relevo ali foi rebaixado numa baixada.
- **Coqueiros atrás da pilha.** Dois coqueiros ficavam exatamente atrás das panquecas no plano final. Foram para a esquerda.
- **Tronco no canto.** O coqueiro do primeiro plano mostrava o tronco inteiro na borda direita. Foi deslocado até sobrar só a folha.

## Resultado do teste de movimento

Trecho de estrada, contra a referência (lida quadro a quadro):

| Medida | Referência | Este motion |
|---|---|---|
| Cortes secos | 0 | 0 |
| Período do quique | 1,2 s | 1,2 s |
| Fração do ciclo no ar | cerca de um terço | 33% |
| Pouso depois da crista | cerca de 0,4 s | cerca de 0,5 s |
| Inclinação | −15° a +10° | −11° a +16° |
| Frutas acima do topo | meia pilha | 0,6 m (pilha de 1,4 m) |

Filme inteiro, medido com `pericia-movimento.py` (o perfil está em `codigo/movimento.json`):

| Medida | Valor |
|---|---|
| Cortes secos | 0 |
| Mediana da energia | 10,5 |
| Pico | 15,9, aos 4,0 s (giro da câmera e salto grande) |
| Amplitude (pico ÷ mediana) | 1,5× |
| Tempo em quase-parada | 21% (a praia) |
| Último segundo | 0,6 a 1,0, abaixo da mediana |

A referência não foi medida com o mesmo script, porque o arquivo não foi baixado. O que se compara é o ritmo do quique.

## Limites conhecidos

- É um 3D estilizado em código, não um render de estúdio. De muito perto, as folhas e o capim mostram que são facetas.
- A kombi salta mais alto que a da referência (0,49 m de folga contra cerca de um terço de roda) e pousa um pouco depois.
- As folhas do coqueiro do primeiro plano, pouco desfocadas, aparecem como um pente.
- A janela de atendimento mostra pouco do interior quando a câmera está alta, no plano final.
- Aos 9 s as pranchas passam bem atrás do nariz da kombi por alguns quadros.
- Não há texto, áudio nem versão vertical.
- A crítica adversarial dos cards, prevista no método, não foi feita.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
```

- `cards` gera as oito imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/kombi-na-praia.mp4`.
- `node render.mjs at 0.12 5.0 15.9` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- `node render.mjs sheet 0 15.75 0.25 8` gera uma folha de quadros (início, fim, passo e colunas).
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
- A amplitude dos morros fica em `CFG`, em `src/geo.js`; a velocidade e a freada, no topo de `src/sim.js`; as curvas da câmera, em `src/main.js`; as cores da kombi, em `C`, em `src/kombi.js`.
