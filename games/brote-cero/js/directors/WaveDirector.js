export const WavePhases = Object.freeze({
  PREPARE: 'PREPARE',
  BUILDUP: 'BUILDUP',
  PRESSURE: 'PRESSURE',
  PEAK: 'PEAK',
  RECOVERY: 'RECOVERY',
  COMPLETE: 'COMPLETE'
});

export const WaveEvents = Object.freeze({
  WAVE_PREPARE: 'WAVE_PREPARE',
  WAVE_STARTED: 'WAVE_STARTED',
  PRESSURE_CHANGED: 'PRESSURE_CHANGED',
  WAVE_PEAK: 'WAVE_PEAK',
  WAVE_COMPLETED: 'WAVE_COMPLETED',
  GROUP_STARTED: 'GROUP_STARTED'
});

const COMBAT_PHASES = [WavePhases.BUILDUP, WavePhases.PRESSURE, WavePhases.PEAK, WavePhases.RECOVERY];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

export class WaveDirector {
  constructor({ config, onEvent, onSpawn }) {
    this.config = config;
    this.onEvent = onEvent;
    this.onSpawn = onSpawn;
    this.minimumThreatCost = Math.min(...Object.values(config.threatCosts));
    this.reset();
  }

  reset() {
    this.wave = 0;
    this.nextWave = 1;
    this.phase = WavePhases.COMPLETE;
    this.phaseTime = 0;
    this.totalBudget = 0;
    this.spentBudget = 0;
    this.intensity = 0;
    this.lastReportedIntensity = -1;
    this.groupCooldown = 0;
    this.groupId = 0;
    this.pendingGroup = [];
    this.pendingGroupIndex = 0;
    this.memberTimer = 0;
    this.objectivePressure = 1;
    this.rng = mulberry32(1);
  }

  start(nextWave = 1) {
    this.nextWave = nextWave;
    this.enterPhase(WavePhases.PREPARE, nextWave === 1 ? this.config.firstPrepareDuration : this.config.prepareDuration);
    this.emit(WaveEvents.WAVE_PREPARE, { nextWave });
  }

  setObjectivePressure(multiplier = 1) {
    this.objectivePressure = clamp(multiplier, 1, 1.25);
    if (this.objectivePressure > 1) this.groupCooldown = Math.min(this.groupCooldown, 1.15);
  }

  update(dt, snapshot) {
    this.updateIntensity(dt, snapshot);
    this.phaseTime -= dt;
    this.groupCooldown -= dt;
    this.memberTimer -= dt;

    if (this.phase === WavePhases.PREPARE) {
      if (this.phaseTime <= 0) this.beginWave();
      return;
    }
    if (this.phase === WavePhases.COMPLETE) {
      if (this.phaseTime <= 0) this.start(this.wave + 1);
      return;
    }

    this.updatePendingGroup(snapshot);
    const phaseTarget = this.totalBudget * this.config.phaseBudgetShares[this.phase];
    const intensityCeiling = this.config.phaseIntensityCeilings[this.phase];
    const canCreateGroup = this.pendingGroup.length === 0 && this.groupCooldown <= 0 && phaseTarget - this.spentBudget >= this.minimumThreatCost;
    if (canCreateGroup && snapshot.alive < this.maxAlive && this.intensity < intensityCeiling) this.createGroup();

    if (this.phaseTime <= 0) this.advancePhase(snapshot);
    if (this.phase === WavePhases.RECOVERY && !this.hasSpendableBudget() && this.pendingGroup.length === 0 && snapshot.alive === 0) {
      this.completeWave();
    }
  }

  beginWave() {
    this.wave = this.nextWave;
    this.rng = mulberry32(0xB07E0000 + this.wave * 7919);
    this.totalBudget = Math.min(
      this.config.maxThreatBudget,
      this.config.baseThreatBudget + this.wave * this.config.threatPerWave + Math.pow(this.wave, 1.22) * this.config.threatCurve
    );
    this.spentBudget = 0;
    this.maxAlive = Math.min(this.config.maxAliveSafety, Math.round(this.config.baseMaxAlive + this.wave * this.config.maxAlivePerWave));
    this.pendingGroup.length = 0;
    this.enterPhase(WavePhases.BUILDUP);
    this.emit(WaveEvents.WAVE_STARTED, { wave: this.wave, budget: this.totalBudget, maxAlive: this.maxAlive });
  }

  advancePhase(snapshot) {
    const index = COMBAT_PHASES.indexOf(this.phase);
    if (index < COMBAT_PHASES.length - 1) {
      const next = COMBAT_PHASES[index + 1];
      this.enterPhase(next);
      if (next === WavePhases.PEAK) this.emit(WaveEvents.WAVE_PEAK, { wave: this.wave });
      return;
    }

    if (this.hasSpendableBudget() || this.pendingGroup.length > 0 || snapshot.alive > 0) {
      this.phaseTime = 2;
      return;
    }
    this.completeWave();
  }

  completeWave() {
    if (this.phase === WavePhases.COMPLETE) return;
    this.pendingGroup.length = 0;
    this.enterPhase(WavePhases.COMPLETE, this.config.completeDuration);
    this.emit(WaveEvents.WAVE_COMPLETED, { wave: this.wave });
  }

  enterPhase(phase, duration = this.config.phaseDurations[phase] || 0) {
    this.phase = phase;
    this.phaseTime = duration;
    this.groupCooldown = Math.min(this.groupCooldown, 0.5);
    this.emit(WaveEvents.PRESSURE_CHANGED, { wave: this.wave, phase, intensity: this.intensity });
  }

  updateIntensity(dt, snapshot) {
    const activePressure = snapshot.alive / Math.max(1, this.maxAlive || this.config.baseMaxAlive);
    const proximityPressure = snapshot.closeThreat / Math.max(4, (this.maxAlive || 10) * 0.55);
    const target = clamp(activePressure * 0.48 + proximityPressure * 0.3 + snapshot.recentDamage * 0.22, 0, 1);
    const blend = 1 - Math.exp(-this.config.intensitySmoothing * dt);
    this.intensity += (target - this.intensity) * blend;
    const bucket = Math.round(this.intensity * 4);
    if (bucket !== this.lastReportedIntensity) {
      this.lastReportedIntensity = bucket;
      this.emit(WaveEvents.PRESSURE_CHANGED, { wave: this.wave, phase: this.phase, intensity: this.intensity });
    }
  }

  createGroup() {
    const remaining = this.totalBudget - this.spentBudget;
    const sizeRange = this.phase === WavePhases.BUILDUP
      ? this.config.groupSizes.small
      : this.phase === WavePhases.PEAK
        ? this.config.groupSizes.pressure
        : this.config.groupSizes.medium;
    const desiredSize = Math.min(this.config.maxSpawnsPerBurst, this.randomInt(sizeRange[0], sizeRange[1]));
    this.pendingGroup.length = 0;
    let plannedCost = 0;
    for (let i = 0; i < desiredSize; i++) {
      const type = this.selectEnemyType(remaining - plannedCost);
      if (!type) break;
      this.pendingGroup.push(type);
      plannedCost += this.config.threatCosts[type];
    }
    if (!this.pendingGroup.length) return;
    this.pendingGroupIndex = 0;
    this.memberTimer = 0;
    this.groupId++;
    this.emit(WaveEvents.GROUP_STARTED, { groupId: this.groupId, size: this.pendingGroup.length, phase: this.phase });
  }

  updatePendingGroup(snapshot) {
    if (!this.pendingGroup.length || this.memberTimer > 0 || snapshot.alive >= this.maxAlive) return;
    const type = this.pendingGroup[this.pendingGroupIndex];
    const spawned = this.onSpawn({ type, groupId: this.groupId, memberIndex: this.pendingGroupIndex, phase: this.phase });
    if (!spawned) {
      this.memberTimer = 0.35;
      return;
    }
    this.spentBudget += this.config.threatCosts[type];
    this.pendingGroupIndex++;
    this.memberTimer = this.randomRange(...this.config.memberSpawnDelay);
    if (this.pendingGroupIndex >= this.pendingGroup.length) {
      this.pendingGroup.length = 0;
      const cooldown = this.config.groupCooldowns[this.phase];
      this.groupCooldown = this.randomRange(cooldown[0], cooldown[1]) * (1 + this.intensity * 0.65) / this.objectivePressure;
    }
  }

  selectEnemyType(remaining) {
    const candidates = [];
    for (const [type, unlockWave] of Object.entries(this.config.enemyUnlockWave)) {
      const cost = this.config.threatCosts[type];
      if (this.wave < unlockWave || cost > remaining + 0.35) continue;
      let weight = type === 'walker' ? 6 : type === 'runner' ? 2.2 : 1.1;
      if (type === 'tank') weight = this.phase === WavePhases.PEAK ? 0.8 + this.wave * 0.04 : 0.08;
      if (type === 'stalker' && this.phase === WavePhases.BUILDUP) weight *= 0.35;
      if (type === 'spitter' && this.phase === WavePhases.PEAK) weight *= 1.35;
      if (this.wave % 5 === 0 && type === 'tank' && this.phase === WavePhases.PEAK) weight *= 3;
      candidates.push({ type, weight });
    }
    if (!candidates.length) return remaining >= this.config.threatCosts.walker ? 'walker' : null;
    const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    let roll = this.rng() * totalWeight;
    for (const candidate of candidates) {
      roll -= candidate.weight;
      if (roll <= 0) return candidate.type;
    }
    return candidates[candidates.length - 1].type;
  }

  hasSpendableBudget() {
    return this.totalBudget - this.spentBudget >= this.minimumThreatCost;
  }

  randomRange(min, max) {
    return min + this.rng() * (max - min);
  }

  randomInt(min, max) {
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  emit(type, detail) {
    this.onEvent?.({ type, ...detail });
  }
}
