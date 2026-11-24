# Perícia da referência: Airbnb It (BUCK, direção de Ege Soyuer)

Fonte: https://www.ege.work/airbnb-houseboat. Nove spots de 15 s, 1920×1080, 24 fps. Medidos: empty-nest, merlot, one-week, guest-house.

## Estrutura
- **Mecanismo:** a maquete se monta sozinha diante de uma câmera parada, e tudo o que acontece na história brota, some ou se transforma dentro dela.
- **Arco de cada spot:** piso entra (0–1 s) → paredes e móveis brotam (1–2 s) → a ação do personagem (2–10 s) → a casa se rearruma e a luz esquenta (10–12 s) → assinatura (12–15 s).
- **Emendas:** quase tudo acontece no mesmo plano; 1 a 4 cortes secos por spot, nenhum crossfade.

## Design
- Cômodo em corte com duas paredes e o contorno escuro no topo do corte; fundo infinito de uma cor só, com sombra de contato.
- Câmera isométrica, alta, sem perspectiva forte; desfoque leve nas bordas (escala de miniatura).
- Texturas aumentadas (tábua larga, trama grossa) para a peça parecer pequena e feita à mão.
- Luz de estúdio macia, uma direção dominante, sombras suaves e visíveis.
- Proibido na referência: tremor de câmera, zoom rápido, partículas decorativas, texto durante a ação.

## Movimento (medido com pericia-movimento.py)
| Spot | Amplitude | Em quase-parada | Cortes secos |
|---|---|---|---|
| empty-nest | 5,9× | 39% | 1 |
| merlot | 26,6× | 71% | 4 |
| one-week | 8,2× | 45% | 1 |
| guest-house | 5,9× | 39% | 1 |

**Metas do nosso filme (contra empty-nest, o spot de quarto com personagem):** amplitude ≥ 4,1×, quase-parada ≥ 29%, pelo menos 2 picos e pelo menos 1 corte seco. Os JSON estão nesta pasta.

## O que NÃO copiamos
Marca, assinatura "airbnb it.", casas, personagens, figurino e paleta da campanha. Fica só o método: maquete em corte, câmera parada, peças que brotam, alternância de pausa e estalo.
