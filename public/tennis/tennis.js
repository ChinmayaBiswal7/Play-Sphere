/**
 * Chibi Tennis Duel - Pro 2D Canvas Engine
 * local live 2-player controller split-screen tennis.
 * Authoritative ITF rules: deuce, advantage, sets, games, tie-breaks, serves, faults, lets, change-of-ends.
 */

// ── GAME STATE MACHINE ──────────────────────────────────────────
const STATES = {
  CONTROLLER_LOBBY: 'CONTROLLER_LOBBY',
  MATCH_SETUP: 'MATCH_SETUP',
  COUNTDOWN: 'COUNTDOWN',
  SERVE_PREPARE: 'SERVE_PREPARE',
  SERVE_TOSS: 'SERVE_TOSS',
  RALLY: 'RALLY',
  POINT_END: 'POINT_END',
  CHANGE_ENDS: 'CHANGE_ENDS',
  MATCH_END: 'MATCH_END',
  PAUSED_DISCONNECT: 'PAUSED_DISCONNECT'
};
let gameState = STATES.CONTROLLER_LOBBY;

// ── CONNECTION SLOTS ───────────────────────────────────────────
const controllerSlots = {
  PLAYER_1: { connected: false, socketId: null, ready: false },
  PLAYER_2: { connected: false, socketId: null, ready: false }
};

// ── INPUT STATES ───────────────────────────────────────────────
const playerInputs = {
  PLAYER_1: { moveX: 0, moveY: 0, hit: false, lob: false, power: false, dive: false },
  PLAYER_2: { moveX: 0, moveY: 0, hit: false, lob: false, power: false, dive: false }
};

// ── MATCH RULES & FORMATS ──────────────────────────────────────
let matchFormat = '1SET'; // 'QUICK', '1SET', '3SET'
let targetScore = 10;     // for QUICK format

// Proper Tennis Scores
let p1Points = 0;         // 0, 1, 2, 3, 4...
let p2Points = 0;
let p1Games = 0;
let p2Games = 0;
let p1Sets = 0;
let p2Sets = 0;

let p1SetScores = [];     // completed sets history
let p2SetScores = [];

let isTieBreak = false;
let tieBreakStartingServer = 'PLAYER_1';

// Server & Court sides
let currentServer = 'PLAYER_1';
let serveNumber = 1;      // 1 = first serve, 2 = second serve
let serveCourt = 'RIGHT'; // 'RIGHT' (deuce side) or 'LEFT' (advantage side)
let serveStage = 0;       // 0 = prepare/hand, 1 = tossed
let serveTouchReceiver = false; // to check ACE
let activeEndsSwapped = false;  // swapped on odd games
let lastHitter = null;
let ballBounces = 0;
let ballLastBounceSide = null; // 'P1' or 'P2'
let didTouchNetThisFlight = false;
let isRallyVolleyAllowed = false; // volley allowed after serve bounces once
let rallyActive = false;
let scores = { PLAYER_1: 0, PLAYER_2: 0 };
let isRulesPaused = false;

// ── GAME TIMERS & RECONNECTS ───────────────────────────────────
let socket = null;
let roomCode = '----';
let localIp = 'localhost';
let port = 3000;

let countdownVal = 3;
let countdownInterval = null;
let pauseTimeout = null;
let pauseTimeRemaining = 30;

let clock = {
  lastTime: 0,
  getDelta() {
    const now = performance.now();
    if (this.lastTime === 0) this.lastTime = now;
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    return delta;
  },
  getElapsedTime() {
    return performance.now() / 1000;
  }
};

// ── PARTICLE EFFECT SYSTEM ─────────────────────────────────────
const particles = [];
function spawnParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 250;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      color,
      size: 3 + Math.random() * 4
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
    p.vx *= 0.95;
    p.vy *= 0.95;
  }
}

// ── SOUND SYNTHESIS (WEB AUDIO API) ────────────────────────────
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
  hit: () => playSynthSound(600, 'triangle', 0.15, 0.4),
  lob: () => playSynthSound(450, 'sine', 0.25, 0.4),
  power: () => playSynthSound(850, 'sawtooth', 0.3, 0.5),
  bounce: () => playSynthSound(280, 'sine', 0.1, 0.3),
  net: () => playSynthSound(120, 'square', 0.2, 0.4),
  point: () => playSynthSound(523.25, 'triangle', 0.4, 0.3),
  win: () => {
    playSynthSound(523.25, 'sine', 0.2, 0.3);
    setTimeout(() => playSynthSound(659.25, 'sine', 0.2, 0.3), 150);
    setTimeout(() => playSynthSound(783.99, 'sine', 0.4, 0.4), 300);
  },
  countdown: () => playSynthSound(440, 'sine', 0.08, 0.25),
  countdownGo: () => playSynthSound(880, 'sine', 0.25, 0.3)
};

// ── STADIUM & PROJECTION CALCULATIONS ──────────────────────────
function depthScale(worldY, viewerSign) {
  // viewerSign handles player-side view: +1 for P1, -1 for P2
  const dist = viewerSign > 0 ? (600 - worldY) : (600 + worldY); // 0 = near, 1200 = far
  return lerp(1.15, 0.42, clamp(dist / 1200, 0, 1));
}

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Project coordinates to 2D split viewport
function worldToScreen(worldX, worldY, worldH, viewerId, vw, vh) {
  // Invert viewer orientation if physical ends are swapped!
  const endSign = activeEndsSwapped ? -1 : 1;
  const viewerSign = (viewerId === 'PLAYER_1' ? 1 : -1) * endSign;
  
  // Normalize worldY to [-1, 1] relative to view direction
  const ny = (worldY * viewerSign) / 500;
  
  // Perspective compression scale factor
  const dScale = lerp(0.95, 0.40, (1 - ny) / 2);
  
  const cx = vw / 2;
  
  // Non-linear Y perspective projection to stretch near baseline and compress background
  let screenY;
  if (ny >= 0) {
    screenY = lerp(vh * 0.48, vh * 0.90, ny);
  } else {
    screenY = lerp(vh * 0.48, vh * 0.16, -ny);
  }
  
  const screenX = cx + (worldX * viewerSign) * 0.54 * dScale * (vw / 685);
  const screenH = worldH * 0.65 * dScale * (vh / 1157);
  
  return {
    x: screenX,
    y: screenY - screenH,
    shadowY: screenY,
    scale: dScale
  };
}

// ── WORLD BALL OBJECT CLASS ────────────────────────────────────
class WorldBall {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.h = 40;
    this.vx = 0;
    this.vy = 0;
    this.vh = 0;
    this.radius = 10;
    this.inPlay = false;
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.h = 40;
    this.vx = 0;
    this.vy = 0;
    this.vh = 0;
    this.inPlay = false;
    ballBounces = 0;
    ballLastBounceSide = null;
    lastHitter = null;
    didTouchNetThisFlight = false;
    isRallyVolleyAllowed = false;
    serveTouchReceiver = false;
  }

  update(dt) {
    if (!this.inPlay) return;

    // Gravity
    this.vh -= 320 * dt;

    // Drag
    this.vx -= this.vx * 0.15 * dt;
    this.vy -= this.vy * 0.15 * dt;

    // Movement
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.h += this.vh * dt;

    // Floor collision
    if (this.h <= 0) {
      this.h = 0;
      this.vh = Math.abs(this.vh) * 0.82; // Bounce back
      if (this.vh < 35) this.vh = 0;

      sounds.bounce();
      spawnParticles(this.x, this.y, '#39ff14', 5);

      const side = this.y > 0 ? 'P1' : 'P2';

      if (gameState === STATES.SERVE_TOSS || (gameState === STATES.POINT_END && rallyActive === false)) {
        // Evaluate serve landing
        const result = evaluateBallLanding(this.x, this.y, true);
        if (result.isIn) {
          if (didTouchNetThisFlight) {
            // Serve Let: Replay serve
            sounds.net();
            showNotification('LET! REPLAY SERVE');
            spawnParticles(this.x, this.y, '#f59e0b', 8);
            gameState = STATES.SERVE_PREPARE;
            serveStage = 0;
            this.inPlay = false;
            this.vh = 0;
            this.vx = 0;
            this.vy = 0;
          } else {
            // Valid Serve! Begin Rally
            isRallyVolleyAllowed = false; // first return must bounce
            ballBounces = 1;
            ballLastBounceSide = side;
            gameState = STATES.RALLY;
            rallyActive = true;
          }
        } else {
          // Serve Fault!
          triggerServeFault();
        }
      } else if (gameState === STATES.RALLY) {
        if (ballLastBounceSide === side) {
          // Double bounce!
          const opponent = side === 'P1' ? 'PLAYER_2' : 'PLAYER_1';
          triggerPointWin(opponent, 'Double Bounce!');
        } else {
          ballBounces++;
          ballLastBounceSide = side;
          isRallyVolleyAllowed = true; // receiver has let it bounce, volleys are now legal

          // Out check
          const result = evaluateBallLanding(this.x, this.y, false);
          if (!result.isIn) {
            const opponent = lastHitter === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
            triggerPointWin(opponent, 'Out of Bounds!');
          }
        }
      }
    }

    // Net collision check (Net is at y = 0, height = 75, width = [-320, 320])
    const prevY = this.y - this.vy * dt;
    if (Math.sign(prevY) !== Math.sign(this.y)) {
      if (this.h <= 75 && Math.abs(this.x) <= 320) {
        didTouchNetThisFlight = true;
        
        // If it's a normal rally, bounce off the net. If it crosses, continue play.
        // If it fails to cross (rebound backwards), hitter loses the point.
        const originalVy = this.vy;
        this.y = prevY;
        this.vy = -this.vy * 0.22; // bounce back
        this.vh = Math.max(20, this.vh * 0.5);
        this.vx *= 0.5;

        sounds.net();
        spawnParticles(this.x, 0, '#ffffff', 8);

        // If it is a serve, check if it falls back or crosses
        if (gameState === STATES.SERVE_TOSS) {
          // falls back -> immediate fault
          setTimeout(() => {
            if (gameState === STATES.SERVE_TOSS) triggerServeFault();
          }, 300);
        } else if (gameState === STATES.RALLY) {
          // Normal rally: check if it returns back to hitter
          const sideBefore = prevY > 0 ? 'P1' : 'P2';
          setTimeout(() => {
            if (gameState === STATES.RALLY && lastHitter) {
              const currentSide = this.y > 0 ? 'P1' : 'P2';
              if (currentSide === sideBefore) {
                const opponent = lastHitter === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
                triggerPointWin(opponent, 'Hit the Net!');
              }
            }
          }, 400);
        }
      }
    }

    // Boundary cap
    if (Math.abs(this.y) > 750 || Math.abs(this.x) > 450) {
      if (gameState === STATES.RALLY && lastHitter) {
        const opponent = lastHitter === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
        triggerPointWin(opponent, 'Out of Bounds!');
      } else if (gameState === STATES.SERVE_TOSS) {
        triggerServeFault();
      } else {
        this.reset();
      }
    }
  }
}

// ── WORLD PLAYER CLASS ─────────────────────────────────────────
class WorldPlayer {
  constructor(slot, color, startY) {
    this.slot = slot;
    this.color = color;
    this.x = 0;
    this.y = startY;
    
    this.vx = 0;
    this.vy = 0;
    this.speed = 380; // Balanced movement speed (reduced from 460 for better sensitivity)
    this.swingTimer = 0;
    this.swingType = null;
    this.diveTimer = 0;
    this.diveX = 0;
    this.diveY = 0;
  }

  swing(type) {
    if (this.swingTimer > 0) return;
    this.swingType = type;
    this.swingTimer = 0.25;

    if (type === 'HIT') sounds.hit();
    else if (type === 'LOB') sounds.lob();
    else if (type === 'POWER') sounds.power();
  }

  dive(dx, dy) {
    if (this.diveTimer > 0) return;
    this.diveTimer = 0.4;
    const len = Math.hypot(dx, dy) || 1;
    this.diveX = (dx / len) * this.speed * 1.5;
    this.diveY = (dy / len) * this.speed * 1.5;
    sounds.hit();
  }

  update(dt, input) {
    let targetVx = 0;
    let targetVy = 0;

    if (this.diveTimer > 0) {
      this.diveTimer -= dt;
      targetVx = this.diveX;
      targetVy = this.diveY;
    } else {
      if (Math.abs(input.moveX) > 0.15 || Math.abs(input.moveY) > 0.15) {
        // Adjust directional controls based on active end side changes!
        const endSign = activeEndsSwapped ? -1 : 1;
        if (this.slot === 'PLAYER_1') {
          targetVx = input.moveX * this.speed * endSign;
          targetVy = input.moveY * this.speed * endSign;
        } else {
          targetVx = -input.moveX * this.speed * endSign;
          targetVy = -input.moveY * this.speed * endSign;
        }
      }
    }

    // Apply linear acceleration and damping weight to chibi players
    const acc = this.diveTimer > 0 ? 10.0 : 7.0;
    this.vx = lerp(this.vx, targetVx, acc * dt);
    this.vy = lerp(this.vy, targetVy, acc * dt);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Clamp coordinates inside their respective half-court boundaries
    this.x = clamp(this.x, -285, 285);
    
    const isP1 = this.slot === 'PLAYER_1';
    const isP1OnNear = (isP1 && !activeEndsSwapped) || (!isP1 && activeEndsSwapped);
    
    if (isP1OnNear) {
      this.y = clamp(this.y, 45, 520);
    } else {
      this.y = clamp(this.y, -520, -45);
    }

    // Update swing stroke timers
    if (this.swingTimer > 0) {
      this.swingTimer -= dt;
      const progress = 1 - (this.swingTimer / 0.25);
      
      if (progress >= 0.35 && progress <= 0.65) {
        checkRacketImpact(this);
      }
    }
  }
}

const ball = new WorldBall();
const players = {
  PLAYER_1: new WorldPlayer('PLAYER_1', '#00d2ff', 420),
  PLAYER_2: new WorldPlayer('PLAYER_2', '#ff007f', -420)
};

// ── RACKET IMPACT & SHOT AIMING ────────────────────────────────
function checkRacketImpact(player) {
  if (!ball.inPlay && gameState !== STATES.SERVE_PREPARE) return;

  const dx = ball.x - player.x;
  const dy = ball.y - player.y;
  const dist = Math.hypot(dx, dy);

  const maxReach = 115;
  const maxHitHeight = 180;

  if (dist <= maxReach && ball.h <= maxHitHeight) {
    // If serve receiver: Volleys are prohibited on the first return!
    if (gameState === STATES.SERVE_TOSS && player.slot !== currentServer) {
      if (ball.h > 15 && ballBounces === 0) {
        // Illegal volley on serve return! Opponent wins point
        triggerPointWin(currentServer, 'Illegal Volley on Serve!');
        return;
      }
    }

    const input = playerInputs[player.slot];
    
    // Horizontal angle aim (X axis) controlled by joystick X
    let angleX = 0;
    const endSign = activeEndsSwapped ? -1 : 1;
    if (player.slot === 'PLAYER_1') {
      angleX = input.moveX * 320 * endSign;
    } else {
      angleX = -input.moveX * 320 * endSign;
    }

    // Vertical length aim (Y axis depth) controlled by joystick Y
    // UP on joystick (negative Y input) pushes deeper, DOWN draws shorter
    let depthMultiplier = 1.0;
    if (input.moveY < -0.15) {
      // Pushing UP (moveY < 0) adds depth (safer range: max +15%)
      depthMultiplier = lerp(1.0, 1.15, -input.moveY);
    } else if (input.moveY > 0.15) {
      // Pushing DOWN (moveY > 0) cuts short (safer range: max -20%)
      depthMultiplier = lerp(1.0, 0.80, input.moveY);
    }

    // Hitter direction sign
    const isP1 = player.slot === 'PLAYER_1';
    const isP1OnNear = (isP1 && !activeEndsSwapped) || (!isP1 && activeEndsSwapped);
    const dir = isP1OnNear ? -1 : 1;

    // Shot Accuracy/Error margin based on movement speed and timing
    const timingOffset = Math.sin((performance.now() / 100) % Math.PI) * 45;
    const speedRatio = Math.hypot(player.vx, player.vy) / player.speed;
    const accuracyNoise = timingOffset * (0.2 + speedRatio * 0.8);
    angleX += accuracyNoise;

    if (gameState === STATES.SERVE_PREPARE && currentServer === player.slot && serveStage === 1) {
      // Strike Serve! (Balanced speed to prevent easy double-faults/out of bounds)
      ball.inPlay = true;
      ball.vx = angleX;
      ball.vy = 410 * dir;
      ball.vh = 130; // toss lift
      
      ballBounces = 0;
      ballLastBounceSide = null;
      lastHitter = player.slot;
      serveStage = 2; // in flight
      gameState = STATES.SERVE_TOSS;

      sounds.hit();
      spawnParticles(ball.x, ball.y, player.color, 12);
      triggerControllerVibration(player.slot, 85);
    } else if (gameState === STATES.RALLY || (gameState === STATES.SERVE_TOSS && player.slot !== currentServer)) {
      // Normal return
      if (gameState === STATES.SERVE_TOSS) {
        // Successful serve return touches the ball
        serveTouchReceiver = true;
      }

      let speedY = 380; // Safe 'MID' default shot
      let speedH = 100;
      let isSmash = false;

      if (player.swingType === 'LOB') {
        // 'LONG' / deep baseline shot
        speedY = 460;
        speedH = 120;
      } else if (player.swingType === 'POWER') {
        // 'SMASH' / high ball downward spike
        if (ball.h > 45) {
          speedY = 560; // fast downward slam
          speedH = -35; // downward trajectory
          isSmash = true;
        } else {
          // Low power shot (flat, fast but safe)
          speedY = 480;
          speedH = 65;
        }
      }

      // Slice Backspin simulation (if player holds down on joystick while hitting)
      if (player.swingType === 'LOB' && input.moveY > 0.3) {
        // Slice: slower, floats, lower bounce
        speedY *= 0.75;
        speedH = 90;
      }

      ball.vx = angleX;
      ball.vy = speedY * dir * depthMultiplier;
      ball.vh = speedH;

      ballBounces = 0;
      ballLastBounceSide = null;
      lastHitter = player.slot;
      gameState = STATES.RALLY;
      rallyActive = true;

      sounds.hit();
      if (isSmash) {
        showNotification('💥 SMASH!');
        spawnParticles(ball.x, ball.y, '#eab308', 25);
        triggerControllerVibration(player.slot, 100);
      } else {
        spawnParticles(ball.x, ball.y, player.color, 15);
        triggerControllerVibration(player.slot, 85);
      }
    }

    player.swingType = null;
  }
}

// ── TENNIS RULE LAWS (IN/OUT, FAULT, LET) ──────────────────────
function evaluateBallLanding(x, y, isServeCheck) {
  const lineTolerance = 6.0; // lines are IN

  if (isServeCheck) {
    // Service box boundary checks
    // Find correct diagonally opposite service box
    const requiredBox = getRequiredServiceBox(currentServer, serveCourt);
    const isIn = x >= requiredBox.minX - lineTolerance &&
                 x <= requiredBox.maxX + lineTolerance &&
                 y >= requiredBox.minY - lineTolerance &&
                 y <= requiredBox.maxY + lineTolerance;
    
    return { isIn, area: isIn ? 'SERVICE_BOX' : 'OUT' };
  } else {
    // Normal Singles Court check
    // Width: [-240, 240], Length: [-500, 500]
    const isIn = x >= -240 - lineTolerance &&
                 x <= 240 + lineTolerance &&
                 y >= -500 - lineTolerance &&
                 y <= 500 + lineTolerance;
                 
    return { isIn, area: isIn ? 'SINGLES_COURT' : 'OUT' };
  }
}

function getRequiredServiceBox(server, serveCourt) {
  // If baseline ends are swapped, deuce/advantage boxes invert sides!
  const ends = activeEndsSwapped;
  if (server === 'PLAYER_1') {
    if (!ends) {
      return serveCourt === 'RIGHT'
        ? { minX: -240, maxX: 0, minY: -300, maxY: 0 }  // P2 deuce side
        : { minX: 0, maxX: 240, minY: -300, maxY: 0 };  // P2 advantage side
    } else {
      return serveCourt === 'RIGHT'
        ? { minX: 0, maxX: 240, minY: 0, maxY: 300 }    // P2 deuce side (swapped)
        : { minX: -240, maxX: 0, minY: 0, maxY: 300 };   // P2 advantage side (swapped)
    }
  } else {
    if (!ends) {
      return serveCourt === 'RIGHT'
        ? { minX: 0, maxX: 240, minY: 0, maxY: 300 }    // P1 deuce side
        : { minX: -240, maxX: 0, minY: 0, maxY: 300 };   // P1 advantage side
    } else {
      return serveCourt === 'RIGHT'
        ? { minX: -240, maxX: 0, minY: -300, maxY: 0 }  // P1 deuce side (swapped)
        : { minX: 0, maxX: 240, minY: -300, maxY: 0 };  // P1 advantage side (swapped)
    }
  }
}

function triggerServeFault() {
  ball.inPlay = false;
  rallyActive = false;
  spawnParticles(ball.x, ball.y, '#ef4444', 10);
  triggerControllerVibration(currentServer, [60, 40, 60]);

  if (serveNumber === 1) {
    serveNumber = 2;
    sounds.net();
    showNotification('FAULT! SECOND SERVE');
    
    setTimeout(() => {
      gameState = STATES.SERVE_PREPARE;
      serveStage = 0;
      ball.reset();
    }, 1500);
  } else {
    // Double fault!
    sounds.net();
    showNotification('DOUBLE FAULT!');
    const opponent = currentServer === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    
    setTimeout(() => {
      serveNumber = 1;
      triggerPointWin(opponent, 'Double Fault!');
    }, 1500);
  }
}

// ── GAME SCORING ENGINE (ITF CODES) ───────────────────────────
function triggerPointWin(winner, reason) {
  gameState = STATES.POINT_END;
  rallyActive = false;
  ball.inPlay = false;

  sounds.point();
  spawnParticles(winner === 'PLAYER_1' ? players.PLAYER_1.x : players.PLAYER_2.x, 
                 winner === 'PLAYER_1' ? players.PLAYER_1.y : players.PLAYER_2.y, '#eab308', 20);

  // Check for ACE: legal serve untouched by receiver
  if (lastHitter === currentServer && !serveTouchReceiver && (reason.toLowerCase().includes('double bounce') || reason.toLowerCase().includes('out of bounds'))) {
    showNotification('ACE!');
    sounds.win();
  } else {
    showNotification(`${winner === 'PLAYER_1' ? 'PLAYER 1' : 'PLAYER 2'} SCORES! (${reason})`);
  }

  // Increment Point
  if (matchFormat === 'QUICK') {
    scores[winner]++;
    triggerControllerVibration(winner, 150);
    
    if (scores[winner] >= targetScore) {
      setTimeout(() => { triggerMatchWin(winner); }, 2500);
    } else {
      // Alternate server every 2 points
      const totalPoints = scores.PLAYER_1 + scores.PLAYER_2;
      if (totalPoints % 2 === 0) {
        currentServer = currentServer === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
      }
      setTimeout(() => { startNewPoint(); }, 2500);
    }
  } else {
    // Proper ITF Rules scoring
    if (isTieBreak) {
      if (winner === 'PLAYER_1') p1Points++; else p2Points++;
      triggerControllerVibration(winner, 150);

      // Check tie-break game win (First to 7 by 2 lead)
      if (p1Points >= 7 && p1Points - p2Points >= 2) {
        p1Games++;
        setTimeout(() => { triggerGameWin('PLAYER_1'); }, 2500);
      } else if (p2Points >= 7 && p2Points - p1Points >= 2) {
        p2Games++;
        setTimeout(() => { triggerGameWin('PLAYER_2'); }, 2500);
      } else {
        // Rotate server in tie-break (serves alternate every 2 points)
        const tbPoints = p1Points + p2Points;
        if (Math.floor((tbPoints - 1) / 2) % 2 === 0) {
          currentServer = getOpponent(tieBreakStartingServer);
        } else {
          currentServer = tieBreakStartingServer;
        }

        // Alternate serving court side every point
        serveCourt = tbPoints % 2 === 0 ? 'RIGHT' : 'LEFT';
        
        // Change ends in tie-break every 6 points
        if (tbPoints % 6 === 0) {
          setTimeout(() => { triggerSideChange(); }, 2200);
        } else {
          setTimeout(() => { startNewPoint(); }, 2500);
        }
      }
    } else {
      // Normal game scoring
      if (winner === 'PLAYER_1') p1Points++; else p2Points++;
      triggerControllerVibration(winner, 150);

      // Check Normal game win (4 points and 2-lead)
      if (p1Points >= 4 && p1Points - p2Points >= 2) {
        p1Games++;
        setTimeout(() => { triggerGameWin('PLAYER_1'); }, 2500);
      } else if (p2Points >= 4 && p2Points - p1Points >= 2) {
        p2Games++;
        setTimeout(() => { triggerGameWin('PLAYER_2'); }, 2500);
      } else {
        // Set serving side based on points played in current game
        const totalGamePts = p1Points + p2Points;
        serveCourt = totalGamePts % 2 === 0 ? 'RIGHT' : 'LEFT';
        
        setTimeout(() => { startNewPoint(); }, 2500);
      }
    }
  }
}

function triggerGameWin(winner) {
  p1Points = 0;
  p2Points = 0;
  isRallyVolleyAllowed = false;
  sounds.win();

  showNotification(`GAME ${winner === 'PLAYER_1' ? 'PLAYER 1' : 'PLAYER 2'}!`);

  // Check Set Win
  if (isTieBreak) {
    isTieBreak = false;
    triggerSetWin(winner);
  } else {
    // Normal set win (first to 6 by 2 lead)
    if (p1Games >= 6 && p1Games - p2Games >= 2) {
      triggerSetWin('PLAYER_1');
    } else if (p2Games >= 6 && p2Games - p1Games >= 2) {
      triggerSetWin('PLAYER_2');
    } else if (p1Games === 6 && p2Games === 6) {
      // Tie-break!
      isTieBreak = true;
      tieBreakStartingServer = currentServer;
      showNotification('TIE-BREAK!');
      setTimeout(() => { startNewPoint(); }, 2500);
    } else {
      // Alternate server after every game
      currentServer = getOpponent(currentServer);
      serveCourt = 'RIGHT';

      // Check change ends (after odd total games of set: 1, 3, 5...)
      const totalGames = p1Games + p2Games;
      if (totalGames % 2 === 1) {
        setTimeout(() => { triggerSideChange(); }, 2200);
      } else {
        setTimeout(() => { startNewPoint(); }, 2500);
      }
    }
  }
}

function triggerSetWin(winner) {
  if (winner === 'PLAYER_1') p1Sets++; else p2Sets++;
  p1SetScores.push(p1Games);
  p2SetScores.push(p2Games);

  p1Games = 0;
  p2Games = 0;

  showNotification(`SET ${winner === 'PLAYER_1' ? 'PLAYER 1' : 'PLAYER 2'}!`);

  // Check Match Win
  const setsToWin = matchFormat === '3SET' ? 2 : 1;
  if (p1Sets >= setsToWin) {
    setTimeout(() => { triggerMatchWin('PLAYER_1'); }, 2500);
  } else if (p2Sets >= setsToWin) {
    setTimeout(() => { triggerMatchWin('PLAYER_2'); }, 2500);
  } else {
    // Alternate server for next set
    currentServer = getOpponent(currentServer);
    serveCourt = 'RIGHT';
    
    // Always change ends at set end if total games played in the set was odd
    const lastSetTotalGames = p1SetScores[p1SetScores.length - 1] + p2SetScores[p2SetScores.length - 1];
    if (lastSetTotalGames % 2 === 1) {
      setTimeout(() => { triggerSideChange(); }, 2200);
    } else {
      setTimeout(() => { startNewPoint(); }, 2500);
    }
  }
}

function triggerSideChange() {
  gameState = STATES.CHANGE_ENDS;
  activeEndsSwapped = !activeEndsSwapped;
  
  showNotification('CHANGE OF ENDS');
  sounds.lob();

  // Draw fading transitions of player baselines
  setTimeout(() => {
    startNewPoint();
  }, 2500);
}

function getOpponent(player) {
  return player === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
}

function checkMatchPointAnnouncements() {
  // Checks if winner of next point takes game/set/match
  const setsToWin = matchFormat === '3SET' ? 2 : 1;
  
  function winsSetIfWinsGame(player, nextG) {
    const oppG = player === 'PLAYER_1' ? p2Games : p1Games;
    if (isTieBreak) return true;
    return nextG >= 6 && nextG - oppG >= 2;
  }
  
  function winsMatchIfWinsSet(player, nextS) {
    return nextS >= setsToWin;
  }

  // P1 Game Point Check
  let p1GamePt = false;
  if (isTieBreak) {
    p1GamePt = p1Points >= 6 && p1Points - p2Points >= 1;
  } else {
    p1GamePt = p1Points >= 3 && p1Points - p2Points >= 1;
  }

  // P2 Game Point Check
  let p2GamePt = false;
  if (isTieBreak) {
    p2GamePt = p2Points >= 6 && p2Points - p1Points >= 1;
  } else {
    p2GamePt = p2Points >= 3 && p2Points - p1Points >= 1;
  }

  if (p1GamePt) {
    const nextGames = p1Games + 1;
    const winsSet = winsSetIfWinsGame('PLAYER_1', nextGames);
    const winsMatch = winsSet && winsMatchIfWinsSet('PLAYER_1', p1Sets + 1);
    if (winsMatch) return 'MATCH POINT P1';
    if (winsSet) return 'SET POINT P1';
    if (currentServer === 'PLAYER_2') return 'BREAK POINT';
    return 'GAME POINT P1';
  }

  if (p2GamePt) {
    const nextGames = p2Games + 1;
    const winsSet = winsSetIfWinsGame('PLAYER_2', nextGames);
    const winsMatch = winsSet && winsMatchIfWinsSet('PLAYER_2', p2Sets + 1);
    if (winsMatch) return 'MATCH POINT P2';
    if (winsSet) return 'SET POINT P2';
    if (currentServer === 'PLAYER_1') return 'BREAK POINT';
    return 'GAME POINT P2';
  }

  return null;
}

// ── VIEWPORT DRAWING & LIGHTWEIGHT STADIUM ENVIRONMENT ────────
function drawStadiumEnvironment(ctx, playerId, vx, vy, vw, vh) {
  // We project 3D stadium landmarks onto the 2D canvas using worldToScreen!
  // viewerSign handles player-side view
  const endSign = activeEndsSwapped ? -1 : 1;
  const viewerSign = (playerId === 'PLAYER_1' ? 1 : -1) * endSign;

  // Draw stadium walls
  const wallY = 660;
  const wallX = 420;
  const projWallFarLeft = worldToScreen(-wallX, -wallY, 0, playerId, vw, vh);
  const projWallFarRight = worldToScreen(wallX, -wallY, 0, playerId, vw, vh);
  const projWallNearLeft = worldToScreen(-wallX, wallY, 0, playerId, vw, vh);
  const projWallNearRight = worldToScreen(wallX, wallY, 0, playerId, vw, vh);

  // Outer concrete court runoff floor
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(vx + projWallFarLeft.x, vy + projWallFarLeft.y);
  ctx.lineTo(vx + projWallFarRight.x, vy + projWallFarRight.y);
  ctx.lineTo(vx + projWallNearRight.x, vy + projWallNearRight.y);
  ctx.lineTo(vx + projWallNearLeft.x, vy + projWallNearLeft.y);
  ctx.closePath();
  ctx.fill();

  // Draw Back Walls (height = 80)
  const wallHeight = 85;
  const projWallFarLeftTop = worldToScreen(-wallX, -wallY, wallHeight, playerId, vw, vh);
  const projWallFarRightTop = worldToScreen(wallX, -wallY, wallHeight, playerId, vw, vh);
  const projWallNearLeftTop = worldToScreen(-wallX, wallY, wallHeight, playerId, vw, vh);
  const projWallNearRightTop = worldToScreen(wallX, wallY, wallHeight, playerId, vw, vh);

  ctx.fillStyle = '#0f172a';
  // Far wall
  ctx.beginPath();
  ctx.moveTo(vx + projWallFarLeft.x, vy + projWallFarLeft.y);
  ctx.lineTo(vx + projWallFarRight.x, vy + projWallFarRight.y);
  ctx.lineTo(vx + projWallFarRightTop.x, vy + projWallFarRightTop.y);
  ctx.lineTo(vx + projWallFarLeftTop.x, vy + projWallFarLeftTop.y);
  ctx.closePath();
  ctx.fill();

  // Draw Spectator silhouettes on far stands
  // Row of circles placed on back walls
  ctx.fillStyle = '#475569';
  for (let xOffset = -380; xOffset <= 380; xOffset += 60) {
    const spProj = worldToScreen(xOffset, -wallY - 40, wallHeight + 15, playerId, vw, vh);
    ctx.beginPath();
    ctx.arc(vx + spProj.x, vy + spProj.y, 8 * spProj.scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw tiny body capsule
    ctx.beginPath();
    ctx.ellipse(vx + spProj.x, vy + spProj.y + 12 * spProj.scale, 10 * spProj.scale, 12 * spProj.scale, 0, 0, Math.PI, true);
    ctx.fill();
  }

  // Draw Umpire Chair (placed on left side of court: x = -360, y = 0)
  const chairX = -360;
  const chairY = 0;
  const chairH = 75;
  const pChairBase = worldToScreen(chairX, chairY, 0, playerId, vw, vh);
  const pChairSeat = worldToScreen(chairX, chairY, chairH, playerId, vw, vh);
  const pChairTop = worldToScreen(chairX, chairY, chairH + 45, playerId, vw, vh);

  // Ladder posts
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3.5 * pChairBase.scale;
  ctx.beginPath();
  ctx.moveTo(vx + pChairBase.x - 12 * pChairBase.scale, vy + pChairBase.y);
  ctx.lineTo(vx + pChairSeat.x - 4 * pChairSeat.scale, vy + pChairSeat.y);
  ctx.moveTo(vx + pChairBase.x + 12 * pChairBase.scale, vy + pChairBase.y);
  ctx.lineTo(vx + pChairSeat.x + 4 * pChairSeat.scale, vy + pChairSeat.y);
  ctx.stroke();

  // Chair Canopy shading
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.roundRect(vx + pChairTop.x - 20 * pChairTop.scale, vy + pChairTop.y, 40 * pChairTop.scale, 10 * pChairTop.scale, 4);
  ctx.fill();

  // Draw Stadium light poles (4 corner light towers)
  const lights = [
    { x: -390, y: -520, h: 180 },
    { x: 390, y: -520, h: 180 },
    { x: -390, y: 520, h: 180 },
    { x: 390, y: 520, h: 180 }
  ];

  lights.forEach(lt => {
    const pBase = worldToScreen(lt.x, lt.y, 0, playerId, vw, vh);
    const pTop = worldToScreen(lt.x, lt.y, lt.h, playerId, vw, vh);

    // Pole
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6 * pBase.scale;
    ctx.beginPath();
    ctx.moveTo(vx + pBase.x, vy + pBase.y);
    ctx.lineTo(vx + pTop.x, vy + pTop.y);
    ctx.stroke();

    // Light head panel
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(vx + pTop.x, vy + pTop.y, 16 * pTop.scale, 0, Math.PI * 2);
    ctx.fill();

    // Light beam yellow projection cone
    const beamGrad = ctx.createRadialGradient(
      vx + pTop.x, vy + pTop.y, 2 * pTop.scale,
      vx + pTop.x, vy + pTop.y, 180 * pTop.scale
    );
    beamGrad.addColorStop(0, 'rgba(253, 224, 71, 0.28)');
    beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = beamGrad;
    
    ctx.beginPath();
    ctx.moveTo(vx + pTop.x, vy + pTop.y);
    ctx.lineTo(vx + pBase.x - 120 * pBase.scale, vy + pBase.y + 120 * pBase.scale);
    ctx.lineTo(vx + pBase.x + 120 * pBase.scale, vy + pBase.y + 120 * pBase.scale);
    ctx.closePath();
    ctx.fill();
  });
}

// ── 2D CANVAS DRAWING FUNCTIONS ────────────────────────────────
function renderViewport(playerId, vx, vy, vw, vh) {
  const canvas = document.getElementById('tennis-canvas');
  const ctx = canvas.getContext('2d');
  
  // Set clip path to current viewport
  ctx.save();
  ctx.beginPath();
  ctx.rect(vx, vy, vw, vh);
  ctx.clip();

  const endSign = activeEndsSwapped ? -1 : 1;
  const viewerSign = (playerId === 'PLAYER_1' ? 1 : -1) * endSign;
  const cx = vx + vw / 2;
  const cy = vy + vh / 2;

  // Draw Glowing Court boundaries
  // Sidelines: x = -300 and 300, Baselines: y = -500 and 500
  const corners = [
    { x: -300, y: -500 },
    { x: 300, y: -500 },
    { x: 300, y: 500 },
    { x: -300, y: 500 }
  ];
  
  const screenCorners = corners.map(c => worldToScreen(c.x, c.y, 0, playerId, vw, vh));
  
  // Draw court base surface fill
  ctx.beginPath();
  ctx.moveTo(vx + screenCorners[0].x, vy + screenCorners[0].y);
  ctx.lineTo(vx + screenCorners[1].x, vy + screenCorners[1].y);
  ctx.lineTo(vx + screenCorners[2].x, vy + screenCorners[2].y);
  ctx.lineTo(vx + screenCorners[3].x, vy + screenCorners[3].y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
  ctx.fill();
  
  // Glow lines styling
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#1e40af';
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0; // reset glow

  // Draw court lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2.5;

  function drawWorldLine(x1, y1, x2, y2) {
    const p1 = worldToScreen(x1, y1, 0, playerId, vw, vh);
    const p2 = worldToScreen(x2, y2, 0, playerId, vw, vh);
    ctx.beginPath();
    ctx.moveTo(vx + p1.x, vy + p1.y);
    ctx.lineTo(vx + p2.x, vy + p2.y);
    ctx.stroke();
  }

  // Draw Outer borders
  drawWorldLine(-300, -500, 300, -500); // base far
  drawWorldLine(-300, 500, 300, 500);   // base near
  drawWorldLine(-300, -500, -300, 500); // side left
  drawWorldLine(300, -500, 300, 500);   // side right

  // Draw Singles lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  drawWorldLine(-240, -500, -240, 500);
  drawWorldLine(240, -500, 240, 500);

  // Service boxes
  drawWorldLine(-240, -300, 240, -300); // Service line far
  drawWorldLine(-240, 300, 240, 300);   // Service line near
  drawWorldLine(0, -300, 0, 300);       // Center service line

  // Draw player-specific indicators (glow boundaries)
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = playerId === 'PLAYER_1' ? '#00d2ff' : '#ff007f';
  ctx.shadowColor = playerId === 'PLAYER_1' ? '#00d2ff' : '#ff007f';
  ctx.shadowBlur = 8;
  
  // Highlight server side service box area visually (dotted cyan/pink outline)
  if (gameState === STATES.SERVE_PREPARE && playerId === currentServer) {
    const box = getRequiredServiceBox(currentServer, serveCourt);
    const b0 = worldToScreen(box.minX, box.minY, 0, playerId, vw, vh);
    const b1 = worldToScreen(box.maxX, box.minY, 0, playerId, vw, vh);
    const b2 = worldToScreen(box.maxX, box.maxY, 0, playerId, vw, vh);
    const b3 = worldToScreen(box.minX, box.maxY, 0, playerId, vw, vh);
    
    ctx.strokeStyle = playerId === 'PLAYER_1' ? '#00d2ff' : '#ff007f';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(vx + b0.x, vy + b0.y);
    ctx.lineTo(vx + b1.x, vy + b1.y);
    ctx.lineTo(vx + b2.x, vy + b2.y);
    ctx.lineTo(vx + b3.x, vy + b3.y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Highlight baseline boundary
  const activeP1Near = !activeEndsSwapped;
  if (playerId === 'PLAYER_1') {
    drawWorldLine(-300, activeP1Near ? 500 : -500, 300, activeP1Near ? 500 : -500);
  } else {
    drawWorldLine(-300, activeP1Near ? -500 : 500, 300, activeP1Near ? -500 : 500);
  }
  ctx.restore();

  // Draw Net (drawn as screen-space quad + mesh grid)
  const netHeight = 75;
  const pBottomLeft = worldToScreen(-320, 0, 0, playerId, vw, vh);
  const pBottomRight = worldToScreen(320, 0, 0, playerId, vw, vh);
  const pTopLeft = worldToScreen(-320, 0, netHeight, playerId, vw, vh);
  const pTopRight = worldToScreen(320, 0, netHeight, playerId, vw, vh);

  // Net mesh grid
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.moveTo(vx + pBottomLeft.x, vy + pBottomLeft.y);
  ctx.lineTo(vx + pBottomRight.x, vy + pBottomRight.y);
  ctx.lineTo(vx + pTopRight.x, vy + pTopRight.y);
  ctx.lineTo(vx + pTopLeft.x, vy + pTopLeft.y);
  ctx.closePath();
  ctx.fill();

  // Net white band line
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(vx + pTopLeft.x, vy + pTopLeft.y);
  ctx.lineTo(vx + pTopRight.x, vy + pTopRight.y);
  ctx.stroke();

  // Net posts
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(vx + pBottomLeft.x, vy + pBottomLeft.y);
  ctx.lineTo(vx + pTopLeft.x, vy + pTopLeft.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(vx + pBottomRight.x, vy + pBottomRight.y);
  ctx.lineTo(vx + pTopRight.x, vy + pTopRight.y);
  ctx.stroke();

  // ── DRAW SHADOWS FIRST ──
  // Player Shadows
  Object.values(players).forEach(p => {
    const proj = worldToScreen(p.x, p.y, 0, playerId, vw, vh);
    const radius = 25 * proj.scale;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(vx + proj.x, vy + proj.shadowY, radius, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Ball Shadow
  if (gameState !== STATES.CONTROLLER_LOBBY) {
    const ballProj = worldToScreen(ball.x, ball.y, 0, playerId, vw, vh);
    const shadowFactor = 1.0 + ball.h * 0.005;
    const shadowRadius = (ball.radius + 3) * ballProj.scale / shadowFactor;
    
    ctx.fillStyle = `rgba(0, 0, 0, ${clamp(0.5 / shadowFactor, 0.05, 0.5)})`;
    ctx.beginPath();
    ctx.arc(vx + ballProj.x, vy + ballProj.shadowY, shadowRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── DRAW PLAYERS ──
  Object.values(players).forEach(p => {
    const proj = worldToScreen(p.x, p.y, 0, playerId, vw, vh);
    const dScale = proj.scale;

    // Body dimensions
    const headRadius = 18 * dScale;
    const bodyWidth = 32 * dScale;
    const bodyHeight = 50 * dScale;

    // Draw Chibi Body Capsule
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.roundRect(vx + proj.x - bodyWidth/2, vy + proj.y - bodyHeight, bodyWidth, bodyHeight, 10 * dScale);
    ctx.fill();
    
    // Glow player indicator outline
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.save();
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(vx + proj.x - bodyWidth/2, vy + proj.y - bodyHeight, bodyWidth, bodyHeight, 10 * dScale);
    ctx.stroke();
    ctx.restore();

    // Draw Chibi Skin Head
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(vx + proj.x, vy + proj.y - bodyHeight - headRadius * 0.7, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Hair cap
    ctx.fillStyle = p.slot === 'PLAYER_1' ? '#1e3a8a' : '#881337';
    ctx.beginPath();
    ctx.arc(vx + proj.x, vy + proj.y - bodyHeight - headRadius * 0.7, headRadius * 1.02, Math.PI, 0);
    ctx.fill();

    // Arms & Rackets
    const handX = proj.x + 22 * dScale;
    const handY = proj.y - bodyHeight * 0.6;
    
    ctx.strokeStyle = '#ffdbac';
    ctx.lineWidth = 4 * dScale;
    ctx.beginPath();
    ctx.moveTo(vx + proj.x + 14 * dScale, vy + proj.y - bodyHeight * 0.8);
    ctx.lineTo(vx + handX, vy + handY);
    ctx.stroke();

    // Racket Shaft
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3 * dScale;
    const racketEndX = handX + 16 * dScale;
    const racketEndY = handY - 14 * dScale;
    ctx.beginPath();
    ctx.moveTo(vx + handX, vy + handY);
    ctx.lineTo(vx + racketEndX, vy + racketEndY);
    ctx.stroke();

    // Racket Rim
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 4 * dScale;
    ctx.beginPath();
    ctx.arc(vx + racketEndX + 10 * dScale, vy + racketEndY - 10 * dScale, 12 * dScale, 0, Math.PI * 2);
    ctx.stroke();

    // Racket strings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(vx + racketEndX + 10 * dScale, vy + racketEndY - 22 * dScale);
    ctx.lineTo(vx + racketEndX + 10 * dScale, vy + racketEndY + 2 * dScale);
    ctx.moveTo(vx + racketEndX - 2 * dScale, vy + racketEndY - 10 * dScale);
    ctx.lineTo(vx + racketEndX + 22 * dScale, vy + racketEndY - 10 * dScale);
    ctx.stroke();

    // Draw Swing Arc Trail
    if (p.swingTimer > 0) {
      const progress = 1 - (p.swingTimer / 0.25);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 6 * dScale;
      ctx.beginPath();
      ctx.arc(
        vx + handX,
        vy + handY,
        42 * dScale,
        -Math.PI / 4 + progress * Math.PI,
        -Math.PI / 4 + (progress + 0.2) * Math.PI
      );
      ctx.stroke();
    }
  });

  // ── DRAW BALL ──
  if (gameState !== STATES.CONTROLLER_LOBBY) {
    const ballProj = worldToScreen(ball.x, ball.y, ball.h, playerId, vw, vh);
    const radius = ball.radius * ballProj.scale;

    // Outer glow
    ctx.save();
    ctx.shadowColor = '#ccff00';
    ctx.shadowBlur = 12;
    
    ctx.fillStyle = '#ccff00';
    ctx.beginPath();
    ctx.arc(vx + ballProj.x, vy + ballProj.y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    // Inner details
    ctx.strokeStyle = '#85b300';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(vx + ballProj.x - radius * 0.2, vy + ballProj.y - radius * 0.2, radius * 0.8, 0, Math.PI * 0.5);
    ctx.stroke();
  }

  // ── DRAW PARTICLES ──
  particles.forEach(p => {
    const pProj = worldToScreen(p.x, p.y, 0, playerId, vw, vh);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.beginPath();
    ctx.arc(vx + pProj.x + (p.x - ball.x) * 0.1, vy + pProj.y + (p.y - ball.y) * 0.1, p.size * pProj.scale, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;

  // ── DRAW SCOREBOARD OVERLAY GRAPHICS ──
  if (gameState === STATES.CONTROLLER_LOBBY) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.font = `bold 32px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(playerId === 'PLAYER_1' ? 'PLAYER 1 VIEW' : 'PLAYER 2 VIEW', cx, cy - 20);
  }

  ctx.restore(); // restore viewport clip boundary
}

// ── PRO SCOREBOARD & HUD RENDERING UPDATES ────────────────────
function updateScoreboardHUD() {
  const matchPt = checkMatchPointAnnouncements();
  
  if (matchPt) {
    showNotification(matchPt);
  }

  if (matchFormat === 'QUICK') {
    document.getElementById('p1-points-hud').innerText = scores.PLAYER_1;
    document.getElementById('p2-points-hud').innerText = scores.PLAYER_2;
    document.getElementById('p1-games-hud').innerText = '-';
    document.getElementById('p2-games-hud').innerText = '-';
    document.getElementById('p1-s1').innerText = '-';
    document.getElementById('p2-s1').innerText = '-';
    document.getElementById('p1-s2').innerText = '-';
    document.getElementById('p2-s2').innerText = '-';
    document.getElementById('p1-s3').innerText = '-';
    document.getElementById('p2-s3').innerText = '-';
  } else {
    // Standard tennis scoreboard points translation
    document.getElementById('p1-points-hud').innerText = translatePoints(p1Points, p2Points, isTieBreak);
    document.getElementById('p2-points-hud').innerText = translatePoints(p2Points, p1Points, isTieBreak);
    
    document.getElementById('p1-games-hud').innerText = p1Games;
    document.getElementById('p2-games-hud').innerText = p2Games;

    // Sets values
    const slots = ['s1', 's2', 's3'];
    const activeSetIndex = p1Sets + p2Sets;

    for (let i = 0; i < 3; i++) {
      const p1SVal = p1SetScores[i] !== undefined ? p1SetScores[i] : (activeSetIndex === i ? p1Games : '-');
      const p2SVal = p2SetScores[i] !== undefined ? p2SetScores[i] : (activeSetIndex === i ? p2Games : '-');
      document.getElementById(`p1-${slots[i]}`).innerText = p1SVal;
      document.getElementById(`p2-${slots[i]}`).innerText = p2SVal;
    }
  }

  // Server marker
  document.getElementById('p1-serve-ind').innerText = currentServer === 'PLAYER_1' ? '●' : '';
  document.getElementById('p2-serve-ind').innerText = currentServer === 'PLAYER_2' ? '●' : '';
}

function translatePoints(myPts, oppPts, tieBreak) {
  if (tieBreak) return myPts;
  if (myPts >= 3 && oppPts >= 3) {
    if (myPts === oppPts) return '40'; // Both 40 -> Deuce
    return myPts > oppPts ? 'AD' : '40';
  }
  const dict = { 0: 'LOVE', 1: '15', 2: '30', 3: '40' };
  return dict[myPts] || '0';
}

// ── CONNECTION LOBBY & ROUTING ────────────────────────────────
function initSocketConnection() {
  socket = io();

  socket.on('connect', () => {
    console.log('Tennis PC Client connected to server.');
    socket.emit('join-room-pc');
  });

  socket.on('room-created', ({ roomCode: code, localIp: ip, port: p }) => {
    roomCode = code;
    localIp = ip;
    port = p;

    document.getElementById('lobby-room-code').innerText = code;

    let baseUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '') {
      baseUrl = `http://${localIp}:${port}/tennis/controller.html?room=${code}`;
    } else {
      baseUrl = `${window.location.origin}/tennis/controller.html?room=${code}`;
    }

    const p1Url = `${baseUrl}&slot=PLAYER_1`;
    const p2Url = `${baseUrl}&slot=PLAYER_2`;

    const p1QrImg = document.getElementById('p1-qr-image');
    const p1Spinner = document.getElementById('p1-qr-spinner');
    p1QrImg.src = `/qrcode?text=${encodeURIComponent(p1Url)}`;
    p1QrImg.onload = () => {
      p1Spinner.style.display = 'none';
      p1QrImg.style.display = 'block';
    };

    const p2QrImg = document.getElementById('p2-qr-image');
    const p2Spinner = document.getElementById('p2-qr-spinner');
    p2QrImg.src = `/qrcode?text=${encodeURIComponent(p2Url)}`;
    p2QrImg.onload = () => {
      p2Spinner.style.display = 'none';
      p2QrImg.style.display = 'block';
    };

    console.log(`Tennis session pairing initialized. Room: ${code}`);
  });

  socket.on('phone-connected', ({ phoneSlot }) => {
    const slotKey = phoneSlot === 1 ? 'PLAYER_1' : 'PLAYER_2';
    
    if (controllerSlots[slotKey]) {
      controllerSlots[slotKey].connected = true;
      controllerSlots[slotKey].ready = false;

      const panel = document.getElementById(phoneSlot === 1 ? 'lobby-p1' : 'lobby-p2');
      const statusLabel = document.getElementById(phoneSlot === 1 ? 'p1-connect-status' : 'p2-connect-status');
      
      if (panel) panel.classList.add('connected');
      if (statusLabel) {
        statusLabel.innerText = 'PAIRED & READY';
      }

      triggerHapticFeedback(phoneSlot, [50, 30, 50]);

      if (controllerSlots.PLAYER_1.connected && controllerSlots.PLAYER_2.connected) {
        setTimeout(() => {
          transitionToMatchSetup();
        }, 1200);
      }
    }
  });

  socket.on('phone-disconnected', ({ phoneSlot }) => {
    const slotKey = phoneSlot === 1 ? 'PLAYER_1' : 'PLAYER_2';
    if (controllerSlots[slotKey]) {
      controllerSlots[slotKey].connected = false;
      controllerSlots[slotKey].ready = false;

      const panel = document.getElementById(phoneSlot === 1 ? 'lobby-p1' : 'lobby-p2');
      const statusLabel = document.getElementById(phoneSlot === 1 ? 'p1-connect-status' : 'p2-connect-status');
      
      if (panel) panel.classList.remove('connected');
      if (statusLabel) {
        statusLabel.innerText = 'WAITING FOR CONTROLLER...';
      }

      if (gameState !== STATES.CONTROLLER_LOBBY && gameState !== STATES.MATCH_END) {
        triggerDisconnectPause(slotKey);
      }
    }
  });

  socket.on('controller-input', (data) => {
    const slot = data.slot;
    if (!slot || !playerInputs[slot]) return;

    if (data.type === 'joystick') {
      playerInputs[slot].moveX = data.x;
      playerInputs[slot].moveY = data.y;
    } else if (data.type === 'btnDown') {
      if (data.btn === 'HIT') {
        playerInputs[slot].hit = true;
        handleButtonPress(slot, 'HIT');
      } else if (data.btn === 'LOB') {
        playerInputs[slot].lob = true;
        handleButtonPress(slot, 'LOB');
      } else if (data.btn === 'POWER') {
        playerInputs[slot].power = true;
        handleButtonPress(slot, 'POWER');
      } else if (data.btn === 'DIVE') {
        playerInputs[slot].dive = true;
        handleButtonPress(slot, 'DIVE');
      }
    } else if (data.type === 'btnUp') {
      if (data.btn === 'HIT') playerInputs[slot].hit = false;
      if (data.btn === 'LOB') playerInputs[slot].lob = false;
      if (data.btn === 'POWER') playerInputs[slot].power = false;
      if (data.btn === 'DIVE') playerInputs[slot].dive = false;
    }
  });
}

function triggerHapticFeedback(slotNum, pattern) {
  if (socket && socket.connected) {
    socket.emit('trigger-vibration', { slot: slotNum === 1 ? 'PLAYER_1' : 'PLAYER_2', pattern });
  }
}

// ── CONTROL ACTIONS & SCREEN CLICKS ────────────────────────────
function handleButtonPress(slot, btn) {
  if (gameState === STATES.MATCH_SETUP) {
    if (btn === 'HIT') {
      controllerSlots[slot].ready = !controllerSlots[slot].ready;
      
      const badge = document.getElementById(slot === 'PLAYER_1' ? 'p1-ready-badge' : 'p2-ready-badge');
      if (badge) {
        badge.innerText = `${slot === 'PLAYER_1' ? 'PLAYER 1' : 'PLAYER 2'}: ${controllerSlots[slot].ready ? 'READY!' : 'WAITING'}`;
        badge.className = `ready-indicator ${slot === 'PLAYER_1' ? 'p1-ready-indicator' : 'p2-ready-indicator'} ${controllerSlots[slot].ready ? 'ready' : ''}`;
      }

      if (controllerSlots.PLAYER_1.ready && controllerSlots.PLAYER_2.ready) {
        startCountdownSequence();
      }
    }
  } else if (gameState === STATES.SERVE_PREPARE && currentServer === slot) {
    if (btn === 'HIT') {
      if (serveStage === 0) {
        // Toss the ball
        const endSign = activeEndsSwapped ? -1 : 1;
        const isServerP1 = currentServer === 'PLAYER_1';
        const server = players[currentServer];
        
        // Place ball in server's toss hand based on their ACTUAL current position
        ball.x = server.x + (isServerP1 ? (activeEndsSwapped ? -35 : 35) : (activeEndsSwapped ? 35 : -35));
        ball.y = server.y + (isServerP1 ? (activeEndsSwapped ? 35 : -35) : (activeEndsSwapped ? -35 : 35));
        ball.h = 60;
        
        ball.vx = 0;
        ball.vy = 0;
        ball.vh = 380; // toss upward velocity
        ball.inPlay = true;
        serveStage = 1;
        
        sounds.bounce();
      } else if (serveStage === 1) {
        players[slot].swing('HIT');
      }
    }
  } else if (gameState === STATES.RALLY || (gameState === STATES.SERVE_TOSS && slot !== currentServer)) {
    if (btn === 'HIT') {
      players[slot].swing('HIT');
    } else if (btn === 'LOB') {
      players[slot].swing('LOB');
    } else if (btn === 'POWER') {
      players[slot].swing('POWER');
    } else if (btn === 'DIVE') {
      const input = playerInputs[slot];
      if (Math.abs(input.moveX) > 0.1 || Math.abs(input.moveY) > 0.1) {
        players[slot].dive(
          slot === 'PLAYER_1' ? input.moveX : -input.moveX,
          slot === 'PLAYER_1' ? input.moveY : -input.moveY
        );
      }
    }
  } else if (gameState === STATES.MATCH_END) {
    if (btn === 'HIT') {
      controllerSlots[slot].ready = !controllerSlots[slot].ready;
      
      const p1R = controllerSlots.PLAYER_1.ready ? 1 : 0;
      const p2R = controllerSlots.PLAYER_2.ready ? 1 : 0;
      document.getElementById('btn-rematch').innerText = `REMATCH (${p1R + p2R}/2 READY)`;

      if (controllerSlots.PLAYER_1.ready && controllerSlots.PLAYER_2.ready) {
        resetMatchToSetup();
      }
    }
  }
}

// Bind clicks on match setup formats
document.querySelectorAll('.format-options .option-card').forEach(card => {
  card.onclick = () => {
    if (gameState !== STATES.MATCH_SETUP) return;
    
    // Clear active format formats
    document.querySelectorAll('.format-options .option-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    const fmt = card.getAttribute('data-format');
    matchFormat = fmt;

    const targetSec = document.getElementById('quick-target-section');
    if (fmt === 'QUICK') {
      targetSec.classList.remove('hidden');
    } else {
      targetSec.classList.add('hidden');
    }
  };
});

document.querySelectorAll('.target-options .option-card').forEach(card => {
  card.onclick = () => {
    if (gameState !== STATES.MATCH_SETUP) return;
    updateTargetPoints(parseInt(card.getAttribute('data-points')));
  };
});

function transitionToMatchSetup() {
  gameState = STATES.MATCH_SETUP;
  
  document.getElementById('lobby-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.remove('hidden');

  triggerControllerVibration('PLAYER_1', 120);
  triggerControllerVibration('PLAYER_2', 120);
}

function updateTargetPoints(pts) {
  targetScore = pts;
  document.querySelectorAll('.target-options .option-card').forEach(card => {
    if (parseInt(card.getAttribute('data-points')) === pts) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

function startCountdownSequence() {
  gameState = STATES.COUNTDOWN;
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('countdown-overlay').classList.remove('hidden');

  countdownVal = 3;
  document.getElementById('countdown-number').innerText = countdownVal;
  sounds.countdown();

  countdownInterval = setInterval(() => {
    countdownVal--;
    if (countdownVal > 0) {
      document.getElementById('countdown-number').innerText = countdownVal;
      sounds.countdown();
    } else if (countdownVal === 0) {
      document.getElementById('countdown-number').innerText = 'PLAY!';
      sounds.countdownGo();
    } else {
      clearInterval(countdownInterval);
      document.getElementById('countdown-overlay').classList.add('hidden');
      document.getElementById('hud-overlay').classList.remove('hidden');
      
      // Select first server randomly via Coin Toss
      currentServer = Math.random() < 0.5 ? 'PLAYER_1' : 'PLAYER_2';
      serveNumber = 1;
      serveCourt = 'RIGHT';
      p1Points = 0;
      p2Points = 0;
      p1Games = 0;
      p2Games = 0;
      p1Sets = 0;
      p2Sets = 0;
      p1SetScores = [];
      p2SetScores = [];
      isTieBreak = false;
      activeEndsSwapped = false;
      scores = { PLAYER_1: 0, PLAYER_2: 0 };

      showNotification(`COIN TOSS: ${currentServer === 'PLAYER_1' ? 'PLAYER 1' : 'PLAYER 2'} SERVES FIRST`);
      
      setTimeout(() => {
        startNewPoint();
      }, 2500);
    }
  }, 1000);
}

function startNewPoint() {
  gameState = STATES.SERVE_PREPARE;
  serveStage = 0;
  rallyActive = false;

  ball.reset();
  
  // Set players at their baseline ends based on swapped state
  const isP1Near = !activeEndsSwapped;
  
  players.PLAYER_1.x = 0;
  players.PLAYER_1.y = isP1Near ? 420 : -420;
  players.PLAYER_1.diveTimer = 0;
  players.PLAYER_1.swingTimer = 0;

  players.PLAYER_2.x = 0;
  players.PLAYER_2.y = isP1Near ? -420 : 420;
  players.PLAYER_2.diveTimer = 0;
  players.PLAYER_2.swingTimer = 0;

  // Position ball in server's hand conceptually
  const isServerP1 = currentServer === 'PLAYER_1';
  let serverX, serverY;
  if (isServerP1) {
    serverY = activeEndsSwapped ? -460 : 460;
    serverX = serveCourt === 'RIGHT' ? (activeEndsSwapped ? -120 : 120) : (activeEndsSwapped ? 120 : -120);
  } else {
    serverY = activeEndsSwapped ? 460 : -460;
    serverX = serveCourt === 'RIGHT' ? (activeEndsSwapped ? 120 : -120) : (activeEndsSwapped ? -120 : 120);
  }

  // Set server player coordinates
  players[currentServer].x = serverX;
  players[currentServer].y = serverY;

  // Ball offset in hand
  ball.x = serverX + (isServerP1 ? (activeEndsSwapped ? -35 : 35) : (activeEndsSwapped ? 35 : -35));
  ball.y = serverY + (isServerP1 ? (activeEndsSwapped ? 35 : -35) : (activeEndsSwapped ? -35 : 35));
  ball.h = 60;

  updateScoreboardHUD();
}

function triggerMatchWin(winner) {
  gameState = STATES.MATCH_END;
  sounds.win();

  document.getElementById('hud-overlay').classList.add('hidden');
  document.getElementById('game-over-screen').classList.remove('hidden');

  document.getElementById('winner-announcement-text').innerText = `${winner === 'PLAYER_1' ? 'PLAYER 1' : 'PLAYER 2'} WINS!`;
  
  if (matchFormat === 'QUICK') {
    document.getElementById('final-score-text').innerText = `Final Score: ${scores.PLAYER_1} - ${scores.PLAYER_2}`;
  } else {
    // Show sets history
    let scoreStr = '';
    for (let i = 0; i < p1SetScores.length; i++) {
      scoreStr += `${p1SetScores[i]}-${p2SetScores[i]}`;
      if (i < p1SetScores.length - 1) scoreStr += ', ';
    }
    document.getElementById('final-score-text').innerText = `Set Score: ${p1Sets}-${p2Sets} (${scoreStr})`;
  }

  controllerSlots.PLAYER_1.ready = false;
  controllerSlots.PLAYER_2.ready = false;
  document.getElementById('btn-rematch').innerText = 'REMATCH (0/2 READY)';
}

function resetMatchToSetup() {
  document.getElementById('game-over-screen').classList.add('hidden');
  
  controllerSlots.PLAYER_1.ready = false;
  controllerSlots.PLAYER_2.ready = window.isVSModeAI ? true : false;
  
  const badge1 = document.getElementById('p1-ready-badge');
  const badge2 = document.getElementById('p2-ready-badge');
  if (badge1) {
    if (window.isVSModeAI) {
      badge1.innerText = 'P1: PRESS SPACE/J TO READY';
    } else {
      badge1.innerText = 'PLAYER 1: WAITING';
    }
    badge1.className = 'ready-indicator p1-ready-indicator';
  }
  if (badge2) {
    if (window.isVSModeAI) {
      badge2.innerText = 'PLAYER 2 (AI): READY';
      badge2.className = 'ready-indicator p2-ready-indicator ready';
    } else {
      badge2.innerText = 'PLAYER 2: WAITING';
      badge2.className = 'ready-indicator p2-ready-indicator';
    }
  }

  transitionToMatchSetup();
}

function triggerDisconnectPause(disconnectedSlot) {
  if (gameState === STATES.PAUSED_DISCONNECT) return;
  
  const prevState = gameState;
  gameState = STATES.PAUSED_DISCONNECT;

  document.getElementById('pause-overlay').classList.remove('hidden');
  document.getElementById('pause-title').innerText = `${disconnectedSlot === 'PLAYER_1' ? 'PLAYER 1' : 'PLAYER 2'} DISCONNECTED`;

  pauseTimeRemaining = 30;
  document.getElementById('reconnect-timer-val').innerText = `${pauseTimeRemaining}s`;

  if (pauseTimeout) clearInterval(pauseTimeout);

  pauseTimeout = setInterval(() => {
    pauseTimeRemaining--;
    document.getElementById('reconnect-timer-val').innerText = `${pauseTimeRemaining}s`;

    if (pauseTimeRemaining <= 0) {
      clearInterval(pauseTimeout);
      window.location.reload();
    }
  }, 1000);

  const checkRecon = setInterval(() => {
    if (controllerSlots[disconnectedSlot].connected) {
      clearInterval(checkRecon);
      clearInterval(pauseTimeout);
      document.getElementById('pause-overlay').classList.add('hidden');
      
      gameState = prevState;
      showNotification('RESUMED!');
    }
  }, 500);
}

// ── MAIN ANIMATION FRAME LOOP ──────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(0.033, clock.getDelta()); 

  if (gameState !== STATES.CONTROLLER_LOBBY && gameState !== STATES.PAUSED_DISCONNECT && !isRulesPaused) {
    // Pin ball to server's hand before toss
    if (gameState === STATES.SERVE_PREPARE && serveStage === 0) {
      const isServerP1 = currentServer === 'PLAYER_1';
      const server = players[currentServer];
      
      let ballHandDx, ballHandDy;
      if (isServerP1) {
        ballHandDx = activeEndsSwapped ? -35 : 35;
        ballHandDy = activeEndsSwapped ? 35 : -35;
      } else {
        ballHandDx = activeEndsSwapped ? 35 : -35;
        ballHandDy = activeEndsSwapped ? -35 : 35;
      }

      ball.x = server.x + ballHandDx;
      ball.y = server.y + ballHandDy;
      ball.h = 60;
      ball.vx = 0;
      ball.vy = 0;
      ball.vh = 0;
    } else {
      // Update ball physics
      ball.update(dt);
    }

    // Keyboard movement input for PLAYER_1 (if phone controller is not active/connected or playing solo)
    if (!controllerSlots.PLAYER_1.connected || window.isVSModeAI) {
      let moveX = 0;
      let moveY = 0;
      if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) moveX = -1;
      if (keysPressed['KeyD'] || keysPressed['ArrowRight']) moveX = 1;
      if (keysPressed['KeyW'] || keysPressed['ArrowUp']) moveY = -1;
      if (keysPressed['KeyS'] || keysPressed['ArrowDown']) moveY = 1;
      playerInputs.PLAYER_1.moveX = moveX;
      playerInputs.PLAYER_1.moveY = moveY;
    }

    // CPU AI behavior for Player 2
    if (window.isVSModeAI) {
      const aiInput = playerInputs.PLAYER_2;
      aiInput.moveX = 0;
      aiInput.moveY = 0;
      aiInput.hit = false;
      aiInput.lob = false;
      aiInput.power = false;

      const ballPos = ball;
      const aiPlayer = players.PLAYER_2;
      
      const p2DirY = activeEndsSwapped ? 1 : -1;
      
      let targetX = ballPos.x;
      let targetY = ballPos.y + p2DirY * 45;

      targetX = clamp(targetX, -280, 280);
      if (activeEndsSwapped) {
        targetY = clamp(targetY, 45, 520);
      } else {
        targetY = clamp(targetY, -520, -45);
      }

      if (!ballPos.inPlay) {
        targetX = 0;
        targetY = activeEndsSwapped ? 420 : -420;
      }

      const dx = targetX - aiPlayer.x;
      const dy = targetY - aiPlayer.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 12) {
        aiInput.moveX = Math.sign(dx) * 0.95;
        aiInput.moveY = Math.sign(dy) * 0.95;
      }

      const distToBall = Math.hypot(ballPos.x - aiPlayer.x, ballPos.y - aiPlayer.y);
      if (distToBall < 68 && ballPos.inPlay && ballPos.h < 120) {
        const ballMovingToAI = (p2DirY > 0 && ballPos.vy > 0) || (p2DirY < 0 && ballPos.vy < 0);
        if (ballMovingToAI || gameState === STATES.SERVE_PREPARE || gameState === STATES.SERVE_TOSS) {
          if (gameState === STATES.SERVE_PREPARE && currentServer === 'PLAYER_2') {
            if (serveStage === 0) {
              handleButtonPress('PLAYER_2', 'HIT');
            } else if (serveStage === 1) {
              handleButtonPress('PLAYER_2', 'HIT');
            }
          } else {
            if (ballPos.h > 45 && Math.random() < 0.8) {
              handleButtonPress('PLAYER_2', 'POWER');
            } else if (distToBall > 48 && Math.random() < 0.6) {
              handleButtonPress('PLAYER_2', 'LOB');
            } else {
              handleButtonPress('PLAYER_2', 'HIT');
            }
          }
        }
      }
    }

    // Update players
    players.PLAYER_1.update(dt, playerInputs.PLAYER_1);
    players.PLAYER_2.update(dt, playerInputs.PLAYER_2);
    
    // Update active particles
    updateParticles(dt);
  }

  // ── Split screen 2D Render ──
  const canvas = document.getElementById('tennis-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const w = window.innerWidth;
  const h = window.innerHeight;

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  // Clear background
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, w, h);

  // 1. Render Left side: Player 1 Viewport
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w / 2, h);
  ctx.clip();
  drawStadiumEnvironment(ctx, 'PLAYER_1', 0, 0, w / 2, h);
  renderViewport('PLAYER_1', 0, 0, w / 2, h);
  ctx.restore();

  // 2. Render Right side: Player 2 Viewport
  ctx.save();
  ctx.beginPath();
  ctx.rect(w / 2, 0, w / 2, h);
  ctx.clip();
  drawStadiumEnvironment(ctx, 'PLAYER_2', w / 2, 0, w / 2, h);
  renderViewport('PLAYER_2', w / 2, 0, w / 2, h);
  ctx.restore();

  // Draw Center divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
}

// Keyboard input state map for P1 local play
const keysPressed = {};

window.addEventListener('keydown', (e) => {
  keysPressed[e.code] = true;
  
  if (e.key === 'Escape') {
    togglePauseRulesModal();
  }

  // Keybind action triggers for PLAYER_1 (MID, LONG, SMASH, DIVE, and MATCH_SETUP Ready toggle)
  const isP1Active = !controllerSlots.PLAYER_1.connected || window.isVSModeAI;
  if (isP1Active) {
    if (gameState === STATES.MATCH_SETUP) {
      if (e.code === 'Space' || e.code === 'KeyJ') {
        handleButtonPress('PLAYER_1', 'HIT');
      }
    } else if (gameState === STATES.SERVE_PREPARE && currentServer === 'PLAYER_1') {
      if (e.code === 'Space' || e.code === 'KeyJ') {
        handleButtonPress('PLAYER_1', 'HIT');
      }
    } else if (gameState === STATES.SERVE_TOSS && currentServer === 'PLAYER_1') {
      if (e.code === 'Space' || e.code === 'KeyJ') {
        handleButtonPress('PLAYER_1', 'HIT');
      }
    } else if (gameState === STATES.RALLY || (gameState === STATES.SERVE_TOSS && currentServer === 'PLAYER_2')) {
      if (e.code === 'Space' || e.code === 'KeyJ') {
        handleButtonPress('PLAYER_1', 'HIT');
      } else if (e.code === 'KeyK') {
        handleButtonPress('PLAYER_1', 'LOB');
      } else if (e.code === 'KeyL') {
        handleButtonPress('PLAYER_1', 'POWER');
      } else if (e.code === 'KeyI') {
        // Dive
        const input = playerInputs.PLAYER_1;
        if (Math.abs(input.moveX) > 0.1 || Math.abs(input.moveY) > 0.1) {
          players.PLAYER_1.dive(input.moveX, input.moveY);
        }
      }
    } else if (gameState === STATES.MATCH_END) {
      if (e.code === 'Space' || e.code === 'KeyJ') {
        handleButtonPress('PLAYER_1', 'HIT');
      }
    }
  }
});

window.addEventListener('keyup', (e) => {
  keysPressed[e.code] = false;
});

function start() {
  initSocketConnection();
  animate();

  // Bind mouse-click handlers on PC screen Game Over overlays
  const rematchBtn = document.getElementById('btn-rematch');
  if (rematchBtn) {
    rematchBtn.onclick = () => {
      if (window.isVSModeAI) {
        controllerSlots.PLAYER_1.ready = !controllerSlots.PLAYER_1.ready;
        controllerSlots.PLAYER_2.ready = true;
        const p1R = controllerSlots.PLAYER_1.ready ? 1 : 0;
        rematchBtn.innerText = `REMATCH (${p1R + 1}/2 READY)`;
        if (controllerSlots.PLAYER_1.ready) {
          resetMatchToSetup();
        }
      } else {
        // Toggle player 1 ready. Player 2 can click using phone or we toggle both if offline
        controllerSlots.PLAYER_1.ready = !controllerSlots.PLAYER_1.ready;
        const p1R = controllerSlots.PLAYER_1.ready ? 1 : 0;
        const p2R = controllerSlots.PLAYER_2.ready ? 1 : 0;
        rematchBtn.innerText = `REMATCH (${p1R + p2R}/2 READY)`;
        if (controllerSlots.PLAYER_1.ready && controllerSlots.PLAYER_2.ready) {
          resetMatchToSetup();
        }
      }
    };
  }

  const exitBtn = document.getElementById('btn-exit');
  if (exitBtn) {
    exitBtn.onclick = () => {
      document.getElementById('game-over-screen').classList.add('hidden');
      document.getElementById('setup-screen').classList.add('hidden');
      document.getElementById('lobby-screen').classList.add('hidden');
      document.getElementById('hud-overlay').classList.add('hidden');
      document.getElementById('tennis-home-screen').classList.remove('hidden');
      window.isVSModeAI = false;
    };
  }

  // 1. Simulate real-time console loading bar animation (2 seconds)
  const loadBar = document.getElementById('tennis-load-bar');
  let progress = 0;
  const loadInterval = setInterval(() => {
    progress += Math.random() * 9 + 4;
    if (progress >= 100) {
      progress = 100;
      clearInterval(loadInterval);
      setTimeout(() => {
        const loadScreen = document.getElementById('tennis-loading-screen');
        const homeScreen = document.getElementById('tennis-home-screen');
        if (loadScreen) loadScreen.classList.add('hidden');
        if (homeScreen) homeScreen.classList.remove('hidden');
      }, 350);
    }
    if (loadBar) loadBar.style.width = `${progress}%`;
  }, 90);
}

window.onload = start;

// ── LANDING SCREEN NAVIGATION HANDLERS ─────────────────────────
window.isVSModeAI = false;

window.startTennisVSModeAI = () => {
  window.isVSModeAI = true;
  controllerSlots.PLAYER_2.connected = true;
  controllerSlots.PLAYER_2.ready = true;
  controllerSlots.PLAYER_1.connected = true; // allow P1 keyboard play

  document.getElementById('tennis-home-screen').classList.add('hidden');
  transitionToMatchSetup();

  const badge1 = document.getElementById('p1-ready-badge');
  const badge2 = document.getElementById('p2-ready-badge');
  if (badge1) {
    badge1.innerText = 'P1: PRESS SPACE/J TO READY';
    badge1.className = 'ready-indicator p1-ready-indicator';
  }
  if (badge2) {
    badge2.innerText = 'PLAYER 2 (AI): READY';
    badge2.className = 'ready-indicator p2-ready-indicator ready';
  }
};

window.openTennisLocalLobby = () => {
  window.isVSModeAI = false;
  controllerSlots.PLAYER_1.connected = false;
  controllerSlots.PLAYER_1.ready = false;
  controllerSlots.PLAYER_2.connected = false;
  controllerSlots.PLAYER_2.ready = false;

  const badge1 = document.getElementById('p1-ready-badge');
  const badge2 = document.getElementById('p2-ready-badge');
  if (badge1) {
    badge1.innerText = 'PLAYER 1: WAITING';
    badge1.className = 'ready-indicator p1-ready-indicator';
  }
  if (badge2) {
    badge2.innerText = 'PLAYER 2: WAITING';
    badge2.className = 'ready-indicator p2-ready-indicator';
  }

  document.getElementById('tennis-home-screen').classList.add('hidden');
  document.getElementById('lobby-screen').classList.remove('hidden');
};

window.openTennisOnlinePvP = () => {
  const fab = document.getElementById('ps-mp-fab');
  const panel = document.getElementById('ps-mp-panel');
  if (fab && panel) {
    if (!panel.classList.contains('open')) {
      fab.click();
    }
    const mmTab = panel.querySelector('[data-tab="mm"]');
    if (mmTab) mmTab.click();
  }
};

window.openTennisHowToPlay = () => {
  const howTo = document.getElementById('tennis-howtoplay-screen');
  if (howTo) howTo.classList.remove('hidden');
};

window.closeTennisHowToPlay = () => {
  const howTo = document.getElementById('tennis-howtoplay-screen');
  if (howTo) howTo.classList.add('hidden');
};

window.exitLobbyToHome = () => {
  document.getElementById('lobby-screen').classList.add('hidden');
  document.getElementById('tennis-home-screen').classList.remove('hidden');
};

window.exitSetupToHome = () => {
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('tennis-home-screen').classList.remove('hidden');
  window.isVSModeAI = false;
};

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

function triggerControllerVibration(slot, duration) {
  if (socket && socket.connected) {
    socket.emit('trigger-vibration', { slot, pattern: duration });
  }
}

function togglePauseRulesModal() {
  if (gameState === STATES.CONTROLLER_LOBBY) return;
  
  isRulesPaused = !isRulesPaused;
  const overlay = document.getElementById('rules-overlay');
  if (overlay) {
    if (isRulesPaused) {
      overlay.classList.remove('hidden');
      triggerControllerVibration('PLAYER_1', 60);
      triggerControllerVibration('PLAYER_2', 60);
    } else {
      overlay.classList.add('hidden');
    }
  }
}

document.getElementById('btn-resume-rules').onclick = () => {
  togglePauseRulesModal();
};
