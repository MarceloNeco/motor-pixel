# Perícia da referência: o motion 2D "06-mascote-aventura"

Este motion é a versão 3D de um motion nosso, já validado: `Claude Video 2.0/motions-validados/06-mascote-aventura/` (28,6 s, 1600×1600, 30 fps, sem áudio, validado em 3/11/2026). A perícia completa dele está em `pericia.md`, na mesma pasta; aqui fica o que importou para a versão 3D.

Aquele motion, por sua vez, estudou um [post de @mickeyxfriedman no X](https://x.com/mickeyxfriedman/status/2115932308138287552), um desenho a lápis que vira pintura feito em JavaScript puro. O vídeo de lá não entra neste acervo.

## Estrutura do motion 2D

| Tempo | O que acontece | Câmera |
|---|---|---|
| 0 a 2,2 s | O herói, o capacete, a luneta e a mochila | Bem fechada (4,6×) |
| 2,2 a 8,8 s | Casco, vigias, grade, cabine, hélice e o balão | Segue o lápis e recua (até 2×) |
| 8,8 a 13,4 s | A corda de bandeirinhas e a torre do observatório | Segue o lápis |
| 13,4 a 19,4 s | Moinho, ilha, casinha, ponte e acampamento | Segue o lápis |
| 19,4 a 20,5 s | Âncora e pássaros; o lápis sai | Abre rápido até o desenho inteiro |
| 20,9 a 22,25 s | Onda de cor da esquerda para a direita | Parada |
| 22,25 a 28,6 s | A pintura pronta | Parada |

Um plano só, sem corte.

## Design

- Papel `#faf9f5` com grão quase invisível; traço `#181716` com tremor de mão e pontas afinadas.
- Lápis preto comprido, ponta cinza, inclinado com a ponta para cima e à esquerda, sombra suave para baixo e à direita.
- Pintura em cor chapada com contorno `#2a1830`. Céu do azul `#2340e0` ao laranja `#ffbb66`, nuvens rosadas em faixas, lua, estrelas, dois morros roxos e quatro fileiras de árvores em gomos (azul, verde-azulado e rosa) com troncos roxos e vaga-lumes.
- Madeira vermelho-alaranjada, cúpula de vidro azul, ilhas roxas com grama verde, cristais, trepadeiras e luzes acesas.

## Movimento (medido com pericia-movimento.py)

```
mediana 3,53 | pico 10,36 | amplitude 2,9x | em quase-parada 3%
picos na fase do lápis; o maior em 19,5 s (a câmera abre)
```

A medida acima foi feita em 16/11/2026 no arquivo `mascote-aventura-compartilhar.mp4`. A perícia original registrou amplitude 3,4× e 16% de quase-parada; a diferença não foi investigada.

## O que a versão 3D manteve

- Os desenhos, a paleta, a ordem e o tempo de cada traço (o mesmo `cena.js`).
- O tremor da mão e a câmera que segue o lápis (o mesmo cálculo do `motor.js`).
- A onda de cor, com a mesma fórmula de borda.
- O quadro de frente da pintura.

## O que a versão 3D acrescentou

- A folha filmada de perto, com câmera inclinada, lápis 3D, sombra e desfoque.
- Profundidade em todas as peças e no fundo.
- Seis planos de trilho depois da onda, com cortes secos entre eles.
- Movimento no mundo pintado (hélice, moinho, bandeiras, fumaça, fogo, pássaros, nuvens, vaga-lumes e estrelas).
- Duas fileiras de árvores abaixo do quadro original e árvores baixas entre as fileiras, para as vistas de cima.
- 17,6 s a mais de filme.
