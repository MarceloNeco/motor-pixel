Quero um motion graphic 3D no estilo "maquete em corte", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens: toda geometria e toda textura são geradas no próprio código.

## Meu tema

- **História:** [DESCREVA A ROTINA OU JORNADA EM ETAPAS, NA ORDEM. Exemplo: "o dia de uma dona de cafeteria: abre a loja, liga a máquina, atende o primeiro cliente, fecha o caixa, apaga a luz".]
- **Lugar:** [ONDE ACONTECE. Exemplo: "uma cafeteria de dois ambientes com um quintal".]
- **Formato:** 16:9, 1920×1080, 24 quadros por segundo, entre 20 e 30 segundos, sem texto em tela e sem áudio.
- **Cores:** [SUA PALETA, OU "escolha uma paleta curta: um fundo claro, uma cor para o que o olho deve seguir e duas cores de apoio".]

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem uma cena completa neste estilo (`src/main.js`) e o renderizador (`render.mjs`). Reaproveite a estrutura e troque a casa, os móveis, as poses e a linha do tempo pelo meu tema. Se não existir, construa do zero seguindo o que está abaixo.

## O visual

Uma casa de boneca vista em corte, como uma maquete de arquiteto sobre uma mesa de estúdio.

- **O corte:** só duas paredes (a do fundo e a da esquerda); a frente e a direita ficam abertas para a câmera. Sem telhado. Um contorno escuro e fino marca o topo das paredes e a borda das lajes, que é o que faz ler como "corte".
- **A base:** tudo fica sobre uma placa grossa, com as laterais à mostra, pousada num fundo infinito de uma cor só, sem horizonte. A única coisa no fundo é a sombra da maquete.
- **Escala de miniatura:** as texturas são aumentadas de propósito. Tábuas de piso largas, veio de madeira grosso, tecido com trama visível. É isso que faz a peça parecer pequena e feita à mão; textura fina faz parecer um prédio de verdade.
- **Formas:** cantos arredondados em todos os móveis, cores chapadas e foscas, poucos objetos por cômodo e cada um reconhecível de longe.
- **O personagem:** um boneco articulado simples (cabeça, tronco, braços com cotovelo, pernas com joelho), com cerca de 1,65 m na escala da casa. Sem rosto detalhado: dois pontos como olhos bastam para mostrar para onde ele olha.
- **Luz:** um sol quente e forte vindo do lado, com sombras macias e bem visíveis, mais uma luz ambiente fraca. O sol precisa estar a uns 50 a 60 graus de distância da direção da câmera; se vier de trás da câmera, as sombras somem atrás dos objetos e a imagem fica chapada.
- **Acabamento:** oclusão de ambiente nos encontros entre peças e um desfoque leve no alto e no pé do quadro, que reforça a sensação de miniatura.

## A câmera e o ritmo

- Câmera ortográfica (sem perspectiva), olhando de cima e de lado: cerca de 38 graus de giro e 27 graus de inclinação.
- A câmera fica parada dentro de cada plano. Nada de zoom, giro ou tremor.
- Cada etapa da história tem seu enquadramento, fechado no cômodo onde ela acontece. Toda troca de plano é corte seco, feito no meio de um passo do personagem; nunca crossfade.
- O filme abre com a maquete se montando sozinha em cerca de 2,5 segundos (base, pisos, paredes, depois os móveis, um a um, cada peça crescendo um pouco além do tamanho e voltando) e fecha num plano geral parado por pelo menos 1,5 segundo.
- O ritmo alterna pausa e estalo. Depois de cada ação, o personagem segura a pose por meio segundo ou mais, e nada mais se mexe. Escolha um momento para ser o estalo principal do filme (um salto, uma queda, uma luz que acende) e deixe o que vem antes dele mais quieto.
- O que não faz parte da ação fica parado. Sem movimento decorativo.

## Armadilhas que já custaram retrabalho

- **A laje esconde o térreo.** Com a câmera alta, o andar de cima tapa quase tudo o que está embaixo dele. Coloque a ação do térreo numa parte da casa sem andar em cima (uma extensão, um quintal) e deixe só decoração baixa sob a laje.
- **Parede interna tapa o cômodo vizinho.** Divisórias internas vão só até metade da profundidade, sem porta: o personagem contorna a ponta.
- **Personagem de costas.** Móvel encostado na parede do fundo deixa o personagem de costas para a câmera. Os móveis onde ele faz algo (pia, bancada) ficam soltos, perto da borda aberta, com ele atrás, de frente para a câmera.
- **Atravessar móvel.** Antes de animar, confira cada trajeto contra a posição dos móveis e do guarda-corpo. O defeito aparece como o personagem passando por dentro de uma bancada.
- **Peças que se atravessam em pose parada.** Pés furando o cobertor, mão dentro da bancada. Renderize os momentos-chave parados e olhe um por um.

## Como construir

1. **Motor.** Um projeto Node com `three` e `puppeteer-core`. Uma página HTML monta a cena e expõe `window.renderAt(t)`, que desenha o quadro do instante `t` em segundos. Tudo na cena é função pura de `t`: nada de relógio, nada de estado acumulado entre quadros, para que qualquer quadro possa ser renderizado fora de ordem.
2. **Render.** Um script abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva as imagens e junta tudo num MP4 com o ffmpeg. Use o Chrome já instalado na máquina, com aceleração de vídeo.
3. **Personagem.** Uma hierarquia de grupos com juntas (quadril, coluna, cabeça, ombros, cotovelos, quadris, joelhos). Cada ação é uma pose (um conjunto de ângulos) e a animação é a passagem de uma pose para a outra com aceleração e freada. A caminhada é um ciclo calculado a partir da distância percorrida num trajeto de pontos, com o corpo virando na direção do movimento; na escada, a altura segue os degraus.
4. **Linha do tempo.** Uma lista de trechos em sequência: segurar a pose, ir para outra pose, andar por um trajeto. Os cortes de câmera são calculados a partir da posição do personagem (por exemplo, "corta quando ele cruza a divisória").

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Construa a cena e o personagem e renderize uma imagem parada de cada etapa da história, no momento mais claro de cada uma, mais a montagem e o plano final.
2. Olhe cada imagem você mesmo e corrija o que estiver errado (luz, peças se atravessando, personagem de costas ou escondido) antes de me mostrar.
3. Me entregue as imagens numa página só, com as imagens embutidas no próprio arquivo, e para cada uma: a janela de tempo, o que se move primeiro e como ela emenda na próxima. Espere minha aprovação.
4. Depois de aprovado, anime, renderize o vídeo e revise-o em folhas de quadros (4 por segundo) antes de entregar.
5. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não copie personagens, marcas, cenários ou a paleta de nenhuma campanha existente; o tema, as cores e os objetos são os meus.
- Não coloque texto, logo ou assinatura em tela.
- Não prometa acabamento de estúdio de animação: o resultado é uma maquete estilizada, com boneco simples. Diga isso com clareza se eu pedir algo fotorrealista.
