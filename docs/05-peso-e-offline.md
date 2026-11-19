# 05 — Peso e offline

## Orçamento

| Item | Meta |
| --- | --- |
| Núcleo + vetor + zoom | Até 40 KB |
| Cada módulo 3D (sem a biblioteca) | Até 20 KB |
| Three.js | ~700 KB, baixado uma vez e guardado |
| Cada desenho SVG | Até 100 KB |
| Cada modelo .glb | Até 2 MB (personagem), 500 KB (peça/aparelho) |
| Primeira tela de qualquer app | Não espera o 3D |

## Offline: gaveta compartilhada (uma cópia só no aparelho)

- O motor fica guardado **uma vez** no aparelho, na gaveta `motor-pixel-<versão>`, e serve **todos** os apps do mesmo
  endereço (solverone.com.br): Bolinho de Chuva, RiseONE e os próximos. Nunca uma cópia por app.
- A página pede: `const { offline } = await Motor.usar('offline'); await offline.guardarNoAparelho(['cena3d', 'personagens3d'], { aoAndar });`
  Cada módulo só fica marcado como guardado quando **todos** os arquivos dele (e das dependências) chegaram inteiros;
  `offline.estaGuardado('cena3d')` responde se já está tudo lá.
- O service worker do app entrega os arquivos dessa gaveta com `importScripts('/motor-pixel/1.0/sw-motor.js')` e
  `if (MotorPixel.ehDoMotor(e.request)) return MotorPixel.responder(e);` — com ou sem internet.
- Versão nova do motor = gaveta nova; a antiga sai quando a nova fica completa.
- Os arquivos do próprio app continuam na gaveta do app. Modelo: `exemplos/sw-de-um-app.js`.

## Modo leve

Ligado em aparelho fraco ou pelo usuário. Sem sombra, sem brilho, nitidez 1×, menos objetos, e a tela 3D troca pela vetorial quando o app oferece as duas.
