/**
 * EL ABISMO 3D: DEEPCORE PROTOCOL
 * Bucle Principal 3D Optimizado con Powerups y Control Suave
 */

(function () {
  'use strict';

  const container = document.getElementById('webgl-container');

  // Elementos HUD
  const hudOxygenVal = document.getElementById('hud-oxygen-val');
  const hudHullVal = document.getElementById('hud-hull-val');
  const hudReactorVal = document.getElementById('hud-reactor-val');
  const hudHarmonyVal = document.getElementById('hud-harmony-val');
  const hudTimerVal = document.getElementById('hud-timer-val');
  const hudWaterVal = document.getElementById('hud-water-val');

  const barOxygen = document.getElementById('bar-oxygen');
  const barHull = document.getElementById('bar-hull');
  const barReactor = document.getElementById('bar-reactor');
  const barHarmony = document.getElementById('bar-harmony');

  const promptEl = document.getElementById('action-prompt');
  const promptTxt = document.getElementById('prompt-txt');
  const radioCommsBox = document.getElementById('radio-comms-box');
  const radioSpeaker = document.getElementById('radio-speaker');
  const radioMsg = document.getElementById('radio-msg');

  // Overlays
  const startScreen = document.getElementById('start-screen');
  const pauseScreen = document.getElementById('pause-screen');
  const gameOverScreen = document.getElementById('game-over-screen');
  const victoryScreen = document.getElementById('victory-screen');

  // Botones
  const btnStart1P = document.getElementById('btn-start-1p');
  const btnStart2P = document.getElementById('btn-start-2p');
  const btnResume = document.getElementById('btn-resume');
  const btnRestartOver = document.getElementById('btn-restart-over');
  const btnRestartVic = document.getElementById('btn-restart-vic');
  const btnSound = document.getElementById('sound-btn');
  const btnPause = document.getElementById('pause-btn');
  const soundIcon = document.getElementById('sound-icon');
  const diffBtns = document.querySelectorAll('.diff-btn');

  const gameOverReason = document.getElementById('game-over-reason');
  const victoryTimeEl = document.getElementById('victory-time');

  // Configuración de Three.js
  let scene, camera, renderer;
  let world3D = null;
  let nti3D = null;
  let player1 = null;
  let player2 = null;
  let station = null;
  const audio = new AbyssAudio();

  let gameState = CONSTANTS.STATE.MENU;
  let gameMode = CONSTANTS.MODE.SINGLE;
  let currentDifficulty = CONSTANTS.DIFFICULTY.NORMAL;
  let activePlayer1P = 'bud';

  let timeSurvived = 0;
  let lastTimestamp = 0;

  const inputP1 = { up: false, down: false, left: false, right: false, interact: false };
  const inputP2 = { up: false, down: false, left: false, right: false, interact: false };

  function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020712);
    scene.fog = new THREE.FogExp2(0x020712, 0.018);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(0, 32, 24);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize);
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function startNewGame(mode) {
    audio.init();
    gameMode = mode;

    if (!scene) initThree();

    while (scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }

    world3D = new World3D(scene);
    nti3D = new NTICreature3D(scene);
    station = new Station(currentDifficulty);

    if (gameMode === CONSTANTS.MODE.SINGLE) {
      player1 = new Player3D(CONSTANTS.CHARACTERS.BUD, 440, 120, false, scene);
      player2 = new Player3D(CONSTANTS.CHARACTERS.LINDSEY, 520, 120, true, scene);
    } else {
      player1 = new Player3D(CONSTANTS.CHARACTERS.BUD, 420, 120, false, scene);
      player2 = new Player3D(CONSTANTS.CHARACTERS.LINDSEY, 540, 120, false, scene);
    }

    timeSurvived = 0;
    gameState = CONSTANTS.STATE.PLAYING;

    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');

    setupMobileControls();

    lastTimestamp = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function switch1PCharacter() {
    if (gameMode !== CONSTANTS.MODE.SINGLE || !player1 || !player2) return;
    if (activePlayer1P === 'bud') {
      activePlayer1P = 'lindsey';
      player1.isAI = true;
      player2.isAI = false;
      player1.aiLockedTask = false;
    } else {
      activePlayer1P = 'bud';
      player1.isAI = false;
      player2.isAI = true;
      player2.aiLockedTask = false;
    }
  }

  window.addEventListener('keydown', e => {
    if (gameState === CONSTANTS.STATE.PLAYING) {
      if (e.code === 'KeyW') inputP1.up = true;
      if (e.code === 'KeyS') inputP1.down = true;
      if (e.code === 'KeyA') inputP1.left = true;
      if (e.code === 'KeyD') inputP1.right = true;
      if (e.code === 'KeyE' || e.code === 'Space') {
        inputP1.interact = true;
        audio.init();
      }

      if (e.code === 'ArrowUp') { inputP2.up = true; e.preventDefault(); }
      if (e.code === 'ArrowDown') { inputP2.down = true; e.preventDefault(); }
      if (e.code === 'ArrowLeft') { inputP2.left = true; e.preventDefault(); }
      if (e.code === 'ArrowRight') { inputP2.right = true; e.preventDefault(); }
      if (e.code === 'Enter' || e.code === 'KeyM') {
        inputP2.interact = true;
        audio.init();
      }

      if (e.code === 'Tab') {
        e.preventDefault();
        switch1PCharacter();
      }

      if (e.code === 'KeyP') {
        togglePause();
      }
    }
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'KeyW') inputP1.up = false;
    if (e.code === 'KeyS') inputP1.down = false;
    if (e.code === 'KeyA') inputP1.left = false;
    if (e.code === 'KeyD') inputP1.right = false;
    if (e.code === 'KeyE' || e.code === 'Space') inputP1.interact = false;

    if (e.code === 'ArrowUp') inputP2.up = false;
    if (e.code === 'ArrowDown') inputP2.down = false;
    if (e.code === 'ArrowLeft') inputP2.left = false;
    if (e.code === 'ArrowRight') inputP2.right = false;
    if (e.code === 'Enter' || e.code === 'KeyM') inputP2.interact = false;
  });

  function setupMobileControls() {
    const mobileP1 = document.getElementById('mobile-p1');
    const mobileP2 = document.getElementById('mobile-p2');
    const btnSwitch = document.getElementById('btn-touch-switch');

    if (!mobileP1) return;

    if (gameMode === CONSTANTS.MODE.COOP) {
      mobileP2.classList.remove('hidden');
      if (btnSwitch) btnSwitch.classList.add('hidden');
    } else {
      mobileP2.classList.add('hidden');
      if (btnSwitch) btnSwitch.classList.remove('hidden');
    }
  }

  function bindTouchBtn(btnId, targetInput, property) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const start = (e) => { e.preventDefault(); targetInput[property] = true; audio.init(); };
    const end = (e) => { e.preventDefault(); targetInput[property] = false; };
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
  }

  bindTouchBtn('btn-p1-up', inputP1, 'up');
  bindTouchBtn('btn-p1-down', inputP1, 'down');
  bindTouchBtn('btn-p1-left', inputP1, 'left');
  bindTouchBtn('btn-p1-right', inputP1, 'right');
  bindTouchBtn('btn-p1-act', inputP1, 'interact');

  bindTouchBtn('btn-p2-up', inputP2, 'up');
  bindTouchBtn('btn-p2-down', inputP2, 'down');
  bindTouchBtn('btn-p2-left', inputP2, 'left');
  bindTouchBtn('btn-p2-right', inputP2, 'right');
  bindTouchBtn('btn-p2-act', inputP2, 'interact');

  const btnTouchSwitch = document.getElementById('btn-touch-switch');
  if (btnTouchSwitch) {
    btnTouchSwitch.addEventListener('click', () => switch1PCharacter());
  }

  function togglePause() {
    if (gameState === CONSTANTS.STATE.PLAYING) {
      gameState = CONSTANTS.STATE.PAUSED;
      pauseScreen.classList.remove('hidden');
    } else if (gameState === CONSTANTS.STATE.PAUSED) {
      gameState = CONSTANTS.STATE.PLAYING;
      pauseScreen.classList.add('hidden');
      lastTimestamp = performance.now();
      requestAnimationFrame(gameLoop);
    }
  }

  function updateHUD() {
    const o2 = Math.round(station.oxygen);
    const hull = Math.round(station.hullIntegrity);
    const reactor = Math.round(station.reactorEnergy);
    const harmony = Math.round(station.ntiHarmony);
    const water = Math.round(station.waterTotal);

    hudOxygenVal.textContent = `${o2}%`;
    hudHullVal.textContent = `${hull}%`;
    hudReactorVal.textContent = `${reactor}%`;
    hudHarmonyVal.textContent = `${harmony}%`;
    hudWaterVal.textContent = `${water}%`;

    barOxygen.style.width = `${o2}%`;
    barHull.style.width = `${hull}%`;
    barReactor.style.width = `${reactor}%`;
    barHarmony.style.width = `${harmony}%`;

    barOxygen.style.backgroundColor = o2 < 25 ? '#ff3b30' : '#00e5ff';
    barHull.style.backgroundColor = hull < 25 ? '#ff3b30' : '#4cd964';

    const secs = Math.floor(timeSurvived);
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    hudTimerVal.textContent = `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;

    if (station.currentComms) {
      radioCommsBox.classList.remove('hidden');
      radioSpeaker.textContent = `📡 [RADIO] ${station.currentComms.speaker.toUpperCase()} (${station.currentComms.role.toUpperCase()}):`;
      radioSpeaker.style.color = station.currentComms.color || '#00f7ff';
      radioMsg.textContent = station.currentComms.text;
    } else {
      radioCommsBox.classList.add('hidden');
    }

    const humanPlayer = (gameMode === CONSTANTS.MODE.SINGLE && activePlayer1P === 'lindsey') ? player2 : player1;
    if (humanPlayer) {
      const nearTerminal = station.getNearbyTerminal(humanPlayer.x, humanPlayer.y, 55);
      const curRoom = station.getRoomAt(humanPlayer.x, humanPlayer.y);
      const isNearCrisis = curRoom && curRoom.activeCrisis && Math.hypot(curRoom.activeCrisis.x - humanPlayer.x, curRoom.activeCrisis.y - humanPlayer.y) < 65;

      if (nearTerminal || isNearCrisis) {
        promptEl.classList.remove('hidden');
        const keyText = humanPlayer.id === 'bud' ? '[E / ESPACIO]' : '[ENTER / M]';
        let actDesc = 'INTERACTUAR';
        if (nearTerminal) {
          if (nearTerminal.type === 'OXYGEN') actDesc = 'PURIFICAR OXÍGENO';
          if (nearTerminal.type === 'PUMP') actDesc = 'ACTIVAR BOMBA DE ACHIQUE';
          if (nearTerminal.type === 'REACTOR') actDesc = 'ESTABILIZAR REACTOR';
          if (nearTerminal.type === 'ABYSS_DOCK') actDesc = 'COMUNIÓN CON NTI';
        } else if (isNearCrisis) {
          actDesc = (humanPlayer.activePowerup === 'SUPER_WELD') ? '🔥 SOLDADURA DE PLASMA HIPERBÁRICA' : 'SOLDAR Y REPARAR AVERÍA';
        }
        promptTxt.textContent = `MANTÉN ${keyText} PARA ${actDesc}`;
      } else {
        promptEl.classList.add('hidden');
      }
    }
  }

  function updateCamera() {
    if (!camera) return;

    const activePlayer = (gameMode === CONSTANTS.MODE.SINGLE && activePlayer1P === 'lindsey') ? player2 : player1;
    if (activePlayer && activePlayer.mesh) {
      const targetPos = activePlayer.mesh.position;
      const camTargetX = targetPos.x;
      const camTargetZ = targetPos.z + 24;
      const camTargetY = 30;

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, camTargetX, 0.08);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, camTargetZ, 0.08);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, camTargetY, 0.08);

      camera.lookAt(targetPos.x, 0.5, targetPos.z - 2);
    }
  }

  function gameLoop(timestamp) {
    if (gameState !== CONSTANTS.STATE.PLAYING) return;

    const dt = Math.min(timestamp - lastTimestamp, 50);
    lastTimestamp = timestamp;

    timeSurvived += dt / 1000;

    station.update(dt, audio);
    player1.update(dt, inputP1, station, audio, world3D);
    player2.update(dt, inputP2, station, audio, world3D);
    world3D.update(dt, station);
    nti3D.update(dt);

    updateCamera();
    updateHUD();

    if (station.oxygen <= 0) {
      triggerGameOver('El soporte vital se ha agotado. La tripulación se quedó sin oxígeno.');
      return;
    }
    if (station.hullIntegrity <= 0) {
      triggerGameOver('El casco de Deepcore colapsó por la presión extrema del abismo.');
      return;
    }

    if (timeSurvived >= currentDifficulty.tiempoVictoria) {
      triggerVictory();
      return;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(gameLoop);
  }

  function triggerGameOver(reason) {
    gameState = CONSTANTS.STATE.GAME_OVER;
    gameOverReason.textContent = reason;
    gameOverScreen.classList.remove('hidden');
    audio.playGameOver();
  }

  function triggerVictory() {
    gameState = CONSTANTS.STATE.VICTORY;
    const mins = Math.floor(timeSurvived / 60);
    const secs = Math.floor(timeSurvived % 60);
    victoryTimeEl.textContent = `${mins}m ${secs}s`;
    victoryScreen.classList.remove('hidden');
    audio.playVictory();
  }

  btnStart1P.addEventListener('click', () => startNewGame(CONSTANTS.MODE.SINGLE));
  btnStart2P.addEventListener('click', () => startNewGame(CONSTANTS.MODE.COOP));
  btnResume.addEventListener('click', () => togglePause());
  btnRestartOver.addEventListener('click', () => startNewGame(gameMode));
  btnRestartVic.addEventListener('click', () => startNewGame(gameMode));

  btnSound.addEventListener('click', () => {
    const active = audio.toggleSound();
    soundIcon.textContent = active ? '🔊' : '🔇';
  });

  btnPause.addEventListener('click', () => togglePause());

  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      diffBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const diffKey = btn.dataset.diff.toUpperCase();
      currentDifficulty = CONSTANTS.DIFFICULTY[diffKey] || CONSTANTS.DIFFICULTY.NORMAL;
    });
  });

  initThree();

})();
