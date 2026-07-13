// Input controls module (Keyboard & Gamepad API)

// Default to keyboard input mode on body
document.body.classList.add('input-mode-keyboard');

window.setInputMode = function(mode) {
  if (mode === 'keyboard') {
    if (!document.body.classList.contains('input-mode-keyboard')) {
      document.body.classList.remove('input-mode-gamepad');
      document.body.classList.add('input-mode-keyboard');
    }
  } else {
    if (!document.body.classList.contains('input-mode-gamepad')) {
      document.body.classList.remove('input-mode-keyboard');
      document.body.classList.add('input-mode-gamepad');
    }
  }
};

window.addEventListener('mousedown', () => {
  if (typeof window.setInputMode === 'function') {
    window.setInputMode('keyboard');
  }
});

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
    if (typeof window.setInputMode === 'function') {
      window.setInputMode('keyboard');
    }
    // Menu navigation routing
    if (typeof window.handleUINavigation === 'function') {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') window.handleUINavigation('UP');
      if (e.code === 'ArrowDown' || e.code === 'KeyS') window.handleUINavigation('DOWN');
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') window.handleUINavigation('LEFT');
      if (e.code === 'ArrowRight' || e.code === 'KeyD') window.handleUINavigation('RIGHT');
      if (e.code === 'Enter' || e.code === 'Space') window.handleUINavigation('SELECT');
      if (e.code === 'Escape' || e.code === 'KeyX') window.handleUINavigation('BACK');
    }

    // LBW Appeal override
    if (window.lbwAppealActive) {
      if (e.code === 'Space') {
        e.preventDefault();
        if (typeof window.makeLBWAppeal === 'function') window.makeLBWAppeal();
        return;
      }
      if (e.code === 'KeyX') {
        e.preventDefault();
        if (typeof window.declineLBWAppeal === 'function') window.declineLBWAppeal();
        return;
      }
    }

    // Prevent browser scrolling and default actions for gameplay keys
    if (controlledKeys.includes(e.code)) {
      e.preventDefault();
    }

    // ESC toggles pause settings screen during gameplay
    if (e.code === 'Escape') {
      if (window.gameState !== window.STATES.SPLASH && window.gameState !== window.STATES.MAIN_MENU && window.gameState !== window.STATES.WAITING_FOR_PHONE && window.gameState !== window.STATES.GAME_OVER) {
        if (typeof window.togglePause === 'function') {
          window.togglePause();
        }
      }
    }

    if (e.code === 'ArrowLeft') window.keys.arrowLeft = true;
    if (e.code === 'ArrowRight') window.keys.arrowRight = true;
    if (e.code === 'ArrowUp') window.keys.arrowUp = true;
    if (e.code === 'ArrowDown') window.keys.arrowDown = true;
    if (e.code === 'KeyA') window.keys.a = true;
    if (e.code === 'KeyD') window.keys.d = true;
    if (e.code === 'KeyW') window.keys.w = true;
    if (e.code === 'KeyS') window.keys.s = true;
    if (e.code === 'KeyX') window.keys.x = true;

    // User Bowling length presets (Keys 1-4)
    if (!window.MATCH.userIsBatting && window.gameState === window.STATES.BOWL_READY && window.currentBowlingStep === window.BOWLING_STEPS.SELECT_LOCATION) {
      if (e.code === 'Digit1') { window.MATCH.bowlingTargetZ = 0.5; if (typeof window.updateAimPreviewAndLengthHighlight === 'function') window.updateAimPreviewAndLengthHighlight(); }
      if (e.code === 'Digit2') { window.MATCH.bowlingTargetZ = -1.5; if (typeof window.updateAimPreviewAndLengthHighlight === 'function') window.updateAimPreviewAndLengthHighlight(); }
      if (e.code === 'Digit3') { window.MATCH.bowlingTargetZ = -4.0; if (typeof window.updateAimPreviewAndLengthHighlight === 'function') window.updateAimPreviewAndLengthHighlight(); }
      if (e.code === 'Digit4') { window.MATCH.bowlingTargetZ = -7.0; if (typeof window.updateAimPreviewAndLengthHighlight === 'function') window.updateAimPreviewAndLengthHighlight(); }
    }

    if (e.code === 'KeyQ') {
      if (!window.MATCH.userIsBatting && window.gameState === window.STATES.BOWL_READY && window.currentBowlingStep === window.BOWLING_STEPS.SELECT_BALL_TYPE) {
        if (typeof window.cycleWheelSelection === 'function') window.cycleWheelSelection(-1);
      }
    }
    if (e.code === 'KeyE') {
      if (!window.MATCH.userIsBatting && window.gameState === window.STATES.BOWL_READY && window.currentBowlingStep === window.BOWLING_STEPS.SELECT_BALL_TYPE) {
        if (typeof window.cycleWheelSelection === 'function') window.cycleWheelSelection(1);
      }
    }
    if (e.code === 'Tab') {
      if (!window.MATCH.userIsBatting && window.gameState === window.STATES.BOWL_READY && window.currentBowlingStep === window.BOWLING_STEPS.SELECT_BALL_TYPE) {
        e.preventDefault();
        if (typeof window.toggleBowlingVariations === 'function') window.toggleBowlingVariations();
      }
    }

    if (e.code === 'Space') {
      window.keys.space = true;
      
      if (window.entranceCutsceneActive) {
        if (typeof window.skipEntranceCutscene === 'function') window.skipEntranceCutscene();
        return;
      }
      if (window.wicketCutsceneActive) {
        if (window.gameState !== window.STATES.REPLAY) {
          if (typeof window.skipWicketCutscene === 'function') window.skipWicketCutscene();
          return;
        }
      }
      
      const introScreen = document.getElementById('match-intro-screen');
      const breakScreen = document.getElementById('innings-break-screen');
      if (introScreen && !introScreen.classList.contains('hidden')) {
        if (typeof window.proceedFromMatchIntro === 'function') window.proceedFromMatchIntro();
        return;
      }
      if (breakScreen && !breakScreen.classList.contains('hidden')) {
        if (typeof window.proceedFromInningsBreak === 'function') window.proceedFromInningsBreak();
        return;
      }

      if (window.MATCH.userIsBatting) {
        if (typeof window.triggerBatSwing === 'function') window.triggerBatSwing();
      } else if (window.gameState === window.STATES.BOWL_READY) {
        if (window.currentBowlingStep === window.BOWLING_STEPS.SELECT_LOCATION) {
          if (typeof window.startBallTypeSelection === 'function') window.startBallTypeSelection();
        } else if (window.currentBowlingStep === window.BOWLING_STEPS.SELECT_BALL_TYPE) {
          if (typeof window.startReleaseMeter === 'function') window.startReleaseMeter();
        } else if (window.currentBowlingStep === window.BOWLING_STEPS.RELEASE_METER) {
          if (!window.MATCH.bowlerReleasePressed) {
            if (typeof window.triggerBowlingRelease === 'function') window.triggerBowlingRelease();
          }
        }
      }
    }
    // R — call a run (after hitting)
    if (e.code === 'KeyR') { if (window.MATCH.userIsBatting) { if (typeof window.callRun === 'function') window.callRun(); } }
    // X — cancel run / send back
    if (e.code === 'KeyX') { if (window.MATCH.userIsBatting) { if (typeof window.cancelRun === 'function') window.cancelRun(); } }
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
      window.keys.ctrl = true;
      if (window.MATCH.userIsBatting) { if (typeof window.triggerBatSwing === 'function') window.triggerBatSwing(); }
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      window.keys.shift = true;
      if (window.MATCH.userIsBatting) { if (typeof window.triggerBatSwing === 'function') window.triggerBatSwing(); }
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
    if (e.code === 'ArrowLeft') window.keys.arrowLeft = false;
    if (e.code === 'ArrowRight') window.keys.arrowRight = false;
    if (e.code === 'ArrowUp') window.keys.arrowUp = false;
    if (e.code === 'ArrowDown') window.keys.arrowDown = false;
    if (e.code === 'KeyA') window.keys.a = false;
    if (e.code === 'KeyD') window.keys.d = false;
    if (e.code === 'KeyW') window.keys.w = false;
    if (e.code === 'KeyS') window.keys.s = false;
    if (e.code === 'KeyX') window.keys.x = false;
    if (e.code === 'Space') window.keys.space = false;
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') window.keys.ctrl = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') window.keys.shift = false;
  });

  // Fix hanging keys on window blur and tab switches
  function resetKeys() {
    window.keys.arrowLeft = false;
    window.keys.arrowRight = false;
    window.keys.arrowUp = false;
    window.keys.arrowDown = false;
    window.keys.a = false;
    window.keys.d = false;
    window.keys.w = false;
    window.keys.s = false;
    window.keys.x = false;
    window.keys.space = false;
    window.keys.ctrl = false;
    window.keys.shift = false;
  }
  window.addEventListener('blur', resetKeys);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      resetKeys();
    }
  });
}

function initGamepad() {
  window.addEventListener('gamepadconnected', (e) => {
    window.gamepadIndex = e.gamepad.index;
    window.gamepadPrevButtons = Array(e.gamepad.buttons.length).fill(false);
    console.log(`Gamepad connected: ${e.gamepad.id}`);
    showGamepadStatus(e.gamepad.id);
    // Update settings panel indicator
    const dot  = document.getElementById('gamepad-dot');
    const name = document.getElementById('gamepad-detected-name');
    if (dot)  dot.classList.add('active');
    if (name) name.textContent = `Connected: ${e.gamepad.id.substring(0, 45)}`;
  });
  window.addEventListener('gamepaddisconnected', () => {
    window.gamepadIndex = null;
    window.gamepadPrevButtons = [];
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
  if (window.gamepadIndex === null) {
    // Scan for connected gamepads
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        window.gamepadIndex = i;
        window.gamepadPrevButtons = Array(gamepads[i].buttons.length).fill(false);
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

  if (window.gamepadIndex === null) return;
  const gp = navigator.getGamepads ? navigator.getGamepads()[window.gamepadIndex] : null;
  if (!gp) {
    window.gamepadIndex = null;
    return;
  }

  const pressed = (idx) => gp.buttons[idx] && gp.buttons[idx].pressed;
  const justPressed = (idx) => pressed(idx) && !(window.gamepadPrevButtons[idx] || false);

  // Set button state in controllerInput
  window.controllerInput.btnCircle = pressed(1);
  window.controllerInput.btnTriangle = pressed(3);
  window.controllerInput.btnSquare = pressed(2);
  window.controllerInput.btnR2 = pressed(7);
  window.controllerInput.btnL1 = pressed(4);
  window.controllerInput.btnR1 = pressed(5);
  window.controllerInput.btnR3 = pressed(11);

  // Swing Trigger (Cross, Circle, Square, or Triangle)
  if (justPressed(0) || justPressed(1) || justPressed(2) || justPressed(3)) {
    if (typeof window.triggerBatSwing === 'function') window.triggerBatSwing();
  }

  // Running
  if (justPressed(5)) { if (typeof window.callRun === 'function') window.callRun(); }
  if (justPressed(4)) { if (typeof window.cancelRun === 'function') window.cancelRun(); }

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
    window.controllerInput.joystickX = Math.abs(moveX) > 0.15 ? moveX : 0;
    window.controllerInput.joystickY = Math.abs(moveY) > 0.15 ? moveY : 0;
  } else {
    window.controllerInput.joystickX = 0;
    window.controllerInput.joystickY = 0;
  }

  if (Math.abs(aimX) > 0.15 || Math.abs(aimY) > 0.15) {
    window.controllerInput.aimX = Math.abs(aimX) > 0.15 ? aimX : 0;
    window.controllerInput.aimY = Math.abs(aimY) > 0.15 ? aimY : 0;
  } else {
    window.controllerInput.aimX = 0;
    window.controllerInput.aimY = 0;
  }

  // Store for edge detection
  window.gamepadPrevButtons = gp.buttons.map(b => b.pressed);
}

function showGamepadStatus(id) {
  const label = id.substring(0, 28);
  const div = document.getElementById('gamepad-status-label');
  if (div) div.innerText = `🎮 ${label}`;
}

// Expose functions globally
window.initKeyboard = initKeyboard;
window.initGamepad = initGamepad;
window.pollGamepad = pollGamepad;
window.showGamepadStatus = showGamepadStatus;
