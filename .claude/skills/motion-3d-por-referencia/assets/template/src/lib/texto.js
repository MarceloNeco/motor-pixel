// Texto em tela, desenhado em canvas 2D por cima do quadro pronto: sai nítido, com a fonte e os acentos certos, e não
// passa por desfoque, tom nem grão. (Texto que precisa morar no mundo 3D, pegando luz e perspectiva, é outro caso:
// CanvasTexture num plano, ou TextGeometry com a fonte convertida por scripts/fonte-typeface.py.)

// Carrega as fontes ANTES do primeiro quadro. Fonte chamada só pelo nome do sistema ("Avenir Next") funciona numa
// máquina e cai na reserva em outra; arquivo local (pasta fontes/ ou um pacote @fontsource do npm) funciona em todas.
//   await carregarFontes([{ familia: 'Inter', peso: 800, url: '/node_modules/@fontsource/inter/files/inter-latin-800-normal.woff2' }]);
// Outra família: `npm install @fontsource/montserrat` no projeto (os arquivos ficam em node_modules/@fontsource/<familia>/files/,
// no padrão <familia>-latin-<peso>-normal.woff2). Se o node_modules for um atalho para o de outro projeto, não instale nele:
// baixe com `npm pack @fontsource/<familia>` numa pasta temporária e copie os .woff2 para fontes/ (url: '/fontes/arquivo.woff2').
// O recorte "latin" cobre o português. Para comparar com uma referência, a fonte é parte do sistema de design: escolha a
// família mais próxima da medida (largura das letras, peso, espaçamento) e diga na perícia qual trocou por qual.
export async function carregarFontes(lista) {
  await Promise.all(lista.map(async f => {
    const face = new FontFace(f.familia, `url(${f.url})`, { weight: String(f.peso ?? 400), style: f.estilo ?? 'normal' });
    try { document.fonts.add(await face.load()); }
    catch (e) { console.error(`[cena] fonte não carregou: ${f.familia} ${f.peso ?? 400} (${f.url}). O texto sairia na fonte reserva.`); throw e; }
  }));
}

// Cria uma função texto(ctx, str, x, y, opções) presa a UMA família e a uma escala (S = fator de px do projeto).
// Duas famílias (título e apoio)? Crie duas: const titulo = criarTexto('Montserrat', S), apoio = criarTexto('Inter', S).
//   max: largura máxima em px. O corpo ENCOLHE para caber; palavra nunca sai do quadro nem é cortada.
// Devolve a largura desenhada, para alinhar o que vem depois.
export function criarTexto(familia, S = 1, corPadrao = '#111') {
  return function texto(ctx, str, x, y, { peso = 800, tam = 60, esp = 0, cor = corPadrao, alinha = 'left', alfa = 1, max = null, base = 'middle', italico = false } = {}) {
    if (alfa <= 0 || !str) return 0;
    let px = tam * S;
    const fonte = () => `${italico ? 'italic ' : ''}${peso} ${px}px ${familia}`;
    ctx.textAlign = alinha; ctx.textBaseline = base; ctx.letterSpacing = `${esp * S}px`; ctx.font = fonte();
    let l = ctx.measureText(str).width;
    if (max && l > max) { px *= max / l; ctx.font = fonte(); l = max; }
    ctx.globalAlpha = Math.min(1, alfa); ctx.fillStyle = cor; ctx.fillText(str, x, y); ctx.globalAlpha = 1;
    return l;
  };
}

// Quebra um texto em linhas que cabem em `max` px (para legendas e frases). Devolve o array de linhas.
export function quebrar(ctx, str, max) {
  const linhas = []; let atual = '';
  for (const p of str.split(/\s+/)) {
    const t = atual ? atual + ' ' + p : p;
    if (ctx.measureText(t).width > max && atual) { linhas.push(atual); atual = p; } else atual = t;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

// Zona segura: devolve a caixa onde texto e interface podem ficar. Vertical (Reels, Shorts) reserva mais em cima e embaixo.
export function zonaSegura(W, H) {
  const vertical = H > W, mx = W * (vertical ? 0.07 : 0.055), topo = H * (vertical ? 0.12 : 0.07), base = H * (vertical ? 0.15 : 0.07);
  return { x0: mx, x1: W - mx, y0: topo, y1: H - base, largura: W - 2 * mx, altura: H - topo - base };
}
