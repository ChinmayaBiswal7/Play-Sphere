// Synthesized Audio System for 3D Cricket Game using Web Audio API
// No assets required - everything is generated procedurally!

export const CricketAudio = {
  ctx: null,
  ambienceGain: null,
  masterGain: null,
  sfxGain: null,
  crowdGain: null,

  // Audio State Machine
  STATES: {
    MENU: 'MENU',
    MATCH_LOADING: 'MATCH_LOADING',
    MATCH: 'MATCH',
    PAUSED: 'PAUSED'
  },
  currentState: 'MENU',

  // BGM Synth Sequencer properties
  bgmTimer: null,
  bgmFadeTimer: null,
  bgmStep: 0,
  bgmSynthGain: null,
  isBgmPlaying: false,
  ambienceSource: null,
  isAmbiencePlaying: false,

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create master and channel gain nodes for volume control settings
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.crowdGain = this.ctx.createGain();
      this.crowdGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.crowdGain.connect(this.masterGain);
    } catch (e) {
      console.warn("AudioContext initialization failed:", e);
    }
  },

  setVolumes(master, sfx, crowd) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) this.masterGain.gain.setValueAtTime(master, now);
    if (this.sfxGain) this.sfxGain.gain.setValueAtTime(sfx, now);
    if (this.crowdGain) this.crowdGain.gain.setValueAtTime(crowd, now);
  },

  transitionTo(state) {
    if (!this.ctx) this.init();
    console.log(`Audio State Transition: ${this.currentState} ──> ${state}`);
    this.currentState = state;

    switch (state) {
      case this.STATES.MENU:
        this.stopAmbience();
        this.startBgm();
        break;

      case this.STATES.MATCH_LOADING:
        this.fadeOutBgm();
        this.stopAmbience();
        break;

      case this.STATES.MATCH:
        this.stopBgm();
        this.startAmbience();
        break;

      case this.STATES.PAUSED:
        this.pauseBgmSynth();
        if (this.crowdGain) {
          const now = this.ctx.currentTime;
          this.crowdGain.gain.exponentialRampToValueAtTime(0.25, now + 1.5);
        }
        break;
    }
  },

  // ── SIMPLE 3-LAYER SEQUENCER (Kick, Bass, Melody) ─────────────
  startBgm() {
    if (this.isBgmPlaying) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    this.bgmStep = 0;

    if (!this.bgmSynthGain) {
      this.bgmSynthGain = this.ctx.createGain();
      this.bgmSynthGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      this.bgmSynthGain.connect(this.masterGain);
    } else {
      this.bgmSynthGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    }

    const stepDuration = 0.16; // ~93 BPM 16th notes
    let nextNoteTime = this.ctx.currentTime;

    const playSequenceStep = () => {
      if (!this.isBgmPlaying) return;

      const now = this.ctx.currentTime;
      while (nextNoteTime < now + 0.1) {
        this.scheduleBgmStep(this.bgmStep, nextNoteTime);
        this.bgmStep = (this.bgmStep + 1) % 16; // 16-step simple loop
        nextNoteTime += stepDuration;
      }

      this.bgmTimer = setTimeout(playSequenceStep, 40);
    };

    playSequenceStep();
  },

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmFadeTimer) {
      clearTimeout(this.bgmFadeTimer);
      this.bgmFadeTimer = null;
    }
    if (this.bgmSynthGain) {
      try {
        this.bgmSynthGain.disconnect();
      } catch (e) {}
      this.bgmSynthGain = null;
    }
  },

  fadeOutBgm() {
    if (!this.isBgmPlaying || !this.bgmSynthGain) {
      this.stopBgm();
      return;
    }
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    const now = this.ctx.currentTime;
    this.bgmSynthGain.gain.setValueAtTime(this.bgmSynthGain.gain.value, now);
    this.bgmSynthGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    const fadeTimer = setTimeout(() => {
      if (!this.isBgmPlaying && this.bgmSynthGain) {
        try {
          this.bgmSynthGain.disconnect();
        } catch (e) {}
        this.bgmSynthGain = null;
      }
    }, 1100);
    this.bgmFadeTimer = fadeTimer; // Track for potential cleanup
  },

  pauseBgmSynth() {
    // Just stop scheduling new steps without destroying gain node
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  },

  scheduleBgmStep(step, time) {
    // Layer 1: Simple Kick Beat (four-on-the-floor feel)
    if (step % 4 === 0) {
      this.playKick(time);
    }

    // Layer 2: Bass notes (Progression: C2 -> Eb2 -> Bb2 -> F2)
    // C2 (65.4), Eb2 (77.8), Bb1 (58.2), F1 (43.7)
    let bassPitch = 65.4;
    if (step >= 4 && step < 8) bassPitch = 77.8;
    if (step >= 8 && step < 12) bassPitch = 58.2;
    if (step >= 12) bassPitch = 43.7;

    // Bass notes play on steps 0 and 2 of each chord block
    if (step % 4 === 0 || step % 4 === 2) {
      this.playBass(time, bassPitch, 0.2);
    }

    // Layer 3: Catchy Simple Arpeggiated Melody
    // Progression notes:
    // C Minor/Eb Major melody notes: C4(261.6), Eb4(311.1), G4(392.0), Bb4(466.2)
    const melodyPattern = [
      261.6, 311.1, 392.0, 466.2,
      311.1, 392.0, 466.2, 523.3,
      392.0, 466.2, 523.3, 587.3,
      466.2, 392.0, 311.1, 261.6
    ];
    
    const melodySteps = [0, 2, 3, 5, 6, 8, 10, 12, 14];
    if (melodySteps.includes(step)) {
      this.playMelody(time, melodyPattern[step], 0.1);
    }
  },

  playKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.bgmSynthGain);

    osc.frequency.setValueAtTime(100, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);

    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.start(time);
    osc.stop(time + 0.13);
  },

  playBass(time, pitch, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.connect(gain);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, time);

    gain.connect(filter);
    filter.connect(this.bgmSynthGain);

    osc.frequency.setValueAtTime(pitch, time);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  },

  playMelody(time, pitch, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(this.bgmSynthGain);

    osc.frequency.setValueAtTime(pitch, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  },

  startAmbience() {
    // Stop any existing ambience to prevent overwrite/leak
    if (this.ambienceSource) {
      try {
        this.ambienceSource.disconnect();
      } catch (e) {}
      this.ambienceSource = null;
    }
    if (this.ambienceGain) {
      try {
        this.ambienceGain.disconnect();
      } catch (e) {}
      this.ambienceGain = null;
    }

    if (this.isAmbiencePlaying) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    this.isAmbiencePlaying = true;

    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
    }

    this.ambienceSource = this.ctx.createBufferSource();
    this.ambienceSource.buffer = buffer;
    this.ambienceSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 160;
    filter.Q.value = 0.8;

    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.value = 0.06;

    this.ambienceSource.connect(filter);
    filter.connect(this.ambienceGain);
    this.ambienceGain.connect(this.crowdGain);

    this.ambienceSource.start(0);
  },

  stopAmbience() {
    this.isAmbiencePlaying = false;
    if (this.ambienceSource) {
      try {
        this.ambienceSource.stop();
      } catch (e) {}
      this.ambienceSource.disconnect();
      this.ambienceSource = null;
    }
    if (this.ambienceGain) {
      try {
        this.ambienceGain.disconnect();
      } catch (e) {}
      this.ambienceGain = null;
    }
  },

  playHit(power = 1.0) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;

    // 1. Woody "crack" of the bat (Low sine wave with fast decay)
    const batOsc = this.ctx.createOscillator();
    const batGain = this.ctx.createGain();
    batOsc.type = 'triangle';
    batOsc.frequency.setValueAtTime(140, now);
    batOsc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    batGain.gain.setValueAtTime(0.6 * power, now);
    batGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    batOsc.connect(batGain);
    batGain.connect(this.sfxGain);

    // 2. Leather ball impact (Noise burst with bandpass filter)
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 800;
    noiseFilter.Q.value = 3.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4 * power, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    batOsc.start(now);
    batOsc.stop(now + 0.1);
    noiseSource.start(now);
    noiseSource.stop(now + 0.1);

    // Clean up nodes after playback ends
    batOsc.onended = () => {
      batGain.disconnect();
      noiseSource.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
    };
  },

  playBowled() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;

    // Simulate 3 wooden stumps clattering (detuned triangle waves clinking)
    const frequencies = [320, 480, 640];
    const delays = [0, 0.02, 0.045];

    frequencies.forEach((freq, idx) => {
      const delay = delays[idx];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      // Wood pitch drop
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + delay + 0.15);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.4, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + delay);
      osc.stop(now + delay + 0.22);
    });

    // Wickets friction rustle (noise component)
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 2.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noiseSource.start(now);
    noiseSource.stop(now + 0.3);
  },

  playCheer(isBoundary = false) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const duration = isBoundary ? 3.5 : 2.0;
    const volume = isBoundary ? 0.38 : 0.2;

    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < noiseBuffer.length; i++) {
      const white = Math.random() * 2 - 1;
      // Pinkish noise
      data[i] = (lastOut + (0.12 * white)) / 1.12;
      lastOut = data[i];
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(250, now);
    // Sweeps up in excitement
    filter.frequency.exponentialRampToValueAtTime(480, now + 0.5);
    filter.Q.value = 1.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    // Dynamic surge
    gain.gain.linearRampToValueAtTime(volume, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.crowdGain);

    noiseSource.start(now);
    noiseSource.stop(now + duration + 0.1);
  },

  playGasp() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const duration = 1.5;

    // Disappointed gasp (sudden noise burst with downward frequency sweep)
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < noiseBuffer.length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.05 * white)) / 1.05;
      lastOut = data[i];
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    // Dips down in pitch
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.8);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noiseSource.start(now);
    noiseSource.stop(now + duration + 0.1);
  }
};

window.CricketAudio = CricketAudio;

