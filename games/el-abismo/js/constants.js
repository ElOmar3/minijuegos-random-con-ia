/**
 * EL ABISMO: DEEPCORE PROTOCOL
 * Constantes, Habitáculos, Diálogos de Radio y Parámetros
 */

const CONSTANTS = {
  CANVAS_WIDTH: 960,
  CANVAS_HEIGHT: 640,

  // Estados de Juego
  STATE: {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
    VICTORY: 'VICTORY'
  },

  // Modos de Juego
  MODE: {
    SINGLE: 'SINGLE', // 1 Jugador + Compañero IA
    COOP: 'COOP'      // 2 Jugadores Locales
  },

  // Dificultades
  DIFFICULTY: {
    EASY: {
      name: 'Fácil (Zona Crepuscular 600m)',
      oxigenoDecay: 0.035,
      frecuenciaCrisis: 9500,
      presionBase: 1.0,
      tasaInundacion: 0.12,
      tiempoVictoria: 100 // segundos
    },
    NORMAL: {
      name: 'Normal (Fosa de las Caimán 2000m)',
      oxigenoDecay: 0.065,
      frecuenciaCrisis: 6500,
      presionBase: 1.5,
      tasaInundacion: 0.18,
      tiempoVictoria: 150
    },
    HARD: {
      name: 'Extrema (Abismo Profundo 7000m)',
      oxigenoDecay: 0.10,
      frecuenciaCrisis: 4500,
      presionBase: 2.2,
      tasaInundacion: 0.26,
      tiempoVictoria: 200
    }
  },

  // Personajes
  CHARACTERS: {
    BUD: {
      id: 'bud',
      name: 'Virgil "Bud" Brigman',
      role: 'Supervisor de Plataforma',
      desc: 'Soldador experto: repara el casco y sella brechas el doble de rápido.',
      color: '#00e5ff',
      speed: 1.85,
      repairSpeed: 1.8,
      drainSpeed: 1.1,
      suit: 'Buzo Deepcore'
    },
    LINDSEY: {
      id: 'lindsey',
      name: 'Dra. Lindsey Brigman',
      role: 'Ingeniera de Sistemas',
      desc: 'Especialista técnica: purifica O2, bombea agua y sintoniza con NTIs más rápido.',
      color: '#ffb700',
      speed: 2.0,
      repairSpeed: 1.1,
      drainSpeed: 1.7,
      suit: 'Ingeniería Submarina'
    }
  },

  // Módulos / Salas de la Estación Deepcore (Diseño espacioso y conectado)
  ROOMS: {
    COMMAND: {
      id: 'command',
      name: 'Centro de Mando',
      color: '#0d2238',
      x: 300,
      y: 50,
      w: 360,
      h: 150,
      terminal: { x: 480, y: 100, type: 'RADAR', label: 'Sonar de Profundidad' }
    },
    OXYGEN: {
      id: 'oxygen',
      name: 'Módulo de Oxígeno (O2)',
      color: '#0c2e33',
      x: 60,
      y: 220,
      w: 230,
      h: 190,
      terminal: { x: 160, y: 300, type: 'OXYGEN', label: 'Compresor de O2' }
    },
    MOONPOOL: {
      id: 'moonpool',
      name: 'Piscina Lunar (Abismo Abierto)',
      color: '#071828',
      x: 310,
      y: 220,
      w: 340,
      h: 190,
      terminal: { x: 480, y: 315, type: 'ABYSS_DOCK', label: 'Comunión NTI' }
    },
    REACTOR: {
      id: 'reactor',
      name: 'Sala del Reactor Térmico',
      color: '#2e1812',
      x: 670,
      y: 220,
      w: 230,
      h: 190,
      terminal: { x: 790, y: 300, type: 'REACTOR', label: 'Núcleo de Energía' }
    },
    AIRLOCK: {
      id: 'airlock',
      name: 'Bahía de Achique y Bombas',
      color: '#122033',
      x: 220,
      y: 430,
      w: 520,
      h: 150,
      terminal: { x: 480, y: 500, type: 'PUMP', label: 'Bomba Maestra de Drenaje' }
    }
  },

  // Pasillos Amplios que conectan las salas (Con solapamiento generoso para tránsito fluido)
  CORRIDORS: [
    // Mando <-> Piscina Lunar (Vertical Central)
    { x: 430, y: 180, w: 100, h: 60, dir: 'V' },
    // Oxígeno <-> Piscina Lunar (Horizontal Izquierdo)
    { x: 270, y: 280, w: 60, h: 80, dir: 'H' },
    // Piscina Lunar <-> Reactor (Horizontal Derecho)
    { x: 630, y: 280, w: 60, h: 80, dir: 'H' },
    // Piscina Lunar <-> Bahía de Achique (Vertical Inferior Central)
    { x: 430, y: 390, w: 100, h: 60, dir: 'V' },
    // Oxígeno <-> Bahía de Achique (Diagonal/Vertical Izquierdo)
    { x: 150, y: 390, w: 100, h: 60, dir: 'V' },
    // Reactor <-> Bahía de Achique (Diagonal/Vertical Derecho)
    { x: 710, y: 390, w: 100, h: 60, dir: 'V' }
  ],

  // Tipos de Crisis
  CRISIS_TYPES: {
    HULL_LEAK: {
      id: 'HULL_LEAK',
      name: 'Fuga de Alta Presión',
      desc: '¡El agua está inundando la sala! Acércate y mantén pulsada la tecla de acción para soldar.',
      workRequired: 100,
      severity: 1.5,
      sound: 'leak'
    },
    OXYGEN_FAULT: {
      id: 'OXYGEN_FAULT',
      name: 'Fallo en Purificador O2',
      desc: '¡Nivel de aire cayendo! Ve al Módulo de Oxígeno (izq) y mantén la acción.',
      workRequired: 80,
      severity: 2.0,
      sound: 'alarm_vital'
    },
    REACTOR_OVERHEAT: {
      id: 'REACTOR_OVERHEAT',
      name: 'Sobrecalentamiento Térmico',
      desc: '¡El reactor está inestable! Ve a la Sala del Reactor (der) y refrigera el núcleo.',
      workRequired: 90,
      severity: 2.2,
      sound: 'reactor_hum'
    },
    WARHEAD_PULSE: {
      id: 'WARHEAD_PULSE',
      name: 'Perturbación Abisal',
      desc: '¡Presión marina inestable! Ve a la Piscina Lunar para contactar con los NTIs.',
      workRequired: 110,
      severity: 2.5,
      sound: 'sonar_deep'
    }
  },

  // Transmisiones de Radio / Diálogos tutoriales y de eventos
  COMMS_MESSAGES: {
    WELCOME: {
      speaker: 'Bud Brigman',
      role: 'Supervisor',
      color: '#00e5ff',
      text: '¡Atención equipo! Estamos a 7,000m en Deepcore. Mantengan el oxígeno alto, sellen las fugas y vigilen la piscina lunar.'
    },
    LEAK_ALERT: {
      speaker: 'Dra. Lindsey',
      role: 'Ingeniera',
      color: '#ffb700',
      text: '¡Alerta de presión! Se ha abierto una brecha en el casco. ¡Bud, usa el soplete antes de que se inunde el módulo!'
    },
    O2_LOW: {
      speaker: 'Control Superficie',
      role: 'Benthic Explorer',
      color: '#ff3344',
      text: '¡Deepcore, sus reservas de oxígeno están por debajo del 30%! Vayan de inmediato al compresor de O2.'
    },
    PUMP_ADVICE: {
      speaker: 'Bud Brigman',
      role: 'Supervisor',
      color: '#00e5ff',
      text: '¡Mucha agua en los compartimentos! Alguien que vaya a la Bahía de Achique inferior y active la bomba.'
    },
    NTI_SPOTTED: {
      speaker: 'Dra. Lindsey',
      role: 'Ingeniera',
      color: '#00ffff',
      text: '¡Increíble... una entidad bioluminiscente está en la Piscina Lunar! ¡Acérquense y emitan pulsos de luz armónicos!'
    },
    NTI_GIFT: {
      speaker: 'Dra. Lindsey',
      role: 'Ingeniera',
      color: '#00ffff',
      text: '¡Los NTIs han respondido a nuestro llamado! Han restaurado el oxígeno y calmado la presión marina.'
    }
  }
};
