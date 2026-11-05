/* Almacenamiento FIREBASE (Firestore en tiempo real), para móviles distintos.
   Es el que se usa por defecto (ALMACEN: 'firebase' en js/config.js).
   Hay que rellenar CONFIG con la configuración de la app web del proyecto de Firebase.
   Misma interfaz que almacen-local.js. */
EC.almacenFirebase = (function () {
  // Configuración de la app web «Permiso EC». La apiKey de una app web de Firebase es pública
  // por diseño (va dentro de la página): lo que protege los datos son las reglas (firestore.rules).
  var CONFIG = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  };

  var VERSION_SDK = '10.12.2';
  var db = null;

  function cargarScript(url) {
    return new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = ok;
      s.onerror = function () { mal(new Error('No se pudo cargar ' + url)); };
      document.head.appendChild(s);
    });
  }

  function iniciar() {
    if (!CONFIG.projectId) {
      return Promise.reject(new Error('Firebase no está configurado (falta CONFIG en js/almacen-firebase.js).'));
    }
    var base = 'https://www.gstatic.com/firebasejs/' + VERSION_SDK + '/';
    return cargarScript(base + 'firebase-app-compat.js')
      .then(function () { return cargarScript(base + 'firebase-firestore-compat.js'); })
      .then(function () {
        firebase.initializeApp(CONFIG);
        db = firebase.firestore();
      });
  }

  function permisos() { return db.collection('permisos'); }
  function docAjustes() { return db.collection('ajustes').doc('general'); }

  // Si se corta la conexión o las reglas ya han caducado, que se vea en pantalla.
  function sinConexion(e) {
    console.error(e);
    EC.util.aviso(e && e.code === 'permission-denied'
      ? 'La base de datos de la demo está cerrada (reglas caducadas).'
      : 'Sin conexión con la base de datos. Revisa internet.', 'error');
  }

  function conDefecto(a) {
    return Object.assign({ modoDemo: EC.config.MODO_DEMO_POR_DEFECTO }, a || {});
  }

  return {
    nombre: 'FIREBASE',
    iniciar: iniciar,
    listar: function () {
      return permisos().orderBy('creado').get().then(function (q) {
        return q.docs.map(function (d) { return d.data(); });
      });
    },
    obtener: function (id) {
      return permisos().doc(id).get().then(function (d) { return d.exists ? d.data() : null; });
    },
    crear: function (p) {
      // Ojo: un documento de Firestore admite como mucho 1 MB (fotos incluidas).
      return permisos().doc(p.id).set(p).then(function () { return p; });
    },
    actualizar: function (id, cambio) {
      var ref = permisos().doc(id);
      return db.runTransaction(function (tx) {
        return tx.get(ref).then(function (d) {
          if (!d.exists) return null;
          var nuevo = cambio(d.data());
          if (!nuevo) return false;
          tx.set(ref, nuevo);
          return nuevo;
        });
      });
    },
    borrarTodo: function () {
      return permisos().get().then(function (q) {
        var lote = db.batch();
        q.docs.forEach(function (d) { lote.delete(d.ref); });
        return lote.commit();
      });
    },
    suscribir: function (cb) {
      permisos().orderBy('creado').onSnapshot(function (q) {
        cb(q.docs.map(function (d) { return d.data(); }));
      }, sinConexion);
    },
    leerAjustes: function () {
      return docAjustes().get().then(function (d) { return conDefecto(d.exists ? d.data() : null); });
    },
    guardarAjustes: function (a) {
      return docAjustes().set(a, { merge: true });
    },
    suscribirAjustes: function (cb) {
      docAjustes().onSnapshot(function (d) { cb(conDefecto(d.exists ? d.data() : null)); }, sinConexion);
    }
  };
})();
