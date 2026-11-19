/* Motor Pixel — carregador de módulos sob demanda (exemplo de referência).
   Uso num app:
     import { Motor } from '/motor-pixel/1.0/motor.js';
     const { cena3d, personagens } = await Motor.usar('cena3d', 'personagens');
   Cada módulo é carregado uma vez só, com suas dependências antes. */

const BASE = new URL('./', import.meta.url);
const carregados = new Map();   // nome -> Promise do módulo
let manifesto = null;

async function lerManifesto() {
  if (!manifesto) {
    const resp = await fetch(new URL('manifesto.json', BASE));
    if (!resp.ok) throw new Error('Motor: manifesto não encontrado');
    manifesto = await resp.json();
  }
  return manifesto;
}

async function carregar(nome) {
  if (carregados.has(nome)) return carregados.get(nome);
  const promessa = (async () => {
    const m = await lerManifesto();
    const info = m.modulos[nome];
    if (!info) throw new Error(`Motor: módulo desconhecido "${nome}"`);
    for (const dep of info.depende || []) await carregar(dep);
    const modulo = await import(new URL(info.arquivo, BASE).href);
    if (typeof modulo.iniciar === 'function') await modulo.iniciar({ motor: Motor });
    return modulo;
  })();
  carregados.set(nome, promessa);
  return promessa;
}

export const Motor = {
  versao: '1.0.0',
  /** Carrega um ou mais módulos e devolve um objeto { nome: módulo }. */
  async usar(...nomes) {
    const lista = await Promise.all(nomes.map(carregar));
    return Object.fromEntries(nomes.map((n, i) => [n, lista[i]]));
  },
  /** Modo leve: aparelho fraco ou pedido do usuário. */
  modoLeve() { /* mesma regra do módulo nucleo */
    const pouca = (navigator.deviceMemory || 4) <= 2 || (navigator.hardwareConcurrency || 4) <= 2;
    const pediu = localStorage.getItem('motor.modoLeve') === '1';
    return pouca || pediu;
  },
};
