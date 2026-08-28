export const EconomyEvents = Object.freeze({
  EARNED: 'EARNED',
  SPENT: 'SPENT',
  INSUFFICIENT: 'INSUFFICIENT',
  WEAPON_UPGRADED: 'WEAPON_UPGRADED'
});

export class EconomyManager {
  constructor(config, onEvent = () => {}) {
    this.config = config;
    this.onEvent = onEvent;
    this.modifiers = { stationCost: 1, upgradeCost: 1, objectiveReward: 1, dangerousReward: 1 };
    this.reset();
  }

  setModifiers(modifiers = {}) {
    this.modifiers = { ...this.modifiers, ...modifiers };
  }

  price(amount, kind = 'station') {
    const multiplier = kind === 'upgrade' ? this.modifiers.upgradeCost : this.modifiers.stationCost;
    return Math.max(0, Math.round(amount * multiplier));
  }

  reward(amount, kind = 'standard') {
    const multiplier = kind === 'objective' ? this.modifiers.objectiveReward : 1;
    return Math.max(0, Math.round(amount * multiplier));
  }

  reset() {
    this.credits = this.config.startingCredits;
    this.totalEarned = 0;
    this.totalSpent = 0;
    this.weaponLevels = Object.create(null);
    for (const weaponId of Object.keys(this.config.weaponUpgrades)) this.weaponLevels[weaponId] = 1;
    this.emit(EconomyEvents.EARNED, { amount: 0, credits: this.credits, reason: 'reset' });
  }

  emit(type, payload) {
    this.onEvent({ type, ...payload });
  }

  earn(amount, reason = 'reward') {
    const value = Math.max(0, Math.round(amount));
    if (value <= 0) return 0;
    this.credits += value;
    this.totalEarned += value;
    this.emit(EconomyEvents.EARNED, { amount: value, credits: this.credits, reason });
    return value;
  }

  spend(amount, reason = 'purchase') {
    const value = Math.max(0, Math.round(amount));
    if (value <= 0) return true;
    if (this.credits < value) {
      this.emit(EconomyEvents.INSUFFICIENT, { amount: value, credits: this.credits, reason });
      return false;
    }
    this.credits -= value;
    this.totalSpent += value;
    this.emit(EconomyEvents.SPENT, { amount: value, credits: this.credits, reason });
    return true;
  }

  killReward(type) {
    const base = this.config.killRewards[type] || this.config.killRewards.walker;
    return Math.round(base * (type === 'walker' ? 1 : this.modifiers.dangerousReward));
  }

  waveReward(wave, threatBudget = 0) {
    return Math.round(this.config.waveRewardBase + wave * this.config.waveRewardPerWave + threatBudget * this.config.waveThreatBonus);
  }

  getWeaponLevel(weaponId) {
    return this.weaponLevels[weaponId] || 1;
  }

  getUpgradeDefinition(weaponId) {
    return this.config.weaponUpgrades[weaponId] || null;
  }

  getUpgradeCost(weaponId) {
    const definition = this.getUpgradeDefinition(weaponId);
    const level = this.getWeaponLevel(weaponId);
    if (!definition || level >= this.config.maxWeaponLevel) return null;
    const base = definition.costs[level - 1] ?? null;
    return base === null ? null : this.price(base, 'upgrade');
  }

  upgradeWeapon(weaponId) {
    const cost = this.getUpgradeCost(weaponId);
    if (cost === null) return { ok: false, reason: 'max', level: this.getWeaponLevel(weaponId) };
    if (!this.spend(cost, `upgrade:${weaponId}`)) return { ok: false, reason: 'credits', cost, level: this.getWeaponLevel(weaponId) };
    const level = ++this.weaponLevels[weaponId];
    this.emit(EconomyEvents.WEAPON_UPGRADED, { weaponId, level, cost, credits: this.credits });
    return { ok: true, weaponId, level, cost };
  }

  snapshot() {
    return {
      credits: this.credits,
      earned: this.totalEarned,
      spent: this.totalSpent,
      weaponLevels: { ...this.weaponLevels }
    };
  }
}
