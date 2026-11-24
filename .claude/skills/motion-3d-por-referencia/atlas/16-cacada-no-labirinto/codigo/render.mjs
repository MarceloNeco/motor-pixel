// Renderiza a cena three.js com o Chrome sem janela (o quadro inclui o placar 2D por cima).
//   node render.mjs at 2.5 8.6        -> quadros avulsos em out/teste/ (1 amostra por quadro)
//   node render.mjs at 2.5 --sub=8    -> idem, com desfoque de movimento (8 subquadros)
//   node render.mjs topo 0 4 8        -> vista de cima, sem pós, para conferir a coreografia
//   node render.mjs cards             -> um JPG por momento-chave em cards/
//   node render.mjs video             -> out/cacada-no-labirinto.mp4 (1920x1080, 30 qps, 15 s)
//   node render.mjs video --sub=4     -> render mais rápido, desfoque de movimento mais grosso
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

const args = process.argv.slice(2);
const mode = args[0] || 'at';
const flag = (name, def) => { const a = args.find(a => a.startsWith('--' + name + '=')); return a ? a.split('=')[1] : def; };
const nums = args.slice(1).filter(a => !a.startsWith('--')).map(Number);

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
await page.waitForFunction('window.ready === true', { timeout: 180000 });
const palco = await page.$('#palco');
const shot = (file, quality) => palco.screenshot({ path: file, type: 'jpeg', quality });

if (mode === 'at' || mode === 'topo') {
  const sub = Number(flag('sub', 1));
  fs.mkdirSync(path.join(ROOT, 'out', 'teste'), { recursive: true });
  for (const t of nums) {
    if (mode === 'topo') await page.evaluate(t => window.renderTop(t), t);
    else await page.evaluate((t, sub) => window.renderAt(t, sub), t, sub);
    const file = path.join(ROOT, 'out', 'teste', (mode === 'topo' ? 'topo-' : 't') + t.toFixed(2).padStart(5, '0') + '.jpg');
    await shot(file, 90);
    console.log(file);
  }
  console.log(await page.evaluate(() => window.gpuInfo));
}
if (mode === 'cards') {
  const sub = Number(flag('sub', 8));
  const keys = await page.evaluate(() => window.KEYS);
  fs.mkdirSync(path.join(ROOT, 'cards'), { recursive: true });
  for (const k of keys) {
    await page.evaluate((t, sub) => window.renderAt(t, sub), k.t, sub);
    await shot(path.join(ROOT, 'cards', k.id + '.jpg'), 93);
    console.log('card', k.id);
  }
}
if (mode === 'video') {
  const { execFileSync } = await import('node:child_process');
  const sub = Number(flag('sub', 8));
  const dir = path.join(ROOT, 'out', 'frames');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const FPS = 30, dur = await page.evaluate(() => window.DURATION), n = Math.round(dur * FPS);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate((t, sub) => window.renderAt(t, sub), i / FPS, sub);
    await shot(path.join(dir, 'f' + String(i).padStart(4, '0') + '.jpg'), 97);
    if (i % 30 === 0) console.log('quadro', i, '/', n, ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  }
  const out = path.join(ROOT, 'out', flag('nome', 'cacada-no-labirinto') + '.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.jpg'),
    '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p', '-c:v', 'libx264', '-crf', flag('crf', '15'), '-preset', 'slow',
    '-color_range', 'tv', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('video', out, n, 'quadros', ((Date.now() - t0) / 1000).toFixed(0) + ' s');
}
await browser.close();
server.close();
