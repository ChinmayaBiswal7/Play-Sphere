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
        playerKart.mesh.position.copy(pt.clone().add(norm.multiplyScalar(17.0)));
        playerKart.mesh.lookAt(pt.clone().add(tang));
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
    const postMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 }); // metallic grey
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 }); // white/silver continuous railing
    
    // A. Extrude continuous smooth curved Armco rails along both left and right sides
    const leftRail1 = new THREE.Mesh(createArmcoGeometry(trackCurve, -10.5, 0.3, 0.18), railMat);
    const leftRail2 = new THREE.Mesh(createArmcoGeometry(trackCurve, -10.5, 0.65, 0.18), railMat);
    const leftRail3 = new THREE.Mesh(createArmcoGeometry(trackCurve, -10.5, 1.0, 0.18), railMat);
    
    const rightRail1 = new THREE.Mesh(createArmcoGeometry(trackCurve, 10.5, 0.3, 0.18), railMat);
    const rightRail2 = new THREE.Mesh(createArmcoGeometry(trackCurve, 10.5, 0.65, 0.18), railMat);
    const rightRail3 = new THREE.Mesh(createArmcoGeometry(trackCurve, 10.5, 1.0, 0.18), railMat);

    scene.add(leftRail1, leftRail2, leftRail3, rightRail1, rightRail2, rightRail3);

    // B. Place vertical support posts every 4 meters along both sides (skipping pit entry/exit gaps)
    const postCount = 180;
    for (let i = 0; i < postCount; i++) {
      const t = i / postCount;
      const p = trackCurve.getPointAt(t);
      const tang = trackCurve.getTangentAt(t);
      const normal = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

      [-1, 1].forEach((side) => {
        // Skip posts on the pit-lane side (right, side === 1) inside the entire pit lane range (t >= 0.965 || t <= 0.065)
        if (side === 1 && (t >= 0.965 || t <= 0.065)) {
          return;
        }
        const postPos = p.clone().add(normal.clone().multiplyScalar(side * 10.5));
        // Curvature crossover guard: do not spawn posts on top of the road surface on tight bends
        if (getDistanceToTrack(postPos) < 9.2) {
          return;
        }
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8), postMat);
        post.position.copy(postPos);
        post.position.y += 0.7;
        post.castShadow = true;
        scene.add(post);
      });
    }
  }

  function buildScenery() {
    const palmBaseMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }); // brown
    const palmLeavesMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 }); // green
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 });
    
    // Trees loop suppressed as requested to ensure no trees on the track or near the pit road

    if (activeTrack === 0) {
      // 🌊 OCEAN PROMENADE WATER (Only for Sunset Coast!)
      const waterGeo = new THREE.PlaneGeometry(1000, 400);
      const waterMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.2, metalness: 0.8 }); // shiny deep blue
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, -0.3, -220); // Top ocean side
      scene.add(water);

      // 🛥️ LUXURY YACHTS Floating in the Marina Promenade
      const yachtCount = 3;
      const yachtHullMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
      const yachtCabinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1 });
      for (let i = 0; i < yachtCount; i++) {
        const yachtGroup = new THREE.Group();
        yachtGroup.position.set(-150 + i * 140, -0.2, -180 + (Math.random() - 0.5) * 40);
        
        const hullGeo = new THREE.BoxGeometry(20, 2.5, 8);
        const hull = new THREE.Mesh(hullGeo, yachtHullMat);
        yachtGroup.add(hull);

        const cabinGeo = new THREE.BoxGeometry(10, 1.8, 6);
        const cabin = new THREE.Mesh(cabinGeo, yachtCabinMat);
        cabin.position.set(-2, 2.0, 0);
        yachtGroup.add(cabin);

        yachtGroup.rotation.y = (Math.random() - 0.5) * 0.3;
        scene.add(yachtGroup);
      }
    } else {
      // 🪨 DECORATIVE MOUNTAIN BOULDERS (Only in Alpine Heights!)
      for (let i = 0; i < 45; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 22.0 + Math.random() * 150.0;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;
        const pos = new THREE.Vector3(x, 0.1, z);

        let minDist = Infinity;
        let trackY = 0.1;
        for (let step = 0; step <= 60; step++) {
          const pt = trackCurve.getPointAt(step / 60);
          const d = pos.distanceTo(pt);
          if (d < minDist) {
            minDist = d;
            trackY = pt.y;
          }
        }
        pos.y = trackY - 0.2;

        if (minDist < 16.0) continue;

        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 + Math.random() * 1.5), rockMat);
        rock.position.copy(pos);
        rock.rotation.set(Math.random() * 2, Math.random() * 2, 0);
        scene.add(rock);
      }

      // 🏔️ GIANT SNOW-CAPPED ALPINE PEAKS in the far background
      const mountMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
      for (let i = 0; i < 15; i++) {
        const angle = (i / 15) * Math.PI * 2 + Math.random() * 0.2;
        const radius = 260.0 + Math.random() * 100.0;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;

        const mount = new THREE.Group();
        const baseCone = new THREE.Mesh(new THREE.ConeGeometry(50, 160, 6), mountMat);
        baseCone.position.y = 80;
        mount.add(baseCone);

        const capCone = new THREE.Mesh(new THREE.ConeGeometry(19.5, 60, 6), snowMat);
        capCone.position.y = 130;
        mount.add(capCone);

        mount.position.set(x, -5, z);
        scene.add(mount);
      }

      // Chalet houses loop suppressed as requested to ensure no houses on the track or near the pit road

      // 🚠 ALPINE CABLE GONDOLA SYSTEM (Truss towers and cables)
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.4 });
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 });
      const towers = [];
      for (let i = 0; i < 4; i++) {
        const x = -80 + i * 55;
        const z = -40 + Math.sin(i) * 20;
        const tower = new THREE.Mesh(new THREE.BoxGeometry(0.8, 18.0, 0.8), towerMat);
        tower.position.set(x, 9.0, z);
        scene.add(tower);
        towers.push(tower.position.clone().add(new THREE.Vector3(0, 9.0, 0)));
      }

      const cablePoints = [];
      towers.forEach(t => cablePoints.push(t));
      const cableGeo = new THREE.BufferGeometry().setFromPoints(cablePoints);
      const cableMat = new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 2 });
      const cable = new THREE.Line(cableGeo, cableMat);
      scene.add(cable);

      if (towers.length >= 2) {
        const gondola = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.8, 2.0), cabinMat);
        const cabinPos = towers[1].clone().lerp(towers[2], 0.5);
        cabinPos.y -= 1.8;
        gondola.position.copy(cabinPos);
        scene.add(gondola);
      }
    }

    // Scattered decorative ground vegetation (bushes) suppressed as requested to ensure zero obstacles near track or pit road


    // Checkerboard-styled grass terrain to prevent flat green void look
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 128; groundCanvas.height = 128;
    const gctx = groundCanvas.getContext('2d');
    gctx.fillStyle = '#14532d'; gctx.fillRect(0, 0, 128, 128);
    gctx.fillStyle = '#166534'; gctx.fillRect(0, 0, 64, 64); gctx.fillRect(64, 64, 64, 64);
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(80, 80);
    const groundGeo = new THREE.PlaneGeometry(1200, 1200);
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    scene.add(ground);
  }

  function buildGrandstandsAndSponsors() {
    const greyMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.7 }); // concrete base grey
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 }); // seating row charcoal
    const redMat = new THREE.MeshStandardMaterial({ color: 0xd97706 }); // orange/red canopy
    const spectatorColors = [0xef4444, 0x3b82f6, 0x10b981, 0xfacc15, 0x8b5cf6, 0xf97316];

    // Grandstands and billboards loops suppressed as requested to ensure zero obstacles near track or pit road

    // Start / Finish Banner
    const startPos = trackCurve.getPointAt(0);
    const startTangent = trackCurve.getTangentAt(0);
    
    const bannerGroup = new THREE.Group();
    bannerGroup.position.copy(startPos);
    bannerGroup.lookAt(startPos.clone().add(startTangent));
    
    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.3, 12, 16);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.5 });
    
    const p1 = new THREE.Mesh(pillarGeo, pillarMat);
    p1.position.set(-8, 6, 0);
    const p2 = new THREE.Mesh(pillarGeo, pillarMat);
    p2.position.set(8, 6, 0);
    bannerGroup.add(p1, p2);

    const boardGeo = new THREE.BoxGeometry(16, 2.5, 0.4);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 11, 0);
    bannerGroup.add(board);

    const textCanvas = document.createElement('canvas');
    textCanvas.width = 512; textCanvas.height = 128;
    const ctx = textCanvas.getContext('2d');
    ctx.fillStyle = "#facc15";
    ctx.fillRect(0,0,512,128);
    ctx.fillStyle = "#000000";
    ctx.font = "bold 58px Fredoka One, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("START / FINISH", 256, 80);
    
    const textTex = new THREE.CanvasTexture(textCanvas);
    const labelGeo = new THREE.PlaneGeometry(15, 2);
    const labelMat = new THREE.MeshBasicMaterial({ map: textTex, side: THREE.DoubleSide });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(0, 11, 0.21);
    bannerGroup.add(label);

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
    
    // Snapped pit box position (+6.0m offset)
    const boxPos = pos.clone().add(norm.multiplyScalar(6.0));
    
    // Neon green transparent box representing the player's garage area
    const geo = new THREE.BoxGeometry(4.0, 2.0, 7.0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.32,
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0x22c55e,
      emissiveIntensity: 0.4
    });
    
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(boxPos);
    mesh.position.y = 1.0; // sits on ground
    mesh.lookAt(boxPos.clone().add(tang));
    
    scene.add(mesh);
    window.playerPitBoxVisualMesh = mesh;
  }

