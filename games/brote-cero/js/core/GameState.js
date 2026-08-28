export const GameStates = Object.freeze({
  BOOT: 'boot',
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  PERK_SELECT: 'perk_select',
  WAVE_BREAK: 'wave_break',
  GAME_OVER: 'game_over'
});

export class GameState {
  #current;
  #previous = null;
  #listeners = new Set();

  constructor(initialState = GameStates.BOOT) {
    this.#current = initialState;
  }

  get current() {
    return this.#current;
  }

  get previous() {
    return this.#previous;
  }

  is(state) {
    return this.#current === state;
  }

  set(nextState) {
    if (!Object.values(GameStates).includes(nextState)) {
      throw new Error(`Estado de juego desconocido: ${nextState}`);
    }
    if (nextState === this.#current) return false;

    this.#previous = this.#current;
    this.#current = nextState;
    for (const listener of this.#listeners) {
      listener(nextState, this.#previous);
    }
    return true;
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}
