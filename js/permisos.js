/* Lo que le pasa a un permiso. Cada operación cambia el permiso que recibe
   y lo devuelve, o devuelve false si no hay nada que cambiar.
   Los eventos apuntan quién pulsó, desde qué papel y a qué hora. Además hay firmas con el dedo
   (js/firma.js): la de cada trabajador, la del recurso preventivo al aprobar y la de prevención al verificar.

   Estados: pendiente (amarillo) → aprobado (verde) o denegado (rojo)
            aprobado → alerta (fin de turno con gente dentro, rojo) → cerrado
            aprobado → cerrado (lo finaliza el vigilante, o fin de turno sin nadie dentro);
                       ya no se cierra solo al quedarse vacío: se puede seguir sumando gente
            pendiente o aprobado → anulado (sin nadie dentro)
            aprobado → alerta (anulado con gente dentro: «SALID YA») → anulado */
EC.permisos = (function () {
  var ACTIVOS = ['pendiente', 'aprobado', 'alerta'];

  function evento(p, papel, nombre, texto, hora) {
    p.eventos.push({ hora: hora || Date.now(), papel: papel, nombre: nombre, texto: texto });
  }

  function activo(p) { return ACTIVOS.indexOf(p.estado) >= 0; }

  function dentro(p) {
    return p.trabajadores.filter(function (t) { return t.entrada && !t.salida; });
  }

  function primeraEntrada(p) {
    var horas = p.trabajadores.map(function (t) { return t.entrada; }).filter(Boolean);
    return horas.length ? Math.min.apply(null, horas) : null;
  }

  function ultimaSalida(p) {
    if (dentro(p).length) return null;
    var horas = p.trabajadores.map(function (t) { return t.salida; }).filter(Boolean);
    return horas.length ? Math.max.apply(null, horas) : null;
  }

  function nombres(lista) {
    return lista.map(function (t) { return t.nombre; }).join(', ');
  }

  function textoMotivo(motivo) {
    if (motivo === 'anulado') return 'anulación del permiso';
    return motivo === 'corte' ? 'corte de mediodía del partido' : 'fin de turno';
  }

  // movil: el identificador del móvil desde el que se pide (EC.app.movil()).
  function crear(b, quien, modoDemo, ahora, movil) {
    var tramo = EC.turnos.tramoEnMarcha(b.turno, ahora);
    var p = {
      id: EC.util.uid(),
      creado: ahora,
      movil: movil || null,
      fecha: EC.util.fechaISO(new Date(ahora)),
      turno: b.turno,
      finTurno: tramo ? tramo.fin : null,
      finTurnoMotivo: tramo ? tramo.motivo : null,
      creadoEnModoDemo: !!modoDemo,
      seccion: b.seccion,
      obra: String(b.obra).trim(),
      trabajos: String(b.trabajos).trim(),
      condiciones: Object.assign({}, b.condiciones),
      oxigeno: EC.reglas.leerOxigeno(b.oxigeno),
      epis: Object.assign({}, b.epis),
      confirmado: true,
      fotoMedidor: b.fotoMedidor,
      fotoBoca: b.fotoBoca || null,
      // Cada trabajador lleva su firma («Confirmo que se han cumplido todos los pasos anteriores»).
      trabajadores: b.trabajadores.map(function (id) {
        var f = (b.firmas || {})[id] || null;
        return { id: id, nombre: EC.datos.trabajador(id).nombre, firma: f, anadido: null,
          entrada: null, salida: null, quienEntrada: null, quienSalida: null };
      }),
      pedidoPor: { nombre: quien, hora: ahora },
      estado: 'pendiente',
      aprobado: null,
      denegado: null,
      verificaciones: [],
      anulado: null,
      alerta: null,
      cierre: null,
      renovadoDe: b.renovadoDe || null,
      eventos: []
    };
    // Las firmas, en el orden en que se hicieron (alguien puede haber repetido la suya).
    p.trabajadores.filter(function (t) { return t.firma; })
      .sort(function (a, b) { return a.firma.hora - b.firma.hora; })
      .forEach(function (t) { evento(p, 'operario', t.nombre, 'FIRMA: confirma que se han cumplido todos los pasos anteriores', t.firma.hora); });
    evento(p, 'operario', quien, b.renovadoDe ? 'PIDE ENTRADA (renovación del permiso anterior)' : 'PIDE ENTRADA', ahora);
    return p;
  }

  // El vigilante firma con el dedo al aprobar: sin firma no queda aprobado.
  function aprobar(p, quien, firma) {
    if (p.estado !== 'pendiente' || !firma) return false;
    var ahora = Date.now();
    p.estado = 'aprobado';
    p.aprobado = { nombre: quien, hora: ahora, firma: firma };
    evento(p, 'vigilante', quien, 'APRUEBA · firma del recurso preventivo', ahora);
    return p;
  }

  // Sumar a alguien a un permiso ya aprobado: firma la confirmación y ya puede entrar.
  // t: {id, nombre}; firma: {img, hora}.
  function sumar(p, t, firma, quien) {
    if (p.estado !== 'aprobado' || !t || !firma) return false;
    if (p.trabajadores.some(function (x) { return x.id === t.id; })) return false;
    var ahora = Date.now();
    p.trabajadores.push({ id: t.id, nombre: t.nombre, firma: firma, anadido: { hora: ahora, quien: quien },
      entrada: null, salida: null, quienEntrada: null, quienSalida: null });
    evento(p, 'operario', t.nombre, 'FIRMA: confirma que se han cumplido todos los pasos anteriores', firma.hora);
    evento(p, 'operario', quien, 'AÑADE A ' + t.nombre + ' al permiso', ahora);
    return p;
  }

  // El vigilante lo da por terminado. Si según la app queda alguien dentro (porque no pulsó SALE),
  // el vigilante confirma que ha salido y su salida queda apuntada a su nombre.
  function finalizar(p, quien) {
    if (p.estado !== 'aprobado' && p.estado !== 'alerta') return false;
    var ahora = Date.now(), siguen = dentro(p);
    siguen.forEach(function (t) { t.salida = ahora; t.quienSalida = quien; t.salidaPorVigilante = true; });
    evento(p, 'vigilante', quien, 'FINALIZA EL PERMISO' + (siguen.length ? ' · confirma la salida de ' + nombres(siguen) : ''), ahora);
    if (p.estado === 'alerta' && p.alerta.motivo === 'anulado') {
      p.estado = 'anulado';
      p.cierre = { hora: ahora, motivo: 'anulado', conGenteDentro: true };
    } else if (p.estado === 'alerta') {
      p.estado = 'cerrado';
      p.cierre = { hora: ahora, motivo: p.alerta.motivo, conGenteDentro: true };
    } else {
      p.estado = 'cerrado';
      p.cierre = { hora: ahora, motivo: 'finalizado', conGenteDentro: false, nombre: quien };
    }
    return p;
  }

  function denegar(p, quien, motivo) {
    if (p.estado !== 'pendiente') return false;
    var ahora = Date.now();
    p.estado = 'denegado';
    p.denegado = { nombre: quien, hora: ahora, motivo: motivo || '' };
    evento(p, 'vigilante', quien, 'DENIEGA' + (motivo ? ': ' + motivo : ''), ahora);
    return p;
  }

  // Prevención firma con el dedo al verificar.
  function verificar(p, quien, observaciones, foto, firma) {
    if (!activo(p) || !firma) return false;
    var ahora = Date.now();
    p.verificaciones.push({ nombre: quien, hora: ahora, observaciones: observaciones || '', foto: foto || null, firma: firma });
    evento(p, 'prevencion', quien, 'VERIFICADO' + (observaciones ? ': ' + observaciones : ''), ahora);
    return p;
  }

  // En una alarma (anulado o fin de turno con gente dentro), al salir el último se cierra.
  // Un permiso aprobado ya no se cierra solo al quedarse vacío: lo finaliza el vigilante.
  function comprobarCierre(p, ahora) {
    if (dentro(p).length) return;
    if (p.estado === 'alerta' && p.alerta.motivo === 'anulado') {
      p.estado = 'anulado';
      p.cierre = { hora: ahora, motivo: 'anulado', conGenteDentro: true };
      evento(p, 'sistema', 'App', 'Han salido todos después de la anulación: permiso anulado', ahora);
    } else if (p.estado === 'alerta') {
      p.estado = 'cerrado';
      p.cierre = { hora: ahora, motivo: p.alerta.motivo, conGenteDentro: true };
      evento(p, 'sistema', 'App', 'Han salido todos después del ' + textoMotivo(p.alerta.motivo) + ': permiso cerrado', ahora);
    }
  }

  function entra(p, i, quien) {
    var t = p.trabajadores[i];
    if (p.estado !== 'aprobado' || !t || t.entrada) return false;
    var ahora = Date.now();
    t.entrada = ahora;
    t.quienEntrada = quien;
    evento(p, 'operario', quien, 'ENTRA ' + t.nombre, ahora);
    return p;
  }

  function sale(p, i, quien) {
    var t = p.trabajadores[i];
    if ((p.estado !== 'aprobado' && p.estado !== 'alerta') || !t || !t.entrada || t.salida) return false;
    var ahora = Date.now();
    t.salida = ahora;
    t.quienSalida = quien;
    evento(p, 'operario', quien, 'SALE ' + t.nombre, ahora);
    comprobarCierre(p, ahora);
    return p;
  }

  function salenTodos(p, quien) {
    if (p.estado !== 'aprobado' && p.estado !== 'alerta') return false;
    var ahora = Date.now();
    var fuera = dentro(p);
    fuera.forEach(function (t) { t.salida = ahora; t.quienSalida = quien; });
    evento(p, 'operario', quien, 'SALEN TODOS' + (fuera.length ? ' (' + nombres(fuera) + ')' : ''), ahora);
    comprobarCierre(p, ahora);
    return p;
  }

  // Se puede anular mientras espera o está aprobado. En alarma ya tienen que salir todos.
  function sePuedeAnular(p) { return p.estado === 'pendiente' || p.estado === 'aprobado'; }

  // Lo pueden hacer el operario, el vigilante y prevención, siempre con motivo.
  // Sin nadie dentro se cierra; con gente dentro salta la alarma hasta que salgan todos.
  function anular(p, papel, quien, motivo) {
    motivo = String(motivo || '').trim();
    if (!sePuedeAnular(p) || !motivo) return false;
    var ahora = Date.now();
    var siguen = dentro(p);
    p.anulado = { nombre: quien, papel: papel, hora: ahora, motivo: motivo };
    if (siguen.length) {
      p.estado = 'alerta';
      p.alerta = { hora: ahora, motivo: 'anulado' };
      evento(p, papel, quien, 'ANULA: ' + motivo + ' · SALID YA (siguen dentro: ' + nombres(siguen) + ')', ahora);
    } else {
      p.estado = 'anulado';
      p.cierre = { hora: ahora, motivo: 'anulado', conGenteDentro: false };
      evento(p, papel, quien, 'ANULA: ' + motivo, ahora);
    }
    return p;
  }

  // Lo llama la revisión de turnos (solo sin modo demo).
  function finDeTurno(p, ahora) {
    if ((p.estado !== 'pendiente' && p.estado !== 'aprobado') || !p.finTurno || ahora < p.finTurno) return false;
    var motivo = p.finTurnoMotivo || 'fin';
    var siguen = dentro(p);
    if (siguen.length) {
      p.estado = 'alerta';
      p.alerta = { hora: p.finTurno, motivo: motivo };
      evento(p, 'sistema', 'App', textoMotivo(motivo).toUpperCase() + ' CON GENTE DENTRO: ' + nombres(siguen), p.finTurno);
    } else {
      var sinAprobar = p.estado === 'pendiente';
      p.estado = 'cerrado';
      p.cierre = { hora: p.finTurno, motivo: motivo, conGenteDentro: false };
      evento(p, 'sistema', 'App', 'Cerrado por ' + textoMotivo(motivo) + (sinAprobar ? ' (sin aprobar)' : ''), p.finTurno);
    }
    return p;
  }

  // Datos que se copian al renovar. Condiciones, oxígeno, fotos y trabajadores se vuelven a hacer
  // (en otro turno no son los mismos operarios).
  function datosParaRenovar(p) {
    return {
      seccion: p.seccion, obra: p.obra, trabajos: p.trabajos,
      epis: Object.assign({}, p.epis),
      renovadoDe: p.id
    };
  }

  return {
    activo: activo, dentro: dentro, primeraEntrada: primeraEntrada, ultimaSalida: ultimaSalida,
    textoMotivo: textoMotivo, crear: crear, aprobar: aprobar, denegar: denegar, verificar: verificar,
    entra: entra, sale: sale, salenTodos: salenTodos, finDeTurno: finDeTurno, datosParaRenovar: datosParaRenovar,
    sumar: sumar, finalizar: finalizar,
    sePuedeAnular: sePuedeAnular, anular: anular
  };
})();
