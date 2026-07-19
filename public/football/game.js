/**
 * Football Pro 2026 - Central Main Orchestrator & State Machine
 */

import { gameState, TEAMS, TEAM_DATA, TEAMS_LIST, PITCH_LENGTH, PITCH_WIDTH, FORMATIONS, GOAL_WIDTH, GOAL_HEIGHT, COUNTRIES, CLUBS_DATABASE } from './state.js';
import { AudioSynth } from './audio.js';
import { FirebaseSync } from './profile.js';
import { SocketController } from './network.js';
import { PlayerAgent } from './player.js';
import { initEngine3D, updateVFXParticles, spawnConfetti } from './stadium.js';
import { updateBallPhysics, updateBallTrailRibbon, handleDribblingAndTackling, kickBall } from './physics.js';
import { pvpSendInputsTick, pvpRenderInterpolationTick } from './pvp.js';

import { renderCareer } from './components/career.js';
import { renderTournament } from './components/tournament.js';
import { renderMultiplayer } from './components/multiplayer.js';
import { renderPractice } from './components/practice.js';
import { renderTeam } from './components/team.js';
import { renderStore } from './components/store.js';
import { renderLeaderboard } from './components/leaderboard.js';
import { renderSettings } from './components/settings.js';

let matchInterval = null;
const REPLAY_BUFFER_MAX = 300;
let isChargingKick = false;
let kickPower = 0;

// ── GAMEPAD STATE (must be at top-level so animate() can access it from frame 1) ──
window.gamepadState = {
  active: false,
  joystickX: 0,
  joystickY: 0,
  aimX: 0,
  aimY: 0,
  btnCross: false,
  btnCircle: false,
  btnSquare: false,
  btnR1: false,
  btnL1: false
};
var gamepadState = window.gamepadState;
var prevBtnCross = false;
var prevBtnSwap = false;
var gpPrevNavPressed = { up: false, down: false, left: false, right: false, accept: false, back: false };

// Expose triggerGoalScored to physics engine circular import
export function triggerGoalScored(scoringTeam) {
  gameState.isGoalScoringPause = true;
  gameState.gameActive = false;
  gameState.scoringTeamId = scoringTeam;

  if (scoringTeam === TEAMS.RED) {
    gameState.score.home += 1;
    document.getElementById('score-home').innerText = gameState.score.home;
    document.getElementById('goal-scorer-sub').innerText = `${gameState.userTeamName} SCORED!`;
  } else {
    gameState.score.away += 1;
    document.getElementById('score-away').innerText = gameState.score.away;
    document.getElementById('goal-scorer-sub').innerText = `${gameState.oppTeamName} SCORED!`;
  }

  AudioSynth.playWhistle();
  AudioSynth.playCheer();
  spawnConfetti();

  const overlay = document.getElementById('goal-overlay');
  if (overlay) overlay.classList.add('active');

  setTimeout(() => {
    if (overlay) overlay.classList.remove('active');

    if (gameState.replayBuffer.length > 30) {
      gameState.isReplayActive = true;
      gameState.replayFrameIndex = 0;
      document.getElementById('replay-overlay').style.display = 'flex';
    } else {
      resetKickoffPosition();
      gameState.gameActive = true;
      gameState.isGoalScoringPause = false;
    }
  }, 3000);
}

function resetKickoffPosition(userKicksOff = true) {
  gameState.ballMesh.position.set(0, gameState.ballRadius, 0);
  gameState.ballVelocity.set(0, 0, 0);
  gameState.ballDribbler = null;
  gameState.kickoffActive = true; // Freeze AI until first kick is taken
  if (gameState.ballMesh) gameState.ballMesh.visible = true; // Ensure ball is visible

  initPlayers();


  if (userKicksOff) {
    // Find the striker/forward with number closest to 10 on RED team
    const redForward = gameState.players.find(p => p.team === TEAMS.RED && (p.role === 'ST' || p.role === 'LS' || p.role === 'RS')) ||
                       gameState.players.find(p => p.team === TEAMS.RED && !p.isGoalkeeper);
    if (redForward) {
      gameState.ballDribbler = redForward;
      gameState.userControlledPlayer = redForward; // ← critical fix: control kickoff player
      const forwardOffset = new THREE.Vector3(0, 0, 0.42).applyQuaternion(redForward.group.quaternion);
      gameState.ballMesh.position.copy(redForward.group.position).add(forwardOffset);
      gameState.ballMesh.position.y = gameState.ballRadius;
    }
  } else {
    const blueForward = gameState.players.find(p => p.team === TEAMS.BLUE && (p.role === 'ST' || p.role === 'LS')) ||
                        gameState.players.find(p => p.team === TEAMS.BLUE && !p.isGoalkeeper);
    if (blueForward) {
      gameState.ballDribbler = blueForward;
      const forwardOffset = new THREE.Vector3(0, 0, -0.42).applyQuaternion(blueForward.group.quaternion);
      gameState.ballMesh.position.copy(blueForward.group.position).add(forwardOffset);
      gameState.ballMesh.position.y = gameState.ballRadius;
    }
    // After blue kickoff, switch user control to nearest RED player
    const nearestRed = gameState.players
      .filter(p => p.team === TEAMS.RED && !p.isGoalkeeper)
      .sort((a, b) => a.group.position.distanceTo(gameState.ballMesh.position) - b.group.position.distanceTo(gameState.ballMesh.position))[0];
    if (nearestRed) gameState.userControlledPlayer = nearestRed;
  }

  gameState.camera.position.set(0, 36, 48);
  gameState.camera.lookAt(0, 0, 0);
}

function initPlayers() {
  gameState.players.forEach(p => gameState.scene.remove(p.group));
  gameState.players.length = 0;

  // 1. Resolve selected clubs from dropdown selection state
  const hCountry = gameState.homeTeam.country;
  const hIdx = gameState.homeTeam.clubIndex;
  const hClub = CLUBS_DATABASE[hCountry][hIdx];

  const aCountry = gameState.awayTeam.country;
  const aIdx = gameState.awayTeam.clubIndex;
  const aClub = CLUBS_DATABASE[aCountry][aIdx];

  // Map to TEAM_DATA to dynamically update 3D jerseys
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

  // 2. Initialize lineups if missing
  if (!gameState.selectedHomeLineup) {
    gameState.selectedHomeLineup = JSON.parse(JSON.stringify(hClub.players.filter(p => p.role !== 'GK')));
    gameState.selectedHomeReserves = JSON.parse(JSON.stringify(hClub.reserves));
  }
  if (!gameState.selectedAwayLineup) {
    gameState.selectedAwayLineup = JSON.parse(JSON.stringify(aClub.players.filter(p => p.role !== 'GK')));
    gameState.selectedAwayReserves = JSON.parse(JSON.stringify(aClub.reserves));
  }

  const gkHome = hClub.players.find(p => p.role === 'GK') || { name: "Ter Stegen", number: 1 };
  const gkAway = aClub.players.find(p => p.role === 'GK') || { name: "Courtois", number: 1 };

  // 3. Spawn Home Outfielders
  const homeSlots = FORMATIONS[gameState.homeFormation || "4-3-3"];
  gameState.selectedHomeLineup.forEach((player, index) => {
    const slot = homeSlots[index] || { role: "ST", pos: { x: -2, z: 0 } };
    const startPos = new THREE.Vector3(slot.pos.x, 0, slot.pos.z);
    
    const pl = new PlayerAgent(TEAMS.RED, player.number, startPos);
    pl.formationSlotPos = slot.pos;
    pl.role = slot.role;
    pl.name = player.name;
    pl.number = player.number;
    gameState.players.push(pl);
  });

  // Home Goalkeeper
  gameState.userGoalKeeper = new PlayerAgent(TEAMS.RED, gkHome.number, new THREE.Vector3(-PITCH_LENGTH/2 + 2.5, 0, 0), true);
  gameState.userGoalKeeper.formationSlotPos = { x: -PITCH_LENGTH/2 + 2.5, z: 0 };
  gameState.userGoalKeeper.role = "GK";
  gameState.userGoalKeeper.name = gkHome.name;
  gameState.userGoalKeeper.number = gkHome.number;
  gameState.players.push(gameState.userGoalKeeper);

  // 4. Spawn Away Outfielders
  const awaySlots = FORMATIONS[gameState.awayFormation || "4-3-3"];
  gameState.selectedAwayLineup.forEach((player, index) => {
    const slot = awaySlots[index] || { role: "ST", pos: { x: 2, z: 0 } };
    const startPos = new THREE.Vector3(-slot.pos.x, 0, -slot.pos.z);
    
    const pl = new PlayerAgent(TEAMS.BLUE, player.number, startPos);
    pl.formationSlotPos = slot.pos;
    pl.role = slot.role;
    pl.name = player.name;
    pl.number = player.number;
    gameState.players.push(pl);
  });

  // Away Goalkeeper
  gameState.opponentGoalKeeper = new PlayerAgent(TEAMS.BLUE, gkAway.number, new THREE.Vector3(PITCH_LENGTH/2 - 2.5, 0, 0), true);
  gameState.opponentGoalKeeper.formationSlotPos = { x: PITCH_LENGTH/2 - 2.5, z: 0 };
  gameState.opponentGoalKeeper.role = "GK";
  gameState.opponentGoalKeeper.name = gkAway.name;
  gameState.opponentGoalKeeper.number = gkAway.number;
  gameState.players.push(gameState.opponentGoalKeeper);

  // Default controlled player: striker
  const forwardPlayer = gameState.players.find(p => p.team === TEAMS.RED && (p.role === "ST" || p.role === "LS" || p.role === "RW"));
  gameState.userControlledPlayer = forwardPlayer || gameState.players[0];
}

function startMatchTimer() {
  if (matchInterval) clearInterval(matchInterval);

  matchInterval = setInterval(() => {
    if (!gameState.gameActive || gameState.isGoalScoringPause || gameState.isReplayActive) return;
    
    const inGameSecPerRealSec = (90 * 60) / gameState.matchDuration;
    gameState.matchTimer += inGameSecPerRealSec;

    const currentTotalMin = Math.floor(gameState.matchTimer / 60);
    const currentTotalSec = Math.floor(gameState.matchTimer % 60);
    
    const displayMin = currentTotalMin.toString().padStart(2, '0');
    const displaySec = currentTotalSec.toString().padStart(2, '0');
    
    const timeBox = document.getElementById('match-timer');
    if (timeBox) timeBox.innerText = `${displayMin}:${displaySec}`;

    if (currentTotalMin >= 90) {
      endMatch();
    }
  }, 1000);
}

function endMatch() {
  gameState.gameActive = false;
  gameState.isGoalScoringPause = false;
  gameState.isReplayActive = false;
  if (matchInterval) clearInterval(matchInterval);

  AudioSynth.stopAll();
  AudioSynth.playWhistle();

  document.getElementById('game-hud').style.display = 'none';
  document.getElementById('match-over-screen').style.display = 'flex';
  
  const title = document.getElementById('match-result-title');
  if (gameState.score.home > gameState.score.away) {
    title.innerText = `${gameState.userTeamName} WIN!`;
  } else if (gameState.score.home < gameState.score.away) {
    title.innerText = `${gameState.oppTeamName} WINS!`;
  } else {
    title.innerText = "MATCH DRAWN!";
  }

  document.getElementById('final-home-score').innerText = gameState.score.home;
  document.getElementById('final-away-score').innerText = gameState.score.away;
  document.getElementById('stat-shots').innerText = `${gameState.score.home * 2 + 1} - ${gameState.score.away * 2 + 1}`;
  document.getElementById('stat-tackles').innerText = "12 - 9";

  FirebaseSync.recordMatchStats(gameState.score.home, gameState.score.away).then(xp => {
    document.getElementById('stat-xp').innerText = `+${xp} XP`;
    FirebaseSync.updateProfileHUD();
  });
}

function hideGameplayOverlays() {
  const ids = ['setpiece-hud', 'card-popup', 'pause-screen', 'match-over-screen', 'goal-overlay'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === 'goal-overlay') el.classList.remove('active');
      else el.style.display = 'none';
    }
  });
}

function resetEntireMatch(userKicksOff = true) {
  hideGameplayOverlays();
  gameState.score.home = 0;
  gameState.score.away = 0;
  gameState.matchTimer = 0;
  document.getElementById('score-home').innerText = "0";
  document.getElementById('score-away').innerText = "0";
  document.getElementById('match-timer').innerText = "00:00";
  
  document.getElementById('hud-home-name').innerText = gameState.userTeamName;
  document.getElementById('hud-away-name').innerText = gameState.oppTeamName;
  document.getElementById('end-home-name').innerText = gameState.userTeamName;
  document.getElementById('end-away-name').innerText = gameState.oppTeamName;

  const homeBadge = document.getElementById('hud-home-color');
  const awayBadge = document.getElementById('hud-away-color');
  if (homeBadge && awayBadge) {
    homeBadge.className = "team-color " + TEAM_DATA[gameState.userTeamName].cssClass;
    awayBadge.className = "team-color " + TEAM_DATA[gameState.oppTeamName].cssClass;
  }

  resetKickoffPosition(userKicksOff);
  
  gameState.countdownTimer = 2.0;
  gameState.gameActive = false;
  gameState.isGoalScoringPause = false;
  gameState.isReplayActive = false;
  gameState.replayBuffer.length = 0;

  startMatchTimer();
}

function runCameraFollowLoop() {
  if (gameState.isGoalScoringPause || gameState.isReplayActive) return;

  const sp = gameState.setPiece;
  if (sp && sp.active) {
    if (sp.team === TEAMS.RED) {
      const kicker = sp.kicker;
      if (kicker) {
        if (sp.type === 'throwin' || (sp.type === 'corner' && sp.mode === 'player') || (sp.type === 'goalkick' && sp.mode === 'player')) {
          const targetPl = sp.targets[sp.targetIndex];
          if (targetPl) {
            const toTarget = targetPl.group.position.clone().sub(kicker.group.position);
            const dir = toTarget.clone().normalize();
            
            const camTargetPos = kicker.group.position.clone().sub(dir.clone().multiplyScalar(4.5));
            camTargetPos.y = 3.6; // elevated behind kicker
            
            gameState.camera.position.lerp(camTargetPos, 0.08);
            
            const lookAtTarget = kicker.group.position.clone().add(toTarget.multiplyScalar(0.4));
            lookAtTarget.y = 1.0;
            gameState.camera.lookAt(lookAtTarget);
            return;
          }
        } else if ((sp.type === 'corner' || sp.type === 'freekick') && sp.mode === 'direct') {
          // Direct aim camera from corner / freekick
          const aimDir = new THREE.Vector3(Math.cos(sp.aimAngle), 0, Math.sin(sp.aimAngle)).normalize();
          const camTargetPos = sp.spot.clone().sub(aimDir.clone().multiplyScalar(5.5));
          camTargetPos.y = 4.2;
          
          gameState.camera.position.lerp(camTargetPos, 0.08);
          
          const lookAtTarget = sp.spot.clone().add(aimDir.multiplyScalar(10.0));
          lookAtTarget.y = 1.0;
          gameState.camera.lookAt(lookAtTarget);
          return;
        } else if (sp.type === 'penalty') {
          const xDir = (sp.spot.x > 0) ? 1 : -1;
          const goalX = (sp.spot.x > 0) ? PITCH_LENGTH / 2 : -PITCH_LENGTH / 2;
          const camTargetPos = new THREE.Vector3(sp.spot.x - xDir * 6.5, 2.2, 0.0);
          gameState.camera.position.lerp(camTargetPos, 0.08);
          gameState.camera.lookAt(goalX, 0.8, 0.0);
          return;
        }
      }
    } else {
      // Opponent set piece camera
      const targetLook = new THREE.Vector3().copy(gameState.ballMesh.position);
      gameState.camera.position.x = THREE.MathUtils.lerp(gameState.camera.position.x, targetLook.x, 0.05);
      gameState.camera.position.y = THREE.MathUtils.lerp(gameState.camera.position.y, 16.0, 0.05);
      gameState.camera.position.z = THREE.MathUtils.lerp(gameState.camera.position.z, targetLook.z + 28.0, 0.05);
      gameState.camera.lookAt(targetLook);
      return;
    }
  }

  const targetLook = new THREE.Vector3().copy(gameState.ballMesh.position);
  if (gameState.userControlledPlayer) {
    // Keep ball near center, but offset slightly towards controlled player (80/20 split)
    targetLook.lerp(gameState.userControlledPlayer.group.position, 0.20);
  }

  // Dynamic zoom based on speed of ball and height of ball (crosses / aerials)
  const ballSpeed = gameState.ballVelocity ? gameState.ballVelocity.length() : 0;
  const ballHeight = Math.max(0, gameState.ballMesh.position.y);
  
  const zoomFactor = Math.min(Math.max(ballSpeed * 0.12, 0), 12.0);
  let targetY = 15.0 + ballHeight * 0.72 + zoomFactor * 0.35;
  let targetZ = targetLook.z + 28.0 + zoomFactor * 0.52;

  if (gameState.cameraView === 'overhead') {
    targetY = 42.0;
    targetZ = targetLook.z + 4.0;
  } else if (gameState.cameraView === 'player' && gameState.userControlledPlayer) {
    targetY = 7.0 + ballHeight * 0.4;
    targetZ = targetLook.z + 13.0;
  }

  gameState.camera.position.x = THREE.MathUtils.lerp(gameState.camera.position.x, targetLook.x, 0.05);
  gameState.camera.position.y = THREE.MathUtils.lerp(gameState.camera.position.y, targetY, 0.05);
  gameState.camera.position.z = THREE.MathUtils.lerp(gameState.camera.position.z, targetZ, 0.05);
  gameState.camera.lookAt(targetLook);
}

function recordFrameState() {
  const frameState = {
    ballPos: gameState.ballMesh.position.clone(),
    ballRot: gameState.ballMesh.rotation.clone(),
    players: gameState.players.map(p => ({
      id: p.number + "_" + p.team,
      pos: p.group.position.clone(),
      rot: p.group.rotation.clone(),
      leftLegRot: p.leftLeg.rotation.x,
      rightLegRot: p.rightLeg.rotation.x,
      leftArmRotX: p.leftArm.rotation.x,
      rightArmRotX: p.rightArm.rotation.x,
      leftArmRotZ: p.leftArm.rotation.z,
      rightArmRotZ: p.rightArm.rotation.z
    }))
  };
  
  gameState.replayBuffer.push(frameState);
  if (gameState.replayBuffer.length > REPLAY_BUFFER_MAX) {
    gameState.replayBuffer.shift();
  }
}

window.updateReplayLoop = function(dt) {
  gameState.replayFrameIndex += 22 * dt;
  const idx = Math.floor(gameState.replayFrameIndex);

  if (idx >= gameState.replayBuffer.length) {
    gameState.isReplayActive = false;
    document.getElementById('replay-overlay').style.display = 'none';
    resetKickoffPosition();
    gameState.gameActive = true;
    gameState.isGoalScoringPause = false;
    return;
  }

  const state = gameState.replayBuffer[idx];
  gameState.ballMesh.position.copy(state.ballPos);
  gameState.ballMesh.rotation.copy(state.ballRot);

  state.players.forEach(pState => {
    const pl = gameState.players.find(p => p.number + "_" + p.team === pState.id);
    if (pl) {
      pl.group.position.copy(pState.pos);
      pl.group.rotation.copy(pState.rot);
      pl.leftLeg.rotation.x = pState.leftLegRot;
      pl.rightLeg.rotation.x = pState.rightLegRot;
      pl.leftArm.rotation.x = pState.leftArmRotX;
      pl.rightArm.rotation.x = pState.rightArmRotX;
      pl.leftArm.rotation.z = pState.leftArmRotZ;
      pl.rightArm.rotation.z = pState.rightArmRotZ;
    }
  });

  gameState.camera.position.x = gameState.ballMesh.position.x;
  gameState.camera.position.y = 8;
  gameState.camera.position.z = gameState.ballMesh.position.z + 18;
  gameState.camera.lookAt(gameState.ballMesh.position);

  gameState.renderer.render(gameState.scene, gameState.camera);
}

function updateCelebrationLoop(dt) {
  if (window.spectatorMesh) {
    const time = gameState.clock.getElapsedTime() * 12;
    const posAttr = window.spectatorMesh.geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const origY = window.spectatorsOriginalY[i];
      posAttr.setY(i, origY + Math.abs(Math.sin(time + i)) * 1.6);
    }
    posAttr.needsUpdate = true;
  }

  gameState.players.forEach(pl => {
    pl.animTime += dt * 6;
    if (pl.team === gameState.scoringTeamId) {
      pl.leftArm.rotation.z = Math.PI - 0.3;
      pl.rightArm.rotation.z = -Math.PI + 0.3;
      pl.leftArm.rotation.x = Math.sin(pl.animTime) * 0.4;
      pl.rightArm.rotation.x = Math.cos(pl.animTime) * 0.4;
      pl.group.position.y = Math.abs(Math.sin(pl.animTime)) * 1.0; 
    }
  });

  const scorer = gameState.players.find(p => p.number === gameState.shotTaker?.number && p.team === gameState.shotTaker?.team) || gameState.userControlledPlayer;
  const targetCamPos = new THREE.Vector3(
    scorer.group.position.x + Math.sin(gameState.clock.getElapsedTime()) * 11,
    7,
    scorer.group.position.z + Math.cos(gameState.clock.getElapsedTime()) * 11
  );
  gameState.camera.position.lerp(targetCamPos, 0.05);
  gameState.camera.lookAt(scorer.group.position);

  gameState.renderer.render(gameState.scene, gameState.camera);
}

function updatePassingAssistIndicators() {
  gameState.players.forEach(p => {
    p.chevron.visible = false;
    p.chevron.material.color.setHex(0xeab308); // default gold
  });

  if (gameState.setPiece && gameState.setPiece.active && gameState.setPiece.team === TEAMS.RED) {
    if (gameState.setPiece.mode === 'player') {
      const target = gameState.setPiece.targets[gameState.setPiece.targetIndex];
      if (target) {
        target.chevron.visible = true;
        target.chevron.material.color.setHex(0x06b6d4); // Cyan chevron for set-piece target
      }
    }
    return;
  }

  if (!gameState.userControlledPlayer) return;

  // Controlled player chevron is yellow
  gameState.userControlledPlayer.chevron.visible = true;
  gameState.userControlledPlayer.chevron.material.color.setHex(0xeab308);

  // If controlled player has the ball, highlight the aimed pass target
  if (gameState.ballDribbler === gameState.userControlledPlayer) {
    let aimDir = new THREE.Vector3();
    if (gameState.touchState.jsActive && gameState.touchState.joystickDir) {
      aimDir.set(gameState.touchState.joystickDir.x, 0, gameState.touchState.joystickDir.y);
    } else {
      if (gameState.keys.w || gameState.keys.arrowUp) aimDir.z = -1;
      if (gameState.keys.s || gameState.keys.arrowDown) aimDir.z = 1;
      if (gameState.keys.a || gameState.keys.arrowLeft) aimDir.x = -1;
      if (gameState.keys.d || gameState.keys.arrowRight) aimDir.x = 1;
    }
    if (aimDir.lengthSq() > 0.01) aimDir.normalize();
    else {
      aimDir.copy(gameState.userControlledPlayer.facingDir);
    }

    let bestTeammate = null;
    let maxScore = -Infinity;

    gameState.players.forEach(p => {
      if (p.team === TEAMS.RED && p !== gameState.userControlledPlayer && !p.isGoalkeeper && !p.isStumbling) {
        const toPlayer = p.group.position.clone().sub(gameState.userControlledPlayer.group.position);
        const dist = toPlayer.length();
        toPlayer.normalize();
        const dot = toPlayer.dot(aimDir);

        if (dot > 0.4 && dist < 42.0) {
          const score = dot * 1.8 - (dist / 38.0);
          if (score > maxScore) {
            maxScore = score;
            bestTeammate = p;
          }
        }
      }
    });

    if (bestTeammate) {
      bestTeammate.chevron.visible = true;
      bestTeammate.chevron.material.color.setHex(0x16a34a); // Green for target receiver
    }
  }
}

function triggerTeammatePass() {
  if (!gameState.ballDribbler || gameState.ballDribbler.team !== TEAMS.RED) return;

  let aimDir = new THREE.Vector3();
  if (gameState.touchState.jsActive && gameState.touchState.joystickDir) {
    aimDir.set(gameState.touchState.joystickDir.x, 0, gameState.touchState.joystickDir.y);
  } else {
    if (gameState.keys.w || gameState.keys.arrowUp) aimDir.z = -1;
    if (gameState.keys.s || gameState.keys.arrowDown) aimDir.z = 1;
    if (gameState.keys.a || gameState.keys.arrowLeft) aimDir.x = -1;
    if (gameState.keys.d || gameState.keys.arrowRight) aimDir.x = 1;
  }
  if (aimDir.lengthSq() > 0.01) aimDir.normalize();
  else {
    aimDir.copy(gameState.userControlledPlayer.facingDir);
  }

  let targetTeammate = null;
  let maxScore = -Infinity;
  
  gameState.players.forEach(p => {
    if (p.team === TEAMS.RED && p !== gameState.ballDribbler && !p.isGoalkeeper && !p.isStumbling) {
      const toPlayer = p.group.position.clone().sub(gameState.ballDribbler.group.position);
      const dist = toPlayer.length();
      toPlayer.normalize();
      const dot = toPlayer.dot(aimDir);

      if (dot > 0.35 && dist < 42.0) {
        const score = dot * 1.8 - (dist / 38.0);
        if (score > maxScore) {
          maxScore = score;
          targetTeammate = p;
        }
      }
    }
  });

  if (targetTeammate) {
    const dir = targetTeammate.group.position.clone().sub(gameState.ballMesh.position).normalize();
    dir.y = 0.05; // slight loft
    gameState.ballDribbler.kickCooldown = 1.0;
    gameState.ballDribbler.stamina = Math.max(0, gameState.ballDribbler.stamina - 4.0);
    
    // Track pass target to auto-switch control on receiver contact
    gameState.passTarget = targetTeammate;

    // Passes are direct and spin-free for 100% accuracy
    kickBall(dir, 15.0, null); 

    // Instantly switch to receiver
    gameState.userControlledPlayer = targetTeammate;
  }
}

function checkActiveChargingLoop(dt) {
  const isPressingShoot = gameState.keys.space || SocketController.controllerInput.btnCircle || gameState.touchState.btnShoot || (typeof gamepadState !== 'undefined' && gamepadState.btnCircle);

  if (isPressingShoot && gameState.ballDribbler && gameState.ballDribbler.team === TEAMS.RED) {
    isChargingKick = true;
    kickPower = Math.min(100, kickPower + 140 * dt); 
    
    const wrapper = document.getElementById('power-wrapper');
    const fill = document.getElementById('power-fill');
    if (wrapper) wrapper.style.opacity = 1;
    if (fill) fill.style.width = `${kickPower}%`;
  } else {
    if (isChargingKick) {
      isChargingKick = false;
      const wrapper = document.getElementById('power-wrapper');
      if (wrapper) wrapper.style.opacity = 0;

      if (gameState.ballDribbler && gameState.ballDribbler.team === TEAMS.RED) {
        // Aim shot at opponent's goal mouth (x = PITCH_LENGTH / 2)
        const goalTarget = new THREE.Vector3(PITCH_LENGTH / 2, 0.0, 0.0);
        
        // Deflect shot to corners based on aim direction
        if (gameState.keys.w || gameState.keys.arrowUp) { goalTarget.z = -GOAL_WIDTH / 2 + 1.2; }
        else if (gameState.keys.s || gameState.keys.arrowDown) { goalTarget.z = GOAL_WIDTH / 2 - 1.2; }
        
        const forceVec = goalTarget.sub(gameState.ballMesh.position).normalize();
        forceVec.y = 0.22 + (kickPower / 100) * 0.16; // shot height based on power
        forceVec.normalize();
        
        gameState.ballDribbler.kickCooldown = 1.0;
        gameState.ballDribbler.stamina = Math.max(0, gameState.ballDribbler.stamina - 8.0);
        gameState.shotTaker = gameState.ballDribbler;
        
        const finalForce = 14 + (kickPower / 100) * 22;
        
        // Add curve spin to shot!
        const spinVal = (Math.random() - 0.5) * 8.0;
        const spinVec = new THREE.Vector3(0, spinVal, 0);
        
        kickBall(forceVec, finalForce, spinVec);
      }
      kickPower = 0;
    }
  }
}

function initMobileTouchEvents() {
  const container = document.getElementById('mobile-touch-controls');
  if (!container) return;

  // Only show mobile controls on actual mobile screens (not touch-enabled laptops)
  const isTouchDevice = (('ontouchstart' in window) || navigator.maxTouchPoints > 0)
                        && window.innerWidth < 900;
  if (isTouchDevice) {
    container.style.display = 'flex';
  } else {
    container.style.display = 'none';
    return;
  }

  const jsBase = document.getElementById('mobile-js-base');
  const jsKnob = document.getElementById('mobile-js-knob');
  
  jsBase.ontouchstart = (e) => {
    gameState.touchState.jsActive = true;
    const touch = e.touches[0];
    const rect = jsBase.getBoundingClientRect();
    gameState.touchState.jsStart.x = rect.left + rect.width / 2;
    gameState.touchState.jsStart.y = rect.top + rect.height / 2;
  };

  jsBase.ontouchmove = (e) => {
    if (!gameState.touchState.jsActive) return;
    e.preventDefault();
    const touch = e.touches[0];
    
    let dx = touch.clientX - gameState.touchState.jsStart.x;
    let dy = touch.clientY - gameState.touchState.jsStart.y;
    const maxRadius = 45;
    
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    
    jsKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    gameState.touchState.joystickDir.set(dx / maxRadius, dy / maxRadius);
  };

  const resetJoystick = () => {
    gameState.touchState.jsActive = false;
    jsKnob.style.transform = 'translate(-50%, -50%)';
    gameState.touchState.joystickDir.set(0, 0);
  };
  jsBase.ontouchend = resetJoystick;
  jsBase.ontouchcancel = resetJoystick;

  const setupBtn = (id, stateProp) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.ontouchstart = (e) => { e.preventDefault(); gameState.touchState[stateProp] = true; };
      btn.ontouchend = (e) => { gameState.touchState[stateProp] = false; };
    }
  };
  setupBtn('touch-btn-sprint', 'btnSprint');
  setupBtn('touch-btn-tackle', 'btnTackle');
  setupBtn('touch-btn-pass', 'btnPass');
  setupBtn('touch-btn-shoot', 'btnShoot');
  
  document.getElementById('touch-btn-pass').addEventListener('touchstart', () => {
    if (gameState.gameActive && !gameState.isGoalScoringPause) {
      triggerTeammatePass();
    }
  });
}

function handleKeyboardActionTriggers(e) {
  if (e.code === 'KeyF') {
    e.preventDefault();
    toggleFullscreen();
    return;
  }

  if (e.code === 'Escape') {
    e.preventDefault();
    e.stopPropagation();

    // If any menu/lobby overlay is currently visible, do not allow toggling the pause menu
    const isMenuVisible = ['menu-matchup-view', 'match-preview-screen', 'team-management-screen', 'boot-stage-splash', 'boot-stage-loading', 'boot-stage-cutscene', 'main-menu-screen']
      .some(id => {
        const el = document.getElementById(id);
        return el && el.style.display !== 'none';
      });

    if (isMenuVisible) {
      return;
    }

    // Toggle Pause Menu
    const pauseScreen = document.getElementById('pause-screen');
    if (pauseScreen) {
      if (pauseScreen.style.display === 'flex') {
        pauseScreen.style.display = 'none';
        if (!gameState.isGoalScoringPause && !gameState.isReplayActive && gameState.countdownTimer <= 0) {
          gameState.gameActive = true;
        }
      } else {
        gameState.gameActive = false;
        pauseScreen.style.display = 'flex';
        
        window.menuNavIndex = 0;
        if (typeof window.updateMenuHighlight === 'function') window.updateMenuHighlight();
      }
    }

    // Counteract Escape key exiting fullscreen
    setTimeout(() => {
      try {
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (req) {
          req.call(el).catch(() => {});
        }
      } catch(err) {}
    }, 50);

    return;
  }

  if (!gameState.gameActive) return;

  // --- SET-PIECE KEY INPUTS ---
  if (gameState.setPiece && gameState.setPiece.active && gameState.setPiece.team === TEAMS.RED) {
    const sp = gameState.setPiece;
    
    // Cycle targets using KeyC (swap button)
    if (e.code === 'KeyC') {
      if (sp.mode === 'player' && sp.targets.length > 0) {
        sp.targetIndex = (sp.targetIndex + 1) % sp.targets.length;
        AudioSynth.playClick();
      }
      return;
    }
    
    // Execute set-piece using KeyE / Enter
    if (e.code === 'KeyE' || e.code === 'Enter') {
      if (sp.type === 'penalty') {
        executePenaltyKick(sp.aimX, sp.aimY, TEAMS.RED);
        return;
      }

      if (sp.mode === 'choose') {
        // default to player pass if they press E/Enter
        sp.mode = 'player';
        const choices = document.getElementById('corner-choices');
        if (choices) choices.style.display = 'none';
        const prompt = document.getElementById('setpiece-prompt');
        if (prompt) prompt.innerText = "Cycle teammates: C / Swap. Cross: E / Pass.";
        return;
      }
      
      if (sp.mode === 'player') {
        const target = sp.targets[sp.targetIndex];
        if (target) {
          const dir = target.group.position.clone().sub(gameState.ballMesh.position).normalize();
          if (sp.type === 'throwin') {
            dir.y = 0.28; // high overhead throw arc
            const force = 13.0 + Math.min(5.0, target.group.position.distanceTo(sp.spot) * 0.15);
            kickBall(dir, force);
          } else {
            dir.y = 0.24; // lofted corner kick cross
            const force = 17.5 + Math.min(8.0, target.group.position.distanceTo(sp.spot) * 0.22);
            kickBall(dir, force);
          }
          gameState.passTarget = target;
          gameState.userControlledPlayer = target;
          
          sp.active = false;
          document.getElementById('setpiece-hud').style.display = 'none';
        }
      } else if (sp.mode === 'direct') {
        const dir = new THREE.Vector3(Math.cos(sp.aimAngle), 0.24, Math.sin(sp.aimAngle)).normalize();
        kickBall(dir, 21.0);
        
        // Find teammate nearest to projected target landing spot (e.g. 15.0 units along aimAngle)
        const landingSpot = sp.spot.clone().add(new THREE.Vector3(Math.cos(sp.aimAngle), 0, Math.sin(sp.aimAngle)).multiplyScalar(15.0));
        let bestTm = null, minDist = Infinity;
        gameState.players.forEach(p => {
          if (p.team === TEAMS.RED && !p.isGoalkeeper) {
            const d = p.group.position.distanceTo(landingSpot);
            if (d < minDist) { minDist = d; bestTm = p; }
          }
        });
        if (bestTm) {
          gameState.userControlledPlayer = bestTm;
          gameState.passTarget = bestTm;
        }
        
        sp.active = false;
        document.getElementById('setpiece-hud').style.display = 'none';
      }
      return;
    }
  }

  // --- REGULAR GAMEPLAY KEY INPUTS ---
  if (e.code === 'KeyE' || e.code === 'Enter') {
    if (gameState.ballDribbler && gameState.ballDribbler.team === TEAMS.RED) {
      triggerTeammatePass();
    } else {
      // Find nearest teammate to ball
      let bestPl = null, minDist = Infinity;
      gameState.players.forEach(pl => {
        if (pl.team === TEAMS.RED && !pl.isGoalkeeper && pl !== gameState.userControlledPlayer && !pl.isStumbling) {
          const d = pl.group.position.distanceTo(gameState.ballMesh.position);
          if (d < minDist) { minDist = d; bestPl = pl; }
        }
      });
      if (bestPl) {
        gameState.userControlledPlayer = bestPl;
        AudioSynth.playClick();
      }
    }
  }

  if (e.code === 'ShiftLeft' || e.code === 'KeyQ') {
    if (gameState.userControlledPlayer && !gameState.userControlledPlayer.isTackling && gameState.userControlledPlayer.tackleCooldown <= 0) {
      gameState.userControlledPlayer.triggerTackle();
    }
  }
}

function updateRadarMap() {
  const canvas = document.getElementById('radar-canvas');
  if (!canvas || canvas.offsetParent === null) return;

  const ctx = canvas.getContext('2d');
  const cw = canvas.width;
  const ch = canvas.height;

  ctx.clearRect(0, 0, cw, ch);

  const pad = 6;
  const rx = pad;
  const ry = pad;
  const rw = cw - pad * 2;
  const rh = ch - pad * 2;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rx, ry, rw, rh);

  ctx.beginPath();
  ctx.moveTo(rx + rw / 2, ry);
  ctx.lineTo(rx + rw / 2, ry + rh);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rx + rw / 2, ry + rh / 2, 16, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.strokeRect(rx, ry + rh / 2 - 18, 12, 36);
  ctx.strokeRect(rx + rw - 12, ry + rh / 2 - 18, 12, 36);

  gameState.players.forEach(pl => {
    const pctX = (pl.group.position.x + PITCH_LENGTH / 2) / PITCH_LENGTH;
    const pctZ = (pl.group.position.z + PITCH_WIDTH / 2) / PITCH_WIDTH;

    const px = rx + pctX * rw;
    const py = ry + pctZ * rh;

    ctx.fillStyle = pl.team === TEAMS.RED ? '#ef4444' : '#38bdf8';

    ctx.beginPath();
    ctx.arc(px, py, 3.2, 0, Math.PI * 2);
    ctx.fill();

    if (pl === gameState.userControlledPlayer) {
      ctx.strokeStyle = '#a3e635';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  if (gameState.ballMesh) {
    const pctX = (gameState.ballMesh.position.x + PITCH_LENGTH / 2) / PITCH_LENGTH;
    const pctZ = (gameState.ballMesh.position.z + PITCH_WIDTH / 2) / PITCH_WIDTH;

    const bx = rx + pctX * rw;
    const by = ry + pctZ * rh;

    const pulseRadius = 2.4 + Math.sin(Date.now() * 0.01) * 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bx, by, pulseRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(bx, by, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw referee dot (yellow)
  if (gameState.referee) {
    const pctX = (gameState.referee.group.position.x + PITCH_LENGTH / 2) / PITCH_LENGTH;
    const pctZ = (gameState.referee.group.position.z + PITCH_WIDTH / 2) / PITCH_WIDTH;
    const rfx = rx + pctX * rw;
    const rfy = ry + pctZ * rh;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(rfx, rfy, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateStaminaHUD() {
  if (!gameState.userControlledPlayer) return;
  const pl = gameState.userControlledPlayer;

  const nameLabel = document.getElementById('hud-active-player');
  if (nameLabel) {
    nameLabel.innerText = `NO. ${pl.number} (${pl.role || "ST"})`;
  }

  const fill = document.getElementById('hud-stamina-fill');
  if (fill) {
    const staminaPct = Math.round(pl.stamina);
    fill.style.width = `${staminaPct}%`;
    if (staminaPct > 55) {
      fill.style.backgroundColor = '#22c55e';
    } else if (staminaPct > 22) {
      fill.style.backgroundColor = '#eab308';
    } else {
      fill.style.backgroundColor = '#ef4444';
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  // Poll physical gamepad state at the start of every frame
  if (typeof pollGamepadState === 'function') pollGamepadState();
  
  // Update menu navigation if the game is not active (in menu view)
  if (!gameState.gameActive && typeof pollGamepadMenuNav === 'function') {
    pollGamepadMenuNav();
  }

  const dt = Math.min(gameState.clock.getDelta(), 0.1);

  if (gameState.isPvPMode) {
    pvpSendInputsTick();
    pvpRenderInterpolationTick(dt);
    gameState.renderer.render(gameState.scene, gameState.camera);
    return;
  }

  if (gameState.cinematic && gameState.cinematic.active) {
    if (typeof window.updateCinematicLoop === 'function') {
      window.updateCinematicLoop(dt);
    }
  } else if (gameState.isReplayActive) {
    if (typeof window.updateReplayLoop === 'function') {
      window.updateReplayLoop(dt);
    }
  } else {
    if (gameState.countdownTimer > 0) {
      gameState.countdownTimer -= dt;
      if (gameState.countdownTimer <= 0) {
        gameState.gameActive = true;
        AudioSynth.playWhistle();
      }
    }

    if (gameState.gameActive && !gameState.isGoalScoringPause) {
      if (typeof updateGameplayControllerTriggers === 'function') updateGameplayControllerTriggers();
      recordFrameState();

      if (gameState.userControlledPlayer) {
        if (gameState.userControlledPlayer.isFallen) {
          gameState.userControlledPlayer.velocity.set(0, 0, 0);
        } else {
          if (gameState.setPiece && gameState.setPiece.active) {
            const sp = gameState.setPiece;
            if (sp.team === TEAMS.RED && sp.type === 'penalty') {
              // Left/Right moves aim Z
              if (gameState.keys.a || gameState.keys.arrowLeft) {
                sp.aimX = Math.max(-GOAL_WIDTH / 2 + 0.3, sp.aimX - 2.5 * dt);
              }
              if (gameState.keys.d || gameState.keys.arrowRight) {
                sp.aimX = Math.min(GOAL_WIDTH / 2 - 0.3, sp.aimX + 2.5 * dt);
              }
              // Up/Down moves aim Y
              if (gameState.keys.w || gameState.keys.arrowUp) {
                sp.aimY = Math.min(GOAL_HEIGHT - 0.2, sp.aimY + 1.8 * dt);
              }
              if (gameState.keys.s || gameState.keys.arrowDown) {
                sp.aimY = Math.max(0.12, sp.aimY - 1.8 * dt);
              }
              
              if (window.penaltyTargetMesh) {
                const goalX = (sp.spot.x > 0) ? PITCH_LENGTH / 2 : -PITCH_LENGTH / 2;
                window.penaltyTargetMesh.position.set(goalX, sp.aimY, sp.aimX);
                window.penaltyTargetMesh.visible = true;
              }
            } else if (sp.team === TEAMS.RED && sp.mode === 'direct') {
              // Aiming controls for direct kick/cross
              if (gameState.keys.a || gameState.keys.arrowLeft) {
                sp.aimAngle += 1.35 * dt;
              }
              if (gameState.keys.d || gameState.keys.arrowRight) {
                sp.aimAngle -= 1.35 * dt;
              }
            }
          } else {
            // Dribbling modifier
            const isDribbleActive = gameState.keys.c || SocketController.controllerInput.btnL1 || gameState.touchState.btnDribble || (typeof gamepadState !== 'undefined' && gamepadState.btnL1);
            gameState.userControlledPlayer.isDribbling = isDribbleActive;

            // Sprint mode (requires stamina > 5.0)
            const canSprint = gameState.userControlledPlayer.stamina > 5.0;
            const isSprinting = (gameState.keys.shift || SocketController.controllerInput.btnR1 || gameState.touchState.btnSprint || (typeof gamepadState !== 'undefined' && gamepadState.btnR1)) && canSprint;

            // Dynamic Speed calculation
            let baseSpeed = gameState.userControlledPlayer.speed;
            if (isSprinting) {
              baseSpeed = gameState.userControlledPlayer.sprintSpeed;
            } else if (isDribbleActive) {
              baseSpeed = gameState.userControlledPlayer.speed * 0.62;
            }
            
            // Low stamina reduces speed factor
            const staminaFactor = 0.72 + (gameState.userControlledPlayer.stamina / 100) * 0.28;
            const currentSpeed = baseSpeed * staminaFactor;
            
            gameState.userControlledPlayer.velocity.set(0, 0, 0);
            
            let moveX = 0;
            let moveZ = 0;

            if (SocketController.phoneConnected && (Math.abs(SocketController.controllerInput.joystickX) > 0.1 || Math.abs(SocketController.controllerInput.joystickY) > 0.1)) {
              moveX = SocketController.controllerInput.joystickX;
              moveZ = SocketController.controllerInput.joystickY;
            } else if (gameState.touchState.jsActive) {
              moveX = gameState.touchState.joystickDir.x;
              moveZ = gameState.touchState.joystickDir.y;
            } else if (typeof gamepadState !== 'undefined' && gamepadState.active && (Math.abs(gamepadState.joystickX) > 0.1 || Math.abs(gamepadState.joystickY) > 0.1)) {
              moveX = gamepadState.joystickX;
              moveZ = gamepadState.joystickY;
            } else {
              // Keyboard movement
              if (gameState.keys.w || gameState.keys.arrowUp) moveZ = -1;
              if (gameState.keys.s || gameState.keys.arrowDown) moveZ = 1;
              if (gameState.keys.a || gameState.keys.arrowLeft) moveX = -1;
              if (gameState.keys.d || gameState.keys.arrowRight) moveX = 1;
            }

            gameState.userControlledPlayer.velocity.set(moveX, 0, moveZ);
            if (!SocketController.phoneConnected && !gameState.touchState.jsActive && !(typeof gamepadState !== 'undefined' && gamepadState.active && (Math.abs(gamepadState.joystickX) > 0.1 || Math.abs(gamepadState.joystickY) > 0.1))) {
              if (gameState.userControlledPlayer.velocity.lengthSq() > 0) {
                gameState.userControlledPlayer.velocity.normalize();
              }
            }

            gameState.userControlledPlayer.velocity.multiplyScalar(currentSpeed);
            
            if (gameState.userControlledPlayer.velocity.lengthSq() > 0.01) {
              gameState.userControlledPlayer.facingDir.copy(gameState.userControlledPlayer.velocity).normalize();
              gameState.userControlledPlayer.group.rotation.y = Math.atan2(gameState.userControlledPlayer.facingDir.x, gameState.userControlledPlayer.facingDir.z);
            }
            gameState.userControlledPlayer.group.position.addScaledVector(gameState.userControlledPlayer.velocity, dt);

            const isPressingTackle = gameState.keys.shift || gameState.keys.q || SocketController.controllerInput.btnSquare || gameState.touchState.btnTackle || (typeof gamepadState !== 'undefined' && gamepadState.btnSquare);
            if (isPressingTackle && !gameState.userControlledPlayer.isTackling && gameState.userControlledPlayer.tackleCooldown <= 0) {
              gameState.userControlledPlayer.triggerTackle();
            }
          }
        }
      }

      updateBallPhysics(dt);
      handleDribblingAndTackling(dt);
      checkActiveChargingLoop(dt);
      updateBallTrailRibbon();
      runCameraFollowLoop();
      updateRadarMap();
      updatePassingAssistIndicators();
      updateSetPieceAimLine();
      updateStaminaHUD();
    } else if (gameState.isGoalScoringPause) {
      updateCelebrationLoop(dt);
    }
  }

  updateVFXParticles(dt);

  if (gameState.renderer && gameState.scene && gameState.camera) {
    gameState.renderer.render(gameState.scene, gameState.camera);
  }
}

let gameInitialized = false;
function initGame() {
  if (gameInitialized) return;
  gameInitialized = true;
  gameState.clock = new THREE.Clock();
  gameState.ballVelocity = new THREE.Vector3();
  gameState.touchState.joystickDir = new THREE.Vector2();

  // Initialize set piece dashed aim line
  if (!window.setPieceAimLine) {
    const lineGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(100 * 3);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xa3e635,
      dashSize: 0.25,
      gapSize: 0.15
    });
    window.setPieceAimLine = new THREE.Line(lineGeo, lineMat);
    window.setPieceAimLine.computeLineDistances();
    window.setPieceAimLine.visible = false;
  }

  const bindKeys = (val) => (e) => {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') { gameState.keys.w = val; gameState.keys.arrowUp = val; }
    if (code === 'KeyS' || code === 'ArrowDown') { gameState.keys.s = val; gameState.keys.arrowDown = val; }
    if (code === 'KeyA' || code === 'ArrowLeft') { gameState.keys.a = val; gameState.keys.arrowLeft = val; }
    if (code === 'KeyD' || code === 'ArrowRight') { gameState.keys.d = val; gameState.keys.arrowRight = val; }
    if (code === 'Space') gameState.keys.space = val;
    if (code === 'KeyE') gameState.keys.e = val;
    if (code === 'ShiftLeft' || code === 'ShiftRight') gameState.keys.shift = val;
    if (code === 'KeyQ') gameState.keys.q = val;
    if (code === 'KeyC') gameState.keys.c = val;
  };
  window.addEventListener('keydown', bindKeys(true));
  window.addEventListener('keyup', bindKeys(false));
  window.addEventListener('keydown', handleKeyboardActionTriggers);

  initEngine3D();
  if (gameState.scene && window.setPieceAimLine) {
    gameState.scene.add(window.setPieceAimLine);
  }
  initPlayers();
  AudioSynth.init();
  SocketController.init();
  FirebaseSync.init();
  initMobileTouchEvents();

  // Bind set piece HUD button handlers
  const btnCornerPass = document.getElementById('btn-corner-pass');
  if (btnCornerPass) {
    btnCornerPass.onclick = () => {
      if (gameState.setPiece && gameState.setPiece.active && gameState.setPiece.type === 'corner') {
        gameState.setPiece.mode = 'player';
        const choices = document.getElementById('corner-choices');
        if (choices) choices.style.display = 'none';
        const prompt = document.getElementById('setpiece-prompt');
        if (prompt) prompt.innerText = "Cycle teammates: C / Swap. Cross: E / Pass.";
      }
    };
  }

  const btnCornerDirect = document.getElementById('btn-corner-direct');
  if (btnCornerDirect) {
    btnCornerDirect.onclick = () => {
      if (gameState.setPiece && gameState.setPiece.active && gameState.setPiece.type === 'corner') {
        gameState.setPiece.mode = 'direct';
        const choices = document.getElementById('corner-choices');
        if (choices) choices.style.display = 'none';
        const prompt = document.getElementById('setpiece-prompt');
        if (prompt) prompt.innerText = "Aim: Left/Right Arrows. Cross: E / Pass.";
      }
    };
  }

  const startBootSequence = () => {
    const splash = document.getElementById('boot-stage-splash');
    const loading = document.getElementById('boot-stage-loading');
    const cutscene = document.getElementById('boot-stage-cutscene');
    const loader = document.getElementById('game-loader');

    // Live drifting splash particles
    const pContainer = document.getElementById('splash-particles-container');
    if (pContainer) {
      pContainer.innerHTML = "";
      for (let i = 0; i < 35; i++) {
        const p = document.createElement('div');
        p.className = 'splash-particle';
        p.style.left = Math.random() * 100 + '%';
        const size = Math.random() * 6 + 3;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.animationDelay = Math.random() * 6 + 's';
        p.style.animationDuration = (Math.random() * 4 + 4) + 's';
        pContainer.appendChild(p);
      }
    }

    // Background Ken Burns slideshow
    const splashImgs = splash.querySelectorAll('.slideshow-img');
    let currentSplashIdx = 0;
    const splashSlideInterval = setInterval(() => {
      if (!splash.classList.contains('active')) { clearInterval(splashSlideInterval); return; }
      splashImgs[currentSplashIdx].classList.remove('active');
      currentSplashIdx = (currentSplashIdx + 1) % splashImgs.length;
      splashImgs[currentSplashIdx].classList.add('active');
    }, 4500);

    const closeBootScreen = () => {
      loader.style.opacity = 0;
      AudioSynth.playKick();
      AudioSynth.startCrowdAmbient();
      setTimeout(() => { loader.remove(); }, 600);
    };

    // Kickoff button
    const enterBtn = document.getElementById('btn-splash-enter');
    enterBtn.onclick = (e) => {
      e.stopPropagation();
      enterFullscreen();
      if (AudioSynth.ctx && AudioSynth.ctx.state === 'suspended') AudioSynth.ctx.resume();
      AudioSynth.playKick();

      splash.classList.remove('active');
      loading.classList.add('active');

      // Fast loading bar then straight to cutscene
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 7) + 3;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          document.getElementById('boot-loading-pct').innerText = "100%";
          document.getElementById('boot-loading-fill').style.width = "100%";
          document.getElementById('boot-loading-status').innerText = "READY!";

          setTimeout(() => {
            // Go straight to cutscene (no publisher / anticheat pages)
            loading.classList.remove('active');
            cutscene.classList.add('active');
            AudioSynth.playCheer();

            const subTextEl = document.getElementById('cutscene-sub-text');
            const text = "THE STADIUM IS READY! LET THE GAME BEGIN!";
            subTextEl.innerText = "";
            let charIdx = 0;
            const typeInterval = setInterval(() => {
              subTextEl.innerText += text[charIdx++];
              if (charIdx >= text.length) clearInterval(typeInterval);
            }, 45);

            document.getElementById('btn-skip-cutscene').onclick = closeBootScreen;
            setTimeout(closeBootScreen, 4000); // auto-close after 4s
          }, 400);
        } else {
          document.getElementById('boot-loading-pct').innerText = progress + "%";
          document.getElementById('boot-loading-fill').style.width = progress + "%";
          if (progress < 45) document.getElementById('boot-loading-status').innerText = "WARMING UP THE PITCH...";
          else if (progress < 85) document.getElementById('boot-loading-status').innerText = "LOADING PLAYERS & STADIUM...";
          else document.getElementById('boot-loading-status').innerText = "FINALIZING...";
        }
      }, 55);
    };
  };

    // 1. Generate live drifting splash particles

  startBootSequence();

  // --- NEW STAGE UI FLOW CONTROLLERS ---

  // Populate Country dropdown selectors
  const userCountrySelect = document.getElementById('user-country-select');
  const oppCountrySelect = document.getElementById('opp-country-select');

  if (userCountrySelect && oppCountrySelect) {
    COUNTRIES.forEach(c => {
      const optUser = document.createElement('option');
      optUser.value = c.name;
      optUser.innerText = `${c.flag} ${c.name}`;
      userCountrySelect.appendChild(optUser);

      const optOpp = document.createElement('option');
      optOpp.value = c.name;
      optOpp.innerText = `${c.flag} ${c.name}`;
      oppCountrySelect.appendChild(optOpp);
    });

    // Default values
    userCountrySelect.value = gameState.homeTeam.country;
    oppCountrySelect.value = gameState.awayTeam.country;
  }

  // Update selection card details for both home and away
  const updateTeamSelectUI = () => {
    // Home Card update
    const hCountry = userCountrySelect ? userCountrySelect.value : gameState.homeTeam.country;
    gameState.homeTeam.country = hCountry;
    const hClubs = CLUBS_DATABASE[hCountry] || [];
    const hIdx = gameState.homeTeam.clubIndex;
    const hClub = hClubs[hIdx] || hClubs[0];
    
    if (hClub) {
      document.getElementById('user-team-crest').innerText = hClub.crest;
      document.getElementById('user-team-name').innerText = hClub.name;
      document.getElementById('user-team-att').innerText = hClub.att;
      document.getElementById('user-team-mid').innerText = hClub.mid;
      document.getElementById('user-team-def').innerText = hClub.def;
      document.getElementById('user-team-league').innerText = hClub.league;
    }

    // Away Card update
    const aCountry = oppCountrySelect ? oppCountrySelect.value : gameState.awayTeam.country;
    gameState.awayTeam.country = aCountry;
    const aClubs = CLUBS_DATABASE[aCountry] || [];
    const aIdx = gameState.awayTeam.clubIndex;
    const aClub = aClubs[aIdx] || aClubs[0];

    if (aClub) {
      document.getElementById('opp-team-crest').innerText = aClub.crest;
      document.getElementById('opp-team-name').innerText = aClub.name;
      document.getElementById('opp-team-att').innerText = aClub.att;
      document.getElementById('opp-team-mid').innerText = aClub.mid;
      document.getElementById('opp-team-def').innerText = aClub.def;
      document.getElementById('opp-team-league').innerText = aClub.league;
    }
  };

  if (userCountrySelect) {
    userCountrySelect.onchange = () => {
      gameState.homeTeam.clubIndex = 0;
      // Reset custom lineups so they get re-initialized on team change
      gameState.selectedHomeLineup = null;
      gameState.selectedHomeReserves = null;
      updateTeamSelectUI();
    };
  }
  if (oppCountrySelect) {
    oppCountrySelect.onchange = () => {
      gameState.awayTeam.clubIndex = 0;
      gameState.selectedAwayLineup = null;
      gameState.selectedAwayReserves = null;
      updateTeamSelectUI();
    };
  }

  // Home arrows
  document.getElementById('user-team-prev').onclick = () => {
    const hCountry = userCountrySelect.value;
    const count = CLUBS_DATABASE[hCountry].length;
    gameState.homeTeam.clubIndex = (gameState.homeTeam.clubIndex - 1 + count) % count;
    gameState.selectedHomeLineup = null;
    gameState.selectedHomeReserves = null;
    updateTeamSelectUI();
  };
  document.getElementById('user-team-next').onclick = () => {
    const hCountry = userCountrySelect.value;
    const count = CLUBS_DATABASE[hCountry].length;
    gameState.homeTeam.clubIndex = (gameState.homeTeam.clubIndex + 1) % count;
    gameState.selectedHomeLineup = null;
    gameState.selectedHomeReserves = null;
    updateTeamSelectUI();
  };

  // Away arrows
  document.getElementById('opp-team-prev').onclick = () => {
    const aCountry = oppCountrySelect.value;
    const count = CLUBS_DATABASE[aCountry].length;
    gameState.awayTeam.clubIndex = (gameState.awayTeam.clubIndex - 1 + count) % count;
    gameState.selectedAwayLineup = null;
    gameState.selectedAwayReserves = null;
    updateTeamSelectUI();
  };
  document.getElementById('opp-team-next').onclick = () => {
    const aCountry = oppCountrySelect.value;
    const count = CLUBS_DATABASE[aCountry].length;
    gameState.awayTeam.clubIndex = (gameState.awayTeam.clubIndex + 1) % count;
    gameState.selectedAwayLineup = null;
    gameState.selectedAwayReserves = null;
    updateTeamSelectUI();
  };

  // Initialize Select Teams UI
  updateTeamSelectUI();
  window.updateTeamSelectUI = updateTeamSelectUI;
  window.userCountrySelect = userCountrySelect;
  window.oppCountrySelect = oppCountrySelect;
  window.gameState = gameState;
  window.CLUBS_DATABASE = CLUBS_DATABASE;

  // Helper to resolve flag emojis for captain cards
  const getCrestFlagEmoji = (countryName) => {
    const found = COUNTRIES.find(c => c.name === countryName);
    return found ? found.flag : '⚽';
  };

  // Helper to generate realistic stats based on player name/role/rating
  const getCardPlayerStats = (name, role, baseRating) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hashVal = Math.abs(hash);

    let basePac = 75, baseSho = 70, basePas = 70, baseDri = 72, baseDef = 40, basePhy = 65;
    if (role === 'ST' || role === 'LW' || role === 'RW' || role === 'CF') {
      basePac = 88; baseSho = 86; basePas = 78; baseDri = 84; baseDef = 35; basePhy = 72;
    } else if (role === 'CAM' || role === 'CM' || role === 'LM' || role === 'RM') {
      basePac = 80; baseSho = 78; basePas = 86; baseDri = 83; baseDef = 56; basePhy = 74;
    } else if (role === 'CB' || role === 'LB' || role === 'RB') {
      basePac = 78; baseSho = 46; basePas = 70; baseDri = 70; baseDef = 86; basePhy = 83;
    } else if (role === 'GK') {
      basePac = 55; baseSho = 35; basePas = 65; baseDri = 65; baseDef = 85; basePhy = 75;
    }

    const overall = Math.min(99, Math.max(72, baseRating + (hashVal % 5) - 2));
    const pac = Math.min(99, Math.max(50, basePac + (hashVal % 9) - 4));
    const sho = Math.min(99, Math.max(30, baseSho + ((hashVal >> 1) % 9) - 4));
    const pas = Math.min(99, Math.max(40, basePas + ((hashVal >> 2) % 9) - 4));
    const dri = Math.min(99, Math.max(40, baseDri + ((hashVal >> 3) % 9) - 4));
    const def = Math.min(99, Math.max(15, baseDef + ((hashVal >> 4) % 9) - 4));
    const phy = Math.min(99, Math.max(50, basePhy + ((hashVal >> 5) % 9) - 4));

    // Avatar emoji
    let avatar = '👑';
    if (role === 'GK' || role === 'CB') avatar = '🛡️';
    else if (role === 'CM' || role === 'CAM') avatar = '🎯';
    else if (role === 'LM' || role === 'RM') avatar = '⚡';
    else if (role === 'ST' && overall > 90) avatar = '👑';
    else if (overall > 90) avatar = '👑';
    else avatar = '⚽';

    return { overall, pac, sho, pas, dri, def, phy, avatar };
  };

  // Confirm Teams -> Goto Match Preview
  document.getElementById('btn-confirm-teams').onclick = () => {
    const hCountry = userCountrySelect.value;
    const hIdx = gameState.homeTeam.clubIndex;
    const hClub = CLUBS_DATABASE[hCountry][hIdx];

    const aCountry = oppCountrySelect.value;
    const aIdx = gameState.awayTeam.clubIndex;
    const aClub = CLUBS_DATABASE[aCountry][aIdx];

    if (!hClub || !aClub) return;

    // Transition panels
    document.getElementById('menu-matchup-view').style.display = 'none';
    document.getElementById('match-preview-screen').style.display = 'flex';

    // Populate preview details
    document.getElementById('preview-home-crest').innerText = hClub.crest;
    document.getElementById('preview-home-name').innerText = hClub.name;

    // Home Captain Card Details
    const hCap = hClub.players[0];
    const hStats = getCardPlayerStats(hCap.name, hCap.role || 'ST', hClub.att);
    document.getElementById('preview-home-cap').innerText = hCap.name;
    document.getElementById('preview-home-rating').innerText = hStats.overall;
    document.getElementById('preview-home-pos').innerText = hCap.role || 'ST';
    document.getElementById('preview-home-flag').innerText = getCrestFlagEmoji(hCountry);
    document.getElementById('preview-home-avatar').innerHTML = `<span>${hStats.avatar}</span>`;
    document.getElementById('preview-home-pac').innerText = hStats.pac;
    document.getElementById('preview-home-dri').innerText = hStats.dri;
    document.getElementById('preview-home-sho').innerText = hStats.sho;
    document.getElementById('preview-home-def').innerText = hStats.def;
    document.getElementById('preview-home-pas').innerText = hStats.pas;
    document.getElementById('preview-home-phy').innerText = hStats.phy;

    // Away Captain Card Details
    const aCap = aClub.players[0];
    const aStats = getCardPlayerStats(aCap.name, aCap.role || 'ST', aClub.att);
    document.getElementById('preview-away-cap').innerText = aCap.name;
    document.getElementById('preview-away-rating').innerText = aStats.overall;
    document.getElementById('preview-away-pos').innerText = aCap.role || 'ST';
    document.getElementById('preview-away-flag').innerText = getCrestFlagEmoji(aCountry);
    document.getElementById('preview-away-avatar').innerHTML = `<span>${aStats.avatar}</span>`;
    document.getElementById('preview-away-pac').innerText = aStats.pac;
    document.getElementById('preview-away-dri').innerText = aStats.dri;
    document.getElementById('preview-away-sho').innerText = aStats.sho;
    document.getElementById('preview-away-def').innerText = aStats.def;
    document.getElementById('preview-away-pas').innerText = aStats.pas;
    document.getElementById('preview-away-phy').innerText = aStats.phy;
  };

  // Match Preview Back -> Goto Team Selector
  document.getElementById('btn-back-to-teams').onclick = () => {
    document.getElementById('match-preview-screen').style.display = 'none';
    document.getElementById('menu-matchup-view').style.display = 'flex';
  };

  // Go to Team Management
  let selectedPlayerIndex = null;
  let selectedReserveIndex = null;

  document.getElementById('btn-goto-management').onclick = () => {
    document.getElementById('match-preview-screen').style.display = 'none';
    document.getElementById('team-management-screen').style.display = 'flex';

    // Load active setups
    const hCountry = userCountrySelect.value;
    const hIdx = gameState.homeTeam.clubIndex;
    const hClub = CLUBS_DATABASE[hCountry][hIdx];

    document.getElementById('mgt-team-title').innerText = `${hClub.name.toUpperCase()} DEFAULT`;

    // Populate Formation choices
    const formSelect = document.getElementById('mgt-formation-select');
    formSelect.innerHTML = "";
    Object.keys(FORMATIONS).forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.innerText = f;
      formSelect.appendChild(opt);
    });
    formSelect.value = gameState.homeFormation;

    // Load dynamic lineups
    if (!gameState.selectedHomeLineup) {
      gameState.selectedHomeLineup = JSON.parse(JSON.stringify(hClub.players.filter(p => p.role !== 'GK')));
      gameState.selectedHomeReserves = JSON.parse(JSON.stringify(hClub.reserves));
    }

    // Initialize tactics & roles state if missing
    if (!gameState.tactics) {
      gameState.tactics = {
        style: "balanced",
        buildup: "balanced",
        defense: "balanced",
        mentality: "balanced"
      };
    }
    if (!gameState.roles) {
      gameState.roles = {
        captain: 0,
        penalty: 0,
        fk: 0,
        corner: 0
      };
    }

    // Keep backups for Discard option!
    const lineupBackup = JSON.stringify(gameState.selectedHomeLineup);
    const reservesBackup = JSON.stringify(gameState.selectedHomeReserves);
    const formationBackup = gameState.homeFormation;
    const tacticsBackup = JSON.stringify(gameState.tactics);
    const rolesBackup = JSON.stringify(gameState.roles);

    document.getElementById('btn-discard-management').onclick = () => {
      AudioSynth.playKick();
      gameState.selectedHomeLineup = JSON.parse(lineupBackup);
      gameState.selectedHomeReserves = JSON.parse(reservesBackup);
      gameState.homeFormation = formationBackup;
      gameState.tactics = JSON.parse(tacticsBackup);
      gameState.roles = JSON.parse(rolesBackup);

      const swapContainer = document.getElementById('mgt-swap-container');
      if (swapContainer) swapContainer.style.display = 'none';

      document.getElementById('team-management-screen').style.display = 'none';
      document.getElementById('match-preview-screen').style.display = 'block';
    };

    // Shared Save / Discard Button Mappings
    document.querySelectorAll('.btn-save-mgt-shared').forEach(btn => {
      btn.onclick = () => document.getElementById('btn-save-management').click();
    });
    document.querySelectorAll('.btn-discard-mgt-shared').forEach(btn => {
      btn.onclick = () => document.getElementById('btn-discard-management').click();
    });

    const tabSquad = document.getElementById('mgt-tab-squad');
    const tabTactics = document.getElementById('mgt-tab-tactics');
    const tabRoles = document.getElementById('mgt-tab-roles');

    const viewSquad = document.getElementById('mgt-view-squad');
    const viewTactics = document.getElementById('mgt-view-tactics');
    const viewRoles = document.getElementById('mgt-view-roles');

    const selectTab = (tabName) => {
      AudioSynth.playKick();
      [tabSquad, tabTactics, tabRoles].forEach(tab => {
        if (tab) {
          tab.style.color = "rgba(255, 255, 255, 0.4)";
          tab.style.borderBottom = "none";
          tab.style.paddingBottom = "0px";
          tab.style.marginBottom = "0px";
        }
      });
      [viewSquad, viewTactics, viewRoles].forEach(view => {
        if (view) view.style.display = "none";
      });

      if (tabName === "squad") {
        if (tabSquad) {
          tabSquad.style.color = "#a3e635";
          tabSquad.style.borderBottom = "3px solid #a3e635";
          tabSquad.style.paddingBottom = "16px";
          tabSquad.style.marginBottom = "-18px";
        }
        if (viewSquad) viewSquad.style.display = "flex";
        renderManagementLineup();
      } else if (tabName === "tactics") {
        if (tabTactics) {
          tabTactics.style.color = "#a3e635";
          tabTactics.style.borderBottom = "3px solid #a3e635";
          tabTactics.style.paddingBottom = "16px";
          tabTactics.style.marginBottom = "-18px";
        }
        if (viewTactics) viewTactics.style.display = "flex";
        renderTacticsView();
      } else if (tabName === "roles") {
        if (tabRoles) {
          tabRoles.style.color = "#a3e635";
          tabRoles.style.borderBottom = "3px solid #a3e635";
          tabRoles.style.paddingBottom = "16px";
          tabRoles.style.marginBottom = "-18px";
        }
        if (viewRoles) viewRoles.style.display = "flex";
        renderRolesView();
      }
    };

    if (tabSquad) tabSquad.onclick = () => selectTab("squad");
    if (tabTactics) tabTactics.onclick = () => selectTab("tactics");
    if (tabRoles) tabRoles.onclick = () => selectTab("roles");

    selectedPlayerIndex = null;
    selectedReserveIndex = null;

    // Hide swap select
    const swapContainer = document.getElementById('mgt-swap-container');
    if (swapContainer) swapContainer.style.display = 'none';

    // Force default to squad view
    selectTab("squad");

    formSelect.onchange = () => {
      gameState.homeFormation = formSelect.value;
      renderManagementLineup();
    };
  };

  const renderManagementLineup = () => {
    const grid = document.getElementById('mgt-starting-grid');
    const bench = document.getElementById('mgt-reserves-row');
    const dotsContainer = document.getElementById('mgt-pitch-dots-container');

    grid.innerHTML = "";
    bench.innerHTML = "";
    if (dotsContainer) dotsContainer.innerHTML = "";

    const slots = FORMATIONS[gameState.homeFormation];
    const lineup = gameState.selectedHomeLineup;
    const reserves = gameState.selectedHomeReserves;

    // Render Starting XI
    lineup.forEach((player, idx) => {
      const slot = slots[idx] || { role: "ST", pos: { x: 0, z: 0 } };
      
      const pctX = ((slot.pos.x + 55) / 55) * 85 + 5;
      const pctZ = ((slot.pos.z + 35) / 70) * 82 + 9;

      const card = document.createElement('div');
      card.className = `mgt-player-card ${selectedPlayerIndex === idx ? 'selected' : ''}`;
      card.style.left = `${pctX}%`;
      card.style.top = `${pctZ}%`;

      // Get last name for compact styling
      const lastName = player.name.split(' ').pop();

      card.innerHTML = `
        <div class="mgt-card-name">${lastName}</div>
        <div class="mgt-card-pos">${slot.role}</div>
      `;

      card.onclick = () => {
        if (selectedPlayerIndex === idx) {
          selectedPlayerIndex = null;
          const swapContainer = document.getElementById('mgt-swap-container');
          if (swapContainer) swapContainer.style.display = 'none';
        } else {
          selectedPlayerIndex = idx;
          selectedReserveIndex = null;
          showPlayerDetails(player, slot.role, idx, true);
        }
        renderManagementLineup();
      };

      grid.appendChild(card);

      if (dotsContainer) {
        const dot = document.createElement('div');
        dot.className = 'pitch-dot';
        dot.style.left = `${((slot.pos.x + 55) / 110) * 100}%`;
        dot.style.top = `${((slot.pos.z + 35) / 70) * 100}%`;
        dotsContainer.appendChild(dot);
      }
    });

    // Render Reserves
    reserves.forEach((player, idx) => {
      const card = document.createElement('div');
      card.className = `mgt-reserve-card ${selectedReserveIndex === idx ? 'selected' : ''}`;
      
      const lastName = player.name.split(' ').pop();

      card.innerHTML = `
        <div style="font-size:0.7rem; color:#fff; font-weight:800;">${lastName}</div>
        <div style="font-size:0.58rem; color:#a3e635; font-weight:bold; margin-top:2px;">${player.role}</div>
        <div style="font-size:0.55rem; color:rgba(255,255,255,0.4); margin-top:2px;">#${player.number}</div>
      `;

      card.onclick = () => {
        if (selectedReserveIndex === idx) {
          selectedReserveIndex = null;
          const swapContainer = document.getElementById('mgt-swap-container');
          if (swapContainer) swapContainer.style.display = 'none';
        } else {
          selectedReserveIndex = idx;
          selectedPlayerIndex = null;
          showPlayerDetails(player, player.role, idx, false);
        }
        renderManagementLineup();
      };

      bench.appendChild(card);
    });
  };

  const showPlayerDetails = (player, role, idx, isStarter) => {
    document.getElementById('mgt-pname').innerText = player.name;
    document.getElementById('mgt-prole').innerText = `ROLE: ${role} | JERSEY #${player.number}`;

    const statsSeed = player.name.charCodeAt(0) + player.number;
    const genStat = (min, max, offset) => min + ((statsSeed * offset) % (max - min));

    let pac = genStat(75, 94, 3);
    let sho = genStat(68, 92, 5);
    let pas = genStat(72, 95, 7);
    let dri = genStat(75, 96, 9);
    let def = genStat(40, 85, 11);

    if (role === 'LB' || role === 'RB' || role === 'LCB' || role === 'RCB') {
      def = genStat(80, 92, 11);
      sho = genStat(45, 68, 5);
    }

    document.getElementById('mgt-stat-pac').innerText = pac;
    document.getElementById('mgt-stat-sho').innerText = sho;
    document.getElementById('mgt-stat-pas').innerText = pas;
    document.getElementById('mgt-stat-dri').innerText = dri;
    document.getElementById('mgt-stat-def').innerText = def;

    document.getElementById('mgt-bar-pac').style.width = `${pac}%`;
    document.getElementById('mgt-bar-sho').style.width = `${sho}%`;
    document.getElementById('mgt-bar-pas').style.width = `${pas}%`;
    document.getElementById('mgt-bar-dri').style.width = `${dri}%`;
    document.getElementById('mgt-bar-def').style.width = `${def}%`;

    // Populate Swap Options Dropdown
    const swapContainer = document.getElementById('mgt-swap-container');
    const swapSelect = document.getElementById('mgt-swap-select');
    const swapBtn = document.getElementById('mgt-swap-btn');

    if (swapContainer && swapSelect && swapBtn) {
      swapContainer.style.display = 'block';
      swapSelect.innerHTML = "";

      const slots = FORMATIONS[gameState.homeFormation];
      const lineup = gameState.selectedHomeLineup;
      const reserves = gameState.selectedHomeReserves;

      // Add starters options
      lineup.forEach((p, sIdx) => {
        if (isStarter && sIdx === idx) return; // skip self
        const sRole = slots[sIdx] ? slots[sIdx].role : 'ST';
        const opt = document.createElement('option');
        opt.value = `starter:${sIdx}`;
        opt.innerText = `${p.name} (${sRole})`;
        swapSelect.appendChild(opt);
      });

      // Add bench reserves options
      reserves.forEach((p, rIdx) => {
        if (!isStarter && rIdx === idx) return; // skip self
        const opt = document.createElement('option');
        opt.value = `reserve:${rIdx}`;
        opt.innerText = `${p.name} (Bench)`;
        swapSelect.appendChild(opt);
      });

      swapBtn.onclick = () => {
        AudioSynth.playKick();
        const val = swapSelect.value;
        if (!val) return;

        const parts = val.split(':');
        const type = parts[0];
        const targetIdx = parseInt(parts[1]);

        if (isStarter) {
          if (type === 'starter') {
            const temp = lineup[idx];
            lineup[idx] = lineup[targetIdx];
            lineup[targetIdx] = temp;
          } else {
            const temp = lineup[idx];
            lineup[idx] = reserves[targetIdx];
            reserves[targetIdx] = temp;
          }
        } else {
          if (type === 'starter') {
            const temp = reserves[idx];
            reserves[idx] = lineup[targetIdx];
            lineup[targetIdx] = temp;
          } else {
            const temp = reserves[idx];
            reserves[idx] = reserves[targetIdx];
            reserves[targetIdx] = temp;
          }
        }

        // Clear selection
        selectedPlayerIndex = null;
        selectedReserveIndex = null;
        swapContainer.style.display = 'none';

        renderManagementLineup();
      };
    }
  };

  const renderTacticsView = () => {
    const styleSel = document.getElementById('tactic-style-select');
    const buildupSel = document.getElementById('tactic-buildup-select');
    const defenseSel = document.getElementById('tactic-defense-select');
    const mentalitySel = document.getElementById('tactic-mentality-select');

    if (!styleSel || !buildupSel || !defenseSel || !mentalitySel) return;

    styleSel.value = gameState.tactics.style;
    buildupSel.value = gameState.tactics.buildup;
    defenseSel.value = gameState.tactics.defense;
    mentalitySel.value = gameState.tactics.mentality;

    const updateDescription = () => {
      const style = styleSel.value;
      const descIcon = document.getElementById('tactic-description-icon');
      const descTitle = document.getElementById('tactic-description-title');
      const descText = document.getElementById('tactic-description-text');
      const ch1 = document.getElementById('tactic-check-1');
      const ch2 = document.getElementById('tactic-check-2');
      const ch3 = document.getElementById('tactic-check-3');

      if (!descIcon || !descTitle || !descText || !ch1 || !ch2 || !ch3) return;

      if (style === 'balanced') {
        descIcon.innerText = "🛡️";
        descTitle.innerText = "BALANCED SETUP";
        descText.innerText = "Standard tactical setup with balanced attacking support and structured defensive positioning. Best suited for fluid match control.";
        ch1.innerText = "Flexible Build-Up Option";
        ch2.innerText = "Maintains Team Structure";
        ch3.innerText = "Adaptive Pressing Level";
      } else if (style === 'tikitaka') {
        descIcon.innerText = "⚽";
        descTitle.innerText = "TIKI-TAKA";
        descText.innerText = "Focuses on high ball possession, extremely short passing, and triangular player movements. Players remain close together to maintain options.";
        ch1.innerText = "Excellent Possession Control";
        ch2.innerText = "Short Triangular Passes";
        ch3.innerText = "Slow Patient Build-Up";
      } else if (style === 'gegenpress') {
        descIcon.innerText = "⚡";
        descTitle.innerText = "GEGENPRESSING";
        descText.innerText = "Focuses on high-intensity pressing immediately upon losing possession. The team pushes high up the pitch to suffocate opponent build-up.";
        ch1.innerText = "Immediate Counter-Press";
        ch2.innerText = "High Suffocation Line";
        ch3.innerText = "High Stamina Usage";
      } else if (style === 'counter') {
        descIcon.innerText = "🏃‍♂️";
        descTitle.innerText = "COUNTER-ATTACK";
        descText.innerText = "Defends deep in a structured block. Upon winning the ball, quickly transition with direct, long passes to rapid wingers and strikers.";
        ch1.innerText = "Defend Deep Block";
        ch2.innerText = "Rapid Transitions";
        ch3.innerText = "Direct Long Passes";
      } else if (style === 'wingplay') {
        descIcon.innerText = "📐";
        descTitle.innerText = "WING PLAY";
        descText.innerText = "Forces the build-up wide to the wings. Fullbacks overlap midfielders to deliver crosses into the penalty box for physical strikers.";
        ch1.innerText = "Wide Overlapping Runs";
        ch2.innerText = "Box Crossing Focus";
        ch3.innerText = "Stretches Opponent Line";
      }

      gameState.tactics.style = style;
      gameState.tactics.buildup = buildupSel.value;
      gameState.tactics.defense = defenseSel.value;
      gameState.tactics.mentality = mentalitySel.value;
    };

    styleSel.onchange = updateDescription;
    buildupSel.onchange = updateDescription;
    defenseSel.onchange = updateDescription;
    mentalitySel.onchange = updateDescription;

    updateDescription();
  };

  const renderRolesView = () => {
    const capSel = document.getElementById('role-captain-select');
    const penSel = document.getElementById('role-penalty-select');
    const fkSel = document.getElementById('role-fk-select');
    const corSel = document.getElementById('role-corner-select');

    if (!capSel || !penSel || !fkSel || !corSel) return;

    const lineup = gameState.selectedHomeLineup;

    [capSel, penSel, fkSel, corSel].forEach(sel => {
      sel.innerHTML = "";
      lineup.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.innerText = `${p.name} (#${p.number})`;
        sel.appendChild(opt);
      });
    });

    capSel.value = gameState.roles.captain;
    penSel.value = gameState.roles.penalty;
    fkSel.value = gameState.roles.fk;
    corSel.value = gameState.roles.corner;

    const updateAssignments = () => {
      gameState.roles.captain = parseInt(capSel.value);
      gameState.roles.penalty = parseInt(penSel.value);
      gameState.roles.fk = parseInt(fkSel.value);
      gameState.roles.corner = parseInt(corSel.value);
    };

    capSel.onchange = updateAssignments;
    penSel.onchange = updateAssignments;
    fkSel.onchange = updateAssignments;
    corSel.onchange = updateAssignments;
  };

  document.getElementById('btn-save-management').onclick = () => {
    AudioSynth.playKick();
    document.getElementById('team-management-screen').style.display = 'none';
    document.getElementById('match-preview-screen').style.display = 'block';

    initPlayers();
  };

  // ── COIN TOSS CONTROLLER ──
  // ── 3D CINEMATIC CUTSCENE ENGINE ──────────────────────────────────────────
  function create3DCoin() {
    const coinGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.05, 32);
    const sideMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.9, roughness: 0.1 });

    const makeFaceTexture = (text) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d');

      const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
      grad.addColorStop(0, '#fef3c7');
      grad.addColorStop(0.5, '#fbbf24');
      grad.addColorStop(1, '#d97706');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(64, 64, 60, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#b45309'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(64, 64, 56, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = '#78350f'; ctx.font = 'bold 64px "Orbitron", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, 64, 64);

      return new THREE.CanvasTexture(canvas);
    };

    const headsTex = makeFaceTexture('H');
    const tailsTex = makeFaceTexture('T');
    const headsMat = new THREE.MeshStandardMaterial({ map: headsTex, metalness: 0.9, roughness: 0.15 });
    const tailsMat = new THREE.MeshStandardMaterial({ map: tailsTex, metalness: 0.9, roughness: 0.15 });

    const coinMesh = new THREE.Mesh(coinGeo, [sideMat, headsMat, tailsMat]);
    coinMesh.castShadow = true;
    coinMesh.receiveShadow = true;
    return coinMesh;
  }

  function cleanupCinematicEntities() {
    if (gameState.cinematic && gameState.cinematic.entities) {
      gameState.cinematic.entities.forEach(ent => {
        gameState.scene.remove(ent.group);
      });
      gameState.cinematic.entities = [];
    }
    if (gameState.cinematic && gameState.cinematic.coinMesh) {
      gameState.scene.remove(gameState.cinematic.coinMesh);
      gameState.cinematic.coinMesh = null;
    }
  }

  function moveEntityTowards(ent, target, speed, dt) {
    const diff = target.clone().sub(ent.group.position);
    const dist = diff.length();
    if (dist < 0.15) {
      ent.velocity.set(0, 0, 0);
      return true;
    }
    const dir = diff.normalize();
    ent.velocity.copy(dir).multiplyScalar(speed);
    ent.group.position.addScaledVector(ent.velocity, dt);
    ent.facingDir.copy(dir);
    ent.group.rotation.y = Math.atan2(dir.x, dir.z);
    return false;
  }

  // ── TEAM HYPE ──
  const showTeamHype = (onDone) => {
    const screen = document.getElementById('team-hype-screen');
    screen.style.display = 'block';

    const hCountry = gameState.homeTeam.country;
    const hIdx = gameState.homeTeam.clubIndex;
    const hClub = CLUBS_DATABASE[hCountry][hIdx];

    const aCountry = gameState.awayTeam.country;
    const aIdx = gameState.awayTeam.clubIndex;
    const aClub = CLUBS_DATABASE[aCountry][aIdx];

    const hCapName = hClub && hClub.players && hClub.players[0] ? hClub.players[0].name : "Captain";
    const hCapRole = hClub && hClub.players && hClub.players[0] ? hClub.players[0].role : "ST";
    const hCapNum = hClub && hClub.players && hClub.players[0] ? hClub.players[0].number : "10";

    const aCapName = aClub && aClub.players && aClub.players[0] ? aClub.players[0].name : "Captain";
    const aCapRole = aClub && aClub.players && aClub.players[0] ? aClub.players[0].role : "ST";
    const aCapNum = aClub && aClub.players && aClub.players[0] ? aClub.players[0].number : "10";

    document.getElementById('hype-home-label').innerText = hClub.name || 'HOME';
    document.getElementById('hype-away-label').innerText = aClub.name || 'AWAY';

    // Populate Captain Cards
    document.getElementById('hype-home-cap-role').innerText = hCapRole;
    document.getElementById('hype-home-cap-number').innerText = hCapNum;
    document.getElementById('hype-home-cap-name').innerText = hCapName;

    document.getElementById('hype-away-cap-role').innerText = aCapRole;
    document.getElementById('hype-away-cap-number').innerText = aCapNum;
    document.getElementById('hype-away-cap-name').innerText = aCapName;

    // Generate bar meters for ATT/DEF based on team statistics
    const makeHypeBar = (stat) => {
      const bars = Math.round(stat / 10);
      return 'ATTACK ' + '█'.repeat(bars) + '░'.repeat(10 - bars);
    };
    const makeHypeDefBar = (stat) => {
      const bars = Math.round(stat / 10);
      return 'DEFENSE ' + '█'.repeat(bars) + '░'.repeat(10 - bars);
    };

    document.getElementById('hype-home-att-bar').innerText = makeHypeBar(hClub.att || 85);
    document.getElementById('hype-home-def-bar').innerText = makeHypeDefBar(hClub.def || 85);
    document.getElementById('hype-away-att-bar').innerText = makeHypeBar(aClub.att || 85);
    document.getElementById('hype-away-def-bar').innerText = makeHypeDefBar(aClub.def || 85);

    // Apply dynamic gradients matching team jersey colors
    const homePanel = document.getElementById('hype-home-panel');
    const awayPanel = document.getElementById('hype-away-panel');
    if (homePanel && hClub) {
      homePanel.style.background = `linear-gradient(135deg, ${hClub.colorHex}55 0%, #020817f5 70%)`;
    }
    if (awayPanel && aClub) {
      awayPanel.style.background = `linear-gradient(225deg, ${aClub.colorHex}55 0%, #020817f5 70%)`;
    }

    // Start 3D camera stadium sweep background
    gameState.cinematic = { active: true, type: 'hype', timer: 0, entities: [] };

    setTimeout(() => {
      const bar = document.getElementById('hype-progress-line');
      if (bar) bar.style.width = '100%';
    }, 50);

    setTimeout(() => {
      screen.style.opacity = '0';
      screen.style.transition = 'opacity 0.4s ease';
      setTimeout(() => {
        screen.style.display = 'none';
        screen.style.opacity = '';
        screen.style.transition = '';
        onDone();
      }, 420);
    }, 3200);
  };

  // ── 3D COIN TOSS INITIALIZER ──
  const startTossSequence = (onComplete) => {
    // Clear gameplay elements first
    gameState.players.forEach(p => gameState.scene.remove(p.group));
    gameState.players.length = 0;
    if (gameState.ballMesh) gameState.ballMesh.visible = false; // Hide gameplay ball so it doesn't block the coin!

    // Spawn 3D cinematic entities (referee starts further back, captains on sides)
    const ref = new PlayerAgent('referee', 0, new THREE.Vector3(0, 0, -5.5));
    const capHome = new PlayerAgent(TEAMS.RED, 10, new THREE.Vector3(-14, 0, 0));
    const capAway = new PlayerAgent(TEAMS.BLUE, 10, new THREE.Vector3(14, 0, 0));

    ref.group.lookAt(0, 0, 0);
    capHome.group.lookAt(0, 0, 0);
    capAway.group.lookAt(0, 0, 0);

    gameState.cinematic = {
      active: true,
      type: 'toss',
      phase: 0,
      timer: 0,
      ref: ref,
      capHome: capHome,
      capAway: capAway,
      entities: [ref, capHome, capAway],
      coinMesh: null,
      coinVelocity: new THREE.Vector3(),
      coinResultIsHeads: true,
      userWon: false,
      onComplete: onComplete
    };

    // Show HTML HUD choices overlay
    const screen = document.getElementById('toss-screen');
    screen.style.display = 'block';

    document.getElementById('toss-home-name').innerText = (gameState.userTeamName || 'HOME').toUpperCase() + ' CAPTAIN';
    document.getElementById('toss-away-name').innerText = (gameState.oppTeamName || 'AWAY').toUpperCase() + ' CAPTAIN';

    // Hide 2D HTML figures
    const capHomeHtml = document.getElementById('toss-cap-home');
    const capAwayHtml = document.getElementById('toss-cap-away');
    const refHtml = document.querySelector('.toss-referee');
    const coinSceneHtml = document.getElementById('toss-coin-scene');

    if (capHomeHtml) capHomeHtml.style.display = 'none';
    if (capAwayHtml) capAwayHtml.style.display = 'none';
    if (refHtml) refHtml.style.display = 'none';
    if (coinSceneHtml) coinSceneHtml.style.display = 'none';

    const label = document.getElementById('toss-result-label');
    const prompt = document.getElementById('toss-choose-prompt');
    const decBox = document.getElementById('toss-decision-buttons');
    const oppBox = document.getElementById('toss-opponent-decision');

    label.innerText = 'Captains are walking to the center...';
    prompt.style.display = 'none';
    decBox.style.display = 'none';
    oppBox.style.display = 'none';

    const handleFlip = (userChoice) => {
      prompt.style.display = 'none';
      label.innerText = 'Coin is in the air...';
      AudioSynth.playKick();

      // Setup 3D Coin Physics (spawned near referee's hands, thrown up towards center spot)
      const isHeads = Math.random() < 0.5;
      const coinMesh = create3DCoin();
      coinMesh.position.set(0, 1.3, -1.8);
      gameState.scene.add(coinMesh);

      const cin = gameState.cinematic;
      cin.coinMesh = coinMesh;
      cin.coinVelocity.set(0, 11.5, 3.2); // throw upwards and slightly forward to land on center spot (0,0,0)
      cin.coinResultIsHeads = isHeads;
      cin.userWon = (userChoice === 'heads' && isHeads) || (userChoice === 'tails' && !isHeads);
      cin.phase = 2; // air time phase
    };

    document.getElementById('btn-toss-heads').onclick = () => handleFlip('heads');
    document.getElementById('btn-toss-tails').onclick = () => handleFlip('tails');
  };

  // ── 3D WALKOUT INITIALIZER ──
  const startWalkoutSequence = (userKicksOff) => {
    cleanupCinematicEntities();
    if (gameState.ballMesh) gameState.ballMesh.visible = true; // Show gameplay ball for the match

    // Spawn 22 players side by side at sideline
    const entities = [];
    for (let i = 0; i < 11; i++) {
      const plHome = new PlayerAgent(TEAMS.RED, i + 2, new THREE.Vector3(-45.0 - i * 2.0, 0, -1.5));
      const plAway = new PlayerAgent(TEAMS.BLUE, i + 2, new THREE.Vector3(-45.0 - i * 2.0, 0, 1.5));
      entities.push(plHome, plAway);
    }

    gameState.cinematic = {
      active: true,
      type: 'walkout',
      timer: 0,
      entities: entities,
      userKicksOff: userKicksOff
    };

    const screen = document.getElementById('walkout-screen');
    screen.style.display = 'block';
    document.getElementById('walkout-players-row').style.display = 'none'; // hide 2D

    document.getElementById('walkout-home-team').innerText = gameState.userTeamName || 'HOME';
    document.getElementById('walkout-away-team').innerText = gameState.oppTeamName || 'AWAY';

    AudioSynth.playCheer && AudioSynth.playCheer();

    const endCinematic = () => {
      cleanupCinematicEntities();
      gameState.cinematic = null;
      screen.style.display = 'none';
      document.getElementById('toss-screen').style.display = 'none';

      document.getElementById('game-hud').style.display = 'flex';
      if (AudioSynth.ctx && AudioSynth.ctx.state === 'suspended') AudioSynth.ctx.resume();
      AudioSynth.playWhistle();
      AudioSynth.startCrowdAmbient();
      resetEntireMatch(userKicksOff);
    };

    document.getElementById('btn-skip-walkout').onclick = endCinematic;
    gameState.cinematic.skipFn = endCinematic;
  };

  // ── CINEMATIC TICK LOOP ──
  window.updateCinematicLoop = function(dt) {
    const cin = gameState.cinematic;
    cin.timer += dt;

    // Entity updates for legs swinging animation
    cin.entities.forEach(ent => {
      ent.update(dt, false);
    });

    if (cin.type === 'hype') {
      // Empty stadium orbital camera sweep
      const sweepAngle = cin.timer * 0.15;
      gameState.camera.position.set(Math.sin(sweepAngle) * 55.0, 16.0, Math.cos(sweepAngle) * 55.0);
      gameState.camera.lookAt(0, 2.0, 0);
    }
    else if (cin.type === 'toss') {
      if (cin.phase === 0) {
        // Phase 0: Captains and Referee walk to center circle (neat spacing, no clumping)
        const targetHome = new THREE.Vector3(-2.4, 0, 0);
        const targetAway = new THREE.Vector3(2.4, 0, 0);
        const targetRef  = new THREE.Vector3(0, 0, -2.2);

        const homeArrived = moveEntityTowards(cin.capHome, targetHome, 4.2, dt);
        const awayArrived = moveEntityTowards(cin.capAway, targetAway, 4.2, dt);
        const refArrived  = moveEntityTowards(cin.ref, targetRef, 3.2, dt);

        // Circular sweep around circle
        const sweepAngle = cin.timer * 0.16;
        gameState.camera.position.set(Math.sin(sweepAngle) * 11.0, 2.8, Math.cos(sweepAngle) * 11.0);
        gameState.camera.lookAt(0, 0.8, 0);

        if (homeArrived && awayArrived && refArrived) {
          cin.capHome.group.lookAt(cin.capAway.group.position);
          cin.capAway.group.lookAt(cin.capHome.group.position);
          cin.ref.group.lookAt(0, 0, 0);
          cin.phase = 1;

          document.getElementById('toss-choose-prompt').style.display = 'block';
          document.getElementById('toss-result-label').innerText = 'Call it — heads or tails?';
        }
      }
      else if (cin.phase === 1) {
        // Waiting for choice - subtle drifting camera
        const sweepAngle = cin.timer * 0.08;
        gameState.camera.position.set(Math.sin(sweepAngle) * 8.5, 2.2 + Math.sin(cin.timer * 0.5) * 0.1, Math.cos(sweepAngle) * 8.5);
        gameState.camera.lookAt(0, 0.8, 0);
      }
      else if (cin.phase === 2) {
        // Referee arm flip
        cin.ref.rightArm.rotation.x = -Math.PI * 0.85;

        // Apply gravity and update 3D coin position
        if (cin.coinMesh) {
          cin.coinVelocity.y -= 9.8 * 1.6 * dt; // gravity
          cin.coinMesh.position.addScaledVector(cin.coinVelocity, dt);
          cin.coinMesh.rotation.x += 22.0 * dt;
          cin.coinMesh.rotation.y += 14.0 * dt;

          // Camera tracks the flying coin dynamically
          const cPos = cin.coinMesh.position;
          gameState.camera.position.set(cPos.x - 4.5, Math.max(3.0, cPos.y + 1.5), cPos.z + 5.0);
          gameState.camera.lookAt(cPos);
        }

        if (cin.coinVelocity.y < 0 && cin.coinMesh && cin.coinMesh.position.y <= 0.02) {
          cin.coinMesh.position.set(0, 0.01, 0); // land exactly on center circle spot
          cin.coinVelocity.set(0, 0, 0);
          cin.coinMesh.rotation.set(cin.coinResultIsHeads ? 0 : Math.PI, 0, 0);

          cin.phase = 3;
          cin.timer = 0;
          AudioSynth.playWhistle();

          // Reveal text result
          const label = document.getElementById('toss-result-label');
          const resStr = cin.coinResultIsHeads ? 'HEADS' : 'TAILS';
          label.innerHTML = `<strong style="color:${cin.coinResultIsHeads ? '#fbbf24' : '#94a3b8'}">${resStr}!</strong>`;

          setTimeout(() => {
            if (cin.userWon) {
              label.innerHTML = `<span style="color:#a3e635;font-weight:800">YOU WIN THE TOSS!</span>`;
              const decBox = document.getElementById('toss-decision-buttons');
              decBox.style.display = 'flex';
              decBox.style.flexDirection = 'column';
              decBox.style.alignItems = 'center';

              document.getElementById('btn-toss-kickoff').onclick = () => startWalkoutSequence(true);
              document.getElementById('btn-toss-defend').onclick = () => startWalkoutSequence(false);
            } else {
              const aiKickoff = Math.random() < 0.5;
              label.innerHTML = `<span style="color:#f87171;font-weight:800">OPPONENT WINS!</span><br>
                <span style="color:rgba(255,255,255,0.5);font-size:0.85rem">They chose to ${aiKickoff ? 'KICK OFF' : 'DEFEND'}</span>`;
              document.getElementById('toss-opponent-decision').style.display = 'block';

              document.getElementById('btn-toss-continue').onclick = () => startWalkoutSequence(!aiKickoff);
            }
          }, 800);
        }
      }
      else if (cin.phase === 3) {
        // Close macro look at the center spot coin
        const cPos = cin.coinMesh ? cin.coinMesh.position : new THREE.Vector3(0, 0, 0);
        const targetCam = new THREE.Vector3(cPos.x - 1.2, 0.9, cPos.z + 1.5);
        gameState.camera.position.lerp(targetCam, 0.08);
        gameState.camera.lookAt(cPos);
      }
    }
    else if (cin.type === 'walkout') {
      // 3D Staggered walkout down the pitch
      const leadX = -48.0 + cin.timer * 6.5;

      let idx = 0;
      cin.entities.forEach(pl => {
        const isHome = pl.team === TEAMS.RED;
        const rowZ = isHome ? -1.6 : 1.6;
        const staggeredX = leadX - Math.floor(idx / 2) * 2.5;

        pl.group.position.set(staggeredX, 0, rowZ);
        pl.velocity.set(6.5, 0, 0);
        pl.facingDir.set(1, 0, 0);
        pl.group.rotation.y = Math.PI / 2;

        idx++;
      });

      // Dolly camera tracking walkout from side
      gameState.camera.position.set(leadX + 6.0, 3.0, -9.5);
      gameState.camera.lookAt(leadX - 3.5, 1.2, 0);

      if (cin.timer > 6.0) {
        if (cin.skipFn) cin.skipFn();
      }
    }
    else if (cin.type === 'foul') {
      const offender = cin.offender;
      const spot = cin.spot;
      
      if (cin.phase === 0) {
        // Referee runs to foul spot
        const ref = gameState.players.find(p => p.team === 'referee');
        if (ref) {
          const refTarget = spot.clone();
          refTarget.z += 1.8;
          moveEntityTowards(ref, refTarget, 5.8, dt);
          ref.group.lookAt(spot);
          
          const midPoint = spot.clone().lerp(ref.group.position, 0.5);
          gameState.camera.position.set(midPoint.x - 3.8, 2.2, midPoint.z + 4.2);
          gameState.camera.lookAt(spot);
        } else {
          gameState.camera.position.set(spot.x - 3.5, 2.0, spot.z + 3.8);
          gameState.camera.lookAt(spot);
        }
      } else if (cin.phase === 1) {
        // Zoom on Referee pulling card
        const ref = gameState.players.find(p => p.team === 'referee');
        if (ref) {
          ref.rightArm.rotation.x = -Math.PI * 0.82; // raise arm
          
          const camTarget = ref.group.position.clone();
          camTarget.x -= 1.6;
          camTarget.y = 1.65;
          camTarget.z += 1.8;
          
          gameState.camera.position.lerp(camTarget, 0.08);
          gameState.camera.lookAt(ref.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
        }
      }
    }

    if (gameState.renderer && gameState.scene && gameState.camera) {
      gameState.renderer.render(gameState.scene, gameState.camera);
    }
  };

  // ── LAUNCH MATCH TRIGGER ──
  const launchMatchWithToss = () => {
    enterFullscreen();

    // Hide ALL menu overlay screens so the 3D canvas is fully visible
    const overlaysToHide = [
      'main-menu-screen',
      'match-preview-screen',
      'menu-matchup-view',
      'menu-dashboard-view',
      'team-management-screen',
      'subscreen-view'
    ];
    overlaysToHide.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    showTeamHype(() => {
      startTossSequence((userKicksOff) => {
        // Kickoff starting handler
      });
    });
  };

  document.getElementById('menu-start-btn').onclick = launchMatchWithToss;

  const onPlayMatchFromSubScreen = (userTeam, oppTeam, difficulty = "pro") => {
    gameState.userTeamName = userTeam;
    gameState.oppTeamName = oppTeam;
    gameState.gameDifficulty = difficulty;
    launchMatchWithToss();
  };

  const openSubscreen = (title, renderFn) => {
    AudioSynth.playKick();
    document.getElementById('menu-dashboard-view').style.display = 'none';
    document.getElementById('menu-matchup-view').style.display = 'none';
    document.getElementById('subscreen-view').style.display = 'flex';
    document.getElementById('subscreen-title-text').innerText = title;
    
    // Sync subscreen coin/gem values
    const coinEl = document.querySelector('.sub-coin-count');
    const gemEl = document.querySelector('.sub-gem-count');
    if (coinEl) coinEl.innerText = (FirebaseSync.profile.coins || 12450).toLocaleString();
    if (gemEl) gemEl.innerText = (FirebaseSync.profile.gems || 860).toLocaleString();

    const wrapper = document.getElementById('subscreen-dynamic-content');
    renderFn(wrapper, onPlayMatchFromSubScreen);
  };

  // Sidebar Tab Button binds with safe wrapper
  const bindClick = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  };

  bindClick('btn-tab-career', () => openSubscreen("CAREER MODE", renderCareer));
  bindClick('btn-tab-tournament', () => openSubscreen("TOURNAMENTS", renderTournament));
  bindClick('btn-tab-multiplayer', () => openSubscreen("MULTIPLAYER", renderMultiplayer));
  bindClick('btn-tab-practice', () => openSubscreen("PRACTICE ARENA", renderPractice));

  // Bottom Nav Bar binds
  bindClick('btn-nav-home', () => {
    AudioSynth.playKick();
    document.getElementById('subscreen-view').style.display = 'none';
    document.getElementById('menu-matchup-view').style.display = 'none';
    const db = document.getElementById('menu-dashboard-view');
    if (db) db.style.display = 'flex';
  });
  bindClick('btn-nav-team', () => openSubscreen("MY SQUAD", renderTeam));
  bindClick('btn-nav-store', () => openSubscreen("FOOTBALL STORE", renderStore));
  bindClick('btn-nav-leaderboard', () => openSubscreen("LEADERBOARD", renderLeaderboard));
  bindClick('dash-settings-btn', () => openSubscreen("SETTINGS", renderSettings));
  // Back from subscreen
  bindClick('btn-subscreen-back', () => {
    AudioSynth.playKick();
    document.getElementById('subscreen-view').style.display = 'none';
    if (window.subscreenSourceView === "match-preview-screen") {
      document.getElementById('match-preview-screen').style.display = 'block';
      window.subscreenSourceView = "dashboard";
    } else {
      const db = document.getElementById('menu-dashboard-view');
      if (db) db.style.display = 'flex';
    }
  });

  // Match Preview Screen Top Nav triggers
  const pSettings = document.getElementById('btn-preview-settings');
  if (pSettings) {
    pSettings.onclick = () => {
      window.subscreenSourceView = "match-preview-screen";
      document.getElementById('match-preview-screen').style.display = 'none';
      openSubscreen("SETTINGS", renderSettings);
    };
  }

  const pManagement = document.getElementById('btn-preview-management');
  if (pManagement) {
    pManagement.onclick = () => {
      document.getElementById('btn-goto-management').click();
    };
  }

  bindClick('btn-quick-kickoff', () => {
    AudioSynth.playKick();
    hideGameplayOverlays();
    const db = document.getElementById('menu-dashboard-view');
    if (db) db.style.display = 'none';
    document.getElementById('menu-matchup-view').style.display = 'flex';
  });  // Back to Dashboard Landing View
  bindClick('btn-back-to-dash', () => {
    AudioSynth.playKick();
    document.getElementById('menu-matchup-view').style.display = 'none';
    const db = document.getElementById('menu-dashboard-view');
    if (db) db.style.display = 'flex';
  });

  const quitToDashboard = () => {
    AudioSynth.stopAll();
    if (window.parent && window.parent !== window && typeof window.parent.closeGameIframe === 'function') {
      window.parent.closeGameIframe();
    } else {
      window.location.href = '/index.html';
    }
  };

  bindClick('menu-dash-btn', quitToDashboard);
  bindClick('pause-dash', quitToDashboard);
  bindClick('match-over-dash', quitToDashboard);

  const fsBtn = document.getElementById('menu-fs-btn');
  if (fsBtn) {
    fsBtn.onclick = () => {
      toggleFullscreen();
    };
  }

  document.getElementById('hud-pause-btn').onclick = () => {
    gameState.gameActive = false;
    document.getElementById('pause-screen').style.display = 'flex';
  };

  document.getElementById('pause-resume').onclick = () => {
    document.getElementById('pause-screen').style.display = 'none';
    gameState.gameActive = true;
  };

  document.getElementById('pause-restart').onclick = () => {
    document.getElementById('pause-screen').style.display = 'none';
    resetEntireMatch();
  };

  document.getElementById('match-over-retry').onclick = () => {
    document.getElementById('match-over-screen').style.display = 'none';
    resetEntireMatch();
  };

  const sndBtn = document.getElementById('sound-btn');
  if (sndBtn) {
    sndBtn.onclick = () => {
      AudioSynth.enabled = !AudioSynth.enabled;
      if (AudioSynth.enabled) {
        sndBtn.innerText = "🔊 SOUND: ON";
        if (AudioSynth.ctx && AudioSynth.ctx.state === 'suspended') {
          AudioSynth.ctx.resume();
        }
        AudioSynth.startCrowdAmbient();
      } else {
        sndBtn.innerText = "🔇 SOUND: OFF";
        AudioSynth.stopAll();
      }
    };
  }

  animate();
}

function toggleFullscreen() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  const el = document.documentElement;
  if (!isFs) {
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) {
      req.call(el)
        .then(() => {
          if (navigator.keyboard && typeof navigator.keyboard.lock === 'function') {
            navigator.keyboard.lock(["Escape"]).catch(() => {});
          }
        })
        .catch(err => console.warn("Fullscreen request failed:", err));
    }
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (exit) {
      if (navigator.keyboard && typeof navigator.keyboard.unlock === 'function') {
        navigator.keyboard.unlock();
      }
      exit.call(document);
    }
  }
}

function enterFullscreen() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  if (!isFs) {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) {
      req.call(el)
        .then(() => {
          if (navigator.keyboard && typeof navigator.keyboard.lock === 'function') {
            navigator.keyboard.lock(["Escape"]).catch(() => {});
          }
        })
        .catch(err => console.warn("Fullscreen request failed:", err));
    }
  }
}

export function triggerSetPiece(type, team, spot) {
  AudioSynth.playWhistle();

  // Reset ball dribbler
  gameState.ballDribbler = null;
  gameState.ballVelocity.set(0, 0, 0);
  
  // Set piece details
  gameState.setPiece.active = true;
  gameState.setPiece.type = type;
  gameState.setPiece.team = team;
  gameState.setPiece.spot = spot.clone();
  gameState.setPiece.aimAngle = 0;
  
  // Choose kicker/thrower (closest outfielder of team to spot)
  let kicker = null;
  let minDist = Infinity;
  gameState.players.forEach(p => {
    if (p.team === team && !p.isGoalkeeper) {
      const d = p.group.position.distanceTo(spot);
      if (d < minDist) {
        minDist = d;
        kicker = p;
      }
    }
  });
  
  if (!kicker) {
    kicker = gameState.players.find(p => p.team === team && !p.isGoalkeeper);
  }
  
  gameState.setPiece.kicker = kicker;
  
  // Position kicker
  if (type === 'throwin') {
    const zDir = spot.z > 0 ? 1 : -1;
    kicker.group.position.copy(spot);
    kicker.group.position.z += zDir * 0.2;
    kicker.group.lookAt(spot.x, 0, 0); // face pitch center line
    
    // Hold ball overhead
    gameState.ballMesh.position.copy(kicker.group.position);
    gameState.ballMesh.position.y = 1.6;
    gameState.ballVelocity.set(0, 0, 0);
    
    gameState.setPiece.mode = 'player';
  } else if (type === 'corner') {
    const xDir = spot.x > 0 ? 1 : -1;
    const zDir = spot.z > 0 ? 1 : -1;
    kicker.group.position.set(spot.x - xDir * 0.8, 0, spot.z - zDir * 0.8);
    kicker.group.lookAt(spot);
    
    // Place ball at spot
    gameState.ballMesh.position.copy(spot);
    gameState.ballMesh.position.y = gameState.ballRadius;
    gameState.ballVelocity.set(0, 0, 0);
    
    gameState.setPiece.mode = 'choose';
    
    // Default aim angle (pointing into the box)
    gameState.setPiece.aimAngle = Math.atan2(-zDir * 0.6, -xDir * 1.0);
  } else if (type === 'goalkick') {
    const xDir = spot.x > 0 ? 1 : -1;
    kicker.group.position.set(spot.x - xDir * 1.5, 0, spot.z);
    kicker.group.lookAt(spot);
    
    // Place ball at spot
    gameState.ballMesh.position.copy(spot);
    gameState.ballMesh.position.y = gameState.ballRadius;
    gameState.ballVelocity.set(0, 0, 0);
    
    gameState.setPiece.mode = 'player';
    
    // Default aim angle (pointing straight downfield)
    gameState.setPiece.aimAngle = Math.atan2(0.0, xDir * 1.0);
  }

  // Find target teammates (for target cycling)
  const targets = [];
  gameState.players.forEach(p => {
    if (p.team === team && p !== kicker && !p.isGoalkeeper && !p.isStumbling) {
      const d = p.group.position.distanceTo(spot);
      if (type === 'throwin') {
        if (d < 22.0) {
          targets.push(p);
        }
      } else {
        targets.push(p);
      }
    }
  });

  // Sort targets by distance (closest first)
  targets.sort((a, b) => a.group.position.distanceTo(spot) - b.group.position.distanceTo(spot));
  
  if (targets.length === 0) {
    gameState.players.forEach(p => {
      if (p.team === team && p !== kicker && !p.isGoalkeeper) {
        targets.push(p);
      }
    });
  }

  gameState.setPiece.targets = targets;
  gameState.setPiece.targetIndex = 0;

  // Show set piece overlay HUD
  if (team === TEAMS.RED) {
    const hud = document.getElementById('setpiece-hud');
    const title = document.getElementById('setpiece-title');
    const prompt = document.getElementById('setpiece-prompt');
    const choices = document.getElementById('corner-choices');
    
    if (hud) hud.style.display = 'block';
    if (choices) choices.style.display = 'none';

    if (type === 'throwin') {
      title.innerText = "THROW-IN";
      prompt.innerText = "Cycle teammates: C / Swap. Throw: E / Pass.";
    } else if (type === 'corner') {
      title.innerText = "CORNER KICK";
      prompt.innerText = "Choose your delivery style:";
      if (choices) choices.style.display = 'flex';
    } else if (type === 'goalkick') {
      title.innerText = "GOAL KICK";
      prompt.innerText = "Cycle teammates: C / Swap. Kick: E / Pass.";
    }
    
    // Set userControlledPlayer to kicker
    gameState.userControlledPlayer = kicker;
  } else {
    // Opponent team set piece (runs automatically after 1.5s)
    const hud = document.getElementById('setpiece-hud');
    if (hud) hud.style.display = 'none';

    setTimeout(() => {
      if (gameState.setPiece.active && gameState.setPiece.team === TEAMS.BLUE) {
        executeOpponentSetPiece();
      }
    }, 1500);
  }
};
window.triggerSetPiece = triggerSetPiece;

function executeOpponentSetPiece() {
  const sp = gameState.setPiece;
  if (!sp.active || sp.team !== TEAMS.BLUE) return;

  const kicker = sp.kicker;
  const targets = sp.targets;
  if (!kicker) {
    sp.active = false;
    return;
  }

  // Find a teammate to throw/kick to
  let target = targets[Math.floor(Math.random() * targets.length)];
  if (!target) {
    target = gameState.players.find(p => p.team === TEAMS.BLUE && p !== kicker);
  }

  if (target) {
    const dir = target.group.position.clone().sub(gameState.ballMesh.position).normalize();
    if (sp.type === 'throwin') {
      dir.y = 0.28;
      const force = 13.0 + Math.min(5.0, target.group.position.distanceTo(sp.spot) * 0.15);
      kickBall(dir, force);
    } else {
      dir.y = 0.24;
      const force = 17.5 + Math.min(8.0, target.group.position.distanceTo(sp.spot) * 0.22);
      kickBall(dir, force);
    }
    gameState.passTarget = target;
  } else {
    const kickDir = new THREE.Vector3(-1.0, 0.2, 0).normalize();
    kickBall(kickDir, 18.0);
  }
  
  sp.active = false;
}

function updateSetPieceAimLine() {
  const line = window.setPieceAimLine;
  if (!line) return;

  const sp = gameState.setPiece;
  if (sp && sp.active && sp.mode === 'direct' && sp.team === TEAMS.RED) {
    line.visible = true;
    const positions = line.geometry.attributes.position.array;
    
    const origin = sp.spot;
    const angle = sp.aimAngle;
    const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
    
    const initialVelocity = 18.5; // horizontal kick force
    const gravity = 9.8 * 1.5;
    const verticalVelocity = 6.2; // vertical loft

    for (let i = 0; i < 100; i++) {
      const t = i * 0.02;
      const x = origin.x + dir.x * initialVelocity * t;
      const z = origin.z + dir.z * initialVelocity * t;
      const y = Math.max(0.04, origin.y + verticalVelocity * t - 0.5 * gravity * t * t);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    
    line.geometry.attributes.position.needsUpdate = true;
    line.computeLineDistances();
  } else {
    line.visible = false;
  }
}

window.startRefereeFoulCutscene = function(offender, victim) {
  // Clear ball dribbler
  gameState.ballDribbler = null;
  gameState.ballVelocity.set(0, 0, 0);

  // Position referee close to the foul spot
  const fPos = gameState.foulState.spot;
  let ref = gameState.players.find(p => p.team === 'referee');
  let spawnedRef = false;
  if (!ref) {
    ref = new PlayerAgent('referee', 0, new THREE.Vector3(fPos.x - 7.0, 0, fPos.z - 7.0));
    gameState.players.push(ref);
    spawnedRef = true;
  } else {
    ref.group.position.set(fPos.x - 7.0, 0, fPos.z - 7.0);
  }

  // Set cinematic state
  gameState.cinematic = {
    active: true,
    type: 'foul',
    phase: 0, 
    timer: 0,
    offender: offender,
    victim: victim,
    spot: fPos,
    entities: [],
    spawnedRef: spawnedRef
  };

  // Tripped player falls down
  victim.isFallen = true;
  victim.fallTime = 5.0;

  // Render card popup on screen after 1.4s
  setTimeout(() => {
    if (gameState.cinematic && gameState.cinematic.type === 'foul') {
      gameState.cinematic.phase = 1;
      
      const hud = document.getElementById('card-popup');
      const box = document.getElementById('card-color-box');
      const text = document.getElementById('card-text-label');
      const player = document.getElementById('card-player-label');
      
      offender.yellowCards++;
      let showRed = (offender.yellowCards >= 2);
      
      if (hud && box && text && player) {
        hud.style.display = 'block';
        box.style.backgroundColor = showRed ? '#ef4444' : '#fbbf24';
        text.innerText = showRed ? 'RED CARD' : 'YELLOW CARD';
        player.innerText = `NO. ${offender.number} (${offender.team === TEAMS.RED ? 'RED DEVILS' : 'SKY BLUES'})`;
      }

      if (showRed) {
        offender.isRedCarded = true;
      }
    }
  }, 1400);

  // Cutscene ends after 3.8s, setup the free kick or penalty
  setTimeout(() => {
    if (gameState.cinematic && gameState.cinematic.type === 'foul') {
      const hud = document.getElementById('card-popup');
      if (hud) hud.style.display = 'none';
      
      const offender = gameState.cinematic.offender;
      const victim = gameState.cinematic.victim;
      const spot = gameState.cinematic.spot;
      const hadSpawnedRef = gameState.cinematic.spawnedRef;
      
      // End cutscene
      gameState.cinematic.active = false;
      
      // Remove referee if we spawned it dynamically
      if (hadSpawnedRef) {
        const refInstance = gameState.players.find(p => p.team === 'referee');
        if (refInstance) {
          gameState.scene.remove(refInstance.group);
          gameState.players = gameState.players.filter(p => p !== refInstance);
        }
      }

      // Restore referee arm rotation
      const refInstance = gameState.players.find(p => p.team === 'referee');
      if (refInstance) {
        refInstance.rightArm.rotation.set(0.08, 0, 0);
      }

      // If offender got red carded, eject them from the field!
      if (offender.isRedCarded) {
        gameState.scene.remove(offender.group);
        gameState.players = gameState.players.filter(p => p !== offender);
      }

      // Check if foul spot is inside defending team's penalty box
      const isRedFouled = (victim.team === TEAMS.RED);
      const isBoxFoul = isRedFouled 
        ? (spot.x > PITCH_LENGTH / 2 - 16.5 && Math.abs(spot.z) < 18.0) // Red fouled in Blue's box
        : (spot.x < -PITCH_LENGTH / 2 + 16.5 && Math.abs(spot.z) < 18.0); // Blue fouled in Red's box
      
      gameState.foulState.active = false;

      if (isBoxFoul) {
        triggerPenaltySetup(victim.team);
      } else {
        triggerFreeKickSetup(victim.team, spot);
      }
    }
  }, 3800);
};

function triggerFreeKickSetup(team, spot) {
  // Clear ball dribbler
  gameState.ballDribbler = null;
  gameState.ballVelocity.set(0, 0, 0);

  // Set piece details
  gameState.setPiece.active = true;
  gameState.setPiece.type = 'freekick';
  gameState.setPiece.team = team;
  gameState.setPiece.spot = spot.clone();
  gameState.setPiece.mode = 'direct'; // free kicks default to direct kick
  
  // Choose kicker (closest outfielder to spot)
  let kicker = null;
  let minDist = Infinity;
  gameState.players.forEach(p => {
    if (p.team === team && !p.isGoalkeeper) {
      const d = p.group.position.distanceTo(spot);
      if (d < minDist) {
        minDist = d;
        kicker = p;
      }
    }
  });
  
  if (!kicker) {
    kicker = gameState.players.find(p => p.team === team && !p.isGoalkeeper);
  }
  
  gameState.setPiece.kicker = kicker;
  
  // Position kicker behind ball
  const xDir = (team === TEAMS.RED) ? 1 : -1;
  kicker.group.position.set(spot.x - xDir * 1.5, 0, spot.z);
  kicker.group.lookAt(spot);

  // Position ball on ground
  gameState.ballMesh.position.copy(spot);
  gameState.ballMesh.position.y = gameState.ballRadius;
  gameState.ballVelocity.set(0, 0, 0);

  // --- DEFENSIVE WALL SETUP ---
  // If free kick is close to defending goal (< 26 units), spawn a 4-man wall
  const defendingTeam = (team === TEAMS.RED) ? TEAMS.BLUE : TEAMS.RED;
  const goalCenter = new THREE.Vector3((defendingTeam === TEAMS.BLUE) ? PITCH_LENGTH / 2 : -PITCH_LENGTH / 2, 0.0, 0.0);
  const distToGoal = spot.distanceTo(goalCenter);
  
  // Default aim angle pointing towards goal center
  gameState.setPiece.aimAngle = Math.atan2(goalCenter.z - spot.z, goalCenter.x - spot.x);

  // Clear any existing wall postures
  gameState.players.forEach(p => {
    if (p.team === defendingTeam && !p.isGoalkeeper) {
      p.leftArm.rotation.set(0.08, 0, 0);
      p.rightArm.rotation.set(-0.08, 0, 0);
    }
  });

  if (distToGoal < 26.0) {
    // Spawn 4-man wall
    const toGoal = goalCenter.clone().sub(spot).normalize();
    const wallSpot = spot.clone().addScaledVector(toGoal, 8.0); // 8 units distance
    
    // Find 4 closest defending outfielders to the wall spot
    const defenders = [];
    gameState.players.forEach(p => {
      if (p.team === defendingTeam && !p.isGoalkeeper) {
        const d = p.group.position.distanceTo(wallSpot);
        defenders.push({ player: p, dist: d });
      }
    });
    
    defenders.sort((a, b) => a.dist - b.dist);
    const wallPlayers = defenders.slice(0, 4).map(d => d.player);
    
    // Position side-by-side perpendicular to toGoal
    const perp = new THREE.Vector3(-toGoal.z, 0, toGoal.x).normalize();
    const offsets = [-1.2, -0.4, 0.4, 1.2];
    
    for (let i = 0; i < wallPlayers.length; i++) {
      const p = wallPlayers[i];
      const offsetPos = wallSpot.clone().addScaledVector(perp, offsets[i]);
      p.group.position.copy(offsetPos);
      p.group.position.y = 0;
      p.group.lookAt(spot);
      
      // Crossed arms wall stance
      p.leftArm.rotation.set(0.55, 0, -0.3);
      p.rightArm.rotation.set(0.55, 0, 0.3);
    }
  }

  // Show set piece overlay HUD (if user team)
  if (team === TEAMS.RED) {
    const hud = document.getElementById('setpiece-hud');
    const title = document.getElementById('setpiece-title');
    const prompt = document.getElementById('setpiece-prompt');
    const choices = document.getElementById('corner-choices');
    
    if (hud) hud.style.display = 'block';
    if (choices) choices.style.display = 'none';

    title.innerText = "FREE KICK";
    prompt.innerText = "Aim: Left/Right Arrows. Shoot/Pass: E / Enter.";
    
    gameState.userControlledPlayer = kicker;
  } else {
    // AI free kick (runs after 1.5s)
    setTimeout(() => {
      if (gameState.setPiece.active && gameState.setPiece.type === 'freekick' && gameState.setPiece.team === TEAMS.BLUE) {
        // AI loft kick downfield
        const targetDir = new THREE.Vector3(-1.0, 0.22, (Math.random() - 0.5) * 0.45).normalize();
        kickBall(targetDir, 18.0 + Math.random() * 5.0);
        gameState.setPiece.active = false;
      }
    }, 1500);
  }
}

function triggerPenaltySetup(team) {
  // Clear ball dribbler
  gameState.ballDribbler = null;
  gameState.ballVelocity.set(0, 0, 0);

  // Defending team goal details
  const defendingTeam = (team === TEAMS.RED) ? TEAMS.BLUE : TEAMS.RED;
  const goalX = (defendingTeam === TEAMS.BLUE) ? PITCH_LENGTH / 2 : -PITCH_LENGTH / 2;
  const penaltySpotX = (defendingTeam === TEAMS.BLUE) ? PITCH_LENGTH / 2 - 11.0 : -PITCH_LENGTH / 2 + 11.0;
  const penaltySpot = new THREE.Vector3(penaltySpotX, 0, 0);
  
  // Set piece details
  gameState.setPiece.active = true;
  gameState.setPiece.type = 'penalty';
  gameState.setPiece.team = team;
  gameState.setPiece.spot = penaltySpot.clone();
  
  // Aiming coordinates on goal line (aimX is Z, aimY is Y)
  gameState.setPiece.aimX = 0; 
  gameState.setPiece.aimY = GOAL_HEIGHT / 2; 

  // Initialize 3D Target crosshair
  if (!window.penaltyTargetMesh) {
    const geo = new THREE.RingGeometry(0.16, 0.22, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    window.penaltyTargetMesh = new THREE.Mesh(geo, mat);
    gameState.scene.add(window.penaltyTargetMesh);
  }
  
  // Position aim crosshair at goalmouth center
  window.penaltyTargetMesh.position.set(goalX, gameState.setPiece.aimY, gameState.setPiece.aimX);
  window.penaltyTargetMesh.rotation.y = Math.PI / 2;
  window.penaltyTargetMesh.visible = (team === TEAMS.RED);

  // Choose penalty kicker (closest attacker to penalty spot)
  let kicker = null;
  let minDist = Infinity;
  gameState.players.forEach(p => {
    if (p.team === team && !p.isGoalkeeper) {
      const d = p.group.position.distanceTo(penaltySpot);
      if (d < minDist) {
        minDist = d;
        kicker = p;
      }
    }
  });
  if (!kicker) {
    kicker = gameState.players.find(p => p.team === team && !p.isGoalkeeper);
  }
  
  gameState.setPiece.kicker = kicker;
  
  // Teleport kicker behind ball
  const xDir = (team === TEAMS.RED) ? 1 : -1;
  kicker.group.position.set(penaltySpot.x - xDir * 1.5, 0, 0);
  kicker.group.lookAt(goalX, 0, 0);

  // Teleport ball to spot
  gameState.ballMesh.position.copy(penaltySpot);
  gameState.ballMesh.position.y = gameState.ballRadius;
  gameState.ballVelocity.set(0, 0, 0);

  // Teleport goalkeeper to center of goal line
  const gk = (defendingTeam === TEAMS.RED) ? gameState.userGoalKeeper : gameState.opponentGoalKeeper;
  if (gk) {
    gk.group.position.set(goalX, 0, 0);
    gk.group.lookAt(penaltySpot);
  }

  // Teleport all other 20 outfield players outside penalty area
  let redIdx = 0, blueIdx = 0;
  gameState.players.forEach(p => {
    if (p !== kicker && p !== gk && !p.isGoalkeeper) {
      if (p.team === TEAMS.RED) {
        p.group.position.set(penaltySpot.x - xDir * 6.5, 0, -10.0 + redIdx * 2.0);
        redIdx++;
      } else {
        p.group.position.set(penaltySpot.x - xDir * 6.5, 0, -10.0 + blueIdx * 2.0);
        blueIdx++;
      }
      p.group.lookAt(penaltySpot);
    }
  });

  // Show set piece overlay HUD
  if (team === TEAMS.RED) {
    const hud = document.getElementById('setpiece-hud');
    const title = document.getElementById('setpiece-title');
    const prompt = document.getElementById('setpiece-prompt');
    const choices = document.getElementById('corner-choices');
    
    if (hud) hud.style.display = 'block';
    if (choices) choices.style.display = 'none';

    title.innerText = "PENALTY KICK";
    prompt.innerText = "Aim: Arrow Keys. Shoot: E / Enter.";
    
    gameState.userControlledPlayer = kicker;
  } else {
    // AI Penalty Kick (runs after 1.8s)
    setTimeout(() => {
      if (gameState.setPiece.active && gameState.setPiece.type === 'penalty' && gameState.setPiece.team === TEAMS.BLUE) {
        const randZ = (Math.random() - 0.5) * (GOAL_WIDTH - 1.2);
        const randY = 0.2 + Math.random() * (GOAL_HEIGHT - 0.6);
        executePenaltyKick(randZ, randY, TEAMS.BLUE);
      }
    }, 1800);
  }
}

function executePenaltyKick(targetZ, targetY, kickingTeam) {
  const sp = gameState.setPiece;
  if (!sp.active || sp.type !== 'penalty') return;

  const defendingTeam = (kickingTeam === TEAMS.RED) ? TEAMS.BLUE : TEAMS.RED;
  const goalX = (defendingTeam === TEAMS.BLUE) ? PITCH_LENGTH / 2 : -PITCH_LENGTH / 2;
  const gk = (defendingTeam === TEAMS.RED) ? gameState.userGoalKeeper : gameState.opponentGoalKeeper;

  // 1. Goalkeeper dives randomly to one of 5 quadrants
  const goalieQuadrants = [
    { name: 'TL', z: -GOAL_WIDTH / 3, y: GOAL_HEIGHT * 0.7 },
    { name: 'BL', z: -GOAL_WIDTH / 3, y: GOAL_HEIGHT * 0.25 },
    { name: 'TR', z: GOAL_WIDTH / 3, y: GOAL_HEIGHT * 0.7 },
    { name: 'BR', z: GOAL_WIDTH / 3, y: GOAL_HEIGHT * 0.25 },
    { name: 'C',  z: 0.0, y: GOAL_HEIGHT * 0.3 }
  ];
  
  const gkChoice = goalieQuadrants[Math.floor(Math.random() * goalieQuadrants.length)];
  
  // Animate goalie dive
  if (gk) {
    setTimeout(() => {
      gk.velocity.set(0, gkChoice.y * 2.5, gkChoice.z * 2.5);
      gk.group.position.z += gkChoice.z * 0.85; 
      
      if (gkChoice.name.includes('L')) {
        gk.leftArm.rotation.z = Math.PI / 1.8;
        gk.torso.rotation.z = 0.6;
      } else if (gkChoice.name.includes('R')) {
        gk.rightArm.rotation.z = -Math.PI / 1.8;
        gk.torso.rotation.z = -0.6;
      } else {
        gk.leftArm.rotation.z = Math.PI / 2.5;
        gk.rightArm.rotation.z = -Math.PI / 2.5;
      }
      AudioSynth.playKick();
    }, 150);
  }

  // 2. Shot target coordinate
  const targetPos = new THREE.Vector3(goalX, targetY, targetZ);
  const shotDir = targetPos.clone().sub(gameState.ballMesh.position).normalize();
  
  // 3. Match quadrants to see if goalkeeper saves
  let shotQuad = 'C';
  if (targetZ < -1.2) {
    shotQuad = (targetY > 1.2) ? 'TL' : 'BL';
  } else if (targetZ > 1.2) {
    shotQuad = (targetY > 1.2) ? 'TR' : 'BR';
  }
  
  const isSaved = (shotQuad === gkChoice.name);

  // Execute kick
  if (isSaved) {
    setTimeout(() => {
      const deflectDir = new THREE.Vector3(defendingTeam === TEAMS.RED ? 1.0 : -1.0, 0.15, (Math.random() - 0.5) * 0.8).normalize();
      kickBall(deflectDir, 12.0);
      AudioSynth.playPost();
    }, 280);
  } else {
    kickBall(shotDir, 24.0);
  }

  // Deactivate set piece & hide crosshair
  sp.active = false;
  if (window.penaltyTargetMesh) window.penaltyTargetMesh.visible = false;
  document.getElementById('setpiece-hud').style.display = 'none';

  // Restore goalie after delay
  if (gk) {
    setTimeout(() => {
      gk.velocity.set(0, 0, 0);
      gk.leftArm.rotation.z = 0.08;
      gk.rightArm.rotation.z = -0.08;
      gk.torso.rotation.z = 0;
    }, 1200);
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initGame();
  setTimeout(() => { if (typeof window.updateMenuHighlight === 'function') window.updateMenuHighlight(); }, 500);
} else {
  window.addEventListener('load', () => {
    initGame();
    setTimeout(() => { if (typeof window.updateMenuHighlight === 'function') window.updateMenuHighlight(); }, 500);
  });
}

window.addEventListener('resize', () => {
  if (gameState.camera && gameState.renderer) {
    gameState.camera.aspect = window.innerWidth / window.innerHeight;
    gameState.camera.updateProjectionMatrix();
    gameState.renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

// ============================================================================
// GAMEPAD & KEYBOARD NAVIGATION & INPUT MANAGEMENT MODULE
// ============================================================================
// (gamepadState declared at top of file)


window.menuNavIndex = 0;

function pollGamepadState() {
  if (!window.gamepadState) {
    window.gamepadState = {
      active: false,
      joystickX: 0,
      joystickY: 0,
      aimX: 0,
      aimY: 0,
      btnCross: false,
      btnCircle: false,
      btnSquare: false,
      btnR1: false,
      btnL1: false
    };
  }
  const state = window.gamepadState;
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i]) { gp = gamepads[i]; break; }
  }
  if (!gp) {
    state.active = false;
    return;
  }
  state.active = true;

  const pressed = (idx) => gp.buttons[idx] && gp.buttons[idx].pressed;

  state.btnCross = pressed(0);  // A / Cross
  state.btnCircle = pressed(1); // B / Circle
  state.btnSquare = pressed(2); // X / Square
  state.btnL1 = pressed(4);     // LB / L1
  state.btnR1 = pressed(5);     // RB / R1

  // Left stick movement
  let moveX = gp.axes[0] || 0;
  let moveY = gp.axes[1] || 0;
  // D-pad fallback
  if (pressed(14)) moveX = -1.0;
  if (pressed(15)) moveX = 1.0;
  if (pressed(12)) moveY = -1.0;
  if (pressed(13)) moveY = 1.0;

  if (Math.abs(moveX) > 0.15 || Math.abs(moveY) > 0.15) {
    state.joystickX = moveX;
    state.joystickY = moveY;
  } else {
    state.joystickX = 0;
    state.joystickY = 0;
  }

  // Right stick aiming
  let aimX = gp.axes[2] || 0;
  let aimY = gp.axes[3] || 0;
  if (Math.abs(aimX) < 0.15 && Math.abs(aimY) < 0.15) {
    aimX = moveX; // fallback to Left Stick
    aimY = moveY;
  }
  if (Math.abs(aimX) > 0.15 || Math.abs(aimY) > 0.15) {
    state.aimX = aimX;
    state.aimY = aimY;
  } else {
    state.aimX = 0;
    state.aimY = 0;
  }
}

function getNavigableElements() {
  // Pause overlay
  const pause = document.getElementById('pause-screen');
  if (pause && pause.style.display !== 'none') {
    return ['pause-resume', 'pause-restart', 'pause-dash', 'sound-btn']
      .map(id => document.getElementById(id))
      .filter(el => el);
  }

  // Match over overlay
  const mo = document.getElementById('match-over-screen');
  if (mo && mo.style.display !== 'none') {
    return ['match-over-retry', 'match-over-dash']
      .map(id => document.getElementById(id))
      .filter(el => el);
  }

  // Toss Screen
  const toss = document.getElementById('toss-screen');
  if (toss && toss.style.display !== 'none') {
    return Array.from(document.querySelectorAll('#toss-screen button'))
      .filter(btn => {
        if (!btn || btn.classList.contains('hidden') || btn.style.display === 'none') return false;
        // Check if any parent node is hidden
        let p = btn.parentNode;
        while (p && p.id !== 'toss-screen') {
          if (p.classList.contains('hidden') || p.style.display === 'none') return false;
          p = p.parentNode;
        }
        return true;
      });
  }

  // Team Management Screen
  const tm = document.getElementById('team-management-screen');
  if (tm && tm.style.display !== 'none') {
    const pitchCards = Array.from(document.querySelectorAll('#pitch-layout .player-card-glow'));
    const reserveCards = Array.from(document.querySelectorAll('#reserves-list .player-card-glow'));
    const saveBtn = document.getElementById('btn-save-management');
    const list = [...pitchCards, ...reserveCards];
    if (saveBtn) list.push(saveBtn);
    return list.filter(el => el);
  }

  // Match Preview Screen
  const mp = document.getElementById('match-preview-screen');
  if (mp && mp.style.display !== 'none') {
    return ['menu-start-btn', 'btn-goto-management', 'btn-back-to-teams']
      .map(id => document.getElementById(id))
      .filter(el => el);
  }

  // Select Teams (Matchup View)
  const mu = document.getElementById('menu-matchup-view');
  if (mu && mu.style.display !== 'none') {
    return [
      'user-country-select', 'user-team-prev', 'user-team-next',
      'opp-country-select', 'opp-team-prev', 'opp-team-next',
      'btn-back-to-dash', 'btn-confirm-teams'
    ].map(id => document.getElementById(id))
     .filter(el => el);
  }

  // Corner kick HUD
  const cornerPass = document.getElementById('btn-corner-pass');
  if (cornerPass && cornerPass.parentNode && cornerPass.parentNode.style.display !== 'none') {
    return ['btn-corner-pass', 'btn-corner-direct']
      .map(id => document.getElementById(id))
      .filter(el => el);
  }

  // Cinematic Walkout / Intro
  const skipWalkout = document.getElementById('btn-skip-walkout');
  if (skipWalkout && skipWalkout.parentNode && skipWalkout.parentNode.style.display !== 'none') {
    return [skipWalkout];
  }
  const skipCutscene = document.getElementById('btn-skip-cutscene');
  if (skipCutscene && skipCutscene.style.display !== 'none') {
    return [skipCutscene];
  }

  // Splash Screen / Enter
  const splash = document.getElementById('main-menu-screen');
  const enterBtn = document.getElementById('btn-splash-enter');
  if (splash && !splash.classList.contains('hidden') && enterBtn && enterBtn.style.display !== 'none') {
    return [enterBtn];
  }

  // Dashboard (Main Menu)
  const dash = document.getElementById('menu-dashboard-view');
  if (dash && dash.style.display !== 'none') {
    return [
      'btn-quick-kickoff', 'btn-tab-career', 'btn-tab-tournament',
      'btn-tab-multiplayer', 'btn-tab-practice', 'btn-nav-home',
      'btn-nav-team', 'btn-nav-store', 'btn-nav-leaderboard',
      'dash-settings-btn', 'menu-fs-btn'
    ].map(id => document.getElementById(id))
     .filter(el => el);
  }

  return [];
}

function getActiveBackBtn() {
  const views = [
    { id: 'pause-screen', back: 'pause-resume' },
    { id: 'match-over-screen', back: 'match-over-dash' },
    { id: 'team-management-screen', back: 'btn-save-management' },
    { id: 'match-preview-screen', back: 'btn-back-to-teams' },
    { id: 'menu-matchup-view', back: 'btn-back-to-dash' },
    { id: 'subscreen-view', back: 'btn-subscreen-back' }
  ];
  for (let view of views) {
    const el = document.getElementById(view.id);
    if (el && el.style.display !== 'none') {
      return document.getElementById(view.back);
    }
  }
  return null;
}

window.updateMenuHighlight = function() {
  // Clear all highlight classes
  document.querySelectorAll('.nav-highlight').forEach(el => {
    el.classList.remove('nav-highlight');
  });

  const list = getNavigableElements();
  if (list.length === 0) return;

  // Clamp index
  if (window.menuNavIndex >= list.length) window.menuNavIndex = list.length - 1;
  if (window.menuNavIndex < 0) window.menuNavIndex = 0;

  const target = list[window.menuNavIndex];
  if (target) {
    target.classList.add('nav-highlight');
    try {
      target.focus();
    } catch (e) {}
    // Scroll if overflow
    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
};

function pollGamepadMenuNav() {
  if (gameState.gameActive) return;

  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i]) { gp = gamepads[i]; break; }
  }
  if (!gp) return;

  const pressed = (idx) => gp.buttons[idx] && gp.buttons[idx].pressed;

  const moveX = gp.axes[0] || 0;
  const moveY = gp.axes[1] || 0;

  const up = pressed(12) || moveY < -0.5;
  const down = pressed(13) || moveY > 0.5;
  const left = pressed(14) || moveX < -0.5;
  const right = pressed(15) || moveX > 0.5;
  const accept = pressed(0) || pressed(1) || pressed(2) || pressed(3); // A, B, X, Y
  const back = pressed(8) || pressed(9); // Options / Back

  const list = getNavigableElements();
  if (list.length === 0) return;

  if (up || left) {
    if (!gpPrevNavPressed.up && !gpPrevNavPressed.left) {
      window.menuNavIndex = (window.menuNavIndex - 1 + list.length) % list.length;
      window.updateMenuHighlight();
      AudioSynth.playClick();
    }
  }
  if (down || right) {
    if (!gpPrevNavPressed.down && !gpPrevNavPressed.right) {
      window.menuNavIndex = (window.menuNavIndex + 1) % list.length;
      window.updateMenuHighlight();
      AudioSynth.playClick();
    }
  }
  if (accept) {
    if (!gpPrevNavPressed.accept) {
      const el = list[window.menuNavIndex];
      if (el) {
        el.click();
        AudioSynth.playKickLow();
      }
    }
  }
  if (back) {
    if (!gpPrevNavPressed.back) {
      const backBtn = getActiveBackBtn();
      if (backBtn) {
        backBtn.click();
        AudioSynth.playClick();
      }
    }
  }

  gpPrevNavPressed = { up, down, left, right, accept, back };
}

function handleMenuKeyboardNav(e) {
  if (gameState.gameActive) return;

  const list = getNavigableElements();
  if (list.length === 0) return;

  if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
    e.preventDefault();
    window.menuNavIndex = (window.menuNavIndex - 1 + list.length) % list.length;
    window.updateMenuHighlight();
    AudioSynth.playClick();
  } else if (e.code === 'ArrowDown' || e.code === 'ArrowRight') {
    e.preventDefault();
    window.menuNavIndex = (window.menuNavIndex + 1) % list.length;
    window.updateMenuHighlight();
    AudioSynth.playClick();
  } else if (e.code === 'Enter' || e.code === 'Space') {
    e.preventDefault();
    const el = list[window.menuNavIndex];
    if (el) {
      el.click();
      AudioSynth.playKickLow();
    }
  } else if (e.code === 'Escape' || e.code === 'Backspace') {
    e.preventDefault();
    const backBtn = getActiveBackBtn();
    if (backBtn) {
      backBtn.click();
      AudioSynth.playClick();
    }
  }
}

function updateGameplayControllerTriggers() {
  if (!gameState.gameActive || gameState.isGoalScoringPause) return;

  // Set-Piece Mode Checks
  if (gameState.setPiece && gameState.setPiece.active && gameState.setPiece.team === TEAMS.RED) {
    const sp = gameState.setPiece;

    const isSwapPressed = SocketController.controllerInput.btnSquare || gamepadState.btnSquare || SocketController.controllerInput.btnCircle || gamepadState.btnCircle;
    const isExecutePressed = SocketController.controllerInput.btnCross || gamepadState.btnCross;

    if (isSwapPressed && !prevBtnSwap) {
      if (sp.mode === 'player' && sp.targets.length > 0) {
        sp.targetIndex = (sp.targetIndex + 1) % sp.targets.length;
        AudioSynth.playClick();
      }
    }
    prevBtnSwap = isSwapPressed;

    if (isExecutePressed && !prevBtnCross) {
      if (sp.type === 'penalty') {
        const goalTarget = new THREE.Vector3(0, sp.aimY, sp.aimX);
        const goalX = (sp.spot.x > 0) ? PITCH_LENGTH / 2 : -PITCH_LENGTH / 2;
        const kickDir = new THREE.Vector3(goalX, 0, 0).sub(sp.spot).normalize();
        kickDir.y = 0.16 + (sp.aimY / GOAL_HEIGHT) * 0.12;
        
        const goalCenter = new THREE.Vector3(goalX, 1.2, 0);
        const horizontalOffset = new THREE.Vector3().copy(goalTarget).sub(goalCenter);
        horizontalOffset.x = 0;
        
        kickDir.addScaledVector(horizontalOffset.normalize(), 0.18);
        kickDir.normalize();

        const speed = 16.5;
        kickBall(kickDir, speed);
        sp.active = false;
        if (window.penaltyTargetMesh) window.penaltyTargetMesh.visible = false;
        AudioSynth.playKickHigh();
      } else {
        // Direct free kick / corner
        const dir = new THREE.Vector3(Math.cos(sp.aimAngle), 0, Math.sin(sp.aimAngle)).normalize();
        dir.y = 0.24; // lofted corner kick cross
        dir.normalize();
        const speed = 15.0;
        kickBall(dir, speed);
        sp.active = false;
        document.getElementById('setpiece-hud').style.display = 'none';
        AudioSynth.playKickHigh();
      }
    }
    prevBtnCross = isExecutePressed;
    return;
  }

  // Regular Gameplay Mode Checks
  const isCrossPressed = SocketController.controllerInput.btnCross || gamepadState.btnCross;

  if (isCrossPressed && !prevBtnCross) {
    if (gameState.ballDribbler && gameState.ballDribbler.team === TEAMS.RED) {
      triggerTeammatePass();
    } else {
      let bestPl = null, minDist = Infinity;
      gameState.players.forEach(pl => {
        if (pl.team === TEAMS.RED && !pl.isGoalkeeper && pl !== gameState.userControlledPlayer && !pl.isStumbling) {
          const d = pl.group.position.distanceTo(gameState.ballMesh.position);
          if (d < minDist) { minDist = d; bestPl = pl; }
        }
      });
      if (bestPl) {
        gameState.userControlledPlayer = bestPl;
        AudioSynth.playClick();
      }
    }
  }
  
  prevBtnCross = isCrossPressed;
}

// Bind keyboard menu listener
window.addEventListener('keydown', handleMenuKeyboardNav);

// Reset focus highlight index when transitioning screens
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button, .kickoff-hero-card, .arrow-nav-btn, .nav-item, .arrow-btn, .sidebar-tab-btn, .player-card-glow');
  if (btn) {
    window.menuNavIndex = 0;
    setTimeout(() => {
      if (typeof window.updateMenuHighlight === 'function') window.updateMenuHighlight();
    }, 150);
    setTimeout(() => {
      if (typeof window.updateMenuHighlight === 'function') window.updateMenuHighlight();
    }, 1200);
  }
});

