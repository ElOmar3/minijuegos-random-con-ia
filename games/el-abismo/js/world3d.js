/**
 * EL ABISMO 3D: DEEPCORE PROTOCOL
 * Generador 3D Detallado: Ambientación Rica, Seudópodo de Agua NTI, Cajas de Suministro y Cero Lag
 */

const TEXTURE_FACTORY = {
  _metalFloor: null,
  _hazardStripes: null,
  _wallPanel: null,
  _waterCaustics: null,
  _radarScreen: null,

  getMetalFloor() {
    if (this._metalFloor) return this._metalFloor;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#101d2a';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#223d56';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 252, 252);
    ctx.strokeRect(2, 2, 125, 125);
    ctx.strokeRect(129, 2, 125, 125);
    ctx.strokeRect(2, 129, 125, 125);
    ctx.strokeRect(129, 129, 125, 125);

    ctx.fillStyle = 'rgba(0, 240, 255, 0.06)';
    for (let x = 10; x < 250; x += 12) {
      for (let y = 10; y < 250; y += 12) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    ctx.fillStyle = '#3a5f82';
    const rivets = [
      [8, 8], [120, 8], [136, 8], [248, 8],
      [8, 120], [120, 120], [136, 120], [248, 120],
      [8, 136], [120, 136], [136, 136], [248, 136],
      [8, 248], [120, 248], [136, 248], [248, 248]
    ];
    rivets.forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    this._metalFloor = tex;
    return tex;
  },

  getHazardStripes() {
    if (this._hazardStripes) return this._hazardStripes;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffb700';
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#111822';
    const stripeW = 20;
    for (let x = -128; x < 256; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeW, 0);
      ctx.lineTo(x + stripeW - 128, 128);
      ctx.lineTo(x - 128, 128);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1);
    this._hazardStripes = tex;
    return tex;
  },

  getWallPanel() {
    if (this._wallPanel) return this._wallPanel;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#152535';
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#091520';
    ctx.fillRect(6, 6, 116, 54);
    ctx.fillRect(6, 68, 116, 54);

    ctx.strokeStyle = '#274866';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, 116, 54);
    ctx.strokeRect(6, 68, 116, 54);

    ctx.fillStyle = '#00f7ff';
    ctx.fillRect(10, 60, 108, 3);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this._wallPanel = tex;
    return tex;
  },

  getWaterCaustics() {
    if (this._waterCaustics) return this._waterCaustics;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#041628';
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 128, Math.random() * 128);
      ctx.bezierCurveTo(
        Math.random() * 128, Math.random() * 128,
        Math.random() * 128, Math.random() * 128,
        Math.random() * 128, Math.random() * 128
      );
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    this._waterCaustics = tex;
    return tex;
  },

  getRadarScreen() {
    if (this._radarScreen) return this._radarScreen;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#03141f';
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = '#00f7ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.arc(64, 64, 38, 0, Math.PI * 2);
    ctx.arc(64, 64, 20, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(64, 64, 3, 0, Math.PI * 2);
    ctx.arc(80, 50, 2.5, 0, Math.PI * 2);
    ctx.arc(45, 78, 2.5, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    this._radarScreen = tex;
    return tex;
  }
};

class World3D {
  constructor(scene) {
    this.scene = scene;
    this.roomMeshes = {};
    this.waterPlanes = {};
    this.terminals3D = {};
    this.crisisBeacons = {};
    this.interactiveRings = {};
    this.machineryFans = [];
    this.machineryRods = [];
    this.crateMeshes = [];
    this.bubbleParticles = null;
    this.waterCausticsTex = null;

    this.initLighting();
    this.buildStation();
    this.buildStationProps();
    this.initWaterPseudopod();
    this.initSupplyCrates();
    this.initPreallocatedCrisisBeacons();
    this.initBubbleSystem();
  }

  initLighting() {
    const ambientLight = new THREE.AmbientLight(0x0e2a44, 0.95);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 0.65);
    dirLight.position.set(0, 50, 15);
    this.scene.add(dirLight);

    const moonpoolLight = new THREE.PointLight(0x00ffff, 2.0, 40);
    moonpoolLight.position.set(0, 3.0, 0);
    this.scene.add(moonpoolLight);
    this.moonpoolLight = moonpoolLight;
  }

  buildStation() {
    const floorTex = TEXTURE_FACTORY.getMetalFloor();
    const hazardTex = TEXTURE_FACTORY.getHazardStripes();
    const wallTex = TEXTURE_FACTORY.getWallPanel();
    this.waterCausticsTex = TEXTURE_FACTORY.getWaterCaustics();

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.35,
      metalness: 0.65
    });

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.4,
      metalness: 0.5
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x003344,
      roughness: 0.2,
      metalness: 0.8
    });

    const wallHeight = 4.2;
    const wallThickness = 0.6;

    for (const key in CONSTANTS.ROOMS) {
      const r = CONSTANTS.ROOMS[key];
      const cx = (r.x + r.w / 2 - 480) * 0.1;
      const cz = (r.y + r.h / 2 - 320) * 0.1;
      const w = r.w * 0.1;
      const d = r.h * 0.1;

      const roomGroup = new THREE.Group();
      roomGroup.position.set(cx, 0, cz);

      const floorGeo = new THREE.BoxGeometry(w, 0.4, d);
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.y = -0.2;
      roomGroup.add(floorMesh);

      const edgeGeo = new THREE.BoxGeometry(w + 0.1, 0.05, d + 0.1);
      const edgeMesh = new THREE.Mesh(edgeGeo, trimMat);
      edgeMesh.position.y = 0.02;
      roomGroup.add(edgeMesh);

      if (r.id === 'moonpool') {
        const poolHoleGeo = new THREE.CylinderGeometry(4.4, 4.4, 5, 24);
        const poolHoleMat = new THREE.MeshStandardMaterial({
          color: 0x01060e,
          roughness: 0.2,
          metalness: 0.8
        });
        const poolHole = new THREE.Mesh(poolHoleGeo, poolHoleMat);
        poolHole.position.y = -2.5;
        roomGroup.add(poolHole);

        const waterGeo = new THREE.CircleGeometry(4.3, 24);
        const waterMat = new THREE.MeshStandardMaterial({
          map: this.waterCausticsTex,
          color: 0x00e5ff,
          emissive: 0x003344,
          transparent: true,
          opacity: 0.85,
          roughness: 0.1
        });
        const poolWater = new THREE.Mesh(waterGeo, waterMat);
        poolWater.rotation.x = -Math.PI / 2;
        poolWater.position.y = -0.1;
        roomGroup.add(poolWater);
      }

      // Plano de inundación optimizado
      const floodGeo = new THREE.PlaneGeometry(w - 0.4, d - 0.4);
      const floodMat = new THREE.MeshBasicMaterial({
        map: this.waterCausticsTex,
        color: 0x00aaff,
        transparent: true,
        opacity: 0.65
      });
      const floodMesh = new THREE.Mesh(floodGeo, floodMat);
      floodMesh.rotation.x = -Math.PI / 2;
      floodMesh.position.y = 0.05;
      floodMesh.visible = false;
      roomGroup.add(floodMesh);
      this.waterPlanes[r.id] = floodMesh;

      this.buildRoomWalls(roomGroup, w, d, wallHeight, wallThickness, wallMat, r.id);

      this.scene.add(roomGroup);
      this.roomMeshes[r.id] = roomGroup;

      if (r.terminal) {
        this.buildTerminal3D(r.terminal, cx, cz);
      }
    }

    for (const c of CONSTANTS.CORRIDORS) {
      const cx = (c.x + c.w / 2 - 480) * 0.1;
      const cz = (c.y + c.h / 2 - 320) * 0.1;
      const w = c.w * 0.1;
      const d = c.h * 0.1;

      const corrFloorGeo = new THREE.BoxGeometry(w, 0.38, d);
      const corrFloorMat = new THREE.MeshStandardMaterial({
        map: hazardTex,
        roughness: 0.4,
        metalness: 0.6
      });
      const corrMesh = new THREE.Mesh(corrFloorGeo, corrFloorMat);
      corrMesh.position.set(cx, -0.19, cz);
      this.scene.add(corrMesh);

      const beaconGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
      const b1 = new THREE.Mesh(beaconGeo, beaconMat);
      b1.position.set(cx - w / 2 + 0.35, 0.2, cz);
      const b2 = new THREE.Mesh(beaconGeo, beaconMat);
      b2.position.set(cx + w / 2 - 0.35, 0.2, cz);
      this.scene.add(b1);
      this.scene.add(b2);
    }
  }

  buildRoomWalls(group, w, d, h, t, mat, roomId) {
    const hw = w / 2;
    const hd = d / 2;

    if (roomId !== 'command' && roomId !== 'moonpool') {
      const wallN = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
      wallN.position.set(0, h / 2, -hd);
      group.add(wallN);
    } else if (roomId === 'command') {
      const wallN1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, h, t), mat);
      wallN1.position.set(-w * 0.35, h / 2, -hd);
      const wallN2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, h, t), mat);
      wallN2.position.set(w * 0.35, h / 2, -hd);

      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.1,
        metalness: 0.8
      });
      const windowGlass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, h * 0.7, t * 0.4), glassMat);
      windowGlass.position.set(0, h * 0.45, -hd);
      group.add(wallN1);
      group.add(wallN2);
      group.add(windowGlass);
    }

    const wallW = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), mat);
    wallW.position.set(-hw, h / 2, 0);
    const wallE = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), mat);
    wallE.position.set(hw, h / 2, 0);

    if (roomId === 'oxygen') group.add(wallW);
    if (roomId === 'reactor') group.add(wallE);
    if (roomId === 'command' || roomId === 'airlock') {
      group.add(wallW);
      group.add(wallE);
    }
  }

  /**
   * Elementos de Decoración 3D Viva:
   * Mesas holográficas, casilleros de buceo, tuberías en el techo y bancos de herramientas.
   */
  buildStationProps() {
    // 1. Centro de Mando: Mesa Holo-Radar y Consolas
    const cmdCenter = this.roomMeshes['command'];
    if (cmdCenter) {
      const holoTableGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.9, 16);
      const holoTableMat = new THREE.MeshStandardMaterial({ color: 0x112538, metalness: 0.8 });
      const holoTable = new THREE.Mesh(holoTableGeo, holoTableMat);
      holoTable.position.set(0, 0.45, 2.5);
      cmdCenter.add(holoTable);

      const radarGeo = new THREE.CircleGeometry(1.2, 16);
      const radarMat = new THREE.MeshBasicMaterial({ map: TEXTURE_FACTORY.getRadarScreen() });
      const radar = new THREE.Mesh(radarGeo, radarMat);
      radar.rotation.x = -Math.PI / 2;
      radar.position.set(0, 0.92, 2.5);
      cmdCenter.add(radar);
    }

    // 2. Módulo de Oxígeno: Tuberías de alta presión en el techo
    const oxyCenter = this.roomMeshes['oxygen'];
    if (oxyCenter) {
      const pipeGeo = new THREE.CylinderGeometry(0.18, 0.18, 14, 12);
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, metalness: 0.9 });
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 3.8, 0);
      oxyCenter.add(pipe);
    }

    // 3. Sala del Reactor: Barandillas de Seguridad Amarillas
    const reactCenter = this.roomMeshes['reactor'];
    if (reactCenter) {
      const railGeo = new THREE.BoxGeometry(0.1, 1.0, 10);
      const railMat = new THREE.MeshStandardMaterial({ color: 0xffb700, metalness: 0.7 });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(-6, 0.5, 0);
      reactCenter.add(rail);
    }

    // 4. Bahía de Achique: Rejillas de Desagüe
    const airCenter = this.roomMeshes['airlock'];
    if (airCenter) {
      const grateGeo = new THREE.BoxGeometry(6, 0.05, 3);
      const grateMat = new THREE.MeshStandardMaterial({ color: 0x081520, roughness: 0.9 });
      const grate = new THREE.Mesh(grateGeo, grateMat);
      grate.position.set(0, 0.02, 3.5);
      airCenter.add(grate);
    }
  }

  /**
   * El Seudópodo de Agua NTI (Criatura Icónica de The Abyss)
   */
  initWaterPseudopod() {
    this.pseudopod = new THREE.Group();
    const tentacleMat = new THREE.MeshStandardMaterial({
      color: 0x00f7ff,
      emissive: 0x00d2ff,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.8,
      roughness: 0.05
    });

    this.pseudoSegments = [];
    const segCount = 7;
    for (let i = 0; i < segCount; i++) {
      const radius = 0.6 * (1 - i * 0.08);
      const geo = new THREE.SphereGeometry(radius, 12, 12);
      const mesh = new THREE.Mesh(geo, tentacleMat);
      mesh.position.set(0, 0.5 + i * 0.7, 0);
      this.pseudopod.add(mesh);
      this.pseudoSegments.push(mesh);
    }

    // Rostro / Cabeza del Seudópodo
    const faceGeo = new THREE.SphereGeometry(0.55, 16, 16);
    const faceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.95
    });
    this.pseudoHead = new THREE.Mesh(faceGeo, faceMat);
    this.pseudoHead.position.set(0, 0.5 + segCount * 0.7, 0);
    this.pseudopod.add(this.pseudoHead);

    this.pseudopod.position.set(0, -0.2, 0);
    this.scene.add(this.pseudopod);
  }

  /**
   * Cajas de Suministros y Mejoras Recogibles en 3D
   */
  initSupplyCrates() {
    const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const crateColors = [0x00ff88, 0x00f7ff, 0xffaa00]; // Kit Soldadura, O2, Batería
    const cratePositions = [
      { x: -28, z: -6, type: 'WELD' },
      { x: 28, z: -6, type: 'BATTERY' },
      { x: -15, z: 18, type: 'O2' }
    ];

    cratePositions.forEach((pos, i) => {
      const crateMat = new THREE.MeshStandardMaterial({
        color: crateColors[i % 3],
        emissive: crateColors[i % 3],
        emissiveIntensity: 0.8,
        roughness: 0.2
      });
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(pos.x, 0.5, pos.z);

      const light = new THREE.PointLight(crateColors[i % 3], 1.0, 5);
      light.position.set(0, 0.5, 0);
      crate.add(light);

      this.scene.add(crate);
      this.crateMeshes.push({ mesh: crate, type: pos.type, active: true, basePos: { ...pos } });
    });
  }

  buildTerminal3D(terminal, roomX, roomZ) {
    const tx = (terminal.x - 480) * 0.1;
    const tz = (terminal.y - 320) * 0.1;

    const termGroup = new THREE.Group();
    termGroup.position.set(tx, 0, tz);

    const ringGeo = new THREE.RingGeometry(1.3, 1.55, 24);
    const ringColor = terminal.type === 'OXYGEN' ? 0x00ffcc : (terminal.type === 'REACTOR' ? 0xff7700 : (terminal.type === 'PUMP' ? 0x00e5ff : 0x00ffff));
    const ringMat = new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide });
    const floorRing = new THREE.Mesh(ringGeo, ringMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.04;
    termGroup.add(floorRing);
    this.interactiveRings[terminal.type] = floorRing;

    if (terminal.type === 'OXYGEN') {
      const baseGeo = new THREE.BoxGeometry(2.0, 0.8, 1.5);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x142838, metalness: 0.8, roughness: 0.3 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.4;
      termGroup.add(base);

      const tankGeo = new THREE.CylinderGeometry(0.35, 0.35, 2.0, 12);
      const tankMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, metalness: 0.85, roughness: 0.2 });
      const tank1 = new THREE.Mesh(tankGeo, tankMat);
      tank1.position.set(-0.55, 1.3, 0);
      const tank2 = new THREE.Mesh(tankGeo, tankMat);
      tank2.position.set(0.55, 1.3, 0);
      termGroup.add(tank1);
      termGroup.add(tank2);

      const fanGeo = new THREE.BoxGeometry(0.45, 0.08, 0.45);
      const fanMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9 });
      const fan = new THREE.Mesh(fanGeo, fanMat);
      fan.position.set(0, 1.9, 0);
      termGroup.add(fan);
      this.machineryFans.push(fan);
    } else if (terminal.type === 'REACTOR') {
      const baseGeo = new THREE.CylinderGeometry(1.3, 1.5, 0.85, 16);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x241712, metalness: 0.9, roughness: 0.2 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.42;
      termGroup.add(base);

      const domeGeo = new THREE.SphereGeometry(0.65, 12, 12);
      const domeMat = new THREE.MeshStandardMaterial({
        color: 0xff5500,
        emissive: 0xff4400,
        emissiveIntensity: 1.6,
        roughness: 0.1
      });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.y = 1.25;
      termGroup.add(dome);

      const rodGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.2, 8);
      const rodMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xff8800,
        emissiveIntensity: 1.2,
        metalness: 0.9
      });
      for (let i = 0; i < 4; i++) {
        const rod = new THREE.Mesh(rodGeo, rodMat);
        const ang = (i / 4) * Math.PI * 2;
        rod.position.set(Math.cos(ang) * 0.75, 1.35, Math.sin(ang) * 0.75);
        termGroup.add(rod);
        this.machineryRods.push({ mesh: rod, baseHeight: 1.35, phase: i });
      }
    } else if (terminal.type === 'PUMP') {
      const pumpGeo = new THREE.BoxGeometry(1.8, 1.0, 1.3);
      const pumpMat = new THREE.MeshStandardMaterial({ color: 0x163044, metalness: 0.8, roughness: 0.3 });
      const pump = new THREE.Mesh(pumpGeo, pumpMat);
      pump.position.y = 0.5;
      termGroup.add(pump);

      const pipeGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 12);
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, metalness: 0.7 });
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.y = 1.3;
      termGroup.add(pipe);

      const wheelGeo = new THREE.TorusGeometry(0.32, 0.05, 8, 12);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0xc8963e, metalness: 0.9 });
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(0, 1.6, 0.45);
      termGroup.add(wheel);
      this.machineryFans.push(wheel);
    } else if (terminal.type === 'ABYSS_DOCK') {
      const orbGeo = new THREE.IcosahedronGeometry(0.7, 1);
      const orbMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1.5,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.y = 1.4;
      termGroup.add(orb);
      this.ntiOrb = orb;
    }

    this.scene.add(termGroup);
    this.terminals3D[terminal.type] = termGroup;
  }

  initPreallocatedCrisisBeacons() {
    const beaconGeo = new THREE.CylinderGeometry(0.35, 0.5, 1.1, 12);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xff0022,
      emissive: 0xff0022,
      emissiveIntensity: 2.2
    });

    for (const key in CONSTANTS.ROOMS) {
      const r = CONSTANTS.ROOMS[key];
      const beaconGroup = new THREE.Group();
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beaconGroup.add(beacon);

      const strobeLight = new THREE.PointLight(0xff0022, 1.5, 15);
      strobeLight.position.set(0, 1.0, 0);
      beaconGroup.add(strobeLight);

      beaconGroup.visible = false;
      this.scene.add(beaconGroup);
      this.crisisBeacons[r.id] = { group: beaconGroup, light: strobeLight };
    }
  }

  initBubbleSystem() {
    const count = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = Math.random() * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x90eeff,
      size: 0.35,
      transparent: true,
      opacity: 0.65
    });

    this.bubbleParticles = new THREE.Points(geometry, material);
    this.scene.add(this.bubbleParticles);
  }

  update(dt, station) {
    const time = performance.now() * 0.002;

    // 1. Burbujas
    if (this.bubbleParticles) {
      const positions = this.bubbleParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.06 * (dt / 16);
        if (positions[i + 1] > 16) {
          positions[i + 1] = 0;
        }
      }
      this.bubbleParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Ondulación de Seudópodo de Agua NTI
    if (this.pseudopod) {
      const pseudoHeight = 1.0 + (station.ntiHarmony / 100) * 3.5;
      this.pseudoSegments.forEach((seg, i) => {
        seg.position.x = Math.sin(time * 2 + i * 0.6) * (0.2 + i * 0.15);
        seg.position.z = Math.cos(time * 2 + i * 0.6) * (0.2 + i * 0.15);
        seg.position.y = 0.3 + (i / this.pseudoSegments.length) * pseudoHeight;
      });
      if (this.pseudoHead) {
        this.pseudoHead.position.x = Math.sin(time * 2 + 5.0) * 0.8;
        this.pseudoHead.position.z = Math.cos(time * 2 + 5.0) * 0.8;
        this.pseudoHead.position.y = 0.3 + pseudoHeight + 0.4;
      }
    }

    // 3. Animaciones de maquinaria
    this.machineryFans.forEach(f => {
      f.rotation.y += 0.05;
    });

    this.machineryRods.forEach(r => {
      r.mesh.position.y = r.baseHeight + Math.sin(time * 3 + r.phase) * 0.16;
    });

    if (this.ntiOrb) {
      this.ntiOrb.rotation.y += 0.02;
      this.ntiOrb.position.y = 1.4 + Math.sin(time * 2) * 0.12;
    }

    // 4. Rotación de Cajas de Suministros
    this.crateMeshes.forEach(c => {
      if (c.active) {
        c.mesh.rotation.y += 0.02;
        c.mesh.position.y = 0.5 + Math.sin(time * 3) * 0.1;
      }
    });

    // 5. Planos de inundación rápidos y limpios (Sin tirones de GPU)
    for (const key in station.rooms) {
      const r = station.rooms[key];
      const waterPlane = this.waterPlanes[r.id];
      if (waterPlane) {
        if (r.waterLevel > 0.5) {
          waterPlane.visible = true;
          waterPlane.position.y = (r.waterLevel / 100) * 3.0;
        } else {
          waterPlane.visible = false;
        }
      }

      const beaconObj = this.crisisBeacons[r.id];
      if (beaconObj) {
        if (r.activeCrisis) {
          beaconObj.group.visible = true;
          const bx = (r.activeCrisis.x - 480) * 0.1;
          const bz = (r.activeCrisis.y - 320) * 0.1;
          beaconObj.group.position.set(bx, 0.55 + Math.sin(time * 6) * 0.1, bz);
          beaconObj.light.intensity = 1.5 + Math.sin(time * 10) * 1.0;
        } else {
          beaconObj.group.visible = false;
        }
      }
    }
  }
}
