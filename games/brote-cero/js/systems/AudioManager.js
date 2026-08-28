const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class AudioManager {
  constructor(config = {}) {
    this.config = config;
    this.masterVolume = config.masterVolume ?? 0.6;
    this.ctx = null;
    this.master = null;
    this.buses = {};
    this.noiseBuf = null;
    this.unlocked = false;
    this.voiceSlots = [];
    this.listenerPosition = { x: 0, y: 0, z: 0 };
    this.listenerForward = { x: 0, y: 0, z: -1 };
    this.voiceLastAt = new Map();
    this.ambient = null;
  }

  init() {
    if (this.unlocked && this.ctx?.state === 'running') return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!this.ctx) this.createGraph(new AudioContextClass());
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      this.unlocked = true;
    } catch (error) {
      console.warn('Brote Cero: no fue posible iniciar Web Audio.', error);
    }
  }

  createGraph(context) {
    this.ctx = context;
    this.master = context.createGain();
    this.master.gain.value = this.masterVolume;
    this.master.connect(context.destination);

    const busConfig = this.config.buses || { effects: 1 };
    for (const [name, volume] of Object.entries(busConfig)) {
      const bus = context.createGain();
      bus.gain.value = volume;
      bus.connect(this.master);
      this.buses[name] = bus;
    }
    if (!this.buses.effects) this.buses.effects = this.master;

    const length = Math.max(44100, context.sampleRate | 0);
    this.noiseBuf = context.createBuffer(1, length, context.sampleRate);
    const samples = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < length; i++) samples[i] = Math.random() * 2 - 1;
    this.createVoicePool();
    this.createAmbience();
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  suspend() {
    if (this.ctx?.state === 'running') this.ctx.suspend().catch(() => {});
  }

  getBus(category = 'effects') {
    return this.buses[category] || this.buses.effects || this.master;
  }

  configurePanner(panner, options = {}) {
    const spatial = this.config.spatial || {};
    panner.panningModel = 'HRTF';
    panner.distanceModel = spatial.distanceModel || 'inverse';
    panner.refDistance = options.refDistance ?? spatial.refDistance ?? 3.5;
    panner.maxDistance = options.maxDistance ?? spatial.maxDistance ?? 42;
    panner.rolloffFactor = options.rolloffFactor ?? spatial.rolloffFactor ?? 1.25;
  }

  setNodePosition(node, position) {
    if (node.positionX) {
      node.positionX.value = position.x;
      node.positionY.value = position.y || 0;
      node.positionZ.value = position.z;
    } else {
      node.setPosition(position.x, position.y || 0, position.z);
    }
  }

  createDestination(options = {}) {
    if (!this.ctx || !this.master) return null;
    const bus = this.getBus(options.category);
    if (options.position && this.ctx.createPanner) {
      const panner = this.ctx.createPanner();
      this.configurePanner(panner, options);
      this.setNodePosition(panner, options.position);
      panner.connect(bus);
      return { node: panner, transient: true };
    }
    if (typeof options.pan === 'number' && this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = clamp(options.pan, -1, 1);
      panner.connect(bus);
      return { node: panner, transient: true };
    }
    return { node: bus, transient: false };
  }

  burst(options) {
    if (!this.ctx || !this.noiseBuf) return;
    try {
      const t0 = this.ctx.currentTime + (options.at || 0);
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuf;
      source.playbackRate.value = options.rate || 1;
      const filter = this.ctx.createBiquadFilter();
      filter.type = options.ftype || 'bandpass';
      filter.frequency.setValueAtTime(Math.max(40, options.f || 1000), t0);
      if (options.fEnd) filter.frequency.exponentialRampToValueAtTime(Math.max(40, options.fEnd), t0 + Math.max(0.01, options.dur));
      filter.Q.value = options.q || 1;
      const gain = this.ctx.createGain();
      const volume = Math.max(0.001, options.vol ?? 0.4);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + Math.max(0.002, options.attack || 0.005));
      gain.gain.linearRampToValueAtTime(0.0001, t0 + Math.max(0.01, options.dur));
      const destination = this.createDestination(options);
      if (!destination) return;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(destination.node);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
        if (destination.transient) destination.node.disconnect();
      };
      source.start(t0);
      source.stop(t0 + options.dur + 0.08);
    } catch (error) {
      console.warn('Brote Cero: efecto de ruido omitido.', error);
    }
  }

  tone(options) {
    if (!this.ctx) return;
    try {
      const t0 = this.ctx.currentTime + (options.at || 0);
      const oscillator = this.ctx.createOscillator();
      oscillator.type = options.wave || 'square';
      oscillator.frequency.setValueAtTime(Math.max(20, options.f || 440), t0);
      if (options.fEnd) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.fEnd), t0 + Math.max(0.01, options.dur));
      const gain = this.ctx.createGain();
      const volume = Math.max(0.001, options.vol ?? 0.3);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + Math.max(0.002, options.attack || 0.005));
      gain.gain.linearRampToValueAtTime(0.0001, t0 + Math.max(0.01, options.dur));
      const destination = this.createDestination(options);
      if (!destination) return;
      oscillator.connect(gain);
      gain.connect(destination.node);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        if (destination.transient) destination.node.disconnect();
      };
      oscillator.start(t0);
      oscillator.stop(t0 + options.dur + 0.05);
    } catch (error) {
      console.warn('Brote Cero: tono omitido.', error);
    }
  }

  createVoicePool() {
    const maxVoices = this.config.zombieVoices?.maxVoices || 12;
    for (let i = 0; i < maxVoices; i++) {
      const panner = this.ctx.createPanner();
      this.configurePanner(panner);
      const gain = this.ctx.createGain();
      gain.gain.value = 0.0001;
      gain.connect(panner);
      panner.connect(this.getBus('enemies'));
      this.voiceSlots.push({ panner, gain, active: false, priority: -Infinity, sources: [], token: 0 });
    }
  }

  playZombieVoice({ sourceId, position, frequency = 80, volume = 0.5, pitch = 1, state = 'CHASE', attacking = false }) {
    if (!this.ctx || !this.noiseBuf || !position) return false;
    const repeatDelay = this.config.zombieVoices?.minRepeatDelay || 0;
    if (sourceId !== undefined) {
      const lastAt = this.voiceLastAt.get(sourceId) ?? -Infinity;
      if (!attacking && this.ctx.currentTime - lastAt < repeatDelay) return false;
      this.voiceLastAt.set(sourceId, this.ctx.currentTime);
    }
    const dx = position.x - this.listenerPosition.x;
    const dz = position.z - this.listenerPosition.z;
    const distance = Math.hypot(dx, dz);
    const invDistance = 1 / Math.max(0.001, distance);
    const facing = this.listenerForward.x * dx * invDistance + this.listenerForward.z * dz * invDistance;
    const voiceConfig = this.config.zombieVoices || {};
    const priority = 1 / (1 + distance * 0.12) + (facing < 0 ? voiceConfig.offscreenPriorityBonus || 0 : 0) + (attacking ? voiceConfig.attackPriorityBonus || 0 : 0);
    let slot = this.voiceSlots.find(candidate => !candidate.active);
    if (!slot) {
      slot = this.voiceSlots.reduce((lowest, candidate) => candidate.priority < lowest.priority ? candidate : lowest, this.voiceSlots[0]);
      if (!slot || slot.priority >= priority) return false;
      this.releaseVoice(slot);
    }

    const duration = attacking ? 0.34 : state === 'IDLE' ? 0.72 : 0.56;
    const t0 = this.ctx.currentTime;
    const token = ++slot.token;
    slot.active = true;
    slot.priority = priority;
    this.setNodePosition(slot.panner, position);
    slot.gain.gain.cancelScheduledValues(t0);
    slot.gain.gain.setValueAtTime(0.0001, t0);
    slot.gain.gain.linearRampToValueAtTime(Math.max(0.015, volume), t0 + 0.025);
    slot.gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuf;
    noise.playbackRate.value = 0.82 + pitch * 0.18;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(Math.max(55, frequency * pitch * 1.7), t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * pitch * 0.72), t0 + duration);
    filter.Q.value = attacking ? 3.4 : 2.7;
    const oscillator = this.ctx.createOscillator();
    oscillator.type = state === 'STAGGER' ? 'triangle' : 'sawtooth';
    oscillator.frequency.setValueAtTime(Math.max(35, frequency * pitch), t0);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(28, frequency * pitch * 0.52), t0 + duration);
    const toneGain = this.ctx.createGain();
    toneGain.gain.value = attacking ? 0.5 : 0.34;
    noise.connect(filter);
    filter.connect(slot.gain);
    oscillator.connect(toneGain);
    toneGain.connect(slot.gain);
    slot.sources = [noise, oscillator, filter, toneGain];
    oscillator.onended = () => {
      if (slot.token !== token) return;
      this.releaseVoice(slot, false);
    };
    noise.start(t0);
    oscillator.start(t0);
    noise.stop(t0 + duration + 0.02);
    oscillator.stop(t0 + duration + 0.03);
    return true;
  }

  releaseVoice(slot, stopSources = true) {
    if (stopSources) {
      for (const source of slot.sources.slice(0, 2)) {
        try { source.stop(); } catch (error) {}
      }
    }
    for (const node of slot.sources) {
      try { node.disconnect(); } catch (error) {}
    }
    slot.sources.length = 0;
    slot.active = false;
    slot.priority = -Infinity;
    if (this.ctx) slot.gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
  }

  createAmbience() {
    const ambientBus = this.getBus('ambient');
    const ambientNoise = this.ctx.createBufferSource();
    ambientNoise.buffer = this.noiseBuf;
    ambientNoise.loop = true;
    const ambientFilter = this.ctx.createBiquadFilter();
    ambientFilter.type = 'lowpass';
    ambientFilter.frequency.value = 310;
    const ambientGain = this.ctx.createGain();
    ambientGain.gain.value = 0.0001;
    ambientNoise.connect(ambientFilter);
    ambientFilter.connect(ambientGain);
    ambientGain.connect(ambientBus);

    const hordeNoise = this.ctx.createBufferSource();
    hordeNoise.buffer = this.noiseBuf;
    hordeNoise.loop = true;
    hordeNoise.playbackRate.value = 0.45;
    const hordeFilter = this.ctx.createBiquadFilter();
    hordeFilter.type = 'bandpass';
    hordeFilter.frequency.value = 105;
    hordeFilter.Q.value = 1.8;
    const hordeGain = this.ctx.createGain();
    hordeGain.gain.value = 0.0001;
    hordeNoise.connect(hordeFilter);
    hordeFilter.connect(hordeGain);
    hordeGain.connect(ambientBus);
    ambientNoise.start();
    hordeNoise.start();
    this.ambient = { ambientNoise, ambientGain, hordeNoise, hordeGain };
  }

  updateListener(position, forward, up = { x: 0, y: 1, z: 0 }) {
    if (!this.ctx) return;
    this.listenerPosition.x = position.x;
    this.listenerPosition.y = position.y || 0;
    this.listenerPosition.z = position.z;
    this.listenerForward.x = forward.x;
    this.listenerForward.y = forward.y || 0;
    this.listenerForward.z = forward.z;
    const listener = this.ctx.listener;
    if (listener.positionX) {
      const time = this.ctx.currentTime;
      listener.positionX.setValueAtTime(position.x, time);
      listener.positionY.setValueAtTime(position.y || 0, time);
      listener.positionZ.setValueAtTime(position.z, time);
      listener.forwardX.setValueAtTime(forward.x, time);
      listener.forwardY.setValueAtTime(forward.y || 0, time);
      listener.forwardZ.setValueAtTime(forward.z, time);
      listener.upX.setValueAtTime(up.x, time);
      listener.upY.setValueAtTime(up.y, time);
      listener.upZ.setValueAtTime(up.z, time);
    } else {
      listener.setPosition(position.x, position.y || 0, position.z);
      listener.setOrientation(forward.x, forward.y || 0, forward.z, up.x, up.y, up.z);
    }
  }

  updateAtmosphere({ phase, intensity, activeZombies, distantZombies }) {
    if (!this.ctx || !this.ambient) return;
    const config = this.config.ambience || {};
    const calmPhase = phase === 'PREPARE' || phase === 'RECOVERY' || phase === 'COMPLETE';
    const phaseScale = calmPhase ? 0.55 : phase === 'PEAK' ? 1.15 : 0.85;
    const baseTarget = (config.baseLevel || 0.05) * (calmPhase ? 0.62 : 1);
    const crowd = clamp((distantZombies + activeZombies * 0.35) / 18, 0, 1);
    const hordeTarget = (config.hordeMaxLevel || 0.14) * crowd * (0.35 + intensity * 0.65) * phaseScale;
    const time = this.ctx.currentTime;
    const smoothing = Math.max(0.1, config.smoothing || 1.8);
    this.ambient.ambientGain.gain.setTargetAtTime(Math.max(0.0001, baseTarget), time, smoothing);
    this.ambient.hordeGain.gain.setTargetAtTime(Math.max(0.0001, hordeTarget), time, smoothing);
  }

  playWaveCue(event) {
    if (event.type === 'WAVE_STARTED') {
      this.tone({ category: 'music', wave: 'sawtooth', f: 112, fEnd: 86, vol: 0.32, dur: 0.72 });
      this.tone({ category: 'music', wave: 'triangle', f: 168, fEnd: 129, vol: 0.18, dur: 0.72 });
    } else if (event.type === 'WAVE_PEAK') {
      this.burst({ category: 'music', f: 520, fEnd: 90, q: 1.1, vol: 0.24, dur: 0.5 });
    } else if (event.type === 'WAVE_COMPLETED') {
      this.tone({ category: 'ui', wave: 'sine', f: 587, fEnd: 880, vol: 0.32, dur: 0.4 });
      this.tone({ category: 'ui', wave: 'sine', f: 880, fEnd: 1174, vol: 0.34, dur: 0.5, at: 0.2 });
    }
  }

  playObjectiveCue(event, position = null) {
    const spatial = position ? { position, refDistance: 4, maxDistance: 38 } : {};
    if (event.type === 'ANNOUNCED' && event.objective?.type === 'RESTORE_POWER') {
      this.burst({ category: 'effects', ftype: 'lowpass', f: 260, fEnd: 55, q: 0.8, vol: 0.42, dur: 0.75, ...spatial });
      this.tone({ category: 'ui', wave: 'square', f: 92, fEnd: 58, vol: 0.18, dur: 0.55 });
    } else if (event.type === 'ANNOUNCED' && event.objective?.type === 'DEFEND_POSITION') {
      this.tone({ category: 'ui', wave: 'square', f: 470, fEnd: 390, vol: 0.22, dur: 0.24 });
      this.tone({ category: 'ui', wave: 'square', f: 470, fEnd: 390, vol: 0.22, dur: 0.24, at: 0.34 });
    } else if (event.type === 'ANNOUNCED' && event.objective?.type === 'SUPPLY_CACHE') {
      this.tone({ category: 'ui', wave: 'sine', f: 720, fEnd: 1120, vol: 0.24, dur: 0.22 });
      this.tone({ category: 'ui', wave: 'sine', f: 980, fEnd: 1420, vol: 0.18, dur: 0.2, at: 0.2 });
    } else if (event.type === 'COMPLETED') {
      this.tone({ category: 'ui', wave: 'triangle', f: 440, fEnd: 880, vol: 0.3, dur: 0.5, ...spatial });
      this.burst({ category: 'effects', f: 1800, fEnd: 4200, q: 4, vol: 0.14, dur: 0.32, at: 0.12, ...spatial });
    } else if (event.type === 'FAILED') {
      this.tone({ category: 'ui', wave: 'sawtooth', f: 210, fEnd: 92, vol: 0.18, dur: 0.46 });
    }
  }

  reset() {
    for (const slot of this.voiceSlots) this.releaseVoice(slot);
    this.voiceLastAt.clear();
    if (this.ambient && this.ctx) {
      const time = this.ctx.currentTime;
      this.ambient.ambientGain.gain.setTargetAtTime(0.0001, time, 0.15);
      this.ambient.hordeGain.gain.setTargetAtTime(0.0001, time, 0.15);
    }
  }

  dispose() {
    this.reset();
    if (this.ambient) {
      try { this.ambient.ambientNoise.stop(); } catch (error) {}
      try { this.ambient.hordeNoise.stop(); } catch (error) {}
    }
    for (const slot of this.voiceSlots) {
      slot.gain.disconnect();
      slot.panner.disconnect();
    }
    for (const bus of Object.values(this.buses)) {
      if (bus !== this.master) bus.disconnect();
    }
    if (this.master) this.master.disconnect();
    if (this.ctx && this.ctx.state !== 'closed') this.ctx.close().catch(() => {});
    this.ctx = null;
    this.master = null;
    this.buses = {};
    this.noiseBuf = null;
    this.voiceSlots.length = 0;
    this.ambient = null;
    this.unlocked = false;
  }
}
