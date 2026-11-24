Quero um motion graphic 3D no estilo "vista explodida com rótulos numerados", feito inteiro em código com three.js, sem modelos 3D prontos, sem imagens e sem texturas de arquivo: toda geometria, toda textura e toda luz são geradas no próprio código. O resultado é um filme de desmontagem de produto: um objeto flutua sobre um fundo liso sem horizonte, se abre ao longo do seu eixo em peças separadas, cada peça ganha uma chamada numerada, e no fim ele se remonta com os rótulos acompanhando.

## Meu tema

- **O objeto:** [O QUE É. Tem de ser feito de partes que se separam ao longo de um eixo. Exemplo: "um fone de ouvido", "uma câmera", "um tênis", "um controle de videogame", "uma cafeteira".]
- **As peças, na ordem de montagem (de 5 a 7):** [NOME CURTO EM MAIÚSCULAS + UMA LINHA DE DESCRIÇÃO PARA CADA. Exemplo: "DRIVER · alto-falante de 40 mm".]
- **O título de abertura, em duas linhas:** [Exemplo: "O QUE TEM DENTRO / DE UM FONE DE OUVIDO".]
- **A frase final, em duas linhas:** [A PRIMEIRA CONTA AS PEÇAS, A SEGUNDA DIZ O RESULTADO. Exemplo: "SETE PEÇAS / UM SOM".]
- **O gesto final:** [UM EFEITO CURTO QUE MOSTRA O OBJETO FUNCIONANDO DEPOIS DE REMONTADO. Exemplo: ondas de som saindo das conchas; o flash da câmera; a luz da cafeteira acendendo.]
- **A paleta:** [COR DO FUNDO, COR DO CORPO DO OBJETO, COR DO METAL, COR CLARA E UM ACENTO. Exemplo: fundo pêssego, corpo verde-petróleo, metal rosé, creme, acento coral.]
- **Formato:** 16:9, 1920×1080, 30 quadros por segundo, 10 segundos, com áudio.
- **Idioma dos textos em tela:** português do Brasil.

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida. Ela tem o objeto modelado peça por peça, com a paleta e as distâncias de afastamento (`src/fone.js`), a cena, a linha do tempo, a câmera, o pós-processamento e os rótulos (`src/main.js`), o áudio (`ferramentas/audio.py`) e o renderizador (`render.mjs`). Reaproveite a técnica; troque o objeto, as peças, os textos e a paleta pelo meu tema. Se a pasta não existir, construa do zero seguindo o que está abaixo.

## Antes de construir: as peças saem do tema

O exemplo que acompanha este prompt é um fone de ouvido. **Não reaproveite o fone, as sete peças, os textos nem a frase final para o meu tema.** Antes de construir, me responda em uma tabela e espere meu ok:

| Papel | Pergunta | No exemplo do fone |
|---|---|---|
| O eixo | Ao longo de que linha o objeto se abre? | o eixo das duas conchas, cada uma para o seu lado; o arco sobe |
| As peças | Quais são, em que ordem, e o que é verdade sobre cada uma? | almofada, tela, driver, bateria (concha esquerda), placa (concha direita), concha, arco |
| O lado que a câmera vê | Que face de cada peça fica à mostra? | a concha de longe mostra o lado de dentro (almofada, tela, diafragma); a de perto mostra as costas (ímã, componentes da placa, tampa) |
| O layout dos rótulos | Onde cada chamada fica aberta e onde fica fechada? | aberta: alternando acima e abaixo da fileira; fechada: coluna à esquerda, dois à direita, um no topo |
| O gesto final | O que prova que voltou a funcionar? | um pulso de escala (grave) e três anéis de som de cada lado |

## O visual

- **Fundo liso sem horizonte:** um gradiente radial em espaço de tela (no exemplo `#fcecdf` no centro, `#f6dac9` no meio, `#ecc0ad` na borda). O chão é só um plano que recebe sombra (`ShadowMaterial`, cor `#7a2f24`, opacidade 0,3), 1,2 unidade abaixo do objeto.
- **Paleta de cinco cores:** corpo (`#0f4a50`), metal (`#f4b89c`), claro (`#f3e7d8`), acento (`#f26a4b`) e a tinta dos textos (`#123b42`, a mesma família do corpo). As peças internas podem ter cor própria (placa verde `#0d6b58`, cobre, aço), mas o acento só aparece em uma peça e nos discos numerados.
- **Materiais físicos:** corpo com verniz (clearcoat 0,55, rugosidade 0,38), metal polido (metalness 1, rugosidade 0,22, reflexo de ambiente reforçado), couro com sheen, plástico fosco.
- **Luz de estúdio:** ambiente de sala (`RoomEnvironment`) a 0,95; uma chave quente (`#fff0df`, intensidade 3) de cima e da esquerda, que faz sombra; um contraluz frio (`#d6ecff`, 1,6) por trás; um preenchimento baixo quente (0,5).
- **Rótulos em 2D por cima do quadro:** um ponto na peça (bolinha branca com miolo de tinta), uma linha reta fina até um disco no acento com o número em branco, o nome em peso 800 com espaçamento largo e uma linha de descrição menor, a 72% de opacidade. Fonte grotesca geométrica pesada (no exemplo, Avenir Next).
- **Título** no canto superior esquerdo (uma linha pequena espaçada, com um tracinho no acento, e uma linha grande); **frase final** no canto inferior direito, a segunda linha no acento.
- **Imagem final:** tom neutro (Khronos PBR Neutral, que preserva as cores), um leve S de contraste, vinheta de 16% e grão discreto.

## A câmera e o ritmo

- **Uma câmera só, sem corte:** lente longa (campo de visão 24°), órbita lenta e contínua de 37° para 23° de azimute durante o filme inteiro, inclinação de 13° para 10°. Recua quando o objeto abre (distância de 8,3 para 12,2) e aproxima no fim.
- **O recuo da câmera começa antes da explosão** e termina antes das peças chegarem; se atrasar, as peças saem do quadro.
- **A linha do tempo** (instantes em segundos do exemplo):
  - 0,0 a 1,5: o objeto montado flutua à direita do título.
  - 1,5 a 3,2: explode. As peças de fora saem primeiro, com 0,11 s de diferença entre uma e outra, e passam um pouco do ponto antes de assentar.
  - 3,25 a 5,6: os rótulos entram um a cada 0,3 s: a linha se desenha, o disco estoura, o texto desliza.
  - 5,6 a 6,7: respiro com tudo aberto e legível.
  - 6,7 a 8,0: remonta, de dentro para fora; os rótulos viajam para o layout fechado; um "clique" de escala quando fecha.
  - 8,35 a 10: a frase final entra em duas linhas; em 8,5 o gesto final.
- **O objeto nunca fica parado:** flutua (±0,045), balança de leve e a câmera orbita.

## A técnica que faz o estilo

1. **Cada peça é um grupo separado** com posição de repouso (zero) e uma distância de afastamento ao longo do eixo. A animação é só `distância × abertura(t)`.
2. **Peças de revolução em torno (`LatheGeometry`)** com perfil suavizado por spline e percorrido de modo que as normais apontem para fora; as ocas (a concha) têm parede dupla, para o lado de dentro aparecer quando abre.
3. **Faixas e hastes por varredura:** uma seção de cantos arredondados arrastada por um caminho, com largura e espessura variando ao longo dele (o arco afina nas pontas).
4. **Texturas em canvas:** a tela furada é um mapa de alfa com furos em colmeia; a placa tem trilhas e ilhas sorteadas; a etiqueta da bateria é texto desenhado.
5. **Cada quadro é a soma de 24 subquadros** (6 em rascunho), com obturador de 180° e um deslocamento subpixel diferente em cada um: desfoque de movimento real e antisserrilhado.
6. **Sombra macia de graça:** a cada subquadro a luz chave sorteia um ponto num disco de raio 1,9. A soma vira penumbra de luz de área.
7. **Rótulos presos às peças:** o ponto de âncora é um ponto local da peça projetado na tela a cada quadro. Na vista aberta, o disco fica a um deslocamento fixo da âncora; na fechada, numa posição fixa da tela. Uma interpolação leva de um layout ao outro, e a âncora também muda de ponto local para ficar visível no objeto fechado.
8. **Tudo é função do tempo.** Uma página expõe `renderAt(t)`, que desenha o quadro do instante `t` sem relógio nem estado acumulado.
9. **Áudio sintetizado em código**, lendo os mesmos instantes: uma cama de acorde baixa, sopro na abertura, um estalo por peça, uma nota por rótulo em escala ascendente, sopro inverso, encaixes, clique e um grave com acorde no gesto final.

## Armadilhas que já custaram retrabalho

- **Peças que se sobrepõem na fileira.** Com a câmera a cerca de 30° do eixo, o afastamento entre peças precisa ser maior que a largura projetada delas. Confira numa imagem parada.
- **O lado de perto fica maior que o de longe** por causa da perspectiva e sai do quadro. Desloque o alvo da câmera para o lado de perto e recue mais.
- **Rótulo em cima de outra peça.** Posicione os discos fora da fileira, alternando acima e abaixo, e olhe a imagem parada.
- **Rótulos embolados no objeto fechado.** Deslocamento relativo à âncora não funciona quando as âncoras ficam juntas; use posições fixas de tela, em coluna, na ordem vertical das âncoras, para as linhas não se cruzarem.
- **Metal que fica marrom.** Metal puro reflete a parte escura do ambiente. Em superfícies grandes e planas, baixe o metalness (0,35) e clareie a cor.
- **Efeito final cruzando os rótulos.** Os anéis de som têm de ser curtos (0,75 s) e viajar pouco.
- **Título em cima do objeto.** Na abertura, desloque o alvo da câmera para o objeto ficar ao lado do título.
- **Rotação dentro de escala não uniforme** deforma a peça. Aplique a ovalização na geometria, não no grupo.

## Como construir

1. **Motor.** Um projeto Node com `three` e `puppeteer-core`. Uma página HTML monta a cena e expõe `window.renderAt(t)`; um canvas 2D recebe o quadro 3D e os rótulos por cima.
2. **Render.** Um script abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva as imagens e junta num MP4 com o ffmpeg; o áudio é mixado no fim.
3. **Conteúdo num lugar só.** Paleta e afastamentos no começo do arquivo do objeto; instantes, rótulos e textos no começo do arquivo da cena.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Responda a tabela "as peças saem do tema" e espere meu ok.
2. Modele o objeto e renderize uma imagem parada de cada momento: montado com o título, abrindo, explodido sem rótulos, explodido com todos os rótulos, fechando e o plano final com a frase.
3. Olhe cada imagem você mesmo e corrija sobreposições e cortes antes de me mostrar.
4. Depois de aprovado, renderize o vídeo e revise numa folha de quadros.
5. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar (por exemplo, se o áudio não foi ouvido).

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não copie o fone, as sete peças, os textos nem a frase do exemplo; são do exemplo.
- Não use corte nem troca de câmera.
- Não passe de sete rótulos; acima disso a tela vira bula.
- Não use segunda cor de acento nos rótulos.
- Não invente especificações como se fossem reais: se os números forem ilustrativos, me avise.
- Não ponha marca ou logotipo reais no objeto.
