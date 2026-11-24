# Fone explodido: como este motion foi feito

*Aprovado em 17/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 10 segundos, 1920×1080, 30 quadros por segundo, com áudio sintetizado. Um fone de ouvido flutua sobre um fundo pêssego, se abre em fileira ao longo do eixo das conchas enquanto o arco sobe, ganha sete chamadas numeradas, se remonta com os rótulos acompanhando e fecha com "SETE PEÇAS / UM SOM" e ondas de som saindo das conchas.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: tornos (`LatheGeometry`), toros, caixas arredondadas, varreduras e texturas desenhadas em canvas. A única coisa que vem de fora é a fonte dos rótulos (Avenir Next, chamada pelo nome no macOS).

## De onde veio o método

A referência foi o estilo #08 "Exploded View" do [3D Style Atlas da Futurepedia](https://www.futurepedia.io/resources/3d-style-atlas/view): uma caneta esferográfica que flutua sobre um fundo creme, se desmonta em sete peças com chamadas em azul-tinta e se remonta. O Felipe pediu o mesmo estilo, "porém mais bonito, com cores diferentes e que seja um fone de ouvido".

Da referência veio só a estrutura, lida em 8 quadros do clipe (não houve medição quadro a quadro):

| Trecho da referência (8 s) | O que acontece |
|---|---|
| 0 a 1 s | objeto montado, título em duas linhas no canto superior esquerdo |
| 1 a 2,5 s | abre ao longo do eixo, em duas fileiras |
| 2,5 a 4,5 s | chamadas numeradas entram uma a uma |
| 4,5 a 6,5 s | remonta, os rótulos acompanham as peças |
| 6,5 a 8 s | frase final em duas linhas no canto inferior direito |

O objeto, a paleta, os textos, a linha de descrição sob cada nome, as ondas de som e o código são nossos.

## O mecanismo do nosso filme

Um objeto se abre ao longo do próprio eixo, cada peça recebe um número e um nome, e a remontagem mostra onde cada coisa vai.

## A cena, em números (1 unidade ≈ 10 cm)

- **Conchas:** centros em x = ±0,78, eixo ao longo de x. Ovais: 1,16 vez mais altas que largas. Raio externo 0,425, profundidade 0,29.
- **Afastamento na vista explodida** (ao longo do eixo, para fora): almofada −0,12 · tela 0,46 · driver 1,0 · bateria ou placa 1,54 · concha 2,1. O arco sobe 1,0.
- **Arco:** meia elipse de semieixos 0,82 × 0,80 com centro em y = 0,8, mais um trecho reto até y = 0,6; forquilhas elípticas (0,585 × 0,478) em volta de cada concha.
- **Assimetria real:** a concha esquerda leva a bateria, a direita leva a placa.
- **Chão de sombra** em y = −1,2.
- **Câmera:** campo de visão 24°, azimute de 37° para 23° ao longo do filme, inclinação 13° (10° com tudo aberto), distância 8,3 montado e 12,2 aberto, com aproximação de 0,55 nos últimos 2 s.
- **Paleta:** fundo `#fcecdf` → `#ecc0ad`, corpo `#0f4a50`, metal `#f4b89c`, creme `#f3e7d8`, coral `#f26a4b`, tinta dos textos `#123b42`.

## Pipeline de imagem

1. **Subquadros:** 24 por quadro (6 em rascunho), obturador de 180°, com deslocamento subpixel de Halton. Desfoque de movimento e antisserrilhado.
2. **Luz de área por sorteio:** a cada subquadro a chave muda de lugar dentro de um disco de raio 1,9. A soma dá a penumbra macia no chão.
3. **Acumulação em ponto flutuante**, depois tom neutro (Khronos PBR Neutral), um S leve de contraste, vinheta de 16% e grão.
4. **Rótulos em canvas 2D** desenhados por cima do quadro pronto, nítidos, sem desfoque.

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula a cena inteira para o instante `t`.
- **Instantes** (objeto `T` em `src/main.js`): título 0,25 · abre 1,5 · rótulos 3,25, um a cada 0,3 · fecha 6,7 · frase 8,35 · som 8,5.
- **Abrir:** as peças de fora saem primeiro (0,11 s entre uma e outra), 1,2 s cada, com passagem do ponto (ease de recuo 1,15). **Fechar:** de dentro para fora (0,07 s entre uma e outra), 1,05 s, suave nas duas pontas.
- **Clique e grave:** dois pulsos de escala amortecidos, um quando fecha (8,02 s) e outro no "um som" (8,5 s).
- **Ondas de som:** três anéis coral por concha, 0,75 s cada, andando 0,42 para fora.
- **Rótulos:** a âncora é um ponto local da peça projetado na tela. Aberto, o disco fica a um deslocamento fixo da âncora; fechado, numa posição fixa de tela. Uma interpolação de 1,5 s leva de um layout ao outro; a âncora também troca de ponto local.
- **Áudio** (`ferramentas/audio.py`): só numpy. Cama de acorde, sopro, estalos, sete notas ascendentes, encaixes, clique e grave. Nível médio de −22 dBFS.

## Como o render funciona

`render.mjs` sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva as imagens e junta com o ffmpeg. Num Apple M5, os 300 quadros com 24 subquadros levam cerca de 35 segundos.

## A ordem em que foi feito

1. Leitura da referência em 8 quadros e definição da estrutura.
2. Modelagem do fone e primeira imagem montada e explodida.
3. Três rodadas de imagens paradas para acertar afastamentos, câmera, materiais e rótulos.
4. Render completo, áudio e folha de 12 quadros para conferência.

Este motion foi direto ao vídeo, sem parada para aprovação de cards; os seis cards da pasta foram gerados depois, dos mesmos instantes.

## Decisões que definiram o resultado

- **Explodir as duas conchas, cada uma para um lado,** e rotular metade das peças em cada: a de longe mostra o lado de dentro, a de perto mostra as costas. Uma só fileira longa, simétrica, com o arco em cima.
- **Bateria de um lado e placa do outro,** como em fones reais: dá sete peças diferentes sem inventar nada.
- **Concha de parede dupla,** para o lado de dentro existir quando ela se afasta.
- **Layout fechado em posições fixas de tela.** Com deslocamento relativo, quatro rótulos da mesma concha caíam uns sobre os outros.
- **Tom neutro em vez de ACES,** para o pêssego e o petróleo não lavarem.
- **Uma linha de descrição sob cada nome:** é o que a referência não tem e o que mais enriquece a tela.

## Erros do caminho

- A primeira vista explodida saía do quadro pela direita: o lado de perto cresce com a perspectiva. Reduzi os afastamentos em cerca de 15% e desloquei o alvo.
- A câmera recuava junto com a explosão e as peças escapavam do quadro por meio segundo. O recuo passou a começar antes.
- O rótulo da almofada caía em cima da forquilha; os rótulos foram redistribuídos acima e abaixo da fileira.
- A tampa de metal da concha saía marrom, refletindo a parte escura do ambiente. Virou um rosé acetinado, com metalness 0,35.
- As ondas de som eram longas e cruzavam os rótulos da esquerda. Ficaram curtas.
- O título ficava em cima do arco na abertura. O alvo da câmera começa deslocado.

## Limites conhecidos

- As especificações dos rótulos (30 horas, 40 mm, alumínio anodizado, 1200 mAh) são ilustrativas.
- Durante a remontagem, por menos de um segundo, alguns rótulos passam por cima das peças.
- No objeto fechado, os rótulos de tela, driver, bateria e placa apontam para onde a peça está, por dentro da concha.
- O áudio foi conferido pelo nível, não por escuta.
- Não houve medição de movimento contra a referência; a estrutura foi lida em 8 quadros.
- A fonte vem do macOS. Em outro sistema, troque `FONTE` em `src/main.js`.
- Sem versão vertical.

## Como rodar

Precisa de Node, ffmpeg, Python 3 com `numpy` e Google Chrome.

```bash
cd codigo
npm install
node render.mjs cards          # 6 imagens paradas em cards/
node render.mjs video          # out/fone-explodido-mudo.mp4
python3 ferramentas/audio.py out/audio.wav
ffmpeg -i out/fone-explodido-mudo.mp4 -i out/audio.wav -c:v copy -c:a aac -b:a 256k -shortest out/fone-explodido.mp4
```

- `QUALIDADE=rascunho LARGURA=1280 node render.mjs at 1.0 6.2` gera quadros avulsos rápidos em `out/teste/`.
- Cores: `PAL` no topo de `src/fone.js`. Afastamentos: `AFASTA` e `SOBE_ARCO` no mesmo arquivo.
- Textos e posição dos rótulos: `ROTULOS` em `src/main.js`. Título e frase final: `desenharTitulo`. Instantes: `T`.
