export const NoiseTypes = Object.freeze({
  GUNSHOT: 'GUNSHOT',
  PLAYER_ACTION: 'PLAYER_ACTION',
  IMPACT: 'IMPACT',
  EXPLOSION: 'EXPLOSION',
  ENVIRONMENTAL: 'ENVIRONMENTAL'
});

export class NoiseSystem {
  constructor(capacity = 32, lifetime = 2.5) {
    this.capacity = capacity;
    this.lifetime = lifetime;
    this.cursor = 0;
    this.sequence = 0;
    this.events = Array.from({ length: capacity }, () => ({
      active: false,
      sequence: 0,
      x: 0,
      z: 0,
      radius: 0,
      type: NoiseTypes.ENVIRONMENTAL,
      time: 0
    }));
  }

  emit(position, radius, type, time) {
    const event = this.events[this.cursor];
    this.cursor = (this.cursor + 1) % this.capacity;
    this.sequence++;
    event.active = true;
    event.sequence = this.sequence;
    event.x = position.x;
    event.z = position.z;
    event.radius = radius;
    event.type = type;
    event.time = time;
    return event.sequence;
  }

  findStrongestAudible(position, afterSequence, time, hearingMultipliers) {
    let best = null;
    let bestScore = -Infinity;
    for (const event of this.events) {
      if (!event.active || event.sequence <= afterSequence) continue;
      if (time - event.time > this.lifetime) continue;
      const dx = event.x - position.x;
      const dz = event.z - position.z;
      const distanceSq = dx * dx + dz * dz;
      const multiplier = hearingMultipliers[event.type] ?? 1;
      const audibleRadius = event.radius * multiplier;
      if (distanceSq > audibleRadius * audibleRadius) continue;
      const score = audibleRadius - Math.sqrt(distanceSq) + event.sequence * 0.0001;
      if (score > bestScore) {
        best = event;
        bestScore = score;
      }
    }
    return best;
  }

  reset() {
    for (const event of this.events) event.active = false;
    this.cursor = 0;
    this.sequence = 0;
  }
}
