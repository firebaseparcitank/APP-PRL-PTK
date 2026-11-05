/* Iconos dibujados en SVG (trazo grueso, se ven bien con guantes y al sol). */
EC.icono = (function () {
  var T = {
    // Operario: casco de obra
    casco: '<path d="M7 33c0-11 7.5-19 17-19s17 8 17 19"/><path d="M19 14.5V24M29 14.5V24"/><path d="M3.5 33h41v5h-41z" fill="currentColor"/>',
    // Vigilante: cámara de vigilancia en su brazo
    camaraVigilancia: '<path d="M6 13l26 9-3.5 8.5L3 21z" fill="currentColor"/><path d="M33 24l5 2"/><circle cx="9" cy="17" r="0.5"/><path d="M27 31l3 8h12M42 33v12"/>',
    // Prevención: escudo con marca de verificado
    escudo: '<path d="M24 4l16 6v12c0 10.5-7 18.5-16 22-9-3.5-16-11.5-16-22V10z"/><path d="M16 24l6 6 10-12"/>',
    deposito: '<rect x="4" y="15" width="40" height="20" rx="10"/><path d="M18 15v-5h12v5"/><path d="M12 35v6M36 35v6"/><circle cx="24" cy="25" r="4"/>',
    oxigeno: '<path d="M6 32a18 18 0 1 1 36 0"/><path d="M24 32l9-11"/><circle cx="24" cy="32" r="3" fill="currentColor"/><path d="M6 32h4M38 32h4M24 14v4"/>',
    mascarilla: '<path d="M8 18c5-3 27-3 32 0v9c0 7-7 13-16 13S8 34 8 27z"/><path d="M8 20H4M40 20h4M8 26H5M40 26h3"/><path d="M17 26h14M17 31h14"/>',
    camara: '<path d="M5 15h9l3-5h14l3 5h9v24H5z"/><circle cx="24" cy="26" r="7"/>',
    galeria: '<rect x="5" y="8" width="38" height="32"/><path d="M5 34l11-12 9 9 6-6 12 12"/><circle cx="33" cy="17" r="3.5"/>',
    lupa: '<circle cx="20" cy="20" r="13"/><path d="M30 30l13 13"/>',
    reloj: '<circle cx="24" cy="24" r="19"/><path d="M24 13v11l8 5"/>',
    persona: '<circle cx="24" cy="15" r="8"/><path d="M8 43c0-9 7-15 16-15s16 6 16 15"/>',
    si: '<path d="M9 25l10 10 20-22"/>',
    no: '<path d="M12 12l24 24M36 12L12 36"/>',
    atras: '<path d="M30 8L14 24l16 16"/>',
    alerta: '<path d="M24 5l21 37H3z"/><path d="M24 18v11"/><circle cx="24" cy="35.5" r="1.2" fill="currentColor"/>',
    entrar: '<path d="M27 6h13v36H27"/><path d="M4 24h22M18 15l9 9-9 9"/>',
    salir: '<path d="M21 6H8v36h13"/><path d="M20 24h22M34 15l9 9-9 9"/>',
    registro: '<path d="M11 8h26v36H11z"/><path d="M18 4h12v8H18z" fill="currentColor"/><path d="M17 21h14M17 28h14M17 35h9"/>',
    papelera: '<path d="M6 12h36M18 12V6h12v6M10 12l3 30h22l3-30"/><path d="M20 20v15M28 20v15"/>',
    renovar: '<path d="M40 22A16 16 0 0 0 10 15"/><path d="M8 6v10h10"/><path d="M8 26a16 16 0 0 0 30 7"/><path d="M40 42V32H30"/>',
    ojo: '<path d="M3 24s8-13 21-13 21 13 21 13-8 13-21 13S3 24 3 24z"/><circle cx="24" cy="24" r="6"/>',
    lista: '<path d="M16 12h26M16 24h26M16 36h26"/><circle cx="7" cy="12" r="2" fill="currentColor"/><circle cx="7" cy="24" r="2" fill="currentColor"/><circle cx="7" cy="36" r="2" fill="currentColor"/>',
    panel: '<rect x="5" y="5" width="16" height="16"/><rect x="27" y="5" width="16" height="16"/><rect x="5" y="27" width="16" height="16"/><rect x="27" y="27" width="16" height="16"/>',
    altavoz: '<path d="M6 18h8l11-9v30l-11-9H6z" fill="currentColor"/><path d="M32 17c3 4 3 10 0 14M37 12c6 7 6 17 0 24"/>',
    altavozMudo: '<path d="M6 18h8l11-9v30l-11-9H6z" fill="currentColor"/><path d="M32 18l12 12M44 18L32 30"/>'
  };

  return function (nombre, clase) {
    return '<svg class="icono ' + (clase || '') + '" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" ' +
      'stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">' + (T[nombre] || '') + '</svg>';
  };
})();
