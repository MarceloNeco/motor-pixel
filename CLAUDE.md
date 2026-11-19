# Motor Pixel — regras do repositório para o Claude Code

- Biblioteca de desenho (vetorial + 3D) da SolverONE, publicada em **solverone.com.br/motor-pixel/** (GitHub Pages).
  Usada pelo Bolinho de Chuva (repositório `kids`), pelo RiseONE e por outros apps. Comece pelo `README.md` e por `docs/`.
- O dono (Marcelo) não é desenvolvedor: responda em português simples. **Publicar é sempre autorizado**: ao terminar e
  testar, pull request + merge sem perguntar, e conte o que mudou.
- Regras do motor (docs/01): sem build; nomes de funções em português; **nenhum nome de app dentro de `1.0/`** (o que só um
  app usa fica no app); nenhuma chave/segredo; respeitar "reduzir movimento" e o modo leve; bibliotecas copiadas em
  `1.0/libs/` (sem CDN); peso de cada módulo no `manifesto.json`.
- **Versões**: os apps apontam para `/1.0/`. Acrescentar = 1.1 (pasta nova `1.1/`, a 1.0 continua no ar); quebrar = 2.0.
  Toda versão: `versao` igual no `manifesto.json` e no `motor.js`, nota no `MUDANCAS.md`.
- **Gaveta compartilhada** (regra "recursos compartilhados" da SolverONE, 16/11/2026): o motor fica uma vez só no aparelho,
  na gaveta `motor-pixel-<versão>`, para todos os apps do endereço; `offline.guardarNoAparelho` + `1.0/sw-motor.js`.
- Testes: `node --test teste/*.test.js` (Playwright com o Chromium do ambiente). Antes de publicar: prints dos exemplos em 360 px e
  1920 px (`node ferramentas/prints.js`, saem em `docs/prints/`).
