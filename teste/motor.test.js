// Vigias do Motor Pixel. Rodar da raiz do repositório: node --test teste/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { abrir } = require('../ferramentas/servidor.js');
const raiz = path.join(__dirname, '..');
const V = path.join(raiz, '1.0');
const M = JSON.parse(fs.readFileSync(path.join(V, 'manifesto.json'), 'utf8'));
const kb = (f) => fs.statSync(path.join(V, f)).size / 1024;
const MODULOS = Object.keys(M.modulos);

test('manifesto: todo módulo e biblioteca existe e cabe no peso combinado', () => {
  for (const [nome, info] of Object.entries(M.modulos)) {
    assert.ok(fs.existsSync(path.join(V, info.arquivo)), nome + ': falta ' + info.arquivo);
    assert.ok(kb(info.arquivo) <= info.pesoMaxKB, nome + ': ' + kb(info.arquivo).toFixed(1) + ' KB passa de ' + info.pesoMaxKB + ' KB');
    for (const d of info.depende || []) assert.ok(M.modulos[d], nome + ': depende de "' + d + '", que não existe');
    const libs = info.libs || [];
    for (const l of libs) assert.ok(fs.existsSync(path.join(V, l)) && fs.statSync(path.join(V, l)).isFile(), nome + ': falta a biblioteca ' + l);
    if (info.pesoLibsKB) { const t = libs.reduce((s, l) => s + kb(l), 0); assert.ok(t <= info.pesoLibsKB, nome + ': bibliotecas com ' + t.toFixed(0) + ' KB passam de ' + info.pesoLibsKB); }
  }
  const nucleoMaisVetor = ['nucleo', 'vetor', 'zoom'].reduce((s, n) => s + kb(M.modulos[n].arquivo), 0);
  assert.ok(nucleoMaisVetor <= 40, 'núcleo + vetor + zoom até 40 KB (' + nucleoMaisVetor.toFixed(1) + ')');
});

test('regras: sem build, sem "three" solto (funciona sem importmap), sem nome de app, sem chave, sem o nome antigo', () => {
  const arquivos = [];
  const andar = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) andar(p); else arquivos.push(p); } };
  andar(V);
  for (const f of arquivos.filter((f) => f.endsWith('.js'))) {
    const t = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(t, /from\s*["']three(\/[^"']*)?["']/, path.relative(raiz, f) + ': import "three" solto');
    if (!f.includes(path.sep + 'libs' + path.sep)) {
      assert.doesNotMatch(t, /bolinho|riseone|h-rraaa|vruuum|purpurina|labirinto/i, path.relative(raiz, f) + ': nome de app dentro do motor');
      assert.doesNotMatch(t, /(api[_-]?key|secret|token)\s*[:=]\s*['"][^'"]{8,}/i, path.relative(raiz, f) + ': parece uma chave');
    }
  }
  for (const f of ['README.md', 'COMO-USAR.md', 'docs', 'exemplos']) {
    const p = path.join(raiz, f);
    const lista = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((x) => path.join(p, x)).filter((x) => fs.statSync(x).isFile()) : [p];
    for (const x of lista) assert.doesNotMatch(fs.readFileSync(x, 'utf8'), /motor-grafico/, path.relative(raiz, x) + ': nome antigo motor-grafico');
  }
  assert.match(fs.readFileSync(path.join(raiz, 'MUDANCAS.md'), 'utf8'), /1\.0\.0/, 'MUDANCAS.md começa na 1.0.0');
  assert.strictEqual(M.versao, require('fs').readFileSync(path.join(V, 'motor.js'), 'utf8').match(/versao: '([^']+)'/)[1], 'versão igual no motor.js e no manifesto');
});

async function navegador() {
  const { chromium } = require('playwright');
  return chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
}

test('navegador: cada módulo carrega pelo Motor.usar; cena3d cria e destrói sem erro', { timeout: 120000 }, async () => {
  const { srv, base } = await abrir();
  const b = await navegador();
  try {
    const pg = await b.newPage(), erros = [];
    pg.on('pageerror', (e) => erros.push(e.message));
    await pg.goto(base + 'teste/pagina.html');
    const r = await pg.evaluate(async (mods) => {
      const { Motor } = await import('../1.0/motor.js');
      const out = {};
      for (const n of mods) { try { const m = (await Motor.usar(n))[n]; out[n] = Object.keys(m).length; } catch (e) { out[n] = 'ERRO: ' + e.message; } }
      const { cena3d } = await Motor.usar('cena3d');
      const cena = cena3d.criarCena(document.getElementById('c'), { girar: true });
      await new Promise((ok) => setTimeout(ok, 300));
      cena.destruir();
      out.__cena = !!cena.renderer;
      return out;
    }, MODULOS);
    for (const n of MODULOS) assert.ok(typeof r[n] === 'number' && r[n] > 0, n + ': ' + r[n]);
    assert.ok(r.__cena, 'cena criada');
    assert.deepStrictEqual(erros, [], 'erro na página');
  } finally { await b.close(); srv.close(); }
});

test('vetor e zoom: acender, tocar numa parte e focar', { timeout: 60000 }, async () => {
  const { srv, base } = await abrir();
  const b = await navegador();
  try {
    const pg = await b.newPage({ viewport: { width: 360, height: 760 } }), erros = [];
    pg.on('pageerror', (e) => erros.push(e.message));
    await pg.goto(base + 'exemplos/vetor-mapa-do-corpo.html');
    await pg.waitForFunction(() => document.querySelector('#peitoral.mg-ativo'));
    assert.ok(await pg.$eval('#deltoide_esq', (e) => e.classList.contains('mg-apoio')), 'apoio aceso');
    await pg.click('#agacha');
    assert.ok(await pg.$eval('#quadriceps_esq', (e) => e.classList.contains('mg-ativo')) && !(await pg.$eval('#peitoral', (e) => e.classList.contains('mg-ativo'))), 'trocou o realce');
    await pg.click('#abdomen');
    assert.match(await pg.textContent('#info'), /Dói em: abdomen/, 'tocar devolve a parte');
    const antes = await pg.getAttribute('#corpo', 'viewBox');
    await pg.click('#focar'); await pg.waitForTimeout(700);
    assert.notStrictEqual(await pg.getAttribute('#corpo', 'viewBox'), antes, 'zoom focou numa parte');
    await pg.click('#ajustar'); await pg.waitForTimeout(700);
    assert.strictEqual(await pg.getAttribute('#corpo', 'viewBox'), antes, 'ajustar volta ao desenho inteiro');
    assert.deepStrictEqual(erros, []);
  } finally { await b.close(); srv.close(); }
});

test('3D: personagem com animações e expressões, partes que acendem e respondem ao toque, holograma', { timeout: 120000 }, async () => {
  const { srv, base } = await abrir();
  const b = await navegador();
  try {
    const pg = await b.newPage({ viewport: { width: 360, height: 760 } }), erros = [];
    pg.on('pageerror', (e) => erros.push(e.message));
    await pg.goto(base + 'exemplos/cena3d.html');
    await pg.waitForFunction(() => window.__exemplo, null, { timeout: 30000 });
    const l = await pg.evaluate(() => window.__exemplo.boneco.lista());
    assert.deepStrictEqual(l.animacoes.sort(), ['comemorar', 'parado'], 'animações do .glb');
    assert.deepStrictEqual(l.expressoes.sort(), ['feliz', 'piscar'], 'expressões do .glb');
    await pg.click('#comemorar'); await pg.click('#feliz'); await pg.waitForTimeout(300);

    await pg.goto(base + 'exemplos/realce3d.html');
    await pg.waitForFunction(() => window.__exemplo, null, { timeout: 30000 });
    const nomes = await pg.evaluate(() => window.__exemplo.realce.nomes().sort());
    assert.deepStrictEqual(nomes, ['braco_dir', 'braco_esq', 'cabeca', 'perna_dir', 'perna_esq', 'tronco'], 'partes nomeadas do .glb');
    await pg.click('#bracos');
    assert.ok(await pg.evaluate(() => { const r = window.__exemplo.boneco.raiz; return r.getObjectByName('braco_esq').material !== r.getObjectByName('cabeca').material; }), 'braço aceso com material diferente');
    // toque no meio da tela (onde fica o tronco)
    await pg.click('#apagar');
    await pg.mouse.click(180, 380);
    assert.match(await pg.textContent('#info'), /Você tocou: /, 'tocar numa parte devolve o nome');
    await pg.click('#cabeca'); await pg.waitForTimeout(200);

    await pg.goto(base + 'exemplos/holograma.html');
    await pg.waitForFunction(() => window.__exemplo, null, { timeout: 30000 });
    await pg.click('#trocar');
    assert.deepStrictEqual(erros, [], 'erro na página');
  } finally { await b.close(); srv.close(); }
});

test('gaveta compartilhada: guarda inteiro, abre sem internet; arquivo que falha não marca como guardado', { timeout: 120000 }, async () => {
  let falhar = null;
  const { srv, base } = await abrir({ falhar: (p) => falhar && p === falhar });
  const b = await navegador();
  try {
    const ctx = await b.newContext();
    const pg = await ctx.newPage();
    await pg.goto(base + 'teste/pagina.html');
    await pg.evaluate(() => navigator.serviceWorker.ready);
    await pg.reload(); await pg.waitForFunction(() => navigator.serviceWorker.controller);
    // um arquivo do 3D falha: nada fica marcado como guardado
    falhar = '1.0/libs/three.core.js';
    const r1 = await pg.evaluate(async () => { const { Motor } = await import('../1.0/motor.js'); const { offline } = await Motor.usar('offline'); return [await offline.guardarNoAparelho(['cena3d']), await offline.estaGuardado('cena3d')]; });
    assert.deepStrictEqual(r1, [false, false], 'não guardou pela metade');
    falhar = null;
    const r2 = await pg.evaluate(async () => { const { Motor } = await import('../1.0/motor.js'); const { offline } = await Motor.usar('offline'); const ok = await offline.guardarNoAparelho(['cena3d', 'personagens3d']); return [ok, await offline.estaGuardado('cena3d', 'personagens3d'), await caches.keys()]; });
    assert.strictEqual(r2[0], true); assert.strictEqual(r2[1], true);
    assert.deepStrictEqual(r2[2].filter((k) => k.startsWith('motor-pixel-')), ['motor-pixel-' + M.versao], 'uma gaveta só, com a versão');
    // sem internet: o motor 3D abre da gaveta compartilhada
    await ctx.setOffline(true);
    await pg.goto(base + 'teste/pagina.html').catch(() => {});
    const r3 = await pg.evaluate(async () => {
      const { Motor } = await import('../1.0/motor.js');
      const { cena3d, personagens3d } = await Motor.usar('cena3d', 'personagens3d');
      const cena = cena3d.criarCena(document.getElementById('c'));
      const ok = !!cena.renderer && typeof personagens3d.criarPersonagem === 'function';
      cena.destruir(); return ok;
    }).catch((e) => 'ERRO: ' + e.message);
    assert.strictEqual(r3, true, 'sem internet: ' + r3);
    await ctx.close();
  } finally { await b.close(); srv.close(); }
});
