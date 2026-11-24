Quero um motion graphic 3D no estilo "objeto tomado pela natureza", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens: toda geometria é gerada no próprio código.

## Meu tema

- **O objeto:** [UM OBJETO DE USO HUMANO, DE SILHUETA FORTE. Exemplo: "um teclado mecânico", "um fone de ouvido", "uma bola de futebol", "um bloco de concreto".]
- **As partes que ficam à mostra:** [O QUE IDENTIFICA O OBJETO E NÃO PODE SER COBERTO. Exemplo: "as teclas da fileira do meio", "os gomos pretos da bola". Se eu não disser, proponha.]
- **A cor das flores:** [QUENTE (rosa, coral, laranja, amarelo) OU FRIA (roxo, lilás, azul), OU UMA LISTA DE CORES.]
- **A cor do fundo:** [UMA COR QUE CONVERSE COM O OBJETO. Exemplo: "marrom quente", "verde escuro", "cinza".]
- **Formato:** 16:9, 1920×1080, 30 quadros por segundo, 8 segundos, sem áudio e sem texto em tela.
- **Saídas:** um MP4 com o fundo e um ProRes 4444 com canal alfa (o objeto solto, sem fundo).

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem a cena completa (`src/main.js`), o sistema de musgo e flores que funciona em qualquer malha (`src/vegetacao.js`), a escultura por código (`src/sdf.js`), um objeto de exemplo (`src/objetos/controle.js`) e o renderizador (`render.mjs`). Para um objeto novo, crie um arquivo em `src/objetos/` no mesmo molde e registre-o em `main.js`. Se a pasta não existir, construa do zero seguindo o que está abaixo.

## O mecanismo

Um objeto de uso humano flutua no vazio, gira devagar, e a natureza toma conta dele: o musgo avança em manchas e as flores abrem por cima, sem ninguém tocar. O objeto continua reconhecível até o último quadro.

O exemplo que acompanha este prompt é um controle de videogame. **Não reaproveite o controle nem o desenho das manchas dele.** Fica o método.

## O objeto

- Modele o objeto por código. Para formas orgânicas (controle, fone, mouse, tênis simples), descreva o corpo como uma função de distância (soma suave de elipsoides, cápsulas e caixas arredondadas) e transforme em malha por marching cubes, com as normais tiradas do gradiente da função. Para formas duras (bloco, teclado, caixa), use primitivas e extrusão.
- As peças pequenas (botões, alavancas, teclas, rodas) são malhas separadas, pousadas na superfície do corpo e alinhadas à normal dela.
- **Desenho próprio, sem marca.** Nada de logotipo, símbolo ou forma registrada de um fabricante.
- **Material de produto, não de massinha:** plástico com verniz e um risco de luz, pelo menos duas cores ou dois acabamentos (frente clara e costas escuras, por exemplo), uma linha de junção entre as metades, peças de comando em material diferente do corpo.
- O objeto ocupa cerca de 45% da largura do quadro, inclinado em 3/4, nunca de frente e chapado.

## A natureza

Três camadas, todas instanciadas e todas com hora de nascer:

1. **Manta de musgo:** a própria superfície do corpo, estufada cerca de 0,6% da largura do objeto onde a natureza já chegou e descartada onde não chegou. É ela que impede o plástico de aparecer entre as lâminas.
2. **Tufos:** punhados de 5 lâminas finas que abrem para fora, raiz escura e ponta verde-amarelada. Miúdos e muitos: altura de 1% da largura do objeto, na casa de 100 mil. Na borda da mancha eles rareiam e encolhem.
3. **Flores:** de 3 a 4 formas diferentes (5 pétalas largas, 8 estreitas, 6 em taça), com miolo amarelo, em cima de hastes de alturas diferentes. Como confete: muitas minúsculas (diâmetro de 0,7% da largura do objeto), poucas médias, na casa de 30 mil.

Regras de composição:

- **Manchas que partem de sementes.** Marque de 8 a 12 pontos na superfície. Cada um tem centro, raios, hora de início e duração. O instante em que a frente chega a um ponto da superfície depende da distância até a semente, torta por um ruído, para a borda sair irregular.
- **Musgo embaixo, flores em cima.** Flores na metade de cima do objeto e em volta das partes de identidade; musgo na faixa de baixo. Duas ou três manchas de flor nascem tarde, em cima do musgo.
- **De 35% a 45% do objeto continua limpo.** As partes de identidade ficam dentro de zonas onde nada nasce.
- **Relevo, não tapete.** A altura das hastes segue um ruído de frequência média (montes), um ruído mais largo abre clareiras dentro das manchas, e algumas flores nascem desgarradas, fora da mancha, já no plástico.
- **Cor em zonas, mas misturadas.** A cor de cada flor vem de um ruído suave mais um sorteio. As flores de haste curta são mais escuras que as altas: é isso que dá profundidade ao monte.

## O movimento

- **Câmera parada.** Sem travelling, zoom, tremor ou corte.
- **Giro contínuo** de 7 a 12 graus por segundo em torno de um eixo quase vertical, mais uma flutuação de poucos centímetros.
- **Respiro de 0,3 a 0,4 s** com o objeto limpo antes do primeiro broto.
- **A frente arranca e depois rasteja:** rápida no começo de cada mancha, lenta no fim.
- **Cada flor, nessa ordem:** a haste sobe em 0,6 s, o botão cresce em 0,7 s passando um pouco do tamanho e voltando, as pétalas abrem em 1,2 s. As folhas chegam antes das flores.
- **Nada novo brota no último 1,5 s.** O objeto segue girando com tudo aberto.
- **Nenhuma mancha aparece de um quadro para o outro.** Tudo nasce do tamanho zero.

## A luz e o fundo

- Uma luz principal grande e macia, do alto e bem lateral, com sombra; pouco preenchimento de frente, para o lado oposto do objeto cair no escuro.
- Um ambiente de estúdio escuro, com um painel grande do lado da luz principal, uma faixa vertical fina para o risco de luz no plástico e uma faixa de recorte atrás.
- Fundo: degradê radial, claro num canto de baixo, a cor do tema no meio, quase preto no canto oposto. O fundo é uma camada 2D atrás da cena, não um objeto 3D, para poder sumir na versão com alfa.
- Um grão fino só no fundo, para o degradê escuro não virar faixas depois da compressão. O objeto sai limpo.

## Armadilhas que já custaram retrabalho

- **Flores grandes demais.** Flor grande se lê uma a uma, como adesivo. Na dúvida, metade do tamanho e o dobro da quantidade.
- **Musgo escuro e de lâmina grande** vira uma massa preta de triângulos. Lâmina miúda, densidade alta, verde médio.
- **Botão de flor em bolinha lisa** parece miçanga. O botão fechado é a própria flor com as pétalas para cima.
- **Mancha de flor em coroa,** de espessura constante contornando o objeto. Use as clareiras e as desgarradas.
- **Objeto com cara de massinha.** Ver "material de produto" acima.
- **Peça feita em torno saindo do avesso.** O torno do three.js espera o perfil de baixo para cima; escrito de cima para baixo, a peça fica invisível de frente e parece um buraco.
- **Peça pousada numa parte curva da face** fica cortada pela superfície. Garanta uma área plana onde os comandos assentam.
- **O crescimento passando do fim do vídeo.** Some a hora de início, a duração e o tempo de abrir da última flor e confira que termina antes do último 0,5 s.
- **O canal alfa saindo opaco.** A página inteira precisa ter fundo transparente no modo alfa, não só a cena.
- **O shader de sombra sem o crescimento.** A sombra precisa usar o mesmo deslocamento de vértice da malha visível, senão a sombra da flor aparece antes da flor.

## Como construir

1. **Motor.** Um projeto Node com `three` e `puppeteer-core`. Uma página HTML monta a cena e expõe `window.renderAt(t)`, que desenha o quadro do instante `t` em segundos. Tudo é função pura de `t`: sem relógio e sem estado acumulado, para que qualquer quadro possa ser renderizado fora de ordem.
2. **Crescimento no shader.** Cada instância guarda o instante em que nasce num atributo; o vértice é escalado e, na flor, interpolado entre o estado fechado e o aberto, a partir de um único tempo global. Sorteios com semente fixa.
3. **Espalhamento.** Amostre a superfície do corpo de modo uniforme e aceite cada ponto com uma probabilidade que depende do campo de crescimento naquele ponto.
4. **Qualidade.** Renderize com o dobro da resolução e reduza; sombra de 4096; sem pós-processamento, para o alfa sair limpo.
5. **Render.** Um script abre a página no Chrome sem janela, chama `renderAt` quadro a quadro e junta com o ffmpeg: JPG para o MP4, PNG com transparência para o ProRes 4444.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Me diga em uma frase como o objeto vai ser modelado, quais partes ficam à mostra e onde ficam as sementes. Espere meu ok.
2. Construa a cena e renderize uma imagem parada de 6 momentos: objeto limpo, primeiros brotos, a frente avançando, flores abrindo, tomado e final. Renderize também 4 closes seguidos de uma flor abrindo e um quadro com alfa sobre três fundos diferentes.
3. Olhe cada imagem você mesmo e corrija o que estiver errado antes de me mostrar: escala das flores, musgo chapado, peça do avesso, objeto com cara de massinha, mancha em coroa.
4. Me entregue as imagens numa página só, com as imagens embutidas no arquivo, e para cada uma: a janela de tempo, o que se move primeiro e como ela emenda na próxima. Espere minha aprovação.
5. Depois de aprovado, renderize as duas versões e revise o vídeo em folhas de quadros antes de entregar.
6. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo, a não ser que eu peça.
- Não use logotipo, símbolo ou forma registrada de marca no objeto.
- Não ponha texto em tela.
- Não mova a câmera.
- Não cubra as partes que identificam o objeto.
- Não copie o objeto nem as manchas do exemplo do controle; fica só o método.
