/* ==========================================================================
   3D PLAYER (FARMER), CONTROLS & CAMERA
   ========================================================================== */

import { scene, camera } from './world.js';

export const player = new THREE.Group();
let legL, legR, body, armR, toolWaterCan;
let walkCycle = 0;

// Input State
const keys = {};
let joyDir = { x: 0, y: 0 };

export function initPlayer() {
  // Body (Overalls)
  const bodyGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.9, 8);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1976D2 });
  body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.85;
  body.castShadow = true;
  player.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc80 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.5;
  player.add(head);

  // Straw Hat
  const hatBrimGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.05, 8);
  const hatMat = new THREE.MeshLambertMaterial({ color: 0xfbc02d });
  const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
  hatBrim.position.y = 1.68;
  player.add(hatBrim);

  const hatTopGeo = new THREE.ConeGeometry(0.35, 0.4, 8);
  const hatTop = new THREE.Mesh(hatTopGeo, hatMat);
  hatTop.position.y = 1.9;
  player.add(hatTop);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 6);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x0d47a1 });
  legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.2, 0.25, 0);
  player.add(legL);

  legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.2, 0.25, 0);
  player.add(legR);

  // Right Arm & Watering Can Tool
  armR = new THREE.Group();
  const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 6), new THREE.MeshLambertMaterial({ color: 0x1976D2 }));
  armMesh.position.y = -0.25;
  armR.add(armMesh);
  armR.position.set(0.42, 1.2, 0);

  // Hand tool (Watering can)
  toolWaterCan = new THREE.Group();
  const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.3, 6), new THREE.MeshLambertMaterial({ color: 0x4fc3f7 }));
  canBody.position.set(0, -0.4, 0.15);
  toolWaterCan.add(canBody);
  armR.add(toolWaterCan);
  player.add(armR);

  player.position.set(0, 0, 4);
  scene.add(player);

  setupControls();
}

function setupControls() {
  window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  // Virtual Joystick on Touch Devices
  const joyZone = document.getElementById('joystick-zone');
  const joyKnob = document.getElementById('joystick-knob');
  let touchId = null;

  if ('ontouchstart' in window) {
    if (joyZone) joyZone.style.display = 'block';
    const mobBtn = document.getElementById('btn-mobile-act');
    if (mobBtn) mobBtn.style.display = 'flex';
  }

  if (joyZone) {
    joyZone.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      touchId = t.identifier;
      handleJoy(t.clientX, t.clientY);
    });
    window.addEventListener('touchmove', e => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchId) handleJoy(t.clientX, t.clientY);
      }
    });
    window.addEventListener('touchend', e => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          joyDir = { x: 0, y: 0 };
          joyKnob.style.transform = 'translate(0px, 0px)';
          touchId = null;
        }
      }
    });
  }

  function handleJoy(cx, cy) {
    const rect = joyZone.getBoundingClientRect();
    const rx = cx - (rect.left + rect.width / 2);
    const ry = cy - (rect.top + rect.height / 2);
    const dist = Math.min(35, Math.hypot(rx, ry));
    const angle = Math.atan2(ry, rx);
    joyDir.x = (Math.cos(angle) * dist) / 35;
    joyDir.y = (Math.sin(angle) * dist) / 35;
    joyKnob.style.transform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`;
  }
}

export function updatePlayer(dt, activeTool) {
  // Show tool only when watering tool is active
  if (toolWaterCan) {
    toolWaterCan.visible = (activeTool === 'water');
  }

  let moveX = 0, moveZ = 0;
  if (keys['w'] || keys['arrowup']) moveZ -= 1;
  if (keys['s'] || keys['arrowdown']) moveZ += 1;
  if (keys['a'] || keys['arrowleft']) moveX -= 1;
  if (keys['d'] || keys['arrowright']) moveX += 1;

  if (joyDir.x !== 0 || joyDir.y !== 0) {
    moveX = joyDir.x;
    moveZ = joyDir.y;
  }

  const len = Math.hypot(moveX, moveZ);
  if (len > 0.05) {
    const spd = 6.2 * dt;
    player.position.x += (moveX / (len > 1 ? len : 1)) * spd;
    player.position.z += (moveZ / (len > 1 ? len : 1)) * spd;

    // World Boundaries
    player.position.x = Math.max(-24, Math.min(24, player.position.x));
    player.position.z = Math.max(-24, Math.min(24, player.position.z));

    player.rotation.y = Math.atan2(moveX, moveZ);

    // Walk Animation
    walkCycle += dt * 12;
    legL.rotation.x = Math.sin(walkCycle) * 0.6;
    legR.rotation.x = -Math.sin(walkCycle) * 0.6;
    armR.rotation.x = -Math.sin(walkCycle) * 0.5;
    body.position.y = 0.85 + Math.abs(Math.sin(walkCycle)) * 0.08;
  } else {
    legL.rotation.x = 0;
    legR.rotation.x = 0;
    armR.rotation.x = 0;
    body.position.y = 0.85;
  }

  // Smooth Camera Follow
  const targetCamX = player.position.x + 12;
  const targetCamY = 16;
  const targetCamZ = player.position.z + 14;
  camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.08);
  camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
}
