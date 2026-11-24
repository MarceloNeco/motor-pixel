Quero um motion graphic 3D no estilo "pintura a óleo", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens: toda geometria, toda cor, o filtro de pintura e a tela são gerados no próprio código. A única coisa de arquivo é a fonte da legenda.

## Meu tema

- **O lugar:** [ONDE A HISTÓRIA ACONTECE, COM OS OBJETOS PRINCIPAIS. Exemplo: "uma vinícola na serra: parreiral, galpão de pedra, adega e uma mesa posta no terraço".]
- **O que viaja de uma parada à outra:** [A COISA QUE PUXA A CÂMERA. Exemplo: "a luz da tarde", "o vento", "um rio", "um caminhão de entrega", "um cachorro".]
- **As paradas, na ordem (de três a quatro):** [EM CADA UMA, UMA COISA QUE ACONTECE DE VERDADE NA TELA E DISPARA A PRÓXIMA. Exemplo: "1. a uva é colhida; 2. o lagar esmaga; 3. o barril enche; 4. a taça é servida".]
- **Uma legenda por parada:** [FRASES CURTAS, COM PONTO FINAL, DE NO MÁXIMO 34 LETRAS E ESPAÇOS. Exemplo: "A uva amadurece no sol."]
- **Quadro final:** [O QUE PRECISA ESTAR JUNTO NA ÚLTIMA IMAGEM. Exemplo: "a vinícola inteira, com a mesa posta e o sol baixo".]
- **Formato:** 16:9, 1920×1080, 30 quadros por segundo, de 12 a 16 segundos, sem áudio.
- **Paleta:** [SUAS CORES, OU "hora dourada: céu azul profundo, horizonte quente, sombras lilás e uma cor forte para o objeto principal".]

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem uma cena completa neste estilo e o renderizador. O filtro de pintura (`src/pintura.js`) e a tinta dos materiais (`src/util.js`) servem para qualquer cena; troque o lugar (`src/mundo.js`), os objetos (`src/objetos.js`) e a linha do tempo (`src/main.js`) pelo meu tema. Se não existir, construa do zero seguindo o que está abaixo.

## O visual

Um quadro a óleo sobre tela de linho, filmado de perto. A cena é 3D, com luz e sombra de verdade, e passa por um filtro que a transforma em pintura.

- **A tela:** linho creme com a trama visível. Sobra uma margem crua de cerca de 1,3% da largura em volta da pintura, e a borda da tinta é irregular, como pincelada que não chegou até o fim.
- **A legenda:** um recorte de tela crua no canto de baixo à esquerda, com cerca de 42% da largura e 13% da altura do quadro, também de borda irregular. A frase é manuscrita, de pincel, inclinada, em anil escuro, e entra escrita da esquerda para a direita em cerca de 0,8 segundo. Nenhum outro texto aparece.
- **A pincelada:** toques grossos e bem visíveis, cada um com um tom só. Os toques ficam presos às superfícies (crescem quando a câmera chega perto) e seguem uma direção por material: deitados no céu e no mar, em diagonal nas paredes, ao comprido nas tábuas e nas folhas.
- **Cor quebrada:** dentro de cada área, alguns toques levam a cor vizinha ou a oposta (laranja dentro do verde, lilás dentro do branco) e alguns levam uma sombra fria. Saturação alta. Os escuros são anil ou verde profundo, nunca preto.
- **Relevo:** cada toque tem um lado claro e um escuro, como tinta grossa iluminada de cima e da esquerda, com marca fina de cerdas. É discreto: a cor manda, o relevo acompanha.
- **Formas:** grandes e simples. Cada objeto precisa ser reconhecido só pela silhueta, porque o filtro engole detalhe pequeno.
- **Luz:** uma luz quente e forte vinda da frente e de um lado, mais uma luz de ambiente azulada, que deixa as sombras lilás. Se o sol aparece no quadro, ele pode ficar no horizonte ao fundo enquanto a luz que modela os objetos vem da frente: é assim que os pintores fazem, e ninguém estranha.

## A câmera e o ritmo

- Um plano só, do começo ao fim. Nenhum corte, nenhum tremor.
- Câmera em perspectiva, quase na altura dos olhos (de 1,5 a 4 metros do chão), com cerca de 40 graus de campo de visão. A composição é de quadro de paisagem, não de vista aérea.
- O filme abre no plano geral do lugar, visita as paradas na ordem e termina num quadro que reúne tudo.
- **A câmera nunca para durante o filme.** Em cada parada ela continua avançando devagar (de 1 a 2,5 metros por segundo); entre as paradas, viaja mais rápido, em 1,5 a 2 segundos, com aceleração e freada suaves. O primeiro quadro já começa em movimento.
- A coisa que viaja (luz, vento, personagem) sai de uma parada um pouco antes da câmera e chega à seguinte um pouco antes dela.
- A legenda troca durante a viagem, não durante a parada.
- O último segundo é um quadro imóvel: câmera parada e tudo na cena parado (mar, folhas, pássaros).

## A técnica que faz o estilo

O filtro roda depois da cena, em cinco passes:

1. **Revelar:** converte a cena para imagem de exibição, com um pouco mais de saturação e contraste.
2. **Tensor de estrutura:** calcula, por Sobel, para onde corre a forma em cada ponto, e borra o resultado.
3. **Kuwahara anisotrópico:** em cada ponto, olha oito setores de uma elipse alongada na direção da forma e fica com a média do setor mais uniforme. É o que arredonda os toques e mantém as bordas dos objetos. Raio de cerca de 6 pixels com a pintura em 75% da resolução, seguido de uma segunda passada com metade do raio.
4. **Relevo:** monta uma altura a partir do claro e escuro da pintura mais um ruído fino esticado na direção do traço, e ilumina essa altura de cima e da esquerda.
5. **Tela:** escurece de leve onde a cor muda de uma vez (contorno), aplica a trama do linho (mais forte nos escuros), recorta a margem e o canto da legenda com borda irregular e escreve a frase.

O filtro sozinho não basta. Sobre uma cena de cor lisa ele devolve uma aquarela borrada. **O que cria os toques é a tinta dos materiais:** cada material divide a superfície em células de Voronoi alongadas, medidas no espaço do objeto, e cada célula recebe um tom próprio; algumas recebem a cor de salpico, outras a sombra fria. O filtro então arredonda essas células e as transforma em pinceladas. Céu e mar fazem o mesmo dentro dos seus próprios shaders.

## Armadilhas que já custaram retrabalho

- **Manchas pretas no Kuwahara.** Em área muito detalhada, o peso de todos os setores fica minúsculo. Se a divisão final tiver um piso alto (como 0,000001), o resultado vira preto. Divida pela soma real dos pesos.
- **Relevo forte demais.** Com ganho alto, a pintura vira folha de metal amassada. O relevo certo quase não se nota no quadro inteiro e só aparece de perto.
- **Toques quadrados.** Células em grade parecem azulejo. Use Voronoi com um pouco de distorção, e incline o eixo nas paredes para o toque sair em diagonal.
- **Toque do mar que some com a distância.** Células medidas em metros ficam menores que um pixel perto do horizonte. Meça os toques do mar em ângulo e altura aparente a partir de um ponto fixo da cena, para terem tamanho parecido na tela de perto e de longe.
- **Bicho perto da câmera.** Pássaro (ou qualquer coisa que voe) a menos de 10 metros da câmera vira uma mancha escura que tapa o quadro. Planeje a rota inteira longe da câmera em todas as paradas.
- **Objeto no caminho da câmera.** Confira cada viagem da câmera contra troncos, postes e guarda-sóis. O defeito aparece como um tronco enorme varrendo o quadro.
- **Primeiro plano tapando o assunto.** O que fica entre a câmera e o objeto da última parada cobre justamente o que você quer mostrar. Posicione os objetos da frente depois de definir todos os enquadramentos.
- **Sol atrás de folha.** Se o sol é assunto da abertura, confira que nada passa na frente dele no primeiro enquadramento.
- **Coisas enfileiradas viram uma mancha.** Vários objetos pequenos em fila, vistos de longe, se fundem no filtro. Dê pelo menos dois corpos de distância entre eles.
- **Filme que para e soca.** Com a câmera parada nas paradas, o filme fica com cara de slide. Mantenha a deriva e alongue as viagens.

## Como construir

1. **Motor.** Um projeto Node com `three` e `puppeteer-core`. Uma página HTML monta a cena e expõe `window.renderAt(t)`, que desenha o quadro do instante `t` em segundos. Tudo na cena é função pura de `t`: nada de relógio, nada de estado acumulado, para que qualquer quadro possa ser renderizado fora de ordem. Para o final imóvel, use um relógio da cena que freia e para um pouco antes do fim.
2. **Render.** Um script abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva as imagens e junta tudo num MP4 com o ffmpeg. Deixe também um modo que mostra a cena sem o filtro e outro que mostra só o resultado do Kuwahara: é assim que se descobre em que passe um defeito nasce.
3. **Cena.** Renderize a cena num alvo de ponto flutuante com antisserrilhado e só então rode os passes do filtro. Céu e mar podem ser shaders próprios, sem luz; o resto usa material fosco com a tinta em células.
4. **Legenda.** Desenhe a frase num canvas 2D com a fonte carregada antes do primeiro quadro, e use esse canvas como máscara no último passe, para a trama da tela aparecer também na letra.
5. **Linha do tempo.** Câmera por chaves (posição, giro, inclinação) com interpolação suave que não passa do alvo. Cada acontecimento (abrir, pousar, acender) é uma curva de 0 a 1 com um instante de início.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Construa a cena e renderize uma imagem parada de cada parada, mais o quadro final, já com o filtro.
2. Olhe cada imagem você mesmo, no quadro inteiro e num recorte em tamanho real, e corrija o que estiver errado (mancha preta, relevo metálico, objeto tapando o assunto, sol escondido) antes de me mostrar.
3. Me entregue as imagens numa página só, e para cada uma: a janela de tempo, o que acontece nela e como ela emenda na próxima. Espere minha aprovação.
4. Depois de aprovado, anime, renderize o vídeo e revise-o em folhas de quadros (4 por segundo).
5. Meça o movimento (diferença média entre quadros vizinhos, em baldes de meio segundo) e confira: nenhum salto de corte, paradas com movimento, viagens como picos e último segundo imóvel.
6. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não copie o lugar, os objetos, as frases ou a história de nenhum filme existente; o tema, as cores e as legendas são os meus.
- Não coloque texto fora do recorte da legenda, nem logo, nem assinatura.
- Não use preto puro, linha fina de contorno ou área lisa sem pincelada.
- Não prometa pintura feita à mão: o resultado é uma cena 3D estilizada com filtro. Diga isso com clareza se eu pedir algo que dependa de desenho quadro a quadro.
