import * as THREE from 'three';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

function makeCanvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export class EnvironmentManager {
  constructor({ scene, camera, renderer, config, quality }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.config = config;
    this.qualityName = config.quality[quality] ? quality : config.defaultQuality;
    this.quality = config.quality[this.qualityName];
    this.root = new THREE.Group();
    this.root.name = 'environment-detail';
    this.scene.add(this.root);
    this.localLights = [];
    this.stations = new Map();
    this.objectiveVisuals = new Map();
    this.resources = { geometries: new Set(), materials: new Set(), textures: new Set() };
    this.elapsed = 0;
    this.updateAccumulator = 0;
    this.configureRenderer();
    this.createBackdrop();
    this.createGlobalLighting();
    this.createLocalLighting();
    this.createLandmarks();
    this.createProps();
  }

  configureRenderer() {
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.config.renderer.exposure;
    this.renderer.shadowMap.enabled = this.quality.shadowMapSize > 0;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.maxPixelRatio, this.config.renderer.maxPixelRatio));
  }

  createBackdrop() {
    const palette = this.config.palette;
    const top = new THREE.Color(palette.skyTop);
    const horizon = new THREE.Color(palette.skyHorizon);
    this.skyTexture = makeCanvasTexture(16, 256, (context, width, height) => {
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, `#${top.getHexString()}`);
      gradient.addColorStop(0.62, `#${horizon.getHexString()}`);
      gradient.addColorStop(1, `#${new THREE.Color(palette.fog).getHexString()}`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    });
    this.resources.textures.add(this.skyTexture);
    this.scene.background = this.skyTexture;
    this.scene.fog = new THREE.FogExp2(palette.fog, this.config.fog.baseDensity);
  }

  createGlobalLighting() {
    const palette = this.config.palette;
    const lighting = this.config.globalLights;
    this.hemisphere = new THREE.HemisphereLight(palette.ambientSky, palette.ambientGround, lighting.hemisphereIntensity);
    this.root.add(this.hemisphere);

    this.moon = new THREE.DirectionalLight(palette.moon, lighting.moonIntensity);
    this.moon.position.fromArray(lighting.moonPosition);
    this.moon.target.position.fromArray(lighting.moonTarget);
    this.moon.castShadow = this.quality.shadowMapSize > 0;
    this.moon.shadow.mapSize.set(this.quality.shadowMapSize || 1, this.quality.shadowMapSize || 1);
    this.moon.shadow.camera.left = -31;
    this.moon.shadow.camera.right = 31;
    this.moon.shadow.camera.top = 31;
    this.moon.shadow.camera.bottom = -31;
    this.moon.shadow.camera.near = 3;
    this.moon.shadow.camera.far = 72;
    this.moon.shadow.bias = -0.00045;
    this.moon.shadow.normalBias = 0.035;
    this.root.add(this.moon, this.moon.target);
  }

  createLocalLighting() {
    const sphereGeometry = new THREE.SphereGeometry(0.13, 8, 6);
    const bracketGeometry = new THREE.BoxGeometry(0.42, 0.12, 0.24);
    const poleGeometry = new THREE.CylinderGeometry(0.055, 0.075, 3.7, 8);
    const metalMaterial = new THREE.MeshStandardMaterial({ color: this.config.palette.metal, roughness: 0.62, metalness: 0.72 });
    const bulbMaterials = {
      warm: new THREE.MeshBasicMaterial({ color: this.config.palette.warm, toneMapped: false }),
      emergency: new THREE.MeshBasicMaterial({ color: this.config.palette.emergency, toneMapped: false }),
      industrial: new THREE.MeshBasicMaterial({ color: this.config.palette.industrial, toneMapped: false })
    };
    this.track(sphereGeometry, bracketGeometry, poleGeometry, metalMaterial, ...Object.values(bulbMaterials));

    const maxLights = Math.min(this.quality.localLights, this.config.localLights.length);
    for (let index = 0; index < maxLights; index++) {
      const definition = this.config.localLights[index];
      const category = definition.color === this.config.palette.emergency || definition.color === 0xb14c3d
        ? 'emergency'
        : definition.color === this.config.palette.warm ? 'warm' : 'industrial';
      const light = new THREE.PointLight(definition.color, definition.intensity, definition.distance, definition.decay);
      light.position.fromArray(definition.position);
      light.castShadow = false;
      this.root.add(light);

      const bulb = new THREE.Mesh(sphereGeometry, bulbMaterials[category]);
      bulb.position.copy(light.position);
      bulb.scale.set(category === 'emergency' ? 1.25 : 1.6, 0.68, 1.25);
      this.root.add(bulb);

      const bracket = new THREE.Mesh(bracketGeometry, metalMaterial);
      bracket.position.copy(light.position).add(new THREE.Vector3(0, 0.13, 0.12));
      bracket.castShadow = this.quality.shadowMapSize > 0;
      this.root.add(bracket);

      if (definition.id === 'streetlamp') {
        const pole = new THREE.Mesh(poleGeometry, metalMaterial);
        pole.position.set(definition.position[0], 1.85, definition.position[2]);
        pole.castShadow = this.quality.shadowMapSize > 0;
        this.root.add(pole);
      }

      this.localLights.push({
        id: definition.id,
        light,
        bulb,
        baseIntensity: definition.intensity,
        pattern: this.config.flickerPatterns[definition.flicker] || this.config.flickerPatterns.stable,
        offset: index * 1.37,
        stepDuration: definition.flicker === 'faulty' ? 0.085 : 0.42,
        objectiveOff: false,
        restoreAt: -Infinity
      });
    }
  }

  createLandmarks() {
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x2b3237, roughness: 0.7, metalness: 0.62 });
    const beamGeometry = new THREE.BoxGeometry(5.4, 0.16, 0.22);
    const gateGeometry = new THREE.BoxGeometry(0.14, 3.5, 0.18);
    this.track(metalMaterial, beamGeometry, gateGeometry);

    const ceilingBeams = new THREE.InstancedMesh(beamGeometry, metalMaterial, 7);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 7; i++) {
      dummy.position.set(0, 4.86, -22 + i * 7.2);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(11, 1, 1);
      dummy.updateMatrix();
      ceilingBeams.setMatrixAt(i, dummy.matrix);
    }
    ceilingBeams.castShadow = this.quality.shadowMapSize > 0;
    ceilingBeams.receiveShadow = true;
    this.root.add(ceilingBeams);

    const brokenGate = new THREE.InstancedMesh(gateGeometry, metalMaterial, 7);
    const gateX = [-3.2, -2.1, -1.05, 0, 1.05, 2.1, 3.2];
    for (let i = 0; i < gateX.length; i++) {
      dummy.position.set(gateX[i], 1.7, -29.28);
      dummy.rotation.set(0, 0, (i - 3) * 0.025 + (i === 2 ? 0.16 : 0));
      dummy.scale.set(1, i === 2 ? 0.68 : 1, 1);
      dummy.updateMatrix();
      brokenGate.setMatrixAt(i, dummy.matrix);
    }
    brokenGate.castShadow = this.quality.shadowMapSize > 0;
    this.root.add(brokenGate);

    this.warehouseSignTexture = makeCanvasTexture(512, 128, (context, width, height) => {
      context.fillStyle = '#182027';
      context.fillRect(0, 0, width, height);
      context.strokeStyle = '#65727a';
      context.lineWidth = 8;
      context.strokeRect(7, 7, width - 14, height - 14);
      context.fillStyle = '#c0c7c8';
      context.font = '700 54px sans-serif';
      context.textAlign = 'center';
      context.fillText('ALMACÉN 7', width / 2, 69);
      context.fillStyle = '#9d463b';
      context.font = '700 23px sans-serif';
      context.fillText('CUARENTENA · ACCESO RESTRINGIDO', width / 2, 105);
    });
    this.resources.textures.add(this.warehouseSignTexture);
    const signMaterial = new THREE.MeshBasicMaterial({ map: this.warehouseSignTexture, toneMapped: true });
    const signGeometry = new THREE.PlaneGeometry(5.8, 1.45);
    this.track(signMaterial, signGeometry);
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(-7.5, 3.35, -29.34);
    this.root.add(sign);
  }

  createProps() {
    const random = seededRandom(0xB07EC3E0);
    const density = this.quality.propDensity;
    const barrelCount = Math.max(4, Math.round(this.config.props.barrels * density));
    const palletCount = Math.max(3, Math.round(this.config.props.pallets * density));
    const debrisCount = Math.max(7, Math.round(this.config.props.debris * density));
    const stainCount = Math.max(5, Math.round(this.config.props.stains * density));
    const dummy = new THREE.Object3D();

    const barrelGeometry = new THREE.CylinderGeometry(0.38, 0.4, 1.05, 12);
    const palletGeometry = new THREE.BoxGeometry(1.55, 0.12, 0.92);
    const debrisGeometry = new THREE.BoxGeometry(0.24, 0.1, 0.48);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x34434a, roughness: 0.56, metalness: 0.68 });
    const palletMaterial = new THREE.MeshStandardMaterial({ color: this.config.palette.wood, roughness: 0.88, metalness: 0.02 });
    const debrisMaterial = new THREE.MeshStandardMaterial({ color: 0x464b4d, roughness: 0.8, metalness: 0.28 });
    this.track(barrelGeometry, palletGeometry, debrisGeometry, barrelMaterial, palletMaterial, debrisMaterial);

    const barrelPositions = [[-22, 0.53, 8], [-21.2, 0.53, 8.2], [-19.8, 0.53, 6], [22.8, 0.53, 5], [23.6, 0.53, 5.5], [10, 0.53, -24], [11, 0.53, -24.4], [-10, 0.53, 25], [-23, 0.53, -15], [24, 0.53, -13], [15, 0.53, 24], [-16, 0.53, -24]];
    const barrels = new THREE.InstancedMesh(barrelGeometry, barrelMaterial, barrelCount);
    for (let i = 0; i < barrelCount; i++) {
      const position = barrelPositions[i % barrelPositions.length];
      dummy.position.set(...position);
      dummy.rotation.set(0, random() * Math.PI, (i % 7 === 5 ? 1.45 : 0));
      dummy.scale.setScalar(0.9 + random() * 0.16);
      dummy.updateMatrix();
      barrels.setMatrixAt(i, dummy.matrix);
    }
    barrels.castShadow = this.quality.shadowMapSize > 0;
    barrels.receiveShadow = true;
    this.root.add(barrels);

    const palletPositions = [[-20.5, 0.12, 5.7, 0.2], [-24, 0.12, 11, 1.4], [20.5, 0.12, 2.2, -0.3], [21.8, 0.12, -8, 1.2], [-7, 0.12, -24.7, 0], [7, 0.12, 25, 0.2], [-25, 0.12, -5, 1.55], [24.8, 0.12, 17, 1.5]];
    const pallets = new THREE.InstancedMesh(palletGeometry, palletMaterial, palletCount);
    for (let i = 0; i < palletCount; i++) {
      const [x, y, z, rotation] = palletPositions[i % palletPositions.length];
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rotation, 0);
      dummy.scale.set(1, i % 4 === 0 ? 2 : 1, 1);
      dummy.updateMatrix();
      pallets.setMatrixAt(i, dummy.matrix);
    }
    pallets.castShadow = this.quality.shadowMapSize > 0;
    pallets.receiveShadow = true;
    this.root.add(pallets);

    const debris = new THREE.InstancedMesh(debrisGeometry, debrisMaterial, debrisCount);
    for (let i = 0; i < debrisCount; i++) {
      const side = i % 4;
      const edge = 17 + random() * 9;
      const along = -24 + random() * 48;
      dummy.position.set(side < 2 ? (side === 0 ? edge : -edge) : along, 0.07, side < 2 ? along : (side === 2 ? edge : -edge));
      dummy.rotation.set(random() * 0.18, random() * Math.PI, random() * 0.18);
      dummy.scale.set(0.65 + random() * 1.5, 0.7 + random() * 0.6, 0.65 + random() * 1.4);
      dummy.updateMatrix();
      debris.setMatrixAt(i, dummy.matrix);
    }
    debris.castShadow = false;
    debris.receiveShadow = true;
    this.root.add(debris);

    this.stainTexture = makeCanvasTexture(128, 128, (context, width, height) => {
      const gradient = context.createRadialGradient(width / 2, height / 2, 5, width / 2, height / 2, width / 2);
      gradient.addColorStop(0, 'rgba(20,28,27,0.72)');
      gradient.addColorStop(0.58, 'rgba(19,25,24,0.42)');
      gradient.addColorStop(1, 'rgba(19,25,24,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    });
    this.resources.textures.add(this.stainTexture);
    const stainGeometry = new THREE.PlaneGeometry(2.8, 2.8);
    stainGeometry.rotateX(-Math.PI / 2);
    const stainMaterial = new THREE.MeshBasicMaterial({ map: this.stainTexture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, opacity: 0.62 });
    this.track(stainGeometry, stainMaterial);
    const stains = new THREE.InstancedMesh(stainGeometry, stainMaterial, stainCount);
    for (let i = 0; i < stainCount; i++) {
      dummy.position.set(-23 + random() * 46, 0.012, -23 + random() * 46);
      dummy.rotation.set(0, random() * Math.PI, 0);
      dummy.scale.set(0.65 + random() * 1.5, 1, 0.45 + random());
      dummy.updateMatrix();
      stains.setMatrixAt(i, dummy.matrix);
    }
    stains.renderOrder = 1;
    this.root.add(stains);
  }

  createInteractiveStation({ id, position, color, label }) {
    if (!this.stationBodyGeometry) {
      this.stationBodyGeometry = new THREE.BoxGeometry(0.9, 1.25, 0.55);
      this.stationScreenGeometry = new THREE.PlaneGeometry(0.62, 0.34);
      this.stationBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x252d32, roughness: 0.64, metalness: 0.62 });
      this.track(this.stationBodyGeometry, this.stationScreenGeometry, this.stationBodyMaterial);
    }
    const group = new THREE.Group();
    group.name = `station-${id}`;
    group.position.set(position[0], position[1], position[2]);
    const body = new THREE.Mesh(this.stationBodyGeometry, this.stationBodyMaterial);
    body.position.y = 0.625;
    body.castShadow = this.quality.shadowMapSize > 0;
    body.receiveShadow = true;
    const screenMaterial = new THREE.MeshStandardMaterial({ color: 0x1c2427, emissive: color, emissiveIntensity: 1.1, roughness: 0.42, metalness: 0.3 });
    this.track(screenMaterial);
    const screen = new THREE.Mesh(this.stationScreenGeometry, screenMaterial);
    screen.position.set(0, 0.78, 0.281);
    group.add(body, screen);

    const labelTexture = makeCanvasTexture(256, 64, (context, width, height) => {
      context.fillStyle = '#11181c'; context.fillRect(0, 0, width, height);
      context.strokeStyle = `#${new THREE.Color(color).getHexString()}`; context.lineWidth = 4; context.strokeRect(3, 3, width - 6, height - 6);
      context.fillStyle = '#e6eceb'; context.font = '700 27px sans-serif'; context.textAlign = 'center'; context.fillText(label, width / 2, 42);
    });
    this.resources.textures.add(labelTexture);
    const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture, toneMapped: true });
    const labelGeometry = new THREE.PlaneGeometry(0.82, 0.205);
    this.track(labelMaterial, labelGeometry);
    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    labelMesh.position.set(0, 1.12, 0.284);
    group.add(labelMesh);
    this.root.add(group);
    this.stations.set(id, { group, screenMaterial, pulse: 0, success: true, powered: true });
    return group;
  }

  createObjectiveGenerator({ id, position, label = 'GENERADOR' }) {
    const group = this.createInteractiveStation({ id, position, color: 0xffc44f, label });
    group.visible = false;
    this.objectiveVisuals.set(id, { type: 'generator', group, open: 0, targetOpen: 0 });
    return group;
  }

  createSupplyCache({ id, position }) {
    const group = new THREE.Group();
    group.name = id;
    group.position.fromArray(position);
    const baseGeometry = new THREE.BoxGeometry(1.15, 0.52, 0.72);
    const lidGeometry = new THREE.BoxGeometry(1.2, 0.16, 0.76);
    const material = new THREE.MeshStandardMaterial({ color: 0x48565b, emissive: 0x1b747d, emissiveIntensity: 0.42, roughness: 0.52, metalness: 0.68 });
    const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xffd166, toneMapped: false });
    this.track(baseGeometry, lidGeometry, material, stripeMaterial);
    const base = new THREE.Mesh(baseGeometry, material);
    base.position.y = 0.28;
    base.castShadow = this.quality.shadowMapSize > 0;
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.6, -0.34);
    const lid = new THREE.Mesh(lidGeometry, material);
    lid.position.z = 0.34;
    hinge.add(lid);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.12), stripeMaterial);
    stripe.position.set(0, 0.01, 0.385);
    stripe.rotation.x = -Math.PI / 2;
    lid.add(stripe);
    this.track(stripe.geometry);
    group.add(base, hinge);
    group.visible = false;
    this.root.add(group);
    this.objectiveVisuals.set(id, { type: 'cache', group, hinge, open: 0, targetOpen: 0, material });
    return group;
  }

  createDefenseArea() {
    const group = new THREE.Group();
    group.name = 'objective-defense-area';
    const ringGeometry = new THREE.RingGeometry(0.93, 1, 64);
    ringGeometry.rotateX(-Math.PI / 2);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
    const beaconGeometry = new THREE.BoxGeometry(0.13, 0.22, 0.13);
    const beaconMaterial = new THREE.MeshStandardMaterial({ color: 0x5e5744, emissive: 0xffb23f, emissiveIntensity: 0.9, roughness: 0.48, metalness: 0.55 });
    this.track(ringGeometry, ringMaterial, beaconGeometry, beaconMaterial);
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = 0.025;
    group.add(ring);
    for (let index = 0; index < 4; index++) {
      const angle = index * Math.PI * 0.5 + Math.PI * 0.25;
      const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
      beacon.position.set(Math.sin(angle), 0.11, Math.cos(angle));
      group.add(beacon);
    }
    group.visible = false;
    this.root.add(group);
    this.objectiveVisuals.set('defense-area', { type: 'defense', group, ringMaterial, progress: 0 });
    return group;
  }

  setObjectiveVisible(id, visible) {
    const visual = this.objectiveVisuals.get(id);
    if (!visual) return;
    visual.group.visible = visible;
    if (!visible && visual.type === 'cache') {
      visual.open = 0;
      visual.targetOpen = 0;
      visual.hinge.rotation.x = 0;
    }
  }

  openSupplyCache(id) {
    const visual = this.objectiveVisuals.get(id);
    if (visual?.type === 'cache') visual.targetOpen = 1;
  }

  setDefenseArea(position, radius, visible, progress = 0) {
    const visual = this.objectiveVisuals.get('defense-area');
    if (!visual) return;
    visual.group.visible = visible;
    visual.group.position.set(position[0], position[1] || 0, position[2]);
    visual.group.scale.setScalar(radius);
    visual.progress = progress;
    visual.ringMaterial.opacity = 0.18 + progress * 0.2;
  }

  setStationPowered(id, powered) {
    const station = this.stations.get(id);
    if (station) station.powered = powered;
  }

  setZonePower(lightIds, powered) {
    const ids = new Set(lightIds || []);
    let restoreIndex = 0;
    for (const fixture of this.localLights) {
      if (!ids.has(fixture.id)) continue;
      fixture.objectiveOff = !powered;
      fixture.restoreAt = powered ? this.elapsed + restoreIndex++ * 0.22 : Infinity;
    }
  }

  createRouteBarrier({ position, size, color }) {
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
    const material = new THREE.MeshStandardMaterial({ color: 0x31383d, emissive: color, emissiveIntensity: 0.18, roughness: 0.58, metalness: 0.72 });
    this.track(geometry, material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'purchased-route-barrier';
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = this.quality.shadowMapSize > 0;
    mesh.receiveShadow = true;
    mesh.userData.closedY = position[1];
    this.root.add(mesh);
    return mesh;
  }

  pulseStation(id, success = true) {
    const station = this.stations.get(id);
    if (!station) return;
    station.pulse = 0.38;
    station.success = success;
  }

  configureWorldMesh(mesh, { castShadow = false, receiveShadow = true } = {}) {
    mesh.castShadow = this.quality.shadowMapSize > 0 && castShadow;
    mesh.receiveShadow = this.quality.shadowMapSize > 0 && receiveShadow;
  }

  update(dt, phase, intensity = 0) {
    this.elapsed += dt;
    this.updateAccumulator += dt;
    if (this.updateAccumulator < 0.05) return;
    const visualDt = this.updateAccumulator;
    this.updateAccumulator = 0;
    const phaseBoost = phase === 'PEAK' ? 1.06 : phase === 'BUILDUP' ? 1.02 : phase === 'COMPLETE' ? 0.94 : 1;
    for (const fixture of this.localLights) {
      const step = Math.floor((this.elapsed + fixture.offset) / fixture.stepDuration) % fixture.pattern.length;
      const patternValue = fixture.pattern[step];
      const pressurePulse = phase === 'PEAK' ? 1 + Math.sin(this.elapsed * 2.4 + fixture.offset) * 0.025 * intensity : 1;
      const restoring = !fixture.objectiveOff && this.elapsed < fixture.restoreAt + 0.34;
      const restorePulse = restoring ? (((this.elapsed * 18) | 0) % 2 ? 0.12 : 1.2) : 1;
      const powerScale = fixture.objectiveOff ? 0.025 : restorePulse;
      fixture.light.intensity = fixture.baseIntensity * patternValue * phaseBoost * pressurePulse * powerScale;
      fixture.bulb.visible = !fixture.objectiveOff || (((this.elapsed * 8) | 0) % 7 === 0);
    }
    for (const station of this.stations.values()) {
      station.pulse = Math.max(0, station.pulse - visualDt);
      const strength = station.pulse > 0 ? station.pulse / 0.38 : 0;
      const poweredIntensity = station.powered ? 1.1 : 0.055;
      station.screenMaterial.emissiveIntensity = poweredIntensity + strength * (station.success ? 2.2 : 0.65);
      station.group.scale.setScalar(1 + strength * 0.018);
    }
    for (const visual of this.objectiveVisuals.values()) {
      if (visual.type === 'cache' && visual.open !== visual.targetOpen) {
        visual.open += (visual.targetOpen - visual.open) * Math.min(1, visualDt * 7);
        visual.hinge.rotation.x = -visual.open * 1.12;
        visual.material.emissiveIntensity = 0.42 + visual.open * 1.25;
      }
      if (visual.type === 'defense' && visual.group.visible) {
        visual.ringMaterial.opacity = 0.17 + visual.progress * 0.2 + Math.sin(this.elapsed * 3.2) * 0.025;
      }
    }
  }

  reset() {
    this.elapsed = 0;
    this.updateAccumulator = 0;
    this.hemisphere.intensity = this.config.globalLights.hemisphereIntensity;
    for (const fixture of this.localLights) {
      fixture.objectiveOff = false;
      fixture.restoreAt = -Infinity;
      fixture.light.intensity = fixture.baseIntensity;
      fixture.bulb.visible = true;
    }
    for (const station of this.stations.values()) {
      station.pulse = 0;
      station.powered = true;
      station.screenMaterial.emissiveIntensity = 1.1;
      station.group.scale.setScalar(1);
    }
    for (const visual of this.objectiveVisuals.values()) {
      visual.group.visible = false;
      visual.open = 0;
      visual.targetOpen = 0;
      if (visual.hinge) visual.hinge.rotation.x = 0;
      if (visual.type === 'defense') visual.progress = 0;
    }
  }

  track(...resources) {
    for (const resource of resources) {
      if (resource?.isBufferGeometry) this.resources.geometries.add(resource);
      else if (resource?.isMaterial) this.resources.materials.add(resource);
      else if (resource?.isTexture) this.resources.textures.add(resource);
    }
  }

  dispose() {
    this.scene.remove(this.root);
    if (this.scene.background === this.skyTexture) this.scene.background = new THREE.Color(this.config.palette.fog);
    for (const texture of this.resources.textures) texture.dispose();
    for (const material of this.resources.materials) material.dispose();
    for (const geometry of this.resources.geometries) geometry.dispose();
    this.localLights.length = 0;
    this.stations.clear();
    this.objectiveVisuals.clear();
  }
}
