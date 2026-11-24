# Perícia da referência: estrutura

**Fonte:** [Pack Of 6 Nature Reclaimed Objects On Alpha](https://motionarray.com/stock-motion-graphics/pack-of-6-nature-reclaimed-objects-on-alpha-4237257/), Motion Array, autor "Gucci Gang".
O produto são 6 clipes de 1080×1080, 25 quadros por segundo, ProRes 4444 com canal alfa (objeto solto, sem fundo).
O que dá para ver na página é a prévia: 14 s, 16:9, com os objetos sobre um fundo em degradê.

O vídeo da referência não está nesta pasta. A análise foi feita olhando a prévia no navegador, quadro a quadro.

## O mecanismo, em uma frase

**Um objeto de uso humano flutua no vazio, gira devagar, e a natureza toma conta dele: o musgo avança em manchas e as flores abrem por cima, sem ninguém tocar.**

É isso que o espectador contaria. O objeto continua reconhecível (as partes que o identificam ficam à mostra) e a graça está no contraste entre o industrial limpo e o orgânico bagunçado.

## A prévia (o que está na página)

| Janela | O que aparece |
|---|---|
| 0,0 – 1,5 s | cartela: grade de 5 quadros arredondados com os objetos, título em verde-limão |
| 1,5 – 3,5 s | skate, fundo marrom quente |
| 3,5 – 4,5 s | tênis, fundo verde |
| 4,5 – 6,7 s | bloco de concreto, fundo cinza quase preto |
| 6,7 – 8,3 s | bola de futebol, fundo cinza-esverdeado |
| 8,3 – 10,5 s | crânio de animal, fundo cinza |
| 10,5 – 12,3 s | controle de videogame, fundo marrom quente |
| 12,3 – 14,0 s | cartela de novo |

A cartela é a embalagem do produto na loja, não faz parte do motion. O motion é o clipe de cada objeto.

## O arco de um clipe

1. O objeto já está em cena, flutuando, girando devagar. Não há entrada.
2. Manchas de musgo e de flor partem de alguns pontos e avançam pela superfície, cada uma no seu tempo.
3. As flores nascem pequenas e abrem; as manchas de flor passam por cima do musgo.
4. No fim, o objeto está tomado, mas não coberto: sobra plástico à mostra e os comandos continuam visíveis.

## Emendas

Na prévia, corte seco entre um objeto e outro. Dentro de um clipe não há corte, nem movimento de câmera.

## O que é método e o que é conteúdo

| Método (levamos) | Conteúdo (não levamos) |
|---|---|
| objeto solto, flutuando, girando devagar | os modelos 3D da referência |
| crescimento em manchas que partem de sementes | o desenho exato das manchas |
| duas camadas: musgo embaixo, flores por cima | as espécies e os arranjos dela |
| partes de identidade do objeto ficam à mostra | a cartela, o título e a tipografia |
| fundo em degradê radial na cor que conversa com o objeto | o controle de marca (o nosso é genérico, desenho próprio) |
| entrega com canal alfa | |

---

# design

Observado no clipe do controle (10,5 a 12,3 s da prévia) e conferido nos outros objetos.

## O objeto

- Plástico claro (cinza quase branco), com brilho de produto: um risco de luz e sombra própria bem marcada do lado oposto à luz.
- Peças de comando escuras (alavancas, direcional) ficam **descobertas**. É o que mantém o objeto legível.
- Ocupa cerca de 45% da largura do quadro, centralizado, levemente inclinado.

## A vegetação

| Camada | Como é | Proporção (largura do controle = 100) |
|---|---|---|
| Musgo | tapete denso, verde escuro com pontas mais claras, com espessura visível na borda da mancha | altura de 2 a 3 |
| Flores | miúdas, muitas, em montes; alturas diferentes, então a mancha tem relevo e sombra entre as flores | diâmetro de 2 a 3; a camada passa uns 5 da silhueta |
| Desgarradas | flores isoladas fora da mancha, já no plástico | poucas |

- **Cobertura:** flores na metade de cima e em volta dos comandos; musgo na faixa de baixo e num dos punhos. Entre 35% e 45% do objeto continua limpo.
- **Borda das manchas:** irregular, nunca um contorno liso.
- **Cor das flores (controle):** rosa-choque, magenta, coral, laranja, amarelo, pêssego, um pouco de branco. Em zonas, mas misturadas.
- Nos objetos de fundo frio (bola, bloco) a paleta vai para roxo, lilás e azul.

## Luz

- Uma luz principal grande e macia, do alto e da esquerda.
- O lado direito do objeto cai no escuro e se funde com o fundo.
- Sombra das flores sobre o plástico e do musgo sobre ele mesmo. Sem sombra no chão (não há chão).

## Fundo

Degradê radial: claro (creme) embaixo à esquerda, a cor do tema no meio, quase preto à direita e em cima. Cada objeto tem a sua cor: marrom quente (skate, controle), verde (tênis), cinza (bloco, crânio), cinza-esverdeado (bola).

## O que o nosso não copia

- O controle da referência é um modelo de marca. O nosso é um controle genérico de desenho próprio, esculpido por código.
- A cartela de abertura (grade de quadros, título verde-limão) fica de fora.
- As manchas, as flores e as cores são geradas pelo nosso sistema, com semente própria; não há nenhum quadro, textura ou modelo da referência no projeto.

---

# movimento

## Como foi medido (e o limite disso)

A prévia foi analisada no navegador, parando em instantes escolhidos (de 0,25 em 0,25 s nos trechos do controle e da bola) e comparando os quadros.
O script `pericia-movimento.py` não foi rodado, porque ele precisa do arquivo do vídeo e o arquivo não foi baixado.
Por isso os números abaixo são estimativas de olho sobre quadros parados, não medidas de pixel.

## O que o movimento é

| Aspecto | Na referência |
|---|---|
| Câmera | parada. Nenhum travelling, zoom ou corte dentro do clipe |
| Objeto | giro contínuo e lento em torno de um eixo quase vertical, cerca de 15 a 25 graus por segundo |
| Flutuação | leve, quase imperceptível |
| Crescimento | contínuo: a mancha nunca "pula"; as flores surgem pequenas e abrem |
| Ritmo | sem pausas e sem socos. É um movimento de respiração, não de batida |
| Emendas | corte seco entre objetos, a cada 2 s na prévia |

Em 0,6 s do clipe da bola, um gomo anda uns 12 graus e a área de flores cresce a olhos vistos: na prévia o crescimento está no meio do caminho, rápido o bastante para se notar em menos de 1 s.

## Metas para o nosso

| Medida | Meta |
|---|---|
| Giro | constante, entre 7 e 12 graus por segundo (clipe de 8 s, mais longo que o trecho da prévia) |
| Câmera | parada |
| Crescimento | sempre visível entre dois quadros separados por 0,5 s, do segundo 0,5 ao 6,5 |
| Frente da mancha | rápida no começo e mais lenta no fim (arranca e depois rasteja) |
| Flor | haste sobe, botão cresce com um leve excesso e a pétala abre, nessa ordem, em cerca de 1,5 s |
| Final | de 1 a 1,5 s com tudo aberto, ainda girando |
| Cortes | nenhum dentro do clipe |

## Sobre o teste de aceite

O teste da skill compara amplitude, pausas e picos contra a referência. Aqui a assinatura da referência é plana de propósito (movimento contínuo, sem pausas), então "ter picos" não é meta.
O critério que vale é o inverso: **não pode haver salto** (nenhuma mancha aparecendo de um quadro para o outro) nem trecho parado no meio do crescimento.

## Resultado do nosso vídeo (medido com pericia-movimento.py)

Arquivo: `out/natureza-retoma-controle.mp4`, 8 s, 240 quadros. Medida em `movimento-nosso.json`.

| Medida | Nosso vídeo | Leitura |
|---|---|---|
| Amplitude (pico ÷ mediana) | 1,8× | perfil quase plano, como o da referência |
| Tempo em quase-parada | 0% | nenhum trecho parado: o giro e o crescimento nunca param |
| Trecho mais cheio | 3,0 a 3,5 s | é quando a maior parte das flores abre |
| Trecho mais calmo | 4,5 s e 7,0 s | ainda com movimento (0,21 contra mediana de 0,32) |
| Cortes | 0 | um plano só |

Não houve comparação automática contra a referência, porque o arquivo dela não foi baixado.
A cintilação das flores miúdas em movimento não foi conferida por medida; só assistindo ao vídeo.
