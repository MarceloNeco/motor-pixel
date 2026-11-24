// Renderiza a cena three.js com o Chrome sem janela.
//   node render.mjs cards              -> um JPG por momento-chave em cards/
//   node render.mjs at 3.0 6.5         -> quadros avulsos desses instantes em out/teste/
//   node render.mjs view 30 2.6 2.2 2.2 [fov]  -> vista parada (azimute, raio, altura, altura do alvo) em out/vistas/
//   node render.mjs video              -> out/poste-de-placas.mp4
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end('404'); return; }
  file = fs.realpathSync(file);
  if (fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('404'); return; }
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
await page.waitForFunction('window.ready === true', { timeout: 120000 });
const canvas = await page.$('#out');
const mode = process.argv[2] || 'cards';
const t0 = Date.now();

if (mode === 'cards') {
  const keys = await page.evaluate(() => window.KEYS);
  const only = process.argv.slice(3).map(Number);
  fs.mkdirSync(path.join(ROOT, 'cards'), { recursive: true });
  for (let i = 0; i < keys.length; i++) {
    if (only.length && !only.includes(i + 1)) continue;
    await page.evaluate(t => window.renderAt(t), keys[i].t);
    await canvas.screenshot({ path: path.join(ROOT, 'cards', keys[i].id + '.jpg'), type: 'jpeg', quality: 93 });
    console.log('card', keys[i].id, keys[i].t + 's');
  }
  console.log(await page.evaluate(() => window.gpuInfo));
}
if (mode === 'at') {
  fs.mkdirSync(path.join(ROOT, 'out', 'teste'), { recursive: true });
  for (const a of process.argv.slice(3)) {
    const t = Number(a);
    const n = await page.evaluate(t => window.renderAt(t), t);
    await canvas.screenshot({ path: path.join(ROOT, 'out', 'teste', 't' + t.toFixed(2).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 90 });
    console.log('t', t, 'amostras', n);
  }
}
if (mode === 'view') {
  fs.mkdirSync(path.join(ROOT, 'out', 'vistas'), { recursive: true });
  const [az, r, h, ty, fov] = process.argv.slice(3).map(Number);
  await page.evaluate(v => window.renderView(v), { az, r, h, ty, fov: fov || 60 });
  const name = `az${String(az).padStart(3, '0')}-r${r}-h${h}.jpg`;
  await canvas.screenshot({ path: path.join(ROOT, 'out', 'vistas', name), type: 'jpeg', quality: 90 });
  console.log('vista', name);
}
if (mode === 'video') {
  const { execFileSync } = await import('node:child_process');
  const dir = path.join(ROOT, 'out', 'frames');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const FPS = 30, dur = await page.evaluate(() => window.DURATION), n = Math.round(dur * FPS);
  let amostras = 0;
  for (let i = 0; i < n; i++) {
    amostras += await page.evaluate(t => window.renderAt(t), i / FPS);
    await canvas.screenshot({ path: path.join(dir, 'f' + String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 97 });
    if (i % 30 === 0) console.log('quadro', i, '/', n, '·', Math.round((Date.now() - t0) / 1000) + 's');
  }
  const out = path.join(ROOT, 'out', 'poste-de-placas.mp4');
  // os JPGs saem em faixa cheia (BT.601); o vídeo vai em BT.709 de faixa limitada, o padrão de YouTube e editores
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.jpg'),
    '-vf', 'scale=in_color_matrix=bt601:in_range=full:out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('video', out, n, 'quadros,', amostras, 'amostras de desfoque');
}
console.log('tempo', Math.round((Date.now() - t0) / 1000) + 's');
await browser.close();
server.close();
