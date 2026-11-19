# 06 — Como um app vira cliente do motor

1. **Escolher os módulos** de cada tela (tabela do README). Comece pelo mínimo.
2. **Preparar a arte** com partes nomeadas (docs/03 e docs/04). Guardar a lista de nomes no app.
3. **Importar a versão presa:**
   ```js
   import { Motor } from '/motor-pixel/1.0/motor.js';
   ```
4. **Carregar na hora certa:** vetorial na abertura da tela; 3D só quando o usuário abre o detalhe.
   ```js
   const { cena3d, realce3d } = await Motor.usar('cena3d', 'realce3d');
   const cena = cena3d.criarCena(canvas, { fundo: '#11141B', girar: true });
   ```
5. **Ligar os dados do app** (ex.: músculos de cada exercício) às funções `realcar`, `aoTocarParte`, `focar`.
6. **Offline:** somar `await offline.listarArquivos(...)` à lista do service worker do app.
7. **Liberar ao sair** da tela 3D com `cena.destruir()`.
8. **Testar** em celular (360 px), TV (1920 px) e modo leve.

## O que fica no app, nunca no motor

Textos e idiomas, regras de negócio, anúncios, contas, login, dados do usuário, arte e modelos do app, sons e música.

## Pedir algo novo ao motor

Se dois apps precisam de uma técnica, ela entra no motor (versão menor nova). Se só um precisa, ela fica no app.
