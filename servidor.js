/* Servidor mínimo para probar la app en local (solo Node, sin instalar nada).
   Uso: node servidor.js   →   http://localhost:8080 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = Number(process.env.PUERTO) || 8080;
const RAIZ = __dirname;
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8'
};

http.createServer(function (pet, res) {
  let ruta = decodeURIComponent(new URL(pet.url, 'http://x').pathname);
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.normalize(path.join(RAIZ, ruta));
  if (!archivo.startsWith(RAIZ + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(archivo, function (err, datos) {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(datos);
  });
}).listen(PUERTO, '127.0.0.1', function () {
  console.log('Demo en http://localhost:' + PUERTO);
  console.log('  Operario:   http://localhost:' + PUERTO + '/#operario');
  console.log('  Vigilante:  http://localhost:' + PUERTO + '/#vigilante');
  console.log('  Prevención: http://localhost:' + PUERTO + '/#prevencion');
});
