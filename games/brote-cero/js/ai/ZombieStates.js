export const ZombieStates = Object.freeze({
  SPAWNING: 'SPAWNING',
  IDLE: 'IDLE',
  INVESTIGATE: 'INVESTIGATE',
  CHASE: 'CHASE',
  ATTACK: 'ATTACK',
  STAGGER: 'STAGGER',
  DEAD: 'DEAD'
});

export const ACTIVE_AI_STATES = new Set([
  ZombieStates.IDLE,
  ZombieStates.INVESTIGATE,
  ZombieStates.CHASE,
  ZombieStates.ATTACK,
  ZombieStates.STAGGER
]);
