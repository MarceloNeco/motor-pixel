Quero um motion graphic 3D no estilo "ilha em setores", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens: toda geometria e toda textura são geradas no próprio código.

## Meu tema

- **O mundo:** [O QUE É A ILHA. Exemplo: "a ilha da minha empresa", "o arquipélago das ferramentas de IA", "a ilha dos tipos de cliente".]
- **Os setores (de 3 a 6):** para cada um, o nome, o tipo de terreno e o personagem que mora ali, com o gesto que ele repete. [Exemplo: "Vendas: campina dourada, uma raposa que fareja o chão e levanta a cabeça. Suporte: brejo, um sapo que infla e coaxa. Produto: pedreira, um castor que bate o rabo."]
- **O centro da ilha:** [O QUE FICA NO MEIO E DE ONDE SAEM AS DIVISAS. Exemplo: "um vulcão", "um farol", "uma árvore gigante".]
- **Formato:** 16:9, 1920×1080, 24 quadros por segundo, 24 segundos em laço, sem texto em tela e sem áudio.
- **O detalhe de humor:** [O QUE DESMONTA A SERIEDADE DOS PERSONAGENS. Exemplo: "olho de adesivo de pupila solta", "chapeuzinho de festa", "óculos escuros".]

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem a biblioteca de formas (`src/lib.js`), a ilha (`src/ilha.js`), um arquivo por personagem (`src/dinos/`), a cena (`src/main.js`) e o renderizador (`render.mjs`). Reaproveite a estrutura e troque os setores, os personagens e os gestos pelo meu tema. Se não existir, construa do zero seguindo o que está abaixo.

## O visual

Uma ilha de maquete vista de cima, com o mar enchendo o quadro inteiro, sem horizonte.

- **A ilha:** contorno orgânico, um pouco mais larga que funda para caber no 16:9. Praia de areia em toda a volta, turquesa no raso e azul no fundo.
- **Os setores:** fatias iguais ao redor do centro. A divisa entre duas fatias é um rio que nasce no centro e deságua no mar. Cada setor tem uma cor de chão bem diferente das vizinhas e vegetação própria; de longe, a ilha tem que ler como um gráfico de pizza feito de terreno.
- **O centro:** uma peça alta e facetada (vulcão, torre, árvore) que amarra a composição. Baixa o bastante para não tapar o setor de trás.
- **O cenário:** facetado e simples, com cores chapadas: pedras em poliedro, pinheiros em cones, palmeiras em gomos. Pouca coisa por setor, e nada alto dentro da clareira do personagem.
- **Os personagens:** do tamanho de brinquedo em relação às árvores (ocupando boa parte do setor), com anatomia reconhecível e pele trabalhada: dorso escuro, barriga clara, listras ou manchas, relevo de escamas. São eles que carregam o detalhe; o cenário fica de apoio.
- **O detalhe de humor:** igual em todos os personagens e sempre visível. No olho de adesivo: disco branco, aro escuro, pupila preta fosca que pende para baixo em repouso e chacoalha no gesto forte, um de cada lado da cabeça.
- **Luz:** um sol quente e forte vindo do lado, com sombras macias e visíveis, mais uma luz ambiente fraca. Oclusão de ambiente nos encontros e um desfoque leve no alto e no pé do quadro, que reforça a sensação de miniatura.

## A câmera e o ritmo

- Câmera ortográfica (sem perspectiva), parada em cada plano. Nada de zoom, giro ou tremor.
- **Plano geral:** a ilha inteira, vista a uns 40 graus de inclinação. Abre e fecha o filme.
- **Planos de setor:** um por personagem, mais baixo (uns 22 graus) e de três quartos, com o personagem ocupando metade da largura do quadro. A câmera gira uns 15 a 20 graus para o lado da cara dele.
- Toda troca de plano é corte seco. A visita aos setores segue uma volta na ilha, em ordem.
- **O laço:** cada personagem tem um ciclo de 4 segundos sem sair do lugar, com um gesto forte por ciclo (um rugido, uma cabeçada, um pulo) e o resto do tempo quase parado. Um dos gestos é o soco do filme: dê a ele o plano mais longo.
- A duração total é múltiplo de todos os ciclos, para o último quadro emendar no primeiro.

## Armadilhas que já custaram retrabalho

- **Conte o elenco antes de prometer.** Se o tema vier de uma referência, confira quantos personagens diferentes ela realmente tem. Um setor vazio ou um personagem repetido aparece na hora.
- **Personagem magro demais.** A primeira versão de um bicho feito de anéis sai fina, com cara de lagartixa. Engrosse pescoço, tronco e coxas e aumente a cabeça até a silhueta ler de longe.
- **Perna que parece remendo.** O topo da perna precisa terminar em cúpula e entrar no corpo; tampa chata vira um retângulo colado no flanco.
- **Pupila que acinzenta.** Pupila lisa e brilhante reflete o sol e fica cinza em certos ângulos. Use material fosco.
- **Ponta furada.** Cauda, focinho e dedos precisam fechar num ponto; raio pequeno no último anel deixa um furinho claro.
- **Boca de batom.** O interior vermelho da boca não pode ser mais largo que a borda dos lábios, senão vaza como uma linha vermelha com a boca fechada.
- **Cenário na frente do personagem.** Reserve uma clareira: nada alto entre o personagem e a câmera. Nos planos de setor, esconda o que for do setor vizinho e ficar entre os dois (inclusive a peça do centro, para os setores de trás).
- **Vizinho cortado na borda.** Se outro personagem aparece pela metade no canto do plano, esconda só ele nesse plano.
- **Linha de onda que vira mira.** Um anel branco contínuo em volta da ilha lê como marcação de interface. Faça a espuma em trechos soltos e fracos.
- **Fumaça ou árvore tapando o setor do fundo.** Tudo o que sobe do centro da ilha cobre quem está atrás. Mantenha baixo ou faça derivar para o lado.

## Como construir

1. **Motor.** Um projeto Node com `three` e `puppeteer-core`. Uma página HTML monta a cena e expõe `window.renderAt(t)`, que desenha o quadro do instante `t` em segundos. Tudo é função pura de `t`: nada de relógio nem de estado acumulado, para qualquer quadro poder ser renderizado fora de ordem.
2. **Laço.** Todo movimento é um seno com número inteiro de ciclos por laço, ou um envelope que sobe e desce dentro do laço. Nunca use tempo absoluto solto.
3. **Corpo.** Uma espinha de pontos de controle, da ponta da cauda à nuca; em cada ponto, a meia-largura e a altura acima e abaixo do eixo. Uma curva suave passa pelos pontos e a malha é uma sequência de anéis ao longo dela, refeita a cada quadro. Dobrar a espinha (cauda varrendo, pescoço subindo) é girar os trechos em cadeia a partir do quadril.
4. **Cabeça.** Uma peça rígida presa no fim do pescoço, com a mandíbula em dobradiça, dentes em cones, interior da boca e os olhos. Cada personagem tem a sua.
5. **Pernas.** Pé fixo no chão, quadril preso no corpo, joelho calculado por cinemática inversa de dois ossos. Quando o corpo balança, o joelho dobra sozinho e o pé não escorrega.
6. **Pele.** Uma textura pintada em canvas por personagem: degradê do dorso à barriga, espelhado para não ter costura, mais listras, manchas, pontilhado e rugas. Um relevo de escamas compartilhado por cima.
7. **Ilha.** Uma grade de alturas. Uma função dá o contorno; os rios são sulcos abaixo do nível do mar ao longo das divisas, e um único plano de água na altura zero faz mar, rios e lagoa de uma vez. A cor de cada vértice vem do setor, com areia nas margens e na praia.
8. **Render.** Um script abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva as imagens e junta tudo num MP4 com o ffmpeg.

Se for dividir o trabalho entre agentes: primeiro a biblioteca e UM personagem completo como molde, com uma página de teste que mostra quatro vistas dele num quadro só. Depois, um agente por personagem, cada um no seu arquivo, sem mexer na biblioteca.

## A ordem do trabalho

1. Construa a ilha e os personagens e renderize uma imagem parada da ilha inteira e uma de cada setor, no gesto mais claro de cada personagem.
2. Olhe cada imagem você mesmo e corrija o que estiver errado (silhueta, peças se atravessando, personagem tapado) antes de me mostrar.
3. Me entregue as imagens numa página só, com as imagens embutidas no próprio arquivo, e para cada uma: a janela de tempo, o que se move primeiro e como ela emenda na próxima.
4. Renderize o vídeo e revise-o em folhas de quadros (o meio de cada plano e os dois lados de cada corte) antes de entregar. Confira que o último quadro emenda no primeiro.
5. Na entrega, diga o que você não conseguiu fazer igual ao pedido e o que não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não copie personagens, marcas ou cenários de nenhuma obra existente; o tema, os setores e os personagens são os meus.
- Não coloque texto, placa, logo ou assinatura em tela.
- Não deixe personagem sair do setor nem atravessar rio.
- Não prometa bicho de estúdio de animação: são formas geradas em código, com silhueta, cor e gesto certos, sem o detalhe de um modelo esculpido. Diga isso com clareza se eu pedir algo fotorrealista.
