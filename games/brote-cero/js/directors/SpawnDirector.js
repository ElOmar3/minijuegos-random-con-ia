const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class SpawnDirector {
  constructor({ points, config, isBlocked, hasLineOfSight, isNavigable }) {
    this.points = points;
    this.config = config;
    this.isBlocked = isBlocked;
    this.hasLineOfSight = hasLineOfSight;
    this.isNavigable = isNavigable;
    this.lastUsedAt = new Float32Array(points.length).fill(-1000);
    this.groupId = -1;
    this.groupAnchor = -1;
    this.pressureAnchor = -1;
    this.directionHoldUntil = 0;
    this.objectiveBias = null;
  }

  reset() {
    this.lastUsedAt.fill(-1000);
    this.groupId = -1;
    this.groupAnchor = -1;
    this.pressureAnchor = -1;
    this.directionHoldUntil = 0;
    this.objectiveBias = null;
  }

  setObjectiveBias(bias = null) {
    this.objectiveBias = bias;
  }

  choose({ playerPosition, cameraForward, zombies, groupId, memberIndex, now }) {
    if (groupId !== this.groupId) {
      this.groupId = groupId;
      this.groupAnchor = -1;
    }

    let bestIndex = -1;
    let bestScore = -Infinity;
    for (let index = 0; index < this.points.length; index++) {
      const point = this.points[index];
      if (this.isBlocked(point[0], point[1], 0.72)) continue;
      const dx = point[0] - playerPosition.x;
      const dz = point[1] - playerPosition.z;
      const distance = Math.hypot(dx, dz);
      if (distance < this.config.minSpawnDistance || distance > this.config.maxSpawnDistance) continue;
      if (this.objectiveBias) {
        const objectiveDistance = Math.hypot(point[0] - this.objectiveBias.position.x, point[1] - this.objectiveBias.position.z);
        if (objectiveDistance < this.objectiveBias.minDistance) continue;
      }
      if (this.isNavigable && !this.isNavigable({ x: point[0], z: point[1] }, playerPosition)) continue;

      const distanceScore = 26 - Math.abs(distance - this.config.preferredSpawnDistance) * this.config.preferredDistanceWeight;
      const invDistance = 1 / Math.max(0.001, distance);
      const viewDot = cameraForward.x * dx * invDistance + cameraForward.z * dz * invDistance;
      const visible = viewDot > this.config.visibleDotThreshold && this.hasLineOfSight(playerPosition, { x: point[0], z: point[1] }, 0.18);
      if (visible) continue;
      let density = 0;
      for (const zombie of zombies) {
        if (!zombie.active) continue;
        const zx = zombie.pos.x - point[0];
        const zz = zombie.pos.z - point[1];
        if (zx * zx + zz * zz < this.config.densityRadius ** 2) density++;
      }

      let score = distanceScore - density * this.config.densityPenalty;
      score += this.config.coveredBonus;
      const sinceLastUse = now - this.lastUsedAt[index];
      if (sinceLastUse < this.config.recentPointCooldown) score -= this.config.recentPointPenalty * (1 - sinceLastUse / this.config.recentPointCooldown);
      if (index === this.groupAnchor) score += this.config.groupAnchorBonus;
      if (now < this.directionHoldUntil && this.pressureAnchor >= 0) {
        const anchor = this.points[this.pressureAnchor];
        const directionalDistance = Math.hypot(point[0] - anchor[0], point[1] - anchor[1]);
        score += clamp(16 - directionalDistance * 0.55, -8, 16);
      }
      if (this.objectiveBias?.preferredIndices?.includes(index)) score += this.objectiveBias.bonus;
      score += ((index * 17 + groupId * 31 + memberIndex * 7) % 13) * 0.17;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    if (bestIndex < 0) return null;
    if (this.groupAnchor < 0) {
      this.groupAnchor = bestIndex;
      if (this.pressureAnchor < 0 || now >= this.directionHoldUntil) {
        this.pressureAnchor = bestIndex;
        this.directionHoldUntil = now + this.config.directionHoldDuration;
      }
    }
    this.lastUsedAt[bestIndex] = now;
    return this.points[bestIndex];
  }
}
