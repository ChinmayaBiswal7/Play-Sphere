/**
 * WWE Chibi Rumble - Core 2.5D Game Engine
 * Authoritative combat logic, dynamic camera zoom, AI bots, Irish Whip rope rebounds, pinfall struggle mini-games.
 */

// ── GAME STATE MACHINE ──────────────────────────────────────────
const STATES = {
  LOADER: 'LOADER',
  MENU: 'MENU',
  LOBBY: 'LOBBY',
  CHAR_SELECT: 'CHAR_SELECT',
  COUNTDOWN: 'COUNTDOWN',
  BATTLE: 'BATTLE',
  PINFALL: 'PINFALL',
  MATCH_END: 'MATCH_END',
  PAUSED_DISCONNECT: 'PAUSED_DISCONNECT'
};
let gameState = STATES.LOADER;
let gameMode = 'AI'; // 'AI' (vs Computer) or 'PVP' (2 Controllers)

// ── CONNECTION STATUS ──────────────────────────────────────────
const controllerSlots = {
  PLAYER_1: { connected: false, socketId: null, ready: false },
  PLAYER_2: { connected: false, socketId: null, ready: false } // AI or Phone 2
};

// ── INPUT STATES ───────────────────────────────────────────────
const playerInputs = {
  PLAYER_1: { moveX: 0, moveY: 0, strike: false, grapple: false, block: false, finisher: false },
  PLAYER_2: { moveX: 0, moveY: 0, strike: false, grapple: false, block: false, finisher: false }
};

// ── ROSTER DETAILS ─────────────────────────────────────────────
const ROSTER = {
  cody: { name: 'CODY RHODES', sigName: 'CROSS RHODES', color: '#dc2626', secondaryColor: '#1e3a8a', speed: 440, power: 18, defense: 0.15, maxStamina: 100 },
  roman: { name: 'ROMAN REIGNS', sigName: 'SPEAR', color: '#1e293b', secondaryColor: '#ffb700', speed: 380, power: 25, defense: 0.25, maxStamina: 100 },
  cena: { name: 'JOHN CENA', sigName: 'ATTITUDE ADJUSTMENT', color: '#16a34a', secondaryColor: '#b45309', speed: 400, power: 21, defense: 0.20, maxStamina: 120 },
  seth: { name: 'SETH ROLLINS', sigName: 'CURB STOMP', color: '#ca8a04', secondaryColor: '#7c2d12', speed: 470, power: 16, defense: 0.12, maxStamina: 90 },
  randy: { name: 'RANDY ORTON', sigName: 'RKO', color: '#475569', secondaryColor: '#374151', speed: 420, power: 20, defense: 0.18, maxStamina: 105 },
  therock: { name: 'THE ROCK', sigName: 'ROCK BOTTOM', color: '#27272a', secondaryColor: '#facc15', speed: 410, power: 23, defense: 0.22, maxStamina: 110 }
};

let p1SelectedChar = 'cody';
let p2SelectedChar = 'roman';

// ── SOUND SYNTHESIZER ──────────────────────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSynthSound(freq, type, duration, vol = 0.3) {
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

const sounds = {
  punch: () => playSynthSound(220, 'sawtooth', 0.12, 0.4),
  slam: () => playSynthSound(90, 'triangle', 0.4, 0.6),
  rope: () => playSynthSound(380, 'sine', 0.2, 0.35),
  finisher: () => {
    playSynthSound(150, 'sawtooth', 0.5, 0.55);
    setTimeout(() => playSynthSound(440, 'sawtooth', 0.3, 0.4), 100);
  },
  pinCount: () => playSynthSound(600, 'sine', 0.15, 0.5),
  kickout: () => playSynthSound(880, 'triangle', 0.3, 0.45),
  bell: () => {
    playSynthSound(987.77, 'sine', 0.5, 0.5);
    setTimeout(() => playSynthSound(987.77, 'sine', 0.5, 0.5), 250);
    setTimeout(() => playSynthSound(987.77, 'sine', 0.8, 0.6), 500);
  },
  countdown: () => playSynthSound(500, 'sine', 0.08, 0.25),
  go: () => playSynthSound(1000, 'sine', 0.25, 0.3)
};

// ── PARTICLE EFFECT SYSTEM ─────────────────────────────────────
const particles = [];
function spawnParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 180;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.3,
      maxLife: 0.6,
      color,
      size: 2.5 + Math.random() * 3
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
  }
}

// ── WWE 2.5D COORDINATES & RING ropes ───────────────────────────
// Ring boundary: x = [-220, 220], y = [-220, 220]
// Apron border: x = [-260, 260], y = [-260, 260]
// Canvas drawing scales and shifts:
let cameraScale = 1.0;
let cameraX = 0;
let cameraY = 0;
let screenShakeTimer = 0;
let screenShakeMagnitude = 0;

function applyScreenShake(duration, magnitude) {
  screenShakeTimer = duration;
  screenShakeMagnitude = magnitude;
}

// Project 2.5D coordinates (with height offset h) onto 2D canvas
function project(worldX, worldY, worldH, cw, ch) {
  // Rotate perspective coordinates slightly down
  const zoomFactor = cameraScale;
  
  // Center of screen
  const cx = cw / 2 + cameraX * zoomFactor;
  const cy = ch / 2 + 60 + cameraY * zoomFactor;
  
  // Apply perspective scaling to Y axis
  const py = worldY * 0.65; 
  
  // Apply shake offset
  let shakeX = 0;
  let shakeY = 0;
  if (screenShakeTimer > 0) {
    shakeX = (Math.random() - 0.5) * screenShakeMagnitude;
    shakeY = (Math.random() - 0.5) * screenShakeMagnitude;
  }

  return {
    x: cx + (worldX + shakeX) * zoomFactor,
    y: cy + (py + shakeY) * zoomFactor - worldH * zoomFactor,
    shadowY: cy + (py + shakeY) * zoomFactor,
    scale: zoomFactor
  };
}

// ── WORLD WRESTLER FIGHTER CLASS ───────────────────────────────
class Fighter {
  constructor(slot, side) {
    this.slot = slot;
    this.side = side; // 'LEFT' or 'RIGHT'
    this.x = side === 'LEFT' ? -150 : 150;
    this.y = 0;
    this.h = 0;
    this.vx = 0;
    this.vy = 0;
    this.vh = 0;
    this.width = 45;
    this.height = 70;
    
    // Stats & stats configuration
    this.charKey = side === 'LEFT' ? p1SelectedChar : p2SelectedChar;
    this.stats = ROSTER[this.charKey];
    this.hp = 100;
    this.stamina = this.stats.maxStamina;
    this.finisherMeter = 0;
    
    // Action state machine variables
    this.isDead = false;
    this.isDowned = false;
    this.downedTimer = 0;
    this.isBlocking = false;
    
    this.strikeTimer = 0;
    this.isGrappling = false;
    this.isGrappled = false;
    this.grabbedOpponent = null;
    this.grappledBy = null;
    
    // Irish Whip rope rebounds
    this.isWhipped = false;
    this.whipVx = 0;
    this.whipVy = 0;
    this.reboundTimer = 0;
    
    // Pinning / struggle
    this.isPinning = false;
    this.isPinned = false;
  }

  reset() {
    this.charKey = this.side === 'LEFT' ? p1SelectedChar : p2SelectedChar;
    this.stats = ROSTER[this.charKey];
    this.hp = 100;
    this.stamina = this.stats.maxStamina;
    this.finisherMeter = 0;
    
    this.x = this.side === 'LEFT' ? -150 : 150;
    this.y = 0;
    this.h = 0;
    this.vx = 0;
    this.vy = 0;
    this.vh = 0;
    
    this.isDead = false;
    this.isDowned = false;
    this.downedTimer = 0;
    this.isBlocking = false;
    this.strikeTimer = 0;
    this.isGrappling = false;
    this.isGrappled = false;
    this.grabbedOpponent = null;
    this.grappledBy = null;
    this.isWhipped = false;
    this.isPinning = false;
    this.isPinned = false;
  }

  damage(amount, isFinisher = false) {
    if (this.isDead) return;
    
    let actualDmg = amount;
    if (this.isBlocking && !isFinisher) {
      actualDmg *= (1 - this.stats.defense * 2.0); // Shield block reduction
      this.stamina = Math.max(0, this.stamina - amount * 0.4);
    }
    
    this.hp = Math.max(0, this.hp - actualDmg);
    this.finisherMeter = Math.min(100, this.finisherMeter + actualDmg * 0.65);
    
    // Sync finisher button on controller client
    syncFinisherButton(this.slot, this.finisherMeter >= 100);

    if (this.hp <= 0 && !this.isDowned) {
      this.triggerDowned(4.5); // Fall flat
    }
  }

  triggerDowned(duration) {
    this.isDowned = true;
    this.downedTimer = duration;
    this.h = 0;
    this.vx = 0;
    this.vy = 0;
    this.vh = 0;
    this.isBlocking = false;
    
    if (this.isGrappled && this.grappledBy) {
      this.grappledBy.breakGrapple();
    }
    if (this.isGrappling && this.grabbedOpponent) {
      this.breakGrapple();
    }
  }

  breakGrapple() {
    if (this.grabbedOpponent) {
      this.grabbedOpponent.isGrappled = false;
      this.grabbedOpponent.grappledBy = null;
      this.grabbedOpponent = null;
    }
    this.isGrappling = false;
    this.isGrappled = false;
    this.grappledBy = null;
  }

  executeStrike() {
    if (this.isDowned || this.isGrappled || this.isGrappling || this.strikeTimer > 0) return;
    
    if (this.stamina < 15) return; // Stamina limit
    this.stamina -= 15;
    
    this.strikeTimer = 0.22;
    sounds.punch();
    
    // Check hit collision
    const opp = this.side === 'LEFT' ? fighters.PLAYER_2 : fighters.PLAYER_1;
    const dx = opp.x - this.x;
    const dy = opp.y - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist <= 75 && Math.abs(opp.h - this.h) < 40) {
      const isReboundHit = opp.isWhipped;
      let dmg = this.stats.power;
      
      if (isReboundHit) {
        // Double damage Clothesline on Irish Whip rebound!
        dmg *= 2.2;
        sounds.slam();
        opp.triggerDowned(3.5);
        opp.isWhipped = false;
        applyScreenShake(0.3, 15);
        showNotification('CLOTHESLINE REBOUND!');
      } else {
        // Normal knock back
        const pushDir = Math.sign(opp.x - this.x) || 1;
        opp.vx = pushDir * 320;
        opp.damage(dmg);
      }
      
      spawnParticles(opp.x, opp.y - 30, opp.stats.color, 10);
      triggerControllerVibration(this.slot, 65);
    }
  }

  executeGrapple() {
    if (this.isDowned || this.isGrappled || this.strikeTimer > 0) return;
    
    const opp = this.side === 'LEFT' ? fighters.PLAYER_2 : fighters.PLAYER_1;

    // 1. PIN FALL ATTEMPT: If opponent is downed on canvas
    if (opp.isDowned && !opp.isPinned && !this.isPinning) {
      const dist = Math.hypot(opp.x - this.x, opp.y - this.y);
      if (dist <= 65) {
        initiatePinfall(this, opp);
        return;
      }
    }

    if (this.isGrappling) {
      // 2. IRISH WHIP: Throw them into the ropes
      if (this.grabbedOpponent) {
        const throwDirX = Math.sign(playerInputs[this.slot].moveX) || Math.sign(this.x) || 1;
        const throwDirY = Math.sign(playerInputs[this.slot].moveY) || 0;
        
        opp.isGrappled = false;
        opp.grappledBy = null;
        opp.isWhipped = true;
        opp.whipVx = throwDirX * 520;
        opp.whipVy = throwDirY * 180;
        opp.stamina = Math.max(0, opp.stamina - 20);
        
        sounds.rope();
        showNotification('IRISH WHIP!');
        
        this.grabbedOpponent = null;
        this.isGrappling = false;
      }
    } else {
      // 3. ATTEMPT GRAB
      const dist = Math.hypot(opp.x - this.x, opp.y - this.y);
      if (dist <= 60 && !opp.isDowned && !opp.isGrappled) {
        this.isGrappling = true;
        this.grabbedOpponent = opp;
        opp.isGrappled = true;
        opp.grappledBy = this;
        
        triggerControllerVibration(this.slot, 80);
        showNotification('GRAPPLE LOCK!');
      }
    }
  }

  executeFinisher() {
    if (this.isDowned || this.isGrappled || this.finisherMeter < 100) return;
    
    const opp = this.side === 'LEFT' ? fighters.PLAYER_2 : fighters.PLAYER_1;
    const dist = Math.hypot(opp.x - this.x, opp.y - this.y);
    
    if (dist <= 85 && !opp.isDowned) {
      // Heavy Cinematic Slam!
      this.finisherMeter = 0;
      syncFinisherButton(this.slot, false);
      
      this.breakGrapple();
      opp.breakGrapple();
      
      // Perform slam damage and pin them down
      opp.damage(45, true);
      opp.triggerDowned(5.0); // lies down for long duration
      
      // Animate jump lift slightly
      this.vh = 150;
      opp.vh = 170;
      
      applyScreenShake(0.55, 25);
      sounds.finisher();
      showNotification(`${this.stats.name} TRIGERRED ${this.stats.sigName}!`);
      
      spawnParticles(opp.x, opp.y - 20, '#eab308', 25);
      triggerControllerVibration(this.slot, [150, 80, 150]);
      triggerControllerVibration(opp.slot, [200, 100, 200]);
    }
  }

  update(dt, input) {
    if (gameState === STATES.PINFALL) {
      // Pinfalls freeze normal actions but apply slow deceleration
      this.vx *= 0.85;
      this.vy *= 0.85;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return;
    }

    // Downed / KO timer ticks
    if (this.isDowned) {
      this.downedTimer -= dt;
      if (this.downedTimer <= 0) {
        this.isDowned = false;
        this.hp = Math.max(10, this.hp); // recover a tiny slice
        this.stamina = this.stats.maxStamina * 0.5;
        showNotification(`${this.stats.name} KICKS OUT!`);
      }
      return; // Skip input processing when downed
    }

    // Rebound rope physics on Irish Whip
    if (this.isWhipped) {
      this.vx = this.whipVx;
      this.vy = this.whipVy;
      
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Rope collision borders (Inside ropes boundary: x = 220, y = 220)
      let bounce = false;
      if (Math.abs(this.x) >= 220) {
        this.x = Math.sign(this.x) * 218;
        this.whipVx = -this.whipVx * 0.95; // reverse run
        bounce = true;
      }
      if (Math.abs(this.y) >= 220) {
        this.y = Math.sign(this.y) * 218;
        this.whipVy = -this.whipVy * 0.95;
        bounce = true;
      }

      if (bounce) {
        sounds.rope();
        applyScreenShake(0.18, 10);
        spawnParticles(this.x, this.y, '#ffffff', 8);
        this.isWhipped = false;
        
        // Rebound run velocity back towards center
        this.vx = this.whipVx;
        this.vy = this.whipVy;
      }
    } else {
      // Normal joystick locomotion
      let targetVx = 0;
      let targetVy = 0;
      
      this.isBlocking = input.block;

      if (!this.isGrappled && !this.isBlocking && (Math.abs(input.moveX) > 0.1 || Math.abs(input.moveY) > 0.1)) {
        targetVx = input.moveX * this.stats.speed;
        targetVy = input.moveY * this.stats.speed;
      }

      // Linear friction damping
      this.vx = lerp(this.vx, targetVx, 9 * dt);
      this.vy = lerp(this.vy, targetVy, 9 * dt);

      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    // Gravity for lift slam heights
    if (this.h > 0 || this.vh !== 0) {
      this.vh -= 360 * dt;
      this.h += this.vh * dt;
      if (this.h <= 0) {
        this.h = 0;
        this.vh = 0;
      }
    }

    // Grapple locking coordinates alignment
    if (this.isGrappling && this.grabbedOpponent) {
      // Lock opponent in front of you
      const facingDir = Math.sign(this.vx) || (this.side === 'LEFT' ? 1 : -1);
      this.grabbedOpponent.x = this.x + facingDir * 42;
      this.grabbedOpponent.y = this.y;
    }

    // Keep wrestlers inside the ring ropes boundary
    this.x = clamp(this.x, -220, 220);
    this.y = clamp(this.y, -220, 220);

    // Timers
    if (this.strikeTimer > 0) this.strikeTimer -= dt;

    // Gradual stamina recovery
    if (this.stamina < this.stats.maxStamina && !this.isBlocking) {
      this.stamina = Math.min(this.stats.maxStamina, this.stamina + 25 * dt);
    }
  }
}

const fighters = {
  PLAYER_1: new Fighter('PLAYER_1', 'LEFT'),
  PLAYER_2: new Fighter('PLAYER_2', 'RIGHT')
};

// ── WWE COMPUTER AI BOT AGENT ──────────────────────────────────
let aiDecisionTimer = 0;
function runFighterAI(dt) {
  if (gameMode !== 'AI' || fighters.PLAYER_2.isDowned || fighters.PLAYER_2.isGrappled) return;
  
  aiDecisionTimer -= dt;
  const p1 = fighters.PLAYER_1;
  const ai = fighters.PLAYER_2;
  
  const dx = p1.x - ai.x;
  const dy = p1.y - ai.y;
  const dist = Math.hypot(dx, dy);

  // If player 1 is downed, walk over and attempt pinfall
  if (p1.isDowned) {
    if (dist > 45) {
      // Walk towards downed player
      playerInputs.PLAYER_2.moveX = Math.sign(dx) * 0.8;
      playerInputs.PLAYER_2.moveY = Math.sign(dy) * 0.8;
    } else {
      playerInputs.PLAYER_2.moveX = 0;
      playerInputs.PLAYER_2.moveY = 0;
      
      // Perform pinfall grab
      if (aiDecisionTimer <= 0) {
        ai.executeGrapple();
        aiDecisionTimer = 0.8;
      }
    }
    return;
  }

  // Combat loop
  if (dist > 95) {
    // Pursuit: Walk to player 1
    playerInputs.PLAYER_2.moveX = Math.sign(dx) * 0.72;
    playerInputs.PLAYER_2.moveY = Math.sign(dy) * 0.72;
    playerInputs.PLAYER_2.block = false;
  } else {
    // Inside strike range: Stop walking and choose action
    playerInputs.PLAYER_2.moveX = 0;
    playerInputs.PLAYER_2.moveY = 0;

    if (aiDecisionTimer <= 0) {
      const choice = Math.random();
      if (ai.finisherMeter >= 100 && choice < 0.65) {
        ai.executeFinisher();
      } else if (choice < 0.45) {
        ai.executeStrike();
      } else if (choice < 0.72) {
        ai.executeGrapple();
      } else {
        // Shield block
        playerInputs.PLAYER_2.block = true;
        setTimeout(() => { playerInputs.PLAYER_2.block = false; }, 600);
      }
      aiDecisionTimer = 0.5 + Math.random() * 0.6; // random react latency
    }
  }
}

// ── PINFALL REFEREE COUNT DOWN mini-game ────────────────────────
let pcNeedlePos = 0;
let pcNeedleDir = 1;
let pinServer = null; // wrestler pinning
let pinReceiver = null; // wrestler pinned
let refereeCount = 0;
let pinTargetLeft = 30;
let pinTargetWidth = 35;
let refereeTimer = 0;

function initiatePinfall(attacker, victim) {
  gameState = STATES.PINFALL;
  pinServer = attacker;
  pinReceiver = victim;
  
  pinServer.isPinning = true;
  pinReceiver.isPinned = true;
  
  refereeCount = 0;
  refereeTimer = 1.3; // wait before counting 1
  
  // Set random target kick-out zone
  pinTargetLeft = 15 + Math.random() * 50;
  pinTargetWidth = Math.max(15, 42 * (pinReceiver.hp / 100)); // shrinks at low health
  
  // Show ref count hud
  const refHUD = document.getElementById('referee-count-box');
  refHUD.classList.remove('hidden');
  refHUD.innerText = 'PIN!';
  
  // Trigger phone overlay for the pinned player!
  triggerPhonePinOverlay(pinReceiver.slot, pinTargetLeft, pinTargetWidth);
  showNotification('PIN ATTEMPT!');
}

function processPinfallTick(dt) {
  if (gameState !== STATES.PINFALL) return;
  
  refereeTimer -= dt;
  if (refereeTimer <= 0) {
    refereeCount++;
    refereeTimer = 1.25; // wait for next count
    
    sounds.pinCount();
    const refHUD = document.getElementById('referee-count-box');
    refHUD.innerText = refereeCount;
    
    // Scale down next target kick-out zone width (harder to kick out at 2!)
    pinTargetWidth = Math.max(12, pinTargetWidth * 0.75);
    triggerPhonePinOverlay(pinReceiver.slot, pinTargetLeft, pinTargetWidth);

    if (refereeCount >= 3) {
      triggerRefereeThreeCount();
    } else {
      // If computer AI is pinned, run probability kick-out logic!
      if (gameMode === 'AI' && pinReceiver.slot === 'PLAYER_2') {
        const kickOutProb = 0.35 + (pinReceiver.hp / 100) * 0.55;
        if (Math.random() < kickOutProb) {
          setTimeout(() => {
            breakPinfall();
          }, 400);
        }
      }
    }
  }
}

function handleKickoutAttempt(slot, needlePos) {
  if (gameState !== STATES.PINFALL || slot !== pinReceiver.slot) return;
  
  const minTarget = pinTargetLeft;
  const maxTarget = pinTargetLeft + pinTargetWidth;
  
  if (needlePos >= minTarget && needlePos <= maxTarget) {
    // Successful kick out!
    sounds.kickout();
    breakPinfall();
  } else {
    // Failed kick out! Vibrate player phone
    triggerControllerVibration(pinReceiver.slot, [80, 50, 80]);
  }
}

function breakPinfall() {
  if (gameState !== STATES.PINFALL) return;
  
  // Push server back
  const pushDir = Math.sign(pinServer.x - pinReceiver.x) || 1;
  pinServer.vx = pushDir * 240;
  
  pinServer.isPinning = false;
  pinReceiver.isPinned = false;
  pinReceiver.isDowned = false; // recovery
  pinReceiver.stamina = pinReceiver.stats.maxStamina * 0.4;
  
  // Close mobile phone overlays
  closePhonePinOverlay(pinReceiver.slot);
  
  document.getElementById('referee-count-box').classList.add('hidden');
  gameState = STATES.BATTLE;
  
  showNotification('KICK OUT!');
  sounds.punch();
}

function triggerRefereeThreeCount() {
  gameState = STATES.MATCH_END;
  sounds.bell();
  
  document.getElementById('referee-count-box').classList.add('hidden');
  closePhonePinOverlay(pinReceiver.slot);
  
  // Setup game over screen
  document.getElementById('arena-container').classList.add('hidden');
  document.getElementById('game-over-screen').classList.remove('hidden');
  
  document.getElementById('winner-announcement-text').innerText = `${pinServer.stats.name} WINS!`;
  document.getElementById('final-score-text').innerText = 'BY PINFALL (1-2-3 COUNT)';
}

// ── CONNECTION PAIRING & WEBSOCKET ROUTING ────────────────────
let socket = null;
let roomCode = '----';

function initSocketConnection() {
  socket = io();

  socket.on('connect', () => {
    console.log('WWE PC Client connected.');
    socket.emit('join-room-pc');
  });

  socket.on('room-created', ({ roomCode: code, localIp: ip, port: p }) => {
    roomCode = code;
    document.getElementById('lobby-room-code').innerText = code;

    // Generate pairing URLs for controllers
    let baseUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '') {
      baseUrl = `http://${ip}:${p}/wwe/controller.html?room=${code}`;
    } else {
      baseUrl = `${window.location.origin}/wwe/controller.html?room=${code}`;
    }

    const p1Url = `${baseUrl}&slot=PLAYER_1`;
    const p2Url = `${baseUrl}&slot=PLAYER_2`;

    // QR images
    const p1QrImg = document.getElementById('p1-qr-image');
    document.getElementById('p1-qr-spinner').style.display = 'none';
    p1QrImg.src = `/qrcode?text=${encodeURIComponent(p1Url)}`;
    p1QrImg.style.display = 'block';

    const p2QrImg = document.getElementById('p2-qr-image');
    document.getElementById('p2-qr-spinner').style.display = 'none';
    p2QrImg.src = `/qrcode?text=${encodeURIComponent(p2Url)}`;
    p2QrImg.style.display = 'block';
  });

  socket.on('phone-connected', ({ phoneSlot }) => {
    const slotKey = phoneSlot === 1 ? 'PLAYER_1' : 'PLAYER_2';
    if (controllerSlots[slotKey]) {
      controllerSlots[slotKey].connected = true;
      
      const badge = document.getElementById(phoneSlot === 1 ? 'p1-connect-status' : 'p2-connect-status');
      if (badge) badge.innerText = 'PAIRED';
      
      // Auto transition to character select if mode criteria is met
      checkLobbyReadyAndTransition();
    }
  });

  socket.on('phone-disconnected', ({ phoneSlot }) => {
    const slotKey = phoneSlot === 1 ? 'PLAYER_1' : 'PLAYER_2';
    if (controllerSlots[slotKey]) {
      controllerSlots[slotKey].connected = false;
      
      const badge = document.getElementById(phoneSlot === 1 ? 'p1-connect-status' : 'p2-connect-status');
      if (badge) badge.innerText = 'WAITING...';
    }
  });

  socket.on('controller-input', (data) => {
    const slot = data.slot;
    if (!slot || !playerInputs[slot]) return;

    if (data.type === 'joystick') {
      playerInputs[slot].moveX = data.x;
      playerInputs[slot].moveY = data.y;
    } else if (data.type === 'btnDown') {
      if (data.btn === 'STRIKE') {
        playerInputs[slot].strike = true;
        fighters[slot].executeStrike();
      } else if (data.btn === 'GRAPPLE') {
        playerInputs[slot].grapple = true;
        fighters[slot].executeGrapple();
      } else if (data.btn === 'BLOCK') {
        playerInputs[slot].block = true;
      } else if (data.btn === 'FINISHER') {
        playerInputs[slot].finisher = true;
        fighters[slot].executeFinisher();
      }
    } else if (data.type === 'btnUp') {
      if (data.btn === 'STRIKE') playerInputs[slot].strike = false;
      if (data.btn === 'GRAPPLE') playerInputs[slot].grapple = false;
      if (data.btn === 'BLOCK') playerInputs[slot].block = false;
      if (data.btn === 'FINISHER') playerInputs[slot].finisher = false;
    } else if (data.type === 'kickout-attempt') {
      handleKickoutAttempt(slot, data.position);
    }
  });
}

function triggerControllerVibration(slot, pattern) {
  if (socket && socket.connected) {
    socket.emit('trigger-vibration', { slot, pattern });
  }
}

function syncFinisherButton(slot, ready) {
  if (socket && socket.connected) {
    socket.emit('finisher-status', { slot, ready });
  }
}

function triggerPhonePinOverlay(slot, targetLeft, targetWidth) {
  if (socket && socket.connected) {
    socket.emit('start-pinfall', { slot, targetLeft, targetWidth });
  }
}

function closePhonePinOverlay(slot) {
  if (socket && socket.connected) {
    socket.emit('end-pinfall', { slot });
  }
}

// ── SCREEN INTERACTION TRANSITIONS ─────────────────────────────
function selectGameMode(mode) {
  gameMode = mode;
  document.getElementById('btn-mode-ai').className = `menu-btn ${mode === 'AI' ? 'active' : ''}`;
  document.getElementById('btn-mode-pvp').className = `menu-btn ${mode === 'PVP' ? 'active' : ''}`;
}

document.getElementById('btn-mode-ai').onclick = () => selectGameMode('AI');
document.getElementById('btn-mode-pvp').onclick = () => selectGameMode('PVP');

// Space bar or click to start menu mode
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    if (gameState === STATES.MENU) {
      transitionFromMenu();
      return;
    } else if (gameState === STATES.CHAR_SELECT) {
      lockWrestlersAndStartMatch();
      return;
    }
  } else if (e.key === 'Escape') {
    togglePauseMenu();
    return;
  }

  // Combat Fallback Key Controls
  if (gameState === STATES.BATTLE || gameState === STATES.PINFALL) {
    // PLAYER 1 Controls (WASD + F/G/Shift/R/Space)
    if (e.code === 'KeyW') playerInputs.PLAYER_1.moveY = -1;
    if (e.code === 'KeyS') playerInputs.PLAYER_1.moveY = 1;
    if (e.code === 'KeyA') playerInputs.PLAYER_1.moveX = -1;
    if (e.code === 'KeyD') playerInputs.PLAYER_1.moveX = 1;
    if (e.code === 'KeyF') {
      playerInputs.PLAYER_1.strike = true;
      fighters.PLAYER_1.executeStrike();
    }
    if (e.code === 'KeyG') {
      playerInputs.PLAYER_1.grapple = true;
      fighters.PLAYER_1.executeGrapple();
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      playerInputs.PLAYER_1.block = true;
    }
    if (e.code === 'KeyR') {
      playerInputs.PLAYER_1.finisher = true;
      fighters.PLAYER_1.executeFinisher();
    }
    if (e.code === 'Space' && gameState === STATES.PINFALL) {
      handleKickoutAttempt('PLAYER_1', pcNeedlePos);
    }

    // PLAYER 2 Controls (Arrows + J/K/L/I/Enter)
    if (gameMode !== 'AI') {
      if (e.code === 'ArrowUp') playerInputs.PLAYER_2.moveY = -1;
      if (e.code === 'ArrowDown') playerInputs.PLAYER_2.moveY = 1;
      if (e.code === 'ArrowLeft') playerInputs.PLAYER_2.moveX = -1;
      if (e.code === 'ArrowRight') playerInputs.PLAYER_2.moveX = 1;
      if (e.code === 'KeyJ') {
        playerInputs.PLAYER_2.strike = true;
        fighters.PLAYER_2.executeStrike();
      }
      if (e.code === 'KeyK') {
        playerInputs.PLAYER_2.grapple = true;
        fighters.PLAYER_2.executeGrapple();
      }
      if (e.code === 'KeyL') {
        playerInputs.PLAYER_2.block = true;
      }
      if (e.code === 'KeyI') {
        playerInputs.PLAYER_2.finisher = true;
        fighters.PLAYER_2.executeFinisher();
      }
      if (e.code === 'Enter' && gameState === STATES.PINFALL) {
        handleKickoutAttempt('PLAYER_2', pcNeedlePos);
      }
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (gameState === STATES.BATTLE || gameState === STATES.PINFALL) {
    // PLAYER 1 Release
    if (e.code === 'KeyW' && playerInputs.PLAYER_1.moveY === -1) playerInputs.PLAYER_1.moveY = 0;
    if (e.code === 'KeyS' && playerInputs.PLAYER_1.moveY === 1) playerInputs.PLAYER_1.moveY = 0;
    if (e.code === 'KeyA' && playerInputs.PLAYER_1.moveX === -1) playerInputs.PLAYER_1.moveX = 0;
    if (e.code === 'KeyD' && playerInputs.PLAYER_1.moveX === 1) playerInputs.PLAYER_1.moveX = 0;
    if (e.code === 'KeyF') playerInputs.PLAYER_1.strike = false;
    if (e.code === 'KeyG') playerInputs.PLAYER_1.grapple = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') playerInputs.PLAYER_1.block = false;
    if (e.code === 'KeyR') playerInputs.PLAYER_1.finisher = false;

    // PLAYER 2 Release
    if (gameMode !== 'AI') {
      if (e.code === 'ArrowUp' && playerInputs.PLAYER_2.moveY === -1) playerInputs.PLAYER_2.moveY = 0;
      if (e.code === 'ArrowDown' && playerInputs.PLAYER_2.moveY === 1) playerInputs.PLAYER_2.moveY = 0;
      if (e.code === 'ArrowLeft' && playerInputs.PLAYER_2.moveX === -1) playerInputs.PLAYER_2.moveX = 0;
      if (e.code === 'ArrowRight' && playerInputs.PLAYER_2.moveX === 1) playerInputs.PLAYER_2.moveX = 0;
      if (e.code === 'KeyJ') playerInputs.PLAYER_2.strike = false;
      if (e.code === 'KeyK') playerInputs.PLAYER_2.grapple = false;
      if (e.code === 'KeyL') playerInputs.PLAYER_2.block = false;
      if (e.code === 'KeyI') playerInputs.PLAYER_2.finisher = false;
    }
  }
});

function transitionFromMenu() {
  document.getElementById('menu-screen').classList.add('hidden');
  if (gameMode === 'PVP') {
    gameState = STATES.LOBBY;
    document.getElementById('lobby-screen').classList.remove('hidden');
  } else {
    // VS AI: proceed to Character Select immediately
    transitionToCharSelect();
  }
}

function checkLobbyReadyAndTransition() {
  if (gameState !== STATES.LOBBY) return;
  
  if (controllerSlots.PLAYER_1.connected && controllerSlots.PLAYER_2.connected) {
    setTimeout(() => {
      document.getElementById('lobby-screen').classList.add('hidden');
      transitionToCharSelect();
    }, 1200);
  }
}

function transitionToCharSelect() {
  gameState = STATES.CHAR_SELECT;
  document.getElementById('char-select-screen').classList.remove('hidden');
  
  // Set character card handlers
  document.querySelectorAll('.roster-grid .wrestler-card').forEach(card => {
    card.onclick = () => {
      const char = card.getAttribute('data-char');
      p1SelectedChar = char;
      document.querySelectorAll('.roster-grid .wrestler-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      
      document.getElementById('p1-select-badge').innerText = `P1: ${ROSTER[char].name}`;
      
      // Auto select opponent character randomly for AI mode
      if (gameMode === 'AI') {
        const keys = Object.keys(ROSTER).filter(k => k !== char);
        p2SelectedChar = keys[Math.floor(Math.random() * keys.length)];
        document.getElementById('p2-select-badge').innerText = `P2 (AI): ${ROSTER[p2SelectedChar].name}`;
      }
    };
  });
}

function lockWrestlersAndStartMatch() {
  document.getElementById('char-select-screen').classList.add('hidden');
  document.getElementById('countdown-overlay').classList.remove('hidden');
  
  gameState = STATES.COUNTDOWN;
  sounds.countdown();
  
  let count = 3;
  document.getElementById('countdown-number').innerText = count;
  
  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      document.getElementById('countdown-number').innerText = count;
      sounds.countdown();
    } else if (count === 0) {
      document.getElementById('countdown-number').innerText = 'FIGHT!';
      sounds.go();
    } else {
      clearInterval(timer);
      document.getElementById('countdown-overlay').classList.add('hidden');
      startBattleArena();
    }
  }, 1000);
}

// ── BATTLE ARENA STARTER ───────────────────────────────────────
let battleTimer = 99;
let battleTimerInterval = null;

function startBattleArena() {
  gameState = STATES.BATTLE;
  
  fighters.PLAYER_1.reset();
  fighters.PLAYER_2.reset();
  
  document.getElementById('p1-name-hud').innerText = fighters.PLAYER_1.stats.name;
  document.getElementById('p2-name-hud').innerText = fighters.PLAYER_2.stats.name;
  
  document.getElementById('arena-container').classList.remove('hidden');
  
  // Start clock
  battleTimer = 99;
  document.getElementById('match-timer-val').innerText = battleTimer;
  if (battleTimerInterval) clearInterval(battleTimerInterval);
  
  battleTimerInterval = setInterval(() => {
    if (gameState === STATES.BATTLE || gameState === STATES.PINFALL) {
      battleTimer--;
      document.getElementById('match-timer-val').innerText = battleTimer;
      if (battleTimer <= 0) {
        clearInterval(battleTimerInterval);
        triggerSuddenDeathOrWin();
      }
    }
  }, 1000);
}

function triggerSuddenDeathOrWin() {
  // Win by health difference
  if (fighters.PLAYER_1.hp > fighters.PLAYER_2.hp) {
    triggerWinnerScreen('PLAYER_1', 'BY HEALTH MAJORITY');
  } else if (fighters.PLAYER_2.hp > fighters.PLAYER_1.hp) {
    triggerWinnerScreen('PLAYER_2', 'BY HEALTH MAJORITY');
  } else {
    triggerWinnerScreen('PLAYER_1', 'DRAW (P1 ADVANTAGE)');
  }
}

function triggerWinnerScreen(winnerSlot, reason) {
  gameState = STATES.MATCH_END;
  sounds.bell();
  
  document.getElementById('arena-container').classList.add('hidden');
  document.getElementById('game-over-screen').classList.remove('hidden');
  
  const w = fighters[winnerSlot];
  document.getElementById('winner-announcement-text').innerText = `${w.stats.name} WINS!`;
  document.getElementById('final-score-text').innerText = reason;
}

// ── PAUSE OVERLAYS BINDERS ─────────────────────────────────────
let isPauseActive = false;
function togglePauseMenu() {
  if (gameState !== STATES.BATTLE && gameState !== STATES.PINFALL) return;
  
  isPauseActive = !isPauseActive;
  const overlay = document.getElementById('pause-overlay');
  
  if (isPauseActive) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

document.getElementById('btn-resume').onclick = () => {
  togglePauseMenu();
};

document.getElementById('btn-exit-pause').onclick = () => {
  togglePauseMenu();
  document.getElementById('pause-overlay').classList.add('hidden');
  document.getElementById('arena-container').classList.add('hidden');
  document.getElementById('menu-screen').classList.remove('hidden');
  gameState = STATES.MENU;
};

// Rematches
document.getElementById('btn-rematch').onclick = () => {
  document.getElementById('game-over-screen').classList.add('hidden');
  lockWrestlersAndStartMatch();
};

document.getElementById('btn-exit').onclick = () => {
  document.getElementById('game-over-screen').classList.add('hidden');
  document.getElementById('menu-screen').classList.remove('hidden');
  gameState = STATES.MENU;
};

// ── 2D PERSPECTIVE RING DRAWING ────────────────────────────────
function drawWWEArena(ctx, cw, ch) {
  // Clear ring canvas
  ctx.fillStyle = '#060b13';
  ctx.fillRect(0, 0, cw, ch);

  // Center ring coordinates
  // Apron boundaries
  const cornersBase = [
    { x: -260, y: -260 },
    { x: 260, y: -260 },
    { x: 260, y: 260 },
    { x: -260, y: 260 }
  ];
  const screenCornersBase = cornersBase.map(c => project(c.x, c.y, 0, cw, ch));

  // Apron skirt fill
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(screenCornersBase[0].x, screenCornersBase[0].y);
  ctx.lineTo(screenCornersBase[1].x, screenCornersBase[1].y);
  ctx.lineTo(screenCornersBase[2].x, screenCornersBase[2].y);
  ctx.lineTo(screenCornersBase[3].x, screenCornersBase[3].y);
  ctx.closePath();
  ctx.fill();

  // Draw Arena Floor Ring Mat (x = [-230, 230], y = [-230, 230])
  const matCorners = [
    { x: -230, y: -230 },
    { x: 230, y: -230 },
    { x: 230, y: 230 },
    { x: -230, y: 230 }
  ];
  const screenMat = matCorners.map(c => project(c.x, c.y, 0, cw, ch));

  // Draw ring mat gradient
  const matGrad = ctx.createLinearGradient(0, ch/2 - 100, 0, ch/2 + 200);
  matGrad.addColorStop(0, '#1c1b1f');
  matGrad.addColorStop(1, '#0e0d10');
  ctx.fillStyle = matGrad;
  
  ctx.beginPath();
  ctx.moveTo(screenMat[0].x, screenMat[0].y);
  ctx.lineTo(screenMat[1].x, screenMat[1].y);
  ctx.lineTo(screenMat[2].x, screenMat[2].y);
  ctx.lineTo(screenMat[3].x, screenMat[3].y);
  ctx.closePath();
  ctx.fill();

  // Glow ring mat outlines
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4 * cameraScale;
  ctx.save();
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(screenMat[0].x, screenMat[0].y);
  ctx.lineTo(screenMat[1].x, screenMat[1].y);
  ctx.lineTo(screenMat[2].x, screenMat[2].y);
  ctx.lineTo(screenMat[3].x, screenMat[3].y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Center logo print
  ctx.save();
  ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
  ctx.font = `bold ${64 * cameraScale}px var(--font-display)`;
  ctx.textAlign = 'center';
  ctx.fillText('WWE', cw / 2 + cameraX * cameraScale, ch / 2 + 75 + cameraY * cameraScale);
  ctx.restore();

  // ── DRAW SHADOWS FIRST ──
  Object.values(fighters).forEach(f => {
    const proj = project(f.x, f.y, 0, cw, ch);
    const radius = 22 * proj.scale;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(proj.x, proj.shadowY, radius, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // ── DRAW FIGHTERS ──
  // Sort wrestlers by world Y position to ensure proper layered overlapping!
  const sortedFighters = Object.values(fighters).sort((a, b) => a.y - b.y);

  sortedFighters.forEach(f => {
    const proj = project(f.x, f.y, f.h, cw, ch);
    const dScale = proj.scale;

    // Dimensions
    const bodyW = 28 * dScale;
    const bodyH = 50 * dScale;
    const headR = 16 * dScale;

    // 1. Draw Downed State flat on canvas
    if (f.isDowned) {
      ctx.fillStyle = f.stats.color;
      ctx.beginPath();
      // Draw body lying flat sideways
      ctx.roundRect(proj.x - bodyH/2, proj.shadowY - bodyW, bodyH, bodyW, 6 * dScale);
      ctx.fill();
      // Skin head
      ctx.fillStyle = '#ffdbac';
      ctx.beginPath();
      ctx.arc(proj.x - bodyH/2 - headR * 0.8, proj.shadowY - bodyW * 0.5, headR, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // 2. Draw Standing Wrestler
    ctx.fillStyle = f.stats.color;
    ctx.beginPath();
    ctx.roundRect(proj.x - bodyW/2, proj.y - bodyH, bodyW, bodyH, 10 * dScale);
    ctx.fill();

    // Glow boundary line
    ctx.strokeStyle = f.stats.color;
    ctx.lineWidth = 2.5;
    ctx.save();
    ctx.shadowColor = f.stats.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(proj.x - bodyW/2, proj.y - bodyH, bodyW, bodyH, 10 * dScale);
    ctx.stroke();
    ctx.restore();

    // Skin head
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(proj.x, proj.y - bodyH - headR * 0.7, headR, 0, Math.PI * 2);
    ctx.fill();

    // Hair cap color
    ctx.fillStyle = f.stats.secondaryColor;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y - bodyH - headR * 0.7, headR * 1.02, Math.PI, 0);
    ctx.fill();

    // Blocking shield overlay
    if (f.isBlocking) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4 * dScale;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y - bodyH * 0.5, 30 * dScale, -Math.PI/2, Math.PI/2);
      ctx.stroke();
    }

    // Swing visual strike slash arcs
    if (f.strikeTimer > 0) {
      ctx.strokeStyle = f.stats.color;
      ctx.lineWidth = 5 * dScale;
      ctx.beginPath();
      const progress = 1 - (f.strikeTimer / 0.22);
      const faceDir = f.side === 'LEFT' ? 1 : -1;
      ctx.arc(
        proj.x + faceDir * 15 * dScale,
        proj.y - bodyH * 0.6,
        35 * dScale,
        -Math.PI / 4 + progress * Math.PI,
        -Math.PI / 4 + (progress + 0.2) * Math.PI
      );
      ctx.stroke();
    }
  });

  // ── DRAW PARTICLES ──
  particles.forEach(p => {
    const pProj = project(p.x, p.y, 0, cw, ch);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.beginPath();
    ctx.arc(pProj.x, pProj.y, p.size * pProj.scale, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;

  // ── DRAW RING CORNER POSTS & ropes ──
  // Posts located at: (±230, ±230)
  const posts = [
    { x: -230, y: -230 },
    { x: 230, y: -230 },
    { x: 230, y: 230 },
    { x: -230, y: 230 }
  ];
  
  const postH = 80;
  const pProj = posts.map(p => {
    return {
      base: project(p.x, p.y, 0, cw, ch),
      top: project(p.x, p.y, postH, cw, ch)
    };
  });

  // Draw corner posts (drawn as thick vertical shafts)
  pProj.forEach(p => {
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 8 * p.base.scale;
    ctx.beginPath();
    ctx.moveTo(p.base.x, p.base.y);
    ctx.lineTo(p.top.x, p.top.y);
    ctx.stroke();

    // Gold post cap
    ctx.fillStyle = '#ffb700';
    ctx.beginPath();
    ctx.arc(p.top.x, p.top.y, 6 * p.top.scale, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw 3 layers of ring ropes connecting the corner posts
  const ropeLayers = [0.35, 0.65, 0.95]; // rope heights as fraction of postH
  
  ropeLayers.forEach(ly => {
    const ropeH = postH * ly;
    
    // Corner coordinates at this height
    const rCorners = posts.map(p => project(p.x, p.y, ropeH, cw, ch));
    
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.5 * cameraScale;
    ctx.beginPath();
    ctx.moveTo(rCorners[0].x, rCorners[0].y);
    ctx.lineTo(rCorners[1].x, rCorners[1].y);
    ctx.lineTo(rCorners[2].x, rCorners[2].y);
    ctx.lineTo(rCorners[3].x, rCorners[3].y);
    ctx.closePath();
    ctx.stroke();
  });

  // ── DRAW PC PINFALL GAUGE ──
  if (gameState === STATES.PINFALL) {
    const width = 240;
    const height = 18;
    const rx = cw / 2 - width / 2;
    const ry = ch / 2 + 190;

    // Background track
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(rx, ry, width, height, 9);
    ctx.fill();
    ctx.stroke();

    // Green Target Zone
    const targetLeftPx = rx + (pinTargetLeft / 100) * width;
    const targetWidthPx = (pinTargetWidth / 100) * width;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.roundRect(targetLeftPx, ry, targetWidthPx, height, 3);
    ctx.fill();

    // Needle pointer
    const needleLeftPx = rx + (pcNeedlePos / 100) * width;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(needleLeftPx, ry - 3);
    ctx.lineTo(needleLeftPx, ry + height + 3);
    ctx.stroke();

    // Kickout Text
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px var(--font-body)';
    ctx.textAlign = 'center';
    ctx.fillText('TAP PHONE OR PRESS SPACE (P1) / ENTER (P2) TO KICK OUT!', cw / 2, ry - 8);
  }
}

// ── HUD OVERLAY UPDATES ────────────────────────────────────────
function updateBattleHUD() {
  const p1 = fighters.PLAYER_1;
  const p2 = fighters.PLAYER_2;
  
  // Health
  document.getElementById('p1-hp-fill').style.width = `${p1.hp}%`;
  document.getElementById('p2-hp-fill').style.width = `${p2.hp}%`;
  
  // Stamina
  document.getElementById('p1-stm-fill').style.width = `${(p1.stamina / p1.stats.maxStamina) * 100}%`;
  document.getElementById('p2-stm-fill').style.width = `${(p2.stamina / p2.stats.maxStamina) * 100}%`;
  
  // Finisher meter
  document.getElementById('p1-finisher-val').innerText = `${Math.floor(p1.finisherMeter)}%`;
  document.getElementById('p2-finisher-val').innerText = `${Math.floor(p2.finisherMeter)}%`;
  
  // Apply gold glow if ready
  document.getElementById('p1-finisher-val').className = `finisher-gauge-value ${p1.finisherMeter >= 100 ? 'ready-glow' : ''}`;
  document.getElementById('p2-finisher-val').className = `finisher-gauge-value ${p2.finisherMeter >= 100 ? 'ready-glow' : ''}`;
}

function showNotification(txt) {
  const notif = document.getElementById('match-notification');
  if (notif) {
    notif.innerText = txt;
    notif.classList.remove('hidden');
    if (window.notifTimeout) clearTimeout(window.notifTimeout);
    window.notifTimeout = setTimeout(() => {
      notif.classList.add('hidden');
    }, 2200);
  }
}

// Helper linear interpolation
function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ── LOADING ANIMATION TICK ─────────────────────────────────────
let loadPercent = 0;
function runLoadingScreen(dt) {
  if (gameState !== STATES.LOADER) return;
  
  loadPercent = Math.min(100, loadPercent + 30 * dt);
  document.getElementById('loader-progress').style.width = `${loadPercent}%`;
  
  if (loadPercent >= 20 && loadPercent < 50) {
    document.getElementById('loader-status').innerText = 'CONNECTING TO WWE WEBSOCKET NETWORK...';
  } else if (loadPercent >= 50 && loadPercent < 80) {
    document.getElementById('loader-status').innerText = 'LOADING 3D PERSPECTIVE RENDERING CODES...';
  } else if (loadPercent >= 80 && loadPercent < 100) {
    document.getElementById('loader-status').innerText = 'INITIALIZING BATTLE RING ASSETS...';
  } else if (loadPercent >= 100) {
    gameState = STATES.MENU;
    document.getElementById('loader-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
  }
}

// ── GAME LOOP CLOCK ────────────────────────────────────────────
let lastTime = 0;

function gameLoop(time) {
  requestAnimationFrame(gameLoop);

  if (lastTime === 0) {
    lastTime = time;
    return;
  }
  const dt = Math.min(0.033, (time - lastTime) / 1000);
  lastTime = time;

  // 1. Tick loaders
  if (gameState === STATES.LOADER) {
    runLoadingScreen(dt);
    return;
  }

  // 2. Battle arena updates
  if (gameState === STATES.BATTLE || gameState === STATES.PINFALL) {
    if (!isPauseActive) {
      // Pinfall ref counters
      if (gameState === STATES.PINFALL) {
        processPinfallTick(dt);
        pcNeedlePos += 150 * pcNeedleDir * dt;
        if (pcNeedlePos >= 100) {
          pcNeedlePos = 100;
          pcNeedleDir = -1;
        } else if (pcNeedlePos <= 0) {
          pcNeedlePos = 0;
          pcNeedleDir = 1;
        }
      } else {
        // AI Combat Agent ticks
        runFighterAI(dt);
      }

      // Update wrestlers physics
      fighters.PLAYER_1.update(dt, playerInputs.PLAYER_1);
      fighters.PLAYER_2.update(dt, playerInputs.PLAYER_2);
      
      // Update particles
      updateParticles(dt);
      
      // Dynamic camera zoom calculations
      const p1 = fighters.PLAYER_1;
      const p2 = fighters.PLAYER_2;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      
      // Target camera parameters
      cameraX = lerp(cameraX, -midX, 6 * dt);
      cameraY = lerp(cameraY, -midY, 6 * dt);
      
      const targetScale = clamp(480 / (dist + 220), 0.75, 1.25);
      cameraScale = lerp(cameraScale, targetScale, 4 * dt);
      
      if (screenShakeTimer > 0) screenShakeTimer -= dt;

      // Sync battle stats
      updateBattleHUD();
    }
  }

  // 3. Render Battle Arena
  if (gameState === STATES.BATTLE || gameState === STATES.PINFALL) {
    const canvas = document.getElementById('wwe-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      
      drawWWEArena(ctx, w, h);
    }
  }
}

// ── STARTUP ────────────────────────────────────────────────────
function start() {
  initSocketConnection();
  requestAnimationFrame(gameLoop);
}

window.onload = start;
