// Beaconkeeper — sound: every effect is synthesised with WebAudio, no audio files.
// Footsteps tick softly, the bell tolls, the alarm stings, and the wind never stops.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.windNodes = null;
    this.lastStep = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startWind();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  startWind() {
    // Looped filtered noise, like wind around a tower at night.
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start();
    this.windNodes = { src, filter, g };
    // Slow swell: the wind breathes.
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    lfo.start();
  }

  step(sneaking) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (now - this.lastStep < (sneaking ? 420 : 240)) return;
    this.lastStep = now;
    this.tone(sneaking ? 190 : 150, 0.07, 'triangle', sneaking ? 0.03 : 0.07);
  }

  pickup() {
    this.tone(660, 0.16, 'sine', 0.16);
    this.tone(990, 0.22, 'sine', 0.14, 0.09);
  }

  pebble() {
    this.tone(1400, 0.06, 'square', 0.05);
    this.tone(900, 0.08, 'square', 0.05, 0.12);
  }

  bell() {
    this.tone(392, 1.4, 'sine', 0.22);
    this.tone(587, 1.1, 'sine', 0.12, 0.02);
    this.tone(784, 0.7, 'sine', 0.07, 0.04);
  }

  alarm() {
    this.tone(220, 0.32, 'sawtooth', 0.14, 0, 440);
    this.tone(440, 0.3, 'sawtooth', 0.1, 0.16, 220);
  }

  caught() {
    this.tone(330, 0.5, 'sawtooth', 0.16, 0, 110);
    this.tone(165, 0.8, 'triangle', 0.14, 0.3, 82);
  }

  floorClear() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.14, i * 0.11));
  }

  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.42, 'sine', 0.15, i * 0.13));
  }
}
