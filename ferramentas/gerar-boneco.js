// Gera exemplos/modelos/boneco.glb abrindo ferramentas/gerar-boneco.html num navegador (Playwright).
// Rodar da raiz do repositório: node ferramentas/gerar-boneco.js
const fs = require('fs');
const path = require('path');
const { abrir } = require('./servidor.js');

(async () => {
  const { chromium } = require('playwright');
  const { srv, base } = await abrir();
  const b = await chromium.launch();
  try {
    const pg = await b.newPage();
    await pg.goto(base + 'ferramentas/gerar-boneco.html');
    await pg.waitForFunction(() => window.__glb || window.__erro, null, { timeout: 30000 });
    const erro = await pg.evaluate(() => window.__erro);
    if (erro) throw new Error(erro);
    const glb = Buffer.from(await pg.evaluate(() => window.__glb), 'base64');
    const destino = path.join(__dirname, '..', 'exemplos', 'modelos', 'boneco.glb');
    fs.writeFileSync(destino, glb);
    console.log('boneco.glb: ' + Math.round(glb.length / 1024) + ' KB');
  } finally { await b.close(); srv.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
