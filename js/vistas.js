/* Trozos de pantalla que usan varios papeles. */
EC.vistas = (function () {
  var u = EC.util;

  // Hueco del logotipo: si existe iconos/logo.png se ve; si no, el nombre en texto.
  function logo() {
    return '<div class="logo">' +
      '<img class="logo__img" src="iconos/logo.png" alt="Logotipo" onload="this.parentNode.classList.add(\'logo--imagen\')" onerror="this.remove()">' +
      '<span class="logo__texto">PARCITANK</span>' +
    '</div>';
  }

  function cabeceraPapel() {
    return '<header class="papel-cabecera">' +
      '<div class="papel-cabecera__logo">' + logo() + '</div>' +
      '<div class="papel-cabecera__titulo">' +
        '<p class="papel-cabecera__nombre">PERMISO DE ENTRADA<br><span>ESPACIOS CONFINADOS</span></p>' +
        '<p class="papel-cabecera__proc">Procedimientos para seguir:<br><b>PRL-PT-10 ESPACIOS CONFINADOS_V4</b><br><b>PRL-PT-14 PROCEDIMIENTO RESCATE ESPACIOS CONFINADOS REV.3_11-07-2024</b></p>' +
      '</div>' +
    '</header>';
  }

  function estado(p) {
    switch (p.estado) {
      case 'pendiente': return { color: 'amarillo', titulo: 'ESPERANDO APROBACIÓN', icono: 'reloj' };
      case 'aprobado': return { color: 'verde', titulo: 'APROBADO', icono: 'si' };
      case 'denegado': return { color: 'rojo', titulo: 'DENEGADO', icono: 'no' };
      case 'anulado': return { color: 'rojo', titulo: 'ANULADO', icono: 'no' };
      case 'alerta':
        return p.alerta.motivo === 'anulado'
          ? { color: 'rojo', titulo: 'ANULADO CON GENTE DENTRO', icono: 'alerta' }
          : { color: 'rojo', titulo: 'FIN DE TURNO CON GENTE DENTRO', icono: 'alerta' };
      default:
        return p.cierre && p.cierre.motivo === 'finalizado'
          ? { color: 'gris', titulo: 'FINALIZADO', icono: 'registro' }
          : { color: 'gris', titulo: 'CERRADO', icono: 'registro' };
    }
  }

  // Los que no pulsaron SALE y cuya salida confirmó el vigilante al finalizar.
  function marcadosPorVigilante(p) {
    var l = p.trabajadores.filter(function (t) { return t.salidaPorVigilante; });
    return l.length ? ' (el vigilante confirmó la salida de ' + l.map(function (t) { return t.nombre; }).join(', ') + ')' : '';
  }

  function textoCierre(p) {
    if (!p.cierre) return '';
    var c = p.cierre;
    if (c.motivo === 'finalizado') return 'Finalizado por ' + c.nombre + ' (VIGILANTE) a las ' + u.hora(c.hora) + marcadosPorVigilante(p);
    // «salida»: cierre automático al salir el último (la app ya no cierra así, pero se sigue mostrando).
    if (c.motivo === 'salida') return 'Cerrado a las ' + u.hora(c.hora) + ': han salido todos';
    if (c.motivo === 'anulado') {
      return quienAnulo(p) + (c.conGenteDentro ? ' con gente dentro; el último salió a las ' + u.hora(c.hora) + marcadosPorVigilante(p) : '');
    }
    var base = 'Cerrado por ' + EC.permisos.textoMotivo(c.motivo);
    if (c.conGenteDentro) return base + ' con gente dentro (' + u.hora(p.alerta.hora) + '); el último salió a las ' + u.hora(c.hora) + marcadosPorVigilante(p);
    return base + ' a las ' + u.hora(c.hora) + (p.aprobado ? '' : ' (sin aprobar)');
  }

  // Firma con el dedo en pequeño (se toca para verla en grande).
  // f: la imagen, o {img, hora} en las de los trabajadores.
  function firmaMini(f, nombre, clase) {
    var src = typeof f === 'string' ? f : f && f.img;
    if (!src || String(src).indexOf('data:image/') !== 0) return '';
    return '<img class="firma-img ' + (clase || 'firma-img--mini') + '" src="' + u.esc(src) + '" alt="Firma de ' + u.esc(nombre) + '" data-ampliar>';
  }

  // «Anulado por Ramón Iglesias Prieto (VIGILANTE) a las 10:42»
  function quienAnulo(p) {
    var a = p.anulado;
    return a ? 'Anulado por ' + a.nombre + ' (' + nombrePapel(a.papel) + ') a las ' + u.hora(a.hora) : '';
  }

  function crono(desde) {
    return '<span class="crono" data-crono="' + desde + '">' + u.duracion(Date.now() - desde) + '</span>';
  }

  // Botones para poner una foto: cámara y galería.
  // HACER FOTO abre la cámara dentro de la app (js/camara.js); si el navegador no puede,
  // usa la cámara del móvil con un campo de archivo. Los campos de archivo van encima de su botón,
  // transparentes, para que el toque les llegue directo (en algunos Android, si van escondidos, no se abre nada).
  function botonesFoto(clave, hecha, titulo, conQuitar) {
    function entrada(camara) {
      return '<input type="file" accept="image/*"' + (camara ? ' capture="environment"' : '') +
        ' class="foto-campo__entrada" data-foto="' + clave + '" aria-label="' + (camara ? 'Hacer foto con la cámara' : 'Elegir una foto de la galería') + '">';
    }
    var textoCamara = EC.icono('camara') + '<span>' + (hecha ? 'REPETIR' : u.esc(titulo)) + '</span>';
    return '<div class="foto-campo__botones">' +
        (EC.camara.hay()
          ? '<button type="button" class="boton boton--foto" data-accion="camara" data-clave="' + clave + '">' + textoCamara + '</button>'
          : '<label class="boton boton--foto">' + textoCamara + entrada(true) + '</label>') +
        '<label class="boton boton--foto boton--galeria">' + EC.icono('galeria') + '<span>GALERÍA</span>' + entrada(false) + '</label>' +
        (conQuitar ? '<button type="button" class="boton boton--neutro" data-accion="quitar-foto" data-clave="' + clave + '">QUITAR</button>' : '') +
      '</div>' +
      '<p class="foto-campo__estado" data-foto-estado="' + clave + '">¿No se abre la cámara? Prueba con GALERÍA, o abre la app en Chrome o instálala.</p>';
  }

  // Buscador grande (para usar con guantes). Sin tildes ni mayúsculas: ver EC.util.coincide.
  function buscador(id, texto, valor) {
    return '<label class="buscador" for="' + id + '">' + EC.icono('lupa') +
      '<input type="search" id="' + id + '" class="buscador__entrada" data-buscar placeholder="' + u.esc(texto) + '"' +
      ' value="' + u.esc(valor || '') + '" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label>';
  }

  // Mientras se prepara la foto, y si falla, se dice al lado de los botones.
  function estadoFoto(raiz, clave, texto, error) {
    var el = raiz.querySelector('[data-foto-estado="' + clave + '"]');
    if (!el) return;
    el.textContent = texto;
    el.classList.toggle('foto-campo__estado--error', !!error);
    el.classList.toggle('foto-campo__estado--cargando', !error);
  }

  function foto(src, texto) {
    if (!src) return '';
    return '<figure class="foto"><img src="' + src + '" alt="' + u.esc(texto) + '" data-ampliar>' +
      '<figcaption>' + u.esc(texto) + '</figcaption></figure>';
  }

  function oxigeno(p) {
    var ok = EC.reglas.oxigenoCorrecto(p.oxigeno);
    return '<div class="dato-oxigeno dato-oxigeno--' + (ok ? 'verde' : 'rojo') + '">' +
      '<span class="semaforo"></span><b>' + u.numero(p.oxigeno) + '</b><small>% O₂</small></div>';
  }

  function nombreTurno(p) {
    var t = EC.turnos.porId(p.turno);
    return t ? t.nombre : '—';
  }

  function validez(p) {
    if (p.creadoEnModoDemo && !p.finTurno) {
      return 'Permiso para el turno de ' + nombreTurno(p).toLowerCase() + ' del ' + u.fechaLarga(p.fecha) + ' · pedido en MODO DEMO, fuera de horario';
    }
    return 'Permiso válido para el turno de ' + nombreTurno(p).toLowerCase() + ' del ' + u.fechaLarga(p.fecha) +
      (p.finTurno ? ' hasta las ' + u.hora(p.finTurno) + (p.finTurnoMotivo === 'corte' ? ' (corte de mediodía)' : '') : '');
  }

  function resumenCondiciones(p) {
    var np = EC.reglas.CONDICIONES.filter(function (c) { return !c.oxigeno && p.condiciones[c.id] === 'np'; })
      .map(function (c) { return c.n; });
    return np.length ? 'Todo SÍ salvo N.P. en ' + np.join(', ') : 'Todas SÍ';
  }

  function trabajadores(p) {
    return '<ul class="lista-trabajadores">' + p.trabajadores.map(function (t) {
      var clase = t.salida ? 'fuera' : t.entrada ? 'dentro' : 'sin-entrar';
      var texto = t.salida ? 'Salió ' + u.hora(t.salida) + (t.salidaPorVigilante ? ' (lo marcó el vigilante)' : '')
        : t.entrada ? 'DENTRO desde ' + u.hora(t.entrada) : 'No ha entrado';
      return '<li class="lista-trabajadores__fila lista-trabajadores__fila--' + clase + '">' +
        EC.icono('persona') + '<span class="lista-trabajadores__nombre">' + u.esc(t.nombre) +
          // Los que se suman con AÑADIR OPERARIO después de aprobar.
          (t.anadido ? ' <small class="lista-trabajadores__anadido">AÑADIDO ' + u.hora(t.anadido.hora) + '</small>' : '') + '</span>' +
        '<span class="lista-trabajadores__estado">' + texto + '</span></li>';
    }).join('') + '</ul>';
  }

  function verificado(p) {
    if (!p.verificaciones.length) return '';
    var v = p.verificaciones[p.verificaciones.length - 1];
    return '<div class="sello-verificado">' + EC.icono('escudo') +
      '<div><b>VERIFICADO POR PREVENCIÓN</b><span>' + u.esc(v.nombre) + ' · ' + u.hora(v.hora) + '</span>' +
      (v.observaciones ? '<q>' + u.esc(v.observaciones) + '</q>' : '') + '</div>' + firmaMini(v.firma, v.nombre) + '</div>';
  }

  // Lo que se enseña de un permiso en el panel del vigilante y en prevención.
  function cuerpo(p) {
    return '<div class="cuadro__obra">' + EC.icono('deposito') +
        '<div><b>' + u.esc(p.seccion) + '</b><span>Obra/depósito ' + u.esc(p.obra) + '</span></div></div>' +
      '<p class="cuadro__trabajos">' + u.esc(p.trabajos) + '</p>' +
      '<div class="cuadro__datos">' +
        '<div class="cuadro__dato">' + oxigeno(p) + '</div>' +
        '<div class="cuadro__dato"><small>Pedido</small><b>' + u.hora(p.creado) + '</b><span>' + u.esc(p.pedidoPor.nombre) + '</span></div>' +
        '<div class="cuadro__dato"><small>Turno</small><b>' + u.esc(nombreTurno(p)) + '</b><span>' + resumenCondiciones(p) + '</span></div>' +
      '</div>' +
      trabajadores(p) +
      '<div class="cuadro__fotos">' + foto(p.fotoMedidor, 'Medidor de oxígeno') + foto(p.fotoBoca, 'Boca de entrada') + '</div>' +
      (p.aprobado ? '<p class="cuadro__firma">' + EC.icono('si') + '<span>Recurso preventivo: <b>' + u.esc(p.aprobado.nombre) + '</b> · ' + u.hora(p.aprobado.hora) + '</span>' +
        firmaMini(p.aprobado.firma, p.aprobado.nombre) + '</p>' : '') +
      verificado(p);
  }

  function marca(si) { return si ? '<span class="marca">X</span>' : ''; }
  function casilla(si) { return '<span class="casilla">' + (si ? 'X' : '') + '</span>'; }

  // El permiso con la misma maqueta que el papel, ya relleno.
  function papel(p) {
    var C = EC.reglas.CONDICIONES;
    function filaCond(c) {
      if (!c) return '<td></td><td></td><td></td><td></td>';
      var r = c.oxigeno ? (EC.reglas.oxigenoCorrecto(p.oxigeno) ? 'si' : 'no') : p.condiciones[c.id];
      return '<td>' + c.texto + (c.oxigeno ? ' <b>(' + u.numero(p.oxigeno) + ' %)</b>' : '') + '</td>' +
        '<td class="c">' + marca(r === 'si') + '</td><td class="c">' + marca(r === 'no') + '</td><td class="c">' + marca(r === 'np') + '</td>';
    }
    var filas = '';
    for (var i = 0; i < 3; i++) filas += '<tr>' + filaCond(C[i]) + filaCond(C[i + 3]) + '</tr>';

    // Como en el papel, de 4 en 4 columnas; sin límite de trabajadores, se añaden filas de 4.
    var grupos = [];
    for (var g = 0; g < Math.max(1, Math.ceil(p.trabajadores.length / 4)); g++) {
      grupos.push([0, 1, 2, 3].map(function (i) { return p.trabajadores[g * 4 + i] || null; }));
    }
    // Las firmas con el dedo; si un permiso no las tiene, se dice quién pulsó.
    function celdaNombre(t) {
      return '<td><small>Nombre y apellidos</small><b>' + (t ? u.esc(t.nombre) : '') + '</b>' +
        (t && t.anadido ? '<small>Añadido a las ' + u.hora(t.anadido.hora) + '</small>' : '') +
        '<small class="fdo">Fdo.:' + (t && !t.firma && t.entrada ? ' en la app, ' + u.esc(t.quienEntrada) + ' ' + u.hora(t.entrada) : '') + '</small>' +
        (t ? firmaMini(t.firma, t.nombre, 'firma-img--papel') : '') + '</td>';
    }
    function celdaHoras(t) {
      var a = t && p.aprobado;
      return '<td><small>Hora de entrada: <b>' + (t ? u.hora(t.entrada) : '') + '</b></small>' +
        '<small>Hora de salida: <b>' + (t ? u.hora(t.salida) : '') + '</b>' + (t && t.salidaPorVigilante ? ' (la marcó el vigilante)' : '') + '</small>' +
        '<small>Nombre y apellidos del <b>Recurso preventivo</b>:</small><b>' + (a ? u.esc(a.nombre) : '') + '</b>' +
        '<small class="fdo">Fdo.:' + (a ? (a.firma ? ' al APROBAR, ' : ' APROBAR ') + u.hora(a.hora) : '') + '</small>' +
        (a ? firmaMini(a.firma, a.nombre, 'firma-img--papel') : '') + '</td>';
    }
    var v = p.verificaciones[p.verificaciones.length - 1];

    return '<div class="papel">' +
      (p.anulado ? '<p class="papel-anulado">PERMISO ANULADO · ' + u.esc(quienAnulo(p)) + ' · Motivo: ' + u.esc(p.anulado.motivo) + '</p>' : '') +
      cabeceraPapel() +
      '<table class="papel-tabla papel-datos"><tr>' +
        '<td><small>Sección:</small> <b>' + u.esc(p.seccion) + '</b><br><small>Trabajos a realizar:</small> <b>' + u.esc(p.trabajos) + '</b></td>' +
        '<td><small>Nº de Obra/depósito:</small> <b>' + u.esc(p.obra) + '</b><br><small>Fecha:</small> <b>' + u.fechaLarga(p.fecha) + '</b><br>' +
        '<small>Hora Entrada:</small> <b>' + u.hora(EC.permisos.primeraEntrada(p)) + '</b><br><small>Hora Salida:</small> <b>' + u.hora(EC.permisos.ultimaSalida(p)) + '</b></td>' +
      '</tr></table>' +
      '<table class="papel-tabla papel-condiciones"><thead><tr>' +
        '<th>Condiciones</th><th>SI</th><th>NO</th><th>N.P.</th><th>Condiciones</th><th>SI</th><th>NO</th><th>N.P.</th>' +
      '</tr></thead><tbody>' + filas + '</tbody></table>' +
      '<div class="papel-franja">Equipos de protección a emplear</div>' +
      '<table class="papel-tabla papel-epis">' + EC.reglas.EPIS.map(function (e) {
        return '<tr><td>' + e.texto + ' ' + casilla(p.epis[e.id]) + '<br><small>' + (e.obligatorio ? 'Obligatorio' : 'Opcional') + '</small></td></tr>';
      }).join('') +
        '<tr><td><b>Se ha comprobado que los pasos anteriores según procedimiento se han cumplimentado.</b> ' + casilla(p.confirmado) +
          (p.trabajadores.some(function (t) { return t.firma; }) ? '<br><small>En la app lo confirma cada trabajador con su firma.</small>' : '') + '</td></tr>' +
        '<tr><td><b>Trabajador/es que accede/n a espacio confinado:</b></td></tr>' +
      '</table>' +
      grupos.map(function (cols) {
        return '<table class="papel-tabla papel-trabajadores"><tr>' + cols.map(celdaNombre).join('') + '</tr>' +
          '<tr>' + cols.map(celdaHoras).join('') + '</tr></table>';
      }).join('') +
      '<table class="papel-tabla papel-pie"><tr>' +
        '<td class="papel-validez">Permiso válido para una determinada jornada/turno de trabajo de la misma obra (si la obra se realiza en varias jornadas/turnos, establecer un permiso para cada turno de trabajo)<br><small>' + u.esc(validez(p)) + '</small></td>' +
        '<td><small>Se han verificado que los pasos anteriores se han cumplimentado al inicio de los trabajos.</small>' +
          '<small>Nombre y apellidos <b>verificador</b>:</small><b>' + (v ? u.esc(v.nombre) : '') + '</b>' +
          (v && v.observaciones ? '<small>Observaciones: ' + u.esc(v.observaciones) + '</small>' : '') +
          '<small class="fdo">Fdo.:' + (v ? ' VERIFICADO ' + u.hora(v.hora) : '') + '</small>' +
          (v ? firmaMini(v.firma, v.nombre, 'firma-img--papel') : '') + '</td>' +
      '</tr></table>' +
      '<div class="papel-fotos">' + foto(p.fotoMedidor, 'Medidor de oxígeno') + foto(p.fotoBoca, 'Boca de entrada') +
        p.verificaciones.map(function (x) { return foto(x.foto, 'Verificación de ' + x.nombre); }).join('') + '</div>' +
      '<h4 class="papel-firmas-titulo">Registro de la app (quién pulsó, desde qué papel y a qué hora)</h4>' +
      '<ol class="papel-firmas">' + p.eventos.map(function (e) {
        return '<li><time>' + u.fecha(e.hora) + ' ' + u.hora(e.hora) + '</time> <span class="papel-firmas__papel">' + nombrePapel(e.papel) + '</span> ' +
          '<b>' + u.esc(e.nombre) + '</b> · ' + u.esc(e.texto) + '</li>';
      }).join('') + '</ol>' +
    '</div>';
  }

  function nombrePapel(id) {
    return { operario: 'OPERARIO', vigilante: 'VIGILANTE', prevencion: 'PREVENCIÓN', sistema: 'APP' }[id] || id;
  }

  return {
    logo: logo, cabeceraPapel: cabeceraPapel, estado: estado, textoCierre: textoCierre, quienAnulo: quienAnulo, crono: crono,
    foto: foto, botonesFoto: botonesFoto, estadoFoto: estadoFoto, buscador: buscador,
    oxigeno: oxigeno, nombreTurno: nombreTurno, validez: validez, trabajadores: trabajadores,
    verificado: verificado, cuerpo: cuerpo, papel: papel, nombrePapel: nombrePapel, firmaMini: firmaMini
  };
})();
