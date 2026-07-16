/* ==========================================================================
   DELHI DEFIANCE - WEBAUDIO procedural SOUND SYNTHESIZER
   ========================================================================== */

class SynthAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  playClick() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.08);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.08);
  }

  playSplashChime() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    
    // Low pad
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(120, time);
    gain1.gain.setValueAtTime(0.3, time);
    gain1.gain.linearRampToValueAtTime(0.01, time + 2.0);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    
    // High cyber chime notes
    const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + idx * 0.15);
      
      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.12, time + idx * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.15 + 1.2);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time + idx * 0.15);
      osc.stop(time + idx * 0.15 + 1.2);
    });

    osc1.start(time);
    osc1.stop(time + 2.0);
  }

  playShoot(weaponType = 'rifle') {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;

    // 1. Noise buffer for gunshot blast
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter for metal clamp
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    
    const gain = this.ctx.createGain();

    if (weaponType === 'sniper') {
      filter.frequency.setValueAtTime(400, time);
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    } else if (weaponType === 'pistol') {
      filter.frequency.setValueAtTime(800, time);
      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    } else { // rifle
      filter.frequency.setValueAtTime(600, time);
      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    }

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noiseNode.start(time);
    noiseNode.stop(time + 0.4);

    // 2. Heavy sine thump kick
    const kickOsc = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(weaponType === 'sniper' ? 60 : 90, time);
    kickOsc.frequency.exponentialRampToValueAtTime(10, time + 0.15);
    
    kickGain.gain.setValueAtTime(weaponType === 'sniper' ? 0.4 : 0.25, time);
    kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    kickOsc.connect(kickGain);
    kickGain.connect(this.masterGain);
    kickOsc.start(time);
    kickOsc.stop(time + 0.15);
  }

  playHeadshot() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    
    // CS style headshot "ding" (high sine wave with fast attack)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, time);
    osc.frequency.linearRampToValueAtTime(1800, time + 0.15);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  playKill() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    
    const notes = [300, 450, 600];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time + idx * 0.08);
      
      gain.gain.setValueAtTime(0.12, time + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.08 + 0.25);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time + idx * 0.08);
      osc.stop(time + idx * 0.08 + 0.25);
    });
  }

  playSpikeTick(rateMultiplier = 1.0) {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    // Higher beep pitch as time runs out
    osc.frequency.setValueAtTime(rateMultiplier > 2.0 ? 1200 : 880, time);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  playUltReady() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(900, time + 0.6);

    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.6);
  }
}

window.SynthAudio = new SynthAudioEngine();
