// Sistema de design do filme: os números que vêm da perícia, num lugar só. A cena, a luz e cada peça importam daqui,
// então a peça revisada no banco já nasce com as cores e a luz do filme. TROCAR tudo pelos valores medidos.
export const DS = {
  fundo: ['#f7efe6', '#ead9cb'],            // centro → borda
  tinta: '#1d2b33', acento: '#f26a4b',
  pecas: ['#0f4a50', '#f4b89c', '#f3e7d8'],
  fonte: 'Inter',                           // arquivo local (ver carregarFontes no fim do main.js)
  heroi: [0, 0.8, 0],                       // onde o herói fica: a luz é montada em volta deste ponto
  chave: { cor: '#fff1e0', forca: 3.0, pos: [-4.5, 8.2, 5], raio: 0.9 },   // posição RELATIVA ao herói; raio = tamanho da fonte (penumbra)
  contra: { cor: '#d6ecff', forca: 1.2, pos: [5, 2.7, -6] },               // recorte frio por trás (relativa ao herói)
  ambiente: 0.85,                           // força do ambiente: é ele que decide o contraste (0,95 chapa · 0,55 modela)
  sombra: { cor: '#6b3a2c', opacidade: 0.4 },
  imagem: { tom: 'neutro', exposicao: 1.0, contraste: 1.04, saturacao: 1.0, vinheta: 0.10, grao: 0.012 },
};
