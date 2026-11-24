Quero um motion graphic 3D no estilo "planta técnica", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens: toda geometria, todo traço e toda textura são gerados no próprio código. A única coisa de arquivo é a fonte dos letreiros.

## Meu tema

- **O que é construído:** [O OBJETO, ESPAÇO OU SISTEMA. Exemplo: "uma cafeteria de esquina", "uma bicicleta", "um quiosque de feira".]
- **As três etapas, na ordem de montagem, de baixo para cima:** [TRÊS NOTAS DE DUAS LINHAS CURTAS, EM MAIÚSCULAS. Exemplo: "1 FUNDAÇÃO / EM RADIER", "2 PAREDES / DE ALVENARIA", "3 TELHADO / DE DUAS ÁGUAS".]
- **Medidas que aparecem nas cotas:** [LARGURA, PROFUNDIDADE E ALTURA. Exemplo: "8,00 × 6,00, pé-direito de 2,70".]
- **Carimbo da folha:** [TÍTULO EM DUAS LINHAS, NÚMERO DO DESENHO E ESCALA. Exemplo: "CASA TÉRREA / DE 48 M²", "DES. A-101", "ESC. 1:50".]
- **Formato:** 16:9, 1920×1080, 24 quadros por segundo, cerca de 15 segundos, sem áudio.
- **Cor da folha e do traço:** [SUA ESCOLHA, OU "papel claro com traço azul". Evite o azul clássico de planta se a ideia é não parecer cópia do estilo de origem.]
- **Cores do objeto pronto:** [SUA PALETA, OU "escolha uma paleta curta e me mostre três ou quatro opções no quadro final antes de fechar".]

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem uma cena completa neste estilo (`src/main.js`) e o renderizador (`render.mjs`). Reaproveite a estrutura e troque a casa, as notas, as cotas e a linha do tempo pelo meu tema. Se não existir, construa do zero seguindo o que está abaixo.

## O visual

Uma folha de desenho técnico sobre uma mesa, com o desenho que vira objeto em cima dela.

- **A folha:** uma cor só, com grão de papel, vincos de dobra gastos, malha de construção (linha fina a cada metro, linha marcada a cada quatro), moldura e carimbo no canto de baixo à direita. A folha é bem maior que o quadro da vista de cima, para a mesa só aparecer nos cantos quando a câmera inclinar.
- **O traço:** uma cor só, em duas espessuras. Forte (cerca de 3 px) para a estrutura principal; fino (1,5 px) para esquadrias, cotas e detalhes. Projeção do que está acima (o telhado, na planta) em tracejado.
- **A planta:** paredes com espessura e preenchimento leve, vãos de porta com a folha e o arco de abertura, janelas com as linhas do vidro, nome dos cômodos, cotas com traço de 45 graus nas pontas e o número ao lado.
- **As notas:** bolinha com o número e duas linhas de texto em maiúsculas. Ficam empilhadas como o objeto: a nota 1 embaixo, a 3 em cima. Assim, quando saem da folha, cada uma já está na altura da parte de que fala e as linhas-guia não se cruzam.
- **O aramado:** todas as arestas do objeto. As visíveis em traço cheio; as ocultas em tracejado mais fino e mais claro.
- **O sólido:** cores chapadas e foscas, com o traço da folha continuando por cima como contorno. O objeto termina de pé em cima da própria planta, com as cotas ainda no chão.
- **Luz:** um sol de lado, a uns 60 graus da direção da câmera, com sombra visível na folha. Sol forte e ambiente baixo, para as faces terem volume.

## A câmera e o ritmo

- Câmera com perspectiva e lente longa (campo de visão de uns 30 graus).
- Um único movimento: começa olhando de cima, reta, e inclina até três quartos (cerca de 32 graus de altura e 31 de giro) em pouco mais de 2 segundos. Depois disso fica parada até o fim.
- Ordem do filme:
  1. A planta se desenha, na ordem em que uma caneta passaria: paredes, esquadrias, projeções, cotas. As notas aparecem de baixo para cima.
  2. Pausa de meio segundo.
  3. A câmera inclina. Enquanto inclina, o desenho sobe da folha como aramado e as notas voam para o lado do objeto. As linhas-guia se desenham quando a câmera para.
  4. Pausa.
  5. Uma etapa por nota. No início de cada etapa a bolinha da nota muda para a cor de destaque e volta ao fim. Cada peça entra de um jeito que lembra a obra: laje e paredes sobem do chão, esquadrias brotam uma a uma, telhado desenrola da cumeeira.
  6. Pausa entre as etapas e pelo menos 1,5 segundo parado no final.
- O que não faz parte da etapa fica parado. Sem movimento decorativo.

## A técnica que faz o estilo

- **Linhas grossas:** `LineSegments2` com `LineMaterial`, espessura em pixels, tracejado ligado só onde precisa.
- **Arestas:** `EdgesGeometry` de cada peça.
- **Visível e oculta:** cada peça tem três versões da mesma geometria. O sólido; um "fantasma" que só escreve profundidade, sem cor; e as arestas, desenhadas duas vezes: uma com o teste de profundidade normal (traço cheio) e outra com o teste invertido (tracejado).
- **Ordem de desenho, que é o ponto delicado:** sólidos primeiro, depois o que está deitado na folha, depois os fantasmas, depois as arestas. O fantasma precisa ir para a fila das transparências com `renderOrder` maior que o da planta, senão ele esconde a planta e os sólidos de dentro.
- **Traço que se desenha:** cada linha é picada em pedaços de uns 10 cm, na ordem da caneta, e o filme mostra os primeiros n pedaços (`instanceCount`).
- **Aramado que sobe:** um grupo com todas as peças, com a escala vertical indo de zero a um.
- **Notas:** planos sempre de frente para a câmera, sem teste de profundidade. A posição final é um ponto fixo do quadro, calculado a partir da câmera final.
- **Textos:** desenhados em canvas e aplicados como textura.

## Armadilhas que já custaram retrabalho

- **Letreiro some sob o aramado.** Texto deitado na folha desenhado depois dos fantasmas desaparece quando o aramado sobe. Dê a ele a mesma ordem da planta.
- **Emenda de parede vira aresta.** Onde duas paredes se encostam aparece uma linha que não existe na obra. Filtre essas arestas.
- **Mesa ocupando o quadro.** Com a folha do tamanho do quadro, um terço da imagem inclinada vira mesa. Aumente a folha para trás e para o lado oposto à câmera.
- **Carimbo cortado atrás das notas.** Escolha o lado do giro da câmera pensando em onde o carimbo e as notas vão cair.
- **Objeto da cor da folha.** Parede clara em folha clara some. Teste a paleta do objeto no quadro final antes de fechar.
- **Mistura de cores na bolinha.** A troca entre a cor normal e a de destaque passa por um tom sujo se for lenta. Faça em menos de um terço de segundo.
- **Classificação errada nos primeiros quadros da subida.** Com tudo achatado na folha, visível e oculta se confundem. Só mostre o aramado depois que ele tiver alguns centímetros de altura.

## Como construir

1. **Motor.** Um projeto Node com `three` e `puppeteer-core`. Uma página HTML monta a cena e expõe `window.renderAt(t)`, que desenha o quadro do instante `t` em segundos. Tudo é função pura de `t`, sem relógio e sem estado acumulado, para que qualquer quadro possa ser renderizado fora de ordem.
2. **Render.** Um script abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva as imagens e junta tudo num MP4 com o ffmpeg.
3. **Planta a partir dos dados.** Descreva paredes e aberturas uma vez só, em uma tabela, e gere dali a planta, o aramado e o sólido. O contorno da planta é a borda da união dos retângulos das paredes, menos os vãos das portas.
4. **Linha do tempo.** Uma tabela de tempos: desenho da planta, inclinação, subida, início de cada etapa. Cada peça tem a etapa, o atraso dentro dela e o jeito de entrar.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Construa a cena e renderize uma imagem parada de cada momento: planta pronta, câmera inclinando, aramado completo, cada etapa e o final.
2. Olhe cada imagem você mesmo e corrija o que estiver errado antes de me mostrar.
3. Se eu não tiver definido as cores, me mostre três ou quatro opções de folha e de objeto lado a lado e espere eu escolher.
4. Depois de aprovado, renderize o vídeo e revise-o em folhas de quadros nas passagens: o início da subida, cada etapa e o final.
5. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não copie o tema, os textos, as medidas nem a cor de folha de nenhum exemplo existente; o objeto, as notas e as cores são os meus.
- Não ponha mais de três notas nem mais de três cotas: o desenho precisa continuar legível.
- Não mexa a câmera depois da inclinação.
- Não prometa acabamento de render de arquitetura: o resultado é um diagrama estilizado, de cores chapadas.
