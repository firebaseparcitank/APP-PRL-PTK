/* Pantalla de PREVENCIÓN (verificador): opcional, no bloquea nada. */
EC.pantallas.prevencion = (function () {
  var u = EC.util, V = EC.vistas;
  var CLAVE_ABIERTO = 'ec_prevencion_abierto';
  var raiz, nota = { observaciones: '', foto: null };

  function abierto() {
    var id = u.sesion.leer(CLAVE_ABIERTO);
    return id ? EC.app.estado.permisos.find(function (p) { return p.id === id; }) || null : null;
  }

  function activos() {
    return EC.app.estado.permisos.filter(EC.permisos.activo);
  }

  function htmlLista() {
    var lista = activos();
    if (!lista.length) {
      return '<div class="vacio">' + EC.icono('escudo') + '<h2>SIN PERMISOS ACTIVOS</h2><p>No hay ningún espacio confinado abierto ahora mismo.</p></div>';
    }
    return '<p class="nota">Elige un permiso para revisarlo. Verificar es opcional y no bloquea nada.</p>' +
      '<div class="lista-prevencion">' + lista.map(function (p) {
        var e = V.estado(p);
        return '<button type="button" class="tarjeta tarjeta--' + e.color + '" data-accion="abrir" data-id="' + p.id + '">' +
          EC.icono('deposito') +
          '<span class="tarjeta__texto"><b>' + u.esc(p.seccion) + ' · Obra ' + u.esc(p.obra) + '</b>' +
            '<span>' + u.esc(p.trabajos) + '</span>' +
            '<small>' + e.titulo + ' · dentro: ' + EC.permisos.dentro(p).length + (p.verificaciones.length ? ' · VERIFICADO' : '') + '</small></span>' +
        '</button>';
      }).join('') + '</div>';
  }

  function htmlInfo(p) {
    var e = V.estado(p);
    return '<article class="cuadro cuadro--' + e.color + '">' +
      '<header class="cuadro__cabeza">' + EC.icono(e.icono) + '<b>' + e.titulo + '</b></header>' +
      '<div class="cuadro__cuerpo">' + V.cuerpo(p) + '</div></article>';
  }

  function htmlFoto() {
    return '<div class="foto-campo' + (nota.foto ? ' foto-campo--hecha' : '') + '" data-foto-verif>' +
      (nota.foto ? '<img src="' + nota.foto + '" alt="Foto de la verificación" data-ampliar>' : '') +
      V.botonesFoto('verif', !!nota.foto, 'HACER FOTO', !!nota.foto) +
      '<small class="foto-campo__nota">OPCIONAL</small></div>';
  }

  function htmlVerificar(p) {
    var yo = EC.app.quien('prevencion');
    var mia = p.verificaciones.filter(function (v) { return v.nombre === yo; }).pop();
    if (!EC.permisos.activo(p)) {
      return '<p class="estado__aviso">Este permiso ya no está activo (' + u.esc(V.estado(p).titulo.toLowerCase()) + ').</p>';
    }
    if (mia) {
      return '<div class="hecho">' + EC.icono('escudo') + '<b>VERIFICADO POR TI a las ' + u.hora(mia.hora) + '</b>' + V.firmaMini(mia.firma, mia.nombre) + '</div>';
    }
    return '<section class="bloque">' +
      '<h2 class="bloque__titulo"><span class="bloque__num">' + EC.icono('escudo') + '</span>VERIFICACIÓN</h2>' +
      '<p class="nota">Se han verificado que los pasos anteriores se han cumplimentado al inicio de los trabajos. Al pulsar VERIFICADO, firmas con el dedo.</p>' +
      '<label class="campo__etiqueta" for="obs">Observaciones (opcional)</label>' +
      '<textarea id="obs" class="entrada" rows="3" maxlength="200" data-entrada="observaciones">' + u.esc(nota.observaciones) + '</textarea>' +
      htmlFoto() +
      '<button type="button" class="boton-pedir boton-pedir--listo boton-pedir--prevencion" data-accion="verificar">' + EC.icono('escudo') + 'VERIFICADO</button>' +
    '</section>';
  }

  function pintar() {
    var p = abierto();
    raiz.innerHTML = '<main class="prevencion">' + EC.app.barra('prevencion') +
      (p
        ? '<button type="button" class="enlace enlace--volver" data-accion="volver">' + EC.icono('atras') + 'Todos los permisos activos</button>' +
          '<div data-info>' + htmlInfo(p) + '</div><div data-verificar>' + htmlVerificar(p) + '</div>' +
          '<div data-anular>' + htmlAnular(p) + '</div>'
        : htmlLista()) +
    '</main>';
  }

  function htmlAnular(p) {
    if (!EC.permisos.sePuedeAnular(p)) return '';
    return '<div class="prevencion__anular">' +
      '<button type="button" class="boton boton--anular boton--ancho" data-accion="anular">' + EC.icono('no') + 'ANULAR PERMISO</button></div>';
  }

  // Al cambiar los datos no se toca lo que se está escribiendo.
  function alCambiar() {
    var p = abierto();
    var info = raiz.querySelector('[data-info]');
    if (!p || !info) { pintar(); return; }
    info.innerHTML = htmlInfo(p);
    raiz.querySelector('[data-anular]').innerHTML = htmlAnular(p);
    var hueco = raiz.querySelector('[data-verificar]');
    if (!hueco.querySelector('textarea') || !EC.permisos.activo(p)) hueco.innerHTML = htmlVerificar(p);
  }

  function alPulsar(e) {
    var b = e.target.closest('[data-accion]');
    if (!b) return;
    var a = b.dataset.accion;
    if (a === 'abrir') { u.sesion.guardar(CLAVE_ABIERTO, b.dataset.id); nota = { observaciones: '', foto: null }; pintar(); }
    else if (a === 'volver') { u.sesion.guardar(CLAVE_ABIERTO, null); pintar(); }
    else if (a === 'anular') { var q = abierto(); if (q) EC.app.anular(q.id, 'prevencion'); }
    else if (a === 'quitar-foto') { nota.foto = null; raiz.querySelector('[data-foto-verif]').outerHTML = htmlFoto(); }
    else if (a === 'camara') {
      EC.camara.sacarFoto().then(function (src) {
        if (!src) return;
        nota.foto = src;
        raiz.querySelector('[data-foto-verif]').outerHTML = htmlFoto();
      }).catch(function (err) { V.estadoFoto(raiz, 'verif', err.message, true); u.aviso(err.message, 'error'); });
    }
    else if (a === 'verificar') {
      // VERIFICADO es la firma del verificador: se firma con el dedo en una ventana.
      var p = abierto(), yo = EC.app.quien('prevencion');
      if (!p) return;
      EC.firma.pedir({
        titulo: 'Verificar · firma del verificador',
        cuerpo: '<div class="ventana__permiso"><b>' + u.esc(p.seccion) + ' · Obra ' + u.esc(p.obra) + '</b><span>' + u.esc(p.trabajos) + '</span></div>',
        texto: 'Se han verificado que los pasos anteriores se han cumplimentado al inicio de los trabajos.',
        boton: 'FIRMAR Y VERIFICAR'
      }).then(function (img) {
        if (!img) return;
        EC.app.cambiar(p.id, function (q) { return EC.permisos.verificar(q, yo, nota.observaciones.trim(), nota.foto, img); }).then(function (r) {
          if (!r) { u.aviso('No se ha podido verificar: el permiso ya no está activo', 'error'); return; }
          nota = { observaciones: '', foto: null };
          u.aviso('VERIFICADO · firmado por ' + yo, 'si');
          var hueco = raiz.querySelector('[data-verificar]');
          if (hueco) hueco.innerHTML = htmlVerificar(r);
        });
      });
    }
  }

  return {
    montar: function (el) {
      raiz = el;
      raiz.onclick = alPulsar;
      raiz.oninput = function (e) { if (e.target.dataset.entrada === 'observaciones') nota.observaciones = e.target.value; };
      raiz.onchange = function (e) {
        var f = e.target.files && e.target.files[0];
        if (e.target.dataset.foto !== 'verif' || !f) return;
        V.estadoFoto(raiz, 'verif', 'PREPARANDO FOTO…');
        u.reducirFoto(f).then(function (src) { nota.foto = src; raiz.querySelector('[data-foto-verif]').outerHTML = htmlFoto(); })
          .catch(function (err) { V.estadoFoto(raiz, 'verif', err.message, true); u.aviso(err.message, 'error'); });
      };
      pintar();
    },
    alCambiar: alCambiar
  };
})();
