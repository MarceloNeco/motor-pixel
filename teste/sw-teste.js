// Service worker de teste: a página de teste fica numa gaveta própria; o motor vem da gaveta compartilhada (sw-motor.js).
importScripts('/motor-pixel/1.0/sw-motor.js');
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open('teste-pagina').then(function (c) { return c.add('pagina.html'); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  if (MotorPixel.ehDoMotor(e.request) && e.request.url.indexOf('/1.0/') > 0) return MotorPixel.responder(e);
  if (e.request.mode === 'navigate') e.respondWith(caches.open('teste-pagina').then(function (c) { return c.match('pagina.html'); }).then(function (r) { return r || fetch(e.request); }));
});
