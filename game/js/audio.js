// Synthesized sound for Old Town: engine hum, sirens, blips and gunshots.
// Everything is generated with WebAudio — no audio files, no network.
export const AudioSys = {
  ctx: null,
  master: null,
  engineOsc: null,
  engineOsc2: null,
  engineGain: null,
  sirenOsc: null,
  sirenGain: null,
  sirenTimer: 0,
  sirenHigh: false,
  muted: false,
  started: false,

  init() {
    if (this.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.35;
      this.master.connect(this.ctx.destination);
      // Engine: two detuned saws through a lowpass, gain follows speed.
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 55;
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'sawtooth'; this.engineOsc2.frequency.value = 82;
      this.engineOsc.connect(lp); this.engineOsc2.connect(lp);
      lp.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start(); this.engineOsc2.start();
      // Siren: a square wave that alternates pitch.
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'square'; this.sirenOsc.frequency.value = 700;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.started = true;
    } catch (e) { /* audio is optional */ }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  },

  setEngine(speedFrac, driving) {
    if (!this.started || !this.ctx) return;
    const t = this.ctx.currentTime;
    const g = driving ? 0.05 + 0.11 * speedFrac : 0.0;
    this.engineGain.gain.setTargetAtTime(g, t, 0.08);
    const f = 48 + 110 * speedFrac;
    this.engineOsc.frequency.setTargetAtTime(f, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(f * 1.5 + 3, t, 0.08);
  },

  setSiren(on, dt) {
    if (!this.started || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (!on) { this.sirenGain.gain.setTargetAtTime(0, t, 0.1); return; }
    this.sirenGain.gain.setTargetAtTime(0.045, t, 0.1);
    this.sirenTimer += dt;
    if (this.sirenTimer > 0.42) {
      this.sirenTimer = 0;
      this.sirenHigh = !this.sirenHigh;
      this.sirenOsc.frequency.setTargetAtTime(this.sirenHigh ? 950 : 700, t, 0.02);
    }
  },

  blip(freq) {
    if (!this.started || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq || 660;
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.2);
  },

  shot() {
    if (!this.started || !this.ctx) return;
    const t = this.ctx.currentTime;
    const len = this.ctx.sampleRate * 0.12;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.25;
    src.connect(g); g.connect(this.master);
    src.start(t);
  },

  crash(hard) {
    if (!this.started || !this.ctx) return;
    const t = this.ctx.currentTime;
    const len = this.ctx.sampleRate * 0.18;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * (hard ? 0.5 : 0.25);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 300;
    src.connect(lp); lp.connect(this.master);
    src.start(t);
  },
};
