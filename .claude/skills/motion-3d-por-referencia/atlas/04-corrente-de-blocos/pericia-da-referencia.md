# Perícia da referência: Data Skyline (#19 do 3D Style Atlas, Futurepedia)

Fonte: https://www.futurepedia.io/resources/3d-style-atlas/view. Clipe de 8,5 s, 1280×720, 30 qps. Tema da referência: a população mundial por bilhão, de 1804 a 2022.

## Estrutura
- **Mecanismo:** a câmera passeia rente a uma maquete de arquiteto e cada torre do gráfico sobe na hora em que a câmera chega nela; no fim a câmera recua, mostra o gráfico inteiro e a conclusão aparece escrita.
- **Arco:** torre 1 pronta e título (0–1 s) → torre 2 cresce com a câmera quase parada (1–1,8 s) → o título some, a câmera desliza e as torres 3 e 4 crescem (2–4,3 s) → a câmera recua para a vista 3/4 (4,5–6,75 s) → anotações se desenham (6–6,75 s) → título final e quadro parado (6,75–8,5 s).
- **Emendas:** nenhum corte. É um plano-sequência.

## Por que a referência tem árvores e gente
População mora em cidade. Por isso o gráfico virou uma cidade em miniatura: torres são barras, um bloco é um bilhão, e árvores e pessoas estão ali para dar escala e dizer "isto é uma cidade". **O mundo é a metáfora do tema, não decoração.** Esta é a lição central, e a que a nossa primeira versão errou.

## O método (o que se leva)
1. O gráfico é um objeto físico dentro de um mundo que sai do tema.
2. A unidade é uma coisa que dá para contar.
3. Os rótulos também são físicos: o rótulo do item mora na base, o valor mora em cima e conta junto.
4. Um elenco de apoio do próprio mundo diz onde estamos.
5. Uma única cor de acento no dado que importa.
6. A câmera começa íntima, percorre a série enquanto cada valor se constrói e recua para o quadro inteiro.
7. A conclusão é escrita em 2D por cima, em 2 linhas, com o acento na segunda.
8. Entre itens vizinhos aparece a relação entre eles.
9. Acabamento de miniatura fotografada: uma luz principal, névoa, profundidade de campo.

## Movimento (medido com pericia-movimento.py)
| Medida | Referência | Meta do nosso |
|---|---|---|
| Amplitude (pico ÷ mediana) | 4,0× | ≥ 2,8× |
| Tempo em quase-parada | 33% | ≥ 25% |
| Picos | 4 | ≥ 2 |
| Cortes secos | 0 | 0 |

O perfil dela: parada (0–1 s), rajada (2–3,5 s), médio (4–6,5 s, o recuo), parada (7–8,5 s).

## O que NÃO copiamos
O tema (população), os textos, a maquete de arquiteto, o plinto claro, as árvores, as pessoinhas, o céu bege e o vermelhão. O vídeo da referência não está nesta pasta; só o link.
