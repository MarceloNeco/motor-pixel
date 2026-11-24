// Renderiza a cena three.js com o Chrome sem janela.
//   node render.mjs cards              -> um JPG por momento-chave em cards/
//   node render.mjs at 21.5 28 35      -> quadros avulsos em out/teste/
//   node render.mjs video              -> out/mascote-aventura-3d.mp4 (1600x1600, 30 fps)
// Variáveis: SS=3 (superamostragem), Q="world=1&front=1" (parâmetros extras da página), CHROME_PATH
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SIZE = 1600, FPS = 30;
const SS = process.env.SS || '2', Q = process.env.Q ? '&' + process.env.Q : '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };

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
  executablePath: CHROME, headless: true, protocolTimeout: 600000,
  args: [...(process.platform === 'darwin' ? ['--use-angle=metal'] : []), '--ignore-gpu-blocklist', '--enable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
});
const page = await browser.newPage();
await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 1 });
let errors = 0;
page.on('console', m => {
  if (m.type() === 'info') console.log('[cena]', m.text());
  if ((m.type() === 'error' || m.type() === 'warning') && !/favicon|404/.test(m.text())) { errors++; if (errors < 40) console.log('[pagina]', m.text().slice(0, 1500)); }
});
page.on('pageerror', e => { errors++; console.log('[erro]', e.message); });
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${port}/src/index.html?ss=${SS}${Q}`);
await page.waitForFunction('window.ready === true', { timeout: 180000 });
console.log('cena pronta em', ((Date.now() - t0) / 1000).toFixed(1), 's ·', await page.evaluate(() => window.gpuInfo));
const canvas = await page.$('canvas');
const opt = Object.fromEntries(new URLSearchParams(process.env.Q || ''));
const ropt = { world: opt.world === '1', front: opt.front === '1', noDof: opt.nodof === '1' };

const mode = process.argv[2] || 'cards';
if (mode === 'cards') {
  const ids = await page.evaluate(() => window.KEYS.map(k => k.id));
  const only = process.argv.slice(3).map(Number);
  fs.mkdirSync(path.join(ROOT, 'cards'), { recursive: true });
  for (let i = 0; i < ids.length; i++) {
    if (only.length && !only.includes(i)) continue;
    await page.evaluate(i => window.renderKey(i), i);
    await canvas.screenshot({ path: path.join(ROOT, 'cards', ids[i] + '.jpg'), type: 'jpeg', quality: 93 });
    console.log('card', ids[i]);
  }
}
if (mode === 'at') {
  const dir = path.join(ROOT, 'out', 'teste'); fs.mkdirSync(dir, { recursive: true });
  const suf = process.env.TAG ? '-' + process.env.TAG : '';
  for (const a of process.argv.slice(3)) {
    const t = Number(a), q = Date.now();
    await page.evaluate((t, o) => window.renderAt(t, o), t, ropt);
    await canvas.screenshot({ path: path.join(dir, 't' + t.toFixed(2).padStart(5, '0') + suf + '.jpg'), type: 'jpeg', quality: 90 });
    console.log('quadro', t, (Date.now() - q) + ' ms');
  }
}
if (mode === 'cam') {
  // câmera de teste: node render.mjs cam <nome> <t> px py pz lx ly lz [fov] [abertura]
  const dir = path.join(ROOT, 'out', 'teste'); fs.mkdirSync(dir, { recursive: true });
  const [name, t, px, py, pz, lx, ly, lz, fov, ap] = process.argv.slice(3);
  await page.evaluate((t, cam) => window.renderAt(t, { world: true, cam }), Number(t), { p: [px, py, pz].map(Number), l: [lx, ly, lz].map(Number), fov: Number(fov || 0), ap: Number(ap || 0) });
  await canvas.screenshot({ path: path.join(dir, 'cam-' + name + '.jpg'), type: 'jpeg', quality: 90 });
  console.log('cam', name);
}
if (mode === 'video') {
  const dir = path.join(ROOT, 'out', 'frames');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const dur = await page.evaluate(() => window.DURATION);
  const a = Number(process.argv[3] || 0), b = Number(process.argv[4] || dur), n0 = Math.round(a * FPS), n1 = Math.round(b * FPS), q = Date.now();
  for (let i = n0; i < n1; i++) {
    await page.evaluate(t => window.renderAt(t), i / FPS);
    await canvas.screenshot({ path: path.join(dir, 'f' + String(i - n0).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 97 });
    if ((i - n0) % 60 === 0) console.log('quadro', i - n0, '/', n1 - n0, ((Date.now() - q) / 1000).toFixed(0) + ' s');
  }
  const out = path.join(ROOT, 'out', (process.env.NAME || 'mascote-aventura-3d') + '.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.jpg'), '-c:v', 'libx264', '-crf', process.env.CRF || '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  if (!process.env.KEEP) fs.rmSync(dir, { recursive: true, force: true });
  console.log('video', out, n1 - n0, 'quadros');
}
if (errors) console.log('avisos/erros da página:', errors);
await browser.close();
server.close();
