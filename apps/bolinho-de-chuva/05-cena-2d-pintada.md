# 05 — Cena 2D com arte pintada (PixiJS)

Para Purpurina 2.0, Peluqueria, AQUA, GLUB GLUB, Mão na Massa. É o que deixa jogos como Nails DIY e Glam Girl com cara profissional: **imagem pintada**, não vetor desenhado em código.

## Estrutura de uma sala

1. **Cenário** em 2 planos: fundo pintado (desfocado) e frente com 2 ou 3 objetos do tema perto da câmera.
2. **Personagem** em camadas de imagem na mesma pose e no mesmo tamanho de tela: cabelo de trás, corpo, rosto, roupa, cabelo da frente, acessórios.
3. **Recolorir:** cada peça vem em tons de cinza; a cor escolhida entra pelo `tint` do sprite (multiplica a cor). 13 vestidos × 20 cores = 260 opções.
4. **Partículas:** brilhos dourados ao vestir uma peça, confete na passarela.
5. **Interface em HTML/CSS** por cima do canvas (3 idiomas, controle da TV, leitura de tela).

## Por que PixiJS

Desenha com a placa de vídeo (WebGL/WebGPU), tem filtros (desfoque, brilho), partículas e `tint`. Licença MIT. Publica arquivos prontos (`pixi.min.mjs`) que podem ser copiados para o repositório, sem build. Filtros extras no pacote `pixi-filters`, que também tem arquivo pronto para navegador.

## Pesos

- Personagem e peças: 2048 px de altura, WebP ou AVIF qualidade 80.
- Cenários: 2560×1440 (TV) e versão menor para celular.
- Abrir com até 5 MB; o resto de cada sala baixa em segundo plano e fica no cache offline.

Exemplo: `../../exemplos/cena2d-camadas.html` (módulo `cena2d` planejado).
