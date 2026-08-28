export class GameLoop {
  constructor({
    fixedStep = 1 / 60,
    maxDelta = 0.1,
    maxSubSteps = 5,
    idleRenderInterval = 0.25,
    shouldSimulate,
    fixedUpdate,
    update,
    render
  }) {
    this.fixedStep = fixedStep;
    this.maxDelta = maxDelta;
    this.maxSubSteps = maxSubSteps;
    this.idleRenderInterval = idleRenderInterval;
    this.shouldSimulate = shouldSimulate;
    this.fixedUpdate = fixedUpdate;
    this.update = update;
    this.render = render;

    this.running = false;
    this.accumulator = 0;
    this.lastTime = null;
    this.lastIdleRender = -Infinity;
    this.rafId = 0;
    this.hidden = document.hidden;

    this.tick = this.tick.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.lastTime = null;
    this.accumulator = 0;
  }

  handleVisibilityChange() {
    this.hidden = document.hidden;
    this.lastTime = null;
    this.accumulator = 0;
  }

  tick(now) {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);

    if (this.hidden) {
      this.lastTime = now;
      return;
    }

    if (this.lastTime === null) this.lastTime = now;
    const frameDelta = Math.min(this.maxDelta, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (this.shouldSimulate()) {
      this.accumulator = Math.min(
        this.accumulator + frameDelta,
        this.fixedStep * this.maxSubSteps
      );

      let steps = 0;
      while (this.accumulator >= this.fixedStep && steps < this.maxSubSteps && this.shouldSimulate()) {
        this.fixedUpdate(this.fixedStep);
        this.accumulator -= this.fixedStep;
        steps++;
      }

      this.update(frameDelta, this.accumulator / this.fixedStep);
      this.render();
      return;
    }

    this.accumulator = 0;
    if ((now - this.lastIdleRender) / 1000 >= this.idleRenderInterval) {
      this.lastIdleRender = now;
      this.update(0, 0);
      this.render();
    }
  }
}
