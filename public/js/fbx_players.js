// ── FBX PLAYER MODEL SYSTEM ──────────────────────────────────────────────────
// Uses Idle.fbx (rigged mesh) as base, loads clips from separate animation FBXs.
// Provides animated fielders and bowler celebration overlays.

const BASE_ANIM_DIR  = 'models/players/indiancricketplayer/animation/';
const TEXTURE_DIR    = 'models/players/indiancricketplayer/textures/';

// Map of semantic name -> filename
const ANIM_MANIFEST = {
  idle:         'Idle.fbx',
  run:          'Running.fbx',
  runBack:      'Running Backward.fbx',
  fastRun:      'Fast Run.fbx',
  walk:         'Arm Stretching.fbx',
  throw:        'Throw.fbx',
  catch:        'run jump Catch.fbx',
  keeperCatch:  'wicket keeper Catch.fbx',
  dive:         'ball Tackle dive.fbx',
  slide:        'Running Slide.fbx',
  jump:         'Jump.fbx',
  offIdle:      'Offensive Idle.fbx',
  salute:       'Salute celebrations .fbx',
  hipHop:       'Hip Hop Dancing celebrations.fbx',
  sillyDance:   'Silly Dancing celebrations.fbx',
  standClap:    'Standing Clap.fbx',
  hit1:         'Baseball Hit.fbx',
  hit2:         'Baseball Hit (1).fbx',
  hit3:         'Baseball Hit (2).fbx',
};

const CELEBRATION_ANIMS = ['salute', 'hipHop', 'sillyDance', 'standClap'];

// ── SHARED CACHE ─────────────────────────────────────────────────────────────
let sharedBaseModel   = null;   // Idle.fbx with mesh + skeleton
let sharedBatsmanModel = null;  // batsman.fbx with skeleton + all accessories
let sharedClips       = {};     // animName -> THREE.AnimationClip
let sharedBodyTex     = null;   // T_Body_BaseColor.png
let sharedPropsTex    = null;   // T_CricketProps_BaseColor.png
let sharedAccessories = {};     // accessoryName -> THREE.Mesh
const sharedAccessoryTransforms = {}; // accessoryName -> { pos, quat, scl }
let isPreloaded       = false;
let preloadPromise    = null;

const ACCESSORY_BONES = {
  'Helmet': 'mixamorigHead',
  'Pads_L': 'mixamorigLeftLeg',
  'Pad_R': 'mixamorigRightLeg',
  'Pads_R': 'mixamorigRightLeg',
  'Gloves_L': 'mixamorigLeftHand',
  'Gloves_R': 'mixamorigRightHand',
  'Bat': 'mixamorigRightHand'
};

// All active mixers — updated every frame
export const allPlayerMixers = [];

export function preloadFBXPlayers() {
  if (preloadPromise) return preloadPromise;

  console.log('[FBXPlayers] preloadFBXPlayers() bypassed/disabled');
  preloadPromise = Promise.resolve();
  isPreloaded = false;
  return preloadPromise;
}



// ── CLONE HELPER ─────────────────────────────────────────────
// Deep-clones the shared base model, preserving SkinnedMesh/skeleton properly
function cloneBaseModel(role) {
  const THREE = window.THREE;
  const modelToClone = sharedBaseModel;
  if (!modelToClone) return null;

  // Manual SkinnedMesh clone that does not share bones!
  const clone = modelToClone.clone(true);

  // Find all bones in cloned model by name
  const clonedBonesByName = {};
  clone.traverse(child => {
    if (child.isBone) {
      clonedBonesByName[child.name] = child;
    }
  });

  // Re-bind SkinnedMeshes in clone to cloned bones
  clone.traverse(child => {
    if (child.isSkinnedMesh) {
      const oldSkeleton = child.skeleton;
      if (oldSkeleton) {
        const newBones = [];
        for (let i = 0; i < oldSkeleton.bones.length; i++) {
          const oldBone = oldSkeleton.bones[i];
          const clonedBone = clonedBonesByName[oldBone.name];
          if (clonedBone) {
            newBones.push(clonedBone);
          } else {
            console.warn('[FBXPlayers] Bone not found in clone by name:', oldBone.name);
            newBones.push(oldBone);
          }
        }
        child.bind(new THREE.Skeleton(newBones, oldSkeleton.boneInverses), child.bindMatrix);
      }
    }
  });

  return clone;
}

// Umpire Hat Generator (in local bone space centimeters)
function createUmpireHat(THREE) {
  const hatGroup = new THREE.Group();
  
  // Brim: flat cylinder
  const brimMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.8 });
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(16, 16, 1, 16),
    brimMat
  );
  brim.position.y = 5;
  hatGroup.add(brim);
  
  // Crown: smaller cylinder
  const crownMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.8 });
  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 9, 6, 16),
    crownMat
  );
  crown.position.y = 8;
  hatGroup.add(crown);

  // Black ribbon around the crown
  const ribbonMat = new THREE.MeshBasicMaterial({ color: '#111827' });
  const ribbon = new THREE.Mesh(
    new THREE.CylinderGeometry(9.2, 9.2, 1.5, 16),
    ribbonMat
  );
  ribbon.position.y = 5.5;
  hatGroup.add(ribbon);

  return hatGroup;
}

// Bone matching helper with support for both mixamorig:Name and mixamorigName formats
export function getBone(model, name) {
  const THREE = window.THREE;
  if (!model) return null;
  // Try standard Mixamo names with colon
  let obj = model.getObjectByName('mixamorig:' + name);
  if (obj) return obj;
  // Try lowercase first letter after colon
  obj = model.getObjectByName('mixamorig:' + name.charAt(0).toLowerCase() + name.slice(1));
  if (obj) return obj;
  // Try without colon but capitalized
  obj = model.getObjectByName('mixamorig' + name);
  if (obj) return obj;
  // Try lowercase
  obj = model.getObjectByName('mixamorig' + name.charAt(0).toLowerCase() + name.slice(1));
  if (obj) return obj;
  // Fallback to name directly
  return model.getObjectByName(name);
}

// ── CREATE FBX PLAYER ─────────────────────────────────────────────────────────
/**
 * Create a fully-animated FBX player instance.
 * Returns a THREE.Object3D.
 *
 * @param {object} opts
 *   role     - 'fielder'|'nonStriker'|'celebration'
 *   team     - 'batting'|'fielding'
 */
export function createFBXPlayer({ role = 'fielder' } = {}) {
  console.log('[FBXPlayers] createFBXPlayer called for role:', role, 'isPreloaded:', isPreloaded, 'sharedBaseModel exists =', !!sharedBaseModel);
  if (!isPreloaded || !sharedBaseModel) {
    console.warn('[FBXPlayers] Models not preloaded yet. Call preloadFBXPlayers() first.');
    return null;
  }

  const THREE  = window.THREE;
  const clone  = cloneBaseModel(role);
  if (!clone) return null;

  // ── Override Materials & Attach Umpire Hat ────────────────────────────────
  const isUmpire = (role === 'umpire');
  let playerMat;
  if (isUmpire) {
    playerMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.7, skinning: true });
  } else {
    // Tint based on role
    let tintColor = 0xffffff;
    if (role === 'bowler' || role === 'celebration') {
      tintColor = 0xfc8181; // light red tint for bowler
    } else if (role === 'batsman' || role === 'nonStriker') {
      tintColor = 0x63b3ed; // light blue tint for batsman
    } else {
      tintColor = 0xffffff; // no tint for fielders / keeper (textured)
    }
    playerMat = new THREE.MeshStandardMaterial({
      map: sharedBodyTex,
      color: tintColor,
      roughness: 0.6,
      skinning: true
    });
  }

  clone.traverse(child => {
    if (child.isSkinnedMesh) {
      child.castShadow    = true;
      child.receiveShadow = true;
      child.material      = playerMat;
    } else if (child.isMesh) {
      child.castShadow    = true;
      child.receiveShadow = true;
      const staticMat = playerMat.clone();
      staticMat.skinning = false;
      child.material = staticMat;
    }
  });

  if (isUmpire) {
    const headBone = getBone(clone, 'Head');
    if (headBone) {
      const hat = createUmpireHat(THREE);
      hat.position.set(0, 15, 0); 
      headBone.add(hat);
    }
  }

  // ── Attach Batsman Accessories (Centimeter Bone Space) ───────────────────
  const isBatsman = (role === 'batsman' || role === 'nonStriker');
  if (isBatsman) {
    // 1. Helmet -> Head (Loaded from cricket_helmet.glb)
    const head = getBone(clone, 'Head');
    if (head && sharedAccessories['Helmet']) {
      const helmet = sharedAccessories['Helmet'].clone();
      helmet.name = 'HelmetMesh';
      helmet.position.set(0, 5.0, 0.5); // centered on mixamorigHead
      helmet.rotation.set(0, 0, 0);
      helmet.scale.setScalar(95.0); // Scale up GLTF meter units to centimeter bone space
      head.add(helmet);
      console.log(`[FBXPlayers] Attached GLTF Helmet to head for ${role}`);
    }

    // 2. Bat -> Right Hand (Loaded from cricket_bat.glb)
    const rHand = getBone(clone, 'RightHand');
    if (rHand && sharedAccessories['Bat']) {
      const batPivot = new THREE.Group();
      batPivot.name = 'BatPivot';
      rHand.add(batPivot);

      batPivot.position.set(0, 0, 0);
      batPivot.rotation.set(0, 0, 0);

      const bat = sharedAccessories['Bat'].clone();
      bat.name = 'BatMesh';

      // Set scale and offsets so the handle sits inside the palm
      bat.position.set(0, -6.0, 2.0);
      bat.rotation.set(0.2, 0.1, 1.57);
      bat.scale.setScalar(90.0); // Scale up GLTF meter units to centimeter bone space

      batPivot.add(bat);
      batPivot.updateMatrixWorld(true);

      // Add AxesHelper for debugging mixamorigRightHand orientation if in debug mode
      if (window.DEBUG_MODE) {
        const axesHelper = new THREE.AxesHelper(20);
        axesHelper.name = 'DebugAxesHelper';
        rHand.add(axesHelper);
      }
      console.log(`[FBXPlayers] Attached GLTF Bat to right hand for ${role} using BatPivot group`);
    }

    // 3. Gloves_L -> Left Hand (Procedural Spheres)
    const lHand = getBone(clone, 'LeftHand');
    if (lHand) {
      const gloveL = new THREE.Mesh(
        new THREE.SphereGeometry(4.5, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 })
      );
      gloveL.name = 'GloveLMesh';
      gloveL.position.set(0, 0, 0);
      lHand.add(gloveL);
    }

    // 4. Gloves_R -> Right Hand (Procedural Spheres)
    if (rHand) {
      const gloveR = new THREE.Mesh(
        new THREE.SphereGeometry(4.5, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 })
      );
      gloveR.name = 'GloveRMesh';
      gloveR.position.set(0, 0, 0);
      rHand.add(gloveR);
    }

    // 5. Pads_L -> Left Leg (Procedural Boxes)
    const lLeg = getBone(clone, 'LeftLeg');
    if (lLeg) {
      const padL = new THREE.Mesh(
        new THREE.BoxGeometry(11, 40, 8),
        new THREE.MeshStandardMaterial({ color: '#3b82f6', roughness: 0.5 })
      );
      padL.name = 'PadLMesh';
      padL.position.set(0, -18.0, 4.0); // offset down the shin & forward
      lLeg.add(padL);
    }

    // 6. Pads_R -> Right Leg (Procedural Boxes)
    const rLeg = getBone(clone, 'RightLeg');
    if (rLeg) {
      const padR = new THREE.Mesh(
        new THREE.BoxGeometry(11, 40, 8),
        new THREE.MeshStandardMaterial({ color: '#3b82f6', roughness: 0.5 })
      );
      padR.name = 'PadRMesh';
      padR.position.set(0, -18.0, 4.0);
      rLeg.add(padR);
    }
  }

  // Define simple state tracker variables
  clone.state = 'idle';
  clone._lastAnimName = 'idle';
  clone.role = role;

  // Dummy animation APIs to keep interface compatibility
  clone.playAnimation = function(animName, opts = {}) {
    clone.state = animName;
    clone._lastAnimName = animName;
  };

  clone.playOneShot = function(animName, returnTo = 'idle', crossFade = 0.4) {
    clone.state = animName;
    clone._lastAnimName = animName;
    const duration = (animName === 'throw') ? 500 : (animName === 'catch' || animName === 'keeperCatch') ? 600 : 7000;
    setTimeout(() => {
      if (clone.state === animName) {
        clone.state = returnTo;
        clone._lastAnimName = returnTo;
      }
    }, duration);
  };

  clone.destroyFBX = function() {
    // No-op
  };

  return clone;
}

// ── GLOBAL UPDATE ─────────────────────────────────────────────────────────────
export function updateFBXMixers(dt) {
  // No-op as we are animating procedurally!
}

// ── CELEBRATION ───────────────────────────────────────────────────────────────
let activeCelebrationPlayer = null;

/**
 * Clean up active celebration player if it exists and restore the bowler mesh.
 */
export function cleanupBowlerCelebration() {
  const scene = window.scene;
  if (activeCelebrationPlayer) {
    if (scene) {
      scene.remove(activeCelebrationPlayer);
    }
    activeCelebrationPlayer.destroyFBX();
    activeCelebrationPlayer.traverse(c => {
      if (c.geometry) c.geometry.dispose();
    });
    activeCelebrationPlayer = null;
  }
  if (window.bowlerMesh) {
    window.bowlerMesh.visible = true;
  }
}

/**
 * Triggers a random celebration animation on a bowler-end FBX player overlay.
 * Creates the player at the given worldPosition, runs the animation, then removes it.
 */
export function triggerBowlerCelebration(worldPosition) {
  if (!isPreloaded || !sharedBaseModel) return;

  const THREE = window.THREE;
  const scene = window.scene;
  if (!scene) return;

  // Clean up any existing celebration player first
  cleanupBowlerCelebration();

  const celebPlayer = createFBXPlayer({ role: 'celebration' });
  if (!celebPlayer) return;
  activeCelebrationPlayer = celebPlayer;

  // Hide the original bowler mesh
  if (window.bowlerMesh) {
    window.bowlerMesh.visible = false;
  }

  // Scale for game scene (bowler scale 0.014 applied to 0.01 model)
  celebPlayer.scale.setScalar(0.014);
  celebPlayer.position.copy(worldPosition);
  celebPlayer.position.y = 0;
  // Face the batsman crease (positive Z)
  celebPlayer.rotation.y = 0;
  scene.add(celebPlayer);

  // Pick random celebration
  const available = CELEBRATION_ANIMS.filter(a => celebPlayer.actions[a]);
  if (available.length === 0) {
    cleanupBowlerCelebration();
    return;
  }
  const chosen = available[Math.floor(Math.random() * available.length)];

  // Play celebration once, then idle for a moment, then remove
  celebPlayer.playOneShot(chosen, 'idle', 0.5);

  // Remove after 7 seconds total
  setTimeout(() => {
    // Only remove if this is still the active celebration player that started this timeout
    if (activeCelebrationPlayer === celebPlayer) {
      cleanupBowlerCelebration();
    }
  }, 7000);
}

// ── FIELDER ANIMATION BRIDGE ───────────────────────────────────────────────────
// Drives fielder FBX animation state based on fielder.state string
const FIELDER_STATE_MAP = {
  idle:       'idle',
  running:    'fastRun',
  diving:     'dive',
  collecting: 'catch',
  catching:   'catch',
  throwing:   'throw',
  returning:  'run',
};

/**
 * Update animation state of a single FBX fielder based on its state string.
 * @param {object} fielder - { mesh, state }
 */
export function updateFBXFielderAnim(fielder) {
  const fbx = fielder.mesh;
  if (!fbx || !fbx.playAnimation) return;

  const targetAnim = FIELDER_STATE_MAP[fielder.state] || 'idle';

  // Avoid restarting animation if already playing the same one
  if (fbx._lastAnimName === targetAnim) return;
  fbx._lastAnimName = targetAnim;

  // Speed override for running
  const opts = {};
  if (fielder.state === 'running' || fielder.state === 'returning') {
    opts.timeScale = 1.4; // run faster for game speed
  }

  fbx.playAnimation(targetAnim, { crossFade: 0.2, ...opts });
}

// ── WALK-IN CUTSCENE ───────────────────────────────────────────────────────────
let cutsceneWalkers = [];
let cutsceneZ = 42.0;
let cutsceneTimer = 0;
let isCutsceneActive = false;

export function startWalkInCutscene() {
  const THREE = window.THREE;
  const scene = window.scene;
  if (!scene) return;

  cleanupWalkInCutscene();

  isCutsceneActive = true;
  cutsceneZ = 42.0;
  cutsceneTimer = 0;

  if (window.setGameState && window.STATES) {
    window.setGameState(window.STATES.CUTSCENE);
  }

  // Hide gameplay batsmen
  if (window.batsmanMesh) window.batsmanMesh.visible = false;
  if (window.nonStrikerMesh) window.nonStrikerMesh.visible = false;

  // Spawn two FBX walk-in players
  const walker1 = createFBXPlayer({ role: 'cutscene' });
  const walker2 = createFBXPlayer({ role: 'cutscene' });

  if (walker1 && walker2) {
    walker1.scale.setScalar(0.015);
    walker2.scale.setScalar(0.015);

    walker1.position.set(-1.0, 0, cutsceneZ);
    walker2.position.set(1.0, 0, cutsceneZ);

    // Face the pitch (negative Z direction)
    walker1.rotation.set(0, Math.PI, 0);
    walker2.rotation.set(0, Math.PI, 0);

    // Play walk animation
    walker1.playAnimation('walk', { timeScale: 1.1 });
    walker2.playAnimation('walk', { timeScale: 1.1 });

    scene.add(walker1);
    scene.add(walker2);

    cutsceneWalkers = [walker1, walker2];
  }
}

export function cleanupWalkInCutscene() {
  const scene = window.scene;
  if (cutsceneWalkers && cutsceneWalkers.length > 0) {
    cutsceneWalkers.forEach(w => {
      if (scene) scene.remove(w);
      w.destroyFBX();
      w.traverse(c => {
        if (c.geometry) c.geometry.dispose();
      });
    });
    cutsceneWalkers = [];
  }
  isCutsceneActive = false;

  // Restore gameplay batsmen
  if (window.batsmanMesh) window.batsmanMesh.visible = true;
  if (window.nonStrikerMesh) window.nonStrikerMesh.visible = true;
}

export function updateWalkInCutscene(dt) {
  if (!isCutsceneActive) return;

  cutsceneTimer += dt;
  const speed = 5.0; // units/sec
  cutsceneZ -= speed * dt;

  if (cutsceneWalkers && cutsceneWalkers.length === 2) {
    cutsceneWalkers[0].position.z = cutsceneZ;
    cutsceneWalkers[1].position.z = cutsceneZ;
  }

  if (cutsceneTimer >= 6.5 || cutsceneZ <= 10.0) {
    cleanupWalkInCutscene();
    if (window.setGameState && window.STATES) {
      window.setGameState(window.STATES.BOWL_READY);
    }
  }
}

// Expose globally
window.FBXPlayers = {
  preloadFBXPlayers,
  createFBXPlayer,
  updateFBXMixers,
  triggerBowlerCelebration,
  cleanupBowlerCelebration,
  updateFBXFielderAnim,
  startWalkInCutscene,
  cleanupWalkInCutscene,
  updateWalkInCutscene,
  getBone,
  get isPreloaded() { return isPreloaded; },
  get isCutsceneActive() { return isCutsceneActive; },
  get cutsceneZ() { return cutsceneZ; },
};
