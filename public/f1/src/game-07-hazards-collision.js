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
      if (!car.isPlayer) car.mesh.visible = false; // Hide AI karts inside garages!
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
    // --- F1 Vehicle-to-Vehicle Physics Collisions & Damage ---
    for (let i = 0; i < racers.length; i++) {
      for (let j = i + 1; j < racers.length; j++) {
        const racerI = racers[i];
        const racerJ = racers[j];

        // GARAGE / INACTIVE GUARD: completely skip cars not physically on track
        // This prevents invisible-car collisions when a car is in the garage
        if (racerI.isTrackActive === false || racerJ.isTrackActive === false) continue;
        if (racerI.collisionEnabled === false || racerJ.collisionEnabled === false) continue;
        // Also skip cars whose mesh is hidden (belt + suspenders)
        if (racerI.mesh && !racerI.mesh.visible) continue;
        if (racerJ.mesh && !racerJ.mesh.visible) continue;
        
        // Zone separation guard: isolate track and pit lane traffic
        const myInPit = racerI.inPitLane || racerI.isPitting;
        const otherInPit = racerJ.inPitLane || racerJ.isPitting;
        if (myInPit !== otherInPit) continue;
        
        // Track-space Oriented Bounding Box (OBB) collision check:
        // F1 cars are aligned along the track tangent.
        const trackLen = trackCurve ? trackCurve.getLength() : 1800;
        const diffOffset = racerI.currentOffset - racerJ.currentOffset;
        const normDiff = ((diffOffset + 0.5) % 1.0) - 0.5;
        const longDist = normDiff * trackLen;
        const latDist = racerI.sideOffset - racerJ.sideOffset;

        // F1 Car length is ~3.6m, width is ~1.6m (Tighter bounding boxes)
        const isColliding = Math.abs(longDist) < 3.6 && Math.abs(latDist) < 1.6;
        if (isColliding) {
          if (racerI.isPlayer || racerJ.isPlayer) {
            const collidedObject = racerI.isPlayer ? racerJ.mesh : racerI.mesh;
            // console.error(
            //   "[PLAYER COLLISION TARGET]",
            //   {
            //     objectName: collidedObject?.name,
            //     objectType: collidedObject?.type,
            //     uuid: collidedObject?.uuid,
            //     parentName: collidedObject?.parent?.name,
            //     parentUuid: collidedObject?.parent?.uuid,
            //     userData: collidedObject?.userData,
            //     visible: collidedObject?.visible,
            //     worldPosition: collidedObject ? (() => {
            //       const p = new THREE.Vector3();
            //       collidedObject.getWorldPosition(p);
            //       return p;
            //     })() : null
            //   }
            // );
            // console.trace("[COLLISION CALL STACK]");
          }

          // Calculate precise overlap depth along both axes (Tighter kart bounding boxes to reduce collisions)
          const overlapL = 3.6 - Math.abs(longDist); // was 4.6
          const overlapW = 1.6 - Math.abs(latDist);  // was 1.95

          // Resolve overlap instantly along the axis of minimum penetration (Separating Axis Theorem)
          if (overlapW < overlapL) {
            // Resolve laterally (push sideOffset apart instantly by the exact overlap)
            const resolveDist = overlapW * 0.5;
            const dir = latDist >= 0 ? 1 : -1;
            
            racerI.sideOffset = THREE.MathUtils.clamp(racerI.sideOffset + dir * resolveDist, -10.5, 10.5);
            racerJ.sideOffset = THREE.MathUtils.clamp(racerJ.sideOffset - dir * resolveDist, -10.5, 10.5);
            
            // Sync target offsets for AI so they don't immediately steer back in
            if (!racerI.isPlayer) racerI.targetSideOffset = racerI.sideOffset;
            if (!racerJ.isPlayer) racerJ.targetSideOffset = racerJ.sideOffset;
          } else {
            // Resolve longitudinally (push currentOffset apart instantly)
            const resolveOffset = (overlapL * 0.5) / trackLen;
            const dir = longDist >= 0 ? 1 : -1;
            
            racerI.currentOffset = (racerI.currentOffset + dir * resolveOffset + 1.0) % 1.0;
            racerJ.currentOffset = (racerJ.currentOffset - dir * resolveOffset + 1.0) % 1.0;
          }

          // Sync 3D positions immediately to prevent visual ghosting/lag
          [racerI, racerJ].forEach(r => {
            if (!r.mesh) return;
            const inPit = r.inPitLane || r.isPitting;
            const curve = (inPit && pitCurve) ? pitCurve : trackCurve;
            if (!curve) return;
            
            // Clamp offset to valid [0,1] range - defensive guard against any bad sentinel values
            const safeOff = Math.max(0.0, Math.min(1.0, r.currentOffset));
            const pos = curve.getPointAt(safeOff);
            const tang = curve.getTangentAt(safeOff).normalize();
            const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
            r.mesh.position.copy(pos.add(norm.multiplyScalar(r.sideOffset)));
            r.mesh.lookAt(r.mesh.position.clone().add(tang));
          });
          
          // 3. Elastic speed response
          const speedDiff = racerI.speed - racerJ.speed;
          const impact = Math.abs(speedDiff);
          if (impact > 1.5) {
            const impulse = speedDiff * 0.45;
            racerI.speed = Math.max(3.0, racerI.speed - impulse);
            racerJ.speed = Math.max(3.0, racerJ.speed + impulse * 0.6);
            
            // Accumulate damage on BOTH cars symmetrically!
            racerI.damage = Math.min(100.0, (racerI.damage || 0.0) + impact * 0.75);
            racerJ.damage = Math.min(100.0, (racerJ.damage || 0.0) + impact * 0.75);
            
            if (racerI.isPlayer) { carDamage = racerI.damage; updateDamageHUD(); }
            if (racerJ.isPlayer) { carDamage = racerJ.damage; updateDamageHUD(); }
            
            // Visual crash feedback (smoke/spark particles)
            spawnExhaustSmoke(racerI.mesh.position, true);
            spawnExhaustSmoke(racerJ.mesh.position, true);
            
            if (impact > 12.0) {
              window.ApexAudio.playDriftScreech();
              // Trigger a local yellow flag in this sector for 12-20 seconds
              if (typeof window.getSectorForOffset === 'function' && typeof window.setSectorYellow === 'function') {
                const sectorIdx = window.getSectorForOffset(racerI.currentOffset);
                window.setSectorYellow(sectorIdx, 12.0 + Math.random() * 8.0);
              }
              // If it's a massive impact, spin both cars. Otherwise spin the car ahead (victim)
              if (impact > 20.0) {
                triggerSpinout(racerI);
                triggerSpinout(racerJ);
              } else {
                if (longDist > 0.0) {
                  // racerI is ahead of racerJ -> spin racerI
                  triggerSpinout(racerI);
                } else {
                  // racerJ is ahead of racerI -> spin racerJ
                  triggerSpinout(racerJ);
                }
              }
            }

            // Deploy safety car on heavy high-speed impacts during GP Race session (not during formation/starting sequence)
            if (currentSessionIndex === 2 && !window.formationLapActive && !isStartingSequence && impact > 36.0 && !safetyCarActive && Math.random() < 0.35) {
              triggerSafetyCar();
            } else if (currentSessionIndex === 2 && !window.formationLapActive && !isStartingSequence && impact > 16.0 && impact <= 36.0 && !vscActive && !safetyCarActive && Math.random() < 0.40) {
              deployVSC(15.0 + Math.random() * 15.0);
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

