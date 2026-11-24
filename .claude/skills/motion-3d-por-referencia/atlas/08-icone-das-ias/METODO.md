# O ícone das IAs: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 13,25 segundos, 1920×1080, 30 quadros por segundo, sem áudio, num plano só e sem corte. Um único ícone de app, gordo como um brinquedo, flutua num estúdio de uma cor. A cada 2 segundos ele vira e mostra a logo de outra IA em relevo: Codex, ChatGPT, Gemini, Groq, DeepSeek e, por último, Claude Code. Cada logo chega aberta em peças e fecha com um gesto tirado da forma dela, e o estúdio inteiro troca para a cor daquela marca numa onda que sai de trás do ícone. Na última virada o ícone dá uma volta a mais, a câmera recua e "Claude Code" sai da parede em letras em relevo.

A cena é código three.js. Os únicos arquivos externos são os seis SVG das logos e a fonte do letreiro.

## De onde veio o método

A referência foi o estilo #35 "Hero Icon" do [3D Style Atlas](https://www.futurepedia.io/resources/3d-style-atlas/view) da Futurepedia: um app inventado cujo ícone vira e mostra e-mail, agenda e notas. A perícia completa está em `pericia-da-referencia.md`.

O pedido do Felipe foi "algo bem parecido, porém utilizando as logos reais das inteligências artificiais". Por isso o objeto, a virada, a onda de cor e o fecho são os do estilo; o conteúdo é nosso:

| Papel no método | Na referência | Neste motion |
|---|---|---|
| Objeto único | ícone de app de brinquedo | o mesmo objeto (IA é app: logo de app mora num ícone) |
| O que muda a cada virada | uma função do app inventado | uma IA |
| Símbolo | desenhado para o filme | a logo oficial, tirada do SVG, sem redesenho |
| Cores | paleta inventada | a cor de cada marca no ícone e um tom claro dela no estúdio |
| Montagem do símbolo | peças inventadas | um gesto por logo, tirado da forma dela |
| Última face | a marca do app inventado | Claude Code |
| Letreiro | nome + frase em inglês, fonte Fredoka | "Claude Code", Inter ExtraBold |

## As logos

| Face | Arquivo | Origem | Silhueta igual à do SVG |
|---|---|---|---|
| Codex | `codex.svg` (forma) e `codex-color.svg` (degradê) | a forma já estava nas pastas do Felipe; a versão em cor foi baixada do LobeHub Icons em 16/11/2026 | 99,96% |
| ChatGPT | `chatgpt.svg` | pastas do Felipe | 99,83% |
| Gemini | `gemini.svg` | pastas do Felipe (arquivo do LobeHub Icons) | 99,93% |
| Groq | `groq.svg` | baixada do LobeHub Icons em 16/11/2026 | 99,69% |
| DeepSeek | `deepseek.svg` | pastas do Felipe (arquivo do LobeHub Icons) | 99,91% |
| Claude Code | `claude-code.svg` | pastas do Felipe (o símbolo de raios do Claude) | 100,00% |

A conferência (`node render.mjs logos`) desenha o contorno que a cena engrossa e o SVG original e compara os dois. O que falta de 100% é a borda: a cena troca cada curva por segmentos retos curtos.

As logos são marcas dos seus donos. Elas estão em `codigo/src/logos/` para o exemplo rodar; para outro tema, troque pelos arquivos do tema.

Três escolhas que não vêm dos arquivos:

- **Ordem.** As cinco primeiras estão na ordem em que o Felipe listou; o Claude Code foi para o fim, porque no método a última face é a marca que fica.
- **ChatGPT em preto e branco.** Ícone preto com o nó branco, num estúdio verde-menta que lembra o verde antigo da marca.
- **O prompt do Codex.** Na logo, o `>` e o `_` são vazados. Na cena são teclas brancas com o mesmo contorno, pousadas na nuvem. O desenho final é o mesmo (glifo branco dentro da nuvem), mas o vazado ficava cinza, na sombra das paredes do furo.

## Um gesto por logo

Toda logo já chega no ícone, nas costas dele, com as peças na pose aberta, e fecha depois de cravar. Nada aparece do nada e nada muda de tamanho.

| Face | Gesto | Por quê |
|---|---|---|
| Codex | a nuvem assenta; as teclas `>` e `_` são prensadas em cima dela; o cursor é apertado e solta | a logo é um terminal: o prompt é digitado |
| ChatGPT | o nó chega solto e trava em dois cliques de 60° | o nó tem simetria de 6: cada clique devolve o mesmo desenho, como uma catraca |
| Gemini | as quatro pontas chegam abertas, fecham uma por vez e são prensadas | a estrela é feita de quatro pontas |
| Groq | o "g" chega em quatro segmentos, que fecham na ordem do traço | a logo é um traço só: ela se escreve |
| DeepSeek | a baleia chega levantada e inclinada 26°, mergulha no lugar e balança | é a única logo que é um bicho |
| Claude Code | os 12 raios chegam abertos como uma flor, fecham em volta do relógio e são prensados | o símbolo é um centro com raios |

No Gemini, no Groq e no Claude os pedaços têm uma fresta fina entre si enquanto fecham. No quadro da prensa eles são trocados pela peça única, que é o contorno do SVG sem fresta.

## A cena, em números

As medidas estão em unidades da cena.

- **Ícone:** superelipse de expoente 5, 3,4 de lado por 0,8 de espessura, quina de 0,2. Cinta de metal polido de 0,09 na cintura. Flutua 2,4 à frente da parede.
- **Símbolos:** de 2,15 a 2,3 no lado maior (63% a 68% do lado do ícone), com 0,23 a 0,27 de altura. Quina de 0,05 nas formas cheias (nuvem, estrela) e de 0,016 a 0,035 nas finas (baleia, raios, nó).
- **Letreiro:** Inter ExtraBold, corpo 1,5, saindo 0,27 da parede, em duas linhas.
- **Câmera:** 26° de campo, a 13 de distância, um pouco acima e à direita. Avança 0,085 por segundo. No fecho vai para 14 de distância e 3 para a direita.
- **Luz:** uma chave quente de cima e da direita, espalhada num disco de raio 1,5 para a sombra sair macia. Quatro caixas de luz no ambiente para o brilho do verniz e uma bandeira preta atrás da câmera. Uma luz rebatida cuja cor de baixo acompanha o estúdio.

### Cores

| Face | Ícone | Símbolo | Estúdio |
|---|---|---|---|
| Codex | `#f3f4f7` | degradê `#B1A7FF` → `#7A9DFF` → `#3941FF`, teclas brancas | lilás `#c7b3ff` |
| ChatGPT | `#131313` | branco | menta `#93d6c0` |
| Gemini | `#f3f4f7` | o degradê do SVG (azul `#3186FF` com `#F94543`, `#FABC12` e `#08B962`) | azul-céu `#8cc0ff` |
| Groq | `#F55036` | branco | salmão `#ffa88f` |
| DeepSeek | `#4D6BFE` | branco | azul `#8496ff` |
| Claude Code | `#D97757` | marfim `#FAF9F5` | marfim `#f0eee6`; letreiro `#191817` |

## A linha do tempo final

| Janela | O que acontece |
|---|---|
| 0,0 – 1,75 s | Codex: a nuvem assenta (0,20–0,36 s), as teclas são prensadas (0,58 e 0,74 s), o cursor pisca (1,14 s) |
| 1,75 – 2,10 s | virada em aba; onda lilás → menta |
| 2,10 – 3,75 s | ChatGPT: cliques aos 2,22 e 2,44 s; depois parado |
| 3,75 – 4,10 s | virada em porta; onda menta → azul-céu |
| 4,10 – 5,75 s | Gemini: as pontas fecham de 4,18 a 4,42 s; prensa aos 4,66 s; depois parado |
| 5,75 – 6,10 s | virada em aba; onda azul-céu → salmão |
| 6,10 – 7,75 s | Groq: os segmentos fecham de 6,18 a 6,42 s; prensa aos 6,66 s; depois parado |
| 7,75 – 8,10 s | virada em porta; onda salmão → azul |
| 8,10 – 9,75 s | DeepSeek: a baleia mergulha de 8,16 a 8,46 s; depois parado |
| 9,75 – 10,21 s | a última virada, com uma volta a mais; onda azul → marfim; a câmera começa a recuar |
| 10,21 – 10,81 s | Claude Code: os raios fecham de 10,29 a 10,62 s; prensa aos 10,81 s |
| 10,97 – 11,61 s | o letreiro sai da parede, uma letra a cada 0,06 s |
| 12,0 – 13,25 s | quadro parado |

Cada virada: 0,4 s antes, o ícone recua 0,3 e gira 11° ao contrário; depois vira numa mola de 1,45 Hz que crava em 0,35 s, passa uns 10° e volta. A onda sai 0,1 s depois e cobre o quadro em menos de 0,2 s.

## Decisões que definiram o resultado

- **A logo chega aberta, não aparece.** Na primeira versão o nó e a baleia nasciam de um ponto e cresciam. Lia como efeito de tela. Na referência as peças grandes já estão no ícone, abertas, e fecham; só detalhes pequenos crescem.
- **A virada bate, a montagem não.** A montagem de cada logo dura até 0,6 s e mexe pouca área. É o que deixa o filme percussivo.
- **O soco é a última virada.** Ela tem uma volta a mais e a câmera sai junto, gastando a maior parte do recuo no começo.
- **A onda fica fora do desfoque de movimento.** Ela atravessa o quadro tão rápido que o desfoque transformava a borda num clarão de 108 pixels. Com a onda calculada no meio do quadro, a borda fica firme, com um fio claro.
- **Símbolos em 63% a 68% do ícone.** Em 75%, com o relevo visto um pouco de lado, pareciam empurrados para o canto.
- **Estúdios bem separados.** Codex e DeepSeek tinham estúdios quase iguais, e a onda devolvia a cor da abertura. Foram afastados.
- **Sem miolo inventado no Claude.** Uma peça central poligonal lia como porca. Os raios vão até o centro.

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula a cena inteira para o instante `t`. Não há relógio nem estado acumulado.
- **O ícone tem duas metades.** Frente e costas são dois materiais. A metade escondida troca de cor logo que a virada começa. Quando a virada seguinte assume, a conta recomeça do zero com as metades trocadas de papel; como o ícone é simétrico, a troca não se vê.
- **Cada logo é um construtor.** Recebe o grupo que fica em pé na face e devolve a pose das peças para "segundos desde que a face cravou" e a lista dos contatos que dão coice no ícone.
- **Pedaços.** O contorno do SVG é cortado por linhas retas (as diagonais da estrela, os vales entre os raios, as emendas do traço do "g"). Os vales do Claude são achados sozinhos: são os mínimos da distância do contorno ao centro.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva cada imagem e junta tudo com o ffmpeg.

Cada quadro é a média de 48 amostras (96 nos cards). Cada amostra roda a cena num instante um pouco diferente dentro do quadro, com a chave num ponto diferente do disco e com a câmera deslocada uma fração de pixel. Disso saem, de uma vez, o desfoque de movimento, a sombra macia e o antisserrilhado.

## A ordem em que foi feito

1. Perícia da referência: estrutura, design e movimento medido.
2. Logos: cinco já estavam nas pastas do Felipe; a do Groq e a versão em cor do Codex foram baixadas do mesmo conjunto.
3. Cena construída e silhuetas conferidas contra os SVG.
4. Dois rascunhos reprovados no teste de movimento; ritmo consertado.
5. Crítica independente dos cards e das tiras de movimento: veredito "ainda não". Sete correções aplicadas.
6. Página de cards e prévia do vídeo. **Aprovadas pelo Felipe.**

A prévia foi renderizada junto com os cards, antes da aprovação: como a cena inteira é função do tempo, o vídeo sai do mesmo código.

## Erros do caminho

- **Reprovado duas vezes no teste de movimento.** Amplitude de 9,2× e depois 6,9×, contra a meta de 12,6×. A montagem do ChatGPT (o nó caindo e girando, branco sobre preto) gastava quase tanto movimento quanto uma virada, e o recuo da câmera estava espalhado em 1,5 s. O conserto: montagens curtas, coice menor, recuo concentrado na última virada.
- **Um pedaço cheio no "g" do Groq.** O corte reto de um contorno côncavo deixava uma ida e volta de área zero em cima da linha de corte, e o primeiro segmento saía como meia-lua cheia. O corte passou a tirar essas farpas.
- **Logos nascendo de um ponto.** Ver "A logo chega aberta, não aparece".
- **Teclas do Codex cinza.** Eram peças afundadas nos rasgos da nuvem. Viraram teclas pousadas em cima.
- **Sombra em degraus.** Com 16 e 32 amostras, a borda da sombra mostrava as cópias. Com 48 fica lisa.
- **Fecho pequeno e deslocado para a esquerda.** A câmera chegou mais perto e o conjunto foi centralizado.

## Resultado do teste de movimento

| Medida | Este motion | Referência | Meta |
|---|---|---|---|
| Amplitude (pico ÷ mediana) | 27,0× | 18,0× | ≥ 12,6× |
| Tempo em quase-parada | 74% | 65% | ≥ 55% |
| Picos | 2 | 2 | ≥ 1 |

O teste mede ritmo, não a qualidade da imagem. O medidor também marca um "corte" aos 9,93 s: é a última onda (azul para marfim) cobrindo o quadro em 5 quadros junto com a volta e meia do ícone, não um corte de verdade.

## Limites conhecidos

- Não há áudio. A referência tem efeitos sonoros em cada contato.
- A segunda passada da crítica independente, depois das sete correções, não foi feita. Cada correção foi conferida no quadro.
- Na volta a mais da última virada, a logo do DeepSeek aparece de novo por um ou dois quadros, já no estúdio marfim.
- A baleia e os raios do Claude têm traço fino e quina pequena: leem mais como peça recortada do que como peça inflada.
- O degradê do Codex vem da versão em cor do conjunto LobeHub Icons; não foi conferido contra um arquivo de marca da OpenAI.
- Não existe versão vertical.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
node render.mjs logos
```

- `cards` gera as nove imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/icone-das-ias.mp4`.
- `logos` confere a silhueta de cada logo contra o SVG.
- `node render.mjs at 2.0 10.3` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- `AMOSTRAS=16 node render.mjs video` faz um rascunho rápido, com sombra em degraus.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
- Para trocar o conteúdo, edite `BEATS` e `LETREIRO` no começo de `codigo/src/main.js` e os construtores em `SIMBOLOS`.
- O arquivo de fonte só tem as letras de "Claude Code". Para outro letreiro, gere de novo (precisa do pacote Python `fonttools`):

```bash
python3 tools/fonte-typeface.py tools/Inter-Variable.ttf 800 src/fontes/inter-800.typeface.json "Seu Texto"
```

- `python3 tools/energia.py out/icone-das-ias.mp4` imprime o movimento do vídeo em passos de 0,1 s, para achar onde sobra.
