  'use strict';

  // Game States
  let scene, camera, renderer;
  let menuScene, menuCamera, previewKartMesh;
  
  // F1 Starting Lights & Cutscene Gantry States
  let isStartingSequence = false;
  let startingSequenceTime = 0.0;
  let lastLightSoundIndex = -1;
  let animationFrameId = null;
  let currentRaceId = 0;
  
  // 3D Pit Lane & Crew States
  let pendingPitStop = false;
  let isPitting = false;
  let pitProgress = 0.0;
  let hasStoppedAtPitBox = false;
  let pitCrewBoxes = [];
  let runningBackCrew = [];

  // 🏆 3D Podium Celebration Ceremony States
  let isPodiumScene = false;
  let podiumTime = 0.0;
  let podiumDrivers = [];
  let podiumCrew = [];

  // Global Pit lane spline
  let pitCurve = null;
  let pitGuideLine = null;
  
  // Workstation Turntable Scene
  let wsScene, wsCamera, wsKartMesh, wsCoverMesh;
  let isCarRevealed = false;
  let resourcePoints = 1000;
  let upgrades = { speed: 0, accel: 0, drift: 0 };
  let completedSessions = [false, false, false]; // Practice, Qualifying, Race
  let sessionStatuses = ['AVAILABLE', 'LOCKED', 'LOCKED']; // AVAILABLE/ACTIVE/COMPLETED/SKIPPED/LOCKED
  let currentSessionIndex = 0; // 0: Practice, 1: Qualifying, 2: Race
  let raceState = "RACING"; // RACE_PRESTART_DRIVE_OUT, RACE_FORMATION, RACE_GRID_WAIT, RACE_LIGHTS, RACING
  window.raceState = "RACING";

  let clock = new THREE.Clock();
  let keys = { w: false, a: false, s: false, d: false, Shift: false, Space: false };

  // Setup rebindable controls & persistent settings
  window.isGamePaused = false;
  window.keyBindings = {
    accelerate: ['KeyW', 'ArrowUp'],
    steerLeft: ['KeyA', 'ArrowLeft'],
    brake: ['KeyS', 'ArrowDown'],
    steerRight: ['KeyD', 'ArrowRight'],
    drift: ['Space'],
    upshift: ['KeyE'],
    downshift: ['KeyQ'],
    drs: ['ShiftLeft', 'ShiftRight'],
    radio: ['KeyV'],
    status: ['KeyT'],
    fullscreen: ['KeyF'],
    engineMode: ['KeyM'],
    pitStop: ['KeyP']
  };

  const savedBinds = localStorage.getItem('apex_stars_keybinds');
  if (savedBinds) {
    try { 
      const parsed = JSON.parse(savedBinds);
      if (parsed && typeof parsed === 'object') {
        for (const k in window.keyBindings) {
          if (parsed[k] !== undefined) {
            window.keyBindings[k] = Array.isArray(parsed[k]) ? parsed[k] : [parsed[k]];
          }
        }
      }
    } catch(e) {}
  }

  // Audio settings
  const savedMasterVol = localStorage.getItem('apex_stars_master_volume');
  window.ApexAudio.masterVolume = savedMasterVol !== null ? parseFloat(savedMasterVol) : 0.35;
  const savedEngineSound = localStorage.getItem('apex_stars_engine_sound');
  window.engineSoundEnabled = savedEngineSound !== null ? savedEngineSound === 'true' : true;
  const savedRadioVol = localStorage.getItem('apex_stars_radio_volume');
  window.radioVolume = savedRadioVol !== null ? parseFloat(savedRadioVol) : 1.0;
  const savedVoiceSpeech = localStorage.getItem('apex_stars_voice_speech');
  window.voiceSpeechEnabled = savedVoiceSpeech !== null ? savedVoiceSpeech === 'true' : false; // OFF by default!

  // Graphics settings
  const savedShadows = localStorage.getItem('apex_stars_shadows');
  window.graphicsShadows = savedShadows !== null ? savedShadows : 'high';
  const savedParticles = localStorage.getItem('apex_stars_particles');
  window.particlesEnabled = savedParticles !== null ? savedParticles === 'true' : true;
  const savedResScale = localStorage.getItem('apex_stars_resscale');
  window.resScaleSetting = savedResScale !== null ? savedResScale : 'native';

  // Camera settings
  const savedCamDist = localStorage.getItem('apex_stars_camera_distance');
  window.cameraDistanceSetting = savedCamDist !== null ? savedCamDist : 'tcam';
  const savedCamHeight = localStorage.getItem('apex_stars_camera_height');
  window.cameraHeightSetting = savedCamHeight !== null ? savedCamHeight : 'normal';
  const savedCamShake = localStorage.getItem('apex_stars_camera_shake');
  window.cameraShakeSetting = savedCamShake !== null ? savedCamShake === 'on' : true;
  const savedCamTilt = localStorage.getItem('apex_stars_camera_tilt');
  window.cameraTiltSetting = savedCamTilt !== null ? savedCamTilt === 'on' : true;
  const savedCamFOV = localStorage.getItem('apex_stars_camera_fov');
  window.baseFOV = savedCamFOV !== null ? parseInt(savedCamFOV) : 65;

  let isRaceActive = false;

  // Pit Stop & Tyre Wear States
  let tyreWear = 0.0;
  let activeCompound = 'soft'; // 'soft', 'medium', 'hard', 'intermediate', 'wet'
  let isPitStopActive = false;

  // Sequential Gearbox State
  let currentGear = 0; // 0=N, 1-8, -1=R (starts in Neutral for grid formation!)
  let currentRPM = 1000;
  let shiftBlockedHUDTimer = 0.0;
  let shiftActiveTimer = 0.0; // Shift fuel cut duration (50ms)
  let gearboxWear = 0.0; // 0% to 100%
  let automaticDownshiftActive = false; // Manual transmission by default
  window.transmissionMode = localStorage.getItem('apex_stars_transmission') || 'manual';
  
  // 🏎️ 2026 F1 Regulations System States
  window.f1RegulationEra = localStorage.getItem('f1_regulation_era') || '2026';
  window.ersBatteryLevel = 100.0;
  window.overtakeModeEligible = false;
  window.overtakeModeActive = false;

  const ERS_MAX_ENERGY = 4.0;        // usable Megajoules (real F1 cap)
  const ERS_MAX_POWER_KW = 120.0;    // max electric motor output
  const ERS_GAME_ENERGY_SCALE = 7.0; // drain scale: 120kW * 7.0/1000 = 0.84 MJ/s → ~4.8s to empty
  
  // Gear ranges (km/h) mapped to speed units (divide by 4)
  const gearMinSpeed = [
    0,     // N/R
    0,     // G1: 0 - 70 (0 - 17.5)
    10.0,  // G2: 40 - 110 (10.0 - 27.5)
    20.0,  // G3: 80 - 145 (20.0 - 36.25)
    30.0,  // G4: 120 - 180 (30.0 - 45.0)
    40.0,  // G5: 160 - 220 (40.0 - 55.0)
    52.5,  // G6: 210 - 270 (52.5 - 67.5)
    65.0,  // G7: 260 - 320 (65.0 - 80.0)
    75.0   // G8: 300 - 360 (75.0 - 90.0)
  ];
  
  const gearMaxSpeed = [
    5.0,   // N/R
    17.5,  // G1: 70 km/h
    27.5,  // G2: 110 km/h
    36.25, // G3: 145 km/h
    45.0,  // G4: 180 km/h
    55.0,  // G5: 220 km/h
    67.5,  // G6: 270 km/h
    80.0,  // G7: 320 km/h
    90.0   // G8: 360 km/h
  ];
  
  const gearAccelMultiplier = [
    0.0,  // N/R
    1.0,  // G1
    0.88, // G2
    0.74, // G3
    0.60, // G4
    0.46, // G5
    0.34, // G6
    0.24, // G7
    0.16  // G8
  ];

  // Engine Modes
  let currentEngineMode = 'standard'; // 'standard', 'push', 'attack', 'fuel_save'
  let fuelLevelLaps = 1.3; // remaining fuel in laps

  // Leaderboard live timer
  let lastLeaderboardUpdate = 0;

  // Voice recognition states
  let recognition = null;
  let pendingRadioQuestion = null; // 'crash', 'rain'
  let lastPosRank = 4;
  let lastOvertakeCheerTime = 0;
  let isRainActive = false;
  let rainTriggerTime = 40.0; // Trigger rain after 40 seconds
  let rainAlertTriggered = false;

  // DRS & Checkpoints States
  let drsAvailable = false;
  let drsActive = false;
  window.passedCP1 = false;
  window.passedCP2 = false;

  // Wizard State
  let currentWizardStep = 0;
  let selectedEntryLevel = 0; // 0: F1, 1: F2
  let selectedTeamIndex = 0;
  let selectedTeammateIndex = 0;

  // Race Config
  let activeDriver = 0;
  let activeTrack = 0;
  let activeDifficulty = 1; // Default medium (100cc)
  let currentLap = 1;
  let maxLaps = 3;

  let startTime = 0;
  let raceTimer = 0;

  // Track Spline
  let trackCurve;
  let trackLength = 0;
  let trackMesh;

  // Racers
  let playerKart;
  let racers = []; // Array of all racers (Player + AI)

  // --- Formation Lap & Lapping States ---
  window.formationLapActive = false;
  
  // --- Tyre Compounds Configuration ---
  const TYRE_COMPOUNDS = {
    soft: { name: "SOFT", baseGrip: 1.08, wearRate: 1.55 },
    medium: { name: "MEDIUM", baseGrip: 1.00, wearRate: 1.00 },
    hard: { name: "HARD", baseGrip: 0.94, wearRate: 0.68 },
    intermediate: { name: "INTERMEDIATE", baseGrip: 0.96, wearRate: 1.08 },
    wet: { name: "WET", baseGrip: 1.00, wearRate: 1.25 }
  };
  window.TYRE_COMPOUNDS = TYRE_COMPOUNDS;

  function getLapRelation(carA, carB) {
    const lapsA = carA.completedLaps !== undefined ? carA.completedLaps : 0;
    const lapsB = carB.completedLaps !== undefined ? carB.completedLaps : 0;
    const difference = lapsA - lapsB;
    if (difference >= 1) return "A_LAPPING_B";
    if (difference <= -1) return "B_LAPPING_A";
    return "SAME_LAP";
  }
  window.getLapRelation = getLapRelation;

  function getTyreGripMultiplier(car) {
    const life = car.tyreLife !== undefined ? car.tyreLife : 100.0;
    if (life > 70.0) return 1.0;
    if (life > 40.0) return THREE.MathUtils.lerp(0.94, 1.0, (life - 40.0) / 30.0);
    if (life > 20.0) return THREE.MathUtils.lerp(0.80, 0.94, (life - 20.0) / 20.0);
    if (life > 5.0) return THREE.MathUtils.lerp(0.58, 0.80, (life - 5.0) / 15.0);
    return 0.48;
  }
  window.getTyreGripMultiplier = getTyreGripMultiplier;

  function calculateTyreWear(car, delta) {
    if (!isRaceActive || isStartingSequence || car.finished) return;
    if (car.inPitLane) return;

    if (!car.tyreCompound) car.tyreCompound = "medium";
    if (car.tyreLife === undefined) car.tyreLife = 100.0;

    const compound = TYRE_COMPOUNDS[car.tyreCompound] || TYRE_COMPOUNDS.medium;
    
    // Scale tyre life to selected race laps (maxLaps)
    const targetLaps = Math.max(2, maxLaps * (car.tyreCompound === 'soft' ? 0.30 : (car.tyreCompound === 'hard' ? 0.78 : 0.55)));
    const wearPerSecondRef = 100.0 / (targetLaps * 30.0);
    
    const speedRatio = Math.max(0.0, Math.min(1.5, Math.abs(car.speed) / 60.0));
    let wearAmount = wearPerSecondRef * speedRatio * delta;
    
    let wearMultiplier = 1.0;
    const isGravel = car.isPlayer ? window.isGravel : false;
    if (isGravel) wearMultiplier += 3.5;
    if (car.isDrifting) wearMultiplier += 1.5;
    if (car.brakeInput > 0.5 && car.speed > 25.0) wearMultiplier += 0.8;
    if (car.wheelSlip && car.wheelSlip > 0.2) wearMultiplier += car.wheelSlip * 2.0;

    if (isRainActive && (car.tyreCompound === 'soft' || car.tyreCompound === 'medium' || car.tyreCompound === 'hard')) {
      wearMultiplier += 1.0;
    } else if (!isRainActive && (car.tyreCompound === 'intermediate' || car.tyreCompound === 'wet')) {
      wearMultiplier += 2.0;
    }

    car.tyreLife = Math.max(0.0, car.tyreLife - wearAmount * wearMultiplier);

    if (car.isPlayer) {
      tyreWear = 100.0 - car.tyreLife;
      updateTyreWearHUD();
    }
  }
  window.calculateTyreWear = calculateTyreWear;

  function getRacerScore(racer) {
    const completed = racer.completedLaps !== undefined ? racer.completedLaps : 0;
    const progress = racer.currentOffset !== undefined ? racer.currentOffset : 0.0;
    return completed + progress;
  }

  function validateRaceOrder(sorted) {
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a.finished && b.finished) {
        if (a.finishPos > b.finishPos) {
          console.error("[RACE ORDER ERROR] Finished cars sorted incorrectly:", a.name, a.finishPos, b.name, b.finishPos);
        }
      } else if (a.finished) {
        // Correct
      } else if (b.finished) {
        console.error("[RACE ORDER ERROR] Unfinished car sorted before finished car:", a.name, b.name);
      } else {
        const scoreA = getRacerScore(a);
        const scoreB = getRacerScore(b);
        if (scoreA < scoreB) {
          console.error("[RACE ORDER ERROR] Out of order:", a.name, scoreA, b.name, scoreB);
        }
      }
    }
  }

  function updateRacePositions() {
    if (currentSessionIndex === 0 || currentSessionIndex === 1) {
      // Practice or Qualifying: sort by best lap time
      const sorted = [...racers].sort((a, b) => {
        const lapA = currentSessionIndex === 0 ? (a.bestPracticeLap || Infinity) : (a.bestQualifyingLap || Infinity);
        const lapB = currentSessionIndex === 0 ? (b.bestPracticeLap || Infinity) : (b.bestQualifyingLap || Infinity);
        return lapA - lapB;
      });
      sorted.forEach((racer, idx) => {
        racer.posRank = idx + 1;
        if (racer.isPlayer) {
          const hudPosVal = document.getElementById('hud-pos-val');
          if (hudPosVal) {
            hudPosVal.innerText = `P${idx + 1}`;
          }
        }
      });
    } else {
      // Main GP Race: sort by total progress
      const sorted = [...racers].sort((a, b) => {
        if (a.finished && b.finished) {
          return a.finishPos - b.finishPos;
        }
        if (a.finished) return -1;
        if (b.finished) return 1;
        return getRacerScore(b) - getRacerScore(a);
      });
      sorted.forEach((racer, idx) => {
        racer.posRank = idx + 1;
        if (racer.isPlayer) {
          const hudPosVal = document.getElementById('hud-pos-val');
          if (hudPosVal) {
            hudPosVal.innerText = `P${idx + 1}`;
          }
          const hudPos = document.getElementById('hud-pos');
          if (hudPos) {
            const ranks = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "13th", "14th", "15th", "16th"];
            hudPos.innerText = ranks[idx] || `${idx+1}th`;
          }
        }
      });
      validateRaceOrder(sorted);
    }
  }

  window.timingTowerCollapsed = false;
  window.timingTowerManuallyToggled = false;
  window.toggleTimingTower = (isAuto) => {
    if (!isAuto) {
      window.timingTowerManuallyToggled = true;
    }
    window.timingTowerCollapsed = !window.timingTowerCollapsed;
    
    window.lastLeaderboardUpdate = 0;
    if (typeof updateLeaderboardHUD === 'function') {
      updateLeaderboardHUD();
    }
  };

  window.driveOutFromGarage = () => {
    window.ApexAudio.playClick();
    const overlay = document.getElementById('f1-garage-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
    playerKart.hasDrivenOutThisSession = true;

    if (typeof window.isPitReleaseSafe === 'function' && !window.isPitReleaseSafe(playerKart)) {
      playerKart.pitReleaseWaiting = true;
      playerKart.driveOutAutopilot = true;
      playerKart.driveOutState = "GARAGE_HOLD";
      playerKart.controlsEnabled = false;
      
      playerKart.qualifyingState = "PIT_EXIT";
      playerKart.inPitLane = true;
      isPitting = true;
      hasStoppedAtPitBox = true;
      playerKart.pitZone = "PIT_BOX";
      playerKart.pitLimiterActive = true;
      playerKart.speed = 0.0;
      currentGear = 0;
      rdShowMessage('PIT LANE TRAFFIC // HOLD', 2.0, '#ef4444');
    } else {
      playerKart.driveOutAutopilot = true;
      playerKart.driveOutState = "GARAGE_EXIT";
      playerKart.controlsEnabled = false;

      playerKart.qualifyingState = "PIT_EXIT";
      playerKart.inPitLane = true;
      isPitting = true;
      hasStoppedAtPitBox = true;
      playerKart.pitZone = "PIT_BOX";
      playerKart.pitLimiterActive = true;
      playerKart.speed = 11.0;
      currentGear = 1;
    }
    
    speakEngineerRadio("Green light at pit exit. Limiter is active, drive out.", 40);

    setTimeout(() => {
      if (!window.timingTowerManuallyToggled && isRaceActive) {
        window.timingTowerCollapsed = false;
        window.toggleTimingTower(true);
      }
    }, 5000);
  };

  window.returnToGarage = () => {
    isPitting = false;
    hasStoppedAtPitBox = false;
    playerKart.inPitLane = true;
    playerKart.pitZone = "PIT_BOX";
    playerKart.currentPath = "PIT";
    
    playerKart.tyreLife = 100.0;
    tyreWear = 0.0;
    playerKart.ersEnergy = ERS_MAX_ENERGY;
    window.ersBatteryLevel = 100.0;
    fuelLevelLaps = window.weekendConfig ? window.weekendConfig.raceLaps * 1.15 : 4.0;
    carDamage = 0.0;
    
    const totalBoxes = F1_TEAMS.length;
    const pBoxT = 0.30 + (selectedTeamIndex / Math.max(1, totalBoxes - 1)) * 0.40;
    pitProgress = pBoxT;
    if (pitCurve && playerKart.mesh) {
      const pt = pitCurve.getPointAt(pBoxT);
      const tang = pitCurve.getTangentAt(pBoxT).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      playerKart.mesh.position.copy(pt.clone().add(norm.multiplyScalar(17.0)));
      playerKart.mesh.lookAt(pt);
      playerKart.heading = Math.atan2(pt.x - playerKart.mesh.position.x, pt.z - playerKart.mesh.position.z);
    }
    
    playerKart.qualifyingState = "GARAGE";
    playerKart.speed = 0.0;
    
    const isPitStop = playerKart.hasDrivenOutThisSession === true;
    
    playerKart.driveOutAutopilot = false;
    playerKart.driveOutState = "NONE";
    playerKart.controlsEnabled = true;
    
    const garageOverlay = document.getElementById('f1-garage-overlay');
    if (garageOverlay) {
      garageOverlay.classList.remove('hidden');
      garageOverlay.style.display = 'flex';
      
      const sessionTitles = ["PRACTICE SESSION", "QUALIFYING SESSION", "MAIN GP RACE"];
      const baseTitle = sessionTitles[currentSessionIndex] || "SESSION";
      
      const titleEl = document.getElementById('garage-session-type');
      const descEl = document.getElementById('garage-description');
      const tyreSelector = document.getElementById('garage-tyre-selector');
      const actionBtn = document.getElementById('garage-drive-out-btn');
      
      if (isPitStop) {
        if (titleEl) titleEl.innerText = "PIT STOP SERVICE";
        if (descEl) descEl.innerText = "Your car has returned to the garage. Select a tyre compound for the next stint and release the limiter to return to the track.";
        if (actionBtn) actionBtn.innerText = "RELEASE CAR";
        
        if (tyreSelector) {
          tyreSelector.classList.remove('hidden');
          tyreSelector.style.display = 'flex';
        }
        
        const activeComp = playerKart.tyreCompound || activeCompound || "medium";
        const btnId = `gar-compound-${activeComp}`;
        const activeBtn = document.getElementById(btnId);
        if (activeBtn) {
          const btns = document.querySelectorAll('.compound-btn');
          btns.forEach(b => b.classList.remove('selected'));
          activeBtn.classList.add('selected');
        }
      } else {
        if (titleEl) titleEl.innerText = baseTitle;
        if (descEl) descEl.innerText = "Your car is ready in the garage. Click below to release the speed limiter and drive out onto the track.";
        if (actionBtn) actionBtn.innerText = "DRIVE OUT";
        
        if (tyreSelector) {
          tyreSelector.classList.add('hidden');
          tyreSelector.style.display = 'none';
        }
      }
    }
    
    speakEngineerRadio(
      isPitStop 
        ? "Car is in the box for tyres. Choose compound when ready."
        : "Car is back in the garage. Data downloaded. When you are ready, you can go out again.", 
      60
    );
  };


  let lastDebugSessionIndex = null;
  let lastDebugStartingSequence = null;
  let lastDebugDriveOutState = null;

  window.debugPlayerFlowTransitions = () => {
    const currentSession = ["PRACTICE", "QUALIFYING", "RACE"][currentSessionIndex] || "PRACTICE";
    
    if (currentSessionIndex !== lastDebugSessionIndex) {
      console.log(
        "[SESSION CHANGE]",
        lastDebugSessionIndex,
        "→",
        currentSessionIndex,
        {
          currentSession,
          playerPosition: playerKart?.mesh?.position?.clone()
        }
      );
      lastDebugSessionIndex = currentSessionIndex;
    }

    if (isStartingSequence !== lastDebugStartingSequence) {
      console.log(
        "[STARTING SEQUENCE CHANGE]",
        lastDebugStartingSequence,
        "→",
        isStartingSequence,
        {
          currentSession,
          playerPosition: playerKart?.mesh?.position?.clone()
        }
      );
      lastDebugStartingSequence = isStartingSequence;
    }

    const driveOutState = playerKart ? playerKart.driveOutState : null;
    if (driveOutState !== lastDebugDriveOutState) {
      console.log(
        "[DRIVE OUT STATE CHANGE]",
        lastDebugDriveOutState,
        "→",
        driveOutState,
        {
          currentSession,
          playerPosition: playerKart?.mesh?.position?.clone(),
          speed: playerKart ? playerKart.speed : null
        }
      );
      lastDebugDriveOutState = driveOutState;
    }
  };

  window.debugSetPlayerPosition = (source, position) => {
    // const currentSession = ["PRACTICE", "QUALIFYING", "RACE"][currentSessionIndex] || "PRACTICE";
    // console.error(
    //   "[PLAYER POSITION WRITE]",
    //   {
    //     source,
    //     currentSession,
    //     isStartingSequence,
    //     driveOutState: playerKart ? playerKart.driveOutState : null,
    //     from: playerKart?.mesh?.position?.clone(),
    //     to: position?.clone() || position
    //   }
    // );
    // console.trace("[POSITION WRITE CALL STACK]");
    if (playerKart && playerKart.mesh) {
      playerKart.mesh.position.copy(position);
    }
  };

  let nextFinishPos = 1;

  function updateCarLap(car, delta) {
    if (window.formationLapActive) return;
    if (car.finished) return;
    // GARAGE GUARD: cars not physically on track never cross the start/finish line
    if (car.isTrackActive === false) return;
    if (car.inPitLane || car.isPitting) return;


    const previous = car.previousTrackProgress !== undefined ? car.previousTrackProgress : car.currentOffset;
    const current = car.currentOffset;

    // Detect forward crossing of start/finish line:
    const crossedFinishLine = car.speed > 0.0 && previous > 0.85 && current < 0.15;

    if (crossedFinishLine) {
      let lapValid = true;
      if (car.isPlayer) {
        // Require checkpoint validation for player to count a lap!
        if (!window.passedCP1 || !window.passedCP2) {
          console.warn("[CHECKPOINT ALERT] Player missed checkpoints! Lap not counted.");
          lapValid = false;
        }
        window.passedCP1 = false;
        window.passedCP2 = false;
      }
      
      // Handle Practice & Qualifying timed lap recording
      if (currentSessionIndex === 0 || currentSessionIndex === 1) {
        if (!car.isOnTimedLap) {
          // Finished out-lap. Start timed lap!
          car.isOnTimedLap = true;
          car.qualifyingState = "TIMED_LAP";
          car.lapTimeElapsed = 0.0;
          car.currentLapInvalid = false;
          if (car.isPlayer) {
            speakEngineerRadio("Out lap complete. Timed lap started, pushing now!", 40);
          }
        } else {
          // Finished a timed lap!
          const lapTime = car.lapTimeElapsed || 0.0;
          const isInvalid = car.currentLapInvalid || !lapValid;
          if (isInvalid) {
            if (car.isPlayer) {
              speakEngineerRadio("Lap time deleted for exceeding track limits or missed checkpoints.", 90);
              showShiftBlockedHUD("LAP TIME DELETED");
            }
          } else {
            // Record valid time
            if (currentSessionIndex === 0) {
              if (lapTime < (car.bestPracticeLap || Infinity)) {
                car.bestPracticeLap = lapTime;
                if (car.isPlayer) speakEngineerRadio("New personal best practice lap!", 55);
              }
            } else {
              if (lapTime < (car.bestQualifyingLap || Infinity)) {
                car.bestQualifyingLap = lapTime;
                if (car.isPlayer) speakEngineerRadio("New personal best qualifying lap!", 55);
              }
            }
          }
          
          // Start next timed lap fresh
          car.lapTimeElapsed = 0.0;
          car.currentLapInvalid = false;
        }

        // If clock is zero, this is their final lap. Stop timed runs
        if (window.sessionTimeRemaining <= 0) {
          car.isOnTimedLap = false;
          car.allowedToFinishQualifyingLap = false;
          if (car.isPlayer) {
            speakEngineerRadio("Qualifying checker flag! Return to garage.", 90);
            finishQualifying();
          }
        }
      } else {
        // Ignore grid launch crossings in the first 8 seconds of the race!
        if (raceTimer < 8.0) {
          car.previousTrackProgress = current;
          return;
        }
        
        // Handle Main Race lap crossing:
        const lapTime = car.lapTimeElapsed || 0.0;
        const isInvalid = car.currentLapInvalid || !lapValid;
        if (lapTime > 5.0) { // prevent double triggers on crossing
          if (!isInvalid) {
            if (lapTime < (car.bestLapTime || Infinity)) {
              car.bestLapTime = lapTime;
              if (car.isPlayer) speakEngineerRadio("New personal best lap!", 55);
            }
          }
          car.lapTimeElapsed = 0.0;
          car.currentLapInvalid = false;
        }

        // Main Grand Prix Race lap counting
        car.completedLaps = (car.completedLaps !== undefined ? car.completedLaps : 0) + 1;
        
        // If player completed a lap, update the global currentLap and HUD
        if (car.isPlayer) {
          currentLap = car.completedLaps + 1;
          const hudLap = document.getElementById('hud-lap');
          if (hudLap) {
            hudLap.innerText = `${Math.min(maxLaps, currentLap)}/${maxLaps}`;
          }
          if (car.completedLaps < maxLaps) {
            speakEngineerRadio(`Lap ${car.completedLaps} completed. Keep pushing!`, 30);
          }
        }

        // Check if the car has completed the race
        if (car.completedLaps >= maxLaps) {
          finishCar(car);
        }
      }
    }

    car.previousTrackProgress = current;
  }

  function finishCar(car) {
    if (car.finished) return;
    car.finished = true;
    car.finishPos = nextFinishPos;
    car.finishTime = raceTimer;
    nextFinishPos++;

    if (car.isPlayer) {
      isRaceActive = false;
      speakEngineerRadio("Chequered flag! Magnificent drive, bring the car home.", 90);
      startPostRaceSequence();
    } else {
      // AI Finished behavior setup
      car.speed = 15.0;
      car.postFinishStartProgress = car.currentOffset;
      car.postFinishProgress = 0.0;
      console.log(`[AI FINISHED] ${car.name} finished in P${car.finishPos} at time ${raceTimer.toFixed(2)}s`);
    }

    // Check if ALL karts have finished
    const allFinished = racers.every(r => r.finished);
    if (allFinished) {
      endActiveRace();
    }
  }

  // F1 Physics, Damage & Safety Car States
  let carDamage = 0.0;
  let safetyCarActive = false;
  let safetyCarOffset = 0.0;
  let safetyCarMesh = null;
  let safetyCarTimer = 0.0;

  // ═══════════════════════════════════════════════════════════════
  // 🏁 RACE DIRECTOR SYSTEM — Full F1 Regulation Implementation
  // ═══════════════════════════════════════════════════════════════

  // --- Virtual Safety Car (VSC) ---
  let vscActive = false;
  let vscTimer = 0.0;
  const VSC_SPEED_LIMIT = 18.0; // ~72 km/h in speed units

  // --- Red Flag ---
  let redFlagActive = false;
  let redFlagTimer = 0.0;
  let redFlagRestartPending = false;

  // --- Track Limit Warnings ---
  let trackLimitWarnings = 0;       // 0–4 strikes
  let trackLimitCooldown = 0.0;     // Cooldown between detections (2s)
  const TRACK_HALF_WIDTH = 13.5;    // Road half-width + kerb

  // --- Time Penalties (added to finish time) ---
  let playerTimePenaltySeconds = 0; // Total accumulated seconds penalty
  let pendingPenaltyDisplay = null; // { text, sub, timer }

  // --- Drive-Through / Stop-Go Penalties ---
  let driveThroughPending = false;
  let stopGoPending = false;
  let stopGoTimer = 0.0;

  // --- Blue Flag ---
  let blueFlagActive = false;
  let blueFlagTimer = 0.0;

  // --- Formation Lap ---
  let formationLapActive = false;
  let formationLapTimer = 0.0;
  const FORMATION_LAP_DURATION = 12.0; // 12 second warm-up before grid freeze

  // --- Marshal Sectors (6 sectors, each can be yellow/green) ---
  // Sectors split the track into 6 equal segments [0.0–0.167, 0.167–0.333, ...]
  const SECTOR_COUNT = 6;
  let sectorFlags = new Array(SECTOR_COUNT).fill('green'); // 'green' | 'yellow'
  let sectorFlagTimers = new Array(SECTOR_COUNT).fill(0.0);

  // --- Race Control Message Queue ---
  let rcMessageQueue = [];      // Array of { text, duration, color }
  let rcCurrentMsg = null;
  let rcMsgTimer = 0.0;

  // --- Illegal Overtake ---
  let illegalOvertakeWarningTimer = 0.0;
  let illegalOvertakeCarAhead = null; // racer that was overtaken under yellow

  // ─── AI Personality Stats per Driver ───────────────────────────
  // AI_PERSONALITIES and getPersonality come from f1-data.js (loaded before this file)
  const AI_PERSONALITIES = window.AI_PERSONALITIES;
  function getPersonality(racer) { return window.getDriverPersonality(racer); }
  
  // Cinematic State-Driven Pit Stop Variables
  let pitStopPhase = "NONE"; // NONE, CREW_RUNNING, LIFTING, CHANGING_TYRES, LOWERING, RELEASED
  let pitCrew = []; // Array of { group, standby, target, lookTarget }
  
  // Powerups & Hazards
  let stars = [];      // Floating 3D stars
  let rockets = [];    // Active soda rockets flying
  let activePowerup = null; // Power-up in player's inventory

  // Particle System
  let particles = [];
  let debrisObjects = [];

  // PRO_TIPS come from f1-data.js (window.PRO_TIPS)
  const PRO_TIPS = window.PRO_TIPS;

  // F1_TEAMS come from f1-data.js (window.F1_TEAMS)
  const F1_TEAMS = window.F1_TEAMS;

  // TRACKS with F1 3D Elevation (Sunset Coast Circuit & Alpine Heights)
  const TRACK_POINTS = [
    window.SUNSET_COAST.trackPoints,
    [
      // Alpine Heights
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(50, 2.5, 10),
      new THREE.Vector3(80, 6.0, 30),
      new THREE.Vector3(100, 2.0, 0),
      new THREE.Vector3(70, -1.5, -30),
      new THREE.Vector3(110, 4.0, -60),
      new THREE.Vector3(130, 8.5, -100),
      new THREE.Vector3(90, 3.0, -120),
      new THREE.Vector3(40, -1.2, -90),
      new THREE.Vector3(10, 3.5, -110),
      new THREE.Vector3(-30, 6.0, -120),
      new THREE.Vector3(-60, 1.5, -70),
      new THREE.Vector3(-100, -2.0, -80),
      new THREE.Vector3(-120, 3.0, -40),
      new THREE.Vector3(-80, 0.5, -11),
      new THREE.Vector3(-40, 1.2, 20)
    ]
  ];

  // Dynamic Reusable Loading Screen Progress Bar Animator
  window.triggerLoadingScreen = (title, subtitle, onComplete) => {
    const overlay = document.getElementById('f1-loading-overlay');
    if (!overlay) {
      onComplete();
      return;
    }
    document.getElementById('load-screen-title').innerText = title;
    document.getElementById('load-screen-subtitle').innerText = subtitle;
    document.getElementById('loading-tip-text').innerText = PRO_TIPS[Math.floor(Math.random() * PRO_TIPS.length)];
    
    // Find or create progress bar inside loading screen
    let bar = document.getElementById('loading-bar-fill');
    if (!bar) {
      const tipCard = document.querySelector('.loading-tip-card');
      if (tipCard) {
        const barContainer = document.createElement('div');
        barContainer.style.cssText = "width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-top: 15px; grid-column: span 2;";
        bar = document.createElement('div');
        bar.id = 'loading-bar-fill';
        bar.style.cssText = "width: 0%; height: 100%; background: var(--f1-red); transition: width 0.05s ease;";
        barContainer.appendChild(bar);
        tipCard.parentNode.insertBefore(barContainer, tipCard.nextSibling);
      }
    }
    
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    if (bar) bar.style.width = '0%';
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      if (bar) bar.style.width = `${progress}%`;
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          overlay.classList.add('hidden');
          overlay.style.display = 'none';
          onComplete();
        }, 250);
      }
    }, 55);
  };

  window.onload = () => {
    initUI();
    setupMenuPreview();
    setupVoiceRecognition();
    
    // Show console-style landing screen loading bar transition on first load
    window.triggerLoadingScreen("APEX STARS", "Chibi F1 Grand Prix", () => {
      // Completed loading
    });
  };

  function initUI() {
    const navItems = document.querySelectorAll('.f1-nav-item');
    
    // Career setup tab click (trigges loading screen animation first!)
    navItems[0].onclick = () => {
      window.ApexAudio.playClick();
      window.triggerLoadingScreen("CAREER SETUP", "Loading Contracts", () => {
        showWizard();
      });
    };

    const grandPrixModeBtn = document.getElementById("grandPrixModeBtn");
    if (!grandPrixModeBtn) {
      console.error("[UI] Grand Prix button missing");
    } else {
      grandPrixModeBtn.addEventListener("click", () => {
        window.ApexAudio.playClick();
        openGrandPrixSetup();
      });
    }


    // Quit results screen
    document.getElementById('btn-results-quit').onclick = () => {
      window.ApexAudio.playClick();
      document.getElementById('menu-results-screen').classList.add('hidden');
      document.getElementById('main-landing-screen').classList.remove('hidden');
      setupMenuPreview(); // restore rotation preview
    };

    // Replay race binding
    document.getElementById('btn-replay-race').onclick = () => {
      window.ApexAudio.playClick();
      document.getElementById('menu-results-screen').classList.add('hidden');
      setupGame();
    };

    // Keyboard handlers — using capture phase to prevent browser default click triggers on focused buttons when pressing Spacebar
    window.addEventListener('keydown', (e) => {
      // Rebinding interceptor
      if (window.rebindingAction) {
        e.preventDefault();
        e.stopPropagation();
        
        // Escape cancels rebinding
        if (e.code === 'Escape') {
          window.rebindingAction = null;
          renderSettingsTabContent();
          return;
        }

        // Assign key to this action
        window.keyBindings[window.rebindingAction] = [e.code];
        // Remove duplicate bindings of this key from other actions to prevent collisions
        for (const act in window.keyBindings) {
          if (act !== window.rebindingAction) {
            window.keyBindings[act] = window.keyBindings[act].filter(k => k !== e.code);
          }
        }
        
        localStorage.setItem('apex_stars_keybinds', JSON.stringify(window.keyBindings));
        window.rebindingAction = null;
        renderSettingsTabContent();
        window.ApexAudio.playClick();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
      }
      handleKey(e.code, true);
    }, true);
    window.addEventListener('keyup', (e) => {
      if (window.rebindingAction) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
      }
      handleKey(e.code, false);
    }, true);

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && isRaceActive && !isSettingsOpen) {
        toggleSettingsOverlay();
      }
    });

    // Wizard buttons
    document.getElementById('btn-wizard-back').onclick = () => {
      window.ApexAudio.playClick();
      navigateWizard(-1);
    };

    window.selectTyreCompound = (compound, element) => {
      window.ApexAudio.playClick();
      activeCompound = compound;
      const btns = document.querySelectorAll('.compound-btn');
      btns.forEach(b => b.classList.remove('selected'));
      element.classList.add('selected');
      element.blur(); // Remove focus immediately

      if (playerKart) {
        playerKart.tyreCompound = compound;
        if (typeof window.updateCarTyreColor === 'function') {
          window.updateCarTyreColor(playerKart);
        }
      }
      
      // Update HUD steering display text
      const hTyre = document.getElementById('steering-hud-tyre');
      if (hTyre) {
        hTyre.innerText = compound.toUpperCase();
        let labelColor = '#ef4444';
        if (compound === 'medium') labelColor = '#eab308';
        if (compound === 'hard') labelColor = '#f3f4f6';
        if (compound === 'intermediate') labelColor = '#22c55e';
        if (compound === 'wet') labelColor = '#3b82f6';
        hTyre.style.color = labelColor;
      }
    };
    document.getElementById('btn-wizard-next').onclick = () => {
      window.ApexAudio.playClick();
      navigateWizard(1);
    };
  }

  let shiftBlockedText = "";
  function showShiftBlockedHUD(msg) {
    shiftBlockedText = msg;
    shiftBlockedHUDTimer = 1.2; // Show for 1.2 seconds
    speakEngineerRadio(msg, 70);
  }

  function getRPMForSpeedAndGear(speed, gear) {
    if (gear === 0) { // Neutral
      return keys.w ? (14400 + Math.random() * 200) : (1500 + Math.random() * 50);
    }
    if (gear === -1) { // Reverse
      return 1500 + Math.min(1.0, Math.abs(speed) / 5.0) * 11000;
    }
    
    const minSpeed = gearMinSpeed[gear];
    const maxSpeed = gearMaxSpeed[gear];
    
    if (speed < minSpeed) {
      // Lugging the engine
      return Math.max(1500, 1500 + (speed / Math.max(0.1, minSpeed)) * 1500);
    }
    
    let rpmRatio = (speed - minSpeed) / (maxSpeed - minSpeed);
    let rpm = 2500 + rpmRatio * 12000;
    
    if (rpm >= 14920) {
      // Limiter bounce!
      rpm = 14900 + Math.random() * 100;
    }
    return rpm;
  }

  function triggerShiftIgnitionCut() {
    if (window.ApexAudio) {
      window.ApexAudio.triggerShiftCut();
    }
    // Shift duration scales with gearbox wear
    shiftActiveTimer = 0.05 + (gearboxWear / 100.0) * 0.15;

    // Shift rumble feedback
    if (typeof window.triggerGamepadRumble === 'function') {
      window.triggerGamepadRumble(60, 0.45, 0.05);
    }
    if (typeof window.triggerPhoneVibration === 'function') {
      window.triggerPhoneVibration(40);
    }
    
    // Tiny exhaust backfire flame if upshifting at high RPM!
    if (currentRPM > 12000 && playerKart && playerKart.mesh) {
      spawnBackfireFlame(playerKart.mesh.position);
    }
    
    // Add tiny camera shake
    if (camera) {
      camera.position.y += (Math.random() - 0.5) * 0.12;
      camera.position.x += (Math.random() - 0.5) * 0.12;
    }
  }

  function spawnBackfireFlame(pos) {
    for (let i = 0; i < 4; i++) {
      const size = 0.08;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.25, -1.7));
      scene.add(mesh);
      particles.push({
        mesh: mesh,
        life: 0.25,
        decay: 0.15,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, -2.5)
      });
    }
  }

  function cycleEngineMode() {
    const modes = ['standard', 'push', 'attack', 'fuel_save'];
    let idx = modes.indexOf(currentEngineMode);
    currentEngineMode = modes[(idx + 1) % modes.length];
    speakEngineerRadio(`Engine mode set to ${currentEngineMode.toUpperCase()}`, 30);
    
    const hMode = document.getElementById('steering-hud-mode');
    if (hMode) {
      hMode.innerText = currentEngineMode.toUpperCase();
      hMode.style.color = currentEngineMode === 'push' || currentEngineMode === 'attack' ? '#ef4444' : '#06b6d4';
    }
  }

  function triggerDRS() {
    // DRS Rules:
    // 1. Inside DRS Zone (drsAvailable === true)
    // 2. Race active and not in starting sequence.
    // 3. No Safety Car / Yellow flag.
    // 4. Speed > 100 km/h (speed > 25.0).
    // 5. If Grand Prix Race: must be within 1.0s of the car ahead.
    if (!isRaceActive || isStartingSequence || safetyCarActive || playerKart.speed < 25.0) {
      showShiftBlockedHUD("DRS BLOCKED: CONDITIONS NOT MET");
      return;
    }
    if (!drsAvailable) {
      showShiftBlockedHUD("DRS BLOCKED: OUTSIDE ZONE");
      return;
    }

    // Check gap if playing the GP Race (session 2)
    if (currentSessionIndex === 2) {
      const sorted = [...racers].sort((a, b) => getRacerScore(b) - getRacerScore(a));
      const playerIdx = sorted.findIndex(r => r.isPlayer);
      if (playerIdx === 0) {
        showShiftBlockedHUD("DRS BLOCKED: NO CAR AHEAD (LEADING)");
        return;
      } else {
        const carAhead = sorted[playerIdx - 1];
        const scorePlayer = getRacerScore(playerKart);
        const scoreAhead = getRacerScore(carAhead);
        const diff = scoreAhead - scorePlayer;
        const gapSecs = diff * 20.0; // 20s per lap estimate
        if (gapSecs > 1.0) {
          showShiftBlockedHUD(`DRS BLOCKED: GAP ${gapSecs.toFixed(2)}s (> 1.0s)`);
          return;
        }
      }
    }

    drsActive = !drsActive;
    if (drsActive) {
      if (window.ApexAudio) window.ApexAudio.playBoost();
      speakEngineerRadio("DRS active.", 70);
    } else {
      speakEngineerRadio("DRS closed.", 70);
    }
  }

  function isKeyBoundTo(code, action) {
    const binds = window.keyBindings[action];
    if (!binds) return false;
    return binds.includes(code);
  }

  function handleKey(code, isPressed) {
    // Escape key toggles Settings Overlay (always allowed)
    if (code === 'Escape' && isPressed) {
      if (window.rebindingAction) {
        window.rebindingAction = null;
        renderSettingsTabContent();
        return;
      }
      toggleSettingsOverlay();
      return;
    }

    // Block keyboard handling when game is paused
    if (window.isGamePaused) {
      return;
    }

    if (isPitStopActive) {
      if (isKeyBoundTo(code, 'drift') && isPressed) {
        tapPitStopQTE();
      }
      return;
    }

    if (isKeyBoundTo(code, 'pitStop') && isPressed && isRaceActive && !isPitStopActive && !isPitting) {
      pendingPitStop = true;
      speakEngineerRadio("Copy box this lap, pit limiter on.", 70);
    }

    if (isKeyBoundTo(code, 'radio') && isPressed && isRaceActive) {
      toggleVoiceListening();
    }

    // Toggle/cycle AI Debug HUD with 'KeyK' key
    if (code === 'KeyK' && isPressed && isRaceActive) {
      if (typeof window.cycleAIDebugCar === 'function') {
        window.cycleAIDebugCar();
      }
    }

    // Toggle Telemetry panel with customizable key
    if (isKeyBoundTo(code, 'status') && isPressed && isRaceActive) {
      toggleTelemetryPanel();
    }

    // Cycle Engine Mode with customizable key
    if (isKeyBoundTo(code, 'engineMode') && isPressed && isRaceActive) {
      cycleEngineMode();
    }

    // Fullscreen toggle with customizable key
    if (isKeyBoundTo(code, 'fullscreen') && isPressed) {
      toggleFullscreen();
    }

    // F1 Sequential Upshift
    if (isKeyBoundTo(code, 'upshift') && isPressed && isRaceActive && !isPitStopActive) {
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

    // F1 Sequential Downshift
    if (isKeyBoundTo(code, 'downshift') && isPressed && isRaceActive && !isPitStopActive) {
      let targetGear = currentGear - 1;
      if (targetGear < -1) targetGear = -1; // clamp to Reverse

      if (targetGear === -1 && playerKart.speed > 1.2) {
        showShiftBlockedHUD("REVERSE BLOCKED: SPEED TOO HIGH");
      } else if (targetGear >= 1) {
        // Overrev / Downshift protection check
        const estimatedRPM = getRPMForSpeedAndGear(playerKart.speed, targetGear);
        if (estimatedRPM > 14600) {
          showShiftBlockedHUD("ECU BLOCKED: OVERREV RISK");
          gearboxWear = Math.min(100.0, gearboxWear + 5.0); // damage gearbox on overrev attempt!
        } else {
          currentGear = targetGear;
          triggerShiftIgnitionCut();
        }
      } else {
        currentGear = targetGear;
        triggerShiftIgnitionCut();
      }
    }

    if (isKeyBoundTo(code, 'accelerate')) keys.w = isPressed;
    if (isKeyBoundTo(code, 'steerLeft')) keys.a = isPressed;
    if (isKeyBoundTo(code, 'brake')) keys.s = isPressed;
    if (isKeyBoundTo(code, 'steerRight')) keys.d = isPressed;
    if (isKeyBoundTo(code, 'drift')) keys.Space = isPressed;
    
    // SHIFT = DRS / Overtake Mode
    if (isKeyBoundTo(code, 'drs') && isRaceActive) {
      if (window.f1RegulationEra === '2026') {
        if (isPressed) {
          // Priority 1: toggle DRS wing if in straight zone
          if (drsAvailable) {
            drsActive = !drsActive;
            if (drsActive) {
              if (window.ApexAudio) window.ApexAudio.playBoost();
              speakEngineerRadio('DRS open.', 70);
            } else {
              speakEngineerRadio('DRS closed.', 70);
            }
          // Priority 2: activate Overtake ERS boost
          } else if (window.overtakeModeEligible && window.ersBatteryLevel > 5.0) {
            window.overtakeModeActive = true;
            if (window.ApexAudio) window.ApexAudio.playBoost();
          } else if (!window.overtakeModeEligible) {
            showShiftBlockedHUD('OVERTAKE BLOCKED: GAP > 1.0s');
          } else {
            showShiftBlockedHUD('OVERTAKE BLOCKED: BATTERY EMPTY');
          }
        } else {
          // Key release: stop Overtake mode (DRS stays open until zone exit/brake)
          window.overtakeModeActive = false;
        }
      } else {
        if (isPressed) triggerDRS();
      }
    }
  }

  // ════ MENU 3D ROTATION CAR PREVIEW ════
  function setupMenuPreview() {
    if (menuScene) return;

    const container = document.getElementById('menu-preview-container');
    if (!container) return;

    menuScene = new THREE.Scene();
    menuCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    menuCamera.position.set(0, 2, 6);
    menuCamera.lookAt(0, 0.4, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    menuScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 8, 2);
    menuScene.add(dirLight);

    const team = F1_TEAMS[selectedTeamIndex];
    previewKartMesh = createProceduralKartMesh(parseInt(team.color.replace('#', ''), 16));
    menuScene.add(previewKartMesh);

    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
    }
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    function menuAnimate() {
      if (isRaceActive) return; 
      requestAnimationFrame(menuAnimate);

      if (previewKartMesh) {
        previewKartMesh.rotation.y += 0.008;
      }
      renderer.render(menuScene, menuCamera);
    }
    menuAnimate();
  }

  function updateMenuPreviewCar() {
    if (!menuScene || !previewKartMesh) return;
    menuScene.remove(previewKartMesh);
    
    const team = F1_TEAMS[selectedTeamIndex];
    previewKartMesh = createProceduralKartMesh(parseInt(team.color.replace('#', ''), 16));
    menuScene.add(previewKartMesh);
    
    const textNode = document.getElementById('preview-car-name');
    if (textNode) {
      textNode.innerText = `${team.drivers[selectedTeammateIndex].name.toUpperCase()} - ${team.name.toUpperCase()}`;
    }
  }

  // ════ WIZARD NAVIGATOR (EA SPORTS STYLE) ════
  function showWizard() {
    currentWizardStep = 0;
    updateWizardUI();
    document.getElementById('setup-wizard-overlay').classList.remove('hidden');
  }

  function navigateWizard(direction) {
    if (direction === -1) {
      if (currentWizardStep === 0) {
        document.getElementById('setup-wizard-overlay').classList.add('hidden');
      } else {
        currentWizardStep--;
        updateWizardUI();
      }
    } else {
      if (currentWizardStep === 2) {
        // Step 3 Next opens the Career Headquarters workstation instead of starting the race immediately!
        document.getElementById('setup-wizard-overlay').classList.add('hidden');
        window.triggerLoadingScreen("CAREER HUB", "Loading Workstation", () => {
          showCareerWorkstation(false); // fresh entry from setup wizard
        });
      } else {
        currentWizardStep++;
        updateWizardUI();
      }
    }
  }

  function updateWizardUI() {
    document.getElementById('pane-step-0').classList.add('hidden');
    document.getElementById('pane-step-1').classList.add('hidden');
    document.getElementById('pane-step-2').classList.add('hidden');
    document.getElementById(`pane-step-${currentWizardStep}`).classList.remove('hidden');

    for (let i = 0; i < 3; i++) {
      const dot = document.getElementById(`dot-step-${i}`);
      if (i === currentWizardStep) dot.classList.add('active');
      else dot.classList.remove('active');
    }

    const category = document.getElementById('wizard-step-category');
    const title = document.getElementById('wizard-step-title');

    if (currentWizardStep === 0) {
      category.innerText = "STEP 1 OF 3 - DIVISION SETUP";
      title.innerText = "CHOOSE ENTRY LEVEL";
      document.getElementById('btn-wizard-next').innerText = "CONTINUE";
    } else if (currentWizardStep === 1) {
      category.innerText = "STEP 2 OF 3 - CONTRACT NEGOTIATIONS";
      title.innerText = "SELECT FORMULA TEAM";
      document.getElementById('btn-wizard-next').innerText = "SIGN CONTRACT";
      updateTeamPerformancePanel();
    } else if (currentWizardStep === 2) {
      category.innerText = "STEP 3 OF 3 - TEAMMATE SELECTION";
      title.innerText = "CHOOSE YOUR TEAM COMPANION";
      document.getElementById('btn-wizard-next').innerText = "LAUNCH GRAND PRIX";
      populateTeammatesView();
    }
  }

  window.selectWizardEntry = (idx, element) => {
    window.ApexAudio.playClick();
    selectedEntryLevel = idx;
    
    const container = document.getElementById('pane-step-0');
    container.querySelectorAll('.entry-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');

    activeDifficulty = idx === 0 ? 2 : 0; 
  };

  window.selectWizardTeam = (idx, element) => {
    window.ApexAudio.playClick();
    selectedTeamIndex = idx;
    
    const container = document.getElementById('pane-step-1');
    container.querySelectorAll('.team-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');

    updateTeamPerformancePanel();
    updateMenuPreviewCar();
  };

  function updateTeamPerformancePanel() {
    const team = F1_TEAMS[selectedTeamIndex];
    
    const fillSpeed = document.getElementById('bar-fill-speed');
    const valSpeed = document.getElementById('bar-val-speed');
    fillSpeed.style.width = `${team.stats.speed}%`;
    valSpeed.innerText = `${team.stats.speed}%`;

    const fillAero = document.getElementById('bar-fill-aero');
    const valAero = document.getElementById('bar-val-aero');
    fillAero.style.width = `${team.stats.aero}%`;
    valAero.innerText = `${team.stats.aero}%`;

    const fillTyre = document.getElementById('bar-fill-tyre');
    const valTyre = document.getElementById('bar-val-tyre');
    fillTyre.style.width = `${team.stats.tyre}%`;
    valTyre.innerText = `${team.stats.tyre}%`;

    const fillPower = document.getElementById('bar-fill-power');
    const valPower = document.getElementById('bar-val-power');
    fillPower.style.width = `${team.stats.power}%`;
    valPower.innerText = `${team.stats.power}%`;

    document.getElementById('team-expectation-text').innerText = team.expectation;
  }

  function populateTeammatesView() {
    const team = F1_TEAMS[selectedTeamIndex];
    
    document.getElementById('mate-0-name').innerText = team.drivers[0].name;
    document.getElementById('mate-0-num').innerText = team.drivers[0].num;
    document.getElementById('mate-1-name').innerText = team.drivers[1].name;
    document.getElementById('mate-1-num').innerText = team.drivers[1].num;
  }

  window.selectWizardTeammate = (idx, element) => {
    window.ApexAudio.playClick();
    selectedTeammateIndex = idx;
    activeDriver = idx; 

    const container = document.getElementById('pane-step-2');
    container.querySelectorAll('.teammate-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');

    updateMenuPreviewCar();
  };

  window.selectLandingTab = (idx, element) => {
    window.ApexAudio.playClick();
    const items = document.querySelectorAll('.f1-nav-item');
    items.forEach(i => i.classList.remove('active'));
    element.classList.add('active');

    if (idx === 0) {
      document.getElementById('main-landing-screen').classList.add('hidden');
      document.getElementById('setup-wizard-overlay').classList.remove('hidden');
      navigateWizard(0); // Start wizard at step 1
    }
  };




  // ════ CAREER WORKSTATION LOGIC ════
  function showCareerWorkstation(isReturnFromSession) {
    document.getElementById('main-landing-screen').classList.add('hidden');
    document.getElementById('f1-workstation-overlay').classList.remove('hidden');

    // Only reset weekend state if this is a fresh entry (not returning from a session mid-weekend)
    if (!isReturnFromSession) {
      isCarRevealed = false;
      currentSessionIndex = 0;
      completedSessions = [false, false, false];
      sessionStatuses = ['AVAILABLE', 'LOCKED', 'LOCKED'];
      window.practiceResults = null;
      document.getElementById('btn-reveal-car').innerText = "REVEAL TEAM CAR";
      document.getElementById('btn-reveal-car').style.display = "block";
    }

    document.getElementById('ws-team-label-text').innerText = F1_TEAMS[selectedTeamIndex].name;
    document.getElementById('ws-resource-points').innerText = resourcePoints;

    // Hide end-session button when back at workstation
    const epw = document.getElementById('end-practice-btn-wrap');
    if (epw) epw.style.display = 'none';

    updateWorkstationSessionsList();
    updateRndUpgradesPanel();
    if (!isReturnFromSession) setupWorkstationTurntable();
  }

  function setupWorkstationTurntable() {
    const container = document.getElementById('ws-car-turntable-container');
    if (!container) return;

    wsScene = new THREE.Scene();
    wsCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    wsCamera.position.set(0, 1.8, 5.5);
    wsCamera.lookAt(0, 0.4, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    wsScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 8, 2);
    wsScene.add(dirLight);

    // Covered sheet mesh (Grey cylinder covering the car)
    const coverGeo = new THREE.CylinderGeometry(1.2, 1.4, 2.2, 16);
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, metalness: 0.1 });
    wsCoverMesh = new THREE.Mesh(coverGeo, coverMat);
    wsCoverMesh.rotation.x = Math.PI / 2;
    wsCoverMesh.position.y = 0.5;
    wsScene.add(wsCoverMesh);

    // Real kart underneath
    const team = F1_TEAMS[selectedTeamIndex];
    wsKartMesh = createProceduralKartMesh(parseInt(team.color.replace('#', ''), 16));
    wsKartMesh.position.y = 0.0;
    wsScene.add(wsKartMesh);

    // Hide kart initially
    wsKartMesh.visible = false;

    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    function wsAnimate() {
      if (document.getElementById('f1-workstation-overlay').classList.contains('hidden') || isRaceActive) return;
      requestAnimationFrame(wsAnimate);

      if (wsCoverMesh && wsCoverMesh.visible) {
        wsCoverMesh.rotation.y += 0.005;
      }
      if (wsKartMesh && wsKartMesh.visible) {
        wsKartMesh.rotation.y += 0.008;
      }
      renderer.render(wsScene, wsCamera);
    }
    wsAnimate();
  }

  window.revealCarAction = () => {
    if (isCarRevealed) return;
    window.ApexAudio.playShoot();

    // Sheet poof animation: scale cover to zero, show kart
    isCarRevealed = true;
    document.getElementById('btn-reveal-car').style.display = "none";

    let scale = 1.0;
    function shrinkCover() {
      scale -= 0.08;
      if (scale <= 0.0) {
        wsCoverMesh.visible = false;
        wsKartMesh.visible = true;
        // Spark smoke particles
        spawnExhaustSmoke(new THREE.Vector3(0, 0.4, 0), true);
      } else {
        wsCoverMesh.scale.set(scale, scale, scale);
        requestAnimationFrame(shrinkCover);
      }
    }
    shrinkCover();
  };

  window.selectWorkstationTab = (tab) => {
    window.ApexAudio.playClick();
    document.getElementById('ws-tab-overview').classList.remove('active');
    document.getElementById('ws-tab-rnd').classList.remove('active');
    document.getElementById(`ws-tab-${tab}`).classList.add('active');

    document.getElementById('ws-content-overview').classList.add('hidden');
    document.getElementById('ws-content-rnd').classList.add('hidden');
    document.getElementById(`ws-content-${tab}`).classList.remove('hidden');
  };

  function updateWorkstationSessionsList() {
    // Session 0: Practice
    const check0 = document.getElementById('ws-check-0');
    const skipBtn = document.getElementById('ws-skip-practice-btn');
    const practiceResultEl = document.getElementById('ws-practice-result');
    if (check0) {
      const s0 = sessionStatuses[0];
      if (s0 === 'COMPLETED') {
        check0.innerText = 'COMPLETED'; check0.style.color = '#10b981';
        if (skipBtn) skipBtn.style.display = 'none';
        if (practiceResultEl && window.practiceResults) {
          const bl = window.practiceResults.bestLap;
          const blStr = (bl && bl !== Infinity) ? formatLapTime(bl) : '--:--.---';
          practiceResultEl.style.display = 'block';
          practiceResultEl.innerText = 'Laps: ' + (window.practiceResults.lapsCompleted || 0) + '  Best: ' + blStr;
        }
      } else if (s0 === 'SKIPPED') {
        check0.innerText = 'SKIPPED'; check0.style.color = '#fb923c';
        if (skipBtn) skipBtn.style.display = 'none';
      } else {
        check0.innerText = 'AVAILABLE'; check0.style.color = '#facc15';
        if (skipBtn) skipBtn.style.display = 'block';
      }
    }

    // Session 1: Qualifying
    const check1 = document.getElementById('ws-check-1');
    if (check1) {
      const s1 = sessionStatuses[1];
      if (s1 === 'COMPLETED') {
        check1.innerText = 'COMPLETED'; check1.style.color = '#10b981';
      } else if (s1 === 'AVAILABLE') {
        check1.innerText = 'AVAILABLE'; check1.style.color = '#facc15';
      } else {
        check1.innerText = 'LOCKED'; check1.style.color = 'rgba(255,255,255,0.3)';
      }
    }

    // Session 2: Race
    const check2 = document.getElementById('ws-check-2');
    if (check2) {
      const s2 = sessionStatuses[2];
      if (s2 === 'COMPLETED') {
        check2.innerText = 'COMPLETED'; check2.style.color = '#10b981';
      } else if (s2 === 'AVAILABLE') {
        check2.innerText = 'AVAILABLE'; check2.style.color = '#facc15';
      } else {
        check2.innerText = 'LOCKED'; check2.style.color = 'rgba(255,255,255,0.3)';
      }
    }

    // Update Start Session advance card label/desc
    const advLabel = document.getElementById('ws-advance-label');
    const advDesc  = document.getElementById('ws-advance-desc');
    const advCard  = document.getElementById('ws-advance-card');
    const SESSION_LABELS = ['PRACTICE', 'QUALIFYING', 'GRAND PRIX RACE'];
    const SESSION_DESCS  = [
      'Free practice session. Drive as many laps as you like, then end when ready.',
      'Set your fastest lap time to determine your starting grid position.',
      'Grand Prix main event. Use selected lap distance to determine the winner.'
    ];
    if (advLabel) advLabel.innerText = SESSION_LABELS[currentSessionIndex] || 'SESSION';
    if (advDesc)  advDesc.innerText  = SESSION_DESCS[currentSessionIndex]  || '';
    if (advCard)  advCard.style.opacity = '1';
  }

  function formatLapTime(t) {
    if (!t || t === Infinity) return '--:--.---';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 1000);
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') + '.' + String(ms).padStart(3,'0');
  }

  function updateRndUpgradesPanel() {
    document.getElementById('ws-resource-points').innerText = resourcePoints;

    ['speed', 'accel', 'drift'].forEach(key => {
      const level = upgrades[key];
      const levelText = document.getElementById(`upgrade-level-${key}`);
      const btn = document.getElementById(`btn-upgrade-${key}`);
      const card = document.getElementById(`upgrade-card-${key}`);

      levelText.innerText = `LEVEL ${level}/3`;

      if (level >= 3) {
        btn.innerText = "MAXED";
        btn.disabled = true;
        card.classList.add('maxed');
      } else {
        const cost = 500 * (level + 1);
        btn.innerText = `${cost} RP`;
        btn.disabled = resourcePoints < cost;
        card.classList.remove('maxed');
      }
    });
  }

  window.buyRndUpgrade = (key) => {
    const level = upgrades[key];
    const cost = 500 * (level + 1);

    if (resourcePoints >= cost && level < 3) {
      resourcePoints -= cost;
      upgrades[key]++;
      window.ApexAudio.playPickup(); // upgrade ding!
      updateRndUpgradesPanel();
    }
  };

  // Setup configuration variables
  window.weekendConfig = {
    selectedTeamId: 0,
    selectedDriverId: 0,
    selectedTrackId: 0,
    raceLaps: 3,
    difficulty: 1 // 0=Easy, 1=Normal, 2=Hard, 3=Expert
  };

  window.openWeekendSetupScreen = () => {
    document.getElementById('main-landing-screen').classList.add('hidden');
    const overlay = document.getElementById('weekend-setup-overlay');
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';

    // Populate constructors/teams
    const teamsGrid = document.getElementById('ws-setup-teams-grid');
    teamsGrid.innerHTML = '';
    F1_TEAMS.forEach((team, idx) => {
      const btn = document.createElement('button');
      btn.className = 'ws-team-btn';
      if (idx === window.weekendConfig.selectedTeamId) btn.classList.add('selected');
      btn.innerHTML = `<span style="display:inline-block; width:12px; height:12px; border-radius:3px; background:${team.color};"></span> ${team.name}`;
      btn.onclick = () => selectWeekendConstructor(idx);
      teamsGrid.appendChild(btn);
    });

    populateWeekendDrivers();
    updateWeekendTrackUI();
    updateWeekendLapsUI();
    updateWeekendDifficultyUI();
  };

  window.closeWeekendSetupScreen = () => {
    window.ApexAudio.playClick();
    const overlay = document.getElementById('weekend-setup-overlay');
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
    document.getElementById('main-landing-screen').classList.remove('hidden');
    setupMenuPreview();
  };

  function populateWeekendDrivers() {
    const driversRow = document.getElementById('ws-setup-drivers-row');
    driversRow.innerHTML = '';
    
    const team = F1_TEAMS[window.weekendConfig.selectedTeamId];
    team.drivers.forEach((driver, idx) => {
      const card = document.createElement('div');
      card.className = 'ws-driver-card';
      if (idx === window.weekendConfig.selectedDriverId) card.classList.add('selected');
      card.innerHTML = `<div style="font-size:1.5rem; margin-bottom:4px;">${driver.avatar}</div>
                        <strong style="font-size:0.75rem; display:block;">${driver.name}</strong>
                        <span style="font-size:0.65rem; color:rgba(255,255,255,0.4)">#${driver.num}</span>`;
      card.onclick = () => selectWeekendDriver(idx);
      driversRow.appendChild(card);
    });

    updateWeekendDriverTeammateInfo();
  }

  function updateWeekendDriverTeammateInfo() {
    const team = F1_TEAMS[window.weekendConfig.selectedTeamId];
    const playerDrv = team.drivers[window.weekendConfig.selectedDriverId];
    const teammateDrv = team.drivers[1 - window.weekendConfig.selectedDriverId];
    const info = document.getElementById('ws-driver-teammate-info');
    info.innerHTML = `🏁 <strong>PLAYER:</strong> ${playerDrv.name} (#${playerDrv.num})<br>
                      🤖 <strong>AI TEAMMATE:</strong> ${teammateDrv.name} (#${teammateDrv.num})`;
  }

  function selectWeekendConstructor(idx) {
    window.ApexAudio.playClick();
    window.weekendConfig.selectedTeamId = idx;
    selectedTeamIndex = idx;
    
    // Select first driver as default player
    window.weekendConfig.selectedDriverId = 0;
    activeDriver = 0;

    // Refresh team buttons
    const grid = document.getElementById('ws-setup-teams-grid');
    const buttons = grid.querySelectorAll('.ws-team-btn');
    buttons.forEach((btn, i) => {
      btn.classList.toggle('selected', i === idx);
    });

    populateWeekendDrivers();
    updateMenuPreviewCar();
  }

  function selectWeekendDriver(idx) {
    window.ApexAudio.playClick();
    window.weekendConfig.selectedDriverId = idx;
    activeDriver = idx;

    const row = document.getElementById('ws-setup-drivers-row');
    const cards = row.querySelectorAll('.ws-driver-card');
    cards.forEach((card, i) => {
      card.classList.toggle('selected', i === idx);
    });

    updateWeekendDriverTeammateInfo();
    updateMenuPreviewCar();
  }

  window.selectWeekendTrack = (idx) => {
    window.ApexAudio.playClick();
    window.weekendConfig.selectedTrackId = idx;
    activeTrack = idx;
    updateWeekendTrackUI();
  };

  function updateWeekendTrackUI() {
    const idx = window.weekendConfig.selectedTrackId;
    document.getElementById('ws-track-card-0').classList.toggle('selected', idx === 0);
    document.getElementById('ws-track-card-1').classList.toggle('selected', idx === 1);
  }

  window.selectWeekendLaps = (laps) => {
    window.ApexAudio.playClick();
    window.weekendConfig.raceLaps = laps;
    maxLaps = laps;
    document.getElementById('ws-custom-laps').value = laps;
    updateWeekendLapsUI();
  };

  window.selectWeekendLapsCustom = (val) => {
    let laps = parseInt(val);
    if (isNaN(laps)) laps = 3;
    laps = Math.max(3, Math.min(50, laps));
    window.weekendConfig.raceLaps = laps;
    maxLaps = laps;
    document.getElementById('ws-custom-laps').value = laps;
    updateWeekendLapsUI();
  };

  function updateWeekendLapsUI() {
    const laps = window.weekendConfig.raceLaps;
    const presets = [3, 10, 20, 35];
    presets.forEach(p => {
      const btn = document.getElementById(`ws-lap-btn-${p}`);
      if (btn) btn.classList.toggle('selected', laps === p);
    });
  }

  window.selectWeekendDifficulty = (diff) => {
    window.ApexAudio.playClick();
    window.weekendConfig.difficulty = diff;
    activeDifficulty = diff;
    updateWeekendDifficultyUI();
  };

  function updateWeekendDifficultyUI() {
    const diff = window.weekendConfig.difficulty;
    for (let i = 0; i < 4; i++) {
      const btn = document.getElementById(`ws-diff-btn-${i}`);
      if (btn) btn.classList.toggle('selected', diff === i);
    }
  }

  window.launchWeekendAction = () => {
    window.ApexAudio.playClick();
    const overlay = document.getElementById('weekend-setup-overlay');
    overlay.classList.add('hidden');
    overlay.style.display = 'none';

    // Open Career Hub with selected options locked in
    window.triggerLoadingScreen("CAREER HUB", "Loading Workstation", () => {
      showCareerWorkstation(false); // fresh entry from setup
    });
  };

  window.advanceToNextSession = () => {
    window.ApexAudio.playClick();
    
    // Hide career workstation
    const workstation = document.getElementById('f1-workstation-overlay');
    if (workstation) {
      workstation.classList.add('hidden');
    }

    const sessionNames = ["PRACTICE", "QUALIFYING", "MAIN GP RACE"];
    const sessionTitle = sessionNames[currentSessionIndex];
    const trackNames = ["Sunset Coast Circuit", "Alpine Heights"];

    window.triggerLoadingScreen(sessionTitle, trackNames[activeTrack], () => {
      setupGame();
    });
  };

  window.quitWorkstationToMenu = () => {
    window.ApexAudio.playClick();
    document.getElementById('f1-workstation-overlay').classList.add('hidden');
    document.getElementById('main-landing-screen').classList.remove('hidden');
    setupMenuPreview();
  };

  window.finishPractice = () => {
    // Called when session timer hits 0. Just notify; do NOT auto-return to workstation.
    // Player must press END SESSION to confirm.
    if (currentSessionIndex !== 0) return;
    // Show a soft notification but keep the player on track
    const epw = document.getElementById('end-practice-btn-wrap');
    if (epw) {
      epw.style.display = 'block'; // make sure button is visible
    }
    // Flash a HUD notification without interrupting the session
    const existing = document.getElementById('practice-time-over-notice');
    if (!existing) {
      const notice = document.createElement('div');
      notice.id = 'practice-time-over-notice';
      notice.style.cssText = 'position:absolute;top:80px;left:50%;transform:translateX(-50%);background:rgba(11,14,23,0.92);border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:10px 20px;font-family:"Orbitron",sans-serif;font-size:0.7rem;color:#facc15;letter-spacing:1.5px;z-index:500;pointer-events:none;';
      notice.innerText = 'SESSION TIME COMPLETE — Press END SESSION to return';
      const hudLayer = document.getElementById('hud-layer');
      if (hudLayer) hudLayer.appendChild(notice);
      setTimeout(() => { if (notice.parentNode) notice.parentNode.removeChild(notice); }, 8000);
    }
  };

  // Called from the END SESSION button confirm flow
  window.endPracticeSession = () => {
    if (currentSessionIndex === 1) {
      // Hide modal
      const modal = document.getElementById('end-practice-modal');
      if (modal) modal.style.display = 'none';
      
      const overlay = document.getElementById('f1-settings-overlay');
      if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.add('hidden');
      }
      window.isGamePaused = false;
      
      window.finishQualifying();
      return;
    }

    if (currentSessionIndex !== 0) return;

    // Store practice results
    const bl = playerKart ? (playerKart.bestPracticeLap || Infinity) : Infinity;
    const laps = playerKart ? (playerKart.completedLaps || 0) : 0;
    window.practiceResults = { lapsCompleted: laps, bestLap: bl };

    // Mark Practice COMPLETED
    completedSessions[0] = true;
    sessionStatuses[0] = 'COMPLETED';
    sessionStatuses[1] = 'AVAILABLE'; // unlock Qualifying
    currentSessionIndex = 1;

    // Hide modal
    const modal = document.getElementById('end-practice-modal');
    if (modal) modal.style.display = 'none';

    const overlay = document.getElementById('f1-settings-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.add('hidden');
    }
    window.isGamePaused = false;

    // Stop game loop
    isRaceActive = false;
    window.ApexAudio.stopEngine();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    // Reset session-local data so Qualifying starts clean
    resetSessionLocalState();

    window.triggerLoadingScreen("PRACTICE COMPLETED", "Returning to HQ...", () => {
      document.getElementById('hud-layer').style.display = 'none';
      const leadCard = document.getElementById('f1-leaderboard-card');
      if (leadCard) leadCard.style.display = 'none';
      showCareerWorkstation(true); // return from session
    });
  };

  // Show END SESSION confirmation modal
  window.confirmEndPractice = () => {
    if (currentSessionIndex !== 0 && currentSessionIndex !== 1) return;
    const isQual = (currentSessionIndex === 1);
    
    // Fill in best lap in modal
    const bl = playerKart ? (isQual ? playerKart.bestQualifyingLap : playerKart.bestPracticeLap) : Infinity;
    const blStr = (bl && bl !== Infinity) ? formatLapTime(bl) : '--:--.---';
    const epmEl = document.getElementById('epm-best-lap');
    if (epmEl) epmEl.innerText = blStr;
    
    const modalTitle = document.querySelector('#end-practice-modal h2');
    if (modalTitle) {
      modalTitle.innerText = isQual ? "RETIRE FROM QUALIFYING?" : "END PRACTICE?";
    }
    
    const modalDesc = document.querySelector('#end-practice-modal div:nth-child(4)');
    if (modalDesc) {
      modalDesc.innerHTML = isQual 
        ? 'Qualifying will be marked <span style="color:#10b981;">COMPLETED</span> and your best lap will decide your starting grid position.'
        : 'Practice will be marked <span style="color:#10b981;">COMPLETED</span> and Qualifying will unlock.';
    }
    
    const modal = document.getElementById('end-practice-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.cancelEndPractice = () => {
    const modal = document.getElementById('end-practice-modal');
    if (modal) modal.style.display = 'none';
  };

  // Show SKIP PRACTICE confirmation modal (from workstation hub)
  window.confirmSkipPractice = () => {
    const modal = document.getElementById('skip-practice-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.cancelSkipPractice = () => {
    const modal = document.getElementById('skip-practice-modal');
    if (modal) modal.style.display = 'none';
  };

  // Actually skip practice
  window.skipPractice = () => {
    if (sessionStatuses[0] !== 'AVAILABLE') return;
    sessionStatuses[0] = 'SKIPPED';
    completedSessions[0] = false; // skipped, not completed
    sessionStatuses[1] = 'AVAILABLE';
    currentSessionIndex = 1; // jump to Qualifying

    const modal = document.getElementById('skip-practice-modal');
    if (modal) modal.style.display = 'none';

    updateWorkstationSessionsList();
  };

  // Reset per-session data when transitioning between sessions
  function resetSessionLocalState() {
    if (!racers) return;
    racers.forEach(car => {
      car.completedLaps = 0;
      car.currentOffset = car.currentOffset; // keep position on track
      car.currentLapTime = 0;
      car.lapTimeElapsed = 0.0;
      car.currentLapInvalid = false;
      if (currentSessionIndex === 1) {
        // Entering Qualifying: reset best qualifying lap
        car.bestQualifyingLap = Infinity;
      }
      car.isOnTimedLap = false;
      car.finished = false;
      car.finishPosition = null;
      car.racePosition = null;
      car.blueFlagActive = false;
    });
  }

  // Show END SESSION button visibility based on session
  window.updateEndSessionBtnVisibility = () => {
    const epw = document.getElementById('end-practice-btn-wrap');
    if (!epw) return;
    epw.style.display = (currentSessionIndex === 0 && isRaceActive) ? 'block' : 'none';
  };

  window.finishQualifying = () => {
    isRaceActive = false;
    window.ApexAudio.stopEngine();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    // Hide any banner warning
    const overlay = document.getElementById('f1-starting-lights-overlay');
    if (overlay) overlay.style.display = 'none';

    // Verify and/or simulate qualifying times
    racers.forEach(r => {
      const hadValidLap = (r.bestQualifyingLap !== undefined && r.bestQualifyingLap !== Infinity && r.bestQualifyingLap > 0);
      r.hasQualifyingLap = hadValidLap;

      if (!hadValidLap) {
        if (r.isPlayer) {
          // Player gets NO TIME (Infinity)
          r.bestQualifyingLap = Infinity;
        } else {
          // AI gets simulated baseline
          const team = F1_TEAMS[r.teamIndex || 0];
          const speedStat = team ? team.stats.speed : 80;
          const baseline = 75.0 + (100 - speedStat) * 0.12 + Math.random() * 2.0;
          r.bestQualifyingLap = baseline;
          r.hasQualifyingLap = true;
        }
      }
    });

    // Stable sort: valid times first, then DNQs (ordered by default team placement)
    const sorted = [...racers].sort((a, b) => {
      const aVal = a.hasQualifyingLap ? 1 : 0;
      const bVal = b.hasQualifyingLap ? 1 : 0;
      if (aVal !== bVal) {
        return bVal - aVal; // 1 (valid) comes before 0 (invalid)
      }
      if (!a.hasQualifyingLap) {
        return 0; // both DNQ, keep order
      }
      return a.bestQualifyingLap - b.bestQualifyingLap;
    });
    
    // Store qualifying results so starting grid can read them
    window.qualifyingResults = sorted.map(r => r.name);
    
    // Assign grid positions
    sorted.forEach((r, idx) => {
      r.qualifyingPosition = idx + 1;
    });

    // Populate starting grid array
    window.startingGrid = [...sorted];

    showQualifyingResultsUI(sorted);
  };

  function showQualifyingResultsUI(sorted) {
    // Create results popup
    const popup = document.createElement('div');
    popup.id = 'qualifying-results-popup';
    popup.style.cssText = 'position:absolute; inset:0; background:rgba(10,15,26,0.95); z-index:20000; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; font-family:"Orbitron",sans-serif; padding:20px;';
    
    const playerIdx = sorted.findIndex(r => r.isPlayer);
    
    let rowsHTML = '';
    sorted.forEach((r, idx) => {
      const isPlayer = r.isPlayer ? 'color: var(--neon-cyan); font-weight: bold; background: rgba(6,182,212,0.08);' : '';
      const team = F1_TEAMS[r.teamIndex || 0] || { name: 'Unknown', color: '#fff' };
      
      let lapTimeStr = 'NO TIME';
      let gapStr = '—';
      
      if (r.hasQualifyingLap) {
        const mins = Math.floor(r.bestQualifyingLap / 60);
        const secs = Math.floor(r.bestQualifyingLap % 60);
        const ms = Math.floor((r.bestQualifyingLap % 1) * 1000);
        lapTimeStr = `${mins}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
        
        if (idx === 0) {
          gapStr = 'POLE';
        } else if (sorted[0].hasQualifyingLap) {
          const gap = r.bestQualifyingLap - sorted[0].bestQualifyingLap;
          gapStr = `+${gap.toFixed(3)}`;
        }
      }
      
      rowsHTML += `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; max-width:500px; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.08); font-size:0.8rem; box-sizing:border-box; ${isPlayer}">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="color:rgba(255,255,255,0.4); width:30px; font-weight:bold;">P${idx+1}</span>
            <span>${r.avatar}</span>
            <div style="display:flex; flex-direction:column;">
              <span style="font-weight:bold;">${r.name}</span>
              <span style="font-size:0.65rem; color:${team.color};">${team.name.toUpperCase()}</span>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:end; font-family:'Orbitron',monospace;">
            <span>${lapTimeStr}</span>
            <span style="font-size:0.65rem; color:rgba(255,255,255,0.4);">${gapStr}</span>
          </div>
        </div>
      `;
    });

    popup.innerHTML = `
      <div style="text-align:center; margin-bottom:20px;">
        <span style="color:var(--neon-pink); font-size:0.8rem; letter-spacing:2px;">SESSION COMPLETED</span>
        <h2 style="font-size:1.8rem; margin:4px 0 0 0;">QUALIFYING RESULTS</h2>
        <h3 style="color: var(--neon-cyan); margin: 6px 0 0 0; font-size: 1.1rem; text-shadow: 0 0 10px rgba(6,182,212,0.5); letter-spacing: 1px;">STARTING P${playerIdx + 1}</h3>
      </div>
      <div style="width:100%; max-width:550px; background:rgba(30,41,59,0.5); padding:20px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); max-height:60vh; overflow-y:auto; margin-bottom:20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        ${rowsHTML}
      </div>
      <button id="btn-qual-continue" class="ws-launch-btn" style="padding:12px 35px; font-size:0.9rem;">CONTINUE TO GRAND PRIX ➔</button>
    `;

    document.body.appendChild(popup);
    
    document.getElementById('btn-qual-continue').onclick = () => {
      popup.remove();
      completedSessions[1] = true;
      sessionStatuses[1] = 'COMPLETED';
      sessionStatuses[2] = 'AVAILABLE'; // Unlock Main Race!
      currentSessionIndex = 2; // Unlock Main Race!
      
      document.getElementById('hud-layer').style.display = 'none';
      const leadCard = document.getElementById('f1-leaderboard-card');
      if (leadCard) leadCard.style.display = 'none';
      
      showCareerWorkstation(true); // return from qualifying
    };
  }

  // ════ GRAND PRIX MODE 5-STEP SELECTION FLOW ════
  window.gpCurrentStep = 0;
  window.isGrandPrixMode = false;

  window.openGrandPrixSetup = () => {
    window.isGrandPrixMode = true;
    window.gpCurrentStep = 0;
    
    // Hide main menu
    document.getElementById('main-landing-screen').classList.add('hidden');
    
    // Show GP screen
    const screen = document.getElementById('grandPrixSetupScreen');
    if (!screen) {
      console.error("[GP SETUP] Screen does not exist");
      return;
    }
    screen.style.display = 'flex';
    console.log("[GP SETUP] Visible");

    // Initialize/Reset weekendConfig selection
    window.weekendConfig.selectedTeamId = 0;
    window.weekendConfig.selectedDriverId = 0;
    window.weekendConfig.selectedTrackId = 0;
    window.weekendConfig.raceLaps = 5;
    window.weekendConfig.difficulty = 1;

    // Reset UI steps
    gpRenderStep(0);
  };

  window.closeGrandPrixSetup = () => {
    window.isGrandPrixMode = false;
    document.getElementById('grandPrixSetupScreen').style.display = 'none';
    document.getElementById('main-landing-screen').classList.remove('hidden');
    setupMenuPreview();
  };

  window.gpRenderStep = (step) => {
    window.gpCurrentStep = step;
    
    // Update tabs classes
    for (let i = 0; i < 5; i++) {
      const tab = document.getElementById(`gp-tab-${i}`);
      const pane = document.getElementById(`gp-step-pane-${i}`);
      if (tab) {
        tab.className = 'gp-step-tab';
        if (i === step) tab.classList.add('active');
        else if (i < step) tab.classList.add('completed');
      }
      if (pane) {
        pane.className = 'gp-step-content';
        if (i === step) pane.classList.add('active');
      }
    }

    // Render contents for active step
    if (step === 0) {
      const grid = document.getElementById('gp-teams-grid');
      grid.innerHTML = '';
      F1_TEAMS.forEach((team, idx) => {
        const card = document.createElement('div');
        card.className = 'gp-card team-card';
        if (idx === window.weekendConfig.selectedTeamId) card.classList.add('selected');
        
        card.innerHTML = `
          <div class="gp-card-color-bar" style="background: ${team.color}; height: 4px; width: 100%; border-radius: 2px; margin-bottom: 12px;"></div>
          <h3 style="font-size: 0.95rem; font-weight: 800; text-transform: uppercase; color: #fff; margin: 0 0 12px 0;">${team.name}</h3>
          <div style="display: flex; flex-direction: column; gap: 4px; font-family: 'Inter', sans-serif; font-size: 0.72rem; color: #8c94a3;">
            <div style="display: flex; justify-content: space-between;">
              <span>Speed:</span> <span style="color: #fff; font-weight: bold;">${team.stats.speed}/100</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Handling:</span> <span style="color: #fff; font-weight: bold;">${team.stats.handling}/100</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Downforce:</span> <span style="color: #fff; font-weight: bold;">${team.stats.aero}/100</span>
            </div>
            <div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; display: flex; flex-direction: column; gap: 2px;">
              <div>• ${team.drivers[0].name}</div>
              <div>• ${team.drivers[1].name}</div>
            </div>
          </div>
        `;
        card.onclick = () => {
          window.ApexAudio.playClick();
          window.weekendConfig.selectedTeamId = idx;
          gpRenderStep(0);
        };
        grid.appendChild(card);
      });
    }
    else if (step === 1) {
      const grid = document.getElementById('gp-drivers-grid');
      grid.innerHTML = '';
      const selectedTeam = F1_TEAMS[window.weekendConfig.selectedTeamId];
      selectedTeam.drivers.forEach((driver, idx) => {
        const card = document.createElement('div');
        card.className = 'gp-card driver-card';
        if (idx === window.weekendConfig.selectedDriverId) card.classList.add('selected');
        
        card.innerHTML = `
          <div style="font-size: 2.2rem; margin-bottom: 12px; text-align: center;">${driver.avatar}</div>
          <h3 style="font-size: 0.95rem; font-weight: 800; text-transform: uppercase; color: #fff; margin: 0 0 8px 0; text-align: center;">${driver.name}</h3>
          <div style="font-family: 'Inter', sans-serif; font-size: 0.72rem; color: #8c94a3; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Team:</span> <span style="color: #fff; font-weight: bold;">${selectedTeam.name}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Upgrade Bonus:</span> <span style="color: var(--neon-cyan); font-weight: bold;">${idx === 0 ? "Acceleration" : "Top Speed"}</span>
            </div>
          </div>
        `;
        card.onclick = () => {
          window.ApexAudio.playClick();
          window.weekendConfig.selectedDriverId = idx;
          gpRenderStep(1);
        };
        grid.appendChild(card);
      });
    }
    else if (step === 2) {
      const grid = document.getElementById('gp-circuits-grid');
      grid.innerHTML = '';
      const tracks = [
        { id: 0, name: "Sunset Coast Circuit", icon: "🌅", desc: "Marina Bay style street track. 1,800m lap length. Heavy traction corners, scenic seaside runoffs." },
        { id: 1, name: "Alpine Heights", icon: "🏔️", desc: "High-altitude fast-flowing track. Dramatic mountain peaks, gondola sweeps, and extreme high-speed downforce corners." }
      ];
      tracks.forEach((track) => {
        const card = document.createElement('div');
        card.className = 'gp-card circuit-card';
        if (track.id === window.weekendConfig.selectedTrackId) card.classList.add('selected');
        
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="font-size: 0.95rem; font-weight: 800; color: #fff; margin: 0;">${track.name}</h3>
            <span style="font-size: 1.4rem;">${track.icon}</span>
          </div>
          <div class="gp-card-meta" style="margin-top: 10px; font-family: 'Inter', sans-serif; font-size: 0.72rem; color: #8c94a3; line-height: 1.4;">
            ${track.desc}
          </div>
        `;
        card.onclick = () => {
          window.ApexAudio.playClick();
          window.weekendConfig.selectedTrackId = track.id;
          gpRenderStep(2);
        };
        grid.appendChild(card);
      });
    }

    else if (step === 3) {
      document.querySelectorAll('.gp-secondary-btn').forEach(btn => btn.classList.remove('selected'));
      
      const laps = window.weekendConfig.raceLaps;
      if (laps === 5) document.getElementById('gp-laps-btn-5').classList.add('selected');
      else if (laps === 10) document.getElementById('gp-laps-btn-10').classList.add('selected');
      else if (laps === 20) document.getElementById('gp-laps-btn-20').classList.add('selected');
      else {
        document.getElementById('gp-laps-btn-custom').classList.add('selected');
        document.getElementById('gp-custom-laps-ctrl').style.display = 'flex';
        document.getElementById('gp-custom-laps-val').innerText = `${laps} LAPS`;
      }

      const diff = window.weekendConfig.difficulty;
      document.getElementById(`gp-diff-btn-${diff}`).classList.add('selected');
    }
    else if (step === 4) {
      const team = F1_TEAMS[window.weekendConfig.selectedTeamId];
      const drv = team.drivers[window.weekendConfig.selectedDriverId];
      const trackName = window.weekendConfig.selectedTrackId === 0 ? "Sunset Coast Circuit 🌅" : "Alpine Heights 🏔️";
      const difficulties = ["EASY", "NORMAL", "HARD", "EXPERT"];
      
      document.getElementById('gp-conf-team').innerText = team.name;
      document.getElementById('gp-conf-driver').innerText = `${drv.avatar} ${drv.name}`;
      document.getElementById('gp-conf-track').innerText = trackName;
      document.getElementById('gp-conf-laps').innerText = `${window.weekendConfig.raceLaps} LAPS`;
      document.getElementById('gp-conf-diff').innerText = difficulties[window.weekendConfig.difficulty];
    }

    // Update Debug Flow Panel
    document.getElementById('db-gp-step').innerText = step + 1;
    const currentTeam = F1_TEAMS[window.weekendConfig.selectedTeamId];
    document.getElementById('db-gp-team').innerText = currentTeam ? currentTeam.name : 'NONE';
    document.getElementById('db-gp-driver').innerText = currentTeam ? currentTeam.drivers[window.weekendConfig.selectedDriverId].name : 'NONE';
    document.getElementById('db-gp-track').innerText = window.weekendConfig.selectedTrackId === 0 ? 'Sunset Coast' : 'Alpine Heights';
    document.getElementById('db-gp-laps').innerText = window.weekendConfig.raceLaps;
    const diffNames = ["EASY", "NORMAL", "HARD", "EXPERT"];
    document.getElementById('db-gp-diff').innerText = diffNames[window.weekendConfig.difficulty];

    const debugEl = document.getElementById('gp-debug-flow-panel');
    if (debugEl) {
      debugEl.style.display = 'none';
    }
    
    const contBtn = document.getElementById('gp-btn-continue');
    if (contBtn) {
      if (step === 4) {
        contBtn.innerText = "START WEEKEND ➔";
      } else {
        contBtn.innerText = "CONTINUE ➔";
      }
    }
  };

  window.gpGoContinue = () => {
    window.ApexAudio.playClick();
    if (window.gpCurrentStep < 4) {
      window.gpRenderStep(window.gpCurrentStep + 1);
    } else {
      window.startGrandPrixWeekend();
    }
  };

  window.gpGoBack = () => {
    window.ApexAudio.playClick();
    if (window.gpCurrentStep > 0) {
      window.gpRenderStep(window.gpCurrentStep - 1);
    } else {
      window.closeGrandPrixSetup();
    }
  };

  window.gpJumpToStep = (step) => {
    if (step <= window.gpCurrentStep) {
      window.ApexAudio.playClick();
      window.gpRenderStep(step);
    }
  };

  window.setGpLaps = (laps) => {
    window.ApexAudio.playClick();
    window.weekendConfig.raceLaps = laps;
    document.getElementById('gp-custom-laps-ctrl').style.display = 'none';
    window.gpRenderStep(3);
  };

  window.activateGpCustomLaps = () => {
    window.ApexAudio.playClick();
    let currentLaps = window.weekendConfig.raceLaps;
    if (currentLaps === 5 || currentLaps === 10 || currentLaps === 20) {
      currentLaps = 15;
    }
    window.weekendConfig.raceLaps = currentLaps;
    document.getElementById('gp-custom-laps-ctrl').style.display = 'flex';
    window.gpRenderStep(3);
  };

  window.adjustGpCustomLaps = (delta) => {
    window.ApexAudio.playClick();
    let currentLaps = window.weekendConfig.raceLaps;
    if (currentLaps === 5 || currentLaps === 10 || currentLaps === 20) {
      currentLaps = 15;
    }
    const newLaps = THREE.MathUtils.clamp(currentLaps + delta, 3, 50);
    window.weekendConfig.raceLaps = newLaps;
    window.gpRenderStep(3);
  };

  window.setGpDifficulty = (diff) => {
    window.ApexAudio.playClick();
    window.weekendConfig.difficulty = diff;
    window.gpRenderStep(3);
  };

  window.startGrandPrixWeekend = () => {
    // Validate
    if (window.weekendConfig.selectedTeamId === undefined) throw new Error("No team selected");
    if (window.weekendConfig.selectedDriverId === undefined) throw new Error("No driver selected");
    if (window.weekendConfig.selectedTrackId === undefined) throw new Error("No circuit selected");
    if (window.weekendConfig.raceLaps < 3) throw new Error("Invalid race lap count");

    // Lock in choices globally
    selectedTeamIndex = window.weekendConfig.selectedTeamId;
    activeDriver = window.weekendConfig.selectedDriverId;
    activeTrack = window.weekendConfig.selectedTrackId;
    maxLaps = window.weekendConfig.raceLaps;
    activeDifficulty = window.weekendConfig.difficulty;

    // Reset workstation states
    currentSessionIndex = 0; // Practice
    completedSessions = [false, false, false];

    // Hide GP setup screen
    document.getElementById('grandPrixSetupScreen').style.display = 'none';

    window.triggerLoadingScreen("GRAND PRIX WEEKEND", "Entering Base Workstation...", () => {
      showCareerWorkstation(false); // fresh GP entry
    });
  };

  function updateCarTyreColor(car) {
    if (!car || !car.mesh || !car.mesh.tyreBandMat) return;
    const compound = car.tyreCompound || "soft";
    let colorHex = 0xef4444; // Soft red
    if (compound === 'medium') colorHex = 0xeab308; // Medium yellow
    if (compound === 'hard') colorHex = 0xf3f4f6; // Hard white
    if (compound === 'intermediate') colorHex = 0x22c55e; // Inter green
    if (compound === 'wet') colorHex = 0x3b82f6; // Wet blue
    car.mesh.tyreBandMat.color.setHex(colorHex);
  }
  window.updateCarTyreColor = updateCarTyreColor;

  // Expose key IIFE variables globally for the PvP sync module
  window.f1GetPlayerKart = () => playerKart;
  window.f1GetRacers = () => racers;
  window.f1GetGameState = () => gameState;
  window.f1SetGameState = (val) => { gameState = val; };
  window.f1GetActiveTrack = () => activeTrack;
  window.f1SetActiveTrack = (val) => { activeTrack = val; };
  window.f1GetSelectedTeamIndex = () => selectedTeamIndex;
  window.f1SetSelectedTeamIndex = (val) => { selectedTeamIndex = val; };
  window.f1GetKeys = () => keys;
  window.f1SetPlayerKart = (val) => { playerKart = val; };





