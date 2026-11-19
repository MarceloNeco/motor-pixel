/* Exemplo: service worker de um app que usa o Motor Pixel.
   - Os arquivos DO APP ficam na gaveta do app (com a versão no nome; a nova só vale quando chegou inteira).
   - Os arquivos DO MOTOR ficam na gaveta COMPARTILHADA "motor-pixel-<versão>", uma cópia só para todos os apps
     do endereço. Quem enche essa gaveta é a página, com:
         const { offline } = await Motor.usar('offline');
         await offline.guardarNoAparelho(['cena3d', 'personagens3d']);
     e quem entrega os arquivos dela (com ou sem internet) é o sw-motor.js abaixo. */
importScripts('/motor-pixel/1.0/sw-motor.js');

var VERSAO = '1.0.0';
var GAVETA = 'meu-app-' + VERSAO;
var ARQUIVOS = ['./', './index.html', './app.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(GAVETA).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('meu-app-') === 0 && k !== GAVETA; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (MotorPixel.ehDoMotor(e.request)) return MotorPixel.responder(e);   // motor: gaveta compartilhada
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(GAVETA).then(function (c) { return c.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }); })
    .then(function (r) { return r || fetch(e.request); }));
});
