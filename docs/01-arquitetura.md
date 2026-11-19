# 01 — Arquitetura

## Ideia

Um motor, muitos módulos, muitos apps. Cada app pede só o que usa e o motor baixa só isso. É o mesmo padrão do motor de OCR da SolverONE.

## Três camadas

| Camada | O que tem | Exemplo |
| --- | --- | --- |
| **Motor (este repositório)** | Técnicas de desenho neutras | `vetor.realcar()`, `cena3d.criarCena()` |
| **Arte e dados de cada app** | Desenhos, modelos, nomes das partes, textos | Corpo com músculos (RiseONE); carros e pilotos (Bolinho) |
| **App** | Telas, regras, idioma, anúncios, contas | RiseONE, jogos do Bolinho |

**Regra de ouro:** se só um app usa, fica no app. Só entra no motor o que serve para pelo menos dois apps, ou que claramente serviria.

## Regras

- **Repositório próprio** (sugestão: `motor-pixel`), publicado no GitHub Pages em `solverone.com.br/motor-pixel/<versão>/`.
- **Cada módulo é uma pasta** com `index.js` (módulo ES), sem build, com nomes de funções em português.
- **Carregamento sob demanda** com `import()`: o `nucleo` é pequeno; Three.js só baixa quando um módulo 3D é pedido.
- **Versão presa por app:** o app aponta para `/1.0/`, nunca para "a última". Atualizar é decisão de cada app.
- **Compatibilidade:** mudar uma função de jeito que quebre os apps exige versão nova maior (`2.0`); acrescentar é versão menor (`1.1`).
- **Bibliotecas copiadas** em `libs/`, sem CDN em produção, para funcionar offline.
- **Peso máximo** de cada módulo no `manifesto.json`; o teste falha se passar.
- **Acessibilidade:** todo módulo respeita "reduzir movimento" e o modo leve.
- **Sem dados de usuário:** o motor não guarda nada, não chama servidor, não tem chave.

## Como o app carrega

```js
import { Motor } from '/motor-pixel/1.0/motor.js';
const { vetor } = await Motor.usar('vetor');
```

O `motor.js` lê o `manifesto.json`, carrega primeiro as dependências (ex.: `nucleo`) e depois o módulo. Cada módulo é carregado uma vez só.

## Versões e publicação

1. Mudança feita num ramo, com teste.
2. Página de exemplos atualizada e conferida em celular (360 px) e TV (1920 px).
3. Pasta nova `/<versão>/` publicada; as antigas **ficam no ar** (apps antigos continuam funcionando).
4. Nota da versão em `MUDANCAS.md`.
