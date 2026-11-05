/* Genera los iconos PNG de la app (los mismos dibujos que iconos/icono.svg).
   Hace falta PNG para instalarla en Android y para el icono del iPhone.
   Uso: node herramientas/generar-iconos.js */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MARINO = [0x1c, 0x35, 0x64], BLANCO = [255, 255, 255], VERDE = [0x0a, 0x8a, 0x3d];

function enRectRedondo(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const dx = Math.max(x0 + r - x, 0, x - (x1 - r));
  const dy = Math.max(y0 + r - y, 0, y - (y1 - r));
  return dx * dx + dy * dy <= r * r;
}

// Color del dibujo en un punto (coordenadas de 0 a 512).
function color(x, y) {
  let c = MARINO;
  if (enRectRedondo(x, y, 42, 136, 470, 376, 120) && !enRectRedondo(x, y, 70, 164, 442, 348, 92)) c = BLANCO;
  const d = Math.hypot(x - 256, y - 256);
  if (d <= 84) c = d >= 64 ? BLANCO : VERDE;
  if (x >= 200 && x <= 312 && y >= 108 && y <= 150) c = BLANCO;
  return c;
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
  const td = Buffer.concat([Buffer.from(tipo), datos]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([largo, td, crc]);
}

function png(lado) {
  const M = 4; // submuestras por lado para suavizar los bordes
  const filas = [];
  for (let py = 0; py < lado; py++) {
    const fila = Buffer.alloc(1 + lado * 3);
    for (let px = 0; px < lado; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < M; sy++) for (let sx = 0; sx < M; sx++) {
        const c = color(((px + (sx + 0.5) / M) / lado) * 512, ((py + (sy + 0.5) / M) / lado) * 512);
        r += c[0]; g += c[1]; b += c[2];
      }
      const i = 1 + px * 3;
      fila[i] = Math.round(r / (M * M)); fila[i + 1] = Math.round(g / (M * M)); fila[i + 2] = Math.round(b / (M * M));
    }
    filas.push(fila);
  }
  const cab = Buffer.alloc(13);
  cab.writeUInt32BE(lado, 0); cab.writeUInt32BE(lado, 4);
  cab[8] = 8; cab[9] = 2; // 8 bits, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', cab),
    trozo('IDAT', zlib.deflateSync(Buffer.concat(filas))),
    trozo('IEND', Buffer.alloc(0))
  ]);
}

const carpeta = path.join(__dirname, '..', 'iconos');
[180, 192, 512].forEach(function (lado) {
  fs.writeFileSync(path.join(carpeta, 'icono-' + lado + '.png'), png(lado));
  console.log('iconos/icono-' + lado + '.png');
});
