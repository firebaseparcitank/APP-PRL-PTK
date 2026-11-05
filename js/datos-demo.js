/* Datos inventados para la demo.
   Las caducidades se cuentan desde hoy, para que los tres caducados
   sigan caducados el día que se use. */
(function () {
  function dentroDe(dias) {
    var d = new Date();
    d.setDate(d.getDate() + dias);
    return EC.util.fechaISO(d);
  }

  // curso = caducidad del curso de espacios confinados; apto = caducidad del apto médico
  EC.datos = {
    plantilla: [
      { id: 't01', nombre: 'Juan Pérez García', curso: dentroDe(-12), apto: dentroDe(240) },
      { id: 't02', nombre: 'Antonio López Martín', curso: dentroDe(310), apto: dentroDe(150) },
      { id: 't03', nombre: 'Manuel Sánchez Ruiz', curso: dentroDe(95), apto: dentroDe(300) },
      { id: 't04', nombre: 'Francisco Gómez Díaz', curso: dentroDe(420), apto: dentroDe(60) },
      { id: 't05', nombre: 'David Fernández Moreno', curso: dentroDe(180), apto: dentroDe(210) },
      { id: 't06', nombre: 'José Luis Martínez Romero', curso: dentroDe(250), apto: dentroDe(-30) },
      { id: 't07', nombre: 'Javier Navarro Torres', curso: dentroDe(530), apto: dentroDe(330) },
      { id: 't08', nombre: 'Daniel Ruiz Serrano', curso: dentroDe(75), apto: dentroDe(120) },
      { id: 't09', nombre: 'Carlos Jiménez Molina', curso: dentroDe(365), apto: dentroDe(45) },
      { id: 't10', nombre: 'Sergio Vázquez Castro', curso: dentroDe(140), apto: dentroDe(275) },
      { id: 't11', nombre: 'Raúl Ortega Rubio', curso: dentroDe(-48), apto: dentroDe(-5) },
      { id: 't12', nombre: 'Miguel Ángel Herrera Marín', curso: dentroDe(600), apto: dentroDe(190) }
    ],
    vigilantes: ['Ramón Iglesias Prieto', 'Pilar Domínguez Vega'],
    verificadores: ['Marta Lozano Peña', 'Andrés Calvo Ramos']
  };

  // Hasta 60 en total, para que se note el buscador. Todos en regla:
  // los tres caducados siguen siendo los de arriba.
  [
    'Alfonso Ramos Gil', 'Pablo Domínguez Cano', 'Jorge Iglesias Medina', 'Rubén Garrido Ortiz',
    'Adrián Castillo Núñez', 'Álvaro Santos Cortés', 'Iván Lozano Guerrero', 'Óscar Prieto Méndez',
    'Rafael Vidal Calvo', 'Fernando Herrero Delgado', 'Luis Márquez León', 'Pedro Peña Cabrera',
    'Ángel Flores Campos', 'Gonzalo Vega Fuentes', 'Diego Carrasco Díez', 'Enrique Caballero Nieto',
    'Víctor Aguilar Pascual', 'Mario Santana Herrera', 'Hugo Benítez Morales', 'Marcos Rojas Sanz',
    'Ignacio Crespo Lorenzo', 'Samuel Pastor Soler', 'Héctor Montero Vicente', 'Emilio Gallego Arias',
    'Tomás Moya Carmona', 'Joaquín Parra Bravo', 'Cristian Hidalgo Rivas', 'Eduardo Mora Esteban',
    'Julián Reyes Ferrer', 'Agustín Durán Vargas', 'Lorenzo Blanco Sáez', 'Nicolás Román Pardo',
    'Santiago Robles Mendoza', 'Felipe Velasco Rey', 'Esteban Soto Cuesta', 'Gabriel Ibáñez Andrés',
    'Jesús Bermúdez Luna', 'Lucas Quintero Alonso', 'María José Gutiérrez Sola', 'Laura Martín Herranz',
    'Ana Belén Rodríguez Paz', 'Cristina Álvarez Ríos', 'Patricia Moreno Lara', 'Raquel Cano Vera',
    'Silvia Romero Baena', 'Beatriz Núñez Toledo', 'Nuria Ortiz Galán', 'Lucía Fernández Roca'
  ].forEach(function (nombre, i) {
    var n = i + 13;
    EC.datos.plantilla.push({
      id: 't' + n, nombre: nombre,
      curso: dentroDe(40 + (n * 37) % 640),
      apto: dentroDe(25 + (n * 53) % 520)
    });
  });

  EC.datos.trabajador = function (id) {
    return EC.datos.plantilla.find(function (t) { return t.id === id; }) || null;
  };

  // La plantilla por orden alfabético, para buscar a ojo en las listas.
  EC.datos.plantillaOrdenada = function () {
    return EC.datos.plantilla.slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
  };

  // Devuelve el motivo si algo está caducado, o null si está todo en regla.
  EC.datos.caducidad = function (t) {
    var hoy = EC.util.fechaISO(new Date());
    var curso = t.curso < hoy, apto = t.apto < hoy;
    if (curso && apto) return 'curso y apto médico caducados';
    if (curso) return 'curso caducado';
    if (apto) return 'apto médico caducado';
    return null;
  };
})();
