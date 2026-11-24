// Renderiza a cena three.js do "Restaurante em miniatura" com o Chrome sem janela.
//   node render.mjs cards              -> um JPG por momento-chave em cards/
//   node render.mjs at 0.5 2.3         -> quadros avulsos em out/teste/
//   node render.mjs video              -> out/restaurante-miniatura.mp4 (sem áudio)
//   QUALIDADE=rascunho node render.mjs at 3   -> menos subquadros (iteração rápida)
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
// As fontes do sistema (Arial Rounded Bold) são lidas do macOS; nada é copiado para o projeto.
const SYSFONTS = '/System/Library/Fonts/Supplemental';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf' };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  let file;
  if (rel.startsWith('/sysfonts/')) file = path.join(SYSFONTS, path.basename(rel));
  else { file = path.join(ROOT, rel); if (!file.startsWith(ROOT)) file = null; }
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const CHROME = [process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium',
].find(p => p && fs.existsSync(p));
if (!CHROME) { console.error('Chrome não encontrado. Instale o Google Chrome ou defina CHROME_PATH.'); process.exit(1); }
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  protocolTimeout: 600000,
  args: [...(process.platform === 'darwin' ? ['--use-angle=metal'] : []), '--ignore-gpu-blocklist', '--enable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--disable-gpu-watchdog', '--disable-features=CalculateNativeWinOcclusion'],
});
const page = await browser.newPage();
const W = Number(process.env.LARGURA || 1920), H = Math.round(W * 9 / 16);
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
page.on('console', m => { const t = m.type(); if (t === 'error' || t === 'warning' || m.text().startsWith('[cena]')) console.log('[pagina]', m.text()); });
page.on('pageerror', e => console.log('[erro]', e.message));
const q = process.env.QUALIDADE || 'final';
await page.goto(`http://127.0.0.1:${port}/src/index.html?q=${q}&w=${W}${process.env.CAM ? '&cam=' + process.env.CAM : ''}`);
await page.waitForFunction('window.ready === true', { timeout: 180000 });
console.log(await page.evaluate(() => window.gpuInfo));

// Lê o canvas como JPEG direto da página (mais rápido que screenshot)
async function grab(file, quality = 0.95) {
  const b64 = await page.evaluate(qq => window.grab(qq), quality);
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
}

const mode = process.argv[2] || 'cards';
if (mode === 'cards') {
  const keys = await page.evaluate(() => window.KEYS);
  const only = process.argv.slice(3);
  fs.mkdirSync(path.join(ROOT, 'cards'), { recursive: true });
  for (const k of keys) {
    if (only.length && !only.includes(k.id)) continue;
    await page.evaluate(t => window.renderAt(t), k.t);
    await grab(path.join(ROOT, 'cards', k.id + '.jpg'), 0.93);
    console.log('card', k.id, k.t);
  }
}
if (mode === 'at') {
  const dir = path.join(ROOT, 'out', 'teste');
  fs.mkdirSync(dir, { recursive: true });
  for (const a of process.argv.slice(3)) {
    const t = Number(a), t0 = Date.now();
    await page.evaluate(t => window.renderAt(t), t);
    await grab(path.join(dir, 't' + t.toFixed(2).padStart(5, '0') + '.jpg'), 0.92);
    console.log('quadro', t, (Date.now() - t0) + 'ms');
  }
}
if (mode === 'video') {
  const { execFileSync } = await import('node:child_process');
  const dir = path.join(ROOT, 'out', 'frames');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const FPS = 24, dur = await page.evaluate(() => window.DURATION), n = Math.round(dur * FPS);
  const from = Number(process.argv[3] || 0), to = Number(process.argv[4] || n);
  const t0 = Date.now();
  for (let i = from; i < to; i++) {
    await page.evaluate(t => window.renderAt(t), i / FPS);
    await grab(path.join(dir, 'f' + String(i).padStart(4, '0') + '.jpg'), 0.97);
    if (i % 24 === 0) console.log('quadro', i, '/', n, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  const out = path.join(ROOT, 'out', 'restaurante-miniatura-mudo.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-start_number', String(from), '-i', path.join(dir, 'f%04d.jpg'), '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  console.log('video', out, to - from, 'quadros', ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
await browser.close();
server.close();
