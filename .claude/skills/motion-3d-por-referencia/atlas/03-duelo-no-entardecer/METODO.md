# Duelo no entardecer: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 14 segundos, 1920×1080, 30 quadros por segundo, sem áudio, num único plano, sem cortes. Dois caças duelam ao pôr do sol sobre o mar. A Gaivota (marfim, cobalto, ouro e coral) é atacada por trás pelo Falcão (grafite e coral), escapa rente ao mar, sobe para o sol, dá um tonneau, deixa o Falcão passar direto, responde e mergulha em parafuso contra o sol. Na tela aparecem "DEIXA O CÉU TE LEVAR", "voa leve." e três legendas de manobra.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: aviões, nuvens, céu e mar são gerados no código, e a pintura é desenhada num canvas. As únicas peças de fora são as fontes: Playfair Display e Inter, as duas com licença aberta (OFL).

## De onde veio o método

A referência foi o "Porco Rosso sunset dogfight", publicado por @NFT_Chen no Prompt Motion e feito com Opus 5.5 e Three.js numa tentativa só ([link](https://prompt-motion.com/nft-chen-5f8bb0)). Dela veio só o método. O filme que ela homenageia, os personagens, a pintura verde, branca e vermelha e os textos ficaram de fora. A perícia completa está em `pericia-da-referencia.md`.

O que a perícia mostrou:

- **Mecanismo:** a câmera não larga o avião, e o mundo inteiro gira em volta dele.
- **Montagem:** um plano único de 13,96 s, sem nenhum corte.
- **Ritmo:** um travelling que respira, não pausa e estalo. A amplitude é de 1,7×, sem nenhum trecho em quase-parada. O começo é calmo e o pico vem aos 7 s.
- **Texto em três camadas:** título em pilha, depois uma frase curta que fica até o fim, e legendas de manobra embaixo.

O vídeo da referência foi estudado no navegador, quadro a quadro, sem ser baixado.

## O mecanismo do nosso filme

A câmera não larga a Gaivota: o mundo inteiro gira em volta dela, e cada manobra troca o mar, o sol e as nuvens de lugar no quadro, até ela virar o jogo e mergulhar em parafuso contra o sol.

## A cena, em números

As medidas estão em metros.

- **Avião:** envergadura de 11,2 com asa elíptica (corda de 2,3 na raiz) e 7% de diedro. A fuselagem tem 9,4 de comprimento. Os dois aviões saem do mesmo construtor, com pinturas diferentes.
- **Voo:** começa a 105 de altura. A velocidade vai de 40 m/s no rasante a 84 m/s no parafuso. A rolagem chega a 112° no fim.
- **Câmera:** perspectiva com 42° de campo vertical. Fica a 22 de distância no rasante e a 16,5 no fim. O ângulo de cima vai de 57° (olhando o mar) a −9° (por baixo do avião, no parafuso). Ela acompanha 15% da rolagem do avião no começo e 80% no parafuso.
- **Sol:** 4,2° acima do horizonte. A direção é definida 25° à esquerda da câmera aos 5,6 s, para aparecer no alto à esquerda durante a subida. A luz que ilumina os aviões e as nuvens vem do mesmo lado, mas a 28° de altura.
- **Nuvens:** 5.508 bolhas no total. São 3.531 em cúmulos próximos, montados em volta da rota em três camadas (baixos no rasante, torres na subida e no tonneau, um campo abaixo da curva final), e 1.977 em torres distantes no horizonte.
- **Mar:** um plano de 60 km que acompanha a câmera, com ondas, reflexo e névoa calculados em shader.

## Decisões que definiram o resultado

- **Uma força aérea própria.** A pintura é marfim com cobalto, ouro e coral, as cores da identidade AiVerso, com cocar em três anéis e leme listrado nas mesmas cores. A pintura da referência não entrou.
- **Uma história com virada.** Na referência o avião só voa. Aqui o rival ataca, erra, passa direto e leva o troco. Isso dá a cada trecho uma razão de existir.
- **O rival nunca aparece no ataque.** No rasante, só os traçantes dele entram no quadro. Ele só se mostra na virada, quando cruza na frente do nariz.
- **O sol nasce da subida.** A direção do sol foi calculada a partir do enquadramento da subida e depois conferida em todos os outros instantes. No parafuso, ele acaba passando por trás do avião, em contraluz, sem nenhum ajuste a mais.
- **O parafuso gira o horizonte, não o rumo.** No fim a rolagem continua subindo devagar, mas o avião quase não muda de direção, e a câmera acompanha 80% da rolagem. É isso que deixa o horizonte quase vertical e girando, como na referência.
- **Mar liso no rasante.** O relevo das ondas vai de 45% a 100% entre 3,6 e 5,6 s. Com o mar texturizado o tempo todo, o rasante ficava mais agitado que o tonneau.
- **Sem fade de entrada.** A referência começa direto. O fade somava energia justo no trecho que precisa ser calmo.
- **Nuvens em dois tons com passagem curta.** O corpo é violeta e a face iluminada é pêssego, com uma sombra extra nas reentrâncias entre bolhas. Uma borda dourada acende no contraluz, e as nuvens distantes se fundem na cor do céu.

## Como a animação funciona

- **Tudo é função do tempo.** `renderAt(t)` recalcula a cena inteira. O trajeto do herói é integrado uma vez, na abertura, a cada 1/120 s (de −3 s a 15,5 s), e depois lido por interpolação. Por isso qualquer quadro pode ser renderizado sozinho.
- **Coreografia por curvas.** Curvas por chaves (cúbica monotônica, que não passa do alvo entre chaves) controlam inclinação, subida, velocidade, o tonneau, a posição do rival em relação ao herói e cada parâmetro da câmera.
- **Câmera.** Fica no referencial de voo do herói (direção e subida, sem rolagem), em coordenadas de distância, altura e ângulo lateral. Uma segunda passada reenquadra o avião numa posição fixa da tela, na metade de baixo e um pouco à direita.
- **Rastros.** A cada quadro, 110 posições das pontas das asas são lidas no passado (1,98 s de rastro) e viram fitas viradas para a câmera.
- **Traçantes.** Cada bala é uma reta no tempo: saída, velocidade e o instante em que toca o mar. Os respingos nascem nesse instante.
- **Texto.** É desenhado num canvas 2D por cima do quadro do three.js. As fontes são carregadas antes do primeiro quadro.
- **Película.** Poeira e risco vêm de um gerador aleatório com a semente do número do quadro. O granulado é calculado no shader, também a partir do número do quadro.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva cada imagem e junta tudo com o ffmpeg. No Mac em que foi feito (Apple M5), os 420 quadros levaram cerca de 66 segundos. O vídeo deste acervo foi recomprimido em CRF 19 (23 MB, SSIM de 0,985 contra o render original de 49 MB); o granulado de película é o que mais pesa no arquivo.

## A ordem em que foi feito

1. Perícia da referência: estrutura, design e movimento medido.
2. Cena construída, com uma imagem parada de cada ato.
3. Correções nas imagens: tela preta, rival na lente, sol fora do quadro, nuvens facetadas, mar listrado, título em cima do avião, traçantes invisíveis e depois grossos demais, respingos fora do quadro.
4. Página de cards para aprovação, com as imagens embutidas.
5. Depois da aprovação: vídeo, folhas de quadros a 4 por segundo e teste de movimento. Foram seis renders até passar.

## Erros do caminho

- **Tela preta.** O shader dos traçantes fazia `pow()` de uma coordenada interpolada que às vezes ficava levemente negativa. O resultado era NaN, e o bloom espalhava o NaN pela tela. A base agora passa por `clamp`, e o último passe zera qualquer NaN.
- **O rival tapando a lente.** Na primeira rota, o Falcão cruzava exatamente onde a câmera estava. Agora ele passa por cima e à esquerda, a mais de 18 m.
- **Sol atrás da câmera.** Definido a partir do parafuso, o sol ficava atrás da câmera durante a subida. Passou a ser definido pela subida.
- **Nuvens facetadas.** O deslocamento de ruído nos vértices criava vincos. Ele foi reduzido, e o volume passou a vir de mais bolhas, menores.
- **Desfiladeiro fechado.** As torres próximas tapavam o céu e o sol. Elas foram afastadas, e nenhuma bolha pode cruzar o raio da câmera até o sol durante a subida.
- **Rastro virando faixa branca.** Quando a câmera passava por dentro do rastro, ele cobria metade da tela. O rastro agora some perto da lente.
- **Respingos atrás da câmera.** A bala leva mais de um segundo até o mar. A mira passou a ter antecipação, e a rajada foi adiantada.
- **Título em cima do avião.** A pilha subiu e o avião desceu na tela no rasante; a cauda sai pelo pé do quadro, como na referência.
- **Começo agitado.** Ver o teste abaixo.

## Resultado do teste de movimento

| Medida | Este motion | Referência | Meta |
|---|---|---|---|
| Cortes secos | 0 | 0 | 0 |
| Amplitude (pico ÷ mediana) | 1,99× | 1,67× | entre 1,2× e 2,6× |
| Energia de 0 a 4 s ÷ de 5 a 9 s | 0,64 | ~0,5 | no máximo 0,7 |
| Pico | 5,0 s (tonneau aos 7,5 s logo atrás) | 7,0 s | entre 5 e 10 s |
| Último segundo | abaixo da mediana | abaixo da mediana | abaixo da mediana |

A primeira versão reprovou com razão de 1,17: o rasante era o trecho mais agitado do filme. O que resolveu:

- o vaivém deixou de virar a rota;
- o rasante ficou mais lento e mais alto, com o mar mais liso;
- o fade de entrada saiu;
- a descida da câmera ficou mais longa;
- o tonneau começa mais cedo e dura mais.

O granulado foi testado como suspeito e não era a causa. A referência foi medida no navegador, e o nosso filme com o `pericia-movimento.py`; a lógica é a mesma, mas os valores absolutos dos dois métodos não são idênticos. O que se compara é a forma do arco. O teste mede ritmo, não qualidade de imagem.

## Limites conhecidos

- É um 3D estilizado em código. Não é animação desenhada à mão, e as nuvens de perto ainda mostram que são bolhas.
- O pico de energia empatou entre a descida da câmera (5,0 s) e o tonneau (7,5 s). Na referência o pico é a manobra.
- Entre 9,6 e 10,4 s, uma parede de nuvem passa perto, à esquerda, e ocupa boa parte do quadro.
- No parafuso, a legenda encosta na ponta da asa.
- Os respingos aparecem pouco, entre 3,8 e 4,3 s, e quase escondidos atrás do título que está saindo.
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

- `cards` gera as seis imagens paradas em `codigo/cards/`.
- `video` gera `codigo/out/duelo-no-entardecer.mp4`.
- `node render.mjs at 5.7 12.4` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
- Os textos ficam em `TITLE`, `SUB` e `CAPTIONS`, na seção de texto de `src/main.js`, e a lista completa está em `copy.txt`. A pintura fica em `HERO_L` e `FOE_L`.
