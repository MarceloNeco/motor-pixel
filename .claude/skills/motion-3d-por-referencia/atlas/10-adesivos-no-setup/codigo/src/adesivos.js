// adesivos.js — a arte dos adesivos, toda desenhada em canvas 2D e toda em português.
// Estilo medido na referência: cor chapada, contorno preto grosso nos ícones, borda branca
// de recorte ("die-cut"), leve grão de impressão e uma sombra fina que dá espessura ao vinil.
// Nenhum desenho, palavra ou marca vem da referência: os temas são nossos (envio, café, setup).

export const PAL = {
  red: '#cf2233', redDark: '#7d0f1c', yellow: '#f6c92b', blue: '#1c6fd0', blueDark: '#0f3f8a',
  lilac: '#b79be8', lilacLight: '#d9cbf6', lilacDark: '#8468cf', pink: '#f0627f', black: '#17171b',
  white: '#ffffff', cream: '#f5e8cb', brown: '#5a3620', teal: '#12a594', tealDark: '#0a6f64',
};

export function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const PAD = 44;
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.lineJoin = 'round'; x.lineCap = 'round'; return [c, x]; }

// base branca de recorte com a sombra fina do vinil. `path` traça a silhueta.
function diecut(x, path, border = 14, color = '#fff') {
  x.save();
  x.shadowColor = 'rgba(30,18,6,0.50)'; x.shadowBlur = 12; x.shadowOffsetY = 5; x.shadowOffsetX = 1;
  x.lineWidth = border * 2; x.strokeStyle = color; x.fillStyle = color;
  path(); x.stroke();
  x.shadowColor = 'transparent';
  path(); x.fill(); path(); x.stroke();
  x.restore();
}
// grão de impressão só onde já existe tinta
function grain(c, x, rand, amount = 0.05) {
  x.save(); x.globalCompositeOperation = 'source-atop';
  const n = Math.round(c.width * c.height / 26);
  for (let i = 0; i < n; i++) {
    const a = rand() * amount;
    x.fillStyle = rand() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    x.fillRect(rand() * c.width, rand() * c.height, 1 + rand() * 2.2, 1 + rand() * 2.2);
  }
  x.restore();
}
const rrect = (x, a, b, w, h, r) => { x.beginPath(); x.roundRect(a, b, w, h, r); };
const ell = (x, cx, cy, rx, ry, rot = 0) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); };
function text(x, s, cx, y, font, color, spacing = 0, stroke = null) {
  x.save(); x.font = font; x.letterSpacing = spacing + 'px'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  if (stroke) { x.strokeStyle = stroke.color; x.lineWidth = stroke.w; x.strokeText(s, cx + spacing / 2, y); }
  x.fillStyle = color; x.fillText(s, cx + spacing / 2, y); x.restore();
}

export const FONTES = [
  '400 100px Anton', '400 100px "Titan One"', '400 100px Shrikhand',
  '700 100px Archivo', '800 100px Archivo', 'italic 900 100px Archivo', 'italic 900 expanded 100px Archivo', '900 100px Archivo',
];

export function buildStickers(seed = 7) {
  const rand = mulberry32(seed), S = {};

  { // 1 · FRÁGIL (etiqueta de envio)
    const [c, x] = mk(1024, 480), p = () => rrect(x, PAD, PAD, 1024 - 2 * PAD, 480 - 2 * PAD, 8);
    diecut(x, p, 12); x.fillStyle = PAL.red; p(); x.fill();
    text(x, 'FRÁGIL', 512, 296, '400 214px Anton', '#fff', 20);
    text(x, 'MANUSEIE COM CUIDADO', 512, 378, '800 46px Archivo', '#fff', 10);
    grain(c, x, rand); S.fragil = c;
  }
  { // 2 · ESTE LADO PARA CIMA (etiqueta de envio)
    const [c, x] = mk(760, 800), p = () => rrect(x, PAD, PAD, 760 - 2 * PAD, 800 - 2 * PAD, 10);
    diecut(x, p, 12); x.fillStyle = '#fbfaf6'; p(); x.fill();
    x.strokeStyle = PAL.black; x.lineWidth = 12; rrect(x, PAD + 28, PAD + 28, 760 - 2 * PAD - 56, 800 - 2 * PAD - 56, 4); x.stroke();
    x.fillStyle = PAL.black;
    for (const cx of [262, 498]) {
      x.beginPath(); x.moveTo(cx, 128); x.lineTo(cx + 98, 262); x.lineTo(cx + 40, 262); x.lineTo(cx + 40, 418); x.lineTo(cx - 40, 418); x.lineTo(cx - 40, 262); x.lineTo(cx - 98, 262); x.closePath(); x.fill();
    }
    x.fillRect(150, 440, 460, 26);
    text(x, 'ESTE LADO', 380, 574, '400 104px Anton', PAL.black, 6);
    text(x, 'PARA CIMA', 380, 684, '400 104px Anton', PAL.black, 6);
    grain(c, x, rand, 0.035); S.ladoCima = c;
  }
  { // 3 · carinha piscando
    const [c, x] = mk(640, 640), cx = 320, cy = 320, p = () => ell(x, cx, cy, 252, 252);
    diecut(x, p, 14); x.fillStyle = PAL.yellow; p(); x.fill();
    x.strokeStyle = PAL.black; x.lineWidth = 17; ell(x, cx, cy, 243, 243); x.stroke();
    x.fillStyle = PAL.black; ell(x, cx - 82, cy - 58, 27, 46); x.fill();
    x.lineWidth = 20; x.beginPath(); x.moveTo(cx + 44, cy - 44); x.quadraticCurveTo(cx + 92, cy - 96, cx + 140, cy - 44); x.stroke();
    x.beginPath(); x.arc(cx, cy + 6, 150, Math.PI * 0.14, Math.PI * 0.86); x.stroke();
    x.lineWidth = 15;
    x.beginPath(); x.moveTo(cx - 152, cy + 58); x.lineTo(cx - 126, cy + 86); x.stroke();
    x.beginPath(); x.moveTo(cx + 152, cy + 58); x.lineTo(cx + 126, cy + 86); x.stroke();
    grain(c, x, rand); S.carinha = c;
  }
  { // 4 · BORA!
    const [c, x] = mk(920, 480), p = () => ell(x, 460, 240, 410, 190);
    diecut(x, p, 13); x.fillStyle = PAL.red; p(); x.fill();
    x.strokeStyle = PAL.redDark; x.lineWidth = 12; ell(x, 460, 240, 388, 168); x.stroke();
    x.save(); x.translate(460, 240); x.rotate(-0.07); x.transform(1, 0, -0.16, 1, 0, 0);
    text(x, 'BORA!', 0, 68, '400 196px "Titan One"', PAL.yellow, 4, { color: PAL.redDark, w: 22 });
    x.restore();
    grain(c, x, rand); S.bora = c;
  }
  { // 5 · FEITO NO BRASIL
    const [c, x] = mk(760, 620), p = () => rrect(x, PAD, PAD, 760 - 2 * PAD, 620 - 2 * PAD, 54);
    diecut(x, p, 13); x.fillStyle = PAL.blue; p(); x.fill();
    x.strokeStyle = PAL.yellow; x.lineWidth = 9; rrect(x, PAD + 24, PAD + 24, 760 - 2 * PAD - 48, 620 - 2 * PAD - 48, 34); x.stroke();
    x.fillStyle = PAL.yellow; x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 19 : 44; x.lineTo(380 + Math.cos(a) * r, 150 + Math.sin(a) * r); }
    x.closePath(); x.fill();
    text(x, 'FEITO NO', 380, 312, 'italic 900 expanded 80px Archivo', PAL.yellow, -1, { color: PAL.blueDark, w: 10 });
    text(x, 'BRASIL', 380, 452, 'italic 900 expanded 122px Archivo', PAL.yellow, -3, { color: PAL.blueDark, w: 12 });
    grain(c, x, rand); S.feitoBrasil = c;
  }
  { // 6 · NOTA 10
    const [c, x] = mk(760, 330), p = () => rrect(x, PAD, PAD, 760 - 2 * PAD, 330 - 2 * PAD, 5);
    diecut(x, p, 7); x.fillStyle = PAL.yellow; p(); x.fill();
    text(x, 'NOTA 10', 380, 214, 'italic 900 expanded 118px Archivo', PAL.black, -3);
    grain(c, x, rand); S.nota10 = c;
  }
  { // 7 · valeu. (palavra recortada)
    const [c, x] = mk(900, 420), f = '400 250px Shrikhand';
    x.save(); x.font = f; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.shadowColor = 'rgba(30,18,6,0.50)'; x.shadowBlur = 12; x.shadowOffsetY = 5;
    x.strokeStyle = '#fff'; x.lineWidth = 46; x.strokeText('valeu.', 450, 280);
    x.shadowColor = 'transparent'; x.strokeText('valeu.', 450, 280);
    x.fillStyle = PAL.black; x.fillText('valeu.', 450, 280); x.restore();
    grain(c, x, rand, 0.035); S.valeu = c;
  }
  { // 8 · ZERO BUG
    const [c, x] = mk(620, 620), p = () => ell(x, 310, 310, 248, 248);
    diecut(x, p, 9); x.fillStyle = PAL.pink; p(); x.fill();
    x.save(); x.translate(310, 310); x.rotate(-0.2);
    text(x, 'ZERO', 0, -14, '400 158px Anton', PAL.redDark, 8);
    text(x, 'BUG', 0, 140, '400 158px Anton', PAL.redDark, 8);
    x.restore();
    grain(c, x, rand); S.zeroBug = c;
  }
  { // 9 · planeta lilás
    const [c, x] = mk(800, 660), cx = 400, cy = 330, R = 196, rot = -0.33;
    const ring = (a0, a1) => { x.beginPath(); x.ellipse(cx, cy, 318, 92, rot, a0, a1); };
    diecut(x, () => { x.beginPath(); x.ellipse(cx, cy, R, R, 0, 0, Math.PI * 2); }, 15);
    x.save(); x.shadowColor = 'rgba(30,18,6,0.50)'; x.shadowBlur = 12; x.shadowOffsetY = 5;
    x.strokeStyle = '#fff'; x.lineWidth = 74; ring(0, Math.PI * 2); x.stroke(); x.restore();
    x.strokeStyle = '#fff'; x.lineWidth = 74; ring(0, Math.PI * 2); x.stroke();
    // anel de trás
    x.strokeStyle = PAL.black; x.lineWidth = 46; ring(Math.PI, Math.PI * 2); x.stroke();
    x.strokeStyle = PAL.lilacDark; x.lineWidth = 22; ring(Math.PI, Math.PI * 2); x.stroke();
    // corpo
    x.fillStyle = PAL.lilac; ell(x, cx, cy, R, R); x.fill();
    x.save(); ell(x, cx, cy, R, R); x.clip();
    x.fillStyle = PAL.lilacLight; ell(x, cx - 40, cy - 130, 260, 70, -0.25); x.fill();
    x.fillStyle = PAL.lilacDark; ell(x, cx + 60, cy + 150, 280, 62, -0.25); x.fill();
    x.fillStyle = PAL.lilacLight; ell(x, cx + 20, cy + 26, 250, 26, -0.25); x.fill();
    x.restore();
    x.strokeStyle = PAL.black; x.lineWidth = 16; ell(x, cx, cy, R, R); x.stroke();
    // anel da frente
    x.strokeStyle = PAL.black; x.lineWidth = 46; ring(0.06, Math.PI - 0.06); x.stroke();
    x.strokeStyle = PAL.lilacLight; x.lineWidth = 22; ring(0.06, Math.PI - 0.06); x.stroke();
    grain(c, x, rand); S.planeta = c;
  }
  { // 10 · raio
    const [c, x] = mk(600, 600), p = () => ell(x, 300, 300, 240, 240);
    diecut(x, p, 11); x.fillStyle = PAL.black; p(); x.fill();
    x.strokeStyle = PAL.yellow; x.lineWidth = 9; ell(x, 300, 300, 214, 214); x.stroke();
    x.fillStyle = PAL.yellow; x.beginPath();
    for (const [a, b] of [[38, -172], [-96, 30], [-4, 30], [-40, 174], [100, -42], [8, -42], [62, -172]]) x.lineTo(300 + a, 300 + b);
    x.closePath(); x.fill();
    grain(c, x, rand); S.raio = c;
  }
  { // 11 · MOVIDO A CAFÉ
    const [c, x] = mk(840, 640), p = () => ell(x, 420, 320, 372, 272);
    diecut(x, p, 12); x.fillStyle = PAL.cream; p(); x.fill();
    x.strokeStyle = PAL.brown; x.lineWidth = 10; ell(x, 420, 320, 350, 250); x.stroke();
    // xícara
    x.fillStyle = PAL.brown; x.strokeStyle = PAL.brown;
    x.beginPath(); x.moveTo(350, 168); x.lineTo(490, 168); x.lineTo(476, 246); x.quadraticCurveTo(470, 262, 452, 262); x.lineTo(388, 262); x.quadraticCurveTo(370, 262, 364, 246); x.closePath(); x.fill();
    x.lineWidth = 13; x.beginPath(); x.arc(497, 206, 25, -Math.PI * 0.45, Math.PI * 0.55); x.stroke();
    x.lineWidth = 9;
    for (const sx of [392, 420, 448]) { x.beginPath(); x.moveTo(sx, 150); x.bezierCurveTo(sx - 14, 132, sx + 14, 122, sx, 102); x.stroke(); }
    text(x, 'MOVIDO A', 420, 378, '400 80px Anton', PAL.brown, 7);
    text(x, 'CAFÉ', 420, 520, '400 150px Anton', PAL.brown, 12);
    grain(c, x, rand); S.cafe = c;
  }
  { // 12 · SÃO PAULO · CLUBE DOS CRIADORES
    const [c, x] = mk(920, 520), p = () => rrect(x, PAD, PAD, 920 - 2 * PAD, 520 - 2 * PAD, 6);
    diecut(x, p, 9); x.fillStyle = '#f3c22d'; p(); x.fill();
    x.strokeStyle = PAL.red; x.lineWidth = 13; rrect(x, PAD + 20, PAD + 20, 920 - 2 * PAD - 40, 520 - 2 * PAD - 40, 3); x.stroke();
    x.lineWidth = 4; rrect(x, PAD + 42, PAD + 42, 920 - 2 * PAD - 84, 520 - 2 * PAD - 84, 2); x.stroke();
    text(x, 'SÃO PAULO', 460, 300, '400 166px Anton', PAL.black, 8);
    text(x, 'CLUBE DOS CRIADORES', 460, 384, '800 45px Archivo', PAL.red, 9);
    grain(c, x, rand); S.saoPaulo = c;
  }
  { // 13 · Ctrl + S · SALVA TUDO
    const [c, x] = mk(860, 500), p = () => rrect(x, PAD, PAD, 860 - 2 * PAD, 500 - 2 * PAD, 46);
    diecut(x, p, 13); x.fillStyle = PAL.teal; p(); x.fill();
    const key = (kx, w, label) => {
      x.fillStyle = PAL.tealDark; rrect(x, kx, 122, w, 196, 26); x.fill();
      x.fillStyle = '#f7f5ef'; rrect(x, kx, 108, w, 190, 26); x.fill();
      x.strokeStyle = PAL.black; x.lineWidth = 9; rrect(x, kx, 108, w, 190, 26); x.stroke();
      text(x, label, kx + w / 2, 236, '800 82px Archivo', PAL.black, 0);
    };
    key(108, 290, 'Ctrl'); key(548, 204, 'S');
    text(x, '+', 473, 240, '900 104px Archivo', '#fff', 0);
    text(x, 'SALVA TUDO', 430, 404, '800 52px Archivo', '#fff', 12);
    grain(c, x, rand); S.ctrlS = c;
  }
  { // 14 · massa!
    const [c, x] = mk(940, 400), f = '400 214px "Titan One"';
    x.save(); x.translate(470, 200); x.rotate(-0.045); x.transform(1, 0, -0.14, 1, 0, 0);
    x.font = f; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.shadowColor = 'rgba(30,18,6,0.50)'; x.shadowBlur = 12; x.shadowOffsetY = 5;
    x.strokeStyle = '#fff'; x.lineWidth = 76; x.strokeText('massa!', 0, 70);
    x.shadowColor = 'transparent';
    x.strokeStyle = PAL.red; x.lineWidth = 52; x.strokeText('massa!', 0, 70);
    x.fillStyle = '#fff'; x.fillText('massa!', 0, 70); x.restore();
    grain(c, x, rand); S.massa = c;
  }
  { // 15 · cursor
    const [c, x] = mk(520, 640), k = 1.02, ox = 110, oy = 70;
    const p = () => { x.beginPath(); for (const [a, b] of [[0, 0], [0, 400], [98, 314], [168, 468], [240, 436], [172, 286], [300, 286]]) x.lineTo(ox + a * k, oy + b * k); x.closePath(); };
    diecut(x, p, 30); x.fillStyle = PAL.black; p(); x.fill();
    grain(c, x, rand, 0.03); S.cursor = c;
  }
  return S;
}

// Folha de conferência: todos os adesivos sobre papel kraft (usada pela prancha de identidade).
export function sheet(S) {
  const names = Object.keys(S), cols = 5, cell = 380, rows = Math.ceil(names.length / cols);
  const c = document.createElement('canvas'); c.width = cols * cell; c.height = rows * cell;
  const x = c.getContext('2d'); x.fillStyle = '#cfae82'; x.fillRect(0, 0, c.width, c.height);
  names.forEach((n, i) => {
    const s = S[n], k = Math.min(330 / s.width, 330 / s.height), w = s.width * k, h = s.height * k;
    x.drawImage(s, (i % cols) * cell + (cell - w) / 2, Math.floor(i / cols) * cell + (cell - h) / 2, w, h);
  });
  return c;
}
