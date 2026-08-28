import * as THREE from 'three';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const dampFactor = (speed, dt) => 1 - Math.exp(-speed * dt);

const IMPACT_COLORS = Object.freeze({
  concrete: 0xd7d1c8,
  metal: 0xdff7ff,
  wood: 0xffb45c,
  flesh: 0xff3b30
});

export class EffectsManager {
  constructor({ scene, hudElement, muzzleMesh, muzzleLight, config, baseFogDensity }) {
    this.scene = scene;
    this.hudElement = hudElement;
    this.muzzleMesh = muzzleMesh;
    this.muzzleLight = muzzleLight;
    this.config = config;
    this.baseFogDensity = baseFogDensity;
    this.muzzleTimer = 0;
    this.muzzleDuration = 0.05;
    this.recovery = 10;
    this.cameraPitch = 0;
    this.cameraYaw = 0;
    this.cameraRoll = 0;
    this.weaponKick = 0;
    this.crosshairBloom = 0;
    this.hitPulse = 0;
    this.accessCooldowns = new Map();
    this.elapsed = 0;
    this.createImpactPool();
    this.createDamageIndicators();
    this.createAccessEffects();
  }

  createImpactPool() {
    const geometry = new THREE.OctahedronGeometry(0.045, 0);
    this.impactFlashes = [];
    for (let i = 0; i < this.config.impact.maxFlashes; i++) {
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.scene.add(mesh);
      this.impactFlashes.push({ mesh, life: 0, maxLife: 1 });
    }
    this.impactIndex = 0;
  }

  createDamageIndicators() {
    this.damageIndicators = [];
    for (let i = 0; i < this.config.damage.indicatorCount; i++) {
      const element = document.createElement('div');
      element.className = 'damage-direction hidden';
      element.innerHTML = '<span></span>';
      this.hudElement.appendChild(element);
      this.damageIndicators.push({ element, life: 0, maxLife: this.config.damage.indicatorLifetime, angle: 0 });
    }
    this.damageIndex = 0;
  }

  createAccessEffects() {
    this.dustGeometry = new THREE.BufferGeometry();
    this.dustPositions = new Float32Array(this.config.access.maxDustParticles * 3);
    this.dustGeometry.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    this.dustMaterial = new THREE.PointsMaterial({ color: 0xb8a58b, size: 0.16, transparent: true, opacity: 0.32, depthWrite: false, sizeAttenuation: true });
    this.dustPoints = new THREE.Points(this.dustGeometry, this.dustMaterial);
    this.dustPoints.frustumCulled = false;
    this.scene.add(this.dustPoints);
    this.dust = Array.from({ length: this.config.access.maxDustParticles }, () => ({ active: false, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0 }));
    this.dustIndex = 0;
    for (let i = 0; i < this.dust.length; i++) this.hideDust(i);

    this.accessLights = [];
    for (let i = 0; i < this.config.access.maxLights; i++) {
      const light = new THREE.PointLight(0xffb36b, 0, 9, 2);
      light.visible = false;
      this.scene.add(light);
      this.accessLights.push({ light, life: 0, maxLife: 1, intensity: 0 });
    }
    this.accessLightIndex = 0;
  }

  triggerShot(weaponId, recoilMultiplier = 1) {
    const feel = this.config.weaponFeel[weaponId] || this.config.weaponFeel.pistol;
    this.recovery = feel.recovery;
    this.cameraPitch = Math.min(0.11, this.cameraPitch + feel.cameraKick * recoilMultiplier);
    this.cameraYaw = clamp(this.cameraYaw + (Math.random() - 0.5) * feel.cameraYaw * 2 * recoilMultiplier, -0.03, 0.03);
    this.weaponKick = Math.min(0.13, this.weaponKick + feel.weaponKick * recoilMultiplier);
    this.crosshairBloom = Math.min(14, this.crosshairBloom + feel.crosshairBloom * recoilMultiplier);
    this.muzzleTimer = this.muzzleDuration = feel.flashDuration;
    this.muzzleMesh.visible = true;
    this.muzzleMesh.scale.setScalar(feel.flashScale * (0.88 + Math.random() * 0.24));
    this.muzzleMesh.rotation.z = Math.random() * Math.PI;
    this.muzzleMesh.material.opacity = 1;
    this.muzzleLight.intensity = feel.flashIntensity;
  }

  triggerHit(kill = false) {
    this.hitPulse = Math.max(this.hitPulse, kill ? 2.3 : 1.25);
  }

  spawnImpact(position, surface = 'concrete', scale = 1) {
    const flash = this.impactFlashes[this.impactIndex++ % this.impactFlashes.length];
    flash.mesh.visible = true;
    flash.mesh.position.copy(position);
    flash.mesh.material.color.setHex(IMPACT_COLORS[surface] || IMPACT_COLORS.concrete);
    flash.mesh.material.opacity = 0.95;
    flash.mesh.scale.setScalar(scale);
    flash.maxLife = flash.life = this.config.impact.flashLifetime;
  }

  showDamageDirection(relativeAngle, damageRatio) {
    const indicator = this.damageIndicators[this.damageIndex++ % this.damageIndicators.length];
    indicator.angle = relativeAngle;
    indicator.life = indicator.maxLife = this.config.damage.indicatorLifetime;
    indicator.element.classList.remove('hidden');
    indicator.element.style.setProperty('--damage-angle', `${relativeAngle}rad`);
    indicator.element.style.setProperty('--damage-strength', `${clamp(0.55 + damageRatio, 0.55, 1)}`);
    this.cameraPitch += this.config.damage.cameraKick * (0.7 + damageRatio * 0.6);
    this.cameraYaw += Math.sin(relativeAngle) * this.config.damage.cameraKick * 0.7;
    this.cameraRoll -= Math.sin(relativeAngle) * this.config.damage.cameraKick;
  }

  signalAccess(point, phase, zoneId = 0) {
    const lastAt = this.accessCooldowns.get(zoneId) ?? -Infinity;
    if (this.elapsed - lastAt < this.config.access.cueCooldown) return;
    this.accessCooldowns.set(zoneId, this.elapsed);
    const phaseMultiplier = phase === 'PEAK' ? this.config.access.peakMultiplier : phase === 'BUILDUP' ? 0.78 : 1;
    const count = Math.max(3, Math.round(this.config.access.dustPerCue * phaseMultiplier));
    for (let i = 0; i < count; i++) this.spawnDust(point, phaseMultiplier);

    const slot = this.accessLights[this.accessLightIndex++ % this.accessLights.length];
    slot.light.position.set(point[0], 1.7, point[1]);
    slot.light.visible = true;
    slot.intensity = this.config.access.baseIntensity * phaseMultiplier;
    slot.life = slot.maxLife = this.config.access.lightLifetime;
  }

  spawnDust(point, multiplier) {
    const index = this.dustIndex++ % this.dust.length;
    const dust = this.dust[index];
    dust.active = true;
    dust.life = dust.maxLife = (1.1 + Math.random() * 1.2) * multiplier;
    dust.vx = (Math.random() - 0.5) * 0.65;
    dust.vy = 0.22 + Math.random() * 0.38;
    dust.vz = (Math.random() - 0.5) * 0.65;
    this.dustPositions[index * 3] = point[0] + (Math.random() - 0.5) * 2.6;
    this.dustPositions[index * 3 + 1] = 0.08 + Math.random() * 0.35;
    this.dustPositions[index * 3 + 2] = point[1] + (Math.random() - 0.5) * 2.6;
  }

  hideDust(index) {
    this.dustPositions[index * 3] = 0;
    this.dustPositions[index * 3 + 1] = -100;
    this.dustPositions[index * 3 + 2] = 0;
  }

  update(dt, phase = 'PREPARE', intensity = 0) {
    this.elapsed += dt;
    const recovery = dampFactor(this.recovery, dt);
    this.cameraPitch += (0 - this.cameraPitch) * recovery;
    this.cameraYaw += (0 - this.cameraYaw) * recovery;
    this.cameraRoll += (0 - this.cameraRoll) * dampFactor(9, dt);
    this.weaponKick += (0 - this.weaponKick) * recovery;
    this.crosshairBloom += (0 - this.crosshairBloom) * dampFactor(13, dt);
    this.hitPulse += (0 - this.hitPulse) * dampFactor(18, dt);

    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      const strength = clamp(this.muzzleTimer / this.muzzleDuration, 0, 1);
      this.muzzleMesh.material.opacity = strength;
      this.muzzleLight.intensity *= Math.exp(-28 * dt);
      if (this.muzzleTimer <= 0) {
        this.muzzleMesh.visible = false;
        this.muzzleLight.intensity = 0;
      }
    }

    for (const flash of this.impactFlashes) {
      if (flash.life <= 0) continue;
      flash.life -= dt;
      const strength = clamp(flash.life / flash.maxLife, 0, 1);
      flash.mesh.material.opacity = strength;
      flash.mesh.scale.multiplyScalar(1 + dt * 4);
      if (flash.life <= 0) flash.mesh.visible = false;
    }

    for (const indicator of this.damageIndicators) {
      if (indicator.life <= 0) continue;
      indicator.life -= dt;
      const strength = clamp(indicator.life / indicator.maxLife, 0, 1);
      indicator.element.style.opacity = `${Math.sin(strength * Math.PI * 0.5)}`;
      if (indicator.life <= 0) indicator.element.classList.add('hidden');
    }

    for (let i = 0; i < this.dust.length; i++) {
      const dust = this.dust[i];
      if (!dust.active) continue;
      dust.life -= dt;
      if (dust.life <= 0) {
        dust.active = false;
        this.hideDust(i);
        continue;
      }
      const offset = i * 3;
      this.dustPositions[offset] += dust.vx * dt;
      this.dustPositions[offset + 1] += dust.vy * dt;
      this.dustPositions[offset + 2] += dust.vz * dt;
      dust.vx *= Math.exp(-1.8 * dt);
      dust.vz *= Math.exp(-1.8 * dt);
    }
    this.dustGeometry.attributes.position.needsUpdate = true;
    this.dustMaterial.opacity = 0.2 + intensity * 0.16;

    for (const slot of this.accessLights) {
      if (slot.life <= 0) continue;
      slot.life -= dt;
      const strength = clamp(slot.life / slot.maxLife, 0, 1);
      const flicker = 0.88 + Math.sin(this.elapsed * 31 + slot.maxLife) * 0.12;
      slot.light.intensity = slot.intensity * strength * flicker;
      if (slot.life <= 0) { slot.light.visible = false; slot.light.intensity = 0; }
    }

    if (this.scene.fog?.isFogExp2) {
      const target = this.config.fog[phase] ?? this.baseFogDensity;
      this.scene.fog.density += (target - this.scene.fog.density) * dampFactor(this.config.fog.smoothing, dt);
    }
  }

  reset() {
    this.muzzleTimer = 0;
    this.muzzleMesh.visible = false;
    this.muzzleLight.intensity = 0;
    this.cameraPitch = this.cameraYaw = this.cameraRoll = this.weaponKick = this.crosshairBloom = this.hitPulse = 0;
    for (const flash of this.impactFlashes) { flash.life = 0; flash.mesh.visible = false; }
    for (const indicator of this.damageIndicators) { indicator.life = 0; indicator.element.classList.add('hidden'); }
    for (let i = 0; i < this.dust.length; i++) { this.dust[i].active = false; this.hideDust(i); }
    for (const slot of this.accessLights) { slot.life = 0; slot.light.visible = false; slot.light.intensity = 0; }
    this.accessCooldowns.clear();
    if (this.scene.fog?.isFogExp2) this.scene.fog.density = this.baseFogDensity;
  }

  dispose() {
    this.reset();
    for (const flash of this.impactFlashes) {
      this.scene.remove(flash.mesh);
      flash.mesh.material.dispose();
    }
    this.impactFlashes[0]?.mesh.geometry.dispose();
    for (const indicator of this.damageIndicators) indicator.element.remove();
    for (const slot of this.accessLights) this.scene.remove(slot.light);
    this.scene.remove(this.dustPoints);
    this.dustGeometry.dispose();
    this.dustMaterial.dispose();
  }
}
