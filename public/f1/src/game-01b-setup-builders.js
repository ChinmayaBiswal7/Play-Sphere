  // ════ 3D GRAND PRIX GAMEPLAY ════
  function setupGame() {
    postRaceActive = false;
    postRaceState = "FINISHING";
    currentRaceId++;
    if (window.AIBrainManager) window.AIBrainManager.resetAll();
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
    window.timingTowerCollapsed = false;
    window.timingTowerManuallyToggled = false;
    
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

      // Position player at pit box / garage
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
        // Bay 1 (Left Bay): centered at -6.0m from garage center along tangent, 19.5m offset from pit curve
        playerKart.mesh.position.copy(pt.clone().add(norm.clone().multiplyScalar(19.5)).add(tang.clone().multiplyScalar(-6.0)));
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

      // Group non-player racers by teamIndex
      const teamRacersMap = {};
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
        const tIdx = (r.teamIndex !== undefined) ? r.teamIndex : 0;
        if (!teamRacersMap[tIdx]) teamRacersMap[tIdx] = [];
        teamRacersMap[tIdx].push(r);
      });

      // Position each constructor team's AI cars in Bay 1 & Bay 2 side-by-side
      Object.keys(teamRacersMap).forEach(teamKey => {
        const tIdx = parseInt(teamKey, 10);
        const teamCars = teamRacersMap[tIdx];
        const boxT = T_START + (tIdx + 0.5) * TEAM_STEP;

        if (pitCurve) {
          const pt = pitCurve.getPointAt(boxT);
          const tang = pitCurve.getTangentAt(boxT).normalize();
          const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
          const exitDir = norm.clone().negate().normalize();
          const heading = Math.atan2(exitDir.x, exitDir.z);

          teamCars.forEach((r, carIdx) => {
            r.inPitLane = true;
            r.pitZone = "PIT_BOX";
            r.currentPath = "PIT";
            r.pitProgress = boxT;

            // If player's team, player is Car 1 (Bay 1: -6.0), so teammate is Car 2 (Bay 2: +6.0)
            // For other teams: carIdx 0 is Car 1 (Bay 1: -6.0), carIdx 1 is Car 2 (Bay 2: +6.0)
            const isPlayerTeam = (tIdx === selectedTeamIndex);
            const bayLateral = isPlayerTeam ? 6.0 : (carIdx === 0 ? -6.0 : 6.0);

            if (r.mesh) {
              r.mesh.position.copy(pt.clone().add(norm.clone().multiplyScalar(19.5)).add(tang.clone().multiplyScalar(bayLateral)));
              r.mesh.rotation.set(0, heading, 0);
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
      isStartingSequence = false;
      const overlay = document.getElementById('f1-starting-lights-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
      }
      return;
    }
    startingSequenceTime += delta;

    // Position karts into exact grid positions at start
    racers.forEach((racer, idx) => {
      if (racer.isPlayer) {
        if (racer.inPitLane || racer.pitAutopilot || racer.driveOutAutopilot) return;
      }
      const myGridIdx = window.startingGrid ? window.startingGrid.findIndex(g => g.name === racer.name) : idx;
      const slotIdx = myGridIdx !== -1 ? myGridIdx : idx;
      const slot = window.getGridSlotTransform(slotIdx);

      if (racer.mesh) {
        racer.mesh.position.copy(slot.position);
        racer.mesh.rotation.y = slot.heading;
      }
      racer.speed = 0.0;
      racer.currentOffset = slot.progress;
      racer.sideOffset = slot.sideOffset;
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

    window.timingTowerCollapsed = false;
    window.timingTowerManuallyToggled = false;
    if (typeof updateLeaderboardHUD === 'function') updateLeaderboardHUD();

    setTimeout(() => {
      if (!window.timingTowerManuallyToggled && isRaceActive) {
        window.timingTowerCollapsed = true;
        if (typeof updateLeaderboardHUD === 'function') updateLeaderboardHUD();
      }
    }, 8000);
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

    // 6. Official F1 Start / Finish Line (Solid Checkered FIA Timing Stripe spanning 16.0m across full track asphalt at t = 0.0)
    const sfP = trackCurve.getPointAt(0.0);
    const sfTang = trackCurve.getTangentAt(0.0).normalize();
    const sfHeading = Math.atan2(sfTang.x, sfTang.z);

    const sfcCanvas = document.createElement('canvas');
    sfcCanvas.width = 256; sfcCanvas.height = 32;
    const sctx = sfcCanvas.getContext('2d');
    sctx.fillStyle = '#ffffff'; sctx.fillRect(0, 0, 256, 32);
    sctx.fillStyle = '#0a0a0f';
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 16; c++) {
        if ((r + c) % 2 === 1) sctx.fillRect(c * 16, r * 16, 16, 16);
      }
    }
    const sfTex = new THREE.CanvasTexture(sfcCanvas);
    sfTex.wrapS = THREE.RepeatWrapping; sfTex.wrapT = THREE.ClampToEdgeWrapping;
    sfTex.repeat.set(2, 1);
    const sfMat = new THREE.MeshBasicMaterial({ 
      map: sfTex, 
      side: THREE.DoubleSide,
      polygonOffset: true, 
      polygonOffsetFactor: -4, 
      polygonOffsetUnits: -4 
    });
    // 16.0m across the track (X), 0.012m height (Y), 1.2m thickness along track (Z)
    const sfGeo = new THREE.BoxGeometry(16.0, 0.012, 1.2);
    const sfLine = new THREE.Mesh(sfGeo, sfMat);
    sfLine.position.set(sfP.x, sfP.y + 0.035, sfP.z);
    sfLine.rotation.y = sfHeading;
    scene.add(sfLine);

    // 7. Official FIA Staggered Starting Grid Boxes (Matching real Grand Prix photos)
    const gridWhiteMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      side: THREE.DoubleSide,
      polygonOffset: true, 
      polygonOffsetFactor: -4, 
      polygonOffsetUnits: -4
    });
    const gridYellowMat = new THREE.MeshBasicMaterial({ 
      color: 0xffe600, 
      side: THREE.DoubleSide,
      polygonOffset: true, 
      polygonOffsetFactor: -5, 
      polygonOffsetUnits: -5
    });

    for (let slot = 0; slot < 20; slot++) {
      const slotOffset = (1.0 - 0.003 - (slot * 0.0045) + 1.0) % 1.0;
      const side = (slot % 2 === 0) ? -2.0 : 2.0;

      const p = trackCurve.getPointAt(slotOffset);
      const tang = trackCurve.getTangentAt(slotOffset).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      const center = p.clone().add(norm.clone().multiplyScalar(side));

      const slotGroup = new THREE.Group();
      slotGroup.position.set(center.x, center.y + 0.035, center.z);
      // Strictly align local +Z forward along racing direction using heading angle (guarantees det +1)
      slotGroup.rotation.y = Math.atan2(tang.x, tang.z);

      // 1. Solid White Front Stop Bar (3.2m wide across, 0.35m thick along track) at front of slot
      const stopBar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.008, 0.35), gridWhiteMat);
      stopBar.position.set(0, 0, 2.5);
      slotGroup.add(stopBar);

      // 2. Long FIA Yellow Center Alignment Stripe (6.0m long down middle, extending forward past stop bar)
      const yellowCenterline = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.010, 6.0), gridYellowMat);
      yellowCenterline.position.set(0, 0.002, 1.5);
      slotGroup.add(yellowCenterline);

      // 3. Left White Bracket Rail ([)
      const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.008, 5.6), gridWhiteMat);
      leftRail.position.set(-1.6, 0, -0.3);
      const leftRearTick = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.008, 0.18), gridWhiteMat);
      leftRearTick.position.set(-1.325, 0, -3.1);
      slotGroup.add(leftRail, leftRearTick);

      // 4. Right White Bracket Rail (])
      const rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.008, 5.6), gridWhiteMat);
      rightRail.position.set(1.6, 0, -0.3);
      const rightRearTick = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.008, 0.18), gridWhiteMat);
      rightRearTick.position.set(1.325, 0, -3.1);
      slotGroup.add(rightRail, rightRearTick);

      // 5. Position Number Painted Directly on Track Asphalt (P1 - P20)
      const numCanvas = document.createElement('canvas');
      numCanvas.width = 128; numCanvas.height = 128;
      const nctx = numCanvas.getContext('2d');
      nctx.clearRect(0, 0, 128, 128);
      // Correct for horizontal mirroring so text reads upright and un-mirrored looking forward
      nctx.translate(128, 0);
      nctx.scale(-1, 1);
      nctx.fillStyle = '#ffffff';
      nctx.font = '900 68px "Orbitron", sans-serif';
      nctx.textAlign = 'center';
      nctx.textBaseline = 'middle';
      nctx.fillText(String(slot + 1), 64, 64);

      const numTex = new THREE.CanvasTexture(numCanvas);
      const numMat = new THREE.MeshBasicMaterial({ 
        map: numTex, 
        transparent: true, 
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4
      });
      const numMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), numMat);
      numMesh.rotation.x = -Math.PI / 2;
      numMesh.rotation.z = Math.PI; // Upright looking forward along track
      numMesh.position.set(side < 0 ? -2.4 : 2.4, 0.003, 2.0);
      slotGroup.add(numMesh);

      scene.add(slotGroup);
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
    // Starts at 9.5m (beyond the 8.0m main road curb) so pit curve never encroaches into the main track!
    const offsets = [];
    for (let s = 0; s <= samples; s++) {
      if (s < 4) {
        // Smooth S-curve entry from 9.5m (curb boundary) to 17.0m (fast lane)
        const x = s / 4;
        const smooth = x * x * (3 - 2 * x);
        offsets.push(9.5 + 7.5 * smooth);
      } else if (s > 8) {
        // Smooth S-curve exit from 17.0m to 9.5m (curb boundary)
        const x = (12 - s) / 4;
        const smooth = x * x * (3 - 2 * x);
        offsets.push(9.5 + 7.5 * smooth);
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

