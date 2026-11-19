# 01 — Como a arte deve chegar

Peça ao ilustrador (ou exija da biblioteca licenciada) exatamente isto.

## Corpo

- Arquivos SVG: `corpo-masc-lado.svg`, `corpo-masc-frente.svg`, `corpo-masc-costas.svg` (e os femininos).
- Mesmo tamanho de tela em todos (ex.: `viewBox="0 0 400 600"`), pés na mesma linha.
- Cada parte num grupo `<g id="...">`; **cada músculo num `<path id="...">`** com estes nomes:

`peitoral` · `deltoide_anterior` · `deltoide_lateral` · `deltoide_posterior` · `biceps` · `triceps` · `antebraco` · `trapezio` · `dorsal` · `romboides` · `lombar` · `abdomen` · `obliquos` · `gluteo` · `quadriceps` · `posteriores_coxa` · `adutores` · `abdutores` · `panturrilha`

- Músculos sem preenchimento forte (cinza claro), para o app pintar de vermelho.
- Para o Rive: o corpo separado em partes articuladas (braço, antebraço, mão, coxa, perna, pé, tronco, cabeça).

## Aparelhos

- Um SVG por aparelho e por vista (`banco-ajustavel-lado.svg`).
- Peças móveis em grupos com nome e ponto de giro anotado:

`encosto` (gira no eixo do assento) · `assento` · `pino` · `placa_01` … `placa_20` · `cabo` · `polia_alta` · `polia_baixa` · `puxador` · `rolo_perna` · `apoio_pe`

- Desenho genérico, **sem logotipos** de fabricantes.

## Exercício (dados)

O app já tem nome, grupo e "também trabalha". Acrescentar:

```json
{
  "id": "supino-reto",
  "principal": ["peitoral"],
  "secundarios": ["triceps", "deltoide_anterior"],
  "aparelho": "banco-ajustavel",
  "ajuste": { "encosto": 0 },
  "poses": { "lado": ["inicio", "meio", "fim"], "frente": ["inicio", "fim"] },
  "zoom": { "pegada": [180, 210, 80, 60] }
}
```
