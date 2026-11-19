/* Módulo efeitos: "suco" em HTML/CSS puro (pulinho, tremer, brilhos, "+10"), para qualquer app.
   pulinho(el), tremer(el), brilhos(x, y), pontos(x, y, texto). Respeita "reduzir movimento". */

const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function pulinho(el) {
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }],
    { duration: 150, easing: 'ease-out' }
  );
}

export function tremer(el, forca = 3) {
  if (reduzir) return;
  const k = [];
  for (let i = 0; i < 6; i++) k.push({ transform: `translate(${(Math.random() - 0.5) * 2 * forca}px, ${(Math.random() - 0.5) * 2 * forca}px)` });
  k.push({ transform: 'translate(0,0)' });
  el.animate(k, { duration: 120 });
}

export function brilhos(x, y, quantos = 8, cor = '#F6C453') {
  const n = reduzir ? Math.ceil(quantos / 2) : quantos;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.textContent = '✦';
    s.setAttribute('aria-hidden', 'true');
    Object.assign(s.style, { position: 'fixed', left: `${x}px`, top: `${y}px`, color: cor,
      font: '700 18px system-ui', pointerEvents: 'none', zIndex: 9999 });
    document.body.append(s);
    const ang = (Math.PI * 2 * i) / n, d = 40 + Math.random() * 30;
    s.animate(
      [{ transform: 'translate(-50%,-50%) scale(0.6)', opacity: 1 },
       { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d}px)) scale(1.1)`, opacity: 0 }],
      { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' }
    ).onfinish = () => s.remove();
  }
}

export function pontos(x, y, texto = '+10') {
  const s = document.createElement('div');
  s.textContent = texto;
  Object.assign(s.style, { position: 'fixed', left: `${x}px`, top: `${y}px`, color: '#3D2352',
    font: '800 22px system-ui', textShadow: '0 2px 0 #fff', pointerEvents: 'none', zIndex: 9999 });
  document.body.append(s);
  s.animate(
    [{ transform: 'translate(-50%,0)', opacity: 1 }, { transform: 'translate(-50%,-40px)', opacity: 0 }],
    { duration: 700, easing: 'ease-out' }
  ).onfinish = () => s.remove();
}
