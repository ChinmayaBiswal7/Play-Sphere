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

        if (!racerI.mesh || !racerJ.mesh) continue;
        const posI = racerI.mesh.position;
        const posJ = racerJ.mesh.position;
        if (!posI || !posJ) continue;
        const dist3D = posI.distanceTo(posJ);

        // Authentic Oriented Bounding Box collision for F1 cars (Length 4.8m, Width 2.1m)
        let tang = new THREE.Vector3(0, 0, 1);
        let norm = new THREE.Vector3(1, 0, 0);
        if (trackCurve) {
          const trackT = (racerI.currentOffset !== undefined && !isNaN(racerI.currentOffset)) ? racerI.currentOffset : 0.0;
          const safeT = ((trackT % 1.0) + 1.0) % 1.0;
          tang = trackCurve.getTangentAt(safeT).normalize();
          norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
        }

        const deltaPos = posI.clone().sub(posJ);
        deltaPos.y = 0; // horizontal collision plane
        const longDist = deltaPos.dot(tang); // longitudinal separation along track (+ = I ahead, - = J ahead)
        const latDist = deltaPos.dot(norm);   // lateral separation across track

        const CAR_LENGTH = 4.8;
        const CAR_WIDTH = 2.1;

        if (Math.abs(longDist) < CAR_LENGTH && Math.abs(latDist) < CAR_WIDTH) {
          const longOverlap = CAR_LENGTH - Math.abs(longDist);
          const latOverlap = CAR_WIDTH - Math.abs(latDist);

          const isRearEnd = (Math.abs(latDist) < 1.7) || (longOverlap < latOverlap * 1.5);
          const leadingCar = (longDist >= 0) ? racerI : racerJ;
          const trailingCar = (longDist >= 0) ? racerJ : racerI;

          // 1. SOLID PHYSICAL SEPARATION (Cars CANNOT pass inside each other!)
          if (isRearEnd) {
            // Trailing car is physically blocked from passing through leading car
            const pushDir = (longDist >= 0) ? -1 : 1;
            if (trailingCar.isPlayer) {
              playerKart.mesh.position.addScaledVector(tang, pushDir * longOverlap * 1.05);
              playerKart.speed = Math.min(playerKart.speed, leadingCar.speed * 0.70);
            } else {
              trailingCar.currentOffset += (pushDir * longOverlap * 1.05) / 1800.0;
              trailingCar.speed = Math.min(trailingCar.speed, leadingCar.speed * 0.70);
              if (trailingCar.mesh) trailingCar.mesh.position.addScaledVector(tang, pushDir * longOverlap * 1.05);
            }

            // Leading car gets a bump impulse forward
            leadingCar.speed = Math.max(leadingCar.speed, leadingCar.speed + 3.2);
          } else {
            // Side-by-side wheel banging: bounce laterally apart along track normal
            const sidePushI = latDist >= 0 ? 1 : -1;
            const sidePushJ = -sidePushI;

            if (racerI.isPlayer) {
              playerKart.mesh.position.addScaledVector(norm, sidePushI * latOverlap * 0.65);
              playerKart.sideOffset = (playerKart.sideOffset || 0) + sidePushI * latOverlap * 0.65;
            } else {
              racerI.sideOffset = (racerI.sideOffset || 0) + sidePushI * latOverlap * 0.65;
              racerI.targetSideOffset = racerI.sideOffset;
              if (racerI.mesh) racerI.mesh.position.addScaledVector(norm, sidePushI * latOverlap * 0.65);
            }

            if (racerJ.isPlayer) {
              playerKart.mesh.position.addScaledVector(norm, sidePushJ * latOverlap * 0.65);
              playerKart.sideOffset = (playerKart.sideOffset || 0) + sidePushJ * latOverlap * 0.65;
            } else {
              racerJ.sideOffset = (racerJ.sideOffset || 0) + sidePushJ * latOverlap * 0.65;
              racerJ.targetSideOffset = racerJ.sideOffset;
              if (racerJ.mesh) racerJ.mesh.position.addScaledVector(norm, sidePushJ * latOverlap * 0.65);
            }
          }

          // 2. Realistic Speed Exchange & Crash Impulse
          const speedDiff = racerI.speed - racerJ.speed;
          const impact = Math.max(Math.abs(speedDiff), Math.max(longOverlap, latOverlap) * 8.5);

          // 3. F1 Component Damage Accumulation
          const addedDamage = Math.max(3.5, impact * 1.45);
          racerI.damage = Math.min(100.0, (racerI.damage || 0.0) + addedDamage);
          racerJ.damage = Math.min(100.0, (racerJ.damage || 0.0) + addedDamage);

          if (racerI.isPlayer) {
            carDamage = racerI.damage;
            updateDamageHUD();
            if (typeof window.triggerGamepadRumble === 'function') {
              window.triggerGamepadRumble(160, 0.85, 0.6);
            }
          }
          if (racerJ.isPlayer) {
            carDamage = racerJ.damage;
            updateDamageHUD();
            if (typeof window.triggerGamepadRumble === 'function') {
              window.triggerGamepadRumble(160, 0.85, 0.6);
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

