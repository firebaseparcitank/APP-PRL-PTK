/* Pantalla del VIGILANTE (recurso preventivo): panel de semáforos y registro. */
EC.pantallas.vigilante = (function () {
  var u = EC.util, V = EC.vistas;
  var CLAVE_PESTANA = 'ec_vigilante_pestana';
  var raiz, abiertos = {};
  var ORDEN = { alerta: 0, pendiente: 1, aprobado: 2 };

  function pestana() { return u.sesion.leer(CLAVE_PESTANA) || 'panel'; }

  /* ---------- sonido (js/sonido.js) ----------
     Pitido al llegar una petición, repetido cada PITIDO_CADA_MS mientras quede alguna en amarillo.
     Alarma (sirena) cada ALARMA_CADA_MS mientras haya un permiso ANULADO con gente dentro; tiene prioridad.
     Si el navegador no deja sonar, sale arriba el aviso para activarlo con un toque. */

  var oidas = {}, ultimoPitido = 0, ultimaAlarma = 0, reloj = null;

  function alarmasDeAnulacion() {
    return EC.app.estado.permisos.filter(function (p) { return p.estado === 'alerta' && p.alerta.motivo === 'anulado'; });
  }

  function revisarSonido() {
    if (!raiz || !raiz.querySelector('main.vigilante')) return;
    var ahora = Date.now();
    var esperando = EC.app.estado.permisos.filter(function (p) { return p.estado === 'pendiente'; });
    var nueva = esperando.some(function (p) { return !oidas[p.id]; });
    esperando.forEach(function (p) { oidas[p.id] = true; });
    // Se revisa cada segundo: el margen de medio segundo evita que se vaya al segundo siguiente.
    if (alarmasDeAnulacion().length) {
      if (ahora - ultimaAlarma >= EC.config.ALARMA_CADA_MS - 500 && EC.sonido.alarma()) ultimaAlarma = ahora;
      return;
    }
    if (esperando.length && (nueva || ahora - ultimoPitido >= EC.config.PITIDO_CADA_MS - 500) && EC.sonido.pitido()) ultimoPitido = ahora;
  }

  /* Aviso con pitido cuando se suma alguien a un permiso aprobado (AÑADIR OPERARIO).
     Lo que ya había al abrir la pantalla no se avisa. */
  var conocidos = {}, sumadosIniciado = false;

  function revisarSumados() {
    var nuevos = [];
    EC.app.estado.permisos.forEach(function (p) {
      if (!EC.permisos.activo(p)) return;
      var antes = conocidos[p.id];
      if (antes && sumadosIniciado) {
        p.trabajadores.forEach(function (t) { if (t.anadido && antes.indexOf(t.id) < 0) nuevos.push({ p: p, t: t }); });
      }
      conocidos[p.id] = p.trabajadores.map(function (t) { return t.id; });
    });
    sumadosIniciado = true;
    if (!nuevos.length) return;
    if (!alarmasDeAnulacion().length) EC.sonido.pitido();
    nuevos.forEach(function (x) { u.aviso('SE SUMA ' + x.t.nombre + ' a ' + x.p.seccion + ' · Obra ' + x.p.obra, 'si'); });
  }

  function htmlAvisoSonido() {
    return EC.sonido.htmlAviso('TOCA AQUÍ PARA ACTIVAR EL PITIDO Y LA ALARMA');
  }

  function actualizarAvisoSonido() {
    var hueco = raiz && raiz.querySelector('main.vigilante [data-aviso-sonido]');
    if (hueco) hueco.innerHTML = htmlAvisoSonido();
  }
  EC.sonido.alCambiar(actualizarAvisoSonido);

  function activos() {
    return EC.app.estado.permisos.filter(EC.permisos.activo).sort(function (a, b) {
      return (ORDEN[a.estado] - ORDEN[b.estado]) || (a.creado - b.creado);
    });
  }

  /* ---------- panel ---------- */

  function cabeza(p) {
    if (p.estado === 'pendiente') {
      return '<header class="cuadro__cabeza">' + EC.icono('reloj') + '<b>ESPERANDO APROBACIÓN</b>' + V.crono(p.creado) + '</header>';
    }
    var dentro = EC.permisos.dentro(p);
    // En las alarmas, la sección y la obra van en grande en la cabecera: con varias, se ve a la primera cuál es.
    var obra = '<span class="cuadro__cabeza-obra">' + u.esc(p.seccion) + ' · OBRA ' + u.esc(p.obra) + '</span>';
    if (p.estado === 'alerta' && p.alerta.motivo === 'anulado') {
      return '<header class="cuadro__cabeza cuadro__cabeza--rayas-rojas">' + EC.icono('alerta') +
        '<b>PERMISO ANULADO · SALID YA' + obra + '<small>' + u.esc(V.quienAnulo(p)) + '</small></b>' +
        V.crono(p.alerta.hora) + '</header>' +
        '<div class="cuadro__siguen"><small>MOTIVO</small><span class="cuadro__motivo">' + u.esc(p.anulado.motivo) + '</span>' +
          '<small>SIGUEN DENTRO</small>' + dentro.map(function (t) { return '<b>' + u.esc(t.nombre) + '</b>'; }).join('') + '</div>';
    }
    if (p.estado === 'alerta') {
      return '<header class="cuadro__cabeza cuadro__cabeza--rayas">' + EC.icono('alerta') +
        '<b>FIN DE TURNO CON GENTE DENTRO' + obra + (p.alerta.motivo === 'corte' ? '<small>Corte de mediodía del partido · ' + u.hora(p.alerta.hora) + '</small>' : '<small>Desde las ' + u.hora(p.alerta.hora) + '</small>') + '</b>' +
        V.crono(p.alerta.hora) + '</header>' +
        '<div class="cuadro__siguen"><small>SIGUEN DENTRO</small>' + dentro.map(function (t) { return '<b>' + u.esc(t.nombre) + '</b>'; }).join('') + '</div>';
    }
    var primera = EC.permisos.primeraEntrada(p);
    // Ya no se cierra solo al quedarse vacío: sigue en verde hasta que el vigilante lo finaliza.
    var sub = dentro.length ? 'Desde la primera entrada, ' + u.hora(primera)
      : primera ? 'Han salido todos · cuando terminen, FINALIZAR PERMISO'
      : 'Aprobado ' + u.hora(p.aprobado.hora) + ' · nadie dentro todavía';
    return '<header class="cuadro__cabeza">' + EC.icono('si') +
      '<b>DENTRO: <span class="cuadro__cuantos">' + dentro.length + '</span><small>' + sub + '</small></b>' +
      V.crono(primera || p.aprobado.hora) + '</header>';
  }

  function botonFinalizar(p) {
    return '<button type="button" class="boton boton--finalizar" data-accion="finalizar" data-id="' + p.id + '">' + EC.icono('registro') + 'FINALIZAR PERMISO</button>';
  }

  function cuadro(p) {
    var e = V.estado(p);
    return '<article class="cuadro cuadro--' + e.color + '">' + cabeza(p) +
      '<div class="cuadro__cuerpo">' + V.cuerpo(p) + '</div>' +
      (p.estado === 'pendiente'
        ? '<footer class="cuadro__botones">' +
            '<button type="button" class="boton boton--si" data-accion="aprobar" data-id="' + p.id + '">' + EC.icono('si') + 'APROBAR</button>' +
            '<button type="button" class="boton boton--no" data-accion="denegar" data-id="' + p.id + '">' + EC.icono('no') + 'DENEGAR</button>' +
          '</footer>'
        : p.estado === 'aprobado'
          ? '<footer class="cuadro__botones cuadro__botones--cierre">' +
              '<button type="button" class="boton boton--anular" data-accion="anular" data-id="' + p.id + '">' + EC.icono('no') + 'ANULAR PERMISO</button>' +
              botonFinalizar(p) +
            '</footer>'
          // En una alarma, por si alguien salió sin pulsar SALE y el vigilante lo ve por la cámara.
          : '<footer class="cuadro__botones cuadro__botones--uno">' + botonFinalizar(p) + '</footer>') +
    '</article>';
  }

  // Resumen del permiso para las ventanas de firmar y de finalizar.
  function resumenPermiso(p) {
    return '<div class="ventana__permiso"><b>' + u.esc(p.seccion) + ' · Obra ' + u.esc(p.obra) + '</b>' +
      '<span>' + u.esc(p.trabajos) + ' · O₂ ' + u.numero(p.oxigeno) + ' %</span>' +
      '<small>' + p.trabajadores.map(function (t) { return u.esc(t.nombre); }).join(', ') + '</small></div>';
  }

  function finalizar(id, yo) {
    var p = EC.app.estado.permisos.find(function (x) { return x.id === id; });
    if (!p) return;
    var dentro = EC.permisos.dentro(p);
    u.ventana({
      titulo: 'Finalizar el permiso',
      cuerpo: resumenPermiso(p) + (dentro.length
        ? '<p class="ventana__alarma">' + EC.icono('alerta') + '<span>Según la app siguen dentro: ' +
            dentro.map(function (t) { return u.esc(t.nombre); }).join(', ') +
            '. Finaliza solo si has visto que han salido: su salida se apuntará a esta hora y a tu nombre.</span></p>'
        : '<p>Ya no se podrá entrar ni añadir a nadie con este permiso.</p>'),
      botones: [
        { texto: 'CANCELAR', clase: 'boton--neutro', valor: false },
        { texto: dentro.length ? 'HAN SALIDO · FINALIZAR' : 'FINALIZAR', clase: 'boton--finalizar', valor: true }
      ]
    }).then(function (si) {
      if (!si) return;
      EC.app.cambiar(id, function (q) { return EC.permisos.finalizar(q, yo); }).then(function (r) {
        if (r) u.aviso('Permiso finalizado', 'si');
      });
    });
  }

  function htmlPanel() {
    var lista = activos();
    if (!lista.length) {
      return '<div class="vacio">' + EC.icono('camaraVigilancia') + '<h2>SIN PERMISOS ACTIVOS</h2><p>Cuando un operario pida entrar, aparecerá aquí en amarillo.</p></div>';
    }
    return '<div class="semaforos">' + lista.map(cuadro).join('') + '</div>';
  }

  /* ---------- registro ---------- */

  function filaRegistro(p) {
    var e = V.estado(p);
    var decision = p.aprobado ? 'Aprobó <b>' + u.esc(p.aprobado.nombre) + '</b> ' + u.hora(p.aprobado.hora) + V.firmaMini(p.aprobado.firma, p.aprobado.nombre)
      : p.denegado ? 'Denegó <b>' + u.esc(p.denegado.nombre) + '</b> ' + u.hora(p.denegado.hora) + (p.denegado.motivo ? ': «' + u.esc(p.denegado.motivo) + '»' : '')
      : 'Sin aprobar';
    var verif = p.verificaciones.length
      ? p.verificaciones.map(function (v) {
          return '<b>' + u.esc(v.nombre) + '</b> ' + u.hora(v.hora) + (v.observaciones ? ': «' + u.esc(v.observaciones) + '»' : '') + V.firmaMini(v.firma, v.nombre);
        }).join('; ')
      : '—';
    return '<article class="fila-registro fila-registro--' + e.color + '">' +
      '<header class="fila-registro__cabeza">' +
        '<span class="chip chip--' + e.color + '">' + e.titulo + '</span>' +
        '<time>' + u.fecha(p.creado) + ' ' + u.hora(p.creado) + '</time>' +
        '<b>' + u.esc(p.seccion) + ' · Obra ' + u.esc(p.obra) + '</b>' +
        '<span>' + u.esc(p.trabajos) + '</span>' +
      '</header>' +
      '<ul class="fila-registro__datos">' +
        '<li>Pidió <b>' + u.esc(p.pedidoPor.nombre) + '</b> ' + u.hora(p.pedidoPor.hora) + ' · turno ' + u.esc(V.nombreTurno(p).toLowerCase()) + ' · O₂ ' + u.numero(p.oxigeno) + ' %</li>' +
        '<li>' + decision + '</li>' +
        '<li>Verificado por prevención: ' + verif + '</li>' +
        (p.anulado ? '<li class="fila-registro__alerta">' + EC.icono('no') + '<span>Anuló <b>' + u.esc(p.anulado.nombre) + '</b> (' + V.nombrePapel(p.anulado.papel) + ') ' + u.hora(p.anulado.hora) + ': «' + u.esc(p.anulado.motivo) + '»</span></li>' : '') +
        (p.alerta ? '<li class="fila-registro__alerta">' + EC.icono('alerta') + '<span>' +
          (p.alerta.motivo === 'anulado' ? 'ANULADO CON GENTE DENTRO a las ' : 'FIN DE TURNO CON GENTE DENTRO a las ') + u.hora(p.alerta.hora) +
          (p.alerta.motivo === 'corte' ? ' (corte de mediodía)' : '') + '</span></li>' : '') +
        // Si se anuló sin nadie dentro, la línea de «Anuló» ya lo dice todo.
        (p.cierre && !(p.cierre.motivo === 'anulado' && !p.cierre.conGenteDentro) ? '<li>' + u.esc(V.textoCierre(p)) + '</li>' : '') +
      '</ul>' +
      '<div class="tabla-desliza"><table class="tabla-horas"><thead><tr><th>Trabajador</th><th>Firma</th><th>Entrada</th><th>Salida</th></tr></thead><tbody>' +
        p.trabajadores.map(function (t) {
          return '<tr><td>' + u.esc(t.nombre) + (t.anadido ? '<small> · añadido ' + u.hora(t.anadido.hora) + '</small>' : '') + '</td>' +
            '<td>' + (t.firma ? V.firmaMini(t.firma, t.nombre) : '—') + '</td>' +
            '<td>' + (u.hora(t.entrada) || '—') + '</td>' +
            '<td>' + (u.hora(t.salida) ? u.hora(t.salida) + (t.salidaPorVigilante ? ' <small>(vigilante)</small>' : '') : (t.entrada ? 'DENTRO' : '—')) + '</td></tr>';
        }).join('') +
      '</tbody></table></div>' +
      '<button type="button" class="enlace" data-accion="papel" data-id="' + p.id + '">' + (abiertos[p.id] ? 'Ocultar el permiso' : 'Ver el permiso como en papel') + '</button>' +
      (abiertos[p.id] ? V.papel(p) : '') +
    '</article>';
  }

  function htmlRegistro() {
    var lista = EC.app.estado.permisos.slice().reverse();
    if (!lista.length) return '<div class="vacio">' + EC.icono('registro') + '<h2>REGISTRO VACÍO</h2><p>Aquí quedarán todos los permisos.</p></div>';
    return '<div class="registro">' + lista.map(filaRegistro).join('') + '</div>';
  }

  /* ---------- montaje ---------- */

  function pintar() {
    var t = pestana();
    var n = activos().length;
    var esperando = activos().filter(function (p) { return p.estado === 'pendiente'; }).length;
    raiz.innerHTML = '<main class="vigilante">' + EC.app.barra('vigilante') +
      '<div data-aviso-sonido>' + htmlAvisoSonido() + '</div>' +
      '<div class="pestanas">' +
        '<button type="button" class="pestanas__b' + (t === 'panel' ? ' pestanas__b--elegida' : '') + '" data-accion="pestana" data-valor="panel">' + EC.icono('panel') + 'PANEL' +
          (n ? '<span class="pestanas__n' + (esperando ? ' pestanas__n--espera' : '') + '">' + n + '</span>' : '') + '</button>' +
        '<button type="button" class="pestanas__b' + (t === 'registro' ? ' pestanas__b--elegida' : '') + '" data-accion="pestana" data-valor="registro">' + EC.icono('lista') + 'REGISTRO</button>' +
      '</div>' +
      (t === 'panel' ? htmlPanel() : htmlRegistro()) +
    '</main>';
  }

  function alPulsar(e) {
    // Cualquier toque en la pantalla sirve para que el navegador deje pitar.
    if (!EC.sonido.listo()) EC.sonido.activar().then(function (ok) { if (ok) { ultimoPitido = 0; ultimaAlarma = 0; revisarSonido(); } });
    var b = e.target.closest('[data-accion]');
    if (!b) return;
    var a = b.dataset.accion, id = b.dataset.id, yo = EC.app.quien('vigilante');
    if (a === 'sonido') return;
    if (a === 'pestana') { u.sesion.guardar(CLAVE_PESTANA, b.dataset.valor); pintar(); }
    else if (a === 'papel') { abiertos[id] = !abiertos[id]; pintar(); }
    else if (a === 'aprobar') {
      // Su APROBAR es la firma del recurso preventivo: no queda aprobado hasta que firma con el dedo.
      var p = EC.app.estado.permisos.find(function (x) { return x.id === id; });
      if (!p) return;
      EC.firma.pedir({
        titulo: 'Aprobar · firma del recurso preventivo',
        cuerpo: resumenPermiso(p),
        texto: 'Firmo como recurso preventivo y autorizo la entrada.',
        boton: 'FIRMAR Y APROBAR'
      }).then(function (img) {
        if (!img) return;
        EC.app.cambiar(id, function (q) { return EC.permisos.aprobar(q, yo, img); }).then(function (r) {
          if (r) u.aviso('APROBADO · firmado por ' + yo, 'si');
          else u.aviso('No se ha podido aprobar: el permiso ya no está esperando', 'error');
        });
      });
    }
    else if (a === 'finalizar') finalizar(id, yo);
    else if (a === 'anular') EC.app.anular(id, 'vigilante');
    else if (a === 'denegar') {
      u.ventana({
        titulo: 'Denegar la entrada',
        cuerpo: '<label class="campo__etiqueta" for="motivo-denegar">Motivo (opcional)</label>' +
          '<textarea id="motivo-denegar" class="entrada" rows="3" maxlength="140" placeholder="Ej.: la foto del medidor no se lee"></textarea>',
        botones: [
          { texto: 'CANCELAR', clase: 'boton--neutro', valor: null },
          { texto: 'DENEGAR', clase: 'boton--no', valor: function (f) { return { motivo: f.querySelector('textarea').value.trim() }; } }
        ]
      }).then(function (r) {
        if (r) EC.app.cambiar(id, function (q) { return EC.permisos.denegar(q, yo, r.motivo); });
      });
    }
  }

  return {
    montar: function (el) {
      raiz = el;
      raiz.onclick = alPulsar;
      raiz.oninput = null;
      raiz.onchange = null;
      pintar();
      // Si ya se ha tocado la página (al elegir quién eres), el sonido se puede activar sin pedirlo.
      if (navigator.userActivation && navigator.userActivation.hasBeenActive) EC.sonido.activar().then(revisarSonido);
      if (!reloj) reloj = setInterval(revisarSonido, 1000);
      revisarSonido();
      revisarSumados();
    },
    alCambiar: function () { pintar(); revisarSonido(); revisarSumados(); }
  };
})();
