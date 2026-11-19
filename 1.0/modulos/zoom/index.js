/* Módulo zoom: pinça, arrastar e "zoom em uma parte" para desenhos SVG.
   Muda o viewBox, então o desenho fica sempre nítido. */
import { reduzirMovimento } from '../nucleo/index.js';

export function criarZoom(svg, { maximo = 6 } = {}) {
  const [x0, y0, w0, h0] = svg.getAttribute('viewBox').split(/[\s,]+/).map(Number);
  const original = { x: x0, y: y0, w: w0, h: h0 };
  let vb = { ...original };
  const aplicar = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const limitar = (w) => Math.min(original.w, Math.max(original.w / maximo, w));

  function animarPara(alvo, ms = 400) {
    if (reduzirMovimento()) { vb = { ...alvo }; aplicar(); return; }
    const de = { ...vb }, t0 = performance.now();
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / ms), s = k * k * (3 - 2 * k);
      for (const c of ['x', 'y', 'w', 'h']) vb[c] = de[c] + (alvo[c] - de[c]) * s;
      aplicar(); if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  // Pinça e arrastar
  svg.style.touchAction = 'none';
  const toques = new Map(); let base = null;
  const soltar = (e) => { toques.delete(e.pointerId); base = null; };
  svg.addEventListener('pointerdown', (e) => { toques.set(e.pointerId, e); base = null; });
  svg.addEventListener('pointerup', soltar);
  svg.addEventListener('pointercancel', soltar);
  svg.addEventListener('pointermove', (e) => {
    if (!toques.has(e.pointerId)) return;
    toques.set(e.pointerId, e);
    const pts = [...toques.values()];
    const cx = pts.reduce((a, p) => a + p.clientX, 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p.clientY, 0) / pts.length;
    const dist = pts.length > 1 ? Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY) : 0;
    if (!base) { base = { cx, cy, dist, vb: { ...vb } }; return; }
    const porPixel = base.vb.w / svg.clientWidth;
    const w = limitar(pts.length > 1 && base.dist && dist ? base.vb.w * (base.dist / dist) : base.vb.w);
    const k = w / base.vb.w, h = base.vb.h * k;
    vb = { w, h, x: base.vb.x + (base.vb.w - w) / 2 - (cx - base.cx) * porPixel, y: base.vb.y + (base.vb.h - h) / 2 - (cy - base.cy) * porPixel };
    aplicar();
  });
  // Roda do mouse (computador)
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const w = limitar(vb.w * (e.deltaY > 0 ? 1.15 : 0.87)), k = w / vb.w;
    vb = { x: vb.x + (vb.w - w) / 2, y: vb.y + (vb.h - vb.h * k) / 2, w, h: vb.h * k }; aplicar();
  }, { passive: false });

  return {
    /** Volta ao desenho inteiro. */
    ajustar: () => animarPara(original),
    /** Aproxima de uma parte pelo id (ex.: músculo, pegada, pino). */
    focar(id, margem = 0.25) {
      const el = svg.querySelector(`#${CSS.escape(id)}`); if (!el) return;
      const b = el.getBBox(), prop = original.h / original.w;
      const w = limitar(Math.max(b.width, b.height / prop) * (1 + margem * 2));
      animarPara({ x: b.x + b.width / 2 - w / 2, y: b.y + b.height / 2 - (w * prop) / 2, w, h: w * prop });
    },
  };
}
