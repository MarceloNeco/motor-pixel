/* sw-motor.js — para o service worker de qualquer app que usa o Motor Pixel (script clássico):
       importScripts('/motor-pixel/1.0/sw-motor.js');
       self.addEventListener('fetch', function (e) { if (MotorPixel.ehDoMotor(e.request)) return MotorPixel.responder(e); … });
   Entrega os arquivos do motor a partir da gaveta COMPARTILHADA "motor-pixel-<versão>" (a mesma para todos os
   apps do endereço), que o módulo offline preenche com guardarNoAparelho(). Sem internet, abre da gaveta;
   com internet, também abre da gaveta (rápido) e o que faltar vem da rede e fica guardado.
   Nunca procura nas gavetas dos apps. Escrito em JavaScript antigo (sem =>) para aparelhos velhos. */
var MotorPixel = (function () {
  'use strict';
  var PREFIXO = 'motor-pixel-';
  var PASTA = '/motor-pixel/';
  function ehDoMotor(req) {
    try { var u = new URL(req.url); return req.method === 'GET' && u.origin === self.location.origin && u.pathname.indexOf(PASTA) === 0; } catch (e) { return false; }
  }
  // a gaveta mais nova do motor (o nome tem a versão)
  function gaveta() {
    return caches.keys().then(function (ks) {
      var ms = ks.filter(function (k) { return k.indexOf(PREFIXO) === 0; }).sort();
      return ms.length ? ms[ms.length - 1] : null;
    });
  }
  function responder(e) {
    e.respondWith(gaveta().then(function (nome) {
      return nome ? caches.open(nome).then(function (c) { return c.match(e.request, { ignoreSearch: true }).then(function (r) { return { c: c, r: r }; }); }) : { c: null, r: null };
    }).then(function (x) {
      if (x.r) return x.r;
      return fetch(e.request).then(function (resp) {
        if (x.c && resp.status === 200) { var copia = resp.clone(); x.c.put(e.request, copia).catch(function () {}); }
        return resp;
      });
    }));
  }
  return { ehDoMotor: ehDoMotor, responder: responder };
})();
