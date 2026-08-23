/* ==========================================================================
   AUDIO SYNTHESIZER (Web Audio API)
   ========================================================================== */

let audioCtx = null;
let soundEnabled = true;
let bgmTimer = null;

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    startBGM();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function snd(freq, dur, type = 'sine', vol = 0.15, slideTo = null) {
  if (!soundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, audioCtx.currentTime + dur);
    }
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}

export function sfxPlant() { snd(360, 0.08, 'triangle', 0.14, 520); }
export function sfxWater() { snd(260, 0.16, 'sine', 0.16, 380); }
export function sfxHarvest() {
  snd(523, 0.08, 'triangle', 0.15);
  setTimeout(() => snd(659, 0.08, 'triangle', 0.15), 60);
  setTimeout(() => snd(784, 0.14, 'sine', 0.18), 120);
}
export function sfxGolden() {
  [523, 659, 784, 1046, 1318].forEach((f, i) => {
    setTimeout(() => snd(f, 0.15, 'sine', 0.18), i * 50);
  });
}
export function sfxSell() {
  snd(987, 0.08, 'sine', 0.15);
  setTimeout(() => snd(1318, 0.15, 'triangle', 0.15), 80);
}
export function sfxBuy() {
  snd(659, 0.06, 'triangle', 0.15);
  setTimeout(() => snd(523, 0.1, 'sine', 0.15), 60);
}
export function sfxLevelUp() {
  [440, 554, 659, 880].forEach((f, i) => setTimeout(() => snd(f, 0.2, 'triangle', 0.2), i * 100));
}
export function sfxAnimal() { snd(300, 0.15, 'triangle', 0.12, 380); }

export function startBGM() {
  if (bgmTimer) clearInterval(bgmTimer);
  const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
  bgmTimer = setInterval(() => {
    if (!soundEnabled || !audioCtx) return;
    if (Math.random() < 0.65) {
      snd(scale[Math.floor(Math.random() * scale.length)], 0.4, 'sine', 0.02);
    }
  }, 600);
}

export function toggleAudio() {
  initAudio();
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('snd-toggle');
  if (btn) btn.textContent = soundEnabled ? '🔊' : '🔇';
}
