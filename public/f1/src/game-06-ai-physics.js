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

    // Easy:62, Normal:74, Hard:80, Expert:86

    const baseSpeed = [62.0, 74.0, 80.0, 86.0][activeDifficulty] || 74.0;

    // Per-racer pace calculation using driver + car performance profiles

    function calculateAIPace(racer, base) {

      const p = racer.aiProfile || { pace: 0.85, brakingSkill: 0.85, corneringSkill: 0.85, consistency: 0.85 };

      const c = racer.carPerformance || { topSpeed: 80, cornering: 80 };

      // Normalize car stats to 0-1

      const carFactor = ((c.topSpeed / 100) * 0.5 + (c.cornering / 100) * 0.5);

      const driverFactor = p.pace * 0.50 + p.brakingSkill * 0.20 + p.corneringSkill * 0.20 + p.consistency * 0.10;

      // Combined potential: car 45%, driver 55%

      const combined = carFactor * 0.45 + driverFactor * 0.55;

      // Difficulty utilisation: Easy 80-88%, Normal 88-96%, Hard 94-102%, Expert 98-106%

      const utilRange = [

        [0.80, 0.88],  // Easy

        [0.88, 0.96],  // Normal

        [0.94, 1.02],  // Hard

        [0.98, 1.06]   // Expert

      ][activeDifficulty] || [0.88, 0.96];

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

              if (racer.mesh) racer.mesh.visible = false;

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

          0: { brakingMargin: 0.045, paceError: 0.12, overtakeAggression: 0.35, baseSpeedMult: 0.82 },

          1: { brakingMargin: 0.036, paceError: 0.06, overtakeAggression: 0.55, baseSpeedMult: 1.0 },

          2: { brakingMargin: 0.031, paceError: 0.025, overtakeAggression: 0.78, baseSpeedMult: 1.12 },

          3: { brakingMargin: 0.027, paceError: 0.008, overtakeAggression: 0.94, baseSpeedMult: 1.25 }

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

        racers.forEach(other => {
          if (other === racer) return;
          if (other.isTrackActive === false || other.qualifyingState === "GARAGE") return;

          const myInPit = racer.inPitLane || racer.isPitting;
          const otherInPit = other.inPitLane || other.isPitting;
          if (myInPit !== otherInPit) return;

          const gap = getSignedTrackGap(racer, other);
          if (gap > 0.0 && gap < 35.0) {
            if (gap < minGapAhead) {
              minGapAhead = gap;
              closestAhead = other;
            }
          }
        });

        if (closestAhead) {
          const pred = predictCollision(racer, closestAhead);
          const risk = getCollisionRisk(pred);

          if (risk === "CAUTION") {
            target = Math.min(target, closestAhead.speed * 0.95);
          } else if (risk === "HIGH") {
            target = Math.min(target, closestAhead.speed * 0.82);
            if (racer.avoidanceCommitTimer === undefined) racer.avoidanceCommitTimer = 0.0;
            if (racer.avoidanceSide === undefined || racer.avoidanceSide === "NONE") {
              racer.avoidanceSide = (closestAhead.sideOffset > 0) ? "LEFT" : "RIGHT";
              racer.avoidanceCommitTimer = 0.8;
            }
            avoidanceOffset = racer.avoidanceSide === "LEFT" ? -1.5 : 1.5;
          } else if (risk === "EMERGENCY") {
            target = Math.min(target, closestAhead.speed * 0.50);
            if (racer.avoidanceCommitTimer === undefined || racer.avoidanceSide === "NONE") {
              racer.avoidanceSide = (closestAhead.sideOffset > 0) ? "LEFT" : "RIGHT";
              racer.avoidanceCommitTimer = 0.8;
            }
            avoidanceOffset = racer.avoidanceSide === "LEFT" ? -3.0 : 3.0;
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
          let decelRate = (target < racer.speed * 0.9) ? 35.0 : 20.0;
          if (closestAhead) {
            const pred = predictCollision(racer, closestAhead);
            if (getCollisionRisk(pred) === "EMERGENCY") {
              decelRate = 95.0; // EMERGENCY BRAKING!
            }
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
      racer.sideOffset = THREE.MathUtils.lerp(racer.sideOffset, racer.targetSideOffset, delta * 3.5);

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
