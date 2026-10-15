/**
 * Apex Stars: Chibi F1 - EA Sports F1 23/24 Style console engine
 * AUTO-GENERATED — edit files in ./src/ then run: node build.js
 */

(function () {

// ═══ game-01a-state-helpers.js ═══
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
  window.voiceSpeechEnabled = savedVoiceSpeech !== null ? savedVoiceSpeech === 'true' : true; // Enabled by default!

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
    
    // Authentic F1 tyre durability:
    // Soft: 15-18 laps (aggressive grip, higher wear ~6-7% per lap)
    // Medium: 25-30 laps (balanced race tire ~3.5-4% per lap)
    // Hard: 35-45 laps (ultra durable ~2-2.5% per lap)
    // Intermediate / Wet: 25-30 laps in rain
    let stintLaps = 26;
    if (car.tyreCompound === 'soft') stintLaps = 16;
    else if (car.tyreCompound === 'hard') stintLaps = 38;
    else if (car.tyreCompound === 'intermediate' || car.tyreCompound === 'wet') stintLaps = 28;

    // In short race sessions (e.g. 5 or 10 laps), scale gracefully so a soft tire still lasts 65% of race distance
    const raceScaleLaps = (typeof maxLaps === 'number' && maxLaps >= 3 && currentSessionIndex === 2)
      ? Math.max(8, maxLaps * (car.tyreCompound === 'soft' ? 0.65 : (car.tyreCompound === 'hard' ? 1.4 : 1.0)))
      : stintLaps;

    const wearPerSecondRef = 100.0 / (raceScaleLaps * 65.0); // 65 seconds per lap
    
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
    return completed * 1000.0 + progress;
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
      // Main GP Race: sort by finished status, total lap score, and DNF/retired status
      const sorted = [...racers].sort((a, b) => {
        if (a.finished && b.finished) {
          // If both finished normally, order by finish position
          if (!a.retired && !b.retired) return a.finishPos - b.finishPos;
          if (!a.retired) return -1;
          if (!b.retired) return 1;
        }
        if (a.finished && !a.retired) return -1;
        if (b.finished && !b.retired) return 1;
        
        // Handle retired/DNF cars (placed behind active runners)
        if (a.retired && b.retired) {
          return (b.completedLaps || 0) - (a.completedLaps || 0);
        }
        if (a.retired) return 1;
        if (b.retired) return -1;

        return getRacerScore(b) - getRacerScore(a);
      });

      sorted.forEach((racer, idx) => {
        racer.posRank = idx + 1;
        if (racer.isPlayer) {
          const hudPosVal = document.getElementById('hud-pos-val');
          if (hudPosVal) {
            hudPosVal.innerText = racer.retired ? "DNF" : `P${idx + 1}`;
          }
          const hudPos = document.getElementById('hud-pos');
          if (hudPos) {
            const ranks = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "13th", "14th", "15th", "16th"];
            hudPos.innerText = racer.retired ? "DNF" : (ranks[idx] || `${idx+1}th`);
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

    // Grant 100% MANUAL CONTROL immediately - NO robotic animation or forced slide!
    playerKart.driveOutAutopilot = false;
    playerKart.driveOutState = "NONE";
    playerKart.controlsEnabled = true;
    playerKart.isExitingGarage = true;

    playerKart.qualifyingState = "OUT_LAP";
    playerKart.inPitLane = true;
    isPitting = true;
    hasStoppedAtPitBox = true;
    isPitStopActive = false;
    const pitOverlay = document.getElementById('pit-stop-overlay');
    if (pitOverlay) pitOverlay.classList.add('hidden');
    playerKart.pitZone = "PIT_LANE";
    playerKart.pitLimiterActive = true;
    playerKart.speed = 0.0;
    currentGear = 1;

    // Ensure pit crew is ready outside at the pit box on apron
    if (typeof spawnPitCrewBoxes === 'function' && (!pitCrewBoxes || pitCrewBoxes.length === 0)) {
      spawnPitCrewBoxes();
    }

    if (pitCurve) {
      const totalBoxes = F1_TEAMS.length;
      const pBoxT = 0.26 + (selectedTeamIndex + 0.5) * (0.74 - 0.26) / totalBoxes;
      const tang = pitCurve.getTangentAt(pBoxT).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      // Angle the car 45° towards pit exit direction so driving out into the fast lane is smooth and avoids opposite barrier
      const exitDir = norm.clone().negate().add(tang.clone().multiplyScalar(0.95)).normalize();
      playerKart.heading = Math.atan2(exitDir.x, exitDir.z);
      playerKart.mesh.rotation.y = playerKart.heading;
    }

    // Mechanics immediately clear the central bay by stepping back against the walls
    if (window.f1ActiveGarages) {
      window.f1ActiveGarages.forEach(g => {
        if (g.mechanics) {
          g.mechanics.forEach(m => {
            if (m.role === 'front_jack') {
              m.position.x = 3.6;
              m.rotation.y = -Math.PI / 2;
            } else {
              const targetX = m.baseX > 0 ? (m.baseX + 2.5) : (m.baseX - 2.5);
              m.position.x = targetX;
            }
          });
        }
      });
    }

    if (window.ApexAudio) {
      window.ApexAudio.startEngine();
      window.ApexAudio.updateEnginePitch(2600);
    }

    rdShowMessage('MANUAL CONTROL // DRIVE OUT // LIMITER: 80 KM/H', 3.5, '#10b981');
    speakEngineerRadio("Green light! Pit limiter is active, steer out to the pit lane.", 40);

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
    const T_START = 0.26;
    const T_END = 0.74;
    const TEAM_STEP = (T_END - T_START) / totalBoxes;
    const pBoxT = T_START + (selectedTeamIndex + 0.5) * TEAM_STEP;
    pitProgress = pBoxT;
    if (pitCurve && playerKart.mesh) {
      const pt = pitCurve.getPointAt(pBoxT);
      const tang = pitCurve.getTangentAt(pBoxT).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      playerKart.mesh.position.copy(pt.clone().add(norm.clone().multiplyScalar(24.0)));
      const exitDir = norm.clone().negate().normalize();
      playerKart.heading = Math.atan2(exitDir.x, exitDir.z);
      playerKart.mesh.rotation.set(0, playerKart.heading, 0);
    }

    if (window.f1ActiveGarages) {
      window.f1ActiveGarages.forEach(g => {
        if (g.mechanics) {
          g.mechanics.forEach(m => {
            m.position.x = m.baseX;
            m.position.z = m.baseZ;
            m.rotation.y = m.role === 'front_jack' ? Math.PI : (m.baseX > 0 ? -Math.PI / 2 : Math.PI / 2);
          });
        }
      });
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
        // On standing start, all cars launch from behind the finish line.
        // Ignore the initial line crossing from the grid launch so it does NOT count as a full lap!
        if (!car.gridLaunchCrossingHandled) {
          car.gridLaunchCrossingHandled = true;
          car.lapTimeElapsed = 0.0;
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
      // Completed loading - smoothly reveal main landing screen
      const landing = document.getElementById("main-landing-screen");
      if (landing) {
        landing.classList.remove("hidden");
        landing.style.display = "";
      }
    });
  };

  // ════ PIT STRATEGY TYRE SELECTOR HANDLERS ════
  window.choosePitCompound = (comp) => {
    if (!comp) return;
    activeCompound = comp;
    window.voiceSelectedCompound = comp;
    if (playerKart) {
      playerKart.tyreCompound = comp;
      if (typeof window.updateCarTyreColor === 'function') {
        window.updateCarTyreColor(playerKart);
      }
    }
    
    // Update button states in pit strategy card
    const buttons = document.querySelectorAll('.strategy-compound-btn');
    buttons.forEach(btn => btn.classList.remove('selected'));
    const activeBtn = document.getElementById(`strat-btn-${comp}`);
    if (activeBtn) activeBtn.classList.add('selected');

    // Also update post-race pit compound buttons if present
    const garBtns = document.querySelectorAll('.compound-btn');
    garBtns.forEach(btn => btn.classList.remove('selected'));
    const postBtn = document.getElementById(`compound-${comp}`);
    if (postBtn) postBtn.classList.add('selected');

    if (typeof speakEngineerRadio === 'function') {
      speakEngineerRadio(`Copy, fitting ${comp.toUpperCase()} tyres on entry. Box box box.`, 70, true);
    }
    if (window.ApexAudio) {
      window.ApexAudio.playClick();
    }
    pendingRadioQuestion = null;
    window.keepListeningForVoice = false;

    // Immediately hide the pit strategy compound selector card so it doesn't stay on screen or overlap
    const stratCard = document.getElementById('hud-pit-strategy-card');
    if (stratCard) {
      stratCard.classList.add('hidden');
      stratCard.style.display = 'none';
    }
    const titleEl = document.getElementById('pit-select-compound-title');
    const containerEl = document.getElementById('pit-compound-selector-container');
    if (titleEl) titleEl.style.display = 'none';
    if (containerEl) containerEl.style.display = 'none';
  };

  // Number key shortcuts 1-5 for quick strategy selection
  window.addEventListener('keydown', (e) => {
    const stratCard = document.getElementById('hud-pit-strategy-card');
    if (!stratCard || stratCard.classList.contains('hidden') || stratCard.style.display === 'none') return;
    if (e.key === '1') window.choosePitCompound('soft');
    else if (e.key === '2') window.choosePitCompound('medium');
    else if (e.key === '3') window.choosePitCompound('hard');
    else if (e.key === '4') window.choosePitCompound('intermediate');
    else if (e.key === '5') window.choosePitCompound('wet');
  });

  // Global window shortcut for Team Radio Voice Terminal ('V' key)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyV' || e.key === 'v' || e.key === 'V') {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
      if (typeof window.toggleVoiceListening === 'function') {
        window.toggleVoiceListening();
      }
    }
  });

  window.spectatorModeActive = false;
  window.spectatorCarIndex = 0;
  window.spectatorTargetCar = null;

  // ════ TERMINAL DAMAGE OVERLAY & REPAIR HANDLERS ════
  window.showTerminalDamageOverlay = () => {
    const overlay = document.getElementById('f1-terminal-damage-overlay');
    if (overlay) {
      overlay.style.display = 'flex';

      const towBtn = document.getElementById('btn-terminal-tow');
      const spectateBtn = document.getElementById('btn-terminal-spectate');
      const endBtn = document.getElementById('btn-terminal-end-session');

      if (currentSessionIndex === 2) {
        // Race DNF: Player cannot repair and continue race!
        if (towBtn) towBtn.style.display = 'none';
        if (spectateBtn) spectateBtn.style.display = 'inline-block';
        if (endBtn) endBtn.style.display = 'inline-block';
      } else {
        // Practice / Qualifying: Can tow back to garage
        if (towBtn) towBtn.style.display = 'inline-block';
        if (spectateBtn) spectateBtn.style.display = 'none';
        if (endBtn) endBtn.style.display = 'none';
      }
    }

    if (playerKart) {
      playerKart.speed = 0.0;
      playerKart.controlsEnabled = false;
      if (currentSessionIndex === 2) {
        playerKart.retired = true;
        playerKart.finished = true;
      }
    }
    if (window.ApexAudio) {
      window.ApexAudio.stopEngine();
      window.ApexAudio.playDriftScreech();
    }
    if (typeof speakEngineerRadio === 'function') {
      speakEngineerRadio("Engine failure! Terminal damage, pull over and switch off. We're out of the race.", 100, true);
    }
  };

  window.startSpectatorMode = () => {
    window.spectatorModeActive = true;
    const overlay = document.getElementById('f1-terminal-damage-overlay');
    if (overlay) overlay.style.display = 'none';

    if (playerKart) {
      playerKart.speed = 0.0;
      playerKart.controlsEnabled = false;
      playerKart.retired = true;
      playerKart.finished = true;
    }

    // Pick top active AI car
    const activeAI = racers.filter(r => !r.isPlayer && !r.retired);
    window.spectatorCarIndex = 0;
    window.spectatorTargetCar = activeAI[0] || racers.find(r => !r.isPlayer) || playerKart;

    const specHud = document.getElementById('f1-spectator-hud');
    if (specHud) {
      specHud.style.display = 'flex';
    }
    updateSpectatorHUD();
    if (typeof speakEngineerRadio === 'function') {
      speakEngineerRadio("Switched to onboard broadcast spectator feed.", 80, true);
    }
  };

  window.cycleSpectatorCar = (dir) => {
    if (window.ApexAudio) window.ApexAudio.playClick();
    const activeCars = racers.filter(r => !r.isPlayer && !r.retired);
    if (activeCars.length === 0) return;
    window.spectatorCarIndex = (window.spectatorCarIndex + dir + activeCars.length) % activeCars.length;
    window.spectatorTargetCar = activeCars[window.spectatorCarIndex];
    updateSpectatorHUD();
  };

  function updateSpectatorHUD() {
    const car = window.spectatorTargetCar;
    if (!car) return;
    const nameEl = document.getElementById('spectator-driver-name');
    const teamEl = document.getElementById('spectator-driver-team');
    const posEl = document.getElementById('spectator-driver-pos');
    const lapEl = document.getElementById('spectator-driver-lap');

    if (nameEl) nameEl.innerText = car.name || "DRIVER";
    if (teamEl) {
      const team = F1_TEAMS[car.teamIndex || 0];
      teamEl.innerText = team ? team.name : "";
      if (team) teamEl.style.color = team.color;
    }
    if (posEl) posEl.innerText = `P${car.posRank || 1}`;
    if (lapEl) lapEl.innerText = `LAP ${Math.min(maxLaps, (car.completedLaps || 0) + 1)}/${maxLaps}`;
  }

  window.retireAndEndSession = () => {
    if (window.ApexAudio) window.ApexAudio.playClick();
    const overlay = document.getElementById('f1-terminal-damage-overlay');
    if (overlay) overlay.style.display = 'none';
    const specHud = document.getElementById('f1-spectator-hud');
    if (specHud) specHud.style.display = 'none';

    window.spectatorModeActive = false;

    if (playerKart) {
      playerKart.speed = 0.0;
      playerKart.controlsEnabled = false;
      playerKart.retired = true;
      playerKart.finished = true;
    }

    if (typeof showFinalResultsUI === 'function') {
      showFinalResultsUI();
    } else {
      transitionToPostRaceState("RESULTS");
    }
  };

  window.towToGarageAndRepair = () => {
    const overlay = document.getElementById('f1-terminal-damage-overlay');
    if (overlay) overlay.style.display = 'none';

    carDamage = 0.0;
    tyreWear = 0.0;
    if (typeof updateDamageHUD === 'function') updateDamageHUD();

    if (playerKart) {
      playerKart.speed = 0.0;
      playerKart.damage = 0.0;
      playerKart.frontWingAttached = true;
      playerKart.rearWingAttached = true;
      playerKart.controlsEnabled = true;
      if (typeof window.restoreCarWings === 'function') {
        window.restoreCarWings(playerKart);
      } else if (typeof restoreCarWings === 'function') {
        restoreCarWings(playerKart);
      }

      // If in Practice or Qualifying, tow back into garage bay
      if (currentSessionIndex === 0 || currentSessionIndex === 1) {
        playerKart.qualifyingState = "GARAGE";
        playerKart.inPitLane = true;
        playerKart.hasDrivenOutThisSession = false;
        playerKart.driveOutState = "IN_GARAGE";
        if (typeof showGarageDriveOutUI === 'function') {
          showGarageDriveOutUI();
        }
      } else {
        // In Race, restart race cleanly
        window.restartCurrentSessionFromCrash();
        return;
      }
    }

    if (typeof speakEngineerRadio === 'function') {
      speakEngineerRadio("Car recovered to garage. Mechanics fitted fresh power unit, new front wing and checked telemetry. You're clear to drive out.", 80, true);
    }
  };

  window.restartCurrentSessionFromCrash = () => {
    const overlay = document.getElementById('f1-terminal-damage-overlay');
    if (overlay) overlay.style.display = 'none';

    carDamage = 0.0;
    tyreWear = 0.0;
    if (playerKart) {
      playerKart.damage = 0.0;
      playerKart.frontWingAttached = true;
      playerKart.rearWingAttached = true;
      if (typeof window.restoreCarWings === 'function') window.restoreCarWings(playerKart);
    }

    const sessionTitle = sessionNames[currentSessionIndex];
    const trackNames = ["Sunset Coast Circuit", "Alpine Heights"];
    window.triggerLoadingScreen(sessionTitle, trackNames[activeTrack], () => {
      setupGame();
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
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
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
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
      handleKey(e.code, false);
    }, true);

    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        if (navigator.keyboard && navigator.keyboard.lock) {
          navigator.keyboard.lock(['Escape']).catch(() => {});
        }
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

      // Hide tyre compound options once selected
      const stratCard = document.getElementById('hud-pit-strategy-card');
      if (stratCard) {
        stratCard.classList.add('hidden');
        stratCard.style.display = 'none';
      }
      const titleEl = document.getElementById('pit-select-compound-title');
      const containerEl = document.getElementById('pit-compound-selector-container');
      if (titleEl) titleEl.style.display = 'none';
      if (containerEl) containerEl.style.display = 'none';
      
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
    
    const absSpeed = Math.abs(speed);
    if (absSpeed < 0.5) {
      return 1500 + Math.random() * 60; // Smooth idle revs when stopped
    }

    const maxSpeed = gearMaxSpeed[gear] || 90.0;
    const ratio = Math.min(1.05, absSpeed / Math.max(1.0, maxSpeed));
    let rpm = 3500 + ratio * 10800;
    
    if (ratio >= 0.98) {
      // Limiter bounce at top of gear!
      rpm = 14350 + Math.random() * 200;
    }
    if (rpm >= 14850) {
      rpm = 14750 + Math.random() * 150;
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
      window.triggerPhoneVibration([35, 20, 45]);
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

    if ((isKeyBoundTo(code, 'radio') || code === 'KeyV') && isPressed) {
      if (typeof window.toggleVoiceListening === 'function') {
        window.toggleVoiceListening();
      }
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

  window.openF1Multiplayer = () => {
    window.ApexAudio.playClick();
    document.getElementById('main-landing-screen').classList.add('hidden');
    const screen = document.getElementById('f1-multiplayer-screen');
    if (screen) {
      screen.style.display = 'flex';
      screen.classList.remove('hidden');
    }
  };

  window.closeF1Multiplayer = () => {
    window.ApexAudio.playClick();
    const screen = document.getElementById('f1-multiplayer-screen');
    if (screen) {
      screen.classList.add('hidden');
      setTimeout(() => { screen.style.display = 'none'; }, 350);
    }
    document.getElementById('main-landing-screen').classList.remove('hidden');
  };

  function bindF1MultiplayerClicks() {
    const friendBtn = document.getElementById('btn-f1-pvp-friend');
    if (friendBtn) {
      friendBtn.onclick = () => {
        window.ApexAudio.playClick();
        const fab = document.getElementById('ps-mp-fab');
        const panel = document.getElementById('ps-mp-panel');
        if (fab && panel) {
          if (!panel.classList.contains('open')) {
            fab.click();
          }
          const pvpTab = panel.querySelector('[data-tab="pvp"]');
          if (pvpTab) pvpTab.click();
        }
      };
    }

    const onlineBtn = document.getElementById('btn-f1-pvp-online');
    if (onlineBtn) {
      onlineBtn.onclick = () => {
        window.ApexAudio.playClick();
        const fab = document.getElementById('ps-mp-fab');
        const panel = document.getElementById('ps-mp-panel');
        if (fab && panel) {
          if (!panel.classList.contains('open')) {
            fab.click();
          }
          const mmTab = panel.querySelector('[data-tab="mm"]');
          if (mmTab) mmTab.click();
          
          const mmBtn = document.getElementById('ps-mp-mm-btn');
          if (mmBtn && mmBtn.classList.contains('find')) {
            mmBtn.click();
          }
        }
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindF1MultiplayerClicks);
  } else {
    setTimeout(bindF1MultiplayerClicks, 500);
  }

  window.selectLandingTab = (idx, element) => {
    window.ApexAudio.playClick();
    const items = document.querySelectorAll('.f1-nav-item');
    items.forEach(i => i.classList.remove('active'));
    element.classList.add('active');

    if (idx === 0) {
      document.getElementById('main-landing-screen').classList.add('hidden');
      document.getElementById('setup-wizard-overlay').classList.remove('hidden');
      navigateWizard(0); // Start wizard at step 1
    } else if (idx === 2) {
      window.openF1Multiplayer();
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
        contBtn.innerText = "START GRAND PRIX RACE ➔";
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
      window.startDirectGrandPrixRace();
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

  window.startDirectGrandPrixRace = () => {
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

    // Launch Grand Prix directly into the Main Race session on starting grid!
    currentSessionIndex = 2; // Main GP Race
    completedSessions = [true, true, false];
    sessionStatuses = ['COMPLETED', 'COMPLETED', 'AVAILABLE'];

    // Hide GP setup screen
    document.getElementById('grandPrixSetupScreen').style.display = 'none';

    const trackNames = ["Sunset Coast Circuit", "Alpine Heights"];
    window.triggerLoadingScreen("GRAND PRIX RACE", trackNames[activeTrack], () => {
      setupGame();
    });
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

  // ── WIRELESS PHONE CONTROLLER MODAL LOGIC ──
  window.openF1ControllerModal = function() {
    const modal = document.getElementById('f1-controller-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    if (!window.roomCode && window.socket && window.socket.connected) {
      window.socket.emit('join-room-pc', {});
    }
    updateF1ControllerModalUI();
  };

  window.closeF1ControllerModal = function() {
    const modal = document.getElementById('f1-controller-modal');
    if (modal) modal.style.display = 'none';
  };

  function updateF1ControllerModalUI() {
    const code = window.roomCode || new URLSearchParams(window.location.search).get('room') || sessionStorage.getItem('activeRoomCode') || localStorage.getItem('play_sphere_room');
    const roomEl = document.getElementById('f1-ctrl-room-val');
    const qrImg = document.getElementById('f1-ctrl-qr-img');
    const qrSpinner = document.getElementById('f1-ctrl-qr-spinner');
    const dot = document.getElementById('f1-ctrl-status-dot');
    const txt = document.getElementById('f1-ctrl-status-text');

    if (roomEl) {
      roomEl.innerText = code || 'GENERATING...';
    }

    if (code && qrImg) {
      const phoneUrl = `${window.location.origin}/controller.html?room=${code}`;
      qrImg.src = `/qrcode?text=${encodeURIComponent(phoneUrl)}`;
      qrImg.onload = () => {
        if (qrSpinner) qrSpinner.style.display = 'none';
        qrImg.style.display = 'block';
      };
    } else if (!code && qrSpinner) {
      qrSpinner.style.display = 'block';
      if (qrImg) qrImg.style.display = 'none';
    }

    if (window.controllerConnected) {
      if (dot) { dot.style.background = '#10b981'; dot.style.boxShadow = '0 0 10px #10b981'; }
      if (txt) { txt.innerText = 'Phone controller connected!'; txt.style.color = '#10b981'; }
      const footerTxt = document.getElementById('f1-footer-controller-text');
      if (footerTxt) footerTxt.innerText = 'CONTROLLER: CONNECTED';
    } else {
      if (dot) { dot.style.background = '#ef4444'; dot.style.boxShadow = '0 0 8px #ef4444'; }
      if (txt) { txt.innerText = 'No phone controller linked'; txt.style.color = 'rgba(255,255,255,0.7)'; }
    }
    updateControllerPromptKeybinds();
  }
  window.updateF1ControllerModalUI = updateF1ControllerModalUI;

  // ── Dynamic Controller Keybind & Prompt UI Updater ──
  // Hides gamepad buttons and switches prompt keys to ENTER/ESC when no gamepad or phone is connected
  function updateControllerPromptKeybinds() {
    let hasGamepad = false;
    try {
      if (navigator.getGamepads) {
        const gps = navigator.getGamepads();
        for (let i = 0; i < gps.length; i++) {
          if (gps[i] && gps[i].connected) {
            hasGamepad = true;
            break;
          }
        }
      }
    } catch(e) {}

    const isConnected = hasGamepad || !!window.controllerConnected;

    // 1. Update footer prompt buttons between keyboard keycaps and controller buttons
    const selectKeyElements = document.querySelectorAll('.prompt-select-key');
    selectKeyElements.forEach(el => {
      if (isConnected) {
        el.innerText = '✕';
        el.className = 'prompt-btn prompt-select-key';
      } else {
        el.innerText = 'ENTER';
        el.className = 'prompt-key prompt-select-key';
      }
    });

    const backKeyElements = document.querySelectorAll('.prompt-back-key');
    backKeyElements.forEach(el => {
      if (isConnected) {
        el.innerText = '◯';
        el.className = 'prompt-btn prompt-back-key';
      } else {
        el.innerText = 'ESC';
        el.className = 'prompt-key prompt-back-key';
      }
    });
  }
  window.updateControllerPromptKeybinds = updateControllerPromptKeybinds;

  window.addEventListener('gamepadconnected', updateControllerPromptKeybinds);
  window.addEventListener('gamepaddisconnected', updateControllerPromptKeybinds);
  setInterval(updateControllerPromptKeybinds, 1000);
  setTimeout(updateControllerPromptKeybinds, 200);

  // Poll for socket initialization to bind controller events
  const socketPoll = setInterval(() => {
    if (window.socket) {
      clearInterval(socketPoll);
      window.socket.on('phone-connected', () => {
        window.controllerConnected = true;
        updateF1ControllerModalUI();
        updateControllerPromptKeybinds();
      });
      window.socket.on('phone-disconnected', () => {
        window.controllerConnected = false;
        updateF1ControllerModalUI();
        updateControllerPromptKeybinds();
      });
      window.socket.on('room-created', ({ roomCode }) => {
        window.roomCode = roomCode;
        updateF1ControllerModalUI();
      });
      updateF1ControllerModalUI();
    }
  }, 250);






// ═══ game-01b-setup-builders.js ═══
  // ════ 3D GRAND PRIX GAMEPLAY ════
  function setupGame() {
    postRaceActive = false;
    postRaceState = "FINISHING";
    currentRaceId++;
    if (playerKart) playerKart.heading = undefined;
    const myRaceId = currentRaceId;
    // Prevent duplicate animate loops by canceling any running loop
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    document.getElementById('main-landing-screen').classList.add('hidden');
    document.getElementById('hud-layer').style.display = 'flex';
    const leadCard = document.getElementById('f1-leaderboard-card');
    if (leadCard) {
      leadCard.classList.remove('hidden');
      leadCard.style.display = 'block';
    }
    
    const container = document.getElementById('canvas-container');
    container.innerHTML = "";

    // Theme-specific environment settings
    let skyTopColor = 0xff9a5a;
    let skyBottomColor = 0xffe8c9;
    let fogColor = 0xffb98a;
    let fogDensity = 0.0022;
    let ambientColor = 0xffedd5;
    let lightColor = 0xfeb080;
    let hemiSky = 0xffdca8;
    let hemiGround = 0x14532d;

    if (activeTrack === 1) {
      // Alpine Heights theme
      skyTopColor = 0x0284c7;    // Cool sky blue
      skyBottomColor = 0xe0f2fe; // Light fog blue/white
      fogColor = 0xe0f2fe;
      fogDensity = 0.0035;
      ambientColor = 0xf0f9ff;
      lightColor = 0xffffff;
      hemiSky = 0xbae6fd;
      hemiGround = 0x1e3a8a;    // Mountain snow reflecting
    }

    // 3D Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(skyBottomColor);
    scene.fog = new THREE.FogExp2(fogColor, fogDensity);

    // Camera
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Ambient, Hemisphere & Directional Lights
    const ambientLight = new THREE.AmbientLight(ambientColor, 0.4);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(hemiSky, hemiGround, 0.5);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(lightColor, 1.2);
    dirLight.position.set(-150, 80, -200);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Enable Soft Shadows!

    // Build Track
    buildTrack();

    // Create Racers
    createRacers();

    // Spawning collection stars disabled for realistic F1 race feel!
    stars = [];

    // Reset Race Variables
    currentLap = 1;
    nextFinishPos = 1;
    activePowerup = null;
    tyreWear = 0.0;
    carDamage = 0.0;
    
    // Initialize session timer: 10min practice, 5min qualifying, no timer for race
    window._sessionExpiredFired = false;
    if (currentSessionIndex === 0) {
      window.sessionTimeRemaining = 600.0; // 10 minutes for Practice (free run)
    } else if (currentSessionIndex === 1) {
      window.sessionTimeRemaining = 300.0; // 5 minutes for Qualifying
    } else {
      window.sessionTimeRemaining = 0.0;   // Race uses lap count, not time
    }
    if (racers) {
      racers.forEach(r => {
        if (currentSessionIndex === 0) {
          r.bestPracticeLap = Infinity;
        } else if (currentSessionIndex === 1) {
          r.bestQualifyingLap = Infinity;
        }
        r.isOnTimedLap = false;
        r.lapTimeElapsed = 0.0;
        r.currentLapInvalid = false;
        r.completedLaps = 0;
        r.finished = false;
      });
    }

    if (playerKart) {
      playerKart.frontWingAttached = true;
      playerKart.rearWingAttached = true;
      restoreCarWings(playerKart);
    }
    isPitStopActive = false;
    
    // Reset gearbox & engine mode telemetry states!
    currentGear = 0; // Neutral for starting grid hold!
    currentRPM = 1000;
    shiftBlockedHUDTimer = 0.0;
    shiftActiveTimer = 0.0;
    gearboxWear = 0.0;
    currentEngineMode = 'standard';
    // Starting fuel scaled by selected race distance
    fuelLevelLaps = window.weekendConfig ? window.weekendConfig.raceLaps * 1.15 : 4.0;
    lastLeaderboardUpdate = 0;

    
    const hMode = document.getElementById('steering-hud-mode');
    if (hMode) {
      hMode.innerText = "STANDARD";
      hMode.style.color = "#06b6d4";
    }

    updateTyreWearHUD();
    updateDamageHUD();

    const tPanel = document.getElementById('hud-telemetry-panel');
    if (tPanel) tPanel.classList.remove('show');
    const tBtn = document.getElementById('hud-telemetry-btn');
    if (tBtn) tBtn.classList.remove('active');

    const pOverlay = document.getElementById('pit-stop-overlay');
    if (pOverlay) pOverlay.classList.add('hidden');
    
    // Reset voice states
    pendingRadioQuestion = null;
    lastPosRank = 4;
    lastOvertakeCheerTime = 0;
    isRainActive = false;
    rainAlertTriggered = false;

    // Reset DRS & checkpoints
    drsAvailable = false;
    drsActive = false;
    window.passedCP1 = false;
    window.passedCP2 = false;
    updatePowerupHUD();
    document.getElementById('hud-lap').innerText = `1/${maxLaps}`;

    // Reset Pitting states
    pendingPitStop = false;
    isPitting = (currentSessionIndex !== 2); // true if Practice (0) or Qualifying (1)
    pitProgress = 0.0;
    hasStoppedAtPitBox = false;
    pitCrewBoxes.forEach(c => scene.remove(c));
    pitCrewBoxes = [];

    // 🏁 Reset Race Director (VSC, Red Flag, Track Limits, Penalties, Flags)
    resetRaceDirector();

    const lightsOverlay = document.getElementById('f1-starting-lights-overlay');
    const garageOverlay = document.getElementById('f1-garage-overlay');

    if (currentSessionIndex === 2) {
      // skip garage & formation lap for GP Race Day!
      window.raceState = "RACE_LIGHTS";
      window.formationLapActive = false;
      isStartingSequence = true;
      startingSequenceTime = 0.0; // Show full grid panning sweep camera cuts!
      lastLightSoundIndex = -1;

      if (lightsOverlay) {
        lightsOverlay.classList.remove('hidden');
        lightsOverlay.style.display = 'flex';
        document.getElementById('lights-banner-title').innerText = "GRID FORMATION";
      }
      if (garageOverlay) {
        garageOverlay.classList.add('hidden');
        garageOverlay.style.display = 'none';
      }

      // Initialize startingGrid if not set
      if (!window.startingGrid || window.startingGrid.length === 0) {
        const sorted = [...racers].sort((a,b) => (a.qualifyingPosition || 99) - (b.qualifyingPosition || 99));
        window.startingGrid = sorted;
      }

      // Position player on starting grid
      const pIdx = window.startingGrid.findIndex(r => r.isPlayer);
      const pSlotIdx = pIdx !== -1 ? pIdx : 0;
      const pSlot = window.getGridSlotTransform(pSlotIdx);

      playerKart.inPitLane = false;
      playerKart.pitZone = "TRACK";
      playerKart.currentPath = "TRACK";
      playerKart.currentOffset = pSlot.progress;
      playerKart.sideOffset = pSlot.sideOffset;
      playerKart.speed = 0.0;
      playerKart.qualifyingState = "FORMATION";
      playerKart.isTrackActive = true;
      playerKart.collisionEnabled = false; // Disable collisions during starting sequence countdown
      if (playerKart.mesh) {
        playerKart.mesh.visible = true;
        playerKart.mesh.position.copy(pSlot.position);
        playerKart.mesh.rotation.y = pSlot.heading;
      }
      playerKart.completedLaps = 0;
      playerKart.finished = false;
      playerKart.retired = false;
      playerKart.gridLaunchCrossingHandled = false;
      playerKart.tyreLife = 100.0;
      playerKart.tyreCompound = activeCompound || "medium";
      playerKart.hasDrivenOutThisSession = true; // Skip drive out!
      playerKart.driveOutState = "COMPLETE";
      playerKart.driveOutAutopilot = false;
      playerKart.controlsEnabled = false; // Locked until lights out!

      // Position all AI karts on starting grid
      racers.forEach(r => {
        r.completedLaps = 0;
        r.finished = false;
        r.retired = false;
        r.gridLaunchCrossingHandled = false;
        r.postRaceStopped = false;
        r.postFinishStartProgress = undefined;
        r.tyreLife = 100.0;
        if (!r.tyreCompound) {
          const compounds = ["soft", "medium", "hard"];
          r.tyreCompound = compounds[Math.floor(Math.random() * 3)];
        }

        if (r.isPlayer) return;

        const myGridIdx = window.startingGrid.findIndex(g => g.name === r.name);
        const slotIdx = myGridIdx !== -1 ? myGridIdx : 1;
        const slot = window.getGridSlotTransform(slotIdx);

        r.inPitLane = false;
        r.pitZone = "TRACK";
        r.currentPath = "TRACK";
        r.currentOffset = slot.progress;
        r.sideOffset = slot.sideOffset;
        r.speed = 0.0;
        r.qualifyingState = "FORMATION";
        r.isTrackActive = true;
        r.collisionEnabled = false; // Disable collisions during starting sequence countdown
        r.gridReady = true; // Already ready!

        if (r.mesh) {
          r.mesh.visible = true;
          r.mesh.position.copy(slot.position);
          r.mesh.rotation.y = slot.heading;
          if (typeof window.registerCollider === 'function') {
            window.registerCollider(r.mesh, "CAR");
          }
        }
      });

    } else {
      // Practice / Qualifying garage/pit box startup
      window.raceState = "RACING";
      window.formationLapActive = false;
      isStartingSequence = false;
      
      if (lightsOverlay) {
        lightsOverlay.classList.add('hidden');
        lightsOverlay.style.display = 'none';
      }
      if (garageOverlay) {
        garageOverlay.classList.remove('hidden');
        garageOverlay.style.display = 'flex';
        const sessionTitles = ["PRACTICE SESSION", "QUALIFYING SESSION", "MAIN GP RACE"];
        document.getElementById('garage-session-type').innerText = sessionTitles[currentSessionIndex] || "SESSION";
      }

      // Position player at pit box
      playerKart.inPitLane = true;
      playerKart.pitZone = "PIT_BOX";
      playerKart.currentPath = "PIT";
      const totalBoxes = F1_TEAMS.length;
      const T_START = 0.26;
      const T_END = 0.74;
      const TEAM_STEP = (T_END - T_START) / totalBoxes;
      const pBoxT = T_START + (selectedTeamIndex + 0.5) * TEAM_STEP;
      pitProgress = pBoxT;
      
      if (pitCurve && playerKart.mesh) {
        const pt = pitCurve.getPointAt(pBoxT);
        const tang = pitCurve.getTangentAt(pBoxT).normalize();
        const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
        playerKart.mesh.position.copy(pt.clone().add(norm.clone().multiplyScalar(24.0)));
        const exitDir = norm.clone().negate().normalize(); // points straight out of garage door towards pit road
        playerKart.heading = Math.atan2(exitDir.x, exitDir.z);
        playerKart.mesh.rotation.set(0, playerKart.heading, 0);
      }
      playerKart.qualifyingState = "GARAGE";
      playerKart.speed = 0.0;
      playerKart.completedLaps = 0;
      playerKart.finished = false;
      playerKart.tyreLife = 100.0;
      playerKart.tyreCompound = activeCompound || "medium";
      playerKart.hasDrivenOutThisSession = false;
      playerKart.driveOutState = "NONE";
      playerKart.driveOutAutopilot = false;
      playerKart.controlsEnabled = true;
      playerKart.isTrackActive    = true;
      playerKart.collisionEnabled = true;
      if (playerKart.mesh) playerKart.mesh.visible = true;

      // Position AI racers at their respective pit boxes (GARAGE = physically inactive)
      racers.forEach(r => {
        r.completedLaps = 0;
        r.finished = false;
        r.postRaceStopped = false;
        r.postFinishStartProgress = undefined;
        r.tyreLife = 100.0;
        if (!r.tyreCompound) {
          const compounds = ["soft", "medium", "hard"];
          r.tyreCompound = compounds[Math.floor(Math.random() * 3)];
        }
        
        if (r.isPlayer) return;
        r.inPitLane = true;
        r.pitZone = "PIT_BOX";
        r.currentPath = "PIT";
        const boxT = 0.30 + (r.teamIndex / Math.max(1, totalBoxes - 1)) * 0.40;
        r.pitProgress = boxT;
        if (pitCurve && r.mesh) {
          const pt = pitCurve.getPointAt(boxT);
          const tang = pitCurve.getTangentAt(boxT).normalize();
          const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
          r.mesh.position.copy(pt.clone().add(norm.multiplyScalar(17.0)));
          r.mesh.lookAt(pt.clone().add(tang));
        }
        r.qualifyingState  = "GARAGE";
        r.speed            = 0.0;
        if (typeof window.deactivateTrackCar === 'function') {
          window.deactivateTrackCar(r);
        } else {
          r.isTrackActive    = false;
          r.collisionEnabled = false;
          if (r.mesh) r.mesh.visible = true;
        }
        r.currentOffset    = 0.0;
        
        if (currentSessionIndex === 1) {
          r.qualifyingReleaseTime = 3.0 + Math.random() * 120.0;
          r.qualifyingTimedLapsRemaining = 2 + Math.floor(Math.random() * 2);
        } else {
          r.qualifyingReleaseTime = 2.0 + Math.random() * 30.0;
          r.qualifyingTimedLapsRemaining = 4 + Math.floor(Math.random() * 3);
        }
      });
    }

    // Update tyre band colors for all cars at startup
    racers.forEach(r => {
      if (typeof window.updateCarTyreColor === 'function') {
        window.updateCarTyreColor(r);
      }
    });


    startTime = clock.getElapsedTime();
    clock.getDelta();
    isRaceActive = true;

    // Immediately show END SESSION button for Practice — don't wait for first timer tick
    if (currentSessionIndex === 0) {
      const epw = document.getElementById('end-practice-btn-wrap');
      if (epw) epw.style.display = 'block';
    } else {
      // Hide for qualifying / race
      const epw = document.getElementById('end-practice-btn-wrap');
      if (epw) epw.style.display = 'none';
    }

    window.ApexAudio.startEngine();
    
    // Spawn glowing green transparent pit stop visual box
    spawnPlayerPitBoxVisual();

    window.onresize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    animate(myRaceId);
  }

  // F1 Cinematic Gantry Starting Lights & Grid Formations
  function updateStartingSequence(delta) {
    if (currentSessionIndex !== 2) {
      console.error("[BLOCKED STARTING SEQUENCE OUTSIDE RACE]", currentSessionIndex);
      console.trace("[STARTING SEQUENCE CALL STACK]");
      isStartingSequence = false;
      return;
    }
    startingSequenceTime += delta;

    const startPt = trackCurve.getPointAt(0);

    // Positions karts into grid positions at start
    racers.forEach((racer, idx) => {
      if (racer.isPlayer) {
        const currentSession = ["PRACTICE", "QUALIFYING", "RACE"][currentSessionIndex] || "PRACTICE";
        if (currentSession !== "RACE") return;
        if (racer.inPitLane || racer.pitAutopilot || racer.driveOutAutopilot) return;
      }
      const tPos = 0.0 - idx * 0.012; // Spaced staggered rows (matches launch hold spacing!)
      const rPoint = trackCurve.getPointAt((tPos + 1.0) % 1.0);
      const rTangent = trackCurve.getTangentAt((tPos + 1.0) % 1.0);
      const rNormal = new THREE.Vector3(-rTangent.z, 0, rTangent.x);
      if (rNormal.lengthSq() > 0.000001) {
        rNormal.normalize();
      } else {
        rNormal.set(1, 0, 0);
      }
      
      const side = idx % 2 === 0 ? 1.8 : -1.8;
      rPoint.add(rNormal.multiplyScalar(side));
      
      if (racer.isPlayer && typeof window.debugSetPlayerPosition === 'function') {
        window.debugSetPlayerPosition("updateStartingSequence_GRID", rPoint);
      } else {
        racer.mesh.position.copy(rPoint);
      }
      racer.mesh.lookAt(rPoint.clone().add(rTangent));
      
      racer.speed = 0.0;
      racer.currentOffset = (tPos + 1.0) % 1.0;
      racer.sideOffset = side; // Set for BOTH player and AI to prevent launch snaps!
    });

    const currentSession = ["PRACTICE", "QUALIFYING", "RACE"][currentSessionIndex] || "PRACTICE";
    const formationCameraAllowed =
      currentSession === "RACE" &&
      (window.formationLapActive || isStartingSequence) &&
      playerKart &&
      playerKart.driveOutAutopilot !== true &&
      playerKart.pitAutopilot !== true &&
      playerKart.inPitLane !== true;

    if (window.randomLightsOutHold === undefined) {
      window.randomLightsOutHold = 1.0 + Math.random() * 1.5;
    }

    if (formationCameraAllowed) {
      // 🚦 Camera Focus on starting lights gantry (behind the player kart looking forward)
      const pPos = playerKart.mesh.position;
      const tangent = trackCurve.getTangentAt(playerKart.currentOffset);
      if (typeof window.claimCameraOwner === 'function') {
        window.claimCameraOwner("GRID_LIGHTS_FOCUS");
      }
      camera.position.copy(pPos.clone().add(tangent.clone().multiplyScalar(-6.5)));
      camera.position.y = 3.0;
      camera.lookAt(pPos.clone().add(tangent.clone().multiplyScalar(4.0)));
    }

    const bannerTitle = document.getElementById('lights-banner-title');

    if (startingSequenceTime < 1.0) {
      // Initial grid formation pause (bulbs dark)
      if (bannerTitle) bannerTitle.innerText = "GRID FORMATION";
      if (Math.random() < 0.05 && window.ApexAudio) {
        window.ApexAudio.updateEnginePitch(0.35 + Math.random() * 0.15);
      }
      for (let i = 0; i < 10; i++) {
        const el = document.getElementById(`light-red-${i}`);
        if (el) {
          el.style.background = "#1f2937";
          el.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.6)";
        }
      }
    } else if (startingSequenceTime < 6.0 + window.randomLightsOutHold) {
      if (bannerTitle) bannerTitle.innerText = "PREPARE TO LAUNCH";

      // Rev engines high during starting hold
      if (window.ApexAudio) {
        window.ApexAudio.updateEnginePitch(0.72 + Math.sin(clock.getElapsedTime() * 16.0) * 0.04);
      }

      // 5 Red Lights turn on column-by-column every 1.0s (1.0s, 2.0s, 3.0s, 4.0s, 5.0s)
      const elapsedLights = startingSequenceTime - 1.0; // 0.0 to 5.0
      const bulbCols = Math.min(4, Math.floor(elapsedLights));

      for (let c = 0; c < 5; c++) {
        const glow = c <= bulbCols;
        for (let b = 0; b < 2; b++) {
          const bulbId = c * 2 + b;
          const el = document.getElementById(`light-red-${bulbId}`);
          if (el) {
            if (glow) {
              el.style.background = "#ef4444";
              el.style.boxShadow = "0 0 22px #ef4444, inset 0 2px 4px rgba(255,255,255,0.75)";
            } else {
              el.style.background = "#1f2937";
              el.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.6)";
            }
          }
        }
        if (glow && c > lastLightSoundIndex) {
          if (window.ApexAudio) window.ApexAudio.playPickup(); // Audio beep chime per column
          lastLightSoundIndex = c;
        }
      }
    } else {
      // 🟢 ALL 5 LIGHTS OUT AT ONCE! Away we go!
      for (let i = 0; i < 10; i++) {
        const el = document.getElementById(`light-red-${i}`);
        if (el) {
          el.style.background = "#1f2937";
          el.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.6)";
        }
      }

      if (bannerTitle) {
        bannerTitle.innerHTML = '<span style="color:#22c55e; text-shadow:0 0 20px #22c55e; letter-spacing:3px;">LIGHTS OUT AND AWAY WE GO!</span>';
      }

      const overlay = document.getElementById('f1-starting-lights-overlay');
      if (overlay) {
        setTimeout(() => {
          overlay.classList.add('hidden');
          overlay.style.display = 'none';
        }, 1200);
      }

      if (window.ApexAudio) window.ApexAudio.playBoost();
      window.enterNormalRaceMode();
      startTime = clock.getElapsedTime(); // Start race clock
      speakEngineerRadio("Green light! Lights out and away we go!");
    }
  }

  window.enterNormalRaceMode = () => {
    console.log("[RACE] ENTERING NORMAL RACE MODE");
    window.raceState = "RACING";
    if (typeof console.table === 'function') {
      console.table({
        currentGear: currentGear,
        speed: playerKart ? playerKart.speed : 0,
        safetyCarActive: safetyCarActive,
        isStartingSequence: isStartingSequence,
        fuelLevelLaps: fuelLevelLaps,
        ersBatteryLevel: window.ersBatteryLevel
      });
    }

    isStartingSequence = false;
    safetyCarActive = false;
    currentGear = 1; // Auto shift to 1st gear so holding W works immediately!
    
    racers.forEach(r => {
      r.qualifyingState = "RACING";
      r.isTrackActive = true;
      r.collisionEnabled = true;
      r.gridReady = false;
    });
    
    if (playerKart) {
      playerKart.pitLimiterActive = false;
      playerKart.isOnTimedLap = true;
      playerKart.lapTimeElapsed = 0.0;
      playerKart.currentLapInvalid = false;
    }

    setTimeout(() => {
      if (!window.timingTowerManuallyToggled && isRaceActive) {
        window.timingTowerCollapsed = false;
        window.toggleTimingTower(true);
      }
    }, 5000);
  };


  // Helper to build stable flat-profile ribbon geometry along 3D spline
  function createCustomTrackGeometry(curve, width, segmentsCount = 200) {
    const vertices = [];
    const indices = [];
    const uvs = [];

    for (let i = 0; i <= segmentsCount; i++) {
      const t = i / segmentsCount;
      const p = curve.getPointAt(t % 1.0);
      const tang = curve.getTangentAt(t % 1.0);

      // Horizontal normal vector on X-Z plane to prevent any twisting/degeneration
      const norm = new THREE.Vector3(-tang.z, 0, tang.x);
      if (norm.lengthSq() > 0.000001) {
        norm.normalize();
      } else {
        norm.set(1, 0, 0);
      }

      const leftPt = p.clone().add(norm.clone().multiplyScalar(-width / 2));
      const rightPt = p.clone().add(norm.clone().multiplyScalar(width / 2));

      vertices.push(leftPt.x, leftPt.y, leftPt.z);
      vertices.push(rightPt.x, rightPt.y, rightPt.z);

      uvs.push(0, t);
      uvs.push(1, t);

      if (i < segmentsCount) {
        const row1 = i * 2;
        const row2 = (i + 1) * 2;
        indices.push(row1, row1 + 1, row2);
        indices.push(row1 + 1, row2 + 1, row2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }

  // ── Fast Track Curve Point Cache to eliminate lag ──
  let cachedTrackPoints = null;
  function getCachedTrackPoints() {
    if (!cachedTrackPoints && trackCurve) {
      cachedTrackPoints = [];
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        cachedTrackPoints.push(trackCurve.getPointAt(i / steps));
      }
    }
    return cachedTrackPoints;
  }

  // Helper: Fast distance check from position to track curve (Zero Lag!)
  function getDistanceToTrack(pos) {
    if (!pos || !trackCurve) return Infinity;
    const pts = getCachedTrackPoints();
    if (!pts || pts.length === 0) return Infinity;
    let minDistSq = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dSq = pos.distanceToSquared(pts[i]);
      if (dSq < minDistSq) minDistSq = dSq;
    }
    return Math.sqrt(minDistSq);
  }

  // Helper: Fast distance check from position to pit lane curve
  function getDistanceToPit(pos) {
    if (!pos || !pitCurve) return Infinity;
    let minDistSq = Infinity;
    for (let i = 0; i <= 40; i++) {
      const pt = pitCurve.getPointAt(i / 40);
      if (!pt) continue;
      const dSq = pos.distanceToSquared(pt);
      if (dSq < minDistSq) minDistSq = dSq;
    }
    return Math.sqrt(minDistSq);
  }

  // Helper to check if a track t offset is near the pit lane entry/exit gaps
  function isNearPitGap(t) {
    const pitEntryT = 0.975;
    const pitExitT = 0.055;
    const gapWindow = 0.022; // ~2.2% of track length
    const dEntry = Math.min(Math.abs(t - pitEntryT), Math.abs(t - pitEntryT + 1), Math.abs(t - pitEntryT - 1));
    const dExit = Math.min(Math.abs(t - pitExitT), Math.abs(t - pitExitT + 1), Math.abs(t - pitExitT - 1));
    return dEntry < gapWindow || dExit < gapWindow;
  }

  // Helper to generate a continuous smooth extruded ribbon for Armco rails
  function createArmcoGeometry(curve, sideOffset, heightOffset, railHeight) {
    const segments = 220;
    const vertices = [];
    const indices = [];
    const uvs = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = curve.getPointAt(t);
      const tang = curve.getTangentAt(t);
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      
      const basePt = p.clone().add(norm.multiplyScalar(sideOffset));
      basePt.y += heightOffset;

      const v1 = basePt.clone();
      const v2 = basePt.clone();
      v2.y += railHeight;

      vertices.push(v1.x, v1.y, v1.z);
      vertices.push(v2.x, v2.y, v2.z);

      const u = (sideOffset > 0) ? (1.0 - t) : t;
      uvs.push(u, 0);
      uvs.push(u, 1);
    }

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      // Skip indexing segments on right pit side (10.5) inside entire pit straight range (t >= 0.930 || t <= 0.090)
      if (sideOffset > 0 && (t >= 0.930 || t <= 0.090)) {
        continue;
      }
      const row1 = i * 2;
      const row2 = (i + 1) * 2;
      if (sideOffset > 0) {
        indices.push(row1, row2, row1 + 1);
        indices.push(row1 + 1, row2, row2 + 1);
      } else {
        indices.push(row1, row1 + 1, row2);
        indices.push(row1 + 1, row2 + 1, row2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }

  // Helper to generate a continuous flat stripe ribbon along the track (for white edge lines)
  function createTrackStripeGeometry(curve, offset, width, segmentsCount = 220) {
    const vertices = [];
    const indices = [];
    const uvs = [];

    for (let i = 0; i <= segmentsCount; i++) {
      const t = i / segmentsCount;
      const p = curve.getPointAt(t);
      const tang = curve.getTangentAt(t);
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

      const centerPt = p.clone().add(norm.clone().multiplyScalar(offset));
      centerPt.y += 0.012; // slightly elevated above asphalt

      const pL = centerPt.clone().add(norm.clone().multiplyScalar(-width / 2));
      const pR = centerPt.clone().add(norm.clone().multiplyScalar(width / 2));

      vertices.push(pL.x, pL.y, pL.z);
      vertices.push(pR.x, pR.y, pR.z);

      uvs.push(0, t);
      uvs.push(1, t);

      if (i < segmentsCount) {
        const row1 = i * 2;
        const row2 = (i + 1) * 2;
        indices.push(row1, row1 + 1, row2);
        indices.push(row1 + 1, row2 + 1, row2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function buildRoad() {
    // ═══════════════════════════════════════════════════════════════════
    // MULTI-LAYER AUTHENTIC F1 CIRCUIT ROAD & RUNOFF LAYERS:
    // 1. Green Astroturf / Painted Runoff Collar (width 21.0m)
    // 2. Alternating Red/White Ribbed Kerbs (width 18.2m)
    // 3. Main Dark Asphalt Track (width 16.0m)
    // 4. Solid Crisp White Track Edge Lines (left & right at ±7.88m)
    // ═══════════════════════════════════════════════════════════════════

    // 1. Green Astroturf / Painted Collar Runoff (width 21.0m, y = -0.04)
    const astroGeo = createCustomTrackGeometry(trackCurve, 21.2, 220);
    const astroMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.95 });
    const astroMesh = new THREE.Mesh(astroGeo, astroMat);
    astroMesh.position.y = -0.04;
    scene.add(astroMesh);

    // 2. Ribbed Kerbs (width 18.2m, y = -0.02)
    const kerbGeo = createCustomTrackGeometry(trackCurve, 18.2, 220);
    const kerbCanvas = document.createElement('canvas');
    kerbCanvas.width = 64; kerbCanvas.height = 64;
    const kctx = kerbCanvas.getContext('2d');
    kctx.fillStyle = '#ef4444'; kctx.fillRect(0, 0, 64, 64);
    kctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) kctx.fillRect(0, i * 16, 64, 8);
    const kerbTex = new THREE.CanvasTexture(kerbCanvas);
    kerbTex.wrapS = kerbTex.wrapT = THREE.RepeatWrapping;
    kerbTex.repeat.set(1, 75);
    const kerbMat = new THREE.MeshStandardMaterial({ map: kerbTex, roughness: 0.85 });
    const kerbMesh = new THREE.Mesh(kerbGeo, kerbMat);
    kerbMesh.position.y = -0.02;
    scene.add(kerbMesh);

    // 3. Main Asphalt Track (width 16.0m)
    const trackGeo = createCustomTrackGeometry(trackCurve, 16.0, 220);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.75, metalness: 0.1 });
    trackMesh = new THREE.Mesh(trackGeo, trackMat);
    scene.add(trackMesh);

    // 4. Solid White Track Edge Boundary Lines (Continuous crisp stripes along left & right)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const leftWhiteLine = new THREE.Mesh(createTrackStripeGeometry(trackCurve, -7.88, 0.22), lineMat);
    const rightWhiteLine = new THREE.Mesh(createTrackStripeGeometry(trackCurve, 7.88, 0.22), lineMat);
    scene.add(leftWhiteLine, rightWhiteLine);

    // 5. Dashed white center road lines (skip grid area to keep starting boxes clean)
    for (let i = 0; i < 150; i++) {
      const t = i / 150;
      if (t > 0.88 || t < 0.015) continue; // Keep starting grid clean and authentic
      const p = trackCurve.getPointAt(t);
      const tang = trackCurve.getTangentAt(t);
      const dashGeo = new THREE.PlaneGeometry(0.18, 1.8);
      const dash = new THREE.Mesh(dashGeo, lineMat);
      dash.position.copy(p);
      dash.position.y = 0.015;
      dash.lookAt(p.clone().add(tang));
      dash.rotateX(Math.PI / 2);
      scene.add(dash);
    }

    // 6. Official F1 Start / Finish Line (Checkered FIA Timing Stripe across full 15.6m track asphalt at t = 0.0)
    const sfcCanvas = document.createElement('canvas');
    sfcCanvas.width = 128; sfcCanvas.height = 32;
    const sctx = sfcCanvas.getContext('2d');
    sctx.fillStyle = '#ffffff'; sctx.fillRect(0, 0, 128, 32);
    sctx.fillStyle = '#090d16';
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) sctx.fillRect(c * 16, r * 16, 16, 16);
      }
    }
    const sfTex = new THREE.CanvasTexture(sfcCanvas);
    sfTex.wrapS = THREE.RepeatWrapping; sfTex.wrapT = THREE.ClampToEdgeWrapping;
    sfTex.repeat.set(10, 1);
    const sfMat = new THREE.MeshBasicMaterial({ map: sfTex, side: THREE.DoubleSide });
    const sfGeo = new THREE.PlaneGeometry(15.6, 1.4);
    const sfLine = new THREE.Mesh(sfGeo, sfMat);
    const sfP = trackCurve.getPointAt(0.0);
    const sfTang = trackCurve.getTangentAt(0.0);
    sfLine.position.copy(sfP);
    sfLine.position.y = 0.018;
    sfLine.lookAt(sfP.clone().add(sfTang));
    sfLine.rotateX(Math.PI / 2);
    sfLine.rotateZ(Math.PI / 2);
    scene.add(sfLine);

    // 7. Official 20 FIA Staggered Starting Grid Boxes (P1 - P20) across all race modes
    const gridWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const gridYellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });

    for (let slot = 0; slot < 20; slot++) {
      const slotOffset = (1.0 - 0.003 - (slot * 0.0045) + 1.0) % 1.0;
      const side = (slot % 2 === 0) ? -2.0 : 2.0;

      const p = trackCurve.getPointAt(slotOffset);
      const tang = trackCurve.getTangentAt(slotOffset).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      const center = p.clone().add(norm.clone().multiplyScalar(side));

      // Front stop bar (white line 2.2m wide x 0.24m thick)
      const frontCenter = center.clone().add(tang.clone().multiplyScalar(2.3));
      const stopBarGeo = new THREE.PlaneGeometry(2.2, 0.24);
      const stopBar = new THREE.Mesh(stopBarGeo, gridWhiteMat);
      stopBar.position.copy(frontCenter);
      stopBar.position.y = 0.018;
      stopBar.lookAt(frontCenter.clone().add(tang));
      stopBar.rotateX(Math.PI / 2);
      stopBar.rotateZ(Math.PI / 2);
      scene.add(stopBar);

      // Yellow center alignment notch on front stop line
      const yellowNotchGeo = new THREE.PlaneGeometry(0.12, 0.46);
      const yellowNotch = new THREE.Mesh(yellowNotchGeo, gridYellowMat);
      yellowNotch.position.copy(frontCenter);
      yellowNotch.position.y = 0.020;
      yellowNotch.lookAt(frontCenter.clone().add(tang));
      yellowNotch.rotateX(Math.PI / 2);
      scene.add(yellowNotch);

      // Left wheel guide stripe (4.6m length)
      const leftGuideGeo = new THREE.PlaneGeometry(0.14, 4.6);
      const leftGuide = new THREE.Mesh(leftGuideGeo, gridWhiteMat);
      const leftCenter = center.clone().add(norm.clone().multiplyScalar(-1.1));
      leftGuide.position.copy(leftCenter);
      leftGuide.position.y = 0.018;
      leftGuide.lookAt(leftCenter.clone().add(tang));
      leftGuide.rotateX(Math.PI / 2);
      scene.add(leftGuide);

      // Right wheel guide stripe (4.6m length)
      const rightGuideGeo = new THREE.PlaneGeometry(0.14, 4.6);
      const rightGuide = new THREE.Mesh(rightGuideGeo, gridWhiteMat);
      const rightCenter = center.clone().add(norm.clone().multiplyScalar(1.1));
      rightGuide.position.copy(rightCenter);
      rightGuide.position.y = 0.018;
      rightGuide.lookAt(rightCenter.clone().add(tang));
      rightGuide.rotateX(Math.PI / 2);
      scene.add(rightGuide);

      // Position Number Plate Painted on Track (P1 - P20)
      const numCanvas = document.createElement('canvas');
      numCanvas.width = 64; numCanvas.height = 64;
      const nctx = numCanvas.getContext('2d');
      nctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      nctx.fillRect(4, 4, 56, 56);
      nctx.strokeStyle = '#ffffff';
      nctx.lineWidth = 3;
      nctx.strokeRect(4, 4, 56, 56);
      nctx.fillStyle = '#ffffff';
      nctx.font = 'bold 30px sans-serif';
      nctx.textAlign = 'center';
      nctx.textBaseline = 'middle';
      nctx.fillText(String(slot + 1), 32, 34);

      const numTex = new THREE.CanvasTexture(numCanvas);
      const numMat = new THREE.MeshBasicMaterial({ map: numTex, transparent: true, side: THREE.DoubleSide });
      const numGeo = new THREE.PlaneGeometry(1.0, 1.0);
      const numMesh = new THREE.Mesh(numGeo, numMat);
      const numPos = center.clone().add(tang.clone().multiplyScalar(1.3));
      numMesh.position.copy(numPos);
      numMesh.position.y = 0.019;
      numMesh.lookAt(numPos.clone().add(tang));
      numMesh.rotateX(Math.PI / 2);
      numMesh.rotateZ(Math.PI);
      scene.add(numMesh);
    }
  }

  function buildPitLane() {
    // ═══════════════════════════════════════════════════════════════════
    //  REAL F1 PIT LANE WITH INTEGRATED SMOOTH ENTRY AND EXIT ROADS
    //  Layout (from track centreline outward):
    //    0–8m    → main road (16m wide, ±8m)
    //    8–14m   → grass/runoff strip
    //    14m     → pit wall (concrete barrier, 0.60m high)
    //    14–18m  → FAST LANE  (4m wide dark asphalt, center at 17m)
    //    18–26m  → WORKING LANE (8m wide darker asphalt, center at 23m)
    //    26m+    → Garage complex (PitComplexBuilder, garages centered at 34m)
    // ═══════════════════════════════════════════════════════════════════

    const T_ENTRY = 0.970;
    const T_EXIT  = 0.060;
    const samples = 12;
    const straightPts = [];
    for (let s = 0; s <= samples; s++) {
      const frac = s / samples;
      const t = (T_ENTRY + frac * (T_EXIT + 1.0 - T_ENTRY)) % 1.0;
      straightPts.push(t);
    }

    // Apply a smoothstep S-curve (cubic Hermite spline) to calculate the offsets
    // of control points at entry (s=0 to 4) and exit (s=8 to 12).
    // This replaces linear steps with a mathematically smooth transition.
    const offsets = [];
    for (let s = 0; s <= samples; s++) {
      if (s < 4) {
        // Smooth S-curve entry from 6.0m to 17.0m
        const x = s / 4;
        const smooth = x * x * (3 - 2 * x);
        offsets.push(6.0 + 11.0 * smooth);
      } else if (s > 8) {
        // Smooth S-curve exit from 17.0m to 6.0m
        const x = (12 - s) / 4;
        const smooth = x * x * (3 - 2 * x);
        offsets.push(6.0 + 11.0 * smooth);
      } else {
        // Parallel fast lane section
        offsets.push(17.0);
      }
    }

    const pitPoints = [];
    for (let s = 0; s <= samples; s++) {
      const t = straightPts[s];
      const pt   = trackCurve.getPointAt(t);
      const tang = trackCurve.getTangentAt(t).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      pitPoints.push(pt.clone().add(norm.multiplyScalar(offsets[s])));
    }
    pitCurve = new THREE.CatmullRomCurve3(pitPoints, false, "catmullrom", 0.5);

    // ── Road meshes ────────────────────────────────────────────────────
    
    // 1. Unified Fast Lane (8.0m wide): dark asphalt extruded along the entire pitCurve
    const fastLaneGeo = createCustomTrackGeometry(pitCurve, 8.0, 120);
    const fastLaneMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.88 });
    const fastLaneMesh = new THREE.Mesh(fastLaneGeo, fastLaneMat);
    fastLaneMesh.receiveShadow = true;
    scene.add(fastLaneMesh);

    // 2. White Boundary Lines along Fast Lane (left edge at -4.0m, right edge at +4.0m)
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    const fastLanePtsL = [];
    const fastLanePtsR = [];
    for (let j = 0; j <= 120; j++) {
      const t = j / 120;
      const pt = pitCurve.getPointAt(t);
      const tang = pitCurve.getTangentAt(t).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      fastLanePtsL.push(pt.clone().add(norm.clone().multiplyScalar(-4.0)));
      fastLanePtsR.push(pt.clone().add(norm.clone().multiplyScalar(4.0)));
    }
    const boundaryL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(fastLanePtsL), lineMat);
    const boundaryR = new THREE.Line(new THREE.BufferGeometry().setFromPoints(fastLanePtsR), lineMat);
    boundaryL.position.y = 0.035;
    boundaryR.position.y = 0.035;
    scene.add(boundaryL, boundaryR);

    // 3. Entry & Exit Painted Chevrons / Transition Blend Lines
    const entryChevronPts = [];
    for (let c = 0; c <= 20; c++) {
      const t = (c / 20) * 0.15;
      const pt = pitCurve.getPointAt(t);
      const tang = pitCurve.getTangentAt(t).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      entryChevronPts.push(pt.clone().add(norm.clone().multiplyScalar(-3.25)));
    }
    const entryBlend = new THREE.Line(new THREE.BufferGeometry().setFromPoints(entryChevronPts), new THREE.LineBasicMaterial({ color: 0xffffff }));
    entryBlend.position.y = 0.04;
    scene.add(entryBlend);

    // 4. Glowing Cyan Pit Lane Centerline Guidance Dashes (Matching Reference Image 1 & 3)
    const dashMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.85 });
    for (let d = 0.04; d <= 0.94; d += 0.02) {
      const dPt = pitCurve.getPointAt(d);
      const dTang = pitCurve.getTangentAt(d).normalize();
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 1.8), dashMat);
      dash.position.copy(dPt);
      dash.position.y = 0.04;
      dash.lookAt(dPt.clone().add(dTang));
      dash.rotateX(-Math.PI / 2);
      scene.add(dash);
    }

    // ── 3D Holographic Turn-In Target Gate (Matching Reference Image 1 & 2) ──
    window.buildTurnInHologram = function(teamIdx) {
      if (window.turnInHologram) {
        if (window.turnInHologram.arrows) {
          window.turnInHologram.arrows.forEach(a => scene.remove(a));
        }
        scene.remove(window.turnInHologram);
        window.turnInHologram = null;
      }
      if (!pitCurve) return;

      const totalBoxes = F1_TEAMS.length;
      const T_START = 0.26;
      const T_END = 0.74;
      const TEAM_STEP = (T_END - T_START) / totalBoxes;
      const pBoxT = T_START + (teamIdx + 0.5) * TEAM_STEP;
      const turnInT = Math.max(0.12, pBoxT - 0.026);

      const pt = pitCurve.getPointAt(turnInT);
      const tang = pitCurve.getTangentAt(turnInT).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      
      const gateGroup = new THREE.Group();
      gateGroup.turnInT = turnInT;
      gateGroup.pBoxT = pBoxT;
      gateGroup.rated = false;
      gateGroup.arrows = [];

      // Spans across the fast lane road (offset +1.5m to encompass fast lane and apron entrance)
      const gatePos = pt.clone().add(norm.clone().multiplyScalar(1.5));
      gateGroup.position.copy(gatePos);
      gateGroup.lookAt(gatePos.clone().add(tang));

      // 1. Semi-transparent Glowing Emerald Green Holographic Wall
      const wallMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.44,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const wallGeom = new THREE.PlaneGeometry(8.0, 3.4);
      const wallMesh = new THREE.Mesh(wallGeom, wallMat);
      wallMesh.position.set(0, 1.7, 0);
      gateGroup.add(wallMesh);
      gateGroup.wallMesh = wallMesh;

      // 2. Glowing Neon Green Laser Border Frame
      const frameMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.95 });
      const frameEdges = new THREE.EdgesGeometry(wallGeom);
      const frameLines = new THREE.LineSegments(frameEdges, new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 3 }));
      frameLines.position.set(0, 1.7, 0.01);
      gateGroup.add(frameLines);

      // Vertical laser pylons at edges
      [-4.0, 4.0].forEach(gx => {
        const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.5, 12), frameMat);
        pylon.position.set(gx, 1.7, 0);
        gateGroup.add(pylon);
        
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), frameMat);
        base.position.set(gx, 0.05, 0);
        gateGroup.add(base);
      });

      // Horizontal holographic scan-lines across wall
      for (let y = 0.5; y <= 3.0; y += 0.5) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-3.95, y, 0.01),
          new THREE.Vector3(3.95, y, 0.01)
        ]);
        const scanLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: 0.4 }));
        gateGroup.add(scanLine);
      }

      // 3. Center Target Reticle & (X) Crosshair
      const outerRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.65, 32), frameMat);
      outerRing.position.set(0, 1.7, 0.02);
      gateGroup.add(outerRing);

      const innerRing = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 24), frameMat);
      innerRing.position.set(0, 1.7, 0.02);
      gateGroup.add(innerRing);

      [-0.25, 0.25].forEach(ang => {
        const cross = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.06), frameMat);
        cross.position.set(0, 1.7, 0.03);
        cross.rotation.z = ang * Math.PI;
        gateGroup.add(cross);
      });

      // 4. Overhead Holographic Badge "PIT TURN-IN"
      try {
        const badgeCanvas = document.createElement('canvas');
        badgeCanvas.width = 512;
        badgeCanvas.height = 128;
        const bCtx = badgeCanvas.getContext('2d');
        bCtx.fillStyle = 'rgba(6, 78, 59, 0.9)';
        if (typeof bCtx.roundRect === 'function') {
          bCtx.roundRect(8, 8, 496, 112, 16);
          bCtx.fill();
          bCtx.strokeStyle = '#10b981';
          bCtx.lineWidth = 6;
          bCtx.roundRect(8, 8, 496, 112, 16);
          bCtx.stroke();
        } else {
          bCtx.fillRect(8, 8, 496, 112);
        }
        bCtx.fillStyle = '#ffffff';
        bCtx.font = 'bold 44px "Orbitron", sans-serif';
        bCtx.textAlign = 'center';
        bCtx.textBaseline = 'middle';
        bCtx.fillText('PIT TURN-IN', 256, 64);
        
        const badgeTex = new THREE.CanvasTexture(badgeCanvas);
        const badgeMat = new THREE.MeshBasicMaterial({ map: badgeTex, transparent: true, side: THREE.DoubleSide });
        const badgeMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), badgeMat);
        badgeMesh.position.set(0, 3.8, 0.02);
        gateGroup.add(badgeMesh);
      } catch (e) {
        console.warn("Badge canvas skipped:", e);
      }

      // 5. Road Chevron Arrows angled from green wall into the pit box on apron
      const boxPt = pitCurve.getPointAt(pBoxT);
      const boxTang = pitCurve.getTangentAt(pBoxT).normalize();
      const boxNorm = new THREE.Vector3(-boxTang.z, 0, boxTang.x).normalize();
      const boxPos = boxPt.clone().add(boxNorm.clone().multiplyScalar(9.5));
      const gateCenter = pt.clone().add(norm.clone().multiplyScalar(1.5));

      for (let ch = 1; ch <= 6; ch++) {
        const frac = ch / 7;
        const cPt = gateCenter.clone().lerp(boxPos, frac);
        cPt.y = 0.05;
        const arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.4), new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide
        }));
        arrow.position.copy(cPt);
        arrow.rotation.x = -Math.PI / 2;
        const lookDir = boxPos.clone().sub(gateCenter).normalize();
        arrow.rotation.z = Math.atan2(-lookDir.x, -lookDir.z);
        scene.add(arrow);
        gateGroup.arrows.push(arrow);
      }

      scene.add(gateGroup);
      window.turnInHologram = gateGroup;
    };

    // Pre-build holographic turn-in wall and spawn pit crew for active team
    try {
      if (typeof window.buildTurnInHologram === 'function') {
        window.buildTurnInHologram(selectedTeamIndex);
      }
      if (typeof spawnPitCrewBoxes === 'function') {
        spawnPitCrewBoxes();
      }
    } catch (e) {
      console.warn("Initial pit turn-in hologram spawn deferred:", e);
    }

    // ── PitComplexBuilder — garages + buildings
    const pitBuilder = new PitComplexBuilder(F1_TEAMS);
    pitBuilder.buildAlongCurve(pitCurve, scene);

    // ── Pit exit traffic light at t = 0.90
    const lightPt   = pitCurve.getPointAt(0.90);
    const lightTang = pitCurve.getTangentAt(0.90).normalize();
    const lightNorm = new THREE.Vector3(-lightTang.z, 0, lightTang.x).normalize();
    const poleMat   = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const lightPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.0, 8), poleMat);
    const polePos   = lightPt.clone().add(lightNorm.clone().multiplyScalar(2.2)); // sit on the right side of the pit exit lane (off track surface)
    lightPole.position.copy(polePos);
    lightPole.position.y += 2.0;
    scene.add(lightPole);

    const lightBox  = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x090d16 }));
    const lightBoxPos = polePos.clone();
    lightBoxPos.y += 4.1;
    lightBox.position.copy(lightBoxPos);
    lightBox.lookAt(lightBoxPos.clone().add(lightTang));
    scene.add(lightBox);

    const redLight   = new THREE.Mesh(new THREE.SphereGeometry(0.18), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redLight.position.copy(lightBoxPos).add(lightTang.clone().multiplyScalar(0.22)).add(new THREE.Vector3(0, 0.3, 0));
    const greenLight = new THREE.Mesh(new THREE.SphereGeometry(0.18), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    greenLight.position.copy(lightBoxPos).add(lightTang.clone().multiplyScalar(0.22)).add(new THREE.Vector3(0, -0.3, 0));
    scene.add(redLight, greenLight);
  }

  function buildRunoffAndBarriers() {
    // ═══════════════════════════════════════════════════════════════════
    // AUTHENTIC CONTINUOUS F1 ARMCO & CONCRETE BARRIERS WITH SPONSOR BOARDS
    // & METAL CATCH FENCING (NO DISCONNECTED VILLAGE PILLARS)
    // ═══════════════════════════════════════════════════════════════════

    // 1. High-Res Multi-Sponsor Canvas Texture
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 1536;
    bannerCanvas.height = 192;
    const bctx = bannerCanvas.getContext('2d');

    const sponsors = [
      { name: "ROLEX", bg: "#006039", fg: "#ffd700", sub: "GENEVE" },
      { name: "PIRELLI", bg: "#d9001b", fg: "#ffd700", sub: "P ZERO" },
      { name: "ARAMCO", bg: "#00a3e0", fg: "#ffffff", sub: "ENERGY" },
      { name: "QATAR", bg: "#5c0632", fg: "#ffffff", sub: "AIRWAYS" },
      { name: "DHL", bg: "#ffcc00", fg: "#d40511", sub: "EXPRESS" },
      { name: "SALESFORCE", bg: "#0176d3", fg: "#ffffff", sub: "CRM" }
    ];

    const segW = bannerCanvas.width / sponsors.length;
    sponsors.forEach((sp, i) => {
      const x = i * segW;
      bctx.fillStyle = sp.bg;
      bctx.fillRect(x, 0, segW, 192);

      // Top & bottom border strips
      bctx.fillStyle = "rgba(255,255,255,0.3)";
      bctx.fillRect(x, 0, segW, 10);
      bctx.fillRect(x, 182, segW, 10);

      // Sponsor Brand Name
      bctx.fillStyle = sp.fg;
      bctx.font = "900 48px 'Impact', 'Arial Black', sans-serif";
      bctx.textAlign = "center";
      bctx.textBaseline = "middle";
      bctx.fillText(sp.name, x + segW / 2, 85);

      // Subtitle
      bctx.font = "700 18px 'Arial', sans-serif";
      bctx.fillText(sp.sub, x + segW / 2, 138);
    });

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    bannerTex.wrapS = bannerTex.wrapT = THREE.RepeatWrapping;
    bannerTex.repeat.set(36, 1);

    const bannerMat = new THREE.MeshStandardMaterial({
      map: bannerTex,
      roughness: 0.65,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    // Concrete barrier top cap material
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.8
    });

    // 2. High-Tech Catch Fence Wire Mesh
    const fenceCanvas = document.createElement('canvas');
    fenceCanvas.width = 64;
    fenceCanvas.height = 64;
    const fctx = fenceCanvas.getContext('2d');
    fctx.fillStyle = "rgba(10,15,25,0.0)";
    fctx.fillRect(0, 0, 64, 64);
    fctx.strokeStyle = "rgba(220, 230, 245, 0.55)";
    fctx.lineWidth = 1.8;
    fctx.beginPath();
    fctx.moveTo(0, 0); fctx.lineTo(64, 64);
    fctx.moveTo(64, 0); fctx.lineTo(0, 64);
    fctx.stroke();

    const fenceTex = new THREE.CanvasTexture(fenceCanvas);
    fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping;
    fenceTex.repeat.set(100, 3);

    const fenceMat = new THREE.MeshBasicMaterial({
      map: fenceTex,
      transparent: true,
      opacity: 0.70,
      side: THREE.DoubleSide
    });

    // 3. Extrude Continuous Solid Barrier Walls (Left & Right)
    const leftBarrier = new THREE.Mesh(createArmcoGeometry(trackCurve, -10.5, 0.0, 0.95), bannerMat);
    const rightBarrier = new THREE.Mesh(createArmcoGeometry(trackCurve, 10.5, 0.0, 0.95), bannerMat);
    scene.add(leftBarrier, rightBarrier);

    // Top Chamfer Cap on Barriers
    const leftCap = new THREE.Mesh(createArmcoGeometry(trackCurve, -10.5, 0.92, 0.08), capMat);
    const rightCap = new THREE.Mesh(createArmcoGeometry(trackCurve, 10.5, 0.92, 0.08), capMat);
    scene.add(leftCap, rightCap);

    // Continuous Safety Catch Fencing (above the concrete barrier, y = 0.95 to 2.35)
    const leftFence = new THREE.Mesh(createArmcoGeometry(trackCurve, -10.52, 0.95, 1.4), fenceMat);
    const rightFence = new THREE.Mesh(createArmcoGeometry(trackCurve, 10.52, 0.95, 1.4), fenceMat);
    scene.add(leftFence, rightFence);

    // Metal Catch Fence Support Stanchions (slender angled poles every 12 meters)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
    const stanchionCount = 70;
    for (let i = 0; i < stanchionCount; i++) {
      const t = i / stanchionCount;
      const p = trackCurve.getPointAt(t);
      const tang = trackCurve.getTangentAt(t);
      const normal = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

      [-1, 1].forEach(side => {
        if (side === 1 && (t >= 0.965 || t <= 0.065)) return; // skip pit lane
        const polePos = p.clone().add(normal.clone().multiplyScalar(side * 10.55));
        if (getDistanceToTrack(polePos) < 9.2) return;

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8), poleMat);
        pole.position.copy(polePos);
        pole.position.y += 1.2;
        pole.rotation.z = side * 0.08; // angled slightly inward like real F1 catch fence
        scene.add(pole);
      });
    }
  }

  function buildScenery() {
    // ═══════════════════════════════════════════════════════════════════
    // ZERO-LAG SCENERY: FAST PRE-CALCULATED GROVES & ROLLING TERRAIN
    // ═══════════════════════════════════════════════════════════════════

    // 1. Vibrant grass terrain texture
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 128;
    groundCanvas.height = 128;
    const gctx = groundCanvas.getContext('2d');
    gctx.fillStyle = '#1e7b34'; // rich racetrack emerald green
    gctx.fillRect(0, 0, 128, 128);
    gctx.fillStyle = '#166534';
    gctx.fillRect(0, 0, 64, 64);
    gctx.fillRect(64, 64, 64, 64);
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(80, 80);

    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.10;
    scene.add(ground);

    // 2. Fast 3D Trees planted at safe spline offsets outside the barriers (Zero lag distance checks!)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    const foliageMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const foliageMat2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85 });

    const treeSteps = 32;
    for (let i = 0; i < treeSteps; i++) {
      const t = (i / treeSteps);
      const pt = trackCurve.getPointAt(t);
      const tang = trackCurve.getTangentAt(t).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

      // Place trees on both outer sides safely 26m away from track center
      [-1, 1].forEach((side) => {
        if (side === 1 && (t >= 0.95 || t <= 0.08)) return; // skip pit building side
        const treePos = pt.clone().add(norm.clone().multiplyScalar(side * (24.0 + (i % 3) * 6.0)));

        const treeGroup = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.5, 6), trunkMat);
        trunk.position.y = 1.75;
        treeGroup.add(trunk);

        const fMat = i % 2 === 0 ? foliageMat1 : foliageMat2;
        const c1 = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.6, 6), fMat);
        c1.position.y = 4.2;
        treeGroup.add(c1);

        const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.8, 6), fMat);
        c2.position.y = 6.2;
        treeGroup.add(c2);

        treeGroup.position.copy(treePos);
        scene.add(treeGroup);
      });
    }

    // 🌊 OCEAN PROMENADE WATER (Sunset Coast)
    if (activeTrack === 0) {
      const waterGeo = new THREE.PlaneGeometry(1200, 500);
      const waterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.85 });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, -0.3, -240);
      scene.add(water);
    }
  }

  function buildGrandstandsAndSponsors() {
    // ═══════════════════════════════════════════════════════════════════
    // AUTHENTIC F1 STADIUM COMPLEX:
    // 1. Spectator Crowd Tiers ("pepe" / fans cheering in team merchandise)
    // 2. Covered Cantilever Roof Grandstands along Main Straight & Turn 1
    // 3. Portimao VIP Architectural Glass Tower (matching User Reference 4)
    // 4. Overhead EA Sports & F1 Sponsorship Gantries
    // 5. Brake Distance Boards (150m, 100m, 50m before corners)
    // ═══════════════════════════════════════════════════════════════════

    // 1. High-Res Spectator Crowd Canvas Texture (Thousands of fans)
    const crowdCanvas = document.createElement('canvas');
    crowdCanvas.width = 512;
    crowdCanvas.height = 128;
    const cctx = crowdCanvas.getContext('2d');
    cctx.fillStyle = '#1e293b';
    cctx.fillRect(0, 0, 512, 128);
    const fanColors = ['#ef4444', '#00d7b6', '#0090ff', '#ff8000', '#22c55e', '#facc15', '#ffffff'];
    for (let row = 0; row < 6; row++) {
      const y = row * 21 + 4;
      for (let col = 0; col < 64; col++) {
        const x = col * 8;
        cctx.fillStyle = fanColors[(row * 13 + col * 7) % fanColors.length];
        cctx.fillRect(x + 1, y, 6, 8); // shirt
        cctx.fillStyle = '#fbcfe8';
        cctx.fillRect(x + 2, y - 4, 4, 4); // face
      }
    }
    const crowdTex = new THREE.CanvasTexture(crowdCanvas);
    crowdTex.wrapS = crowdTex.wrapT = THREE.RepeatWrapping;
    crowdTex.repeat.set(6, 1);
    const crowdMat = new THREE.MeshBasicMaterial({ map: crowdTex });

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });

    // Helper: Build a Tiered Stadium Grandstand with Spectators facing towards the track
    const createGrandstand = (length = 40, tiers = 5) => {
      const standGroup = new THREE.Group();
      for (let t = 0; t < tiers; t++) {
        const stepH = 1.2;
        const stepD = 2.0;
        // Concrete riser stepping up and back away from track
        const riser = new THREE.Mesh(new THREE.BoxGeometry(length, stepH, stepD), concreteMat);
        riser.position.set(0, stepH / 2 + t * stepH, -t * stepD);
        standGroup.add(riser);

        // Seated spectator row facing track (+Z)
        const crowdMesh = new THREE.Mesh(new THREE.PlaneGeometry(length - 0.4, stepH * 0.95), crowdMat);
        crowdMesh.position.set(0, stepH + t * stepH + 0.1, -t * stepD + stepD / 2 - 0.05);
        standGroup.add(crowdMesh);
      }

      // Canopy Roof sloping forward over seating tiers
      const roofD = tiers * 2.0 + 3.0;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(length, 0.4, roofD), canopyMat);
      roof.position.set(0, tiers * 1.2 + 2.5, -(tiers * 2.0) / 2 + 1.0);
      roof.rotation.x = -0.06; // slight forward pitch
      standGroup.add(roof);

      // Support pillars at the back of the grandstand
      [-length / 2 + 2, length / 2 - 2].forEach(x => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, tiers * 1.2 + 2.5, 0.6), trussMat);
        pillar.position.set(x, (tiers * 1.2 + 2.5) / 2, -(tiers * 2.0));
        standGroup.add(pillar);
      });

      return standGroup;
    };

    // A. Main Pit Straight Grandstand (opposite the pit lane)
    const tMain = 0.01;
    const pMain = trackCurve.getPointAt(tMain);
    const tngMain = trackCurve.getTangentAt(tMain).normalize();
    const nrmMain = new THREE.Vector3(-tngMain.z, 0, tngMain.x).normalize();
    const mainStand = createGrandstand(70, 6);
    mainStand.position.copy(pMain).add(nrmMain.clone().multiplyScalar(-18.5));
    mainStand.lookAt(mainStand.position.clone().add(nrmMain));
    scene.add(mainStand);

    // B. Turn 1 Stadium Grandstand (overlooking the first braking corner)
    const tT1 = 0.14;
    const pT1 = trackCurve.getPointAt(tT1);
    const tngT1 = trackCurve.getTangentAt(tT1).normalize();
    const nrmT1 = new THREE.Vector3(-tngT1.z, 0, tngT1.x).normalize();
    const t1Stand = createGrandstand(50, 5);
    t1Stand.position.copy(pT1).add(nrmT1.clone().multiplyScalar(-19.0));
    t1Stand.lookAt(t1Stand.position.clone().add(nrmT1));
    scene.add(t1Stand);

    // 2. Portimao VIP Circular Architectural Control Tower (User Reference Image 4)
    const towerGroup = new THREE.Group();
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.75 });
    const concreteWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });

    // 4 cylindrical tiers of VIP observation suites
    for (let fl = 0; fl < 4; fl++) {
      const flH = 3.6;
      const flR = 8.5 - fl * 0.6;
      // Glass cylinder
      const glassCyl = new THREE.Mesh(new THREE.CylinderGeometry(flR, flR, flH - 0.4, 24), glassMat);
      glassCyl.position.y = flH / 2 + fl * flH;
      towerGroup.add(glassCyl);

      // Balcony floor ring
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(flR + 0.8, flR + 0.8, 0.4, 24), concreteWhite);
      ring.position.y = fl * flH;
      towerGroup.add(ring);
    }
    // Rooftop observation terrace & communications mast
    const terrace = new THREE.Mesh(new THREE.CylinderGeometry(6.0, 6.0, 0.5, 24), concreteWhite);
    terrace.position.y = 4 * 3.6;
    towerGroup.add(terrace);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 8.0, 8), trussMat);
    mast.position.y = 4 * 3.6 + 4.0;
    towerGroup.add(mast);

    // Position VIP Tower near main straight / pit entrance
    const tTower = 0.93;
    const pTower = trackCurve.getPointAt(tTower);
    const nrmTower = new THREE.Vector3(-trackCurve.getTangentAt(tTower).z, 0, trackCurve.getTangentAt(tTower).x).normalize();
    towerGroup.position.copy(pTower).add(nrmTower.clone().multiplyScalar(-24.0));
    scene.add(towerGroup);

    // 3. Brake Distance Marker Boards (150m, 100m, 50m before braking zones)
    // Canvas texture for boards
    const createBrakeBoard = (meters) => {
      const bCanvas = document.createElement('canvas');
      bCanvas.width = 128; bCanvas.height = 128;
      const bctx = bCanvas.getContext('2d');
      bctx.fillStyle = '#ffffff';
      bctx.fillRect(0, 0, 128, 128);
      bctx.strokeStyle = '#000000';
      bctx.lineWidth = 10;
      bctx.strokeRect(5, 5, 118, 118);
      bctx.fillStyle = '#000000';
      bctx.font = '900 68px Arial Black, sans-serif';
      bctx.textAlign = 'center';
      bctx.textBaseline = 'middle';
      bctx.fillText(String(meters), 64, 66);
      const bTex = new THREE.CanvasTexture(bCanvas);
      const bMat = new THREE.MeshBasicMaterial({ map: bTex, side: THREE.FrontSide });
      const bMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), bMat);
      bMesh.position.y = 0.85;
      const backPlate = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.65, 0.05), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      backPlate.position.set(0, 0.85, -0.03);
      const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 8), concreteMat);
      bPost.position.y = 0.85;
      const grp = new THREE.Group();
      grp.add(bMesh, backPlate, bPost);
      return grp;
    };

    // Place before Turn 1 (t = 0.075, 0.085, 0.095) and Turn 4 (t = 0.380, 0.390, 0.400)
    [
      { t: 0.075, m: 150 },
      { t: 0.085, m: 100 },
      { t: 0.095, m: 50 },
      { t: 0.380, m: 150 },
      { t: 0.390, m: 100 },
      { t: 0.400, m: 50 }
    ].forEach(item => {
      const pt = trackCurve.getPointAt(item.t);
      const tng = trackCurve.getTangentAt(item.t).normalize();
      const nrm = new THREE.Vector3(-tng.z, 0, tng.x).normalize();
      const board = createBrakeBoard(item.m);
      board.position.copy(pt).add(nrm.clone().multiplyScalar(-9.5)); // sits on runoff edge
      board.lookAt(board.position.clone().sub(tng)); // Faces oncoming cars!
      scene.add(board);
    });

    // 4. Overhead EA Sports / F1 Sponsorship Gantries (Matching User Reference 3)
    const createGantry = (tLoc, titleText) => {
      const gPos = trackCurve.getPointAt(tLoc);
      const gTang = trackCurve.getTangentAt(tLoc).normalize();
      const gGroup = new THREE.Group();
      gGroup.position.copy(gPos);
      gGroup.lookAt(gPos.clone().add(gTang));

      const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 12, 0.8), trussMat);
      p1.position.set(-10, 6, 0);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 12, 0.8), trussMat);
      p2.position.set(10, 6, 0);
      gGroup.add(p1, p2);

      const truss = new THREE.Mesh(new THREE.BoxGeometry(20.8, 1.6, 1.2), trussMat);
      truss.position.set(0, 11.2, 0);
      gGroup.add(truss);

      const gCanvas = document.createElement('canvas');
      gCanvas.width = 1024; gCanvas.height = 128;
      const gx = gCanvas.getContext('2d');
      gx.fillStyle = '#0f172a';
      gx.fillRect(0, 0, 1024, 128);
      gx.fillStyle = '#e10600';
      gx.fillRect(0, 0, 1024, 8);
      gx.fillRect(0, 120, 1024, 8);
      gx.fillStyle = '#ffffff';
      gx.font = "900 48px 'Impact', sans-serif";
      gx.textAlign = 'center';
      gx.textBaseline = 'middle';
      gx.fillText(titleText, 512, 64);

      const gTex = new THREE.CanvasTexture(gCanvas);
      const gLabel = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.2), new THREE.MeshBasicMaterial({ map: gTex, side: THREE.DoubleSide }));
      gLabel.position.set(0, 11.2, 0.65);
      gGroup.add(gLabel);
      return gGroup;
    };

    // Start/Finish Gantry & Mid-Lap Gantry
    scene.add(createGantry(0.0, "FORMULA 1 GRAND PRIX // 2026"));
    scene.add(createGantry(0.50, "EA SPORTS F1 // PIRELLI"));
  }

  function spawnPlayerPitBoxVisual() {
    if (!pitCurve || !scene) return;

    if (window.playerPitBoxVisualMesh) {
      scene.remove(window.playerPitBoxVisualMesh);
      window.playerPitBoxVisualMesh = null;
    }

    const stopT = 0.30 + (selectedTeamIndex / Math.max(1, F1_TEAMS.length - 1)) * 0.40;
    const pos = pitCurve.getPointAt(stopT);
    const tang = pitCurve.getTangentAt(stopT).normalize();
    const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

    // Snapped pit box position (+6.5m offset on working apron)
    const boxPos = pos.clone().add(norm.multiplyScalar(6.5));

    // Sleek flat pit box ground highlight (clean glowing outline, flush on concrete)
    const geo = new THREE.PlaneGeometry(4.8, 6.2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(boxPos);
    mesh.position.y = 0.038;
    mesh.lookAt(boxPos.clone().add(new THREE.Vector3(0, 1, 0)));

    scene.add(mesh);
    window.playerPitBoxVisualMesh = mesh;
  }
  window.f1SetupGame = setupGame;


// ═══ game-02-track-build.js ═══
  function buildTrack() {
    const points = TRACK_POINTS[activeTrack];
    trackCurve = new THREE.CatmullRomCurve3(points, true, "centripetal");

    // 🌌 Gradient Sky Dome
    const skyGeo = new THREE.SphereGeometry(500, 32, 32);
    
    let skyTopColor = 0xff9a5a;
    let skyBottomColor = 0xffe8c9;
    if (activeTrack === 1) {
      skyTopColor = 0x0284c7;
      skyBottomColor = 0xe0f2fe;
    }

    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(skyTopColor) },
        bottomColor: { value: new THREE.Color(skyBottomColor) }
      },
      vertexShader: `varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `varying vec3 vWorldPosition;
        uniform vec3 topColor; uniform vec3 bottomColor;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
        }`,
      side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    buildRoad();
    buildPitLane();
    buildRunoffAndBarriers();
    buildScenery();
    buildGrandstandsAndSponsors();

    // Validate placement of all decorative scene objects to ensure none are on the racing surface
    function validateTrackObjectPlacement(object) {
      if (!object) return;
      const worldPosition = new THREE.Vector3();
      object.getWorldPosition(worldPosition);

      if (typeof window.findNearestTrackProjection !== 'function') return;
      const projection = window.findNearestTrackProjection(worldPosition);
      if (!projection) return;

      // Track half width is 8.0 meters
      if (Math.abs(projection.lateralOffset) < 8.0) {
        console.error(
          "[OBJECT ON RACING SURFACE]",
          {
            name: object.name,
            uuid: object.uuid,
            offset: projection.lateralOffset,
            position: worldPosition
          }
        );
        // Remove it from the scene so it doesn't block the road!
        scene.remove(object);
      }
    }

    // Traverse the scene and validate decorative placements
    scene.traverse(object => {
      if (!object) return;
      if (
        object.userData?.isRoad ||
        object.userData?.isTrackSurface ||
        object.name === "skyDome" ||
        object.name === "ground" ||
        object.name === "pitGuideLine" ||
        object.userData?.colliderType === "CAR"
      ) {
        return;
      }
      
      const name = (object.name || "").toLowerCase();
      const parentName = (object.parent?.name || "").toLowerCase();
      if (
        name.includes("bush") ||
        name.includes("tree") ||
        name.includes("chalet") ||
        name.includes("grandstand") ||
        name.includes("billboard") ||
        name.includes("post") ||
        parentName.includes("scenery")
      ) {
        validateTrackObjectPlacement(object);
      }
    });
  }

  // Old buildTrack removed
  function createRacers() {
    racers = [];

    const activeTeam = F1_TEAMS[selectedTeamIndex];
    const playerDriver = activeTeam.drivers[activeDriver];

    let playerName = playerDriver.name;
    if (window.matchMode === 'PVP') {
      try {
        const profile = (window.parent && window.parent.profile) || window.profile;
        if (profile && profile.username) {
          playerName = profile.username;
        }
      } catch(e) {}
    }

    // Player Kart
    const pKartSetup = createProceduralKart(parseInt(activeTeam.color.replace('#', ''), 16), true);
    playerKart = {
      isPlayer: true,
      name: playerName,
      avatar: playerDriver.avatar,
      bonus: activeDriver === 0 ? "acceleration" : "topSpeed",
      mesh: pKartSetup.mesh,
      wheels: pKartSetup.wheels,
      currentOffset: 1.0 - 0.003,
      sideOffset: -2.0, // Left side P1 grid box position
      speed: 0.0,
      targetSpeed: 0.0,
      rotationY: 0.0,
      driftAngle: 0.0,
      driftCharge: 0.0,
      isDrifting: false,
      boostTime: 0.0,
      shieldActive: false,
      shieldMesh: null,
      spinoutTime: 0.0,
      posRank: 1,
      teamIndex: selectedTeamIndex,
      completedLaps: 0,
      previousTrackProgress: 1.0 - 0.003,
      isPitting: false,
      pitProgress: 0.0,
      finished: false,
      finishPos: null,
      finishTime: null,
      ersEnergy: ERS_MAX_ENERGY,
      inPitLane: false,
      pitZone: "MAIN_TRACK",
      pitLimiterActive: false,
      currentPath: "TRACK",
      isTrackActive: true,    // physically present on track
      collisionEnabled: true  // part of collision simulation
    };
    racers.push(playerKart);
    if (typeof window.registerCollider === 'function') {
      window.registerCollider(playerKart.mesh, "CAR");
    }

    // ─── Helper: build AI profile from team/driver stats ───
    function buildAIProfile(team, driver) {
      const ts = team.stats;   // { speed, aero, tyre, power }
      const ds = driver.stats; // { accel, drift, speed }
      // Normalize 0-100 to 0-1
      const pace        = ds.speed  / 100;
      const brakingSkill= ds.accel  / 100;
      const corneringSkill = ds.drift / 100;
      const consistency = 0.70 + (ds.speed / 100) * 0.25;
      const aggression  = 0.55 + (ts.speed  / 100) * 0.35;

      // Deterministic personality archetype based on driver name hash
      const hash = (driver.name || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const mod = hash % 4;
      let driverAI = {};
      if (mod === 0) {
        // AGGRESSIVE ATTACKER
        driverAI = {
          aggression: 0.94, awareness: 0.80, reaction: 0.88, bravery: 0.95,
          consistency: 0.76, racecraft: 0.87, patience: 0.25, defence: 0.84, mistakeRate: 0.07,
          archetype: "AGGRESSIVE ATTACKER"
        };
      } else if (mod === 1) {
        // CALCULATED CHAMPION
        driverAI = {
          aggression: 0.78, awareness: 0.96, reaction: 0.94, bravery: 0.84,
          consistency: 0.97, racecraft: 0.98, patience: 0.82, defence: 0.94, mistakeRate: 0.015,
          archetype: "CALCULATED CHAMPION"
        };
      } else if (mod === 2) {
        // DEFENSIVE VETERAN
        driverAI = {
          aggression: 0.59, awareness: 0.94, reaction: 0.89, bravery: 0.71,
          consistency: 0.92, racecraft: 0.91, patience: 0.88, defence: 0.97, mistakeRate: 0.025,
          archetype: "DEFENSIVE VETERAN"
        };
      } else {
        // ROOKIE
        driverAI = {
          aggression: 0.72, awareness: 0.68, reaction: 0.70, bravery: 0.83,
          consistency: 0.66, racecraft: 0.63, patience: 0.47, defence: 0.59, mistakeRate: 0.10,
          archetype: "ROOKIE"
        };
      }

      return { pace, brakingSkill, corneringSkill, consistency, aggression, driverAI };
    }
    function buildCarPerformance(team) {
      const ts = team.stats;
      return { topSpeed: ts.speed, cornering: ts.aero, downforce: ts.aero };
    }

    // Stagger teammate in P2 grid slot
    const mateDriver = activeTeam.drivers[activeDriver === 0 ? 1 : 0];
    const mateKartSetup = createProceduralKart(parseInt(activeTeam.color.replace('#', ''), 16), false);

    let opponentName = mateDriver.name;
    let opponentAvatar = mateDriver.avatar;
    if (window.matchMode === 'PVP') {
      opponentName = (window.cricketPvPRole === 'host') ? 'Opponent' : 'Host';
      try {
        const activeMatchStr = sessionStorage.getItem('ps_active_match');
        if (activeMatchStr) {
          const matchData = JSON.parse(activeMatchStr);
          if (window.cricketPvPRole === 'host') {
            opponentName = (matchData.guest && matchData.guest.username) || 'Guest';
          } else {
            opponentName = (matchData.host && matchData.host.username) || 'Host';
          }
        }
      } catch(e) {}
    }

    const teammateRacer = {
      isPlayer: false,
      name: opponentName,
      avatar: opponentAvatar,
      bonus: "handling",
      mesh: mateKartSetup.mesh,
      wheels: mateKartSetup.wheels,
      currentOffset: 1.0 - 0.003 - (1 * 0.0045), // P2 Grid slot
      sideOffset: 2.0, // Right side P2 grid position
      speed: 0.0,
      boostTime: 0.0,
      shieldActive: false,
      spinoutTime: 0.0,
      posRank: 2,
      teamIndex: selectedTeamIndex,
      completedLaps: 0,
      previousTrackProgress: 1.0 - 0.003 - (1 * 0.0045),
      isPitting: false,
      pitProgress: 0.0,
      finished: false,
      finishPos: null,
      finishTime: null,
      ersEnergy: ERS_MAX_ENERGY,
      inPitLane: false,
      pitZone: "MAIN_TRACK",
      pitLimiterActive: false,
      currentPath: "TRACK",
      isTrackActive: true,
      collisionEnabled: true
    };
    teammateRacer.aiProfile      = buildAIProfile(activeTeam, mateDriver);
    teammateRacer.carPerformance = buildCarPerformance(activeTeam);
    racers.push(teammateRacer);
    if (typeof window.registerCollider === 'function') {
      window.registerCollider(teammateRacer.mesh, "CAR");
    }

    // Populate remaining 14 slots from other teams to complete a 16-car F1 grid matrix
    const isOnlineQuickMatch = (window.matchMode === 'PVP' && sessionStorage.getItem('ps_pvp_submode') === 'quick_match');
    if (!isOnlineQuickMatch) {
      let gridSlot = 2; // Slots 0=player, 1=teammate
      F1_TEAMS.forEach((team, tIdx) => {
        if (tIdx === selectedTeamIndex) return; // skip player team
        
        // Spawn both drivers of each other team
        team.drivers.forEach((driver, dIdx) => {
          if (gridSlot >= 16) return;
          
          const aiKartSetup = createProceduralKart(parseInt(team.color.replace('#', ''), 16), false);
          const sideOffset = gridSlot % 2 === 0 ? -2.0 : 2.0;
          const currentOffset = 1.0 - 0.003 - (gridSlot * 0.0045);

          const aiRacer = {
            isPlayer: false,
            name: driver.name,
            avatar: driver.avatar,
            bonus: "handling",
            mesh: aiKartSetup.mesh,
            wheels: aiKartSetup.wheels,
            currentOffset: currentOffset,
            sideOffset: sideOffset,
            speed: 0.0,
            boostTime: 0.0,
            shieldActive: false,
            spinoutTime: 0.0,
            posRank: gridSlot + 1,
            teamIndex: tIdx,
            completedLaps: 0,
            previousTrackProgress: currentOffset,
            isPitting: false,
            pitProgress: 0.0,
            finished: false,
            finishPos: null,
            finishTime: null,
            ersEnergy: ERS_MAX_ENERGY,
            inPitLane: false,
            pitZone: "MAIN_TRACK",
            pitLimiterActive: false,
            currentPath: "TRACK",
            isTrackActive: true,
            collisionEnabled: true
          };
          aiRacer.aiProfile      = buildAIProfile(team, driver);
          aiRacer.carPerformance = buildCarPerformance(team);
          racers.push(aiRacer);
          if (typeof window.registerCollider === 'function') {
            window.registerCollider(aiRacer.mesh, "CAR");
          }
          gridSlot++;
        });
      });
    }

    // If we are in the main GP race (session index 2) and startingGrid exists,
    // re-sort racers to match window.startingGrid.
    if (currentSessionIndex === 2 && window.startingGrid && window.startingGrid.length > 0) {
      const nameToRacer = {};
      racers.forEach(r => {
        nameToRacer[r.name] = r;
      });
      const sortedRacers = [];
      window.startingGrid.forEach(gridDriver => {
        const racer = nameToRacer[gridDriver.name];
        if (racer) sortedRacers.push(racer);
      });
      // Fallback
      racers.forEach(r => {
        if (!sortedRacers.includes(r)) sortedRacers.push(r);
      });
      racers = sortedRacers;
    }

    // Assign grid starting positions, staggered grid offsets and sideOffsets based on sorted order
    racers.forEach((r, index) => {
      let gridIndex = index;
      if (window.matchMode === 'PVP' && window.cricketPvPRole === 'guest') {
        if (index === 0) gridIndex = 1;
        else if (index === 1) gridIndex = 0;
      }

      const sideOffset = gridIndex % 2 === 0 ? -2.0 : 2.0;
      const currentOffset = (1.0 - 0.003 - (gridIndex * 0.0045) + 1.0) % 1.0;

      r.currentOffset = currentOffset;
      r.previousTrackProgress = currentOffset;
      r.sideOffset = sideOffset;
      r.posRank = gridIndex + 1;
      r.gridStartPos = gridIndex + 1;
      r.lastPosRank = gridIndex + 1;
      r.completedLaps = 0;
      r.finished = false;
      r.speed = 0.0;

      r.isOnTimedLap = false;
      r.lapTimeElapsed = 0.0;
    });
  }

  function createProceduralKart(driverColor, isPlayer) {
    const mesh = createProceduralKartMesh(driverColor);
    
    if (isPlayer) {
      const arrowGeo = new THREE.ConeGeometry(0.3, 0.6, 4);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.set(0, 2.3, -0.2);
      arrow.rotation.x = Math.PI;
      arrow.visible = false; // Hidden so it never obstructs first-person, onboard, or garage views
      mesh.add(arrow);
      mesh.playerArrow = arrow;
    }

    scene.add(mesh);
    return {
      mesh: mesh,
      wheels: [],
      color: driverColor
    };
  }

  function createProceduralKartMesh(driverColor) {
    const car = new THREE.Group();
    car.name = "kart";

    const paint = new THREE.MeshStandardMaterial({
      color: driverColor,
      roughness: 0.30,
      metalness: 0.35
    });

    const carbon = new THREE.MeshStandardMaterial({
      color: 0x151515,
      roughness: 0.75,
      metalness: 0.3
    });

    const darkIntake = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.95
    });

    const titanium = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.85,
      roughness: 0.25
    });

    // ==========================
    // 1. Aerodynamic Floor & Chassis
    // ==========================
    // Underfloor / Tea tray with edge vortex generators
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.08, 4.4),
      carbon
    );
    floor.position.set(0, 0.12, 0.1);
    floor.castShadow = true;
    car.add(floor);

    // Main monocoque chassis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.38, 2.2),
      paint
    );
    chassis.position.set(0, 0.32, 0.4);
    chassis.castShadow = true;
    car.add(chassis);

    // ==========================
    // 2. Tapered Aerodynamic Nosecone
    // ==========================
    // Main nose section sloping down towards front wing
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.50, 0.22, 2.1),
      paint
    );
    nose.position.set(0, 0.32, 2.35);
    nose.rotation.x = 0.05; // slight downward aerodynamic rake
    nose.castShadow = true;
    nose.name = "nose";
    car.add(nose);
    car.nose = nose;

    // Nose tip crash structure
    const noseTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.55),
      paint
    );
    noseTip.position.set(0, 0.21, 3.5);
    noseTip.castShadow = true;
    car.add(noseTip);

    // Nose pitot tube / antenna
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.22, 8),
      titanium
    );
    antenna.position.set(0, 0.48, 2.1);
    car.add(antenna);

    // ==========================
    // 3. F1 Front & Rear Suspension (Precision Multi-Link Carbon Wishbones)
    // ==========================
    // Helper to build true connecting suspension rods spanning between exact 3D coordinates
    const createSuspensionRod = (p1, p2, radius, mat) => {
      const v1 = new THREE.Vector3(...p1);
      const v2 = new THREE.Vector3(...p2);
      const len = v1.distanceTo(v2);
      const mid = v1.clone().add(v2).multiplyScalar(0.5);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8), mat);
      rod.position.copy(mid);
      const dir = v2.clone().sub(v1).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      rod.quaternion.setFromUnitVectors(up, dir);
      rod.castShadow = true;
      return rod;
    };

    [-1, 1].forEach(side => {
      // ── FRONT SUSPENSION (Connecting nose to front upright at x = ±1.05, y = 0.36, z = 1.60) ──
      // Front Upper A-Arm (Forward & Rearward legs)
      car.add(createSuspensionRod([side * 0.30, 0.42, 1.76], [side * 1.05, 0.38, 1.60], 0.016, carbon));
      car.add(createSuspensionRod([side * 0.30, 0.40, 1.42], [side * 1.05, 0.38, 1.60], 0.016, carbon));

      // Front Lower A-Arm (Forward & Rearward legs)
      car.add(createSuspensionRod([side * 0.28, 0.20, 1.76], [side * 1.05, 0.24, 1.60], 0.018, carbon));
      car.add(createSuspensionRod([side * 0.28, 0.20, 1.42], [side * 1.05, 0.24, 1.60], 0.018, carbon));

      // Front Pushrod (Diagonal strut from bottom upright to top monocoque)
      car.add(createSuspensionRod([side * 1.00, 0.22, 1.60], [side * 0.30, 0.48, 1.50], 0.015, titanium));

      // Steering track tie-rod
      car.add(createSuspensionRod([side * 0.30, 0.32, 1.46], [side * 1.04, 0.32, 1.52], 0.014, carbon));

      // Front Brake Cooling Duct & Vertical Carbon Upright
      const frontUpright = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.26, 0.22), carbon);
      frontUpright.position.set(side * 1.02, 0.34, 1.60);
      car.add(frontUpright);

      const frontBrakeDuct = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.16), carbon);
      frontBrakeDuct.position.set(side * 0.98, 0.34, 1.74);
      car.add(frontBrakeDuct);

      // ── REAR SUSPENSION (Connecting engine casing to rear upright at x = ±1.05, y = 0.38, z = -1.50) ──
      // Rear Upper A-Arm
      car.add(createSuspensionRod([side * 0.35, 0.44, -1.35], [side * 1.05, 0.40, -1.50], 0.018, carbon));
      car.add(createSuspensionRod([side * 0.35, 0.44, -1.65], [side * 1.05, 0.40, -1.50], 0.018, carbon));

      // Rear Lower A-Arm
      car.add(createSuspensionRod([side * 0.35, 0.22, -1.35], [side * 1.05, 0.26, -1.50], 0.020, carbon));
      car.add(createSuspensionRod([side * 0.35, 0.22, -1.65], [side * 1.05, 0.26, -1.50], 0.020, carbon));

      // Rear Pullrod (Diagonal strut)
      car.add(createSuspensionRod([side * 1.00, 0.42, -1.50], [side * 0.35, 0.20, -1.55], 0.016, titanium));

      // Rear Titanium Drive Halfshaft (Axle)
      car.add(createSuspensionRod([side * 0.32, 0.34, -1.50], [side * 1.05, 0.34, -1.50], 0.022, titanium));

      // Rear Brake Duct & Upright
      const rearUpright = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.24), carbon);
      rearUpright.position.set(side * 1.02, 0.35, -1.50);
      car.add(rearUpright);
    });

    // ==========================
    // 4. Front Wing Assembly (Multi-Element)
    // ==========================
    const WING_WIDTH = 3.2;
    const HALF_WING = WING_WIDTH * 0.5;

    const wingGroup = new THREE.Group();

    // Main lower blade
    const mainBlade = new THREE.Mesh(
      new THREE.BoxGeometry(WING_WIDTH, 0.06, 0.55),
      carbon
    );
    mainBlade.position.set(0, 0.11, 3.8);
    mainBlade.castShadow = true;
    wingGroup.add(mainBlade);

    // Flap element 2 (aerodynamic sweep)
    const flap2 = new THREE.Mesh(
      new THREE.BoxGeometry(WING_WIDTH * 0.94, 0.045, 0.38),
      carbon
    );
    flap2.position.set(0, 0.18, 3.72);
    flap2.rotation.x = 0.12;
    wingGroup.add(flap2);

    // Flap element 3 (top cascade)
    const flap3 = new THREE.Mesh(
      new THREE.BoxGeometry(WING_WIDTH * 0.88, 0.04, 0.30),
      paint
    );
    flap3.position.set(0, 0.24, 3.65);
    flap3.rotation.x = 0.22;
    wingGroup.add(flap3);

    // Endplates & Outer Dive Planes
    [-1, 1].forEach(side => {
      const endplate = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.38, 0.65),
        carbon
      );
      endplate.position.set(side * HALF_WING, 0.22, 3.78);
      endplate.castShadow = true;
      wingGroup.add(endplate);

      // Outward dive plane
      const divePlane = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.03, 0.32),
        carbon
      );
      divePlane.position.set(side * (HALF_WING + 0.08), 0.26, 3.76);
      divePlane.rotation.z = side * 0.18;
      wingGroup.add(divePlane);
    });

    car.add(wingGroup);
    car.frontWing = wingGroup;

    // ==========================
    // 5. Cockpit Opening & Safety Surround
    // ==========================
    // Headrest safety surround collar (black protective foam)
    const headrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.22, 0.75),
      darkIntake
    );
    headrest.position.set(0, 0.52, 0.25);
    car.add(headrest);

    // Rear engine firewall bulkhead
    const bulkhead = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.38, 0.2),
      carbon
    );
    bulkhead.position.set(0, 0.50, -0.15);
    car.add(bulkhead);

    // ==========================
    // 6. Realistic Driver & Helmet
    // ==========================
    // Driver shoulders / racing suit
    const driverTorso = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.32, 0.35),
      paint
    );
    driverTorso.position.set(0, 0.44, 0.28);
    car.add(driverTorso);

    // Seatbelts / HANS device
    [-0.1, 0.1].forEach(x => {
      const belt = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, 0.34),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.9 })
      );
      belt.position.set(x, 0.58, 0.26);
      car.add(belt);
    });

    // Realistic helmet (proportional human head size: radius 0.18)
    const helmetGroup = new THREE.Group();
    helmetGroup.position.set(0, 0.72, 0.25);

    // Base helmet shell
    const helmetShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18, metalness: 0.3 })
    );
    helmetShell.scale.set(0.92, 1.0, 1.15); // slightly elongated racing helmet
    helmetShell.castShadow = true;
    helmetGroup.add(helmetShell);

    // Chin guard
    const chinGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.12, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 })
    );
    chinGuard.position.set(0, -0.06, 0.12);
    helmetGroup.add(chinGuard);

    // Dark Iridium Visor with reflection
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.05,
      metalness: 0.95
    });
    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.175, 0.175, 0.09, 16, 1, true, -Math.PI / 3, (2 * Math.PI) / 3),
      visorMat
    );
    visor.position.set(0, 0.01, 0.04);
    visor.rotation.y = Math.PI;
    helmetGroup.add(visor);

    // Rear aerodynamic helmet spoiler
    const helmetSpoiler = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.04, 0.10),
      carbon
    );
    helmetSpoiler.position.set(0, 0.06, -0.15);
    helmetSpoiler.rotation.x = -0.2;
    helmetGroup.add(helmetSpoiler);

    car.add(helmetGroup);

    // ==========================
    // 7. Authentic F1 Halo Structure
    // ==========================
    // Titanium safety hoop wrapping around driver
    const haloHoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.034, 12, 28, Math.PI * 1.55),
      titanium
    );
    haloHoop.rotation.x = Math.PI / 2 + 0.12;
    haloHoop.rotation.z = Math.PI * 0.725;
    haloHoop.position.set(0, 0.77, 0.32);
    car.add(haloHoop);

    // Vertical central aerodynamic pylon strut (rising in front of driver)
    const haloStrut = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.32, 0.06),
      titanium
    );
    haloStrut.position.set(0, 0.62, 0.62);
    haloStrut.rotation.x = -0.25; // angled slightly forward into chassis
    car.add(haloStrut);

    // Rear halo mounting anchors
    [-0.22, 0.22].forEach(x => {
      const anchor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.22, 8),
        titanium
      );
      anchor.position.set(x, 0.68, 0.05);
      anchor.rotation.x = 0.45;
      car.add(anchor);
    });

    // ==========================
    // 8. F1 Steering Wheel & Arms
    // ==========================
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(0, 0.56, 0.72);
    wheelGroup.rotation.x = Math.PI / 7; // angled towards driver

    // Carbon rectangular steering wheel frame
    const wheelFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.16, 0.025),
      carbon
    );
    wheelGroup.add(wheelFrame);

    // Hand grips (suede/rubber)
    [-0.12, 0.12].forEach(x => {
      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
      );
      grip.position.set(x, 0, 0);
      wheelGroup.add(grip);
    });

    // Digital LCD display screen
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.065),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.8
      })
    );
    screenMesh.position.set(0, 0.015, 0.015);
    wheelGroup.add(screenMesh);

    // Top shift LED row on wheel
    for (let l = -4; l <= 4; l++) {
      const ledColor = l < -1 ? 0x22c55e : (l <= 1 ? 0xef4444 : 0x8b5cf6);
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.008, 0.004),
        new THREE.MeshStandardMaterial({ color: ledColor, emissive: ledColor, emissiveIntensity: 1.0 })
      );
      led.position.set(l * 0.013, 0.062, 0.015);
      wheelGroup.add(led);
    }

    wheelGroup.name = "steeringWheel";
    car.add(wheelGroup);
    car.steeringWheel = wheelGroup;

    // Driver arms holding grips
    const armMat = paint;
    const leftArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.10, 0.42),
      armMat
    );
    leftArm.position.set(-0.20, 0.52, 0.50);
    leftArm.rotation.set(-Math.PI / 12, 0, 0.15);
    leftArm.name = "leftArm";
    car.add(leftArm);
    car.leftArm = leftArm;

    const rightArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.10, 0.42),
      armMat
    );
    rightArm.position.set(0.20, 0.52, 0.50);
    rightArm.rotation.set(-Math.PI / 12, 0, -0.15);
    rightArm.name = "rightArm";
    car.add(rightArm);
    car.rightArm = rightArm;

    // ==========================
    // 9. Aerodynamic Undercut Sidepods
    // ==========================
    [-1, 1].forEach(side => {
      // Main sidepod body
      const pod = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.32, 1.85),
        paint
      );
      pod.position.set(side * 0.68, 0.30, 0.10);
      pod.castShadow = true;
      car.add(pod);

      // Forward radiator intake scoop (black recessed inlet)
      const intake = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.22, 0.15),
        darkIntake
      );
      intake.position.set(side * 0.68, 0.32, 1.02);
      car.add(intake);

      // Undercut channel (sculpted aerodynamic undercuts)
      const undercut = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.16, 1.6),
        carbon
      );
      undercut.position.set(side * 0.46, 0.18, 0.2);
      car.add(undercut);

      // Bargeboard / Floor edge winglet
      const edgeWing = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.14, 1.2),
        carbon
      );
      edgeWing.position.set(side * 0.88, 0.16, 0.2);
      car.add(edgeWing);
    });

    // ==========================
    // 10. Engine Cover, Airbox & Shark Fin
    // ==========================
    // Engine cover body tapering to rear
    const engineCover = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.48, 1.8),
      paint
    );
    engineCover.position.set(0, 0.48, -0.9);
    engineCover.castShadow = true;
    car.add(engineCover);

    // Overhead airbox roll-hoop intake
    const airbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.28, 0.45),
      paint
    );
    airbox.position.set(0, 0.90, -0.10);
    car.add(airbox);

    const airboxIntake = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.12, 16),
      darkIntake
    );
    airboxIntake.rotation.x = Math.PI / 2;
    airboxIntake.position.set(0, 0.90, 0.12);
    car.add(airboxIntake);

    // Official T-cam mounted on top of airbox
    const tCam = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.05, 0.06),
      carbon
    );
    tCam.position.set(0, 1.05, -0.05);
    car.add(tCam);
    car.tCam = tCam;

    // Vertical shark fin running down engine spine
    const sharkFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.38, 1.45),
      paint
    );
    sharkFin.position.set(0, 0.78, -0.85);
    sharkFin.castShadow = true;
    car.add(sharkFin);

    // Rear diffuser & safety rain LED light
    const diffuser = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.16, 0.65),
      carbon
    );
    diffuser.position.set(0, 0.14, -1.95);
    car.add(diffuser);

    // Red pulsing FIA safety rain light
    const rainLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.9 })
    );
    rainLight.position.set(0, 0.16, -2.28);
    car.add(rainLight);

    // ==========================
    // 11. Rear Wing Assembly (Swan-Neck Mounts & DRS Flap)
    // ==========================
    const rearWingGroup = new THREE.Group();

    // Main lower horizontal plane
    const mainPlane = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.05, 0.46),
      carbon
    );
    mainPlane.position.set(0, 0.88, -2.25);
    mainPlane.castShadow = true;
    mainPlane.name = "rearWing";
    rearWingGroup.add(mainPlane);

    // Upper DRS movable flap
    const drsFlap = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.045, 0.38),
      paint
    );
    drsFlap.position.set(0, 0.98, -2.25);
    drsFlap.castShadow = true;
    drsFlap.name = "drsFlap";
    rearWingGroup.add(drsFlap);
    car.drsFlap = drsFlap;

    // Dual swan-neck pylons
    [-0.22, 0.22].forEach(x => {
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.60, 0.22),
        carbon
      );
      pylon.position.set(x, 0.70, -2.18);
      pylon.rotation.x = 0.18;
      rearWingGroup.add(pylon);
    });

    // Rear wing endplates with vertical strakes
    [-1, 1].forEach(side => {
      const endplate = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.65, 0.68),
        carbon
      );
      endplate.position.set(side * 1.05, 0.85, -2.25);
      endplate.castShadow = true;
      rearWingGroup.add(endplate);
    });

    car.add(rearWingGroup);
    car.rearWing = rearWingGroup;

    // ==========================
    // 12. 18-Inch Wheels with Aero Covers & Pirelli Compounds
    // ==========================
    const tyreMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.85
    });

    const aeroCoverMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.7
    });

    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Default soft red
      roughness: 0.7
    });
    car.tyreBandMat = bandMat;

    const wheelPos = [
      [-1.15, 0.36, 1.6],
      [1.15, 0.36, 1.6],
      [-1.15, 0.38, -1.5],
      [1.15, 0.38, -1.5]
    ];

    car.wheels = [];
    wheelPos.forEach((pos, idx) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(...pos);
      wGroup.originalX = pos[0];

      // Front vs Rear tyre width (rears are wider in F1)
      const tyreWidth = idx < 2 ? 0.34 : 0.42;
      const tyreRadius = idx < 2 ? 0.36 : 0.38;

      const tyre = new THREE.Mesh(
        new THREE.CylinderGeometry(tyreRadius, tyreRadius, tyreWidth, 24),
        tyreMat
      );
      tyre.rotation.z = Math.PI / 2;
      tyre.castShadow = true;
      wGroup.add(tyre);

      // Aero wheel cover disc
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, tyreWidth + 0.01, 16),
        aeroCoverMat
      );
      rim.rotation.z = Math.PI / 2;
      wGroup.add(rim);

      // Central wheel lock nut
      const nut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, tyreWidth + 0.04, 12),
        titanium
      );
      nut.rotation.z = Math.PI / 2;
      wGroup.add(nut);

      // Pirelli compound colored sidewall bands
      const sideBandL = new THREE.Mesh(
        new THREE.RingGeometry(0.26, 0.31, 24),
        bandMat
      );
      sideBandL.position.x = -(tyreWidth / 2 + 0.005);
      sideBandL.rotation.y = Math.PI / 2;
      wGroup.add(sideBandL);

      const sideBandR = new THREE.Mesh(
        new THREE.RingGeometry(0.26, 0.31, 24),
        bandMat
      );
      sideBandR.position.x = (tyreWidth / 2 + 0.005);
      sideBandR.rotation.y = -Math.PI / 2;
      wGroup.add(sideBandR);

      car.add(wGroup);
      car.wheels.push(wGroup);
    });

    return car;
  }

  function spawnStars() {
    stars.forEach(s => scene.remove(s.mesh));
    stars = [];

    const starCount = 12;
    const starGeo = new THREE.OctahedronGeometry(0.7, 0);
    const starMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, emissive: 0x78350f });

    for (let i = 0; i < starCount; i++) {
      const offset = (i + 0.5) / starCount;
      const point = trackCurve.getPointAt(offset);
      const tangent = trackCurve.getTangentAt(offset);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      point.add(normal.multiplyScalar((i % 2 === 0 ? 1 : -1) * 3));
      point.y = 1.0;

      const mesh = new THREE.Mesh(starGeo, starMat);
      mesh.position.copy(point);
      scene.add(mesh);

      stars.push({ mesh: mesh, active: true, respawnTimer: 0.0 });
    }
  }

  function usePlayerItem() {
    if (!activePowerup) return;
    window.ApexAudio.playShoot();

    if (activePowerup === 'turbo') {
      playerKart.boostTime = 3.0;
      window.ApexAudio.playBoost();
      spawnExhaustSmoke(playerKart.mesh.position, true);
    } else if (activePowerup === 'shield') {
      activateShield(playerKart);
    } else if (activePowerup === 'rocket') {
      spawnRocket(playerKart.mesh.position.clone(), playerKart.currentOffset);
    }

    activePowerup = null;
    updatePowerupHUD();
  }

  function activateShield(racer) {
    if (racer.shieldActive) return;
    racer.shieldActive = true;
    racer.shieldMesh = null;
  }

  function spawnRocket(position, startOffset) {
    const group = new THREE.Group();
    group.position.copy(position);
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const noseGeo = new THREE.ConeGeometry(0.3, 0.5, 12);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.z = 0.85;
    nose.rotation.x = Math.PI / 2;
    group.add(nose);

    scene.add(group);
    rockets.push({ mesh: group, currentOffset: startOffset, speed: 0.015 });
  }

  function spawnExhaustSmoke(pos, isNitro = false) {
    if (typeof scene === 'undefined' || !scene || typeof particles === 'undefined' || !particles) return;
    const count = isNitro ? 5 : 2;
    for (let i = 0; i < count; i++) {
      const size = isNitro ? 0.08 : 0.05;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshBasicMaterial({ color: isNitro ? 0x22d3ee : 0xcbd5e1, transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.position.x += (Math.random() - 0.5) * 0.5;
      mesh.position.y += Math.random() * 0.3;
      mesh.position.z += (Math.random() - 0.5) * 0.5;
      scene.add(mesh);

      particles.push({
        mesh: mesh,
        life: 1.0,
        decay: 0.05 + Math.random() * 0.05,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.5 + Math.random() * 1.0, (Math.random() - 0.5) * 1.5)
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🏁 RACE DIRECTOR — Full System Implementation
  // ═══════════════════════════════════════════════════════════════════

  /** Push a message to the Race Control banner queue */
  function rdShowMessage(text, duration = 4.0, color = '#fff') {
    rcMessageQueue.push({ text, duration, color });
  }

  /** Update Race Control ticker banner (top-centre pill) */
  function updateRCMessages(delta) {
    if (rcCurrentMsg) {
      rcMsgTimer -= delta;
      if (rcMsgTimer <= 0) {
        rcCurrentMsg = null;
        const banner = document.getElementById('rd-rc-banner');
        if (banner) banner.style.display = 'none';
      }
    }
    if (!rcCurrentMsg && rcMessageQueue.length > 0) {
      rcCurrentMsg = rcMessageQueue.shift();
      rcMsgTimer = rcCurrentMsg.duration;
      const banner = document.getElementById('rd-rc-banner');
      const txt   = document.getElementById('rd-rc-banner-text');
      if (banner && txt) {
        txt.innerText = rcCurrentMsg.text;
        txt.style.color = rcCurrentMsg.color;
        banner.style.display = 'block';
      }
    }
  }

  /**
   * Show the left-side flag notification card + screen dim.
   * @param {string} icon     - Emoji icon e.g. '🟡'
   * @param {string} title    - Short title e.g. 'VIRTUAL SAFETY CAR'
   * @param {string} msg      - Detail line e.g. 'No overtaking. Hold delta time.'
   * @param {string} headerBg - CSS background for card header e.g. '#f59e0b'
   * @param {string} headerColor - Text colour in header (default '#000')
   */
  function showFlagCard(icon, title, msg, headerBg = '#f59e0b', headerColor = '#000') {
    const card   = document.getElementById('rd-flag-card');
    const header = document.getElementById('rd-flag-card-header');
    const icoEl  = document.getElementById('rd-flag-card-icon');
    const titEl  = document.getElementById('rd-flag-card-title');
    const msgEl  = document.getElementById('rd-flag-card-msg');
    if (!card) return;
    if (icoEl)  icoEl.innerText  = icon;
    if (titEl)  { titEl.innerText = title; titEl.style.color = headerColor; }
    if (msgEl)  msgEl.innerText  = msg;
    if (header) { header.style.background = headerBg; header.style.color = headerColor; }
    card.style.display = 'block';
    // NO screen dim — user does not want the black overlay during flags
  }

  /** Hide the left-side flag card */
  function hideFlagCard() {
    const card = document.getElementById('rd-flag-card');
    if (card) card.style.display = 'none';
  }

  /** Update the top-of-screen flag colour strip */
  function updateFlagStrip(flagType) {
    const strip = document.getElementById('rd-flag-strip');
    if (!strip) return;
    const colors = {
      green:  '#22c55e',
      yellow: '#eab308',
      red:    '#e10600',
      blue:   '#3b82f6',
      vsc:    '#f59e0b',
      none:   'transparent'
    };
    if (flagType === 'none') {
      strip.style.display = 'none';
    } else {
      strip.style.display = 'block';
      strip.style.background = colors[flagType] || 'transparent';
    }
  }

  // ─── Track Limit Detection ──────────────────────────────────────
  function updateTrackLimits(delta) {
    if (!isRaceActive || isStartingSequence || !playerKart || !trackCurve) return;
    if (isPitting) return; // BUG FIX: pit lane IS off the main track — skip while auto-driving in pit
    if (trackLimitCooldown > 0) {
      trackLimitCooldown -= delta;
      return;
    }

    // Get distance from player to nearest track centre-line
    const distToTrack = getDistanceToTrack(playerKart.mesh.position);
    if (distToTrack > TRACK_HALF_WIDTH) {
      trackLimitWarnings++;
      trackLimitCooldown = 2.5;

      const el  = document.getElementById('rd-track-limit-count');
      const hud = document.getElementById('rd-track-limit-hud');
      if (el) el.innerText = trackLimitWarnings;
      if (hud) {
        hud.style.display = 'block';
        clearTimeout(hud._hideTimeout);
        hud._hideTimeout = setTimeout(() => { hud.style.display = 'none'; }, 3000);
      }

      if (trackLimitWarnings < 4) {
        rdShowMessage(`TRACK LIMITS WARNING ${trackLimitWarnings}/4 — ${4 - trackLimitWarnings} REMAINING`, 3.5, '#eab308');
        speakEngineerRadio(`Track limits warning ${trackLimitWarnings}. ${4 - trackLimitWarnings} more before penalty.`, 60);
      } else {
        playerTimePenaltySeconds += 5;
        trackLimitWarnings = 0;
        rdShowMessage(`+5 SECONDS — TRACK LIMITS EXCEEDED`, 5.0, '#e10600');
        speakEngineerRadio('Five second time penalty applied for repeated track limit violations.', 80);
        showPenaltyPopup(`+5 SECONDS`, 'Track Limits — 4 Strikes');
        if (el) el.innerText = 0;
      }
    }
  }

  /** Display penalty popup notification */
  function showPenaltyPopup(title, subtitle, duration = 5000) {
    const popup = document.getElementById('rd-penalty-popup');
    const txt = document.getElementById('rd-penalty-popup-text');
    const sub = document.getElementById('rd-penalty-popup-sub');
    if (!popup || !txt || !sub) return;
    txt.innerText = title;
    sub.innerText = subtitle;
    popup.style.display = 'block';
    clearTimeout(popup._hideTimeout);
    popup._hideTimeout = setTimeout(() => { popup.style.display = 'none'; }, duration);
  }

  // ─── Marshal Sectors ───────────────────────────────────────────
  function getSectorForOffset(t) {
    return Math.floor(t * SECTOR_COUNT) % SECTOR_COUNT;
  }

  function setSectorYellow(sectorIdx, duration = 20.0) {
    sectorFlags[sectorIdx] = 'yellow';
    sectorFlagTimers[sectorIdx] = duration;
  }
  window.getSectorForOffset = getSectorForOffset;
  window.setSectorYellow = setSectorYellow;

  function updateMarshalSectors(delta) {
    let anyYellow = false;
    for (let i = 0; i < SECTOR_COUNT; i++) {
      if (sectorFlags[i] === 'yellow') {
        sectorFlagTimers[i] -= delta;
        if (sectorFlagTimers[i] <= 0) {
          sectorFlags[i] = 'green';
          sectorFlagTimers[i] = 0;
        } else {
          anyYellow = true;
        }
      }
    }
    // Update flag strip if no full-course flag is active
    if (!safetyCarActive && !vscActive && !redFlagActive) {
      updateFlagStrip(anyYellow ? 'yellow' : 'none');
    }
  }

  /** Check if player is in a yellow sector — blocks overtaking */
  function isPlayerInYellowSector() {
    if (!playerKart) return false;
    const sector = getSectorForOffset(playerKart.currentOffset);
    return sectorFlags[sector] === 'yellow';
  }

  // ─── Virtual Safety Car (VSC) ──────────────────────────────────
  function deployVSC(duration = 30.0) {
    if (vscActive || safetyCarActive || redFlagActive) return;
    vscActive = true;
    vscTimer = duration;
    updateFlagStrip('vsc');
    const vscOverlay = document.getElementById('rd-vsc-overlay');
    if (vscOverlay) vscOverlay.style.display = 'block';
    showFlagCard('🟡', 'VIRTUAL SAFETY CAR',
      'Reduce speed. No overtaking.\nMaintain delta time until green.', '#d97706', '#000');
    rdShowMessage('VSC DEPLOYED — DELTA TIME ACTIVE', 5.0, '#f59e0b');
    speakEngineerRadio('Virtual Safety Car deployed. Maintain delta time. No overtaking.', 85);
  }

  function updateVSC(delta) {
    if (!vscActive) return;
    vscTimer -= delta;

    // Cap ALL racer speeds to VSC limit
    if (playerKart) {
      playerKart.speed = Math.min(playerKart.speed, VSC_SPEED_LIMIT);
    }
    racers.forEach(r => {
      if (!r.isPlayer) r.speed = Math.min(r.speed, VSC_SPEED_LIMIT + (Math.random() - 0.5) * 2.0);
    });

    if (vscTimer <= 0) {
      endVSC();
    }
  }

  function endVSC() {
    vscActive = false;
    const vscOverlay = document.getElementById('rd-vsc-overlay');
    if (vscOverlay) vscOverlay.style.display = 'none';
    hideFlagCard();
    updateFlagStrip('none');
    rdShowMessage('GREEN FLAG — VSC ENDING THIS LAP', 4.0, '#22c55e');
    speakEngineerRadio('Virtual Safety Car ending this lap. Prepare to race.', 80);
  }

  // ─── Red Flag ──────────────────────────────────────────────────
  function deployRedFlag(duration = 25.0) {
    if (redFlagActive) return;
    redFlagActive = true;
    redFlagTimer = duration;
    updateFlagStrip('red');
    const rfOverlay = document.getElementById('rd-red-flag-overlay');
    if (rfOverlay) rfOverlay.style.display = 'block';
    showFlagCard('🔴', 'RED FLAG',
      'Race suspended. Reduce speed\nimmediately. Do not overtake.', '#dc2626', '#fff');
    rdShowMessage('RED FLAG — RACE SUSPENDED', 8.0, '#e10600');
    speakEngineerRadio('Red Flag! Race suspended. Reduce speed immediately.', 100);
  }

  function updateRedFlag(delta) {
    if (!redFlagActive) return;
    // Hard freeze all cars
    if (playerKart) playerKart.speed = Math.max(0, playerKart.speed - delta * 80);
    racers.forEach(r => { r.speed = Math.max(0, (r.speed || 0) - delta * 80); });

    redFlagTimer -= delta;
    if (redFlagTimer <= 0 && !redFlagRestartPending) {
      redFlagRestartPending = true;
      const rfOverlay = document.getElementById('rd-red-flag-overlay');
      if (rfOverlay) rfOverlay.style.display = 'none';
      hideFlagCard();
      updateFlagStrip('none');
      
      redFlagActive = false;
      redFlagRestartPending = false;
      
      triggerStandingRestart();
    }
  }

  // ─── Blue Flag (Lapped Cars) ───────────────────────────────────

// ═══ game-03-blueflag-director.js ═══
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
    // Only active during actual GP race (session 2) and on the main track (not in pit lane)
    if (currentSessionIndex !== 2 || playerKart.inPitLane || isStartingSequence || postRaceActive) return;
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
  // Authentic high-downforce F1 cornering speeds (keeps AI within competitive gap of player)
  const AI_BRAKING_ZONES = [
    { from: 0.06,  to: 0.10,  maxSpeed: 62.0 }, // Turn 1-2 fast sweeper
    { from: 0.17,  to: 0.21,  maxSpeed: 52.0 }, // Turn 3-4 chicane
    { from: 0.29,  to: 0.33,  maxSpeed: 45.0 }, // Turn 5 hairpin
    { from: 0.44,  to: 0.48,  maxSpeed: 64.0 }, // Turn 6-7 high-speed bend
    { from: 0.57,  to: 0.61,  maxSpeed: 54.0 }, // Turn 8 medium curve
    { from: 0.72,  to: 0.76,  maxSpeed: 50.0 }, // Turn 9-10 chicane
    { from: 0.85,  to: 0.89,  maxSpeed: 60.0 }  // Turn 11-12 final sweeping bend
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


// ═══ game-04-animate.js ═══
  function animate(raceId) {
    if (raceId !== currentRaceId) return; // Stale animation loop self-termination guard
    if (!renderer) return;
    animationFrameId = requestAnimationFrame(() => animate(raceId));

    let delta = clock.getDelta();
    if (window.isGamePaused) {
      delta = 0.0;
    } else {
      delta = Math.min(delta, 0.035); // Smooth 35ms ceiling prevents physics stutter spikes
    }

    if (typeof window.debugPlayerFlowTransitions === 'function') {
      window.debugPlayerFlowTransitions();
    }

    // Skip hold logic and updates for post-race cutscenes
    if (postRaceActive) {
      if (postRaceState !== "FINAL_RESULTS") {
        if (enterKeyPressed) {
          skipHoldTimer = Math.min(1.0, skipHoldTimer + delta);
          const pBar = document.getElementById('skip-progress-bar');
          if (pBar) pBar.style.width = `${skipHoldTimer * 100}%`;
          if (skipHoldTimer >= 1.0) {
            skipCurrentPostRaceState();
          }
        } else {
          skipHoldTimer = Math.max(0.0, skipHoldTimer - delta * 2.0);
          const pBar = document.getElementById('skip-progress-bar');
          if (pBar) pBar.style.width = `${skipHoldTimer * 100}%`;
        }
      }
      updatePostRaceStateMachine(delta);
    }

    // Pulse green pit guide line HSL colors
    if (pitGuideLine && pitGuideLine.material) {
      pitGuideLine.material.color.setHSL(
        0.35,
        1,
        0.45 + 0.18 * Math.sin(clock.getElapsedTime() * 4.5)
      );
    }

    // Cinematic state-driven pit stop animation sequence!
    if (isPitStopActive) {
      const pPos = playerKart.mesh.position;
      
      if (pitStopPhase === "CREW_RUNNING") {
        let allArrived = true;
        pitCrew.forEach(c => {
          c.group.position.lerp(c.target, delta * 7.5);
          c.group.lookAt(pPos);
          if (c.group.position.distanceTo(c.target) > 0.08) {
            allArrived = false;
          }
        });
        if (allArrived) {
          pitStopPhase = "LIFTING";
          window.pitLiftTimer = 0.0;
          document.getElementById('pit-prompt-text').innerText = "LIFTING CAR ON JACKS...";
        }
      } 
      else if (pitStopPhase === "LIFTING") {
        window.pitLiftTimer = (window.pitLiftTimer || 0.0) + delta * 2.8;
        playerKart.mesh.position.y = THREE.MathUtils.lerp(0.1, 0.42, Math.min(1.0, window.pitLiftTimer));
        if (window.pitLiftTimer >= 1.0) {
          pitStopPhase = "CHANGING_TYRES";
          document.getElementById('pit-prompt-text').innerText = "WHEEL GUNS AT WORK // TYRE CHANGE IN PROGRESS...";
          if (window.ApexAudio && typeof window.ApexAudio.playWheelGun === 'function') {
            window.ApexAudio.playWheelGun();
          }
        }
      }
      else if (pitStopPhase === "CHANGING_TYRES") {
        // Smooth automatic progression (2.6s pitstop) + tap boost
        window.pitQTEProgress = (window.pitQTEProgress || 0.0) + delta * 38.0;
        document.getElementById('pit-progress-fill').style.width = `${Math.min(100, window.pitQTEProgress)}%`;

        if (window.pitQTEProgress > 45 && !window.pitGunSecondBurstPlayed) {
          window.pitGunSecondBurstPlayed = true;
          if (window.ApexAudio && typeof window.ApexAudio.playWheelGun === 'function') {
            window.ApexAudio.playWheelGun();
          }
        }

        const progress = window.pitQTEProgress;
        if (playerKart.mesh.wheels) {
          playerKart.mesh.wheels.forEach(w => {
            if (progress > 15 && progress < 55) {
              const t = (progress - 15) / 40;
              w.position.x = w.originalX + Math.sign(w.originalX) * 1.5 * t;
            } else if (progress >= 55 && progress < 90) {
              const t = (progress - 55) / 35;
              w.position.x = w.originalX + Math.sign(w.originalX) * 1.5 * (1.0 - t);
            } else if (progress >= 90) {
              w.position.x = w.originalX;
            }
          });
        }

        // Animate tyre carriers delivering and fitting tyres
        pitCrew.forEach(c => {
          if (c.role && c.role.startsWith('carrier_')) {
            if (progress < 60) {
              c.group.position.lerp(c.target, delta * 5.0);
            } else {
              if (c.group.tyreProp) c.group.tyreProp.visible = false;
              c.group.position.lerp(c.standby, delta * 3.5);
            }
          }
        });

        if (window.pitQTEProgress >= 100.0) {
          window.pitQTEProgress = 100.0;
          window.pitGunSecondBurstPlayed = false;
          pitStopPhase = "LOWERING";
          window.pitLowerTimer = 0.0;
          document.getElementById('pit-prompt-text').innerText = "LOWERING CAR ON JACKS...";
          if (window.ApexAudio && typeof window.ApexAudio.playJackDrop === 'function') {
            window.ApexAudio.playJackDrop();
          }
        }
      }
      else if (pitStopPhase === "LOWERING") {
        window.pitLowerTimer = (window.pitLowerTimer || 0.0) + delta * 3.8;
        playerKart.mesh.position.y = THREE.MathUtils.lerp(0.42, 0.1, Math.min(1.0, window.pitLowerTimer));
        
        if (playerKart.mesh.wheels) {
          playerKart.mesh.wheels.forEach(w => w.position.x = w.originalX);
        }

        // Crew starts jogging back to standby positions
        pitCrew.forEach(c => {
          c.group.position.lerp(c.standby, delta * 4.5);
          c.group.lookAt(c.standby);
        });

        if (window.pitLowerTimer >= 1.0) {
          pitStopPhase = "RELEASED";
          completePitStop();
        }
      }
    }

    // Animate running-back crew after they are released from active pit stop
    if (runningBackCrew.length > 0) {
      runningBackCrew.forEach(c => {
        c.group.position.lerp(c.standby, delta * 4.5);
        c.group.lookAt(c.standby);
      });
    }

    // Safety Car movement & flashing lights loop
    if (safetyCarActive && safetyCarMesh) {
      const scStep = (15.5 * delta) / 1800;
      safetyCarOffset = (safetyCarOffset + scStep) % 1.0;
      
      const scPt = trackCurve.getPointAt(safetyCarOffset);
      const scTang = trackCurve.getTangentAt(safetyCarOffset);
      safetyCarMesh.position.copy(scPt);
      safetyCarMesh.lookAt(scPt.clone().add(scTang));

      // Flashing orange/blue warning lights bar
      const scLight = safetyCarMesh.children.find(c => c.geometry && c.geometry.type === 'BoxGeometry' && c.position.y > 1.3);
      if (scLight) {
        scLight.material.color.setHex(Math.floor(clock.getElapsedTime() * 9.0) % 2 === 0 ? 0xf97316 : 0x3b82f6);
      }

      safetyCarTimer -= delta;
      if (safetyCarTimer <= 0.0) {
        endSafetyCarPeriod();
      }
    }

    if (isStartingSequence || isRaceActive || (postRaceActive && postRaceState === "FINISHING")) {
      if (isStartingSequence) {
        updateStartingSequence(delta);
      } else {
        if (isRaceActive) updateRaceTimer(delta);
      }

      if (isRaceActive && !isStartingSequence) {
        updatePlayerPhysics(delta);
        updateAIPysics(delta);
        
        // Update tyre wear for all cars
        racers.forEach(car => calculateTyreWear(car, delta));

        racers.forEach(car => {
          const inGarage = car.qualifyingState === "GARAGE";
          const isTimingActive = !isStartingSequence && !inGarage;
          if (isTimingActive) {
            car.lapTimeElapsed = (car.lapTimeElapsed || 0.0) + delta;
          }
        });

        racers.forEach(car => updateCarLap(car, delta));
      }

      // Unified position sorting
      updateRacePositions();
      updateHazardsAndRockets(delta);
      updateCollisionDetection();
      updateParticles(delta);
      updateCameraFollow();
      updateWeatherEvent(delta);
      drawMinimap();
      
      const nowMs = performance.now();
      if (!window._lastHudDomUpdate || (nowMs - window._lastHudDomUpdate) > 100) {
        window._lastHudDomUpdate = nowMs;
        updateLeaderboardHUD();
        updateDebugRacePanel();
      }
      updateRaceDirector(delta); // 🏁 Race Director — VSC, Red Flag, Track Limits, Flags

      // Live-update telemetry panel when open
      if (document.getElementById('hud-telemetry-panel')?.classList.contains('show')) {
        updateTelemetryPanelUI();
      }

      // Visual DRS flap / Active Aero wing animation for player kart!
      if (playerKart && playerKart.mesh && playerKart.mesh.drsFlap) {
        let targetRot = 0.0;
        if (window.f1RegulationEra === '2026') {
          const isStraightZone = (playerKart.currentOffset >= 0.02 && playerKart.currentOffset <= 0.22) || (playerKart.currentOffset >= 0.50 && playerKart.currentOffset <= 0.70);
          targetRot = (isStraightZone && !safetyCarActive) ? -Math.PI / 6 : 0.0;
        } else {
          targetRot = drsActive ? -Math.PI / 6 : 0.0;
        }
        playerKart.mesh.drsFlap.rotation.x = THREE.MathUtils.lerp(
          playerKart.mesh.drsFlap.rotation.x,
          targetRot,
          delta * 6.0
        );
      }

      // Voice listener 15-second automatic timeout window countdown
      if (window.keepListeningForVoice) {
        window.micTimeoutTimer -= delta;
        const micBtn = document.getElementById('hud-mic-btn');
        if (micBtn) micBtn.classList.add('listening');

        if (window.micTimeoutTimer <= 0.0) {
          window.keepListeningForVoice = false;
          pendingRadioQuestion = null;
          if (recognition) {
            try { recognition.stop(); } catch(e) {}
          }
          if (micBtn) micBtn.classList.remove('listening');
          speakEngineerRadio("Microphone listening window closed.", 10);
        }
      }

      // Shift blocked telemetry warning display timer
      if (shiftBlockedHUDTimer > 0.0) {
        shiftBlockedHUDTimer -= delta;
      }
    }

    renderer.render(scene, camera);
  }

  function updateRaceTimer(delta) {
    const pad = (num) => String(num).padStart(2, '0');

    // Practice / Qualifying Countdown Session Clock
    if (currentSessionIndex === 0 || currentSessionIndex === 1) {
      // Only decrement timer if it's still running and we haven't already expired
      if (window.sessionTimeRemaining > 0.0) {
        window.sessionTimeRemaining = Math.max(0.0, window.sessionTimeRemaining - delta);
      }
      
      const sessionLabel = currentSessionIndex === 0 ? "PRACTICE" : "QUALIFYING";
      const totalSecs = Math.floor(window.sessionTimeRemaining);
      const minutes = Math.floor(totalSecs / 60);
      const seconds = totalSecs % 60;
      
      const hudTimeEl = document.getElementById('hud-time');
      if (hudTimeEl) {
        hudTimeEl.innerText = `${sessionLabel}: ${pad(minutes)}:${pad(seconds)}`;
      }

      // Show END SESSION button during practice
      if (currentSessionIndex === 0) {
        const epw = document.getElementById('end-practice-btn-wrap');
        if (epw && epw.style.display === 'none') epw.style.display = 'block';
      }

      // Check session expiry — only fire ONCE when timer first hits 0
      if (window.sessionTimeRemaining <= 0.0 && !window._sessionExpiredFired) {
        window._sessionExpiredFired = true;
        if (currentSessionIndex === 0) {
          // Practice: just notify, keep driving
          finishPractice();
        } else {
          // Qualifying: check if any car is still on a timed lap
          const activeTimedCars = racers.filter(r => r.isOnTimedLap);
          if (activeTimedCars.length === 0) {
            finishQualifying();
          } else {
            // Show HUD banner warning
            const warningEl = document.getElementById('lights-banner-title');
            const overlay = document.getElementById('f1-starting-lights-overlay');
            if (overlay && warningEl) {
              overlay.classList.remove('hidden');
              overlay.style.display = 'flex';
              warningEl.innerText = "SESSION EXPIRED // FINISHING TIMED LAPS";
            }
          }
        }
      }
    } else {
      // Main Grand Prix Forward Race Timer
      if (window.raceState !== "RACING" && !postRaceActive) {
        const hudTimeEl = document.getElementById('hud-time');
        if (hudTimeEl) {
          hudTimeEl.innerText = "00:00.000";
        }
        return;
      }
      raceTimer = clock.getElapsedTime() - startTime;
      const minutes = Math.floor(raceTimer / 60);
      const seconds = Math.floor(raceTimer % 60);
      const ms = Math.floor((raceTimer % 1) * 100);
      
      const hudTimeEl = document.getElementById('hud-time');
      if (hudTimeEl) {
        hudTimeEl.innerText = `${pad(minutes)}:${pad(seconds)}.${pad(ms)}`;
      }
    }

    // Display the current player lap time, best lap time and delta on the new compact timing widget
    const hPanel = document.getElementById('f1-hud-timing-panel');
    if (hPanel && playerKart) {
      // 1. Session & Position
      const sessionNames = ["PRACTICE", "QUALIFYING", "MAIN GP RACE"];
      if (window.raceState === "RACE_FORMATION") {
        document.getElementById('hud-session-title').innerText = "FORMATION LAP";
        document.getElementById('hud-pos-val').innerText = `P${playerKart.qualifyingPosition || playerKart.posRank || 1}`;
        document.getElementById('hud-current-lap').innerText = "GRID RUN";
      } else {
        document.getElementById('hud-session-title').innerText = sessionNames[currentSessionIndex] || "SESSION";
        document.getElementById('hud-pos-val').innerText = `P${playerKart.posRank || 1}`;
      }

      // 2. Current lap time or state
      if (window.raceState === "RACE_FORMATION") {
        // Handled above
      } else if (currentSessionIndex === 0 || currentSessionIndex === 1) {
        if (playerKart.qualifyingState === "GARAGE") {
          document.getElementById('hud-current-lap').innerText = "IN GARAGE";
        } else if (playerKart.qualifyingState === "PIT_EXIT") {
          document.getElementById('hud-current-lap').innerText = "PIT LANE";
        } else if (playerKart.qualifyingState === "OUT_LAP") {
          document.getElementById('hud-current-lap').innerText = "OUT LAP";
        } else if (playerKart.qualifyingState === "IN_LAP") {
          document.getElementById('hud-current-lap').innerText = "IN LAP";
        } else if (playerKart.qualifyingState === "TIMED_LAP") {
          document.getElementById('hud-current-lap').innerText = formatTimeMMSS(playerKart.lapTimeElapsed || 0.0);
        } else {
          document.getElementById('hud-current-lap').innerText = formatTimeMMSS(playerKart.lapTimeElapsed || 0.0);
        }
      } else {
        document.getElementById('hud-current-lap').innerText = formatTimeMMSS(playerKart.lapTimeElapsed || 0.0);
      }

      // 3. Best lap time
      const bestLapVal = currentSessionIndex === 0 ? playerKart.bestPracticeLap : (currentSessionIndex === 1 ? playerKart.bestQualifyingLap : playerKart.bestLapTime);
      if (bestLapVal && bestLapVal !== Infinity && bestLapVal > 0) {
        document.getElementById('hud-best-lap').innerText = formatTimeMMSS(bestLapVal);
      } else {
        document.getElementById('hud-best-lap').innerText = "--:--.---";
      }

      // 4. Delta (compared to best lap time, using track offset)
      if (bestLapVal && bestLapVal !== Infinity && bestLapVal > 0 && (currentSessionIndex === 2 || playerKart.qualifyingState === "TIMED_LAP")) {
        const expected = bestLapVal * playerKart.currentOffset;
        const diff = playerKart.lapTimeElapsed - expected;
        const sign = diff >= 0 ? "+" : "";
        const deltaEl = document.getElementById('hud-delta');
        deltaEl.innerText = `${sign}${diff.toFixed(3)}`;
        deltaEl.style.color = diff >= 0 ? "#ef4444" : "#10b981"; // Red if slower, Green if faster!
      } else {
        document.getElementById('hud-delta').innerText = "+0.000";
        document.getElementById('hud-delta').style.color = "var(--neon-cyan)";
      }

      // 5. Session progress (Time remaining or Lap count)
      const progressEl = document.getElementById('hud-session-progress');
      if (currentSessionIndex === 0) {
        // Practice: show lap number only (no total), plus time
        const pracLap = playerKart ? (playerKart.completedLaps || 0) : 0;
        const totalSecs = Math.floor(window.sessionTimeRemaining);
        const pMin = Math.floor(totalSecs / 60);
        const pSec = totalSecs % 60;
        progressEl.innerText = `LAP ${pracLap}   TIME ${pad(pMin)}:${pad(pSec)}`;
      } else if (currentSessionIndex === 1) {
        const totalSecs = Math.floor(window.sessionTimeRemaining);
        const minutes = Math.floor(totalSecs / 60);
        const seconds = totalSecs % 60;
        progressEl.innerText = `TIME: ${pad(minutes)}:${pad(seconds)}`;
      } else {
        progressEl.innerText = `LAP: ${Math.min(maxLaps, currentLap)} / ${maxLaps}`;
      }
    }
  }

  function formatTimeMMSS(time) {
    if (time === Infinity || !time || time === 0.0) return "--:--.---";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 1000);
    const pad = (num) => String(num).padStart(2, '0');
    const padMS = (num) => String(num).padStart(3, '0');
    return `${pad(mins)}:${pad(secs)}.${padMS(ms)}`;
  }

// ═══ game-05-player-physics.js ═══
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

// ═══ game-06-ai-physics.js ═══
  function getSignedTrackGap(carA, carB) {

    const diff = carB.currentOffset - carA.currentOffset;

    const normDiff = ((diff + 0.5) % 1.0) - 0.5;

    return normDiff * 1800.0;

  }

  function getNearbyCars(car, range) {

    return racers.filter(other => {

      if (other === car) return false;

      if (other.finished) return false;

      // CRITICAL: garage/inactive cars have no track presence - skip them entirely

      if (other.isTrackActive === false) return false;

      if (other.collisionEnabled === false) return false;

      if (other.mesh && !other.mesh.visible) return false;

      const gap = Math.abs(getSignedTrackGap(car, other));

      return gap < range;

    });

  }

  window.getGridSlotTransform = (gridIndex) => {
    const row = Math.floor(gridIndex / 2);
    const side = gridIndex % 2 === 0 ? -1.8 : 1.8;
    const progress = (1.0 - row * 0.009 + 1.0) % 1.0;
    
    const pt = trackCurve.getPointAt(progress);
    const tang = trackCurve.getTangentAt(progress).normalize();
    const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
    const pos = pt.clone().add(norm.multiplyScalar(side));
    const heading = Math.atan2(tang.x, tang.z);
    
    return {
      position: pos,
      heading: heading,
      progress: progress,
      sideOffset: side
    };
  };

  window.startRaceFormationLap = () => {
    window.raceState = "RACE_FORMATION";
    window.formationLapActive = true;
    
    // Sort racers by qualifyingPosition
    const sorted = [...racers].sort((a,b) => (a.qualifyingPosition || 99) - (b.qualifyingPosition || 99));
    window.startingGrid = sorted;
    
    const pIdx = sorted.findIndex(r => r.isPlayer);
    const playerProgress = playerKart.currentOffset;
    
    sorted.forEach((r, idx) => {
      // Space relative to the player to avoid player teleportation
      const offset = (playerProgress + (pIdx - idx) * 0.009 + 1.0) % 1.0;
      
      r.gridReady = false;
      r.isTrackActive = true;
      r.collisionEnabled = false; // Disable collisions during formation lap to prevent accidents/lockups
      r.qualifyingState = "FORMATION";
      
      if (!r.isPlayer) {
        r.currentOffset = offset;
        r.previousTrackProgress = offset;
        r.sideOffset = 0.0;
        r.speed = 10.0;
        
        if (r.mesh) {
          r.mesh.visible = true;
          const pt = trackCurve.getPointAt(offset);
          const tang = trackCurve.getTangentAt(offset).normalize();
          r.mesh.position.copy(pt);
          r.mesh.lookAt(pt.clone().add(tang));
          
          if (typeof window.registerCollider === 'function') {
            window.registerCollider(r.mesh, "CAR");
          }
        }
      }
    });
    
    if (typeof window.createPlayerGridMarker === 'function') {
      window.createPlayerGridMarker();
    }
    
    speakEngineerRadio("Formation lap starting. Follow the queue to your grid slot.", 80);
  };

  function predictCollision(car, other) {

    const longitudinalGap = getSignedTrackGap(car, other);

    const lateralGap = Math.abs(car.sideOffset - other.sideOffset);

    const closingSpeed = car.speed - other.speed;

    let timeToCollision = Infinity;

    if (longitudinalGap > 0 && closingSpeed > 0.05) {

      timeToCollision = longitudinalGap / closingSpeed;

    }

    return {

      longitudinalGap,

      lateralGap,

      closingSpeed,

      timeToCollision

    };

  }

  function getCollisionRisk(pred) {
    if (pred.lateralGap > 2.2) return "SAFE";

    // Proximity checks for safe follow distance
    if (pred.longitudinalGap > 0.0) {
      if (pred.longitudinalGap < 4.5) return "EMERGENCY";
      if (pred.longitudinalGap < 9.0) return "HIGH";
      if (pred.longitudinalGap < 16.0) return "CAUTION";
    }

    if (pred.timeToCollision < 0.55) return "EMERGENCY";
    if (pred.timeToCollision < 1.1) return "HIGH";
    if (pred.timeToCollision < 2.0) return "CAUTION";

    return "SAFE";
  }

  function getActivePitLaneCars() {
    return racers.filter(car => {
      if (car.isTrackActive === false || car.qualifyingState === "GARAGE") return false;
      return car.inPitLane || car.isPitting;
    });
  }
  window.getActivePitLaneCars = getActivePitLaneCars;

  function isPitReleaseSafe(car) {
    const activePitCars = getActivePitLaneCars();
    const totalBoxes = F1_TEAMS.length;
    const boxT = 0.30 + (car.teamIndex / Math.max(1, totalBoxes - 1)) * 0.40;

    for (const other of activePitCars) {
      if (other === car) continue;
      if (other.pitReleaseWaiting) continue;

      const otherProgress = other.isPlayer ? pitProgress : (other.pitProgress || 0.0);

      if (otherProgress < boxT) {
        const gap = boxT - otherProgress;
        if (gap < 0.07) {
          return false;
        }
      }
    }
    return true;
  }
  window.isPitReleaseSafe = isPitReleaseSafe;

  function updateAIPysics(delta) {
    const trackLen = trackCurve ? trackCurve.getLength() : 1800.0;

    if (window.formationLapActive) {
      if (window.raceState === "RACE_FORMATION" || window.raceState === "RACE_GRID_WAIT") {
        racers.forEach((racer) => {
          if (racer.isPlayer) return;
          
          if (racer.gridReady) {
            racer.speed = 0.0;
            return;
          }
          
          const myGridIdx = window.startingGrid.findIndex(g => g.name === racer.name);
          const targetSlot = window.getGridSlotTransform(myGridIdx);
          
          const diffToSlot = targetSlot.progress - racer.currentOffset;
          const normDiffToSlot = ((diffToSlot % 1.0) + 1.0) % 1.0;
          const distToSlot = normDiffToSlot * trackLen;
          
          let targetSpeed = 16.0; // ~60 km/h warm up pace
          
          // Follow logic in queue (simple index distance follow)
          const myQueueIdx = window.startingGrid.findIndex(g => g.name === racer.name);
          if (myQueueIdx > 0) {
            const ahead = window.startingGrid[myQueueIdx - 1];
            if (ahead) {
              const diffAhead = ahead.currentOffset - racer.currentOffset;
              const normDiffAhead = ((diffAhead + 0.5) % 1.0) - 0.5;
              const distAhead = normDiffAhead * trackLen;
              if (distAhead > 0.0 && distAhead < 16.0) {
                targetSpeed = Math.min(targetSpeed, ahead.speed * 0.85);
              }
            }
          }
          
          // Approaching grid slot slowdown
          if (distToSlot < 120.0) {
            // Target the lateral offset of the grid slot
            racer.sideOffset = THREE.MathUtils.lerp(racer.sideOffset, targetSlot.sideOffset, delta * 2.0);
            
            if (distToSlot < 40.0) {
              targetSpeed = Math.min(targetSpeed, 4.5);
            }
            if (distToSlot < 8.0) {
              targetSpeed = Math.min(targetSpeed, 1.2);
            }
            if (distToSlot < 1.0) {
              racer.speed = 0.0;
              racer.gridReady = true;
              racer.currentOffset = targetSlot.progress;
              racer.sideOffset = targetSlot.sideOffset;
              if (racer.mesh) {
                racer.mesh.position.copy(targetSlot.position);
                racer.mesh.rotation.y = targetSlot.heading;
              }
              return;
            }
          }
          
          racer.speed = THREE.MathUtils.lerp(racer.speed, targetSpeed, delta * 3.0);
          const step = (racer.speed * delta) / trackLen;
          racer.currentOffset = (racer.currentOffset + step + 1.0) % 1.0;
          
          if (racer.mesh && trackCurve) {
            const pt = trackCurve.getPointAt(racer.currentOffset);
            const tang = trackCurve.getTangentAt(racer.currentOffset).normalize();
            const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
            pt.add(norm.multiplyScalar(racer.sideOffset));
            racer.mesh.position.copy(pt);
            racer.mesh.lookAt(pt.clone().add(tang));
          }
        });
        
        // Check if all cars (player and active AI) are ready in slots
        let allReady = true;
        racers.forEach(r => {
          if (r.isTrackActive && r.qualifyingState !== "GARAGE") {
            if (!r.gridReady) allReady = false;
          }
        });
        
        if (allReady) {
          window.formationLapActive = false;
          window.raceState = "RACE_LIGHTS";
          isStartingSequence = true;
          startingSequenceTime = 4.0; // skip flyby, focus on lights gantry
          lastLightSoundIndex = -1;
          
          // Clear player grid marker
          if (window.playerGridMarkerMesh) {
            scene.remove(window.playerGridMarkerMesh);
            window.playerGridMarkerMesh = null;
          }
          if (typeof window.updateGridGuidanceHUD === 'function') {
            window.updateGridGuidanceHUD(null);
          }
          
          // Force all cars to lock at their slots
          racers.forEach((r, idx) => {
            const myGridIdx = window.startingGrid.findIndex(g => g.name === r.name);
            const slot = window.getGridSlotTransform(myGridIdx);
            r.currentOffset = slot.progress;
            r.sideOffset = slot.sideOffset;
            r.speed = 0.0;
            if (r.mesh) {
              r.mesh.position.copy(slot.position);
              r.mesh.rotation.y = slot.heading;
            }
          });
          
          // Reset tires & battery for launch
          tyreWear = 0.0;
          window.ersBatteryLevel = 100.0;
          
          // Trigger lights overlay
          const lightsOverlay = document.getElementById('f1-starting-lights-overlay');
          if (lightsOverlay) {
            lightsOverlay.classList.remove('hidden');
            lightsOverlay.style.display = 'flex';
            document.getElementById('lights-banner-title').innerText = "PREPARE TO LAUNCH";
            for (let i = 0; i < 10; i++) {
              const b = document.getElementById(`light-red-${i}`);
              if (b) {
                b.style.background = "#1e293b";
                b.style.boxShadow = "none";
              }
            }
          }
          
          // Generate randomized lights hold before release
          window.randomLightsOutHold = 0.8 + Math.random() * 1.7;
          
          speakEngineerRadio("The grid is formed. Wait for the red lights, launch on lights out!", 90);
        }
        return;
      }
      
      // Exhibition GP / Non-GP Weekend default starting/formation logic
      // (Keep existing code unchanged for exhibition or non-career sessions!)
      racers.forEach((racer) => {
        if (racer.isPlayer) return;
        if (racer.gridPositioned) {
          racer.speed = 0.0;
          return;
        }
        let target = 22.0;
        const ahead = racers[racer.posRank - 2];
        if (ahead && !ahead.gridPositioned) {
          const diff = ahead.currentOffset - racer.currentOffset;
          const normDiff = ((diff + 0.5) % 1.0) - 0.5;
          const distAhead = normDiff * 1800;
          if (distAhead > 0.0 && distAhead < 18.0) {
            target = Math.min(target, ahead.speed * 0.9);
          }
        }
        racer.speed = THREE.MathUtils.lerp(racer.speed, target, delta * 3.0);
        const step = (racer.speed * delta) / 1800;
        const fSafeOff = Math.max(0.0, Math.min(1.0, racer.currentOffset));
        racer.currentOffset = (fSafeOff + step + 1.0) % 1.0;
        if (racer.mesh && trackCurve) {
          const safeOff = Math.max(0.0, Math.min(1.0, racer.currentOffset));
          const point = trackCurve.getPointAt(safeOff);
          const tangent = trackCurve.getTangentAt(safeOff).normalize();
          const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
          point.add(normal.multiplyScalar(racer.sideOffset));
          racer.mesh.position.copy(point);
          racer.mesh.lookAt(point.clone().add(tangent));
        }
        if (racer.currentOffset >= 0.985) {
          const idx = racers.indexOf(racer);
          racer.currentOffset = (0.0 - idx * 0.012 + 1.0) % 1.0;
          racer.sideOffset = idx % 2 === 0 ? -1.8 : 1.8;
          racer.speed = 0.0;
          racer.gridPositioned = true;
        }
      });
      return;
    }

    // Lock all AI karts during the starting lights countdown

    if (isStartingSequence) {

      racers.forEach((racer) => {

        if (racer.isPlayer) return;

        racer.speed = 0.0;

        racer.launchDelay = 0.25 + Math.random() * 0.55 + (racer.gridStartPos * 0.04); // rear cars wait longer

        racer.swayFadeFactor = 0.0;

        racer.ersEnergy = ERS_MAX_ENERGY;

        racer.ersBatteryLevel = 100.0;

        racer.overtakeModeActive = false;

      });

      return;

    }

    // Boosted AI top speeds to match player top speed potential (player base = 75 m/s)

    // Realistic modern F1 AI speeds: player max ~88-92 m/s (~315-330 km/h) on straights
    // Easy: 82 m/s (~295 km/h), Normal: 89 m/s (~320 km/h), Hard: 93 m/s (~335 km/h), Expert: 97 m/s (~350 km/h)
    const baseSpeed = [82.0, 89.0, 93.0, 97.0][activeDifficulty] || 89.0;

    // Per-racer pace calculation using driver + car performance profiles
    function calculateAIPace(racer, base) {
      const p = racer.aiProfile || { pace: 0.85, brakingSkill: 0.85, corneringSkill: 0.85, consistency: 0.85 };
      const c = racer.carPerformance || { topSpeed: 80, cornering: 80 };

      // Normalize car stats to 0-1
      const carFactor = ((c.topSpeed / 100) * 0.5 + (c.cornering / 100) * 0.5);
      const driverFactor = p.pace * 0.50 + p.brakingSkill * 0.20 + p.corneringSkill * 0.20 + p.consistency * 0.10;

      // Combined potential: car 45%, driver 55%
      const combined = carFactor * 0.45 + driverFactor * 0.55;

      // Difficulty utilisation: Easy 94-98%, Normal 98-102%, Hard 101-106%, Expert 104-110%
      const utilRange = [
        [0.94, 0.98],  // Easy (~280-295 km/h)
        [0.98, 1.02],  // Normal (~315-325 km/h)
        [1.01, 1.06],  // Hard (~330-345 km/h)
        [1.04, 1.10]   // Expert (~345-360 km/h)
      ][activeDifficulty] || [0.98, 1.02];

      const utilFactor = THREE.MathUtils.lerp(utilRange[0], utilRange[1], combined);
      return base * utilFactor;
    }

    racers.forEach((racer) => {

      if (racer.isPlayer) return;
      if (window.matchMode === 'PVP' && racers.indexOf(racer) === 1) return;

      racer.blueFlagActive = false;
      let avoidanceOffset = 0.0;

      // Handle Practice & Qualifying Garage Release Stagger

      if (currentSessionIndex === 0 || currentSessionIndex === 1) {

        if (racer.qualifyingState === "GARAGE") {

          racer.speed = 0.0;

          racer.targetSpeed = 0.0;

          if (racer.qualifyingReleaseTime !== undefined) {

            racer.qualifyingReleaseTime -= delta;

              if (racer.qualifyingReleaseTime <= 0.0) {

              // GARAGE RELEASE: activate car at its pit box position

              const totalBoxes2 = F1_TEAMS.length;

              const boxT2 = 0.30 + (racer.teamIndex / Math.max(1, totalBoxes2 - 1)) * 0.40;

              racer.pitProgress = boxT2;

              if (pitCurve && racer.mesh) {

                const pt2 = pitCurve.getPointAt(boxT2);

                const tang2 = pitCurve.getTangentAt(boxT2).normalize();

                racer.mesh.position.copy(pt2);

                racer.mesh.lookAt(pt2.clone().add(tang2));

                if (typeof window.activateTrackCar === 'function') {

                  window.activateTrackCar(racer);

                } else {

                  racer.mesh.visible = true;

                  racer.isTrackActive    = true;

                  racer.collisionEnabled = true;

                }

                racer.qualifyingState  = "OUT_LAP";

                racer.isPitting        = true;

                racer.hasStoppedAtBox  = true;

                racer.pitStopHoldTimer = 0.0;

                racer.speed            = 11.0;

              }

            }

          }

          return;

        }

      }

      // PHYSICAL ACTIVITY GUARD: skip cars that are not on the track

      // This covers both garage cars AND cars still being set up

      if (racer.isTrackActive === false) return;

      if (racer.finished) {

        if (racer.postRaceStopped) {

          racer.speed = 0.0;

          racer.targetSpeed = 0.0;

          // DEACTIVATE stopped finished car — no longer an active collision body

          if (racer.isTrackActive !== false) {

            if (typeof window.deactivateTrackCar === 'function') {

              window.deactivateTrackCar(racer);

            } else {

              racer.isTrackActive    = false;

              racer.collisionEnabled = false;

              if (racer.mesh) racer.mesh.visible = true;

            }

          }

          return;

        }

        // Calculate progress since finishing

        const startP = racer.postFinishStartProgress !== undefined ? racer.postFinishStartProgress : racer.currentOffset;

        const currentP = racer.currentOffset;

        let distTravelled = ((currentP - startP + 1.0) % 1.0) * 1800; // in meters/units

        if (distTravelled > 150.0) {

          // Slowed down and stopped

          racer.speed = 0.0;

          racer.targetSpeed = 0.0;

          racer.postRaceStopped = true;

          return;

        }

        // Slow down linearly as we get closer to 150 meters

        const slowdownFactor = Math.max(0.0, 1.0 - (distTravelled / 150.0));

        racer.speed = slowdownFactor * 15.0; // Slow down to a stop from 15 m/s

        // Move the car forward along the track

        const aiStep = (racer.speed * delta) / 1800;

        racer.currentOffset = (racer.currentOffset + aiStep + 1.0) % 1.0;

        // Move towards the side of the track (e.g. sideOffset = 2.5) to clear the racing line

        racer.sideOffset = THREE.MathUtils.lerp(racer.sideOffset, 2.5, delta * 1.5);

        const pt = trackCurve.getPointAt(racer.currentOffset);

        const tang = trackCurve.getTangentAt(racer.currentOffset).normalize();

        const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

        racer.mesh.position.copy(pt.add(norm.multiplyScalar(racer.sideOffset)));

        racer.mesh.lookAt(racer.mesh.position.clone().add(tang));

        return;

      }

      // Handle AI launch reaction time delay — longer for rear cars to prevent pile-ups

      if (racer.launchDelay > 0.0) {

        racer.launchDelay -= delta;

        racer.speed = 0.0;

        racer.swayFadeFactor = 0.0;

        // Hold strictly at their starting grid box position with proper spacing

        const row = Math.floor(racer.gridStartPos / 2);

        const side = racer.gridStartPos % 2 === 0 ? 1.8 : -1.8;

        const tPos = 0.0 - (racer.gridStartPos - 1) * 0.012; // wider grid spacing (matches starting sequence!)

        racer.currentOffset = (tPos + 1.0) % 1.0;

        racer.sideOffset = side;

        const pt = trackCurve.getPointAt(racer.currentOffset);

        const tang = trackCurve.getTangentAt(racer.currentOffset).normalize();

        const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

        pt.add(norm.clone().multiplyScalar(side));

        racer.mesh.position.copy(pt);

        racer.mesh.lookAt(pt.clone().add(tang));

        return;

      }

      // Smoothly fade in sway after launch

      racer.swayFadeFactor = Math.min(1.0, (racer.swayFadeFactor || 0.0) + delta / 3.0);

      // AI Spinout Physics

      if (racer.spinoutTime > 0.0) {

        racer.spinoutTime -= delta;

        racer.spinAngle = (racer.spinAngle || 0.0) + racer.spinoutVelocity * delta;

        racer.spinoutVelocity *= (1.0 - delta * 2.2);

        racer.speed = Math.max(0.0, racer.speed - delta * 15.0);

        spawnExhaustSmoke(racer.mesh.position, false);

      } else if (racer.spinAngle !== 0.0) {

        racer.spinAngle = THREE.MathUtils.lerp(racer.spinAngle, 0.0, delta * 8.0);

        if (Math.abs(racer.spinAngle) < 0.02) racer.spinAngle = 0.0;

      }

      let target = calculateAIPace(racer, baseSpeed);

      if (racer.tyreLife === undefined) racer.tyreLife = 100.0;

      if (racer.tyreLife < 35.0 && (maxLaps - racer.completedLaps >= 1)) {

        racer.willPitThisLap = true;

      }

      target *= getTyreGripMultiplier(racer);

      let hasLappingCarBehind = false;

      const myScore = getRacerScore(racer);

      racers.forEach(other => {

        if (other === racer) return;

        const rel = getLapRelation(other, racer);

        if (rel === "A_LAPPING_B") {

          const otherScore = getRacerScore(other);

          const scoreDiff = otherScore - myScore;

          const distBehind = scoreDiff * 1800;

          if (distBehind > 0.0 && distBehind < 28.0) {

            hasLappingCarBehind = true;

          }

        }

      });

      if (hasLappingCarBehind) {

        racer.blueFlagActive = true;

        target = Math.min(target, 28.0);

      }

      if (racer.spinoutTime <= 0.0) {

        if (racer.boostTime > 0.0) {

          target = baseSpeed * 1.35;

          racer.boostTime -= delta;

          spawnExhaustSmoke(racer.mesh.position, true);

        }

        // 🏎️ AI ERS Battery & Overtake Mode logic

        if (racer.ersBatteryLevel === undefined) racer.ersBatteryLevel = 100.0;

        if (racer.ersPower === undefined) racer.ersPower = 0.0;

        if (window.f1RegulationEra === '2026') {

          let isEligible = false;

          const sorted = [...racers].sort((a, b) => getRacerScore(b) - getRacerScore(a));

          const idx = sorted.indexOf(racer);

          if (idx > 0) {

            const ahead = sorted[idx - 1];

            const diff = getRacerScore(ahead) - getRacerScore(racer);

            const gapSecs = diff * 20.0;

            isEligible = gapSecs <= 1.0;

          }

          if (racer.ersEnergy === undefined) racer.ersEnergy = ERS_MAX_ENERGY;

          const energyRatio = racer.ersEnergy / ERS_MAX_ENERGY;

          let powerFactor = 1.0;

          if (energyRatio < 0.25) {

            powerFactor = Math.max(0.0, energyRatio / 0.25);

          }

          const isStraight = (racer.currentOffset >= 0.02 && racer.currentOffset <= 0.22) || (racer.currentOffset >= 0.50 && racer.currentOffset <= 0.70);

          if (isEligible && isStraight && racer.ersEnergy > 0.8 && !safetyCarActive) {

            racer.overtakeModeActive = true;

          }

          // Determine ERS target power deployment based on battery level & modes

          let targetErsPower = 0.0;

          if (racer.ersEnergy > 0.0 && !safetyCarActive) {

            if (racer.overtakeModeActive || (racer.posRank && racer.posRank > 4)) {

              // ATTACK mode: full power on straights

              if (isStraight) targetErsPower = 1.0 * powerFactor;

            } else {

              // BALANCED mode: partial power on straights

              if (isStraight) targetErsPower = 0.45 * powerFactor;

            }

          }

          // Progressive ERS power deployment lerp

          racer.ersPower = THREE.MathUtils.lerp(racer.ersPower, targetErsPower, 3.0 * delta);

          // Drain ERS battery in Megajoules (MJ)

          if (racer.ersPower > 0.05) {

            const actualPowerKW = (racer.overtakeModeActive ? 120.0 : 60.0) * racer.ersPower;

            const powerMW = actualPowerKW / 1000.0;

            const energyUsedMJ = powerMW * delta * ERS_GAME_ENERGY_SCALE;

            racer.ersEnergy = Math.max(0.0, racer.ersEnergy - energyUsedMJ);

            if (racer.ersEnergy <= 0.0) {

              racer.overtakeModeActive = false;

            }

          }

          // ERS Regen / Harvesting (KERS)

          if (target < racer.speed && racer.speed > 20.0) {

            // Recharging under braking (MGU-K regen: up to 22% battery / 0.88 MJ per second)

            const speedFactor = Math.min(racer.speed / 75.0, 1.0);

            const harvestRateMJ = 0.88 * speedFactor;

            racer.ersEnergy = Math.min(ERS_MAX_ENERGY, racer.ersEnergy + harvestRateMJ * delta);

          } else if (racer.speed > 10.0) {

            // Coasting regen (0.4% battery / 0.016 MJ per second)

            const coastRateMJ = 0.016;

            racer.ersEnergy = Math.min(ERS_MAX_ENERGY, racer.ersEnergy + coastRateMJ * delta);

          }

          racer.ersBatteryLevel = (racer.ersEnergy / ERS_MAX_ENERGY) * 100.0;

        }

        // ── DIFFICULTY CONFIG & AI PROFILES ─────────────────────────────

        const DIFFICULTY_CONFIG = {

          0: { brakingMargin: 0.040, paceError: 0.08, overtakeAggression: 0.45, baseSpeedMult: 0.95 },

          1: { brakingMargin: 0.033, paceError: 0.04, overtakeAggression: 0.65, baseSpeedMult: 1.0 },

          2: { brakingMargin: 0.029, paceError: 0.015, overtakeAggression: 0.85, baseSpeedMult: 1.04 },

          3: { brakingMargin: 0.025, paceError: 0.005, overtakeAggression: 0.96, baseSpeedMult: 1.08 }

        };

        const config = DIFFICULTY_CONFIG[activeDifficulty] || DIFFICULTY_CONFIG[1];

        // Apply base speed multiplier from difficulty

        target *= config.baseSpeedMult;

        // ── Smooth Corner Braking Spline ────────────────────────────────

        let cornerSpeedLimit = Infinity;

        const brakingSkillVal = (racer.aiProfile && racer.aiProfile.brakingSkill) ? racer.aiProfile.brakingSkill : 0.85;

        // brakingConfidence: skilled drivers brake later (>1.0) and carry more speed through corners

        const brakingConfidence = THREE.MathUtils.lerp(0.90, 1.12, brakingSkillVal);

        for (const corner of AI_BRAKING_ZONES) {

          const distToStart = ((corner.from - racer.currentOffset) + 1.0) % 1.0;

          const brakingDist = config.brakingMargin;

          if (distToStart < brakingDist) {

            const factor = distToStart / brakingDist; // 1.0 down to 0.0

            const cornerLimit = corner.maxSpeed * brakingConfidence * (1.0 + (activeDifficulty - 1) * 0.04);

            const interpolatedLimit = THREE.MathUtils.lerp(cornerLimit, target, factor);

            cornerSpeedLimit = Math.min(cornerSpeedLimit, interpolatedLimit);

          } else if (racer.currentOffset >= corner.from && racer.currentOffset <= corner.to) {

            const cornerLimit = corner.maxSpeed * brakingConfidence * (1.0 + (activeDifficulty - 1) * 0.04);

            cornerSpeedLimit = Math.min(cornerSpeedLimit, cornerLimit);

          }

        }

        target = Math.min(target, cornerSpeedLimit);

        // Safety Car speed limit

        if (safetyCarActive) {

          target = 13.8;

        }

        // Red Flag: ALL cars must slow to a complete stop

        if (redFlagActive) {

          target = 0.0;

          racer.speed = Math.max(0.0, racer.speed - delta * 18.0);

        }

        // Predictive collision avoidance and gap-keeping is handled at the start of the physics loop

        // 🏁 Apply AI personality: speed, consistency, mistake rate, flag compliance

        target = applyPersonalityToAI(racer, target, delta);

        // Apply Damage Speed Penalty to AI karts (up to 30% speed loss at 100% damage)

        const racerDmg = racer.damage || 0.0;

        const dmgSpeedFactor = 1.0 - (racerDmg / 100.0) * 0.30;

        target *= dmgSpeedFactor;

        // Calculate non-linear acceleration factor

        const speedRatio = Math.max(0.0, Math.min(1.0, Math.abs(racer.speed) / Math.max(1.0, target)));

        const accelerationFactor = 1.0 - Math.pow(speedRatio, 1.7);

        // Base AI acceleration — matched to player's gear-scaled accel potential

        let aiAccel = 42.0;

        // ERS boost acceleration based on battery energy state

        let ersAccelBoost = 0.0;

        if (racer.overtakeModeActive) {

          ersAccelBoost = 42.0;

        } else if (racer.ersPower > 0.1) {

          ersAccelBoost = 18.0;

        }

        if (racer.ersBatteryLevel >= 60.0) {

          ersAccelBoost *= 1.0;

        } else if (racer.ersBatteryLevel >= 25.0) {

          ersAccelBoost *= 0.60;

        } else if (racer.ersBatteryLevel > 0.1) {

          ersAccelBoost *= 0.25;

        } else {

          ersAccelBoost = 0.0; // Empty battery

        }

        // B8: AI Collision Avoidance (Moved up to apply speed limits correctly before physics update)
        let closestAhead = null;
        let minGapAhead = Infinity;
        avoidanceOffset = 0.0;

        // Enhanced lookahead: speed-dependent distance (detects obstacles well in advance)
        const lookaheadDist = Math.max(75.0, racer.speed * 1.5);

        racers.forEach(other => {
          if (other === racer) return;
          if (other.isTrackActive === false || other.qualifyingState === "GARAGE") return;

          const myInPit = racer.inPitLane || racer.isPitting;
          const otherInPit = other.inPitLane || other.isPitting;
          if (myInPit !== otherInPit) return;

          const gap = getSignedTrackGap(racer, other);
          if (gap > 0.0 && gap < lookaheadDist) {
            if (gap < minGapAhead) {
              minGapAhead = gap;
              closestAhead = other;
            }
          }
        });

        let emergencyBrake = false;

        if (closestAhead) {
          const latDiff = Math.abs(racer.sideOffset - closestAhead.sideOffset);
          const isHazardStopped = (closestAhead.speed < 15.0);

          if (isHazardStopped) {
            // 🛑 STATIONARY / CRASHED OBSTACLE AVOIDANCE & EMERGENCY BRAKING
            // Steer decisively toward the clear side of the track
            const clearSide = (closestAhead.sideOffset >= 0) ? -4.5 : 4.5;
            avoidanceOffset = clearSide;
            racer.avoidanceSide = (closestAhead.sideOffset >= 0) ? "LEFT" : "RIGHT";
            racer.avoidanceCommitTimer = 1.2;

            if (minGapAhead < 45.0 && latDiff < 3.2) {
              // Lane is directly obstructed ahead: slam emergency brakes to avoid rear-ending!
              target = 0.0;
              emergencyBrake = true;
            } else if (minGapAhead < 25.0) {
              target = Math.min(target, 12.0);
              emergencyBrake = true;
            } else if (minGapAhead < 60.0) {
              target = Math.min(target, 35.0);
            }
          } else {
            // Normal dynamic following and collision avoidance
            const pred = predictCollision(racer, closestAhead);
            const risk = getCollisionRisk(pred);

            if (risk === "CAUTION") {
              target = Math.min(target, closestAhead.speed * 0.98);
            } else if (risk === "HIGH") {
              target = Math.min(target, closestAhead.speed * 0.88);
              if (racer.avoidanceCommitTimer === undefined) racer.avoidanceCommitTimer = 0.0;
              if (racer.avoidanceSide === undefined || racer.avoidanceSide === "NONE") {
                racer.avoidanceSide = (closestAhead.sideOffset > 0) ? "LEFT" : "RIGHT";
                racer.avoidanceCommitTimer = 0.8;
              }
              avoidanceOffset = racer.avoidanceSide === "LEFT" ? -2.2 : 2.2;
            } else if (risk === "EMERGENCY") {
              target = Math.min(target, closestAhead.speed * 0.70);
              emergencyBrake = true;
              if (racer.avoidanceCommitTimer === undefined || racer.avoidanceSide === "NONE") {
                racer.avoidanceSide = (closestAhead.sideOffset > 0) ? "LEFT" : "RIGHT";
                racer.avoidanceCommitTimer = 0.8;
              }
              avoidanceOffset = racer.avoidanceSide === "LEFT" ? -3.8 : 3.8;
            }
          }

          if (racer.avoidanceCommitTimer > 0.0) {
            racer.avoidanceCommitTimer -= delta;
            if (racer.avoidanceCommitTimer <= 0.0) {
              racer.avoidanceSide = "NONE";
            }
          }
        }

        let accel = aiAccel * accelerationFactor;

        // Add progressive ERS boost
        accel += (racer.ersPower * ersAccelBoost) * accelerationFactor;

        if (racer.speed < target) {
          racer.speed = Math.min(target, racer.speed + accel * delta);
        } else {
          // Decelerate (braking/coasting)
          let decelRate = (target < racer.speed * 0.9) ? 42.0 : 25.0;
          if (emergencyBrake) {
            decelRate = 125.0; // FULL EMERGENCY BRAKING — stops before collision!
          }
          racer.speed = Math.max(target, racer.speed - decelRate * delta);
        }

      } else {

        target = 0.0;

        racer.speed = Math.max(0.0, racer.speed - delta * 15.0);

      }

      // Calculate AI gear dynamically based on current speed

      let aiGear = 1;

      if (racer.speed < 17.5) aiGear = 1;

      else if (racer.speed < 27.5) aiGear = 2;

      else if (racer.speed < 36.25) aiGear = 3;

      else if (racer.speed < 45.0) aiGear = 4;

      else if (racer.speed < 55.0) aiGear = 5;

      else if (racer.speed < 67.5) aiGear = 6;

      else if (racer.speed < 80.0) aiGear = 7;

      else aiGear = 8;

      racer.currentGear = aiGear;

      // Visual DRS flap / Active Aero wing animation for AI karts!

      if (racer.mesh && racer.mesh.drsFlap) {

        let isWingOpen = false;

        const isStraight = (racer.currentOffset >= 0.02 && racer.currentOffset <= 0.22) || (racer.currentOffset >= 0.50 && racer.currentOffset <= 0.70);

        if (window.f1RegulationEra === '2026') {

          isWingOpen = isStraight && !safetyCarActive;

        } else {

          let isEligible = false;

          const sorted = [...racers].sort((a, b) => getRacerScore(b) - getRacerScore(a));

          const idx = sorted.indexOf(racer);

          if (idx > 0) {

            const ahead = sorted[idx - 1];

            const diff = getRacerScore(ahead) - getRacerScore(racer);

            const gapSecs = diff * 20.0;

            isEligible = gapSecs <= 1.0;

          }

          isWingOpen = isStraight && isEligible && !safetyCarActive;

        }

        const targetRot = isWingOpen ? -Math.PI / 6 : 0.0;

        racer.mesh.drsFlap.rotation.x = THREE.MathUtils.lerp(

          racer.mesh.drsFlap.rotation.x,

          targetRot,

          delta * 6.0

        );

      }

      // AI Pit Stop Spline-based strategy

      if (racer.isPitting) {

        const totalBoxesAI = F1_TEAMS.length;

        const stopT = 0.30 + (racer.teamIndex / Math.max(1, totalBoxesAI - 1)) * 0.40;

        let limit = 11.0; // Pit limiter (≈40 km/h)

        let collisionSpeedLimit = limit;

        if (racer.pitStopHoldTimer > 0.0) {

          racer.pitStopHoldTimer -= delta;

          collisionSpeedLimit = 0.0;

          if (racer.pitStopHoldTimer <= 0.0 && racer.hasStoppedAtBox) {

            if (currentSessionIndex === 0 || currentSessionIndex === 1) {

              racer.isPitting        = false;

              racer.qualifyingState  = "GARAGE";

              racer.speed            = 0.0;

              racer.tyreLife         = 100.0;

              racer.ersEnergy        = ERS_MAX_ENERGY;

              // FULL DEACTIVATION: remove car from track simulation entirely

              racer.isTrackActive    = false;

              racer.collisionEnabled = false;

              // Position inside garage and keep visible
              const totalBoxes = F1_TEAMS.length;
              const boxT = 0.30 + (racer.teamIndex / Math.max(1, totalBoxes - 1)) * 0.40;
              racer.pitProgress = boxT;
              if (pitCurve && racer.mesh) {
                const pt = pitCurve.getPointAt(boxT);
                const tang = pitCurve.getTangentAt(boxT).normalize();
                const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
                racer.mesh.position.copy(pt.clone().add(norm.multiplyScalar(17.0)));
                racer.mesh.lookAt(pt.clone().add(tang));
              }

              racer.currentOffset    = 0.0;

              if (currentSessionIndex === 1) {

                racer.qualifyingReleaseTime = 20.0 + Math.random() * 120.0;

                racer.qualifyingTimedLapsRemaining = 2 + Math.floor(Math.random() * 2);

              } else {

                racer.qualifyingReleaseTime = 15.0 + Math.random() * 45.0;

                racer.qualifyingTimedLapsRemaining = 4 + Math.floor(Math.random() * 3);

              }

              return;

            }

          }

        } else {

          const tProgress = Math.min(1.0, racer.pitProgress);

          racers.forEach(other => {

            if (other === racer) return;

            // Skip inactive cars in nearby check

            if (other.isTrackActive === false) return;

            const otherPitting = other.isPlayer ? isPitting : (other.isPitting || false);

            const otherProgress = other.isPlayer ? pitProgress : (other.pitProgress || 0.0);

            if (otherPitting) {

              const diff = otherProgress - tProgress;

              if (diff > 0.0 && diff < 0.08) {

                const dist = racer.mesh.position.distanceTo(other.mesh.position);

                if (dist < 8.0) {

                  const targetSpeed = other.isPlayer ? playerKart.speed : other.speed;

                  collisionSpeedLimit = Math.min(collisionSpeedLimit, targetSpeed * 0.95);

                  if (dist < 4.8) {

                    collisionSpeedLimit = 0.0; // Hard brake!

                  }

                }

              }

            }

          });

        }

        racer.speed = collisionSpeedLimit;

        if (racer.speed > 0.0) {

          racer.pitProgress += (racer.speed * delta) / pitCurve.getLength();

        }

        const tProgress = Math.min(1.0, racer.pitProgress);

        const pos = pitCurve.getPointAt(tProgress);

        const tang = pitCurve.getTangentAt(tProgress).normalize();

        const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

        let lateralOffset = 0.0;

        const transitionWindow = 0.11;

        let yawAngle = 0.0;

        if (tProgress < stopT) {

          if (tProgress > stopT - transitionWindow) {

            const factor = (tProgress - (stopT - transitionWindow)) / transitionWindow;

            const tSmooth = factor * factor * (3 - 2 * factor);

            lateralOffset = tSmooth * 6.0;

            yawAngle = Math.sin(factor * Math.PI) * 0.11;

          } else {

            lateralOffset = 0.0;

          }

        } else {

          if (tProgress < stopT + transitionWindow) {

            const factor = (tProgress - stopT) / transitionWindow;

            const tSmooth = factor * factor * (3 - 2 * factor);

            lateralOffset = 6.0 - tSmooth * 6.0;

            yawAngle = -Math.sin(factor * Math.PI) * 0.11;

          } else {

            lateralOffset = 0.0;

          }

        }

        const finalPos = pos.clone().add(norm.multiplyScalar(lateralOffset));

        racer.mesh.position.copy(finalPos);

        const dirVec = tang.clone();

        if (tProgress > stopT - transitionWindow && tProgress < stopT) {

          const steerDir = norm.clone().multiplyScalar(0.4);

          dirVec.add(steerDir).normalize();

        } else if (tProgress > stopT && tProgress < stopT + transitionWindow) {

          const steerDir = norm.clone().multiplyScalar(-0.4);

          dirVec.add(steerDir).normalize();

        }

        racer.mesh.lookAt(finalPos.clone().add(dirVec));

        racer.mesh.rotateY(yawAngle);

        if (tProgress >= stopT && !racer.hasStoppedAtBox) {

          racer.hasStoppedAtBox = true;

          racer.pitStopHoldTimer = 2.2; // 2.2s quick AI tyre change

          racer.speed = 0.0;

        }

        if (racer.pitProgress >= 1.0) {

          racer.isPitting = false;

          racer.damage = 0.0; // Reset damage on pit stop!

          racer.frontWingAttached = true;

          racer.rearWingAttached = true;

          restoreCarWings(racer); // Restore wing models!

          racer.currentOffset = 0.06; // merge back on track straight

          racer.lapsSincePit = 0;

          // Reset tyre life, change compound randomly, and update tyre stripe color
          const compounds = ["soft", "medium", "hard"];
          racer.tyreCompound = compounds[Math.floor(Math.random() * 3)];
          racer.tyreLife = 100.0;
          if (typeof window.updateCarTyreColor === 'function') {
            window.updateCarTyreColor(racer);
          }

        }

        return; // skip track AI physics

      }

      // Enter Pit Lane if scheduled to pit this lap

      if (racer.currentOffset >= 0.982 && racer.willPitThisLap && !racer.isPitting) {

        racer.isPitting = true;

        racer.pitProgress = 0.0;

        racer.hasStoppedAtBox = false;

        racer.pitStopHoldTimer = 0.0;

        racer.willPitThisLap = false;

        racer.lapsSincePit = 0;

      }

      const step = (racer.speed * delta) / 1800;

      const oldOffset = racer.currentOffset;

      // Clamp offset to [0,1] range before modulo to prevent negative-value getPointAt crashes

      const safeOffset = Math.max(0.0, Math.min(1.0, racer.currentOffset));

      racer.currentOffset = (safeOffset + step + 1.0) % 1.0;

      // Track lapsSincePit for pit strategy (lap counting now done by updateCarLap in animate loop)

      if (oldOffset > 0.95 && racer.currentOffset < 0.05) {

        racer.lapsSincePit = (racer.lapsSincePit || 0) + 1;

        // Scale pit stop lap target dynamically based on race length

        const targetPitLap = Math.max(1, Math.floor(maxLaps * 0.45));

        if (racer.lapsSincePit >= targetPitLap && Math.random() < 0.40) {

          racer.willPitThisLap = true;

        }

      }

      const safeCurrentOffset = Math.max(0.0, Math.min(1.0, racer.currentOffset));

      const point = trackCurve.getPointAt(safeCurrentOffset);

      const tangent = trackCurve.getTangentAt(safeCurrentOffset);

      if (!point || !tangent) return; // defensive: should never happen with clamped offset

      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);

      if (normal.lengthSq() > 0.000001) {

        normal.normalize();

      } else {

        normal.set(1, 0, 0);

      }

            // ── ADVANCED RACING LINE, DEFENDING, OVERTAKING & PREDICITIVE COLLISION AVOIDANCE ──
      // B2: Simple persistent driver style
      if (!racer.aiStyle) {
        const idx = racers.indexOf(racer);
        const agg = 0.55 + ((idx * 7) % 38) / 100; // range 0.55 to 0.92
        const def = 0.50 + ((idx * 11) % 41) / 100; // range 0.50 to 0.90
        const con = 0.70 + ((idx * 13) % 27) / 100; // range 0.70 to 0.96
        racer.aiStyle = {
          aggression: agg,
          defence: def,
          consistency: con
        };
      }

      const aggression = racer.aiStyle.aggression;
      const defenceSkill = racer.aiStyle.defence;

      // B3: Competitive pace multiplier (target speed)
      // Base pace calculation is already done at the top of updateAIPysics: target = calculateAIPace(racer, baseSpeed)
      const paceMultiplier = 0.97 + aggression * 0.06;
      target *= paceMultiplier;

      // Clamp target speed using existing limits
      const maxLimit = racer.boostTime > 0.0 ? baseSpeed * 1.35 : baseSpeed * 1.15;
      target = Math.min(target, maxLimit);

      // B7: Declare defensive offsets and states locally
      let defenceOffset = 0.0;
      let overtakeOffset = 0.0;

      // We only run race tactical logic if not in pit, not in formation, and safety car is not active
      const inPit = racer.inPitLane || racer.isPitting;
      const isFormation = window.formationLapActive;

      if (racer.pitExitMergeHold) {
        let alongsideTraffic = false;
        racers.forEach(other => {
          if (other === racer) return;
          if (other.isTrackActive === false || other.qualifyingState === "GARAGE") return;
          if (other.inPitLane || other.isPitting) return;

          const gap = Math.abs(getSignedTrackGap(racer, other));
          if (gap < 18.0) {
            alongsideTraffic = true;
          }
        });

        if (!alongsideTraffic) {
          racer.pitExitMergeHold = false;
        } else {
          // Keep target side offset to the merge side
          racer.targetSideOffset = racer.sideOffset;
        }
      }

      if (!inPit && !isFormation && !safetyCarActive && !racer.pitExitMergeHold) {
        // B4: Find closest active car ahead using absolute progress
        let carAhead = null;
        let gapAhead = Infinity;
        const myProgress = racer.completedLaps + racer.currentOffset;

        racers.forEach(other => {
          if (other === racer) return;
          if (other.isTrackActive === false || other.qualifyingState === "GARAGE") return;

          const myInPit = racer.inPitLane || racer.isPitting;
          const otherInPit = other.inPitLane || other.isPitting;
          if (myInPit !== otherInPit) return;

          let otherProgress = other.completedLaps + other.currentOffset;
          let gap = otherProgress - myProgress;
          if (gap < -0.5) {
            gap += maxLaps || 100; 
          }
          if (gap > 0.0 && gap < gapAhead) {
            gapAhead = gap;
            carAhead = other;
          }
        });

        const gapMeters = gapAhead * 1800;
        const baseAttackRange = 35.0;
        const attackRange = baseAttackRange * (0.8 + aggression * 0.4);

        // B5: Overtaking
        if (carAhead && gapMeters < attackRange) {
          const now = clock.getElapsedTime();
          if (racer.aiMoveUntil === undefined) racer.aiMoveUntil = 0.0;
          if (racer.aiMoveSide === undefined) racer.aiMoveSide = 0;

          if (now > racer.aiMoveUntil) {
            // Choose overtake side
            const leftTarget = carAhead.sideOffset - 2.8;
            const rightTarget = carAhead.sideOffset + 2.8;

            let leftSafe = leftTarget >= -7.6;
            let rightSafe = rightTarget <= 7.6;

            // Check nearby cars (within 12 meters longitudinally)
            racers.forEach(other => {
              if (other === racer || other === carAhead) return;
              if (other.isTrackActive === false || other.qualifyingState === "GARAGE") return;

              const myInPit = racer.inPitLane || racer.isPitting;
              const otherInPit = other.inPitLane || other.isPitting;
              if (myInPit !== otherInPit) return;

              const otherDist = Math.abs((other.completedLaps + other.currentOffset - myProgress) * 1800);
              if (otherDist < 12.0) {
                if (leftSafe && Math.abs(other.sideOffset - leftTarget) < 1.8) {
                  leftSafe = false;
                }
                if (rightSafe && Math.abs(other.sideOffset - rightTarget) < 1.8) {
                  rightSafe = false;
                }
              }
            });

            let chosenSide = 0;
            if (leftSafe && rightSafe) {
              // Choose side farther from car ahead
              chosenSide = carAhead.sideOffset >= racer.sideOffset ? -1 : 1;
            } else if (leftSafe) {
              chosenSide = -1;
            } else if (rightSafe) {
              chosenSide = 1;
            }

            if (chosenSide !== 0) {
              racer.aiMoveSide = chosenSide;
              racer.aiMoveUntil = now + 0.7 + aggression * 0.5; // Short overtake commitment (B6)
            } else {
              racer.aiMoveSide = 0;
              racer.aiMoveUntil = now + 0.3;
            }
          }

          if (racer.aiMoveSide !== 0) {
            overtakeOffset = racer.aiMoveSide * 2.8;
          }
        }

        // B7: Simple Defence
        let carBehind = null;
        let gapBehind = Infinity;

        racers.forEach(other => {
          if (other === racer) return;
          if (other.isTrackActive === false || other.qualifyingState === "GARAGE") return;

          const myInPit = racer.inPitLane || racer.isPitting;
          const otherInPit = other.inPitLane || other.isPitting;
          if (myInPit !== otherInPit) return;

          let otherProgress = other.completedLaps + other.currentOffset;
          let gap = myProgress - otherProgress;
          if (gap < -0.5) {
            gap += maxLaps || 100;
          }
          if (gap > 0.0 && gap < gapBehind) {
            gapBehind = gap;
            carBehind = other;
          }
        });

        const gapBehindMeters = gapBehind * 1800;
        const defenceRange = 25.0;

        if (carBehind && gapBehindMeters < defenceRange && overtakeOffset === 0.0) {
          const now = clock.getElapsedTime();
          if (racer.aiDefendUntil === undefined) racer.aiDefendUntil = 0.0;
          if (racer.aiDefendSide === undefined) racer.aiDefendSide = 0;

          if (now > racer.aiDefendUntil) {
            if (Math.random() < defenceSkill * 0.6) {
              const sideDiff = carBehind.sideOffset - racer.sideOffset;
              racer.aiDefendSide = sideDiff >= 0.0 ? 1 : -1;
              racer.aiDefendUntil = now + 0.8 + Math.random() * 0.5; // 0.8 to 1.3 seconds commitment
            } else {
              racer.aiDefendSide = 0;
              racer.aiDefendUntil = now + 0.4;
            }
          }

          if (racer.aiDefendSide !== 0) {
            const DEFENCE_OFFSET_AMOUNT = 1.4;
            defenceOffset = racer.aiDefendSide * DEFENCE_OFFSET_AMOUNT;
          }
        }

      }

      // B9: Final target offset must be built once
      let normalTargetOffset = 0.0;

      function getUpcomingTrackCurvature(offset) {
        if (!trackCurve) return 0.0;
        const t1 = trackCurve.getTangentAt(offset % 1.0).normalize();
        const t2 = trackCurve.getTangentAt((offset + 0.016) % 1.0).normalize();
        return (t1.x * t2.z - t1.z * t2.x);
      }
      const upcomingCurvature = getUpcomingTrackCurvature(racer.currentOffset);
      let optimalLineOffset = -upcomingCurvature * 140.0;
      optimalLineOffset = THREE.MathUtils.clamp(optimalLineOffset, -5.2, 5.2);

      normalTargetOffset = optimalLineOffset;

      const driverSeed = (racer.name.charCodeAt(0) % 5) - 2;
      normalTargetOffset += driverSeed * 0.35 * racer.swayFadeFactor;

      if (!racer.pitExitMergeHold) {
        let finalTargetOffset = normalTargetOffset + overtakeOffset + defenceOffset + avoidanceOffset;
        racer.targetSideOffset = THREE.MathUtils.clamp(finalTargetOffset, -7.6, 7.6);
      }

      if (racer.sideOffset === undefined) racer.sideOffset = 0.0;
      const steerRate = (avoidanceOffset !== 0.0) ? 9.5 : 3.8;
      racer.sideOffset = THREE.MathUtils.lerp(racer.sideOffset, racer.targetSideOffset, delta * steerRate);

      point.add(normal.multiplyScalar(racer.sideOffset));

      // AI Wing damage visuals

      const rDmg = racer.damage || 0.0;

      if (rDmg > 35.0 && racer.frontWingAttached !== false) {

        racer.frontWingAttached = false;

        detachPart(racer, "frontWing");

      }

      if (rDmg > 65.0 && racer.rearWingAttached !== false) {

        racer.rearWingAttached = false;

        detachPart(racer, "rearWing");

        detachPart(racer, "drsFlap");

      }

      if (!Number.isNaN(point.x) && !Number.isNaN(point.y) && !Number.isNaN(point.z)) {

        racer.mesh.position.copy(point);

      }

      racer.mesh.lookAt(point.clone().add(tangent));

      // Add slight sway rotation visually + spinout angle!

      racer.mesh.rotateY(Math.sin(clock.getElapsedTime() * 0.8 + racer.mesh.id) * 0.08 + (racer.spinAngle || 0.0));

    });

    updateRacePositions();

    // Overtake cheers logic with cooldown timer

    if (playerKart) {

      if (playerKart.posRank < lastPosRank) {

        const now = clock.getElapsedTime();

        if (now - lastOvertakeCheerTime > 40.0) {

          speakEngineerRadio("Great move! Keep pushing, good going!");

          lastOvertakeCheerTime = now;

        }

      }

      lastPosRank = playerKart.posRank;

    }

  }

  // Dummy debug stubs to support UI hooks gracefully
  window.cycleAIDebugCar = () => {};
  window.updateAIDebugPanel = () => {};

// ═══ game-07-hazards-collision.js ═══
  // --- Global Collider Registry for Explicit Collision Checking ---
  window.activeColliders = new Set();

  window.registerCollider = function(object, colliderType) {
    if (!object) return;
    object.userData = object.userData || {};
    object.userData.colliderType = colliderType;
    window.activeColliders.add(object);
  };

  window.unregisterCollider = function(object) {
    if (!object) return;
    window.activeColliders.delete(object);
  };

  window.deactivateTrackCar = function(car) {
    car.isTrackActive = false;
    car.collisionEnabled = false;
    if (car.mesh) {
      window.unregisterCollider(car.mesh);
      car.mesh.visible = true; // Keep visible parked in garage bay
    }
  };

  window.activateTrackCar = function(car) {
    if (!car.mesh) return false;
    car.isTrackActive = true;
    car.collisionEnabled = true;
    car.mesh.visible = true;
    window.registerCollider(car.mesh, "CAR");
    return true;
  };

  function updateHazardsAndRockets(delta) {
    rockets.forEach((rocket, idx) => {
      rocket.currentOffset += rocket.speed;
      if (rocket.currentOffset >= 1.0) {
        scene.remove(rocket.mesh);
        rockets.splice(idx, 1);
        return;
      }
      const point = trackCurve.getPointAt(rocket.currentOffset);
      rocket.mesh.position.copy(point);
      const tangent = trackCurve.getTangentAt(rocket.currentOffset);
      rocket.mesh.lookAt(point.clone().add(tangent));
      spawnExhaustSmoke(rocket.mesh.position, true);

      racers.forEach(racer => {
        // Skip garage/inactive cars - they cannot be hit by rockets
        if (!racer.isTrackActive) return;
        if (racer.mesh.position.distanceTo(point) < 2.0) {
          triggerSpinout(racer);
          scene.remove(rocket.mesh);
          rockets.splice(idx, 1);
        }
      });
    });
  }

  function updateCollisionDetection() {
    // --- Authentic 3D F1 Vehicle-to-Vehicle Physics Collisions & Damage ---
    for (let i = 0; i < racers.length; i++) {
      for (let j = i + 1; j < racers.length; j++) {
        const racerI = racers[i];
        const racerJ = racers[j];

        // Guard: skip inactive or invisible cars
        if (!racerI.mesh || !racerJ.mesh) continue;
        if (!racerI.mesh.visible || !racerJ.mesh.visible) continue;
        if (racerI.isTrackActive === false || racerJ.isTrackActive === false) continue;
        if (racerI.qualifyingState === "GARAGE" || racerJ.qualifyingState === "GARAGE") continue;

        // Isolate pit lane and track traffic
        const myInPit = racerI.inPitLane || racerI.isPitting;
        const otherInPit = racerJ.inPitLane || racerJ.isPitting;
        if (myInPit !== otherInPit) continue;

        const posI = racerI.mesh.position;
        const posJ = racerJ.mesh.position;
        const dist3D = posI.distanceTo(posJ);

        // Center-to-center collision distance for authentic F1 cars (length ~4.8m, width ~1.9m)
        const minCollDist = 3.4;
        if (dist3D < minCollDist) {
          // 1. Calculate horizontal separating push vector
          const pushVec = new THREE.Vector3().subVectors(posI, posJ);
          let len = pushVec.length();
          if (len < 0.001) {
            pushVec.set(0.1, 0, 0.1);
            len = pushVec.length();
          }
          pushVec.y = 0;
          pushVec.normalize();

          const overlap = minCollDist - len;

          // Push both cars apart in 3D world space
          if (racerI.isPlayer) {
            posI.addScaledVector(pushVec, overlap * 0.55);
            posJ.addScaledVector(pushVec, -overlap * 0.45);
          } else if (racerJ.isPlayer) {
            posI.addScaledVector(pushVec, overlap * 0.45);
            posJ.addScaledVector(pushVec, -overlap * 0.55);
          } else {
            posI.addScaledVector(pushVec, overlap * 0.50);
            posJ.addScaledVector(pushVec, -overlap * 0.50);
          }

          // Push side offsets apart so AI steering lines react
          const latDiff = (racerI.sideOffset || 0) - (racerJ.sideOffset || 0);
          const pushSide = latDiff >= 0 ? 1 : -1;
          if (racerI.sideOffset !== undefined) racerI.sideOffset += pushSide * overlap * 0.4;
          if (racerJ.sideOffset !== undefined) racerJ.sideOffset -= pushSide * overlap * 0.4;
          if (!racerI.isPlayer) racerI.targetSideOffset = racerI.sideOffset;
          if (!racerJ.isPlayer) racerJ.targetSideOffset = racerJ.sideOffset;

          // 2. Elastic speed exchange and impact force
          const speedDiff = racerI.speed - racerJ.speed;
          const impact = Math.max(Math.abs(speedDiff), overlap * 7.5);

          const impulse = speedDiff * 0.45;
          racerI.speed = Math.max(2.0, racerI.speed - impulse);
          racerJ.speed = Math.max(2.0, racerJ.speed + impulse * 0.6);

          // 3. F1 Component Damage Accumulation
          const addedDamage = Math.max(2.5, impact * 1.35);
          racerI.damage = Math.min(100.0, (racerI.damage || 0.0) + addedDamage);
          racerJ.damage = Math.min(100.0, (racerJ.damage || 0.0) + addedDamage);

          if (racerI.isPlayer) {
            carDamage = racerI.damage;
            updateDamageHUD();
            if (typeof window.triggerGamepadRumble === 'function') {
              window.triggerGamepadRumble(120, 0.7, 0.4);
            }
          }
          if (racerJ.isPlayer) {
            carDamage = racerJ.damage;
            updateDamageHUD();
            if (typeof window.triggerGamepadRumble === 'function') {
              window.triggerGamepadRumble(120, 0.7, 0.4);
            }
          }

          // Visual spark/smoke crash particles
          spawnExhaustSmoke(posI, true);
          spawnExhaustSmoke(posJ, true);

          if (impact > 6.0 && window.ApexAudio) {
            window.ApexAudio.playDriftScreech();
          }

          // 4. Detach wings on significant impact
          if (racerI.damage > 30.0 && racerI.frontWingAttached !== false) {
            racerI.frontWingAttached = false;
            detachPart(racerI, "frontWing");
          }
          if (racerJ.damage > 30.0 && racerJ.frontWingAttached !== false) {
            racerJ.frontWingAttached = false;
            detachPart(racerJ, "frontWing");
          }
          if (racerI.damage > 60.0 && racerI.rearWingAttached !== false) {
            racerI.rearWingAttached = false;
            detachPart(racerI, "rearWing");
            detachPart(racerI, "drsFlap");
          }
          if (racerJ.damage > 60.0 && racerJ.rearWingAttached !== false) {
            racerJ.rearWingAttached = false;
            detachPart(racerJ, "rearWing");
            detachPart(racerJ, "drsFlap");
          }

          // 5. Massive impact spinouts & Yellow Flag / Safety Car
          if (impact > 18.0) {
            if (racerI.isPlayer || Math.random() < 0.5) triggerSpinout(racerI);
            if (racerJ.isPlayer || Math.random() < 0.5) triggerSpinout(racerJ);

            if (typeof window.getSectorForOffset === 'function' && typeof window.setSectorYellow === 'function') {
              const sectorIdx = window.getSectorForOffset(racerI.currentOffset);
              window.setSectorYellow(sectorIdx, 14.0);
            }

            if (currentSessionIndex === 2 && !window.formationLapActive && !isStartingSequence && impact > 32.0 && !safetyCarActive && Math.random() < 0.40) {
              triggerSafetyCar();
            } else if (currentSessionIndex === 2 && !window.formationLapActive && !isStartingSequence && impact > 16.0 && !vscActive && !safetyCarActive && Math.random() < 0.40) {
              deployVSC(15.0);
            }
          }
        }
      }
    }
  }

  // Helper: Deploy safety car
  function triggerSafetyCar() {
    if (currentSessionIndex !== 2) return;
    if (safetyCarActive || isStartingSequence) return;
    // Cooldown: don't re-trigger SC within 120s of last flag event
    const lastFlagTime = window._lastFlagEventTime || 0;
    if ((raceTimer - lastFlagTime) < 120.0 && lastFlagTime > 0) return;
    window._lastFlagEventTime = raceTimer;

    safetyCarActive = true;
    safetyCarTimer = 30.0; // 30 seconds on track (long enough to be meaningful)
    safetyCarOffset = (playerKart.currentOffset + 0.15) % 1.0;

    // Yellow safety car mesh
    safetyCarMesh = createProceduralKartMesh(0xeab308);
    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.25), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
    lightBar.position.set(0, 1.42, 0.35);
    safetyCarMesh.add(lightBar);
    scene.add(safetyCarMesh);

    speakEngineerRadio("Yellow Flag! Safety Car deployed. Queue up behind safety car, no overtaking.", 100);

    updateFlagStrip('yellow');
    showFlagCard('🟡', 'SAFETY CAR',
      'Yellow flag. Queue behind safety car.\nNo overtaking. Reduce speed now.', '#ca8a04', '#000');
    rdShowMessage('SAFETY CAR DEPLOYED — NO OVERTAKING', 6.0, '#eab308');
  }

  function updateDamageHUD() {
    const damVal = document.getElementById('hud-damage');
    if (damVal) {
      damVal.innerText = Math.floor(carDamage) + "%";
      if (carDamage > 60) {
        damVal.style.color = '#ef4444';
      } else if (carDamage > 30) {
        damVal.style.color = '#f59e0b';
      } else {
        damVal.style.color = '#ffffff';
      }
    }
  }

  function triggerSpinout(racer) {
    if (racer.shieldActive) {
      racer.shieldActive = false;
      if (racer.shieldMesh) {
        racer.mesh.remove(racer.shieldMesh);
        racer.shieldMesh = null;
      }
      return;
    }
    racer.spinoutTime = 1.2;
    racer.spinoutVelocity = (Math.random() > 0.5 ? 1 : -1) * (14.0 + Math.random() * 8.0);
    racer.spinAngle = 0.0;
    if (window.ApexAudio) window.ApexAudio.playSpinout();
  }

  // Helper functions for wings detaching & debris
  function restoreCarWings(racer) {
    if (racer.mesh) {
      racer.mesh.traverse(child => {
        if (child.name === "frontWing" || child.name === "rearWing" || child.name === "drsFlap" || child.name === "nose") {
          child.visible = true;
        }
      });
    }
  }
  window.restoreCarWings = restoreCarWings;

  function detachPart(racer, partName) {
    let partMesh = null;
    if (racer.mesh) {
      racer.mesh.traverse(child => {
        if (child.name === partName && child.visible) {
          partMesh = child;
        }
      });
    }
    if (partMesh) {
      partMesh.visible = false;
      spawnDebris(partMesh, racer.mesh.position, racer.speed);
    }
  }

  function spawnDebris(sourceMesh, carPos, carSpeed) {
    if (window.particlesEnabled === false) return;
    const geom = sourceMesh.geometry.clone();
    const mat = sourceMesh.material.clone();
    const mesh = new THREE.Mesh(geom, mat);
    
    mesh.position.copy(carPos);
    mesh.position.y += 0.4;
    scene.add(mesh);
    
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.max(5.0, carSpeed * 0.4);
    const vel = new THREE.Vector3(
      Math.sin(angle) * 3.0,
      5.0 + Math.random() * 5.0,
      -Math.cos(angle) * speed
    );
    
    const rotVel = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8
    );
    
    debrisObjects.push({
      mesh: mesh,
      velocity: vel,
      angularVelocity: rotVel,
      life: 3.5
    });
  }

  function updateDebris(delta) {
    for (let i = debrisObjects.length - 1; i >= 0; i--) {
      const d = debrisObjects[i];
      d.life -= delta;
      if (d.life <= 0) {
        scene.remove(d.mesh);
        debrisObjects.splice(i, 1);
        continue;
      }
      
      d.velocity.y -= 9.8 * delta;
      d.mesh.position.addScaledVector(d.velocity, delta);
      
      if (d.mesh.position.y < 0.15) {
        d.mesh.position.y = 0.15;
        d.velocity.y = -d.velocity.y * 0.4;
        d.velocity.x *= 0.85;
        d.velocity.z *= 0.85;
        d.angularVelocity.multiplyScalar(0.8);
      }
      
      d.mesh.rotateX(d.angularVelocity.x * delta);
      d.mesh.rotateY(d.angularVelocity.y * delta);
      d.mesh.rotateZ(d.angularVelocity.z * delta);
      
      if (d.mesh.material && d.life < 1.0) {
        d.mesh.material.transparent = true;
        d.mesh.material.opacity = d.life;
      }
    }
  }

  function triggerStandingRestart() {
    if (currentSessionIndex !== 2) {
      // console.error("[BLOCKED STANDING RESTART OUTSIDE RACE]", currentSessionIndex);
      // console.trace("[STANDING RESTART CALL STACK]");
      isStartingSequence = false;
      return;
    }
    isStartingSequence = true;
    startingSequenceTime = 0.0;
    
    const overlay = document.getElementById('f1-starting-lights-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.style.display = 'flex';
    }
    
    racers.forEach((racer, idx) => {
      const tPos = 0.0 - idx * 0.012;
      racer.currentOffset = (tPos + 1.0) % 1.0;
      racer.speed = 0.0;
      racer.spinoutTime = 0.0;
      racer.spinAngle = 0.0;
      racer.spinoutVelocity = 0.0;
      
      const side = idx % 2 === 0 ? 1.8 : -1.8;
      racer.sideOffset = side;
      
      if (racer.isPlayer) {
        currentGear = 0; // Neutral
        window.passedCP1 = false;
        window.passedCP2 = false;
      }
      
      racer.frontWingAttached = true;
      racer.rearWingAttached = true;
      restoreCarWings(racer);
    });
    
    speakEngineerRadio("Standing restart. Hold in grid slot and watch the lights.", 100);
    rdShowMessage("RACE CONTROL: STANDING RESTART", 5.0, "#e10600");
  }

  function updatePowerupHUD() {
    const icon = document.getElementById('hud-item-icon');
    const slot = document.getElementById('hud-item-slot');
    if (!icon || !slot) return;

    if (!activePowerup) {
      icon.innerText = "❓";
      slot.classList.remove('active');
    } else {
      slot.classList.add('active');
      if (activePowerup === 'turbo') icon.innerText = "⚡";
      if (activePowerup === 'shield') icon.innerText = "🛡️";
      if (activePowerup === 'rocket') icon.innerText = "🚀";
    }
  }


// ═══ game-08-particles-camera.js ═══
  function updateParticles(delta) {
    updateDebris(delta);
    if (window.particlesEnabled === false) {
      particles.forEach(p => {
        scene.remove(p.mesh);
      });
      particles.length = 0;
      return;
    }
    particles.forEach((p, idx) => {
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      p.mesh.scale.multiplyScalar(0.92);
      p.life -= p.decay;
      if (p.life <= 0.0) {
        scene.remove(p.mesh);
        particles.splice(idx, 1);
      }
    });
  }

  let lastCameraOwner = null;
  window.claimCameraOwner = function(owner) {
    if (owner !== lastCameraOwner) {
      console.warn(
        "[CAMERA OWNER CHANGE]",
        {
          from: lastCameraOwner,
          to: owner,
          session: typeof currentSessionIndex !== 'undefined' ? ["PRACTICE", "QUALIFYING", "RACE"][currentSessionIndex] : null,
          raceState: typeof raceState !== 'undefined' ? raceState : (window.raceState || null),
          formationActive: typeof window.formationLapActive !== 'undefined' ? window.formationLapActive : null,
          inPitLane: (playerKart ? playerKart.inPitLane : null),
          driveOutAutopilot: (playerKart ? playerKart.driveOutAutopilot : null)
        }
      );
      lastCameraOwner = owner;
    }
    window.__cameraOwnerThisFrame = owner;
  };

  function updateCameraFollow() {
    if (postRaceActive || isStartingSequence) return;

    // Live Spectator Broadcast POV for retired/DNF player
    if (window.spectatorModeActive && window.spectatorTargetCar && window.spectatorTargetCar.mesh) {
      camera.up.set(0, 1, 0);
      if (typeof window.claimCameraOwner === 'function') {
        window.claimCameraOwner("SPECTATOR_POV");
      }
      const tCar = window.spectatorTargetCar;
      const tPos = tCar.mesh.position;
      const rotY = tCar.mesh.rotation.y;
      const forward = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)).normalize();
      
      const camPos = tPos.clone()
        .add(forward.clone().multiplyScalar(-5.4))
        .add(new THREE.Vector3(0, 2.1, 0));
      camera.position.lerp(camPos, 0.12);
      camera.lookAt(tPos.clone().add(new THREE.Vector3(0, 0.65, 0)));
      camera.updateProjectionMatrix();

      if (typeof updateSpectatorHUD === 'function') {
        updateSpectatorHUD();
      }
      return;
    }

    const pPos = playerKart.mesh.position;
    
    // Cinematic on-board rollout camera inside garage and exiting through doors (Zero Wall Clipping!)
    const inGarage = (playerKart.qualifyingState === "GARAGE");
    const isExitingGarage = (playerKart.isExitingGarage && (playerKart.sideOffset === undefined || playerKart.sideOffset > 6.0));

    if ((inGarage || isExitingGarage) && pitCurve) {
      camera.up.set(0, 1, 0);
      window.claimCameraOwner("GARAGE_ROLLOUT");

      const hd = playerKart.heading !== undefined ? playerKart.heading : 0;
      const forward = new THREE.Vector3(Math.sin(hd), 0, Math.cos(hd)).normalize();

      // Real F1 Broadcast T-Cam position (mounted at roll-hoop apex, y = 1.18, z = +0.18 forward of airbox)
      // Completely avoids showing any airbox or T-cam box in front of the lens!
      const camPos = pPos.clone()
        .add(forward.clone().multiplyScalar(0.18))
        .add(new THREE.Vector3(0, 1.18, 0));

      if (playerKart.mesh && playerKart.mesh.tCam) {
        playerKart.mesh.tCam.visible = false;
      }
      if (playerKart.mesh && playerKart.mesh.playerArrow) {
        playerKart.mesh.playerArrow.visible = false;
      }

      camera.position.copy(camPos);

      // Look straight forward along car's nosecone through the Halo
      const targetLookAt = pPos.clone()
        .add(forward.clone().multiplyScalar(16.0))
        .add(new THREE.Vector3(0, 0.68, 0));

      camera.lookAt(targetLookAt);
      camera.updateProjectionMatrix();
      return;
    }
    
    if (isPitStopActive) {
      // Cinematic TV pit stop camera angle!
      const tang = pitCurve.getTangentAt(pitProgress).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      // Place camera in fast lane/pit wall zone (inner side, -6.0m from pitCurve) and slightly behind/ahead (-3.0m)
      const camPos = pPos.clone()
        .add(norm.clone().multiplyScalar(-6.0))
        .add(tang.clone().multiplyScalar(-3.0));
      camPos.y = pPos.y + 2.8;
      
      window.claimCameraOwner("PIT_STOP_CINEMATIC");
      camera.position.lerp(camPos, 0.08);
      camera.lookAt(pPos.clone().add(new THREE.Vector3(0, 0.5, 0)));
      camera.updateProjectionMatrix();
      return;
    }

      camera.up.set(0, 1, 0);

    // Car forward direction derived directly from player's vehicle heading (Never flips backward!):
    const hd = playerKart.heading !== undefined ? playerKart.heading : 0;
    const carForward = new THREE.Vector3(Math.sin(hd), 0, Math.cos(hd)).normalize();
    
    const isTcam = (window.cameraDistanceSetting === 'tcam');
    let distMultiplier = -5.4; // default normal (behind car)
    let heightVal = 2.0;       // default normal
    
    if (isTcam) {
      distMultiplier = 0.18; // In front of airbox and T-cam mount looking forward down nose
      heightVal = 1.18;      // Real F1 T-cam cockpit elevation
      if (playerKart.mesh && playerKart.mesh.tCam) {
        playerKart.mesh.tCam.visible = false;
      }
      if (playerKart.mesh && playerKart.mesh.playerArrow) {
        playerKart.mesh.playerArrow.visible = false;
      }
    } else {
      if (playerKart.mesh && playerKart.mesh.tCam) {
        playerKart.mesh.tCam.visible = true;
      }
      if (window.cameraDistanceSetting === 'near') distMultiplier = -3.8;
      else if (window.cameraDistanceSetting === 'far') distMultiplier = -7.0;
      
      if (window.cameraHeightSetting === 'low') heightVal = 1.3;
      else if (window.cameraHeightSetting === 'high') heightVal = 2.8;
    }
    
    // Position camera along car's actual heading vector:
    const backOffset = carForward.clone().multiplyScalar(distMultiplier);
    backOffset.y = heightVal;
 
    const targetCamPos = pPos.clone().add(backOffset);
    window.claimCameraOwner("GAMEPLAY_CHASE");
    
    if (isTcam) {
      camera.position.copy(targetCamPos); // Rock-steady, attached to chassis
    } else {
      camera.position.lerp(targetCamPos, 0.14);
    }
 
    // Dynamic FOV scaling based on speed & base FOV setting
    const maxUpgradeSpeed = 40 + upgrades.speed * 4;
    const speedRatio = Math.min(1.0, Math.abs(playerKart.speed) / maxUpgradeSpeed);
    const baseF = window.baseFOV !== undefined ? window.baseFOV : 65;
    camera.fov = THREE.MathUtils.lerp(baseF, baseF + 13, speedRatio);
    camera.updateProjectionMatrix();
 
    // Camera shake toggle at high speeds
    if (window.cameraShakeSetting !== false && Math.abs(playerKart.speed) > 28.0) {
      const shakeAmt = (Math.random() - 0.5) * 0.04 * speedRatio;
      camera.position.x += shakeAmt;
      camera.position.y += shakeAmt;
    }
 
    if (isTcam) {
      // T-cam looks far ahead along the car's actual nosecone
      const targetLookAt = pPos.clone().add(carForward.clone().multiplyScalar(20.0)).add(new THREE.Vector3(0, 0.75, 0));
      camera.lookAt(targetLookAt);
    } else {
      // Chase camera looks directly ahead through the car
      const targetLookAt = pPos.clone().add(carForward.clone().multiplyScalar(6.0)).add(new THREE.Vector3(0, 0.6, 0));
      camera.lookAt(targetLookAt);
    }
  }

  // Articulated 3D Humanoid Chibi F1 Driver Model
  function createChibiDriverModel(teamColor) {
    const driverGroup = new THREE.Group();
    
    const suitMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.5 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

    // Torso (chest/body root)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.65, 0.28), suitMat);
    torso.position.y = 0.55;
    torso.castShadow = true;
    torso.name = "torso";
    driverGroup.add(torso);

    // Head (Helmet + Visor)
    const headGroup = new THREE.Group();
    headGroup.name = "headGroup";
    headGroup.position.set(0, 0.82, 0);

    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.2 });
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), helmetMat);
    helmet.castShadow = true;
    headGroup.add(helmet);

    const visorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.1), visorMat);
    visor.position.set(0, 0.02, 0.20);
    headGroup.add(visor);
    
    driverGroup.add(headGroup);

    // Arm builder helper
    function createArm(side) {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.name = side + "Shoulder";
      
      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.12), suitMat);
      upperArm.position.y = -0.14;
      upperArm.castShadow = true;
      shoulderPivot.add(upperArm);
      
      const elbowPivot = new THREE.Group();
      elbowPivot.name = side + "Elbow";
      elbowPivot.position.set(0, -0.28, 0);
      upperArm.add(elbowPivot);
      
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), suitMat);
      forearm.position.y = -0.11;
      forearm.castShadow = true;
      elbowPivot.add(forearm);
      
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), gloveMat);
      hand.position.y = -0.22;
      forearm.add(hand);
      
      return shoulderPivot;
    }

    // Leg builder helper
    function createLeg(side) {
      const hipPivot = new THREE.Group();
      hipPivot.name = side + "Hip";
      
      const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), suitMat);
      upperLeg.position.y = -0.16;
      upperLeg.castShadow = true;
      hipPivot.add(upperLeg);
      
      const kneePivot = new THREE.Group();
      kneePivot.name = side + "Knee";
      kneePivot.position.set(0, -0.32, 0);
      upperLeg.add(kneePivot);
      
      const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.12), suitMat);
      lowerLeg.position.y = -0.14;
      lowerLeg.castShadow = true;
      kneePivot.add(lowerLeg);
      
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), bootMat);
      foot.position.set(0, -0.28, 0.04);
      lowerLeg.add(foot);
      
      return hipPivot;
    }

    // Left Arm
    const leftArm = createArm("Left");
    leftArm.position.set(-0.28, 0.25, 0);
    torso.add(leftArm);

    // Right Arm
    const rightArm = createArm("Right");
    rightArm.position.set(0.28, 0.25, 0);
    torso.add(rightArm);

    // Left Leg
    const leftLeg = createLeg("Left");
    leftLeg.position.set(-0.15, -0.32, 0);
    torso.add(leftLeg);

    // Right Leg
    const rightLeg = createLeg("Right");
    rightLeg.position.set(0.15, -0.32, 0);
    torso.add(rightLeg);

    // Animation properties
    driverGroup.animationState = "IDLE";
    driverGroup.animationTime = 0.0;

    // Cache joint references using traverse for high performance
    driverGroup.joints = {
      torso: torso,
      headGroup: headGroup,
      leftShoulder: leftArm,
      leftElbow: leftArm.children[0].children[1],
      rightShoulder: rightArm,
      rightElbow: rightArm.children[0].children[1],
      leftHip: leftLeg,
      leftKnee: leftLeg.children[0].children[1],
      rightHip: rightLeg,
      rightKnee: rightLeg.children[0].children[1]
    };

    return driverGroup;
  }

  // Animation controller set/reset
  function setDriverAnimation(driver, animation) {
    if (!driver) return;
    if (driver.animationState !== animation) {
      driver.animationState = animation;
      driver.animationTime = 0.0;
      // Reset all joints to defaults first to prevent accumulation
      if (driver.joints) {
        Object.values(driver.joints).forEach(j => {
          if (j && j.rotation) j.rotation.set(0, 0, 0);
        });
      }
    }
  }

  // Joint Animation tick function
  function updateDriverAnimation(driver, dt) {
    if (!driver || !driver.joints) return;
    driver.animationTime += dt;
    const t = driver.animationTime;
    const j = driver.joints;

    switch (driver.animationState) {
      case "WALK":
        // Alternate hips and knees
        j.leftHip.rotation.x = Math.sin(t * 8.0) * 0.45;
        j.rightHip.rotation.x = -Math.sin(t * 8.0) * 0.45;
        j.leftKnee.rotation.x = Math.max(0, Math.sin(t * 8.0 + 1.2) * 0.3);
        j.rightKnee.rotation.x = Math.max(0, -Math.sin(t * 8.0 + 1.2) * 0.3);
        // Swinging arms
        j.leftShoulder.rotation.x = -Math.sin(t * 8.0) * 0.35;
        j.rightShoulder.rotation.x = Math.sin(t * 8.0) * 0.35;
        j.leftElbow.rotation.x = -0.15;
        j.rightElbow.rotation.x = -0.15;
        j.torso.position.y = 0.55 + Math.abs(Math.sin(t * 16.0)) * 0.035;
        break;

      case "RUN":
        // Faster and wider motion
        j.leftHip.rotation.x = Math.sin(t * 12.0) * 0.65;
        j.rightHip.rotation.x = -Math.sin(t * 12.0) * 0.65;
        j.leftKnee.rotation.x = Math.max(0, Math.sin(t * 12.0 + 1.2) * 0.55);
        j.rightKnee.rotation.x = Math.max(0, -Math.sin(t * 12.0 + 1.2) * 0.55);
        j.leftShoulder.rotation.x = -Math.sin(t * 12.0) * 0.6;
        j.rightShoulder.rotation.x = Math.sin(t * 12.0) * 0.6;
        j.leftElbow.rotation.x = -0.4;
        j.rightElbow.rotation.x = -0.4;
        j.torso.position.y = 0.55 + Math.abs(Math.sin(t * 24.0)) * 0.06;
        break;

      case "CELEBRATE":
        // Raising arms in V shape, jumping slightly
        j.leftShoulder.rotation.z = Math.PI / 1.35;
        j.rightShoulder.rotation.z = -Math.PI / 1.35;
        j.leftElbow.rotation.x = -0.2 - Math.abs(Math.sin(t * 10.0)) * 0.25;
        j.rightElbow.rotation.x = -0.2 - Math.abs(Math.sin(t * 10.0)) * 0.25;
        j.torso.position.y = 0.55 + Math.abs(Math.sin(t * 9.0)) * 0.35;
        j.headGroup.rotation.y = Math.sin(t * 5.0) * 0.15;
        break;

      case "HUG":
        // Wrap arms forward
        j.leftShoulder.rotation.y = 0.6;
        j.leftShoulder.rotation.x = -0.3;
        j.rightShoulder.rotation.y = -0.6;
        j.rightShoulder.rotation.x = -0.3;
        j.leftElbow.rotation.y = 0.45;
        j.rightElbow.rotation.y = -0.45;
        j.torso.position.y = 0.55;
        break;

      case "CLAP":
        // Clap hands in front
        j.leftShoulder.rotation.z = Math.PI / 3.8;
        j.rightShoulder.rotation.z = -Math.PI / 3.8;
        j.leftShoulder.rotation.y = 0.3 + Math.sin(t * 18.0) * 0.15;
        j.rightShoulder.rotation.y = -0.3 - Math.sin(t * 18.0) * 0.15;
        j.leftElbow.rotation.x = -0.6;
        j.rightElbow.rotation.x = -0.6;
        j.torso.position.y = 0.55;
        break;

      case "HOLD_TROPHY":
        // Hold trophy in front at chest height
        j.leftShoulder.rotation.x = -0.55;
        j.leftShoulder.rotation.y = 0.4;
        j.rightShoulder.rotation.x = -0.55;
        j.rightShoulder.rotation.y = -0.4;
        j.leftElbow.rotation.x = -0.7;
        j.rightElbow.rotation.x = -0.7;
        j.torso.position.y = 0.55;
        break;

      case "RAISE_TROPHY":
        // Both hands up high holding trophy
        j.leftShoulder.rotation.z = Math.PI / 1.5;
        j.leftShoulder.rotation.y = 0.2;
        j.rightShoulder.rotation.z = -Math.PI / 1.5;
        j.rightShoulder.rotation.y = -0.2;
        j.leftElbow.rotation.x = -0.35 + Math.sin(t * 5.0) * 0.1;
        j.rightElbow.rotation.x = -0.35 + Math.sin(t * 5.0) * 0.1;
        j.torso.position.y = 0.55;
        break;

      case "HOLD_CHAMPAGNE":
        // Hold bottle in one hand, other hand waving
        j.leftShoulder.rotation.x = -0.6;
        j.leftShoulder.rotation.y = 0.2;
        j.leftElbow.rotation.x = -0.8;
        
        j.rightShoulder.rotation.z = -Math.PI / 1.35;
        j.rightShoulder.rotation.x = Math.sin(t * 8.0) * 0.25;
        j.rightElbow.rotation.x = -0.2;
        j.torso.position.y = 0.55;
        break;

      case "SPRAY_CHAMPAGNE":
        // Angle bottle forward, shaking it up and down
        j.leftShoulder.rotation.x = -0.75 + Math.sin(t * 22.0) * 0.18;
        j.leftShoulder.rotation.y = 0.15;
        j.leftElbow.rotation.x = -0.85;
        
        j.rightShoulder.rotation.x = -0.75 + Math.sin(t * 22.0) * 0.18;
        j.rightShoulder.rotation.y = -0.15;
        j.rightElbow.rotation.x = -0.85;
        j.torso.position.y = 0.55;
        break;

      case "IDLE":
      default:
        // Soft breathing idle animation
        j.torso.position.y = 0.55 + Math.sin(t * 2.5) * 0.012;
        j.leftShoulder.rotation.z = Math.sin(t * 2.5) * 0.03;
        j.rightShoulder.rotation.z = -Math.sin(t * 2.5) * 0.03;
        j.leftElbow.rotation.x = -0.05;
        j.rightElbow.rotation.x = -0.05;
        break;
    }
  }

  // 🏆 3D Podium Celebration Ceremony Scene
  // 🏆 3D POST-RACE STATE MACHINE & CINEMATIC SYSTEMS
  let postRaceActive = false;
  let postRaceState = "FINISHING"; // FINISHING, RESULTS, PARC_FERME, CELEBRATION, PODIUM, TROPHY, CHAMPAGNE, FINAL_RESULTS
  let postRaceTimer = 0.0;
  let skipHoldTimer = 0.0;
  let enterKeyPressed = false;
  
  let currentCinematicCar = null;
  let cinematicCarTimer = 0.0;
  
  let cutsceneDrivers = []; // top 3 driver models
  let cutscenePresenter = null;
  let cutsceneTrophy = null;
  let cutsceneCrew = [];
  let cutsceneBlocks = [];
  let champagneBottles = [];
  const champagneParticles = [];

  // Track Enter key specifically for skipped cutscenes
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') enterKeyPressed = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Enter') enterKeyPressed = false;
  });


// ═══ game-09a-postrace-setup.js ═══
  function startPostRaceSequence() {
    isRaceActive = false;
    postRaceActive = true;
    postRaceState = "FINISHING";
    postRaceTimer = 0.0;
    skipHoldTimer = 0.0;
    currentCinematicCar = null;
    cinematicCarTimer = 0.0;
    
    document.getElementById('hud-layer').style.display = 'none';
    window.ApexAudio.stopEngine();
    window.ApexAudio.playBoost(); // Crowd cheer sound
    speakEngineerRadio("Checkered flag is out! Magnificent drive, bring the car home.");

    // Create or show the SKIP TO RESULTS button
    let skipBtn = document.getElementById('skipRaceFinishBtn');
    if (!skipBtn) {
      skipBtn = document.createElement('button');
      skipBtn.id = 'skipRaceFinishBtn';
      skipBtn.innerText = 'SKIP TO RESULTS';
      skipBtn.style.cssText = `
        position: fixed; right: 40px; bottom: 40px; z-index: 99999;
        display: none; pointer-events: auto; padding: 12px 28px;
        background: #06b6d4; color: #000; border: none;
        font-family: 'Outfit', sans-serif; font-weight: 900;
        font-size: 0.9rem; letter-spacing: 1px; border-radius: 6px;
        cursor: pointer; box-shadow: 0 0 20px rgba(6,182,212,0.5);
        transition: transform 0.15s, box-shadow 0.15s;
      `;
      skipBtn.addEventListener('click', skipPostRaceWatch);
      skipBtn.addEventListener('mouseenter', () => { skipBtn.style.transform = 'scale(1.06)'; skipBtn.style.boxShadow = '0 0 30px rgba(6,182,212,0.8)'; });
      skipBtn.addEventListener('mouseleave', () => { skipBtn.style.transform = 'scale(1.0)'; skipBtn.style.boxShadow = '0 0 20px rgba(6,182,212,0.5)'; });
      document.body.appendChild(skipBtn);
    }
    skipBtn.style.display = 'block';
  }

  function endActiveRace() {
    isRaceActive = false;
    const skipBtn = document.getElementById('skipRaceFinishBtn');
    if (skipBtn) skipBtn.style.display = 'none';
    // All cars already finished — transition to results
    transitionToPostRaceState("RESULTS");
    console.log("[RACE STATE] POST_RACE_WATCH -> POST_RACE_RESULTS");
  }

  function skipPostRaceWatch() {
    console.log("[SKIP TO RESULTS] Player triggered skip.");
    // Finish all remaining AI cars in current progress order
    const unfinished = racers.filter(r => !r.finished);
    unfinished.sort((a, b) => getRacerScore(b) - getRacerScore(a));
    unfinished.forEach(car => {
      car.completedLaps = maxLaps;
      car.finished = true;
      car.finishPos = nextFinishPos;
      car.finishTime = raceTimer + Math.random() * 3.0;
      nextFinishPos++;
    });
    const skipBtn = document.getElementById('skipRaceFinishBtn');
    if (skipBtn) skipBtn.style.display = 'none';
    transitionToPostRaceState("RESULTS");
  }

  // ── DEBUG RACE PANEL ──────────────────────────────────────────────
  const DEBUG_RACE_STATE = false; // Set true to show live race state panel (dev only)
  let _lastDebugUpdate = 0;

  function updateDebugRacePanel() {
    if (!DEBUG_RACE_STATE || !racers || racers.length === 0) return;
    const now = performance.now();
    if (now - _lastDebugUpdate < 250) return;
    _lastDebugUpdate = now;

    let panel = document.getElementById('debug-race-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'debug-race-panel';
      panel.style.cssText = [
        'position:fixed','left:8px','top:8px','z-index:200000',
        'background:rgba(0,0,0,0.82)','color:#00ffcc',
        'font-family:monospace','font-size:0.68rem','line-height:1.35',
        'padding:8px 10px','border-radius:6px',
        'border:1px solid rgba(0,255,200,0.35)',
        'pointer-events:none','max-height:420px','overflow-y:auto','width:230px'
      ].join(';');
      document.body.appendChild(panel);
    }

    const stateLabel = postRaceActive
      ? 'POST_RACE_' + postRaceState
      : (isRaceActive ? 'RACING' : 'INACTIVE');

    let html = `<b>STATE:</b> ${stateLabel} &nbsp; <b>LAPS:</b> ${maxLaps}<br><br>`;
    const sorted = [...racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishPos - b.finishPos;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return getRacerScore(b) - getRacerScore(a);
    });
    sorted.forEach((car, idx) => {
      const score = getRacerScore(car).toFixed(3);
      const laps = car.completedLaps !== undefined ? car.completedLaps : '?';
      const off = (car.currentOffset || 0).toFixed(3);
      const fin = car.finished ? `✓P${car.finishPos}` : '';
      const me = car.isPlayer ? ' ◀' : '';
      html += `<b>P${idx+1}</b> ${car.name.substring(0,7).toUpperCase()}${me} ${fin}<br>`;
      html += `&nbsp;Laps:${laps} Off:${off} Total:${score}<br>`;
    });
    panel.innerHTML = html;
  }

  function skipCurrentPostRaceState() {
    skipHoldTimer = 0.0;
    const pBar = document.getElementById('skip-progress-bar');
    if (pBar) pBar.style.width = '0%';
    
    if (postRaceState === "FINISHING") {
      // Force all remaining karts to finish
      racers.forEach(r => {
        if (!r.finished) {
          r.finished = true;
          r.finishPos = r.posRank;
          r.finishTime = raceTimer + Math.random() * 5.0;
        }
      });
      transitionToPostRaceState("RESULTS");
    } else if (postRaceState === "RESULTS") {
      document.getElementById('menu-results-screen').classList.add('hidden');
      transitionToPostRaceState("PARC_FERME");
    } else if (postRaceState === "PARC_FERME") {
      transitionToPostRaceState("CELEBRATION");
    } else if (postRaceState === "CELEBRATION") {
      transitionToPostRaceState("PODIUM");
    } else if (postRaceState === "PODIUM") {
      transitionToPostRaceState("TROPHY");
    } else if (postRaceState === "TROPHY") {
      transitionToPostRaceState("CHAMPAGNE");
    } else if (postRaceState === "CHAMPAGNE") {
      transitionToPostRaceState("FINAL_RESULTS");
    }
  }

  function transitionToPostRaceState(nextState) {
    cleanupPostRaceState(postRaceState);
    postRaceState = nextState;
    postRaceTimer = 0.0;
    initPostRaceState(nextState);
  }

  function cleanupPostRaceState(state) {
    if (state === "RESULTS") {
      document.getElementById('menu-results-screen').classList.add('hidden');
    }
    
    cutsceneDrivers.forEach(d => {
      if (d.mesh) scene.remove(d.mesh);
    });
    cutsceneDrivers = [];
    
    if (cutscenePresenter) {
      scene.remove(cutscenePresenter);
      cutscenePresenter = null;
    }
    
    if (cutsceneTrophy) {
      scene.remove(cutsceneTrophy);
      cutsceneTrophy = null;
    }
    
    cutsceneCrew.forEach(c => scene.remove(c));
    cutsceneCrew = [];
    
    cutsceneBlocks.forEach(b => scene.remove(b));
    cutsceneBlocks = [];
    
    champagneBottles.forEach(b => scene.remove(b));
    champagneBottles = [];
    
    champagneParticles.forEach(p => scene.remove(p.mesh));
    champagneParticles.length = 0;
  }

  function initPostRaceState(state) {
    const sorted = [...racers].sort((a, b) => getRacerScore(b) - getRacerScore(a));
    
    if (state === "RESULTS") {
      showFinalResultsUI();
    }
    
    else if (state === "PARC_FERME") {
      // Park top 3 cars facing camera on start/finish straight
      const positions = [
        { x: -50, y: 0.1, z: 113 },
        { x: -44, y: 0.1, z: 113 },
        { x: -56, y: 0.1, z: 113 }
      ];
      for (let i = 0; i < 3; i++) {
        if (sorted[i] && sorted[i].mesh) {
          sorted[i].mesh.position.set(positions[i].x, positions[i].y, positions[i].z);
          sorted[i].mesh.rotation.set(0, Math.PI, 0); // Face camera
          sorted[i].speed = 0.0;
        }
      }
      
      // Spawn winning driver inside the cockpit (sitting)
      if (sorted[0]) {
        const teamColor = parseInt(F1_TEAMS[sorted[0].teamIndex || 0].color.replace('#', ''), 16);
        const driverModel = createChibiDriverModel(teamColor);
        driverModel.position.set(-50, 0.45, 113.1);
        driverModel.rotation.set(0, Math.PI, 0);
        setDriverAnimation(driverModel, "IDLE");
        scene.add(driverModel);
        cutsceneDrivers.push({ mesh: driverModel, type: 'winner', isExited: false });
      }
    }
    
    else if (state === "CELEBRATION") {
      // Setup winning driver standing beside car
      const teamColor = parseInt(F1_TEAMS[sorted[0].teamIndex || 0].color.replace('#', ''), 16);
      const driverModel = createChibiDriverModel(teamColor);
      driverModel.position.set(-48.4, 0.1, 113.1); // Beside car
      driverModel.rotation.set(0, Math.PI, 0);
      setDriverAnimation(driverModel, "WALK"); // will walk to the crew
      scene.add(driverModel);
      cutsceneDrivers.push({ mesh: driverModel, type: 'winner' });
      
      // Spawn team mechanics approaching from right side
      const crewColors = [0xef4444, 0x3b82f6, 0x10b981, 0xfacc15, 0x8b5cf6, 0xf97316];
      for (let c = 0; c < 4; c++) {
        const crewColor = crewColors[Math.floor(Math.random() * crewColors.length)];
        const crewModel = createChibiDriverModel(crewColor);
        
        // Walk in standby position
        crewModel.position.set(-40 - c * 1.5, 0.1, 115.0);
        crewModel.rotation.set(0, -Math.PI / 2, 0); // Facing left
        setDriverAnimation(crewModel, "WALK");
        scene.add(crewModel);
        cutsceneCrew.push(crewModel);
      }
    }
    
    else if (state === "PODIUM") {
      // Spawn podium blocks
      const blockMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
      // Heights: P1: 1.5, P2: 1.0, P3: 0.7
      // X-positions: P2 (left): -52.2, P1 (center): -50.0, P3 (right): -47.8
      const blocksData = [
        { rank: 1, x: -50.0, h: 1.5 },  // P1 Center
        { rank: 2, x: -52.2, h: 1.0 },  // P2 Left
        { rank: 3, x: -47.8, h: 0.7 }   // P3 Right
      ];
      
      blocksData.forEach(b => {
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, b.h, 1.6), blockMat);
        box.position.set(b.x, b.h / 2, 110.0);
        scene.add(box);
        cutsceneBlocks.push(box);
      });
      
      // Place top 3 drivers standing exactly on their block tops
      // index 0 = winner (P1), index 1 = runner up (P2), index 2 = third (P3)
      const heights = [1.5, 1.0, 0.7];
      const offsetsX = [-50.0, -52.2, -47.8];
      for (let i = 0; i < 3; i++) {
        if (sorted[i]) {
          const teamColor = parseInt(F1_TEAMS[sorted[i].teamIndex || 0].color.replace('#', ''), 16);
          const driverModel = createChibiDriverModel(teamColor);
          // Stand on top of the block
          driverModel.position.set(offsetsX[i], heights[i], 110.0);
          driverModel.rotation.set(0, Math.PI, 0); // Face camera
          setDriverAnimation(driverModel, "IDLE");
          scene.add(driverModel);
          cutsceneDrivers.push({ mesh: driverModel, rank: i + 1, defaultHeight: heights[i], defaultX: offsetsX[i] });
        }
      }
    }
    
    else if (state === "TROPHY") {
      // Podium setup first
      initPostRaceState("PODIUM");
      postRaceState = "TROPHY"; // Force state name
      
      // Spawn presenter walking in from right
      const presenterColor = 0x1e293b; // dark suit
      cutscenePresenter = createChibiDriverModel(presenterColor);
      cutscenePresenter.position.set(-44.0, 0.1, 110.0);
      cutscenePresenter.rotation.set(0, -Math.PI / 2, 0); // Face left
      setDriverAnimation(cutscenePresenter, "WALK");
      scene.add(cutscenePresenter);
      
      // Gold trophy
      cutsceneTrophy = createGoldTrophy();
      cutsceneTrophy.position.set(-44.5, 0.7, 110.0);
      scene.add(cutsceneTrophy);
    }
    
    else if (state === "CHAMPAGNE") {
      initPostRaceState("PODIUM");
      postRaceState = "CHAMPAGNE";
      
      // Add green bottles in their hands
      const greenMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.3 });
      cutsceneDrivers.forEach(d => {
        if (d.mesh) {
          const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.25, 8), greenMat);
          bottle.name = "champagneBottle";
          // Attach to right hand child in hierarchy
          const rightForearm = d.mesh.joints.rightElbow.children[0];
          if (rightForearm) {
            rightForearm.add(bottle);
            bottle.position.set(0, -0.22, 0.06); // Position relative to forearm/hand
            bottle.rotation.set(-Math.PI / 2, 0, 0);
          } else {
            // Fallback
            bottle.position.set(0.18, 0.5, 0.15);
            d.mesh.add(bottle);
          }
          champagneBottles.push(bottle);
        }
      });
    }
  }

  function updateFinishingCinematicCamera(delta) {
    if (!currentCinematicCar) {
      selectNextCinematicCar();
    }
    cinematicCarTimer += delta;
    if (cinematicCarTimer >= 4.0 || (currentCinematicCar && currentCinematicCar.finished)) {
      selectNextCinematicCar();
    }

    if (!currentCinematicCar || !currentCinematicCar.mesh) return;

    const carPos = currentCinematicCar.mesh.position;
    const tang = trackCurve.getTangentAt(currentCinematicCar.currentOffset).normalize();
    const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

    // Alternate camera modes based on timer
    const mode = Math.floor((clock.getElapsedTime() / 4.0)) % 5;
    let targetCamPos = new THREE.Vector3();

    if (mode === 0) {
      // Trackside static camera
      const camOffset = (currentCinematicCar.currentOffset + 0.02) % 1.0;
      const staticPt = trackCurve.getPointAt(camOffset);
      const staticNorm = new THREE.Vector3(-trackCurve.getTangentAt(camOffset).z, 0, trackCurve.getTangentAt(camOffset).x).normalize();
      targetCamPos.copy(staticPt.add(staticNorm.multiplyScalar(6.5)));
      targetCamPos.y = 2.0;
    } else if (mode === 1) {
      // Rear chase camera
      targetCamPos.copy(carPos).add(tang.clone().multiplyScalar(-6.0));
      targetCamPos.y = carPos.y + 2.5;
    } else if (mode === 2) {
      // Low wheel camera
      targetCamPos.copy(carPos).add(norm.clone().multiplyScalar(2.0)).add(tang.clone().multiplyScalar(1.0));
      targetCamPos.y = carPos.y + 0.4;
    } else if (mode === 3) {
      // Finish-line camera
      const finishPt = trackCurve.getPointAt(0.0);
      targetCamPos.copy(finishPt).add(new THREE.Vector3(4.0, 3.5, 6.0));
    } else {
      // Helicopter-style camera
      targetCamPos.copy(carPos).add(new THREE.Vector3(0, 15.0, 0.1));
    }

    if (typeof window.claimCameraOwner === 'function') {
      window.claimCameraOwner("POST_RACE_CINEMATIC");
    }
    camera.position.lerp(targetCamPos, 0.08);
    camera.lookAt(carPos.clone().add(new THREE.Vector3(0, 0.4, 0)));
    camera.updateProjectionMatrix();
  }

  function selectNextCinematicCar() {
    cinematicCarTimer = 0.0;
    const activeCars = racers.filter(r => !r.finished);
    if (activeCars.length > 0) {
      activeCars.sort((a, b) => b.currentOffset - a.currentOffset);
      currentCinematicCar = activeCars[0];
    } else {
      currentCinematicCar = racers[0];
    }
  }

  function createGoldTrophy() {
    const group = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.1 });
    
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.15, 12), goldMat);
    group.add(base);
    
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 12), goldMat);
    stem.position.y = 0.2;
    group.add(stem);
    
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.12, 0.4, 12), goldMat);
    bowl.position.y = 0.5;
    group.add(bowl);
    
    return group;
  }

  function spawnChampagneSpray(pos, dir, count = 2) {
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let k = 0; k < count; k++) {
      const geo = new THREE.SphereGeometry(0.05, 4, 4);
      const mesh = new THREE.Mesh(geo, whiteMat);
      mesh.position.copy(pos);
      
      const vel = dir.clone().normalize().multiplyScalar(4.5 + Math.random() * 3.5);
      vel.x += (Math.random() - 0.5) * 1.5;
      vel.y += (Math.random() - 0.5) * 1.5;
      vel.z += (Math.random() - 0.5) * 1.5;
      
      champagneParticles.push({
        mesh: mesh,
        vel: vel,
        life: 0.7 + Math.random() * 0.5
      });
      scene.add(mesh);
    }
  }

  function updateChampagneParticles(delta) {
    for (let k = champagneParticles.length - 1; k >= 0; k--) {
      const p = champagneParticles[k];
      p.mesh.position.addScaledVector(p.vel, delta);
      p.vel.y -= 9.8 * delta; // gravity
      p.life -= delta;
      
      p.mesh.material.opacity = Math.max(0, p.life / 1.2);
      
      if (p.life <= 0.0) {
        scene.remove(p.mesh);
        champagneParticles.splice(k, 1);
      }
    }
  }


// ═══ game-09b-postrace-state.js ═══
  function updatePostRaceStateMachine(delta) {
    postRaceTimer += delta;

    if (postRaceState === "FINISHING") {
      // 1. Auto-drive player kart down center of track and slow down to stop
      if (playerKart) {
        if (playerKart.postFinishStartProgress === undefined) {
          playerKart.postFinishStartProgress = playerKart.currentOffset;
        }
        const startP = playerKart.postFinishStartProgress;
        const currentP = playerKart.currentOffset;
        let distTravelled = ((currentP - startP + 1.0) % 1.0) * 1800;
        
        if (distTravelled > 180.0) {
          playerKart.speed = 0.0;
        } else {
          const slowdownFactor = Math.max(0.0, 1.0 - (distTravelled / 180.0));
          playerKart.speed = slowdownFactor * 18.0;
        }

        const stepSize = (playerKart.speed * delta) / 1800;
        playerKart.currentOffset = (playerKart.currentOffset + stepSize + 1.0) % 1.0;
        playerKart.sideOffset = THREE.MathUtils.lerp(playerKart.sideOffset, 0.0, delta * 2.0);

        const pPt = trackCurve.getPointAt(playerKart.currentOffset);
        const pTang = trackCurve.getTangentAt(playerKart.currentOffset).normalize();
        const pNorm = new THREE.Vector3(-pTang.z, 0, pTang.x).normalize();
        playerKart.mesh.position.copy(pPt.add(pNorm.multiplyScalar(playerKart.sideOffset)));
        playerKart.mesh.lookAt(playerKart.mesh.position.clone().add(pTang));
      }

      // 2. Camera sweeps
      updateFinishingCinematicCamera(delta);
      
      const allFinished = racers.every(r => r.finished);
      const timedOut = postRaceTimer >= 25.0; // never stall longer than 25s
      if (allFinished || timedOut) {
        if (timedOut && !allFinished) {
          console.warn('[POST-RACE] FINISHING timeout — finalising remaining AI cars');
          skipPostRaceWatch(); // finishes unfinished cars by current progress order
        } else {
          endActiveRace();
        }
      }
    }
    
    else if (postRaceState === "RESULTS") {
      const finishPt = trackCurve.getPointAt(0.0);
      const angle = clock.getElapsedTime() * 0.15;
      camera.position.set(finishPt.x + Math.sin(angle) * 12.0, 3.5, finishPt.z + Math.cos(angle) * 12.0);
      camera.lookAt(finishPt.clone().add(new THREE.Vector3(0, 0.5, 0)));
      camera.updateProjectionMatrix();
      // Auto-advance to celebration after 12s if player doesn't click Continue
      if (postRaceTimer >= 12.0) {
        document.getElementById('menu-results-screen')?.classList.add('hidden');
        transitionToPostRaceState("PARC_FERME");
      }
    }
    
    else if (postRaceState === "PARC_FERME") {
      const winnerDriver = cutsceneDrivers.find(d => d.type === 'winner');
      
      if (postRaceTimer < 3.0) {
        camera.position.set(-50.0, 1.4, 114.5);
        camera.lookAt(new THREE.Vector3(-50.0, 0.45, 113.1));
        if (winnerDriver && winnerDriver.mesh) {
          setDriverAnimation(winnerDriver.mesh, "IDLE");
        }
      } else if (postRaceTimer < 6.0) {
        const factor = Math.min(1.0, (postRaceTimer - 3.0) / 3.0);
        if (winnerDriver && winnerDriver.mesh) {
          winnerDriver.mesh.position.y = THREE.MathUtils.lerp(0.45, 1.1, factor);
          winnerDriver.mesh.position.x = THREE.MathUtils.lerp(-50, -48.4, factor);
          if (factor > 0.8) {
            winnerDriver.mesh.position.y = THREE.MathUtils.lerp(1.1, 0.1, (factor - 0.8) / 0.2);
          }
          setDriverAnimation(winnerDriver.mesh, "CELEBRATE");
        }
        
        camera.position.set(-45.0, 0.8, 115.5);
        camera.lookAt(new THREE.Vector3(-50.0, 0.6, 113.1));
      } else {
        transitionToPostRaceState("CELEBRATION");
      }
      camera.updateProjectionMatrix();
    }
    
    else if (postRaceState === "CELEBRATION") {
      const winnerDriver = cutsceneDrivers.find(d => d.type === 'winner');
      
      if (postRaceTimer < 2.5) {
        if (winnerDriver && winnerDriver.mesh) {
          setDriverAnimation(winnerDriver.mesh, "WALK");
          winnerDriver.mesh.position.x = THREE.MathUtils.lerp(-48.4, -45.5, postRaceTimer / 2.5);
        }
        cutsceneCrew.forEach((c, idx) => {
          setDriverAnimation(c, "WALK");
          c.position.x = THREE.MathUtils.lerp(-40 - idx * 1.5, -42.5 + idx * 0.5, postRaceTimer / 2.5);
        });
        
        camera.position.set(-46.0, 0.8, 115.5);
        camera.lookAt(new THREE.Vector3(-48.4, 0.5, 113.1));
      } else if (postRaceTimer < 6.0) {
        if (winnerDriver && winnerDriver.mesh) {
          setDriverAnimation(winnerDriver.mesh, "CELEBRATE");
        }
        cutsceneCrew.forEach(c => {
          setDriverAnimation(c, "CLAP");
        });
        
        camera.position.set(-45.0, 1.2, 116.8);
        camera.lookAt(new THREE.Vector3(-43.5, 0.5, 114.5));
      } else {
        transitionToPostRaceState("PODIUM");
      }
      camera.updateProjectionMatrix();
    }
    
    else if (postRaceState === "PODIUM") {
      const angle = clock.getElapsedTime() * 0.3;
      camera.position.set(-50.0 + Math.sin(angle) * 4.5, 1.8, 110.0 + Math.cos(angle) * 4.5);
      camera.lookAt(new THREE.Vector3(-50.0, 1.2, 110.0));
      camera.updateProjectionMatrix();
      
      cutsceneDrivers.forEach((d) => {
        if (d.mesh) {
          if (d.rank === 1) {
            setDriverAnimation(d.mesh, "CELEBRATE");
          } else {
            setDriverAnimation(d.mesh, "CLAP");
          }
        }
      });
      
      if (postRaceTimer >= 5.0) {
        transitionToPostRaceState("TROPHY");
      }
    }
    
    else if (postRaceState === "TROPHY") {
      const winnerDriver = cutsceneDrivers.find(d => d.rank === 1);
      
      if (postRaceTimer < 3.0) {
        const factor = Math.min(1.0, postRaceTimer / 3.0);
        if (cutscenePresenter) {
          cutscenePresenter.position.x = THREE.MathUtils.lerp(-44.0, -48.8, factor);
          setDriverAnimation(cutscenePresenter, "WALK");
        }
        if (cutsceneTrophy) {
          cutsceneTrophy.position.x = THREE.MathUtils.lerp(-44.5, -49.3, factor);
        }
        
        camera.position.set(-47.0, 1.4, 113.0);
        camera.lookAt(new THREE.Vector3(-50.0, 1.2, 110.0));
      } else if (postRaceTimer < 5.0) {
        const factor = Math.min(1.0, (postRaceTimer - 3.0) / 2.0);
        if (cutsceneTrophy) {
          cutsceneTrophy.position.x = THREE.MathUtils.lerp(-49.3, -50.0, factor);
          cutsceneTrophy.position.y = THREE.MathUtils.lerp(0.7, 2.0, factor); // Hand to P1 winner height
        }
        if (cutscenePresenter) {
          cutscenePresenter.position.x = THREE.MathUtils.lerp(-48.8, -44.0, factor);
          setDriverAnimation(cutscenePresenter, "WALK");
        }
        
        camera.position.set(-48.5, 1.2, 112.0);
        camera.lookAt(new THREE.Vector3(-50.0, 1.3, 110.0));
      } else if (postRaceTimer < 8.0) {
        const factor = Math.min(1.0, (postRaceTimer - 5.0) / 3.0);
        if (cutsceneTrophy) {
          // Attached to winner's hands or raised above winner
          cutsceneTrophy.position.set(-50.0, 2.0 + factor * 0.8, 110.1);
        }
        if (winnerDriver && winnerDriver.mesh) {
          setDriverAnimation(winnerDriver.mesh, "RAISE_TROPHY");
        }
        
        cutsceneDrivers.forEach(d => {
          if (d.rank > 1 && d.mesh) {
            setDriverAnimation(d.mesh, "CLAP");
          }
        });
        
        camera.position.set(-50.0, 1.6, 111.8);
        camera.lookAt(new THREE.Vector3(-50.0, 2.2, 110.0));
      } else {
        transitionToPostRaceState("CHAMPAGNE");
      }
      camera.updateProjectionMatrix();
    }
    
    else if (postRaceState === "CHAMPAGNE") {
      cutsceneDrivers.forEach(d => {
        if (d.mesh) {
          if (d.rank === 1) {
            setDriverAnimation(d.mesh, "SPRAY_CHAMPAGNE");
          } else {
            setDriverAnimation(d.mesh, "HOLD_CHAMPAGNE");
          }
          
          // Spawn particles from right hand bottle nozzle
          const nozzlePos = d.mesh.position.clone().add(new THREE.Vector3(d.rank === 1 ? 0.2 : -0.2, 0.9, 0.25));
          const targetX = d.rank === 1 ? -52.0 + Math.random() * 4.0 : -50.0;
          const dir = new THREE.Vector3(targetX - d.mesh.position.x, 0.3, 110.0 - d.mesh.position.z).normalize();
          
          if (Math.random() < 0.45) {
            spawnChampagneSpray(nozzlePos, dir, 3);
          }
        }
      });
      
      updateChampagneParticles(delta);
      
      const angle = clock.getElapsedTime() * 0.65;
      camera.position.set(-50.0 + Math.sin(angle) * 3.5, 2.0, 110.0 + Math.cos(angle) * 3.5);
      camera.lookAt(new THREE.Vector3(-50.0, 1.4, 110.0));
      camera.updateProjectionMatrix();
      
      if (postRaceTimer >= 7.0) {
        transitionToPostRaceState("FINAL_RESULTS");
      }
    }

    // Tick the character animations for all actors
    if (typeof updateDriverAnimation === 'function') {
      cutsceneDrivers.forEach(d => {
        if (d.mesh) updateDriverAnimation(d.mesh, delta);
      });
      cutsceneCrew.forEach(c => {
        updateDriverAnimation(c, delta);
      });
      if (cutscenePresenter) {
        updateDriverAnimation(cutscenePresenter, delta);
      }
    }

  }

  function showFinalResultsUI() {
    isRaceActive = false;
    window.ApexAudio.stopEngine();
    
    const sorted = [...racers].sort((a, b) => getRacerScore(b) - getRacerScore(a));
    const finalRank = playerKart.posRank;
    const rpEarnings = [0, 1000, 800, 600, 400][finalRank] || 400;
    
    const winBanner = document.getElementById('results-winner-text');
    if (finalRank === 1) {
      winBanner.innerText = `🏆 CHAMPION! +${rpEarnings} RP`;
      winBanner.style.color = "var(--neon-yellow)";
    } else {
      winBanner.innerText = `${["", "1st", "2nd", "3rd", "4th"][finalRank]} PLACE | +${rpEarnings} RP`;
      winBanner.style.color = "#ffffff";
    }

    document.getElementById('podium-1st-name').innerText = sorted[0].name;
    document.getElementById('podium-1st-avatar').innerText = sorted[0].avatar;
    document.getElementById('podium-2nd-name').innerText = sorted[1].name;
    document.getElementById('podium-2nd-avatar').innerText = sorted[1].avatar;
    document.getElementById('podium-3rd-name').innerText = sorted[2].name;
    document.getElementById('podium-3rd-avatar').innerText = sorted[2].avatar;

    const totalRaceTime = raceTimer + playerTimePenaltySeconds;
    const minutes = Math.floor(totalRaceTime / 60);
    const seconds = Math.floor(totalRaceTime % 60);
    const ms = Math.floor((totalRaceTime % 1) * 100);
    const pad = (num) => String(num).padStart(2, '0');
    let timeStr = `${pad(minutes)}:${pad(seconds)}.${pad(ms)}`;
    if (playerTimePenaltySeconds > 0) {
      timeStr += ` (+${playerTimePenaltySeconds}s PEN)`;
    }
    document.getElementById('results-lap-time').innerText = timeStr;

    // Bind continue button to go to celebrations
    const resultsQuitBtn = document.getElementById('btn-results-quit');
    if (resultsQuitBtn) {
      resultsQuitBtn.innerText = "CONTINUE TO CELEBRATION ➔";
      resultsQuitBtn.onclick = () => {
        window.ApexAudio.playClick();
        document.getElementById('menu-results-screen').classList.add('hidden');
        transitionToPostRaceState("PARC_FERME");
      };
    }
    
    document.getElementById('menu-results-screen').classList.remove('hidden');
  }

  function finalizeRacePointsHQ() {
    completedSessions[currentSessionIndex] = true;
    
    const finalRank = playerKart.posRank;
    const rpEarnings = [0, 1000, 800, 600, 400][finalRank] || 400;
    resourcePoints += rpEarnings;
    
    if (currentSessionIndex < 2) {
      currentSessionIndex++;
    }
    
    window.ApexAudio.playClick();
    
    document.getElementById('f1-workstation-overlay').classList.remove('hidden');
    document.getElementById('ws-resource-points').innerText = resourcePoints;
    
    updateWorkstationSessionsList();
    updateRndUpgradesPanel();
    setupWorkstationTurntable();
  }

  window.quitToConsole = () => {
    window.ApexAudio.playClick();
    if (window.parent && window.parent !== window && typeof window.parent.closeGameIframe === 'function') {
      window.parent.closeGameIframe();
    } else {
      window.location.href = "/index.html";
    }
  };


  // ════ PIT STOP MECHANICS ════
  function spawnPitCrewBoxes() {
    // Remove old crew boxes if any
    pitCrewBoxes.forEach(c => scene.remove(c));
    pitCrewBoxes = [];
    pitCrew = [];

    const crewColor = parseInt(F1_TEAMS[selectedTeamIndex].color.replace('#', ''), 16);
    const crewMat = new THREE.MeshStandardMaterial({ color: crewColor, roughness: 0.5 });
    
    const totalBoxes = F1_TEAMS.length;
    const T_START = 0.26;
    const T_END = 0.74;
    const TEAM_STEP = (T_END - T_START) / totalBoxes;
    const pBoxT = T_START + (selectedTeamIndex + 0.5) * TEAM_STEP;

    const pt = pitCurve.getPointAt(pBoxT);
    const tang = pitCurve.getTangentAt(pBoxT).normalize();
    const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
    const pPos = pt.clone().add(norm.clone().multiplyScalar(9.5));

    // Compound colors for fresh tires
    const compoundColors = {
      soft: 0xef4444,
      medium: 0xfacc15,
      hard: 0xffffff,
      intermediate: 0x22c55e,
      wet: 0x3b82f6
    };
    const cColor = compoundColors[activeCompound || 'medium'] || 0xfacc15;
    const tyreMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: cColor, emissive: cColor, emissiveIntensity: 0.6 });

    // 10-person pit crew: 4 gunners, 4 tire carriers, 2 jack mechanics
    const crewTargets = [
      // Left side wheel gunners (facing inwards towards wheels)
      { pos: pPos.clone().add(norm.clone().multiplyScalar(1.5)).add(tang.clone().multiplyScalar(1.4)), role: 'wheel_gun_fl' },
      { pos: pPos.clone().add(norm.clone().multiplyScalar(1.5)).add(tang.clone().multiplyScalar(-1.4)), role: 'wheel_gun_rl' },
      // Right side wheel gunners
      { pos: pPos.clone().add(norm.clone().multiplyScalar(-1.5)).add(tang.clone().multiplyScalar(1.4)), role: 'wheel_gun_fr' },
      { pos: pPos.clone().add(norm.clone().multiplyScalar(-1.5)).add(tang.clone().multiplyScalar(-1.4)), role: 'wheel_gun_rr' },
      // Left side tyre carriers (holding fresh tyres ready)
      { pos: pPos.clone().add(norm.clone().multiplyScalar(2.6)).add(tang.clone().multiplyScalar(1.4)), role: 'carrier_fl' },
      { pos: pPos.clone().add(norm.clone().multiplyScalar(2.6)).add(tang.clone().multiplyScalar(-1.4)), role: 'carrier_rl' },
      // Right side tyre carriers
      { pos: pPos.clone().add(norm.clone().multiplyScalar(-2.6)).add(tang.clone().multiplyScalar(1.4)), role: 'carrier_fr' },
      { pos: pPos.clone().add(norm.clone().multiplyScalar(-2.6)).add(tang.clone().multiplyScalar(-1.4)), role: 'carrier_rr' },
      // Front Jack mechanic (facing oncoming car)
      { pos: pPos.clone().add(tang.clone().multiplyScalar(2.8)), role: 'jack_front' },
      // Rear Jack mechanic
      { pos: pPos.clone().add(tang.clone().multiplyScalar(-2.8)), role: 'jack_rear' }
    ];

    crewTargets.forEach((item, idx) => {
      const targetPos = item.pos;
      const crewGroup = new THREE.Group();
      
      // Body (Team suit)
      const suit = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.95, 0.45), crewMat);
      suit.position.y = 0.5;
      suit.castShadow = true;
      crewGroup.add(suit);
      
      // Helmet
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 }));
      helmet.position.y = 1.12;
      helmet.castShadow = true;
      crewGroup.add(helmet);

      // Role Props
      if (item.role.startsWith('carrier_')) {
        // Fresh Tyre Prop held in mechanic's hands
        const tyreProp = new THREE.Group();
        const rubber = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.14, 12, 24), tyreMat);
        tyreProp.add(rubber);
        const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.02, 8, 24), stripeMat);
        tyreProp.add(stripe);
        tyreProp.position.set(0, 0.65, 0.32);
        crewGroup.add(tyreProp);
        crewGroup.tyreProp = tyreProp;
      } else if (item.role.startsWith('wheel_gun_')) {
        // Paoli Wheel Gun
        const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.42), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 }));
        gun.position.set(0, 0.52, 0.25);
        crewGroup.add(gun);
      } else if (item.role === 'jack_front' || item.role === 'jack_rear') {
        // Sleek low-profile titanium quick-lift jack (dark metallic, no eye-level obstruction)
        const jack = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.7), new THREE.MeshStandardMaterial({ color: 0x1f242d, metalness: 0.8, roughness: 0.3 }));
        jack.position.set(0, 0.04, 0.3);
        crewGroup.add(jack);
      }

      // Standby position: starts further back on apron/garage threshold
      const offsetVec = idx < 8 ? norm.clone().multiplyScalar(4.0 * Math.sign(idx % 4 < 2 ? 1 : -1)) : norm.clone().multiplyScalar(4.0);
      const standbyPos = targetPos.clone().add(offsetVec);
      
      crewGroup.position.copy(standbyPos);
      crewGroup.lookAt(targetPos);
      
      scene.add(crewGroup);
      
      pitCrew.push({
        group: crewGroup,
        standby: standbyPos,
        target: targetPos,
        role: item.role
      });
      pitCrewBoxes.push(crewGroup);
    });
  }

  function triggerPitStop() {
    if (isPitStopActive) return;
    if (playerKart && (playerKart.qualifyingState === "GARAGE" || playerKart.isExitingGarage)) return;
    isPitStopActive = true;
    hasStoppedAtPitBox = true;
    
    // Configure initial cinematic phase
    pitStopPhase = "CREW_RUNNING";
    window.pitQTEProgress = 0.0;

    if (playerKart) playerKart.speed = 0.0;
    if (window.ApexAudio) {
      window.ApexAudio.stopEngine();
      window.ApexAudio.playDriftScreech();
    }

    // Set overhead traffic light to RED
    if (window.f1PitBoxes && window.f1PitBoxes[selectedTeamIndex]) {
      const box = window.f1PitBoxes[selectedTeamIndex].group;
      if (box && box.redLed && box.greenLed) {
        box.redLed.material.emissiveIntensity = 1.0;
        box.greenLed.material.emissiveIntensity = 0.05;
      }
    }

    // Spawn 10-person pit crew outside at the green pit box
    spawnPitCrewBoxes();

    document.getElementById('pit-progress-fill').style.width = '0%';
    document.getElementById('pit-stop-overlay').classList.remove('hidden');
    document.getElementById('pit-prompt-text').innerText = "PIT CREW MOVING TO WHEELS...";

    // Tyre compound selector
    const titleEl = document.getElementById('pit-select-compound-title');
    const containerEl = document.getElementById('pit-compound-selector-container');
    if (window.voiceSelectedCompound) {
      if (titleEl) titleEl.style.display = 'none';
      if (containerEl) containerEl.style.display = 'none';
      const btn = document.getElementById(`compound-${window.voiceSelectedCompound}`);
      if (btn) {
        const btns = document.querySelectorAll('.compound-btn');
        btns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      }
      activeCompound = window.voiceSelectedCompound;
    } else {
      if (titleEl) titleEl.style.display = 'block';
      if (containerEl) containerEl.style.display = 'flex';
    }

    // Hide mic button and minimap to keep TV camera view clean
    const mic = document.querySelector('.mic-btn-container');
    if (mic) mic.classList.add('hidden');
    const minimap = document.getElementById('hud-minimap-container');
    if (minimap) minimap.classList.add('hidden');

    const stratCard = document.getElementById('hud-pit-strategy-card');
    if (stratCard) {
      stratCard.classList.add('hidden');
      stratCard.style.display = 'none';
    }
  }

  function tapPitStopQTE() {
    if (pitStopPhase !== "CHANGING_TYRES") return;
    
    if (window.ApexAudio && typeof window.ApexAudio.playWheelGun === 'function') {
      window.ApexAudio.playWheelGun();
    } else if (window.ApexAudio) {
      window.ApexAudio.playPickup();
    }
    window.pitQTEProgress = (window.pitQTEProgress || 0.0) + 12.0;

    if (window.pitQTEProgress >= 100.0) {
      window.pitQTEProgress = 100.0;
      pitStopPhase = "LOWERING";
      window.pitLowerTimer = 0.0;
      document.getElementById('pit-prompt-text').innerText = "LOWERING CAR ON JACKS...";
      const titleEl = document.getElementById('pit-select-compound-title');
      const containerEl = document.getElementById('pit-compound-selector-container');
      if (titleEl) titleEl.style.display = 'none';
      if (containerEl) containerEl.style.display = 'none';
    }
    document.getElementById('pit-progress-fill').style.width = `${window.pitQTEProgress}%`;
  }

  function completePitStop() {
    isPitStopActive = false;
    tyreWear = 0.0;
    carDamage = 0.0;

    const titleEl = document.getElementById('pit-select-compound-title');
    const containerEl = document.getElementById('pit-compound-selector-container');
    if (titleEl) titleEl.style.display = 'none';
    if (containerEl) containerEl.style.display = 'none';
    const stratCard = document.getElementById('hud-pit-strategy-card');
    if (stratCard) {
      stratCard.classList.add('hidden');
      stratCard.style.display = 'none';
    }

    if (playerKart) {
      playerKart.frontWingAttached = true;
      playerKart.rearWingAttached = true;
      restoreCarWings(playerKart);
      playerKart.tyreCompound = activeCompound || "medium";
      playerKart.tyreLife = 100.0;
      if (typeof window.updateCarTyreColor === 'function') {
        window.updateCarTyreColor(playerKart);
      }
      
      // Reset steering inputs to prevent pulling on exit
      playerKart.pitStopSnapTime = undefined;
      playerKart.pitStopStartPos = undefined;
      playerKart.pitStopStartHeading = undefined;
      playerKart.rawSteeringInput = 0.0;
      playerKart.filteredSteeringInput = 0.0;
      playerKart.steeringAngle = 0.0;
      playerKart.yawVelocity = 0.0;
      playerKart.driftAngle = 0.0;
      playerKart.isDrifting = false;
    }
    updateTyreWearHUD();
    updateDamageHUD();
    if (document.getElementById('hud-telemetry-panel')?.classList.contains('show')) {
      updateTelemetryPanelUI();
    }

    window.voiceSelectedCompound = null;

    // Turn overhead traffic light to GREEN
    if (window.f1PitBoxes && window.f1PitBoxes[selectedTeamIndex]) {
      const box = window.f1PitBoxes[selectedTeamIndex].group;
      if (box && box.redLed && box.greenLed) {
        box.redLed.material.emissiveIntensity = 0.05;
        box.greenLed.material.emissiveIntensity = 1.0;
      }
    }

    if (window.ApexAudio && typeof window.ApexAudio.playJackDrop === 'function') {
      window.ApexAudio.playJackDrop();
    }

    // Transfer crew to running-back list
    runningBackCrew = [...pitCrew];
    pitCrew = [];
    pitCrewBoxes = [];

    const activeRunningCrew = [...runningBackCrew];
    setTimeout(() => {
      activeRunningCrew.forEach(c => scene.remove(c.group));
      runningBackCrew = runningBackCrew.filter(rc => !activeRunningCrew.includes(rc));
    }, 1800);

    document.getElementById('pit-prompt-text').innerText = "TYRES FITTED! GREEN LIGHT!";
    if (typeof window.startPitOutAutopilot === 'function') {
      window.startPitOutAutopilot();
    } else if (playerKart) {
      playerKart.boostTime = 0.0;
      playerKart.speed = 0.0;
      currentGear = 1; // 1st gear ready for launch
      playerKart.controlsEnabled = true;
      playerKart.driveOutAutopilot = false;
      playerKart.driveOutState = "NONE";
    }

    speakEngineerRadio("Box complete! Green light, go, go, go!", 40);

    setTimeout(() => {
      document.getElementById('pit-stop-overlay').classList.add('hidden');
      if (window.ApexAudio) window.ApexAudio.startEngine();

      // Restore mic button and minimap
      const mic = document.querySelector('.mic-btn-container');
      if (mic) mic.classList.remove('hidden');
      const minimap = document.getElementById('hud-minimap-container');
      if (minimap) minimap.classList.remove('hidden');
    }, 800);
  }

  function updateTyreWearHUD() {
    const wearVal = Math.floor(tyreWear);
    const wearText = document.getElementById('hud-tyre-wear');
    if (wearText) {
      wearText.innerText = `${wearVal}%`;
    }

    let color = '#4ade80';
    if (wearVal >= 65) {
      color = '#ef4444';
    } else if (wearVal >= 30) {
      color = '#eab308';
    }

    ['tire-lf', 'tire-rf', 'tire-lr', 'tire-rr'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.backgroundColor = color;
    });
  }

  // ════ WEATHER EVENTS ════

// ═══ game-10a-weather-voice.js ═══
  function updateWeatherEvent(delta) {
    if (!isRaceActive) return;
    const elapsed = clock.getElapsedTime() - startTime;
    if (elapsed > rainTriggerTime && !rainAlertTriggered) {
      rainAlertTriggered = true;
      isRainActive = true;
      if (scene) {
        scene.background = new THREE.Color(0x334155);
        scene.fog.color = new THREE.Color(0x334155);
        if (trackMesh) {
          trackMesh.material.roughness = 0.1; // wet shiny track
        }
      }
      speakEngineerRadio("Rain is starting! Should we box for intermediate tyres?");
      pendingRadioQuestion = "rain";
    }
  }

  let isSpeechListening = false;

  // ════ VOICE CONTROL ENGINE (WEB SPEECH API) ════
  function setupVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }
    if (recognition) return;

    try {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isSpeechListening = true;
        const btn = document.getElementById('hud-mic-btn');
        if (btn) btn.classList.add('listening');
        const term = document.getElementById('hud-voice-terminal');
        if (term) { term.classList.remove('hidden'); term.style.display = 'block'; }
        const statusEl = document.getElementById('voice-terminal-status-text');
        if (statusEl) statusEl.textContent = "LISTENING... SPEAK YOUR COMMAND";
        const dot = document.getElementById('voice-terminal-status-dot');
        if (dot) { dot.style.background = '#22c55e'; dot.style.boxShadow = '0 0 10px #22c55e'; }
      };

      recognition.onend = () => {
        isSpeechListening = false;
        const btn = document.getElementById('hud-mic-btn');
        if (btn) btn.classList.remove('listening');
        const statusEl = document.getElementById('voice-terminal-status-text');
        if (statusEl && !window.keepListeningForVoice) {
          statusEl.textContent = "RADIO STANDBY [PRESS V]";
          const dot = document.getElementById('voice-terminal-status-dot');
          if (dot) { dot.style.background = '#eab308'; dot.style.boxShadow = '0 0 10px #eab308'; }
        }
        
        // Auto-restart recognition if temporary listening window is active!
        if (window.keepListeningForVoice) {
          if (statusEl) statusEl.textContent = "WAITING FOR RESPONSE...";
          setTimeout(() => {
            try {
              if (window.keepListeningForVoice && !isSpeechListening) {
                recognition.start();
              }
            } catch(e) {}
          }, 300);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        isSpeechListening = false;
        const btn = document.getElementById('hud-mic-btn');
        if (btn) btn.classList.remove('listening');
        const statusEl = document.getElementById('voice-terminal-status-text');
        const dot = document.getElementById('voice-terminal-status-dot');
        if (dot) { dot.style.background = '#ef4444'; dot.style.boxShadow = '0 0 10px #ef4444'; }
        if (event.error === 'not-allowed') {
          if (statusEl) statusEl.textContent = "MIC DENIED — CLICK BUTTONS BELOW";
          speakEngineerRadio("Microphone permission denied. Allow mic access in browser or use quick command buttons.", 50, true);
        } else if (event.error === 'no-speech') {
          if (statusEl) statusEl.textContent = "NO SPEECH DETECTED [PRESS V]";
        }
      };

      recognition.onresult = (event) => {
        if (!event.results || !event.results[0] || !event.results[0][0]) return;
        const text = event.results[0][0].transcript.toLowerCase();
        const drvVal = document.getElementById('voice-driver-val');
        if (drvVal) drvVal.textContent = `"${text}"`;
        parseVoiceCommand(text);
      };
    } catch(e) {
      console.warn("Voice recognition init error:", e);
    }
  }

  window.sendVoiceCommand = (cmd) => {
    const drvVal = document.getElementById('voice-driver-val');
    if (drvVal) drvVal.textContent = `"${cmd}"`;
    const term = document.getElementById('hud-voice-terminal');
    if (term) { term.classList.remove('hidden'); term.style.display = 'block'; }
    if (typeof parseVoiceCommand === 'function') {
      parseVoiceCommand(cmd.toLowerCase());
    }
  };

  window.toggleVoiceListening = () => {
    const term = document.getElementById('hud-voice-terminal');
    const isTermOpen = term && !term.classList.contains('hidden') && term.style.display !== 'none';

    // If terminal is open and currently listening, close/toggle it
    if (isTermOpen && isSpeechListening) {
      window.keepListeningForVoice = false;
      try { if (recognition) recognition.stop(); } catch(e) {}
      if (term) { term.classList.add('hidden'); term.style.display = 'none'; }
      return;
    }

    // Otherwise, ensure terminal is opened and visible!
    if (term) {
      term.classList.remove('hidden');
      term.style.display = 'block';
    }

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const statusEl = document.getElementById('voice-terminal-status-text');
      if (statusEl) statusEl.textContent = "VOICE NOT SUPPORTED (USE CHIPS BELOW)";
      speakEngineerRadio("Speech recognition is not supported on this browser. Use the clickable radio options.", 50, true);
      return;
    }

    if (!recognition) {
      setupVoiceRecognition();
    }
    if (!recognition) return;

    if (isSpeechListening) {
      window.keepListeningForVoice = false;
      try {
        recognition.stop();
      } catch(e) {}
    } else {
      try {
        if (window.speechSynthesis && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        recognition.start();
      } catch(e) {
        try { recognition.stop(); } catch(err) {}
      }
    }
  };

  window.toggleTelemetryPanel = () => {
    const panel = document.getElementById('hud-telemetry-panel');
    const btn = document.getElementById('hud-telemetry-btn');
    if (!panel) return;

    panel.classList.toggle('show');
    if (btn) {
      btn.classList.toggle('active');
    }

    if (panel.classList.contains('show')) {
      speakEngineerRadio("Displaying telemetry diagnostics.", 30, true);
      updateTelemetryPanelUI();
    } else {
      speakEngineerRadio("Telemetry feed disconnected.", 30, true);
    }
  };

  function updateTelemetryPanelUI() {
    const panel = document.getElementById('hud-telemetry-panel');
    if (!panel) return;

    // 1. Calculate color based on tyreWear
    const wearVal = Math.floor(tyreWear);
    let tireColor = '#22c55e'; // Green
    if (wearVal >= 65) {
      tireColor = '#ef4444'; // Red
    } else if (wearVal >= 30) {
      tireColor = '#eab308'; // Yellow
    }

    ['telemetry-wheel-fl', 'telemetry-wheel-fr', 'telemetry-wheel-rl', 'telemetry-wheel-rr'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('fill', tireColor);
    });

    // 2. Calculate color based on carDamage
    const damageVal = Math.floor(carDamage);
    let bodyColor = '#22c55e'; // Green
    if (damageVal >= 50) {
      bodyColor = '#ef4444'; // Red
    } else if (damageVal >= 20) {
      bodyColor = '#eab308'; // Yellow
    }

    // Color nose, front wing, body, sidepods, rear wing
    ['telemetry-front-wing', 'telemetry-nose', 'telemetry-body', 'telemetry-sidepod-l', 'telemetry-sidepod-r', 'telemetry-rear-wing'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('fill', bodyColor);
    });

    // 3. Update text details
    const wearBadge = document.getElementById('telemetry-wear-badge');
    if (wearBadge) wearBadge.innerText = `Wear: ${wearVal}%`;

    const dmgVal = document.getElementById('telemetry-damage-val');
    if (dmgVal) {
      dmgVal.innerText = `${damageVal}%`;
      dmgVal.style.color = bodyColor;
    }

    // 4. Update Tyre Compound Badge
    const badge = document.getElementById('telemetry-tyre-badge');
    const nameEl = document.getElementById('telemetry-tyre-name');
    const lapsEl = document.getElementById('telemetry-tyre-laps');

    if (badge && nameEl && lapsEl) {
      const compoundUpper = activeCompound.toUpperCase();
      nameEl.innerText = compoundUpper;
      
      // Letter badge
      let letter = "M";
      let badgeColor = "#eab308"; // Yellow for Medium
      
      if (activeCompound === 'soft') {
        letter = "S";
        badgeColor = "#ef4444"; // Red
      } else if (activeCompound === 'hard') {
        letter = "H";
        badgeColor = "#ffffff"; // White
      } else if (activeCompound === 'intermediate') {
        letter = "I";
        badgeColor = "#22c55e"; // Green
      } else if (activeCompound === 'wet') {
        letter = "W";
        badgeColor = "#3b82f6"; // Blue
      }

      badge.innerText = letter;
      badge.style.borderColor = badgeColor;
      badge.style.color = badgeColor === '#ffffff' ? '#000' : '#fff';
      badge.style.background = badgeColor === '#ffffff' ? '#fff' : 'transparent';

      // Estimate laps completed (simplified as a fraction of currentOffset / laps)
      const tyreLapsCompleted = Math.max(0, Math.floor(currentLap - 1 + playerKart.currentOffset));
      lapsEl.innerText = `${tyreLapsCompleted} LAPS`;
    }
  }

  let radioQueue = [];
  let isRadioSpeaking = false;
  let currentRadioPriority = 0;
  let activeUtterance = null;
  const recentSpokenRadioMessages = new Map();

  function speakEngineerRadio(msg, priorityLevel = 30, isExplicitResponse = false) {
    if (!('speechSynthesis' in window)) return;
    
    // Convert old true/false priorities
    if (priorityLevel === true) priorityLevel = 100;
    else if (priorityLevel === false) priorityLevel = 30;

    // Suppress repeating identical messages within 45 seconds (unless explicit user response)
    const nowTime = Date.now();
    const lastSpoken = recentSpokenRadioMessages.get(msg) || 0;
    if (!isExplicitResponse && (nowTime - lastSpoken) < 45000) {
      return; // Debounce identical voice messages
    }
    recentSpokenRadioMessages.set(msg, nowTime);

    // Display on HUD radio subtitles instantly
    const subEl = document.getElementById('hud-radio-subtitles');
    if (subEl) {
      subEl.innerText = `"${msg}"`;
    }
    const engVal = document.getElementById('voice-engineer-val');
    if (engVal) {
      engVal.textContent = msg;
    }
    const radioBanner = document.getElementById('hud-radio-banner');
    if (radioBanner) {
      radioBanner.classList.add('show');
      // Hide banner after 5.5 seconds
      clearTimeout(window.radioBannerTimeout);
      window.radioBannerTimeout = setTimeout(() => {
        radioBanner.classList.remove('show');
      }, 5500);
    }

    // Suppress speech synthesis only if user explicitly turned it off in settings
    if (window.voiceSpeechEnabled === false && !isExplicitResponse) {
      return;
    }

    // Interrupt if new message has higher priority than current speaking message!
    if (isRadioSpeaking && priorityLevel > currentRadioPriority) {
      window.speechSynthesis.cancel();
      isRadioSpeaking = false;
      currentRadioPriority = 0;
      activeUtterance = null;
    }

    // Remove duplicates or lower-priority pending messages if a higher priority one arrives
    if (priorityLevel >= 70) {
      radioQueue = radioQueue.filter(item => item.priority >= priorityLevel);
    }

    radioQueue.push({ text: msg, priority: priorityLevel });
    // Sort queue by priority (descending)
    radioQueue.sort((a, b) => b.priority - a.priority);

    processRadioQueue();
  }

  function processRadioQueue() {
    if (isRadioSpeaking || radioQueue.length === 0) return;

    if (window.speechSynthesis.paused) {
      try { window.speechSynthesis.resume(); } catch(e) {}
    }

    isRadioSpeaking = true;
    const msgItem = radioQueue.shift();
    currentRadioPriority = msgItem.priority;

    const utterance = new SpeechSynthesisUtterance(msgItem.text);
    activeUtterance = utterance;

    const voices = window.speechSynthesis.getVoices();
    // Prioritize natural or Google US/UK English voices for fluent, high-fidelity speech
    let bestVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google') && v.name.includes('US English'));
    if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google') && v.name.includes('UK English'));
    if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
    if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural'));
    if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Microsoft'));
    if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('en'));
    
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.volume = (typeof window.radioVolume === 'number') ? Math.max(0.05, Math.min(1.0, window.radioVolume)) : 1.0;
    utterance.pitch = 0.90; // Natural, clear pitwall radio voice tone
    utterance.rate = 1.02;

    utterance.onend = () => {
      activeUtterance = null;
      setTimeout(() => {
        isRadioSpeaking = false;
        currentRadioPriority = 0;
        processRadioQueue();
      }, 120); // Fast release pause (120ms) for fluent, connected speech flow
    };

    utterance.onerror = () => {
      activeUtterance = null;
      isRadioSpeaking = false;
      currentRadioPriority = 0;
      processRadioQueue();
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch(err) {
      console.warn("Speech synthesis error:", err);
      isRadioSpeaking = false;
    }
  }

  function parseVoiceCommand(text) {
    console.log("[VOICE COMMAND RECEIVED]", text, "Pending Question:", pendingRadioQuestion);

    // 1. Interactive QTE confirmations
    if (pendingRadioQuestion === 'crash') {
      if (text.includes("yes") || text.includes("yeah") || text.includes("ok") || text.includes("sure")) {
        pendingRadioQuestion = null;
        window.keepListeningForVoice = false;
        pendingPitStop = true; // Schedule pit lane entry
        speakEngineerRadio("Copy that, boxing this lap.", 70, true);
        return;
      } else if (text.includes("no") || text.includes("nope") || text.includes("stay out")) {
        pendingRadioQuestion = null;
        window.keepListeningForVoice = false;
        speakEngineerRadio("Copy, stay out. Keep pushing.", 70, true);
        return;
      }
    }

    if (pendingRadioQuestion === 'tyres') {
      if (text.includes("yes") || text.includes("yeah") || text.includes("box") || text.includes("pit")) {
        pendingRadioQuestion = null;
        window.keepListeningForVoice = false;
        pendingPitStop = true; // Schedule pit lane entry
        speakEngineerRadio("Copy, boxing this lap for fresh rubber.", 70, true);
        return;
      } else if (text.includes("no") || text.includes("stay out")) {
        pendingRadioQuestion = null;
        window.keepListeningForVoice = false;
        speakEngineerRadio("Copy, stay out. Keep pushing.", 70, true);
        return;
      }
    }

    if (pendingRadioQuestion === 'rain') {
      if (text.includes("yes") || text.includes("yeah") || text.includes("ok") || text.includes("sure")) {
        pendingRadioQuestion = null;
        window.keepListeningForVoice = false;
        activeCompound = 'intermediate';
        window.voiceSelectedCompound = 'intermediate';
        speakEngineerRadio("Copy, boxing for intermediates.", 70, true);
        triggerPitStop();
        return;
      } else if (text.includes("no") || text.includes("nope")) {
        pendingRadioQuestion = null;
        window.keepListeningForVoice = false;
        speakEngineerRadio("Copy, stay out. Be careful on the slicks.", 70, true);
        return;
      }
    }

    if (pendingRadioQuestion === 'tyres_choice') {
      let comp = null;
      if (text.includes("soft") || text.includes("red")) comp = 'soft';
      else if (text.includes("medium") || text.includes("med") || text.includes("yellow")) comp = 'medium';
      else if (text.includes("hard") || text.includes("white")) comp = 'hard';
      else if (text.includes("inter") || text.includes("green")) comp = 'intermediate';
      else if (text.includes("wet") || text.includes("blue")) comp = 'wet';

      if (comp) {
        activeCompound = comp;
        window.voiceSelectedCompound = comp;
        pendingRadioQuestion = null;
        window.keepListeningForVoice = false;
        speakEngineerRadio(`${comp.toUpperCase()} tyres confirmed. Box box box.`, 70, true);
        
        if (typeof window.choosePitCompound === 'function') {
          window.choosePitCompound(comp);
        }
        return;
      } else {
        // Did not catch valid compound yet; keep 15-second window alive so user can repeat
        window.keepListeningForVoice = true;
        window.micTimeoutTimer = 15.0;
      }
    }

    // Default close listening window for standard single-turn commands
    window.keepListeningForVoice = false;

    // 2. Weather command
    if (text.includes("weather") || text.includes("rain") || text.includes("report")) {
      if (isRainActive) {
        speakEngineerRadio("Track is wet. Rain is falling. Get onto wet tyres immediately.", 30, true);
      } else {
        speakEngineerRadio("Track is dry. Weather is clear. Slicks are the fastest choice.", 30, true);
      }
      return;
    }

    // 3. Gap & Race Updates
    if (text.includes("gap") || text.includes("update") || text.includes("position") || text.includes("ahead") || text.includes("behind")) {
      const sorted = [...racers].sort((a, b) => getRacerScore(b) - getRacerScore(a));
      const playerIdx = sorted.findIndex(r => r.isPlayer);
      const pos = playerIdx + 1;
      
      if (playerIdx === 0) {
        const nextCar = sorted[1];
        speakEngineerRadio(`You are leading! P1. ${nextCar ? nextCar.name : 'The field'} is behind. Keep pushing.`, 30, true);
      } else {
        const carAhead = sorted[playerIdx - 1];
        const aheadGap = ((sorted[playerIdx - 1].currentOffset - playerKart.currentOffset) * 20.0).toFixed(1);
        speakEngineerRadio(`You are P${pos}. ${carAhead.name} is ${Math.abs(aheadGap)} seconds ahead. Push now.`, 30, true);
      }
      return;
    }

    // 4. Combined Command: "Box Soft", "Box Medium", etc.
    if ((text.includes("box") || text.includes("pit")) && (text.includes("soft") || text.includes("medium") || text.includes("med") || text.includes("hard") || text.includes("wet") || text.includes("inter") || text.includes("red") || text.includes("yellow") || text.includes("white") || text.includes("green") || text.includes("blue"))) {
      let comp = 'medium';
      if (text.includes("soft") || text.includes("red")) comp = 'soft';
      else if (text.includes("hard") || text.includes("white")) comp = 'hard';
      else if (text.includes("wet") || text.includes("blue")) comp = 'wet';
      else if (text.includes("inter") || text.includes("green")) comp = 'intermediate';
      
      activeCompound = comp;
      window.voiceSelectedCompound = comp;
      pendingPitStop = true;
      speakEngineerRadio(`${comp.toUpperCase()} confirmed. Box box box.`, 70, true);
      
      const btn = document.getElementById(`compound-${comp}`);
      if (btn) selectTyreCompound(comp, btn);
      return;
    }

    // 5. Box / Pit command alone
    if (text.includes("box") || text.includes("pit")) {
      pendingRadioQuestion = 'tyres_choice';
      pendingPitStop = true; // Schedule it!
      speakEngineerRadio("Copy, boxing this lap. Which compound?", 70, true);
      // Keep mic listening for 15 seconds multi-turn dialogue window
      window.keepListeningForVoice = true;
      window.micTimeoutTimer = 15.0;
      return;
    }

    // 6. Tyre choices alone
    if (text.includes("soft") || text.includes("medium") || text.includes("med") || text.includes("hard") || text.includes("wet") || text.includes("inter") || text.includes("intermediate")) {
      let comp = 'medium';
      if (text.includes("soft")) comp = 'soft';
      else if (text.includes("hard")) comp = 'hard';
      else if (text.includes("wet")) comp = 'wet';
      else if (text.includes("inter") || text.includes("intermediate")) comp = 'intermediate';

      activeCompound = comp;
      window.voiceSelectedCompound = comp;
      speakEngineerRadio(`Copy, tyres changed to ${comp.toUpperCase()} compound.`, 30, true);
      const btn = document.getElementById(`compound-${comp}`);
      if (btn) selectTyreCompound(comp, btn);
      return;
    }

    // 7. Stay out / Cancel pit
    if (text.includes("stay out") || text.includes("cancel") || text.includes("no box") || text.includes("no stop")) {
      pendingPitStop = false;
      pendingRadioQuestion = null;
      window.voiceSelectedCompound = null;
      speakEngineerRadio("Copy, cancelling box. Stay out, push now.", 70, true);
      return;
    }

    // 8. Engine Mode voice commands
    if (text.includes("push") || text.includes("attack") || text.includes("standard") || text.includes("fuel save") || text.includes("save fuel") || text.includes("faster") || text.includes("power")) {
      let mode = 'standard';
      if (text.includes("push") || text.includes("faster") || text.includes("power")) mode = 'push';
      if (text.includes("attack")) mode = 'attack';
      else if (text.includes("save") || text.includes("fuel save")) mode = 'fuel_save';

      currentEngineMode = mode;
      speakEngineerRadio(`Copy, engine mode set to ${mode.toUpperCase()}.`, 30, true);
      
      const hMode = document.getElementById('steering-hud-mode');
      if (hMode) {
        hMode.innerText = mode.toUpperCase();
        hMode.style.color = mode === 'push' || mode === 'attack' ? '#ef4444' : '#06b6d4';
      }
      return;
    }

    // 9. Status & Telemetry command
    if (text.includes("status") || text.includes("telemetry") || text.includes("damage") || text.includes("car")) {
      toggleTelemetryPanel();
      const wearVal = Math.floor(tyreWear);
      const dmgVal = Math.floor(carDamage);
      speakEngineerRadio(`Car status: Tyre wear at ${wearVal} percent. Damage at ${dmgVal} percent.`, 30, true);
      return;
    }

    // 10. DRS activation
    if (text.includes("drs") || text.includes("wing")) {
      triggerDRS();
      return;
    }

    // 11. Radio check
    if (text.includes("radio check") || text.includes("hear me") || text.includes("hello")) {
      speakEngineerRadio("Loud and clear. Five by five, radio channel active.", 10, true);
      return;
    }

    // Default fallthrough
    speakEngineerRadio("Radio static. Say again.", 10, true);
  }


  // ════ DYNAMIC 2D MINIMAP ════

// ═══ game-10b-hud-settings.js ═══
  function drawMinimap() {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 90, 90);

    // Draw track path layout sector by sector to highlight yellow flag zones
    const sectors = typeof sectorFlags !== 'undefined' ? sectorFlags.length : 6;
    const pointsPerSector = 15;
    
    for (let s = 0; s < sectors; s++) {
      ctx.beginPath();
      const sFlag = (typeof sectorFlags !== 'undefined') ? sectorFlags[s] : 'green';
      const isYellow = sFlag === 'yellow' || safetyCarActive || vscActive;
      ctx.strokeStyle = isYellow ? "#f59e0b" : "rgba(255, 255, 255, 0.65)"; // Brighter track, prominent yellow highlight
      ctx.lineWidth = isYellow ? 6.5 : 3.5;

      for (let i = 0; i <= pointsPerSector; i++) {
        const t = (s + i / pointsPerSector) / sectors;
        const pt = trackCurve.getPointAt(t % 1.0);
        if (pt) {
          const cx = 45 + (pt.x / 250) * 38;
          const cy = 45 + (pt.z / 150) * 38;
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
      }
      ctx.stroke();
    }

    // Render racers
    racers.forEach(r => {
      if (!r.mesh) return;
      const pt = r.mesh.position;
      const cx = 45 + (pt.x / 250) * 38;
      const cy = 45 + (pt.z / 150) * 38;

      ctx.beginPath();
      ctx.arc(cx, cy, r.isPlayer ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = r.isPlayer ? "#ef4444" : "#22d3ee"; // Red for player, Cyan for AI
      ctx.fill();

      if (r.isPlayer) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
    });
  }

  // 📊 Live updating F1 Leaderboard HUD Sidebar (Gap times & PIT status)
  function updateLeaderboardHUD() {
    const container = document.getElementById('leaderboard-rows-container');
    if (!container) return;

    // Throttling: only update leaderboard 10 times per second (every 100ms) for high performance!
    const nowTime = clock.getElapsedTime();
    if (nowTime - lastLeaderboardUpdate < 0.1) return;
    lastLeaderboardUpdate = nowTime;

    // Update lap count in header
    document.getElementById('leaderboard-lap-val').innerText = `LAP ${Math.min(maxLaps, currentLap)}/${maxLaps}`;

    const card = document.getElementById('f1-leaderboard-card');
    const headerText = document.getElementById('leaderboard-header-text');
    const lapVal = document.getElementById('leaderboard-lap-val');
    const btn = document.getElementById('btn-toggle-timing-tower');

    if (window.timingTowerCollapsed) {
      if (card) card.style.width = '145px';
      if (headerText) headerText.style.display = 'none';
      if (lapVal) lapVal.style.display = 'none';
      if (btn) {
        btn.innerHTML = '&gt;';
        btn.style.right = '8px';
      }
    } else {
      if (card) card.style.width = '220px';
      if (headerText) headerText.style.display = 'block';
      if (lapVal) lapVal.style.display = 'block';
      if (btn) {
        btn.innerHTML = '&lt;';
        btn.style.right = '8px';
      }
    }

    // Sort racers by posRank (ascending)
    const sorted = [...racers].sort((a, b) => a.posRank - b.posRank);

    const leaderScore = getRacerScore(sorted[0]);
    const playerIdx = sorted.findIndex(r => r.isPlayer);
    
    // Set container to flex layout for CSS order-based smooth animation sorting!
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    sorted.forEach((racer, idx) => {
      const pos = idx + 1;
      const key = racer.name.replace(/\s+/g, '');
      let row = document.getElementById(`leader-row-${key}`);
      
      if (!row) {
        row = document.createElement('div');
        row.id = `leader-row-${key}`;
        row.style.cssText = "display: flex; align-items: center; padding: 6px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.72rem; position: relative; transition: transform 0.3s ease, background-color 0.3s;";
        container.appendChild(row);
      }

      // Visually sort using CSS order
      row.style.order = idx;

      // Collapse logic: hide row if collapsed and not player
      if (window.timingTowerCollapsed) {
        if (racer.isPlayer) {
          row.style.display = 'flex';
          row.style.padding = '8px 12px';
        } else {
          row.style.display = 'none';
        }
      } else {
        row.style.display = 'flex';
        row.style.padding = '6px 12px';
      }

      // Highlight player row - strong neon cyan left stripe + background glow
      if (racer.isPlayer) {
        row.style.background = "linear-gradient(90deg, rgba(6, 182, 212, 0.35) 0%, rgba(6, 182, 212, 0.10) 100%)";
        row.style.boxShadow = "inset 3px 0 0 0 #06b6d4, inset 0 0 14px rgba(6, 182, 212, 0.25)";
        row.style.color = "#ffffff";
        row.style.borderRadius = "0px";
      } else {
        row.style.background = "transparent";
        row.style.boxShadow = "none";
        row.style.color = "rgba(255,255,255,0.9)";
      }

      // Rebuild inner contents dynamically (keeps DOM transitions intact!)
      row.innerHTML = '';

      // F1 Position badge (P1, P2, P3... or DNF)
      const posEl = document.createElement('span');
      if (racer.retired) {
        posEl.innerText = "DNF";
        posEl.style.cssText = "font-weight: 900; width: 28px; color: #ef4444; font-size: 0.65rem;";
      } else {
        posEl.innerText = `P${pos}`;
        posEl.style.cssText = `font-weight: 900; width: 26px; ${racer.isPlayer ? 'color: var(--neon-cyan);' : 'color: rgba(255,255,255,0.65);'}`;
      }
      row.appendChild(posEl);

      // Gained/Lost Place Indicator Badge relative to starting grid slot!
      const changeEl = document.createElement('span');
      const diff = (racer.gridStartPos || pos) - pos;
      if (diff > 0) {
        changeEl.innerText = `▲${diff}`;
        changeEl.style.cssText = "font-size: 0.55rem; color: #22c55e; width: 22px; font-weight: 900; margin-right: 4px; text-align: left;";
      } else if (diff < 0) {
        changeEl.innerText = `▼${Math.abs(diff)}`;
        changeEl.style.cssText = "font-size: 0.55rem; color: #ef4444; width: 22px; font-weight: 900; margin-right: 4px; text-align: left;";
      } else {
        changeEl.innerText = "—";
        changeEl.style.cssText = "font-size: 0.55rem; color: rgba(255,255,255,0.3); width: 22px; margin-right: 4px; text-align: left;";
      }
      row.appendChild(changeEl);

      // Team color strip
      const teamColor = F1_TEAMS[racer.teamIndex || 0].color;
      const strip = document.createElement('div');
      strip.style.cssText = `width: 3px; height: 14px; background: ${teamColor}; margin-right: 8px; border-radius: 1px;`;
      row.appendChild(strip);

      // Driver Name
      const threeLetterCode = racer.name.substring(0, 3).toUpperCase();
      const nameEl = document.createElement('span');
      nameEl.innerText = threeLetterCode;
      nameEl.style.cssText = `font-weight: 900; flex-grow: 1; letter-spacing: 0.5px; ${racer.isPlayer ? 'color: #fff;' : 'color: rgba(255,255,255,0.85);'}`;
      row.appendChild(nameEl);

      // Lap count badge (Updates LIVE every UI tick!)
      const lapBadge = document.createElement('span');
      lapBadge.innerText = `L${racer.completedLaps !== undefined ? racer.completedLaps : 0}`;
      lapBadge.style.cssText = "font-size: 0.65rem; color: rgba(255,255,255,0.5); font-weight: 700; margin-right: 8px; font-family: monospace;";
      row.appendChild(lapBadge);

      // Pit status or Gap / Lap time
      let isPittingNow = racer.isPlayer ? isPitting : (racer.isPitting || false);
      const gapEl = document.createElement('span');
      if (racer.retired) {
        gapEl.innerText = "DNF";
        gapEl.style.cssText = "font-weight: 900; color: #ef4444; background: rgba(239,68,68,0.18); padding: 1px 5px; border-radius: 3px; font-size: 0.6rem;";
      } else if (isPittingNow) {
        gapEl.innerText = "PIT";
        gapEl.style.cssText = "font-weight: 900; color: #22c55e; background: rgba(34,197,94,0.15); padding: 1px 5px; border-radius: 3px; font-size: 0.6rem; letter-spacing: 0.5px;";
      } else if (currentSessionIndex === 0 || currentSessionIndex === 1) {
        // Practice or Qualifying: show best lap time
        const bestLap = currentSessionIndex === 0 ? racer.bestPracticeLap : racer.bestQualifyingLap;
        let timeText = "";
        if (bestLap && bestLap !== Infinity) {
          timeText = formatLapTime(bestLap);
        } else {
          timeText = "--:--.---";
        }
        gapEl.innerText = timeText;
        gapEl.style.cssText = `font-weight: 700; font-size: 0.65rem; font-family: monospace; ${racer.isPlayer ? 'color: #facc15;' : 'color: rgba(255,255,255,0.7);'}`;
      } else {
        // Race: show gap to leader or lapped indicator
        let gapText = "";
        if (idx === 0) {
          gapText = "LEADER";
        } else {
          const leaderLaps = sorted[0].completedLaps || 0;
          const racerLaps = racer.completedLaps || 0;
          const lapDiff = leaderLaps - racerLaps;

          if (lapDiff > 1) {
            gapText = `+${lapDiff} LAPS`;
          } else if (lapDiff === 1) {
            gapText = `+1 LAP`;
          } else {
            const leaderOffset = sorted[0].currentOffset || 0.0;
            const racerOffset = racer.currentOffset || 0.0;
            const offsetDiff = (leaderOffset - racerOffset + 1.0) % 1.0;
            const gapSecs = offsetDiff * (1800.0 / Math.max(20.0, racer.speed || 80.0));
            gapText = `+${gapSecs.toFixed(2)}s`;
          }
        }
        gapEl.innerText = gapText;
        gapEl.style.cssText = `font-weight: 700; font-size: 0.65rem; ${racer.isPlayer ? 'color: #fff;' : 'color: rgba(255,255,255,0.7);'}`;
      }
      row.appendChild(gapEl);

      racer.posRank = pos;
    });
  }

  window.toggleFullscreen = () => {
    // Remove focus immediately to prevent Space key browser click triggers!
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Error enabling fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  let tempTrackSelection = 0;
  window.chooseTrackIndex = (idx) => {
    window.ApexAudio.playClick();
    tempTrackSelection = idx;
    
    document.getElementById('track-card-0').style.borderColor = idx === 0 ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.15)';
    document.getElementById('track-card-0').classList.toggle('selected', idx === 0);
    document.getElementById('track-card-1').style.borderColor = idx === 1 ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.15)';
    document.getElementById('track-card-1').classList.toggle('selected', idx === 1);
  };

  window.closeTrackSelection = () => {
    window.ApexAudio.playClick();
    const overlay = document.getElementById('track-selection-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
  };

  window.confirmTrackSelection = () => {
    window.ApexAudio.playClick();
    activeTrack = tempTrackSelection;
    const overlay = document.getElementById('track-selection-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
    
    // Hide career workstation if active
    const workstation = document.getElementById('f1-workstation-overlay');
    const isCareerSession = workstation && !workstation.classList.contains('hidden');
    if (workstation) {
      workstation.classList.add('hidden');
    }
    
    const sessionNames = ["PRACTICE", "QUALIFYING", "MAIN GP RACE"];
    const sessionTitle = isCareerSession ? sessionNames[currentSessionIndex] : "EXHIBITION GP";
    const trackNames = ["Sunset Coast Circuit", "Alpine Heights"];
    
    window.triggerLoadingScreen(sessionTitle, trackNames[activeTrack], () => {
      setupGame();
    });
  };

  window.openTrackSelection = () => {
    const overlay = document.getElementById('track-selection-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.style.display = 'flex';
    }
    window.chooseTrackIndex(0);
  };

  // ════ GAME SETTINGS CONTROLLERS & LOGIC ════
  const actionLabels = {
    accelerate: { label: "ACCELERATE", desc: "Speed up player car" },
    brake: { label: "BRAKE / REVERSE", desc: "Slow down / drive backwards" },
    steerLeft: { label: "STEER LEFT", desc: "Turn left" },
    steerRight: { label: "STEER RIGHT", desc: "Turn right" },
    drift: { label: "DRIFT / HANDBRAKE", desc: "Hold to drift around corners / Pit QTE" },
    upshift: { label: "UP-SHIFT", desc: "Increase gear sequential gearbox" },
    downshift: { label: "DOWN-SHIFT", desc: "Decrease gear sequential gearbox" },
    drs: { label: "DRS FLAP", desc: "Toggle Drag Reduction System" },
    radio: { label: "TEAM RADIO (V)", desc: "Hold/Press to activate voice commands" },
    status: { label: "CAR STATUS (T)", desc: "Toggle telemetry diagnostics card" },
    fullscreen: { label: "FULLSCREEN (F)", desc: "Toggle full screen mode" },
    engineMode: { label: "ENGINE MODE (M)", desc: "Cycle through fuel / power modes" },
    pitStop: { label: "PIT REQUEST (P)", desc: "Call to box box box this lap" }
  };

  function formatKeyCode(code) {
    if (!code) return 'NONE';
    return code
      .replace('Key', '')
      .replace('Digit', '')
      .replace('ArrowUp', 'UP')
      .replace('ArrowDown', 'DOWN')
      .replace('ArrowLeft', 'LEFT')
      .replace('ArrowRight', 'RIGHT')
      .replace('Space', 'SPACEBAR')
      .replace('ShiftLeft', 'L-SHIFT')
      .replace('ShiftRight', 'R-SHIFT')
      .replace('ControlLeft', 'L-CTRL')
      .replace('ControlRight', 'R-CTRL')
      .replace('AltLeft', 'L-ALT')
      .replace('AltRight', 'R-ALT')
      .toUpperCase();
  }

  let activeSettingsTab = 0;
  window.switchSettingsTab = (idx) => {
    window.ApexAudio.playClick();
    activeSettingsTab = idx;
    const tabs = document.querySelectorAll('.settings-tab-btn');
    tabs.forEach((t, i) => {
      t.classList.toggle('active', i === idx);
    });
    renderSettingsTabContent();
  };

  let isSettingsOpen = false;
  window.toggleSettingsOverlay = () => {
    isSettingsOpen = !isSettingsOpen;
    const overlay = document.getElementById('settings-overlay');
    if (!overlay) return;

    if (isSettingsOpen) {
      window.isGamePaused = true;
      overlay.style.display = 'flex';
      overlay.classList.remove('hidden');
      
      // Stop engine humming sound / drop pitch to idle while settings are open
      if (window.ApexAudio.isPlayingEngine) {
        window.ApexAudio.updateEnginePitch(1500);
        if (window.ApexAudio.engineGain && window.ApexAudio.ctx) {
          window.ApexAudio.engineGain.gain.setValueAtTime(0.01, window.ApexAudio.ctx.currentTime);
        }
      }

      window.switchSettingsTab(0);
      window.ApexAudio.playClick();

      // Show END SESSION row in settings if we're in Practice or Qualifying
      const endSessionRow = document.getElementById('settings-end-session-row');
      if (endSessionRow) {
        const isQual = (currentSessionIndex === 1);
        endSessionRow.style.display = (currentSessionIndex === 0 || currentSessionIndex === 1) ? 'block' : 'none';
        
        const label = endSessionRow.querySelector('div');
        if (label) {
          label.innerText = isQual ? "QUALIFYING SESSION CONTROL" : "PRACTICE SESSION CONTROL";
        }
        const btn = endSessionRow.querySelector('button');
        if (btn) {
          btn.innerHTML = isQual 
            ? "&#9632; RETIRE FROM QUALIFYING &rarr; GP GRID" 
            : "&#9632; END PRACTICE SESSION &rarr; QUALIFYING";
        }
      }
    } else {
      window.isGamePaused = false;
      overlay.style.display = 'none';
      overlay.classList.add('hidden');
      window.ApexAudio.playClick();
      
      // Restore engine humming sound
      if (window.ApexAudio.isPlayingEngine && window.ApexAudio.engineGain && window.ApexAudio.ctx) {
        window.ApexAudio.engineGain.gain.setValueAtTime(0.04, window.ApexAudio.ctx.currentTime);
      }
    }
  };

  function renderSettingsTabContent() {
    const container = document.getElementById('settings-tab-content');
    if (!container) return;

    container.innerHTML = '';

    // Show/hide quit button based on whether a race session is active
    const quitBtn = document.getElementById('settings-quit-btn');
    if (quitBtn) {
      quitBtn.style.display = isRaceActive ? 'block' : 'none';
    }

    if (activeSettingsTab === 0) {
      // Keybinds tab
      const desc = document.createElement('div');
      desc.style.cssText = "font-family: 'Inter', sans-serif; font-size: 0.72rem; color: rgba(255,255,255,0.4); margin-bottom: 12px; line-height: 1.4;";
      desc.innerText = "Click on any binding button, then press the key you want to assign to that control. Press Escape to cancel re-binding.";
      container.appendChild(desc);

      const keysGrid = document.createElement('div');
      keysGrid.style.cssText = "display: flex; flex-direction: column; gap: 4px;";
      
      for (const [action, meta] of Object.entries(actionLabels)) {
        const row = document.createElement('div');
        row.className = 'settings-row';
        
        const labelCol = document.createElement('div');
        labelCol.className = 'settings-row-label';
        
        const nameSpan = document.createElement('span');
        nameSpan.innerText = meta.label;
        const descSpan = document.createElement('span');
        descSpan.className = 'settings-row-desc';
        descSpan.innerText = meta.desc;
        
        labelCol.appendChild(nameSpan);
        labelCol.appendChild(descSpan);
        
        const button = document.createElement('button');
        button.className = 'settings-bind-btn';
        
        if (window.rebindingAction === action) {
          button.innerText = 'PRESS ANY KEY...';
          button.classList.add('waiting');
        } else {
          const currentBinds = window.keyBindings[action] || [];
          button.innerText = currentBinds.map(formatKeyCode).join(' / ') || 'NONE';
        }
        
        button.onclick = () => {
          window.ApexAudio.playClick();
          window.rebindingAction = action;
          renderSettingsTabContent();
        };
        
        row.appendChild(labelCol);
        row.appendChild(button);
        keysGrid.appendChild(row);
      }
      container.appendChild(keysGrid);
    } 
    else if (activeSettingsTab === 1) {
      // Audio tab
      const audioList = document.createElement('div');
      audioList.style.cssText = "display: flex; flex-direction: column; gap: 8px;";
      
      // Master Volume
      const masterRow = document.createElement('div');
      masterRow.className = 'settings-row';
      masterRow.innerHTML = `
        <div class="settings-row-label">
          <span>MASTER VOLUME</span>
          <span class="settings-row-desc">Adjust overall game sound volume level</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" class="settings-slider" min="0" max="1" step="0.05" value="${window.ApexAudio.masterVolume}" oninput="setGameMasterVolume(this.value)">
          <span id="audio-master-vol-value" style="font-size: 0.8rem; width: 45px; text-align: right; color: var(--neon-cyan);">${Math.round(window.ApexAudio.masterVolume * 100)}%</span>
        </div>
      `;
      audioList.appendChild(masterRow);

      // Engine Sound
      const engineRow = document.createElement('div');
      engineRow.className = 'settings-row';
      engineRow.innerHTML = `
        <div class="settings-row-label">
          <span>ENGINE SOUND</span>
          <span class="settings-row-desc">Enable or disable player car's motor sound FX</span>
        </div>
        <div>
          <select class="settings-select" onchange="toggleEngineSoundSetting(this.value === 'on')">
            <option value="on" ${window.engineSoundEnabled !== false ? 'selected' : ''}>ENABLED</option>
            <option value="off" ${window.engineSoundEnabled === false ? 'selected' : ''}>DISABLED</option>
          </select>
        </div>
      `;
      audioList.appendChild(engineRow);

      // Radio Sound
      const radioRow = document.createElement('div');
      radioRow.className = 'settings-row';
      radioRow.innerHTML = `
        <div class="settings-row-label">
          <span>TEAM RADIO VOICE</span>
          <span class="settings-row-desc">Adjust volume of pit wall race engineer speech</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" class="settings-slider" min="0" max="1" step="0.05" value="${window.radioVolume}" oninput="setRadioVolume(this.value)">
          <span id="audio-radio-vol-value" style="font-size: 0.8rem; width: 45px; text-align: right; color: var(--neon-cyan);">${Math.round(window.radioVolume * 100)}%</span>
        </div>
      `;
      audioList.appendChild(radioRow);

      // Team Radio Audio Speech toggler (OFF by default)
      const speechRow = document.createElement('div');
      speechRow.className = 'settings-row';
      speechRow.innerHTML = `
        <div class="settings-row-label">
          <span>TEAM RADIO AUDIO</span>
          <span class="settings-row-desc">Enable spoken audio commentary from engineer</span>
        </div>
        <div>
          <select class="settings-select" onchange="toggleVoiceSpeechSetting(this.value === 'on')">
            <option value="off" ${window.voiceSpeechEnabled === false ? 'selected' : ''}>DISABLED (OFF)</option>
            <option value="on" ${window.voiceSpeechEnabled !== false ? 'selected' : ''}>ENABLED (ON)</option>
          </select>
        </div>
      `;
      audioList.appendChild(speechRow);

      container.appendChild(audioList);
    } 
    else if (activeSettingsTab === 2) {
      // Graphics tab
      const graphicsList = document.createElement('div');
      graphicsList.style.cssText = "display: flex; flex-direction: column; gap: 8px;";

      // Shadows Quality
      const shadowRow = document.createElement('div');
      shadowRow.className = 'settings-row';
      shadowRow.innerHTML = `
        <div class="settings-row-label">
          <span>SHADOW QUALITY</span>
          <span class="settings-row-desc">Toggle real-time car and track object shadows</span>
        </div>
        <div>
          <select class="settings-select" onchange="setShadowsQuality(this.value)">
            <option value="high" ${window.graphicsShadows === 'high' ? 'selected' : ''}>HIGH (PCF Soft Shadows)</option>
            <option value="off" ${window.graphicsShadows === 'off' ? 'selected' : ''}>LOW (Shadows Disabled)</option>
          </select>
        </div>
      `;
      graphicsList.appendChild(shadowRow);

      // Effects / Particles
      const particlesRow = document.createElement('div');
      particlesRow.className = 'settings-row';
      particlesRow.innerHTML = `
        <div class="settings-row-label">
          <span>VISUAL EFFECTS / PARTICLES</span>
          <span class="settings-row-desc">Exhaust smoke, drift tire sparks and dirt debris</span>
        </div>
        <div>
          <select class="settings-select" onchange="setParticlesSetting(this.value === 'on')">
            <option value="on" ${window.particlesEnabled !== false ? 'selected' : ''}>ENABLED</option>
            <option value="off" ${window.particlesEnabled === false ? 'selected' : ''}>DISABLED</option>
          </select>
        </div>
      `;
      graphicsList.appendChild(particlesRow);

      // Resolution Scale
      const resRow = document.createElement('div');
      resRow.className = 'settings-row';
      resRow.innerHTML = `
        <div class="settings-row-label">
          <span>RESOLUTION SCALE</span>
          <span class="settings-row-desc">Downscale 3D viewport rendering to increase frame rate</span>
        </div>
        <div>
          <select class="settings-select" onchange="setResolutionScale(this.value)">
            <option value="native" ${window.resScaleSetting === 'native' ? 'selected' : ''}>NATIVE RETINA/DPI</option>
            <option value="1.0" ${window.resScaleSetting === '1.0' ? 'selected' : ''}>1.0x (Sharp)</option>
            <option value="0.75" ${window.resScaleSetting === '0.75' ? 'selected' : ''}>0.75x (Performance)</option>
            <option value="0.5" ${window.resScaleSetting === '0.5' ? 'selected' : ''}>0.5x (Max FPS)</option>
          </select>
        </div>
      `;
      graphicsList.appendChild(resRow);

      // Regulations Era Selection
      const regRow = document.createElement('div');
      regRow.className = 'settings-row';
      regRow.innerHTML = `
        <div class="settings-row-label">
          <span>REGULATIONS ERA</span>
          <span class="settings-row-desc">2026 (Active Aero + Overtake Mode) vs Legacy (Classic DRS)</span>
        </div>
        <div>
          <select class="settings-select" onchange="setRegulationEraSetting(this.value)">
            <option value="2026" ${window.f1RegulationEra === '2026' ? 'selected' : ''}>2026 REGULATIONS</option>
            <option value="legacy" ${window.f1RegulationEra === 'legacy' ? 'selected' : ''}>LEGACY DRS ERA</option>
          </select>
        </div>
      `;
      graphicsList.appendChild(regRow);

      container.appendChild(graphicsList);
    } 
    else if (activeSettingsTab === 3) {
      // Camera tab
      const cameraList = document.createElement('div');
      cameraList.style.cssText = "display: flex; flex-direction: column; gap: 8px;";

      // Distance
      const distRow = document.createElement('div');
      distRow.className = 'settings-row';
      distRow.innerHTML = `
        <div class="settings-row-label">
          <span>CHASE CAMERA DISTANCE</span>
          <span class="settings-row-desc">How far behind the car the camera follows</span>
        </div>
        <div>
          <select class="settings-select" onchange="setCameraSetting('distance', this.value)">
            <option value="tcam" ${window.cameraDistanceSetting === 'tcam' ? 'selected' : ''}>T-CAM (F1 Cockpit)</option>
            <option value="near" ${window.cameraDistanceSetting === 'near' ? 'selected' : ''}>NEAR (3.8m)</option>
            <option value="normal" ${window.cameraDistanceSetting === 'normal' ? 'selected' : ''}>NORMAL (5.4m)</option>
            <option value="far" ${window.cameraDistanceSetting === 'far' ? 'selected' : ''}>FAR (7.0m)</option>
          </select>
        </div>
      `;
      cameraList.appendChild(distRow);

      // Height
      const heightRow = document.createElement('div');
      heightRow.className = 'settings-row';
      heightRow.innerHTML = `
        <div class="settings-row-label">
          <span>CHASE CAMERA HEIGHT</span>
          <span class="settings-row-desc">Elevation height of the pursuit camera</span>
        </div>
        <div>
          <select class="settings-select" onchange="setCameraSetting('height', this.value)">
            <option value="low" ${window.cameraHeightSetting === 'low' ? 'selected' : ''}>LOW (0.95m)</option>
            <option value="normal" ${window.cameraHeightSetting === 'normal' ? 'selected' : ''}>NORMAL (1.4m)</option>
            <option value="high" ${window.cameraHeightSetting === 'high' ? 'selected' : ''}>HIGH (2.0m)</option>
          </select>
        </div>
      `;
      cameraList.appendChild(heightRow);

      // Shake
      const shakeRow = document.createElement('div');
      shakeRow.className = 'settings-row';
      shakeRow.innerHTML = `
        <div class="settings-row-label">
          <span>CAMERA SHAKE</span>
          <span class="settings-row-desc">Vibrate camera dynamically at speeds above 100 km/h</span>
        </div>
        <div>
          <select class="settings-select" onchange="setCameraSetting('shake', this.value)">
            <option value="on" ${window.cameraShakeSetting !== false ? 'selected' : ''}>ENABLED</option>
            <option value="off" ${window.cameraShakeSetting === false ? 'selected' : ''}>DISABLED</option>
          </select>
        </div>
      `;
      cameraList.appendChild(shakeRow);

      // Tilt
      const tiltRow = document.createElement('div');
      tiltRow.className = 'settings-row';
      tiltRow.innerHTML = `
        <div class="settings-row-label">
          <span>CAMERA YAW TILT</span>
          <span class="settings-row-desc">Pivot camera slightly when sliding or drifting</span>
        </div>
        <div>
          <select class="settings-select" onchange="setCameraSetting('tilt', this.value)">
            <option value="on" ${window.cameraTiltSetting !== false ? 'selected' : ''}>ENABLED</option>
            <option value="off" ${window.cameraTiltSetting === false ? 'selected' : ''}>DISABLED</option>
          </select>
        </div>
      `;
      cameraList.appendChild(tiltRow);

      // Base FOV
      const fovRow = document.createElement('div');
      fovRow.className = 'settings-row';
      fovRow.innerHTML = `
        <div class="settings-row-label">
          <span>BASE FIELD OF VIEW (FOV)</span>
          <span class="settings-row-desc">Adjust horizontal viewpoint angle (base value)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" class="settings-slider" min="50" max="95" step="5" value="${window.baseFOV}" oninput="setCameraFOVSetting(this.value)">
          <span id="camera-fov-value" style="font-size: 0.8rem; width: 45px; text-align: right; color: var(--neon-cyan);">${window.baseFOV}°</span>
        </div>
      `;
      cameraList.appendChild(fovRow);

      container.appendChild(cameraList);
    }
  }

  // Settings adjustment handlers
  window.setGameMasterVolume = (val) => {
    window.ApexAudio.masterVolume = parseFloat(val);
    localStorage.setItem('apex_stars_master_volume', val);
    window.ApexAudio.setVolume(parseFloat(val));
    const volValText = document.getElementById('audio-master-vol-value');
    if (volValText) volValText.innerText = `${Math.round(val * 100)}%`;
  };

  window.toggleEngineSoundSetting = (checked) => {
    window.engineSoundEnabled = checked;
    localStorage.setItem('apex_stars_engine_sound', checked);
    if (!checked) {
      window.ApexAudio.stopEngine();
    } else {
      if (isRaceActive && !window.isGamePaused) {
        window.ApexAudio.startEngine();
      }
    }
  };

  window.setRadioVolume = (val) => {
    window.radioVolume = parseFloat(val);
    localStorage.setItem('apex_stars_radio_volume', val);
    const volValText = document.getElementById('audio-radio-vol-value');
    if (volValText) volValText.innerText = `${Math.round(val * 100)}%`;
  };

  window.toggleVoiceSpeechSetting = (checked) => {
    window.voiceSpeechEnabled = checked;
    localStorage.setItem('apex_stars_voice_speech', checked);
  };

  window.setShadowsQuality = (val) => {
    window.graphicsShadows = val;
    localStorage.setItem('apex_stars_shadows', val);
    if (!renderer) return;
    renderer.shadowMap.enabled = val === 'high';
    scene.traverse(child => {
      if (child.isMesh) {
        child.castShadow = val === 'high';
        child.receiveShadow = val === 'high';
      }
    });
    const dirLight = scene.children.find(c => c.isDirectionalLight);
    if (dirLight) {
      dirLight.castShadow = val === 'high';
    }
  };

  window.setParticlesSetting = (enabled) => {
    window.particlesEnabled = enabled;
    localStorage.setItem('apex_stars_particles', enabled);
  };

  window.setRegulationEraSetting = (val) => {
    window.f1RegulationEra = val;
    localStorage.setItem('f1_regulation_era', val);
    window.ApexAudio.playClick();
    
    // Reset DRS / Overtake Mode state variables immediately
    drsActive = false;
    drsAvailable = false;
    window.overtakeModeActive = false;
    window.overtakeModeEligible = false;
    if (playerKart) playerKart.ersEnergy = ERS_MAX_ENERGY;
    window.ersBatteryLevel = 100.0;
    
    // Hide or reset alert
    const alertEl = document.getElementById('hud-drs-alert');
    if (alertEl) alertEl.style.display = 'none';
    
    speakEngineerRadio(val === '2026' ? "Switched to 2026 regulations mode." : "Switched to legacy DRS regulations.");
    renderSettingsTabContent();
  };

  window.setResolutionScale = (val) => {
    window.resScaleSetting = val;
    localStorage.setItem('apex_stars_resscale', val);
    if (!renderer) return;
    const pixelRatio = val === 'native' ? window.devicePixelRatio : parseFloat(val);
    renderer.setPixelRatio(pixelRatio);
    window.dispatchEvent(new Event('resize'));
  };

  window.setCameraSetting = (type, val) => {
    localStorage.setItem(`apex_stars_camera_${type}`, val);
    if (type === 'distance') {
      window.cameraDistanceSetting = val;
    } else if (type === 'height') {
      window.cameraHeightSetting = val;
    } else if (type === 'shake') {
      window.cameraShakeSetting = val === 'on';
    } else if (type === 'tilt') {
      window.cameraTiltSetting = val === 'on';
    }
  };

  window.setCameraFOVSetting = (val) => {
    window.baseFOV = parseInt(val);
    localStorage.setItem('apex_stars_camera_fov', val);
    const fovValText = document.getElementById('camera-fov-value');
    if (fovValText) fovValText.innerText = `${val}°`;
  };

  window.restoreSettingsDefaults = () => {
    window.ApexAudio.playClick();
    
    // Clear localStorage values
    localStorage.removeItem('apex_stars_keybinds');
    localStorage.removeItem('apex_stars_master_volume');
    localStorage.removeItem('apex_stars_engine_sound');
    localStorage.removeItem('apex_stars_radio_volume');
    localStorage.removeItem('apex_stars_voice_speech');
    localStorage.removeItem('apex_stars_shadows');
    localStorage.removeItem('apex_stars_particles');
    localStorage.removeItem('apex_stars_resscale');
    localStorage.removeItem('apex_stars_camera_distance');
    localStorage.removeItem('apex_stars_camera_height');
    localStorage.removeItem('apex_stars_camera_shake');
    localStorage.removeItem('apex_stars_camera_tilt');
    localStorage.removeItem('apex_stars_camera_fov');

    // Reset variables to defaults
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

    window.ApexAudio.masterVolume = 0.35;
    window.engineSoundEnabled = true;
    window.radioVolume = 1.0;
    window.voiceSpeechEnabled = true; // Enabled by default!
    window.graphicsShadows = 'high';
    window.particlesEnabled = true;
    window.resScaleSetting = 'native';
    window.cameraDistanceSetting = 'normal';
    window.cameraHeightSetting = 'normal';
    window.cameraShakeSetting = true;
    window.cameraTiltSetting = true;
    window.baseFOV = 65;

    // Apply defaults immediately
    window.ApexAudio.setVolume(0.35);
    if (renderer) {
      renderer.shadowMap.enabled = true;
      renderer.setPixelRatio(window.devicePixelRatio);
    }
    
    // Refresh content
    renderSettingsTabContent();
    speakEngineerRadio("Settings reset to defaults.", 50);
  };

  window.quitToMainMenu = () => {
    window.ApexAudio.playClick();
    
    // Hide settings panel
    window.isGamePaused = false;
    const settingsOverlay = document.getElementById('settings-overlay');
    if (settingsOverlay) {
      settingsOverlay.style.display = 'none';
      settingsOverlay.classList.add('hidden');
    }
    
    // Hide game HUD
    const hud = document.getElementById('hud-layer');
    if (hud) hud.style.display = 'none';
    const leadCard = document.getElementById('f1-leaderboard-card');
    if (leadCard) leadCard.style.display = 'none';

    // Terminate active race
    isRaceActive = false;
    window.ApexAudio.stopEngine();

    // Show main menu
    const menu = document.getElementById('main-landing-screen');
    if (menu) {
      menu.classList.remove('hidden');
      menu.style.display = 'flex';
    }
    
    // Stop animation frame and clean scene
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    setupMenuPreview();
    speakEngineerRadio("Returned to base dashboard.", 50);
  };

  // Bind to landing tab #4 (OPTIONS)
  const originalSelectLandingTab = window.selectLandingTab;
  window.selectLandingTab = (idx, element) => {
    if (idx === 4) {
      window.ApexAudio.playClick();
      const items = document.querySelectorAll('.f1-nav-item');
      items.forEach(i => i.classList.remove('active'));
      element.classList.add('active');
      window.toggleSettingsOverlay();
      return;
    }
    originalSelectLandingTab(idx, element);
  };


})();
