Quero um motion graphic 3D no estilo "totem em câmera chicote", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens: o poste, as placas, o semáforo e todos os adesivos são gerados no próprio código, com as texturas desenhadas em canvas.

## Meu tema

- **Nome da placa luminosa (2 linhas):** [UMA PALAVRA CURTA EM CIMA E UMA MAIOR EMBAIXO, em minúsculas. Exemplo: "a / esquina".]
- **Marca (placa preta):** [O NOME DA MINHA MARCA, em minúsculas. Exemplo: "aiverso". Nunca use marca, logotipo ou campanha de terceiros.]
- **Octógono vermelho:** [UMA PALAVRA. Exemplo: "Pare".]
- **Disco vermelho:** [UMA INTERJEIÇÃO CURTA. Exemplo: "Opa!".]
- **Losango amarelo (2 linhas):** [EXEMPLO: "EM / OBRAS".]
- **Luz verde do semáforo:** [ATÉ 4 LETRAS. Exemplo: "vai".]
- **Plaquinha da seta (2 linhas):** [EXEMPLO: "MÃO / ÚNICA".]
- **Placa de rua (2 linhas):** [EXEMPLO: "RUA DO / PROMPT".]
- **Losango pequeno:** [UMA PALAVRA. Exemplo: "devagar".]
- **Palavras dos adesivos:** [DE 8 A 12 PALAVRAS DE ATÉ 4 LETRAS. Exemplo: "olá, novo, 24h, ok, bora, tmj, 100%, vixe, ufa, IA, top, eita".]
- **Formato:** 16:9, 1920×1080, 30 quadros por segundo, 15 segundos, sem áudio.

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem a cena completa neste estilo (`src/main.js`), a fonte e o renderizador (`render.mjs`). Os textos ficam todos no bloco `COPY`, no começo de `src/main.js`; a câmera fica na tabela `CAM`. Se não existir, construa do zero seguindo o que está abaixo.

## O mecanismo

Um poste de rua atulhado de placas e adesivos fica parado no escuro, e uma câmera grande-angular chicoteia em volta dele. Cada chicote termina colado numa placa diferente, até a câmera recuar e mostrar o totem inteiro. É um plano só: nenhum corte, nenhum fade. Nada na cena se mexe além da câmera e das luzes do semáforo.

## O visual

- **Fundo:** preto. Atrás do poste, uma névoa vermelha escura, feita com um cartaz de luz que fica sempre atrás dele, de frente para a câmera, e some antes de tocar o chão. Chão preto polido, com reflexo fraco e borrado.
- **Poste:** tubo de aço cromado de 3,6 m, em segmentos, com luvas escuras, abraçadeiras e uns 35 adesivos enrolados nele. Base parafusada no chão.
- **Placas luminosas (4):** caixas de acrílico laranja acesas por dentro, curvas, de duas faces. O nome vai em duas linhas numa grotesca peso 900 inclinada, com as letras quase se encostando, em marrom quase preto. Uma delas é comprida (1,3 m) e é a protagonista.
- **Placa da marca:** chapa preta de borda branca, nome em minúsculas, peso 700, branco.
- **Semáforo:** amarelo, duas lentes de pontos de LED com pala. A de cima acende vermelha; a de baixo acende verde com a palavra escrita por cima dos pontos.
- **Placas de chapa (umas 15):** octógono vermelho de borda branca com um disco holográfico colado, disco vermelho com a interjeição (o "O" desenhado como um anel preto de miolo branco), losango amarelo com faixa zebrada, triângulos, uma chapa quadrada vermelha, um hexágono preto, a placa de rua branca, a plaquinha preta da seta. Todas com espessura, borda de alumínio e costas de metal escovado, levemente curvas, cada uma num ângulo.
- **Topo:** um cone de obra laranja com duas faixas brancas, enfiado torto no poste. Um capacete branco pendurado mais embaixo.
- **Adesivos:** em tudo. Recorte branco em volta, cores chapadas, sombra curta: etiquetas com palavra, carinha, estrela, código de barras, xadrez, faixa zebrada, raio, coração, olho, seta, explosão, foto instantânea. Por cima, rabiscos de canetão ilegíveis de propósito.
- **Paleta:** laranja aceso, vermelho, amarelo e preto. Branco, azul e verde só em detalhe pequeno.
- **Luz:** um flash preso à câmera (o que está perto fica claro, o longe cai no preto), quatro refletores fixos em volta com sombra, duas luzes vermelhas baixas e uma luz laranja fraca saindo de cada placa luminosa.
- **Lente:** campo de visão vertical de 55° a 70°, distorção de barril que amplia o centro, um fio de aberração cromática nas bordas, vinheta, brilho leve em volta do que está aceso e granulado fino.

## A coreografia (15 s)

1. **Abertura (0–1,0 s):** o totem em três quartos, já com a câmera em movimento, mergulhando na placa luminosa comprida.
2. **A placa luminosa (1,0–1,6 s):** ela ocupa mais da metade do quadro, em ângulo, com o poste e o semáforo ao lado. Deriva lenta.
3. **O semáforo (2,7–3,9 s):** de frente, vermelho aceso. Aos 3,15 s o vermelho apaga e o verde acende com a palavra. É o trecho mais calmo do filme. No fim a câmera desliza até o octógono vermelho entrar.
4. **Chicote 1 (3,9–4,85 s):** meia-volta rente à ponta da placa da marca. Pousa do outro lado, com a placa da marca à esquerda e o disco vermelho à direita.
5. **O outro lado (4,85–6,1 s):** recuo lento; entram o losango amarelo e as placas luminosas vistas por trás.
6. **O topo (6,1–7,3 s):** sobe até o cone.
7. **Volta por fora (7,3–9,8 s):** desce contornando de longe e encosta no octógono vermelho até ele encher o quadro.
8. **Chicote 2 (9,8–10,8 s):** meia-volta descendo até as placas cobertas de adesivos, embaixo.
9. **Subida (11,4–12,95 s):** sobe devagar, passando rente ao losango amarelo, até o disco vermelho.
10. **Recuo (12,95–15 s):** a câmera se afasta girando até o totem inteiro, com a base, e continua derivando devagar.

## A câmera e o ritmo

- A câmera gira em volta do eixo do poste: curvas por chaves para azimute, raio, altura, ponto de mira, giro em torno do próprio eixo (até 10°) e campo de visão. Some um tremor de mão bem pequeno, para ela nunca ficar morta.
- Quase toda a rotação do filme fica dentro dos dois chicotes e da abertura. Entre eles a câmera só deriva. É isso que faz o chicote ser um chicote.
- Meta medida (diferença média entre quadros): pico pelo menos 2,5 vezes a mediana, com os dois maiores picos nos chicotes e um terceiro na abertura. Os trechos mais calmos são o semáforo e o final.
- Desfoque de movimento de verdade: para cada quadro, renderize a cena várias vezes ao longo de 80% do tempo do quadro e some as imagens. Use mais amostras quando a imagem anda mais (uma a cada 5 pixels de deslocamento, de 8 a 72 por quadro).

## Armadilhas que já custaram retrabalho

- **Tudo estourado de branco.** Luz pontual a poucos centímetros de uma superfície (a do semáforo, a das placas luminosas) queima tudo em volta. Comece com as luzes fracas e suba aos poucos.
- **Linha do horizonte no fundo.** A névoa pintada numa esfera de fundo deixa uma linha reta onde o chão começa. Use um cartaz atrás do poste, que o chão espelha e o poste encobre, e apague a parte de baixo dele.
- **Placa luminosa lavada.** Emissão alta demais deixa o laranja rosado e o texto sem contraste. Mantenha a emissão em torno de 1,7 e deixe o brilho em volta por conta de um bloom fraco (força 0,18).
- **Adesivo aceso.** Adesivo colado na placa luminosa não deixa a luz passar: recorte os adesivos em preto no mapa de emissão.
- **Haste em cima do texto.** A placa luminosa tem duas faces. A haste que a prende ao poste tem que entrar pela ponta, não correr pelas costas.
- **Letras se engolindo.** Com as letras coladas demais, o "ui" vira um borrão. Espaçamento de −5,5% do tamanho e um contorno fino de 2% bastam.
- **Chicote que não se destaca.** Se a câmera viaja muito entre uma placa e outra, o filme inteiro fica no mesmo volume. Concentre o giro nos chicotes e passe rente a um objeto durante eles.
- **Câmera dentro de uma placa.** Num giro fechado é fácil atravessar a ponta de uma chapa. Confira a distância da câmera às placas no meio de cada chicote.
- **Cores erradas no editor.** Quadros em JPG saem em faixa cheia. Converta para BT.709 de faixa limitada ao montar o MP4.

## Como construir

1. **Motor.** Projeto Node com `three` e `puppeteer-core`. Uma página monta a cena e expõe `window.renderAt(t)`. Tudo é função pura de `t`, então qualquer quadro pode ser renderizado sozinho.
2. **Placas.** Um construtor único: recebe um contorno convexo (retângulo, octógono, círculo, losango, triângulo, hexágono) e devolve frente, costas e borda numa malha fina, que pode ser curvada e torcida. A frente recebe a textura do canvas.
3. **Texturas.** Um canvas por placa, com uma função de adesivos que espalha de 5 a 15 deles por sorteio com semente fixa. A fonte é carregada (FontFace) antes do primeiro canvas.
4. **Pós.** Soma das amostras de desfoque em ponto flutuante, bloom, e um último passe com a distorção da lente, o mapa de tons, o sRGB e o granulado. Renderize a cena 25% maior que a saída, porque a lente amplia o centro.
5. **Render.** Chrome sem janela chama `renderAt` quadro a quadro, salva as imagens e o ffmpeg junta o MP4.

## A ordem do trabalho

1. Construa o totem e renderize quatro vistas paradas, uma de cada lado, para conferir a montagem: placa atravessando placa, texto legível, nada estourado.
2. Monte a câmera e renderize um quadro parado de cada momento da coreografia. Olhe cada um você mesmo e corrija antes de me mostrar.
3. Me entregue os quadros numa página só e espere minha aprovação.
4. Depois de aprovado, renderize o vídeo, revise em folhas de quadros (3 por segundo) e meça o ritmo. Se os chicotes não forem os dois maiores picos, acalme o resto em vez de acelerar tudo.
5. Na entrega, diga o que mudou em relação aos quadros aprovados e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não use marca, logotipo, produto ou campanha de terceiros em nenhuma placa ou adesivo; o nome, as palavras e a marca são os meus.
- Não corte o plano e não use crossfade.
- Nenhum texto em tela além dos que eu listei. Os rabiscos são ilegíveis de propósito.
- Não anime as placas: quem se move é a câmera.
