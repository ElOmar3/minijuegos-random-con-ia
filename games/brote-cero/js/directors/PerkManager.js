export const PerkCategories = Object.freeze({
  OFFENSE: 'OFFENSE',
  SURVIVAL: 'SURVIVAL',
  MOBILITY: 'MOBILITY',
  ECONOMY: 'ECONOMY',
  UTILITY: 'UTILITY'
});

const BASE_MODIFIERS = Object.freeze({
  player: Object.freeze({ movementSpeed: 1, acceleration: 1, staminaRegen: 1, healing: 1, footstepNoise: 1 }),
  weapon: Object.freeze({ reloadSpeed: 1, magSize: 1, spread: 1, recoil: 1, damage: 1, stagger: 1, gunshotNoise: 1 }),
  economy: Object.freeze({ stationCost: 1, upgradeCost: 1, objectiveReward: 1, dangerousReward: 1 }),
  drops: Object.freeze({ chance: 1, needWeight: 1 })
});

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

function freshModifiers() {
  return Object.fromEntries(Object.entries(BASE_MODIFIERS).map(([group, values]) => [group, { ...values }]));
}

export class PerkManager {
  constructor({ config, seed = 1, onEvent = () => {} }) {
    this.config = config;
    this.onEvent = onEvent;
    this.definitions = new Map(config.definitions.map(definition => [definition.id, definition]));
    this.categories = Object.values(PerkCategories);
    this.reset(seed);
  }

  reset(seed = 1) {
    this.random = mulberry32(seed);
    this.owned = new Map();
    this.pendingOffer = null;
    this.pendingWave = 0;
    this.nextOfferWave = this.config.firstWave;
    this.intervalIndex = 0;
    this.recentPerks = [];
    this.recentCategories = [];
    this.categoryMisses = Object.fromEntries(this.categories.map(category => [category, 0]));
    this.phase = 'PREPARE';
    this.elapsed = 0;
    this.buffs = new Map();
    this.cooldowns = new Map();
    this.modifiers = freshModifiers();
    this.emit('RESET');
  }

  emit(type, payload = {}) {
    this.onEvent({ type, ...payload });
  }

  getDefinition(id) {
    return this.definitions.get(id) || null;
  }

  getStack(id) {
    return this.owned.get(id) || 0;
  }

  has(id) {
    return this.getStack(id) > 0;
  }

  getOwned() {
    return [...this.owned.entries()].map(([id, stacks]) => ({ ...this.getDefinition(id), stacks }));
  }

  getModifier(path, fallback = 1) {
    const [group, key] = path.split('.');
    return this.modifiers[group]?.[key] ?? fallback;
  }

  isEligible(definition) {
    const stacks = this.getStack(definition.id);
    if (stacks >= definition.maxStacks) return false;
    return !definition.incompatible.some(id => this.has(id));
  }

  shouldOffer(completedWave) {
    return !this.pendingOffer && completedWave >= this.nextOfferWave;
  }

  createOffer(completedWave) {
    if (!this.shouldOffer(completedWave)) return null;
    const available = this.config.definitions.filter(definition => this.isEligible(definition));
    if (available.length < this.config.offerSize) return null;

    const offer = [];
    const usedCategories = new Set();
    while (offer.length < this.config.offerSize && available.length) {
      const weights = available.map(definition => {
        let weight = 1 + (this.categoryMisses[definition.category] || 0) * this.config.pityPerMiss;
        if (this.recentPerks.includes(definition.id)) weight *= this.config.recentPerkPenalty;
        if (this.recentCategories.includes(definition.category)) weight *= this.config.recentCategoryPenalty;
        const hasFreshCategory = available.some(candidate => !usedCategories.has(candidate.category));
        if (offer.length === 1 && hasFreshCategory && usedCategories.has(definition.category)) weight = 0;
        else if (usedCategories.has(definition.category)) weight *= this.config.categoryRepeatPenalty;
        else if (usedCategories.size) weight *= this.config.categoryVarietyBoost;
        return Math.max(0.01, weight);
      });
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      let roll = this.random() * total;
      let selectedIndex = weights.length - 1;
      for (let index = 0; index < weights.length; index++) {
        roll -= weights[index];
        if (roll <= 0) { selectedIndex = index; break; }
      }
      const [selected] = available.splice(selectedIndex, 1);
      offer.push(selected);
      usedCategories.add(selected.category);
    }

    this.pendingOffer = offer;
    this.pendingWave = completedWave;
    const offeredCategories = new Set(offer.map(definition => definition.category));
    for (const category of this.categories) {
      this.categoryMisses[category] = offeredCategories.has(category) ? 0 : this.categoryMisses[category] + 1;
    }
    this.recentCategories.push(...offeredCategories);
    this.recentCategories = this.recentCategories.slice(-this.config.recentCategoryCount);
    this.emit('OFFERED', { wave: completedWave, offer });
    return offer;
  }

  select(index) {
    const definition = this.pendingOffer?.[index];
    if (!definition) return null;
    const acquired = this.acquire(definition.id);
    if (!acquired) return null;
    this.recentPerks.push(definition.id);
    this.recentPerks = this.recentPerks.slice(-this.config.recentPerkCount);
    const interval = this.config.waveIntervals[this.intervalIndex++ % this.config.waveIntervals.length];
    this.nextOfferWave = this.pendingWave + interval;
    this.pendingOffer = null;
    this.pendingWave = 0;
    return acquired;
  }

  acquire(id) {
    const definition = this.getDefinition(id);
    if (!definition || !this.isEligible(definition)) return null;
    const stacks = this.getStack(id) + 1;
    this.owned.set(id, stacks);
    this.recomputeModifiers();
    const acquired = { ...definition, stacks };
    this.emit('ACQUIRED', { perk: acquired, owned: this.getOwned() });
    return acquired;
  }

  applyPath(path, multiplier, stacks = 1) {
    const [group, key] = path.split('.');
    if (!(key in this.modifiers[group])) return;
    this.modifiers[group][key] *= Math.pow(multiplier, stacks);
  }

  recomputeModifiers() {
    this.modifiers = freshModifiers();
    for (const [id, stacks] of this.owned) {
      const definition = this.getDefinition(id);
      for (const [path, multiplier] of Object.entries(definition.modifiers || {})) {
        this.applyPath(path, multiplier, stacks);
      }
    }
    const multipliers = this.config.multipliers;
    if (this.buffs.has('momentum')) this.modifiers.player.movementSpeed *= multipliers.momentumSpeed;
    if (this.buffs.has('secondWind')) this.modifiers.player.movementSpeed *= multipliers.secondWindSpeed;
    if (this.has('adrenaline') && this.phase === 'PEAK') {
      this.modifiers.player.movementSpeed *= multipliers.adrenalineSpeed;
      this.modifiers.weapon.reloadSpeed *= multipliers.adrenalineReload;
    }
    this.emit('MODIFIERS_CHANGED', { modifiers: this.modifiers });
  }

  activateBuff(id, duration) {
    const wasActive = this.buffs.has(id);
    const previous = this.buffs.get(id) || 0;
    this.buffs.set(id, Math.max(previous, duration));
    if (!wasActive) this.recomputeModifiers();
    this.emit('BUFF_CHANGED', { buffs: this.getActiveBuffs() });
  }

  update(dt) {
    this.elapsed += dt;
    let changed = false;
    for (const [id, remaining] of this.buffs) {
      const next = remaining - dt;
      if (next <= 0) { this.buffs.delete(id); changed = true; }
      else this.buffs.set(id, next);
    }
    if (changed) this.recomputeModifiers();
    return changed;
  }

  getActiveBuffs() {
    return [...this.buffs.entries()].map(([id, remaining]) => ({
      id,
      name: this.getDefinition(id)?.name || id,
      remaining
    }));
  }

  onZombieKilled({ precise = false, type = 'walker' } = {}) {
    if (this.has('momentum')) this.activateBuff('momentum', this.config.durations.momentum);
    return {
      precisionDropChance: precise && this.has('cleanKill') ? this.config.multipliers.cleanKillDropChance : 0,
      killRewardMultiplier: type !== 'walker' && this.has('bloodMoney') ? this.config.multipliers.dangerousReward : 1
    };
  }

  onPlayerDamaged({ healthRatio = 1 } = {}) {
    if (!this.has('secondWind') || healthRatio > this.config.thresholds.secondWindHealth) return false;
    const readyAt = this.cooldowns.get('secondWind') || 0;
    if (this.elapsed < readyAt) return false;
    this.cooldowns.set('secondWind', this.elapsed + this.config.cooldowns.secondWind);
    this.activateBuff('secondWind', this.config.durations.secondWind);
    return true;
  }

  onWavePhaseChanged(phase) {
    if (phase === this.phase) return;
    this.phase = phase;
    if (this.has('adrenaline')) this.recomputeModifiers();
  }

  getShotModifiers({ isLastRound = false, nearbyCount = 0 } = {}) {
    return {
      damage: isLastRound && this.has('lastRound') ? this.config.multipliers.lastRoundDamage : 1,
      stagger: nearbyCount >= this.config.thresholds.crowdNearby && this.has('crowdControl')
        ? this.config.multipliers.crowdStagger
        : 1
    };
  }

  getSupplyMultipliers() {
    return this.has('supplyRunner')
      ? { credits: this.config.multipliers.supplyCredits, resources: this.config.multipliers.supplyResources }
      : { credits: 1, resources: 1 };
  }
}
