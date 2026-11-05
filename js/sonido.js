/* Sonidos de la app, generados en el momento (sin archivos):
   - pitido(): tres notas cortas, para las peticiones nuevas del vigilante.
   - alarma(): sirena que sube y baja, para «PERMISO ANULADO · SALID YA».
   Los navegadores no dejan sonar nada hasta que se toca la página: activar() hay que llamarlo
   desde un toque; mientras no se pueda, htmlAviso() da el botón «TOCA AQUÍ PARA ACTIVAR…». */
EC.sonido = (function () {
  var ctx = null, oyentes = [];

  function hay() { return !!(window.AudioContext || window.webkitAudioContext); }
  function listo() { return !!ctx && ctx.state === 'running'; }
  function avisar() { oyentes.forEach(function (f) { f(listo()); }); }

  function activar() {
    if (!hay()) return Promise.resolve(false);
    try {
      // iPhone: «playback» hace que suene aunque el móvil esté en modo silencio (Safari de iOS 17 o posterior).
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctx.onstatechange = avisar;
      }
      var reanudar = listo() ? Promise.resolve() : ctx.resume();
      // iPhone: además hay que hacer sonar algo dentro del mismo toque (un silencio de una muestra).
      var vacio = ctx.createBufferSource();
      vacio.buffer = ctx.createBuffer(1, 1, 22050);
      vacio.connect(ctx.destination);
      vacio.start(0);
      return reanudar.then(function () { avisar(); return listo(); }, function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }

  // Al volver a la pantalla (en iPhone el sonido se queda «interrumpido»), se intenta reanudar.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && ctx && !listo()) ctx.resume().then(avisar, avisar);
  });

  // Una nota: frecuencia inicial → final (Hz), cuándo empieza y cuánto dura (s).
  function nota(desde, hasta, inicio, dura, tipo, volumen) {
    var t = ctx.currentTime + inicio;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(desde, t);
    if (hasta !== desde) o.frequency.linearRampToValueAtTime(hasta, t + dura);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volumen, t + 0.02);
    g.gain.setValueAtTime(volumen, t + dura - 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dura);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + dura + 0.02);
  }

  // Tres notas cortas, agudas y secas: se oyen por encima del ruido de la nave.
  function pitido() {
    if (!listo()) return false;
    nota(880, 880, 0, 0.18, 'square', 0.3);
    nota(1175, 1175, 0.22, 0.18, 'square', 0.3);
    nota(880, 880, 0.44, 0.18, 'square', 0.3);
    return true;
  }

  // Sirena: sube y baja dos veces (unos 1,6 s). Muy distinta del pitido de las peticiones.
  function alarma() {
    if (!listo()) return false;
    for (var i = 0; i < 2; i++) {
      nota(650, 1450, i * 0.8, 0.4, 'sawtooth', 0.35);
      nota(1450, 650, i * 0.8 + 0.4, 0.4, 'sawtooth', 0.35);
    }
    return true;
  }

  function alCambiar(f) { oyentes.push(f); }

  function htmlAviso(texto) {
    if (listo() || !hay()) return '';
    return '<button type="button" class="aviso-sonido" data-accion="sonido">' + EC.icono('altavozMudo') +
      '<span><b>' + texto + '</b><small>El navegador no deja sonar nada hasta que se toca la pantalla. Deja la pantalla encendida: con el móvil bloqueado no suena.</small></span></button>';
  }

  return { hay: hay, listo: listo, activar: activar, pitido: pitido, alarma: alarma, alCambiar: alCambiar, htmlAviso: htmlAviso };
})();
