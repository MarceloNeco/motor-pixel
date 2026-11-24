// Renderiza a cena three.js com o Chrome sem janela.
//   node render.mjs cards            -> um JPG por momento-chave em cards/
//   node render.mjs cards 3 5        -> só os cards 3 e 5
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

// Chrome instalado na máquina (ou aponte CHROME_PATH para outro executável)
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
await page.goto(`http://127.0.0.1:${port}/src/index.html`);
await page.waitForFunction('window.ready === true', { timeout: 90000 });

const mode = process.argv[2] || 'cards';
if (mode === 'cards') {
  const ids = await page.evaluate(() => window.KEYS.map(k => k.id));
  const only = process.argv.slice(3).map(Number);
  fs.mkdirSync(path.join(ROOT, 'cards'), { recursive: true });
  const canvas = await page.$('#out');
  for (let i = 0; i < ids.length; i++) {
    if (only.length && !only.includes(i)) continue;
    await page.evaluate(i => window.renderKey(i), i);
    await canvas.screenshot({ path: path.join(ROOT, 'cards', ids[i] + '.jpg'), type: 'jpeg', quality: 93 });
    console.log('card', ids[i]);
  }
  console.log(await page.evaluate(() => window.gpuInfo));
}
if (mode === 'at') {
  // quadros avulsos: node render.mjs at 6.5 7.25 ...
  fs.mkdirSync(path.join(ROOT, 'out', 'teste'), { recursive: true });
  const canvas = await page.$('#out');
  for (const a of process.argv.slice(3)) {
    const t = Number(a);
    await page.evaluate(t => window.renderAt(t), t);
    await canvas.screenshot({ path: path.join(ROOT, 'out', 'teste', 't' + t.toFixed(2).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 88 });
  }
  console.log('cortes em', await page.evaluate(() => window.SHOTS));
}
if (mode === 'video') {
  const { execFileSync } = await import('node:child_process');
  const dir = path.join(ROOT, 'out', 'frames');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const FPS = 30, dur = await page.evaluate(() => window.DURATION), n = Math.round(dur * FPS);
  const canvas = await page.$('#out');
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.renderAt(t), i / FPS);
    await canvas.screenshot({ path: path.join(dir, 'f' + String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 97 });
    if (i % 60 === 0) console.log('quadro', i, '/', n);
  }
  const out = path.join(ROOT, 'out', 'duelo-no-entardecer.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.jpg'), '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('video', out, n, 'quadros');
}
await browser.close();
server.close();
