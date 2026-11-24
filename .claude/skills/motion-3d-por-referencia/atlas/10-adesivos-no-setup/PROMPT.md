Quero um motion graphic 3D no estilo "carimbo de adesivos", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens: os objetos são geometria gerada no código e os adesivos são desenhados em canvas. Os únicos arquivos de fora são as fontes.

## Meu tema

- **De onde tudo sai:** [O RECIPIENTE QUE ABRE O FILME. Exemplo: "uma caixa de papelão", "uma mochila", "uma maleta de ferramentas".]
- **Os três objetos que saem dele, na ordem:** [TRÊS OBJETOS RECONHECÍVEIS DE LONGE, CADA UM COM UMA FACE PLANA PARA OS ADESIVOS. Exemplo: "garrafa térmica, caderno, câmera".]
- **Os adesivos:** [DE 12 A 15 ADESIVOS, COM O TEXTO EXATO DE CADA UM. Misture etiquetas com texto, palavras recortadas e ícones sem texto. Exemplo: "FRÁGIL / MANUSEIE COM CUIDADO", "BORA!", "valeu.", um raio, um planeta.]
- **As frases:** [UMA DE ABERTURA (duas linhas), UM TÍTULO GRANDE POR OBJETO (duas ou três linhas, a primeira palavra vira a palavra gigante da troca de cena), UMA FRASE LATERAL POR OBJETO E A CHAMADA FINAL (três linhas). Tudo em maiúsculas, linhas de até 11 letras.]
- **Formato:** 16:9, 1920×1080, 30 quadros por segundo, 30 segundos, sem áudio.
- **Cor do estúdio e do texto:** [SUA ESCOLHA, OU "azul de estúdio com texto creme". Se a ideia é não parecer cópia do estilo de origem, troque o azul por outra cor saturada e escura.]
- **Cores dos objetos:** [UMA COR POR OBJETO, OU "escolha uma paleta em que cada objeto contraste com o fundo e com os adesivos, e me mostre antes de fechar".]

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem a cena completa (`src/main.js`), os objetos (`src/objetos.js`), a arte dos adesivos (`src/adesivos.js`) e o renderizador (`render.mjs`). Reaproveite a estrutura e troque objetos, adesivos, frases e linha do tempo pelo meu tema. Se não existir, construa do zero seguindo o que está abaixo.

## O visual

Um estúdio de cor única, objetos 3D flutuando, adesivos de vinil e texto chapado.

- **O fundo:** um degradê de estúdio desenhado em espaço de tela (não é um cenário 3D): mais escuro em cima, mais claro numa faixa embaixo. Some um pontilhado de meio nível por pixel para o degradê não formar faixas. Só a primeira cena tem chão, que é uma mancha de sombra macia sob o objeto.
- **O texto:** uma cor só, grotesca muito pesada em itálico, larga, caixa alta, entrelinha de 0,84 a 0,86. Dois tamanhos: título grande centrado (corpo de uns 250 px em 1080p) e frase lateral (de 124 a 156 px). Nenhuma palavra em outra cor.
- **Os adesivos:** cor chapada, contorno preto grosso nos ícones, borda branca de recorte, um grão leve de impressão e uma sombra fina embutida na própria arte, que dá a espessura do vinil. Formatos variados: etiqueta retangular, oval, círculo, palavra recortada, etiqueta inclinada.
- **Os objetos:** materiais simples e limpos (papelão com fibra e ondas, plástico com verniz, alumínio escovado, couro fosco). Cada objeto tem pelo menos uma face plana onde os adesivos cabem inteiros.
- **A luz:** um ambiente de estúdio neutro com painéis claros e uma luz principal alta, à esquerda e à frente, com sombra suave. O ambiente não pode ser da cor do fundo, senão as faces em sombra ficam acinzentadas.
- **Camadas:** objeto e adesivos recebem luz; fundo e texto não recebem. O texto fica ora atrás do objeto, ora na frente, e nunca leva sombra.

## A câmera e o ritmo

- Todo ponto de vista novo é corte seco. Nenhuma fusão.
- Dentro do plano a câmera só deriva devagar. Quem dá o estalo é o adesivo ou o objeto.
- **A gramática de cada objeto, em cerca de 7 segundos:**
  1. Entra rápido (cai, sobe ou gira) e assenta em 0,5 a 0,75 s. O título grande aparece por linha, uma a cada 0,22 a 0,28 s.
  2. Corte seco para um macro da face plana. De quatro a seis adesivos carimbam, um a cada 0,35 a 0,45 s.
  3. Corte seco para o plano aberto: objeto de um lado, frase do outro. O objeto gira de 20 a 40 graus por segundo; a frase fica pelo menos 1,2 s inteira em tela.
  4. A frase sai por linha, o objeto sai girando e a palavra gigante do próximo título cruza a tela por trás dele, da direita para a esquerda, em cerca de 1 s. Ela é cheia até o corte e só contorno nos 4 quadros seguintes.
- **O carimbo:** o adesivo aparece seco, sem fade. Escala de 142% a 95,5% em 90 ms e assenta em 100% aos 200 ms. O objeto leva um tranco de 3% de escala por 180 ms.
- **O texto:** cada linha sobe 22% do corpo e assenta em 100 ms. Sai seca.
- **O soco do filme:** o recipiente treme por meio segundo, a fita é arrancada, as abas estouram passando do ponto e o primeiro objeto sai voando.
- **O final:** todos os objetos adesivados estalam no lugar um a um, a chamada entra por linha e o filme termina num quadro quase parado de 3 segundos.

## A técnica que faz o estilo

- **Tudo é função do tempo.** A página expõe `window.renderAt(t)`, que desenha o quadro do instante `t`. Sem relógio, sem estado acumulado, sem `Math.random`.
- **Planos como lista.** Cada plano tem início, fim e uma função que posiciona objetos e câmera. A troca de plano é o corte seco.
- **Adesivo é um plano com textura.** Cada face que recebe adesivo tem uma âncora (x para a direita, y para cima, z para fora). O adesivo fica 0,35 mm acima da face, com `polygonOffset`, e a ordem de desenho segue a ordem dos carimbos.
- **Texto em passadas separadas.** O quadro é desenhado em cinco passadas: fundo, sombra de chão, texto de trás, objetos, texto da frente. É o que permite o texto ficar atrás ou na frente do objeto sem brigar com a transparência.
- **Texto e carimbo entram secos, o resto borra.** O rastro de movimento é a média de 16 sub-quadros dentro de meio quadro. Objetos, câmera e palavra gigante usam o instante do sub-quadro; texto e adesivos usam o instante-base do quadro.
- **Câmera de macro presa à face.** No macro, a câmera é posicionada no espaço da âncora (ponto de mira, direção, distância), não em coordenadas do mundo.
- **Superamostragem.** A cena é desenhada com o dobro da resolução e reduzida.

## Armadilhas que já custaram retrabalho

- **Ambiente da cor do fundo.** Deixa o lado em sombra dos objetos cinza e azula os adesivos brancos. Use ambiente neutro.
- **Objeto liso cobrindo o título.** Um notebook fechado na frente do título parece um cartão em branco. Mostre o objeto de um ângulo que o identifique, ou ponha o título na frente dele.
- **Frase sem tempo de leitura.** Duas frases laterais no mesmo plano de 2,6 s ficam menos de 1 s cada. Uma frase por plano.
- **Texto aparecendo pelos vãos da palavra gigante.** A frase precisa sair antes de a palavra chegar nela.
- **Palavra gigante na frente de um macro claro.** Texto claro sobre objeto claro vira ruído. Passe a palavra por trás do objeto.
- **Verniz escondendo o relevo.** Uma camada de verniz lisa por cima apaga o amassado da fita. Use só rugosidade baixa.
- **Textura que não emenda.** Manchas desenhadas sem repetir nas bordas marcam uma grade na face. Desenhe cada mancha também deslocada de uma largura da textura.
- **Rastro em degraus.** Com 8 sub-quadros, a palavra gigante mostra 8 contornos. Use 16.
- **Cor do vídeo diferente da cor dos quadros.** Quadros em JPEG vão para o MP4 em outro padrão de cor. Converta para BT.709 de faixa limitada e marque o arquivo.

## Como construir

1. **Motor.** Um projeto Node com `three` e `puppeteer-core`. Uma página HTML monta a cena e expõe `window.renderAt(t)` e a lista dos momentos-chave.
2. **Render.** Um script abre a página no Chrome sem janela, chama a página quadro a quadro, salva as imagens e junta tudo num MP4 com o ffmpeg.
3. **Adesivos primeiro.** Desenhe todos em canvas e gere uma folha com eles sobre a cor do objeto mais claro, para conferir texto, acento e recorte antes de entrar no 3D.
4. **Objetos.** Um construtor por objeto, que devolve o grupo e as âncoras das faces.
5. **Linha do tempo.** Uma tabela de planos e uma lista de carimbos com âncora, posição, largura, giro e instante.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Me mostre a folha de adesivos e uma imagem parada de cada momento: abertura, adesivos no recipiente, macro, estouro, e para cada objeto o título, o macro e a frase; por fim o quadro final.
2. Olhe cada imagem você mesmo e corrija enquadramento e legibilidade antes de me mostrar.
3. Depois de aprovado, renderize um rascunho rápido, sem superamostragem e sem rastro, e meça o movimento: os planos abertos não podem ficar parados e as trocas de objeto precisam durar cerca de 1 s.
4. Renderize o vídeo final e revise em folhas de quadros as quatro passagens rápidas: a entrada, o estouro e as trocas de objeto.
5. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não copie adesivos, palavras, objetos nem frases de nenhum exemplo existente; o tema, os textos e as cores são os meus.
- Não use fusão entre planos, fade em texto, zoom digital, tremor de câmera, partículas, brilho de lente ou vinheta.
- Não ponha logo de terceiros nos objetos nem texto legível em telas: tela de aparelho leva só barras coloridas.
- Não prometa acabamento fotográfico: o resultado é 3D limpo, feito em código.
