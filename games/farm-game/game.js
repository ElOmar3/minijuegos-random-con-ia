/* ==========================================================================
   GRANJA MÁGICA 3D — FULL ENGINE (Three.js Low-Poly)
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

  // --- THREE.JS 3D SCENE ---
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
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 35, 80);

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

    // Lights
    hemiLight = new THREE.HemisphereLight(0xffffff, 0x446622, 0.7);
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xfffaed, 0.85);
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
    // Ground
    const groundGeo = new THREE.PlaneGeometry(85, 85, 16, 16);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x5dae3c });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Stone Path
    const pathMat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
    const path = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 24), pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, 0);
    scene.add(path);

    // Trees
    [[-18, -14], [-14, -18], [16, -14], [18, 12], [-18, 16], [14, 16], [-12, -8], [12, -8], [20, 0], [-20, 0], [0, -18]].forEach(p => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.4, 6), new THREE.MeshLambertMaterial({ color: 0x6d4c41 }));
      trunk.position.y = 0.7;
      trunk.castShadow = true;
      tree.add(trunk);
      const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), new THREE.MeshLambertMaterial({ color: 0x388e3c }));
      leaves.position.y = 2.0;
      leaves.castShadow = true;
      tree.add(leaves);
      tree.position.set(p[0], 0, p[1]);
      scene.add(tree);
    });

    // Barn
    const barn = new THREE.Group();
    const barnMesh = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.8, 4.5), new THREE.MeshLambertMaterial({ color: 0xc62828 }));
    barnMesh.position.y = 1.9;
    barnMesh.castShadow = true;
    barn.add(barnMesh);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.2, 4), new THREE.MeshLambertMaterial({ color: 0x37474f }));
    roof.position.y = 4.8;
    roof.rotation.y = Math.PI / 4;
    barn.add(roof);
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

    // Pond
    const pond = new THREE.Mesh(new THREE.CircleGeometry(3.6, 16), new THREE.MeshLambertMaterial({ color: 0x29b6f6 }));
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(13, 0.02, 9);
    scene.add(pond);

    // Fence
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
    const fenceTop = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 0.15), fenceMat);
    fenceTop.position.set(-11, 0.25, 3);
    scene.add(fenceTop);
    const fenceBot = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 0.15), fenceMat);
    fenceBot.position.set(-11, 0.25, 11);
    scene.add(fenceBot);
  }

  function buildPlayer() {
    player = new THREE.Group();

    body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.9, 8), new THREE.MeshLambertMaterial({ color: 0x1976D2 }));
    body.position.y = 0.85;
    body.castShadow = true;
    player.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshLambertMaterial({ color: 0xffcc80 }));
    head.position.y = 1.5;
    player.add(head);

    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.05, 8), new THREE.MeshLambertMaterial({ color: 0xfbc02d }));
    hatBrim.position.y = 1.68;
    player.add(hatBrim);

    const hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.4, 8), new THREE.MeshLambertMaterial({ color: 0xfbc02d }));
    hatTop.position.y = 1.9;
    player.add(hatTop);

    legL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 6), new THREE.MeshLambertMaterial({ color: 0x0d47a1 }));
    legL.position.set(-0.2, 0.25, 0);
    player.add(legL);

    legR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 6), new THREE.MeshLambertMaterial({ color: 0x0d47a1 }));
    legR.position.set(0.2, 0.25, 0);
    player.add(legR);

    armR = new THREE.Group();
    const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 6), new THREE.MeshLambertMaterial({ color: 0x1976D2 }));
    armMesh.position.y = -0.25;
    armR.add(armMesh);
    armR.position.set(0.42, 1.2, 0);

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

    // Touch Virtual Joystick
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

  function render3DCrop(plot) {
    while (plot.cropGroup.children.length > 0) {
      plot.cropGroup.remove(plot.cropGroup.children[0]);
    }
    if (!plot.planted) return;

    const crop = CROPS[plot.planted];
    const scale = 0.25 + (plot.stage / 3) * 0.75;

    if (plot.stage === 1) {
      const sprout = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 5), new THREE.MeshLambertMaterial({ color: 0x76ff03 }));
      sprout.position.y = 0.2;
      plot.cropGroup.add(sprout);
    } else if (plot.stage === 2) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.8, 6), new THREE.MeshLambertMaterial({ color: 0x4caf50 }));
      stem.position.y = 0.4;
      plot.cropGroup.add(stem);
    } else {
      const matColor = plot.isGolden ? 0xFFD700 : crop.col;
      const mat = new THREE.MeshLambertMaterial({ color: matColor });
      let fruit;
      if (plot.planted === 'pumpkin') {
        fruit = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), mat);
        fruit.scale.set(1.2, 0.9, 1.2);
      } else if (plot.planted === 'carrot') {
        fruit = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 6), mat);
        fruit.rotation.x = Math.PI;
      } else if (plot.planted === 'wheat' || plot.planted === 'corn') {
        fruit = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 1.1, 5), mat);
      } else if (plot.planted === 'sunflower') {
        fruit = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 8), mat);
        fruit.rotation.x = Math.PI / 3;
      } else {
        fruit = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), mat);
      }
      fruit.position.y = 0.5;
      fruit.castShadow = true;
      plot.cropGroup.add(fruit);
    }
    plot.cropGroup.scale.set(scale, scale, scale);
  }

  function buildAnimals() {
    g.animals.forEach(a => spawnAnimalMesh(a));

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

  function spawnAnimalMesh(a) {
    const mesh = new THREE.Group();
    if (a.type === 'chicken') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      b.position.y = 0.25;
      mesh.add(b);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 4), new THREE.MeshLambertMaterial({ color: 0xffa000 }));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.3, 0.22);
      mesh.add(beak);
    } else if (a.type === 'cow') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.2), new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }));
      b.position.y = 0.5;
      mesh.add(b);
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0x212121 }));
      h.position.set(0, 0.8, 0.6);
      mesh.add(h);
    } else if (a.type === 'sheep') {
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      b.position.y = 0.45;
      mesh.add(b);
    } else {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.9), new THREE.MeshLambertMaterial({ color: 0xf48fb1 }));
      b.position.y = 0.4;
      mesh.add(b);
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

  // --- ACTIONS ---
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

    // Day/Night Sky & Lights
    const t = g.timeMin / 1440;
    let skyHex = 0x87CEEB, lightIntensity = 0.85;
    if (t < 0.25 || t > 0.85) { skyHex = 0x0d1b2a; lightIntensity = 0.25; }
    else if (t < 0.35) { skyHex = 0xffb703; lightIntensity = 0.65; }
    else if (t > 0.75) { skyHex = 0xe85d04; lightIntensity = 0.7; }
    scene.background.setHex(skyHex);
    scene.fog.color.setHex(skyHex);
    dirLight.intensity = lightIntensity;

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

    // Crops growth
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
