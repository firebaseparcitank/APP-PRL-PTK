/* Firma con el dedo (también vale ratón o lápiz): un recuadro grande con BORRAR y ACEPTAR.
   La firma se guarda como una imagen pequeña (PNG de 360 × 120, unos pocos KB) dentro del permiso.
   - EC.firma.crear(caja, {textoAceptar, alAceptar(img)}) monta el recuadro dentro de un elemento.
   - EC.firma.pedir({titulo, cuerpo, texto, boton}) abre una ventana con el recuadro;
     devuelve una promesa con la imagen, o null si se cancela. */
EC.firma = (function () {
  var u = EC.util;
  var ANCHO = 360, ALTO = 120, MARGEN = 8;
  var MINIMO = 30; // trazo mínimo (en píxeles) para que cuente como firma y no como un toque sin querer

  function crear(caja, opciones) {
    opciones = opciones || {};
    caja.innerHTML =
      '<div class="firma">' +
        '<div class="firma__marco">' +
          '<canvas class="firma__lienzo" role="img" aria-label="Recuadro para firmar con el dedo"></canvas>' +
          '<p class="firma__pista" aria-hidden="true">Firma aquí con el dedo</p>' +
        '</div>' +
        '<div class="firma__botones">' +
          '<button type="button" class="boton boton--neutro" data-firma="borrar">BORRAR</button>' +
          '<button type="button" class="boton boton--si" data-firma="aceptar" disabled>' + u.esc(opciones.textoAceptar || 'ACEPTAR') + '</button>' +
        '</div>' +
      '</div>';
    var lienzo = caja.querySelector('canvas'), ctx = lienzo.getContext('2d');
    var pista = caja.querySelector('.firma__pista'), aceptar = caja.querySelector('[data-firma="aceptar"]');
    var trazos = [], actual = null, largo = 0;

    function estilo(c, grosor) {
      c.lineWidth = grosor; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#141414'; c.fillStyle = '#141414';
    }

    function dibujar(c, trazo, x0, y0, escala) {
      if (trazo.length === 1) {
        c.beginPath(); c.arc(x0 + trazo[0].x * escala, y0 + trazo[0].y * escala, c.lineWidth / 2, 0, Math.PI * 2); c.fill();
        return;
      }
      c.beginPath();
      c.moveTo(x0 + trazo[0].x * escala, y0 + trazo[0].y * escala);
      for (var i = 1; i < trazo.length; i++) c.lineTo(x0 + trazo[i].x * escala, y0 + trazo[i].y * escala);
      c.stroke();
    }

    function ajustar() {
      var r = lienzo.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      if (!r.width) return;
      lienzo.width = Math.round(r.width * dpr);
      lienzo.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      estilo(ctx, 3);
      trazos.forEach(function (t) { dibujar(ctx, t, 0, 0, 1); });
    }

    function punto(e) {
      var r = lienzo.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    lienzo.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (lienzo.setPointerCapture) { try { lienzo.setPointerCapture(e.pointerId); } catch (x) { /* sin captura */ } }
      actual = [punto(e)];
      trazos.push(actual);
      pista.hidden = true;
      dibujar(ctx, actual, 0, 0, 1);
    });
    lienzo.addEventListener('pointermove', function (e) {
      if (!actual) return;
      e.preventDefault();
      var p = punto(e), q = actual[actual.length - 1];
      largo += Math.hypot(p.x - q.x, p.y - q.y);
      actual.push(p);
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    });
    function soltar() {
      if (!actual) return;
      actual = null;
      aceptar.disabled = largo < MINIMO;
    }
    lienzo.addEventListener('pointerup', soltar);
    lienzo.addEventListener('pointercancel', soltar);
    lienzo.addEventListener('lostpointercapture', soltar);

    function borrar() {
      trazos = []; actual = null; largo = 0;
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      pista.hidden = false;
      aceptar.disabled = true;
    }

    // La firma, recortada a lo que se ha dibujado y encajada en 360 × 120.
    function imagen() {
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      trazos.forEach(function (t) { t.forEach(function (p) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }); });
      var ancho = Math.max(1, maxX - minX), alto = Math.max(1, maxY - minY);
      var escala = Math.min((ANCHO - 2 * MARGEN) / ancho, (ALTO - 2 * MARGEN) / alto, 2);
      var x0 = (ANCHO - ancho * escala) / 2 - minX * escala, y0 = (ALTO - alto * escala) / 2 - minY * escala;
      var c = document.createElement('canvas');
      c.width = ANCHO; c.height = ALTO;
      var g = c.getContext('2d');
      estilo(g, 2.6);
      trazos.forEach(function (t) { dibujar(g, t, x0, y0, escala); });
      return c.toDataURL('image/png');
    }

    caja.addEventListener('click', function (e) {
      var b = e.target.closest('[data-firma]');
      if (!b || b.disabled) return;
      if (b.dataset.firma === 'borrar') borrar();
      else if (opciones.alAceptar) opciones.alAceptar(imagen());
    });

    if (window.ResizeObserver) new ResizeObserver(ajustar).observe(lienzo);
    else window.addEventListener('resize', ajustar);
    ajustar();
    return { borrar: borrar };
  }

  // Ventana para firmar (vigilante al aprobar, prevención al verificar, operario que se suma).
  function pedir(op) {
    return new Promise(function (resolver) {
      var fondo = document.createElement('div');
      fondo.className = 'ventana-fondo';
      fondo.innerHTML =
        '<div class="ventana ventana--firma" role="dialog" aria-modal="true">' +
          '<h2 class="ventana__titulo">' + u.esc(op.titulo) + '</h2>' +
          (op.cuerpo || '') +
          (op.texto ? '<p class="firma__texto">' + u.esc(op.texto) + '</p>' : '') +
          '<div data-caja-firma></div>' +
          '<button type="button" class="boton boton--neutro boton--ancho ventana__cancelar" data-cancelar>CANCELAR</button>' +
        '</div>';
      document.body.appendChild(fondo);
      crear(fondo.querySelector('[data-caja-firma]'), {
        textoAceptar: op.boton || 'ACEPTAR',
        alAceptar: function (img) { fondo.remove(); resolver(img); }
      });
      fondo.querySelector('[data-cancelar]').addEventListener('click', function () { fondo.remove(); resolver(null); });
    });
  }

  return { crear: crear, pedir: pedir };
})();
