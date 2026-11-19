/* Módulo offline: o motor guardado UMA vez no aparelho e usado por todos os apps do mesmo endereço
   (gaveta compartilhada; regra "recursos compartilhados", SolverONE 16/11/2026).
   - listarArquivos('vetor','zoom'): os arquivos (módulos, dependências, bibliotecas) que esses módulos usam.
   - guardarNoAparelho('cena3d', …): baixa o que falta para a gaveta "motor-pixel-<versão>" e marca cada
     módulo como guardado só quando TODOS os arquivos dele chegaram inteiros. Gavetas de versões antigas
     são apagadas depois que a nova fica completa.
   - estaGuardado('cena3d', …): true se todos esses módulos já estão inteiros no aparelho.
   Para abrir sem internet, o service worker do app usa o sw-motor.js (importScripts), que entrega os
   arquivos do motor a partir dessa gaveta. Modelo em exemplos/sw-de-um-app.js. */

const BASE = new URL('../../', import.meta.url);
const PREFIXO = 'motor-pixel-';
let manifesto = null;

async function lerManifesto() {
  if (!manifesto) manifesto = await (await fetch(new URL('manifesto.json', BASE))).json();
  return manifesto;
}
function marca(nome) { return new URL(`__guardado__/${nome}`, BASE).href; }
export async function gaveta() { return PREFIXO + (await lerManifesto()).versao; }

function arquivosDe(m, nomes) {
  const vistos = new Set(), arquivos = new Set([new URL('motor.js', BASE).href, new URL('manifesto.json', BASE).href]);
  const visitar = (n) => {
    if (vistos.has(n)) return; vistos.add(n);
    const info = m.modulos[n]; if (!info) throw new Error(`Motor: módulo desconhecido "${n}"`);
    (info.depende || []).forEach(visitar);
    arquivos.add(new URL(info.arquivo, BASE).href);
    (info.libs || []).forEach((l) => arquivos.add(new URL(l, BASE).href));
  };
  nomes.forEach(visitar);
  return { arquivos: [...arquivos], modulos: [...vistos] };
}

/** Lista todos os arquivos (módulos, dependências e bibliotecas) dos módulos pedidos. */
export async function listarArquivos(...nomes) {
  return arquivosDe(await lerManifesto(), nomes).arquivos;
}

/** true se todos os módulos pedidos (e as dependências) já estão inteiros na gaveta compartilhada. */
export async function estaGuardado(...nomes) {
  if (typeof caches === 'undefined') return false;
  const m = await lerManifesto(), { modulos } = arquivosDe(m, nomes);
  if (!(await caches.has(PREFIXO + m.versao))) return false;
  const c = await caches.open(PREFIXO + m.versao);
  for (const n of modulos) if (!(await c.match(marca(n)))) return false;
  return true;
}

/** Guarda no aparelho os módulos pedidos. aoAndar(feitos, total) mostra o andamento. Devolve true se ficou tudo inteiro. */
export async function guardarNoAparelho(nomes, { aoAndar } = {}) {
  if (typeof caches === 'undefined') return false;
  const m = await lerManifesto(), { arquivos, modulos } = arquivosDe(m, [].concat(nomes));
  const c = await caches.open(PREFIXO + m.versao);
  let feitos = 0;
  for (const url of arquivos) {
    if (!(await c.match(url))) {
      const r = await fetch(url, { cache: 'reload' });
      if (r.status !== 200) return false;      // não chegou inteiro: nada é marcado como guardado
      await c.put(url, r);
    }
    feitos += 1; if (aoAndar) aoAndar(feitos, arquivos.length);
  }
  // cada módulo só fica marcado com todos os arquivos dele (e das dependências) no lugar
  for (const n of modulos) {
    const deste = arquivosDe(m, [n]).arquivos;
    let ok = true;
    for (const url of deste) if (!(await c.match(url))) { ok = false; break; }
    if (ok) await c.put(marca(n), new Response(m.versao));
  }
  // a versão nova está inteira: as gavetas de versões antigas saem
  for (const k of await caches.keys()) if (k.startsWith(PREFIXO) && k !== PREFIXO + m.versao) await caches.delete(k);
  return estaGuardado(...modulos);
}
