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

  playError() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(130, time);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(135, time);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.25);
    osc2.stop(time + 0.25);
  }

  playAbilityFlame() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, time);
    filter.frequency.exponentialRampToValueAtTime(1000, time + 0.2);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.8);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.8);
  }

  playAbilityDash() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);
    filter.frequency.exponentialRampToValueAtTime(8000, time + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.25);
  }

  playAbilityPulse() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, time);
    osc.frequency.exponentialRampToValueAtTime(1200, time + 0.15);
    osc.frequency.exponentialRampToValueAtTime(300, time + 0.5);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.5);
  }

  playAbilityWind() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, time);
    filter.frequency.exponentialRampToValueAtTime(1500, time + 0.15);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.4);
  }

  playAbilityCyclone() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;

    // Lingering low-frequency rumble & whoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, time);
    osc.frequency.linearRampToValueAtTime(150, time + 1.5);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 2.0);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 2.0);

    // Swirling wind sound via modulated bandpass filter
    const bufferSize = this.ctx.sampleRate * 2.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const bData = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      bData[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, time);
    
    // sweep back and forth
    filter.frequency.linearRampToValueAtTime(1200, time + 0.5);
    filter.frequency.linearRampToValueAtTime(400, time + 1.0);
    filter.frequency.linearRampToValueAtTime(1000, time + 1.5);
    filter.frequency.linearRampToValueAtTime(100, time + 2.0);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.15, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 2.0);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 2.0);
  }
}

window.SynthAudio = new SynthAudioEngine();
