/**
 * COSMOS ARCADE — LÓGICA PRINCIPAL DEL HUB
 * Responsable de cargar el catálogo, filtros, control del visor iframe
 * y renderizado del fondo estelar interactivo.
 */

(function () {
  'use strict';

  // Estado del Portal
  let allGames = [];
  let currentDifficultyFilter = 'all';
  let searchQuery = '';
  let activeGame = null;

  // Elementos del DOM
  const gamesGrid = document.getElementById('games-grid');
  const emptyState = document.getElementById('empty-state');
  const gameCountEl = document.getElementById('game-count');
  const aiCountEl = document.getElementById('ai-count');
  const searchInput = document.getElementById('search-input');
  const filterChips = document.getElementById('filter-chips');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');

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
   * Actualiza las estadísticas del encabezado (cantidad de juegos e IAs activas)
   */
  function updateHeaderStats() {
    if (gameCountEl) {
      gameCountEl.textContent = allGames.length;
    }

    if (aiCountEl) {
      // Contar IAs únicas participantes
      const uniqueAIs = new Set();
      allGames.forEach(g => {
        if (g.ia) {
          g.ia.split('+').forEach(part => uniqueAIs.add(part.trim()));
        }
      });
      aiCountEl.textContent = Math.max(1, uniqueAIs.size);
    }
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

    if (filteredGames.length === 0) {
      gamesGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    gamesGrid.innerHTML = filteredGames.map(game => createGameCardHTML(game)).join('');

    // Asignar eventos de clic a los botones "Jugar"
    const playButtons = gamesGrid.querySelectorAll('.btn-play');
    playButtons.forEach(btn => {
      btn.addEventListener('click', () => {
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
    const miniatura = game.miniatura || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225"><rect width="400" height="225" fill="%231e293b"/><text x="50%" y="50%" fill="%2394a3b8" dominant-baseline="middle" text-anchor="middle" font-size="20">Minijuego</text></svg>';

    return `
      <article class="game-card" data-id="${escapeHtml(game.id)}">
        <div class="game-card-thumbnail-wrapper">
          <img 
            src="${escapeHtml(miniatura)}" 
            alt="Miniatura de ${escapeHtml(game.titulo)}" 
            class="game-card-img"
            loading="lazy"
            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22225%22 viewBox=%220 0 400 225%22><rect width=%22400%22 height=%22225%22 fill=%22%230a0f24%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%2300f0ff%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22>${encodeURIComponent(game.titulo)}</text></svg>'"
          />
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
              <span class="badge badge-tech" title="Tecnología">
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

    // Actualizar metadata del visor
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

    // Ruta al index.html del juego
    const gamePath = game.carpeta.endsWith('/') ? `${game.carpeta}index.html` : `${game.carpeta}/index.html`;

    // Cargar iframe
    gameIframe.src = gamePath;

    // Mostrar modal
    gameOverlay.classList.remove('hidden');
    gameOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Foco al iframe para controles inmediatos
    setTimeout(() => {
      gameIframe.focus();
    }, 150);
  }

  /**
   * Cierra el visor iframe y detiene el juego
   */
  function closeGame() {
    if (!activeGame) return;

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
   * Reinicia el juego actual recargando el iframe
   */
  function reloadGame() {
    if (activeGame && gameIframe.src) {
      const currentSrc = gameIframe.src;
      gameIframe.src = 'about:blank';
      setTimeout(() => {
        gameIframe.src = currentSrc;
      }, 50);
    }
  }

  /**
   * Alterna pantalla completa en el contenedor del juego
   */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      gameOverlay.requestFullscreen().catch(err => {
        console.warn(`Error al activar pantalla completa: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  /**
   * Configuración de eventos de UI
   */
  function setupEventListeners() {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderGallery();
    });

    filterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;

      filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      currentDifficultyFilter = chip.getAttribute('data-difficulty');
      renderGallery();
    });

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        searchQuery = '';
        searchInput.value = '';
        currentDifficultyFilter = 'all';
        
        filterChips.querySelectorAll('.chip').forEach(c => {
          c.classList.toggle('active', c.getAttribute('data-difficulty') === 'all');
        });

        renderGallery();
      });
    }

    backBtn.addEventListener('click', closeGame);
    reloadGameBtn.addEventListener('click', reloadGame);
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !gameOverlay.classList.contains('hidden')) {
        closeGame();
      }
    });
  }

  /**
   * MOTOR DE FONDO ESTELAR INTERACTIVO (Canvas 2D)
   */
  function initStarfield() {
    const canvas = document.getElementById('starfield-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const STARS_COUNT = Math.min(220, Math.floor((width * height) / 6000));
    const stars = [];
    let mouseX = 0, mouseY = 0;

    for (let i = 0; i < STARS_COUNT; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        color: Math.random() > 0.8 ? '#00f0ff' : Math.random() > 0.6 ? '#c084fc' : '#ffffff'
      });
    }

    // Estrellas fugaces (Cometas)
    let shootingStar = null;
    let nextShootingStarAt = Date.now() + Math.random() * 4000 + 3000;

    function spawnShootingStar() {
      const startX = Math.random() * width * 0.8;
      const startY = Math.random() * height * 0.4;
      const speed = Math.random() * 8 + 10;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;

      shootingStar = {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: Math.random() * 80 + 70,
        life: 1.0,
        decay: 0.02
      };
    }

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX - width / 2) * 0.015;
      mouseY = (e.clientY - height / 2) * 0.015;
    });

    function renderStarfield() {
      ctx.clearRect(0, 0, width, height);

      // Dibujar estrellas
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        s.twinklePhase += s.twinkleSpeed;

        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;

        const currentAlpha = Math.max(0.15, Math.min(1, s.alpha + Math.sin(s.twinklePhase) * 0.35));
        ctx.fillStyle = s.color;
        ctx.globalAlpha = currentAlpha;
        ctx.beginPath();
        ctx.arc(s.x + mouseX * (s.size * 0.5), s.y + mouseY * (s.size * 0.5), s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dibujar estrella fugaz si existe
      const now = Date.now();
      if (!shootingStar && now > nextShootingStarAt) {
        spawnShootingStar();
        nextShootingStarAt = now + Math.random() * 6000 + 4000;
      }

      if (shootingStar) {
        ctx.save();
        ctx.globalAlpha = shootingStar.life;
        ctx.strokeStyle = 'rgba(0, 240, 255, ' + shootingStar.life + ')';
        ctx.lineWidth = 2;

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
   * Utilidad para sanitizar strings y prevenir XSS
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

  // Arrancar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
