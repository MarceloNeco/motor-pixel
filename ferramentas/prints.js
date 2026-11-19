// Prints de todos os exemplos em 360 px (celular) e 1920 px (TV), em docs/prints/. Rodar da raiz: node ferramentas/prints.js
const fs = require('fs');
const path = require('path');
const { abrir } = require('./servidor.js');
const PAGINAS = ['index', 'vetor-mapa-do-corpo', 'exercicio-svg', 'cena3d', 'realce3d', 'holograma'];
(async () => {
  const { chromium } = require('playwright');
  const { srv, base } = await abrir();
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pasta = path.join(__dirname, '..', 'docs', 'prints'); fs.mkdirSync(pasta, { recursive: true });
  try {
    for (const [nome, w, h] of [['360', 360, 760], ['1920', 1920, 1080]]) {
      const pg = await b.newPage({ viewport: { width: w, height: h } });
      for (const p of PAGINAS) {
        await pg.goto(base + 'exemplos/' + p + '.html');
        await pg.waitForTimeout(p.match(/cena3d|realce3d|holograma/) ? 3500 : 800);
        await pg.screenshot({ path: path.join(pasta, p + '-' + nome + '.png') });
      }
      await pg.close();
    }
    console.log('prints em docs/prints/');
  } finally { await b.close(); srv.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
