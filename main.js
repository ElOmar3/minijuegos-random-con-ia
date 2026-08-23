/**
 * COSMOS ARCADE — LÓGICA DEL HUB PRINCIPAL
 * Gestión del catálogo de minijuegos, filtros de búsqueda,
 * visor iframe aislado y motor gráfico estelar interactivo.
 */

(function () {
  'use strict';

  // Estado del Portal
  let allGames = [];
  let currentDifficultyFilter = 'all';
  let searchQuery = '';
  let activeGame = null;
  let soundEnabled = true;

  // Elementos del DOM
  const gamesGrid = document.getElementById('games-grid');
  const emptyState = document.getElementById('empty-state');
  const gameCountEl = document.getElementById('game-count');
  const aiCountEl = document.getElementById('ai-count');
  const metricGamesEl = document.getElementById('metric-games');
  const metricAisEl = document.getElementById('metric-ais');
  const resultsCountEl = document.getElementById('results-count');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const filterChips = document.getElementById('filter-chips');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  const soundToggleBtn = document.getElementById('sound-toggle');
  const soundIconEl = document.getElementById('sound-icon');

  // Elementos del Visor de Juego (Iframe Overlay)
  const gameOverlay = document.getElementById('game-overlay');
  const gameIframe = document.getElementById('game-iframe');
  const backBtn = document.getElementById('back-btn');
  const currentGameTitle = document.getElementById('current-game-title');
  const currentGameAi = document.getElementById('current-game-ai');
  const currentGameDifficulty = document.getElementById('current-game-difficulty');
  const currentGameTech = document.getElementById('current-game-tech');
  const reloadGameBtn = document.getElementById('reload-game-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const fullscreenIcon = document.getElementById('fullscreen-icon');

  /**
   * SINTETIZADOR DE AUDIO UI (Web Audio API)
   */
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playUiSound(type = 'click') {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'hover') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.05);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'launch') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.18);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {}
  }

  /**
   * Inicialización del portal
   */
  async function init() {
    initStarfield();
    setupEventListeners();
    await loadGamesManifest();
  }

  /**
   * Carga el manifest games.json
   */
  async function loadGamesManifest() {
    try {
      const response = await fetch('games.json');
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      allGames = await response.json();
      updateHeaderStats();
      renderGallery();
    } catch (error) {
      console.error('Error al cargar games.json:', error);
      gamesGrid.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">⚠️</span>
          <h3>Error al cargar los juegos</h3>
          <p>No se pudo obtener el catálogo 'games.json'. Verifica que el archivo exista y sea un JSON válido.</p>
        </div>
      `;
    }
  }

  /**
   * Actualiza las estadísticas del portal
   */
  function updateHeaderStats() {
    const totalGames = allGames.length;
    if (gameCountEl) gameCountEl.textContent = totalGames;
    if (metricGamesEl) metricGamesEl.textContent = `${totalGames}+`;

    // Calcular IAs únicas participantes
    const uniqueAIs = new Set();
    allGames.forEach(g => {
      if (g.ia) {
        g.ia.split('+').forEach(part => uniqueAIs.add(part.trim()));
      }
    });
    const totalAIs = Math.max(1, uniqueAIs.size);
    if (aiCountEl) aiCountEl.textContent = totalAIs;
    if (metricAisEl) metricAisEl.textContent = totalAIs;
  }

  /**
   * Renderiza las tarjetas de juegos según los filtros activos
   */
  function renderGallery() {
    const filteredGames = allGames.filter(game => {
      const matchesDifficulty = currentDifficultyFilter === 'all' || 
        (game.dificultad && game.dificultad.toLowerCase() === currentDifficultyFilter.toLowerCase()) ||
        (game.dificultad_creacion && game.dificultad_creacion.toLowerCase() === currentDifficultyFilter.toLowerCase());
      
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        game.titulo.toLowerCase().includes(query) ||
        game.descripcion.toLowerCase().includes(query) ||
        (game.ia && game.ia.toLowerCase().includes(query)) ||
        (game.tecnologia && game.tecnologia.toLowerCase().includes(query));

      return matchesDifficulty && matchesSearch;
    });

    if (resultsCountEl) {
      resultsCountEl.textContent = `Mostrando ${filteredGames.length} de ${allGames.length} juegos`;
    }

    if (filteredGames.length === 0) {
      gamesGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    gamesGrid.innerHTML = filteredGames.map(game => createGameCardHTML(game)).join('');

    // Asignar eventos de clic y hover a los botones y tarjetas
    const cards = gamesGrid.querySelectorAll('.game-card');
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => playUiSound('hover'));
    });

    const playButtons = gamesGrid.querySelectorAll('.btn-play');
    playButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        playUiSound('launch');
        const gameId = btn.getAttribute('data-game-id');
        const game = allGames.find(g => g.id === gameId);
        if (game) {
          openGame(game);
        }
      });
    });
  }

  /**
   * Genera el HTML para la tarjeta de un juego
   */
  function createGameCardHTML(game) {
    const dificultad = (game.dificultad || 'fácil').toLowerCase();
    const dificultadCreacion = game.dificultad_creacion || game.dificultad || 'Fácil';
    const miniatura = game.miniatura || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225"><rect width="400" height="225" fill="%230b1226"/><text x="50%" y="50%" fill="%2300f0ff" dominant-baseline="middle" text-anchor="middle" font-size="20">Minijuego</text></svg>';

    return `
      <article class="game-card" data-id="${escapeHtml(game.id)}">
        <div class="game-card-thumbnail-wrapper">
          <img 
            src="${escapeHtml(miniatura)}" 
            alt="Miniatura de ${escapeHtml(game.titulo)}" 
            class="game-card-img"
            loading="lazy"
            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22225%22 viewBox=%220 0 400 225%22><rect width=%22400%22 height=%22225%22 fill=%22%23080e22%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%2300f0ff%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22>${encodeURIComponent(game.titulo)}</text></svg>'"
          />
          <div class="game-card-thumbnail-overlay"></div>
        </div>
        <div class="game-card-body">
          <div class="game-card-badges">
            ${game.ia ? `
              <span class="badge badge-ai" title="Creado con Inteligencia Artificial">
                🤖 ${escapeHtml(game.ia)}
              </span>
            ` : ''}
            <span class="badge badge-difficulty" data-difficulty="${escapeHtml(dificultad)}" title="Dificultad de desarrollo">
              🛠️ Creación: ${escapeHtml(dificultadCreacion)}
            </span>
            ${game.tecnologia ? `
              <span class="badge badge-tech" title="Tecnologías empleadas">
                💻 ${escapeHtml(game.tecnologia)}
              </span>
            ` : ''}
          </div>
          <h3 class="game-card-title">${escapeHtml(game.titulo)}</h3>
          <p class="game-card-desc">${escapeHtml(game.descripcion)}</p>
          <div class="game-card-footer">
            <button class="btn-play" data-game-id="${escapeHtml(game.id)}" aria-label="Jugar ${escapeHtml(game.titulo)}">
              <span>▶</span> Jugar Minijuego
            </button>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Abre un juego dentro del visor iframe aislado
   */
  function openGame(game) {
    activeGame = game;

    currentGameTitle.textContent = game.titulo;
    
    if (currentGameAi) {
      currentGameAi.textContent = `🤖 ${game.ia || 'IA'}`;
    }

    if (currentGameDifficulty) {
      const dificultadCreacion = game.dificultad_creacion || game.dificultad || 'Fácil';
      currentGameDifficulty.textContent = `🛠️ Creación: ${dificultadCreacion}`;
      currentGameDifficulty.setAttribute('data-difficulty', (game.dificultad || 'fácil').toLowerCase());
    }

    if (currentGameTech) {
      currentGameTech.textContent = `💻 ${game.tecnologia || 'Web'}`;
    }

    const gamePath = game.carpeta.endsWith('/') ? `${game.carpeta}index.html` : `${game.carpeta}/index.html`;
    gameIframe.src = gamePath;

    gameOverlay.classList.remove('hidden');
    gameOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      try { gameIframe.focus(); } catch (e) {}
    }, 120);
  }

  /**
   * Cierra el visor iframe y detiene el juego
   */
  function closeGame() {
    if (!activeGame) return;
    playUiSound('click');

    activeGame = null;
    gameIframe.src = 'about:blank';
    
    gameOverlay.classList.add('hidden');
    gameOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  /**
   * Reinicia el juego actual
   */
  function reloadGame() {
    if (activeGame && gameIframe.src) {
      playUiSound('click');
      const currentSrc = gameIframe.src;
      gameIframe.src = 'about:blank';
      setTimeout(() => {
        gameIframe.src = currentSrc;
      }, 60);
    }
  }

  /**
   * Alterna pantalla completa
   */
  function toggleFullscreen() {
    playUiSound('click');
    if (!document.fullscreenElement) {
      gameOverlay.requestFullscreen().then(() => {
        if (fullscreenIcon) fullscreenIcon.textContent = '✕';
      }).catch(err => {
        console.warn(`Error de pantalla completa: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        if (fullscreenIcon) fullscreenIcon.textContent = '⛶';
      }).catch(() => {});
    }
  }

  /**
   * Configuración de eventos de UI
   */
  function setupEventListeners() {
    // Búsqueda
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.classList.toggle('hidden', !searchQuery);
      }
      renderGallery();
    });

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        playUiSound('click');
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        renderGallery();
        searchInput.focus();
      });
    }

    // Filtros de dificultad
    filterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      playUiSound('click');

      filterChips.querySelectorAll('.chip').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');

      currentDifficultyFilter = chip.getAttribute('data-difficulty');
      renderGallery();
    });

    // Resetear filtros
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        playUiSound('click');
        searchQuery = '';
        searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
        currentDifficultyFilter = 'all';
        
        filterChips.querySelectorAll('.chip').forEach(c => {
          const isAll = c.getAttribute('data-difficulty') === 'all';
          c.classList.toggle('active', isAll);
          c.setAttribute('aria-selected', isAll ? 'true' : 'false');
        });

        renderGallery();
      });
    }

    // Alternar sonido UI
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        if (soundIconEl) {
          soundIconEl.textContent = soundEnabled ? '🔊' : '🔇';
        }
        if (soundEnabled) playUiSound('click');
      });
    }

    // Controles del visor iframe
    backBtn.addEventListener('click', closeGame);
    reloadGameBtn.addEventListener('click', reloadGame);
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    document.addEventListener('fullscreenchange', () => {
      if (fullscreenIcon) {
        fullscreenIcon.textContent = document.fullscreenElement ? '✕' : '⛶';
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !gameOverlay.classList.contains('hidden')) {
        closeGame();
      }
    });
  }

  /**
   * MOTOR DE FONDO ESTELAR INTERACTIVO (Canvas 2D con soporte táctil y Retina)
   */
  function initStarfield() {
    const canvas = document.getElementById('starfield-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Ajustar número de estrellas según tamaño de pantalla
    const STARS_COUNT = Math.min(240, Math.floor((width * height) / 5000));
    const stars = [];
    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;

    for (let i = 0; i < STARS_COUNT; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.006,
        twinklePhase: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        color: Math.random() > 0.8 ? '#00f0ff' : Math.random() > 0.6 ? '#c084fc' : '#ffffff'
      });
    }

    // Cometas / Estrellas fugaces
    let shootingStar = null;
    let nextShootingStarAt = Date.now() + Math.random() * 4000 + 2500;

    function spawnShootingStar() {
      const startX = Math.random() * width * 0.85;
      const startY = Math.random() * height * 0.4;
      const speed = Math.random() * 8 + 11;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;

      shootingStar = {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: Math.random() * 90 + 70,
        life: 1.0,
        decay: 0.022
      };
    }

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    window.addEventListener('mousemove', (e) => {
      targetMouseX = (e.clientX - width / 2) * 0.02;
      targetMouseY = (e.clientY - height / 2) * 0.02;
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        targetMouseX = (e.touches[0].clientX - width / 2) * 0.015;
        targetMouseY = (e.touches[0].clientY - height / 2) * 0.015;
      }
    }, { passive: true });

    function renderStarfield() {
      // Suavizar movimiento del parallax
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Renderizar estrellas
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        s.twinklePhase += s.twinkleSpeed;

        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;

        const currentAlpha = Math.max(0.12, Math.min(1, s.alpha + Math.sin(s.twinklePhase) * 0.35));
        ctx.fillStyle = s.color;
        ctx.globalAlpha = currentAlpha;
        ctx.beginPath();
        ctx.arc(s.x + mouseX * (s.size * 0.6), s.y + mouseY * (s.size * 0.6), s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Renderizar cometa / estrella fugaz
      const now = Date.now();
      if (!shootingStar && now > nextShootingStarAt) {
        spawnShootingStar();
        nextShootingStarAt = now + Math.random() * 6000 + 4000;
      }

      if (shootingStar) {
        ctx.save();
        ctx.globalAlpha = shootingStar.life;
        ctx.lineWidth = 2.2;

        const tailX = shootingStar.x - (shootingStar.vx / 12) * shootingStar.len;
        const tailY = shootingStar.y - (shootingStar.vy / 12) * shootingStar.len;

        const grad = ctx.createLinearGradient(shootingStar.x, shootingStar.y, tailX, tailY);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#00f0ff');
        grad.addColorStop(1, 'transparent');

        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(shootingStar.x, shootingStar.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        shootingStar.x += shootingStar.vx;
        shootingStar.y += shootingStar.vy;
        shootingStar.life -= shootingStar.decay;

        if (shootingStar.life <= 0 || shootingStar.x > width + 100 || shootingStar.y > height + 100) {
          shootingStar = null;
        }
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(renderStarfield);
    }

    renderStarfield();
  }

  /**
   * Sanitización de strings para prevenir XSS
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Inicializar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
