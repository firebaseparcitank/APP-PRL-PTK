/* Elige el almacenamiento según EC.config.ALMACEN ('local' o 'firebase'). */
EC.almacen = EC.config.ALMACEN === 'firebase' ? EC.almacenFirebase : EC.almacenLocal;
