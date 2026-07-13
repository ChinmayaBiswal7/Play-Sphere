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

