/**
 * EL ABISMO 3D: DEEPCORE PROTOCOL
 * Entidades: Buzos con Recogida de Suministros, Mejoras, Linternas e IA Optimizada
 */

const NAV_NODES = {
  COMMAND_CENTER: { id: 'COMMAND_CENTER', x: 480, y: 120, neighbors: ['DOOR_CMD_MOON'] },
  DOOR_CMD_MOON:  { id: 'DOOR_CMD_MOON',  x: 480, y: 210, neighbors: ['COMMAND_CENTER', 'MOON_CENTER'] },
  MOON_CENTER:    { id: 'MOON_CENTER',    x: 480, y: 315, neighbors: ['DOOR_CMD_MOON', 'DOOR_MOON_OXY', 'DOOR_MOON_REACT', 'DOOR_MOON_AIR'] },

  DOOR_MOON_OXY:  { id: 'DOOR_MOON_OXY',  x: 300, y: 315, neighbors: ['MOON_CENTER', 'OXYGEN_CENTER'] },
  OXYGEN_CENTER:  { id: 'OXYGEN_CENTER',  x: 170, y: 315, neighbors: ['DOOR_MOON_OXY', 'DOOR_OXY_AIR'] },
  DOOR_OXY_AIR:   { id: 'DOOR_OXY_AIR',   x: 190, y: 420, neighbors: ['OXYGEN_CENTER', 'AIRLOCK_CENTER'] },

  DOOR_MOON_REACT:{ id: 'DOOR_MOON_REACT',x: 660, y: 315, neighbors: ['MOON_CENTER', 'REACTOR_CENTER'] },
  REACTOR_CENTER: { id: 'REACTOR_CENTER', x: 780, y: 315, neighbors: ['DOOR_MOON_REACT', 'DOOR_REACT_AIR'] },
  DOOR_REACT_AIR: { id: 'DOOR_REACT_AIR', x: 750, y: 420, neighbors: ['REACTOR_CENTER', 'AIRLOCK_CENTER'] },

  DOOR_MOON_AIR:  { id: 'DOOR_MOON_AIR',  x: 480, y: 420, neighbors: ['MOON_CENTER', 'AIRLOCK_CENTER'] },
  AIRLOCK_CENTER: { id: 'AIRLOCK_CENTER', x: 480, y: 500, neighbors: ['DOOR_MOON_AIR', 'DOOR_OXY_AIR', 'DOOR_REACT_AIR'] }
};

function getNavPath(fromX, fromY, toX, toY) {
  let startNode = null;
  let minDistStart = Infinity;
  for (const k in NAV_NODES) {
    const n = NAV_NODES[k];
    const dist = Math.hypot(n.x - fromX, n.y - fromY);
    if (dist < minDistStart) {
      minDistStart = dist;
      startNode = n;
    }
  }

  let endNode = null;
  let minDistEnd = Infinity;
  for (const k in NAV_NODES) {
    const n = NAV_NODES[k];
    const dist = Math.hypot(n.x - toX, n.y - toY);
    if (dist < minDistEnd) {
      minDistEnd = dist;
      endNode = n;
    }
  }

  if (!startNode || !endNode || startNode === endNode) {
    return [{ x: toX, y: toY }];
  }

  const queue = [[startNode.id]];
  const visited = new Set([startNode.id]);
  let foundPath = null;

  while (queue.length > 0) {
    const path = queue.shift();
    const currentId = path[path.length - 1];

    if (currentId === endNode.id) {
      foundPath = path;
      break;
    }

    const neighbors = NAV_NODES[currentId].neighbors;
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push([...path, neighborId]);
      }
    }
  }

  if (!foundPath) {
    return [{ x: toX, y: toY }];
  }

  const waypoints = foundPath.map(id => ({ x: NAV_NODES[id].x, y: NAV_NODES[id].y }));
  waypoints.push({ x: toX, y: toY });
  return waypoints;
}

class Player3D {
  constructor(config, x, y, isAI = false, scene) {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.colorHex = config.id === 'bud' ? 0x00d2ff : 0xffb700;
    this.speed = config.id === 'bud' ? 1.85 : 2.0;
    this.repairSpeed = config.repairSpeed;
    this.drainSpeed = config.drainSpeed;
    this.isAI = isAI;
    this.scene = scene;

    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.angle = 0;
    this.targetAngle = 0;
    this.isInteracting = false;
    this.interactTarget = null;
    this.interactProgress = 0;
    this.walkAnimTime = 0;

    // Powerup activo
    this.powerupTimer = 0;
    this.activePowerup = null;

    // AI State
    this.aiPath = [];
    this.aiTarget = null;
    this.aiTask = 'IDLE';
    this.aiLockedTask = false;
    this.aiAnnounceTimer = 0;

    this.mesh = this.createDiverMesh();
    this.scene.add(this.mesh);
    this.update3DPosition();
  }

  createDiverMesh() {
    const diverGroup = new THREE.Group();

    const torsoGeo = new THREE.CylinderGeometry(0.48, 0.42, 1.15, 16);
    const suitMat = new THREE.MeshStandardMaterial({
      color: 0x162432,
      roughness: 0.5,
      metalness: 0.4
    });
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.y = 0.95;
    diverGroup.add(torso);

    const vestGeo = new THREE.CylinderGeometry(0.5, 0.44, 0.75, 16);
    const vestMat = new THREE.MeshStandardMaterial({
      color: this.colorHex,
      roughness: 0.3,
      metalness: 0.6
    });
    const vest = new THREE.Mesh(vestGeo, vestMat);
    vest.position.y = 1.05;
    diverGroup.add(vest);

    const tankGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.95, 12);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xd0d8e0, metalness: 0.85, roughness: 0.25 });
    const tankL = new THREE.Mesh(tankGeo, tankMat);
    tankL.position.set(-0.22, 1.05, -0.38);
    const tankR = new THREE.Mesh(tankGeo, tankMat);
    tankR.position.set(0.22, 1.05, -0.38);
    diverGroup.add(tankL);
    diverGroup.add(tankR);

    const collarGeo = new THREE.TorusGeometry(0.4, 0.08, 8, 16);
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xc8963e, metalness: 0.9, roughness: 0.3 });
    const collar = new THREE.Mesh(collarGeo, bronzeMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.5;
    diverGroup.add(collar);

    const helmetGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x223548, metalness: 0.7, roughness: 0.3 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.y = 1.8;
    diverGroup.add(helmet);

    const visorGeo = new THREE.SphereGeometry(0.32, 16, 16, 0, Math.PI);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x00f7ff,
      emissive: 0x00d2ff,
      emissiveIntensity: 0.8,
      roughness: 0.1
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.rotation.x = Math.PI / 2;
    visor.position.set(0, 1.8, 0.14);
    diverGroup.add(visor);

    const flashlight = new THREE.SpotLight(0xffffff, 2.2, 32, Math.PI / 4, 0.4, 1.0);
    flashlight.position.set(0, 1.85, 0.35);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(0, 0.5, 8);
    diverGroup.add(targetObj);
    flashlight.target = targetObj;
    diverGroup.add(flashlight);
    this.flashlight = flashlight;

    const diverLight = new THREE.PointLight(this.colorHex, 0.6, 6);
    diverLight.position.set(0, 1.5, 0);
    diverGroup.add(diverLight);

    return diverGroup;
  }

  update(dt, input, station, audio, world3D) {
    if (!this.isAI) {
      this.handlePlayerInput(dt, input);
    } else {
      this.handleAIBehavior(dt, station);
    }

    // Gestionar mejoras y powerups temporales
    if (this.powerupTimer > 0) {
      this.powerupTimer -= dt;
      if (this.powerupTimer <= 0) {
        this.activePowerup = null;
      }
    }

    // Comprobar recogida de cajas de suministros
    if (world3D && world3D.crateMeshes) {
      const cur3DX = (this.x - 480) * 0.1;
      const cur3DZ = (this.y - 320) * 0.1;
      world3D.crateMeshes.forEach(crate => {
        if (crate.active) {
          const dist = Math.hypot(crate.mesh.position.x - cur3DX, crate.mesh.position.z - cur3DZ);
          if (dist < 1.8) {
            crate.active = false;
            crate.mesh.visible = false;
            audio.playPowerup();

            if (crate.type === 'WELD') {
              this.activePowerup = 'SUPER_WELD';
              this.powerupTimer = 12000;
              station.triggerComms({
                speaker: this.name,
                role: 'Buzo Deepcore',
                color: this.colorHex,
                text: '¡Equipé el Soplete de Plasma Hiperbárico! Reparando al triple de velocidad.'
              });
            } else if (crate.type === 'BATTERY') {
              station.stabilizeReactor(40);
              station.triggerComms({
                speaker: this.name,
                role: 'Buzo Deepcore',
                color: this.colorHex,
                text: '¡Instalé una Célula de Uranio! Reactor restaurado +40% de energía.'
              });
            } else if (crate.type === 'O2') {
              station.restoreOxygen(40);
              station.triggerComms({
                speaker: this.name,
                role: 'Buzo Deepcore',
                color: this.colorHex,
                text: '¡Cargué un Tanque de Fluorocarbono! Oxígeno aumentado +40%.'
              });
            }

            // Reaparición de suministros tras 20 segundos
            setTimeout(() => {
              crate.active = true;
              crate.mesh.visible = true;
            }, 20000);
          }
        }
      });
    }

    const currentRoom = station.getRoomAt(this.x, this.y);
    const waterResistance = (currentRoom && currentRoom.waterLevel > 50) ? 0.68 : 0.80;
    this.vx *= waterResistance;
    this.vy *= waterResistance;

    const nextX = this.x + this.vx;
    const nextY = this.y + this.vy;

    if (station.isInsideWalkable(nextX, this.y, this.radius)) {
      this.x = nextX;
    } else {
      this.vx = 0;
    }

    if (station.isInsideWalkable(this.x, nextY, this.radius)) {
      this.y = nextY;
    } else {
      this.vy = 0;
    }

    if (Math.hypot(this.vx, this.vy) > 0.06) {
      this.targetAngle = Math.atan2(this.vy, this.vx);
      this.walkAnimTime += dt * 0.006;
    }

    let diff = this.targetAngle - this.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.angle += diff * 0.25;

    this.update3DPosition();
    this.handleInteraction(dt, station, audio);
  }

  update3DPosition() {
    if (!this.mesh) return;

    const target3DX = (this.x - 480) * 0.1;
    const target3DZ = (this.y - 320) * 0.1;

    this.mesh.position.x = target3DX;
    this.mesh.position.z = target3DZ;

    const speedLen = Math.hypot(this.vx, this.vy);
    const bob = Math.sin(this.walkAnimTime * 3.5) * (speedLen > 0.08 ? 0.08 : 0.03);
    this.mesh.position.y = bob;

    this.mesh.rotation.y = -this.angle + Math.PI / 2;
  }

  handlePlayerInput(dt, input) {
    let moveX = 0;
    let moveY = 0;

    if (input.up) moveY -= 1;
    if (input.down) moveY += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    const len = Math.hypot(moveX, moveY);
    if (len > 0) {
      moveX /= len;
      moveY /= len;
      const accel = (this.speed * 0.28) * (dt / 16);
      this.vx += moveX * accel;
      this.vy += moveY * accel;
    }

    this.isInteracting = !!input.interact;
  }

  handleAIBehavior(dt, station) {
    const crisis = station.getMostCriticalIssue(this.x, this.y);

    if (crisis) {
      this.aiTask = 'CRISIS';
      this.aiTarget = { x: crisis.x, y: crisis.y, type: 'CRISIS', room: crisis.room };
      this.aiLockedTask = true;
    } else {
      if (this.aiLockedTask) {
        if (this.aiTask === 'OXYGEN' && station.oxygen >= 90) {
          this.aiLockedTask = false;
        } else if (this.aiTask === 'PUMP' && station.waterTotal <= 8) {
          this.aiLockedTask = false;
        } else if (this.aiTask === 'REACTOR' && station.reactorEnergy >= 90) {
          this.aiLockedTask = false;
        } else if (this.aiTask === 'CRISIS') {
          this.aiLockedTask = false;
        }
      }

      if (!this.aiLockedTask) {
        if (station.oxygen < 65) {
          const oxyRoom = station.rooms['oxygen'];
          this.aiTask = 'OXYGEN';
          this.aiTarget = { x: oxyRoom.terminal.x, y: oxyRoom.terminal.y, type: 'OXYGEN' };
          this.aiLockedTask = true;
        } else if (station.waterTotal > 25) {
          const pumpRoom = station.rooms['airlock'];
          this.aiTask = 'PUMP';
          this.aiTarget = { x: pumpRoom.terminal.x, y: pumpRoom.terminal.y, type: 'PUMP' };
          this.aiLockedTask = true;
        } else if (station.reactorEnergy < 65) {
          const reactRoom = station.rooms['reactor'];
          this.aiTask = 'REACTOR';
          this.aiTarget = { x: reactRoom.terminal.x, y: reactRoom.terminal.y, type: 'REACTOR' };
          this.aiLockedTask = true;
        } else {
          const moonRoom = station.rooms['moonpool'];
          this.aiTask = 'NTI';
          this.aiTarget = { x: moonRoom.terminal.x, y: moonRoom.terminal.y, type: 'ABYSS_DOCK' };
          this.aiLockedTask = false;
        }
      }
    }

    if (this.aiTarget && (this.aiPath.length === 0 || Math.hypot(this.aiTarget.x - this.x, this.aiTarget.y - this.y) > 60)) {
      if (this.aiPath.length === 0) {
        this.aiPath = getNavPath(this.x, this.y, this.aiTarget.x, this.aiTarget.y);
      }

      this.aiAnnounceTimer += dt;
      if (this.aiAnnounceTimer > 7500) {
        this.aiAnnounceTimer = 0;
        let textMsg = '¡Compañero activo!';
        if (this.aiTask === 'CRISIS') textMsg = '¡Entendido! Voy a soldar la avería de inmediato.';
        if (this.aiTask === 'OXYGEN') textMsg = '¡Oxígeno bajo! Activando el compresor de O2.';
        if (this.aiTask === 'PUMP') textMsg = '¡Inundación detectada! Drenando agua en la bahía de achique.';
        if (this.aiTask === 'REACTOR') textMsg = '¡Refrigerando los núcleos del reactor térmico!';
        if (this.aiTask === 'NTI') textMsg = '¡Sistemas estables! Sintonizando con la criatura en la Piscina Lunar.';
        station.triggerComms({
          speaker: this.id === 'lindsey' ? 'Dra. Lindsey (IA)' : 'Bud Brigman (IA)',
          role: 'Compañero Autónomo',
          color: this.id === 'lindsey' ? '#ffb700' : '#00e5ff',
          text: textMsg
        });
      }
    }

    if (this.aiPath.length > 0) {
      const currentWP = this.aiPath[0];
      const dx = currentWP.x - this.x;
      const dy = currentWP.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 22) {
        this.aiPath.shift();
      } else {
        const accel = (this.speed * 0.28) * (dt / 16);
        this.vx += (dx / dist) * accel;
        this.vy += (dy / dist) * accel;
      }
    }

    if (this.aiTarget) {
      const distToFinal = Math.hypot(this.aiTarget.x - this.x, this.aiTarget.y - this.y);
      if (distToFinal < 55) {
        this.isInteracting = true;
        this.vx *= 0.6;
        this.vy *= 0.6;
      } else {
        this.isInteracting = false;
      }
    } else {
      this.isInteracting = false;
    }
  }

  handleInteraction(dt, station, audio) {
    if (!this.isInteracting) {
      this.interactProgress = 0;
      this.interactTarget = null;
      return;
    }

    const currentRoom = station.getRoomAt(this.x, this.y);
    const nearbyTerminal = station.getNearbyTerminal(this.x, this.y, 55);

    if (nearbyTerminal) {
      this.interactTarget = nearbyTerminal;
      const speedMult = (this.id === 'lindsey' ? 1.6 : 1.1);
      this.interactProgress += (dt / 1000) * speedMult;

      if (nearbyTerminal.type === 'OXYGEN') {
        audio.playOxygenFlow();
        station.restoreOxygen(dt * 0.065 * speedMult);
      } else if (nearbyTerminal.type === 'PUMP') {
        audio.playPump();
        station.drainAllRooms(dt * 0.085 * (this.id === 'bud' ? 1.1 : 1.5));
      } else if (nearbyTerminal.type === 'REACTOR') {
        audio.playOxygenFlow();
        station.stabilizeReactor(dt * 0.075);
      } else if (nearbyTerminal.type === 'ABYSS_DOCK') {
        audio.playNTIHarmonic();
        station.communeWithNTI(dt * 0.055);
      }
    } else if (currentRoom && currentRoom.activeCrisis) {
      const crisis = currentRoom.activeCrisis;
      const distToCrisis = Math.hypot(crisis.x - this.x, crisis.y - this.y);

      if (distToCrisis < 65) {
        const weldBoost = (this.activePowerup === 'SUPER_WELD') ? 3.0 : 1.0;
        const repairPower = (dt / 16) * this.repairSpeed * (this.id === 'bud' ? 2.0 : 1.3) * weldBoost;
        crisis.progress += repairPower;

        audio.playWeld();

        if (crisis.progress >= crisis.workRequired) {
          station.resolveCrisis(currentRoom);
          this.aiLockedTask = false;
        }
      }
    }
  }

  destroy() {
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
    }
  }
}

class NTICreature3D {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;

    this.mesh = new THREE.Group();
    this.mesh.position.set(0, -0.4, 0);

    const coreGeo = new THREE.SphereGeometry(1.5, 24, 24);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.6,
      transparent: true,
      opacity: 0.88,
      roughness: 0.05
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.mesh.add(this.core);

    const ntiLight = new THREE.PointLight(0x00f7ff, 1.8, 18);
    ntiLight.position.set(0, 0, 0);
    this.mesh.add(ntiLight);
    this.ntiLight = ntiLight;

    this.tentacles = [];
    const tentacleMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0088cc,
      transparent: true,
      opacity: 0.75,
      roughness: 0.15
    });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const tentGeo = new THREE.CylinderGeometry(0.16, 0.03, 3.2, 8);
      const tentMesh = new THREE.Mesh(tentGeo, tentacleMat);
      tentMesh.position.set(Math.cos(angle) * 0.9, -1.6, Math.sin(angle) * 0.9);
      this.mesh.add(tentMesh);
      this.tentacles.push({ mesh: tentMesh, baseAngle: angle });
    }

    this.scene.add(this.mesh);
  }

  update(dt) {
    this.time += dt * 0.0025;
    this.mesh.position.y = -0.4 + Math.sin(this.time * 2) * 0.35;
    this.core.scale.set(
      1 + Math.sin(this.time * 3) * 0.06,
      1 + Math.cos(this.time * 3) * 0.06,
      1 + Math.sin(this.time * 3) * 0.06
    );

    this.tentacles.forEach((t, i) => {
      t.mesh.rotation.z = Math.sin(this.time * 2.4 + i) * 0.22;
      t.mesh.rotation.x = Math.cos(this.time * 2.4 + i) * 0.22;
    });

    if (this.ntiLight) {
      this.ntiLight.intensity = 1.5 + Math.sin(this.time * 4) * 0.5;
    }
  }

  destroy() {
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
    }
  }
}
