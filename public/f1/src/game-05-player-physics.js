  function updatePlayerPhysics(delta) {
    if (!playerKart || !playerKart.mesh) return;
    let isGravel = false;

    // Start updates

    if (postRaceActive && postRaceState === "FINISHING") {
      // Auto-drive player kart down the center of the track
      playerKart.speed = THREE.MathUtils.lerp(playerKart.speed, 18.0, delta * 3.0);
      playerKart.sideOffset = THREE.MathUtils.lerp(playerKart.sideOffset, 0.0, delta * 2.0);
      
      const stepSize = (playerKart.speed * delta) / 1800;
      playerKart.currentOffset = (playerKart.currentOffset + stepSize + 1.0) % 1.0;

      const point = trackCurve.getPointAt(playerKart.currentOffset);
      const tangent = trackCurve.getTangentAt(playerKart.currentOffset).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      
      point.add(normal.multiplyScalar(playerKart.sideOffset));
      playerKart.mesh.position.copy(point);
      playerKart.mesh.lookAt(point.clone().add(tangent));
      return;
    }

    if (isPitStopActive && pitCurve) {
      playerKart.speed = 0.0;
      const totalBoxes = F1_TEAMS.length;
      const stopT = 0.30 + (selectedTeamIndex / Math.max(1, totalBoxes - 1)) * 0.40;
      pitProgress = stopT;
      
      const pt = pitCurve.getPointAt(stopT);
      const tang = pitCurve.getTangentAt(stopT).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      const boxPos = pt.clone().add(norm.multiplyScalar(6.0));
      
      // Smoothly interpolate position and heading over the first 0.4 seconds of the stop
      if (playerKart.pitStopSnapTime === undefined) {
        playerKart.pitStopSnapTime = 0.0;
        playerKart.pitStopStartPos = playerKart.mesh.position.clone();
        playerKart.pitStopStartHeading = playerKart.heading;
      }
      
      playerKart.pitStopSnapTime = Math.min(0.4, playerKart.pitStopSnapTime + delta);
      const t = playerKart.pitStopSnapTime / 0.4;
      const tSmooth = t * t * (3 - 2 * t); // smoothstep
      
      playerKart.mesh.position.lerpVectors(playerKart.pitStopStartPos, boxPos, tSmooth);
      
      // Interpolate heading
      const targetHeading = Math.atan2(tang.x, tang.z);
      let diff = targetHeading - playerKart.pitStopStartHeading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      playerKart.heading = playerKart.pitStopStartHeading + diff * tSmooth;
      
      // Set visual rotation setting (look direction)
      playerKart.mesh.rotation.y = playerKart.heading;
      playerKart.mesh.rotation.x = 0;
      playerKart.mesh.rotation.z = 0;

      // Reset visual steering visuals during pit stop
      playerKart.visualSteeringAngle = 0.0;
      playerKart.steeringWheelAngle = 0.0;
      if (playerKart.mesh.wheels && playerKart.mesh.wheels.length >= 2) {
        playerKart.mesh.wheels[0].rotation.y = 0.0;
        playerKart.mesh.wheels[1].rotation.y = 0.0;
      }
      if (playerKart.mesh.steeringWheel) {
        playerKart.mesh.steeringWheel.rotation.z = 0.0;
      }
      if (playerKart.mesh.leftArm && playerKart.mesh.rightArm) {
        playerKart.mesh.leftArm.position.set(-0.25, 0.68, 0.55);
        playerKart.mesh.leftArm.rotation.set(-Math.PI / 12, 0, 0);
        playerKart.mesh.rightArm.position.set(0.25, 0.68, 0.55);
        playerKart.mesh.rightArm.rotation.set(-Math.PI / 12, 0, 0);
      }
      return;
    }

    if (playerKart.qualifyingState === "GARAGE" && pitCurve) {
      playerKart.speed = 0.0;
      playerKart.inPitLane = true;
      playerKart.currentPath = "PIT";
      
      const totalBoxes = F1_TEAMS.length;
      const pBoxT = 0.30 + (selectedTeamIndex / Math.max(1, totalBoxes - 1)) * 0.40;
      pitProgress = pBoxT;
      
      const pt = pitCurve.getPointAt(pBoxT);
      const tang = pitCurve.getTangentAt(pBoxT).normalize();
      
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      playerKart.mesh.position.copy(pt.clone().add(norm.multiplyScalar(17.0)));
      playerKart.heading = Math.atan2(tang.x, tang.z);
      playerKart.mesh.rotation.y = playerKart.heading;
      playerKart.mesh.rotation.x = 0;
      playerKart.mesh.rotation.z = 0;
      return;
    }

    // Safety check to prevent any NaN propagation
    if (playerKart.sideOffset === undefined || Number.isNaN(playerKart.sideOffset)) {
      playerKart.sideOffset = 0.0;
    }

    // ─── GAMEPAD CONTROLLER INTEGRATION ───
    let gamepadSteer = 0.0;
    let gamepadThrottle = 0.0;
    let gamepadBrake = 0.0;
    let gamepadDrift = false;
    let gamepadDrsPressed = false;
    let gamepadUpshiftPressed = false;
    let gamepadDownshiftPressed = false;
    let gamepadStatusPressed = false;

    const gamepads = (typeof navigator.getGamepads === 'function') ? navigator.getGamepads() : [];
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gp = gamepads[i];
        break; // first connected gamepad
      }
    }

    if (gp) {
      // 1. Steering (Left Stick horizontal - Axis 0)
      if (Math.abs(gp.axes[0]) > 0.12) {
        gamepadSteer = gp.axes[0]; // -1.0 to 1.0
      }
      
      // 2. Throttle: Right Trigger (Button 7 value) or Button 0 (A / Cross)
      const rTrigger = gp.buttons[7];
      if (rTrigger && rTrigger.value > 0.05) {
        gamepadThrottle = rTrigger.value;
      } else if (gp.buttons[0] && gp.buttons[0].pressed) {
        gamepadThrottle = 1.0;
      }

      // 3. Brake: Left Trigger (Button 6 value) or Button 1 (B / Circle)
      const lTrigger = gp.buttons[6];
      if (lTrigger && lTrigger.value > 0.05) {
        gamepadBrake = lTrigger.value;
      } else if (gp.buttons[1] && gp.buttons[1].pressed) {
        gamepadBrake = 1.0;
      }

      // 4. Drift: Button 2 (X / Square) or Button 8 (Select/Back)
      if ((gp.buttons[2] && gp.buttons[2].pressed) || (gp.buttons[8] && gp.buttons[8].pressed)) {
        gamepadDrift = true;
      }

      // 5. DRS/Overtake: Button 3 (Y / Triangle)
      if (gp.buttons[3] && gp.buttons[3].pressed) {
        gamepadDrsPressed = true;
      }

      // 6. Manual Gears: RB (Button 5) for Upshift, LB (Button 4) for Downshift
      if (gp.buttons[5] && gp.buttons[5].pressed) {
        gamepadUpshiftPressed = true;
      }
      if (gp.buttons[4] && gp.buttons[4].pressed) {
        gamepadDownshiftPressed = true;
      }

      // 7. Status / Telemetry panel: Button 9 (Start)
      if (gp.buttons[9] && gp.buttons[9].pressed) {
        gamepadStatusPressed = true;
      }
    }

    // Keep track of edge-triggered buttons (pressed this frame but not last frame)
    if (window.lastGamepadDrs === undefined) window.lastGamepadDrs = false;
    if (window.lastGamepadUpshift === undefined) window.lastGamepadUpshift = false;
    if (window.lastGamepadDownshift === undefined) window.lastGamepadDownshift = false;
    if (window.lastGamepadStatus === undefined) window.lastGamepadStatus = false;

    // Toggle DRS on press (rising edge)
    if (gamepadDrsPressed && !window.lastGamepadDrs && isRaceActive) {
      if (window.f1RegulationEra === '2026') {
        if (drsAvailable) {
          drsActive = !drsActive;
          if (window.ApexAudio) window.ApexAudio.playBoost();
          speakEngineerRadio(drsActive ? 'DRS open.' : 'DRS closed.', 70);
        } else if (window.overtakeModeEligible && window.ersBatteryLevel > 5.0) {
          window.overtakeModeActive = true;
          if (window.ApexAudio) window.ApexAudio.playBoost();
        }
      } else {
        drsActive = !drsActive;
        if (window.ApexAudio) window.ApexAudio.playBoost();
      }
    }

    // Toggle Telemetry on press
    if (gamepadStatusPressed && !window.lastGamepadStatus && isRaceActive) {
      toggleTelemetryPanel();
    }

    // Manual Upshift
    if (gamepadUpshiftPressed && !window.lastGamepadUpshift && isRaceActive && !isPitStopActive) {
      if (playerKart && playerKart.pitLimiterActive) {
        if (currentGear >= 2) {
          showShiftBlockedHUD("PIT ROAD LIMIT: GEAR 2 MAX");
        } else {
          currentGear++;
          triggerShiftIgnitionCut();
        }
      } else if (currentGear < 8) {
        if (currentGear === -1) {
          currentGear = 0; // Neutral
          triggerShiftIgnitionCut();
        } else if (currentGear === 0) {
          currentGear = 1;
          triggerShiftIgnitionCut();
        } else {
          currentGear++;
          triggerShiftIgnitionCut();
        }
      }
    }

    // Manual Downshift
    if (gamepadDownshiftPressed && !window.lastGamepadDownshift && isRaceActive && !isPitStopActive) {
      let targetGear = currentGear - 1;
      if (targetGear < -1) targetGear = -1; // clamp to Reverse

      if (targetGear === -1 && playerKart.speed > 1.2) {
        showShiftBlockedHUD("REVERSE BLOCKED: SPEED TOO HIGH");
      } else if (targetGear >= 1) {
        // Overrev protection
        const estimatedRPM = getRPMForSpeedAndGear(playerKart.speed, targetGear);
        if (estimatedRPM > 14600) {
          showShiftBlockedHUD("ECU BLOCKED: OVERREV RISK");
          gearboxWear = Math.min(100.0, gearboxWear + 5.0);
        } else {
          currentGear = targetGear;
          triggerShiftIgnitionCut();
        }
      } else {
        currentGear = targetGear;
        triggerShiftIgnitionCut();
      }
    }

    window.lastGamepadDrs = gamepadDrsPressed;
    window.lastGamepadUpshift = gamepadUpshiftPressed;
    window.lastGamepadDownshift = gamepadDownshiftPressed;
    window.lastGamepadStatus = gamepadStatusPressed;

    // Map consolidated throttle / brake inputs
    const throttleInput = Math.max(keys.w ? 1.0 : 0.0, gamepadThrottle);
    const brakeInput = Math.max(keys.s ? 1.0 : 0.0, gamepadBrake);

    // Lock player speed & gear in starting sequence countdown or grid waiting states
    if (isStartingSequence || window.raceState === "RACE_GRID_WAIT" || window.raceState === "RACE_LIGHTS") {
      playerKart.speed = 0.0;
      currentGear = 0; // Lock to Neutral!
      currentRPM = 1000 + Math.random() * 150; // Idle revs
      return;
    }

    // Auto-upshift from Neutral to 1st gear when accelerating after lights out
    if (currentGear === 0 && throttleInput > 0.1) {
      currentGear = 1;
      triggerShiftIgnitionCut();
    }


    // Update spinout physics
    if (playerKart.spinoutTime > 0.0) {
      if (playerKart.spinoutTime > 1.1 && pendingRadioQuestion !== 'crash') {
        speakEngineerRadio("Are you okay? That was a big hit. Should we box?", 65);
        pendingRadioQuestion = 'crash';
      }
      playerKart.spinoutTime -= delta;
      playerKart.spinAngle = (playerKart.spinAngle || 0.0) + playerKart.spinoutVelocity * delta;
      playerKart.spinoutVelocity *= (1.0 - delta * 2.2);
      playerKart.speed = Math.max(0.0, playerKart.speed - delta * 15.0);
      spawnExhaustSmoke(playerKart.mesh.position, false);
      if (playerKart.spinoutTime <= 0) {
        playerKart.mesh.rotation.z = 0;
      }
    } else if (playerKart.spinAngle !== 0.0) {
      playerKart.spinAngle = THREE.MathUtils.lerp(playerKart.spinAngle, 0.0, delta * 8.0);
      if (Math.abs(playerKart.spinAngle) < 0.02) playerKart.spinAngle = 0.0;
    }

    // DRS automatic close on braking input
    if (drsActive && keys.s) {
      drsActive = false;
      speakEngineerRadio("DRS closed.", 70);
    }

    // Scale tyre wear rates inversely with selected maxLaps so strategy is relevant at all lengths
    const wearLapsScale = 6.0 / Math.max(1, maxLaps);
    let baseGrip = 0.92;
    let wearRate = 0.03 * wearLapsScale;

    if (activeCompound === 'soft') {
      baseGrip = isRainActive ? 0.40 : 1.0;
      wearRate = 0.072 * wearLapsScale;
    } else if (activeCompound === 'medium') {
      baseGrip = isRainActive ? 0.35 : 0.92;
      wearRate = 0.032 * wearLapsScale;
    } else if (activeCompound === 'hard') {
      baseGrip = isRainActive ? 0.30 : 0.85;
      wearRate = 0.013 * wearLapsScale;
    } else if (activeCompound === 'intermediate') {
      baseGrip = isRainActive ? 0.95 : 0.80;
      wearRate = 0.035 * wearLapsScale;
    } else if (activeCompound === 'wet') {
      baseGrip = isRainActive ? 1.0 : 0.60;
      wearRate = 0.045 * wearLapsScale;
    }


    // Engine Modes modifiers
    let modePower = 1.0;
    let modeFuelRate = 1.0;
    let modeWearRate = 1.0;

    if (currentEngineMode === 'push') {
      modePower = 1.08;
      modeFuelRate = 1.30;
      modeWearRate = 1.30;
    } else if (currentEngineMode === 'attack') {
      modePower = 1.15;
      modeFuelRate = 1.60;
      modeWearRate = 1.60;
    } else if (currentEngineMode === 'fuel_save') {
      modePower = 0.88;
      modeFuelRate = 0.70;
      modeWearRate = 0.70;
    }

    wearRate *= modeWearRate;

    // Drifting wears tires faster!
    if (playerKart.isDrifting) {
      wearRate *= 2.2;
    }

    // Dynamic DRS / Overtake Mode Zone Logic
    const isStraightZone = (playerKart.currentOffset >= 0.02 && playerKart.currentOffset <= 0.22) || (playerKart.currentOffset >= 0.50 && playerKart.currentOffset <= 0.70);
    
    if (window.f1RegulationEra === '2026') {
      // 2026 Active Aero: MANUAL — player presses SHIFT to open/close
      // isStraightZone = DRS zone detection (where wing can open)
      // drsActive = whether player has opened the wing this lap

      // Auto-close DRS if braking, in pit, SC active, or left the zone
      const mustClose = keys.s || playerKart.inPitLane || safetyCarActive || !isStraightZone || !isRaceActive;
      if (mustClose && drsActive) {
        drsActive = false;
      }
      // Also expose availability so SHIFT key handler can use it
      drsAvailable = isStraightZone && !safetyCarActive && !playerKart.inPitLane;

      // ── 2026 Overtake Mode eligibility gap check ─────────────────────
      const sorted = [...racers].sort((a, b) => getRacerScore(b) - getRacerScore(a));
      const playerIdx = sorted.findIndex(r => r.isPlayer);
      if (playerIdx === -1 || playerIdx === 0) {
        window.overtakeModeEligible = false;
      } else {
        const carAhead = sorted[playerIdx - 1];
        const scorePlayer = getRacerScore(playerKart);
        const scoreAhead = getRacerScore(carAhead);
        const diff = scoreAhead - scorePlayer;
        const gapSecs = diff * 20.0;
        window.overtakeModeEligible = gapSecs <= 1.0;
      }

      // ── DRS / Overtake HUD ────────────────────────────────────────────
      const alertEl = document.getElementById('hud-drs-alert');
      if (alertEl) {
        if (window.overtakeModeActive) {
          alertEl.style.display = 'block';
          alertEl.innerText = "OVERTAKE ACTIVE // DEPLOYING ERS";
          alertEl.style.background = "rgba(239, 68, 68, 0.95)";
          alertEl.style.boxShadow = "0 0 15px rgba(239,68,68,0.6)";
        } else if (drsActive) {
          alertEl.style.display = 'block';
          alertEl.innerText = "DRS OPEN // WING OPEN";
          alertEl.style.background = "rgba(56, 189, 248, 0.95)";
          alertEl.style.boxShadow = "0 0 15px rgba(56, 189, 248, 0.6)";
        } else if (drsAvailable) {
          alertEl.style.display = 'block';
          alertEl.innerText = "DRS AVAILABLE // PRESS SHIFT";
          alertEl.style.background = "rgba(74, 222, 128, 0.9)";
          alertEl.style.boxShadow = "0 0 15px rgba(74, 222, 128, 0.45)";
        } else if (window.overtakeModeEligible && window.ersBatteryLevel > 5.0) {
          alertEl.style.display = 'block';
          alertEl.innerText = "OVERTAKE AVAILABLE // PRESS SHIFT";
          alertEl.style.background = "rgba(34, 211, 238, 0.95)";
          alertEl.style.boxShadow = "0 0 15px rgba(34,211,238,0.6)";
        } else {
          alertEl.style.display = 'none';
        }
      }
    } else {
      // Legacy DRS Era Zone Logic
      if (isStraightZone) {
        drsAvailable = true;
        // Auto-close on brake/pit/SC
        if (keys.s || playerKart.inPitLane || safetyCarActive) drsActive = false;
        const alertEl = document.getElementById('hud-drs-alert');
        if (alertEl) {
          alertEl.style.display = 'block';
          if (drsActive) {
            alertEl.innerText = "DRS ACTIVE // WING OPEN";
            alertEl.style.background = "rgba(56, 189, 248, 0.95)";
            alertEl.style.boxShadow = "0 0 15px rgba(56, 189, 248, 0.6)";
          } else {
            alertEl.innerText = "DRS AVAILABLE // PRESS SHIFT TO ACTIVATE";
            alertEl.style.background = "rgba(74, 222, 128, 0.9)";
            alertEl.style.boxShadow = "0 0 15px rgba(74, 222, 128, 0.45)";
          }
        }
      } else {
        drsAvailable = false;
        drsActive = false;
        const alertEl = document.getElementById('hud-drs-alert');
        if (alertEl) alertEl.style.display = 'none';
      }
    }

    // Checkpoints system to prevent cheat skips
    if (playerKart.currentOffset > 0.30 && playerKart.currentOffset < 0.40) window.passedCP1 = true;
    if (playerKart.currentOffset > 0.60 && playerKart.currentOffset < 0.70) window.passedCP2 = true;



    // Tyre grip modifier (affected by tyre wear AND car damage)
    const dmgGripFactor = 1.0 - (carDamage / 100.0) * 0.28;
    const tyreGrip = getTyreGripMultiplier(playerKart);
    let gripMultiplier = baseGrip * tyreGrip * dmgGripFactor;

    // Scale fuel usage: 1 lap of fuel per lap, assuming average lap of 30 seconds
    if (Math.abs(playerKart.speed) > 1.0) {
      const secondsPerLap = 30.0;
      const baseFuelConsumption = delta / secondsPerLap;
      const fuelConsumption = baseFuelConsumption * (Math.abs(playerKart.speed) / 65.0) * modeFuelRate;
      fuelLevelLaps = Math.max(-5.0, fuelLevelLaps - fuelConsumption);
    }


    // ECU Automatic Downshifting Assist under heavy braking (Automatic Transmission mode only)
    if (window.transmissionMode === 'automatic' && currentGear >= 2 && brakeInput > 0.1 && playerKart.spinoutTime <= 0.0) {
      const minSpeedForGear = gearMinSpeed[currentGear];
      if (playerKart.speed < minSpeedForGear * 0.88) {
        currentGear--;
        triggerShiftIgnitionCut();
      }
    }

    // ECU Automatic Upshifting Assist under acceleration (Automatic Transmission mode only)
    const checkRPM = getRPMForSpeedAndGear(playerKart.speed, currentGear);
    if (window.transmissionMode === 'automatic' && throttleInput > 0.1 && checkRPM > 13200 && currentGear >= 1 && currentGear < 8 && playerKart.spinoutTime <= 0.0 && !playerKart.pitLimiterActive) {
      currentGear++;
      triggerShiftIgnitionCut();
    }

    // Decrement manual shift active timer
    if (shiftActiveTimer > 0) {
      shiftActiveTimer -= delta;
    }

    let target = 0;
    // Base top speed: matches gear 8 ceiling so full speed is reachable in G8
    // upgrades.speed adds extra above the base, but scaled down by car damage (up to 30% speed penalty)
    const dmgSpeedFactor = 1.0 - (carDamage / 100.0) * 0.30;
    let topSpeedBase = (75.0 + upgrades.speed * 4) * dmgSpeedFactor;
    if (playerKart.bonus === 'topSpeed') topSpeedBase += 6 * dmgSpeedFactor;
    
    // Speed limit for current gear: gear max speed IS the top speed
    // topSpeedBase is the ABSOLUTE car cap (upgrades + team bonus)
    // The gear max speed gates how fast you can go per gear
    let gearSpeedLimit = 0.0;
    if (currentGear === 0)       gearSpeedLimit = 0.0;
    else if (currentGear === -1) gearSpeedLimit = 5.0;   // Reverse max: 20 km/h
    else                         gearSpeedLimit = gearMaxSpeed[currentGear];

    // topSpeed = the lower of car's absolute max and gear ceiling
    // BUT base car top speed matches gear 8 ceiling so player can always reach full speed
    let topSpeed = Math.min(topSpeedBase, gearSpeedLimit);
    // At gear 8 gearSpeedLimit (90) >= topSpeedBase so topSpeed = topSpeedBase (full speed)
    if (currentGear !== 0) {
      topSpeed *= modePower;
    }

    if (playerKart.boostTime > 0) {
      topSpeed = (65 + upgrades.speed * 2) * dmgSpeedFactor;
      playerKart.boostTime -= delta;
      spawnExhaustSmoke(playerKart.mesh.position, true);
    }
    
    // Determine active ERS mode
    let ersMode = 'MEDIUM';
    if (window.overtakeModeActive) {
      ersMode = 'OVERTAKE';
    } else if (currentEngineMode === 'fuel_save') {
      ersMode = 'NONE';
    }

    if (playerKart.ersEnergy === undefined) playerKart.ersEnergy = ERS_MAX_ENERGY;

    // Calculate ERS power scale based on remaining energy (gradual reduction below 25% battery)
    const energyRatio = playerKart.ersEnergy / ERS_MAX_ENERGY;
    let powerFactor = 1.0;
    if (energyRatio < 0.25) {
      powerFactor = Math.max(0.0, energyRatio / 0.25);
    }

    const ERSMode = {
      DEPLOY: "DEPLOY",
      HARVEST_BRAKE: "HARVEST_BRAKE",
      HARVEST_LIFT: "HARVEST_LIFT",
      HARVEST_PART_THROTTLE: "HARVEST_PART_THROTTLE",
      NEUTRAL: "NEUTRAL"
    };

    // Deploy condition: throttle, speed > 15 m/s, not braking, not in pit lane, and has battery energy
    const canDeployERS = throttleInput > 0.1 && brakeInput < 0.1 && !playerKart.inPitLane && playerKart.speed > 15.0 && playerKart.spinoutTime <= 0.0 && playerKart.ersEnergy > 0.0 && ersMode !== 'NONE';
    
    let targetErsPower = 0.0;
    if (canDeployERS) {
      if (ersMode === 'OVERTAKE') {
        targetErsPower = 1.0 * powerFactor; // Max deployment
      } else {
        targetErsPower = 0.5 * powerFactor; // Medium partial deployment
      }
    }

    // Progressive lerp of ERS power delivery
    if (window.ersPower === undefined) window.ersPower = 0.0;
    window.ersPower = THREE.MathUtils.lerp(window.ersPower, targetErsPower, 3.0 * delta);

    // Determine current ERS mode
    let currentERSMode = ERSMode.NEUTRAL;
    if (window.ersPower > 0.05) {
      currentERSMode = ERSMode.DEPLOY;
    } else if (brakeInput > 0.05 && playerKart.speed > 15.0) {
      currentERSMode = ERSMode.HARVEST_BRAKE;
    } else if (throttleInput > 0.1 && throttleInput < 0.60 && playerKart.speed > 15.0) {
      currentERSMode = ERSMode.HARVEST_PART_THROTTLE;
    } else if (throttleInput < 0.1 && playerKart.speed > 15.0) {
      currentERSMode = ERSMode.HARVEST_LIFT;
    }

    // ERS battery level depletion / recovery based on mode
    if (currentERSMode === ERSMode.DEPLOY) {
      const actualPowerKW = (ersMode === 'OVERTAKE' ? 120.0 : 60.0) * window.ersPower;
      const powerMW = actualPowerKW / 1000.0;
      const energyUsedMJ = powerMW * delta * ERS_GAME_ENERGY_SCALE;
      playerKart.ersEnergy = Math.max(0.0, playerKart.ersEnergy - energyUsedMJ);
      if (playerKart.ersEnergy <= 0.0) {
        window.overtakeModeActive = false;
        speakEngineerRadio("Overtake energy depleted.", 50);
      }
    } else if (currentERSMode === ERSMode.HARVEST_BRAKE) {
      // Hard braking regen: up to 2.4 MJ/s (scaled by speed and brake pressure)
      const speedFactor = Math.min(playerKart.speed / 75.0, 1.0);
      const brakeFactor = Math.min(brakeInput, 1.0);
      const recoveredEnergy = 2.4 * speedFactor * brakeFactor * delta;
      playerKart.ersEnergy = Math.min(ERS_MAX_ENERGY, playerKart.ersEnergy + recoveredEnergy);
    } else if (currentERSMode === ERSMode.HARVEST_LIFT) {
      // Lift/coast regen: 0.45 MJ/s
      const recoveredEnergy = 0.45 * delta;
      playerKart.ersEnergy = Math.min(ERS_MAX_ENERGY, playerKart.ersEnergy + recoveredEnergy);
    } else if (currentERSMode === ERSMode.HARVEST_PART_THROTTLE) {
      // Part-throttle regen: 0.15 MJ/s
      const recoveredEnergy = 0.15 * delta;
      playerKart.ersEnergy = Math.min(ERS_MAX_ENERGY, playerKart.ersEnergy + recoveredEnergy);
    }

    window.ersBatteryLevel = (playerKart.ersEnergy / ERS_MAX_ENERGY) * 100.0;
    window.currentERSMode = currentERSMode;

    // Regulations Speed Adjustments — DRS/Active Aero
    // Both eras: only add topSpeed when drsActive (player manually opened it)
    if (drsActive && !safetyCarActive) {
      topSpeed += 3.75;
      if (window.f1RegulationEra !== '2026') {
        spawnExhaustSmoke(playerKart.mesh.position, true);
      }
    }

    // Gravel penalty caps top speed
    if (isGravel) {
      topSpeed = Math.min(topSpeed, 14.0);
    }

    if (currentGear !== 0) {
      if (keys.w && playerKart.spinoutTime <= 0.0) target = topSpeed;
      if (keys.s && playerKart.spinoutTime <= 0.0) target = currentGear === -1 ? -5.0 : -15.0; // Reverse vs normal braking
    } else {
      target = 0.0; // Neutral: no forward/backward throttle
    }

    // Safety Car speed limit
    if (safetyCarActive) {
      target = Math.min(target, 14.2);
    }

    // Calculate acceleration factor based on speed ratio (non-linear curve)
    const speedRatio = Math.max(0.0, Math.min(1.0, Math.abs(playerKart.speed) / Math.max(1.0, topSpeed)));
    const accelerationFactor = 1.0 - Math.pow(speedRatio, 1.7);

    // Base engine acceleration
    let engineAccel = 35 + upgrades.accel * 6;
    if (playerKart.bonus === 'acceleration') engineAccel += 12;
    if (playerKart.boostTime > 0) engineAccel = 90.0;

    // Cut engine power completely if out of fuel
    if (fuelLevelLaps <= 0.0) {
      engineAccel = 0.0;
      target = 0.0;
      if (Math.random() < 0.08) {
        speakEngineerRadio("Engine failure: Out of fuel. Pull over!", 10);
      }
    }

    // Scale engine acceleration by gear multiplier
    let gearAccelMult = currentGear === -1 ? 0.40 : (currentGear === 0 ? 0.0 : gearAccelMultiplier[currentGear]);
    engineAccel *= gearAccelMult;


    // ERS acceleration boost scaled by energy state (Green/Yellow/Red LED logic)
    let ersAccelBoost = 0.0;
    if (ersMode === 'OVERTAKE') {
      ersAccelBoost = 42.0;
    } else if (ersMode === 'MEDIUM') {
      ersAccelBoost = 18.0;
    }

    if (window.ersBatteryLevel >= 60.0) {
      ersAccelBoost *= 1.0; // Green LED (100% power)
    } else if (window.ersBatteryLevel >= 25.0) {
      ersAccelBoost *= 0.60; // Yellow LED (60% power)
    } else if (window.ersBatteryLevel > 0.1) {
      ersAccelBoost *= 0.25; // Red LED (25% power)
    } else {
      ersAccelBoost = 0.0; // Empty battery
    }

    let accel = engineAccel * accelerationFactor;
    if (shiftActiveTimer > 0) {
      accel = 0.0;
      target = 0.0;
    } else {
      // Add progressive ERS boost acceleration
      accel += (window.ersPower * ersAccelBoost) * accelerationFactor;
    }

    // Apply traction limit & wheel slip based on tyre grip
    const tractionLimit = 35.0 * tyreGrip;
    const requestedTorque = engineAccel + (window.ersPower * ersAccelBoost);
    let wheelSlip = 0.0;
    if (keys.w && requestedTorque > tractionLimit && playerKart.speed > 2.0) {
      wheelSlip = (requestedTorque - tractionLimit) / Math.max(1.0, tractionLimit);
    }
    playerKart.wheelSlip = THREE.MathUtils.lerp(playerKart.wheelSlip || 0.0, wheelSlip, 5.0 * delta);
    
    const tractionEfficiency = THREE.MathUtils.clamp(1.0 - playerKart.wheelSlip * 0.60, 0.35, 1.0);
    accel *= tractionEfficiency;

    if (playerKart.wheelSlip > 0.3 && Math.abs(playerKart.speed) > 2.0 && Math.random() < 0.25) {
      spawnExhaustSmoke(playerKart.mesh.position, true);
    }

    if (isGravel) {
      accel *= 0.3; // slug accel in gravel
    }

    if (playerKart.spinoutTime > 0.0) {
      // Decelerate during spinout
    } else {
      if (playerKart.speed < target) {
        playerKart.speed = Math.min(target, playerKart.speed + accel * gripMultiplier * delta);
        if (window.ersPower > 0.4) spawnExhaustSmoke(playerKart.mesh.position, true);
      } else {
        // Braking or engine braking (deceleration)
        const decelRate = keys.s ? 38.0 : (shiftActiveTimer > 0 ? 60.0 : 30.0);
        playerKart.speed = Math.max(target, playerKart.speed - decelRate * delta);
      }
    }

    // Calculate RPM based on current speed and gear ratio
    currentRPM = getRPMForSpeedAndGear(playerKart.speed, currentGear);

    // Pass RPM to Web Audio API for motor pitch synthesis
    if (window.ApexAudio) {
      window.ApexAudio.updateEnginePitch(currentRPM);
    }

    // ════ UPDATE STEERING WHEEL HUD & TELEMETRY DISPLAYS ════
    const kmhSpeed = Math.floor(Math.abs(playerKart.speed) * 4);
    document.getElementById('hud-speed').innerText = kmhSpeed;
    
    const hGear = document.getElementById('hud-gear');
    if (hGear) {
      hGear.innerText = currentGear === 0 ? "N" : (currentGear === -1 ? "R" : currentGear);
      // Flash gear text on shift cut active
      if (shiftActiveTimer > 0) {
        hGear.style.color = "#ffffff";
      } else {
        hGear.style.color = "var(--neon-yellow)";
      }
    }

    const hRpm = document.getElementById('hud-rpm');
    if (hRpm) {
      hRpm.innerText = Math.floor(currentRPM);
      if (currentRPM > 14000) {
        hRpm.style.color = '#ef4444'; // Red alert
      } else {
        hRpm.style.color = '#ffffff';
      }
    }

    // Update 10 LEDs above the steering HUD based on RPM (range: 9000 to 14000)
    for (let i = 0; i < 10; i++) {
      const led = document.getElementById(`led-${i}`);
      if (led) {
        const threshold = 9000 + i * 500;
        if (currentRPM >= 14300) {
          // Flash ALL shift lights!
          led.style.backgroundColor = Math.floor(clock.getElapsedTime() * 12.0) % 2 === 0 ? (i < 4 ? '#22c55e' : (i < 7 ? '#eab308' : '#ef4444')) : '#1f2937';
        } else if (currentRPM >= threshold) {
          // Light up sequentially: Green (first 4) -> Yellow (next 3) -> Red (last 3)
          led.style.backgroundColor = i < 4 ? '#22c55e' : (i < 7 ? '#eab308' : '#ef4444');
        } else {
          led.style.backgroundColor = '#1f2937'; // Off
        }
      }
    }

    // Update ERS, DRS, Fuel, and Tyre display texts
    const hDrs = document.getElementById('steering-hud-drs');
    if (hDrs) {
      if (window.f1RegulationEra === '2026') {
        const isStraightZone = (playerKart.currentOffset >= 0.02 && playerKart.currentOffset <= 0.22) || (playerKart.currentOffset >= 0.50 && playerKart.currentOffset <= 0.70);
        const isOpen = isStraightZone && !safetyCarActive;
        hDrs.innerText = isOpen ? "OPEN" : "CLOSED";
        hDrs.style.color = isOpen ? "#38bdf8" : "rgba(255,255,255,0.4)";
      } else {
        hDrs.innerText = drsActive ? "OPEN" : "CLOSED";
        hDrs.style.color = drsActive ? "#38bdf8" : "rgba(255,255,255,0.4)";
      }
    }

    const hErs = document.getElementById('steering-hud-ers');
    const hErsInd = document.getElementById('steering-hud-ers-indicator');
    const hBoostFill = document.getElementById('hud-boost-fill');
    const hErsStatus = document.getElementById('steering-hud-ers-status');
    if (hErs) {
      const ersPercent = Math.max(0, Math.floor(window.ersBatteryLevel));
      hErs.innerText = `${ersPercent}%`;
      
      let color = '#4ade80';
      if (ersPercent < 25) {
        color = '#ef4444';
      } else if (ersPercent < 60) {
        color = '#fbbf24';
      }
      hErs.style.color = color;
      
      if (hErsInd) {
        hErsInd.style.backgroundColor = color;
        hErsInd.style.boxShadow = `0 0 6px ${color}`;
      }
      if (hBoostFill) {
        hBoostFill.style.width = `${ersPercent}%`;
        hBoostFill.style.backgroundColor = color;
      }
      
      if (hErsStatus) {
        if (ersPercent >= 100) {
          hErsStatus.innerText = "FULL";
          hErsStatus.style.color = "#4ade80";
        } else if (window.currentERSMode === "DEPLOY") {
          hErsStatus.innerText = "DEPLOY";
          hErsStatus.style.color = "#ef4444";
        } else if (window.currentERSMode === "HARVEST_BRAKE") {
          hErsStatus.innerText = "HARVEST";
          hErsStatus.style.color = "#22c55e";
        } else if (window.currentERSMode === "HARVEST_LIFT") {
          hErsStatus.innerText = "CHARGE";
          hErsStatus.style.color = "#60a5fa";
        } else {
          hErsStatus.innerText = "";
        }
      }
    }

    const hTyreLife = document.getElementById('steering-hud-tyre-life');
    if (hTyreLife && playerKart) {
      const lifePercent = Math.max(0, Math.floor(playerKart.tyreLife));
      hTyreLife.innerText = `${lifePercent}%`;
      
      if (lifePercent < 10) {
        hTyreLife.style.color = '#ef4444';
        if (Math.random() < 0.005) {
          showShiftBlockedHUD("TYRES CRITICAL - PIT RECOMMENDED");
          speakEngineerRadio("Tyres are critical, pit this lap!", 60);
        }
      } else if (lifePercent < 25) {
        hTyreLife.style.color = '#fbbf24';
        if (Math.random() < 0.003) {
          showShiftBlockedHUD("TYRES WORN");
          speakEngineerRadio("Tyre wear is high, be careful on traction.", 45);
        }
      } else {
        hTyreLife.style.color = '#fff';
      }
    }

      const hFuelFill = document.getElementById('hud-fuel-fill');
      if (hFuelFill) {
        const maxFuel = (window.weekendConfig ? window.weekendConfig.raceLaps * 1.15 : 4.0) || 4.0;
        const fuelPercent = Math.max(0.0, Math.min(100.0, (fuelLevelLaps / maxFuel) * 100.0));
        hFuelFill.style.width = `${fuelPercent}%`;
        hFuelFill.style.backgroundColor = fuelPercent < 20.0 ? '#ef4444' : 'var(--neon-yellow)';
      }


      if (hErsStatus) {
        // ERS Modes: OVERTAKE, MEDIUM, NONE
        let statusStr = 'MEDIUM';
        if (window.overtakeModeActive) {
          statusStr = 'OVERTAKE';
        } else if (currentEngineMode === 'fuel_save') {
          statusStr = 'NONE';
        }
        
        // Append DEPLOY or HARVEST in real-time
        if (window.ersPower > 0.1 && statusStr !== 'NONE') {
          statusStr += ' [DEPLOY]';
          hErsStatus.style.color = window.overtakeModeActive ? '#f43f5e' : '#fbbf24'; // pink-red for overtake, yellow for medium
        } else if (keys.s && playerKart.spinoutTime <= 0.0 && playerKart.speed > 20.0) {
          statusStr = '[HARVEST]';
          hErsStatus.style.color = '#38bdf8'; // neon blue for KERS harvest!
        } else {
          hErsStatus.style.color = '#9ca3af'; // normal grey
        }
        hErsStatus.innerText = statusStr;
      }

    const hFuel = document.getElementById('steering-hud-fuel');
    if (hFuel) {
      hFuel.innerText = `${fuelLevelLaps >= 0 ? '+' : ''}${fuelLevelLaps.toFixed(2)} LAPS`;
      hFuel.style.color = fuelLevelLaps > 0 ? 'var(--neon-yellow)' : '#ef4444';
    }

    if (playerKart.driveOutAutopilot) {
      updateDriveOutAutopilot(delta);
      return;
    }

    const isSteering = (keys.a || keys.d || Math.abs(gamepadSteer) > 0.15);
    const isDriftInput = (keys.Space || gamepadDrift);
    if (isDriftInput && isSteering && Math.abs(playerKart.speed) > 15.0 && !isGravel) {
      if (!playerKart.isDrifting) {
        playerKart.isDrifting = true;
        playerKart.driftCharge = 0.0;
      }
      // Faster drift charge with drift upgrades
      let chargeRate = 0.7 + upgrades.drift * 0.15;
      playerKart.driftCharge = Math.min(1.0, playerKart.driftCharge + delta * chargeRate);
      
      spawnExhaustSmoke(playerKart.mesh.position, false);
      window.ApexAudio.playDriftScreech();
      
      // Drift vibration feedback
      if (typeof window.triggerGamepadRumble === 'function') {
        window.triggerGamepadRumble(50, 0.22, 0.0);
      }
      if (typeof window.triggerPhoneVibration === 'function') {
        window.triggerPhoneVibration(20);
      }
    } else {
      if (playerKart.isDrifting) {
        playerKart.isDrifting = false;
        if (playerKart.driftCharge > 0.4) {
          // Extra drift boost duration with upgrades
          playerKart.boostTime = playerKart.driftCharge * (2.2 + upgrades.drift * 0.4);
          window.ApexAudio.playBoost();
          
          const alertHUD = document.getElementById('drift-boost-hud');
          alertHUD.classList.add('show');
          setTimeout(() => alertHUD.classList.remove('show'), 1500);
        }
        playerKart.driftCharge = 0.0;
      }
    }

    let handling = 1.6 * gripMultiplier;
    if (playerKart.isDrifting) handling *= 0.58;
    if (isGravel) handling *= 0.4;

    // ── Progressive Steering & Yaw Inertia Physics ───────────────────
    if (!playerKart.handling) {
      playerKart.handling = {
        wheelBase: 3.6,
        steeringBuildRate: 2.8,
        steeringReturnRate: 4.2,
        physicsMaxSteer: THREE.MathUtils.degToRad(14),
        visualMaxSteer: THREE.MathUtils.degToRad(22),
        yawResponseLowSpeed: 3.2,
        yawResponseHighSpeed: 5.0,
        yawDamping: 5.5,
        steeringCurveExponent: 1.65
      };
    }
    const hConfig = playerKart.handling;
    const steerSpeedRatio = THREE.MathUtils.clamp(Math.abs(playerKart.speed) / 50.0, 0.0, 1.0);

    // Steering authority decreases non-linearly as speed increases
    // Adjusted floor from 0.22 to 0.32 and exponent from 0.7 to 0.85 to improve high-speed turn-in
    const steeringAuthority = THREE.MathUtils.lerp(
      1.0,
      0.32,
      Math.pow(steerSpeedRatio, 0.85)
    );

    // Keyboard / gamepad raw steering inputs
    let rawSteeringInput = 0.0;
    if (keys.a || keys.ArrowLeft) {
      rawSteeringInput += 1.0;
    }
    if (keys.d || keys.ArrowRight) {
      rawSteeringInput -= 1.0;
    }
    if (gamepadSteer !== 0.0) {
      rawSteeringInput = -gamepadSteer; // negative gamepad axis = steer left (positive yaw)
    }
    playerKart.rawSteeringInput = rawSteeringInput;

    // Filter steering input with speed-dependent build rate (heavier steering at high speeds)
    if (playerKart.filteredSteeringInput === undefined) playerKart.filteredSteeringInput = 0.0;
    const effectiveBuildRate = THREE.MathUtils.lerp(hConfig.steeringBuildRate, 1.6, steerSpeedRatio);
    const steerRate = (rawSteeringInput === 0.0) ? hConfig.steeringReturnRate : effectiveBuildRate;

    playerKart.filteredSteeringInput = THREE.MathUtils.lerp(
      playerKart.filteredSteeringInput,
      rawSteeringInput,
      1.0 - Math.exp(-steerRate * delta)
    );

    // Non-linear input mapping (exponent curve for fine adjustments around zero)
    const steeringSign = Math.sign(playerKart.filteredSteeringInput);
    const steeringMagnitude = Math.abs(playerKart.filteredSteeringInput);
    const curvedSteeringInput = steeringSign * Math.pow(steeringMagnitude, hConfig.steeringCurveExponent);

    // Calculate target steering angle
    const targetSteeringAngle = curvedSteeringInput * hConfig.physicsMaxSteer * steeringAuthority;

    // Smooth steering rack movement
    const steeringRackSpeed = THREE.MathUtils.lerp(7.0, 3.0, steerSpeedRatio);
    if (playerKart.steeringAngle === undefined) playerKart.steeringAngle = 0.0;
    playerKart.steeringAngle = THREE.MathUtils.lerp(
      playerKart.steeringAngle,
      targetSteeringAngle,
      1.0 - Math.exp(-steeringRackSpeed * delta)
    );

    // Drift angle for visual feedback
    playerKart.driftAngle = THREE.MathUtils.lerp(
      playerKart.driftAngle,
      rawSteeringInput * 0.22,
      delta * 10.0
    );

    // Initialize heading to track direction on first frame if undefined
    if (playerKart.heading === undefined) {
      if (playerKart.inPitLane && pitCurve) {
        const startTang = pitCurve.getTangentAt(pitProgress || 0.30).normalize();
        playerKart.heading = Math.atan2(startTang.x, startTang.z);
      } else {
        const startT = playerKart.currentOffset || 0.05;
        const startTang = trackCurve.getTangentAt(startT).normalize();
        playerKart.heading = Math.atan2(startTang.x, startTang.z);
      }
    }

    // Rotational Inertia: calculate desired yaw and smooth yawVelocity (chassis weight)
    if (playerKart.yawVelocity === undefined) playerKart.yawVelocity = 0.0;
    const directionFactor = (currentGear === -1) ? -1 : 1;
    const desiredYawRate = (Math.abs(playerKart.speed) / hConfig.wheelBase) * Math.tan(playerKart.steeringAngle) * directionFactor;

    const yawResponse = THREE.MathUtils.lerp(hConfig.yawResponseLowSpeed, hConfig.yawResponseHighSpeed, steerSpeedRatio);
    playerKart.yawVelocity = THREE.MathUtils.lerp(
      playerKart.yawVelocity,
      desiredYawRate,
      1.0 - Math.exp(-yawResponse * delta)
    );

    // Yaw damping: settle yaw speed progressively when steering returns to center
    if (Math.abs(playerKart.filteredSteeringInput) < 0.02) {
      playerKart.yawVelocity *= Math.exp(-hConfig.yawDamping * delta);
    }

    // Clamp maximum yaw rate to prevent toy-car instant spinning
    // Increased high-speed yaw ceiling from 0.48 to 0.58 rad/s for sharper rotation
    const maxYawRate = THREE.MathUtils.lerp(1.15, 0.58, steerSpeedRatio);
    playerKart.yawVelocity = THREE.MathUtils.clamp(playerKart.yawVelocity, -maxYawRate, maxYawRate);

    // Apply yaw velocity to heading
    playerKart.heading += playerKart.yawVelocity * delta;

    // Apply visual front wheel steering pivots rotation
    const visualSteer = curvedSteeringInput * hConfig.visualMaxSteer;
    if (playerKart.visualSteeringAngle === undefined) playerKart.visualSteeringAngle = 0.0;
    playerKart.visualSteeringAngle = THREE.MathUtils.lerp(
      playerKart.visualSteeringAngle,
      visualSteer,
      1.0 - Math.exp(-8.0 * delta)
    );
    if (playerKart.mesh.wheels && playerKart.mesh.wheels.length >= 2) {
      playerKart.mesh.wheels[0].rotation.y = playerKart.visualSteeringAngle;
      playerKart.mesh.wheels[1].rotation.y = playerKart.visualSteeringAngle;
    }

    // Apply visual cockpit steering wheel & driver arms rotation animations
    const STEERING_WHEEL_MAX_ROTATION = THREE.MathUtils.degToRad(160);
    const targetWheelRotation = curvedSteeringInput * STEERING_WHEEL_MAX_ROTATION;
    if (playerKart.steeringWheelAngle === undefined) playerKart.steeringWheelAngle = 0.0;
    playerKart.steeringWheelAngle = THREE.MathUtils.lerp(
      playerKart.steeringWheelAngle,
      targetWheelRotation,
      1.0 - Math.exp(-7.0 * delta)
    );
    if (playerKart.mesh.steeringWheel) {
      playerKart.mesh.steeringWheel.rotation.z = -playerKart.steeringWheelAngle;
    }
    if (playerKart.mesh.leftArm && playerKart.mesh.rightArm) {
      const armAngle = playerKart.steeringWheelAngle;
      playerKart.mesh.leftArm.position.y = 0.68 - Math.sin(armAngle * 0.5) * 0.12;
      playerKart.mesh.leftArm.position.x = -0.25 + Math.cos(armAngle * 0.5) * 0.06 - 0.06;
      playerKart.mesh.rightArm.position.y = 0.68 + Math.sin(armAngle * 0.5) * 0.12;
      playerKart.mesh.rightArm.position.x = 0.25 + Math.cos(armAngle * 0.5) * 0.06 - 0.06;
    }

    // Set model rotation first so getPlayerForward has the latest quaternion
    playerKart.mesh.rotation.y = playerKart.heading + playerKart.driftAngle * 1.2 + (playerKart.spinAngle || 0.0);
    playerKart.mesh.rotation.x = 0;
    playerKart.mesh.rotation.z = (playerKart.spinoutTime > 0) ? playerKart.mesh.rotation.z : 0;

    // authoritatively update position in world-space based on speed and heading
    const forwardVec = getPlayerForward(playerKart);
    const signedSpeed = (currentGear === -1) ? -playerKart.speed : playerKart.speed;
    playerKart.mesh.position.addScaledVector(forwardVec, signedSpeed * delta);

    // Real-time pit lane detection debug logging (every 1 second or on change)
    let oldZone = playerKart.pitZone || "MAIN_TRACK";
    if (!isPitting) {
      playerKart.pitZone = "MAIN_TRACK";
      playerKart.inPitLane = false;
      playerKart.pitLimiterActive = false;
      playerKart.currentPath = "TRACK";
    } else {
      playerKart.inPitLane = true;
      playerKart.currentPath = "PIT";
      const totalBoxes = F1_TEAMS.length;
      const stopT = 0.30 + (selectedTeamIndex / Math.max(1, totalBoxes - 1)) * 0.40;
      if (pitProgress < 0.15) {
        playerKart.pitZone = "PIT_ENTRY";
        playerKart.pitLimiterActive = true;
      } else if (pitProgress <= stopT || isPitStopActive) {
        playerKart.pitZone = "PIT_LANE";
        playerKart.pitLimiterActive = true;
      } else {
        playerKart.pitZone = "PIT_EXIT";
        playerKart.pitLimiterActive = false; // exit speed limiter deactivates!
      }
    }

    if (playerKart.pitZone !== oldZone) {
      console.log(`[ZONE CHANGE] ${oldZone} → ${playerKart.pitZone} | inPitLane: ${playerKart.inPitLane} | pitLimiterActive: ${playerKart.pitLimiterActive} | currentPath: ${playerKart.currentPath} | pitProgress: ${pitProgress.toFixed(3)}`);
    }

    // ── Spline projection sensors for track progress ──
    const proj = findNearestTrackProjection(playerKart.mesh.position);
    playerKart.currentOffset = proj.progress;
    playerKart.sideOffset = proj.lateralOffset;

    // Grass / Gravel traps / Barrier collision
    isGravel = false;
    const isEnteringPitLane = playerKart.currentOffset >= 0.960 && playerKart.sideOffset > 0.0 && isPitting;
    
    if (!isEnteringPitLane && !playerKart.inPitLane) {
      if (Math.abs(playerKart.sideOffset) > 8.8) {
        if (Math.abs(playerKart.sideOffset) < 10.7) {
          isGravel = true;
          camera.position.x += (Math.random() - 0.5) * 0.15;
          camera.position.y += (Math.random() - 0.5) * 0.15;
          
          if (Math.abs(playerKart.speed) > 6.0) {
            if (typeof window.triggerGamepadRumble === 'function') {
              window.triggerGamepadRumble(50, 0.38, 0.08);
            }
            if (typeof window.triggerPhoneVibration === 'function') {
              window.triggerPhoneVibration(30);
            }
          }
        } else {
          // Log barrier collision event
          // console.error(
          //   "[PLAYER COLLISION TARGET]",
          //   {
          //     objectName: "BARRIER",
          //     objectType: "Wall",
          //     uuid: "armco-barrier-limit",
          //     parentName: "Track",
          //     parentUuid: null,
          //     userData: { colliderType: "BARRIER" },
          //     visible: true,
          //     worldPosition: playerKart.mesh.position.clone()
          //   }
          // );
          // console.trace("[COLLISION CALL STACK]");

          // Push back from wall barrier (Armco)
          const correctedOffset = Math.sign(playerKart.sideOffset) * 10.65;
          playerKart.sideOffset = correctedOffset;
          
          // Position correction in world space
          const pt = trackCurve.getPointAt(playerKart.currentOffset);
          const tang = trackCurve.getTangentAt(playerKart.currentOffset).normalize();
          const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
          playerKart.mesh.position.copy(pt.add(norm.multiplyScalar(correctedOffset)));
          
          // Heading response: rotate heading slightly back parallel to track tangent
          const targetHeading = Math.atan2(tang.x, tang.z);
          playerKart.heading = THREE.MathUtils.lerp(playerKart.heading, targetHeading, 0.45);

          const impact = Math.abs(playerKart.speed);
          playerKart.speed = 8.0;
          triggerSpinout(playerKart);
          
          carDamage = Math.min(100.0, carDamage + impact * 0.95);
          updateDamageHUD();

          if (typeof window.triggerGamepadRumble === 'function') {
            window.triggerGamepadRumble(350, 0.85, 0.55);
          }
          if (typeof window.triggerPhoneVibration === 'function') {
            window.triggerPhoneVibration(250);
          }
          
          if (impact > 45.0 && !safetyCarActive) {
            triggerSafetyCar();
          }
        }
      }
    }

    // ── Pit lane entry world-space trigger ──
    const isPitEntryAllowed = (currentSessionIndex !== 2 || raceTimer > 5.0);
    if (!isPitting && !isStartingSequence && isPitEntryAllowed && pitCurve) {
      const pitEntryPos = pitCurve.getPointAt(0.0);
      const distToPitEntry = playerKart.mesh.position.distanceTo(pitEntryPos);
      if (distToPitEntry < 3.5 && playerKart.sideOffset > 3.5) {
        const forward = new THREE.Vector3(Math.sin(playerKart.heading), 0, Math.cos(playerKart.heading)).normalize();
        const pitTangent = pitCurve.getTangentAt(0.0).normalize();
        const dirDot = forward.dot(pitTangent);
        
        // Player must deliberately steer towards the pit entrance lane
        if (dirDot > 0.85) {
          isPitting = true;
          playerKart.qualifyingState = "IN_LAP";
          pitProgress = 0.0;
          hasStoppedAtPitBox = false;
          pendingPitStop = false;
          playerKart.pitZone = "PIT_ENTRY";
          playerKart.inPitLane = true;
          playerKart.pitLimiterActive = true;
          playerKart.currentPath = "PIT";
          speakEngineerRadio("Entering pit lane. Limiter speed active.");
        }
      }
    }

    // ── Manual steering and progression inside the pit lane ──
    if (playerKart.inPitLane && pitCurve) {
      const pitProj = findNearestPitProjection(playerKart.mesh.position);
      pitProgress = pitProj.progress;
      playerKart.currentOffset = pitProj.progress; // keep synced for timing tower
      playerKart.sideOffset = pitProj.lateralOffset; // keep synced

      // Pit lane walls boundaries (left wall at -4.0, right wall at 9.5)
      if (pitProj.lateralOffset < -4.0) {
        const pos = pitCurve.getPointAt(pitProj.progress);
        const tang = pitCurve.getTangentAt(pitProj.progress).normalize();
        const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
        playerKart.mesh.position.copy(pos.add(norm.multiplyScalar(-3.9)));
        playerKart.speed = Math.max(0.0, playerKart.speed - delta * 10.0);
        // Gently correct heading parallel to pit lane tangent
        const targetHeading = Math.atan2(tang.x, tang.z);
        playerKart.heading = THREE.MathUtils.lerp(playerKart.heading, targetHeading, delta * 6.0);
      } else {
        const maxLateral = (pitProj.progress >= 0.22 && pitProj.progress <= 0.78) ? 18.5 : 9.5;
        if (pitProj.lateralOffset > maxLateral) {
          const pos = pitCurve.getPointAt(pitProj.progress);
          const tang = pitCurve.getTangentAt(pitProj.progress).normalize();
          const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
          playerKart.mesh.position.copy(pos.add(norm.multiplyScalar(maxLateral - 0.1)));
          playerKart.speed = Math.max(0.0, playerKart.speed - delta * 10.0);
          // Gently correct heading parallel to pit lane tangent
          const targetHeading = Math.atan2(tang.x, tang.z);
          playerKart.heading = THREE.MathUtils.lerp(playerKart.heading, targetHeading, delta * 6.0);
        }
      }

      // Proximity braking inside pit lane to avoid hitting moving karts in front
      const stopT = 0.30 + (selectedTeamIndex / Math.max(1, F1_TEAMS.length - 1)) * 0.40;
      let collisionSpeedLimit = (playerKart.pitZone === "PIT_ENTRY" || playerKart.pitZone === "PIT_LANE") ? 11.0 : 28.0;
      
      if (!isPitStopActive && playerKart.speed > 0.0) {
        racers.forEach(other => {
          if (other === playerKart) return;
          if (other.isTrackActive === false || other.qualifyingState === "GARAGE") return;
          if (other.hasStoppedAtBox || other.speed === 0.0) return; // skip parked/stopped cars
          
          const otherPitting = other.isPlayer ? isPitting : (other.isPitting || false);
          const otherProgress = other.isPlayer ? pitProgress : (other.pitProgress || 0.0);
          
          if (otherPitting && otherProgress > pitProgress && (otherProgress - pitProgress) < 0.08) {
            const dist = playerKart.mesh.position.distanceTo(other.mesh.position);
            if (dist < 8.0) {
              const targetSpeed = other.isPlayer ? playerKart.speed : other.speed;
              collisionSpeedLimit = Math.min(collisionSpeedLimit, targetSpeed * 0.95);
              if (dist < 4.8) {
                collisionSpeedLimit = 0.0; // Hard brake to avoid crash
              }
            }
          }
        });
      }
      playerKart.speed = Math.min(playerKart.speed, collisionSpeedLimit);

      // Stop at pit box / garage return
      if (!isPitStopActive && !hasStoppedAtPitBox) {
        if (pitProgress >= stopT) {
          pitProgress = stopT;
          
          // Snap position to pit box so tyre change animation renders aligned
          const pos = pitCurve.getPointAt(stopT);
          const tang = pitCurve.getTangentAt(stopT).normalize();
          const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
          const boxPos = pos.clone().add(norm.multiplyScalar(6.0));
          playerKart.mesh.position.copy(boxPos);
          playerKart.heading = Math.atan2(tang.x, tang.z);
          playerKart.speed = 0.0;

          if (currentSessionIndex === 0 || currentSessionIndex === 1) {
            returnToGarage();
          } else {
            triggerPitStop();
          }
        }
      } else if (!isPitStopActive && hasStoppedAtPitBox) {
        // Post-pit stop exit logic
        if (pitProgress >= 0.99) {
          playerKart.inPitLane = false;
          isPitting = false;
          hasStoppedAtPitBox = false; // Reset to allow future pit stops!
          playerKart.pitZone = "MAIN_TRACK";
          playerKart.currentPath = "TRACK";
          playerKart.pitLimiterActive = false;
          
          playerKart.currentOffset = 0.060;
          playerKart.previousTrackProgress = 0.060; // prevent lap-crossing jumps
          playerKart.sideOffset = 6.0; // exit lane side offset
          
          playerKart.driveOutAutopilot = false;
          playerKart.driveOutState = "COMPLETE";
          playerKart.controlsEnabled = true;
          
          // Sync steer inputs to avoid snaps
          playerKart.rawSteeringInput = 0.0;
          playerKart.filteredSteeringInput = 0.0;
          playerKart.steeringAngle = 0.0;
          
          console.log("[PIT EXIT] MANUAL CONTROL RESTORED");
        }
      }
    }

    // Player Wing damage visuals
    if (carDamage > 35.0 && playerKart.frontWingAttached !== false) {
      playerKart.frontWingAttached = false;
      detachPart(playerKart, "frontWing");
    }
    if (carDamage > 65.0 && playerKart.rearWingAttached !== false) {
      playerKart.rearWingAttached = false;
      detachPart(playerKart, "rearWing");
      detachPart(playerKart, "drsFlap");
    }

    // Autoritative rotation setting (look direction + drift visual + spin visual)

    if (playerKart.mesh.playerArrow) {
      playerKart.mesh.playerArrow.position.y = 2.3 + Math.sin(clock.getElapsedTime() * 8.0) * 0.15;
      
      if (window.raceState === "RACE_FORMATION" && window.startingGrid) {
        const playerGridIdx = window.startingGrid.findIndex(r => r.isPlayer);
        if (playerGridIdx !== -1) {
          const slot = window.getGridSlotTransform(playerGridIdx);
          
          // Compute distance and angle to grid slot
          const pPos = playerKart.mesh.position;
          const dist = pPos.distanceTo(slot.position);
          
          // 1. Orient the yellow navigation arrow
          playerKart.mesh.playerArrow.rotation.set(0, 0, 0); // clear
          const dx = slot.position.x - pPos.x;
          const dz = slot.position.z - pPos.z;
          const angleToSlot = Math.atan2(dx, dz) - playerKart.heading;
          playerKart.mesh.playerArrow.rotation.y = angleToSlot;
          playerKart.mesh.playerArrow.rotation.x = -Math.PI / 3; // tilt to point there!
          
          // 2. Compute heading difference and speed
          const headingDiff = Math.abs(Math.atan2(Math.sin(playerKart.heading - slot.heading), Math.cos(playerKart.heading - slot.heading)));
          const speed = playerKart.speed;
          
          // 3. Update HUD text and confirm placement
          if (dist > 25.0) {
            window.updateGridGuidanceHUD(`YOUR GRID POSITION &mdash; P${playerGridIdx + 1}<br><span style="font-size:0.75rem;color:rgba(255,255,255,0.6)">Distance: ${dist.toFixed(0)}m</span>`);
          } else {
            if (headingDiff > 0.3) {
              window.updateGridGuidanceHUD(`ALIGN CAR<br><span style="font-size:0.75rem;color:#ef4444">Heading Diff: ${(headingDiff * 180 / Math.PI).toFixed(0)}&deg;</span>`, "#ef4444");
            } else if (speed > 0.5 || dist > 2.0) {
              window.updateGridGuidanceHUD(`STOP IN GRID BOX<br><span style="font-size:0.75rem;color:#facc15">Distance: ${dist.toFixed(1)}m</span>`, "#facc15");
            } else {
              // Grid slot placement is valid and player has stopped!
              playerKart.gridReady = true;
              window.raceState = "RACE_GRID_WAIT";
              window.updateGridGuidanceHUD("GRID POSITION CONFIRMED", "#10b981");
              
              // Hide glowing marker
              if (window.playerGridMarkerMesh) {
                scene.remove(window.playerGridMarkerMesh);
                window.playerGridMarkerMesh = null;
              }
              
              // Play a sound
              if (window.ApexAudio && typeof window.ApexAudio.playPickup === 'function') {
                window.ApexAudio.playPickup();
              }
            }
          }
        }
      } else {
        // Reset default pointing down
        playerKart.mesh.playerArrow.rotation.set(Math.PI, 0, 0);
        
        // Hide HUD guidance if not in formation
        if (typeof window.updateGridGuidanceHUD === 'function') {
          window.updateGridGuidanceHUD(null);
        }
      }
    }

    // Run temporary road obstruction detector
    // if (typeof debugRoadObjectsNearPlayer === 'function') {
    //   debugRoadObjectsNearPlayer();
    // }
  }

  // ── Spline Projection Helpers ──
  function findNearestTrackProjection(pos) {
    if (!pos) return { progress: 0.0, distance: Infinity, lateralOffset: 0.0 };
    if (!trackCurve || !trackCurve.points || trackCurve.points.length === 0) {
      return { progress: 0.0, distance: Infinity, lateralOffset: 0.0 };
    }

    let minDistance = Infinity;
    let bestT = 0.0;
    let bestPoint = null;

    const coarseSteps = 300;
    for (let i = 0; i <= coarseSteps; i++) {
      const t = i / coarseSteps;
      const pt = trackCurve.getPointAt(t);
      if (!pt) continue;
      const dist = pos.distanceTo(pt);
      if (dist < minDistance) {
        minDistance = dist;
        bestT = t;
        bestPoint = pt;
      }
    }

    const fineSteps = 10;
    const searchRange = 1.0 / coarseSteps;
    let localBestT = bestT;
    for (let i = -fineSteps; i <= fineSteps; i++) {
      const t = (bestT + (i / fineSteps) * searchRange + 1.0) % 1.0;
      const pt = trackCurve.getPointAt(t);
      if (!pt) continue;
      const dist = pos.distanceTo(pt);
      if (dist < minDistance) {
        minDistance = dist;
        localBestT = t;
        bestPoint = pt;
      }
    }

    const tangent = trackCurve.getTangentAt(localBestT).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const toCar = pos.clone().sub(bestPoint);
    const lateralOffset = toCar.dot(normal);

    return {
      progress: localBestT,
      distance: minDistance,
      lateralOffset: lateralOffset
    };
  }
  window.findNearestTrackProjection = findNearestTrackProjection;

  const loggedRoadObjects = new Set();
  function debugRoadObjectsNearPlayer() {
    if (!playerKart || !playerKart.mesh || !playerKart.mesh.position || !scene) {
      return;
    }

    scene.traverse(object => {
      if (!object) return;
      if (object === playerKart.mesh) return;
      if (!object.visible) return;

      if (
        object.userData?.isRoad === true ||
        object.userData?.isTrackSurface === true
      ) {
        return;
      }

      const worldPosition = new THREE.Vector3();
      object.getWorldPosition(worldPosition);

      const distanceSq = worldPosition.distanceToSquared(playerKart.mesh.position);

      if (distanceSq > 400) {
        return;
      }

      const id = object.uuid;

      if (loggedRoadObjects.has(id)) {
        return;
      }

      loggedRoadObjects.add(id);

      console.log(
        "[NEAR PLAYER OBJECT]",
        {
          name: object.name,
          type: object.type,
          uuid: object.uuid,
          visible: object.visible,
          userData: object.userData,
          parentName: object.parent?.name,
          position: worldPosition
        }
      );
    });
  }

  function findNearestPitProjection(pos) {
    if (!pos) return { progress: 0.0, distance: Infinity, lateralOffset: 0.0 };
    if (!pitCurve || !pitCurve.points || pitCurve.points.length === 0) {
      return { progress: 0.0, distance: Infinity, lateralOffset: 0.0 };
    }

    let minDistance = Infinity;
    let bestT = 0.0;
    let bestPoint = null;

    const coarseSteps = 150;
    for (let i = 0; i <= coarseSteps; i++) {
      const t = i / coarseSteps;
      const pt = pitCurve.getPointAt(t);
      if (!pt) continue;
      const dist = pos.distanceTo(pt);
      if (dist < minDistance) {
        minDistance = dist;
        bestT = t;
        bestPoint = pt;
      }
    }

    const fineSteps = 10;
    const searchRange = 1.0 / coarseSteps;
    let localBestT = bestT;
    for (let i = -fineSteps; i <= fineSteps; i++) {
      const t = Math.max(0.0, Math.min(1.0, bestT + (i / fineSteps) * searchRange));
      const pt = pitCurve.getPointAt(t);
      if (!pt) continue;
      const dist = pos.distanceTo(pt);
      if (dist < minDistance) {
        minDistance = dist;
        localBestT = t;
        bestPoint = pt;
      }
    }

    const tangent = pitCurve.getTangentAt(localBestT).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const toCar = pos.clone().sub(bestPoint);
    const lateralOffset = toCar.dot(normal);

    return {
      progress: localBestT,
      distance: minDistance,
      lateralOffset: lateralOffset
    };
  }

  function getPlayerForward(player) {
    const forward = new THREE.Vector3(0, 0, 1); // Nose is +Z
    forward.applyQuaternion(player.mesh.quaternion);
    forward.y = 0;
    return forward.normalize();
  }

  function wrapTrackProgress(val) {
    if (val > 1.0) return val - Math.floor(val);
    if (val < 0.0) return val + 1.0 - Math.floor(Math.abs(val));
    return val;
  }

  function completeInitialDriveOut() {
    playerKart.driveOutState = "COMPLETE";
    playerKart.driveOutAutopilot = false;
    playerKart.controlsEnabled = true;
    playerKart.inPitLane = false;
    playerKart.currentPath = "TRACK";
    playerKart.pitLimiterActive = false;
    if (typeof pitStopPhase !== 'undefined') pitStopPhase = "NONE";
    
    // Sync steer inputs to avoid snaps
    playerKart.rawSteeringInput = 0.0;
    playerKart.filteredSteeringInput = 0.0;
    playerKart.steeringAngle = 0.0;
    
    console.log("[DRIVE OUT] SAFE TRACK HANDOFF");
    
    if (currentSessionIndex === 2 && window.raceState === "RACE_PRESTART_DRIVE_OUT") {
      if (typeof window.startRaceFormationLap === 'function') {
        window.startRaceFormationLap();
      }
    } else {
      playerKart.qualifyingState = "OUT_LAP";
    }
  }

  function updateDriveOutAutopilot(delta) {
    if (!playerKart || !pitCurve || !trackCurve) return;
    
    // Config configuration
    if (!playerKart.handling) {
      playerKart.handling = {
        wheelBase: 3.6,
        steeringBuildRate: 2.8,
        steeringReturnRate: 4.2,
        physicsMaxSteer: THREE.MathUtils.degToRad(14),
        visualMaxSteer: THREE.MathUtils.degToRad(22),
        yawResponseLowSpeed: 3.2,
        yawResponseHighSpeed: 5.0,
        yawDamping: 5.5,
        steeringCurveExponent: 1.65
      };
    }

    if (playerKart.driveOutState === "GARAGE_EXIT") {
      if (typeof window.isPitReleaseSafe === 'function' && !window.isPitReleaseSafe(playerKart)) {
        playerKart.driveOutState = "GARAGE_HOLD";
        playerKart.pitReleaseWaiting = true;
      } else {
        playerKart.driveOutState = "PIT_LANE";
        playerKart.garageExitLerp = 1.0;
        pitProgress = 0.30 + (selectedTeamIndex / Math.max(1, F1_TEAMS.length - 1)) * 0.40;
      }
    }

    if (playerKart.driveOutState === "GARAGE_HOLD") {
      if (typeof window.isPitReleaseSafe === 'function' && window.isPitReleaseSafe(playerKart)) {
        playerKart.driveOutState = "NONE";
        playerKart.driveOutAutopilot = false;
        playerKart.controlsEnabled = true;
        playerKart.pitReleaseWaiting = false;
      } else {
        const totalBoxes = F1_TEAMS.length;
        const pBoxT = 0.30 + (selectedTeamIndex / Math.max(1, totalBoxes - 1)) * 0.40;
        if (pitCurve && playerKart.mesh) {
          const pt = pitCurve.getPointAt(pBoxT);
          const tang = pitCurve.getTangentAt(pBoxT).normalize();
          const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
          playerKart.mesh.position.copy(pt.clone().add(norm.multiplyScalar(17.0)));
          playerKart.mesh.lookAt(pt);
          playerKart.heading = Math.atan2(pt.x - playerKart.mesh.position.x, pt.z - playerKart.mesh.position.z);
        }
        playerKart.speed = 0.0;
        rdShowMessage('PIT LANE TRAFFIC // HOLD', 0.1, '#ef4444');
        return;
      }
    }

    if (playerKart.driveOutState === "PIT_LANE") {
      pitProgress += (11.0 * delta) / pitCurve.getLength();
      if (pitProgress >= 0.99) {
        pitProgress = 1.0;
        playerKart.driveOutState = "MAIN_TRACK_MERGE";
        playerKart.inPitLane = false;
        isPitting = false;
        playerKart.pitZone = "MAIN_TRACK";
        playerKart.currentPath = "TRACK";
        
        // Use exact exit coordinates to prevent backwards projection snaps
        playerKart.currentOffset = 0.060;
        playerKart.previousTrackProgress = 0.060; // prevent lap triggers
        playerKart.mergeProgress = 0.0;
        playerKart.mergeStartOffset = 6.0;
      } else {
        if (playerKart.garageExitLerp === undefined) playerKart.garageExitLerp = 1.0;
        playerKart.garageExitLerp = Math.max(0.0, playerKart.garageExitLerp - delta * 0.8); // rollout in 1.25s
        
        const pt = pitCurve.getPointAt(pitProgress);
        const tang = pitCurve.getTangentAt(pitProgress).normalize();
        const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
        
        // Lerp from 17.0m (garage) to 0.0m (pit lane fast/working lane)
        const latOffset = playerKart.garageExitLerp * 17.0;
        playerKart.mesh.position.copy(pt.clone().add(norm.multiplyScalar(latOffset)));
        playerKart.heading = Math.atan2(tang.x, tang.z);
        playerKart.speed = 11.0;
      }
    }

    else if (playerKart.driveOutState === "MAIN_TRACK_MERGE") {
      playerKart.speed = THREE.MathUtils.lerp(playerKart.speed, 25.0, delta * 3.0);
      playerKart.currentOffset = wrapTrackProgress(playerKart.currentOffset + (playerKart.speed * delta) / trackCurve.getLength());
      
      playerKart.mergeProgress = Math.min(1.0, playerKart.mergeProgress + delta * 0.35); // 3 seconds merge
      const lateralOffset = THREE.MathUtils.lerp(playerKart.mergeStartOffset, 0.0, playerKart.mergeProgress);
      
      const pt = trackCurve.getPointAt(playerKart.currentOffset);
      const tang = trackCurve.getTangentAt(playerKart.currentOffset).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      
      const targetPos = pt.clone().add(norm.multiplyScalar(lateralOffset));
      playerKart.mesh.position.copy(targetPos);
      playerKart.heading = Math.atan2(tang.x, tang.z);

      if (playerKart.mergeProgress >= 1.0) {
        playerKart.driveOutState = "TRACK_ALIGNMENT";
      }
    }

    else if (playerKart.driveOutState === "TRACK_ALIGNMENT") {
      playerKart.speed = THREE.MathUtils.lerp(playerKart.speed, 25.0, delta * 3.0);
      playerKart.currentOffset = wrapTrackProgress(playerKart.currentOffset + (playerKart.speed * delta) / trackCurve.getLength());
      
      const pt = trackCurve.getPointAt(playerKart.currentOffset);
      playerKart.mesh.position.copy(pt);
      
      const tang = trackCurve.getTangentAt(playerKart.currentOffset).normalize();
      const targetHeading = Math.atan2(tang.x, tang.z);
      playerKart.heading = THREE.MathUtils.lerp(playerKart.heading, targetHeading, delta * 6.0);

      const playerForward = getPlayerForward(playerKart);
      const headingAlignment = playerForward.dot(tang);

      if (headingAlignment >= 0.98) {
        completeInitialDriveOut();
      }
    }

    // Set model rotation
    playerKart.mesh.rotation.y = playerKart.heading;
    playerKart.mesh.rotation.x = 0;
    playerKart.mesh.rotation.z = 0;

    // Reset visual steering visuals during autopilot
    playerKart.visualSteeringAngle = 0.0;
    playerKart.steeringWheelAngle = 0.0;
    if (playerKart.mesh.wheels && playerKart.mesh.wheels.length >= 2) {
      playerKart.mesh.wheels[0].rotation.y = 0.0;
      playerKart.mesh.wheels[1].rotation.y = 0.0;
    }
    if (playerKart.mesh.steeringWheel) {
      playerKart.mesh.steeringWheel.rotation.z = 0.0;
    }
    if (playerKart.mesh.leftArm && playerKart.mesh.rightArm) {
      playerKart.mesh.leftArm.position.set(-0.25, 0.68, 0.55);
      playerKart.mesh.leftArm.rotation.set(-Math.PI / 12, 0, 0);
      playerKart.mesh.rightArm.position.set(0.25, 0.68, 0.55);
      playerKart.mesh.rightArm.rotation.set(-Math.PI / 12, 0, 0);
    }
  }

  window.createPlayerGridMarker = () => {
    if (window.playerGridMarkerMesh) {
      scene.remove(window.playerGridMarkerMesh);
      window.playerGridMarkerMesh = null;
    }
    
    if (!window.startingGrid) return;
    const playerGridIdx = window.startingGrid.findIndex(r => r.isPlayer);
    if (playerGridIdx === -1) return;
    
    const slot = window.getGridSlotTransform(playerGridIdx);
    
    const geom = new THREE.BoxGeometry(3.0, 0.05, 5.0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan
      transparent: true,
      opacity: 0.25,
      depthWrite: false
    });
    
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(slot.position);
    mesh.rotation.y = slot.heading;
    
    const edges = new THREE.EdgesGeometry(geom);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 });
    const outline = new THREE.LineSegments(edges, lineMat);
    mesh.add(outline);
    
    scene.add(mesh);
    window.playerGridMarkerMesh = mesh;
  };

  window.updateGridGuidanceHUD = (text, color = "#06b6d4") => {
    let el = document.getElementById('f1-grid-guidance-hud');
    if (!el) {
      el = document.createElement('div');
      el.id = 'f1-grid-guidance-hud';
      el.style.cssText = 'position:absolute; top:120px; left:50%; transform:translateX(-50%); background:rgba(15,23,42,0.9); border:2px solid #06b6d4; border-radius:6px; padding:10px 24px; color:#fff; font-family:"Orbitron",sans-serif; font-size:0.9rem; font-weight:bold; letter-spacing:1.5px; text-align:center; z-index:9999; box-shadow:0 4px 20px rgba(0,0,0,0.5); pointer-events:none; display:none;';
      document.body.appendChild(el);
    }
    
    if (text) {
      el.innerHTML = text;
      el.style.borderColor = color;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  };
