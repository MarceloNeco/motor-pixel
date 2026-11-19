# 04 — Câmeras do Labirinto (modo Fuga)

Três câmeras, troca por um botão. Sem violência: os cachorros só querem brincar.

| Câmera | Como | Detalhes |
| --- | --- | --- |
| **Atrás (3ª pessoa) — padrão** | Câmera 3 a 4 m atrás e 2 m acima da menina, olhando para frente dela | Se houver parede entre a câmera e a menina, a câmera se aproxima (raio do personagem até a câmera); suaviza com interpolação |
| **Dentro (1ª pessoa)** | Câmera na altura dos olhos de uma criança (~1,1 m), só as mãos aparecem | Balanço mínimo ao correr; campo de visão ~75°; virar suave (evita enjoo) |
| **De cima (drone)** | Botão "Olhar de cima": sobe em 1,5 s até ver o labirinto inteiro, fica 3 s e volta | Pode ser ajuda limitada (3 vezes por fase) |

## Labirinto 3D a partir do gerador atual

- O gerador do Labirinto já produz as paredes; cada parede vira um bloco de cerca viva.
- Todas as paredes num único `InstancedMesh` (rápido no celular).
- Chão com cores por região (flor, sol, estrela) e placas, para a criança se orientar.
- Minimapa no canto mostrando só o que já foi visto.

## Cachorros

- Seguem o caminho mais curto até a menina (busca em largura na grade do labirinto), com velocidade por idade.
- Se alcançam: "Lambida!", a menina cai sentada rindo, volta ao último ponto salvo.
- Defesas sem violência: jogar um osso (distrai por 4 s), fazer crescer um arbusto que fecha um corredor por 6 s (ideia das paredes de gelo do Bad Ice-Cream), esconder-se numa casinha.
- Latido com som estéreo indicando o lado de onde o cachorro vem.

Módulo do motor: `camera3d`.
