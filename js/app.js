/* Arranque: elige la pantalla según el papel (#operario, #vigilante, #prevencion),
   mantiene los datos al día y revisa los turnos. */
EC.pantallas = EC.pantallas || {};

EC.app = (function () {
  var u = EC.util;
  var raiz, actual = null;
  var estado = { permisos: [], ajustes: { modoDemo: EC.config.MODO_DEMO_POR_DEFECTO }, listo: false };

  var PAPELES = {
    operario: { nombre: 'OPERARIO', icono: 'casco', lista: function () { return EC.datos.plantillaOrdenada().map(function (t) { return t.nombre; }); } },
    vigilante: { nombre: 'VIGILANTE', icono: 'camaraVigilancia', lista: function () { return EC.datos.vigilantes; } },
    prevencion: { nombre: 'PREVENCIÓN', icono: 'escudo', lista: function () { return EC.datos.verificadores; } }
  };

  // Identificador de este móvil (de este navegador): se guarda en cada permiso que se pide desde aquí,
  // para que el operario vea todos los pedidos desde este móvil, los pidiera quien los pidiera.
  var idMovil = null;
  function movil() {
    if (idMovil) return idMovil;
    try {
      idMovil = localStorage.getItem('ec_movil');
      if (!idMovil) { idMovil = 'm' + u.uid().slice(1); localStorage.setItem('ec_movil', idMovil); }
    } catch (e) {
      // Sin localStorage: vale solo para esta pestaña.
      idMovil = u.sesion.leer('ec_movil') || 'm' + u.uid().slice(1);
      u.sesion.guardar('ec_movil', idMovil);
    }
    return idMovil;
  }

  function quien(papel) { return u.sesion.leer('ec_quien_' + papel); }
  function ponerQuien(papel, nombre) { u.sesion.guardar('ec_quien_' + papel, nombre); }

  function papelActual() {
    var h = location.hash.replace('#', '');
    return PAPELES[h] ? h : null;
  }

  function barra(papel) {
    var P = PAPELES[papel];
    return '<nav class="barra barra--' + papel + '">' +
      '<a class="barra__atras" href="#" aria-label="Volver al inicio">' + EC.icono('atras') + '</a>' +
      '<span class="barra__papel">' + EC.icono(P.icono) + P.nombre + '</span>' +
      '<button type="button" class="barra__quien" data-accion="cambiar-quien">' + u.esc(quien(papel)) + '</button>' +
      (estado.ajustes.modoDemo ? '<span class="barra__demo">MODO DEMO</span>' : '') +
    '</nav>';
  }

  function mostrar() {
    if (!estado.listo) return;
    var papel = papelActual();
    document.body.className = '';
    window.scrollTo(0, 0);
    if (papel && !quien(papel)) {
      actual = EC.pantallas.quien;
      actual.montar(raiz, papel, PAPELES[papel]);
      return;
    }
    actual = papel ? EC.pantallas[papel] : EC.pantallas.inicio;
    actual.montar(raiz);
  }

  function alCambiar() {
    if (actual && actual.alCambiar) actual.alCambiar();
  }

  // Cierre por fin de turno (y por el corte del partido). Lo hace cualquier pestaña abierta.
  function revisarTurnos() {
    if (estado.ajustes.modoDemo) return;
    var ahora = Date.now();
    estado.permisos.forEach(function (p) {
      if ((p.estado === 'pendiente' || p.estado === 'aprobado') && p.finTurno && ahora >= p.finTurno) {
        EC.almacen.actualizar(p.id, function (q) { return EC.permisos.finDeTurno(q, ahora); }).catch(fallo);
      }
    });
  }

  function fallo(e) {
    console.error(e);
    u.aviso(e && e.message ? e.message : 'Algo ha fallado', 'error');
  }

  // Cambia un permiso y avisa si falla.
  function cambiar(id, fn) {
    return EC.almacen.actualizar(id, fn).catch(function (e) { fallo(e); return null; });
  }

  // ANULAR desde cualquier papel: dice qué permiso es, pide el motivo (obligatorio) y anula.
  function anular(id, papel) {
    var yo = quien(papel);
    var p = estado.permisos.find(function (x) { return x.id === id; });
    if (!p) return Promise.resolve(null);
    var dentro = EC.permisos.dentro(p);
    return u.ventana({
      titulo: 'Anular este permiso',
      cuerpo: '<div class="ventana__permiso"><b>' + u.esc(p.seccion) + ' · Obra ' + u.esc(p.obra) + '</b>' +
          '<span>' + u.esc(p.trabajos) + '</span>' +
          '<small>' + p.trabajadores.map(function (t) { return u.esc(t.nombre); }).join(', ') + '</small></div>' +
        (dentro.length
          ? '<p class="ventana__alarma">' + EC.icono('alerta') + '<span>Hay ' + (dentro.length === 1 ? '1 persona' : dentro.length + ' personas') +
            ' dentro (' + dentro.map(function (t) { return u.esc(t.nombre); }).join(', ') + '): saltará la alarma para que salgan.</span></p>'
          : '<p>No hay nadie dentro: el permiso se cerrará.</p>') +
        '<p class="nota">Queda apuntado quién lo anula, desde qué papel y a qué hora.</p>' +
        '<label class="campo__etiqueta" for="motivo-anular">Motivo (obligatorio)</label>' +
        '<textarea id="motivo-anular" class="entrada" rows="3" maxlength="140" data-obligatorio placeholder="Ej.: falla la ventilación forzada"></textarea>',
      botones: [
        { texto: 'CANCELAR', clase: 'boton--neutro', valor: null },
        { texto: 'ANULAR', clase: 'boton--no', obligatorio: true, valor: function (f) { return f.querySelector('textarea').value.trim(); } }
      ]
    }).then(function (motivo) {
      if (!motivo) return null;
      return cambiar(id, function (q) { return EC.permisos.anular(q, papel, yo, motivo); }).then(function (r) {
        if (r) u.aviso(r.estado === 'alerta' ? 'ANULADO · ALARMA: tienen que salir todos' : 'Permiso anulado', 'error');
        return r;
      });
    });
  }

  function ampliarFoto(src, texto) {
    var f = document.createElement('div');
    f.className = 'ampliada';
    f.innerHTML = '<img src="' + src + '" alt="' + u.esc(texto) + '"><p>' + u.esc(texto) + ' · toca para cerrar</p>';
    f.addEventListener('click', function () { f.remove(); });
    document.body.appendChild(f);
  }

  function arrancar() {
    raiz = document.getElementById('app');

    document.addEventListener('click', function (e) {
      var img = e.target.closest('img[data-ampliar]');
      if (img) { ampliarFoto(img.src, img.alt); return; }
      if (e.target.closest('[data-accion="cambiar-quien"]')) {
        ponerQuien(papelActual(), null);
        mostrar();
      }
    });

    // Cronómetros: se actualizan solos cada segundo.
    setInterval(function () {
      var ahora = Date.now();
      document.querySelectorAll('[data-crono]').forEach(function (el) {
        el.textContent = u.duracion(ahora - Number(el.dataset.crono));
      });
    }, 1000);

    window.addEventListener('hashchange', mostrar);

    EC.almacen.iniciar().then(function () {
      EC.almacen.suscribirAjustes(function (a) {
        var cambia = a.modoDemo !== estado.ajustes.modoDemo;
        estado.ajustes = a;
        if (cambia && estado.listo) { revisarTurnos(); mostrar(); }
      });
      EC.almacen.suscribir(function (lista) {
        estado.permisos = lista;
        if (!estado.listo) { estado.listo = true; mostrar(); } else alCambiar();
      });
      revisarTurnos();
      setInterval(revisarTurnos, EC.config.REVISAR_TURNOS_MS);
    }).catch(function (e) {
      raiz.innerHTML = '<div class="error-arranque"><h1>No arranca</h1><p>' + u.esc(e.message) + '</p></div>';
    });

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* sin PWA, la app funciona igual */ });
    }
  }

  return {
    arrancar: arrancar, estado: estado, PAPELES: PAPELES, quien: quien, ponerQuien: ponerQuien, movil: movil,
    barra: barra, mostrar: mostrar, cambiar: cambiar, fallo: fallo, anular: anular
  };
})();

document.addEventListener('DOMContentLoaded', EC.app.arrancar);
