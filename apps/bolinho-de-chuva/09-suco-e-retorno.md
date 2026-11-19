# 09 — "Suco": retorno a cada toque

O que mais separa os jogos do Poki dos jogos do Bolinho, além da arte, é o retorno imediato a cada ação.

## Checklist por ação importante

- **Visual:** pulinho de 150 ms no objeto (escala 1 → 1,08 → 1), 6 a 12 brilhos, número de pontos subindo e sumindo.
- **Câmera:** tremida curta (2 a 4 px, 120 ms) em batida ou corte forte. Desligar com "reduzir movimento".
- **Som:** efeito curto e diferente por tipo (acerto, erro, combo); combo sobe o tom.
- **Personagem:** reage (sorri, se assusta, comemora).
- **Progresso:** barra ou medidor que sobe na hora (ex.: humor da cliente, % de bagunça).

## Exemplos do Poki

| Jogo | Retorno |
| --- | --- |
| Nails DIY | Barra de progresso ao esfregar; alvos verdes indicando onde tocar |
| Diva Hair Salon | Medidor do emoji bravo ao apaixonado; cliente sorri enquanto você trabalha |
| Glam Girl | Nota em corações contra a rival |
| Slice Master | Fruta parte em duas, pontos sobem a cada fatia |

## Regras

- Uma mensagem no meio da tela por vez; placar em cantos fixos (a Bagunçolândia hoje sobrepõe textos).
- Respeitar `prefers-reduced-motion`: sem tremida, brilhos menores.

Módulo do motor: `efeitos`.
