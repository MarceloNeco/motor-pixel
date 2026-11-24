Quero um motion graphic 3D no estilo "perseguição em plano único", feito inteiro em código com three.js, sem modelos 3D prontos e sem imagens: aviões, nuvens, céu, mar e pintura são todos gerados no próprio código.

## Meu tema

- **História em três atos:** [QUEM VOA, QUEM PERSEGUE E COMO VIRA O JOGO. Exemplo: "um avião pequeno de entregas é cercado por uma tempestade, escapa rente ao mar, sobe para o sol e sai por cima das nuvens".]
- **Título em pilha (4 linhas):** [QUATRO PALAVRAS OU BLOCOS CURTOS, alternando forte e leve: forte · leve · leve · forte. Exemplo: "DEIXA / O CÉU / TE / LEVAR".]
- **Frase curta que fica até o fim:** [ATÉ 3 PALAVRAS, em minúsculas. Exemplo: "voa leve."]
- **Legendas de manobra (3):** [O ATAQUE, A FUGA E A MANOBRA FINAL, no formato "NOME · MANOBRA". Exemplo: "EMBOSCADA · O FALCÃO ATACA", "GAIVOTA · RASANTE", "GAIVOTA · PARAFUSO".]
- **Pintura:** [AS CORES DO HERÓI E DO RIVAL. Exemplo: "herói marfim com cobalto, ouro e coral; rival grafite com coral". Nunca copie a pintura de uma aeronave, marca ou filme existente.]
- **Formato:** 16:9, 1920×1080, 30 quadros por segundo, 14 segundos, sem áudio.

Se existir uma pasta `codigo/` junto deste prompt, use-a como ponto de partida: ela tem a cena completa neste estilo (`src/main.js`), as fontes e o renderizador (`render.mjs`). Troque a pintura, os textos (`TITLE`, `SUB`, `CAPTIONS`) e, se a história pedir, a coreografia. Se não existir, construa do zero seguindo o que está abaixo.

## O mecanismo

A câmera não larga o herói: o mundo inteiro gira em volta dele, e cada manobra troca o mar, o sol e as nuvens de lugar no quadro. Não há nenhum corte nem fade de entrada. São 14 segundos de um único plano de perseguição.

## O visual

- **Céu:** gradiente em shader, violeta escuro no alto, rosa e laranja no horizonte, com o sol baixo (uns 4° acima do horizonte), um brilho largo em volta e cirros em faixas finas, projetados como num teto plano para convergirem no horizonte.
- **Mar:** um plano enorme com ondas de ruído, reflexo do céu (Fresnel), o caminho do sol em laranja, brilhos pontuais piscando e névoa que funde o mar com o horizonte.
- **Nuvens:** cúmulos feitos de dezenas de esferas cada um, com base achatada e mais bolhas pequenas no topo (couve-flor). Sombreado em dois tons com passagem curta: corpo violeta, face iluminada pêssego, topo creme. Por cima, uma borda dourada fina que acende quando a nuvem está entre a câmera e o sol. As nuvens distantes se fundem na cor do céu.
- **Aviões:** caças de asa elíptica, com fuselagem torneada, deriva arredondada, hélice como um disco translúcido com aro e pontas pintadas, escapamentos, radiador, para-brisa, piloto com capacete de couro e um cachecol que tremula. Material em faixas (toon, 3 tons), com sombra própria (a asa sombreia a fuselagem).
- **Pintura:** desenhada em canvas e mapeada na planta da asa, no torno da fuselagem e na deriva: pontas coloridas, cocares em três anéis, filete lateral, linhas de painel, fuligem atrás dos escapamentos e um granulado leve de tinta.
- **Rastros:** duas fitas claras saindo das pontas das asas, viradas para a câmera, que alargam e somem com a distância. Elas também somem quando passam perto da lente.
- **Traçantes:** traços dourados finos com a cabeça mais clara, em rajadas; os que caem no mar levantam respingos.
- **Acabamento de película:** bloom leve, raios saindo do sol, brilho anamórfico horizontal e duas ou três bolhas de lente quando o sol está à vista, aberração cromática nas bordas, vinheta violeta, granulado fraco (mais fraco nas sombras), algumas manchas de poeira e um risco ocasional.

## O texto

- Título em pilha, centralizado no terço de cima: serifada de alto contraste, versal. As linhas fortes em peso 800 e tamanho cerca de 116 px; as leves em peso 400, cerca de 62 px, bem espaçadas. Cada palavra entra separada (a cada 0,6–0,7 s), subindo 16 px e saindo de um desfoque de 8 px em 0,5 s. A última palavra entra com um soco de escala (1,08 → 1,0 em 0,45 s). A pilha sai inteira por volta dos 3,9 s, subindo e desfocando.
- Frase curta em itálico, no centro, por volta de 54 px, entrando aos 4,35 s e ficando até o fim.
- Legendas em sem serifa, versal, peso 500, cerca de 25 px, bem espaçadas, perto do pé do quadro: o ataque (0,4–2,4 s), a fuga (2,75–4,6 s) e a manobra final (a partir de 10,9 s). O meio do filme fica sem legenda.
- Todo texto com sombra escura suave para ler sobre o avião claro.

## A coreografia (14 s)

1. **O ataque (0–2,6 s):** câmera alta atrás do herói, olhando o mar quase de cima. O herói costura de um lado para o outro. O rival nunca aparece: só os traçantes dele, passando rente à ponta da asa.
2. **A fuga (2,6–4,3 s):** a segunda rajada erra e cai no mar à frente; respingos.
3. **A subida (4,3–6,5 s):** o herói puxa o nariz e a câmera desce devagar até o horizonte; o sol aparece no alto à esquerda, entre torres de nuvem.
4. **O tonneau (6,5–8,6 s):** uma volta inteira em 2 s, em hélice; a câmera balança junto e volta. É o momento de maior energia.
5. **A virada (7,8–9,6 s):** o rival passa por cima da câmera, cruza na frente do nariz e mergulha; o herói responde com uma rajada.
6. **O parafuso (9,6–14 s):** a rolagem continua girando devagar e a câmera acompanha 80% dela: o horizonte fica quase vertical, mar de um lado e céu do outro, o sol passa por trás do avião (contraluz). Nos últimos 0,45 s a imagem escurece.

## A câmera e o ritmo

- A câmera mora no referencial do herói (direção e inclinação de voo, sem a rolagem) e tem curvas próprias de distância, altura, ângulo lateral e posição do avião na tela. A rolagem da câmera é uma fração da rolagem do avião, que muda ao longo do filme (15% no começo, 80% no parafuso).
- O avião não fica no centro: ele fica na metade de baixo, um pouco à direita, e o texto fica acima dele.
- O ritmo é uma respiração, não pausa e estalo: começo calmo, energia subindo a partir dos 4,5 s, pico entre 5 e 9 s, descida no fim. Medido como diferença média entre quadros, a energia dos 4 primeiros segundos fica em no máximo 70% da do meio.

## Armadilhas que já custaram retrabalho

- **Tela preta inteira.** Um `pow()` com base levemente negativa (coordenada de textura interpolada) vira NaN, e o bloom espalha o NaN pela tela toda. Sempre `clamp` a base de `pow` em shaders próprios e proteja a saída do último passe contra NaN.
- **O rival tapando a lente.** Ao cruzar de trás para a frente, o rival passa exatamente onde a câmera está. Desenhe a rota dele passando por cima e para o lado da câmera e confira a distância quadro a quadro.
- **O sol no lugar errado.** Defina a direção do sol a partir do enquadramento da subida (por exemplo, 25° à esquerda da direção da câmera naquele instante) e confira onde ele cai na tela em todos os outros momentos.
- **Nuvem dentro da câmera ou tapando o sol.** Monte as nuvens em volta da rota e descarte qualquer bolha a menos de 25–70 m do caminho da câmera e do avião, e qualquer bolha que cruze o raio da câmera até o sol durante a subida.
- **Começo agitado demais.** Se o vaivém do avião também virar a rota, a câmera presa a ela varre o quadro inteiro a cada vaivém, e o mar texturizado rolando rápido sob a câmera faz o resto. No rasante: o avião inclina, mas a rota quase não vira; voo mais lento e mais alto; mar mais liso.
- **Rastro virando uma faixa branca.** Quando a câmera passa por dentro do rastro, ele cobre metade da tela. Apague o rastro perto da lente.
- **Respingos fora do quadro.** A bala leva mais de um segundo até o mar; mire com antecipação, senão o respingo cai atrás da câmera.
- **Sol estourado.** Bloom, raios e brilho de lente somados lavam o contraluz. Limiar do bloom acima de 1,0 e brilho de lente moderado.

## Como construir

1. **Motor.** Projeto Node com `three` e `puppeteer-core`. Uma página monta a cena e expõe `window.renderAt(t)`. Tudo é função pura de `t`: o trajeto é integrado uma vez no início numa tabela (a cada 1/120 s) e lido por interpolação; os rastros leem o trajeto em instantes passados; os traçantes são retas no tempo; a poeira de película usa um gerador aleatório com a semente do número do quadro.
2. **Coreografia por curvas.** Curvas por chaves (cúbica monotônica) para inclinação, subida, velocidade, rolagem extra do tonneau, posição relativa do rival e cada parâmetro da câmera.
3. **Texto.** Desenhado num canvas 2D por cima do quadro do three.js, com as fontes carregadas (FontFace) antes do primeiro quadro.
4. **Render.** Chrome sem janela chama `renderAt` quadro a quadro, salva as imagens e o ffmpeg junta o MP4.

## A ordem do trabalho

Não anime antes de eu aprovar as imagens paradas.

1. Construa a cena e renderize uma imagem parada de cada ato no momento mais claro, já com o texto.
2. Olhe cada imagem você mesmo e corrija o que estiver errado (tela preta, nuvem na lente, sol fora do lugar, texto em cima do avião) antes de me mostrar.
3. Me entregue as imagens numa página só, com as imagens embutidas no próprio arquivo, e para cada uma: a janela de tempo, o que se move primeiro e como emenda na próxima. Espere minha aprovação.
4. Depois de aprovado, renderize o vídeo, revise em folhas de quadros (4 por segundo) e meça o arco de energia. Se o começo estiver tão agitado quanto o meio, acalme o começo.
5. Na entrega, diga o que mudou em relação às imagens aprovadas e o que você não conseguiu verificar.

## O que não fazer

- Não use modelos 3D, imagens ou texturas de arquivo.
- Não copie personagens, aeronaves, pinturas ou cenas de nenhum filme, jogo ou marca; o tema, as cores e os textos são os meus.
- Não corte o plano e não use crossfade: é um plano único.
- Nenhum texto em tela além dos que eu listei.
- Não prometa animação desenhada à mão: o resultado é um 3D estilizado em código.
