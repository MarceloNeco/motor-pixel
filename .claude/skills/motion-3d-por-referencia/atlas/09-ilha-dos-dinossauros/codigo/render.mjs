// Renderiza a cena three.js com o Chrome sem janela.
//   node render.mjs dino trex [ta tb]        -> out/teste/dino-trex.jpg (quatro vistas de um dinossauro)
//   node render.mjs one trex t yaw tilt zoom -> out/teste/one-trex.jpg (uma vista em tela cheia)
//   node render.mjs cards [i j ...]          -> um JPG por momento-chave em cards/
//   node render.mjs at 1.5 6.25 ...          -> quadros avulsos em out/teste/
//   node render.mjs frames a b [c d ...]      -> só os quadros dos intervalos [a, b), em out/frames
//   node render.mjs video [resume]           -> out/ilha-dos-dinossauros.mp4 (resume continua um render interrompido)
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
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
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
let erros = 0;
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[pagina]', m.text()); });
page.on('pageerror', e => { erros++; console.log('[erro]', e.message, '\n', (e.stack || '').split('\n').slice(0, 6).join('\n')); });

const mode = process.argv[2] || 'cards';
const args = process.argv.slice(3);
const teste = path.join(ROOT, 'out', 'teste'); fs.mkdirSync(teste, { recursive: true });
const abrir = async url => {
  await page.goto(`http://127.0.0.1:${port}${url}`);
  try { await page.waitForFunction('window.ready === true', { timeout: 60000 }); }
  catch (e) { console.log('a página não ficou pronta (veja os erros acima)'); await browser.close(); server.close(); process.exit(1); }
};

if (mode === 'dino' || mode === 'one') {
  const name = args[0] || 'trex';
  await abrir(`/src/dino.html?d=${name}`);
  const canvas = await page.$('canvas');
  const nums = args.slice(1).map(Number);
  if (mode === 'dino') await page.evaluate((a, b) => window.renderDino(a, b), nums[0] ?? 0.5, nums[1] ?? 2.4);
  else await page.evaluate((...a) => window.renderOne(...a), ...nums);
  const sufixo = mode === 'one' && nums.length ? '-' + nums.join('_') : '';
  const out = path.join(teste, `${mode}-${name}${sufixo}.jpg`);
  await canvas.screenshot({ path: out, type: 'jpeg', quality: 90 });
  console.log(out);
} else {
  await abrir('/src/index.html');
  const canvas = await page.$('canvas');
  if (mode === 'cards') {
    const ids = await page.evaluate(() => window.KEYS.map(k => k.id));
    const only = args.map(Number);
    fs.mkdirSync(path.join(ROOT, 'cards'), { recursive: true });
    for (let i = 0; i < ids.length; i++) {
      if (only.length && !only.includes(i)) continue;
      await page.evaluate(i => window.renderKey(i), i);
      await canvas.screenshot({ path: path.join(ROOT, 'cards', ids[i] + '.jpg'), type: 'jpeg', quality: 93 });
      console.log('card', ids[i]);
    }
    console.log(await page.evaluate(() => window.gpuInfo));
  }
  if (mode === 'at') {
    for (const a of args) {
      const t = Number(a);
      await page.evaluate(t => window.renderAt(t), t);
      await canvas.screenshot({ path: path.join(teste, 't' + t.toFixed(2).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 88 });
    }
    console.log('cortes em', await page.evaluate(() => window.SHOTS));
  }
  if (mode === 'frames') {
    // node render.mjs frames 0 96 492 576 -> renderiza só os intervalos [a, b) em out/frames, sem apagar nem codificar
    const dir = path.join(ROOT, 'out', 'frames'); fs.mkdirSync(dir, { recursive: true });
    const nums = args.map(Number);
    for (let k = 0; k + 1 < nums.length; k += 2) for (let i = nums[k]; i < nums[k + 1]; i++) {
      await page.evaluate(t => window.renderAt(t), i / 24);
      await canvas.screenshot({ path: path.join(dir, 'f' + String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 97 });
      if (i % 48 === 0) console.log('quadro', i);
    }
  }
  if (mode === 'video') {
    const { execFileSync } = await import('node:child_process');
    const dir = path.join(ROOT, 'out', 'frames');
    const resume = args.includes('resume');   // node render.mjs video resume -> continua de onde parou
    if (!resume) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const FPS = 24, dur = await page.evaluate(() => window.DURATION), n = Math.round(dur * FPS);
    for (let i = 0; i < n; i++) {
      if (resume && fs.existsSync(path.join(dir, 'f' + String(i).padStart(4, '0') + '.jpg'))) continue;
      await page.evaluate(t => window.renderAt(t), i / FPS);
      await canvas.screenshot({ path: path.join(dir, 'f' + String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 97 });
      if (i % 96 === 0) console.log('quadro', i, '/', n);
    }
    const out = path.join(ROOT, 'out', 'ilha-dos-dinossauros.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.jpg'), '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('video', out, n, 'quadros');
  }
}
await browser.close();
server.close();
process.exit(erros ? 1 : 0);
