/* Service worker: permite instalar la app y abrirla sin conexión.
   Primero intenta la red (así siempre se ve lo último) y si no hay, usa la copia guardada. */
var CACHE = 'permiso-ec-v1';
var ARCHIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/estilos.css',
  'js/config.js', 'js/util.js', 'js/datos-demo.js', 'js/iconos.js', 'js/turnos.js', 'js/reglas.js',
  'js/permisos.js', 'js/almacen-local.js', 'js/almacen-firebase.js', 'js/almacen.js', 'js/vistas.js', 'js/camara.js', 'js/sonido.js',
  'js/firma.js', 'js/app.js', 'js/inicio.js', 'js/operario.js', 'js/vigilante.js', 'js/prevencion.js',
  'iconos/icono.svg', 'iconos/icono-180.png', 'iconos/icono-192.png', 'iconos/icono-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      if (r.ok) {
        var copia = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      }
      return r;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || Response.error(); });
    })
  );
});
