# Rotina na casa: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 27,5 segundos, 1920×1080, 24 quadros por segundo, sem áudio e sem texto. Uma casa de dois andares em corte se monta sozinha e um boneco atravessa a manhã: dorme, acorda, escova os dentes, desce a escada, faz café, se espreguiça, tira a camiseta e pula na piscina.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: as formas são primitivas (caixas arredondadas, cilindros, cápsulas, esferas) e as texturas são desenhadas num canvas dentro do próprio código.

## De onde veio o método

A referência foi a campanha "Airbnb It", feita na BUCK com direção criativa de Ege Soyuer ([case](https://www.ege.work/airbnb-houseboat)). Dela veio só o método; marca, casas, personagens e paleta são outros. A perícia completa está em `pericia-da-referencia.md`.

O que a perícia mostrou, medindo quatro spots de 15 segundos:

- **Mecanismo:** a maquete se monta sozinha diante de uma câmera parada, e tudo o que acontece brota, some ou se transforma dentro dela.
- **Câmera:** isométrica, alta, travada. De 1 a 4 cortes secos por spot e nenhum crossfade.
- **Ritmo:** de 39% a 71% do tempo em quase-parada, com poucos estalos fortes. A relação entre o pico de movimento e a mediana ficou entre 5,9 e 26,6 vezes.
- **Miniatura:** o diretor descreve que eles aumentaram texturas e detalhes em vez de encolher tudo na mesma proporção. É o princípio que este motion mais aproveita.

## O mecanismo do nosso filme

A casa de boneca se monta sozinha e, com a câmera parada em cada cômodo, o boneco atravessa a manhã inteira até o mergulho.

## A cena, em números

As medidas estão em metros, na escala da casa.

- **Bloco de dois andares:** 8,4 de largura por 3,6 de profundidade, pé-direito de 2,7, laje de 0,18. Em cima, quarto (0 a 4,6) e banheiro (4,6 a 7,2); o vão da escada ocupa de 7,2 a 8,4.
- **Cozinha:** numa extensão térrea, sem teto, à frente do bloco (largura de 4,2 a 8,4, profundidade de 3,6 a 6,6).
- **Piscina:** 2,8 por 2,95, com 0,6 de fundo, recortada na base.
- **Base:** placa de 9,8 por 8,9 com 0,72 de espessura.
- **Escada:** 14 degraus de 0,2 de piso e 0,192 de altura, descendo do fundo para a frente, de frente para a câmera.
- **Boneco:** cerca de 1,65 de altura, quadril a 0,88 do chão.
- **Câmera:** ortográfica, giro de 38 graus e inclinação de 27 graus. Sete enquadramentos: geral, quarto, banheiro, escada, cozinha, deck e piscina.
- **Sol:** direcional, cor `#fff1dc`, vindo da direita e do alto. Fica a uns 55 graus da direção da câmera.

## Decisões que definiram o resultado

- **Cozinha fora do bloco de dois andares.** Com a câmera a 27 graus, a laje de cima tapa tudo o que está a mais de 1,3 m de altura no meio do térreo, e a cabeça do boneco sumia. A cozinha foi para uma extensão sem teto; sob a laje ficou só a sala, baixa e decorativa.
- **Divisória de meia profundidade.** A parede entre quarto e banheiro vai só até 2,0 m de profundidade, sem porta. Inteira, ela tapava metade do banheiro.
- **A câmera faz o papel do espelho.** A pia fica solta, perto da borda aberta, e o boneco fica atrás dela, de frente para a câmera. Encostada na parede do fundo, ele escovaria os dentes de costas.
- **Sol de lado.** A primeira versão tinha o sol quase na direção da câmera e a imagem saiu chapada, sem sombra visível. Movido para o lado, as sombras apareceram e a cena ganhou volume.
- **Câmera travada.** Sem aproximação lenta. Qualquer movimento de câmera mexe o quadro inteiro o tempo todo e apaga a diferença entre pausa e estalo.
- **Montagem à noite.** A abertura usa o mesmo tom noturno da cena em que ele dorme, para o corte entre as duas não ter salto de luz. O sol acende de uma vez aos 4,6 s, e esse é o primeiro estalo do filme.
- **Texturas aumentadas.** Tábuas de 33 cm de largura, trama de tecido com quadrados grandes. Com textura fina, a casa parecia um prédio visto de longe em vez de uma miniatura.

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula a cena inteira para o instante `t`. Não há relógio nem estado acumulado, então qualquer quadro pode ser renderizado sozinho.
- **Poses.** Cada ação é um conjunto de ângulos de juntas (dormir, bocejar, sentar na beira da cama, escovar, alcançar, beber, espreguiçar, puxar a camiseta, agachar, encolher, boiar). A animação interpola de uma pose para a outra com aceleração e freada.
- **Caminhada.** Um ciclo calculado a partir da distância percorrida num trajeto de pontos. O corpo vira para a direção do trecho e suaviza a curva perto de cada ponto. Na escada, a altura segue os degraus e o passo encurta para um degrau por apoio.
- **Linha do tempo.** Uma sequência de trechos de três tipos: segurar a pose, ir para outra pose e andar por um trajeto. Cada trecho começa onde o anterior terminou.
- **Cortes calculados.** Os instantes de corte saem da posição do boneco (por exemplo, quando cruza a divisória ou pisa no térreo), então continuam certos se o trajeto mudar.
- **Montagem.** Cada peça registrada cresce do zero com um pequeno excesso e volta, na ordem em que foi criada.
- **Água.** O respingo é estilizado: uma coluna, 170 gotas em trajetória de projétil e anéis que se abrem, mais ondas na superfície que perdem força com o tempo. Não é simulação de fluido.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva cada imagem e junta tudo com o ffmpeg. No Mac em que foi feito, os 660 quadros levaram cerca de 50 segundos.

## A ordem em que foi feito

1. Perícia da referência: estrutura, design e movimento medido.
2. Cena e boneco construídos, com uma imagem parada de cada momento.
3. Duas passadas de correção nas imagens (luz e sombras, cobertor, camiseta, respingo).
4. Página de cards para aprovação: imagem, janela de tempo, o que se move primeiro e a emenda.
5. Só depois da aprovação: linha do tempo, quadros de teste de cada trecho, vídeo completo.
6. Teste de movimento contra a referência e revisão por folhas de quadros.

## Erros do caminho

- **Pés atravessando o cobertor.** O boneco deitado tem os pés apontados para cima; o cobertor precisou ficar mais alto.
- **Trajeto por dentro do guarda-corpo.** O caminho do banheiro para o patamar cruzava a grade; foi desviado para o trecho sem grade.
- **Bancada bloqueando a saída.** A bancada lateral da cozinha fechava a passagem para o deck. Foi para o fundo, entre a sala e a cozinha.
- **Anéis do respingo fora da piscina.** Com o tempo, os anéis passavam da borda; agora somem ao atingir um raio máximo.
- **Página de aprovação sem imagens.** A página apontava para arquivos separados e não carregava em visualizadores que mostram só o HTML. As imagens passaram a ir embutidas no arquivo.

## Resultado do teste de movimento

Comparado com o spot de quarto da referência (empty-nest):

| Medida | Este motion | Referência | Meta |
|---|---|---|---|
| Amplitude (pico ÷ mediana) | 12,8× | 5,9× | ≥ 4,1× |
| Tempo em quase-parada | 62% | 39% | ≥ 29% |
| Picos | 7 | 4 | ≥ 2 |

O teste mede ritmo, não a qualidade da animação do boneco.

## Limites conhecidos

- É uma maquete estilizada. Não chega ao acabamento da referência, que usa render fora de tempo real, personagens modelados e tecidos fotográficos.
- No plano médio da piscina o boneco fica pequeno e o salto é menos legível que as outras ações.
- O boneco não calça os chinelos; eles ficam no tapete.
- Não existe versão vertical.
- A crítica adversarial dos cards, prevista no método, não foi feita.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
```

- `cards` gera as dez imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/rotina-casa.mp4`.
- `node render.mjs at 6.5 13.9` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
