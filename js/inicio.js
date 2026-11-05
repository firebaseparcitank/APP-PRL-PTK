/* Pantalla de inicio (elegir papel) y «¿Quién eres?». */
(function () {
  var u = EC.util;

  EC.pantallas.inicio = (function () {
    var raiz;

    function activos() {
      return EC.app.estado.permisos.filter(EC.permisos.activo).length;
    }

    function pintar() {
      var a = EC.app.estado.ajustes;
      var n = activos();
      raiz.innerHTML =
        '<main class="inicio">' +
          EC.vistas.cabeceraPapel() +
          '<p class="inicio__activos">' + (n ? '<b>' + n + '</b> ' + (n === 1 ? 'permiso activo' : 'permisos activos') : 'Ningún permiso activo') + '</p>' +
          '<div class="inicio__papeles">' +
            boton('operario', 'casco', 'OPERARIO', 'Pido entrar al espacio confinado') +
            boton('vigilante', 'camaraVigilancia', 'VIGILANTE', 'Recurso preventivo: apruebo o deniego') +
            boton('prevencion', 'escudo', 'PREVENCIÓN', 'Verificador: reviso un espacio') +
          '</div>' +
          '<div class="inicio__ajustes">' +
            '<label class="interruptor">' +
              '<input type="checkbox" data-accion="modo-demo"' + (a.modoDemo ? ' checked' : '') + '>' +
              '<span class="interruptor__pista"><span class="interruptor__bola"></span></span>' +
              '<span class="interruptor__texto"><b>Modo demo</b><small>' +
                (a.modoDemo ? 'Se puede pedir a cualquier hora y nada se cierra por turno' : 'Mandan los turnos: ' + EC.turnos.lista().map(function (t) {
                  return t.nombre.toLowerCase() + ' ' + EC.turnos.horario(t.id);
                }).join(' · ')) +
              '</small></span>' +
            '</label>' +
            '<button type="button" class="enlace-peligro" data-accion="borrar">' + EC.icono('papelera') + 'Borrar datos de demo</button>' +
          '</div>' +
          '<p class="inicio__pie">Demo con datos inventados · almacenamiento ' + EC.almacen.nombre + '</p>' +
        '</main>';
    }

    function boton(id, icono, titulo, texto) {
      return '<a class="boton-papel boton-papel--' + id + '" href="#' + id + '">' + EC.icono(icono) +
        '<span><b>' + titulo + '</b><small>' + texto + '</small></span></a>';
    }

    function alPulsar(e) {
      var el = e.target.closest('[data-accion]');
      if (!el) return;
      if (el.dataset.accion === 'borrar') {
        u.confirmar('¿Borrar todos los permisos?', 'Se borran todos los permisos y el registro de esta demo, en todas las pestañas.', 'BORRAR', 'boton--no')
          .then(function (si) {
            if (!si) return;
            u.sesion.guardar('ec_permiso_actual', null);
            u.sesion.guardar('ec_borrador', null);
            EC.almacen.borrarTodo().then(function () { u.aviso('Datos de demo borrados'); });
          });
      }
    }

    function alCambiarCasilla(e) {
      if (e.target.dataset.accion === 'modo-demo') {
        EC.almacen.guardarAjustes({ modoDemo: e.target.checked }).catch(EC.app.fallo);
      }
    }

    return {
      montar: function (el) {
        raiz = el;
        raiz.onclick = alPulsar;
        raiz.onchange = alCambiarCasilla;
        raiz.oninput = null;
        pintar();
      },
      alCambiar: pintar
    };
  })();

  EC.pantallas.quien = (function () {
    // Con listas largas (la plantilla), un buscador encima.
    var CON_BUSCADOR = 8;

    function filtrar(raiz, texto) {
      var hay = 0;
      raiz.querySelectorAll('.boton-nombre').forEach(function (b) {
        var si = u.coincide(b.dataset.nombre, texto);
        b.hidden = !si;
        if (si) hay++;
      });
      var nada = raiz.querySelector('.buscador__nada');
      nada.hidden = hay > 0;
      nada.textContent = 'Nadie coincide con «' + texto.trim() + '». Prueba con otro nombre o apellido.';
    }

    return {
      montar: function (raiz, papel, P) {
        var lista = P.lista();
        raiz.onchange = null;
        raiz.innerHTML =
          '<main class="quien quien--' + papel + '">' +
            '<a class="barra__atras barra__atras--suelto" href="#" aria-label="Volver al inicio">' + EC.icono('atras') + '</a>' +
            '<div class="quien__cabeza">' + EC.icono(P.icono) + '<h1>' + P.nombre + '</h1><p>¿Quién eres?</p></div>' +
            (lista.length > CON_BUSCADOR ? '<div class="quien__buscar">' + EC.vistas.buscador('buscar-quien', 'Nombre o apellido') + '</div>' : '') +
            '<div class="quien__lista' + (lista.length > CON_BUSCADOR ? ' quien__lista--caja' : '') + '">' + lista.map(function (n) {
              return '<button type="button" class="boton-nombre" data-nombre="' + u.esc(n) + '">' + EC.icono('persona') + u.esc(n) + '</button>';
            }).join('') + '</div>' +
            '<p class="buscador__nada quien__nada" hidden></p>' +
            '<p class="quien__nota">Se recuerda solo en esta pestaña: en otra pestaña puedes ser otra persona.</p>' +
          '</main>';
        raiz.oninput = function (e) { if (e.target.id === 'buscar-quien') filtrar(raiz, e.target.value); };
        raiz.onclick = function (e) {
          var b = e.target.closest('[data-nombre]');
          if (!b) return;
          EC.app.ponerQuien(papel, b.dataset.nombre);
          EC.app.mostrar();
        };
      }
    };
  })();
})();
