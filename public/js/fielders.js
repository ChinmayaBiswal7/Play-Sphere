import { CricketAudio } from '../useCricketAudio.js?v=45';
import { updateFBXFielderAnim } from './fbx_players.js?v=45';

const CANNON = window.CANNON;

function fielderMoveToward(f, target, dt, speed) {
  const THREE = window.THREE;
  const dir = new THREE.Vector3().subVectors(target, f.mesh.position);
  dir.y = 0;
  const dist = dir.length();
  if (dist > 0.08) {
    dir.normalize();
    f.mesh.position.addScaledVector(dir, Math.min(speed * dt, dist));
    const angle = Math.atan2(dir.x, dir.z);
    
    // Smooth Y-rotation only, keeping X and Z strictly at 0 (stands upright!)
    const newY = THREE.MathUtils.lerp(f.mesh.rotation.y, angle, 0.18);
    f.mesh.rotation.set(0, newY, 0);
  }
}

function animateFielderIdle(f, dt) {
  const THREE = window.THREE;
  if (f.isFBX) {
    const getBone = window.FBXPlayers.getBone;
    const bones = {
      leftArm: getBone(f.mesh, 'LeftArm'),
      rightArm: getBone(f.mesh, 'RightArm'),
      leftForeArm: getBone(f.mesh, 'LeftForeArm'),
      rightForeArm: getBone(f.mesh, 'RightForeArm'),
      leftUpLeg: getBone(f.mesh, 'LeftUpLeg'),
      rightUpLeg: getBone(f.mesh, 'RightUpLeg'),
      leftLeg: getBone(f.mesh, 'LeftLeg'),
      rightLeg: getBone(f.mesh, 'RightLeg'),
      hips: getBone(f.mesh, 'Hips'),
      spine: getBone(f.mesh, 'Spine'),
    };
    if (bones.hips) bones.hips.rotation.set(0, 0, 0);
    if (bones.spine) bones.spine.rotation.set(0.05, 0, 0);

    // Arms hang down: Z = 1.4 for LeftArm, Z = -1.4 for RightArm
    if (bones.leftArm) bones.leftArm.rotation.set(0.1, 0, 1.4);
    if (bones.rightArm) bones.rightArm.rotation.set(0.1, 0, -1.4);
    if (bones.leftForeArm) bones.leftForeArm.rotation.set(-0.15, 0, 0);
    if (bones.rightForeArm) bones.rightForeArm.rotation.set(-0.15, 0, 0);

    // Legs straight down
    if (bones.leftUpLeg) bones.leftUpLeg.rotation.set(0, 0, 0);
    if (bones.rightUpLeg) bones.rightUpLeg.rotation.set(0, 0, 0);
    if (bones.leftLeg) bones.leftLeg.rotation.set(0, 0, 0);
    if (bones.rightLeg) bones.rightLeg.rotation.set(0, 0, 0);
    return;
  }
  const p = f.mesh.parts;
  if (!p) return;
  p.torso.rotation.set(0, 0, 0);
  p.torso.position.y = 0.6;
  p.leftArm.rotation.set(0.1, 0, 0.05);
  p.rightArm.rotation.set(0.1, 0, -0.05);
  p.leftForearm.rotation.set(-0.15, 0, 0);
  p.rightForearm.rotation.set(-0.15, 0, 0);
  p.leftLeg.rotation.set(0, 0, 0);
  p.rightLeg.rotation.set(0, 0, 0);
  if (p.leftLowerLeg) p.leftLowerLeg.rotation.x = 0;
  if (p.rightLowerLeg) p.rightLowerLeg.rotation.x = 0;
}

function animateFielderRun(f, dt) {
  const THREE = window.THREE;
  f.walkCycle += dt * 10;
  const w = f.walkCycle;

  if (f.isFBX) {
    const getBone = window.FBXPlayers.getBone;
    const bones = {
      leftArm: getBone(f.mesh, 'LeftArm'),
      rightArm: getBone(f.mesh, 'RightArm'),
      leftForeArm: getBone(f.mesh, 'LeftForeArm'),
      rightForeArm: getBone(f.mesh, 'RightForeArm'),
      leftUpLeg: getBone(f.mesh, 'LeftUpLeg'),
      rightUpLeg: getBone(f.mesh, 'RightUpLeg'),
      leftLeg: getBone(f.mesh, 'LeftLeg'),
      rightLeg: getBone(f.mesh, 'RightLeg'),
      hips: getBone(f.mesh, 'Hips'),
      spine: getBone(f.mesh, 'Spine'),
    };

    if (bones.spine) bones.spine.rotation.set(0.18, 0, Math.sin(w * 0.5) * 0.05);

    // Thigh swing
    if (bones.leftUpLeg) bones.leftUpLeg.rotation.x = Math.sin(w) * 0.85;
    if (bones.rightUpLeg) bones.rightUpLeg.rotation.x = -Math.sin(w) * 0.85;

    // Knee bend
    if (bones.leftLeg) bones.leftLeg.rotation.x = Math.max(0, Math.sin(w + Math.PI)) * 0.72;
    if (bones.rightLeg) bones.rightLeg.rotation.x = Math.max(0, Math.sin(w)) * 0.72;

    // Arm swing
    if (bones.leftArm) bones.leftArm.rotation.set(-Math.sin(w) * 0.58, 0, 1.4 + 0.12);
    if (bones.rightArm) bones.rightArm.rotation.set(Math.sin(w) * 0.58, 0, -1.4 - 0.12);
    if (bones.leftForeArm) bones.leftForeArm.rotation.set(-0.3 + Math.sin(w) * 0.28, 0, 0);
    if (bones.rightForeArm) bones.rightForeArm.rotation.set(-0.3 - Math.sin(w) * 0.28, 0, 0);
    return;
  }
  const p = f.mesh.parts;
  if (!p) return;
  const w2 = f.walkCycle;

  // Thigh swing — full opposing phase
  p.leftLeg.rotation.x  =  Math.sin(w2) * 0.85;
  p.rightLeg.rotation.x = -Math.sin(w2) * 0.85;

  // Knee bend
  if (p.leftLowerLeg)  p.leftLowerLeg.rotation.x  = Math.max(0, Math.sin(w2 + Math.PI)) * 0.72;
  if (p.rightLowerLeg) p.rightLowerLeg.rotation.x = Math.max(0, Math.sin(w2))           * 0.72;

  // Arm swing
  p.leftArm.rotation.x  = -Math.sin(w2) * 0.58;
  p.rightArm.rotation.x =  Math.sin(w2) * 0.58;
  p.leftArm.rotation.z  =  0.12;
  p.rightArm.rotation.z = -0.12;

  // Forearm partial swing
  if (p.leftForearm)  p.leftForearm.rotation.x  =  Math.sin(w2) * 0.28;
  if (p.rightForearm) p.rightForearm.rotation.x = -Math.sin(w2) * 0.28;

  // Wrists and Ankles swing naturally
  if (p.leftHand) p.leftHand.rotation.x = -p.leftArm.rotation.x * 0.35;
  if (p.rightHand) p.rightHand.rotation.x = -p.rightArm.rotation.x * 0.35;

  if (p.leftFoot) {
    const footTarget = p.leftLeg.rotation.x > 0 ? -0.18 : 0.35 * Math.abs(p.leftLeg.rotation.x);
    p.leftFoot.rotation.x = THREE.MathUtils.lerp(p.leftFoot.rotation.x, footTarget, 0.2);
  }
  if (p.rightFoot) {
    const footTarget = p.rightLeg.rotation.x > 0 ? -0.18 : 0.35 * Math.abs(p.rightLeg.rotation.x);
    p.rightFoot.rotation.x = THREE.MathUtils.lerp(p.rightFoot.rotation.x, footTarget, 0.2);
  }

  // Torso: lean forward + very slight hip sway
  p.torso.rotation.x =  0.22;
  p.torso.rotation.z =  Math.sin(w2 * 0.5) * 0.05; // gentle hip sway
  p.torso.rotation.y =  0;
  p.torso.position.y =  0.6 + Math.abs(Math.sin(w2)) * 0.06;
}

function animateFielderCollect(f, dt) {
  const THREE = window.THREE;
  const t = Math.min(f.collectTimer / 0.6, 1);

  if (f.isFBX) {
    const getBone = window.FBXPlayers.getBone;
    const bones = {
      leftArm: getBone(f.mesh, 'LeftArm'),
      rightArm: getBone(f.mesh, 'RightArm'),
      leftForeArm: getBone(f.mesh, 'LeftForeArm'),
      rightForeArm: getBone(f.mesh, 'RightForeArm'),
      leftUpLeg: getBone(f.mesh, 'LeftUpLeg'),
      rightUpLeg: getBone(f.mesh, 'RightUpLeg'),
      leftLeg: getBone(f.mesh, 'LeftLeg'),
      rightLeg: getBone(f.mesh, 'RightLeg'),
      hips: getBone(f.mesh, 'Hips'),
      spine: getBone(f.mesh, 'Spine'),
    };

    if (t < 0.4) {
      const t1 = t / 0.4;
      if (bones.spine) bones.spine.rotation.x = THREE.MathUtils.lerp(0.05, 0.45, t1);
      if (bones.leftUpLeg) bones.leftUpLeg.rotation.x = THREE.MathUtils.lerp(0, 0.55, t1);
      if (bones.rightUpLeg) bones.rightUpLeg.rotation.x = THREE.MathUtils.lerp(0, 0.55, t1);
      if (bones.leftLeg) bones.leftLeg.rotation.x = THREE.MathUtils.lerp(0, 0.65, t1);
      if (bones.rightLeg) bones.rightLeg.rotation.x = THREE.MathUtils.lerp(0, 0.65, t1);

      if (bones.leftArm) bones.leftArm.rotation.set(THREE.MathUtils.lerp(0.1, 1.3, t1), 0, THREE.MathUtils.lerp(1.4, 0.2, t1));
      if (bones.rightArm) bones.rightArm.rotation.set(THREE.MathUtils.lerp(0.1, 1.3, t1), 0, THREE.MathUtils.lerp(-1.4, -0.2, t1));
      if (bones.leftForeArm) bones.leftForeArm.rotation.set(THREE.MathUtils.lerp(-0.15, -0.2, t1), 0, 0);
      if (bones.rightForeArm) bones.rightForeArm.rotation.set(THREE.MathUtils.lerp(-0.15, -0.2, t1), 0, 0);
    } else {
      const t2 = (t - 0.4) / 0.6;
      if (bones.spine) bones.spine.rotation.x = THREE.MathUtils.lerp(0.45, 0.05, t2);
      if (bones.leftUpLeg) bones.leftUpLeg.rotation.x = THREE.MathUtils.lerp(0.55, 0, t2);
      if (bones.rightUpLeg) bones.rightUpLeg.rotation.x = THREE.MathUtils.lerp(0.55, 0, t2);
      if (bones.leftLeg) bones.leftLeg.rotation.x = THREE.MathUtils.lerp(0.65, 0, t2);
      if (bones.rightLeg) bones.rightLeg.rotation.x = THREE.MathUtils.lerp(0.65, 0, t2);

      if (bones.leftArm) bones.leftArm.rotation.set(THREE.MathUtils.lerp(1.3, 0.1, t2), 0, THREE.MathUtils.lerp(0.2, 1.4, t2));
      if (bones.rightArm) bones.rightArm.rotation.set(THREE.MathUtils.lerp(1.3, 0.1, t2), 0, THREE.MathUtils.lerp(-0.2, -1.4, t2));
      if (bones.leftForeArm) bones.leftForeArm.rotation.set(THREE.MathUtils.lerp(-0.2, -0.15, t2), 0, 0);
      if (bones.rightForeArm) bones.rightForeArm.rotation.set(THREE.MathUtils.lerp(-0.2, -0.15, t2), 0, 0);
    }
    return;
  }
  const p = f.mesh.parts;
  if (!p) return;
  if (t < 0.4) {
    const t1 = t / 0.4;
    p.torso.rotation.x    = THREE.MathUtils.lerp(0.15, 0.75, t1); // Deep posture crouch
    p.torso.position.y    = THREE.MathUtils.lerp(0.6,  0.22, t1); // bend knees/body down
    p.leftArm.rotation.x  = THREE.MathUtils.lerp(0,     1.3,  t1);
    p.rightArm.rotation.x = THREE.MathUtils.lerp(0,     1.3,  t1);
    p.leftArm.rotation.z  = -0.15;
    p.rightArm.rotation.z =  0.15;
    p.leftLeg.rotation.x  = THREE.MathUtils.lerp(0, 0.55, t1);
    p.rightLeg.rotation.x = THREE.MathUtils.lerp(0, 0.55, t1);

    if (p.leftLowerLeg) p.leftLowerLeg.rotation.x = THREE.MathUtils.lerp(0, -0.65, t1);
    if (p.rightLowerLeg) p.rightLowerLeg.rotation.x = THREE.MathUtils.lerp(0, -0.65, t1);
  } else {
    const t2 = (t - 0.4) / 0.6;
    p.torso.rotation.x    = THREE.MathUtils.lerp(0.75, 0.1, t2);
    p.torso.position.y    = THREE.MathUtils.lerp(0.22, 0.6, t2);
    p.leftArm.rotation.x  = THREE.MathUtils.lerp(1.3,  0.3, t2);
    p.rightArm.rotation.x = THREE.MathUtils.lerp(1.3,  0.3, t2);
    p.leftLeg.rotation.x  = THREE.MathUtils.lerp(0.55, 0, t2);
    p.rightLeg.rotation.x = THREE.MathUtils.lerp(0.55, 0, t2);

    if (p.leftLowerLeg) p.leftLowerLeg.rotation.x = THREE.MathUtils.lerp(-0.65, 0, t2);
    if (p.rightLowerLeg) p.rightLowerLeg.rotation.x = THREE.MathUtils.lerp(-0.65, 0, t2);
  }
}

function animateFielderThrow(f, dt) {
  const THREE = window.THREE;
  const WICKET_Z = window.WICKET_Z;
  const t = Math.min(f.throwTimer / 0.5, 1);

  if (f.isFBX) {
    const dir = new THREE.Vector3(0, 0, WICKET_Z).sub(f.mesh.position);
    dir.y = 0;
    if (dir.length() > 0.1) {
      const ang = Math.atan2(dir.x, dir.z);
      const newY = THREE.MathUtils.lerp(f.mesh.rotation.y, ang, 0.2);
      f.mesh.rotation.set(0, newY, 0);
    }

    const getBone = window.FBXPlayers.getBone;
    const bones = {
      leftArm: getBone(f.mesh, 'LeftArm'),
      rightArm: getBone(f.mesh, 'RightArm'),
      leftForeArm: getBone(f.mesh, 'LeftForeArm'),
      rightForeArm: getBone(f.mesh, 'RightForeArm'),
      leftUpLeg: getBone(f.mesh, 'LeftUpLeg'),
      rightUpLeg: getBone(f.mesh, 'RightUpLeg'),
      leftLeg: getBone(f.mesh, 'LeftLeg'),
      rightLeg: getBone(f.mesh, 'RightLeg'),
      hips: getBone(f.mesh, 'Hips'),
      spine: getBone(f.mesh, 'Spine'),
    };

    if (t < 0.3) {
      const t1 = t / 0.3;
      if (bones.rightArm) bones.rightArm.rotation.set(THREE.MathUtils.lerp(0.3, -2.5, t1), 0, THREE.MathUtils.lerp(-1.4, -0.5, t1));
      if (bones.leftArm) bones.leftArm.rotation.set(THREE.MathUtils.lerp(0.3, 0.9, t1), 0, THREE.MathUtils.lerp(1.4, 0.5, t1));
      if (bones.spine) {
        bones.spine.rotation.y = THREE.MathUtils.lerp(0, -0.5, t1);
        bones.spine.rotation.x = THREE.MathUtils.lerp(0.1, -0.15, t1);
      }
      if (bones.leftUpLeg) bones.leftUpLeg.rotation.x = THREE.MathUtils.lerp(0, 0.4, t1);
      if (bones.rightUpLeg) bones.rightUpLeg.rotation.x = THREE.MathUtils.lerp(0, -0.2, t1);
      if (bones.leftLeg) bones.leftLeg.rotation.x = THREE.MathUtils.lerp(0, -0.25, t1);
      if (bones.rightLeg) bones.rightLeg.rotation.x = THREE.MathUtils.lerp(0, -0.12, t1);
    } else {
      const t2 = (t - 0.3) / 0.7;
      if (bones.rightArm) bones.rightArm.rotation.set(THREE.MathUtils.lerp(-2.5, 1.8, t2), 0, THREE.MathUtils.lerp(-0.5, -1.2, t2));
      if (bones.leftArm) bones.leftArm.rotation.set(THREE.MathUtils.lerp(0.9, -0.2, t2), 0, THREE.MathUtils.lerp(0.5, 1.4, t2));
      if (bones.spine) {
        bones.spine.rotation.y = THREE.MathUtils.lerp(-0.5, 0.7, t2);
        bones.spine.rotation.x = THREE.MathUtils.lerp(-0.15, 0.45, t2);
      }
      if (bones.leftUpLeg) bones.leftUpLeg.rotation.x = THREE.MathUtils.lerp(0.4, 0, t2);
      if (bones.rightUpLeg) bones.rightUpLeg.rotation.x = THREE.MathUtils.lerp(-0.2, 0, t2);
      if (bones.leftLeg) bones.leftLeg.rotation.x = THREE.MathUtils.lerp(-0.25, 0, t2);
      if (bones.rightLeg) bones.rightLeg.rotation.x = THREE.MathUtils.lerp(-0.12, 0, t2);
    }
    return;
  }
  const p = f.mesh.parts;
  if (!p) return;
  // Face stumps
  const dir = new THREE.Vector3(0, 0, WICKET_Z).sub(f.mesh.position);
  dir.y = 0;
  if (dir.length() > 0.1) {
    const ang = Math.atan2(dir.x, dir.z);
    const newY = THREE.MathUtils.lerp(f.mesh.rotation.y, ang, 0.2);
    f.mesh.rotation.set(0, newY, 0);
  }
  const t3 = Math.min(f.throwTimer / 0.5, 1);
  if (t3 < 0.3) {
    const t1 = t3 / 0.3;
    // Wind-up: arm way back, torso rotates and leans back, plant left leg forward
    p.rightArm.rotation.x = THREE.MathUtils.lerp( 0.3, -2.5, t1);  // deeper wind-up
    p.rightArm.rotation.z = THREE.MathUtils.lerp( 0,   -0.5, t1);
    p.leftArm.rotation.x  = THREE.MathUtils.lerp( 0.3,  0.9, t1);
    p.torso.rotation.y    = THREE.MathUtils.lerp( 0,   -0.5, t1);  // hip rotation wind-up
    p.torso.rotation.x    = THREE.MathUtils.lerp( 0.1, -0.15, t1); // lean back
    p.leftLeg.rotation.x  = THREE.MathUtils.lerp( 0,    0.4, t1);  // plant left foot
    p.rightLeg.rotation.x = THREE.MathUtils.lerp( 0,   -0.2, t1);

    if (p.leftLowerLeg)  p.leftLowerLeg.rotation.x  = THREE.MathUtils.lerp(0, -0.25, t1);
    if (p.rightLowerLeg) p.rightLowerLeg.rotation.x = THREE.MathUtils.lerp(0, -0.12, t1);
  } else {
    const t2 = (t3 - 0.3) / 0.7;
    // Release: arm whips forward and across, hips rotate through, torso drives forward
    p.rightArm.rotation.x = THREE.MathUtils.lerp(-2.5,  1.8, t2); // longer follow-through
    p.rightArm.rotation.z = THREE.MathUtils.lerp(-0.5,  0.2, t2);
    p.torso.rotation.y    = THREE.MathUtils.lerp(-0.5,  0.7, t2); // hip drives through
    p.torso.rotation.x    = THREE.MathUtils.lerp(-0.15, 0.45, t2); // lean into throw
    p.leftArm.rotation.x  = THREE.MathUtils.lerp( 0.9, -0.2, t2);

    p.leftLeg.rotation.x  = THREE.MathUtils.lerp( 0.4,  0,   t2);
    p.rightLeg.rotation.x = THREE.MathUtils.lerp(-0.2,  0,   t2);

    if (p.leftLowerLeg)  p.leftLowerLeg.rotation.x  = THREE.MathUtils.lerp(-0.25, 0, t2);
    if (p.rightLowerLeg) p.rightLowerLeg.rotation.x = THREE.MathUtils.lerp(-0.12, 0, t2);
  }
}

export function resetFielderPose(f) {
  const THREE = window.THREE;
  if (f.isFBX) {
    const getBone = window.FBXPlayers.getBone;
    const bones = {
      leftArm: getBone(f.mesh, 'LeftArm'),
      rightArm: getBone(f.mesh, 'RightArm'),
      leftForeArm: getBone(f.mesh, 'LeftForeArm'),
      rightForeArm: getBone(f.mesh, 'RightForeArm'),
      leftUpLeg: getBone(f.mesh, 'LeftUpLeg'),
      rightUpLeg: getBone(f.mesh, 'RightUpLeg'),
      leftLeg: getBone(f.mesh, 'LeftLeg'),
      rightLeg: getBone(f.mesh, 'RightLeg'),
      hips: getBone(f.mesh, 'Hips'),
      spine: getBone(f.mesh, 'Spine'),
    };
    if (bones.hips) bones.hips.rotation.set(0, 0, 0);
    if (bones.spine) bones.spine.rotation.set(0, 0, 0);
    if (bones.leftUpLeg) bones.leftUpLeg.rotation.set(0, 0, 0);
    if (bones.rightUpLeg) bones.rightUpLeg.rotation.set(0, 0, 0);
    if (bones.leftLeg) bones.leftLeg.rotation.set(0, 0, 0);
    if (bones.rightLeg) bones.rightLeg.rotation.set(0, 0, 0);

    // Arms hang down: Z = 1.4 for LeftArm, Z = -1.4 for RightArm
    if (bones.leftArm) bones.leftArm.rotation.set(0, 0, 1.4);
    if (bones.rightArm) bones.rightArm.rotation.set(0, 0, -1.4);
    if (bones.leftForeArm) bones.leftForeArm.rotation.set(0, 0, 0);
    if (bones.rightForeArm) bones.rightForeArm.rotation.set(0, 0, 0);
    return;
  }
  const p = f.mesh.parts;
  if (!p) return;
  
  p.torso.rotation.set(0, 0, 0);
  p.torso.position.y = 0.6;
  
  p.leftLeg.rotation.set(0, 0, 0);
  p.leftLeg.position.y = 0.6;
  
  p.rightLeg.rotation.set(0, 0, 0);
  p.rightLeg.position.y = 0.6;
  
  p.leftArm.rotation.set(0, 0, 0);
  p.rightArm.rotation.set(0, 0, 0);
  
  p.leftForearm.rotation.set(0, 0, 0);
  p.rightForearm.rotation.set(0, 0, 0);

  if (p.leftLowerLeg) p.leftLowerLeg.rotation.set(0, 0, 0);
  if (p.rightLowerLeg) p.rightLowerLeg.rotation.set(0, 0, 0);
}

export function spawnReturnBall(fromPos, toPos) {
  if (typeof window.triggerReturnThrow === 'function') {
    window.triggerReturnThrow(fromPos, toPos);
    return;
  }

  const THREE = window.THREE;
  const MATCH = window.MATCH;

  console.log('[ReturnBall] Performing instant synchronous return ball and player reset.');

  // Restore match ball visibility and dynamic physics state at the stumps/keeper target
  if (window.ballMesh) {
    window.ballMesh.visible = true;
  }
  if (window.ballBody) {
    window.ballBody.type = CANNON.Body.DYNAMIC;
    window.ballBody.mass = 0.16;
    window.ballBody.updateMassProperties();
    window.ballBody.position.copy(toPos);
    window.ballBody.velocity.set(0, 0, 0);
    window.ballBody.angularVelocity.set(0, 0, 0);
  }

  // Reset all fielders to starting positions and FSM states instantly
  if (window.fielders) {
    window.fielders.forEach(f => {
      if (!f.mesh) return;
      f.mesh.position.copy(f.startPos || f.homePosition);
      f.mesh.position.y = 0;
      // Face pitch center Z = -10
      const dirCenter = new THREE.Vector3(0, 0, -10).sub(f.mesh.position);
      const angleCenter = Math.atan2(dirCenter.x, dirCenter.z);
      f.mesh.rotation.set(0, angleCenter, 0);
      if (f.mesh.parts && !f.isFBX) {
        if (f.mesh.parts.leftLeg) f.mesh.parts.leftLeg.rotation.x = 0;
        if (f.mesh.parts.rightLeg) f.mesh.parts.rightLeg.rotation.x = 0;
        if (f.mesh.parts.leftArm) f.mesh.parts.leftArm.rotation.set(0.1, 0, 0);
        if (f.mesh.parts.rightArm) f.mesh.parts.rightArm.rotation.set(0.1, 0, 0);
      }
      f.state = 'idle';
      f.hasBall = false;
      f.hasTriggeredEvent = false;
    });
  }

  // Run-out check
  const isRunOut = !MATCH.isOutThisBall && ((window.runningState === 'called' && window.runProgress < 0.88) || (window.runningState === 'cancelled'));
  
  if (isRunOut) {
    // Determine who was run out before we reset runningState and batsman positions!
    let dismissedIndex = MATCH.strikerIndex; // default
    if (window.runningState === 'called') {
      if (toPos.z === 0.0) { // throw to striker's end (WICKET_Z is 0.0)
        dismissedIndex = 1 - MATCH.strikerIndex; // non-striker is running to striker's end
      } else { // throw to bowler's end (-22.4)
        dismissedIndex = MATCH.strikerIndex; // striker is running to bowler's end
      }
    } else if (window.runningState === 'cancelled') {
      if (toPos.z === 0.0) { // throw to striker's end (WICKET_Z is 0.0)
        dismissedIndex = MATCH.strikerIndex; // striker is returning to striker's end
      } else { // throw to bowler's end (-22.4)
        dismissedIndex = 1 - MATCH.strikerIndex; // non-striker is returning to bowler's end
      }
    }
    window.MATCH.dismissedBatsmanIndex = dismissedIndex;
    console.log(`[RunOut] Dismissed batsman index determined as: ${dismissedIndex} (${window.MATCH.batters[dismissedIndex] ? window.MATCH.batters[dismissedIndex].name : 'unknown'})`);
  }

  // Resets that should happen in both wicket and safe play outcomes
  window.runningState = 'idle';
  window.runProgress = 0;
  window.MATCH.pendingRun = false;

  if (window.batsmanMesh) {
    window.batsmanMesh.position.z = window.BATSMAN_CREASE_Z;
  }
  if (window.nonStrikerMesh) {
    window.nonStrikerMesh.position.z = window.nonStrikerStartZ;
  }

  if (isRunOut) {
    MATCH.isOutThisBall = true;
    MATCH.outType = 'RUN OUT';
    if (typeof window.snapBatsmenToCreases === 'function') {
      window.snapBatsmenToCreases();
    }

    if (window.updateLastBallHUD) {
      window.updateLastBallHUD(
        window.deliverySpeedKmh, 
        `OUT (RUN OUT)`, 
        window.lastShotName
      );
    }

    window.queueCelebration(
      'out',
      'RUN OUT!',
      'OUT',
      'RUN OUT!',
      'OUT!',
      'out',
      () => {
        if (window.CricketAudio && window.CricketAudio.playCheer) {
          window.CricketAudio.playCheer(false);
        }
      }
    );
  } else {
    const outcomeText = window.MATCH.runsThisBall > 0 ? `${window.MATCH.runsThisBall} RUNS` : 'DOT BALL';
    window.ballSettled = true;

    if (window.updateLastBallHUD) {
      window.updateLastBallHUD(
        window.deliverySpeedKmh, 
        `${outcomeText} (${window.lastHudTiming || 'PLAYED'})`, 
        window.lastShotName
      );
    }

    window.queueCelebration(
      'field',
      'FIELDED',
      outcomeText,
      outcomeText,
      'GOOD EFFORT',
      'good',
      () => {
        if (window.CricketAudio && window.CricketAudio.playCheer) {
          window.CricketAudio.playCheer(false);
        }
      }
    );
  }
}

export function getBallLandingSpot() {
  const THREE = window.THREE;
  const ballBody = window.ballBody;
  if (!ballBody) return new THREE.Vector3(0, 0.08, 0);

  const x0 = ballBody.position.x;
  const y0 = ballBody.position.y;
  const z0 = ballBody.position.z;
  const vx = ballBody.velocity.x;
  const vy = ballBody.velocity.y;
  const vz = ballBody.velocity.z;

  const g = 9.82;
  const groundY = 0.08;

  // If the ball is already very close to the ground, or moving slowly, return current position
  if (y0 <= groundY + 0.1 || (Math.abs(vy) < 0.2 && y0 < 1.0)) {
    return new THREE.Vector3(x0, groundY, z0);
  }

  // Solve for t when ball Y hits groundY: y0 + vy*t - 0.5*g*t^2 = groundY
  // 0.5 * g * t^2 - vy * t + (groundY - y0) = 0
  const a = 0.5 * g;
  const b = -vy;
  const c = groundY - y0;

  const disc = b * b - 4 * a * c;
  if (disc < 0) {
    return new THREE.Vector3(x0, groundY, z0);
  }

  const sqrtDisc = Math.sqrt(disc);
  // Two roots for when the ball reaches groundY. Pick the SMALLEST
  // non-negative one — that is the first ground crossing. Using the larger
  // root while the ball is still ascending predicted a landing point far
  // beyond the real first bounce, sending the closest fielder the wrong way.
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);
  let t;
  if (t1 >= 0) t = t1;
  else if (t2 >= 0) t = t2;
  else return new THREE.Vector3(x0, groundY, z0);
  t = Math.min(t, 6); // Clamp flight time to prevent crazy predictions far outside

  const xLanding = x0 + vx * t;
  const zLanding = z0 + vz * t;

  return new THREE.Vector3(xLanding, groundY, zLanding);
}

export function updateFielders(dt) {
  try {
    if (window.tossCutsceneActive || window.entranceCutsceneActive || window.wicketCutsceneActive || window.drsActive || window.runoutActive) return;
    const THREE = window.THREE;
    const MATCH = window.MATCH;
    const STATES = window.STATES;
    const gameState = window.gameState;
    const ballBody = window.ballBody;
    const fielders = window.fielders;
    const WICKET_Z = window.WICKET_Z;

    const isActive = (gameState === STATES.HIT || gameState === STATES.RUNNING);

// ── TOP GUARD ──────────────────────────────────────────────────────────────
   // When the ball is dead OR the game is not in an active fielding state,
   // force non-animating fielders to idle.
   // CRITICAL: fielders in catching/collecting/throwing/returning MUST continue
   // running even after ballDead=true so their timer can fire queueCelebration().
   // Once wicket cutscene starts, fielders are animated by updateWicketCutscene instead.
   const hasCatchInProgress = fielders.some(f =>
     f.state === 'catching' || f.state === 'collecting' ||
     f.state === 'throwing' || f.state === 'returning' || f.state === 'diving'
   );

   // If catch is in progress but we're already in wicket cutscene, let the cutscene handle it
   const inWicketCutscene = window.wicketCutsceneActive === true;

   // Only skip early return if we have active catch animations in progress that haven't been processed
   if (MATCH.ballDead && !hasCatchInProgress && !inWicketCutscene) {
      fielders.forEach(f => {
        if (f.state !== 'idle') {
          f.state = 'idle';
          resetFielderPose(f);
        }
        animateFielderIdle(f, dt);
        const dirCenter = new THREE.Vector3(0, 0, -10).sub(f.mesh.position);
        const angleCenter = Math.atan2(dirCenter.x, dirCenter.z);
        f.mesh.rotation.set(0, angleCenter, 0);
      });
      return;
   }

   // If we're in wicket cutscene, skip fielder FSM (cutscene handles fielder positions)
   if (inWicketCutscene) {
      return;
   }

   const ballPos = new THREE.Vector3(ballBody.position.x, ballBody.position.y, ballBody.position.z);
   const distFromCentre = Math.sqrt(ballPos.x * ballPos.x + (ballPos.z + 10) * (ballPos.z + 10));

   // Boundary / 6 check — visual rope radius is 54.9. Trigger at 54 so fielder gets one last dive chance.
   if (isActive) {

     if (distFromCentre >= 54 && !window.fielderRetrieved) {
       window.fielderRetrieved = true;
       MATCH.ballDead = true; // Stop the game loop and stop fielders
       console.log('BOUNDARY - distFromCentre:', distFromCentre.toFixed(1), 'bounced:', window.MATCH.ballBouncedSinceHit);

       // Stop and freeze ball exactly at boundary rope
       if (window.ballBody) {
         // Clamp ball to the boundary circle (radius 54.9 from pitch centre z=-10)
         const cx = ballPos.x, cz = ballPos.z + 10;
         const norm = 54.9 / distFromCentre;
         window.ballBody.position.x = cx * norm;
         window.ballBody.position.z = cz * norm - 10;
         window.ballBody.position.y = 0.06;
         window.ballBody.velocity.set(0, 0, 0);
         window.ballBody.angularVelocity.set(0, 0, 0);
         if (window.CANNON && window.CANNON.Body) {
           window.ballBody.type = window.CANNON.Body.STATIC;
         } else {
           window.ballBody.type = 2;
         }
       }
       
       // Cancel out status since ball hit boundary!
       MATCH.isOutThisBall = false;
       MATCH.outType = '';

       // Reset runsThisBall before assigning boundary runs
       window.MATCH.runsThisBall = 0;
       // Reset processBallResult guard so boundary scoring works cleanly
       window.MATCH.ballResultProcessed = false;
       window.MATCH.pendingRun = false;
       window.runningState = 'idle';
       window.runProgress = 0;

       // Reset creases and striker index to original ends
       window.BATSMAN_CREASE_Z = 0.0;
       window.nonStrikerStartZ = -21.2;
       if (window.MATCH.strikerIndex !== window.MATCH.deliveryStrikerIndex) {
         window.MATCH.strikerIndex = window.MATCH.deliveryStrikerIndex;
         if (typeof window.swapBattingEnds === 'function') {
           window.swapBattingEnds();
         }
       }

       // Snap batsmen back to creases immediately
       if (window.batsmanMesh) {
         window.batsmanMesh.position.z = window.BATSMAN_CREASE_Z;
       }
       if (window.nonStrikerMesh) {
         window.nonStrikerMesh.position.z = window.nonStrikerStartZ;
       }

       // Set ballSettled so celebration cards can display
       window.ballSettled = true;

       const isSix = !window.MATCH.ballBouncedSinceHit;
       if (isSix) {
         MATCH.runsThisBall = 6;
         if (window.MATCH.userIsBatting && typeof window.unlockAchievement === 'function') {
           window.unlockAchievement('first_boundary');
           window.unlockAchievement('sixer_master');
         }
         if (window.updateLastBallHUD) {
           window.updateLastBallHUD(
             window.deliverySpeedKmh, 
             `6 RUNS (${window.lastHudTiming || 'PLAYED'})`, 
             window.lastShotName
           );
         }
         window.queueCelebration(
           'six',
           'SIX!',
           'MAXIMUM SHOT',
           'INTO THE STANDS!',
           '6 RUNS!',
           'perfect',
           () => {
             if (window.CricketAudio && window.CricketAudio.playCheer) {
               window.CricketAudio.playCheer(true);
             }
           }
         );
       } else {
         MATCH.runsThisBall = 4;
         if (window.updateLastBallHUD) {
           window.updateLastBallHUD(
             window.deliverySpeedKmh, 
             `4 RUNS (${window.lastHudTiming || 'PLAYED'})`, 
             window.lastShotName
           );
         }
         window.queueCelebration(
           'four',
           'FOUR!',
           'PAST THE ROPE',
           'PAST THE ROPE!',
           '4 RUNS!',
           'good',
           () => {
             if (window.CricketAudio && window.CricketAudio.playCheer) {
               window.CricketAudio.playCheer(false);
             }
           }
         );
       }
       return;
     }


    // Bounced/dropped catch check:
    // If the ball is in flight, was predicted as out, and hits the ground (y <= 0.12) or bounces before being caught,
    // we cancel the catch status so it becomes a normal fielded ball!
     if (window.MATCH.catchPossible) {
       if (window.MATCH.ballBouncedSinceHit || ballBody.position.y <= 0.12) {
         window.MATCH.catchPossible = false;
         if (window.MATCH.outType === 'CAUGHT') {
           window.MATCH.isOutThisBall = false;
           window.MATCH.outType = '';
         }
         if (window.catchBallDeadTimer) {
           clearTimeout(window.catchBallDeadTimer);
           window.catchBallDeadTimer = null;
         }
         window.MATCH.ballDead = false;
         console.log("🏀 Catch dropped / bounced! Cleared catchBallDeadTimer.");
       }
     }

  }

  fielders.forEach(f => {
    if (!f || !f.mesh) return;
    if (f.diveCooldown > 0) {
      f.diveCooldown -= dt;
    }
    switch (f.state) {

      case 'idle':
        animateFielderIdle(f, dt);
        // Ensure upright yaw rotation facing the pitch
        const dirCenter = new THREE.Vector3(0, 0, -10).sub(f.mesh.position);
        const angleCenter = Math.atan2(dirCenter.x, dirCenter.z);
        f.mesh.rotation.set(0, angleCenter, 0);

        if (isActive) {
          if (f.isClosest) {
            console.log(`[FieldingFSM] Fielder ${f.id || 'unknown'} starting chase towards target position:`, f.targetPos);
            f.targetPos = ballPos.clone();
            resetFielderPose(f);
            f.state = 'running';
            f.isClosest = false;
          }
        }

        break;

      case 'running': {
        const landingSpot = getBallLandingSpot();
        f.targetPos.copy(landingSpot);
        
        const distToLandingHoriz = Math.sqrt(
          (f.mesh.position.x - landingSpot.x) * (f.mesh.position.x - landingSpot.x) +
          (f.mesh.position.z - landingSpot.z) * (f.mesh.position.z - landingSpot.z)
        );

        const speed = 7.5; // fielding run speed (adjusted for larger ground ~75m)
        const distToBall = f.mesh.position.distanceTo(ballPos);
        const ballDistHoriz = Math.sqrt(
          (f.mesh.position.x - ballPos.x) * (f.mesh.position.x - ballPos.x) +
          (f.mesh.position.z - ballPos.z) * (f.mesh.position.z - ballPos.z)
        );

        // Safety Dive check (Task 7): Ball is low or catch is possible, within reach, and not held
        const isCatchOpportunity = (window.MATCH.catchPossible && !window.MATCH.ballBouncedSinceHit);
        const shouldDive = (distToBall < 3.2 && distToBall >= 0.85 && !f.hasBall) && 
                           (ballPos.y < 1.8 || isCatchOpportunity) &&
                           (!f.diveCooldown || f.diveCooldown <= 0);
        if (shouldDive) {
          resetFielderPose(f);
          f.state = 'diving';
          f.collectTimer = 0;
          f.hasTriggeredEvent = false;
          break;
        }

        // Keep running at full speed towards target position (no prepares/sluggishness)
        animateFielderRun(f, dt);
        fielderMoveToward(f, f.targetPos, dt, speed);

        if (window.MATCH.catchPossible && !window.MATCH.ballBouncedSinceHit) {
           // Horizontal landing spot/ball proximity check (avoids 3D Y-height distance penalty)
           const isFielderReady = (ballDistHoriz < 1.8 || distToLandingHoriz < 1.8);
           const isBallAtCatchableHeight = (ballPos.y < 4.8); // trigger timing circle when ball drops below 4.8m height
           
           if (isFielderReady && isBallAtCatchableHeight) {
              window.MATCH.catchPossible = false; // consume immediately to prevent double trigger

              const isUserBowling = window.MATCH && !window.MATCH.userIsBatting;

              if (isUserBowling && typeof window.startCatchQTE === 'function') {
                window.startCatchQTE((isSuccess) => {
                  if (isSuccess) {
                    resetFielderPose(f);
                    f.state = 'catching';
                    f.collectTimer = 0;
                    f.hasTriggeredEvent = false;

                    window.MATCH.isOutThisBall = true;
                    window.MATCH.outType = 'CAUGHT'; // Catch physically taken now!
                    if (typeof window.unlockAchievement === 'function') {
                      window.unlockAchievement('spectacular_catch');
                    }

                    if (window.catchBallDeadTimer) clearTimeout(window.catchBallDeadTimer);
                    window.catchBallDeadTimer = setTimeout(() => {
                      window.MATCH.ballDead = true;
                      window.catchBallDeadTimer = null;
                    }, 1200);

                    window.MATCH.ballResultProcessed = false;
                  } else {
                    // Catch dropped: deflect the ball and continue play
                    window.MATCH.ballBouncedSinceHit = true;
                    if (window.ballBody) {
                      window.ballBody.type = window.CANNON.Body.DYNAMIC;
                      window.ballBody.mass = 0.16;
                      window.ballBody.updateMassProperties();
                      window.ballBody.velocity.set((Math.random() - 0.5) * 3.0, 2.5, (Math.random() - 0.5) * 3.0);
                    }
                    if (window.ballMesh) window.ballMesh.visible = true;

                    resetFielderPose(f);
                    f.state = 'collecting';
                    f.collectTimer = 0;
                    f.hasTriggeredEvent = false;

                    if (window.showFeedback) {
                      window.showFeedback('CATCH DROPPED!', 'RUN OUT ACTIVE', 'missed');
                    }
                    if (window.CricketAudio && window.CricketAudio.playGasp) {
                      window.CricketAudio.playGasp();
                    }
                  }
                });
              } else {
                // AI fielding (or fallback): automatic resolution (80% success chance)
                const aiCatchSuccess = isUserBowling ? true : (Math.random() < 0.8);
                
                if (aiCatchSuccess) {
                  resetFielderPose(f);
                  f.state = 'catching';
                  f.collectTimer = 0;
                  f.hasTriggeredEvent = false;

                  window.MATCH.isOutThisBall = true;
                  window.MATCH.outType = 'CAUGHT';

                  if (window.catchBallDeadTimer) clearTimeout(window.catchBallDeadTimer);
                  window.catchBallDeadTimer = setTimeout(() => {
                    window.MATCH.ballDead = true;
                    window.catchBallDeadTimer = null;
                  }, 1200);

                  window.MATCH.ballResultProcessed = false;
                } else {
                  // AI dropped the catch!
                  window.MATCH.ballBouncedSinceHit = true;
                  if (window.ballBody) {
                    window.ballBody.type = window.CANNON.Body.DYNAMIC;
                    window.ballBody.mass = 0.16;
                    window.ballBody.updateMassProperties();
                    window.ballBody.velocity.set((Math.random() - 0.5) * 3.0, 2.5, (Math.random() - 0.5) * 3.0);
                  }
                  if (window.ballMesh) window.ballMesh.visible = true;

                  resetFielderPose(f);
                  f.state = 'collecting';
                  f.collectTimer = 0;
                  f.hasTriggeredEvent = false;

                  if (window.showFeedback) {
                    window.showFeedback('CATCH DROPPED!', 'AI MISSED THE CATCH', 'missed');
                  }
                  if (window.CricketAudio && window.CricketAudio.playGasp) {
                    window.CricketAudio.playGasp();
                  }
                }
              }
           }
         } else {
           // Normal field pickup: generous radius so fielder doesn't run through the ball
           if (distToBall < 0.85 || (ballDistHoriz < 0.85 && ballPos.y < 0.35)) {
             resetFielderPose(f); // Clean transition to collect pose
             f.state = 'collecting';
             f.collectTimer = 0;
             f.hasTriggeredEvent = false;
             // Freeze ball immediately to prevent it from rolling away during collection animation
             if (window.ballMesh) window.ballMesh.visible = false;
             if (window.ballBody) {
               window.ballBody.velocity.set(0, 0, 0);
               window.ballBody.angularVelocity.set(0, 0, 0);
               if (window.CANNON && window.CANNON.Body) {
                 window.ballBody.type = window.CANNON.Body.STATIC;
               }
             }
             f.hasBall = true;
           }
         }
         break;
      }

      case 'diving': {
        f.collectTimer += dt; // use collectTimer as dive duration
        const distToBall = f.mesh.position.distanceTo(ballPos);

        // Lunge/move fast toward the ball
        const speed = 10.5;
        fielderMoveToward(f, ballPos, dt, speed * 1.5);
        
        // Face the ball
        const dirBall = ballPos.clone().sub(f.mesh.position);
        const angleBall = Math.atan2(dirBall.x, dirBall.z);
        f.mesh.rotation.set(0, angleBall, 0);

        // Slide visual mesh down to slide along grass (avoid sinking into ground)
        f.mesh.position.y = (f.isFBX ? 0.0 : -0.05);

        if (f.isFBX) {
          // FBX: use dive/slide animation from AnimationMixer
          updateFBXFielderAnim(f);
        } else {
          // Procedural: apply dive pose
          const p = f.mesh.parts;
          if (p) {
            p.torso.rotation.x = 1.25; // Lean forward heavily
            p.leftArm.rotation.x = -1.8;
            p.rightArm.rotation.x = -1.8;
            p.leftArm.rotation.z = -0.15;
            p.rightArm.rotation.z = 0.15;
            p.leftForearm.rotation.x = -0.2;
            p.rightForearm.rotation.x = -0.2;
            if (p.leftLeg) p.leftLeg.rotation.x = 0.5;
            if (p.rightLeg) p.rightLeg.rotation.x = -0.5;
          }
        }

        // Grab the ball mid-dive if close
        if (distToBall < 1.25 && !f.hasBall) {
          f.hasBall = true;
          // Hide ball mesh, it's in the fielder's hands during the slide
          if (window.ballMesh) window.ballMesh.visible = false;
          if (window.ballBody) {
            window.ballBody.velocity.set(0, 0, 0);
            window.ballBody.angularVelocity.set(0, 0, 0);
            if (window.CANNON && window.CANNON.Body) {
              window.ballBody.type = window.CANNON.Body.STATIC;
            }
          }
          // If it was a catch opportunity, mark it as caught now!
          if (window.MATCH.catchPossible && !window.MATCH.ballBouncedSinceHit) {
            window.MATCH.isOutThisBall = true;
            window.MATCH.outType = 'CAUGHT';
            window.MATCH.catchPossible = false;
            window.MATCH.ballResultProcessed = false;
            
            if (window.catchBallDeadTimer) clearTimeout(window.catchBallDeadTimer);
            window.catchBallDeadTimer = setTimeout(() => {
              window.MATCH.ballDead = true;
              window.catchBallDeadTimer = null;
            }, 1200);
          }
        }

        // Check if dive duration (0.5s) is completed
        if (f.collectTimer >= 0.5) {
          f.mesh.position.y = 0; // stand up
          resetFielderPose(f);

          if (f.hasBall) {
            if (window.MATCH.isOutThisBall && window.MATCH.outType === 'CAUGHT') {
              // Diving catch complete: trigger celebration and go idle
              window.fielderRetrieved = true;
              window.queueCelebration(
                'out', 'OUT!', 'DIVING CATCH!', 'OUT!', 'DIVING CATCH!', 'out',
                () => {
                  if (window.CricketAudio && window.CricketAudio.playCheer) window.CricketAudio.playCheer(false);
                }
              );
              f.state = 'idle';
            } else {
              // Field collection complete: transition to throwing
              window.fielderRetrieved = true;
              f.state = 'throwing';
              f.throwTimer = 0;
              f.hasTriggeredEvent = false;
            }
          } else {
            // Dive missed completely! Transition back to running to chase the ball
            f.state = 'running';
            f.targetPos.copy(ballPos);
            f.diveCooldown = 1.5; // Cooldown of 1.5 seconds before diving again!
          }
        }
        break;
      }

case 'catching': {
         // During wicket cutscene, let cutscene handle animation
         if (inWicketCutscene) break;
         
         // Stop ball and lock it to fielder hands
         if (window.ballBody) {
           window.ballBody.velocity.set(0, 0, 0);
           window.ballBody.angularVelocity.set(0, 0, 0);
           window.ballBody.type = CANNON.Body.STATIC;
           
           // Fielder scaled height is 1.4. Hand is at y = 1.12 * 1.4 = 1.56
           if (f.mesh && f.mesh.position) {
             const handPos = f.mesh.position.clone();
             handPos.y += 1.56;
             window.ballBody.position.copy(handPos);
           }
         }

         if (f.isFBX) {
           // FBX: catch animation via AnimationMixer
           updateFBXFielderAnim(f);
         } else {
          // Procedural: Raise arms catching pose
          const p = f.mesh.parts;
          if (p) {
            p.leftArm.rotation.x = THREE.MathUtils.lerp(p.leftArm.rotation.x, -1.8, 0.15);
            p.rightArm.rotation.x = THREE.MathUtils.lerp(p.rightArm.rotation.x, -1.8, 0.15);
            p.leftArm.rotation.z = THREE.MathUtils.lerp(p.leftArm.rotation.z, -0.3, 0.15);
            p.rightArm.rotation.z = THREE.MathUtils.lerp(p.rightArm.rotation.z, 0.3, 0.15);
            p.leftForearm.rotation.x = THREE.MathUtils.lerp(p.leftForearm.rotation.x, -0.4, 0.15);
            p.rightForearm.rotation.x = THREE.MathUtils.lerp(p.rightForearm.rotation.x, -0.4, 0.15);
          }
        }

        f.collectTimer += dt;
         if (f.collectTimer >= 1.2 && !f.hasTriggeredEvent) {
          f.hasTriggeredEvent = true;
          window.fielderRetrieved = true;

          // Update LAST BALL HUD immediately for catch
          if (window.updateLastBallHUD) {
            window.updateLastBallHUD(
              window.deliverySpeedKmh, 
              `OUT (CAUGHT)`, 
              window.lastShotName
            );
          }

          if (typeof window.snapBatsmenToCreases === 'function') {
            window.snapBatsmenToCreases();
          }
window.queueCelebration(
             'out',
             'OUT!',
             'CAUGHT OUT',
             'OUT!',
             'CAUGHT IN DEEP!',
             'out',
             () => {
               if (window.CricketAudio && window.CricketAudio.playCheer) {
                 window.CricketAudio.playCheer(false);
               }
               // FBX bowler celebration on caught wicket
               if (window.FBXPlayers && window.FBXPlayers.isPreloaded && window.bowlerMesh) {
                 window.FBXPlayers.triggerBowlerCelebration(window.bowlerMesh.position.clone());
               }
             }
           );
           f.state = 'idle'; // Fielder done - cutscene handles animation
           f.hasBall = false;
        }
        break;
      }

case 'collecting':
        animateFielderCollect(f, dt);
        
        // Face the ball while bending down
        const dirBall = ballPos.clone().sub(f.mesh.position);
        const angleBall = Math.atan2(dirBall.x, dirBall.z);
        f.mesh.rotation.set(0, angleBall, 0);

         f.collectTimer += dt;
         if (f.collectTimer >= 0.3 && !f.hasTriggeredEvent) { // 0.3s collect time for running decisions
          f.hasTriggeredEvent = true;
          window.fielderRetrieved = true;

          resetFielderPose(f); // Reset pose before throwing
          f.state = 'throwing';
          f.throwTimer = 0;
          f.hasTriggeredEvent = false;
          // Freeze real ball - it's been collected
          if (window.ballBody) {
            window.ballBody.velocity.set(0, 0, 0);
            window.ballBody.angularVelocity.set(0, 0, 0);
            window.ballBody.type = CANNON.Body.STATIC;
          }
          f.hasBall = true;
        }
        break;

      case 'throwing':
        animateFielderThrow(f, dt);
        f.throwTimer += dt;
        if (f.throwTimer >= 0.2 && !f.hasTriggeredEvent) { // 0.2s throw time
          f.hasTriggeredEvent = true;

          // Determine target stumps Z end
          let targetZ = WICKET_Z; // Striker end default
          if ((window.runningState === 'called' || window.runningState === 'cancelled') && window.batsmanMesh && window.nonStrikerMesh) {
            const strikerDistToBowlerEnd = Math.abs(window.batsmanMesh.position.z - (-22.4));
            const nonStrikerDistToStrikerEnd = Math.abs(window.nonStrikerMesh.position.z - WICKET_Z);
            if (strikerDistToBowlerEnd > nonStrikerDistToStrikerEnd) {
              targetZ = -22.4; // Bowler end stumps Z
            }
          }

          const isUserBowling = window.MATCH && !window.MATCH.userIsBatting;

          if (isUserBowling && typeof window.startThrowQTE === 'function') {
            window.startThrowQTE((zone) => {
              const handPos = f.mesh.position.clone().add(new THREE.Vector3(0, 1.2 * 1.8, 0));
              let isDirectHit = false;
              let finalThrowTarget = new THREE.Vector3(0, 0.5, targetZ);

              if (zone === 'green') {
                isDirectHit = true;
                window.MATCH.isOverthrowThisBall = false;
                finalThrowTarget.set(0, 0.5, targetZ); // direct to stumps
                if (window.showFeedback) window.showFeedback('DIRECT HIT!', 'EXCELLENT THROW', 'perfect');
              } else if (zone === 'yellow') {
                isDirectHit = false;
                window.MATCH.isOverthrowThisBall = false;
                // Offset the throw to the keeper's or bowler's hands instead of hitting the stumps!
                if (Math.abs(targetZ - WICKET_Z) < 3.0) {
                  finalThrowTarget.set(0, 1.1, 2.5); // Keeper's hands
                } else {
                  finalThrowTarget.set(0.5, 1.1, -22.4); // Bowler's hands
                }
                if (window.showFeedback) window.showFeedback('CLEAN RETURN', 'THROW TO KEEPER/BOWLER', 'good');
              } else {
                isDirectHit = false;
                window.MATCH.isOverthrowThisBall = true;
                // Wild overthrow!
                const wildOffset = (Math.random() > 0.5 ? 6.5 : -6.5);
                finalThrowTarget.set(wildOffset, 0.2, targetZ);
                if (window.showFeedback) window.showFeedback('OVERTHROW!', 'WILD RETURN', 'missed');
              }

              window.runoutIsDirectHit = isDirectHit;

              spawnReturnBall(handPos, finalThrowTarget);
              resetFielderPose(f);
              f.state = 'returning';
              f.hasBall = false;
            });
          } else {
            // AI fielding or fallback: automatic throw logic
            const handPos = f.mesh.position.clone().add(new THREE.Vector3(0, 1.2 * 1.8, 0));
            let isDirectHit = false;
            let finalThrowTarget = new THREE.Vector3(0, 0.5, targetZ);
            
            // AI return: 15% direct hit, 10% overthrow, 75% clean keeper/bowler return
            const randVal = Math.random();
            let feedbackText = '';
            
            if (randVal < 0.15) {
              isDirectHit = true;
              window.MATCH.isOverthrowThisBall = false;
              finalThrowTarget.set(0, 0.5, targetZ); // Direct hit
              feedbackText = 'DIRECT HIT!';
            } else if (randVal < 0.25) {
              isDirectHit = false;
              window.MATCH.isOverthrowThisBall = true;
              const wildOffset = (Math.random() > 0.5 ? 6.5 : -6.5);
              finalThrowTarget.set(wildOffset, 0.2, targetZ);
              feedbackText = 'OVERTHROW!';
            } else {
              isDirectHit = false;
              window.MATCH.isOverthrowThisBall = false;
              // Clean return to keeper or bowler
              if (Math.abs(targetZ - WICKET_Z) < 3.0) {
                finalThrowTarget.set(0, 1.1, 2.5); // Keeper's hands
              } else {
                finalThrowTarget.set(0.5, 1.1, -22.4); // Bowler's hands
              }
            }
            
            window.runoutIsDirectHit = isDirectHit;

            if (window.showFeedback && feedbackText !== '') {
              window.showFeedback(feedbackText, 'AI FIELD RETURN', 'perfect');
            }

            spawnReturnBall(handPos, finalThrowTarget);
            resetFielderPose(f);
            f.state = 'returning';
            f.hasBall = false;
          }
        }
        break;

      case 'returning':
        animateFielderRun(f, dt);
        fielderMoveToward(f, f.homePosition, dt, 3.2);
        const distHome = f.mesh.position.distanceTo(f.homePosition);
        if (distHome < 0.35) {
          f.state = 'idle';
          f.walkCycle = 0;
          resetFielderPose(f);
          
          // Face center on return
          const dirCenterRet = new THREE.Vector3(0, 0, -10).sub(f.mesh.position);
          const angleCenterRet = Math.atan2(dirCenterRet.x, dirCenterRet.z);
          f.mesh.rotation.set(0, angleCenterRet, 0);
        }
        break;
    }
  });
  } catch (err) {
    console.error('[CRASH] Exception inside updateFielders:', err);
  }
}

export function triggerFieldingFSM() {
  const THREE = window.THREE;
  const ballBody = window.ballBody;
  const fielders = window.fielders;
  if (!ballBody || !fielders) return;

  // Add bowler as a temporary fielder once the ball is hit so they can participate in fielding
  const bowlerFielderId = 'bowler-fielder';
  let bowlerFielder = fielders.find(f => f.id === bowlerFielderId);
  if (!bowlerFielder && window.bowlerMesh) {
    bowlerFielder = {
      id: bowlerFielderId,
      mesh: window.bowlerMesh,
      isFBX: window.bowlerMesh.isFBX,
      startPos: new THREE.Vector3(0.5, 0, -22.4),
      homePosition: new THREE.Vector3(0.5, 0, -22.4),
      pos: window.bowlerMesh.position,
      vel: new THREE.Vector3(0, 0, 0),
      targetPos: window.bowlerMesh.position.clone(),
      speed: 7.2,
      state: 'idle',
      walkCycle: 0,
      idleOffset: 0,
      collectTimer: 0,
      throwTimer: 0,
      isClosest: false
    };
    fielders.push(bowlerFielder);
  }

  const ballStart = new THREE.Vector3(ballBody.position.x, 0, ballBody.position.z);
  const vx = ballBody.velocity.x;
  const vz = ballBody.velocity.z;
  const speed = Math.sqrt(vx * vx + vz * vz);

  let dir = new THREE.Vector3(vx, 0, vz);
  if (speed > 0.1) {
    dir.normalize();
  } else {
    dir.set(0, 0, 1);
  }

  // Project ball travel for up to 4.5 seconds, capped at boundary (54.9m from centre)
  const estimatedDist = Math.min(54.9, speed * 4.5);
  const landingPoint = ballStart.clone().addScaledVector(dir, estimatedDist);

  // Helper to find closest point on segment AB to point P
  function getClosestPointOnSegment(A, B, P) {
    const AB = new THREE.Vector3().subVectors(B, A);
    const AP = new THREE.Vector3().subVectors(P, A);
    const abLenSq = AB.lengthSq();
    if (abLenSq < 0.0001) return A.clone();
    
    let t = AP.dot(AB) / abLenSq;
    t = Math.max(0, Math.min(1, t)); // Clamp to segment
    return A.clone().addScaledVector(AB, t);
  }

  const pitchCentre = new THREE.Vector3(0, 0, -10.0);
  const innerCircleRadius = 28.0;

  // Classify fielders and calculate their distance to the projected ball path
  let candidates = fielders.map(f => {
    const fPos = f.mesh.position;
    const homeDistToCentre = f.homePosition.distanceTo(pitchCentre);
    const isInner = homeDistToCentre < innerCircleRadius;
    
    const projPoint = getClosestPointOnSegment(ballStart, landingPoint, fPos);
    const distToPath = fPos.distanceTo(projPoint);
    const distToLanding = fPos.distanceTo(landingPoint);

    return {
      fielder: f,
      isInner,
      projPoint,
      distToPath,
      distToLanding
    };
  });

  // Check if ball's projected landing point is inside the inner circle
  const landingDistToCentre = landingPoint.distanceTo(pitchCentre);
  const ballStaysInner = landingDistToCentre < innerCircleRadius;

  let chosenCandidate = null;

  if (ballStaysInner) {
    // Ball stays in inner circle: prioritize inner circle fielders close to the path
    let minInnerDist = Infinity;
    candidates.forEach(c => {
      if (c.isInner) {
        if (c.distToPath < minInnerDist) {
          minInnerDist = c.distToPath;
          chosenCandidate = c;
        }
      }
    });
    // Fallback to any fielder if no inner circle candidate matches
    if (!chosenCandidate) {
      let minDist = Infinity;
      candidates.forEach(c => {
        if (c.distToPath < minDist) {
          minDist = c.distToPath;
          chosenCandidate = c;
        }
      });
    }
  } else {
    // Ball goes to outfield/boundary:
    // First check if there is a boundary/outfield fielder positioned near the ball's path.
    let chosenBoundary = null;
    let minBoundaryDist = Infinity;
    candidates.forEach(c => {
      if (!c.isInner) {
        if (c.distToPath < minBoundaryDist) {
          minBoundaryDist = c.distToPath;
          chosenBoundary = c;
        }
      }
    });

    // If there is an outfield/boundary fielder near the path (within 24m), they run.
    if (chosenBoundary && minBoundaryDist < 24) {
      chosenCandidate = chosenBoundary;
    } else {
      // If there is no boundary fielder in that direction, the closest fielder runs (e.g. inner circle chasing it).
      let minDist = Infinity;
      candidates.forEach(c => {
        if (c.distToPath < minDist) {
          minDist = c.distToPath;
          chosenCandidate = c;
        }
      });
    }
  }

  // Clear isClosest on all fielders
  fielders.forEach(f => { f.isClosest = false; });

  if (chosenCandidate) {
    const chosen = chosenCandidate.fielder;
    chosen.isClosest = true;
    chosen.targetPos = landingPoint.clone();
    console.log('[FieldingFSM] Chosen fielder:', chosen.homePosition.x.toFixed(1), chosen.homePosition.z.toFixed(1), 
                '| Type:', chosenCandidate.isInner ? 'Inner' : 'Boundary', 
                '| distToPath:', chosenCandidate.distToPath.toFixed(1));
  }
}



export function throwBallToCrease() {
  const ballBody = window.ballBody;
  ballBody.velocity.set(0, 0, 0);
  ballBody.angularVelocity.set(0, 0, 0);
  triggerFieldingFSM();
}

export function resetAllFieldersToHome() {
  const THREE = window.THREE;
  if (!window.fielders) return;

  console.log('[FieldingFSM] Resetting all fielders and bowler to starting positions.');

  window.fielders.forEach(f => {
    f.state = 'idle';
    f.walkCycle = 0;
    f.isClosest = false;
    f.collectTimer = 0;
    f.throwTimer = 0;
    f.hasBall = false;
    f.hasTriggeredEvent = false;

    if (f.mesh) {
      f.mesh.position.copy(f.startPos || f.homePosition);
      f.mesh.position.y = 0;
      
      // Face pitch center Z = -10
      const dirCenter = new THREE.Vector3(0, 0, -10).sub(f.mesh.position);
      const angleCenter = Math.atan2(dirCenter.x, dirCenter.z);
      f.mesh.rotation.set(0, angleCenter, 0);

      // Reset bones / pose
      resetFielderPose(f);
    }
  });

  // Also reset the bowler mesh position and rotation to start point
  if (window.bowlerMesh) {
    const isSpinner = window.isBowlerSpinner(window.MATCH ? window.MATCH.bowlerName : null);
    const startZ = isSpinner ? -26.0 : -38.0;
    window.bowlerMesh.position.set(0.6, 0, startZ);
    window.bowlerMesh.rotation.set(0, 0, 0);
    
    // Reset FSM states on bowler mesh just in case they participated
    window.bowlerMesh.state = 'idle';
    window.bowlerMesh.walkCycle = 0;
    window.bowlerMesh.isClosest = false;
    window.bowlerMesh.collectTimer = 0;
    window.bowlerMesh.throwTimer = 0;
    window.bowlerMesh.hasBall = false;

    // Reset pose safely using the existing helper
    resetFielderPose({ mesh: window.bowlerMesh, isFBX: window.bowlerMesh.isFBX });
  }
}

window.updateFielders = updateFielders;
window.triggerFieldingFSM = triggerFieldingFSM;
window.throwBallToCrease = throwBallToCrease;
window.spawnReturnBall = spawnReturnBall;
window.resetAllFieldersToHome = resetAllFieldersToHome;
