Quero um motion graphic 3D no estilo "jogo de labirinto em miniatura", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens: personagens, labirinto, piso, luzes e texturas são todos gerados no próprio código.

## Meu tema

- **Herói:** [O SEU MASCOTE OU UM PERSONAGEM QUE VOCÊ TEM DIREITO DE USAR, com a forma e a cor. Exemplo: "o Clawd, mascote do Claude Code: um bloco laranja rgb(215,119,87) mais largo que alto, dois olhos pretos retangulares, um bracinho de cada lado e quatro perninhas".]
- **Perseguidores (3 ou 4):** [QUEM PERSEGUE O HERÓI, cada um com forma, cor e jeito de andar diferentes. Exemplo: "um ciclope verde que anda aos pulos, um monstrinho violeta de três olhos que ginga, um fantasma branco e um fantasma menta que flutuam". Se o vídeo for sobre o seu público, os perseguidores podem ser os problemas dele.]
- **O item que vira o jogo:** [O QUE O HERÓI PEGA PARA PASSAR A PERSEGUIR. Exemplo: "um núcleo de energia com dois anéis girando".]
- **O mundo do labirinto:** [DO QUE SÃO FEITAS AS PAREDES E O CHÃO, no domínio do seu tema. Exemplo: "uma placa de circuito azul-noite, em que os chips são as paredes e as trilhas de cobre ficam no chão".]
- **Placar:** [OS DOIS RÓTULOS DOS CANTOS, ou "sem placar". Exemplo: "Pontos" à esquerda e "Vidas" à direita, com as vidas desenhadas como miniaturas do herói.]
- **Formato:** 16:9, 1920×1080, 30 quadros por segundo, 15 segundos, sem áudio.

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem a cena completa neste estilo (`src/main.js`), as fontes e o renderizador (`render.mjs`). Troque o herói (seção "o herói"), os perseguidores (seção "os perseguidores" e a lista `FOES`), as cores e os rótulos do placar (`src/index.html`). Se não existir, construa do zero seguindo o que está abaixo.

## O mecanismo

Uma partida de jogo de labirinto filmada como brinquedo de mesa, à noite, num plano só. A câmera segue o herói de perto e a história tem a virada do gênero: ele foge, pega o item que vira o jogo, encara os perseguidores e sai caçando. No fim a câmera sobe e mostra o tabuleiro inteiro.

## O visual

- **Ambiente:** azul-noite quase preto, névoa da mesma cor, vinheta forte. Uma luz-chave quente de cima que segue a ação e vem sempre do lado em que a câmera está (o rosto que a câmera vê fica aceso). Um recorte azul frio por trás. Quase nada de preenchimento.
- **Piso:** uma mesa preta espelhada (reflexo de verdade), por cima a textura do tabuleiro, translúcida, e por cima um véu que apaga a mesa longe do tabuleiro.
- **Paredes:** baixas, bem abaixo da altura dos personagens (no nosso, 0,22 para corredores de 1,3), de borda arredondada, com acabamento de verniz. Uma moldura única, de cantos redondos, contorna tudo.
- **Pontos de luz:** um em cada célula livre e um entre células vizinhas. Pequenos (raio de uns 6% da célula), quentes, um pouco acima do chão, cada um com uma mancha de luz no piso. Eles respiram devagar e, quando o herói chega, são sugados até ele em 0,1 s.
- **Personagens:** plástico brilhante de brinquedo (verniz por cima da cor), olhos grandes. Os perseguidores têm olhos brancos com pupila que segue o herói o tempo todo.
- **Acabamento:** desfoque de profundidade com o foco no herói, bloom leve só no que passa de 1,0, desfoque de movimento (vários subquadros por quadro), tom ACES, grão fino.

## O texto

- Só o placar, pequeno, nos cantos de cima: rótulo em monoespaçada, versal, espaçada, cerca de 15 px; número em sem serifa extranegrita, cerca de 44 px, que dá um pulinho de escala a cada ponto grande.
- A cada captura, os pontos dela (+100, +200…) saltam do lugar da captura com um brilho na cor do perseguidor, sobem um pouco e somem em menos de 1 s. Sempre dentro do quadro e fora do placar.
- Nenhum outro texto.

## A coreografia (15 s)

1. **A fuga (0–4,7 s):** o herói vem recolhendo pontos em direção à câmera; um perseguidor aparece de frente (o herói arregala os olhos e levanta os bracinhos), ele desvia, sobe e corta pelo meio do labirinto, com perseguidores chegando por lados diferentes.
2. **O corredor comprido (4,7–7,7 s):** os perseguidores ficam em fila atrás dele, cada um no seu jeito de andar. A câmera vai à frente de todos.
3. **A virada (7,7 s):** ele pega o item: clarão rápido na tela inteira, onda de luz no chão, faíscas, uma tremida curta de câmera, um pulinho com os braços para cima. Um anel de energia aparece em volta dele e o corpo passa a brilhar.
4. **O encontro (7,9–8,9 s):** ele dá meia-volta. Os perseguidores freiam, empalidecem sem perder a cor, tremem, arregalam os olhos e encolhem as pupilas. A câmera para, de perfil: herói de um lado, perseguidores do outro. É a imagem do filme.
5. **A caçada (8,9–12,4 s):** ele dispara de volta e pega um por um, a cada 0,85 s. Em cada captura: um tranco, o perseguidor gira como pião enquanto sobe em arco por 0,4 s e estoura em faíscas da cor dele. O placar soma.
6. **O tabuleiro inteiro (12,3–15 s):** a câmera sobe até quase de cima e para. O herói continua recolhendo pontos e o placar continua contando; o caminho percorrido fica escuro, sem pontos.

## A câmera e o ritmo

- Perspectiva com 32 graus de campo de visão. A câmera é posição e alvo por chaves, somados à posição do herói suavizada no tempo (assim ela não repete cada esquina). Nas chaves marcadas a câmera para de verdade.
- Ela troca de lado conforme a história: à frente do herói na abertura, atrás quando ele sobe, à frente no corredor comprido, de perfil no encontro, à frente de todos na caçada.
- O herói nunca fica de costas por muito tempo: sempre que possível a câmera está do lado para onde ele olha.

## Armadilhas que já custaram retrabalho

- **Paredes altas escondem os personagens.** Com as paredes na altura do corpo, a câmera 3/4 só via cabeças no corredor. Paredes baixas, como no brinquedo.
- **Tela preta.** O `ShaderPass` do three.js clona os uniformes e descarta textura de render target passada no construtor. Atribua a textura de novo depois de criar o passe.
- **Tudo estourado no primeiro teste.** Ambiente, bloom e pontos de luz somados lavam a cena. Pontos pequenos, bloom só acima de 1,0 e luz de ambiente baixa: o escuro é o que faz os pontos brilharem.
- **Luz que anda com o herói em cima do rosto.** Uma luz pontual na frente dele estoura os olhos; energizado, estoura quem ele persegue; muito alta, vira reflexo solto nas paredes. Deixe-a no centro dele, baixa e fraca.
- **Rosto no escuro.** Com a luz-chave fixa de um lado, o rosto fica preto sempre que a câmera passa para o outro. A luz-chave acompanha o lado da câmera.
- **Perseguidor pego mostrando a barriga escura.** Uma cambalhota expõe a parte de baixo. Faça-o girar como pião: a cor continua à vista.
- **Pontos que saltam para fora do quadro ou em cima do placar.** Limite a posição na tela.
- **Final morto.** Se o herói para no fim, o placar para junto e o plano geral vira foto. Ele continua andando.
- **Herói que lê como um cubo qualquer.** Um mascote de pixel tem proporção própria: mais largo que alto, raso, pernas visíveis. Confira de frente, de lado e de 3/4.

## Como construir

1. **Motor.** Projeto Node com `three` e `puppeteer-core`. Uma página monta a cena e expõe `window.renderAt(t, sub)`. Tudo é função pura de `t`: não há relógio nem estado acumulado.
2. **Labirinto.** Um mapa em texto (`#` parede, `.` corredor). As paredes saem dos retângulos máximos do mapa.
3. **Personagens andando.** Cada um tem trechos: uma lista de pontos da grade (esquinas arredondadas) e chaves de tempo → posição no caminho, interpoladas por cúbica monotônica (não volta nem passa do ponto). Entre trechos ele para e gira. Velocidade, aceleração e giro saem da própria curva e alimentam a inclinação, o andar e as freadas.
4. **Pontos comidos.** O caminho do herói é conhecido de antemão: percorra-o uma vez no início e anote o instante em que ele passa por cada ponto.
5. **Desfoque de movimento.** Para cada quadro, renderize 8 subquadros dentro de meio quadro (obturador de 180 graus), some em luz linear e só depois aplique tom, vinheta e grão.
6. **Placar.** HTML por cima do canvas, fotografado junto.
7. **Render.** Chrome sem janela chama `renderAt` quadro a quadro, salva as imagens e o ffmpeg junta o MP4 (H.264, bt709, faixa de vídeo).

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Construa a cena e confira a coreografia numa vista de cima, sem pós-processamento.
2. Renderize uma imagem parada de cada momento: a abertura, o susto, a fuga, o corredor comprido, a virada, o encontro, a caçada, uma captura e o tabuleiro inteiro.
3. Olhe cada imagem você mesmo e corrija o que estiver errado (tela preta, personagem atrás de parede, rosto no escuro, luz estourada) antes de me mostrar.
4. Me entregue as imagens e espere minha aprovação.
5. Depois de aprovado, renderize uma prévia rápida (1 amostra por quadro), revise em folhas de quadros (5 por segundo) e só então o vídeo final com desfoque de movimento.
6. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não copie personagens, desenho de labirinto, sons ou placar de nenhum jogo existente. O herói, os perseguidores e o labirinto são do meu tema.
- Não corte o plano: é um plano só, do começo ao fim.
- Nenhum texto em tela além do placar e dos pontos das capturas.
