export const CFG = Object.freeze({
  arenaHalf: 29,
  eyeH: 1.62,
  pRadius: 0.45,
  walk: 4.5,
  sprint: 7.5,
  accel: 14,
  decel: 18,
  airControl: 0.45,
  jumpSpeed: 5.2,
  gravity: 15.5,
  stamMax: 100,
  stamDrain: 25,
  stamRegen: 18,
  stamUnlockAt: 20,
  fovBase: 75,
  fovSprint: 82,
  hpMax: 100,
  thinkInterval: 0.15,
  mouseSense: 0.0022,
  touchSense: 0.005,
  fixedStep: 1 / 60,
  maxDelta: 0.1,
  maxSubSteps: 5
});

export const WEAPONS = Object.freeze({
  pistol: {
    id: 'pistol', slot: 1, name: 'PISTOLA 9MM', icon: '🔫',
    dmg: 38, headMult: 2.6, magSize: 8, rate: 0.25, reloadTime: 0.95,
    spread: 0.010, pellets: 1, range: 80, kick: 0.016, auto: false,
    reserveStart: Infinity, reserveCap: Infinity
  },
  shotgun: {
    id: 'shotgun', slot: 2, name: 'ESCOPETA CAL. 12', icon: '💥',
    dmg: 18, headMult: 1.9, magSize: 6, rate: 0.85, reloadTime: 2.0,
    spread: 0.055, pellets: 10, range: 30, kick: 0.045, auto: false,
    reserveStart: 24, reserveCap: 48
  },
  smg: {
    id: 'smg', slot: 3, name: 'SUBFUSIL VECTOR', icon: '⚡',
    dmg: 17, headMult: 2.0, magSize: 45, rate: 0.075, reloadTime: 1.3,
    spread: 0.024, pellets: 1, range: 60, kick: 0.007, auto: true,
    reserveStart: 90, reserveCap: 220
  },
  rifle: {
    id: 'rifle', slot: 4, name: 'RIFLE AK-74', icon: '🎯',
    dmg: 28, headMult: 2.3, magSize: 30, rate: 0.11, reloadTime: 1.6,
    spread: 0.016, pellets: 1, range: 95, kick: 0.012, auto: true,
    reserveStart: 60, reserveCap: 180
  },
  sniper: {
    id: 'sniper', slot: 5, name: 'FRANCOTIRADOR AWP', icon: '🏹',
    dmg: 190, headMult: 5.0, magSize: 5, rate: 1.1, reloadTime: 2.2,
    spread: 0.002, pellets: 1, range: 120, kick: 0.055, auto: false, pierce: true,
    reserveStart: 15, reserveCap: 30
  },
  rpg: {
    id: 'rpg', slot: 6, name: 'LANZACOHETES RPG-7', icon: '🚀',
    dmg: 220, headMult: 1.0, magSize: 1, rate: 1.4, reloadTime: 2.4,
    spread: 0.001, pellets: 1, range: 100, kick: 0.07, auto: false, isExplosive: true,
    reserveStart: 4, reserveCap: 10
  }
});

export const ZTYPES = Object.freeze({
  walker: { type: 'walker', name: 'Caminante', hp: 55, speed: 1.7, dmg: 12, radius: 0.42, scale: 1.0, growlF: 80, attackCd: 1.1, windup: 0.36 },
  runner: { type: 'runner', name: 'Corredor Feral', hp: 35, speed: 4.3, dmg: 10, radius: 0.38, scale: 0.92, growlF: 130, attackCd: 0.65, windup: 0.22 },
  tank: { type: 'tank', name: 'Titán Mutante', hp: 420, speed: 1.35, dmg: 28, radius: 0.75, scale: 1.55, growlF: 45, attackCd: 1.6, windup: 0.55, isBoss: true },
  spitter: { type: 'spitter', name: 'Escupidor Ácido', hp: 65, speed: 2.2, dmg: 16, radius: 0.44, scale: 1.05, growlF: 110, attackCd: 2.2, windup: 0.6, isRanged: true },
  boomer: { type: 'boomer', name: 'Zombi Explosivo', hp: 60, speed: 2.5, dmg: 40, radius: 0.58, scale: 1.25, growlF: 60, attackCd: 0.5, windup: 0.4, isKamikaze: true },
  stalker: { type: 'stalker', name: 'Espectro Sombrío', hp: 45, speed: 3.8, dmg: 14, radius: 0.40, scale: 0.95, growlF: 150, attackCd: 0.8, windup: 0.25, isFlanker: true }
});

export const SPAWN_POINTS = Object.freeze([[-20, -25], [20, -25], [-20, 25], [20, 25], [-25, 0], [25, 0], [0, -26], [0, 26]]);
export const PICKUP_SPOTS = Object.freeze([[0, -9], [0, 9], [-9, -18], [9, 18], [-18, -21], [18, 21], [-24, 10], [24, -10], [11, 5], [-11, -5], [5, -24], [-5, 24]]);
export const PICKUP_COLORS = Object.freeze({ medkit: 0xff3333, medkit_small: 0xff6b5f, ammo: 0x00f0ff, credits: 0xffd166, shotgun: 0xffaa00, smg: 0xa855f7, rifle: 0x2ecc71, sniper: 0xf59e0b, rpg: 0xf43f5e });
export const BLOOD_COLORS = Object.freeze([0x8b0000, 0x5c0000, 0x990000, 0x4a1208]);
export const ACID_COLORS = Object.freeze([0xa3e635, 0x65a30d, 0x84cc16, 0xd9f99d]);
export const EXPLOSION_COLORS = Object.freeze([0xff5500, 0xffaa00, 0xff2200, 0x555555]);

export const WAVE_CONFIG = Object.freeze({
  prepareDuration: 8,
  firstPrepareDuration: 3,
  completeDuration: 3.2,
  phaseDurations: Object.freeze({ BUILDUP: 11, PRESSURE: 19, PEAK: 13, RECOVERY: 9 }),
  phaseBudgetShares: Object.freeze({ BUILDUP: 0.2, PRESSURE: 0.62, PEAK: 0.92, RECOVERY: 1 }),
  phaseIntensityCeilings: Object.freeze({ BUILDUP: 0.58, PRESSURE: 0.82, PEAK: 0.98, RECOVERY: 0.7 }),
  groupCooldowns: Object.freeze({ BUILDUP: [2.8, 4.2], PRESSURE: [1.7, 2.8], PEAK: [1.05, 1.8], RECOVERY: [3.6, 5.2] }),
  groupSizes: Object.freeze({ small: [2, 3], medium: [3, 5], pressure: [4, 7] }),
  memberSpawnDelay: Object.freeze([0.2, 0.48]),
  baseThreatBudget: 9,
  threatPerWave: 4.8,
  threatCurve: 0.72,
  maxThreatBudget: 120,
  baseMaxAlive: 10,
  maxAlivePerWave: 1.7,
  maxAliveSafety: 46,
  maxSpawnsPerBurst: 7,
  intensitySmoothing: 2.2,
  threatCosts: Object.freeze({ walker: 1, runner: 1.35, spitter: 1.7, boomer: 1.85, stalker: 1.75, tank: 4.2 }),
  enemyUnlockWave: Object.freeze({ walker: 1, runner: 1, boomer: 2, spitter: 3, tank: 4, stalker: 6 })
});

export const SPAWN_CONFIG = Object.freeze({
  minSpawnDistance: 15,
  preferredSpawnDistance: 34,
  maxSpawnDistance: 55,
  visibleDotThreshold: 0.35,
  visiblePenalty: 34,
  coveredBonus: 13,
  preferredDistanceWeight: 1.15,
  densityRadius: 8,
  densityPenalty: 7,
  recentPointPenalty: 24,
  recentPointCooldown: 8,
  groupAnchorBonus: 22,
  directionHoldDuration: 11
});

export const AUDIO_CONFIG = Object.freeze({
  masterVolume: 0.6,
  buses: Object.freeze({ ui: 0.85, weapons: 1, enemies: 0.9, ambient: 0.34, music: 0.24, effects: 0.9 }),
  spatial: Object.freeze({ refDistance: 3.5, maxDistance: 42, rolloffFactor: 1.25, distanceModel: 'inverse' }),
  zombieVoices: Object.freeze({ maxVoices: 12, offscreenPriorityBonus: 0.16, attackPriorityBonus: 0.28, minRepeatDelay: 0.8 }),
  ambience: Object.freeze({ baseLevel: 0.055, hordeMaxLevel: 0.14, smoothing: 1.8, updateInterval: 0.2 })
});

export const ECONOMY_CONFIG = Object.freeze({
  startingCredits: 60,
  maxWeaponLevel: 3,
  killRewards: Object.freeze({ walker: 18, runner: 23, tank: 120, spitter: 32, boomer: 38, stalker: 35 }),
  waveRewardBase: 48,
  waveRewardPerWave: 17,
  waveThreatBonus: 1.5,
  healthStation: Object.freeze({ cost: 135, heal: 42 }),
  doorCost: 460,
  ammo: Object.freeze({
    shotgun: Object.freeze({ cost: 105, magazines: 2 }),
    smg: Object.freeze({ cost: 90, magazines: 2.2 }),
    rifle: Object.freeze({ cost: 115, magazines: 2 }),
    sniper: Object.freeze({ cost: 175, magazines: 1.8 }),
    rpg: Object.freeze({ cost: 235, magazines: 2 })
  }),
  weaponUpgrades: Object.freeze({
    pistol: Object.freeze({ costs: Object.freeze([250, 520]), steps: Object.freeze([Object.freeze({ stat: 'dmg', multiply: 1.1 }), Object.freeze({ stat: 'reloadTime', multiply: 0.86 })]) }),
    shotgun: Object.freeze({ costs: Object.freeze([330, 690]), steps: Object.freeze([Object.freeze({ stat: 'spread', multiply: 0.88 }), Object.freeze({ stat: 'reloadTime', multiply: 0.86 })]) }),
    smg: Object.freeze({ costs: Object.freeze([300, 650]), steps: Object.freeze([Object.freeze({ stat: 'magSize', add: 9 }), Object.freeze({ stat: 'spread', multiply: 0.84 })]) }),
    rifle: Object.freeze({ costs: Object.freeze([350, 740]), steps: Object.freeze([Object.freeze({ stat: 'dmg', multiply: 1.1 }), Object.freeze({ stat: 'reloadTime', multiply: 0.88 })]) }),
    sniper: Object.freeze({ costs: Object.freeze([440, 880]), steps: Object.freeze([Object.freeze({ stat: 'reloadTime', multiply: 0.86 }), Object.freeze({ stat: 'dmg', multiply: 1.12 })]) }),
    rpg: Object.freeze({ costs: Object.freeze([520, 980]), steps: Object.freeze([Object.freeze({ stat: 'reloadTime', multiply: 0.86 }), Object.freeze({ stat: 'dmg', multiply: 1.1 })]) })
  })
});

export const INTERACTION_CONFIG = Object.freeze({
  maxDistance: 3.4,
  minAimDot: 0.84,
  visibilityRadius: 0.12,
  stations: Object.freeze({
    health: Object.freeze({ position: Object.freeze([7, 0, 21]), color: 0x65d47e, label: 'AUXILIO' }),
    ammo: Object.freeze({ position: Object.freeze([-1.5, 0, -12]), color: 0x39d7ef, label: 'MUNICIÓN' }),
    upgrade: Object.freeze({ position: Object.freeze([-19, 0, 8]), color: 0xffb75e, label: 'ARMERÍA' }),
    door: Object.freeze({ position: Object.freeze([20.5, 0, 14]), color: 0xe35b4f, label: 'CONTROL' })
  }),
  routeDoor: Object.freeze({ position: Object.freeze([21, 1.6, 12]), size: Object.freeze([16, 3.2, 0.5]) })
});

export const DROP_CONFIG = Object.freeze({
  poolSize: 20,
  maxActiveDrops: 6,
  minKillsBetweenDrops: 2,
  baseDropChance: 0.075,
  lowAmmoRatio: 0.2,
  lowHealthRatio: 0.35,
  ammoNeedBoost: 0.085,
  healthNeedBoost: 0.065,
  ammoPityKills: 9,
  healthPityKills: 11,
  pityPerKill: 0.008,
  maxPityBoost: 0.08,
  weights: Object.freeze({ ammo: 0.42, medkit_small: 0.25, credits: 0.33 }),
  lifetime: 20,
  creditAmount: 32,
  smallHeal: 20,
  ammoMagazines: 0.75
});

export const OBJECTIVE_CONFIG = Object.freeze({
  firstWave: 3,
  chanceBase: 0.42,
  chancePerWave: 0.035,
  maxChance: 0.72,
  maxDryWaves: 2,
  cooldownWaves: 2,
  maxStartIntensity: 0.68,
  announceDuration: 1.35,
  resultDuration: 2.2,
  hudUpdateInterval: 0.1,
  recentTypeCount: 2,
  recentLocationCount: 3,
  typeWeights: Object.freeze({ RESTORE_POWER: 1, DEFEND_POSITION: 1, SUPPLY_CACHE: 1.15 }),
  restorePower: Object.freeze({
    holdTime: 2.8,
    holdDecay: 0.34,
    cancelPenalty: 0.45,
    lifetime: 58,
    rewardCredits: 185,
    disabledStation: 'ammo'
  }),
  defendPosition: Object.freeze({
    baseDuration: 17,
    durationPerWave: 0.62,
    maxDuration: 25,
    lifetimePadding: 26,
    progressDecay: 0.22,
    radius: 5.2,
    rewardCredits: 225,
    pressureMultiplier: 1.16,
    spawnBiasBonus: 19,
    minObjectiveSpawnDistance: 12
  }),
  supplyCache: Object.freeze({
    holdTime: 2.1,
    holdDecay: 0.5,
    cancelPenalty: 0.35,
    lifetime: 32,
    rewardCredits: 145,
    heal: 24,
    ammoMagazines: 1.1
  }),
  strongDamageInterrupt: 18,
  locations: Object.freeze({
    RESTORE_POWER: Object.freeze([
      Object.freeze({ id: 'generator-warehouse', label: 'TABLERO DEL ALMACÉN', position: Object.freeze([8, 0, -18]), lightIds: Object.freeze(['warehouse']) }),
      Object.freeze({ id: 'generator-west', label: 'TABLERO EXTERIOR', position: Object.freeze([-22, 0, -8]), lightIds: Object.freeze(['streetlamp']) }),
      Object.freeze({ id: 'generator-service', label: 'TABLERO DE SERVICIO', position: Object.freeze([22, 0, 7]), lightIds: Object.freeze(['alley']), requiresDoorOpen: true })
    ]),
    DEFEND_POSITION: Object.freeze([
      Object.freeze({ id: 'defend-south', label: 'ZONA INICIAL', position: Object.freeze([0, 0, 21]), spawnIndices: Object.freeze([2, 3, 7]) }),
      Object.freeze({ id: 'defend-warehouse', label: 'ALMACÉN', position: Object.freeze([0, 0, -11]), spawnIndices: Object.freeze([0, 1, 6]) }),
      Object.freeze({ id: 'defend-entry', label: 'ENTRADA ROTA', position: Object.freeze([0, 0, -24]), spawnIndices: Object.freeze([0, 1, 4, 5]) }),
      Object.freeze({ id: 'defend-alley', label: 'RUTA DE SERVICIO', position: Object.freeze([21, 0, 5]), spawnIndices: Object.freeze([1, 3, 5]), requiresDoorOpen: true })
    ]),
    SUPPLY_CACHE: Object.freeze([
      Object.freeze({ id: 'cache-west', label: 'CALLEJÓN OESTE', position: Object.freeze([-23, 0, 10]) }),
      Object.freeze({ id: 'cache-east', label: 'PATIO ESTE', position: Object.freeze([23, 0, -9]) }),
      Object.freeze({ id: 'cache-north', label: 'ENTRADA ROTA', position: Object.freeze([10, 0, -24]) }),
      Object.freeze({ id: 'cache-southwest', label: 'MUELLE SUR', position: Object.freeze([-12, 0, 23]) }),
      Object.freeze({ id: 'cache-service', label: 'RUTA DE SERVICIO', position: Object.freeze([23, 0, 18]), requiresDoorOpen: true })
    ])
  })
});

const perk = (id, name, description, category, maxStacks = 1, modifiers = null, incompatible = []) => Object.freeze({
  id, name, description, category, maxStacks,
  modifiers: modifiers ? Object.freeze(modifiers) : null,
  incompatible: Object.freeze(incompatible)
});

export const PERK_CONFIG = Object.freeze({
  seedBase: 0xB07E5000,
  firstWave: 3,
  waveIntervals: Object.freeze([2, 3]),
  offerSize: 3,
  recentPerkCount: 5,
  recentCategoryCount: 3,
  recentPerkPenalty: 0.28,
  recentCategoryPenalty: 0.72,
  categoryVarietyBoost: 1.85,
  categoryRepeatPenalty: 0.22,
  pityPerMiss: 0.18,
  durations: Object.freeze({ momentum: 3, secondWind: 4 }),
  cooldowns: Object.freeze({ secondWind: 22 }),
  thresholds: Object.freeze({ secondWindHealth: 0.32, crowdNearby: 2 }),
  multipliers: Object.freeze({
    quickHandsReload: 1.12,
    deepMagSize: 1.15,
    steadyHandSpread: 0.88,
    steadyHandRecoil: 0.88,
    momentumSpeed: 1.15,
    lastRoundDamage: 1.25,
    cleanKillDropChance: 0.04,
    scavengerDropChance: 1.18,
    scavengerNeedWeight: 1.15,
    fieldMedicHealing: 1.2,
    secondWindSpeed: 1.2,
    adrenalineReload: 1.15,
    adrenalineSpeed: 1.08,
    quietStepsNoise: 0.55,
    loudGunshotNoise: 1.35,
    loudDamage: 1.1,
    staggerPower: 1.16,
    crowdStagger: 1.22,
    supplyCredits: 1.25,
    supplyResources: 1.18,
    contractorReward: 1.12,
    stationDiscount: 0.92,
    upgradeDiscount: 0.96,
    dangerousReward: 1.22,
    lightAcceleration: 1.14,
    lightStaminaRegen: 1.1
  }),
  definitions: Object.freeze([
    perk('quickHands', 'RECARGA RÁPIDA', 'Recargas un 12% más rápido por nivel.', 'UTILITY', 3, { 'weapon.reloadSpeed': 1.12 }),
    perk('deepMag', 'CARGADOR PROFUNDO', 'Tus cargadores admiten un 15% más de munición, sin añadir reserva.', 'UTILITY', 2, { 'weapon.magSize': 1.15 }),
    perk('steadyHand', 'PULSO FIRME', 'Reduce moderadamente dispersión y retroceso.', 'OFFENSE', 2, { 'weapon.spread': 0.88, 'weapon.recoil': 0.88 }),
    perk('momentum', 'IMPULSO', 'Cada baja te permite moverte más rápido durante 3 segundos.', 'MOBILITY'),
    perk('lastRound', 'ÚLTIMA BALA', 'El último disparo del cargador inflige un 25% más de daño.', 'OFFENSE'),
    perk('cleanKill', 'BAJA LIMPIA', 'Las bajas precisas tienen una pequeña oportunidad extra de soltar recursos.', 'UTILITY'),
    perk('scavenger', 'CARROÑERO', 'Los drops aparecen algo más y responden mejor a tus necesidades.', 'ECONOMY', 2, { 'drops.chance': 1.18, 'drops.needWeight': 1.15 }),
    perk('fieldMedic', 'MÉDICO DE CAMPO', 'Las fuentes de recuperación curan un 20% más.', 'SURVIVAL', 2, { 'player.healing': 1.2 }),
    perk('secondWind', 'SEGUNDO AIRE', 'Con salud crítica, recibir daño activa velocidad temporal. Tiene enfriamiento.', 'SURVIVAL'),
    perk('adrenaline', 'ADRENALINA', 'Durante PEAK te mueves y recargas ligeramente más rápido.', 'MOBILITY'),
    perk('quietSteps', 'PASOS SILENCIOSOS', 'Tus pasos alertan a menos zombis.', 'UTILITY', 1, { 'player.footstepNoise': 0.55 }, ['loudAndProud']),
    perk('loudAndProud', 'RUIDO Y FURIA', 'Tus disparos atraen más zombis, pero infligen un 10% más de daño.', 'OFFENSE', 1, { 'weapon.gunshotNoise': 1.35, 'weapon.damage': 1.1 }, ['quietSteps']),
    perk('staggerSpecialist', 'IMPACTO BRUTAL', 'Tus impactos generan un 16% más de tambaleo por nivel.', 'OFFENSE', 2, { 'weapon.stagger': 1.16 }),
    perk('crowdControl', 'CONTROL DE MASAS', 'Los impactos sobre grupos juntos generan más tambaleo.', 'UTILITY'),
    perk('supplyRunner', 'CORREDOR DE SUMINISTROS', 'Los alijos entregan más créditos y recursos.', 'ECONOMY'),
    perk('contractor', 'CONTRATISTA', 'Los objetivos completados pagan un 12% adicional por nivel.', 'ECONOMY', 2, { 'economy.objectiveReward': 1.12 }),
    perk('bargainHunter', 'CAZADOR DE OFERTAS', 'Las estaciones cuestan menos; la armería recibe un descuento menor.', 'ECONOMY', 2, { 'economy.stationCost': 0.92, 'economy.upgradeCost': 0.96 }),
    perk('bloodMoney', 'DINERO SANGRIENTO', 'Los zombis peligrosos entregan más créditos.', 'ECONOMY', 1, { 'economy.dangerousReward': 1.22 }),
    perk('lightFooted', 'PIES LIGEROS', 'Aceleras y recuperas sprint más rápido.', 'MOBILITY', 2, { 'player.acceleration': 1.14, 'player.staminaRegen': 1.1 })
  ])
});

export const ENVIRONMENT_CONFIG = Object.freeze({
  defaultQuality: 'MEDIUM',
  renderer: Object.freeze({ exposure: 0.88, maxPixelRatio: 1.75 }),
  palette: Object.freeze({
    skyTop: 0x071019,
    skyHorizon: 0x17212a,
    fog: 0x0b1117,
    ambientSky: 0x61758b,
    ambientGround: 0x171a17,
    moon: 0xa9bfd0,
    warm: 0xffc477,
    emergency: 0xd84b3f,
    industrial: 0x91b8c7,
    concrete: 0x5b6266,
    metal: 0x343c42,
    wood: 0x745331
  }),
  fog: Object.freeze({ baseDensity: 0.0275 }),
  globalLights: Object.freeze({
    hemisphereIntensity: 0.66,
    moonIntensity: 1.65,
    moonPosition: Object.freeze([-18, 28, 12]),
    moonTarget: Object.freeze([2, 0, -5])
  }),
  quality: Object.freeze({
    LOW: Object.freeze({ shadowMapSize: 0, localLights: 3, propDensity: 0.55, dynamicZombieShadows: false, maxPixelRatio: 1.25 }),
    MEDIUM: Object.freeze({ shadowMapSize: 768, localLights: 5, propDensity: 0.78, dynamicZombieShadows: true, maxPixelRatio: 1.6 }),
    HIGH: Object.freeze({ shadowMapSize: 1024, localLights: 5, propDensity: 1, dynamicZombieShadows: true, maxPixelRatio: 1.75 })
  }),
  localLights: Object.freeze([
    Object.freeze({ id: 'streetlamp', position: Object.freeze([-19, 3.7, 7]), color: 0xffc477, intensity: 72, distance: 15, decay: 1.8, flicker: 'stable' }),
    Object.freeze({ id: 'warehouse', position: Object.freeze([0, 4.45, -10]), color: 0x91b8c7, intensity: 60, distance: 17, decay: 1.9, flicker: 'soft' }),
    Object.freeze({ id: 'south-exit', position: Object.freeze([0, 3.6, 22]), color: 0xffc477, intensity: 48, distance: 15, decay: 1.9, flicker: 'stable' }),
    Object.freeze({ id: 'broken-entry', position: Object.freeze([0, 3.3, -27.8]), color: 0xd84b3f, intensity: 55, distance: 13, decay: 1.9, flicker: 'faulty' }),
    Object.freeze({ id: 'alley', position: Object.freeze([21.5, 2.8, 4]), color: 0x789ead, intensity: 40, distance: 12, decay: 2, flicker: 'soft' })
  ]),
  flickerPatterns: Object.freeze({
    stable: Object.freeze([1, 1, 1, 1]),
    soft: Object.freeze([1, 0.96, 1, 0.88, 1, 1]),
    faulty: Object.freeze([1, 1, 0.18, 0.82, 0.08, 1, 0.72, 1, 1, 1])
  }),
  props: Object.freeze({ barrels: 12, pallets: 8, debris: 22, stains: 12 }),
  zombiePalettes: Object.freeze({
    walker: Object.freeze({ skin: 0x6b765d, cloth: 0x4b4239, eyes: 0x8f2523, torso: 1, head: 1 }),
    runner: Object.freeze({ skin: 0x788064, cloth: 0x493837, eyes: 0xa92d24, torso: 0.92, head: 0.94 }),
    tank: Object.freeze({ skin: 0x59684e, cloth: 0x343b32, eyes: 0x7d261f, torso: 1.14, head: 1.08 }),
    spitter: Object.freeze({ skin: 0x70834f, cloth: 0x3f4b34, eyes: 0x9e9b39, torso: 1.02, head: 1.02 }),
    boomer: Object.freeze({ skin: 0x77704d, cloth: 0x554231, eyes: 0xaa4b28, torso: 1.12, head: 0.98 }),
    stalker: Object.freeze({ skin: 0x536469, cloth: 0x30393f, eyes: 0x6e8892, torso: 0.94, head: 0.96 })
  })
});

export const EFFECTS_CONFIG = Object.freeze({
  weaponFeel: Object.freeze({
    pistol: Object.freeze({ cameraKick: 0.012, cameraYaw: 0.002, weaponKick: 0.022, recovery: 15, flashScale: 0.82, flashIntensity: 70, flashDuration: 0.045, crosshairBloom: 3.5 }),
    shotgun: Object.freeze({ cameraKick: 0.04, cameraYaw: 0.007, weaponKick: 0.062, recovery: 7.5, flashScale: 1.4, flashIntensity: 160, flashDuration: 0.075, crosshairBloom: 9 }),
    smg: Object.freeze({ cameraKick: 0.006, cameraYaw: 0.003, weaponKick: 0.013, recovery: 18, flashScale: 0.7, flashIntensity: 55, flashDuration: 0.035, crosshairBloom: 2.2 }),
    rifle: Object.freeze({ cameraKick: 0.014, cameraYaw: 0.004, weaponKick: 0.028, recovery: 12, flashScale: 0.95, flashIntensity: 85, flashDuration: 0.05, crosshairBloom: 4.2 }),
    sniper: Object.freeze({ cameraKick: 0.052, cameraYaw: 0.006, weaponKick: 0.075, recovery: 6.5, flashScale: 1.28, flashIntensity: 180, flashDuration: 0.08, crosshairBloom: 8 }),
    rpg: Object.freeze({ cameraKick: 0.06, cameraYaw: 0.004, weaponKick: 0.09, recovery: 5.8, flashScale: 1.55, flashIntensity: 220, flashDuration: 0.1, crosshairBloom: 10 })
  }),
  impact: Object.freeze({
    maxFlashes: 20,
    flashLifetime: 0.11,
    weaponForce: Object.freeze({ pistol: 0.8, shotgun: 1.35, smg: 0.55, rifle: 0.95, sniper: 1.8, rpg: 2.2 })
  }),
  damage: Object.freeze({ indicatorCount: 4, indicatorLifetime: 0.65, cameraKick: 0.016, flashOpacity: 0.72 }),
  corpses: Object.freeze({ lifetime: 4.2, fallDuration: 0.48, fadeDuration: 1.15, maxVisible: 12 }),
  access: Object.freeze({ maxDustParticles: 36, maxLights: 3, cueCooldown: 3.5, dustPerCue: 8, lightLifetime: 1.8, baseIntensity: 2.8, peakMultiplier: 1.55 }),
  fog: Object.freeze({ PREPARE: 0.0265, BUILDUP: 0.028, PRESSURE: 0.029, PEAK: 0.031, RECOVERY: 0.027, COMPLETE: 0.0255, smoothing: 0.8 })
});

export const ANIMATION_CONFIG = Object.freeze({
  speedMultiplier: Object.freeze([0.9, 1.1]),
  idleBob: 0.018,
  moveBob: 0.045,
  torsoSway: 0.055,
  maxLegSwing: 0.55,
  attackLean: 0.18,
  hitOffset: 0.12,
  visualRecovery: 8.5,
  deathPitch: Object.freeze([1.0, 1.38]),
  deathRoll: Object.freeze([0.12, 0.48])
});

export const AI_CONFIG = Object.freeze({
  debug: Object.freeze({ enabled: false }),
  perception: Object.freeze({
    sightRange: 22,
    proximityRange: 6.5,
    fieldOfViewCos: -0.15,
    alertPropagationRange: 7,
    idleForgetDelay: 9
  }),
  hearing: Object.freeze({
    GUNSHOT: 1,
    PLAYER_ACTION: 0.85,
    IMPACT: 0.7,
    EXPLOSION: 1.2,
    ENVIRONMENTAL: 0.65
  }),
  noise: Object.freeze({
    footsteps: Object.freeze({ walk: 5, sprint: 9 }),
    gunshots: Object.freeze({ pistol: 22, shotgun: 34, smg: 25, rifle: 31, sniper: 40, rpg: 42 }),
    impact: 6,
    explosion: 48
  }),
  memory: Object.freeze({
    seenDuration: 5.5,
    heardDuration: 7.5,
    investigateDuration: 4.5,
    arrivalDistance: 1.25
  }),
  attack: Object.freeze({
    slotCount: 10,
    slotRadius: 1.85,
    claimDistance: 10,
    releaseDistance: 15,
    triggerPadding: 0.2,
    hitPadding: 0.65,
    recovery: 0.42,
    fallbackRadius: 3.4
  }),
  separation: Object.freeze({
    cellSize: 3,
    neighborRadius: 2.4,
    strength: 1.05,
    maxForce: 1.35
  }),
  stagger: Object.freeze({
    minDamageRatio: 0.28,
    durationMin: 0.12,
    durationMax: 0.34,
    immunity: 0.7
  }),
  lod: Object.freeze({
    nearDistance: 13,
    midDistance: 29,
    nearThinkInterval: 0.1,
    midThinkInterval: 0.32,
    farThinkInterval: 0.75,
    nearPerceptionInterval: 0.14,
    midPerceptionInterval: 0.42,
    farPerceptionInterval: 0.9
  }),
  navigation: Object.freeze({
    cellSize: 2,
    clearance: 0.72,
    repathInterval: 0.85,
    targetMoveThreshold: 3.2,
    waypointDistance: 0.8,
    stuckCheckInterval: 1.35,
    stuckDistance: 0.38,
    maxSearchNodes: 700
  }),
  variation: Object.freeze({
    speed: Object.freeze([0.92, 1.08]),
    turnSpeed: Object.freeze([4.5, 7.2]),
    aggression: Object.freeze([0.85, 1.15]),
    reactionDelay: Object.freeze([0.08, 0.38]),
    preferredDistance: Object.freeze([0.92, 1.12]),
    separationStrength: Object.freeze([0.85, 1.2])
  })
});
