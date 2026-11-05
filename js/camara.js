/* Cámara dentro de la propia app (visor a pantalla completa y botón SACAR FOTO).
   Así no depende de que Android abra su app de cámara, que en algunos móviles no se abre.
   EC.camara.sacarFoto() → promesa con la foto ya reducida (JPEG), null si se cancela,
   o un error con un mensaje claro si el móvil no deja usar la cámara. */
EC.camara = (function () {
  var u = EC.util;

  function hay() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  function motivo(err) {
    var n = err && err.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') {
      return 'El móvil no deja usar la cámara. En Android: toca el candado junto a la dirección → Permisos → Cámara, y mira también Ajustes → Aplicaciones → Chrome → Permisos → Cámara. En iPhone: Ajustes → Safari → Cámara. Mientras, usa GALERÍA.';
    }
    if (n === 'NotFoundError' || n === 'OverconstrainedError' || n === 'DevicesNotFoundError') {
      return 'No se encuentra ninguna cámara. Usa GALERÍA.';
    }
    if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') {
      return 'La cámara está ocupada por otra app. Ciérrala y vuelve a probar, o usa GALERÍA.';
    }
    return 'No se ha podido abrir la cámara. Usa GALERÍA.';
  }

  function sacarFoto() {
    if (!hay()) return Promise.reject(new Error('Este navegador no puede abrir la cámara desde la app. Usa GALERÍA, o abre la app en Chrome.'));

    return new Promise(function (resolver, rechazar) {
      var capa = document.createElement('div');
      capa.className = 'camara';
      capa.setAttribute('role', 'dialog');
      capa.setAttribute('aria-modal', 'true');
      capa.setAttribute('aria-label', 'Cámara');
      capa.innerHTML =
        '<video class="camara__video" autoplay playsinline muted></video>' +
        '<p class="camara__estado">Abriendo la cámara…<br><small>Si el móvil pregunta, deja usar la cámara.</small></p>' +
        '<div class="camara__botones">' +
          '<button type="button" class="boton boton--neutro" data-camara="cancelar">CANCELAR</button>' +
          '<button type="button" class="camara__disparo" data-camara="disparo" disabled><span class="camara__circulo"></span>SACAR FOTO</button>' +
        '</div>';
      document.body.appendChild(capa);

      var video = capa.querySelector('video');
      var disparo = capa.querySelector('[data-camara="disparo"]');
      var flujo = null, acabado = false;

      function cerrar() {
        acabado = true;
        if (flujo) flujo.getTracks().forEach(function (t) { t.stop(); });
        document.removeEventListener('keydown', alTeclear);
        capa.remove();
      }

      function alTeclear(e) { if (e.key === 'Escape') { cerrar(); resolver(null); } }
      document.addEventListener('keydown', alTeclear);

      capa.addEventListener('click', function (e) {
        var b = e.target.closest('[data-camara]');
        if (!b || b.disabled) return;
        if (b.dataset.camara === 'cancelar') { cerrar(); resolver(null); return; }
        // SACAR FOTO: la imagen del visor, ya reducida, como las demás fotos.
        var ancho = video.videoWidth, alto = video.videoHeight;
        if (!ancho || !alto) return;
        var escala = Math.min(1, EC.config.FOTO_LADO_MAX / Math.max(ancho, alto));
        var lienzo = document.createElement('canvas');
        lienzo.width = Math.round(ancho * escala);
        lienzo.height = Math.round(alto * escala);
        lienzo.getContext('2d').drawImage(video, 0, 0, lienzo.width, lienzo.height);
        var foto = lienzo.toDataURL('image/jpeg', EC.config.FOTO_CALIDAD);
        u.vibrar(60);
        capa.classList.add('camara--flash');
        setTimeout(function () { cerrar(); resolver(foto); }, 180);
      });

      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } }
      }).then(function (s) {
        if (acabado) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        flujo = s;
        video.srcObject = s;
        var listo = function () {
          capa.querySelector('.camara__estado').hidden = true;
          disparo.disabled = false;
        };
        if (video.readyState >= 2) listo(); else video.addEventListener('loadeddata', listo, { once: true });
        var p = video.play();
        if (p && p.catch) p.catch(function () { /* con autoplay y muted ya se ve */ });
      }).catch(function (err) {
        if (acabado) return;
        cerrar();
        rechazar(new Error(motivo(err)));
      });
    });
  }

  return { hay: hay, sacarFoto: sacarFoto };
})();
