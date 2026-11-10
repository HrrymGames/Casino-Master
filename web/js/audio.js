/* Tiny synthesised sound effects (no audio files needed) */
'use strict';

const Sound = {
  ctx: null,
  noiseBuf: null,

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  get on() { return Store.data && Store.data.settings.sound && this.ctx; },

  noise(dur, freq, q, gain, type = 'bandpass', when = 0) {
    if (!this.on) return;
    const c = this.ctx, t = c.currentTime + when;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t); src.stop(t + dur + 0.02);
  },

  tone(freq, dur, type = 'sine', gain = 0.15, when = 0, slideTo) {
    if (!this.on) return;
    const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  },

  card() { this.noise(0.09, 2400, 0.8, 0.35, 'bandpass'); },
  flip() { this.noise(0.06, 3200, 1.2, 0.25, 'bandpass'); },
  chip() {
    this.noise(0.04, 5200, 6, 0.5, 'bandpass');
    this.noise(0.05, 3800, 8, 0.3, 'bandpass', 0.035);
  },
  click() { this.tone(900, 0.05, 'triangle', 0.08); },
  tick() { this.noise(0.025, 4200, 10, 0.25, 'bandpass'); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.12, i * 0.09)); },
  bigWin() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, 'square', 0.06, i * 0.1)); },
  lose() { this.tone(330, 0.35, 'sawtooth', 0.06, 0, 160); },
  push() { this.tone(520, 0.18, 'sine', 0.1); this.tone(520, 0.18, 'sine', 0.1, 0.15); },
  error() { this.tone(180, 0.18, 'square', 0.06); },
  kaboo() { [392, 523, 392, 659].forEach((f, i) => this.tone(f, 0.2, 'square', 0.07, i * 0.12)); }
};

['touchstart', 'pointerdown', 'keydown'].forEach(ev =>
  window.addEventListener(ev, () => Sound.unlock(), { passive: true }));
