(function (P) {
  const TILE = P.TILE;

  /**
   * Definición de niveles. Coordenadas en píxeles sobre un lienzo de 960x640.
   *
   * - walls / furniture: rectángulos {x, y, w, h}.
   * - lightZones: rectángulos iluminados (Pancha se vuelve visible).
   * - crumbs: puntos donde hay migas. `lit` define si están a plena luz.
   * - checkpoints: posiciones de reaparición (x, y).
   * - start: posición inicial de Pancha.
   * - nest: agujero de la pared (objetivo).
   * - patterns: patrones de chanclazo del nivel.
   * - linternas: [{ type, x, y, waypoints, minAngle, maxAngle, radius, ... }]
   * - deathZones: áreas donde Pancha muere al entrar (luz permanente).
   */
  P.LEVELS = [
    // =================================================================
    // NIVEL 1 — Cocina tranquila (tutorial)
    // =================================================================
    {
      name: 'Nivel 1 · La cocina',
      floorTint: 0xffffff,
      start: { x: 80, y: 560 },
      nest: { x: 900, y: 90 },
      checkpoints: [{ x: 480, y: 320 }],
      walls: [
        { x: 0, y: 0, w: 860, h: TILE },
        { x: 940, y: 0, w: 20, h: TILE },
        { x: 0, y: 0, w: 20, h: 640 },
        { x: 940, y: 0, w: 20, h: 640 },
        { x: 0, y: 600, w: 960, h: 40 }
      ],
      furniture: [
        { x: 140, y: 120, w: 220, h: 70 },
        { x: 420, y: 260, w: 160, h: 70 },
        { x: 700, y: 440, w: 200, h: 70 }
      ],
      lightZones: [
        { x: 360, y: 100, w: 280, h: 200 },
        { x: 620, y: 380, w: 300, h: 180 }
      ],
      crumbs: [
        { x: 250, y: 250, lit: false },
        { x: 500, y: 150, lit: true },
        { x: 520, y: 430, lit: false },
        { x: 760, y: 250, lit: true },
        { x: 850, y: 380, lit: false },
        { x: 350, y: 480, lit: true },
        { x: 640, y: 560, lit: false }
      ],
      patterns: [
        { type: 'fixed', spots: [[240, 340], [520, 340], [760, 200]], interval: 2600 },
        { type: 'random', area: { x: 60, y: 60, w: 840, h: 520 }, interval: 3400 }
      ],
      linternas: []
    },

    // =================================================================
    // NIVEL 2 — Más ojos arriba (sin linterna, chanclas más frecuentes)
    // =================================================================
    {
      name: 'Nivel 2 · Más ojos arriba',
      floorTint: 0xf2ead8,
      start: { x: 60, y: 320 },
      nest: { x: 900, y: 550 },
      checkpoints: [
        { x: 330, y: 130 },
        { x: 640, y: 400 }
      ],
      walls: [
        { x: 0, y: 0, w: 960, h: 20 },
        { x: 0, y: 0, w: 20, h: 640 },
        { x: 940, y: 0, w: 20, h: 640 },
        { x: 0, y: 620, w: 960, h: 20 },
        { x: 460, y: 0, w: 40, h: 260 },
        { x: 460, y: 400, w: 40, h: 240 }
      ],
      furniture: [
        { x: 100, y: 60, w: 240, h: 70 },
        { x: 700, y: 80, w: 200, h: 70 },
        { x: 120, y: 480, w: 200, h: 70 },
        { x: 720, y: 300, w: 180, h: 70 }
      ],
      lightZones: [
        { x: 200, y: 180, w: 240, h: 160 },
        { x: 540, y: 280, w: 200, h: 200 },
        { x: 60, y: 560, w: 260, h: 60 }
      ],
      crumbs: [
        { x: 300, y: 300, lit: true },
        { x: 560, y: 120, lit: false },
        { x: 800, y: 200, lit: true },
        { x: 250, y: 420, lit: false },
        { x: 620, y: 560, lit: true },
        { x: 880, y: 450, lit: false },
        { x: 420, y: 330, lit: true },
        { x: 150, y: 180, lit: false }
      ],
      patterns: [
        { type: 'fixed', spots: [[300, 200], [620, 480], [200, 560], [780, 160]], interval: 2100 },
        { type: 'random', area: { x: 60, y: 60, w: 840, h: 520 }, interval: 2700 },
        { type: 'row', axis: 'y', value: 320, from: 60, to: 900, count: 3, interval: 3000 }
      ],
      linternas: []
    },

    // =================================================================
    // NIVEL 3 — La hora pico (chanclas + filas frecuentes)
    // =================================================================
    {
      name: 'Nivel 3 · La hora pico',
      floorTint: 0xe8ddc4,
      start: { x: 80, y: 80 },
      nest: { x: 890, y: 320 },
      checkpoints: [
        { x: 300, y: 300 },
        { x: 660, y: 160 }
      ],
      walls: [
        { x: 0, y: 0, w: 960, h: 20 },
        { x: 0, y: 0, w: 20, h: 640 },
        { x: 940, y: 0, w: 20, h: 640 },
        { x: 0, y: 620, w: 960, h: 20 },
        { x: 260, y: 120, w: 30, h: 220 },
        { x: 290, y: 310, w: 200, h: 30 },
        { x: 600, y: 380, w: 30, h: 220 }
      ],
      furniture: [
        { x: 60, y: 420, w: 220, h: 70 },
        { x: 420, y: 60, w: 200, h: 70 },
        { x: 760, y: 480, w: 160, h: 70 },
        { x: 660, y: 60, w: 240, h: 60 }
      ],
      lightZones: [
        { x: 320, y: 60, w: 320, h: 180 },
        { x: 100, y: 300, w: 180, h: 160 },
        { x: 640, y: 420, w: 260, h: 180 }
      ],
      crumbs: [
        { x: 200, y: 200, lit: false },
        { x: 480, y: 180, lit: true },
        { x: 760, y: 200, lit: true },
        { x: 180, y: 360, lit: true },
        { x: 420, y: 480, lit: false },
        { x: 700, y: 300, lit: true },
        { x: 860, y: 420, lit: false },
        { x: 340, y: 560, lit: false },
        { x: 560, y: 560, lit: true },
        { x: 900, y: 120, lit: false }
      ],
      patterns: [
        { type: 'fixed', spots: [[200, 260], [500, 300], [760, 340], [400, 520], [640, 100]], interval: 1700 },
        { type: 'random', area: { x: 50, y: 50, w: 860, h: 540 }, interval: 2100 },
        { type: 'row', axis: 'x', value: 480, from: 40, to: 920, count: 4, interval: 2400 },
        { type: 'row', axis: 'y', value: 480, from: 40, to: 920, count: 3, interval: 2600 }
      ],
      linternas: []
    },

    // =================================================================
    // NIVEL 4 — La linterna (primera vez con linterna)
    // Patrón: linterna巡逻 + chanclas fijas
    // =================================================================
    {
      name: 'Nivel 4 · La linterna',
      floorTint: 0xe8e0cc,
      start: { x: 80, y: 320 },
      nest: { x: 900, y: 320 },
      checkpoints: [
        { x: 320, y: 540 },
        { x: 580, y: 100 }
      ],
      walls: [
        { x: 0, y: 0, w: 960, h: 20 },
        { x: 0, y: 0, w: 20, h: 640 },
        { x: 940, y: 0, w: 20, h: 640 },
        { x: 0, y: 620, w: 960, h: 20 }
      ],
      furniture: [
        // pocos muebles para crear sombras pero dejar espacio de paso
        { x: 80, y: 60, w: 160, h: 60 },
        { x: 720, y: 60, w: 160, h: 60 },
        { x: 80, y: 520, w: 160, h: 60 },
        { x: 720, y: 520, w: 160, h: 60 },
        { x: 380, y: 280, w: 200, h: 60 }
      ],
      lightZones: [
        // zonas iluminadas grandes: hay poco refugio
        { x: 260, y: 160, w: 200, h: 80 },
        { x: 500, y: 420, w: 200, h: 80 }
      ],
      crumbs: [
        { x: 200, y: 240, lit: false },
        { x: 480, y: 200, lit: true },
        { x: 720, y: 240, lit: true },
        { x: 200, y: 480, lit: false },
        { x: 480, y: 460, lit: true },
        { x: 720, y: 480, lit: false },
        { x: 380, y: 380, lit: true }
      ],
      patterns: [
        // chanclas más lentas pero sincronizadas con la linterna
        { type: 'fixed', spots: [[240, 200], [720, 200], [240, 480], [720, 480]], interval: 2400 },
        { type: 'row', axis: 'x', value: 320, from: 80, to: 880, count: 3, interval: 3200 }
      ],
      linternas: [
        {
          type: 'patrol',
          x: 100, y: 100,
          waypoints: [
            { x: 100, y: 100 },
            { x: 860, y: 100 },
            { x: 860, y: 540 },
            { x: 100, y: 540 }
          ],
          speed: 90,
          radius: 75
        }
      ]
    },

    // =================================================================
    // NIVEL 5 — Cocina dividida (dos habitaciones con linternas independientes)
    // =================================================================
    {
      name: 'Nivel 5 · Cocina dividida',
      floorTint: 0xe4dbc3,
      start: { x: 80, y: 560 },
      nest: { x: 900, y: 80 },
      checkpoints: [
        { x: 320, y: 320 },
        { x: 660, y: 320 }
      ],
      walls: [
        { x: 0, y: 0, w: 960, h: 20 },
        { x: 0, y: 0, w: 20, h: 640 },
        { x: 940, y: 0, w: 20, h: 640 },
        { x: 0, y: 620, w: 960, h: 20 },
        // muro vertical con un pasillo central
        { x: 440, y: 20, w: 30, h: 260 },
        { x: 490, y: 380, w: 30, h: 260 }
      ],
      furniture: [
        { x: 100, y: 80, w: 140, h: 60 },
        { x: 280, y: 380, w: 140, h: 60 },
        { x: 620, y: 80, w: 140, h: 60 },
        { x: 760, y: 380, w: 140, h: 60 },
        { x: 100, y: 460, w: 140, h: 60 },
        { x: 760, y: 460, w: 140, h: 60 }
      ],
      lightZones: [
        // luces grandes — pocas sombras
        { x: 260, y: 220, w: 200, h: 120 },
        { x: 580, y: 220, w: 200, h: 120 }
      ],
      crumbs: [
        { x: 180, y: 220, lit: false },
        { x: 320, y: 280, lit: true },
        { x: 460, y: 320, lit: true },
        { x: 600, y: 280, lit: true },
        { x: 740, y: 220, lit: false },
        { x: 220, y: 540, lit: true },
        { x: 720, y: 540, lit: true }
      ],
      patterns: [
        { type: 'fixed', spots: [[180, 320], [380, 180], [560, 320], [760, 180]], interval: 1900 },
        { type: 'random', area: { x: 50, y: 50, w: 380, h: 540 }, interval: 2300 },
        { type: 'random', area: { x: 530, y: 50, w: 380, h: 540 }, interval: 2300 }
      ],
      linternas: [
        {
          type: 'sweep',
          x: 100, y: 320,
          startAngle: -Math.PI / 2,
          minAngle: -Math.PI / 2,
          maxAngle: 0,
          sweepSpeed: 1.6,
          radius: 70
        },
        {
          type: 'sweep',
          x: 860, y: 320,
          startAngle: Math.PI,
          minAngle: Math.PI,
          maxAngle: -Math.PI,
          sweepSpeed: 1.4,
          radius: 70
        }
      ]
    },

    // =================================================================
    // NIVEL 6 — Hora pico con dos linternas + chanclas rápidas
    // =================================================================
    {
      name: 'Nivel 6 · Doble acecho',
      floorTint: 0xddd0b8,
      start: { x: 80, y: 80 },
      nest: { x: 880, y: 560 },
      checkpoints: [
        { x: 280, y: 280 },
        { x: 580, y: 380 }
      ],
      walls: [
        { x: 0, y: 0, w: 960, h: 20 },
        { x: 0, y: 0, w: 20, h: 640 },
        { x: 940, y: 0, w: 20, h: 640 },
        { x: 0, y: 620, w: 960, h: 20 },
        // obstáculos que crean sombras pequeñas pero valiosas
        { x: 200, y: 180, w: 80, h: 80 },
        { x: 680, y: 180, w: 80, h: 80 },
        { x: 200, y: 380, w: 80, h: 80 },
        { x: 680, y: 380, w: 80, h: 80 }
      ],
      furniture: [
        { x: 60, y: 280, w: 80, h: 60 },
        { x: 820, y: 280, w: 80, h: 60 }
      ],
      lightZones: [
        { x: 320, y: 100, w: 320, h: 80 },
        { x: 320, y: 460, w: 320, h: 80 }
      ],
      crumbs: [
        { x: 140, y: 200, lit: false },
        { x: 280, y: 240, lit: true },
        { x: 440, y: 160, lit: true },
        { x: 600, y: 220, lit: true },
        { x: 760, y: 180, lit: false },
        { x: 160, y: 460, lit: false },
        { x: 460, y: 480, lit: true },
        { x: 760, y: 480, lit: false }
      ],
      patterns: [
        { type: 'fixed', spots: [[260, 260], [440, 260], [620, 260], [800, 260]], interval: 1500 },
        { type: 'random', area: { x: 50, y: 50, w: 860, h: 540 }, interval: 1800 },
        { type: 'row', axis: 'y', value: 320, from: 80, to: 880, count: 4, interval: 2100 }
      ],
      linternas: [
        {
          type: 'patrol',
          x: 100, y: 100,
          waypoints: [
            { x: 100, y: 100 },
            { x: 460, y: 100 },
            { x: 460, y: 540 },
            { x: 100, y: 540 }
          ],
          speed: 130,
          radius: 70
        },
        {
          type: 'patrol',
          x: 860, y: 540,
          waypoints: [
            { x: 860, y: 540 },
            { x: 500, y: 540 },
            { x: 500, y: 100 },
            { x: 860, y: 100 }
          ],
          speed: 140,
          radius: 70
        }
      ]
    },

    // =================================================================
    // NIVEL 7 — La trampa (zonas de luz dinámicas + chanclas aim)
    // =================================================================
    {
      name: 'Nivel 7 · La trampa',
      floorTint: 0xd4c8a8,
      start: { x: 80, y: 560 },
      nest: { x: 880, y: 80 },
      checkpoints: [
        { x: 320, y: 480 },
        { x: 600, y: 200 }
      ],
      walls: [
        { x: 0, y: 0, w: 960, h: 20 },
        { x: 0, y: 0, w: 20, h: 640 },
        { x: 940, y: 0, w: 20, h: 640 },
        { x: 0, y: 620, w: 960, h: 20 }
      ],
      furniture: [
        { x: 60, y: 60, w: 80, h: 60 },
        { x: 820, y: 60, w: 80, h: 60 },
        { x: 440, y: 60, w: 80, h: 60 },
        { x: 60, y: 520, w: 80, h: 60 },
        { x: 820, y: 520, w: 80, h: 60 },
        { x: 440, y: 520, w: 80, h: 60 },
        { x: 240, y: 280, w: 80, h: 80 },
        { x: 640, y: 280, w: 80, h: 80 }
      ],
      lightZones: [
        // zonas iluminadas con temporizador (se activan/desactivan)
        { x: 180, y: 200, w: 140, h: 120, timer: 4.5 },
        { x: 640, y: 200, w: 140, h: 120, timer: 4.5, timerOffset: 2.5 },
        { x: 180, y: 400, w: 140, h: 120, timer: 4.5, timerOffset: 1.0 },
        { x: 640, y: 400, w: 140, h: 120, timer: 4.5, timerOffset: 3.5 }
      ],
      crumbs: [
        { x: 240, y: 240, lit: true },
        { x: 700, y: 240, lit: true },
        { x: 240, y: 460, lit: true },
        { x: 700, y: 460, lit: true },
        { x: 460, y: 320, lit: true },
        { x: 100, y: 320, lit: false },
        { x: 820, y: 320, lit: false }
      ],
      patterns: [
        // chanclas con aim (persecución) — necesitan reflejos rápidos
        { type: 'aim', interval: 2200, jitter: 40 },
        { type: 'row', axis: 'x', value: 240, from: 80, to: 880, count: 3, interval: 2800 },
        { type: 'row', axis: 'x', value: 480, from: 80, to: 880, count: 3, interval: 2800 }
      ],
      linternas: []
    },

    // =================================================================
    // NIVEL 8 — Cocina infernal (JEFE FINAL)
    // Combinación: linterna que persigue + 2 linternas巡逻 + todas las chanclas
    // =================================================================
    {
      name: 'Nivel 8 · La hora del juicio',
      floorTint: 0xc8b894,
      start: { x: 480, y: 560 },
      nest: { x: 480, y: 80 },
      checkpoints: [
        { x: 200, y: 320 },
        { x: 760, y: 320 }
      ],
      walls: [
        { x: 0, y: 0, w: 960, h: 20 },
        { x: 0, y: 0, w: 20, h: 640 },
        { x: 940, y: 0, w: 20, h: 640 },
        { x: 0, y: 620, w: 960, h: 20 },
        // corredor central protegido con pared
        { x: 380, y: 200, w: 200, h: 20 },
        { x: 380, y: 420, w: 200, h: 20 }
      ],
      furniture: [
        { x: 60, y: 80, w: 100, h: 60 },
        { x: 800, y: 80, w: 100, h: 60 },
        { x: 60, y: 500, w: 100, h: 60 },
        { x: 800, y: 500, w: 100, h: 60 }
      ],
      lightZones: [
        // una franja central iluminada: hay que correr para cruzarla
        { x: 240, y: 240, w: 480, h: 160 }
      ],
      crumbs: [
        { x: 120, y: 200, lit: false },
        { x: 840, y: 200, lit: false },
        { x: 120, y: 460, lit: false },
        { x: 840, y: 460, lit: false },
        { x: 480, y: 320, lit: true },
        { x: 380, y: 100, lit: true },
        { x: 580, y: 560, lit: true }
      ],
      patterns: [
        // todas las chanclas a la vez, sin piedad
        { type: 'aim', interval: 1700, jitter: 60 },
        { type: 'fixed', spots: [[120, 320], [840, 320], [480, 200], [480, 440]], interval: 1300 },
        { type: 'row', axis: 'y', value: 240, from: 60, to: 900, count: 5, interval: 1900 },
        { type: 'row', axis: 'y', value: 440, from: 60, to: 900, count: 5, interval: 1900 },
        { type: 'random', area: { x: 40, y: 40, w: 880, h: 560 }, interval: 1500 }
      ],
      linternas: [
        // linterna "jefe": persigue lentamente a Pancha
        {
          type: 'chase',
          x: 480, y: 100,
          speed: 35,
          turnRate: 0.5,
          radius: 80
        },
        // dos linternas巡逻 en los flancos
        {
          type: 'patrol',
          x: 100, y: 540,
          waypoints: [
            { x: 100, y: 540 },
            { x: 860, y: 540 }
          ],
          speed: 120,
          radius: 65
        },
        {
          type: 'patrol',
          x: 860, y: 100,
          waypoints: [
            { x: 860, y: 100 },
            { x: 100, y: 100 }
          ],
          speed: 130,
          radius: 65
        }
      ]
    }
  ];
})(window.Pancha);
