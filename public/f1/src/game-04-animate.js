  function animate(raceId) {
    if (raceId !== currentRaceId) return; // Stale animation loop self-termination guard
    if (!renderer) return;
    animationFrameId = requestAnimationFrame(() => animate(raceId));

    let delta = clock.getDelta();
    if (window.isGamePaused) {
      delta = 0.0;
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
        window.pitLiftTimer = (window.pitLiftTimer || 0.0) + delta * 2.5;
        playerKart.mesh.position.y = THREE.MathUtils.lerp(0.1, 0.45, Math.min(1.0, window.pitLiftTimer));
        if (window.pitLiftTimer >= 1.0) {
          pitStopPhase = "CHANGING_TYRES";
          document.getElementById('pit-prompt-text').innerText = "RAPIDLY PRESS SPACEBAR TO SPEED UP NUT GUN!";
        }
      }
      else if (pitStopPhase === "CHANGING_TYRES") {
        const progress = window.pitQTEProgress || 0.0;
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
      }
      else if (pitStopPhase === "LOWERING") {
        window.pitLowerTimer = (window.pitLowerTimer || 0.0) + delta * 3.5;
        playerKart.mesh.position.y = THREE.MathUtils.lerp(0.45, 0.1, Math.min(1.0, window.pitLowerTimer));
        
        if (playerKart.mesh.wheels) {
          playerKart.mesh.wheels.forEach(w => w.position.x = w.originalX);
        }

        // Crew starts running back to standby positions
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

    if (isRaceActive || (postRaceActive && postRaceState === "FINISHING")) {
      if (isStartingSequence) {
        updateStartingSequence(delta);
      } else {
        if (isRaceActive) updateRaceTimer(delta);
      }

        if (isRaceActive) {
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
      updateLeaderboardHUD();
      updateDebugRacePanel();
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

      // Voice listener 5-second automatic timeout window countdown
      if (window.keepListeningForVoice) {
        window.micTimeoutTimer -= delta;
        if (window.micTimeoutTimer <= 0.0) {
          window.keepListeningForVoice = false;
          if (recognition) {
            try { recognition.stop(); } catch(e) {}
          }
          speakEngineerRadio("Microphone listening window timed out.", 10);
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
