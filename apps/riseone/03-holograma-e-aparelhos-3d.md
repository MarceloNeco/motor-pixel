# 12 — RiseONE: corpo em holograma e aparelhos funcionando

## 3D ou vetorial

- **Vetorial (SVG):** zoom nítido, mas um ângulo só. Use para ícones de músculo brilhando, mapas e gráficos.
- **3D (Three.js):** zoom, girar, ver o movimento e o aparelho funcionando. Use para o corpo e os aparelhos.

## Corpo em holograma

Receita (módulo `holograma` do motor):

1. Um modelo de corpo com esqueleto (.glb), o mesmo para todos os exercícios.
2. Material de holograma: cor (azul `#2F7BFF` ou verde `#2CFF7A`), **borda brilhante pelo efeito Fresnel** (mais luz onde a superfície fica de lado para a câmera), leve transparência e mistura aditiva.
3. Brilho extra (bloom) no pós-processamento.
4. Chão preto que reflete (plano escuro e brilhante ou reflexo).
5. Músculo trabalhado aceso: o mesmo material com cor branca ou laranja, só nas partes do músculo (malhas separadas no modelo, ou máscara de pintura).
6. Ícone vetorial do músculo, brilhando ao lado (SVG com filtro de brilho).

## Aparelhos

- Cada aparelho é um .glb com **peças nomeadas**: `encosto`, `assento`, `pino`, `placa_01`…`placa_20`, `cabo`, `polia_alta`, `puxador`, `rolo_perna`.
- O código mexe nas peças: girar o encosto para o ângulo escolhido, subir as placas acima do pino, mover o puxador; o cabo é refeito a cada quadro entre as polias.
- **Sequência de cada exercício:** aparelho sozinho girando → ajuste (2 a 3 s) → corpo se posiciona e pega → repetições com o aparelho respondendo → livre (girar, zoom, pausar, vistas).
- Desenho genérico, **sem logotipos** de fabricantes.

## Começar por

Estação com polia alta + puxada alta. Depois o banco ajustável (supinos) e os halteres.

## Cuidados

- Técnica dos exercícios revisada por profissional de educação física.
- Licença comercial dos modelos e animações comprados ou gerados.
- Modo leve: sem bloom e sem reflexo em aparelho fraco.
