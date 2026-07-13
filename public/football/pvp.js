/**
 * Football Legends 2026 - Client-Side Authoritative PvP Synchronization Module
 */

import { gameState, TEAMS, TEAM_DATA, PITCH_LENGTH, PITCH_WIDTH, FORMATIONS, CLUBS_DATABASE } from './state.js';
import { PlayerAgent } from './player.js';
import { AudioSynth } from './audio.js';
import { SocketController } from './network.js';
import { spawnKickFlash, spawnConfetti } from './stadium.js'; // Helper effects

let pvpRoom = null;
let mySlotId = null; // 1 = Home (Red), 2 = Away (Blue)
let inputTick = 0;
let lastServerTick = 0;

// Replay buffer (not used in real-time PVP)
gameState.replayBuffer = [];

// Interpolation targets map
const targetStates = {
  ball: { pos: new THREE.Vector3(), vel: new THREE.Vector3() },
  players: {} // id -> { pos, rotY, animTime, action, isControlled }
};

// Client-side prediction offset tracking
let localPlayerPosOffset = new THREE.Vector3();

export function launchMatchInPvPMode(roomCode, mySlot, teamHomeName, teamAwayName) {
  console.log(`Launching PvP Match. Room: ${roomCode}, My Slot: ${mySlot}, Teams: ${teamHomeName} vs ${teamAwayName}`);
  
  pvpRoom = roomCode;
  mySlotId = mySlot;
  gameState.isPvPMode = true;
  gameState.gameActive = false;
  gameState.isGoalScoringPause = false;
  
  // Clear any existing menu screens
  const overlays = [
    'main-menu-screen',
    'match-preview-screen',
    'menu-matchup-view',
    'menu-dashboard-view',
    'team-management-screen',
    'subscreen-view'
  ];
  overlays.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const gameplayOverlays = ['setpiece-hud', 'card-popup', 'pause-screen', 'match-over-screen', 'goal-overlay'];
  gameplayOverlays.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === 'goal-overlay') el.classList.remove('active');
      else el.style.display = 'none';
    }
  });

  // Ensure full screen
  if (typeof window.enterFullscreen === 'function') window.enterFullscreen();

  // Find club details from DB
  let hClub = null, aClub = null;
  Object.keys(CLUBS_DATABASE).forEach(country => {
    CLUBS_DATABASE[country].forEach(club => {
      if (club.name === teamHomeName) hClub = club;
      if (club.name === teamAwayName) aClub = club;
    });
  });

  if (!hClub) hClub = CLUBS_DATABASE["Spain"][0];
  if (!aClub) aClub = CLUBS_DATABASE["Spain"][1];

  // Map to TEAM_DATA for jersey shaders/colors
  TEAM_DATA[hClub.name] = {
    name: hClub.name,
    colorHex: hClub.colorHex,
    color: parseInt(hClub.colorHex.replace("#", "0x")),
    secondary: hClub.secondary,
    cssClass: "custom-home-color"
  };
  TEAM_DATA[aClub.name] = {
    name: aClub.name,
    colorHex: aClub.colorHex,
    color: parseInt(aClub.colorHex.replace("#", "0x")),
    secondary: aClub.secondary,
    cssClass: "custom-away-color"
  };

  gameState.userTeamName = hClub.name;
  gameState.oppTeamName = aClub.name;

  // Clear existing players
  gameState.players.forEach(p => gameState.scene.remove(p.group));
  gameState.players.length = 0;

  // Spawn all 22 player agents locally for rendering
  const homeSlots = FORMATIONS["4-3-3"];
  hClub.players.filter(p => p.role !== 'GK').forEach((player, index) => {
    const slot = homeSlots[index] || { role: "ST", pos: { x: -2, z: 0 } };
    const pl = new PlayerAgent(TEAMS.RED, player.number, new THREE.Vector3(slot.pos.x, 0, slot.pos.z));
    pl.id = index; // Fixed ID matching server
    pl.name = player.name;
    pl.role = slot.role;
    gameState.players.push(pl);
  });

  // Home Goalkeeper (ID 10)
  const gkHome = hClub.players.find(p => p.role === 'GK') || { name: "GK", number: 1 };
  gameState.userGoalKeeper = new PlayerAgent(TEAMS.RED, gkHome.number, new THREE.Vector3(-PITCH_LENGTH/2 + 2.5, 0, 0), true);
  gameState.userGoalKeeper.id = 10;
  gameState.userGoalKeeper.name = gkHome.name;
  gameState.userGoalKeeper.role = "GK";
  gameState.players.push(gameState.userGoalKeeper);

  // Spawn Away Outfielders (IDs 11 - 20)
  const awaySlots = FORMATIONS["4-3-3"];
  aClub.players.filter(p => p.role !== 'GK').forEach((player, index) => {
    const slot = awaySlots[index] || { role: "ST", pos: { x: 2, z: 0 } };
    const pl = new PlayerAgent(TEAMS.BLUE, player.number, new THREE.Vector3(-slot.pos.x, 0, -slot.pos.z));
    pl.id = index + 11; // Fixed ID matching server
    pl.name = player.name;
    pl.role = slot.role;
    gameState.players.push(pl);
  });

  // Away Goalkeeper (ID 21)
  const gkAway = aClub.players.find(p => p.role === 'GK') || { name: "GK", number: 1 };
  gameState.opponentGoalKeeper = new PlayerAgent(TEAMS.BLUE, gkAway.number, new THREE.Vector3(PITCH_LENGTH/2 - 2.5, 0, 0), true);
  gameState.opponentGoalKeeper.id = 21;
  gameState.opponentGoalKeeper.name = gkAway.name;
  gameState.opponentGoalKeeper.role = "GK";
  gameState.players.push(gameState.opponentGoalKeeper);

  // Set default controller assignments
  gameState.userControlledPlayer = gameState.players[9]; // Striker
  
  // Set initial HUD text
  document.getElementById('score-home').innerText = '0';
  document.getElementById('score-away').innerText = '0';
  document.getElementById('hud-time').innerText = '00:00';
  document.getElementById('game-hud').style.display = 'flex';

  // Play whistle & kick to warm up
  AudioSynth.playWhistle();

  setupPvPNetworkListeners();

  // Reset ball position
  if (gameState.ballMesh) {
    gameState.ballMesh.position.set(0, gameState.ballRadius, 0);
    gameState.ballMesh.visible = true;
  }
}

function setupPvPNetworkListeners() {
  const socket = SocketController.socket;
  if (!socket) return;

  socket.off('pvp-countdown-finished');
  socket.off('pvp-state');
  socket.off('pvp-event');
  socket.off('pvp-halftime');
  socket.off('pvp-secondhalf-started');
  socket.off('pvp-fulltime');

  socket.on('pvp-countdown-finished', () => {
    gameState.gameActive = true;
    AudioSynth.playWhistle();
  });

  socket.on('pvp-state', (data) => {
    lastServerTick = data.tick;

    // 1. Sync Ball Position
    targetStates.ball.pos.set(data.ball.x, data.ball.y, data.ball.z);
    targetStates.ball.vel.set(data.ball.vx, data.ball.vy, data.ball.vz);

    // 2. Sync Players positions & actions
    data.players.forEach(pData => {
      const pl = gameState.players.find(p => p.id === pData.id);
      if (pl) {
        if (!targetStates.players[pData.id]) {
          targetStates.players[pData.id] = { pos: new THREE.Vector3(), rotY: 0, stamina: 100, action: null };
        }
        
        const tState = targetStates.players[pData.id];
        tState.pos.set(pData.x, pData.y, pData.z);
        tState.rotY = pData.rotY;
        tState.stamina = pData.stamina;
        tState.action = pData.action;
        tState.isControlled = pData.isControlled;

        // Visual triggers for one-time actions
        if (pData.action) {
          if (pData.action === 'pass') {
            AudioSynth.playKick();
            spawnKickFlash(pl.group.position);
          } else if (pData.action === 'shoot') {
            AudioSynth.playKick();
            spawnKickFlash(pl.group.position);
          } else if (pData.action === 'tackle') {
            pl.triggerTackle();
          }
        }
      }
    });

    // 3. Highlight user controlled player indicator
    const myTeamControlledId = mySlotId === 1 ? data.controlledIds.home : data.controlledIds.away;
    const currentControlled = gameState.players.find(p => p.id === myTeamControlledId);
    if (currentControlled && currentControlled !== gameState.userControlledPlayer) {
      gameState.userControlledPlayer = currentControlled;
      AudioSynth.playClick();
    }

    // 4. Sync Scoreboard and Match Clock
    document.getElementById('score-home').innerText = data.scores.home;
    document.getElementById('score-away').innerText = data.scores.away;
    
    const minutes = Math.floor(data.matchTime / 60).toString().padStart(2, '0');
    const seconds = (data.matchTime % 60).toString().padStart(2, '0');
    document.getElementById('hud-time').innerText = `${minutes}:${seconds}`;

    // Update stamina HUD bar
    if (gameState.userControlledPlayer) {
      const fill = document.getElementById('hud-stamina-fill');
      const staminaPct = Math.round(gameState.userControlledPlayer.stamina);
      if (fill) {
        fill.style.width = `${staminaPct}%`;
        fill.style.backgroundColor = staminaPct > 55 ? '#22c55e' : staminaPct > 22 ? '#eab308' : '#ef4444';
      }
    }
  });

  socket.on('pvp-event', (evt) => {
    if (evt.type === 'goal') {
      gameState.isGoalScoringPause = true;
      AudioSynth.playWhistle();
      AudioSynth.playCheer();
      spawnConfetti();

      // Show goal scorer banner
      const overlay = document.getElementById('goal-overlay');
      const sub = document.getElementById('goal-scorer-sub');
      if (overlay && sub) {
        sub.innerText = evt.team === 'home' ? `${gameState.userTeamName} GOAL!` : `${gameState.oppTeamName} GOAL!`;
        overlay.classList.add('active');
        setTimeout(() => {
          overlay.classList.remove('active');
          gameState.isGoalScoringPause = false;
        }, 3000);
      }
    }
  });

  socket.on('pvp-halftime', () => {
    gameState.gameActive = false;
    AudioSynth.playWhistle();
    alert("HALF TIME! Teams are changing sides shortly.");
  });

  socket.on('pvp-secondhalf-started', () => {
    gameState.gameActive = true;
    AudioSynth.playWhistle();
  });

  socket.on('pvp-fulltime', (data) => {
    gameState.gameActive = false;
    AudioSynth.playWhistle();
    alert(`FULL TIME! Match ended. Final Score: Home ${data.scores.home} - Away ${data.scores.away}`);
    location.reload(); // Quit to dashboard
  });
}

// ── 60Hz CLIENT TICK FOR CAPTURING INPUT AND SENDING ──
export function pvpSendInputsTick() {
  if (!gameState.isPvPMode) return;

  inputTick++;
  
  // Calculate move vector from keyboard keys
  let moveX = 0;
  let moveY = 0;

  if (gameState.keys.w || gameState.keys.arrowUp) moveY = -1.0;
  if (gameState.keys.s || gameState.keys.arrowDown) moveY = 1.0;
  if (gameState.keys.a || gameState.keys.arrowLeft) moveX = -1.0;
  if (gameState.keys.d || gameState.keys.arrowRight) moveX = 1.0;

  // Normalize diagonal direction
  if (moveX !== 0 && moveY !== 0) {
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    moveX /= len;
    moveY /= len;
  }

  // Action buttons
  const isSprintPressed = !!gameState.keys.shift;
  const isPassPressed = !!gameState.keys.e;
  const isShootPressed = !!gameState.keys.q;
  const isTacklePressed = !!gameState.keys.space;
  const isSwitchPressed = !!gameState.keys.c;

  // Consume action triggers to avoid duplicate triggers
  if (isPassPressed) gameState.keys.e = false;
  if (isShootPressed) gameState.keys.q = false;
  if (isTacklePressed) gameState.keys.space = false;
  if (isSwitchPressed) gameState.keys.c = false;

  // Emit timestamped packet
  const packet = {
    tick: inputTick,
    time: Date.now(),
    moveX,
    moveY,
    sprint: isSprintPressed,
    pass: isPassPressed,
    shoot: isShootPressed,
    tackle: isTacklePressed,
    switch: isSwitchPressed
  };

  if (SocketController.socket) {
    SocketController.socket.emit('pvp-input', packet);
  }

  // Local Client-Side Prediction (moves player instantly on screen)
  if (gameState.userControlledPlayer && gameState.gameActive && !gameState.isGoalScoringPause) {
    const baseSpeed = 5.2;
    const sprintMultiplier = isSprintPressed && gameState.userControlledPlayer.stamina > 10.0 ? 1.72 : 1.0;
    const speed = baseSpeed * sprintMultiplier;

    gameState.userControlledPlayer.group.position.x += moveX * speed * 0.016;
    gameState.userControlledPlayer.group.position.z += moveY * speed * 0.016;
    
    if (moveX !== 0 || moveY !== 0) {
      gameState.userControlledPlayer.group.rotation.y = Math.atan2(moveX, moveY);
    }
  }
}

// ── CLIENT RENDERING AND INTERPOLATION LOOP (EXPLICIT LERPING & RECONCILIATION) ──
export function pvpRenderInterpolationTick(dt) {
  if (!gameState.isPvPMode) return;

  // Interpolate Ball
  const targetBallPos = targetStates.ball.pos;
  gameState.ballMesh.position.lerp(targetBallPos, 0.22); // Smooth lerp

  // Run rotation on ball when moving
  const ballSpeed = targetStates.ball.vel.length();
  if (ballSpeed > 0.1) {
    gameState.ballMesh.rotateOnWorldAxis(
      new THREE.Vector3(targetStates.ball.vel.z, 0, -targetStates.ball.vel.x).normalize(),
      ballSpeed * dt * 2
    );
  }

  // Interpolate all 22 Players
  gameState.players.forEach(p => {
    const tState = targetStates.players[p.id];
    if (!tState) return;

    // Check if it's the user controlled local player
    const isLocalControlled = (p === gameState.userControlledPlayer);

    if (isLocalControlled) {
      // Server Reconciliation: check if client prediction diverged too much from server truth
      const dist = p.group.position.distanceTo(tState.pos);
      if (dist > 0.5) {
        // Diverged! Lerp back to server truth smoothly to correct prediction error
        p.group.position.lerp(tState.pos, 0.15);
      }
    } else {
      // Outfield AI & Opponent: Lerp directly to target position and rotation
      p.group.position.lerp(tState.pos, 0.25);
      p.group.rotation.y = THREE.MathUtils.lerp(p.group.rotation.y, tState.rotY, 0.25);
    }

    // Stamina local sync
    p.stamina = tState.stamina;

    // Virtual animation controller
    const displacement = tState.pos.clone().sub(p.group.position).length();
    const speed = displacement / Math.max(dt, 0.01);
    
    // Play running / walking animations based on virtual speed
    if (speed > 0.1) {
      p.animTime += speed * dt * 1.2;
      p.leftLeg.rotation.x = Math.sin(p.animTime) * 0.65;
      p.rightLeg.rotation.x = -Math.sin(p.animTime) * 0.65;
      p.leftArm.rotation.x = -Math.sin(p.animTime) * 0.5;
      p.rightArm.rotation.x = Math.sin(p.animTime) * 0.5;
      p.torso.rotation.x = 0.15;
    } else {
      p.animTime = 0;
      p.leftLeg.rotation.x = 0;
      p.rightLeg.rotation.x = 0;
      p.leftArm.rotation.x = 0.08;
      p.rightArm.rotation.x = -0.08;
      p.torso.rotation.x = 0;
    }

    // Set indicator chevron visibility
    p.chevron.visible = isLocalControlled;
  });

  // Track camera to follow ball in PvP
  const ballPos = gameState.ballMesh.position;
  const targetLook = new THREE.Vector3(ballPos.x, 0, ballPos.z);
  
  if (gameState.userControlledPlayer) {
    targetLook.lerp(gameState.userControlledPlayer.group.position, 0.20);
  }

  const zoomFactor = Math.min(Math.max(ballSpeed * 0.12, 0), 12.0);
  let targetY = 15.0 + zoomFactor * 0.35;
  let targetZ = targetLook.z + 28.0 + zoomFactor * 0.52;

  if (gameState.cameraView === 'overhead') {
    targetY = 42.0;
    targetZ = targetLook.z + 4.0;
  } else if (gameState.cameraView === 'player' && gameState.userControlledPlayer) {
    targetY = 7.0;
    targetZ = targetLook.z + 13.0;
  }

  gameState.camera.position.x = THREE.MathUtils.lerp(gameState.camera.position.x, targetLook.x, 0.05);
  gameState.camera.position.y = THREE.MathUtils.lerp(gameState.camera.position.y, targetY, 0.05);
  gameState.camera.position.z = THREE.MathUtils.lerp(gameState.camera.position.z, targetZ, 0.05);
  gameState.camera.lookAt(targetLook);
}
