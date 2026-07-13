/**
 * Football Pro 2026 - Audio Synthesis Module (Web Audio API)
 */

export const AudioSynth = {
  ctx: null,
  activeSources: [],
  enabled: true,
  masterGain: null,
  masterVolume: 0.8,
  sfxVolume: 0.75,
  crowdVolume: 0.6,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
    }
  },

  getDestination() {
    return this.masterGain || (this.ctx ? this.ctx.destination : null);
  },

  setVolume(category, val) {
    if (category === 'master') {
      this.masterVolume = val;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
      }
    } else if (category === 'sfx') {
      this.sfxVolume = val;
    } else if (category === 'crowd') {
      this.crowdVolume = val;
    }
  },

  playKick() {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.5 * this.sfxVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  },

  playPost() {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(520, this.ctx.currentTime + 0.18);
    
    gain.gain.setValueAtTime(0.3 * this.sfxVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  },

  playWhistle() {
    if (!this.ctx || !this.enabled) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.frequency.setValueAtTime(2200, this.ctx.currentTime);
    osc2.frequency.setValueAtTime(2250, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3 * this.sfxVolume, this.ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.getDestination());

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.65);
    osc2.stop(this.ctx.currentTime + 0.65);
  },

  startCrowdAmbient() {
    if (!this.ctx || !this.enabled) return;
    this.stopAll();

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut * 0.96 + white * 0.04);
      lastOut = output[i];
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.45 * this.crowdVolume;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getDestination());

    noise.start();
    this.activeSources.push(noise);
  },

  playCheer() {
    if (!this.ctx || !this.enabled) return;
    const bufferSize = 3 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      data[i] = last * 0.9 + w * 0.1;
      last = data[i];
    }
    const cheer = this.ctx.createBufferSource();
    cheer.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 650;
    filter.Q.value = 1.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7 * this.crowdVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 2.8);

    cheer.connect(filter);
    filter.connect(gain);
    gain.connect(this.getDestination());
    cheer.start();
  },

  stopAll() {
    this.activeSources.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    this.activeSources = [];
  }
};
