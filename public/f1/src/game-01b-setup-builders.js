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
      playerKart.tyreLife = 100.0;
      playerKart.tyreCompound = activeCompound || "medium";
      playerKart.hasDrivenOutThisSession = true; // Skip drive out!
      playerKart.driveOutState = "COMPLETE";
      playerKart.driveOutAutopilot = false;
      playerKart.controlsEnabled = true;

      // Position all AI karts on starting grid
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
      const pBoxT = 0.30 + (selectedTeamIndex / Math.max(1, totalBoxes - 1)) * 0.40;
      pitProgress = pBoxT;
      
      if (pitCurve && playerKart.mesh) {
        const pt = pitCurve.getPointAt(pBoxT);
        const tang = pitCurve.getTangentAt(pBoxT).normalize();
        const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
        playerKart.mesh.position.copy(pt.clone().add(norm.clone().multiplyScalar(16.5)));
        playerKart.mesh.lookAt(pt); // faces directly out of garage toward the pit lane!
        playerKart.heading = Math.atan2(pt.x - playerKart.mesh.position.x, pt.z - playerKart.mesh.position.z);
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
          if (r.mesh) r.mesh.visible = false;
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

    if (startingSequenceTime < 4.0) {
      if (formationCameraAllowed) {
        // 🎥 Camera Flyby Sweep view (Panning along the 16 karts grid)
        const progress = startingSequenceTime / 4.0;
        const camOffset = (1.0 - 0.075 * (1.0 - progress)) % 1.0;
        const camPt = trackCurve.getPointAt(camOffset);
        
        if (typeof window.claimCameraOwner === 'function') {
          window.claimCameraOwner("GRID_FLYBY_SWEEP");
        }
        camera.position.copy(camPt.clone().add(new THREE.Vector3(0, 3.5, 4.0)));
        camera.lookAt(playerKart.mesh.position);
      }
      
      document.getElementById('lights-banner-title').innerText = "GRID FORMATION";
      
      // Rev engines slightly
      if (Math.random() < 0.05) {
        window.ApexAudio.updateEnginePitch(0.3 + Math.random() * 0.15);
      }
    } else if (startingSequenceTime < 9.0 + (window.randomLightsOutHold || 1.2)) {
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

      document.getElementById('lights-banner-title').innerText = "PREPARE TO LAUNCH";

      // Rev engines high during starting hold
      window.ApexAudio.updateEnginePitch(0.72 + Math.sin(clock.getElapsedTime() * 16.0) * 0.04);

      // Bulbs check one-by-one (every 1.0s)
      const elapsedLights = startingSequenceTime - 4.0; // 0 to 5 seconds
      const bulbCols = Math.floor(elapsedLights);

      for (let c = 0; c < 5; c++) {
        const glow = c <= bulbCols;
        for (let b = 0; b < 2; b++) {
          const bulbId = c * 2 + b;
          const el = document.getElementById(`light-red-${bulbId}`);
          if (el) {
            if (glow) {
              el.style.background = "#ef4444";
              el.style.boxShadow = "0 0 18px #ef4444, inset 0 2px 4px rgba(255,255,255,0.65)";
            } else {
              el.style.background = "#1f2937";
              el.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.6)";
            }
          }
        }
        if (glow && c > lastLightSoundIndex) {
          window.ApexAudio.playPickup(); // Beep chimes
          lastLightSoundIndex = c;
        }
      }
    } else {
      // 🟢 Lights Out!
      for (let i = 0; i < 10; i++) {
        const el = document.getElementById(`light-red-${i}`);
        if (el) {
          el.style.background = "#1f2937";
          el.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.6)";
        }
      }

      const overlay = document.getElementById('f1-starting-lights-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none'; // Direct style override
      }

      window.ApexAudio.playBoost();
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

  // Helper: Calculate safety distance from position to track curve
  function getDistanceToTrack(pos) {
    if (!pos) return Infinity;
    if (!trackCurve || !trackCurve.points || trackCurve.points.length === 0) return Infinity;
    let minDist = Infinity;
    const steps = 300;
    for (let i = 0; i <= steps; i++) {
      const pt = trackCurve.getPointAt(i / steps);
      if (!pt) continue;
      const d = pos.distanceTo(pt);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  // Helper: Calculate safety distance from position to pit lane curve
  function getDistanceToPit(pos) {
    if (!pos) return Infinity;
    if (!pitCurve || !pitCurve.points || pitCurve.points.length === 0) return Infinity;
    let minDist = Infinity;
    const steps = 150;
    for (let i = 0; i <= steps; i++) {
      const pt = pitCurve.getPointAt(i / steps);
      if (!pt) continue;
      const d = pos.distanceTo(pt);
      if (d < minDist) minDist = d;
    }
    return minDist;
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

      uvs.push(t, 0);
      uvs.push(t, 1);
    }

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      // Skip indexing segments on the right pit side (10.5) inside the entire pit lane range (t >= 0.965 || t <= 0.065)
      if (sideOffset > 0 && (t >= 0.965 || t <= 0.065)) {
        continue;
      }
      const row1 = i * 2;
      const row2 = (i + 1) * 2;
      indices.push(row1, row1 + 1, row2);
      indices.push(row1 + 1, row2 + 1, row2);
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

  function buildRoad() {
    // Road (width 16m)
    const trackGeo = createCustomTrackGeometry(trackCurve, 16.0, 220);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.75, metalness: 0.1 });
    trackMesh = new THREE.Mesh(trackGeo, trackMat);
    scene.add(trackMesh);

    // Kerbs (width 17.6m) — pushed down 3cm to kill z-fighting, striped red/white
    const kerbGeo = createCustomTrackGeometry(trackCurve, 17.6, 220);
    const kerbCanvas = document.createElement('canvas');
    kerbCanvas.width = 64; kerbCanvas.height = 64;
    const kctx = kerbCanvas.getContext('2d');
    kctx.fillStyle = '#ef4444'; kctx.fillRect(0, 0, 64, 64);
    kctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) kctx.fillRect(0, i * 16, 64, 8);
    const kerbTex = new THREE.CanvasTexture(kerbCanvas);
    kerbTex.wrapS = kerbTex.wrapT = THREE.RepeatWrapping;
    kerbTex.repeat.set(1, 60);
    const kerbMat = new THREE.MeshStandardMaterial({ map: kerbTex, roughness: 0.85 });
    const kerbMesh = new THREE.Mesh(kerbGeo, kerbMat);
    kerbMesh.position.y = -0.03;
    scene.add(kerbMesh);

    // dashed white center road lines (flat planes to avoid 3D white-black shading artifacts)
    for (let i = 0; i < 150; i++) {
      const t = i / 150;
      const p = trackCurve.getPointAt(t);
      const tang = trackCurve.getTangentAt(t);
      const lineGeo = new THREE.PlaneGeometry(0.18, 1.8);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.copy(p);
      line.position.y = 0.015; // slightly above road surface
      line.lookAt(p.clone().add(tang));
      line.rotateX(Math.PI / 2);
      scene.add(line);
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
    
    // 1. Fast lane (4m wide): extruded along the ENTIRE pitCurve (entry -> parallel -> exit)
    const fastLaneGeo = createCustomTrackGeometry(pitCurve, 4.0, 120);
    const fastLaneMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const fastLaneMesh = new THREE.Mesh(fastLaneGeo, fastLaneMat);
    scene.add(fastLaneMesh);

    // 2. Working lane (8m wide): only built along the parallel portion (index 3 to 9)
    const parallelPts = [];
    for (let s = 3; s <= 9; s++) {
      const t = straightPts[s];
      const pt   = trackCurve.getPointAt(t);
      const tang = trackCurve.getTangentAt(t).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      parallelPts.push(pt.clone().add(norm.multiplyScalar(23.0))); // Working lane center is at 23.0m offset!
    }
    const parallelCurve = new THREE.CatmullRomCurve3(parallelPts, false, "catmullrom", 0.5);
    const workingLaneGeo = createCustomTrackGeometry(parallelCurve, 8.0, 60);
    const workingLaneMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
    const workingLaneMesh = new THREE.Mesh(workingLaneGeo, workingLaneMat);
    workingLaneMesh.position.y = 0.005; // slightly above fast lane
    scene.add(workingLaneMesh);

    // 3. Grass runoff strip: between the main road and the fast lane (index 3 to 9)
    const runoffPts = [];
    for (let s = 3; s <= 9; s++) {
      const t = straightPts[s];
      const pt   = trackCurve.getPointAt(t);
      const tang = trackCurve.getTangentAt(t).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      runoffPts.push(pt.clone().add(norm.multiplyScalar(11.0)));
    }
    const runoffCurve = new THREE.CatmullRomCurve3(runoffPts, false, "catmullrom", 0.5);
    const runoffGeo  = createCustomTrackGeometry(runoffCurve, 5.0, 60);
    const runoffMat  = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 1.0 });
    const runoffMesh = new THREE.Mesh(runoffGeo, runoffMat);
    runoffMesh.position.y = -0.01;
    scene.add(runoffMesh);

    // ── Concrete pit wall: built only along the parallel portion (index 3 to 9)
    const pitWallMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.85 });
    for (let s = 3; s < 9; s++) {
      const wallA = trackCurve.getPointAt(straightPts[s]).clone().add(
        new THREE.Vector3(-trackCurve.getTangentAt(straightPts[s]).z, 0, trackCurve.getTangentAt(straightPts[s]).x).normalize().multiplyScalar(14.0)
      );
      const wallB = trackCurve.getPointAt(straightPts[s + 1]).clone().add(
        new THREE.Vector3(-trackCurve.getTangentAt(straightPts[s + 1]).z, 0, trackCurve.getTangentAt(straightPts[s + 1]).x).normalize().multiplyScalar(14.0)
      );
      const mid   = wallA.clone().lerp(wallB, 0.5);
      const segLen = wallA.distanceTo(wallB);
      if (segLen < 0.1) continue;
      const wallSeg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, segLen + 0.05), pitWallMat);
      wallSeg.position.copy(mid);
      wallSeg.position.y += 0.3;
      wallSeg.lookAt(wallB.clone().add(new THREE.Vector3(0, 0.3, 0)));
      scene.add(wallSeg);
    }

    // ── Pit box markings (evenly spaced along the parallel section t=0.30 to 0.70 on the working lane at 23.0m offset)
    const teamColors = F1_TEAMS.map(t => parseInt(t.color.replace('#',''), 16));
    const totalBoxes = F1_TEAMS.length;
    for (let b = 0; b < totalBoxes; b++) {
      const boxT = 0.30 + (b / Math.max(1, totalBoxes - 1)) * 0.40;
      const pitPt  = pitCurve.getPointAt(boxT);
      const pitTng = pitCurve.getTangentAt(boxT).normalize();
      const pitNm  = new THREE.Vector3(-pitTng.z, 0, pitTng.x).normalize();
      const boxMat = new THREE.MeshBasicMaterial({ color: teamColors[b] });
      const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.04, 1.0), boxMat);
      boxMesh.position.copy(pitPt).add(pitNm.clone().multiplyScalar(6.0));
      boxMesh.position.y = 0.04;
      boxMesh.lookAt(boxMesh.position.clone().add(pitTng));
      scene.add(boxMesh);

      const labelMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.05, 4.0),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      labelMesh.position.copy(pitPt).add(pitNm.clone().multiplyScalar(6.0));
      labelMesh.position.y = 0.045;
      labelMesh.lookAt(labelMesh.position.clone().add(pitTng));
      scene.add(labelMesh);
    }

    // ── Green guide line (centre of the actual path driven by the player's car)
    const guidePts = [];
    for (let j = 0; j <= 120; j++) {
      const tProgress = j / 120;
      const pt   = pitCurve.getPointAt(tProgress);
      const tang = pitCurve.getTangentAt(tProgress).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

      // Mirror the exact lateral offset logic followed during player drive execution (centered on player team box 0 at stopT=0.30)
      let lateralOffset = 0.0;
      const transitionWindow = 0.11;
      const stopT = 0.30; 

      if (tProgress < stopT) {
        if (tProgress > stopT - transitionWindow) {
          const factor = (tProgress - (stopT - transitionWindow)) / transitionWindow;
          const tSmooth = factor * factor * (3 - 2 * factor);
          lateralOffset = tSmooth * 6.0;
        } else {
          lateralOffset = 0.0;
        }
      } else {
        if (tProgress < stopT + transitionWindow) {
          const factor = (tProgress - stopT) / transitionWindow;
          const tSmooth = factor * factor * (3 - 2 * factor);
          lateralOffset = 6.0 - tSmooth * 6.0;
        } else {
          lateralOffset = 0.0;
        }
      }

      guidePts.push(pt.clone().add(norm.multiplyScalar(lateralOffset)));
    }
    const pitLineGeo = new THREE.BufferGeometry().setFromPoints(guidePts);
    const pitLineMat = new THREE.LineBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.85 });
    pitGuideLine = new THREE.Line(pitLineGeo, pitLineMat);
    pitGuideLine.position.y = 0.03;
    scene.add(pitGuideLine);

    // ── Edge painted lines (edges of the working lane - parallel section only)
    const edgePtsL = [], edgePtsR = [];
    for (let j = 0; j <= 60; j++) {
      const tProgress = 0.25 + (j / 60) * 0.50; // parallel working section (from 0.25 to 0.75)
      const pt   = pitCurve.getPointAt(tProgress);
      const tang = pitCurve.getTangentAt(tProgress).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      edgePtsL.push(pt.clone().add(norm.clone().multiplyScalar(2.0)));  // left edge of working lane (19m)
      edgePtsR.push(pt.clone().add(norm.clone().multiplyScalar(10.0))); // right edge of working lane (27m)
    }
    const edgeLL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgePtsL), new THREE.LineBasicMaterial({ color: 0xffffff }));
    const edgeLR = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgePtsR), new THREE.LineBasicMaterial({ color: 0xffffff }));
    edgeLL.position.y = 0.04;
    edgeLR.position.y = 0.04;
    scene.add(edgeLL, edgeLR);

    // ── Entry painted lines (edges of entry road)
    const entryPtsL = [], entryPtsR = [];
    for (let j = 0; j <= 40; j++) {
      const tProgress = (j / 40) * 0.30;
      const pt   = pitCurve.getPointAt(tProgress);
      const tang = pitCurve.getTangentAt(tProgress).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      entryPtsL.push(pt.clone().add(norm.clone().multiplyScalar(-2.0))); // left edge (-2.0m)
      if (tProgress <= 0.25) {
        entryPtsR.push(pt.clone().add(norm.clone().multiplyScalar(2.0)));  // right edge (+2.0m)
      }
    }
    const entryLL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(entryPtsL), new THREE.LineBasicMaterial({ color: 0xffffff }));
    const entryLR = new THREE.Line(new THREE.BufferGeometry().setFromPoints(entryPtsR), new THREE.LineBasicMaterial({ color: 0xffffff }));
    entryLL.position.y = 0.04;
    entryLR.position.y = 0.04;
    scene.add(entryLL, entryLR);

    // ── Exit painted lines (edges of exit road)
    const exitPtsL = [], exitPtsR = [];
    for (let j = 0; j <= 40; j++) {
      const tProgress = 0.70 + (j / 40) * 0.30;
      const pt   = pitCurve.getPointAt(tProgress);
      const tang = pitCurve.getTangentAt(tProgress).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      exitPtsL.push(pt.clone().add(norm.clone().multiplyScalar(-2.0))); // left edge (-2.0m)
      if (tProgress >= 0.75) {
        exitPtsR.push(pt.clone().add(norm.clone().multiplyScalar(2.0)));  // right edge (+2.0m)
      }
    }
    const exitLL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(exitPtsL), new THREE.LineBasicMaterial({ color: 0xffffff }));
    const exitLR = new THREE.Line(new THREE.BufferGeometry().setFromPoints(exitPtsR), new THREE.LineBasicMaterial({ color: 0xffffff }));
    exitLL.position.y = 0.04;
    exitLR.position.y = 0.04;
    scene.add(exitLL, exitLR);

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
    // LUSH GREEN RACEWAY SCENERY & 3D TREES IN PERIMETER GROVES
    // ═══════════════════════════════════════════════════════════════════

    // Vibrant grass terrain texture
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 256;
    groundCanvas.height = 256;
    const gctx = groundCanvas.getContext('2d');
    gctx.fillStyle = '#1e7b34'; // rich racetrack emerald green
    gctx.fillRect(0, 0, 256, 256);
    // Subtle grass blade variations
    gctx.fillStyle = '#166534';
    for (let i = 0; i < 400; i++) {
      const gx = Math.random() * 256;
      const gy = Math.random() * 256;
      gctx.fillRect(gx, gy, 3, 3);
    }
    gctx.fillStyle = '#22c55e';
    for (let i = 0; i < 200; i++) {
      const gx = Math.random() * 256;
      const gy = Math.random() * 256;
      gctx.fillRect(gx, gy, 2, 2);
    }
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(100, 100);

    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.10;
    scene.add(ground);

    // 🌳 3D Trees Safely in the Surrounding Hills and Perimeter Fields
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    const foliageMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 }); // rich green
    const foliageMat2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });  // dark forest
    const foliageMat3 = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 });  // bright spring

    const createTree = (x, z, scale = 1.0) => {
      const treeGroup = new THREE.Group();
      // Trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.45 * scale, 3.5 * scale, 8), trunkMat);
      trunk.position.y = 1.75 * scale;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // Foliage tiers
      const fMat = scale > 1.1 ? foliageMat2 : (scale < 0.9 ? foliageMat3 : foliageMat1);
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(2.4 * scale, 3.6 * scale, 8), fMat);
      c1.position.y = 4.0 * scale;
      c1.castShadow = true;
      treeGroup.add(c1);

      const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.8 * scale, 3.0 * scale, 8), fMat);
      c2.position.y = 5.8 * scale;
      c2.castShadow = true;
      treeGroup.add(c2);

      const c3 = new THREE.Mesh(new THREE.ConeGeometry(1.2 * scale, 2.4 * scale, 8), fMat);
      c3.position.y = 7.4 * scale;
      c3.castShadow = true;
      treeGroup.add(c3);

      treeGroup.position.set(x, 0, z);
      return treeGroup;
    };

    // Plant 90 trees in perimeter groves safely >22m away from the track curve
    const treeCount = 90;
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const radius = 95.0 + ((i * 17) % 180);
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      const pos = new THREE.Vector3(x, 0, z);

      // Verify distance to track is completely safe (>20m)
      if (getDistanceToTrack(pos) < 22.0) continue;

      const scale = 0.8 + ((i % 5) * 0.15);
      const tree = createTree(x, z, scale);
      scene.add(tree);
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
    // MODERN F1 START/FINISH GANTRY & SHADED GRANDSTANDS
    // ═══════════════════════════════════════════════════════════════════
    const startPos = trackCurve.getPointAt(0);
    const startTangent = trackCurve.getTangentAt(0).normalize();
    const startNorm = new THREE.Vector3(-startTangent.z, 0, startTangent.x).normalize();

    const bannerGroup = new THREE.Group();
    bannerGroup.position.copy(startPos);
    bannerGroup.lookAt(startPos.clone().add(startTangent));

    // Metallic Overhead Gantry Pillars
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 12, 0.8), gantryMat);
    p1.position.set(-10, 6, 0);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 12, 0.8), gantryMat);
    p2.position.set(10, 6, 0);
    bannerGroup.add(p1, p2);

    // Gantry Overhead Truss
    const truss = new THREE.Mesh(new THREE.BoxGeometry(20.8, 1.6, 1.2), gantryMat);
    truss.position.set(0, 11.2, 0);
    bannerGroup.add(truss);

    // Official Rolex / F1 Start Finish Banner
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1024;
    textCanvas.height = 128;
    const ctx = textCanvas.getContext('2d');
    ctx.fillStyle = "#006039"; // Rolex Green
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = "#ffd700"; // Rolex Gold
    ctx.fillRect(0, 0, 1024, 8);
    ctx.fillRect(0, 120, 1024, 8);
    ctx.font = "900 52px 'Impact', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("FORMULA 1 GRAND PRIX", 512, 64);

    const textTex = new THREE.CanvasTexture(textCanvas);
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 2.2),
      new THREE.MeshBasicMaterial({ map: textTex, side: THREE.DoubleSide })
    );
    labelMesh.position.set(0, 11.2, 0.65);
    bannerGroup.add(labelMesh);

    scene.add(bannerGroup);
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

    // Snapped pit box position (+6.0m offset on working lane)
    const boxPos = pos.clone().add(norm.multiplyScalar(6.0));

    // Sleek flat pit box ground decal (NO tall 3D box blocking view!)
    const geo = new THREE.PlaneGeometry(6.5, 3.2);
    const teamCol = F1_TEAMS[selectedTeamIndex] ? parseInt(F1_TEAMS[selectedTeamIndex].color.replace('#',''), 16) : 0x22c55e;
    const mat = new THREE.MeshBasicMaterial({
      color: teamCol,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(boxPos);
    mesh.position.y = 0.04; // flush with asphalt surface
    mesh.lookAt(boxPos.clone().add(new THREE.Vector3(0, 1, 0)));

    scene.add(mesh);
    window.playerPitBoxVisualMesh = mesh;
  }
  window.f1SetupGame = setupGame;

