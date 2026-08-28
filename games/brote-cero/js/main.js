import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Game } from './core/Game.js';
import { GameState, GameStates } from './core/GameState.js';
import { AudioManager } from './systems/AudioManager.js';
import { EconomyEvents, EconomyManager } from './systems/EconomyManager.js';
import { EnvironmentManager } from './systems/EnvironmentManager.js';
import { EffectsManager } from './systems/EffectsManager.js';
import { createDomBindings, HUD } from './systems/HUD.js';
import { InputManager } from './systems/InputManager.js';
import { InteractionManager } from './systems/InteractionManager.js';
import { WorldManager } from './systems/WorldManager.js';
import { AIDebugRenderer } from './ai/AIDebugRenderer.js';
import { NoiseTypes } from './ai/NoiseSystem.js';
import { ZombieManager, ZombieStates } from './ai/ZombieManager.js';
import { SpawnDirector } from './directors/SpawnDirector.js';
import { DropDirector } from './directors/DropDirector.js';
import { ObjectiveDirector, ObjectiveEvents, ObjectiveStates, ObjectiveTypes } from './directors/ObjectiveDirector.js';
import { PerkManager } from './directors/PerkManager.js';
import { WaveDirector, WaveEvents, WavePhases } from './directors/WaveDirector.js';
import {
  ACID_COLORS,
  AI_CONFIG,
  ANIMATION_CONFIG,
  AUDIO_CONFIG,
  BLOOD_COLORS,
  CFG,
  DROP_CONFIG,
  ECONOMY_CONFIG,
  EXPLOSION_COLORS,
  EFFECTS_CONFIG,
  ENVIRONMENT_CONFIG,
  INTERACTION_CONFIG,
  OBJECTIVE_CONFIG,
  PERK_CONFIG,
  PICKUP_COLORS,
  PICKUP_SPOTS,
  SPAWN_POINTS,
  SPAWN_CONFIG,
  WAVE_CONFIG,
  WEAPONS,
  ZTYPES
} from './config.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dampFactor = (speed, dt) => 1 - Math.exp(-speed * dt);
const shortestAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const TAU = Math.PI * 2;

const IS_TOUCH = ('ontouchstart' in window) || !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const dom = createDomBindings();
const hud = new HUD(dom, { isTouch: IS_TOUCH });
hud.configureInputMode();

const economy = new EconomyManager(ECONOMY_CONFIG, event => {
  if (event.type === EconomyEvents.EARNED) hud.refreshCredits(event.credits, event.amount, false);
  else if (event.type === EconomyEvents.SPENT) hud.refreshCredits(event.credits, event.amount, true);
  else if (event.type === EconomyEvents.INSUFFICIENT) hud.refreshCredits(event.credits);
});
const dropDirector = new DropDirector(DROP_CONFIG);
const perkManager = new PerkManager({ config: PERK_CONFIG, seed: 1 });
let objectiveDirector = null;

const gameState = new GameState(GameStates.MENU);
let hp = CFG.hpMax, stamina = CFG.stamMax, exhausted = false;
let velX = 0, velZ = 0, bobPhase = 0, bobAmt = 0, stepAcc = 0;
let playerY = 0, verticalVel = 0, grounded = true;
let isSprinting = false, moveIntensity = 0;
const playerPos = new THREE.Vector3(0, 0, 23);

// Inventario de armas desbloqueadas
let unlockedWeapons = { pistol: true };
let weapons = {};
let weaponStats = {};
let currentWeapon = 'pistol';

function rebuildWeaponStats(weaponId) {
  const base = WEAPONS[weaponId];
  if (!base) return null;
  const stats = { ...base };
  const definition = ECONOMY_CONFIG.weaponUpgrades[weaponId];
  const level = economy.getWeaponLevel(weaponId);
  for (let index = 0; definition && index < level - 1; index++) {
    const step = definition.steps[index];
    if (!step || !(step.stat in stats)) continue;
    if (Number.isFinite(step.multiply)) stats[step.stat] *= step.multiply;
    if (Number.isFinite(step.add)) stats[step.stat] += step.add;
  }
  stats.magSize *= perkManager.getModifier('weapon.magSize');
  stats.spread = (stats.spread || 0) * perkManager.getModifier('weapon.spread');
  stats.kick *= perkManager.getModifier('weapon.recoil');
  stats.dmg *= perkManager.getModifier('weapon.damage');
  stats.dmg = Math.round(stats.dmg);
  stats.magSize = Math.round(stats.magSize);
  weaponStats[weaponId] = stats;
  return stats;
}

function rebuildAllWeaponStats() {
  weaponStats = {};
  for (const weaponId of Object.keys(WEAPONS)) rebuildWeaponStats(weaponId);
}

rebuildAllWeaponStats();

let reloading = false, reloadT = 0, fireCd = 0;
let wave = 0, kills = 0, aliveCount = 0;
let recentDamagePressure = 0, waveMessageTimer = 0, lastPrepareSec = -1;
let ambientUpdateTimer = 0;
let perkBuffHudTimer = 0;
let perkChoiceTimer = 0;
let perkChoiceLocked = false;
let perkRunSequence = 0;
let visualQuality = 1;
let shakeAmp = 0, deathT = 0, deathRoll = 0, tNow = 0;
let lookImpulseX = 0, lookImpulseY = 0;
let bestWave = 0;
try { bestWave = parseInt(localStorage.getItem('bc_best_wave')) || 0; } catch (e) {}

const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const targetLookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const displayEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const audioForward = new THREE.Vector3(0, 0, -1);
const audioUp = new THREE.Vector3(0, 1, 0);
const spawnCameraForward = new THREE.Vector3(0, 0, -1);
const objectiveMarkerPosition = new THREE.Vector3();
const objectiveMarkerNdc = new THREE.Vector3();
const objectiveMarkerDirection = new THREE.Vector3();
const objectiveMarkerForward = new THREE.Vector3();

const AU = new AudioManager(AUDIO_CONFIG);

function sfxShoot(wId) {
  if (wId === 'pistol') {
    AU.burst({ category: 'weapons', f: 2400, fEnd: 150, q: 1.2, vol: 0.65, dur: 0.18 });
    AU.tone({ category: 'weapons', wave: 'triangle', f: 180, fEnd: 50, vol: 0.55, dur: 0.12 });
  } else if (wId === 'shotgun') {
    AU.burst({ category: 'weapons', f: 1200, fEnd: 80, q: 0.8, vol: 0.95, dur: 0.32 });
    AU.tone({ category: 'weapons', wave: 'sawtooth', f: 110, fEnd: 30, vol: 0.85, dur: 0.25 });
    setTimeout(() => AU.burst({ category: 'weapons', f: 3200, fEnd: 1200, q: 3.5, vol: 0.3, dur: 0.08 }), 350);
  } else if (wId === 'smg') {
    AU.burst({ category: 'weapons', f: 3200, fEnd: 300, q: 1.5, vol: 0.45, dur: 0.09 });
    AU.tone({ category: 'weapons', wave: 'square', f: 240, fEnd: 90, vol: 0.35, dur: 0.07 });
  } else if (wId === 'rifle') {
    AU.burst({ category: 'weapons', f: 2600, fEnd: 200, q: 1.4, vol: 0.60, dur: 0.14 });
    AU.tone({ category: 'weapons', wave: 'sawtooth', f: 190, fEnd: 60, vol: 0.50, dur: 0.11 });
  } else if (wId === 'sniper') {
    AU.burst({ category: 'weapons', f: 4500, fEnd: 100, q: 0.9, vol: 1.0, dur: 0.45 });
    AU.tone({ category: 'weapons', wave: 'triangle', f: 320, fEnd: 40, vol: 0.9, dur: 0.35 });
    setTimeout(() => AU.burst({ category: 'weapons', f: 2800, fEnd: 1800, q: 4.0, vol: 0.35, dur: 0.1 }), 450);
  } else if (wId === 'rpg') {
    AU.burst({ category: 'weapons', f: 800, fEnd: 50, q: 0.6, vol: 1.0, dur: 0.6 });
    AU.tone({ category: 'weapons', wave: 'sawtooth', f: 150, fEnd: 25, vol: 0.95, dur: 0.5 });
  }
}

function sfxExplosion(position, vol = 1.0) {
  AU.burst({ category: 'effects', f: 600, fEnd: 40, q: 0.5, vol: vol * 0.95, dur: 0.8, position });
  AU.tone({ category: 'effects', wave: 'sawtooth', f: 90, fEnd: 20, vol: vol * 0.85, dur: 0.7, position });
}

function sfxReload() {
  AU.burst({ f: 3500, fEnd: 1800, q: 3.0, vol: 0.35, dur: 0.12 });
  setTimeout(() => AU.burst({ f: 2200, fEnd: 900, q: 2.5, vol: 0.4, dur: 0.14 }), 250);
}
function sfxSwitch() { AU.burst({ f: 3000, fEnd: 1500, q: 3.5, vol: 0.3, dur: 0.07 }); }
function sfxStep(vol = 0.25) { AU.burst({ f: 450, fEnd: 80, q: 1.8, vol, dur: 0.08 }); }
function sfxFlesh(pan = 0, vol = 0.35) { AU.burst({ f: 1200, fEnd: 300, q: 2.2, vol, dur: 0.12, pan }); }
function sfxHurt() { AU.tone({ wave: 'sawtooth', f: 140, fEnd: 45, vol: 0.6, dur: 0.22 }); }
function sfxKillConfirm() { AU.tone({ category: 'ui', wave: 'sine', f: 880, fEnd: 1200, vol: 0.25, dur: 0.08 }); }
function sfxPickup() { AU.tone({ category: 'ui', wave: 'triangle', f: 520, fEnd: 1040, vol: 0.45, dur: 0.18 }); }
function sfxPurchase(success = true, upgraded = false) {
  if (!success) {
    AU.tone({ category: 'ui', wave: 'square', f: 170, fEnd: 105, vol: 0.28, dur: 0.12 });
    return;
  }
  AU.tone({ category: 'ui', wave: 'triangle', f: upgraded ? 620 : 480, fEnd: upgraded ? 1120 : 760, vol: 0.34, dur: 0.16 });
  if (upgraded) AU.tone({ category: 'ui', wave: 'sine', f: 920, fEnd: 1320, vol: 0.22, dur: 0.22 });
}

function sfxPerkChoice() {
  AU.tone({ category: 'ui', wave: 'triangle', f: 520, fEnd: 920, vol: 0.32, dur: 0.18 });
  AU.tone({ category: 'ui', wave: 'sine', f: 880, fEnd: 1320, vol: 0.22, dur: 0.24, at: 0.12 });
}
function sfxHorn() {
  AU.tone({ wave: 'sawtooth', f: 130, fEnd: 110, vol: 0.5, dur: 0.8 });
  AU.tone({ wave: 'sawtooth', f: 195, fEnd: 165, vol: 0.4, dur: 0.8 });
}
function sfxChime() {
  AU.tone({ wave: 'sine', f: 587, fEnd: 880, vol: 0.4, dur: 0.4 });
  setTimeout(() => AU.tone({ wave: 'sine', f: 880, fEnd: 1174, vol: 0.45, dur: 0.5 }), 200);
}

function spatialFor(x, z, maxDist = 30) {
  const dx = x - playerPos.x, dz = z - playerPos.z;
  const d = Math.hypot(dx, dz);
  if (d > maxDist || d < 0.001) return null;
  const vol = Math.max(0, 1 - d / maxDist);
  const forwardX = -Math.sin(lookEuler.y), forwardZ = -Math.cos(lookEuler.y);
  const rightX = Math.cos(lookEuler.y), rightZ = -Math.sin(lookEuler.y);
  const ndx = dx / d, ndz = dz / d;
  const pan = clamp(ndx * rightX + ndz * rightZ, -1, 1);
  return { vol, pan, dist: d };
}

// ============================================================================
// ESCENA 3D (THREE.JS)
// ============================================================================
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(CFG.fovBase, innerWidth / innerHeight, 0.08, 120);
camera.position.set(0, CFG.eyeH, 23);
camera.rotation.order = 'YXZ';
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
dom.sceneContainer.appendChild(renderer.domElement);

const requestedQuality = (new URLSearchParams(location.search).get('quality') || ENVIRONMENT_CONFIG.defaultQuality).toUpperCase();
const environment = new EnvironmentManager({ scene, camera, renderer, config: ENVIRONMENT_CONFIG, quality: requestedQuality });

// Linterna del jugador
const flash = new THREE.SpotLight(0xffecd1, 185, 34, 0.58, 0.55, 1.9);
flash.position.set(0.15, -0.1, 0.1);
camera.add(flash);
camera.add(flash.target);
flash.target.position.set(0, -0.12, -6);

const mzLight = new THREE.PointLight(0xffc37a, 0, 12, 1.8);
mzLight.position.set(0.25, -0.2, -0.9);
camera.add(mzLight);

const controls = new PointerLockControls(camera, document.body);
const world = new WorldManager({ scene, camera, renderer, controls });

// Texturas procedurales
function makeTex(size, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return t;
}

const floorTex = makeTex(256, (g, s) => {
  g.fillStyle = '#14171a'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 900; i++) {
    const v = 16 + Math.random() * 24 | 0;
    g.fillStyle = `rgb(${v},${v+2},${v+3})`;
    g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
  g.strokeStyle = '#090b0e'; g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(i * s / 4, 0); g.lineTo(i * s / 4, s); g.stroke();
    g.beginPath(); g.moveTo(0, i * s / 4); g.lineTo(s, i * s / 4); g.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * s, y = Math.random() * s, radius = 5 + Math.random() * 19;
    const stain = g.createRadialGradient(x, y, 0, x, y, radius);
    stain.addColorStop(0, 'rgba(7,12,12,0.42)');
    stain.addColorStop(1, 'rgba(7,12,12,0)');
    g.fillStyle = stain; g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}, 14, 14);

const wallTex = makeTex(256, (g, s) => {
  g.fillStyle = '#22272c'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 400; i++) {
    const v = 28 + Math.random() * 20 | 0;
    g.fillStyle = `rgb(${v},${v+3},${v+4})`;
    g.fillRect(Math.random() * s, Math.random() * s, 3, 2);
  }
  g.strokeStyle = 'rgba(12,18,20,0.34)';
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * s;
    g.lineWidth = 1 + Math.random() * 4;
    g.beginPath(); g.moveTo(x, Math.random() * s * 0.25); g.lineTo(x + rand(-5, 5), s); g.stroke();
  }
}, 8, 3);

const crateTex = makeTex(128, (g, s) => {
  g.fillStyle = '#6e502c'; g.fillRect(0, 0, s, s);
  g.strokeStyle = '#3d2b14'; g.lineWidth = 6;
  g.strokeRect(3, 3, s - 6, s - 6);
  g.beginPath(); g.moveTo(3, 3); g.lineTo(s - 3, s - 3); g.stroke();
});

const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, color: 0x73787a, roughness: 0.94, metalness: 0.03 });
const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0x82888b, roughness: 0.88, metalness: 0.04 });
const ceilMat = new THREE.MeshStandardMaterial({ color: 0x252c31, roughness: 0.76, metalness: 0.34 });
const crateMat = new THREE.MeshStandardMaterial({ map: crateTex, color: 0xa88a61, roughness: 0.84, metalness: 0.01 });
const pillarMat = new THREE.MeshStandardMaterial({ color: 0x465057, roughness: 0.65, metalness: 0.5 });

const OBSTACLES = [];
const shootables = [];
const boxGeometryCache = new Map();

function sharedBoxGeometry(sx, sy, sz) {
  const key = `${sx}:${sy}:${sz}`;
  let geometry = boxGeometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(sx, sy, sz);
    boxGeometryCache.set(key, geometry);
  }
  return geometry;
}

function addAABB(minX, maxX, minZ, maxZ) {
  const obstacle = { minX, maxX, minZ, maxZ, cx: (minX + maxX) * 0.5, cz: (minZ + maxZ) * 0.5, active: true };
  OBSTACLES.push(obstacle);
  return obstacle;
}

function addBoxObstacle(x, y, z, sx, sy, sz, mat) {
  const m = new THREE.Mesh(sharedBoxGeometry(sx, sy, sz), mat);
  m.position.set(x, y + sy * 0.5, z);
  m.userData.surface = mat === crateMat ? 'wood' : mat === pillarMat ? 'metal' : 'concrete';
  environment.configureWorldMesh(m, { castShadow: mat !== wallMat, receiveShadow: true });
  scene.add(m);
  m.userData.obstacle = addAABB(x - sx * 0.5, x + sx * 0.5, z - sz * 0.5, z + sz * 0.5);
  shootables.push(m);
  return m;
}

// Suelo y Techo
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.userData.surface = 'concrete';
environment.configureWorldMesh(floor, { receiveShadow: true });
scene.add(floor);
shootables.push(floor);

const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), ceilMat);
ceil.rotation.x = Math.PI / 2;
ceil.position.y = 5.2;
ceil.userData.surface = 'metal';
environment.configureWorldMesh(ceil, { castShadow: false, receiveShadow: true });
scene.add(ceil);
shootables.push(ceil);

// Paredes perimetrales
const W = 30, H = 5.2;
addBoxObstacle(0, 0, -W, 60, H, 1.2, wallMat);
addBoxObstacle(0, 0, W, 60, H, 1.2, wallMat);
addBoxObstacle(-W, 0, 0, 1.2, H, 60, wallMat);
addBoxObstacle(W, 0, 0, 1.2, H, 60, wallMat);

// Pilares
[[-12, -12], [12, -12], [-12, 12], [12, 12]].forEach(([px, pz]) => {
  addBoxObstacle(px, 0, pz, 2.0, H, 2.0, pillarMat);
});

// Cajas
[
  [-6, -4, 2.4, 1.6, 2.4], [6, -4, 2.4, 1.6, 2.4],
  [-18, 4, 3.2, 2.0, 2.0], [18, 4, 3.2, 2.0, 2.0],
  [-4, 14, 2.0, 1.4, 2.0], [4, 14, 2.0, 1.4, 2.0],
  [0, -18, 3.0, 2.0, 2.0]
].forEach(([cx, cz, sx, sy, sz]) => {
  addBoxObstacle(cx, 0, cz, sx, sy, sz, crateMat);
});

const routeDoor = environment.createRouteBarrier({
  position: INTERACTION_CONFIG.routeDoor.position,
  size: INTERACTION_CONFIG.routeDoor.size,
  color: INTERACTION_CONFIG.stations.door.color
});
routeDoor.userData.surface = 'metal';
const [doorX, , doorZ] = INTERACTION_CONFIG.routeDoor.position;
const [doorWidth, , doorDepth] = INTERACTION_CONFIG.routeDoor.size;
const routeDoorObstacle = addAABB(doorX - doorWidth * 0.5, doorX + doorWidth * 0.5, doorZ - doorDepth * 0.5, doorZ + doorDepth * 0.5);
shootables.push(routeDoor);
let routeDoorOpen = false;
let routeDoorOpenProgress = 0;

function circleBlocked(x, z, r) {
  if (Math.abs(x) > CFG.arenaHalf - r || Math.abs(z) > CFG.arenaHalf - r) return true;
  for (let i = 0; i < OBSTACLES.length; i++) {
    const o = OBSTACLES[i];
    if (!o.active) continue;
    const nx = Math.max(o.minX, Math.min(x, o.maxX));
    const nz = Math.max(o.minZ, Math.min(z, o.maxZ));
    const dx = x - nx, dz = z - nz;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}

function collideCircle(x, z, r) {
  let cx = clamp(x, -CFG.arenaHalf + r, CFG.arenaHalf - r);
  let cz = clamp(z, -CFG.arenaHalf + r, CFG.arenaHalf - r);
  for (let i = 0; i < OBSTACLES.length; i++) {
    const o = OBSTACLES[i];
    if (!o.active) continue;
    const nx = Math.max(o.minX, Math.min(cx, o.maxX));
    const nz = Math.max(o.minZ, Math.min(cz, o.maxZ));
    const dx = cx - nx, dz = cz - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      const pen = r - d;
      cx += (dx / d) * pen;
      cz += (dz / d) * pen;
    }
  }
  collisionResult.x = cx;
  collisionResult.z = cz;
  return collisionResult;
}

const collisionResult = { x: 0, z: 0 };

// ============================================================================
// SISTEMA DE ZOMBIS HUMANOIDES (3D INSTANCED MESHES)
// ============================================================================
const ZMAX = 64;
const RISE_DUR = 0.9;
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
const _dummy = new THREE.Object3D();
const _part = new THREE.Object3D();
const _rootM = new THREE.Matrix4();
const _partM = new THREE.Matrix4();

const zHeadGeo = new THREE.BoxGeometry(0.38, 0.42, 0.40);
const zTorsoGeo = new THREE.BoxGeometry(0.56, 0.75, 0.34);
const zArmGeo = new THREE.BoxGeometry(0.15, 0.65, 0.15);
const zLegGeo = new THREE.BoxGeometry(0.18, 0.75, 0.18);
const zEyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.10);
const shadowGeo = new THREE.CircleGeometry(0.52, 14);
shadowGeo.rotateX(-Math.PI / 2);

const zSkinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, emissive: 0x11170f, emissiveIntensity: 0.22 });
const zClothMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0, emissive: 0x0b0d0c, emissiveIntensity: 0.14 });
const zEyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.68, toneMapped: false });
const zShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false });

const torsoIM = new THREE.InstancedMesh(zTorsoGeo, zClothMat, ZMAX);
const headIM = new THREE.InstancedMesh(zHeadGeo, zSkinMat, ZMAX);
const eyesIM = new THREE.InstancedMesh(zEyeGeo, zEyeMat, ZMAX * 2);
const armsIM = new THREE.InstancedMesh(zArmGeo, zSkinMat, ZMAX * 2);
const legsIM = new THREE.InstancedMesh(zLegGeo, zClothMat, ZMAX * 2);
const shadowIM = new THREE.InstancedMesh(shadowGeo, zShadowMat, ZMAX);

const BIG_SPHERE = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 99999);
[torsoIM, headIM, eyesIM, armsIM, legsIM, shadowIM].forEach(m => {
  m.frustumCulled = false;
  m.geometry.boundingSphere = BIG_SPHERE;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(m);
});
[torsoIM, headIM, armsIM, legsIM].forEach(mesh => {
  mesh.castShadow = environment.quality.dynamicZombieShadows;
  mesh.receiveShadow = environment.quality.shadowMapSize > 0;
});

const _zombieSkinColor = new THREE.Color();
const _zombieClothColor = new THREE.Color();
const _zombieEyeColor = new THREE.Color();

function applyZombieAppearance(index, type) {
  const palette = ENVIRONMENT_CONFIG.zombiePalettes[type] || ENVIRONMENT_CONFIG.zombiePalettes.walker;
  const variation = (((index * 17 + wave * 5) % 11) - 5) * 0.012;
  _zombieSkinColor.setHex(palette.skin).offsetHSL(variation * 0.25, variation * 0.18, variation);
  _zombieClothColor.setHex(palette.cloth).offsetHSL(-variation * 0.18, variation * 0.12, variation * 0.75);
  _zombieEyeColor.setHex(palette.eyes);
  torsoIM.setColorAt(index, _zombieClothColor);
  headIM.setColorAt(index, _zombieSkinColor);
  armsIM.setColorAt(index * 2, _zombieSkinColor);
  armsIM.setColorAt(index * 2 + 1, _zombieSkinColor);
  legsIM.setColorAt(index * 2, _zombieClothColor);
  legsIM.setColorAt(index * 2 + 1, _zombieClothColor);
  eyesIM.setColorAt(index * 2, _zombieEyeColor);
  eyesIM.setColorAt(index * 2 + 1, _zombieEyeColor);
  for (const mesh of [torsoIM, headIM, armsIM, legsIM, eyesIM]) {
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

const zombies = [];
let zombieManager = null;
for (let i = 0; i < ZMAX; i++) {
  zombies.push({
    active: false, type: 'walker', cfg: ZTYPES.walker,
    pos: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, 1),
    yaw: 0, hp: 1, maxHp: 1, speed: 1, dmg: 10, radius: 0.45,
    state: 'idle', riseT: 0, dieT: 0,
    windup: -1, attackCd: 0, nextThink: 0, growlAt: 0,
    phase: Math.random() * 10, scaleBase: 1, vScale: 1, yOff: 0,
    acidCd: 0
  });
  applyZombieAppearance(i, 'walker');
  deactivateZombie(i);
}

function setPart(im, idx, x, y, z, rx, ry, rz, sx = 1, sy = 1, sz = 1) {
  _part.position.set(x, y, z);
  _part.rotation.set(rx, ry, rz);
  _part.scale.set(sx, sy, sz);
  _part.updateMatrix();
  _partM.multiplyMatrices(_rootM, _part.matrix);
  im.setMatrixAt(idx, _partM);
}

function writeZombie(i, z) {
  if (!z.active) { deactivateZombie(i); return; }
  const s = z.vScale;
  const isDead = z.state === ZombieStates.DEAD;
  const isMoving = z.state === ZombieStates.CHASE || z.state === ZombieStates.INVESTIGATE;
  const isAttacking = z.state === ZombieStates.ATTACK;
  const idlePhase = tNow * 1.25 * z.animationSpeedMultiplier + z.idleOffset;
  const ph = isMoving ? z.phase : idlePhase;
  const bodyBob = isDead ? 0 : isMoving
    ? Math.abs(Math.sin(ph)) * ANIMATION_CONFIG.moveBob
    : Math.sin(idlePhase) * ANIMATION_CONFIG.idleBob;
  let attackPose = 0;
  if (isAttacking) {
    if (z.attackPhase === 'windup') {
      const duration = Math.max(0.01, z.cfg.windup / z.aggression);
      attackPose = clamp(1 - z.attackTimer / duration, 0, 1);
    } else {
      const recoveryDuration = AI_CONFIG.attack.recovery + z.cfg.attackCd * 0.18;
      attackPose = clamp(z.attackTimer / recoveryDuration, 0, 1);
    }
  }
  const attackLean = attackPose * ANIMATION_CONFIG.attackLean;
  const silhouette = ENVIRONMENT_CONFIG.zombiePalettes[z.type] || ENVIRONMENT_CONFIG.zombiePalettes.walker;
  _dummy.position.set(z.pos.x + z.hitOffsetX, z.yOff + bodyBob, z.pos.z + z.hitOffsetZ);
  _dummy.rotation.set(z.visualPitch + attackLean, z.yaw + z.visualYaw, z.visualRoll);
  _dummy.scale.set(s, s, s);
  _dummy.updateMatrix();
  _rootM.copy(_dummy.matrix);

  const motionScale = isMoving ? 1 : 0.12;
  const legL = isDead ? 0.08 : Math.sin(ph) * ANIMATION_CONFIG.maxLegSwing * motionScale;
  const legR = -legL;
  const walkArm = Math.sin(ph + 0.5) * 0.35 * motionScale;
  const attackArm = 0.2 + attackPose * 1.2;
  const armL = isDead ? -0.25 : isAttacking ? attackArm : -0.7 + walkArm;
  const armR = isDead ? 0.15 : isAttacking ? attackArm : -0.7 - walkArm;
  const torsoSway = isDead ? 0 : Math.sin(ph * 0.5 + z.idleOffset) * ANIMATION_CONFIG.torsoSway * (isMoving ? 1 : 0.35);

  setPart(torsoIM, i, 0, 0.85, 0, 0.12 + attackPose * 0.12, 0, torsoSway, silhouette.torso, 1, silhouette.torso);
  setPart(headIM, i, 0, 1.42, 0.05, -0.08 - attackPose * 0.08, 0, -torsoSway * 0.45, silhouette.head, silhouette.head, silhouette.head);
  setPart(eyesIM, i * 2, -0.10, 1.46, 0.25, 0, 0, 0);
  setPart(eyesIM, i * 2 + 1, 0.10, 1.46, 0.25, 0, 0, 0);
  setPart(armsIM, i * 2, -0.36, 1.05, 0.15, armL, 0, 0.15);
  setPart(armsIM, i * 2 + 1, 0.36, 1.05, 0.15, armR, 0, -0.15);
  setPart(legsIM, i * 2, -0.16, 0.38, 0, legL, 0, 0);
  setPart(legsIM, i * 2 + 1, 0.16, 0.38, 0, legR, 0, 0);

  _dummy.position.set(z.pos.x + z.hitOffsetX * 0.2, 0.02, z.pos.z + z.hitOffsetZ * 0.2);
  _dummy.rotation.set(0, 0, 0);
  _dummy.scale.set(s, s, s);
  _dummy.updateMatrix();
  shadowIM.setMatrixAt(i, _dummy.matrix);
}

function spawnZombie(typeKey, x, zpos) {
  let idx = -1;
  for (let i = 0; i < ZMAX; i++) {
    if (!zombies[i].active) { idx = i; break; }
  }
  if (idx === -1) return null;

  const cfg = ZTYPES[typeKey] || ZTYPES.walker;
  const z = zombies[idx];
  z.active = true;
  z.type = typeKey;
  z.cfg = cfg;

  // Escalado de dificultad según oleada
  const waveMult = Math.min(1.35, 1 + Math.max(0, wave - 6) * 0.025);
  z.hp = Math.round(cfg.hp * waveMult);
  z.maxHp = z.hp;
  z.speed = cfg.speed * (1 + Math.min(0.25, wave * 0.015));
  z.dmg = cfg.dmg;
  z.radius = cfg.radius;
  z.scaleBase = cfg.scale;
  z.vScale = cfg.scale * 0.3;
  z.phase = Math.random() * 10;
  z.pos.set(x, 0, zpos);
  z.yaw = Math.atan2(playerPos.x - x, playerPos.z - zpos);
  z.dir.set(Math.sin(z.yaw), 0, Math.cos(z.yaw));
  applyZombieAppearance(idx, typeKey);
  _spawnEntryTarget.set(
    clamp(playerPos.x + rand(-6, 6), -CFG.arenaHalf + 2, CFG.arenaHalf - 2),
    0,
    clamp(playerPos.z + rand(-6, 6), -CFG.arenaHalf + 2, CFG.arenaHalf - 2)
  );
  zombieManager.spawn(z, typeKey, tNow, _spawnEntryTarget);

  aliveCount++;
  AU.playZombieVoice({ sourceId: z.id, position: z.pos, frequency: cfg.growlF, volume: 0.24, pitch: 0.9, state: ZombieStates.INVESTIGATE });
  return z;
}

function deactivateZombie(idx, fromManager = false) {
  const zombie = zombies[idx];
  if (!zombie) return;
  if (!fromManager && zombie.active) zombieManager?.deactivate(zombie);
  zombie.active = false;
  torsoIM.setMatrixAt(idx, ZERO_M);
  headIM.setMatrixAt(idx, ZERO_M);
  eyesIM.setMatrixAt(idx * 2, ZERO_M);
  eyesIM.setMatrixAt(idx * 2 + 1, ZERO_M);
  armsIM.setMatrixAt(idx * 2, ZERO_M);
  armsIM.setMatrixAt(idx * 2 + 1, ZERO_M);
  legsIM.setMatrixAt(idx * 2, ZERO_M);
  legsIM.setMatrixAt(idx * 2 + 1, ZERO_M);
  shadowIM.setMatrixAt(idx, ZERO_M);
}

const _spawnEntryTarget = new THREE.Vector3();
const _acidOrigin = new THREE.Vector3();
zombieManager = new ZombieManager({
  zombies,
  playerPosition: playerPos,
  playerRadius: CFG.pRadius,
  arenaHalf: CFG.arenaHalf,
  config: AI_CONFIG,
  animationConfig: ANIMATION_CONFIG,
  corpseConfig: EFFECTS_CONFIG.corpses,
  isBlocked: circleBlocked,
  isPlaying: () => gameState.is(GameStates.PLAYING),
  onDamagePlayer: zombie => {
    damagePlayer(zombie.dmg, zombie.pos);
    const spatial = spatialFor(zombie.pos.x, zombie.pos.z, 14);
    if (spatial) sfxFlesh(spatial.pan, Math.min(0.6, spatial.vol * 1.6));
    if (zombie.cfg.isBoss) shakeAmp = Math.min(0.3, shakeAmp + 0.18);
  },
  onRangedAttack: zombie => {
    _acidOrigin.set(zombie.pos.x, 1.4, zombie.pos.z);
    spawnAcidSpit(_acidOrigin, playerPos);
  },
  onGrowl: (zombie, attacking) => {
    AU.playZombieVoice({
      position: zombie.pos,
      sourceId: zombie.id,
      frequency: zombie.cfg.growlF,
      volume: attacking ? 0.55 : zombie.state === ZombieStates.IDLE ? 0.18 : 0.3,
      pitch: attacking ? 0.72 : rand(0.9, 1.1),
      state: zombie.state,
      attacking
    });
  },
  onStateChanged: (zombie, previousState, state) => {
    if (state === ZombieStates.STAGGER && Math.random() < 0.78) {
      AU.playZombieVoice({ sourceId: zombie.id, position: zombie.pos, frequency: zombie.cfg.growlF * 1.2, volume: 0.22, pitch: 1.08, state });
    } else if (state === ZombieStates.DEAD && previousState !== ZombieStates.DEAD && Math.random() < 0.58) {
      AU.playZombieVoice({ sourceId: zombie.id, position: zombie.pos, frequency: zombie.cfg.growlF * 0.8, volume: 0.3, pitch: 0.75, state });
    } else if (state === ZombieStates.CHASE && previousState !== ZombieStates.ATTACK && Math.random() < 0.34) {
      AU.playZombieVoice({ sourceId: zombie.id, position: zombie.pos, frequency: zombie.cfg.growlF, volume: 0.26, pitch: rand(0.94, 1.06), state });
    } else if (state === ZombieStates.INVESTIGATE && previousState === ZombieStates.IDLE && Math.random() < 0.24) {
      AU.playZombieVoice({ sourceId: zombie.id, position: zombie.pos, frequency: zombie.cfg.growlF, volume: 0.2, pitch: 1.08, state });
    }
  },
  onDeactivate: index => deactivateZombie(index, true),
  riseDuration: RISE_DUR,
  deathDuration: EFFECTS_CONFIG.corpses.lifetime
});
zombieManager.setCollisionResolver(collideCircle);

const stationGroups = {};
for (const [id, definition] of Object.entries(INTERACTION_CONFIG.stations)) {
  stationGroups[id] = environment.createInteractiveStation({ id, ...definition });
}

for (const location of OBJECTIVE_CONFIG.locations.RESTORE_POWER) {
  environment.createObjectiveGenerator({ id: location.id, position: location.position, label: 'GENERADOR' });
}
for (const location of OBJECTIVE_CONFIG.locations.SUPPLY_CACHE) {
  environment.createSupplyCache({ id: location.id, position: location.position });
}
environment.createDefenseArea();

const interaction = new InteractionManager({
  camera,
  config: INTERACTION_CONFIG,
  hasLineOfSight: (from, to, radius) => zombieManager.navigation.hasLineOfSight(from, to, radius),
  onPromptChanged: prompt => hud.showInteraction(prompt),
  onHoldChanged: state => hud.showHold(state)
});

function stationPosition(id) {
  const group = stationGroups[id];
  return new THREE.Vector3(group.position.x, group.position.y + 0.82, group.position.z);
}

function scaledAmmoCost(weaponId) {
  const definition = ECONOMY_CONFIG.ammo[weaponId];
  if (!definition) return null;
  const scaled = definition.cost * (1 + Math.max(0, wave - 1) * 0.035);
  return Math.round(economy.price(scaled, 'station') / 5) * 5;
}

function stationCost(amount) {
  return economy.price(amount, 'station');
}

function failPurchase(stationId, message) {
  environment.pulseStation(stationId, false);
  sfxPurchase(false);
  showToast(message);
  return false;
}

function isAmmoStationOffline() {
  return objectiveDirector?.current?.type === ObjectiveTypes.RESTORE_POWER
    && (objectiveDirector.state === ObjectiveStates.ANNOUNCING || objectiveDirector.state === ObjectiveStates.ACTIVE);
}

function buyAmmo() {
  if (isAmmoStationOffline()) return failPurchase('ammo', 'ESTACIÓN SIN ENERGÍA');
  const stats = weaponStats[currentWeapon];
  const ammo = weapons[currentWeapon];
  const definition = ECONOMY_CONFIG.ammo[currentWeapon];
  if (!definition || ammo.reserve === Infinity) return failPurchase('ammo', 'LA PISTOLA NO REQUIERE RESERVA');
  if (ammo.reserve >= stats.reserveCap) return failPurchase('ammo', 'RESERVA COMPLETA');
  const cost = scaledAmmoCost(currentWeapon);
  if (!economy.spend(cost, `ammo:${currentWeapon}`)) return failPurchase('ammo', 'CRÉDITOS INSUFICIENTES');
  const gained = Math.min(stats.reserveCap - ammo.reserve, Math.max(1, Math.round(stats.magSize * definition.magazines)));
  ammo.reserve += gained;
  environment.pulseStation('ammo', true);
  sfxPurchase(true);
  showToast(`+${gained} MUNICIÓN · ${stats.name}`);
  refreshWeaponHUD();
  updateWeaponBarUI();
  return true;
}

function buyHealth() {
  if (hp >= CFG.hpMax) return failPurchase('health', 'SALUD COMPLETA');
  const definition = ECONOMY_CONFIG.healthStation;
  const cost = stationCost(definition.cost);
  if (!economy.spend(cost, 'health')) return failPurchase('health', 'CRÉDITOS INSUFICIENTES');
  const healing = Math.round(definition.heal * perkManager.getModifier('player.healing'));
  const recovered = Math.min(healing, CFG.hpMax - hp);
  hp += recovered;
  refreshVitals();
  environment.pulseStation('health', true);
  sfxPurchase(true);
  showToast(`+${recovered} SALUD`);
  return true;
}

function buyWeaponUpgrade() {
  const oldStats = weaponStats[currentWeapon];
  const result = economy.upgradeWeapon(currentWeapon);
  if (!result.ok) return failPurchase('upgrade', result.reason === 'max' ? 'ARMA AL NIVEL MÁXIMO' : 'CRÉDITOS INSUFICIENTES');
  const updatedStats = rebuildWeaponStats(currentWeapon);
  if (updatedStats.magSize > oldStats.magSize) weapons[currentWeapon].mag += updatedStats.magSize - oldStats.magSize;
  environment.pulseStation('upgrade', true);
  sfxPurchase(true, true);
  showToast(`${updatedStats.name} · LVL ${result.level}`);
  refreshWeaponHUD();
  updateWeaponBarUI();
  return true;
}

function openRouteDoor() {
  if (routeDoorOpen) return false;
  if (!economy.spend(stationCost(ECONOMY_CONFIG.doorCost), 'route-door')) return failPurchase('door', 'CRÉDITOS INSUFICIENTES');
  routeDoorOpen = true;
  routeDoorOpenProgress = 0;
  routeDoorObstacle.active = false;
  const shootableIndex = shootables.indexOf(routeDoor);
  if (shootableIndex >= 0) shootables.splice(shootableIndex, 1);
  zombieManager.navigation.rebuild();
  for (const zombie of zombies) if (zombie.active && zombie.state !== ZombieStates.DEAD) zombie.forceRepath = true;
  environment.pulseStation('door', true);
  sfxPurchase(true, true);
  showToast('RUTA DE SERVICIO ABIERTA');
  return true;
}

interaction.register({
  id: 'health', position: stationPosition('health'),
  getPrompt: () => {
    const healing = Math.round(ECONOMY_CONFIG.healthStation.heal * perkManager.getModifier('player.healing'));
    return { label: hp >= CFG.hpMax ? 'AUXILIO · SALUD COMPLETA' : `AUXILIO · +${healing} SALUD`, cost: hp >= CFG.hpMax ? null : stationCost(ECONOMY_CONFIG.healthStation.cost), costText: hp >= CFG.hpMax ? '—' : '' };
  },
  interact: buyHealth
});
interaction.register({
  id: 'ammo', position: stationPosition('ammo'),
  getPrompt: () => {
    const stats = weaponStats[currentWeapon];
    const ammo = weapons[currentWeapon];
    const cost = scaledAmmoCost(currentWeapon);
    if (isAmmoStationOffline()) return { label: 'MUNICIÓN · SIN ENERGÍA', costText: 'FUERA DE SERVICIO' };
    if (cost === null || ammo.reserve === Infinity) return { label: `MUNICIÓN · ${stats.name}`, costText: 'SIN RESERVA' };
    if (ammo.reserve >= stats.reserveCap) return { label: `MUNICIÓN · ${stats.name}`, costText: 'COMPLETA' };
    return { label: `MUNICIÓN · ${stats.name}`, cost };
  },
  interact: buyAmmo
});
interaction.register({
  id: 'upgrade', position: stationPosition('upgrade'),
  getPrompt: () => {
    const level = economy.getWeaponLevel(currentWeapon);
    const cost = economy.getUpgradeCost(currentWeapon);
    return cost === null
      ? { label: `${weaponStats[currentWeapon].name} · LVL ${level}`, costText: 'MÁXIMO' }
      : { label: `MEJORAR ${weaponStats[currentWeapon].name} · LVL ${level + 1}`, cost };
  },
  interact: buyWeaponUpgrade
});
interaction.register({
  id: 'door', position: stationPosition('door'),
  isActive: () => !routeDoorOpen,
  getPrompt: () => ({ label: 'ABRIR RUTA DE SERVICIO', cost: stationCost(ECONOMY_CONFIG.doorCost) }),
  interact: openRouteDoor
});

function isActiveObjectiveAt(type, locationId) {
  return objectiveDirector?.state === ObjectiveStates.ACTIVE
    && objectiveDirector.current?.type === type
    && objectiveDirector.current.location.id === locationId;
}

for (const location of OBJECTIVE_CONFIG.locations.RESTORE_POWER) {
  const position = new THREE.Vector3(location.position[0], 0.82, location.position[2]);
  interaction.register({
    id: `objective-${location.id}`,
    mode: 'HOLD',
    position,
    duration: OBJECTIVE_CONFIG.restorePower.holdTime,
    holdDecay: OBJECTIVE_CONFIG.restorePower.holdDecay,
    cancelPenalty: OBJECTIVE_CONFIG.restorePower.cancelPenalty,
    isActive: () => isActiveObjectiveAt(ObjectiveTypes.RESTORE_POWER, location.id),
    cancelWhen: () => !isActiveObjectiveAt(ObjectiveTypes.RESTORE_POWER, location.id),
    getPrompt: () => ({ label: 'RESTABLECER ENERGÍA' }),
    complete: () => {
      if (!isActiveObjectiveAt(ObjectiveTypes.RESTORE_POWER, location.id)) return;
      environment.pulseStation(location.id, true);
      objectiveDirector.complete();
    }
  });
}

for (const location of OBJECTIVE_CONFIG.locations.SUPPLY_CACHE) {
  const position = new THREE.Vector3(location.position[0], 0.62, location.position[2]);
  interaction.register({
    id: `objective-${location.id}`,
    mode: 'HOLD',
    position,
    duration: OBJECTIVE_CONFIG.supplyCache.holdTime,
    holdDecay: OBJECTIVE_CONFIG.supplyCache.holdDecay,
    cancelPenalty: OBJECTIVE_CONFIG.supplyCache.cancelPenalty,
    isActive: () => isActiveObjectiveAt(ObjectiveTypes.SUPPLY_CACHE, location.id),
    cancelWhen: () => !isActiveObjectiveAt(ObjectiveTypes.SUPPLY_CACHE, location.id),
    getPrompt: () => ({ label: 'ABRIR SUMINISTROS' }),
    complete: () => {
      if (!isActiveObjectiveAt(ObjectiveTypes.SUPPLY_CACHE, location.id)) return;
      environment.openSupplyCache(location.id);
      objectiveDirector.complete();
    }
  });
}

const aiDebug = new AIDebugRenderer({
  scene,
  zombies,
  enabled: AI_CONFIG.debug.enabled || new URLSearchParams(location.search).get('debugAI') === '1',
  getDirectorState: () => ({ wave: waveDirector.wave, phase: waveDirector.phase, intensity: waveDirector.intensity })
});

// ============================================================================
// PROYECTILES (COHETES RPG Y ESCUPITAJOS DE ÁCIDO)
// ============================================================================
const projectiles = [];
const acidPuddles = [];

const rocketGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8);
rocketGeo.rotateX(Math.PI / 2);
const rocketMat = new THREE.MeshLambertMaterial({ color: 0x2b4028 });

const acidGeo = new THREE.SphereGeometry(0.18, 8, 8);
const acidMat = new THREE.MeshBasicMaterial({ color: 0xa3e635 });

function spawnRocket(origin, dir, damageMultiplier = 1) {
  const mesh = new THREE.Mesh(rocketGeo, rocketMat);
  mesh.position.copy(origin);
  mesh.lookAt(origin.clone().add(dir));
  scene.add(mesh);
  projectiles.push({
    type: 'rocket', mesh, dir: dir.clone().normalize(),
    speed: 34, life: 3.0, pos: origin.clone(), damageMultiplier
  });
}

function spawnAcidSpit(origin, targetPos) {
  const dir = targetPos.clone().sub(origin).normalize();
  dir.y += 0.12; // Arco balístico
  const mesh = new THREE.Mesh(acidGeo, acidMat);
  mesh.position.copy(origin);
  scene.add(mesh);
  projectiles.push({
    type: 'acid', mesh, dir: dir.normalize(),
    speed: 16, life: 3.5, pos: origin.clone(), source: origin.clone()
  });
  AU.burst({ f: 800, fEnd: 2400, q: 2.0, vol: 0.4, dur: 0.15 });
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life -= dt;
    const step = p.speed * dt;
    p.pos.addScaledVector(p.dir, step);
    p.mesh.position.copy(p.pos);

    if (p.type === 'rocket') {
      spawnBurst(p.pos, [0xffaa00, 0x555555], 2, 0.8, 0, 0.2, 0.05);
      // Colisión contra pared o suelo
      let hit = p.pos.y <= 0.1 || Math.abs(p.pos.x) >= CFG.arenaHalf || Math.abs(p.pos.z) >= CFG.arenaHalf;
      if (!hit) {
        for (let z = 0; z < ZMAX; z++) {
          const zm = zombies[z];
          if (zm.active && zm.state !== ZombieStates.DEAD && zm.state !== ZombieStates.SPAWNING && p.pos.distanceTo(zm.pos) < zm.radius + 0.5) {
            hit = true; break;
          }
        }
      }
      if (hit || p.life <= 0) {
        // Explosión de cohete
        explodeRocket(p.pos, p.damageMultiplier);
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
      }
    } else if (p.type === 'acid') {
      p.dir.y -= 0.35 * dt; // Gravedad del ácido
      // Daño al jugador si impacta
      if (p.pos.distanceTo(playerPos) < 0.9) {
        damagePlayer(18, p.source);
        showToast('¡QUEMADURA DE ÁCIDO!');
        spawnBurst(p.pos, ACID_COLORS, 12, 2.5, 4, 0.5, 0.12);
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
        continue;
      }
      if (p.pos.y <= 0.05 || p.life <= 0) {
        spawnBurst(p.pos, ACID_COLORS, 8, 1.8, 5, 0.4, 0.1);
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
      }
    }
  }
}

function explodeRocket(pos, damageMultiplier = 1) {
  sfxExplosion(pos, 1.0);
  shakeAmp = Math.min(0.35, shakeAmp + 0.25);
  spawnBurst(pos, EXPLOSION_COLORS, 35, 7.5, 8, 0.8, 0.35);
  zombieManager.emitNoise(pos, AI_CONFIG.noise.explosion, NoiseTypes.EXPLOSION, tNow);

  const rad = 6.0;
  for (let i = 0; i < ZMAX; i++) {
    const z = zombies[i];
    if (!z.active || z.state === ZombieStates.DEAD || z.state === ZombieStates.SPAWNING) continue;
    const d = z.pos.distanceTo(pos);
    if (d < rad) {
      const dmg = Math.round(weaponStats.rpg.dmg * damageMultiplier * (1 - d / rad));
      _impactPoint.set(z.pos.x, 1, z.pos.z);
      _impactDirection.set(z.pos.x - pos.x, 0, z.pos.z - pos.z).normalize();
      const crowd = perkManager.getShotModifiers({ nearbyCount: countNearbyZombies(z) });
      damageZombie(z, dmg, _impactPoint, false, 'rpg', _impactDirection, perkManager.getModifier('weapon.stagger') * crowd.stagger);
    }
  }
}

function explodeBoomer(pos) {
  sfxExplosion(pos, 0.85);
  shakeAmp = Math.min(0.25, shakeAmp + 0.18);
  spawnBurst(pos, [0xff8800, 0x8b0000, 0xa3e635], 28, 6.0, 7, 0.7, 0.25);
  zombieManager.emitNoise(pos, AI_CONFIG.noise.explosion, NoiseTypes.EXPLOSION, tNow);

  // Daño en área a zombies y al jugador si está cerca
  const dPlayer = pos.distanceTo(playerPos);
  if (dPlayer < 4.5) {
    damagePlayer(Math.round(35 * (1 - dPlayer / 4.5)), pos);
  }

  for (let i = 0; i < ZMAX; i++) {
    const z = zombies[i];
    if (!z.active || z.state === ZombieStates.DEAD || z.state === ZombieStates.SPAWNING) continue;
    const d = z.pos.distanceTo(pos);
    if (d < 5.0) {
      _impactPoint.set(z.pos.x, 1, z.pos.z);
      _impactDirection.set(z.pos.x - pos.x, 0, z.pos.z - pos.z).normalize();
      damageZombie(z, Math.round(110 * (1 - d / 5.0)), _impactPoint, false, 'rpg', _impactDirection);
    }
  }
}

// ============================================================================
// SISTEMA DE DISPARO Y BALÍSTICA
// ============================================================================
const _raycaster = new THREE.Raycaster();
_raycaster.far = 100;
const _camPos = new THREE.Vector3();
const _shotDir = new THREE.Vector3();
const _shotRight = new THREE.Vector3();
const _shotUp = new THREE.Vector3();
const _headCenter = new THREE.Vector3();
const _bodyCenter = new THREE.Vector3();
const _impactPoint = new THREE.Vector3();
const _impactDirection = new THREE.Vector3();
const _tracerStart = new THREE.Vector3();
const _tracerEnd = new THREE.Vector3();
const _shotHits = [];

function castPellet(w, shotModifiers) {
  camera.getWorldPosition(_camPos);
  camera.getWorldDirection(_shotDir);

  if (w.isExplosive) {
    _tracerStart.copy(_camPos).addScaledVector(_shotDir, 0.5);
    spawnRocket(_tracerStart, _shotDir, shotModifiers.damage);
    return;
  }

  _shotRight.setFromMatrixColumn(camera.matrixWorld, 0);
  _shotUp.setFromMatrixColumn(camera.matrixWorld, 1);

  const sp = w.spread || 0;
  const gx = (Math.random() + Math.random() - 1) * sp;
  const gy = (Math.random() + Math.random() - 1) * sp;
  _shotDir.addScaledVector(_shotRight, gx).addScaledVector(_shotUp, gy).normalize();

  _raycaster.set(_camPos, _shotDir);
  const staticHits = _raycaster.intersectObjects(shootables, false);
  let maxDist = w.range;
  let wallHit = null;
  let wallHitPoint = null;

  if (staticHits.length > 0) {
    wallHit = staticHits[0];
    maxDist = Math.min(maxDist, wallHit.distance);
    wallHitPoint = wallHit.point;
  }

  // Penetración de balas para Sniper
  _shotHits.length = 0;
  for (let i = 0; i < ZMAX; i++) {
    const z = zombies[i];
    if (!z.active || z.state === ZombieStates.DEAD || z.state === ZombieStates.SPAWNING) continue;

    const zScale = z.vScale;
    _headCenter.set(z.pos.x, z.yOff + 1.62 * zScale, z.pos.z);
    _bodyCenter.set(z.pos.x, z.yOff + 0.85 * zScale, z.pos.z);

    const headDist = raySphereIntersect(_camPos, _shotDir, _headCenter, 0.35 * zScale);
    if (headDist !== null && headDist < maxDist) {
      _shotHits.push({ z, dist: headDist, isHeadshot: true });
      continue;
    }

    const bodyDist = rayCylinderIntersect(_camPos, _shotDir, _bodyCenter, 0.45 * zScale, 0.0, 1.4 * zScale);
    if (bodyDist !== null && bodyDist < maxDist) {
      _shotHits.push({ z, dist: bodyDist, isHeadshot: false });
    }
  }

  _shotHits.sort((a, b) => a.dist - b.dist);
  const targetCount = w.pierce ? _shotHits.length : Math.min(1, _shotHits.length);
  if (wallHitPoint) _tracerEnd.copy(wallHitPoint);
  else _tracerEnd.copy(_camPos).addScaledVector(_shotDir, maxDist);

  if (targetCount > 0) {
    _tracerEnd.copy(_camPos).addScaledVector(_shotDir, _shotHits[0].dist);
    for (let i = 0; i < targetCount; i++) {
      const h = _shotHits[i];
      const baseDamage = h.isHeadshot ? w.dmg * w.headMult : w.dmg;
      const dmg = Math.round(baseDamage * shotModifiers.damage);
      _impactPoint.copy(_camPos).addScaledVector(_shotDir, h.dist);
      const crowd = perkManager.getShotModifiers({ nearbyCount: countNearbyZombies(h.z) });
      damageZombie(h.z, dmg, _impactPoint, h.isHeadshot, w.id, _shotDir, perkManager.getModifier('weapon.stagger') * crowd.stagger);
    }
  } else if (wallHit) {
    spawnSurfaceImpact(wallHit, w);
    zombieManager.emitNoise(wallHitPoint, AI_CONFIG.noise.impact, NoiseTypes.IMPACT, tNow);
  }

  _tracerStart.copy(_camPos).addScaledVector(_shotDir, 0.4).addScaledVector(_shotRight, 0.15).addScaledVector(_shotUp, -0.1);
  spawnTracer(_tracerStart, _tracerEnd);
}

function raySphereIntersect(origin, dir, center, radius) {
  const ocX = origin.x - center.x;
  const ocY = origin.y - center.y;
  const ocZ = origin.z - center.z;
  const b = ocX * dir.x + ocY * dir.y + ocZ * dir.z;
  const c = ocX * ocX + ocY * ocY + ocZ * ocZ - radius * radius;
  const h = b * b - c;
  if (h < 0) return null;
  const sqrtH = Math.sqrt(h);
  const t1 = -b - sqrtH, t2 = -b + sqrtH;
  if (t1 > 0) return t1;
  if (t2 > 0) return t2;
  return null;
}

function rayCylinderIntersect(origin, dir, center, radius, minY, maxY) {
  const ox = origin.x - center.x, oz = origin.z - center.z;
  const dx = dir.x, dz = dir.z;
  const a = dx * dx + dz * dz;
  if (a < 1e-6) return null;
  const b = 2 * (ox * dx + oz * dz);
  const c = ox * ox + oz * oz - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b - sqrtDisc) / (2 * a), t2 = (-b + sqrtDisc) / (2 * a);
  let t = t1 > 0 ? t1 : t2 > 0 ? t2 : null;
  if (t === null) return null;
  const hitY = origin.y + dir.y * t;
  if (hitY >= minY && hitY <= maxY) return t;
  return null;
}

const SURFACE_IMPACTS = Object.freeze({
  concrete: { colors: [0x8a9096, 0xb8aa91], count: 5, speed: 1.7, gravity: 5.5, life: 0.3, size: 0.065 },
  metal: { colors: [0xffe6a3, 0xff9d2e], count: 6, speed: 3.1, gravity: 7, life: 0.22, size: 0.045 },
  wood: { colors: [0x9b6b37, 0xd0a05e], count: 6, speed: 2.2, gravity: 6.5, life: 0.32, size: 0.05 }
});

function spawnSurfaceImpact(hit, weapon) {
  const surface = hit.object.userData.surface || 'concrete';
  const fx = SURFACE_IMPACTS[surface] || SURFACE_IMPACTS.concrete;
  const force = EFFECTS_CONFIG.impact.weaponForce[weapon.id] || 1;
  effects.spawnImpact(hit.point, surface, force);
  spawnBurst(hit.point, fx.colors, fx.count, fx.speed * force, fx.gravity, fx.life, fx.size);
}

function countNearbyZombies(target, radius = 2.8) {
  let nearby = 0;
  const radiusSq = radius * radius;
  for (const other of zombies) {
    if (other === target || !other.active || other.state === ZombieStates.DEAD || other.state === ZombieStates.SPAWNING) continue;
    const dx = other.pos.x - target.pos.x;
    const dz = other.pos.z - target.pos.z;
    if (dx * dx + dz * dz <= radiusSq) nearby++;
  }
  return nearby;
}

function damageZombie(z, dmg, point, isHeadshot, weaponId = currentWeapon, impactDirection = null, staggerMultiplier = 1) {
  if (z.state === ZombieStates.DEAD || z.state === ZombieStates.SPAWNING) return;
  z.hp -= dmg;
  const impactForce = EFFECTS_CONFIG.impact.weaponForce[weaponId] || 1;
  effects.spawnImpact(point, 'flesh', impactForce * (isHeadshot ? 1.2 : 1));
  spawnBurst(point, z.type === 'spitter' ? ACID_COLORS : BLOOD_COLORS, isHeadshot ? 14 : 8, 3.5, 9, 0.5, 0.08);

  const sp = spatialFor(z.pos.x, z.pos.z, 20);
  sfxFlesh(sp ? sp.pan : 0, sp ? Math.max(0.1, sp.vol * 0.6) : 0.15);

  if (z.hp <= 0) {
    zombieManager.kill(z, impactDirection, impactForce, isHeadshot);
    kills++;
    aliveCount--;
    const killEffects = perkManager.onZombieKilled({ precise: isHeadshot, type: z.type });
    economy.earn(economy.killReward(z.type), `kill:${z.type}`);
    let dropType = dropDirector.recordKill({
      healthRatio: hp / Math.max(1, CFG.hpMax),
      ammoRatio: currentAmmoRatio(),
      activeDrops: countActiveDrops(),
      precise: isHeadshot,
      precisionChance: killEffects.precisionDropChance
    });
    if (dropType === 'ammo' && !hasReserveWeapon()) dropType = 'credits';
    if (dropType) spawnPickup(dropType, z.pos, 'drop');
    refreshStats();
    hitmarkerFx(true);
    sfxKillConfirm();

    if (z.cfg.isKamikaze) {
      explodeBoomer(z.pos);
    }
  } else {
    zombieManager.onHit(z, dmg, weaponId, isHeadshot, tNow, impactDirection, impactForce, staggerMultiplier);
    hitmarkerFx(false);
  }
}

function hitmarkerFx(kill) {
  hud.showHitmarker(kill);
  effects.triggerHit(kill);
}

// ============================================================================
// TRAZADORAS Y PARTÍCULAS
// ============================================================================
const TR_N = 24;
const tracers = [];
const tracerGeo = new THREE.BoxGeometry(1, 1, 1);
for (let i = 0; i < TR_N; i++) {
  const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0.9, depthWrite: false }));
  m.visible = false;
  scene.add(m);
  tracers.push({ mesh: m, life: 0 });
}
let tracerIdx = 0;

function spawnTracer(a, b) {
  const len = a.distanceTo(b);
  if (len < 0.4) return;
  const t = tracers[tracerIdx % TR_N];
  tracerIdx++;
  t.mesh.visible = true;
  t.mesh.position.copy(a).add(b).multiplyScalar(0.5);
  t.mesh.lookAt(b);
  t.mesh.scale.set(0.022, 0.022, len);
  t.life = 1;
  t.mesh.material.opacity = 0.85;
}

function updateTracers(dt) {
  for (let i = 0; i < TR_N; i++) {
    const t = tracers[i];
    if (t.life <= 0) continue;
    t.life -= dt * 16;
    if (t.life <= 0) { t.life = 0; t.mesh.visible = false; continue; }
    t.mesh.material.opacity = t.life * 0.85;
  }
}

const PARTS_N = 120;
const particles = [];
const particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
for (let i = 0; i < PARTS_N; i++) {
  const m = new THREE.Mesh(particleGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
  m.visible = false;
  scene.add(m);
  particles.push({ mesh: m, vel: new THREE.Vector3(), life: 0, maxLife: 1, grav: 10 });
}
let partIdx = 0;

function spawnBurst(pos, colors, n, speed, grav, life, size) {
  const particleCount = Math.max(2, Math.ceil(n * visualQuality));
  for (let i = 0; i < particleCount; i++) {
    const p = particles[partIdx % PARTS_N];
    partIdx++;
    p.mesh.visible = true;
    p.mesh.position.copy(pos);
    p.vel.set(rand(-1, 1), rand(0.3, 1.4), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.5, 1.3));
    p.grav = grav;
    p.life = p.maxLife = life * rand(0.6, 1.1);
    p.mesh.material.color.setHex(colors[(Math.random() * colors.length) | 0]);
    p.mesh.material.opacity = 1;
    p.mesh.scale.setScalar(size * rand(0.7, 1.5));
  }
}

function updateParticles(dt) {
  for (let i = 0; i < PARTS_N; i++) {
    const p = particles[i];
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) { p.life = 0; p.mesh.visible = false; continue; }
    p.vel.y -= p.grav * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.material.opacity = p.life / p.maxLife;
  }
}

// ============================================================================
// MODELADO 3D DETALLADO DE ARMAS EN PRIMERA PERSONA (VIEWMODELS)
// ============================================================================
const vmRoot = new THREE.Group();
camera.add(vmRoot);
vmRoot.position.set(0.24, -0.25, -0.55);
const VM_BASE_X = 0.24, VM_BASE_Y = -0.25, VM_BASE_Z = -0.55;

const viewmodels = {
  pistol: buildPistolMesh(),
  shotgun: buildShotgunMesh(),
  smg: buildSmgMesh(),
  rifle: buildRifleMesh(),
  sniper: buildSniperMesh(),
  rpg: buildRpgMesh()
};

const vmMaterialReplacements = new Map();
for (const k in viewmodels) {
  viewmodels[k].visible = false;
  viewmodels[k].traverse(object => {
    object.layers.set(1);
    if (!object.material?.isMeshLambertMaterial) return;
    let replacement = vmMaterialReplacements.get(object.material);
    if (!replacement) {
      replacement = new THREE.MeshBasicMaterial({ color: object.material.color, map: object.material.map, toneMapped: false });
      vmMaterialReplacements.set(object.material, replacement);
    }
    object.material = replacement;
  });
  vmRoot.add(viewmodels[k]);
}
for (const material of vmMaterialReplacements.keys()) material.dispose();
camera.layers.enable(1);

const flashMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(0.25, 0.25),
  new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
);
camera.add(flashMesh);
flashMesh.layers.set(1);
flashMesh.position.set(0.24, -0.22, -0.9);
flashMesh.visible = false;

const effects = new EffectsManager({
  scene,
  hudElement: dom.hud,
  muzzleMesh: flashMesh,
  muzzleLight: mzLight,
  config: EFFECTS_CONFIG,
  baseFogDensity: ENVIRONMENT_CONFIG.fog.baseDensity
});

function buildPistolMesh() {
  const g = new THREE.Group();
  const mSlide = new THREE.MeshLambertMaterial({ color: 0x1e2226 });
  const mGrip = new THREE.MeshLambertMaterial({ color: 0x111315 });
  const mSight = new THREE.MeshBasicMaterial({ color: 0x00ff88 });

  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.085, 0.28), mSlide);
  slide.position.set(0, 0.04, -0.06);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.15, 0.085), mGrip);
  grip.position.set(0, -0.06, 0.02); grip.rotation.x = -0.25;
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.02), mSight);
  frontSight.position.set(0, 0.09, -0.18);
  g.add(slide, grip, frontSight);
  return g;
}

function buildShotgunMesh() {
  const g = new THREE.Group();
  const mSteel = new THREE.MeshLambertMaterial({ color: 0x22262a });
  const mWood = new THREE.MeshLambertMaterial({ color: 0x5a3618 });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.58, 8), mSteel);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -0.16);
  const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 8), mSteel);
  magTube.rotation.x = Math.PI / 2; magTube.position.set(0, -0.01, -0.15);
  const pump = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.07, 0.16), mWood);
  pump.position.set(0, -0.01, -0.12);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.26), mWood);
  stock.position.set(0, -0.05, 0.24); stock.rotation.x = -0.15;
  g.add(barrel, magTube, pump, stock);
  return g;
}

function buildSmgMesh() {
  const g = new THREE.Group();
  const mBody = new THREE.MeshLambertMaterial({ color: 0x1f2428 });
  const mMag = new THREE.MeshLambertMaterial({ color: 0x0f1114 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.32), mBody);
  body.position.set(0, 0.02, -0.05);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.05), mMag);
  mag.position.set(0, -0.12, -0.08); mag.rotation.x = 0.1;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8), mBody);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -0.26);
  g.add(body, mag, barrel);
  return g;
}

function buildRifleMesh() {
  const g = new THREE.Group();
  const mMetal = new THREE.MeshLambertMaterial({ color: 0x2d343a });
  const mWood = new THREE.MeshLambertMaterial({ color: 0x6e4020 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.095, 0.32), mMetal);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.52), mMetal);
  barrel.position.set(0, 0.02, -0.22);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.19, 0.09), mWood);
  mag.position.set(0, -0.12, -0.04); mag.rotation.x = 0.25;
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 0.22), mWood);
  stock.position.set(0, -0.04, 0.24); stock.rotation.x = -0.1;
  g.add(body, barrel, mag, stock);
  return g;
}

function buildSniperMesh() {
  const g = new THREE.Group();
  const mGreen = new THREE.MeshLambertMaterial({ color: 0x2e4230 });
  const mScope = new THREE.MeshLambertMaterial({ color: 0x15181b });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.42), mGreen);
  const longBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.72, 8), mScope);
  longBarrel.rotation.x = Math.PI / 2; longBarrel.position.set(0, 0.03, -0.36);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.24, 8), mScope);
  scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.11, -0.08);
  g.add(body, longBarrel, scope);
  return g;
}

function buildRpgMesh() {
  const g = new THREE.Group();
  const mTube = new THREE.MeshLambertMaterial({ color: 0x3d4a36 });
  const mWarhead = new THREE.MeshLambertMaterial({ color: 0x6e8450 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 8), mTube);
  tube.rotation.x = Math.PI / 2; tube.position.set(0, 0.03, -0.1);
  const rocket = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 8), mWarhead);
  rocket.rotation.x = -Math.PI / 2; rocket.position.set(0, 0.03, -0.58);
  g.add(tube, rocket);
  return g;
}

function setVMCurrent() {
  for (const k in viewmodels) {
    viewmodels[k].visible = k === currentWeapon;
  }
  refreshWeaponHUD();
}

// ============================================================================
// SUMINISTROS (PICKUPS)
// ============================================================================
const ringGeo = new THREE.RingGeometry(0.55, 0.7, 18);
ringGeo.rotateX(-Math.PI / 2);
const pickupBoxGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
const pickupBoxMaterials = {};
const pickupRingMaterials = {};

function pickupMaterials(type) {
  const color = PICKUP_COLORS[type] || 0xffffff;
  pickupBoxMaterials[type] ||= new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.42, roughness: 0.46, metalness: 0.18 });
  pickupRingMaterials[type] ||= new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.82 });
  return { box: pickupBoxMaterials[type], ring: pickupRingMaterials[type] };
}

function buildPickupMesh() {
  const g = new THREE.Group();
  const materials = pickupMaterials('ammo');
  const box = new THREE.Mesh(pickupBoxGeo, materials.box);
  box.position.y = 0.45;
  const ring = new THREE.Mesh(ringGeo, materials.ring);
  ring.position.y = 0.03;
  g.add(box, ring);
  g.userData.pivot = box;
  g.userData.ring = ring;
  g.visible = false;
  scene.add(g);
  return g;
}

const pickupsArr = Array.from({ length: DROP_CONFIG.poolSize }, (_, index) => ({
  active: false,
  g: buildPickupMesh(),
  type: 'ammo',
  source: 'world',
  spot: -1,
  age: 0,
  lifetime: 52,
  ph: index * 2.399963229728653
}));
const pickupCandidates = [];

function pickupSpotOccupied(index) {
  for (const pickup of pickupsArr) if (pickup.active && pickup.spot === index) return true;
  return false;
}

function spawnPickup(type, position = null, source = 'world') {
  const slot = pickupsArr.find(pickup => !pickup.active);
  if (!slot) return null;
  let spot = -1;
  if (!position) {
    pickupCandidates.length = 0;
    for (let index = 0; index < PICKUP_SPOTS.length; index++) if (!pickupSpotOccupied(index)) pickupCandidates.push(index);
    if (!pickupCandidates.length) return null;
    spot = pick(pickupCandidates);
    position = { x: PICKUP_SPOTS[spot][0], y: 0, z: PICKUP_SPOTS[spot][1] };
  }
  const materials = pickupMaterials(type);
  slot.g.userData.pivot.material = materials.box;
  slot.g.userData.ring.material = materials.ring;
  slot.g.position.set(position.x, position.y || 0, position.z);
  slot.g.userData.pivot.visible = true;
  slot.g.visible = true;
  slot.active = true;
  slot.type = type;
  slot.source = source;
  slot.spot = spot;
  slot.age = 0;
  slot.lifetime = source === 'drop' ? DROP_CONFIG.lifetime : 52;
  return slot;
}

function removePickup(pickup) {
  if (!pickup) return;
  pickup.active = false;
  pickup.g.visible = false;
  pickup.spot = -1;
}

function givePickup(type, source = 'world') {
  AU.init(); AU.resume();
  if (type === 'medkit' || type === 'medkit_small') {
    if (hp >= CFG.hpMax) return false;
    const baseHeal = type === 'medkit_small' ? DROP_CONFIG.smallHeal : 45;
    const healAmt = Math.round(baseHeal * perkManager.getModifier('player.healing'));
    const oldHp = hp;
    hp = Math.min(CFG.hpMax, hp + healAmt);
    if (type === 'medkit') stamina = CFG.stamMax;
    refreshVitals();
    sfxPickup();
    showToast(`+${Math.round(hp - oldHp)} DE SALUD`);
    return true;
  }
  if (type === 'credits') {
    economy.earn(DROP_CONFIG.creditAmount, 'drop');
    sfxPickup();
    showToast(`+${DROP_CONFIG.creditAmount} CRÉDITOS`);
    return true;
  }
  if (type === 'ammo') {
    let changed = false;
    for (const id in WEAPONS) {
      if (id === 'pistol') continue;
      if (weapons[id] && unlockedWeapons[id]) {
        const w = weaponStats[id];
        const multiplier = source === 'drop' ? DROP_CONFIG.ammoMagazines : 1.5;
        const gain = Math.max(1, Math.round(w.magSize * multiplier));
        const previous = weapons[id].reserve;
        weapons[id].reserve = Math.min(w.reserveCap, (weapons[id].reserve || 0) + gain);
        changed ||= weapons[id].reserve > previous;
      }
    }
    if (!changed) return false;
    refreshWeaponHUD();
    updateWeaponBarUI();
    sfxPickup();
    showToast('MUNICIÓN REABASTECIDA');
    return true;
  }

  // Desbloqueo de nueva arma
  const w = weaponStats[type];
  if (w) {
    if (!unlockedWeapons[type]) {
      unlockedWeapons[type] = true;
      if (!weapons[type]) {
        weapons[type] = { mag: w.magSize, reserve: w.reserveStart };
      }
      switchWeapon(type);
      sfxPickup();
      showToast(`¡${w.name} DESBLOQUEADA!`);
      updateWeaponBarUI();
    } else {
      weapons[type].reserve = Math.min(w.reserveCap, (weapons[type].reserve || 0) + w.magSize * 2);
      refreshWeaponHUD();
      updateWeaponBarUI();
      sfxPickup();
      showToast(`+MUNICIÓN ${w.name}`);
    }
    return true;
  }
  return false;
}

function updatePickups(dt) {
  for (const p of pickupsArr) {
    if (!p.active) continue;
    p.age += dt;
    const piv = p.g.userData.pivot;
    piv.rotation.y += dt * 1.8;
    piv.position.y = 0.45 + Math.sin(tNow * 2 + p.ph) * 0.08;
    if (p.age > p.lifetime - 5) piv.visible = ((p.age * 5) | 0) % 2 === 0;
    if (p.age > p.lifetime) removePickup(p);
  }
}

function checkPickups() {
  for (const p of pickupsArr) {
    if (!p.active) continue;
    if (Math.hypot(p.g.position.x - playerPos.x, p.g.position.z - playerPos.z) < 1.6) {
      if (givePickup(p.type, p.source)) {
        spawnBurst(p.g.position.clone().add(new THREE.Vector3(0, 0.4, 0)), [0x00f0ff, 0xffffff, 0x7ec850], 10, 2.5, 4, 0.4, 0.08);
        removePickup(p);
      }
    }
  }
}

function countActiveDrops() {
  let count = 0;
  for (const pickup of pickupsArr) if (pickup.active && pickup.source === 'drop') count++;
  return count;
}

function currentAmmoRatio() {
  let available = 0;
  let capacity = 0;
  for (const id of Object.keys(WEAPONS)) {
    if (!unlockedWeapons[id] || id === 'pistol') continue;
    const stats = weaponStats[id];
    available += Math.max(0, weapons[id].mag) + Math.max(0, weapons[id].reserve);
    capacity += stats.magSize + stats.reserveCap;
  }
  return capacity > 0 ? clamp(available / capacity, 0, 1) : 1;
}

function hasReserveWeapon() {
  return Object.keys(WEAPONS).some(id => id !== 'pistol' && unlockedWeapons[id]);
}

// ============================================================================
// DIRECTORES DE OLEADA Y SPAWN
// ============================================================================
function grantWaveSupplies(num) {
  // Desbloqueos automáticos garantizados en oleadas específicas
  if (num === 2 && !unlockedWeapons.shotgun) spawnPickup('shotgun');
  if (num === 3 && !unlockedWeapons.smg) spawnPickup('smg');
  if (num === 5 && !unlockedWeapons.rifle) spawnPickup('rifle');
  if (num === 7 && !unlockedWeapons.sniper) spawnPickup('sniper');
  if (num === 9 && !unlockedWeapons.rpg) spawnPickup('rpg');
}

const spawnPathScratch = [];
const objectivePathScratch = [];
let objectiveOfferDelay = -1;
const spawnDirector = new SpawnDirector({
  points: SPAWN_POINTS,
  config: SPAWN_CONFIG,
  isBlocked: circleBlocked,
  hasLineOfSight: (from, to, radius) => zombieManager.navigation.hasLineOfSight(from, to, radius),
  isNavigable: (from, to) => (
    zombieManager.navigation.hasLineOfSight(from, to, 0.7) ||
    zombieManager.navigation.findPath(from, to, spawnPathScratch)
  )
});

function spawnDirectedEnemy(request) {
  spawnCameraForward.set(-Math.sin(lookEuler.y), 0, -Math.cos(lookEuler.y));
  const point = spawnDirector.choose({
    playerPosition: playerPos,
    cameraForward: spawnCameraForward,
    zombies,
    groupId: request.groupId,
    memberIndex: request.memberIndex,
    now: tNow
  });
  if (!point) return false;
  if (request.memberIndex === 0) {
    effects.signalAccess(point, request.phase, SPAWN_POINTS.indexOf(point));
  }
  let x = point[0] + rand(-0.75, 0.75);
  let z = point[1] + rand(-0.75, 0.75);
  const radius = (ZTYPES[request.type] || ZTYPES.walker).radius;
  if (circleBlocked(x, z, radius)) { x = point[0]; z = point[1]; }
  return !!spawnZombie(request.type, x, z);
}

function objectiveLocationAvailable(location, type) {
  if (location.requiresDoorOpen && !routeDoorOpen) return false;
  const [x, , z] = location.position;
  if (circleBlocked(x, z, 0.68)) return false;
  const minDistance = type === ObjectiveTypes.SUPPLY_CACHE ? 12 : 6;
  if (Math.hypot(x - playerPos.x, z - playerPos.z) < minDistance) return false;
  const target = { x, z };
  return zombieManager.navigation.hasLineOfSight(playerPos, target, 0.68)
    || zombieManager.navigation.findPath(playerPos, target, objectivePathScratch);
}

function objectiveTitle(objective) {
  if (!objective) return '';
  if (objective.type === ObjectiveTypes.RESTORE_POWER) return 'RESTABLECE LA ENERGÍA';
  if (objective.type === ObjectiveTypes.DEFEND_POSITION) return `DEFIENDE ${objective.location.label}`;
  return 'SUMINISTROS DETECTADOS';
}

function objectiveMarkerIcon(type) {
  return type === ObjectiveTypes.RESTORE_POWER ? '⚡' : type === ObjectiveTypes.DEFEND_POSITION ? '◎' : '▣';
}

function isInsideDefense(objective = objectiveDirector?.current) {
  if (!objective || objective.type !== ObjectiveTypes.DEFEND_POSITION) return false;
  const [x, , z] = objective.location.position;
  return Math.hypot(playerPos.x - x, playerPos.z - z) <= OBJECTIVE_CONFIG.defendPosition.radius;
}

function refreshObjectiveHUD(objective = objectiveDirector?.current) {
  if (!objective) return hud.hideObjective();
  if (objective.type === ObjectiveTypes.DEFEND_POSITION) {
    hud.showObjective({
      title: objectiveTitle(objective),
      detail: isInsideDefense(objective) ? 'MANTÉN LA POSICIÓN' : 'ENTRA EN LA ZONA',
      progress: objective.progress / Math.max(0.01, objective.target),
      time: objective.remaining
    });
  } else if (objective.type === ObjectiveTypes.RESTORE_POWER) {
    hud.showObjective({ title: objectiveTitle(objective), detail: objective.location.label, showProgress: false, time: objective.remaining });
  } else {
    hud.showObjective({ title: objectiveTitle(objective), detail: `${objective.location.label} · OPCIONAL`, showProgress: false, time: objective.remaining });
  }
}

function giveSupplyCacheResources() {
  const definition = OBJECTIVE_CONFIG.supplyCache;
  const supply = perkManager.getSupplyMultipliers();
  const previousHp = hp;
  const healing = Math.round(definition.heal * supply.resources * perkManager.getModifier('player.healing'));
  hp = Math.min(CFG.hpMax, hp + healing);
  let ammoAdded = 0;
  for (const id of Object.keys(WEAPONS)) {
    if (id === 'pistol' || !unlockedWeapons[id]) continue;
    const stats = weaponStats[id];
    const gain = Math.max(1, Math.round(stats.magSize * definition.ammoMagazines * supply.resources));
    const previous = weapons[id].reserve;
    weapons[id].reserve = Math.min(stats.reserveCap, weapons[id].reserve + gain);
    ammoAdded += weapons[id].reserve - previous;
  }
  refreshVitals();
  refreshWeaponHUD();
  updateWeaponBarUI();
  return { health: hp - previousHp, ammo: ammoAdded };
}

function clearObjectiveEffects(objective, hideWorld = false) {
  if (!objective) return;
  waveDirector.setObjectivePressure(1);
  spawnDirector.setObjectiveBias(null);
  if (objective.type === ObjectiveTypes.RESTORE_POWER) {
    environment.setZonePower(objective.location.lightIds, true);
    environment.setStationPowered(OBJECTIVE_CONFIG.restorePower.disabledStation, true);
  }
  if (!hideWorld) return;
  if (objective.type === ObjectiveTypes.DEFEND_POSITION) environment.setDefenseArea(objective.location.position, OBJECTIVE_CONFIG.defendPosition.radius, false);
  else environment.setObjectiveVisible(objective.location.id, false);
}

function setDefenseSpawnBias(objective) {
  spawnDirector.setObjectiveBias({
    position: { x: objective.location.position[0], z: objective.location.position[2] },
    preferredIndices: objective.location.spawnIndices,
    bonus: OBJECTIVE_CONFIG.defendPosition.spawnBiasBonus,
    minDistance: OBJECTIVE_CONFIG.defendPosition.minObjectiveSpawnDistance
  });
}

function handleObjectiveEvent(event) {
  const objective = event.objective;
  if (event.type === ObjectiveEvents.ANNOUNCED) {
    if (objective.type === ObjectiveTypes.DEFEND_POSITION) {
      environment.setDefenseArea(objective.location.position, OBJECTIVE_CONFIG.defendPosition.radius, true, 0);
      setDefenseSpawnBias(objective);
    } else {
      environment.setObjectiveVisible(objective.location.id, true);
    }
    if (objective.type === ObjectiveTypes.RESTORE_POWER) {
      environment.setZonePower(objective.location.lightIds, false);
      environment.setStationPowered(OBJECTIVE_CONFIG.restorePower.disabledStation, false);
    }
    showBanner(objectiveTitle(objective), objective.type === ObjectiveTypes.RESTORE_POWER);
    waveMessageTimer = 2.1;
    refreshObjectiveHUD(objective);
    AU.playObjectiveCue(event, new THREE.Vector3(...objective.location.position));
  } else if (event.type === ObjectiveEvents.STARTED) {
    if (objective.type === ObjectiveTypes.DEFEND_POSITION) {
      waveDirector.setObjectivePressure(OBJECTIVE_CONFIG.defendPosition.pressureMultiplier);
    }
    refreshObjectiveHUD(objective);
  } else if (event.type === ObjectiveEvents.UPDATED) {
    if (objective.type === ObjectiveTypes.DEFEND_POSITION) {
      environment.setDefenseArea(objective.location.position, OBJECTIVE_CONFIG.defendPosition.radius, true, objective.progress / objective.target);
    }
    refreshObjectiveHUD(objective);
  } else if (event.type === ObjectiveEvents.COMPLETED) {
    const definition = objective.type === ObjectiveTypes.RESTORE_POWER
      ? OBJECTIVE_CONFIG.restorePower
      : objective.type === ObjectiveTypes.DEFEND_POSITION
        ? OBJECTIVE_CONFIG.defendPosition
        : OBJECTIVE_CONFIG.supplyCache;
    const supply = objective.type === ObjectiveTypes.SUPPLY_CACHE ? perkManager.getSupplyMultipliers() : { credits: 1 };
    const reward = economy.reward(definition.rewardCredits * supply.credits, 'objective');
    economy.earn(reward, `objective:${objective.type}`);
    let rewardText = `+${reward} C`;
    if (objective.type === ObjectiveTypes.SUPPLY_CACHE) {
      const resources = giveSupplyCacheResources();
      rewardText += ` · +${resources.health} SALUD · +${resources.ammo} MUNICIÓN`;
    }
    clearObjectiveEffects(objective, false);
    interaction.cancelHold({ reset: true });
    showBanner('OBJETIVO COMPLETADO');
    showToast(rewardText);
    hud.showObjective({ title: 'OBJETIVO COMPLETADO', detail: objective.location.label, progress: 1, time: null });
    AU.playObjectiveCue(event, new THREE.Vector3(...objective.location.position));
  } else if (event.type === ObjectiveEvents.FAILED) {
    clearObjectiveEffects(objective, false);
    interaction.cancelHold({ reset: true });
    showToast(objective.type === ObjectiveTypes.SUPPLY_CACHE ? 'LOS SUMINISTROS EXPIRARON' : 'OPORTUNIDAD PERDIDA');
    hud.showObjective({ title: 'OBJETIVO PERDIDO', detail: 'LA PARTIDA CONTINÚA', showProgress: false, time: null });
    AU.playObjectiveCue(event);
  } else if (event.type === ObjectiveEvents.ENDED) {
    clearObjectiveEffects(objective, true);
    hud.hideObjective();
  }
}

objectiveDirector = new ObjectiveDirector({
  config: OBJECTIVE_CONFIG,
  onEvent: handleObjectiveEvent,
  getCandidates: type => OBJECTIVE_CONFIG.locations[type] || [],
  isCandidateAvailable: (location, snapshot, type) => objectiveLocationAvailable(location, type)
});

function handleWaveEvent(event) {
  AU.playWaveCue(event);
  if (event.type === WaveEvents.PRESSURE_CHANGED) perkManager.onWavePhaseChanged(event.phase);
  if (event.type === WaveEvents.WAVE_PREPARE) {
    lastPrepareSec = -1;
    showBanner(event.nextWave === 1 ? 'PREPÁRATE' : `OLEADA ${event.nextWave} EN CAMINO`);
    if (event.nextWave > 1) openPerkOffer(event.nextWave - 1);
  } else if (event.type === WaveEvents.WAVE_STARTED) {
    wave = event.wave;
    refreshStats();
    grantWaveSupplies(wave);
    const isBoss = wave % 5 === 0;
    showBanner(isBoss ? `¡ALERTA: OLEADA TITÁN ${wave}!` : `OLEADA ${wave}`, isBoss);
    waveMessageTimer = 2.4;
    objectiveOfferDelay = 4.2;
  } else if (event.type === WaveEvents.WAVE_PEAK) {
    showBanner('¡LA HORDA SE ACERCA!', true);
    waveMessageTimer = 1.7;
  } else if (event.type === WaveEvents.WAVE_COMPLETED) {
    objectiveOfferDelay = -1;
    objectiveDirector.onWaveCompleted();
    const reward = economy.waveReward(event.wave, waveDirector.totalBudget);
    economy.earn(reward, `wave:${event.wave}`);
    showBanner(`¡OLEADA ${event.wave} SUPERADA!`);
    showToast(`BONO DE OLEADA +${reward} C`);
    waveMessageTimer = WAVE_CONFIG.completeDuration;
  }
}

const waveDirector = new WaveDirector({
  config: WAVE_CONFIG,
  onEvent: handleWaveEvent,
  onSpawn: spawnDirectedEnemy
});

function updateWave(dt) {
  let closeThreat = 0;
  let distantZombies = 0;
  for (const zombie of zombies) {
    if (!zombie.active || zombie.state === ZombieStates.DEAD) continue;
    const distance = Math.hypot(zombie.pos.x - playerPos.x, zombie.pos.z - playerPos.z);
    if (distance < 12) closeThreat += WAVE_CONFIG.threatCosts[zombie.type] || 1;
    else if (distance > 15) distantZombies++;
  }
  recentDamagePressure = Math.max(0, recentDamagePressure - dt * 0.18);
  waveDirector.update(dt, { alive: aliveCount, closeThreat, recentDamage: recentDamagePressure });

  if (objectiveOfferDelay >= 0) {
    objectiveOfferDelay -= dt;
    if (objectiveOfferDelay <= 0) {
      const absurdPressure = waveDirector.intensity > OBJECTIVE_CONFIG.maxStartIntensity || hp <= CFG.hpMax * 0.28;
      if (absurdPressure && waveDirector.phase !== WavePhases.RECOVERY) objectiveOfferDelay = 1.6;
      else {
        objectiveOfferDelay = -1;
        objectiveDirector.onWaveStarted({ wave, intensity: waveDirector.intensity, phase: waveDirector.phase });
      }
    }
  }

  if (waveDirector.phase === WavePhases.PREPARE) {
    const seconds = Math.max(1, Math.ceil(waveDirector.phaseTime));
    if (seconds !== lastPrepareSec) {
      lastPrepareSec = seconds;
      showBanner(waveDirector.nextWave === 1 ? `INICIO EN ${seconds}...` : `OLEADA ${waveDirector.nextWave} EN ${seconds}...`);
    }
  } else if (waveMessageTimer > 0) {
    waveMessageTimer -= dt;
    if (waveMessageTimer <= 0) hideBanner();
  }

  ambientUpdateTimer -= dt;
  if (ambientUpdateTimer <= 0) {
    ambientUpdateTimer = AUDIO_CONFIG.ambience.updateInterval;
    AU.updateAtmosphere({
      phase: waveDirector.phase,
      intensity: waveDirector.intensity,
      activeZombies: aliveCount,
      distantZombies
    });
  }
}

// ============================================================================
// INTELIGENCIA Y MOVIMIENTO DE ZOMBIS
// ============================================================================
function updateZombies(dt) {
  zombieManager.update(dt, tNow);
  for (let i = 0; i < ZMAX; i++) {
    const z = zombies[i];
    if (!z.active) continue;
    writeZombie(i, z);
  }

  torsoIM.instanceMatrix.needsUpdate = true;
  headIM.instanceMatrix.needsUpdate = true;
  eyesIM.instanceMatrix.needsUpdate = true;
  armsIM.instanceMatrix.needsUpdate = true;
  legsIM.instanceMatrix.needsUpdate = true;
  shadowIM.instanceMatrix.needsUpdate = true;
  aiDebug.update();
}

function damagePlayer(dmg, sourcePosition = null) {
  if (!gameState.is(GameStates.PLAYING)) return;
  hp = Math.max(0, hp - dmg);
  if (hp > 0 && perkManager.onPlayerDamaged({ healthRatio: hp / Math.max(1, CFG.hpMax) })) {
    showToast('SEGUNDO AIRE');
  }
  recentDamagePressure = Math.min(1, recentDamagePressure + dmg / Math.max(1, CFG.hpMax) * 1.8);
  refreshVitals();
  sfxHurt();
  shakeAmp = Math.min(0.25, shakeAmp + 0.15);
  if (dmg >= OBJECTIVE_CONFIG.strongDamageInterrupt && interaction.interruptHold()) {
    showToast('INTERACCIÓN INTERRUMPIDA');
  }

  hud.flashDamage(EFFECTS_CONFIG.damage.flashOpacity);
  if (sourcePosition) {
    const dx = sourcePosition.x - playerPos.x;
    const dz = sourcePosition.z - playerPos.z;
    const invLength = 1 / Math.max(0.001, Math.hypot(dx, dz));
    const dirX = dx * invLength;
    const dirZ = dz * invLength;
    const forwardX = -Math.sin(lookEuler.y);
    const forwardZ = -Math.cos(lookEuler.y);
    const rightX = Math.cos(lookEuler.y);
    const rightZ = -Math.sin(lookEuler.y);
    const relativeAngle = Math.atan2(dirX * rightX + dirZ * rightZ, dirX * forwardX + dirZ * forwardZ);
    effects.showDamageDirection(relativeAngle, dmg / Math.max(1, CFG.hpMax));
  }

  if (hp <= 0) die();
}

function die() {
  objectiveDirector.fail('game-over');
  game.setState(GameStates.GAME_OVER);
  interaction.reset();
  AU.reset();
  deathT = 0;
  deathRoll = (Math.random() < 0.5 ? -1 : 1) * rand(0.28, 0.45);
  AU.tone({ wave: 'sawtooth', f: 120, fEnd: 30, vol: 0.8, dur: 1.2 });

  if (controls.isLocked) {
    try { controls.unlock(); } catch (e) {}
  }

  if (wave > bestWave) {
    bestWave = wave;
    try { localStorage.setItem('bc_best_wave', bestWave.toString()); } catch (e) {}
  }

  const perkCount = perkManager.getOwned().reduce((total, perk) => total + perk.stacks, 0);
  hud.showGameOver({ wave, kills, bestWave, economy: economy.snapshot(), objectives: objectiveDirector.stats, perks: perkCount });
}

// ============================================================================
// GESTIÓN DE ARMAS Y DISPARO
// ============================================================================
function tryFire() {
  if (!gameState.is(GameStates.PLAYING) || reloading || fireCd > 0) return;
  const w = weaponStats[currentWeapon];
  const a = weapons[currentWeapon];
  if (!w || !a) return;

  if (a.mag <= 0) {
    if (tNow - (weapons._lastDry || 0) > 0.3) {
      weapons._lastDry = tNow;
      AU.burst({ f: 3800, fEnd: 1900, q: 4.0, vol: 0.35, dur: 0.05 });
      if (a.reserve > 0) tryReload();
    }
    return;
  }

  a.mag--;
  fireCd = w.rate;
  const shotModifiers = perkManager.getShotModifiers({ isLastRound: a.mag === 0 });
  sfxShoot(w.id);
  zombieManager.emitNoise(
    playerPos,
    (AI_CONFIG.noise.gunshots[w.id] || 24) * perkManager.getModifier('weapon.gunshotNoise'),
    NoiseTypes.GUNSHOT,
    tNow
  );
  effects.triggerShot(w.id, perkManager.getModifier('weapon.recoil'));
  shakeAmp = Math.min(0.22, shakeAmp + w.kick * 0.45);

  // Disparar perdigones/balas
  const count = w.pellets || 1;
  for (let i = 0; i < count; i++) {
    castPellet(w, shotModifiers);
  }

  refreshWeaponHUD();
  updateWeaponBarUI();
}

function tryReload() {
  if (reloading || !gameState.is(GameStates.PLAYING)) return;
  const w = weaponStats[currentWeapon];
  const a = weapons[currentWeapon];
  if (!w || !a) return;
  if (a.mag >= w.magSize || (a.reserve <= 0 && a.reserve !== Infinity)) return;

  reloading = true;
  reloadT = w.reloadTime / perkManager.getModifier('weapon.reloadSpeed');
  sfxReload();
  showToast('RECARGANDO...');
}

function switchWeapon(id) {
  if (!unlockedWeapons[id] || currentWeapon === id || !gameState.is(GameStates.PLAYING)) return;
  currentWeapon = id;
  reloading = false;
  setVMCurrent();
  sfxSwitch();
  refreshWeaponHUD();
  updateWeaponBarUI();
  interaction.refreshPrompt();
}

function cycleWeapon() {
  const list = Object.keys(WEAPONS).filter(k => unlockedWeapons[k]);
  if (list.length <= 1) return;
  const idx = list.indexOf(currentWeapon);
  switchWeapon(list[(idx + 1) % list.length]);
}

// ============================================================================
// HUD Y ACTUALIZACIONES DE UI
// ============================================================================
function refreshVitals() {
  hud.refreshVitals(hp, CFG.hpMax);
}

function refreshStats() {
  hud.refreshStats(wave, kills);
}

function refreshWeaponHUD() {
  const w = weaponStats[currentWeapon];
  const a = weapons[currentWeapon];
  hud.refreshWeapon(w, a, reloading, economy.getWeaponLevel(currentWeapon));
}

function updateWeaponBarUI() {
  hud.updateWeaponBar(WEAPONS, unlockedWeapons, weapons, currentWeapon);
}

function showBanner(text, isDanger = false) {
  hud.showBanner(text, isDanger);
}
function hideBanner() { hud.hideBanner(); }

function showToast(text) {
  hud.showToast(text);
}

function syncPerkModifiers({ rebuildWeapons = true } = {}) {
  economy.setModifiers({
    stationCost: perkManager.getModifier('economy.stationCost'),
    upgradeCost: perkManager.getModifier('economy.upgradeCost'),
    objectiveReward: perkManager.getModifier('economy.objectiveReward'),
    dangerousReward: perkManager.getModifier('economy.dangerousReward')
  });
  dropDirector.setModifiers({
    chance: perkManager.getModifier('drops.chance'),
    needWeight: perkManager.getModifier('drops.needWeight'),
    precisionChance: 0
  });
  if (rebuildWeapons) rebuildAllWeaponStats();
  interaction?.refreshPrompt();
}

function openPerkOffer(completedWave) {
  const offer = perkManager.createOffer(completedWave);
  if (!offer) return false;
  perkChoiceLocked = false;
  input.resetTransient();
  interaction.reset();
  game.setState(GameStates.PERK_SELECT);
  if (controls.isLocked) {
    try { controls.unlock(); } catch (error) {}
  }
  hud.showPerkOffer(offer.map(definition => ({
    ...definition,
    currentStacks: perkManager.getStack(definition.id)
  })));
  return true;
}

function choosePerk(index) {
  if (!gameState.is(GameStates.PERK_SELECT) || perkChoiceLocked) return false;
  const perk = perkManager.select(index);
  if (!perk) return false;
  perkChoiceLocked = true;
  syncPerkModifiers();
  hud.updatePerkList(perkManager.getOwned());
  hud.confirmPerkChoice(index);
  refreshWeaponHUD();
  updateWeaponBarUI();
  sfxPerkChoice();
  showToast(`${perk.name}${perk.maxStacks > 1 ? ` ${perk.stacks}/${perk.maxStacks}` : ''}`);
  clearTimeout(perkChoiceTimer);
  perkChoiceTimer = setTimeout(() => {
    if (!gameState.is(GameStates.PERK_SELECT)) return;
    hud.hidePerkOffer();
    game.setState(GameStates.PLAYING);
    input.resetTransient();
    AU.resume();
    if (!IS_TOUCH) {
      try { controls.lock(); } catch (error) {}
    }
  }, 240);
  return true;
}

function handlePerkOptionClick(event) {
  const card = event.target.closest('.perk-card');
  if (!card) return;
  choosePerk(Number(card.dataset.perkIndex));
}

// ============================================================================
// CONTROLES Y ENTRADAS (PC Y MÓVIL)
// ============================================================================
function resetWorld() {
  clearTimeout(perkChoiceTimer);
  perkChoiceTimer = 0;
  perkChoiceLocked = false;
  hud.resetTransientEffects();
  input.resetTransient();
  hp = CFG.hpMax; stamina = CFG.stamMax; exhausted = false;
  playerPos.set(0, 0, 23);
  velX = 0; velZ = 0; bobPhase = 0; bobAmt = 0; stepAcc = 0;
  playerY = 0; verticalVel = 0; grounded = true;
  isSprinting = false; moveIntensity = 0;
  wave = 0; kills = 0; aliveCount = 0;
  recentDamagePressure = 0; waveMessageTimer = 0; lastPrepareSec = -1; ambientUpdateTimer = 0; perkBuffHudTimer = 0;
  objectiveOfferDelay = -1;
  visualQuality = 1;
  reloading = false; reloadT = 0; fireCd = 0;
  shakeAmp = 0; deathT = 0; deathRoll = 0; tNow = 0;
  lookImpulseX = 0; lookImpulseY = 0;
  effects.reset();
  environment.reset();

  economy.reset();
  dropDirector.reset(1);
  perkManager.reset((PERK_CONFIG.seedBase ^ (Date.now() >>> 0) ^ (++perkRunSequence * 7919)) >>> 0);
  syncPerkModifiers();

  unlockedWeapons = { pistol: true };
  weapons = {};
  for (const id in weaponStats) {
    weapons[id] = { mag: weaponStats[id].magSize, reserve: weaponStats[id].reserveStart };
  }
  currentWeapon = 'pistol';

  routeDoorOpen = false;
  routeDoorOpenProgress = 0;
  routeDoor.visible = true;
  routeDoor.position.y = INTERACTION_CONFIG.routeDoor.position[1];
  routeDoorObstacle.active = true;
  if (!shootables.includes(routeDoor)) shootables.push(routeDoor);

  for (let i = 0; i < ZMAX; i++) deactivateZombie(i);
  zombieManager.reset();
  waveDirector.reset();
  spawnDirector.reset();
  objectiveDirector.reset();
  AU.reset();
  for (const pickup of pickupsArr) removePickup(pickup);
  while (projectiles.length) scene.remove(projectiles.pop().mesh);
  for (const tracer of tracers) { tracer.life = 0; tracer.mesh.visible = false; }
  for (const particle of particles) { particle.life = 0; particle.mesh.visible = false; }

  setVMCurrent();
  interaction.reset();
  zombieManager.navigation.rebuild();
  refreshVitals();
  refreshStats();
  hud.refreshCredits(economy.credits);
  hud.updatePerkList([]);
  hud.showActiveBuffs([]);
  refreshWeaponHUD();
  updateWeaponBarUI();

  camera.position.set(0, CFG.eyeH, 23);
  lookEuler.set(0, 0, 0);
  targetLookEuler.set(0, 0, 0);
  displayEuler.set(0, 0, 0);
  camera.quaternion.setFromEuler(lookEuler);
  camera.fov = CFG.fovBase;
  camera.updateProjectionMatrix();
  vmRoot.position.set(VM_BASE_X, VM_BASE_Y, VM_BASE_Z);
  vmRoot.rotation.set(0, 0, 0);
  dom.crosshair.style.setProperty('--crosshair-gap', '5px');
}

function beginPlay() {
  AU.init(); AU.resume();
  resetWorld();
  game.setState(GameStates.PLAYING);

  hud.showGameplay();

  if (!IS_TOUCH) {
    try { controls.lock(); } catch (e) {}
  }
  waveDirector.start(1);
}

function pauseGame() {
  if (!gameState.is(GameStates.PLAYING)) return;
  game.setState(GameStates.PAUSED);
  interaction.reset();
  input.resetTransient();
  AU.suspend();
  hud.updatePerkList(perkManager.getOwned());
  hud.showPause();
}

function resumeGame() {
  AU.init(); AU.resume();
  hud.hidePause();
  game.setState(GameStates.PLAYING);
  if (!IS_TOUCH) {
    try { controls.lock(); } catch (e) {}
  }
}

// Eventos UI
dom.btnPlay.addEventListener('click', () => beginPlay());
dom.btnRetry.addEventListener('click', () => beginPlay());
dom.btnResume.addEventListener('click', () => resumeGame());

controls.addEventListener('unlock', () => {
  if (gameState.is(GameStates.PLAYING) && !IS_TOUCH) pauseGame();
});

function applyLook(yawDelta, pitchDelta) {
  targetLookEuler.y -= yawDelta;
  targetLookEuler.x = clamp(targetLookEuler.x - pitchDelta, -1.45, 1.45);
  lookImpulseX = clamp(lookImpulseX + yawDelta, -0.08, 0.08);
  lookImpulseY = clamp(lookImpulseY + pitchDelta, -0.08, 0.08);
}

let sensitivityMultiplier = 1;
try { sensitivityMultiplier = clamp(Number(localStorage.getItem('bc_mouse_sensitivity')) || 1, 0.5, 2); } catch (error) {}

const input = new InputManager({
  dom,
  controls,
  isTouch: IS_TOUCH,
  mouseSensitivity: CFG.mouseSense,
  touchSensitivity: CFG.touchSense,
  sensitivityInputs: document.querySelectorAll('.sensitivity-slider'),
  sensitivityMultiplier,
  onSensitivityChange: value => {
    try { localStorage.setItem('bc_mouse_sensitivity', value.toString()); } catch (error) {}
  },
  isGameplayActive: () => gameState.is(GameStates.PLAYING),
  onUserGesture: () => { AU.init(); AU.resume(); },
  onLook: applyLook,
  onFire: tryFire,
  onReload: tryReload,
  onCycleWeapon: cycleWeapon,
  onSelectWeapon: switchWeapon,
  onInteractStart: () => interaction.begin(),
  onInteractEnd: () => interaction.end(),
  onPause: pauseGame,
  onToggleFlashlight: () => { flash.visible = !flash.visible; },
  isPerkSelectionActive: () => gameState.is(GameStates.PERK_SELECT),
  onPerkChoice: choosePerk
});
input.attach();
dom.perkOptions.addEventListener('click', handlePerkOptionClick);

function handleVisibilityChange() {
  if (document.hidden) {
    input.resetTransient();
    AU.suspend();
  } else if (gameState.is(GameStates.PLAYING)) {
    AU.resume();
  }
}

document.addEventListener('visibilitychange', handleVisibilityChange);

// ============================================================================
// BUCLE PRINCIPAL DE JUEGO (SIMULACIÓN FIJA + RENDERIZADO)
// ============================================================================
function fixedUpdate(dt) {
  tNow += dt;
  perkManager.update(dt);
  perkBuffHudTimer -= dt;
  if (perkBuffHudTimer <= 0) {
    perkBuffHudTimer = 0.1;
    hud.showActiveBuffs(perkManager.getActiveBuffs());
  }

  // Movimiento sincronizado con la cámara
  const sinY = Math.sin(lookEuler.y);
  const cosY = Math.cos(lookEuler.y);
  const fwdX = -sinY, fwdZ = -cosY;
  const rgtX = cosY, rgtZ = -sinY;

  let moveDirX = 0, moveDirZ = 0;
  if (input.isDown('KeyW') || input.isDown('ArrowUp')) { moveDirX += fwdX; moveDirZ += fwdZ; }
  if (input.isDown('KeyS') || input.isDown('ArrowDown')) { moveDirX -= fwdX; moveDirZ -= fwdZ; }
  if (input.isDown('KeyD') || input.isDown('ArrowRight')) { moveDirX += rgtX; moveDirZ += rgtZ; }
  if (input.isDown('KeyA') || input.isDown('ArrowLeft')) { moveDirX -= rgtX; moveDirZ -= rgtZ; }

  if (IS_TOUCH) {
    moveDirX += rgtX * input.joyX + fwdX * input.joyY;
    moveDirZ += rgtZ * input.joyX + fwdZ * input.joyY;
  }

  const moveMag = Math.hypot(moveDirX, moveDirZ);
  if (moveMag > 0.001) {
    moveDirX /= Math.max(1, moveMag);
    moveDirZ /= Math.max(1, moveMag);
  }

  const isMoving = moveMag > 0.12;
  const wantSprint = (input.isDown('ShiftLeft') || input.isDown('ShiftRight') || input.sprintTouch) && isMoving && !exhausted;
  isSprinting = wantSprint && stamina > 0;

  if (isSprinting) {
    stamina = Math.max(0, stamina - CFG.stamDrain * dt);
    if (stamina === 0) exhausted = true;
  } else if (stamina < CFG.stamMax) {
    stamina = Math.min(CFG.stamMax, stamina + CFG.stamRegen * perkManager.getModifier('player.staminaRegen') * dt);
    if (exhausted && stamina >= CFG.stamUnlockAt) exhausted = false;
  }
  hud.setStamina(stamina, CFG.stamMax);

  const moveSpeed = (isSprinting ? CFG.sprint : CFG.walk) * perkManager.getModifier('player.movementSpeed');
  const acceleration = isMoving ? CFG.accel * perkManager.getModifier('player.acceleration') : CFG.decel;
  const response = dampFactor(acceleration, dt) * (grounded ? 1 : CFG.airControl);
  velX = lerp(velX, moveDirX * moveSpeed, response);
  velZ = lerp(velZ, moveDirZ * moveSpeed, response);

  const desiredX = playerPos.x + velX * dt;
  const desiredZ = playerPos.z + velZ * dt;
  const nextPos = collideCircle(desiredX, desiredZ, CFG.pRadius);
  if (Math.abs(nextPos.x - desiredX) > 0.001) velX = 0;
  if (Math.abs(nextPos.z - desiredZ) > 0.001) velZ = 0;
  playerPos.x = nextPos.x;
  playerPos.z = nextPos.z;

  if (grounded && input.consumePressed('Space')) {
    grounded = false;
    verticalVel = CFG.jumpSpeed;
  }
  if (!grounded) {
    verticalVel -= CFG.gravity * dt;
    playerY += verticalVel * dt;
    if (playerY <= 0) {
      playerY = 0;
      verticalVel = 0;
      grounded = true;
    }
  }

  const horizontalSpeed = Math.hypot(velX, velZ);
  moveIntensity = lerp(moveIntensity, clamp(horizontalSpeed / CFG.sprint, 0, 1), dampFactor(10, dt));

  // Pasos audibles y bobbing
  if (isMoving && grounded) {
    stepAcc += dt * (isSprinting ? 1.65 : 1) * 3;
    if (stepAcc >= Math.PI) {
      stepAcc -= Math.PI;
      sfxStep(isSprinting ? 0.35 : 0.2);
      zombieManager.emitNoise(
        playerPos,
        (isSprinting ? AI_CONFIG.noise.footsteps.sprint : AI_CONFIG.noise.footsteps.walk) * perkManager.getModifier('player.footstepNoise'),
        NoiseTypes.PLAYER_ACTION,
        tNow
      );
    }
    bobPhase += dt * (isSprinting ? 13 : 9);
    bobAmt = lerp(bobAmt, isSprinting ? 0.045 : 0.025, dampFactor(8, dt));
  } else {
    bobAmt = lerp(bobAmt, 0, dampFactor(10, dt));
  }

  if (input.triggerDown && weaponStats[currentWeapon].auto) tryFire();
  if (fireCd > 0) fireCd -= dt;

  if (reloading) {
    reloadT -= dt;
    if (reloadT <= 0) {
      reloading = false;
      const w = weaponStats[currentWeapon];
      const a = weapons[currentWeapon];
      const need = w.magSize - a.mag;
      const take = a.reserve === Infinity ? need : Math.min(need, a.reserve);
      a.mag += take;
      if (a.reserve !== Infinity) a.reserve -= take;
      refreshWeaponHUD();
      updateWeaponBarUI();
    }
  }

  updateWave(dt);
  objectiveDirector.update(dt, { insideObjective: isInsideDefense() });
  updateZombies(dt);
  updateProjectiles(dt);
  updatePickups(dt);
  checkPickups();
  updateTracers(dt);
  updateParticles(dt);
}

function updateObjectiveMarker() {
  const objective = objectiveDirector.current;
  const visibleState = objectiveDirector.state === ObjectiveStates.ANNOUNCING || objectiveDirector.state === ObjectiveStates.ACTIVE;
  if (!objective || !visibleState) {
    hud.updateObjectiveMarker({ visible: false });
    return;
  }
  objectiveMarkerPosition.set(
    objective.location.position[0],
    (objective.location.position[1] || 0) + (objective.type === ObjectiveTypes.DEFEND_POSITION ? 0.35 : 1.2),
    objective.location.position[2]
  );
  objectiveMarkerDirection.copy(objectiveMarkerPosition).sub(camera.position);
  const distance = objectiveMarkerDirection.length();
  camera.getWorldDirection(objectiveMarkerForward);
  const behind = objectiveMarkerDirection.dot(objectiveMarkerForward) <= 0;
  objectiveMarkerNdc.copy(objectiveMarkerPosition).project(camera);
  if (behind) {
    objectiveMarkerNdc.x *= -1;
    objectiveMarkerNdc.y *= -1;
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const rawX = (objectiveMarkerNdc.x * 0.5 + 0.5) * width;
  const rawY = (-objectiveMarkerNdc.y * 0.5 + 0.5) * height;
  const margin = Math.min(74, width * 0.12);
  const x = clamp(rawX, margin, width - margin);
  const y = clamp(rawY, margin, height - margin);
  const onScreen = !behind && objectiveMarkerNdc.z > -1 && objectiveMarkerNdc.z < 1
    && Math.abs(objectiveMarkerNdc.x) < 0.82 && Math.abs(objectiveMarkerNdc.y) < 0.72;
  hud.updateObjectiveMarker({
    visible: distance > 3 && (!onScreen || distance > 16),
    x,
    y,
    angle: Math.atan2(y - centerY, x - centerX) + Math.PI * 0.5,
    distance,
    onScreen,
    icon: objectiveMarkerIcon(objective.type)
  });
}

function updatePresentation(dt) {
  if (dt <= 0) return;
  effects.update(dt, waveDirector.phase, waveDirector.intensity);
  environment.update(dt, waveDirector.phase, waveDirector.intensity);
  visualQuality = clamp(visualQuality + (dt > 0.032 ? -dt * 0.8 : dt * 0.14), 0.55, 1);

  const lookBlend = dampFactor(30, dt);
  lookEuler.x = lerp(lookEuler.x, targetLookEuler.x, lookBlend);
  lookEuler.y += shortestAngle(targetLookEuler.y - lookEuler.y) * lookBlend;

  const verticalBob = Math.sin(bobPhase * 2) * bobAmt;
  const horizontalBob = Math.cos(bobPhase) * bobAmt * 0.45;
  const sinY = Math.sin(lookEuler.y);
  const cosY = Math.cos(lookEuler.y);
  camera.position.set(
    playerPos.x + cosY * horizontalBob,
    CFG.eyeH + playerY + verticalBob,
    playerPos.z - sinY * horizontalBob
  );

  const shakePitch = Math.sin(tNow * 71) * shakeAmp * 0.12;
  const shakeYaw = Math.sin(tNow * 53 + 1.7) * shakeAmp * 0.09;
  displayEuler.set(
    lookEuler.x + effects.cameraPitch + shakePitch,
    lookEuler.y + effects.cameraYaw + shakeYaw,
    Math.sin(bobPhase) * bobAmt * 0.16 + effects.cameraRoll
  );
  camera.quaternion.setFromEuler(displayEuler);
  interaction.update(dt);
  updateObjectiveMarker();
  camera.getWorldDirection(audioForward);
  AU.updateListener(camera.position, audioForward, audioUp);

  const targetFov = isSprinting && grounded ? CFG.fovSprint : CFG.fovBase;
  const nextFov = lerp(camera.fov, targetFov, dampFactor(7, dt));
  if (Math.abs(nextFov - camera.fov) > 0.001) {
    camera.fov = nextFov;
    camera.updateProjectionMatrix();
  }

  const swayBlend = dampFactor(12, dt);
  const reloadDrop = reloading ? -0.035 : 0;
  const targetVmX = VM_BASE_X - lookImpulseX * 0.75 + velX * 0.0025;
  const targetVmY = VM_BASE_Y + lookImpulseY * 0.55 - verticalBob * 0.35 + reloadDrop - effects.weaponKick * 0.5;
  const targetVmZ = VM_BASE_Z + effects.weaponKick;
  vmRoot.position.x = lerp(vmRoot.position.x, targetVmX, swayBlend);
  vmRoot.position.y = lerp(vmRoot.position.y, targetVmY, swayBlend);
  vmRoot.position.z = lerp(vmRoot.position.z, targetVmZ, swayBlend);
  vmRoot.rotation.x = lerp(vmRoot.rotation.x, lookImpulseY * 0.7 + effects.weaponKick * 0.85, swayBlend);
  vmRoot.rotation.y = lerp(vmRoot.rotation.y, lookImpulseX * 0.55, swayBlend);
  vmRoot.rotation.z = lerp(vmRoot.rotation.z, -velX * 0.004 - horizontalBob * 0.5, swayBlend);

  const crosshairGap = 5 + moveIntensity * 4 + effects.crosshairBloom + effects.hitPulse;
  dom.crosshair.style.setProperty('--crosshair-gap', `${crosshairGap.toFixed(2)}px`);

  lookImpulseX = lerp(lookImpulseX, 0, dampFactor(11, dt));
  lookImpulseY = lerp(lookImpulseY, 0, dampFactor(11, dt));
  shakeAmp = lerp(shakeAmp, 0, dampFactor(8, dt));

  if (routeDoorOpen && routeDoorOpenProgress < 1) {
    routeDoorOpenProgress = Math.min(1, routeDoorOpenProgress + dt * 0.72);
    const eased = 1 - Math.pow(1 - routeDoorOpenProgress, 3);
    routeDoor.position.y = INTERACTION_CONFIG.routeDoor.position[1] + eased * 4.2;
    if (routeDoorOpenProgress >= 1) routeDoor.visible = false;
  }
}

function renderFrame() {
  world.render();
}

const game = new Game({
  state: gameState,
  fixedUpdate,
  update: updatePresentation,
  render: renderFrame,
  loopConfig: {
    fixedStep: CFG.fixedStep,
    maxDelta: CFG.maxDelta,
    maxSubSteps: CFG.maxSubSteps
  }
});

game.start();

function handleResize() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, environment.quality.maxPixelRatio, ENVIRONMENT_CONFIG.renderer.maxPixelRatio));
  world.resize();
}

function disposeGame() {
  clearTimeout(perkChoiceTimer);
  game.dispose();
  aiDebug.dispose();
  effects.dispose();
  environment.dispose();
  interaction.dispose();
  input.dispose();
  hud.dispose();
  AU.dispose();
  world.dispose();
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('pagehide', handlePageHide);
  window.removeEventListener('pageshow', handlePageShow);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  dom.perkOptions.removeEventListener('click', handlePerkOptionClick);
}

function handlePageHide(event) {
  if (event.persisted) {
    input.resetTransient();
    AU.suspend();
    return;
  }
  disposeGame();
}

function handlePageShow(event) {
  if (event.persisted) handleVisibilityChange();
}

window.addEventListener('resize', handleResize);
window.addEventListener('pagehide', handlePageHide);
window.addEventListener('pageshow', handlePageShow);
