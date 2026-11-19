# 06 — Rosto vivo com Rive

Para a Purpurina e a Peluqueria: olhos e boca animados (piscar, sorrir, olhos de coração, surpresa) por cima da arte pintada, controlados pelo jogo.

## Como funciona

- No editor do Rive (plano grátis para começar; confira os planos), desenha-se o rosto e uma **máquina de estados** com entradas, por exemplo: `feliz` (sim/não), `surpresa` (gatilho), `olhar` (número de -1 a 1).
- Exporta-se um arquivo `.riv`.
- No jogo, o tocador do Rive para web (aberto) desenha num `<canvas>` e o código liga as entradas aos eventos do jogo.
- A versão `@rive-app/canvas-single` junta tudo num arquivo só (uma requisição), bom para copiar para o repositório e funcionar offline.

## Alternativa mais simples

4 a 6 imagens pintadas de expressão (neutro, feliz, surpresa, olhos fechados) trocadas pelo código, com um fade de 100 ms.

Exemplo: `../../exemplos/rosto-rive.html` (módulo `rive` planejado).
