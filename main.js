/**
 * PORTAL DE MINIJUEGOS — LÓGICA PRINCIPAL DEL HUB
 * Responsable ÚNICAMENTE de cargar el catálogo, filtrar y controlar el visor iframe.
 * No contiene lógica de ningún juego en particular.
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
  const searchInput = document.getElementById('search-input');
  const filterChips = document.getElementById('filter-chips');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');

  // Elementos del Visor de Juego (Iframe Overlay)
  const gameOverlay = document.getElementById('game-overlay');
  const gameIframe = document.getElementById('game-iframe');
  const backBtn = document.getElementById('back-btn');
  const currentGameTitle = document.getElementById('current-game-title');
  const currentGameDifficulty = document.getElementById('current-game-difficulty');
  const currentGameTech = document.getElementById('current-game-tech');
  const reloadGameBtn = document.getElementById('reload-game-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  /**
   * Inicialización del portal
   */
  async function init() {
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
   * Renderiza las tarjetas de juegos según los filtros activos
   */
  function renderGallery() {
    const filteredGames = allGames.filter(game => {
      const matchesDifficulty = currentDifficultyFilter === 'all' || 
        (game.dificultad && game.dificultad.toLowerCase() === currentDifficultyFilter.toLowerCase());
      
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        game.titulo.toLowerCase().includes(query) ||
        game.descripcion.toLowerCase().includes(query) ||
        (game.tecnologia && game.tecnologia.toLowerCase().includes(query));

      return matchesDifficulty && matchesSearch;
    });

    // Actualizar contador
    if (gameCountEl) {
      gameCountEl.textContent = allGames.length;
    }

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
    const dificultad = (game.dificultad || 'normal').toLowerCase();
    const miniatura = game.miniatura || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225"><rect width="400" height="225" fill="%231e293b"/><text x="50%" y="50%" fill="%2394a3b8" dominant-baseline="middle" text-anchor="middle" font-size="20">Minijuego</text></svg>';

    return `
      <article class="game-card" data-id="${escapeHtml(game.id)}">
        <div class="game-card-thumbnail-wrapper">
          <img 
            src="${escapeHtml(miniatura)}" 
            alt="Miniatura de ${escapeHtml(game.titulo)}" 
            class="game-card-img"
            loading="lazy"
            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22225%22 viewBox=%220 0 400 225%22><rect width=%22400%22 height=%22225%22 fill=%22%231e293b%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%2394a3b8%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22>${encodeURIComponent(game.titulo)}</text></svg>'"
          />
        </div>
        <div class="game-card-body">
          <div class="game-card-badges">
            <span class="badge badge-difficulty" data-difficulty="${escapeHtml(dificultad)}">
              ${escapeHtml(dificultad)}
            </span>
            ${game.tecnologia ? `
              <span class="badge badge-tech">
                ${escapeHtml(game.tecnologia)}
              </span>
            ` : ''}
          </div>
          <h3 class="game-card-title">${escapeHtml(game.titulo)}</h3>
          <p class="game-card-desc">${escapeHtml(game.descripcion)}</p>
          <div class="game-card-footer">
            <button class="btn-play" data-game-id="${escapeHtml(game.id)}" aria-label="Jugar ${escapeHtml(game.titulo)}">
              <span>▶</span> Jugar
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
    
    if (currentGameDifficulty) {
      currentGameDifficulty.textContent = (game.dificultad || 'normal').toUpperCase();
      currentGameDifficulty.setAttribute('data-difficulty', (game.dificultad || 'normal').toLowerCase());
    }

    if (currentGameTech) {
      currentGameTech.textContent = game.tecnologia || 'Web';
    }

    // Ruta al index.html del juego
    const gamePath = game.carpeta.endsWith('/') ? `${game.carpeta}index.html` : `${game.carpeta}/index.html`;

    // Cargar iframe
    gameIframe.src = gamePath;

    // Mostrar modal
    gameOverlay.classList.remove('hidden');
    gameOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Foco al iframe para controles con teclado inmediatos
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
    // Detener la ejecución del juego limpiando el src del iframe
    gameIframe.src = 'about:blank';
    
    gameOverlay.classList.add('hidden');
    gameOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Si estaba en pantalla completa, salir
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
    // Filtro por búsqueda
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderGallery();
    });

    // Filtro por chips de dificultad
    filterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;

      filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      currentDifficultyFilter = chip.getAttribute('data-difficulty');
      renderGallery();
    });

    // Restablecer filtros
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

    // Botones del visor
    backBtn.addEventListener('click', closeGame);
    reloadGameBtn.addEventListener('click', reloadGame);
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Atajo de teclado: Tecla Escape para salir del juego
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !gameOverlay.classList.contains('hidden')) {
        closeGame();
      }
    });
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
