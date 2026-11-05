/* Turnos: cuál está en marcha y cuándo acaba el tramo actual. */
EC.turnos = (function () {
  function lista() { return EC.config.TURNOS; }

  function porId(id) {
    return lista().find(function (t) { return t.id === id; }) || null;
  }

  // '15:30' del día de «base» (+ dias) → milisegundos.
  function aMs(hhmm, base, dias) {
    var p = hhmm.split(':');
    var d = new Date(base);
    d.setDate(d.getDate() + (dias || 0));
    d.setHours(Number(p[0]), Number(p[1]), 0, 0);
    return d.getTime();
  }

  // Tramo del turno que está en marcha ahora: {inicio, fin, motivo} o null.
  // motivo: 'corte' si después viene el corte de mediodía, 'fin' si es el final del turno.
  // Si el fin es igual o anterior al inicio (p. ej. 15:30–00:00), el tramo acaba al día siguiente;
  // por eso se miran los tramos que empezaron hoy y los que empezaron ayer.
  function tramoEnMarcha(id, ahora) {
    var t = porId(id);
    if (!t) return null;
    for (var dia = 0; dia >= -1; dia--) {
      for (var i = 0; i < t.tramos.length; i++) {
        var inicio = aMs(t.tramos[i][0], ahora, dia), fin = aMs(t.tramos[i][1], ahora, dia);
        if (fin <= inicio) fin = aMs(t.tramos[i][1], ahora, dia + 1);
        if (ahora >= inicio && ahora < fin) {
          return { inicio: inicio, fin: fin, motivo: i < t.tramos.length - 1 ? 'corte' : 'fin' };
        }
      }
    }
    return null;
  }

  function enMarcha(ahora) {
    return lista().filter(function (t) { return tramoEnMarcha(t.id, ahora); });
  }

  function porDefecto(ahora) {
    var marcha = enMarcha(ahora);
    return marcha.length ? marcha[0].id : null;
  }

  function horario(id) {
    var t = porId(id);
    if (!t) return '';
    return t.tramos.map(function (r) { return r[0] + '–' + r[1]; }).join(' y ');
  }

  return { lista: lista, porId: porId, tramoEnMarcha: tramoEnMarcha, enMarcha: enMarcha, porDefecto: porDefecto, horario: horario };
})();
