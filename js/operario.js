/* Pantalla del OPERARIO: pide el permiso, espera, y apunta entradas y salidas. */
EC.pantallas.operario = (function () {
  var u = EC.util, R = EC.reglas;
  var CLAVE_ACTUAL = 'ec_permiso_actual', CLAVE_BORRADOR = 'ec_borrador';
  var raiz, borrador, vistos = {}, busquedaTrab = '', desplegado = false;
  // Al pulsar ENTRA, en el mismo sitio sale SALE: un doble toque apuntaba también la salida.
  // Un SALE en los primeros segundos después de ENTRA (en este móvil) no cuenta.
  var ESPERA_SALE_MS = 2000, recienEntrado = {};

  /* ---------- datos ---------- */

  function vacio() {
    return {
      seccion: '', obra: '', trabajos: '', turno: EC.turnos.porDefecto(Date.now()),
      condiciones: { c1: null, c2: null, c3: null, c5: null, c6: null },
      oxigeno: '', fotoMedidor: null, fotoBoca: null,
      epis: { filtracion: false, respiratoria: false, medidor: false },
      trabajadores: [], firmas: {}, renovadoDe: null
    };
  }

  function guardarBorrador() { u.sesion.guardar(CLAVE_BORRADOR, borrador); }
  function quien() { return EC.app.quien('operario'); }
  function modoDemo() { return EC.app.estado.ajustes.modoDemo; }

  function permisoActual() {
    var id = u.sesion.leer(CLAVE_ACTUAL);
    return id ? EC.app.estado.permisos.find(function (p) { return p.id === id; }) || null : null;
  }

  function ponerActual(id) { u.sesion.guardar(CLAVE_ACTUAL, id); }

  /* ---------- formulario ---------- */

  function bloque(n, titulo, contenido, clase) {
    return '<section class="bloque ' + (clase || '') + '">' +
      '<h2 class="bloque__titulo"><span class="bloque__num">' + n + '</span>' + titulo + '</h2>' + contenido + '</section>';
  }

  function campo(id, etiqueta, contenido) {
    return '<div class="campo" data-campo="' + id + '">' +
      (etiqueta ? '<p class="campo__etiqueta">' + etiqueta + '</p>' : '') + contenido +
      '<p class="campo__error" aria-live="polite"></p></div>';
  }

  function htmlTurnos() {
    var ahora = Date.now();
    return EC.turnos.lista().map(function (t) {
      var marcha = !!EC.turnos.tramoEnMarcha(t.id, ahora);
      return '<button type="button" class="ficha ficha--turno' + (borrador.turno === t.id ? ' ficha--elegida' : '') +
        (!marcha && !modoDemo() ? ' ficha--apagada' : '') + '" data-accion="turno" data-valor="' + t.id + '">' +
        '<b>' + t.nombre + '</b><small>' + EC.turnos.horario(t.id) + (marcha ? ' · EN MARCHA' : '') + '</small></button>';
    }).join('');
  }

  function htmlSiNo(c) {
    var r = borrador.condiciones[c.id];
    return '<div class="condicion" data-campo="' + c.id + '">' +
      '<p class="condicion__texto"><span class="condicion__n">' + c.n + '</span>' + c.texto + '</p>' +
      '<div class="sino">' + [['si', 'SÍ'], ['no', 'NO'], ['np', 'N.P.']].map(function (o) {
        return '<button type="button" class="sino__b sino__b--' + o[0] + (r === o[0] ? ' sino__b--elegido' : '') +
          '" data-accion="cond" data-id="' + c.id + '" data-valor="' + o[0] + '">' + o[1] + '</button>';
      }).join('') + '</div>' +
      '<p class="campo__error" aria-live="polite"></p></div>';
  }

  function claseOxigeno() {
    var o = R.leerOxigeno(borrador.oxigeno);
    if (borrador.oxigeno === '' || borrador.oxigeno == null) return 'vacio';
    return R.oxigenoCorrecto(o) ? 'verde' : 'rojo';
  }

  function htmlOxigeno(c) {
    return '<div class="condicion condicion--oxigeno" data-campo="c4">' +
      '<p class="condicion__texto"><span class="condicion__n">4</span>' + c.texto + '</p>' +
      '<label class="oxigeno oxigeno--' + claseOxigeno() + '">' +
        '<span class="semaforo semaforo--grande"></span>' +
        '<input class="oxigeno__entrada" data-entrada="oxigeno" inputmode="decimal" autocomplete="off" placeholder="--,-" maxlength="5" value="' + u.esc(borrador.oxigeno) + '" aria-label="Oxígeno medido en %">' +
        '<span class="oxigeno__unidad">% O₂</span>' +
      '</label>' +
      '<p class="oxigeno__rango">Valor medido. Verde entre ' + u.numero(EC.config.OXIGENO_MIN) + ' y ' + u.numero(EC.config.OXIGENO_MAX) + ' %</p>' +
      '<p class="campo__error" aria-live="polite"></p>' +
      htmlFoto('fotoMedidor', 'FOTO DE LA PANTALLA DEL MEDIDOR', true) +
    '</div>';
  }

  function htmlFoto(clave, titulo, obligatoria) {
    var src = borrador[clave];
    return '<div class="foto-campo' + (src ? ' foto-campo--hecha' : '') + '" data-campo="' + clave + '">' +
      (src ? '<img src="' + src + '" alt="' + u.esc(titulo) + '" data-ampliar>' : '') +
      EC.vistas.botonesFoto(clave, !!src, titulo, !!src && !obligatoria) +
      '<small class="foto-campo__nota">' + (obligatoria ? 'OBLIGATORIA' : 'OPCIONAL') + '</small>' +
    '</div>';
  }

  function htmlEpis() {
    return R.EPIS.map(function (e) {
      var si = borrador.epis[e.id];
      return '<button type="button" class="casilla-grande' + (si ? ' casilla-grande--marcada' : '') + '" data-accion="epi" data-id="' + e.id + '" aria-pressed="' + si + '">' +
        '<span class="casilla-grande__caja">' + EC.icono('si') + '</span>' +
        '<span class="casilla-grande__texto">' + e.texto + '<small class="' + (e.obligatorio ? 'obligatorio' : '') + '">' + (e.obligatorio ? 'OBLIGATORIO' : 'OPCIONAL') + '</small></span>' +
      '</button>';
    }).join('');
  }

  /* ---------- trabajadores que acceden (al final del formulario) ----------
     Se eligen de uno en uno con «+ AÑADIR TRABAJADOR» (buscador y plantilla en un desplegable):
     al elegir a alguien, la lista se pliega y aparece su casilla con «Confirmo que se han cumplido
     todos los pasos anteriores» y el recuadro para firmar con el dedo (js/firma.js).
     Sin límite de trabajadores. La firma sustituye a la casilla general «Se ha comprobado…». */

  var TEXTO_CONFIRMO = 'Confirmo que se han cumplido todos los pasos anteriores.';

  // En el desplegable (y en la ventana de AÑADIR OPERARIO): ya: si ya está en la lista.
  function botonTrabajador(t, ya, accion) {
    var cad = EC.datos.caducidad(t);
    return '<button type="button" class="trabajador' + (ya ? ' trabajador--elegido' : '') + (cad ? ' trabajador--caducado' : '') +
      '" data-' + (accion || 'accion="trabajador" data-id') + '="' + t.id + '"' + (ya ? ' disabled' : '') + '>' +
      '<span class="trabajador__marca">' + EC.icono(ya ? 'si' : 'persona') + '</span>' +
      '<span class="trabajador__nombre">' + u.esc(t.nombre) +
        '<small>' + (ya ? 'YA ESTÁ EN LA LISTA' : cad ? cad.toUpperCase() : 'Curso y apto en regla') + '</small></span>' +
    '</button>';
  }

  function listaDesplegable() {
    return EC.datos.plantillaOrdenada().map(function (t) { return botonTrabajador(t, borrador.trabajadores.indexOf(t.id) >= 0); }).join('');
  }

  function htmlTarjeta(id, i) {
    var t = EC.datos.trabajador(id);
    if (!t) return '';
    var cad = EC.datos.caducidad(t), f = borrador.firmas[id];
    return '<li class="tarjeta-trab' + (cad ? ' tarjeta-trab--caducado' : f ? ' tarjeta-trab--firmada' : '') + '" data-tarjeta="' + id + '">' +
      '<div class="tarjeta-trab__cabeza"><span class="tarjeta-trab__num">' + (i + 1) + '</span>' +
        '<b class="tarjeta-trab__nombre">' + u.esc(t.nombre) + '</b>' +
        '<button type="button" class="boton boton--neutro tarjeta-trab__quitar" data-accion="quitar-trabajador" data-id="' + id + '">QUITAR</button></div>' +
      (cad
        ? '<p class="tarjeta-trab__aviso">' + EC.icono('alerta') + '<span>' + cad.toUpperCase() + ': no puede entrar. Quítalo de la lista.</span></p>'
        : f
          ? '<div class="tarjeta-trab__firmada"><img class="firma-img" src="' + f.img + '" alt="Firma de ' + u.esc(t.nombre) + '">' +
              '<span>' + EC.icono('si') + 'Firmado a las ' + u.hora(f.hora) + '</span>' +
              '<button type="button" class="boton boton--neutro" data-accion="repetir-firma" data-id="' + id + '">REPETIR</button></div>'
          : '<p class="tarjeta-trab__texto">' + TEXTO_CONFIRMO + '</p><div class="tarjeta-trab__firma" data-firma-de="' + id + '"></div>') +
    '</li>';
  }

  function htmlTarjetas() {
    if (!borrador.trabajadores.length) {
      return '<p class="tarjetas-trab__vacio">Todavía no hay nadie. Añade uno a uno a los que van a entrar: cada uno firma en su casilla.</p>';
    }
    return '<ol class="tarjetas-trab">' + borrador.trabajadores.map(htmlTarjeta).join('') + '</ol>';
  }

  // Pone el recuadro de firma en las casillas que todavía no han firmado.
  function montarFirmas(dentroDe) {
    (dentroDe || raiz).querySelectorAll('[data-firma-de]').forEach(function (caja) {
      if (caja.dataset.montada) return;
      caja.dataset.montada = '1';
      var id = caja.dataset.firmaDe;
      EC.firma.crear(caja, { textoAceptar: 'ACEPTAR FIRMA', alAceptar: function (img) {
        borrador.firmas[id] = { img: img, hora: Date.now() };
        repintarTarjeta(id);
        cambiado();
      } });
    });
  }

  // Solo se toca la casilla que cambia: así no se pierde una firma a medias en otra.
  function repintarTarjeta(id) {
    var li = raiz.querySelector('[data-tarjeta="' + id + '"]');
    if (!li) return;
    li.outerHTML = htmlTarjeta(id, borrador.trabajadores.indexOf(id));
    montarFirmas(raiz.querySelector('[data-tarjeta="' + id + '"]'));
  }

  function anadirTarjeta(id) {
    var hueco = raiz.querySelector('[data-trabajadores]');
    var lista = hueco.querySelector('.tarjetas-trab');
    if (!lista) hueco.innerHTML = htmlTarjetas();
    else lista.insertAdjacentHTML('beforeend', htmlTarjeta(id, borrador.trabajadores.length - 1));
    var li = raiz.querySelector('[data-tarjeta="' + id + '"]');
    montarFirmas(li);
    li.scrollIntoView({ block: 'center' });
  }

  function quitarTarjeta(id) {
    var li = raiz.querySelector('[data-tarjeta="' + id + '"]');
    if (li) li.remove();
    if (!borrador.trabajadores.length) raiz.querySelector('[data-trabajadores]').innerHTML = htmlTarjetas();
    else raiz.querySelectorAll('.tarjeta-trab__num').forEach(function (n, i) { n.textContent = i + 1; });
  }

  function htmlDesplegable() {
    return '<button type="button" class="boton boton--ancho boton--desplegar" data-accion="desplegar" aria-expanded="' + desplegado + '">' +
        (desplegado ? 'PLEGAR LA LISTA ▴' : '+ AÑADIR TRABAJADOR ▾') + '</button>' +
      '<div class="desplegable" data-desplegable' + (desplegado ? '' : ' hidden') + '>' +
        EC.vistas.buscador('buscar-trabajador', 'Nombre o apellido', busquedaTrab) +
        '<div class="desplegable__lista">' + listaDesplegable() + '</div>' +
        '<p class="buscador__nada" hidden></p>' +
        '<button type="button" class="boton boton--neutro boton--ancho" data-accion="plegar">CERRAR LA LISTA ▴</button>' +
      '</div>';
  }

  function actualizarDesplegable() {
    var boton = raiz.querySelector('[data-accion="desplegar"]');
    boton.textContent = desplegado ? 'PLEGAR LA LISTA ▴' : '+ AÑADIR TRABAJADOR ▾';
    boton.setAttribute('aria-expanded', desplegado);
    raiz.querySelector('[data-desplegable]').hidden = !desplegado;
    raiz.querySelector('.desplegable__lista').innerHTML = listaDesplegable();
    filtrarTrabajadores();
  }

  function filtrarTrabajadores(dentroDe, texto) {
    var zona = dentroDe || raiz.querySelector('.desplegable'), hay = 0;
    texto = texto == null ? busquedaTrab : texto;
    zona.querySelectorAll('.trabajador').forEach(function (b) {
      var si = u.coincide(b.querySelector('.trabajador__nombre').firstChild.textContent, texto);
      b.hidden = !si;
      if (si) hay++;
    });
    var nada = zona.querySelector('.buscador__nada');
    nada.hidden = hay > 0;
    nada.textContent = 'Nadie coincide con «' + texto.trim() + '».';
  }

  function htmlValidez() {
    var t = EC.turnos.porId(borrador.turno);
    var tramo = t && EC.turnos.tramoEnMarcha(t.id, Date.now());
    var texto = !t ? 'Elige el turno.' :
      tramo ? 'Este permiso valdrá para el turno de ' + t.nombre.toLowerCase() + ' de hoy hasta las ' + u.hora(tramo.fin) + (tramo.motivo === 'corte' ? ' (corte de mediodía: luego hay que renovarlo)' : '') + '.' :
      'MODO DEMO: el turno de ' + t.nombre.toLowerCase() + ' no está en marcha; el permiso no se cerrará solo.';
    return '<div class="validez"><b>Permiso válido para una determinada jornada/turno de trabajo de la misma obra.</b><span data-validez>' + texto + '</span></div>';
  }

  /* ---------- permisos pedidos desde este móvil ----------
     Los pidiera quien los pidiera y fuera cual fuera la sección. Se ven los activos y,
     durante RECIENTES_MS, los denegados o anulados, para que nadie se quede sin saberlo. */
  var RECIENTES_MS = 30 * 60000;

  function deEsteMovil(p) { return p.movil && p.movil === EC.app.movil(); }

  function horaFinal(p) {
    return (p.denegado && p.denegado.hora) || (p.anulado && p.anulado.hora) || 0;
  }

  function permisosDelMovil() {
    var desde = Date.now() - RECIENTES_MS;
    return EC.app.estado.permisos.filter(function (p) {
      return deEsteMovil(p) && (EC.permisos.activo(p) ||
        ((p.estado === 'denegado' || p.estado === 'anulado') && horaFinal(p) >= desde));
    });
  }

  function etiquetaEstado(p) {
    var n = EC.permisos.dentro(p).length;
    switch (p.estado) {
      case 'pendiente': return 'ESPERANDO AL VIGILANTE';
      case 'aprobado': return 'APROBADO · ' + (n ? 'DENTRO: ' + n : 'PUEDEN ENTRAR');
      case 'alerta': return (p.alerta.motivo === 'anulado' ? 'ANULADO' : 'FIN DE TURNO') + ' · SALID YA';
      case 'denegado': return 'DENEGADO';
      case 'anulado': return 'ANULADO';
      default: return 'CERRADO';
    }
  }

  // Orden de la franja: primero las alarmas, luego los aprobados, los que esperan y los cerrados.
  var PRIORIDAD = { alerta: 0, aprobado: 1, pendiente: 2, denegado: 3, anulado: 3 };

  function esAlarmaDeAnulacion(p) { return p.estado === 'alerta' && p.alerta.motivo === 'anulado'; }

  // La franja de arriba: todos los del móvil menos el que se está mirando.
  function htmlMisActivos() {
    var actual = u.sesion.leer(CLAVE_ACTUAL);
    var lista = permisosDelMovil().filter(function (p) { return p.id !== actual; }).sort(function (a, b) {
      return (PRIORIDAD[a.estado] - PRIORIDAD[b.estado]) || (a.creado - b.creado);
    });
    if (!lista.length) return '';
    return '<section class="mis-permisos" aria-label="Permisos pedidos desde este móvil">' +
      '<h2 class="mis-permisos__titulo">' + (actual ? 'OTROS PERMISOS DE ESTE MÓVIL' : 'PERMISOS PEDIDOS DESDE ESTE MÓVIL') + '</h2>' +
      lista.map(function (p) {
        return '<button type="button" class="mi-permiso mi-permiso--' + EC.vistas.estado(p).color + (p.estado === 'alerta' ? ' mi-permiso--alarma' : '') +
          '" data-accion="abrir" data-id="' + p.id + '">' +
          '<span class="mi-permiso__estado">' + etiquetaEstado(p) + '</span>' +
          '<span class="mi-permiso__obra">' + u.esc(p.seccion) + ' · Obra ' + u.esc(p.obra) + '</span>' +
          '<span class="mi-permiso__gente">' + p.trabajadores.map(function (t) { return u.esc(t.nombre); }).join(', ') + '</span>' +
        '</button>';
      }).join('') +
    '</section>';
  }

  // Si cambia un permiso del móvil que no se está mirando: vibra y sale un aviso grande que lo abre.
  // Si se ha ANULADO con gente dentro, no se avisa: la pantalla salta sola a él (devuelve su id).
  function avisarCambios() {
    var actual = u.sesion.leer(CLAVE_ACTUAL), saltar = null;
    EC.app.estado.permisos.filter(deEsteMovil).forEach(function (p) {
      if (p.id === actual) return; // del que se está mirando se encarga alCambiar
      var antes = vistos[p.id];
      vistos[p.id] = p.estado;
      if (!antes || antes === p.estado) return;
      if (esAlarmaDeAnulacion(p)) { if (!saltar) saltar = p.id; return; }
      if (['aprobado', 'denegado', 'anulado', 'alerta'].indexOf(p.estado) < 0) return;
      avisoPermiso(p);
    });
    return saltar;
  }

  // La primera alarma de anulación de este móvil (la más antigua), si la hay.
  function primeraAlarma() {
    return EC.app.estado.permisos.filter(function (p) { return deEsteMovil(p) && esAlarmaDeAnulacion(p); })
      .sort(function (a, b) { return a.alerta.hora - b.alerta.hora; })[0] || null;
  }

  // ¿Se había empezado a rellenar el formulario? Entonces no se tira al volver a él.
  function borradorConDatos() {
    var b = borrador;
    return !!(b.seccion || String(b.obra || '').trim() || String(b.trabajos || '').trim() || b.trabajadores.length ||
      b.fotoMedidor || b.fotoBoca || b.oxigeno || Object.keys(b.firmas || {}).length ||
      Object.keys(b.condiciones).some(function (k) { return b.condiciones[k]; }));
  }

  /* ---------- alarma de anulación (js/sonido.js) ----------
     Suena mientras algún permiso de este móvil esté ANULADO con gente dentro (se esté mirando o no). */
  var ultimaAlarma = 0, relojAlarma = null;

  function hayAlarmaEnElMovil() {
    return EC.app.estado.permisos.some(function (p) {
      return deEsteMovil(p) && p.estado === 'alerta' && p.alerta.motivo === 'anulado';
    });
  }

  function enPantallaDeOperario() {
    return !!(raiz && raiz.querySelector('main.operario, main.estado'));
  }

  function htmlAvisoSonido() {
    return hayAlarmaEnElMovil() ? EC.sonido.htmlAviso('TOCA AQUÍ PARA QUE SUENE LA ALARMA') : '';
  }

  function actualizarAvisoSonido() {
    if (!enPantallaDeOperario()) return;
    var hueco = raiz.querySelector('[data-aviso-sonido]');
    if (hueco) hueco.innerHTML = htmlAvisoSonido();
  }
  EC.sonido.alCambiar(actualizarAvisoSonido);

  function revisarAlarma() {
    if (!enPantallaDeOperario()) return;
    actualizarAvisoSonido();
    if (!hayAlarmaEnElMovil()) return;
    var ahora = Date.now();
    // Se revisa cada segundo: el margen de medio segundo evita que se vaya al segundo siguiente.
    if (ahora - ultimaAlarma >= EC.config.ALARMA_CADA_MS - 500 && EC.sonido.alarma()) ultimaAlarma = ahora;
  }

  function avisoPermiso(p) {
    var e = EC.vistas.estado(p);
    var viejo = document.querySelector('.aviso-permiso[data-id="' + p.id + '"]');
    if (viejo) viejo.remove();
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'aviso-permiso aviso-permiso--' + e.color;
    b.dataset.id = p.id;
    b.innerHTML = '<b>' + etiquetaEstado(p) + '</b>' +
      '<span>' + u.esc(p.seccion) + ' · Obra ' + u.esc(p.obra) + ' · ' + p.trabajadores.map(function (t) { return u.esc(t.nombre); }).join(', ') + '</span>' +
      '<small>Toca para verlo</small>';
    b.addEventListener('click', function () {
      b.remove();
      if (!raiz.isConnected || !raiz.querySelector('main.operario, main.estado')) return;
      ponerActual(p.id);
      pintar();
    });
    document.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 10000);
    if (p.estado === 'aprobado') u.vibrar([400, 150, 400, 150, 900]);
    else if (p.estado === 'alerta') u.vibrar([1000, 200, 1000, 200, 1000]);
    else u.vibrar([900]);
  }

  function pintarFormulario() {
    document.body.className = '';
    var cond = R.CONDICIONES.map(function (c) { return c.oxigeno ? htmlOxigeno(c) : htmlSiNo(c); }).join('');
    raiz.innerHTML =
      '<main class="operario">' + EC.app.barra('operario') +
        '<div data-aviso-sonido>' + htmlAvisoSonido() + '</div>' +
        '<div data-mis-activos>' + htmlMisActivos() + '</div>' +
        (borrador.renovadoDe ? '<p class="renovando">' + EC.icono('renovar') + 'RENOVACIÓN: se han copiado sección, obra, trabajos y EPIs del permiso anterior. Vuelve a comprobar las condiciones, medir el oxígeno, hacer la foto del medidor y elegir a los trabajadores de este turno.</p>' : '') +
        '<form class="formulario" autocomplete="off" onsubmit="return false">' +
          bloque(1, 'DATOS',
            campo('seccion', 'Sección', '<div class="fichas">' + EC.config.SECCIONES.map(function (s) {
              return '<button type="button" class="ficha' + (borrador.seccion === s ? ' ficha--elegida' : '') + '" data-accion="seccion" data-valor="' + u.esc(s) + '">' + u.esc(s) + '</button>';
            }).join('') + '</div>') +
            campo('obra', 'Nº de obra/depósito', '<input class="entrada entrada--grande" data-entrada="obra" maxlength="20" value="' + u.esc(borrador.obra) + '" aria-label="Nº de obra/depósito">') +
            campo('trabajos', 'Trabajos a realizar', '<input class="entrada" data-entrada="trabajos" maxlength="80" placeholder="Ej.: soldadura interior de virola" value="' + u.esc(borrador.trabajos) + '" aria-label="Trabajos a realizar">') +
            campo('turno', 'Turno', '<div class="fichas fichas--turnos" data-turnos>' + htmlTurnos() + '</div>') +
            '<p class="nota">Fecha: <b>' + u.fecha(Date.now()) + '</b>. Las horas de entrada y salida se guardan solas.</p>') +
          bloque(2, 'CONDICIONES', cond) +
          bloque(3, 'EQUIPOS DE PROTECCIÓN A EMPLEAR', campo('epis', '', htmlEpis()), 'bloque--franja') +
          bloque(4, 'FOTO DE LA BOCA DE ENTRADA', htmlFoto('fotoBoca', 'FOTO DE LA BOCA', false)) +
          // Al final: cada trabajador que entra firma que se han cumplido todos los pasos anteriores.
          bloque(5, 'TRABAJADORES QUE ACCEDEN', campo('trabajadores', '',
            '<p class="nota">Cada trabajador que va a entrar firma con el dedo en su casilla. Sin todas las firmas no se puede pedir.</p>' +
            '<div data-trabajadores>' + htmlTarjetas() + '</div>' + htmlDesplegable())) +
          htmlValidez() +
          '<div class="pedir">' +
            '<ul class="bloqueos" data-bloqueos></ul>' +
            '<button type="button" class="boton-pedir" data-accion="pedir">' + EC.icono('entrar') + 'PEDIR ENTRADA</button>' +
          '</div>' +
        '</form>' +
      '</main>';
    montarFirmas();
    if (busquedaTrab) filtrarTrabajadores();
    actualizarBloqueos();
  }

  function actualizarBloqueos() {
    var lista = R.bloqueos(borrador, modoDemo(), Date.now());
    var ul = raiz.querySelector('[data-bloqueos]');
    if (!ul) return;
    ul.innerHTML = lista.length
      ? '<li class="bloqueos__titulo">' + EC.icono('alerta') + 'NO SE PUEDE PEDIR TODAVÍA</li>' + lista.map(function (b) {
          return '<li class="bloqueos__fila' + (b.grave ? ' bloqueos__fila--grave' : '') + '">' + u.esc(b.texto) + '</li>';
        }).join('')
      : '';
    var boton = raiz.querySelector('[data-accion="pedir"]');
    boton.disabled = lista.length > 0;
    boton.classList.toggle('boton-pedir--listo', lista.length === 0);

    // En rojo al lado de cada campo, solo lo que está mal (no lo que falta).
    raiz.querySelectorAll('[data-campo]').forEach(function (el) {
      var mal = lista.filter(function (b) { return b.grave && b.campo === el.dataset.campo; });
      el.classList.toggle('campo--mal', mal.length > 0);
      var err = el.querySelector(':scope > .campo__error');
      if (err) err.textContent = mal.map(function (b) { return b.texto; }).join(' · ');
    });
  }

  function marcar(selector, valor) {
    raiz.querySelectorAll(selector).forEach(function (b) {
      b.classList.toggle(b.classList.contains('sino__b') ? 'sino__b--elegido' : 'ficha--elegida', b.dataset.valor === valor);
    });
  }

  function cambiado() { guardarBorrador(); actualizarBloqueos(); }

  function alPulsarFormulario(el) {
    var a = el.dataset.accion;
    if (a === 'seccion') { borrador.seccion = el.dataset.valor; marcar('[data-accion="seccion"]', borrador.seccion); }
    else if (a === 'turno') {
      borrador.turno = el.dataset.valor;
      marcar('[data-accion="turno"]', borrador.turno);
      raiz.querySelector('[data-validez]').parentNode.outerHTML = htmlValidez();
    }
    else if (a === 'cond') { borrador.condiciones[el.dataset.id] = el.dataset.valor; marcar('[data-accion="cond"][data-id="' + el.dataset.id + '"]', el.dataset.valor); }
    else if (a === 'epi') {
      borrador.epis[el.dataset.id] = !borrador.epis[el.dataset.id];
      el.classList.toggle('casilla-grande--marcada', borrador.epis[el.dataset.id]);
      el.setAttribute('aria-pressed', borrador.epis[el.dataset.id]);
    }
    else if (a === 'trabajador') {
      // De uno en uno: se añade, la lista se pliega y aparece su casilla para firmar.
      var id = el.dataset.id;
      if (borrador.trabajadores.indexOf(id) >= 0) return;
      borrador.trabajadores.push(id);
      desplegado = false;
      busquedaTrab = '';
      raiz.querySelector('#buscar-trabajador').value = '';
      actualizarDesplegable();
      anadirTarjeta(id);
    }
    else if (a === 'quitar-trabajador') {
      // Si se quita a alguien antes de pedir, se va también su firma.
      borrador.trabajadores = borrador.trabajadores.filter(function (x) { return x !== el.dataset.id; });
      delete borrador.firmas[el.dataset.id];
      quitarTarjeta(el.dataset.id);
      actualizarDesplegable();
    }
    else if (a === 'repetir-firma') {
      delete borrador.firmas[el.dataset.id];
      repintarTarjeta(el.dataset.id);
    }
    else if (a === 'desplegar' || a === 'plegar') {
      desplegado = a === 'desplegar' ? !desplegado : false;
      actualizarDesplegable();
      return;
    }
    else if (a === 'quitar-foto') {
      borrador[el.dataset.clave] = null;
      repintarFoto(el.dataset.clave);
    }
    else if (a === 'camara') { hacerFoto(el.dataset.clave); return; }
    else if (a === 'abrir') { ponerActual(el.dataset.id); pintar(); return; }
    else if (a === 'pedir') { pedir(); return; }
    else return;
    cambiado();
  }

  function repintarFoto(clave) {
    var el = raiz.querySelector('.foto-campo[data-campo="' + clave + '"]');
    el.outerHTML = htmlFoto(clave, clave === 'fotoMedidor' ? 'FOTO DE LA PANTALLA DEL MEDIDOR' : 'FOTO DE LA BOCA', clave === 'fotoMedidor');
  }

  function alEscribir(e) {
    if (e.target.id === 'buscar-trabajador') {
      busquedaTrab = e.target.value;
      filtrarTrabajadores();
      return;
    }
    var c = e.target.dataset.entrada;
    if (!c) return;
    borrador[c] = e.target.value;
    if (c === 'oxigeno') {
      var caja = raiz.querySelector('.oxigeno');
      caja.className = 'oxigeno oxigeno--' + claseOxigeno();
    }
    cambiado();
  }

  // Con la cámara dentro de la app (js/camara.js).
  function hacerFoto(clave) {
    EC.camara.sacarFoto().then(function (src) {
      if (!src) return;
      borrador[clave] = src;
      repintarFoto(clave);
      cambiado();
    }).catch(function (err) {
      EC.vistas.estadoFoto(raiz, clave, err.message, true);
      u.aviso(err.message, 'error');
    });
  }

  function alElegirFoto(e) {
    var clave = e.target.dataset.foto;
    var archivo = e.target.files && e.target.files[0];
    if (!clave || !archivo) return;
    EC.vistas.estadoFoto(raiz, clave, 'PREPARANDO FOTO…');
    u.reducirFoto(archivo).then(function (src) {
      borrador[clave] = src;
      repintarFoto(clave);
      cambiado();
    }).catch(function (err) {
      EC.vistas.estadoFoto(raiz, clave, err.message, true);
      u.aviso(err.message, 'error');
    });
  }

  function pedir() {
    var ahora = Date.now();
    if (R.bloqueos(borrador, modoDemo(), ahora).length) return;
    var p = EC.permisos.crear(borrador, quien(), modoDemo(), ahora, EC.app.movil());
    EC.almacen.crear(p).then(function () {
      vistos[p.id] = p.estado;
      ponerActual(p.id);
      borrador = vacio();
      guardarBorrador();
      // Firebase puede tardar en avisar: mientras, se enseña el permiso tal y como se ha pedido.
      if (!permisoActual()) EC.app.estado.permisos.push(p);
      pintar();
    }).catch(EC.app.fallo);
  }

  /* ---------- después de pedir ---------- */

  function filaTrabajador(p, t, i) {
    var accion = '';
    if (!t.entrada && p.estado === 'aprobado') {
      accion = '<button type="button" class="boton boton--entra" data-accion="entra" data-i="' + i + '">' + EC.icono('entrar') + 'ENTRA</button>';
    } else if (t.entrada && !t.salida) {
      accion = '<button type="button" class="boton boton--sale" data-accion="sale" data-i="' + i + '">' + EC.icono('salir') + 'SALE</button>';
    }
    var texto = t.salida ? 'Entró ' + u.hora(t.entrada) + ' · salió ' + u.hora(t.salida) + (t.salidaPorVigilante ? ' (lo marcó el vigilante)' : '')
      : t.entrada ? 'DENTRO desde ' + u.hora(t.entrada)
      : p.estado === 'aprobado' ? (t.anadido ? 'Añadido a las ' + u.hora(t.anadido.hora) + ' · todavía fuera' : 'Todavía fuera') : 'No entró';
    return '<li class="control__fila' + (t.entrada && !t.salida ? ' control__fila--dentro' : '') + '">' +
      '<span class="control__nombre"><b>' + u.esc(t.nombre) + '</b><small>' + texto + '</small></span>' + accion + '</li>';
  }

  function control(p) {
    var n = EC.permisos.dentro(p).length;
    return '<ul class="control">' + p.trabajadores.map(function (t, i) { return filaTrabajador(p, t, i); }).join('') + '</ul>' +
      (n ? '<button type="button" class="boton boton--sale boton--ancho" data-accion="salen-todos">' + EC.icono('salir') + 'SALEN TODOS (' + n + ')</button>' : '') +
      (p.estado === 'aprobado'
        ? '<button type="button" class="boton boton--blanco boton--ancho control__anadir" data-accion="anadir-operario">' + EC.icono('persona') + '+ AÑADIR OPERARIO</button>' +
          '<p class="estado__nota">El permiso sigue abierto, aunque no quede nadie dentro, hasta que el vigilante lo finalice.</p>'
        : '');
  }

  // AÑADIR OPERARIO a un permiso aprobado: se elige (misma comprobación de curso y apto),
  // firma la confirmación y ya puede pulsar ENTRA. Va en una ventana aparte porque la pantalla
  // verde se repinta sola con cada cambio y borraría una firma a medias.
  function anadirOperario(p) {
    var fondo = document.createElement('div');
    fondo.className = 'ventana-fondo';
    fondo.innerHTML = '<div class="ventana ventana--elegir" role="dialog" aria-modal="true">' +
      '<h2 class="ventana__titulo">Añadir operario</h2>' +
      '<p class="ventana__subtitulo">' + u.esc(p.seccion) + ' · Obra ' + u.esc(p.obra) + '</p>' +
      '<div data-paso></div></div>';
    document.body.appendChild(fondo);
    var paso = fondo.querySelector('[data-paso]'), texto = '';

    function enElPermiso() {
      var q = EC.app.estado.permisos.find(function (x) { return x.id === p.id; }) || p;
      return q.trabajadores.map(function (t) { return t.id; });
    }

    function elegir() {
      var ids = enElPermiso();
      paso.innerHTML = EC.vistas.buscador('buscar-anadir', 'Nombre o apellido', texto) +
        '<div class="desplegable__lista ventana__lista">' + EC.datos.plantillaOrdenada().map(function (t) {
          return botonTrabajador(t, ids.indexOf(t.id) >= 0, 'elegir');
        }).join('') + '</div>' +
        '<p class="buscador__nada" hidden></p>' +
        '<button type="button" class="boton boton--neutro boton--ancho" data-cancelar>CANCELAR</button>';
      if (texto) filtrarTrabajadores(paso, texto);
    }

    function firmar(t) {
      paso.innerHTML = '<p class="ventana__quien">' + EC.icono('persona') + '<b>' + u.esc(t.nombre) + '</b></p>' +
        '<p class="firma__texto">' + TEXTO_CONFIRMO + '</p><div data-caja-firma></div>' +
        '<div class="ventana__botones"><button type="button" class="boton boton--neutro" data-volver>VOLVER</button>' +
        '<button type="button" class="boton boton--neutro" data-cancelar>CANCELAR</button></div>';
      EC.firma.crear(paso.querySelector('[data-caja-firma]'), { textoAceptar: 'FIRMAR Y AÑADIR', alAceptar: function (img) {
        fondo.remove();
        EC.app.cambiar(p.id, function (q) {
          return EC.permisos.sumar(q, { id: t.id, nombre: t.nombre }, { img: img, hora: Date.now() }, quien());
        }).then(function (r) {
          if (r) u.aviso(t.nombre + ' añadido: ya puede pulsar ENTRA', 'si');
          else u.aviso('No se ha podido añadir: el permiso ya no está aprobado', 'error');
        });
      } });
    }

    fondo.addEventListener('click', function (e) {
      if (e.target.closest('[data-cancelar]')) { fondo.remove(); return; }
      if (e.target.closest('[data-volver]')) { elegir(); return; }
      var b = e.target.closest('[data-elegir]');
      if (!b || b.disabled) return;
      var t = EC.datos.trabajador(b.dataset.elegir), cad = EC.datos.caducidad(t);
      if (cad) { u.aviso(t.nombre + ': ' + cad + '. No puede entrar.', 'error'); return; }
      firmar(t);
    });
    fondo.addEventListener('input', function (e) {
      if (e.target.id === 'buscar-anadir') { texto = e.target.value; filtrarTrabajadores(paso, texto); }
    });
    elegir();
  }

  function botonAnular() {
    return '<button type="button" class="boton boton--anular boton--ancho" data-accion="anular">' + EC.icono('no') + 'ANULAR PERMISO</button>';
  }

  function resumen(p) {
    return '<p class="estado__resumen">' + EC.icono('deposito') + '<span><b>' + u.esc(p.seccion) + ' · Obra ' + u.esc(p.obra) + '</b>' + u.esc(p.trabajos) + '</span></p>';
  }

  function pintarEstado(p) {
    var e = EC.vistas.estado(p);
    var c = '';
    if (p.estado === 'pendiente') {
      c = '<div class="estado__grande">' + EC.icono('reloj', 'icono--late') + '<h1>ESPERANDO AL VIGILANTE</h1>' +
          '<p>Pedido a las ' + u.hora(p.creado) + ' · ' + EC.vistas.crono(p.creado) + '</p></div>' +
        resumen(p) +
        '<p class="estado__aviso">No entres hasta que esta pantalla se ponga en VERDE.</p>' +
        EC.vistas.trabajadores(p) +
        botonAnular() +
        '<button type="button" class="enlace" data-accion="otro">Pedir otro permiso (este sigue esperando)</button>';
    } else if (p.estado === 'aprobado') {
      // Ya no se cierra solo al salir el último: lo dice hasta que el vigilante lo finalice.
      var hanSalido = p.trabajadores.every(function (t) { return t.salida; });
      c = '<div class="estado__grande">' + EC.icono('si') + '<h1>' + (hanSalido ? 'HAN SALIDO TODOS' : 'PUEDES ENTRAR') + '</h1>' +
          '<p>Aprobado por <b>' + u.esc(p.aprobado.nombre) + '</b> a las ' + u.hora(p.aprobado.hora) + '</p></div>' +
        resumen(p) + control(p) + EC.vistas.verificado(p) +
        '<div class="validez"><span>' + u.esc(EC.vistas.validez(p)) + '</span></div>' +
        botonAnular() +
        '<button type="button" class="enlace" data-accion="otro">Pedir otro permiso (este sigue activo)</button>';
    } else if (p.estado === 'alerta') {
      // Alarma (anulado o fin de turno con gente dentro): lo urgente, salir, sin tener que bajar.
      var anulado = p.alerta.motivo === 'anulado';
      c = '<div class="alarma alarma--' + (anulado ? 'anulado' : 'turno') + '">' +
          '<div class="alarma__titulo">' + EC.icono('alerta') +
            '<div><h1>' + (anulado ? 'PERMISO ANULADO' : EC.permisos.textoMotivo(p.alerta.motivo).toUpperCase()) + '</h1>' +
            '<p class="alarma__salid">SALID YA</p></div></div>' +
          '<p class="alarma__obra">' + u.esc(p.seccion) + ' · OBRA ' + u.esc(p.obra) + '</p>' +
        '</div>' +
        controlAlarma(p) +
        '<p class="estado__motivo">' + (anulado
          ? u.esc(EC.vistas.quienAnulo(p)) + '.<br>Motivo: <b>' + u.esc(p.anulado.motivo) + '</b>'
          : 'Se ha acabado el turno: el permiso ya no vale.') + '</p>' +
        resumen(p);
    } else if (p.estado === 'denegado') {
      c = '<div class="estado__grande">' + EC.icono('no') + '<h1>NO SE PUEDE ENTRAR</h1>' +
          '<p>Denegado por <b>' + u.esc(p.denegado.nombre) + '</b> a las ' + u.hora(p.denegado.hora) + '</p></div>' +
        '<p class="estado__motivo">' + (p.denegado.motivo ? 'Motivo: <b>' + u.esc(p.denegado.motivo) + '</b>' : 'Sin motivo indicado. Habla con el vigilante.') + '</p>' +
        resumen(p) +
        '<div class="estado__botones">' +
          '<button type="button" class="boton boton--blanco boton--ancho" data-accion="corregir">CORREGIR Y VOLVER A PEDIR</button>' +
          '<button type="button" class="boton boton--neutro boton--ancho" data-accion="nuevo">NUEVO PERMISO</button>' +
        '</div>';
    } else if (p.estado === 'anulado') {
      c = '<div class="estado__grande">' + EC.icono('no') + '<h1>PERMISO ANULADO</h1>' +
          '<p>' + u.esc(EC.vistas.textoCierre(p)) + '</p></div>' +
        '<p class="estado__motivo">Motivo: <b>' + u.esc(p.anulado.motivo) + '</b></p>' +
        resumen(p) + EC.vistas.trabajadores(p) +
        '<div class="estado__botones">' +
          '<button type="button" class="boton boton--blanco boton--ancho" data-accion="nuevo">NUEVO PERMISO</button>' +
        '</div>' +
        '<details class="ver-papel"><summary>Ver el permiso como en papel</summary>' + EC.vistas.papel(p) + '</details>';
    } else {
      c = '<div class="estado__grande">' + EC.icono('registro') +
          '<h1>' + (p.cierre && p.cierre.motivo === 'finalizado' ? 'PERMISO FINALIZADO' : 'PERMISO CERRADO') + '</h1>' +
          '<p>' + u.esc(EC.vistas.textoCierre(p)) + '</p></div>' +
        resumen(p) + EC.vistas.trabajadores(p) +
        '<div class="estado__botones">' +
          '<button type="button" class="boton boton--renovar boton--ancho" data-accion="renovar">' + EC.icono('renovar') + 'RENOVAR PARA ESTE TURNO</button>' +
          '<button type="button" class="boton boton--neutro boton--ancho" data-accion="nuevo">NUEVO PERMISO</button>' +
        '</div>' +
        '<details class="ver-papel"><summary>Ver el permiso como en papel</summary>' + EC.vistas.papel(p) + '</details>';
    }
    document.body.className = 'fondo fondo--' + e.color;
    // En la alarma, los otros permisos del móvil van debajo, para que no empujen los botones SALE.
    var tira = '<div data-mis-activos>' + htmlMisActivos() + '</div>';
    raiz.innerHTML = '<main class="estado estado--' + e.color + '">' + EC.app.barra('operario') +
      '<div data-aviso-sonido>' + htmlAvisoSonido() + '</div>' +
      (p.estado === 'alerta' ? c + tira : tira + c) + '</main>';
  }

  // Los que siguen dentro, primero y con su SALE grande; los demás, en una línea debajo.
  function controlAlarma(p) {
    var dentro = [], resto = [];
    p.trabajadores.forEach(function (t, i) { (t.entrada && !t.salida ? dentro : resto).push({ t: t, i: i }); });
    return '<ul class="control control--alarma">' + dentro.map(function (x) {
        return '<li class="control__fila control__fila--dentro">' +
          '<span class="control__nombre"><b>' + u.esc(x.t.nombre) + '</b><small>DENTRO desde ' + u.hora(x.t.entrada) + '</small></span>' +
          '<button type="button" class="boton boton--sale boton--sale-grande" data-accion="sale" data-i="' + x.i + '">' + EC.icono('salir') + 'SALE</button></li>';
      }).join('') + '</ul>' +
      (dentro.length > 1 ? '<button type="button" class="boton boton--sale boton--ancho" data-accion="salen-todos">' + EC.icono('salir') + 'SALEN TODOS (' + dentro.length + ')</button>' : '') +
      (resto.length ? '<p class="control__fuera">Ya fuera: ' + resto.map(function (x) {
        return u.esc(x.t.nombre) + (x.t.salida ? ' (salió ' + u.hora(x.t.salida) + ')' : ' (no entró)');
      }).join(', ') + '</p>' : '');
  }

  function alPulsarEstado(el, p) {
    var a = el.dataset.accion, quienSoy = quien();
    var clave = p.id + ':' + el.dataset.i;
    if (a === 'entra') {
      recienEntrado[clave] = Date.now();
      EC.app.cambiar(p.id, function (q) { return EC.permisos.entra(q, Number(el.dataset.i), quienSoy); });
    }
    else if (a === 'sale') {
      if (Date.now() - (recienEntrado[clave] || 0) < ESPERA_SALE_MS) return;
      EC.app.cambiar(p.id, function (q) { return EC.permisos.sale(q, Number(el.dataset.i), quienSoy); });
    }
    else if (a === 'salen-todos') {
      u.confirmar('¿Salen todos?', 'Se apunta la salida de todos los que están dentro. El permiso sigue abierto hasta que el vigilante lo finalice.', 'SALEN TODOS', 'boton--sale').then(function (si) {
        if (si) EC.app.cambiar(p.id, function (q) { return EC.permisos.salenTodos(q, quienSoy); });
      });
    }
    else if (a === 'anular') EC.app.anular(p.id, 'operario');
    else if (a === 'anadir-operario') anadirOperario(p);
    else if (a === 'abrir') { ponerActual(el.dataset.id); pintar(); }
    else if (a === 'renovar') {
      borrador = Object.assign(vacio(), EC.permisos.datosParaRenovar(p));
      guardarBorrador(); ponerActual(null); pintar();
    }
    else if (a === 'corregir') {
      borrador = Object.assign(vacio(), {
        seccion: p.seccion, obra: p.obra, trabajos: p.trabajos,
        condiciones: Object.assign({}, p.condiciones), oxigeno: u.numero(p.oxigeno),
        fotoMedidor: p.fotoMedidor, fotoBoca: p.fotoBoca, epis: Object.assign({}, p.epis),
        trabajadores: p.trabajadores.map(function (t) { return t.id; })
      });
      guardarBorrador(); ponerActual(null); pintar();
    }
    else if (a === 'nuevo' || a === 'otro') {
      // Si había un formulario a medias (por ejemplo, porque saltó una alarma), se sigue con él.
      if (!borradorConDatos()) borrador = vacio();
      guardarBorrador(); ponerActual(null); pintar();
    }
  }

  /* ---------- montaje ---------- */

  function pintar() {
    var p = permisoActual();
    if (p) { vistos[p.id] = p.estado; pintarEstado(p); }
    else pintarFormulario();
    window.scrollTo(0, 0);
  }

  function alCambiar() {
    var saltarA = avisarCambios();
    if (saltarA) {
      // Alarma de anulación en otro permiso del móvil: la pantalla salta a él (el formulario a medias se guarda).
      guardarBorrador();
      ponerActual(saltarA);
      vistos[saltarA] = null; // para que vibre y suba arriba como un cambio
    }
    revisarAlarma();
    var p = permisoActual();
    if (p) {
      var antes = vistos[p.id];
      if (antes !== p.estado) {
        if (p.estado === 'aprobado') u.vibrar([400, 150, 400, 150, 900]);
        else if (p.estado === 'denegado' || p.estado === 'anulado') u.vibrar([900]);
        else if (p.estado === 'alerta' && p.alerta.motivo === 'anulado') u.vibrar([1000, 200, 1000, 200, 1000, 200, 1000]);
        else if (p.estado === 'alerta') u.vibrar([300, 100, 300, 100, 300, 100, 300]);
      }
      vistos[p.id] = p.estado;
      pintarEstado(p);
      if (antes !== p.estado) window.scrollTo(0, 0);
    } else if (!raiz.querySelector('.formulario')) {
      pintarFormulario();
      window.scrollTo(0, 0);
    } else {
      raiz.querySelector('[data-mis-activos]').innerHTML = htmlMisActivos();
      raiz.querySelector('[data-turnos]').innerHTML = htmlTurnos();
      actualizarBloqueos();
    }
  }

  return {
    montar: function (el) {
      raiz = el;
      borrador = Object.assign(vacio(), u.sesion.leer(CLAVE_BORRADOR) || {});
      // Lo que ya había al entrar no se avisa: solo los cambios a partir de ahora.
      EC.app.estado.permisos.filter(deEsteMovil).forEach(function (p) { vistos[p.id] = p.estado; });
      // Pero si al entrar hay una alarma de anulación en este móvil, se abre esa.
      var alarma = primeraAlarma(), actual = permisoActual();
      if (alarma && !(actual && esAlarmaDeAnulacion(actual))) ponerActual(alarma.id);
      raiz.onclick = function (e) {
        // Cualquier toque sirve para que el navegador deje sonar la alarma si hace falta.
        if (!EC.sonido.listo()) EC.sonido.activar().then(function (ok) { if (ok) { ultimaAlarma = 0; revisarAlarma(); } });
        var b = e.target.closest('[data-accion]');
        if (!b || b.disabled) return;
        var p = permisoActual();
        if (p) alPulsarEstado(b, p); else alPulsarFormulario(b);
      };
      raiz.oninput = alEscribir;
      raiz.onchange = alElegirFoto;
      pintar();
      if (navigator.userActivation && navigator.userActivation.hasBeenActive) EC.sonido.activar().then(revisarAlarma);
      if (!relojAlarma) relojAlarma = setInterval(revisarAlarma, 1000);
      revisarAlarma();
    },
    alCambiar: alCambiar
  };
})();
