import * as THREE from 'three';

export class InteractionManager {
  constructor({ camera, config, hasLineOfSight, onPromptChanged, onHoldChanged = () => {} }) {
    this.camera = camera;
    this.config = config;
    this.hasLineOfSight = hasLineOfSight;
    this.onPromptChanged = onPromptChanged;
    this.onHoldChanged = onHoldChanged;
    this.entries = [];
    this.current = null;
    this.lastEntry = null;
    this.lastPromptKey = '';
    this.holdEntry = null;
    this.holdActive = false;
    this.cameraPosition = new THREE.Vector3();
    this.cameraForward = new THREE.Vector3();
  }

  register(entry) {
    entry.mode ||= 'PRESS';
    entry.holdElapsed = 0;
    this.entries.push(entry);
    return entry;
  }

  unregister(entry) {
    const index = this.entries.indexOf(entry);
    if (index >= 0) this.entries.splice(index, 1);
    if (this.holdEntry === entry) this.cancelHold({ reset: true });
    if (this.current === entry) this.setCurrent(null);
  }

  update(dt = 0) {
    this.camera.getWorldPosition(this.cameraPosition);
    this.camera.getWorldDirection(this.cameraForward);
    let best = null;
    let bestScore = -Infinity;
    for (const entry of this.entries) {
      if (entry.isActive && !entry.isActive()) continue;
      const position = typeof entry.getPosition === 'function' ? entry.getPosition() : entry.position;
      if (!position) continue;
      const dx = position.x - this.cameraPosition.x;
      const dy = position.y - this.cameraPosition.y;
      const dz = position.z - this.cameraPosition.z;
      const distance = Math.hypot(dx, dy, dz);
      const maxDistance = entry.maxDistance || this.config.maxDistance;
      if (distance > maxDistance || distance < 0.001) continue;
      const invDistance = 1 / distance;
      const dot = (dx * this.cameraForward.x + dy * this.cameraForward.y + dz * this.cameraForward.z) * invDistance;
      if (dot < (entry.minAimDot || this.config.minAimDot)) continue;
      if (this.hasLineOfSight && !this.hasLineOfSight(this.cameraPosition, position, this.config.visibilityRadius)) continue;
      const score = dot * 2 - distance / maxDistance;
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    this.setCurrent(best);
    this.updateHold(dt);
  }

  setCurrent(entry) {
    const prompt = entry?.getPrompt?.();
    const nextPrompt = prompt ? { ...prompt, mode: entry.mode || prompt.mode || 'PRESS' } : null;
    const nextPromptKey = nextPrompt
      ? `${nextPrompt.label || ''}|${nextPrompt.cost ?? ''}|${nextPrompt.costText || ''}`
      : '';
    if (entry !== this.current && this.holdActive) this.cancelHold();
    this.current = entry;
    if (entry !== this.lastEntry || nextPromptKey !== this.lastPromptKey) {
      this.lastEntry = entry;
      this.lastPromptKey = nextPromptKey;
      this.onPromptChanged(nextPrompt || null);
    }
  }

  refreshPrompt() {
    const prompt = this.current?.getPrompt?.();
    this.onPromptChanged(prompt ? { ...prompt, mode: this.current.mode || prompt.mode || 'PRESS' } : null);
  }

  begin() {
    if (!this.current) return false;
    if (this.current.mode !== 'HOLD') return this.activate();
    this.holdEntry = this.current;
    this.holdActive = true;
    this.holdEntry.onHoldStart?.();
    this.publishHold();
    return true;
  }

  end() {
    if (!this.holdActive) return false;
    this.holdActive = false;
    this.holdEntry?.onHoldEnd?.(this.holdEntry.holdElapsed || 0);
    this.publishHold();
    return true;
  }

  activate() {
    if (!this.current) return false;
    const result = this.current.interact?.();
    this.refreshPrompt();
    return result !== false;
  }

  updateHold(dt) {
    const entry = this.holdEntry;
    if (!entry) return;
    const duration = Math.max(0.1, entry.duration || 1);
    if (this.holdActive && entry === this.current) {
      if (entry.cancelWhen?.()) {
        this.cancelHold();
        return;
      }
      entry.holdElapsed = Math.min(duration, entry.holdElapsed + Math.max(0, dt));
      entry.onHoldProgress?.(entry.holdElapsed / duration, entry.holdElapsed);
      this.publishHold();
      if (entry.holdElapsed >= duration) {
        this.holdActive = false;
        entry.holdElapsed = 0;
        this.holdEntry = null;
        this.onHoldChanged(null);
        entry.complete?.();
        this.refreshPrompt();
      }
      return;
    }

    const decay = Math.max(0, entry.holdDecay || 0);
    if (decay > 0 && entry.holdElapsed > 0) {
      entry.holdElapsed = Math.max(0, entry.holdElapsed - dt * decay);
      entry.onHoldProgress?.(entry.holdElapsed / duration, entry.holdElapsed);
      this.publishHold();
    }
    if (entry.holdElapsed <= 0 && !this.holdActive) {
      this.holdEntry = null;
      this.onHoldChanged(null);
    }
  }

  interruptHold() {
    if (!this.holdEntry) return false;
    const entry = this.holdEntry;
    this.holdActive = false;
    entry.holdElapsed = Math.max(0, entry.holdElapsed - Math.max(0, entry.cancelPenalty || 0));
    entry.onHoldInterrupted?.(entry.holdElapsed);
    this.publishHold();
    return true;
  }

  cancelHold({ reset = false } = {}) {
    if (!this.holdEntry) return false;
    this.holdActive = false;
    if (reset) this.holdEntry.holdElapsed = 0;
    this.holdEntry.onHoldEnd?.(this.holdEntry.holdElapsed || 0);
    this.publishHold();
    if (reset || this.holdEntry.holdElapsed <= 0) {
      this.holdEntry = null;
      this.onHoldChanged(null);
    }
    return true;
  }

  publishHold() {
    if (!this.holdEntry) return this.onHoldChanged(null);
    const duration = Math.max(0.1, this.holdEntry.duration || 1);
    this.onHoldChanged({
      progress: Math.min(1, this.holdEntry.holdElapsed / duration),
      active: this.holdActive,
      label: this.holdEntry.getPrompt?.()?.label || ''
    });
  }

  reset() {
    this.cancelHold({ reset: true });
    for (const entry of this.entries) entry.holdElapsed = 0;
    this.current = null;
    this.lastEntry = null;
    this.lastPromptKey = '';
    this.onPromptChanged(null);
    this.onHoldChanged(null);
  }

  dispose() {
    this.reset();
    this.entries.length = 0;
  }
}
