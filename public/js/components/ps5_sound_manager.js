/**
 * PlaySphere Sound Manager Component
 * Procedural synthesizer audio effects for boot, select, hover, trophy, and launch sweeps.
 */

class PlaySphereSoundManager {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // procedurally synthesizes the iconic low-frequency PlaySphere console ambient boot hum
  playBoot() {
    this.init();
    if (!this.ctx) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(80, this.ctx.currentTime); // Low fundamental
    osc1.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 3.0);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(160, this.ctx.currentTime); // Second harmonic
    osc2.frequency.exponentialRampToValueAtTime(240, this.ctx.currentTime + 3.0);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 3.0);
    filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3.8);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 4.0);
    osc2.stop(this.ctx.currentTime + 4.0);
  }

  // Snappy high-pitch synth click for card hovers
  playHover() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // Soft pop sound effect for selections
  playSelect() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Beautiful arpeggiated chime for trophy unlocks
  playTrophy() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Play a bright metallic major chord arpeggio
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.06, now + idx * 0.05 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.8 + idx * 0.1);
      
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 2.0);
    });
  }

  // Cinematic game launch swoosh sweep with low resonating drone
  playLaunch() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const noiseNode = this.createNoiseBufferNode();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Low-end power drone
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 2.0);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2200, this.ctx.currentTime + 1.8);
    filter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.28, this.ctx.currentTime + 0.4);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.2);

    osc.connect(filter);
    if (noiseNode) noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    if (noiseNode) noiseNode.start();

    osc.stop(this.ctx.currentTime + 2.5);
    if (noiseNode) noiseNode.stop(this.ctx.currentTime + 2.5);
  }

  createNoiseBufferNode() {
    try {
      const bufferSize = this.ctx.sampleRate * 2.5; // 2.5s duration
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      return noise;
    } catch (e) {
      return null;
    }
  }
}

// Expose globally as expected
window.sounds = new PlaySphereSoundManager();
