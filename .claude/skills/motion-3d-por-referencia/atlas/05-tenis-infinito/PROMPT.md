Quero um motion graphic 3D no estilo "laço infinito: o mundo cabe no objeto", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens: o objeto, o mundo dentro dele, as texturas e as luzes são todos gerados no próprio código.

## Meu tema

- **O objeto que guarda o mundo:** [UM OBJETO REDONDO OU COM TAMPA, reconhecível de longe. Exemplo: "uma bola de tênis de feltro, cortada ao meio no equador".]
- **O mundo dentro dele:** [O LUGAR ONDE ESSE OBJETO VIVE, em miniatura. Exemplo: "uma quadra de tênis à noite, com rede, alambrado, postes de luz e dois jogadores".]
- **Onde o objeto pequeno aparece dentro do mundo:** [O PONTO PARA ONDE A CÂMERA VAI. Exemplo: "a bola do jogo, flutuando sobre o meio da rede".]
- **Paleta:** [A COR DO OBJETO, A COR DO MUNDO, A COR DAS LINHAS. Exemplo: "feltro verde-limão neon, quadra azul, linhas e rede brancas, noite preta".]
- **Formato:** 16:9, 1920×1080, 30 quadros por segundo, 8 segundos em laço, sem áudio, sem texto em tela.

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem a cena completa neste estilo (`src/main.js`) e o renderizador (`render.mjs`). Mantenha a máquina do laço (três níveis, câmera, luz por nível, pós-processamento) e troque o mundo e o objeto pelos do meu tema. Se não existir, construa do zero seguindo o que está abaixo.

## O mecanismo

O mundo cabe no objeto. A câmera sai de dentro do objeto aberto, encontra o mundo, vai até o mesmo objeto em tamanho pequeno, ele se abre e dentro dele mora outro mundo igual. O último quadro do filme é o primeiro quadro, só que numa escala menor: o vídeo repete para sempre sem emenda. É um plano único, sem nenhum corte.

O mundo de dentro tem que nascer do objeto: bola de tênis guarda quadra, globo de neve guarda cidade, xícara guarda cafeteria. Se o mundo não tiver relação com o objeto, o laço vira truque sem sentido.

## O visual

- **Miniatura fotografada de perto:** pouca profundidade de campo (o que a câmera segue fica nítido, o resto desfoca forte), horizonte inclinado entre 5° e 15° quase o tempo todo, desfoque de movimento nas passagens rápidas.
- **O objeto:** material com textura de verdade e borda viva. No caso do feltro: cor em quatro tons (luz, meio-tom, sombra, sombra funda), brilho mais claro nas bordas, grão fino, e fibras de verdade na silhueta (camadas concêntricas com recorte por ruído). A costura é uma faixa clara afundada, com sombra nas duas bordas.
- **O corte:** o objeto abre em duas metades. A de baixo segura o mundo; a tampa sobe e gira um pouco numa dobradiça atrás. Na borda do corte, uma franja (grama, no caso do feltro) que de dentro do mundo vira o horizonte verde.
- **O mundo:** um disco apoiado no corte, um pouco abaixo da borda, cercado por um muro baixo. Chão com linhas desenhadas em shader (nítidas de qualquer distância), poucos elementos brancos de moldura (rede, cerca, postes), figuras pequenas e simples.
- **A noite:** fundo preto. O interior da tampa é o céu do mundo: preto, com um brilho fraco da cor do chão perto do horizonte.
- **Luz em dois estados:** mundo aceso (cor estourada, linhas brilhando) e mundo apagado (a 10% da luz). O objeto pequeno nunca apaga: quando o mundo escurece, ele ganha um halo e ilumina de leve o que está perto.
- **Acabamento:** brilho em volta do que é branco, vinheta leve, granulado quase invisível.

## A coreografia (8 s)

1. **Saída do objeto (0–0,9 s):** o objeto aberto ocupa o quadro inteiro, tampa em cima, metade de baixo embaixo, o mundo aceso no meio. A câmera entra pela abertura; a borda da tampa passa raspando por cima.
2. **O mundo (0,9–1,6 s):** vista de três quartos do mundo inteiro, de cima. A câmera perde altura.
3. **A descida (1,6–3,9 s):** devagar, até ficar baixa e perto do objeto pequeno, que flutua e gira. É o respiro do filme.
4. **A órbita (3,9–5,7 s):** cerca de 110° em volta do objeto pequeno em 1,8 s, com a câmera baixa passando por cima de um elemento próximo e contrastado (a rede). É o trecho mais agitado.
5. **As luzes apagam (4,4–6,5 s):** começa ainda na órbita; o mundo cai para 10% da luz e o objeto pequeno acende.
6. **O objeto abre (6,3–8,0 s):** uma fresta de luz no corte, a tampa sobe, aparece o mundo de dentro, aceso. A câmera acelera para dentro da abertura e chega ao enquadramento do quadro 0.

## A câmera e o ritmo

- Uma lente só, entre 38° e 45° de campo vertical, mais aberta na órbita.
- O objeto pequeno fica perto do centro; a rolagem da câmera troca de lado duas vezes no filme.
- Ritmo: entrada forte, respiro entre 1,5 e 3,5 s, pico na órbita, respiro curto, soco no mergulho final. Medido como diferença média entre quadros, o pico da órbita fica perto de duas vezes o respiro.

## Como o laço fecha (a parte que não pode errar)

1. **Três cópias do mesmo mundo, uma dentro da outra:** o de fora, o principal e o de dentro. Cada mundo traz o seu objeto pequeno, e dentro do objeto pequeno do principal mora o mundo de dentro. A geometria é compartilhada; só os materiais são por nível.
2. **Cada nível vive num tempo próprio:** o de dentro está uma volta atrás (t − 8), o de fora uma volta à frente (t + 8). O estado (luz, abertura, giro do objeto) é uma função desse tempo. Assim o de dentro no fim do filme é exatamente o principal no começo.
3. **Câmera em coordenadas que não dependem de escala:** distância até o ponto fixo da passagem de nível (interpolada em logaritmo), azimute, elevação, desvio do alvo em frações da distância, rolagem, campo. Uma volta do laço é "distância × escala" e "azimute + giro total". Repita as chaves uma volta para trás e uma para a frente antes de interpolar: a emenda sai contínua em posição e velocidade.
4. **Planos de corte proporcionais à distância** (perto = 1% da distância ao ponto fixo), senão a precisão de profundidade quebra ao atravessar 100 vezes de escala.
5. **Desfoque de lente sem escala:** o raio do desfoque depende só da razão entre a profundidade e o foco, nunca de metros.
6. **Luz por nível dentro do material:** as luzes do three.js são globais. Cada nível multiplica a própria luz num uniforme, e é isso que deixa o mundo de dentro aceso enquanto o de fora está apagado.
7. **Luz que gira com a câmera:** o mundo de dentro está girado em relação ao de fora (o giro total da câmera). A direção da luz acompanha o azimute da câmera, e a luz fica quase a pino para as sombras quase não se mexerem.
8. **Sombra de um nível por vez:** o mapa de sombra cobre o mundo principal e passa para o de dentro logo antes de o objeto abrir, quando o principal já está escuro.
9. **Confira com número:** leve a câmera do tempo 0 para dentro do mundo de dentro e compare com a câmera do fim. O erro tem que ser desprezível. Depois renderize o quadro 0 e o quadro final e compare as duas imagens.

## Armadilhas que já custaram retrabalho

- **Tela preta inteira.** Um `pow()` com base levemente negativa (valor interpolado entre vértices) vira NaN, e o brilho espalha o NaN pela tela toda. Sempre `clamp` a base de `pow` e limpe NaN antes do passe de brilho.
- **A tampa vista por dentro.** Com muito giro na dobradiça, a câmera do quadro 0 olha o interior da tampa e o objeto vira um anel flutuando. Pouco giro (5°) e bastante subida (20% do raio): a câmera vê a tampa por fora.
- **Uma linha no equador do objeto fechado.** A franja da borda vaza pelo corte. Esconda a franja enquanto o objeto estiver fechado.
- **Anéis no feltro.** Fibras sorteadas numa grade 3D alinham com a esfera nos eixos e formam anéis. Dobre a grade com um ruído de baixa frequência.
- **Poste no caminho.** A câmera entra voando sobre um canto do mundo; confira a rota contra tudo que é alto.
- **Lâmpadas estouradas.** Luz própria forte demais nas lâmpadas vira uma bola branca de brilho. Intensidade moderada e limiar do brilho acima de 1,0.
- **Órbita mansa.** Com o fundo muito desfocado, a órbita quase não mexe pixels. Câmera baixa, lente mais aberta, menos desfoque e um elemento nítido e contrastado perto da lente.
- **Cores lavadas no YouTube.** Quadros em JPEG saem em faixa completa; converta para BT.709 em faixa limitada no ffmpeg.

## Como construir

1. **Motor.** Projeto Node com `three` e `puppeteer-core`. Uma página monta a cena e expõe `window.renderAt(t)`. Tudo é função pura de `t`, sem relógio nem estado acumulado.
2. **Pós-processamento próprio.** Cena em alvo de 16 bits com antisserrilhado, desfoque de lente por profundidade, brilho, e acumulação de 12 subquadros por quadro (obturador de 180°, com deslocamento de subpixel): isso dá o desfoque de movimento e alisa fibras e telas. O tom (ACES) e a conversão para sRGB ficam no último passe.
3. **Render.** Chrome sem janela chama `renderAt` quadro a quadro, salva as imagens e o ffmpeg junta o MP4.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Construa a cena e renderize uma imagem parada de cada momento.
2. Olhe cada imagem você mesmo e corrija o que estiver errado antes de me mostrar.
3. Me entregue as imagens numa página só, com as imagens embutidas no próprio arquivo, e para cada uma: a janela de tempo, o que se move primeiro e como emenda na próxima. Espere minha aprovação.
4. Depois de aprovado, renderize o vídeo, revise em folhas de quadros (4 por segundo), confira a emenda do laço e meça o arco de energia.
5. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não copie marca, logotipo, personagem ou cena de nenhum filme, jogo ou produto; o objeto, o mundo e as cores são os meus.
- Não corte o plano e não use crossfade: é um plano único em laço.
- Nenhum texto em tela.
- Não feche o laço com fade para preto: o último quadro tem que ser o primeiro.
