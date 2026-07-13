import { CricketAudio } from './useCricketAudio.js?v=56';
import './js/globals.js?v=56';
import './js/state.js?v=56';
import './js/models.js?v=56';
import './js/fielders.js?v=56';
import './js/ui.js?v=56';
import './js/profile.js?v=56';

const profile = window.profile;

window.DEBUG_MODE = false; // Debug mode flag for diagnostics and AxesHelpers

// Expose toggleFullscreen globally
window.toggleFullscreen = function() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  const el = document.documentElement;
  if (!isFs) {
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) req.call(el);
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (exit) exit.call(document);
  }
};


// ── KEYBOARD CONTROLS (PC INPUTS & FALLBACKS) ───────────────────
function initKeyboard() {
  const controlledKeys = [
    'Space',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'KeyA',
    'KeyD',
    'KeyW',
    'KeyS',
    'ControlLeft',
    'ControlRight',
    'ShiftLeft',
    'ShiftRight',
    'Digit1',
    'Digit2',
    'Digit3',
    'Digit4'
  ];

  window.addEventListener('keydown', (e) => {
    // Prevent browser scrolling and default actions for gameplay keys
    if (controlledKeys.includes(e.code)) {
      e.preventDefault();
    }

    // ESC toggles pause settings screen during gameplay
    if (e.code === 'Escape') {
      if (gameState !== STATES.SPLASH && gameState !== STATES.MAIN_MENU && gameState !== STATES.WAITING_FOR_PHONE && gameState !== STATES.GAME_OVER) {
        togglePause();
      }
    }

    if (e.code === 'ArrowLeft') keys.arrowLeft = true;
    if (e.code === 'ArrowRight') keys.arrowRight = true;
    if (e.code === 'ArrowUp') keys.arrowUp = true;
    if (e.code === 'ArrowDown') keys.arrowDown = true;
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyD') keys.d = true;
    if (e.code === 'KeyW') keys.w = true;
    if (e.code === 'KeyS') keys.s = true;

// User Bowling length presets (Keys 1-4)
    if (!MATCH.userIsBatting && gameState === STATES.BOWL_READY && window.currentBowlingStep === window.BOWLING_STEPS.SELECT_LOCATION) {
      if (e.code === 'Digit1') { MATCH.bowlingTargetZ = 0.5; if (typeof window.updateAimPreviewAndLengthHighlight === 'function') window.updateAimPreviewAndLengthHighlight(); }
      if (e.code === 'Digit2') { MATCH.bowlingTargetZ = -1.5; if (typeof window.updateAimPreviewAndLengthHighlight === 'function') window.updateAimPreviewAndLengthHighlight(); }
      if (e.code === 'Digit3') { MATCH.bowlingTargetZ = -4.0; if (typeof window.updateAimPreviewAndLengthHighlight === 'function') window.updateAimPreviewAndLengthHighlight(); }
      if (e.code === 'Digit4') { MATCH.bowlingTargetZ = -7.0; if (typeof window.updateAimPreviewAndLengthHighlight === 'function') window.updateAimPreviewAndLengthHighlight(); }
    }

    if (e.code === 'KeyQ') {
      if (!MATCH.userIsBatting && gameState === STATES.BOWL_READY && window.currentBowlingStep === window.BOWLING_STEPS.SELECT_BALL_TYPE) {
        if (typeof window.cycleWheelSelection === 'function') window.cycleWheelSelection(-1);
      }
    }
    if (e.code === 'KeyE') {
      if (!MATCH.userIsBatting && gameState === STATES.BOWL_READY && window.currentBowlingStep === window.BOWLING_STEPS.SELECT_BALL_TYPE) {
        if (typeof window.cycleWheelSelection === 'function') window.cycleWheelSelection(1);
      }
    }
    if (e.code === 'Tab') {
      if (!MATCH.userIsBatting && gameState === STATES.BOWL_READY && window.currentBowlingStep === window.BOWLING_STEPS.SELECT_BALL_TYPE) {
        e.preventDefault();
        if (typeof window.toggleBowlingVariations === 'function') window.toggleBowlingVariations();
      }
    }

    if (e.code === 'Space') {
      keys.space = true;
      console.log('[DEBUG-SPACE] Space key down! entranceCutsceneActive:', window.entranceCutsceneActive, 'wicketCutsceneActive:', window.wicketCutsceneActive, 'gameState:', gameState, 'currentBowlingStep:', window.currentBowlingStep);
      
      if (window.entranceCutsceneActive) {
        window.skipEntranceCutscene();
        return;
      }
      if (window.wicketCutsceneActive) {
        if (window.replaySystem && window.replaySystem.isPlayingReplay) {
          window.replaySystem.stopReplay();
          return;
        }
        window.skipWicketCutscene();
        return;
      }
      
      const introScreen = document.getElementById('match-intro-screen');
      const breakScreen = document.getElementById('innings-break-screen');
      if (introScreen && !introScreen.classList.contains('hidden')) {
        window.proceedFromMatchIntro();
        return;
      }
      if (breakScreen && !breakScreen.classList.contains('hidden')) {
        window.proceedFromInningsBreak();
        return;
      }

      if (MATCH.userIsBatting) {
        window.triggerBatSwing();
      } else if (gameState === STATES.BOWL_READY) {
        console.log('[DEBUG-SPACE] gameState BOWL_READY. currentBowlingStep:', window.currentBowlingStep);
        if (window.currentBowlingStep === window.BOWLING_STEPS.SELECT_LOCATION) {
          console.log('[DEBUG-SPACE] SELECT_LOCATION -> startBallTypeSelection');
          window.startBallTypeSelection();
        } else if (window.currentBowlingStep === window.BOWLING_STEPS.SELECT_BALL_TYPE) {
          console.log('[DEBUG-SPACE] SELECT_BALL_TYPE -> startReleaseMeter');
          window.startReleaseMeter();
        } else if (window.currentBowlingStep === window.BOWLING_STEPS.RELEASE_METER) {
          console.log('[DEBUG-SPACE] RELEASE_METER -> triggerBowlingRelease. bowlerReleasePressed:', MATCH.bowlerReleasePressed);
          if (!MATCH.bowlerReleasePressed) {
            window.triggerBowlingRelease();
          }
        }
      }
    }
    // R — call a run (after hitting)
    if (e.code === 'KeyR') { if (MATCH.userIsBatting) window.callRun(); }
    // X — cancel run / send back
    if (e.code === 'KeyX') { if (MATCH.userIsBatting) window.cancelRun(); }
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
      keys.ctrl = true;
      if (MATCH.userIsBatting) window.triggerBatSwing();
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      keys.shift = true;
      if (MATCH.userIsBatting) window.triggerBatSwing();
    }
    // F — toggle fullscreen
    if (e.code === 'KeyF') {
      if (window.toggleFullscreen) window.toggleFullscreen();
      if (window.CricketAudio && window.CricketAudio.playHit) {
        window.CricketAudio.playHit(0.3);
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') keys.arrowLeft = false;
    if (e.code === 'ArrowRight') keys.arrowRight = false;
    if (e.code === 'ArrowUp') keys.arrowUp = false;
    if (e.code === 'ArrowDown') keys.arrowDown = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyD') keys.d = false;
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'Space') keys.space = false;
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') keys.ctrl = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = false;
  });

  // Fix hanging keys on window blur and tab switches
  function resetKeys() {
    keys.arrowLeft = false;
    keys.arrowRight = false;
    keys.arrowUp = false;
    keys.arrowDown = false;
    keys.a = false;
    keys.d = false;
    keys.w = false;
    keys.s = false;
    keys.space = false;
    keys.ctrl = false;
    keys.shift = false;
  }
  window.addEventListener('blur', resetKeys);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      resetKeys();
    }
  });
}





function togglePause() {
  if (gameState === STATES.PAUSED) {
    // Resume — restore crowd ambience if we were in a match
    setGameState(prePauseState);
    if (CricketAudio.crowdGain && CricketAudio.ctx) {
      CricketAudio.crowdGain.gain.setValueAtTime(1.0, CricketAudio.ctx.currentTime);
    }
  } else {
    // Pause — duck audio
    prePauseState = gameState;
    CricketAudio.transitionTo(CricketAudio.STATES.PAUSED);
    setGameState(STATES.PAUSED);
  }
}

function updateRadar() {
  const radarCircle = document.getElementById('radar-circle');
  if (!radarCircle) return;

  const rMap = 70; // Half of 140px diameter
  const RMax = 55.0; // boundary radius
  const scale = rMap / RMax;
  const fieldCenterZ = -10.0;

  function setDotPos(elId, x, z) {
    const el = typeof elId === 'string' ? document.getElementById(elId) : elId;
    if (!el) return;
    
    // dx = x relative to center
    // dz = z relative to center
    const dx = x;
    const dz = z - fieldCenterZ;
    
    const mx = dx * scale;
    const my = dz * scale;
    
    // Clamp to map boundary circle
    const dist = Math.sqrt(mx * mx + my * my);
    let finalMx = mx;
    let finalMy = my;
    if (dist > rMap - 6) {
      const angle = Math.atan2(my, mx);
      finalMx = Math.cos(angle) * (rMap - 6);
      finalMy = Math.sin(angle) * (rMap - 6);
    }

    el.style.left = `${rMap + finalMx}px`;
    el.style.top = `${rMap + finalMy}px`;
  }

  // Update Batsman
  if (batsmanMesh) {
    setDotPos('radar-batsman', batsmanMesh.position.x, batsmanMesh.position.z);
  }

  // Update Bowler
  if (bowlerMesh) {
    setDotPos('radar-bowler', bowlerMesh.position.x, bowlerMesh.position.z);
  }

  // Update Keeper (Sprint B)
  if (window.keeperMesh && window.keeperMesh.radarDot) {
    setDotPos(window.keeperMesh.radarDot, window.keeperMesh.position.x, window.keeperMesh.position.z);
  }

  // Update Ball
  const ballDot = document.getElementById('radar-ball');
  if (ballDot) {
    if (gameState === STATES.BALL_IN_FLIGHT || gameState === STATES.HIT) {
      ballDot.style.display = 'block';
      setDotPos(ballDot, ballBody.position.x, ballBody.position.z);
    } else {
      ballDot.style.display = 'none';
    }
  }

  // Update Fielders
  fielders.forEach(f => {
    if (f.radarDot) {
      setDotPos(f.radarDot, f.mesh.position.x, f.mesh.position.z);
    }
  });
}

// ── STATE MACHINE SETTER ────────────────────────────────────────
function setGameState(newState) {
  window.setGameState = setGameState;
  // More than one delayed callback can finish a delivery. Processing the
  // same state twice counts phantom balls and corrupts the next delivery.
  // SPLASH is deliberately re-entered once during startup to launch its
  // timed sequence; all gameplay states are otherwise idempotent.
  if (gameState === newState && newState !== STATES.SPLASH) return;
  console.log(`State Transition: ${gameState} ──> ${newState}`);
  gameState = newState;



  // Manage pause overlay visibility automatically
  const pauseScreen = document.getElementById('pause-settings-screen');
  if (pauseScreen) {
    if (gameState === STATES.PAUSED) {
      pauseScreen.classList.remove('hidden');
    } else {
      pauseScreen.classList.add('hidden');
    }
  }

  // ── Run button visibility ────────────────────────────────────────
  const runBtn    = document.getElementById('run-btn');
  const cancelBtn = document.getElementById('cancel-run-btn');
  if (runBtn && cancelBtn) {
    const isBatting = MATCH && MATCH.userIsBatting;
    if (gameState === STATES.HIT && isBatting) {
      runBtn.classList.remove('hidden');
      cancelBtn.classList.remove('hidden');
    } else if (gameState === STATES.RUNNING && isBatting) {
      runBtn.classList.add('hidden');
      cancelBtn.classList.remove('hidden');
    } else {
      runBtn.classList.add('hidden');
      cancelBtn.classList.add('hidden');
    }
  }


  switch (gameState) {
    case STATES.SPLASH:
      window.runSplashScreen();
      break;

    case STATES.MAIN_MENU:
      break;

    case STATES.WAITING_FOR_PHONE:
      break;

    case STATES.BOWL_READY:
      ui.gameOver.classList.add('hidden');
      setupNextDelivery();
      break;

    case STATES.BALL_IN_FLIGHT:
      bowlerReleased = true;
      break;

    case STATES.HIT:
      CricketAudio.playHit(controllerInput.btnR2 || keys.ctrl ? 1.25 : 0.85);
      if (socket && matchMode === MODES.PVP) {
        socket.emit('layout-change', { layout: 'batting' });
      }
      break;


    case STATES.RUNNING:
      // batsmen are actively running — camera follows action.
      break;



    case STATES.BOWLED:
      MATCH.isOutThisBall = true;
      MATCH.outType = 'BOWLED';
      if (typeof window.vibrateController === 'function') {
        window.vibrateController(500);
      }
      if (!MATCH.userIsBatting && typeof window.unlockAchievement === 'function') {
        window.unlockAchievement('clean_bowled');
      }
      if (typeof window.snapBatsmenToCreases === 'function') {
        window.snapBatsmenToCreases();
      }
      window.queueCelebration(
        'out',
        'OUT!',
        'CLEAN BOWLED',
        'CLEAN BOWLED!',
        'OUT',
        'out',
        () => {
          window.triggerWicketsClatter();
          CricketAudio.playBowled();
          CricketAudio.playGasp();
        }
      );
      break;

    case STATES.MISS:
      window.ballSettled = true;
      CricketAudio.playGasp();
      if (MATCH.isWideThisBall) {
        window.showFeedback('WIDE BALL!', '+1 EXTRA RUN', 'perfect');
      } else {
        window.showFeedback('BEATEN!', 'DOT BALL', 'missed');
      }
      
      const missDelay = (window.MATCH && !window.MATCH.userIsBatting) ? 800 : 1500;
      setTimeout(() => {
        if (gameState === STATES.MISS) setGameState(STATES.RESULT);
      }, missDelay);
      break;

    case STATES.RESULT:
      processBallResult();
      break;

    case STATES.NEXT_BALL:
      resetFieldForBowl();
      break;

    case STATES.GAME_OVER:
      window.showGameOverScreen();
      break;

    case STATES.PAUSED:
      break;
  }
}


// ── INITIALIZE GRAPHICS & PHYSICS ──────────────────────────────
function initGame() {
  const container = document.getElementById('canvas-container');

  // 1. Scene & Render
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b0f19');
  scene.fog = new THREE.FogExp2('#0b0f19', 0.015);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 4.5, 9); // Broadcast visual

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.maxPolarAngle = Math.PI / 2.05;
  orbitControls.target.set(0, 1.2, -4);
  orbitControls.update();

  // 2. Physics World
  physicsWorld = new CANNON.World();
  physicsWorld.gravity.set(0, -9.82, 0);
  physicsWorld.broadphase = new CANNON.SAPBroadphase(physicsWorld);
  physicsWorld.defaultContactMaterial.restitution = 0.55;
  physicsWorld.defaultContactMaterial.friction = 0.35;

  // 3. Build Entities
  window.createStadium();
  window.createPitch();
  window.createWickets();
  window.createPlayers();

  window.addEventListener('resize', onWindowResize);

  // Run isolated asset test
  // runIsolatedAssetTest(scene);
}

// ============================================================================
// APEX CRICKET 26 - ISOLATED ASSET VISIBILITY TEST
// ============================================================================
function runIsolatedAssetTest(scene) {
  console.log("✈️ Starting isolated asset loading sandbox test...");

  // Safe, non-blocking check to ensure THREE.FBXLoader and THREE.GLTFLoader are available
  if (typeof THREE.FBXLoader === 'undefined') {
    console.error("❌ Test Failed: THREE.FBXLoader is not defined in the browser window script scope.");
    return;
  }
  if (typeof THREE.GLTFLoader === 'undefined') {
    console.error("❌ Test Failed: THREE.GLTFLoader is not defined in the browser window script scope.");
    return;
  }

  // 1. FBX Player Load
  const fbxLoader = new THREE.FBXLoader();
  const fbxPath = 'models/players/indiancricketplayer/animation/Idle.fbx';

  fbxLoader.load(
    fbxPath,
    (fbxObject) => {
      console.log("🎯 SUCCESS: FBX file successfully reached the callback loop!");
      console.log("Raw Loaded FBX Object Structure:", fbxObject);

      // Print raw loaded FBX transform
      console.log("FBX POSITION (RAW):", fbxObject.position);
      console.log("FBX SCALE (RAW):", fbxObject.scale);
      console.log("FBX ROTATION (RAW):", fbxObject.rotation);

      // Calculate bounds of raw model
      const box = new THREE.Box3().setFromObject(fbxObject);
      console.log("FBX BOX MIN (RAW):", box.min);
      console.log("FBX BOX MAX (RAW):", box.max);

      const center = new THREE.Vector3();
      box.getCenter(center);
      console.log("FBX BOX CENTER (RAW):", center);

      const size = new THREE.Vector3();
      box.getSize(size);
      console.log("FBX SIZE (RAW):", size);
      console.log("FBX HEIGHT (RAW):", size.y);

      // Log camera info
      if (window.camera) {
        console.log("Camera Position", window.camera.position);
        console.log("Camera Rotation", window.camera.rotation);
      } else {
        console.warn("Camera is not defined yet.");
      }

      console.log("Current Global Scene Children Tree Array:", scene.children);
    },
    (xhr) => {
      if (xhr.total > 0) {
        console.log(`FBX Loading Progress: ${((xhr.loaded / xhr.total) * 100).toFixed(0)}%`);
      }
    },
    (loaderError) => {
      console.error("❌ CRITICAL: FBX Loader failed to process the asset file path target:", loaderError);
    }
  );

  // 2. GLB Stadium Load
  const gltfLoader = new THREE.GLTFLoader();
  const glbPath = 'models/stadiums/ekana_stadium_low_poly_lucknow_city_game_asset.glb';

  gltfLoader.load(
    glbPath,
    (gltf) => {
      console.log("🎯 SUCCESS: GLB file successfully reached the callback loop!");
      const debugStadium = gltf.scene;

      // Print raw loaded GLB transform
      console.log("GLB POSITION (RAW):", debugStadium.position);
      console.log("GLB SCALE (RAW):", debugStadium.scale);
      console.log("GLB ROTATION (RAW):", debugStadium.rotation);

      // Calculate bounds of raw model
      const box = new THREE.Box3().setFromObject(debugStadium);
      console.log("GLB BOX MIN (RAW):", box.min);
      console.log("GLB BOX MAX (RAW):", box.max);

      const center = new THREE.Vector3();
      box.getCenter(center);
      console.log("GLB BOX CENTER (RAW):", center);

      const size = new THREE.Vector3();
      box.getSize(size);
      console.log("GLB SIZE (RAW):", size);
      console.log("GLB HEIGHT (RAW):", size.y);

      console.log("Current Global Scene Children Tree Array:", scene.children);
    },
    (xhr) => {
      if (xhr.total > 0) {
        console.log(`GLB Loading Progress: ${((xhr.loaded / xhr.total) * 100).toFixed(0)}%`);
      }
    },
    (loaderError) => {
      console.error("❌ CRITICAL: GLB Loader failed to process the asset file path target:", loaderError);
    }
  );
}



// ── 3D ENTITY CREATION FUNCTIONS ────────────────────────────────
window.swapBattingEnds = function() {
  const tempMesh = window.batsmanMesh;
  window.batsmanMesh = window.nonStrikerMesh;
  window.nonStrikerMesh = tempMesh;
  
  if (window.batsmanMesh) {
    window.batMesh = window.batsmanMesh.parts ? window.batsmanMesh.parts.batBlade : null;
  }
};

window.snapBatsmenToCreases = function() {
  window.runningState = 'idle';
  window.runProgress = 0;
  
  if (window.batsmanMesh) {
    window.batsmanMesh.position.set(window.stanceX || 0.8, 0, window.BATSMAN_CREASE_Z);
    window.batsmanMesh.rotation.set(0, Math.PI / 2, 0);
    if (!window.batsmanMesh.isFBX && window.batsmanMesh.parts) {
      if (window.batsmanMesh.parts.leftLeg) window.batsmanMesh.parts.leftLeg.rotation.x = 0;
      if (window.batsmanMesh.parts.rightLeg) window.batsmanMesh.parts.rightLeg.rotation.x = 0;
      if (window.batsmanMesh.parts.leftArm) window.batsmanMesh.parts.leftArm.rotation.x = 0.1;
      if (window.batsmanMesh.parts.rightArm) window.batsmanMesh.parts.rightArm.rotation.x = 0.1;
    }
  }
  if (window.nonStrikerMesh) {
    window.nonStrikerMesh.position.set(-1.2, 0, window.nonStrikerStartZ);
    window.nonStrikerMesh.rotation.set(0, 0, 0);
    if (!window.nonStrikerMesh.isFBX && window.nonStrikerMesh.parts) {
      if (window.nonStrikerMesh.parts.leftLeg) window.nonStrikerMesh.parts.leftLeg.rotation.x = 0;
      if (window.nonStrikerMesh.parts.rightLeg) window.nonStrikerMesh.parts.rightLeg.rotation.x = 0;
      if (window.nonStrikerMesh.parts.leftArm) window.nonStrikerMesh.parts.leftArm.rotation.x = 0.1;
      if (window.nonStrikerMesh.parts.rightArm) window.nonStrikerMesh.parts.rightArm.rotation.x = 0.1;
    }
  }
  if (window.updateCreaseTracker) {
    window.updateCreaseTracker(0, false);
  }
};

function setupNextDelivery() {
  if (window.replaySystem) {
    window.replaySystem.isRecording = true;
    window.replaySystem.clearHistory();
  }
  window.cancelReturnBall = true; // Abort any active return throw animation from previous ball
  // Cancel any pending catch ballDead timer from the previous ball so it
  // cannot flip ballDead on this fresh delivery.
  if (window.catchBallDeadTimer) { clearTimeout(window.catchBallDeadTimer); window.catchBallDeadTimer = null; }
  hasSwungThisBall = false;
  
  window.lbwImpactPos = null;
  window.lbwImpactVel = null;
  window.ballBounceX = undefined;
  window.ballMissed = false;
  if (window.MATCH) {
    window.MATCH.ballPathHistory = [];
  }
  
  const outCard = document.getElementById('out-batsman-card');
  if (outCard) outCard.classList.add('hidden');
  
  // Hide all user bowling overlay screens
  const bowlerSelect = document.getElementById('bowler-selection-screen');
  if (bowlerSelect) bowlerSelect.classList.add('hidden');
  const consoleHud = document.getElementById('bowling-console-hud');
  if (consoleHud) consoleHud.classList.add('hidden');
  swingPhase     = 0;
  swingT         = 0;
  swingPressTime = -999;
  swingResolved  = false;
  aimDirection   = 0;
  shotDirection  = 0;
  runningState   = 'idle';
  runProgress    = 0;
  bowlerReleased = false;

  // Snap batsman and non-striker back to crease positions
  if (typeof window.snapBatsmenToCreases === 'function') {
    window.snapBatsmenToCreases();
  }
  bowlerAnimState = BOWLER_ANIM_STATES.IDLE;
  bowlerAnimTime  = 0;
  ballBounceDetected = false;
  swingForceApplied  = false;
  window.fielderRetrieved   = false;
  if (window.landingMarker) {
    window.landingMarker.material.opacity = 0;
    window.landingMarker.visible = false;
  }
  // Clear every per-delivery latch. Keeper collection previously left

  // ballDead=true, making all following deliveries end immediately.
  MATCH.ballDead = false;
  MATCH.isWideThisBall = false;
  MATCH.pendingRun = false;
  MATCH.catchPossible = false;
  MATCH.completedRuns = 0;
  MATCH.deliveryStrikerIndex = MATCH.strikerIndex;
  MATCH.ballBouncedSinceHit = false;
  window.keeperHasBall = false;
  window.keeperFumbledThisBall = false;
  
  // Reset AI batsman parameters
  MATCH.aiSwingTargetDt = 0;
  MATCH.aiTargetStanceX = 0;
  MATCH.aiIsDefensive = false;
  MATCH.aiIsLofted = false;
  MATCH.aiShotAngle = 0;
  // Remove temporary bowler fielder if present
  if (window.fielders) {
    window.fielders = window.fielders.filter(f => f.id !== 'bowler-fielder');
  }
  // Reset all fielders (including bowler mesh) to starting positions and FSM states
  if (typeof window.resetAllFieldersToHome === 'function') {
    window.resetAllFieldersToHome();
  }
  window.hideShotAimUI();

  // If a new over starts, clear the history circles
  if (MATCH.balls % 6 === 0 && MATCH.balls > 0) {
    MATCH.overHistory = [];
    if (window.updateHUD) {
      window.updateHUD();
    }
  }

  // Sync layout back to Bowling on phone (for PvP Mode)
  if (socket && matchMode === MODES.PVP) {
    socket.emit('layout-change', { layout: 'bowling' });
  }

  // Define upcoming ball (AI select vs. Player 2 Select vs. User Select)
  const userTeamVal = window.MATCH.userTeam || 'IND';
  const oppTeamVal = window.MATCH.oppTeam || 'AUS';
  const userTeam = window.TEAMS[userTeamVal] || window.TEAMS.IND;
  const oppTeam = window.TEAMS[oppTeamVal] || window.TEAMS.AUS;

  if (matchMode === MODES.SOLO) {
    if (MATCH.userIsBatting) {
      const roll = Math.floor(Math.random() * DELIVERIES.length);
      const delivery = DELIVERIES[roll];
      deliveryType = delivery.name;
      deliverySpeedKmh = Math.round(delivery.speed * 3.6);

      ui.revealText.innerText = 'INCOMING...';
      ui.revealPanel.classList.add('visible');
      
      const overIndex = Math.floor(MATCH.balls / 6);
      const activeBowler = window.getOpponentBowlerForOver ? window.getOpponentBowlerForOver(overIndex, oppTeam) : (oppTeam.bowler || "A. VECTOR (AI)");
      if (window.loadBowlerStats) {
        window.loadBowlerStats(activeBowler);
      } else {
        MATCH.bowlerName = activeBowler;
        if (ui.bowlerName) ui.bowlerName.innerText = activeBowler;
      }
      ui.bowlerSpeed.innerHTML = `-- <span>km/h</span>`;
      ui.revealPill.style.display = 'none';

      // Trigger run-up after 1.5s banner duration, checking that no feedback card is still showing
      const startTimer = () => {
        // Do not fire during entrance cutscene — wait until it ends
        if (window.entranceCutsceneActive || window.wicketCutsceneActive) {
          setTimeout(startTimer, 500);
          return;
        }
        const shotCardVisible = ui.shotCard && !ui.shotCard.classList.contains('hidden');
        const feedbackVisible = ui.feedbackPanel && ui.feedbackPanel.classList.contains('show');
        const broadcastVisible = ui.broadcastOverlay && !ui.broadcastOverlay.classList.contains('hidden');
        
        if (shotCardVisible || feedbackVisible || broadcastVisible) {
          setTimeout(startTimer, 500);
        } else {
          ui.revealPanel.classList.remove('visible');
          if (gameState === STATES.BOWL_READY && matchMode === MODES.SOLO && MATCH.userIsBatting) {
            bowlerAnimState = BOWLER_ANIM_STATES.RUNUP;
            bowlerAnimTime = 0;
          }
        }
      };
      setTimeout(startTimer, 1000);




    } else {
      // User is bowling!
      ui.bowlerSpeed.innerHTML = `-- <span>km/h</span>`;
      ui.revealText.innerText = 'YOUR TURN TO BOWL';
      ui.revealPanel.classList.add('visible');
      
      MATCH.bowlerRunupActive = false;
      MATCH.bowlerReleasePressed = false;
      MATCH.bowlerReleaseScore = null;
      MATCH.isNoBallThisBall = false; // Reset No-Ball flag
      MATCH.bowlingTargetX = 0;
      MATCH.bowlingTargetZ = -4.0; // Default to Good Length
      deliveryType = 'Straight';

      const isOverEnded = (MATCH.balls === 0 || MATCH.balls % 6 === 0);
      if (isOverEnded) {
        window.currentBowlingStep = window.BOWLING_STEPS.SELECT_BOWLER;
      } else {
        window.currentBowlingStep = window.BOWLING_STEPS.SELECT_LOCATION;
      }

      // Show selection after cards are cleared
      const startSelectionTimer = () => {
        console.log('[DEBUG] startSelectionTimer fired! entranceCutsceneActive:', window.entranceCutsceneActive, 'wicketCutsceneActive:', window.wicketCutsceneActive);
        // Do not fire during entrance cutscene — wait until it ends
        if (window.entranceCutsceneActive || window.wicketCutsceneActive) {
          setTimeout(startSelectionTimer, 500);
          return;
        }
        const shotCardVisible = ui.shotCard && !ui.shotCard.classList.contains('hidden');
        const feedbackVisible = ui.feedbackPanel && ui.feedbackPanel.classList.contains('show');
        const broadcastVisible = ui.broadcastOverlay && !ui.broadcastOverlay.classList.contains('hidden');
        console.log('[DEBUG] startSelectionTimer checks:', { shotCardVisible, feedbackVisible, broadcastVisible });
        
        if (shotCardVisible || feedbackVisible || broadcastVisible) {
          setTimeout(startSelectionTimer, 500);
        } else {
          ui.revealPanel.classList.remove('visible');
          if (isOverEnded) {
            console.log('[DEBUG] Over ended or match start. Calling window.showBowlerSelection() from game.js!');
            window.showBowlerSelection();
          } else {
            console.log('[DEBUG] Mid-over ball. Directly calling window.startLocationSelection() from game.js!');
            window.startLocationSelection();
          }
        }
      };
      setTimeout(startSelectionTimer, 1000);




    }
  } else {
    // PVP MODE - Wait for Player 2 (Phone) to select and release
    ui.revealText.innerText = 'WAITING FOR BOWLER...';
    ui.revealPanel.classList.add('visible');
    
    MATCH.bowlerName = "PLAYER 2";
    ui.bowlerSpeed.innerHTML = `-- <span>km/h</span>`;
    ui.revealPill.style.display = 'none';
  }
  ui.bowlerName.innerText = MATCH.bowlerName;

  // Reset ball position — place in bowler's hand (not floating in air)
  ballBody.type = CANNON.Body.DYNAMIC;
  ballBody.mass = 0.16;
  ballBody.updateMassProperties();
  ballBody.position.set(0.5, 0.85, -34.0); // Bowler's right hand level when idle
  ballBody.velocity.set(0, 0, 0);
  ballBody.angularVelocity.set(0, 0, 0);
  ballBody.linearDamping = 0.02; // Reset rolling resistance
  if (ballMesh) ballMesh.visible = true;

  // Reset wickets to static (batsman-end at WICKET_Z and bowler-end at -22.4)
  stumpBodies.forEach((body, idx) => {
    body.mass = 0;
    body.type = CANNON.Body.STATIC;
    const isBatsmanEnd = idx < 3;
    const wz = isBatsmanEnd ? WICKET_Z : -22.4;
    const localIdx = isBatsmanEnd ? idx : idx - 3;
    body.position.set((localIdx - 1) * 0.11, 0.36, wz);
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.quaternion.set(0, 0, 0, 1);
    
    stumpsVisuals[idx].position.copy(body.position);
    stumpsVisuals[idx].quaternion.copy(body.quaternion);
  });

  bailBodies.forEach((body, idx) => {
    body.mass = 0;
    body.type = CANNON.Body.STATIC;
    const isBatsmanEnd = idx < 2;
    const wz = isBatsmanEnd ? WICKET_Z : -22.4;
    const localIdx = isBatsmanEnd ? idx : idx - 2;
    const x = localIdx === 0 ? -0.055 : 0.055;
    body.position.set(x, 0.738, wz);
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
    body.quaternion.copy(q);

    bailsVisuals[idx].position.copy(body.position);
    bailsVisuals[idx].quaternion.copy(body.quaternion);
  });

  stumpBodies.forEach(b => b.updateMassProperties());
  bailBodies.forEach(b => b.updateMassProperties());

  // Reset fielders
  fielders.forEach(f => {
    f.pos.copy(f.startPos);
    f.mesh.position.copy(f.startPos);
    f.vel.set(0, 0, 0);
  });

  // Set camera mode based on who is batting
  if (MATCH.userIsBatting) {
    activeCameraMode = 'broadcast';
  } else {
    activeCameraMode = 'bowler';
  }
}

// ── BOWL BALL ENGINE (RELEASE TRIGGER) ──────────────────────────
function triggerBowlingRelease(overrideRating = null) {
  if (MATCH.bowlerReleasePressed) return;
  MATCH.bowlerReleasePressed = true;

  let rating = 'perfect';
  if (overrideRating) {
    rating = overrideRating;
  } else {
    const progress = MATCH.bowlerRunupProgress;
    if (progress < 0.40) {
      rating = 'poor'; // Early
    } else if (progress >= 0.40 && progress < 0.65) {
      rating = 'good'; // Good
    } else if (progress >= 0.65 && progress < 0.85) {
      rating = 'perfect'; // Perfect
    } else if (progress >= 0.85 && progress < 0.92) {
      rating = 'poor'; // Late
    } else {
      rating = 'noball'; // No-Ball
    }
  }

  MATCH.bowlerReleaseScore = rating;
  if (rating === 'noball') {
    MATCH.isNoBallThisBall = true;
  } else {
    MATCH.isNoBallThisBall = false;
  }

  // Show feedback on UI
  const feedback = document.getElementById('bowling-meter-feedback');
  if (feedback) {
    let displayText = 'PERFECT';
    if (rating === 'noball') {
      displayText = 'NO BALL';
    } else {
      const progress = MATCH.bowlerRunupProgress;
      if (progress < 0.40) displayText = 'EARLY';
      else if (progress >= 0.40 && progress < 0.65) displayText = 'GOOD';
      else if (progress >= 0.65 && progress < 0.85) displayText = 'PERFECT';
      else displayText = 'LATE';
    }
    feedback.innerText = displayText;
    feedback.className = `vertical-meter-feedback ${rating}`;
    
    // Clear feedback text after 1.2s
    setTimeout(() => {
      if (feedback.innerText === displayText) {
        feedback.innerText = '';
      }
    }, 1200);
  }

  // Only advance animation state immediately if user is batting (AI bowler) or PVP mode.
  // For user bowling, let the run-up animation complete naturally to the crease.
  if (MATCH.userIsBatting || matchMode === MODES.PVP) {
    bowlerAnimState = BOWLER_ANIM_STATES.LOADUP;
    bowlerAnimTime = 0;
  }

}

function bowlBall(steerAngle = 0, customType = '') {
  const oppTeamVal = window.MATCH.oppTeam || 'AUS';
  const oppTeam = window.TEAMS[oppTeamVal] || window.TEAMS.AUS;

  setGameState(STATES.BALL_IN_FLIGHT);
  if (ui.revealPanel) {
    ui.revealPanel.classList.remove('visible');
  }

  // Immediately hide all user bowling HUD elements upon delivery
  const consoleHud = document.getElementById('bowling-console-hud');
  if (consoleHud) consoleHud.classList.add('hidden');

  const meterCol = document.getElementById('bowling-vertical-meter-col');
  if (meterCol) meterCol.style.display = 'none';

  const wheelCol = document.querySelector('#bowling-delivery-wheel')?.closest('.bowling-hud-column');
  if (wheelCol) wheelCol.style.display = 'none';

  if (window.landingMarker) {
    window.landingMarker.visible = false;
  }
  
  let deliveryBase = window.DELIVERIES ? window.DELIVERIES[0] : null;
  if (customType) {
    deliveryBase = (window.DELIVERIES || []).find(d => d.type === customType) || deliveryBase;
  } else {
    deliveryBase = (window.DELIVERIES || []).find(d => d.name === deliveryType) || deliveryBase;
  }
  let delivery = deliveryBase ? { ...deliveryBase } : { name: 'Straight', speed: 38, type: 'fast', swing: 0 };
  deliveryType = delivery.name;
  deliverySpeedKmh = Math.round(delivery.speed * 3.6);

  let targetX = 0;
  let targetZ = 0.5;
  let speedMultiplier = 1.0;
  let accuracyOffset = 0;

// AI bowling - vary target length based on delivery type for variation
    if (MATCH.userIsBatting && matchMode === MODES.SOLO) {
      // ── AI SMART BOWLING ─────────────────────────────────────────────────
      const isRightHanded = ((window.stanceX || 0.8) > 0);
      const handednessOffset = isRightHanded ? 0.12 : -0.12;

      // Step 1: Roll a random length zone (weighted like a real bowler)
      const roll = Math.random();
      let chosenLength, chosenLabel;
      if (roll < 0.08) {
        // Yorker
        targetZ = -0.4 + (Math.random() - 0.5) * 0.4;
        targetX = (Math.random() - 0.5) * 0.4 + handednessOffset;
        chosenLength = 'yorker';
        chosenLabel = 'YORKER';
      } else if (roll < 0.18) {
        // Full toss / full
        targetZ = -1.2 + (Math.random() - 0.5) * 0.4;
        targetX = (Math.random() - 0.5) * 0.6 + handednessOffset;
        chosenLength = 'full';
        chosenLabel = 'FULL';
      } else if (roll < 0.50) {
        // Good length (most common)
        targetZ = -4.5 + (Math.random() - 0.5) * 1.5;
        targetX = (Math.random() - 0.5) * 0.7 + handednessOffset;
        chosenLength = 'good';
        chosenLabel = 'GOOD LENGTH';
      } else if (roll < 0.75) {
        // Short of good length
        targetZ = -7.5 + (Math.random() - 0.5) * 1.5;
        targetX = (Math.random() - 0.5) * 0.8 + handednessOffset;
        chosenLength = 'short';
        chosenLabel = 'SHORT';
      } else if (roll < 0.92) {
        // Short-pitched / bouncer
        targetZ = -11.0 + (Math.random() - 0.5) * 2.0;
        targetX = (Math.random() - 0.5) * 0.6 + handednessOffset;
        chosenLength = 'bouncer';
        chosenLabel = 'BOUNCER';
      } else {
        // Leg-side full (wide variation)
        targetZ = -2.5 + (Math.random() - 0.5) * 1.0;
        targetX = isRightHanded ? (-0.85 + (Math.random() - 0.5) * 0.2) : (0.85 + (Math.random() - 0.5) * 0.2);
        chosenLength = 'full';
        chosenLabel = 'LEG SIDE';
      }

      // Step 2: Pick a delivery TYPE that matches the length
      const typeRoll = Math.random();
      if (chosenLength === 'bouncer') {
        delivery = { name: 'Bouncer', speed: 41, type: 'bouncer', swing: 0 };
      } else if (chosenLength === 'yorker') {
        delivery = { name: 'FLAT YORKER', speed: 38, type: 'yorker', swing: 0 };
      } else if (typeRoll < 0.22) {
        delivery = { name: 'In-swing', speed: 37, type: 'fast', swing: -1.4 };
      } else if (typeRoll < 0.44) {
        delivery = { name: 'Out-swing', speed: 37, type: 'fast', swing: 1.4 };
      } else if (typeRoll < 0.58) {
        delivery = { name: 'Off-cutter', speed: 30, type: 'spin', breakVal: -1.8 };
      } else if (typeRoll < 0.72) {
        delivery = { name: 'Leg-cutter', speed: 30, type: 'spin', breakVal: 1.8 };
      } else if (typeRoll < 0.85) {
        delivery = { name: 'Slower', speed: 26, type: 'fast', swing: 0 };
      } else {
        delivery = { name: 'Straight', speed: 39, type: 'fast', swing: 0 };
      }

      // Step 2b: Compensate targetX for swing/spin so it finishes on the intended stump line!
      const swingShift = (delivery.swing || 0) * 0.35;
      const spinShift = (delivery.breakVal || 0) * 0.18;
      targetX = targetX - (swingShift + spinShift);

      // Step 3: Vary speed naturally (±8%)
      const speedVar = 0.92 + Math.random() * 0.16;
      delivery.speed = delivery.speed * speedVar;

      deliveryType = delivery.name;
      deliverySpeedKmh = Math.round(delivery.speed * 3.6);
      const overIndex = Math.floor(MATCH.balls / 6);
      const activeBowler = window.getOpponentBowlerForOver ? window.getOpponentBowlerForOver(overIndex, oppTeam) : (oppTeam.bowler || "A. VECTOR (AI)");
      if (window.loadBowlerStats) {
        window.loadBowlerStats(activeBowler);
      } else {
        MATCH.bowlerName = activeBowler;
      }
      ui.bowlerSpeed.innerHTML = `${deliverySpeedKmh} <span>km/h</span>`;

      // Show delivery label briefly - disabled for batting realism (user is not pre-notified of ball type)


    } else if (!MATCH.userIsBatting && matchMode === MODES.SOLO) {
     // User is bowling in solo mode!
     targetX = MATCH.bowlingTargetX;
     targetZ = MATCH.bowlingTargetZ;

    // Apply speed and accuracy multipliers based on release score
    const score = MATCH.bowlerReleaseScore || 'perfect';
    if (score === 'perfect') {
      speedMultiplier = 1.05;
      accuracyOffset = 0;
    } else if (score === 'good') {
      speedMultiplier = 0.95;
      accuracyOffset = (Math.random() - 0.5) * 0.10;
    } else if (score === 'poor') {
      speedMultiplier = 0.80;
      accuracyOffset = (Math.random() - 0.5) * 0.30;
    } else if (score === 'noball') {
      speedMultiplier = 0.85;
      accuracyOffset = (Math.random() - 0.5) * 0.20;
    } else {
      // Fallback for legacy scores
      speedMultiplier = 0.85;
      accuracyOffset = (Math.random() - 0.5) * 0.20;
    }
    console.log(`[User Bowling] Release rating: ${score}, speedMult: ${speedMultiplier}, accOffset: ${accuracyOffset}`);
    
    // Setup AI batsman decisions for this delivery
    MATCH.aiSwingTargetDt = 0.18 + (Math.random() - 0.5) * 0.04; // Trigger tArrival target (160ms to 200ms before arrival)
    MATCH.aiTargetStanceX = THREE.MathUtils.clamp(targetX + accuracyOffset + (Math.random() - 0.5) * 0.15, -1.2, 1.2);
    
    const choiceRoll = Math.random();
    const isYorker = (delivery && delivery.type === 'yorker') || targetZ > -0.5;
    const isBouncer = (delivery && delivery.type === 'bouncer') || targetZ < -6.0;
    
    if (isYorker) {
      if (choiceRoll < 0.60) {
        MATCH.aiIsDefensive = true;
        MATCH.aiIsLofted = false;
      } else if (choiceRoll < 0.90) {
        MATCH.aiIsDefensive = false;
        MATCH.aiIsLofted = false;
      } else {
        MATCH.aiIsDefensive = false;
        MATCH.aiIsLofted = true;
      }
    } else if (isBouncer) {
      if (choiceRoll < 0.50) {
        MATCH.aiIsDefensive = false;
        MATCH.aiIsLofted = true;
      } else if (choiceRoll < 0.85) {
        MATCH.aiIsDefensive = false;
        MATCH.aiIsLofted = false;
      } else {
        MATCH.aiIsDefensive = true;
        MATCH.aiIsLofted = false;
      }
    } else {
      if (choiceRoll < 0.20) {
        MATCH.aiIsDefensive = true;
        MATCH.aiIsLofted = false;
      } else if (choiceRoll < 0.75) {
        MATCH.aiIsDefensive = false;
        MATCH.aiIsLofted = false;
      } else {
        MATCH.aiIsDefensive = false;
        MATCH.aiIsLofted = true;
      }
    }
    MATCH.aiShotAngle = (Math.random() - 0.5) * Math.PI * 0.65;
  } else {
    if (matchMode === MODES.SOLO && MATCH.userIsBatting) {
      const currentStanceX = (window.stanceX || 0.8);
      const aiTargetBase = THREE.MathUtils.lerp(0, currentStanceX, 0.22);
      
      const estVz = delivery.speed * speedMultiplier;
      const tTotal = (0 - (-22.2)) / estVz;
      const estBounceZ = (delivery.type === 'bouncer') ? -7.0 : (delivery.type === 'yorker' ? -1.0 : -4.0);
      const tBounce = (estBounceZ - (-22.2)) / estVz;

      let swingComp = 0;
      if (delivery && delivery.swing) {
        const swingForce = delivery.swing * 0.45;
        const mass = 0.16;
        const accel = swingForce / mass;
        const tSwing = Math.min(tTotal, 12.2 / estVz);
        const tPostSwing = Math.max(0, tTotal - tSwing);
        swingComp = accel * tSwing * (0.5 * tSwing + tPostSwing);
      }

      let spinComp = 0;
      if (delivery && delivery.type === 'spin' && delivery.breakVal) {
        const breakVelX = delivery.breakVal * 0.48;
        const tPostBounce = Math.max(0, tTotal - tBounce);
        spinComp = breakVelX * tPostBounce;
      }

      targetX = aiTargetBase - swingComp - spinComp + (Math.random() - 0.5) * 0.06;
      const isRightHanded = (currentStanceX > 0);
      if (isRightHanded) {
        targetX = THREE.MathUtils.clamp(targetX, 0.0, 0.95);
      } else {
        targetX = THREE.MathUtils.clamp(targetX, -0.95, 0.0);
      }
    } else if (matchMode === MODES.SOLO && !MATCH.userIsBatting) {
      // User is bowling in solo mode: KEEP the user's aimed targetX and targetZ!
    } else {
      // PvP mode: player 2 aims with steerAngle
      targetX = stanceX + (steerAngle * 0.8) + (Math.random() - 0.5) * 0.08;
    }
  }

  const speed = delivery.speed * speedMultiplier;
  
  let releaseX = 0.8;
  let releaseY = 1.8;
  let releaseZ = -22.2;

  if (window.bowlerMesh && window.bowlerMesh.isFBX) {
    window.bowlerMesh.updateMatrixWorld(true);
    const handBone = window.bowlerMesh.getObjectByName('mixamorigRightHand');
    if (handBone) {
      const tempPos = new THREE.Vector3();
      handBone.getWorldPosition(tempPos);
      releaseX = tempPos.x;
      releaseY = Math.max(1.5, tempPos.y);
      releaseZ = Math.min(-21.0, tempPos.z);
    }
  }

  // ── KINEMATIC VELOCITY CALCULATION ───────────────────────────────────
  // Compute vz so ball travels from releaseZ to the crease (z≈0) in a realistic arc.
  // Then compute vy so the ball hits bounceZ (targetZ) at ground height.
  const g = 9.81;
  let vx, vy;

  if (!MATCH.userIsBatting && matchMode === MODES.SOLO) {
    // User bowling: target exactly where they aimed
    const bounceY = 0.05;
    const finalTargetX = targetX + accuracyOffset;
    const worldBounceZ = Math.max(releaseZ + 1.0, targetZ);
    const tBounce = (worldBounceZ - releaseZ) / speed;
    vx = (finalTargetX - releaseX) / tBounce;
    vy = (bounceY - releaseY + 0.5 * g * tBounce * tBounce) / tBounce;
    console.log(`[User Bowling] targetX: ${finalTargetX}, targetZ: ${worldBounceZ}, tBounce: ${tBounce.toFixed(3)}, vy: ${vy.toFixed(2)}`);
  } else {
    // AI bowling: use proper kinematics to hit targetZ at ground height
    const bounceY = delivery.type === 'bouncer' ? 0.06 : 0.04;
    const worldBounceZ = Math.max(releaseZ + 2.0, targetZ);
    const tBounce = (worldBounceZ - releaseZ) / speed;
    vy = (bounceY - releaseY + 0.5 * g * tBounce * tBounce) / tBounce;
    vx = (targetX - releaseX) / tBounce;
    console.log(`[AI Bowling] type: ${delivery.name}, targetZ: ${worldBounceZ.toFixed(1)}, tBounce: ${tBounce.toFixed(3)}, vy: ${vy.toFixed(2)}, vz: ${speed.toFixed(1)}`);
  }

  ballBody.type = CANNON.Body.DYNAMIC;
  ballBody.mass = 0.16;
  ballBody.updateMassProperties();
  ballBody.position.set(releaseX, releaseY, releaseZ);
  if (window.ballMesh) window.ballMesh.visible = true;
  ballBody.velocity.set(vx, vy, speed);
  ballBody.angularVelocity.set(0, 0, 0);

  // Calculate landing spot marker dynamically for UI
  const y0 = releaseY;
  const markerBounceY = 0.05;
  const ga = 0.5 * g;
  const gb = -vy;
  const gc = markerBounceY - y0;
  const discriminant = gb * gb - 4 * ga * gc;
  if (discriminant >= 0) {
    const tMarker = (-gb + Math.sqrt(discriminant)) / (2 * ga);
    const xBounce = releaseX + vx * tMarker;
    const zBounce = releaseZ + speed * tMarker;

    if (window.landingMarker) {
      window.landingMarker.position.set(xBounce, 0.052, zBounce);
      window.landingMarker.material.opacity = 0.8;
    }
  }

  // Display speed
  deliverySpeedKmh = Math.round(speed * 3.6);
  ui.bowlerSpeed.innerHTML = `${deliverySpeedKmh} <span>km/h</span>`;
  if (matchMode === MODES.SOLO) {
    ui.revealPill.style.display = 'none';
  } else {
    ui.revealPill.style.display = 'inline-block';
    ui.revealPill.innerText = delivery.type;
  }
}

// Batting Controller functions have been modularized to public/js/batting_controller.js

// ── GAMEPAD / CONTROLLER API ────────────────────────────────────
function initGamepad() {
  window.addEventListener('gamepadconnected', (e) => {
    gamepadIndex = e.gamepad.index;
    gamepadPrevButtons = Array(e.gamepad.buttons.length).fill(false);
    console.log(`Gamepad connected: ${e.gamepad.id}`);
    showGamepadStatus(e.gamepad.id);
    // Update settings panel indicator
    const dot  = document.getElementById('gamepad-dot');
    const name = document.getElementById('gamepad-detected-name');
    if (dot)  dot.classList.add('active');
    if (name) name.textContent = `Connected: ${e.gamepad.id.substring(0, 45)}`;
  });
  window.addEventListener('gamepaddisconnected', () => {
    gamepadIndex = null;
    gamepadPrevButtons = [];
    console.log('Gamepad disconnected');
    const dot  = document.getElementById('gamepad-dot');
    const name = document.getElementById('gamepad-detected-name');
    if (dot)  dot.classList.remove('active');
    if (name) name.textContent = 'No gamepad detected — plug in a controller or use keyboard';
    // Clear HUD label
    const label = document.getElementById('gamepad-status-label');
    if (label) label.innerText = '';
  });
}

function pollGamepad() {
  if (gamepadIndex === null) {
    // Scan for connected gamepads
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gamepadIndex = i;
        gamepadPrevButtons = Array(gamepads[i].buttons.length).fill(false);
        console.log(`Auto-detected gamepad at index ${i}: ${gamepads[i].id}`);
        showGamepadStatus(gamepads[i].id);
        const dot = document.getElementById('gamepad-dot');
        const name = document.getElementById('gamepad-detected-name');
        if (dot) dot.classList.add('active');
        if (name) name.textContent = `Connected: ${gamepads[i].id.substring(0, 45)}`;
        break;
      }
    }
  }

  if (gamepadIndex === null) return;
  const gp = navigator.getGamepads ? navigator.getGamepads()[gamepadIndex] : null;
  if (!gp) {
    gamepadIndex = null;
    return;
  }

  // Detect active gamepad usage to switch input mode
  let anyGamepadAction = false;
  for (let i = 0; i < gp.buttons.length; i++) {
    if (gp.buttons[i] && gp.buttons[i].pressed) {
      anyGamepadAction = true;
      break;
    }
  }
  if (!anyGamepadAction) {
    for (let i = 0; i < gp.axes.length; i++) {
      if (Math.abs(gp.axes[i]) > 0.25) {
        anyGamepadAction = true;
        break;
      }
    }
  }
  if (anyGamepadAction && typeof window.setInputMode === 'function') {
    window.setInputMode('gamepad');
  }

  // Map standard layout:
  // Button 0 = Cross (hit), 1 = Circle (defend), 2 = Square (yorker/shot), 3 = Triangle (loft)
  // Button 4 = L1 (cancel run), 5 = R1 (call run), 6 = L2, 7 = R2 (power)
  // Button 14 = D-pad Left, 15 = D-pad Right
  // Axes 0 = left stick X

  const pressed = (idx) => gp.buttons[idx] && gp.buttons[idx].pressed;
  const justPressed = (idx) => pressed(idx) && !(gamepadPrevButtons[idx] || false);

  // Set button state in controllerInput
  controllerInput.btnCircle = pressed(1);
  controllerInput.btnTriangle = pressed(3);
  controllerInput.btnSquare = pressed(2);
  controllerInput.btnR2 = pressed(7);

  // Menu navigation router for physical gamepad
  const isMenuActive = (window.ui && (
    (window.ui.mainMenu && !window.ui.mainMenu.classList.contains('hidden')) ||
    (document.getElementById('matchup-screen') && !document.getElementById('matchup-screen').classList.contains('hidden')) ||
    (document.getElementById('toss-screen') && !document.getElementById('toss-screen').classList.contains('hidden')) ||
    (document.getElementById('innings-break-screen') && !document.getElementById('innings-break-screen').classList.contains('hidden')) ||
    (document.getElementById('game-over') && !document.getElementById('game-over').classList.contains('hidden')) ||
    (document.getElementById('controls-screen') && !document.getElementById('controls-screen').classList.contains('hidden')) ||
    (document.getElementById('settings-screen') && !document.getElementById('settings-screen').classList.contains('hidden')) ||
    (document.getElementById('match-intro-screen') && !document.getElementById('match-intro-screen').classList.contains('hidden')) ||
    (document.getElementById('prematch-batsman-selection-screen') && !document.getElementById('prematch-batsman-selection-screen').classList.contains('hidden')) ||
    (document.getElementById('pause-settings-screen') && !document.getElementById('pause-settings-screen').classList.contains('hidden')) ||
    (document.getElementById('bowler-selection-screen') && !document.getElementById('bowler-selection-screen').classList.contains('hidden')) ||
    (document.getElementById('batsman-selection-screen') && !document.getElementById('batsman-selection-screen').classList.contains('hidden')) ||
    (document.getElementById('team-selection-overlay') && !document.getElementById('team-selection-overlay').classList.contains('hidden')) ||
    (document.getElementById('lineup-editor-overlay') && !document.getElementById('lineup-editor-overlay').classList.contains('hidden')) ||
    (document.getElementById('match-settings-modal') && !document.getElementById('match-settings-modal').classList.contains('hidden'))
  ));

  if (isMenuActive && typeof window.handleUINavigation === 'function') {
    let dpadActed = false;
    if (justPressed(12)) { window.handleUINavigation('UP'); dpadActed = true; }      // D-pad Up
    else if (justPressed(13)) { window.handleUINavigation('DOWN'); dpadActed = true; } // D-pad Down
    else if (justPressed(14)) { window.handleUINavigation('LEFT'); dpadActed = true; } // D-pad Left
    else if (justPressed(15)) { window.handleUINavigation('RIGHT'); dpadActed = true; } // D-pad Right

    // Left stick vertical/horizontal menu navigation with lockout to prevent rapid scrolling
    if (!dpadActed) {
      let moveY = gp.axes[1] || 0;
      let moveX = gp.axes[0] || 0;

      // Vertical Left Stick
      if (moveY < -0.6) {
        if (window._menuJoystickYLock !== -1) {
          window._menuJoystickYLock = -1;
          window.handleUINavigation('UP');
        }
      } else if (moveY > 0.6) {
        if (window._menuJoystickYLock !== 1) {
          window._menuJoystickYLock = 1;
          window.handleUINavigation('DOWN');
        }
      } else if (Math.abs(moveY) < 0.25) {
        window._menuJoystickYLock = 0;
      }

      // Horizontal Left Stick
      if (moveX < -0.6) {
        if (window._menuJoystickXLock !== -1) {
          window._menuJoystickXLock = -1;
          window.handleUINavigation('LEFT');
        }
      } else if (moveX > 0.6) {
        if (window._menuJoystickXLock !== 1) {
          window._menuJoystickXLock = 1;
          window.handleUINavigation('RIGHT');
        }
      } else if (Math.abs(moveX) < 0.25) {
        window._menuJoystickXLock = 0;
      }
    }

    if (justPressed(0)) window.handleUINavigation('SELECT'); // Cross
    if (justPressed(1)) window.handleUINavigation('BACK');   // Circle

  } else {
    // Standard gameplay triggers
    // Swing Trigger (Cross, Circle, Square, or Triangle)
    if (justPressed(0) || justPressed(1) || justPressed(2) || justPressed(3)) {
      window.triggerBatSwing();
    }

    // Running (R1 / D-pad Left to call run, L1 / D-pad Right to cancel run)
    if (justPressed(5) || justPressed(14)) window.callRun();
    if (justPressed(4) || justPressed(15)) window.cancelRun();
  }

  // Aiming (Left Stick/D-pad for movement, Right Stick for independent aiming with fallback)
  let moveX = gp.axes[0] || 0;
  let moveY = gp.axes[1] || 0;
  if (pressed(14)) moveX = -1.0;
  if (pressed(15)) moveX = 1.0;
  if (pressed(12)) moveY = -1.0; // D-pad Up
  if (pressed(13)) moveY = 1.0;  // D-pad Down

  let aimX = gp.axes[2] || 0; // Right stick X
  let aimY = gp.axes[3] || 0; // Right stick Y
  if (Math.abs(aimX) < 0.15 && Math.abs(aimY) < 0.15) {
    aimX = moveX; // fallback to Left Stick/D-pad if Right Stick is neutral
    aimY = moveY;
  }

  if (Math.abs(moveX) > 0.15 || Math.abs(moveY) > 0.15) {
    controllerInput.joystickX = Math.abs(moveX) > 0.15 ? moveX : 0;
    controllerInput.joystickY = Math.abs(moveY) > 0.15 ? moveY : 0;
  } else {
    controllerInput.joystickX = 0;
    controllerInput.joystickY = 0;
  }

  if (Math.abs(aimX) > 0.15 || Math.abs(aimY) > 0.15) {
    controllerInput.aimX = Math.abs(aimX) > 0.15 ? aimX : 0;
    controllerInput.aimY = Math.abs(aimY) > 0.15 ? aimY : 0;
  } else {
    controllerInput.aimX = 0;
    controllerInput.aimY = 0;
  }

  // Store for edge detection
  gamepadPrevButtons = gp.buttons.map(b => b.pressed);
}

function showGamepadStatus(id) {
  const label = id.substring(0, 28);
  const div = document.getElementById('gamepad-status-label');
  if (div) div.innerText = `🎮 ${label}`;
}

// ── SHOT AIM DIRECTION UI ────────────────────────────────────────
function processBallResult() {
  try {
    // Guard against double-fire: catch wicket cutscene and fielder arc can both
    // try to enter RESULT state. Only the first invocation should count.
    if (window.MATCH.ballResultProcessed) return;
    window.MATCH.ballResultProcessed = true;

    const nextBallDelay = (MATCH && !MATCH.userIsBatting) ? 200 : 300;
    const isNB = MATCH.isNoBallThisBall;
    const isWide = MATCH.isWideThisBall;
    let ballOutcome = '0';
    const striker = MATCH.batters[MATCH.deliveryStrikerIndex];

    if (isWide) {
      // Wide ball: add +1 to team runs and bowler runs. Does NOT count as a ball faced for striker or a ball bowled.
      MATCH.runs += 1;
      MATCH.bowlerRuns += 1;
      ballOutcome = 'Wd';
      MATCH.isOutThisBall = false;
      MATCH.outType = '';
    } else if (isNB) {
      // No-Ball: add +1 to team runs and bowler runs, and batsman faced a ball
      MATCH.runs += 1;
      MATCH.bowlerRuns += 1;
      ballOutcome = 'Nb';
      if (striker) striker.balls += 1;

      // Batsman cannot be out off a No-ball (only run-out is allowed, which isn't coded, so they can't be out at all)
      MATCH.isOutThisBall = false;
      MATCH.outType = '';
    } else {
      // Normal ball: increment ball counts
      MATCH.balls += 1;
      MATCH.bowlerOversBalls += 1;
      if (striker) striker.balls += 1;
    }

    if (MATCH.isOutThisBall) {
      MATCH.wickets += 1;
      MATCH.bowlerWickets += 1;
      ballOutcome = 'W';

      // Update career stats
      profile.wickets += 1;

      // Trigger heavy wicket vibration haptics!
      if (typeof window.vibrateController === 'function') {
        window.vibrateController(600);
      }

      // Bring in new batsman if we haven't crossed the 2-wicket game limit
  // Bring in new batsman is now fully handled in the batsman selection/cutscene stage flow.
    } else {
      const runs = MATCH.runsThisBall;
      
      // Add all runs (boundaries or manual runs) here at the end of the ball
      if (runs > 0) {
        MATCH.runs += runs;
        if (striker && !isWide) striker.runs += runs;
        if (!isWide && MATCH.userIsBatting) profile.runs += runs;
        
        // Stamina drain for boundaries (manual runs stamina is already drained in real-time)
        if (striker && runs >= 4 && !isWide) {
          striker.stamina = Math.max(0, striker.stamina - (runs * 3));
          // Trigger double-pulse haptics for boundaries (4s and 6s)!
          if (typeof window.vibrateController === 'function') {
            window.vibrateController([150, 100, 150]);
          }
        }
      }
      
      MATCH.bowlerRuns += runs;
      
      if (isWide) {
        if (runs > 0) {
          ballOutcome = `Wd+${runs}`;
        } else {
          ballOutcome = 'Wd';
        }
      } else if (isNB) {
        if (runs > 0) {
          ballOutcome = `Nb+${runs}`;
        } else {
          ballOutcome = 'Nb';
        }
      } else {
        ballOutcome = runs.toString();
      }

      // Stamina recovery on dot balls
      if (runs === 0) {
        if (striker) striker.stamina = Math.min(100, striker.stamina + 4);
        const nonStriker = MATCH.batters[1 - MATCH.deliveryStrikerIndex];
        if (nonStriker) nonStriker.stamina = Math.min(100, nonStriker.stamina + 2);
      }
    }

    // ── RECORD WAGON WHEEL STATS ─────────────────────────────────
    if (ballBody && MATCH.wagonWheel) {
      const ballPos = ballBody.position;
      const dist = Math.sqrt(ballPos.x * ballPos.x + (ballPos.z + 10) * (ballPos.z + 10));
      const angle = Math.atan2(ballPos.x, ballPos.z + 10);
      MATCH.wagonWheel.push({
        angle: angle,
        distance: dist,
        runs: MATCH.runsThisBall
      });
    }

    // Push outcome to over tracker
    MATCH.overHistory.push(ballOutcome);

    // Update bowler overs string
    const bo = Math.floor(MATCH.bowlerOversBalls / 6);
    const bof = MATCH.bowlerOversBalls % 6;
    MATCH.bowlerOversString = `${bo}.${bof}`;

    // Update game overs string
    const go = Math.floor(MATCH.balls / 6);
    const gof = MATCH.balls % 6;
    MATCH.oversString = `${go}.${gof}`;

    // Strike rotation at over completion
    if (MATCH.balls % 6 === 0) {
      MATCH.strikerIndex = 1 - MATCH.strikerIndex;
      if (typeof window.swapBattingEnds === 'function') {
        window.swapBattingEnds();
      }
    }

    if (window.saveCurrentBowlerStats) {
      window.saveCurrentBowlerStats();
    }

    window.updateHUD();

    // Reset ball variables
    MATCH.runsThisBall = 0;
    MATCH.isOutThisBall = false;
    MATCH.outType = '';
    window.MATCH.ballResultProcessed = false; // Ready for next ball

    // Check Win/Lose conditions
    if (MATCH.currentInnings === 1) {
      if (MATCH.wickets >= 10 || MATCH.balls >= MATCH.maxBalls) {
        // Innings 1 completed!
        MATCH.firstInningsRuns = MATCH.runs;
        MATCH.target = MATCH.firstInningsRuns + 1;
        
        const userTeamVal = window.MATCH.userTeam || 'IND';
        const oppTeamVal = window.MATCH.oppTeam || 'AUS';
        const userTeam = window.TEAMS[userTeamVal] || window.TEAMS.IND;
        const oppTeam = window.TEAMS[oppTeamVal] || window.TEAMS.AUS;
        const batTeamName = MATCH.userIsBatting ? userTeam.name : oppTeam.name;
        const chaseTeamName = MATCH.userIsBatting ? oppTeam.name : userTeam.name;
        
        document.getElementById('innings-completed-text').innerText = `${batTeamName.toUpperCase()}: ${MATCH.runs}/${MATCH.wickets}`;
        document.getElementById('innings-target-val').innerText = `${MATCH.target} Runs`;
        document.getElementById('innings-equation-val').innerText = `${chaseTeamName} need ${MATCH.target} Runs from ${MATCH.maxBalls} balls`;
        
        // Swap roles for Inning 2
        MATCH.userIsBatting = !MATCH.userIsBatting;
        MATCH.currentInnings = 2;
        
        setTimeout(() => {
          const breakScreen = document.getElementById('innings-break-screen');
          if (breakScreen) breakScreen.classList.remove('hidden');
        }, 1500);
      } else {
        setTimeout(() => setGameState(STATES.NEXT_BALL), nextBallDelay);
      }




    } else {
      // Innings 2 checks
      if (MATCH.runs >= MATCH.target) {
        // Batting side successfully chased
        const userWon = MATCH.userIsBatting;
        profile.played += 1;
        if (userWon) {
          profile.won += 1;
          profile.xp += 150;
          if (typeof window.unlockAchievement === 'function') {
            window.unlockAchievement('match_winner');
          }
          if (ui.endTitle) {
            ui.endTitle.innerText = 'MATCH VICTORY';
            ui.endTitle.className = 'victory';
          }
          if (ui.endSubtitle) ui.endSubtitle.innerText = 'You successfully chased down the target!';
        } else {
          profile.lost += 1;
          profile.xp += 50;
          if (ui.endTitle) {
            ui.endTitle.innerText = 'MATCH DEFEAT';
            ui.endTitle.className = 'out';
          }
          if (ui.endSubtitle) ui.endSubtitle.innerText = 'The opponent chased down the target.';
        }
        window.saveProfile();
        setGameState(STATES.GAME_OVER);
      } else if (MATCH.wickets >= 10 || MATCH.balls >= MATCH.maxBalls) {
        // Bowling side successfully defended
        const userWon = !MATCH.userIsBatting;
        profile.played += 1;
        if (userWon) {
          profile.won += 1;
          profile.xp += 150;
          if (typeof window.unlockAchievement === 'function') {
            window.unlockAchievement('match_winner');
          }
          if (ui.endTitle) {
            ui.endTitle.innerText = 'MATCH VICTORY';
            ui.endTitle.className = 'victory';
          }
          if (ui.endSubtitle) ui.endSubtitle.innerText = 'Superb bowling! You defended the target successfully.';
        } else {
          profile.lost += 1;
          profile.xp += 50;
          if (ui.endTitle) {
            ui.endTitle.innerText = 'MATCH DEFEAT';
            ui.endTitle.className = 'out';
          }
          if (ui.endSubtitle) ui.endSubtitle.innerText = 'The opponent successfully defended the target.';
        }
        window.saveProfile();
        setGameState(STATES.GAME_OVER);
      } else {
        setTimeout(() => setGameState(STATES.NEXT_BALL), nextBallDelay);
      }




    }
  } catch (err) {
    console.error('[CRASH] Error inside processBallResult:', err);
    fetch('/log', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ type: 'error', msg: 'CRASH inside processBallResult: ' + err.message, stack: err.stack })
    }).catch(() => {});
  }
}


function resetFieldForBowl() {
  window.ballSettled = false;
  if (window.landingMarker) {
    window.landingMarker.material.opacity = 0;
    window.landingMarker.visible = false;
  }
  const isSpinner = window.isBowlerSpinner(window.MATCH ? window.MATCH.bowlerName : null);
  const startZ = isSpinner ? -26.0 : -34.0;
  ballBody.position.set(0.5, 0.85, startZ); // Bowler's hand height at run-up start
  ballBody.velocity.set(0,0,0);
  ballBody.angularVelocity.set(0,0,0);

  stanceX = 0;
  if (typeof window.snapBatsmenToCreases === 'function') {
    window.snapBatsmenToCreases();
  }

  // Ensure all fielders are cleanly reset to their default starting home positions and FSM states
  if (typeof window.resetAllFieldersToHome === 'function') {
    window.resetAllFieldersToHome();
  }

  setGameState(STATES.BOWL_READY);
}


function openOpeningLineupSelection() {
  if (typeof window.openOpeningLineupSelection === 'function') {
    window.openOpeningLineupSelection(restartMatch);
  } else {
    console.error("window.openOpeningLineupSelection is not loaded!");
  }
}

window.makeLBWAppeal = function() {
  if (!window.lbwAppealActive) return;
  window.lbwAppealActive = false;
  
  const card = document.getElementById('lbw-appeal-card');
  if (card) card.classList.add('hidden');
  
  const d = window.lbwAppealData;
  if (d) {
    window.triggerLBWAppeal(d.pitchingStatus, d.impactStatus, d.wicketsStatus, d.hitsStumps, d.finalDecision);
  }
};

window.declineLBWAppeal = function() {
  if (!window.lbwAppealActive) return;
  window.lbwAppealActive = false;
  
  const card = document.getElementById('lbw-appeal-card');
  if (card) card.classList.add('hidden');
  
  // Unfreeze ball and continue play
  if (window.ballBody) {
    if (window.CANNON) {
      window.ballBody.type = window.CANNON.Body.DYNAMIC;
    }
  }
  if (window.ballMesh) {
    window.ballMesh.visible = true;
  }
  
  // Resume play
  if (typeof window.setGameState === 'function') {
    window.setGameState(window.STATES.MISS);
  }
};


window.getOpponentBowlerForOver = function(overIndex, oppTeam) {
  if (!oppTeam || !oppTeam.lineup) return "A. VECTOR (AI)";
  // In a 2-over match, rotate through the squad's specialized bowlers (typically lineup positions 8, 9, 10)
  const bowlerIdx = 8 + (overIndex % 3);
  return oppTeam.lineup[bowlerIdx] || oppTeam.bowler || "A. VECTOR (AI)";
};

window.saveCurrentBowlerStats = function() {
  if (window.MATCH && window.MATCH.bowlerName) {
    if (!window.MATCH.bowlerStats) window.MATCH.bowlerStats = {};
    window.MATCH.bowlerStats[window.MATCH.bowlerName] = {
      runs: window.MATCH.bowlerRuns,
      wickets: window.MATCH.bowlerWickets,
      balls: window.MATCH.bowlerOversBalls,
      oversString: window.MATCH.bowlerOversString
    };
  }
};

window.loadBowlerStats = function(newBowlerName) {
  if (!window.MATCH) return;
  if (!window.MATCH.bowlerStats) window.MATCH.bowlerStats = {};
  
  // Save current bowler's stats first
  window.saveCurrentBowlerStats();

  // Initialize if not present
  if (!window.MATCH.bowlerStats[newBowlerName]) {
    window.MATCH.bowlerStats[newBowlerName] = {
      runs: 0,
      wickets: 0,
      balls: 0,
      oversString: '0.0'
    };
  }

  const stats = window.MATCH.bowlerStats[newBowlerName];
  window.MATCH.bowlerRuns = stats.runs;
  window.MATCH.bowlerWickets = stats.wickets;
  window.MATCH.bowlerOversBalls = stats.balls;
  window.MATCH.bowlerOversString = stats.oversString;
  window.MATCH.bowlerName = newBowlerName;

  if (window.ui) {
    if (window.ui.bowlerName) window.ui.bowlerName.innerText = newBowlerName;
    if (window.ui.bowlerWickets) window.ui.bowlerWickets.innerText = stats.wickets;
    if (window.ui.bowlerRuns) window.ui.bowlerRuns.innerText = stats.runs;
    if (window.ui.bowlerOvers) window.ui.bowlerOvers.innerText = stats.oversString;
  }
};


// ── UPDATE BROADCAST HUD ────────────────────────────────────────
function restartMatch() {
  if (window.cleanupMatchTrophy) window.cleanupMatchTrophy();
  
  // Hide all user bowling overlay screens
  const bowlerSelect = document.getElementById('bowler-selection-screen');
  if (bowlerSelect) bowlerSelect.classList.add('hidden');
  const consoleHud = document.getElementById('bowling-console-hud');
  if (consoleHud) consoleHud.classList.add('hidden');

  // Hide out cards from previous match/innings
  const outCard = document.getElementById('out-batsman-card');
  if (outCard) outCard.classList.add('hidden');
  const newCard = document.getElementById('new-batsman-card');
  if (newCard) newCard.classList.add('hidden');

  // Hide prematch selection screen (if showing)
  const prematchScreen = document.getElementById('prematch-batsman-selection-screen');
  if (prematchScreen) prematchScreen.classList.add('hidden');

  // Opening Batsmen Selection Check:
  if (window.MATCH.userIsBatting && !window.prematchLineupSelected) {
    openOpeningLineupSelection();
    return;
  }

  MATCH.runs = 0;
  MATCH.wickets = 0;
  MATCH.balls = 0;
  MATCH.oversString = '0.0';
  MATCH.dismissedPlayerNames = [];
  MATCH.bowlerStats = {}; // Clear Bowler Stats history

  const userTeamVal = window.MATCH.userTeam || 'IND';
  const oppTeamVal = window.MATCH.oppTeam || 'AUS';
  const userTeam = window.TEAMS[userTeamVal] || window.TEAMS.IND;
  const oppTeam = window.TEAMS[oppTeamVal] || window.TEAMS.AUS;
  const battingTeam = MATCH.userIsBatting ? userTeam : oppTeam;
  const fieldingTeam = MATCH.userIsBatting ? oppTeam : userTeam;

  // Set opening batsmen
  if (MATCH.userIsBatting && window.prematchLineupSelected && window.prematchSelectedStriker && window.prematchSelectedNonStriker) {
    MATCH.batters = [
      { name: window.prematchSelectedStriker, runs: 0, balls: 0, stamina: 100 },
      { name: window.prematchSelectedNonStriker, runs: 0, balls: 0, stamina: 100 }
    ];
  } else {
    MATCH.batters = [
      { name: battingTeam.lineup[0], runs: 0, balls: 0, stamina: 100 },
      { name: battingTeam.lineup[1], runs: 0, balls: 0, stamina: 100 }
    ];
  }
  MATCH.strikerIndex = 0;
  MATCH.nextBatsmanIndex = 2;

  MATCH.bowlerWickets = 0;
  MATCH.bowlerRuns = 0;
  MATCH.bowlerOversBalls = 0;
  MATCH.bowlerOversString = '0.0';
  
  if (MATCH.userIsBatting) {
    const initialBowler = fieldingTeam.bowler || "A. VECTOR (AI)";
    window.loadBowlerStats(initialBowler);
    activeCameraMode = 'broadcast';
  } else {
    const initialBowler = `${userTeam.bowler || 'YOU'} (YOU)`;
    window.loadBowlerStats(initialBowler);
    activeCameraMode = 'bowler';
  }

  MATCH.overHistory = [];
  MATCH.wagonWheel = [];

  if (ui.overBallsTracker) {
    const circles = ui.overBallsTracker.querySelectorAll('.hud-ball-dot');
    circles.forEach(c => {
      c.innerText = ' ';
      c.className = 'hud-ball-dot';
    });
  }

  // Swaps jersey colors dynamically
  if (window.createPlayers) {
    window.createPlayers();
  }

  window.updateHUD();

  // Show pre-match entrance cutscene at the start of match (innings 1, first ball)
  if (MATCH.currentInnings === 1 && MATCH.balls === 0 && MATCH.runs === 0 && MATCH.wickets === 0) {
    window.startEntranceCutscene();
  } else {
    resetFieldForBowl();
  }
}

// ── FRAME RENDER & PHYSICS LOOP ────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  window.stanceX = stanceX;
  window.deliverySpeedKmh = deliverySpeedKmh;

  let dt = Math.min(clock.getDelta(), 0.1);
  dt *= (window.gameTimeScale || 1.0);

  if (gameState === STATES.REPLAY) {
    if (window.replaySystem) {
      window.replaySystem.update(dt);
    }
    if (window.keys && window.keys.space) {
      window.keys.space = false;
      if (window.replaySystem) {
        window.replaySystem.stopReplay();
      }
    }
    renderer.render(scene, camera);
    return;
  }

  // 1. Enforce physics updates if ball is in flight/hit (and exclude PAUSED/GAME_OVER)
  const isPlaying = (gameState !== STATES.SPLASH && gameState !== STATES.MAIN_MENU &&
    gameState !== STATES.WAITING_FOR_PHONE && gameState !== STATES.PAUSED &&
    gameState !== STATES.GAME_OVER);
  let prevBallZ = -21.5;
  let prevBallX = 0.8;
  let prevBallY = 1.8;

if (isPlaying) {
    // Record ball position before the physics step to prevent high-speed tunneling past stumps
    prevBallZ = ballBody.position.z;
    prevBallX = ballBody.position.x;
    prevBallY = ballBody.position.y;

    // Apply grass rolling resistance (damping = 0.35) if ball is rolling low on ground
    if ((gameState === STATES.HIT || gameState === STATES.BALL_IN_FLIGHT) && ballBody.position.y < 0.15) {
      ballBody.linearDamping = 0.35; // Rolling resistance on grass
    } else {
      ballBody.linearDamping = 0.02; // Standard air damping
    }

    physicsWorld.step((1 / 60) * (window.gameTimeScale || 1.0));

    if ((gameState === STATES.HIT || gameState === STATES.RUNNING) && ballBody.position.y <= 0.12) {
      window.MATCH.ballBouncedSinceHit = true;
      window.MATCH.catchPossible = false;
      if (window.MATCH.outType === 'CAUGHT') {
        window.MATCH.isOutThisBall = false;
        window.MATCH.outType = '';
      }
    }

    // ── LOCK BALL TO BOWLER'S HAND (pre-release) ────────────────────
    // While the bowler is idle/running-up/loading-up (not yet released),
    // pin the ball to his hand so it doesn't float in mid-air.
    const isBowlerPreRelease = !bowlerReleased && (
      gameState === STATES.BOWL_READY ||
      bowlerAnimState === BOWLER_ANIM_STATES.RUNUP ||
      bowlerAnimState === BOWLER_ANIM_STATES.LOADUP
    );
    if (isBowlerPreRelease && bowlerMesh && !window.entranceCutsceneActive && !window.wicketCutsceneActive) {
      const bPos = bowlerMesh.position;
      let handX = bPos.x - 0.1; // slightly inside (bowling arm side)
      let handY = 0.88;          // relaxed hand height
      let handZ = bPos.z;

      if (bowlerAnimState === BOWLER_ANIM_STATES.RUNUP) {
        // Swing hand in a natural arc with the running cycle
        const cycle = bowlerAnimTime * 14;
        handY = 0.92 + Math.sin(cycle) * 0.32;
        handZ = bPos.z + Math.cos(cycle) * 0.38;
      } else if (bowlerAnimState === BOWLER_ANIM_STATES.LOADUP) {
        // Arm cocked up-and-back ready to bowl
        handY = 1.65;
        handZ = bPos.z - 0.28;
      }

      ballBody.position.set(handX, handY, handZ);
      ballBody.velocity.set(0, 0, 0);
      ballBody.angularVelocity.set(0, 0, 0);
    }

    // Sync visual meshes to Cannon-es bodies
    // Skip ball sync during wicket cutscene (ball is locked at catch position)
    if (window.ballMesh && !window.wicketCutsceneActive) {
      ballMesh.position.copy(ballBody.position);
      ballMesh.quaternion.copy(ballBody.quaternion);
    }

    stumpBodies.forEach((body, idx) => {
      stumpsVisuals[idx].position.copy(body.position);
      stumpsVisuals[idx].quaternion.copy(body.quaternion);
    });

    bailBodies.forEach((body, idx) => {
      bailsVisuals[idx].position.copy(body.position);
      bailsVisuals[idx].quaternion.copy(body.quaternion);
    });

    // Update circular mini-map field radar dynamically
    updateRadar();
    window.updateStanceUI();

    const keybindsPanel = document.getElementById('batting-keybinds-panel');
    if (keybindsPanel) {
      const isBattingActive = (gameState === STATES.BOWL_READY || gameState === STATES.BALL_IN_FLIGHT || gameState === STATES.MISS) && MATCH.userIsBatting;
      if (isBattingActive) {
        keybindsPanel.classList.add('visible');
      } else {
        keybindsPanel.classList.remove('visible');
      }
    }

    const isBallActive = (gameState === STATES.BALL_IN_FLIGHT || gameState === STATES.HIT || gameState === STATES.RUNNING || gameState === STATES.BOWLED || gameState === STATES.MISS || gameState === STATES.OUT || gameState === STATES.CUTSCENE);
    if (isBallActive && window.replaySystem) {
      window.replaySystem.recordFrame();
    }
  }

  // 2. State Machine Update loops
  if (gameState === STATES.BOWL_READY) {
    if (matchMode === MODES.SOLO) {
      if (MATCH.userIsBatting) {
        // AI bowling run-up triggers automatically via setupNextDelivery setTimeout timer
      } else if (window.currentBowlingStep === window.BOWLING_STEPS.SELECT_LOCATION) {
        // User is bowling: steer the aim marker only during aiming step
        const steerDir = -1; // Invert horizontal steering since camera looks in negative Z direction
        const moveX = ((keys.arrowLeft || keys.a) ? -1 : ((keys.arrowRight || keys.d) ? 1 : 0)) * steerDir;
        const moveZ = (keys.arrowUp || keys.w) ? 1 : ((keys.arrowDown || keys.s) ? -1 : 0);

        MATCH.bowlingTargetX = THREE.MathUtils.clamp(MATCH.bowlingTargetX + moveX * 1.5 * dt, -1.2, 1.2);
        MATCH.bowlingTargetZ = THREE.MathUtils.clamp(MATCH.bowlingTargetZ + moveZ * 4.0 * dt, -10.0, 0.5);

        if (window.landingMarker) {
          window.landingMarker.position.set(MATCH.bowlingTargetX, 0.052, MATCH.bowlingTargetZ);
          window.landingMarker.material.opacity = 0.8;
        }
        if (typeof window.updateAimPreviewAndLengthHighlight === 'function') {
          window.updateAimPreviewAndLengthHighlight();
        }
      }
} else {
      // PVP MODE - Phone controller aims with joystick + triggers release with R2
      MATCH.bowlingTargetX = THREE.MathUtils.clamp((controllerInput.joystickX || 0) * 1.2, -1.2, 1.2);
      MATCH.bowlingTargetZ = THREE.MathUtils.clamp(-4.0 - (controllerInput.joystickY || 0) * 4.0, -10.0, 0.5);

      if (window.landingMarker) {
        window.landingMarker.position.set(MATCH.bowlingTargetX, 0.052, MATCH.bowlingTargetZ);
        window.landingMarker.material.opacity = 0.8;
      }
      if (typeof window.updateAimPreviewAndLengthHighlight === 'function') {
        window.updateAimPreviewAndLengthHighlight();
      }

      if (controllerInput.btnR2 && !bowlerReleased && bowlerAnimState === BOWLER_ANIM_STATES.IDLE) {
        bowlerAnimState = BOWLER_ANIM_STATES.RUNUP;
        bowlerAnimTime = 0;
      }
    }
  }

  if (gameState === STATES.BALL_IN_FLIGHT) {
    const ballPos = ballBody.position;
    const delivery = DELIVERIES.find(d => d.name === deliveryType);

    // If AI is batting (meaning user is bowling) and has not swung yet
    if (!MATCH.userIsBatting && matchMode === MODES.SOLO && !hasSwungThisBall) {
      const vz = Math.max(ballBody.velocity.z, 0.1);
      const dist = BATSMAN_CREASE_Z - ballPos.z;
      const tArrival = dist / vz;

      if (tArrival <= MATCH.aiSwingTargetDt) {
        // Apply AI shot preferences
        shotAngle = MATCH.aiShotAngle;
        aimDirection = MATCH.aiShotAngle;
        
        // Visual swing trigger
        window.triggerBatSwing();

        // Decouple timing resolution: simulate a realistic press time close to arrival
        // with a small random timing error based on AI difficulty/chance
        const timingError = (Math.random() - 0.48) * 0.16; // average timing error around -8ms to +24ms
        window.swingPressTime = window.clock.getElapsedTime() + tArrival - timingError;
        console.log(`[AI Batting] Swung at tArrival: ${tArrival.toFixed(3)}s. Simulated timing error: ${Math.round(timingError * 1000)}ms`);
      }
    }

    if (delivery && delivery.swing !== 0 && ballPos.z < -10 && !swingForceApplied) {
      ballBody.applyForce(new CANNON.Vec3(delivery.swing * 0.45, 0, 0), ballBody.position);
    }

    if (ballPos.y <= 0.08 && !ballBounceDetected && ballBody.velocity.y < 0) {
      ballBounceDetected = true;
      window.ballBounceX = ballPos.x;
      if (delivery && delivery.type === 'spin') {
        ballBody.velocity.x += delivery.breakVal * 0.48;
      }
    }

    // Sync pre-impact path coordinates for DRS
    if (gameState === STATES.BALL_IN_FLIGHT && ballPos.z < WICKET_Z + 0.5) {
      if (!window.MATCH.ballPathHistory) window.MATCH.ballPathHistory = [];
      window.MATCH.ballPathHistory.push(new THREE.Vector3(ballPos.x, ballPos.y, ballPos.z));
    }

    // Bowled, LBW and Miss Detection Checks
    if (ballPos.z >= 0.0) {
      // 1. LBW Pad Collision detection at Z = 0.0 (Crease)
      if (ballPos.z >= 0.0 && prevBallZ < 0.0) {
        const hasNoShot = !window.hasSwungThisBall;
        const hasMissed = window.ballMissed || hasNoShot;
        
        if (hasMissed) {
          const horizDist = Math.abs(ballPos.x - stanceX);
          const vertDist = ballPos.y;

          if (horizDist < 0.28 && vertDist < 0.85) {
            console.log(`[LBW DETECTED] Ball X: ${ballPos.x.toFixed(2)}, Y: ${ballPos.y.toFixed(2)}. StanceX: ${stanceX.toFixed(2)}`);
            
            window.lbwImpactPos = ballPos.clone();
            window.lbwImpactVel = ballBody.velocity.clone();

            const bX = window.ballBounceX !== undefined ? window.ballBounceX : ballPos.x;
            const isRightHanded = (stanceX > 0);
            let pitchingStatus = 'IN LINE';
            if (Math.abs(bX) > 0.22) {
              if (isRightHanded) {
                pitchingStatus = (bX > 0.22) ? 'OUTSIDE OFF' : 'OUTSIDE LEG';
              } else {
                pitchingStatus = (bX < -0.22) ? 'OUTSIDE OFF' : 'OUTSIDE LEG';
              }
            }

            let impactStatus = 'IN LINE';
            if (Math.abs(ballPos.x) > 0.22) {
              impactStatus = 'OUTSIDE';
            }

            const tStumps = (WICKET_Z - ballPos.z) / Math.max(ballBody.velocity.z, 0.1);
            const xAtStumps = ballPos.x + ballBody.velocity.x * tStumps;
            const gConst = 9.81;
            const yAtStumps = ballPos.y + ballBody.velocity.y * tStumps - 0.5 * gConst * tStumps * tStumps;

            let wicketsStatus = 'MISSING';
            let hitsStumps = false;

            if (Math.abs(xAtStumps) < 0.22 && yAtStumps > 0.0 && yAtStumps < 0.74) {
              hitsStumps = true;
              const isClipX = (Math.abs(xAtStumps) > 0.17 && Math.abs(xAtStumps) < 0.22);
              const isClipY = (yAtStumps > 0.68 && yAtStumps < 0.74);
              if (isClipX || isClipY) {
                wicketsStatus = "UMPIRE'S CALL";
              } else {
                wicketsStatus = "HITTING";
              }
            }

            let decision = 'OUT';
            if (pitchingStatus === 'OUTSIDE LEG') {
              decision = 'NOT OUT';
            } else if (impactStatus === 'OUTSIDE' && !hasNoShot) {
              decision = 'NOT OUT';
            } else if (!hitsStumps) {
              decision = 'NOT OUT';
            }

            window.triggerLBWAppeal(pitchingStatus, impactStatus, wicketsStatus, hitsStumps, decision);
            return;
          }
        }
      }

      // 2. Clean Bowled detection at stumps plane (Z = WICKET_Z)
      if (ballPos.z >= WICKET_Z && prevBallZ < WICKET_Z) {
        const t = (WICKET_Z - prevBallZ) / (ballPos.z - prevBallZ);
        const xAtStumps = prevBallX + t * (ballPos.x - prevBallX);
        const yAtStumps = prevBallY + t * (ballPos.y - prevBallY);
        
        const horizontalDist = Math.abs(xAtStumps);
        const verticalDist = yAtStumps;

        if (horizontalDist < 0.22 && verticalDist < 0.75) {
          setGameState(STATES.BOWLED);
          window.triggerWicketsClatter();
          return;
        }
      } 
      
      // 3. Past batsman limit -> MISS / dot ball
      else if (ballPos.z > 2.5) {
        setGameState(STATES.MISS);
        return;
      }
    }

    // Timing resolution: ball enters crease zone — resolve whether hit or miss
    if (ballPos.z >= BATSMAN_CREASE_Z - 0.6) {
      if (!swingResolved) {
        window.checkTiming();
      }
    }
  }

  // 3. Stance positioning and bat tracking
  if (window.tossCutsceneActive) {
    // Keep captains positioned on the pitch center facing each other
  } else if (isPlaying && !window.entranceCutsceneActive && !window.wicketCutsceneActive && !window.drsActive) {
    if (MATCH.userIsBatting) {
      if (gameState === STATES.BOWL_READY) {
        // Move batsman strictly via D-pad or keyboard arrow/AD keys (prevent joystick movement conflicts)
        const moveDir = (keys.arrowLeft ? -1 : keys.arrowRight ? 1 : 0) || (keys.a ? -1 : keys.d ? 1 : 0);
        stanceX = THREE.MathUtils.clamp(stanceX + moveDir * STANCE_SPEED, -1.2, 1.2);
      }
    } else {
      // AI is batting: smoothly reposition batsman to line up with the delivery target
      if (MATCH.aiTargetStanceX !== undefined) {
        const step = 2.0 * dt;
        const diff = MATCH.aiTargetStanceX - stanceX;
        if (Math.abs(diff) > 0.01) {
          stanceX = THREE.MathUtils.clamp(stanceX + Math.sign(diff) * Math.min(Math.abs(diff), step), -1.2, 1.2);
        }
      }
    }
    
    // Smoothly step batsman inside game
    batsmanMesh.position.x = THREE.MathUtils.lerp(batsmanMesh.position.x, stanceX, 10 * dt);
    if (window.swingPhase === 0 && window.runningState === 'idle') {
      batsmanMesh.position.z = THREE.MathUtils.lerp(batsmanMesh.position.z, BATSMAN_CREASE_Z, 10 * dt);
    }
    let targetRotY = Math.PI / 2; // Sideways guard stance
    if (runningState === 'called') {
      targetRotY = Math.PI; // Running to bowler end (negative Z)
    } else if (runningState === 'completing' || runningState === 'cancelled') {
      targetRotY = 0; // Running back to striker end (positive Z)
    }
    batsmanMesh.rotation.y = THREE.MathUtils.lerp(batsmanMesh.rotation.y, targetRotY, 10 * dt);

    // Scale bat body offsets by 1.5x to match visual batsman scale
    batBody.position.set(stanceX - 0.24 * 1.5, 0.7 * 1.5, BATSMAN_CREASE_Z - 0.15 * 1.5);
  } else if (!isPlaying && batsmanMesh && !window.faceoffActive) {
    // In Menu / Splash - Offset batsman to the right (x=1.1, z=1.35) and turn him to face the camera cinematically
    batsmanMesh.position.x = THREE.MathUtils.lerp(batsmanMesh.position.x, 1.1, 4 * dt);
    batsmanMesh.position.z = THREE.MathUtils.lerp(batsmanMesh.position.z, 1.35, 4 * dt);
    batsmanMesh.rotation.y = THREE.MathUtils.lerp(batsmanMesh.rotation.y, -Math.PI / 5, 4 * dt);
  }

  // 4. Swing phase advance (dt-based, not swingProgress)
  // Phase 1 advances itself in updateBatsmanAnimation above
  // No extra swingProgress variable needed anymore

  // 4b. Pre-delivery shot aim (arrow keys or gamepad sticks for 360-degree aiming)
  if (MATCH.userIsBatting && (gameState === STATES.BOWL_READY || gameState === STATES.BALL_IN_FLIGHT)) {
    let dx = 0;
    let dz = 0;
    let hasInput = false;

    if (gameState === STATES.BOWL_READY) {
      if (keys.arrowLeft || keys.arrowRight || keys.arrowUp || keys.arrowDown || keys.a || keys.d || keys.w || keys.s) {
        if (keys.arrowLeft || keys.a) dx = -1;
        if (keys.arrowRight || keys.d) dx = 1;
        if (keys.arrowUp || keys.w) dz = -1; // Up is forward (-Z)
        if (keys.arrowDown || keys.s) dz = 1;  // Down is backward (+Z)
        hasInput = true;
      }
    } else {
      // During ball flight, WASD are strictly shot modifiers. Only arrow keys can aim.
      if (keys.arrowLeft || keys.arrowRight || keys.arrowUp || keys.arrowDown) {
        if (keys.arrowLeft) dx = -1;
        if (keys.arrowRight) dx = 1;
        if (keys.arrowUp) dz = -1;
        if (keys.arrowDown) dz = 1;
        hasInput = true;
      }
    }

    if (!hasInput) {
      if (Math.abs(controllerInput.aimX) > 0.15 || Math.abs(controllerInput.aimY) > 0.15) {
        dx = controllerInput.aimX;
        dz = controllerInput.aimY;
        hasInput = true;
      } else if (Math.abs(controllerInput.joystickX) > 0.15 || Math.abs(controllerInput.joystickY) > 0.15) {
        dx = controllerInput.joystickX;
        dz = controllerInput.joystickY;
        hasInput = true;
      }
    }

    if (hasInput) {
      const targetAngle = Math.atan2(dx, -dz);
      let diff = targetAngle - shotAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      shotAngle += diff * 0.18;
    } else {
      // Slowly return to straight center
      let diff = 0 - shotAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      shotAngle += diff * 0.08;
    }
    window.shotAngle = shotAngle;
    window.updateShotAimUI(shotAngle);
  }

  // AI batsman running check when user is bowling
  if (!MATCH.userIsBatting && matchMode === MODES.SOLO && (gameState === STATES.HIT || gameState === STATES.RUNNING)) {
    if (runningState === 'idle' && !MATCH.isOutThisBall && !window.fielderRetrieved && !MATCH.ballDead && ballBody) {
      // Limit AI to at most 3 runs per ball to prevent infinite run loops if fielders get stuck
      if (MATCH.runsThisBall >= 3) {
        return;
      }
      const ballPos = ballBody.position;
      const distToStumps = Math.sqrt(ballPos.x * ballPos.x + (ballPos.z - 1.2) * (ballPos.z - 1.2));
      
      let fielderChasingOrThrowing = false;
      if (window.fielders) {
        const activeFielder = window.fielders.find(f => f.state === 'collecting' || f.state === 'throwing');
        if (activeFielder) fielderChasingOrThrowing = true;
      }
      
      if (distToStumps > 5.5 && !fielderChasingOrThrowing) {
        window.callRun();
      }
    }
  }


  // 4c. Running between wickets
  if (window.runningState === 'called' || window.runningState === 'completing' || window.runningState === 'cancelled') {
    if (window.runningState === 'cancelled') {
      window.runProgress = Math.max(0, 1 - (window.clock.getElapsedTime() - window.runStartTime) / window.RUN_DURATION);
    } else {
      window.runProgress = Math.min(1, (window.clock.getElapsedTime() - window.runStartTime) / window.RUN_DURATION);
    }
    const t = window.runProgress;
    // Use window-scoped references so swaps and runtime changes are reflected
    const _strikerZ   = window.BATSMAN_CREASE_Z;
    const _nonStrkZ   = window.nonStrikerStartZ;
    if (window.batsmanMesh) {
      window.batsmanMesh.position.z = THREE.MathUtils.lerp(_strikerZ, _nonStrkZ, t);
    }
    if (window.nonStrikerMesh) {
      window.nonStrikerMesh.position.z = THREE.MathUtils.lerp(_nonStrkZ, _strikerZ, t);
    }
    // Update crease tracker
    window.updateCreaseTracker(window.runProgress, true);

    if (window.runningState === 'called' && window.runProgress >= 1) {
      // Run completed — swap striker index
      MATCH.runsThisBall += 1;
      
      MATCH.strikerIndex = MATCH.strikerIndex === 0 ? 1 : 0;
      if (typeof window.swapBattingEnds === 'function') {
        window.swapBattingEnds();
      }
      // Reset but allow calling another run immediately if ball still live
      window.runningState = 'idle';
      window.runProgress = 0;
      
      if (window.batsmanMesh) {
        window.batsmanMesh.position.z = window.BATSMAN_CREASE_Z;
      }
      if (window.nonStrikerMesh) {
        window.nonStrikerMesh.position.z = window.nonStrikerStartZ;
      }
      window.updateCreaseTracker(0, false);
      
      // Drain stamina for both batters on a completed run
      const b1 = MATCH.batters[0];
      const b2 = MATCH.batters[1];
      if (b1) b1.stamina = Math.max(0, b1.stamina - 6);
      if (b2) b2.stamina = Math.max(0, b2.stamina - 6);

      // Re-show run button so the user can call another run (2s, 3s, etc.)
      // Only show if ball is still live and batsmen not yet out
      if (MATCH && MATCH.userIsBatting && !window.fielderRetrieved && !MATCH.ballDead && !MATCH.isOutThisBall) {
        const _runBtn    = document.getElementById('run-btn');
        const _cancelBtn = document.getElementById('cancel-run-btn');
        if (_runBtn) _runBtn.classList.remove('hidden');
        if (_cancelBtn) _cancelBtn.classList.remove('hidden');
      }
    }
  } else {
    window.updateCreaseTracker(0, false);
  }

  // Stuck in HIT or RUNNING state safety check (e.g. defensive blocks or failed return throws)
  const isStuckState = (gameState === STATES.HIT || gameState === STATES.RUNNING);
  const isBatsmanIdle = (window.runningState === 'idle');
  
  if (isStuckState && isBatsmanIdle) {
    if (!window._stuckRunningTimer) {
      console.log('[Safety] Batsmen are idle in HIT/RUNNING state. Starting 10s stuck timer.');
      window._stuckRunningTimer = setTimeout(() => {
        if ((window.gameState === STATES.HIT || window.gameState === STATES.RUNNING) && window.runningState === 'idle') {
          console.warn('[Safety] Game stuck in HIT/RUNNING for 10s with idle batsmen — forcing RESULT.');
          window.runningState = 'idle';
          window.runProgress = 0;
          window.ballSettled = true;
          if (window.MATCH) window.MATCH.ballDead = true;
          setGameState(STATES.RESULT);
        }
      }, 10000);
    }
  } else {
    if (window._stuckRunningTimer) {
      clearTimeout(window._stuckRunningTimer);
      window._stuckRunningTimer = null;
    }
  }



  // 4d. Poll Gamepad
  pollGamepad();

  // Update FBX animation mixers first so manual overlays can run after it
  if (window.FBXPlayers && window.FBXPlayers.updateFBXMixers) {
    window.FBXPlayers.updateFBXMixers(dt);
  }

  // 5. Update Characters & Fielders limbs
  window.updateBowlerAnimation(dt);
  window.updateBatsmanAnimation(dt);
  window.updateOtherPlayers(dt);
  window.updateFielders(dt);
  if (window.tossCutsceneActive) {
    if (typeof window.updateTossCaptainsAnimation === 'function') {
      window.updateTossCaptainsAnimation(dt);
    }
  }
  if (window.entranceCutsceneActive) {
    window.updateEntranceCutscene(dt);
  }
  if (window.wicketCutsceneActive) {
    window.updateWicketCutscene(dt);
  }
  if (window.lbwAppealActive) {
    window.lbwAppealTimer -= dt;
    if (window.lbwAppealTimer <= 0) {
      window.declineLBWAppeal();
    } else {
      const timerVal = document.getElementById('lbw-appeal-timer-value');
      if (timerVal) timerVal.innerText = Math.ceil(window.lbwAppealTimer);
      const progressPath = document.getElementById('lbw-appeal-timer-progress');
      if (progressPath) {
        const dashValue = (window.lbwAppealTimer / 3.0) * 100;
        progressPath.style.strokeDasharray = `${dashValue}, 100`;
      }
    }
  }
  if (window.drsActive && typeof window.updateDRSSystem === 'function') {
    window.updateDRSSystem(dt);
  }
  if (window.runoutActive && typeof window.updateRunoutSystem === 'function') {
    window.updateRunoutSystem(dt);
  }
  if (window.updateMatchTrophy) window.updateMatchTrophy(dt);

  // ── UPDATE LANDING MARKER OPACITY ────────────────────────────
  if (window.landingMarker) {
    if (gameState === STATES.BALL_IN_FLIGHT && !ballBounceDetected) {
      // Keep visible
    } else if (gameState === STATES.BOWL_READY && !MATCH.userIsBatting) {
      window.landingMarker.material.opacity = 0.8;
    } else {
      window.landingMarker.material.opacity = THREE.MathUtils.lerp(window.landingMarker.material.opacity, 0, 0.12);
    }
  }

  // 5b. Update 3D Coin Toss physics/trajectory & camera targets
  if (window.tossCutsceneActive && window.tossCoin3D) {
    const coin = window.tossCoin3D;
    
    if (window.tossCoinState === 'idle') {
      coin.position.set(0.08, 0.94, -10.0);
      targetCamPos.set(0.7, 1.3, -7.8);
      targetCamLook.set(0.08, 0.94, -10.0);
    }
    else if (window.tossCoinState === 'flipping') {
      window.tossCoinTime += dt;
      const peakDuration = 2.0; // 2 seconds flight to peak
      const progress = Math.min(1.0, window.tossCoinTime / peakDuration);
      
      // Quadratic ease-out for smooth slowdown at peak
      const ease = 1.0 - Math.pow(1.0 - progress, 2);
      
      // Launch in an arc from Away Captain's hand sphere (0.08, 0.94, -10.0) to peak (0.0, 2.95, -9.2)
      coin.position.x = 0.08 * (1.0 - progress) + 0.0 * progress;
      coin.position.y = 0.94 + 2.01 * ease;
      coin.position.z = -10.0 * (1.0 - progress) + -9.2 * progress;
      
      // Spin slows down from 35 rad/s to 5 rad/s
      const rotSpeed = 35 * (1.0 - progress * 0.85);
      coin.rotation.x += rotSpeed * dt;
      coin.rotation.y += rotSpeed * 0.5 * dt;
      
      // Zoom camera closer and closer to track the small coin
      targetCamPos.set(
        0.7 * (1.0 - progress) + 0.0 * progress,
        1.3 * (1.0 - progress) + 3.05 * progress,
        -7.8 * (1.0 - progress) + -8.95 * progress
      );
      targetCamLook.copy(coin.position);
      
      if (progress >= 1.0) {
        window.tossCoinState = 'paused';
        coin.position.set(0.0, 2.95, -9.2); // exactly peak
        
        // Show Call overlay
        document.getElementById('toss-status-text').innerText = 'Call Heads or Tails in the air:';
        document.getElementById('toss-call-container').classList.remove('hidden');
      }
    } else if (window.tossCoinState === 'paused') {
      // Slowly float and spin in place
      coin.rotation.y += 0.8 * dt;
      coin.rotation.x += 0.4 * dt;
      coin.position.set(0.0, 2.95, -9.2);
      
      // Camera stays zoomed extremely close on peak coin
      targetCamPos.set(0.0, 3.05, -8.95);
      targetCamLook.copy(coin.position);
    } else if (window.tossCoinState === 'falling') {
      window.tossCoinTime += dt;
      const fallDuration = 1.2; // 1.2 seconds to fall
      const progress = Math.min(1.0, window.tossCoinTime / fallDuration);
      
      // Quadratic ease-in for accelerating fall
      const ease = progress * progress;
      coin.position.x = 0.0;
      coin.position.y = Math.max(0.008, 2.95 - (2.95 - 0.008) * ease);
      coin.position.z = -9.2;
      
      // Spin speeds up
      const rotSpeed = 5.0 + 30.0 * progress;
      coin.rotation.x += rotSpeed * dt;
      coin.rotation.z += rotSpeed * 0.3 * dt;
      
      // Camera follows the coin down closely
      targetCamPos.set(
        0.0,
        Math.max(0.26, 3.05 - (3.05 - 0.26) * ease),
        -8.95
      );
      targetCamLook.copy(coin.position);
      
      if (progress >= 1.0) {
        window.tossCoinState = 'landed';
        
        // Bounce sound
        if (window.CricketAudio && window.CricketAudio.playHit) {
          window.CricketAudio.playHit(0.3);
        }
        
        coin.position.set(0.0, 0.008, -9.2);
        if (window.tossResult === 'heads') {
          coin.rotation.set(0, Math.random() * Math.PI, 0); // H face up
        } else {
          coin.rotation.set(Math.PI, Math.random() * Math.PI, 0); // T face up
        }
        
        window.resolveTossDecisionUI();
      }
    } else if (window.tossCoinState === 'landed') {
      // Camera zoomed close on the coin on the pitch
      targetCamPos.set(0.0, 0.26, -8.95);
      targetCamLook.set(coin.position.x, 0.008, coin.position.z);
    }
  }

  // 5c. Faceoff Screen Captain animations and positioning override
  if (window.faceoffActive) {
    if (typeof window.faceoffAnimTime === 'undefined') {
      window.faceoffAnimTime = 0;
    }
    window.faceoffAnimTime += dt;

    if (window.batsmanMesh) {
      window.batsmanMesh.position.set(0.72, 0, 1.35);
      window.batsmanMesh.rotation.set(0, 0.28, 0); // facing slightly inward/right
      window.batsmanMesh.visible = true;

      // Hide bat/blade
      if (window.batsmanMesh.parts) {
        if (window.batsmanMesh.parts.bat) window.batsmanMesh.parts.bat.scale.set(0, 0, 0);
        if (window.batsmanMesh.parts.batBlade) window.batsmanMesh.parts.batBlade.scale.set(0, 0, 0);
      }
      const bones = typeof window.getFBXBones === 'function' ? window.getFBXBones(window.batsmanMesh) : null;
      if (bones && bones.bat) bones.bat.scale.setScalar(0);

      // Procedural arm folding lerp
      const t = Math.min(1.0, Math.max(0.0, (window.faceoffAnimTime - 0.5) / 1.5));
      const ease = t * t * (3.0 - 2.0 * t); // smoothstep
      
      const leftArm = window.batsmanMesh.parts ? window.batsmanMesh.parts.leftArm : (bones ? bones.leftArm : null);
      const leftFore = window.batsmanMesh.parts ? window.batsmanMesh.parts.leftForearm : (bones ? bones.leftForeArm : null);
      const rightArm = window.batsmanMesh.parts ? window.batsmanMesh.parts.rightArm : (bones ? bones.rightArm : null);
      const rightFore = window.batsmanMesh.parts ? window.batsmanMesh.parts.rightForearm : (bones ? bones.rightForeArm : null);

      if (leftArm) leftArm.rotation.set(ease * -1.1, ease * 0.5, ease * 0.4);
      if (leftFore) leftFore.rotation.set(ease * -1.5, 0, 0);
      if (rightArm) rightArm.rotation.set(ease * -1.1, ease * -0.5, ease * -0.4);
      if (rightFore) rightFore.rotation.set(ease * -1.5, 0, 0);
    }

    if (window.bowlerMesh) {
      window.bowlerMesh.position.set(1.48, 0, 1.35);
      window.bowlerMesh.rotation.set(0, -0.28, 0); // facing slightly inward/left
      window.bowlerMesh.visible = true;

      // Hide bat/blade
      if (window.bowlerMesh.parts) {
        if (window.bowlerMesh.parts.bat) window.bowlerMesh.parts.bat.scale.set(0, 0, 0);
        if (window.bowlerMesh.parts.batBlade) window.bowlerMesh.parts.batBlade.scale.set(0, 0, 0);
      }
      const bones = typeof window.getFBXBones === 'function' ? window.getFBXBones(window.bowlerMesh) : null;
      if (bones && bones.bat) bones.bat.scale.setScalar(0);

      // Procedural arm folding lerp
      const t = Math.min(1.0, Math.max(0.0, (window.faceoffAnimTime - 0.5) / 1.5));
      const ease = t * t * (3.0 - 2.0 * t); // smoothstep
      
      const leftArm = window.bowlerMesh.parts ? window.bowlerMesh.parts.leftArm : (bones ? bones.leftArm : null);
      const leftFore = window.bowlerMesh.parts ? window.bowlerMesh.parts.leftForearm : (bones ? bones.leftForeArm : null);
      const rightArm = window.bowlerMesh.parts ? window.bowlerMesh.parts.rightArm : (bones ? bones.rightArm : null);
      const rightFore = window.bowlerMesh.parts ? window.bowlerMesh.parts.rightForearm : (bones ? bones.rightForeArm : null);

      if (leftArm) leftArm.rotation.set(ease * -1.1, ease * 0.5, ease * 0.4);
      if (leftFore) leftFore.rotation.set(ease * -1.5, 0, 0);
      if (rightArm) rightArm.rotation.set(ease * -1.1, ease * -0.5, ease * -0.4);
      if (rightFore) rightFore.rotation.set(ease * -1.5, 0, 0);
    }
  }

  // 6. Camera Follow checks with smooth Lerps (FC 26 Broadcast Vibes)
  if (gameState === STATES.SPLASH) {
    const time = clock.getElapsedTime() * 0.22;
    const radius = 3.5;
    const cx = Math.sin(time) * radius;
    const cz = 1.2 + Math.cos(time) * radius;
    const cy = 1.0 + Math.sin(time * 2) * 0.12;
    
    camera.position.set(cx, cy, cz);
    currentCamLook.set(0, 0.95, 1.2);
    camera.lookAt(currentCamLook);
  }
  else if (window.tossCutsceneActive || window.entranceCutsceneActive || window.wicketCutsceneActive || window.drsActive) {
    // targetCamPos and targetCamLook are set dynamically in 5b based on coin flight, entrance, or wicket!
    camera.position.lerp(targetCamPos, 3.5 * dt);
    currentCamLook.lerp(targetCamLook, 3.5 * dt);
    camera.lookAt(currentCamLook);
  }
  else {
    const ballPos = ballBody ? ballBody.position : null;
    
    if (window.umpireSignalType && window.umpireSignalTimer < 4.0) {
      // 1. Umpire Close-up Focus Camera (Umpire is at 0, 0, -23.8)
      targetCamPos.set(0, 1.8, -20.2); // 3.6m in front
      targetCamLook.set(0, 1.5, -23.8); // looking at chest/face
    }
    else if (gameState === STATES.HIT || gameState === STATES.RUNNING) {
      // Find the active/closest fielder
      let activeFielder = null;
      if (window.fielders) {
        activeFielder = window.fielders.find(f => f.state === 'running' || f.state === 'collecting' || f.state === 'catching' || f.state === 'throwing');
      }
      
      const distToFielder = (activeFielder && ballPos) ? activeFielder.mesh.position.distanceTo(ballPos) : Infinity;
      
      if (activeFielder && activeFielder.state === 'catching') {
        // 2a. Catch Focus Camera: Cut close to the fielder catching the ball
        const fPos = activeFielder.mesh.position;
        targetCamPos.set(fPos.x * 0.9 + 2.5, 1.8, fPos.z + (fPos.z > -10 ? -2.5 : 2.5));
        targetCamLook.set(fPos.x, 1.2, fPos.z);
      }
      else if (activeFielder && distToFielder < 12.0) {
        // 2b. Fielder Collection Focus Camera
        const fPos = activeFielder.mesh.position;
        targetCamPos.set(
          THREE.MathUtils.lerp(fPos.x, ballPos.x, 0.5) + 4.5,
          3.2,
          THREE.MathUtils.lerp(fPos.z, ballPos.z, 0.5) + 4.5
        );
        targetCamLook.set(fPos.x, 1.0, fPos.z);
      }
      else if (activeFielder && activeFielder.state === 'throwing') {
        // 2c. Throw Tracking Camera: Positioned behind stumps looking at return throw
        targetCamPos.set(0, 2.5, WICKET_Z + 4.5);
        targetCamLook.set(ballPos.x, ballPos.y, ballPos.z);
      }
      else if (ballPos) {
        // 3. Ball-Tracking Camera (Follows ball flight)
        const bVel    = ballBody.velocity;
        const speed   = Math.sqrt(bVel.x*bVel.x + bVel.z*bVel.z);
        const camDist = THREE.MathUtils.clamp(14 - speed * 0.2, 7, 16);
        targetCamPos.set(
          ballPos.x * 0.4 - bVel.x * 0.25,
          Math.max(ballPos.y * 0.55 + 3.8, 4.2),
          ballPos.z + camDist
        );
        targetCamLook.set(ballPos.x, Math.max(ballPos.y, 0.3), ballPos.z - 1.5);
      }
    } else if (isPlaying) {
      if (activeCameraMode === 'bowler') {
        if (window.bowlerMesh && (bowlerAnimState === BOWLER_ANIM_STATES.RUNUP || bowlerAnimState === BOWLER_ANIM_STATES.LOADUP || bowlerAnimState === BOWLER_ANIM_STATES.RELEASE)) {
          targetCamPos.set(window.bowlerMesh.position.x, window.bowlerMesh.position.y + 4.2, window.bowlerMesh.position.z - 6.0);
        } else {
          targetCamPos.set(0, 4.2, -38.0);
        }
        targetCamLook.set(0, 1.0, 3.0);
      } else if (activeCameraMode === 'tactical') {
        targetCamPos.set(0, 12.0, 6.0);
        targetCamLook.set(0, 0, -5.0);
      } else if (activeCameraMode === 'wicketkeeper') {
        targetCamPos.set(0, 1.6, 2.8);
        targetCamLook.set(0, 0.9, -12.0);
      } else {
        targetCamPos.set(0, 4.8, 9.2);
        targetCamLook.set(0, 0.9, -6.0);
      }
    } else {
      if (window.faceoffActive) {
        const time = clock.getElapsedTime() * 0.15;
        targetCamPos.set(1.1 + Math.sin(time) * 0.05, 1.25 + Math.cos(time) * 0.03, 3.1 + Math.sin(time * 0.5) * 0.05);
        targetCamLook.set(1.1, 0.95, 1.35);
      } else {
        const time = clock.getElapsedTime() * 0.25;
        targetCamPos.set(0.1 + Math.sin(time) * 0.12, 1.2 + Math.cos(time) * 0.08, 3.4 + Math.sin(time * 0.5) * 0.1);
        targetCamLook.set(0.8, 0.95, 1.35);
      }
    }

    camera.position.lerp(targetCamPos, 3 * dt);
    currentCamLook.lerp(targetCamLook, 3 * dt);
    camera.lookAt(currentCamLook);
  }

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Cutscene, Toss, and Matchup Listeners have been modularized to public/js/cutscene_manager.js

// ── STARTUP INITIALIZATION ─────────────────────────────────────
let started = false;

function start() {
  if (started) return;
  started = true;

  initGame();
  window.setupMenuListeners();
  window.setupPauseListeners();
  window.setupSettingsListeners();
  window.setupMatchSetupAndTossListeners();
  window.loadProfile();
  window.loadSettings();
  initKeyboard();
  initGamepad();
  setGameState(STATES.SPLASH);
  
  // Bind global helper functions needed by cutscene modules and non-module scripts
  window.triggerWicketsClatter = triggerWicketsClatter;
  window.callRun = callRun;
  window.cancelRun = cancelRun;
  window.proceedFromMatchIntro = proceedFromMatchIntro;
  window.proceedFromInningsBreak = proceedFromInningsBreak;

  // ── Critical: expose game control functions so cutscene modules can call them ──
  window.restartMatch        = restartMatch;
  window.resetFieldForBowl   = resetFieldForBowl;
  window.setupNextDelivery   = setupNextDelivery;
  window.showBowlerSelection = showBowlerSelection;
  window.setGameState        = setGameState;   // override game_state_manager version with this one
  window.bowlBall               = bowlBall;
  window.triggerBowlingRelease  = triggerBowlingRelease;
  // updatePlayerCardUI is implemented in js/player_card.js

  animate();
}

// ── CAREER PROFILE DETAILS SYSTEM ──────────────────────────────

// Audio Interaction Resumer — also starts Menu BGM on first click/key
function resumeAudioOnInteraction() {
  if (!CricketAudio) return;
  if (!CricketAudio.ctx) CricketAudio.init();
  if (!CricketAudio.ctx) return;

  const resume = () => {
    // Start menu BGM once context is running
    if (gameState === STATES.MAIN_MENU || gameState === STATES.SPLASH) {
      CricketAudio.transitionTo(CricketAudio.STATES.MENU);
    }
  };

  if (CricketAudio.ctx.state === 'suspended') {
    CricketAudio.ctx.resume().then(() => {
      console.log('AudioContext resumed on first interaction.');
      resume();
    }).catch(err => console.warn('AudioContext resume failed:', err));
  } else {
    resume();
  }
}
window.addEventListener('click', resumeAudioOnInteraction, { once: true });
window.addEventListener('keydown', resumeAudioOnInteraction, { once: true });

window.launchCricketGame = function() {
  if (typeof window.updatePresence === 'function') {
    window.updatePresence('Playing Cricket Pro');
  }
  start();
  resumeAudioOnInteraction();
};
