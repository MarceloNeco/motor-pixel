# 02 — Técnicas

## Acender e pulsar músculos

- Pintar por `id`: principal com classe `ativo` (vermelho `#FF3B3B`), secundários com `apoio` (`#FF8A8A`).
- Pulsar com CSS (`@keyframes` na opacidade ou num brilho), 1,2 s, desligado com `prefers-reduced-motion`.
- Brilho opcional: filtro SVG `feGaussianBlur` + `feMerge` só nos músculos ativos.

## Poses-chave (SVG puro)

- Cada pose é um SVG com as mesmas peças e os mesmos ids.
- Para trocar de pose com suavidade: sobrepor as duas e cruzar a opacidade (200 a 300 ms), ou animar as partes rígidas (braço, antebraço) com `transform: rotate()` em volta da articulação.
- Ritmo: descer em 2 s, subir em 1 s (o exercício mostra a cadência certa).

## Zoom

- Mudar o `viewBox` do SVG (é o "zoom vetorial": sempre nítido).
- Pinça: distância entre dois dedos define a escala; arrastar move o centro; limites de 1× a 6×.
- "Zoom no músculo": pegar a caixa do músculo (`getBBox()`) e animar o `viewBox` até ela.

## Aparelhos com peças

- `encosto`: `transform="rotate(ângulo, xEixo, yEixo)"`, em degraus (0°, 15°, 30°, 45°), com o grau escrito.
- `placas`: as placas acima do pino sobem juntas com o movimento; as de baixo ficam.
- `cabo`: uma linha recalculada a cada quadro entre a polia e o puxador.

## Modo neon (clima das referências azul/verde)

Fundo preto; contorno do corpo em azul `#2F7BFF` ou verde `#2CFF7A` com filtro de brilho; reflexo simples (o desenho espelhado embaixo, com opacidade 0,15 e degradê).

## Rive (movimento fluido com ossos)

- No editor do Rive: importar o corpo vetorial, criar os ossos, fazer uma animação por exercício e uma máquina de estados com entradas `exercicio` (número), `pausado` (sim/não), `velocidade` (número).
- Os músculos acesos ficam no app (SVG por cima) ou no Rive (cores controladas por entradas).
- Usar o tocador de arquivo único (`@rive-app/canvas-single`) copiado para o repositório, para funcionar offline.
