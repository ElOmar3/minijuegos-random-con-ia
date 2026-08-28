import * as THREE from 'three';
import { ZombieStates } from './ZombieStates.js';

const TYPE_MODIFIERS = Object.freeze({
  walker: { reaction: 1, turn: 1, aggression: 1, stagger: 1, sight: 1 },
  runner: { reaction: 0.55, turn: 1.22, aggression: 1.12, stagger: 1.15, sight: 1.08 },
  tank: { reaction: 1.45, turn: 0.68, aggression: 0.92, stagger: 0.38, sight: 0.9 },
  spitter: { reaction: 0.9, turn: 0.92, aggression: 0.88, stagger: 0.9, sight: 1.12 },
  boomer: { reaction: 0.85, turn: 0.9, aggression: 1.08, stagger: 0.72, sight: 1 },
  stalker: { reaction: 0.65, turn: 1.18, aggression: 1.15, stagger: 1.05, sight: 1.18 }
});

const WEAPON_STAGGER = Object.freeze({
  pistol: 1,
  shotgun: 1.35,
  smg: 0.72,
  rifle: 1.05,
  sniper: 2,
  rpg: 2.4
});

const randomRange = ([min, max]) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class ZombieAI {
  constructor(zombie, id, config, animationConfig) {
    this.zombie = zombie;
    this.id = id;
    this.config = config;
    this.animationConfig = animationConfig;
    this.lastKnownPlayerPosition = new THREE.Vector3();
    this.lastHeardPosition = new THREE.Vector3();
    this.steeringTarget = new THREE.Vector3();
    this.pathTarget = new THREE.Vector3(Infinity, 0, Infinity);
    this.progressPosition = new THREE.Vector3();
    this.recoveryDirection = new THREE.Vector3();
    this.path = [];
    this.pathIndex = 0;
    this.reset();
  }

  reset() {
    const zombie = this.zombie;
    zombie.id = this.id;
    zombie.state = ZombieStates.IDLE;
    zombie.alertLevel = 0;
    zombie.lastSeenTime = -Infinity;
    zombie.lastHeardTime = -Infinity;
    zombie.lastNoiseSequence = 0;
    zombie.nextPerception = 0;
    zombie.nextThink = 0;
    zombie.attackSlot = -1;
    zombie.attackPhase = 'none';
    zombie.attackTimer = 0;
    zombie.attackCd = 0;
    zombie.staggerTimer = 0;
    zombie.staggerImmunityUntil = 0;
    zombie.staggerLean = 0;
    zombie.visualPitch = 0;
    zombie.visualRoll = 0;
    zombie.visualYaw = 0;
    zombie.hitOffsetX = 0;
    zombie.hitOffsetZ = 0;
    zombie.lastImpactX = 0;
    zombie.lastImpactZ = 0;
    zombie.deathPitch = 0;
    zombie.deathRoll = 0;
    zombie.corpseAge = 0;
    zombie.lod = 'FAR';
    zombie.spatialCell = '';
    zombie.stuckCheckAt = 0;
    zombie.stuckCount = 0;
    zombie.forceRepath = false;
    zombie.nextPathAt = 0;
    zombie.recoveryUntil = 0;
    zombie.investigateUntil = 0;
    zombie.hasLineOfSight = false;
    zombie.moveSpeedMultiplier = 1;
    zombie.turnSpeed = 5.5;
    zombie.aggression = 1;
    zombie.reactionDelay = 0.2;
    zombie.preferredDistance = 1;
    zombie.separationStrength = 1;
    zombie.sightMultiplier = 1;
    zombie.staggerSensitivity = 1;
    zombie.animationSpeedMultiplier = 1;
    zombie.idleOffset = Math.random() * Math.PI * 2;
    this.path.length = 0;
    this.pathIndex = 0;
    this.pathTarget.set(Infinity, 0, Infinity);
  }

  spawn(type, now, entryTarget) {
    this.reset();
    const zombie = this.zombie;
    const modifier = TYPE_MODIFIERS[type] || TYPE_MODIFIERS.walker;
    zombie.moveSpeedMultiplier = randomRange(this.config.variation.speed);
    zombie.turnSpeed = randomRange(this.config.variation.turnSpeed) * modifier.turn;
    zombie.aggression = randomRange(this.config.variation.aggression) * modifier.aggression;
    zombie.reactionDelay = randomRange(this.config.variation.reactionDelay) * modifier.reaction;
    zombie.preferredDistance = randomRange(this.config.variation.preferredDistance);
    zombie.separationStrength = randomRange(this.config.variation.separationStrength);
    zombie.sightMultiplier = modifier.sight;
    zombie.staggerSensitivity = modifier.stagger;
    zombie.animationSpeedMultiplier = randomRange(this.animationConfig.speedMultiplier);
    zombie.idleOffset = Math.random() * Math.PI * 2;
    zombie.nextPerception = now + zombie.reactionDelay;
    zombie.nextThink = now + zombie.reactionDelay;
    const entryDistance = Math.hypot(entryTarget.x - zombie.pos.x, entryTarget.z - zombie.pos.z);
    const travelSpeed = Math.max(0.8, zombie.speed * zombie.moveSpeedMultiplier * 0.82);
    zombie.investigateUntil = now + entryDistance / travelSpeed + 3;
    zombie.alertLevel = 0.25;
    this.lastKnownPlayerPosition.copy(entryTarget);
    this.lastHeardPosition.copy(entryTarget);
    this.progressPosition.copy(zombie.pos);
    this.setState(ZombieStates.SPAWNING);
  }

  setState(state) {
    this.zombie.state = state;
  }

  seePlayer(playerPosition, now) {
    const zombie = this.zombie;
    this.lastKnownPlayerPosition.copy(playerPosition);
    zombie.lastSeenTime = now;
    zombie.alertLevel = 1;
    zombie.hasLineOfSight = true;
    if (zombie.state !== ZombieStates.ATTACK && zombie.state !== ZombieStates.STAGGER) {
      this.setState(ZombieStates.CHASE);
    }
  }

  hear(event, now) {
    const zombie = this.zombie;
    this.lastHeardPosition.set(event.x, 0, event.z);
    this.lastKnownPlayerPosition.copy(this.lastHeardPosition);
    zombie.lastHeardTime = now;
    zombie.lastNoiseSequence = Math.max(zombie.lastNoiseSequence, event.sequence);
    zombie.alertLevel = Math.max(zombie.alertLevel, 0.58);
    zombie.investigateUntil = now + this.config.memory.investigateDuration;
    if (zombie.state === ZombieStates.IDLE) this.setState(ZombieStates.INVESTIGATE);
  }

  inheritAlert(other, now) {
    const zombie = this.zombie;
    if (other.alertLevel < 0.65 || zombie.alertLevel >= other.alertLevel * 0.75) return;
    this.lastKnownPlayerPosition.copy(other.ai.lastKnownPlayerPosition);
    zombie.alertLevel = Math.max(zombie.alertLevel, other.alertLevel * 0.72);
    zombie.investigateUntil = now + this.config.memory.investigateDuration;
    if (zombie.state === ZombieStates.IDLE) this.setState(ZombieStates.INVESTIGATE);
  }

  updateMemory(now) {
    const zombie = this.zombie;
    zombie.hasLineOfSight = false;
    const seenAge = now - zombie.lastSeenTime;
    const heardAge = now - zombie.lastHeardTime;
    if (zombie.state === ZombieStates.CHASE && seenAge > this.config.memory.seenDuration) {
      zombie.investigateUntil = now + this.config.memory.investigateDuration;
      this.setState(ZombieStates.INVESTIGATE);
    }
    if (zombie.state === ZombieStates.INVESTIGATE && now > zombie.investigateUntil && seenAge > this.config.memory.seenDuration && heardAge > this.config.memory.heardDuration) {
      zombie.alertLevel = 0;
      this.setState(ZombieStates.IDLE);
    }
    zombie.alertLevel = Math.max(0, zombie.alertLevel - 0.025);
  }

  applyHitReaction(impactDirection, impactForce, isHeadshot) {
    if (!impactDirection) return;
    const zombie = this.zombie;
    const length = Math.hypot(impactDirection.x, impactDirection.z) || 1;
    const impactX = impactDirection.x / length;
    const impactZ = impactDirection.z / length;
    const forwardX = Math.sin(zombie.yaw);
    const forwardZ = Math.cos(zombie.yaw);
    const rightX = Math.cos(zombie.yaw);
    const rightZ = -Math.sin(zombie.yaw);
    const forwardImpact = impactX * forwardX + impactZ * forwardZ;
    const sideImpact = impactX * rightX + impactZ * rightZ;
    const response = Math.min(1.5, impactForce * zombie.staggerSensitivity * (isHeadshot ? 1.12 : 1));
    zombie.visualPitch += clamp(-forwardImpact * response * 0.16, -0.25, 0.25);
    zombie.visualRoll += clamp(-sideImpact * response * 0.18, -0.3, 0.3);
    zombie.hitOffsetX += impactX * this.animationConfig.hitOffset * response;
    zombie.hitOffsetZ += impactZ * this.animationConfig.hitOffset * response;
    zombie.lastImpactX = impactX;
    zombie.lastImpactZ = impactZ;
  }

  tryStagger(damage, weaponId, isHeadshot, now, perkMultiplier = 1) {
    const zombie = this.zombie;
    if (now < zombie.staggerImmunityUntil || zombie.state === ZombieStates.DEAD || zombie.state === ZombieStates.SPAWNING) return false;
    const ratio = damage / Math.max(1, zombie.maxHp);
    const power = ratio * (WEAPON_STAGGER[weaponId] || 1) * (isHeadshot ? 1.2 : 1) * zombie.staggerSensitivity * perkMultiplier;
    if (power < this.config.stagger.minDamageRatio) return false;

    const normalized = Math.min(1, power);
    zombie.staggerTimer = this.config.stagger.durationMin + (this.config.stagger.durationMax - this.config.stagger.durationMin) * normalized;
    zombie.staggerImmunityUntil = now + this.config.stagger.immunity + zombie.staggerTimer;
    zombie.staggerLean = (Math.random() < 0.5 ? -1 : 1) * (0.12 + normalized * 0.24);
    zombie.windup = -1;
    zombie.attackPhase = 'none';
    this.setState(ZombieStates.STAGGER);
    return true;
  }

  kill() {
    const zombie = this.zombie;
    zombie.windup = -1;
    zombie.attackPhase = 'none';
    zombie.alertLevel = 0;
    zombie.corpseAge = 0;
    const forwardX = Math.sin(zombie.yaw);
    const forwardZ = Math.cos(zombie.yaw);
    const rightX = Math.cos(zombie.yaw);
    const rightZ = -Math.sin(zombie.yaw);
    const forwardImpact = zombie.lastImpactX * forwardX + zombie.lastImpactZ * forwardZ;
    const sideImpact = zombie.lastImpactX * rightX + zombie.lastImpactZ * rightZ;
    const [pitchMin, pitchMax] = this.animationConfig.deathPitch;
    const [rollMin, rollMax] = this.animationConfig.deathRoll;
    const pitchMagnitude = pitchMin + Math.random() * (pitchMax - pitchMin);
    const rollMagnitude = rollMin + Math.random() * (rollMax - rollMin);
    zombie.deathPitch = (Math.abs(forwardImpact) > 0.15 ? -Math.sign(forwardImpact) : Math.random() < 0.5 ? -1 : 1) * pitchMagnitude;
    zombie.deathRoll = (Math.abs(sideImpact) > 0.12 ? -Math.sign(sideImpact) : Math.random() < 0.5 ? -1 : 1) * rollMagnitude;
    this.path.length = 0;
    this.pathIndex = 0;
    this.setState(ZombieStates.DEAD);
  }
}
