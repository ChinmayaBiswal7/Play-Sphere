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
    // Zero collisions during grid formation, starting lights, or race launch grace
    if (isStartingSequence || window.formationLapActive) return;
    if (window.raceLaunchGraceTimer > 0) return;

    const CAR_RADIUS = 1.05; // 2-circle capsule model covering 4.8m length x 2.1m width
    const CIRCLE_DIST = 1.30;
    const DIAMETER = CAR_RADIUS * 2.0;

    for (let i = 0; i < racers.length; i++) {
      for (let j = i + 1; j < racers.length; j++) {
        const racerI = racers[i];
        const racerJ = racers[j];

        // Guard: skip inactive or invisible cars
        if (!racerI.mesh || !racerJ.mesh) continue;
        if (!racerI.mesh.visible || !racerJ.mesh.visible) continue;
        if (racerI.isTrackActive === false || racerJ.isTrackActive === false) continue;
        if (racerI.collisionEnabled === false || racerJ.collisionEnabled === false) continue;
        // Skip only cars parked stationary inside garage bays
        if ((racerI.qualifyingState === "GARAGE" && Math.abs(racerI.speed) < 0.1) || 
            (racerJ.qualifyingState === "GARAGE" && Math.abs(racerJ.speed) < 0.1)) continue;

        const posI = racerI.mesh.position;
        const posJ = racerJ.mesh.position;
        if (!posI || !posJ) continue;

        // Fast rejection: F1 car length is 4.8m
        const dist3D = posI.distanceTo(posJ);
        if (dist3D > 5.5) continue;

        // Get car forward orientations from mesh rotation/quaternion
        let fwdI = new THREE.Vector3(0, 0, 1).applyQuaternion(racerI.mesh.quaternion).setY(0);
        if (fwdI.lengthSq() > 0.001) fwdI.normalize();
        else fwdI.set(0, 0, 1);

        let fwdJ = new THREE.Vector3(0, 0, 1).applyQuaternion(racerJ.mesh.quaternion).setY(0);
        if (fwdJ.lengthSq() > 0.001) fwdJ.normalize();
        else fwdJ.set(0, 0, 1);

        // 2-Circle capsule centers for Car I & Car J (front nose & rear axle)
        const circlesI = [
          posI.clone().addScaledVector(fwdI, CIRCLE_DIST),
          posI.clone().addScaledVector(fwdI, -CIRCLE_DIST)
        ];
        const circlesJ = [
          posJ.clone().addScaledVector(fwdJ, CIRCLE_DIST),
          posJ.clone().addScaledVector(fwdJ, -CIRCLE_DIST)
        ];

        let maxOverlap = 0.0;
        let colNormal = new THREE.Vector3(1, 0, 0);

        // Check intersection across all 4 circle pairs
        for (let cI = 0; cI < 2; cI++) {
          for (let cJ = 0; cJ < 2; cJ++) {
            const pI = circlesI[cI];
            const pJ = circlesJ[cJ];
            const delta2D = pI.clone().sub(pJ).setY(0);
            const d = delta2D.length();
            if (d < DIAMETER) {
              const overlap = DIAMETER - d;
              if (overlap > maxOverlap) {
                maxOverlap = overlap;
                colNormal = d > 0.0001 ? delta2D.normalize() : new THREE.Vector3(1, 0, 0);
              }
            }
          }
        }

        if (maxOverlap > 0.0) {
          // 1. SOLID RIGID SEPARATION (Cars physically bounce apart — CANNOT pass inside!)
          const sep = colNormal.clone().multiplyScalar(maxOverlap * 0.53);

          if (racerI.isPlayer) {
            playerKart.mesh.position.add(sep);
          } else {
            racerI.mesh.position.add(sep);
            if (typeof window.findNearestTrackProjection === 'function') {
              const proj = window.findNearestTrackProjection(racerI.mesh.position);
              racerI.currentOffset = proj.progress;
              racerI.sideOffset = THREE.MathUtils.clamp(proj.lateralOffset, -7.6, 7.6);
              racerI.targetSideOffset = racerI.sideOffset;
            }
          }

          if (racerJ.isPlayer) {
            playerKart.mesh.position.sub(sep);
          } else {
            racerJ.mesh.position.sub(sep);
            if (typeof window.findNearestTrackProjection === 'function') {
              const proj = window.findNearestTrackProjection(racerJ.mesh.position);
              racerJ.currentOffset = proj.progress;
              racerJ.sideOffset = THREE.MathUtils.clamp(proj.lateralOffset, -7.6, 7.6);
              racerJ.targetSideOffset = racerJ.sideOffset;
            }
          }

          // 2. Realistic Speed Exchange & Inelastic Momentum Transfer
          const deltaCenter = posI.clone().sub(posJ).setY(0);
          const isRearEnd = Math.abs(colNormal.dot(fwdI)) > 0.60 || Math.abs(colNormal.dot(fwdJ)) > 0.60;
          const carIAhead = deltaCenter.dot(fwdI) >= 0;
          const leadingCar = carIAhead ? racerI : racerJ;
          const trailingCar = carIAhead ? racerJ : racerI;

          if (isRearEnd) {
            // Trailing car cannot exceed leading car speed; momentum transfer
            trailingCar.speed = Math.min(trailingCar.speed, leadingCar.speed * 0.72);
            leadingCar.speed = Math.max(leadingCar.speed, leadingCar.speed + 2.8);
          } else {
            // Side-by-side wheel banging speed scrub
            racerI.speed *= 0.95;
            racerJ.speed *= 0.95;
          }

          const speedDiff = racerI.speed - racerJ.speed;
          const impact = Math.max(Math.abs(speedDiff), maxOverlap * 14.0);

          // 3. F1 Component Damage Accumulation
          const addedDamage = Math.max(3.5, impact * 1.35);
          racerI.damage = Math.min(100.0, (racerI.damage || 0.0) + addedDamage);
          racerJ.damage = Math.min(100.0, (racerJ.damage || 0.0) + addedDamage);

          if (racerI.isPlayer || racerJ.isPlayer) {
            const pKart = racerI.isPlayer ? racerI : racerJ;
            carDamage = pKart.damage;
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
    if (racer && racer.mesh) {
      racer.mesh.traverse(child => {
        if (child.name === partName && child.visible) {
          partMesh = child;
        }
      });
    }
    if (partMesh) {
      partMesh.visible = false;
      const cPos = (racer.mesh && racer.mesh.position) ? racer.mesh.position : (racer.position || new THREE.Vector3());
      spawnDebris(partMesh, cPos, racer.speed || 0);
    }
  }

  function spawnDebris(sourceMesh, carPos, carSpeed) {
    if (window.particlesEnabled === false || !sourceMesh) return;
    try {
      const meshesToSpawn = [];
      if (sourceMesh.isMesh && sourceMesh.geometry) {
        meshesToSpawn.push(sourceMesh);
      } else if (sourceMesh.traverse) {
        sourceMesh.traverse(child => {
          if (child.isMesh && child.geometry && meshesToSpawn.length < 4) {
            meshesToSpawn.push(child);
          }
        });
      }

      if (meshesToSpawn.length === 0) {
        // Fallback: generic carbon aero debris
        const fallbackGeo = new THREE.BoxGeometry(0.5, 0.08, 0.25);
        const fallbackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
        meshesToSpawn.push(fallbackMesh);
      }

      meshesToSpawn.forEach(src => {
        try {
          if (!src.geometry) return;
          const geom = src.geometry.clone();
          let mat;
          if (Array.isArray(src.material)) {
            mat = src.material.map(m => (m && m.clone ? m.clone() : m));
          } else if (src.material && src.material.clone) {
            mat = src.material.clone();
          } else {
            mat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
          }
          const mesh = new THREE.Mesh(geom, mat);

          const spawnPos = carPos ? carPos.clone() : new THREE.Vector3();
          mesh.position.copy(spawnPos);
          mesh.position.y += 0.4 + Math.random() * 0.2;
          scene.add(mesh);

          const angle = Math.random() * Math.PI * 2;
          const speed = Math.max(5.0, (carSpeed || 20) * 0.4);
          const vel = new THREE.Vector3(
            Math.sin(angle) * (3.0 + Math.random() * 3.0),
            4.0 + Math.random() * 4.0,
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
        } catch (innerErr) {
          console.warn("Debris piece clone failed:", innerErr);
        }
      });
    } catch (err) {
      console.warn("spawnDebris failed gracefully:", err);
    }
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
    
    window.raceLaunchGraceTimer = 3.5; // collision grace during restart
    racers.forEach((racer, idx) => {
      const myGridIdx = window.startingGrid ? window.startingGrid.findIndex(g => g.name === racer.name) : idx;
      const slotIdx = myGridIdx !== -1 ? myGridIdx : idx;
      const slot = window.getGridSlotTransform(slotIdx);
      racer.currentOffset = slot.progress;
      racer.sideOffset = slot.sideOffset;
      if (racer.mesh) {
        racer.mesh.position.copy(slot.position);
        racer.mesh.rotation.y = slot.heading;
      }
      racer.speed = 0.0;
      racer.spinoutTime = 0.0;
      racer.spinAngle = 0.0;
      racer.spinoutVelocity = 0.0;
      
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

