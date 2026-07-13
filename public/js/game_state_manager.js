// Game State Manager Module
function setGameState(newState) {
  window.setGameState = setGameState;
  
  if (window.gameState === newState && newState !== window.STATES.SPLASH) return;
  console.log(`State Transition: ${window.gameState} ──> ${newState}`);
  window.gameState = newState;

  // Sync phone controller layout dynamically during active play
  if (window.socket && window.controllerConnected) {
    const isBatting = window.MATCH && window.MATCH.userIsBatting;
    window.socket.emit('layout-change', { layout: isBatting ? 'batting' : 'bowling' });
  }

  // Manage pause overlay visibility automatically
  const pauseScreen = document.getElementById('pause-settings-screen');
  if (pauseScreen) {
    if (window.gameState === window.STATES.PAUSED) {
      pauseScreen.classList.remove('hidden');
    } else {
      pauseScreen.classList.add('hidden');
    }
  }

  // ── Run button visibility ────────────────────────────────────────
  const runBtn    = document.getElementById('run-btn');
  const cancelBtn = document.getElementById('cancel-run-btn');
  if (runBtn && cancelBtn) {
    const isBatting = window.MATCH && window.MATCH.userIsBatting;
    if (window.gameState === window.STATES.HIT && isBatting) {
      runBtn.classList.remove('hidden');
      cancelBtn.classList.remove('hidden');
    } else if (window.gameState === window.STATES.RUNNING && isBatting) {
      runBtn.classList.add('hidden');
      cancelBtn.classList.remove('hidden');
    } else {
      runBtn.classList.add('hidden');
      cancelBtn.classList.add('hidden');
    }
  }


  switch (window.gameState) {
    case window.STATES.SPLASH:
      if (typeof window.runSplashScreen === 'function') window.runSplashScreen();
      break;

    case window.STATES.MAIN_MENU:
      break;

    case window.STATES.WAITING_FOR_PHONE:
      break;

    case window.STATES.BOWL_READY:
      if (window.ui && window.ui.gameOver) window.ui.gameOver.classList.add('hidden');
      if (typeof window.setupNextDelivery === 'function') window.setupNextDelivery();
      break;

    case window.STATES.BALL_IN_FLIGHT:
      window.bowlerReleased = true;
      break;

    case window.STATES.HIT:
      if (window.CricketAudio && window.CricketAudio.playHit) {
        window.CricketAudio.playHit(window.controllerInput.btnR2 || window.keys.ctrl ? 1.25 : 0.85);
      }
      if (window.socket && window.matchMode === window.MODES.PVP) {
        window.socket.emit('layout-change', { layout: 'batting' });
      }
      break;

    case window.STATES.RUNNING:
      break;

    case window.STATES.THROW_IN_FLIGHT:
      break;

    case window.STATES.RUNOUT_REVIEW:
      break;

    case window.STATES.BOWLED:
      window.MATCH.isOutThisBall = true;
      window.MATCH.outType = 'BOWLED';
      if (typeof window.snapBatsmenToCreases === 'function') {
        window.snapBatsmenToCreases();
      }
      if (typeof window.queueCelebration === 'function') {
        window.queueCelebration(
          'out',
          'OUT!',
          'CLEAN BOWLED',
          'CLEAN BOWLED!',
          'OUT',
          'out',
          () => {
            if (typeof window.triggerWicketsClatter === 'function') window.triggerWicketsClatter();
            if (window.CricketAudio) {
              if (window.CricketAudio.playBowled) window.CricketAudio.playBowled();
              if (window.CricketAudio.playGasp) window.CricketAudio.playGasp();
            }
          }
        );
      }
      break;

    case window.STATES.MISS:
      window.ballSettled = true;
      if (window.CricketAudio && window.CricketAudio.playGasp) window.CricketAudio.playGasp();
      if (typeof window.showFeedback === 'function') {
        window.showFeedback('BEATEN!', 'DOT BALL', 'missed');
      }
      setTimeout(() => {
        if (window.gameState === window.STATES.MISS) setGameState(window.STATES.RESULT);
      }, 2000);
      break;

    case window.STATES.RESULT:
      if (typeof window.processBallResult === 'function') window.processBallResult();
      break;

    case window.STATES.NEXT_BALL:
      if (typeof window.resetFieldForBowl === 'function') window.resetFieldForBowl();
      break;

    case window.STATES.GAME_OVER:
      if (typeof window.showGameOverScreen === 'function') window.showGameOverScreen();
      break;

    case window.STATES.PAUSED:
      break;
  }
}

function togglePause() {
  if (window.gameState === window.STATES.PAUSED) {
    setGameState(window.prePauseState);
    if (window.CricketAudio && window.CricketAudio.crowdGain && window.CricketAudio.ctx) {
      window.CricketAudio.crowdGain.gain.setValueAtTime(1.0, window.CricketAudio.ctx.currentTime);
    }
  } else {
    window.prePauseState = window.gameState;
    if (window.CricketAudio) {
      if (window.CricketAudio.transitionTo) window.CricketAudio.transitionTo(window.CricketAudio.STATES.PAUSED);
    }
    setGameState(window.STATES.PAUSED);
  }
}

function exitToMainMenu() {
  if (window.socket) {
    window.socket.disconnect();
    window.socket = null;
  }
  window.roomCode = null;
  window.controllerConnected = false;
  
  window.ui.lobby.classList.add('hidden');
  window.ui.hud.style.display = 'none';
  window.ui.gameOver.classList.add('hidden');
  window.ui.controlsScreen.classList.add('hidden');
  window.ui.mainMenu.classList.remove('hidden');

  setGameState(window.STATES.MAIN_MENU);
  if (window.CricketAudio && window.CricketAudio.transitionTo) {
    window.CricketAudio.transitionTo(window.CricketAudio.STATES.MENU);
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
    
    const dx = x;
    const dz = z - fieldCenterZ;
    
    const mx = dx * scale;
    const my = dz * scale;
    
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
  if (window.batsmanMesh) {
    setDotPos('radar-batsman', window.batsmanMesh.position.x, window.batsmanMesh.position.z);
  }

  // Update Bowler
  if (window.bowlerMesh) {
    setDotPos('radar-bowler', window.bowlerMesh.position.x, window.bowlerMesh.position.z);
  }

  // Update Keeper
  if (window.keeperMesh && window.keeperMesh.radarDot) {
    setDotPos(window.keeperMesh.radarDot, window.keeperMesh.position.x, window.keeperMesh.position.z);
  }

  // Update Ball
  const ballDot = document.getElementById('radar-ball');
  if (ballDot) {
    if (window.gameState === window.STATES.BALL_IN_FLIGHT || window.gameState === window.STATES.HIT) {
      ballDot.style.display = 'block';
      if (window.ballBody) setDotPos(ballDot, window.ballBody.position.x, window.ballBody.position.z);
    } else {
      ballDot.style.display = 'none';
    }
  }

  // Update Fielders
  if (window.fielders) {
    window.fielders.forEach(f => {
      if (f.radarDot && f.mesh) {
        setDotPos(f.radarDot, f.mesh.position.x, f.mesh.position.z);
      }
    });
  }
}

function setupPauseListeners() {
  const resumeBtn = document.getElementById('pause-resume-btn');
  const restartBtn = document.getElementById('pause-restart-btn');
  const menuBtn = document.getElementById('pause-menu-btn');

  if (resumeBtn) {
    resumeBtn.onclick = () => {
      togglePause();
    };
  }
  if (restartBtn) {
    restartBtn.onclick = () => {
      togglePause();
      if (typeof window.triggerMatchLoading === 'function') {
        window.triggerMatchLoading(() => {
          if (typeof window.restartMatch === 'function') window.restartMatch();
        });
      }
    };
  }
  if (menuBtn) {
    menuBtn.onclick = () => {
      togglePause();
      exitToMainMenu();
    };
  }

  // Camera settings binding
  const cameraBtns = document.querySelectorAll('.camera-btn');
  cameraBtns.forEach(btn => {
    btn.onclick = () => {
      cameraBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const camMode = btn.getAttribute('data-camera');
      window.activeCameraMode = camMode;
      console.log(`Camera mode changed to: ${window.activeCameraMode}`);
    };
  });
}

// Expose functions globally
window.setGameState = setGameState;
window.togglePause = togglePause;
window.exitToMainMenu = exitToMainMenu;
window.updateRadar = updateRadar;
window.setupPauseListeners = setupPauseListeners;
