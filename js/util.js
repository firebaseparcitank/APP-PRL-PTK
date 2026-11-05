/* Utilidades comunes: fechas, textos, fotos, ventanas y avisos. */
window.EC = window.EC || {};

EC.util = (function () {
  function dos(n) { return (n < 10 ? '0' : '') + n; }

  function esc(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fechaISO(d) {
    return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
  }

  function hora(ms) {
    if (!ms) return '';
    var d = new Date(ms);
    return dos(d.getHours()) + ':' + dos(d.getMinutes());
  }

  function fecha(ms) {
    var d = new Date(ms);
    return dos(d.getDate()) + '/' + dos(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function fechaLarga(iso) {
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  // 3725000 → «1:02:05»
  function duracion(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h + ':' + dos(m) + ':' + dos(s % 60);
  }

  function numero(n, decimales) {
    return Number(n).toFixed(decimales == null ? 1 : decimales).replace('.', ',');
  }

  // Para buscar sin que importen tildes ni mayúsculas: «José» → «jose».
  function normalizar(texto) {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  // ¿Están todas las palabras buscadas en el texto? «juan garcia» encuentra «Juan Pérez García».
  function coincide(texto, busqueda) {
    var t = normalizar(texto);
    return normalizar(busqueda).split(/\s+/).every(function (palabra) { return !palabra || t.indexOf(palabra) >= 0; });
  }

  function uid() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Lee una foto de la cámara o de la galería y la reduce a un JPEG pequeño.
  // Las fotos del móvil son enormes: se leen sin pasarlas a texto (gasta mucha menos memoria),
  // que en móviles justos el navegador puede cerrarse al volver de la cámara.
  function reducirFoto(archivo) {
    var NO_SE_LEE = 'Esta foto no se puede leer (quizá está en formato HEIC). Hazla otra vez o elige otra de la galería.';

    function aJpeg(fuente, ancho, alto) {
      var escala = Math.min(1, EC.config.FOTO_LADO_MAX / Math.max(ancho, alto));
      var lienzo = document.createElement('canvas');
      lienzo.width = Math.max(1, Math.round(ancho * escala));
      lienzo.height = Math.max(1, Math.round(alto * escala));
      lienzo.getContext('2d').drawImage(fuente, 0, 0, lienzo.width, lienzo.height);
      return lienzo.toDataURL('image/jpeg', EC.config.FOTO_CALIDAD);
    }

    function conImagen() {
      return new Promise(function (resolver, rechazar) {
        var url = URL.createObjectURL(archivo);
        var img = new Image();
        img.onload = function () {
          try { resolver(aJpeg(img, img.naturalWidth, img.naturalHeight)); }
          catch (e) { rechazar(new Error(NO_SE_LEE)); }
          finally { URL.revokeObjectURL(url); }
        };
        img.onerror = function () { URL.revokeObjectURL(url); rechazar(new Error(NO_SE_LEE)); };
        img.src = url;
      });
    }

    if (!archivo) return Promise.reject(new Error('No ha llegado ninguna foto'));
    if (!window.createImageBitmap) return conImagen();
    return createImageBitmap(archivo).then(function (bmp) {
      var r = aJpeg(bmp, bmp.width, bmp.height);
      if (bmp.close) bmp.close();
      return r;
    }, conImagen);
  }

  function vibrar(patron) {
    try { if (navigator.vibrate) navigator.vibrate(patron); } catch (e) { /* sin vibración */ }
  }

  // Lo que se guarda solo en esta pestaña (cada pestaña es una persona).
  var sesion = {
    leer: function (clave) {
      try { return JSON.parse(sessionStorage.getItem(clave)); } catch (e) { return null; }
    },
    guardar: function (clave, valor) {
      try {
        if (valor == null) sessionStorage.removeItem(clave);
        else sessionStorage.setItem(clave, JSON.stringify(valor));
      } catch (e) { /* sin sessionStorage: se pierde al recargar */ }
    }
  };

  // Ventana encima de todo. botones: [{texto, clase, valor, obligatorio}]. Devuelve una promesa con el valor.
  // Un botón «obligatorio» no se puede pulsar hasta que el campo [data-obligatorio] tenga texto.
  function ventana(opciones) {
    return new Promise(function (resolver) {
      var fondo = document.createElement('div');
      fondo.className = 'ventana-fondo';
      fondo.innerHTML =
        '<div class="ventana" role="dialog" aria-modal="true">' +
          '<h2 class="ventana__titulo">' + esc(opciones.titulo) + '</h2>' +
          '<div class="ventana__cuerpo">' + (opciones.cuerpo || '') + '</div>' +
          '<div class="ventana__botones">' +
            opciones.botones.map(function (b, i) {
              return '<button type="button" class="boton ' + (b.clase || '') + '" data-i="' + i + '"' +
                (b.obligatorio ? ' data-pide-texto disabled' : '') + '>' + esc(b.texto) + '</button>';
            }).join('') +
          '</div>' +
        '</div>';
      document.body.appendChild(fondo);
      var primero = fondo.querySelector('textarea, input');
      if (primero) primero.focus();
      var obligatorio = fondo.querySelector('[data-obligatorio]');
      if (obligatorio) {
        obligatorio.addEventListener('input', function () {
          var vacio = !obligatorio.value.trim();
          fondo.querySelectorAll('[data-pide-texto]').forEach(function (b) { b.disabled = vacio; });
        });
      }
      fondo.addEventListener('click', function (e) {
        var b = e.target.closest('[data-i]');
        if (b && b.disabled) return;
        if (!b && e.target !== fondo) return;
        var elegido = b ? opciones.botones[Number(b.dataset.i)] : null;
        var valor = elegido ? elegido.valor : null;
        if (typeof valor === 'function') valor = valor(fondo);
        fondo.remove();
        resolver(valor);
      });
    });
  }

  function confirmar(titulo, texto, textoSi, claseSi) {
    return ventana({
      titulo: titulo,
      cuerpo: texto ? '<p>' + esc(texto) + '</p>' : '',
      botones: [
        { texto: 'CANCELAR', clase: 'boton--neutro', valor: false },
        { texto: textoSi || 'SÍ', clase: claseSi || 'boton--si', valor: true }
      ]
    });
  }

  function aviso(texto, tipo) {
    var el = document.createElement('div');
    el.className = 'aviso aviso--' + (tipo || 'info');
    el.textContent = texto;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('aviso--fuera'); }, 2600);
    setTimeout(function () { el.remove(); }, 3100);
  }

  return {
    esc: esc, fechaISO: fechaISO, hora: hora, fecha: fecha, fechaLarga: fechaLarga,
    duracion: duracion, numero: numero, uid: uid, reducirFoto: reducirFoto, vibrar: vibrar,
    normalizar: normalizar, coincide: coincide,
    sesion: sesion, ventana: ventana, confirmar: confirmar, aviso: aviso
  };
})();
