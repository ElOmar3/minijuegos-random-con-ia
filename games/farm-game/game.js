/* ==========================================================================
   GRANJA MÁGICA 3D — FULL ENGINE (Three.js Low-Poly Deluxe Edition)
   ========================================================================== */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
  let audioCtx = null;
  let soundEnabled = true;
  let bgmTimer = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      startBGM();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }
  window.addEventListener('pointerdown', initAudio, { once: true });
  window.addEventListener('keydown', initAudio, { once: true });

  function snd(freq, dur, type = 'sine', vol = 0.15, slideTo = null) {
    if (!soundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, audioCtx.currentTime + dur);
      }
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }

  function sfxPlant() { snd(360, 0.08, 'triangle', 0.14, 520); }
  function sfxWater() { snd(260, 0.16, 'sine', 0.16, 380); }
  function sfxHarvest() {
    snd(523, 0.08, 'triangle', 0.15);
    setTimeout(() => snd(659, 0.08, 'triangle', 0.15), 60);
    setTimeout(() => snd(784, 0.14, 'sine', 0.18), 120);
  }
  function sfxGolden() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
      setTimeout(() => snd(f, 0.15, 'sine', 0.18), i * 50);
    });
  }
  function sfxSell() {
    snd(987, 0.08, 'sine', 0.15);
    setTimeout(() => snd(1318, 0.15, 'triangle', 0.15), 80);
  }
  function sfxBuy() {
    snd(659, 0.06, 'triangle', 0.15);
    setTimeout(() => snd(523, 0.1, 'sine', 0.15), 60);
  }
  function sfxLevelUp() {
    [440, 554, 659, 880].forEach((f, i) => setTimeout(() => snd(f, 0.2, 'triangle', 0.2), i * 100));
  }
  function sfxAnimal() { snd(300, 0.15, 'triangle', 0.12, 380); }

  function startBGM() {
    if (bgmTimer) clearInterval(bgmTimer);
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    bgmTimer = setInterval(() => {
      if (!soundEnabled || !audioCtx) return;
      if (Math.random() < 0.65) {
        snd(scale[Math.floor(Math.random() * scale.length)], 0.4, 'sine', 0.02);
      }
    }, 600);
  }

  function toggleAudio() {
    initAudio();
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('snd-toggle');
    if (btn) btn.textContent = soundEnabled ? '🔊' : '🔇';
  }

  // --- GAME DATABASE ---
  const CROPS = {
    wheat:      { nm: 'Trigo',        em: '🌾', gt: 6,  buy: 5,   sell: 12,  col: 0xDAA520, unlockLvl: 1 },
    carrot:     { nm: 'Zanahoria',    em: '🥕', gt: 12, buy: 10,  sell: 24,  col: 0xFF8C00, unlockLvl: 1 },
    tomato:     { nm: 'Tomate',       em: '🍅', gt: 18, buy: 18,  sell: 42,  col: 0xFF3D00, unlockLvl: 2 },
    pumpkin:    { nm: 'Calabaza',     em: '🎃', gt: 26, buy: 30,  sell: 75,  col: 0xFF6F00, unlockLvl: 3 },
    strawberry: { nm: 'Fresa',        em: '🍓', gt: 36, buy: 45,  sell: 120, col: 0xE91E63, unlockLvl: 4 },
    corn:       { nm: 'Maíz',         em: '🌽', gt: 48, buy: 60,  sell: 170, col: 0xFFD600, unlockLvl: 5 },
    watermelon: { nm: 'Sandía',       em: '🍉', gt: 60, buy: 85,  sell: 250, col: 0x2E7D32, unlockLvl: 6 },
    sunflower:  { nm: 'Girasol Oro',  em: '🌻', gt: 80, buy: 120, sell: 400, col: 0xFFEA00, unlockLvl: 7 }
  };

  const ANIMALS = {
    chicken: { nm: 'Gallina', em: '🐔', buy: 60,  res: '🥚', rn: 'Huevo',   rate: 10, sp: 15, unlockLvl: 1 },
    cow:     { nm: 'Vaca',    em: '🐮', buy: 180, res: '🥛', rn: 'Leche',   rate: 16, sp: 35, unlockLvl: 2 },
    sheep:   { nm: 'Oveja',   em: '🐑', buy: 350, res: '🧶', rn: 'Lana',    rate: 24, sp: 65, unlockLvl: 3 },
    pig:     { nm: 'Cerdito', em: '🐷', buy: 600, res: '🍄', rn: 'Trufa',   rate: 32, sp: 120, unlockLvl: 4 }
  };

  const RECIPES = {
    bread:    { nm: 'Pan Casero',        em: '🍞', req: { '🌾': 2 },                  sell: 35,  xp: 15 },
    cheese:   { nm: 'Queso Añejo',       em: '🧀', req: { '🥛': 2 },                  sell: 90,  xp: 25 },
    pie:      { nm: 'Pastel de Calabaza',em: '🥧', req: { '🎃': 1, '🥚': 1, '🌾': 1 }, sell: 220, xp: 55 },
    cake:     { nm: 'Tarta de Fresa',    em: '🍰', req: { '🍓': 2, '🥛': 1, '🥚': 1 }, sell: 320, xp: 80 },
    pizza:    { nm: 'Pizza Rústica',     em: '🍕', req: { '🍅': 2, '🌾': 1, '🍄': 1 }, sell: 420, xp: 110 },
    popcorn:  { nm: 'Palomitas de Maíz', em: '🍿', req: { '🌽': 2 },                  sell: 380, xp: 95 }
  };

  const UPGRADES = [
    { id: 'water',  nm: 'Aspersor Automático', desc: 'Riega cultivos solos al amanecer', base: 150, mult: 2.2, max: 3 },
    { id: 'speed',  nm: 'Fertilizante Mágico', desc: '-15% tiempo de crecimiento',      base: 100, mult: 2.0, max: 4 },
    { id: 'inv',    nm: 'Mochila de Cuero',    desc: '+15 espacio de inventario',        base: 80,  mult: 1.8, max: 5 },
    { id: 'market', nm: 'Puesto de Mercado',   desc: '+15% precio de venta total',       base: 120, mult: 2.1, max: 4 }
  ];

  const MISSIONS = [
    { txt: '🌱 Sembrar 3 cultivos', check: g => g.stats.planted >= 3, rwCoins: 40, rwXP: 25 },
    { txt: '🌾 Cosechar 5 cultivos', check: g => g.stats.harvested >= 5, rwCoins: 60, rwXP: 35 },
    { txt: '🐔 Comprar una gallina', check: g => g.animals.length >= 1, rwCoins: 80, rwXP: 45 },
    { txt: '💰 Ganar 200 monedas vendiendo', check: g => g.stats.totalEarned >= 200, rwCoins: 100, rwXP: 60 },
    { txt: '🍞 Cocinar un Pan en el molino', check: g => g.stats.cooked >= 1, rwCoins: 120, rwXP: 75 },
    { txt: '🥕 Cosechar 10 zanahorias', check: g => g.stats.harvested >= 10, rwCoins: 150, rwXP: 90 },
    { txt: '⭐ Alcanzar el Nivel 3 de granja', check: g => g.level >= 3, rwCoins: 250, rwXP: 150 }
  ];

  // --- STATE & PERSISTENCE ---
  const SAVE_KEY = 'granja_3d_state_v3';
  const g = {
    coins: 100,
    gems: 5,
    level: 1,
    xp: 0,
    xpNext: 60,
    day: 1,
    timeMin: 480,
    inventory: {},
    animals: [{ type: 'chicken', x: -10, z: 4, tx: -10, tz: 4, timer: 0 }],
    upgrades: { water: 0, speed: 0, inv: 0, market: 0 },
    activeTool: 'hand',
    missionIdx: 0,
    plots: [],
    stats: { planted: 0, harvested: 0, sold: 0, totalEarned: 0, cooked: 0 }
  };

  function countInv() {
    let c = 0;
    for (let k in g.inventory) c += g.inventory[k] || 0;
    return c;
  }
  function getInvMax() { return 30 + (g.upgrades.inv || 0) * 15; }
  function getPriceMult() { return 1 + (g.upgrades.market || 0) * 0.15; }

  function addXP(amt) {
    g.xp += amt;
    while (g.xp >= g.xpNext) {
      g.xp -= g.xpNext;
      g.level++;
      g.xpNext = Math.floor(g.xpNext * 1.45);
      g.coins += g.level * 50;
      g.gems += 2;
      sfxLevelUp();
      toast(`⭐ ¡Has subido a Nivel ${g.level}!`);
    }
  }

  function saveGame() {
    try {
      syncPlotsToState();
      const data = {
        coins: g.coins, gems: g.gems, level: g.level, xp: g.xp, xpNext: g.xpNext,
        day: g.day, timeMin: g.timeMin, inventory: g.inventory,
        animals: g.animals.map(a => ({ type: a.type })),
        upgrades: g.upgrades, missionIdx: g.missionIdx, stats: g.stats,
        plots: g.plots
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch(e) {}
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.assign(g, data);
      g.plots = Array.isArray(data.plots) ? data.plots : [];
      g.inventory = data.inventory || {};
      g.upgrades = { water: 0, speed: 0, inv: 0, market: 0, ...(data.upgrades || {}) };
      g.stats = { planted: 0, harvested: 0, sold: 0, totalEarned: 0, cooked: 0, ...(data.stats || {}) };
      g.animals = (Array.isArray(data.animals) && data.animals.length > 0)
        ? data.animals.map((a, i) => ({
            type: a.type || 'chicken',
            x: -10 - (i % 3) * 2,
            z: 4 + Math.floor(i / 3) * 2,
            tx: -10 - (i % 3) * 2,
            tz: 4 + Math.floor(i / 3) * 2,
            timer: 0
          }))
        : [{ type: 'chicken', x: -10, z: 4, tx: -10, tz: 4, timer: 0 }];
    } catch(e) {}
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.display = 'none'; }, 2500);
  }

  // --- THREE.JS 3D SCENE & DETAILED MODELING ---
  let scene, camera, renderer, dirLight, hemiLight;
  let windmillBlades;
  let player, legL, legR, armR, body, toolWaterCan;
  let walkCycle = 0;
  const keys = {};
  let joyDir = { x: 0, y: 0 };

  const plots = [];
  const PLOT_ROWS = 4, PLOT_COLS = 4;
  const PLOT_SIZE = 2.4;

  const animalEntities = [];
  let dogMesh, dogTail, dogTimer = 0;
  let currentAction = null;
  let lastTime = performance.now();

  function initWorld() {
    const container = document.getElementById('webgl-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6ea8cd);
    scene.fog = new THREE.Fog(0x6ea8cd, 40, 85);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(12, 16, 18);
    camera.lookAt(0, 1, 4);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Soft, Eye-Friendly Ambient & Sun Lights (Cozy Pastel Palette)
    hemiLight = new THREE.HemisphereLight(0xe3f2fd, 0x4b7c3d, 0.42);
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xfff8e7, 0.52);
    dirLight.position.set(20, 35, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    const d = 26;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    buildEnvironment();
    buildPlayer();
    buildPlots();
    buildAnimals();
  }

  function buildEnvironment() {
    // Pradera: una base suave con parches y briznas para evitar el efecto de plano verde.
    const groundGeo = new THREE.PlaneGeometry(85, 85, 16, 16);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x5e9147 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const fieldArea = (x, z, margin = 0) => Math.abs(x) < 6.6 + margin && Math.abs(z) < 6.6 + margin;
    const inCircle = (x, z, cx, cz, radius) => Math.hypot(x - cx, z - cz) < radius;
    const onPath = (x, z) => (
      (Math.abs(x - 8.5) < 0.95 && z > -15.5 && z < 13.5) ||
      (Math.abs(z - 7.3) < 0.95 && x > -9.5 && x < 9.5) ||
      (Math.abs(x + 8.5) < 0.95 && z > -10.5 && z < 7.8) ||
      (Math.abs(z + 11) < 0.9 && x > 8 && x < 12.5) ||
      (Math.abs(z + 8.5) < 0.9 && x > -13.5 && x < -8)
    );
    const clearForNature = (x, z) => !fieldArea(x, z, 0.8) && !onPath(x, z)
      && !inCircle(x, z, -13, -11, 5.4)
      && !inCircle(x, z, 13, -11, 5.3)
      && !inCircle(x, z, -11, 7, 5.6)
      && !inCircle(x, z, 13, 9, 4.8);

    // Variación de color del suelo, excluyendo las zonas jugables y las rutas.
    const patchColors = [0x6ba34f, 0x528840, 0x78aa55, 0x4f833d];
    const random = (() => {
      let seed = 1937;
      return () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
    })();
    for (let i = 0; i < 115; i++) {
      const x = random() * 76 - 38;
      const z = random() * 76 - 38;
      if (!clearForNature(x, z)) continue;
      const patch = new THREE.Mesh(
        new THREE.CircleGeometry(0.55 + random() * 1.35, 7),
        new THREE.MeshLambertMaterial({ color: patchColors[i % patchColors.length], transparent: true, opacity: 0.32 })
      );
      patch.rotation.x = -Math.PI / 2;
      patch.rotation.z = random() * Math.PI;
      patch.scale.y = 0.6 + random() * 0.5;
      patch.position.set(x, 0.006, z);
      scene.add(patch);
    }

    // Briznas low-poly agrupadas: textura reconocible sin cargar la escena.
    const grassColors = [0x4f873f, 0x639949, 0x7baa58];
    grassColors.forEach((color, colorIndex) => {
      const blades = new THREE.InstancedMesh(
        new THREE.ConeGeometry(0.075, 0.24, 4),
        new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.12 }),
        85
      );
      const matrix = new THREE.Matrix4();
      let count = 0;
      while (count < 85) {
        const x = random() * 76 - 38;
        const z = random() * 76 - 38;
        if (!clearForNature(x, z)) continue;
        const scale = 0.72 + random() * 0.85;
        matrix.compose(
          new THREE.Vector3(x, 0.105 * scale, z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, random() * Math.PI, 0)),
          new THREE.Vector3(scale, scale, scale)
        );
        blades.setMatrixAt(count++, matrix);
      }
      blades.count = count;
      blades.castShadow = colorIndex === 0;
      scene.add(blades);
    });

    // Senderos de piedras: rodean el campo en vez de dividir las parcelas.
    const pathGroup = new THREE.Group();
    const pathMaterials = [0xb9ae99, 0xcabfa9, 0xa89e8d].map(color => new THREE.MeshLambertMaterial({ color }));
    const addStonePath = (fromX, fromZ, toX, toZ) => {
      const dx = toX - fromX;
      const dz = toZ - fromZ;
      const distance = Math.hypot(dx, dz);
      const steps = Math.ceil(distance / 1.05);
      const angle = Math.atan2(dx, dz);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const stone = new THREE.Mesh(
          new THREE.BoxGeometry(1.18, 0.10, 0.78),
          pathMaterials[i % pathMaterials.length]
        );
        stone.position.set(fromX + dx * t, 0.055, fromZ + dz * t);
        stone.rotation.y = angle + (i % 2 ? 0.04 : -0.035);
        stone.receiveShadow = true;
        pathGroup.add(stone);
      }
    };
    addStonePath(8.5, -14.5, 8.5, 12.5);       // ruta principal del lado este
    addStonePath(-8.5, 7.3, 8.5, 7.3);         // acceso sur del cultivo
    addStonePath(-8.5, -9.5, -8.5, 7.3);       // conexión hacia el granero
    addStonePath(8.5, -11, 12.2, -11);         // entrada al molino
    addStonePath(-8.5, -8.5, -13, -8.5);       // entrada al granero
    scene.add(pathGroup);

    // Árboles exclusivamente en el perímetro; clearForNature protege edificios, corral y molino.
    const treePos = [[-22, -17], [-18, -21], [-23, -4], [-22, 14], [-15, 20], [-4, -21], [5, -21], [20, -18], [23, -4], [22, 15], [12, 21], [0, 21]];
    treePos.forEach((p, idx) => {
      if (!clearForNature(p[0], p[1])) return;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.4, 6), new THREE.MeshLambertMaterial({ color: 0x6d4c41 }));
      trunk.position.y = 0.7;
      trunk.castShadow = true;
      tree.add(trunk);

      // Varied foliage (some pine, some rounded apple trees)
      if (idx % 2 === 0) {
        const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 1), new THREE.MeshLambertMaterial({ color: 0x388e3c }));
        leaves.position.y = 2.0;
        leaves.castShadow = true;
        tree.add(leaves);
        // Red apples
        for (let i = 0; i < 4; i++) {
          const apple = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 5), new THREE.MeshLambertMaterial({ color: 0xe53935 }));
          const ang = (i / 4) * Math.PI * 2;
          apple.position.set(Math.cos(ang) * 0.9, 1.8 + (i % 2) * 0.3, Math.sin(ang) * 0.9);
          tree.add(apple);
        }
      } else {
        const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.4, 6), new THREE.MeshLambertMaterial({ color: 0x2e7d32 }));
        cone1.position.y = 1.6;
        cone1.castShadow = true;
        tree.add(cone1);
        const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.2, 6), new THREE.MeshLambertMaterial({ color: 0x388e3c }));
        cone2.position.y = 2.3;
        cone2.castShadow = true;
        tree.add(cone2);
      }
      tree.position.set(p[0], 0, p[1]);
      const scale = 0.84 + (idx % 3) * 0.08;
      tree.scale.setScalar(scale);
      scene.add(tree);
    });

    // Detailed Red Barn
    const barn = new THREE.Group();
    const barnMesh = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.8, 4.5), new THREE.MeshLambertMaterial({ color: 0xc62828 }));
    barnMesh.position.y = 1.9;
    barnMesh.castShadow = true;
    barn.add(barnMesh);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.2, 4), new THREE.MeshLambertMaterial({ color: 0x37474f }));
    roof.position.y = 4.8;
    roof.rotation.y = Math.PI / 4;
    barn.add(roof);

    // Barn Door & White X trim
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    door.position.set(0, 1.2, 2.26);
    barn.add(door);

    barn.position.set(-13, 0, -11);
    scene.add(barn);

    // Windmill
    const windmill = new THREE.Group();
    const wmBase = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 2.0, 5.5, 8), new THREE.MeshLambertMaterial({ color: 0xd7ccc8 }));
    wmBase.position.y = 2.75;
    wmBase.castShadow = true;
    windmill.add(wmBase);
    const wmRoof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.6, 8), new THREE.MeshLambertMaterial({ color: 0x8d6e63 }));
    wmRoof.position.y = 6.2;
    windmill.add(wmRoof);

    windmillBlades = new THREE.Group();
    windmillBlades.position.set(0, 4.8, 1.4);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.4, 0.05), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      blade.position.y = 1.2;
      const pivot = new THREE.Group();
      pivot.rotation.z = (Math.PI / 2) * i;
      pivot.add(blade);
      windmillBlades.add(pivot);
    }
    windmill.add(windmillBlades);
    windmill.position.set(13, 0, -11);
    scene.add(windmill);

    // Pond with water lilies
    const pond = new THREE.Mesh(new THREE.CircleGeometry(3.6, 16), new THREE.MeshLambertMaterial({ color: 0x29b6f6 }));
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(13, 0.02, 9);
    scene.add(pond);

    // Lily pad
    const lily = new THREE.Mesh(new THREE.CircleGeometry(0.4, 8), new THREE.MeshLambertMaterial({ color: 0x43a047 }));
    lily.rotation.x = -Math.PI / 2;
    lily.position.set(12.2, 0.03, 8.5);
    scene.add(lily);

    // Corral completo con postes: evita que parezca una valla flotando.
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
    const addFence = (x, z, width, depth) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, depth), fenceMat);
      rail.position.set(x, 0.48, z);
      rail.castShadow = true;
      scene.add(rail);
    };
    addFence(-11, 3, 8, 0.16);
    addFence(-11, 11, 8, 0.16);
    addFence(-15, 7, 0.16, 8);
    addFence(-7, 7, 0.16, 8);
    [[-15, 3], [-7, 3], [-15, 11], [-7, 11]].forEach(([x, z]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.15, 5), fenceMat);
      post.position.set(x, 0.58, z);
      post.castShadow = true;
      scene.add(post);
    });
  }

  function buildPlayer() {
    player = new THREE.Group();

    // Body with Denim Overalls
    body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.9, 8), new THREE.MeshLambertMaterial({ color: 0x1976D2 }));
    body.position.y = 0.85;
    body.castShadow = true;
    player.add(body);

    // Red Neck Bandana
    const bandana = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.2, 6), new THREE.MeshLambertMaterial({ color: 0xe53935 }));
    bandana.position.set(0, 1.25, 0.08);
    bandana.rotation.x = Math.PI;
    player.add(bandana);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshLambertMaterial({ color: 0xffcc80 }));
    head.position.y = 1.5;
    player.add(head);

    // Eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), new THREE.MeshLambertMaterial({ color: 0x212121 }));
    eyeL.position.set(-0.1, 1.54, 0.27);
    player.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), new THREE.MeshLambertMaterial({ color: 0x212121 }));
    eyeR.position.set(0.1, 1.54, 0.27);
    player.add(eyeR);

    // Straw Hat with Red Ribbon
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.05, 10), new THREE.MeshLambertMaterial({ color: 0xfbc02d }));
    hatBrim.position.y = 1.68;
    player.add(hatBrim);

    const hatRibbon = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.08, 10), new THREE.MeshLambertMaterial({ color: 0xd32f2f }));
    hatRibbon.position.y = 1.74;
    player.add(hatRibbon);

    const hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.38, 8), new THREE.MeshLambertMaterial({ color: 0xfbc02d }));
    hatTop.position.y = 1.92;
    player.add(hatTop);

    // Legs with Brown Boots
    legL = new THREE.Group();
    const pantsL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 6), new THREE.MeshLambertMaterial({ color: 0x0d47a1 }));
    pantsL.position.y = 0.32;
    legL.add(pantsL);
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.26), new THREE.MeshLambertMaterial({ color: 0x5d4037 }));
    bootL.position.set(0, 0.09, 0.04);
    legL.add(bootL);
    legL.position.set(-0.2, 0, 0);
    player.add(legL);

    legR = new THREE.Group();
    const pantsR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 6), new THREE.MeshLambertMaterial({ color: 0x0d47a1 }));
    pantsR.position.y = 0.32;
    legR.add(pantsR);
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.26), new THREE.MeshLambertMaterial({ color: 0x5d4037 }));
    bootR.position.set(0, 0.09, 0.04);
    legR.add(bootR);
    legR.position.set(0.2, 0, 0);
    player.add(legR);

    // Arm with Watering Can Tool
    armR = new THREE.Group();
    const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 6), new THREE.MeshLambertMaterial({ color: 0x1976D2 }));
    armMesh.position.y = -0.25;
    armR.add(armMesh);
    armR.position.set(0.42, 1.2, 0);

    toolWaterCan = new THREE.Group();
    const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.28, 6), new THREE.MeshLambertMaterial({ color: 0x4fc3f7 }));
    canBody.position.set(0, -0.38, 0.16);
    toolWaterCan.add(canBody);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.25, 4), new THREE.MeshLambertMaterial({ color: 0x81d4fa }));
    spout.position.set(0, -0.32, 0.32);
    spout.rotation.x = Math.PI / 4;
    toolWaterCan.add(spout);
    armR.add(toolWaterCan);
    player.add(armR);

    // Acceso sur del campo: no aparece sobre una parcela ni sobre el camino.
    player.position.set(0, 0, 5.8);
    scene.add(player);

    setupControls();
  }

  function setupControls() {
    window.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea, select')) return;
      keys[e.key.toLowerCase()] = true;
      if (e.code === 'Space' || e.key.toLowerCase() === 'e') {
        e.preventDefault();
        triggerAction();
      }
      const shortcutTools = ['hand', 'water', 'wheat', 'carrot', 'tomato', 'pumpkin', 'strawberry', 'corn', 'watermelon', 'sunflower'];
      const shortcut = e.key === '0' ? 9 : Number(e.key) - 1;
      if (Number.isInteger(shortcut) && shortcut >= 0 && shortcut < shortcutTools.length) {
        e.preventDefault();
        selectTool(shortcutTools[shortcut]);
      }
    });

    window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

    // Touch Joystick for Mobile
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

  function buildPlots() {
    const plotsGroup = new THREE.Group();

    for (let r = 0; r < PLOT_ROWS; r++) {
      for (let c = 0; c < PLOT_COLS; c++) {
        const px = (c - (PLOT_COLS - 1) / 2) * (PLOT_SIZE + 0.5);
        const pz = (r - (PLOT_ROWS - 1) / 2) * (PLOT_SIZE + 0.5);

        // Plot with beveled soil box
        const soil = new THREE.Mesh(new THREE.BoxGeometry(PLOT_SIZE, 0.25, PLOT_SIZE), new THREE.MeshLambertMaterial({ color: 0x8d5b2d }));
        soil.position.set(px, 0.12, pz);
        soil.receiveShadow = true;
        plotsGroup.add(soil);

        const cropGroup = new THREE.Group();
        soil.add(cropGroup);

        const saved = (Array.isArray(g.plots) && g.plots[plots.length]) || {};
        const plot = {
          r, c, mesh: soil, cropGroup,
          planted: saved.planted || null,
          stage: saved.stage || 0,
          progress: Math.max(0, Math.min(1, saved.progress || 0)),
          watered: Boolean(saved.watered),
          ready: Boolean(saved.ready),
          isGolden: Boolean(saved.isGolden)
        };
        if (plot.ready && plot.stage < 3) plot.stage = 3;
        soil.material.color.setHex(plot.watered ? 0x4a2e16 : 0x8d5b2d);
        plots.push(plot);
        render3DCrop(plot);
      }
    }
    scene.add(plotsGroup);
  }

  // --- DETAILED PROCEDURAL 3D CROPS BUILDERS ---

  function createSproutMesh() {
    const group = new THREE.Group();
    // Dirt mound
    const mound = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.15, 6), new THREE.MeshLambertMaterial({ color: 0x5c3818 }));
    mound.position.y = 0.07;
    group.add(mound);
    // Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.3, 5), new THREE.MeshLambertMaterial({ color: 0x76ff03 }));
    stem.position.y = 0.2;
    group.add(stem);
    // 2 Heart Cotyledons / Leaves
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x64dd17 });
    const leaf1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), leafMat);
    leaf1.scale.set(1.4, 0.2, 0.8);
    leaf1.position.set(0.1, 0.32, 0);
    leaf1.rotation.z = -Math.PI / 6;
    group.add(leaf1);
    const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), leafMat);
    leaf2.scale.set(1.4, 0.2, 0.8);
    leaf2.position.set(-0.1, 0.32, 0);
    leaf2.rotation.z = Math.PI / 6;
    group.add(leaf2);
    return group;
  }

  function createGrowingBushMesh(color) {
    const group = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6), new THREE.MeshLambertMaterial({ color: 0x4caf50 }));
    stem.position.y = 0.35;
    group.add(stem);
    // 4 spreading leaves
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x43a047 });
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 5, 5), leafMat);
      leaf.scale.set(1.6, 0.3, 0.9);
      const ang = (i / 4) * Math.PI * 2;
      leaf.position.set(Math.cos(ang) * 0.22, 0.3 + (i * 0.08), Math.sin(ang) * 0.22);
      leaf.rotation.y = ang;
      leaf.rotation.z = -0.3;
      group.add(leaf);
    }
    return group;
  }

  function createWheatMesh(isGolden) {
    const group = new THREE.Group();
    const stalkMat = new THREE.MeshLambertMaterial({ color: isGolden ? 0xffd700 : 0xe6b800 });
    const grainMat = new THREE.MeshLambertMaterial({ color: isGolden ? 0xffeb3b : 0xfbc02d });

    // 7 Wheat stalks clustered together
    for (let i = 0; i < 7; i++) {
      const stalkGroup = new THREE.Group();
      const ang = (i / 7) * Math.PI * 2;
      const r = i === 0 ? 0 : 0.22;

      // Curving Stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.1, 4), stalkMat);
      stem.position.y = 0.55;
      stalkGroup.add(stem);

      // Segmented Golden Grain Ear
      for (let k = 0; k < 5; k++) {
        const kernel = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 5), grainMat);
        kernel.position.y = 0.85 + (k * 0.08);
        kernel.rotation.z = (k % 2 === 0 ? 0.2 : -0.2);
        stalkGroup.add(kernel);
      }

      // Tip Beard / Awn
      const awn = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 3), grainMat);
      awn.position.y = 1.32;
      stalkGroup.add(awn);

      stalkGroup.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
      stalkGroup.rotation.z = (Math.cos(ang) * 0.15);
      stalkGroup.rotation.x = (Math.sin(ang) * 0.15);
      group.add(stalkGroup);
    }
    return group;
  }

  function createCarrotMesh(isGolden) {
    const group = new THREE.Group();
    // Dark Earth Mound
    const mound = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.22, 8), new THREE.MeshLambertMaterial({ color: 0x4a2e16 }));
    mound.position.y = 0.1;
    group.add(mound);

    const carrotMat = new THREE.MeshLambertMaterial({ color: isGolden ? 0xffd700 : 0xff7043 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x43a047 });

    // 3 Carrots in the plot
    const pos = [[0, 0], [-0.22, 0.18], [0.22, -0.15]];
    pos.forEach(([cx, cz], idx) => {
      const cGroup = new THREE.Group();
      // Carrot body poking out
      const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 7), carrotMat);
      carrot.rotation.x = Math.PI;
      carrot.position.y = 0.25;
      cGroup.add(carrot);

      // Feathered Leafy Crown (Carrot tops)
      for (let l = 0; l < 4; l++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 4), leafMat);
        const lAng = (l / 4) * Math.PI * 2;
        frond.position.set(Math.cos(lAng) * 0.08, 0.65, Math.sin(lAng) * 0.08);
        frond.rotation.z = Math.cos(lAng) * 0.35;
        frond.rotation.x = Math.sin(lAng) * 0.35;
        cGroup.add(frond);
      }

      cGroup.position.set(cx, 0, cz);
      cGroup.rotation.y = idx * 1.2;
      group.add(cGroup);
    });
    return group;
  }

  function createTomatoMesh(isGolden) {
    const group = new THREE.Group();
    // Wooden Garden Stake
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 5), new THREE.MeshLambertMaterial({ color: 0x795548 }));
    stake.position.y = 0.8;
    group.add(stake);

    // Climbing Vine
    const vineMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x43a047 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.4, 6), vineMat);
    stem.position.set(0.05, 0.7, 0);
    group.add(stem);

    // Leaves
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 4), leafMat);
      leaf.scale.set(1.5, 0.3, 0.8);
      const ang = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(ang) * 0.28, 0.35 + (i * 0.18), Math.sin(ang) * 0.28);
      leaf.rotation.y = ang;
      group.add(leaf);
    }

    // 4 Glossy Red Tomatoes with 5-pointed Sepals
    const tomMat = new THREE.MeshLambertMaterial({ color: isGolden ? 0xffd700 : 0xe53935 });
    const sepalMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20 });
    const tomPos = [[-0.2, 0.45, 0.2], [0.25, 0.65, -0.15], [-0.15, 0.95, -0.2], [0.2, 1.1, 0.15]];

    tomPos.forEach(([tx, ty, tz]) => {
      const tomGroup = new THREE.Group();
      // Round Tomato
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), tomMat);
      fruit.scale.set(1.1, 0.95, 1.1);
      tomGroup.add(fruit);
      // Star Calyx/Sepal on top
      const sepal = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.05, 5), sepalMat);
      sepal.position.y = 0.18;
      tomGroup.add(sepal);

      tomGroup.position.set(tx, ty, tz);
      group.add(tomGroup);
    });

    return group;
  }

  function createPumpkinMesh(isGolden) {
    const group = new THREE.Group();
    // Sprawling Vine Leaves on ground
    const vineMat = new THREE.MeshLambertMaterial({ color: 0x388e3c });
    for (let i = 0; i < 4; i++) {
      const vLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 4), vineMat);
      vLeaf.scale.set(1.4, 0.15, 1.2);
      const ang = (i / 4) * Math.PI * 2;
      vLeaf.position.set(Math.cos(ang) * 0.7, 0.05, Math.sin(ang) * 0.7);
      group.add(vLeaf);
    }

    const pumpMat = new THREE.MeshLambertMaterial({ color: isGolden ? 0xffd700 : 0xf57c00 });

    // Segmented Ribbed Pumpkin (6 radial overlapping spheres)
    const pumpGroup = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const rib = new THREE.Mesh(new THREE.SphereGeometry(0.48, 7, 7), pumpMat);
      rib.scale.set(1.35, 1.0, 0.6);
      rib.rotation.y = (i / 6) * Math.PI;
      pumpGroup.add(rib);
    }

    // Twisted Woody Green Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.35, 5), new THREE.MeshLambertMaterial({ color: 0x33691e }));
    stem.position.y = 0.55;
    stem.rotation.z = 0.25;
    pumpGroup.add(stem);

    pumpGroup.position.y = 0.42;
    group.add(pumpGroup);
    return group;
  }

  function createStrawberryMesh(isGolden) {
    const group = new THREE.Group();
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x388e3c });
    const strawMat = new THREE.MeshLambertMaterial({ color: isGolden ? 0xffd700 : 0xff1744 });
    const capMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20 });
    const flowerMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const centerMat = new THREE.MeshLambertMaterial({ color: 0xfbc02d });

    // 6 Scalloped Green Leaves flat on the ground
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 4), leafMat);
      leaf.scale.set(1.4, 0.18, 0.9);
      const ang = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(ang) * 0.42, 0.08, Math.sin(ang) * 0.42);
      leaf.rotation.y = ang;
      leaf.rotation.x = 0.25;
      group.add(leaf);
    }

    // 4 Large, Vibrant, Delicious Red Strawberries standing up proudly
    const berryCoords = [
      { x: 0, y: 0.52, z: 0.1, rotZ: 0.05, rotX: 0.15, sz: 1.25 },
      { x: -0.32, y: 0.38, z: -0.18, rotZ: -0.35, rotX: -0.2, sz: 1.05 },
      { x: 0.32, y: 0.38, z: -0.18, rotZ: 0.35, rotX: -0.2, sz: 1.05 },
      { x: 0, y: 0.32, z: -0.35, rotZ: 0, rotX: -0.4, sz: 0.95 }
    ];

    berryCoords.forEach(b => {
      const sGroup = new THREE.Group();
      // Berry Cone (Wide top, pointy tip)
      const berry = new THREE.Mesh(new THREE.ConeGeometry(0.22 * b.sz, 0.45 * b.sz, 8), strawMat);
      berry.rotation.x = Math.PI; // point downwards
      sGroup.add(berry);

      // Star-shaped green calyx crown on top
      for (let s = 0; s < 5; s++) {
        const sepal = new THREE.Mesh(new THREE.ConeGeometry(0.06 * b.sz, 0.16 * b.sz, 3), capMat);
        const sAng = (s / 5) * Math.PI * 2;
        sepal.position.set(Math.cos(sAng) * (0.13 * b.sz), 0.22 * b.sz, Math.sin(sAng) * (0.13 * b.sz));
        sepal.rotation.z = Math.cos(sAng) * 0.8;
        sepal.rotation.x = Math.sin(sAng) * 0.8;
        sGroup.add(sepal);
      }

      // Little green stem
      const sStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15 * b.sz, 4), capMat);
      sStem.position.y = 0.28 * b.sz;
      sGroup.add(sStem);

      sGroup.position.set(b.x, b.y, b.z);
      sGroup.rotation.z = b.rotZ;
      sGroup.rotation.x = b.rotX;
      group.add(sGroup);
    });

    // 2 Cute White Strawberry Flowers with golden center
    [{ x: -0.18, y: 0.48, z: 0.28 }, { x: 0.22, y: 0.45, z: 0.26 }].forEach(fp => {
      const fGroup = new THREE.Group();
      const petals = new THREE.Mesh(new THREE.CircleGeometry(0.12, 5), flowerMat);
      petals.rotation.x = -Math.PI / 3;
      fGroup.add(petals);
      const fCenter = new THREE.Mesh(new THREE.SphereGeometry(0.045, 4, 4), centerMat);
      fCenter.position.set(0, 0.03, 0);
      fGroup.add(fCenter);
      fGroup.position.set(fp.x, fp.y, fp.z);
      group.add(fGroup);
    });

    return group;
  }

  function createCornMesh(isGolden) {
    const group = new THREE.Group();
    const stalkMat = new THREE.MeshLambertMaterial({ color: 0x388e3c });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x43a047 });
    const huskMat = new THREE.MeshLambertMaterial({ color: 0x81c784 });
    const kernelMat = new THREE.MeshLambertMaterial({ color: isGolden ? 0xffd700 : 0xffd600 });
    const silkMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });

    // Tall Stalk
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 2.0, 6), stalkMat);
    stalk.position.y = 1.0;
    group.add(stalk);

    // Arching Corn Leaves
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.7), leafMat);
      const ang = (i / 5) * Math.PI * 2;
      leaf.position.set(Math.cos(ang) * 0.35, 0.6 + (i * 0.25), Math.sin(ang) * 0.35);
      leaf.rotation.y = ang;
      leaf.rotation.x = 0.45;
      group.add(leaf);
    }

    // 2 Ears of Corn on the stalk
    [0.75, 1.25].forEach((cy, idx) => {
      const cobGroup = new THREE.Group();
      // Yellow Corn Ear
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 6), kernelMat);
      cobGroup.add(ear);
      // Husk leaves wrapping ear
      const husk = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 4), huskMat);
      husk.position.y = -0.1;
      cobGroup.add(husk);
      // Silk on top
      const silk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.15, 4), silkMat);
      silk.position.y = 0.3;
      cobGroup.add(silk);

      const sideAng = idx === 0 ? 0.6 : -0.6;
      cobGroup.position.set(Math.sin(sideAng) * 0.18, cy, Math.cos(sideAng) * 0.18);
      cobGroup.rotation.z = sideAng * 0.5;
      group.add(cobGroup);
    });

    return group;
  }

  function createWatermelonMesh(isGolden) {
    const group = new THREE.Group();
    // Vines on ground
    const vineMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    for (let i = 0; i < 4; i++) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.8), vineMat);
      const ang = (i / 4) * Math.PI * 2;
      v.position.set(Math.cos(ang) * 0.5, 0.05, Math.sin(ang) * 0.5);
      v.rotation.y = ang;
      group.add(v);
    }

    // Large Striped Watermelon
    const melonMat = new THREE.MeshLambertMaterial({ color: isGolden ? 0xffd700 : 0x2e7d32 });
    const melon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 9, 8), melonMat);
    melon.scale.set(1.35, 1.0, 1.0);
    melon.position.y = 0.48;

    // Light Green Stripes
    if (!isGolden) {
      const stripeMat = new THREE.MeshLambertMaterial({ color: 0x81c784 });
      for (let s = 0; s < 4; s++) {
        const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.04, 4, 8), stripeMat);
        stripe.scale.set(1.36, 1.01, 1.01);
        stripe.rotation.y = (s / 4) * Math.PI;
        melon.add(stripe);
      }
    }
    group.add(melon);
    return group;
  }

  function createSunflowerMesh(isGolden) {
    const group = new THREE.Group();
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x388e3c });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
    const petalMat = new THREE.MeshLambertMaterial({ color: 0xffeb3b });
    const centerMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });

    // Robust Stalk
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.8, 6), stemMat);
    stalk.position.y = 0.9;
    group.add(stalk);

    // Big Heart-shaped leaves
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 5, 4), leafMat);
      leaf.scale.set(1.5, 0.2, 1.0);
      const ang = (i / 4) * Math.PI * 2;
      leaf.position.set(Math.cos(ang) * 0.35, 0.45 + (i * 0.3), Math.sin(ang) * 0.35);
      leaf.rotation.y = ang;
      group.add(leaf);
    }

    // Flower Head Facing Player
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.75, 0.2);
    headGroup.rotation.x = -Math.PI / 8;

    // Dark Seed Disc
    const center = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 10), centerMat);
    center.rotation.x = Math.PI / 2;
    headGroup.add(center);

    // 12 Radiating Golden Petals
    for (let p = 0; p < 12; p++) {
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 4), petalMat);
      const pAng = (p / 12) * Math.PI * 2;
      petal.position.set(Math.cos(pAng) * 0.45, Math.sin(pAng) * 0.45, 0);
      petal.rotation.z = pAng - Math.PI / 2;
      headGroup.add(petal);
    }

    group.add(headGroup);
    return group;
  }

  function render3DCrop(plot) {
    while (plot.cropGroup.children.length > 0) {
      plot.cropGroup.remove(plot.cropGroup.children[0]);
    }
    if (!plot.planted) return;

    let model;
    if (plot.stage === 1) {
      model = createSproutMesh();
    } else if (plot.stage === 2) {
      model = createGrowingBushMesh(CROPS[plot.planted].col);
    } else { // Stage 3: Fully Grown High-Def 3D Model
      const type = plot.planted;
      if (type === 'wheat') model = createWheatMesh(plot.isGolden);
      else if (type === 'carrot') model = createCarrotMesh(plot.isGolden);
      else if (type === 'tomato') model = createTomatoMesh(plot.isGolden);
      else if (type === 'pumpkin') model = createPumpkinMesh(plot.isGolden);
      else if (type === 'strawberry') model = createStrawberryMesh(plot.isGolden);
      else if (type === 'corn') model = createCornMesh(plot.isGolden);
      else if (type === 'watermelon') model = createWatermelonMesh(plot.isGolden);
      else if (type === 'sunflower') model = createSunflowerMesh(plot.isGolden);
      else model = createWheatMesh(plot.isGolden);
    }

    plot.cropGroup.add(model);
  }

  // --- DETAILED PROCEDURAL 3D ANIMALS ---

  function buildAnimals() {
    g.animals.forEach(a => spawnAnimalMesh(a));

    // Farm Dog (Max)
    dogMesh = new THREE.Group();
    const dogBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.75), new THREE.MeshLambertMaterial({ color: 0xc87d32 }));
    dogBody.position.y = 0.38;
    dogBody.castShadow = true;
    dogMesh.add(dogBody);

    // White Chest Patch
    const chest = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    chest.position.set(0, 0.38, 0.38);
    dogMesh.add(chest);

    // Head with Floppy Ears
    const dogHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshLambertMaterial({ color: 0xc87d32 }));
    dogHead.position.set(0, 0.7, 0.35);
    dogMesh.add(dogHead);

    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), new THREE.MeshLambertMaterial({ color: 0x8d5b2d }));
    earL.position.set(-0.2, 0.65, 0.35);
    dogMesh.add(earL);
    const earR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), new THREE.MeshLambertMaterial({ color: 0x8d5b2d }));
    earR.position.set(0.2, 0.65, 0.35);
    dogMesh.add(earR);

    // Snout with Dark Nose
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.22), new THREE.MeshLambertMaterial({ color: 0x5d4037 }));
    snout.position.set(0, 0.65, 0.56);
    dogMesh.add(snout);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), new THREE.MeshLambertMaterial({ color: 0x212121 }));
    nose.position.set(0, 0.7, 0.68);
    dogMesh.add(nose);

    // Red Collar with Gold Tag
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 8), new THREE.MeshLambertMaterial({ color: 0xd32f2f }));
    collar.position.set(0, 0.54, 0.32);
    dogMesh.add(collar);
    const tag = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), new THREE.MeshLambertMaterial({ color: 0xffd700 }));
    tag.position.set(0, 0.52, 0.48);
    dogMesh.add(tag);

    // Wagging Tail
    dogTail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), new THREE.MeshLambertMaterial({ color: 0xc87d32 }));
    dogTail.position.set(0, 0.52, -0.42);
    dogTail.rotation.x = -Math.PI / 4;
    dogMesh.add(dogTail);

    dogMesh.position.set(2, 0, 4);
    scene.add(dogMesh);
  }

  function spawnAnimalMesh(a) {
    const mesh = new THREE.Group();

    if (a.type === 'chicken') {
      // White Plump Body
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 7, 7), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      body.scale.set(0.9, 1.0, 1.2);
      body.position.y = 0.3;
      mesh.add(body);

      // Red Wobbly Comb
      const comb = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4), new THREE.MeshLambertMaterial({ color: 0xe53935 }));
      comb.position.set(0, 0.54, 0.15);
      mesh.add(comb);

      // Yellow Beak & Red Wattle
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.15, 4), new THREE.MeshLambertMaterial({ color: 0xffa000 }));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.36, 0.32);
      mesh.add(beak);
      const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), new THREE.MeshLambertMaterial({ color: 0xe53935 }));
      wattle.position.set(0, 0.26, 0.26);
      mesh.add(wattle);

      // Wings on sides
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.26), new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }));
      wingL.position.set(-0.25, 0.3, 0);
      mesh.add(wingL);
      const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.26), new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }));
      wingR.position.set(0.25, 0.3, 0);
      mesh.add(wingR);

    } else if (a.type === 'cow') {
      // Holstein White Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 1.3), new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }));
      body.position.y = 0.55;
      mesh.add(body);

      // Black Spots on Body
      const spot1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.35), new THREE.MeshLambertMaterial({ color: 0x212121 }));
      spot1.position.set(0.43, 0.6, 0.2);
      spot1.rotation.y = Math.PI / 2;
      mesh.add(spot1);
      const spot2 = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.3), new THREE.MeshLambertMaterial({ color: 0x212121 }));
      spot2.position.set(-0.43, 0.55, -0.25);
      spot2.rotation.y = -Math.PI / 2;
      mesh.add(spot2);

      // Head & Pink Muzzle
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshLambertMaterial({ color: 0x212121 }));
      head.position.set(0, 0.85, 0.65);
      mesh.add(head);
      const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.2), new THREE.MeshLambertMaterial({ color: 0xf8bbd0 }));
      muzzle.position.set(0, 0.75, 0.88);
      mesh.add(muzzle);

      // Horns
      const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), new THREE.MeshLambertMaterial({ color: 0xd7ccc8 }));
      hornL.position.set(-0.2, 1.12, 0.65);
      hornL.rotation.z = -0.3;
      mesh.add(hornL);
      const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), new THREE.MeshLambertMaterial({ color: 0xd7ccc8 }));
      hornR.position.set(0.2, 1.12, 0.65);
      hornR.rotation.z = 0.3;
      mesh.add(hornR);

      // Pink Udder
      const udder = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.35), new THREE.MeshLambertMaterial({ color: 0xf8bbd0 }));
      udder.position.set(0, 0.22, -0.2);
      mesh.add(udder);

    } else if (a.type === 'sheep') {
      // Fluffy Cloud Body (6 Clustered Wool Spheres)
      const woolMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const woolGroup = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const wSphere = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6), woolMat);
        const wAng = (i / 6) * Math.PI * 2;
        wSphere.position.set(Math.cos(wAng) * 0.24, 0.5 + ((i % 2) * 0.08), Math.sin(wAng) * 0.35);
        woolGroup.add(wSphere);
      }
      mesh.add(woolGroup);

      // Black Face & Ears
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.35), new THREE.MeshLambertMaterial({ color: 0x2e2e2e }));
      face.position.set(0, 0.62, 0.52);
      mesh.add(face);
      const earL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), new THREE.MeshLambertMaterial({ color: 0x2e2e2e }));
      earL.position.set(-0.22, 0.65, 0.45);
      mesh.add(earL);
      const earR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), new THREE.MeshLambertMaterial({ color: 0x2e2e2e }));
      earR.position.set(0.22, 0.65, 0.45);
      mesh.add(earR);

    } else { // Pig
      // Cute Pink Rounded Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.52, 0.95), new THREE.MeshLambertMaterial({ color: 0xf48fb1 }));
      body.position.y = 0.45;
      mesh.add(body);

      // Head, Floppy Ears & Pig Snout
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), new THREE.MeshLambertMaterial({ color: 0xf48fb1 }));
      head.position.set(0, 0.62, 0.52);
      mesh.add(head);

      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.12), new THREE.MeshLambertMaterial({ color: 0xf06292 }));
      snout.position.set(0, 0.58, 0.72);
      mesh.add(snout);

      const earL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 4), new THREE.MeshLambertMaterial({ color: 0xf06292 }));
      earL.position.set(-0.18, 0.82, 0.48);
      earL.rotation.z = -0.5;
      mesh.add(earL);
      const earR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 4), new THREE.MeshLambertMaterial({ color: 0xf06292 }));
      earR.position.set(0.18, 0.82, 0.48);
      earR.rotation.z = 0.5;
      mesh.add(earR);

      // Curly Tail
      const tail = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 4, 6), new THREE.MeshLambertMaterial({ color: 0xf06292 }));
      tail.position.set(0, 0.52, -0.5);
      mesh.add(tail);
    }

    mesh.position.set(a.x, 0, a.z);
    scene.add(mesh);
    animalEntities.push({ data: a, mesh });
  }

  function syncPlotsToState() {
    g.plots = plots.map(p => ({
      planted: p.planted,
      stage: p.stage,
      progress: p.progress,
      watered: p.watered,
      ready: p.ready,
      isGolden: p.isGolden
    }));
  }

  // --- ACTIONS & PROXIMITY ---
  function selectTool(toolKey) {
    if (CROPS[toolKey] && CROPS[toolKey].unlockLvl > g.level) {
      toast(`🔒 Se desbloquea en Nivel ${CROPS[toolKey].unlockLvl}`);
      return;
    }
    g.activeTool = toolKey;
    document.querySelectorAll('.tool-slot').forEach(el => el.classList.remove('active'));
    const el = document.getElementById('slot-' + toolKey);
    if (el) el.classList.add('active');
  }

  function checkPlotProximity() {
    const px = player.position.x;
    const pz = player.position.z;
    const promptEl = document.getElementById('action-prompt');

    let nearestPlot = null;
    let minDist = 2.1;

    for (let p of plots) {
      const dist = Math.hypot(px - p.mesh.position.x, pz - p.mesh.position.z);
      if (dist < minDist) {
        minDist = dist;
        nearestPlot = p;
      }
    }

    const showPrompt = (icon, text, action = null) => {
      currentAction = action;
      document.getElementById('prompt-icon').textContent = icon;
      document.getElementById('prompt-txt').textContent = text;
      promptEl.style.display = 'flex';
    };

    if (nearestPlot) {
      if (!nearestPlot.planted) {
        if (!CROPS[g.activeTool]) {
          showPrompt('🌱', 'Elige una semilla para plantar');
          return;
        }
        const cropKey = g.activeTool;
        const c = CROPS[cropKey];
        showPrompt('🌱', `Plantar ${c.nm} (${c.buy}🪙)`, () => {
          if (g.coins < c.buy) {
            toast('🪙 Monedas insuficientes');
            return;
          }
          g.coins -= c.buy;
          g.stats.planted++;
          nearestPlot.planted = cropKey;
          nearestPlot.stage = 1;
          nearestPlot.progress = 0;
          nearestPlot.ready = false;
          nearestPlot.isGolden = Math.random() < 0.07;
          nearestPlot.watered = g.upgrades.water > 0;
          nearestPlot.mesh.material.color.setHex(nearestPlot.watered ? 0x4a2e16 : 0x8d5b2d);
          render3DCrop(nearestPlot);
          sfxPlant();
          saveGame();
          updateHUD();
          checkPlotProximity();
        });
        return;
      } else if (nearestPlot.ready) {
        if (g.activeTool !== 'hand') {
          showPrompt('✋', 'Selecciona Mano para cosechar');
          return;
        }
        showPrompt('✨', `Cosechar ${CROPS[nearestPlot.planted].nm}`, () => {
          if (countInv() >= getInvMax()) {
            toast('🎒 Mochila llena');
            return;
          }
          const crop = CROPS[nearestPlot.planted];
          const itemIcon = nearestPlot.isGolden ? '✨' + crop.em : crop.em;
          g.inventory[itemIcon] = (g.inventory[itemIcon] || 0) + 1;
          g.stats.harvested++;
          if (nearestPlot.isGolden) sfxGolden(); else sfxHarvest();
          nearestPlot.planted = null;
          nearestPlot.stage = 0;
          nearestPlot.ready = false;
          nearestPlot.isGolden = false;
          nearestPlot.mesh.material.color.setHex(0x8d5b2d);
          render3DCrop(nearestPlot);
          addXP(8);
          toast(`+1 ${crop.em} ${crop.nm}`);
          saveGame();
          updateHUD();
          checkPlotProximity();
        });
        return;
      } else if (!nearestPlot.watered) {
        if (g.activeTool !== 'water') {
          showPrompt('💧', 'Selecciona Regar para cuidar el cultivo');
          return;
        }
        showPrompt('💧', 'Regar cultivo', () => {
          nearestPlot.watered = true;
          nearestPlot.mesh.material.color.setHex(0x4a2e16);
          sfxWater();
          saveGame();
          checkPlotProximity();
        });
        return;
      }

      const crop = CROPS[nearestPlot.planted];
      const progress = Math.min(99, Math.floor(((nearestPlot.stage - 1 + nearestPlot.progress) / 2) * 100));
      showPrompt(crop.em, `${crop.nm} creciendo · ${progress}%`);
      return;
    }

    currentAction = null;
    promptEl.style.display = 'none';
  }

  function triggerAction() {
    if (document.getElementById('overlay').classList.contains('on')) return;
    initAudio();
    if (currentAction) currentAction();
  }

  // --- UI CONTROLLER ---
  function updateHUD() {
    document.getElementById('coins').textContent = g.coins.toLocaleString();
    document.getElementById('gems').textContent = g.gems;
    document.getElementById('lvl').textContent = g.level;
    const xpPct = Math.min(100, Math.floor((g.xp / g.xpNext) * 100));
    document.getElementById('xp-bar').style.width = xpPct + '%';
    document.getElementById('day').textContent = g.day;
    const hh = String(Math.floor(g.timeMin / 60)).padStart(2, '0');
    const mm = String(Math.floor(g.timeMin % 60)).padStart(2, '0');
    document.getElementById('time-str').textContent = `${hh}:${mm}`;
    document.getElementById('inv-count').textContent = `${countInv()}/${getInvMax()}`;

    const mission = MISSIONS[g.missionIdx % MISSIONS.length];
    if (mission) {
      document.getElementById('mission-txt').textContent = `${mission.txt} (+${mission.rwCoins}🪙)`;
    }
  }

  function openModal(html) {
    const m = document.getElementById('modal');
    m.innerHTML = html;
    document.getElementById('overlay').classList.add('on');
  }

  function closeModal() {
    document.getElementById('overlay').classList.remove('on');
  }

  function openShop() {
    let h = `<h2>🛒 Tienda del Granjero</h2>`;
    h += `<h3 style="font-size:13px;color:#FFE082;margin:8px 0 4px;">🌱 Semillas</h3>`;
    for (let k in CROPS) {
      const c = CROPS[k];
      const locked = c.unlockLvl > g.level;
      const canAfford = g.coins >= c.buy;
      h += `<div class="si-card">
        <div class="si-icon">${c.em}</div>
        <div class="si-info">
          <div class="si-nm">${c.nm} ${locked ? '🔒 (Nv.'+c.unlockLvl+')' : ''}</div>
          <div class="si-ds">Crece: ${c.gt}s · Venta: ${Math.floor(c.sell * getPriceMult())}🪙</div>
        </div>
        <button class="bb-action buy" onclick="window.farmApp.buyCrop('${k}')" ${locked || !canAfford ? 'disabled' : ''}>
          ${c.buy} 🪙
        </button>
      </div>`;
    }

    h += `<h3 style="font-size:13px;color:#FFE082;margin:12px 0 4px;">🐔 Animales</h3>`;
    for (let k in ANIMALS) {
      const a = ANIMALS[k];
      const count = g.animals.filter(x => x.type === k).length;
      const locked = a.unlockLvl > g.level;
      const canAfford = g.coins >= a.buy;
      h += `<div class="si-card">
        <div class="si-icon">${a.em}</div>
        <div class="si-info">
          <div class="si-nm">${a.nm} (Tienes: ${count})</div>
          <div class="si-ds">Produce ${a.res} cada ${a.rate}s · Vende: ${a.sp}🪙</div>
        </div>
        <button class="bb-action buy" onclick="window.farmApp.buyAnimal('${k}')" ${locked || !canAfford ? 'disabled' : ''}>
          ${a.buy} 🪙
        </button>
      </div>`;
    }
    h += `<button class="bcl" onclick="window.farmApp.closeModal()">Cerrar</button>`;
    openModal(h);
  }

  function buyAnimal(k) {
    const a = ANIMALS[k];
    if (g.coins < a.buy) return;
    g.coins -= a.buy;
    const newAnimal = { type: k, x: -11, z: 7, tx: -11, tz: 7, timer: 0 };
    g.animals.push(newAnimal);
    spawnAnimalMesh(newAnimal);
    sfxBuy();
    toast(`🎉 ¡Has comprado un(a) ${a.nm}!`);
    updateHUD();
    openShop();
  }

  function openInv() {
    let h = `<h2>🎒 Mochila de Productos</h2>`;
    h += `<p style="text-align:center;font-size:12px;color:#D7CCC8;margin-bottom:8px">Espacio: ${countInv()}/${getInvMax()}</p>`;
    let hasAny = false;
    for (let icon in g.inventory) {
      const amt = g.inventory[icon];
      if (amt > 0) {
        hasAny = true;
        h += `<div class="si-card">
          <div class="si-icon">${icon}</div>
          <div class="si-info"><div class="si-nm">Cantidad: x${amt}</div></div>
          <button class="bb-action sell" onclick="window.farmApp.sellSingle('${icon}')">Vender</button>
        </div>`;
      }
    }
    if (!hasAny) h += `<p style="text-align:center;padding:16px;">Mochila vacía. ¡Cosecha productos!</p>`;
    h += `<button class="bcl" onclick="window.farmApp.closeModal()">Cerrar</button>`;
    openModal(h);
  }

  function sellSingle(icon) {
    const amt = g.inventory[icon] || 0;
    if (amt <= 0) return;
    let price = 15;
    for (let k in CROPS) {
      if (CROPS[k].em === icon) price = CROPS[k].sell;
      if ('✨' + CROPS[k].em === icon) price = CROPS[k].sell * 4;
    }
    for (let k in ANIMALS) if (ANIMALS[k].res === icon) price = ANIMALS[k].sp;
    for (let k in RECIPES) if (RECIPES[k].em === icon) price = RECIPES[k].sell;

    const total = Math.floor(price * getPriceMult()) * amt;
    g.coins += total;
    g.stats.sold += amt;
    g.stats.totalEarned += total;
    g.inventory[icon] = 0;
    sfxSell();
    toast(`💰 +${total} monedas obtenidas`);
    updateHUD();
    openInv();
  }

  function sellAll() {
    let total = 0, count = 0;
    for (let icon in g.inventory) {
      const amt = g.inventory[icon];
      if (amt > 0) {
        let price = 15;
        for (let k in CROPS) {
          if (CROPS[k].em === icon) price = CROPS[k].sell;
          if ('✨' + CROPS[k].em === icon) price = CROPS[k].sell * 4;
        }
        for (let k in ANIMALS) if (ANIMALS[k].res === icon) price = ANIMALS[k].sp;
        for (let k in RECIPES) if (RECIPES[k].em === icon) price = RECIPES[k].sell;
        total += Math.floor(price * getPriceMult()) * amt;
        count += amt;
        g.inventory[icon] = 0;
      }
    }
    if (count === 0) { toast('🎒 Nada para vender'); return; }
    g.coins += total;
    g.stats.sold += count;
    g.stats.totalEarned += total;
    sfxSell();
    toast(`💰 ¡Has vendido ${count} productos por ${total} monedas!`);
    updateHUD();
  }

  function openKitchen() {
    let h = `<h2>🍳 Molino & Cocina</h2>`;
    h += `<p style="text-align:center;font-size:11px;color:#D7CCC8;margin-bottom:10px">Elabora recetas deliciosas de alto valor</p>`;
    for (let k in RECIPES) {
      const r = RECIPES[k];
      let canCook = true;
      let reqArr = [];
      for (let ing in r.req) {
        const have = g.inventory[ing] || 0;
        const need = r.req[ing];
        reqArr.push(`${ing} ${have}/${need}`);
        if (have < need) canCook = false;
      }
      h += `<div class="si-card">
        <div class="si-icon">${r.em}</div>
        <div class="si-info">
          <div class="si-nm">${r.nm}</div>
          <div class="si-ds">Ingredientes: ${reqArr.join(' · ')} · Venta: ${Math.floor(r.sell * getPriceMult())}🪙</div>
        </div>
        <button class="bb-action cook" onclick="window.farmApp.cookRecipe('${k}')" ${!canCook ? 'disabled' : ''}>Cocinar</button>
      </div>`;
    }
    h += `<button class="bcl" onclick="window.farmApp.closeModal()">Cerrar</button>`;
    openModal(h);
  }

  function cookRecipe(k) {
    const r = RECIPES[k];
    for (let ing in r.req) {
      if ((g.inventory[ing] || 0) < r.req[ing]) return;
    }
    for (let ing in r.req) {
      g.inventory[ing] -= r.req[ing];
    }
    g.inventory[r.em] = (g.inventory[r.em] || 0) + 1;
    g.stats.cooked++;
    addXP(r.xp);
    sfxGolden();
    toast(`🍳 ¡Cocinado: ${r.nm}! (+${r.xp} XP)`);
    updateHUD();
    openKitchen();
  }

  function openUpgrades() {
    let h = `<h2>⬆️ Mejoras de Granja</h2>`;
    UPGRADES.forEach(u => {
      const cur = g.upgrades[u.id] || 0;
      const isMax = cur >= u.max;
      const cost = Math.floor(u.base * Math.pow(u.mult, cur));
      h += `<div class="si-card">
        <div class="si-info">
          <div class="si-nm">${u.nm} (Nv. ${cur}/${u.max})</div>
          <div class="si-ds">${u.desc}</div>
        </div>
        <button class="bb-action buy" onclick="window.farmApp.buyUpgrade('${u.id}')" ${isMax || g.coins < cost ? 'disabled' : ''}>
          ${isMax ? 'MAX' : cost + ' 🪙'}
        </button>
      </div>`;
    });
    h += `<button class="bcl" onclick="window.farmApp.closeModal()">Cerrar</button>`;
    openModal(h);
  }

  function buyUpgrade(id) {
    const u = UPGRADES.find(x => x.id === id);
    const cur = g.upgrades[id] || 0;
    if (cur >= u.max) return;
    const cost = Math.floor(u.base * Math.pow(u.mult, cur));
    if (g.coins < cost) return;
    g.coins -= cost;
    g.upgrades[id]++;
    sfxBuy();
    toast(`⬆️ ¡Mejora: ${u.nm}!`);
    updateHUD();
    openUpgrades();
  }

  function checkMissions() {
    const m = MISSIONS[g.missionIdx % MISSIONS.length];
    if (m && m.check(g)) {
      g.coins += m.rwCoins;
      addXP(m.rwXP);
      sfxGolden();
      toast(`🎉 ¡Misión Completada! +${m.rwCoins}🪙 y +${m.rwXP}XP`);
      g.missionIdx++;
      updateHUD();
    }
  }

  // --- GAME LOOP ---
  function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    // Time of day
    g.timeMin += dt * 4.5;
    if (g.timeMin >= 1440) {
      g.timeMin = 0;
      g.day++;
      plots.forEach(p => {
        p.watered = g.upgrades.water > 0;
        p.mesh.material.color.setHex(p.watered ? 0x4a2e16 : 0x8d5b2d);
      });
      saveGame();
      toast(`🌅 ¡Comienza el Día ${g.day}!`);
      updateHUD();
    }

    // Day/Night Soft Sky & Comfortable Lighting
    const t = g.timeMin / 1440;
    let skyHex = 0x6ea8cd, sunIntensity = 0.52, hemiIntensity = 0.42;

    if (t < 0.22 || t > 0.90) { // Deep Peaceful Night (22:00 - 05:15)
      skyHex = 0x161f30;
      sunIntensity = 0.22;
      hemiIntensity = 0.25;
      dirLight.color.setHex(0x7b9acc); // Cool moonlight
    } else if (t < 0.32) { // Soft Golden Dawn (05:15 - 07:40)
      skyHex = 0xc49c89;
      sunIntensity = 0.44;
      hemiIntensity = 0.36;
      dirLight.color.setHex(0xffdfba);
    } else if (t > 0.76) { // Cozy Warm Sunset (18:15 - 21:35)
      skyHex = 0xb87363;
      sunIntensity = 0.46;
      hemiIntensity = 0.35;
      dirLight.color.setHex(0xffaa70);
    } else { // Clear Cozy Daytime (07:40 - 18:15)
      skyHex = 0x6ea8cd;
      sunIntensity = 0.52;
      hemiIntensity = 0.42;
      dirLight.color.setHex(0xfff8e7);
    }

    scene.background.setHex(skyHex);
    scene.fog.color.setHex(skyHex);
    dirLight.intensity = sunIntensity;
    hemiLight.intensity = hemiIntensity;

    if (windmillBlades) windmillBlades.rotation.z += dt * 1.5;

    // Player Update & Controls
    if (toolWaterCan) toolWaterCan.visible = (g.activeTool === 'water');

    let moveX = 0, moveZ = 0;
    if (keys['w'] || keys['arrowup']) moveZ -= 1;
    if (keys['s'] || keys['arrowdown']) moveZ += 1;
    if (keys['a'] || keys['arrowleft']) moveX -= 1;
    if (keys['d'] || keys['arrowright']) moveX += 1;
    if (joyDir.x !== 0 || joyDir.y !== 0) { moveX = joyDir.x; moveZ = joyDir.y; }

    const len = Math.hypot(moveX, moveZ);
    if (len > 0.05) {
      const spd = 6.2 * dt;
      player.position.x += (moveX / (len > 1 ? len : 1)) * spd;
      player.position.z += (moveZ / (len > 1 ? len : 1)) * spd;
      player.position.x = Math.max(-24, Math.min(24, player.position.x));
      player.position.z = Math.max(-24, Math.min(24, player.position.z));
      player.rotation.y = Math.atan2(moveX, moveZ);

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

    // Camera Smooth Follow
    const targetCamX = player.position.x + 12;
    const targetCamY = 16;
    const targetCamZ = player.position.z + 14;
    camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.08);
    camera.lookAt(player.position.x, player.position.y + 1, player.position.z);

    // Crops growth & subtle wind sway
    plots.forEach(p => {
      if (p.planted && !p.ready) {
        const crop = CROPS[p.planted];
        const waterBoost = p.watered ? 1.4 : 0.7;
        const speedBoost = 1 + (g.upgrades.speed || 0) * 0.15;
        p.progress += (2 / crop.gt) * waterBoost * speedBoost * dt;
        if (p.progress >= 1) {
          p.progress = 0;
          p.stage++;
          if (p.stage >= 3) p.ready = true;
          render3DCrop(p);
        }
      }

      // Gentle wind breeze animation on crops
      if (p.cropGroup && p.stage > 1) {
        p.cropGroup.rotation.z = Math.sin(now * 0.003 + p.c) * 0.05;
        // Bouncy squash & stretch when ready to harvest
        if (p.ready) {
          const bounce = 1.0 + Math.sin(now * 0.006 + p.r) * 0.08;
          p.cropGroup.scale.set(bounce, bounce, bounce);
        }
      }
    });

    // Animals AI
    animalEntities.forEach(ent => {
      const a = ent.data;
      const def = ANIMALS[a.type];
      if (def) {
        a.timer += dt;
        if (a.timer >= def.rate) {
          a.timer = 0;
          if (countInv() < getInvMax()) {
            g.inventory[def.res] = (g.inventory[def.res] || 0) + 1;
            sfxAnimal();
          }
        }
      }
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
      const dx = player.position.x + 1.2 - dogMesh.position.x;
      const dz = player.position.z + 1.2 - dogMesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1.4) {
        dogMesh.position.x += (dx / dist) * 4.8 * dt;
        dogMesh.position.z += (dz / dist) * 4.8 * dt;
        dogMesh.rotation.y = Math.atan2(dx, dz);
      }
    }

    checkPlotProximity();
    checkMissions();

    renderer.render(scene, camera);
  }

  // --- GLOBAL EXPORTS FOR MODAL BUTTONS ---
  window.farmApp = {
    buyCrop: selectTool,
    buyAnimal,
    sellSingle,
    cookRecipe,
    buyUpgrade,
    closeModal
  };

  // --- BOOTSTRAP ---
  function start() {
    loadGame();
    initWorld();
    updateHUD();

    // Toolbar event bindings
    document.getElementById('snd-toggle').onclick = toggleAudio;
    document.getElementById('btn-shop').onclick = openShop;
    document.getElementById('btn-inv').onclick = openInv;
    document.getElementById('btn-cook').onclick = openKitchen;
    document.getElementById('btn-upg').onclick = openUpgrades;
    document.getElementById('btn-sell').onclick = sellAll;
    document.getElementById('action-prompt').onclick = triggerAction;
    const mobAct = document.getElementById('btn-mobile-act');
    if (mobAct) mobAct.onclick = triggerAction;

    document.getElementById('overlay').onclick = e => {
      if (e.target.id === 'overlay') closeModal();
    };

    const tools = ['hand', 'water', 'wheat', 'carrot', 'tomato', 'pumpkin', 'strawberry', 'corn', 'watermelon', 'sunflower'];
    tools.forEach(t => {
      const el = document.getElementById('slot-' + t);
      if (el) el.onclick = () => selectTool(t);
    });

    requestAnimationFrame(gameLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
