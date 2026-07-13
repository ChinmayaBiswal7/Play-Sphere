  function updateBlueFlag(delta) {
    // Blue flag: shown ONLY when a car that has lapped the player is approaching from behind.
    // NEVER shown to the race leader (P1).
    if (!isRaceActive || isStartingSequence || !playerKart) return;
    if (raceTimer < 20.0) return;

    // Never show blue flag to P1
    // Use posRank (set by updateRacePositions) as ground truth
    const isPlayerP1 = (playerKart.posRank === 1);
    if (isPlayerP1) {
      // Player is P1 — hide any active blue flag and exit
      blueFlagActive = false;
      const alertEl = document.getElementById('rd-blue-flag-alert');
      if (alertEl) alertEl.style.display = 'none';
      return;
    }

    const playerLap = playerKart.completedLaps !== undefined ? playerKart.completedLaps : 0;
    let showBlue = false;
    let nearestCarBehind = null;
    let nearestCarDist = Infinity;

    racers.forEach(racer => {
      if (racer.isPlayer) return;
      if (racer.finished) return;
      
      const myInPit = playerKart.inPitLane || isPitting;
      const otherInPit = racer.inPitLane || racer.isPitting;
      if (myInPit !== otherInPit) return;
      
      // Car must be at least 1 FULL lap ahead (truly lapping us)
      if (getLapRelation(racer, playerKart) === "A_LAPPING_B") {
        const diff = racer.currentOffset - playerKart.currentOffset;
        const normDiff = ((diff % 1) + 1) % 1; // 0.0 to 1.0

        // Only evaluate if the car is behind the player (0.80 to 1.00 of the loop behind)
        if (normDiff > 0.80 && normDiff <= 1.0) {
          const distBehind = (1.0 - normDiff) * 1800;
          if (distBehind < nearestCarDist) {
            nearestCarDist = distBehind;
            nearestCarBehind = racer;
          }
          
          const lastGap = racer.lastBlueFlagGap;
          racer.lastBlueFlagGap = distBehind;
          const isClosing = lastGap !== undefined ? (distBehind < lastGap) : (racer.speed > playerKart.speed);

          if (distBehind < 180.0 && isClosing) {
            showBlue = true;
          }
        } else {
          racer.lastBlueFlagGap = undefined;
        }
      } else {
        racer.lastBlueFlagGap = undefined;
      }
    });

    const nearestName = nearestCarBehind ? nearestCarBehind.name : "None";
    const nearestLap = nearestCarBehind ? (nearestCarBehind.completedLaps || 0) : 0;
    const nearestDistStr = nearestCarBehind ? `${nearestCarDist.toFixed(1)}m` : "N/A";
//     console.log(`[BLUE FLAG CHECK] Player: Lap=${playerLap}, P=${playerKart.posRank} | NearestBehind: ${nearestName} (Lap=${nearestLap}, Dist=${nearestDistStr}) | ShowBlueFlag: ${showBlue}`);

    // Slow down AI karts that the player is lapping
    racers.forEach(racer => {
      if (racer.isPlayer || racer.finished) return;
      
      const myInPit = playerKart.inPitLane || isPitting;
      const otherInPit = racer.inPitLane || racer.isPitting;
      if (myInPit !== otherInPit) return;
      if (getLapRelation(playerKart, racer) === "A_LAPPING_B") {
        const diff = playerKart.currentOffset - racer.currentOffset;
        const normDiff = ((diff % 1) + 1) % 1;
        if (normDiff > 0.85 || normDiff < 0.10) {
          if (racer.speed) racer.speed *= 0.92;
        }
      }
    });

    const alertEl = document.getElementById('rd-blue-flag-alert');
    if (showBlue !== blueFlagActive) {
      blueFlagActive = showBlue;
      if (alertEl) alertEl.style.display = showBlue ? 'block' : 'none';
      if (showBlue) {
        rdShowMessage('BLUE FLAG — LAPPED CAR APPROACHING', 4.0, '#3b82f6');
        speakEngineerRadio('Blue flag. Let the lapping car through.', 75);
      }
    }
    if (!showBlue && alertEl) alertEl.style.display = 'none';
  }

  // ─── Illegal Overtake (under yellow sector) ────────────────────
  function checkIllegalOvertake(delta) {
    if (!isRaceActive || !playerKart) return;
    if (illegalOvertakeWarningTimer > 0) {
      illegalOvertakeWarningTimer -= delta;
      return;
    }
    if (!isPlayerInYellowSector()) return;

    const sorted = [...racers].sort((a, b) => getRacerScore(b) - getRacerScore(a));
    const playerIdx = sorted.findIndex(r => r.isPlayer);

    // Did player just overtake someone in a yellow sector?
    if (playerIdx < playerKart.lastYellowRank) {
      // Illegal overtake detected!
      rdShowMessage('⚠️ ILLEGAL OVERTAKE UNDER YELLOW — GIVE POSITION BACK', 5.0, '#eab308');
      speakEngineerRadio('You overtook under yellow. Give the position back immediately.', 90);
      showPenaltyPopup('GIVE POSITION BACK', 'Overtake under Yellow Flag');
      illegalOvertakeWarningTimer = 8.0; // 8 second grace window
      // Apply 5s time penalty if they don't give it back (simplified)
      setTimeout(() => {
        playerTimePenaltySeconds += 5;
        rdShowMessage('🚨 +5 SECOND PENALTY — ILLEGAL OVERTAKE', 4.0, '#e10600');
      }, 8000);
    }
    playerKart.lastYellowRank = playerIdx;
  }

  // ─── Formation Lap ─────────────────────────────────────────────
  function canStartFormationLap() {
    const currentSession = ["PRACTICE", "QUALIFYING", "RACE"][currentSessionIndex] || "PRACTICE";
    if (currentSession !== "RACE" || isStartingSequence || postRaceActive || !isRaceActive) {
      return false;
    }
    return true;
  }

  function requestFormationLap(source) {
    const currentSession = ["PRACTICE", "QUALIFYING", "RACE"][currentSessionIndex] || "PRACTICE";
    // console.trace(
    //   "[FORMATION REQUEST]",
    //   {
    //     source,
    //     currentSession,
    //     isStartingSequence,
    //     isRaceActive,
    //     playerPath: playerKart ? playerKart.currentPath : null,
    //     inPitLane: playerKart ? playerKart.inPitLane : null,
    //     driveOutState: playerKart ? playerKart.driveOutState : null
    //   }
    // );

    if (currentSession !== "RACE") {
      return false;
    }

    if (!canStartFormationLap()) {
      console.error(
        "[BLOCKED INVALID FORMATION REQUEST]",
        {
          source,
          currentSession,
          isStartingSequence,
          isRaceActive
        }
      );
      return false;
    }

    startFormationLapInternal();
    return true;
  }
  window.requestFormationLap = requestFormationLap;

  function startFormationLapInternal() {
    const currentSession = ["PRACTICE", "QUALIFYING", "RACE"][currentSessionIndex] || "PRACTICE";
    const raceState = isStartingSequence ? "STARTING_SEQUENCE" : (isRaceActive ? "RACING" : "INACTIVE");
    console.error(
      "[FORMATION ACTIVATED]",
      {
        currentSession,
        raceState,
        playerInPitLane: playerKart ? playerKart.inPitLane : false,
        pitAutopilot: playerKart ? playerKart.pitAutopilot : false,
        driveOutAutopilot: playerKart ? playerKart.driveOutAutopilot : false
      }
    );
    console.trace("[FORMATION ACTIVATION CALLER]");

    formationLapActive = true;
    window.formationLapActive = true;
    formationLapTimer = 0.0;
    rdShowMessage('🏎️ FORMATION LAP — GRID WARMING UP', 5.0, '#22c55e');
    speakEngineerRadio('Formation lap. Warm up your tyres. Grid formation in twelve seconds.', 85);
    updateFlagStrip('green');
  }

  function updateFormationLap(delta) {
    if (currentSessionIndex !== 2) {
      formationLapActive = false;
      window.formationLapActive = false;
      return;
    }
    if (!formationLapActive) return;
    formationLapTimer += delta;

    // Let player and AI drive slowly in a warm-up crawl
    if (playerKart) {
      playerKart.speed = Math.min(playerKart.speed, 22.0); // ~88 km/h max
    }
    racers.forEach(r => {
      if (!r.isPlayer) r.speed = Math.min(r.speed || 0, 20.0 + Math.random() * 4.0);
    });

    if (formationLapTimer >= FORMATION_LAP_DURATION) {
      formationLapActive = false;
      rdShowMessage('🏁 GRID LOCKED — STARTING SEQUENCE BEGINS', 3.0, '#fff');
      updateFlagStrip('none');
    }
  }

  // ─── Apply AI Personality to Physics ──────────────────
  function applyPersonalityToAI(racer, baseTargetSpeed, delta) {
    // Prefer new aiProfile (from createRacers) over old personality data
    let consistency, mistakeRate, speedMod;
    if (racer.aiProfile) {
      const p = racer.aiProfile;
      // Consistency: high-consistency drivers have very little jitter
      consistency   = p.consistency;          // 0-1
      mistakeRate   = (1.0 - p.consistency) * 0.08; // max ~2.4% for worst drivers
      speedMod      = THREE.MathUtils.clamp(0.97 + (p.pace - 0.85) * 0.20, 0.94, 1.06);
    } else {
      const p = getPersonality(racer);
      consistency   = p.cons;
      mistakeRate   = p.mistake;
      speedMod      = THREE.MathUtils.clamp(0.95 + p.speed * 0.10, 0.90, 1.08);
    }

    let targetSpeed = baseTargetSpeed * speedMod;

    // Micro-jitter from consistency (much smaller than before)
    const jitter = (Math.random() - 0.5) * (1.0 - consistency) * 1.2;
    targetSpeed += jitter;

    // Rare throttle lift (mistakes) — much lower probability than before
    if (Math.random() < mistakeRate * delta * 0.25) {
      targetSpeed *= 0.82; // Partial throttle lift, not a full brake snap
    }

    // VSC / Yellow sector: respect flags
    if (vscActive) targetSpeed = Math.min(targetSpeed, VSC_SPEED_LIMIT + Math.random() * 2.0);
    const sector = getSectorForOffset(racer.currentOffset);
    if (sectorFlags[sector] === 'yellow') targetSpeed = Math.min(targetSpeed, 28.0);

    // Red flag: gradual slow down
    if (redFlagActive) targetSpeed = Math.max(0, targetSpeed - delta * 40);

    return targetSpeed;
  }

  // ─── AI Braking Zones ──────────────────────────────────
  // Raised maxSpeed values so AI carries more corner speed (was: 22-36, now: 30-46)
  const AI_BRAKING_ZONES = [
    { from: 0.06,  to: 0.10,  maxSpeed: 40.0 },
    { from: 0.17,  to: 0.21,  maxSpeed: 34.0 },
    { from: 0.29,  to: 0.33,  maxSpeed: 30.0 },
    { from: 0.44,  to: 0.48,  maxSpeed: 44.0 },
    { from: 0.57,  to: 0.61,  maxSpeed: 36.0 },
    { from: 0.72,  to: 0.76,  maxSpeed: 38.0 },
    { from: 0.85,  to: 0.89,  maxSpeed: 42.0 }
  ];

  // ─── Penalty Display Timer ─────────────────────────────────────
  function updatePenaltyDisplay(delta) {
    if (pendingPenaltyDisplay) {
      pendingPenaltyDisplay.timer -= delta;
      if (pendingPenaltyDisplay.timer <= 0) pendingPenaltyDisplay = null;
    }
  }

  // ─── Main Race Director Tick (called every frame) ──────────────
  function updateRaceDirector(delta) {
    if (!isRaceActive) return;

    updateRCMessages(delta);
    updateMarshalSectors(delta);
    updateTrackLimits(delta);
    updateVSC(delta);
    updateRedFlag(delta);
    updateBlueFlag(delta);
    checkIllegalOvertake(delta);
    updateFormationLap(delta);
    updatePenaltyDisplay(delta);

    // Grace period: No flags for first 60 seconds of race
    const graceOver = raceTimer > 60.0;

    // Cooldown: minimum gap of 90s between any two flag/SC/VSC events
    const lastFlagTime = window._lastFlagEventTime || 0;
    const flagCooldownOver = (raceTimer - lastFlagTime) > 90.0;

    // VSC / Red Flag only on near-total car damage (90%+)
    // Old threshold was 70% — too easy to hit in normal racing
    if (graceOver && flagCooldownOver && carDamage > 90.0 && !vscActive && !safetyCarActive && !redFlagActive) {
      if (Math.random() < 0.0003) { // ~1% per minute at this damage level
        window._lastFlagEventTime = raceTimer;
        if (carDamage > 96.0) {
          deployRedFlag(18.0); // Only near-total wreck (96%+) triggers Red Flag
        } else {
          deployVSC(25.0);     // 90-96% damage = VSC
        }
      }
    }

    // Random local yellow sectors — extremely rare (effectively 0-1 per long race)
    // 0.000004/frame at 60fps = ~0.014% per minute — disabled for short 2-lap races
    if (graceOver && flagCooldownOver && Math.random() < 0.000004) {
      window._lastFlagEventTime = raceTimer;
      const randomSector = Math.floor(Math.random() * SECTOR_COUNT);
      setSectorYellow(randomSector, 10.0);
      rdShowMessage(`⚠️ LOCAL YELLOW — SECTOR ${randomSector + 1} INCIDENT`, 3.0, '#eab308');
    }
  }

  // ─── Reset Race Director for new race ─────────────────────────
  function resetRaceDirector() {
    vscActive = false;
    vscTimer = 0;
    redFlagActive = false;
    window._lastFlagEventTime = 0; // reset flag cooldown for new race
    redFlagTimer = 0;
    redFlagRestartPending = false;
    trackLimitWarnings = 0;
    trackLimitCooldown = 0;
    playerTimePenaltySeconds = 0;
    driveThroughPending = false;
    stopGoPending = false;
    stopGoTimer = 0;
    blueFlagActive = false;
    blueFlagTimer = 0;
    formationLapActive = false;
    formationLapTimer = 0;
    sectorFlags = new Array(SECTOR_COUNT).fill('green');
    sectorFlagTimers = new Array(SECTOR_COUNT).fill(0.0);
    rcMessageQueue = [];
    rcCurrentMsg = null;
    rcMsgTimer = 0;
    illegalOvertakeWarningTimer = 0;
    illegalOvertakeCarAhead = null;
    pendingPenaltyDisplay = null;

    // Hide all RD HUD elements
    ['rd-flag-strip','rd-rc-banner','rd-penalty-popup','rd-blue-flag-alert',
     'rd-track-limit-hud','rd-vsc-overlay','rd-red-flag-overlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const tc = document.getElementById('rd-track-limit-count');
    if (tc) tc.innerText = '0';
  }

  // ── SAFETY CAR END — complete state reset ───────────────────────────────
  function endSafetyCarPeriod() {
  console.log('[SAFETY CAR] PERIOD END — restoring full race pace');

  // Remove SC mesh from scene
  if (safetyCarMesh) {
    scene.remove(safetyCarMesh);
    safetyCarMesh = null;
  }
  safetyCarActive = false;
  safetyCarTimer = 0;

  // ── Player: clear every temporary restriction ──
  if (playerKart) {
    playerKart.pitLimiterActive = false;
    window.overtakeModeActive = false;
    playerKart.speed = Math.max(playerKart.speed, 25.0); // instantly restore race pace!
    console.log('[SAFETY CAR] Player restrictions cleared. pitLimiter:', playerKart.pitLimiterActive);
  }

  // ── AI: clear formation/follow flags ──
  racers.forEach(car => {
    if (!car.isPlayer) {
      car.followSafetyCar = false;
      car.formationMode   = false;
      car.speed = Math.max(car.speed, 25.0); // instantly restore race pace!
    }
  });

    // HUD cleanup
    hideFlagCard();
    updateFlagStrip('none');
    rdShowMessage('GREEN FLAG — SAFETY CAR ENDING THIS LAP', 4.0, '#22c55e');
    speakEngineerRadio('Safety Car in this lap. Green Flag! Back to race pace.');
    const overlay = document.getElementById('f1-starting-lights-overlay');
    if (overlay) { overlay.classList.add('hidden'); overlay.style.display = 'none'; }

    console.log('[SAFETY CAR] NORMAL RACING RESTORED');
  }

