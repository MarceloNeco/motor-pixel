// Renderiza a cena three.js com o Chrome sem janela.
//   node render.mjs cards                 -> um JPG por momento-chave em cards/
//   node render.mjs cards 3 5             -> só os cards 3 e 5
//   node render.mjs at 2.5 6.1            -> quadros avulsos em out/teste/
//   node render.mjs video                 -> out/natureza-retoma-<objeto>.mp4 (com o fundo em degradê)
//   node render.mjs video --alpha         -> out/natureza-retoma-<objeto>-alpha.mov (ProRes 4444, fundo transparente)
// Opções: --obj=controle   --q="exp=1.1&env=0.8" (parâmetros extras da página)   --sufixo=nome
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true]; }));
const rest = args.filter(a => !a.startsWith('--'));
const mode = rest[0] || 'cards';
const OBJ = flags.obj || 'controle';
const ALPHA = !!flags.alpha;
const SUF = flags.sufixo ? '-' + flags.sufixo : '';

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/favicon.ico') { res.writeHead(204); res.end(); return; }
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
if (flags.verbose) console.log('chrome aberto');
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[pagina]', m.text()); });
page.on('pageerror', e => console.log('[erro]', e.message));
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${port}/src/index.html?obj=${OBJ}${ALPHA ? '&alpha' : ''}${flags.q ? '&' + flags.q : ''}`);
if (flags.verbose) console.log('pagina carregada, montando a cena');
await page.waitForFunction('window.ready === true', { timeout: 180000 });
console.log('cena pronta em', ((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(await page.evaluate(() => window.info)));
const palco = await page.$('#palco');
const shot = (file, quality) => ALPHA
  ? palco.screenshot({ path: file.replace(/\.jpg$/, '.png'), type: 'png', omitBackground: true })
  : palco.screenshot({ path: file, type: 'jpeg', quality });

if (mode === 'cards') {
  const ids = await page.evaluate(() => window.KEYS.map(k => k.id));
  const only = rest.slice(1).map(Number);
  const dir = path.join(ROOT, 'cards', OBJ + SUF);
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < ids.length; i++) {
    if (only.length && !only.includes(i)) continue;
    await page.evaluate(i => window.renderKey(i), i);
    await shot(path.join(dir, ids[i] + '.jpg'), 93);
    console.log('card', ids[i]);
  }
  console.log(await page.evaluate(() => window.gpuInfo));
}
if (mode === 'at') {
  const dir = path.join(ROOT, 'out', 'teste');
  fs.mkdirSync(dir, { recursive: true });
  for (const a of rest.slice(1)) {
    const t = Number(a);
    await page.evaluate(t => window.renderAt(t), t);
    await shot(path.join(dir, OBJ + SUF + '-t' + t.toFixed(2).padStart(5, '0') + '.jpg'), 90);
  }
}
if (mode === 'video') {
  const { execFileSync } = await import('node:child_process');
  const dir = path.join(ROOT, 'out', 'frames-' + OBJ + (ALPHA ? '-alpha' : ''));
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const FPS = 30, dur = await page.evaluate(() => window.DURATION), n = Math.round(dur * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.renderAt(t), i / FPS);
    await shot(path.join(dir, 'f' + String(i).padStart(4, '0') + '.jpg'), 96);
    if (i % 30 === 0) console.log('quadro', i, '/', n);
  }
  const base = path.join(ROOT, 'out', 'natureza-retoma-' + OBJ + SUF);
  if (ALPHA) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0', base + '-alpha.mov']);
    console.log('video', base + '-alpha.mov', n, 'quadros');
  } else {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.jpg'), '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', base + '.mp4']);
    console.log('video', base + '.mp4', n, 'quadros');
  }
  fs.rmSync(dir, { recursive: true, force: true });
}
await browser.close();
server.close();
