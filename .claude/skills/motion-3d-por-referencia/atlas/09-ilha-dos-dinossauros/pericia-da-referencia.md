# Perícia da referência: Pack of 6 Googly Dinosaurs on Alpha Loop (Supergiant, Motion Array)

Fonte: https://motionarray.com/stock-motion-graphics/pack-of-6-googly-dinosaurs-on-alpha-loop-2486136/. Prévia de 15 s. O pack é de 6 clipes em ProRes 4444, 4K, 24 fps, com fundo transparente e em laço.

## Estrutura
- **Mecanismo:** bichos de aparência séria e realista, cada um repetindo o seu laço parado no lugar, com um olho de adesivo colado na cabeça que desmonta a seriedade.
- **A prévia:** de 0 a 4,9 s, o T-rex em close rugindo ao lado do título; de 4,9 a 15 s, uma grade com cinco bichos de corpo inteiro, cada um no seu laço, com a câmera parada.
- **Os 6 clipes:** cinco espécies de corpo inteiro (T-rex, um terópode verde de cristas que tratamos como alossauro, paquicefalossauro, estegossauro e parassaurolofo) e o T-rex de novo, em close. São 5 espécies, não 6.
- **Emendas:** um corte seco entre a abertura e a grade. Nenhum movimento de câmera dentro dos clipes.

## Design
- Modelos 3D realistas: pele com escamas, listras e manchas, barriga mais clara que o dorso, dentes e garras. Sem cenário (fundo transparente), só uma sombra de contato suave.
- Vista de três quartos com a câmera baixa (10 a 15 graus), cada bicho ocupando o quadro inteiro do seu clipe.
- **O olho:** disco branco com aro escuro e pupila preta solta, grande (cerca de um terço da altura da cabeça), colado na lateral da cabeça, um de cada lado. É o único elemento de desenho animado da peça.

| Bicho | Cor | Traço que identifica |
|---|---|---|
| T-rex | carvão acastanhado, barriga bege | cabeça enorme, bracinhos, boca aberta com dentes |
| Alossauro | verde-oliva, barriga bege | espinhos na nuca e nas costas, cristas sobre os olhos, braços longos |
| Paquicefalossauro | azul-ardósia, pernas marrons | cúpula clara no alto da cabeça com espinhos atrás, postura ereta |
| Estegossauro | oliva acastanhado | duas fileiras de placas marrom-avermelhadas de borda clara, espinhos na cauda |
| Parassaurolofo | azul-ardósia com listras escuras | crista longa e curva para trás, bico de pato, quatro apoios |

## Movimento (lido em quadros a cada 0,25 s e 1 s)
| Bicho | O que faz | Ciclo aproximado |
|---|---|---|
| T-rex | anda no lugar agachado, levanta a cabeça e ruge de boca escancarada; a cauda chicoteia | rugido a cada 4 s (aberto em 6,5–7,5 s e 10,5–11,75 s) |
| Alossauro | quase parado em pé; a cauda varre e o corpo desloca de leve | 3 a 4 s |
| Paquicefalossauro | vira o corpo de um lado ao outro, a cauda varre largo, passinhos | 3 s |
| Estegossauro | anda no lugar devagar; a cauda sobe e desce | 2 s por passo |
| Parassaurolofo | quase parado; cabeça e pescoço balançam pouco | lento, sem ciclo marcado |

As pupilas mudam de posição de quadro para quadro em todos os bichos, mais quando a cabeça se mexe.

**Limite desta perícia:** o movimento não foi medido com `pericia-movimento.py`. O player da página não deixa ler os pixels do vídeo e o arquivo não foi baixado, então os números acima vêm da leitura de quadros e não há JSON de movimento. Por isso o teste de aceite contra a referência não foi rodado.

## Metas do nosso filme
- Cada bicho num laço de 4 s, parado no lugar, com um gesto forte por laço (rugido, cabeçada, berro, raspada de pata) e o resto do tempo quase parado.
- Câmera parada em cada plano; toda troca é corte seco.
- Pupilas soltas: pendem para baixo em repouso e chacoalham no gesto forte.

## O que NÃO copiamos
Os modelos e as texturas do pack são de terceiros: os nossos são construídos em código, do zero. Também ficam de fora o título, a tipografia e o fundo rosa e laranja da prévia. O que é nosso: a ilha, os seis setores, a câmera de maquete e o sexto bicho (o tricerátopo, que não existe no pack).

## Medida do nosso filme
Medido com `pericia-movimento.py` no vídeo final: 7 cortes secos, amplitude de 13,6× (pico ÷ mediana), 65% do tempo em quase-parada, 6 picos. Os picos são os cortes entre planos; dentro de cada plano o movimento é contido, como na referência. Não há comparação numérica com a referência porque ela não foi medida.
