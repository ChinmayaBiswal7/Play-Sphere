  function lerpHeading(current, target, alpha) {
    let diff = (target - current + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    return current + diff * THREE.MathUtils.clamp(alpha, 0, 1);
  }

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
      const stopT = 0.26 + (selectedTeamIndex + 0.5) * (0.74 - 0.26) / totalBoxes;
      pitProgress = stopT;
      
      const pt = pitCurve.getPointAt(stopT);
      const tang = pitCurve.getTangentAt(stopT).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      const boxPos = pt.clone().add(norm.multiplyScalar(6.5));
      
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
      
      // Interpolate heading safely without reversal flips
      const targetHeading = Math.atan2(tang.x, tang.z);
      playerKart.heading = lerpHeading(playerKart.pitStopStartHeading, targetHeading, tSmooth);
      
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
      const pBoxT = 0.26 + (selectedTeamIndex + 0.5) * (0.74 - 0.26) / totalBoxes;
      pitProgress = pBoxT;
      
      const pt = pitCurve.getPointAt(pBoxT);
      const tang = pitCurve.getTangentAt(pBoxT).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

      // Placed inside spacious garage bay (at offset +24.0m), facing straight out of garage door towards pit apron
      playerKart.mesh.position.copy(pt.clone().add(norm.clone().multiplyScalar(24.0)));
      const exitDir = norm.clone().negate().normalize(); // straight out towards pit lane
      playerKart.heading = Math.atan2(exitDir.x, exitDir.z);
      playerKart.mesh.rotation.y = playerKart.heading;
      playerKart.mesh.rotation.x = 0;
      playerKart.mesh.rotation.z = 0;
      if (playerKart.mesh.playerArrow) playerKart.mesh.playerArrow.visible = false;
      return;
    }

    // Safety check to prevent any NaN propagation
    if (playerKart.sideOffset === undefined || Number.isNaN(playerKart.sideOffset)) {
      playerKart.sideOffset = 0.0;
    }

    // ─── MULTI-DEVICE CONCURRENT INPUT (Keyboard + Gamepad + Phone) ───
    let gpSteer = 0.0;
    let gpThrottle = 0.0;
    let gpBrake = 0.0;
    let gpDrift = false;
    let gpDrsPressed = false;
    let gpUpshiftPressed = false;
    let gpDownshiftPressed = false;
    let gpStatusPressed = false;

    const gamepads = (typeof navigator.getGamepads === 'function') ? navigator.getGamepads() : [];
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i].connected) {
        gp = gamepads[i];
        break; // first connected gamepad
      }
    }

    if (gp) {
      // 1. Steering (Left Stick horizontal - Axis 0)
      if (Math.abs(gp.axes[0]) > 0.10) {
        gpSteer = gp.axes[0]; // -1.0 to 1.0
      }
      
      // 2. Throttle: Right Trigger (Button 7 value) or Button 0 (A / Cross)
      const rTrigger = gp.buttons[7];
      if (rTrigger && rTrigger.value > 0.05) {
        gpThrottle = rTrigger.value;
      } else if (gp.buttons[0] && gp.buttons[0].pressed) {
        gpThrottle = 1.0;
      }

      // 3. Brake: Left Trigger (Button 6 value) or Button 1 (B / Circle)
      const lTrigger = gp.buttons[6];
      if (lTrigger && lTrigger.value > 0.05) {
        gpBrake = lTrigger.value;
      } else if (gp.buttons[1] && gp.buttons[1].pressed) {
        gpBrake = 1.0;
      }

      // 4. Drift: Button 2 (X / Square) or Button 8 (Select/Back)
      if ((gp.buttons[2] && gp.buttons[2].pressed) || (gp.buttons[8] && gp.buttons[8].pressed)) {
        gpDrift = true;
      }

      // 5. DRS/Overtake: Button 3 (Y / Triangle)
      if (gp.buttons[3] && gp.buttons[3].pressed) {
        gpDrsPressed = true;
      }

      // 6. Manual Gears: RB (Button 5) for Upshift, LB (Button 4) for Downshift
      if (gp.buttons[5] && gp.buttons[5].pressed) {
        gpUpshiftPressed = true;
      }
      if (gp.buttons[4] && gp.buttons[4].pressed) {
        gpDownshiftPressed = true;
      }

      // 7. Status / Telemetry panel: Button 9 (Start)
      if (gp.buttons[9] && gp.buttons[9].pressed) {
        gpStatusPressed = true;
      }
    }

    // Wireless Mobile Phone Controller integration (window.controllerInput)
    let phoneSteer = 0.0;
    let phoneThrottle = 0.0;
    let phoneBrake = 0.0;
    let phoneDrift = false;
    let phoneDrsPressed = false;
    let phoneUpshiftPressed = false;
    let phoneDownshiftPressed = false;
    let phoneStatusPressed = false;

    const ctrl = window.controllerInput;
    if (ctrl) {
      if (Math.abs(ctrl.joystickX) > 0.04) {
        phoneSteer = ctrl.joystickX;
      }
      if (ctrl.joystickY < -0.10) {
        phoneThrottle = Math.max(phoneThrottle, Math.min(1.0, -ctrl.joystickY));
      } else if (ctrl.joystickY > 0.10) {
        phoneBrake = Math.max(phoneBrake, Math.min(1.0, ctrl.joystickY));
      }
      // D-Pad steering and throttle/brake overrides
      if (ctrl.btnDpadLeft) {
        phoneSteer = -1.0;
      } else if (ctrl.btnDpadRight) {
        phoneSteer = 1.0;
      }
      if (ctrl.btnDpadUp) {
        phoneThrottle = 1.0;
      } else if (ctrl.btnDpadDown) {
        phoneBrake = 1.0;
      }
      if (ctrl.btnR2 || ctrl.btnCross) {
        phoneThrottle = 1.0;
      }
      if (ctrl.btnL2 || ctrl.btnCircle) {
        phoneBrake = 1.0;
      }
      if (ctrl.btnSquare) {
        phoneDrift = true;
      }
      if (ctrl.btnTriangle) {
        phoneDrsPressed = true;
      }
      if (ctrl.btnR1) {
        phoneUpshiftPressed = true;
      }
      if (ctrl.btnL1) {
        phoneDownshiftPressed = true;
      }
      if (ctrl.btnTouchpad || ctrl.btnOptions) {
        phoneStatusPressed = true;
      }
    }

    const gamepadDrift = gpDrift || phoneDrift;
    const gamepadDrsPressed = gpDrsPressed || phoneDrsPressed;
    const gamepadUpshiftPressed = gpUpshiftPressed || phoneUpshiftPressed;
    const gamepadDownshiftPressed = gpDownshiftPressed || phoneDownshiftPressed;
    const gamepadStatusPressed = gpStatusPressed || phoneStatusPressed;

    // Keep track of edge-triggered buttons (pressed this frame but not last frame)
    if (window.lastGamepadDrs === undefined) window.lastGamepadDrs = false;
    if (window.lastGamepadUpshift === undefined) window.lastGamepadUpshift = false;
    if (window.lastGamepadDownshift === undefined) window.lastGamepadDownshift = false;
    if (window.lastGamepadStatus === undefined) window.lastGamepadStatus = false;

    // Toggle DRS on press (rising edge)
    if (gamepadDrsPressed && !window.lastGamepadDrs && isRaceActive) {
      if (typeof window.triggerPhoneVibration === 'function') {
        window.triggerPhoneVibration(50);
      }
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

    // Map consolidated throttle / brake inputs across Keyboard, Physical Gamepad, and Mobile Phone
    const throttleInput = Math.min(1.0, Math.max(keys.w || keys.ArrowUp ? 1.0 : 0.0, gpThrottle, phoneThrottle));
    const brakeInput = Math.min(1.0, Math.max(keys.s || keys.ArrowDown ? 1.0 : 0.0, gpBrake, phoneBrake));

    // Lock player speed & gear in starting sequence countdown, grid waiting states, or when retired/disabled
    if (isStartingSequence || playerKart.retired || !playerKart.controlsEnabled || window.raceState === "RACE_GRID_WAIT" || window.raceState === "RACE_LIGHTS") {
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

    // ── AUTHENTIC F1 COMPONENT DAMAGE ENGINEERING & RETIREMENT ──
    if (carDamage >= 100.0) {
      playerKart.speed = 0.0;
      if (typeof window.showTerminalDamageOverlay === 'function') {
        window.showTerminalDamageOverlay();
      }
      return;
    }

    let target = 0;
    let dmgSpeedFactor = 1.0;
    window.dmgSteerAgility = 1.0;

    if (carDamage > 85.0) {
      // CRITICAL DAMAGE / LIMP MODE: Limp back to pit at ~35 km/h max
      dmgSpeedFactor = 0.12;
      window.dmgSteerAgility = 0.45;
      if (Math.random() < 0.20) spawnExhaustSmoke(playerKart.mesh.position, true);
    } else if (carDamage > 70.0) {
      // SEVERE PU & CHASSIS DAMAGE: 45% power cut, sputtering
      dmgSpeedFactor = 0.48;
      window.dmgSteerAgility = 0.60;
      if (Math.random() < 0.10) spawnExhaustSmoke(playerKart.mesh.position, false);
    } else if (carDamage > 40.0) {
      // MODERATE AERO LOSS: 25% speed cut, front wing downforce loss (understeer)
      dmgSpeedFactor = 0.75;
      window.dmgSteerAgility = 0.72;
    } else if (carDamage > 15.0) {
      // MINOR CONTACT: 10% drag penalty
      dmgSpeedFactor = 0.90;
      window.dmgSteerAgility = 0.88;
    }

    let topSpeedBase = (88.0 + upgrades.speed * 2) * dmgSpeedFactor;
    if (playerKart.bonus === 'topSpeed') topSpeedBase += 4 * dmgSpeedFactor;
    
    // Speed limit for current gear: gear max speed IS the top speed
    let gearSpeedLimit = 0.0;
    if (currentGear === 0)       gearSpeedLimit = 0.0;
    else if (currentGear === -1) gearSpeedLimit = 5.0;   // Reverse max: 20 km/h
    else                         gearSpeedLimit = gearMaxSpeed[currentGear];

    let topSpeed = Math.min(topSpeedBase, gearSpeedLimit);
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

    // Authentic F1 80 km/h pit speed limiter (22.2 m/s)
    if (playerKart.pitLimiterActive) {
      target = Math.min(target, 22.2);
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

    // Update 15 LEDs above the steering HUD: authentic F1 per-gear shift window calibration
    // In every gear (1 to 8), rev LEDs reset to 0th light upon upshift and climb smoothly to redline
    const gearShiftMinRPM = [
      0,      // N/R
      8500,   // G1
      10400,  // G2
      11650,  // G3
      12150,  // G4
      12300,  // G5
      12300,  // G6
      12600,  // G7
      12950   // G8
    ];
    const shiftMinRPM = (currentGear >= 1 && currentGear <= 8) ? gearShiftMinRPM[currentGear] : 9000;
    const shiftMaxRPM = 14000;
    const isRevLimiter = currentRPM >= 14200;
    const isFlashing = Math.floor(clock.getElapsedTime() * 14.0) % 2 === 0;

    let activeLedCount = 0;
    if (currentRPM >= shiftMinRPM) {
      const frac = THREE.MathUtils.clamp((currentRPM - shiftMinRPM) / (shiftMaxRPM - shiftMinRPM), 0.0, 1.0);
      activeLedCount = Math.floor(frac * 15);
      if (frac >= 0.98) activeLedCount = 15;
    }

    for (let i = 0; i < 15; i++) {
      const led = document.getElementById(`led-${i}`);
      if (led) {
        const ledCol = i < 5 ? '#22c55e' : (i < 10 ? '#ef4444' : '#a855f7');
        if (isRevLimiter) {
          // Flash ALL shift lights in unison on rev limiter!
          led.style.backgroundColor = isFlashing ? ledCol : '#111827';
        } else if (i < activeLedCount) {
          led.style.backgroundColor = ledCol;
        } else {
          led.style.backgroundColor = '#1e293b'; // Off
        }
      }
    }

    // Redline rev limiter haptic rumble
    if (currentRPM >= 14200 && isRaceActive) {
      if (typeof window.triggerPhoneVibration === 'function' && Math.random() < 0.22) {
        window.triggerPhoneVibration(16);
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
        if (!playerKart.warnedTyresCritical) {
          playerKart.warnedTyresCritical = true;
          showShiftBlockedHUD("TYRES CRITICAL - PIT RECOMMENDED");
          speakEngineerRadio("Tyres are critical, pit this lap!", 60);
        }
      } else if (lifePercent < 25) {
        hTyreLife.style.color = '#fbbf24';
        if (!playerKart.warnedTyresWorn) {
          playerKart.warnedTyresWorn = true;
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

    if (window.turnInHologram && window.turnInHologram.wallMesh) {
      const pulse = 0.40 + 0.16 * Math.sin(clock.getElapsedTime() * 5.0);
      window.turnInHologram.wallMesh.material.opacity = pulse;
    }

    if (playerKart.isPitInAutopilot) {
      updatePitInAutopilot(delta);
      return;
    }
    if (playerKart.isPitOutAutopilot) {
      updatePitOutAutopilot(delta);
      return;
    }
    if (playerKart.driveOutAutopilot) {
      updateDriveOutAutopilot(delta);
      return;
    }

    const isSteering = (keys.a || keys.d || Math.abs(gpSteer) > 0.12 || Math.abs(phoneSteer) > 0.08);
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
    const isLowSpeedManoeuvre = Math.abs(playerKart.speed) < 16.0 || playerKart.inPitLane || playerKart.isExitingGarage;

    // Steering authority decreases non-linearly as speed increases
    // Adjusted floor from 0.22 to 0.32 and exponent from 0.7 to 0.85 to improve high-speed turn-in
    const steeringAuthority = THREE.MathUtils.lerp(
      1.0,
      0.32,
      Math.pow(steerSpeedRatio, 0.85)
    );

    // Keyboard / gamepad / phone raw steering inputs
    let keySteer = 0.0;
    if (keys.a || keys.ArrowLeft) keySteer += 1.0;
    if (keys.d || keys.ArrowRight) keySteer -= 1.0;

    let gpAnalogSteer = 0.0;
    if (Math.abs(gpSteer) > 0.08) {
      gpAnalogSteer = -gpSteer; // negative axis = steer left (positive yaw)
    }

    let phoneAnalogSteer = 0.0;
    if (Math.abs(phoneSteer) > 0.04) {
      phoneAnalogSteer = -phoneSteer;
    }

    // Seamless concurrent multi-device steering blending
    const combinedSteer = keySteer + gpAnalogSteer + phoneAnalogSteer;
    let rawSteeringInput = THREE.MathUtils.clamp(combinedSteer, -1.0, 1.0);
    playerKart.rawSteeringInput = rawSteeringInput;

    // Filter steering input with speed-dependent build rate (heavier steering at high speeds, crisp & quick at low speed)
    if (playerKart.filteredSteeringInput === undefined) playerKart.filteredSteeringInput = 0.0;
    const effectiveBuildRate = isLowSpeedManoeuvre ? 4.5 : THREE.MathUtils.lerp(hConfig.steeringBuildRate, 1.6, steerSpeedRatio);
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

    // Calculate target steering angle (up to 30° at low speed / garage manoeuvres for easy tight turns)
    const currentMaxSteer = isLowSpeedManoeuvre ? THREE.MathUtils.degToRad(30) : hConfig.physicsMaxSteer;
    const targetSteeringAngle = curvedSteeringInput * currentMaxSteer * steeringAuthority * (window.dmgSteerAgility || 1.0);

    // Smooth steering rack movement
    const steeringRackSpeed = isLowSpeedManoeuvre ? 10.0 : THREE.MathUtils.lerp(7.0, 3.0, steerSpeedRatio);
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
    // Boost low-speed yaw authority so car turns effortlessly out of garage and hairpin bends
    const effectiveYawSpeed = isLowSpeedManoeuvre ? Math.max(4.0, Math.abs(playerKart.speed)) : Math.abs(playerKart.speed);
    const desiredYawRate = (effectiveYawSpeed / hConfig.wheelBase) * Math.tan(playerKart.steeringAngle) * directionFactor;

    const yawResponse = isLowSpeedManoeuvre ? 4.5 : THREE.MathUtils.lerp(hConfig.yawResponseLowSpeed, hConfig.yawResponseHighSpeed, steerSpeedRatio);
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
    const maxYawRate = isLowSpeedManoeuvre ? 1.8 : THREE.MathUtils.lerp(1.15, 0.58, steerSpeedRatio);
    playerKart.yawVelocity = THREE.MathUtils.clamp(playerKart.yawVelocity, -maxYawRate, maxYawRate);

    // Apply yaw velocity to heading
    playerKart.heading += playerKart.yawVelocity * delta;

    // Apply visual front wheel steering pivots rotation
    const currentVisualMaxSteer = isLowSpeedManoeuvre ? THREE.MathUtils.degToRad(30) : hConfig.visualMaxSteer;
    const visualSteer = curvedSteeringInput * currentVisualMaxSteer;
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
      // Pit zones:
      // 0.00 - 0.15: PIT_ENTRY (speed limiter active)
      // 0.15 - 0.76: PIT_LANE (fast lane alongside garages, speed limiter active, 80 km/h)
      // 0.76 - 1.00: PIT_EXIT (past all garage boxes / pit exit line, pit limiter deactivated, full acceleration!)
      if (pitProgress < 0.15) {
        playerKart.pitZone = "PIT_ENTRY";
        playerKart.pitLimiterActive = true;
      } else if (pitProgress < 0.76 || isPitStopActive) {
        playerKart.pitZone = "PIT_LANE";
        playerKart.pitLimiterActive = true;
      } else {
        if (playerKart.pitZone !== "PIT_EXIT") {
          speakEngineerRadio("Pit limiter OFF. Green light, push on exit!", 50);
        }
        playerKart.pitZone = "PIT_EXIT";
        playerKart.pitLimiterActive = false; // exit speed limiter deactivates at pit exit line!
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
    const isPitStraightRight = (playerKart.currentOffset >= 0.930 || playerKart.currentOffset <= 0.090) && playerKart.sideOffset > 0.0;
    
    // Only apply barrier collision if NOT on the pit straight right side (where pit entrance & apron exist)
    if (!isPitStraightRight && !playerKart.inPitLane) {
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
              window.triggerPhoneVibration([35, 25, 35]);
            }
          }
        } else {
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
          playerKart.heading = lerpHeading(playerKart.heading, targetHeading, 0.45);

          const impact = Math.abs(playerKart.speed);
          playerKart.speed = 8.0;
          triggerSpinout(playerKart);
          
          carDamage = Math.min(100.0, carDamage + impact * 0.95);
          updateDamageHUD();

          if (typeof window.triggerGamepadRumble === 'function') {
            window.triggerGamepadRumble(350, 0.85, 0.55);
          }
          if (typeof window.triggerPhoneVibration === 'function') {
            window.triggerPhoneVibration([120, 40, 180]);
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
      const pitProj = findNearestPitProjection(playerKart.mesh.position);
      // When car approaches pit entrance lane (progress < 0.15, within 5.5m lateral offset)
      if (pitProj.progress < 0.15 && Math.abs(pitProj.lateralOffset) < 5.5) {
        const forward = new THREE.Vector3(Math.sin(playerKart.heading), 0, Math.cos(playerKart.heading)).normalize();
        const pitTangent = pitCurve.getTangentAt(Math.max(0, pitProj.progress)).normalize();
        const dirDot = forward.dot(pitTangent);
        
        // Player steered into the pit entry lane
        if (dirDot > 0.65) {
          isPitting = true;
          playerKart.qualifyingState = "IN_LAP";
          pitProgress = pitProj.progress;
          hasStoppedAtPitBox = false;
          pendingPitStop = false;
          playerKart.isExitingGarage = false; // Reset explicitly
          playerKart.pitZone = "PIT_ENTRY";
          playerKart.inPitLane = true;
          playerKart.pitLimiterActive = true;
          playerKart.currentPath = "PIT";
          speakEngineerRadio("Entering pit lane. Pit limiter is active. Select your tyre compound.", 80);

          const stratCard = document.getElementById('hud-pit-strategy-card');
          if (stratCard) {
            stratCard.classList.remove('hidden');
            stratCard.style.display = 'block';
          }

          // Pre-spawn pit crew standing ready at pit box immediately on entry
          if (typeof spawnPitCrewBoxes === 'function') {
            spawnPitCrewBoxes();
          }
          if (typeof window.buildTurnInHologram === 'function') {
            window.buildTurnInHologram(selectedTeamIndex);
          }
        }
      }
    }

    // ── Manual steering and progression inside the pit lane ──
    if (playerKart.inPitLane && pitCurve) {
      const pitProj = findNearestPitProjection(playerKart.mesh.position);
      pitProgress = pitProj.progress;
      playerKart.currentOffset = pitProj.progress; // keep synced for timing tower
      playerKart.sideOffset = pitProj.lateralOffset; // keep synced

      // Clear garage exit flag once the car merges into the pit fast lane or gets up to speed
      if (playerKart.isExitingGarage) {
        if (Math.abs(pitProj.lateralOffset) < 5.5 || playerKart.speed > 4.0) {
          playerKart.isExitingGarage = false;
        }
      }

      // Pit lane boundaries: Left pit wall at -6.8m, Right garage wall up to +32.0m (Ultra-spacious 38m corridor!)
      if (!playerKart.isExitingGarage && playerKart.qualifyingState !== "GARAGE") {
        if (pitProj.lateralOffset < -6.8) {
          playerKart.speed = Math.max(0.0, playerKart.speed - delta * 12.0);
        } else if (pitProj.lateralOffset > 32.0) {
          playerKart.speed = Math.max(0.0, playerKart.speed - delta * 12.0);
        }
      }

      // Proximity braking inside pit lane to avoid hitting moving karts in front
      const totalBoxes = F1_TEAMS.length;
      const stopT = 0.26 + (selectedTeamIndex + 0.5) * (0.74 - 0.26) / totalBoxes;
      let collisionSpeedLimit = Infinity;
      
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
      if (collisionSpeedLimit < Infinity) {
        playerKart.speed = Math.min(playerKart.speed, collisionSpeedLimit);
      }

      // ── F1 Broadcast PIT LANE Tracker HUD & Ahead-of-Time Crew Spawn (Images 1, 2, 3) ──
      const pitLaneCard = document.getElementById('hud-pit-lane-card');
      const pitTimeVal = document.getElementById('hud-pit-time-val');
      const pitStopVal = document.getElementById('hud-pit-stop-val');
      const turnInPrompt = document.getElementById('hud-turnin-prompt');
      const turnInHeader = document.getElementById('hud-turnin-header');
      const turnInVal = document.getElementById('hud-turnin-value');
      const turnInSub = document.getElementById('hud-turnin-sub');

      if (!playerKart.isExitingGarage && playerKart.qualifyingState !== "GARAGE") {
        if (pitLaneCard) {
          pitLaneCard.classList.remove('hidden');
          pitLaneCard.style.display = 'block';
        }
        window.pitLaneTimer = (window.pitLaneTimer || 0.0) + delta;
        if (pitTimeVal) pitTimeVal.innerText = `${window.pitLaneTimer.toFixed(1)}`;
      }

      // Pre-spawn pit crew standing ready at pit box as soon as car enters pit lane
      if (!isPitStopActive && !hasStoppedAtPitBox) {
        if ((typeof pitCrew === 'undefined' || pitCrew.length === 0) && typeof spawnPitCrewBoxes === 'function') {
          spawnPitCrewBoxes();
        }
        if (!window.turnInHologram && typeof window.buildTurnInHologram === 'function') {
          window.buildTurnInHologram(selectedTeamIndex);
        }
      }

      // ── Stop at green pit box on pit lane apron ──
      if (!isPitStopActive && !hasStoppedAtPitBox && !playerKart.isPitInAutopilot) {
        const pBoxT = 0.26 + (selectedTeamIndex + 0.5) * (0.74 - 0.26) / totalBoxes;
        const pos = pitCurve.getPointAt(pBoxT);
        const tang = pitCurve.getTangentAt(pBoxT).normalize();
        const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
        const boxPos = pos.clone().add(norm.clone().multiplyScalar(9.5));

        const turnInT = Math.max(0.12, pBoxT - 0.026);
        const turnInPt = pitCurve.getPointAt(turnInT);
        const turnInTang = pitCurve.getTangentAt(turnInT).normalize();
        const turnInNorm = new THREE.Vector3(-turnInTang.z, 0, turnInTang.x).normalize();
        const gatePos = turnInPt.clone().add(turnInNorm.clone().multiplyScalar(1.5));

        // 3D Turn-In Countdown & Rating Evaluation (Matching Reference Images 1 & 2)
        const turnInDist = (turnInT - pitProgress) * 450;
        const distToGate = playerKart.mesh.position.distanceTo(gatePos);

        if (turnInDist > -12.0 && turnInDist < 35.0 && !playerKart.isExitingGarage) {
          if (turnInPrompt) {
            turnInPrompt.classList.remove('hidden');
            turnInPrompt.style.display = 'block';
          }
          if (!window.turnInRated) {
            if (turnInDist > 0.0) {
              if (turnInHeader) {
                turnInHeader.innerText = "TURN-IN";
                turnInHeader.style.color = "#38bdf8";
              }
              if (turnInVal) {
                turnInVal.innerText = (turnInDist / 14.0).toFixed(1);
                turnInVal.style.color = "#ffffff";
              }
              if (turnInSub) turnInSub.innerText = "AIM FOR PIT BOX ENTRY (X)";
            }
          }
        }

        // 🟢 Touching or entering the transparent green wall activates Autopilot into pit box!
        const touchedGreenWall = (distToGate <= 4.6) || (turnInDist <= 1.8 && turnInDist >= -8.0) || ((keys.d || playerKart.filteredSteeringInput > 0.08) && turnInDist <= 8.0);

        if (touchedGreenWall && !playerKart.isExitingGarage) {
          if (!window.turnInRated) {
            window.turnInRated = true;
            let rating = "OPTIMAL";
            let ratingColor = "#c084fc"; // Purple glow (matching Image 2)
            let estTime = 2.4;
            if (Math.abs(turnInDist) <= 3.5 || distToGate <= 2.8) {
              rating = "OPTIMAL";
              ratingColor = "#c084fc";
              estTime = 2.2;
            } else if (Math.abs(turnInDist) <= 8.0 || distToGate <= 5.0) {
              rating = "GOOD";
              ratingColor = "#22c55e";
              estTime = 2.6;
            } else if (turnInDist > 8.0) {
              rating = "EARLY";
              ratingColor = "#fbbf24";
              estTime = 3.4;
            } else {
              rating = "LATE";
              ratingColor = "#ef4444";
              estTime = 4.2;
            }
            if (turnInHeader) turnInHeader.innerText = "TURN-IN";
            if (turnInVal) {
              turnInVal.innerText = rating;
              turnInVal.style.color = ratingColor;
            }
            if (turnInSub) turnInSub.innerText = `Estimated stop time: ${estTime}s`;
            if (window.ApexAudio) window.ApexAudio.playClick();
          }

          startPitInAutopilot(pBoxT, boxPos, tang);
        }

        const distToBox = playerKart.mesh.position.distanceTo(boxPos);
        const isNearBox = (distToBox < 4.5 && Math.abs(playerKart.speed) < 14.0 && !playerKart.isExitingGarage);

        if (pitProgress >= (pBoxT - 0.06) && pitProgress <= (pBoxT + 0.04) && !playerKart.isExitingGarage) {
          rdShowMessage('PULL INTO PIT BOX // BRAKE & STOP', 0.2, '#10b981');
        }

        if (isNearBox && !playerKart.isPitInAutopilot) {
          pitProgress = pBoxT;
          playerKart.mesh.position.copy(boxPos);
          playerKart.heading = Math.atan2(tang.x, tang.z);
          playerKart.mesh.rotation.y = playerKart.heading;
          playerKart.speed = 0.0;
          if (turnInPrompt) {
            turnInPrompt.classList.add('hidden');
            turnInPrompt.style.display = 'none';
          }
          window.pitStopTime = 0.0;

          // Always trigger authentic F1 outside pit stop in ALL sessions (Practice, Qualifying, Race)
          triggerPitStop();
        }
      } else if (isPitStopActive) {
        // Increment stop time counter during active tyre change (matching Image 2 & 3)
        window.pitStopTime = (window.pitStopTime || 0.0) + delta;
        if (pitStopVal) pitStopVal.innerText = `${window.pitStopTime.toFixed(1)}`;
      } else if (!isPitStopActive) {
        // Pit exit & track merge logic (STOP TIME remains displayed on broadcast HUD card as in Image 3)
        if (turnInPrompt) {
          turnInPrompt.classList.add('hidden');
          turnInPrompt.style.display = 'none';
        }

        // Pit exit completion: triggered when car reaches pit exit line (pitProgress >= 0.85) or merges into main track corridor
        const isMergingToTrack = (pitProgress >= 0.85) || (proj.progress >= 0.02 && proj.progress <= 0.16 && Math.abs(proj.lateralOffset) < 7.0);
        if (isMergingToTrack && (hasStoppedAtPitBox || pitProgress >= 0.85)) {
          playerKart.inPitLane = false;
          isPitting = false;
          hasStoppedAtPitBox = false; // Reset to allow future pit stops!
          playerKart.isExitingGarage = false;
          playerKart.pitZone = "MAIN_TRACK";
          playerKart.currentPath = "TRACK";
          playerKart.pitLimiterActive = false;

          const stratCard = document.getElementById('hud-pit-strategy-card');
          if (stratCard) {
            stratCard.classList.add('hidden');
            stratCard.style.display = 'none';
          }
          
          playerKart.currentOffset = Math.max(0.045, proj.progress);
          playerKart.previousTrackProgress = playerKart.currentOffset;
          
          playerKart.driveOutAutopilot = false;
          playerKart.driveOutState = "NONE";
          playerKart.controlsEnabled = true;
          
          // Sync steer inputs to avoid snaps
          playerKart.rawSteeringInput = 0.0;
          playerKart.filteredSteeringInput = 0.0;
          playerKart.steeringAngle = 0.0;
          
          rdShowMessage('PIT EXIT // TRACK CLEAR // GO GO GO!', 3.0, '#38bdf8');
          speakEngineerRadio("Pit exit clear. Push hard!", 40);
          console.log("[PIT EXIT] MANUAL CONTROL RESTORED");

          // Clean up turn-in hologram and fade out pit lane card after 4 seconds
          if (window.turnInHologram) {
            scene.remove(window.turnInHologram);
            window.turnInHologram = null;
          }
          window.turnInRated = false;
          setTimeout(() => {
            if (pitLaneCard && !playerKart.inPitLane) {
              pitLaneCard.classList.add('hidden');
              pitLaneCard.style.display = 'none';
              window.pitLaneTimer = 0.0;
              window.pitStopTime = 0.0;
            }
          }, 4000);
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
          
          // 1. Orient the yellow navigation arrow (only visible in 3rd-person chase view during formation lap)
          if (playerKart.mesh && playerKart.mesh.playerArrow) {
            playerKart.mesh.playerArrow.visible = (currentCameraView !== 'cockpit' && playerKart.qualifyingState !== 'GARAGE' && !playerKart.isExitingGarage);
            playerKart.mesh.playerArrow.rotation.set(0, 0, 0); // clear
            const dx = slot.position.x - pPos.x;
            const dz = slot.position.z - pPos.z;
            const angleToSlot = Math.atan2(dx, dz) - playerKart.heading;
            playerKart.mesh.playerArrow.rotation.y = angleToSlot;
            playerKart.mesh.playerArrow.rotation.x = -Math.PI / 3; // tilt to point there!
          }
          
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

    // Fast path: localized search around player's current known offset
    const currentT = (playerKart && playerKart.currentOffset !== undefined) ? playerKart.currentOffset : null;
    let didFastSearch = false;

    if (currentT !== null) {
      const localSteps = 24;
      const windowRange = 0.045; // ~80m track window
      for (let i = -localSteps / 2; i <= localSteps / 2; i++) {
        const t = (currentT + (i / localSteps) * windowRange * 2 + 1.0) % 1.0;
        const pt = trackCurve.getPointAt(t);
        if (!pt) continue;
        const dist = pos.distanceTo(pt);
        if (dist < minDistance) {
          minDistance = dist;
          bestT = t;
          bestPoint = pt;
        }
      }
      if (minDistance < 18.0) {
        didFastSearch = true;
      }
    }

    // Fallback coarse search if no prior position or off-track
    if (!didFastSearch) {
      const coarseSteps = 120;
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
    }

    const fineSteps = 8;
    const searchRange = 0.008;
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

  function startPitInAutopilot(pBoxT, targetBoxPos, targetTang) {
    if (!playerKart) return;
    playerKart.isPitInAutopilot = true;
    playerKart.controlsEnabled = false;
    playerKart.pitInLerp = 0.0;
    playerKart.pitInStartPos = playerKart.mesh.position.clone();
    playerKart.pitInStartHeading = playerKart.heading;
    playerKart.pitInStartSpeed = Math.max(7.0, Math.min(20.0, playerKart.speed));
    playerKart.pitInTargetPos = targetBoxPos.clone();
    playerKart.pitInTargetHeading = Math.atan2(targetTang.x, targetTang.z);
    playerKart.pBoxT = pBoxT;
    
    // Control points for cubic Bezier curve from fast lane into pit box
    const startForward = new THREE.Vector3(Math.sin(playerKart.heading), 0, Math.cos(playerKart.heading)).normalize();
    const targetForward = targetTang.clone().normalize();
    
    playerKart.pitInP0 = playerKart.pitInStartPos.clone();
    playerKart.pitInP1 = playerKart.pitInStartPos.clone().add(startForward.multiplyScalar(4.5));
    playerKart.pitInP2 = targetBoxPos.clone().sub(targetForward.clone().multiplyScalar(3.5));
    playerKart.pitInP3 = targetBoxPos.clone();

    // Remove green wall when touched / entered
    if (window.turnInHologram) {
      if (window.turnInHologram.arrows) {
        window.turnInHologram.arrows.forEach(a => scene.remove(a));
      }
      scene.remove(window.turnInHologram);
      window.turnInHologram = null;
    }
    
    rdShowMessage('AUTOPILOT // GUIDING INTO PIT BOX', 1.5, '#10b981');
  }
  window.startPitInAutopilot = startPitInAutopilot;

  function updatePitInAutopilot(delta) {
    if (!playerKart || !playerKart.isPitInAutopilot) return;
    
    // Smooth progress over ~1.7 seconds
    playerKart.pitInLerp = Math.min(1.0, playerKart.pitInLerp + delta * 0.58);
    const u = playerKart.pitInLerp;
    const s = u * u * (3 - 2 * u); // Smoothstep
    
    // Cubic Bezier interpolation: B(s) = (1-s)^3 P0 + 3(1-s)^2 s P1 + 3(1-s) s^2 P2 + s^3 P3
    const om = 1 - s;
    const c0 = om * om * om;
    const c1 = 3 * om * om * s;
    const c2 = 3 * om * s * s;
    const c3 = s * s * s;
    
    const nextPos = new THREE.Vector3()
      .addScaledVector(playerKart.pitInP0, c0)
      .addScaledVector(playerKart.pitInP1, c1)
      .addScaledVector(playerKart.pitInP2, c2)
      .addScaledVector(playerKart.pitInP3, c3);

    // Tangent along curve for heading
    const d0 = 3 * om * om;
    const d1 = 6 * om * s;
    const d2 = 3 * s * s;
    const v10 = playerKart.pitInP1.clone().sub(playerKart.pitInP0);
    const v21 = playerKart.pitInP2.clone().sub(playerKart.pitInP1);
    const v32 = playerKart.pitInP3.clone().sub(playerKart.pitInP2);
    const curveTang = new THREE.Vector3()
      .addScaledVector(v10, d0)
      .addScaledVector(v21, d1)
      .addScaledVector(v32, d2)
      .normalize();

    playerKart.mesh.position.copy(nextPos);
    
    const targetHeading = Math.atan2(curveTang.x, curveTang.z);
    playerKart.heading = lerpHeading(playerKart.heading, targetHeading, delta * 14.0);
    playerKart.mesh.rotation.y = playerKart.heading;
    playerKart.mesh.rotation.x = 0;
    playerKart.mesh.rotation.z = 0;

    // Visual steering angle (front wheels turn into curve)
    let steerDelta = (targetHeading - playerKart.heading);
    steerDelta = (steerDelta + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    const steerAngle = THREE.MathUtils.clamp(steerDelta * 2.5, -0.42, 0.42);
    if (playerKart.mesh.wheels && playerKart.mesh.wheels.length >= 2) {
      playerKart.mesh.wheels[0].rotation.y = steerAngle;
      playerKart.mesh.wheels[1].rotation.y = steerAngle;
    }

    // Decelerate speed smoothly to zero at the box
    playerKart.speed = THREE.MathUtils.lerp(playerKart.pitInStartSpeed, 0.0, s);
    
    // Update pit progress
    if (pitCurve) {
      const pitProj = findNearestPitProjection(playerKart.mesh.position);
      pitProgress = pitProj.progress;
      playerKart.currentOffset = pitProj.progress;
      playerKart.sideOffset = pitProj.lateralOffset;
    }
    
    // Pit lane timer keeps ticking
    const pitTimeVal = document.getElementById('hud-pit-time-val');
    window.pitLaneTimer = (window.pitLaneTimer || 0.0) + delta;
    if (pitTimeVal) pitTimeVal.innerText = `${window.pitLaneTimer.toFixed(1)}`;

    if (u >= 1.0) {
      playerKart.isPitInAutopilot = false;
      playerKart.mesh.position.copy(playerKart.pitInTargetPos);
      playerKart.heading = playerKart.pitInTargetHeading;
      playerKart.mesh.rotation.y = playerKart.heading;
      playerKart.speed = 0.0;
      if (playerKart.mesh.wheels && playerKart.mesh.wheels.length >= 2) {
        playerKart.mesh.wheels[0].rotation.y = 0.0;
        playerKart.mesh.wheels[1].rotation.y = 0.0;
      }
      
      const turnInPrompt = document.getElementById('hud-turnin-prompt');
      if (turnInPrompt) {
        turnInPrompt.classList.add('hidden');
        turnInPrompt.style.display = 'none';
      }
      window.pitStopTime = 0.0;
      
      triggerPitStop();
    }
  }

  window.startPitOutAutopilot = function() {
    if (!pitCurve || !playerKart) return;
    const totalBoxes = F1_TEAMS.length;
    const pBoxT = 0.26 + (selectedTeamIndex + 0.5) * (0.74 - 0.26) / totalBoxes;
    const exitFastLaneT = Math.min(0.86, pBoxT + 0.038);
    
    const exitPt = pitCurve.getPointAt(exitFastLaneT);
    const exitTang = pitCurve.getTangentAt(exitFastLaneT).normalize();
    
    playerKart.isPitOutAutopilot = true;
    playerKart.controlsEnabled = false;
    playerKart.pitOutLerp = 0.0;
    playerKart.pitOutStartPos = playerKart.mesh.position.clone();
    
    const startForward = new THREE.Vector3(Math.sin(playerKart.heading), 0, Math.cos(playerKart.heading)).normalize();
    
    playerKart.pitOutP0 = playerKart.pitOutStartPos.clone();
    playerKart.pitOutP1 = playerKart.pitOutStartPos.clone().add(startForward.multiplyScalar(4.5));
    playerKart.pitOutP2 = exitPt.clone().sub(exitTang.clone().multiplyScalar(4.0));
    playerKart.pitOutP3 = exitPt.clone();
    playerKart.pitOutTargetHeading = Math.atan2(exitTang.x, exitTang.z);
    
    rdShowMessage('PIT RELEASE // MERGING TO FAST LANE', 1.5, '#22c55e');
  };

  function updatePitOutAutopilot(delta) {
    if (!playerKart || !playerKart.isPitOutAutopilot) return;
    
    playerKart.pitOutLerp = Math.min(1.0, playerKart.pitOutLerp + delta * 0.65);
    const u = playerKart.pitOutLerp;
    const s = u * u * (3 - 2 * u);
    
    const om = 1 - s;
    const c0 = om * om * om;
    const c1 = 3 * om * om * s;
    const c2 = 3 * om * s * s;
    const c3 = s * s * s;
    
    const nextPos = new THREE.Vector3()
      .addScaledVector(playerKart.pitOutP0, c0)
      .addScaledVector(playerKart.pitOutP1, c1)
      .addScaledVector(playerKart.pitOutP2, c2)
      .addScaledVector(playerKart.pitOutP3, c3);

    const d0 = 3 * om * om;
    const d1 = 6 * om * s;
    const d2 = 3 * s * s;
    const v10 = playerKart.pitOutP1.clone().sub(playerKart.pitOutP0);
    const v21 = playerKart.pitOutP2.clone().sub(playerKart.pitOutP1);
    const v32 = playerKart.pitOutP3.clone().sub(playerKart.pitOutP2);
    const curveTang = new THREE.Vector3()
      .addScaledVector(v10, d0)
      .addScaledVector(v21, d1)
      .addScaledVector(v32, d2)
      .normalize();

    playerKart.mesh.position.copy(nextPos);
    
    const targetHeading = Math.atan2(curveTang.x, curveTang.z);
    playerKart.heading = lerpHeading(playerKart.heading, targetHeading, delta * 12.0);
    playerKart.mesh.rotation.y = playerKart.heading;
    playerKart.mesh.rotation.x = 0;
    playerKart.mesh.rotation.z = 0;
    
    let steerDelta = (targetHeading - playerKart.heading);
    steerDelta = (steerDelta + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    const steerAngle = THREE.MathUtils.clamp(steerDelta * 2.0, -0.35, 0.35);
    if (playerKart.mesh.wheels && playerKart.mesh.wheels.length >= 2) {
      playerKart.mesh.wheels[0].rotation.y = steerAngle;
      playerKart.mesh.wheels[1].rotation.y = steerAngle;
    }

    // Accelerate up to 18 m/s (~65 km/h, well within pit limiter)
    playerKart.speed = THREE.MathUtils.lerp(0.0, 18.0, s);
    currentGear = 1;
    
    // Pit lane timer keeps updating
    const pitTimeVal = document.getElementById('hud-pit-time-val');
    window.pitLaneTimer = (window.pitLaneTimer || 0.0) + delta;
    if (pitTimeVal) pitTimeVal.innerText = `${window.pitLaneTimer.toFixed(1)}`;

    if (u >= 1.0) {
      playerKart.isPitOutAutopilot = false;
      playerKart.controlsEnabled = true;
      if (playerKart.mesh.wheels && playerKart.mesh.wheels.length >= 2) {
        playerKart.mesh.wheels[0].rotation.y = 0.0;
        playerKart.mesh.wheels[1].rotation.y = 0.0;
      }
      speakEngineerRadio("Pit exit clear. Watch the white line on exit.", 60);
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

      // Animate garage mechanics smoothly stepping back toward walls
      if (window.f1ActiveGarages && window.f1ActiveGarages.length > 0) {
        window.f1ActiveGarages.forEach(g => {
          if (g.mechanics) {
            g.mechanics.forEach(m => {
              const targetX = m.baseX > 0 ? (m.baseX + 1.2) : (m.baseX - 1.2);
              m.position.x = THREE.MathUtils.lerp(m.position.x, targetX, delta * 3.0);
            });
          }
        });
      }

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
        playerKart.garageExitLerp = Math.max(0.0, playerKart.garageExitLerp - delta * 0.7); // smooth rollout
        
        const pt = pitCurve.getPointAt(pitProgress);
        const tang = pitCurve.getTangentAt(pitProgress).normalize();
        const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
        
        // S-curve smooth transition from 16.5m (inside garage bay) to 0.0m (pit fast lane)
        const tS = playerKart.garageExitLerp;
        const smoothOffset = tS * tS * (3 - 2 * tS) * 16.5;
        playerKart.mesh.position.copy(pt.clone().add(norm.clone().multiplyScalar(smoothOffset)));

        // Smooth heading blend:
        // When tS > 0.45: car is rolling straight out the garage doors along -norm
        // When tS < 0.45: car smoothly blends heading from -norm to tang (along pit lane)
        const garageHeading = Math.atan2(-norm.x, -norm.z);
        const pitLaneHeading = Math.atan2(tang.x, tang.z);
        const turnFactor = Math.min(1.0, Math.max(0.0, (1.0 - tS / 0.55)));
        const smoothTurn = turnFactor * turnFactor * (3 - 2 * turnFactor);
        
        // Shortest angular interpolation
        let diff = (pitLaneHeading - garageHeading + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        playerKart.heading = garageHeading + diff * smoothTurn;
        playerKart.mesh.rotation.y = playerKart.heading;
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
      playerKart.heading = lerpHeading(playerKart.heading, targetHeading, delta * 6.0);

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
