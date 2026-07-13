  function updateParticles(delta) {
    updateDebris(delta);
    if (window.particlesEnabled === false) {
      particles.forEach(p => {
        scene.remove(p.mesh);
      });
      particles.length = 0;
      return;
    }
    particles.forEach((p, idx) => {
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      p.mesh.scale.multiplyScalar(0.92);
      p.life -= p.decay;
      if (p.life <= 0.0) {
        scene.remove(p.mesh);
        particles.splice(idx, 1);
      }
    });
  }

  let lastCameraOwner = null;
  window.claimCameraOwner = function(owner) {
    if (owner !== lastCameraOwner) {
      console.warn(
        "[CAMERA OWNER CHANGE]",
        {
          from: lastCameraOwner,
          to: owner,
          session: typeof currentSessionIndex !== 'undefined' ? ["PRACTICE", "QUALIFYING", "RACE"][currentSessionIndex] : null,
          raceState: typeof raceState !== 'undefined' ? raceState : (window.raceState || null),
          formationActive: typeof window.formationLapActive !== 'undefined' ? window.formationLapActive : null,
          inPitLane: (playerKart ? playerKart.inPitLane : null),
          driveOutAutopilot: (playerKart ? playerKart.driveOutAutopilot : null)
        }
      );
      lastCameraOwner = owner;
    }
    window.__cameraOwnerThisFrame = owner;
  };

  function updateCameraFollow() {
    if (postRaceActive || isStartingSequence) return;
    const pPos = playerKart.mesh.position;
    
    // T-cam view inside the garage looking forward out of the shutter door
    if (playerKart.qualifyingState === "GARAGE" && pitCurve) {
      camera.up.set(0, 1, 0);
      const totalBoxes = F1_TEAMS.length;
      const teamIdx = typeof selectedTeamIndex !== 'undefined' ? selectedTeamIndex : 0;
      const pBoxT = 0.30 + (teamIdx / Math.max(1, totalBoxes - 1)) * 0.40;
      const pt = pitCurve.getPointAt(pBoxT);
      const tang = pitCurve.getTangentAt(pBoxT).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      
      // Position camera at T-cam on the car (0.6m behind center, 1.25m height)
      const camPos = pPos.clone().add(norm.clone().multiplyScalar(0.6));
      camPos.y = pPos.y + 1.25;
      
      window.claimCameraOwner("GARAGE_CINEMATIC");
      camera.position.copy(camPos);
      
      // Look forward out of the garage door towards pit road
      const targetLookAt = pt.clone().add(new THREE.Vector3(0, 0.8, 0));
      camera.lookAt(targetLookAt);
      camera.updateProjectionMatrix();
      return;
    }
    
    if (isPitStopActive) {
      // Cinematic TV pit stop camera angle!
      const tang = pitCurve.getTangentAt(pitProgress).normalize();
      const norm = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      // Place camera in fast lane/pit wall zone (inner side, -6.0m from pitCurve) and slightly behind/ahead (-3.0m)
      const camPos = pPos.clone()
        .add(norm.clone().multiplyScalar(-6.0))
        .add(tang.clone().multiplyScalar(-3.0));
      camPos.y = pPos.y + 2.8;
      
      window.claimCameraOwner("PIT_STOP_CINEMATIC");
      camera.position.lerp(camPos, 0.08);
      camera.lookAt(pPos.clone().add(new THREE.Vector3(0, 0.5, 0)));
      camera.updateProjectionMatrix();
      return;
    }

      camera.up.set(0, 1, 0);

    let tangent;
    if (playerKart.inPitLane && pitCurve) {
      tangent = pitCurve.getTangentAt(pitProgress);
    } else {
      tangent = trackCurve.getTangentAt(playerKart.currentOffset);
    }
    
    const isTcam = (window.cameraDistanceSetting === 'tcam');
    let distMultiplier = -5.4; // default normal
    let heightVal = 2.0; // default normal
    
    if (isTcam) {
      distMultiplier = -0.6; // sit on engine airbox cover
      heightVal = 1.25;      // T-cam elevation height
    } else {
      if (window.cameraDistanceSetting === 'near') distMultiplier = -3.8;
      else if (window.cameraDistanceSetting === 'far') distMultiplier = -7.0;
      
      if (window.cameraHeightSetting === 'low') heightVal = 1.3;
      else if (window.cameraHeightSetting === 'high') heightVal = 2.8;
    }
    
    const backOffset = tangent.clone().multiplyScalar(distMultiplier);
    backOffset.y = heightVal;
 
    const targetCamPos = pPos.clone().add(backOffset);
    window.claimCameraOwner("GAMEPLAY_CHASE");
    
    if (isTcam) {
      camera.position.copy(targetCamPos); // Rock-steady, attached to chassis
    } else {
      camera.position.lerp(targetCamPos, 0.12);
    }
 
    // Dynamic FOV scaling based on speed & base FOV setting
    const maxUpgradeSpeed = 40 + upgrades.speed * 4;
    const speedRatio = Math.min(1.0, Math.abs(playerKart.speed) / maxUpgradeSpeed);
    const baseF = window.baseFOV !== undefined ? window.baseFOV : 65;
    camera.fov = THREE.MathUtils.lerp(baseF, baseF + 13, speedRatio);
    camera.updateProjectionMatrix();
 
    // Camera shake toggle at high speeds
    if (window.cameraShakeSetting !== false && Math.abs(playerKart.speed) > 28.0) {
      const shakeAmt = (Math.random() - 0.5) * 0.04 * speedRatio;
      camera.position.x += shakeAmt;
      camera.position.y += shakeAmt;
    }
 
    if (isTcam) {
      // T-cam looks far ahead along the car's heading tangent to align view
      const targetLookAt = pPos.clone().add(tangent.clone().multiplyScalar(20.0)).add(new THREE.Vector3(0, 0.75, 0));
      camera.lookAt(targetLookAt);
    } else {
      camera.lookAt(pPos.clone().add(new THREE.Vector3(0, 0.5, 0)));
    }
  }

  // Articulated 3D Humanoid Chibi F1 Driver Model
  function createChibiDriverModel(teamColor) {
    const driverGroup = new THREE.Group();
    
    const suitMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.5 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

    // Torso (chest/body root)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.65, 0.28), suitMat);
    torso.position.y = 0.55;
    torso.castShadow = true;
    torso.name = "torso";
    driverGroup.add(torso);

    // Head (Helmet + Visor)
    const headGroup = new THREE.Group();
    headGroup.name = "headGroup";
    headGroup.position.set(0, 0.82, 0);

    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.2 });
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), helmetMat);
    helmet.castShadow = true;
    headGroup.add(helmet);

    const visorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.1), visorMat);
    visor.position.set(0, 0.02, 0.20);
    headGroup.add(visor);
    
    driverGroup.add(headGroup);

    // Arm builder helper
    function createArm(side) {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.name = side + "Shoulder";
      
      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.12), suitMat);
      upperArm.position.y = -0.14;
      upperArm.castShadow = true;
      shoulderPivot.add(upperArm);
      
      const elbowPivot = new THREE.Group();
      elbowPivot.name = side + "Elbow";
      elbowPivot.position.set(0, -0.28, 0);
      upperArm.add(elbowPivot);
      
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), suitMat);
      forearm.position.y = -0.11;
      forearm.castShadow = true;
      elbowPivot.add(forearm);
      
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), gloveMat);
      hand.position.y = -0.22;
      forearm.add(hand);
      
      return shoulderPivot;
    }

    // Leg builder helper
    function createLeg(side) {
      const hipPivot = new THREE.Group();
      hipPivot.name = side + "Hip";
      
      const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), suitMat);
      upperLeg.position.y = -0.16;
      upperLeg.castShadow = true;
      hipPivot.add(upperLeg);
      
      const kneePivot = new THREE.Group();
      kneePivot.name = side + "Knee";
      kneePivot.position.set(0, -0.32, 0);
      upperLeg.add(kneePivot);
      
      const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.12), suitMat);
      lowerLeg.position.y = -0.14;
      lowerLeg.castShadow = true;
      kneePivot.add(lowerLeg);
      
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), bootMat);
      foot.position.set(0, -0.28, 0.04);
      lowerLeg.add(foot);
      
      return hipPivot;
    }

    // Left Arm
    const leftArm = createArm("Left");
    leftArm.position.set(-0.28, 0.25, 0);
    torso.add(leftArm);

    // Right Arm
    const rightArm = createArm("Right");
    rightArm.position.set(0.28, 0.25, 0);
    torso.add(rightArm);

    // Left Leg
    const leftLeg = createLeg("Left");
    leftLeg.position.set(-0.15, -0.32, 0);
    torso.add(leftLeg);

    // Right Leg
    const rightLeg = createLeg("Right");
    rightLeg.position.set(0.15, -0.32, 0);
    torso.add(rightLeg);

    // Animation properties
    driverGroup.animationState = "IDLE";
    driverGroup.animationTime = 0.0;

    // Cache joint references using traverse for high performance
    driverGroup.joints = {
      torso: torso,
      headGroup: headGroup,
      leftShoulder: leftArm,
      leftElbow: leftArm.children[0].children[1],
      rightShoulder: rightArm,
      rightElbow: rightArm.children[0].children[1],
      leftHip: leftLeg,
      leftKnee: leftLeg.children[0].children[1],
      rightHip: rightLeg,
      rightKnee: rightLeg.children[0].children[1]
    };

    return driverGroup;
  }

  // Animation controller set/reset
  function setDriverAnimation(driver, animation) {
    if (!driver) return;
    if (driver.animationState !== animation) {
      driver.animationState = animation;
      driver.animationTime = 0.0;
      // Reset all joints to defaults first to prevent accumulation
      if (driver.joints) {
        Object.values(driver.joints).forEach(j => {
          if (j && j.rotation) j.rotation.set(0, 0, 0);
        });
      }
    }
  }

  // Joint Animation tick function
  function updateDriverAnimation(driver, dt) {
    if (!driver || !driver.joints) return;
    driver.animationTime += dt;
    const t = driver.animationTime;
    const j = driver.joints;

    switch (driver.animationState) {
      case "WALK":
        // Alternate hips and knees
        j.leftHip.rotation.x = Math.sin(t * 8.0) * 0.45;
        j.rightHip.rotation.x = -Math.sin(t * 8.0) * 0.45;
        j.leftKnee.rotation.x = Math.max(0, Math.sin(t * 8.0 + 1.2) * 0.3);
        j.rightKnee.rotation.x = Math.max(0, -Math.sin(t * 8.0 + 1.2) * 0.3);
        // Swinging arms
        j.leftShoulder.rotation.x = -Math.sin(t * 8.0) * 0.35;
        j.rightShoulder.rotation.x = Math.sin(t * 8.0) * 0.35;
        j.leftElbow.rotation.x = -0.15;
        j.rightElbow.rotation.x = -0.15;
        j.torso.position.y = 0.55 + Math.abs(Math.sin(t * 16.0)) * 0.035;
        break;

      case "RUN":
        // Faster and wider motion
        j.leftHip.rotation.x = Math.sin(t * 12.0) * 0.65;
        j.rightHip.rotation.x = -Math.sin(t * 12.0) * 0.65;
        j.leftKnee.rotation.x = Math.max(0, Math.sin(t * 12.0 + 1.2) * 0.55);
        j.rightKnee.rotation.x = Math.max(0, -Math.sin(t * 12.0 + 1.2) * 0.55);
        j.leftShoulder.rotation.x = -Math.sin(t * 12.0) * 0.6;
        j.rightShoulder.rotation.x = Math.sin(t * 12.0) * 0.6;
        j.leftElbow.rotation.x = -0.4;
        j.rightElbow.rotation.x = -0.4;
        j.torso.position.y = 0.55 + Math.abs(Math.sin(t * 24.0)) * 0.06;
        break;

      case "CELEBRATE":
        // Raising arms in V shape, jumping slightly
        j.leftShoulder.rotation.z = Math.PI / 1.35;
        j.rightShoulder.rotation.z = -Math.PI / 1.35;
        j.leftElbow.rotation.x = -0.2 - Math.abs(Math.sin(t * 10.0)) * 0.25;
        j.rightElbow.rotation.x = -0.2 - Math.abs(Math.sin(t * 10.0)) * 0.25;
        j.torso.position.y = 0.55 + Math.abs(Math.sin(t * 9.0)) * 0.35;
        j.headGroup.rotation.y = Math.sin(t * 5.0) * 0.15;
        break;

      case "HUG":
        // Wrap arms forward
        j.leftShoulder.rotation.y = 0.6;
        j.leftShoulder.rotation.x = -0.3;
        j.rightShoulder.rotation.y = -0.6;
        j.rightShoulder.rotation.x = -0.3;
        j.leftElbow.rotation.y = 0.45;
        j.rightElbow.rotation.y = -0.45;
        j.torso.position.y = 0.55;
        break;

      case "CLAP":
        // Clap hands in front
        j.leftShoulder.rotation.z = Math.PI / 3.8;
        j.rightShoulder.rotation.z = -Math.PI / 3.8;
        j.leftShoulder.rotation.y = 0.3 + Math.sin(t * 18.0) * 0.15;
        j.rightShoulder.rotation.y = -0.3 - Math.sin(t * 18.0) * 0.15;
        j.leftElbow.rotation.x = -0.6;
        j.rightElbow.rotation.x = -0.6;
        j.torso.position.y = 0.55;
        break;

      case "HOLD_TROPHY":
        // Hold trophy in front at chest height
        j.leftShoulder.rotation.x = -0.55;
        j.leftShoulder.rotation.y = 0.4;
        j.rightShoulder.rotation.x = -0.55;
        j.rightShoulder.rotation.y = -0.4;
        j.leftElbow.rotation.x = -0.7;
        j.rightElbow.rotation.x = -0.7;
        j.torso.position.y = 0.55;
        break;

      case "RAISE_TROPHY":
        // Both hands up high holding trophy
        j.leftShoulder.rotation.z = Math.PI / 1.5;
        j.leftShoulder.rotation.y = 0.2;
        j.rightShoulder.rotation.z = -Math.PI / 1.5;
        j.rightShoulder.rotation.y = -0.2;
        j.leftElbow.rotation.x = -0.35 + Math.sin(t * 5.0) * 0.1;
        j.rightElbow.rotation.x = -0.35 + Math.sin(t * 5.0) * 0.1;
        j.torso.position.y = 0.55;
        break;

      case "HOLD_CHAMPAGNE":
        // Hold bottle in one hand, other hand waving
        j.leftShoulder.rotation.x = -0.6;
        j.leftShoulder.rotation.y = 0.2;
        j.leftElbow.rotation.x = -0.8;
        
        j.rightShoulder.rotation.z = -Math.PI / 1.35;
        j.rightShoulder.rotation.x = Math.sin(t * 8.0) * 0.25;
        j.rightElbow.rotation.x = -0.2;
        j.torso.position.y = 0.55;
        break;

      case "SPRAY_CHAMPAGNE":
        // Angle bottle forward, shaking it up and down
        j.leftShoulder.rotation.x = -0.75 + Math.sin(t * 22.0) * 0.18;
        j.leftShoulder.rotation.y = 0.15;
        j.leftElbow.rotation.x = -0.85;
        
        j.rightShoulder.rotation.x = -0.75 + Math.sin(t * 22.0) * 0.18;
        j.rightShoulder.rotation.y = -0.15;
        j.rightElbow.rotation.x = -0.85;
        j.torso.position.y = 0.55;
        break;

      case "IDLE":
      default:
        // Soft breathing idle animation
        j.torso.position.y = 0.55 + Math.sin(t * 2.5) * 0.012;
        j.leftShoulder.rotation.z = Math.sin(t * 2.5) * 0.03;
        j.rightShoulder.rotation.z = -Math.sin(t * 2.5) * 0.03;
        j.leftElbow.rotation.x = -0.05;
        j.rightElbow.rotation.x = -0.05;
        break;
    }
  }

  // 🏆 3D Podium Celebration Ceremony Scene
  // 🏆 3D POST-RACE STATE MACHINE & CINEMATIC SYSTEMS
  let postRaceActive = false;
  let postRaceState = "FINISHING"; // FINISHING, RESULTS, PARC_FERME, CELEBRATION, PODIUM, TROPHY, CHAMPAGNE, FINAL_RESULTS
  let postRaceTimer = 0.0;
  let skipHoldTimer = 0.0;
  let enterKeyPressed = false;
  
  let currentCinematicCar = null;
  let cinematicCarTimer = 0.0;
  
  let cutsceneDrivers = []; // top 3 driver models
  let cutscenePresenter = null;
  let cutsceneTrophy = null;
  let cutsceneCrew = [];
  let cutsceneBlocks = [];
  let champagneBottles = [];
  const champagneParticles = [];

  // Track Enter key specifically for skipped cutscenes
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') enterKeyPressed = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Enter') enterKeyPressed = false;
  });

