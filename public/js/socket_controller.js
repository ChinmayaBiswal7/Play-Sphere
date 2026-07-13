// Socket connection and event handling module
function initSocket() {
  if (window.socket) return; // Already initialized

  // Default transport upgrades (polling -> websocket) for maximum compatibility
  window.socket = io();

  window.socket.on('connect', () => {
    console.log('PC connected to Node WebSocket Server');
    window.socket.emit('join-room-pc');
  });

  window.socket.on('room-created', ({ roomCode: code, localIp, port }) => {
    window.roomCode = code;
    window.ui.roomCodeText.innerText = code;
    
    // Smart URL routing: use Wi-Fi IP on localhost, and origin domain on public hosted servers
    let phoneUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '') {
      phoneUrl = `http://${localIp}:${port}/controller.html?room=${code}`;
    } else {
      phoneUrl = `${window.location.origin}/controller.html?room=${code}`;
    }
    window.ui.qrImage.src = `/qrcode?text=${encodeURIComponent(phoneUrl)}`;

    window.ui.qrImage.onload = () => {
      // Hide spinner, show image once loaded to avoid broken image flicker
      window.ui.qrSpinner.style.display = 'none';
      window.ui.qrImageWrapper.style.display = 'flex';
    };

    window.ui.statusDot.classList.remove('connected');
    window.ui.statusLabel.innerText = 'Waiting for player 2 (phone)...';
    console.log(`Lobby room code assigned: ${code}`);
  });

  window.socket.on('phone-connected', ({ phoneSlot }) => {
    window.controllerConnected = true;
    window.ui.statusDot.classList.add('connected');
    window.ui.statusLabel.innerText = `Phone connected! Ready for PvP!`;
    
    // Trigger Phone role switch layout
    window.socket.emit('layout-change', { layout: 'bowling' });

    // Close lobby and start PvP game
    setTimeout(() => {
      window.ui.lobby.classList.add('hidden');
      if (typeof window.triggerMatchLoading === 'function') {
        window.triggerMatchLoading(() => {
          window.ui.hud.style.display = 'flex';
          window.ui.hudMode.innerText = 'PVP DUEL';
          window.matchMode = window.MODES.PVP;
          if (typeof window.restartMatch === 'function') {
            window.restartMatch();
          }
        });
      }
    }, 1200);
  });

  window.socket.on('phone-disconnected', () => {
    window.controllerConnected = false;
    window.ui.statusDot.classList.remove('connected');
    window.ui.statusLabel.innerText = 'Controller Disconnected. Reconnecting...';
    
    // In PvP mode, pause and show lobby again
    if (window.matchMode === window.MODES.PVP && window.gameState !== window.STATES.GAME_OVER) {
      window.ui.lobby.classList.remove('hidden');
      window.ui.hud.style.display = 'none';
      if (typeof window.setGameState === 'function') {
        window.setGameState(window.STATES.WAITING_FOR_PHONE);
      }
    }
  });

  // Receive controller inputs
  window.socket.on('controller-input', (data) => {
    if (data.type === 'joystick') {
      window.controllerInput.joystickX = data.x;
      window.controllerInput.joystickY = data.y;
    } else if (data.type === 'aim-joystick') {
      window.controllerInput.aimX = data.x;
      window.controllerInput.aimY = data.y;
    } else if (data.type === 'btnDown') {
      updateButtonState(data.btn, true);
      // Trigger instant actions
      if (data.btn === 'cross' || data.btn === 'triangle' || data.btn === 'circle' || data.btn === 'square') {
        if (typeof window.triggerBatSwing === 'function') {
          window.triggerBatSwing();
        }
      }
    } else if (data.type === 'btnUp') {
      updateButtonState(data.btn, false);
    }
  });
}

function updateButtonState(btn, isPressed) {
  if (btn === 'cross')      window.controllerInput.btnCross      = isPressed;
  if (btn === 'triangle')   window.controllerInput.btnTriangle   = isPressed;
  if (btn === 'circle')     window.controllerInput.btnCircle     = isPressed;
  if (btn === 'square')     window.controllerInput.btnSquare     = isPressed;
  if (btn === 'r2')         window.controllerInput.btnR2         = isPressed;
  if (btn === 'l1')         window.controllerInput.btnL1         = isPressed;
  if (btn === 'r1')         window.controllerInput.btnR1         = isPressed;
  if (btn === 'l2')         window.controllerInput.btnL2         = isPressed;
  if (btn === 'create')     window.controllerInput.btnCreate     = isPressed;
  if (btn === 'options')    window.controllerInput.btnOptions    = isPressed;
  if (btn === 'dpadUp')     window.controllerInput.btnDpadUp     = isPressed;
  if (btn === 'dpadDown')   window.controllerInput.btnDpadDown   = isPressed;
  if (btn === 'dpadLeft')   window.controllerInput.btnDpadLeft   = isPressed;
  if (btn === 'dpadRight')  window.controllerInput.btnDpadRight  = isPressed;
  if (btn === 'touchpad')   window.controllerInput.btnTouchpad   = isPressed;
  if (btn === 'ps')         window.controllerInput.btnPs         = isPressed;
  if (btn === 'r3')         window.controllerInput.btnR3         = isPressed;
  if (btn === 'l3')         window.controllerInput.btnL3         = isPressed;
}

// Expose functions globally
window.initSocket = initSocket;
window.updateButtonState = updateButtonState;
