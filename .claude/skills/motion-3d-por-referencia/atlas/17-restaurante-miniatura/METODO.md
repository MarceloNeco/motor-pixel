# Restaurante em miniatura: como este motion foi feito

*Aprovado em 17/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 8 segundos, 1920×1080, 24 quadros por segundo, com áudio sintetizado. Uma esquina de cidade em miniatura, à noite e com asfalto molhado, vista de cima por uma câmera travada. Uma mão gigante crava uma bandeirinha de palito num terreno vazio; em time-lapse, sobe uma base redonda de vidro, uma treliça de madeira, e um hambúrguer cai em camadas no telhado. A mão crava a bandeira no topo do pão, o letreiro MEGA BURGER e os neons acendem, o pátio enche de guarda-sóis e a rua segue viva.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: formas primitivas, tornos (`LatheGeometry`), extrusão de fonte, um campo de distância (SDF) poligonizado para a mão, e texturas desenhadas em canvas. A única coisa que vem de fora é a fonte do letreiro (Arial Rounded Bold, lida do macOS).

## De onde veio o método

A referência foi o shot ["Miniature Restaurant"](https://dribbble.com/shots/27850125-Miniature-Restaurant) do Dribbble, um vídeo de 8 s gerado por IA. Dele veio só o método e o que foi medido; nome, textos, placas e o vídeo são outros. A perícia está em `pericia-da-referencia.md`.

O Felipe pediu a recriação "exatamente igual, com leves diferenças", e depois pediu uma segunda rodada para chegar mais perto em movimentação e ambiente. Por isso este motion tem duas fases de trabalho, descritas abaixo.

## O mecanismo do nosso filme

Uma mão gigante crava uma bandeirinha num terreno vazio e, em time-lapse, o lugar vira o negócio, com o objeto gigante no telhado e a cidade seguindo viva ao redor.

## A cena, em números (1 unidade ≈ 0,55 m)

- **Câmera travada:** azimute 44°, inclinação 24°, campo de visão 22°, distância 95, alvo (0,3; 3; −0,5). Calibrada projetando os cantos do terreno e a base do restaurante da referência (`ferramentas/resolver-camera.py` e `nossa-camera.py`).
- **Escala da gente:** pessoas, carros e postes usam U = 1,9 (metros reais × 1,9). Na referência as pessoas são enormes em relação ao restaurante: a vitrine tem uma pessoa de altura.
- **Restaurante:** centro (0,3; −0,5), vidro de raio 9,9, laje de raio 11,1. Alturas: base 1,8 · vidro até 5,8 · laje 6,5 · pão de baixo até 8,6 · carne até 10,25 · pão de cima de 10,75 a 15,35 · bandeira até 20,6.
- **Ruas:** 16 de largura, calçadas de 4,5, terreno x de −7,5 a 8 e z de −16 a 8.

## Pipeline de imagem (o que faz parecer foto de maquete)

1. **Subquadros:** 18 por quadro, obturador de 360°. Dá desfoque de movimento real (os carros riscam, a gente "pisca" como em time-lapse) e antisserrilhado por deslocamento subpixel (Halton).
2. **Reflexo planar** do asfalto molhado, renderizado num espelho em y = 0, borrado pouco na horizontal e muito na vertical (os reflexos esticam em direção à câmera). Máscara de poças por ruído. O ambiente falso (céu) não reflete no chão.
3. **Profundidade de campo** por coleta em espiral áurea com tamanho de borrão por profundidade (tilt-shift físico).
4. **Bloom** em cadeia de mips; tom **ACES**; depois gradação em espaço de exibição (contraste em torno de 0,42, ponto branco 0,93, piso de preto 0,008, exposição 0,86); vinheta e grão leves.
5. **Microrrelevo procedural** no shader (`foam.js`): espuma das árvores de maquete, poros do pão, terra.
6. **Luz de foto de maquete:** um foco quente de borda macia sobre a esquina, um preenchimento frio baixo, um foco estreito só no hambúrguer, luzes locais fortes (postes, vitrines, faróis) e névoa escura que apaga o fundo. As lâmpadas e janelas distantes ignoram a névoa e viram bokeh.

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula a cena inteira para o instante `t`, sem relógio nem estado acumulado; qualquer quadro pode ser renderizado sozinho.
- **Uma só linha do tempo** (`src/timeline.js`) comanda mão, bandeira, obra, hambúrguer, luzes, trânsito e áudio. Os instantes saíram da referência, quadro a quadro.
- **Time-lapse de verdade:** as pessoas ficam em grupos e mudam de lugar aos saltos alinhados à troca de quadro; as luzes do fundo cintilam; as copas tremem de leve; a exposição varia ±1,5% por quadro.
- **Obra em saltos:** o anel de vidro aparece de uma vez; a treliça de madeira cresce em cinco estágios, os da frente primeiro.
- **Hambúrguer em rajada:** as camadas (pão, carne, queijo, alface e tomate, pão com gergelim) caem de perto, uma depois da outra, em cerca de 0,1 s. Com 18 subquadros vira o mesmo borrão de 2 a 3 quadros da referência.
- **A mão é um SDF:** palma, falanges e polegar em cones arredondados unidos com smooth-min, poligonizados por surface nets, normais pelo gradiente, oclusão nas dobras e rubor nas pontas em cor de vértice. Unhas separadas.
- **Letreiro 3D:** a fonte vira formas (opentype.js), é extrudada e curvada em volta do cilindro do restaurante, de frente para a câmera.
- **Trânsito:** cada veículo é uma função do tempo sobre um caminho (com curva onde preciso). Há passagens rápidas em primeiro plano, uma fila de faróis ao fundo numa rua que sobe de frente para a câmera, um ônibus que chega, para e sai, e carros que sobem a rua da direita (o borrão do canto inferior direito).
- **Áudio** (`ferramentas/audio.py`): sintetizado do zero, lê os mesmos instantes da linha do tempo. Ambiente de cidade, passagens de carro em estéreo, marteladas da obra, cinco baques macios para as camadas do hambúrguer, zumbido do neon, guarda-sóis abrindo, talheres. Nível médio de −21 dBFS.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva as imagens e junta tudo com o ffmpeg. No Mac em que foi feito (Apple M5), o filme completo, com 18 subquadros, leva cerca de 90 segundos. O áudio é mixado ao vídeo no fim.

## A ordem em que foi feito

1. Perícia da referência: estrutura, design e movimento medido (`pericia-da-referencia.md`).
2. Câmera calibrada pelos cantos do terreno; cidade, restaurante, hambúrguer, mão, trânsito e gente construídos.
3. Primeira versão completa, comparada com a referência quadro a quadro.
4. **Segunda rodada, por pedido do Felipe:** tiras de quadros lado a lado, energia de movimento por janela e por região, e percentis de cor viraram metas numéricas. Mão, bandeira, obra, hambúrguer, trânsito, gente, luz, chão e gradação foram refeitos para casar.
5. Teste de aceite de movimento e revisão em folhas de quadros nos 8 instantes dos cards.

## Decisões que definiram o resultado

- **A mão pequena, só no topo, que entra e some em saltos**, em vez de grande e descendo ao meio do quadro: era o que mais destoava na primeira versão.
- **Anel de vidro aberto, sem laje, sob a treliça:** a laje só chega com o hambúrguer; é isso que faz a obra ler como obra.
- **Um foco com borda macia em vez de luz geral:** o resto cai no escuro e as luzes locais viram a imagem, como na referência.
- **Medir antes de mexer:** nada foi ajustado no olho na segunda rodada.
- **Gradação em espaço de exibição**, casada por percentis de luminância.

## Erros do caminho

- Um prédio do fundo estava em cima da câmera e cobria metade do quadro; o prédio de tijolo da frente sombreava a esquina inteira.
- As tampas da base escondiam o piso do salão; pelo vidro via-se o piso de obra claro (parecia parede).
- Contraste aplicado em espaço linear: primeiro esmagou os pretos, depois lavou a imagem.
- O asfalto molhado refletia o céu falso do ambiente e virava um véu marrom.
- A fila de faróis foi posta numa rua que sai do quadro; a da referência fica numa rua que sobe ao fundo.
- Carros "contornando a esquina" ficavam fora do quadro; o borrão da referência é de quem sobe a rua da direita.
- Pessoas andando o tempo todo viravam multidão de passarela; time-lapse tem grupos que pulam de lugar. Pulos no meio do quadro viravam fantasmas; alinhados à troca de quadro ficam nítidos.
- Um poste de semáforo ficava exatamente na frente da porta, alinhado com a câmera.
- O neon azul saiu do lado errado (conta do ângulo do arco).

## Resultado das medidas

| Medida | Nosso | Referência |
|---|---|---|
| Energia de movimento, média / mediana | 5,14 / 5,12 | 5,05 / 4,97 |
| Amplitude (pico ÷ mediana) | 1,7× | 1,9× |
| Picos | 8 | 6 |
| Quase-parada | 0% | 0% (a meta genérica de 25% não se aplica a um time-lapse contínuo) |
| Luminância mediana, abertura | 0,222 | 0,218 |
| Luminância mediana, plano final | 0,290 | 0,227 |
| R : G : B, plano final | 1 : 0,66 : 0,39 | 1 : 0,67 : 0,41 |

## Limites conhecidos

- É CG estilizado de maquete, não vídeo fotorrealista como a referência (que é gerada por IA).
- O plano final sai um pouco mais claro que o da referência, e o meio-direita do quadro tem mais movimento que o dela.
- O palito da primeira bandeira vai até o chão (na referência ele flutua, por erro da IA).
- Interior do salão e prédio de tijolo têm menos detalhe que os da referência.
- O áudio foi conferido por espectrograma e pelo nível, não por escuta.
- A fonte do letreiro vem do macOS. Em outro sistema, troque o arquivo em `render.mjs` (`SYSFONTS`) e o nome em `src/restaurant.js`.
- Sem versão vertical.

## Como rodar

Precisa de Node, ffmpeg, Python 3 (com `numpy` e `scipy` para o áudio) e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards          # 8 imagens paradas em cards/
node render.mjs video          # out/restaurante-miniatura-mudo.mp4
python3 ferramentas/audio.py out/audio.wav
ffmpeg -i out/restaurante-miniatura-mudo.mp4 -i out/audio.wav -c:v copy -c:a aac -b:a 256k -shortest out/restaurante-miniatura.mp4
```

- `QUALIDADE=rascunho node render.mjs at 0.3 2.46` gera quadros avulsos rápido (4 subquadros) em `out/teste/`.
- `CAM="az,incl,dist,x,y,z,fov" node render.mjs at 4.5` abre uma câmera de inspeção (por exemplo `44,20,42,0.3,4,-0.5,26` para um close).
- Trocar a marca: `BRAND` no topo de `src/restaurant.js` (letreiro e flâmula usam o mesmo texto). Placas de rua e "OLHE" ficam em `src/city.js`; "PARE" e "ABERTO" em `src/restaurant.js`; o destino do ônibus ("CENTRO") em `src/vehicles.js`.
- Os instantes de tudo ficam em `src/timeline.js`.
- As ferramentas de `ferramentas/` que mencionam `pericia/todos` esperam os quadros de um vídeo de referência seu (extraídos com `ffmpeg -i REF.mp4 pericia/todos/r%03d.jpg`); o vídeo da referência deste motion não está no acervo.
