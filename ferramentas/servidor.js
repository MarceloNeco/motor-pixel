// Servidor local para testes e ferramentas: serve a raiz deste repositório em /motor-pixel/ (como no GitHub Pages).
const http = require('http');
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.md': 'text/plain', '.txt': 'text/plain' };

function servidor(opcoes = {}) {
  return http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]);
    if (!p.startsWith('/motor-pixel/')) { r.writeHead(404); return r.end(); }
    p = p.slice('/motor-pixel/'.length); if (!p || p.endsWith('/')) p += 'index.html';
    if (opcoes.falhar && opcoes.falhar(p)) { r.writeHead(500); return r.end(); }
    const f = path.join(raiz, p);
    if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(r);
  });
}
async function abrir(opcoes) {
  const s = servidor(opcoes);
  await new Promise((ok) => s.listen(0, '127.0.0.1', ok));
  return { srv: s, base: 'http://127.0.0.1:' + s.address().port + '/motor-pixel/' };
}
module.exports = { servidor, abrir };
