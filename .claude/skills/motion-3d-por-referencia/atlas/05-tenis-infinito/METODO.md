# Tênis infinito: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 8 segundos, 1920×1080, 30 quadros por segundo, sem áudio e sem texto, num plano único que fecha em laço. A câmera sai de dentro de uma bola de tênis aberta, sobrevoa uma quadra à noite, desce até a bola do jogo que flutua sobre a rede, dá a volta nela, as luzes da quadra apagam, a bola abre e dentro dela está outra quadra igual. O quadro 240 é o quadro 0.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: bola, feltro, grama, quadra, rede, alambrado, postes e jogadores são gerados no código.

## De onde veio

A referência foi "The infinite world of tennis", de Lagom CGI ([pin](https://br.pinterest.com/pin/1113515076614544584/)): vertical, 720×1280, 8 s. O pedido foi recriar em three.js, na horizontal, mantendo o design e o estilo, com pequenas mudanças. Por isso, ao contrário do motion 04, aqui o mundo da referência (bola e quadra) foi mantido de propósito. A perícia completa está em `pericia-da-referencia.md`.

O que mudou em relação à referência:

- **Formato:** tudo recomposto para o quadro largo.
- **Cenário:** entraram uma cadeira de juiz e dois bancos; os quatro postes ficaram simétricos.
- **Quadra:** a área de jogo tem um azul um tom mais fundo que o entorno.
- **Jogadores:** bonecos de maquete, sem rosto.
- **Bola:** sem logotipo.
- **Órbita:** 110° passando por cima da fita da rede.

## O mecanismo

O mundo cabe na bola. A bola do jogo é a mesma bola que envolve a quadra, em miniatura, e o último quadro repete o primeiro numa escala 103 vezes menor.

## A cena, em números

As medidas estão em metros do mundo.

- **Mundo:** disco de 23 de raio, cercado por um muro de 1,6 de altura. O piso fica 1,6 abaixo do corte da bola.
- **Bola que envolve o mundo:** raio de 24,73 (o raio interno é 93% do externo).
- **Bola do jogo:** raio de 0,24, parada a 1,30 de altura sobre o meio da rede. Ela é maior que uma bola de verdade, para a quadra parecer miniatura.
- **Escala entre níveis:** 0,24 ÷ 24,73, cerca de 1 para 103.
- **Quadra:** medidas oficiais (23,77 × 10,97), linhas de 10 cm (13 cm no fundo). Rede com 12,8 de largura, 0,914 de altura no meio e 1,07 nos postes, fios a cada 8,5 cm.
- **Alambrado:** 36 × 20,4, com 3,2 de altura, postes a cada 3 m e tela de 11 cm.
- **Postes de luz:** quatro, com 8,2 de altura, em (±9,5; ±11,9).
- **Feltro:** 22 camadas de fibra com 3,4% do raio de comprimento; costura com 0,064 rad de meia largura.
- **Grama da borda:** 30 mil folhas por borda, de 0,27 a 0,64 de altura.
- **Tampa:** abre com 5,5° de giro numa dobradiça atrás mais uma subida de 20% do raio, de 6,3 a 8,0 s.

## A linha do tempo

| Janela | O que acontece | Câmera |
|---|---|---|
| 0,0 – 0,9 s | bola aberta no quadro inteiro; a câmera entra pela abertura | de 50 para 17 de distância, horizonte a −9° |
| 0,9 – 1,6 s | a quadra inteira, acesa | perde altura, a 18° de elevação |
| 1,6 – 3,9 s | chegada à bola sobre a rede; ela flutua 3,4 cm e gira | de 8 para 2,7 de distância; o respiro do filme |
| 3,9 – 5,7 s | órbita de 110° em volta da bola, por cima da fita | baixa (5° a 10°), lente em 45°; o pico do meio |
| 4,4 – 6,5 s | a luz da quadra cai de 100% para 10% (começa na órbita); a bola acende a partir de 5,0 s | freia e sobe |
| 6,3 – 8,0 s | fresta azul, a tampa sobe, a quadra de dentro aparece | de 1,6 para 0,485 de distância, acelerando |

A câmera gira 170° em volta da bola do começo ao fim. As 13 chaves estão em `CAM`, em `src/main.js`.

## Como o laço fecha

- **Três níveis do mesmo mundo:** o de fora, o principal e o de dentro. Cada mundo tem a sua bola, e dentro da bola do principal mora o mundo de dentro. A geometria é uma só; os materiais são por nível.
- **Tempo por nível:** o mundo de dentro vive em t − 8 e o de fora em t + 8. Luz, abertura e giro da bola são funções desse tempo. O de dentro no fim do filme é o principal no começo.
- **Ponto fixo:** a passagem de um nível para o seguinte (escala, giro e deslocamento) tem um único ponto que não sai do lugar, a 1,297 de altura, praticamente o centro da bola do jogo. A câmera é escrita em volta dele: distância em logaritmo, azimute, elevação, desvio do alvo em frações da distância, rolagem e campo.
- **Chaves repetidas:** as chaves da câmera são copiadas uma volta para trás e uma para a frente (distância × escala, azimute + 170°) antes da interpolação. A emenda sai contínua em posição e em velocidade.
- **Planos de corte:** o plano de perto vale 1% da distância ao ponto fixo e o de longe, 4000 vezes isso. Sem isso a profundidade perde precisão ao atravessar 103 vezes de escala.
- **Conferência:** a câmera do tempo 0, levada para dentro do mundo de dentro, cai na câmera do fim com erro de 1 bilionésimo da distância. O primeiro e o último quadro, renderizados com um subquadro, dão SSIM de 0,98; a diferença é o granulado e a compressão.

## Decisões que definiram o resultado

- **Luz por nível dentro do material.** As luzes do three.js são globais. Cada nível multiplica a própria luz num uniforme do material, e é isso que deixa a quadra de dentro acesa enquanto a de fora está apagada.
- **A bola nunca apaga.** O feltro tem luz própria, separada da luz da quadra. Como a grama do horizonte é a borda da bola de fora, ela continua verde durante a órbita e só escurece no último terço.
- **O clarão da bola é um termo do material.** Uma luz de verdade no centro da bola iluminaria o mundo de dentro. O clarão sobre a rede e o piso é calculado no material de cada nível.
- **A luz gira com a câmera.** O mundo de dentro está girado 170° em relação ao principal. Para a emenda fechar, a direção da luz acompanha o azimute da câmera; com a luz a 70° de altura, as sombras quase não se mexem.
- **Sombra de um nível por vez.** O mapa de sombra cobre o mundo principal até 6,18 s e passa para o de dentro logo antes de a bola abrir, quando o principal já está no escuro.
- **Desfoque de lente sem escala.** O raio do desfoque depende só da razão entre a profundidade e o foco. O mesmo quadro sai igual em qualquer nível.
- **O céu é o interior da tampa.** Preto, com um brilho azul fraco perto do horizonte. Pela abertura da tampa aparece o escuro de fora, o que dá as duas faixas verdes no fundo, como na referência.
- **Linhas da quadra em shader.** Desenhadas por distância no próprio material do piso: nítidas de 50 m e de 30 cm, sem geometria sobreposta.

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula a cena inteira. Não há relógio nem estado acumulado.
- **Subquadros.** Cada quadro é a média de 12 subquadros dentro de um obturador de 180°, cada um com um deslocamento de subpixel e o padrão do desfoque girado. Isso dá o desfoque de movimento e alisa fibras, tela do alambrado e o próprio desfoque de lente.
- **Pós-processamento.** Cena em alvo de 16 bits com antisserrilhado 4×, desfoque de lente com 64 amostras (raio máximo de 4,2% da altura do quadro), brilho (força 0,4, limiar 1,05), acumulação, e no fim tom ACES, vinheta, granulado e sRGB.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva cada imagem e junta tudo com o ffmpeg em H.264, BT.709, faixa limitada. No Mac em que foi feito (Apple M5), os 240 quadros com 12 subquadros levaram cerca de 30 segundos.

## A ordem em que foi feito

1. Perícia da referência: estrutura, design e movimento medido.
2. Cena construída de uma vez e conferida em quadros avulsos.
3. Correções nas imagens (ver abaixo).
4. Vídeo de rascunho, teste de movimento, dois ajustes na órbita.
5. Cards e vídeo final. **Aprovado.**

A aprovação dos cards antes de animar, prevista no método, foi pulada: o vídeo foi entregue junto com os cards. A crítica independente dos cards também não foi feita.

## Erros do caminho

- **Tela preta.** O shader da grama fazia `pow()` de um valor interpolado que às vezes ficava levemente negativo. O resultado era NaN, e o brilho espalhava o NaN pela tela. A base agora passa por `clamp`, e o desfoque de lente limpa NaN antes do brilho.
- **O começo sem as metades da bola.** Com a câmera a 35 de distância no tempo 0, ela já estava dentro da abertura e a tampa não aparecia. Passou para 50.
- **A tampa vista por dentro.** Com 10,5° de giro, a câmera olhava o interior da tampa e ela parecia um anel flutuando. Ficou em 5,5° de giro e 20% do raio de subida.
- **Lâmpadas estouradas.** A luz própria das lâmpadas virava uma bola branca de brilho. A intensidade caiu de 9 para 3,2.
- **Poste no caminho.** Em x = 12,5 um poste passava a 4 m da lente na entrada. Os postes foram para x = 9,5.
- **Linha no equador da bola fechada.** A grama da borda vazava pelo corte. Ela agora fica escondida enquanto a bola está fechada.
- **Anéis no feltro.** As fibras são sorteadas numa grade 3D, que alinha com a esfera nos eixos. Uma dobra de baixa frequência na grade desfez os anéis.
- **Órbita mansa.** Na primeira medição a órbita marcava 7,6 de energia contra 12 a 16 da referência. Câmera mais baixa, lente mais aberta, menos desfoque e mais graus em menos tempo levaram a 11,4.
- **Faixa de cor errada.** O primeiro MP4 saiu em faixa completa (yuvj420p). O ffmpeg agora converte para BT.709 em faixa limitada.
- **Render que parecia travado.** Duas vezes o render não voltou em 4 minutos. A máquina estava ocupada com outros renders ao mesmo tempo; sozinho, cada quadro leva um décimo de segundo.

## Resultado do teste de movimento

| Medida | Este motion | Referência | Meta do script | Resultado |
|---|---|---|---|---|
| Cortes secos | 0 | 0 | 0 | passa |
| Amplitude (pico ÷ mediana) | 2,4× | 2,0× | ≥ 1,4× | passa |
| Picos | 5 | 8 | ≥ 5 | passa |
| Quase-parada | 0% | 0% | ≥ 25% | não passa |

A meta de quase-parada é um piso genérico do script, e a própria referência mede 0%: um plano único em laço nunca para. A forma do arco é a mesma da referência (entrada forte, respiro, pico na órbita, soco no fim). O teste mede ritmo, não qualidade de imagem.

## Limites conhecidos

- A órbita é mais curta e mais mansa que a da referência: a dela fica agitada de 4 a 6 s; a nossa tem o pico em 4,5 s e freia antes.
- A quadra acesa é um azul mais claro e menos ciano que o da referência.
- A costura da bola é uma faixa lisa; de muito perto falta relevo de borracha.
- Os jogadores não se mexem.
- O poste da frente passa no meio do quadro no primeiro meio segundo.
- Não existe versão vertical.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
```

- `cards` gera as dez imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/tenis-infinito.mp4`; `node render.mjs video 3` repete o laço três vezes (24 s).
- `node render.mjs at 4.7 7.3` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- `SUB=4 node render.mjs video` usa menos subquadros, para rascunho.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
- As cores ficam em `COL`, as medidas no bloco "medidas" e a câmera em `CAM`, todos em `src/main.js`.
