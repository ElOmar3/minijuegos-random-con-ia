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

export class DropDirector {
  constructor(config) {
    this.config = config;
    this.modifiers = { chance: 1, needWeight: 1, precisionChance: 0 };
    this.reset();
  }

  setModifiers(modifiers = {}) {
    this.modifiers = { ...this.modifiers, ...modifiers };
  }

  reset(seed = 1) {
    this.random = mulberry32(seed);
    this.cooldownKills = 0;
    this.ammoPity = 0;
    this.healthPity = 0;
    this.creditPity = 0;
  }

  recordKill({ healthRatio, ammoRatio, activeDrops, precise = false, precisionChance = 0 }) {
    this.cooldownKills++;
    this.ammoPity++;
    this.healthPity++;
    this.creditPity++;
    if (activeDrops >= this.config.maxActiveDrops || this.cooldownKills < this.config.minKillsBetweenDrops) return null;

    if (ammoRatio < this.config.lowAmmoRatio && this.ammoPity >= this.config.ammoPityKills) return this.select('ammo');
    if (healthRatio < this.config.lowHealthRatio && this.healthPity >= this.config.healthPityKills) return this.select('medkit_small');

    const needBoost = ((1 - ammoRatio) * this.config.ammoNeedBoost + (1 - healthRatio) * this.config.healthNeedBoost) * this.modifiers.needWeight;
    const pityBoost = Math.min(this.config.maxPityBoost, this.creditPity * this.config.pityPerKill);
    const preciseBoost = precise ? Math.max(precisionChance, this.modifiers.precisionChance) : 0;
    if (this.random() > this.config.baseDropChance * this.modifiers.chance + needBoost + pityBoost + preciseBoost) return null;

    const ammoWeight = this.config.weights.ammo * (0.45 + (1 - ammoRatio) * 1.55);
    const healthWeight = this.config.weights.medkit_small * (0.35 + (1 - healthRatio) * 1.65);
    const creditWeight = this.config.weights.credits;
    const total = ammoWeight + healthWeight + creditWeight;
    const roll = this.random() * total;
    if (roll < ammoWeight) return this.select('ammo');
    if (roll < ammoWeight + healthWeight) return this.select('medkit_small');
    return this.select('credits');
  }

  select(type) {
    this.cooldownKills = 0;
    this.creditPity = 0;
    if (type === 'ammo') this.ammoPity = 0;
    if (type === 'medkit_small') this.healthPity = 0;
    return type;
  }
}
