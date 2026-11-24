---
name: motion-3d-por-referencia
description: |
  Recria em three.js, só com código, um motion graphic 3D a partir de um vídeo ou de uma imagem parada de
  referência, com o mesmo sistema de design e resultado bem próximo, no menor tempo possível. Mede a referência em
  segundos (câmera, luz, cor, proporções, movimento), parte de um modelo já testado e, em cena com vários objetos,
  constrói cada objeto isolado e em paralelo enquanto a cena e a animação avançam com substitutos. Aceita também um
  item do atlas de motions aprovados como ponto de partida. Use SEMPRE que o pedido envolver three.js ou motion 3D
  em código: "recria esse vídeo em 3D", "anima essa imagem em 3D", "igual a essa referência", "um motion do atlas",
  maquete, miniatura, vista explodida, ícone, personagem ou produto 3D animado, e também para melhorar ou depurar um
  motion three.js ("está chapado", "ficou morno", "render lento", "tela preta"), mesmo sem citar a skill. NÃO use
  para motion 2D em HTML/GSAP/HyperFrames (motion-por-referencia) nem para edição de gravação.
metadata:
  author: Felipe Borges
  version: "2.1"
---

# Motion 3D por referência (three.js)

Qualidade **e** velocidade. As duas saem do mesmo lugar: não construir duas vezes e não revisar o que não precisa.
Nos testes que deram origem a esta versão, uma cena complexa levou 2h15 porque foi feita inteira, saiu um degrau
abaixo, e teve os objetos refeitos um a um depois. Feita do segundo jeito desde o começo (cada objeto isolado, em
paralelo, e a cena montada ao mesmo tempo), ela cabe em menos da metade disso. Este arquivo descreve esse jeito.

`$SKILL` é a pasta desta skill (`~/.claude/skills/motion-3d-por-referencia`; no Windows,
`%USERPROFILE%\.claude\skills\motion-3d-por-referencia`). **No Windows**, troque `python3` por `python` (ou `py -3`)
nos comandos, use o caminho da skill entre aspas, e sirva-se do Edge se não houver Chrome: o resto é igual. Leia
agora `references/essencial.md` (uma página: a ficha, a API do modelo, as dez
regras de three.js e a revisão de um minuto). As outras referências você só abre se travar num ponto específico.

> **Regra-mãe.** Da referência vêm o método e a sensação: mecanismo, composição, câmera, luz, ritmo, acabamento.
> Nunca vêm marca, logotipo, textos, personagens de terceiros nem o arquivo. Em modo **fidelidade** ("igual",
> "bem próximo", "o mesmo visual") o mundo e a paleta da referência são mantidos e medidos; em modo **estilo**
> ("nesse jeito, sobre X") fica o método e o mundo sai do tema novo. Diga em uma linha qual modo entendeu e siga.

## As portas de entrada

| A pessoa... | Você... |
|---|---|
| mandou a referência (vídeo, link ou imagem) | segue direto para o passo 1. Não pergunte o que dá para assumir, e não abra o atlas. |
| quer criar do zero, sem referência | pede em uma mensagem o que falta do brief (tema, formato, duração, clima), escolhe o look mais próximo em `references/looks.md`, diz qual escolheu e segue do passo 2: não há perícia, a ficha vem do look e do pedido. |
| digitou `/referencia` ou citou um item do atlas (`atlas:18`, "o da vista explodida") | o atlas é a skill `referencia`: ela abre a galeria, a pessoa escolhe, e você roda `python3 $SKILL/scripts/atlas.py 18`, que dá a pasta, o método e o código. Pula a perícia (já foi feita) e parte do código. É o caminho mais rápido. |

O atlas vem dentro desta skill (pasta `atlas/`: ficha, método, código, capa e prévia de cada motion, mais a galeria
`atlas/index.html`), e o comando `/referencia` vem no mesmo pacote de instalação. Ele é opcional e só abre quando a
pessoa pede. Se ela chegar sem referência e sem ideia de estilo, vale uma
linha: "se quiser ver exemplos prontos, digite /referencia".

## O fluxo

### Passo 1 · Perícia relâmpago (até 5 minutos)

```bash
mkdir -p NOME && cd NOME
python3 $SKILL/scripts/pericia.py REFERENCIA.mp4_ou_LINK_ou_IMAGEM.jpg --destino pericia     # segundos
python3 $SKILL/scripts/novo-projeto.py . --formato 16:9                                       # ou 9:16, 1:1, --tamanho LxA
```

Leia `pericia/MEDIDO.md`, abra a folha de 1 quadro por segundo e um ou dois quadros em tamanho cheio. Faça as três
medidas que o olho erra (razão de luz no herói, área do herói, cor acesa de cada material: `sonda.py`) e escreva a
ficha curta `pericia/FICHA.md` pelo molde de `essencial.md`. Em fidelidade com câmera parada, resolva a câmera por
pontos (`camera.py resolver`, dois minutos): é o que faz a composição bater em vez de lembrar. Passe a ficha para
`src/ds.js` (cores, luz, imagem) e a câmera para `PLANOS` no `main.js`.

Baixe sempre o arquivo; referência vista só no navegador não se compara com nada depois.

### Passo 2 · Qual é o porte

| Porte | Como reconhecer | Como fazer | Alvo |
|---|---|---|---|
| **Simples** | um herói (ou dois objetos) de formas simples, fundo liso | você faz tudo sozinho, no `main.js` | 10 a 15 min |
| **Cena** | três ou mais objetos distintos, um personagem, ou um objeto que precisa ficar bom de perto | frentes em paralelo (passo 3B) | 45 a 60 min |

Na dúvida entre os dois, é cena: o que estoura o tempo é descobrir no fim que os objetos estão um degrau abaixo.
Os alvos são metas de trabalho, ainda não medidas em produção: diga à pessoa o tempo que espera levar e, no fim, o
que levou.

### Passo 3A · Simples

1. Construa a cena no `main.js`. Renderize dois ou três quadros parados (`node render.mjs at ... --q=rascunho
   --w=960`), passe a revisão de um minuto e corrija.
2. Anime (tabela `T`, `estado(t)`), gere o rascunho e **olhe a folha antes de qualquer outra coisa**:
   `node render.mjs video --q=rascunho --w=960` e `python3 $SKILL/scripts/folha.py out/NOME-rascunho.mp4 --saida
   out/folha.jpg`.
3. Vá para o passo 4.

### Passo 3B · Cena: frentes em paralelo

A ideia: **cada objeto é uma peça** em `src/pecas/NOME.js`, construída e revisada sozinha no banco de peças (quatro
vistas, sob a luz do filme, com o recorte da referência ao lado). Enquanto as peças são feitas, a cena inteira avança
com substitutos do tamanho de cada uma. Quando a peça fica pronta, ela entra sozinha no lugar do substituto.

1. **A planta (3 a 5 minutos).** Preencha `planta.json`: o acabamento pedido em poucas frases, a escala, e a lista de
   peças, cada uma com `nome`, `frente` (o grupo que vai construí-la), `o_que_e`, `tamanho` (a caixa em que tem de
   caber), `caixa_na_ref` (onde ela aparece na referência, em pixels), `material`, `nao_pode_faltar` e `movimento`.
   Agrupe em duas a quatro frentes de tamanho parecido (por exemplo: herói · cenário e mecanismos · objetos de apoio).
2. **Os pedidos.** `python3 $SKILL/scripts/frentes.py` gera um `frentes/BRIEF-FRENTE.md` por frente (com convenções,
   banco, orçamento de 5 rodadas por peça e o recorte ampliado de cada objeto em `pericia/recortes/`).
3. **Dispare todas as frentes de uma vez**, um subagente por frente, em segundo plano, cada um recebendo o próprio
   BRIEF como pedido. Sem subagentes, faça você as peças uma a uma, no banco, na mesma ordem: continua valendo a
   pena, só não é paralelo.
4. **Enquanto as frentes trabalham, você faz a casca.** No `main.js`, cada peça entra por
   `await carregarPeca('nome', [largura, altura, profundidade])`, que devolve um substituto enquanto o arquivo não
   existe. Com os substitutos: câmera, luz (`src/luz.js`, que o banco também usa), blocagem, a **animação inteira**, o
   rascunho e a folha. Quando as peças chegarem, o filme já anda.
5. **Integre.** As peças entram sozinhas no lugar dos substitutos. Renderize o quadro principal e mais dois ou três
   instantes, e ajuste só o que é do conjunto: encaixes, o que tapa o herói, pegada, brilho de cada peça em relação
   às vizinhas. Toda troca de vínculo (solto → preso) é uma mistura de 0,2 a 0,4 s, nunca um `if` seco.
6. Vá para o passo 4.

O render final recusa sair enquanto houver substituto no lugar de alguma peça.

### Passo 4 · Fechar

```bash
python3 $SKILL/scripts/comparar.py pericia/ref/referencia.mp4 out/NOME-rascunho.mp4 --saida aceite --modo fidelidade
#   referência parada: node render.mjs at T  e  comparar.py REFERENCIA.jpg out/teste/tNNN.NN.jpg --saida aceite
node render.mjs determinismo && node render.mjs video           # o render final, uma vez só
python3 $SKILL/scripts/folha.py out/NOME.mp4 --saida out/folha-final.jpg
```

Olhe `aceite/pares.jpg` (ou `sobreposto.jpg`) primeiro e os números depois. Conserte o que o olho e o número acusam
juntos, numa rodada. Os números apontam onde olhar: **nunca mude uma cor do sistema de design só para um portão
passar.** Entregue o vídeo, a folha e três linhas: o que bate com a referência, o que não bate, e o que não foi
verificado (por exemplo: câmera estimada, vídeo não assistido em velocidade real, sem crítico independente).

## O que mantém o tempo no alvo

- **Um render final.** Tudo antes dele é rascunho (`--q=rascunho --w=960`, segundos). Cada render final de uma cena
  pesada custa minutos, e foram seis numa produção que precisava de um.
- **Cinco rodadas por peça, no máximo.** Peça que lê de primeira e não tem defeito está pronta.
- **Qualidade máxima de desfoque só onde há movimento rápido:** `sub: t => (t > 2 && t < 2.5 ? 96 : 24)`. Abrir várias
  páginas para renderizar em paralelo não acelera (medido): quem limita é a placa de vídeo.
- **Uma passada de crítico independente, no máximo, e só em cena com fidelidade alta:** depois da integração, sobre o
  quadro principal e a folha do rascunho (como montar: `references/revisao-e-aceite.md`, seção 2). Cinco passadas
  custaram meia hora numa produção; a que mais rendeu foi a primeira.
- **A folha de quadros antes do render final**, sempre. É ela que mostra peça saindo do quadro, texto atravessado,
  cópias em fila e trecho morto.
- **Não refaça o que passou.** Corrija o defeito apontado e siga.

## Quando a referência é uma imagem parada

Uma imagem dá a composição, a luz, os materiais e a cor, mas não dá movimento. O filme é construído de trás para a
frente:

1. A imagem é o **quadro principal**. Construa esse quadro primeiro e faça-o bater com a imagem (câmera por pontos,
   `comparar.py` imagem contra imagem) antes de animar qualquer coisa.
2. Faça o **inventário**: liste tudo o que aparece, com posição e tamanho em % do quadro. Isso já é a lista de peças
   da planta.
3. Escolha o **mecanismo** pelo que a imagem mostra, e diga à pessoa em uma linha que o movimento é proposta sua:

| A imagem mostra | Mecanismo que costuma servir |
|---|---|
| um objeto herói sobre fundo liso | flutua e gira devagar · abre-se em partes e remonta · brota peça por peça |
| algo sendo segurado, pendurado ou pego | o gesto acontece (desce, pega, arranca), balança com inércia e assenta no quadro da imagem |
| uma cena cheia (maquete, vitrine, cidade) | monta-se sozinha e termina no quadro da imagem · a vida da cena em laço, com a câmera parada |
| um produto com tela ou botões | acende, a tela anima, um botão afunda, a câmera aproxima |
| um dado em forma de objeto (pilhas, barras) | cresce na ordem dos dados, a câmera percorre e recua |

4. Um filme de 8 a 10 segundos pede **um soco** (o gesto principal) com calma antes e depois, e o quadro principal
   perto do fim, segurando vivo: nada 100% parado, personagem que pisca e respira, objetos que reagem.

## Quando a pessoa quer aprovar por etapas, ou o motion vai para o acervo

O fluxo acima entrega direto o vídeo. Se a pessoa pedir para aprovar antes de animar, ou se o trabalho vai virar
material para outros, acrescente: a página de cards (`cards.json` + `python3 $SKILL/scripts/montar-cards.py .`) com o
quadro da referência ao lado de cada momento, e a perícia completa (`references/pericia-3d.md`). Motion aprovado só
vai para o acervo se a pessoa pedir.

## Variações

- **Vertical ou quadrado:** `--formato` no `novo-projeto.py`. Recomponha, não corte; texto dentro de `zonaSegura()`.
  Referência com outra proporção: renderize na dela (`--tamanho`) ou recorte-a para o formato de entrega, e diga qual.
- **Com transparência:** `node render.mjs video --alfa` (ProRes 4444), sem fundo na cena e sem pós em tela cheia.
- **Com narração:** cada momento nasce na palavra que o introduz; texto em tela só em palavras-chave.
- **Outra duração:** reescale a tabela `T` (ou `mapaDeTempo`); curto demais para ler, corte momentos.
- **A partir do atlas:** `atlas.py NN`, crie o projeto pelo modelo e porte do código do atlas as peças, os materiais,
  a câmera e a linha do tempo. Não copie o `render.mjs` nem o pipeline de lá: o modelo traz os dois corrigidos.

## Quando o trabalho é consertar um motion que já existe

1. Renderize dois ou três quadros e abra. Leia os avisos da página.
2. Ache o sintoma na seção 13 de `references/threejs.md`: "chapado" é luz e ambiente; "morno" é ritmo (meça com
   `pericia.py` no próprio filme); "a cor mudou no vídeo" é a conversão do arquivo; "tela preta" é NaN ou textura
   perdida num passe; "o card não bate com o vídeo" é estado acumulado; "objeto feio" é peça que nunca foi vista de
   perto: leve-a para o banco.
3. Conserte a causa e renderize os mesmos quadros para comparar antes e depois.

## O que não fazer

- Construir a cena inteira num arquivo só e descobrir no fim que os objetos estão fracos.
- Deixar câmera, luz ou proporção em adjetivo; estudar a referência só no navegador.
- Levar marca, texto, personagem ou o arquivo da referência; levar o mundo dela para um tema que não é dele.
- Relógio, estado acumulado ou sorteio sem semente na cena.
- Mais de um render final; mais de uma passada de crítico; mexer em cor para o número passar.
- Dois agentes editando o `main.js` ao mesmo tempo.
- Prometer fotorrealismo, ou chamar de pronto sem dizer o que não foi verificado.

## Mapa da skill

```
SKILL.md                           este arquivo
references/essencial.md            a página única: ficha, API do modelo, dez regras, revisão de um minuto
references/threejs.md              engenharia em detalhe e os erros que não avisam (abra a seção do sintoma)
references/pericia-3d.md           a perícia completa (câmera, luz, materiais, proporções, movimento)
references/revisao-e-aceite.md     lista de revisão, crítico independente, conserto de ritmo, relatório
references/looks.md                look → técnica three.js → onde já foi feito
references/acervo-receitas.md      receita de cada motion aprovado
references/acervo-codigo.md        onde está a melhor implementação de cada técnica
scripts/pericia.py                 mede a referência (vídeo, link ou imagem) num comando
scripts/camera.py                  resolve a câmera por pontos; desprojeta e projeta
scripts/sonda.py                   luz, sombra, cor e área em números, a partir de um quadro
scripts/novo-projeto.py            cria o projeto a partir do modelo
scripts/frentes.py                 da planta aos pedidos de cada frente, com o recorte de cada peça
scripts/atlas.py                   abre e lista o atlas e dá o ponto de partida de um item
scripts/servir_atlas.py            serve o atlas em http://localhost e abre o navegador (é o que `atlas.py abrir` usa)
scripts/empacotar-atlas.py         (para quem mantém a skill) refaz atlas/ a partir do acervo da skill gratuita; recusa outro acervo
scripts/empacotar-skill.py         (para quem mantém a skill) gera o .zip único de instalação
scripts/folha.py                   folha de quadros de um vídeo ou de uma pasta
scripts/comparar.py                aceite contra a referência (vídeo ou imagem)
scripts/montar-cards.py            página de aprovação, quando pedirem
scripts/fonte-typeface.py          fonte TTF → typeface.json, para texto extrudado
atlas/                             os motions aprovados: galeria (index.html) e, por motion, método, código e prévia
assets/template/                   o modelo: render.mjs, planta.json, src/main.js, src/ds.js, src/luz.js,
                                   src/banco.js (banco de peças), src/pecas/, src/lib/
```
