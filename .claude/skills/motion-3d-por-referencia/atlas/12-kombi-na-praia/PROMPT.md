Quero um motion graphic 3D no estilo "viagem em miniatura", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens: o veículo, a carga, o relevo, as plantas, o mar e o céu são todos gerados no próprio código.

## Meu tema

- **Veículo:** [O QUE VIAJA. Exemplo: "uma kombi food truck de brinquedo, cabine azul e baú vermelho com janela de atendimento aberta".]
- **Carga no teto:** [O QUE ELE LEVA E QUE BALANÇA. Exemplo: "uma pilha de 7 panquecas com calda escorrendo e frutas por cima". Precisa ser uma pilha ou torre de peças soltas, para ter balanço.]
- **Mundo da estrada:** [POR ONDE ELE PASSA. Exemplo: "estrada de terra entre morros verdes, arbustos floridos e montanhas em cone ao fundo".]
- **Destino:** [ONDE ELE CHEGA E PARA. Exemplo: "uma praia de baía com mar turquesa, coqueiros, guarda-sol e um veleiro".]
- **Detalhe próprio na lataria:** [UM DESENHO SEU, SIMPLES. Exemplo: "uma faixa creme ondulada na lateral e um emblema redondo neutro no nariz". Nunca o logotipo ou a pintura de uma marca existente.]
- **Formato:** 16:9, 1920×1080, 30 quadros por segundo, 16 segundos, sem áudio e sem texto em tela.

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem a cena completa neste estilo. A geografia e a rota ficam em `src/geo.js`, a física do veículo em `src/sim.js`, o modelo em `src/kombi.js`, o relevo, o mar e o céu em `src/mundo.js`, as plantas e os adereços em `src/flora.js`, o acabamento em `src/pos.js` e a câmera e a montagem em `src/main.js`. Troque o veículo, a carga, as cores e o destino. Se não existir, construa do zero seguindo o que está abaixo.

## O mecanismo

A câmera não larga o veículo: ele quica de morro em morro com a carga balançando, o destino aparece no último salto e ele só para quando chega. São 16 segundos de um único plano, sem corte e sem fade.

## O visual

- **Miniatura:** tudo parece brinquedo de plástico ou massinha, com cantos arredondados, cores cheias e sombras macias. A profundidade de campo é curta, de maquete: só o veículo fica nítido; o que está a 4 m da câmera e o que está no horizonte borram.
- **Veículo:** corpo em caixas arredondadas, com as janelas recortadas de verdade na lataria (dá para ver os bonecos lá dentro), faróis com aro cromado, para-choque claro, rodas com calota e faixa branca, para-lamas em arco. A janela de atendimento é um furo no baú, com moldura, balcão, toldo levantado por duas hastes, prateleiras com potes e uma máquina branca no interior.
- **Carga:** peças empilhadas, cada uma uma peça solta, com as bordas levemente irregulares. A calda é uma poça no topo e fios contínuos que acompanham as peças quando elas se deslocam. As frutas ficam soltas por cima.
- **Estrada:** terra clara que serpenteia, com dois sulcos de pneu e as bordas mais escuras, sobre morros que se repetem a cada 12 m.
- **Plantas:** arbustos feitos de milhares de folhas pequenas presas a bolhas escuras, mais claros no topo e escuros por dentro, alguns com pontinhos de flor. Tufos de capim baixos e claros. Árvores de copa redonda ao fundo.
- **Fundo:** montanhas em cone, lisas, verde-água, com a base mais clara de névoa. Céu azul em gradiente e nuvens de esferas fundidas.
- **Destino (praia):** areia clara com faixa molhada perto da água, mar raso turquesa que escurece para o fundo, renda de espuma na beirada e duas ou três cristas vindo para a praia, coqueiros inclinados para o mar, guarda-sol listrado, espreguiçadeiras, bola, pranchas, estrelas-do-mar, um veleiro e gaivotas.
- **Luz:** sol quente a uns 40° de altura, vindo da frente e do lado visível do veículo, com luz de céu forte para as sombras não fecharem.
- **Acabamento:** oclusão de ambiente nos encontros, brilho leve nos claros, vinheta suave e granulado quase invisível.

## A física do veículo

- A rota e o relevo são funções puras de posição. O veículo anda a 10 m/s e os morros têm 12 m entre cristas, o que dá um quique a cada 1,2 s.
- O corpo é simulado no plano vertical (altura e inclinação) sobre duas molas, uma por eixo. As rodas só empurram para cima; quando o chão foge, ele voa.
- Em cada ciclo: decola perto da crista, fica cerca de um terço do tempo no ar, pousa meio segundo depois e afunda a suspensão, sobe de nariz para cima e decola de novo.
- No ar, ele busca devagar a inclinação do chão à frente, para pousar de nariz para baixo.
- A última crista é mais alta e vem antes de uma descida: é o salto grande (0,7 s no ar).
- A carga é uma corrente de molas: cada peça segue a de baixo com atraso. Em queda livre as peças abrem folga; no pouso, esmagam e alargam. Uma trava impede que a pilha desmonte.
- As frutas são balística com gravidade menor que a do veículo: flutuam quando ele cai e voltam depois do pouso. Um elástico invisível impede que fujam.
- Na freada o nariz mergulha (exagerado de propósito) e, quando para, o corpo balança de volta.
- A poeira são bolinhas opacas que nascem em cada pouso, crescem rápido, encolhem e somem. Na areia, a freada joga bolinhas para a frente e deixa o rastro dos pneus.

## A coreografia (16 s)

1. **Estrada (0–3,3 s):** três quiques completos. A câmera vai à frente, no três-quartos do lado da janela, a 21 m, com 25° de campo de visão. O veículo fica à direita do centro e sobe e desce no quadro.
2. **O destino aparece (3,3–4,6 s):** a câmera rodeia o veículo uns 50° e abre o campo de visão; o que escondia o destino sai pela esquerda e ele entra pela direita.
3. **O salto grande (4,6–5,4 s):** de perfil, contra o destino. É o pico de energia.
4. **A descida (5,4–8,4 s):** a câmera volta para a frente e desce junto; a vegetação muda (entram os coqueiros) e a estrada vira areia.
5. **A freada (8,4–11,9 s):** um S suave em direção à água e a parada. A câmera passa à frente e assenta.
6. **O destino (11,9–16 s):** o veículo parado. A câmera sobe 2,4 m devagar e abre a paisagem. Só se mexem as ondas, as folhas, o veleiro e as gaivotas.

## A câmera e o ritmo

- A câmera é descrita em coordenadas polares em volta de uma referência suavizada do veículo (azimute, distância, altura), com curvas por chaves. A referência segue o veículo com atraso e compensa pela velocidade suavizada: na freada, a câmera passa à frente sozinha e assenta.
- A altura da câmera segue a estrada suavizada, não o quique. O alvo segue só um terço do salto.
- O foco é sempre a distância até o veículo.
- O arco de energia: viagem agitada e regular, pico no giro com o salto, queda na freada, últimos 4 s quase parados.

## Armadilhas que já custaram retrabalho

- **Veículo descontrolado.** Com morros altos demais ele pula um morro inteiro e a simulação vira caos. Há um limite estreito: com 10 m/s e 12 m entre cristas, amplitude de 0,48 m funciona e 0,52 m já quebra o ritmo. Rode a simulação sozinha, imprima tempo no ar, altura e inclinação, e só então desenhe.
- **Carga e frutas indo embora.** Um pouso forte lança tudo longe. Limite a aceleração que chega à pilha, trave o deslocamento entre peças e prenda as frutas com um elástico acima de uma certa altura.
- **Morro na cara da câmera.** O relevo que fica bonito ao fundo pode empurrar a câmera para cima na chegada. Calcule o caminho da câmera antes de plantar e de fechar o relevo, e rebaixe o terreno por onde ela passa.
- **Planta cobrindo o veículo.** Com o caminho da câmera calculado, recuse qualquer planta alta perto da câmera ou que cruze a linha entre a câmera e as rodas do veículo. Plantas baixas abaixo dessa linha podem ficar: viram o primeiro plano borrado.
- **Interior escuro.** Se a janela for só um furo na imagem, o mapa de sombra continua vendo a lataria fechada e o interior fica preto. O mesmo recorte precisa valer no material de sombra.
- **Calda em contas.** Pedaços de calda presos a cada peça parecem um colar. Faça cada fio como um tubo contínuo, recalculado a cada quadro pelas posições das peças.
- **Cabine de caminhão.** Um teto em laje com colunas vira caminhão. A kombi é um bloco só, bem arredondado, com as janelas recortadas e um para-brisa que dobra a esquina.
- **Folhas de papel picado.** Folhas grandes e todas claras parecem confete. Folhas pequenas (13 a 25 cm), muitas, escuras por dentro e na base.
- **Sombra fervendo.** Se o mapa de sombra segue o veículo de forma contínua, as bordas tremem. Mova-o em passos de um texel.
- **Rastro invisível.** Confira até onde a fita do rastro foi gerada: um vetor de amostras com a última posição vazia cortou o rastro pela metade.

## Como construir

1. **Motor.** Projeto Node com `three` e `puppeteer-core`. Uma página monta a cena e expõe `window.renderAt(t)`. Tudo é função pura de `t`: a simulação é integrada uma vez na abertura (1.200 passos por segundo) e lida por interpolação.
2. **Geografia.** Um arquivo sem three.js com a linha da costa, a rota, a altura e a cor do chão em qualquer ponto. Ele serve à malha, à simulação, à câmera e ao plantio, e roda em Node para afinar a física.
3. **Terreno.** Malha fina perto da rota com a cor pintada em código numa textura; malhas grossas para longe, com cor por vértice.
4. **Profundidade de campo.** Passe próprio: guarde o círculo de confusão por pixel (negativo na frente do foco) e colete em disco, sem deixar o que está atrás vazar sobre o que está em foco.
5. **Render.** Chrome sem janela chama `renderAt` quadro a quadro, salva as imagens e o ffmpeg junta o MP4.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Feche a simulação em Node, só com números.
2. Construa a cena e renderize uma imagem parada de cada momento: no ar, no pouso, na subida, o destino aparecendo, o salto, a descida, a freada e o plano final.
3. Olhe cada imagem você mesmo e corrija o que estiver errado antes de me mostrar. Tire também uma folha de quadros a 4 por segundo do filme inteiro, para ver a câmera.
4. Me entregue as imagens numa página só, com as imagens embutidas no próprio arquivo, e para cada uma: a janela de tempo, o que se move primeiro e como emenda na próxima. Espere minha aprovação.
5. Depois de aprovado, renderize o vídeo e meça o arco de energia.
6. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não copie logotipo, pintura, personagem ou mascote de nenhuma marca; o desenho da lataria é o meu.
- Não corte o plano e não use crossfade: é um plano único.
- Nenhum texto em tela.
- Não deixe nada alto entre a câmera e o veículo.
- Não prometa render de estúdio: o resultado é um 3D estilizado em código.
