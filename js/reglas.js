/* Qué impide pedir la entrada. Cada bloqueo: {campo, texto}. */
EC.reglas = (function () {
  var CONDICIONES = [
    { id: 'c1', n: 1, texto: 'Comprobación estado conducciones/botella de gas cerrada.', corto: 'gas y conducciones' },
    { id: 'c2', n: 2, texto: 'Comprobación de que no hay ningún equipo de trabajo en el interior.', corto: 'equipos en el interior' },
    { id: 'c3', n: 3, texto: 'Instalación de ventilación forzada.', corto: 'ventilación forzada' },
    { id: 'c4', n: 4, texto: 'Se ha comprobado que el porcentaje de oxígeno es adecuado.', corto: 'oxígeno', oxigeno: true },
    { id: 'c5', n: 5, texto: 'Bocas de hombre o aperturas de salida permanecen abiertas y con suficiente ventilación.', corto: 'bocas de hombre abiertas' },
    { id: 'c6', n: 6, texto: 'Existen extintores y equipos de rescate en lugar accesible.', corto: 'extintores y rescate' }
  ];

  var EPIS = [
    { id: 'filtracion', texto: 'Equipo de filtración motorizado', obligatorio: false },
    { id: 'respiratoria', texto: 'Protección respiratoria: mascarilla FFP3 para pulido o FFP3+ozono para soldadura', corto: 'protección respiratoria FFP3', obligatorio: true },
    { id: 'medidor', texto: 'Medidor de oxígeno', corto: 'medidor de oxígeno', obligatorio: true }
  ];

  // '20,9' → 20.9 ; vacío o mal escrito → null
  function leerOxigeno(valor) {
    if (valor === '' || valor == null) return null;
    var n = Number(String(valor).replace(',', '.').trim());
    return isFinite(n) ? n : null;
  }

  function oxigenoCorrecto(n) {
    return n != null && n >= EC.config.OXIGENO_MIN && n <= EC.config.OXIGENO_MAX;
  }

  // grave = algo que está mal (un NO, oxígeno fuera, un caducado…); si no, es algo que falta por rellenar.
  function bloqueos(b, modoDemo, ahora) {
    var lista = [];
    function poner(campo, texto, grave) { lista.push({ campo: campo, texto: texto, grave: !!grave }); }

    if (!b.seccion) poner('seccion', 'Falta elegir la sección');
    if (!String(b.obra || '').trim()) poner('obra', 'Falta el nº de obra/depósito');
    if (!String(b.trabajos || '').trim()) poner('trabajos', 'Faltan los trabajos a realizar');

    if (!b.turno) {
      poner('turno', modoDemo || EC.turnos.enMarcha(ahora).length ? 'Falta elegir el turno' : 'Fuera de horario: no hay ningún turno en marcha');
    } else if (!modoDemo && !EC.turnos.tramoEnMarcha(b.turno, ahora)) {
      poner('turno', 'El turno de ' + EC.turnos.porId(b.turno).nombre.toLowerCase() + ' no está en marcha ahora', true);
    }

    CONDICIONES.forEach(function (c) {
      if (c.oxigeno) {
        var o = leerOxigeno(b.oxigeno);
        if (b.oxigeno === '' || b.oxigeno == null) poner('c4', 'Condición 4: falta medir el oxígeno');
        else if (o == null) poner('c4', 'Condición 4: el oxígeno no es un número', true);
        else if (!oxigenoCorrecto(o)) {
          poner('c4', 'Oxígeno ' + EC.util.numero(o) + ' %: fuera de ' + EC.util.numero(EC.config.OXIGENO_MIN) + '–' + EC.util.numero(EC.config.OXIGENO_MAX) + ' %', true);
        }
        if (!b.fotoMedidor) poner('fotoMedidor', 'Falta la foto del medidor de oxígeno');
        return;
      }
      var r = b.condiciones[c.id];
      if (!r) poner(c.id, 'Condición ' + c.n + ' sin responder (' + c.corto + ')');
      else if (r === 'no') poner(c.id, 'Condición ' + c.n + ': NO (' + c.corto + ')', true);
    });

    EPIS.forEach(function (e) {
      if (e.obligatorio && !b.epis[e.id]) poner('epis', 'Falta EPI obligatorio: ' + e.corto);
    });

    // Cada trabajador firma «Confirmo que se han cumplido todos los pasos anteriores» (sustituye a la casilla general).
    if (!b.trabajadores.length) poner('trabajadores', 'Añade al menos un trabajador');
    b.trabajadores.forEach(function (id) {
      var t = EC.datos.trabajador(id);
      if (!t) return;
      var motivo = EC.datos.caducidad(t);
      if (motivo) poner('trabajadores', t.nombre + ': ' + motivo, true);
      else if (!(b.firmas || {})[id]) poner('trabajadores', 'Falta la firma de ' + t.nombre);
    });

    // Los graves primero, que se vean antes.
    lista.sort(function (a, b) { return (b.grave ? 1 : 0) - (a.grave ? 1 : 0); });

    return lista;
  }

  return {
    CONDICIONES: CONDICIONES, EPIS: EPIS,
    leerOxigeno: leerOxigeno, oxigenoCorrecto: oxigenoCorrecto, bloqueos: bloqueos
  };
})();
