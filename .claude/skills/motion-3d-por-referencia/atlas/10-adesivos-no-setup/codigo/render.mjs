// Renderiza a cena three.js com o Chrome sem janela (o quadro inclui o título 2D por cima).
//   node render.mjs cards            -> um JPG por momento-chave em cards/
//   node render.mjs cards 3 5        -> só os cards 3 e 5
//   node render.mjs at 2.5 6.1       -> quadros avulsos em out/teste/
//   node render.mjs folha            -> out/folha-adesivos.png (todos os adesivos)
//   SS=1 DRAFT=1 node render.mjs video -> out/rascunho.mp4 (rápido: sem superamostragem e sem rastro)
//   node render.mjs video            -> out/adesivos-no-setup.mp4
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const CHROME = [process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium',
].find(p => p && fs.existsSync(p));
if (!CHROME) { console.error('Chrome não encontrado. Instale o Google Chrome ou defina CHROME_PATH.'); process.exit(1); }
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [...(process.platform === 'darwin' ? ['--use-angle=metal'] : []), '--ignore-gpu-blocklist', '--enable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[pagina]', m.text()); });
page.on('pageerror', e => console.log('[erro]', e.message));
await page.goto(`http://127.0.0.1:${port}/src/index.html?ss=${process.env.SS || 2}`);
await page.waitForFunction('window.ready === true', { timeout: 120000 });
const palco = await page.$('#palco');
const shot = (file, quality) => palco.screenshot({ path: file, type: 'jpeg', quality });

const mode = process.argv[2] || 'cards';
if (mode === 'cards') {
  const ids = await page.evaluate(() => window.KEYS.map(k => k.id));
  const only = process.argv.slice(3).map(Number);
  fs.mkdirSync(path.join(ROOT, 'cards'), { recursive: true });
  for (let i = 0; i < ids.length; i++) {
    if (only.length && !only.includes(i)) continue;
    await page.evaluate(i => window.renderKey(i), i);
    await shot(path.join(ROOT, 'cards', ids[i] + '.jpg'), 93);
    console.log('card', ids[i]);
  }
  console.log(await page.evaluate(() => window.gpuInfo));
}
if (mode === 'folha') {
  const data = await page.evaluate(() => window.stickerSheet());
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'out', 'folha-adesivos.png'), Buffer.from(data.split(',')[1], 'base64'));
  console.log('folha de adesivos');
}
if (mode === 'at') {
  fs.mkdirSync(path.join(ROOT, 'out', 'teste'), { recursive: true });
  for (const a of process.argv.slice(3)) {
    const t = Number(a);
    await page.evaluate(t => window.renderAt(t), t);
    await shot(path.join(ROOT, 'out', 'teste', 't' + t.toFixed(2).padStart(5, '0') + '.jpg'), 88);
  }
}
if (mode === 'video') {
  const { execFileSync } = await import('node:child_process');
  const dir = path.join(ROOT, 'out', 'frames');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const DRAFT = !!process.env.DRAFT, FPS = 30, dur = await page.evaluate(() => window.DURATION), n = Math.round(dur * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate((i, fps, blur) => window.renderFrame(i, fps, blur), i, FPS, !DRAFT);
    await shot(path.join(dir, 'f' + String(i).padStart(4, '0') + '.jpg'), 96);
    if (i % 60 === 0) console.log('quadro', i, '/', n);
  }
  const out = path.join(ROOT, 'out', DRAFT ? 'rascunho.mp4' : 'adesivos-no-setup.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.jpg'), '-vf', 'scale=in_color_matrix=bt601:in_range=full:out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('video', out, n, 'quadros');
}
await browser.close();
server.close();
