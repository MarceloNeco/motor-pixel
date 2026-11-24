# Perícia da referência

Referência: "The infinite world of tennis", de Lagom CGI ([pin](https://br.pinterest.com/pin/1113515076614544584/)). Vertical 720×1280, 30 quadros por segundo, 8,03 s, um plano único sem cortes, em laço. O vídeo foi baixado só para estudo e não fica nesta pasta.

## Mecanismo, em uma frase

O mundo cabe na bola: a câmera sai de dentro de uma bola de tênis aberta, encontra uma quadra, vai até a bola do jogo, e ela se abre com outra quadra dentro.

## Momentos

| Tempo | O que acontece | Câmera |
|---|---|---|
| 0,0 – 0,5 s | bola aberta em primeiro plano: tampa em cima, metade de baixo embaixo, quadra acesa no meio | avança pela fresta, horizonte inclinado |
| 0,5 – 1,4 s | a quadra inteira: azul estourado de luz, linhas brilhando, alambrado, postes, dois jogadores | desce em diagonal |
| 1,4 – 3,7 s | chega baixo à rede; a bola do jogo flutua sobre a fita, o fundo desfoca | quase para |
| 3,7 – 5,6 s | órbita em volta da bola, da vista de frente para a vista ao longo da rede | o trecho mais agitado |
| 5,6 – 6,4 s | as luzes da quadra apagam; a bola fica acesa, com halo | fecha na bola |
| 6,4 – 8,0 s | a bola racha no equador, a tampa sobe e mostra outra quadra | mergulha na abertura; o último quadro é o primeiro |

## O que sustenta o laço

- O mundo é um disco que mora no corte de uma bola; a grama da borda é o feltro cortado.
- A bola do jogo é a mesma bola, em miniatura. O último quadro repete o primeiro numa escala menor.
- Ao fundo da quadra aparecem duas faixas verdes: a borda de baixo e a borda da tampa aberta, com o escuro de fora entre as duas.

## Design

### Paleta, medida nos quadros

| Papel | Referência | Nosso |
|---|---|---|
| Quadra acesa | azul-ciano estourado, perto de #50c0f0 | #1a7ed6 e #1269c8 sob luz forte e brilho |
| Quadra na meia-luz | #2670be | o mesmo material com a luz em 100% |
| Quadra apagada | #0a2a5c | o mesmo material com a luz em 10% |
| Linhas, rede, alambrado | branco com brilho | #f3f6f8, as linhas com um pouco de luz própria |
| Feltro | verde-limão neon, do amarelo #dcff3c ao verde #3c9a00 | #bcff12, #76dc00, #2c8800, #114a03 |
| Costura | faixa branco-acinzentada, afundada | #e3e6e0 com sombra nas bordas |
| Noite | preto | preto, com um brilho azul fraco perto do horizonte |

### Linguagem de render

- Miniatura fotografada de perto: pouca profundidade de campo, fundo muito desfocado, bola nítida.
- Horizonte quase sempre inclinado (entre 5° e 15°).
- Desfoque de movimento forte nas passagens rápidas.
- Brilho em volta do que é branco e, no escuro, em volta da bola.
- Feltro com fibra visível nas bordas; grama na borda do corte.
- Nenhum texto em tela.

### O que o nosso NÃO copia

- O logotipo impresso na bola da referência (a nossa não tem marca).
- Os jogadores: os nossos são bonecos de maquete sem rosto.
- A composição vertical: tudo foi recomposto para o quadro largo.

## Movimento

Medido com `pericia-movimento.py` (energia de movimento a cada meio segundo). Números brutos em os arquivos de medição do projeto original.

| Tempo | Referência | Nosso |
|---|---|---|
| 0,0 s | 18,4 | 14,3 |
| 0,5 s | 12,1 | 15,2 |
| 1,0 s | 9,0 | 10,8 |
| 1,5 s | 6,7 | 6,2 |
| 2,0 s | 4,4 | 5,4 |
| 2,5 s | 3,7 | 5,3 |
| 3,0 s | 6,0 | 4,6 |
| 3,5 s | 5,1 | 3,7 |
| 4,0 s | 12,3 | 7,5 |
| 4,5 s | 11,4 | 11,4 |
| 5,0 s | 14,6 | 7,5 |
| 5,5 s | 16,1 | 5,6 |
| 6,0 s | 13,8 | 4,0 |
| 6,5 s | 9,1 | 3,6 |
| 7,0 s | 6,3 | 4,4 |
| 7,5 s | 6,2 | 7,2 |
| 8,0 s | 16,1 | 12,6 |

### Leitura

- A forma do arco é a mesma: entrada forte, respiro entre 1,5 e 3,5 s, pico na órbita, respiro, soco no mergulho final.
- A órbita da referência dura mais (de 4,0 a 6,0 s) e é mais agitada. A nossa concentra o pico em 4,5 s e freia antes.
- Nenhum corte seco nos dois. O "corte" que o script aponta em 0,03 s na referência é o primeiro quadro do laço.

### Teste de aceite

| Medida | Nosso | Referência | Meta do script | Resultado |
|---|---|---|---|---|
| Amplitude (pico ÷ mediana) | 2,4× | 2,0× | ≥ 1,4× | passa |
| Picos | 5 | 8 | ≥ 5 | passa |
| Quase-parada | 0% | 0% | ≥ 25% | não passa |

A meta de quase-parada é um piso genérico do script. A própria referência mede 0%: um plano único em laço nunca para. Fica registrado como reprovado nesse item.
