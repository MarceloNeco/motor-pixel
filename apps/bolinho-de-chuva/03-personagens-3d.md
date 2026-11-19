# 03 — Personagens 3D com rosto, expressões e movimento

Substitui os pilotos "bola com emoji" do Vruuum! e serve para a menina do Labirinto, a Bagunçolândia e o instrutor do RiseONE.

## Três camadas

1. **Esqueleto (rig) + animações:** parado, correr, curva esquerda, curva direita, pular, batida ("ui!"), comemorar, triste. O Three.js toca as animações com `AnimationMixer` e faz a troca suave com `fadeIn`/`fadeOut`.
2. **Rosto com morph targets:** formas prontas do rosto (neutro, feliz, rindo, surpreso, concentrado, chateado, piscar) misturadas por cima de qualquer animação.
3. **Eventos do jogo ligados ao rosto:** pegou estrela = sorriso; turbo = surpresa; batida = careta; chegada = comemorar.

## De onde vêm os personagens

| Caminho | Uso | Cuidado |
| --- | --- | --- |
| Quaternius Universal Base Characters (CC0, glTF, 20 penteados) + Universal Animation Library (CC0) | Base, rivais, figurantes | Estilo genérico |
| Gerado por IA a partir de imagem pintada (ex.: Meshy: modelo 3D + esqueleto + formas do rosto + biblioteca de animações, exporta GLB) | Pilotos exclusivos, Faísca, instrutor do RiseONE | Licença comercial depende do plano; revisar olhos e boca à mão |
| Ilustrador 3D contratado | 2 ou 3 mascotes principais | Mais caro |

## Guia rápido de estilo dos pilotos

- Proporção de brinquedo (cabeça grande, corpo curto), mas com rosto de verdade: olhos com brilho, sobrancelhas que se mexem, boca que abre.
- Mesma paleta do guia de estilo do Bolinho; luz de cima, um pouco à esquerda.
- No pódio e na garagem: personagem fora do carro, girando de verdade, com dança de vitória.
- Selfie da criança: usar só para sugerir pele, cabelo e óculos do personagem (a foto não sai do aparelho).

## RiseONE

Mesmo módulo de personagens, com animações de exercício feitas sob medida (geradas a partir de texto ou capturadas com a câmera e revisadas). Exercício com técnica correta precisa de revisão por quem entende de treino.

Módulo do motor: `personagens3d`.
