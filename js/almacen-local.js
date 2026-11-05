/* Almacenamiento LOCAL: localStorage + BroadcastChannel.
   Sirve para probar los tres papeles en varias pestañas del mismo navegador.
   Misma interfaz que almacen-firebase.js (todo devuelve promesas):
     iniciar(), listar(), obtener(id), crear(p), actualizar(id, cambio), borrarTodo(),
     suscribir(cb) → cb(permisos), leerAjustes(), guardarAjustes(a), suscribirAjustes(cb) */
EC.almacenLocal = (function () {
  var CLAVE = 'ec_permisos_v1';
  var CLAVE_AJUSTES = 'ec_ajustes_v1';
  var canal = null;
  var oyentes = [], oyentesAjustes = [];
  var pendiente = false;

  function leerTodo() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; }
  }

  function escribirTodo(todos) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(todos));
    } catch (e) {
      // Casi siempre es que las fotos han llenado la memoria del navegador.
      throw new Error('La memoria del navegador está llena. Usa «Borrar datos de demo» en la pantalla de inicio.');
    }
  }

  function ordenados() {
    var todos = leerTodo();
    return Object.keys(todos).map(function (k) { return todos[k]; })
      .sort(function (a, b) { return a.creado - b.creado; });
  }

  function ajustes() {
    var a = null;
    try { a = JSON.parse(localStorage.getItem(CLAVE_AJUSTES)); } catch (e) { /* nada */ }
    return Object.assign({ modoDemo: EC.config.MODO_DEMO_POR_DEFECTO }, a || {});
  }

  // Avisa a esta pestaña (una sola vez aunque lleguen varios avisos seguidos).
  function avisarAqui() {
    if (pendiente) return;
    pendiente = true;
    setTimeout(function () {
      pendiente = false;
      var lista = ordenados(), a = ajustes();
      oyentes.forEach(function (f) { f(lista); });
      oyentesAjustes.forEach(function (f) { f(a); });
    }, 0);
  }

  function avisarATodas() {
    avisarAqui();
    if (canal) canal.postMessage('cambio');
  }

  function iniciar() {
    if ('BroadcastChannel' in window) {
      canal = new BroadcastChannel('ec_permisos');
      canal.onmessage = avisarAqui;
    }
    // De respaldo (y por si BroadcastChannel no llega, p. ej. abriendo el archivo sin servidor).
    window.addEventListener('storage', function (e) {
      if (e.key === CLAVE || e.key === CLAVE_AJUSTES || e.key === null) avisarAqui();
    });
    return Promise.resolve();
  }

  return {
    nombre: 'LOCAL',
    iniciar: iniciar,
    listar: function () { return Promise.resolve(ordenados()); },
    obtener: function (id) { return Promise.resolve(leerTodo()[id] || null); },
    crear: function (p) {
      return new Promise(function (ok) {
        var todos = leerTodo();
        todos[p.id] = p;
        escribirTodo(todos);
        avisarATodas();
        ok(p);
      });
    },
    // cambio(permiso) cambia el permiso y lo devuelve, o devuelve false si no hay nada que hacer.
    actualizar: function (id, cambio) {
      return new Promise(function (ok) {
        var todos = leerTodo();
        if (!todos[id]) return ok(null);
        var nuevo = cambio(todos[id]);
        if (!nuevo) return ok(false);
        todos[id] = nuevo;
        escribirTodo(todos);
        avisarATodas();
        ok(nuevo);
      });
    },
    borrarTodo: function () {
      localStorage.removeItem(CLAVE);
      avisarATodas();
      return Promise.resolve();
    },
    suscribir: function (cb) { oyentes.push(cb); cb(ordenados()); },
    leerAjustes: function () { return Promise.resolve(ajustes()); },
    guardarAjustes: function (a) {
      localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(Object.assign(ajustes(), a)));
      avisarATodas();
      return Promise.resolve();
    },
    suscribirAjustes: function (cb) { oyentesAjustes.push(cb); cb(ajustes()); }
  };
})();
