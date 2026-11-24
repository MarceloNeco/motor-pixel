// Texturas desenhadas em canvas. Nenhuma imagem de arquivo: tudo nasce aqui.
import * as THREE from 'three';
import { canvas, texFrom, rng, fbm3, clamp, noiseCanvas } from './util.js';

const FONT_ROUNDED = '"Arial Rounded MT Bold", "Arial Rounded MT", "Helvetica Neue", Arial, sans-serif';
export { FONT_ROUNDED };

// Asfalto: base escura com grão de agregado, remendos e fissuras finas.
export function asphalt() {
  const S = 1024; const [c, g] = canvas(S, S); const r = rng(11);
  g.fillStyle = '#3b3b3e'; g.fillRect(0, 0, S, S);
  const n = noiseCanvas(256, 2.2, 4, 3.1);
  g.globalAlpha = 0.22; g.globalCompositeOperation = 'multiply'; g.drawImage(n, 0, 0, S, S); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  // remendos mais escuros/claros
  for (let i = 0; i < 8; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(20,18,17,0.12)' : 'rgba(90,88,86,0.08)';
    const x = r() * S, y = r() * S, w = 60 + r() * 220, h = 40 + r() * 160;
    g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.2); g.fillRect(-w / 2, -h / 2, w, h); g.restore();
  }
  // agregado
  for (let i = 0; i < 42000; i++) {
    const v = 46 + r() * 90; g.fillStyle = `rgba(${v},${v * 0.97},${v * 0.93},${0.25 + r() * 0.5})`;
    const s = 0.6 + r() * 1.6; g.fillRect(r() * S, r() * S, s, s);
  }
  // fissuras
  g.strokeStyle = 'rgba(12,11,10,0.55)'; g.lineWidth = 1.2;
  for (let i = 0; i < 18; i++) {
    let x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 12; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); }
    g.stroke();
  }
  return texFrom(c, { repeat: [1, 1] });
}

// Máscara de poças / umidade (cinza, linear).
export function puddleMask() {
  const c = noiseCanvas(512, 1.6, 5, 7.7);
  const t = texFrom(c, { srgb: false, repeat: [1, 1] });
  return t;
}

// Calçada de pedras retangulares bege, assentadas desencontradas (como na referência).
export function sidewalk() {
  const S = 1024; const [c, g] = canvas(S, S); const r = rng(21);
  g.fillStyle = '#4e463c'; g.fillRect(0, 0, S, S);
  const rows = 6, cols = 4, ch = S / rows, cw = S / cols;
  for (let j = 0; j < rows; j++) for (let i = -1; i < cols + 1; i++) {
    const ox = (j % 2) * cw / 2; const v = 0.86 + r() * 0.2;
    g.fillStyle = `rgb(${186 * v},${168 * v},${140 * v})`;
    g.fillRect(i * cw + ox + 3, j * ch + 3, cw - 6, ch - 6);
    for (let k = 0; k < 6; k++) {
      const a = 0.02 + r() * 0.05;
      g.fillStyle = r() < 0.6 ? `rgba(50,40,28,${a})` : `rgba(255,246,228,${a * 0.7})`;
      g.beginPath(); g.ellipse(i * cw + ox + r() * cw, j * ch + r() * ch, 10 + r() * 50, 8 + r() * 36, r() * 3, 0, 7); g.fill();
    }
  }
  for (let i = 0; i < 30000; i++) {
    const v = r() < 0.5 ? 60 : 215; g.fillStyle = `rgba(${v},${v * 0.95},${v * 0.86},${0.04 + r() * 0.09})`;
    g.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  return texFrom(c, { repeat: [1, 1] });
}

// Terra fofa do terreno vazio.
export function dirt() {
  const S = 1024; const [c, g] = canvas(S, S); const r = rng(31);
  g.fillStyle = '#45301f'; g.fillRect(0, 0, S, S);
  const n = noiseCanvas(256, 3.0, 5, 1.3);
  g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.9; g.drawImage(n, 0, 0, S, S); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 9000; i++) {
    const dark = r() < 0.55; const s = 1 + r() * 5;
    g.fillStyle = dark ? `rgba(28,20,14,${0.3 + r() * 0.4})` : `rgba(${110 + r() * 40},${86 + r() * 26},${62 + r() * 18},${0.25 + r() * 0.4})`;
    g.beginPath(); g.ellipse(r() * S, r() * S, s, s * (0.6 + r() * 0.5), r() * 3, 0, 7); g.fill();
  }
  // pedrinhas
  for (let i = 0; i < 500; i++) {
    const v = 110 + r() * 80; g.fillStyle = `rgb(${v},${v * 0.92},${v * 0.82})`;
    g.beginPath(); g.ellipse(r() * S, r() * S, 1.5 + r() * 3, 1 + r() * 2.5, r() * 3, 0, 7); g.fill();
  }
  return texFrom(c, { repeat: [1, 1] });
}

// Tijolo à vista.
export function brick(seed = 41, base = [122, 58, 40]) {
  const S = 512; const [c, g] = canvas(S, S); const r = rng(seed);
  g.fillStyle = '#5a5049'; g.fillRect(0, 0, S, S);
  const bh = 16, bw = 46;
  for (let y = 0; y < S / bh; y++) for (let x = -1; x < S / bw + 1; x++) {
    const ox = (y % 2) * bw / 2; const k = 0.75 + r() * 0.4;
    g.fillStyle = `rgb(${base[0] * k},${base[1] * k},${base[2] * k})`;
    g.fillRect(x * bw + ox + 1.5, y * bh + 1.5, bw - 3, bh - 3);
  }
  return texFrom(c, { repeat: [1, 1] });
}

// Fachada de prédio de fundo: janelas acesas aleatórias (cor e emissivo).
export function facade(seed, { cols = 6, rows = 10, lit = 0.45, wall = '#3b2c25', warm = true } = {}) {
  const S = 512; const [c, g] = canvas(S, S * 2); const [ce, ge] = canvas(S, S * 2); const r = rng(seed);
  g.fillStyle = wall; g.fillRect(0, 0, S, S * 2); ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S * 2);
  const cw = S / cols, rh = (S * 2) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * cw + cw * 0.28, y = j * rh + rh * 0.25, w = cw * 0.44, h = rh * 0.5;
    const on = r() < lit;
    const tone = warm ? [255, 190 + r() * 40, 110 + r() * 50] : [200, 220, 255];
    g.fillStyle = on ? `rgb(${tone[0] * 0.9},${tone[1] * 0.8},${tone[2] * 0.7})` : '#191513'; if (on && r() < 0.3) { g.fillStyle = 'rgba(40,20,10,0.6)'; g.fillRect(x, y, w * 0.45, h); }
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + h, w, 4);
    if (on) { const k = 0.25 + r() * 0.55; ge.fillStyle = `rgb(${tone[0] * k},${tone[1] * k},${tone[2] * k})`; ge.fillRect(x, y, w, h); }
  }
  return [texFrom(c), texFrom(ce)];
}

// Texto em canvas (placas, bandeira, letreiros 2D).
export function textTex(lines, { w = 512, h = 256, bg = null, color = '#fff', font = FONT_ROUNDED, weight = 'bold', size = 90, stroke = null, strokeW = 0, lineGap = 1.0, align = 'center', padX = 0, shadow = null } = {}) {
  const [c, g] = canvas(w, h);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.textAlign = align; g.textBaseline = 'middle';
  g.font = `${weight} ${size}px ${font}`;
  const total = lines.length * size * lineGap;
  lines.forEach((ln, i) => {
    const y = h / 2 - total / 2 + size * lineGap * (i + 0.5);
    const x = align === 'center' ? w / 2 : padX;
    if (shadow) { g.fillStyle = shadow; g.fillText(ln, x + size * 0.05, y + size * 0.06); }
    if (stroke) { g.lineJoin = 'round'; g.strokeStyle = stroke; g.lineWidth = strokeW; g.strokeText(ln, x, y); }
    g.fillStyle = color; g.fillText(ln, x, y);
  });
  return texFrom(c);
}

// Interior do restaurante, visto pelo vidro: parede quente com quadros, prateleiras e luminárias.
export function interiorWall() {
  const W = 2048, H = 256; const [c, g] = canvas(W, H); const r = rng(51);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#ffe0a8'); gr.addColorStop(0.5, '#ffb860'); gr.addColorStop(0.51, '#c8562a'); gr.addColorStop(1, '#9a3a1a');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // azulejos no rodapé
  for (let x = 0; x < W; x += 18) for (let y = 145; y < H; y += 18) { g.fillStyle = (x / 18 + y / 18) % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'; g.fillRect(x, y, 17, 17); }
  // quadros e cardápios iluminados
  for (let i = 0; i < 22; i++) {
    const x = r() * W, w = 30 + r() * 60, h = 25 + r() * 35, y = 25 + r() * 50;
    g.fillStyle = r() < 0.5 ? '#2b1a12' : '#fff3d6'; g.fillRect(x, y, w, h);
    g.fillStyle = ['#d8352a', '#f2c14e', '#3a7d44', '#1d4e89'][Math.floor(r() * 4)]; g.fillRect(x + 4, y + 4, w - 8, h * 0.4);
  }
  return texFrom(c);
}

// Faixa de LED do ônibus / letreiro de destino
export function ledSign(text, color = '#5dff7a') {
  const [c, g] = canvas(256, 48); g.fillStyle = '#050805'; g.fillRect(0, 0, 256, 48);
  g.font = `bold 30px "DIN Condensed", "Arial Narrow", Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = color; g.fillText(text, 128, 26);
  return texFrom(c);
}

// Folhagem: pontilhado para quebrar a cor dos tufos (usado como bump)
export function speckle(seed = 61) {
  const S = 256; const [c, g] = canvas(S, S); const r = rng(seed);
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) { const v = Math.floor(r() * 255); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); }
  return texFrom(c, { srgb: false, repeat: [1, 1] });
}

// Lona listrada (guarda-sol / toldo)
export function stripes(a, b, n = 8) {
  const [c, g] = canvas(256, 64);
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect((i * 256) / n, 0, 256 / n + 1, 64); }
  return texFrom(c);
}
