# Perícia da referência: "Porco Rosso sunset dogfight" (prompt-motion.com)

Fonte: https://prompt-motion.com/nft-chen-5f8bb0 (post de @NFT_Chen, feito com Opus 5.5 e Three.js, em uma tentativa). O prompt original pede um duelo aéreo ao pôr do sol sobre o mar, caças brancos com verde e vermelho, cúmulos roxos, reflexo no mar, câmera "estilo Ghibli" e o texto "just breathe." na tela. O vídeo tem 13,96 s, 1920×1080, 30 quadros por segundo.

O vídeo foi estudado no navegador, quadro a quadro, sem baixar o arquivo.

## 1 · Estrutura

**Mecanismo, em uma frase:** a câmera não larga o avião; o mundo inteiro gira em volta dele, e cada manobra troca o mar, o sol e as nuvens de lugar no quadro.

| Trecho | O que acontece |
|---|---|
| 0–4 s | Câmera alta atrás do avião, olhando o mar escuro quase de cima. Título em pilha, palavra a palavra (4 palavras, serifada, negrito e regular alternados). Traçantes passam pelo quadro. Legenda de manobra embaixo. |
| 4–6,5 s | O avião sobe; o horizonte aparece com o sol baixo à esquerda, brilho anamórfico e bolhas de lente. O título dá lugar a uma frase curta em itálico, no centro, que fica até o fim. |
| 6,5–9 s | Rolagem entre torres de nuvem, horizonte balançando forte. É o pico de energia. |
| 9–14 s | Mergulho em espiral: o horizonte fica vertical, o avião em contraluz contra o céu laranja, nuvens empilhadas ao longo do horizonte. Legenda de manobra volta. |

- **Emendas:** nenhum corte seco. É um plano único, contínuo.
- **Texto:** três camadas — título em pilha (0–3,6 s), frase curta em itálico (4 s até o fim), legendas de manobra em versal espaçada (0–2 s, 2,5–4,5 s, 11,5–14 s).

## 2 · Design

- **Paleta:** céu violeta no alto, rosa e laranja no horizonte, sol dourado. Mar azul-violeta escuro com o caminho do sol em laranja. Nuvens em dois tons: corpo violeta, face iluminada em pêssego.
- **Avião:** creme, cocares nas asas, leme listrado. Hélice como um disco com aro.
- **Rastros:** faixas largas e claras saindo das pontas das asas, como fachos de luz.
- **Acabamento:** granulado de película, poeira e riscos, vinheta, brilho anamórfico no sol.
- **Tipografia:** serifada de alto contraste (Didone) para título e frase; sem serifa em versal espaçada para as legendas.

## 3 · Movimento (medido)

Cada quadro foi reduzido a 192×108 e comparado com o anterior (diferença média de luminância), em baldes de 0,5 s.

| Medida | Valor |
|---|---|
| Cortes secos | 0 |
| Mediana da energia | 4,61 |
| Pico | 7,68 (aos 7 s) |
| Amplitude (pico ÷ mediana) | 1,7× |
| Tempo em quase-parada | 0% |
| Arco | calmo no começo (2,4–4,3), sobe a partir dos 4,5 s, pico entre 5,5 e 9 s, desce até 2,3 no último balde |

**Leitura:** não é um filme de pausa e estalo. É um travelling contínuo cuja energia sobe e desce como uma respiração: começa calmo, enche no meio, solta no fim. O granulado de película mantém um piso de movimento mesmo nos trechos calmos.

**Metas do nosso filme:**
- nenhum corte seco;
- amplitude entre 1,2× e 2,6× (mais que isso vira filme de estalos, menos vira monótono);
- energia média dos 4 primeiros segundos no máximo 70% da energia entre 5 e 9 s;
- pico entre 5 e 10 s;
- último segundo abaixo da mediana.

O JSON com o perfil completo está em `movimento.json`.

## O que NÃO copiamos

- O filme de referência, os personagens dele (o piloto, o hidroavião vermelho) e qualquer coisa do universo do estúdio que ele homenageia.
- A pintura verde, branco e vermelho e os cocares da referência.
- Os textos ("NATURE BRINGS YOU PEACE", "just breathe.", os nomes das manobras e dos aviões).

Fica o método: câmera de perseguição em plano único, o mundo girando em volta do avião, pôr do sol com nuvens em dois tons, título em pilha seguido de uma frase curta, legendas de manobra e acabamento de película.
