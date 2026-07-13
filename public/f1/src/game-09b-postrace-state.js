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
    
    const pPos = playerKart.mesh.position;
    const tang = pitCurve.getTangentAt(pitProgress);
    const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

    // Wheel changers and jacks targets
    const crewTargets = [
      // Left side wheel changers
      pPos.clone().add(norm.clone().multiplyScalar(1.5)).add(tang.clone().multiplyScalar(1.1)),
      pPos.clone().add(norm.clone().multiplyScalar(1.5)).add(tang.clone().multiplyScalar(-1.1)),
      // Right side wheel changers
      pPos.clone().add(norm.clone().multiplyScalar(-1.5)).add(tang.clone().multiplyScalar(1.1)),
      pPos.clone().add(norm.clone().multiplyScalar(-1.5)).add(tang.clone().multiplyScalar(-1.1)),
      // Front Jack mechanic
      pPos.clone().add(tang.clone().multiplyScalar(2.5)),
      // Rear Jack mechanic
      pPos.clone().add(tang.clone().multiplyScalar(-2.5))
    ];

    crewTargets.forEach((targetPos, idx) => {
      const crewGroup = new THREE.Group();
      
      // Body (Suit)
      const suit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.5), crewMat);
      suit.position.y = 0.5;
      suit.castShadow = true;
      crewGroup.add(suit);
      
      // Helmet
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 }));
      helmet.position.y = 1.15;
      helmet.castShadow = true;
      crewGroup.add(helmet);

      // Standby position: further out to simulate running out from garage!
      const offsetVec = idx < 4 ? norm.clone().multiplyScalar(5.0 * Math.sign(idx < 2 ? 1 : -1)) : norm.clone().multiplyScalar(5.0);
      const standbyPos = targetPos.clone().add(offsetVec);
      
      crewGroup.position.copy(standbyPos);
      crewGroup.lookAt(targetPos);
      
      scene.add(crewGroup);
      
      pitCrew.push({
        group: crewGroup,
        standby: standbyPos,
        target: targetPos
      });
      pitCrewBoxes.push(crewGroup);
    });
  }

  function triggerPitStop() {
    if (isPitStopActive) return;
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

    // Spawn pit crew at standby positions
    spawnPitCrewBoxes();

    document.getElementById('pit-progress-fill').style.width = '0%';
    document.getElementById('pit-stop-overlay').classList.remove('hidden');
    document.getElementById('pit-prompt-text').innerText = "PIT CREW RUNNING OUT FROM GARAGE...";

    // Hide or show tyre compound selector depending on if pre-selected via voice!
    const titleEl = document.getElementById('pit-select-compound-title');
    const containerEl = document.getElementById('pit-compound-selector-container');
    if (window.voiceSelectedCompound) {
      if (titleEl) titleEl.style.display = 'none';
      if (containerEl) containerEl.style.display = 'none';
      // Sync selected tyre styling
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
  }

  function tapPitStopQTE() {
    if (pitStopPhase !== "CHANGING_TYRES") return;
    
    if (window.ApexAudio) window.ApexAudio.playPickup(); // mechanical tap sound
    window.pitQTEProgress = (window.pitQTEProgress || 0.0) + 8.5;

    if (window.pitQTEProgress >= 100.0) {
      window.pitQTEProgress = 100.0;
      pitStopPhase = "LOWERING";
      window.pitLowerTimer = 0.0;
      document.getElementById('pit-prompt-text').innerText = "LOWERING CAR ON JACKS...";
    }
    document.getElementById('pit-progress-fill').style.width = `${window.pitQTEProgress}%`;
  }

  function completePitStop() {
    isPitStopActive = false;
    tyreWear = 0.0;
    carDamage = 0.0;
    if (playerKart) {
      playerKart.frontWingAttached = true;
      playerKart.rearWingAttached = true;
      restoreCarWings(playerKart);
      playerKart.tyreCompound = activeCompound || "medium";
      playerKart.tyreLife = 100.0;
      if (typeof window.updateCarTyreColor === 'function') {
        window.updateCarTyreColor(playerKart);
      }
      
      // Reset snap helpers and steering inputs to prevent pulling on exit
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

    // Reset voice tyre compound selection!
    window.voiceSelectedCompound = null;

    // Transfer crew to running-back list instead of removing instantly
    runningBackCrew = [...pitCrew];
    pitCrew = [];
    pitCrewBoxes = [];

    // Schedule cleanup of running-back crew after 1.8 seconds (giving them time to jog back)
    const activeRunningCrew = [...runningBackCrew];
    setTimeout(() => {
      activeRunningCrew.forEach(c => scene.remove(c.group));
      runningBackCrew = runningBackCrew.filter(rc => !activeRunningCrew.includes(rc));
    }, 1800);

    document.getElementById('pit-prompt-text').innerText = "PIT STOP COMPLETE! GREEN LIGHT!";
    if (playerKart) {
      playerKart.boostTime = 0.0;
      playerKart.speed = 0.0;
      currentGear = 0; // Starts in Neutral - player shifts and drives out manually
    }

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
