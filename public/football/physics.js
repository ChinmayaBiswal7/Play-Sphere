/**
 * Football Pro 2026 - Ball Physics, Cleats Tackling & Goalkeeper Diving AI Module
 */

import { gameState, TEAMS, PITCH_LENGTH, PITCH_WIDTH, GOAL_WIDTH, GOAL_HEIGHT } from './state.js';
import { AudioSynth } from './audio.js';
import { spawnKickFlash, spawnGrassPuff } from './stadium.js';
import { triggerGoalScored, triggerSetPiece } from './game.js';

export function kickBall(directionVec, force, spinVec = null) {
  AudioSynth.playKick();
  spawnKickFlash(gameState.ballMesh.position);

  if (gameState.ballDribbler) {
    gameState.lastTouchTeam = gameState.ballDribbler.team;
    gameState.lastTouchPlayer = gameState.ballDribbler;
  }
  gameState.ballVelocity.copy(directionVec).multiplyScalar(force);
  gameState.ballDribbler = null;

  if (!gameState.ballSpin) {
    gameState.ballSpin = new THREE.Vector3();
  }
  if (spinVec) {
    gameState.ballSpin.copy(spinVec);
  } else {
    gameState.ballSpin.set(0, 0, 0);
  }
}

export function updateBallPhysics(dt) {
  // Ensure ball spin is initialized
  if (!gameState.ballSpin) {
    gameState.ballSpin = new THREE.Vector3();
  }

  // ── DRIBBLER BALL-LOCK: ball always sticks to carrier unless kicked ──
  // This fixes the "ball left behind on sprint" bug completely
  if (gameState.ballDribbler && !gameState.ballDribbler.isTackling && !gameState.ballDribbler.isStumbling) {
    const dribbler = gameState.ballDribbler;
    if (dribbler.isGoalkeeper && dribbler.isHoldingBall) {
      const forwardOffset = new THREE.Vector3(0, 0, 0.38).applyQuaternion(dribbler.group.quaternion);
      gameState.ballMesh.position.copy(dribbler.group.position).add(forwardOffset);
      gameState.ballMesh.position.y = 1.25; // chest/hand height
      gameState.ballVelocity.set(0, 0, 0);
    } else {
      const isCloseDribble = dribbler.isDribbling;
      const offset = isCloseDribble ? 0.35 : 0.52;
      const forwardOffset = new THREE.Vector3(0, 0, offset).applyQuaternion(dribbler.group.quaternion);
      gameState.ballMesh.position.copy(dribbler.group.position).add(forwardOffset);
      gameState.ballMesh.position.y = gameState.ballRadius;
      gameState.ballVelocity.set(0, 0, 0);
    }
    // Spin ball to match movement direction for visual dribble effect
    const speed = dribbler.velocity ? dribbler.velocity.length() : 0;
    if (gameState.ballMesh && speed > 0.5) {
      gameState.ballMesh.rotation.x += speed * dt * 1.8;
    }
    return; // ball physics done for this frame
  }

  // Apply curve Magnus effect if ball is in flight
  if (gameState.ballMesh.position.y > gameState.ballRadius) {
    gameState.ballVelocity.y -= 9.81 * 1.4 * dt; 
    
    const magnus = new THREE.Vector3().crossVectors(gameState.ballSpin, gameState.ballVelocity).multiplyScalar(0.065);
    gameState.ballVelocity.addScaledVector(magnus, dt);
  } else {
    const rollFriction = 1.6 * dt; // Increased friction - ball slows faster on ground
    gameState.ballVelocity.x *= (1 - rollFriction);
    gameState.ballVelocity.z *= (1 - rollFriction);
    
    // Friction on ground slows down spin
    gameState.ballSpin.multiplyScalar(1 - 3.0 * dt);

    if (gameState.ballVelocity.lengthSq() < 0.05) {
      gameState.ballVelocity.set(0, 0, 0);
    }
  }

  // Decay spin over time
  gameState.ballSpin.multiplyScalar(1 - 0.75 * dt);

  // Air drag - increased for more realistic deceleration
  gameState.ballVelocity.multiplyScalar(1 - (0.08 * dt));
  gameState.ballMesh.position.addScaledVector(gameState.ballVelocity, dt);

  // Ball visual rotation
  if (gameState.ballVelocity.lengthSq() > 0.01) {
    gameState.ballMesh.rotation.x += gameState.ballVelocity.z * dt * 1.8;
    gameState.ballMesh.rotation.z -= gameState.ballVelocity.x * dt * 1.8;
  }

  // Field rebound
  if (gameState.ballMesh.position.y <= gameState.ballRadius) {
    gameState.ballMesh.position.y = gameState.ballRadius;
    if (Math.abs(gameState.ballVelocity.y) > 1.5) {
      gameState.ballVelocity.y = -gameState.ballVelocity.y * 0.52; 
      AudioSynth.playKick();
    } else {
      gameState.ballVelocity.y = 0;
    }
  }

  // Goalpost collisions (correct cylinder physics)
  const checkPostBounces = (goalX) => {
    const postRadius = 0.22;
    const ballPos = gameState.ballMesh.position;
    
    // Only check if ball is below crossbar height
    if (ballPos.y <= GOAL_HEIGHT + gameState.ballRadius) {
      const ballXZ = new THREE.Vector2(ballPos.x, ballPos.z);

      // Left post (z = -GOAL_WIDTH/2)
      const leftPostXZ = new THREE.Vector2(goalX, -GOAL_WIDTH/2);
      const distL = ballXZ.distanceTo(leftPostXZ);
      if (distL < (gameState.ballRadius + postRadius)) {
        const normal = new THREE.Vector3(ballPos.x - goalX, 0, ballPos.z - (-GOAL_WIDTH/2)).normalize();
        ballPos.x = goalX + normal.x * (gameState.ballRadius + postRadius + 0.02);
        ballPos.z = -GOAL_WIDTH/2 + normal.z * (gameState.ballRadius + postRadius + 0.02);
        gameState.ballVelocity.reflect(normal).multiplyScalar(0.72);
        AudioSynth.playPost();
      }
      
      // Right post (z = GOAL_WIDTH/2)
      const rightPostXZ = new THREE.Vector2(goalX, GOAL_WIDTH/2);
      const distR = ballXZ.distanceTo(rightPostXZ);
      if (distR < (gameState.ballRadius + postRadius)) {
        const normal = new THREE.Vector3(ballPos.x - goalX, 0, ballPos.z - (GOAL_WIDTH/2)).normalize();
        ballPos.x = goalX + normal.x * (gameState.ballRadius + postRadius + 0.02);
        ballPos.z = GOAL_WIDTH/2 + normal.z * (gameState.ballRadius + postRadius + 0.02);
        gameState.ballVelocity.reflect(normal).multiplyScalar(0.72);
        AudioSynth.playPost();
      }
    }

    // Crossbar collision (horizontal cylinder check)
    if (Math.abs(ballPos.x - goalX) < 0.6 &&
        ballPos.y >= (GOAL_HEIGHT - 0.3) && ballPos.y <= (GOAL_HEIGHT + 0.3) &&
        Math.abs(ballPos.z) <= (GOAL_WIDTH / 2)) {
      gameState.ballVelocity.y = -Math.abs(gameState.ballVelocity.y) * 0.72;
      gameState.ballVelocity.x = -gameState.ballVelocity.x * 0.5;
      AudioSynth.playPost();
    }
  };
  checkPostBounces(-PITCH_LENGTH / 2);
  checkPostBounces(PITCH_LENGTH / 2);

  // Goal logic
  if (Math.abs(gameState.ballMesh.position.x) > PITCH_LENGTH / 2) {
    if (Math.abs(gameState.ballMesh.position.z) < GOAL_WIDTH / 2 && gameState.ballMesh.position.y < GOAL_HEIGHT) {
      if (!gameState.isGoalScoringPause) {
        const scoringTeam = gameState.ballMesh.position.x > 0 ? TEAMS.RED : TEAMS.BLUE;
        triggerGoalScored(scoringTeam);
      }
    } else {
      // Goal Line Out of Bounds (Corner Kick or Goal Kick)
      gameState.ballVelocity.set(0, 0, 0);
      
      const lastTouch = gameState.lastTouchTeam || TEAMS.RED;
      const xDir = gameState.ballMesh.position.x > 0 ? 1 : -1;
      const defendingTeam = (xDir > 0) ? TEAMS.BLUE : TEAMS.RED;
      const attackingTeam = (defendingTeam === TEAMS.BLUE) ? TEAMS.RED : TEAMS.BLUE;
      
      const ballZ = gameState.ballMesh.position.z;
      const zDir = ballZ > 0 ? 1 : -1;

      if (lastTouch === defendingTeam) {
        // Corner Kick for Attacking Team
        const cornerSpot = new THREE.Vector3(xDir * (PITCH_LENGTH / 2), 0.0, zDir * (PITCH_WIDTH / 2));
        triggerSetPiece('corner', attackingTeam, cornerSpot);
      } else {
        // Goal Kick for Defending Team
        const goalKickSpot = new THREE.Vector3(xDir * (PITCH_LENGTH / 2 - 6.0), 0.0, 0.0);
        triggerSetPiece('goalkick', defendingTeam, goalKickSpot);
      }
    }
  }

  if (Math.abs(gameState.ballMesh.position.z) > PITCH_WIDTH / 2) {
    // Sideline Out of Bounds (Throw-In)
    gameState.ballVelocity.set(0, 0, 0);
    
    const lastTouch = gameState.lastTouchTeam || TEAMS.RED;
    const throwingTeam = (lastTouch === TEAMS.BLUE) ? TEAMS.RED : TEAMS.BLUE;
    
    const zPos = gameState.ballMesh.position.z > 0 ? (PITCH_WIDTH / 2) : (-PITCH_WIDTH / 2);
    const xPos = Math.max(-PITCH_LENGTH / 2 + 2.0, Math.min(PITCH_LENGTH / 2 - 2.0, gameState.ballMesh.position.x));
    const spot = new THREE.Vector3(xPos, 0.0, zPos);
    
    triggerSetPiece('throwin', throwingTeam, spot);
  }
}

export function updateBallTrailRibbon() {
  const points = window.ballTrailPoints;
  const line = window.ballTrailLine;
  if (!points || !line) return;

  points.push(gameState.ballMesh.position.clone());
  if (points.length > 25) points.shift();

  const posAttr = line.geometry.attributes.position;
  for (let i = 0; i < 25; i++) {
    const pt = points[i] || gameState.ballMesh.position;
    posAttr.setXYZ(i, pt.x, pt.y, pt.z);
  }
  posAttr.needsUpdate = true;
}

function triggerFoulEvent(offender, victim) {
  AudioSynth.playWhistle();

  // Tripped player falls flat
  victim.isFallen = true;
  victim.fallTime = 4.0;
  victim.velocity.set(0, 0, 0);

  // Stop ball
  gameState.ballVelocity.set(0, 0, 0);
  gameState.ballDribbler = null;

  // Record foul state
  gameState.foulState.active = true;
  gameState.foulState.spot = gameState.ballMesh.position.clone();
  gameState.foulState.offender = offender;
  gameState.foulState.victim = victim;

  if (window.startRefereeFoulCutscene) {
    window.startRefereeFoulCutscene(offender, victim);
  }
}

export function handleDribblingAndTackling(dt) {
  // Player-to-player collision avoidance (separation)
  for (let i = 0; i < gameState.players.length; i++) {
    const p1 = gameState.players[i];
    if (!p1 || p1.isGoalkeeper) continue;
    for (let j = i + 1; j < gameState.players.length; j++) {
      const p2 = gameState.players[j];
      if (!p2 || p2.isGoalkeeper) continue;
      const dist = p1.group.position.distanceTo(p2.group.position);
      const minDist = 1.35; // minimum distance to avoid clumping
      if (dist < minDist) {
        const push = p1.group.position.clone().sub(p2.group.position);
        push.y = 0;
        if (push.lengthSq() < 0.001) {
          push.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        }
        push.normalize().multiplyScalar((minDist - dist) * 0.5);
        p1.group.position.add(push);
        p2.group.position.sub(push);
      }
    }
  }

  // --- UNIFIED TACKLE & FOUL DETECTOR ---
  // Auto-clear kickoffActive once ball leaves center
  if (gameState.kickoffActive) {
    const ballDistFromCenter = Math.sqrt(
      gameState.ballMesh.position.x * gameState.ballMesh.position.x +
      gameState.ballMesh.position.z * gameState.ballMesh.position.z
    );
    if (ballDistFromCenter > 1.5) {
      gameState.kickoffActive = false;
    }
  }

  if (gameState.ballDribbler && !gameState.foulState.active && !gameState.setPiece.active && !gameState.kickoffActive) {
    const carrier = gameState.ballDribbler;
    
    gameState.players.forEach(pl => {
      if (pl.isGoalkeeper || pl.team === carrier.team || pl.isStumbling || pl.isFallen) return;

      const dist = pl.group.position.distanceTo(carrier.group.position);
      
      const isUserTackling = (pl === gameState.userControlledPlayer && pl.isTackling && pl.tackleCooldown <= 0);
      const isAITackling = (dist < 1.35 && pl.tackleCooldown <= 0 && Math.random() < 0.015); // lowered range and rate to prevent constant tackles

      if (isUserTackling || isAITackling) {
        if (dist < 1.15) {
          // 1. CLEAN TACKLE (Inner zone)
          gameState.ballDribbler = pl;
          gameState.passTarget = null;
          if (pl.team === TEAMS.RED) {
            gameState.userControlledPlayer = pl;
          }
          AudioSynth.playKick();
          pl.tackleCooldown = 0.8;
          pl.isTackling = false;
        } else if (dist < 1.35) {
          // 2. OUTER ZONE: 20% chance of foul, 80% chance of clean miss
          pl.isTackling = false;
          if (Math.random() < 0.20) {
            pl.tackleCooldown = 1.8;
            triggerFoulEvent(pl, carrier);
          } else {
            // Clean miss - no foul!
            pl.tackleCooldown = 1.0;
          }
        }
      }
    });
  }

  // Goalkeepers AI tracking
  [gameState.userGoalKeeper, gameState.opponentGoalKeeper].forEach(gk => {
    if (!gk) return;

    // 1. If currently holding the ball, stand still and tick timer
    if (gk.isHoldingBall) {
      gk.velocity.set(0, 0, 0);
      gk.holdBallTime += dt;
      if (gk.holdBallTime > 2.5) {
        // Release and drop-kick downfield!
        gk.isHoldingBall = false;
        const kickDir = new THREE.Vector3(gk.team === TEAMS.RED ? 1.0 : -1.0, 0.22, (Math.random() - 0.5) * 0.45).normalize();
        kickBall(kickDir, 22.0 + Math.random() * 5.0);
        gk.kickCooldown = 1.5; // prevent immediate recapture
      }
      return;
    }

    // 2. Check if ball is inside this goalie's penalty area
    let inPenaltyArea = false;
    const bPos = gameState.ballMesh.position;
    if (gk.team === TEAMS.RED) {
      inPenaltyArea = (bPos.x < -PITCH_LENGTH / 2 + 16.5 && Math.abs(bPos.z) < 18.0);
    } else {
      inPenaltyArea = (bPos.x > PITCH_LENGTH / 2 - 16.5 && Math.abs(bPos.z) < 18.0);
    }

    // 3. Proximity AI Decision: run to pick it up if loose/pressed inside box
    const distToBall = gk.group.position.distanceTo(bPos);
    const isLoose = !gameState.ballDribbler || gameState.ballDribbler.team !== gk.team;
    
    if (inPenaltyArea && isLoose && bPos.y < 1.8 && distToBall < 5.2 && gk.kickCooldown <= 0) {
      // Go and pick up the ball!
      const toBall = bPos.clone().sub(gk.group.position);
      toBall.y = 0;
      gk.velocity.copy(toBall).normalize().multiplyScalar(gk.speed * 0.82);
      gk.group.position.addScaledVector(gk.velocity, dt);
      gk.group.rotation.y = Math.atan2(toBall.x, toBall.z);

      if (distToBall < 1.1) {
        // Pick it up!
        gk.isHoldingBall = true;
        gk.holdBallTime = 0.0;
        gameState.ballDribbler = gk;
        gameState.ballVelocity.set(0, 0, 0);
        AudioSynth.playWhistle();
      }
      return;
    }

    // 4. Default: defend post and track ball Z
    const targetZ = Math.max(-GOAL_WIDTH/2 + 0.8, Math.min(GOAL_WIDTH/2 - 0.8, gameState.ballMesh.position.z));
    const diffZ = targetZ - gk.group.position.z;
    
    gk.velocity.set(0, 0, THREE.MathUtils.clamp(diffZ * 5.0, -8.0, 8.0));
    gk.group.position.addScaledVector(gk.velocity, dt);
    
    // Dive save AI
    const isShotIncoming = gameState.ballVelocity.length() > 6.0 && Math.sign(gameState.ballVelocity.x) === (gk.team === TEAMS.RED ? -1 : 1);
    
    if (distToBall < 3.8 && isShotIncoming) {
      const diveLeft = (gameState.ballMesh.position.z < gk.group.position.z);
      if (diveLeft) {
        gk.leftArm.rotation.z = Math.PI / 1.8;
        gk.torso.rotation.z = 0.6;
        gk.leftLeg.rotation.z = 0.3;
      } else {
        gk.rightArm.rotation.z = -Math.PI / 1.8;
        gk.torso.rotation.z = -0.6;
        gk.rightLeg.rotation.z = -0.3;
      }
      
      // Deflect
      gameState.ballVelocity.x = -gameState.ballVelocity.x * 0.38;
      gameState.ballVelocity.z += (Math.random() - 0.5) * 9.5;
      gameState.ballVelocity.y = 2.5 + Math.random() * 2.5;
      
      AudioSynth.playKick();
      spawnGrassPuff(gk.group.position);
      
      setTimeout(() => {
        gk.leftArm.rotation.z = 0.08;
        gk.rightArm.rotation.z = -0.08;
        gk.torso.rotation.z = 0;
        gk.leftLeg.rotation.z = 0;
        gk.rightLeg.rotation.z = 0;
      }, 700);
    }
  });

  // 1. Find nearest outfield players to ball for each team
  let nearestRed = null, minDistRed = Infinity;
  let nearestBlue = null, minDistBlue = Infinity;
  
  gameState.players.forEach(pl => {
    if (pl.isGoalkeeper) return;
    const d = pl.group.position.distanceTo(gameState.ballMesh.position);
    if (pl.team === TEAMS.RED) {
      if (d < minDistRed) { minDistRed = d; nearestRed = pl; }
    } else {
      if (d < minDistBlue) { minDistBlue = d; nearestBlue = pl; }
    }
  });

  // 2. Outfielders updates
  gameState.players.forEach(pl => {
    if (pl.isGoalkeeper) return;
    
    // Update player animations and stamina
    pl.update(dt, pl === gameState.userControlledPlayer);

    // If a set piece OR kickoff is active, freeze all AI movement (only user-controlled player may act)
    if ((gameState.setPiece && gameState.setPiece.active) || gameState.kickoffActive) {
      if (pl !== gameState.userControlledPlayer) {
        pl.velocity.set(0, 0, 0);
      }
      return;
    }

    if (pl.isFallen) {
      pl.velocity.set(0, 0, 0);
      return;
    }

    if (pl.isStumbling) return; // Stumbling disables possession / tackle logic

    const dist = pl.group.position.distanceTo(gameState.ballMesh.position);
    if (dist < 1.2 && !pl.isTackling && pl.kickCooldown <= 0 && gameState.ballMesh.position.y < 1.5) {
      // Pass Protection: If a teammate pass is active, only the receiver can touch it
      if (gameState.passTarget && pl.team === TEAMS.RED && pl !== gameState.passTarget) {
        return;
      }
      if (gameState.passTarget && pl.team === TEAMS.BLUE && pl !== gameState.passTarget) {
        // Also apply pass protection to opponent AI passes
        return;
      }

      if (gameState.ballDribbler === null || gameState.ballDribbler === pl) {
        gameState.lastTouchTeam = pl.team;
        gameState.lastTouchPlayer = pl;
        // Cushion first touch if ball is moving fast
        if (gameState.ballVelocity.length() > 10.0) {
          const cushion = pl.isDribbling ? 0.08 : 0.32;
          gameState.ballVelocity.multiplyScalar(cushion);
          pl.stamina = Math.max(0, pl.stamina - 2.0);
          pl.kickCooldown = 0.18;
        } else {
          gameState.ballDribbler = pl;
          // If this is the intended pass receiver, switch control and clear passTarget
          if (pl.team === TEAMS.RED) {
            if (gameState.passTarget === pl || !gameState.passTarget) {
              gameState.userControlledPlayer = pl;
            }
            gameState.passTarget = null;
          }
          if (pl.team === TEAMS.BLUE) {
            gameState.passTarget = null;
          }
          const forwardOffset = new THREE.Vector3(0, 0, 0.42).applyQuaternion(pl.group.quaternion);
          gameState.ballMesh.position.copy(pl.group.position).add(forwardOffset);
          gameState.ballMesh.position.y = gameState.ballRadius;
          gameState.ballVelocity.set(0, 0, 0);
        }
      }
    }

    // User Controlled Outfielder: skip AI logic
    if (pl === gameState.userControlledPlayer) return;

    // AI Logic: Team RED (Teammates)
    if (pl.team === TEAMS.RED) {
      if (gameState.passTarget && gameState.passTarget.team === TEAMS.RED) {
        if (pl === gameState.passTarget) {
          // Only the receiver runs towards the ball
          const diff = gameState.ballMesh.position.clone().sub(pl.group.position);
          const speed = pl.stamina > 15 ? pl.sprintSpeed : pl.speed;
          pl.velocity.copy(diff).normalize().multiplyScalar(speed * 0.76);
          pl.facingDir.copy(pl.velocity).normalize();
          pl.group.position.addScaledVector(pl.velocity, dt);
          pl.group.rotation.y = Math.atan2(pl.facingDir.x, pl.facingDir.z);
        } else {
          // Others maintain formation slots
          const slot = pl.formationSlotPos || { x: -20, z: 0 };
          const target = new THREE.Vector3(slot.x, 0, slot.z);
          const diff = target.sub(pl.group.position);
          if (diff.length() > 2.0) {
            pl.velocity.copy(diff).normalize().multiplyScalar(pl.speed * 0.65);
            pl.facingDir.copy(pl.velocity).normalize();
            pl.group.position.addScaledVector(pl.velocity, dt);
            pl.group.rotation.y = Math.atan2(pl.facingDir.x, pl.facingDir.z);
          }
        }
      } else {
        if (pl === nearestRed) {
          // Chase ball
          const diff = gameState.ballMesh.position.clone().sub(pl.group.position);
          const speed = pl.stamina > 15 ? pl.sprintSpeed : pl.speed;
          pl.velocity.copy(diff).normalize().multiplyScalar(speed * 0.72);
          pl.facingDir.copy(pl.velocity).normalize();
          pl.group.position.addScaledVector(pl.velocity, dt);
          pl.group.rotation.y = Math.atan2(pl.facingDir.x, pl.facingDir.z);
        } else {
          // Return to formation slot
          const slot = pl.formationSlotPos || { x: -20, z: 0 };
          const target = new THREE.Vector3(slot.x, 0, slot.z);
          if (gameState.ballDribbler && gameState.ballDribbler.team === TEAMS.RED) {
            target.x += 14.0; // push forward
          } else if (gameState.ballDribbler && gameState.ballDribbler.team === TEAMS.BLUE) {
            target.x -= 8.0; // pull back
          }
          const diff = target.sub(pl.group.position);
          if (diff.length() > 2.0) {
            pl.velocity.copy(diff).normalize().multiplyScalar(pl.speed * 0.68);
            pl.facingDir.copy(pl.velocity).normalize();
            pl.group.position.addScaledVector(pl.velocity, dt);
            pl.group.rotation.y = Math.atan2(pl.facingDir.x, pl.facingDir.z);
          } else {
            pl.velocity.set(0, 0, 0);
          }
        }
      }
    }

    // AI Logic: Team BLUE (Opponent AI)
    if (pl.team === TEAMS.BLUE) {
      const diffMulti = gameState.gameDifficulty === "easy" ? 0.58 : (gameState.gameDifficulty === "pro" ? 0.85 : 1.15);
      
      if (gameState.ballDribbler === pl) {
        // Attack: Dribble towards user's goal
        const opponentGoalX = -PITCH_LENGTH / 2;
        const goalTarget = new THREE.Vector3(opponentGoalX, 0, 0);
        
        // --- AI PASSING DECISION ---
        // Scan for nearby defenders
        let nearestDefenderDist = Infinity;
        gameState.players.forEach(p => {
          if (p.team === TEAMS.RED && !p.isGoalkeeper) {
            const d = p.group.position.distanceTo(pl.group.position);
            if (d < nearestDefenderDist) nearestDefenderDist = d;
          }
        });

        let shouldPass = false;
        let bestTeammate = null;

        // If defender is closing in, or occasionally to keep play dynamic, look to pass the ball!
        if (nearestDefenderDist < 7.0 || Math.random() < 0.02) {
          let bestScore = -Infinity;

          gameState.players.forEach(tm => {
            if (tm.team === TEAMS.BLUE && tm !== pl && !tm.isGoalkeeper && !tm.isStumbling && !tm.isFallen) {
              const distToTeammate = tm.group.position.distanceTo(pl.group.position);
              // Only pass to teammates in reasonable passing range (7.0 to 36.0 units)
              if (distToTeammate > 7.0 && distToTeammate < 36.0) {
                // Calculate distance to user's goal
                const myDistToGoal = Math.abs(pl.group.position.x - opponentGoalX);
                const tmDistToGoal = Math.abs(tm.group.position.x - opponentGoalX);
                
                // We want to pass FORWARD (teammate closer to target goal)
                const isForward = tmDistToGoal < myDistToGoal;

                if (isForward) {
                  // Count defenders near teammate to avoid passing to marked targets
                  let defendersNearTeammate = 0;
                  gameState.players.forEach(p => {
                    if (p.team === TEAMS.RED && !p.isGoalkeeper) {
                      if (p.group.position.distanceTo(tm.group.position) < 6.5) {
                        defendersNearTeammate++;
                      }
                    }
                  });

                  // Score: positive for forward progress, penalty for defenders near receiver
                  const progress = myDistToGoal - tmDistToGoal;
                  const score = progress - (defendersNearTeammate * 8.0);

                  if (score > bestScore) {
                    bestScore = score;
                    bestTeammate = tm;
                  }
                }
              }
            }
          });

          // If we found a good teammate forward who is relatively open, pass!
          if (bestTeammate && bestScore > -2.0) {
            shouldPass = true;
          }
        }

        if (shouldPass && bestTeammate) {
          pl.kickCooldown = 0.6;
          gameState.ballDribbler = null;
          const passDir = bestTeammate.group.position.clone().sub(gameState.ballMesh.position).normalize();
          const dist = bestTeammate.group.position.distanceTo(pl.group.position);
          
          // Determine speed and loft: longer distance needs a lob
          const passSpeed = Math.min(13.0 + dist * 0.18, 22.0);
          passDir.y = dist > 22.0 ? 0.22 : 0.05; // Lob for long pass, flat for short
          
          kickBall(passDir, passSpeed);
          gameState.passTarget = bestTeammate;
          return;
        }

        // Otherwise, dribble forward
        const diff = goalTarget.clone().sub(pl.group.position);
        pl.velocity.copy(diff).normalize().multiplyScalar(pl.speed * diffMulti);
        pl.facingDir.copy(pl.velocity).normalize();
        pl.group.position.addScaledVector(pl.velocity, dt);
        pl.group.rotation.y = Math.atan2(pl.facingDir.x, pl.facingDir.z);

        // Shoot if in range
        if (pl.group.position.x < -18 && Math.random() < 0.045) {
          pl.kickCooldown = 1.0;
          gameState.ballDribbler = null;
          const targetDir = goalTarget.clone().sub(gameState.ballMesh.position).normalize();
          targetDir.y += 0.22;
          kickBall(targetDir, 25 + Math.random() * 8);
          gameState.shotTaker = pl;
        }
      } else {
        // If a BLUE teammate pass is active, only the receiver runs towards the ball
        if (gameState.passTarget && gameState.passTarget.team === TEAMS.BLUE) {
          if (pl === gameState.passTarget) {
            const diff = gameState.ballMesh.position.clone().sub(pl.group.position);
            pl.velocity.copy(diff).normalize().multiplyScalar(pl.speed * diffMulti);
            pl.facingDir.copy(pl.velocity).normalize();
            pl.group.position.addScaledVector(pl.velocity, dt);
            pl.group.rotation.y = Math.atan2(pl.facingDir.x, pl.facingDir.z);
          } else {
            // Others return to slots
            const slot = pl.formationSlotPos || { x: -20, z: 0 };
            const target = new THREE.Vector3(-slot.x, 0, -slot.z);
            const diff = target.sub(pl.group.position);
            if (diff.length() > 2.0) {
              pl.velocity.copy(diff).normalize().multiplyScalar(pl.speed * 0.68 * diffMulti);
              pl.facingDir.copy(pl.velocity).normalize();
              pl.group.position.addScaledVector(pl.velocity, dt);
              pl.group.rotation.y = Math.atan2(pl.facingDir.x, pl.facingDir.z);
            }
          }
        } else {
          // Normal behavior: chase ball / press Red ball carrier
          if (pl === nearestBlue) {
            const diff = gameState.ballMesh.position.clone().sub(pl.group.position);
            pl.velocity.copy(diff).normalize().multiplyScalar(pl.speed * diffMulti);
            pl.facingDir.copy(pl.velocity).normalize();
            pl.group.position.addScaledVector(pl.velocity, dt);
            pl.group.rotation.y = Math.atan2(pl.facingDir.x, pl.facingDir.z);
          } else {
            // Return to formation slot
            const slot = pl.formationSlotPos || { x: -20, z: 0 };
            const target = new THREE.Vector3(-slot.x, 0, -slot.z);
            if (gameState.ballDribbler && gameState.ballDribbler.team === TEAMS.BLUE) {
              target.x -= 14.0;
            } else if (gameState.ballDribbler && gameState.ballDribbler.team === TEAMS.RED) {
              target.x += 8.0;
            }
            const diff = target.sub(pl.group.position);
            if (diff.length() > 2.0) {
              pl.velocity.copy(diff).normalize().multiplyScalar(pl.speed * 0.68 * diffMulti);
              pl.facingDir.copy(pl.velocity).normalize();
              pl.group.position.addScaledVector(pl.velocity, dt);
              pl.group.rotation.y = Math.atan2(pl.facingDir.x, pl.facingDir.z);
            } else {
              pl.velocity.set(0, 0, 0);
            }
          }
        }
      }
    }
  });
}
