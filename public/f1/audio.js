/**
 * Web Audio API Synthesizer for Apex Stars Chibi F1
 */

class ApexAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.isPlayingEngine = false;
    this.masterVolume = 0.35; // Default volume
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
    }
  }

  setVolume(val) {
    this.masterVolume = val;
    this.resume();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Synthesized motor engine sound
  startEngine() {
    this.resume();
    if (!this.ctx || this.isPlayingEngine) return;

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      
      // Combine saw and triangle for rich cartoonish motor sound
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // low pitch start
      
      this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);
      
      this.engineOsc.start(0);
      this.isPlayingEngine = true;
    } catch(e) {}
  }

  // Update pitch frequency based on car speed (speed is from 0 to 100)
  // Update pitch frequency based on engine RPM (1500 to 15000)
  updateEnginePitch(rpm) {
    if (!this.isPlayingEngine || !this.engineOsc) return;
    const baseFreq = 55;
    const maxFreq = 500;
    const targetFreq = baseFreq + ((rpm - 1500) / (15000 - 1500)) * (maxFreq - baseFreq);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.04);
  }

  // Momentarily cut engine sound gain to simulate clutch shift fuel cut
  triggerShiftCut() {
    if (!this.isPlayingEngine || !this.engineGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.engineGain.gain.cancelScheduledValues(now);
    this.engineGain.gain.setValueAtTime(0.002, now);
    this.engineGain.gain.linearRampToValueAtTime(0.04, now + 0.05); // restore after 50ms
  }

  stopEngine() {
    if (!this.isPlayingEngine) return;
    try {
      this.engineOsc.stop(0);
      this.engineOsc.disconnect();
      this.engineGain.disconnect();
    } catch(e) {}
    this.isPlayingEngine = false;
  }

  // Play button click
  playClick() {
    this.resume();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(0);
      osc.stop(this.ctx.currentTime + 0.15);
    } catch(e) {}
  }

  // Star item pickup sound
  playPickup() {
    this.resume();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Arpeggio sound
      [440, 554, 659, 880].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        
        gain.gain.setValueAtTime(0.08, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.15);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.2);
      });
    } catch(e) {}
  }

  // Nitrous boost zoom
  playBoost() {
    this.resume();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.55);
      
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(0);
      osc.stop(this.ctx.currentTime + 0.65);
    } catch(e) {}
  }

  // Drift screech sound
  playDriftScreech() {
    this.resume();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, this.ctx.currentTime);
      // Wobble frequency for screeching effect
      osc.frequency.linearRampToValueAtTime(380, this.ctx.currentTime + 0.05);
      osc.frequency.linearRampToValueAtTime(320, this.ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(0);
      osc.stop(this.ctx.currentTime + 0.15);
    } catch(e) {}
  }

  // Rocket shot sound
  playShoot() {
    this.resume();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.3);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(0);
      osc.stop(this.ctx.currentTime + 0.4);
    } catch(e) {}
  }

  // Crash / Spinout buzzer
  playSpinout() {
    this.resume();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.4);
      
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.45);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(0);
      osc.stop(this.ctx.currentTime + 0.5);
    } catch(e) {}
  }
}

window.ApexAudio = new ApexAudioEngine();
