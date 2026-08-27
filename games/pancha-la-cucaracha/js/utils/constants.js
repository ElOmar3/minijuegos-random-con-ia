// Namespace global del juego y constantes compartidas
window.Pancha = window.Pancha || {};

Object.assign(window.Pancha, {
  GAME_W: 960,
  GAME_H: 640,

  TILE: 40,

  PLAYER_SPEED: 190,
  PLAYER_SPEED_DASH: 240,   // al correr brevemente (Shift) — opcional

  // ===== Sigilo =====
  LIGHT_EXPOSED_THRESHOLD: 0.55,   // a partir de aquí, la barra sube
  EXPOSURE_DEAD_THRESHOLD: 0.95,   // exposición crítica = muerte instantánea
  EXPOSURE_RISE_RATE: 2.2,         // por segundo en luz
  EXPOSURE_DECAY_RATE: 3.5,        // por segundo en sombra

  // ===== Chancla =====
  SHADOW_WARN_TIME: 900,
  SLAM_STAY_TIME: 450,
  CHANCLA_SIZE: 110,
  CHANCLA_HIT_RADIUS: 60,          // un poco más generoso para gameplay

  // ===== Linterna =====
  LINTERNA_RADIUS: 70,
  LINTERNA_CONE_WIDTH: Math.PI / 4, // 45° de apertura total del haz

  // ===== Migas =====
  CRUMB_POINTS_LIGHT: 50,
  CRUMB_POINTS_SHADOW: 15,

  // ===== Checkpoints =====
  RESPAWN_INVULN_MS: 1500,

  // ===== Otros =====
  MAX_DEATHS: 5,                   // game over tras N muertes

  SCENES: {
    BOOT: 'Boot',
    MENU: 'Menu',
    GAME: 'Game',
    HUD: 'HUD'
  },

  EVENTS: {
    EXPOSURE: 'exposure-changed',
    CRUMBS: 'crumbs-changed',
    LEVEL: 'level-changed',
    CHECKPOINT: 'checkpoint-reached',
    DEATH: 'player-died',
    DEATH_BY_LIGHT: 'player-spotted',  // nueva causa de muerte
    VICTORY: 'victory',
    GAME_OVER: 'game-over'
  }
});
