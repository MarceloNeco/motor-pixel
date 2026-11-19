# Motor Pixel

Biblioteca de desenho para os apps web (PWA) da SolverONE: **vetorial (SVG) e 3D (Three.js) no mesmo motor**, com módulos baixados só quando um app pede. Não pertence a nenhum app: não sabe o que é jogo, treino ou criança. Cada app é um **cliente** do motor.

Versão 1.0.0 (publicada em 19/11/2026, a partir do rascunho de referência de 16/11/2026). Todos os módulos carregam e têm teste automático no navegador (`node --test teste/`); veja `MUDANCAS.md`.

## Em uma frase

```js
import { Motor } from 'https://solverone.com.br/motor-pixel/1.0/motor.js';
const { vetor, zoom } = await Motor.usar('vetor', 'zoom');        // leve: ~25 KB
const { cena3d, realce3d } = await Motor.usar('cena3d', 'realce3d'); // só quando abrir a tela 3D
```

## Quando usar vetorial e quando usar 3D

| Precisa de… | Use | Peso |
| --- | --- | --- |
| Cartões, ícones, mapas, gráficos, partes que acendem, zoom nítido, uma ou duas vistas fixas | **Vetorial** (`vetor`, `zoom`) | Muito leve |
| Girar livremente, ver de qualquer ângulo, profundidade, mundos, personagens que se mexem | **3D** (`cena3d` + o que precisar) | ~700 KB de biblioteca, baixada só uma vez |
| O mesmo conteúdo nos dois | Mesmo vocabulário: `realcar({principal, apoio})`, `aoTocarParte`, `focar` existem no vetorial e no 3D | O app escolhe por tela, e cai para o vetorial no modo leve |

## Módulos

| Módulo | Tipo | Faz | Status |
| --- | --- | --- | --- |
| `nucleo` | comum | Modo leve, "reduzir movimento", nitidez, laço de quadros único, tamanho de tela | **Testado** |
| `efeitos` | comum | Pulinho, tremer, brilhos, "+10" | Carrega (sem teste próprio) |
| `offline` | comum | Guarda o motor uma vez só no aparelho (gaveta compartilhada entre os apps), inteiro ou nada | **Testado** |
| `vetor` | vetorial | Carregar SVG, acender/pulsar partes por id, tocar parte, mover peça, trocar pose, neon | **Testado** |
| `zoom` | vetorial | Pinça, arrastar, roda do mouse, focar numa parte, ajustar | **Testado** |
| `cena3d` | 3D | Cena Three.js já bonita (cor, luz, sombra), girar com o dedo, modo leve | **Testado** |
| `personagens3d` | 3D | Personagem .glb com animações, expressões e piscar | **Testado** |
| `camera3d` | 3D | Câmeras atrás / primeira pessoa / drone que sobe e volta, sem atravessar paredes | Carrega (sem exemplo ainda) |
| `realce3d` | 3D | Acender/pulsar/tocar/focar partes de um modelo pelo nome da malha | **Testado** |
| `holograma` | 3D | Material de holograma, cena escura com brilho, peças de aparelho (encosto, pino, placas) | **Testado** |
| `cena2d` | 2D | PixiJS para cenas pintadas com muitos objetos | Planejado (exemplo pronto) |
| `rive` | vetorial animado | Vetor com ossos e rostos vivos | Planejado (exemplos prontos) |

## Pastas

```
motor-pixel/  (publicado em solverone.com.br/motor-pixel/)
  README.md            este arquivo
  MUDANCAS.md          o que mudou em cada versão
  1.0/                 a versão 1.0 (os apps apontam para cá; versões antigas ficam no ar)
    motor.js           carregador sob demanda
    manifesto.json     lista de módulos, dependências, bibliotecas e peso máximo
    sw-motor.js        para o service worker de cada app: entrega o motor da gaveta compartilhada
    modulos/<nome>/index.js
    libs/              Three.js r187 e os addons usados, minificados, com licença (sem CDN)
  exemplos/            páginas que abrem no navegador (index.html lista todas)
  docs/                como o motor funciona (leia na ordem)
  apps/                como cada app usa o motor (Bolinho de Chuva, RiseONE)
  ferramentas/         servidor local de teste e gerador do boneco de exemplo (.glb)
  teste/               testes automáticos: node --test teste/
  FONTES.md
```

## Documentação

1. [docs/01-arquitetura.md](docs/01-arquitetura.md): camadas, regras, versões, onde publicar
2. [docs/02-referencia-dos-modulos.md](docs/02-referencia-dos-modulos.md): funções de cada módulo
3. [docs/03-vetorial.md](docs/03-vetorial.md): como preparar arte vetorial em camadas
4. [docs/04-3d.md](docs/04-3d.md): receita de cena, modelos, partes nomeadas
5. [docs/05-peso-e-offline.md](docs/05-peso-e-offline.md): orçamento de peso, cache, modo leve
6. [docs/06-como-um-app-usa.md](docs/06-como-um-app-usa.md): passo a passo para um app novo virar cliente
7. [docs/07-criterios-de-pronto.md](docs/07-criterios-de-pronto.md): checklist antes de publicar uma versão do motor
8. [docs/08-prompt-claude-code.md](docs/08-prompt-claude-code.md): prompt para criar o repositório

Clientes: [apps/bolinho-de-chuva/](apps/bolinho-de-chuva/) · [apps/riseone/](apps/riseone/)
