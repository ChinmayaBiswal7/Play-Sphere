// Animation System Module (FBX Mixers & procedural joints override)
function getFBXBones(mesh) {
  if (!mesh) return {};
  if (!mesh._fbxBones) {
    const getBone = (window.FBXPlayers && window.FBXPlayers.getBone) ? window.FBXPlayers.getBone : (m, n) => m.getObjectByName('mixamorig:' + n) || m.getObjectByName('mixamorig' + n);
    mesh._fbxBones = {
      hips: getBone(mesh, 'Hips'),
      spine: getBone(mesh, 'Spine'),
      spine1: getBone(mesh, 'Spine1'),
      leftUpLeg: getBone(mesh, 'LeftUpLeg'),
      rightUpLeg: getBone(mesh, 'RightUpLeg'),
      leftLeg: getBone(mesh, 'LeftLeg'),
      rightLeg: getBone(mesh, 'RightLeg'),
      leftArm: getBone(mesh, 'LeftArm'),
      rightArm: getBone(mesh, 'RightArm'),
      leftForeArm: getBone(mesh, 'LeftForeArm'),
      rightForeArm: getBone(mesh, 'RightForeArm'),
      leftHand: getBone(mesh, 'LeftHand'),
      rightHand: getBone(mesh, 'RightHand'),
      head: getBone(mesh, 'Head'),
      bat: mesh.getObjectByName('BatPivot')
    };
  }
  return mesh._fbxBones;
}

const SHOTS = {
  coverDrive: {
    rightArm:      { x: -0.5, y: 0.2,  z: -1.2 },
    rightForeArm:  { x: -0.6, y: 0.0,  z: 0.0 },
    leftArm:       { x: -0.4, y: -0.2, z:  1.2 },
    leftForeArm:   { x: -0.5, y: 0.0,  z: 0.0 },
    spine:         { y:  0.2 },
    bat:           { x: -0.6, y: 0.0,  z:  0.0 }
  },
  pullShot: {
    rightArm:      { x: -0.4, y: -1.2, z: -0.7 },
    rightForeArm:  { x: -0.8, y: 0.0,  z: 0.0 },
    leftArm:       { x: -0.5, y: -0.6, z:  0.9 },
    leftForeArm:   { x: -0.4, y: 0.0,  z: 0.0 },
    spine:         { y: -0.5 },
    bat:           { x: -1.2, y: 0.0,  z: -0.2 }
  },
  loftedDrive: {
    rightArm:      { x: -1.0, y: 0.0,  z: -0.8 },
    rightForeArm:  { x: -0.5, y: 0.0,  z: 0.0 },
    leftArm:       { x: -0.8, y: 0.0,  z:  0.8 },
    leftForeArm:   { x: -0.3, y: 0.0,  z: 0.0 },
    spine:         { y:  0.1 },
    bat:           { x: -0.8, y: 0.0,  z:  0.0 }
  },
  defense: {
    rightArm:      { x: -0.3, y: 0.1,  z: -1.35 },
    rightForeArm:  { x: -0.8, y: 0.0,  z: 0.0 },
    leftArm:       { x: -0.3, y: -0.2, z:  1.35 },
    leftForeArm:   { x: -0.8, y: 0.0,  z: 0.0 },
    spine:         { y:  0.0 },
    bat:           { x:  0.2, y: 0.0,  z:  0.0 }
  },
  helicopter: {
    rightArm:      { x: -1.5, y: 1.5,  z: -0.5 },
    rightForeArm:  { x: -0.4, y: 0.0,  z: 0.0 },
    leftArm:       { x: -1.2, y: 1.0,  z:  0.5 },
    leftForeArm:   { x: -0.2, y: 0.0,  z: 0.0 },
    spine:         { y:  0.5 },
    bat:           { x: -1.5, y: 0.0,  z: -0.5 }
  }
};

function updateBowlerAnimation(dt) {
  if (window.tossCutsceneActive || window.entranceCutsceneActive || window.wicketCutsceneActive || window.drsActive || window.runoutActive) return;

  // Guard: if bowler is currently fielding (running, collecting, etc.), skip bowler animation overrides
  const isBowlerFielding = window.fielders && window.fielders.some(f => f.mesh === window.bowlerMesh && f.state !== 'idle');
  if (isBowlerFielding) return;

  const THREE = window.THREE;
  const isPlaying = (window.gameState !== window.STATES.SPLASH && window.gameState !== window.STATES.MAIN_MENU && window.gameState !== window.STATES.WAITING_FOR_PHONE);
  if (!isPlaying) {
    window.bowlerAnimState = window.BOWLER_ANIM_STATES.IDLE;
  }

  // Handle PvP bowling R2 trigger
  if (window.gameState === window.STATES.BOWL_READY && window.matchMode === window.MODES.PVP && window.bowlerAnimState === window.BOWLER_ANIM_STATES.IDLE) {
    if (window.controllerInput.btnR2 && !window.bowlerReleased) {
      window.bowlerAnimState = window.BOWLER_ANIM_STATES.RUNUP;
      window.bowlerAnimTime = 0;
    }
  }

  if (window.bowlerMesh && window.bowlerMesh.isFBX) {
    if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.IDLE) {
      window.bowlerMesh.position.z = (window.gameState === window.STATES.BOWL_READY) ? -38.0 : -22.0;
      window.bowlerMesh.playAnimation('idle', { crossFade: 0.3 });
      return;
    }

    const bones = getFBXBones(window.bowlerMesh);

    let targetLeftLegX = 0;
    let targetRightLegX = 0;
    let targetLeftLowerLegX = 0;
    let targetRightLowerLegX = 0;

    let targetLeftArmY = 0;
    let targetLeftArmZ = Math.PI * 0.45;
    let targetRightArmY = 0;
    let targetRightArmZ = -Math.PI * 0.45;

    const isSpinner = window.isBowlerSpinner(window.MATCH ? window.MATCH.bowlerName : null);
    const startZ = isSpinner ? -26.0 : -38.0;
    const runDistance = isSpinner ? 3.2 : 15.2;

    let targetLeftForearmX = -0.2;
    let targetRightForearmX = -0.2;
    let targetSpineX = 0;
    let targetTorsoZ = startZ;

    if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.RUNUP) {
      window.bowlerAnimTime += dt;
      
      let runDuration = 1.5;
      if (isSpinner) {
        runDuration = (window.matchMode === window.MODES.SOLO && !window.MATCH.userIsBatting) ? 1.2 : ((window.matchMode === window.MODES.SOLO) ? 1.0 : 0.9);
      } else {
        runDuration = (window.matchMode === window.MODES.SOLO && !window.MATCH.userIsBatting) ? 2.5 : ((window.matchMode === window.MODES.SOLO) ? 1.8 : 1.5);
      }
      
      const runProgress = Math.min(1, window.bowlerAnimTime / runDuration);
      targetTorsoZ = startZ + runProgress * runDistance;

      if (!window.MATCH.userIsBatting && window.matchMode === window.MODES.SOLO) {
        if (!window.MATCH.bowlerReleasePressed) {
          const sweepVal = 0.5 - 0.5 * Math.cos(window.bowlerAnimTime * (Math.PI / (runDuration * 0.5)));
          window.MATCH.bowlerRunupProgress = sweepVal;
          
          const meterIndicator = document.getElementById('bowling-meter-indicator');
          if (meterIndicator) {
            meterIndicator.style.bottom = `${sweepVal * 100}%`;
          }
        }

        if (runProgress >= 1.0 && !window.MATCH.bowlerReleasePressed) {
          if (typeof window.triggerBowlingRelease === 'function') window.triggerBowlingRelease('noball');
        }
      }

      if (isSpinner) {
        window.bowlerMesh.playAnimation('walk', { crossFade: 0.2, timeScale: 1.1 });
      } else {
        window.bowlerMesh.playAnimation('fastRun', { crossFade: 0.2, timeScale: 1.3 });
      }

      const cycle = window.bowlerAnimTime * (isSpinner ? 9 : 14);
      targetLeftLegX = Math.sin(cycle) * 0.6;
      targetRightLegX = -Math.sin(cycle) * 0.6;
      targetLeftLowerLegX = -Math.max(0, Math.sin(cycle + Math.PI / 2)) * 0.5;
      targetRightLowerLegX = -Math.max(0, Math.sin(cycle - Math.PI / 2)) * 0.5;

      targetLeftArmY = Math.sin(cycle + Math.PI) * 0.5;
      targetLeftArmZ = Math.PI * 0.45;
      targetRightArmY = -Math.sin(cycle) * 0.5;
      targetRightArmZ = -Math.PI * 0.45;

      targetLeftForearmX = -0.4;
      targetRightForearmX = -0.4;
      targetSpineX = 0.15;

      if (runProgress >= 1.0) {
        if (window.MATCH.userIsBatting || window.MATCH.bowlerReleasePressed || window.matchMode === window.MODES.PVP) {
          window.bowlerAnimState = window.BOWLER_ANIM_STATES.LOADUP;
          window.bowlerAnimTime = 0;
        } else {
          // User never pressed the release — auto-fire as noball so the game doesn't freeze
          if (typeof window.triggerBowlingRelease === 'function') window.triggerBowlingRelease('noball');
        }
      }
    }
    else if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.LOADUP) {
      window.bowlerAnimTime += dt;
      const loadDuration = 0.15;
      const progress = Math.min(1, window.bowlerAnimTime / loadDuration);
      targetTorsoZ = -22.8;

      window.bowlerMesh.playAnimation('throw', { loop: false, crossFade: 0.1, timeScale: 1.5 });

      targetLeftLegX = -0.3;
      targetRightLegX = 0.2;
      targetLeftLowerLegX = -0.4;
      targetRightLowerLegX = -0.3;

      targetRightArmY = Math.PI * 0.4;
      targetRightArmZ = -Math.PI * 0.45;
      targetRightForearmX = -0.2;

      targetLeftArmY = -Math.PI * 0.3;
      targetLeftArmZ = Math.PI * 0.4;
      targetLeftForearmX = -0.2;

      targetSpineX = -0.15;

      if (progress >= 1.0) {
        window.bowlerAnimState = window.BOWLER_ANIM_STATES.RELEASE;
        window.bowlerAnimTime = 0;
      }
    }
    else if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.RELEASE) {
      window.bowlerAnimTime += dt;
      const releaseDuration = 0.12;
      const progress = Math.min(1, window.bowlerAnimTime / releaseDuration);
      targetTorsoZ = -22.8;

      window.bowlerMesh.playAnimation('throw', { loop: false, crossFade: 0.1, timeScale: 1.5 });

      targetRightArmY = THREE.MathUtils.lerp(Math.PI * 0.4, -Math.PI * 0.6, progress);
      targetRightArmZ = THREE.MathUtils.lerp(-Math.PI * 0.45, -Math.PI * 0.95, progress);
      targetRightForearmX = -0.1;

      targetLeftArmY = THREE.MathUtils.lerp(-Math.PI * 0.3, -Math.PI * 0.8, progress);
      targetLeftArmZ = THREE.MathUtils.lerp(Math.PI * 0.4, Math.PI * 0.15, progress);
      targetLeftForearmX = -0.5;

      targetSpineX = THREE.MathUtils.lerp(-0.15, 0.35, progress);

      if (progress >= 0.6 && !window.bowlerReleased) {
        window.bowlerReleased = true;
        if (window.matchMode === window.MODES.SOLO) {
          if (typeof window.bowlBall === 'function') window.bowlBall();
        } else {
          let delType = 'fast';
          if (window.controllerInput.btnCircle) delType = 'spin';
          if (window.controllerInput.btnTriangle) delType = 'bouncer';
          if (window.controllerInput.btnSquare) delType = 'yorker';
          if (typeof window.bowlBall === 'function') window.bowlBall(window.controllerInput.joystickX, delType);
        }
      }

      if (progress >= 1.0) {
        window.bowlerAnimState = window.BOWLER_ANIM_STATES.FOLLOWTHROUGH;
        window.bowlerAnimTime = 0;
      }
    }
    else if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.FOLLOWTHROUGH) {
      window.bowlerAnimTime += dt;
      const followDuration = 0.5;
      const progress = Math.min(1, window.bowlerAnimTime / followDuration);
      targetTorsoZ = -22.8 + progress * 0.8;

      window.bowlerMesh.playAnimation('idle', { crossFade: 0.4 });

      targetLeftLegX = 0.3 * (1 - progress);
      targetRightLegX = -0.4 * (1 - progress);

      targetRightArmY = -Math.PI * 0.6;
      targetRightArmZ = -Math.PI * 0.95 + progress * Math.PI * 0.3;
      targetLeftArmY = -Math.PI * 0.8;
      targetLeftArmZ = Math.PI * 0.15;

      targetSpineX = 0.25 * (1 - progress);

      if (progress >= 1.0) {
        window.bowlerAnimState = window.BOWLER_ANIM_STATES.IDLE;
        window.bowlerAnimTime = 0;
        const container = document.getElementById('bowling-console-hud');
        if (container) container.classList.add('hidden');
      }
    }

    // Apply smooth transforms
    window.bowlerMesh.position.z = THREE.MathUtils.lerp(window.bowlerMesh.position.z, targetTorsoZ, 0.25);
    window.bowlerMesh.position.y = 0.0;
    window.bowlerMesh.position.x = 0.6;

    if (bones.spine) bones.spine.rotation.set(targetSpineX, 0, 0);
    if (bones.leftUpLeg) bones.leftUpLeg.rotation.set(targetLeftLegX, 0, 0);
    if (bones.rightUpLeg) bones.rightUpLeg.rotation.set(targetRightLegX, 0, 0);
    if (bones.leftLeg) bones.leftLeg.rotation.set(targetLeftLowerLegX, 0, 0);
    if (bones.rightLeg) bones.rightLeg.rotation.set(targetRightLowerLegX, 0, 0);

    if (bones.leftArm) bones.leftArm.rotation.set(0, targetLeftArmY, targetLeftArmZ);
    if (bones.rightArm) bones.rightArm.rotation.set(0, targetRightArmY, targetRightArmZ);
    if (bones.leftForeArm) bones.leftForeArm.rotation.set(targetLeftForearmX, 0, 0);
    if (bones.rightForeArm) bones.rightForeArm.rotation.set(targetRightForearmX, 0, 0);

    if (!window.bowlerReleased && (window.bowlerAnimState === window.BOWLER_ANIM_STATES.RUNUP || window.bowlerAnimState === window.BOWLER_ANIM_STATES.LOADUP || window.bowlerAnimState === window.BOWLER_ANIM_STATES.RELEASE)) {
      window.bowlerMesh.updateMatrixWorld(true);
      if (bones.rightHand && window.ballMesh && window.ballBody) {
        const tempPos = new THREE.Vector3();
        bones.rightHand.getWorldPosition(tempPos);
        tempPos.y = Math.max(0.2, tempPos.y);
        tempPos.z = Math.min(-18.0, tempPos.z);
        window.ballMesh.position.copy(tempPos);
        window.ballBody.position.copy(tempPos);
        window.ballBody.velocity.set(0, 0, 0);
        window.ballBody.angularVelocity.set(0, 0, 0);
      }
    }
    return;
  }

  const parts = window.bowlerMesh ? window.bowlerMesh.parts : null;
  if (!parts) return;

  const leftLeg = parts.leftLeg;
  const rightLeg = parts.rightLeg;
  const leftLowerLeg = parts.leftLowerLeg;
  const rightLowerLeg = parts.rightLowerLeg;
  const leftArm = parts.leftArm;
  const rightArm = parts.rightArm;
  const leftForearm = parts.leftForearm;
  const rightForearm = parts.rightForearm;
  const torso = parts.torso;

  let targetLeftLegX = 0;
  let targetRightLegX = 0;
  let targetLeftLowerLegX = 0;
  let targetRightLowerLegX = 0;
  let targetLeftArmX = 0.2;
  let targetLeftArmZ = -0.1;
  let targetRightArmX = 0.2;
  let targetRightArmZ = 0.1;
  let targetLeftForearmX = -0.2;
  let targetRightForearmX = -0.2;
  let targetTorsoX = 0;
  let targetTorsoY = 0.6; 
  let targetTorsoZ = (window.gameState === window.STATES.BOWL_READY) ? -38.0 : -22.0;

  if (window.matchMode === window.MODES.SOLO && !window.MATCH.userIsBatting) {
    if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.IDLE) {
      targetTorsoY = 0.6;
      targetLeftArmX = 0.15;
      targetRightArmX = 0.15;
      targetTorsoZ = (window.gameState === window.STATES.BOWL_READY) ? -38.0 : -22.0;
    }
    else if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.RUNUP) {
      window.bowlerAnimTime += dt;
      const runDuration = (window.matchMode === window.MODES.SOLO && !window.MATCH.userIsBatting) ? 2.5 : 1.8;
      const runProgress = Math.min(1, window.bowlerAnimTime / runDuration);
      
      if (!window.MATCH.bowlerReleasePressed) {
        const sweepVal = (window.matchMode === window.MODES.SOLO && !window.MATCH.userIsBatting) ? 
                         (0.5 - 0.5 * Math.cos(window.bowlerAnimTime * (Math.PI / 1.25))) : 
                         (0.5 + 0.5 * Math.sin(window.bowlerAnimTime * Math.PI * 3.0));
        window.MATCH.bowlerRunupProgress = sweepVal;
        
        const meterIndicator = document.getElementById('bowling-meter-indicator');
        if (meterIndicator) {
          meterIndicator.style.bottom = `${sweepVal * 100}%`;
        }
      }
      
      targetTorsoZ = -38.0 + runProgress * 15.2;
      
      const cycle = window.bowlerAnimTime * 14;
      targetLeftLegX = Math.sin(cycle) * 0.7;
      targetRightLegX = Math.sin(cycle + Math.PI) * 0.7;
      
      targetLeftLowerLegX = -Math.max(0, Math.sin(cycle + Math.PI/2)) * 0.6;
      targetRightLowerLegX = -Math.max(0, Math.sin(cycle - Math.PI/2)) * 0.6;
      
      targetLeftArmX = Math.sin(cycle + Math.PI) * 0.6;
      targetRightArmX = Math.sin(cycle) * 0.6;
      targetLeftForearmX = -0.4;
      targetRightForearmX = -0.4;
      targetTorsoY = 0.6 + Math.abs(Math.sin(cycle * 2)) * 0.05;
      targetTorsoX = 0.1;

      if (runProgress >= 1.0) {
        if (window.MATCH.userIsBatting || window.MATCH.bowlerReleasePressed || window.matchMode === window.MODES.PVP) {
          window.bowlerAnimState = window.BOWLER_ANIM_STATES.LOADUP;
          window.bowlerAnimTime = 0;
        } else if (!window.MATCH.bowlerReleasePressed) {
          if (typeof window.triggerBowlingRelease === 'function') window.triggerBowlingRelease('noball');
        }
      } else if (!window.MATCH.bowlerReleasePressed && window.controllerInput.btnR2) {
        const sweepVal = window.MATCH.bowlerRunupProgress;
        let timing = 'perfect';
        if (sweepVal < 0.40 || sweepVal >= 0.92) timing = 'poor';
        else if (sweepVal >= 0.40 && sweepVal < 0.65) timing = 'good';
        else if (sweepVal >= 0.65 && sweepVal < 0.85) timing = 'perfect';
        else if (sweepVal >= 0.85 && sweepVal < 0.92) timing = 'poor';
        if (typeof window.triggerBowlingRelease === 'function') window.triggerBowlingRelease(timing);
      }
    }
    else if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.LOADUP) {
      window.bowlerAnimTime += dt;
      const loadDuration = 0.15;
      const progress = Math.min(1, window.bowlerAnimTime / loadDuration);
      
      targetTorsoZ = -22.8;
      targetLeftLegX = -0.3;
      targetRightLegX = 0.2;
      targetLeftLowerLegX = -0.4;
      targetRightLowerLegX = -0.3;
      
      targetLeftArmX = -Math.PI * 0.8;
      targetLeftArmZ = 0.1;
      targetLeftForearmX = -0.1;
      
      targetRightArmX = Math.PI * 0.4;
      targetRightArmZ = -0.2;
      targetRightForearmX = -0.2;

      targetTorsoY = 0.54; 
      targetTorsoX = -0.15; 

      if (progress >= 1.0) {
        window.bowlerAnimState = window.BOWLER_ANIM_STATES.RELEASE;
        window.bowlerAnimTime = 0;
      }
    }
    else if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.RELEASE) {
      window.bowlerAnimTime += dt;
      const releaseDuration = 0.12;
      const progress = Math.min(1, window.bowlerAnimTime / releaseDuration);
      
      targetTorsoZ = -22.8;
      targetRightArmX = Math.PI * 0.4 - progress * Math.PI * 2.2; 
      targetRightArmZ = 0.1;
      targetRightForearmX = -0.1; 
      
      targetLeftArmX = Math.PI * 0.3;
      targetLeftArmZ = -0.1;
      targetLeftForearmX = -0.6;
      
      targetTorsoX = 0.35;
      targetTorsoY = 0.56;

      if (!window.bowlerReleased && progress >= 0.5) {
        window.bowlerReleased = true;
        if (typeof window.bowlBall === 'function') window.bowlBall();
      }

      if (progress >= 1.0) {
        window.bowlerAnimState = window.BOWLER_ANIM_STATES.FOLLOWTHROUGH;
        window.bowlerAnimTime = 0;
      }
    }
    else if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.FOLLOWTHROUGH) {
      window.bowlerAnimTime += dt;
      const followDuration = 0.5;
      const progress = Math.min(1, window.bowlerAnimTime / followDuration);
      
      targetTorsoZ = -22.8 + progress * 0.8;
      targetLeftLegX = 0.3 * (1 - progress);
      targetRightLegX = -0.4 * (1 - progress);
      
      targetRightArmX = -Math.PI * 0.4 + progress * Math.PI * 0.2;
      targetRightArmZ = -0.3;
      
      targetTorsoX = 0.2 * (1 - progress);
      targetTorsoY = 0.6;

      if (progress >= 1.0) {
        window.bowlerAnimState = window.BOWLER_ANIM_STATES.IDLE;
        window.bowlerAnimTime = 0;
        const container = document.getElementById('bowling-console-hud');
        if (container) container.classList.add('hidden');
      }
    }
  } else {
    if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.IDLE) {
      targetTorsoY = 0.6;
      targetLeftArmX = 0.15;
      targetRightArmX = 0.15;
      targetTorsoZ = (window.gameState === window.STATES.BOWL_READY) ? -38.0 : -22.0;
    }
    else if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.RUNUP) {
      window.bowlerAnimTime += dt;
      const runDuration = (window.matchMode === window.MODES.SOLO) ? 1.8 : 1.2;
      const runProgress = Math.min(1, window.bowlerAnimTime / runDuration);
      
      targetTorsoZ = -38.0 + runProgress * 15.2;
      
      const cycle = window.bowlerAnimTime * 14;
      targetLeftLegX = Math.sin(cycle) * 0.7;
      targetRightLegX = Math.sin(cycle + Math.PI) * 0.7;
      
      targetLeftLowerLegX = -Math.max(0, Math.sin(cycle + Math.PI/2)) * 0.6;
      targetRightLowerLegX = -Math.max(0, Math.sin(cycle - Math.PI/2)) * 0.6;
      
      targetLeftArmX = Math.sin(cycle + Math.PI) * 0.6;
      targetRightArmX = Math.sin(cycle) * 0.6;
      targetLeftForearmX = -0.4;
      targetRightForearmX = -0.4;

      targetTorsoY = 0.6 + Math.abs(Math.sin(cycle * 2)) * 0.05;
      targetTorsoX = 0.1;

      if (runProgress >= 1.0) {
        window.bowlerAnimState = window.BOWLER_ANIM_STATES.LOADUP;
        window.bowlerAnimTime = 0;
      }
    }
    else if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.LOADUP) {
      window.bowlerAnimTime += dt;
      const loadDuration = 0.15;
      const progress = Math.min(1, window.bowlerAnimTime / loadDuration);
      
      targetTorsoZ = -22.8;
      
      targetLeftLegX = -0.3;
      targetRightLegX = 0.2;
      targetLeftLowerLegX = -0.4;
      targetRightLowerLegX = -0.3;
      
      targetLeftArmX = -Math.PI * 0.8;
      targetLeftArmZ = 0.1;
      targetLeftForearmX = -0.1;
      
      targetRightArmX = Math.PI * 0.4;
      targetRightArmZ = -0.2;
      targetRightForearmX = -0.2;

      targetTorsoY = 0.54; 
      targetTorsoX = -0.15; 

      if (progress >= 1.0) {
        window.bowlerAnimState = window.BOWLER_ANIM_STATES.RELEASE;
        window.bowlerAnimTime = 0;
      }
    }
    else if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.RELEASE) {
      window.bowlerAnimTime += dt;
      const releaseDuration = 0.12;
      const progress = Math.min(1, window.bowlerAnimTime / releaseDuration);
      
      targetTorsoZ = -22.8;
      
      targetRightArmX = Math.PI * 0.4 - progress * Math.PI * 2.2; 
      targetRightArmZ = 0.1;
      targetRightForearmX = -0.1; 
      
      targetLeftArmX = Math.PI * 0.3;
      targetLeftArmZ = -0.1;
      targetLeftForearmX = -0.6;
      
      targetTorsoX = 0.35;
      targetTorsoY = 0.56;

      if (!window.bowlerReleased && window.ballBody) {
        const handAngle = targetRightArmX;
        const handY = (targetTorsoY + 0.525 + Math.cos(handAngle) * 0.6) * 1.4;
        const handZ = -22.8 - Math.sin(handAngle) * 0.6 * 1.4;
        window.ballBody.position.set(0.6 + 0.21 * 1.4, handY, handZ);
        window.ballBody.velocity.set(0, 0, 0);
      }

      if (progress >= 1.0) {
        if (!window.bowlerReleased) {
          window.bowlerReleased = true;
          if (window.matchMode === window.MODES.SOLO) {
            if (typeof window.bowlBall === 'function') window.bowlBall();
          } else {
            let delType = 'fast';
            if (window.controllerInput.btnCircle) delType = 'spin';
            if (window.controllerInput.btnTriangle) delType = 'bouncer';
            if (window.controllerInput.btnSquare) delType = 'yorker';
            if (typeof window.bowlBall === 'function') window.bowlBall(window.controllerInput.joystickX, delType);
          }
        }
        window.bowlerAnimState = window.BOWLER_ANIM_STATES.FOLLOWTHROUGH;
        window.bowlerAnimTime = 0;
      }
    }
    else if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.FOLLOWTHROUGH) {
      window.bowlerAnimTime += dt;
      const followDuration = 0.5;
      const progress = Math.min(1, window.bowlerAnimTime / followDuration);
      
      targetTorsoZ = -22.8 + progress * 0.8;
      
      targetLeftLegX = 0.3 * (1 - progress);
      targetRightLegX = -0.4 * (1 - progress);
      
      targetRightArmX = -Math.PI * 0.4 + progress * Math.PI * 0.2;
      targetRightArmZ = -0.3;
      
      targetTorsoX = 0.2 * (1 - progress);
      targetTorsoY = 0.6;

      if (progress >= 1.0) {
        window.bowlerAnimState = window.BOWLER_ANIM_STATES.IDLE;
        window.bowlerAnimTime = 0;
      }
    }
  }

  // Smooth lerps
  window.bowlerMesh.position.z = THREE.MathUtils.lerp(window.bowlerMesh.position.z, targetTorsoZ, 0.25);
  window.bowlerMesh.position.y = 0.0;
  window.bowlerMesh.position.x = 0.6;  
  torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, targetTorsoX, 0.25);
  torso.position.y = THREE.MathUtils.lerp(torso.position.y, targetTorsoY, 0.25);
  leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, targetLeftLegX, 0.25);
  rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, targetRightLegX, 0.25);
  leftLowerLeg.rotation.x = THREE.MathUtils.lerp(leftLowerLeg.rotation.x, targetLeftLowerLegX, 0.25);
  rightLowerLeg.rotation.x = THREE.MathUtils.lerp(rightLowerLeg.rotation.x, targetRightLowerLegX, 0.25);

  leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, targetLeftArmX, 0.25);
  leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, targetLeftArmZ, 0.25);
  rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, targetRightArmX, 0.25);
  rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, targetRightArmZ, 0.25);

  leftForearm.rotation.x = THREE.MathUtils.lerp(leftForearm.rotation.x, targetLeftForearmX, 0.25);
  rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, targetRightForearmX, 0.25);

  // Animate wrists and ankles dynamically
  const leftHand = parts.leftHand;
  const rightHand = parts.rightHand;
  const leftFoot = parts.leftFoot;
  const rightFoot = parts.rightFoot;

  if (leftFoot) {
    const footTarget = leftLeg.rotation.x > 0 ? -0.18 : 0.35 * Math.abs(leftLeg.rotation.x);
    leftFoot.rotation.x = THREE.MathUtils.lerp(leftFoot.rotation.x, footTarget, 0.2);
  }
  if (rightFoot) {
    const footTarget = rightLeg.rotation.x > 0 ? -0.18 : 0.35 * Math.abs(rightLeg.rotation.x);
    rightFoot.rotation.x = THREE.MathUtils.lerp(rightFoot.rotation.x, footTarget, 0.2);
  }

  let targetLeftHandX = -leftArm.rotation.x * 0.35;
  let targetRightHandX = -rightArm.rotation.x * 0.35;

  if (window.bowlerAnimState === window.BOWLER_ANIM_STATES.RELEASE) {
    targetRightHandX = 0.85; // Flick the right release hand wrist forward!
  }

  if (leftHand) leftHand.rotation.x = THREE.MathUtils.lerp(leftHand.rotation.x, targetLeftHandX, 0.25);
  if (rightHand) rightHand.rotation.x = THREE.MathUtils.lerp(rightHand.rotation.x, targetRightHandX, 0.25);

  if (window.bowlerMesh && !window.bowlerMesh.isFBX && !window.bowlerReleased && window.ballBody) {
    const handAngle = rightArm.rotation.x;
    const handY = (torso.position.y + 0.525 + Math.cos(handAngle) * 0.6) * 1.4;
    const handZ = window.bowlerMesh.position.z - Math.sin(handAngle) * 0.6 * 1.4;
    const handX = window.bowlerMesh.position.x + 0.21 * 1.4;
    window.ballBody.position.set(handX, handY, handZ);
    window.ballBody.velocity.set(0, 0, 0);
    window.ballBody.angularVelocity.set(0, 0, 0);
  }
}

function updateBatsmanAnimation(dt) {
  if (window.tossCutsceneActive || window.entranceCutsceneActive || window.wicketCutsceneActive || window.drsActive || window.runoutActive) return;
  const THREE = window.THREE;
  const isPlaying = (window.gameState !== window.STATES.SPLASH && window.gameState !== window.STATES.MAIN_MENU && window.gameState !== window.STATES.WAITING_FOR_PHONE);
  const isLeft = window.MATCH && window.MATCH.batters && window.MATCH.batters[window.MATCH.strikerIndex]?.name === "R. PANT";
  const style = window.currentShotStyle || 'DRIVE';

  // FBX Batsman Animation
  if (window.batsmanMesh && window.batsmanMesh.isFBX) {
    const isReadyStance = (window.gameState === window.STATES.BOWL_READY || window.gameState === window.STATES.BALL_IN_FLIGHT);
    const moveDir = (window.MATCH.userIsBatting && window.gameState === window.STATES.BOWL_READY) ? (window.controllerInput.joystickX || (window.keys.a ? -1 : window.keys.d ? 1 : 0)) : 0;
    const isMoving = isPlaying && Math.abs(moveDir) > 0.05 && window.runningState === 'idle';

    const bones = getFBXBones(window.batsmanMesh);

    if (window.runningState !== 'idle') {
      window.batsmanMesh.playAnimation('fastRun', { crossFade: 0.2, timeScale: 1.3 });
      animateRunningCycle(bones, window.clock.getElapsedTime(), 1.3);
    } else if (isMoving && window.swingPhase === 0) {
      window.batsmanMesh.playAnimation('walk', { crossFade: 0.2, timeScale: 1.0 });
      const w = window.clock.getElapsedTime() * 12;
      if (bones.hips) bones.hips.rotation.set(0, isLeft ? -Math.PI / 2 : Math.PI / 2, 0);
      if (bones.leftUpLeg) bones.leftUpLeg.rotation.set(Math.sin(w) * 0.2, 0, 0);
      if (bones.rightUpLeg) bones.rightUpLeg.rotation.set(-Math.sin(w) * 0.2, 0, 0);
      if (bones.leftLeg) bones.leftLeg.rotation.set(Math.max(0, Math.sin(w + Math.PI)) * 0.2, 0, 0);
      if (bones.rightLeg) bones.rightLeg.rotation.set(Math.max(0, Math.sin(w)) * 0.2, 0, 0);
      
      if (isLeft) {
        if (bones.rightArm) bones.rightArm.rotation.set(0.2, 0.1, -1.35);
        if (bones.rightForeArm) bones.rightForeArm.rotation.set(-0.8, 0, 0);
        if (bones.leftArm) bones.leftArm.rotation.set(-0.2, -0.1, 1.35);
        if (bones.leftForeArm) bones.leftForeArm.rotation.set(-0.6, 0, 0);
      } else {
        if (bones.leftArm) bones.leftArm.rotation.set(0.2, -0.1, 1.35);
        if (bones.leftForeArm) bones.leftForeArm.rotation.set(-0.8, 0, 0);
        if (bones.rightArm) bones.rightArm.rotation.set(-0.2, 0.1, -1.35);
        if (bones.rightForeArm) bones.rightForeArm.rotation.set(-0.6, 0, 0);
      }
      if (bones.bat) bones.bat.rotation.set(-1.6, 0.1, 0);
    } else if (window.swingPhase === 0) {
      window.batsmanMesh.playAnimation('idle', { crossFade: 0.3 });
      setBattingGuardPose(bones, isLeft);
      window.batsmanMesh.position.z = THREE.MathUtils.lerp(window.batsmanMesh.position.z, window.BATSMAN_CREASE_Z, 0.15);
    }

    if (window.swingPhase === 1) {
      window.swingT += dt * 10;
      const progress = Math.min(window.swingT, 1);

      if (bones.hips) bones.hips.rotation.set(0, isLeft ? -Math.PI / 2 : Math.PI / 2, 0);

      if (isLeft) {
        const rArmX = THREE.MathUtils.lerp(0.2, 0, progress);
        const rArmY = THREE.MathUtils.lerp(0.1, -Math.PI * 0.15, progress);
        const rArmZ = THREE.MathUtils.lerp(-1.35, -Math.PI * 0.25, progress);
        if (bones.rightArm) bones.rightArm.rotation.set(rArmX, rArmY, rArmZ);

        const rForeX = THREE.MathUtils.lerp(-0.8, -0.3, progress);
        if (bones.rightForeArm) bones.rightForeArm.rotation.set(rForeX, 0, 0);

        const lArmX = THREE.MathUtils.lerp(-0.2, 0, progress);
        const lArmY = THREE.MathUtils.lerp(-0.1, Math.PI * 0.35, progress);
        const lArmZ = THREE.MathUtils.lerp(1.35, Math.PI * 0.3, progress);
        if (bones.leftArm) bones.leftArm.rotation.set(lArmX, lArmY, lArmZ);

        if (bones.leftForeArm) bones.leftForeArm.rotation.set(-0.5, 0, 0);
      } else {
        const rArmX = THREE.MathUtils.lerp(-0.2, 0, progress);
        const rArmY = THREE.MathUtils.lerp(0.1, Math.PI * 0.35, progress);
        const rArmZ = THREE.MathUtils.lerp(-1.35, -Math.PI * 0.3, progress);
        if (bones.rightArm) bones.rightArm.rotation.set(rArmX, rArmY, rArmZ);

        if (bones.rightForeArm) bones.rightForeArm.rotation.set(-0.5, 0, 0);

        const lArmX = THREE.MathUtils.lerp(0.2, 0, progress);
        const lArmY = THREE.MathUtils.lerp(-0.1, -Math.PI * 0.15, progress);
        const lArmZ = THREE.MathUtils.lerp(1.35, Math.PI * 0.25, progress);
        if (bones.leftArm) bones.leftArm.rotation.set(lArmX, lArmY, lArmZ);

        const lForeX = THREE.MathUtils.lerp(-0.8, -0.3, progress);
        if (bones.leftForeArm) bones.leftForeArm.rotation.set(lForeX, 0, 0);
      }

      if (bones.spine) bones.spine.rotation.set(0, isLeft ? 0.4 * progress : -0.4 * progress, 0);
      if (bones.bat) bones.bat.rotation.set(-1.6 + 2.6 * progress, 0.1 - 0.1 * progress, 0);

      window.batsmanMesh.position.z = THREE.MathUtils.lerp(window.batsmanMesh.position.z, window.BATSMAN_CREASE_Z + 0.15, progress);

      if (window.swingT >= 1) { window.swingPhase = 2; window.swingT = 0; }
    } 
    else if (window.swingPhase === 2) {
      window.swingT += dt * 14;
      const progress = Math.min(window.swingT, 1);

      let chosenShot = 'coverDrive';
      if (style === 'DEFENSE') chosenShot = 'defense';
      else if (style === 'LOFT') chosenShot = 'loftedDrive';
      else if (style === 'POWER') chosenShot = 'helicopter';
      else if (style === 'PULL') chosenShot = 'pullShot';

      const cfg = SHOTS[chosenShot] || SHOTS.coverDrive;

      if (bones.hips) bones.hips.rotation.set(0, isLeft ? -Math.PI / 2 : Math.PI / 2, 0);

      if (isLeft) {
        const targetX = cfg.leftArm ? cfg.leftArm.x : 0;
        const targetY = cfg.leftArm ? -cfg.leftArm.y : 0;
        const targetZ = cfg.leftArm ? -cfg.leftArm.z : -Math.PI * 0.45;

        const rArmX = THREE.MathUtils.lerp(0, targetX, progress);
        const rArmY = THREE.MathUtils.lerp(-Math.PI * 0.15, targetY, progress);
        const rArmZ = THREE.MathUtils.lerp(-Math.PI * 0.25, targetZ, progress);
        if (bones.rightArm) bones.rightArm.rotation.set(rArmX, rArmY, rArmZ);

        const rForeX = THREE.MathUtils.lerp(-0.3, cfg.leftForeArm ? cfg.leftForeArm.x : -0.5, progress);
        if (bones.rightForeArm) bones.rightForeArm.rotation.set(rForeX, 0, 0);

        const targetRX = cfg.rightArm.x;
        const targetRY = -cfg.rightArm.y;
        const targetRZ = -cfg.rightArm.z;

        const lArmX = THREE.MathUtils.lerp(0, targetRX, progress);
        const lArmY = THREE.MathUtils.lerp(Math.PI * 0.35, targetRY, progress);
        const lArmZ = THREE.MathUtils.lerp(Math.PI * 0.3, targetRZ, progress);
        if (bones.leftArm) bones.leftArm.rotation.set(lArmX, lArmY, lArmZ);

        const lForeX = THREE.MathUtils.lerp(-0.5, cfg.rightForeArm.x, progress);
        if (bones.leftForeArm) bones.leftForeArm.rotation.set(lForeX, 0, 0);
      } else {
        const rArmX = THREE.MathUtils.lerp(0, cfg.rightArm.x, progress);
        const rArmY = THREE.MathUtils.lerp(Math.PI * 0.35, cfg.rightArm.y, progress);
        const rArmZ = THREE.MathUtils.lerp(-Math.PI * 0.3, cfg.rightArm.z, progress);
        if (bones.rightArm) bones.rightArm.rotation.set(rArmX, rArmY, rArmZ);

        const rForeX = THREE.MathUtils.lerp(-0.5, cfg.rightForeArm.x, progress);
        if (bones.rightForeArm) bones.rightForeArm.rotation.set(rForeX, 0, 0);

        const lArmX = cfg.leftArm ? THREE.MathUtils.lerp(0, cfg.leftArm.x, progress) : 0;
        const lArmY = cfg.leftArm ? THREE.MathUtils.lerp(-Math.PI * 0.15, cfg.leftArm.y, progress) : 0;
        const lArmZ = cfg.leftArm ? THREE.MathUtils.lerp(Math.PI * 0.25, cfg.leftArm.z, progress) : THREE.MathUtils.lerp(Math.PI * 0.25, Math.PI * 0.45, progress);
        if (bones.leftArm) bones.leftArm.rotation.set(lArmX, lArmY, lArmZ);

        const lForeX = THREE.MathUtils.lerp(-0.3, cfg.leftForeArm ? cfg.leftForeArm.x : -0.5, progress);
        if (bones.leftForeArm) bones.leftForeArm.rotation.set(lForeX, 0, 0);
      }

      const spineY = THREE.MathUtils.lerp(isLeft ? 0.4 : -0.4, cfg.spine ? (isLeft ? -cfg.spine.y : cfg.spine.y) : 0, progress);
      if (bones.spine) bones.spine.rotation.set(0, spineY, 0);

      const batX = THREE.MathUtils.lerp(1.0, cfg.bat.x, progress);
      const batY = THREE.MathUtils.lerp(0, cfg.bat.y, progress);
      const batZ = THREE.MathUtils.lerp(0, cfg.bat.z, progress);
      if (bones.bat) bones.bat.rotation.set(batX, batY, batZ);

      let strideZ = -0.3;
      if (style === 'DRIVE') strideZ = -0.4;
      else if (style === 'PULL') strideZ = -0.1;
      else if (style === 'SWEEP') strideZ = -0.25;
      else if (style === 'FLICK') strideZ = -0.15;
      else if (style === 'DEFENSE') strideZ = -0.2;

      window.batsmanMesh.position.z = THREE.MathUtils.lerp(window.batsmanMesh.position.z, window.BATSMAN_CREASE_Z + strideZ, progress);

      if (window.swingT >= 1) { window.swingPhase = 3; window.swingT = 0; }
    } 
    else if (window.swingPhase === 3) {
      window.swingT += dt * 2.5;
      const progress = Math.min(window.swingT, 1);

      let chosenShot = 'coverDrive';
      if (style === 'DEFENSE') chosenShot = 'defense';
      else if (style === 'LOFT') chosenShot = 'loftedDrive';
      else if (style === 'POWER') chosenShot = 'helicopter';
      else if (style === 'PULL') chosenShot = 'pullShot';

      const cfg = SHOTS[chosenShot] || SHOTS.coverDrive;

      if (bones.hips) bones.hips.rotation.set(0, isLeft ? -Math.PI / 2 : Math.PI / 2, 0);

      if (isLeft) {
        const rArmY = THREE.MathUtils.lerp(-cfg.leftArm.y, Math.PI * 0.7, progress);
        const rArmZ = THREE.MathUtils.lerp(-cfg.leftArm.z, Math.PI * 0.45, progress);
        if (bones.rightArm) bones.rightArm.rotation.set(0, rArmY, rArmZ);
      } else {
        const rArmY = THREE.MathUtils.lerp(cfg.rightArm.y, -Math.PI * 0.7, progress);
        const rArmZ = THREE.MathUtils.lerp(cfg.rightArm.z, -Math.PI * 0.45, progress);
        if (bones.rightArm) bones.rightArm.rotation.set(0, rArmY, rArmZ);
      }

      const spineY = THREE.MathUtils.lerp(cfg.spine ? (isLeft ? -cfg.spine.y : cfg.spine.y) : 0, isLeft ? -0.65 : 0.65, progress);
      if (bones.spine) bones.spine.rotation.set(0, spineY, 0);

      const batX = THREE.MathUtils.lerp(cfg.bat.x, -2.2, progress);
      if (bones.bat) bones.bat.rotation.set(batX, 0, 0);

      if (window.swingT >= 1) { window.swingPhase = 0; window.swingT = 0; }
    }

    const head = bones.head;
    if (head) {
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, isLeft ? Math.PI / 2 : -Math.PI / 2, 0.14);
    }
    return;
  }

  const parts = window.batsmanMesh ? window.batsmanMesh.parts : null;
  if (!parts) return;

  const leftLeg     = parts.leftLeg;
  const rightLeg    = parts.rightLeg;
  const leftArm     = parts.leftArm;
  const rightArm    = parts.rightArm;
  const leftForearm = parts.leftForearm;
  const rightForearm= parts.rightForearm;
  const leftHand    = parts.leftHand;
  const rightHand   = parts.rightHand;
  const leftFoot    = parts.leftFoot;
  const rightFoot   = parts.rightFoot;
  const torso       = parts.torso;
  const bat         = parts.bat;

  if (window.swingPhase === 1) {
    window.swingT += dt * 6;
    const progress = Math.min(window.swingT, 1);
    
    rightForearm.rotation.z = THREE.MathUtils.lerp(rightForearm.rotation.z, -1.2, progress);
    rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, -0.6, progress);
    rightArm.rotation.x     = THREE.MathUtils.lerp(rightArm.rotation.x,     -0.8, progress);
    leftArm.rotation.x      = THREE.MathUtils.lerp(leftArm.rotation.x,      -0.5, progress);
    
    torso.rotation.y        = THREE.MathUtils.lerp(torso.rotation.y,        -0.4, progress);
    torso.rotation.x        = THREE.MathUtils.lerp(torso.rotation.x,         0.15, progress);
    
    if (bat) {
      bat.rotation.x = THREE.MathUtils.lerp(bat.rotation.x, 1.2, progress);
      bat.rotation.z = THREE.MathUtils.lerp(bat.rotation.z, 0.3, progress);
    }
    
    window.batsmanMesh.position.z = THREE.MathUtils.lerp(window.batsmanMesh.position.z, window.BATSMAN_CREASE_Z + 0.15, progress);

    if (window.swingT >= 1) { window.swingPhase = 2; window.swingT = 0; }
  } else if (window.swingPhase === 2) {
    window.swingT += dt * 9;
    const progress = Math.min(window.swingT, 1);
    
    rightForearm.rotation.z = THREE.MathUtils.lerp(rightForearm.rotation.z,  1.2, progress);
    rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x,  0.3, progress);
    rightArm.rotation.x     = THREE.MathUtils.lerp(rightArm.rotation.x,      0.5, progress);
    leftArm.rotation.x      = THREE.MathUtils.lerp(leftArm.rotation.x,       0.6, progress);
    
    torso.rotation.y        = THREE.MathUtils.lerp(torso.rotation.y,         0.5, progress);
    torso.rotation.x        = THREE.MathUtils.lerp(torso.rotation.x,        -0.1, progress);
    torso.position.y        = THREE.MathUtils.lerp(torso.position.y,         0.52, progress);
    
    if (bat) {
      bat.rotation.x = THREE.MathUtils.lerp(bat.rotation.x, -1.2, progress);
      bat.rotation.z = THREE.MathUtils.lerp(bat.rotation.z, -0.2, progress);
    }
    
    window.batsmanMesh.position.z = THREE.MathUtils.lerp(window.batsmanMesh.position.z, window.BATSMAN_CREASE_Z - 0.3, progress);

    if (window.swingT >= 1) { window.swingPhase = 3; window.swingT = 0; }
  } else if (window.swingPhase === 3) {
    window.swingT += dt * 2.5;
    const progress = Math.min(window.swingT, 1);
    
    rightForearm.rotation.z = THREE.MathUtils.lerp(rightForearm.rotation.z, 0.6, progress);
    rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, 0.1, progress);
    rightArm.rotation.x     = THREE.MathUtils.lerp(rightArm.rotation.x,     0.2, progress);
    
    torso.rotation.y        = THREE.MathUtils.lerp(torso.rotation.y,         0.6, progress);
    torso.rotation.x        = THREE.MathUtils.lerp(torso.rotation.x,         0.0, progress);
    torso.position.y        = THREE.MathUtils.lerp(torso.position.y,         0.6, progress);
    
    if (bat) {
      bat.rotation.x = THREE.MathUtils.lerp(bat.rotation.x, 0.8, progress);
      bat.rotation.z = THREE.MathUtils.lerp(bat.rotation.z, -0.8, progress);
    }

    if (window.swingT >= 1) { window.swingPhase = 0; window.swingT = 0; }
  } else {
    let tForearmZ = -0.3;
    let tForearmX = -0.8;
    let tRightArmX = -0.6;
    let tLeftArmX  =  0.4;
    let tTorsoX    =  0.1;
    let tTorsoY    =  0.6;
    let tTorsoRotY =  0.0;
    let tBatRotX   =  0.4;
    let tBatRotZ   =  0.15;

    if (!isPlaying) {
      tTorsoY  = 0.6;
      tBatRotX = 0.4;
    } else if (window.gameState === window.STATES.BOWL_READY || window.gameState === window.STATES.BALL_IN_FLIGHT) {
      tForearmZ  = -0.5;
      tForearmX  = -0.9;
      tRightArmX = -0.7;
      tLeftArmX  =  0.3;
      tTorsoX    =  0.12;
      tTorsoY    =  0.58;
      tBatRotX   =  0.4;
    }

    rightForearm.rotation.z = THREE.MathUtils.lerp(rightForearm.rotation.z, tForearmZ, 0.14);
    rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, tForearmX, 0.14);
    rightArm.rotation.x     = THREE.MathUtils.lerp(rightArm.rotation.x,     tRightArmX, 0.14);
    leftArm.rotation.x      = THREE.MathUtils.lerp(leftArm.rotation.x,      tLeftArmX,  0.14);
    torso.rotation.x        = THREE.MathUtils.lerp(torso.rotation.x,         tTorsoX,   0.14);
    torso.rotation.y        = THREE.MathUtils.lerp(torso.rotation.y,         tTorsoRotY, 0.14);
    torso.position.y        = THREE.MathUtils.lerp(torso.position.y,         tTorsoY,   0.14);
    if (bat) {
      bat.rotation.x = THREE.MathUtils.lerp(bat.rotation.x, tBatRotX, 0.14);
      bat.rotation.z = THREE.MathUtils.lerp(bat.rotation.z, tBatRotZ, 0.14);
    }
  }

  // Shuffle/Walk animations
  const moveDir = (window.MATCH.userIsBatting && window.gameState === window.STATES.BOWL_READY) ? (window.controllerInput.joystickX || (window.keys.a ? -1 : window.keys.d ? 1 : 0)) : 0;
  const isMoving = isPlaying && Math.abs(moveDir) > 0.05 && window.runningState === 'idle';
  if (isMoving) {
    const walkCycle = window.clock.getElapsedTime() * 14;
    leftLeg.rotation.x  = Math.sin(walkCycle) * 0.48;
    rightLeg.rotation.x = Math.sin(walkCycle + Math.PI) * 0.48;
    leftArm.rotation.x  = THREE.MathUtils.lerp(leftArm.rotation.x,  Math.sin(walkCycle + Math.PI) * 0.3, 0.3);
    rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, Math.sin(walkCycle) * 0.3, 0.3);
    torso.position.y    = THREE.MathUtils.lerp(torso.position.y, 0.58 + Math.abs(Math.sin(walkCycle)) * 0.02, 0.2);
  } else if (window.runningState === 'idle') {
    leftLeg.rotation.x  = THREE.MathUtils.lerp(leftLeg.rotation.x,  0, 0.15);
    rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.15);
  } else {
    const walkCycle = window.clock.getElapsedTime() * 14;
    leftLeg.rotation.x  = Math.sin(walkCycle) * 0.7;
    rightLeg.rotation.x = Math.sin(walkCycle + Math.PI) * 0.7;
    leftArm.rotation.x  = -Math.sin(walkCycle + Math.PI) * 0.5;
    rightArm.rotation.x = Math.sin(walkCycle) * 0.5;
    torso.position.y    = THREE.MathUtils.lerp(torso.position.y, 0.6 + Math.abs(Math.sin(walkCycle)) * 0.05, 0.2);
  }

  leftForearm.rotation.x = THREE.MathUtils.lerp(leftForearm.rotation.x,
    window.swingPhase > 0 ? rightForearm.rotation.x * 0.5 : -0.6, 0.2);

  // Animate wrists and ankles dynamically based on swing phase and walking/running legs
  let targetLeftHandX = 0.1;
  let targetRightHandX = 0.1;
  
  if (window.swingPhase === 1) {
    targetRightHandX = -0.45; // Cock wrists back during backswing
    targetLeftHandX = -0.3;
  } else if (window.swingPhase === 2) {
    targetRightHandX = 0.65;  // Snap wrists forward during shot release
    targetLeftHandX = 0.45;
  } else if (window.swingPhase === 3) {
    targetRightHandX = 0.4;   // Follow-through extension
    targetLeftHandX = 0.3;
  }

  if (leftHand) leftHand.rotation.x = THREE.MathUtils.lerp(leftHand.rotation.x, targetLeftHandX, 0.2);
  if (rightHand) rightHand.rotation.x = THREE.MathUtils.lerp(rightHand.rotation.x, targetRightHandX, 0.2);

  if (leftFoot) {
    const footTarget = leftLeg.rotation.x > 0 ? -0.18 : 0.35 * Math.abs(leftLeg.rotation.x);
    leftFoot.rotation.x = THREE.MathUtils.lerp(leftFoot.rotation.x, footTarget, 0.2);
  }
  if (rightFoot) {
    const footTarget = rightLeg.rotation.x > 0 ? -0.18 : 0.35 * Math.abs(rightLeg.rotation.x);
    rightFoot.rotation.x = THREE.MathUtils.lerp(rightFoot.rotation.x, footTarget, 0.2);
  }
}

function updateOtherPlayers(dt) {
  if (window.tossCutsceneActive || window.entranceCutsceneActive || window.wicketCutsceneActive || window.drsActive || window.runoutActive) return;
  const THREE = window.THREE;
  const time = window.clock.getElapsedTime();

  // Wicketkeeper crouch / stance
  if (window.keeperMesh) {
    if (window.keeperMesh.isFBX) {
      const kb = getFBXBones(window.keeperMesh);
      if (window.keeperHasBall) {
        if (kb.leftUpLeg) kb.leftUpLeg.rotation.x = -0.6;
        if (kb.rightUpLeg) kb.rightUpLeg.rotation.x = -0.6;
        if (kb.leftLeg) kb.leftLeg.rotation.x = 1.0;
        if (kb.rightLeg) kb.rightLeg.rotation.x = 1.0;
        if (kb.leftArm) kb.leftArm.rotation.set(-1.0, 0.2, 1.25);
        if (kb.rightArm) kb.rightArm.rotation.set(-1.0, -0.2, -1.25);
        if (kb.leftForeArm) kb.leftForeArm.rotation.set(-0.3, 0, 0);
        if (kb.rightForeArm) kb.rightForeArm.rotation.set(-0.3, 0, 0);
      } else {
        setKeeperStance(kb);
        if (window.gameState === window.STATES.MISS && window.ballBody) {
          const ballPos = window.ballBody.position;
          if (ballPos.z > 1.8 && ballPos.z < 3.2) {
            if (kb.leftArm) kb.leftArm.rotation.set(0.9, 0.2, 1.25);
            if (kb.rightArm) kb.rightArm.rotation.set(0.9, -0.2, -1.25);
            if (kb.leftForeArm) kb.leftForeArm.rotation.set(-0.2, 0, 0);
            if (kb.rightForeArm) kb.rightForeArm.rotation.set(-0.2, 0, 0);
          }
        }
      }
    } else if (window.keeperMesh.parts) {
      const p = window.keeperMesh.parts;
      p.torso.position.y = 0.35;
      p.torso.rotation.x = 0.7;
      
      p.leftLeg.rotation.x = -1.0;
      p.rightLeg.rotation.x = -1.0;
      p.leftLowerLeg.rotation.x = 1.2;
      p.rightLowerLeg.rotation.x = 1.2;
      
      p.leftArm.rotation.x = 0.6;
      p.rightArm.rotation.x = 0.6;
      p.leftForearm.rotation.x = -0.8;
      p.rightForearm.rotation.x = -0.8;
      
      // Animate wrists and ankles for procedural keeper
      if (p.leftHand) p.leftHand.rotation.x = -0.3;
      if (p.rightHand) p.rightHand.rotation.x = -0.3;
      if (p.leftFoot) p.leftFoot.rotation.x = 0.8;
      if (p.rightFoot) p.rightFoot.rotation.x = 0.8;
    }
  }

  // Non-striker runner
  if (window.nonStrikerMesh) {
    const isRunning = (window.runningState === 'called' || window.runningState === 'completing' || window.runningState === 'cancelled');
    if (window.nonStrikerMesh.isFBX) {
      const bones = getFBXBones(window.nonStrikerMesh);
      if (isRunning) {
        animateRunningCycle(bones, time, 1.3);
        const nsTargetRot = (window.runningState === 'called') ? 0 : Math.PI;
        window.nonStrikerMesh.rotation.y = THREE.MathUtils.lerp(window.nonStrikerMesh.rotation.y, nsTargetRot, 0.15);
      } else {
        window.nonStrikerMesh.playAnimation('idle', { crossFade: 0.3 });
        if (bones.hips) bones.hips.rotation.set(0, 0, 0);
        if (bones.spine) bones.spine.rotation.set(0.05, 0, 0);
        if (bones.leftArm) bones.leftArm.rotation.set(0.2, 0, 0.1);
        if (bones.rightArm) bones.rightArm.rotation.set(0.2, 0, -0.1);
        window.nonStrikerMesh.rotation.y = THREE.MathUtils.lerp(window.nonStrikerMesh.rotation.y, 0, 0.15);
        window.nonStrikerMesh.position.z = THREE.MathUtils.lerp(window.nonStrikerMesh.position.z, window.nonStrikerStartZ, 0.15);
      }
    } else if (window.nonStrikerMesh.parts) {
      const p = window.nonStrikerMesh.parts;
      if (isRunning) {
        const cycle = time * 14;
        p.leftLeg.rotation.x  = Math.sin(cycle) * 0.7;
        p.rightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.7;
        p.leftArm.rotation.x  = -Math.sin(cycle + Math.PI) * 0.5;
        p.rightArm.rotation.x = Math.sin(cycle) * 0.5;
        p.torso.position.y    = 0.6 + Math.abs(Math.sin(cycle)) * 0.05;
        
        const nsTargetRot = (window.runningState === 'called') ? 0 : Math.PI;
        window.nonStrikerMesh.rotation.y = THREE.MathUtils.lerp(window.nonStrikerMesh.rotation.y, nsTargetRot, 0.15);
      } else {
        p.leftLeg.rotation.x  = THREE.MathUtils.lerp(p.leftLeg.rotation.x,  0, 0.15);
        p.rightLeg.rotation.x = THREE.MathUtils.lerp(p.rightLeg.rotation.x, 0, 0.15);
        p.leftArm.rotation.x  = THREE.MathUtils.lerp(p.leftArm.rotation.x,  0.1, 0.15);
        p.rightArm.rotation.x = THREE.MathUtils.lerp(p.rightArm.rotation.x, 0.1, 0.15);
        p.torso.position.y    = THREE.MathUtils.lerp(p.torso.position.y, 0.6, 0.15);
        
        window.nonStrikerMesh.rotation.y = THREE.MathUtils.lerp(window.nonStrikerMesh.rotation.y, 0, 0.15);
        window.nonStrikerMesh.position.z = THREE.MathUtils.lerp(window.nonStrikerMesh.position.z, window.nonStrikerStartZ, 0.15);
      }

      // Animate non-striker runner wrists and ankles dynamically
      if (p.leftFoot) {
        const footTarget = p.leftLeg.rotation.x > 0 ? -0.18 : 0.35 * Math.abs(p.leftLeg.rotation.x);
        p.leftFoot.rotation.x = THREE.MathUtils.lerp(p.leftFoot.rotation.x, footTarget, 0.2);
      }
      if (p.rightFoot) {
        const footTarget = p.rightLeg.rotation.x > 0 ? -0.18 : 0.35 * Math.abs(p.rightLeg.rotation.x);
        p.rightFoot.rotation.x = THREE.MathUtils.lerp(p.rightFoot.rotation.x, footTarget, 0.2);
      }
      if (p.leftHand) {
        p.leftHand.rotation.x = THREE.MathUtils.lerp(p.leftHand.rotation.x, -p.leftArm.rotation.x * 0.35, 0.2);
      }
      if (p.rightHand) {
        p.rightHand.rotation.x = THREE.MathUtils.lerp(p.rightHand.rotation.x, -p.rightArm.rotation.x * 0.35, 0.2);
      }
    }
  }

  // Umpires static stances and signaling
  if (window.umpireMain && window.umpireMain.parts) {
    const p = window.umpireMain.parts;
    p.leftLeg.rotation.x = 0;
    p.rightLeg.rotation.x = 0;
    
    if (window.umpireSignalType === 'four') {
      // Four runs: wave arms down and cross them horizontally
      const cycle = time * 8;
      p.leftArm.rotation.set(-1.0, 0, -1.0 + Math.sin(cycle) * 0.4);
      p.rightArm.rotation.set(-1.0, 0, 1.0 - Math.sin(cycle) * 0.4);
    } else if (window.umpireSignalType === 'six') {
      // Six runs: raise both arms straight up above head
      p.leftArm.rotation.set(-Math.PI * 0.95, 0, 0.05);
      p.rightArm.rotation.set(-Math.PI * 0.95, 0, -0.05);
    } else if (window.umpireSignalType === 'out') {
      // Out: raise right index finger straight up, left arm down
      p.leftArm.rotation.set(-0.3, 0, -0.1);
      p.rightArm.rotation.set(-Math.PI * 0.9, 0, -0.05);
    } else if (window.umpireSignalType === 'third_umpire') {
      // Third umpire: draw a TV screen shape in front of chest (raise arms bent forward)
      p.leftArm.rotation.set(-1.2, 0.3, -0.2);
      p.rightArm.rotation.set(-1.2, -0.3, 0.2);
    } else {
      // Default idle stance
      p.leftArm.rotation.set(-0.3, 0, -0.1);
      p.rightArm.rotation.set(-0.3, 0, 0.1);
    }
  }

  if (window.umpireSquareLeg && window.umpireSquareLeg.parts) {
    const p = window.umpireSquareLeg.parts;
    p.leftLeg.rotation.x = 0;
    p.rightLeg.rotation.x = 0;
    p.leftArm.rotation.set(-0.3, 0, -0.1);
    p.rightArm.rotation.set(-0.3, 0, 0.1);
  }
}

function animateRunningCycle(bones, time, speedMultiplier = 1.0) {
  if (!bones.hips) return;
  bones.hips.rotation.set(0, 0, 0);
  
  const w = time * 14 * speedMultiplier;
  
  // Thigh swing
  if (bones.leftUpLeg) bones.leftUpLeg.rotation.set(Math.sin(w) * 0.75, 0, 0);
  if (bones.rightUpLeg) bones.rightUpLeg.rotation.set(-Math.sin(w) * 0.75, 0, 0);
  
  // Knee bend
  if (bones.leftLeg) bones.leftLeg.rotation.set(Math.max(0, Math.sin(w + Math.PI)) * 0.65, 0, 0);
  if (bones.rightLeg) bones.rightLeg.rotation.set(Math.max(0, Math.sin(w)) * 0.65, 0, 0);
  
  // Arm swing (swing X, Z remains at 1.4 / -1.4 base)
  if (bones.leftArm) bones.leftArm.rotation.set(-Math.sin(w) * 0.58, 0, 1.4 + 0.12);
  if (bones.rightArm) bones.rightArm.rotation.set(Math.sin(w) * 0.58, 0, -1.4 - 0.12);
  
  // Forearms bent
  if (bones.leftForeArm) bones.leftForeArm.rotation.set(-0.4, 0, 0);
  if (bones.rightForeArm) bones.rightForeArm.rotation.set(-0.4, 0, 0);
  
  // Spine lean forward
  if (bones.spine) bones.spine.rotation.set(0.12, 0, 0);
  if (bones.spine1) bones.spine1.rotation.set(0.08, 0, 0);
  
  // Bat Pivot: hold bat forward and down while running
  if (bones.bat) bones.bat.rotation.set(-0.8, 0.1, 0.2);
}

function setKeeperStance(bones) {
  if (!bones.hips) return;

  // Keeper ready stance with deep crouch
  if (bones.leftUpLeg) bones.leftUpLeg.rotation.x = -0.8;
  if (bones.rightUpLeg) bones.rightUpLeg.rotation.x = -0.8;

  if (bones.leftLeg) bones.leftLeg.rotation.x = 1.3;
  if (bones.rightLeg) bones.rightLeg.rotation.x = 1.3;

  // Lean forward
  if (bones.spine) bones.spine.rotation.x = 0.25;
  if (bones.spine1) bones.spine1.rotation.x = 0.15;

  // Arms forward ready to catch: hang down (z = 1.25 / -1.25) and point forward/up (x = 0.6 / 0.6)
  if (bones.leftArm) bones.leftArm.rotation.set(0.6, 0.2, 1.25);
  if (bones.rightArm) bones.rightArm.rotation.set(0.6, -0.2, -1.25);

  if (bones.leftForeArm) bones.leftForeArm.rotation.set(-0.8, 0, 0);
  if (bones.rightForeArm) bones.rightForeArm.rotation.set(-0.8, 0, 0);

  // Hands inward
  if (bones.leftHand) bones.leftHand.rotation.z = 0.2;
  if (bones.rightHand) bones.rightHand.rotation.z = -0.2;
}

function setBattingGuardPose(bones, isLeft = false) {
  if (!bones.hips) return;

  // Sideways stance: rotate hips by Math.PI / 2 (or -Math.PI / 2 if left-handed)
  bones.hips.rotation.set(0, isLeft ? -Math.PI / 2 : Math.PI / 2, 0);

  // Minimal knee bend
  if (bones.leftUpLeg) bones.leftUpLeg.rotation.set(0.1, 0, 0);
  if (bones.rightUpLeg) bones.rightUpLeg.rotation.set(0.1, 0, 0);
  if (bones.leftLeg) bones.leftLeg.rotation.set(0.15, 0, 0);
  if (bones.rightLeg) bones.rightLeg.rotation.set(0.15, 0, 0);

  // Spine straight relative to hips
  if (bones.spine) bones.spine.rotation.set(0, 0, 0);
  if (bones.spine1) bones.spine1.rotation.set(0, 0, 0);

  if (isLeft) {
    // Lead arm is RightArm, Trail arm is LeftArm
    if (bones.rightArm) bones.rightArm.rotation.set(0.2, 0.1, -1.35);
    if (bones.rightForeArm) bones.rightForeArm.rotation.set(-0.8, 0, 0);

    if (bones.leftArm) bones.leftArm.rotation.set(-0.2, -0.1, 1.35);
    if (bones.leftForeArm) bones.leftForeArm.rotation.set(-0.6, 0, 0);
  } else {
    // Lead arm is LeftArm, Trail arm is RightArm
    if (bones.leftArm) bones.leftArm.rotation.set(0.2, -0.1, 1.35);
    if (bones.leftForeArm) bones.leftForeArm.rotation.set(-0.8, 0, 0);

    if (bones.rightArm) bones.rightArm.rotation.set(-0.2, 0.1, -1.35);
    if (bones.rightForeArm) bones.rightForeArm.rotation.set(-0.6, 0, 0);
  }

  // Bat Pivot - point down and slightly backward
  if (bones.bat) {
    bones.bat.rotation.set(-1.6, 0.1, 0);
  }
}

function updateTossCaptainsAnimation(dt) {
  const THREE = window.THREE;
  if (!window.tossCutsceneActive) return;

  const batsman = window.batsmanMesh;
  const bowler = window.bowlerMesh;

  if (batsman) {
    // Position Home Captain at (-0.6, 0, -10.0)
    batsman.position.set(-0.6, 0, -10.0);
    batsman.rotation.set(0, Math.PI / 2, 0); // facing right
    batsman.visible = true;

    // Pose Home Captain
    if (batsman.isFBX) {
      const bones = getFBXBones(batsman);
      if (bones) {
        if (bones.hips) bones.hips.rotation.set(0, 0, 0);
        if (bones.spine) bones.spine.rotation.set(0.05, 0, 0);
        if (bones.leftUpLeg) bones.leftUpLeg.rotation.set(0, 0, 0);
        if (bones.rightUpLeg) bones.rightUpLeg.rotation.set(0, 0, 0);
        // Put hands relaxed at sides or on waist
        if (bones.leftArm) bones.leftArm.rotation.set(0.3, 0, 0.15);
        if (bones.rightArm) bones.rightArm.rotation.set(0.3, 0, -0.15);
        if (bones.leftForeArm) bones.leftForeArm.rotation.set(-0.2, 0, 0);
        if (bones.rightForeArm) bones.rightForeArm.rotation.set(-0.2, 0, 0);
        // Hide bat blade during coin toss if it's attached
        if (bones.bat) bones.bat.scale.set(0, 0, 0);
      }
    } else if (batsman.parts) {
      const p = batsman.parts;
      if (p.leftLeg) p.leftLeg.rotation.x = 0;
      if (p.rightLeg) p.rightLeg.rotation.x = 0;
      if (p.leftArm) p.leftArm.rotation.set(0.1, 0, 0.1);
      if (p.rightArm) p.rightArm.rotation.set(0.1, 0, -0.1);
      if (p.torso) p.torso.position.y = 0.6;
      if (p.bat) p.bat.scale.set(0, 0, 0);
    }
  }

  if (bowler) {
    // Position Away Captain at (0.6, 0, -10.0)
    bowler.position.set(0.6, 0, -10.0);
    bowler.rotation.set(0, -Math.PI / 2, 0); // facing left
    bowler.visible = true;

    // Calculate dynamic arm rotation based on toss coin state
    const state = window.tossCoinState || 'idle';
    const time = window.tossCoinTime || 0;
    
    // Left arm rotations (X, Y, Z)
    let leftArmRot = { x: 0.2, y: 0.2, z: 0.5 };
    let leftForeArmRot = { x: -0.5, y: 0, z: 0 };
    let simpleLeftArmRot = { x: 0.25, y: 0.2, z: 0.2 };

    if (state === 'idle') {
      // Hold coin forward/up in hand (extended further to match palm sphere at 0.22, 0.93, -10.0)
      leftArmRot = { x: -0.9, y: -0.2, z: 1.25 };
      leftForeArmRot = { x: -0.7, y: 0, z: 0 };
      simpleLeftArmRot = { x: -1.1, y: -0.45, z: 0.4 };
    } else if (state === 'flipping') {
      if (time < 0.25) {
        const t = time / 0.25;
        // Swing arm up
        leftArmRot = {
          x: THREE.MathUtils.lerp(-0.9, -1.9, t),
          y: -0.2,
          z: 1.25
        };
        leftForeArmRot = {
          x: THREE.MathUtils.lerp(-0.7, -0.2, t),
          y: 0,
          z: 0
        };
        simpleLeftArmRot = {
          x: THREE.MathUtils.lerp(-1.1, -2.1, t),
          y: -0.45,
          z: 0.4
        };
      } else {
        const t2 = Math.min(1.0, (time - 0.25) / 0.25);
        // Settle back to relaxed pose
        leftArmRot = {
          x: THREE.MathUtils.lerp(-1.9, 0.2, t2),
          y: THREE.MathUtils.lerp(-0.2, 0.2, t2),
          z: THREE.MathUtils.lerp(1.25, 0.5, t2)
        };
        leftForeArmRot = {
          x: THREE.MathUtils.lerp(-0.2, -0.5, t2),
          y: 0,
          z: 0
        };
        simpleLeftArmRot = {
          x: THREE.MathUtils.lerp(-2.1, 0.25, t2),
          y: THREE.MathUtils.lerp(-0.45, 0.2, t2),
          z: THREE.MathUtils.lerp(0.4, 0.2, t2)
        };
      }
    } else {
      // Relaxed standard pose
      leftArmRot = { x: 0.2, y: 0.2, z: 0.5 };
      leftForeArmRot = { x: -0.5, y: 0, z: 0 };
      simpleLeftArmRot = { x: 0.25, y: 0.2, z: 0.2 };
    }

    // Pose Away Captain
    if (bowler.isFBX) {
      const bones = getFBXBones(bowler);
      if (bones) {
        if (bones.hips) bones.hips.rotation.set(0, 0, 0);
        if (bones.spine) bones.spine.rotation.set(0.05, 0, 0);
        if (bones.leftUpLeg) bones.leftUpLeg.rotation.set(0, 0, 0);
        if (bones.rightUpLeg) bones.rightUpLeg.rotation.set(0, 0, 0);
        
        // Dynamic left arm
        if (bones.leftArm) bones.leftArm.rotation.set(leftArmRot.x, leftArmRot.y, leftArmRot.z);
        if (bones.leftForeArm) bones.leftForeArm.rotation.set(leftForeArmRot.x, leftForeArmRot.y, leftForeArmRot.z);
        
        // Static right arm
        if (bones.rightArm) bones.rightArm.rotation.set(0.2, -0.2, -0.5);
        if (bones.rightForeArm) bones.rightForeArm.rotation.set(-0.5, 0, 0);
        if (bones.bat) bones.bat.scale.set(0, 0, 0);
      }
    } else if (bowler.parts) {
      const p = bowler.parts;
      if (p.leftLeg) p.leftLeg.rotation.x = 0;
      if (p.rightLeg) p.rightLeg.rotation.x = 0;
      
      // Dynamic left arm
      if (p.leftArm) p.leftArm.rotation.set(simpleLeftArmRot.x, simpleLeftArmRot.y, simpleLeftArmRot.z);
      
      // Static right arm
      if (p.rightArm) p.rightArm.rotation.set(0.25, -0.2, -0.2);
      if (p.torso) p.torso.position.y = 0.6;
      if (p.bat) p.bat.scale.set(0, 0, 0);
    }
  }
}

// Expose globally
window.getFBXBones = getFBXBones;
window.updateBowlerAnimation = updateBowlerAnimation;
window.updateBatsmanAnimation = updateBatsmanAnimation;
window.updateOtherPlayers = updateOtherPlayers;
window.animateRunningCycle = animateRunningCycle;
window.setKeeperStance = setKeeperStance;
window.setBattingGuardPose = setBattingGuardPose;
window.updateTossCaptainsAnimation = updateTossCaptainsAnimation;
