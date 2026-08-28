import { GameLoop } from './GameLoop.js';
import { GameStates } from './GameState.js';

export class Game {
  constructor({ state, fixedUpdate, update, render, loopConfig = {} }) {
    this.state = state;
    this.loop = new GameLoop({
      ...loopConfig,
      shouldSimulate: () => this.state.is(GameStates.PLAYING),
      fixedUpdate,
      update,
      render
    });
  }

  start() {
    this.loop.start();
  }

  setState(nextState) {
    return this.state.set(nextState);
  }

  dispose() {
    this.loop.stop();
  }
}
