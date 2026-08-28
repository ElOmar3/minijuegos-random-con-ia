/**
 * EL ABISMO 3D: DEEPCORE PROTOCOL
 * Sintetizador de Audio Procedural con Cooldowns y Cero Sobrecarga de Hilos
 */

class AbyssAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ambientGain = null;
    this.sonarTimer = null;

    // Cooldowns para evitar saturación de nodos Web Audio
    this.lastWeldTime = 0;
    this.lastPumpTime = 0;
    this.lastO2Time = 0;
    this.lastAlarmTime = 0;
    this.lastHarmonicTime = 0;
    this.lastPowerupTime = 0;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.startAmbient();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.enabled ? 0.04 : 0, this.ctx.currentTime);
    }
    return this.enabled;
  }

  startAmbient() {
    if (!this.ctx || this.ambientGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.0;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, this.ctx.currentTime);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.enabled ? 0.04 : 0, this.ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);
      whiteNoise.start(0);

      this.scheduleSonar();
    } catch (e) {
      console.warn('Audio ambient init error:', e);
    }
  }

  scheduleSonar() {
    if (this.sonarTimer) clearTimeout(this.sonarTimer);
    const delay = 7000 + Math.random() * 5000;
    this.sonarTimer = setTimeout(() => {
      if (this.enabled) this.playSonar();
      this.scheduleSonar();
    }, delay);
  }

  playSonar(freq = 880) {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + 1.1);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.2);
    } catch (e) {}
  }

  playWeld() {
    if (!this.enabled || !this.ctx) return;
    const nowMs = performance.now();
    if (nowMs - this.lastWeldTime < 220) return; // Máximo 1 vez cada 220ms
    this.lastWeldTime = nowMs;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200 + Math.random() * 80, now);
      osc.frequency.linearRampToValueAtTime(320 + Math.random() * 100, now + 0.07);

      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }

  playPump() {
    if (!this.enabled || !this.ctx) return;
    const nowMs = performance.now();
    if (nowMs - this.lastPumpTime < 350) return;
    this.lastPumpTime = nowMs;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(85, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playOxygenFlow() {
    if (!this.enabled || !this.ctx) return;
    const nowMs = performance.now();
    if (nowMs - this.lastO2Time < 350) return;
    this.lastO2Time = nowMs;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(460, now + 0.18);

      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  playNTIHarmonic() {
    if (!this.enabled || !this.ctx) return;
    const nowMs = performance.now();
    if (nowMs - this.lastHarmonicTime < 800) return;
    this.lastHarmonicTime = nowMs;

    try {
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.025, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0 + idx * 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + 1.05 + idx * 0.08);
      });
    } catch (e) {}
  }

  playPowerup() {
    if (!this.enabled || !this.ctx) return;
    const nowMs = performance.now();
    if (nowMs - this.lastPowerupTime < 250) return;
    this.lastPowerupTime = nowMs;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }

  playAlarm() {
    if (!this.enabled || !this.ctx) return;
    const nowMs = performance.now();
    if (nowMs - this.lastAlarmTime < 1200) return;
    this.lastAlarmTime = nowMs;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.linearRampToValueAtTime(360, now + 0.18);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  playVictory() {
    if (!this.enabled || !this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      const now = this.ctx.currentTime;
      notes.forEach((note, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, now + i * 0.12);
        gain.gain.setValueAtTime(0.06, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.5);
      });
    } catch (e) {}
  }

  playGameOver() {
    if (!this.enabled || !this.ctx) return;
    try {
      const notes = [280, 220, 160, 100, 70];
      const now = this.ctx.currentTime;
      notes.forEach((note, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note, now + i * 0.15);
        gain.gain.setValueAtTime(0.05, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.35);
      });
    } catch (e) {}
  }
}
