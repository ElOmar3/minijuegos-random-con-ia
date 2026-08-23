/* ==========================================================================
   3D ANIMALS & PET COMPANION
   ========================================================================== */

import { scene } from './world.js';
import { ANIMALS } from './data.js';
import { sfxAnimal } from './audio.js';
import { countInv, getInvMax } from './state.js';

export const animalEntities = [];
let dogMesh, dogTail;
let dogTimer = 0;

export function initAnimals(g) {
  // Clear any existing
  animalEntities.forEach(a => scene.remove(a.mesh));
  animalEntities.length = 0;

  g.animals.forEach(a => {
    spawnAnimalMesh(a);
  });

  // Farm Dog (Max)
  dogMesh = new THREE.Group();
  const dogBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.7), new THREE.MeshLambertMaterial({ color: 0xc87d32 }));
  dogBody.position.y = 0.35;
  dogBody.castShadow = true;
  dogMesh.add(dogBody);

  const dogHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshLambertMaterial({ color: 0xc87d32 }));
  dogHead.position.set(0, 0.65, 0.35);
  dogMesh.add(dogHead);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), new THREE.MeshLambertMaterial({ color: 0x4e342e }));
  snout.position.set(0, 0.6, 0.55);
  dogMesh.add(snout);

  dogTail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), new THREE.MeshLambertMaterial({ color: 0xc87d32 }));
  dogTail.position.set(0, 0.5, -0.4);
  dogTail.rotation.x = -Math.PI / 4;
  dogMesh.add(dogTail);

  dogMesh.position.set(2, 0, 4);
  scene.add(dogMesh);
}

export function spawnAnimalMesh(a) {
  const mesh = new THREE.Group();

  if (a.type === 'chicken') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    body.position.y = 0.25;
    mesh.add(body);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 4), new THREE.MeshLambertMaterial({ color: 0xffa000 }));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.3, 0.22);
    mesh.add(beak);
  } else if (a.type === 'cow') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.2), new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }));
    body.position.y = 0.5;
    mesh.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0x212121 }));
    head.position.set(0, 0.8, 0.6);
    mesh.add(head);
  } else if (a.type === 'sheep') {
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    body.position.y = 0.45;
    mesh.add(body);
  } else { // Pig
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.9), new THREE.MeshLambertMaterial({ color: 0xf48fb1 }));
    body.position.y = 0.4;
    mesh.add(body);
  }

  mesh.position.set(a.x, 0, a.z);
  scene.add(mesh);
  animalEntities.push({ data: a, mesh });
}

export function updateAnimals(dt, g, playerPos) {
  // Update Pen Animals
  animalEntities.forEach(ent => {
    const a = ent.data;
    const def = ANIMALS[a.type];
    if (!def) return;

    a.timer += dt;
    if (a.timer >= def.rate) {
      a.timer = 0;
      if (countInv() < getInvMax()) {
        g.inventory[def.res] = (g.inventory[def.res] || 0) + 1;
        sfxAnimal();
      }
    }

    // Wander within pasture bounds
    if (Math.random() < 0.02) {
      a.tx = -11 + (Math.random() - 0.5) * 6;
      a.tz = 7 + (Math.random() - 0.5) * 6;
    }
    a.x += (a.tx - a.x) * 0.04;
    a.z += (a.tz - a.z) * 0.04;
    ent.mesh.position.set(a.x, 0, a.z);
  });

  // Dog Follows Player
  if (dogMesh) {
    dogTimer += dt;
    dogTail.rotation.z = Math.sin(dogTimer * 12) * 0.4;

    const dx = playerPos.x + 1.2 - dogMesh.position.x;
    const dz = playerPos.z + 1.2 - dogMesh.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 1.4) {
      dogMesh.position.x += (dx / dist) * 4.8 * dt;
      dogMesh.position.z += (dz / dist) * 4.8 * dt;
      dogMesh.rotation.y = Math.atan2(dx, dz);
    }
  }
}
