/**
 * NEON PONG ARCADE — SCRIPT PRINCIPAL
 * 100% Autocontenido, encapsulado como Módulo ES.
 * No expone variables ni funciones al objeto global `window`.
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

  playTone(freq, type, duration, startGain = 0.3, endGain = 0.001) {
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
      // Audio context might be restricted before interaction
    }
  }

  playPaddleHit() {
    this.playTone(440, 'square', 0.08, 0.25);
  }

  playWallHit() {
    this.playTone(280, 'sine', 0.06, 0.2);
  }

  playScore() {
    if (this.muted || !this.audioCtx) return;
    this.playTone(520, 'triangle', 0.1, 0.3);
    setTimeout(() => this.playTone(680, 'triangle', 0.2, 0.3), 100);
  }

  playGameOver(won) {
    if (this.muted || !this.audioCtx) return;
    if (won) {
      this.playTone(440, 'triangle', 0.12, 0.3);
      setTimeout(() => this.playTone(554.37, 'triangle', 0.12, 0.3), 120);
      setTimeout(() => this.playTone(659.25, 'triangle', 0.25, 0.3), 240);
    } else {
      this.playTone(300, 'sawtooth', 0.15, 0.25);
      setTimeout(() => this.playTone(220, 'sawtooth', 0.3, 0.25), 150);
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
        life: Math.random() * 0.3 + 0.3,
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
// 3. JUEGO PRINCIPAL: NEON PONG
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

    // Dimensiones lógicas de referencia
    this.virtualWidth = 1000;
    this.virtualHeight = 600;

    // Controladores
    this.sound = new SoundController();
    this.particles = new ParticleSystem();

    // Estado del juego: 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.state = 'MENU';
    this.difficulty = 'easy'; // 'easy', 'medium', 'hard'

    // Puntuaciones
    this.playerScore = 0;
    this.aiScore = 0;
    this.rally = 0;
    this.maxRally = 0;
    this.highScore = parseInt(localStorage.getItem(this.STORAGE_KEY) || '0', 10);

    // Entidades del juego
    this.paddleWidth = 16;
    this.paddleHeight = 110;
    this.paddleSpeed = 9;

    this.player = {
      x: 40,
      y: this.virtualHeight / 2 - this.paddleHeight / 2,
      width: this.paddleWidth,
      height: this.paddleHeight,
      color: '#06b6d4',
      glow: '#0891b2',
      vy: 0
    };

    this.ai = {
      x: this.virtualWidth - 40 - this.paddleWidth,
      y: this.virtualHeight / 2 - this.paddleHeight / 2,
      width: this.paddleWidth,
      height: this.paddleHeight,
      color: '#ec4899',
      glow: '#db2777',
      speed: 6.5,
      wobble: 0
    };

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

    // Entradas de usuario
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
      diffButtons: document.querySelectorAll('.diff-btn')
    };

    this.init();
  }

  init() {
    this.setupResize();
    this.setupEventListeners();
    this.updateHUD();
    this.resetBall(1);

    // Loop de renderizado
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
    // Teclado
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

    // Control táctil y ratón en Canvas
    const handlePointerMove = (clientY) => {
      if (this.state !== 'PLAYING') return;
      const rect = this.canvas.getBoundingClientRect();
      const relativeY = (clientY - rect.top) / rect.height;
      const targetY = relativeY * this.virtualHeight - this.player.height / 2;
      this.player.y = Math.max(10, Math.min(this.virtualHeight - this.player.height - 10, targetY));
    };

    this.canvas.addEventListener('mousemove', (e) => {
      handlePointerMove(e.clientY);
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientY);
      }
    }, { passive: true });

    // Botones de UI
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

    // Selector de dificultad
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
        this.ai.speed = 5.2;
        this.ball.baseSpeed = 6.5;
        break;
      case 'medium':
        this.ai.speed = 6.8;
        this.ball.baseSpeed = 7.5;
        break;
      case 'hard':
        this.ai.speed = 8.5;
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

    // Guardar récord si el rally superó el máximo
    if (this.maxRally > this.highScore) {
      this.highScore = this.maxRally;
      localStorage.setItem(this.STORAGE_KEY, this.highScore.toString());
      this.updateHUD();
    }

    this.dom.gameoverTitleEl.textContent = won ? '¡VICTORIA!' : '¡DERROTA!';
    this.dom.gameoverTitleEl.style.color = won ? 'var(--color-cyan)' : 'var(--color-pink)';
    this.dom.gameoverDescEl.textContent = won
      ? '¡Has vencido al algoritmo con reflejos impecables!'
      : 'La IA te ha superado esta vez. ¡Inténtalo de nuevo!';

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
    this.updateHUD();
  }

  updateHUD() {
    this.dom.playerScoreEl.textContent = this.playerScore;
    this.dom.aiScoreEl.textContent = this.aiScore;
    this.dom.rallyValueEl.textContent = this.rally;
    this.dom.highScoreEl.textContent = this.highScore;
  }

  update() {
    if (this.state !== 'PLAYING') return;

    // 1. Movimiento del Jugador por Teclado
    if (this.keys.up) {
      this.player.y -= this.paddleSpeed;
    }
    if (this.keys.down) {
      this.player.y += this.paddleSpeed;
    }
    this.player.y = Math.max(10, Math.min(this.virtualHeight - this.player.height - 10, this.player.y));

    // 2. IA Bot
    const aiCenter = this.ai.y + this.ai.height / 2;
    // Predicción de movimiento con retardo según dificultad
    let targetY = this.ball.y;
    if (this.difficulty === 'easy') {
      targetY += (Math.sin(Date.now() * 0.005) * 35);
    }

    if (aiCenter < targetY - 15) {
      this.ai.y += this.ai.speed;
    } else if (aiCenter > targetY + 15) {
      this.ai.y -= this.ai.speed;
    }
    this.ai.y = Math.max(10, Math.min(this.virtualHeight - this.ai.height - 10, this.ai.y));

    // 3. Estela de la Bola
    this.ball.trail.push({ x: this.ball.x, y: this.ball.y, speed: this.ball.currentSpeed });
    if (this.ball.trail.length > 8) {
      this.ball.trail.shift();
    }

    // 4. Movimiento de la Bola
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Colisión con Techo y Suelo
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

    // 7. Puntos / Goles
    // Punto para la IA
    if (this.ball.x < 0) {
      this.aiScore++;
      this.sound.playScore();
      this.particles.emit(10, this.ball.y, '#ec4899', 24, 7);
      this.checkScoreGoal(-1);
    }
    // Punto para el Jugador
    else if (this.ball.x > this.virtualWidth) {
      this.playerScore++;
      this.sound.playScore();
      this.particles.emit(this.virtualWidth - 10, this.ball.y, '#06b6d4', 24, 7);
      this.checkScoreGoal(1);
    }

    // Actualizar partículas
    this.particles.update();
  }

  handlePaddleHit(paddle, dirX) {
    this.rally++;
    if (this.rally > this.maxRally) {
      this.maxRally = this.rally;
    }
    this.updateHUD();
    this.sound.playPaddleHit();

    // Aceleración suave con cada rebote
    this.ball.currentSpeed = Math.min(18, this.ball.currentSpeed + 0.4);

    // Calcular ángulo de rebote según el impacto en la paleta (-1 arriba, 0 centro, 1 abajo)
    const hitOffset = (this.ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
    const maxAngle = Math.PI / 3; // 60 grados max
    const bounceAngle = hitOffset * maxAngle;

    this.ball.vx = dirX * this.ball.currentSpeed * Math.cos(bounceAngle);
    this.ball.vy = this.ball.currentSpeed * Math.sin(bounceAngle);

    // Partículas de impacto
    const hitX = dirX === 1 ? paddle.x + paddle.width : paddle.x;
    this.particles.emit(hitX, this.ball.y, paddle.color, 12, 5);
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

    // Rejilla de fondo retro sutil
    this.drawBackgroundGrid();

    // Línea central punteada
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
    this.ctx.shadowBlur = 15;

    // Rectángulo redondeado
    const r = 8;
    this.ctx.beginPath();
    this.ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, r);
    this.ctx.fill();

    // Núcleo blanco brillante
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.roundRect(paddle.x + 4, paddle.y + 4, paddle.width - 8, paddle.height - 8, r / 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawBall() {
    this.ctx.save();

    // Dibujar estela
    for (let i = 0; i < this.ball.trail.length; i++) {
      const pos = this.ball.trail[i];
      const progress = (i + 1) / this.ball.trail.length;
      this.ctx.fillStyle = `rgba(6, 182, 212, ${progress * 0.35})`;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.ball.radius * progress * 0.85, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Bola principal con resplandor neón
    this.ctx.fillStyle = this.ball.color;
    this.ctx.shadowColor = '#06b6d4';
    this.ctx.shadowBlur = 18;

    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();

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
