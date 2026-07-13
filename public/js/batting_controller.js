// Batting Controller Module
function triggerBatSwing() {
  if (window.gameState !== window.STATES.BALL_IN_FLIGHT) return;
  if (window.hasSwungThisBall) return;

  window.hasSwungThisBall = true;
  window.swingPressTime   = window.clock.getElapsedTime();
  window.swingResolved    = false;
  window.swingPhase       = 1; // kick off backswing
  window.swingT           = 0;
  window.shotDirection    = window.shotAngle;

  // Determine current shot style
  if (!window.MATCH.userIsBatting) {
    if (window.MATCH.aiIsLofted) {
      window.currentShotStyle = 'LOFT';
    } else if (window.MATCH.aiIsDefensive) {
      window.currentShotStyle = 'DEFENSE';
    } else {
      window.currentShotStyle = 'DRIVE';
    }
    window.currentShotModifier = '';
  } else {
    // Resolve keys and controller buttons for modifiers
    let isAdvance = (window.keys.w || window.controllerInput.btnR3);
    let isGrounded = (window.keys.a || window.controllerInput.btnL1);
    let isUnorthodox = (window.keys.d || window.controllerInput.btnR1);
    let isPrecision = (window.keys.space || window.controllerInput.btnSquare);

    window.currentShotModifier = '';
    if (isAdvance) {
      window.currentShotModifier = 'ADVANCE';
      // Physically step batsman down the pitch!
      if (window.batsmanMesh) {
        window.batsmanMesh.position.z = window.BATSMAN_CREASE_Z - 0.75;
      }
      if (window.batBody) {
        window.batBody.position.z = window.BATSMAN_CREASE_Z - 0.75 - 0.22;
      }
    } else if (isGrounded) {
      window.currentShotModifier = 'GROUNDED';
    } else if (isUnorthodox) {
      window.currentShotModifier = 'UNORTHODOX';
    } else if (isPrecision) {
      window.currentShotModifier = 'PRECISION';
    }

    if (window.controllerInput.btnTriangle) {
      window.currentShotStyle = 'LOFT';
    } else if (window.controllerInput.btnCircle) {
      window.currentShotStyle = 'DEFENSE';
    } else if (window.controllerInput.btnSquare) {
      window.currentShotStyle = 'POWER';
    } else {
      // Check keys for keyboard backup
      if (window.keys.ctrl) {
        window.currentShotStyle = 'LOFT';
      } else if (window.keys.shift) {
        window.currentShotStyle = 'DEFENSE';
      } else {
        window.currentShotStyle = 'DRIVE';
      }
    }
  }
  console.log(`[Game] Batsman swing triggered! Style: ${window.currentShotStyle}, Direction: ${window.shotDirection}`);
}

function updateLastBallHUD(speedKmh, timingText, shotType = null) {
  const el = document.getElementById('hud-last-ball-stat');
  if (el) {
    let text = `LAST BALL: ${speedKmh} km/h`;
    if (timingText) text += ` • ${timingText}`;
    if (shotType) text += ` • ${shotType}`;
    el.innerText = text;
  }
}

function getShotName(angle, isLofted, isDefensive) {
  let modifierPrefix = '';
  if (window.currentShotModifier && window.MATCH.userIsBatting) {
    modifierPrefix = window.currentShotModifier + ' ';
    if (window.currentShotModifier === 'GROUNDED') {
      isLofted = false; // Grounded shots are never lofted
    }
  }

  if (isDefensive) return modifierPrefix + "BLOCK";

  let a = angle;
  while (a < -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;

  let idx = Math.round(a / (Math.PI / 4));
  if (idx < 0) idx += 8;
  idx = idx % 8;

  const names = {
    0: { normal: "Straight Drive", lofted: "Lofted Straight Drive" },
    1: { normal: "On Drive",       lofted: "Lofted On Drive" },
    2: { normal: "Pull Shot",      lofted: "Lofted Pull" },
    3: { normal: "Flick",          lofted: "Lofted Flick" },
    4: { normal: "Defensive Block",lofted: "Chip" },
    5: { normal: "Leg Glance",     lofted: "Lofted Glance" },
    6: { normal: "Cut Shot",       lofted: "Upper Cut" },
    7: { normal: "Cover Drive",    lofted: "Lofted Cover Drive" }
  };

  const shot = names[idx] || names[0];
  const baseShotName = isLofted ? shot.lofted.toUpperCase() : shot.normal.toUpperCase();
  return (modifierPrefix + baseShotName).toUpperCase();
}

function checkTiming() {
  if (window.swingResolved) return;

  const ballX = window.ballBody ? window.ballBody.position.x : 0.8;
  const ballY = window.ballBody ? window.ballBody.position.y : 1.8;

  // --- no swing was pressed → automatic miss or wide ---
  if (!window.hasSwungThisBall) {
    window.swingResolved = true;

    // Check for wide ball down leg side or off side
    const isRightHanded = ((window.stanceX || 0.8) > 0);
    const isWide = isRightHanded ? (ballX > 1.15 || ballX < -0.75) : (ballX < -1.15 || ballX > 0.75);

    if (isWide) {
      window.MATCH.isWideThisBall = true;
      console.log(`[Wide Detection] Ball X: ${ballX.toFixed(2)}, Stance X: ${window.stanceX}. Declared WIDE!`);
    }

    if (typeof window.showFeedback === 'function') {
      if (isWide) {
        window.showFeedback('WIDE BALL!', '+1 EXTRA RUN', 'perfect');
      } else {
        window.showFeedback('NO SHOT!', 'MISSED', 'missed');
      }
    }
    window.ballMissed = true;
    updateLastBallHUD(window.deliverySpeedKmh, isWide ? 'WIDE' : 'NO SHOT', null);
    return;
  }

  window.swingResolved = true; // prevent double-resolve

  // Ball line check — too wide or too high?
  const horizontalDist = Math.abs(ballX - (window.stanceX || 0));
  if (horizontalDist > 1.3 || ballY > 2.0) {
    const isRightHanded = ((window.stanceX || 0.8) > 0);
    const isWide = isRightHanded ? (ballX > 1.15 || ballX < -0.75) : (ballX < -1.15 || ballX > 0.75);

    if (isWide) {
      window.MATCH.isWideThisBall = true;
      if (typeof window.showFeedback === 'function') {
        window.showFeedback('WIDE BALL!', '+1 EXTRA RUN', 'perfect');
      }
      window.ballMissed = true;
      updateLastBallHUD(window.deliverySpeedKmh, 'WIDE', null);
    } else {
      if (typeof window.showFeedback === 'function') {
        window.showFeedback('TOO WIDE!', 'MISSED', 'missed');
      }
      window.ballMissed = true;
      updateLastBallHUD(window.deliverySpeedKmh, 'TOO WIDE', null);
    }
    return;
  }

  let isLofted = (window.controllerInput.btnTriangle || window.keys.ctrl);
  let isDefensive = (window.controllerInput.btnCircle || window.keys.shift);
  if (!window.MATCH.userIsBatting && window.matchMode === window.MODES.SOLO) {
    isLofted = window.MATCH.aiIsLofted || false;
    isDefensive = window.MATCH.aiIsDefensive || false;
  }
  const shotType = getShotName(window.shotDirection, isLofted, isDefensive);

  // Compute Footwork and Shot Choice for the Shot Rating Card
  const footDiff = Math.abs(ballX - (window.stanceX || 0));
  let footwork = 'IDEAL';
  if (footDiff > 0.6) footwork = 'POOR';
  else if (footDiff > 0.25) footwork = 'GOOD';

  let choice = 'IDEAL';
  let choiceClass = 'perfect';

  if (window.deliveryType.toLowerCase().includes('yorker')) {
    if (isDefensive) {
      choice = 'IDEAL'; choiceClass = 'perfect';
    } else if (isLofted) {
      choice = 'POOR'; choiceClass = 'missed';
    } else {
      choice = 'GOOD'; choiceClass = 'good';
    }
  } else if (window.deliveryType.toLowerCase().includes('bouncer')) {
    if (isLofted) {
      choice = 'IDEAL'; choiceClass = 'perfect';
    } else if (isDefensive) {
      choice = 'GOOD'; choiceClass = 'good';
    } else {
      choice = 'POOR'; choiceClass = 'missed';
    }
  } else {
    if (isDefensive) {
      choice = 'GOOD'; choiceClass = 'good';
    } else {
      choice = 'IDEAL'; choiceClass = 'perfect';
    }
  }

  // --- Defensive block ---
  if (isDefensive) {
    // Compute block timing offset for player feedback
    const now = window.clock.getElapsedTime();
    const ballTravelRemaining = (window.BATSMAN_CREASE_Z - window.ballBody.position.z) / Math.max(window.ballBody.velocity.z, 0.1);
    const pressedAt = window.swingPressTime;
    const ballArrivalEstimate = now + ballTravelRemaining;
    const dt = pressedAt - ballArrivalEstimate;
    const ms = Math.round(dt * 1000);
    const msSign = ms > 0 ? '+' : '';
    const msText = `${msSign}${ms}ms`;

    let blockTimingText = 'GOOD';
    let blockTimingClass = 'good';
    if (Math.abs(dt) <= 0.015) { blockTimingText = 'PERFECT'; blockTimingClass = 'perfect'; }
    else if (Math.abs(dt) <= 0.05) { blockTimingText = 'GOOD'; blockTimingClass = 'good'; }
    else if (Math.abs(dt) <= 0.12) { blockTimingText = 'EARLY/LATE'; blockTimingClass = 'early'; }
    else { blockTimingText = 'POOR'; blockTimingClass = 'missed'; }

    if (blockTimingClass === 'missed') {
      const isRightHanded = ((window.stanceX || 0.8) > 0);
      const isWide = isRightHanded ? (ballX > 1.15 || ballX < -0.75) : (ballX < -1.15 || ballX > 0.75);

      if (isWide) {
        window.MATCH.isWideThisBall = true;
        if (typeof window.showFeedback === 'function') {
          window.showFeedback('WIDE BALL!', '+1 EXTRA RUN', 'perfect');
        }
        window.ballMissed = true;
        updateLastBallHUD(window.deliverySpeedKmh, 'WIDE', shotType);
      } else {
        if (typeof window.showFeedback === 'function') {
          window.showFeedback('MISSED!', 'DEFENDED LATE/EARLY', 'missed');
        }
        window.ballMissed = true;
        updateLastBallHUD(window.deliverySpeedKmh, `MISSED`, shotType);
        if (window.showShotCard) {
          window.showShotCard(footwork, blockTimingText, blockTimingClass, choice, choiceClass);
        }
      }
      return;
    }

    if (typeof window.showFeedback === 'function') {
      window.showFeedback('DEFENDED', 'BLOCKED', 'good');
    }
    deflectBall(0, false, blockTimingClass, true);
    if (typeof window.setGameState === 'function') window.setGameState(window.STATES.HIT);

    updateLastBallHUD(window.deliverySpeedKmh, `BLOCKED (${blockTimingText})`, shotType);
    
    if (window.showShotCard) {
      window.showShotCard(footwork, blockTimingText, blockTimingClass, choice, choiceClass);
    }
    if (window.triggerFieldingFSM) window.triggerFieldingFSM();
    return;
  }

  // Timing
  const now = window.clock.getElapsedTime();
  const ballTravelRemaining = (window.BATSMAN_CREASE_Z - window.ballBody.position.z) / Math.max(window.ballBody.velocity.z, 0.1);
  const pressedAt = window.swingPressTime;
  const ballArrivalEstimate = now + ballTravelRemaining;
  const dt = pressedAt - ballArrivalEstimate;
  let absDt = Math.abs(dt);

  // PRECISION shot modifier: Widen the timing window by scaling absDt down by 0.6x (making timing 1.66x more lenient!)
  if (window.currentShotModifier === 'PRECISION' && window.MATCH.userIsBatting) {
    absDt *= 0.6;
  }
  const ms = Math.round(dt * 1000);
  const msSign = ms > 0 ? '+' : '';
  const msText = `${msSign}${ms}ms`;

  let timingText, timingClass, runs, hudTiming, timingLabel;

  if (absDt <= 0.015) {
    timingText  = `🎯 PERFECT!`;
    hudTiming   = `PERFECT`;
    timingLabel = 'PERFECT';
    timingClass = 'perfect';
    runs = isLofted ? 6 : 4;
  } else if (absDt <= 0.05) {
    timingText  = `✅ GOOD`;
    hudTiming   = `GOOD`;
    timingLabel = 'GOOD';
    timingClass = 'good';
    runs = isLofted ? 4 : 2;
  } else if (absDt <= 0.12) {
    timingText  = dt < 0 ? `⚡ EARLY` : `🐢 LATE`;
    hudTiming   = dt < 0 ? `EARLY` : `LATE`;
    timingLabel = dt < 0 ? 'EARLY' : 'LATE';
    timingClass = dt < 0 ? 'early' : 'late';
    if (isLofted) {
      triggerCaughtOut(timingLabel);
      updateLastBallHUD(window.deliverySpeedKmh, `IN THE AIR (${timingLabel})`, shotType);
      if (window.showShotCard) {
        window.showShotCard(footwork, timingLabel, timingClass, choice, choiceClass);
      }
      return;
    }
    runs = 1;
  } else if (absDt <= 0.18) {
    timingText  = dt < 0 ? `⚡ VERY EARLY` : `🐢 VERY LATE`;
    hudTiming   = dt < 0 ? `VERY EARLY` : `VERY LATE`;
    timingLabel = dt < 0 ? 'VERY EARLY' : 'VERY LATE';
    timingClass = dt < 0 ? 'veryearly' : 'verylate';
    if (isLofted) {
      triggerCaughtOut(timingLabel);
      updateLastBallHUD(window.deliverySpeedKmh, `IN THE AIR (${timingLabel})`, shotType);
      if (window.showShotCard) {
        window.showShotCard(footwork, timingLabel, timingClass, choice, choiceClass);
      }
      return;
    }
    runs = 0; // Dot ball
  } else {
    const isRightHanded = ((window.stanceX || 0.8) > 0);
    const isWide = isRightHanded ? (ballX > 1.15 || ballX < -0.75) : (ballX < -1.15 || ballX > 0.75);

    if (isWide) {
      window.MATCH.isWideThisBall = true;
      if (typeof window.showFeedback === 'function') {
        window.showFeedback('WIDE BALL!', '+1 EXTRA RUN', 'perfect');
      }
      window.ballMissed = true;
      updateLastBallHUD(window.deliverySpeedKmh, 'WIDE', shotType);
    } else {
      timingText  = `❌ MISSED!`;
      hudTiming   = `POOR`;
      timingLabel = 'POOR';
      timingClass = 'missed';
      window.ballMissed = true;
      updateLastBallHUD(window.deliverySpeedKmh, `MISSED`, shotType);
      if (window.showShotCard) {
        window.showShotCard(footwork, timingLabel, timingClass, choice, choiceClass);
      }
    }
    return;
  }


  if (typeof window.showFeedback === 'function') {
    window.showFeedback(timingText, 'SHOT PLAYED', timingClass);
  }
  deflectBall(runs, isLofted, timingClass, false);
  if (typeof window.setGameState === 'function') window.setGameState(window.STATES.HIT);
  updateLastBallHUD(window.deliverySpeedKmh, `SHOT PLAYED (${hudTiming})`, shotType);
  
  if (window.showShotCard) {
    window.showShotCard(footwork, timingLabel, timingClass, choice, choiceClass);
  }
  if (window.triggerFieldingFSM) window.triggerFieldingFSM();
}

function triggerCaughtOut(timingLabel) {
  const CANNON = window.CANNON;
  let angle = window.shotDirection;
  angle += (Math.random() - 0.5) * 0.4;

  const hitPower = 14 + Math.random() * 5;
  const vx = Math.sin(angle) * hitPower;
  const vy = 9 + Math.random() * 3.5; // skies it
  const vz = -Math.cos(angle) * hitPower;

  if (window.ballBody) {
    window.ballBody.type = CANNON.Body.DYNAMIC;
    window.ballBody.mass = 0.16;
    window.ballBody.updateMassProperties();
    window.ballBody.velocity.set(vx, vy, vz);
  }

  if (typeof window.showFeedback === 'function') {
    window.showFeedback(timingLabel ? `MISTIMED (${timingLabel})` : 'MISTIMED!', 'IN THE AIR', 'veryearly');
  }
  window.MATCH.isOutThisBall = true;
  window.MATCH.outType = 'CAUGHT';
  window.MATCH.catchPossible = true;
  if (window.CricketAudio && window.CricketAudio.playGasp) window.CricketAudio.playGasp();

  if (typeof window.setGameState === 'function') window.setGameState(window.STATES.HIT);
  if (window.triggerFieldingFSM) window.triggerFieldingFSM();
}

function deflectBall(runs, isLofted, timingClass, isDefensive) {
  const CANNON = window.CANNON;
  let angle = window.shotDirection;
  
  if (window.currentShotModifier === 'UNORTHODOX' && window.MATCH.userIsBatting) {
    // Unorthodox modifier: sweep or reverse sweep deflection angle
    if (angle > 0) {
      angle += Math.PI / 2;
    } else {
      angle -= Math.PI / 2;
    }
  }

  if (isDefensive) {
    angle = window.shotDirection * 0.3;
  }

  let hitPower = 12;
  if (runs === 6) hitPower = 28;
  if (runs === 4) hitPower = 22;
  if (runs === 2) hitPower = 16;
  if (runs === 1) hitPower = 11;

  if (window.controllerInput.btnR2) {
    hitPower *= 1.2;
  }

  // Apply modifier multipliers
  if (window.currentShotModifier && window.MATCH.userIsBatting) {
    if (window.currentShotModifier === 'ADVANCE') {
      hitPower *= 1.25; // 25% extra power for advancing down the pitch
    } else if (window.currentShotModifier === 'PRECISION') {
      hitPower *= 0.85; // 15% power trade-off for easier timing
    } else if (window.currentShotModifier === 'UNORTHODOX') {
      hitPower *= (0.9 + Math.random() * 0.25);
    }
  }

  const striker = window.MATCH.batters[window.MATCH.strikerIndex];
  if (striker && striker.stamina < 40) {
    hitPower *= 0.85; // 15% reduction when tired!
  }

  let deflectionOffset = 0;
  let vy = 0.8 + Math.random() * 0.8;

  if (window.currentShotModifier === 'GROUNDED' && window.MATCH.userIsBatting) {
    vy = 0.1 + Math.random() * 0.15; // force very low bounce
    isLofted = false;
  } else if (isDefensive) {
    hitPower *= 0.25; // soft drop
    vy = 0.2 + Math.random() * 0.3;
  } else {
    if (timingClass === 'perfect') {
      hitPower *= 1.3;
      vy = isLofted ? 12 : 0.3 + Math.random() * 0.3;
    } else if (timingClass === 'good') {
      hitPower *= 1.1;
      vy = isLofted ? 9 : 0.7 + Math.random() * 0.5;
    } else if (timingClass === 'early' || timingClass === 'late') {
      hitPower *= 0.6;
      deflectionOffset = (Math.random() - 0.5) * 0.3;
      vy = isLofted ? 7.5 : 0.4 + Math.random() * 0.5;
    } else if (timingClass === 'veryearly' || timingClass === 'verylate') {
      hitPower *= 0.35;
      deflectionOffset = (Math.random() - 0.5) * 0.6;
      vy = isLofted ? 5.5 + Math.random() * 2.5 : 0.3 + Math.random() * 0.4;
    }
  }

  angle += deflectionOffset;

  const vx = Math.sin(angle) * hitPower;
  const vz = -Math.cos(angle) * hitPower;

  if (window.ballBody) {
    window.ballBody.type = CANNON.Body.DYNAMIC;
    window.ballBody.mass = 0.16;
    window.ballBody.updateMassProperties();
    window.ballBody.velocity.set(vx, vy, vz);
    window.ballBody.angularVelocity.set((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);
  }
  
  // Always start with 0 runs on hit. Runs are either run between wickets
  // or awarded when the ball physically crosses the boundary line.
  window.MATCH.runsThisBall = 0;


  window.MATCH.catchPossible = isLofted && (vy >= 2.0 && !isDefensive);
}

function triggerWicketsClatter() {
  const CANNON = window.CANNON;
  if (window.stumpBodies) {
    window.stumpBodies.forEach((body, idx) => {
      if (idx < 3) {
        body.type = CANNON.Body.DYNAMIC;
        body.mass = 0.5;
        body.updateMassProperties();
        body.velocity.set((Math.random() - 0.5) * 3, 2 + Math.random() * 3, 4 + Math.random() * 4);
        body.angularVelocity.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      }
    });
  }

  if (window.bailBodies) {
    window.bailBodies.forEach((body, idx) => {
      if (idx < 2) {
        body.type = CANNON.Body.DYNAMIC;
        body.mass = 0.05;
        body.updateMassProperties();
        body.velocity.set((Math.random() - 0.5) * 4, 3 + Math.random() * 4, 3 + Math.random() * 5);
        body.angularVelocity.set(Math.random() * 12, Math.random() * 12, Math.random() * 12);
      }
    });
  }
}

function callRun() {
  // Allow calling a run from HIT state (first run) OR from RUNNING state (subsequent runs)
  const gs = window.gameState;
  if (gs !== window.STATES.HIT && gs !== window.STATES.RUNNING) return;
  if (window.runningState !== 'idle') return;
  // Don't allow a new run if fielder already has ball or boundary scored
  if (window.fielderRetrieved) return;
  if (window.MATCH && window.MATCH.ballDead) return;

  window.runningState = 'called';
  window.runStartTime = window.clock.getElapsedTime();
  window.runProgress  = 0;
  if (typeof window.setGameState === 'function') window.setGameState(window.STATES.RUNNING);
}

function cancelRun() {
  if (window.runningState !== 'called') return;
  if (window.runProgress > 0.5) return;
  window.runningState = 'cancelled';
  window.runStartTime = window.clock.getElapsedTime() - (1 - window.runProgress) * window.RUN_DURATION;
  
  if (typeof window.showFeedback === 'function') {
    window.showFeedback('SENT BACK!', 'CANCEL', 'late');
  }
  setTimeout(() => { 
    window.runningState = 'idle'; 
    window.runProgress = 0; 
    if (window.batsmanMesh) window.batsmanMesh.position.z = window.BATSMAN_CREASE_Z; 
    if (window.nonStrikerMesh) {
      window.nonStrikerMesh.position.z = window.nonStrikerStartZ;
    }
  }, 600);
}

// Expose functions globally
window.triggerBatSwing = triggerBatSwing;
window.updateLastBallHUD = updateLastBallHUD;
window.getShotName = getShotName;
window.checkTiming = checkTiming;
window.triggerCaughtOut = triggerCaughtOut;
window.deflectBall = deflectBall;
window.triggerWicketsClatter = triggerWicketsClatter;
window.callRun = callRun;
window.cancelRun = cancelRun;
