import { ZombieStates } from './ZombieStates.js';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export class AttackSlotManager {
  constructor(config) {
    this.config = config;
    this.slots = Array.from({ length: config.slotCount }, (_, index) => ({
      index,
      ownerId: -1,
      x: 0,
      z: 0
    }));
    this.angleOffset = Math.random() * Math.PI * 2;
  }

  update(playerPosition, zombies) {
    for (const slot of this.slots) {
      const owner = slot.ownerId >= 0 ? zombies[slot.ownerId] : null;
      if (!owner?.active || owner.state === ZombieStates.DEAD) slot.ownerId = -1;
      const angle = this.angleOffset + slot.index / this.slots.length * Math.PI * 2;
      slot.x = playerPosition.x + Math.sin(angle) * this.config.slotRadius;
      slot.z = playerPosition.z + Math.cos(angle) * this.config.slotRadius;
    }
  }

  claim(zombie, playerPosition) {
    if (zombie.attackSlot >= 0) return zombie.attackSlot;
    const dx = zombie.pos.x - playerPosition.x;
    const dz = zombie.pos.z - playerPosition.z;
    if (dx * dx + dz * dz > this.config.claimDistance * this.config.claimDistance) return -1;

    let bestIndex = -1;
    let bestScore = Infinity;
    for (const slot of this.slots) {
      if (slot.ownerId >= 0) continue;
      const sx = slot.x - zombie.pos.x;
      const sz = slot.z - zombie.pos.z;
      const score = sx * sx + sz * sz + Math.abs(slot.index - (zombie.id % this.slots.length)) * 0.08;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = slot.index;
      }
    }

    if (bestIndex >= 0) {
      this.slots[bestIndex].ownerId = zombie.id;
      zombie.attackSlot = bestIndex;
    }
    return bestIndex;
  }

  release(zombie) {
    if (zombie.attackSlot < 0) return;
    const slot = this.slots[zombie.attackSlot];
    if (slot?.ownerId === zombie.id) slot.ownerId = -1;
    zombie.attackSlot = -1;
  }

  releaseIfFar(zombie, playerPosition) {
    if (zombie.attackSlot < 0) return;
    const dx = zombie.pos.x - playerPosition.x;
    const dz = zombie.pos.z - playerPosition.z;
    if (dx * dx + dz * dz > this.config.releaseDistance * this.config.releaseDistance) {
      this.release(zombie);
    }
  }

  writeTarget(zombie, playerPosition, out, time) {
    if (zombie.attackSlot >= 0) {
      const slot = this.slots[zombie.attackSlot];
      out.set(slot.x, 0, slot.z);
      return true;
    }

    const angle = this.angleOffset + zombie.id * GOLDEN_ANGLE + Math.sin(time * 0.18 + zombie.id) * 0.12;
    const radius = this.config.fallbackRadius * zombie.preferredDistance;
    out.set(
      playerPosition.x + Math.sin(angle) * radius,
      0,
      playerPosition.z + Math.cos(angle) * radius
    );
    return false;
  }

  reset(zombies = []) {
    for (const slot of this.slots) slot.ownerId = -1;
    for (const zombie of zombies) zombie.attackSlot = -1;
    this.angleOffset = Math.random() * Math.PI * 2;
  }
}
