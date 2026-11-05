/* Constantes de la demo. Todo lo que pueda cambiar está aquí. */
window.EC = window.EC || {};

EC.config = {
  // Almacenamiento: 'local' (varias pestañas del mismo navegador) o 'firebase' (móviles distintos).
  // Por defecto es 'firebase', también al probar en local con servidor.js (mismos datos que los móviles).
  // Para probar sin tocar los datos de los móviles: abrir la app con ?almacen=local
  // (p. ej. http://localhost:8080/?almacen=local#operario).
  ALMACEN: /[?&]almacen=local(&|$)/.test(location.search) ? 'local' : 'firebase',

  // Oxígeno (%): en verde entre estos dos valores (incluidos). Fuera, rojo y bloquea.
  OXIGENO_MIN: 19.5,
  OXIGENO_MAX: 23.5,

  SECCIONES: ['TORRE 1-2', 'TORRE 3-4', 'TORRE 5-6', 'CONOS Y PATAS', 'ISOTÉRMICOS', 'IN-SITU', 'CALORIFUGADO'],

  // Un permiso por turno: el de mañana no vale por la tarde.
  // Un fin a las '00:00' es la medianoche del final del día.
  // Partido: horas de ejemplo, ajustarlas si hace falta. Tiene corte a mediodía: su permiso
  // se cierra al empezar el corte y por la tarde se abre otro con «RENOVAR PARA ESTE TURNO».
  TURNOS: [
    { id: 'manana', nombre: 'Mañana', tramos: [['06:00', '15:30']] },
    { id: 'tarde', nombre: 'Tarde', tramos: [['15:30', '00:00']] },
    { id: 'partido', nombre: 'Partido', tramos: [['08:00', '13:00'], ['15:00', '18:00']] }
  ],

  // Modo demo: se puede pedir a cualquier hora y nada se cierra por turno.
  MODO_DEMO_POR_DEFECTO: true,

  // Fotos: se reducen antes de guardarlas (en LOCAL caben pocas).
  FOTO_LADO_MAX: 720,
  FOTO_CALIDAD: 0.6,

  // Cada cuánto se revisa si ha acabado algún turno.
  REVISAR_TURNOS_MS: 10000,

  // Pitido del vigilante: se repite cada tanto mientras quede alguna petición en amarillo.
  PITIDO_CADA_MS: 5000,

  // Alarma (sirena) de «PERMISO ANULADO · SALID YA»: se repite mientras quede gente dentro,
  // en el móvil del operario y en el del vigilante.
  ALARMA_CADA_MS: 2500
};
