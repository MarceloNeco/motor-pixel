---
name: referencia
description: |
  Abre o Atlas de referências (a galeria dos motions 3D aprovados, com o vídeo de cada um) no navegador, para a
  pessoa escolher um como ponto de partida, e depois segue com a skill motion-3d-por-referencia a partir do item
  escolhido. Use quando a pessoa digitar /referencia, ou pedir para "ver o atlas", "abrir as referências", "quais
  estilos de motion 3D existem", "escolher uma referência pronta". NÃO use quando a pessoa já mandou a própria
  referência (vídeo, link ou imagem) ou quer criar do zero: aí é direto a motion-3d-por-referencia, sem abrir nada.
metadata:
  author: Felipe Borges
  version: "1.0"
---

# /referencia: escolher um motion do Atlas

O Atlas é opcional. Ele serve a quem quer partir de um estilo pronto; quem tem a própria referência ou quer criar do
zero não passa por aqui.

1. Abra o Atlas e mostre a lista:

```bash
python3 ~/.claude/skills/motion-3d-por-referencia/scripts/atlas.py abrir
```

   No Windows: `python "%USERPROFILE%\.claude\skills\motion-3d-por-referencia\scripts\atlas.py" abrir`.

   (O Atlas mora dentro da skill `motion-3d-por-referencia`, na pasta `atlas/`, e as duas vêm no mesmo pacote. Se a
   skill estiver instalada em outro lugar, a pasta dela é a irmã desta: `../motion-3d-por-referencia/`.)

   O comando abre a página do Atlas no navegador (cada motion com o vídeo) e imprime a lista numerada. Se ele disser
   que o Atlas não está na máquina, repasse à pessoa a instrução que ele deu (onde pôr a pasta) e ofereça seguir sem
   o Atlas, com a referência dela.

2. Mostre a lista na conversa, em uma tabela curta (número, nome, estilo), e faça **uma pergunta só**: qual número ela
   escolhe e qual é o tema dela (o que entra no lugar do exemplo, formato e duração se já souber). Não pergunte mais
   nada.

3. Com a resposta, siga a skill `motion-3d-por-referencia` pela porta do atlas: `atlas.py NN` dá a pasta, o método e
   o código daquele motion; a perícia é pulada porque já foi feita. Do exemplo ficam o estilo, a técnica e o ritmo; o
   tema, os textos, a duração e o formato são da pessoa.

Se a pessoa olhar o Atlas e disser que prefere mandar outra referência ou criar do zero, siga a
`motion-3d-por-referencia` normalmente, sem insistir no Atlas.
