// O fotógrafo: abre a cena three.js no Chrome sem janela, chama renderAt(t) e junta os quadros com o ffmpeg.
//
//   node render.mjs cards [id ...]        um JPG por momento-chave em cards/
//   node render.mjs at 0.5 2.3            quadros avulsos em out/teste/ (a pasta é limpa a cada chamada; --manter acumula)
//   node render.mjs folha [--cada=0.25]   quadros pequenos e rápidos em out/folha/ (para a folha de revisão)
//   node render.mjs peca NOME [--t=0.5]   uma peça de src/pecas/NOME.js sozinha, em quatro vistas → out/pecas/NOME.jpg
//        [--luz=filme] sob a luz do filme (src/luz.js)   [--ref=pericia/recortes/NOME.jpg] com o recorte da referência ao lado
//   node render.mjs video                 out/<nome>.mp4   (com --q=rascunho ou --w, sai em out/<nome>-rascunho.mp4)
//   node render.mjs video --alfa          out/<nome>-alfa.mov (ProRes 4444 com transparência)
//   node render.mjs video --de=3 --ate=5  só um trecho (segundos), em out/<nome>-trecho.mp4
//   node render.mjs determinismo          prova que renderAt(t) não depende da ordem dos quadros
//
// Opções: --q=rascunho|final   --w=1280 (largura; a altura segue o formato)   --p="a=1&b=2" (parâmetros da página)
//         --cam=az,el,dist,x,y,z,fov (câmera de inspeção)   --png (quadros sem perda)   --manter (não apaga os quadros)
//         --continuar (retoma um vídeo interrompido: pula os quadros que já estão em disco)
//         --paralelo=N (várias páginas ao mesmo tempo; padrão 1, porque medido não acelera: a placa de vídeo é o limite)
// Formato, fps e nome vêm de motion.json. A duração vem da cena (window.DURATION).
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'motion.json'), 'utf8'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true]; }));
const rest = args.filter(a => !a.startsWith('--'));
const mode = rest[0] || 'cards';
const ALFA = !!flags.alfa;
const FPS = Number(CFG.fps || 30);

// tamanho: o de motion.json, ou reescalado por --w (mantendo o formato). Sempre par, por causa do yuv420p.
const par = n => Math.round(n / 2) * 2;
const escala = flags.w ? Number(flags.w) / CFG.largura : (mode === 'folha' ? 640 / CFG.largura : 1);
const W = par(CFG.largura * escala), H = par(CFG.altura * escala);
const Q = flags.q || (mode === 'folha' ? 'rascunho' : 'final');

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  const file = path.join(ROOT, rel);
  if (!(file + path.sep).startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

// Qualquer navegador da família Chromium serve. No Windows, o Edge já vem instalado e entra como reserva.
const WIN = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
const CHROME = [process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ...WIN.map(d => path.join(d, 'Google', 'Chrome', 'Application', 'chrome.exe')),
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ...WIN.map(d => path.join(d, 'Microsoft', 'Edge', 'Application', 'msedge.exe')),
].find(p => p && fs.existsSync(p));
if (!CHROME) { console.error('Navegador não encontrado. Instale o Google Chrome (ou o Edge) ou defina CHROME_PATH com o caminho do executável.'); process.exit(1); }

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  protocolTimeout: 600000,
  args: [...(process.platform === 'darwin' ? ['--use-angle=metal'] : []), '--ignore-gpu-blocklist', '--enable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--disable-gpu-watchdog', '--disable-features=CalculateNativeWinOcclusion'],
});
let falhou = false;
const sair = async (cod = 0) => { await browser.close().catch(() => {}); server.close(); process.exit(cod); };
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
// o tipo do aviso mudou de 'warning' para 'warn' entre versões do puppeteer: aceite os dois, senão os avisos do three somem
page.on('console', m => { const t = m.type(); if (t === 'error' || t === 'warning' || t === 'warn' || m.text().startsWith('[cena]')) console.log('[página]', m.text()); });
page.on('pageerror', e => { falhou = true; console.log('[erro na página]', e.message); });

const t0 = Date.now();
const PECA = mode === 'peca';
if (PECA && !rest[1]) { console.error('uso: node render.mjs peca NOME   (o arquivo é src/pecas/NOME.js)'); await sair(1); }
const url = PECA
  ? `http://127.0.0.1:${port}/src/banco.html?peca=${rest[1]}&w=${flags.w ? W : 1920}&h=${flags.w ? Math.round(W * 9 / 16) : 1080}&q=${Q}${flags.t ? '&t=' + flags.t : ''}${flags.fundo ? '&fundo=' + flags.fundo : ''}${flags.luz ? '&luz=' + flags.luz : ''}${flags.ref ? '&ref=/' + flags.ref : ''}${flags.p ? '&' + flags.p : ''}`
  : `http://127.0.0.1:${port}/src/index.html?w=${W}&h=${H}&fps=${FPS}&q=${Q}${ALFA ? '&alfa=1' : ''}${flags.cam ? '&cam=' + flags.cam : ''}${flags.p ? '&' + flags.p : ''}`;
if (PECA) await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(url);
try { await page.waitForFunction('window.ready === true', { timeout: 180000 }); }
catch { console.error('A cena não ficou pronta (window.ready). Veja os erros acima; abra', url, 'no navegador para depurar.'); await sair(1); }
const gpu = await page.evaluate(() => window.gpuInfo);
console.log(`cena pronta em ${((Date.now() - t0) / 1000).toFixed(1)}s · ${W}×${H} · ${FPS} fps · qualidade ${Q} · ${gpu}`);
if (/swiftshader|llvmpipe|software/i.test(gpu || '')) console.log('AVISO: o Chrome está renderizando por software (sem placa de vídeo). O render vai ficar muito lento e as sombras podem sair diferentes.');

const DUR = await page.evaluate(() => window.DURATION);
const PNG = ALFA || !!flags.png, EXT = PNG ? 'png' : 'jpg';
async function quadro(t) { return page.evaluate((t, png, q) => { window.renderAt(t); return window.grab(q, png ? 'png' : 'jpeg'); }, t, PNG, 0.97); }
async function salvar(t, file) { fs.writeFileSync(file, Buffer.from(await quadro(t), 'base64')); }
const nomeT = t => 't' + t.toFixed(2).padStart(6, '0');
function ffmpeg(args) {
  try { execFileSync('ffmpeg', args, { stdio: ['ignore', 'inherit', 'inherit'] }); }
  catch (e) { console.error(e.code === 'ENOENT' ? 'ffmpeg não encontrado. Instale (Mac: brew install ffmpeg · Windows: winget install Gyan.FFmpeg) e abra um terminal novo.' : 'o ffmpeg falhou ao juntar os quadros (eles ficaram em out/frames).'); process.exit(1); }
}

if (mode === 'peca') {
  const dir = path.join(ROOT, 'out', 'pecas'); fs.mkdirSync(dir, { recursive: true });
  const arq = path.join(dir, `${rest[1]}${flags.t ? '-t' + flags.t : ''}.jpg`);
  fs.writeFileSync(arq, Buffer.from(await page.evaluate(t => { window.renderAt(t); return window.grab(0.93, 'jpeg'); }, Number(flags.t || 0)), 'base64'));
  console.log('peça', path.relative(ROOT, arq));
}

if (mode === 'cards') {
  const keys = await page.evaluate(() => window.KEYS);
  const only = rest.slice(1);
  const dir = path.join(ROOT, 'cards'); fs.mkdirSync(dir, { recursive: true });
  for (const k of keys) {
    if (only.length && !only.includes(k.id)) continue;
    await salvar(k.t, path.join(dir, `${k.id}.${EXT}`));
    console.log('card', k.id, k.t + 's');
  }
}

if (mode === 'at') {
  const dir = path.join(ROOT, 'out', 'teste');
  if (!flags.manter) fs.rmSync(dir, { recursive: true, force: true });      // só os quadros desta chamada (a folha junta a pasta inteira)
  fs.mkdirSync(dir, { recursive: true });
  for (const a of rest.slice(1)) {
    const t = Number(a), ti = Date.now();
    await salvar(t, path.join(dir, `${nomeT(t)}.${EXT}`));
    console.log('quadro', t, (Date.now() - ti) + 'ms');
  }
}

if (mode === 'folha') {
  const cada = Number(flags.cada || 0.25);
  const dir = path.join(ROOT, 'out', 'folha'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for (let t = 0; t < DUR - 1e-6; t += cada) await salvar(t, path.join(dir, `${nomeT(t)}.${EXT}`));
  console.log('folha:', Math.ceil(DUR / cada), 'quadros em out/folha/ · monte com: python3 <skill>/scripts/folha.py out/folha --saida out/folha.jpg');
}

if (mode === 'determinismo') {
  // Mesma cena, mesmos instantes, ordens diferentes. Se o resultado muda, existe estado acumulado em algum lugar.
  const ts = [0.37, 0.71, 0.13, 0.93, 0.5].map(f => Math.round(f * DUR * FPS) / FPS);
  const a = []; for (const t of ts) a.push(await quadro(t));
  const b = []; for (const t of [...ts].reverse()) b.unshift(await quadro(t));
  const ruins = ts.filter((_, i) => a[i] !== b[i]);
  if (ruins.length) { console.log('REPROVADO: estes instantes mudam conforme a ordem em que são renderizados:', ruins.join(', '), '\nProcure estado acumulado: Math.random sem semente, Date/performance.now, clock.getDelta, += dentro de renderAt, física em passos.'); falhou = true; }
  else console.log('ok: os', ts.length, 'instantes saem idênticos em qualquer ordem.');
}

if (mode === 'video') {
  const faltam = await page.evaluate(() => window.FALTAM || []);
  if (faltam.length && Q === 'final' && !flags.w && !flags.de && !flags.ate && !flags['com-substitutos']) {
    console.error('Render final recusado: ainda há substituto no lugar de ' + faltam.join(', ') + '. Termine as peças (ou use --com-substitutos).');
    await sair(1);
  }
  const de = Math.round(Number(flags.de || 0) * FPS), ate = Math.round(Number(flags.ate || DUR) * FPS), n = ate - de;
  // rascunho e trecho nunca gravam por cima do filme final
  const trecho = (flags.de || flags.ate ? '-trecho' : '') + (Q !== 'final' || flags.w ? '-rascunho' : '');
  const dir = path.join(ROOT, 'out', 'frames' + (ALFA ? '-alfa' : '')); if (!flags.continuar) fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const tv = Date.now();
  // --paralelo=N abre N páginas e reparte os quadros entre elas. Padrão 1: MEDIDO numa cena pesada (64 subquadros,
  // sombra de 4096), 30 quadros levaram 49 s com 1 página, 51 com 2, 53 com 3 e 58 com 4. Quem limita é a placa de
  // vídeo, que as páginas dividem; abrir mais páginas não acelera. O que acelera é menos trabalho por quadro
  // (subquadros só onde há movimento, mapa de sombra menor) e renderizar o final uma vez só.
  const NP = Math.max(1, Math.min(8, Number(flags.paralelo || 1)));
  const paginas = [page];
  for (let k = 1; k < NP; k++) {
    const pg = await browser.newPage();
    await pg.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    pg.on('pageerror', e => { falhou = true; console.log('[erro na página]', e.message); });
    await pg.goto(url); await pg.waitForFunction('window.ready === true', { timeout: 180000 });
    paginas.push(pg);
  }
  const fila = [];
  for (let i = de; i < ate; i++) {
    const arq = path.join(dir, 'f' + String(i).padStart(5, '0') + '.' + EXT);
    if (!(flags.continuar && fs.existsSync(arq) && fs.statSync(arq).size > 0)) fila.push([i, arq]);
  }
  let prox = 0, feitos = 0;
  await Promise.all(paginas.map(async pg => {
    while (prox < fila.length && !falhou) {
      const [i, arq] = fila[prox++];
      const b64 = await pg.evaluate((t, png, q) => { window.renderAt(t); return window.grab(q, png ? 'png' : 'jpeg'); }, i / FPS, PNG, 0.97);
      fs.writeFileSync(arq, Buffer.from(b64, 'base64'));
      if (++feitos % FPS === 0) { const s = (Date.now() - tv) / 1000; console.log(`quadro ${feitos}/${fila.length} · ${s.toFixed(0)}s · faltam ~${((fila.length - feitos) * s / feitos).toFixed(0)}s${NP > 1 ? ` · ${NP} páginas` : ''}`); }
    }
  }));
  if (falhou) { console.error('Erro na página durante o render; parei.'); await sair(1); }
  const entrada = ['-v', 'error', '-y', '-framerate', String(FPS), '-start_number', String(de), '-i', path.join(dir, `f%05d.${EXT}`)];
  let out;
  if (ALFA) {
    out = path.join(ROOT, 'out', `${CFG.nome}${trecho}-alfa.mov`);
    ffmpeg([...entrada, '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0', out]);
  } else {
    out = path.join(ROOT, 'out', `${CFG.nome}${trecho}.mp4`);
    // Os quadros JPEG vêm em BT.601 de faixa cheia. Sem conversão, o ffmpeg grava o MP4 marcado como BT.601 faixa cheia,
    // que editores e players de HD costumam ler como BT.709 faixa de vídeo (a imagem lava e os saturados deslocam).
    // Converte para BT.709 faixa de vídeo e marca o arquivo. As flags de arredondamento importam: sem elas a imagem
    // escurece uns 2 níveis (medido); com elas o erro fica abaixo de 1 nível em 255.
    const marca = ',setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv';   // sem isto, primárias e curva saem "unknown" no arquivo
    const conv = (PNG ? 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int'
      : 'scale=in_color_matrix=bt601:in_range=full:out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int+full_chroma_inp') + marca;
    ffmpeg([...entrada, '-vf', conv, '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart', out]);
  }
  if (!flags.manter && !flags.continuar) fs.rmSync(dir, { recursive: true, force: true });
  console.log('vídeo', path.relative(ROOT, out), '·', n, 'quadros ·', ((Date.now() - tv) / 1000).toFixed(0) + 's');
}

await sair(falhou ? 1 : 0);
