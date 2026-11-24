# Revisão e aceite: o que olhar, o que medir, como consertar

Três momentos de julgamento: os **cards parados** (antes de animar), a **folha de quadros** (depois de animar) e o
**teste contra a referência** (no fim). Em cada um, você revisa primeiro e mostra depois: a pessoa não deve ser quem
descobre que o pé fura o cobertor.

## Índice

1. Revisão dos cards parados
2. O crítico independente
3. Revisão do movimento na folha de quadros
4. O teste de aceite (`comparar.py`)
5. Como consertar ritmo
6. Como casar cor e composição em modo fidelidade
7. O relatório de entrega

---

## 1. Revisão dos cards parados

Abra cada card em tamanho cheio e passe por esta lista. Todos os itens vieram de defeitos reais que chegaram até a
pessoa ou custaram uma rodada.

**Enquadramento e oclusão**
- Tudo cabe no quadro, com margem? O lado de perto cresce com a perspectiva: numa cena que se abre, o que escapa é o
  lado da câmera.
- Algo alto entre a câmera e o herói? (laje sobre o térreo com câmera alta; parede interna tapando o cômodo vizinho;
  prédio de fundo em cima da câmera; poste alinhado com a porta; planta na frente das pernas)
- O herói está de frente ou de três quartos? De costas, perde-se a ação.
- O texto está inteiro, legível, sem nada cruzando por cima e sem cobrir o herói? Os rótulos não se cruzam?
- O que aparece cortado na borda: some ou lê como defeito?

**Forma e leitura** (olhe o card pequeno, como miniatura: ainda dá para dizer o que é?)
- Cada peça lê como o que é? Histórico de leituras erradas: cabeça pequena = lagartixa; pneu fino = scooter; flores
  grandes e iguais = adesivo; bolinhas = miçanga; corpo fosco de uma cor = massinha; peça central redonda = porca;
  tudo do mesmo tamanho = sem hierarquia.
- Peças se atravessam? (pé no cobertor, cauda no telhado, manopla no tanque) Olhe os encontros.
- Há um herói claro, maior ou mais contrastado que o resto, e miudezas nos vãos?

**Luz e material**
- O herói tem lado claro e lado escuro? Se a razão de luminância entre eles for menor que a medida na referência, a luz
  está chapada: menos preenchimento, luz mais de lado.
- A sombra encosta no objeto (sem fresta de luz no contato)? A penumbra tem a largura medida?
- O metal reflete alguma coisa clara? O verniz tem um risco de luz? Alguma superfície grande está lisa demais?
- Estourou (branco sem detalhe) ou afundou (preto sem detalhe)?

**Cor**
- Algum objeto some por ter a cor do fundo? Teste a paleta no quadro final, não na tabela.
- O acento aparece num lugar só? Ele contradiz a mensagem em algum lugar (acento de "bom" num número ruim)?

**Contra a referência** (modo fidelidade): ponha o card ao lado do quadro equivalente (`ref` em `cards.json`, ou
`comparar.py --sobrepor` quando já houver vídeo). Proporção do herói no quadro, altura do horizonte, direção da
sombra, temperatura: cada diferença visível vira ajuste antes de mostrar.

## 2. O crítico independente

Quem construiu a cena enxerga o que quis fazer. Antes de mostrar os cards (e de novo antes de entregar o vídeo),
peça a um subagente **sem o seu contexto** que julgue.

O arranjo que funcionou: copie os quadros da referência para uma pasta `critica/X/` e os nossos cards para
`critica/Y/` (sorteie qual é X e qual é Y, e tire dos nomes de arquivo qualquer pista). Diga ao crítico só que são
dois conjuntos do mesmo tipo de filme, feitos por estúdios diferentes, e dê **a mesma lista para os dois**, com
veredito binário por item e por conjunto:

- o mecanismo se lê em uma frase? qual?
- a luz modela o herói (lado claro e lado escuro)?
- os materiais convencem (o que parece cada superfície)?
- a composição está equilibrada, nada cortado, nada tapando o herói?
- o texto está legível e o português está certo?
- há defeito visível (peça atravessando outra, fresta, serrilhado, borrão)?

No fim, peça: "qual conjunto está mais bem acabado, e por quais três razões?" e "liste os defeitos de cada conjunto,
do mais grave ao menos grave". Não peça sugestões de estilo. Como ele não sabe qual é o nosso, as razões pelas quais
o outro ganha são exatamente a distância que falta. Uma passada custa uns três minutos.

Nos motions do acervo em que a crítica rodou, ela reprovou coisas que o construtor tinha deixado passar (luz chapada,
traço, lógica de luz, composição). Nos nove em que foi pulada, os defeitos chegaram à pessoa. Corrija o que ele
reprovar e rode uma segunda passada: a segunda passada foi a etapa mais esquecida.

## 3. Revisão do movimento na folha de quadros

```bash
node render.mjs folha && python3 $SKILL/scripts/folha.py out/folha --saida out/folha.jpg     # antes do render final
python3 $SKILL/scripts/folha.py out/NOME.mp4 --saida out/folha-final.jpg --cada 0.25           # depois
```

Olhe a folha inteira procurando:
- **Os dois lados de cada corte e de cada emenda.** É onde a continuidade quebra.
- **Quadros mortos:** trechos em que nada muda e a referência não segura (final que vira foto).
- **Saltos:** algo que muda de lugar de um quadro para o outro sem ser corte.
- **Fora do quadro:** peça que escapa por alguns quadros durante uma abertura ou um recuo de câmera.
- **Cópias em fila** no lugar de borrão (faltam subquadros naquele trecho).
- **Texto:** entra na hora certa, fica tempo suficiente para ler, não é cruzado por nada.
- **Tempo de leitura:** cada plano dura pelo menos 1,2 s; a imagem principal de cada plano fica pelo menos 0,9 s; há
  um respiro de 0,3 s depois do último elemento antes do corte. Transição rápida demais foi reprovada com "não dá
  tempo".

Depois **assista ao vídeo em velocidade real** pelo menos uma vez. A folha não mostra tremor, cintilação nem ritmo.
Se não assistiu, diga isso na entrega.

## 4. O teste de aceite

```bash
python3 $SKILL/scripts/comparar.py pericia/ref/referencia.mp4 out/NOME.mp4 --saida aceite --modo fidelidade
#   --modo estilo           só o movimento é portão; a cor vai como informação
#   --metas pericia/metas.json
#   --tira 0.8 1.3          quadros consecutivos de um trecho, referência em cima, nosso embaixo (física de um movimento)
#   --sobrepor 4.5          os dois a 50% (enquadramento com câmera parada)
```

Leia `aceite/ACEITE.md` e abra `aceite/pares.jpg`. O teste usa a referência como régua (não há piso fixo de
quase-parada: num laço ou time-lapse a própria referência marca 0%).

O que cada portão diz:

| Portão | Reprovar significa |
|---|---|
| Amplitude | o filme anda no mesmo volume o tempo todo; falta um soco, ou sobram movimentos médios |
| Quase-parada | falta respiro entre os socos |
| Picos | faltam socos, ou viraram um platô |
| Cortes | plano a mais ou a menos, ou crossfade onde há corte seco |
| Forma do arco | soca e respira em lugares diferentes da referência |
| Onde o movimento mora | a ação está em outra parte do quadro |
| Luminância, R:G:B, saturação, paleta | a imagem não tem o mesmo tom (só no modo fidelidade) |

Com referência parada, o aceite compara um quadro com um quadro: renderize o quadro-herói (`node render.mjs at T`)
e rode `comparar.py REFERENCIA.jpg out/teste/tNNN.NN.jpg --saida aceite`. Sai o veredito de cor e composição e o
`sobreposto.jpg` com o mapa de onde não bate. O ritmo, nesse caso, é julgado só no olho e pelo crítico.

**O teste mede ritmo e cor. Não mede qualidade.** Luz que modela, material, proporção, legibilidade, fluidez e se o
mecanismo se lê continuam no olho (seções 1 a 3). Um filme que passa pode estar ruim; um filme que reprova tem um
defeito com nome. Já houve motion aprovado pela pessoa abaixo das metas: quando reprovar e você julgar que o filme
está certo assim, entregue dizendo o que reprovou e por quê, nunca escondendo.

## 5. Como consertar ritmo

Ritmo foi o motivo mais comum de refazer (sete dos dezoito). O conserto quase nunca é "acelerar tudo": isso sobe a
mediana junto com o pico e a amplitude não sai do lugar.

- **Eleja um soco e acalme o resto.** Um momento com mais área do quadro mudando em menos quadros, e pausa antes e
  depois. Os outros acontecimentos ficam com a câmera parada.
- **O tamanho do elemento conta mais que a velocidade.** Um elemento que ocupa 2% do quadro não vira pico.
- **Câmera andando durante a ação** iguala tudo: ou a câmera anda, ou a ação acontece.
- **Montagem que gasta tanto quanto a virada** rouba o pico: encurte a montagem.
- **Planos abertos parados:** ponha os objetos girando devagar (20° a 40° por segundo) ou encurte o plano.
- **Órbita ou travelling manso:** câmera mais baixa, lente mais aberta, menos desfoque de fundo (fundo borrado quase
  não mexe pixel), mais graus em menos tempo.
- **"Filme de slide"** (parado, salta, parado) quando a referência deriva: dê uma deriva constante às paradas.
- **Final morto:** o herói continua vivo no último plano.
- **Começo agitado:** tire o fade de entrada, alise o fundo, comece com a câmera mais calma.

Depois de cada ajuste, meça de novo só o movimento com um rascunho pequeno (`node render.mjs video --q=rascunho
--w=960`), que é barato; o render final só quando o rascunho passar.

## 6. Como casar cor e composição em modo fidelidade

Na ordem, um de cada vez, medindo depois de cada passo:

1. **Câmera:** `camera.py` resolveu a da referência; `comparar.py --sobrepor T` mostra onde o enquadramento não bate.
   Corrija alvo e distância antes de mexer em qualquer cor.
2. **Exposição** até o p50 bater. 3. **Contraste** em torno do pivô até p5 e p95 baterem. 4. **Piso e teto.**
5. **Temperatura** (razão R:G:B): primeiro a cor das luzes, por último `tinta`.
6. **Saturação:** troque o tom antes de mexer no número (ACES dessatura, o neutro preserva).
7. **Paleta:** as linhas "outra cor" do relatório são tokens de material a corrigir.

"Idêntico" quer dizer medido, não interpretado: quando a pessoa pede igual, nada se ajusta no olho.

## 7. O relatório de entrega

Curto, e sempre com estes quatro blocos:

1. **O que é:** o filme, a duração, o formato, onde está o arquivo.
2. **Contra a referência:** o veredito do aceite com os números principais, e onde o nosso difere de propósito.
3. **O que mudou** em relação ao que foi aprovado nos cards.
4. **O que não foi verificado.** Diga sem rodeio: cards não aprovados antes de animar; crítica independente não
   rodada (ou sem segunda passada); vídeo não assistido em velocidade real; áudio medido e não ouvido; arquivo com
   alfa não aberto num editor; sem versão vertical; comportamento depois do upload não testado. Esta lista é o que
   permite à pessoa confiar no resto.

E os **limites honestos** do meio: é uma cena estilizada em tempo real, não render de estúdio nem vídeo
fotorrealista. Se a referência é fotorrealista (ou gerada por IA), diga antes de começar até onde o three.js chega.
