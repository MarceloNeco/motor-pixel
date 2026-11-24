# Perícia 3D: da referência ao sistema de design em números

A regra que organiza tudo aqui saiu de 18 motions feitos por este método: **o que a perícia registrou em número foi
respeitado ou pego pelo teste; o que ficou em adjetivo voltou como retrabalho.** "Luz suave e clara" virou "luz
chapada, pacote de ícones 3D". "Paredes bem abaixo dos personagens" custou uma rodada até virar 0,22. "Câmera alta,
lente longa" produziu composições parecidas que nunca batiam. Então a pergunta para cada linha da perícia é: *isso é um
número que eu consigo conferir depois?*

## Índice

1. O fluxo (20 a 40 minutos)
2. Camada 1: estrutura e mecanismo
3. Camada 2: o sistema de design 3D (câmera, luz, materiais, proporções, cor, lente)
4. Camada 3: movimento
5. Método × mundo e os dois modos de trabalho
6. O documento `PERICIA.md` e o `metas.json`
7. Quando a referência não baixa, é uma imagem, ou é um look do catálogo
8. Onde a perícia já falhou

---

## 1. O fluxo

```bash
python3 $SKILL/scripts/pericia.py REFERENCIA.mp4_ou_LINK --destino pericia
```

Leia `pericia/MEDIDO.md` inteiro e abra, nesta ordem: `quadros/folha-1fps.jpg` (o filme de uma vez),
`quadros/folha-4fps-NN.jpg` (onde cada momento começa e acaba; um quadro = 250 ms), os `chave-NN.jpg` e os
`calmo-NN.jpg` em tamanho cheio (é neles que se lê luz, material e proporção). Para movimento rápido, abra os quadros
consecutivos em `quadros/todos/`.

Assista mentalmente duas vezes: a primeira para dizer o que é; a segunda perguntando "o que eu teria que construir
para isso existir?". Só então meça o que o `MEDIDO.md` lista como pendente, com `camera.py` e `sonda.py`.

**Baixe sempre o arquivo.** Estudar a referência só no navegador foi o que deixou oito motions sem comparação
possível: o movimento saiu estimado no olho, e num caso o arquivo "da referência" guardava a medida do nosso próprio
filme. Se o site não deixa baixar, veja a seção 7.

## 2. Camada 1: estrutura e mecanismo

- **Mecanismo em uma frase**, do jeito que um espectador diria sem vocabulário técnico: "uma câmera grande-angular
  chicoteia em volta do poste e cada chicote termina colado numa placa"; "cada torre do gráfico sobe na hora em que a
  câmera chega nela". Sem a frase a perícia vira lista de cenas bonitas, e cenas bonitas não dão filme.
- **Momentos com janela de tempo**, em tabela: `# | janela | o que acontece | o que o olho segue até o próximo`.
  A última coluna é a emenda: cada passagem tem um elemento condutor.
- **Anatomia que se repete** dentro de um momento, se houver (antecipação ~0,4 s → virada em mola ~0,45 s → montagem
  ~1 s → coice). É isso que você vai programar uma vez e reusar.
- **Cortes, ciclos e laço:** quantos cortes e onde (o `MEDIDO.md` já diz); se é laço, onde o último quadro encontra
  o primeiro.
- **Como fecha:** o que segura na tela e por quanto tempo.
- **Camadas de texto** e os tempos de cada uma.

## 3. Camada 2: o sistema de design 3D

Preencha a **ficha 3D**. Cada linha tem a medida e a ferramenta. O que não der para medir entra marcado como
*estimado*, nunca como fato.

### Câmera

| O que | Como medir |
|---|---|
| Parada, desliza, aproxima, orbita | `MEDIDO.md` (por plano) dá um indício. Confirme no olho comparando dois quadros distantes do mesmo plano: o fundo não sai do lugar = parada (mesmo que a ferramenta acuse deslize, o que acontece quando a cena se monta); a forma do objeto muda = órbita; tudo só desloca = deslize. |
| Ortográfica ou perspectiva | Linhas paralelas do mundo (bordas de um piso, de uma caixa) continuam paralelas na tela = ortográfica. Convergem = perspectiva. Objetos iguais em profundidades diferentes com o mesmo tamanho = ortográfica. |
| Lente, altura, ângulo, distância | `camera.py resolver` (abaixo). |

**Resolver a câmera.** Abra `quadros/regua-NN.jpg` de um plano com câmera parada. Escolha de 5 a 8 pontos cuja
posição no mundo você consegue *arbitrar com coerência*: os quatro cantos de um piso ou tapete (declare "é um
retângulo de 10 × 6"), a base e o topo de um objeto de altura conhecida ou estimada. Inclua pelo menos um ponto com
altura: pontos só no chão deixam a lente solta. Escreva `pericia/pontos.json` e rode:

```bash
python3 $SKILL/scripts/camera.py resolver pericia/pontos.json      # perspectiva; acrescente --orto se for o caso
```

A saída traz a câmera já no formato do projeto (`{ az, el, dist, alvo, fov }`), o erro em pixels por ponto e uma
tabela de erro por campo de visão. Leia a tabela: se o erro mal muda entre 15° e 45°, os pontos não prendem a lente.
Nesse caso escolha a lente pela deformação visível e trave com `--fov`:

| Sinal na imagem | Lente (campo de visão vertical) |
|---|---|
| Quase sem convergência, objeto "achatado", fundo grande atrás dele | longa: 17° a 26° (produto, miniatura, ícone) |
| Convergência natural | 28° a 42° (cena, ação) |
| Linhas fugindo, o que está perto cresce muito, bordas esticadas | grande-angular: 55° a 70° |

Erro acima de ~1% da largura significa que as medidas que você arbitrou não batem com a imagem: revise os pontos, não
aceite a câmera. Depois de resolver, `camera.py desprojetar` leva qualquer pixel da referência para o mundo (onde
está cada objeto) e `camera.py projetar` diz onde um ponto do nosso mundo cai na tela. É assim que a composição
passa a bater em vez de "lembrar".

### Luz

A luz foi o ponto mais grave das críticas quando ficou em adjetivo. Meça quatro coisas num quadro calmo:

| O que | Como medir | Vira o quê no three.js |
|---|---|---|
| De onde vem a luz principal | `sonda.py Q sombra PE PONTA [--altura-px H]`: pé do objeto e ponta da sombra dele. Para o ângulo de verdade, desprojete os dois pontos com `camera.py` e calcule no mundo. Confira com o lado em que está o brilho dos objetos redondos. | posição da luz principal |
| Contraste da luz no herói | `sonda.py Q razao CLARO ESCURO` no mesmo material, lado aceso × lado em sombra. A razão em luz linear é a que vale. | razão entre a luz principal e o preenchimento (ambiente + contraluz). 2:1 = luz muito preenchida, chapada · 4:1 = modelada · 8:1 ou mais = dramática |
| Densidade da sombra no chão | `sonda.py Q razao CHAO_ACESO CHAO_NA_SOMBRA` | opacidade do `ShadowMaterial`, ou força do ambiente |
| Largura da penumbra | `sonda.py Q linha A B` atravessando a borda da sombra, em dois lugares: junto do objeto e na ponta da sombra | raio da luz de área (`luzDeArea`). Penumbra que abre com a distância = luz grande; igual nos dois lugares = borrão de pós, não luz |
| Cor da sombra | a última linha do `razao` (R, G, B do escuro ÷ claro) | cor do preenchimento e do ambiente: azul subindo = preenchimento frio |
| Existe contraluz (recorte)? | um fio claro na borda do objeto do lado oposto à luz | uma `DirectionalLight` por trás, fria ou quente |

Anote também o **tipo de mundo de luz**: estúdio claro de fundo infinito, estúdio escuro com painéis, exterior com
sol, noite com luzes locais, luz de flash presa à câmera. Cada um tem receita em `threejs.md`.

### Materiais

Descreva cada material principal por três sinais visíveis e traduza:

| Sinal | Leitura | three.js |
|---|---|---|
| Brilho pequeno e duro | liso | `roughness` 0,15 a 0,3 |
| Brilho largo e mole | acetinado | 0,35 a 0,55 |
| Sem brilho, só gradiente | fosco | 0,7 a 0,95 |
| Reflexo com a cor do objeto | metal | `metalness` 1 (superfície grande e plana: 0,35, senão sai marrom refletindo o escuro) |
| Brilho branco por cima de cor saturada | verniz | `clearcoat` 0,5 a 1 |
| Borda mais clara contra a luz, miolo fechado | tecido, feltro, pele | `sheen`, ou relevo de trama no `bumpMap` |
| Vê através, com distorção | vidro | `transmission` + `ior` + `thickness` |

"Plástico com verniz e um risco de luz" é produto; "tudo fosco com cantos redondos" é brinquedo ou massinha. Errar
essa leitura muda o filme inteiro, então escreva qual das duas é.

### Proporções e composição

Em `sonda.py Q area X0,Y0 X1,Y1` (ou `area auto`, que acha sozinho a caixa do que difere do fundo: bom para objeto
sobre fundo liso, num quadro sem texto, e para medir os dois lados pela mesma régua):

- **Quanto do quadro o herói ocupa** (e onde fica o centro dele): largura, altura e área. Herói pequeno demais foi
  causa de filme morno. Se o objeto novo tem outra proporção que o da referência (uma garrafa estreita no lugar de um
  fone largo), a área não vai bater sozinha: decida na perícia como compensar (inclinar, aproximar, deitar) e declare.
- **Tamanho dos elementos em relação ao herói** ("pontos com ~10% do diâmetro do herói, a 1/3 da largura dele um do
  outro"; "paredes com 1/6 da altura do personagem"). Sempre relativo: é o que sobrevive à troca de tema.
- **Escala das texturas.** Miniatura se lê por textura *grande demais* para o objeto (tábua larga, trama grossa) e por
  gente e detalhes grandes em relação à arquitetura. Textura fina faz parecer prédio visto de longe.
- **Como o herói se destaca.** Por cor nova? Por ser a peça mais clara e brilhante? Por foco? Por tamanho? Uma linha,
  porque é fácil trocar o mecanismo sem perceber.
- **Área do elemento do soco**, em % do quadro. Um soco que ocupa 25% do quadro na referência e 2% no nosso não vira
  pico, por mais rápido que seja.
- **Margens e zona de texto:** onde o texto mora, a que distância da borda.

### Cor e tom

O `MEDIDO.md` traz os percentis de luminância, a razão R:G:B, a saturação e a paleta agrupada em espaço perceptual.
Seu trabalho é dar **papel** a cada cor: fundo, herói, apoio, acento, sombra, texto, e a regra do acento (onde ele
pode e onde não pode aparecer; quase sempre é uma cor só, num item só). Para a cor exata de uma superfície, use
`sonda.py Q ponto X,Y` em três estados: acesa, à meia-luz e na sombra. São três leituras do *mesmo* material sob
luzes diferentes, não três cores: o token é a cor acesa corrigida pela exposição, e a sombra sai da luz.

Os percentis são a meta da gradação (p5 = piso de preto, p50 = exposição, p95 = teto). Escolha o tom pelo que a
imagem mostra: cores de marca saturadas e claras intactas pedem o neutro; claros que dessaturam e ombro de cinema
(noite, neon, fotorreal) pedem ACES.

### Lente e acabamento

- **Profundidade de campo:** a linha "nitidez por faixa" do `MEDIDO.md`. Confirme num quadro: o que está fora de foco
  é o fundo, o primeiro plano, ou o topo e a base do quadro (tilt-shift de miniatura)?
- **Desfoque de movimento:** nos quadros mais rápidos, a borda risca (obturador aberto) ou fica nítida em degraus?
  Quantos pixels de rastro para quantos de deslocamento? Rastro igual ao deslocamento = 360° (time-lapse); metade =
  180° (cinema); nenhum = sem desfoque (estilo desenho).
- **Grão, vinheta, brilho, aberração, distorção:** sim ou não, um por um. "Não tem" é informação e vira proibição.

## 4. Camada 3: movimento

O `MEDIDO.md` dá a assinatura: amplitude, quase-parada, picos, cortes, perfil a cada meio segundo e a energia por
região do quadro. Esses números só se comparam com outros medidos por esta mesma ferramenta (a régua antiga das
outras skills, `pericia-movimento.py`, usa outra escala: os valores registrados nos `METODO.md` do acervo servem
para entender a família de ritmo, não para comparar dígito a dígito). Antes de qualquer coisa, diga a **família**:

- **Pausa e estalo:** quase-parada alta (40% a 75%), amplitude alta (5× a 27×). O filme soca e segura. A câmera fica
  parada dentro de cada plano, porque qualquer movimento de câmera mexe o quadro inteiro e apaga a pausa.
- **Travelling que respira:** quase-parada perto de zero, amplitude de 1,5× a 3×. Plano único, laço, órbita,
  time-lapse. Aqui o que se compara é a **forma do arco** (onde sobe e onde desce) e onde o movimento mora no quadro.

Depois, a **física dos movimentos principais, contada em quadros**. O `MEDIDO.md` já traz, para cada pico, em
quantos quadros ele sobe e em quantos assenta, e uma folha de quadros consecutivos em volta dele
(`quadros/pico-NN-T.jpg`); a curva inteira está em `energia.csv`. O que falta é olhar essas folhas e dizer O QUE se
move: quanto anda, em quantos quadros, passa do ponto e volta? quantos quiques? em quantos quadros um elemento aparece? Exemplos do nível
certo: "o carimbo vai de 142% a 95,5% em 90 ms e assenta em 100% aos 200 ms"; "cada linha de texto entra 7 quadros
depois da anterior"; "o objeto dá dois quiques e o segundo tem um terço da altura". Para um movimento periódico
(quique, passo, giro): período, fração do tempo no ar, graus por segundo.

Por fim, **o que o filme nunca faz** (cinco ou mais): fusão entre planos, zoom lento, câmera tremida, partículas,
texto com fade, sombra projetada, brilho de lente. Essa lista é metade do estilo.

## 5. Método × mundo e os dois modos

Da referência vêm sempre **o método e a sensação**: o mecanismo, a ordem dos momentos, a gramática de câmera, o
ritmo, a física, o acabamento. Nunca vêm marca, logotipo, personagens, textos e o arquivo de terceiros.

Entre uma coisa e outra fica o **mundo** (cenário, objetos, paleta), e é ele que muda conforme o pedido:

- **Modo fidelidade** ("igual", "bem próximo", "o mesmo sistema visual", "exatamente esse estilo"): o mundo e a
  paleta da referência são mantidos e medidos; trocam-se a marca, os textos e o objeto pedido. Cor e composição
  entram no teste de aceite. Dos 18 motions, a maioria foi pedida assim.
- **Modo estilo** ("nesse jeito, mas sobre X"): fica o método; o mundo sai do tema novo. **O mundo é a metáfora do
  tema, não decoração.** Levar o mundo da referência para um tema que não é dele custou uma versão inteira ("ficou
  exatamente igual ao outro, você só trocou por moedas"). Exceção: quando o mundo da referência já serve ao tema novo.

Nos dois modos, escreva a **tabela método × mundo** antes de construir e leve para a aprovação junto com os cards:

| Papel | Na referência | No nosso |
|---|---|---|
| herói | | |
| mundo / cenário | | |
| unidade que se repete | | |
| elenco de apoio | | |
| paleta e acento | | |
| texto | | |

Se a pessoa não disse qual modo, as palavras dela costumam dizer. Declare o modo no início ("vou tratar como
fidelidade: mesmo sistema visual, com o seu tema") para ela corrigir cedo se não for isso.

## 6. `PERICIA.md` e `metas.json`

Um arquivo só, `pericia/PERICIA.md`, com estas seções e sem pular nenhuma:

```
# Perícia: <o que é>            (link da referência; modo: fidelidade | estilo)
## 1. Mecanismo                  uma frase
## 2. Momentos                   tabela: # | janela | o que acontece | o que o olho segue
## 3. Ficha 3D                   tabela: item | medido | como foi medido | confiança (medido / estimado)
                                 câmera · luz (4 medidas) · materiais · proporções · cor com papéis · tom · lente
## 4. Movimento                  família · assinatura (do MEDIDO.md) · física em quadros · onde o movimento mora
## 5. Nunca faz                  cinco ou mais
## 6. Método × mundo             a tabela
## 7. O mecanismo do NOSSO filme uma frase
## 8. Metas de aceite            as que valem para este filme e por quê
## 9. Pendências                 o que não deu para medir e como isso pode aparecer depois
```

`pericia/metas.json` só existe quando a régua genérica não serve (o `comparar.py` usa a referência como régua, sem
piso fixo). Casos reais: amplitude *entre* dois valores (`"amplitude": [1.2, 2.6]`), final parado
(`"energia_fim_max": 0.5`), cortes com outra tolerância (`"cortes_tolerancia": 2`), cor mais apertada
(`"lum_tol": 0.03`). Explique na seção 8 cada meta trocada.

## 7. Casos especiais

- **Não baixa** (Pinterest, banco de vídeos, player fechado): tente `yt-dlp` com o endereço da página; depois o
  endereço do arquivo que o navegador carrega (aba de rede). Se nada funcionar, grave a tela tocando o vídeo e use
  a gravação: uma medida com ruído ainda é uma medida feita pela mesma régua dos dois lados. Diga na perícia que foi
  assim.
- **A referência é uma imagem parada:** `pericia.py IMAGEM.jpg` mede o que um quadro tem e gera a régua. A ficha
  3D vale inteira e ganha um **inventário**: liste tudo o que aparece (cada objeto, cada fonte de luz, cada material)
  com a posição e o tamanho em % do quadro, porque não haverá outro quadro para tirar a dúvida. Foco em profundidade
  se mede comparando a largura de borda do herói com a de um objeto do fundo (`sonda.py linha` nos dois). O movimento
  é proposta sua, declarada como tal. O aceite compara o nosso quadro-herói com a imagem:
  `comparar.py REFERENCIA.jpg NOSSO.jpg`.
- **A referência é um look de catálogo** (um dos 37 do 3D Style Atlas, ou um motion do acervo): comece por
  `looks.md`, que diz a técnica e onde ela já foi implementada.
- **A referência tem outra proporção de quadro** (por exemplo 0,584 contra o 0,5625 do 9:16): em fidelidade,
  prefira renderizar na proporção dela (`novo-projeto.py --tamanho 1080x1850`) e recompor para o formato de entrega
  depois; se o formato de entrega manda, recorte a referência para ele e use o recorte em todas as comparações. Diga
  qual dos dois fez.
- **Mais de uma referência:** uma é a régua; as outras são apoio, e a perícia diz o que veio de cada uma.

## 8. Onde a perícia já falhou

| O que faltou | O que aconteceu | O que teria evitado |
|---|---|---|
| Separar método de mundo | uma versão inteira refeita | a tabela da seção 5 antes dos cards |
| Cronologia por quadro, energia por região, cor medida | segunda rodada inteira (mão grande no meio do quadro em vez de pequena no topo; trânsito na rua errada) | `pericia.py` + leitura de `quadros/todos/` já na primeira vez |
| Contraste da luz em número | "luz chapada", o ponto mais grave da crítica | `sonda.py razao` no herói |
| Como o herói se destaca | cards reprovados (herói com cor nova, na referência era só o mais claro) | uma linha na ficha |
| Área do elemento do soco | o soco existia e não virava pico | `sonda.py area` |
| Proporção em número | parede alta escondendo personagem | medida relativa ao herói |
| Energia por tipo de plano | planos abertos mortos, seis rascunhos | ler a energia por plano e por região |
| Medir pelos dois lados com a mesma régua | comparações "pela forma do arco" que não fechavam | baixar o arquivo; `comparar.py` |
