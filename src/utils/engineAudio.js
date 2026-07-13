class F1EngineAudio {
  constructor() {
    this.ctx = null;
    this.osc1 = null;
    this.osc2 = null;
    this.turboOsc = null;
    this.filter = null;
    this.preDistortionGain = null;
    this.distortion = null;
    this.gainNode = null;
    this.turboGain = null;
    this.isPlaying = false;
  }

  // Simple wave shaper curve generator for clipping distortion
  makeDistortionCurve(amount = 20) {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  init() {
    if (this.ctx) return;
    
    // Create Audio Context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Lowpass filter to shape the raw sawtooth/square waves
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.Q.value = 4.0;

    // Pre-distortion gain node to scale distortion level with throttle input
    this.preDistortionGain = this.ctx.createGain();
    this.preDistortionGain.gain.value = 0.5;

    // Waveshaper distortion node
    this.distortion = this.ctx.createWaveShaper();
    this.distortion.curve = this.makeDistortionCurve(35); // 35 amount for screaming V6 grit
    this.distortion.oversample = "4x";

    // Main mix gain nodes
    this.gainNode = this.ctx.createGain();
    this.turboGain = this.ctx.createGain();

    this.gainNode.gain.value = 0.0;
    this.turboGain.gain.value = 0.0;

    // Route audio nodes: oscs -> filter -> preGain -> distortion -> mainGain -> speakers
    this.filter.connect(this.preDistortionGain);
    this.preDistortionGain.connect(this.distortion);
    this.distortion.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    // Turbo whistle runs directly to speakers
    this.turboGain.connect(this.ctx.destination);
  }

  start() {
    if (this.isPlaying) return;
    this.init();

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    // 1. Primary V6 sawtooth wave
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = "sawtooth";
    this.osc1.frequency.setValueAtTime(40, now); // 40Hz idle

    // 2. Secondary V6 square wave for aggressive exhaust crackle/buzz
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = "square";
    this.osc2.frequency.setValueAtTime(20, now);

    // 3. V6 turbocharger high-pitch whine
    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = "sine";
    this.turboOsc.frequency.setValueAtTime(2200, now);

    // Connect new oscillators
    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);
    this.turboOsc.connect(this.turboGain);

    // Start audio sources
    this.osc1.start(now);
    this.osc2.start(now);
    this.turboOsc.start(now);
    
    this.isPlaying = true;
  }

  stop() {
    if (!this.isPlaying) return;
    
    const now = this.ctx?.currentTime || 0;
    
    if (this.gainNode) this.gainNode.gain.setValueAtTime(0, now);
    if (this.turboGain) this.turboGain.gain.setValueAtTime(0, now);

    try {
      if (this.osc1) {
        this.osc1.stop(now);
        this.osc1.disconnect();
      }
      if (this.osc2) {
        this.osc2.stop(now);
        this.osc2.disconnect();
      }
      if (this.turboOsc) {
        this.turboOsc.stop(now);
        this.turboOsc.disconnect();
      }
    } catch (e) {
      console.warn("Failed to stop oscillators:", e);
    }

    this.osc1 = null;
    this.osc2 = null;
    this.turboOsc = null;
    this.isPlaying = false;
  }

  update(rpmPercent, throttle, isBoosting) {
    if (!this.isPlaying || !this.ctx || !this.osc1 || !this.osc2 || !this.turboOsc) return;

    const now = this.ctx.currentTime;

    // Frequency maps 40Hz (idle) to 480Hz (redline) based on RPM
    const baseFreq = 40 + rpmPercent * 440;
    
    // Smooth frequency sweeps
    this.osc1.frequency.setTargetAtTime(baseFreq, now, 0.02);
    this.osc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.02); // sub-octave square wave

    // Turbo whistle frequency scales with throttle and engine speeds
    const turboFreq = 1800 + rpmPercent * 6000 + (throttle * 1200);
    this.turboOsc.frequency.setTargetAtTime(turboFreq, now, 0.04);

    // Filter opens on heavy throttle to let high-frequency exhaust notes growl
    const cutoff = 220 + (rpmPercent * 1600) + (throttle * 1200);
    this.filter.frequency.setTargetAtTime(cutoff, now, 0.02);

    // Scale pre-distortion gain: higher throttle drives waveshaper harder
    // This creates the "screams on power, drops on lift" dynamic clipping effect
    const targetPreGain = 0.5 + (throttle * 2.5) + (isBoosting ? 1.0 : 0.0);
    this.preDistortionGain.gain.setTargetAtTime(targetPreGain, now, 0.04);

    // General mix volume adjustments
    const targetEngineVolume = 0.10 + (throttle * 0.16) + (rpmPercent * 0.06);
    this.gainNode.gain.setTargetAtTime(targetEngineVolume, now, 0.04);

    // Turbo whistle gains (glowing whistle on throttle & boost)
    const targetTurboVolume = (throttle * 0.008) + (isBoosting ? 0.012 : 0.0) + (rpmPercent * 0.003);
    this.turboGain.gain.setTargetAtTime(targetTurboVolume, now, 0.08);
  }
}

export const engineAudio = new F1EngineAudio();
