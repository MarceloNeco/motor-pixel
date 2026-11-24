Quero um motion graphic 3D no estilo "ícone herói", feito em código com three.js: um único ícone de app, gordo como um brinquedo, que a cada virada mostra outro símbolo em relevo enquanto o estúdio troca de cor. Sem modelos 3D prontos e sem imagens: a cena inteira é gerada no código, e os símbolos vêm de arquivos SVG.

## Meu tema

- **As faces, na ordem:** [DE 3 A 6 ITENS. Para cada um: o nome, o arquivo SVG do símbolo e a cor da marca. Exemplo: "Notion (notion.svg, preto), Trello (trello.svg, azul #0079BF), Asana (asana.svg, coral #F06A6A)".]
- **A face que fica:** [QUAL É A ÚLTIMA, a que recebe o nome escrito ao lado. Exemplo: "a minha ferramenta, por último".]
- **O letreiro:** [O NOME EM 1 OU 2 LINHAS CURTAS, e, se quiser, uma frase de apoio. Exemplo: "Claude / Code". Se eu não der frase de apoio, não invente uma.]
- **Os símbolos:** [OS ARQUIVOS SVG, OU "desenhe símbolos simples para: ...". Se forem logos de marcas, eu forneço os arquivos oficiais e confirmo que posso usá-las.]
- **Formato:** 16:9, 1920×1080, 30 quadros por segundo, 2 segundos por face mais 3,5 segundos de fecho, sem áudio.
- **Idioma dos textos em tela:** português do Brasil.

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem uma cena completa neste estilo (`src/main.js`) e o renderizador (`render.mjs`). O conteúdo fica no começo do `main.js` (a lista `BEATS` e o `LETREIRO`) e cada símbolo tem o seu construtor em `SIMBOLOS`. Se não existir, construa do zero seguindo o que está abaixo.

## Antes de desenhar: uma tabela, e espere meu ok

O exemplo que acompanha este prompt mostra seis IAs. **Não reaproveite as logos, as cores nem os gestos do exemplo para o meu tema.** Cada gesto de montagem lá saiu da forma de uma logo específica.

Me responda nesta tabela antes de construir:

| Face | Símbolo (arquivo) | Cor do ícone | Cor do símbolo | Cor do estúdio | Gesto de montagem e por quê |
|---|---|---|---|---|---|
| exemplo | nó de 6 voltas | preto | branco | verde-menta | chega solto e trava em dois cliques de 60°: a forma tem simetria de 6, cada clique devolve o mesmo desenho |

Regras para preencher:

- **Cor do estúdio:** um tom claro da cor da marca. Duas faces não podem ter estúdios parecidos, nem longe uma da outra na ordem: a onda que devolve uma cor já vista perde o efeito de mundo novo.
- **Cor do símbolo:** branco fosco sobre ícone colorido, ou a cor oficial da logo sobre ícone branco. Degradê só se estiver escrito no SVG.
- **Gesto:** tire da forma. Um traço contínuo entra em segmentos na ordem em que seria escrito. Uma forma com pontas ou raios chega aberta como uma flor e fecha em volta do relógio. Uma forma com simetria de rotação trava em cliques. Um bicho ou personagem chega inclinado e mergulha no lugar. Um glifo dentro de outra forma é prensado como tecla. Se nenhum gesto sair da forma, a peça só cai e assenta.

## O visual

Fotografia de brinquedo num estúdio claro.

- **O ícone:** uma superelipse (mais redonda que um quadrado arredondado), com cerca de um quarto do lado em espessura e quina bem arredondada. Plástico com verniz. Uma cinta fina de metal polido na cintura. Ele flutua: nada de chão.
- **O estúdio:** uma parede de papel fosco, de uma cor só, atrás do ícone. A sombra do ícone cai nela para baixo e para a esquerda, grande e macia.
- **O símbolo:** peça grossa pousada na face, com a parede lateral e a sombra de contato visíveis. Ocupa de 63% a 68% do lado do ícone. A silhueta é a do arquivo SVG, exata: nunca estique, espelhe, redesenhe ou recolora uma logo.
- **Materiais:** plástico com verniz nas peças coloridas, branco fosco nas peças brancas. Toda quina arredondada. Logo de traço fino pede quina pequena: engrosse a altura da peça, nunca o contorno.
- **Luz:** uma luz principal grande e macia, de cima e da direita. Caixas de luz no ambiente só para o brilho do verniz, com uma bandeira preta atrás da câmera para a face não lavar. Uma luz rebatida que pega a cor do estúdio.
- **Texto:** só no fecho. Letras em 3D saindo da parede, numa cor escura, na fonte da minha marca.
- **Acabamento:** cor fiel, desfoque de movimento de verdade nas viradas, sem grão, vinheta, flare, partícula ou brilho piscando.

## A câmera e o ritmo

Um plano só, sem corte. Lente longa (uns 26° de campo), quase de frente, um pouco acima e à direita do ícone.

1. **Abertura.** A primeira face já está no ícone, com as peças na pose aberta, e fecha no primeiro segundo. A câmera avança bem devagar o tempo todo.
2. **Cada virada**, a cada 2 segundos:
   - **Antecipação** (0,4 s antes): o ícone recua um pouco e gira uns 11° no sentido contrário.
   - **Virada:** uma mola só, que crava em 0,35 s, passa uns 10° do ponto e volta. Alterne o eixo: uma tomba como aba, a seguinte gira como porta.
   - **Cor escondida:** a metade de trás do ícone já está na cor nova, e já traz o símbolo novo, antes de aparecer.
   - **Onda:** 0,1 s depois de a virada começar, a cor nova do estúdio abre em círculo a partir de trás do ícone, com borda firme e um fio claro, e cobre o quadro em menos de 0,2 s.
   - **Montagem:** começa logo depois de cravar e termina em até 0,6 s.
   - **Coice:** cada contato empurra o ícone um pouco para trás e ele volta.
   - **Pausa:** o símbolo fica inteiro por cerca de 1 segundo antes da próxima antecipação.
3. **A última virada é o soco.** Uma volta a mais, e a câmera recua e desliza para o lado junto com ela, saindo forte e assentando devagar.
4. **Fecho.** O nome sai da parede letra por letra, da esquerda para a direita. Ícone de um lado, letreiro do outro, margens iguais dos dois lados. Quadro parado por 1,3 segundo.

O filme é percussivo: quase imóvel entre as viradas, rajada curta em cada uma. O que não faz parte da ação fica parado.

## Armadilhas que já custaram retrabalho

- **Símbolo que aparece do nada.** Peça grande que nasce de um ponto e cresce lê como efeito de tela, não como objeto. Todo símbolo já chega no ícone, nas costas dele, com as peças na pose aberta (afastadas e levantadas), e fecha depois de cravar. Nada muda de tamanho.
- **Montagem que gasta tanto movimento quanto a virada.** Aí o filme fica uniforme e morno. A montagem é curta e de área pequena; quem bate é a virada.
- **O soco espalhado.** Se a câmera recuar devagar durante 1,5 s, a última virada não fica maior que as outras. O recuo começa junto com ela e gasta a maior parte do percurso no começo.
- **Logo em pedaços com fresta no quadro final.** Quando o símbolo entra em pedaços, os pedaços têm fresta entre si enquanto fecham; no quadro da prensa, troque-os pela peça única, que é o contorno do SVG sem fresta nenhuma.
- **Corte de contorno côncavo.** Cortar um contorno cheio de curvas com uma linha reta pode deixar uma ida e volta de área zero em cima da linha de corte, e a peça sai com um pedaço cheio que não existe na logo. Tire essas farpas antes de engrossar.
- **Glifo vazado fica cinza.** Um furo com a face do ícone no fundo fica na sombra das paredes do furo. Se o glifo precisa ler branco, faça dele uma peça branca com o mesmo contorno, pousada em cima.
- **Símbolo grande demais.** Com o relevo visto um pouco de lado, um símbolo de 75% do ícone parece empurrado para o canto. Fique em 63% a 68%.
- **Onda borrada.** A onda atravessa o quadro tão rápido que o desfoque de movimento transforma a borda num clarão. Deixe a onda fora do desfoque.
- **Sombra em degraus.** Sombra macia feita com poucas posições de luz mostra as cópias. Use pelo menos 48 amostras por quadro.
- **Fecho descentrado.** Meça as margens do quadro final: a do lado do ícone e a do lado do letreiro têm que ser parecidas.

## Como construir

1. **Motor.** Um projeto Node com `three` e `puppeteer-core`. Uma página HTML monta a cena e expõe `window.renderAt(t)`, que desenha o quadro do instante `t` em segundos. Tudo na cena é função pura de `t`: nada de relógio, nada de estado acumulado entre quadros.
2. **Render por acúmulo.** Cada quadro é a média de dezenas de amostras. Cada amostra roda a cena num instante um pouco diferente dentro do quadro (isso dá o desfoque de movimento), com a luz principal num ponto diferente de um disco (isso dá a sombra macia) e com a câmera deslocada uma fração de pixel (isso dá o antisserrilhado). Um script abre a página no Chrome sem janela, chama `renderAt` quadro a quadro e junta tudo num MP4 com o ffmpeg.
3. **Símbolos.** Leia o SVG com o `SVGLoader`, transforme cada caminho em contorno, centre, inverta o eixo vertical e engrosse com o `ExtrudeGeometry`, cortando a quina para dentro, para o contorno ficar do tamanho exato do desenho. Corrija as normais para a tampa ficar chapada e a quina emendar nela sem vinco.
4. **Conferência de silhueta.** Um teste na própria página desenha o contorno que a cena engrossa e o SVG original, e compara os dois. Abaixo de 99% de igualdade, algo se perdeu na conversão (um furo fechado, um caminho ignorado).
5. **O ícone em duas metades.** Frente e costas são dois materiais, para a metade escondida trocar de cor antes de aparecer. Depois de cada virada, a conta recomeça do zero com as metades trocadas de papel: o ícone é simétrico, então a troca não se vê.
6. **Letreiro.** Uma fonte local convertida para o formato do three.js, uma malha por letra, cada uma crescendo para fora da parede.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Me mostre a tabela das faces e espere meu ok.
2. Construa a cena e renderize uma imagem parada de cada momento: cada face inteira, uma virada com a onda no meio, uma montagem pela metade e o fecho.
3. Rode a conferência de silhueta e olhe cada imagem você mesmo antes de me mostrar: símbolo deformado ou espelhado, peça atravessando outra, glifo ilegível, sombra em degraus, fecho descentrado.
4. Me entregue as imagens numa página só, com as imagens embutidas no próprio arquivo, e para cada uma: a janela de tempo, o que se move primeiro e como ela emenda na próxima. Inclua de onde veio cada arquivo de símbolo e a lista de todo texto que aparece em tela. Espere minha aprovação.
5. Depois de aprovado, renderize o vídeo e revise-o em folhas de quadros (3 ou 4 por segundo) antes de entregar. Olhe com atenção os quadros de cada prensa.
6. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo. Os únicos arquivos externos são os SVG dos símbolos e a fonte.
- Não redesenhe, estique, espelhe nem recolora uma logo, e não use logo de marca que eu não tenha confirmado que posso mostrar.
- Não invente frase de apoio, slogan nem promessa para o letreiro.
- Não ponha duas marcas em cena ao mesmo tempo, fora o instante da virada.
- Não copie as logos, as cores nem os gestos do exemplo das IAs; fica só o método.
