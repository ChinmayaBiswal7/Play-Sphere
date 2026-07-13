// PlaySphere Universal Gamepad to Keyboard Event Emulator
// Emulates keyboard events from physical gamepads AND virtual phone controllers.
// Restores and persists fullscreen mode across page transitions.
// Handles touchpad-to-mouse trackpad control emulation.
(function() {
  'use strict';

  let prevButtons = [];
  const activeKeys = {};

  // ── 1. GLOBAL FULLSCREEN PERSISTENCE SYSTEM ──
  // Listen to fullscreen changes to save state in localStorage
  document.addEventListener('fullscreenchange', () => {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    localStorage.setItem('play_sphere_fullscreen', isFs ? 'true' : 'false');
  });

  // Restore fullscreen on page load once user interacts
  if (localStorage.getItem('play_sphere_fullscreen') === 'true') {
    const autoEnterFs = () => {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (req) {
        req.call(el).then(() => {
          cleanup();
        }).catch((err) => {
          console.warn("Auto-fullscreen restoration deferred:", err);
        });
      }
    };

    const cleanup = () => {
      window.removeEventListener('click', autoEnterFs);
      window.removeEventListener('keydown', autoEnterFs);
      window.removeEventListener('touchstart', autoEnterFs);
      window.removeEventListener('mousedown', autoEnterFs);
      window.removeEventListener('gamepadconnected', autoEnterFs);
    };

    window.addEventListener('click', autoEnterFs);
    window.addEventListener('keydown', autoEnterFs);
    window.addEventListener('touchstart', autoEnterFs);
    window.addEventListener('mousedown', autoEnterFs);
    window.addEventListener('gamepadconnected', autoEnterFs);
  }

  // ── 2. GLOBAL VIBRATION CONTROLS ──
  window.triggerGamepadRumble = function(duration, weak, strong) {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp) {
        const actuator = gp.vibrationActuator || gp.vibrationEffect;
        if (actuator && typeof actuator.playEffect === 'function') {
          actuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: duration,
            weakMagnitude: weak,
            strongMagnitude: strong
          }).catch(() => {});
        }
      }
    }
  };

  window.triggerPhoneVibration = function(pattern) {
    // 1. Local vibration
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
    // 2. Relay vibration to connected phone controller if socket exists
    if (window.socket && window.socket.emit) {
      window.socket.emit('trigger-vibration', { pattern: pattern });
    }
  };

  // ── 3. KEYBOARD EVENT EMULATOR ENGINE ──
  function setKey(code, isPressed) {
    if (isPressed && !activeKeys[code]) {
      activeKeys[code] = true;
      dispatchKey(code, true);
    } else if (!isPressed && activeKeys[code]) {
      activeKeys[code] = false;
      dispatchKey(code, false);
    }
  }

  function dispatchKey(code, isDown) {
    let key = '';
    if (code.startsWith('Key')) {
      key = code.replace('Key', '').toLowerCase();
    } else if (code === 'Space') {
      key = ' ';
    } else if (code === 'Enter') {
      key = 'Enter';
    } else if (code === 'Escape') {
      key = 'Escape';
    } else if (code.startsWith('Arrow')) {
      key = code;
    } else if (code.startsWith('Shift')) {
      key = 'Shift';
    } else {
      key = code;
    }

    const event = new KeyboardEvent(isDown ? 'keydown' : 'keyup', {
      key: key,
      code: code,
      bubbles: true,
      cancelable: true,
      view: window
    });
    window.dispatchEvent(event);
  }

  // Ensure window.controllerInput exists
  window.controllerInput = window.controllerInput || {
    joystickX: 0,
    joystickY: 0,
    aimX: 0,
    aimY: 0,
    btnCross: false,
    btnTriangle: false,
    btnCircle: false,
    btnSquare: false,
    btnR2: false,
    btnL1: false,
    btnR1: false,
    btnL2: false,
    btnDpadUp: false,
    btnDpadDown: false,
    btnDpadLeft: false,
    btnDpadRight: false,
    btnTouchpad: false,
    btnPs: false
  };

  // ── 4. TOUCHPAD AS VIRTUAL MOUSE TRACKPAD ──
  let cursorX = window.innerWidth / 2;
  let cursorY = window.innerHeight / 2;
  let virtualCursor = null;
  let cursorTimeout = null;

  function getOrCreateVirtualCursor() {
    if (virtualCursor) return virtualCursor;
    virtualCursor = document.createElement('div');
    virtualCursor.id = 'play-sphere-virtual-cursor';
    virtualCursor.style.cssText = `
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid #60a5fa;
      background: rgba(96, 165, 250, 0.4);
      box-shadow: 0 0 10px #60a5fa, inset 0 0 4px rgba(255, 255, 255, 0.5);
      pointer-events: none;
      z-index: 1000000;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      transition: opacity 0.2s ease, transform 0.1s ease;
      opacity: 0;
    `;
    document.body.appendChild(virtualCursor);
    return virtualCursor;
  }

  function moveVirtualCursor(dx, dy) {
    const cursor = getOrCreateVirtualCursor();
    cursorX = Math.max(10, Math.min(window.innerWidth - 10, cursorX + dx * 2.2));
    cursorY = Math.max(10, Math.min(window.innerHeight - 10, cursorY + dy * 2.2));

    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;
    cursor.style.opacity = '1';
    cursor.style.transform = 'translate(-50%, -50%) scale(1)';

    // Trigger synthetic mousemove at target coordinates
    const target = document.elementFromPoint(cursorX, cursorY);
    if (target) {
      target.dispatchEvent(new MouseEvent('mousemove', {
        clientX: cursorX,
        clientY: cursorY,
        bubbles: true,
        cancelable: true
      }));
    }

    clearTimeout(cursorTimeout);
    cursorTimeout = setTimeout(() => {
      cursor.style.opacity = '0';
    }, 2500);
  }

  function clickVirtualCursor() {
    const cursor = getOrCreateVirtualCursor();
    cursor.style.transform = 'translate(-50%, -50%) scale(0.85)';
    setTimeout(() => {
      cursor.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 100);

    const target = document.elementFromPoint(cursorX, cursorY);
    if (target) {
      if (window.sounds && typeof window.sounds.playHover === 'function') {
        window.sounds.playHover();
      } else if (window.CricketAudio && window.CricketAudio.playHit) {
        window.CricketAudio.playHit(0.25);
      }

      target.dispatchEvent(new MouseEvent('mousedown', { clientX: cursorX, clientY: cursorY, bubbles: true }));
      target.dispatchEvent(new MouseEvent('mouseup', { clientX: cursorX, clientY: cursorY, bubbles: true }));
      target.click();
      if (typeof target.focus === 'function') target.focus();
    }
  }

  // ── 5. SOCKET CONNECTION FOR REMOTE MOBILE CONTROLLER ──
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room') || params.get('roomCode');

  if (room && !window.socket && typeof io !== 'undefined') {
    window.socket = io();
    window.socket.on('connect', () => {
      console.log(`[Gamepad Emulator] Remote controller linked to room: ${room}`);
      window.socket.emit('join-room-pc');
    });
  }

  // Listen to remote phone controller inputs via socket
  function bindSocketInputs() {
    if (!window.socket) {
      setTimeout(bindSocketInputs, 200);
      return;
    }

    window.socket.on('controller-input', (data) => {
      if (data.type === 'joystick') {
        window.controllerInput.joystickX = data.x;
        window.controllerInput.joystickY = data.y;
      } 
      else if (data.type === 'aim-joystick') {
        window.controllerInput.aimX = data.x;
        window.controllerInput.aimY = data.y;
      } 
      else if (data.type === 'touchpad-move') {
        moveVirtualCursor(data.dx, data.dy);
      } 
      else if (data.type === 'touchpad-click') {
        clickVirtualCursor();
      } 
      else if (data.type === 'btnDown' || data.type === 'btnUp') {
        const isPressed = (data.type === 'btnDown');
        
        // Update window.controllerInput button states
        if (data.btn === 'cross')      window.controllerInput.btnCross      = isPressed;
        if (data.btn === 'triangle')   window.controllerInput.btnTriangle   = isPressed;
        if (data.btn === 'circle')     window.controllerInput.btnCircle     = isPressed;
        if (data.btn === 'square')     window.controllerInput.btnSquare     = isPressed;
        if (data.btn === 'r2')         window.controllerInput.btnR2         = isPressed;
        if (data.btn === 'l1')         window.controllerInput.btnL1         = isPressed;
        if (data.btn === 'r1')         window.controllerInput.btnR1         = isPressed;
        if (data.btn === 'l2')         window.controllerInput.btnL2         = isPressed;
        if (data.btn === 'create')     window.controllerInput.btnCreate     = isPressed;
        if (data.btn === 'options')    window.controllerInput.btnOptions    = isPressed;
        if (data.btn === 'dpadUp')     window.controllerInput.btnDpadUp     = isPressed;
        if (data.btn === 'dpadDown')   window.controllerInput.btnDpadDown   = isPressed;
        if (data.btn === 'dpadLeft')   window.controllerInput.btnDpadLeft   = isPressed;
        if (data.btn === 'dpadRight')  window.controllerInput.btnDpadRight  = isPressed;
        if (data.btn === 'touchpad')   window.controllerInput.btnTouchpad   = isPressed;
        if (data.btn === 'ps')         window.controllerInput.btnPs         = isPressed;

        // Map remote phone buttons to virtual keyboard events
        if (data.btn === 'cross') {
          setKey('Space', isPressed);
          setKey('Enter', isPressed);
        }
        else if (data.btn === 'circle') {
          setKey('KeyX', isPressed);
        }
        else if (data.btn === 'square') {
          setKey('KeyR', isPressed);
        }
        else if (data.btn === 'triangle') {
          setKey('KeyV', isPressed);
          setKey('KeyM', isPressed);
        }
        else if (data.btn === 'l1') {
          setKey('KeyQ', isPressed);
        }
        else if (data.btn === 'r1') {
          setKey('KeyE', isPressed);
        }
        else if (data.btn === 'l2') {
          // L2 = brake / reverse (maps to S key)
          setKey('KeyS', isPressed);
        }
        else if (data.btn === 'r2') {
          // R2 = DRS / Overtake Mode (maps to ShiftLeft)
          setKey('ShiftLeft', isPressed);
        }
        else if (data.btn === 'options') {
          setKey('Escape', isPressed);
        }
        else if (data.btn === 'dpadUp') {
          setKey('ArrowUp', isPressed);
          setKey('KeyW', isPressed);
        }
        else if (data.btn === 'dpadDown') {
          setKey('ArrowDown', isPressed);
          setKey('KeyS', isPressed);
        }
        else if (data.btn === 'dpadLeft') {
          setKey('ArrowLeft', isPressed);
          setKey('KeyA', isPressed);
        }
        else if (data.btn === 'dpadRight') {
          setKey('ArrowRight', isPressed);
          setKey('KeyD', isPressed);
        }
      }
    });
  }
  bindSocketInputs();

  // ── 6. PHYSICAL CONTROLLER POLLING ENGINE ──
  function updateGamepad() {
    requestAnimationFrame(updateGamepad);

    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gp = gamepads[i];
        break;
      }
    }

    if (!gp) return;

    if (prevButtons.length !== gp.buttons.length) {
      prevButtons = Array(gp.buttons.length).fill(false);
    }

    let anyPressed = false;
    for (let i = 0; i < gp.buttons.length; i++) {
      if (gp.buttons[i] && gp.buttons[i].pressed) {
        anyPressed = true;
        break;
      }
    }
    if (!anyPressed) {
      for (let i = 0; i < gp.axes.length; i++) {
        if (Math.abs(gp.axes[i]) > 0.25) {
          anyPressed = true;
          break;
        }
      }
    }
    if (anyPressed && typeof window.setInputMode === 'function') {
      window.setInputMode('gamepad');
    }

    // Joysticks
    const stickX = gp.axes[0] || 0;
    const stickY = gp.axes[1] || 0;
    const dpadLeft = gp.buttons[14] && gp.buttons[14].pressed;
    const dpadRight = gp.buttons[15] && gp.buttons[15].pressed;
    const dpadUp = gp.buttons[12] && gp.buttons[12].pressed;
    const dpadDown = gp.buttons[13] && gp.buttons[13].pressed;

    const goLeft = stickX < -0.3 || dpadLeft;
    const goRight = stickX > 0.3 || dpadRight;
    setKey('KeyA', goLeft);
    setKey('ArrowLeft', goLeft);

    setKey('KeyD', goRight);
    setKey('ArrowRight', goRight);

    const triggerL = gp.buttons[6] ? gp.buttons[6].value : 0;
    const triggerR = gp.buttons[7] ? gp.buttons[7].value : 0;

    const goUp = stickY < -0.3 || dpadUp || triggerR > 0.15;
    const goDown = stickY > 0.3 || dpadDown || triggerL > 0.15;
    setKey('KeyW', goUp);
    setKey('ArrowUp', goUp);

    setKey('KeyS', goDown);
    setKey('ArrowDown', goDown);

    // Button actions
    setKey('Space', gp.buttons[0] && gp.buttons[0].pressed);
    setKey('Enter', gp.buttons[0] && gp.buttons[0].pressed);

    setKey('KeyX', gp.buttons[1] && gp.buttons[1].pressed);
    setKey('KeyR', gp.buttons[2] && gp.buttons[2].pressed);
    setKey('KeyV', gp.buttons[3] && gp.buttons[3].pressed);
    setKey('KeyM', gp.buttons[3] && gp.buttons[3].pressed);
    setKey('KeyQ', gp.buttons[4] && gp.buttons[4].pressed);   // L1 = downshift
    setKey('KeyE', gp.buttons[5] && gp.buttons[5].pressed);   // R1 = upshift
    // L2 (button 6) = brake, R2 (button 7) = DRS / Overtake Mode
    const l2Val = gp.buttons[6] ? (gp.buttons[6].value || (gp.buttons[6].pressed ? 1.0 : 0.0)) : 0.0;
    const r2Val = gp.buttons[7] ? (gp.buttons[7].value || (gp.buttons[7].pressed ? 1.0 : 0.0)) : 0.0;
    setKey('KeyS', l2Val > 0.15);        // L2 > 15% = brake
    setKey('ShiftLeft', r2Val > 0.15);   // R2 > 15% = DRS/Overtake
    setKey('KeyT', gp.buttons[8] && gp.buttons[8].pressed);
    setKey('Escape', gp.buttons[9] && gp.buttons[9].pressed);
    setKey('KeyF', gp.buttons[10] && gp.buttons[10].pressed);
    // R3 stick click = alternative DRS/Overtake trigger
    setKey('ShiftLeft', (gp.buttons[11] && gp.buttons[11].pressed) || r2Val > 0.15);

    prevButtons = gp.buttons.map(b => b.pressed);
  }

  requestAnimationFrame(updateGamepad);
})();
