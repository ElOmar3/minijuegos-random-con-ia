/**
 * NEON PONG ARCADE — SCRIPT PRINCIPAL
 * 100% Autocontenido, encapsulado como Módulo ES.
 * IA con predicción balística y multi-rebote, roles visuales claros y soporte táctil móvil completo.
 */

// ============================================================================
// 1. SISTEMA DE AUDIO SINTETIZADO (Web Audio API)
// ============================================================================
class SoundController {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, type, duration, startGain = 0.25, endGain = 0.001) {
    if (this.muted || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(startGain, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(endGain, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Prevención ante restricciones del navegador
    }
  }

  playPaddleHit() {
    this.playTone(480, 'square', 0.08, 0.25);
  }

  playWallHit() {
    this.playTone(280, 'sine', 0.06, 0.2);
  }

  playScore() {
    if (this.muted || !this.audioCtx) return;
    this.playTone(520, 'triangle', 0.1, 0.3);
    setTimeout(() => this.playTone(700, 'triangle', 0.2, 0.3), 100);
  }

  playGameOver(won) {
    if (this.muted || !this.audioCtx) return;
    if (won) {
      this.playTone(440, 'triangle', 0.12, 0.3);
      setTimeout(() => this.playTone(554.37, 'triangle', 0.12, 0.3), 120);
      setTimeout(() => this.playTone(659.25, 'triangle', 0.25, 0.3), 240);
    } else {
      this.playTone(300, 'sawtooth', 0.15, 0.25);
      setTimeout(() => this.playTone(200, 'sawtooth', 0.3, 0.25), 150);
    }
  }
}

// ============================================================================
// 2. SISTEMA DE PARTÍCULAS
// ============================================================================
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, color, count = 12, speed = 4) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = (Math.random() * 0.7 + 0.3) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 4 + 2,
        color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      p.size *= 0.96;

      if (p.alpha <= 0 || p.size <= 0.5) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}

// ============================================================================
// 3. JUEGO PRINCIPAL: NEON PONG CON IA INTELIGENTE
// ============================================================================
class NeonPongGame {
  constructor() {
    // Configuración base
    this.TARGET_SCORE = 5;
    this.STORAGE_KEY = 'neon_pong_highscore';

    // Canvas y Contexto
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;

    // Dimensiones virtuales del campo
    this.virtualWidth = 1000;
    this.virtualHeight = 600;

    // Controladores
    this.sound = new SoundController();
    this.particles = new ParticleSystem();

    // Estado del juego
    this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.difficulty = 'easy'; // 'easy', 'medium', 'hard'

    // Puntuaciones
    this.playerScore = 0;
    this.aiScore = 0;
    this.rally = 0;
    this.maxRally = 0;
    this.highScore = parseInt(localStorage.getItem(this.STORAGE_KEY) || '0', 10);

    // Indicadores visuales de inicio de ronda
    this.roundStartTimer = 0;
    this.roundNoticeAlpha = 1;

    // Entidades del juego
    this.paddleWidth = 16;
    this.paddleHeight = 110;
    this.paddleSpeed = 9.5;

    // Jugador (Izquierda - Azul)
    this.player = {
      name: 'TÚ',
      side: 'left',
      x: 40,
      y: this.virtualHeight / 2 - this.paddleHeight / 2,
      targetY: this.virtualHeight / 2 - this.paddleHeight / 2,
      width: this.paddleWidth,
      height: this.paddleHeight,
      color: '#06b6d4',
      glow: '#0891b2'
    };

    // IA Bot (Derecha - Rosa)
    this.ai = {
      name: 'IA BOT',
      side: 'right',
      x: this.virtualWidth - 40 - this.paddleWidth,
      y: this.virtualHeight / 2 - this.paddleHeight / 2,
      targetY: this.virtualHeight / 2 - this.paddleHeight / 2,
      width: this.paddleWidth,
      height: this.paddleHeight,
      color: '#ec4899',
      glow: '#db2777',
      speed: 6.2,
      predictionError: 0,
      offensiveOffset: 0
    };

    // Bola
    this.ball = {
      x: this.virtualWidth / 2,
      y: this.virtualHeight / 2,
      radius: 9,
      baseSpeed: 7,
      currentSpeed: 7,
      vx: 7,
      vy: 0,
      color: '#ffffff',
      glow: '#38bdf8',
      trail: []
    };

    // Controles de entrada
    this.keys = {
      up: false,
      down: false
    };

    // Elementos del DOM
    this.dom = {
      startScreen: document.getElementById('start-screen'),
      pauseScreen: document.getElementById('pause-screen'),
      gameoverScreen: document.getElementById('gameover-screen'),
      playerScoreEl: document.getElementById('player-score'),
      aiScoreEl: document.getElementById('ai-score'),
      rallyValueEl: document.getElementById('rally-value'),
      highScoreEl: document.getElementById('high-score-value'),
      gameoverTitleEl: document.getElementById('gameover-title'),
      gameoverDescEl: document.getElementById('gameover-desc'),
      summaryMaxRallyEl: document.getElementById('summary-max-rally'),
      summaryFinalScoreEl: document.getElementById('summary-final-score'),
      soundBtn: document.getElementById('sound-btn'),
      soundIcon: document.getElementById('sound-icon'),
      pauseBtn: document.getElementById('pause-btn'),
      startBtn: document.getElementById('start-btn'),
      resumeBtn: document.getElementById('resume-btn'),
      restartBtn: document.getElementById('restart-btn'),
      playAgainBtn: document.getElementById('play-again-btn'),
      diffButtons: document.querySelectorAll('.diff-btn'),
      btnTouchUp: document.getElementById('btn-touch-up'),
      btnTouchDown: document.getElementById('btn-touch-down')
    };

    this.init();
  }

  init() {
    this.setupResize();
    this.setupEventListeners();
    this.updateHUD();
    this.resetBall(1);

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  setupResize() {
    const resize = () => {
      const container = this.canvas.parentElement;
      const width = container.clientWidth;
      const height = container.clientHeight;

      this.dpr = window.devicePixelRatio || 1;
      this.canvas.width = width * this.dpr;
      this.canvas.height = height * this.dpr;

      this.scaleX = (width * this.dpr) / this.virtualWidth;
      this.scaleY = (height * this.dpr) / this.virtualHeight;
    };

    window.addEventListener('resize', resize);
    resize();
  }

  setupEventListeners() {
    // 1. Controles de Teclado
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        this.keys.up = true;
        e.preventDefault();
      }
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        this.keys.down = true;
        e.preventDefault();
      }
      if (['KeyP', 'Space'].includes(e.code)) {
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED') this.resumeGame();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) this.keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) this.keys.down = false;
    });

    // 2. Control de Ratón
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.state !== 'PLAYING') return;
      const rect = this.canvas.getBoundingClientRect();
      const relativeY = (e.clientY - rect.top) / rect.height;
      this.player.targetY = relativeY * this.virtualHeight - this.player.height / 2;
    });

    // 3. Control Táctil Directo en Pantalla (Arrastrar en cualquier parte)
    const handleTouchInput = (e) => {
      if (this.state !== 'PLAYING') return;
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const relativeY = (touch.clientY - rect.top) / rect.height;
        this.player.targetY = relativeY * this.virtualHeight - this.player.height / 2;
      }
    };

    this.canvas.addEventListener('touchstart', (e) => {
      this.sound.init();
      handleTouchInput(e);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      handleTouchInput(e);
    }, { passive: false });

    // 4. Botones Táctiles Virtuales en Pantalla (Mobile Controls)
    if (this.dom.btnTouchUp && this.dom.btnTouchDown) {
      const bindTouchBtn = (btn, isUp) => {
        const start = (e) => {
          e.preventDefault();
          this.sound.init();
          if (isUp) this.keys.up = true;
          else this.keys.down = true;
        };
        const end = (e) => {
          e.preventDefault();
          if (isUp) this.keys.up = false;
          else this.keys.down = false;
        };

        btn.addEventListener('touchstart', start, { passive: false });
        btn.addEventListener('touchend', end, { passive: false });
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', end);
        btn.addEventListener('mouseleave', end);
      };

      bindTouchBtn(this.dom.btnTouchUp, true);
      bindTouchBtn(this.dom.btnTouchDown, false);
    }

    // 5. Botones de la Interfaz
    this.dom.startBtn.addEventListener('click', () => {
      this.sound.init();
      this.startGame();
    });

    this.dom.resumeBtn.addEventListener('click', () => this.resumeGame());
    this.dom.restartBtn.addEventListener('click', () => this.restartGame());
    this.dom.playAgainBtn.addEventListener('click', () => this.restartGame());

    this.dom.pauseBtn.addEventListener('click', () => {
      if (this.state === 'PLAYING') this.pauseGame();
      else if (this.state === 'PAUSED') this.resumeGame();
    });

    this.dom.soundBtn.addEventListener('click', () => {
      this.sound.init();
      const isMuted = this.sound.toggleMute();
      this.dom.soundIcon.textContent = isMuted ? '🔇' : '🔊';
    });

    // 6. Selector de Dificultad
    this.dom.diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.difficulty = btn.getAttribute('data-diff');
        this.applyDifficultySettings();
      });
    });
  }

  applyDifficultySettings() {
    switch (this.difficulty) {
      case 'easy':
        this.ai.speed = 5.8;
        this.ai.predictionError = 30;
        this.ball.baseSpeed = 6.5;
        break;
      case 'medium':
        this.ai.speed = 7.8;
        this.ai.predictionError = 12;
        this.ball.baseSpeed = 7.5;
        break;
      case 'hard':
        this.ai.speed = 10.2;
        this.ai.predictionError = 0;
        this.ball.baseSpeed = 8.5;
        break;
    }
  }

  startGame() {
    this.applyDifficultySettings();
    this.playerScore = 0;
    this.aiScore = 0;
    this.rally = 0;
    this.maxRally = 0;
    this.updateHUD();

    this.dom.startScreen.classList.add('hidden');
    this.dom.pauseScreen.classList.add('hidden');
    this.dom.gameoverScreen.classList.add('hidden');

    this.resetBall(1);
    this.state = 'PLAYING';
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.dom.pauseScreen.classList.remove('hidden');
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.dom.pauseScreen.classList.add('hidden');
  }

  restartGame() {
    this.startGame();
  }

  gameOver(won) {
    this.state = 'GAMEOVER';
    this.sound.playGameOver(won);

    if (this.maxRally > this.highScore) {
      this.highScore = this.maxRally;
      localStorage.setItem(this.STORAGE_KEY, this.highScore.toString());
      this.updateHUD();
    }

    this.dom.gameoverTitleEl.textContent = won ? '¡VICTORIA!' : '¡DERROTA!';
    this.dom.gameoverTitleEl.style.color = won ? 'var(--color-cyan)' : 'var(--color-pink)';
    this.dom.gameoverDescEl.textContent = won
      ? '¡Has vencido a la inteligencia artificial con gran destreza!'
      : 'La IA táctica te ha superado esta vez. ¡Inténtalo de nuevo!';

    this.dom.summaryMaxRallyEl.textContent = this.maxRally;
    this.dom.summaryFinalScoreEl.textContent = `${this.playerScore} - ${this.aiScore}`;

    this.dom.gameoverScreen.classList.remove('hidden');
  }

  resetBall(direction = 1) {
    this.ball.x = this.virtualWidth / 2;
    this.ball.y = this.virtualHeight / 2;
    this.ball.currentSpeed = this.ball.baseSpeed;
    this.ball.vx = direction * this.ball.currentSpeed;
    this.ball.vy = (Math.random() * 4 - 2);
    this.ball.trail = [];
    this.rally = 0;
    this.roundStartTimer = 150; // Temporizador para mostrar carteles "TÚ" e "IA"
    this.updateHUD();
  }

  updateHUD() {
    this.dom.playerScoreEl.textContent = this.playerScore;
    this.dom.aiScoreEl.textContent = this.aiScore;
    this.dom.rallyValueEl.textContent = this.rally;
    this.dom.highScoreEl.textContent = this.highScore;
  }

  // ==========================================================================
  // PREDICCIÓN BALÍSTICA TÁCTICA DE LA IA
  // ==========================================================================
  predictBallInterceptY() {
    // Si la bola va hacia el jugador (izquierda), la IA vuelve al centro
    if (this.ball.vx <= 0) {
      return this.virtualHeight / 2;
    }

    // Simulación de trayectoria balística con rebotes en paredes
    let simX = this.ball.x;
    let simY = this.ball.y;
    let simVx = this.ball.vx;
    let simVy = this.ball.vy;

    const topLimit = 10 + this.ball.radius;
    const bottomLimit = this.virtualHeight - 10 - this.ball.radius;
    const targetX = this.ai.x;

    let maxSteps = 250;
    while (simX < targetX && maxSteps > 0) {
      simX += simVx;
      simY += simVy;

      if (simY <= topLimit) {
        simY = topLimit;
        simVy = -simVy;
      } else if (simY >= bottomLimit) {
        simY = bottomLimit;
        simVy = -simVy;
      }
      maxSteps--;
    }

    // Añadir comportamiento táctico según dificultad
    if (this.difficulty === 'hard') {
      // En difícil, la IA intenta cortar ángulos golpeando con las esquinas de su paleta
      const offensiveCorner = (this.player.y > this.virtualHeight / 2) ? -35 : 35;
      return simY + offensiveCorner;
    } else if (this.difficulty === 'medium') {
      // Error mínimo
      const noise = (Math.sin(Date.now() * 0.003) * this.ai.predictionError);
      return simY + noise;
    } else {
      // Fácil: margen de error más amplio y oscilación
      const noise = (Math.sin(Date.now() * 0.002) * this.ai.predictionError);
      return simY + noise;
    }
  }

  update() {
    if (this.state !== 'PLAYING') return;

    if (this.roundStartTimer > 0) {
      this.roundStartTimer--;
      this.roundNoticeAlpha = Math.min(1, this.roundStartTimer / 40);
    }

    // 1. Movimiento del Jugador (Teclado o Touch/Mouse)
    if (this.keys.up) {
      this.player.y -= this.paddleSpeed;
      this.player.targetY = this.player.y;
    } else if (this.keys.down) {
      this.player.y += this.paddleSpeed;
      this.player.targetY = this.player.y;
    } else if (this.player.targetY !== undefined) {
      // Suavizado cuando se usa ratón o toque
      const diff = this.player.targetY - this.player.y;
      this.player.y += diff * 0.35;
    }
    this.player.y = Math.max(10, Math.min(this.virtualHeight - this.player.height - 10, this.player.y));

    // 2. IA Táctica
    const predictedY = this.predictBallInterceptY();
    const aiTargetCenter = predictedY - this.ai.height / 2;
    const aiDiff = aiTargetCenter - this.ai.y;

    if (Math.abs(aiDiff) > 5) {
      const step = Math.sign(aiDiff) * Math.min(Math.abs(aiDiff), this.ai.speed);
      this.ai.y += step;
    }
    this.ai.y = Math.max(10, Math.min(this.virtualHeight - this.ai.height - 10, this.ai.y));

    // 3. Estela de la Bola
    this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
    if (this.ball.trail.length > 8) {
      this.ball.trail.shift();
    }

    // 4. Movimiento de la Bola
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Colisiones con Techo y Suelo
    if (this.ball.y - this.ball.radius <= 10) {
      this.ball.y = 10 + this.ball.radius;
      this.ball.vy *= -1;
      this.sound.playWallHit();
      this.particles.emit(this.ball.x, this.ball.y, '#38bdf8', 6, 3);
    } else if (this.ball.y + this.ball.radius >= this.virtualHeight - 10) {
      this.ball.y = this.virtualHeight - 10 - this.ball.radius;
      this.ball.vy *= -1;
      this.sound.playWallHit();
      this.particles.emit(this.ball.x, this.ball.y, '#38bdf8', 6, 3);
    }

    // 5. Colisión con Paleta del Jugador (Izquierda)
    if (
      this.ball.x - this.ball.radius <= this.player.x + this.player.width &&
      this.ball.x + this.ball.radius >= this.player.x &&
      this.ball.y >= this.player.y &&
      this.ball.y <= this.player.y + this.player.height &&
      this.ball.vx < 0
    ) {
      this.handlePaddleHit(this.player, 1);
    }

    // 6. Colisión con Paleta de la IA (Derecha)
    if (
      this.ball.x + this.ball.radius >= this.ai.x &&
      this.ball.x - this.ball.radius <= this.ai.x + this.ai.width &&
      this.ball.y >= this.ai.y &&
      this.ball.y <= this.ai.y + this.ai.height &&
      this.ball.vx > 0
    ) {
      this.handlePaddleHit(this.ai, -1);
    }

    // 7. Goles y Puntos
    if (this.ball.x < 0) {
      // Gol de la IA
      this.aiScore++;
      this.sound.playScore();
      this.particles.emit(10, this.ball.y, '#ec4899', 24, 7);
      this.checkScoreGoal(-1);
    } else if (this.ball.x > this.virtualWidth) {
      // Gol del Jugador
      this.playerScore++;
      this.sound.playScore();
      this.particles.emit(this.virtualWidth - 10, this.ball.y, '#06b6d4', 24, 7);
      this.checkScoreGoal(1);
    }

    this.particles.update();
  }

  handlePaddleHit(paddle, dirX) {
    this.rally++;
    if (this.rally > this.maxRally) {
      this.maxRally = this.rally;
    }
    this.updateHUD();
    this.sound.playPaddleHit();

    // Aceleración de la bola
    this.ball.currentSpeed = Math.min(18.5, this.ball.currentSpeed + 0.45);

    // Ángulo de rebote según punto de impacto (-1 arriba, 0 centro, 1 abajo)
    const hitOffset = (this.ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
    const maxAngle = Math.PI / 3; // 60 grados
    const bounceAngle = hitOffset * maxAngle;

    this.ball.vx = dirX * this.ball.currentSpeed * Math.cos(bounceAngle);
    this.ball.vy = this.ball.currentSpeed * Math.sin(bounceAngle);

    // Partículas de choque
    const hitX = dirX === 1 ? paddle.x + paddle.width : paddle.x;
    this.particles.emit(hitX, this.ball.y, paddle.color, 14, 5);
  }

  checkScoreGoal(scoredDir) {
    this.updateHUD();

    if (this.playerScore >= this.TARGET_SCORE) {
      this.gameOver(true);
    } else if (this.aiScore >= this.TARGET_SCORE) {
      this.gameOver(false);
    } else {
      this.resetBall(scoredDir);
    }
  }

  render() {
    this.ctx.save();
    this.ctx.scale(this.scaleX, this.scaleY);

    // Fondo oscuro con degradado
    const bgGrad = this.ctx.createLinearGradient(0, 0, this.virtualWidth, this.virtualHeight);
    bgGrad.addColorStop(0, '#040711');
    bgGrad.addColorStop(1, '#0b1120');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

    // Rejilla sutil
    this.drawBackgroundGrid();

    // Línea central divisoria
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([12, 12]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.virtualWidth / 2, 10);
    this.ctx.lineTo(this.virtualWidth / 2, this.virtualHeight - 10);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Dibujar Paletas
    this.drawPaddle(this.player);
    this.drawPaddle(this.ai);

    // Dibujar Bola y Estela
    this.drawBall();

    // Dibujar Partículas
    this.particles.draw(this.ctx);

    // Indicadores flotantes de rol ("⬅️ TÚ" e "IA ➡️")
    if (this.roundStartTimer > 0) {
      this.drawRolePointers();
    }

    this.ctx.restore();
  }

  drawBackgroundGrid() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    this.ctx.lineWidth = 1;
    const step = 50;

    for (let x = 0; x < this.virtualWidth; x += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.virtualHeight);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.virtualHeight; y += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.virtualWidth, y);
      this.ctx.stroke();
    }
  }

  drawPaddle(paddle) {
    this.ctx.save();
    this.ctx.fillStyle = paddle.color;
    this.ctx.shadowColor = paddle.color;
    this.ctx.shadowBlur = 16;

    const r = 8;
    this.ctx.beginPath();
    this.ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, r);
    this.ctx.fill();

    // Núcleo interior brillante
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.roundRect(paddle.x + 4, paddle.y + 4, paddle.width - 8, paddle.height - 8, r / 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawBall() {
    this.ctx.save();

    for (let i = 0; i < this.ball.trail.length; i++) {
      const pos = this.ball.trail[i];
      const progress = (i + 1) / this.ball.trail.length;
      this.ctx.fillStyle = `rgba(6, 182, 212, ${progress * 0.35})`;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.ball.radius * progress * 0.85, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = this.ball.color;
    this.ctx.shadowColor = '#06b6d4';
    this.ctx.shadowBlur = 18;

    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawRolePointers() {
    this.ctx.save();
    this.ctx.globalAlpha = this.roundNoticeAlpha;
    this.ctx.font = 'bold 16px -apple-system, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    // Etiqueta Jugador (Azul)
    this.ctx.fillStyle = '#06b6d4';
    this.ctx.shadowColor = '#06b6d4';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText('⬅️ TÚ (AZUL)', this.player.x + this.player.width + 15, this.player.y + this.player.height / 2);

    // Etiqueta IA (Rosa)
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#ec4899';
    this.ctx.shadowColor = '#ec4899';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText('(ROSA) IA BOT ➡️', this.ai.x - 15, this.ai.y + this.ai.height / 2);

    this.ctx.restore();
  }

  gameLoop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// Iniciar juego cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new NeonPongGame());
} else {
  new NeonPongGame();
}
