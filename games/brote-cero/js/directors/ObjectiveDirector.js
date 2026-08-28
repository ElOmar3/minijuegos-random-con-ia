export const ObjectiveStates = Object.freeze({
  INACTIVE: 'INACTIVE',
  ANNOUNCING: 'ANNOUNCING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  COOLDOWN: 'COOLDOWN'
});

export const ObjectiveTypes = Object.freeze({
  RESTORE_POWER: 'RESTORE_POWER',
  DEFEND_POSITION: 'DEFEND_POSITION',
  SUPPLY_CACHE: 'SUPPLY_CACHE'
});

export const ObjectiveEvents = Object.freeze({
  ANNOUNCED: 'ANNOUNCED',
  STARTED: 'STARTED',
  UPDATED: 'UPDATED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  ENDED: 'ENDED'
});

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

export class ObjectiveDirector {
  constructor({ config, onEvent = () => {}, getCandidates = () => [], isCandidateAvailable = () => true }) {
    this.config = config;
    this.onEvent = onEvent;
    this.getCandidates = getCandidates;
    this.isCandidateAvailable = isCandidateAvailable;
    this.reset();
  }

  reset(seed = 0x0B1EC710) {
    this.state = ObjectiveStates.INACTIVE;
    this.current = null;
    this.wave = 0;
    this.cooldownUntilWave = 0;
    this.lastObjectiveWave = 0;
    this.recentTypes = [];
    this.recentLocations = [];
    this.resultTimer = 0;
    this.updateReportTimer = 0;
    this.rng = mulberry32(seed);
    this.stats = { completed: 0, failed: 0 };
  }

  onWaveStarted(snapshot) {
    this.wave = snapshot.wave;
    if (this.state === ObjectiveStates.COOLDOWN && snapshot.wave >= this.cooldownUntilWave) {
      this.state = ObjectiveStates.INACTIVE;
    }
    if (this.state !== ObjectiveStates.INACTIVE || snapshot.wave < this.config.firstWave) return false;
    if (snapshot.intensity > (this.config.maxStartIntensity ?? 0.72)) return false;

    const dryWaves = this.lastObjectiveWave > 0
      ? snapshot.wave - this.lastObjectiveWave
      : snapshot.wave - this.config.firstWave + 1;
    const chance = clamp(
      this.config.chanceBase + Math.max(0, snapshot.wave - this.config.firstWave) * this.config.chancePerWave,
      0,
      this.config.maxChance
    );
    if (dryWaves < this.config.maxDryWaves && this.rng() > chance) return false;

    const selection = this.selectObjective(snapshot);
    if (!selection) return false;
    this.begin(selection.type, selection.location, snapshot.wave);
    return true;
  }

  selectObjective(snapshot) {
    const choices = [];
    for (const type of Object.values(ObjectiveTypes)) {
      let weight = this.config.typeWeights[type] || 0;
      if (weight <= 0) continue;
      const locations = this.getCandidates(type, snapshot).filter(location => this.isCandidateAvailable(location, snapshot, type));
      if (!locations.length) continue;
      const recentIndex = this.recentTypes.lastIndexOf(type);
      if (recentIndex >= 0) weight *= recentIndex === this.recentTypes.length - 1 ? 0.08 : 0.38;
      choices.push({ type, weight, locations });
    }
    if (!choices.length) return null;

    let roll = this.rng() * choices.reduce((sum, choice) => sum + choice.weight, 0);
    let choice = choices[choices.length - 1];
    for (const candidate of choices) {
      roll -= candidate.weight;
      if (roll <= 0) { choice = candidate; break; }
    }
    const freshLocations = choice.locations.filter(location => !this.recentLocations.includes(location.id));
    const pool = freshLocations.length ? freshLocations : choice.locations;
    const location = pool[Math.floor(this.rng() * pool.length)];
    return { type: choice.type, location };
  }

  begin(type, location, wave) {
    const defendTarget = Math.min(
      this.config.defendPosition.maxDuration,
      this.config.defendPosition.baseDuration + wave * this.config.defendPosition.durationPerWave
    );
    const lifetime = type === ObjectiveTypes.RESTORE_POWER
      ? this.config.restorePower.lifetime
      : type === ObjectiveTypes.SUPPLY_CACHE
        ? this.config.supplyCache.lifetime
        : defendTarget + this.config.defendPosition.lifetimePadding;
    this.current = {
      type,
      location,
      wave,
      progress: 0,
      target: type === ObjectiveTypes.DEFEND_POSITION ? defendTarget : 1,
      remaining: lifetime,
      elapsed: 0
    };
    this.state = ObjectiveStates.ANNOUNCING;
    this.resultTimer = this.config.announceDuration;
    this.updateReportTimer = 0;
    this.lastObjectiveWave = wave;
    this.pushRecent(this.recentTypes, type, this.config.recentTypeCount);
    this.pushRecent(this.recentLocations, location.id, this.config.recentLocationCount || 3);
    this.emit(ObjectiveEvents.ANNOUNCED);
  }

  update(dt, snapshot = {}) {
    if (this.state === ObjectiveStates.ANNOUNCING) {
      this.resultTimer -= dt;
      if (this.resultTimer <= 0) {
        this.state = ObjectiveStates.ACTIVE;
        this.emit(ObjectiveEvents.STARTED);
      }
      return;
    }
    if (this.state === ObjectiveStates.COMPLETED || this.state === ObjectiveStates.FAILED) {
      this.resultTimer -= dt;
      if (this.resultTimer <= 0) this.end();
      return;
    }
    if (this.state !== ObjectiveStates.ACTIVE || !this.current) return;

    this.current.elapsed += dt;
    this.current.remaining = Math.max(0, this.current.remaining - dt);
    if (this.current.type === ObjectiveTypes.DEFEND_POSITION) {
      if (snapshot.insideObjective) this.current.progress = Math.min(this.current.target, this.current.progress + dt);
      else this.current.progress = Math.max(0, this.current.progress - dt * this.config.defendPosition.progressDecay);
      if (this.current.progress >= this.current.target) {
        this.complete();
        return;
      }
    }
    if (this.current.remaining <= 0) {
      this.fail('expired');
      return;
    }
    this.updateReportTimer -= dt;
    if (this.updateReportTimer <= 0) {
      this.updateReportTimer = this.config.hudUpdateInterval || 0.1;
      this.emit(ObjectiveEvents.UPDATED);
    }
  }

  complete(detail = {}) {
    if (this.state !== ObjectiveStates.ACTIVE || !this.current) return false;
    this.state = ObjectiveStates.COMPLETED;
    this.stats.completed++;
    this.resultTimer = this.config.resultDuration;
    this.emit(ObjectiveEvents.COMPLETED, detail);
    return true;
  }

  fail(reason = 'expired') {
    if (![ObjectiveStates.ANNOUNCING, ObjectiveStates.ACTIVE].includes(this.state) || !this.current) return false;
    this.state = ObjectiveStates.FAILED;
    this.stats.failed++;
    this.resultTimer = this.config.resultDuration;
    this.emit(ObjectiveEvents.FAILED, { reason });
    return true;
  }

  onWaveCompleted() {
    if (this.state === ObjectiveStates.ANNOUNCING || this.state === ObjectiveStates.ACTIVE) this.fail('wave-ended');
  }

  end() {
    if (!this.current) return;
    const ended = this.current;
    this.state = ObjectiveStates.COOLDOWN;
    this.cooldownUntilWave = ended.wave + this.config.cooldownWaves + 1;
    this.current = null;
    this.emit(ObjectiveEvents.ENDED, { objective: ended });
  }

  pushRecent(history, value, limit) {
    history.push(value);
    while (history.length > limit) history.shift();
  }

  emit(type, detail = {}) {
    this.onEvent({ type, state: this.state, objective: this.current, stats: { ...this.stats }, ...detail });
  }
}
