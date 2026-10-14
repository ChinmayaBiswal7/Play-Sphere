/**
 * Professional Web Audio API Synthesizer for Formula 1 Racing
 * Multi-layer procedural F1 V6 Turbo-Hybrid / V10 engine audio engine:
 * - Dual detuned sawtooth combustion harmonics with waveshaper tube overdrive (metallic exhaust bite)
 * - Deep sub-bass cylinder displacement growl (cockpit vibration)
 * - Dynamic high-RPM turbocharger compressor spool & whistle (1800Hz - 5200Hz)
 * - Ignition cut fuel-burn shift pops & exhaust overrun crackle
 * - Pneumatic pit stop wheel gun (Paoli impact wrench) and hydraulic jack drop SFX
 */

class ApexAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.masterVolume = 0.40;

    // Engine node references
    this.combustionOsc1 = null;
    this.combustionOsc2 = null;
    this.combustionOsc3 = null;
    this.subOsc = null;
    this.turboOsc = null;
    this.turboGain = null;
    this.engineGain = null;
    this.exhaustFilter = null;
    this.distortionNode = null;
    this.isPlayingEngine = false;

    this.lastRPM = 1500;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master compressor to ensure clean loud acoustics without digital clipping
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
    }
  }

  setVolume(val) {
    this.masterVolume = Math.max(0.0, Math.min(1.0, val));
    this.resume();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _makeDistortionCurve(amount = 25) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // Multi-layer procedural Formula 1 Engine Sound
  startEngine() {
    this.resume();
    if (!this.ctx || this.isPlayingEngine) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Primary Engine Gain
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.055, now);

      // 2. Waveshaper Distortion (gives high-rev F1 exhaust raspy scream)
      this.distortionNode = this.ctx.createWaveShaper();
      this.distortionNode.curve = this._makeDistortionCurve(18);
      this.distortionNode.oversample = '2x';

      // 3. Exhaust Resonance Peaking Filter
      this.exhaustFilter = this.ctx.createBiquadFilter();
      this.exhaustFilter.type = 'peaking';
      this.exhaustFilter.frequency.setValueAtTime(550, now);
      this.exhaustFilter.Q.setValueAtTime(3.0, now);
      this.exhaustFilter.gain.setValueAtTime(6.0, now);

      // 4. Primary Combustion Sawtooth (Fundamental combustion order)
      this.combustionOsc1 = this.ctx.createOscillator();
      this.combustionOsc1.type = 'sawtooth';
      this.combustionOsc1.frequency.setValueAtTime(75, now); // ~1500 RPM idle base

      // 5. Secondary Detuned Sawtooth (2nd harmonic richness + chorus bite)
      this.combustionOsc2 = this.ctx.createOscillator();
      this.combustionOsc2.type = 'sawtooth';
      this.combustionOsc2.frequency.setValueAtTime(150, now);
      this.combustionOsc2.detune.setValueAtTime(8, now); // +8 cents detune

      // 5b. 3rd Harmonic (V6 3-cylinder bank firing order character)
      this.combustionOsc3 = this.ctx.createOscillator();
      this.combustionOsc3.type = 'triangle';
      this.combustionOsc3.frequency.setValueAtTime(225, now);
      const osc3Gain = this.ctx.createGain();
      osc3Gain.gain.setValueAtTime(0.45, now);
      this.combustionOsc3.connect(osc3Gain);
      osc3Gain.connect(this.distortionNode);

      // 6. Sub-bass displacement rumble (Cockpit physical growl)
      this.subOsc = this.ctx.createOscillator();
      this.subOsc.type = 'triangle';
      this.subOsc.frequency.setValueAtTime(37.5, now);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.45, now);
      this.subOsc.connect(subGain);
      subGain.connect(this.distortionNode);

      // 7. Turbocharger Spool Whistle (Sine wave spooling 1800Hz - 5200Hz)
      this.turboOsc = this.ctx.createOscillator();
      this.turboOsc.type = 'sine';
      this.turboOsc.frequency.setValueAtTime(1600, now);

      this.turboGain = this.ctx.createGain();
      this.turboGain.gain.setValueAtTime(0.012, now);
      this.turboOsc.connect(this.turboGain);
      this.turboGain.connect(this.exhaustFilter);

      // Wire combustion through distortion -> filter -> engineGain -> compressor
      this.combustionOsc1.connect(this.distortionNode);
      this.combustionOsc2.connect(this.distortionNode);
      this.distortionNode.connect(this.exhaustFilter);
      this.exhaustFilter.connect(this.engineGain);
      this.engineGain.connect(this.compressor);

      this.combustionOsc1.start(now);
      this.combustionOsc2.start(now);
      this.combustionOsc3.start(now);
      this.subOsc.start(now);
      this.turboOsc.start(now);

      this.isPlayingEngine = true;
    } catch(e) {
      console.warn("Failed to start F1 engine synthesizer:", e);
    }
  }

  // Update pitch frequency based on engine RPM (1500 idle to 15000 redline)
  updateEnginePitch(rpm) {
    if (!this.isPlayingEngine || !this.combustionOsc1 || !this.ctx) return;
    const now = this.ctx.currentTime;
    const clampedRPM = Math.max(1200, Math.min(15500, rpm || 1500));
    this.lastRPM = clampedRPM;

    // Real F1 V6 4-stroke firing order: 3 firings per engine revolution
    const baseFreq = (clampedRPM / 60.0) * 3.0;
    const harmFreq = baseFreq * 2.003;
    const harm3Freq = baseFreq * 3.0;
    const subFreq = baseFreq * 0.5;

    // Load & RPM factor
    const rpmFactor = (clampedRPM - 1500) / (15000 - 1500);
    const turboFreq = 1600 + Math.pow(rpmFactor, 1.35) * 3600;
    const turboVol = 0.008 + Math.pow(rpmFactor, 1.5) * 0.055;

    // Dynamic metallic exhaust resonance filter tracking
    const filterFreq = 480 + Math.pow(rpmFactor, 1.25) * 2500;
    const filterGain = 5.0 + rpmFactor * 8.0;

    // Dynamic engine acoustic volume with load
    const dynamicGain = 0.045 + Math.pow(rpmFactor, 0.8) * 0.04;
    if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(dynamicGain, now, 0.03);
    }

    this.combustionOsc1.frequency.setTargetAtTime(baseFreq, now, 0.025);
    this.combustionOsc2.frequency.setTargetAtTime(harmFreq, now, 0.025);
    if (this.combustionOsc3) this.combustionOsc3.frequency.setTargetAtTime(harm3Freq, now, 0.025);
    if (this.subOsc) this.subOsc.frequency.setTargetAtTime(subFreq, now, 0.03);

    if (this.turboOsc && this.turboGain) {
      this.turboOsc.frequency.setTargetAtTime(turboFreq, now, 0.04);
      this.turboGain.gain.setTargetAtTime(turboVol, now, 0.05);
    }

    if (this.exhaustFilter) {
      this.exhaustFilter.frequency.setTargetAtTime(filterFreq, now, 0.03);
      this.exhaustFilter.gain.setTargetAtTime(filterGain, now, 0.03);
    }
  }

  // Clutch ignition cut + explosive exhaust backfire bang on upshift/downshift
  triggerShiftCut() {
    if (!this.isPlayingEngine || !this.engineGain || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Sudden 40ms gain drop to simulate ignition cut
    this.engineGain.gain.cancelScheduledValues(now);
    this.engineGain.gain.setValueAtTime(0.005, now);
    this.engineGain.gain.linearRampToValueAtTime(0.065, now + 0.045);

    // Explosive exhaust pop / backfire
    this.playBackfirePop();
  }

  // Sharp exhaust backfire pop
  playBackfirePop() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Low-end combustion explosion thump
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(140, now);
      popOsc.frequency.exponentialRampToValueAtTime(40, now + 0.06);

      popGain.gain.setValueAtTime(0.22, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      popOsc.connect(popGain);
      popGain.connect(this.compressor);

      popOsc.start(now);
      popOsc.stop(now + 0.08);

      // High metallic crackle (filtered noise burst)
      const bufferSize = this.ctx.sampleRate * 0.05;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.Q.setValueAtTime(1.5, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.05);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.compressor);

      noise.start(now);
      noise.stop(now + 0.06);
    } catch(e) {}
  }

  // Realistic Pneumatic Impact Wrench / Wheel Gun sound for pit stops
  playWheelGun() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const pulses = 8; // rapid 40Hz nut gun impact chatter
      const pulseInterval = 0.024; // 24ms per impact hammer

      for (let i = 0; i < pulses; i++) {
        const t = now + i * pulseInterval;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750 + Math.random() * 200, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.018);

        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.020);

        osc.connect(gain);
        gain.connect(this.compressor);

        osc.start(t);
        osc.stop(t + 0.022);
      }
    } catch(e) {}
  }

  // Heavy hydraulic jack drop metallic clank
  playJackDrop() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch(e) {}
  }

  stopEngine() {
    if (!this.isPlayingEngine) return;
    try {
      const now = this.ctx ? this.ctx.currentTime : 0;
      if (this.combustionOsc1) { this.combustionOsc1.stop(now); this.combustionOsc1.disconnect(); }
      if (this.combustionOsc2) { this.combustionOsc2.stop(now); this.combustionOsc2.disconnect(); }
      if (this.combustionOsc3) { this.combustionOsc3.stop(now); this.combustionOsc3.disconnect(); }
      if (this.subOsc) { this.subOsc.stop(now); this.subOsc.disconnect(); }
      if (this.turboOsc) { this.turboOsc.stop(now); this.turboOsc.disconnect(); }
      if (this.engineGain) this.engineGain.disconnect();
    } catch(e) {}
    this.isPlayingEngine = false;
  }

  // UI button click
  playClick() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch(e) {}
  }

  // Radio chime / upgrade notification
  playPickup() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.07, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.14);

        osc.connect(gain);
        gain.connect(this.compressor);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.16);
      });
    } catch(e) {}
  }

  // ERS boost / KERS deployment whistle
  playBoost() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.45);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(now);
      osc.stop(now + 0.52);
    } catch(e) {}
  }

  // Tyre drift screech
  playDriftScreech() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.linearRampToValueAtTime(420, now + 0.04);
      osc.frequency.linearRampToValueAtTime(310, now + 0.09);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch(e) {}
  }

  playShoot() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch(e) {}
  }

  playSpinout() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(45, now + 0.35);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(now);
      osc.stop(now + 0.42);
    } catch(e) {}
  }
}

window.ApexAudio = new ApexAudioEngine();
