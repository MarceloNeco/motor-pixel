# 03 — Arte vetorial em camadas

O motor só acende, move e aproxima o que tem **nome**. Por isso a arte precisa chegar organizada.

## Regras para o arquivo SVG

- Um arquivo por vista (`frente`, `lado`, `costas`), todos com o **mesmo `viewBox`** e a mesma linha de chão.
- **Cada parte num elemento com `id`** (`<path id="peitoral">`, `<g id="encosto">`). Nomes em minúsculas, sem acento, com `_` (ex.: `quadriceps_esq`).
- Lista de nomes combinada antes de desenhar e guardada no app (o motor não impõe nomes).
- Peças que se mexem em grupos separados, com o **ponto de giro anotado** (ex.: encosto gira em 170,177).
- Partes a pintar pelo app sem cor forte (o app aplica as cores).
- Sem texto dentro do desenho (o texto vem do app, nos 3 idiomas).
- Arquivo limpo: sem camadas escondidas, sem imagens embutidas; menos de 100 KB por vista.

## Técnicas

| Quero | Função |
| --- | --- |
| Acender o que trabalha | `vetor.realcar` |
| Saber o que a pessoa tocou | `vetor.aoTocarParte` |
| Mostrar peça se ajustando | `vetor.moverPeca` |
| Movimento simples | `vetor.mostrarPose` (poses-chave) ou `moverPeca` na articulação |
| Movimento fluido | Rive (vetor com ossos) — módulo planejado; ver `exemplos/exercicio-rive.html` |
| Aproximar uma parte | `zoom.focar` |
| Clima "holograma" sem 3D | `vetor.neon` |

## De onde vem a arte

| Caminho | Quando |
| --- | --- |
| Ilustrador vetorial | Peças centrais que o app usa sempre |
| Biblioteca licenciada em SVG | Muitos itens parecidos, com rapidez |
| IA + vetorização | Só para rascunho; o vetor sai sujo e sem partes separadas |

Nunca copiar arte de referência; logotipos de marcas fora.

Exemplos: `exemplos/vetor-mapa-do-corpo.html` (usa o motor) e `exemplos/exercicio-svg.html` (técnica isolada).
