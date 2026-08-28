import { AttackSlotManager } from './AttackSlotManager.js';
import { GridNavigation } from './GridNavigation.js';
import { NoiseSystem } from './NoiseSystem.js';
import { SpatialHash } from './SpatialHash.js';
import { ZombieAI } from './ZombieAI.js';
import { ZombieStates } from './ZombieStates.js';

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const random = (min, max) => min + Math.random() * (max - min);

export class ZombieManager {
  constructor({
    zombies,
    playerPosition,
    playerRadius,
    arenaHalf,
    config,
    animationConfig,
    corpseConfig,
    isBlocked,
    isPlaying,
    onDamagePlayer,
    onRangedAttack,
    onGrowl,
    onStateChanged,
    onDeactivate,
    riseDuration,
    deathDuration
  }) {
    this.zombies = zombies;
    this.playerPosition = playerPosition;
    this.playerRadius = playerRadius;
    this.config = config;
    this.animationConfig = animationConfig;
    this.corpseConfig = corpseConfig;
    this.isBlocked = isBlocked;
    this.isPlaying = isPlaying;
    this.onDamagePlayer = onDamagePlayer;
    this.onRangedAttack = onRangedAttack;
    this.onGrowl = onGrowl;
    this.onStateChanged = onStateChanged;
    this.onDeactivate = onDeactivate;
    this.riseDuration = riseDuration;
    this.deathDuration = deathDuration;

    this.spatial = new SpatialHash(config.separation.cellSize);
    this.noise = new NoiseSystem();
    this.slots = new AttackSlotManager(config.attack);
    this.navigation = new GridNavigation({
      min: -arenaHalf,
      max: arenaHalf,
      config: config.navigation,
      isBlocked
    });

    this.currentZombie = null;
    this.separationX = 0;
    this.separationZ = 0;
    this.bestAlertNeighbor = null;
    this.collectNeighbor = other => this.accumulateNeighbor(other);

    for (let i = 0; i < zombies.length; i++) {
      zombies[i].ai = new ZombieAI(zombies[i], i, config, animationConfig);
    }
  }

  spawn(zombie, type, now, entryTarget) {
    zombie.ai.spawn(type, now, entryTarget);
    zombie.riseT = this.riseDuration;
    zombie.dieT = 0;
    zombie.windup = -1;
    zombie.attackCd = zombie.cfg.attackCd * 0.5;
    zombie.acidCd = random(1.4, 2.5);
    zombie.desiredYaw = zombie.yaw;
    zombie.growlAt = now + random(0.5, 2);
  }

  emitNoise(position, radius, type, now) {
    return this.noise.emit(position, radius, type, now);
  }

  onHit(zombie, damage, weaponId, isHeadshot, now, impactDirection, impactForce = 1, staggerMultiplier = 1) {
    const previousState = zombie.state;
    zombie.ai.applyHitReaction(impactDirection, impactForce, isHeadshot);
    if (zombie.ai.tryStagger(damage, weaponId, isHeadshot, now, staggerMultiplier)) {
      this.slots.release(zombie);
      zombie.forceRepath = true;
      this.onStateChanged?.(zombie, previousState, zombie.state);
      return true;
    }
    return false;
  }

  kill(zombie, impactDirection, impactForce = 1, isHeadshot = false) {
    const previousState = zombie.state;
    this.slots.release(zombie);
    zombie.ai.applyHitReaction(impactDirection, impactForce, isHeadshot);
    zombie.ai.kill();
    zombie.dieT = this.deathDuration;
    zombie.forceRepath = false;
    this.onStateChanged?.(zombie, previousState, zombie.state);
  }

  deactivate(zombie) {
    this.slots.release(zombie);
    zombie.ai?.reset();
  }

  reset() {
    this.noise.reset();
    this.spatial.clear();
    this.slots.reset(this.zombies);
    for (const zombie of this.zombies) zombie.ai?.reset();
  }

  update(dt, now) {
    this.slots.update(this.playerPosition, this.zombies);
    this.spatial.beginFrame();
    for (const zombie of this.zombies) {
      if (zombie.active && zombie.state !== ZombieStates.DEAD && zombie.state !== ZombieStates.SPAWNING) {
        this.spatial.insert(zombie);
      }
    }

    for (let i = 0; i < this.zombies.length; i++) {
      const zombie = this.zombies[i];
      if (!zombie.active) continue;
      const previousState = zombie.state;
      this.updateZombie(zombie, i, dt, now);
      if (zombie.active && zombie.state !== previousState) this.onStateChanged?.(zombie, previousState, zombie.state);
    }
    this.enforceCorpseLimit();
  }

  updateZombie(zombie, index, dt, now) {
    if (zombie.state === ZombieStates.SPAWNING) {
      zombie.riseT -= dt;
      const progress = clamp(1 - zombie.riseT / this.riseDuration, 0, 1);
      zombie.vScale = zombie.scaleBase * (0.25 + 0.75 * progress);
      zombie.yOff = -(1 - progress) * 1.4;
      if (zombie.riseT <= 0) {
        zombie.yOff = 0;
        zombie.vScale = zombie.scaleBase;
        zombie.ai.setState(ZombieStates.INVESTIGATE);
        zombie.nextThink = now;
      }
      return;
    }

    if (zombie.state === ZombieStates.DEAD) {
      zombie.dieT -= dt;
      zombie.corpseAge += dt;
      const fallProgress = clamp(zombie.corpseAge / this.corpseConfig.fallDuration, 0, 1);
      const easedFall = fallProgress * fallProgress * (3 - 2 * fallProgress);
      const fadeStart = this.deathDuration - this.corpseConfig.fadeDuration;
      const fadeProgress = clamp((zombie.corpseAge - fadeStart) / this.corpseConfig.fadeDuration, 0, 1);
      zombie.visualPitch = zombie.deathPitch * easedFall;
      zombie.visualRoll = zombie.deathRoll * easedFall;
      zombie.hitOffsetX *= Math.exp(-2.5 * dt);
      zombie.hitOffsetZ *= Math.exp(-2.5 * dt);
      zombie.yOff = -easedFall * 0.16 - fadeProgress * 1.35;
      zombie.vScale = zombie.scaleBase * (1 - fadeProgress * 0.28);
      if (zombie.dieT <= 0) this.onDeactivate(index, zombie);
      return;
    }

    this.updateVisualRecovery(zombie, dt);

    const dx = this.playerPosition.x - zombie.pos.x;
    const dz = this.playerPosition.z - zombie.pos.z;
    const distance = Math.hypot(dx, dz);
    this.updateLod(zombie, distance);
    zombie.attackCd = Math.max(0, zombie.attackCd - dt);
    zombie.acidCd = Math.max(0, zombie.acidCd - dt);

    if (zombie.state === ZombieStates.STAGGER) {
      zombie.staggerTimer -= dt;
      if (zombie.staggerTimer <= 0) {
        zombie.staggerLean = 0;
        zombie.ai.setState(zombie.alertLevel > 0.65 ? ZombieStates.CHASE : ZombieStates.INVESTIGATE);
        zombie.nextThink = now;
      }
      return;
    }

    if (now >= zombie.nextPerception) this.updatePerception(zombie, distance, dx, dz, now);

    if (zombie.state === ZombieStates.ATTACK) {
      this.updateAttack(zombie, distance, dt, now);
      this.turnToward(zombie, Math.atan2(dx, dz), dt);
      return;
    }

    this.slots.releaseIfFar(zombie, this.playerPosition);
    if (now >= zombie.nextThink) this.updateSteering(zombie, distance, now);

    if (zombie.cfg.isRanged && zombie.state === ZombieStates.CHASE && zombie.acidCd <= 0 && distance > 5 && distance < 18 && zombie.hasLineOfSight && this.isPlaying()) {
      zombie.acidCd = zombie.cfg.attackCd + random(0.5, 1.5);
      this.onRangedAttack(zombie);
    }

    this.moveZombie(zombie, dt, now);
    this.updateGrowl(zombie, distance, now);
  }

  updateVisualRecovery(zombie, dt) {
    const rate = zombie.state === ZombieStates.STAGGER ? this.animationConfig.visualRecovery * 0.35 : this.animationConfig.visualRecovery;
    const decay = Math.exp(-rate * dt);
    zombie.visualPitch *= decay;
    zombie.visualRoll *= decay;
    zombie.visualYaw *= decay;
    zombie.hitOffsetX *= decay;
    zombie.hitOffsetZ *= decay;
  }

  enforceCorpseLimit() {
    let corpseCount = 0;
    for (const zombie of this.zombies) if (zombie.active && zombie.state === ZombieStates.DEAD) corpseCount++;
    while (corpseCount > this.corpseConfig.maxVisible) {
      let candidateIndex = -1;
      let candidateScore = -Infinity;
      for (let i = 0; i < this.zombies.length; i++) {
        const zombie = this.zombies[i];
        if (!zombie.active || zombie.state !== ZombieStates.DEAD) continue;
        const distance = Math.hypot(zombie.pos.x - this.playerPosition.x, zombie.pos.z - this.playerPosition.z);
        const score = zombie.corpseAge + distance * 0.018;
        if (score > candidateScore) { candidateScore = score; candidateIndex = i; }
      }
      if (candidateIndex < 0) break;
      this.onDeactivate(candidateIndex, this.zombies[candidateIndex]);
      corpseCount--;
    }
  }

  updateLod(zombie, distance) {
    if (distance <= this.config.lod.nearDistance) zombie.lod = 'NEAR';
    else if (distance <= this.config.lod.midDistance) zombie.lod = 'MID';
    else zombie.lod = 'FAR';
  }

  lodInterval(zombie, kind) {
    const lod = zombie.lod.toLowerCase();
    const key = `${lod}${kind === 'think' ? 'ThinkInterval' : 'PerceptionInterval'}`;
    return this.config.lod[key] * (0.9 + (zombie.id % 5) * 0.045);
  }

  updatePerception(zombie, distance, dx, dz, now) {
    zombie.nextPerception = now + this.lodInterval(zombie, 'perception');
    const event = this.noise.findStrongestAudible(zombie.pos, zombie.lastNoiseSequence, now, this.config.hearing);
    if (event) zombie.ai.hear(event, now);

    this.currentZombie = zombie;
    this.bestAlertNeighbor = null;
    this.spatial.forEachNearby(zombie.pos.x, zombie.pos.z, this.config.perception.alertPropagationRange, this.collectNeighbor);
    if (this.bestAlertNeighbor) zombie.ai.inheritAlert(this.bestAlertNeighbor, now);

    const sightRange = this.config.perception.sightRange * zombie.sightMultiplier;
    let canSee = false;
    if (distance <= this.config.perception.proximityRange) {
      canSee = this.navigation.hasLineOfSight(zombie.pos, this.playerPosition, 0.22);
    } else if (distance <= sightRange) {
      const invDistance = 1 / Math.max(distance, 0.001);
      const forwardX = Math.sin(zombie.yaw);
      const forwardZ = Math.cos(zombie.yaw);
      const dot = forwardX * dx * invDistance + forwardZ * dz * invDistance;
      const threshold = zombie.alertLevel > 0.55 ? -0.55 : this.config.perception.fieldOfViewCos;
      canSee = dot >= threshold && this.navigation.hasLineOfSight(zombie.pos, this.playerPosition, 0.22);
    }

    if (canSee) zombie.ai.seePlayer(this.playerPosition, now);
    else zombie.ai.updateMemory(now);
  }

  accumulateNeighbor(other) {
    const zombie = this.currentZombie;
    if (!zombie || other === zombie || !other.active || other.state === ZombieStates.DEAD) return;
    const dx = zombie.pos.x - other.pos.x;
    const dz = zombie.pos.z - other.pos.z;
    const distanceSq = dx * dx + dz * dz;

    if (distanceSq <= this.config.separation.neighborRadius * this.config.separation.neighborRadius && distanceSq > 0.0001) {
      const distance = Math.sqrt(distanceSq);
      const desired = zombie.radius + other.radius + 0.28;
      if (distance < desired) {
        const strength = (1 - distance / desired) * zombie.separationStrength;
        this.separationX += dx / distance * strength;
        this.separationZ += dz / distance * strength;
      }
    }

    if (
      distanceSq <= this.config.perception.alertPropagationRange ** 2 &&
      other.alertLevel > (this.bestAlertNeighbor?.alertLevel || 0)
    ) this.bestAlertNeighbor = other;
  }

  updateSteering(zombie, distance, now) {
    zombie.nextThink = now + this.lodInterval(zombie, 'think');
    const ai = zombie.ai;
    if (zombie.state !== ZombieStates.CHASE) this.slots.release(zombie);
    if (zombie.state === ZombieStates.IDLE) return;

    if (zombie.state === ZombieStates.CHASE) {
      this.slots.claim(zombie, this.playerPosition);
      this.slots.writeTarget(zombie, this.playerPosition, ai.steeringTarget, now);
    } else {
      ai.steeringTarget.copy(ai.lastKnownPlayerPosition);
      const targetDx = ai.steeringTarget.x - zombie.pos.x;
      const targetDz = ai.steeringTarget.z - zombie.pos.z;
      if (targetDx * targetDx + targetDz * targetDz < this.config.memory.arrivalDistance ** 2 && now > zombie.investigateUntil) {
        zombie.ai.setState(ZombieStates.IDLE);
        return;
      }
    }

    const attackRange = 1.2 + zombie.radius + this.playerRadius + this.config.attack.triggerPadding;
    const facingPlayer = Math.abs(Math.atan2(Math.sin(Math.atan2(this.playerPosition.x - zombie.pos.x, this.playerPosition.z - zombie.pos.z) - zombie.yaw), Math.cos(Math.atan2(this.playerPosition.x - zombie.pos.x, this.playerPosition.z - zombie.pos.z) - zombie.yaw))) < 1.15;
    if (zombie.state === ZombieStates.CHASE && zombie.attackSlot >= 0 && distance <= attackRange && zombie.attackCd <= 0 && facingPlayer) {
      this.beginAttack(zombie);
      return;
    }

    let movementTarget = ai.steeringTarget;
    const directPath = this.navigation.hasLineOfSight(zombie.pos, ai.steeringTarget, zombie.radius);
    const targetMoved = ai.pathTarget.distanceToSquared(ai.steeringTarget) > this.config.navigation.targetMoveThreshold ** 2;
    if (!directPath) {
      if (zombie.forceRepath || targetMoved || now >= zombie.nextPathAt || ai.pathIndex >= ai.path.length) {
        this.navigation.findPath(zombie.pos, ai.steeringTarget, ai.path);
        ai.pathIndex = 0;
        ai.pathTarget.copy(ai.steeringTarget);
        zombie.nextPathAt = now + this.config.navigation.repathInterval * (zombie.lod === 'FAR' ? 1.8 : 1);
        zombie.forceRepath = false;
      }
      while (ai.pathIndex < ai.path.length) {
        const waypoint = ai.path[ai.pathIndex];
        const wx = waypoint.x - zombie.pos.x;
        const wz = waypoint.z - zombie.pos.z;
        if (wx * wx + wz * wz > this.config.navigation.waypointDistance ** 2) break;
        ai.pathIndex++;
      }
      if (ai.pathIndex < ai.path.length) {
        const waypoint = ai.path[ai.pathIndex];
        ai.steeringTarget.set(waypoint.x, 0, waypoint.z);
        movementTarget = ai.steeringTarget;
      }
    } else {
      ai.path.length = 0;
      ai.pathIndex = 0;
    }

    let desiredX = movementTarget.x - zombie.pos.x;
    let desiredZ = movementTarget.z - zombie.pos.z;
    const desiredLength = Math.hypot(desiredX, desiredZ) || 1;
    desiredX /= desiredLength;
    desiredZ /= desiredLength;

    this.currentZombie = zombie;
    this.separationX = 0;
    this.separationZ = 0;
    this.spatial.forEachNearby(zombie.pos.x, zombie.pos.z, this.config.separation.neighborRadius, this.collectNeighbor);
    const separationLength = Math.hypot(this.separationX, this.separationZ);
    if (separationLength > this.config.separation.maxForce) {
      this.separationX = this.separationX / separationLength * this.config.separation.maxForce;
      this.separationZ = this.separationZ / separationLength * this.config.separation.maxForce;
    }
    desiredX += this.separationX * this.config.separation.strength;
    desiredZ += this.separationZ * this.config.separation.strength;

    this.checkStuck(zombie, now);
    if (now < zombie.recoveryUntil) {
      desiredX += ai.recoveryDirection.x * 1.4;
      desiredZ += ai.recoveryDirection.z * 1.4;
    }

    const angleOffsets = [0, 0.42, -0.42, 0.85, -0.85, 1.25, -1.25];
    const baseAngle = Math.atan2(desiredX, desiredZ);
    for (const offset of angleOffsets) {
      const angle = baseAngle + offset;
      const testX = Math.sin(angle);
      const testZ = Math.cos(angle);
      if (!this.isBlocked(zombie.pos.x + testX * 1.15, zombie.pos.z + testZ * 1.15, zombie.radius)) {
        zombie.desiredYaw = angle;
        return;
      }
    }
    zombie.forceRepath = true;
    zombie.desiredYaw = baseAngle + Math.PI * 0.5;
  }

  checkStuck(zombie, now) {
    if (now < zombie.stuckCheckAt) return;
    const ai = zombie.ai;
    const movedSq = ai.progressPosition.distanceToSquared(zombie.pos);
    if (movedSq < this.config.navigation.stuckDistance ** 2) {
      zombie.stuckCount++;
      zombie.forceRepath = true;
      if (zombie.stuckCount >= 2 && this.navigation.writeRecoveryDirection(zombie.pos, zombie.id + zombie.stuckCount, ai.recoveryDirection)) {
        zombie.recoveryUntil = now + 0.75;
      }
    } else {
      zombie.stuckCount = 0;
    }
    ai.progressPosition.copy(zombie.pos);
    zombie.stuckCheckAt = now + this.config.navigation.stuckCheckInterval;
  }

  moveZombie(zombie, dt) {
    if (zombie.state !== ZombieStates.CHASE && zombie.state !== ZombieStates.INVESTIGATE) return;
    this.turnToward(zombie, zombie.desiredYaw, dt);
    zombie.dir.set(Math.sin(zombie.yaw), 0, Math.cos(zombie.yaw));
    const stateMultiplier = zombie.state === ZombieStates.INVESTIGATE ? 0.82 : 1;
    const lodMultiplier = zombie.lod === 'FAR' ? 0.94 : 1;
    const step = zombie.speed * zombie.moveSpeedMultiplier * stateMultiplier * lodMultiplier * dt;
    const desiredX = zombie.pos.x + zombie.dir.x * step;
    const desiredZ = zombie.pos.z + zombie.dir.z * step;
    const result = this.collide(desiredX, desiredZ, zombie.radius);
    if (Math.abs(result.x - desiredX) > 0.02 || Math.abs(result.z - desiredZ) > 0.02) zombie.forceRepath = true;
    zombie.pos.x = result.x;
    zombie.pos.z = result.z;
    zombie.phase += dt * zombie.speed * zombie.moveSpeedMultiplier * zombie.animationSpeedMultiplier * 2.2;
  }

  collide(x, z, radius) {
    return this.collisionResolver(x, z, radius);
  }

  setCollisionResolver(resolver) {
    this.collisionResolver = resolver;
  }

  turnToward(zombie, targetYaw, dt) {
    let delta = targetYaw - zombie.yaw;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;
    const maxTurn = zombie.turnSpeed * dt;
    zombie.yaw += clamp(delta, -maxTurn, maxTurn);
  }

  beginAttack(zombie) {
    zombie.ai.setState(ZombieStates.ATTACK);
    zombie.attackPhase = 'windup';
    zombie.attackTimer = zombie.cfg.windup / zombie.aggression;
    zombie.windup = zombie.attackTimer;
  }

  updateAttack(zombie, distance, dt) {
    zombie.attackTimer -= dt;
    if (zombie.attackPhase === 'windup') {
      zombie.windup = Math.max(0, zombie.attackTimer);
      if (zombie.attackTimer > 0) return;
      const hitRange = 1.2 + zombie.radius + this.playerRadius + this.config.attack.hitPadding;
      if (distance <= hitRange && this.isPlaying()) {
        this.onDamagePlayer(zombie);
        this.onGrowl(zombie, true);
      }
      zombie.windup = -1;
      zombie.attackPhase = 'recovery';
      zombie.attackTimer = this.config.attack.recovery + zombie.cfg.attackCd * 0.18;
      zombie.attackCd = zombie.cfg.attackCd;
      return;
    }

    if (zombie.attackTimer <= 0) {
      zombie.attackPhase = 'none';
      zombie.ai.setState(ZombieStates.CHASE);
      zombie.nextThink = 0;
    }
  }

  updateGrowl(zombie, distance, now) {
    if (now < zombie.growlAt) return;
    zombie.growlAt = now + clamp(distance * 0.12, 1.2, 5) + random(0.5, 2.5);
    this.onGrowl(zombie, false);
  }
}

export { ZombieStates };
